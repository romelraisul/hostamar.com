import re
import os

# Dark text patterns that need fixing
dark_text_patterns = [
    'text-black',
    'text-zinc-900', 'text-zinc-800', 'text-zinc-700', 'text-zinc-600',
    'text-gray-900', 'text-gray-800', 'text-gray-700', 'text-gray-600',
    'text-slate-900', 'text-slate-800', 'text-slate-700',
    'text-neutral-900', 'text-neutral-800',
    'text-stone-900', 'text-stone-800',
    'text-[#062B1A]', 'text-[#0A5A2B]', 'text-[#0c6a32]', 'text-[#0c6b32]',
    'text-[#0a5e2c]', 'text-[#1B3B2F]',
    'text-[#0F172A]', 'text-[#1C1917]',
    'text-[#18181B]',
]

# Match bg-[#0E7C3A] NOT followed by / or /[
full_op_pattern = re.compile(r'bg-\[#0E7C3A\](?![\d/\[])')

def fix_file(file_path):
    with open(file_path, 'r', encoding='utf-8') as f:
        content = f.read()

    lines = content.split('\n')
    changed = False

    for i, line in enumerate(lines):
        if not full_op_pattern.search(line):
            continue
        if 'className' not in line:
            continue
        if 'text-white' in line:
            continue

        has_dark = any(p in line for p in dark_text_patterns)
        has_any_text_color = bool(re.search(r'text-(white|black|zinc|gray|slate|neutral|stone|emerald|green|blue|red|yellow|orange|purple|pink|indigo|cyan|teal|rose|fuchsia|violet|amber|lime|sky|#[0-9A-Fa-f])', line))

        if has_dark or (not has_any_text_color and re.search(r'<(button|a|span|div|Link|button)\b', line)):
            # Pattern 1: className="..."
            if 'className="' in line and 'className={`' not in line:
                def add_white(match):
                    val = match.group(1)
                    if 'text-white' not in val:
                        return 'className="' + val + ' text-white"'
                    return match.group(0)
                new_line = re.sub(r'className="([^\"]*)"', add_white, line)
                if new_line != line:
                    line = new_line
                    changed = True
            # Pattern 2: className='...'
            elif "className='" in line and 'className={`' not in line:
                def add_white(match):
                    val = match.group(1)
                    if 'text-white' not in val:
                        return "className='" + val + " text-white'"
                    return match.group(0)
                new_line = re.sub(r"className='([^']*)'", add_white, line)
                if new_line != line:
                    line = new_line
                    changed = True
            # Pattern 3: className={`...`}
            elif 'className={`' in line:
                def add_white(match):
                    val = match.group(1)
                    if 'text-white' not in val:
                        return 'className={`' + val + ' text-white`}'
                    return match.group(0)
                new_line = re.sub(r'className={`([^`]*)`}', add_white, line)
                if new_line != line:
                    line = new_line
                    changed = True
        lines[i] = line

    if changed:
        with open(file_path, 'w', encoding='utf-8') as f:
            f.write('\n'.join(lines))
        return True
    return False

# Find all .tsx and .ts files
result = os.popen("find /home/romel/hostamar.com -type f \\( -name '*.tsx' -o -name '*.ts' \\) ! -path '*/.next/*' ! -path '*/node_modules/*'").read()
files = [f for f in result.strip().split('\n') if f]

changed_files = []
for file_path in files:
    if fix_file(file_path):
        changed_files.append(file_path)
        print('Fixed: ' + file_path)

print('\nTotal files changed: ' + str(len(changed_files)))
for f in changed_files:
    print('  - ' + f)