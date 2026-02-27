// ============================================================
// RHYTHM ENGINE — beat clock, event firing, jump evaluation
// ============================================================

import { PERFECT_WINDOW, GOOD_WINDOW, SPAWN_X } from './constants.js';

export class RhythmEngine {
  constructor(audio) {
    this.audio       = audio;
    this.beatmap     = null;
    this.beatIndex   = 0;
    this.sectionIdx  = 0;
    this.scrollSpeed = 220; // px/s — updated by game
    this.onBeatEvent = null; // callback(beat)
    this.onSectionChange = null; // callback(section)
    this._lastBeatTime = -Infinity;
    this._lastBeatStrength = 'weak';
  }

  load(beatmap) {
    this.beatmap    = beatmap;
    this.beatIndex  = 0;
    this.sectionIdx = 0;
    this._lastBeatTime = -Infinity;
  }

  reset() {
    this.beatIndex  = 0;
    this.sectionIdx = 0;
    this._lastBeatTime = -Infinity;
  }

  /** Called every frame. currentTimeMs = audio playback position in ms */
  update(currentTimeMs) {
    if (!this.beatmap) return;

    // Update section
    const sections = this.beatmap.sections;
    if (sections) {
      while (
        this.sectionIdx < sections.length - 1 &&
        currentTimeMs >= sections[this.sectionIdx + 1].start_ms
      ) {
        this.sectionIdx++;
        if (this.onSectionChange) this.onSectionChange(sections[this.sectionIdx]);
      }
    }

    // Fire beat events
    const beats = this.beatmap.beats;
    const lookMs = this._calcLookaheadMs();

    while (
      this.beatIndex < beats.length &&
      currentTimeMs + lookMs >= beats[this.beatIndex].time_ms
    ) {
      const beat = beats[this.beatIndex];
      this._lastBeatTime     = beat.time_ms;
      this._lastBeatStrength = beat.strength;
      if (this.onBeatEvent) this.onBeatEvent(beat);
      this.beatIndex++;
    }
  }

  /** Returns ms lookahead needed so obstacles arrive at player on beat */
  _calcLookaheadMs() {
    const pxPerMs = this.scrollSpeed / 1000;
    return pxPerMs > 0 ? SPAWN_X / pxPerMs : 2000;
  }

  /** Current song section object */
  get currentSection() {
    if (!this.beatmap || !this.beatmap.sections) return null;
    return this.beatmap.sections[this.sectionIdx] || null;
  }

  /** Evaluate a jump at currentTimeMs; returns 'perfect'|'good'|'miss' */
  evaluateJump(currentTimeMs) {
    if (!this.beatmap) return 'miss';
    const beats = this.beatmap.beats;
    if (!beats || beats.length === 0) return 'miss';

    // Find nearest beat (past or future)
    let minDelta = Infinity;
    for (let i = Math.max(0, this.beatIndex - 3); i < Math.min(beats.length, this.beatIndex + 3); i++) {
      const delta = Math.abs(beats[i].time_ms - currentTimeMs);
      if (delta < minDelta) minDelta = delta;
    }

    if (minDelta <= PERFECT_WINDOW) return 'perfect';
    if (minDelta <= GOOD_WINDOW)    return 'good';
    return 'miss';
  }

  get isFinished() {
    if (!this.beatmap) return false;
    return this.beatIndex >= this.beatmap.beats.length;
  }

  get duration() {
    if (!this.beatmap || !this.beatmap.sections) return 0;
    const s = this.beatmap.sections;
    return s[s.length - 1].end_ms;
  }
}
