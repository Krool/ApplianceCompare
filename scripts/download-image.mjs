#!/usr/bin/env node
// Download a product image into public/data/images/<category>/<model-id>.<ext>
// and patch the matching model's `image` field in the JSON file.
//
// Single mode:
//   node scripts/download-image.mjs <category> <model-id> <url> [source]
//
// Batch mode (parallel, one JSON load+save per category):
//   node scripts/download-image.mjs --batch path/to/batch.json
//   batch.json: [{ "category": "dishwashers", "id": "bosch-shp78cm5n",
//                  "url": "https://...", "source": "best_buy" }, ...]
//
// The page CSP allows only same-origin images, so this is the *only*
// supported way to add an image. Run from the repo root.

import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { Buffer } from 'node:buffer';

const VALID_CATEGORIES = ['dishwashers', 'refrigerators', 'ovens'];
const REPO_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

// Pull a single image; return { ok, bytesLen, ext, error }. Never throws.
async function fetchImage(url) {
  try {
    const res = await fetch(url, {
      headers: { 'User-Agent': 'Mozilla/5.0 (Chefs-Choice/data-pipeline)' },
      redirect: 'follow',
    });
    if (!res.ok) return { ok: false, error: `HTTP ${res.status}` };
    const ct = res.headers.get('content-type') || '';
    if (!ct.startsWith('image/')) return { ok: false, error: `not an image (${ct})` };
    const ext = ct.includes('png') ? 'png' : ct.includes('webp') ? 'webp' : 'jpg';
    const bytes = Buffer.from(await res.arrayBuffer());
    return { ok: true, bytes, ext };
  } catch (err) {
    return { ok: false, error: err.message };
  }
}

async function processOne(item) {
  const { category, id, url, source } = item;
  if (!VALID_CATEGORIES.includes(category)) {
    return { id, ok: false, error: `bad category ${category}` };
  }
  const r = await fetchImage(url);
  if (!r.ok) return { id, ok: false, error: r.error };
  const localRel = `images/${category}/${id}.${r.ext}`;
  const localAbs = path.join(REPO_ROOT, 'public', 'data', localRel);
  await fs.mkdir(path.dirname(localAbs), { recursive: true });
  await fs.writeFile(localAbs, r.bytes);
  const inferredSource = source
    || (/bbystatic\.com/i.test(url) ? 'best_buy' : 'manufacturer');
  return { id, ok: true, category, localRel, url, inferredSource, bytesLen: r.bytes.length };
}

async function patchCategoryJson(category, results) {
  const dataFile = path.join(REPO_ROOT, 'public', 'data', `${category}.json`);
  const json = JSON.parse(await fs.readFile(dataFile, 'utf8'));
  let patched = 0;
  for (const r of results) {
    if (!r.ok || r.category !== category) continue;
    const model = json.models.find(m => m.id === r.id);
    if (!model) continue;
    model.image = { local: r.localRel, source_url: r.url, source: r.inferredSource };
    patched++;
  }
  if (patched > 0) {
    json._meta.last_updated = new Date().toISOString().slice(0, 10);
    await fs.writeFile(dataFile, JSON.stringify(json, null, 2) + '\n');
  }
  return patched;
}

const args = process.argv.slice(2);

if (args[0] === '--batch') {
  const batchFile = args[1];
  if (!batchFile) {
    console.error('Usage: node scripts/download-image.mjs --batch <batch.json>');
    process.exit(1);
  }
  const batch = JSON.parse(await fs.readFile(batchFile, 'utf8'));
  console.log(`Processing ${batch.length} items...`);
  // Bounded concurrency (8) so we don't hammer the CDN
  const POOL = 8;
  const results = [];
  for (let i = 0; i < batch.length; i += POOL) {
    const chunk = batch.slice(i, i + POOL);
    const out = await Promise.all(chunk.map(processOne));
    results.push(...out);
    out.forEach(r => {
      if (r.ok) console.log(`  ✓ ${r.id} (${(r.bytesLen / 1024).toFixed(0)} KB)`);
      else console.log(`  ✗ ${r.id}: ${r.error}`);
    });
  }
  for (const cat of VALID_CATEGORIES) {
    const n = await patchCategoryJson(cat, results);
    if (n) console.log(`Patched ${n} entries in ${cat}.json`);
  }
  const okCount = results.filter(r => r.ok).length;
  console.log(`\nDone: ${okCount}/${batch.length} succeeded`);
  process.exit(0);
}

// Single mode (original CLI shape)
const [categoryArg, modelId, url, sourceArg] = args;
if (!categoryArg || !modelId || !url) {
  console.error('Usage:\n  node scripts/download-image.mjs <category> <model-id> <url> [source]\n  node scripts/download-image.mjs --batch <batch.json>');
  process.exit(1);
}
const result = await processOne({ category: categoryArg, id: modelId, url, source: sourceArg });
if (!result.ok) {
  console.error(`✗ ${result.error}`);
  process.exit(1);
}
console.log(`Saved ${result.localRel} (${(result.bytesLen / 1024).toFixed(1)} KB)`);
const n = await patchCategoryJson(categoryArg, [result]);
console.log(`Patched ${n} entry in ${categoryArg}.json`);
