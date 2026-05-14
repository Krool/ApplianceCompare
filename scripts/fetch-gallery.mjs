// Gallery fetcher. For each model whose canonical image came from Best Buy,
// probe `_s1.jpg` ... `_s8.jpg` alt-view URLs and download whatever exists.
// Updates each model with an `images: [...]` array where the first entry is
// the existing canonical image and subsequent entries are alt views.

import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';

const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0 Safari/537.36';
const TIMEOUT_MS = 8000;
const MIN_IMAGE_BYTES = 4096;
const MAX_ALT_VIEWS = 7; // probe s1..s7
const CONCURRENCY = 8;

const root = process.cwd();
const cats = ['refrigerators', 'ovens', 'dishwashers'];

const data = Object.fromEntries(cats.map(c => [c, JSON.parse(fs.readFileSync(path.join(root, 'public/data', c + '.json'), 'utf8'))]));

async function fetchWithTimeout(url) {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), TIMEOUT_MS);
  try {
    return await fetch(url, { signal: ctrl.signal, headers: { 'User-Agent': UA }, redirect: 'follow' });
  } finally { clearTimeout(t); }
}

// Hash of canonical image — used to skip alt views that duplicate the canonical
function canonicalHash(localPath) {
  const p = path.join(root, 'public/data', localPath);
  if (!fs.existsSync(p)) return null;
  return crypto.createHash('sha1').update(fs.readFileSync(p)).digest('hex');
}

// SKU -> Best Buy alt view URL for a given index
function bbAltViewUrl(sku, idx) {
  const prefix = sku.slice(0, 4);
  return `https://pisces.bbystatic.com/image2/BestBuy_US/images/products/${prefix}/${sku}_s${idx}.jpg`;
}

// Extract SKU from a Best Buy source URL.
// Patterns:
//   https://pisces.bbystatic.com/image2/BestBuy_US/images/products/6439/6439376_sd.jpg
//   https://pisces.bbystatic.com/.../<sku>_<view>.jpg
function extractBbSku(url) {
  const m = url.match(/\/(\d{7,8})_s[a-z0-9]+\.jpg$/i) || url.match(/\/(\d{7,8})\.jpg$/);
  return m ? m[1] : null;
}

async function probeAndSave(url, destPath, existingHashes) {
  try {
    const r = await fetchWithTimeout(url);
    if (!r.ok) return { ok: false, status: r.status };
    const ct = r.headers.get('content-type');
    if (!/^image\//.test(ct || '')) return { ok: false, reason: 'non-image' };
    const buf = Buffer.from(await r.arrayBuffer());
    if (buf.length < MIN_IMAGE_BYTES) return { ok: false, reason: 'too small' };
    const h = crypto.createHash('sha1').update(buf).digest('hex');
    if (existingHashes.has(h)) return { ok: false, reason: 'duplicate of canonical or prior alt' };
    fs.mkdirSync(path.dirname(destPath), { recursive: true });
    fs.writeFileSync(destPath, buf);
    existingHashes.add(h);
    return { ok: true, size: buf.length, hash: h };
  } catch (e) {
    return { ok: false, reason: e.message };
  }
}

// Limit concurrency
async function mapWithLimit(items, limit, fn) {
  const results = new Array(items.length);
  let idx = 0;
  const workers = Array.from({ length: limit }, async () => {
    while (true) {
      const i = idx++;
      if (i >= items.length) return;
      results[i] = await fn(items[i], i);
    }
  });
  await Promise.all(workers);
  return results;
}

// Build the work list
const targets = [];
cats.forEach(cat => {
  data[cat].models.forEach(m => {
    if (!m.image || !m.image.local || m.image.source !== 'best_buy') return;
    if (!m.image.source_url) return;
    const sku = extractBbSku(m.image.source_url);
    if (!sku) return;
    if (m.images && m.images.length > 1) return; // already galleried
    targets.push({ cat, id: m.id, sku, canonicalLocal: m.image.local, canonicalUrl: m.image.source_url });
  });
});
console.log(`Probing Best Buy alt views for ${targets.length} models...`);

let totalNew = 0;
let modelsWithAtLeastOne = 0;
const report = [];

await mapWithLimit(targets, CONCURRENCY, async (t) => {
  const existingHashes = new Set();
  const ch = canonicalHash(t.canonicalLocal);
  if (ch) existingHashes.add(ch);
  const found = [];
  for (let i = 1; i <= MAX_ALT_VIEWS; i++) {
    const url = bbAltViewUrl(t.sku, i);
    const filename = `${t.id}-s${i}.jpg`;
    const dest = path.join(root, 'public/data/images', t.cat, filename);
    const r = await probeAndSave(url, dest, existingHashes);
    if (r.ok) {
      found.push({ local: `images/${t.cat}/${filename}`, source_url: url, source: 'best_buy', view: 's' + i });
      totalNew++;
    }
  }
  if (found.length) {
    modelsWithAtLeastOne++;
    const m = data[t.cat].models.find(x => x.id === t.id);
    if (m) {
      const canonical = { local: m.image.local, source_url: m.image.source_url, source: m.image.source, view: 'primary' };
      m.images = [canonical, ...found];
    }
  }
  report.push({ ...t, added: found.length });
});

cats.forEach(c => fs.writeFileSync(path.join(root, 'public/data', c + '.json'), JSON.stringify(data[c], null, 2) + '\n'));
fs.writeFileSync(path.join(root, '.image-audit/gallery-report.json'), JSON.stringify(report, null, 2));

console.log(`\nDone. Added ${totalNew} alt-view images across ${modelsWithAtLeastOne} models.`);
console.log(`Report: .image-audit/gallery-report.json`);
