# SessionSync - Complete Setup Guide

## Overview

SessionSync is a comprehensive solution for synchronizing track names and colors between:
- **Google Sheets** (for easy session management)
- **Mixing Consoles** (Midas M32 & Behringer Wing via OSC)
- **DAWs** (Pro Tools, Reaper, Logic Pro)

## Prerequisites

- **Google Account** with access to Google Sheets
- **Node.js 16+** installed ([download](https://nodejs.org/))
- **Python 3.8+** installed ([download](https://python.org/))
- **Git** installed ([download](https://git-scm.com/))
- Network access to your mixing console
- At least one supported DAW installed

### Optional (for auto-discovery)
- **Bonjour/mDNS support**:
  - **Windows**: Install [Bonjour Print Services](https://support.apple.com/kb/DL999)
  - **macOS**: Already included
  - **Linux**: `sudo apt-get install avahi-daemon` (Ubuntu/Debian) or equivalent

## Step-by-Step Installation

### 1. Clone the Repository

```bash
git clone https://github.com/doghousemusicstudios/sessionsync.git
cd sessionsync
```

### 2. Install Dependencies

```bash
npm install
```

**Note**: If you get errors installing the `mdns` module, you can skip it:
```bash
npm install --no-optional
```
The bridge will still work with fallback discovery methods.

### 3. Set Up Google Sheets Add-on (Development Mode)

Since the add-on isn't published to the Google Workspace Marketplace yet, you'll need to install it manually:

1. **Open Google Apps Script Editor**
   - Go to [script.google.com](https://script.google.com)
   - Create a new project
   - Name it "SessionSync"

2. **Copy the Code**
   - Copy all content from `google-apps-script/Code.gs`
   - Paste into the Apps Script editor
   - Create new HTML files for `Settings.html` and `About.html`
   - Copy the respective content into each file

3. **Update Manifest**
   - Click on Project Settings (gear icon)
   - Check "Show appsscript.json"
   - Replace content with the provided `appsscript.json`

4. **Deploy as Add-on**
   - Click Deploy → Test deployments
   - Select "Editor Add-on"
   - Choose a Google Sheet to test with

### 4. Start the Bridge Server

```bash
npm run bridge
```

You should see:
```
╔═══════════════════════════════════════╗
║         SessionSync Bridge            ║
║      with Auto-Discovery Support      ║
║                                       ║
║  HTTP API:    http://localhost:8765  ║
║  WebSocket:   ws://localhost:8766    ║
║                                       ║
║  Status: ✓ Running                    ║
║  Discovery: Starting...               ║
╚═══════════════════════════════════════╝
```

### 5. Configure Your Console

#### For Midas M32 & Behringer X32:
1. Ensure console is connected to your network
2. Note the IP address (usually shown in Setup → Network)
3. Default OSC port is 10023

#### For Behringer Wing:
1. Connect console to network
2. Find IP in Setup → Network Config
3. Default OSC port is 2222

### 6. Install DAW Scripts

#### Pro Tools:
```bash
npm run install-protools
# or manually:
python scripts/install_protools.py
```

#### Reaper:
1. Copy `scripts/reaper/SessionSync.lua` to your Reaper Scripts folder:
   - Windows: `%APPDATA%\REAPER\Scripts\`
   - macOS: `~/Library/Application Support/REAPER/Scripts/`
2. In Reaper: Actions → Show action list → Load ReaScript
3. Select SessionSync.lua

#### Logic Pro (macOS only):
```bash
npm run install-logic
# or manually:
python3 scripts/install_logic.py
```

## Using SessionSync

### 1. Initialize Your Google Sheet

1. Open a Google Sheet
2. Go to **Extensions → SessionSync → Initialize Sheet**
3. The sheet will be populated with columns and sample data

### 2. Configure Settings

1. Go to **Extensions → SessionSync → Settings**
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

### 3. Sync Your Tracks

1. Enter your track information in the sheet
2. Select the tracks you want to sync (or select all)
3. Go to **Extensions → SessionSync → Sync Selected Tracks**

### 4. Monitor DAW Bridges

Each DAW bridge runs separately. Start them as needed:

```bash
# In separate terminals:
python scripts/bridges/protools_bridge.py
python scripts/bridges/reaper_bridge.py
python scripts/bridges/logic_bridge.py
```

## Track Data Format

| Column | Description | Format |
|--------|-------------|--------|
| Track # | Channel number | 1-32 (M32) or 1-48 (Wing) |
| Track Name | Channel name | Any text |
| Color | Track color | Hex (#FF0000) or named |
| Mute | Mute state | TRUE/FALSE |
| Solo | Solo state | TRUE/FALSE |
| Fader | Fader level | 0.0-1.0 |

## Supported Colors

Standard console colors:
- Red: `#FF0000`
- Green: `#00FF00`
- Blue: `#0000FF`
- Yellow: `#FFFF00`
- Magenta: `#FF00FF`
- Cyan: `#00FFFF`
- White: `#FFFFFF`
- Orange: `#FF8000`
- Purple: `#8000FF`
- Pink: `#FF0080`
- Lime: `#80FF00`
- Mint: `#00FF80`
- Sky: `#0080FF`
- Lavender: `#8080FF`
- Coral: `#FF8080`

## Keyboard Shortcuts

In Google Sheets with SessionSync:
- **Ctrl/Cmd + Shift + S**: Quick sync selected tracks
- **Ctrl/Cmd + Shift + A**: Sync all tracks
- **Ctrl/Cmd + Shift + C**: Sync colors only

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

## Advanced Configuration

### Custom Bridge URL
If running bridge on a different machine:
1. Update Settings in Google Sheets
2. Change Bridge URL to `http://[bridge-ip]:8765/sync`

### Multiple Console Support
Edit `bridge/index.js` to add multiple console endpoints

### Custom Color Mappings
Modify color maps in:
- `google-apps-script/Code.gs` (COLOR_MAP object)
- `bridge/index.js` (mapColorToConsole function)
- DAW bridge scripts

## Building Standalone Executables

To create standalone bridge executables:

```bash
npm run build
```

This creates platform-specific executables in the `dist/` folder.

## Support & Contributing

- **Issues**: [GitHub Issues](https://github.com/doghousemusicstudios/sessionsync/issues)
- **Discussions**: [GitHub Discussions](https://github.com/doghousemusicstudios/sessionsync/discussions)
- **Email**: support@doghousemusicstudios.com

## License

MIT License - see LICENSE file for details

---

Happy Syncing! 🎵🎛️📊