// Backfill galleries for Fisher & Paykel models.
// Pattern: fisherpaykel.com product page → dam.fisherpaykel.com asset URLs
// referenced inline in HTML. Filter to .jpg/.png/.webp containing the model
// number (or close variant) to skip PDFs, CAD files, and accessory shots.
//
// Usage: node scripts/fetch-fp-galleries.mjs [--limit N] [--ids ...] [--dry]

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
    const isFP = m.brand === 'fisher-paykel' || /^(fp|fisher-paykel)-/i.test(m.id || '');
    if (!isFP) continue;
    if (Array.isArray(m.images) && m.images.length > 1) continue;
    if (ONLY_IDS.length && !ONLY_IDS.includes(m.id)) continue;
    const urls = (m.ratings && m.ratings.source_urls) || {};
    const mfg = urls.manufacturer || urls.specs;
    if (!mfg || !/fisherpaykel\.com/i.test(mfg)) continue;
    const modelNum = m.model_number || m.id.replace(/^(?:fp-|fisher-paykel-)/i, '').toUpperCase();
    targets.push({ id: m.id, cat, dataPath, modelNum, pageUrl: mfg });
    if (targets.length >= LIMIT) break;
  }
  if (targets.length >= LIMIT) break;
}
console.log('Processing ' + targets.length + ' Fisher & Paykel models...\n');

const knownHashes = new Map();
for (const cat of CATS) {
  const dir = path.join('public/data/images', cat);
  if (!fs.existsSync(dir)) continue;
  for (const f of fs.readdirSync(dir)) {
    try {
      const h = crypto.createHash('sha1').update(fs.readFileSync(path.join(dir, f))).digest('hex');
      if (!knownHashes.has(h)) knownHashes.set(h, f);
    } catch {}
  }
}
console.log('Seeded ' + knownHashes.size + ' known image hashes');

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
    console.log('  page: ' + t.pageUrl);
    let html = '';
    try {
      const r = await fetch(t.pageUrl, { headers: { 'User-Agent': UA, Accept: 'text/html' }, redirect: 'follow' });
      console.log('    status ' + r.status);
      if (!r.ok) { report.empty.push({ id: t.id, reason: 'page ' + r.status }); continue; }
      html = await r.text();
    } catch (e) {
      console.log('    err ' + e.message);
      report.err.push({ id: t.id, error: e.message });
      continue;
    }

    // Extract all dam.fisherpaykel.com URLs from HTML
    const damRe = /https?:\/\/dam\.fisherpaykel\.com\/[^"'\s)]+/gi;
    const found = new Set();
    let m;
    while ((m = damRe.exec(html)) !== null) found.add(m[0]);

    // Filter to product images: extension is jpg/png/webp, URL contains model
    // number (loosely — allow case-insensitive substring match).
    const modelUpper = t.modelNum.toUpperCase();
    const candidates = [...found].filter(u => {
      const base = u.split('?')[0];
      if (!/\.(jpg|jpeg|png|webp)$/i.test(base)) return false;
      return base.toUpperCase().includes(modelUpper);
    });
    console.log('    candidates: ' + candidates.length + ' / ' + found.size + ' total dam URLs');

    // De-dup by base path (strip query)
    const byBase = new Map();
    for (const u of candidates) {
      const base = u.split('?')[0];
      if (!byBase.has(base)) byBase.set(base, u);
    }
    // Prefer high-res by removing height/width constraints
    const unique = [...byBase.values()].map(u => u.replace(/[?&](height|width|hei|wid)=\d+/g, '').replace(/[?&]$/, '').replace(/\?&/, '?'));

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
        const r = await fetch(url, { headers: { 'User-Agent': UA }, redirect: 'follow' });
        if (!r.ok) { console.log('    skip ' + r.status + ' ' + url.slice(-60)); continue; }
        const buf = Buffer.from(await r.arrayBuffer());
        if (buf.length < 4096) { console.log('    skip tiny ' + buf.length + 'B'); continue; }
        const h = crypto.createHash('sha1').update(buf).digest('hex');
        if (seen.has(h)) { console.log('    skip dup-in-batch ' + url.slice(-60)); continue; }
        if (knownHashes.has(h)) { console.log('    skip dup-known(' + knownHashes.get(h) + ') ' + url.slice(-60)); continue; }
        seen.add(h);
        knownHashes.set(h, t.id + '-g?');
        const ext = (url.match(/\.(webp|jpg|jpeg|png)/i) || [,'jpg'])[1].toLowerCase();
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
fs.writeFileSync('.image-audit/fp-gallery-report.json', JSON.stringify(report, null, 2));
