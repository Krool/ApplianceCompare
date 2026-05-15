// Backfill galleries for Samsung models.
// Pattern: samsung.com product page contains images.samsung.com URLs
// referencing the model in the path. Many duplicates exist (different size
// query strings); dedup by stripping ?... and by asset ID at the path tail.
//
// Usage: node scripts/fetch-samsung-galleries.mjs [--limit N] [--ids ...] [--dry]

import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';

const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0 Safari/537.36';
const args = process.argv.slice(2);
const flag = (n) => args.includes(n);
const opt = (n, d) => { const i = args.indexOf(n); return i >= 0 ? args[i + 1] : d; };
const LIMIT = parseInt(opt('--limit', '99'), 10);
const ONLY_IDS = (opt('--ids', '') || '').split(',').filter(Boolean);
const DRY = flag('--dry');
const CATS = ['refrigerators', 'ovens', 'dishwashers'];

const targets = [];
for (const cat of CATS) {
  const dataPath = path.join('public/data', cat + '.json');
  const data = JSON.parse(fs.readFileSync(dataPath, 'utf8'));
  for (const m of data.models) {
    if (m.retired) continue;
    if (m.brand !== 'samsung' && !/^samsung-/i.test(m.id || '')) continue;
    if (Array.isArray(m.images) && m.images.length > 1) continue;
    if (ONLY_IDS.length && !ONLY_IDS.includes(m.id)) continue;
    const urls = (m.ratings && m.ratings.source_urls) || {};
    const mfg = urls.manufacturer || urls.specs;
    if (!mfg || !/samsung\.com/i.test(mfg)) continue;
    const modelNum = m.model_number || m.id.replace(/^samsung-/i, '').toUpperCase();
    targets.push({ id: m.id, cat, dataPath, modelNum, pageUrl: mfg });
    if (targets.length >= LIMIT) break;
  }
  if (targets.length >= LIMIT) break;
}
console.log('Processing ' + targets.length + ' Samsung models...\n');

const knownHashes = new Map();
for (const cat of CATS) {
  const dir = path.join('public/data/images', cat);
  if (!fs.existsSync(dir)) continue;
  for (const f of fs.readdirSync(dir)) {
    try { knownHashes.set(crypto.createHash('sha1').update(fs.readFileSync(path.join(dir, f))).digest('hex'), f); } catch {}
  }
}
console.log('Seeded ' + knownHashes.size + ' known image hashes\n');

const report = { ok: [], empty: [], err: [], skipped: [] };
const byCat = {};
for (const t of targets) (byCat[t.cat] ||= []).push(t);

for (const cat of Object.keys(byCat)) {
  const dataPath = path.join('public/data', cat + '.json');
  const data = JSON.parse(fs.readFileSync(dataPath, 'utf8'));
  let dirty = false;
  for (const t of byCat[cat]) {
    const model = data.models.find(m => m.id === t.id);
    if (!model) { report.skipped.push({ id: t.id, reason: 'not found' }); continue; }

    console.log('=== ' + t.id);
    let html = '';
    let finalUrl = '';
    try {
      const r = await fetch(t.pageUrl, { headers: { 'User-Agent': UA, Accept: 'text/html' }, redirect: 'follow' });
      finalUrl = r.url;
      console.log('  page ' + r.status + ' final=' + finalUrl);
      if (!r.ok) { report.empty.push({ id: t.id, reason: 'page ' + r.status }); continue; }
      html = await r.text();
    } catch (e) {
      console.log('  page err ' + e.message);
      report.err.push({ id: t.id, error: e.message });
      continue;
    }

    // Samsung product pages often redirect to a finish-specific SKU
    // (e.g. RF29BB8600AP → /sku-RF29BB8600QLAA/). The image URLs use that
    // longer SKU. Extract it from the final URL or HTML, otherwise fall
    // back to a model prefix match.
    const modelLower = t.modelNum.toLowerCase();
    const skuFromUrl = finalUrl.toLowerCase().match(/sku-([a-z0-9]+)/)?.[1];
    const skuFromCanonical = html.match(/<link[^>]+rel=["']canonical["'][^>]+href=["'][^"']*sku-([a-zA-Z0-9]+)/i)?.[1]?.toLowerCase();
    const prefix = (modelLower.match(/^([a-z]+\d+[a-z]+\d+)/) || [, modelLower.slice(0, 10)])[1];
    const matchKeys = [skuFromUrl, skuFromCanonical, modelLower, prefix].filter(Boolean);
    console.log('  match keys: ' + matchKeys.join(', '));

    const re = /https?:\/\/images\.samsung\.com\/[^"\s'()<>]+/gi;
    const all = new Set();
    let m;
    while ((m = re.exec(html)) !== null) all.add(m[0]);
    const modelMatch = [...all].filter(u => {
      const ul = u.toLowerCase();
      return matchKeys.some(k => ul.includes('/' + k + '/') || ul.includes('-' + k + '-') || ul.includes('-' + k + '.') || ul.includes('-' + k + '?'));
    });

    // Dedup: strip query strings (size variants), prefer the cleanest URL.
    // Samsung asset IDs at the path tail (e.g. "551019964") uniquely identify
    // the image; build a Map keyed by base URL (no query).
    const byBase = new Map();
    for (const u of modelMatch) {
      const base = u.split('?')[0];
      if (!byBase.has(base)) byBase.set(base, u);
    }
    // Strip size query, request a high-res variant
    const unique = [...byBase.values()].map(u => {
      const base = u.split('?')[0];
      // Some URLs reference `/is/content/...` (raw) vs `/is/image/...` (Scene7).
      // Prefer `/is/image/` form with a `wid=1200` query for consistent sizing.
      if (/\/is\/image\//.test(base)) return base + '?wid=1200&fmt=webp';
      return base + (base.includes('?') ? '&' : '?') + 'wid=1200&fmt=webp';
    });
    console.log('  unique URLs: ' + unique.length + ' (from ' + modelMatch.length + ' raw / ' + all.size + ' total)');

    const imgDir = path.join('public/data/images', cat);
    fs.mkdirSync(imgDir, { recursive: true });

    const canonical = model.image ? {
      local: model.image.local, source_url: model.image.source_url, source: model.image.source, view: 'primary'
    } : null;
    const downloaded = [];
    const seen = new Set();
    if (canonical) {
      const p = path.join('public/data', model.image.local);
      if (fs.existsSync(p)) seen.add(crypto.createHash('sha1').update(fs.readFileSync(p)).digest('hex'));
    }

    for (const url of unique) {
      if (downloaded.length >= 9) break;
      try {
        const r = await fetch(url, { headers: { 'User-Agent': UA, Referer: t.pageUrl }, redirect: 'follow' });
        if (!r.ok) { console.log('    skip ' + r.status + ' ' + url.slice(-60)); continue; }
        const buf = Buffer.from(await r.arrayBuffer());
        if (buf.length < 4096) { console.log('    skip tiny ' + buf.length + 'B'); continue; }
        const h = crypto.createHash('sha1').update(buf).digest('hex');
        if (seen.has(h)) { console.log('    skip dup-in-batch'); continue; }
        if (knownHashes.has(h)) { console.log('    skip dup-known(' + knownHashes.get(h) + ')'); continue; }
        seen.add(h);
        knownHashes.set(h, t.id + '-g?');
        const filename = `${t.id}-g${downloaded.length + 1}.webp`;
        if (!DRY) fs.writeFileSync(path.join(imgDir, filename), buf);
        downloaded.push({
          local: `images/${cat}/${filename}`,
          source_url: url,
          source: 'manufacturer',
          view: 'g' + (downloaded.length + 1),
        });
        console.log('    OK ' + Math.round(buf.length/1024) + 'KB ' + filename);
      } catch (e) {
        console.log('    err ' + e.message);
      }
    }

    if (downloaded.length > 0) {
      if (!DRY) {
        model.images = canonical ? [canonical, ...downloaded] : downloaded;
        model.last_updated = '2026-05-14';
        dirty = true;
      }
      report.ok.push({ id: t.id, added: downloaded.length });
    } else {
      report.empty.push({ id: t.id });
    }
  }
  if (dirty && !DRY) {
    fs.writeFileSync(dataPath, JSON.stringify(data, null, 2) + '\n');
    console.log('\n  wrote ' + dataPath + '\n');
  }
}

console.log('\n=== Summary');
console.log('  ok:      ' + report.ok.length);
console.log('  empty:   ' + report.empty.length);
console.log('  err:     ' + report.err.length);
fs.mkdirSync('.image-audit', { recursive: true });
fs.writeFileSync('.image-audit/samsung-gallery-report.json', JSON.stringify(report, null, 2));
