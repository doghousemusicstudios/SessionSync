@echo off
REM Quick test script for Windows

echo Testing SessionSync Bridge...

curl -s http://localhost:8765/health >nul 2>&1
if %errorlevel% == 0 (
    echo Bridge is running
    curl -s http://localhost:8765/health
) else (
    echo Bridge is not running
    echo Start it with: npm run bridge
)

pause
