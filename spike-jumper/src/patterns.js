// ============================================================
// PATTERN LIBRARY — obstacle chunk definitions + selection
// ============================================================

import { FLOOR_Y, CANVAS_WIDTH, SPAWN_X } from './constants.js';
import { FloorSpike, Laser, Crawler, Flyer, SpikeWall, Projectile } from './hazards.js';

// ──────────────────────────────────────────────────────────────
// Pattern definitions
// Each pattern is a function(spawnX, beatMs) → array of hazards
// beatMs = ms duration of one beat at current BPM
// ──────────────────────────────────────────────────────────────

const LIBRARY = [
  // ── INTRO / EASY ──────────────────────────────────────────
  {
    id: 'single_spike',
    difficulty: 'easy',
    beats: 1,
    types: ['spike'],
    sections: ['intro', 'verse'],
    build(x, beatMs, scrollPxPerMs) {
      return [new FloorSpike(x, 1)];
    },
  },
  {
    id: 'double_spike',
    difficulty: 'easy',
    beats: 2,
    types: ['spike'],
    sections: ['intro', 'verse'],
    build(x, beatMs, scrollPxPerMs) {
      const gap = beatMs * scrollPxPerMs * 1.5;
      return [new FloorSpike(x, 1), new FloorSpike(x + gap, 1)];
    },
  },
  {
    id: 'crawler_alone',
    difficulty: 'easy',
    beats: 2,
    types: ['crawler'],
    sections: ['intro', 'verse'],
    build(x) {
      return [new Crawler(x, 48)];
    },
  },

  // ── MEDIUM / SPIKE PATTERNS ────────────────────────────────
  {
    id: 'spike_run_short',
    difficulty: 'medium',
    beats: 2,
    types: ['spike'],
    sections: ['verse', 'chorus'],
    build(x, beatMs, scrollPxPerMs) {
      const step = beatMs * scrollPxPerMs;
      return [
        new FloorSpike(x,          1),
        new FloorSpike(x + step,   1),
      ];
    },
  },
  {
    id: 'spike_run_long',
    difficulty: 'medium',
    beats: 4,
    types: ['spike'],
    sections: ['verse', 'chorus'],
    build(x, beatMs, scrollPxPerMs) {
      const step = beatMs * scrollPxPerMs * 0.9;
      return [
        new FloorSpike(x,              1),
        new FloorSpike(x + step,       2),
        new FloorSpike(x + step * 2,   1),
        new FloorSpike(x + step * 3,   2),
      ];
    },
  },
  {
    id: 'spike_ceiling_duck',
    difficulty: 'medium',
    beats: 2,
    types: ['spike'],
    sections: ['verse', 'chorus'],
    build(x, beatMs, scrollPxPerMs) {
      const step = beatMs * scrollPxPerMs;
      return [
        new FloorSpike(x,        1, true),  // ceiling spike
        new FloorSpike(x + step, 1, true),
      ];
    },
  },

  // ── LASER PATTERNS ─────────────────────────────────────────
  {
    id: 'laser_horizontal_pulse',
    difficulty: 'medium',
    beats: 2,
    types: ['laser'],
    sections: ['verse', 'chorus'],
    build(x, beatMs) {
      return [new Laser(x, 'horizontal', beatMs)];
    },
  },
  {
    id: 'laser_double',
    difficulty: 'hard',
    beats: 4,
    types: ['laser'],
    sections: ['chorus'],
    build(x, beatMs, scrollPxPerMs) {
      return [
        new Laser(x, 'horizontal', beatMs),
        new Laser(x + beatMs * scrollPxPerMs * 2, 'horizontal', beatMs),
      ];
    },
  },

  // ── ENEMY PATTERNS ─────────────────────────────────────────
  {
    id: 'crawler_pair',
    difficulty: 'medium',
    beats: 3,
    types: ['crawler'],
    sections: ['verse', 'chorus'],
    build(x, beatMs, scrollPxPerMs) {
      const gap = beatMs * scrollPxPerMs * 1.5;
      return [new Crawler(x, 48), new Crawler(x + gap, 48)];
    },
  },
  {
    id: 'flyer_swoop',
    difficulty: 'medium',
    beats: 2,
    types: ['flyer'],
    sections: ['verse', 'chorus'],
    build(x) {
      return [new Flyer(x, FLOOR_Y - 80, 'sine')];
    },
  },
  {
    id: 'flyer_wave',
    difficulty: 'hard',
    beats: 3,
    types: ['flyer'],
    sections: ['chorus'],
    build(x, beatMs, scrollPxPerMs) {
      const step = beatMs * scrollPxPerMs * 0.7;
      return [
        new Flyer(x,          FLOOR_Y - 60,  'sine'),
        new Flyer(x + step,   FLOOR_Y - 100, 'sine'),
        new Flyer(x + step*2, FLOOR_Y - 70,  'sine'),
      ];
    },
  },
  {
    id: 'crawler_laser_combo',
    difficulty: 'hard',
    beats: 3,
    types: ['crawler', 'laser'],
    sections: ['chorus'],
    build(x, beatMs, scrollPxPerMs) {
      return [
        new Laser(x, 'horizontal', beatMs),
        new Crawler(x + beatMs * scrollPxPerMs, 32),
      ];
    },
  },

  // ── ADVANCED ───────────────────────────────────────────────
  {
    id: 'spike_wall_jump',
    difficulty: 'hard',
    beats: 2,
    types: ['spike_wall'],
    sections: ['chorus'],
    build(x) {
      return [new SpikeWall(x)];
    },
  },
  {
    id: 'gauntlet_short',
    difficulty: 'hard',
    beats: 4,
    types: ['spike', 'laser', 'crawler'],
    sections: ['chorus'],
    build(x, beatMs, scrollPxPerMs) {
      const step = beatMs * scrollPxPerMs;
      return [
        new FloorSpike(x,         1),
        new Laser(x + step,       'horizontal', beatMs),
        new Crawler(x + step * 2, 32),
      ];
    },
  },
  {
    id: 'gauntlet_long',
    difficulty: 'hard',
    beats: 8,
    types: ['spike', 'laser', 'crawler', 'flyer'],
    sections: ['chorus'],
    build(x, beatMs, scrollPxPerMs) {
      const step = beatMs * scrollPxPerMs * 0.9;
      return [
        new FloorSpike(x,          1),
        new FloorSpike(x + step,   2),
        new Laser(x + step * 2,    'horizontal', beatMs),
        new Crawler(x + step * 3,  48),
        new Flyer(x + step * 4,    FLOOR_Y - 80, 'sine'),
        new FloorSpike(x + step*5, 1),
        new Laser(x + step * 6,    'horizontal', beatMs),
      ];
    },
  },
  {
    id: 'projectile_wave',
    difficulty: 'hard',
    beats: 2,
    types: ['projectile'],
    sections: ['verse', 'chorus'],
    build(x) {
      return [
        new Projectile(x, FLOOR_Y - 24),
        new Projectile(x + 30, FLOOR_Y - 48),
      ];
    },
  },
];

// ──────────────────────────────────────────────────────────────
// Pattern selector
// ──────────────────────────────────────────────────────────────

const DIFFICULTY_ORDER = ['easy', 'medium', 'hard'];

export class PatternLibrary {
  constructor() {
    this._cooldown = new Set(); // recently used pattern IDs
    this._cooldownMax = 3;      // don't repeat within N patterns
    this._history = [];
  }

  reset() {
    this._cooldown.clear();
    this._history = [];
  }

  /**
   * Select and build a pattern.
   * @param {object} beatEvent   — { strength, pattern, time_ms }
   * @param {string} section     — 'intro'|'verse'|'chorus'|'bridge'
   * @param {number} diffTier    — 0=easy, 1=medium, 2=hard
   * @param {number} spawnX      — x position to spawn at
   * @param {number} beatMs      — ms per beat
   * @param {number} scrollPxPerMs
   * @returns {Array} hazards
   */
  spawn(beatEvent, section, diffTier, spawnX, beatMs, scrollPxPerMs) {
    const maxDiff = DIFFICULTY_ORDER[Math.min(diffTier, DIFFICULTY_ORDER.length - 1)];

    let candidates = LIBRARY.filter(p => {
      const pDiff = DIFFICULTY_ORDER.indexOf(p.difficulty);
      const maxDiffIdx = DIFFICULTY_ORDER.indexOf(maxDiff);
      return (
        pDiff <= maxDiffIdx &&
        !this._cooldown.has(p.id) &&
        (p.sections.includes(section) || section === 'outro')
      );
    });

    // Prefer difficulty matching beat strength
    let preferred;
    if (beatEvent.strength === 'strong') {
      preferred = candidates.filter(p => p.difficulty === maxDiff);
    } else if (beatEvent.strength === 'medium') {
      const lowerDiff = DIFFICULTY_ORDER[Math.max(0, diffTier - 1)];
      preferred = candidates.filter(p => p.difficulty === lowerDiff);
    } else {
      preferred = candidates.filter(p => p.difficulty === 'easy');
    }

    if (preferred.length === 0) preferred = candidates;
    if (preferred.length === 0) return [];

    // Weighted random
    const chosen = preferred[Math.floor(Math.random() * preferred.length)];

    // Update cooldown
    this._history.push(chosen.id);
    this._cooldown.add(chosen.id);
    if (this._history.length > this._cooldownMax) {
      this._cooldown.delete(this._history[this._history.length - 1 - this._cooldownMax]);
    }

    return chosen.build(spawnX, beatMs, scrollPxPerMs);
  }
}
