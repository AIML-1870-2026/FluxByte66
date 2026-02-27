// ============================================================
// PHYSICS — simple AABB + gravity
// ============================================================

import { GRAVITY, FLOOR_Y, CANVAS_WIDTH } from './constants.js';

/**
 * Axis-aligned bounding box.
 * x, y = top-left corner
 */
export class AABB {
  constructor(x, y, w, h) {
    this.x = x; this.y = y;
    this.w = w; this.h = h;
  }
  get right()  { return this.x + this.w; }
  get bottom() { return this.y + this.h; }

  intersects(other) {
    return (
      this.x < other.right  &&
      this.right > other.x  &&
      this.y < other.bottom &&
      this.bottom > other.y
    );
  }
}

/**
 * Apply gravity + clamp to floor. Returns whether the entity is on the ground.
 * @param {object} entity  — must have { x, y, vy, w, h }
 * @param {number} dt      — delta time in seconds
 * @param {Array}  platforms — array of AABB
 */
export function applyGravity(entity, dt, platforms = []) {
  entity.vy += GRAVITY * dt;
  entity.y  += entity.vy * dt;

  let onGround = false;
  const eBox = new AABB(entity.x, entity.y, entity.w, entity.h);

  // Check floor
  if (entity.y + entity.h >= FLOOR_Y) {
    entity.y  = FLOOR_Y - entity.h;
    entity.vy = 0;
    onGround  = true;
  }

  // Check platforms (from above only)
  for (const p of platforms) {
    if (!p.solid) continue;
    const prev_bottom = entity.y + entity.h - entity.vy * dt; // approx prev bottom
    // Landing on top of platform
    if (
      eBox.right  > p.x &&
      eBox.x      < p.x + p.w &&
      entity.y + entity.h >= p.y &&
      entity.y + entity.h <= p.y + p.h + Math.abs(entity.vy) * dt + 4 &&
      entity.vy >= 0
    ) {
      entity.y  = p.y - entity.h;
      entity.vy = 0;
      onGround  = true;
    }
  }

  return onGround;
}
