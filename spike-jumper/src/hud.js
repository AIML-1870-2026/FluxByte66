// ============================================================
// HUD — in-game heads-up display
// ============================================================

import { CANVAS_WIDTH, CANVAS_HEIGHT, COL, MAX_LIVES } from './constants.js';

export class HUD {
  constructor() {
    this._beatRing    = 0;     // 0..1, pulsed on beat
    this._comboShake  = 0;
    this._comboShakeX = 0;
    this._comboShakeY = 0;
  }

  onBeat(strength) {
    this._beatRing = strength === 'strong' ? 1.0 : 0.4;
  }

  onComboBreak() {
    this._comboShake = 0.2; // seconds
  }

  update(dt) {
    this._beatRing    = Math.max(0, this._beatRing - dt * 5);
    if (this._comboShake > 0) {
      this._comboShake -= dt;
      this._comboShakeX = (Math.random() - 0.5) * 4;
      this._comboShakeY = (Math.random() - 0.5) * 4;
    } else {
      this._comboShakeX = 0;
      this._comboShakeY = 0;
    }
  }

  draw(ctx, scoreManager, lives, levelName, currentTimeMs, durationMs) {
    // ── Score (top-left) ──────────────────────────────────────
    ctx.fillStyle = '#ffffff';
    ctx.font      = '10px monospace';
    ctx.textAlign = 'left';
    ctx.fillText(`${scoreManager.score.toLocaleString()}`, 8, 16);

    // Combo multiplier
    const mult = scoreManager.multiplier;
    if (scoreManager.combo > 0) {
      ctx.fillStyle = COL.NEON_RED;
      ctx.font = mult >= 3 ? '10px monospace' : '9px monospace';
      const cx = 8 + this._comboShakeX;
      const cy = 28 + this._comboShakeY;
      ctx.fillText(`×${mult} COMBO`, cx, cy);
    }

    // ── Beat ring (top-center) ────────────────────────────────
    const ringX = CANVAS_WIDTH / 2;
    const ringY = 14;
    const ringR = 8;
    const ringAlpha = 0.3 + this._beatRing * 0.7;
    ctx.strokeStyle = `rgba(255,26,26,${ringAlpha})`;
    ctx.lineWidth   = this._beatRing > 0.5 ? 2 : 1;
    ctx.beginPath();
    ctx.arc(ringX, ringY, ringR + this._beatRing * 4, 0, Math.PI * 2);
    ctx.stroke();
    // Inner dot
    ctx.fillStyle = `rgba(255,26,26,${ringAlpha})`;
    ctx.beginPath();
    ctx.arc(ringX, ringY, 3, 0, Math.PI * 2);
    ctx.fill();

    // ── Lives (top-right) ─────────────────────────────────────
    for (let i = 0; i < MAX_LIVES; i++) {
      const hx = CANVAS_WIDTH - 12 - i * 14;
      const hy = 6;
      ctx.fillStyle = i < lives ? COL.NEON_RED : '#330000';
      // pixel heart
      ctx.fillRect(hx - 3, hy,     2, 2);
      ctx.fillRect(hx + 1, hy,     2, 2);
      ctx.fillRect(hx - 4, hy + 2, 8, 3);
      ctx.fillRect(hx - 3, hy + 5, 6, 2);
      ctx.fillRect(hx - 2, hy + 7, 4, 1);
      ctx.fillRect(hx - 1, hy + 8, 2, 1);
    }

    // ── Level name (bottom-left) ──────────────────────────────
    ctx.fillStyle = '#554444';
    ctx.font      = '8px monospace';
    ctx.textAlign = 'left';
    ctx.fillText(levelName.toUpperCase(), 8, CANVAS_HEIGHT - 18);

    // ── Progress bar (bottom-center) ─────────────────────────
    const barW    = 200;
    const barX    = (CANVAS_WIDTH - barW) / 2;
    const barY    = CANVAS_HEIGHT - 12;
    const barH    = 4;
    const progress = durationMs > 0 ? Math.min(1, currentTimeMs / durationMs) : 0;

    ctx.fillStyle = '#220000';
    ctx.fillRect(barX, barY, barW, barH);
    ctx.fillStyle = COL.NEON_RED;
    ctx.fillRect(barX, barY, Math.round(barW * progress), barH);

    // ── Time (bottom-right) ───────────────────────────────────
    const cur  = formatTime(currentTimeMs);
    const tot  = formatTime(durationMs);
    ctx.fillStyle = '#554444';
    ctx.font      = '8px monospace';
    ctx.textAlign = 'right';
    ctx.fillText(`${cur} / ${tot}`, CANVAS_WIDTH - 8, CANVAS_HEIGHT - 18);

    ctx.textAlign = 'left';
  }
}

function formatTime(ms) {
  const s   = Math.floor(ms / 1000);
  const min = Math.floor(s / 60);
  const sec = s % 60;
  return `${min}:${sec.toString().padStart(2, '0')}`;
}
