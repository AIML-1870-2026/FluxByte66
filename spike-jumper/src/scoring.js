// ============================================================
// SCORING — combo, multiplier, rank calculation
// ============================================================

import { SCORE_PERFECT, SCORE_GOOD, COMBO_TIERS, RANK_THRESHOLDS } from './constants.js';

export class ScoreManager {
  constructor() {
    this.score        = 0;
    this.combo        = 0;
    this.bestCombo    = 0;
    this.perfectCount = 0;
    this.goodCount    = 0;
    this.missCount    = 0;
    this.totalJumps   = 0;
    this._popups      = [];   // floating score text
  }

  reset() {
    this.score        = 0;
    this.combo        = 0;
    this.bestCombo    = 0;
    this.perfectCount = 0;
    this.goodCount    = 0;
    this.missCount    = 0;
    this.totalJumps   = 0;
    this._popups      = [];
  }

  get multiplier() {
    for (let i = COMBO_TIERS.length - 1; i >= 0; i--) {
      if (this.combo >= COMBO_TIERS[i].min) return COMBO_TIERS[i].mult;
    }
    return 1;
  }

  get comboTier() {
    for (let i = COMBO_TIERS.length - 1; i >= 0; i--) {
      if (this.combo >= COMBO_TIERS[i].min) return i;
    }
    return 0;
  }

  recordJump(quality, playerX, playerY) {
    // quality: 'perfect' | 'good' | 'miss'
    this.totalJumps++;
    const prevTier = this.comboTier;

    if (quality === 'perfect') {
      const pts = SCORE_PERFECT * this.multiplier;
      this.score        += pts;
      this.combo++;
      this.perfectCount++;
      if (this.combo > this.bestCombo) this.bestCombo = this.combo;
      this._popups.push({ text: `+${pts}`, label: 'PERFECT', x: playerX, y: playerY, timer: 0.5, color: '#FF1A1A', big: true });
    } else if (quality === 'good') {
      const pts = SCORE_GOOD * this.multiplier;
      this.score += pts;
      this.combo++;
      this.goodCount++;
      if (this.combo > this.bestCombo) this.bestCombo = this.combo;
      this._popups.push({ text: `+${pts}`, x: playerX, y: playerY, timer: 0.35, color: '#CC3300', big: false });
    } else {
      // miss
      this.missCount++;
      this.combo = 0;
    }

    const newTier = this.comboTier;
    return { quality, prevTier, newTier, comboUp: newTier > prevTier };
  }

  /** Calculate end-of-level rank and bonus */
  calcCompletion() {
    const perfectedRatio = this.totalJumps > 0
      ? this.perfectCount / this.totalJumps
      : 0;

    let rank  = 'LOST';
    let bonus = 0;
    for (const t of RANK_THRESHOLDS) {
      if (perfectedRatio >= t.min) { rank = t.rank; bonus = t.bonus; break; }
    }

    const finalScore = this.score + bonus;
    return { rank, bonus, finalScore, perfectedRatio };
  }

  updatePopups(dt) {
    for (let i = this._popups.length - 1; i >= 0; i--) {
      const p = this._popups[i];
      p.timer -= dt;
      p.y     -= 40 * dt;
      if (p.timer <= 0) this._popups.splice(i, 1);
    }
  }

  drawPopups(ctx) {
    for (const p of this._popups) {
      const alpha = Math.max(0, p.timer / (p.big ? 0.5 : 0.35));
      ctx.globalAlpha = alpha;
      ctx.fillStyle   = p.color;
      ctx.font        = p.big ? '9px monospace' : '7px monospace';
      ctx.textAlign   = 'center';
      if (p.label) {
        ctx.fillText(p.label, Math.round(p.x), Math.round(p.y) - 12);
      }
      ctx.fillText(p.text, Math.round(p.x), Math.round(p.y));
      ctx.globalAlpha = 1;
      ctx.textAlign   = 'left';
    }
  }
}
