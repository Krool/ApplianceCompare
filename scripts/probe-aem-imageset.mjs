// Probe Adobe Scene7 image-set API for Whirlpool Corp brands.
// Pattern: data-asset returns "/content/dam/brand/maytag/.../image-set/MODEL"
// → query "https://<host>/is/image<path>?req=set,json" → gallery JSON.

import fs from 'node:fs';

const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0 Safari/537.36';
const out = [];
function log(...a) { out.push(a.join(' ')); }

const targets = [
  { brand: 'maytag', host: 'www.maytag.com', asset: '/content/dam/brand/maytag/en-us/refrigeration/refrigerator/image-set/MFI2570FEZ' },
  { brand: 'whirlpool', host: 'www.whirlpool.com', asset: '/content/dam/brand/whirlpool/en-us/refrigeration/refrigerator/image-set/WRF555SDFZ' },
  { brand: 'kitchenaid', host: 'www.kitchenaid.com', asset: '/content/dam/brand/kitchenaid/en-us/refrigeration/refrigerator/image-set/KRFF507HPS' },
  { brand: 'jennair', host: 'www.jennair.com', asset: '/content/dam/brand/jennair/en-us/refrigeration/refrigerator/image-set/JFFCF72DKM' },
];

for (const t of targets) {
  log('\n=== ' + t.brand);
  // Try multiple URL forms
  const candidates = [
    `https://${t.host}/is/image${t.asset}?req=set,json`,
    `https://${t.host}/is/image${t.asset}?req=imageset`,
    `https://${t.host}/is/image${t.asset}.jpg?req=set,json`,
  ];
  for (const u of candidates) {
    log('  try: ' + u);
    try {
      const r = await fetch(u, { headers: { 'User-Agent': UA, Accept: '*/*', Referer: `https://${t.host}/` } });
      log('    status ' + r.status + ' content-type=' + r.headers.get('content-type'));
      if (r.ok) {
        const text = await r.text();
        log('    body len=' + text.length);
        log('    sample: ' + text.slice(0, 400).replace(/\s+/g, ' '));
        break;
      }
    } catch (e) {
      log('    err ' + e.message);
    }
  }
}

fs.writeFileSync('.image-audit/aem-imageset-probe.txt', out.join('\n'));
