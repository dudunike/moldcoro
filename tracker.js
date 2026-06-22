/* =============================================
   MOLDS&COROS — tracker.js
   Usa tabela chaves_events (já existente no Supabase)
   Filtra por meta.source = 'moldscoros'
   ============================================= */

(function () {
  'use strict';

  if (typeof SUPABASE_URL === 'undefined' || typeof SUPABASE_ANON === 'undefined') return;

  var sb = window.supabase
    ? window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON)
    : null;
  if (!sb) return;

  /* ---- Sessão única por aba ---- */
  var sessionId = sessionStorage.getItem('mc_sid');
  if (!sessionId) {
    sessionId = 'mc_' + Date.now() + '_' + Math.random().toString(36).slice(2, 9);
    sessionStorage.setItem('mc_sid', sessionId);
  }

  function getDevice() {
    var w = window.innerWidth;
    if (w < 768) return 'mobile';
    if (w < 1024) return 'tablet';
    return 'desktop';
  }

  var currentSection = 'hero';
  var maxScroll      = 0;
  var pageStart      = Date.now();

  /* ---- Inserir evento (schema chaves_events) ---- */
  function track(type, data) {
    var payload = Object.assign({ source: 'moldscoros' }, data || {});
    sb.from('chaves_events').insert({
      session_id: sessionId,
      type:       type,      /* coluna: type (não event_type) */
      meta:       payload    /* coluna: meta (não data) */
    }).then(function () {}).catch(function () {});
  }

  /* ---- 1. Page View ---- */
  track('page_view', {
    referrer:    document.referrer || 'direto',
    device:      getDevice(),
    landing_url: location.href
  });

  /* ---- 2. Seção visível ---- */
  var sectionIds = [
    'hero', 'section-proof', 'section-contents', 'comprar', 'section-faq'
  ];

  if ('IntersectionObserver' in window) {
    var obs = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        if (e.isIntersecting) currentSection = e.target.id || e.target.className.split(' ')[0];
      });
    }, { threshold: 0.3 });

    sectionIds.forEach(function (id) {
      var el = document.getElementById(id) || document.querySelector('.' + id);
      if (el) obs.observe(el);
    });
  }

  /* ---- 3. Scroll milestones ---- */
  var scrollReached = {};
  window.addEventListener('scroll', function () {
    var docH = document.documentElement.scrollHeight - window.innerHeight;
    var pct  = docH > 0 ? Math.round((window.scrollY / docH) * 100) : 0;
    if (pct > maxScroll) maxScroll = pct;

    [25, 50, 75, 90, 100].forEach(function (m) {
      if (!scrollReached[m] && pct >= m) {
        scrollReached[m] = true;
        track('scroll', { depth: m, section: currentSection });
      }
    });
  }, { passive: true });

  /* ---- 4. Cliques ---- */
  document.addEventListener('click', function (e) {
    var target = e.target.closest('a, button, [data-track]') || e.target;
    var xPct   = Math.round((e.pageX / document.documentElement.scrollWidth)  * 100);
    var yPct   = Math.round((e.pageY / document.documentElement.scrollHeight) * 100);

    if (target.classList && target.classList.contains('btn')) {
      track('cta_click', {
        button_text: (target.textContent || '').trim().slice(0, 80),
        section: currentSection, href: target.getAttribute('href') || '',
        x_pct: xPct, y_pct: yPct
      });
    } else {
      track('click', {
        element: (target.tagName || '').toLowerCase(),
        text:    (target.textContent || '').trim().slice(0, 60),
        section: currentSection, x_pct: xPct, y_pct: yPct
      });
    }
  }, { passive: true });

  /* ---- 5. Saída ---- */
  function sendExit() {
    track('exit', {
      time_on_page: Math.round((Date.now() - pageStart) / 1000),
      max_scroll:   maxScroll,
      last_section: currentSection
    });
  }
  window.addEventListener('beforeunload', sendExit);
  document.addEventListener('visibilitychange', function () {
    if (document.visibilityState === 'hidden') sendExit();
  });

})();
