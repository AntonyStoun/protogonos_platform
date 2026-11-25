/* ═══════════════════════════════════════════════════════════════
   level2.js — ГЛАВНЫЙ ЗАЛ: четыре раздела + центральный узел.
   КОДЕКС: fetch content/codex.md → marked → автооглавление.
   ПРОЕКЦИЯ: внешний iframe из content/config.js (в geometr. раме).
   СХЕМАТИКОН: сетка карточек config.schemes → полноэкранный зум/пан.
   ЭМИССИЯ: почта из config.js: [СКОПИРОВАТЬ] + [mailto].
   ═══════════════════════════════════════════════════════════════ */

window.LEVEL2 = (function () {
  const panel = document.getElementById('l2-panel');
  const nodes = document.querySelectorAll('.l2-node');
  const matrix = document.getElementById('l2-matrix');
  let openedNow = '';

  const cfg = () => window.PROTO_CONFIG || {};

  function closeSection() {
    if (openedNow && window.OBSERVER) OBSERVER.closeSection();
    openedNow = '';
    nodes.forEach(n => n.dataset.open = 'false');
    panel.removeAttribute('data-open');
    panel.innerHTML = '';
    matrix.style.opacity = '';
  }

  function openSection(name) {
    if (openedNow === name) { closeSection(); return; }
    closeSection();
    openedNow = name;
    nodes.forEach(n => n.dataset.open = String(n.dataset.section === name));
    panel.dataset.open = name;
    matrix.style.opacity = '.25';

    const box = document.createElement('div');
    box.className = 'section-box';
    const x = document.createElement('button');
    x.className = 'section-close'; x.textContent = '✕'; x.title = 'Закрыть';
    x.addEventListener('click', closeSection);
    box.appendChild(x);
    panel.appendChild(box);

    if (window.OBSERVER) OBSERVER.openSection(name);
    switch (name) {
      case 'codex':       renderCodex(box);       break;
      case 'projection':  renderProjection(box);  break;
      case 'schematikon': renderSchematikon(box); break;
      case 'emission':    renderEmission(box);    break;
    }
  }

  /* ─────────────── РАЗДЕЛ 1: КОДЕКС ─────────────── */
  async function renderCodex(box) {
    const layout = document.createElement('div');
    layout.className = 'codex-layout';
    const toc = document.createElement('nav');  toc.className = 'codex-toc';
    const art = document.createElement('article'); art.className = 'codex-article';
    layout.append(toc, art); box.appendChild(layout);

    try {
      const res  = await fetch('content/codex.md');
      const md   = await res.text();
      art.innerHTML = window.marked ? marked.parse(md) : md;
    } catch (e) {
      art.innerHTML = '<p class="sacred" style="color:var(--ink-dim)">' +
        'КОДЕКС недоступен: откройте сайт через «ЗАПУСТИТЬ-ПРЕДПРОСМОТР.bat» ' +
        'или загрузите его на GitHub Pages.</p>';
      return;
    }

    /* автооглавление по всем заголовкам */
    const heads = art.querySelectorAll('h1, h2, h3');
    heads.forEach((h, i) => {
      h.id = 'sec-' + i;
      const a = document.createElement('a');
      a.textContent = h.textContent;
      a.href = '#sec-' + i;
      a.dataset.lv = h.tagName;
      a.addEventListener('click', (ev) => {
        ev.preventDefault();
        h.scrollIntoView({ behavior: 'smooth', block: 'start' });
      });
      toc.appendChild(a);
    });

    /* телеметрия прокрутки: % глубины чтения */
    art.addEventListener('scroll', () => {
      const max = art.scrollHeight - art.clientHeight;
      const pct = max > 0 ? (art.scrollTop / max) * 100 : 100;
      if (window.OBSERVER) OBSERVER.codexScrolled(pct);
    });
  }

  /* ─────────────── РАЗДЕЛ 2: ПРОЕКЦИЯ ─────────────── */
  function renderProjection(box) {
    const p = cfg().projection || {};
    const wrap = document.createElement('div');
    wrap.className = 'proj-frame frame-geo';
    const src = p.src && String(p.src).trim();
    if (!src) {
      wrap.innerHTML = '<div class="proj-empty sacred">ПРОЕКЦИЯ ЖДЁТ ССЫЛКУ<br>' +
        '<small>content/config.js → projection.src</small></div>';
    } else {
      const ifr = document.createElement('iframe');
      ifr.src = normalizeEmbed(p.provider, src);
      ifr.allow = 'accelerometer; autoplay; clipboard-write; encrypted-media; picture-in-picture';
      ifr.allowFullscreen = true;
      wrap.appendChild(ifr);
    }
    box.appendChild(wrap);
  }
  function normalizeEmbed(provider, src) {
    // обычную ссылку юзера (watch?v= / youtu.be) превращаем в embed-адрес
    const yt = String(src).match(
      /(?:youtube\.com\/(?:watch\?v=|embed\/|shorts\/)|youtu\.be\/)([\w-]{6,})/i);
    if (yt) return 'https://www.youtube.com/embed/' + yt[1];
    if (/^https?:\/\//i.test(src)) return src;           // готовый embed-URL
    const id = encodeURIComponent(src);
    switch (provider) {
      case 'vimeo':     return 'https://player.vimeo.com/video/' + id;
      case 'rutube':    return 'https://rutube.ru/play/embed/' + id;
      case 'kinescope': return 'https://player.kinescope.io/video/' + id;
      default:          return 'https://www.youtube.com/embed/' + id;
    }
  }

  /* ─────────────── РАЗДЕЛ 3: СХЕМАТИКОН ─────────────── */
  function renderSchematikon(box) {
    const list = cfg().schemes || [];
    const grid = document.createElement('div');
    grid.className = 'schem-grid';
    if (!list.length) {
      grid.innerHTML = '<div class="schem-empty sacred">СХЕМАТИКОН ПУСТ<br>' +
        '<small>положите чертежи в assets/schemes/ и опишите их в content/config.js → schemes</small></div>';
    }
    list.forEach((s, i) => {
      const card = document.createElement('button');
      card.className = 'schem-card frame-geo';
      card.innerHTML = '<img src="assets/schemes/' + s.file + '" alt="" loading="lazy">' +
        '<span class="sacred">' + (s.caption || s.file) + '</span>';
      card.addEventListener('click', () => openViewer(s, i));
      grid.appendChild(card);
    });
    box.appendChild(grid);
  }

  /* полноэкранный просмотр чертежа: зум колесом/щипком + пан мышью */
  function openViewer(s, index) {
    if (window.OBSERVER) OBSERVER.schematicOpenedOne();
    const v = document.createElement('div');
    v.className = 'schem-viewer';
    const stage = document.createElement('div'); stage.className = 'schem-stage';
    const img = document.createElement('img');
    img.src = 'assets/schemes/' + s.file; img.alt = s.caption || '';
    stage.appendChild(img);
    const cap = document.createElement('div');
    cap.className = 'schem-cap sacred'; cap.textContent = s.caption || s.file;
    const x = document.createElement('button');
    x.className = 'section-close'; x.textContent = '✕';
    v.append(stage, cap, x);
    document.body.appendChild(v);

    let scale = 1, tx = 0, ty = 0, dragging = false, px = 0, py = 0;
    const apply = () => { img.style.transform = `translate(${tx}px,${ty}px) scale(${scale})`; };
    stage.addEventListener('wheel', (e) => {
      e.preventDefault();
      scale = Math.min(8, Math.max(.4, scale * (e.deltaY < 0 ? 1.12 : 0.89)));
      apply();
    }, { passive: false });
    stage.addEventListener('pointerdown', (e) => {
      dragging = true; px = e.clientX; py = e.clientY;
      stage.setPointerCapture(e.pointerId);
    });
    stage.addEventListener('pointermove', (e) => {
      if (!dragging) return;
      tx += e.clientX - px; ty += e.clientY - py; px = e.clientX; py = e.clientY; apply();
    });
    const stop = () => { dragging = false; };
    stage.addEventListener('pointerup', stop);
    stage.addEventListener('pointercancel', stop);

    const close = () => v.remove();
    x.addEventListener('click', close);
    v.addEventListener('keydown', (e) => { if (e.key === 'Escape') close(); });
  }

  /* ─────────────── РАЗДЕЛ 4: ЭМИССИЯ ─────────────── */
  function renderEmission(box) {
    const mail = cfg().email || '';
    const em = cfg().emission || {};
    const wrap = document.createElement('div');
    wrap.className = 'emis-wrap sacred';
    wrap.innerHTML =
      (em.phrase ? '<div class="emis-phrase">' + em.phrase + '</div>' : '') +
      '<div class="emis-mail">' + (mail || 'author@example.org') + '</div>' +
      '<div class="emis-btns">' +
      '<button class="l2-node emis-btn">СКОПИРОВАТЬ АДРЕС</button>' +
      '<a class="l2-node emis-btn" href="mailto:' + encodeURIComponent(mail) +
      '?subject=' + encodeURIComponent('PROTOGONOS') + '">ОТКРЫТЬ ПОЧТОВЫЙ КЛИЕНТ</a>' +
      '</div>' +
      (em.author ? '<div class="emis-author">' + em.author + '</div>' : '');
    box.appendChild(wrap);

    const btn = wrap.querySelector('.emis-btn');
    btn.addEventListener('click', async () => {
      try { await navigator.clipboard.writeText(mail); }
      catch { const t = document.createElement('textarea'); t.value = mail;
              document.body.appendChild(t); t.select(); document.execCommand('copy'); t.remove(); }
      const note = document.createElement('div');
      note.className = 'emis-note sacred'; note.textContent = 'СКОПИРОВАНО';
      wrap.appendChild(note);
      setTimeout(() => note.remove(), 1600);
    });
  }

  /* ─────────────── ПУБЛИЧНЫЙ КОНТРАКТ ─────────────── */
  const API = {
    init() {
      nodes.forEach(n => n.addEventListener('click', () => openSection(n.dataset.section)));
      document.getElementById('l2-core').addEventListener('click', () => {
        /* экран темнеет → погружение → терминальный анализ на Уровне 3 */
        closeSection();
        PROTO.go(3);
      });
      /* служебные адреса для проверки без мыши:
         #test-codex или #test-open-<раздел> (codex|projection|schematikon|emission) —
         принудительно спускают на Ур.2 и открывают нужный кабинет */
      if (location.hash === '#test-codex' || location.hash.indexOf('#test-open-') === 0) {
        const sec = location.hash === '#test-codex' ? 'codex'
                    : location.hash.slice(11);
        setTimeout(() => {
          PROTO.go(2, { force: true });
          setTimeout(() => openSection(sec), 1600);
        }, 300);
      }
    },
    coreGate() { return true; },   // до Этапа 4 пропускаем свободно
    close: closeSection
  };
  return API;
})();
