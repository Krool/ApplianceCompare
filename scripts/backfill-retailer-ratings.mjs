// Round 7: retailer star ratings for top-tier models. Each entry is the rating
// + count as displayed on the retailer's product page at the URL provided.
// Schema lives in the README under "Aspirational ratings fields" section —
// app's helpers.jsx already renders these as signals.
import { readFileSync, writeFileSync } from 'node:fs';

const RETAILER_RATINGS = {
  refrigerators: {
    'lg-lrfxc2606s': {
      home_depot: { stars: 4.2, count: 691, url: 'https://www.homedepot.com/p/LG-26-cu-ft-Smart-Counter-Depth-MAX-French-Door-Refrigerator-with-Dual-Ice-Makers-in-PrintProof-Stainless-Steel-LRFXC2606S/325158262' },
    },
    'hisense-hrm260n6tse': {
      lowes: { stars: 4.6, count: 55, url: 'https://www.lowes.com/pd/Hisense-25-6-cu-ft-4-Door-Smart-French-Door-Refrigerator-with-Ice-Maker-Stainless-Steel-ENERGY-STAR/5014777193' },
    },
    'cafe-cae28dm5ts5': {
      home_depot: { stars: 4.6, count: 45, url: 'https://www.homedepot.com/p/Cafe-36-in-W-28-3-cu-ft-Smart-Quad-Door-Bottom-Freezer-Refrigerator-in-Platinum-Glass-with-Dual-Dispense-AutoFill-Pitcher-CAE28DM5TS5/327242712' },
    },
  },
  dishwashers: {
    'bosch-shp78cm5n': {
      best_buy: { stars: 4.6, count: 757, url: 'https://www.bestbuy.com/site/bosch-800-series-24--top-control-smart-built-in-stainless-steel-tub-dishwasher-with-3rd-rack-and-crystaldry-42dba-stainless-steel/6542977.p?skuId=6542977' },
    },
  },
  ovens: {
    'ge-jgb735spss': {
      best_buy: { stars: 4.5, count: 263, url: 'https://www.bestbuy.com/site/ge-5-0-cu-ft-freestanding-gas-convection-range-with-self-steam-cleaning-and-no-preheat-air-fry-stainless-steel/6488852.p?skuId=6488852' },
    },
    'frigidaire-gcfi3070bf': {
      best_buy: { stars: 4.9, count: 12, url: 'https://www.bestbuy.com/product/frigidaire-gallery-6-2-cu-ft-slide-in-electric-induction-range-with-stone-baked-pizza-and-15-ways-to-cook-stainless-steel/J3GWLTCQ2J' },
    },
  },
};

let totalUpdates = 0;
for (const [file, byId] of Object.entries(RETAILER_RATINGS)) {
  const path = `public/data/${file}.json`;
  const data = JSON.parse(readFileSync(path, 'utf8'));
  let touched = 0;
  for (const m of data.models) {
    const ratings = byId[m.id];
    if (!ratings) continue;
    m.ratings = m.ratings || {};
    m.ratings.retailer_ratings = m.ratings.retailer_ratings || {};
    for (const [retailer, data2] of Object.entries(ratings)) {
      if (!m.ratings.retailer_ratings[retailer]) {
        m.ratings.retailer_ratings[retailer] = data2;
        touched++; totalUpdates++;
      }
    }
  }
  data._meta.retailer_ratings_pass_2026_05 = `Round 7 retailer-ratings backfill 2026-05-05: ${touched} retailer-rating entries added across top-tier models. Each entry is the live rating + count from the retailer URL on the same date.`;
  data._meta.last_updated = '2026-05-05';
  writeFileSync(path, JSON.stringify(data, null, 2) + '\n');
  console.log(`${file}: added ${touched} retailer-rating entries`);
}
console.log(`\nTotal: ${totalUpdates} retailer ratings`);
