# SessionSync

![SessionSync Logo](./assets/sessionsync-logo.svg)

A Google Sheets add-on for synchronizing track names and colors between your spreadsheet, mixing consoles (Midas M32/Behringer Wing), and DAWs (Pro Tools, Reaper, Logic Pro).

## Features

- 📊 **Google Sheets Integration**: Manage your session data in a familiar spreadsheet interface
- 🎛️ **Console Support**: Full OSC communication with:
  - **Midas Professional Series**: M32, M32R, M32C, M32 LIVE
  - **Behringer X32 Series**: X32, X32 Compact, X32 Producer, X32 Rack, X32 Core
  - **Behringer Wing Series**: Wing, Wing Rack, Wing Compact
- 🔍 **Auto-Discovery**: Automatically find consoles on your network using Bonjour/mDNS
- 🎵 **DAW Integration**: Sync with Pro Tools, Reaper, and Logic Pro
- 🎨 **Color Synchronization**: Keep track colors consistent across all platforms
- 🔄 **Real-time Updates**: Changes propagate instantly
- 📱 **Cross-platform**: Works on Windows and macOS

## Installation

### Prerequisites

- Google Account with Google Sheets access
- Node.js 16+ installed
- Python 3.8+ installed (for DAW bridges)
- Network access to your mixing console

### Step 1: Install the Google Sheets Add-on

1. Open Google Sheets
2. Go to **Extensions** → **Add-ons** → **Get add-ons**
3. Search for "SessionSync" (or use developer mode for now)
4. Click **Install**

### Step 2: Set up the OSC Bridge

```bash
# Clone the repository
git clone https://github.com/doghousemusicstudios/sessionsync.git
cd sessionsync

# Install dependencies
npm install

# Start the OSC bridge
npm run bridge
```

### Step 3: Install DAW Scripts

#### Pro Tools
```bash
# Windows
python scripts/install_protools.py

# macOS
python3 scripts/install_protools.py
```

#### Reaper
1. Copy `scripts/reaper/SessionSync.lua` to your Reaper Scripts folder
2. In Reaper: Actions → Show action list → Load ReaScript

#### Logic Pro
```bash
# macOS only
python3 scripts/install_logic.py
```

## Configuration

### Google Sheets Setup

1. Create a new Google Sheet or open an existing one
2. Go to **Extensions** → **SessionSync** → **Initialize**
3. The add-on will create a template with columns:
   - Track Number
   - Track Name
   - Color (Hex)
   - Mute
   - Solo
   - Fader Level

### Console Configuration

1. Open **Extensions** → **SessionSync** → **Settings**
2. **Auto-Discovery** (recommended):
   - Click **🔍 Auto-Discover Consoles**
   - Wait for the scan to complete (10-30 seconds)
   - Select your console from the dropdown
   - The IP and port will be filled automatically
3. **Manual Configuration** (if auto-discovery doesn't find your console):
   - Console Type (M32 or Wing)
   - IP Address
   - Port
4. Enable desired DAWs
5. Click **Test Connection**
6. Save settings

### DAW Configuration

Configure each DAW in the settings panel:
- Enable/disable specific DAWs
- Set communication ports
- Configure color mapping preferences

## Usage

### Basic Workflow

1. **Populate your sheet** with track information
2. **Select tracks** you want to sync
3. **Click Sync** in the SessionSync menu
4. Watch as your console and DAWs update automatically!

### Keyboard Shortcuts

- `Ctrl/Cmd + Shift + S`: Quick sync selected tracks
- `Ctrl/Cmd + Shift + A`: Sync all tracks
- `Ctrl/Cmd + Shift + C`: Sync colors only

### Color Format

Colors can be specified in multiple formats:
- Hex: `#FF5733`
- RGB: `rgb(255, 87, 51)`
- Named: `red`, `blue`, `green`, etc.

## API Reference

### OSC Commands

#### X32/M32 Family (X32, X32 Compact, X32 Producer, X32 Rack, X32 Core, M32, M32R, M32C, M32 LIVE)
All X32 and M32 variants use the same OSC protocol on port 10023:
```
/ch/[01-32]/config/name "Track Name"
/ch/[01-32]/config/color [0-15]
/ch/[01-32]/mix/on [0,1]
/ch/[01-32]/mix/fader [0.0-1.0]
/xinfo  (returns model information)
```

#### Behringer Wing Family (Wing, Wing Rack, Wing Compact)
All Wing variants use port 2222 with extended features:
```
/ch/[01-48]/config/name "Track Name"  (40 channels on Compact)
/ch/[01-48]/config/color [0-19]       (Extended color palette)
/ch/[01-48]/mix/on [0,1]
/ch/[01-48]/mix/fader [0.0-1.0]
/xinfo  (returns model information)
```

### WebSocket API

The bridge exposes a WebSocket server on port 8766:

```javascript
const ws = new WebSocket('ws://localhost:8766');

ws.send(JSON.stringify({
  action: 'sync',
  tracks: [{
    number: 1,
    name: 'Kick',
    color: '#FF0000'
  }]
}));
```

### Auto-Discovery API

```javascript
// Discover consoles on network
GET http://localhost:8765/discover

// Response
{
  "success": true,
  "consoles": [
    {
      "type": "M32",
      "name": "M32-RACK at Studio A",
      "ip": "192.168.1.100",
      "port": 10023,
      "verified": true,
      "via": "mdns"
    }
  ],
  "scanning": true
}

// Start/stop discovery
POST http://localhost:8765/discovery/start
POST http://localhost:8765/discovery/stop

// Manually probe an IP
POST http://localhost:8765/probe
{
  "ip": "192.168.1.100",
  "port": 10023,
  "type": "M32"
}
```

## Troubleshooting

### Auto-Discovery Issues

1. **No consoles found**
   - Ensure console and computer are on same network/VLAN
   - Check if console has network/OSC enabled
   - Try manual configuration with IP address
   - Some networks block mDNS/multicast traffic

2. **mDNS installation fails (Windows)**
   - Install Bonjour Print Services first
   - Use `npm install --no-optional` to skip mDNS
   - Bridge will use fallback discovery

3. **Discovery is slow**
   - First scan can take 10-30 seconds
   - Check firewall isn't blocking UDP ports
   - Try manual probe with known IP

### Bridge won't start
- Check if port 8765 is already in use
- Try: `lsof -i :8765` (macOS/Linux) or `netstat -ano | findstr :8765` (Windows)

### Console not responding
- Verify IP address and port
- Check if console and computer are on same network
- Temporarily disable firewall to test
- Try pinging the console: `ping [console-ip]`

### DAW not syncing
- Ensure DAW bridge is running
- Check if DAW has necessary permissions
- Verify script installation location
- Check bridge console output for errors

### Google Sheets errors
- Ensure bridge is running before syncing
- Check browser console for errors (F12)
- Verify add-on permissions

## Development

### Building from Source

```bash
# Install development dependencies
npm install --dev

# Run tests
npm test

# Build for production
npm run build
```

### Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

MIT License - see [LICENSE](LICENSE) file for details

## Acknowledgments

- OSC implementation based on [osc.js](https://github.com/colinbdclark/osc.js)
- Reaper integration uses [ReaScript API](https://www.reaper.fm/sdk/reascript/reascript.php)
- Pro Tools integration via [PT-Bridge](https://github.com/example/pt-bridge)

## Support

- 📧 Email: support@doghousemusicstudios.com
- 💬 Discord: [Join our server](https://discord.gg/sessionsync)
- 🐛 Issues: [GitHub Issues](https://github.com/doghousemusicstudios/sessionsync/issues)