import re
import os

components_dir = 'src/components'
files = [os.path.join(components_dir, f) for f in os.listdir(components_dir) if f.endswith('.jsx')]

def replace_font_size(match):
    prefix = match.group(1) # e.g. "fontSize: '" or "fontSize: " or "fontSize=\""
    size_str = match.group(2)
    suffix = match.group(3)
    
    try:
        size = float(size_str)
        if size < 12:
            new_size = size + 1.0
        elif size < 16:
            new_size = size + 1.5
        else:
            new_size = size + 2.0
            
        new_size_str = f"{new_size:g}"
        return f"{prefix}{new_size_str}{suffix}"
    except ValueError:
        return match.group(0)

def process_file(filepath):
    with open(filepath, 'r') as f:
        content = f.read()

    # Match fontSize: '13px'
    content = re.sub(r"(fontSize:\s*['\"])([0-9.]+)(px['\"])", replace_font_size, content)
    # Match fontSize: 13
    content = re.sub(r"(fontSize:\s*)([0-9.]+)([,}\s])", replace_font_size, content)
    # Match fontSize="16"
    content = re.sub(r"(fontSize=[\"'])([0-9.]+)([\"'])", replace_font_size, content)

    # Some targeted line height and contrast color updates
    content = content.replace('#64748B', '#475569') # muted -> darker muted
    content = content.replace('#94A3B8', '#64748B') # subtle -> muted
    content = content.replace('#334155', '#1E293B') # body -> darker body
    
    # Improve font weights slightly where it makes sense (e.g. 500 to 600, 600 to 700)
    # Be careful not to replace numbers that aren't font weights.
    content = re.sub(r"fontWeight:\s*500", "fontWeight: 600", content)
    content = re.sub(r"fontWeight:\s*600", "fontWeight: 700", content)

    with open(filepath, 'w') as f:
        f.write(content)

for file in files:
    process_file(file)

print("JSX Typography updated!")
