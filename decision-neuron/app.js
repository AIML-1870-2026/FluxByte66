/* ============================================
   Decision Neuron — Single Neuron Visualization
   ============================================ */

// ---- Constants ----
const FEATURE_LABELS = ['Stress', 'Hours Avail', 'Mental Energy', 'Sleep Debt', 'Demands', 'Tiredness'];
const FEATURE_COLORS = ['#448aff', '#00e676', '#d500f9', '#ff1744', '#ff9100', '#a1887f'];
const WEIGHT_SIGNS = [1, 1, 1, -1, -1, -1]; // positive or negative by design

// Canvas theme colors
const BG = '#0c0c12';
const NODE_STROKE = '#ff1a1a';
const NODE_FILL = '#14141e';
const TEXT_DIM = '#664444';
const TEXT_MED = '#aa8888';
const TEXT_BRIGHT = '#e8e0e0';

// ---- Normalization ----
function normalizeInput(index, raw) {
  if (index === 1) return (raw - 4) / 8; // hours: 4-12 → 0-1
  return raw / 10; // all others: 0-10 → 0-1
}

// ---- Application State ----
const state = {
  weights: new Array(6).fill(0),
  bias: 0,
  stepCount: 0,
  learningRate: 0.1,
  points: [], // { features: [6 normalized], label: 0|1 }
  isTraining: false,

  // Current raw slider values
  inputs: [5, 8, 5, 3, 5, 5], // stress, hours, mental, debt, demands, tired

  // Animation: signal pulses traveling along connections
  pulsePhase: 0,
};

// ---- DOM Cache ----
const dom = {};

function cacheDom() {
  dom.canvas = document.getElementById('neuron-canvas');
  dom.ctx = dom.canvas.getContext('2d');

  dom.liveResult = document.getElementById('live-result');
  dom.liveProb = document.getElementById('live-prob');
  dom.liveProbFill = document.getElementById('live-prob-fill');
  dom.liveShould = document.getElementById('live-should');
  dom.liveShouldScore = document.getElementById('live-should-score');
  dom.liveMatch = document.getElementById('live-match');
  dom.liveMatchIcon = document.getElementById('live-match-icon');
  dom.liveMatchText = document.getElementById('live-match-text');

  dom.sliders = [
    document.getElementById('slider-stress'),
    document.getElementById('slider-hours'),
    document.getElementById('slider-mental'),
    document.getElementById('slider-debt'),
    document.getElementById('slider-demands'),
    document.getElementById('slider-tired'),
  ];
  dom.vals = [
    document.getElementById('val-stress'),
    document.getElementById('val-hours'),
    document.getElementById('val-mental'),
    document.getElementById('val-debt'),
    document.getElementById('val-demands'),
    document.getElementById('val-tired'),
  ];

  dom.btnAddYes = document.getElementById('btn-add-yes');
  dom.btnAddNo = document.getElementById('btn-add-no');
  dom.btnStep = document.getElementById('btn-step');
  dom.btnTrain = document.getElementById('btn-train');
  dom.btnReset = document.getElementById('btn-reset');
  dom.trainProgress = document.getElementById('train-progress');
  dom.progressFill = document.getElementById('progress-fill');
  dom.progressText = document.getElementById('progress-text');
  dom.sliderLR = document.getElementById('slider-lr');
  dom.valLR = document.getElementById('val-lr');

  dom.metricStep = document.getElementById('metric-step');
  dom.metricAccuracy = document.getElementById('metric-accuracy');
  dom.metricPoints = document.getElementById('metric-points');
  dom.wEls = [
    document.getElementById('w-stress'),
    document.getElementById('w-hours'),
    document.getElementById('w-mental'),
    document.getElementById('w-debt'),
    document.getElementById('w-demands'),
    document.getElementById('w-tired'),
  ];
  dom.wBias = document.getElementById('w-bias');

  dom.confirmOverlay = document.getElementById('confirm-overlay');
  dom.confirmYes = document.getElementById('confirm-yes');
  dom.confirmNo = document.getElementById('confirm-no');
}

// ---- Init ----
document.addEventListener('DOMContentLoaded', () => {
  cacheDom();
  initWeights();
  initControls();
  resizeCanvas();
  updateLiveDecision();
  updateMetrics();
  startAnimationLoop();

  window.addEventListener('resize', debounce(() => {
    resizeCanvas();
  }, 150));
});

function initWeights() {
  for (let i = 0; i < 6; i++) state.weights[i] = (Math.random() - 0.5);
  state.bias = 0;
}

function resizeCanvas() {
  const dpr = window.devicePixelRatio || 1;
  const rect = dom.canvas.parentElement.getBoundingClientRect();
  dom.canvas.width = rect.width * dpr;
  dom.canvas.height = rect.height * dpr;
  dom.canvas.style.width = rect.width + 'px';
  dom.canvas.style.height = rect.height + 'px';
}

// ---- Math ----
function sigmoid(z) { return 1 / (1 + Math.exp(-z)); }

function getNormalizedInputs() {
  return state.inputs.map((v, i) => normalizeInput(i, v));
}

function predict(features) {
  let z = state.bias;
  for (let i = 0; i < 6; i++) z += state.weights[i] * features[i];
  return sigmoid(z);
}

function computeZ(features) {
  let z = state.bias;
  for (let i = 0; i < 6; i++) z += state.weights[i] * features[i];
  return z;
}

// ---- Training ----
function trainStep() {
  if (state.points.length === 0) return;
  const lr = state.learningRate;
  for (const pt of state.points) {
    const yHat = predict(pt.features);
    const error = pt.label - yHat;
    const grad = error * yHat * (1 - yHat);
    for (let i = 0; i < 6; i++) state.weights[i] += lr * grad * pt.features[i];
    state.bias += lr * grad;
  }
  state.stepCount++;
}

function computeAccuracy() {
  if (state.points.length === 0) return null;
  let correct = 0;
  for (const pt of state.points) {
    if ((predict(pt.features) >= 0.5 ? 1 : 0) === pt.label) correct++;
  }
  return correct / state.points.length;
}

// ---- Should-be heuristic ----
function computeShouldScore() {
  const n = getNormalizedInputs();
  return (n[0] + n[1] + n[2]) - (n[3] + n[4] + n[5]);
}

// ---- Live Decision ----
function updateLiveDecision() {
  const features = getNormalizedInputs();
  const prob = predict(features);
  const neuronYes = prob >= 0.5;

  dom.liveResult.textContent = neuronYes ? 'Relax' : 'Sleep';
  dom.liveResult.className = 'live-decision-result ' + (neuronYes ? 'yes' : 'no');
  dom.liveProb.textContent = `P = ${(prob * 100).toFixed(1)}%`;
  dom.liveProbFill.style.width = (prob * 100) + '%';
  dom.liveProbFill.className = 'live-prob-fill ' + (neuronYes ? 'yes' : 'no');

  const score = computeShouldScore();
  const shouldYes = score > 0;
  dom.liveShould.textContent = shouldYes ? 'Relax' : 'Sleep';
  dom.liveShould.className = 'live-decision-result ' + (shouldYes ? 'yes' : 'no');
  dom.liveShouldScore.textContent = `Score: ${score >= 0 ? '+' : ''}${score.toFixed(2)}`;

  const agrees = neuronYes === shouldYes;
  dom.liveMatch.className = 'live-match ' + (agrees ? 'agree' : 'disagree');
  dom.liveMatchIcon.textContent = agrees ? '\u2714' : '\u2716';
  dom.liveMatchText.textContent = agrees ? 'Neuron agrees' : 'Neuron disagrees';
}

// ---- Controls ----
function initControls() {
  // Input sliders
  dom.sliders.forEach((sl, i) => {
    sl.addEventListener('input', () => {
      state.inputs[i] = parseFloat(sl.value);
      dom.vals[i].textContent = state.inputs[i].toFixed(1);
      updateLiveDecision();
    });
  });

  // Add training point
  dom.btnAddYes.addEventListener('click', () => addTrainingPoint(1));
  dom.btnAddNo.addEventListener('click', () => addTrainingPoint(0));

  // Training
  dom.btnStep.addEventListener('click', handleStep);
  dom.btnTrain.addEventListener('click', handleAutoTrain);
  dom.btnReset.addEventListener('click', () => dom.confirmOverlay.classList.remove('hidden'));
  dom.confirmYes.addEventListener('click', handleReset);
  dom.confirmNo.addEventListener('click', () => dom.confirmOverlay.classList.add('hidden'));

  // Learning rate
  dom.sliderLR.addEventListener('input', () => {
    state.learningRate = parseFloat(dom.sliderLR.value);
    dom.valLR.textContent = state.learningRate.toFixed(2);
  });
}

function addTrainingPoint(label) {
  state.points.push({ features: getNormalizedInputs(), label });
  const btn = label === 1 ? dom.btnAddYes : dom.btnAddNo;
  const cls = label === 1 ? 'flash-yes' : 'flash-no';
  btn.classList.remove(cls); void btn.offsetWidth; btn.classList.add(cls);
  updateMetrics();
  updateLiveDecision();
}

function handleStep() {
  if (state.points.length === 0) return;
  trainStep();
  animateButton(dom.btnStep);
  updateMetrics();
  updateLiveDecision();
}

async function handleAutoTrain() {
  if (state.points.length === 0 || state.isTraining) return;
  state.isTraining = true;
  dom.trainProgress.classList.remove('hidden');
  dom.btnTrain.disabled = true;
  for (let i = 0; i < 10; i++) {
    trainStep();
    dom.progressFill.style.width = ((i + 1) / 10 * 100) + '%';
    dom.progressText.textContent = `Training... ${i + 1}/10`;
    updateMetrics();
    updateLiveDecision();
    await new Promise(r => setTimeout(r, 100));
  }
  dom.progressText.textContent = 'Training complete!';
  setTimeout(() => { dom.trainProgress.classList.add('hidden'); dom.progressFill.style.width = '0%'; }, 2000);
  dom.btnTrain.disabled = false;
  state.isTraining = false;
}

function handleReset() {
  state.points = [];
  state.stepCount = 0;
  initWeights();
  dom.confirmOverlay.classList.add('hidden');
  updateMetrics();
  updateLiveDecision();
}

// ---- Metrics ----
function updateMetrics() {
  dom.metricStep.textContent = state.stepCount;
  dom.metricStep.classList.remove('pop'); void dom.metricStep.offsetWidth; dom.metricStep.classList.add('pop');

  const acc = computeAccuracy();
  dom.metricAccuracy.textContent = acc === null ? '\u2014' : (acc * 100).toFixed(1) + '%';

  const yc = state.points.filter(p => p.label === 1).length;
  const nc = state.points.filter(p => p.label === 0).length;
  dom.metricPoints.textContent = `${state.points.length} (${yc} Yes, ${nc} No)`;

  for (let i = 0; i < 6; i++) {
    const w = state.weights[i];
    dom.wEls[i].textContent = (w >= 0 ? '+' : '') + w.toFixed(2);
    dom.wEls[i].className = 'metric-value weight-val ' + (w >= 0 ? 'weight-positive' : 'weight-negative');
    if (Math.abs(w) > 1.0) dom.wEls[i].classList.add('weight-bold');
  }
  const b = state.bias;
  dom.wBias.textContent = (b >= 0 ? '+' : '') + b.toFixed(2);
  dom.wBias.className = 'metric-value weight-val ' + (b >= 0 ? 'weight-positive' : 'weight-negative');
  if (Math.abs(b) > 1.0) dom.wBias.classList.add('weight-bold');
}

// ---- Animation Loop ----
function startAnimationLoop() {
  function frame(ts) {
    state.pulsePhase = (ts / 1000) % 1; // 0-1 repeating every second
    renderNeuron();
    requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);
}

// ---- Neuron Renderer ----
function renderNeuron() {
  const canvas = dom.canvas;
  const ctx = dom.ctx;
  const dpr = window.devicePixelRatio || 1;
  const W = canvas.width;
  const H = canvas.height;
  if (W === 0 || H === 0) return;

  ctx.clearRect(0, 0, W, H);
  ctx.fillStyle = BG;
  ctx.fillRect(0, 0, W, H);

  const features = getNormalizedInputs();
  const z = computeZ(features);
  const prob = sigmoid(z);
  const isYes = prob >= 0.5;

  // Layout: inputs on left, neuron in center, output on right
  const padX = 60 * dpr;
  const padY = 40 * dpr;
  const inputX = padX + 40 * dpr;
  const neuronX = W * 0.52;
  const outputX = W - padX - 40 * dpr;
  const neuronR = Math.min(50 * dpr, H * 0.12);
  const inputR = Math.min(22 * dpr, H * 0.05);
  const outputR = Math.min(32 * dpr, H * 0.08);

  // Vertical positions for 6 inputs + 1 bias
  const totalNodes = 7; // 6 inputs + bias
  const usableH = H - padY * 2;
  const spacing = usableH / (totalNodes + 1);

  function inputY(i) { return padY + spacing * (i + 1); }
  const biasY = padY + spacing * 7;

  const neuronY = H / 2;

  // ---- Draw connections (inputs → neuron) ----
  const maxAbsW = Math.max(...state.weights.map(Math.abs), Math.abs(state.bias), 0.1);

  for (let i = 0; i < 6; i++) {
    drawConnection(ctx, dpr, inputX, inputY(i), neuronX, neuronY,
      state.weights[i], maxAbsW, features[i], FEATURE_COLORS[i], state.pulsePhase, (i * 0.12) % 1);
  }
  // Bias connection (from below)
  drawConnection(ctx, dpr, inputX, biasY, neuronX, neuronY,
    state.bias, maxAbsW, 1.0, '#ff1a1a', state.pulsePhase, 0.5);

  // ---- Draw output connection (neuron → output) ----
  const outColor = isYes ? '#00e676' : '#ff1744';
  ctx.strokeStyle = outColor;
  ctx.lineWidth = 3 * dpr;
  ctx.globalAlpha = 0.6;
  ctx.beginPath();
  ctx.moveTo(neuronX + neuronR, neuronY);
  ctx.lineTo(outputX - outputR, neuronY);
  ctx.stroke();
  ctx.globalAlpha = 1;

  // Output pulse
  const pulseT = state.pulsePhase;
  const oPulseX = (neuronX + neuronR) + pulseT * (outputX - outputR - neuronX - neuronR);
  ctx.beginPath();
  ctx.arc(oPulseX, neuronY, 3 * dpr, 0, Math.PI * 2);
  ctx.fillStyle = outColor;
  ctx.shadowColor = outColor;
  ctx.shadowBlur = 8 * dpr;
  ctx.fill();
  ctx.shadowBlur = 0;

  // ---- Draw input nodes ----
  const fontSize = Math.max(10, Math.min(12 * dpr, 14 * dpr));
  const smallFont = Math.max(9, Math.min(10 * dpr, 12 * dpr));

  for (let i = 0; i < 6; i++) {
    const y = inputY(i);

    // Node circle
    ctx.beginPath();
    ctx.arc(inputX, y, inputR, 0, Math.PI * 2);
    ctx.fillStyle = NODE_FILL;
    ctx.fill();
    ctx.strokeStyle = FEATURE_COLORS[i];
    ctx.lineWidth = 1.5 * dpr;
    ctx.stroke();

    // Normalized value inside node
    ctx.fillStyle = FEATURE_COLORS[i];
    ctx.font = `600 ${smallFont}px Inter, system-ui, sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(features[i].toFixed(2), inputX, y);

    // Label to the left
    ctx.fillStyle = TEXT_MED;
    ctx.font = `500 ${smallFont}px Inter, system-ui, sans-serif`;
    ctx.textAlign = 'right';
    ctx.textBaseline = 'middle';
    ctx.fillText(FEATURE_LABELS[i], inputX - inputR - 8 * dpr, y);

    // Weight label on connection
    const midCX = (inputX + neuronX) / 2;
    const midCY = (y + neuronY) / 2;
    const w = state.weights[i];
    ctx.fillStyle = w >= 0 ? 'rgba(0,230,118,0.6)' : 'rgba(255,23,68,0.6)';
    ctx.font = `500 ${smallFont}px 'SF Mono', Consolas, monospace`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'bottom';
    ctx.fillText((w >= 0 ? '+' : '') + w.toFixed(2), midCX, midCY - 3 * dpr);
  }

  // ---- Bias node ----
  ctx.beginPath();
  ctx.arc(inputX, biasY, inputR * 0.8, 0, Math.PI * 2);
  ctx.fillStyle = NODE_FILL;
  ctx.fill();
  ctx.strokeStyle = '#ff1a1a';
  ctx.lineWidth = 1.5 * dpr;
  ctx.setLineDash([3 * dpr, 3 * dpr]);
  ctx.stroke();
  ctx.setLineDash([]);

  ctx.fillStyle = '#ff1a1a';
  ctx.font = `600 ${smallFont}px Inter, system-ui, sans-serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('1', inputX, biasY);

  ctx.fillStyle = TEXT_DIM;
  ctx.font = `500 ${smallFont}px Inter, system-ui, sans-serif`;
  ctx.textAlign = 'right';
  ctx.fillText('Bias', inputX - inputR - 8 * dpr, biasY);

  // Bias weight label
  const bMidX = (inputX + neuronX) / 2;
  const bMidY = (biasY + neuronY) / 2;
  ctx.fillStyle = state.bias >= 0 ? 'rgba(0,230,118,0.6)' : 'rgba(255,23,68,0.6)';
  ctx.font = `500 ${smallFont}px 'SF Mono', Consolas, monospace`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'bottom';
  ctx.fillText((state.bias >= 0 ? '+' : '') + state.bias.toFixed(2), bMidX, bMidY - 3 * dpr);

  // ---- Central neuron ----
  // Outer glow
  const glowAlpha = 0.15 + 0.1 * Math.sin(state.pulsePhase * Math.PI * 2);
  ctx.beginPath();
  ctx.arc(neuronX, neuronY, neuronR * 1.3, 0, Math.PI * 2);
  ctx.fillStyle = `rgba(255, 26, 26, ${glowAlpha})`;
  ctx.fill();

  // Main circle
  ctx.beginPath();
  ctx.arc(neuronX, neuronY, neuronR, 0, Math.PI * 2);
  ctx.fillStyle = NODE_FILL;
  ctx.fill();
  ctx.strokeStyle = NODE_STROKE;
  ctx.lineWidth = 2.5 * dpr;
  ctx.shadowColor = 'rgba(255, 26, 26, 0.5)';
  ctx.shadowBlur = 15 * dpr;
  ctx.stroke();
  ctx.shadowBlur = 0;

  // Sigma symbol
  ctx.fillStyle = '#ff1a1a';
  ctx.font = `700 ${Math.round(neuronR * 0.7)}px 'Times New Roman', serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('\u03C3', neuronX, neuronY - neuronR * 0.1);

  // z value below sigma
  ctx.fillStyle = TEXT_MED;
  ctx.font = `500 ${smallFont}px 'SF Mono', Consolas, monospace`;
  ctx.fillText('z = ' + z.toFixed(2), neuronX, neuronY + neuronR * 0.45);

  // ---- Output node ----
  ctx.beginPath();
  ctx.arc(outputX, neuronY, outputR, 0, Math.PI * 2);
  ctx.fillStyle = NODE_FILL;
  ctx.fill();
  ctx.strokeStyle = outColor;
  ctx.lineWidth = 2.5 * dpr;
  ctx.shadowColor = isYes ? 'rgba(0,230,118,0.5)' : 'rgba(255,23,68,0.5)';
  ctx.shadowBlur = 15 * dpr;
  ctx.stroke();
  ctx.shadowBlur = 0;

  // Decision text inside output
  ctx.fillStyle = outColor;
  ctx.font = `700 ${Math.round(outputR * 0.55)}px Inter, system-ui, sans-serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(isYes ? 'Relax' : 'Sleep', outputX, neuronY - outputR * 0.15);

  // Probability below
  ctx.fillStyle = TEXT_MED;
  ctx.font = `500 ${smallFont}px 'SF Mono', Consolas, monospace`;
  ctx.fillText((prob * 100).toFixed(1) + '%', outputX, neuronY + outputR * 0.4);
}

// ---- Draw a weighted connection with signal pulse ----
function drawConnection(ctx, dpr, x1, y1, x2, y2, weight, maxW, inputVal, color, pulsePhase, phaseOffset) {
  const absW = Math.abs(weight);
  const thickness = Math.max(0.5, (absW / maxW) * 4) * dpr;
  const isPositive = weight >= 0;

  // Connection line
  ctx.strokeStyle = isPositive ? 'rgba(0,230,118,0.2)' : 'rgba(255,23,68,0.2)';
  ctx.lineWidth = thickness;
  ctx.beginPath();
  ctx.moveTo(x1, y1);
  ctx.lineTo(x2, y2);
  ctx.stroke();

  // Signal pulse traveling along the connection
  const t = (pulsePhase + phaseOffset) % 1;
  const px = x1 + t * (x2 - x1);
  const py = y1 + t * (y2 - y1);
  const pulseR = Math.max(2, thickness * 0.8);
  const pulseColor = isPositive ? '#00e676' : '#ff1744';

  ctx.beginPath();
  ctx.arc(px, py, pulseR, 0, Math.PI * 2);
  ctx.fillStyle = pulseColor;
  ctx.shadowColor = pulseColor;
  ctx.shadowBlur = 6 * dpr;
  ctx.globalAlpha = 0.5 + inputVal * 0.5; // brighter for higher input
  ctx.fill();
  ctx.globalAlpha = 1;
  ctx.shadowBlur = 0;
}

// ---- Utility ----
function debounce(fn, ms) {
  let timer;
  return (...args) => { clearTimeout(timer); timer = setTimeout(() => fn(...args), ms); };
}

function animateButton(btn) {
  btn.classList.remove('pulse'); void btn.offsetWidth; btn.classList.add('pulse');
}
