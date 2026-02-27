// ============================================================
// UI — menus and screens
// ============================================================

import { CANVAS_WIDTH, CANVAS_HEIGHT, COL, LEVELS, STATE } from './constants.js';
import { getLevelRecord, getAllRecords, getSettings, saveSettings, isLevelUnlocked } from './storage.js';

// ──────────────────────────────────────────────────────────────
// Pixel font helpers (drawn with fillRect — no external font)
// ──────────────────────────────────────────────────────────────

/** Draw text with canvas font (monospace pixel style) */
function drawText(ctx, text, x, y, color = '#ffffff', size = 10, align = 'left') {
  ctx.fillStyle = color;
  ctx.font      = `${size}px monospace`;
  ctx.textAlign = align;
  ctx.fillText(text, x, y);
  ctx.textAlign = 'left';
}

function drawBox(ctx, x, y, w, h, fill, stroke) {
  if (fill)   { ctx.fillStyle   = fill;   ctx.fillRect(x, y, w, h); }
  if (stroke) { ctx.strokeStyle = stroke; ctx.lineWidth = 1; ctx.strokeRect(x + 0.5, y + 0.5, w - 1, h - 1); }
}

// ──────────────────────────────────────────────────────────────
// MAIN MENU
// ──────────────────────────────────────────────────────────────

const MENU_ITEMS = ['PLAY', 'LEVEL SELECT', 'HIGH SCORES', 'SETTINGS'];

export class MainMenu {
  constructor() {
    this._sel    = 0;
    this._pulse  = 0;
    this._scroll = 0;
  }

  update(dt, input) {
    this._pulse  += dt * 2;
    this._scroll += dt * 15;

    if (input.isDown2()) {
      this._sel = (this._sel + 1) % MENU_ITEMS.length;
      return { sfx: 'menu_select' };
    }
    if (input.isUp()) {
      this._sel = (this._sel - 1 + MENU_ITEMS.length) % MENU_ITEMS.length;
      return { sfx: 'menu_select' };
    }
    if (input.isConfirm()) {
      const item = MENU_ITEMS[this._sel];
      if (item === 'PLAY')          return { action: 'play',         sfx: 'menu_confirm' };
      if (item === 'LEVEL SELECT')  return { action: 'level_select', sfx: 'menu_confirm' };
      if (item === 'HIGH SCORES')   return { action: 'high_scores',  sfx: 'menu_confirm' };
      if (item === 'SETTINGS')      return { action: 'settings',     sfx: 'menu_confirm' };
    }
    return null;
  }

  draw(ctx) {
    // Scrolling star background
    ctx.fillStyle = COL.BG;
    ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
    this._drawStars(ctx);

    // Title
    const glow = 0.7 + 0.3 * Math.sin(this._pulse);
    ctx.globalAlpha = glow;
    drawText(ctx, '☠  SPIKE JUMPER: VOID RHYTHM  ☠', CANVAS_WIDTH / 2, 80, COL.NEON_RED, 13, 'center');
    ctx.globalAlpha = 1;

    // Subtitle
    drawText(ctx, 'RHYTHM PLATFORMER', CANVAS_WIDTH / 2, 100, '#440000', 8, 'center');

    // Menu items
    const startY = 160;
    for (let i = 0; i < MENU_ITEMS.length; i++) {
      const y    = startY + i * 28;
      const sel  = i === this._sel;
      const col  = sel ? COL.NEON_RED : '#aaaaaa';
      const size = sel ? 12 : 10;

      if (sel) {
        drawBox(ctx, CANVAS_WIDTH / 2 - 80, y - 14, 160, 20, '#1a0000', COL.RED_DIM);
        drawText(ctx, '▶ ' + MENU_ITEMS[i], CANVAS_WIDTH / 2, y, col, size, 'center');
      } else {
        drawText(ctx, MENU_ITEMS[i], CANVAS_WIDTH / 2, y, col, size, 'center');
      }
    }

    // Footer
    drawText(ctx, 'SPACE / ENTER to select', CANVAS_WIDTH / 2, CANVAS_HEIGHT - 20, '#333333', 8, 'center');
  }

  _drawStars(ctx) {
    ctx.fillStyle = '#ffffff';
    for (let i = 0; i < 80; i++) {
      const x = (i * 137.508 + this._scroll * 0.3) % CANVAS_WIDTH;
      const y = (i * 73.1) % (CANVAS_HEIGHT - 60);
      ctx.globalAlpha = 0.1 + (i % 5) * 0.1;
      ctx.fillRect(Math.round(x), Math.round(y), 1, 1);
    }
    ctx.globalAlpha = 1;
  }
}

// ──────────────────────────────────────────────────────────────
// LEVEL SELECT
// ──────────────────────────────────────────────────────────────

export class LevelSelect {
  constructor() { this._sel = 0; }

  update(dt, input) {
    if (input.isBack())  return { action: 'menu' };
    if (input.isDown2()) { this._sel = Math.min(LEVELS.length - 1, this._sel + 1); return { sfx: 'menu_select' }; }
    if (input.isUp())    { this._sel = Math.max(0, this._sel - 1); return { sfx: 'menu_select' }; }
    if (input.isConfirm()) {
      const lvl = LEVELS[this._sel];
      if (isLevelUnlocked(lvl.id)) return { action: 'start_level', level: lvl, sfx: 'menu_confirm' };
      return { sfx: 'combo_break' }; // locked
    }
    return null;
  }

  draw(ctx) {
    ctx.fillStyle = COL.BG;
    ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

    drawText(ctx, 'LEVEL SELECT', CANVAS_WIDTH / 2, 30, COL.NEON_RED, 12, 'center');

    const records = getAllRecords();
    for (let i = 0; i < LEVELS.length; i++) {
      const lvl = LEVELS[i];
      const rec = records[lvl.id] || {};
      const unlocked = isLevelUnlocked(lvl.id);
      const sel = i === this._sel;

      const cardX = 60;
      const cardY = 55 + i * 68;
      const cardW = CANVAS_WIDTH - 120;
      const cardH = 60;

      drawBox(ctx, cardX, cardY, cardW, cardH,
        sel ? '#150010' : '#0d0010',
        sel ? COL.NEON_RED : '#330033'
      );

      if (!unlocked) {
        drawText(ctx, `LEVEL ${lvl.id}: ${lvl.name}`, cardX + 10, cardY + 18, '#440000', 10);
        drawText(ctx, '🔒 LOCKED', cardX + 10, cardY + 38, '#330000', 9);
        continue;
      }

      drawText(ctx, `${lvl.id}. ${lvl.name.toUpperCase()}`, cardX + 10, cardY + 18, sel ? COL.NEON_RED : '#cccccc', 10);
      drawText(ctx, `BPM: ${lvl.bpm}`, cardX + 10, cardY + 36, '#888888', 8);

      if (rec.bestScore) {
        drawText(ctx, `BEST: ${rec.bestScore.toLocaleString()}  RANK: ${rec.bestRank || '-'}`, cardX + 80, cardY + 36, '#884444', 8);
      }
      if (rec.clears > 0) {
        drawText(ctx, `CLEARS: ${rec.clears}`, cardX + 10, cardY + 50, '#554444', 7);
      }
    }

    drawText(ctx, 'ESC: back', 8, CANVAS_HEIGHT - 10, '#333333', 8);
  }
}

// ──────────────────────────────────────────────────────────────
// DEATH SCREEN
// ──────────────────────────────────────────────────────────────

export class DeathScreen {
  constructor() { this._sel = 0; this._fade = 0; this._newBest = false; this._record = null; }

  show(isNewBest, record) {
    this._newBest = isNewBest;
    this._record  = record;
    this._fade    = 0;
    this._sel     = 0;
  }

  update(dt, input, score) {
    this._fade = Math.min(1, this._fade + dt * 3);

    if (input.isDown2()) { this._sel = (this._sel + 1) % 2; return { sfx: 'menu_select' }; }
    if (input.isUp())    { this._sel = (this._sel - 1 + 2) % 2; return { sfx: 'menu_select' }; }
    if (input.isConfirm()) {
      if (this._sel === 0) return { action: 'retry',  sfx: 'menu_confirm' };
      else                  return { action: 'menu',   sfx: 'menu_confirm' };
    }
    return null;
  }

  draw(ctx, scoreManager) {
    ctx.globalAlpha = this._fade * 0.85;
    ctx.fillStyle   = '#000000';
    ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
    ctx.globalAlpha = this._fade;

    const cx = CANVAS_WIDTH / 2;
    const cy = CANVAS_HEIGHT / 2 - 40;

    drawText(ctx, 'VOXL DESTROYED', cx, cy,      COL.NEON_RED, 14, 'center');
    drawText(ctx, `Score:       ${scoreManager.score.toLocaleString()}`, cx - 80, cy + 30, '#ffffff', 9);
    drawText(ctx, `Combo Peak:  ×${scoreManager.bestCombo > 0 ? Math.floor(scoreManager.bestCombo / 5) + 1 : 1}`, cx - 80, cy + 46, '#ffffff', 9);
    drawText(ctx, `Best Timing: PERFECT × ${scoreManager.perfectCount}`, cx - 80, cy + 62, '#ffffff', 9);

    if (this._newBest) {
      drawText(ctx, '★ NEW BEST! ★', cx, cy + 82, COL.NEON_RED, 11, 'center');
    }

    const buttons = ['[ RETRY ]', '[ MENU ]'];
    for (let i = 0; i < buttons.length; i++) {
      const bx = cx + (i === 0 ? -60 : 60);
      const by = cy + 108;
      const sel = i === this._sel;
      drawBox(ctx, bx - 34, by - 14, 68, 20, sel ? '#2a0000' : '#0d0000', sel ? COL.NEON_RED : COL.RED_DIM);
      drawText(ctx, buttons[i], bx, by, sel ? COL.NEON_RED : '#884444', 9, 'center');
    }

    ctx.globalAlpha = 1;
  }
}

// ──────────────────────────────────────────────────────────────
// LEVEL COMPLETE
// ──────────────────────────────────────────────────────────────

export class LevelCompleteScreen {
  constructor() { this._sel = 0; this._t = 0; }

  show() { this._sel = 0; this._t = 0; }

  update(dt, input) {
    this._t += dt;
    if (input.isDown2()) { this._sel = (this._sel + 1) % 2; return { sfx: 'menu_select' }; }
    if (input.isUp())    { this._sel = (this._sel - 1 + 2) % 2; return { sfx: 'menu_select' }; }
    if (input.isConfirm()) {
      if (this._sel === 0) return { action: 'next_level', sfx: 'menu_confirm' };
      else                  return { action: 'menu',       sfx: 'menu_confirm' };
    }
    return null;
  }

  draw(ctx, completion, levelName) {
    const alpha = Math.min(1, this._t * 2);
    ctx.globalAlpha = alpha * 0.9;
    ctx.fillStyle   = '#000000';
    ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
    ctx.globalAlpha = alpha;

    const cx = CANVAS_WIDTH / 2;
    const cy = 80;
    drawText(ctx, 'LEVEL COMPLETE', cx, cy,     COL.NEON_RED, 14, 'center');
    drawText(ctx, levelName.toUpperCase(),  cx, cy + 22, '#886666', 9, 'center');
    drawText(ctx, completion.rank,          cx, cy + 44, COL.NEON_RED, 12, 'center');

    drawText(ctx, `Score:     ${completion.finalScore.toLocaleString()}`, cx - 80, cy + 70, '#ffffff', 9);
    drawText(ctx, `Bonus:    +${completion.bonus.toLocaleString()}`, cx - 80, cy + 86, COL.NEON_RED, 9);
    drawText(ctx, `Accuracy:  ${Math.round(completion.perfectedRatio * 100)}% PERFECT`, cx - 80, cy + 102, '#888888', 9);

    const buttons = ['[ NEXT LEVEL ]', '[ MENU ]'];
    for (let i = 0; i < buttons.length; i++) {
      const by = cy + 136 + i * 24;
      const sel = i === this._sel;
      drawBox(ctx, cx - 70, by - 14, 140, 18, sel ? '#2a0000' : '#0d0000', sel ? COL.NEON_RED : COL.RED_DIM);
      drawText(ctx, buttons[i], cx, by, sel ? COL.NEON_RED : '#884444', 9, 'center');
    }

    ctx.globalAlpha = 1;
  }
}

// ──────────────────────────────────────────────────────────────
// HIGH SCORES
// ──────────────────────────────────────────────────────────────

export class HighScoresScreen {
  update(dt, input) {
    if (input.isBack() || input.isConfirm()) return { action: 'menu' };
    return null;
  }

  draw(ctx) {
    ctx.fillStyle = COL.BG;
    ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
    drawText(ctx, 'HIGH SCORES', CANVAS_WIDTH / 2, 28, COL.NEON_RED, 13, 'center');

    const records = getAllRecords();
    let y = 60;
    for (const lvl of LEVELS) {
      const rec = records[lvl.id];
      drawText(ctx, lvl.name.toUpperCase(), 40, y, '#aaaaaa', 9);
      if (rec) {
        drawText(ctx, rec.bestScore ? rec.bestScore.toLocaleString() : '--',       200, y, COL.NEON_RED, 9, 'right');
        drawText(ctx, rec.bestRank || '--',                                          280, y, '#884444', 8, 'right');
        drawText(ctx, `×${rec.bestCombo || 0} combo`,                               380, y, '#554444', 8, 'right');
        drawText(ctx, `${rec.clears || 0} clears / ${rec.attempts || 0} attempts`,  CANVAS_WIDTH - 40, y, '#443333', 8, 'right');
      } else {
        drawText(ctx, '-- no runs yet --', 200, y, '#333333', 8);
      }
      y += 50;
    }

    drawText(ctx, 'ESC / ENTER: back', CANVAS_WIDTH / 2, CANVAS_HEIGHT - 14, '#333333', 8, 'center');
  }
}

// ──────────────────────────────────────────────────────────────
// SETTINGS
// ──────────────────────────────────────────────────────────────

const SETTING_KEYS = ['musicVol', 'sfxVol', 'screenShake', 'beatFlash', 'floatText', 'audioOffset'];
const SETTING_LABELS = ['Music Volume', 'SFX Volume', 'Screen Shake', 'Beat Flash', 'Float Text', 'Audio Offset (ms)'];

export class SettingsScreen {
  constructor() {
    this._sel      = 0;
    this.settings  = getSettings();
  }

  update(dt, input) {
    const n = SETTING_KEYS.length;
    if (input.isBack())  { saveSettings(this.settings); return { action: 'menu' }; }
    if (input.isDown2()) { this._sel = (this._sel + 1) % n; return { sfx: 'menu_select' }; }
    if (input.isUp())    { this._sel = (this._sel - 1 + n) % n; return { sfx: 'menu_select' }; }

    const key = SETTING_KEYS[this._sel];
    const isJL = input.isJustDown('ArrowLeft')  || input.isJustDown('KeyA');
    const isJR = input.isJustDown('ArrowRight') || input.isJustDown('KeyD');

    if (isJL || isJR) {
      const dir = isJR ? 1 : -1;
      if (key === 'musicVol' || key === 'sfxVol') {
        this.settings[key] = Math.max(0, Math.min(1, this.settings[key] + dir * 0.1));
      } else if (key === 'audioOffset') {
        this.settings[key] = Math.max(-50, Math.min(50, this.settings[key] + dir * 5));
      } else {
        this.settings[key] = !this.settings[key];
      }
      saveSettings(this.settings);
      return { settingChanged: key, value: this.settings[key] };
    }
    return null;
  }

  draw(ctx) {
    ctx.fillStyle = COL.BG;
    ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
    drawText(ctx, 'SETTINGS', CANVAS_WIDTH / 2, 30, COL.NEON_RED, 13, 'center');

    for (let i = 0; i < SETTING_KEYS.length; i++) {
      const key = SETTING_KEYS[i];
      const sel = i === this._sel;
      const y   = 70 + i * 40;
      drawText(ctx, SETTING_LABELS[i], 60, y, sel ? COL.NEON_RED : '#aaaaaa', 9);

      const val = this.settings[key];
      let valStr;
      if (key === 'musicVol' || key === 'sfxVol') {
        // Draw slider bar
        const barX = 260;
        const barW = 180;
        drawBox(ctx, barX, y - 8, barW, 8, '#220000', '#440000');
        drawBox(ctx, barX, y - 8, Math.round(barW * val), 8, COL.NEON_RED, null);
        valStr = `${Math.round(val * 100)}%`;
      } else if (key === 'audioOffset') {
        valStr = `${val >= 0 ? '+' : ''}${val}ms`;
      } else {
        valStr = val ? 'ON' : 'OFF';
      }
      drawText(ctx, valStr, CANVAS_WIDTH - 60, y, sel ? '#ffffff' : '#888888', 9, 'right');
    }

    drawText(ctx, '← → change  |  ESC save & back', CANVAS_WIDTH / 2, CANVAS_HEIGHT - 14, '#333333', 8, 'center');
  }
}
