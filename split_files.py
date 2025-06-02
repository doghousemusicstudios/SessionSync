#!/usr/bin/env python3
"""
Split concatenated SessionSync files
Usage: python split_files.py concatenated_file.txt
"""

import os
import sys
from pathlib import Path

def split_files(input_file):
    with open(input_file, 'r', encoding='utf-8') as f:
        content = f.read()
    
    current_file = None
    current_content = []
    files_created = 0
    
    for line in content.split('\n'):
        if line.startswith('=== FILE: ') and line.endswith(' ==='):
            # Save previous file
            if current_file and current_content:
                Path(current_file).parent.mkdir(parents=True, exist_ok=True)
                with open(current_file, 'w', encoding='utf-8') as f:
                    f.write('\n'.join(current_content))
                print(f'Created: {current_file}')
                files_created += 1
            
            # Start new file
            current_file = line[10:-4]
            current_content = []
        elif current_file:
            current_content.append(line)
    
    # Save last file
    if current_file and current_content:
        Path(current_file).parent.mkdir(parents=True, exist_ok=True)
        with open(current_file, 'w', encoding='utf-8') as f:
            f.write('\n'.join(current_content))
        print(f'Created: {current_file}')
        files_created += 1
    
    print(f'\n✅ Created {files_created} files')

if __name__ == '__main__':
    if len(sys.argv) > 1:
        split_files(sys.argv[1])
    else:
        print('Usage: python split_files.py <concatenated_file>')
        print('\nThis will split the concatenated file into individual files.')
