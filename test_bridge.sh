#!/bin/bash
# Quick test script for the bridge

echo "Testing SessionSync Bridge..."

# Check if bridge is running
if curl -s http://localhost:8765/health > /dev/null; then
    echo "✅ Bridge is running"
    curl -s http://localhost:8765/health | python -m json.tool
else
    echo "❌ Bridge is not running"
    echo "Start it with: npm run bridge"
fi

# Test discovery
echo ""
echo "Testing console discovery..."
curl -s http://localhost:8765/discover | python -m json.tool
