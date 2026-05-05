// Round 9: more retailer star ratings.
import { readFileSync, writeFileSync } from 'node:fs';

const RATINGS = {
  refrigerators: {
    'frigidaire-ffht2022aw': {
      best_buy: { stars: 3.1, count: 37, url: 'https://www.bestbuy.com/site/reviews/frigidaire-20-0-cu-ft-garage-ready-top-freezer-refrigerator-white/6578032' },
    },
    'lg-lrmvs2806s': {
      best_buy: { stars: null, count: 104, url: 'https://www.bestbuy.com/site/reviews/lg-28-cu-ft-4-door-french-door-smart-refrigerator-with-dual-ice-stainless-steel/6452808' },
    },
  },
  dishwashers: {
    'bosch-shp9pcm5n': {
      best_buy: { stars: 4.5, count: 149, url: 'https://www.bestbuy.com/site/bosch-benchmark-series-24-top-control-smart-built-in-stainless-steel-tub-dishwasher-38dba-stainless-steel/6543003.p?skuId=6543003' },
    },
    'lg-ldth7972s': {
      best_buy: { stars: 4.3, count: 380, url: 'https://www.bestbuy.com/site/lg-24-top-control-smart-built-in-stainless-steel-tub-dishwasher-with-3rd-rack-quadwash-pro-and-42dba-stainless-steel/6509869.p?skuId=6509869' },
    },
  },
  ovens: {
    'ge-profile-phs700ayfs': {
      best_buy: { stars: 4.4, count: 24, url: 'https://www.bestbuy.com/product/ge-profile-5-3-cu-ft-slide-in-electric-induction-convection-range-with-no-preheat-air-fry-and-easywash-oven-tray-cleaning-system-stainless-steel/J7645SPHH3' },
    },
  },
};

let totalUpdates = 0;
for (const [file, byId] of Object.entries(RATINGS)) {
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
  data._meta.retailer_ratings_pass_3_2026_05 = `Round 9 retailer-ratings backfill 2026-05-05: ${touched} additional retailer-rating entries.`;
  data._meta.last_updated = '2026-05-05';
  writeFileSync(path, JSON.stringify(data, null, 2) + '\n');
  console.log(`${file}: added ${touched} retailer entries`);
}
console.log(`\nTotal: ${totalUpdates} retailer ratings`);
