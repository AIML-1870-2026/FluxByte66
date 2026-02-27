// ============================================================
// CONSTANTS — Spike Jumper: Void Rhythm
// ============================================================

export const CANVAS_WIDTH  = 800;
export const CANVAS_HEIGHT = 450;
export const PIXEL_SCALE   = 2; // logical pixels per canvas pixel

// Colors
export const COL = {
  BG:           '#0a0a0f',
  VOID_BLUE:    '#0d0d1a',
  NEON_RED:     '#FF1A1A',
  RED_BRIGHT:   '#FF4444',
  RED_DIM:      '#CC0000',
  BLOOD_ORANGE: '#993300',
  CRIMSON:      '#550000',
  WHITE:        '#FFFFFF',
  DARK_GREY:    '#1a1a1a',
  CHARCOAL:     '#2a2a2a',
  STONE:        '#222233',
  STONE_LIGHT:  '#2e2e44',
};

// Physics
export const GRAVITY          = 1800;  // px/s²
export const JUMP_VELOCITY    = -520;  // px/s
export const DBL_JUMP_VEL     = -400;
export const COYOTE_MS        = 80;
export const JUMP_BUFFER_MS   = 100;
export const SLIDE_HEIGHT     = 10;   // player height when sliding
export const PLAYER_W         = 16;
export const PLAYER_H         = 16;

// Scroll
export const BASE_SCROLL_PX_PER_S = 220;

// Floor / geometry
export const FLOOR_Y = CANVAS_HEIGHT - 72; // top of the floor

// Rhythm timing windows (ms)
export const PERFECT_WINDOW = 50;
export const GOOD_WINDOW    = 120;

// Scoring
export const SCORE_PERFECT = 100;
export const SCORE_GOOD    = 50;

// Combo thresholds → multipliers
export const COMBO_TIERS = [
  { min: 0,  mult: 1 },
  { min: 5,  mult: 2 },
  { min: 10, mult: 3 },
  { min: 20, mult: 4 },
  { min: 40, mult: 5 },
];

// Particles
export const MAX_PARTICLES = 40;

// Lives
export const MAX_LIVES = 3;

// Game states
export const STATE = {
  MENU:           'MENU',
  LEVEL_SELECT:   'LEVEL_SELECT',
  PLAYING:        'PLAYING',
  DEAD:           'DEAD',
  LEVEL_COMPLETE: 'LEVEL_COMPLETE',
  HIGH_SCORES:    'HIGH_SCORES',
  SETTINGS:       'SETTINGS',
};

// Spawn lookahead: hazards spawn this many px ahead of the player
export const SPAWN_X = CANVAS_WIDTH + 80;

// Beat spawn lookahead — recalculated per frame
// spawn_lookahead_ms = SPAWN_X / scroll_speed_px_per_ms

// Levels definition
export const LEVELS = [
  {
    id: 1,
    name: 'The Awakening',
    bpm: 110,
    beatmap: 'the_awakening',
    scrollBase: 1.0,
    unlocked: true,
  },
  {
    id: 2,
    name: 'Void March',
    bpm: 120,
    beatmap: 'void_march',
    scrollBase: 1.2,
    unlocked: false,
  },
  {
    id: 3,
    name: 'Crimson Descent',
    bpm: 135,
    beatmap: 'crimson_descent',
    scrollBase: 1.35,
    unlocked: false,
  },
  {
    id: 4,
    name: 'Gothic Pulse',
    bpm: 150,
    beatmap: 'gothic_pulse',
    scrollBase: 1.5,
    unlocked: false,
  },
  {
    id: 5,
    name: 'Necrospace',
    bpm: 165,
    beatmap: 'necrospace',
    scrollBase: 1.65,
    unlocked: false,
  },
];

export const RANK_THRESHOLDS = [
  { min: 0.95, rank: 'VOID MASTER', bonus: 5000 },
  { min: 0.80, rank: 'PHANTOM',     bonus: 2500 },
  { min: 0.60, rank: 'DRIFTER',     bonus: 1000 },
  { min: 0,    rank: 'LOST',        bonus: 0    },
];
