// ============================================================
// STORAGE — localStorage high score persistence
// ============================================================

const KEY = 'sj_scores_v1';
const KEY_SETTINGS = 'sj_settings_v1';

function load() {
  try {
    return JSON.parse(localStorage.getItem(KEY)) || {};
  } catch { return {}; }
}

function save(data) {
  try { localStorage.setItem(KEY, JSON.stringify(data)); } catch {}
}

export function getLevelRecord(levelId) {
  const all = load();
  return all[levelId] || {
    bestScore:    0,
    bestRank:     null,
    perfectCount: 0,
    bestCombo:    0,
    clears:       0,
    attempts:     0,
  };
}

export function saveLevelRecord(levelId, run) {
  // run = { score, rank, perfectCount, bestCombo, cleared }
  const all  = load();
  const prev = all[levelId] || {};

  const rankOrder = ['VOID MASTER', 'PHANTOM', 'DRIFTER', 'LOST'];
  const prevRankIdx = rankOrder.indexOf(prev.bestRank);
  const newRankIdx  = rankOrder.indexOf(run.rank);
  const betterRank  = newRankIdx < prevRankIdx || prevRankIdx === -1;

  all[levelId] = {
    bestScore:    Math.max(prev.bestScore    || 0, run.score),
    bestRank:     betterRank ? run.rank : (prev.bestRank || run.rank),
    perfectCount: Math.max(prev.perfectCount || 0, run.perfectCount),
    bestCombo:    Math.max(prev.bestCombo    || 0, run.bestCombo),
    clears:       (prev.clears    || 0) + (run.cleared ? 1 : 0),
    attempts:     (prev.attempts  || 0) + 1,
  };

  const isNewBest = run.score > (prev.bestScore || 0);
  save(all);
  return { isNewBest, record: all[levelId] };
}

export function getAllRecords() {
  return load();
}

// Settings
const DEFAULT_SETTINGS = {
  musicVol:    0.8,
  sfxVol:      0.7,
  screenShake: true,
  beatFlash:   true,
  floatText:   true,
  audioOffset: 0,   // ms
};

export function getSettings() {
  try {
    return { ...DEFAULT_SETTINGS, ...JSON.parse(localStorage.getItem(KEY_SETTINGS)) };
  } catch { return { ...DEFAULT_SETTINGS }; }
}

export function saveSettings(s) {
  try { localStorage.setItem(KEY_SETTINGS, JSON.stringify(s)); } catch {}
}

export function isLevelUnlocked(levelId) {
  if (levelId === 1) return true;
  const prev = getLevelRecord(levelId - 1);
  return prev.clears > 0;
}
