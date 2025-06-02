# SessionSync Bridge

The bridge handles communication between Google Sheets, consoles, and DAWs.

## Files Needed

Due to size constraints, please copy the following files from the SessionSync Complete Concatenated Files:

1. **index.js** - Main bridge server with auto-discovery
2. **discovery.js** - Console discovery module

These files are available in the Claude conversation artifacts.

## Quick Test

After copying the files and starting the bridge:
```bash
npm run bridge
```

Test the API:
```bash
curl http://localhost:8765/health
```

## Features
- Auto-discovery via mDNS/Bonjour
- Fallback network scanning
- WebSocket real-time updates
- Support for all X32/M32/Wing variants
