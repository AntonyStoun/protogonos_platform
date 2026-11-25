/* ═══════════════════════════════════════════════════════════════
   level3.js — ЭФФЕКТ НАБЛЮДАТЕЛЯ: терминальный отчёт о госте,
   вердикты А–Г и САМОРАЗБОР (OMNIA LUX EST → чистая тьма).
   ═══════════════════════════════════════════════════════════════ */

window.LEVEL3 = (function () {
  const term  = document.getElementById('l3-terminal');
  const omnia = document.getElementById('l3-omnia');

  const wait = (ms) => new Promise((r) => setTimeout(r, ms));

  /* «печатающаяся» строка терминала */
  async function line(text, cls, speed) {
    speed = speed || 13;
    const d = document.createElement('div');
    if (cls) d.className = cls;
    term.appendChild(d);
    for (let i = 0; i < text.length; i++) {
      d.textContent += text[i];
      await wait(speed);
    }
    await wait(200);
  }

  /* ---------- Алгоритм оценки (пороги — в config.js) ---------- */
  function verdict(m, th) {
    const minSec   = th.codexMinSec    || 30;
    const minScr   = th.codexMinScroll || 20;
    const deepPct  = th.codexDeepPct   || 70;
    const fullSec  = th.codexFullReadSec || 120;   // эталон полного прочтения
    const projSec  = th.projectionMinSec || 10;

    /* А: поверхностный */
    if (m.codexReadSec < minSec || m.codexScrollMax < minScr) return 'A';

    const deep   = m.codexScrollMax >= deepPct && m.codexReadSec >= fullSec * 0.7;
    const extras = m.projectionOpened || m.schematikonOpened;

    /* Г: мастер — чистый замок + полное изучение всего */
    if (m.lockClean && deep && m.projectionOpened &&
        m.projectionSec >= projSec && m.schematicsViewed >= 1) return 'D';

    /* В: вдумчивый */
    if (deep && extras) return 'C';

    /* Б: избирательный */
    return 'B';
  }

  /* ---------- СЦЕНАРИИ ---------- */
  async function scenarioA(m) {
    await line('Время в Кодексе: ' + m.codexReadSec.toFixed(0) + ' сек. ' +
      'Глубина изучения: ' + m.codexScrollMax.toFixed(0) + '%.', 'l3-verdict-weak');
    await line('Ритм: ' + (m.lockJerks > 3 ? 'хаотичный.' : 'спешка.'), 'l3-verdict-weak');
    await line('ДОСТУП К ЯДРУ ОТКЛОНЁН.', 'l3-verdict-weak sacred');
    await wait(4000);
    /* принудительный выброс на Уровень 1 со сбросом замка */
    PROTO.go(1, { force: true });
    if (window.LEVEL1) LEVEL1.reset();
    if (window.OBSERVER) OBSERVER.resetLockSession();
  }

  async function scenarioB(m) {
    const blind = !m.schematikonOpened
      ? 'Изучен текст, но проигнорированы визуальные доказательства в Схематиконе.'
      : 'Изучены чертежи, но упущено движущее слово Проекции.';
    await line(blind, 'l3-verdict-weak');
    await line('Картина неполная. Возвращайся и заверши изучение.', 'l3-verdict-weak sacred');
    await wait(5000);
    PROTO.go(2, { force: true });
  }

  async function scenarioC() {
    await line('РЕЗОНАНС ПОДТВЕРЖДЕН.', 'l3-verdict-strong sacred');
    await wait(1200);
    unmakeSite();
  }

  async function scenarioD() {
    await line('АБСОЛЮТНЫЙ ФОКУС. ЗАМОК РЕШЕН БЕЗ ШУМА.', 'l3-verdict-strong sacred');
    await line('ПРОТОКОЛ ЗАВЕРШЕН.', 'l3-verdict-strong sacred');
    await wait(1400);
    unmakeSite();
  }

  /* ---------- САМОРАЗБОР: уничтожение интерфейса (~9.5 с) ---------- */
  async function unmakeSite() {
    document.body.classList.add('analyzing');
    /* 0.0 – 2.0 с: снятие структур */
    document.body.classList.add('unmaking-structures');
    await wait(2000);
    /* 2.0 – 4.0 с: снятие оболочки */
    document.body.classList.add('unmaking-shell');
    await wait(2500);
    /* 4.5 – 7.0 с: проявление сути */
    omnia.classList.add('reveal');
    await wait(2500);
    /* 7.0 – 9.5 с: растворение */
    omnia.classList.add('fade');
    await wait(2500);
    /* финал: абсолютная тишина */
    document.body.classList.add('unmade');
  }

  /* ---------- ПУБЛИЧНЫЙ КОНТРАКТ ---------- */
  let running = false;
  const API = {
    init() {
      /* анализ запускается при входе на Уровень 3 (клик по центр. узлу) */
      document.body.addEventListener('proto:level', (e) => {
        if (e.detail.level === 3 && !running && !document.body.classList.contains('unmade')) {
          running = true;
          API.runAnalysis().finally(() => { running = false; });
        }
      });
      /* служебный адрес index.html#test-verdict — проверка без мыши */
      if (location.hash === '#test-verdict')
        setTimeout(() => PROTO.go(3, { force: true }), 1400);
      /* служебный адрес index.html#test-unmake — репетиция саморазбора */
      if (location.hash === '#test-unmake')
        setTimeout(() => API.unmake(), 1500);
    },

    async runAnalysis() {      term.textContent = '';
      const m  = window.OBSERVER ? OBSERVER.metrics : {};
      const th = (window.PROTO_CONFIG && PROTO_CONFIG.thresholds) || {};
      await line('ЭФФЕКТ НАБЛЮДАТЕЛЯ — ОТЧЁТ О ПРИСУТСТВИИ', 'sacred', 9);
      await line('');
      await line('ЗАМОР ПОРОГА: ' + (m.lockTimeSec || 0).toFixed(1) + ' с · рывков: ' + (m.lockJerks || 0));
      await line('КОДЕКС: ' + (m.codexReadSec || 0).toFixed(0) + ' сек · глубина прокрутки: ' + (m.codexScrollMax || 0).toFixed(0) + ' %');
      await line('ПРОЕКЦИЯ: ' + (m.projectionOpened ? (m.projectionSec || 0).toFixed(0) + ' сек' : 'не открыта') +
                 ' · СХЕМАТИКОН: ' + (m.schematicsViewed || 0) + ' черт.');
      await line('');
      const v = verdict(m, th);
      if (v === 'A') return scenarioA(m);
      if (v === 'D') return scenarioD();
      if (v === 'C') return scenarioC();
      return scenarioB(m);
    },

    /* публичный вход в сцену саморазбора (для служебной проверки) */
    unmake() { unmakeSite(); }
  };
  return API;
})();
