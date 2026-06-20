/* =============================================
   MOLDS&COROS — admin.js
   Usa tabela chaves_events filtrada por meta->>'source' = 'moldscoros'
   Autenticação local (senha hash SHA-256)
   ============================================= */

'use strict';

/* ---- Supabase com anon key + sessão autenticada ---- */
var sb = supabase.createClient(SUPABASE_URL, SUPABASE_ANON);

/* ---- Estado global ---- */
var currentSection = 'overview';
var periodDays     = 7;
var dateFrom       = null;
var dateTo         = null;

/* ---- Filtro de origem para não misturar com outros projetos ---- */
var SRC_FILTER = 'moldscoros';

/* =============================================
   AUTENTICAÇÃO VIA SUPABASE AUTH
   ============================================= */
sb.auth.getSession().then(function (result) {
  if (!result.data || !result.data.session) {
    window.location.href = '/admin/index.html';
    return;
  }
  loadAllData();
});

document.getElementById('btnLogout').addEventListener('click', async function () {
  await sb.auth.signOut();
  window.location.href = '/admin/index.html';
});

/* =============================================
   NAVEGAÇÃO
   ============================================= */
var sectionTitles = {
  overview: 'Dashboard',        funnel:  'Funil de Conversão',
  heatmap:  'Mapa de Calor',    traffic: 'Tráfego e Origens',
  devices:  'Dispositivos',     settings: 'Pixel & Analytics',
  sales:    'Vendas & Receita', webhook: 'Webhook de Vendas',
  manage:   'Gerenciar Dados'
};

document.querySelectorAll('.nav-item').forEach(function (item) {
  item.addEventListener('click', function () { switchSection(this.dataset.section); });
});

function switchSection(sec) {
  currentSection = sec;
  document.querySelectorAll('.nav-item').forEach(function (i) { i.classList.remove('active'); });
  document.querySelector('[data-section="' + sec + '"]').classList.add('active');
  document.querySelectorAll('.page-section').forEach(function (s) { s.classList.remove('active'); });
  document.getElementById('section-' + sec).classList.add('active');
  document.getElementById('topbarTitle').textContent = sectionTitles[sec] || 'Dashboard';
  if (sec === 'heatmap') renderHeatmap();
  if (sec === 'manage')  loadDataStats();
  if (sec === 'sales')   loadSalesData();
  if (sec === 'webhook') loadWebhookSettings();
}

/* =============================================
   FILTRO DE PERÍODO
   ============================================= */
document.querySelectorAll('.period-tab').forEach(function (tab) {
  tab.addEventListener('click', function () {
    document.querySelectorAll('.period-tab').forEach(function (t) { t.classList.remove('active'); });
    this.classList.add('active');
    var period = this.dataset.period;
    if (period === 'custom') {
      document.getElementById('customRange').style.display = 'flex';
    } else {
      document.getElementById('customRange').style.display = 'none';
      periodDays = parseInt(period, 10);
      dateFrom = null; dateTo = null;
      loadAllData();
    }
  });
});

document.getElementById('applyRange').addEventListener('click', function () {
  var from = document.getElementById('dateFrom').value;
  var to   = document.getElementById('dateTo').value;
  if (!from || !to) { showToast('Selecione as duas datas.', 'error'); return; }
  dateFrom = from; dateTo = to; periodDays = null;
  loadAllData();
});

document.getElementById('btnRefresh').addEventListener('click', loadAllData);

function getDateFilter() {
  if (dateFrom && dateTo) {
    return { gte: dateFrom + 'T00:00:00Z', lte: dateTo + 'T23:59:59Z' };
  }
  var now   = new Date();
  var start = new Date(now);
  start.setDate(start.getDate() - (periodDays - 1));
  start.setHours(0, 0, 0, 0);
  return { gte: start.toISOString(), lte: now.toISOString() };
}

/* =============================================
   QUERY BASE — sempre filtra por source=moldscoros
   Coluna: type (=event_type), meta (=data), created_at (=timestamp)
   ============================================= */
function query(types, df) {
  /* Supabase REST não suporta operador JSONB ->>, usamos ilike em meta texto */
  /* Filtramos no JS após receber os resultados (mais simples e confiável) */
  var q = sb.from('chaves_events')
    .select('id, session_id, type, meta, created_at')
    .gte('created_at', df.gte)
    .lte('created_at', df.lte);

  if (types && types.length === 1) q = q.eq('type', types[0]);
  if (types && types.length > 1)   q = q.in('type', types);

  return q.then(function (res) {
    /* Filtrar apenas eventos de moldscoros */
    if (!res.data) return res;
    res.data = res.data.filter(function (e) {
      return e.meta && e.meta.source === SRC_FILTER;
    });
    return res;
  });
}

/* =============================================
   CARREGAR TODOS OS DADOS
   ============================================= */
function loadAllData() {
  loadOverviewMetrics();
  loadSalesOverview();
  loadFunnelData();
  loadClicksBySection();
  loadReferrers();
  loadScrollDepth();
  loadDevices();
  if (currentSection === 'heatmap') renderHeatmap();
  if (currentSection === 'manage')  loadDataStats();
  if (currentSection === 'sales')   loadSalesData();
  if (currentSection === 'webhook') loadWebhookSettings();
}

/* =============================================
   OVERVIEW
   ============================================= */
function loadOverviewMetrics() {
  var df = getDateFilter();

  query(['page_view', 'cta_click', 'exit'], df).then(function (res) {
    if (!res.data) return;
    var events   = res.data;
    var sessions = new Set(events.map(function (e) { return e.session_id; }));
    var views    = events.filter(function (e) { return e.type === 'page_view'; });
    var ctas     = events.filter(function (e) { return e.type === 'cta_click'; });
    var exits    = events.filter(function (e) { return e.type === 'exit'; });

    var uniqueSess = sessions.size;
    var ctaSess    = new Set(ctas.map(function (e) { return e.session_id; })).size;
    var convRate   = uniqueSess > 0 ? ((ctaSess / uniqueSess) * 100).toFixed(1) : '0.0';

    setText('statSessions',   uniqueSess);
    setText('statViews',      views.length);
    setText('statConversion', convRate + '%');
    setText('statCtaClicks',  ctas.length);

    if (exits.length) {
      var avgTime   = Math.round(exits.reduce(function (a, e) { return a + ((e.meta && e.meta.time_on_page) || 0); }, 0) / exits.length);
      var avgScroll = Math.round(exits.reduce(function (a, e) { return a + ((e.meta && e.meta.max_scroll)   || 0); }, 0) / exits.length);
      setText('statAvgTime',   formatSeconds(avgTime));
      setText('statAvgScroll', avgScroll + '%');
    } else {
      setText('statAvgTime', '—'); setText('statAvgScroll', '—');
    }
  });
}

/* =============================================
   FUNIL
   ============================================= */
var FUNNEL_STEPS = [
  { key: 'hero',              label: 'Hero (entrada)' },
  { key: 'section-audience',  label: 'Para quem é' },
  { key: 'section-problem',   label: 'O problema' },
  { key: 'section-how',       label: 'Como funciona' },
  { key: 'section-product',   label: 'O produto' },
  { key: 'section-contents',  label: 'O que vem no kit' },
  { key: 'section-bonuses',   label: 'Bônus' },
  { key: 'section-lucrative', label: 'Por que é lucrativo' },
  { key: 'section-forwhom',   label: 'Para quem' },
  { key: 'comprar',           label: 'Oferta (COMPRAR)' },
  { key: 'section-faq',       label: 'FAQ' },
  { key: 'section-cta-final', label: 'CTA Final' },
];

function loadFunnelData() {
  var df = getDateFilter();

  Promise.all([
    query(['scroll', 'cta_click', 'exit'], df),
    query(['page_view'], df)
  ]).then(function (results) {
    var events   = results[0].data || [];
    var pvEvents = results[1].data || [];
    var totalSess = new Set(pvEvents.map(function (e) { return e.session_id; })).size;

    if (totalSess === 0) {
      var empty = '<div class="empty-state"><div class="empty-icon">📊</div><p>Nenhuma visita no período.</p></div>';
      setHTML('overviewFunnel', empty); setHTML('fullFunnel', empty); return;
    }

    var sectionSess = {};
    events.forEach(function (e) {
      var sec = null;
      if (e.type === 'scroll' && e.meta && e.meta.section) sec = e.meta.section;
      if (e.type === 'exit'   && e.meta && e.meta.last_section) sec = e.meta.last_section;
      if (sec) {
        if (!sectionSess[sec]) sectionSess[sec] = new Set();
        sectionSess[sec].add(e.session_id);
      }
    });

    var ctaSess = new Set(events.filter(function (e) { return e.type === 'cta_click'; }).map(function (e) { return e.session_id; }));

    var rows = FUNNEL_STEPS.map(function (step) {
      var count = (sectionSess[step.key] || new Set()).size;
      return { label: step.label, count: count, pct: Math.round((count / totalSess) * 100) };
    });
    rows.push({ label: '✓ Clicou em Comprar', count: ctaSess.size, pct: Math.round((ctaSess.size / totalSess) * 100), isCta: true });

    renderFunnel('overviewFunnel', rows, totalSess, true);
    renderFunnel('fullFunnel',     rows, totalSess, false);
  });
}

function renderFunnel(elId, rows, total, mini) {
  var limit = mini ? 6 : rows.length;
  var html  = '<div style="font-size:0.8rem;color:var(--text-muted);margin-bottom:1rem">Base: ' + total + ' visitantes</div>';
  rows.slice(0, limit).forEach(function (row) {
    html += '<div class="funnel-row' + (row.isCta ? ' highlight' : '') + '">';
    html += '<span class="funnel-label">' + row.label + '</span>';
    html += '<div class="funnel-bar-wrap"><div class="funnel-bar" style="width:' + row.pct + '%"></div></div>';
    html += '<span class="funnel-pct">' + row.pct + '%</span>';
    html += '<span class="funnel-count">' + row.count + '</span></div>';
  });
  if (mini && rows.length > limit) {
    html += '<div style="font-size:0.8rem;margin-top:0.75rem;cursor:pointer;color:var(--gold)" onclick="switchSection(\'funnel\')">Ver funil completo →</div>';
  }
  setHTML(elId, html);
}

/* =============================================
   CLIQUES POR SEÇÃO
   ============================================= */
function loadClicksBySection() {
  var df = getDateFilter();
  query(['click', 'cta_click'], df).then(function (res) {
    if (!res.data || !res.data.length) {
      setHTML('clicksBySection', '<div class="empty-state"><p>Sem cliques no período.</p></div>'); return;
    }
    var counts = {};
    res.data.forEach(function (e) {
      var sec = (e.meta && e.meta.section) || 'desconhecido';
      counts[sec] = (counts[sec] || 0) + 1;
    });
    var sorted = Object.entries(counts).sort(function (a, b) { return b[1] - a[1]; }).slice(0, 10);
    var max    = sorted[0][1];
    var html   = sorted.map(function (item) {
      var pct = Math.round((item[1] / max) * 100);
      return '<div class="section-click-row"><span class="sc-label">' + item[0] + '</span>' +
             '<div class="sc-bar-wrap"><div class="sc-bar" style="width:' + pct + '%"></div></div>' +
             '<span class="sc-count">' + item[1] + '</span></div>';
    }).join('');
    setHTML('clicksBySection', html);
  });
}

/* =============================================
   REFERRERS
   ============================================= */
function loadReferrers() {
  var df = getDateFilter();
  query(['page_view'], df).then(function (res) {
    if (!res.data || !res.data.length) {
      setHTML('referrerPanel', '<div class="empty-state"><p>Sem dados.</p></div>');
      setHTML('trafficReferrers', '<div class="empty-state"><p>Sem dados.</p></div>'); return;
    }
    var counts = {};
    res.data.forEach(function (e) {
      var label = parseReferrer((e.meta && e.meta.referrer) || 'Direto');
      counts[label] = (counts[label] || 0) + 1;
    });
    var total  = res.data.length;
    var sorted = Object.entries(counts).sort(function (a, b) { return b[1] - a[1]; });
    var html   = sorted.map(function (item) {
      var pct = ((item[1] / total) * 100).toFixed(1);
      return '<div class="referrer-row"><span class="referrer-label">' + item[0] + '</span>' +
             '<span class="referrer-count">' + item[1] + '</span><span class="referrer-pct">' + pct + '%</span></div>';
    }).join('');
    setHTML('referrerPanel', html);
    setHTML('trafficReferrers', html);
  });
}

function parseReferrer(ref) {
  if (!ref || ref === 'direto' || ref === 'Direto' || ref === '') return 'Direto';
  if (ref.includes('google'))    return 'Google';
  if (ref.includes('facebook') || ref.includes('fb.com')) return 'Facebook';
  if (ref.includes('instagram')) return 'Instagram';
  if (ref.includes('whatsapp'))  return 'WhatsApp';
  if (ref.includes('youtube'))   return 'YouTube';
  if (ref.includes('tiktok'))    return 'TikTok';
  try { return new URL(ref).hostname; } catch (e) { return ref.slice(0, 30); }
}

/* =============================================
   SCROLL DEPTH
   ============================================= */
function loadScrollDepth() {
  var df = getDateFilter();
  query(['scroll'], df).then(function (res) {
    if (!res.data || !res.data.length) {
      setHTML('scrollDepthPanel', '<div class="empty-state"><p>Sem dados.</p></div>'); return;
    }
    var depths = { 25: 0, 50: 0, 75: 0, 90: 0, 100: 0 };
    res.data.forEach(function (e) {
      var d = e.meta && e.meta.depth;
      if (depths[d] !== undefined) depths[d]++;
    });
    var max  = Math.max.apply(null, Object.values(depths));
    var html = Object.entries(depths).map(function (item) {
      var pct = max > 0 ? Math.round((item[1] / max) * 100) : 0;
      return '<div class="section-click-row"><span class="sc-label">Scroll ' + item[0] + '%</span>' +
             '<div class="sc-bar-wrap"><div class="sc-bar" style="width:' + pct + '%"></div></div>' +
             '<span class="sc-count">' + item[1] + '</span></div>';
    }).join('');
    setHTML('scrollDepthPanel', html);
  });
}

/* =============================================
   DISPOSITIVOS
   ============================================= */
function loadDevices() {
  var df = getDateFilter();
  query(['page_view'], df).then(function (res) {
    if (!res.data || !res.data.length) {
      setHTML('devicesPanel', '<div class="empty-state"><p>Sem dados.</p></div>'); return;
    }
    var counts = { mobile: 0, tablet: 0, desktop: 0 };
    res.data.forEach(function (e) {
      var d = (e.meta && e.meta.device) || 'desktop';
      if (counts[d] !== undefined) counts[d]++;
    });
    var total   = res.data.length;
    var colors  = { mobile: '#3b82f6', tablet: '#a855f7', desktop: '#22c55e' };
    var labels  = { mobile: 'Mobile', tablet: 'Tablet', desktop: 'Desktop' };
    var entries = Object.entries(counts).filter(function (e) { return e[1] > 0; });

    var circumference = 2 * Math.PI * 35;
    var offset = 0;
    var slices = entries.map(function (item) {
      var frac    = item[1] / total;
      var dashArr = (frac * circumference).toFixed(2);
      var dashOff = (-offset).toFixed(2);
      var slice   = '<circle cx="50" cy="50" r="35" fill="none" stroke="' + colors[item[0]] +
                    '" stroke-width="14" stroke-dasharray="' + dashArr + ' ' + (circumference - frac * circumference).toFixed(2) +
                    '" stroke-dashoffset="' + dashOff + '" />';
      offset += frac * circumference;
      return slice;
    }).join('');

    var legend = entries.map(function (item) {
      return '<div class="device-item"><div class="device-dot" style="background:' + colors[item[0]] + '"></div>' +
             '<span>' + labels[item[0]] + '</span><strong style="margin-left:auto">' + ((item[1]/total*100).toFixed(1)) + '%</strong></div>';
    }).join('');

    setHTML('devicesPanel',
      '<div class="device-chart-wrap">' +
      '<div class="device-donut"><svg viewBox="0 0 100 100">' + slices + '</svg></div>' +
      '<div class="device-legend">' + legend + '</div></div>');
  });
}

/* =============================================
   HEATMAP
   ============================================= */
function renderHeatmap() {
  var df = getDateFilter();
  query(['click', 'cta_click'], df).then(function (res) {
    if (!res.data || !res.data.length) {
      document.getElementById('heatmapInfo').textContent = 'Sem dados de clique no período.'; return;
    }
    var clicks = res.data.filter(function (e) { return e.meta && e.meta.x_pct !== undefined; })
                         .map(function (e) { return { x: e.meta.x_pct, y: e.meta.y_pct }; });

    document.getElementById('heatmapInfo').textContent = clicks.length + ' cliques registrados';

    var mock   = document.getElementById('heatmapMock');
    var canvas = document.getElementById('heatmapCanvas');
    canvas.width  = mock.offsetWidth;
    canvas.height = mock.offsetHeight;
    var ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    clicks.forEach(function (c) {
      var cx = (c.x / 100) * canvas.width;
      var cy = (c.y / 100) * canvas.height;
      var r  = Math.max(canvas.width * 0.08, 20);
      var g  = ctx.createRadialGradient(cx, cy, 0, cx, cy, r);
      g.addColorStop(0,   'rgba(255,50,0,0.35)');
      g.addColorStop(0.4, 'rgba(255,180,0,0.18)');
      g.addColorStop(1,   'rgba(0,80,255,0)');
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.arc(cx, cy, r, 0, Math.PI * 2);
      ctx.fill();
    });
  });
}

/* =============================================
   GERENCIAR DADOS
   ============================================= */
function loadDataStats() {
  var df = getDateFilter();
  sb.from('chaves_events').select('id', { count: 'exact', head: true })
    .then(function (total) {
      query(null, df).then(function (period) {
        var html = '<div style="display:grid;grid-template-columns:1fr 1fr;gap:1rem">' +
          '<div><div class="metric-label">Eventos Molds&amp;Coros (período)</div>' +
          '<div class="metric-value" style="font-size:1.5rem">' + (period.data ? period.data.length : 0) + '</div></div>' +
          '</div>';
        setHTML('dataStats', html);
      });
    });
}

document.getElementById('btnDeletePeriod').addEventListener('click', function () {
  var df = getDateFilter();
  openModal('Apagar métricas do período',
    'Serão apagados todos os eventos Molds&Coros do período selecionado. Esta ação não pode ser desfeita.',
    null, function () {
      query(null, df).then(function (res) {
        if (!res.data || !res.data.length) { closeModal(); showToast('Nenhum dado no período.', 'error'); return; }
        var ids = res.data.map(function (e) { return e.id; });
        sb.from('chaves_events').delete().in('id', ids).then(function (del) {
          closeModal();
          if (del.error) { showToast('Erro: ' + del.error.message, 'error'); return; }
          showToast('Métricas do período apagadas.', 'success');
          loadDataStats(); loadAllData();
        });
      });
    });
});

document.getElementById('btnDeleteAll').addEventListener('click', function () {
  openModal('⚠️ Apagar TODAS as métricas Molds&Coros',
    'Todos os dados de analytics desta landing page serão apagados. Digite <strong>CONFIRMAR</strong> para prosseguir:',
    'CONFIRMAR', function () {
      /* Buscar todos os IDs de moldscoros (sem filtro de data) */
      sb.from('chaves_events').select('id, meta')
        .then(function (res) {
          var ids = (res.data || [])
            .filter(function (e) { return e.meta && e.meta.source === SRC_FILTER; })
            .map(function (e) { return e.id; });
          if (!ids.length) { closeModal(); showToast('Nenhum dado encontrado.', 'error'); return; }
          sb.from('chaves_events').delete().in('id', ids).then(function (del) {
            closeModal();
            if (del.error) { showToast('Erro: ' + del.error.message, 'error'); return; }
            showToast('Todos os dados apagados.', 'success');
            loadDataStats(); loadAllData();
          });
        });
    });
});

/* =============================================
   MODAL
   ============================================= */
var modalCallback = null;

function openModal(title, body, confirmWord, callback) {
  document.getElementById('modalTitle').textContent = title;
  document.getElementById('modalBody').innerHTML    = body;
  modalCallback = callback;
  var inp = document.getElementById('modalConfirmInput');
  var btn = document.getElementById('modalConfirm');
  if (confirmWord) {
    inp.style.display = 'block'; inp.value = '';
    inp.placeholder = 'Digite: ' + confirmWord;
    btn.disabled = true;
    inp.oninput = function () { btn.disabled = (inp.value.trim() !== confirmWord); };
  } else {
    inp.style.display = 'none'; btn.disabled = false;
  }
  document.getElementById('modalOverlay').classList.add('open');
}

function closeModal() {
  document.getElementById('modalOverlay').classList.remove('open');
  modalCallback = null;
}

document.getElementById('modalCancel').addEventListener('click', closeModal);
document.getElementById('modalConfirm').addEventListener('click', function () { if (modalCallback) modalCallback(); });
document.getElementById('modalOverlay').addEventListener('click', function (e) { if (e.target === this) closeModal(); });

/* =============================================
   TOAST
   ============================================= */
var toastTimer = null;
function showToast(msg, type) {
  var el = document.getElementById('toast');
  el.textContent = msg;
  el.className = 'toast ' + (type || 'success');
  el.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(function () { el.classList.remove('show'); }, 3500);
}

/* =============================================
   VENDAS — OVERVIEW (cards no topo do dashboard)
   ============================================= */
function loadSalesOverview() {
  var df = getDateFilter();
  query(['sale'], df).then(function (res) {
    var sales = res.data || [];
    renderSalesCards(sales, {
      total:    'statRevTotal',  totalQty:    'statRevSales',
      main:     'statRevMain',   mainQty:     'statRevMainQty',   /* não existe no overview, ok ignorar */
      bump:     'statRevBump',   bumpQty:     'statRevBumpQty',
      upsell:   'statRevUpsell', upsellQty:   'statRevUpsellQty',
      downsell: 'statRevDownsell', downsellQty: 'statRevDownsellQty',
      avg:      'statAvgTicket'
    });

    /* Conversão real em venda */
    query(['page_view'], df).then(function (pvRes) {
      var visitors = new Set((pvRes.data || []).map(function (e) { return e.session_id; })).size;
      var buyers   = new Set(sales.map(function (e) { return e.session_id; })).size;
      var conv     = visitors > 0 ? ((buyers / visitors) * 100).toFixed(1) : '0.0';
      setText('statSaleConv', conv + '%');
    });
  });
}

/* =============================================
   VENDAS — PÁGINA COMPLETA
   ============================================= */
function loadSalesData() {
  var df = getDateFilter();
  query(['sale'], df).then(function (res) {
    var sales = res.data || [];

    renderSalesCards(sales, {
      total:    'saleRevTotal',    totalQty:    'saleQtyTotal',
      main:     'saleRevMain',     mainQty:     'saleQtyMain',
      bump:     'saleRevBump',     bumpQty:     'saleQtyBump',
      upsell:   'saleRevUpsell',   upsellQty:   'saleQtyUpsell',
      downsell: 'saleRevDownsell', downsellQty: 'saleQtyDownsell',
      avg:      'saleAvgTicket'
    });

    renderSalesTable(sales);
  });
}

function renderSalesCards(sales, ids) {
  var totals = { main: { val: 0, qty: 0 }, order_bump: { val: 0, qty: 0 }, upsell: { val: 0, qty: 0 }, downsell: { val: 0, qty: 0 } };
  var totalVal = 0;

  sales.forEach(function (e) {
    var ot  = (e.meta && e.meta.order_type) || 'main';
    var val = Number((e.meta && e.meta.value) || 0);
    if (!totals[ot]) totals[ot] = { val: 0, qty: 0 };
    totals[ot].val += val;
    totals[ot].qty++;
    totalVal += val;
  });

  var avg = sales.length > 0 ? (totalVal / sales.length) : 0;

  setText(ids.total,    'R$ ' + totalVal.toFixed(2).replace('.', ','));
  setText(ids.totalQty, sales.length + ' venda' + (sales.length !== 1 ? 's' : ''));
  setText(ids.main,     'R$ ' + (totals.main.val).toFixed(2).replace('.', ','));
  if (ids.mainQty)     setText(ids.mainQty,     totals.main.qty + ' venda' + (totals.main.qty !== 1 ? 's' : ''));
  setText(ids.bump,     'R$ ' + (totals.order_bump.val).toFixed(2).replace('.', ','));
  if (ids.bumpQty)     setText(ids.bumpQty,     totals.order_bump.qty + ' venda' + (totals.order_bump.qty !== 1 ? 's' : ''));
  setText(ids.upsell,   'R$ ' + (totals.upsell.val).toFixed(2).replace('.', ','));
  if (ids.upsellQty)   setText(ids.upsellQty,   totals.upsell.qty + ' venda' + (totals.upsell.qty !== 1 ? 's' : ''));
  setText(ids.downsell, 'R$ ' + (totals.downsell.val).toFixed(2).replace('.', ','));
  if (ids.downsellQty) setText(ids.downsellQty, totals.downsell.qty + ' venda' + (totals.downsell.qty !== 1 ? 's' : ''));
  setText(ids.avg,      'R$ ' + avg.toFixed(2).replace('.', ','));
}

function renderSalesTable(sales) {
  if (!sales.length) {
    setHTML('salesTable', '<div class="empty-state"><div class="empty-icon">💰</div>' +
      '<p>Nenhuma venda no período.<br><small>Configure o webhook na aba "Webhook Vendas" ou adicione manualmente.</small></p></div>');
    return;
  }

  var badgeMap = { main: 'badge-main', order_bump: 'badge-bump', upsell: 'badge-upsell', downsell: 'badge-downsell' };
  var labelMap = { main: 'Principal', order_bump: 'Order Bump', upsell: 'Upsell', downsell: 'Downsell' };

  var rows = sales.slice().sort(function (a, b) {
    return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
  }).map(function (e) {
    var m       = e.meta || {};
    var ot      = m.order_type || 'main';
    var date    = new Date(e.created_at);
    var dateStr = date.toLocaleDateString('pt-BR') + ' ' + date.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
    var plat    = (m.platform || 'manual').charAt(0).toUpperCase() + (m.platform || 'manual').slice(1);

    return '<tr>' +
      '<td>' + dateStr + '</td>' +
      '<td><span class="badge badge-platform">' + plat + '</span>' + (m.product_name || 'Produto') + '</td>' +
      '<td><span class="badge ' + (badgeMap[ot] || 'badge-main') + '">' + (labelMap[ot] || ot) + '</span></td>' +
      '<td class="val">R$ ' + Number(m.value || 0).toFixed(2).replace('.', ',') + '</td>' +
      '<td>' + (m.buyer_name || '—') + '</td>' +
      '<td style="font-size:0.78rem;color:var(--text-muted)">' + (m.transaction || '—') + '</td>' +
      '</tr>';
  }).join('');

  setHTML('salesTable',
    '<table class="sales-table"><thead><tr>' +
    '<th>Data</th><th>Produto</th><th>Tipo</th><th>Valor</th><th>Comprador</th><th>Transação</th>' +
    '</tr></thead><tbody>' + rows + '</tbody></table>');
}

/* =============================================
   MODAL — Adicionar venda manual
   ============================================= */
function openAddSaleModal() {
  document.getElementById('addSaleModal').classList.add('open');
}
function closeAddSaleModal() {
  document.getElementById('addSaleModal').classList.remove('open');
}
document.getElementById('addSaleModal').addEventListener('click', function (e) {
  if (e.target === this) closeAddSaleModal();
});

function saveManualSale() {
  var product  = (document.getElementById('ms_product').value  || '').trim() || 'Produto';
  var value    = parseFloat(document.getElementById('ms_value').value    || 0);
  var type     = document.getElementById('ms_type').value;
  var platform = document.getElementById('ms_platform').value;
  var buyer    = (document.getElementById('ms_buyer').value  || '').trim();
  var email    = (document.getElementById('ms_email').value  || '').trim();

  if (!value || value <= 0) { showToast('Informe o valor da venda.', 'error'); return; }

  sb.from('chaves_events').insert({
    session_id: 'manual_' + Date.now(),
    type:       'sale',
    meta: {
      source:       'moldscoros',
      platform:     platform,
      event:        'manual',
      product_name: product,
      value:        value,
      currency:     'BRL',
      order_type:   type,
      buyer_name:   buyer,
      buyer_email:  email,
      transaction:  'manual_' + Date.now(),
      status:       'approved',
    }
  }).then(function (res) {
    if (res.error) { showToast('Erro: ' + res.error.message, 'error'); return; }
    closeAddSaleModal();
    showToast('Venda registrada com sucesso!', 'success');
    loadSalesData();
    loadSalesOverview();
  });
}

/* =============================================
   WEBHOOK — Configurações
   ============================================= */
/* URL da função PostgreSQL via PostgREST — não precisa de deploy ou CLI */
var ANON_KEY    = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRxZXlldnNjbnV5cWJ3ZGhrcXN2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzI4NDU4MDcsImV4cCI6MjA4ODQyMTgwN30.KVcEEsCnCDEVm384qNEhLq6f8e2MGqbRtu6hLZien1M';
var WEBHOOK_URL = 'https://dqeyevscnuyqbwdhkqsv.supabase.co/rest/v1/rpc/receive_webhook?apikey=' + ANON_KEY;

/* SQL que cria a função no banco — executar uma vez no SQL Editor do Supabase */
var WEBHOOK_SQL = "CREATE OR REPLACE FUNCTION public.receive_webhook(jsonb)\nRETURNS jsonb\nLANGUAGE plpgsql\nSECURITY DEFINER\nSET search_path = public\nAS $$\nDECLARE\n  body     jsonb  := $1;\n  ev       text;\n  platform text;\n  pname    text;\n  val      numeric;\n  otype    text;\n  bname    text;\n  bemail   text;\n  txn      text;\nBEGIN\n  ev := lower(COALESCE(body->>'event',body->>'status',body->>'order_status',body->>'trans_status',''));\n  IF ev IN ('abandoned','refunded','chargeback','canceled','cancelled','waiting_payment','waiting','recused','refused') THEN\n    RETURN jsonb_build_object('ok', true, 'skipped', true);\n  END IF;\n  IF body->'data'->'purchase' IS NOT NULL THEN\n    platform := 'hotmart';\n    pname    := COALESCE(body->'data'->'product'->>'name','Produto');\n    val      := COALESCE((body->'data'->'purchase'->'price'->>'value')::numeric,(body->'data'->'purchase'->'full_price'->>'value')::numeric,0);\n    txn      := COALESCE(body->'data'->'purchase'->>'transaction','');\n    bname    := COALESCE(body->'data'->'buyer'->>'name','');\n    bemail   := COALESCE(body->'data'->'buyer'->>'email','');\n    otype    := CASE WHEN lower(COALESCE(body->'data'->'purchase'->'offer'->>'code','')) LIKE '%bump%' OR lower(COALESCE(body->>'event','')) LIKE '%bump%' THEN 'order_bump' WHEN lower(COALESCE(body->'data'->'purchase'->'offer'->>'code','')) LIKE '%up%' OR lower(COALESCE(body->>'event','')) LIKE '%upsell%' THEN 'upsell' WHEN lower(COALESCE(body->'data'->'purchase'->'offer'->>'code','')) LIKE '%down%' THEN 'downsell' ELSE 'main' END;\n  ELSIF body->>'order_id' IS NOT NULL OR body->>'order_status' IS NOT NULL THEN\n    platform := 'kiwify';\n    pname    := COALESCE(body->'product'->>'name',body->>'product_name','Produto');\n    val      := COALESCE((body->>'order_total')::numeric,(body->>'amount')::numeric,0);\n    txn      := COALESCE(body->>'order_id','');\n    bname    := COALESCE(body->'customer'->>'full_name',body->'customer'->>'name','');\n    bemail   := COALESCE(body->'customer'->>'email','');\n    otype    := CASE WHEN (body->>'order_bump')::boolean THEN 'order_bump' WHEN (body->>'upsell')::boolean THEN 'upsell' ELSE 'main' END;\n  ELSIF body->>'cod_transaction' IS NOT NULL OR body->>'chk_id' IS NOT NULL THEN\n    platform := 'braip';\n    pname    := COALESCE(body->>'prd_name',body->>'product','Produto');\n    val      := COALESCE((body->>'vlr_total')::numeric,(body->>'amount')::numeric,0);\n    txn      := COALESCE(body->>'cod_transaction',body->>'chk_id','');\n    bname    := COALESCE(body->>'cus_name',''); bemail := COALESCE(body->>'cus_email',''); otype := 'main';\n  ELSIF body->>'trans_cod' IS NOT NULL THEN\n    platform := 'eduzz';\n    pname    := COALESCE(body->>'prd_name','Produto');\n    val      := COALESCE((body->>'trans_paid')::numeric,(body->>'amount')::numeric,0);\n    txn      := COALESCE(body->>'trans_cod','');\n    bname    := COALESCE(body->>'cus_name',''); bemail := COALESCE(body->>'cus_email',''); otype := 'main';\n  ELSE\n    platform := COALESCE(body->>'platform','webhook');\n    pname    := COALESCE(body->>'product_name',body->>'product','Produto');\n    val      := COALESCE((body->>'value')::numeric,(body->>'amount')::numeric,0);\n    txn      := COALESCE(body->>'transaction',body->>'order_id','');\n    bname    := COALESCE(body->>'buyer_name',body->>'name','');\n    bemail   := COALESCE(body->>'buyer_email',body->>'email','');\n    otype    := COALESCE(body->>'order_type','main');\n  END IF;\n  INSERT INTO public.chaves_events(session_id,type,meta) VALUES(\n    'wh_'||extract(epoch from now())::bigint||'_'||substr(md5(random()::text),1,6),\n    'sale',\n    jsonb_build_object('source','moldscoros','platform',platform,'event',ev,'product_name',pname,'value',val,'currency','BRL','order_type',otype,'buyer_name',bname,'buyer_email',bemail,'transaction',txn,'status','approved')\n  );\n  RETURN jsonb_build_object('ok',true,'platform',platform,'value',val);\nEXCEPTION WHEN OTHERS THEN\n  RETURN jsonb_build_object('ok',false,'error',SQLERRM);\nEND;\n$$;\nGRANT EXECUTE ON FUNCTION public.receive_webhook(jsonb) TO anon;\nGRANT EXECUTE ON FUNCTION public.receive_webhook(jsonb) TO authenticated;";

function loadWebhookSettings() {
  checkWebhookStatus();
}

function checkWebhookStatus() {
  var dot   = document.getElementById('webhookStatusDot');
  var text  = document.getElementById('webhookStatusText');
  var alert = document.getElementById('deployAlertPanel');
  if (text) text.textContent = 'Verificando…';
  if (dot)  dot.style.background = '#6b7280';

  /* Testa se a função PostgreSQL existe enviando um POST vazio */
  fetch('https://dqeyevscnuyqbwdhkqsv.supabase.co/rest/v1/rpc/receive_webhook', {
    method: 'POST',
    headers: {
      'apikey':        ANON_KEY,
      'Authorization': 'Bearer ' + ANON_KEY,
      'Content-Type':  'application/json',
    },
    body: JSON.stringify({ event: '_ping' }),
    signal: AbortSignal.timeout(10000),
  })
  .then(function (r) {
    if (r.status === 200 || r.status === 204) {
      setWebhookActive(dot, text, alert);
    } else if (r.status === 404) {
      /* Função não existe no banco — mostrar painel de setup */
      setWebhookInactive(dot, text, alert, 'Função não criada');
    } else {
      r.json().then(function (j) {
        /* PGRST202 = função não encontrada no schema cache */
        if (j && j.code === 'PGRST202') {
          setWebhookInactive(dot, text, alert, 'Função não criada');
        } else {
          /* Algum outro erro HTTP — pode ser que funcione mesmo assim */
          setWebhookActive(dot, text, alert);
        }
      }).catch(function () {
        setWebhookInactive(dot, text, alert, 'Erro ' + r.status);
      });
    }
  })
  .catch(function () {
    setWebhookInactive(dot, text, alert, 'Sem resposta');
  });
}

function setWebhookActive(dot, text, alert) {
  if (dot)   { dot.style.background = '#22c55e'; }
  if (text)  { text.textContent = '✓ Webhook ativo'; }
  if (alert) { alert.style.display = 'none'; }
}

function setWebhookInactive(dot, text, alert, reason) {
  if (dot)   { dot.style.background = '#f59e0b'; }
  if (text)  { text.textContent = '⚡ Setup necessário'; }
  if (alert) {
    alert.style.display = 'block';
    var pre = document.getElementById('webhookSqlPreview');
    if (pre && !pre.textContent) pre.textContent = WEBHOOK_SQL;
  }
}

function copyWebhookSql() {
  navigator.clipboard.writeText(WEBHOOK_SQL).then(function () {
    var ok  = document.getElementById('copySqlOk');
    var btn = document.getElementById('btnCopySql');
    if (ok)  { ok.style.display  = 'inline'; setTimeout(function () { ok.style.display = 'none'; }, 4000); }
    if (btn) { btn.textContent = '✓ SQL copiado'; setTimeout(function () { btn.textContent = '📋 Copiar SQL do webhook'; }, 4000); }
    showToast('SQL copiado! Cole no SQL Editor do Supabase e clique em Run.', 'success');
  }).catch(function () {
    showToast('Copie manualmente o arquivo supabase/receive_webhook.sql', 'error');
  });
}

function copyWebhookUrl() {
  var val = (document.getElementById('webhookUrl') || {}).value || WEBHOOK_URL;
  navigator.clipboard.writeText(val).then(function () {
    showToast('URL copiada!', 'success');
  }).catch(function () {
    var el = document.getElementById('webhookUrl');
    if (el) { el.select(); document.execCommand('copy'); }
    showToast('URL copiada!', 'success');
  });
}

function showPlatform(name, btn) {
  document.querySelectorAll('.plat-info').forEach(function (el) { el.style.display = 'none'; });
  document.querySelectorAll('.ptab').forEach(function (el) { el.classList.remove('active'); });
  var el = document.getElementById('plat-' + name);
  if (el) el.style.display = 'block';
  if (btn) btn.classList.add('active');
}

function sendTestSale() {
  var value = parseFloat(document.getElementById('testSaleValue').value || 0);
  var type  = document.getElementById('testSaleType').value;
  if (!value || value <= 0) { showToast('Informe um valor para o teste.', 'error'); return; }

  sb.from('chaves_events').insert({
    session_id: 'test_' + Date.now(),
    type:       'sale',
    meta: {
      source:       'moldscoros',
      platform:     'teste',
      event:        'test_sale',
      product_name: 'Molde Porta Canivete Country',
      value:        value,
      currency:     'BRL',
      order_type:   type,
      buyer_name:   'Comprador Teste',
      buyer_email:  'teste@teste.com',
      transaction:  'TEST_' + Date.now(),
      status:       'approved',
    }
  }).then(function (res) {
    if (res.error) { showToast('Erro: ' + res.error.message, 'error'); return; }
    showToast('Venda de teste registrada! Veja em Vendas & Receita.', 'success');
    if (currentSection === 'sales') loadSalesData();
    loadSalesOverview();
  });
}

/* =============================================
   HELPERS
   ============================================= */
function setText(id, val) { var el = document.getElementById(id); if (el) el.textContent = val; }
function setHTML(id, html) { var el = document.getElementById(id); if (el) el.innerHTML = html; }
function formatSeconds(s) {
  if (!s || isNaN(s)) return '—';
  var m = Math.floor(s / 60); var sec = s % 60;
  return m === 0 ? sec + 's' : m + 'min' + (sec > 0 ? ' ' + sec + 's' : '');
}
