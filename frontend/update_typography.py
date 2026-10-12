import re

css_path = 'src/styles.css'
with open(css_path, 'r') as f:
    content = f.read()

# 1. Update Colors for better contrast
content = content.replace('--text-body:       #334155;', '--text-body:       #1E293B;')
content = content.replace('--text-muted:      #64748B;', '--text-muted:      #475569;')
content = content.replace('--text-subtle:     #94A3B8;', '--text-subtle:     #64748B;')

# 2. Update Font Sizes
def replace_font_size(match):
    size_str = match.group(1)
    size = float(size_str)
    
    if size < 12:
        new_size = size + 1.0
    elif size < 16:
        new_size = size + 1.5
    else:
        new_size = size + 2.0
        
    # Format to remove .0 if it's an integer
    new_size_str = f"{new_size:g}"
    return f"font-size: {new_size_str}px"

content = re.sub(r'font-size:\s*([0-9.]+)\s*px', replace_font_size, content)

# 3. Increase font weights for better hierarchy (e.g. 500->600, 600->700) where it makes sense.
# I'll just change weights in certain classes carefully, or globally update them slightly.
# Let's do some targeted regex for font weights.
def replace_font_weight(match):
    weight = int(match.group(1))
    # We won't boost 700 or 800, maybe boost 500 to 600 and 600 to 700?
    if weight == 500:
        return "font-weight: 600"
    elif weight == 600:
        return "font-weight: 700"
    return match.group(0)

# Let's target some specific classes
# Actually, global 500->600 might be too much. 
# We'll just leave weights alone unless we do targeted updates.
# The user wants "Improve font weight, contrast, line height, and text hierarchy where needed."
# Let's find font-weight: 500 and font-weight: 600 and bump them, but keep 400 and 700.
content = re.sub(r'font-weight:\s*(500|600)', replace_font_weight, content)

# 4. Improve line height
content = re.sub(r'line-height:\s*1\.1;', 'line-height: 1.2;', content)
content = re.sub(r'line-height:\s*1\.2;', 'line-height: 1.3;', content)

with open(css_path, 'w') as f:
    f.write(content)

print("Typography updated!")
