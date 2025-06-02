# SessionSync File Mapping

This ZIP contains the structure and documentation for SessionSync.
The actual code files are in the "SessionSync - Complete Concatenated Files" artifact.

## How to Complete Installation

1. **Find the concatenated file** in the Claude conversation
2. **Copy each file** between the `=== FILE: filename ===` markers
3. **Paste into the corresponding file** in this structure

## Required Code Files

### Bridge (`bridge/` folder)
- `index.js` - Main bridge server (2000+ lines)
- `discovery.js` - Discovery module (400+ lines)

### Google Apps Script (`google-apps-script/` folder)
- `Code.gs` - Main script (500+ lines)
- `Settings.html` - Settings UI (400+ lines)
- `About.html` - About dialog (already included)

### Scripts (`scripts/` folder)
- `bridges/protools_bridge.py` - Pro Tools bridge
- `reaper/SessionSync.lua` - Reaper script
- `install_protools.py` - Installation script
- `install_reaper.py` - Installation script
- `install_logic.py` - Installation script

### Tests (`tests/` folder)
- `console-models.js` - Console identification tests

### Docs (`docs/` folder)
- `CONSOLE_COMPATIBILITY.md` - Full compatibility guide
- `SETUP.md` - Detailed setup instructions

### Assets (`assets/` folder)
- `sessionsync-logo.svg` - Logo SVG

## Quick Copy Script

You can also use the included `split_files.py` script:
1. Save the concatenated file as `concatenated.txt`
2. Run: `python split_files.py concatenated.txt`

This will automatically create all files in the correct locations.
