import os, re

# Find all .tsx and .ts files
all_files = []
for dirpath, dirnames, filenames in os.walk('.'):
    for filename in filenames:
        if filename.endswith('.tsx') or filename.endswith('.ts'):
            full_path = os.path.join(dirpath, filename)
            all_files.append(full_path)

print(f"Found {len(all_files)} .tsx/.ts files")

# Dark text patterns
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
    
    changed = False
    
    # Look for bg[#0E7C3A] not followed by /digit
    lines = content.split('\n')
    
    for i, line in enumerate(lines):
        if 'bg-[#0E7C3A]' in line and not re.search(r'bg-\[#0E7C3A\]\/[\d]', line):
            if 'className="' in line and 'text-white' not in line:
                # Add text-white before closing quote
                line = re.sub(r'(className="[^"]*bg-\[#0E7C3A\][^"]*)"', r'\1 text-white"', line)
                changed = True
            elif "className='" in line and 'text-white' not in line:
                # Add text-white before closing quote
                line = re.sub(r"(className='[^']*bg-\[#0E7C3A\][^']*)", r"\1 text-white'", line)
                changed = True
    
    if changed:
        with open(file_path, 'w', encoding='utf-8') as f:
            f.write('\n'.join(lines))
        return True
    return False

# Find files with bg[#0E7C3A] (full opacity)
files_with_green = []
for file_path in all_files:
    try:
        with open(file_path, 'r', encoding='utf-8') as f:
            content = f.read()
            if 'bg-[#0E7C3A]' in content and not re.search(r'bg-\[#0E7C3A\]\/[\d]', content):
                files_with_green.append(file_path)
    except:
        pass

print(f"\nFound {len(files_with_green)} files with bg-[#0E7C3A] (full opacity)")

# Filter files that actually need fixing
files_to_fix = []
for file_path in files_with_green:
    try:
        with open(file_path, 'r', encoding='utf-8') as f:
            content = f.read()
            # Check if any dark text pattern is present
            if any(pattern in content for pattern in dark_text_patterns):
                # Check if text-white already exists
                if 'text-white' not in content:
                    files_to_fix.append(file_path)
    except:
        pass

print(f"\nNeed to fix {len(files_to_fix)} files (have dark text)")

# Fix files
changed_files = []
for file_path in files_to_fix:
    if fix_file(file_path):
        changed_files.append(file_path)
        rel_path = os.path.relpath(file_path, '.')
        print(f"Fixed: {rel_path}")

print(f"\nTotal files changed: {len(changed_files)}")
print("Files:", changed_files)
