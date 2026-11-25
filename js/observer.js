/* ═══════════════════════════════════════════════════════════════
   observer.js — СКРЫТАЯ ТЕЛЕМЕТРИЯ («Эффект наблюдателя»).
   Пишет в память сессии с первой секунды. Никуда не отправляет.
   ═══════════════════════════════════════════════════════════════ */

window.OBSERVER = (function () {
  let T0 = performance.now();      // старт отсчёта решения замка

  const metrics = {
    lockTimeSec:      0,    // секунды на решение замка (Уровень 1)
    lockJerks:        0,    // хаотичные рывки при перетаскивании сфер
    lockClean:        false,// замок решен без рывков (порог — в config.js)
    codexOpened:      false,
    codexReadSec:     0,    // реальные секунды в КОДЕКСЕ
    codexScrollMax:   0,    // 0–100 % прокрутки статьи
    projectionOpened: false,
    projectionSec:    0,    // секунды в ПРОЕКЦИИ
    schematikonOpened:false,
    schematicsViewed: 0,    // сколько чертежей открывалось
    emissionOpened:   false
  };

  /* Активные счётчики времени (секунды считаются только пока раздел открыт) */
  let activeTimer = null;   // {field, since}

  function startClock(field) {
    stopClock();
    activeTimer = { field, since: performance.now() };
  }
  function stopClock() {
    if (!activeTimer) return;
    metrics[activeTimer.field] += (performance.now() - activeTimer.since) / 1000;
    activeTimer = null;
  }

  return {
    metrics,

    start() { /* T0 фиксируется при загрузке скрипта */ },

    /* --- Уровень 1 --- */
    registerJerk()  { metrics.lockJerks++; },
    lockSolved()    { metrics.lockTimeSec = (performance.now() - T0) / 1000;
                      const thr = (window.PROTO_CONFIG && PROTO_CONFIG.thresholds)
                                    ? PROTO_CONFIG.thresholds.jerksClean : 3;
                      metrics.lockClean = metrics.lockJerks <= thr; },
    /* сценарий А: гость выброшен на Уровень 1 — отсчёт замка заново */
    resetLockSession() { T0 = performance.now();
                         metrics.lockTimeSec = 0;
                         metrics.lockJerks = 0;
                         metrics.lockClean = false; },

    /* --- Уровень 2: разделы --- */
    openSection(name) {
      const map = {
        codex:      ['codexOpened', 'codexReadSec'],
        projection: ['projectionOpened', 'projectionSec'],
        schematikon:['schematikonOpened', null],
        emission:   ['emissionOpened', null]
      };
      const m = map[name]; if (!m) return;
      metrics[m[0]] = true;
      if (m[1]) startClock(m[1]);
    },
    closeSection() { stopClock(); },

    /* --- прокрутка Кодекса (0–100) --- */
    codexScrolled(pct) {
      if (pct > metrics.codexScrollMax) metrics.codexScrollMax = pct;
    },
    schematicOpenedOne() { metrics.schematicsViewed++; }
  };
})();
