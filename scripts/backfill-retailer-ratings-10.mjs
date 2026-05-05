// Round 24: more retailer ratings.
import { readFileSync, writeFileSync } from 'node:fs';

const RATINGS = {
  refrigerators: {
    'whirlpool-wrt311fzdm': {
      best_buy: { stars: 4.4, count: 3538, url: 'https://www.bestbuy.com/site/whirlpool-20-5-cu-ft-top-freezer-refrigerator-monochromatic-stainless-steel/9536227.p?skuId=9536227' },
    },
  },
  dishwashers: {},
  ovens: {},
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
  data._meta.retailer_ratings_pass_10_2026_05 = `Round 24: ${touched} additional retailer entries.`;
  data._meta.last_updated = '2026-05-05';
  writeFileSync(path, JSON.stringify(data, null, 2) + '\n');
  console.log(`${file}: added ${touched} entries`);
}
console.log(`\nTotal: ${totalUpdates}`);
