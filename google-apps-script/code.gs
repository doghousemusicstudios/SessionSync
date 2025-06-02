/**
 * SessionSync - Google Sheets Add-on
 * Main Google Apps Script file
 */

// Global constants
const ADDON_TITLE = 'SessionSync';
const WS_URL = 'ws://localhost:8765';
const DEFAULT_COLUMNS = ['Track #', 'Track Name', 'Color', 'Mute', 'Solo', 'Fader'];

/**
 * Runs when the add-on is installed.
 */
function onInstall(e) {
  onOpen(e);
}

/**
 * Runs when the document is opened.
 */
function onOpen(e) {
  SpreadsheetApp.getUi()
    .createAddonMenu()
    .addItem('Initialize Sheet', 'initializeSheet')
    .addItem('Sync Selected Tracks', 'syncSelectedTracks')
    .addItem('Sync All Tracks', 'syncAllTracks')
    .addSeparator()
    .addItem('Settings', 'showSettings')
    .addItem('About', 'showAbout')
    .addToUi();
}

/**
 * Initialize the sheet with default columns
 */
function initializeSheet() {
  const sheet = SpreadsheetApp.getActiveSheet();
  const ui = SpreadsheetApp.getUi();
  
  // Check if sheet already has data
  if (sheet.getLastRow() > 0) {
    const response = ui.alert(
      'Sheet contains data',
      'This will overwrite the header row. Continue?',
      ui.ButtonSet.YES_NO
    );
    
    if (response !== ui.Button.YES) {
      return;
    }
  }
  
  // Set up headers
  const headers = sheet.getRange(1, 1, 1, DEFAULT_COLUMNS.length);
  headers.setValues([DEFAULT_COLUMNS]);
  headers.setFontWeight('bold');
  headers.setBackground('#4a90e2');
  headers.setFontColor('#ffffff');
  
  // Add sample data
  const sampleData = [
    [1, 'Kick', '#FF0000', false, false, 0.75],
    [2, 'Snare', '#00FF00', false, false, 0.70],
    [3, 'Hi-Hat', '#0000FF', false, false, 0.65],
    [4, 'Bass', '#FF00FF', false, false, 0.80],
    [5, 'Guitar L', '#FFFF00', false, false, 0.60],
    [6, 'Guitar R', '#FFFF00', false, false, 0.60],
    [7, 'Keys', '#00FFFF', false, false, 0.55],
    [8, 'Lead Vox', '#FFFFFF', false, false, 0.85]
  ];
  
  sheet.getRange(2, 1, sampleData.length, DEFAULT_COLUMNS.length).setValues(sampleData);
  
  // Format columns
  sheet.setColumnWidth(1, 80);  // Track #
  sheet.setColumnWidth(2, 150); // Track Name
  sheet.setColumnWidth(3, 100); // Color
  sheet.setColumnWidth(4, 60);  // Mute
  sheet.setColumnWidth(5, 60);  // Solo
  sheet.setColumnWidth(6, 80);  // Fader
  
  // Add color preview conditional formatting
  addColorFormatting();
  
  ui.alert('Success', 'Sheet initialized with SessionSync template!', ui.ButtonSet.OK);
}

/**
 * Add color preview formatting to the Color column
 */
function addColorFormatting() {
  const sheet = SpreadsheetApp.getActiveSheet();
  const colorColumn = 3; // C column
  const lastRow = sheet.getLastRow();
  
  if (lastRow > 1) {
    const colorRange = sheet.getRange(2, colorColumn, lastRow - 1, 1);
    const colors = colorRange.getValues();
    
    colors.forEach((color, index) => {
      if (color[0] && isValidColor(color[0])) {
        sheet.getRange(index + 2, colorColumn).setBackground(color[0]);
      }
    });
  }
}

/**
 * Validate color format
 */
function isValidColor(color) {
  return /^#[0-9A-F]{6}$/i.test(color);
}

/**
 * Sync selected tracks
 */
function syncSelectedTracks() {
  const sheet = SpreadsheetApp.getActiveSheet();
  const selection = sheet.getActiveRange();
  
  if (!selection) {
    SpreadsheetApp.getUi().alert('Error', 'Please select tracks to sync.', SpreadsheetApp.getUi().ButtonSet.OK);
    return;
  }
  
  const startRow = selection.getRow();
  const numRows = selection.getNumRows();
  
  // Skip header row
  const dataStartRow = startRow < 2 ? 2 : startRow;
  const dataNumRows = startRow < 2 ? numRows - 1 : numRows;
  
  if (dataNumRows <= 0) {
    SpreadsheetApp.getUi().alert('Error', 'No data rows selected.', SpreadsheetApp.getUi().ButtonSet.OK);
    return;
  }
  
  const trackData = sheet.getRange(dataStartRow, 1, dataNumRows, DEFAULT_COLUMNS.length).getValues();
  syncTracks(trackData);
}

/**
 * Sync all tracks
 */
function syncAllTracks() {
  const sheet = SpreadsheetApp.getActiveSheet();
  const lastRow = sheet.getLastRow();
  
  if (lastRow <= 1) {
    SpreadsheetApp.getUi().alert('Error', 'No track data found.', SpreadsheetApp.getUi().ButtonSet.OK);
    return;
  }
  
  const trackData = sheet.getRange(2, 1, lastRow - 1, DEFAULT_COLUMNS.length).getValues();
  syncTracks(trackData);
}

/**
 * Send track data to the bridge
 */
function syncTracks(trackData) {
  const settings = getSettings();
  
  if (!settings.bridgeEnabled) {
    SpreadsheetApp.getUi().alert('Error', 'Bridge not configured. Please check settings.', SpreadsheetApp.getUi().ButtonSet.OK);
    return;
  }
  
  const tracks = trackData.map(row => ({
    number: row[0],
    name: row[1],
    color: row[2],
    mute: row[3],
    solo: row[4],
    fader: row[5]
  }));
  
  const payload = {
    action: 'sync',
    source: 'sheets',
    console: {
      type: settings.consoleType,
      ip: settings.consoleIp,
      port: settings.consolePort
    },
    daws: {
      protools: settings.protoolsEnabled,
      reaper: settings.reaperEnabled,
      logic: settings.logicEnabled
    },
    tracks: tracks
  };
  
  try {
    const response = UrlFetchApp.fetch(settings.bridgeUrl, {
      method: 'post',
      contentType: 'application/json',
      payload: JSON.stringify(payload)
    });
    
    const result = JSON.parse(response.getContentText());
    
    if (result.success) {
      SpreadsheetApp.getUi().alert(
        'Success', 
        `Synced ${tracks.length} tracks successfully!`, 
        SpreadsheetApp.getUi().ButtonSet.OK
      );
    } else {
      throw new Error(result.error || 'Unknown error');
    }
  } catch (error) {
    SpreadsheetApp.getUi().alert(
      'Error', 
      'Failed to sync: ' + error.toString(), 
      SpreadsheetApp.getUi().ButtonSet.OK
    );
  }
}

/**
 * Show settings dialog
 */
function showSettings() {
  const html = HtmlService.createHtmlOutputFromFile('Settings')
    .setWidth(600)
    .setHeight(700);
  
  SpreadsheetApp.getUi().showModalDialog(html, 'SessionSync Settings');
}

/**
 * Show about dialog
 */
function showAbout() {
  const html = HtmlService.createHtmlOutputFromFile('About')
    .setWidth(400)
    .setHeight(300);
  
  SpreadsheetApp.getUi().showModalDialog(html, 'About SessionSync');
}

/**
 * Get saved settings
 */
function getSettings() {
  const userProperties = PropertiesService.getUserProperties();
  
  return {
    bridgeEnabled: userProperties.getProperty('bridgeEnabled') === 'true',
    bridgeUrl: userProperties.getProperty('bridgeUrl') || 'http://localhost:8765/sync',
    consoleType: userProperties.getProperty('consoleType') || 'X32',
    consoleIp: userProperties.getProperty('consoleIp') || '',
    consolePort: parseInt(userProperties.getProperty('consolePort') || '10023'),
    protoolsEnabled: userProperties.getProperty('protoolsEnabled') === 'true',
    reaperEnabled: userProperties.getProperty('reaperEnabled') === 'true',
    logicEnabled: userProperties.getProperty('logicEnabled') === 'true'
  };
}

/**
 * Save settings
 */
function saveSettings(settings) {
  const userProperties = PropertiesService.getUserProperties();
  
  userProperties.setProperties({
    bridgeEnabled: settings.bridgeEnabled.toString(),
    bridgeUrl: settings.bridgeUrl,
    consoleType: settings.consoleType,
    consoleIp: settings.consoleIp,
    consolePort: settings.consolePort.toString(),
    protoolsEnabled: settings.protoolsEnabled.toString(),
    reaperEnabled: settings.reaperEnabled.toString(),
    logicEnabled: settings.logicEnabled.toString()
  });
  
  return { success: true };
}

/**
 * Test console connection
 */
function testConnection() {
  const settings = getSettings();
  
  try {
    const response = UrlFetchApp.fetch(settings.bridgeUrl.replace('/sync', '/test'), {
      method: 'post',
      contentType: 'application/json',
      payload: JSON.stringify({
        console: {
          type: settings.consoleType,
          ip: settings.consoleIp,
          port: settings.consolePort
        }
      })
    });
    
    return JSON.parse(response.getContentText());
  } catch (error) {
    return { success: false, error: error.toString() };
  }
}

/**
 * Color mapping for consoles
 * X32/M32 family shares the same color palette
 */
const COLOR_MAP = {
  'X32/M32': {
    '#000000': 0,  // Black
    '#FF0000': 1,  // Red
    '#00FF00': 2,  // Green
    '#FFFF00': 3,  // Yellow
    '#0000FF': 4,  // Blue
    '#FF00FF': 5,  // Magenta
    '#00FFFF': 6,  // Cyan
    '#FFFFFF': 7,  // White
    '#FF8000': 8,  // Orange
    '#8000FF': 9,  // Purple
    '#FF0080': 10, // Pink
    '#80FF00': 11, // Lime
    '#00FF80': 12, // Mint
    '#0080FF': 13, // Sky
    '#8080FF': 14, // Lavender
    '#FF8080': 15  // Coral
  },
  Wing: {
    // Behringer Wing has extended color palette
    '#000000': 0,
    '#FF0000': 1,
    '#00FF00': 2,
    '#FFFF00': 3,
    '#0000FF': 4,
    '#FF00FF': 5,
    '#00FFFF': 6,
    '#FFFFFF': 7,
    '#FF8000': 8,
    '#8000FF': 9,
    '#FF0080': 10,
    '#80FF00': 11,
    '#00FF80': 12,
    '#0080FF': 13,
    '#8080FF': 14,
    '#FF8080': 15,
    '#808080': 16,
    '#FFD700': 17,
    '#FF69B4': 18,
    '#00CED1': 19
  }
};

/**
 * Convert hex color to console color index
 */
function hexToConsoleColor(hex, consoleType) {
  // Determine color map based on console type
  let colorMap;
  
  // Check if it's an X32/M32 family console
  const x32m32Types = ['X32', 'X32_COMPACT', 'X32_PRODUCER', 'X32_RACK', 'X32_CORE', 
                       'M32', 'M32R', 'M32C', 'M32_LIVE'];
  const wingTypes = ['WING', 'WING_RACK', 'WING_COMPACT'];
  
  if (x32m32Types.includes(consoleType)) {
    colorMap = COLOR_MAP['X32/M32'];
  } else if (wingTypes.includes(consoleType)) {
    colorMap = COLOR_MAP.Wing;
  } else {
    // Default to X32/M32 colors
    colorMap = COLOR_MAP['X32/M32'];
  }
  
  return colorMap[hex.toUpperCase()] || 0;
}