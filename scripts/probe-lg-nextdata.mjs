// LG's product pages are Next.js apps. The full gallery image list is
// in the <script id="__NEXT_DATA__"> blob. Parse it and find every URL
// pointing to media.us.lg.com that references our target model.

import fs from 'node:fs';

const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0 Safari/537.36';
const out = [];

const targets = [
  { id: 'lg-lrfxc2606s', model: 'LRFXC2606S', url: 'https://www.lg.com/us/refrigerators/lg-lrfxc2606s-french-3-door-refrigerator' },
  { id: 'lg-lrmvs2806s', model: 'LRMVS2806S', url: 'https://www.lg.com/us/refrigerators/lg-lrmvs2806s-french-4-door-refrigerator' },
];

for (const t of targets) {
  out.push('\n=== ' + t.id);
  const r = await fetch(t.url, { headers: { 'User-Agent': UA } });
  if (!r.ok) { out.push('  status ' + r.status); continue; }
  const html = await r.text();
  const next = html.match(/<script[^>]+id=["']__NEXT_DATA__["'][^>]*>([\s\S]*?)<\/script>/);
  if (!next) { out.push('  no __NEXT_DATA__'); continue; }
  let obj;
  try { obj = JSON.parse(next[1]); } catch (e) { out.push('  JSON parse err: ' + e.message); continue; }

  // Walk the data tree looking for arrays of image URLs containing the model
  const found = new Set();
  const modelLower = t.model.toLowerCase();
  const walk = (v) => {
    if (!v) return;
    if (typeof v === 'string') {
      if (/media\.us\.lg\.com/.test(v) && v.toLowerCase().includes(modelLower)) {
        // Strip query suffixes
        const base = v.split('?')[0];
        found.add(base);
      }
    } else if (Array.isArray(v)) {
      v.forEach(walk);
    } else if (typeof v === 'object') {
      for (const x of Object.values(v)) walk(x);
    }
  };
  walk(obj);

  out.push('  unique image URLs (model-matched): ' + found.size);
  [...found].slice(0, 20).forEach(u => out.push('    ' + u));
}

fs.writeFileSync('.image-audit/lg-nextdata-probe.txt', out.join('\n'));
