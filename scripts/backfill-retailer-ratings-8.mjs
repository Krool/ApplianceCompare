// Round 21: more retailer ratings (only models that exist in DB).
import { readFileSync, writeFileSync } from 'node:fs';

const RATINGS = {
  refrigerators: {
    'samsung-rf18a5101sr': {
      best_buy: { stars: 4.3, count: 1476, url: 'https://www.bestbuy.com/site/samsung-17-5-cu-ft-3-door-french-door-counter-depth-refrigerator-with-wifi-and-twin-cooling-plus-stainless-steel/6443500.p?skuId=6443500' },
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
  data._meta.retailer_ratings_pass_8_2026_05 = `Round 21: ${touched} additional retailer entries.`;
  data._meta.last_updated = '2026-05-05';
  writeFileSync(path, JSON.stringify(data, null, 2) + '\n');
  console.log(`${file}: added ${touched} entries`);
}
console.log(`\nTotal: ${totalUpdates}`);
