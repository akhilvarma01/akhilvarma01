#!/usr/bin/env node
// Renders the RPG character sheet from a stats blob.
//
// In production the nightly Action writes assets/stats.json (see
// scripts/fetch-stats.mjs) and this turns it into assets/character.svg.
// Nothing here talks to the network, so the sheet is reproducible offline.

import { writeFileSync, readFileSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const MONO = `ui-monospace,'SFMono-Regular',Menlo,Consolas,'Liberation Mono',monospace`;

// Inlined for the same reason as in build.mjs: camo will not fetch an external
// font, and every viewer should see the same typeface. Emoji in the
// achievements row fall through to the system emoji font, which is intended.
const FONT_B64 = readFileSync(join(ROOT, 'assets', 'fonts', 'geist-mono.woff2')).toString('base64');
const FONT_FACE = `@font-face{font-family:'GeistMono';` +
  `src:url(data:font/woff2;base64,${FONT_B64}) format('woff2');` +
  `font-weight:100 900;font-style:normal;font-display:block}`;
const MONO_EMBED = `'GeistMono',${MONO}`;

const C = {
  bg: '#0d1117', panel: '#161b22', raised: '#1c2128',
  line: '#30363d', dim: '#6e7681', mute: '#8b949e', text: '#c9d1d9',
  cyan: '#39d0d8', purple: '#bc8cff', green: '#3fb950', amber: '#d29922', red: '#ff7b72',
};

// Dominant language picks the class. Flavour only — the numbers stay honest.
const CLASSES = {
  TypeScript: 'Type Warden', JavaScript: 'Scriptblade', Python: 'Serpent Adept',
  Go: 'Goroutine Monk', Rust: 'Borrow Checker', Java: 'Verbose Paladin',
  Ruby: 'Gem Cutter', PHP: 'Legacy Necromancer', default: 'Generalist',
};

// Levels curve so early progress feels fast and later levels cost more.
const levelFor = (xp) => Math.max(1, Math.floor(Math.sqrt(xp / 8)));
const xpFor = (lvl) => lvl * lvl * 8;

const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

function bar(x, y, w, pct, color, h = 7) {
  const filled = Math.max(0, Math.min(1, pct)) * w;
  return (
    `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="${h / 2}" fill="${C.raised}"/>` +
    `<rect x="${x}" y="${y}" width="0" height="${h}" rx="${h / 2}" fill="${color}">` +
    `<animate attributeName="width" from="0" to="${filled.toFixed(1)}" dur="1.1s" ` +
    `begin="0.35s" fill="freeze" calcMode="spline" keySplines="0.2 0.8 0.3 1" keyTimes="0;1" values="0;${filled.toFixed(1)}"/>` +
    `</rect>`
  );
}

export function buildCharacter(S) {
  const W = 880, H = 496;
  const lvl = levelFor(S.xp);
  const into = S.xp - xpFor(lvl), span = xpFor(lvl + 1) - xpFor(lvl);
  const cls = CLASSES[S.topLanguage] ?? CLASSES.default;

  let o = '';

  // ---- header ----------------------------------------------------------
  o += `<text x="34" y="46" font-size="11" fill="${C.cyan}" letter-spacing="3.2">CHARACTER SHEET</text>`;
  o += `<text x="34" y="80" font-size="26" fill="${C.text}" font-weight="700" letter-spacing="1.5">${esc(S.name)}</text>`;
  // Geist Mono advances at exactly 0.6em, so a run's width is length x
  // (size x 0.6 + letter-spacing). The old code assumed 8.6px per character
  // at 13px/1.4, which is 9.2 — the title crept left into the class name.
  const runW = (text, size, ls = 0) => text.length * (size * 0.6 + ls);

  // "RANK" labels the class so it reads as a game element rather than a
  // stray adjective sitting next to the job title.
  let cx = 34;
  o += `<text x="${cx}" y="104" font-size="10" fill="${C.dim}" letter-spacing="2.4">RANK</text>`;
  cx += runW('RANK', 10, 2.4) + 13;
  o += `<text x="${cx.toFixed(1)}" y="104" font-size="13" fill="${C.purple}" letter-spacing="1.4">${esc(cls)}</text>`;
  cx += runW(cls, 13, 1.4) + 9;
  o += `<text x="${cx.toFixed(1)}" y="104" font-size="13" fill="${C.dim}" letter-spacing="1.4">· ${esc(S.title)}</text>`;

  // Level badge
  o += `<rect x="${W - 190}" y="30" width="156" height="58" rx="8" fill="${C.panel}" stroke="${C.line}"/>`;
  o += `<text x="${W - 172}" y="55" font-size="10" fill="${C.dim}" letter-spacing="2.4">LEVEL</text>`;
  o += `<text x="${W - 172}" y="79" font-size="27" fill="${C.amber}" font-weight="700">${lvl}</text>`;
  o += `<text x="${W - 118}" y="79" font-size="10.5" fill="${C.dim}">${into} / ${span} xp</text>`;
  o += bar(W - 118, 58, 66, into / span, C.amber, 6);

  o += `<line x1="34" y1="124" x2="${W - 34}" y2="124" stroke="${C.line}"/>`;

  // ---- stats -----------------------------------------------------------
  o += `<text x="34" y="152" font-size="10" fill="${C.dim}" letter-spacing="2.4">ATTRIBUTES</text>`;
  S.stats.forEach((s, i) => {
    const y = 178 + i * 30;
    o += `<text x="34" y="${y}" font-size="11.5" fill="${C.mute}" letter-spacing="1.6">${esc(s.label)}</text>`;
    o += `<text x="150" y="${y}" font-size="12" fill="${C.text}" font-weight="700" text-anchor="end">${s.value}</text>`;
    o += bar(162, y - 8, 178, s.value / 100, s.color ?? C.cyan);
    o += `<text x="34" y="${y + 13}" font-size="9" fill="${C.dim}">${esc(s.from)}</text>`;
  });

  // ---- proficiencies ---------------------------------------------------
  const px = 468;
  o += `<text x="${px}" y="152" font-size="10" fill="${C.dim}" letter-spacing="2.4">PROFICIENCIES</text>`;
  S.languages.slice(0, 5).forEach((l, i) => {
    const y = 178 + i * 30;
    o += `<text x="${px}" y="${y}" font-size="11.5" fill="${C.mute}">${esc(l.name)}</text>`;
    o += `<text x="${px + 128}" y="${y}" font-size="12" fill="${C.text}" font-weight="700" text-anchor="end">${l.pct}</text>`;
    o += bar(px + 140, y - 8, 238, l.pct / 100, l.color ?? C.purple);
  });

  // ---- achievements ----------------------------------------------------
  const ay = 382;
  o += `<line x1="34" y1="${ay - 22}" x2="${W - 34}" y2="${ay - 22}" stroke="${C.line}"/>`;
  o += `<text x="34" y="${ay}" font-size="10" fill="${C.dim}" letter-spacing="2.4">ACHIEVEMENTS</text>`;
  let ax = 34;
  for (const a of S.achievements) {
    const w = a.label.length * 6.4 + 34;
    const on = a.unlocked;
    o += `<rect x="${ax}" y="${ay + 12}" width="${w}" height="30" rx="6" fill="${on ? C.panel : 'none'}" stroke="${on ? (a.color ?? C.green) : C.line}" stroke-dasharray="${on ? '' : '3 3'}"/>`;
    o += `<text x="${ax + 11}" y="${ay + 32}" font-size="12" fill="${on ? (a.color ?? C.green) : C.dim}">${on ? a.icon : '🔒'}</text>`;
    o += `<text x="${ax + 28}" y="${ay + 32}" font-size="10.5" fill="${on ? C.text : C.dim}">${esc(a.label)}</text>`;
    ax += w + 9;
  }

  // ---- footer ----------------------------------------------------------
  o += `<text x="34" y="${H - 20}" font-size="9.5" fill="${C.dim}">last sync ${esc(S.syncedAt)} · regenerated nightly by GitHub Actions</text>`;
  o += `<text x="${W - 34}" y="${H - 20}" font-size="9.5" fill="${C.dim}" text-anchor="end">${esc(S.source)}</text>`;

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}" font-family="${MONO_EMBED}" role="img" aria-label="RPG character sheet for ${esc(S.name)}, level ${lvl} ${esc(cls)}">
<style>${FONT_FACE} text{font-family:${MONO_EMBED}}</style>
<rect width="${W}" height="${H}" rx="14" fill="${C.bg}"/>
<rect x="0.5" y="0.5" width="${W - 1}" height="${H - 1}" rx="14" fill="none" stroke="${C.line}"/>
${o}
</svg>
`;
}

// Run directly: render assets/stats.json (or the committed sample).
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const f = join(ROOT, 'assets', 'stats.json');
  if (!existsSync(f)) { console.error('missing assets/stats.json — run fetch-stats.mjs'); process.exit(1); }
  const svg = buildCharacter(JSON.parse(readFileSync(f, 'utf8')));
  writeFileSync(join(ROOT, 'assets', 'character.svg'), svg);
  console.log('character.svg', (svg.length / 1024).toFixed(1) + ' kB');
}
