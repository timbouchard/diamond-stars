/* ---------- Diamond Stars game logic ---------- */
(function () {
  'use strict';

  // ---------- Position data ----------
  const POSITIONS = {
    P:  { name: 'Pitcher',    x: 200, y: 248, color: '#E24B4A',
          job: 'You stand in the middle. You throw the ball to start. Then you catch it if it comes back to you.',
          tip: 'Most times, you throw to 1st base.' },
    C:  { name: 'Catcher',    x: 200, y: 385, color: '#E24B4A',
          job: 'You sit by home plate. You catch the ball when the pitcher throws it.',
          tip: 'If a girl runs to home, you tag her out!' },
    '1B': { name: '1st base', x: 272, y: 258, color: '#E24B4A',
          job: 'You stand by 1st base. You catch a lot of throws here.',
          tip: 'Touch the base with your foot when you catch the ball.' },
    '2B': { name: '2nd base', x: 238, y: 200, color: '#E24B4A',
          job: 'You play near 2nd base. Lots of balls come to you.',
          tip: 'Throw to 1st if no one is on base yet.' },
    SS: { name: 'Short stop', x: 162, y: 200, color: '#E24B4A',
          job: 'You play between 2nd and 3rd. You get lots of balls!',
          tip: 'You are close to 2nd and 3rd. You can throw there fast.' },
    '3B': { name: '3rd base', x: 128, y: 258, color: '#E24B4A',
          job: 'You stand by 3rd base. Fast balls come right at you.',
          tip: 'Your throw to 1st is a long one. Use a big arm!' },
  };

  const BASE_COORDS = {
    '1B':      { x: 300, y: 245 },
    '2B':      { x: 200, y: 145 },
    '3B':      { x: 100, y: 245 },
    Home:      { x: 200, y: 355 },
    Pitcher:   { x: 200, y: 248 },
  };

  const BASE_NAMES = { '1B': '1st', '2B': '2nd', '3B': '3rd', Home: 'home', Pitcher: 'the pitcher' };

  // ---------- Persistence ----------
  const STORAGE_KEY = 'diamond-stars-state';

  function loadState() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return null;
      return JSON.parse(raw);
    } catch (e) {
      console.warn('Could not load saved state:', e);
      return null;
    }
  }

  function saveState() {
    try {
      const data = {
        level: state.level,
        muted: state.muted,
        stats: state.stats,
        taughtPositions: Array.from(state.taughtPositions),
      };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    } catch (e) {
      console.warn('Could not save state:', e);
    }
  }

  // ---------- State ----------
  const saved = loadState() || {};
  const state = {
    position: null,
    scenario: null,
    answered: false,
    level: saved.level || 'basic',
    muted: saved.muted || false,
    stats: saved.stats || { correct: 0, streak: 0, bestStreak: 0 },
    taughtPositions: new Set(saved.taughtPositions || []),
  };

  // ---------- Sounds (synthesized via Web Audio so no audio files needed) ----------
  let audioCtx = null;

  function getAudio() {
    if (state.muted) return null;
    if (!audioCtx) {
      try {
        const Ctx = window.AudioContext || window.webkitAudioContext;
        if (!Ctx) return null;
        audioCtx = new Ctx();
      } catch (e) {
        return null;
      }
    }
    // Resume if suspended (iOS requires user-gesture-initiated unlock)
    if (audioCtx.state === 'suspended') audioCtx.resume();
    return audioCtx;
  }

  function playTone(freq, duration, type = 'sine', volume = 0.2, startOffset = 0) {
    const ctx = getAudio();
    if (!ctx) return;
    const t0 = ctx.currentTime + startOffset;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, t0);
    gain.gain.setValueAtTime(0, t0);
    gain.gain.linearRampToValueAtTime(volume, t0 + 0.01);
    gain.gain.exponentialRampToValueAtTime(0.001, t0 + duration);
    osc.connect(gain).connect(ctx.destination);
    osc.start(t0);
    osc.stop(t0 + duration + 0.05);
  }

  function playSweep(freqStart, freqEnd, duration, type = 'sine', volume = 0.2) {
    const ctx = getAudio();
    if (!ctx) return;
    const t0 = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freqStart, t0);
    osc.frequency.exponentialRampToValueAtTime(freqEnd, t0 + duration);
    gain.gain.setValueAtTime(0, t0);
    gain.gain.linearRampToValueAtTime(volume, t0 + 0.01);
    gain.gain.exponentialRampToValueAtTime(0.001, t0 + duration);
    osc.connect(gain).connect(ctx.destination);
    osc.start(t0);
    osc.stop(t0 + duration + 0.05);
  }

  function playNoise(duration, volume = 0.15) {
    const ctx = getAudio();
    if (!ctx) return;
    const t0 = ctx.currentTime;
    const bufferSize = Math.floor(ctx.sampleRate * duration);
    const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) data[i] = (Math.random() * 2 - 1);
    const src = ctx.createBufferSource();
    src.buffer = buffer;
    const gain = ctx.createGain();
    gain.gain.setValueAtTime(volume, t0);
    gain.gain.exponentialRampToValueAtTime(0.001, t0 + duration);
    const filt = ctx.createBiquadFilter();
    filt.type = 'highpass';
    filt.frequency.value = 1200;
    src.connect(filt).connect(gain).connect(ctx.destination);
    src.start(t0);
  }

  function sfxThrow() { playSweep(220, 660, 0.35, 'sine', 0.15); }
  function sfxThwap() { playNoise(0.08, 0.3); playTone(120, 0.1, 'sine', 0.25); }
  function sfxCorrect() {
    playTone(523.25, 0.15, 'triangle', 0.2, 0);    // C5
    playTone(659.25, 0.15, 'triangle', 0.2, 0.08); // E5
    playTone(783.99, 0.25, 'triangle', 0.2, 0.16); // G5
  }
  function sfxIncorrect() {
    playTone(220, 0.18, 'sawtooth', 0.12, 0);
    playTone(180, 0.25, 'sawtooth', 0.12, 0.1);
  }
  function sfxConfetti() {
    for (let i = 0; i < 6; i++) {
      const freq = 600 + Math.random() * 800;
      playTone(freq, 0.06, 'square', 0.05, i * 0.04);
    }
  }
  function sfxUmpireOut() {
    // A quick "OUT!" call: descending growl
    playSweep(180, 90, 0.45, 'sawtooth', 0.18);
  }

  // ---------- Game logic ----------
  function describeRunners(r) {
    const on = [];
    if (r[0]) on.push('1st');
    if (r[1]) on.push('2nd');
    if (r[2]) on.push('3rd');
    if (on.length === 0) return 'No girls are on base.';
    if (on.length === 1) return 'A girl is on ' + on[0] + '.';
    if (on.length === 2) return 'Girls are on ' + on.join(' and ') + '.';
    return 'A girl is on every base!';
  }

  function analyzePlay(runners) {
    const [r1, r2, r3] = runners;
    const valid = ['1B'];
    let best, bestWhy;
    if (!r1 && !r2 && !r3) { best = '1B'; bestWhy = 'No girls are on base. Throw to 1st to get the girl who hit the ball.'; return { valid, best, bestWhy }; }
    if (r1 && r2 && r3)    { valid.push('2B', '3B', 'Home'); best = 'Home'; bestWhy = 'Every girl must run! Touch home for a force out.'; return { valid, best, bestWhy }; }
    if (r1 && r2 && !r3)   { valid.push('2B', '3B'); best = '3B'; bestWhy = 'The girls on 1st and 2nd must run. Throw to 3rd for a force out.'; return { valid, best, bestWhy }; }
    if (r1 && !r2 && !r3)  { valid.push('2B'); best = '2B'; bestWhy = 'The girl on 1st must run. Throw to 2nd for a force out.'; return { valid, best, bestWhy }; }
    if (r1 && !r2 && r3)   { valid.push('2B'); best = '2B'; bestWhy = 'The girl on 1st must run. Throw to 2nd for a force out.'; return { valid, best, bestWhy }; }
    if (!r1 && r2 && !r3)  { best = '1B'; bestWhy = 'The girl on 2nd can stay. Throw to 1st for the easy out.'; return { valid, best, bestWhy }; }
    if (!r1 && !r2 && r3)  { best = '1B'; bestWhy = 'The girl on 3rd can stay. Throw to 1st for the easy out.'; return { valid, best, bestWhy }; }
    if (!r1 && r2 && r3)   { best = '1B'; bestWhy = 'No one is on 1st. The other girls can stay. Throw to 1st.'; return { valid, best, bestWhy }; }
    return { valid, best: '1B', bestWhy: 'Throw to 1st for the out.' };
  }

  function randomScenario() {
    const possibles = [
      [0,0,0], [1,0,0], [1,0,0], [0,1,0], [1,1,0], [1,1,0],
      [0,0,1], [1,0,1], [0,1,1], [1,1,1]
    ];
    const runners = possibles[Math.floor(Math.random() * possibles.length)];
    const outs = Math.floor(Math.random() * 3);
    return { runners, outs };
  }

  const NICE_WORDS = ['Yay!', 'Wow!', 'Yes!', 'Nice!', 'Good job!', 'Way to go!', 'Super!', 'Awesome!'];
  function nice() { return NICE_WORDS[Math.floor(Math.random() * NICE_WORDS.length)]; }

  // ---------- DOM helpers ----------
  const $ = (id) => document.getElementById(id);

  function freshen(el) {
    el.setAttribute('data-fresh', '1');
    setTimeout(() => el.removeAttribute('data-fresh'), 400);
  }

  // Safari iPad doesn't reliably toggle visibility via the .hidden property on SVG elements.
  // Use the attribute directly for SVG.
  function showSvg(id) { $(id).removeAttribute('hidden'); }
  function hideSvg(id) { $(id).setAttribute('hidden', ''); }

  function updateStatsDisplay() {
    $('stat-correct').textContent = state.stats.correct;
    $('stat-streak').textContent = state.stats.streak;
  }

  function updateMuteDisplay() {
    $('mute-icon').textContent = state.muted ? '🔇' : '🔊';
  }

  // ---------- Position picker ----------
  function buildPositionButtons() {
    const container = $('pos-buttons');
    container.innerHTML = '';
    Object.keys(POSITIONS).forEach((key) => {
      const btn = document.createElement('button');
      btn.className = 'pos-btn';
      btn.textContent = POSITIONS[key].name;
      btn.addEventListener('click', () => selectPosition(key));
      container.appendChild(btn);
    });
  }

  // ---------- Fielder ----------
  function placeFielder(x, y, color) {
    showSvg('fielder');
    $('fielder-shadow').setAttribute('cx', x);
    $('fielder-shadow').setAttribute('cy', y + 12);
    $('fielder-body').setAttribute('cx', x);
    $('fielder-body').setAttribute('cy', y + 2);
    $('fielder-body').setAttribute('fill', color);
    $('fielder-head').setAttribute('cx', x);
    $('fielder-head').setAttribute('cy', y - 8);
    $('fielder-hat').setAttribute('cx', x);
    $('fielder-hat').setAttribute('cy', y - 12);
    $('fielder-hat').setAttribute('fill', color);
    $('fielder-eye1').setAttribute('cx', x - 2);
    $('fielder-eye1').setAttribute('cy', y - 8);
    $('fielder-eye2').setAttribute('cx', x + 2);
    $('fielder-eye2').setAttribute('cy', y - 8);
    $('fielder-smile').setAttribute('d', 'M ' + (x - 2) + ' ' + (y - 5) + ' Q ' + x + ' ' + (y - 3) + ' ' + (x + 2) + ' ' + (y - 5));
    $('fielder-glove').setAttribute('cx', x + 8);
    $('fielder-glove').setAttribute('cy', y + 4);
  }

  // ---------- Runners ----------
  function drawRunner(x, y, idx) {
    const colors = ['#378ADD', '#185FA5', '#0C447C'];
    const skin = ['#FDD7B0', '#E0AC7E', '#C68B5A'];
    const g = document.createElementNS('http://www.w3.org/2000/svg', 'g');
    g.innerHTML =
      '<ellipse cx="' + x + '" cy="' + (y + 14) + '" rx="11" ry="3" fill="#000000" opacity="0.2"/>' +
      '<circle cx="' + x + '" cy="' + (y + 2) + '" r="9" fill="' + colors[idx] + '" stroke="#2C2C2A" stroke-width="1.8"/>' +
      '<circle cx="' + x + '" cy="' + (y - 7) + '" r="6" fill="' + skin[idx] + '" stroke="#2C2C2A" stroke-width="1.2"/>' +
      '<ellipse cx="' + x + '" cy="' + (y - 10) + '" rx="7" ry="2" fill="' + colors[idx] + '" stroke="#2C2C2A" stroke-width="1.2"/>' +
      '<circle cx="' + (x - 2) + '" cy="' + (y - 7) + '" r="1" fill="#2C2C2A"/>' +
      '<circle cx="' + (x + 2) + '" cy="' + (y - 7) + '" r="1" fill="#2C2C2A"/>';
    return g;
  }

  // ---------- Flow ----------
  function selectPosition(key) {
    state.position = key;
    $('pos-picker').hidden = true;
    $('change-pos-btn').hidden = false;
    const p = POSITIONS[key];
    placeFielder(p.x, p.y, p.color);
    if (!state.taughtPositions.has(key)) {
      showTeaching(key);
    } else {
      newScenario();
    }
  }

  function showTeaching(key) {
    const pos = POSITIONS[key];
    $('teach-title').textContent = pos.name;
    $('teach-body').textContent = pos.job + ' ' + pos.tip;
    $('teach-box').hidden = false;
    $('scenario-box').hidden = true;
    $('feedback-box').hidden = true;
    $('next-btn').hidden = true;
    hideSvg('throw-path');
    $('runners').innerHTML = '';
    freshen($('teach-box'));
  }

  function newScenario() {
    state.scenario = randomScenario();
    state.answered = false;
    $('feedback-box').hidden = true;
    $('next-btn').hidden = true;
    hideSvg('throw-path');
    hideSvg('flying-ball');
    $('celebration').innerHTML = '';
    hideSvg('celebration');

    const pos = POSITIONS[state.position];
    $('scenario-label').textContent = 'You play ' + pos.name;
    $('scenario-text').textContent = describeRunners(state.scenario.runners) + ' The ball comes to you! Where do you throw it?';
    $('scenario-box').hidden = false;
    freshen($('scenario-box'));

    const rg = $('runners');
    rg.innerHTML = '';
    const runnerPositions = [
      { on: state.scenario.runners[0], x: 300, y: 235, idx: 0 },
      { on: state.scenario.runners[1], x: 200, y: 135, idx: 1 },
      { on: state.scenario.runners[2], x: 100, y: 235, idx: 2 },
    ];
    runnerPositions.forEach((r) => {
      if (r.on) rg.appendChild(drawRunner(r.x, r.y, r.idx));
    });
  }

  // ---------- Throw animation ----------
  function animateThrow(fromX, fromY, toX, toY, isRight, onComplete) {
    const midX = (fromX + toX) / 2;
    const midY = Math.min(fromY, toY) - 70;
    const pathD = 'M ' + fromX + ' ' + fromY + ' Q ' + midX + ' ' + midY + ' ' + toX + ' ' + toY;

    const pathEl = $('throw-path');
    pathEl.setAttribute('d', pathD);
    pathEl.setAttribute('stroke', isRight ? '#1D9E75' : '#E24B4A');
    pathEl.removeAttribute('hidden');

    const ball = $('flying-ball');
    ball.removeAttribute('hidden');

    const totalLength = pathEl.getTotalLength();
    const duration = 700;
    const startTime = performance.now();

    sfxThrow();

    function step(now) {
      const t = Math.min((now - startTime) / duration, 1);
      const eased = 1 - Math.pow(1 - t, 2);
      const pt = pathEl.getPointAtLength(eased * totalLength);
      ball.setAttribute('transform', 'translate(' + pt.x + ' ' + pt.y + ')');
      if (t < 1) {
        requestAnimationFrame(step);
      } else {
        sfxThwap();
        if (onComplete) onComplete();
      }
    }
    requestAnimationFrame(step);
  }

  // ---------- Celebration ----------
  function celebrate(x, y) {
    const cel = $('celebration');
    cel.innerHTML = '';
    cel.removeAttribute('hidden');

    const out = document.createElementNS('http://www.w3.org/2000/svg', 'g');
    out.setAttribute('class', 'out-text');
    out.innerHTML =
      '<text x="' + x + '" y="' + y + '" text-anchor="middle" font-size="48" font-weight="900" ' +
      'fill="#FFFFFF" stroke="#E24B4A" stroke-width="4" paint-order="stroke" ' +
      'style="font-family: system-ui, sans-serif;">OUT!</text>';
    cel.appendChild(out);

    const starColors = ['#FFD700', '#FF6B9D', '#7F77DD', '#1D9E75', '#378ADD'];
    for (let i = 0; i < 8; i++) {
      const angle = (i / 8) * Math.PI * 2;
      const dist = 50 + Math.random() * 30;
      const sx = x + Math.cos(angle) * dist;
      const sy = y + Math.sin(angle) * dist;
      const color = starColors[i % starColors.length];
      const star = document.createElementNS('http://www.w3.org/2000/svg', 'g');
      star.setAttribute('class', 'star-piece');
      star.style.animationDelay = (i * 50) + 'ms';
      star.innerHTML =
        '<polygon points="' + sx + ',' + (sy - 10) + ' ' + (sx + 3) + ',' + (sy - 3) + ' ' +
        (sx + 10) + ',' + (sy - 3) + ' ' + (sx + 5) + ',' + (sy + 2) + ' ' +
        (sx + 7) + ',' + (sy + 10) + ' ' + sx + ',' + (sy + 5) + ' ' +
        (sx - 7) + ',' + (sy + 10) + ' ' + (sx - 5) + ',' + (sy + 2) + ' ' +
        (sx - 10) + ',' + (sy - 3) + ' ' + (sx - 3) + ',' + (sy - 3) + '" ' +
        'fill="' + color + '" stroke="#2C2C2A" stroke-width="1.5"/>';
      cel.appendChild(star);
    }

    const confettiColors = ['#FF6B9D', '#FFD700', '#7F77DD', '#1D9E75', '#378ADD', '#E24B4A', '#F4B942'];
    for (let i = 0; i < 22; i++) {
      const cx = x + (Math.random() - 0.5) * 60;
      const cy = y - 30;
      const color = confettiColors[Math.floor(Math.random() * confettiColors.length)];
      const dx = (Math.random() - 0.5) * 200;
      const delay = (Math.random() * 0.2).toFixed(3);
      const rotEnd = 360 + Math.floor(Math.random() * 360);

      // Use SVG native animation (SMIL) — works reliably on Safari iOS
      const g = document.createElementNS('http://www.w3.org/2000/svg', 'g');
      g.innerHTML =
        '<rect x="-3" y="-5" width="6" height="10" rx="1" fill="' + color + '">' +
          '<animateTransform attributeName="transform" type="translate" ' +
            'from="' + cx + ',' + cy + '" to="' + (cx + dx) + ',' + (cy + 220) + '" ' +
            'begin="' + delay + 's" dur="1.6s" fill="freeze" calcMode="spline" keySplines="0.42 0 1 1"/>' +
          '<animateTransform attributeName="transform" type="rotate" additive="sum" ' +
            'from="0" to="' + rotEnd + '" begin="' + delay + 's" dur="1.6s" fill="freeze"/>' +
          '<animate attributeName="opacity" from="1" to="0" ' +
            'begin="' + delay + 's" dur="1.6s" fill="freeze" calcMode="spline" keySplines="0.6 0 1 1"/>' +
        '</rect>';
      cel.appendChild(g);
    }

    // sounds
    sfxUmpireOut();
    setTimeout(() => sfxCorrect(), 200);
    setTimeout(() => sfxConfetti(), 350);

    setTimeout(() => {
      cel.setAttribute('hidden', '');
      cel.innerHTML = '';
    }, 2200);
  }

  // ---------- Click handler ----------
  function handleBaseClick(base) {
    if (state.answered || !state.position) return;
    state.answered = true;

    const analysis = analyzePlay(state.scenario.runners);
    const pos = POSITIONS[state.position];
    const target = BASE_COORDS[base];

    let right, headline, why, tip = '';
    if (state.level === 'basic') {
      right = analysis.valid.includes(base);
      if (right) {
        if (base === analysis.best) {
          headline = nice() + ' That is the best throw!';
          why = analysis.bestWhy;
        } else {
          headline = nice() + ' You got an out!';
          why = 'You got the girl out at ' + BASE_NAMES[base] + '. That is a good play!';
          if (analysis.best !== base) tip = 'Next time, try ' + BASE_NAMES[analysis.best] + '. It is even better!';
        }
      } else {
        headline = 'Oh no, that did not work.';
        why = 'That girl did not have to run. She is safe! Try ' + BASE_NAMES[analysis.best] + ' next time.';
      }
    } else {
      right = base === analysis.best;
      if (right) {
        headline = nice() + ' Best throw!';
        why = analysis.bestWhy;
      } else if (analysis.valid.includes(base)) {
        headline = 'You got an out, but ' + BASE_NAMES[analysis.best] + ' is the best.';
        why = analysis.bestWhy;
      } else {
        headline = 'Try ' + BASE_NAMES[analysis.best] + ' next time.';
        why = analysis.bestWhy;
      }
    }

    // Update stats
    if (right) {
      state.stats.correct += 1;
      state.stats.streak += 1;
      if (state.stats.streak > state.stats.bestStreak) state.stats.bestStreak = state.stats.streak;
    } else {
      state.stats.streak = 0;
      sfxIncorrect();
    }
    updateStatsDisplay();
    saveState();

    animateThrow(pos.x, pos.y, target.x, target.y, right, () => {
      const fb = $('feedback-box');
      fb.classList.remove('good', 'bad');
      fb.classList.add(right ? 'good' : 'bad');
      $('feedback-headline').textContent = headline;
      $('feedback-why').textContent = why;
      $('feedback-tip').textContent = tip;
      fb.hidden = false;
      freshen(fb);
      $('next-btn').hidden = false;
      if (right) celebrate(target.x, target.y - 10);
    });
  }

  // ---------- Event wiring ----------
  function init() {
    buildPositionButtons();
    updateStatsDisplay();
    updateMuteDisplay();

    // Level toggle
    document.querySelectorAll('.lvl-btn').forEach((btn) => {
      if (btn.dataset.level === state.level) {
        btn.classList.add('lvl-active');
        btn.setAttribute('aria-pressed', 'true');
      } else {
        btn.classList.remove('lvl-active');
        btn.setAttribute('aria-pressed', 'false');
      }
      btn.addEventListener('click', () => {
        state.level = btn.dataset.level;
        document.querySelectorAll('.lvl-btn').forEach((b) => {
          b.classList.toggle('lvl-active', b.dataset.level === state.level);
          b.setAttribute('aria-pressed', b.dataset.level === state.level ? 'true' : 'false');
        });
        saveState();
      });
    });

    // Mute
    $('mute-btn').addEventListener('click', () => {
      state.muted = !state.muted;
      updateMuteDisplay();
      saveState();
      if (!state.muted) {
        // unlock audio on tap
        getAudio();
        playTone(660, 0.08, 'sine', 0.15);
      }
    });

    // Reset stats — two-tap confirm to avoid accidental wipes
    let resetArmed = false;
    let resetTimer = null;
    const resetBtn = $('reset-btn');
    const resetIcon = $('reset-icon');
    resetBtn.addEventListener('click', () => {
      if (!resetArmed) {
        resetArmed = true;
        resetBtn.classList.add('confirm');
        resetIcon.textContent = 'Sure?';
        resetTimer = setTimeout(() => {
          resetArmed = false;
          resetBtn.classList.remove('confirm');
          resetIcon.textContent = '↻';
        }, 3000);
        return;
      }
      // Confirmed — wipe stats
      clearTimeout(resetTimer);
      state.stats = { correct: 0, streak: 0, bestStreak: 0 };
      updateStatsDisplay();
      saveState();
      resetArmed = false;
      resetBtn.classList.remove('confirm');
      resetIcon.textContent = '↻';
      playTone(440, 0.08, 'sine', 0.12);
      playTone(330, 0.12, 'sine', 0.12);
    });

    // Base clicks
    document.querySelectorAll('.base').forEach((el) => {
      el.addEventListener('click', () => handleBaseClick(el.dataset.base));
    });

    // Teach start
    $('teach-start-btn').addEventListener('click', () => {
      state.taughtPositions.add(state.position);
      saveState();
      $('teach-box').hidden = true;
      newScenario();
    });

    // Next play
    $('next-btn').addEventListener('click', () => newScenario());

    // Change position
    $('change-pos-btn').addEventListener('click', () => {
      state.position = null;
      $('pos-picker').hidden = false;
      $('change-pos-btn').hidden = true;
      $('teach-box').hidden = true;
      $('scenario-box').hidden = false;
      hideSvg('fielder');
      $('scenario-label').textContent = 'Play';
      $('scenario-text').textContent = 'Pick a position to play!';
      $('feedback-box').hidden = true;
      $('next-btn').hidden = true;
      hideSvg('throw-path');
      hideSvg('flying-ball');
      $('celebration').innerHTML = '';
      hideSvg('celebration');
      $('runners').innerHTML = '';
    });
  }

  // Boot
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
