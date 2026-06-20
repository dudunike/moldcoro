/* =============================================
   MOLDS&COROS — script.js  v3
   Sticky Header · Smooth Scroll · FAQ Accordion
   Scroll Reveal Animations (IntersectionObserver)
   ============================================= */

(function () {
  'use strict';

  var header = document.getElementById('site-header');

  /* ================================================
     1. STICKY HEADER — sombra ao scrollar
     ================================================ */
  window.addEventListener('scroll', function () {
    header.classList.toggle('is-scrolled', window.scrollY > 50);
  }, { passive: true });


  /* ================================================
     2. SMOOTH SCROLL — offset do header fixo
     ================================================ */
  document.querySelectorAll('a[href^="#"]').forEach(function (link) {
    link.addEventListener('click', function (e) {
      var id = this.getAttribute('href').replace('#', '');
      if (!id) return;
      var target = document.getElementById(id);
      if (!target) return;
      e.preventDefault();
      var offset = header ? header.offsetHeight + 8 : 8;
      window.scrollTo({ top: target.getBoundingClientRect().top + window.scrollY - offset, behavior: 'smooth' });
    });
  });


  /* ================================================
     3. FAQ ACCORDION — toggle classe is-open
     ================================================ */
  var triggers = document.querySelectorAll('.accordion-trigger');

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
     4. SCROLL REVEAL — animações conforme lead desce
     ================================================ */
  if (!('IntersectionObserver' in window)) return; // fallback para browsers antigos

  /* Mapa: seletor → classe de animação */
  var revealMap = [
    /* Cabeçalhos de seção — vêm de baixo */
    { sel: '.section-audience .section-header, .section-audience .section-lead',  cls: 'will-reveal' },
    { sel: '.section-problem .section-header, .section-how .section-header, .section-product .section-header', cls: 'will-reveal' },
    { sel: '.section-contents .section-header, .section-bonuses .section-header', cls: 'will-reveal' },
    { sel: '.section-lucrative .section-header, .section-forwhom .section-header', cls: 'will-reveal' },
    { sel: '.section-offer .section-header, .section-faq .section-header', cls: 'will-reveal' },
    { sel: '.section-cta-final h2, .section-cta-final p', cls: 'will-reveal' },

    /* Cards e grids — stagger controlado por index */
    { sel: '.section-audience .card',   cls: 'will-reveal',  stagger: 0.1 },
    { sel: '.section-contents .card',   cls: 'will-reveal',  stagger: 0.09 },
    { sel: '.section-lucrative .card',  cls: 'will-reveal',  stagger: 0.1 },
    { sel: '.bonus-card',               cls: 'will-reveal',  stagger: 0.12 },

    /* Passos — stagger */
    { sel: '.step',                     cls: 'will-reveal',  stagger: 0.1 },
    { sel: '.steps-forever-bar',        cls: 'will-reveal' },

    /* Seções de duas colunas — vêm das laterais */
    { sel: '.problem-text',             cls: 'will-reveal-left' },
    { sel: '.problem-visual',           cls: 'will-reveal-right' },
    { sel: '.product-visual',           cls: 'will-reveal-left' },
    { sel: '.product-content',          cls: 'will-reveal-right' },
    { sel: '.forwhom-yes',              cls: 'will-reveal-left' },
    { sel: '.forwhom-no',               cls: 'will-reveal-right' },
    { sel: '.offer-summary',            cls: 'will-reveal-left' },
    { sel: '.offer-cta',                cls: 'will-reveal-right' },
    { sel: '.cta-final-content',        cls: 'will-reveal-left' },
    { sel: '.cta-final-visual',         cls: 'will-reveal-right' },

    /* Elementos únicos da oferta */
    { sel: '.offer-forever-bar',        cls: 'will-reveal' },
    { sel: '.offer-delivery-box',       cls: 'will-reveal' },
    { sel: '.offer-summary-note',       cls: 'will-reveal' },

    /* Garantia */
    { sel: '.guarantee-inner',          cls: 'will-reveal' },

    /* FAQ — stagger leve */
    { sel: '.accordion-item',           cls: 'will-reveal', stagger: 0.07 },
    { sel: '.faq-cta',                  cls: 'will-reveal' },

    /* Bônus note */
    { sel: '.bonus-note',               cls: 'will-reveal' },
  ];

  /* Aplica classes e delays de stagger */
  revealMap.forEach(function (entry) {
    document.querySelectorAll(entry.sel).forEach(function (el, i) {
      if (el.closest('.section-hero')) return; // hero já anima via CSS
      if (el.classList.contains('will-reveal') ||
          el.classList.contains('will-reveal-left') ||
          el.classList.contains('will-reveal-right')) return; // evita duplicar

      el.classList.add(entry.cls);
      if (entry.stagger) {
        el.style.setProperty('--reveal-delay', (i * entry.stagger) + 's');
      }
    });
  });

  /* Intersection Observer — dispara animação quando o elemento entra na tela */
  var io = new IntersectionObserver(function (entries) {
    entries.forEach(function (entry) {
      if (entry.isIntersecting) {
        entry.target.classList.add('revealed');
        io.unobserve(entry.target); // anima uma única vez
      }
    });
  }, {
    threshold: 0.12,
    rootMargin: '0px 0px -40px 0px'  /* dispara um pouco antes de chegar na borda */
  });

  document.querySelectorAll('.will-reveal, .will-reveal-left, .will-reveal-right')
    .forEach(function (el) { io.observe(el); });


  /* ================================================
     5. STICKY CTA BAR — aparece ao chegar na oferta e fica permanente
     ================================================ */
  var stickyCta = document.getElementById('sticky-cta-bar');
  if (stickyCta) {
    var offerSection = document.getElementById('comprar');
    var stickyObserver = new IntersectionObserver(function (entries, obs) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) {
          stickyCta.classList.add('visible');
          stickyCta.removeAttribute('aria-hidden');
          obs.disconnect(); // lead viu a oferta — mantém CTA para sempre
        }
      });
    }, { threshold: 0.1 });

    if (offerSection) stickyObserver.observe(offerSection);
  }

})();
