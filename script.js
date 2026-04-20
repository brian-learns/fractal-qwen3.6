const canvas = document.getElementById('fractal-canvas');
const ctx = canvas.getContext('2d');
const fractalTypeSelect = document.getElementById('fractal-type');
const juliaReInput = document.getElementById('julia-re');
const juliaImInput = document.getElementById('julia-im');
const juliaControls = document.getElementById('julia-controls');
const maxIterationsSlider = document.getElementById('max-iterations');
const iterValue = document.getElementById('iter-value');
const colorPaletteSelect = document.getElementById('color-palette');
const smoothingCheckbox = document.getElementById('smoothing');
const resetViewBtn = document.getElementById('reset-view');
const exportPngBtn = document.getElementById('export-png');
const savePresetBtn = document.getElementById('save-preset');
const loadPresetsBtn = document.getElementById('load-presets');
const presetListDiv = document.getElementById('preset-list');
const randomJuliaBtn = document.getElementById('random-julia');
const randomJuliaBtn2 = document.getElementById('random-julia-2');
const zoomInfo = document.getElementById('zoom-info');
const animateBtn = document.getElementById('animate-btn');
const animControls = document.getElementById('anim-controls');
const animModeSelect = document.getElementById('anim-mode');
const animSpeedSlider = document.getElementById('anim-speed');
const animSpeedValue = document.getElementById('anim-speed-value');
const animReverseCheckbox = document.getElementById('anim-reverse');
const animIterateCheckbox = document.getElementById('anim-iterate');
const fullscreenBtn = document.getElementById('fullscreen-btn');

let centerX = -0.5;
let centerY = 0;
let zoomLevel = 1;
let generating = false;
let currentFractalType = 'mandelbrot';
let currentPalette = 'electro';
let currentMaxIter = 100;
let juliaCRe = -0.7;
let juliaCIm = 0.27015;
let useSmoothing = true;
let isPanning = false;
let panStartX, panStartY, panStartCenterX, panStartCenterY;
let lastRenderTime = 0;

// Animation state
let animationRunning = false;
let animationId = null;
let animTime = 0;
let animSpeed = 3;
let animMode = 'cycle';
let animReverse = false;
let animIterate = false;
const PALETTE_NAMES = ['electro', 'fire', 'ocean', 'rainbow', 'grayscale', 'neon', 'sunset', 'arctic'];

// PWA Service Worker Registration
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('./sw.js')
      .then((registration) => {
        console.log('SW registered:', registration.scope);
      })
      .catch((error) => {
        console.log('SW registration failed:', error);
      });
  });
}

const PRESET_NAMES = ['Deep Zoom 1', 'Deep Zoom 2', 'Spiro', 'Seahorse Valley', 'Elephant Valley', 'Minibrot'];

function resizeCanvas() {
  const container = document.getElementById('canvas-container');
  canvas.width = container.clientWidth;
  canvas.height = container.clientHeight;
  render();
}

function getPaletteColors(palette, iterations) {
  const palettes = {
    electro: (i, max) => {
      const t = i / max;
      const r = Math.floor(128 * Math.sin(t * Math.PI * 2 + 0));
      const g = Math.floor(128 * Math.sin(t * Math.PI * 2 + 2.094));
      const b = Math.floor(128 * Math.sin(t * Math.PI * 2 + 4.189));
      return [Math.abs(r), Math.abs(g), Math.abs(b)];
    },
    fire: (i, max) => {
      const t = i / max;
      const r = Math.min(255, Math.floor(t * 3 * 255));
      const g = Math.min(255, Math.floor(Math.max(0, (t * 3 - 1)) * 255));
      const b = Math.min(255, Math.floor(Math.max(0, (t * 3 - 2)) * 255));
      return [r, g, b];
    },
    ocean: (i, max) => {
      const t = i / max;
      const r = Math.floor(t * 40);
      const g = Math.floor(80 + t * 140);
      const b = Math.floor(160 + t * 95);
      return [r, g, b];
    },
    rainbow: (i, max) => {
      const t = i / max;
      const h = t * 360;
      const s = 0.9;
      const l = 0.4 + 0.2 * Math.sin(t * Math.PI);
      return hslToRgb(h, s, l);
    },
    grayscale: (i, max) => {
      const t = i / max;
      const v = Math.floor(t * 255);
      return [v, v, v];
    },
    neon: (i, max) => {
      const t = i / max;
      const r = Math.floor(128 + 127 * Math.sin(t * Math.PI * 4));
      const g = Math.floor(128 + 127 * Math.sin(t * Math.PI * 2 + 1));
      const b = Math.floor(128 + 127 * Math.sin(t * Math.PI * 6));
      return [Math.abs(r), Math.abs(g), Math.abs(b)];
    },
    sunset: (i, max) => {
      const t = i / max;
      const r = Math.floor(200 + 55 * Math.sin(t * Math.PI));
      const g = Math.floor(80 + 100 * t);
      const b = Math.floor(120 * (1 - t));
      return [r, g, b];
    },
    arctic: (i, max) => {
      const t = i / max;
      const r = Math.floor(20 + t * 60);
      const g = Math.floor(100 + t * 120);
      const b = Math.floor(200 + 55 * Math.sin(t * Math.PI));
      return [r, g, b];
    }
  };

  return (palettes[palette] || palettes.electro)(iterations, Math.max(iterations, 1));
}

function hslToRgb(h, s, l) {
  h = ((h % 360) + 360) % 360;
  h /= 360;
  const a = s * Math.min(l, 1 - l);
  const f = (n) => {
    const k = (n + h * 12) % 12;
    return l - a * Math.max(Math.min(k - 3, 9 - k, 1), -1);
  };
  return [
    Math.round(f(0) * 255),
    Math.round(f(8) * 255),
    Math.round(f(4) * 255)
  ];
}

function getFractalFunction(type) {
  switch (type) {
    case 'mandelbrot':
      return (zr, zi, cr, ci, maxIter) => {
        let x = 0, y = 0;
        let iter = 0;
        while (x * x + y * y <= 4 && iter < maxIter) {
          const xNew = x * x - y * y + cr;
          y = 2 * x * y + ci;
          x = xNew;
          iter++;
        }
        return iter;
      };
    case 'julia':
      return (zr, zi, cr, ci, maxIter) => {
        let x = zr, y = zi;
        let iter = 0;
        while (x * x + y * y <= 4 && iter < maxIter) {
          const xNew = x * x - y * y + cr;
          y = 2 * x * y + ci;
          x = xNew;
          iter++;
        }
        return iter;
      };
    case 'burningship':
      return (zr, zi, cr, ci, maxIter) => {
        let x = 0, y = 0;
        let iter = 0;
        while (x * x + y * y <= 4 && iter < maxIter) {
          const xNew = x * x - y * y + cr;
          y = Math.abs(2 * x * y) + ci;
          x = xNew;
          iter++;
        }
        return iter;
      };
  }
}

function render() {
  if (generating) return;
  generating = true;

  const showLoading = !document.getElementById('loading-overlay');
  if (showLoading) {
    const overlay = document.createElement('div');
    overlay.id = 'loading-overlay';
    overlay.innerHTML = '<div class="spinner"></div>';
    document.getElementById('canvas-container').appendChild(overlay);
  }

  requestAnimationFrame(() => {
    try {
      renderFractal();
    } finally {
      generating = false;
      const overlay = document.getElementById('loading-overlay');
      if (overlay) overlay.remove();
    }
  });
}

function renderFractal() {
  const width = canvas.width;
  const height = canvas.height;
  const imageData = ctx.createImageData(width, height);
  const pixels = imageData.data;

  const type = currentFractalType;
  const fractal = getFractalFunction(type);
  const palette = currentPalette;
  const maxIter = currentMaxIter;
  const smooth = useSmoothing;

  const scale = 3.5 / (zoomLevel * Math.min(width, height));
  const aspectRatio = width / height;

  for (let py = 0; py < height; py++) {
    for (let px = 0; px < width; px++) {
      let zr, zi;
      zr = centerX + (px - width / 2) * scale * (aspectRatio > 1 ? 1 : aspectRatio);
      zi = centerY + (py - height / 2) * scale * (aspectRatio > 1 ? 1 / aspectRatio : 1);

      let c_r, c_i;
      if (type === 'julia') {
        c_r = juliaCRe;
        c_i = juliaCIm;
      } else {
        c_r = zr;
        c_i = zi;
      }

      const iter = fractal(zr, zi, c_r, c_i, maxIter);

      const idx = (py * width + px) * 4;

      if (iter === maxIter) {
        pixels[idx] = 0;
        pixels[idx + 1] = 0;
        pixels[idx + 2] = 0;
        pixels[idx + 3] = 255;
      } else {
        let r, g, b;
        if (smooth && iter > 0) {
          const log2 = Math.log(2);
          const nu = Math.log(Math.log(Math.sqrt(zr * zr + zi * zi)) / log2) / log2;
          const smoothIter = iter + 1 - nu;
          const t = smoothIter / maxIter;
          const color = getPaletteColors(palette, maxIter);
          const brightness = 0.5 + 0.5 * Math.sin(t * Math.PI * 6);
          r = Math.floor(color[0] * brightness);
          g = Math.floor(color[1] * brightness);
          b = Math.floor(color[2] * brightness);
        } else {
          const color = getPaletteColors(palette, iter);
          r = color[0];
          g = color[1];
          b = color[2];
        }
        pixels[idx] = Math.min(255, r);
        pixels[idx + 1] = Math.min(255, g);
        pixels[idx + 2] = Math.min(255, b);
        pixels[idx + 3] = 255;
      }
    }
  }

  ctx.putImageData(imageData, 0, 0);
  updateZoomInfo();
}

function renderFractalAnimated(time) {
  const width = canvas.width;
  const height = canvas.height;
  const imageData = ctx.createImageData(width, height);
  const pixels = imageData.data;

  const type = currentFractalType;
  const fractal = getFractalFunction(type);
  const maxIter = currentMaxIter;
  const smooth = useSmoothing;
  const speed = animSpeed;
  const reverse = animReverse;
  const direction = reverse ? -1 : 1;

  const scale = 3.5 / (zoomLevel * Math.min(width, height));
  const aspectRatio = width / height;

  const baseT = (animTime * speed * direction) % 1;

  for (let py = 0; py < height; py++) {
    for (let px = 0; px < width; px++) {
      let zr, zi;
      zr = centerX + (px - width / 2) * scale * (aspectRatio > 1 ? 1 : aspectRatio);
      zi = centerY + (py - height / 2) * scale * (aspectRatio > 1 ? 1 / aspectRatio : 1);

      let c_r, c_i;
      if (type === 'julia') {
        c_r = juliaCRe;
        c_i = juliaCIm;
      } else {
        c_r = zr;
        c_i = zi;
      }

      const rawIter = fractal(zr, zi, c_r, c_i, maxIter);

      const idx = (py * width + px) * 4;

      if (rawIter === maxIter) {
        pixels[idx] = 0;
        pixels[idx + 1] = 0;
        pixels[idx + 2] = 0;
        pixels[idx + 3] = 255;
      } else {
        let iter = rawIter;
        let r, g, b;
        let smoothIter = iter;

        if (smooth && iter > 0) {
          const log2 = Math.log(2);
          const nu = Math.log(Math.log(Math.sqrt(zr * zr + zi * zi)) / log2) / log2;
          smoothIter = iter + 1 - nu;
        }

        const normalized = smoothIter / maxIter;

        switch (animMode) {
          case 'cycle': {
            const cycleT = (normalized + baseT) % 1;
            const color = getPaletteColors(currentPalette, maxIter);
            const cycleShift = 0.5 + 0.5 * Math.sin(cycleT * Math.PI * 6 + animTime * speed * 0.5 * direction);
            r = Math.floor(color[0] * cycleShift);
            g = Math.floor(color[1] * cycleShift);
            b = Math.floor(color[2] * cycleShift);
            break;
          }
          case 'hue': {
            const hueShift = baseT * 360;
            const t = normalized;
            const h = ((t * 360) + hueShift) % 360;
            const s = 0.85;
            const l = 0.35 + 0.25 * Math.sin(t * Math.PI);
            [r, g, b] = hslToRgb(h, s, l);
            break;
          }
          case 'pulse': {
            const t = normalized;
            const pulse = 0.5 + 0.5 * Math.sin(t * Math.PI * 3 + animTime * speed * 0.8 * direction);
            const pulse2 = 0.5 + 0.5 * Math.sin(t * Math.PI * 7 - animTime * speed * 1.2 * direction);
            const baseColor = getPaletteColors(currentPalette, maxIter);
            r = Math.floor(baseColor[0] * (0.3 + 0.7 * pulse));
            g = Math.floor(baseColor[1] * (0.3 + 0.7 * pulse2));
            b = Math.floor(baseColor[2] * (0.3 + 0.7 * Math.abs(Math.sin(animTime * speed * 0.4 * direction))));
            break;
          }
          case 'rainbow': {
            const t = normalized;
            const waveT = (t + baseT * 2) % 1;
            const h = waveT * 360;
            const s = 0.9;
            const l = 0.4 + 0.15 * Math.sin(t * Math.PI * 4 + animTime * speed * direction);
            [r, g, b] = hslToRgb(h, s, l);
            break;
          }
          case 'wave': {
            const t = normalized;
            const wave = Math.sin(t * Math.PI * 8 + animTime * speed * 0.6 * direction);
            const wave2 = Math.sin(t * Math.PI * 12 - animTime * speed * 0.4 * direction);
            const baseColor = getPaletteColors(currentPalette, maxIter);
            const shift = 0.5 + 0.5 * wave;
            const shift2 = 0.5 + 0.5 * wave2;
            r = Math.floor((baseColor[0] * shift + baseColor[1] * (1 - shift)) * 0.8);
            g = Math.floor((baseColor[1] * shift2 + baseColor[2] * (1 - shift2)) * 0.8);
            b = Math.floor((baseColor[2] * shift + baseColor[0] * (1 - shift)) * 0.8);
            break;
          }
          case 'fire': {
            const t = normalized;
            const fireT = (t + baseT * 3 + Math.sin(animTime * speed * direction) * 0.2) % 1;
            const rRaw = Math.min(255, Math.floor(fireT * 3 * 255));
            const gRaw = Math.min(255, Math.floor(Math.max(0, (fireT * 3 - 0.3 + Math.sin(animTime * speed * 0.8 * direction) * 0.3)) * 255));
            const bRaw = Math.min(255, Math.floor(Math.max(0, (fireT * 3 - 1.2 + Math.cos(animTime * speed * 0.5 * direction) * 0.2)) * 255));
            const flicker = 0.7 + 0.3 * Math.sin(t * 50 + animTime * speed * 2 * direction);
            r = Math.floor(rRaw * flicker);
            g = Math.floor(gRaw * flicker);
            b = Math.floor(bRaw * flicker);
            break;
          }
          default: {
            const color = getPaletteColors(currentPalette, rawIter);
            r = color[0];
            g = color[1];
            b = color[2];
          }
        }

        pixels[idx] = Math.min(255, Math.max(0, r));
        pixels[idx + 1] = Math.min(255, Math.max(0, g));
        pixels[idx + 2] = Math.min(255, Math.max(0, b));
        pixels[idx + 3] = 255;
      }
    }
  }

  ctx.putImageData(imageData, 0, 0);
  updateZoomInfo();
}

function animationLoop(timestamp) {
  if (!animationRunning) return;
  animTime = (timestamp || 0) / 10000;
  renderFractalAnimated(timestamp);
  animationId = requestAnimationFrame(animationLoop);
}

function startAnimation() {
  if (animationRunning) return;
  animationRunning = true;
  animTime = 0;
  animateBtn.textContent = '⏸ Stop';
  animateBtn.classList.add('active');
  animControls.style.display = 'flex';
  animationId = requestAnimationFrame(animationLoop);
}

function stopAnimation() {
  animationRunning = false;
  if (animationId) {
    cancelAnimationFrame(animationId);
    animationId = null;
  }
  animateBtn.textContent = '▶ Animate';
  animateBtn.classList.remove('active');
  render();
}

function toggleAnimation() {
  if (animationRunning) {
    stopAnimation();
  } else {
    startAnimation();
  }
}

function updateZoomInfo() {
  const scale = 3.5 / (zoomLevel * Math.min(canvas.width, canvas.height));
  zoomInfo.textContent = `Zoom: ${zoomLevel.toFixed(1)}x | Center: (${centerX.toFixed(8)}, ${centerY.toFixed(8)})`;
}

function screenToComplex(px, py) {
  const width = canvas.width;
  const height = canvas.height;
  const scale = 3.5 / (zoomLevel * Math.min(width, height));
  const aspectRatio = width / height;
  return {
    x: centerX + (px - width / 2) * scale * (aspectRatio > 1 ? 1 : aspectRatio),
    y: centerY + (py - height / 2) * scale * (aspectRatio > 1 ? 1 / aspectRatio : 1)
  };
}

function zoomAt(px, py, factor) {
  const complex = screenToComplex(px, py);
  centerX -= (complex.x - centerX) * (1 - 1 / factor);
  centerY -= (complex.y - centerY) * (1 - 1 / factor);
  zoomLevel *= factor;
  render();
}

// Event listeners
fractalTypeSelect.addEventListener('change', () => {
  currentFractalType = fractalTypeSelect.value;
  juliaControls.style.display = currentFractalType === 'julia' ? 'flex' : 'none';
  if (currentFractalType === 'mandelbrot') {
    centerX = -0.5;
    centerY = 0;
    zoomLevel = 1;
  }
  render();
});

juliaReInput.addEventListener('input', () => {
  juliaCRe = parseFloat(juliaReInput.value) || 0;
  render();
});

juliaImInput.addEventListener('input', () => {
  juliaCIm = parseFloat(juliaImInput.value) || 0;
  render();
});

randomJuliaBtn.addEventListener('click', () => {
  juliaCRe = (Math.random() * 2 - 1);
  juliaCIm = (Math.random() * 2 - 1);
  juliaReInput.value = juliaCRe.toFixed(4);
  juliaImInput.value = juliaCIm.toFixed(4);
  currentFractalType = 'julia';
  fractalTypeSelect.value = 'julia';
  juliaControls.style.display = 'flex';
  render();
});

randomJuliaBtn2.addEventListener('click', () => {
  const angle = Math.random() * Math.PI * 2;
  const radius = Math.random() * 0.8;
  juliaCRe = radius * Math.cos(angle);
  juliaCIm = radius * Math.sin(angle);
  juliaReInput.value = juliaCRe.toFixed(4);
  juliaImInput.value = juliaCIm.toFixed(4);
  currentFractalType = 'julia';
  fractalTypeSelect.value = 'julia';
  juliaControls.style.display = 'flex';
  render();
});

maxIterationsSlider.addEventListener('input', () => {
  currentMaxIter = parseInt(maxIterationsSlider.value);
  iterValue.textContent = currentMaxIter;
  render();
});

colorPaletteSelect.addEventListener('change', () => {
  currentPalette = colorPaletteSelect.value;
  render();
});

smoothingCheckbox.addEventListener('change', () => {
  useSmoothing = smoothingCheckbox.checked;
  render();
});

resetViewBtn.addEventListener('click', () => {
  centerX = -0.5;
  centerY = 0;
  zoomLevel = 1;
  render();
});

exportPngBtn.addEventListener('click', () => {
  const link = document.createElement('a');
  link.download = `fractal-${currentFractalType}-${Date.now()}.png`;
  link.href = canvas.toDataURL('image/png');
  link.click();
});

savePresetBtn.addEventListener('click', () => {
  const presets = JSON.parse(localStorage.getItem('fractal-presets') || '[]');
  const preset = {
    name: PRESET_NAMES[presets.length % PRESET_NAMES.length],
    type: currentFractalType,
    centerX, centerY, zoomLevel,
    maxIter: currentMaxIter,
    palette: currentPalette,
    juliaRe: juliaCRe,
    juliaIm: juliaCIm,
    smooth: useSmoothing
  };
  presets.push(preset);
  localStorage.setItem('fractal-presets', JSON.stringify(presets));
  renderPresetList();
});

loadPresetsBtn.addEventListener('click', () => {
  presetListDiv.style.display = presetListDiv.style.display === 'none' ? 'flex' : 'none';
});

function renderPresetList() {
  const presets = JSON.parse(localStorage.getItem('fractal-presets') || '[]');
  presetListDiv.innerHTML = '';
  presets.forEach((preset, idx) => {
    const div = document.createElement('div');
    div.className = 'preset-item';
    div.innerHTML = `
      <span>${preset.name}</span>
      <div>
        <button class="load-btn" data-idx="${idx}">Load</button>
        <button class="delete-btn" data-del="${idx}">X</button>
      </div>
    `;
    presetListDiv.appendChild(div);
  });

  presetListDiv.querySelectorAll('.load-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const idx = parseInt(e.target.dataset.idx);
      applyPreset(idx);
    });
  });

  presetListDiv.querySelectorAll('.delete-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const idx = parseInt(e.target.dataset.del);
      deletePreset(idx);
    });
  });
}

function applyPreset(idx) {
  const presets = JSON.parse(localStorage.getItem('fractal-presets') || '[]');
  if (!presets[idx]) return;
  const p = presets[idx];
  currentFractalType = p.type;
  fractalTypeSelect.value = p.type;
  juliaControls.style.display = p.type === 'julia' ? 'flex' : 'none';
  centerX = p.centerX;
  centerY = p.centerY;
  zoomLevel = p.zoomLevel;
  currentMaxIter = p.maxIter;
  maxIterationsSlider.value = p.maxIter;
  iterValue.textContent = p.maxIter;
  currentPalette = p.palette;
  colorPaletteSelect.value = p.palette;
  juliaCRe = p.juliaRe;
  juliaCIm = p.juliaIm;
  juliaReInput.value = p.juliaRe.toFixed(4);
  juliaImInput.value = p.juliaIm.toFixed(4);
  useSmoothing = p.smooth;
  smoothingCheckbox.checked = p.smooth;
  render();
}

function deletePreset(idx) {
  const presets = JSON.parse(localStorage.getItem('fractal-presets') || '[]');
  presets.splice(idx, 1);
  localStorage.setItem('fractal-presets', JSON.stringify(presets));
  renderPresetList();
}

// Mouse interactions for zoom and pan
canvas.addEventListener('wheel', (e) => {
  e.preventDefault();
  const factor = e.deltaY < 0 ? 1.3 : 1 / 1.3;
  zoomAt(e.offsetX, e.offsetY, factor);
}, { passive: false });

canvas.addEventListener('mousedown', (e) => {
  isPanning = true;
  panStartX = e.clientX;
  panStartY = e.clientY;
  panStartCenterX = centerX;
  panStartCenterY = centerY;
  canvas.style.cursor = 'grabbing';
});

window.addEventListener('mousemove', (e) => {
  if (!isPanning) return;
  const dx = e.clientX - panStartX;
  const dy = e.clientY - panStartY;
  const scale = 3.5 / (zoomLevel * Math.min(canvas.width, canvas.height));
  const aspectRatio = canvas.width / canvas.height;
  const xScale = aspectRatio > 1 ? scale : scale * aspectRatio;
  const yScale = aspectRatio > 1 ? scale / aspectRatio : scale;
  centerX = panStartCenterX - dx * xScale;
  centerY = panStartCenterY - dy * yScale;
  render();
});

window.addEventListener('mouseup', () => {
  if (isPanning) {
    isPanning = false;
    canvas.style.cursor = 'crosshair';
  }
});

canvas.addEventListener('dblclick', (e) => {
  zoomAt(e.offsetX, e.offsetY, 3);
});

// Touch support
let lastTouchDist = 0;
let lastTouchCenter = null;

canvas.addEventListener('touchstart', (e) => {
  if (e.touches.length === 1) {
    isPanning = true;
    panStartX = e.touches[0].clientX;
    panStartY = e.touches[0].clientY;
    panStartCenterX = centerX;
    panStartCenterY = centerY;
  } else if (e.touches.length === 2) {
    isPanning = false;
    const dx = e.touches[0].clientX - e.touches[1].clientX;
    const dy = e.touches[0].clientY - e.touches[1].clientY;
    lastTouchDist = Math.sqrt(dx * dx + dy * dy);
    lastTouchCenter = {
      x: (e.touches[0].clientX + e.touches[1].clientX) / 2,
      y: (e.touches[0].clientY + e.touches[1].clientY) / 2
    };
  }
  e.preventDefault();
}, { passive: false });

canvas.addEventListener('touchmove', (e) => {
  if (e.touches.length === 1 && isPanning) {
    const dx = e.touches[0].clientX - panStartX;
    const dy = e.touches[0].clientY - panStartY;
    const scale = 3.5 / (zoomLevel * Math.min(canvas.width, canvas.height));
    const aspectRatio = canvas.width / canvas.height;
    const xScale = aspectRatio > 1 ? scale : scale * aspectRatio;
    const yScale = aspectRatio > 1 ? scale / aspectRatio : scale;
    centerX = panStartCenterX - dx * xScale;
    centerY = panStartCenterY - dy * yScale;
    render();
  } else if (e.touches.length === 2 && lastTouchDist > 0) {
    const dx = e.touches[0].clientX - e.touches[1].clientX;
    const dy = e.touches[0].clientY - e.touches[1].clientY;
    const dist = Math.sqrt(dx * dx + dy * dy);
    const factor = dist / lastTouchDist;
    const rect = canvas.getBoundingClientRect();
    const cx = ((e.touches[0].clientX + e.touches[1].clientX) / 2 - rect.left);
    const cy = ((e.touches[0].clientY + e.touches[1].clientY) / 2 - rect.top);
    zoomAt(cx, cy, factor);
    lastTouchDist = dist;
  }
  e.preventDefault();
}, { passive: false });

canvas.addEventListener('touchend', (e) => {
  isPanning = false;
  lastTouchDist = 0;
});

window.addEventListener('resize', resizeCanvas);

animateBtn.addEventListener('click', toggleAnimation);

fullscreenBtn.addEventListener('click', () => {
  if (!document.fullscreenElement) {
    canvas.requestFullscreen();
  } else {
    document.exitFullscreen();
  }
});

animModeSelect.addEventListener('change', () => {
  animMode = animModeSelect.value;
});

animSpeedSlider.addEventListener('input', () => {
  animSpeed = parseInt(animSpeedSlider.value);
  animSpeedValue.textContent = animSpeed;
});

animReverseCheckbox.addEventListener('change', () => {
  animReverse = animReverseCheckbox.checked;
});

animIterateCheckbox.addEventListener('change', () => {
  animIterate = animIterateCheckbox.checked;
});

// Keyboard shortcut: space to toggle animation
window.addEventListener('keydown', (e) => {
  if (e.code === 'Space' && e.target === document.body) {
    e.preventDefault();
    toggleAnimation();
  }
});

renderPresetList();
resizeCanvas();
