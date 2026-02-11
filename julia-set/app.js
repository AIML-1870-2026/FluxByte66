/* ============================================
   Julia Set Explorer — Application Logic
   ============================================ */

// ---- Constants & Defaults ----
const DEFAULT_C_REAL = -0.7;
const DEFAULT_C_IMAG = 0.27;
const DEFAULT_MAX_ITER = 200;
const DEFAULT_ZOOM = 1.0;
const DEFAULT_PAN_X = 0.0;
const DEFAULT_PAN_Y = 0.0;
const ESCAPE_RADIUS = 2.0;
const ESCAPE_RADIUS_SQ = ESCAPE_RADIUS * ESCAPE_RADIUS;
const COMPLEX_PLANE_HALF_WIDTH = 2.0;
const DEBOUNCE_MS = 16;

// ---- Color Palettes ----
// Each palette is an array of { pos: 0-1, color: [r, g, b] }
const PALETTES = {
  'inferno': [
    { pos: 0.0,  color: [0, 0, 0] },
    { pos: 0.25, color: [80, 18, 123] },
    { pos: 0.5,  color: [187, 55, 84] },
    { pos: 0.75, color: [249, 142, 9] },
    { pos: 1.0,  color: [252, 255, 164] },
  ],
  'crimson-night': [
    { pos: 0.0,  color: [0, 0, 0] },
    { pos: 0.3,  color: [100, 0, 0] },
    { pos: 0.6,  color: [200, 20, 20] },
    { pos: 0.85, color: [255, 60, 40] },
    { pos: 1.0,  color: [255, 200, 200] },
  ],
  'ice-fire': [
    { pos: 0.0,  color: [5, 5, 40] },
    { pos: 0.3,  color: [15, 80, 120] },
    { pos: 0.5,  color: [30, 180, 170] },
    { pos: 0.75, color: [240, 140, 20] },
    { pos: 1.0,  color: [220, 30, 10] },
  ],
  'monochrome': [
    { pos: 0.0,  color: [0, 0, 0] },
    { pos: 0.5,  color: [128, 128, 128] },
    { pos: 1.0,  color: [255, 255, 255] },
  ],
  'neon-abyss': [
    { pos: 0.0,  color: [0, 0, 0] },
    { pos: 0.3,  color: [60, 0, 120] },
    { pos: 0.6,  color: [30, 60, 220] },
    { pos: 1.0,  color: [0, 240, 255] },
  ],
  'gold-vein': [
    { pos: 0.0,  color: [0, 0, 0] },
    { pos: 0.3,  color: [60, 30, 5] },
    { pos: 0.65, color: [200, 160, 30] },
    { pos: 1.0,  color: [255, 255, 230] },
  ],
};

// ---- Presets ----
const PRESETS = [
  { name: "Douady's Rabbit", real: -0.1226, imag: 0.7449 },
  { name: "Dendrite",        real: 0.0,     imag: 1.0 },
  { name: "San Marco",       real: -0.75,   imag: 0.0 },
  { name: "Siegel Disk",     real: -0.3905, imag: -0.5871 },
  { name: "Seahorse",        real: -0.745,  imag: 0.1 },
  { name: "Lightning",       real: -0.4,    imag: 0.6 },
  { name: "Spiral Galaxy",   real: 0.285,   imag: 0.01 },
  { name: "Star",            real: -0.8,    imag: 0.156 },
  { name: "Whirlpool",       real: 0.45,    imag: 0.1428 },
  { name: "Cauliflower",     real: 0.25,    imag: 0.0 },
];

// ---- Application State ----
const state = {
  cReal: DEFAULT_C_REAL,
  cImag: DEFAULT_C_IMAG,
  maxIter: DEFAULT_MAX_ITER,
  zoom: DEFAULT_ZOOM,
  panX: DEFAULT_PAN_X,
  panY: DEFAULT_PAN_Y,
  palette: 'crimson-night',
  customStops: null,   // will be populated from active palette
  activePreset: -1,
  rendering: false,
};

// ---- DOM References ----
const dom = {};

function cacheDom() {
  dom.juliaCanvas = document.getElementById('julia-canvas');
  dom.juliaCtx = dom.juliaCanvas.getContext('2d');
  dom.loadingIndicator = document.getElementById('loading-indicator');
  dom.coordTooltip = document.getElementById('coord-tooltip');

  dom.sliderReal = document.getElementById('slider-real');
  dom.inputReal = document.getElementById('input-real');
  dom.sliderImag = document.getElementById('slider-imag');
  dom.inputImag = document.getElementById('input-imag');

  dom.sliderIterations = document.getElementById('slider-iterations');
  dom.valIterations = document.getElementById('val-iterations');
  dom.sliderZoom = document.getElementById('slider-zoom');
  dom.valZoom = document.getElementById('val-zoom');
  dom.sliderPanX = document.getElementById('slider-panx');
  dom.valPanX = document.getElementById('val-panx');
  dom.sliderPanY = document.getElementById('slider-pany');
  dom.valPanY = document.getElementById('val-pany');
  dom.btnResetView = document.getElementById('btn-reset-view');

  dom.selectPalette = document.getElementById('select-palette');
  dom.btnToggleCustom = document.getElementById('btn-toggle-custom');
  dom.customColorEditor = document.getElementById('custom-color-editor');
  dom.gradientPreview = document.getElementById('gradient-preview');
  dom.colorStopsList = document.getElementById('color-stops-list');
  dom.btnAddStop = document.getElementById('btn-add-stop');

  dom.presetsGrid = document.getElementById('presets-grid');

  dom.mandelbrotCanvas = document.getElementById('mandelbrot-canvas');
  dom.mandelbrotCtx = dom.mandelbrotCanvas.getContext('2d');

  dom.btnExport = document.getElementById('btn-export');
}

// ---- Initialization ----
document.addEventListener('DOMContentLoaded', () => {
  cacheDom();
  initCustomStops();
  initControls();
  buildPresetGallery();
  resizeJuliaCanvas();
  renderMandelbrot();
  scheduleJuliaRender();

  window.addEventListener('resize', () => {
    resizeJuliaCanvas();
    scheduleJuliaRender();
    renderMandelbrot();
  });

  // Keyboard shortcuts
  document.addEventListener('keydown', handleKeydown);
});

// ---- Canvas Sizing ----
function resizeJuliaCanvas() {
  const area = document.getElementById('canvas-area');
  const dpr = window.devicePixelRatio || 1;
  const w = area.clientWidth;
  const h = area.clientHeight;
  dom.juliaCanvas.width = w * dpr;
  dom.juliaCanvas.height = h * dpr;
  dom.juliaCanvas.style.width = w + 'px';
  dom.juliaCanvas.style.height = h + 'px';
}

// ---- Julia Set Rendering ----
let renderRequestId = null;
let renderTimeout = null;

function scheduleJuliaRender() {
  if (renderTimeout) clearTimeout(renderTimeout);
  renderTimeout = setTimeout(() => {
    if (renderRequestId) cancelAnimationFrame(renderRequestId);
    renderRequestId = requestAnimationFrame(renderJulia);
  }, DEBOUNCE_MS);
}

function renderJulia() {
  const canvas = dom.juliaCanvas;
  const ctx = dom.juliaCtx;
  const width = canvas.width;
  const height = canvas.height;

  if (width === 0 || height === 0) return;

  dom.loadingIndicator.classList.remove('hidden');
  state.rendering = true;

  const imageData = ctx.createImageData(width, height);
  const data = imageData.data;

  const { cReal, cImag, maxIter, zoom, panX, panY } = state;
  const palette = getActivePalette();

  // Build a lookup table for colors (256 entries for smooth mapping)
  const LUT_SIZE = 1024;
  const colorLUT = buildColorLUT(palette, LUT_SIZE);

  const aspectRatio = width / height;
  const halfW = COMPLEX_PLANE_HALF_WIDTH / zoom;
  const halfH = halfW / aspectRatio;

  // Bounds of the complex plane visible
  const xMin = panX - halfW;
  const xMax = panX + halfW;
  const yMin = panY - halfH;
  const yMax = panY + halfH;

  const dx = (xMax - xMin) / width;
  const dy = (yMax - yMin) / height;

  const log2 = Math.log(2);

  for (let py = 0; py < height; py++) {
    const zi = yMin + py * dy;
    for (let px = 0; px < width; px++) {
      let zr = xMin + px * dx;
      let zrCur = zr;
      let ziCur = zi;

      let iter = 0;
      let zrSq = zrCur * zrCur;
      let ziSq = ziCur * ziCur;

      // Iterate z -> z^2 + c
      while (zrSq + ziSq <= 4.0 && iter < maxIter) {
        const newZr = zrSq - ziSq + cReal;
        ziCur = 2.0 * zrCur * ziCur + cImag;
        zrCur = newZr;
        zrSq = zrCur * zrCur;
        ziSq = ziCur * ziCur;
        iter++;
      }

      const idx = (py * width + px) * 4;

      if (iter === maxIter) {
        // Interior: near-black
        data[idx]     = 5;
        data[idx + 1] = 2;
        data[idx + 2] = 2;
        data[idx + 3] = 255;
      } else {
        // Smooth coloring to eliminate banding
        const modulus = Math.sqrt(zrSq + ziSq);
        const smoothed = iter - Math.log(Math.log(modulus)) / log2;
        const t = smoothed / maxIter;
        const lutIdx = Math.max(0, Math.min(LUT_SIZE - 1, (t * LUT_SIZE) | 0));

        data[idx]     = colorLUT[lutIdx * 3];
        data[idx + 1] = colorLUT[lutIdx * 3 + 1];
        data[idx + 2] = colorLUT[lutIdx * 3 + 2];
        data[idx + 3] = 255;
      }
    }
  }

  ctx.putImageData(imageData, 0, 0);
  dom.loadingIndicator.classList.add('hidden');
  state.rendering = false;
}

// ---- Color Utilities ----

// Build a flat Uint8Array LUT: [r0, g0, b0, r1, g1, b1, ...]
function buildColorLUT(palette, size) {
  const lut = new Uint8Array(size * 3);
  for (let i = 0; i < size; i++) {
    const t = i / (size - 1);
    const [r, g, b] = samplePalette(palette, t);
    lut[i * 3]     = r;
    lut[i * 3 + 1] = g;
    lut[i * 3 + 2] = b;
  }
  return lut;
}

// Sample a gradient palette at position t (0-1)
function samplePalette(stops, t) {
  if (t <= stops[0].pos) return stops[0].color;
  if (t >= stops[stops.length - 1].pos) return stops[stops.length - 1].color;

  for (let i = 0; i < stops.length - 1; i++) {
    if (t >= stops[i].pos && t <= stops[i + 1].pos) {
      const localT = (t - stops[i].pos) / (stops[i + 1].pos - stops[i].pos);
      return [
        Math.round(stops[i].color[0] + (stops[i + 1].color[0] - stops[i].color[0]) * localT),
        Math.round(stops[i].color[1] + (stops[i + 1].color[1] - stops[i].color[1]) * localT),
        Math.round(stops[i].color[2] + (stops[i + 1].color[2] - stops[i].color[2]) * localT),
      ];
    }
  }
  return stops[stops.length - 1].color;
}

function getActivePalette() {
  if (state.palette === 'custom' && state.customStops) {
    return state.customStops;
  }
  return PALETTES[state.palette] || PALETTES['crimson-night'];
}

function rgbToHex(r, g, b) {
  return '#' + [r, g, b].map(v => v.toString(16).padStart(2, '0')).join('');
}

function hexToRgb(hex) {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result
    ? [parseInt(result[1], 16), parseInt(result[2], 16), parseInt(result[3], 16)]
    : [0, 0, 0];
}

// ---- Controls Initialization ----
function initControls() {
  // Parameter c
  syncSliderInput(dom.sliderReal, dom.inputReal, val => {
    state.cReal = val;
    state.activePreset = -1;
    updatePresetHighlight();
    scheduleJuliaRender();
    updateMandelbrotCrosshair();
  });

  syncSliderInput(dom.sliderImag, dom.inputImag, val => {
    state.cImag = val;
    state.activePreset = -1;
    updatePresetHighlight();
    scheduleJuliaRender();
    updateMandelbrotCrosshair();
  });

  // Iterations
  dom.sliderIterations.addEventListener('input', () => {
    state.maxIter = parseInt(dom.sliderIterations.value);
    dom.valIterations.textContent = state.maxIter;
    scheduleJuliaRender();
  });

  // Zoom (logarithmic: slider value is log10(zoom))
  dom.sliderZoom.addEventListener('input', () => {
    state.zoom = Math.pow(10, parseFloat(dom.sliderZoom.value));
    dom.valZoom.textContent = state.zoom.toFixed(1) + 'x';
    scheduleJuliaRender();
  });

  // Pan X
  dom.sliderPanX.addEventListener('input', () => {
    state.panX = parseFloat(dom.sliderPanX.value);
    dom.valPanX.textContent = state.panX.toFixed(2);
    scheduleJuliaRender();
  });

  // Pan Y
  dom.sliderPanY.addEventListener('input', () => {
    state.panY = parseFloat(dom.sliderPanY.value);
    dom.valPanY.textContent = state.panY.toFixed(2);
    scheduleJuliaRender();
  });

  // Reset View
  dom.btnResetView.addEventListener('click', resetView);

  // Palette selector
  dom.selectPalette.addEventListener('change', () => {
    state.palette = dom.selectPalette.value;
    if (state.palette !== 'custom') {
      state.customStops = deepCopyPalette(PALETTES[state.palette]);
      renderCustomEditor();
    }
    scheduleJuliaRender();
    renderPresetThumbnails();
    renderMandelbrot();
  });

  // Custom color editor toggle
  dom.btnToggleCustom.addEventListener('click', () => {
    dom.btnToggleCustom.classList.toggle('open');
    dom.customColorEditor.classList.toggle('hidden');
  });

  // Add stop button
  dom.btnAddStop.addEventListener('click', () => {
    if (state.customStops.length >= 5) return;
    state.customStops.push({ pos: 0.5, color: [255, 0, 0] });
    state.customStops.sort((a, b) => a.pos - b.pos);
    state.palette = 'custom';
    dom.selectPalette.value = 'custom';
    renderCustomEditor();
    scheduleJuliaRender();
  });

  // Export PNG
  dom.btnExport.addEventListener('click', exportPNG);

  // Julia canvas mouse-move for coordinate tooltip
  dom.juliaCanvas.addEventListener('mousemove', (e) => {
    const rect = dom.juliaCanvas.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;
    const px = (e.clientX - rect.left) * dpr;
    const py = (e.clientY - rect.top) * dpr;
    const w = dom.juliaCanvas.width;
    const h = dom.juliaCanvas.height;
    const aspectRatio = w / h;
    const halfW = COMPLEX_PLANE_HALF_WIDTH / state.zoom;
    const halfH = halfW / aspectRatio;
    const x = state.panX - halfW + (px / w) * 2 * halfW;
    const y = state.panY - halfH + (py / h) * 2 * halfH;
    dom.coordTooltip.textContent = `z = ${x.toFixed(4)} + ${y.toFixed(4)}i`;
    dom.coordTooltip.classList.remove('hidden');
  });

  dom.juliaCanvas.addEventListener('mouseleave', () => {
    dom.coordTooltip.classList.add('hidden');
  });

  // Mandelbrot click
  dom.mandelbrotCanvas.addEventListener('click', handleMandelbrotClick);

  // Initial custom editor
  renderCustomEditor();
}

function syncSliderInput(slider, input, onChange) {
  slider.addEventListener('input', () => {
    const val = parseFloat(slider.value);
    input.value = val;
    onChange(val);
  });
  input.addEventListener('input', () => {
    let val = parseFloat(input.value);
    if (isNaN(val)) return;
    val = Math.max(parseFloat(slider.min), Math.min(parseFloat(slider.max), val));
    slider.value = val;
    onChange(val);
  });
}

function resetView() {
  state.zoom = DEFAULT_ZOOM;
  state.panX = DEFAULT_PAN_X;
  state.panY = DEFAULT_PAN_Y;

  dom.sliderZoom.value = 0; // log10(1) = 0
  dom.valZoom.textContent = '1.0x';
  dom.sliderPanX.value = 0;
  dom.valPanX.textContent = '0.00';
  dom.sliderPanY.value = 0;
  dom.valPanY.textContent = '0.00';

  scheduleJuliaRender();
}

// ---- Custom Color Editor ----
function initCustomStops() {
  state.customStops = deepCopyPalette(PALETTES['crimson-night']);
}

function deepCopyPalette(palette) {
  return palette.map(s => ({ pos: s.pos, color: [...s.color] }));
}

function renderCustomEditor() {
  const stops = state.customStops;

  // Gradient preview
  const gradientParts = stops.map(s =>
    `rgb(${s.color[0]},${s.color[1]},${s.color[2]}) ${(s.pos * 100).toFixed(0)}%`
  ).join(', ');
  dom.gradientPreview.style.background = `linear-gradient(to right, ${gradientParts})`;

  // Color stops list
  dom.colorStopsList.innerHTML = '';
  stops.forEach((stop, i) => {
    const row = document.createElement('div');
    row.className = 'color-stop-row';

    const colorInput = document.createElement('input');
    colorInput.type = 'color';
    colorInput.value = rgbToHex(...stop.color);
    colorInput.addEventListener('input', () => {
      stop.color = hexToRgb(colorInput.value);
      state.palette = 'custom';
      dom.selectPalette.value = 'custom';
      renderCustomEditor();
      scheduleJuliaRender();
    });

    const posSlider = document.createElement('input');
    posSlider.type = 'range';
    posSlider.min = '0';
    posSlider.max = '100';
    posSlider.step = '1';
    posSlider.value = Math.round(stop.pos * 100);
    posSlider.addEventListener('input', () => {
      stop.pos = parseInt(posSlider.value) / 100;
      state.customStops.sort((a, b) => a.pos - b.pos);
      state.palette = 'custom';
      dom.selectPalette.value = 'custom';
      renderCustomEditor();
      scheduleJuliaRender();
    });

    const posLabel = document.createElement('span');
    posLabel.className = 'pos-label';
    posLabel.textContent = Math.round(stop.pos * 100) + '%';

    const removeBtn = document.createElement('button');
    removeBtn.className = 'btn-remove-stop';
    removeBtn.textContent = '\u00d7';
    removeBtn.addEventListener('click', () => {
      if (stops.length <= 2) return;
      state.customStops.splice(i, 1);
      state.palette = 'custom';
      dom.selectPalette.value = 'custom';
      renderCustomEditor();
      scheduleJuliaRender();
    });

    row.appendChild(colorInput);
    row.appendChild(posSlider);
    row.appendChild(posLabel);
    if (stops.length > 2) row.appendChild(removeBtn);
    dom.colorStopsList.appendChild(row);
  });

  // Toggle add button
  dom.btnAddStop.style.display = stops.length >= 5 ? 'none' : '';
}

// ---- Preset Gallery ----
function buildPresetGallery() {
  dom.presetsGrid.innerHTML = '';
  PRESETS.forEach((preset, i) => {
    const card = document.createElement('div');
    card.className = 'preset-card';
    card.dataset.index = i;

    const thumb = document.createElement('canvas');
    thumb.className = 'preset-thumb';
    thumb.width = 120;
    thumb.height = 90;

    const info = document.createElement('div');
    info.className = 'preset-info';

    const name = document.createElement('div');
    name.className = 'preset-name';
    name.textContent = preset.name;

    const cVal = document.createElement('div');
    cVal.className = 'preset-c';
    const sign = preset.imag >= 0 ? '+' : '\u2212';
    const absImag = Math.abs(preset.imag);
    cVal.textContent = `c = ${preset.real} ${sign} ${absImag}i`;

    info.appendChild(name);
    info.appendChild(cVal);
    card.appendChild(thumb);
    card.appendChild(info);

    card.addEventListener('click', () => selectPreset(i));

    dom.presetsGrid.appendChild(card);

    // Render thumbnail
    renderJuliaThumbnail(thumb, preset.real, preset.imag);
  });
}

function renderJuliaThumbnail(canvas, cReal, cImag) {
  const ctx = canvas.getContext('2d');
  const w = canvas.width;
  const h = canvas.height;
  const imageData = ctx.createImageData(w, h);
  const data = imageData.data;
  const maxIter = 80; // lower for thumbnails
  const palette = getActivePalette();
  const LUT_SIZE = 256;
  const colorLUT = buildColorLUT(palette, LUT_SIZE);

  const aspectRatio = w / h;
  const halfW = COMPLEX_PLANE_HALF_WIDTH;
  const halfH = halfW / aspectRatio;
  const dx = (2 * halfW) / w;
  const dy = (2 * halfH) / h;
  const log2 = Math.log(2);

  for (let py = 0; py < h; py++) {
    const zi = -halfH + py * dy;
    for (let px = 0; px < w; px++) {
      let zr = -halfW + px * dx;
      let zrCur = zr;
      let ziCur = zi;
      let iter = 0;
      let zrSq = zrCur * zrCur;
      let ziSq = ziCur * ziCur;

      while (zrSq + ziSq <= 4.0 && iter < maxIter) {
        const newZr = zrSq - ziSq + cReal;
        ziCur = 2.0 * zrCur * ziCur + cImag;
        zrCur = newZr;
        zrSq = zrCur * zrCur;
        ziSq = ziCur * ziCur;
        iter++;
      }

      const idx = (py * w + px) * 4;
      if (iter === maxIter) {
        data[idx] = 5; data[idx+1] = 2; data[idx+2] = 2; data[idx+3] = 255;
      } else {
        const modulus = Math.sqrt(zrSq + ziSq);
        const smoothed = iter - Math.log(Math.log(modulus)) / log2;
        const t = smoothed / maxIter;
        const lutIdx = Math.max(0, Math.min(LUT_SIZE - 1, (t * LUT_SIZE) | 0));
        data[idx]     = colorLUT[lutIdx * 3];
        data[idx + 1] = colorLUT[lutIdx * 3 + 1];
        data[idx + 2] = colorLUT[lutIdx * 3 + 2];
        data[idx + 3] = 255;
      }
    }
  }
  ctx.putImageData(imageData, 0, 0);
}

function renderPresetThumbnails() {
  const cards = dom.presetsGrid.querySelectorAll('.preset-card');
  cards.forEach((card, i) => {
    const thumb = card.querySelector('.preset-thumb');
    renderJuliaThumbnail(thumb, PRESETS[i].real, PRESETS[i].imag);
  });
}

function selectPreset(index) {
  const preset = PRESETS[index];
  state.cReal = preset.real;
  state.cImag = preset.imag;
  state.activePreset = index;

  // Update sliders
  dom.sliderReal.value = preset.real;
  dom.inputReal.value = preset.real;
  dom.sliderImag.value = preset.imag;
  dom.inputImag.value = preset.imag;

  // Reset view
  resetView();
  updatePresetHighlight();
  updateMandelbrotCrosshair();
  scheduleJuliaRender();
}

function updatePresetHighlight() {
  const cards = dom.presetsGrid.querySelectorAll('.preset-card');
  cards.forEach((card, i) => {
    card.classList.toggle('active', i === state.activePreset);
  });
}

// ---- Mandelbrot Navigator ----
let mandelbrotImageData = null;

function renderMandelbrot() {
  const canvas = dom.mandelbrotCanvas;
  const ctx = dom.mandelbrotCtx;
  const dpr = window.devicePixelRatio || 1;
  const displayW = canvas.clientWidth;
  const displayH = canvas.clientHeight;
  canvas.width = displayW * dpr;
  canvas.height = displayH * dpr;
  const w = canvas.width;
  const h = canvas.height;

  const imageData = ctx.createImageData(w, h);
  const data = imageData.data;
  const maxIter = 100;
  const palette = getActivePalette();
  const LUT_SIZE = 256;
  const colorLUT = buildColorLUT(palette, LUT_SIZE);
  const log2 = Math.log(2);

  // Mandelbrot is typically viewed from about (-2.2, -1.2) to (0.8, 1.2)
  const xMin = -2.2, xMax = 0.8;
  const yMin = -1.2, yMax = 1.2;
  const dx = (xMax - xMin) / w;
  const dy = (yMax - yMin) / h;

  for (let py = 0; py < h; py++) {
    const ci = yMin + py * dy;
    for (let px = 0; px < w; px++) {
      const cr = xMin + px * dx;
      let zr = 0, zi = 0;
      let iter = 0;
      let zrSq = 0, ziSq = 0;

      while (zrSq + ziSq <= 4.0 && iter < maxIter) {
        zi = 2.0 * zr * zi + ci;
        zr = zrSq - ziSq + cr;
        zrSq = zr * zr;
        ziSq = zi * zi;
        iter++;
      }

      const idx = (py * w + px) * 4;
      if (iter === maxIter) {
        data[idx] = 5; data[idx+1] = 2; data[idx+2] = 2; data[idx+3] = 255;
      } else {
        const modulus = Math.sqrt(zrSq + ziSq);
        const smoothed = iter - Math.log(Math.log(modulus)) / log2;
        const t = smoothed / maxIter;
        const lutIdx = Math.max(0, Math.min(LUT_SIZE - 1, (t * LUT_SIZE) | 0));
        data[idx]     = colorLUT[lutIdx * 3];
        data[idx + 1] = colorLUT[lutIdx * 3 + 1];
        data[idx + 2] = colorLUT[lutIdx * 3 + 2];
        data[idx + 3] = 255;
      }
    }
  }

  mandelbrotImageData = imageData;
  ctx.putImageData(imageData, 0, 0);
  drawMandelbrotCrosshair();
}

function drawMandelbrotCrosshair() {
  const canvas = dom.mandelbrotCanvas;
  const ctx = dom.mandelbrotCtx;
  const w = canvas.width;
  const h = canvas.height;

  // Restore mandelbrot image
  if (mandelbrotImageData) {
    ctx.putImageData(mandelbrotImageData, 0, 0);
  }

  // Map c to pixel coordinates
  const xMin = -2.2, xMax = 0.8;
  const yMin = -1.2, yMax = 1.2;
  const px = ((state.cReal - xMin) / (xMax - xMin)) * w;
  const py = ((state.cImag - yMin) / (yMax - yMin)) * h;

  // Draw crosshair
  ctx.strokeStyle = '#ff2222';
  ctx.lineWidth = 1.5;

  // Horizontal line
  ctx.beginPath();
  ctx.moveTo(px - 8, py);
  ctx.lineTo(px + 8, py);
  ctx.stroke();

  // Vertical line
  ctx.beginPath();
  ctx.moveTo(px, py - 8);
  ctx.lineTo(px, py + 8);
  ctx.stroke();

  // Center dot
  ctx.fillStyle = '#ff2222';
  ctx.beginPath();
  ctx.arc(px, py, 3, 0, Math.PI * 2);
  ctx.fill();
}

function updateMandelbrotCrosshair() {
  drawMandelbrotCrosshair();
}

function handleMandelbrotClick(e) {
  const canvas = dom.mandelbrotCanvas;
  const rect = canvas.getBoundingClientRect();
  const dpr = window.devicePixelRatio || 1;
  const px = (e.clientX - rect.left) * dpr;
  const py = (e.clientY - rect.top) * dpr;
  const w = canvas.width;
  const h = canvas.height;

  const xMin = -2.2, xMax = 0.8;
  const yMin = -1.2, yMax = 1.2;

  const cReal = xMin + (px / w) * (xMax - xMin);
  const cImag = yMin + (py / h) * (yMax - yMin);

  state.cReal = parseFloat(cReal.toFixed(4));
  state.cImag = parseFloat(cImag.toFixed(4));
  state.activePreset = -1;

  dom.sliderReal.value = state.cReal;
  dom.inputReal.value = state.cReal;
  dom.sliderImag.value = state.cImag;
  dom.inputImag.value = state.cImag;

  updatePresetHighlight();
  drawMandelbrotCrosshair();
  scheduleJuliaRender();
}

// ---- Export PNG ----
function exportPNG() {
  const canvas = dom.juliaCanvas;
  const link = document.createElement('a');
  const realStr = state.cReal.toFixed(4);
  const imagStr = state.cImag.toFixed(4);
  link.download = `julia-set-${realStr}-${imagStr}.png`;
  link.href = canvas.toDataURL('image/png');
  link.click();
}

// ---- Keyboard Shortcuts ----
function handleKeydown(e) {
  const step = 0.005;

  // Don't intercept if user is typing in an input
  if (e.target.tagName === 'INPUT' || e.target.tagName === 'SELECT') return;

  switch (e.key) {
    case 'ArrowLeft':
      e.preventDefault();
      state.cReal = Math.max(-2, state.cReal - step);
      updateCSliders();
      break;
    case 'ArrowRight':
      e.preventDefault();
      state.cReal = Math.min(2, state.cReal + step);
      updateCSliders();
      break;
    case 'ArrowUp':
      e.preventDefault();
      state.cImag = Math.min(2, state.cImag + step);
      updateCSliders();
      break;
    case 'ArrowDown':
      e.preventDefault();
      state.cImag = Math.max(-2, state.cImag - step);
      updateCSliders();
      break;
    case 'r':
    case 'R':
      resetView();
      break;
    default:
      return;
  }

  state.activePreset = -1;
  updatePresetHighlight();
  updateMandelbrotCrosshair();
  scheduleJuliaRender();
}

function updateCSliders() {
  dom.sliderReal.value = state.cReal;
  dom.inputReal.value = parseFloat(state.cReal.toFixed(4));
  dom.sliderImag.value = state.cImag;
  dom.inputImag.value = parseFloat(state.cImag.toFixed(4));
}
