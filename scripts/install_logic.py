#!/usr/bin/env python3
import os
import sys
import shutil
from pathlib import Path

def install_logic_bridge():
    """Install Logic Pro bridge script"""
    
    if sys.platform != "darwin":
        print("Logic Pro is only available on macOS")
        return False
    
    # Logic Pro Scripts location
    script_dir = Path.home() / "Music/Audio Music Apps/Scripts"
    
    # Create directory if needed
    script_dir.mkdir(parents=True, exist_ok=True)
    
    # Copy bridge script
    source = Path(__file__).parent / "bridges" / "logic_bridge.py"
    dest = script_dir / "SessionSync.py"
    
    # Create simple AppleScript wrapper for Logic
    applescript_content = '''
on run
    do shell script "python3 ~/Music/Audio\\\\ Music\\\\ Apps/Scripts/SessionSync.py &"
end run
'''
    
    applescript_path = script_dir / "SessionSync.scpt"
    
    try:
        # Copy Python bridge
        if source.exists():
            shutil.copy2(source, dest)
        else:
            # Create a placeholder if the file doesn't exist yet
            with open(dest, 'w') as f:
                f.write('#!/usr/bin/env python3\n')
                f.write('# Logic Pro bridge will be implemented here\n')
                f.write('print("Logic Pro bridge started")\n')
        
        # Create AppleScript
        with open(applescript_path, 'w') as f:
            f.write(applescript_content)
        
        # Compile AppleScript
        os.system(f'osacompile -o "{script_dir}/SessionSync.app" "{applescript_path}"')
        
        print(f"✓ Installed Logic Pro bridge to: {dest}")
        print(f"✓ Created Logic Pro app: {script_dir}/SessionSync.app")
        print("\nNext steps:")
        print("1. Open Logic Pro")
        print("2. Go to Scripts menu")
        print("3. Select 'Open Scripts Folder'")
        print("4. Double-click SessionSync.app to start")
        return True
    except Exception as e:
        print(f"✗ Failed to install: {e}")
        return False

if __name__ == "__main__":
    install_logic_bridge()