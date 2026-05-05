// Round 35: Best Buy retailer ratings for the 2 GE 600-series ranges
// already in-DB. (Other models from this batch — WFE525S0JS, GFE26JYMFS,
// GRFS2853AF, HRF266N6CSE — aren't in the DB yet and would need
// "buyable today" validation before being added as new entries.)
import { readFileSync, writeFileSync } from 'node:fs';

const RATINGS = {
  'ge-grs600avfs': { best_buy: { stars: 4.5, count: 143, url: 'https://www.bestbuy.com/product/ge-5-3-cu-ft-slide-in-electric-convection-range-with-steam-cleaning-and-easywash-oven-tray-stainless-steel/J7645SLJ3W' } },
  'ge-grf600avss': { best_buy: { stars: 4.5, count: 291, url: 'https://www.bestbuy.com/product/ge-5-3-cu-ft-freestanding-electric-convection-range-with-steam-cleaning-and-easywash-tray-stainless-steel/J7645SYKTT' } },
};

const path = 'public/data/ovens.json';
const data = JSON.parse(readFileSync(path, 'utf8'));
let touched = 0;
for (const m of data.models) {
  if (m.retired) continue;
  const r = RATINGS[m.id];
  if (!r) continue;
  m.ratings = m.ratings || {};
  m.ratings.retailer_ratings = m.ratings.retailer_ratings || {};
  for (const [retailer, data2] of Object.entries(r)) {
    if (m.ratings.retailer_ratings[retailer]) continue;
    m.ratings.retailer_ratings[retailer] = data2;
    touched++;
  }
}
data._meta.range_retailer_round35_2026_05 = `Round 35: ${touched} retailer ratings on GE 600-series ranges.`;
data._meta.last_updated = '2026-05-05';
writeFileSync(path, JSON.stringify(data, null, 2) + '\n');
console.log(`ovens: ${touched} retailer ratings`);
