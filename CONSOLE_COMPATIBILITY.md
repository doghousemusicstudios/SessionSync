# SessionSync Console Compatibility Guide

## Supported Consoles

SessionSync supports all current Behringer and Midas digital mixing consoles that use the X32/M32 or Wing protocols.

### Midas Professional Series

| Model | Channels | Description | Port | Notes |
|-------|----------|-------------|------|-------|
| **M32** | 32 | Full-size flagship console | 10023 | 25 motorized faders |
| **M32R** | 32 | Rack-mount version | 10023 | 16 faders, designed for stage boxes |
| **M32C** | 32 | Compact version | 10023 | 16 faders in smaller footprint |
| **M32 LIVE** | 32 | Touring console | 10023 | Road-ready with enhanced durability |

### Behringer X32 Series

| Model | Channels | Description | Port | Notes |
|-------|----------|-------------|------|-------|
| **X32** | 32 | Full-size console | 10023 | Original 32-channel mixer |
| **X32 Compact** | 32 | Mid-size console | 10023 | 16 faders, popular for smaller venues |
| **X32 Producer** | 32 | Desktop console | 10023 | Compact with all features |
| **X32 Rack** | 32 | Rack-mount mixer | 10023 | No physical faders, remote control |
| **X32 Core** | 32 | Stagebox format | 10023 | No controls, pure I/O and processing |

### Behringer Wing Series

| Model | Channels | Description | Port | Notes |
|-------|----------|-------------|------|-------|
| **Wing** | 48 | Next-gen full console | 2222 | 24 faders, touch screens |
| **Wing Rack** | 48 | Rack version | 2222 | All Wing features in 8U |
| **Wing Compact** | 40 | Smaller Wing | 2222 | 20 faders, reduced I/O |

## Key Differences

### X32/M32 Family
- All models use the **same OSC protocol**
- Port: **10023**
- **32 input channels**
- **16 colors** available (0-15)
- Compatible with X32-Edit/M32-Edit software

### Wing Family
- Enhanced OSC protocol with more features
- Port: **2222**
- **48 channels** (40 on Compact)
- **20 colors** available (0-19)
- Touch-screen interface
- Compatible with Wing-Edit software

## Auto-Discovery Support

SessionSync can automatically discover consoles on your network using:

1. **mDNS/Bonjour** - Consoles that advertise their services
2. **Network Scanning** - Probes common IP addresses
3. **Model Detection** - Identifies specific model via `/xinfo` command

### Discovery Priority
1. Advertised services (fastest)
2. Common static IPs (192.168.1.x, 10.0.0.x)
3. Full subnet scan (slower but comprehensive)

## Network Configuration

### Recommended Setup
- Static IP addresses for consoles
- Same subnet as control computer
- Disable WiFi isolation on routers
- Use wired connections when possible

### Common IP Configurations

**X32/M32 Defaults:**
- DHCP enabled by default
- Common static IPs: 192.168.1.10, 192.168.0.10

**Wing Defaults:**
- DHCP enabled
- Common static IPs: 192.168.1.20, 192.168.0.20

## Color Mapping

### X32/M32 Colors (16 colors)
| Index | Color | Hex |
|-------|-------|-----|
| 0 | Black | #000000 |
| 1 | Red | #FF0000 |
| 2 | Green | #00FF00 |
| 3 | Yellow | #FFFF00 |
| 4 | Blue | #0000FF |
| 5 | Magenta | #FF00FF |
| 6 | Cyan | #00FFFF |
| 7 | White | #FFFFFF |
| 8 | Orange | #FF8000 |
| 9 | Purple | #8000FF |
| 10 | Pink | #FF0080 |
| 11 | Lime | #80FF00 |
| 12 | Mint | #00FF80 |
| 13 | Sky | #0080FF |
| 14 | Lavender | #8080FF |
| 15 | Coral | #FF8080 |

### Wing Additional Colors (20 total)
Includes all X32/M32 colors plus:
| Index | Color | Hex |
|-------|-------|-----|
| 16 | Gray | #808080 |
| 17 | Gold | #FFD700 |
| 18 | Hot Pink | #FF69B4 |
| 19 | Turquoise | #00CED1 |

## Firmware Compatibility

- **X32/M32**: Firmware 4.0 or higher recommended
- **Wing**: Firmware 1.0 or higher
- OSC must be enabled in console settings

## Troubleshooting Console Detection

### Console Not Found
1. Check network connection (ping the console IP)
2. Verify OSC is enabled on console
3. Check firewall settings (UDP port 10023 or 2222)
4. Try manual IP entry if auto-discovery fails

### Wrong Model Detected
- Update console firmware
- Check console network name matches model
- Use manual selection in settings

### Connection Test Fails
- Verify IP address and port
- Check if another application is controlling the console
- Ensure console isn't in safe mode
- Try power cycling the console

## Performance Considerations

- **Sync Speed**: 10-50ms per track typical
- **Network Load**: Minimal (small OSC packets)
- **Concurrent Control**: Can work alongside X32-Edit/Wing-Edit
- **Maximum Tracks**: Limited by console model, not SessionSync