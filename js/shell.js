/* ═══════════════════════════════════════════════════════════════
   shell.js — МЕНЕДЖЕР УРОВНЕЙ (стык всей системы).
   Управляет состоянием data-active-level и переходами по оси Z:
   текущий уровень растворяется (scale 1.4 / +300px), следующий
   выходит из глубины (scale .7 / −500px → 1 / 0). 1.2 секунды.
   ═══════════════════════════════════════════════════════════════ */

window.PROTO = (function () {
  const body  = document.body;
  const levels = {
    1: document.getElementById('level1'),
    2: document.getElementById('level2'),
    3: document.getElementById('level3')
  };

  let active = 0;              // уровень ещё не активирован
  let busy   = false;          // переход идёт — вход воспрещён

  /* Условия допуска: level1.js выставит unlockGate(); level2.js — coreGate().
     Возвращают true/false; force=true разрешает переход только для отладки. */
  const gates = {
    1: () => true,
    2: () => (window.LEVEL1 && LEVEL1.unlocked === true),
    3: () => (window.LEVEL2 && LEVEL2.coreGate && LEVEL2.coreGate())
  };

  const TRANSITION_MS = 1200;

  function go(target, opts = {}) {
    target = Number(target);
    if (!levels[target])       { console.warn('PROTO.go: нет уровня', target); return false; }
    if (busy || target === active) return false;
    if (!opts.force && !gates[target]()) {
      console.warn('PROTO.go: уровень', target, 'заперт (условие не выполнено)');
      return false;
    }

    busy = true;
    const from = levels[active];
    const to   = levels[target];

    if (from) from.dataset.state = 'dissolve';
    to.dataset.state = 'emerge';

    setTimeout(() => {
      if (from) { delete from.dataset.state; }          // в изоляцию
      to.dataset.state = 'active';                       // активный слой
      active = target;
      body.dataset.activeLevel = String(target);
      busy = false;
      body.dispatchEvent(new CustomEvent('proto:level', { detail: { level: target } }));
    }, TRANSITION_MS);

    return true;
  }

  /* Стартовая активация Уровня 1 */
  function boot() {
    levels[1].dataset.state = 'emerge';
    setTimeout(() => {
      levels[1].dataset.state = 'active';
      active = 1;
      body.dataset.activeLevel = '1';
    }, TRANSITION_MS);
  }

  return {
    go,
    get level() { return active; },
    boot
  };
})();

document.addEventListener('DOMContentLoaded', () => {
  PROTO.boot();
  if (window.OBSERVER) OBSERVER.start();
  if (window.LEVEL1)   LEVEL1.init();
  if (window.LEVEL2)   LEVEL2.init();
  if (window.LEVEL3)   LEVEL3.init();
});
