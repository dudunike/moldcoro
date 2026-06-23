import re

css_content = """/* CSS simplificado */
.icon-carousel { display: flex; gap: 1rem; overflow-x: auto; scroll-snap-type: x mandatory; padding: 1rem 0; }
.icon-carousel img { width: 80px; height: 80px; object-fit: contain; flex-shrink: 0; scroll-snap-align: start; }
.imgbox__icon { width: 64px; height: 64px; object-fit: contain; margin: 1rem auto 0; }
.imgbox__icon-sm { width: 48px; height: 48px; object-fit: contain; margin: 1rem auto 0; }
.how-icon { width: 80px; height: 80px; object-fit: contain; margin: 1rem auto 0; }
.trust-icon { width: 64px; height: 64px; object-fit: contain; }
.plan__pay-img { width: 100%; max-width: 200px; margin: 1rem auto; display: block; object-fit: contain; }
.testimonial-title { font-size: 1rem; color: #3F3F3F; font-style: italic; font-weight: 500; }
"""

with open('/home/eduardo2e/Documents/Mold & Coro/style.css', 'a') as f:
    f.write(css_content)

html_faq = """
      <div class="acc-item"><button class="acc-trigger" aria-expanded="false" aria-controls="faq1" id="faq-btn1">Esses modelos servem para qualquer CNC?<span class="acc-icon" aria-hidden="true"></span></button><div class="acc-panel" id="faq1"><p>Sim. Os arquivos são compatíveis.</p></div></div>
      <div class="acc-item"><button class="acc-trigger" aria-expanded="false" aria-controls="faq2" id="faq-btn2">Os modelos já foram testados para corte e montagem?<span class="acc-icon" aria-hidden="true"></span></button><div class="acc-panel" id="faq2"><p>Sim. Todos os modelos foram pensados para encaixe funcional.</p></div></div>
      <div class="acc-item"><button class="acc-trigger" aria-expanded="false" aria-controls="faq3" id="faq-btn3">Posso fabricar e vender as luminárias livremente?<span class="acc-icon" aria-hidden="true"></span></button><div class="acc-panel" id="faq3"><p>Sim. O uso comercial é liberado.</p></div></div>
      <div class="acc-item"><button class="acc-trigger" aria-expanded="false" aria-controls="faq4" id="faq-btn4">Preciso saber desenhar ou mexer em software avançado?<span class="acc-icon" aria-hidden="true"></span></button><div class="acc-panel" id="faq4"><p>Não. Os arquivos já vêm prontos.</p></div></div>
      <div class="acc-item"><button class="acc-trigger" aria-expanded="false" aria-controls="faq5" id="faq-btn5">O acesso é imediato após a compra?<span class="acc-icon" aria-hidden="true"></span></button><div class="acc-panel" id="faq5"><p>Sim. O acesso à área de membros é liberado.</p></div></div>
      <div class="acc-item"><button class="acc-trigger" aria-expanded="false" aria-controls="faq6" id="faq-btn6">Vou receber instruções de montagem?<span class="acc-icon" aria-hidden="true"></span></button><div class="acc-panel" id="faq6"><p>Sim. Você recebe PDFs com passo a passo.</p></div></div>
      <div class="acc-item"><button class="acc-trigger" aria-expanded="false" aria-controls="faq7" id="faq-btn7">Esse catálogo serve para iniciantes?<span class="acc-icon" aria-hidden="true"></span></button><div class="acc-panel" id="faq7"><p>Ele foi criado para quem quer produzir para vender.</p></div></div>
      <div class="acc-item"><button class="acc-trigger" aria-expanded="false" aria-controls="faq8" id="faq-btn8">O acesso é vitalício ou tem mensalidade?<span class="acc-icon" aria-hidden="true"></span></button><div class="acc-panel" id="faq8"><p>O acesso é vitalício, sem mensalidade.</p></div></div>
      <div class="acc-item"><button class="acc-trigger" aria-expanded="false" aria-controls="faq9" id="faq-btn9">Como funciona a garantia vitalícia?<span class="acc-icon" aria-hidden="true"></span></button><div class="acc-panel" id="faq9"><p>Pode solicitar o reembolso a qualquer momento.</p></div></div>
"""

with open('/home/eduardo2e/Documents/Mold & Coro/index.html', 'r') as f:
    content = f.read()

# Replace FAQ section
content = re.sub(r'<div class="accordion">.*?</div>', f'<div class="accordion">{html_faq}</div>', content, flags=re.DOTALL)
with open('/home/eduardo2e/Documents/Mold & Coro/index.html', 'w') as f:
    f.write(content)

