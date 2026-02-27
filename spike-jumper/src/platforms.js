// ============================================================
// PLATFORMS
// ============================================================

import { FLOOR_Y, CANVAS_WIDTH, COL } from './constants.js';

export class Platform {
  constructor(x, y, w, h, opts = {}) {
    this.x      = x;
    this.y      = y;
    this.w      = w;
    this.h      = h;
    this.solid  = true;
    this.moving = opts.moving || false;

    // Moving platform params
    this._baseX  = x;
    this._baseY  = y;
    this._ampX   = opts.ampX || 0;
    this._ampY   = opts.ampY || 0;
    this._phase  = opts.phase || 0;
    this._bpm    = opts.bpm  || 120;

    // Beat pulse glow
    this._glowT  = 0;
  }

  update(dt, currentTimeMs) {
    if (this.moving) {
      const period = 60000 / this._bpm; // ms per beat
      const t = (currentTimeMs / period * 2 * Math.PI) + this._phase;
      this.x = this._baseX + Math.sin(t) * this._ampX;
      this.y = this._baseY + Math.sin(t) * this._ampY;
    }
    this._glowT = Math.max(0, this._glowT - dt);
  }

  onBeat() {
    this._glowT = 0.3; // seconds to glow after beat
  }

  draw(ctx) {
    const glow = this._glowT / 0.3;

    // Stone body
    ctx.fillStyle = COL.STONE;
    ctx.fillRect(Math.round(this.x), Math.round(this.y), this.w, this.h);

    // Brick pattern (every 16px)
    ctx.fillStyle = COL.STONE_LIGHT;
    for (let bx = 0; bx < this.w; bx += 16) {
      ctx.fillRect(Math.round(this.x) + bx, Math.round(this.y), 1, this.h);
    }
    ctx.fillRect(Math.round(this.x), Math.round(this.y), this.w, 1);

    // Red glowing top edge
    const edgeAlpha = 0.5 + glow * 0.5;
    ctx.fillStyle = `rgba(255,26,26,${edgeAlpha})`;
    ctx.fillRect(Math.round(this.x), Math.round(this.y), this.w, 2);

    if (this.moving) {
      // Animated shimmer on moving platforms
      ctx.fillStyle = `rgba(255,68,68,${0.3 + glow * 0.4})`;
      ctx.fillRect(Math.round(this.x), Math.round(this.y), this.w, 2);
    }
  }
}

/** Creates the main floor — extra wide so it never scrolls away */
export function makeFloor() {
  const p = new Platform(-500, FLOOR_Y, CANVAS_WIDTH * 50, 72, {});
  p._isFloor = true;
  return p;
}
