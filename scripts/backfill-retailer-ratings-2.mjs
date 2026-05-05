// Round 8: more retailer star ratings for top-tier models. Each entry is the
// rating + count as shown on the retailer's product page.
import { readFileSync, writeFileSync } from 'node:fs';

const RATINGS = {
  refrigerators: {
    'samsung-rf23bb8900aw': {
      best_buy: { stars: 4.6, count: 517, url: 'https://www.bestbuy.com/product/samsung-bespoke-23-cu-ft-4-door-french-door-counter-depth-smart-refrigerator-with-family-hub-custom-panel-ready/J3ZYG2XFQ5' },
    },
  },
  dishwashers: {
    'maytag-mdb4949skz': {
      best_buy: { stars: 4.5, count: 713, url: 'https://www.bestbuy.com/product/maytag-24-front-control-built-in-tub-dishwasher-with-dual-power-filtration-powerblast-cycle-50-dba-stainless-steel/J3KHV8ZCH3' },
    },
    'bosch-she3aem2n': {
      best_buy: { stars: 4.3, count: 279, url: 'https://www.bestbuy.com/site/bosch-100-series-24-front-control-smart-built-in-hybrid-stainless-steel-tub-dishwasher-with-50dba-white/6542972.p?skuId=6542972' },
    },
  },
  ovens: {
    'whirlpool-wge745c0fs': {
      lowes:    { stars: 4.4, count: 3931, url: 'https://www.lowes.com/pd/Whirlpool-Smooth-Surface-Element-4-2-cu-ft-2-5-cu-ft-Double-Oven-Convection-Electric-Range-Stainless-Steel-Common-30-in-Actual-29-938-in/1000062733' },
      best_buy: { stars: 4.5, count: 720,  url: 'https://www.bestbuy.com/site/whirlpool-6-7-cu-ft-self-cleaning-freestanding-double-oven-electric-convection-range-stainless-steel/5204200.p?skuId=5204200' },
    },
    'ge-jgb735spss': {
      home_depot: { stars: null, count: 4552, url: 'https://www.homedepot.com/p/GE-30-in-5-Burner-Freestanding-Gas-Range-in-Stainless-Steel-with-Convection-Air-Fry-Cooking-JGB735SPSS/314138082' },
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
      // Only set if we have a stars value, OR keep null-stars but populate count
      // (some retailers show count without aggregate stars in our search snippets)
      if (data2.stars == null && data2.count == null) continue;
      if (m.ratings.retailer_ratings[retailer]) continue; // don't overwrite
      m.ratings.retailer_ratings[retailer] = data2;
      touched++; totalUpdates++;
    }
  }
  data._meta.retailer_ratings_pass_2_2026_05 = `Round 8 retailer-ratings backfill 2026-05-05: ${touched} additional retailer-rating entries added.`;
  data._meta.last_updated = '2026-05-05';
  writeFileSync(path, JSON.stringify(data, null, 2) + '\n');
  console.log(`${file}: added ${touched} retailer-rating entries`);
}
console.log(`\nTotal: ${totalUpdates} retailer ratings`);
