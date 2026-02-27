// ============================================================
// PARTICLE SYSTEM
// ============================================================

import { MAX_PARTICLES, COL } from './constants.js';

const PALETTE = [COL.NEON_RED, COL.RED_BRIGHT, COL.RED_DIM, '#ffffff'];

function randPalette() {
  return PALETTE[Math.floor(Math.random() * PALETTE.length)];
}

class Particle {
  constructor(x, y, vx, vy, size, color, life) {
    this.x = x; this.y = y;
    this.vx = vx; this.vy = vy;
    this.size  = size;
    this.color = color;
    this.life  = life;   // seconds
    this.maxLife = life;
  }

  update(dt) {
    this.vy  += 600 * dt; // gravity on particles
    this.x   += this.vx * dt;
    this.y   += this.vy * dt;
    this.life -= dt;
  }

  get dead() { return this.life <= 0; }

  draw(ctx) {
    const alpha = Math.max(0, this.life / this.maxLife);
    ctx.globalAlpha = alpha;
    ctx.fillStyle   = this.color;
    const s = Math.round(this.size);
    ctx.fillRect(Math.round(this.x) - s, Math.round(this.y) - s, s * 2, s * 2);
    ctx.globalAlpha = 1;
  }
}

// Special: ring pulse
class RingParticle {
  constructor(x, y, color) {
    this.x = x; this.y = y;
    this.r     = 8;
    this.color = color;
    this.life  = 0.3;
    this.maxLife = 0.3;
  }
  update(dt) {
    this.r    += 80 * dt;
    this.life -= dt;
  }
  get dead() { return this.life <= 0; }
  draw(ctx) {
    const alpha = Math.max(0, this.life / this.maxLife);
    ctx.globalAlpha = alpha;
    ctx.strokeStyle = this.color;
    ctx.lineWidth   = 1;
    ctx.beginPath();
    ctx.arc(Math.round(this.x), Math.round(this.y), Math.round(this.r), 0, Math.PI * 2);
    ctx.stroke();
    ctx.globalAlpha = 1;
  }
}

// Death fragment (larger pixel chunk)
class Fragment {
  constructor(x, y, vx, vy, w, h, color) {
    this.x = x; this.y = y;
    this.vx = vx; this.vy = vy;
    this.w = w; this.h = h;
    this.color = color;
    this.life = 0.6;
    this.maxLife = 0.6;
    this.rot = Math.random() * 0.2 - 0.1;
    this._angle = 0;
  }
  update(dt) {
    this.vy  += 400 * dt;
    this.x   += this.vx * dt;
    this.y   += this.vy * dt;
    this._angle += this.rot;
    this.life -= dt;
  }
  get dead() { return this.life <= 0; }
  draw(ctx) {
    const alpha = Math.max(0, this.life / this.maxLife);
    ctx.globalAlpha = alpha;
    ctx.save();
    ctx.translate(Math.round(this.x), Math.round(this.y));
    ctx.rotate(this._angle);
    ctx.fillStyle = this.color;
    ctx.fillRect(-this.w/2, -this.h/2, this.w, this.h);
    ctx.restore();
    ctx.globalAlpha = 1;
  }
}

export class ParticleSystem {
  constructor() {
    this._particles = [];
  }

  clear() { this._particles = []; }

  _add(p) {
    if (this._particles.length >= MAX_PARTICLES) {
      // Cull oldest
      this._particles.shift();
    }
    this._particles.push(p);
  }

  // Jump sparks (3-4 tiny red squares, emit downward/backward)
  spawnJumpSparks(x, y) {
    const count = 3 + Math.floor(Math.random() * 2);
    for (let i = 0; i < count; i++) {
      const angle = Math.PI * 0.5 + (Math.random() - 0.5) * Math.PI * 0.6;
      const speed = 40 + Math.random() * 60;
      this._add(new Particle(x, y, -Math.cos(angle) * speed, Math.sin(angle) * speed, 2, COL.NEON_RED, 0.3));
    }
  }

  // Landing burst (6-8 radial)
  spawnLanding(x, y) {
    for (let i = 0; i < 7; i++) {
      const angle = Math.PI + (Math.random() - 0.5) * Math.PI;
      const speed = 60 + Math.random() * 80;
      this._add(new Particle(x, y, Math.cos(angle) * speed, Math.sin(angle) * speed - 20, 2, COL.NEON_RED, 0.4));
    }
  }

  // Perfect hit burst (8-12 radial + white specks)
  spawnPerfect(x, y) {
    for (let i = 0; i < 10; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = 80 + Math.random() * 120;
      const col = Math.random() < 0.15 ? '#ffffff' : COL.NEON_RED;
      this._add(new Particle(x, y, Math.cos(angle) * speed, Math.sin(angle) * speed, 2, col, 0.5));
    }
    this._add(new RingParticle(x, y, COL.NEON_RED));
  }

  // Beat pulse ring (from player center)
  spawnBeatRing(x, y) {
    this._add(new RingParticle(x, y, COL.NEON_RED));
  }

  // Enemy death (6-10 scatter)
  spawnEnemyDeath(x, y) {
    for (let i = 0; i < 8; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = 50 + Math.random() * 100;
      this._add(new Particle(x, y, Math.cos(angle) * speed, Math.sin(angle) * speed, 2, COL.RED_DIM, 0.5));
    }
  }

  // VOXL death — pixel explosion fragments
  spawnDeath(cx, cy) {
    // White flash is handled by player draw
    // Quadrant chunks (8x8)
    const cols = ['#1a1a22', COL.NEON_RED, '#222233'];
    for (let q = 0; q < 4; q++) {
      const qx = cx + (q % 2 === 0 ? -4 : 4);
      const qy = cy + (q < 2 ? -4 : 4);
      const angle = (Math.PI / 4) + (q * Math.PI / 2);
      const speed = 80 + Math.random() * 60;
      const col = cols[q % cols.length];
      this._add(new Fragment(qx, qy, Math.cos(angle) * speed, Math.sin(angle) * speed - 40, 8, 8, col));
    }
    // Small pixel fragments (16 total)
    for (let i = 0; i < 16; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = 40 + Math.random() * 120;
      const col = Math.random() < 0.5 ? COL.NEON_RED : '#1a1a22';
      this._add(new Fragment(cx + (Math.random()-0.5)*16, cy + (Math.random()-0.5)*16,
        Math.cos(angle)*speed, Math.sin(angle)*speed - 60, 4, 4, col));
    }
    // Red sparks
    for (let i = 0; i < 8; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = 100 + Math.random() * 100;
      this._add(new Particle(cx, cy, Math.cos(angle)*speed, Math.sin(angle)*speed, 2, COL.NEON_RED, 0.5));
    }
    // Final ring pulse
    this._add(new RingParticle(cx, cy, COL.NEON_RED));
  }

  update(dt) {
    for (let i = this._particles.length - 1; i >= 0; i--) {
      this._particles[i].update(dt);
      if (this._particles[i].dead) this._particles.splice(i, 1);
    }
  }

  draw(ctx) {
    for (const p of this._particles) p.draw(ctx);
  }
}
