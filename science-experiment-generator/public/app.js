/* ============================================================
   SCIENCE EXPERIMENT GENERATOR — Frontend Logic
   ============================================================ */

// ── Supply list ──────────────────────────────────────────────
const SUPPLIES = [
  { id: 'baking-soda',    name: 'Baking Soda'    },
  { id: 'vinegar',        name: 'Vinegar'         },
  { id: 'balloons',       name: 'Balloons'        },
  { id: 'rubber-bands',   name: 'Rubber Bands'    },
  { id: 'paper-clips',    name: 'Paper Clips'     },
  { id: 'salt',           name: 'Salt'            },
  { id: 'sugar',          name: 'Sugar'           },
  { id: 'food-coloring',  name: 'Food Coloring'   },
  { id: 'candles',        name: 'Candles'         },
  { id: 'matches',        name: 'Matches'         },
  { id: 'aluminum-foil',  name: 'Alum. Foil'      },
  { id: 'plastic-bags',   name: 'Plastic Bags'    },
  { id: 'tape',           name: 'Tape'            },
  { id: 'string',         name: 'String'          },
  { id: 'cups',           name: 'Cups'            },
  { id: 'bowls',          name: 'Bowls'           },
  { id: 'spoons',         name: 'Spoons'          },
  { id: 'magnets',        name: 'Magnets'         },
  { id: 'batteries',      name: 'Batteries'       },
  { id: 'led-bulbs',      name: 'LED Bulbs'       },
  { id: 'straws',         name: 'Straws'          },
  { id: 'toothpicks',     name: 'Toothpicks'      },
  { id: 'cornstarch',     name: 'Cornstarch'      },
  { id: 'dish-soap',      name: 'Dish Soap'       },
  { id: 'vegetable-oil',  name: 'Veg. Oil'        },
  { id: 'ice',            name: 'Ice'             },
  { id: 'sand',           name: 'Sand'            },
  { id: 'soil',           name: 'Soil'            },
  { id: 'seeds',          name: 'Seeds'           },
  { id: 'paper-towels',   name: 'Paper Towels'    },
];

// ── DOM refs ─────────────────────────────────────────────────
const apiKeyInput      = document.getElementById('api-key-input');
const gradeSelect      = document.getElementById('grade-select');
const materialsInput   = document.getElementById('materials-input');
const supplyGrid       = document.getElementById('supply-grid');
const generateBtn      = document.getElementById('generate-btn');
const generateLabel    = document.getElementById('generate-label');
const generateIcon     = document.getElementById('generate-icon');
const resultsPlaceholder = document.getElementById('results-placeholder');
const resultsContent   = document.getElementById('results-content');
const difficultyBadge  = document.getElementById('difficulty-badge');
const resultsBody      = document.getElementById('results-body');
const suggestSubsBtn   = document.getElementById('suggest-subs-btn');
const printBtn         = document.getElementById('print-btn');
const saveBtn          = document.getElementById('save-btn');
const subsPanel        = document.getElementById('subs-panel');
const subsUnavailableList = document.getElementById('subs-unavailable-list');
const subsResult       = document.getElementById('subs-result');
const getSubsBtn       = document.getElementById('get-subs-btn');
const historyList      = document.getElementById('history-list');
const historyEmpty     = document.getElementById('history-empty');
const clearHistoryBtn  = document.getElementById('clear-history-btn');
const printWorksheet   = document.getElementById('print-worksheet');

// ── State ─────────────────────────────────────────────────────
let currentMarkdown  = '';
let currentGrade     = '';
let currentMaterials = '';
let currentTitle     = '';
let currentDifficulty = '';

const HISTORY_KEY = 'sciexp_history';

// ── Supply grid ───────────────────────────────────────────────
function buildSupplyGrid() {
  SUPPLIES.forEach(supply => {
    const item = document.createElement('div');
    item.className = 'supply-item';
    item.dataset.id = supply.id;
    item.dataset.name = supply.name;
    item.title = supply.name;

    const img = document.createElement('img');
    img.src  = `images/supplies/${supply.id}.svg`;
    img.alt  = supply.name;
    img.loading = 'lazy';

    const label = document.createElement('span');
    label.textContent = supply.name;

    item.appendChild(img);
    item.appendChild(label);
    item.addEventListener('click', () => toggleSupply(item));
    supplyGrid.appendChild(item);
  });
}

function toggleSupply(item) {
  item.classList.toggle('selected');
  syncSuppliesIntoTextarea();
}

function syncSuppliesIntoTextarea() {
  const selected = [...document.querySelectorAll('.supply-item.selected')]
    .map(el => el.dataset.name);

  const current = materialsInput.value
    .split(/[\n,]+/)
    .map(s => s.trim())
    .filter(s => s && !SUPPLIES.some(sup => sup.name.toLowerCase() === s.toLowerCase()));

  const combined = [...current, ...selected].filter(Boolean);
  materialsInput.value = combined.join(', ');
}

// ── Generate ──────────────────────────────────────────────────
generateBtn.addEventListener('click', generateExperiment);

async function generateExperiment() {
  const materials = materialsInput.value.trim();
  if (!materials) {
    alert('Please add some materials first.');
    return;
  }

  setLoading(true);
  resetResults();

  currentGrade     = gradeSelect.value;
  currentMaterials = materials;

  try {
    const data = await callApi({
      gradeLevel: currentGrade,
      materials,
      apiKey: apiKeyInput.value.trim(),
      type: 'generate'
    });

    if (data.error) {
      showError(data.error);
      return;
    }

    currentMarkdown = data.markdown;
    renderResult(data.markdown);
    autoSaveToHistory();
  } catch (err) {
    showError(err.message);
  } finally {
    setLoading(false);
  }
}

function setLoading(on) {
  generateBtn.disabled = on;
  generateBtn.classList.toggle('loading', on);
  generateLabel.textContent = on ? 'Generating…' : 'Generate Experiment';
  if (on) {
    const spinner = document.createElement('div');
    spinner.className = 'spinner';
    generateBtn.insertBefore(spinner, generateLabel);
  } else {
    document.querySelector('.spinner')?.remove();
  }
}

function resetResults() {
  resultsPlaceholder.hidden = false;
  resultsContent.hidden     = true;
  subsPanel.hidden          = true;
  subsPanel.open            = false;
  subsResult.innerHTML      = '';
  subsUnavailableList.innerHTML = '';
}

function renderResult(markdown) {
  const html = DOMPurify.sanitize(marked.parse(markdown));
  resultsBody.innerHTML = html;

  currentTitle      = extractTitle(markdown);
  currentDifficulty = extractDifficulty(markdown);

  renderDifficultyBadge(currentDifficulty);

  resultsPlaceholder.hidden = true;
  resultsContent.hidden     = false;
}

function extractTitle(md) {
  const match = md.match(/^##\s+(.+)/m);
  return match ? match[1].trim() : 'Untitled Experiment';
}

function extractDifficulty(md) {
  const match = md.match(/\*{1,2}Difficulty\*{1,2}[:\s]+([^\n*]+)/i);
  if (!match) return 'unknown';
  return match[1].trim().toLowerCase().replace(/[⭐\s]+/g, '');
}

function renderDifficultyBadge(difficulty) {
  let label = '', cls = '';
  if (difficulty.includes('easy'))   { label = '⭐ Easy';         cls = 'easy'; }
  else if (difficulty.includes('medium')) { label = '⭐⭐ Medium'; cls = 'medium'; }
  else if (difficulty.includes('hard'))   { label = '⭐⭐⭐ Hard'; cls = 'hard'; }
  else { label = difficulty; cls = 'easy'; }

  difficultyBadge.textContent = label;
  difficultyBadge.className   = `badge ${cls}`;
}

function showError(msg) {
  resultsPlaceholder.hidden = true;
  resultsContent.hidden     = false;
  resultsBody.innerHTML = `<p style="color:var(--accent-red)">⚠️ ${msg}</p>`;
  difficultyBadge.textContent = '';
}

// ── Substitutions ─────────────────────────────────────────────
suggestSubsBtn.addEventListener('click', () => {
  if (!currentMaterials) return;

  const materialList = currentMaterials
    .split(/[\n,]+/)
    .map(s => s.trim())
    .filter(Boolean);

  subsUnavailableList.innerHTML = '';

  const labelEl = document.createElement('p');
  labelEl.className = 'sub-materials-label';
  labelEl.textContent = 'Mark materials you don\'t have:';
  subsUnavailableList.appendChild(labelEl);

  materialList.forEach(mat => {
    const chip = document.createElement('label');
    chip.className = 'sub-material-item';
    chip.innerHTML = `<input type="checkbox"> ${mat}`;
    chip.querySelector('input').addEventListener('change', e => {
      chip.classList.toggle('unavailable', e.target.checked);
    });
    subsUnavailableList.appendChild(chip);
  });

  subsPanel.hidden = false;
  subsPanel.open   = true;
});

getSubsBtn.addEventListener('click', async () => {
  const unavailable = [...subsUnavailableList.querySelectorAll('input:checked')]
    .map(cb => cb.parentElement.textContent.trim());

  if (!unavailable.length) {
    alert('Select at least one unavailable material.');
    return;
  }

  getSubsBtn.textContent = 'Fetching…';
  getSubsBtn.disabled    = true;
  subsResult.innerHTML   = '<p style="color:var(--text-muted)">Thinking…</p>';

  try {
    const data = await callApi({
      gradeLevel: currentGrade,
      materials:  currentMaterials,
      apiKey:     apiKeyInput.value.trim(),
      type:       'substitution',
      unavailableMaterials: unavailable.join(', ')
    });

    if (data.error) {
      subsResult.innerHTML = `<p style="color:var(--accent-red)">⚠️ ${data.error}</p>`;
    } else {
      subsResult.innerHTML = DOMPurify.sanitize(marked.parse(data.markdown));
    }
  } catch (err) {
    subsResult.innerHTML = `<p style="color:var(--accent-red)">⚠️ ${err.message}</p>`;
  } finally {
    getSubsBtn.textContent = 'Get Substitutions';
    getSubsBtn.disabled    = false;
  }
});

// ── Print Worksheet ───────────────────────────────────────────
printBtn.addEventListener('click', () => {
  if (!currentMarkdown) return;
  buildWorksheet();
  window.print();
});

function buildWorksheet() {
  document.getElementById('ws-title').textContent = currentTitle;
  document.getElementById('ws-difficulty').textContent =
    currentDifficulty
      ? `Difficulty: ${currentDifficulty.charAt(0).toUpperCase() + currentDifficulty.slice(1)}`
      : '';
  document.getElementById('ws-grade').textContent = currentGrade;
  document.getElementById('ws-date').textContent  = new Date().toLocaleDateString();

  // Extract materials list
  const matSection = extractSection(currentMarkdown, 'Materials Needed');
  const wsMaterials = document.getElementById('ws-materials');
  wsMaterials.innerHTML = '';
  if (matSection) {
    matSection
      .split('\n')
      .map(l => l.replace(/^[-*]\s*/, '').trim())
      .filter(Boolean)
      .forEach(item => {
        const li = document.createElement('li');
        li.textContent = item;
        wsMaterials.appendChild(li);
      });
  }

  // Extract steps
  const stepsSection = extractSection(currentMarkdown, 'Step-by-Step Instructions');
  const wsSteps = document.getElementById('ws-steps');
  wsSteps.innerHTML = '';
  if (stepsSection) {
    stepsSection
      .split('\n')
      .map(l => l.replace(/^\d+\.\s*/, '').trim())
      .filter(Boolean)
      .forEach(step => {
        const li = document.createElement('li');
        li.textContent = step;
        wsSteps.appendChild(li);
      });
  }
}

function extractSection(md, heading) {
  const regex = new RegExp(`###\\s+${heading}\\s*\\n([\\s\\S]*?)(?=\\n###|$)`, 'i');
  const match = md.match(regex);
  return match ? match[1].trim() : null;
}

// ── History ───────────────────────────────────────────────────
function loadHistory() {
  try {
    return JSON.parse(localStorage.getItem(HISTORY_KEY) || '[]');
  } catch { return []; }
}

function saveHistory(history) {
  localStorage.setItem(HISTORY_KEY, JSON.stringify(history));
}

function autoSaveToHistory() {
  addToHistory(false);
}

saveBtn.addEventListener('click', () => addToHistory(true));

function addToHistory(notify = false) {
  if (!currentMarkdown) return;

  const history = loadHistory();
  const entry = {
    id:         Date.now(),
    title:      currentTitle,
    grade:      currentGrade,
    difficulty: currentDifficulty,
    markdown:   currentMarkdown,
    materials:  currentMaterials,
    date:       new Date().toLocaleDateString()
  };

  // Avoid duplicates by title+grade
  const idx = history.findIndex(e => e.title === entry.title && e.grade === entry.grade);
  if (idx >= 0) history[idx] = entry;
  else history.unshift(entry);

  saveHistory(history);
  renderHistory();
  if (notify) saveBtn.textContent = '✓ Saved!';
  setTimeout(() => { saveBtn.textContent = '💾 Save to History'; }, 1500);
}

function renderHistory() {
  const history = loadHistory();
  historyList.innerHTML = '';

  if (!history.length) {
    historyList.appendChild(historyEmpty);
    historyEmpty.hidden = false;
    return;
  }

  history.forEach(entry => {
    const item = document.createElement('div');
    item.className = 'history-item';
    item.innerHTML = `
      <div class="history-item-title">${entry.title}</div>
      <div class="history-item-meta">${entry.grade} · ${entry.date}</div>
      <span class="history-badge ${entry.difficulty || 'easy'}">${
        entry.difficulty === 'easy'   ? '⭐ Easy'   :
        entry.difficulty === 'medium' ? '⭐⭐ Med'  :
        entry.difficulty === 'hard'   ? '⭐⭐⭐ Hard' : entry.difficulty
      }</span>`;

    item.addEventListener('click', () => {
      currentMarkdown   = entry.markdown;
      currentGrade      = entry.grade;
      currentMaterials  = entry.materials;
      currentTitle      = entry.title;
      currentDifficulty = entry.difficulty;
      renderResult(entry.markdown);
      document.querySelectorAll('.history-item').forEach(el => el.classList.remove('active'));
      item.classList.add('active');
    });

    historyList.appendChild(item);
  });
}

clearHistoryBtn.addEventListener('click', () => {
  if (!confirm('Clear all saved experiments?')) return;
  localStorage.removeItem(HISTORY_KEY);
  renderHistory();
});

// ── API Call ──────────────────────────────────────────────────
// Calls OpenAI directly from the browser using the user-supplied key.
// Works on GitHub Pages (no server needed) and locally.
async function callApi({ gradeLevel, materials, apiKey, type, unavailableMaterials }) {
  if (!apiKey) {
    return { error: 'No API key provided. Enter your OpenAI key in the field at the top.' };
  }

  let messages;

  if (type === 'substitution') {
    messages = [
      {
        role: 'system',
        content: `You are an experienced science educator designing experiments for ${gradeLevel} students. Suggest practical alternative materials that can replace unavailable ones while achieving the same experimental result. Format your response in Markdown.`
      },
      {
        role: 'user',
        content: `The experiment uses these materials: ${materials}\n\nThese materials are unavailable: ${unavailableMaterials}\n\nFor each unavailable material, suggest one or two substitutes a ${gradeLevel} student could realistically find at home. Explain briefly why each substitute works.`
      }
    ];
  } else {
    messages = [
      {
        role: 'system',
        content: `You are an experienced science educator designing experiments for ${gradeLevel} students.\nYour experiments must be safe, engaging, and achievable with common household materials.\nFormat your response in Markdown with EXACTLY these sections in this order:\n## [Experiment Title]\n**Difficulty:** [Easy / Medium / Hard]\n### Hypothesis\n### Materials Needed\n### Step-by-Step Instructions\n### Expected Outcome\n### The Science Behind It\n### Safety Notes\nKeep language and complexity appropriate for ${gradeLevel}.`
      },
      {
        role: 'user',
        content: `Generate a science experiment using some or all of these available materials:\n${materials}\nThe student is in ${gradeLevel}. Suggest one clear experiment. If some materials are not ideal, note which ones are most important.`
      }
    ];
  }

  try {
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      body: JSON.stringify({ model: 'gpt-4o', messages, temperature: 0.7 })
    });

    if (!response.ok) {
      const err = await response.json().catch(() => ({}));
      return { error: `OpenAI API request failed: ${err.error?.message || response.statusText}` };
    }

    const data = await response.json();
    return { markdown: data.choices[0]?.message?.content ?? '' };
  } catch (err) {
    return { error: `Request failed: ${err.message}` };
  }
}

// ── Init ──────────────────────────────────────────────────────
buildSupplyGrid();
renderHistory();
