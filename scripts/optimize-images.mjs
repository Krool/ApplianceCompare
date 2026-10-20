#!/usr/bin/env node
// Re-encode every model image referenced by the data files into two webp
// variants and point the JSON at them:
//
//   images/<cat>/<name>.webp        longest side <= 1200px  (drawer hero, lightbox)
//   images/<cat>/<name>.thumb.webp  longest side <=  240px  (table, compare, gallery strip)
//
// The UI derives the thumb path from `local` (see thumbSrc in src/helpers.jsx),
// so only `local` is stored. Originals that are no longer referenced are NOT
// deleted; they are listed in scripts/.optimize-orphans.txt for a reviewed
// `git rm`. Idempotent: an image that is already a <=1200px webp with a thumb
// is skipped. Run after any fetch-*/download-image pass.
//
//   npm install --prefix scripts      (once, for sharp)
//   node scripts/optimize-images.mjs [--dry-run]
//
// Concurrency is capped at cores/4 so the machine stays usable.

import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';

const REPO_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const DATA = path.join(REPO_ROOT, 'public', 'data');
const FILES = ['refrigerators', 'dishwashers', 'ovens'];
const FULL_MAX = 1200;
const THUMB_MAX = 240;
const WORKERS = Math.max(1, Math.ceil(os.cpus().length / 4));
const DRY = process.argv.includes('--dry-run');

sharp.concurrency(1);

const webpPath = (local) => local.replace(/\.(png|jpe?g|webp|gif|avif)$/i, '.webp');
const thumbPath = (local) => webpPath(local).replace(/\.webp$/, '.thumb.webp');

async function exists(p) {
  try { await fs.access(p); return true; } catch { return false; }
}

async function optimize(local) {
  const src = path.join(DATA, local);
  const outLocal = webpPath(local);
  const out = path.join(DATA, outLocal);
  const thumb = path.join(DATA, thumbPath(local));
  const input = await fs.readFile(src);
  const meta = await sharp(input).metadata();
  const isSmallWebp = /\.webp$/i.test(local) && Math.max(meta.width, meta.height) <= FULL_MAX;
  if (isSmallWebp && await exists(thumb)) return { local, outLocal, skipped: true, before: input.length, after: input.length };
  if (DRY) return { local, outLocal, before: input.length, after: 0 };

  const full = await sharp(input).rotate()
    .resize({ width: FULL_MAX, height: FULL_MAX, fit: 'inside', withoutEnlargement: true })
    .webp({ quality: 78, effort: 5 }).toBuffer();
  const small = await sharp(input).rotate()
    .resize({ width: THUMB_MAX, height: THUMB_MAX, fit: 'inside', withoutEnlargement: true })
    .webp({ quality: 72, effort: 5 }).toBuffer();
  // Never grow an already-optimized webp.
  const keepOriginal = /\.webp$/i.test(local) && input.length <= full.length;
  if (!keepOriginal) await fs.writeFile(out, full);
  await fs.writeFile(thumb, small);
  return { local, outLocal, before: input.length, after: (keepOriginal ? input.length : full.length) + small.length };
}

async function pool(items, fn) {
  const results = [];
  let i = 0;
  await Promise.all(Array.from({ length: WORKERS }, async () => {
    while (i < items.length) {
      const item = items[i++];
      try { results.push(await fn(item)); }
      catch (e) { results.push({ local: item, error: e.message }); }
    }
  }));
  return results;
}

const datasets = {};
const refs = new Set();
for (const f of FILES) {
  const raw = await fs.readFile(path.join(DATA, f + '.json'), 'utf8');
  datasets[f] = { json: JSON.parse(raw), crlf: raw.includes('\r\n') };
  for (const m of datasets[f].json.models) {
    if (m.image?.local) refs.add(m.image.local);
    for (const g of m.images || []) if (g.local) refs.add(g.local);
  }
}

console.log(`${refs.size} referenced images, ${WORKERS} workers${DRY ? ' (dry run)' : ''}`);
const results = await pool([...refs], optimize);
const errors = results.filter(r => r.error);
const moved = new Map(results.filter(r => !r.error).map(r => [r.local, r.outLocal]));
const before = results.reduce((s, r) => s + (r.before || 0), 0);
const after = results.reduce((s, r) => s + (r.after || 0), 0);
console.log(`skipped ${results.filter(r => r.skipped).length}, errors ${errors.length}`);
for (const e of errors) console.log('  ERR', e.local, e.error);
if (!DRY) console.log(`${(before / 1e6).toFixed(1)} MB -> ${(after / 1e6).toFixed(1)} MB (full + thumb)`);
if (DRY) process.exit(0);

for (const [f, { json, crlf }] of Object.entries(datasets)) {
  let changed = false;
  for (const m of json.models) {
    for (const img of [m.image, ...(m.images || [])]) {
      if (img?.local && moved.has(img.local) && moved.get(img.local) !== img.local) {
        img.local = moved.get(img.local);
        changed = true;
      }
    }
  }
  if (!changed) continue;
  let text = JSON.stringify(json, null, 2) + '\n';
  if (crlf) text = text.replace(/\n/g, '\r\n');
  await fs.writeFile(path.join(DATA, f + '.json'), text);
  console.log(`patched ${f}.json`);
}

const orphans = [...moved].filter(([a, b]) => a !== b).map(([a]) => `public/data/${a}`);
await fs.writeFile(path.join(REPO_ROOT, 'scripts', '.optimize-orphans.txt'), orphans.join('\n') + '\n');
console.log(`${orphans.length} originals now unreferenced -> scripts/.optimize-orphans.txt`);
