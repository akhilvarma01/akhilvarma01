#!/usr/bin/env node
// Converts a source image into the ASCII grid the hero renders.
//
// Dev-only: this is the one script that needs `sharp`. It writes
// assets/portrait.json, and build.mjs reads that — so the repo itself has no
// image dependency and `node scripts/build.mjs` works on a clean checkout.
//
//   node scripts/photo-to-ascii.mjs ~/Desktop/levi.jpg
//   node scripts/photo-to-ascii.mjs ~/Desktop/levi.jpg --probe

import { writeFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

// sharp is resolved from wherever the caller points SHARP_FROM, so no local
// path — and no private repository name — is baked into a public file.
//   SHARP_FROM=/path/to/a/project/with/sharp node scripts/photo-to-ascii.mjs img.jpg
const require = createRequire(process.env.SHARP_FROM ?? import.meta.url);
let sharp;
try {
  sharp = require('sharp');
} catch {
  console.error('sharp not found. Either install it here (npm i sharp) or point\n' +
    'SHARP_FROM at a project that already has it:\n' +
    '  SHARP_FROM=/path/to/project/ node scripts/photo-to-ascii.mjs <image>');
  process.exit(1);
}

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
// Block glyphs tile edge-to-edge, so tonal areas read as solid regions
// instead of the speckle punctuation produces at this density.
const RAMP = ' \u2591\u2591\u2592\u2592\u2593\u2593\u2588\u2588';

const CFG = {
  cols: 104,
  // Character cells are far taller than wide; without this the face stretches.
  cellAspect: 4.2 / 7.7,
  // Crop to the head. A full-torso frame spends most of its resolution on
  // coat and cravat, leaving an eye barely two cells tall.
  crop: { left: 0.10, right: 0.88, top: 0.02, bottom: 0.64 },
  // Blue-dominant pixels are the studio backdrop, not the subject. Levi's hair
  // is also blue-black, so this threshold has to sit between the two.
  bgBlueness: 25,
  bgMinLum: 62,
  gamma: 0.85,
  // Cel-shaded art carries its detail in thin dark lines. Plain averaging
  // erases them, so each cell is supersampled and pulled toward its darkest
  // pixels — that is what keeps eyes, brows and jaw edges alive at this size.
  ss: 4,
  darkBias: 0.45,
};

const src = process.argv[2];
if (!src) { console.error('usage: photo-to-ascii.mjs <image> [--probe]'); process.exit(1); }
const probe = process.argv.includes('--probe');

const meta = await sharp(src).metadata();
const cropL = Math.round(meta.width * CFG.crop.left);
const cropW = Math.round(meta.width * (CFG.crop.right - CFG.crop.left));
const cropTop = Math.round(meta.height * CFG.crop.top);
const cropH = Math.round(meta.height * (CFG.crop.bottom - CFG.crop.top));
const aspect = cropW / cropH;
const rows = Math.round(CFG.cols * CFG.cellAspect / aspect);

const SW = CFG.cols * CFG.ss, SH = rows * CFG.ss;
const { data } = await sharp(src)
  .extract({ left: cropL, top: cropTop, width: cropW, height: cropH })
  .resize(SW, SH, { fit: 'fill', kernel: 'lanczos3' })
  .removeAlpha()
  .raw()
  .toBuffer({ resolveWithObject: true });

const lum = ([r, g, b]) => 0.2126 * r + 0.7152 * g + 0.0722 * b;
const blueness = ([r, g, b]) => b - (r + g) / 2;

// Collapse one cell's ss×ss block into a single sample.
const at = (c, r) => {
  let sr = 0, sg = 0, sb = 0, n = 0, min = 255;
  for (let y = 0; y < CFG.ss; y++) {
    for (let x = 0; x < CFG.ss; x++) {
      const i = ((r * CFG.ss + y) * SW + (c * CFG.ss + x)) * 3;
      const px = [data[i], data[i + 1], data[i + 2]];
      sr += px[0]; sg += px[1]; sb += px[2]; n++;
      const l = lum(px);
      if (l < min) min = l;
    }
  }
  const mean = [sr / n, sg / n, sb / n];
  // Colour stays the average; only the tone used for glyph choice is darkened.
  mean.tone = lum(mean) * (1 - CFG.darkBias) + min * CFG.darkBias;
  return mean;
};

if (probe) {
  const spots = {
    'bg top-left': [2, 2], 'bg right': [CFG.cols - 3, 6],
    'hair': [30, 3], 'forehead': [30, 9],
    'left eye': [21, 15], 'right eye': [40, 13],
    'cheek': [30, 20], 'cravat': [30, rows - 4],
  };
  console.log(`grid ${CFG.cols}x${rows}  source ${meta.width}x${meta.height}\n`);
  for (const [name, [c, r]] of Object.entries(spots)) {
    const p = at(c, r);
    console.log(`  ${name.padEnd(12)} rgb(${p.join(',').padEnd(11)})  lum ${lum(p).toFixed(0).padStart(3)}  blue ${blueness(p).toFixed(0).padStart(4)}`);
  }
  process.exit(0);
}

// Cache every cell once; the flood fill below needs random access.
const cell = [];
for (let r = 0; r < rows; r++) {
  cell.push(Array.from({ length: CFG.cols }, (_, c) => at(c, r)));
}

// Measured from the source: the backdrop sits at lum 76-80 / blue 33-39, while
// hair and coat sit at lum 42-56 / blue 0-13. Two conditions separate them
// cleanly, so no flood fill is needed.
const isBg = cell.map((row) => row.map((p) => blueness(p) > CFG.bgBlueness && lum(p) > CFG.bgMinLum));

// Normalize against the subject only — letting the backdrop into the range
// would compress the face into a couple of ramp steps.
let lo = 255, hi = 0;
for (let r = 0; r < rows; r++) {
  for (let c = 0; c < CFG.cols; c++) {
    if (isBg[r][c]) continue;
    const l = cell[r][c].tone;
    if (l < lo) lo = l;
    if (l > hi) hi = l;
  }
}

const chars = [], colors = [];
for (let r = 0; r < rows; r++) {
  let line = '', crow = [];
  for (let c = 0; c < CFG.cols; c++) {
    const p = cell[r][c];
    if (isBg[r][c]) { line += ' '; crow.push(null); continue; }
    const t = Math.max(0, Math.min(1, (p.tone - lo) / (hi - lo)));
    const g = Math.pow(t, CFG.gamma);
    line += RAMP[Math.round(g * (RAMP.length - 1))];
    crow.push('#' + p.map((v) => Math.round(v).toString(16).padStart(2, '0')).join(''));
  }
  chars.push(line);
  colors.push(crow);
}

writeFileSync(
  join(ROOT, 'assets', 'portrait.json'),
  JSON.stringify({ cols: CFG.cols, rows, chars, colors }, null, 0)
);
console.log(chars.join('\n'));
console.log(`\ngrid ${CFG.cols}x${rows}  luminance ${lo.toFixed(0)}–${hi.toFixed(0)}  background cells ${isBg.flat().filter(Boolean).length}/${rows*CFG.cols}`);
console.log('written assets/portrait.json');
