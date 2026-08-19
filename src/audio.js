// Holiday background music — Web Audio only, no audio files.
// Christmas: upbeat music-box/bells "Jingle Bells" (public-domain melody, 1857).
// Halloween: original spooky carnival waltz (organ oom-pah-pah, minor key) —
// evocative of that style without reproducing any copyrighted melody.
// Each start() plays into its own bus, killed on stop(), so tracks can never overlap.
export function createHolidayAudio() {
  let ctx = null, master = null, bus = null, mode = null;
  const timers = [];

  function ensure() {
    if (ctx) return;
    ctx = new (window.AudioContext || window.webkitAudioContext)();
    master = ctx.createGain();
    master.gain.value = 1;
    const lp = ctx.createBiquadFilter();
    lp.type = 'lowpass'; lp.frequency.value = 6000;
    master.connect(lp); lp.connect(ctx.destination);
  }
  const midi = m => 440 * Math.pow(2, (m - 69) / 12);

  function newBus() {
    bus = ctx.createGain();
    bus.gain.setValueAtTime(0, ctx.currentTime);
    bus.gain.setTargetAtTime(1, ctx.currentTime, 0.4);
    bus.connect(master);
    return bus;
  }
  function killBus() {
    if (!bus) return;
    const b = bus;
    b.gain.setTargetAtTime(0, ctx.currentTime, 0.12);
    setTimeout(() => b.disconnect(), 900);   // everything scheduled into it dies with it
    bus = null;
  }

  // bright bell / music-box pluck
  function mb(dest, m, t, vel, dur = 1.6) {
    const f = midi(m);
    for (const [mult, amt] of [[1, 1], [3, 0.16], [5.4, 0.06]]) {
      const o = ctx.createOscillator();
      o.type = 'sine'; o.frequency.value = f * mult;
      const g = ctx.createGain();
      g.gain.setValueAtTime(0, t);
      g.gain.linearRampToValueAtTime(vel * amt, t + 0.004);
      g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
      o.connect(g); g.connect(dest);
      o.start(t); o.stop(t + dur + 0.1);
    }
  }

  // organ tone (sustained)
  function organ(dest, m, t, vel, dur) {
    const f = midi(m);
    for (const [mult, amt, type] of [[1, 1, 'triangle'], [2, 0.4, 'sine'], [3, 0.15, 'sine']]) {
      const o = ctx.createOscillator();
      o.type = type; o.frequency.value = f * mult;
      const g = ctx.createGain();
      g.gain.setValueAtTime(0, t);
      g.gain.linearRampToValueAtTime(vel * amt, t + 0.04);
      g.gain.setValueAtTime(vel * amt, t + dur - 0.08);
      g.gain.linearRampToValueAtTime(0.0001, t + dur);
      o.connect(g); g.connect(dest);
      o.start(t); o.stop(t + dur + 0.05);
    }
  }

  function noiseBurst(dest, t, vel, freq, dur, type = 'highpass') {
    const len = Math.max(1, Math.floor(ctx.sampleRate * dur));
    const buf = ctx.createBuffer(1, len, ctx.sampleRate);
    const d = buf.getChannelData(0);
    for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
    const src = ctx.createBufferSource();
    src.buffer = buf;
    const f = ctx.createBiquadFilter();
    f.type = type; f.frequency.value = freq;
    const g = ctx.createGain();
    g.gain.setValueAtTime(vel, t);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    src.connect(f); f.connect(g); g.connect(dest);
    src.start(t); src.stop(t + dur + 0.05);
  }

  // ---- JINGLE BELLS (PD, 1857) — bright bells, ~118 BPM, driving sleigh bells ----
  const JB_MELODY = [
    [64, 0.5], [64, 0.5], [64, 1], [64, 0.5], [64, 0.5], [64, 1],
    [64, 0.5], [67, 0.5], [60, 0.75], [62, 0.25], [64, 2],
    [65, 0.5], [65, 0.5], [65, 0.75], [65, 0.25], [65, 0.5], [64, 0.5], [64, 0.5], [64, 0.25], [64, 0.25],
    [64, 0.5], [62, 0.5], [62, 0.5], [64, 0.5], [62, 1], [67, 1],
    [64, 0.5], [64, 0.5], [64, 1], [64, 0.5], [64, 0.5], [64, 1],
    [64, 0.5], [67, 0.5], [60, 0.75], [62, 0.25], [64, 2],
    [65, 0.5], [65, 0.5], [65, 0.75], [65, 0.25], [65, 0.5], [64, 0.5], [64, 0.5], [64, 0.25], [64, 0.25],
    [67, 0.5], [67, 0.5], [65, 0.5], [62, 0.5], [60, 2],
  ];
  const JB_ROOTS = [48, 48, 48, 48, 53, 48, 55, 55, 48, 48, 48, 48, 53, 48, 55, 48];

  function scheduleXmas(myBus) {
    const BEAT = 60 / 118;
    let t = ctx.currentTime + 0.25, beats = 0;
    for (const [m, b] of JB_MELODY) {
      mb(myBus, m + 12, t, 0.08, Math.max(0.5, b * BEAT * 0.95 + 0.2));
      t += b * BEAT;
      beats += b;
    }
    // bouncy oom-pah bass per 2-beat measure
    let mt = ctx.currentTime + 0.25;
    const measures = Math.ceil(beats / 2);
    for (let i = 0; i < measures; i++) {
      const root = JB_ROOTS[i % JB_ROOTS.length];
      mb(myBus, root, mt, 0.055, 0.5);
      mb(myBus, root + 7, mt + BEAT, 0.035, 0.4);
      mb(myBus, root + 4, mt + BEAT, 0.025, 0.4);
      mt += 2 * BEAT;
    }
    // driving sleigh bells on eighths, accented on the beat
    let bt = ctx.currentTime + 0.25;
    for (let i = 0; i < beats * 2; i++) {
      noiseBurst(myBus, bt, i % 2 ? 0.014 : 0.028, 7200, 0.1);
      bt += BEAT / 2;
    }
    timers.push(setTimeout(() => {
      if (mode === 'xmas' && bus === myBus) scheduleXmas(myBus);
    }, (beats * BEAT + 0.8) * 1000));
  }

  // ---- HALLOWEEN — original spooky carnival waltz (D minor, organ oom-pah-pah) ----
  const HW_MELODY = [
    [74, 1], [77, 1], [81, 1], [79, 1], [77, 1], [76, 1], [77, 1], [74, 1], [73, 1], [74, 3],
    [69, 1], [74, 1], [77, 1], [76, 1], [74, 1], [73, 1], [74, 1], [76, 1], [77, 1], [76, 3],
    [70, 1], [74, 1], [79, 1], [77, 1], [76, 1], [74, 1], [73, 1], [74, 1], [76, 1], [69, 3],
    [74, 1], [73, 1], [74, 1], [77, 1], [76, 1], [73, 1], [74, 3], [74, 3],
  ];
  const HW_ROOTS = [50, 50, 50, 50, 45, 45, 50, 50, 46, 46, 45, 45, 50, 45, 50, 50];

  function scheduleHalloween(myBus) {
    const BEAT = 60 / 150;
    let t = ctx.currentTime + 0.25, beats = 0;
    for (const [m, b] of HW_MELODY) {
      organ(myBus, m, t, 0.035, Math.max(0.28, b * BEAT * 0.92));
      t += b * BEAT;
      beats += b;
    }
    // oom-pah-pah bass per 3-beat measure
    let mt = ctx.currentTime + 0.25;
    const measures = Math.ceil(beats / 3);
    for (let i = 0; i < measures; i++) {
      const root = HW_ROOTS[i % HW_ROOTS.length];
      organ(myBus, root - 12, mt, 0.06, 0.42);
      organ(myBus, root + 3, mt + BEAT, 0.026, 0.3);
      organ(myBus, root + 7, mt + BEAT, 0.022, 0.3);
      organ(myBus, root + 3, mt + 2 * BEAT, 0.026, 0.3);
      organ(myBus, root + 7, mt + 2 * BEAT, 0.022, 0.3);
      mt += 3 * BEAT;
    }
    // ghostly "ahh" choir pad following the harmony (theatrical, Nightmare-carnival energy)
    let pt = ctx.currentTime + 0.25;
    for (let i = 0; i < measures; i++) {
      const root = HW_ROOTS[i % HW_ROOTS.length];
      for (const iv of [12, 15, 19]) {
        const o = ctx.createOscillator();
        o.type = 'sine'; o.frequency.value = midi(root + iv);
        const v = ctx.createOscillator(); v.frequency.value = 4.6;
        const vg = ctx.createGain(); vg.gain.value = 6;
        v.connect(vg); vg.connect(o.detune);
        const g = ctx.createGain();
        g.gain.setValueAtTime(0, pt);
        g.gain.linearRampToValueAtTime(0.011, pt + BEAT);
        g.gain.linearRampToValueAtTime(0.0001, pt + 3 * BEAT);
        o.connect(g); g.connect(myBus);
        o.start(pt); o.stop(pt + 3 * BEAT + 0.1);
        v.start(pt); v.stop(pt + 3 * BEAT + 0.1);
      }
      pt += 3 * BEAT;
    }
    // a distant boom at each loop start for menace
    const t0 = ctx.currentTime + 0.3;
    const o = ctx.createOscillator();
    o.type = 'sine';
    o.frequency.setValueAtTime(80, t0);
    o.frequency.exponentialRampToValueAtTime(35, t0 + 1);
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.08, t0);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + 1.3);
    o.connect(g); g.connect(myBus);
    o.start(t0); o.stop(t0 + 1.4);
    timers.push(setTimeout(() => {
      if (mode === 'halloween' && bus === myBus) scheduleHalloween(myBus);
    }, (beats * BEAT + 0.6) * 1000));
  }

  return {
    get active() { return mode !== null; },
    async start(which) {
      ensure();
      if (ctx.state === 'suspended') await ctx.resume();
      if (mode === which) return;
      this.stop();
      mode = which;
      const myBus = newBus();
      if (which === 'xmas') scheduleXmas(myBus);
      else scheduleHalloween(myBus);
    },
    stop() {
      mode = null;
      for (const id of timers) clearTimeout(id);
      timers.length = 0;
      killBus();
    },
  };
}

// Five-star lobby trio — original generative jazz, Web Audio only.
// Piano comping + sparse right-hand melody, walking upright bass, soft brushes.
// Bright major-key voicings at ~92 BPM so it reads elegant, not somber.

export function createLobbyAudio() {
  let ctx = null, master = null, noiseBuf = null;
  let on = false, bar = 0, nextBarT = 0, schedTimer = null;

  const BPM = 92;
  const BEAT = 60 / BPM;
  const BAR = BEAT * 4;
  const SWING = 0.62;                       // offbeat placement within a beat

  const midi = m => 440 * Math.pow(2, (m - 69) / 12);
  const rnd = (a, b) => a + Math.random() * (b - a);
  const pick = arr => arr[Math.floor(Math.random() * arr.length)];

  // 8-bar progression in C major — I6/9 · vi9 · ii9 · V13 · iii7 · VI9 · ii9 · V13
  const PROG = [
    { bass: 36, chord: [55, 60, 62, 64, 67], pool: [72, 74, 76, 79, 81, 84] },  // C6/9
    { bass: 33, chord: [55, 57, 60, 64],     pool: [72, 76, 79, 81, 84] },      // Am9
    { bass: 38, chord: [53, 57, 60, 62, 65], pool: [74, 77, 81, 84, 86] },      // Dm9
    { bass: 31, chord: [53, 57, 59, 64],     pool: [74, 76, 79, 83, 84] },      // G13
    { bass: 40, chord: [52, 55, 59, 62],     pool: [76, 79, 83, 84, 88] },      // Em7
    { bass: 33, chord: [49, 55, 61, 64],     pool: [73, 76, 79, 81, 85] },      // A9
    { bass: 38, chord: [53, 57, 60, 62, 65], pool: [74, 77, 81, 84, 86] },      // Dm9
    { bass: 31, chord: [53, 57, 59, 64],     pool: [74, 76, 79, 83, 84] },      // G13
  ];

  function ensureCtx() {
    if (ctx) return;
    ctx = new (window.AudioContext || window.webkitAudioContext)();
    master = ctx.createGain();
    master.gain.value = 0;

    const lp = ctx.createBiquadFilter();
    lp.type = 'lowpass'; lp.frequency.value = 5200;

    // lush but tidy echo (room, not cathedral)
    const delay = ctx.createDelay(1);
    delay.delayTime.value = 0.36;
    const fb = ctx.createGain(); fb.gain.value = 0.26;
    const damp = ctx.createBiquadFilter();
    damp.type = 'lowpass'; damp.frequency.value = 2800;
    const wet = ctx.createGain(); wet.gain.value = 0.15;
    delay.connect(damp); damp.connect(fb); fb.connect(delay);
    master.connect(delay); delay.connect(wet);

    master.connect(lp); wet.connect(lp);
    lp.connect(ctx.destination);

    // shared brush-noise buffer
    const len = ctx.sampleRate * 0.3;
    noiseBuf = ctx.createBuffer(1, len, ctx.sampleRate);
    const d = noiseBuf.getChannelData(0);
    for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
  }

  // percussive piano tone: fast attack, natural decay, few harmonics
  function piano(m, t, vel, dur = 2.0) {
    const f = midi(m);
    const parts = [[1, 1, 'triangle'], [2, 0.32, 'sine'], [3.004, 0.1, 'sine']];
    for (const [mult, amt, type] of parts) {
      const o = ctx.createOscillator();
      o.type = type; o.frequency.value = f * mult;
      const g = ctx.createGain();
      g.gain.setValueAtTime(0, t);
      g.gain.linearRampToValueAtTime(vel * amt, t + 0.006);
      g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
      o.connect(g); g.connect(master);
      o.start(t); o.stop(t + dur + 0.05);
    }
  }

  // upright bass: round pluck
  function bassNote(m, t, vel = 0.11) {
    const f = midi(m);
    const o = ctx.createOscillator();
    o.type = 'sine'; o.frequency.value = f;
    const o2 = ctx.createOscillator();
    o2.type = 'triangle'; o2.frequency.value = f;
    const g = ctx.createGain(), g2 = ctx.createGain();
    g.gain.setValueAtTime(0, t);
    g.gain.linearRampToValueAtTime(vel, t + 0.015);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 0.55);
    g2.gain.setValueAtTime(0, t);
    g2.gain.linearRampToValueAtTime(vel * 0.25, t + 0.015);
    g2.gain.exponentialRampToValueAtTime(0.0001, t + 0.4);
    o.connect(g); o2.connect(g2); g.connect(master); g2.connect(master);
    o.start(t); o.stop(t + 0.7); o2.start(t); o2.stop(t + 0.6);
  }

  function brush(t, vel, freq = 7000, dur = 0.05, q = 1) {
    const src = ctx.createBufferSource();
    src.buffer = noiseBuf;
    const f = ctx.createBiquadFilter();
    f.type = freq > 5000 ? 'highpass' : 'bandpass';
    f.frequency.value = freq; f.Q.value = q;
    const g = ctx.createGain();
    g.gain.setValueAtTime(vel, t);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    src.connect(f); f.connect(g); g.connect(master);
    src.start(t); src.stop(t + dur + 0.05);
  }

  let lastMel = 79;
  function scheduleBar(idx, t0) {
    const C = PROG[idx % PROG.length];
    const N = PROG[(idx + 1) % PROG.length];
    const j = () => rnd(-0.008, 0.012);   // humanize

    // --- walking bass: root · color · color · approach-to-next ---
    const third = C.chord.find(n => [3, 4].includes((n - C.bass) % 12)) ?? C.bass + 4;
    const line = [
      C.bass,
      pick([C.bass + 7, third - 12 < 30 ? third : third - 12]),
      pick([C.bass + 7, C.bass + 4, C.bass + 5]),
      pick([N.bass + 1, N.bass - 1, C.bass + 7]),
    ];
    line.forEach((m, i) => bassNote(m, t0 + i * BEAT + j(), rnd(0.09, 0.12)));

    // --- brushes: swung ride + soft swish on 2 & 4 (very quiet) ---
    for (let b = 0; b < 4; b++) {
      brush(t0 + b * BEAT + j(), rnd(0.006, 0.009));
      if (b === 0 || b === 2) brush(t0 + (b + SWING) * BEAT + j(), rnd(0.004, 0.006));
      if (b === 1 || b === 3) brush(t0 + b * BEAT + j(), 0.005, 2600, 0.16, 0.7);
    }

    // --- piano comping: beat 1 + one syncopated answer ---
    const hit = (t, spread = 0.012) =>
      C.chord.forEach((m, i) => piano(m, t + i * spread, rnd(0.016, 0.023)));
    hit(t0 + j());
    hit(t0 + pick([1 + SWING, 2, 2 + SWING]) * BEAT + j(), 0.008);

    // --- sparse right-hand melody, swung ---
    if (Math.random() < 0.8) {
      const slots = [1, 1 + SWING, 2, 2 + SWING, 3, 3 + SWING].filter(() => Math.random() < 0.42);
      for (const s of slots.slice(0, 3)) {
        const near = C.pool.filter(n => Math.abs(n - lastMel) <= 5);
        const note = pick(near.length ? near : C.pool);
        lastMel = note;
        piano(note, t0 + s * BEAT + j(), rnd(0.024, 0.034), 1.4);
      }
    }
    // little turnaround run at the end of the cycle
    if (idx % PROG.length === PROG.length - 1 && Math.random() < 0.7) {
      const run = [...C.pool].sort(() => Math.random() - 0.5).slice(0, 4).sort((a, b) => b - a);
      run.forEach((m, i) => piano(m, t0 + (3 + i * 0.25) * BEAT + j(), 0.022, 1.0));
      lastMel = run[run.length - 1];
    }
  }

  function pump() {
    while (nextBarT < ctx.currentTime + 0.8) {
      scheduleBar(bar, Math.max(nextBarT, ctx.currentTime + 0.05));
      bar++;
      nextBarT += BAR;
    }
  }

  return {
    get on() { return on; },
    async start() {
      ensureCtx();
      if (ctx.state === 'suspended') await ctx.resume();
      if (on) return;
      on = true;
      master.gain.cancelScheduledValues(ctx.currentTime);
      master.gain.setTargetAtTime(0.9, ctx.currentTime, 1.0);
      bar = 0;
      nextBarT = ctx.currentTime + 0.1;
      pump();
      schedTimer = setInterval(pump, 180);
    },
    stop() {
      if (!on) return;
      on = false;
      clearInterval(schedTimer);
      master.gain.setTargetAtTime(0, ctx.currentTime, 0.35);
    },
    toggle() { return on ? (this.stop(), false) : (this.start(), true); },
  };
}
