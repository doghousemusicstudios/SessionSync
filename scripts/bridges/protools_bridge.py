#!/usr/bin/env python3
"""
SessionSync Pro Tools Bridge
Interfaces with Pro Tools via AAX or HUI protocol
"""

import json
import os
import time
import sys
import socket
import struct
import threading
import websocket
from pathlib import Path
from watchdog.observers import Observer
from watchdog.events import FileSystemEventHandler

# Configuration
SYNC_FILE = Path.home() / "SessionSync" / "temp" / "protools_sync.json"
WS_URL = "ws://localhost:8766"
PT_HOST = "127.0.0.1"
PT_PORT = 5000  # Pro Tools OSC port (if enabled)

# Color mapping (hex to Pro Tools color index)
COLOR_MAP = {
    "#FF0000": 1,   # Red
    "#00FF00": 2,   # Green
    "#0000FF": 3,   # Blue
    "#FFFF00": 4,   # Yellow
    "#FF00FF": 5,   # Magenta
    "#00FFFF": 6,   # Cyan
    "#FFFFFF": 7,   # White
    "#FF8000": 8,   # Orange
    "#8000FF": 9,   # Purple
    "#FF0080": 10,  # Pink
    "#80FF00": 11,  # Lime
    "#00FF80": 12,  # Mint
    "#0080FF": 13,  # Sky
    "#8080FF": 14,  # Lavender
    "#FF8080": 15,  # Coral
}

class ProToolsConnection:
    """Handles communication with Pro Tools"""
    
    def __init__(self):
        self.connected = False
        self.socket = None
        
    def connect(self):
        """Establish connection to Pro Tools"""
        try:
            # Try OSC connection first
            self.socket = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
            self.connected = True
            print("Connected to Pro Tools via OSC")
            return True
        except Exception as e:
            print(f"Failed to connect to Pro Tools: {e}")
            return False
    
    def send_osc(self, address, *args):
        """Send OSC message to Pro Tools"""
        if not self.connected:
            return False
            
        try:
            # Simple OSC packet construction
            # This is a basic implementation - use python-osc for production
            message = self._create_osc_message(address, *args)
            self.socket.sendto(message, (PT_HOST, PT_PORT))
            return True
        except Exception as e:
            print(f"Error sending OSC: {e}")
            return False
    
    def _create_osc_message(self, address, *args):
        """Create a basic OSC message"""
        # Pad address to 4-byte boundary
        address_bytes = address.encode() + b'\x00'
        while len(address_bytes) % 4 != 0:
            address_bytes += b'\x00'
        
        # Type tag string
        type_tags = ','
        for arg in args:
            if isinstance(arg, int):
                type_tags += 'i'
            elif isinstance(arg, float):
                type_tags += 'f'
            elif isinstance(arg, str):
                type_tags += 's'
        
        type_bytes = type_tags.encode() + b'\x00'
        while len(type_bytes) % 4 != 0:
            type_bytes += b'\x00'
        
        # Arguments
        arg_bytes = b''
        for arg in args:
            if isinstance(arg, int):
                arg_bytes += struct.pack('>i', arg)
            elif isinstance(arg, float):
                arg_bytes += struct.pack('>f', arg)
            elif isinstance(arg, str):
                str_bytes = arg.encode() + b'\x00'
                while len(str_bytes) % 4 != 0:
                    str_bytes += b'\x00'
                arg_bytes += str_bytes
        
        return address_bytes + type_bytes + arg_bytes
    
    def set_track_name(self, track_num, name):
        """Set track name in Pro Tools"""
        return self.send_osc(f"/track/{track_num}/name", name)
    
    def set_track_color(self, track_num, color_hex):
        """Set track color in Pro Tools"""
        color_index = COLOR_MAP.get(color_hex.upper(), 0)
        return self.send_osc(f"/track/{track_num}/color", color_index)
    
    def set_track_mute(self, track_num, mute):
        """Set track mute state"""
        return self.send_osc(f"/track/{track_num}/mute", 1 if mute else 0)
    
    def set_track_solo(self, track_num, solo):
        """Set track solo state"""
        return self.send_osc(f"/track/{track_num}/solo", 1 if solo else 0)
    
    def set_track_volume(self, track_num, volume):
        """Set track volume (0.0 to 1.0)"""
        # Convert to dB
        db = 20 * math.log10(max(0.001, volume))
        return self.send_osc(f"/track/{track_num}/volume", db)

class HUIConnection(ProToolsConnection):
    """Alternative connection using HUI protocol"""
    
    def __init__(self):
        super().__init__()
        self.midi_out = None
        
    def connect(self):
        """Connect via HUI/MIDI"""
        try:
            import mido
            
            # Find Pro Tools MIDI port
            ports = mido.get_output_names()
            pt_port = next((p for p in ports if 'Pro Tools' in p or 'HUI' in p), None)
            
            if pt_port:
                self.midi_out = mido.open_output(pt_port)
                self.connected = True
                print(f"Connected to Pro Tools via HUI: {pt_port}")
                return True
            else:
                print("Pro Tools MIDI port not found")
                return False
                
        except ImportError:
            print("mido library not installed. Install with: pip install mido python-rtmidi")
            return False
        except Exception as e:
            print(f"Failed to connect via HUI: {e}")
            return False
    
    def select_track(self, track_num):
        """Select a track via HUI"""
        if not self.midi_out:
            return False
            
        # HUI track selection
        # This is simplified - actual HUI protocol is more complex
        try:
            import mido
            # Send track select message
            msg = mido.Message('control_change', control=0x0C, value=track_num - 1)
            self.midi_out.send(msg)
            return True
        except Exception as e:
            print(f"Error selecting track: {e}")
            return False

class SyncFileHandler(FileSystemEventHandler):
    """Watches for changes to sync file"""
    
    def __init__(self, pt_connection):
        self.pt_connection = pt_connection
        self.last_sync = 0
        
    def on_modified(self, event):
        if event.src_path == str(SYNC_FILE):
            # Debounce
            current_time = time.time()
            if current_time - self.last_sync < 0.5:
                return
            self.last_sync = current_time
            
            self.sync_tracks()
    
    def sync_tracks(self):
        """Read sync file and apply to Pro Tools"""
        try:
            with open(SYNC_FILE, 'r') as f:
                data = json.load(f)
            
            if 'tracks' not in data:
                return
            
            tracks = data['tracks']
            print(f"Syncing {len(tracks)} tracks to Pro Tools...")
            
            for track in tracks:
                track_num = track.get('number', 0)
                if track_num <= 0:
                    continue
                
                # Set track properties
                if 'name' in track:
                    self.pt_connection.set_track_name(track_num, track['name'])
                
                if 'color' in track:
                    self.pt_connection.set_track_color(track_num, track['color'])
                
                if 'mute' in track:
                    self.pt_connection.set_track_mute(track_num, track['mute'])
                
                if 'solo' in track:
                    self.pt_connection.set_track_solo(track_num, track['solo'])
                
                if 'fader' in track:
                    self.pt_connection.set_track_volume(track_num, track['fader'])
                
                # Small delay between tracks
                time.sleep(0.01)
            
            print(f"Successfully synced {len(tracks)} tracks")
            
        except FileNotFoundError:
            print(f"Sync file not found: {SYNC_FILE}")
        except json.JSONDecodeError as e:
            print(f"Error parsing sync file: {e}")
        except Exception as e:
            print(f"Error syncing tracks: {e}")

class WebSocketClient:
    """WebSocket client for real-time updates"""
    
    def __init__(self, handler):
        self.handler = handler
        self.ws = None
        self.running = False
        
    def connect(self):
        """Connect to WebSocket server"""
        def on_message(ws, message):
            try:
                data = json.loads(message)
                if data.get('type') == 'daw_sync' and data.get('daw') == 'protools':
                    print("Received sync command via WebSocket")
                    self.handler.sync_tracks()
            except Exception as e:
                print(f"WebSocket message error: {e}")
        
        def on_error(ws, error):
            print(f"WebSocket error: {error}")
        
        def on_close(ws):
            print("WebSocket connection closed")
            if self.running:
                time.sleep(5)
                self.reconnect()
        
        def on_open(ws):
            print("WebSocket connected")
            ws.send(json.dumps({
                "type": "daw_connect",
                "daw": "protools"
            }))
        
        try:
            self.ws = websocket.WebSocketApp(
                WS_URL,
                on_message=on_message,
                on_error=on_error,
                on_close=on_close,
                on_open=on_open
            )
            
            self.running = True
            wst = threading.Thread(target=self.ws.run_forever)
            wst.daemon = True
            wst.start()
            
        except Exception as e:
            print(f"Failed to connect WebSocket: {e}")
    
    def reconnect(self):
        """Reconnect to WebSocket"""
        if self.running:
            self.connect()
    
    def close(self):
        """Close WebSocket connection"""
        self.running = False
        if self.ws:
            self.ws.close()

def main():
    """Main entry point"""
    print("""
╔═══════════════════════════════════════╗
║    SessionSync Pro Tools Bridge       ║
║                                       ║
║  Status: Starting...                  ║
╚═══════════════════════════════════════╝
    """)
    
    # Create sync directory
    SYNC_FILE.parent.mkdir(parents=True, exist_ok=True)
    
    # Try to connect to Pro Tools
    pt_connection = ProToolsConnection()
    if not pt_connection.connect():
        # Try HUI as fallback
        print("Trying HUI connection...")
        pt_connection = HUIConnection()
        if not pt_connection.connect():
            print("Failed to connect to Pro Tools")
            print("Make sure Pro Tools is running and OSC/HUI is enabled")
            sys.exit(1)
    
    # Set up file watcher
    handler = SyncFileHandler(pt_connection)
    observer = Observer()
    observer.schedule(handler, str(SYNC_FILE.parent), recursive=False)
    observer.start()
    
    # Connect WebSocket for real-time updates
    ws_client = WebSocketClient(handler)
    ws_client.connect()
    
    print(f"Watching for sync file: {SYNC_FILE}")
    print("Bridge is running. Press Ctrl+C to stop.")
    
    try:
        while True:
            time.sleep(1)
    except KeyboardInterrupt:
        print("\nShutting down...")
        observer.stop()
        ws_client.close()
    
    observer.join()
    print("Pro Tools bridge stopped.")

if __name__ == "__main__":
    import math
    main()