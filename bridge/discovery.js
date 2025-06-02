/**
 * Console Discovery Module
 * Provides both mDNS and fallback discovery methods
 */

const dgram = require('dgram');
const os = require('os');
const EventEmitter = require('events');

class ConsoleDiscovery extends EventEmitter {
  constructor() {
    super();
    this.discovering = false;
    this.mdnsAvailable = false;
    this.mdnsBrowser = null;
    
    // Try to load mdns module
    try {
      this.mdns = require('mdns');
      this.mdnsAvailable = true;
    } catch (e) {
      console.log('mDNS module not available, using fallback discovery');
    }
  }
  
  /**
   * Start discovery using available methods
   */
  start() {
    if (this.discovering) return;
    
    this.discovering = true;
    console.log('Starting console discovery...');
    
    if (this.mdnsAvailable) {
      this.startMdns();
    }
    
    // Always run network scan as backup
    this.startNetworkScan();
  }
  
  /**
   * Stop all discovery methods
   */
  stop() {
    this.discovering = false;
    
    if (this.mdnsBrowser) {
      this.mdnsBrowser.stop();
      this.mdnsBrowser = null;
    }
    
    if (this.scanInterval) {
      clearInterval(this.scanInterval);
      this.scanInterval = null;
    }
  }
  
  /**
   * Start mDNS discovery
   */
  startMdns() {
    try {
      // Browse for _osc._udp services
      this.mdnsBrowser = this.mdns.createBrowser(this.mdns.udp('osc'));
      
      this.mdnsBrowser.on('serviceUp', (service) => {
        this.handleMdnsService(service, 'up');
      });
      
      this.mdnsBrowser.on('serviceDown', (service) => {
        this.handleMdnsService(service, 'down');
      });
      
      this.mdnsBrowser.start();
      console.log('mDNS discovery started');
    } catch (error) {
      console.error('mDNS discovery failed:', error);
      this.mdnsAvailable = false;
    }
  }
  
  /**
   * Handle mDNS service events
   */
  handleMdnsService(service, status) {
    if (!service.addresses || service.addresses.length === 0) return;
    
    // Try to identify console type from service name
    let consoleType = null;
    if (service.name.match(/X32|M32/i)) {
      consoleType = 'M32';
    } else if (service.name.match(/Wing/i)) {
      consoleType = 'Wing';
    }
    
    if (consoleType) {
      const console = {
        type: consoleType,
        name: service.name,
        ip: service.addresses[0],
        port: service.port || (consoleType === 'M32' ? 10023 : 2222),
        via: 'mdns'
      };
      
      this.emit(status === 'up' ? 'console:found' : 'console:lost', console);
    }
  }
  
  /**
   * Start network scanning fallback
   */
  startNetworkScan() {
    // Get local network interfaces
    const interfaces = this.getLocalNetworks();
    
    // Initial scan
    this.scanNetworks(interfaces);
    
    // Periodic rescan every 30 seconds
    this.scanInterval = setInterval(() => {
      if (this.discovering) {
        this.scanNetworks(interfaces);
      }
    }, 30000);
  }
  
  /**
   * Get local network information
   */
  getLocalNetworks() {
    const interfaces = os.networkInterfaces();
    const networks = [];
    
    Object.values(interfaces).forEach(ifaces => {
      ifaces.forEach(iface => {
        if (iface.family === 'IPv4' && !iface.internal) {
          const parts = iface.address.split('.');
          const subnet = parts.slice(0, 3).join('.');
          
          networks.push({
            subnet: subnet,
            localIp: iface.address,
            netmask: iface.netmask
          });
        }
      });
    });
    
    return networks;
  }
  
  /**
   * Scan networks for consoles
   */
  async scanNetworks(networks) {
    console.log(`Scanning ${networks.length} network(s) for consoles...`);
    
    for (const network of networks) {
      // Common static IPs to check first
      const priorityIps = [
        `${network.subnet}.1`,
        `${network.subnet}.2`,
        `${network.subnet}.10`,
        `${network.subnet}.100`,
        `${network.subnet}.200`
      ];
      
      // Check priority IPs first
      for (const ip of priorityIps) {
        await this.probeIp(ip);
      }
      
      // Then scan range (skip .0, .255, and local IP)
      for (let i = 1; i < 255; i++) {
        const ip = `${network.subnet}.${i}`;
        
        if (ip !== network.localIp && !priorityIps.includes(ip)) {
          await this.probeIp(ip);
          
          // Small delay to avoid network flood
          if (i % 10 === 0) {
            await new Promise(resolve => setTimeout(resolve, 100));
          }
        }
      }
    }
  }
  
  /**
   * Probe a specific IP for console presence
   */
  async probeIp(ip) {
    // Test M32 port
    this.sendProbe(ip, 10023, 'M32');
    
    // Test Wing port
    this.sendProbe(ip, 2222, 'Wing');
  }
  
  /**
   * Send probe packet to IP:port
   */
  sendProbe(ip, port, consoleType) {
    const socket = dgram.createSocket('udp4');
    let responded = false;
    
    // Set short timeout
    const timeout = setTimeout(() => {
      if (!responded) {
        socket.close();
      }
    }, 200);
    
    // Listen for responses
    socket.on('message', (msg) => {
      responded = true;
      clearTimeout(timeout);
      socket.close();
      
      // Console responded, emit found event
      this.emit('console:found', {
        type: consoleType,
        name: `${consoleType} at ${ip}`,
        ip: ip,
        port: port,
        via: 'probe'
      });
    });
    
    socket.on('error', () => {
      clearTimeout(timeout);
      socket.close();
    });
    
    // Create probe message (basic OSC message)
    const probe = this.createOscMessage('/xinfo'); // M32/Wing info command
    
    try {
      socket.send(probe, port, ip);
    } catch (e) {
      socket.close();
    }
  }
  
  /**
   * Create a simple OSC message
   */
  createOscMessage(address) {
    // Basic OSC message structure
    const addressBuf = Buffer.from(address);
    const padding = 4 - (addressBuf.length % 4);
    const paddedAddress = Buffer.concat([
      addressBuf,
      Buffer.alloc(padding)
    ]);
    
    // Type tag (just comma for no arguments)
    const typeTags = Buffer.from([0x2c, 0x00, 0x00, 0x00]); // ",\0\0\0"
    
    return Buffer.concat([paddedAddress, typeTags]);
  }
}

/**
 * Simplified discovery interface
 */
class SimpleDiscovery extends EventEmitter {
  constructor() {
    super();
    this.consoles = new Map();
    this.scanner = null;
  }
  
  /**
   * Start simplified discovery
   */
  start() {
    console.log('Starting simplified console discovery...');
    
    // Quick scan common console IPs
    this.quickScan();
    
    // Set up periodic scan
    this.scanner = setInterval(() => {
      this.quickScan();
    }, 60000); // Every minute
  }
  
  /**
   * Stop discovery
   */
  stop() {
    if (this.scanner) {
      clearInterval(this.scanner);
      this.scanner = null;
    }
  }
  
  /**
   * Quick scan of common IPs
   */
  async quickScan() {
    const commonIps = [
      // Common router-assigned IPs
      '192.168.1.100', '192.168.1.200',
      '192.168.0.100', '192.168.0.200',
      '10.0.0.100', '10.0.0.200',
      '172.16.0.100',
      
      // Common static IPs for audio equipment
      '192.168.1.10', '192.168.1.20',
      '192.168.0.10', '192.168.0.20',
      '10.0.0.10', '10.0.0.20'
    ];
    
    for (const ip of commonIps) {
      // Test M32
      this.testConsole(ip, 10023, 'M32');
      
      // Test Wing
      this.testConsole(ip, 2222, 'Wing');
      
      await new Promise(resolve => setTimeout(resolve, 50));
    }
  }
  
  /**
   * Test if console exists at IP:port
   */
  testConsole(ip, port, type) {
    const socket = dgram.createSocket('udp4');
    const key = `${ip}:${port}`;
    
    const timeout = setTimeout(() => {
      socket.close();
    }, 500);
    
    socket.on('message', () => {
      clearTimeout(timeout);
      socket.close();
      
      if (!this.consoles.has(key)) {
        const console = {
          type: type,
          name: `${type} at ${ip}`,
          ip: ip,
          port: port,
          via: 'quick-scan'
        };
        
        this.consoles.set(key, console);
        this.emit('console:found', console);
      }
    });
    
    socket.on('error', () => {
      clearTimeout(timeout);
      socket.close();
    });
    
    // Send info request
    const msg = Buffer.from(`/xinfo${String.fromCharCode(0).repeat(4)},[0,0,0,0]`);
    
    try {
      socket.send(msg, port, ip);
    } catch (e) {
      socket.close();
    }
  }
}

// Export the appropriate discovery class based on environment
module.exports = (() => {
  // Check if we can use full discovery
  try {
    require('mdns');
    return ConsoleDiscovery;
  } catch (e) {
    // Fallback to simple discovery
    console.log('Using simplified discovery (install mdns for full discovery)');
    return SimpleDiscovery;
  }
})();