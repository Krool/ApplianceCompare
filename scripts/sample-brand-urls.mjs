import fs from 'node:fs';
const out = [];
const cats = ['refrigerators', 'ovens', 'dishwashers'];
const brandSamples = {};
for (const cat of cats) {
  const d = JSON.parse(fs.readFileSync('public/data/' + cat + '.json', 'utf8'));
  for (const m of d.models) {
    if (m.retired) continue;
    const brand = m.brand || m.brand_id;
    if (!brand || brand === 'bosch') continue;
    const urls = (m.ratings && m.ratings.source_urls) || {};
    const mfg = urls.manufacturer || urls.specs;
    if (!mfg) continue;
    if (!brandSamples[brand]) brandSamples[brand] = [];
    if (brandSamples[brand].length < 2) brandSamples[brand].push({ id: m.id, cat, mfg });
  }
}
for (const [b, arr] of Object.entries(brandSamples)) {
  out.push(b);
  for (const a of arr) out.push('  ' + a.id + ' (' + a.cat + ') :: ' + a.mfg);
}
fs.writeFileSync('.image-audit/brand-urls.txt', out.join('\n'));

