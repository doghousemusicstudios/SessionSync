/**
 * Test console model identification
 */

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

// Test cases
const testCases = [
  // Midas
  { input: 'M32 Console', expected: 'M32' },
  { input: 'M32R-KLARK', expected: 'M32R' },
  { input: 'M32C Studio', expected: 'M32C' },
  { input: 'M32 LIVE Tour', expected: 'M32_LIVE' },
  { input: 'Midas M32 LIVE', expected: 'M32_LIVE' },
  
  // X32
  { input: 'X32', expected: 'X32' },
  { input: 'X32 Main', expected: 'X32' },
  { input: 'X32 COMPACT FOH', expected: 'X32_COMPACT' },
  { input: 'X32 PRODUCER Desktop', expected: 'X32_PRODUCER' },
  { input: 'X32 RACK Stage', expected: 'X32_RACK' },
  { input: 'X32 CORE Network', expected: 'X32_CORE' },
  
  // Wing
  { input: 'WING', expected: 'WING' },
  { input: 'Wing Console', expected: 'WING' },
  { input: 'WING RACK Unit', expected: 'WING_RACK' },
  { input: 'WING COMPACT Live', expected: 'WING_COMPACT' },
  
  // Edge cases
  { input: 'M32RackMount', expected: 'M32' }, // Should NOT match M32R
  { input: 'X32-COMPACT-V2', expected: 'X32_COMPACT' },
  { input: 'WING-RACK-01', expected: 'WING_RACK' }
];

// Run tests
console.log('Testing Console Model Identification\n');

let passed = 0;
let failed = 0;

testCases.forEach(test => {
  let identified = null;
  
  for (const { pattern, type } of CONSOLE_PATTERNS) {
    if (test.input.match(pattern)) {
      identified = type;
      break;
    }
  }
  
  const success = identified === test.expected;
  if (success) {
    passed++;
    console.log(`✓ "${test.input}" → ${identified}`);
  } else {
    failed++;
    console.log(`✗ "${test.input}" → ${identified} (expected: ${test.expected})`);
  }
});

console.log(`\nResults: ${passed} passed, ${failed} failed`);

// Test color mapping
console.log('\n\nTesting Color Mapping\n');

const colorTests = [
  { hex: '#FF0000', family: 'X32/M32', expected: 1 },  // Red
  { hex: '#00FF00', family: 'X32/M32', expected: 2 },  // Green
  { hex: '#808080', family: 'Wing', expected: 16 },    // Gray (Wing only)
  { hex: '#FFD700', family: 'Wing', expected: 17 },    // Gold (Wing only)
];

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

colorTests.forEach(test => {
  const result = mapColorToConsole(test.hex, test.family);
  const success = result === test.expected;
  
  console.log(`${success ? '✓' : '✗'} ${test.hex} on ${test.family} → ${result} ${success ? '' : `(expected: ${test.expected})`}`);
});

console.log('\n✨ Test complete!');