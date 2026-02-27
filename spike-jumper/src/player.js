// ============================================================
// PLAYER — VOXL entity
// ============================================================

import {
  PLAYER_W, PLAYER_H, FLOOR_Y,
  JUMP_VELOCITY, DBL_JUMP_VEL,
  COYOTE_MS, JUMP_BUFFER_MS,
  GRAVITY, SLIDE_HEIGHT,
  COL,
} from './constants.js';
import { applyGravity, AABB } from './physics.js';

export const PlayerState = {
  IDLE:    'idle',
  RUN:     'run',
  JUMP:    'jump',
  FALL:    'fall',
  SLIDE:   'slide',
  LAND:    'land',
  HIT:     'hit',
  DEAD:    'dead',
};

export class Player {
  constructor(x, y) {
    this.x  = x;
    this.y  = y;
    this.vy = 0;
    this.w  = PLAYER_W;
    this.h  = PLAYER_H;

    this.state        = PlayerState.RUN;
    this.onGround     = false;
    this.canDblJump   = true;
    this.isSliding    = false;

    // Coyote time
    this._coyoteTimer  = 0;
    this._wasOnGround  = false;

    // Jump buffer
    this._jumpBuffer  = 0;

    // Landing animation timer
    this._landTimer   = 0;
    this.LAND_DUR     = 80; // ms

    // Hit invincibility
    this.invincible   = false;
    this._hitTimer    = 0;
    this.HIT_DUR      = 500; // ms
    this._flickerT    = 0;

    // Death
    this.dead         = false;
    this._deathTimer  = 0;
    this.DEATH_DUR    = 600;

    // Visual
    this._glowPulse   = 0;
    this._sparkTimer  = 0;

    // Spark trail particles (managed externally by particle system)
    this.emitSpark    = false;
  }

  get aabb() { return new AABB(this.x, this.y, this.w, this.h); }

  get effectiveH() { return this.isSliding ? SLIDE_HEIGHT : this.h; }

  /** Slide AABB (smaller hitbox when sliding) */
  get slideAabb() {
    return new AABB(this.x, this.y + (this.h - SLIDE_HEIGHT), this.w, SLIDE_HEIGHT);
  }

  hitAabb() {
    return this.isSliding ? this.slideAabb : this.aabb;
  }

  update(dt, input, platforms, rhythmEngine, onJump) {
    const dtMs = dt * 1000;

    if (this.dead) {
      this._deathTimer += dtMs;
      return;
    }

    // Invincibility countdown
    if (this.invincible) {
      this._hitTimer += dtMs;
      this._flickerT += dtMs;
      if (this._hitTimer >= this.HIT_DUR) {
        this.invincible = false;
        this._hitTimer  = 0;
      }
    }

    // Landing timer
    if (this._landTimer > 0) {
      this._landTimer -= dtMs;
    }

    // Slide
    const wantSlide = input.isSlide();
    this.isSliding  = wantSlide && this.onGround;

    // Jump buffer
    if (input.isJump()) {
      this._jumpBuffer = JUMP_BUFFER_MS;
    } else {
      this._jumpBuffer = Math.max(0, this._jumpBuffer - dtMs);
    }

    // Coyote time
    if (this._wasOnGround && !this.onGround) {
      this._coyoteTimer = COYOTE_MS;
    }
    if (this._coyoteTimer > 0) this._coyoteTimer -= dtMs;

    const canJump = this.onGround || this._coyoteTimer > 0;

    // Perform jump
    if (this._jumpBuffer > 0 && !this.isSliding) {
      if (canJump) {
        this._doJump(false, rhythmEngine, onJump);
      } else if (this.canDblJump) {
        this._doJump(true, rhythmEngine, onJump);
      }
    }

    // Gravity + platform collisions
    const wasOnGround = this.onGround;
    this.onGround = applyGravity(this, dt, platforms);
    this._wasOnGround = wasOnGround;

    if (this.onGround && !wasOnGround) {
      // Just landed
      this._landTimer  = this.LAND_DUR;
      this.canDblJump  = true;
    }

    // Glow pulse
    this._glowPulse += dt * 3;
    this._sparkTimer += dt;

    // Emit spark particles when in air
    this.emitSpark = !this.onGround && this._sparkTimer > 0.05;
    if (this.emitSpark) this._sparkTimer = 0;

    // State machine
    this._updateState();
  }

  _doJump(isDbl, rhythmEngine, onJump) {
    this.vy = isDbl ? DBL_JUMP_VEL : JUMP_VELOCITY;
    if (!isDbl) {
      this._coyoteTimer = 0;
      this._jumpBuffer  = 0;
    } else {
      this.canDblJump = false;
      this._jumpBuffer = 0;
    }
    if (onJump) onJump(isDbl);
  }

  _updateState() {
    if (this.dead)           { this.state = PlayerState.DEAD;  return; }
    if (this.invincible && Math.floor(this._flickerT / 50) % 2 === 0 && this._hitTimer < this.HIT_DUR - 50)
                              { this.state = PlayerState.HIT;   }
    else if (this._landTimer > 0) { this.state = PlayerState.LAND; }
    else if (this.isSliding)  { this.state = PlayerState.SLIDE; }
    else if (!this.onGround && this.vy < 0) { this.state = PlayerState.JUMP; }
    else if (!this.onGround && this.vy >= 0){ this.state = PlayerState.FALL; }
    else                      { this.state = PlayerState.RUN;  }
  }

  takeDamage(particleSystem) {
    if (this.invincible || this.dead) return false;
    this.invincible = true;
    this._hitTimer  = 0;
    this._flickerT  = 0;
    return true;
  }

  die(particleSystem) {
    if (this.dead) return;
    this.dead = true;
    this._deathTimer = 0;
    // Spawn death fragments via particle system
    if (particleSystem) particleSystem.spawnDeath(this.x + this.w / 2, this.y + this.h / 2);
  }

  get deathFinished() {
    return this.dead && this._deathTimer >= this.DEATH_DUR;
  }

  draw(ctx) {
    if (this.dead) return; // death handled by particles

    // Hide during white-flash hit frame
    if (this.invincible && this._flickerT < 50) {
      // white flash
      ctx.fillStyle = COL.WHITE;
      ctx.fillRect(Math.round(this.x), Math.round(this.y), this.w, this.h);
      return;
    }

    // Flicker during invincibility
    if (this.invincible && Math.floor(this._flickerT / 60) % 2 === 1) return;

    const glow = 0.5 + 0.5 * Math.sin(this._glowPulse);

    // Body
    ctx.fillStyle = '#1a1a22';
    let drawH = this.isSliding ? SLIDE_HEIGHT : this.h;
    let drawY = this.isSliding ? this.y + (this.h - SLIDE_HEIGHT) : this.y;

    // Jump stretch / fall squash
    let drawW = this.w;
    if (this.state === PlayerState.JUMP) {
      drawH = Math.round(this.h * 1.1);
      drawY = this.y - (drawH - this.h);
    } else if (this.state === PlayerState.FALL) {
      drawH = Math.round(this.h * 0.9);
    } else if (this.state === PlayerState.LAND) {
      drawH = Math.round(this.h * 0.85);
      drawY = this.y + (this.h - drawH);
    }

    ctx.fillRect(Math.round(this.x), Math.round(drawY), drawW, drawH);

    // Inner red glow (1px inset)
    const alpha = 0.4 + glow * 0.5;
    ctx.fillStyle = `rgba(255,26,26,${alpha})`;
    ctx.fillRect(Math.round(this.x) + 2, Math.round(drawY) + 2, drawW - 4, drawH - 4);

    // Eye pixel (center)
    ctx.fillStyle = COL.NEON_RED;
    ctx.fillRect(Math.round(this.x) + Math.floor(this.w / 2) - 1, Math.round(drawY) + Math.floor(drawH / 2) - 1, 2, 2);

    // Edge glow (simulated 1px outline)
    ctx.strokeStyle = `rgba(255,26,26,${0.6 + glow * 0.4})`;
    ctx.lineWidth = 1;
    ctx.strokeRect(Math.round(this.x) + 0.5, Math.round(drawY) + 0.5, drawW - 1, drawH - 1);
  }
}
