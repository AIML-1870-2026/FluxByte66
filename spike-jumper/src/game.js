// ============================================================
// GAME — main game state: running a level
// ============================================================

import {
  CANVAS_WIDTH, CANVAS_HEIGHT, FLOOR_Y, STATE, COL,
  BASE_SCROLL_PX_PER_S, SPAWN_X, MAX_LIVES, LEVELS,
} from './constants.js';
import { Player }           from './player.js';
import { makeFloor, Platform } from './platforms.js';
import { PatternLibrary }   from './patterns.js';
import { ParticleSystem }   from './particles.js';
import { ScoreManager }     from './scoring.js';
import { BackgroundRenderer } from './renderer.js';
import { HUD }              from './hud.js';
import { AABB }             from './physics.js';
import { saveLevelRecord }  from './storage.js';
import { Laser }            from './hazards.js';

export class GameSession {
  constructor(audio, rhythm) {
    this.audio   = audio;
    this.rhythm  = rhythm;

    this.player    = null;
    this.hazards   = [];
    this.platforms = [];
    this.particles = new ParticleSystem();
    this.score     = new ScoreManager();
    this.bg        = new BackgroundRenderer();
    this.hud       = new HUD();
    this.patterns  = new PatternLibrary();

    this.lives      = MAX_LIVES;
    this.scrollSpeed = BASE_SCROLL_PX_PER_S;
    this.level      = null;
    this.beatmap    = null;

    // Screen shake
    this._shakeTimer = 0;
    this._shakeAmt   = 0;

    // Completion
    this.completion  = null;
    this.savedRecord = null;

    // Callbacks
    this.onDead     = null;
    this.onComplete = null;
  }

  load(level, beatmap) {
    this.level   = level;
    this.beatmap = beatmap;

    this.player   = new Player(80, FLOOR_Y - 16);
    this.hazards  = [];
    this.platforms = [makeFloor()];
    this.particles.clear();
    this.score.reset();
    this.patterns.reset();

    this.lives       = MAX_LIVES;
    this.scrollSpeed = BASE_SCROLL_PX_PER_S * (level.scrollBase || 1.0);
    this.completion  = null;

    // Configure rhythm engine
    this.rhythm.scrollSpeed = this.scrollSpeed;
    this.rhythm.load(beatmap);
    this.rhythm.onBeatEvent     = (beat) => this._onBeat(beat);
    this.rhythm.onSectionChange = (sec)  => this._onSection(sec);
  }

  start() {
    this.audio.playMusic();
  }

  stop() {
    this.audio.stopMusic();
  }

  update(dt, input) {
    if (this.player.dead && this.player.deathFinished) {
      if (this.lives > 0) {
        this.lives--;
        if (this.lives > 0) {
          this._respawn();
        } else {
          this._finishDead();
          return;
        }
      }
      return;
    }

    const currentMs = this.audio.currentTimeMs;

    // Rhythm engine
    this.rhythm.update(currentMs);

    // Scroll speed from section
    const sec = this.rhythm.currentSection;
    if (sec) {
      const targetSpeed = BASE_SCROLL_PX_PER_S * sec.scroll_speed;
      this.scrollSpeed += (targetSpeed - this.scrollSpeed) * Math.min(1, dt * 2);
      this.rhythm.scrollSpeed = this.scrollSpeed;
    }

    // Scroll delta this frame
    const scrollDx = this.scrollSpeed * dt;

    // Player update
    this.player.update(dt, input, this._activePlatforms(), this.rhythm, (isDbl) => {
      this._onPlayerJump(isDbl, currentMs);
    });

    // Emit spark particles
    if (this.player.emitSpark) {
      this.particles.spawnJumpSparks(this.player.x, this.player.y + this.player.h / 2);
    }
    // Landing particles (state change to LAND)
    if (this.player.state === 'land' && !this._prevLand) {
      this.particles.spawnLanding(this.player.x + this.player.w / 2, this.player.y + this.player.h);
      this.audio.playSFX('land');
    }
    this._prevLand = this.player.state === 'land';

    // Update platforms (floor doesn't scroll — it's infinite width)
    for (const p of this.platforms) {
      if (!p._isFloor) p.x -= scrollDx;
      p.update(dt, currentMs);
    }

    // Scroll and update hazards
    for (const h of this.hazards) h.update(dt, scrollDx);
    this.hazards = this.hazards.filter(h => h.alive);

    // Collision detection
    if (!this.player.dead && !this.player.invincible) {
      this._checkCollisions();
    }

    // Particles
    this.particles.update(dt);
    this.score.updatePopups(dt);

    // HUD
    this.hud.update(dt);

    // Screen shake
    if (this._shakeTimer > 0) this._shakeTimer -= dt;

    // Background
    this.bg.update(dt, this.scrollSpeed);

    // Level complete check
    if (!this.player.dead && currentMs >= this.rhythm.duration && this.rhythm.duration > 0) {
      this._levelComplete();
    }
  }

  _checkCollisions() {
    const pBox = this.player.hitAabb();

    for (const h of this.hazards) {
      if (!h.alive) continue;

      // Lasers — only active ones
      if (h instanceof Laser && !h.isActive) continue;

      if (pBox.intersects(h.aabb)) {
        const hit = this.player.takeDamage(this.particles);
        if (hit) {
          this.audio.playSFX('player_hit');
          this._shake(0.15, 4);

          // If dead after hit
          if (this.lives <= 1) {
            this.player.die(this.particles);
            this.audio.playSFX('player_death');
            this._shake(0.3, 6);
          }
          break;
        }
      }
    }
  }

  _onPlayerJump(isDbl, currentMs) {
    this.audio.playSFX(isDbl ? 'double_jump' : 'jump');
    this.particles.spawnJumpSparks(this.player.x + this.player.w / 2, this.player.y + this.player.h);

    const quality = this.rhythm.evaluateJump(currentMs);
    const result  = this.score.recordJump(quality, this.player.x + this.player.w / 2, this.player.y);

    if (quality === 'perfect') {
      this.audio.playSFX('perfect');
      this.particles.spawnPerfect(this.player.x + this.player.w / 2, this.player.y + this.player.h / 2);
    } else if (quality === 'good') {
      this.audio.playSFX('good');
    }

    if (result.comboUp)        this.audio.playSFX('combo_up');
    if (quality === 'miss' && this.score.combo === 0 && result.prevTier > 0) {
      this.audio.playSFX('combo_break');
      this.hud.onComboBreak();
    }
  }

  _onBeat(beat) {
    this.bg.onBeat(beat.strength);
    this.hud.onBeat(beat.strength);

    // Pulse platforms
    for (const p of this.platforms) p.onBeat && p.onBeat();

    // Spawn pattern
    const sec = this.rhythm.currentSection;
    const secLabel = sec ? sec.label : 'verse';
    const diffTier = this.level.id - 1; // 0-indexed
    const beatMs   = 60000 / this.beatmap.bpm;
    const pxPerMs  = this.scrollSpeed / 1000;

    const newHazards = this.patterns.spawn(
      beat, secLabel, diffTier,
      SPAWN_X, beatMs, pxPerMs
    );
    this.hazards.push(...newHazards);

    // Beat ring particle
    this.particles.spawnBeatRing(
      this.player.x + this.player.w / 2,
      this.player.y + this.player.h / 2
    );
  }

  _onSection(section) {
    // Section changes handled by scroll speed update in update()
  }

  _respawn() {
    this.player = new Player(80, FLOOR_Y - 16);
    this._prevLand = false;
  }

  _finishDead() {
    const result = this.score.calcCompletion();
    const { isNewBest, record } = saveLevelRecord(this.level.id, {
      score:        this.score.score,
      rank:         result.rank,
      perfectCount: this.score.perfectCount,
      bestCombo:    this.score.bestCombo,
      cleared:      false,
    });
    this.completion  = result;
    this.savedRecord = { isNewBest, record };
    this.audio.stopMusic();
    if (this.onDead) this.onDead(result, isNewBest, record);
  }

  _levelComplete() {
    if (this.completion) return; // already done
    const result = this.score.calcCompletion();
    const { isNewBest, record } = saveLevelRecord(this.level.id, {
      score:        result.finalScore,
      rank:         result.rank,
      perfectCount: this.score.perfectCount,
      bestCombo:    this.score.bestCombo,
      cleared:      true,
    });
    this.completion  = result;
    this.savedRecord = { isNewBest, record };
    this.audio.playSFX('level_complete');
    if (this.onComplete) this.onComplete(result, isNewBest, record);
  }

  _shake(duration, amount) {
    this._shakeTimer = duration;
    this._shakeAmt   = amount;
  }

  _activePlatforms() {
    // Only pass platforms near the player for collision
    return this.platforms.filter(p => p.x < CANVAS_WIDTH + 200 && p.x + p.w > -200);
  }

  draw(ctx, settings) {
    // Apply screen shake
    let shakeX = 0, shakeY = 0;
    if (settings.screenShake && this._shakeTimer > 0) {
      shakeX = (Math.random() - 0.5) * this._shakeAmt * 2;
      shakeY = (Math.random() - 0.5) * this._shakeAmt * 2;
    }

    ctx.save();
    ctx.translate(Math.round(shakeX), Math.round(shakeY));

    // Background + floor
    this.bg.draw(ctx);

    // Platforms (skip the infinite floor, drawn by bg)
    for (const p of this.platforms) {
      if (p.y >= FLOOR_Y) continue; // floor drawn by renderer
      p.draw(ctx);
    }

    // Hazards
    for (const h of this.hazards) h.draw(ctx);

    // Player
    this.player.draw(ctx);

    // Particles
    this.particles.draw(ctx);

    // Score popups
    this.score.drawPopups(ctx);

    ctx.restore();

    // HUD (no shake)
    this.hud.draw(
      ctx,
      this.score,
      this.lives,
      this.level ? this.level.name : '',
      this.audio.currentTimeMs,
      this.rhythm.duration
    );
  }
}
