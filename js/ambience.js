/* ═══════════════════════════════════════════════════════════════
   ambience.js — абстрактное, едва уловимое звучание Порога.
   Полностью синтезируется браузером (Web Audio): ни одного файла,
   переносимость не страдает. Тихий «дышащий» дрон (квинта A1–E2
   с лёгким расстройки-дрожанием) + редкие высокие всплески, как
   отдалённые колокольчики. Громкость намеренно околонулевая.
   Политика браузеров: звук не может начаться «сам» — он подхватится
   на первом касании мыши/пальца/клавиши (обычно незаметном).
   Клавиша «М» — выключить/включить звучание.
   ═══════════════════════════════════════════════════════════════ */
(() => {
  'use strict';

  let ctx = null;          // AudioContext
  let master = null;       // общая громкость
  let bellTimer = null;    // планировщик всплесков
  let running = false;
  let mutedByUser = false;

  const TARGET = 0.065;    // финальная громкость (по слову заказчика — почти вдвое тише)

  function makeDrone() {
    // «Неземное» звучание: чистые синусы A2+E3 (+октавы), слегка расстроенные
    // друг с другом — от этого гул медленно «дышит» и переливается, как
    // удалённый хор сфер.
    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = 1400;
    filter.Q.value = 0.4;
    filter.connect(master);

    [[110.0, 'sine', 0.50], [110.5, 'sine', 0.40],   // A2 + расстроенная пара (биение 0.5 Гц)
     [164.8, 'sine', 0.30], [165.2, 'sine', 0.22],   // E3 — квинта
     [220.0, 'sine', 0.14], [329.6, 'sine', 0.06],   //_octaves: лёгкое серебро вверху
     [659.3, 'triangle', 0.015]]                      // намёк на верхний звон
      .forEach(([freq, type, amp]) => {
        const osc = ctx.createOscillator();
        osc.type = type;
        osc.frequency.value = freq;
        const g = ctx.createGain();
        g.gain.value = amp;
        osc.connect(g).connect(filter);
        osc.start();
      });

    // «Дыхание»: медленный лфo слегка колышет общую громкость
    const lfo = ctx.createOscillator();
    lfo.type = 'sine';
    lfo.frequency.value = 0.055;            // цикл ~18 секунд
    const lfoGain = ctx.createGain();
    lfoGain.gain.value = TARGET * 0.35;
    lfo.connect(lfoGain).connect(master.gain);
    lfo.start();
  }

  function chime() {
    // Редкий верхний всплеск: одна нота, долгое затухание
    const now = ctx.currentTime;
    const notes = [659.3, 784.0, 987.8, 1174.7, 1318.5];
    const osc = ctx.createOscillator();
    osc.type = 'sine';
    osc.frequency.value = notes[Math.floor(Math.random() * notes.length)];
    const g = ctx.createGain();
    g.gain.setValueAtTime(0, now);
    g.gain.linearRampToValueAtTime(0.022, now + 0.9);
    g.gain.exponentialRampToValueAtTime(0.0001, now + 6.5);
    osc.connect(g).connect(master);
    osc.start(now);
    osc.stop(now + 7);
    bellTimer = setTimeout(chime, 9000 + Math.random() * 12000);
  }

  function start() {
    if (running || mutedByUser) return;
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return;
    ctx = new AC();
    master = ctx.createGain();
    master.gain.value = 0;
    master.connect(ctx.destination);

    makeDrone();
    master.gain.linearRampToValueAtTime(TARGET, ctx.currentTime + 5); // долгий вход
    ctx.resume().then(() => { running = true; chime(); });

    ['pointerdown', 'pointermove', 'keydown', 'wheel'].forEach(ev =>
      window.removeEventListener(ev, start));
  }

  function toggle() {
    if (!running) { mutedByUser = false; start(); return; }
    if (master.gain.value > 0.001) {
      master.gain.linearRampToValueAtTime(0, ctx.currentTime + 1.2);
      mutedByUser = true;
    } else {
      master.gain.linearRampToValueAtTime(TARGET, ctx.currentTime + 2.5);
      mutedByUser = false;
    }
  }

  // Попытка запуститься сразу; если браузер держит — дождёмся первого касания
  start();
  ['pointerdown', 'pointermove', 'keydown', 'wheel'].forEach(ev =>
    window.addEventListener(ev, start, { once: true }));
  window.addEventListener('keydown', (e) => {
    if (e.key === 'м' || e.key === 'М' || e.key === 'b' || e.key === 'B') toggle();
  });
})();
