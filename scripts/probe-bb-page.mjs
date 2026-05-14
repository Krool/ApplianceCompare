// One-shot probe: fetch a Best Buy product search page for a given SKU and
// extract pisces.bbystatic.com image URLs that contain that SKU.

import fs from 'node:fs';

const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0 Safari/537.36';

const d = JSON.parse(fs.readFileSync('public/data/refrigerators.json', 'utf8'));
const targets = ['bosch-b36it905np', 'samsung-rf23bb8900aw', 'lg-lrmxs2806s'];

for (const id of targets) {
  const m = d.models.find(x => x.id === id);
  if (!m?.image?.source_url) { console.log(id, 'no image'); continue; }
  const sku = m.image.source_url.match(/\/(\d{7,8})_/)?.[1];
  if (!sku) { console.log(id, 'no SKU'); continue; }
  console.log('\n===', id, '— SKU', sku);

  for (const pageUrl of [
    `https://www.bestbuy.com/site/searchpage.jsp?st=${sku}`,
    `https://www.bestbuy.com/site/-/${sku}.p?skuId=${sku}`,
  ]) {
    console.log('   trying', pageUrl);
    try {
      const r = await fetch(pageUrl, { headers: { 'User-Agent': UA }, redirect: 'follow' });
      console.log('   status', r.status, 'final', r.url);
      const html = await r.text();
      const re = new RegExp(`pisces\\.bbystatic\\.com[^"'\\)\\s]+${sku}[^"'\\)\\s]*`, 'gi');
      const matches = [...new Set(html.match(re) || [])];
      console.log('   pisces URLs with SKU:', matches.length);
      matches.slice(0, 15).forEach(u => console.log('     ' + u));
      if (matches.length > 0) break;
    } catch (e) {
      console.log('   err', e.message);
    }
  }
}
