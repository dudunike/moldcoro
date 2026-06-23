import re

with open('/home/eduardo2e/Documents/Mold & Coro/index.html', 'r') as f:
    html = f.read()

# Remove the img tags inside bonus cards
html = re.sub(r'\s*<img src="img22/[^"]+" loading="lazy" class="bonus-card__img" />', '', html)

with open('/home/eduardo2e/Documents/Mold & Coro/index.html', 'w') as f:
    f.write(html)
