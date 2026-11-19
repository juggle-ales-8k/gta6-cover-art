// Editor controller: manages application state, sample presets, file loading,
// drag-and-drop, per-panel pan & wheel zoom, UI bindings, and full-res PNG export.

import { computePanels, hitTestPanel, SIZES } from './layout.js';
import { renderPoster, exportPosterPng } from './render.js';

const MAX_PANELS = 5;

/** Loads an Image from a URL (local relative path or ObjectURL). */
export function loadImage(url) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error(`Failed to load image: ${url}`));
    img.src = url;
  });
}

/** Creates the initial deterministic poster state. */
export function createInitialState() {
  return {
    layout: 'hero',
    grade: 'sunset',
    lettering: 'block',
    size: 'tall',
    caption: 'MIDNIGHT IN LEONIDA',
    subtitle: 'SOUTH BEACH EDITION',
    seed: 1986,
    selectedPanel: 0,
    panels: Array.from({ length: MAX_PANELS }, () => ({
      img: null,
      panX: 0,
      panY: 0,
      zoom: 1,
    })),
  };
}

/**
 * Loads the built-in sample photos (samples/pier.jpg and samples/boulevard.jpg) and populates
 * the panels with curated varied crops/zooms so every multi-panel composition looks like a
 * real cinematic GTA poster out of the box.
 */
export async function loadSamplePhotos(state) {
  const [pier, boulevard] = await Promise.all([
    loadImage('./samples/pier.jpg'),
    loadImage('./samples/boulevard.jpg'),
  ]);

  // Curated crop framing across the 5 slots so each panel frames a distinct beat of the scene
  const presets = [
    { img: boulevard, panX: 0.0, panY: -0.06, zoom: 1.08 },
    { img: pier, panX: -0.42, panY: -0.25, zoom: 1.55 },
    { img: boulevard, panX: 0.55, panY: -0.35, zoom: 1.85 },
    { img: pier, panX: 0.35, panY: 0.25, zoom: 1.45 },
    { img: boulevard, panX: -0.58, panY: 0.32, zoom: 1.75 },
  ];

  for (let i = 0; i < MAX_PANELS; i++) {
    state.panels[i] = { ...presets[i] };
  }
}

/** Builds a clean filename slug from the current caption and dimensions. */
function makeExportFilename(caption, w, h) {
  const slug = (caption || 'vice-cover')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 32) || 'vice-cover';
  return `vice-cover-${slug}-${w}x${h}.png`;
}

/** Computes a responsive preview canvas resolution matching the chosen aspect ratio. */
function previewDimensions(sizeId) {
  const spec = SIZES[sizeId] ?? SIZES.tall;
  // Render preview at crisp ~840px long edge so pixel grading stays fast and smooth while dragging
  const maxEdge = 860;
  const scale = maxEdge / Math.max(spec.w, spec.h);
  return {
    w: Math.round(spec.w * scale),
    h: Math.round(spec.h * scale),
  };
}

/** Initializes the interactive editor UI and wires all controls + canvas pointer gestures. */
export function initEditor(state, options = {}) {
  const { isShotMode = false } = options;
  const canvas = document.getElementById('poster-canvas');
  const stage = document.getElementById('stage');
  const dropOverlay = document.getElementById('drop-overlay');
  const statusEl = document.getElementById('status');

  const captionInput = document.getElementById('caption-input');
  const subtitleInput = document.getElementById('subtitle-input');
  const photoInput = document.getElementById('photo-input');
  const zoomSlider = document.getElementById('zoom-slider');
  const zoomReadout = document.getElementById('zoom-readout');
  const panelLabel = document.getElementById('selected-panel-label');
  const seedReadout = document.getElementById('seed-readout');

  let currentPanels = [];
  let rafPending = false;
  let dragging = false;
  let dragMoved = false;
  let dragStartX = 0;
  let dragStartY = 0;
  let dragStartPanX = 0;
  let dragStartPanY = 0;
  let dragPanelIdx = -1;
  let dragDepth = 0;

  function setStatus(msg) {
    if (statusEl) statusEl.textContent = msg;
  }

  function activePanelCount() {
    return computePanels(state.layout, 1000, 1000).length;
  }

  function syncControlsFromState() {
    if (captionInput) captionInput.value = state.caption;
    if (subtitleInput) subtitleInput.value = state.subtitle;
    if (seedReadout) seedReadout.textContent = `#${state.seed}`;

    const count = activePanelCount();
    if (state.selectedPanel >= count) state.selectedPanel = 0;

    const slot = state.panels[state.selectedPanel];
    if (zoomSlider && slot) {
      zoomSlider.value = String(slot.zoom.toFixed(2));
    }
    if (zoomReadout && slot) {
      zoomReadout.textContent = `${slot.zoom.toFixed(2)}x`;
    }
    if (panelLabel) {
      panelLabel.textContent = `Panel ${state.selectedPanel + 1} of ${count}`;
    }

    document.querySelectorAll('[data-layout]').forEach((btn) => {
      btn.classList.toggle('is-active', btn.dataset.layout === state.layout);
      btn.setAttribute('aria-pressed', String(btn.dataset.layout === state.layout));
    });
    document.querySelectorAll('[data-grade]').forEach((btn) => {
      btn.classList.toggle('is-active', btn.dataset.grade === state.grade);
      btn.setAttribute('aria-pressed', String(btn.dataset.grade === state.grade));
    });
    document.querySelectorAll('[data-lettering]').forEach((btn) => {
      btn.classList.toggle('is-active', btn.dataset.lettering === state.lettering);
      btn.setAttribute('aria-pressed', String(btn.dataset.lettering === state.lettering));
    });
    document.querySelectorAll('[data-size]').forEach((btn) => {
      btn.classList.toggle('is-active', btn.dataset.size === state.size);
      btn.setAttribute('aria-pressed', String(btn.dataset.size === state.size));
    });
  }

  function renderNow() {
    rafPending = false;
    const dims = previewDimensions(state.size);
    if (canvas.width !== dims.w || canvas.height !== dims.h) {
      canvas.width = dims.w;
      canvas.height = dims.h;
    }
    canvas.style.aspectRatio = `${dims.w} / ${dims.h}`;
    currentPanels = renderPoster(canvas, state, { showSelection: !isShotMode });
  }

  function scheduleRender() {
    if (rafPending) return;
    rafPending = true;
    requestAnimationFrame(renderNow);
  }

  /** Converts pointer event client coordinates into internal canvas coordinates. */
  function eventToCanvasPoint(evt) {
    const rect = canvas.getBoundingClientRect();
    const sx = canvas.width / rect.width;
    const sy = canvas.height / rect.height;
    return {
      x: (evt.clientX - rect.left) * sx,
      y: (evt.clientY - rect.top) * sy,
    };
  }

  async function assignFilesToPanels(fileList) {
    const files = Array.from(fileList).filter((f) => f.type.startsWith('image/'));
    if (files.length === 0) {
      setStatus('Drop or choose image files (JPG, PNG, WebP).');
      return;
    }
    try {
      const images = await Promise.all(
        files.map((f) => loadImage(URL.createObjectURL(f)))
      );
      const count = activePanelCount();
      if (images.length === 1) {
        state.panels[state.selectedPanel] = {
          img: images[0],
          panX: 0,
          panY: 0,
          zoom: 1,
        };
        setStatus(`Loaded photo into Panel ${state.selectedPanel + 1}.`);
      } else {
        for (let i = 0; i < count; i++) {
          const idx = (state.selectedPanel + i) % count;
          state.panels[idx] = {
            img: images[i % images.length],
            panX: 0,
            panY: 0,
            zoom: 1,
          };
        }
        setStatus(`Loaded ${images.length} photos across ${count} panels.`);
      }
      syncControlsFromState();
      renderNow();
    } catch {
      setStatus('Could not decode one of the selected images.');
    }
  }

  // Control group click handlers
  document.querySelectorAll('[data-layout]').forEach((btn) => {
    btn.addEventListener('click', () => {
      state.layout = btn.dataset.layout;
      syncControlsFromState();
      renderNow();
    });
  });

  document.querySelectorAll('[data-grade]').forEach((btn) => {
    btn.addEventListener('click', () => {
      state.grade = btn.dataset.grade;
      syncControlsFromState();
      renderNow();
    });
  });

  document.querySelectorAll('[data-lettering]').forEach((btn) => {
    btn.addEventListener('click', () => {
      state.lettering = btn.dataset.lettering;
      syncControlsFromState();
      renderNow();
    });
  });

  document.querySelectorAll('[data-size]').forEach((btn) => {
    btn.addEventListener('click', () => {
      state.size = btn.dataset.size;
      syncControlsFromState();
      renderNow();
    });
  });

  if (captionInput) {
    captionInput.addEventListener('input', () => {
      state.caption = captionInput.value.slice(0, 40);
      scheduleRender();
    });
  }

  if (subtitleInput) {
    subtitleInput.addEventListener('input', () => {
      state.subtitle = subtitleInput.value.slice(0, 40);
      scheduleRender();
    });
  }

  if (photoInput) {
    photoInput.addEventListener('change', (e) => {
      if (e.target.files && e.target.files.length > 0) {
        assignFilesToPanels(e.target.files);
        photoInput.value = '';
      }
    });
  }

  const pickBtn = document.getElementById('pick-photos-btn');
  if (pickBtn && photoInput) {
    pickBtn.addEventListener('click', () => photoInput.click());
  }

  const fillAllBtn = document.getElementById('fill-all-btn');
  if (fillAllBtn) {
    fillAllBtn.addEventListener('click', () => {
      const src = state.panels[state.selectedPanel];
      if (!src || !src.img) {
        setStatus('Select a panel with a photo first.');
        return;
      }
      for (let i = 0; i < MAX_PANELS; i++) {
        state.panels[i] = {
          img: src.img,
          panX: src.panX,
          panY: src.panY,
          zoom: src.zoom,
        };
      }
      syncControlsFromState();
      renderNow();
      setStatus(`Filled all panels with Panel ${state.selectedPanel + 1}'s photo.`);
    });
  }

  const samplesBtn = document.getElementById('use-samples-btn');
  if (samplesBtn) {
    samplesBtn.addEventListener('click', async () => {
      await loadSamplePhotos(state);
      syncControlsFromState();
      renderNow();
      setStatus('Loaded built-in Vice samples.');
    });
  }

  const resetCropBtn = document.getElementById('reset-crop-btn');
  if (resetCropBtn) {
    resetCropBtn.addEventListener('click', () => {
      const slot = state.panels[state.selectedPanel];
      if (!slot) return;
      slot.panX = 0;
      slot.panY = 0;
      slot.zoom = 1;
      syncControlsFromState();
      renderNow();
      setStatus(`Reset pan & zoom for Panel ${state.selectedPanel + 1}.`);
    });
  }

  if (zoomSlider) {
    zoomSlider.addEventListener('input', () => {
      const slot = state.panels[state.selectedPanel];
      if (!slot) return;
      slot.zoom = Math.max(1, Math.min(4, Number(zoomSlider.value)));
      if (zoomReadout) zoomReadout.textContent = `${slot.zoom.toFixed(2)}x`;
      scheduleRender();
    });
  }

  const rerollBtn = document.getElementById('reroll-seed-btn');
  if (rerollBtn) {
    rerollBtn.addEventListener('click', () => {
      // Deterministic stepping with a nice 4-digit visible seed
      state.seed = ((Math.imul(state.seed, 1664525) + 1013904223) >>> 0) % 9000 + 1000;
      syncControlsFromState();
      renderNow();
      setStatus(`Scene seed set to #${state.seed}.`);
    });
  }

  // Export buttons: always render at exact target resolution on a dedicated offscreen canvas
  document.querySelectorAll('[data-export]').forEach((btn) => {
    btn.addEventListener('click', async () => {
      const [w, h] = btn.dataset.export.split('x').map(Number);
      const filename = makeExportFilename(state.caption, w, h);
      setStatus(`Rendering full-res ${w}x${h} PNG...`);
      btn.disabled = true;
      try {
        // Yield a frame so status text paints before CPU-intensive pixel grading runs
        await new Promise((r) => requestAnimationFrame(r));
        const res = await exportPosterPng(state, w, h, filename);
        const kb = Math.round(res.bytes / 1024);
        setStatus(`Exported ${res.filename} (${w}x${h}, ${kb} KB).`);
      } catch {
        setStatus('Export failed.');
      } finally {
        btn.disabled = false;
      }
    });
  });

  // Canvas pointer interaction: click selects panel, drag pans photo inside panel
  canvas.addEventListener('pointerdown', (e) => {
    if (e.button !== 0) return;
    const pt = eventToCanvasPoint(e);
    const hit = hitTestPanel(currentPanels, pt.x, pt.y);
    if (hit < 0) return;

    state.selectedPanel = hit;
    syncControlsFromState();

    dragging = true;
    dragMoved = false;
    dragPanelIdx = hit;
    dragStartX = pt.x;
    dragStartY = pt.y;
    dragStartPanX = state.panels[hit].panX;
    dragStartPanY = state.panels[hit].panY;
    canvas.setPointerCapture(e.pointerId);
    canvas.classList.add('is-dragging');
    renderNow();
  });

  canvas.addEventListener('pointermove', (e) => {
    if (!dragging || dragPanelIdx < 0) return;
    const rect = currentPanels[dragPanelIdx];
    const slot = state.panels[dragPanelIdx];
    if (!rect || !slot || !slot.img) return;

    const pt = eventToCanvasPoint(e);
    const dx = pt.x - dragStartX;
    const dy = pt.y - dragStartY;
    if (Math.hypot(dx, dy) > 2) dragMoved = true;

    const baseScale = Math.max(rect.w / slot.img.naturalWidth, rect.h / slot.img.naturalHeight);
    const drawW = slot.img.naturalWidth * baseScale * slot.zoom;
    const drawH = slot.img.naturalHeight * baseScale * slot.zoom;
    const maxPanX = Math.max(0, (drawW - rect.w) / 2);
    const maxPanY = Math.max(0, (drawH - rect.h) / 2);

    if (maxPanX > 0.5) {
      slot.panX = Math.max(-1, Math.min(1, dragStartPanX + dx / maxPanX));
    }
    if (maxPanY > 0.5) {
      slot.panY = Math.max(-1, Math.min(1, dragStartPanY + dy / maxPanY));
    }
    scheduleRender();
  });

  function endDrag(e) {
    if (!dragging) return;
    dragging = false;
    dragPanelIdx = -1;
    canvas.classList.remove('is-dragging');
    if (e && canvas.hasPointerCapture(e.pointerId)) {
      canvas.releasePointerCapture(e.pointerId);
    }
    if (dragMoved) {
      setStatus(`Adjusted framing on Panel ${state.selectedPanel + 1}.`);
    }
  }

  canvas.addEventListener('pointerup', endDrag);
  canvas.addEventListener('pointercancel', endDrag);

  // Mouse wheel over any panel zooms that panel smoothly (1.0x to 4.0x)
  canvas.addEventListener('wheel', (e) => {
    const pt = eventToCanvasPoint(e);
    const hit = hitTestPanel(currentPanels, pt.x, pt.y);
    if (hit < 0) return;
    e.preventDefault();
    state.selectedPanel = hit;
    const slot = state.panels[hit];
    const factor = e.deltaY < 0 ? 1.1 : 1 / 1.1;
    slot.zoom = Math.max(1, Math.min(4, Number((slot.zoom * factor).toFixed(3))));
    syncControlsFromState();
    scheduleRender();
  }, { passive: false });

  // Whole-page drag-and-drop photo support
  window.addEventListener('dragenter', (e) => {
    e.preventDefault();
    dragDepth += 1;
    if (dropOverlay) dropOverlay.classList.add('is-visible');
  });

  window.addEventListener('dragover', (e) => {
    e.preventDefault();
  });

  window.addEventListener('dragleave', (e) => {
    e.preventDefault();
    dragDepth = Math.max(0, dragDepth - 1);
    if (dragDepth === 0 && dropOverlay) {
      dropOverlay.classList.remove('is-visible');
    }
  });

  window.addEventListener('drop', (e) => {
    e.preventDefault();
    dragDepth = 0;
    if (dropOverlay) dropOverlay.classList.remove('is-visible');
    if (e.dataTransfer && e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      // If dropped directly over a panel, target that panel first
      const pt = eventToCanvasPoint(e);
      const hit = hitTestPanel(currentPanels, pt.x, pt.y);
      if (hit >= 0) state.selectedPanel = hit;
      assignFilesToPanels(e.dataTransfer.files);
    }
  });

  if (stage) {
    stage.addEventListener('click', (e) => {
      if (e.target === stage) {
        renderNow();
      }
    });
  }

  syncControlsFromState();
  renderNow();

  return { renderNow, syncControlsFromState };
}
