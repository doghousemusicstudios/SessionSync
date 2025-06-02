#!/usr/bin/env python3
import os
import sys
import shutil
from pathlib import Path

def install_protools_bridge():
    """Install Pro Tools bridge script"""
    
    # Determine Pro Tools scripts location
    if sys.platform == "darwin":  # macOS
        script_dir = Path.home() / "Documents" / "Pro Tools" / "Scripts"
    elif sys.platform == "win32":  # Windows
        script_dir = Path.home() / "Documents" / "Pro Tools" / "Scripts"
    else:
        print("Unsupported platform")
        return False
    
    # Create directory if needed
    script_dir.mkdir(parents=True, exist_ok=True)
    
    # Copy bridge script
    source = Path(__file__).parent / "bridges" / "protools_bridge.py"
    dest = script_dir / "SessionSync.py"
    
    try:
        shutil.copy2(source, dest)
        print(f"✓ Installed Pro Tools bridge to: {dest}")
        return True
    except Exception as e:
        print(f"✗ Failed to install: {e}")
        return False

if __name__ == "__main__":
    install_protools_bridge()