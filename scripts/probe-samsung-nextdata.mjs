// Probe Samsung's __NEXT_DATA__ JSON to find image categorization.
// Real product photos vs marketing badges may be tagged differently.

import fs from 'node:fs';

const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0 Safari/537.36';
const out = [];

const url = 'https://www.samsung.com/us/refrigerators/french-door/bespoke-4-door-french-door-refrigerator-29-cu-ft-with-beverage-center-in-stainless-steel-sku-rf29bb8600qlaa/';
const r = await fetch(url, { headers: { 'User-Agent': UA } });
const html = await r.text();
const next = html.match(/<script[^>]+id=["']__NEXT_DATA__["'][^>]*>([\s\S]*?)<\/script>/);
if (!next) { out.push('no next data'); fs.writeFileSync('.image-audit/samsung-next.txt', out.join('\n')); process.exit(0); }
const obj = JSON.parse(next[1]);

// Walk the tree looking for arrays of images with metadata
function walk(v, path, depth = 0) {
  if (depth > 12) return;
  if (!v) return;
  if (Array.isArray(v)) {
    if (v.length > 0 && typeof v[0] === 'object' && v[0] !== null) {
      // Check if this is an array of image-like records
      const sample = v[0];
      const keys = Object.keys(sample).join(',');
      if (/image|url|src|gallery|asset/i.test(keys) && v.length >= 3) {
        out.push('\n=== ' + path + ' (' + v.length + ' items)');
        out.push('  keys: ' + keys);
        v.slice(0, 5).forEach((item, i) => {
          out.push('  [' + i + ']: ' + JSON.stringify(item).slice(0, 350));
        });
      }
    }
    v.forEach((x, i) => walk(x, path + '[' + i + ']', depth + 1));
  } else if (typeof v === 'object') {
    for (const [k, val] of Object.entries(v)) walk(val, path + '.' + k, depth + 1);
  }
}
walk(obj, 'root');

fs.writeFileSync('.image-audit/samsung-next.txt', out.join('\n').slice(0, 15000));
