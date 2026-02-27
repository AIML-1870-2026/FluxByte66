// ============================================================
// AUDIO — Web Audio API wrapper
// ============================================================

export class AudioEngine {
  constructor() {
    this.ctx         = null;
    this.musicGain   = null;
    this.sfxGain     = null;
    this.musicSource = null;
    this.musicBuffer = null;
    this.startTime   = 0;    // AudioContext time when music started
    this.sfxPool     = [];
    this.sfxBuffers  = {};
    this.musicVol    = 0.8;
    this.sfxVol      = 0.7;
    this._started    = false;
  }

  async init() {
    this.ctx = new (window.AudioContext || window.webkitAudioContext)();
    this.musicGain = this.ctx.createGain();
    this.musicGain.gain.value = this.musicVol;
    this.musicGain.connect(this.ctx.destination);

    this.sfxGain = this.ctx.createGain();
    this.sfxGain.gain.value = this.sfxVol;
    this.sfxGain.connect(this.ctx.destination);

    // Pre-generate procedural SFX
    this._genSFX();
  }

  /** Resume AudioContext (required after user gesture) */
  async resume() {
    if (this.ctx && this.ctx.state === 'suspended') {
      await this.ctx.resume();
    }
  }

  setMusicVol(v) {
    this.musicVol = v;
    if (this.musicGain) this.musicGain.gain.value = v;
  }

  setSfxVol(v) {
    this.sfxVol = v;
    if (this.sfxGain) this.sfxGain.gain.value = v;
  }

  // --------------------------------------------------------
  // Music playback
  // --------------------------------------------------------

  /** Load an audio buffer from a URL (optional — falls back to procedural) */
  async loadMusic(url) {
    try {
      const res  = await fetch(url);
      const data = await res.arrayBuffer();
      this.musicBuffer = await this.ctx.decodeAudioData(data);
      return true;
    } catch { return false; }
  }

  playMusic(buffer = null) {
    this.stopMusic();
    const src = this.ctx.createBufferSource();
    src.buffer = buffer || this.musicBuffer || this._makeProceduralDrone();
    src.loop   = false;
    src.connect(this.musicGain);
    this.startTime   = this.ctx.currentTime;
    this._started    = true;
    src.start(0);
    this.musicSource = src;
  }

  stopMusic() {
    if (this.musicSource) {
      try { this.musicSource.stop(); } catch {}
      this.musicSource = null;
    }
    this._started = false;
  }

  /** Current playback position in milliseconds */
  get currentTimeMs() {
    if (!this._started || !this.ctx) return 0;
    return (this.ctx.currentTime - this.startTime) * 1000;
  }

  // --------------------------------------------------------
  // SFX
  // --------------------------------------------------------

  playSFX(name) {
    const buf = this.sfxBuffers[name];
    if (!buf || !this.ctx) return;
    const src = this.ctx.createBufferSource();
    src.buffer = buf;
    src.connect(this.sfxGain);
    src.start(0);
  }

  // --------------------------------------------------------
  // Procedural SFX generation via Web Audio API
  // --------------------------------------------------------

  _genSFX() {
    const c = this.ctx;
    const SR = c.sampleRate;

    const make = (fn) => {
      const buf = c.createBuffer(1, SR * 0.5, SR);
      fn(buf.getChannelData(0), SR);
      return buf;
    };

    // jump — short upward pitch synth blip
    this.sfxBuffers['jump'] = make((d, sr) => {
      for (let i = 0; i < d.length; i++) {
        const t = i / sr;
        const freq = 440 + t * 800;
        d[i] = Math.sin(2 * Math.PI * freq * t) * Math.max(0, 1 - t * 20);
      }
    });

    // double_jump — higher version
    this.sfxBuffers['double_jump'] = make((d, sr) => {
      for (let i = 0; i < d.length; i++) {
        const t = i / sr;
        const freq = 660 + t * 1200;
        d[i] = Math.sin(2 * Math.PI * freq * t) * Math.max(0, 1 - t * 18);
      }
    });

    // land — low thud
    this.sfxBuffers['land'] = make((d, sr) => {
      for (let i = 0; i < d.length; i++) {
        const t = i / sr;
        const freq = 80 - t * 60;
        d[i] = Math.sin(2 * Math.PI * Math.max(20, freq) * t) * Math.max(0, 1 - t * 25)
             + (Math.random() * 2 - 1) * 0.3 * Math.max(0, 0.05 - t) * 20;
      }
    });

    // slide — swoosh
    this.sfxBuffers['slide'] = make((d, sr) => {
      for (let i = 0; i < d.length; i++) {
        const t = i / sr;
        const freq = 600 - t * 500;
        d[i] = Math.sin(2 * Math.PI * Math.max(50, freq) * t) * Math.max(0, 1 - t * 15) * 0.6;
      }
    });

    // perfect — bright ping + bass hit
    this.sfxBuffers['perfect'] = make((d, sr) => {
      for (let i = 0; i < d.length; i++) {
        const t = i / sr;
        d[i] = Math.sin(2 * Math.PI * 880 * t) * Math.max(0, 1 - t * 10)
             + Math.sin(2 * Math.PI * 110 * t) * Math.max(0, 1 - t * 8) * 0.5;
      }
    });

    // good — softer ping
    this.sfxBuffers['good'] = make((d, sr) => {
      for (let i = 0; i < d.length; i++) {
        const t = i / sr;
        d[i] = Math.sin(2 * Math.PI * 660 * t) * Math.max(0, 1 - t * 12) * 0.5;
      }
    });

    // combo_break — deflate blip
    this.sfxBuffers['combo_break'] = make((d, sr) => {
      for (let i = 0; i < d.length; i++) {
        const t = i / sr;
        const freq = 300 - t * 250;
        d[i] = Math.sin(2 * Math.PI * Math.max(50, freq) * t) * Math.max(0, 1 - t * 20) * 0.6;
      }
    });

    // combo_up — short ascending arpeggio
    this.sfxBuffers['combo_up'] = make((d, sr) => {
      const notes = [330, 440, 550];
      for (let i = 0; i < d.length; i++) {
        const t = i / sr;
        const ni = Math.min(notes.length - 1, Math.floor(t / 0.04));
        d[i] = Math.sin(2 * Math.PI * notes[ni] * t) * Math.max(0, 1 - (t % 0.04) * 40) * 0.5;
      }
    });

    // laser_charge — rising whine
    this.sfxBuffers['laser_charge'] = make((d, sr) => {
      for (let i = 0; i < d.length; i++) {
        const t = i / sr;
        const freq = 200 + t * 600;
        d[i] = Math.sin(2 * Math.PI * freq * t) * Math.min(1, t * 5) * 0.4;
      }
    });

    // laser_fire — sharp zap
    this.sfxBuffers['laser_fire'] = make((d, sr) => {
      for (let i = 0; i < d.length; i++) {
        const t = i / sr;
        d[i] = (Math.random() * 2 - 1) * Math.max(0, 1 - t * 30)
             + Math.sin(2 * Math.PI * 1000 * t) * Math.max(0, 1 - t * 20) * 0.3;
      }
    });

    // enemy_death — pop + zap
    this.sfxBuffers['enemy_death'] = make((d, sr) => {
      for (let i = 0; i < d.length; i++) {
        const t = i / sr;
        d[i] = (Math.random() * 2 - 1) * Math.max(0, 0.1 - t) * 10
             + Math.sin(2 * Math.PI * 400 * t) * Math.max(0, 1 - t * 25) * 0.4;
      }
    });

    // player_hit
    this.sfxBuffers['player_hit'] = make((d, sr) => {
      for (let i = 0; i < d.length; i++) {
        const t = i / sr;
        d[i] = (Math.random() * 2 - 1) * Math.max(0, 1 - t * 15) * 0.8;
      }
    });

    // player_death — descending crash
    this.sfxBuffers['player_death'] = make((d, sr) => {
      for (let i = 0; i < d.length; i++) {
        const t = i / sr;
        const freq = 300 - t * 250;
        d[i] = (Math.random() * 2 - 1) * Math.max(0, 1 - t * 4) * 0.5
             + Math.sin(2 * Math.PI * Math.max(20, freq) * t) * Math.max(0, 1 - t * 4) * 0.5;
      }
    });

    // level_complete — 4-note fanfare
    this.sfxBuffers['level_complete'] = make((d, sr) => {
      const notes = [330, 440, 550, 660];
      for (let i = 0; i < d.length; i++) {
        const t = i / sr;
        const ni = Math.min(notes.length - 1, Math.floor(t / 0.08));
        d[i] = Math.sin(2 * Math.PI * notes[ni] * t) * Math.max(0, 1 - (t % 0.08) * 8) * 0.6;
      }
    });

    // menu_select / menu_confirm
    this.sfxBuffers['menu_select'] = make((d, sr) => {
      for (let i = 0; i < d.length; i++) {
        const t = i / sr;
        d[i] = Math.sin(2 * Math.PI * 440 * t) * Math.max(0, 1 - t * 30) * 0.3;
      }
    });
    this.sfxBuffers['menu_confirm'] = make((d, sr) => {
      for (let i = 0; i < d.length; i++) {
        const t = i / sr;
        d[i] = Math.sin(2 * Math.PI * 660 * t) * Math.max(0, 1 - t * 25) * 0.4;
      }
    });
  }

  /** Generate a procedural dark drone for levels without audio files */
  _makeProceduralDrone() {
    const c  = this.ctx;
    const SR = c.sampleRate;
    const DUR = 180; // 3 minutes
    const buf = c.createBuffer(2, SR * DUR, SR);

    for (let ch = 0; ch < 2; ch++) {
      const d = buf.getChannelData(ch);
      for (let i = 0; i < d.length; i++) {
        const t = i / SR;
        // Low drone + subtle pulse
        const lfo = 0.5 + 0.5 * Math.sin(2 * Math.PI * 2 * t);
        d[i] = (
          Math.sin(2 * Math.PI * 55 * t) * 0.3 +
          Math.sin(2 * Math.PI * 110 * t) * 0.15 * lfo +
          Math.sin(2 * Math.PI * 82.5 * t) * 0.1 +
          (Math.random() * 2 - 1) * 0.01
        ) * 0.4;
      }
    }
    return buf;
  }
}
