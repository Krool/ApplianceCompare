// Backfill galleries for Whirlpool Corp brands that expose a Scene7
// image-set asset (Whirlpool, Maytag). Pipeline:
//   product page -> data-asset path -> /is/image<asset>?req=set,json
//   -> parse JSONP set items -> download each as ?fmt=webp-alpha&wid=1200
//
// KitchenAid and JennAir use a different AEM path and the same image-set
// endpoint returns "Fvctx" error for them — they expose only a hero image,
// which is no improvement over the canonical we already have, so skip.
//
// Usage:
//   node scripts/fetch-wpl-galleries.mjs --brand whirlpool|maytag [--limit N] [--ids ...] [--dry]

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
const BRAND = opt('--brand', 'whirlpool');
const CATS = ['refrigerators', 'ovens', 'dishwashers'];

const BRAND_CFG = {
  whirlpool:  { host: 'www.whirlpool.com',  match: (m) => m.brand === 'whirlpool' || /^whirlpool-/i.test(m.id), idPrefix: /^whirlpool-/i },
  maytag:     { host: 'www.maytag.com',     match: (m) => m.brand === 'maytag' || /^maytag-/i.test(m.id), idPrefix: /^maytag-/i },
  kitchenaid: { host: 'www.kitchenaid.com', match: (m) => m.brand === 'kitchenaid' || /^kitchenaid-/i.test(m.id), idPrefix: /^kitchenaid-/i },
  jennair:    { host: 'www.jennair.com',    match: (m) => m.brand === 'jennair' || /^jennair-/i.test(m.id), idPrefix: /^jennair-/i },
  amana:      { host: 'www.amana.com',      match: (m) => m.brand === 'amana' || /^amana-/i.test(m.id), idPrefix: /^amana-/i },
};
const cfg = BRAND_CFG[BRAND];
if (!cfg) { console.error('Unknown brand: ' + BRAND); process.exit(1); }

const targets = [];
for (const cat of CATS) {
  const dataPath = path.join('public/data', cat + '.json');
  const data = JSON.parse(fs.readFileSync(dataPath, 'utf8'));
  for (const m of data.models) {
    if (m.retired) continue;
    if (!cfg.match(m)) continue;
    if (Array.isArray(m.images) && m.images.length > 1) continue;
    if (ONLY_IDS.length && !ONLY_IDS.includes(m.id)) continue;
    const urls = (m.ratings && m.ratings.source_urls) || {};
    const mfg = urls.manufacturer || urls.specs;
    if (!mfg || !new RegExp(cfg.host.replace('.', '\\.')).test(mfg)) continue;
    const modelNum = m.model_number || m.id.replace(cfg.idPrefix, '').toUpperCase();
    targets.push({ id: m.id, cat, dataPath, modelNum, pageUrl: mfg });
    if (targets.length >= LIMIT) break;
  }
  if (targets.length >= LIMIT) break;
}
console.log('Processing ' + targets.length + ' ' + BRAND + ' models...\n');

const knownHashes = new Map();
for (const cat of CATS) {
  const dir = path.join('public/data/images', cat);
  if (!fs.existsSync(dir)) continue;
  for (const f of fs.readdirSync(dir)) {
    try { knownHashes.set(crypto.createHash('sha1').update(fs.readFileSync(path.join(dir, f))).digest('hex'), f); } catch {}
  }
}
console.log('Seeded ' + knownHashes.size + ' known image hashes');

function parseSetJsonp(text) {
  // Body is "/*jsonp*/s7jsonResponse({...}, '');" — extract first JSON object
  const m = text.match(/s7jsonResponse\((\{[\s\S]*\})\s*,\s*["'][^"']*["']\)/);
  if (!m) return null;
  try { return JSON.parse(m[1]); } catch { return null; }
}

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

    console.log('\n=== ' + t.id);
    let html = '';
    try {
      const r = await fetch(t.pageUrl, { headers: { 'User-Agent': UA, Accept: 'text/html' }, redirect: 'follow' });
      console.log('  page status ' + r.status);
      if (!r.ok) { report.empty.push({ id: t.id, reason: 'page ' + r.status }); continue; }
      html = await r.text();
    } catch (e) {
      report.err.push({ id: t.id, error: e.message });
      console.log('  page err: ' + e.message);
      continue;
    }

    // Extract any asset reference to an image-set. Whirlpool/Maytag use
    // data-asset="...", KitchenAid uses asset="..."; both eventually
    // resolve to /content/dam/.../image-set/<model>.
    const assetMatches = [
      ...[...html.matchAll(/data-asset=["']([^"']+)["']/g)].map(m => m[1]),
      ...[...html.matchAll(/(?<!data-)asset=["']([^"']+)["']/g)].map(m => m[1]),
    ];
    const imageSetPath = assetMatches.find(a => /\/image-set\//i.test(a));
    if (!imageSetPath) {
      console.log('  no image-set data-asset found');
      report.empty.push({ id: t.id, reason: 'no image-set' });
      continue;
    }
    const setUrl = `https://${cfg.host}/is/image${imageSetPath}?req=set,json`;

    let setObj;
    try {
      const r = await fetch(setUrl, { headers: { 'User-Agent': UA, Referer: t.pageUrl } });
      const text = await r.text();
      setObj = parseSetJsonp(text);
    } catch (e) {
      console.log('  set err: ' + e.message);
      report.err.push({ id: t.id, error: 'set fetch ' + e.message });
      continue;
    }
    const items = setObj?.set?.item;
    if (!items || (Array.isArray(items) && items.length === 0)) {
      console.log('  set empty');
      report.empty.push({ id: t.id, reason: 'set empty' });
      continue;
    }
    const itemArr = Array.isArray(items) ? items : [items];
    console.log('  set items: ' + itemArr.length);

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

    for (const item of itemArr) {
      if (downloaded.length >= 9) break;
      const assetPath = item?.i?.n;
      if (!assetPath) continue;
      // Build a "large WebP" URL — Adobe Scene7 respects fmt=webp-alpha and wid
      const url = `https://${cfg.host}/is/image/${assetPath}?fmt=webp&wid=1200`;
      try {
        const r = await fetch(url, { headers: { 'User-Agent': UA, Referer: t.pageUrl } });
        if (!r.ok) { console.log('    skip ' + r.status + ' ' + assetPath); continue; }
        const buf = Buffer.from(await r.arrayBuffer());
        if (buf.length < 4096) { console.log('    skip tiny ' + buf.length + 'B ' + assetPath); continue; }
        const h = crypto.createHash('sha1').update(buf).digest('hex');
        if (seen.has(h)) { console.log('    skip dup-in-batch ' + assetPath); continue; }
        if (knownHashes.has(h)) { console.log('    skip dup-known(' + knownHashes.get(h) + ') ' + assetPath); continue; }
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
      report.empty.push({ id: t.id, reason: 'no images after filter' });
    }
  }
  if (dirty && !DRY) {
    fs.writeFileSync(dataPath, JSON.stringify(data, null, 2) + '\n');
    console.log('\n  wrote ' + dataPath);
  }
}

console.log('\n=== Summary');
console.log('  ok:      ' + report.ok.length);
console.log('  empty:   ' + report.empty.length);
console.log('  err:     ' + report.err.length);
fs.mkdirSync('.image-audit', { recursive: true });
fs.writeFileSync('.image-audit/' + BRAND + '-gallery-report.json', JSON.stringify(report, null, 2));
