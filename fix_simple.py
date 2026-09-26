import re
import os

# Simple approach: find all lines with bg[#0E7C3A] not followed by /digit and containing dark text
# and add text-white if not already present

files_to_check = [
    'app/dashboard/layout.tsx',
    'components/dashboard/settings/ApiKeysTab.tsx',
    'components/dashboard/settings/ModelsTab.tsx',
    'components/dashboard/cloud/page.tsx',
    'components/dashboard/credits/page.tsx',
    'components/dashboard/drive/page.tsx',
    'components/home/DemoVideosSection.tsx',
    'components/home/HeroSection.tsx',
    'components/home/HeroC.tsx',
    'components/pricing-binance.tsx',
    'components/dashboard/ProductsGrid.tsx',
    'app/gaming/page.tsx',
    'app/game/page.tsx',
    'app/customer/page.tsx',
    'app/dashboard/cloud/page.tsx',
    'app/dashboard/marketing/marketing-client.tsx',
    'app/dashboard/credits/page.tsx',
    'app/dashboard/drive/page.tsx',
    'app/dashboard/layout.tsx',
    'components/chat/ChatInterface.tsx',
    'components/subtitles/SubtitleGenerator.tsx',
    'app/referral/page.tsx',
    'app/status/page.tsx',
]

def fix_file(file_path):
    with open(file_path, 'r', encoding='utf-8') as f:
        content = f.read()
    
    changed = False
    
    # Process line by line
    lines = content.split('\n')
    
    for i, line in enumerate(lines):
        # Check for bg[#0E7C3A] not followed by /digit
        if 'bg-[#0E7C3A]' in line and not re.search(r'bg-\[#0E7C3A\]\/[\d]', line):
            # Check if it's in a className attribute
            if 'className="' in line:
                # Has double quotes
                if 'text-white' not in line:
                    # Add text-white before the closing quote
                    line = re.sub(r'(className="[^"]*bg-\[#0E7C3A\][^"]*)"', r'\1 text-white"', line)
                    changed = True
            elif "className='" in line:
                # Has single quotes
                if 'text-white' not in line:
                    line = re.sub(r"(className='[^']*bg-\[#0E7C3A\][^']*')", r"\1 text-white'", line)
                    changed = True
    
    if changed:
        with open(file_path, 'w', encoding='utf-8') as f:
            f.write('\n'.join(lines))
        return True
    return False

changed_files = []

for file_path in files_to_check:
    full_path = os.path.join('/home/romel/hostamar.com', file_path)
    if os.path.exists(full_path):
        if fix_file(full_path):
            changed_files.append(file_path)
            print(f"Fixed: {file_path}")
    else:
        print(f"File not found: {file_path}")

print(f"\nTotal files changed: {len(changed_files)}")
print("Files:", changed_files)
