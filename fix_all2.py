import re

with open('/home/eduardo2e/Documents/Mold & Coro/style.css', 'r') as f:
    css = f.read()

# Fix carousel quality
css = re.sub(r'\.models-carousel img \{[^}]*\}', '.models-carousel img { height: 260px; width: auto; max-width: 90vw; object-fit: contain; flex-shrink: 0; scroll-snap-align: center; border-radius: 8px; }', css)

with open('/home/eduardo2e/Documents/Mold & Coro/style.css', 'w') as f:
    f.write(css)

# Fix JS auto-scroll
with open('/home/eduardo2e/Documents/Mold & Coro/script.js', 'r') as f:
    js = f.read()

auto_scroll_js = """
  /* ================================================
     7. CAROUSEL AUTO-SCROLL
     ================================================ */
  var carousel = document.querySelector('.models-carousel');
  if (carousel) {
    setInterval(function() {
      if (carousel.scrollLeft + carousel.clientWidth >= carousel.scrollWidth - 10) {
        carousel.scrollTo({ left: 0, behavior: 'smooth' });
      } else {
        carousel.scrollBy({ left: 300, behavior: 'smooth' });
      }
    }, 2500);
  }
"""

if "CAROUSEL AUTO-SCROLL" not in js:
    js = js.replace('})();', auto_scroll_js + '\n})();')
    with open('/home/eduardo2e/Documents/Mold & Coro/script.js', 'w') as f:
        f.write(js)

# Fix HTML scripts & images
with open('/home/eduardo2e/Documents/Mold & Coro/index.html', 'r') as f:
    html = f.read()

scripts = """
  <script src="https://cdn.utmify.com.br/scripts/utms/latest.js" data-utmify-prevent-xcod-sck data-utmify-prevent-subids async defer></script>
  <!-- Utmify Pixel -->
  <script>
    window.pixelId = "6a36bfa83292ebaf92f0ccef";
    var a=document.createElement("script");
    a.setAttribute("src","https://cdn.utmify.com.br/scripts/pixel/pixel.js");
    document.head.appendChild(a);
  </script>
  <!-- Meta Pixel -->
  <script>
  !function(f,b,e,v,n,t,s){if(f.fbq)return;n=f.fbq=function(){n.callMethod?
  n.callMethod.apply(n,arguments):n.queue.push(arguments)};if(!f._fbq)f._fbq=n;
  n.push=n;n.loaded=!0;n.version='2.0';n.queue=[];t=b.createElement(e);t.async=!0;
  t.src=v;s=b.getElementsByTagName(e)[0];s.parentNode.insertBefore(t,s)}(window,
  document,'script','https://connect.facebook.net/en_US/fbevents.js');
  fbq('init','1202995118619295');fbq('track','PageView');
  </script>
  <noscript><img height="1" width="1" style="display:none"
    src="https://www.facebook.com/tr?id=1202995118619295&ev=PageView&noscript=1"
  /></noscript>
"""

if "utmify" not in html:
    html = html.replace('</head>', scripts + '</head>')

# Update images to img22 based on the user's recent upload.
html = html.replace('<img src="img/bonus_impressao.jpg" loading="lazy" class="bonus-card__img" />', '<img src="img22/2026-06-22_21-32.png" loading="lazy" class="bonus-card__img" />')
html = html.replace('<img src="img/bonus_lista_materiais.jpg" loading="lazy" class="bonus-card__img" />', '<img src="img22/2026-06-22_21-32_1.png" loading="lazy" class="bonus-card__img" />')
html = html.replace('<img src="img/bonus_capa.jpg" loading="lazy" class="bonus-card__img" />', '<img src="img22/2026-06-22_21-33.png" loading="lazy" class="bonus-card__img" />')
html = html.replace('<img src="img/kit_bonus_capa.jpg" loading="lazy" class="bonus-card__img" />', '<img src="img22/2026-06-22_21-33_1.png" loading="lazy" class="bonus-card__img" />')

with open('/home/eduardo2e/Documents/Mold & Coro/index.html', 'w') as f:
    f.write(html)
