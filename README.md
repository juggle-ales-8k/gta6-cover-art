# Vice Cover

[![make.fun](https://img.shields.io/badge/make.fun-gta6--cover--art--01-ff2e93?style=flat-square)](https://make.fun/competitions/gta6-cover-art-01)
[![rank](https://make.fun/api/v1/badges/gta6-cover-art-01/juggle-ales-8k/gta6-cover-art.svg)](https://make.fun/competitions/gta6-cover-art-01)
[![offline](https://img.shields.io/badge/mode-100%25%20offline-38f2ff?style=flat-square)](./app/index.html)

**Vice Cover** is a completely offline, zero-dependency static web studio that turns your photos and captions into multi-panel GTA 6–inspired cover art posters exported as full-resolution PNGs. Compose across three comic-poster layouts (`Hero + 2x2`, `Banner + 4`, and `Strip x3`) with dark ink borders and inner hairlines, drop or pick photos with per-panel pan and zoom (`1.0x`–`4.0x`), apply deterministic seeded coastal set dressing (sunset sky with sun disc and haze bands, lit city skyline, bezier palm-tree silhouettes, film grain, and vignette), grade every pixel across `Sunset`, `Neon`, `Noir`, and `Gold` looks, finish with skewed condensed display lettering (`Block`, `Chrome`, or `Neon` with chromatic fringe), and export crisp native PNGs at `1080×1080`, `1080×1350`, or `1920×1080`.

## Run Locally

Requires Node.js 22+ (no install or build step needed):

```bash
node serve.ts
```

Then open `http://localhost:8080` in desktop Chrome. Click **Use Samples** or drop your own photos directly onto the page to start designing.

## Regenerate Screenshots

```bash
node shots.mjs
```
