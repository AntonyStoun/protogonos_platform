/* ═══════════════════════════════════════════════════════════════
   level1.js — ПОРОГ: живой таймер ☉/☾ + астрономический замок 360°.
   Математика по ИНСТРУКЦИИ:
     θ = atan2(my−cy, mx−cx)·180/π + 90°  (0° строго вверху, по ч.стр.)
     Внешняя окружность: Солнце; внутренняя (70%): Луна.
     Цель: Солнце 0° (допуск 358.5°–1.5°), Луна 180° (178.5°–181.5°).
     Попадание → примагничивание ровно в 0.0/180.0 → фиксация.
     Обе зафиксированы → вспышка световой оси → Уровень 2.
   ═══════════════════════════════════════════════════════════════ */

window.LEVEL1 = (function () {
  const NS = 'http://www.w3.org/2000/svg';
  const VB   = 1000;                 // viewBox 0 0 1000 1000
  const CX   = VB / 2, CY = VB / 2;
  const R_OUT = 440;                 // внешняя окружность
  const R_IN  = Math.round(R_OUT * 0.70);  // внутренняя = 70 %
  const TOL   = 1.5;                 // допуск захвата, градусы
  const SUN_SPEED  =  0.15;          // ° за кадр (16.7 мс)
  const MOON_SPEED = -0.22;          // ° за кадр, против ч.стр.

  /* ---------- Живой таймер посетителя ---------- */
  const elH = document.getElementById('l1-hours');
  const elM = document.getElementById('l1-minutes');
  function tickClock() {
    const d = new Date();
    elH.textContent = String(d.getHours()).padStart(2, '0');
    elM.textContent = String(d.getMinutes()).padStart(2, '0');
  }

  /* ---------- Геометрия ---------- */
  function polar(r, deg) {
    const rad = deg * Math.PI / 180;
    return [CX + r * Math.sin(rad), CY - r * Math.cos(rad)];
  }
  function make(tag, attrs, parent) {
    const e = document.createElementNS(NS, tag);
    for (const k in attrs) e.setAttribute(k, attrs[k]);
    if (parent) parent.appendChild(e);
    return e;
  }

  /* ---------- Построение замка ---------- */
  const lockEl = document.getElementById('lock');
  const svg = make('svg', { viewBox: `0 0 ${VB} ${VB}` });
  lockEl.appendChild(svg);

  // кольца
  make('circle', { class: 'lock-ring', cx: CX, cy: CY, r: R_OUT, 'stroke-width': 1.4 }, svg);
  make('circle', { class: 'lock-ring', cx: CX, cy: CY, r: R_IN,  'stroke-width': 1   }, svg);

  // деления: 360 микро-делений; крупные риски каждые 15° и 30°
  function drawTicks(r, inward, scale) {
    const g = make('g', { class: 'ticks' }, svg);
    for (let d = 0; d < 360; d++) {
      const major30 = d % 30 === 0, major15 = d % 15 === 0;
      const len = (major30 ? 16 : major15 ? 9 : 3.5) * scale;
      const [x1, y1] = polar(r, d);
      const [x2, y2] = polar(r + (inward ? -len : len), d);
      make('line', {
        x1, y1, x2, y2,
        class: major30 ? 'lock-tick lock-tick-major'
               : major15 ? 'lock-tick lock-tick-major' : 'lock-tick',
        'stroke-width': major30 ? 1.6 : major15 ? 1.1 : 0.6,
        opacity: major30 ? .9 : major15 ? .6 : .3
      }, g);
    }
  }
  drawTicks(R_OUT, true, 1);       // внешняя шкала — риски внутрь
  drawTicks(R_IN, false, .8);      // внутренняя шкала — риски наружу

  // числовые отметки 0° / 90° / 180° / 270°
  [[0, 30], [90, 34], [180, 30], [270, 34]].forEach(([d, off]) => {
    const [x, y] = polar(R_OUT + off, d);
    const t = make('text', { x, y, class: 'lock-degree-label',
      'text-anchor': 'middle', 'dominant-baseline': 'middle' }, svg);
    t.textContent = d + '\u00B0';
  });

  // световая ось оппозиции (появляется при БАЦ)
  const axisEl = make('line', { class: 'axis-flash', x1: CX, y1: CY, x2: CX, y2: CY,
    'stroke-width': 2, opacity: 0 }, svg);

  // сферы
  const state = {
    sun:  { key: 'sun',  angle: 137.4, r: R_OUT, target: 0,
            dragging: false, locked: false, resumeAt: 0, lastDelta: 0,
            el: make('circle', { class: 'sphere sphere-sun',  r: 17 }, svg) },
    moon: { key: 'moon', angle: 251.8, r: R_IN,  target: 180,
            dragging: false, locked: false, resumeAt: 0, lastDelta: 0,
            el: make('circle', { class: 'sphere sphere-moon', r: 14 }, svg) }
  };

  function render(s) {
    const [x, y] = polar(s.r, s.angle);
    s.el.setAttribute('cx', x);
    s.el.setAttribute('cy', y);
  }

  /* ---------- Орбитальный цикл покоя ---------- */
  let lastTs = 0;
  function orbit(ts) {
    const frames = lastTs ? Math.min((ts - lastTs) / 16.67, 4) : 1; // независимость от FPS
    lastTs = ts;
    const now = performance.now();
    for (const k in state) {
      const s = state[k];
      if (!s.dragging && !s.locked && now >= s.resumeAt) {
        s.angle += (k === 'sun' ? SUN_SPEED : MOON_SPEED) * frames;
        s.angle = (s.angle % 360 + 360) % 360;
      }
      render(s);
    }
    requestAnimationFrame(orbit);
  }

  /* ---------- Захват и ручное управление ---------- */
  function angleFromPointer(ev) {
    const rect = svg.getBoundingClientRect();
    const cx = rect.left + rect.width  / 2;
    const cy = rect.top  + rect.height / 2;
    // θ = atan2(my−cy, mx−cx)·180/π + 90°, приведение к 0–360
    let deg = Math.atan2(ev.clientY - cy, ev.clientX - cx) * 180 / Math.PI + 90;
    return (deg % 360 + 360) % 360;
  }
  function shortestDelta(from, to) {
    let d = to - from;
    if (d > 180) d -= 360; if (d < -180) d += 360;
    return d;
  }

  function bindSphere(s) {
    s.el.addEventListener('pointerdown', (ev) => {
      if (s.locked) return;
      ev.preventDefault();
      s.dragging = true;
      s.lastDelta = 0;
      s.el.setPointerCapture(ev.pointerId);
      s.angle = angleFromPointer(ev);
    });
    s.el.addEventListener('pointermove', (ev) => {
      if (!s.dragging) return;
      const deg = angleFromPointer(ev);
      const delta = shortestDelta(s.angle, deg);
      // «хаотичный рывок»: быстрая смена направления
      if (s.lastDelta && Math.sign(delta) !== Math.sign(s.lastDelta)
          && Math.abs(delta) > 6 && Math.abs(s.lastDelta) > 6) {
        if (window.OBSERVER) OBSERVER.registerJerk();
      }
      s.lastDelta = delta;
      s.angle = deg;
    });
    const end = (ev) => {
      if (!s.dragging) return;
      s.dragging = false;
      // в допуске цели? (для 0° окно 358.5–360–0–1.5)
      const dist = Math.abs(shortestDelta(s.angle, s.target));
      if (dist <= TOL) {
        lockSphere(s);
      } else {
        s.resumeAt = performance.now() + 1500;   // пауза 1.5 с → возврат к орбите
      }
    };
    s.el.addEventListener('pointerup', end);
    s.el.addEventListener('pointercancel', end);
  }

  function lockSphere(s) {
    s.angle = s.target;           // примагничивание ровно в 0.0 / 180.0
    s.locked = true;
    s.el.classList.add('sphere-locked');
    s.el.style.cursor = 'default';
    if (s.target === 0) { // подсветка цели у второй сферы
      state.moon.el.classList.add('sphere-near');
    } else { state.sun.el.classList.add('sphere-near'); }
    checkOpposition();
  }

  /* ---------- БАЦ: оппозиция 180° ---------- */
  function checkOpposition() {
    if (!(state.sun.locked && state.moon.locked)) return;
    if (API.unlocked) return;
    API.unlocked = true;

    const [x1, y1] = polar(R_OUT, state.sun.angle);
    const [x2, y2] = polar(R_IN,  state.moon.angle);
    axisEl.setAttribute('x1', x1); axisEl.setAttribute('y1', y1);
    axisEl.setAttribute('x2', x2); axisEl.setAttribute('y2', y2);
    axisEl.classList.add('on');

    if (window.OBSERVER) OBSERVER.lockSolved();
    document.getElementById('l1-hint').classList.add('hint-done');
    setTimeout(() => { PROTO.go(2); }, 1600); // вспышка → погружение
  }

  /* ---------- Публичный контракт ---------- */
  const API = {
    unlocked: false,
    init() {
      tickClock();
      setInterval(tickClock, 1000);
      bindSphere(state.sun);
      bindSphere(state.moon);
      requestAnimationFrame(orbit);
    },
    /* сброс замка (сценарий А: выброс на Уровень 1) */
    reset() {
      API.unlocked = false;
      state.sun.locked = state.moon.locked = false;
      state.sun.dragging = state.moon.dragging = false;
      state.sun.resumeAt = state.moon.resumeAt = 0;
      state.sun.angle = Math.random() * 360;
      state.moon.angle = Math.random() * 360;
      for (const k of ['sun', 'moon']) {
        state[k].el.classList.remove('sphere-locked', 'sphere-near');
        state[k].el.style.cursor = 'grab';
      }
      axisEl.classList.remove('on');
      document.getElementById('l1-hint').classList.remove('hint-done');
    }
  };
  return API;
})();
