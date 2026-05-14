// Deeper probe: look for ALL Scene7 image references in Whirlpool Corp
// product pages, not just og:image. Their pages render server-side enough
// to include the gallery image list in inline JSON for AEM viewers.

import fs from 'node:fs';

const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0 Safari/537.36';
const targets = [
  { brand: 'whirlpool', url: 'https://www.whirlpool.com/kitchen/refrigeration/refrigerators/french-door/p.36-inch-wide-french-door-refrigerator-25-cu.-ft.wrf555sdfz.html', model: 'WRF555SDFZ' },
  { brand: 'kitchenaid', url: 'https://www.kitchenaid.com/major-appliances/refrigeration/refrigerators/french-door-refrigerators/p.26.8-cu.-ft.-36-inch-width-standard-depth-french-door-refrigerator-with-exterior-ice-and-water-and-printshield-finish.krff507hps.html', model: 'KRFF507HPS' },
  { brand: 'maytag', url: 'https://www.maytag.com/kitchen/refrigerators/french-door/p.36-inch-wide-french-door-refrigerator-with-powercold-feature-25-cu.-ft.mfi2570fez.html', model: 'MFI2570FEZ' },
  { brand: 'jennair', url: 'https://www.jennair.com/refrigeration/french-door-refrigerators/p.noir-36-french-door-freestanding-refrigerator.jffcf72dkm.html', model: 'JFFCF72DKM' },
];

const out = [];
function log(...a) { out.push(a.join(' ')); }

for (const t of targets) {
  log('\n=== ' + t.brand + ' (' + t.model + ')');
  try {
    const r = await fetch(t.url, { headers: { 'User-Agent': UA, Accept: 'text/html' }, redirect: 'follow' });
    log('  status ' + r.status);
    if (!r.ok) continue;
    const html = await r.text();

    // Find all /is/image/... references in HTML (Scene7 image URLs)
    const re = /(?:["'(])([^"'()\s]*\/is\/image\/[^"'()\s]+)/gi;
    const found = new Set();
    let m;
    while ((m = re.exec(html)) !== null) {
      let u = m[1].replace(/&amp;/g, '&');
      if (u.startsWith('//')) u = 'https:' + u;
      else if (u.startsWith('/')) u = 'https://' + new URL(t.url).host + u;
      found.add(u);
    }
    log('  Scene7 image refs: ' + found.size);

    // Filter to those containing the model number (case-insensitive)
    const modelMatches = [...found].filter(u => u.toUpperCase().includes(t.model.toUpperCase()));
    log('  containing model "' + t.model + '": ' + modelMatches.length);
    modelMatches.slice(0, 15).forEach(u => log('    ' + u));

    // Look for AEM viewer data JSON — common patterns
    const dataPatterns = [
      /s7viewer\([^)]*\)/g,  // s7viewer() calls
      /data-asset=["']([^"']+)["']/g,
      /imageserver:\s*["']([^"']+)["']/gi,
      /image_root[\s]*[:=][\s]*["']([^"']+)["']/gi,
    ];
    for (const re of dataPatterns) {
      const matches = html.match(re);
      if (matches && matches.length) log('  pattern ' + re.source.slice(0, 30) + ': ' + matches.length + ' matches');
    }
  } catch (e) {
    log('  err ' + e.message);
  }
}

fs.writeFileSync('.image-audit/whirlpool-probe.txt', out.join('\n'));
