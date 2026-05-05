// Round 12: more retailer ratings.
import { readFileSync, writeFileSync } from 'node:fs';

const RATINGS = {
  refrigerators: {},
  dishwashers: {
    'whirlpool-wdt740salz': {
      best_buy: { stars: 4.6, count: 102, url: 'https://www.bestbuy.com/site/whirlpool-24-top-control-built-in-dishwasher-with-stainless-steel-tub-large-capacity-with-tall-top-rack-50-dba-stainless-steel/6473473.p?skuId=6473473' },
    },
  },
  ovens: {
    'ge-profile-phs93xypfs': {
      best_buy: { stars: 3.6, count: 14, url: 'https://www.bestbuy.com/product/ge-profile-5-3-cu-ft-slide-in-electric-induction-true-convection-range-with-no-preheat-air-fry-and-wi-fi-stainless-steel/J7645S2SGY' },
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
  data._meta.retailer_ratings_pass_5_2026_05 = `Round 12 retailer-ratings backfill 2026-05-05: ${touched} additional entries.`;
  data._meta.last_updated = '2026-05-05';
  writeFileSync(path, JSON.stringify(data, null, 2) + '\n');
  console.log(`${file}: added ${touched} entries`);
}
console.log(`\nTotal: ${totalUpdates}`);
