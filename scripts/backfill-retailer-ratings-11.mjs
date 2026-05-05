// Round 26: more retailer ratings for 4 in-DB ovens.
import { readFileSync, writeFileSync } from 'node:fs';

const RATINGS = {
  refrigerators: {},
  dishwashers: {},
  ovens: {
    'bosch-hii8057u': {
      best_buy: { stars: 3.1, count: 11, url: 'https://www.bestbuy.com/site/bosch-800-series-4-6-cu-ft-slide-in-electric-induction-range-with-self-cleaning-and-warming-drawer-stainless-steel/6501560.p?skuId=6501560' },
    },
    'maytag-mfgs6030rz': {
      best_buy: { stars: 4.4, count: 18, url: 'https://www.bestbuy.com/product/maytag-30-inch-wide-gas-range-with-no-preheat-air-fry-and-air-baking-5-0-cu-ft-stainless-steel/J3KHVGXKPV' },
    },
    'ge-jbs60dkbb': {
      best_buy: { stars: 4.5, count: 467, url: 'https://www.bestbuy.com/site/ge-5-3-cu-ft-freestanding-electric-range-with-power-boil-and-ceramic-glass-cooktop-white/4955900.p?skuId=4955900' },
    },
    'frigidaire-fcrg3083as': {
      best_buy: { stars: 4.5, count: 14, url: 'https://www.bestbuy.com/product/frigidaire-5-1-cu-ft-freestanding-gas-range-with-air-fry-stainless-steel/J7CJ3RCF6Q/sku/6576791' },
    },
  },
};

let totalUpdates = 0;
for (const [file, byId] of Object.entries(RATINGS)) {
  if (Object.keys(byId).length === 0) continue;
  const path = `public/data/${file}.json`;
  const data = JSON.parse(readFileSync(path, 'utf8'));
  let touched = 0;
  for (const m of data.models) {
    const ratings = byId[m.id];
    if (!ratings) continue;
    m.ratings = m.ratings || {};
    m.ratings.retailer_ratings = m.ratings.retailer_ratings || {};
    for (const [retailer, data2] of Object.entries(ratings)) {
      if (m.ratings.retailer_ratings[retailer]) continue;
      m.ratings.retailer_ratings[retailer] = data2;
      touched++; totalUpdates++;
    }
  }
  data._meta.retailer_ratings_pass_11_2026_05 = `Round 26: ${touched} additional retailer entries.`;
  data._meta.last_updated = '2026-05-05';
  writeFileSync(path, JSON.stringify(data, null, 2) + '\n');
  console.log(`${file}: added ${touched} entries`);
}
console.log(`\nTotal: ${totalUpdates}`);
