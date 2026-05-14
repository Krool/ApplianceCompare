// Probe one sample manufacturer URL per non-Bosch brand and report how
// many product-image URLs each page exposes via og:image / JSON-LD.
// Goal: figure out which brands are scrapable with the Bosch approach.

import fs from 'node:fs';

const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0 Safari/537.36';

// Hand-picked sample per brand — one representative product URL each.
const targets = [
  { brand: 'lg',          url: 'https://www.lg.com/us/refrigerators/lg-lrfxc2606s-french-3-door-refrigerator' },
  { brand: 'ge-profile',  url: 'https://www.geappliances.com/appliance/GE-Profile-ENERGY-STAR-27-7-Cu-Ft-Fingerprint-Resistant-French-Door-Refrigerator-with-Hands-Free-AutoFill-PFE28KYNFS' },
  { brand: 'cafe',        url: 'https://www.cafeappliances.com/appliance/CAFE-ENERGY-STAR-27-8-Cu-Ft-Smart-4-Door-French-Door-Refrigerator-CVE28DP4NW2' },
  { brand: 'whirlpool',   url: 'https://www.whirlpool.com/kitchen/refrigeration/refrigerators/french-door/p.36-inch-wide-french-door-refrigerator-25-cu.-ft.wrf555sdfz.html' },
  { brand: 'kitchenaid',  url: 'https://www.kitchenaid.com/major-appliances/refrigeration/refrigerators/french-door-refrigerators/p.26.8-cu.-ft.-36-inch-width-standard-depth-french-door-refrigerator-with-exterior-ice-and-water-and-printshield-finish.krff507hps.html' },
  { brand: 'samsung',     url: 'https://www.samsung.com/us/home-appliances/refrigerators/bespoke/bespoke-4-door-french-door-refrigerator-29-cu-ft-with-beverage-center-in-stainless-steel-rf29bb8600qlaa/' },
  { brand: 'frigidaire',  url: 'https://www.frigidaire.com/en/p/kitchen/refrigerators/french-door-refrigerators/FRQG1721AV' },
  { brand: 'maytag',      url: 'https://www.maytag.com/kitchen/refrigerators/french-door/p.36-inch-wide-french-door-refrigerator-with-powercold-feature-25-cu.-ft.mfi2570fez.html' },
  { brand: 'jennair',     url: 'https://www.jennair.com/refrigeration/french-door-refrigerators/p.noir-36-french-door-freestanding-refrigerator.jffcf72dkm.html' },
  { brand: 'thermador',   url: 'https://www.thermador.com/us/en/mkt-product/T36BB915SS' },
  { brand: 'miele',       url: 'https://www.mieleusa.com/product/11503020/mastercool-frenchdoor-kf-2982-vi' },
  { brand: 'sub-zero',    url: 'https://www.subzero-wolf.com/sub-zero/full-size-refrigeration/builtin-refrigerators/36-inch-built-in-over-under-refrigerator-freezer-legacy' },
  { brand: 'fisher-paykel', url: 'https://www.fisherpaykel.com/us/cooking/cooktops/minimal-cooktops/induction-cooktop-36in-5-zones-with-smartzone-ci365dtb4-81972.html' },
  { brand: 'electrolux',  url: 'https://www.electrolux.com/en/p/Kitchen/Ranges/Dual-Fuel-Ranges/ECFD3068AS' },
];

const out = [];
function log(...a) { out.push(a.join(' ')); }

for (const t of targets) {
  log('\n=== ' + t.brand + '\n  page: ' + t.url);
  try {
    const r = await fetch(t.url, { headers: { 'User-Agent': UA, Accept: 'text/html' }, redirect: 'follow' });
    log('  status ' + r.status + ' (final ' + r.url + ')');
    if (!r.ok) continue;
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
    log('  found ' + urls.size + ' URLs');
    let i = 0;
    for (const u of urls) {
      log('    ' + u);
      if (++i >= 8) { log('    ... (+' + (urls.size - 8) + ' more)'); break; }
    }
  } catch (e) {
    log('  err ' + e.message);
  }
}

fs.writeFileSync('.image-audit/brand-probe.txt', out.join('\n'));
