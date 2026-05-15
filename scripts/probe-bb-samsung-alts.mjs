// Probe Best Buy alt-view images for Samsung models. The earlier audit
// found alt views (sN.jpg suffix) returned a placeholder PNG for many
// products — but maybe Samsung specifically has them populated.
//
// Strategy: for each Samsung SKU we have a canonical image URL for,
// try the _s2, _s3, etc. suffixes and check the response (real photo
// vs the 16KB "Image Unavailable" placeholder PNG).

import fs from 'node:fs';
import crypto from 'node:crypto';

const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0 Safari/537.36';
const out = [];

// Known BB "Image Unavailable" placeholder hash (need to verify)
const PLACEHOLDER_BYTES_MIN = 4096;
const PLACEHOLDER_BYTES_MAX = 25000; // The placeholder is ~16KB

const samples = [
  { id: 'samsung-rf29bb8600ap', canonical: 'https://pisces.bbystatic.com/image2/BestBuy_US/images/products/6493/6493490_sd.jpg' },
  { id: 'samsung-rf23bb8200qlaa', canonical: null }, // try synthesizing from SKU lookup later
];

// First, get the placeholder hash by fetching a known-fake URL
async function getPlaceholderHash() {
  // Use a clearly invalid SKU range
  const r = await fetch('https://pisces.bbystatic.com/image2/BestBuy_US/images/products/9999/9999999_s2.jpg', { headers: { 'User-Agent': UA } });
  if (!r.ok) return null;
  const buf = Buffer.from(await r.arrayBuffer());
  return { hash: crypto.createHash('sha1').update(buf).digest('hex'), size: buf.length };
}

const placeholder = await getPlaceholderHash();
out.push('placeholder fingerprint: ' + (placeholder ? `hash=${placeholder.hash.slice(0,12)} size=${placeholder.size}` : 'none'));

for (const t of samples) {
  if (!t.canonical) continue;
  out.push('\n=== ' + t.id);
  // Extract SKU and prefix from canonical URL
  const m = t.canonical.match(/products\/(\d{4})\/(\d{7,8})_sd\.jpg/);
  if (!m) { out.push('  bad URL'); continue; }
  const [, prefix, sku] = m;
  out.push('  prefix=' + prefix + ' sku=' + sku);
  // Try s2..s10
  const realHashes = new Set();
  for (let i = 2; i <= 10; i++) {
    const url = `https://pisces.bbystatic.com/image2/BestBuy_US/images/products/${prefix}/${sku}_s${i}.jpg`;
    const r = await fetch(url, { headers: { 'User-Agent': UA } });
    if (!r.ok) { out.push('  s' + i + ': HTTP ' + r.status); continue; }
    const buf = Buffer.from(await r.arrayBuffer());
    const h = crypto.createHash('sha1').update(buf).digest('hex');
    const isPlace = placeholder && h === placeholder.hash;
    realHashes.add(h);
    out.push('  s' + i + ': ' + buf.length + 'B' + (isPlace ? ' [PLACEHOLDER]' : ' [REAL]'));
  }
}

fs.writeFileSync('.image-audit/bb-samsung-probe.txt', out.join('\n'));
