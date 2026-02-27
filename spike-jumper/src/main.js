// ============================================================
// MAIN — entry point, game loop, state routing
// ============================================================

import { CANVAS_WIDTH, CANVAS_HEIGHT, STATE, LEVELS, COL } from './constants.js';
import { Input }           from './input.js';
import { AudioEngine }     from './audio.js';
import { RhythmEngine }    from './rhythm.js';
import { GameSession }     from './game.js';
import { getSettings, saveSettings } from './storage.js';
import {
  MainMenu, LevelSelect,
  DeathScreen, LevelCompleteScreen,
  HighScoresScreen, SettingsScreen,
} from './ui.js';

// ──────────────────────────────────────────────────────────────
// Canvas setup
// ──────────────────────────────────────────────────────────────

const canvas  = document.getElementById('game');
const ctx     = canvas.getContext('2d');
canvas.width  = CANVAS_WIDTH;
canvas.height = CANVAS_HEIGHT;

// Crisp pixel art rendering
ctx.imageSmoothingEnabled = false;

// CSS scaling via CSS (canvas is rendered at logical res, scaled up via CSS)
function resizeCanvas() {
  const scaleX = window.innerWidth  / CANVAS_WIDTH;
  const scaleY = window.innerHeight / CANVAS_HEIGHT;
  const scale  = Math.min(scaleX, scaleY);
  canvas.style.width  = `${Math.floor(CANVAS_WIDTH  * scale)}px`;
  canvas.style.height = `${Math.floor(CANVAS_HEIGHT * scale)}px`;
}
window.addEventListener('resize', resizeCanvas);
resizeCanvas();

// ──────────────────────────────────────────────────────────────
// Core systems
// ──────────────────────────────────────────────────────────────

const input   = new Input();
const audio   = new AudioEngine();
const rhythm  = new RhythmEngine(audio);
const session = new GameSession(audio, rhythm);

// Screens
const mainMenu     = new MainMenu();
const levelSelect  = new LevelSelect();
const deathScreen  = new DeathScreen();
const completeScr  = new LevelCompleteScreen();
const highScores   = new HighScoresScreen();
const settingsScr  = new SettingsScreen();

// State
let state       = STATE.MENU;
let currentLevel = LEVELS[0];
let settings    = getSettings();
let audioInited = false;

// ──────────────────────────────────────────────────────────────
// Beat maps — loaded dynamically
// ──────────────────────────────────────────────────────────────

async function loadBeatmap(name) {
  try {
    const res  = await fetch(`assets/beatmaps/${name}.json`);
    return await res.json();
  } catch (e) {
    console.warn('Could not load beatmap:', name, e);
    return null;
  }
}

// ──────────────────────────────────────────────────────────────
// Level start
// ──────────────────────────────────────────────────────────────

async function startLevel(level) {
  currentLevel = level;
  const beatmap = await loadBeatmap(level.beatmap);
  if (!beatmap) {
    alert(`Beat map not found for: ${level.name}. Make sure assets/beatmaps/${level.beatmap}.json exists.`);
    return;
  }

  session.load(level, beatmap);
  session.onDead = (result, isNewBest) => {
    deathScreen.show(isNewBest, null);
    state = STATE.DEAD;
  };
  session.onComplete = (result, isNewBest) => {
    completeScr.show();
    state = STATE.LEVEL_COMPLETE;
  };

  state = STATE.PLAYING;
  session.start();
}

// ──────────────────────────────────────────────────────────────
// Game loop
// ──────────────────────────────────────────────────────────────

let lastTime = 0;

async function loop(timestamp) {
  const dt = Math.min((timestamp - lastTime) / 1000, 0.05); // cap at 50ms
  lastTime = timestamp;

  // Init audio on first user gesture (handled via first input flush)
  if (!audioInited && (input.isJump() || input.isConfirm())) {
    audioInited = true;
    await audio.init();
    await audio.resume();
    audio.setMusicVol(settings.musicVol);
    audio.setSfxVol(settings.sfxVol);
  }

  // Update + draw
  update(dt);
  draw();

  input.flush();
  requestAnimationFrame(loop);
}

function update(dt) {
  if (!audioInited) return; // wait for audio init

  let result = null;

  switch (state) {
    case STATE.MENU:
      result = mainMenu.update(dt, input);
      if (result?.action === 'play')         startLevel(LEVELS[0]);
      if (result?.action === 'level_select') state = STATE.LEVEL_SELECT;
      if (result?.action === 'high_scores')  state = STATE.HIGH_SCORES;
      if (result?.action === 'settings')     state = STATE.SETTINGS;
      if (result?.sfx) audio.playSFX(result.sfx);
      break;

    case STATE.LEVEL_SELECT:
      result = levelSelect.update(dt, input);
      if (result?.action === 'menu')         state = STATE.MENU;
      if (result?.action === 'start_level')  startLevel(result.level);
      if (result?.sfx) audio.playSFX(result.sfx);
      break;

    case STATE.PLAYING:
      session.update(dt, input);
      if (input.isSkip()) {
        session.stop();
        const nextIdx = LEVELS.findIndex(l => l.id === currentLevel.id) + 1;
        if (nextIdx < LEVELS.length) {
          startLevel(LEVELS[nextIdx]);
        } else {
          state = STATE.MENU;
        }
        audio.playSFX('menu_confirm');
      }
      break;

    case STATE.DEAD:
      result = deathScreen.update(dt, input, session.score);
      if (result?.action === 'retry') startLevel(currentLevel);
      if (result?.action === 'menu')  { state = STATE.MENU; session.stop(); }
      if (result?.sfx) audio.playSFX(result.sfx);
      break;

    case STATE.LEVEL_COMPLETE:
      result = completeScr.update(dt, input);
      if (result?.action === 'next_level') {
        const nextIdx = LEVELS.findIndex(l => l.id === currentLevel.id) + 1;
        if (nextIdx < LEVELS.length) startLevel(LEVELS[nextIdx]);
        else state = STATE.MENU;
      }
      if (result?.action === 'menu') { state = STATE.MENU; session.stop(); }
      if (result?.sfx) audio.playSFX(result.sfx);
      break;

    case STATE.HIGH_SCORES:
      result = highScores.update(dt, input);
      if (result?.action === 'menu') state = STATE.MENU;
      break;

    case STATE.SETTINGS:
      result = settingsScr.update(dt, input);
      if (result?.action === 'menu') { settings = getSettings(); state = STATE.MENU; }
      if (result?.settingChanged === 'musicVol') audio.setMusicVol(result.value);
      if (result?.settingChanged === 'sfxVol')   audio.setSfxVol(result.value);
      if (result?.sfx) audio.playSFX(result.sfx);
      break;
  }
}

function draw() {
  // Clear
  ctx.fillStyle = COL.BG;
  ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

  switch (state) {
    case STATE.MENU:
      mainMenu.draw(ctx);
      break;
    case STATE.LEVEL_SELECT:
      levelSelect.draw(ctx);
      break;
    case STATE.PLAYING:
      session.draw(ctx, settings);
      break;
    case STATE.DEAD:
      session.draw(ctx, settings); // game world still visible
      deathScreen.draw(ctx, session.score);
      break;
    case STATE.LEVEL_COMPLETE:
      session.draw(ctx, settings);
      completeScr.draw(ctx, session.completion || {}, currentLevel?.name || '');
      break;
    case STATE.HIGH_SCORES:
      highScores.draw(ctx);
      break;
    case STATE.SETTINGS:
      settingsScr.draw(ctx);
      break;
    default:
      // Show "press any key" splash before audio init
      ctx.fillStyle = COL.NEON_RED;
      ctx.font      = '12px monospace';
      ctx.textAlign = 'center';
      ctx.fillText('SPIKE JUMPER: VOID RHYTHM', CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2 - 20);
      ctx.fillStyle = '#888888';
      ctx.font      = '9px monospace';
      ctx.fillText('Press SPACE or ENTER to begin', CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2 + 10);
      ctx.textAlign = 'left';
  }

  if (!audioInited) {
    // Overlay before audio
    ctx.fillStyle = 'rgba(0,0,0,0.7)';
    ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
    ctx.fillStyle = COL.NEON_RED;
    ctx.font      = '14px monospace';
    ctx.textAlign = 'center';
    ctx.fillText('SPIKE JUMPER: VOID RHYTHM', CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2 - 20);
    ctx.fillStyle = '#aaaaaa';
    ctx.font      = '9px monospace';
    ctx.fillText('Press SPACE or ENTER to begin', CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2 + 10);
    ctx.textAlign = 'left';
  }
}

// Start
requestAnimationFrame(loop);
