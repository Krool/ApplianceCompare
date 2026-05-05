// Round 20: more retailer ratings.
import { readFileSync, writeFileSync } from 'node:fs';

const RATINGS = {
  refrigerators: {
    'ge-profile-pfe28kynfs': {
      best_buy: { stars: 4.1, count: 154, url: 'https://www.bestbuy.com/site/ge-profile-27-7-cu-ft-french-door-refrigerator-with-hands-free-autofill-stainless-steel/6399128.p?skuId=6399128' },
    },
    'whirlpool-wrf767sdhz': {
      best_buy: { stars: 3.7, count: 54, url: 'https://www.bestbuy.com/site/reviews/whirlpool-26-8-cu-ft-french-door-refrigerator-stainless-steel/6292010' },
    },
  },
  dishwashers: {},
  ovens: {
    'ge-profile-phs930ypfs': {
      best_buy: { stars: 4.3, count: 51, url: 'https://www.bestbuy.com/product/ge-profile-5-3-cu-ft-slide-in-electric-induction-true-convection-range-with-no-preheat-air-fry-and-wi-fi-stainless-steel/J7645S2S8W' },
    },
    'samsung-ne63bb871112': {
      lowes: { stars: 3.8, count: 11, url: 'https://www.lowes.com/pd/Samsung-Bespoke-30-in-Glass-Top-5-Burners-6-3-cu-ft-Self-Cleaning-Air-Fry-Slide-in-Smart-Electric-Range-White-Glass/5013352961' },
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
  data._meta.retailer_ratings_pass_7_2026_05 = `Round 20: ${touched} additional retailer entries.`;
  data._meta.last_updated = '2026-05-05';
  writeFileSync(path, JSON.stringify(data, null, 2) + '\n');
  console.log(`${file}: added ${touched} entries`);
}
console.log(`\nTotal: ${totalUpdates}`);
