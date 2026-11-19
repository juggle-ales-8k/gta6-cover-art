# Vice Cover

[![make.fun · gta6-cover-art-01](https://make.fun/badge/gta6-cover-art-01.svg)](https://make.fun/bounty/gta6-cover-art-01?utm_source=github&utm_medium=readme&utm_campaign=gta6-cover-art-01)
[![rank](https://make.fun/badge/gta6-cover-art-01/juggle-ales-8k/gta6-cover-art/rank.svg)](https://make.fun/bounty/gta6-cover-art-01/leaderboard?utm_source=github&utm_medium=readme&utm_campaign=gta6-cover-art-01)
[![reward](https://make.fun/badge/gta6-cover-art-01/juggle-ales-8k/gta6-cover-art/reward.svg)](https://make.fun/bounty/gta6-cover-art-01/leaderboard?utm_source=github&utm_medium=readme&utm_campaign=gta6-cover-art-01)

**Vice Cover** is a self-contained, offline GTA-style multi-panel cover art studio built with plain HTML, CSS, and ES modules on Canvas 2D—no external libraries, build tools, or network requests required. Drop in your own photos (or start from the bundled Vice City samples), arrange and reframe each panel, dial in the colour grade and lettering, and export full-resolution PNG posters directly in the browser.

## Features

### Three Multi-Panel Layouts

Every layout arranges panels inside a balanced poster frame with crisp 2–4 px dark ink borders, screen-printed light inner hairlines, and breathing room around the frame for the sky, skyline, palms, and caption:

- **Hero + 2x2 (`hero`)** — Five panels: one tall hero panel occupying ~55% of the width on the left paired with an asymmetric 2×2 grid on the right.
- **Banner + 4 (`grid`)** — Five panels: a wide cinematic banner across the top (42% height) over two rows of staggered panels below.
- **Strip x3 (`strip`)** — Three stacked widescreen horizontal bands for panoramic storytelling.

### Four Per-Pixel Colour Grades

Colour grading runs directly on the composed Canvas 2D `ImageData` buffer using a graphic-novel S-curve contrast pass, luminance-preserving saturation shaping, vertical multiply/overlay split-toning, and shadow/highlight tinting:

- **Sunset (`sunset`)** — Warm Vice orange and coral fading into hot magenta-violet with plum shadows.
- **Neon (`neon`)** — High-saturation electric cyan to magenta with deep indigo shadows and bright highlights.
- **Noir (`noir`)** — Desaturated steel-blue atmosphere with punchy contrast, ink blacks, and crisp silver highlights.
- **Gold (`gold`)** — Sunlit amber and bronze warmth across midtones, shadows, and highlights.

### Three Display Lettering Styles

Headlines (up to 40 characters, automatically split into one or two balanced lines) and optional subtitles render in bold condensed uppercase with a `-6°` italic skew, tracked spacing, auto-fit sizing, hard graphic drop shadows, and grade-matched chromatic aberration fringes:

- **Block (`block`)** — Classic solid white GTA poster lettering with a heavy black ink outline and thin light inner rim stroke.
- **Chrome (`chrome`)** — 1980s metallic horizon gradient with dark ink framing and a bright inner bevel highlight.
- **Neon (`neon`)** — Dark ink housing lit by dual magenta and cyan bloom glows over a bright cyan-to-pink core fill.

### Per-Panel Pan & Zoom

Each panel maintains its own photo slot and crop transform:

- **Add Photos** or drag and drop image files anywhere onto the page (dropping directly over a panel targets that panel first; multiple files fill across active panels).
- Click any panel to select it, **drag** inside the panel to pan along the available cover-fit overflow, and **scroll the mouse wheel** or use the **Panel Zoom** slider to zoom smoothly from `1.0x` to `4.0x`.
- Use **Fill all panels with this photo**, **Reset Crop**, or **Use Samples** to quickly switch compositions.

### Seeded Deterministic Set Dressing

All procedural scenery is driven by a seeded `mulberry32` PRNG (starting at `#1986` and stepped via **Reroll Seed**), so any seed reproduces the exact same poster across preview, exports, and screenshots:

- **Sunset sky backdrop** with diagonal light rays, a glowing sun disc sliced by horizontal horizon bars, and layered atmospheric haze bands.
- **Two-layer coastal city skyline** featuring hazy distant towers, foreground Art Deco crowns and slanted roofs, and seeded illuminated window grids.
- **Bezier palm-tree silhouettes** framing the flanks and bottom horizon with tapered curved trunks, coconuts, and feathered drooping fronds (plus extra mid-horizon palms on widescreen ratios).
- **Repeatable film grain tile** blended via `overlay` and a soft radial **cinematic vignette**.

### Three Native PNG Export Sizes

Preview runs at a responsive ~860 px long edge for smooth interactive panning, while exporting always re-renders cleanly onto a fresh offscreen canvas (without editor selection outlines) at full native resolution:

| Format | Aspect Ratio | Export Resolution |
| --- | --- | --- |
| Tall Poster | 4:5 | `1080 × 1350` |
| Square Cover | 1:1 | `1080 × 1080` |
| Wide Key Art | 16:9 | `1920 × 1080` |

## Run Locally

Requires Node.js 22+ with no install or build step:

```bash
node serve.ts
```

Then open [http://localhost:8080](http://localhost:8080) in a desktop browser.

## Validate & Build the Submission Bundle

Check `app/` and `screenshots/` against the competition caps without writing any files:

```bash
node main.ts --check
```

Copy `app/` and `screenshots/` into an output directory and generate `dossier.json`:

```bash
mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts
```

## Regenerate Screenshots

Capture the four showcase renders (`1-cover.jpg`, `2-editor.jpg`, `3-cover-wide.jpg`, and `4-cover-square.jpg`) into `screenshots/` with headless Chromium:

```bash
node shots.mjs
```
