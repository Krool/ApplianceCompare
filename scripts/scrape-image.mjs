#!/usr/bin/env node
// Playwright-based image scraper for product pages whose CDNs are bot-protected
// (Akamai, Cloudflare, PerimeterX). Loads each page in real Chromium, reads
// og:image (or twitter:image / JSON-LD), then downloads via the same browser
// context so the image fetch inherits cookies + UA.
//
// Usage:
//   node scripts/scrape-image.mjs --batch path/to/batch.json
//   batch.json: [{ "category": "dishwashers", "id": "miele-g5051scvi",
//                  "url": "https://www.mieleusa.com/product/...", "source": "miele" }]
//
// Concurrency is 1 (sequential) — bot-protected sites flag parallel hits.

import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { Buffer } from 'node:buffer';
import { chromium as chromiumBase } from 'playwright-extra';
import StealthPlugin from 'puppeteer-extra-plugin-stealth';
import sharp from 'sharp';
const chromium = chromiumBase;
chromium.use(StealthPlugin());

// Resize to max 720px on the longest side, JPEG q82. Hero is rendered at 360x240
// in the UI, thumbs at 40-96px — 720px is comfortably enough for retina hero.
const MAX_DIM = 720;
async function resizeBuffer(buf, ct) {
  // Keep PNG transparency only when source is PNG with alpha; otherwise force JPEG.
  const meta = await sharp(buf).metadata();
  const needsAlpha = ct.includes('png') && meta.hasAlpha;
  let pipe = sharp(buf).resize({ width: MAX_DIM, height: MAX_DIM, fit: 'inside', withoutEnlargement: true });
  if (needsAlpha) {
    pipe = pipe.png({ compressionLevel: 9, palette: true });
    return { bytes: await pipe.toBuffer(), ext: 'png' };
  }
  // Flatten transparency onto white for JPEG conversion
  pipe = pipe.flatten({ background: '#ffffff' }).jpeg({ quality: 82, progressive: true, mozjpeg: true });
  return { bytes: await pipe.toBuffer(), ext: 'jpg' };
}

const VALID_CATEGORIES = ['dishwashers', 'refrigerators', 'ovens'];
const REPO_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const NAV_TIMEOUT = 30_000;
const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';

async function discoverImageUrl(page) {
  // Order: og:image → twitter:image → JSON-LD Product.image → first <img> whose
  // alt text matches the page <title> (filters out logos, energy labels, etc).
  return page.evaluate(() => {
    const isJunk = (u) => !u || /\.svg(\?|$)/i.test(u) || /logo|favicon|icon|placeholder/i.test(u);
    const meta = (sel) => document.querySelector(sel)?.content || null;
    const ogImg = meta('meta[property="og:image"]') || meta('meta[name="og:image"]');
    if (ogImg && !isJunk(ogImg)) return ogImg;
    const twImg = meta('meta[name="twitter:image"]') || meta('meta[property="twitter:image"]');
    if (twImg && !isJunk(twImg)) return twImg;
    const ldNodes = document.querySelectorAll('script[type="application/ld+json"]');
    for (const n of ldNodes) {
      try {
        const j = JSON.parse(n.textContent);
        const arr = j['@graph'] ? j['@graph'] : (Array.isArray(j) ? j : [j]);
        for (const item of arr) {
          if (!item) continue;
          const t = item['@type'];
          const isProduct = t === 'Product' || (Array.isArray(t) && t.includes('Product'));
          if (!isProduct) continue;
          if (typeof item.image === 'string') return item.image;
          if (Array.isArray(item.image) && item.image.length) return typeof item.image[0] === 'string' ? item.image[0] : item.image[0].url;
          if (item.image && typeof item.image.url === 'string') return item.image.url;
        }
      } catch {}
    }
    // Fallback A: first <img> whose alt text shares meaningful tokens with <title>.
    const title = (document.title || '').toLowerCase();
    const titleTokens = title.split(/[^a-z0-9]+/).filter(t => t.length >= 3);
    const pageHost = location.hostname;
    const imgs = Array.from(document.querySelectorAll('img'));
    const skipPattern = /logo|sprite|placeholder|energy.?label|flag|icon|menu|arrow|chevron|caret|spinner|loading|share|favicon|swatch/i;
    const skipExt = /\.svg(\?|$)/i;
    const isCandidate = (img) => {
      const alt = (img.alt || '').toLowerCase();
      const src = img.src || img.getAttribute('data-src') || '';
      if (!src.startsWith('http')) return null;
      if (skipPattern.test(src + ' ' + alt)) return null;
      if (skipExt.test(src)) return null;
      return { src, alt };
    };
    for (const img of imgs) {
      const c = isCandidate(img);
      if (!c) continue;
      const overlap = titleTokens.filter(t => c.alt.includes(t)).length;
      if (overlap >= 2) return c.src;
    }
    // Fallback B: prefer images on a different host whose URL looks like a
    // product asset (path contains /product or product code) and skip obvious
    // header/footer/banner art. Sort by natural area, take the largest.
    const productPathRe = /\/products?\//i;
    const headerPathRe = /\/(header|footer|banner|home|hero|nav|menu|popup|newsletter)\//i;
    const candidates = [];
    for (const img of imgs) {
      const c = isCandidate(img);
      if (!c) continue;
      try {
        const u = new URL(c.src);
        if (u.hostname === pageHost) continue;
        if (headerPathRe.test(u.pathname)) continue;
        const w = img.naturalWidth || img.width || 0;
        const h = img.naturalHeight || img.height || 0;
        if (w < 200) continue;
        const productScore = productPathRe.test(u.pathname) ? 1 : 0;
        candidates.push({ src: c.src, area: w * h, productScore });
      } catch {}
    }
    if (candidates.length) {
      // Within product-path images, prefer hero/primary shots over feature shots.
      // Heuristic: filenames matching "1-Product", "main", "primary", "hero" win.
      // Otherwise sort by area (largest first).
      const heroRe = /(^|\/)1[-_]product|main|primary|hero|pdp/i;
      candidates.sort((a, b) => {
        const aHero = heroRe.test(a.src) ? 1 : 0;
        const bHero = heroRe.test(b.src) ? 1 : 0;
        return (b.productScore - a.productScore) || (bHero - aHero) || (b.area - a.area);
      });
      return candidates[0].src;
    }
    return null;
  });
}

function extFromContentType(ct) {
  if (!ct) return 'jpg';
  if (ct.includes('png')) return 'png';
  if (ct.includes('webp')) return 'webp';
  return 'jpg';
}

async function processOne(context, item) {
  const { category, id, url, source } = item;
  if (!VALID_CATEGORIES.includes(category)) return { id, ok: false, error: `bad category ${category}` };

  const page = await context.newPage();
  try {
    const resp = await page.goto(url, { waitUntil: 'domcontentloaded', timeout: NAV_TIMEOUT });
    if (!resp || !resp.ok()) {
      return { id, ok: false, error: `page ${resp?.status() ?? 'no-resp'}` };
    }
    // Some sites lazy-render the product image (Dacor, Monogram). Scroll a bit
    // to trigger IntersectionObserver-based lazy loaders, then give it time.
    await page.evaluate(() => window.scrollTo(0, 600));
    await page.waitForTimeout(2500);
    await page.evaluate(() => window.scrollTo(0, 0));
    await page.waitForTimeout(500);
    let imgUrl = await discoverImageUrl(page);
    if (!imgUrl) return { id, ok: false, error: 'no og:image / product image found' };
    if (process.env.DEBUG_URL) console.log(`    [debug] ${id} -> ${imgUrl.slice(0,160)}`);
    if (imgUrl.startsWith('//')) imgUrl = 'https:' + imgUrl;
    if (imgUrl.startsWith('/')) {
      const u = new URL(url);
      imgUrl = u.origin + imgUrl;
    }
    // Try fetching as a navigation from the same page (inherits cookies + sets
    // Referer). Falls back to context.request if the page-level fetch fails.
    let imgResp;
    try {
      imgResp = await page.context().request.get(imgUrl, {
        headers: { Referer: page.url(), 'User-Agent': UA },
        timeout: NAV_TIMEOUT,
      });
    } catch (e) {
      return { id, ok: false, error: `img fetch threw: ${e.message}` };
    }
    if (!imgResp.ok()) {
      // Last-ditch: fetch via in-page fetch() so it runs from document origin.
      try {
        const fetched = await page.evaluate(async (u) => {
          const r = await fetch(u, { credentials: 'include' });
          if (!r.ok) return { ok: false, status: r.status };
          const ab = await r.arrayBuffer();
          return { ok: true, ct: r.headers.get('content-type') || '', b64: btoa(String.fromCharCode(...new Uint8Array(ab))) };
        }, imgUrl);
        if (!fetched.ok) return { id, ok: false, error: `img ${imgResp.status()} (page-fetch ${fetched.status})` };
        const buf = Buffer.from(fetched.b64, 'base64');
        const fakeResp = { ok: () => true, headers: () => ({ 'content-type': fetched.ct }), body: async () => buf };
        imgResp = fakeResp;
      } catch (e) {
        return { id, ok: false, error: `img ${imgResp.status()}` };
      }
    }
    const ct = imgResp.headers()['content-type'] || '';
    if (!ct.startsWith('image/')) return { id, ok: false, error: `not image (${ct})` };
    const rawBuf = await imgResp.body();
    const { bytes: buf, ext } = await resizeBuffer(rawBuf, ct);
    const localRel = `images/${category}/${id}.${ext}`;
    const localAbs = path.join(REPO_ROOT, 'public', 'data', localRel);
    await fs.mkdir(path.dirname(localAbs), { recursive: true });
    await fs.writeFile(localAbs, buf);
    return { id, ok: true, category, localRel, url: imgUrl, page_url: url, source: source || 'manufacturer', bytesLen: buf.length, originalLen: rawBuf.length };
  } catch (err) {
    return { id, ok: false, error: err.message };
  } finally {
    await page.close();
  }
}

async function patchCategoryJson(category, results) {
  const dataFile = path.join(REPO_ROOT, 'public', 'data', `${category}.json`);
  const json = JSON.parse(await fs.readFile(dataFile, 'utf8'));
  let patched = 0;
  for (const r of results) {
    if (!r.ok || r.category !== category) continue;
    const model = json.models.find(m => m.id === r.id);
    if (!model) continue;
    model.image = { local: r.localRel, source_url: r.page_url, source: r.source };
    patched++;
  }
  if (patched > 0) {
    json._meta.last_updated = new Date().toISOString().slice(0, 10);
    await fs.writeFile(dataFile, JSON.stringify(json, null, 2) + '\n');
  }
  return patched;
}

const args = process.argv.slice(2);
if (args[0] !== '--batch' || !args[1]) {
  console.error('Usage: node scripts/scrape-image.mjs --batch <batch.json>');
  process.exit(1);
}
const batch = JSON.parse(await fs.readFile(args[1], 'utf8'));
console.log(`Scraping ${batch.length} items via Playwright...`);

const browser = await chromium.launch({ headless: true });
const context = await browser.newContext({
  userAgent: UA,
  viewport: { width: 1280, height: 900 },
  locale: 'en-US',
  extraHTTPHeaders: { 'Accept-Language': 'en-US,en;q=0.9' },
});

const results = [];
for (const item of batch) {
  const r = await processOne(context, item);
  results.push(r);
  if (r.ok) console.log(`  ✓ ${r.id} (${(r.bytesLen / 1024).toFixed(0)} KB, was ${(r.originalLen / 1024).toFixed(0)})`);
  else console.log(`  ✗ ${r.id}: ${r.error}`);
}

await browser.close();

for (const cat of VALID_CATEGORIES) {
  const n = await patchCategoryJson(cat, results);
  if (n) console.log(`Patched ${n} entries in ${cat}.json`);
}
const ok = results.filter(r => r.ok).length;
console.log(`\nDone: ${ok}/${batch.length} succeeded`);
