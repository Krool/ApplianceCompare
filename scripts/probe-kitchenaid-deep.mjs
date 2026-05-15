// KitchenAid + JennAir use AEM/Scene7 like Whirlpool but their image-set
// endpoint returned "Fvctx" error. Look for alternative paths or naming.

import fs from 'node:fs';

const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0 Safari/537.36';
const out = [];

const targets = [
  { brand: 'kitchenaid', host: 'www.kitchenaid.com', model: 'KRFF507HPS', url: 'https://www.kitchenaid.com/major-appliances/refrigeration/refrigerators/french-door-refrigerators/p.26.8-cu.-ft.-36-inch-width-standard-depth-french-door-refrigerator-with-exterior-ice-and-water-and-printshield-finish.krff507hps.html' },
];

for (const t of targets) {
  out.push('\n=== ' + t.brand + ' (' + t.model + ')');
  const r = await fetch(t.url, { headers: { 'User-Agent': UA } });
  const html = await r.text();
  // Try several possible image-set paths
  const candidatePaths = [
    `/content/dam/brand/${t.brand}/en-us/refrigeration/refrigerator/image-set/${t.model}`,
    `/content/dam/brand/${t.brand}/en-us/refrigeration/freestanding-refrigerator/image-set/${t.model}`,
    `/content/dam/global/${t.brand}/refrigeration/freestanding-refrigerator/image-set/${t.model}`,
    `/content/dam/global/${t.brand}/refrigeration/refrigerator/image-set/${t.model}`,
    `/content/dam/${t.brand}/en_us/major-appliances/refrigeration/refrigerator/image-set/${t.model}`,
  ];
  for (const p of candidatePaths) {
    const u = `https://${t.host}/is/image${p}?req=set,json`;
    const r2 = await fetch(u, { headers: { 'User-Agent': UA, Referer: t.url } });
    const txt = await r2.text();
    const ok = !txt.includes('s7jsonError');
    out.push('  ' + (ok ? 'OK ' : 'ERR') + ' ' + p);
    if (ok) {
      out.push('    sample: ' + txt.slice(0, 200).replace(/\s+/g, ' '));
    }
  }
  // Also search HTML for any "image-set" references
  const sets = [...html.matchAll(/image-set\/[A-Z0-9_-]+/gi)].map(m => m[0]);
  out.push('  image-set paths in HTML: ' + new Set(sets).size);
  [...new Set(sets)].slice(0, 5).forEach(s => out.push('    ' + s));
  // Look for Scene7 viewer init
  const viewerInit = html.match(/asset\s*[:=]\s*["']([^"']+)["']/g);
  if (viewerInit) {
    out.push('  asset references: ' + viewerInit.length);
    viewerInit.slice(0, 5).forEach(a => out.push('    ' + a));
  }
}

fs.writeFileSync('.image-audit/kitchenaid-deep-probe.txt', out.join('\n'));
