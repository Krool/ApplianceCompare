// One-off image fetcher. Reads .image-audit/holes-with-urls.json and tries
// to recover a product image from candidate URLs. Saves to disk and updates
// the corresponding JSON file. Idempotent — skips entries that already have
// a local image.

import fs from 'node:fs';
import path from 'node:path';

const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0 Safari/537.36';
const TIMEOUT_MS = 12000;
const MIN_IMAGE_BYTES = 4096; // smaller than this is almost certainly a broken or logo asset

const root = process.cwd();
const cats = ['refrigerators', 'ovens', 'dishwashers'];

// Load all data once
const data = Object.fromEntries(cats.map(c => [c, JSON.parse(fs.readFileSync(path.join(root, 'public/data', c + '.json'), 'utf8'))]));

function saveCat(cat) {
  fs.writeFileSync(path.join(root, 'public/data', cat + '.json'), JSON.stringify(data[cat], null, 2) + '\n');
}

async function fetchWithTimeout(url, opts = {}) {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), TIMEOUT_MS);
  try {
    return await fetch(url, { ...opts, signal: ctrl.signal, headers: { 'User-Agent': UA, ...(opts.headers || {}) }, redirect: 'follow' });
  } finally { clearTimeout(t); }
}

function isImageContentType(ct) {
  return ct && /^image\/(jpeg|jpg|png|webp)/i.test(ct);
}

async function downloadImage(url, destPath) {
  try {
    const r = await fetchWithTimeout(url);
    if (!r.ok) return { ok: false, reason: 'HTTP ' + r.status };
    const ct = r.headers.get('content-type');
    if (!isImageContentType(ct)) return { ok: false, reason: 'non-image content-type: ' + ct };
    const buf = Buffer.from(await r.arrayBuffer());
    if (buf.length < MIN_IMAGE_BYTES) return { ok: false, reason: 'too small (' + buf.length + ' bytes)' };
    fs.mkdirSync(path.dirname(destPath), { recursive: true });
    fs.writeFileSync(destPath, buf);
    return { ok: true, size: buf.length, contentType: ct, finalUrl: r.url };
  } catch (e) {
    return { ok: false, reason: e.message };
  }
}

// Best Buy product page URL → image URL
function bestBuyImageUrl(productUrl) {
  // Match a trailing SKU number (7 digits)
  const m = productUrl.match(/\/(\d{7,8})(?:[\/?#]|$)/);
  if (!m) return null;
  const sku = m[1];
  const prefix = sku.slice(0, 4);
  return `https://pisces.bbystatic.com/image2/BestBuy_US/images/products/${prefix}/${sku}_sd.jpg`;
}

// Extract og:image / twitter:image / first product JPG from an HTML page
async function extractImageFromPage(pageUrl) {
  try {
    const r = await fetchWithTimeout(pageUrl, { headers: { Accept: 'text/html' } });
    if (!r.ok) return { ok: false, reason: 'HTTP ' + r.status + ' on page' };
    const html = await r.text();
    const candidates = [];
    // og:image / twitter:image (both quote orderings)
    const metaPatterns = [
      /<meta[^>]+property=["']og:image["'][^>]+content=["']([^"']+)["']/i,
      /<meta[^>]+content=["']([^"']+)["'][^>]+property=["']og:image["']/i,
      /<meta[^>]+name=["']twitter:image["'][^>]+content=["']([^"']+)["']/i,
      /<meta[^>]+content=["']([^"']+)["'][^>]+name=["']twitter:image["']/i,
    ];
    for (const pat of metaPatterns) {
      const m = html.match(pat);
      if (m && m[1]) candidates.push(m[1]);
    }
    if (!candidates.length) return { ok: false, reason: 'no og:image / twitter:image in page' };
    // Resolve relative URLs
    const abs = candidates.map(u => {
      try { return new URL(u, pageUrl).href; } catch { return null; }
    }).filter(Boolean);
    return { ok: true, candidates: abs };
  } catch (e) {
    return { ok: false, reason: 'page fetch: ' + e.message };
  }
}

async function tryFillForModel(entry) {
  const { cat, id, urls } = entry;
  const dest = path.join(root, 'public/data/images', cat, id + '.jpg');
  if (fs.existsSync(dest)) return { ok: true, source: 'existing', skipped: true };

  const tried = [];

  // Strategy 1: Best Buy retail URL → derive direct image URL
  for (const u of urls.filter(u => u.type === 'best_buy_retail')) {
    const imgUrl = bestBuyImageUrl(u.url);
    if (!imgUrl) { tried.push({ url: u.url, reason: 'no SKU extracted' }); continue; }
    const dl = await downloadImage(imgUrl, dest);
    tried.push({ url: imgUrl, ok: dl.ok, reason: dl.reason });
    if (dl.ok) return { ok: true, source: 'best_buy', source_url: imgUrl, size: dl.size, tried };
  }

  // Strategy 2: manufacturer / reviewed page → og:image
  for (const u of urls.filter(u => u.type === 'manufacturer' || u.type === 'reviewed' || u.type === 'home_depot' || u.type === 'cr')) {
    const ext = await extractImageFromPage(u.url);
    if (!ext.ok) { tried.push({ url: u.url, reason: ext.reason }); continue; }
    for (const c of ext.candidates) {
      const dl = await downloadImage(c, dest);
      tried.push({ url: c, ok: dl.ok, reason: dl.reason });
      if (dl.ok) return { ok: true, source: u.type, source_url: c, size: dl.size, tried };
    }
  }

  return { ok: false, tried };
}

function updateModel(cat, id, source_url, source) {
  const m = data[cat].models.find(x => x.id === id);
  if (!m) return false;
  m.image = {
    local: `images/${cat}/${id}.jpg`,
    source_url,
    source,
  };
  if (!m._meta) m._meta = {};
  m.last_updated = '2026-05-14';
  return true;
}

const holes = JSON.parse(fs.readFileSync(path.join(root, '.image-audit/holes-with-urls.json'), 'utf8'));
const withUrls = holes.filter(h => h.urls.length > 0);
console.log('Attempting ' + withUrls.length + ' entries that have candidate URLs...');

const report = [];
let succeeded = 0;
for (const h of withUrls) {
  const r = await tryFillForModel(h);
  if (r.ok && !r.skipped) {
    updateModel(h.cat, h.id, r.source_url, r.source);
    succeeded++;
    console.log('OK   ' + h.cat + '/' + h.id + '  (' + r.source + ', ' + Math.round(r.size/1024) + 'KB)');
  } else if (r.skipped) {
    console.log('SKIP ' + h.cat + '/' + h.id + '  (already has image)');
  } else {
    console.log('MISS ' + h.cat + '/' + h.id + '  tried ' + r.tried.length + ' urls');
  }
  report.push({ ...h, result: r });
}

// Save all updated category files at once
cats.forEach(saveCat);
fs.writeFileSync(path.join(root, '.image-audit/fetch-report.json'), JSON.stringify(report, null, 2));
console.log('\nSucceeded ' + succeeded + ' / ' + withUrls.length);
console.log('Report: .image-audit/fetch-report.json');
