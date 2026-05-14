import fs from 'node:fs';
const cats = ['refrigerators', 'ovens', 'dishwashers'];
const brands = { whirlpool: 'whirlpool.com', maytag: 'maytag.com', kitchenaid: 'kitchenaid.com', jennair: 'jennair.com', amana: 'amana.com' };
const out = [];
for (const cat of cats) {
  const d = JSON.parse(fs.readFileSync('public/data/' + cat + '.json', 'utf8'));
  for (const m of d.models) {
    if (m.retired) continue;
    const br = m.brand || m.brand_id;
    if (!brands[br]) continue;
    if (Array.isArray(m.images) && m.images.length > 1) continue;
    const urls = (m.ratings && m.ratings.source_urls) || {};
    const mfg = urls.manufacturer || urls.specs;
    const hasUrl = mfg && new RegExp(brands[br]).test(mfg);
    out.push({ id: m.id, cat, brand: br, model: m.model_number || m.id.split('-').slice(1).join('').toUpperCase(), mfg: hasUrl ? mfg : null });
  }
}
const byBrand = {};
for (const o of out) {
  byBrand[o.brand] ||= { total: 0, hasUrl: 0 };
  byBrand[o.brand].total++;
  if (o.mfg) byBrand[o.brand].hasUrl++;
}
const summary = Object.entries(byBrand).map(([b, v]) => b + ': ' + v.total + ' models, ' + v.hasUrl + ' with mfg URL').join('\n');
fs.writeFileSync('.image-audit/wpl-survey.txt', summary + '\n\nfirst 3 without URL per brand:\n' +
  Object.keys(byBrand).map(b => b + ':\n' + out.filter(o => o.brand === b && !o.mfg).slice(0, 3).map(o => '  ' + o.id + ' (model: ' + o.model + ')').join('\n')).join('\n'));
