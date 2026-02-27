// ============================================================
// AUDIO — Web Audio API wrapper
// ============================================================

import { MusicScheduler } from './music.js';

export class AudioEngine {
  constructor() {
    this.ctx          = null;
    this.musicGain    = null;
    this.sfxGain      = null;
    this.sfxBuffers   = {};
    this.musicVol     = 0.8;
    this.sfxVol       = 0.7;
    this._started     = false;
    this.startTime    = 0;
    this._scheduler   = null;
    this._compressor  = null;
  }

  async init() {
    this.ctx = new (window.AudioContext || window.webkitAudioContext)();

    // Master compressor for loudness/dynamic control
    this._compressor = this.ctx.createDynamicsCompressor();
    this._compressor.threshold.value = -18;
    this._compressor.knee.value      = 10;
    this._compressor.ratio.value     = 4;
    this._compressor.attack.value    = 0.003;
    this._compressor.release.value   = 0.25;
    this._compressor.connect(this.ctx.destination);

    // Music gain → compressor
    this.musicGain = this.ctx.createGain();
    this.musicGain.gain.value = this.musicVol;
    this.musicGain.connect(this._compressor);

    // SFX gain → compressor
    this.sfxGain = this.ctx.createGain();
    this.sfxGain.gain.value = this.sfxVol;
    this.sfxGain.connect(this._compressor);

    this._genSFX();
  }

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

  // ──────────────────────────────────────────────────────────
  // Music playback (procedural via MusicScheduler)
  // ──────────────────────────────────────────────────────────

  /**
   * Start music for a given level.
   * @param {string} trackId   — beatmap track_id (e.g. 'the_awakening')
   * @param {Array}  sections  — beatmap sections array
   */
  playMusic(trackId = 'the_awakening', sections = []) {
    this.stopMusic();
    if (!this.ctx) return;

    this._scheduler = new MusicScheduler(this.ctx, this.musicGain, trackId, sections);
    this.startTime  = this.ctx.currentTime;
    this._started   = true;
    this._scheduler.start();
  }

  stopMusic() {
    if (this._scheduler) {
      this._scheduler.stop();
      this._scheduler = null;
    }
    this._started = false;
  }

  /** Current playback position in milliseconds (synced to AudioContext) */
  get currentTimeMs() {
    if (!this._started || !this.ctx) return 0;
    return (this.ctx.currentTime - this.startTime) * 1000;
  }

  // ──────────────────────────────────────────────────────────
  // SFX
  // ──────────────────────────────────────────────────────────

  playSFX(name) {
    const buf = this.sfxBuffers[name];
    if (!buf || !this.ctx) return;
    const src = this.ctx.createBufferSource();
    src.buffer = buf;
    src.connect(this.sfxGain);
    src.start(0);
  }

  // ──────────────────────────────────────────────────────────
  // Procedural SFX buffers
  // ──────────────────────────────────────────────────────────

  _genSFX() {
    const c  = this.ctx;
    const SR = c.sampleRate;

    const make = (dur, fn) => {
      const buf = c.createBuffer(1, Math.ceil(SR * dur), SR);
      fn(buf.getChannelData(0), SR);
      return buf;
    };

    // jump — short upward synth blip
    this.sfxBuffers['jump'] = make(0.25, (d, sr) => {
      for (let i = 0; i < d.length; i++) {
        const t = i / sr;
        d[i] = Math.sin(2 * Math.PI * (380 + t * 900) * t) * Math.max(0, 1 - t * 18);
      }
    });

    // double_jump — higher pitch
    this.sfxBuffers['double_jump'] = make(0.22, (d, sr) => {
      for (let i = 0; i < d.length; i++) {
        const t = i / sr;
        d[i] = Math.sin(2 * Math.PI * (560 + t * 1400) * t) * Math.max(0, 1 - t * 18);
      }
    });

    // land — low thud
    this.sfxBuffers['land'] = make(0.3, (d, sr) => {
      for (let i = 0; i < d.length; i++) {
        const t = i / sr;
        d[i] = Math.sin(2 * Math.PI * Math.max(18, 90 - t * 70) * t) * Math.max(0, 1 - t * 22)
             + (Math.random() * 2 - 1) * 0.35 * Math.max(0, 0.04 - t) * 25;
      }
    });

    // slide — descending swoosh
    this.sfxBuffers['slide'] = make(0.25, (d, sr) => {
      for (let i = 0; i < d.length; i++) {
        const t = i / sr;
        d[i] = Math.sin(2 * Math.PI * Math.max(40, 700 - t * 600) * t) * Math.max(0, 1 - t * 14) * 0.55;
      }
    });

    // perfect — bright ping + bass hit
    this.sfxBuffers['perfect'] = make(0.4, (d, sr) => {
      for (let i = 0; i < d.length; i++) {
        const t = i / sr;
        d[i] = Math.sin(2 * Math.PI * 920 * t) * Math.max(0, 1 - t * 9)
             + Math.sin(2 * Math.PI * 115 * t) * Math.max(0, 1 - t * 7) * 0.5;
      }
    });

    // good — softer ping
    this.sfxBuffers['good'] = make(0.3, (d, sr) => {
      for (let i = 0; i < d.length; i++) {
        const t = i / sr;
        d[i] = Math.sin(2 * Math.PI * 660 * t) * Math.max(0, 1 - t * 11) * 0.45;
      }
    });

    // combo_break — deflate blip
    this.sfxBuffers['combo_break'] = make(0.3, (d, sr) => {
      for (let i = 0; i < d.length; i++) {
        const t = i / sr;
        d[i] = Math.sin(2 * Math.PI * Math.max(40, 320 - t * 270) * t) * Math.max(0, 1 - t * 18) * 0.55;
      }
    });

    // combo_up — ascending arpeggio
    this.sfxBuffers['combo_up'] = make(0.3, (d, sr) => {
      const notes = [330, 440, 550];
      for (let i = 0; i < d.length; i++) {
        const t = i / sr;
        const ni = Math.min(notes.length - 1, Math.floor(t / 0.05));
        d[i] = Math.sin(2 * Math.PI * notes[ni] * t) * Math.max(0, 1 - (t % 0.05) * 30) * 0.45;
      }
    });

    // laser_charge — rising whine
    this.sfxBuffers['laser_charge'] = make(0.35, (d, sr) => {
      for (let i = 0; i < d.length; i++) {
        const t = i / sr;
        d[i] = Math.sin(2 * Math.PI * (180 + t * 700) * t) * Math.min(1, t * 6) * 0.38;
      }
    });

    // laser_fire — sharp zap
    this.sfxBuffers['laser_fire'] = make(0.25, (d, sr) => {
      for (let i = 0; i < d.length; i++) {
        const t = i / sr;
        d[i] = (Math.random() * 2 - 1) * Math.max(0, 1 - t * 28)
             + Math.sin(2 * Math.PI * 1100 * t) * Math.max(0, 1 - t * 22) * 0.3;
      }
    });

    // enemy_death — pop + zap
    this.sfxBuffers['enemy_death'] = make(0.2, (d, sr) => {
      for (let i = 0; i < d.length; i++) {
        const t = i / sr;
        d[i] = (Math.random() * 2 - 1) * Math.max(0, 0.08 - t) * 12
             + Math.sin(2 * Math.PI * 420 * t) * Math.max(0, 1 - t * 28) * 0.35;
      }
    });

    // player_hit — heavy distorted blip
    this.sfxBuffers['player_hit'] = make(0.35, (d, sr) => {
      for (let i = 0; i < d.length; i++) {
        const t = i / sr;
        d[i] = (Math.random() * 2 - 1) * Math.max(0, 1 - t * 14) * 0.75;
      }
    });

    // player_death — descending crash
    this.sfxBuffers['player_death'] = make(0.6, (d, sr) => {
      for (let i = 0; i < d.length; i++) {
        const t = i / sr;
        d[i] = (Math.random() * 2 - 1) * Math.max(0, 1 - t * 3.5) * 0.5
             + Math.sin(2 * Math.PI * Math.max(18, 280 - t * 250) * t) * Math.max(0, 1 - t * 3.5) * 0.45;
      }
    });

    // level_complete — 4-note fanfare
    this.sfxBuffers['level_complete'] = make(0.6, (d, sr) => {
      const notes = [330, 440, 550, 660];
      for (let i = 0; i < d.length; i++) {
        const t = i / sr;
        const ni = Math.min(notes.length - 1, Math.floor(t / 0.1));
        d[i] = Math.sin(2 * Math.PI * notes[ni] * t) * Math.max(0, 1 - (t % 0.1) * 7) * 0.55;
      }
    });

    // menu_select / menu_confirm
    this.sfxBuffers['menu_select'] = make(0.12, (d, sr) => {
      for (let i = 0; i < d.length; i++) {
        const t = i / sr;
        d[i] = Math.sin(2 * Math.PI * 440 * t) * Math.max(0, 1 - t * 32) * 0.28;
      }
    });
    this.sfxBuffers['menu_confirm'] = make(0.15, (d, sr) => {
      for (let i = 0; i < d.length; i++) {
        const t = i / sr;
        d[i] = Math.sin(2 * Math.PI * 660 * t) * Math.max(0, 1 - t * 26) * 0.38;
      }
    });
  }
}
