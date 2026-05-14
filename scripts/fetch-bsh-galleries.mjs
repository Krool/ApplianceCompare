// Backfill multi-image galleries for BSH Group brands (Bosch + Thermador).
// Both serve product photos from media*.bsh-group.com via JSON-LD on their
// brand sites (bosch-home.com / thermador.com).
//
// Usage:
//   node scripts/fetch-bsh-galleries.mjs --brand bosch|thermador [--limit N] [--ids id1,id2,...] [--dry]

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
const BRAND = opt('--brand', 'bosch');
const CATS = ['refrigerators', 'ovens', 'dishwashers'];

const BRAND_CONFIGS = {
  bosch: {
    matches: (m) => m.brand === 'bosch' || m.brand_id === 'bosch' || /^bosch-(?:benchmark-)?/i.test(m.id || ''),
    fallbackUrl: (modelNum) => 'https://www.bosch-home.com/us/en/product/' + modelNum,
    mfgPattern: /bosch-home\.com/i,
    idPrefix: /^bosch-(?:benchmark-)?/i,
  },
  thermador: {
    matches: (m) => m.brand === 'thermador' || m.brand_id === 'thermador' || /^thermador-/i.test(m.id || ''),
    fallbackUrl: (modelNum) => 'https://www.thermador.com/us/en/mkt-product/' + modelNum,
    mfgPattern: /thermador\.com/i,
    idPrefix: /^thermador-/i,
  },
};
const cfg = BRAND_CONFIGS[BRAND];
if (!cfg) { console.error('Unknown brand: ' + BRAND); process.exit(1); }

const targets = [];
for (const cat of CATS) {
  const dataPath = path.join('public/data', cat + '.json');
  const data = JSON.parse(fs.readFileSync(dataPath, 'utf8'));
  for (const m of data.models) {
    if (m.retired) continue;
    if (!cfg.matches(m)) continue;
    if (Array.isArray(m.images) && m.images.length > 1) continue;
    if (ONLY_IDS.length && !ONLY_IDS.includes(m.id)) continue;
    const urls = (m.ratings && m.ratings.source_urls) || {};
    const mfg = urls.manufacturer || urls.specs || null;
    const modelNum = m.model_number || m.id.replace(cfg.idPrefix, '').toUpperCase();
    const candidateUrls = [];
    if (mfg && cfg.mfgPattern.test(mfg)) candidateUrls.push(mfg);
    candidateUrls.push(cfg.fallbackUrl(modelNum));
    targets.push({ id: m.id, cat, dataPath, modelNum, candidateUrls });
    if (targets.length >= LIMIT) break;
  }
  if (targets.length >= LIMIT) break;
}

console.log('Processing ' + targets.length + ' ' + BRAND + ' models...\n');

const knownHashes = new Map();
const seedDir = 'public/data/images';
for (const cat of CATS) {
  const dir = path.join(seedDir, cat);
  if (!fs.existsSync(dir)) continue;
  for (const f of fs.readdirSync(dir)) {
    try {
      const h = crypto.createHash('sha1').update(fs.readFileSync(path.join(dir, f))).digest('hex');
      if (!knownHashes.has(h)) knownHashes.set(h, f);
    } catch {}
  }
}
console.log('Seeded ' + knownHashes.size + ' known image hashes');

async function fetchProductImages(url) {
  const r = await fetch(url, { headers: { 'User-Agent': UA, Accept: 'text/html' }, redirect: 'follow' });
  if (!r.ok) return { ok: false, status: r.status, urls: [] };
  const html = await r.text();
  const urls = new Set();
  for (const re of [
    /<meta[^>]+property=["']og:image[^"']*["'][^>]+content=["']([^"']+)["']/gi,
    /<meta[^>]+name=["']twitter:image[^"']*["'][^>]+content=["']([^"']+)["']/gi,
  ]) {
    let m; while ((m = re.exec(html)) !== null) urls.add(m[1]);
  }
  const ldRe = /<script[^>]+type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi;
  let mm;
  while ((mm = ldRe.exec(html)) !== null) {
    try {
      const obj = JSON.parse(mm[1]);
      const visit = (o) => {
        if (!o) return;
        if (Array.isArray(o)) { o.forEach(visit); return; }
        if (typeof o === 'object') {
          if (o.image) {
            if (Array.isArray(o.image)) o.image.forEach(s => typeof s === 'string' && urls.add(s));
            else if (typeof o.image === 'string') urls.add(o.image);
            else if (o.image.url) urls.add(o.image.url);
          }
          for (const v of Object.values(o)) visit(v);
        }
      };
      visit(obj);
    } catch {}
  }
  // Both Bosch and Thermador serve product photos from media*.bsh-group.com
  // under /Product_Shots/. Filter out Line_Drawings (schematic technical
  // drawings — useful for buyers but visually less appealing in a gallery).
  const filtered = [...urls].filter(u =>
    /media[0-9]*\.bsh-group\.com\/Product_Shots\//i.test(u) && /\.(webp|jpg|jpeg|png)$/i.test(u)
  );
  return { ok: true, status: r.status, urls: filtered, raw: urls.size };
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
    let candidateUrls = [];
    let usedPage = null;
    for (const pageUrl of t.candidateUrls) {
      console.log('  page: ' + pageUrl);
      try {
        const res = await fetchProductImages(pageUrl);
        console.log('    status=' + res.status + ' raw=' + (res.raw || 0) + ' bsh=' + res.urls.length);
        if (res.urls.length > 0) { candidateUrls = res.urls; usedPage = pageUrl; break; }
      } catch (e) {
        console.log('    err ' + e.message);
      }
    }
    if (candidateUrls.length === 0) {
      report.empty.push({ id: t.id });
      continue;
    }

    const byRoot = new Map();
    for (const u of candidateUrls) {
      const root = u.replace(/\.(webp|png|jpg|jpeg)(\?.*)?$/i, '').replace(/^https?:/, '');
      if (!byRoot.has(root)) byRoot.set(root, u);
      else if (/\.webp/i.test(u) && !/\.webp/i.test(byRoot.get(root))) byRoot.set(root, u);
    }
    const uniqueUrls = [...byRoot.values()];

    const imgDir = path.join('public/data/images', cat);
    fs.mkdirSync(imgDir, { recursive: true });

    const canonical = model.image ? {
      local: model.image.local, source_url: model.image.source_url, source: model.image.source, view: 'primary'
    } : null;
    const downloaded = [];
    const seen = new Set();
    if (canonical) {
      const p = path.join('public/data', model.image.local);
      if (fs.existsSync(p)) {
        seen.add(crypto.createHash('sha1').update(fs.readFileSync(p)).digest('hex'));
      }
    }

    for (const url of uniqueUrls) {
      if (downloaded.length >= 9) break;
      try {
        const r = await fetch(url, { headers: { 'User-Agent': UA }, redirect: 'follow' });
        if (!r.ok) { console.log('    skip ' + r.status + ' ' + url.slice(-50)); continue; }
        const buf = Buffer.from(await r.arrayBuffer());
        if (buf.length < 4096) { console.log('    skip tiny ' + buf.length + 'B'); continue; }
        const h = crypto.createHash('sha1').update(buf).digest('hex');
        if (seen.has(h)) { console.log('    skip dup-in-batch ' + url.slice(-50)); continue; }
        if (knownHashes.has(h)) { console.log('    skip dup-known(' + knownHashes.get(h) + ') ' + url.slice(-50)); continue; }
        seen.add(h);
        knownHashes.set(h, t.id + '-g?');
        const ext = (url.match(/\.(webp|jpg|jpeg|png)$/i) || [,'webp'])[1].toLowerCase();
        const filename = `${t.id}-g${downloaded.length + 1}.${ext}`;
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
      report.ok.push({ id: t.id, added: downloaded.length, page: usedPage });
    } else {
      report.empty.push({ id: t.id, reason: 'all-dup-or-error' });
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
console.log('  skipped: ' + report.skipped.length);
fs.mkdirSync('.image-audit', { recursive: true });
fs.writeFileSync('.image-audit/' + BRAND + '-gallery-report.json', JSON.stringify(report, null, 2));
