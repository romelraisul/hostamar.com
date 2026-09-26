import re

# Read the FeaturesSection.tsx file
with open('/home/romel/hostamar.com/components/home/FeaturesSection.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

# Find and replace the bg[#0E7C3A] div in the first feature card
old_pattern = r'(\s*)<div className="w-12 h-12 bg-\[#0E7C3A\] dark:bg-green-900/40 rounded-lg flex items-center justify-center mb-4">\s*\n\s*<span className="text-2xl text-white">💫</span>\s*\n\s*</div>'

new_replacement = '''            <div className="w-12 h-12 bg-[#0E7C3A] dark:bg-green-900/40 rounded-lg flex items-center justify-center mb-4">
                                      <span className="text-2xl text-white">💫</span>
            </div>'''

if re.search(old_pattern, content, re.MULTILINE | re.DOTALL):
    content = re.sub(old_pattern, new_replacement, content, flags=re.MULTILINE | re.DOTALL)
    print("✓ Fixed FeaturesSection.tsx")
else:
    print("✗ Pattern not found in FeaturesSection.tsx")

# Write back to file
with open('/home/romel/hostamar.com/components/home/FeaturesSection.tsx', 'w', encoding='utf-8') as f:
    f.write(content)