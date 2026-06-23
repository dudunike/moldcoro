import re

# Fix CSS
with open('/home/eduardo2e/Documents/Mold & Coro/style.css', 'r') as f:
    css = f.read()

pulse_css = """
@keyframes pulse-green {
  0% { transform: scale(1); box-shadow: 0 0 0 0 rgba(57, 181, 116, 0.7); }
  70% { transform: scale(1.05); box-shadow: 0 0 0 10px rgba(57, 181, 116, 0); }
  100% { transform: scale(1); box-shadow: 0 0 0 0 rgba(57, 181, 116, 0); }
}
.btn--green {
  background: #39B574 !important;
  color: #fff !important;
  border-radius: 8px !important;
  animation: pulse-green 2s infinite;
  box-shadow: 0 4px 15px rgba(57, 181, 116, 0.4);
}
.btn--green:hover {
  filter: brightness(1.1);
}
.models-carousel { display: flex; gap: 1rem; overflow-x: auto; scroll-snap-type: x mandatory; padding: 1rem 0; }
.models-carousel img { width: 220px; height: 200px; object-fit: cover; flex-shrink: 0; scroll-snap-align: start; border-radius: 10px; }
"""

# replace old .btn--green
css = re.sub(r'\.btn--green\s*\{[^}]*\}', '', css)
css = re.sub(r'\.btn--green:hover\s*\{[^}]*\}', '', css)
css += pulse_css

with open('/home/eduardo2e/Documents/Mold & Coro/style.css', 'w') as f:
    f.write(css)


# Fix HTML
with open('/home/eduardo2e/Documents/Mold & Coro/index.html', 'r') as f:
    html = f.read()

# Fix hero text
html = html.replace('<h2 class="hero-subh">', '<h2 class="hero-subh color-white">')
html = html.replace('<p class="hero-sub">', '<p class="hero-sub color-white-70">')

# Fix models carousel
old_carousel = """    <div class="icon-carousel mt-2">
      <img src="https://centraleduca.com.br/wp-content/uploads/2026/01/laser.png" alt="Icon" />
      <img src="https://centraleduca.com.br/wp-content/uploads/2026/01/scale.png" alt="Icon" />
      <img src="https://centraleduca.com.br/wp-content/uploads/2026/01/manual-book.png" alt="Icon" />
      <img src="https://centraleduca.com.br/wp-content/uploads/2026/01/folders-1.png" alt="Icon" />
    </div>"""

new_carousel = """    <div class="models-carousel mt-2">
      <img src="img/molde_canivete_m.jpg" alt="Porta-Canivete Tam M" />
      <img src="img/molde_canivete_p.jpg" alt="Porta-Canivete Tam G" />
      <img src="img/molde_cartao.jpg" alt="Porta-Cartão" />
      <img src="img/produto_bolsa_sela.jpg" alt="Bolsa Lateral" />
      <img src="img/produto_celular_sela.jpg" alt="Porta-Celular" />
    </div>"""

html = html.replace(old_carousel, new_carousel)

with open('/home/eduardo2e/Documents/Mold & Coro/index.html', 'w') as f:
    f.write(html)
