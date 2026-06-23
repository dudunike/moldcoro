import re

with open('/home/eduardo2e/Documents/Mold & Coro/index.html', 'r') as f:
    html = f.read()

# Remove HTML comments
html = re.sub(r'<!--.*?-->\n?', '', html, flags=re.DOTALL)

# Update buttons to use a single color class if they don't
html = html.replace('btn--coral', 'btn--green').replace('btn--dark', 'btn--green')

with open('/home/eduardo2e/Documents/Mold & Coro/index.html', 'w') as f:
    f.write(html)

with open('/home/eduardo2e/Documents/Mold & Coro/style.css', 'r') as f:
    css = f.read()

# Add btn--green to css if not exists
if 'btn--green' not in css:
    css += "\n.btn--green { background: #39B574; color: #fff; }\n.btn--green:hover { filter: brightness(1.1); }\n"

with open('/home/eduardo2e/Documents/Mold & Coro/style.css', 'w') as f:
    f.write(css)

