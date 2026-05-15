// Samsung gallery fetch v2: filter by image aspect ratio.
// Real product photos of fridges/ovens/dishwashers are portrait-oriented
// (taller than wide, ratio < 0.95). Samsung's marketing collateral —
// warranty badges, limited-time-offer banners, award seals — is square
// (1:1) or landscape (>1.0). Aspect-ratio filtering keeps the product
// photos and drops the promo trash.
//
// WebP dimensions are parsed from the file header (no external deps).
//
// Usage: node scripts/fetch-samsung-galleries-v2.mjs [--limit N] [--ids ...] [--dry]

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

// Samsung's CMS pads every gallery image to the same landscape canvas
// (1600x1200 or 1920x1280), so aspect ratio doesn't separate real product
// photography from marketing assets. What DOES separate them: compression
// density. A complex photograph of a fridge with varied textures and shadows
// is ~200-300 bytes per megapixel after PNG/WebP compression; a banner with
// text on a solid background or a vector-rendered warranty seal is 20-90
// bytes per megapixel. Threshold tuned from the v1 sample inspection.
const MIN_BYTES_PER_MP = 200_000;

// Parse image dimensions from PNG/JPEG/WebP headers. Samsung's ?fmt=webp
// query is ignored by their CDN — responses come back as PNG. We support
// all three to be safe.
function readImageDims(buf) {
  if (buf.length < 32) return null;
  // PNG: bytes 0-7 = 89 50 4E 47 0D 0A 1A 0A, IHDR at 8-15, width/height at 16-23 (big-endian)
  if (buf[0] === 0x89 && buf[1] === 0x50 && buf[2] === 0x4E && buf[3] === 0x47) {
    return { w: buf.readUInt32BE(16), h: buf.readUInt32BE(20), fmt: 'png' };
  }
  // JPEG: scan for SOFn markers (FFC0–FFC3, FFC5–FFC7, FFC9–FFCB, FFCD–FFCF)
  if (buf[0] === 0xFF && buf[1] === 0xD8) {
    let i = 2;
    while (i + 9 < buf.length) {
      if (buf[i] !== 0xFF) { i++; continue; }
      const marker = buf[i + 1];
      if (marker === 0xD9 || marker === 0xDA) break;
      const seg = buf.readUInt16BE(i + 2);
      // SOF markers
      if ((marker >= 0xC0 && marker <= 0xC3) || (marker >= 0xC5 && marker <= 0xC7) ||
          (marker >= 0xC9 && marker <= 0xCB) || (marker >= 0xCD && marker <= 0xCF)) {
        return { h: buf.readUInt16BE(i + 5), w: buf.readUInt16BE(i + 7), fmt: 'jpeg' };
      }
      i += 2 + seg;
    }
    return null;
  }
  // WebP: bytes 0-3 RIFF, bytes 8-11 WEBP
  if (buf.slice(0, 4).toString() === 'RIFF' && buf.slice(8, 12).toString() === 'WEBP') {
    const chunk = buf.slice(12, 16).toString();
    if (chunk === 'VP8X') {
      const w = (buf.readUInt32LE(24) & 0xFFFFFF) + 1;
      const h = (buf.readUInt32LE(27) & 0xFFFFFF) + 1;
      return { w, h, fmt: 'webp' };
    }
    if (chunk === 'VP8L') {
      const b1 = buf[21], b2 = buf[22], b3 = buf[23], b4 = buf[24];
      const w = ((b2 & 0x3F) << 8 | b1) + 1;
      const h = ((b4 & 0x0F) << 10 | b3 << 2 | (b2 & 0xC0) >> 6) + 1;
      return { w, h, fmt: 'webp' };
    }
    if (chunk === 'VP8 ') {
      const w = buf.readUInt16LE(26) & 0x3FFF;
      const h = buf.readUInt16LE(28) & 0x3FFF;
      return { w, h, fmt: 'webp' };
    }
  }
  return null;
}

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
console.log('Processing ' + targets.length + ' Samsung models (v2: aspect-ratio filter)...\n');

const knownHashes = new Map();
for (const cat of CATS) {
  const dir = path.join('public/data/images', cat);
  if (!fs.existsSync(dir)) continue;
  for (const f of fs.readdirSync(dir)) {
    try { knownHashes.set(crypto.createHash('sha1').update(fs.readFileSync(path.join(dir, f))).digest('hex'), f); } catch {}
  }
}

const report = { ok: [], empty: [], err: [], dimFilter: { kept: 0, dropped: 0 } };
const byCat = {};
for (const t of targets) (byCat[t.cat] ||= []).push(t);

for (const cat of Object.keys(byCat)) {
  const dataPath = path.join('public/data', cat + '.json');
  const data = JSON.parse(fs.readFileSync(dataPath, 'utf8'));
  let dirty = false;
  for (const t of byCat[cat]) {
    const model = data.models.find(m => m.id === t.id);
    if (!model) continue;
    console.log('=== ' + t.id);

    let html = '', finalUrl = '';
    try {
      const r = await fetch(t.pageUrl, { headers: { 'User-Agent': UA, Accept: 'text/html' }, redirect: 'follow' });
      finalUrl = r.url;
      if (!r.ok) { console.log('  page ' + r.status); report.empty.push({ id: t.id, reason: 'page ' + r.status }); continue; }
      html = await r.text();
    } catch (e) { console.log('  page err ' + e.message); report.err.push({ id: t.id, error: e.message }); continue; }

    const modelLower = t.modelNum.toLowerCase();
    const skuFromUrl = finalUrl.toLowerCase().match(/sku-([a-z0-9]+)/)?.[1];
    const skuFromCanonical = html.match(/<link[^>]+rel=["']canonical["'][^>]+href=["'][^"']*sku-([a-zA-Z0-9]+)/i)?.[1]?.toLowerCase();
    const prefix = (modelLower.match(/^([a-z]+\d+[a-z]+\d+)/) || [, modelLower.slice(0, 10)])[1];
    const matchKeys = [skuFromUrl, skuFromCanonical, modelLower, prefix].filter(Boolean);

    const re = /https?:\/\/images\.samsung\.com\/[^"\s'()<>]+/gi;
    const all = new Set();
    let m;
    while ((m = re.exec(html)) !== null) all.add(m[0]);
    const modelMatch = [...all].filter(u => {
      const ul = u.toLowerCase();
      return matchKeys.some(k => ul.includes('/' + k + '/') || ul.includes('-' + k + '-') || ul.includes('-' + k + '.') || ul.includes('-' + k + '?'));
    });
    const byBase = new Map();
    for (const u of modelMatch) {
      const base = u.split('?')[0];
      if (!byBase.has(base)) byBase.set(base, u);
    }
    const unique = [...byBase.values()].map(u => u.split('?')[0] + '?wid=1200&fmt=webp');

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

    let kept = 0, dropped = 0;
    for (const url of unique) {
      if (downloaded.length >= 9) break;
      try {
        const r = await fetch(url, { headers: { 'User-Agent': UA, Referer: t.pageUrl }, redirect: 'follow' });
        if (!r.ok) continue;
        const buf = Buffer.from(await r.arrayBuffer());
        if (buf.length < 4096) continue;
        const h = crypto.createHash('sha1').update(buf).digest('hex');
        if (seen.has(h) || knownHashes.has(h)) continue;

        const dims = readImageDims(buf);
        if (!dims) { console.log('    skip no-dims ' + url.slice(-50)); continue; }
        const megaPixels = (dims.w * dims.h) / 1e6;
        const bytesPerMP = Math.round(buf.length / megaPixels);
        if (bytesPerMP < MIN_BYTES_PER_MP) {
          dropped++;
          console.log(`    drop bpm=${bytesPerMP} ${dims.w}x${dims.h} ${url.slice(-50)}`);
          continue;
        }
        kept++;

        seen.add(h);
        knownHashes.set(h, t.id + '-g?');
        const ext = dims.fmt === 'png' ? 'png' : (dims.fmt === 'jpeg' ? 'jpg' : 'webp');
        const filename = `${t.id}-g${downloaded.length + 1}.${ext}`;
        if (!DRY) fs.writeFileSync(path.join(imgDir, filename), buf);
        downloaded.push({
          local: `images/${cat}/${filename}`,
          source_url: url,
          source: 'manufacturer',
          view: 'g' + (downloaded.length + 1),
        });
        console.log(`    OK bpm=${bytesPerMP} ${dims.w}x${dims.h} ${Math.round(buf.length/1024)}KB ${filename}`);
      } catch (e) {
        console.log('    err ' + e.message);
      }
    }
    report.dimFilter.kept += kept;
    report.dimFilter.dropped += dropped;

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
  if (dirty && !DRY) fs.writeFileSync(dataPath, JSON.stringify(data, null, 2) + '\n');
}

console.log('\n=== Summary');
console.log('  ok:     ' + report.ok.length);
console.log('  empty:  ' + report.empty.length);
console.log('  err:    ' + report.err.length);
console.log('  filter: kept=' + report.dimFilter.kept + ' dropped=' + report.dimFilter.dropped);
fs.mkdirSync('.image-audit', { recursive: true });
fs.writeFileSync('.image-audit/samsung-v2-report.json', JSON.stringify(report, null, 2));
