// Round 23: more retailer ratings for in-DB models.
import { readFileSync, writeFileSync } from 'node:fs';

const RATINGS = {
  refrigerators: {},
  dishwashers: {},
  ovens: {
    'samsung-nse6dg8100sr': {
      best_buy: { stars: 4.5, count: 173, url: 'https://www.bestbuy.com/product/samsung-bespoke-6-3-cu-ft-slide-in-electric-range-with-precision-knobs-stainless-steel/J3ZYG2HGHX' },
    },
    'lg-lrgl5825f': {
      best_buy: { stars: 4.6, count: 845, url: 'https://www.bestbuy.com/product/lg-5-8-cu-ft-smart-freestanding-gas-true-convection-range-with-easyclean-and-instaview-stainless-steel/J7G56534PH' },
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
  data._meta.retailer_ratings_pass_9_2026_05 = `Round 23: ${touched} additional retailer entries.`;
  data._meta.last_updated = '2026-05-05';
  writeFileSync(path, JSON.stringify(data, null, 2) + '\n');
  console.log(`${file}: added ${touched} entries`);
}
console.log(`\nTotal: ${totalUpdates}`);
