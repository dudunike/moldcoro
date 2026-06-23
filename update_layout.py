import re

with open('/home/eduardo2e/Documents/Mold & Coro/index.html', 'r') as f:
    html = f.read()

# Fix Container 4 text color
html = html.replace('class="icon-list icon-list--dark mt-1"', 'class="icon-list mt-1"')

# Update Bonus Images
html = html.replace('<img src="img22/2026-06-22_21-32.png" loading="lazy" class="bonus-card__img" />', '<img src="img/bonus_impressao.jpg" loading="lazy" class="bonus-card__img" />')
html = html.replace('<img src="img22/2026-06-22_21-32_1.png" loading="lazy" class="bonus-card__img" />', '<img src="img/bonus_lista_materiais.jpg" loading="lazy" class="bonus-card__img" />')
html = html.replace('<img src="img22/2026-06-22_21-33_1.png" loading="lazy" class="bonus-card__img" />', '<img src="img/bonus_capa.jpg" loading="lazy" class="bonus-card__img" />')
html = html.replace('<img src="img22/2026-06-22_21-33_2.png" loading="lazy" class="bonus-card__img" />', '<img src="img/kit_bonus_capa.jpg" loading="lazy" class="bonus-card__img" />')

# Reorder Pricing Plans
# I'll extract the two plans and swap them
basic_match = re.search(r'(<div class="plan plan--basic">.*?</div>)\s*<div class="plan plan--complete">', html, re.DOTALL)
complete_match = re.search(r'(<div class="plan plan--complete">.*?</div>)\s*</div>\s*<div class="trust-box">', html, re.DOTALL)

if basic_match and complete_match:
    basic_html = basic_match.group(1)
    complete_html = complete_match.group(1)
    # The current order is basic then complete.
    # Replace the whole pricing-cols inner html
    pricing_cols_content = complete_html + "\n      " + basic_html
    # wait, the regex is a bit risky. I'll just do a simpler split
