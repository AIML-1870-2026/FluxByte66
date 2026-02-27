// ============================================================
// HAZARDS & ENEMIES
// ============================================================

import { FLOOR_Y, CANVAS_WIDTH, CANVAS_HEIGHT, COL } from './constants.js';
import { AABB } from './physics.js';

// ──────────────────────────────────────────────────────────────
// BASE
// ──────────────────────────────────────────────────────────────
class Hazard {
  constructor(x, y, w, h) {
    this.x = x; this.y = y; this.w = w; this.h = h;
    this.alive = true;
    this._beatGlow = 0;
  }
  get aabb() { return new AABB(this.x, this.y, this.w, this.h); }
  onBeat()   { this._beatGlow = 0.3; }
  update(dt, scrollDx) {
    this.x -= scrollDx;
    this._beatGlow = Math.max(0, this._beatGlow - dt);
    if (this.x + this.w < -80) this.alive = false;
  }
  draw(ctx) {}
}

// ──────────────────────────────────────────────────────────────
// FLOOR SPIKE
// ──────────────────────────────────────────────────────────────
export class FloorSpike extends Hazard {
  constructor(x, height = 1, fromCeiling = false) {
    const tileH = height * 16;
    const y = fromCeiling ? 0 : FLOOR_Y - tileH;
    super(x, y, 12, tileH);
    this.fromCeiling = fromCeiling;
  }

  draw(ctx) {
    const glow = this._beatGlow / 0.3;
    const tipColor = `rgb(255,${Math.round(26 + glow * 60)},${Math.round(26 + glow * 40)})`;

    // Draw spike triangle(s) — one per 16px height
    const tipCount = Math.round(this.h / 16);
    const tw = this.w;

    for (let i = 0; i < tipCount; i++) {
      const sy = this.fromCeiling
        ? this.y + i * 16
        : this.y + this.h - (i + 1) * 16;
      const tipY = this.fromCeiling ? sy + 16 : sy;
      const baseY = this.fromCeiling ? sy : sy + 16;

      ctx.fillStyle = '#1a0000';
      ctx.beginPath();
      ctx.moveTo(Math.round(this.x),          Math.round(baseY));
      ctx.lineTo(Math.round(this.x) + tw / 2, Math.round(tipY));
      ctx.lineTo(Math.round(this.x) + tw,     Math.round(baseY));
      ctx.closePath();
      ctx.fill();

      // Neon tip glow
      ctx.fillStyle = tipColor;
      ctx.beginPath();
      ctx.moveTo(Math.round(this.x) + tw / 2 - 1, Math.round(tipY) + (this.fromCeiling ? 4 : -4));
      ctx.lineTo(Math.round(this.x) + tw / 2,      Math.round(tipY));
      ctx.lineTo(Math.round(this.x) + tw / 2 + 1, Math.round(tipY) + (this.fromCeiling ? 4 : -4));
      ctx.closePath();
      ctx.fill();
    }
  }
}

// ──────────────────────────────────────────────────────────────
// LASER
// ──────────────────────────────────────────────────────────────
export class Laser extends Hazard {
  constructor(x, orientation = 'horizontal', beatDuration = 500) {
    // Horizontal laser: covers the full canvas width at a height the player must slide under.
    // Standing player AABB: y=FLOOR_Y-16 (362), h=16 → spans 362–378
    // Sliding player AABB: y=FLOOR_Y-10 (368), h=10 → spans 368–378
    // Laser AABB must overlap 362–378 (standing) but NOT overlap 368–378 (sliding).
    // Using y=FLOOR_Y-30 (348), h=16 → laser spans 348–364:
    //   standing: 362 < 364 ✓  378 > 348 ✓  → HIT
    //   sliding:  368 < 364?   NO            → SAFE
    const lx = orientation === 'horizontal' ? 0 : x;
    const y  = orientation === 'horizontal' ? FLOOR_Y - 30 : 0;
    const w  = orientation === 'horizontal' ? CANVAS_WIDTH : 6;
    const h  = orientation === 'horizontal' ? 16 : FLOOR_Y;
    super(lx, y, w, h);
    this.orientation  = orientation;
    this._charge      = true;        // charge-up phase
    this._chargeDur   = 300;         // ms
    this._chargeTimer = 0;
    this._fired       = false;
    this._holdDur     = 400;         // ms the beam is active
    this._holdTimer   = 0;
    this._glowPhase   = 0;
    this.beatDuration = beatDuration;
    // For horizontal lasers fixed to the world, don't scroll
    this.fixed = orientation === 'horizontal';
  }

  update(dt, scrollDx) {
    if (!this.fixed) this.x -= scrollDx;
    const dtMs = dt * 1000;
    this._glowPhase += dt * 20;

    if (this._charge) {
      this._chargeTimer += dtMs;
      if (this._chargeTimer >= this._chargeDur) {
        this._charge = false;
        this._fired  = true;
      }
    } else if (this._fired) {
      this._holdTimer += dtMs;
      if (this._holdTimer >= this._holdDur) {
        this.alive = false;
      }
    }
    this._beatGlow = Math.max(0, this._beatGlow - dt);
    if (this.x + this.w < -80) this.alive = false;
  }

  get isActive() { return this._fired && this.alive; }

  draw(ctx) {
    if (this._charge) {
      // Charge glow — flickering dim line
      const alpha = 0.2 + 0.3 * Math.sin(this._glowPhase);
      ctx.fillStyle = `rgba(255,26,26,${alpha})`;
      if (this.orientation === 'horizontal') {
        ctx.fillRect(0, Math.round(this.y), CANVAS_WIDTH, 2);
      } else {
        ctx.fillRect(Math.round(this.x), 0, 2, FLOOR_Y);
      }
      return;
    }

    if (!this._fired) return;

    // Active beam
    ctx.save();
    ctx.shadowColor = COL.NEON_RED;
    ctx.shadowBlur  = 8;
    ctx.fillStyle   = COL.NEON_RED;
    if (this.orientation === 'horizontal') {
      ctx.fillRect(0, Math.round(this.y), CANVAS_WIDTH, this.h);
    } else {
      ctx.fillRect(Math.round(this.x), 0, this.w, FLOOR_Y);
    }
    ctx.restore();
  }
}

// ──────────────────────────────────────────────────────────────
// CRAWLER ENEMY
// ──────────────────────────────────────────────────────────────
export class Crawler extends Hazard {
  constructor(x, patrolW = 64) {
    const w = 16, h = 14;
    super(x, FLOOR_Y - h, w, h);
    this._dir      = -1; // moves left by default (toward player)
    this._patrolX  = x;
    this._patrolW  = patrolW;
    this._animT    = 0;
    this._animFrame = 0;
    this.speed     = 50; // px/s in world space (independent of scroll)
  }

  update(dt, scrollDx) {
    this.x -= scrollDx;
    this._animT += dt;
    if (this._animT > 0.15) { this._animT = 0; this._animFrame = (this._animFrame + 1) % 4; }
    this._beatGlow = Math.max(0, this._beatGlow - dt);
    if (this.x + this.w < -80) this.alive = false;
  }

  draw(ctx) {
    const glow = this._beatGlow / 0.3;
    // Body — dark spiky square
    ctx.fillStyle = '#0d0d0d';
    ctx.fillRect(Math.round(this.x), Math.round(this.y), this.w, this.h);

    // Spikes on top
    ctx.fillStyle = '#2a0000';
    for (let i = 0; i < 3; i++) {
      const sx = Math.round(this.x) + 2 + i * 5;
      ctx.fillRect(sx, Math.round(this.y) - 3, 2, 4);
    }

    // Red eye glow
    const eyeAlpha = 0.7 + glow * 0.3;
    ctx.fillStyle = `rgba(255,26,26,${eyeAlpha})`;
    ctx.fillRect(Math.round(this.x) + 2,  Math.round(this.y) + 4, 3, 3);
    ctx.fillStyle = `rgba(255,26,26,${eyeAlpha})`;
    ctx.fillRect(Math.round(this.x) + 11, Math.round(this.y) + 4, 3, 3);

    // Leg animation
    const legOff = (this._animFrame % 2) === 0 ? 1 : -1;
    ctx.fillStyle = '#1a0000';
    ctx.fillRect(Math.round(this.x) + 2,  Math.round(this.y) + this.h,     3, 2 + legOff);
    ctx.fillRect(Math.round(this.x) + 11, Math.round(this.y) + this.h, 3, 2 - legOff);
  }
}

// ──────────────────────────────────────────────────────────────
// FLYER ENEMY
// ──────────────────────────────────────────────────────────────
export class Flyer extends Hazard {
  constructor(x, y, path = 'sine') {
    super(x, y, 18, 14);
    this._path   = path; // 'sine' | 'straight'
    this._baseY  = y;
    this._t      = 0;
    this._animT  = 0;
    this._frame  = 0;
    this.speed   = 120; // px/s horizontal
  }

  update(dt, scrollDx) {
    this.x -= scrollDx;
    this._t    += dt;
    this._animT += dt;
    if (this._animT > 0.12) { this._animT = 0; this._frame = (this._frame + 1) % 4; }

    if (this._path === 'sine') {
      this.y = this._baseY + Math.sin(this._t * 4) * 24;
    }
    this._beatGlow = Math.max(0, this._beatGlow - dt);
    if (this.x + this.w < -80) this.alive = false;
  }

  draw(ctx) {
    const glow = this._beatGlow / 0.3;
    const wingFlap = Math.sin(this._t * 12) * 4;

    // Wings
    ctx.fillStyle = '#1a0000';
    ctx.fillRect(Math.round(this.x) - 6,            Math.round(this.y) + 2 + wingFlap, 8, 4);
    ctx.fillRect(Math.round(this.x) + this.w - 2,   Math.round(this.y) + 2 - wingFlap, 8, 4);

    // Body
    ctx.fillStyle = '#0d0008';
    ctx.fillRect(Math.round(this.x), Math.round(this.y), this.w, this.h);

    // Glowing core
    const coreAlpha = 0.5 + glow * 0.5;
    ctx.fillStyle = `rgba(255,26,26,${coreAlpha})`;
    ctx.fillRect(Math.round(this.x) + 5, Math.round(this.y) + 4, 8, 6);

    // Eyes
    ctx.fillStyle = COL.NEON_RED;
    ctx.fillRect(Math.round(this.x) + 2,  Math.round(this.y) + 3, 2, 2);
    ctx.fillRect(Math.round(this.x) + 14, Math.round(this.y) + 3, 2, 2);
  }
}

// ──────────────────────────────────────────────────────────────
// SPIKE WALL
// ──────────────────────────────────────────────────────────────
export class SpikeWall extends Hazard {
  constructor(x) {
    super(x, 0, 16, FLOOR_Y);
  }

  draw(ctx) {
    const glow = this._beatGlow / 0.3;
    ctx.fillStyle = '#0d0000';
    ctx.fillRect(Math.round(this.x), 0, this.w, this.h);

    // Spikes pointing left (toward player)
    ctx.fillStyle = `rgb(${180 + Math.round(glow * 75)},26,26)`;
    for (let sy = 8; sy < FLOOR_Y; sy += 20) {
      ctx.beginPath();
      ctx.moveTo(Math.round(this.x),      sy);
      ctx.lineTo(Math.round(this.x) - 12, sy + 10);
      ctx.lineTo(Math.round(this.x),      sy + 20);
      ctx.closePath();
      ctx.fill();
    }
  }
}

// ──────────────────────────────────────────────────────────────
// PROJECTILE
// ──────────────────────────────────────────────────────────────
export class Projectile extends Hazard {
  constructor(x, y) {
    super(x, y, 8, 8);
    this.speedX = -200; // travels left
  }

  update(dt, scrollDx) {
    this.x += this.speedX * dt - scrollDx;
    this._beatGlow = Math.max(0, this._beatGlow - dt);
    if (this.x + this.w < -20) this.alive = false;
  }

  draw(ctx) {
    ctx.fillStyle = COL.NEON_RED;
    ctx.fillRect(Math.round(this.x), Math.round(this.y), this.w, this.h);
    ctx.fillStyle = COL.RED_DIM;
    ctx.fillRect(Math.round(this.x) + 2, Math.round(this.y) + 2, 4, 4);
  }
}
