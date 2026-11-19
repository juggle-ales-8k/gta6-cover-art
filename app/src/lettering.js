// GTA-inspired display lettering: bold condensed uppercase with -6 deg skew, letter spacing,
// auto-fit sizing, heavy dark ink outline, crisp light inner stroke, subtle chromatic fringe,
// and three distinct finishes: block, chrome, and neon.

import { getGradePalette } from './grade.js';

export const LETTERING_STYLES = [
  { id: 'block', label: 'Block Ink' },
  { id: 'chrome', label: 'Chrome 80s' },
  { id: 'neon', label: 'Neon Glow' },
];

const DISPLAY_FONT_STACK = '"Arial Narrow", "Liberation Sans", "FreeSans", "DejaVu Sans", sans-serif';
const SKEW_RAD = (-6 * Math.PI) / 180;
const CONDENSE_X = 0.80;

/** Measures total advance width of a string with custom tracking (letter spacing). */
function measureTracked(ctx, text, tracking) {
  if (!text) return 0;
  let total = 0;
  for (let i = 0; i < text.length; i++) {
    total += ctx.measureText(text[i]).width;
    if (i < text.length - 1) total += tracking;
  }
  return total;
}

/** Draws a string centered at (cx, y) with custom tracking using either stroke or fill. */
function drawTracked(ctx, text, cx, y, tracking, mode) {
  const total = measureTracked(ctx, text, tracking);
  let x = cx - total / 2;
  ctx.textAlign = 'left';
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (mode === 'stroke') {
      ctx.strokeText(ch, x, y);
    } else {
      ctx.fillText(ch, x, y);
    }
    x += ctx.measureText(ch).width + tracking;
  }
}

/** Wraps caption into 1 or 2 punchy lines when long so the lettering stays tall and commanding. */
function splitLines(raw) {
  const clean = raw.trim().replace(/\s+/g, ' ').toUpperCase();
  if (!clean) return [];
  if (clean.length <= 15 || !clean.includes(' ')) return [clean];

  const words = clean.split(' ');
  let bestIdx = 1;
  let bestDiff = Infinity;
  for (let i = 1; i < words.length; i++) {
    const a = words.slice(0, i).join(' ');
    const b = words.slice(i).join(' ');
    const diff = Math.abs(a.length - b.length);
    if (diff < bestDiff) {
      bestDiff = diff;
      bestIdx = i;
    }
  }
  return [words.slice(0, bestIdx).join(' '), words.slice(bestIdx).join(' ')];
}

/**
 * Renders the poster caption and optional subtitle in the lower third.
 */
export function drawCaption(ctx, width, height, caption, subtitle, styleId, gradeId) {
  const lines = splitLines(caption);
  const sub = (subtitle ?? '').trim().replace(/\s+/g, ' ').toUpperCase();
  if (lines.length === 0 && !sub) return;

  const palette = getGradePalette(gradeId);
  const unit = Math.min(width, height);
  const maxWidth = width * 0.84;

  // Auto-fit condensed font size so even 40-character captions never overflow
  let fontSize = Math.round(unit * (lines.length > 1 ? 0.118 : 0.145));
  const minFontSize = Math.max(26, Math.round(unit * 0.042));
  const trackingRatio = 0.065;

  const fitsAt = (size) => {
    ctx.font = `900 ${size}px ${DISPLAY_FONT_STACK}`;
    const tracking = size * trackingRatio;
    for (const line of lines) {
      const renderedW = measureTracked(ctx, line, tracking) * CONDENSE_X;
      if (renderedW > maxWidth) return false;
    }
    return true;
  };

  while (fontSize > minFontSize && !fitsAt(fontSize)) {
    fontSize -= 2;
  }

  const tracking = fontSize * trackingRatio;
  const lineHeight = fontSize * 0.96;

  // Anchor block in lower third, balanced cleanly above bottom margin
  const subBlock = sub ? fontSize * 0.44 : 0;
  const blockH = lines.length * lineHeight + subBlock;
  const centerX = width * 0.5;
  const anchorY = height * 0.805 - blockH * 0.5 + fontSize * 0.44;

  ctx.save();

  // Subtle dark theatrical backing glow behind lettering for crisp readability over busy photos
  const glowR = Math.max(width * 0.45, blockH * 1.6);
  const backGlow = ctx.createRadialGradient(
    centerX,
    anchorY + (lines.length - 1) * lineHeight * 0.5,
    fontSize * 0.2,
    centerX,
    anchorY + (lines.length - 1) * lineHeight * 0.5,
    glowR
  );
  backGlow.addColorStop(0, 'rgba(8, 2, 16, 0.58)');
  backGlow.addColorStop(0.55, 'rgba(8, 2, 16, 0.26)');
  backGlow.addColorStop(1, 'rgba(8, 2, 16, 0)');
  ctx.fillStyle = backGlow;
  ctx.fillRect(0, height * 0.52, width, height * 0.48);

  // Apply -6 deg slant and condensed horizontal stretch around the caption center
  ctx.translate(centerX, anchorY);
  ctx.transform(CONDENSE_X, 0, Math.tan(SKEW_RAD), 1, 0, 0);

  ctx.font = `900 ${fontSize}px ${DISPLAY_FONT_STACK}`;
  ctx.textBaseline = 'middle';
  ctx.lineJoin = 'round';
  ctx.miterLimit = 2;

  const heavyOutline = Math.max(6, Math.round(fontSize * 0.165));
  const innerStroke = Math.max(1.5, fontSize * 0.028);
  const fringeShift = Math.max(2, fontSize * 0.032);
  const shadowOffset = Math.max(3, fontSize * 0.065);

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const y = i * lineHeight;

    // 1. Subtle chromatic aberration fringe (magenta/cyan split offset behind ink outline)
    ctx.save();
    ctx.fillStyle = palette.fringeA;
    ctx.strokeStyle = palette.fringeA;
    ctx.lineWidth = heavyOutline * 0.72;
    drawTracked(ctx, line, -fringeShift, y - fringeShift * 0.25, tracking, 'stroke');
    ctx.fillStyle = palette.fringeB;
    ctx.strokeStyle = palette.fringeB;
    drawTracked(ctx, line, fringeShift, y + fringeShift * 0.25, tracking, 'stroke');
    ctx.restore();

    // 2. Hard graphic drop-shadow
    ctx.save();
    ctx.strokeStyle = 'rgba(0, 0, 0, 0.85)';
    ctx.lineWidth = heavyOutline;
    drawTracked(ctx, line, shadowOffset, y + shadowOffset, tracking, 'stroke');
    ctx.restore();

    // 3. Style-specific fill & glow
    if (styleId === 'neon') {
      // Heavy dark ink housing first
      ctx.strokeStyle = '#090314';
      ctx.lineWidth = heavyOutline;
      drawTracked(ctx, line, 0, y, tracking, 'stroke');

      // Dual neon aura via shadowBlur (magenta outer + cyan inner bloom)
      ctx.save();
      ctx.shadowColor = '#ff1eb8';
      ctx.shadowBlur = fontSize * 0.34;
      ctx.strokeStyle = '#ff42c8';
      ctx.lineWidth = Math.max(3, fontSize * 0.055);
      drawTracked(ctx, line, 0, y, tracking, 'stroke');

      ctx.shadowColor = '#00f2ff';
      ctx.shadowBlur = fontSize * 0.18;
      const neonGrad = ctx.createLinearGradient(0, y - fontSize * 0.45, 0, y + fontSize * 0.45);
      neonGrad.addColorStop(0.0, '#ffffff');
      neonGrad.addColorStop(0.35, '#9bfbff');
      neonGrad.addColorStop(0.70, '#ff8ee8');
      neonGrad.addColorStop(1.0, '#fff0fb');
      ctx.fillStyle = neonGrad;
      drawTracked(ctx, line, 0, y, tracking, 'fill');

      // Crisp bright inner core stroke
      ctx.shadowBlur = 0;
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.9)';
      ctx.lineWidth = innerStroke * 0.85;
      drawTracked(ctx, line, 0, y, tracking, 'stroke');
      ctx.restore();
    } else if (styleId === 'chrome') {
      // Heavy dark outline
      ctx.strokeStyle = '#0c0814';
      ctx.lineWidth = heavyOutline;
      drawTracked(ctx, line, 0, y, tracking, 'stroke');

      // Classic 80s sunset-horizon metallic chrome vertical gradient
      const chromeGrad = ctx.createLinearGradient(0, y - fontSize * 0.44, 0, y + fontSize * 0.44);
      chromeGrad.addColorStop(0.00, '#ffffff');
      chromeGrad.addColorStop(0.24, '#c7d6eb');
      chromeGrad.addColorStop(0.46, '#485b78');
      chromeGrad.addColorStop(0.51, '#1c2033');
      chromeGrad.addColorStop(0.56, '#ffd2a8');
      chromeGrad.addColorStop(0.76, '#eef4ff');
      chromeGrad.addColorStop(1.00, '#8092ad');
      ctx.fillStyle = chromeGrad;
      drawTracked(ctx, line, 0, y, tracking, 'fill');

      // Thin light bevel inner highlight stroke
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.85)';
      ctx.lineWidth = innerStroke;
      drawTracked(ctx, line, 0, y, tracking, 'stroke');
    } else {
      // 'block': iconic solid white GTA poster lettering with heavy black outline and thin light inner stroke
      ctx.strokeStyle = '#0a080e';
      ctx.lineWidth = heavyOutline;
      drawTracked(ctx, line, 0, y, tracking, 'stroke');

      ctx.fillStyle = '#ffffff';
      drawTracked(ctx, line, 0, y, tracking, 'fill');

      // Thin crisp light inner rim stroke
      ctx.strokeStyle = 'rgba(255, 245, 232, 0.88)';
      ctx.lineWidth = innerStroke;
      drawTracked(ctx, line, 0, y, tracking, 'stroke');
    }
  }

  // Optional subtitle ribbon below main caption
  if (sub) {
    let subSize = Math.max(18, Math.round(fontSize * 0.28));
    const subTracking = subSize * 0.16;
    ctx.font = `800 ${subSize}px ${DISPLAY_FONT_STACK}`;
    while (subSize > 14 && measureTracked(ctx, sub, subTracking) * CONDENSE_X > maxWidth * 0.92) {
      subSize -= 1;
      ctx.font = `800 ${subSize}px ${DISPLAY_FONT_STACK}`;
    }

    const subY = (lines.length - 1) * lineHeight + fontSize * 0.62 + subSize * 0.45;
    const textW = measureTracked(ctx, sub, subSize * 0.16);
    const pillPadX = subSize * 0.85;
    const pillH = subSize * 1.65;

    // Angled dark ink nameplate pill behind subtitle
    ctx.fillStyle = 'rgba(10, 6, 18, 0.90)';
    ctx.fillRect(-textW / 2 - pillPadX, subY - pillH / 2, textW + pillPadX * 2, pillH);

    // Accent hairline border matching grade
    ctx.strokeStyle = styleId === 'neon' ? '#00f2ff' : palette.sky[4];
    ctx.lineWidth = Math.max(1.5, subSize * 0.08);
    ctx.strokeRect(-textW / 2 - pillPadX, subY - pillH / 2, textW + pillPadX * 2, pillH);

    ctx.fillStyle = styleId === 'neon' ? '#9bfbff' : '#fff7e8';
    drawTracked(ctx, sub, 0, subY + subSize * 0.05, subSize * 0.16, 'fill');
  }

  ctx.restore();
}
