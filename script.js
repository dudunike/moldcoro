(function () {
  'use strict';

  /* ================================================
     1. HEADER — sombra ao scrollar
     ================================================ */
  var header = document.getElementById('site-header');
  window.addEventListener('scroll', function () {
    header.classList.toggle('scrolled', window.scrollY > 40);
  }, { passive: true });


  /* ================================================
     2. SMOOTH SCROLL — offset fixo
     ================================================ */
  document.querySelectorAll('a[href^="#"]').forEach(function (link) {
    link.addEventListener('click', function (e) {
      var id = this.getAttribute('href').replace('#', '');
      if (!id) return;
      var target = document.getElementById(id);
      if (!target) return;
      e.preventDefault();
      var offset = (header ? header.offsetHeight : 60) + 10;
      window.scrollTo({
        top: target.getBoundingClientRect().top + window.scrollY - offset,
        behavior: 'smooth'
      });
    });
  });


  /* ================================================
     3. FAQ ACCORDION
     ================================================ */
  var triggers = document.querySelectorAll('.acc-trigger');
  triggers.forEach(function (trigger) {
    trigger.addEventListener('click', function () {
      var isOpen = this.getAttribute('aria-expanded') === 'true';
      var panel  = document.getElementById(this.getAttribute('aria-controls'));

      triggers.forEach(function (t) {
        t.setAttribute('aria-expanded', 'false');
        var p = document.getElementById(t.getAttribute('aria-controls'));
        if (p) p.classList.remove('is-open');
      });

      if (!isOpen) {
        this.setAttribute('aria-expanded', 'true');
        if (panel) panel.classList.add('is-open');
      }
    });
  });


  /* ================================================
     4. COUNTDOWN — conta até meia-noite
     ================================================ */
  var cntH = document.getElementById('cnt-h');
  var cntM = document.getElementById('cnt-m');
  var cntS = document.getElementById('cnt-s');

  if (cntH && cntM && cntS) {
    var midnight = new Date();
    midnight.setHours(24, 0, 0, 0);

    function tick() {
      var diff = midnight - Date.now();
      if (diff < 0) diff = 0;
      cntH.textContent = String(Math.floor(diff / 3600000)).padStart(2, '0');
      cntM.textContent = String(Math.floor((diff % 3600000) / 60000)).padStart(2, '0');
      cntS.textContent = String(Math.floor((diff % 60000) / 1000)).padStart(2, '0');
    }
    tick();
    setInterval(tick, 1000);
  }


  /* ================================================
     6. FOOTER — ano dinâmico
     ================================================ */
  var copyEl = document.getElementById('footer-copy');
  if (copyEl) {
    copyEl.textContent = 'Copyright © ' + new Date().getFullYear() + ' Molds&Coros';
  }

})();
