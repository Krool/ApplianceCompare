// Deep dive: look for SPA hydration data in LG, GE, Samsung product pages
// that might expose multi-image gallery URLs even though server-rendered
// HTML only shows the hero image.

import fs from 'node:fs';

const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0 Safari/537.36';
const out = [];
function log(...a) { out.push(a.join(' ')); }

const targets = [
  { brand: 'lg', url: 'https://www.lg.com/us/refrigerators/lg-lrfxc2606s-french-3-door-refrigerator', model: 'LRFXC2606S', hostHint: 'media.us.lg.com' },
  { brand: 'ge', url: 'https://www.geappliances.com/appliance/GE-ENERGY-STAR-27-0-Cu-Ft-Fingerprint-Resistant-French-Door-Refrigerator-GNE27JYMFS', model: 'GNE27JYMFS', hostHint: 'cdn11.bigcommerce.com' },
  { brand: 'samsung', url: 'https://www.samsung.com/us/home-appliances/refrigerators/bespoke/bespoke-4-door-french-door-refrigerator-29-cu-ft-with-beverage-center-in-stainless-steel-rf29bb8600qlaa/', model: 'RF29BB8600QLAA', hostHint: 'images.samsung.com' },
];

for (const t of targets) {
  log('\n=== ' + t.brand + ' (' + t.model + ')');
  try {
    const r = await fetch(t.url, { headers: { 'User-Agent': UA, Accept: 'text/html' }, redirect: 'follow' });
    log('  status ' + r.status);
    if (!r.ok) continue;
    const html = await r.text();
    log('  html len: ' + html.length);

    // Try to find every URL referencing the brand's image CDN
    const cdnRe = new RegExp('https?://[^"\\s\'()<>]*' + t.hostHint.replace(/\./g, '\\.') + '[^"\\s\'()<>]+', 'gi');
    const cdnUrls = new Set();
    let m;
    while ((m = cdnRe.exec(html)) !== null) cdnUrls.add(m[0]);
    log('  CDN URLs (' + t.hostHint + '): ' + cdnUrls.size);
    const modelHits = [...cdnUrls].filter(u => u.toUpperCase().includes(t.model.toUpperCase().slice(0, 8)));
    log('  containing model prefix: ' + modelHits.length);
    modelHits.slice(0, 10).forEach(u => log('    ' + u));

    // Look for any image URL containing the model number
    const modelRe = new RegExp('https?://[^"\\s\'()<>]*' + t.model.toLowerCase() + '[^"\\s\'()<>]*\\.(jpg|jpeg|png|webp)', 'gi');
    const modelImgs = new Set();
    let m2;
    while ((m2 = modelRe.exec(html)) !== null) modelImgs.add(m2[0]);
    log('  any-host image URLs with model name: ' + modelImgs.size);
    [...modelImgs].slice(0, 5).forEach(u => log('    ' + u));

    // Find hydration data — Next.js __NEXT_DATA__ or other JSON blobs
    const next = html.match(/<script[^>]+id=["']__NEXT_DATA__["'][^>]*>([\s\S]*?)<\/script>/);
    if (next) log('  found __NEXT_DATA__ (' + next[1].length + 'B)');
    const initState = html.match(/window\.__INITIAL_STATE__\s*=\s*({[\s\S]*?})\s*;?\s*</);
    if (initState) log('  found __INITIAL_STATE__ (' + initState[1].length + 'B)');
  } catch (e) {
    log('  err ' + e.message);
  }
}

fs.writeFileSync('.image-audit/lg-ge-samsung-probe.txt', out.join('\n'));
