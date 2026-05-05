// Round 19: more retailer star ratings for popular 1-source models.
import { readFileSync, writeFileSync } from 'node:fs';

const RATINGS = {
  refrigerators: {},
  dishwashers: {
    'ge-profile-pdt785synfs': {
      best_buy: { stars: 4.4, count: 110, url: 'https://www.bestbuy.com/site/ge-profile-24-top-control-smart-built-in-stainless-steel-tub-dishwasher-with-3rd-rack-twin-turbo-dry-boost-and-39-dba-stainless-steel/6365773.p?skuId=6365773' },
    },
  },
  ovens: {
    'samsung-nx60bb871112': {
      rc_willey: { stars: 4.5, count: 579, url: 'https://www.rcwilley.com/Appliances/Cooking/Ranges/Single-Oven/NX60BB871112/112656536/Samsung-Bespoke-6-cu-ft-Gas-Range---White-Glass-View' },
    },
    'whirlpool-wfg775h0hz': {
      best_buy: { stars: 4.3, count: 99, url: 'https://www.bestbuy.com/site/whirlpool-5-8-cu-ft-self-cleaning-freestanding-gas-convection-range-stainless-steel/6177122.p?skuId=6177122' },
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
  data._meta.retailer_ratings_pass_6_2026_05 = `Round 19: ${touched} additional retailer entries.`;
  data._meta.last_updated = '2026-05-05';
  writeFileSync(path, JSON.stringify(data, null, 2) + '\n');
  console.log(`${file}: added ${touched} entries`);
}
console.log(`\nTotal: ${totalUpdates}`);
