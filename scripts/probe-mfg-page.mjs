// Probe a manufacturer product page for gallery image URLs.
// Strategy: look for og:image, twitter:image, JSON-LD "image" arrays, and
// any image URLs that look like product photography.

import fs from 'node:fs';

const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0 Safari/537.36';

const targets = [
  // canonical-from-manufacturer or with a manufacturer URL we can probe
  { id: 'bosch-b36it905np', url: 'https://www.bosch-home.com/us/en/product/B36IT905NP' },
  { id: 'lg-lrmxs2806s', url: 'https://www.lg.com/us/refrigerators/lg-lrmxs2806s-french-3-door-refrigerator' },
  { id: 'samsung-rf23bb8900aw', url: 'https://www.samsung.com/us/business/builder/our-appliances/refrigerators/bespoke/bespoke-4-door-french-door-refrigerator-23-cu-ft-with-family-hub-panel-in-charcoal-glass-with-customizable-panel-colors-rf23bb8900awaa/' },
  { id: 'whirlpool-wrb322dmbm', url: 'https://www.whirlpool.com/kitchen/refrigeration/refrigerators/bottom-freezer/p.33-inches-wide-bottom-freezer-refrigerator-with-spillguard-glass-shelves-22-cu.-ft.wrb322dmbm.html' },
];

for (const t of targets) {
  console.log('\n===', t.id);
  console.log('  page:', t.url);
  try {
    const r = await fetch(t.url, { headers: { 'User-Agent': UA, Accept: 'text/html' }, redirect: 'follow' });
    console.log('  status', r.status);
    if (!r.ok) continue;
    const html = await r.text();

    const urls = new Set();
    // og:image / twitter:image
    for (const re of [
      /<meta[^>]+property=["']og:image[^"']*["'][^>]+content=["']([^"']+)["']/gi,
      /<meta[^>]+name=["']twitter:image[^"']*["'][^>]+content=["']([^"']+)["']/gi,
    ]) {
      let m; while ((m = re.exec(html)) !== null) urls.add(m[1]);
    }
    // JSON-LD product blocks: look for "image": "..." or "image": ["..."]
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

    console.log('  found ' + urls.size + ' candidate image URLs');
    let i = 0;
    for (const u of urls) { console.log('   ' + u); if (++i >= 12) break; }
  } catch (e) {
    console.log('  err', e.message);
  }
}
