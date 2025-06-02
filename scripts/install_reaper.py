#!/usr/bin/env python3
import os
import sys
import shutil
from pathlib import Path

def install_reaper_bridge():
    """Install Reaper SessionSync script"""
    
    # Determine Reaper scripts location
    if sys.platform == "darwin":  # macOS
        script_dir = Path.home() / "Library/Application Support/REAPER/Scripts"
    elif sys.platform == "win32":  # Windows
        script_dir = Path(os.getenv('APPDATA')) / "REAPER/Scripts"
    elif sys.platform.startswith("linux"):  # Linux
        script_dir = Path.home() / ".config/REAPER/Scripts"
    else:
        print("Unsupported platform")
        return False
    
    # Create directory if needed
    script_dir.mkdir(parents=True, exist_ok=True)
    
    # Copy Lua script
    source = Path(__file__).parent / "reaper" / "SessionSync.lua"
    dest = script_dir / "SessionSync.lua"
    
    try:
        shutil.copy2(source, dest)
        print(f"✓ Installed Reaper script to: {dest}")
        print("\nNext steps:")
        print("1. Open Reaper")
        print("2. Go to Actions → Show action list")
        print("3. Click 'Load ReaScript'")
        print("4. Select SessionSync.lua")
        return True
    except Exception as e:
        print(f"✗ Failed to install: {e}")
        return False

if __name__ == "__main__":
    install_reaper_bridge()