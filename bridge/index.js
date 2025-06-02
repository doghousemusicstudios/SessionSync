/**
 * SessionSync OSC Bridge with Auto-Discovery
 * Handles communication between Google Sheets, mixing consoles, and DAWs
 * Now with mDNS/Bonjour support for automatic console discovery
 */

const express = require('express');
const WebSocket = require('ws');
const osc = require('osc');
const cors = require('cors');
const { exec } = require('child_process');
const path = require('path');
const fs = require('fs').promises;
const dgram = require('dgram');

const app = express();
const PORT = 8765;

// Middleware
app.use(cors());
app.use(express.json());

// WebSocket server for real-time updates
const wss = new WebSocket.Server({ port: PORT + 1 });

// OSC clients for consoles
const oscClients = new Map();

// Discovered consoles
const discoveredConsoles = new Map();

// Console configurations with all product variants
const CONSOLE_CONFIG = {
  // Midas M32 Series (Professional line)
  'M32': {
    name: 'Midas M32',
    defaultPort: 10023,
    maxChannels: 32,
    colorRange: [0, 15],
    mdnsType: '_osc._udp',
    family: 'X32/M32'
  },
  'M32R': {
    name: 'Midas M32R',
    defaultPort: 10023,
    maxChannels: 32,
    colorRange: [0, 15],
    mdnsType: '_osc._udp',
    family: 'X32/M32'
  },
  'M32C': {
    name: 'Midas M32C',
    defaultPort: 10023,
    maxChannels: 32,
    colorRange: [0, 15],
    mdnsType: '_osc._udp',
    family: 'X32/M32'
  },
  'M32_LIVE': {
    name: 'Midas M32 LIVE',
    defaultPort: 10023,
    maxChannels: 32,
    colorRange: [0, 15],
    mdnsType: '_osc._udp',
    family: 'X32/M32'
  },
  
  // Behringer X32 Series
  'X32': {
    name: 'Behringer X32',
    defaultPort: 10023,
    maxChannels: 32,
    colorRange: [0, 15],
    mdnsType: '_osc._udp',
    family: 'X32/M32'
  },
  'X32_COMPACT': {
    name: 'Behringer X32 Compact',
    defaultPort: 10023,
    maxChannels: 32,
    colorRange: [0, 15],
    mdnsType: '_osc._udp',
    family: 'X32/M32'
  },
  'X32_PRODUCER': {
    name: 'Behringer X32 Producer',
    defaultPort: 10023,
    maxChannels: 32,
    colorRange: [0, 15],
    mdnsType: '_osc._udp',
    family: 'X32/M32'
  },
  'X32_RACK': {
    name: 'Behringer X32 Rack',
    defaultPort: 10023,
    maxChannels: 32,
    colorRange: [0, 15],
    mdnsType: '_osc._udp',
    family: 'X32/M32'
  },
  'X32_CORE': {
    name: 'Behringer X32 Core',
    defaultPort: 10023,
    maxChannels: 32,
    colorRange: [0, 15],
    mdnsType: '_osc._udp',
    family: 'X32/M32'
  },
  
  // Behringer Wing Series
  'WING': {
    name: 'Behringer Wing',
    defaultPort: 2222,
    maxChannels: 48,
    colorRange: [0, 19],
    mdnsType: '_osc._udp',
    family: 'Wing'
  },
  'WING_RACK': {
    name: 'Behringer Wing Rack',
    defaultPort: 2222,
    maxChannels: 48,
    colorRange: [0, 19],
    mdnsType: '_osc._udp',
    family: 'Wing'
  },
  'WING_COMPACT': {
    name: 'Behringer Wing Compact',
    defaultPort: 2222,
    maxChannels: 40,  // Compact has fewer channels
    colorRange: [0, 19],
    mdnsType: '_osc._udp',
    family: 'Wing'
  }
};

// Pattern matching for console identification
const CONSOLE_PATTERNS = [
  // Midas patterns
  { pattern: /M32.*LIVE/i, type: 'M32_LIVE' },
  { pattern: /M32R/i, type: 'M32R' },
  { pattern: /M32C/i, type: 'M32C' },
  { pattern: /M32(?!R|C|.*LIVE)/i, type: 'M32' },
  
  // Behringer X32 patterns
  { pattern: /X32.*COMPACT/i, type: 'X32_COMPACT' },
  { pattern: /X32.*PRODUCER/i, type: 'X32_PRODUCER' },
  { pattern: /X32.*RACK/i, type: 'X32_RACK' },
  { pattern: /X32.*CORE/i, type: 'X32_CORE' },
  { pattern: /X32(?!.*COMPACT|.*PRODUCER|.*RACK|.*CORE)/i, type: 'X32' },
  
  // Wing patterns
  { pattern: /WING.*RACK/i, type: 'WING_RACK' },
  { pattern: /WING.*COMPACT/i, type: 'WING_COMPACT' },
  { pattern: /WING(?!.*RACK|.*COMPACT)/i, type: 'WING' }
];

// DAW bridge processes
const dawBridges = {
  protools: null,
  reaper: null,
  logic: null
};

/**
 * mDNS Browser for console discovery
 */
class ConsoleDiscovery {
  constructor() {
    this.browsers = [];
    this.discoveryActive = false;
  }
  
  start() {
    if (this.discoveryActive) return;
    
    console.log('Starting console auto-discovery...');
    this.discoveryActive = true;
    
    // Browse for OSC services
    try {
      const mdns = require('mdns');
      const browser = mdns.createBrowser(mdns.tcp('osc'));
      
      browser.on('serviceUp', (service) => {
        this.handleServiceFound(service);
      });
      
      browser.on('serviceDown', (service) => {
        this.handleServiceLost(service);
      });
      
      browser.on('error', (error) => {
        console.error('mDNS browser error:', error);
      });
      
      browser.start();
      this.browsers.push(browser);
      
      // Also try specific console discovery
      this.probeKnownPorts();
      
    } catch (error) {
      console.error('Failed to start mDNS browser:', error);
      console.log('Falling back to manual discovery mode');
    }
  }
  
  stop() {
    this.browsers.forEach(browser => browser.stop());
    this.browsers = [];
    this.discoveryActive = false;
  }
  
  handleServiceFound(service) {
    console.log('Found service:', service.name);
    
    // Try to identify console type from service name
    let consoleType = null;
    let consoleName = service.name;
    
    // Check against all known patterns
    for (const { pattern, type } of CONSOLE_PATTERNS) {
      if (service.name.match(pattern)) {
        consoleType = type;
        break;
      }
    }
    
    // If we couldn't identify specific model, try to guess family
    if (!consoleType) {
      if (service.name.match(/X32|M32/i)) {
        consoleType = 'X32'; // Default to X32 if can't determine specific model
      } else if (service.name.match(/Wing/i)) {
        consoleType = 'WING'; // Default to Wing if can't determine specific model
      }
    }
    
    if (consoleType && service.addresses && service.addresses.length > 0) {
      const config = CONSOLE_CONFIG[consoleType];
      const console = {
        id: `${consoleType}-${service.addresses[0]}`,
        type: consoleType,
        model: config.name,
        name: service.name || config.name,
        ip: service.addresses[0],
        port: service.port || config.defaultPort,
        family: config.family,
        discovered: new Date(),
        via: 'mdns'
      };
      
      discoveredConsoles.set(console.id, console);
      this.notifyDiscovery(console);
      
      // Test connection
      this.testConsoleConnection(console);
    }
  }
  
  handleServiceLost(service) {
    // Remove from discovered consoles
    discoveredConsoles.forEach((console, id) => {
      if (console.name === service.name) {
        discoveredConsoles.delete(id);
        this.notifyRemoval(console);
      }
    });
  }
  
  /**
   * Scan common IPs on local networks
   */
  async probeKnownPorts() {
    const networkInterfaces = require('os').networkInterfaces();
    const localNetworks = [];
    
    // Get local network prefixes
    Object.values(networkInterfaces).forEach(interfaces => {
      interfaces.forEach(iface => {
        if (iface.family === 'IPv4' && !iface.internal) {
          const parts = iface.address.split('.');
          const subnet = parts.slice(0, 3).join('.');
          localNetworks.push(subnet);
        }
      });
    });
    
    // Scan common IPs on local networks
    for (const subnet of localNetworks) {
      // Common static IPs for audio equipment
      const priorityIps = [
        `${subnet}.1`, `${subnet}.2`, `${subnet}.10`,
        `${subnet}.100`, `${subnet}.200`
      ];
      
      for (const ip of priorityIps) {
        // Test X32/M32 family port
        this.probeConsole(ip, 10023, 'X32/M32');
        
        // Test Wing family port
        this.probeConsole(ip, 2222, 'Wing');
        
        // Add small delay to avoid overwhelming the network
        await new Promise(resolve => setTimeout(resolve, 50));
      }
      
      // Then scan rest of subnet
      for (let i = 3; i <= 254; i++) {
        if (!priorityIps.includes(`${subnet}.${i}`)) {
          const ip = `${subnet}.${i}`;
          
          // Test both console families
          this.probeConsole(ip, 10023, 'X32/M32');
          this.probeConsole(ip, 2222, 'Wing');
          
          // Throttle scanning
          if (i % 10 === 0) {
            await new Promise(resolve => setTimeout(resolve, 100));
          }
        }
      }
    }
  }
  
  /**
   * Probe a specific IP/port for console presence
   */
  async probeConsole(ip, port, assumedFamily) {
    const socket = dgram.createSocket('udp4');
    let responded = false;
    
    const timeout = setTimeout(() => {
      if (!responded) {
        socket.close();
      }
    }, 500);
    
    // Listen for response to identify specific model
    socket.on('message', (msg) => {
      responded = true;
      clearTimeout(timeout);
      socket.close();
      
      // Try to parse response to identify specific model
      const response = msg.toString();
      let consoleType = null;
      let consoleName = `Unknown ${assumedFamily} Console`;
      
      // Check response for model identification
      for (const { pattern, type } of CONSOLE_PATTERNS) {
        if (response.match(pattern)) {
          consoleType = type;
          break;
        }
      }
      
      // If we can't identify specific model, use family default
      if (!consoleType) {
        if (assumedFamily === 'X32/M32') {
          consoleType = port === 10023 ? 'X32' : 'M32';
        } else if (assumedFamily === 'Wing') {
          consoleType = 'WING';
        }
      }
      
      if (consoleType) {
        const config = CONSOLE_CONFIG[consoleType];
        const console = {
          id: `${consoleType}-${ip}`,
          type: consoleType,
          model: config.name,
          name: `${config.name} at ${ip}`,
          ip: ip,
          port: port,
          family: config.family,
          discovered: new Date(),
          via: 'probe'
        };
        
        if (!discoveredConsoles.has(console.id)) {
          discoveredConsoles.set(console.id, console);
          this.notifyDiscovery(console);
          
          // Verify it's actually a console
          this.verifyConsoleModel(console);
        }
      }
    });
    
    socket.on('error', () => {
      clearTimeout(timeout);
      socket.close();
    });
    
    // Send a query message - X32/M32 and Wing respond to /xinfo
    const queryMessage = this.createOscQuery('/xinfo');
    
    socket.send(queryMessage, port, ip, (error) => {
      if (error) {
        clearTimeout(timeout);
        socket.close();
      }
    });
  }
  
  /**
   * Create a basic OSC query message
   */
  createOscQuery(address) {
    // Simple OSC message for /xinfo
    const addressBytes = Buffer.from(address + '\0');
    while (addressBytes.length % 4 !== 0) {
      addressBytes.write('\0', addressBytes.length);
    }
    
    const typeBytes = Buffer.from(',\0\0\0');
    
    return Buffer.concat([addressBytes, typeBytes]);
  }
  
  /**
   * Verify console model by querying specific info
   */
  async verifyConsoleModel(console) {
    try {
      const client = initOscClient(console.type, console.ip, console.port);
      
      // Send model query
      await sendOscMessage(client, '/xinfo', []);
      
      // Mark as verified
      console.verified = true;
      discoveredConsoles.set(console.id, console);
      this.notifyDiscovery(console);
      
    } catch (error) {
      console.verified = false;
      console.error = error.message;
    }
  }
  
  /**
   * Test if discovered console actually responds
   */
  async testConsoleConnection(console) {
    try {
      const client = initOscClient(console.type, console.ip, console.port);
      
      // Try to read a basic parameter
      await sendOscMessage(client, '/info', []);
      
      console.verified = true;
      discoveredConsoles.set(console.id, console);
      this.notifyDiscovery(console);
      
    } catch (error) {
      console.verified = false;
      console.error = error.message;
    }
  }
  
  /**
   * Notify all WebSocket clients of discovery
   */
  notifyDiscovery(console) {
    const message = JSON.stringify({
      type: 'console_discovered',
      console: console
    });
    
    wss.clients.forEach(client => {
      if (client.readyState === WebSocket.OPEN) {
        client.send(message);
      }
    });
  }
  
  /**
   * Notify all WebSocket clients of removal
   */
  notifyRemoval(console) {
    const message = JSON.stringify({
      type: 'console_removed',
      console: console
    });
    
    wss.clients.forEach(client => {
      if (client.readyState === WebSocket.OPEN) {
        client.send(message);
      }
    });
  }
}

// Initialize discovery
const discovery = new ConsoleDiscovery();

/**
 * Initialize OSC client for console
 */
function initOscClient(consoleType, ip, port) {
  const key = `${consoleType}-${ip}-${port}`;
  
  if (oscClients.has(key)) {
    return oscClients.get(key);
  }
  
  const udpPort = new osc.UDPPort({
    localAddress: '0.0.0.0',
    localPort: 0,
    remoteAddress: ip,
    remotePort: port
  });
  
  udpPort.on('error', (err) => {
    console.error(`OSC Error (${key}):`, err);
  });
  
  udpPort.open();
  oscClients.set(key, udpPort);
  
  return udpPort;
}

/**
 * Send OSC message to console
 */
function sendOscMessage(client, address, args) {
  return new Promise((resolve, reject) => {
    try {
      client.send({
        address: address,
        args: args
      });
      
      // Small delay to ensure message is sent
      setTimeout(resolve, 50);
    } catch (error) {
      reject(error);
    }
  });
}

/**
 * Format track data for console
 */
function formatTrackForConsole(track, consoleType) {
  const config = CONSOLE_CONFIG[consoleType];
  if (!config) {
    throw new Error(`Unknown console type: ${consoleType}`);
  }
  
  const channelNum = String(track.number).padStart(2, '0');
  
  return {
    nameAddress: `/ch/${channelNum}/config/name`,
    colorAddress: `/ch/${channelNum}/config/color`,
    muteAddress: `/ch/${channelNum}/mix/on`,
    soloAddress: `/ch/${channelNum}/mix/solo`,
    faderAddress: `/ch/${channelNum}/mix/fader`,
    name: track.name || `CH ${track.number}`,
    color: mapColorToConsole(track.color, config.family),
    mute: track.mute ? 0 : 1, // OSC uses inverse logic
    solo: track.solo ? 1 : 0,
    fader: track.fader || 0.75
  };
}

/**
 * Map hex color to console color index
 */
function mapColorToConsole(hexColor, consoleFamily) {
  const colorMap = {
    'X32/M32': {
      '#000000': 0, '#FF0000': 1, '#00FF00': 2, '#FFFF00': 3,
      '#0000FF': 4, '#FF00FF': 5, '#00FFFF': 6, '#FFFFFF': 7,
      '#FF8000': 8, '#8000FF': 9, '#FF0080': 10, '#80FF00': 11,
      '#00FF80': 12, '#0080FF': 13, '#8080FF': 14, '#FF8080': 15
    },
    'Wing': {
      '#000000': 0, '#FF0000': 1, '#00FF00': 2, '#FFFF00': 3,
      '#0000FF': 4, '#FF00FF': 5, '#00FFFF': 6, '#FFFFFF': 7,
      '#FF8000': 8, '#8000FF': 9, '#FF0080': 10, '#80FF00': 11,
      '#00FF80': 12, '#0080FF': 13, '#8080FF': 14, '#FF8080': 15,
      '#808080': 16, '#FFD700': 17, '#FF69B4': 18, '#00CED1': 19
    }
  };
  
  const map = colorMap[consoleFamily] || colorMap['X32/M32'];
  return map[hexColor?.toUpperCase()] || 0;
}

/**
 * Sync tracks to console
 */
async function syncToConsole(tracks, consoleConfig) {
  const config = CONSOLE_CONFIG[consoleConfig.type];
  if (!config) {
    throw new Error(`Unknown console type: ${consoleConfig.type}`);
  }
  
  const client = initOscClient(
    consoleConfig.type,
    consoleConfig.ip,
    consoleConfig.port
  );
  
  for (const track of tracks) {
    // Skip tracks beyond console's channel count
    if (track.number > config.maxChannels) {
      console.warn(`Track ${track.number} exceeds ${config.name} channel limit (${config.maxChannels})`);
      continue;
    }
    
    const formatted = formatTrackForConsole(track, consoleConfig.type);
    
    try {
      // Send track name
      await sendOscMessage(client, formatted.nameAddress, [
        { type: 's', value: formatted.name }
      ]);
      
      // Send color
      await sendOscMessage(client, formatted.colorAddress, [
        { type: 'i', value: formatted.color }
      ]);
      
      // Send mute state
      await sendOscMessage(client, formatted.muteAddress, [
        { type: 'i', value: formatted.mute }
      ]);
      
      // Send solo state
      await sendOscMessage(client, formatted.soloAddress, [
        { type: 'i', value: formatted.solo }
      ]);
      
      // Send fader level
      await sendOscMessage(client, formatted.faderAddress, [
        { type: 'f', value: formatted.fader }
      ]);
      
    } catch (error) {
      console.error(`Error syncing track ${track.number}:`, error);
    }
  }
}

/**
 * Start DAW bridge process
 */
async function startDawBridge(daw) {
  const scripts = {
    protools: path.join(__dirname, '../scripts/bridges/protools_bridge.py'),
    reaper: path.join(__dirname, '../scripts/bridges/reaper_bridge.py'),
    logic: path.join(__dirname, '../scripts/bridges/logic_bridge.py')
  };
  
  if (dawBridges[daw]) {
    dawBridges[daw].kill();
  }
  
  const scriptPath = scripts[daw];
  const python = process.platform === 'win32' ? 'python' : 'python3';
  
  dawBridges[daw] = exec(`${python} ${scriptPath}`, (error, stdout, stderr) => {
    if (error) {
      console.error(`${daw} bridge error:`, error);
    }
    if (stdout) console.log(`${daw}:`, stdout);
    if (stderr) console.error(`${daw} error:`, stderr);
  });
}

/**
 * Send data to DAW
 */
async function syncToDaw(tracks, daw) {
  const payload = JSON.stringify({
    action: 'sync',
    tracks: tracks
  });
  
  // Write to temp file for DAW bridge to read
  const tempFile = path.join(__dirname, `../temp/${daw}_sync.json`);
  await fs.mkdir(path.dirname(tempFile), { recursive: true });
  await fs.writeFile(tempFile, payload);
  
  // Notify DAW bridge via WebSocket if connected
  wss.clients.forEach(client => {
    if (client.readyState === WebSocket.OPEN) {
      client.send(JSON.stringify({
        type: 'daw_sync',
        daw: daw,
        file: tempFile
      }));
    }
  });
}

/**
 * Discovery endpoint - returns discovered consoles
 */
app.get('/discover', (req, res) => {
  const consoles = Array.from(discoveredConsoles.values());
  res.json({
    success: true,
    consoles: consoles,
    scanning: discovery.discoveryActive
  });
});

/**
 * Start/stop discovery
 */
app.post('/discovery/:action', (req, res) => {
  const { action } = req.params;
  
  if (action === 'start') {
    discovery.start();
    res.json({ success: true, message: 'Discovery started' });
  } else if (action === 'stop') {
    discovery.stop();
    res.json({ success: true, message: 'Discovery stopped' });
  } else {
    res.status(400).json({ success: false, error: 'Invalid action' });
  }
});

/**
 * Manual console probe
 */
app.post('/probe', async (req, res) => {
  const { ip, port, type } = req.body;
  
  if (!ip || !port || !type) {
    return res.status(400).json({ 
      success: false, 
      error: 'Missing required parameters: ip, port, type' 
    });
  }
  
  discovery.probeConsole(ip, port, type);
  
  res.json({ 
    success: true, 
    message: 'Probe initiated. Check /discover for results.' 
  });
});

/**
 * Main sync endpoint
 */
app.post('/sync', async (req, res) => {
  try {
    const { console: consoleConfig, daws, tracks } = req.body;
    
    // Sync to console
    if (consoleConfig && consoleConfig.ip) {
      await syncToConsole(tracks, consoleConfig);
    }
    
    // Sync to DAWs
    if (daws.protools) {
      await syncToDaw(tracks, 'protools');
    }
    if (daws.reaper) {
      await syncToDaw(tracks, 'reaper');
    }
    if (daws.logic) {
      await syncToDaw(tracks, 'logic');
    }
    
    // Broadcast update to all WebSocket clients
    wss.clients.forEach(client => {
      if (client.readyState === WebSocket.OPEN) {
        client.send(JSON.stringify({
          type: 'sync_complete',
          tracks: tracks.length
        }));
      }
    });
    
    res.json({ success: true, synced: tracks.length });
  } catch (error) {
    console.error('Sync error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * Test connection endpoint
 */
app.post('/test', async (req, res) => {
  try {
    const { console: consoleConfig } = req.body;
    
    const client = initOscClient(
      consoleConfig.type,
      consoleConfig.ip,
      consoleConfig.port
    );
    
    // Send a test message to channel 1
    await sendOscMessage(client, '/ch/01/config/name', [
      { type: 's', value: 'TEST' }
    ]);
    
    // Restore after 1 second
    setTimeout(async () => {
      await sendOscMessage(client, '/ch/01/config/name', [
        { type: 's', value: 'CH 01' }
      ]);
    }, 1000);
    
    res.json({ success: true, message: 'Connection successful!' });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * Health check endpoint
 */
app.get('/health', (req, res) => {
  res.json({
    status: 'running',
    version: '1.0.0',
    clients: oscClients.size,
    websockets: wss.clients.size,
    discovered: discoveredConsoles.size,
    discovery: discovery.discoveryActive,
    daws: {
      protools: !!dawBridges.protools,
      reaper: !!dawBridges.reaper,
      logic: !!dawBridges.logic
    }
  });
});

/**
 * WebSocket connection handler
 */
wss.on('connection', (ws) => {
  console.log('New WebSocket connection');
  
  // Send current discovered consoles
  ws.send(JSON.stringify({
    type: 'discovered_consoles',
    consoles: Array.from(discoveredConsoles.values())
  }));
  
  ws.on('message', async (message) => {
    try {
      const data = JSON.parse(message);
      
      switch (data.action) {
        case 'start_daw':
          await startDawBridge(data.daw);
          ws.send(JSON.stringify({ 
            type: 'daw_started', 
            daw: data.daw 
          }));
          break;
          
        case 'stop_daw':
          if (dawBridges[data.daw]) {
            dawBridges[data.daw].kill();
            dawBridges[data.daw] = null;
          }
          break;
          
        case 'start_discovery':
          discovery.start();
          break;
          
        case 'stop_discovery':
          discovery.stop();
          break;
          
        case 'ping':
          ws.send(JSON.stringify({ type: 'pong' }));
          break;
      }
    } catch (error) {
      console.error('WebSocket error:', error);
    }
  });
  
  ws.on('close', () => {
    console.log('WebSocket disconnected');
  });
});

/**
 * Start server
 */
app.listen(PORT, () => {
  console.log(`
╔═══════════════════════════════════════╗
║         SessionSync Bridge            ║
║      with Auto-Discovery Support      ║
║                                       ║
║  HTTP API:    http://localhost:${PORT}  ║
║  WebSocket:   ws://localhost:${PORT + 1}    ║
║                                       ║
║  Status: ✓ Running                    ║
║  Discovery: Starting...               ║
╚═══════════════════════════════════════╝
  `);
  
  // Start auto-discovery
  discovery.start();
});

// Cleanup on exit
process.on('SIGINT', () => {
  console.log('\nShutting down...');
  
  // Stop discovery
  discovery.stop();
  
  // Close OSC clients
  oscClients.forEach(client => client.close());
  
  // Kill DAW bridges
  Object.values(dawBridges).forEach(bridge => {
    if (bridge) bridge.kill();
  });
  
  process.exit(0);
});