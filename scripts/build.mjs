#!/usr/bin/env node
// Generates every SVG in assets/ from the config below.
// Zero dependencies. Run: node scripts/build.mjs
//
// GitHub's README sanitizer strips <script>, <style> blocks and CSS from the
// markdown itself, but SVGs loaded via <img> keep their internal <style> and
// SMIL. Everything animated here lives inside the SVG for that reason.

import { writeFileSync, readFileSync, existsSync, mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const ASSETS = join(ROOT, 'assets');

/* ------------------------------------------------------------------ config */

const IDENTITY = {
  // Split across two lines: the full name at a readable weight is wider than
  // the 316px column left beside the portrait.
  l1: 'AKHIL VARMA',
  l2: 'ALLURI',
  role: 'full-stack engineer',
  blurb: 'Building admin and commerce platforms',
};

const MONO = `ui-monospace,'SFMono-Regular',Menlo,Consolas,'Liberation Mono',monospace`;

// GitHub dark canvas. Painted explicitly so the panel reads the same on both
// GitHub themes rather than borrowing whatever is behind it.
const C = {
  bg: '#0d1117',
  panel: '#010409',
  border: '#30363d',
  dim: '#484f58',
  text: '#c9d1d9',
  green: '#3fb950',
  cyan: '#39d0d8',
  purple: '#bc8cff',
  amber: '#d29922',
  surfaceBtn: '#161b22',
};

// Density ramp, light -> heavy. Matches what a photo converter emits, so the
// real portrait will drop in without changing the renderer.
const RAMP = ' \u2591\u2591\u2592\u2592\u2593\u2593\u2588\u2588';

/* ------------------------------------------------------- portrait sourcing */

// Until a real photo is converted, synthesize a lit bust so the pipeline is
// provable end to end. Replace by dropping a portrait.txt into assets/.
function synthesizePortrait(cols, rows) {
  const grid = [];
  // Light from upper-left, slightly in front.
  const L = norm([-0.45, -0.62, 0.65]);

  for (let r = 0; r < rows; r++) {
    let line = '';
    for (let c = 0; c < cols; c++) {
      // Normalize to -1..1, correcting for the ~2:1 aspect of a character cell.
      const x = (c / (cols - 1)) * 2 - 1;
      const y = (r / (rows - 1)) * 2 - 1;

      let v = 0;

      // --- neck (drawn first so the jaw shadow overwrites its top) --------
      const neckHalf = 0.17 - (y - 0.18) * 0.05;
      if (Math.abs(x) < neckHalf && y > 0.10 && y < 0.52) {
        const across = x / neckHalf;                 // -1..1 across the neck
        // Cylinder, not a slab: light wraps and the far side falls away.
        v = Math.max(v, (0.46 - across * 0.30) * (1 - across * across * 0.45));
        // The head casts onto the neck, heaviest right under the jaw.
        v *= smooth(0.10, 0.34, y) * 0.75 + 0.25;
      }

      // --- shoulders ------------------------------------------------------
      const sy = (y - 1.42) / 0.86;
      const sx = x / 1.02;
      const s2 = sx * sx + sy * sy;
      if (s2 <= 1 && y > 0.42) {
        const nz = Math.sqrt(Math.max(0, 1 - s2));
        const n = norm([sx * 0.8, sy * 1.1, nz]);
        // Kept dim and edge-faded so the face stays the subject.
        const fade = smooth(1.0, 0.62, s2);
        v = Math.max(v, (Math.max(0, dot(n, L)) * 0.40 + 0.06) * fade);
      }

      // --- head: shaded sphere --------------------------------------------
      const hx = x / 0.50;
      const hy = (y + 0.36) / 0.60;
      const h2 = hx * hx + hy * hy;
      if (h2 <= 1) {
        const nz = Math.sqrt(Math.max(0, 1 - h2));
        const n = norm([hx, hy, nz]);
        let f = Math.max(0, dot(n, L)) * 0.92 + 0.10;

        // Rim light down the shaded side lifts the head off the background.
        f += Math.max(0, hx - 0.55) * 0.55 * nz;

        // Hair: a soft cap, blended rather than switched, plus a temple sweep.
        const hairline = -0.60 + 0.13 * Math.cos(hx * 2.0) + Math.abs(hx) * 0.30;
        f *= 0.20 + 0.80 * smooth(hairline - 0.14, hairline + 0.14, hy);

        // Brow ridge, then the sockets it shades. Both stay local: the head
        // spans only ±1 here, so feature half-widths must be small fractions.
        f *= 1 - 0.20 * bump(hx, 0, 0.62) * bump(hy, -0.24, 0.12);
        for (const ex of [-0.38, 0.38]) {
          f *= 1 - 0.66 * bump(hx, ex, 0.24) * bump(hy, -0.04, 0.13);
        }

        // Nose: lit ridge, shadowed underside.
        f *= 1 + 0.26 * bump(hx, 0, 0.10) * bump(hy, 0.16, 0.22);
        f *= 1 - 0.30 * bump(hx, 0.06, 0.20) * bump(hy, 0.40, 0.09);

        // Mouth line and the shadow beneath the lower lip.
        f *= 1 - 0.42 * bump(hx, 0, 0.30) * bump(hy, 0.60, 0.055);
        f *= 1 - 0.16 * bump(hx, 0, 0.26) * bump(hy, 0.70, 0.06);

        // Jaw falls off toward the chin so the silhouette tapers.
        f *= 1 - 0.28 * Math.max(0, hy - 0.55);

        v = f;
      }

      line += v <= 0.02 ? ' ' : RAMP[clamp(Math.round(v * (RAMP.length - 1)), 1, RAMP.length - 1)];
    }
    grid.push(line);
  }
  return grid;
}

function loadPortrait(cols, rows) {
  const json = join(ASSETS, 'portrait.json');
  if (existsSync(json)) return JSON.parse(readFileSync(json, 'utf8'));
  return { chars: synthesizePortrait(cols, rows), colors: null };
}

// The panel sits at luminance ~17, so image colours down to ~40 already read
// against it. Lifting further only flattens hair and skin toward the same
// brightness and washes the portrait out — so this floor stays low.
function lift(hex, floor = 42) {
  if (!hex) return C.dim;
  const [r, g, b] = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16));
  const l = 0.2126 * r + 0.7152 * g + 0.0722 * b;
  const k = l < floor ? floor / Math.max(l, 12) : 1;
  const m = (v) => Math.min(255, Math.round(v * k)).toString(16).padStart(2, '0');
  return `#${m(r)}${m(g)}${m(b)}`;
}

// The panel colour is known and fixed, so per-glyph opacity can be composited
// into the fill at build time. Saves an attribute on every one of ~5000
// glyphs, which is most of the hero's file size.
const blend = (hex, op, onto = C.bg) => {
  const p = (h) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16));
  const [r, g, b] = p(hex), [br, bg, bb] = p(onto);
  const m = (f, k) => Math.round(k + (f - k) * op).toString(16).padStart(2, '0');
  return `#${m(r, br)}${m(g, bg)}${m(b, bb)}`;
};

const darken = (hex, k) => {
  const [r, g, b] = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16));
  const m = (v) => Math.round(v * k).toString(16).padStart(2, '0');
  return `#${m(r)}${m(g)}${m(b)}`;
};

const norm = (v) => {
  const m = Math.hypot(...v);
  return v.map((x) => x / m);
};
const dot = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
const dist2 = (a, b) => a * a + b * b;
const clamp = (n, lo, hi) => Math.min(hi, Math.max(lo, n));
// Hermite ease between two edges; edge0 > edge1 simply inverts the ramp.
const smooth = (e0, e1, x) => {
  const t = clamp((x - e0) / (e1 - e0), 0, 1);
  return t * t * (3 - 2 * t);
};
// 1 at centre, 0 by ±half — a soft falloff for placing facial features.
const bump = (x, centre, half) => {
  const t = clamp(Math.abs(x - centre) / half, 0, 1);
  return (1 - t * t) ** 2;
};
const esc = (s) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

// Deterministic RNG so rebuilds produce identical files (no diff churn).
function rng(seed) {
  let s = seed >>> 0;
  return () => {
    s ^= s << 13; s >>>= 0;
    s ^= s >> 17;
    s ^= s << 5; s >>>= 0;
    return s / 4294967296;
  };
}

/* ------------------------------------------------------------------- hero */

// Cells inside these boxes get an alternate "closed" glyph, and the two layers
// cross-fade to blink. Coordinates are grid cells, found by eye from the
// converted portrait — see scripts/photo-to-ascii.mjs.
const EYES = [
  // Aperture only. Including the brow makes the shut frame read as a censor
  // bar rather than an eyelid.
  { c0: 26, c1: 42, r0: 31, r1: 33 },   // his left
  { c0: 68, c1: 82, r0: 27, r1: 29 },   // his right, behind the fringe
];

function buildHero() {
  const FS = 7.4, CW = 4.2, LH = 7.7;
  const W = 880;
  const art = loadPortrait(54, 30);
  const grid = art.chars;
  const H = Math.max(452, grid.length * LH + 62);

  const px = 44, py = 30;              // portrait origin
  const rand = rng(0xA47);

  // Eye cells live in their own group: the blink toggles the group's
  // visibility, so every glyph keeps its own fall delay without the two
  // animations fighting over a single animation-delay value.
  const glyphs = [], eyeOpen = [], shut = [];
  const inEye = (c, r) => EYES.find((e) => c >= e.c0 && c <= e.c1 && r >= e.r0 && r <= e.r1);

  // Each glyph is its own <text> so it can fall independently. Spaces are
  // skipped entirely, which cuts the element count roughly in half.
  for (let r = 0; r < grid.length; r++) {
    for (let c = 0; c < grid[r].length; c++) {
      const ch = grid[r][c];
      if (ch === ' ') continue;

      const weight = RAMP.indexOf(ch) / (RAMP.length - 1);
      const t = r / grid.length;
      // Real image colour when we have it; the old gradient is the fallback
      // for the synthesized bust.
      const col = art.colors ? lift(art.colors[r][c]) : mixHex(C.cyan, C.purple, t);
      const op = (art.colors ? 0.42 + weight * 0.58 : 0.35 + weight * 0.65).toFixed(2);

      const x = (px + c * CW).toFixed(1), y = (py + r * LH).toFixed(1);
      const delay = (0.15 + t * 0.9 + rand() * 0.55).toFixed(2);
      const flicker = rand() < 0.03;

      const eye = inEye(c, r);
      (eye ? eyeOpen : glyphs).push(
        `<text x="${x}" y="${y}" fill="${blend(col, +op)}" class="g${flicker && !eye ? ' fl' : ''}" ` +
        `style="animation-delay:${delay}s${flicker && !eye ? `,${(2.4 + rand() * 5).toFixed(1)}s` : ''}">${esc(ch)}</text>`
      );

      // A shut eye is not a hole. Fill the socket with skin borrowed from two
      // rows above the eye, then lay one darker row across it as the lash line
      // — otherwise the blink punches the panel background through the face.
      if (eye) {
        const mid = Math.round((eye.r0 + eye.r1) / 2);
        // Cheek, not brow: r0-2 lands on the eyebrow and tints the lid black.
        const srcR = Math.min(grid.length - 1, eye.r1 + 2);
        const isLid = r === mid;
        const lidCh = isLid ? '▒' : (grid[srcR]?.[c] ?? ' ');
        if (lidCh !== ' ') {
          const base = art.colors ? art.colors[srcR]?.[c] : null;
          const lidCol = isLid ? darken(lift(base), 0.62) : lift(base);
          shut.push(`<text x="${x}" y="${y}" fill="${blend(lidCol, +op)}">${esc(lidCh)}</text>`);
        }
      }
    }
  }

  const tx = 530;                       // right-hand text column
  const typed = [];
  let clipDefs = '';
  // ls must be folded into the width: letter-spacing adds its value to every
  // advance, so ignoring it clips the tail off the longer lines.
  const line = (id, x, y, text, size, fill, weight, delay, dur, ls = 0) => {
    const extra = ls ? `letter-spacing="${ls}"` : '';
    const w = text.length * (size * 0.60 + ls) + 10;
    clipDefs +=
      `<clipPath id="${id}" clipPathUnits="userSpaceOnUse">` +
      `<rect x="${x - 2}" y="${y - size}" width="0" height="${size * 1.6}">` +
      `<animate attributeName="width" from="0" to="${w.toFixed(0)}" dur="${dur}s" ` +
      `begin="${delay}s" fill="freeze" calcMode="discrete" ` +
      `values="${steps(w, text.length)}" keyTimes="${keyTimes(text.length)}"/>` +
      `</rect></clipPath>`;
    typed.push(
      `<text x="${x}" y="${y}" font-size="${size}" fill="${fill}" font-weight="${weight}" ` +
      `clip-path="url(#${id})" ${extra}>${esc(text)}</text>`
    );
  };

  line('t1', tx, 178, IDENTITY.l1, 36, C.text, 700, 1.5, 0.7, 4);
  line('t2', tx, 222, IDENTITY.l2, 36, C.text, 700, 2.1, 0.5, 4);
  line('t3', tx, 276, IDENTITY.role, 14, C.cyan, 400, 2.9, 0.6, 2);
  line('t4', tx, 304, IDENTITY.blurb, 12, C.dim, 400, 3.5, 0.9);

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}" font-family="${MONO}" role="img" aria-label="${esc(IDENTITY.l1)} ${esc(IDENTITY.l2)} — ${esc(IDENTITY.role)}, ${esc(IDENTITY.blurb)}">
<defs>
${clipDefs}
<linearGradient id="rule" x1="0" x2="1">
  <stop offset="0" stop-color="${C.cyan}"/><stop offset="1" stop-color="${C.purple}" stop-opacity="0"/>
</linearGradient>
<radialGradient id="glow" cx="0.28" cy="0.42" r="0.6">
  <stop offset="0" stop-color="${C.cyan}" stop-opacity="0.10"/>
  <stop offset="1" stop-color="${C.cyan}" stop-opacity="0"/>
</radialGradient>
</defs>
<style>
  text { font-family: ${MONO}; }
  /* No opacity here: each glyph carries its own opacity attribute, and the
     keyframe's implicit "to" resolves to it. Setting opacity:0 on .g would
     make fill-mode:both hold every glyph invisible after it lands. */
  .g { font-size: ${FS}px; animation: fall .62s cubic-bezier(.18,.85,.32,1) both; }
  .fl { animation-name: fall, flick; animation-duration: .62s, 4.5s; animation-iteration-count: 1, infinite; }
  @keyframes fall { from { opacity: 0; transform: translateY(-30px) } }
  @keyframes flick { 0%,94%,100% { opacity: .95 } 96% { opacity: .25 } 98% { opacity: 1 } }
  /* Blink: the two eye layers swap visibility, which leaves each glyph's own
     opacity attribute untouched. ~165ms shut every 5.4s. */
  .eo { animation: blinkO 5.4s steps(1) infinite; }
  .es { animation: blinkS 5.4s steps(1) infinite; }
  @keyframes blinkO { 0%,92.4%,96.1%,100% { visibility: visible } 92.5%,96% { visibility: hidden } }
  @keyframes blinkS { 0%,92.4%,96.1%,100% { visibility: hidden } 92.5%,96% { visibility: visible } }
  .caret { animation: blink 1.05s steps(1) infinite 4.4s; }
  @keyframes blink { 50% { opacity: 0 } }
  .rule { stroke-dasharray: 300; stroke-dashoffset: 300; animation: draw 1s ease-out forwards 2.6s; }
  @keyframes draw { to { stroke-dashoffset: 0 } }
</style>
<rect width="${W}" height="${H}" rx="14" fill="${C.bg}"/>
<rect width="${W}" height="${H}" rx="14" fill="url(#glow)"/>
<rect x="0.5" y="0.5" width="${W - 1}" height="${H - 1}" rx="14" fill="none" stroke="${C.border}"/>
${glyphs.join('\n')}
<g class="eo">${eyeOpen.join('\n')}</g>
<g class="es">${shut.join('\n')}</g>
<line x1="${tx}" y1="248" x2="${tx + 300}" y2="248" stroke="url(#rule)" stroke-width="1.5" class="rule"/>
${typed.join('\n')}
<rect x="${tx}" y="324" width="8" height="15" fill="${C.green}" class="caret"/>
<text x="${W - 26}" y="${H - 20}" font-size="10.5" fill="${C.dim}" text-anchor="end" letter-spacing="1.6">github.com/akhilvarma01</text>
</svg>
`;
}

// Discrete value lists give a real per-character typewriter step instead of a
// smooth slide, which is what sells the effect.
const steps = (w, n) =>
  Array.from({ length: n + 1 }, (_, i) => ((w * i) / n).toFixed(1)).join(';');
const keyTimes = (n) =>
  Array.from({ length: n + 1 }, (_, i) => (i / n).toFixed(4)).join(';');

function mixHex(a, b, t) {
  const p = (h) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16));
  const [r1, g1, b1] = p(a), [r2, g2, b2] = p(b);
  const m = (x, y) => Math.round(x + (y - x) * t).toString(16).padStart(2, '0');
  return `#${m(r1, r2)}${m(g1, g2)}${m(b1, b2)}`;
}

/* --------------------------------------------------------------- terminal */

const SESSION = [
  { p: '~', cmd: 'whoami', out: ['akhil varma alluri — full-stack engineer'] },
  { p: '~', cmd: 'cat stack.json | jq -r \'.daily[]\'', out: ['typescript', 'next.js', 'payload cms', 'postgresql', 'node.js'] },
  { p: '~', cmd: 'akhil --now', out: ['▸ order & catalog systems at elasticsuite', '▸ making a readme do things it should not'] },
];

function buildTerminal() {
  const W = 880, FS = 13.5, LH = 22, CW = FS * 0.6;
  const pad = 26, top = 62;

  const rows = [];
  for (const s of SESSION) {
    rows.push({ kind: 'cmd', text: `$ ${s.cmd}`, prompt: s.p });
    for (const o of s.out) rows.push({ kind: 'out', text: o });
    rows.push({ kind: 'gap', text: '' });
  }
  rows.pop();                            // drop the trailing gap
  const H = top + rows.length * LH + 40;

  let clip = '', body = '', t = 0.5;
  rows.forEach((row, i) => {
    const y = top + i * LH;
    if (row.kind === 'gap') { t += 0.18; return; }

    const id = `l${i}`;
    if (row.kind === 'cmd') {
      // Commands "type"; output appears at once, the way a real shell behaves.
      const n = row.text.length;
      const w = n * CW + 8;
      const dur = Math.max(0.5, n * 0.045);
      clip +=
        `<clipPath id="${id}" clipPathUnits="userSpaceOnUse">` +
        `<rect x="${pad - 2}" y="${y - FS}" width="0" height="${FS * 1.7}">` +
        `<animate attributeName="width" from="0" to="${w.toFixed(0)}" dur="${dur}s" begin="${t.toFixed(2)}s" ` +
        `fill="freeze" calcMode="discrete" values="${steps(w, n)}" keyTimes="${keyTimes(n)}"/>` +
        `</rect></clipPath>`;
      body +=
        `<text x="${pad}" y="${y}" font-size="${FS}" fill="${C.green}" clip-path="url(#${id})">` +
        `<tspan fill="${C.dim}">$ </tspan><tspan fill="${C.text}">${esc(row.text.slice(2))}</tspan></text>\n`;
      t += dur + 0.35;
    } else {
      body +=
        `<text x="${pad}" y="${y}" font-size="${FS}" fill="${C.cyan}" opacity="0">` +
        `${esc(row.text)}<animate attributeName="opacity" from="0" to="1" dur="0.14s" ` +
        `begin="${t.toFixed(2)}s" fill="freeze"/></text>\n`;
      t += 0.16;
    }
  });

  const cy = top + rows.length * LH - 6;
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}" font-family="${MONO}" role="img" aria-label="terminal session introducing akhil">
<defs>${clip}</defs>
<style>
  text { font-family: ${MONO}; }
  .cur { animation: blink 1.05s steps(1) infinite ${t.toFixed(2)}s; opacity: 0 }
  @keyframes blink { 0%,49% { opacity: 1 } 50%,100% { opacity: 0 } }
</style>
<rect width="${W}" height="${H}" rx="12" fill="${C.panel}"/>
<rect x="0.5" y="0.5" width="${W - 1}" height="${H - 1}" rx="12" fill="none" stroke="${C.border}"/>
<path d="M0 12a12 12 0 0 1 12-12h${W - 24}a12 12 0 0 1 12 12v24H0z" fill="#161b22"/>
<circle cx="24" cy="21" r="6" fill="#ff5f57"/><circle cx="44" cy="21" r="6" fill="#febc2e"/><circle cx="64" cy="21" r="6" fill="#28c840"/>
<text x="${W / 2}" y="26" font-size="12" fill="${C.dim}" text-anchor="middle">akhil@profile — zsh</text>
${body}<rect x="${pad}" y="${cy - FS + 2}" width="8" height="${FS + 2}" fill="${C.green}" class="cur"/>
</svg>
`;
}

/* ---------------------------------------------------------- choice buttons */

// GitHub strips CSS from markdown, so a <summary> cannot be styled into
// looking clickable. It *will* render an <img> though — so each choice is a
// drawn button, and clicking anywhere in the summary toggles it as usual.
const BUTTONS = {
  'accept':   { label: 'ACCEPT THE PAGE',            tone: 'red',  w: 250 },
  'rollback': { label: 'kubectl rollback',           tone: 'cyan' },
  'logs':     { label: 'read the logs first',        tone: 'cyan' },
  'drop':     { label: 'DROP TABLE orders;',         tone: 'red' },
  'bed':      { label: 'go back to bed',             tone: 'dim' },
  'podlogs':  { label: 'pull the pod logs',          tone: 'cyan' },
  'hotfix':   { label: 'hotfix it live',             tone: 'amber' },
  'proper':   { label: 'roll back, fix it properly', tone: 'green' },
};

const TONES = {
  cyan:  { fg: C.cyan,   bd: '#1f4f55' },
  red:   { fg: '#ff7b72', bd: '#5c2b28' },
  amber: { fg: C.amber,  bd: '#5c4416' },
  green: { fg: C.green,  bd: '#1f4d2b' },
  dim:   { fg: C.dim,    bd: '#2d333b' },
};

function buildButton({ label, tone, w }) {
  const t = TONES[tone];
  const FS = 13.5;
  const width = w ?? Math.round(label.length * FS * 0.6 + 62);
  const H = 38;
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${H}" viewBox="0 0 ${width} ${H}" role="img" aria-label="${esc(label)}">
<style>
  text { font-family: ${MONO}; }
  .pulse { animation: p 2.6s ease-in-out infinite; }
  @keyframes p { 0%,100% { opacity: .55 } 50% { opacity: 1 } }
</style>
<rect x="1" y="1" width="${width - 2}" height="${H - 2}" rx="7" fill="${C.surfaceBtn}" stroke="${t.bd}"/>
<text x="17" y="${H / 2 + 5}" font-size="${FS}" fill="${t.fg}" class="pulse">▸</text>
<text x="34" y="${H / 2 + 5}" font-size="${FS}" fill="${t.fg}">${esc(label)}</text>
</svg>
`;
}

/* ------------------------------------------------------------- tech stack */

// Clicking a category expands its panel. Both halves are drawn as SVG because
// GitHub strips CSS from markdown — a <summary> cannot be styled, but it will
// render an <img> happily.
const STACK = {
  frontend: {
    label: 'FRONTEND', tone: 'cyan',
    items: [
      ['TypeScript',      92, 'daily'],
      ['React / Next.js', 88, 'daily'],
      ['Tailwind CSS',    64, 'weekly'],
      ['Playwright',      52, 'weekly'],
    ],
  },
  backend: {
    label: 'BACKEND', tone: 'purple',
    items: [
      ['Node.js',      86, 'daily'],
      ['Payload CMS',  84, 'daily'],
      ['REST / GraphQL', 70, 'weekly'],
      ['Jest',         58, 'weekly'],
    ],
  },
  data: {
    label: 'DATA', tone: 'green',
    items: [
      ['PostgreSQL', 78, 'daily'],
      ['MongoDB',    54, 'occasional'],
      ['Redis',      42, 'occasional'],
    ],
  },
  ship: {
    label: 'SHIP', tone: 'amber',
    items: [
      ['Docker',         66, 'weekly'],
      ['GitHub Actions', 62, 'weekly'],
      ['Vercel',         55, 'weekly'],
      ['Sentry',         48, 'weekly'],
    ],
  },
};

const TONE = {
  cyan:   { fg: C.cyan,   bd: '#1f4f55' },
  purple: { fg: C.purple, bd: '#3d2d5c' },
  green:  { fg: C.green,  bd: '#1f4d2b' },
  amber:  { fg: C.amber,  bd: '#5c4416' },
};

function buildStackButton({ label, tone, items }) {
  const t = TONE[tone], FS = 13, H = 42;
  const W = Math.round(label.length * FS * 0.62 + 96);
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}" role="img" aria-label="${label} stack, ${items.length} tools">
<style>text{font-family:${MONO}} .c{animation:p 2.8s ease-in-out infinite} @keyframes p{0%,100%{opacity:.5}50%{opacity:1}}</style>
<rect x="1" y="1" width="${W - 2}" height="${H - 2}" rx="8" fill="${C.surfaceBtn}" stroke="${t.bd}"/>
<text x="16" y="${H / 2 + 5}" font-size="${FS}" fill="${t.fg}" class="c">\u25b8</text>
<text x="33" y="${H / 2 + 5}" font-size="${FS}" fill="${t.fg}" letter-spacing="1.6" font-weight="600">${label}</text>
<text x="${W - 16}" y="${H / 2 + 5}" font-size="11" fill="${C.dim}" text-anchor="end">${items.length}</text>
</svg>
`;
}

function buildStackPanel({ label, tone, items }) {
  const t = TONE[tone];
  const W = 660, ROW = 34, PAD = 22;
  const H = PAD * 2 + items.length * ROW;
  let o = '';
  items.forEach(([name, pct, cadence], i) => {
    const y = PAD + 22 + i * ROW;
    const bw = 300, bx = 210;
    const fill = (pct / 100) * bw;
    o += `<text x="${PAD}" y="${y}" font-size="12.5" fill="${C.text}">${esc(name)}</text>`;
    o += `<rect x="${bx}" y="${y - 8}" width="${bw}" height="7" rx="3.5" fill="${C.surfaceBtn}"/>`;
    o += `<rect x="${bx}" y="${y - 8}" width="0" height="7" rx="3.5" fill="${t.fg}">` +
         `<animate attributeName="width" from="0" to="${fill.toFixed(1)}" dur="0.8s" ` +
         `begin="${(0.1 + i * 0.09).toFixed(2)}s" fill="freeze" calcMode="spline" ` +
         `keySplines="0.2 0.8 0.3 1" keyTimes="0;1" values="0;${fill.toFixed(1)}"/></rect>`;
    o += `<text x="${bx + bw + 14}" y="${y}" font-size="11" fill="${C.dim}">${esc(cadence)}</text>`;
  });
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}" role="img" aria-label="${label} tools">
<style>text{font-family:${MONO}}</style>
<rect x="0.5" y="0.5" width="${W - 1}" height="${H - 1}" rx="9" fill="${C.bg}" stroke="${C.line ?? C.border}"/>
${o}
</svg>
`;
}

/* ------------------------------------------------------------------- main */

if (!existsSync(ASSETS)) mkdirSync(ASSETS, { recursive: true });

const out = { 'hero.svg': buildHero() };
for (const [id, cfg] of Object.entries(STACK)) {
  out[`stack-${id}.svg`] = buildStackButton(cfg);
  out[`stack-${id}-panel.svg`] = buildStackPanel(cfg);
}
for (const [name, svg] of Object.entries(out)) {
  writeFileSync(join(ASSETS, name), svg);
  console.log(`  ${name.padEnd(14)} ${(svg.length / 1024).toFixed(1)} kB`);
}
console.log(`\ndone — ${Object.keys(out).length} assets written to assets/`);
