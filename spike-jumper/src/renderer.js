// ============================================================
// RENDERER — background, floor, and environment drawing
// ============================================================

import { CANVAS_WIDTH, CANVAS_HEIGHT, FLOOR_Y, COL } from './constants.js';

export class BackgroundRenderer {
  constructor() {
    this._stars      = this._genStars(120);
    this._debris     = this._genDebris(20);
    this._silhouettes = this._genSilhouettes(6);
    this._scrollX    = 0;
    this._beatFlash  = 0;
    this._runePhase  = 0;
  }

  onBeat(strength) {
    if (strength === 'strong') {
      this._beatFlash = 1.0;
    } else if (strength === 'medium') {
      this._beatFlash = 0.4;
    }
  }

  update(dt, scrollSpeed) {
    this._scrollX  += scrollSpeed * dt;
    this._beatFlash = Math.max(0, this._beatFlash - dt * 8);
    this._runePhase += dt * 2;
  }

  draw(ctx) {
    // Deep void background
    ctx.fillStyle = COL.BG;
    ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

    // Far layer: stars + gothic silhouettes (0.08× scroll speed)
    this._drawStars(ctx);
    this._drawSilhouettes(ctx);

    // Mid layer: debris (0.25× scroll speed)
    this._drawDebris(ctx);

    // Screen edge beat flash
    if (this._beatFlash > 0) {
      const a = this._beatFlash * 0.18;
      ctx.save();
      ctx.strokeStyle = `rgba(255,26,26,${a})`;
      ctx.lineWidth = 24;
      ctx.strokeRect(12, 12, CANVAS_WIDTH - 24, CANVAS_HEIGHT - 24);
      ctx.restore();
    }

    // Floor
    this._drawFloor(ctx);
  }

  _drawStars(ctx) {
    ctx.fillStyle = '#ffffff';
    const offset = (this._scrollX * 0.05) % CANVAS_WIDTH;
    for (const s of this._stars) {
      const x = ((s.x - offset % CANVAS_WIDTH) + CANVAS_WIDTH * 2) % (CANVAS_WIDTH * 1.5);
      if (x > CANVAS_WIDTH) continue;
      ctx.globalAlpha = s.bright;
      ctx.fillRect(Math.round(x), s.y, 1, 1);
    }
    ctx.globalAlpha = 1;
  }

  _drawSilhouettes(ctx) {
    const offset = (this._scrollX * 0.04) % (CANVAS_WIDTH * 1.5);
    ctx.fillStyle = '#0d0d14';
    for (const sil of this._silhouettes) {
      const x = ((sil.x - offset) + CANVAS_WIDTH * 3) % (CANVAS_WIDTH * 1.5) - CANVAS_WIDTH * 0.5;
      this._drawSpire(ctx, x, sil.y, sil.h, sil.w);
    }
  }

  _drawSpire(ctx, x, y, h, w) {
    // Gothic spire silhouette
    ctx.beginPath();
    ctx.moveTo(Math.round(x),          Math.round(y + h));
    ctx.lineTo(Math.round(x + w / 2),  Math.round(y));
    ctx.lineTo(Math.round(x + w),      Math.round(y + h));
    ctx.closePath();
    ctx.fill();

    // Buttresses
    ctx.fillRect(Math.round(x - w * 0.2), Math.round(y + h * 0.6), Math.round(w * 0.2), Math.round(h * 0.4));
    ctx.fillRect(Math.round(x + w),       Math.round(y + h * 0.6), Math.round(w * 0.2), Math.round(h * 0.4));
  }

  _drawDebris(ctx) {
    const offset = (this._scrollX * 0.18) % (CANVAS_WIDTH * 2);
    for (const d of this._debris) {
      const x = ((d.x - offset) + CANVAS_WIDTH * 3) % (CANVAS_WIDTH * 2);
      if (x > CANVAS_WIDTH) continue;
      ctx.globalAlpha = 0.35;
      ctx.fillStyle = d.color;
      ctx.fillRect(Math.round(x), d.y, d.size, d.size);
      ctx.globalAlpha = 1;
    }
  }

  _drawFloor(ctx) {
    // Stone floor
    ctx.fillStyle = '#1a1a2a';
    ctx.fillRect(0, FLOOR_Y, CANVAS_WIDTH, CANVAS_HEIGHT - FLOOR_Y);

    // Floor rune tiles (pulse with beat)
    const runeAlpha = 0.25 + 0.2 * Math.sin(this._runePhase);
    ctx.fillStyle = `rgba(255,26,26,${runeAlpha})`;
    const tileW = 32;
    for (let tx = 0; tx < CANVAS_WIDTH; tx += tileW) {
      const offset = (this._scrollX * 0.5) % tileW;
      const rx = tx - offset;
      // Rune glyph (simplified: just a cross pattern)
      ctx.fillRect(Math.round(rx) + 12, FLOOR_Y + 4, 8, 2);
      ctx.fillRect(Math.round(rx) + 15, FLOOR_Y + 2, 2, 6);
      // Horizontal grout line
      ctx.fillStyle = `rgba(255,26,26,${runeAlpha * 0.5})`;
      ctx.fillRect(Math.round(rx), FLOOR_Y, tileW, 1);
      ctx.fillStyle = `rgba(255,26,26,${runeAlpha})`;
    }

    // Top edge red glow line
    const edgeAlpha = 0.5 + this._beatFlash * 0.4;
    ctx.fillStyle = `rgba(255,26,26,${edgeAlpha})`;
    ctx.fillRect(0, FLOOR_Y, CANVAS_WIDTH, 2);
  }

  // ── Private generators ─────────────────────────────────────

  _genStars(n) {
    const stars = [];
    for (let i = 0; i < n; i++) {
      stars.push({
        x:      Math.random() * CANVAS_WIDTH * 1.5,
        y:      Math.random() * (FLOOR_Y - 40),
        bright: 0.2 + Math.random() * 0.8,
      });
    }
    return stars;
  }

  _genSilhouettes(n) {
    const sils = [];
    for (let i = 0; i < n; i++) {
      const h = 60 + Math.random() * 100;
      sils.push({
        x: Math.random() * CANVAS_WIDTH * 1.5,
        y: FLOOR_Y - 60 - h,
        h: h,
        w: 20 + Math.random() * 30,
      });
    }
    return sils;
  }

  _genDebris(n) {
    const items = [];
    const colors = ['#3a0000', '#1a1040', '#220022'];
    for (let i = 0; i < n; i++) {
      items.push({
        x:     Math.random() * CANVAS_WIDTH * 2,
        y:     20 + Math.random() * (FLOOR_Y - 80),
        size:  3 + Math.floor(Math.random() * 8),
        color: colors[Math.floor(Math.random() * colors.length)],
      });
    }
    return items;
  }
}
