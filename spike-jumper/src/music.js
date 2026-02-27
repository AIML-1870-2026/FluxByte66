// ============================================================
// MUSIC — Procedural dark gothic electronic music scheduler
// Web Audio API real-time scheduling (no audio files needed)
// ============================================================

// ──────────────────────────────────────────────────────────────
// Note frequencies (equal temperament, A4 = 440 Hz)
// ──────────────────────────────────────────────────────────────
const N = {
  // Sub-bass / bass register
  A1:  55.00, Bb1: 58.27,  B1:  61.74,
  C2:  65.41, Cs2: 69.30,  D2:  73.42, Eb2: 77.78, E2:  82.41,
  F2:  87.31, Fs2: 92.50,  G2:  98.00, Ab2: 103.83,
  A2: 110.00, Bb2: 116.54, B2: 123.47,
  // Mid register
  C3: 130.81, Cs3: 138.59, D3: 146.83, Eb3: 155.56, E3: 164.81,
  F3: 174.61, Fs3: 185.00, G3: 196.00, Ab3: 207.65,
  A3: 220.00, Bb3: 233.08, B3: 246.94,
  // Lead register
  C4: 261.63, D4: 293.66,  E4: 329.63, F4: 349.23,
  G4: 392.00, A4: 440.00,  B4: 493.88,
  C5: 523.25, D5: 587.33,  E5: 659.26,
};

// ──────────────────────────────────────────────────────────────
// Synth primitives — all schedule via Web Audio API
// ──────────────────────────────────────────────────────────────

function _kick(ctx, dest, t, vol) {
  const osc = ctx.createOscillator();
  const g   = ctx.createGain();
  osc.type = 'sine';
  osc.frequency.setValueAtTime(130, t);
  osc.frequency.exponentialRampToValueAtTime(0.001, t + 0.48);
  g.gain.setValueAtTime(vol * 2.2, t);
  g.gain.exponentialRampToValueAtTime(0.001, t + 0.44);
  osc.connect(g); g.connect(dest);
  osc.start(t); osc.stop(t + 0.52);

  // Click transient for punch
  const click = ctx.createOscillator();
  const cg    = ctx.createGain();
  click.frequency.value = 600;
  cg.gain.setValueAtTime(vol * 0.6, t);
  cg.gain.exponentialRampToValueAtTime(0.001, t + 0.012);
  click.connect(cg); cg.connect(dest);
  click.start(t); click.stop(t + 0.015);
}

function _snare(ctx, dest, t, vol) {
  // Noise layer
  const sz  = Math.ceil(ctx.sampleRate * 0.18);
  const buf = ctx.createBuffer(1, sz, ctx.sampleRate);
  const d   = buf.getChannelData(0);
  for (let i = 0; i < sz; i++) d[i] = Math.random() * 2 - 1;
  const nSrc = ctx.createBufferSource();
  nSrc.buffer = buf;
  const bpf = ctx.createBiquadFilter();
  bpf.type = 'bandpass'; bpf.frequency.value = 2400; bpf.Q.value = 0.9;
  const ng = ctx.createGain();
  ng.gain.setValueAtTime(vol * 0.9, t);
  ng.gain.exponentialRampToValueAtTime(0.001, t + 0.14);
  nSrc.connect(bpf); bpf.connect(ng); ng.connect(dest);
  nSrc.start(t); nSrc.stop(t + 0.18);

  // Tonal body
  const osc = ctx.createOscillator();
  osc.type = 'triangle';
  osc.frequency.setValueAtTime(210, t);
  osc.frequency.exponentialRampToValueAtTime(65, t + 0.1);
  const og = ctx.createGain();
  og.gain.setValueAtTime(vol * 0.4, t);
  og.gain.exponentialRampToValueAtTime(0.001, t + 0.1);
  osc.connect(og); og.connect(dest);
  osc.start(t); osc.stop(t + 0.12);
}

function _rimshot(ctx, dest, t, vol) {
  // Lighter rim hit for bridge sections
  const osc = ctx.createOscillator();
  osc.type = 'triangle';
  osc.frequency.setValueAtTime(400, t);
  osc.frequency.exponentialRampToValueAtTime(200, t + 0.05);
  const g = ctx.createGain();
  g.gain.setValueAtTime(vol * 0.5, t);
  g.gain.exponentialRampToValueAtTime(0.001, t + 0.06);
  osc.connect(g); g.connect(dest);
  osc.start(t); osc.stop(t + 0.08);
}

function _hat(ctx, dest, t, vol, open = false) {
  const dur = open ? 0.22 : 0.038;
  const sz  = Math.ceil(ctx.sampleRate * (open ? 0.25 : 0.05));
  const buf = ctx.createBuffer(1, sz, ctx.sampleRate);
  const d   = buf.getChannelData(0);
  for (let i = 0; i < sz; i++) d[i] = Math.random() * 2 - 1;
  const src = ctx.createBufferSource();
  src.buffer = buf;
  const hpf = ctx.createBiquadFilter();
  hpf.type = 'highpass'; hpf.frequency.value = 8500;
  const g = ctx.createGain();
  g.gain.setValueAtTime(vol, t);
  g.gain.exponentialRampToValueAtTime(0.001, t + dur);
  src.connect(hpf); hpf.connect(g); g.connect(dest);
  src.start(t); src.stop(t + dur + 0.01);
}

function _bass(ctx, dest, t, freq, dur, vol) {
  if (!freq) return;
  // Sawtooth through resonant lowpass — dark synth bass
  const osc1 = ctx.createOscillator();
  const osc2 = ctx.createOscillator();
  osc1.type = 'sawtooth'; osc2.type = 'sawtooth';
  osc1.frequency.value = freq;
  osc2.frequency.value = freq * 1.007; // slight detune for thickness

  const lpf = ctx.createBiquadFilter();
  lpf.type = 'lowpass';
  lpf.frequency.setValueAtTime(1600, t);
  lpf.frequency.exponentialRampToValueAtTime(320, t + dur * 0.8);
  lpf.Q.value = 8;

  const g = ctx.createGain();
  g.gain.setValueAtTime(0.001, t);
  g.gain.linearRampToValueAtTime(vol, t + 0.007);
  g.gain.setValueAtTime(vol * 0.68, t + dur * 0.55);
  g.gain.exponentialRampToValueAtTime(0.001, t + dur);

  osc1.connect(lpf); osc2.connect(lpf);
  lpf.connect(g); g.connect(dest);
  osc1.start(t); osc2.start(t);
  osc1.stop(t + dur + 0.05); osc2.stop(t + dur + 0.05);
}

function _pad(ctx, dest, t, freqs, dur, vol) {
  // Sine-wave chord pad with slow attack — atmospheric
  for (const freq of freqs) {
    for (const detune of [1.0, 1.003, 0.998]) {
      const osc = ctx.createOscillator();
      osc.type = 'sine';
      osc.frequency.value = freq * detune;
      const lpf = ctx.createBiquadFilter();
      lpf.type = 'lowpass'; lpf.frequency.value = 1100;
      const g = ctx.createGain();
      const att = Math.min(dur * 0.22, 0.55);
      const rel = Math.min(dur * 0.32, 1.1);
      g.gain.setValueAtTime(0, t);
      g.gain.linearRampToValueAtTime(vol, t + att);
      g.gain.setValueAtTime(vol, t + dur - rel);
      g.gain.linearRampToValueAtTime(0, t + dur);
      osc.connect(lpf); lpf.connect(g); g.connect(dest);
      osc.start(t); osc.stop(t + dur + 0.1);
    }
  }
}

function _stab(ctx, dest, t, freqs, vol) {
  // Short punchy chord stab for chorus accents
  const dur = 0.18;
  for (const freq of freqs) {
    const osc = ctx.createOscillator();
    osc.type = 'sawtooth';
    osc.frequency.value = freq;
    const lpf = ctx.createBiquadFilter();
    lpf.type = 'lowpass';
    lpf.frequency.setValueAtTime(3000, t);
    lpf.frequency.exponentialRampToValueAtTime(600, t + dur);
    lpf.Q.value = 3;
    const g = ctx.createGain();
    g.gain.setValueAtTime(vol, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + dur);
    osc.connect(lpf); lpf.connect(g); g.connect(dest);
    osc.start(t); osc.stop(t + dur + 0.02);
  }
}

function _lead(ctx, dest, t, freq, dur, vol) {
  if (!freq) return;
  const osc = ctx.createOscillator();
  osc.type = 'square';
  osc.frequency.value = freq;
  const lpf = ctx.createBiquadFilter();
  lpf.type = 'lowpass';
  lpf.frequency.setValueAtTime(2800, t);
  lpf.frequency.exponentialRampToValueAtTime(750, t + dur);
  lpf.Q.value = 2.5;
  // Slight vibrato via LFO
  const lfo = ctx.createOscillator();
  const lfoG = ctx.createGain();
  lfo.frequency.value = 5.5;
  lfoG.gain.value = freq * 0.012;
  lfo.connect(lfoG); lfoG.connect(osc.frequency);
  lfo.start(t); lfo.stop(t + dur + 0.05);

  const g = ctx.createGain();
  g.gain.setValueAtTime(0.001, t);
  g.gain.linearRampToValueAtTime(vol, t + 0.005);
  g.gain.setValueAtTime(vol * 0.6, t + dur * 0.5);
  g.gain.exponentialRampToValueAtTime(0.001, t + dur);
  osc.connect(lpf); lpf.connect(g); g.connect(dest);
  osc.start(t); osc.stop(t + dur + 0.05);
}

// ──────────────────────────────────────────────────────────────
// Track definitions — chord progressions, bass lines, lead melodies
// ──────────────────────────────────────────────────────────────

const TRACKS = {
  the_awakening: {
    bpm: 100,
    // 4-bar chord loop (one chord per bar)
    chordsVerse:  [[N.A2,N.C3,N.E3], [N.G2,N.B2,N.D3], [N.F2,N.A2,N.C3], [N.E2,N.G2,N.B2]],
    chordsChorus: [[N.A2,N.C3,N.E3], [N.D2,N.F2,N.A2], [N.G2,N.B2,N.D3], [N.E2,N.G2,N.B2]],
    // Bass: array of 2-bar patterns, each bar = 4 quarter-note slots (0 = rest)
    bassVerse:    [ [N.A1, 0,    N.E2, N.G2], [N.C2, 0, N.D2, N.E2] ],
    bassChorus:   [ [N.A1, N.C2, N.E2, N.G2], [N.A1, N.D2, N.E2, N.G2] ],
    // Lead melody (4 notes / bar)
    leadMelody:   [
      [N.A3, 0,    N.C4, N.E4],
      [N.E4, N.D4, N.C4, 0   ],
      [N.A3, N.C4, 0,    N.E4],
      [N.G4, N.E4, N.D4, N.A3],
    ],
  },
  void_march: {
    bpm: 120,
    chordsVerse:  [[N.A2,N.C3,N.E3], [N.G2,N.B2,N.D3], [N.F2,N.A2,N.C3], [N.E2,N.G2,N.B2]],
    chordsChorus: [[N.A2,N.C3,N.E3], [N.F2,N.A2,N.C3], [N.G2,N.B2,N.D3], [N.A2,N.C3,N.E3]],
    bassVerse:    [ [N.A1, N.A1, N.E2, N.G2], [N.C2, N.D2, N.E2, N.D2] ],
    bassChorus:   [ [N.A1, N.C2, N.D2, N.E2], [N.G2, N.E2, N.D2, N.C2] ],
    leadMelody:   [
      [N.E4, N.D4, N.C4, N.A3],
      [N.A3, N.C4, N.E4, N.G4],
      [N.G4, N.E4, N.D4, N.C4],
      [N.A3, 0,    N.C4, N.E4],
    ],
  },
  crimson_descent: {
    bpm: 135,
    chordsVerse:  [[N.A2,N.C3,N.E3], [N.G2,N.B2,N.D3], [N.F2,N.A2,N.C3], [N.G2,N.B2,N.D3]],
    chordsChorus: [[N.A2,N.C3,N.E3], [N.D2,N.F2,N.A2], [N.E2,N.G2,N.B2], [N.A2,N.C3,N.E3]],
    bassVerse:    [ [N.A1, 0, N.A1, N.G2], [N.C2, N.D2, N.E2, 0] ],
    bassChorus:   [ [N.A1, N.C2, N.E2, N.A1], [N.G2, N.E2, N.D2, N.C2] ],
    leadMelody:   [
      [N.A4, N.G4, N.E4, N.D4],
      [N.C4, N.D4, N.E4, N.A4],
      [N.E4, 0,    N.G4, N.A4],
      [N.D4, N.C4, N.A3, 0   ],
    ],
  },
  gothic_pulse: {
    bpm: 150,
    chordsVerse:  [[N.E2,N.G2,N.B2], [N.D2,N.F2,N.A2], [N.C2,N.E2,N.G2], [N.B1,N.D2,N.F2]],
    chordsChorus: [[N.A2,N.C3,N.E3], [N.G2,N.B2,N.D3], [N.A2,N.C3,N.E3], [N.E2,N.G2,N.B2]],
    bassVerse:    [ [N.E2, 0, N.B2, N.D3], [N.A1, N.B1, N.C2, N.D2] ],
    bassChorus:   [ [N.E2, N.G2, N.B2, N.E2], [N.A1, N.C2, N.E2, N.G2] ],
    leadMelody:   [
      [N.E4, N.G4, N.A4, N.G4],
      [N.E4, N.D4, N.C4, N.B3],
      [N.A4, N.G4, N.E4, N.D4],
      [N.C4, N.B3, N.A3, 0   ],
    ],
  },
  necrospace: {
    bpm: 165,
    chordsVerse:  [[N.A2,N.C3,N.E3], [N.G2,N.Bb2,N.D3], [N.F2,N.A2,N.C3], [N.E2,N.G2,N.B2]],
    chordsChorus: [[N.A2,N.C3,N.E3], [N.A2,N.C3,N.E3],  [N.G2,N.B2,N.D3], [N.E2,N.G2,N.B2]],
    bassVerse:    [ [N.A1, N.A1, N.G2, N.A1], [N.C2, N.D2, N.E2, N.C2] ],
    bassChorus:   [ [N.A1, N.C2, N.E2, N.G2], [N.A1, N.A1, N.G2, N.E2] ],
    leadMelody:   [
      [N.A4, N.G4, N.E4, N.A4],
      [N.C5, N.A4, N.G4, N.E4],
      [N.E4, N.G4, N.A4, N.C5],
      [N.A4, 0,    N.G4, N.E4],
    ],
  },
  endless_void: {
    bpm: 170,
    chordsVerse:  [[N.A2,N.C3,N.E3], [N.G2,N.B2,N.D3], [N.F2,N.A2,N.C3], [N.E2,N.G2,N.B2]],
    chordsChorus: [[N.A2,N.C3,N.E3], [N.D2,N.F2,N.A2], [N.G2,N.B2,N.D3], [N.E2,N.G2,N.B2]],
    bassVerse:    [ [N.A1, N.A1, N.E2, N.A1], [N.G2, N.E2, N.D2, N.C2] ],
    bassChorus:   [ [N.A1, N.C2, N.E2, N.G2], [N.A1, N.G2, N.E2, N.D2] ],
    leadMelody:   [
      [N.E4, N.G4, N.A4, N.C5],
      [N.A4, N.G4, N.E4, N.D4],
      [N.C4, N.D4, N.E4, N.G4],
      [N.A4, 0,    N.C5, N.A4],
    ],
  },
};

// Fallback if track not found
TRACKS['default'] = TRACKS['the_awakening'];

// ──────────────────────────────────────────────────────────────
// Music Scheduler
// ──────────────────────────────────────────────────────────────

export class MusicScheduler {
  /**
   * @param {AudioContext} ctx
   * @param {AudioNode}    dest      — gain node to connect music to
   * @param {string}       trackId   — matches beatmap track_id
   * @param {Array}        sections  — beatmap sections array
   */
  constructor(ctx, dest, trackId, sections) {
    this.ctx      = ctx;
    this.dest     = dest;
    this.trackId  = trackId;
    this.sections = sections || [];
    this.def      = TRACKS[trackId] || TRACKS['default'];

    const bpm     = this.def.bpm;
    this.beatDur  = 60 / bpm;
    this.barDur   = this.beatDur * 4; // 4/4 time

    this._startTime    = 0;
    this._nextBarTime  = 0;
    this._barCount     = 0;
    this._running      = false;
    this._timerId      = null;

    this.LOOKAHEAD      = 0.25;  // seconds to schedule ahead
    this.TICK_MS        = 40;    // scheduler interval in ms
  }

  start() {
    this.stop();
    this._startTime   = this.ctx.currentTime;
    this._nextBarTime = this._startTime;
    this._barCount    = 0;
    this._running     = true;
    this._tick();
  }

  stop() {
    this._running = false;
    if (this._timerId !== null) {
      clearTimeout(this._timerId);
      this._timerId = null;
    }
  }

  // ── Internal ────────────────────────────────────────────────

  _tick() {
    if (!this._running) return;

    while (this._nextBarTime < this.ctx.currentTime + this.LOOKAHEAD + this.barDur) {
      this._scheduleBar(this._barCount, this._nextBarTime);
      this._barCount++;
      this._nextBarTime += this.barDur;
    }

    this._timerId = setTimeout(() => this._tick(), this.TICK_MS);
  }

  _getSectionLabel(barStartTime) {
    const msOffset = (barStartTime - this._startTime) * 1000;
    for (const sec of this.sections) {
      if (msOffset >= sec.start_ms && msOffset < sec.end_ms) return sec.label;
    }
    return 'outro';
  }

  _scheduleBar(barIdx, t) {
    const section  = this._getSectionLabel(t);
    const bd       = this.beatDur;
    const bard     = this.barDur;
    const isIntro  = section === 'intro';
    const isVerse  = section === 'verse';
    const isChorus = section === 'chorus';
    const isBridge = section === 'bridge';
    const isOutro  = section === 'outro';

    // Volume envelope — fade in first 4 bars, fade out last 4 bars
    const fadeIn  = Math.min(1, barIdx / 4);
    const totalBars = this._totalBars();
    const fadeOut = Math.min(1, Math.max(0, (totalBars - barIdx) / 4));
    const vol     = fadeIn * fadeOut;

    if (vol <= 0) return;

    // ── DRUMS ──────────────────────────────────────────────────
    if (!isIntro && !isBridge) {
      // Kick
      const kickPat = this._kickPat(section);
      for (let s = 0; s < 16; s++) {
        if (kickPat[s]) _kick(this.ctx, this.dest, t + s * bd / 4, kickPat[s] * vol * 1.1);
      }
      // Snare on beats 2 and 4
      _snare(this.ctx, this.dest, t + bd,     vol * 0.75);
      _snare(this.ctx, this.dest, t + bd * 3, vol * 0.85);
      // Hi-hat
      const hatStep = isChorus ? bd / 4 : bd / 2;
      for (let ht = 0; ht < bard; ht += hatStep) {
        const onBeat = Math.round(ht / (bd / 8)) % 2 === 0;
        _hat(this.ctx, this.dest, t + ht, (onBeat ? 0.28 : 0.16) * vol);
      }
    } else if (isBridge) {
      // Rimshot for bridge
      _rimshot(this.ctx, this.dest, t + bd,     vol * 0.4);
      _rimshot(this.ctx, this.dest, t + bd * 3, vol * 0.4);
      // Sparse hi-hat
      for (let i = 0; i < 4; i++) {
        _hat(this.ctx, this.dest, t + i * bd, vol * 0.15);
      }
    } else {
      // Intro: very sparse — just a soft hat on beat 1
      _hat(this.ctx, this.dest, t, vol * 0.12);
    }

    // ── BASS ───────────────────────────────────────────────────
    if (!isIntro && !isBridge && !isOutro) {
      const bassLoop = isChorus ? this.def.bassChorus : this.def.bassVerse;
      const barPat   = bassLoop[barIdx % bassLoop.length];
      const noteDur  = isChorus ? bd * 0.82 : bd * 0.88;
      for (let i = 0; i < 4; i++) {
        const freq = barPat[i];
        if (freq) _bass(this.ctx, this.dest, t + i * bd, freq, noteDur, 0.52 * vol);
      }
    } else if (isBridge) {
      // Single long bass note per bar for atmosphere
      const bassLoop = this.def.bassVerse;
      const freq = bassLoop[barIdx % bassLoop.length][0];
      if (freq) _bass(this.ctx, this.dest, t, freq, bard * 0.9, 0.3 * vol);
    }

    // ── PADS ───────────────────────────────────────────────────
    const chords  = isChorus ? this.def.chordsChorus : this.def.chordsVerse;
    const chord   = chords[barIdx % chords.length];
    const padVol  = isChorus ? 0.11 : isVerse ? 0.075 : 0.055;
    _pad(this.ctx, this.dest, t, chord, bard, padVol * vol);

    // ── CHORD STABS (chorus only) ─────────────────────────────
    if (isChorus) {
      // Stab on beat 1 and sometimes beat 3
      _stab(this.ctx, this.dest, t, chord, 0.18 * vol);
      if (barIdx % 2 === 1) {
        _stab(this.ctx, this.dest, t + bd * 2, chord, 0.12 * vol);
      }
    }

    // ── LEAD MELODY (chorus + late verse) ────────────────────
    if (isChorus || (isVerse && barIdx > 8)) {
      const pat  = this.def.leadMelody;
      const line = pat[barIdx % pat.length];
      const leadDur = bd * 0.78;
      const leadVol = isChorus ? 0.28 : 0.14;
      for (let i = 0; i < 4; i++) {
        if (line[i]) _lead(this.ctx, this.dest, t + i * bd, line[i], leadDur, leadVol * vol);
      }
    }
  }

  _kickPat(section) {
    if (section === 'chorus') {
      // 4-on-floor in chorus
      return [1,0,0,0, 1,0,0,0, 1,0,0,0, 1,0,0,0];
    }
    // Verse: kick on beats 1 and 3, ghost kick on "and of 2"
    return [1,0,0,0, 0,0,1,0, 1,0,0,0, 0,0,1,0];
  }

  _totalBars() {
    if (!this.sections || !this.sections.length) return 50;
    const last = this.sections[this.sections.length - 1];
    return Math.ceil((last.end_ms / 1000) / this.barDur);
  }
}
