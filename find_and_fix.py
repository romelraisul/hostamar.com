import re
import os

# Dark text patterns to check against
dark_text_patterns = [
    'text-black',
    'text-zinc-900', 'text-zinc-800', 'text-zinc-700', 'text-zinc-600', 'text-zinc-500', 'text-zinc-400', 'text-zinc-300', 'text-zinc-200', 'text-zinc-100',
    'text-gray-900', 'text-gray-800', 'text-gray-700', 'text-gray-600', 'text-gray-500', 'text-gray-400', 'text-gray-300',
    'text-slate-900', 'text-slate-800', 'text-slate-700', 'text-slate-600',
    'text-neutral-900', 'text-neutral-800',
    'text-stone-900', 'text-stone-800',
    'text-[#062B1A]', 'text-[#0A5A2B]', 'text-[#0c6a32]', 'text-[#0c6b32]', 'text-[#0a5e2c]', 'text-[#1B3B2F]',
    'text-[#0F172A]', 'text-[#1C1917]',
]

def fix_file(file_path):
    with open(file_path, 'r', encoding='utf-8') as f:
        content = f.read()
    
    original_content = content
    changed = False
    
    # Find all bg[#0E7C3A] without /X opacity
    # Pattern: bg-[#0E7C3A] not followed by /digit, inside className
    lines = content.split('\n')
    
    for i, line in enumerate(lines):
        # Look for className with bg[#0E7C3A]
        if 'bg-[#0E7C3A]' in line and not re.search(r'bg-\[#0E7C3A\]\/[\d]', line):
            # Check if it's a className attribute
            if 'className=' in line:
                # Check for dark text in same line
                has_dark_text = any(pattern in line for pattern in dark_text_patterns)
                
                # Check if already has text-white
                has_white_text = 'text-white' in line
                
                if has_dark_text and not has_white_text:
                    # Need to fix - add text-white
                    # Try different approaches to add text-white
                    if 'className="' in line:
                        # For quoted className
                        line = re.sub(r'(className="[^"]*bg-\[#0E7C3A\][^"]*)"', r'\1 text-white"', line)
                        changed = True
                    elif "className='" in line:
                        # For single-quoted className
                        line = re.sub(r"(className='[^']*bg-\[#0E7C3A\][^']*)", r"\1 text-white'", line)
                        changed = True
                    else:
                        # Try more complex patterns
                        line = re.sub(r'(className="[^"]*bg-\[#0E7C3A\][^"]*text-\[[^\]]+\][^"]*)"', r'\1 text-white"', line)
                        line = re.sub(r"(className='[^']*bg-\[#0E7C3A\][^']*text-\[[^\]]+\][^']*')", r"\1 text-white'", line)
                        changed = True
                    
                    lines[i] = line
    
    if changed:
        with open(file_path, 'w', encoding='utf-8') as f:
            f.write('\n'.join(lines))
        return True
    return False

# Process files in order
files_to_check = [
    'app/dashboard/layout.tsx',
    'components/dashboard/settings/ApiKeysTab.tsx',
    'components/dashboard/settings/ModelsTab.tsx',
    'components/dashboard/cloud/page.tsx',
    'components/dashboard/credits/page.tsx',
    'components/dashboard/drive/page.tsx',
    'components/dashboard/layout.tsx',
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
    'app/customer/page.tsx',
    'app/privacy/privacy-content.tsx',
    'app/dashboard/credits/page.tsx',
    'app/dashboard/credits/page.tsx',
    'app/dashboard/drive/page.tsx',
    'app/dashboard/cloud/page.tsx',
]

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
