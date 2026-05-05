// Round 10: more retailer ratings + a couple of new individual-review URLs.
import { readFileSync, writeFileSync } from 'node:fs';

const RATINGS = {
  refrigerators: {
    'samsung-rf90f29aecr': {
      best_buy: { stars: 4.5, count: 230, url: 'https://bestbuy.com/site/samsung-bespoke-29-cu-ft-4-door-french-door-refrigerator-with-ai-family-hub-ai-vision-inside-charcoal-glass-stainless-steel/6615217.p?skuId=6615217' },
    },
    'samsung-rs28cb760012': {
      best_buy: { stars: 4.7, count: 684, url: 'https://www.bestbuy.com/site/samsung-bespoke-side-by-side-smart-refrigerator-with-beverage-center-white-glass/6529233.p?skuId=6529233' },
    },
  },
  dishwashers: {
    'maytag-mdfs3924rz': {
      best_buy: { stars: 4.4, count: 34, url: 'https://www.bestbuy.com/site/maytag-24-front-control-stainless-steel-tub-dishwasher-with-powerblast-cycle-and-50-dba-stainless-steel/6593016.p?skuId=6593016' },
    },
  },
  ovens: {},
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
  // Also append Reviewed individual review URL for Bosch B36CT80SNS
  if (file === 'refrigerators') {
    const m = data.models.find(x => x.id === 'bosch-b36ct80sns');
    if (m && m.ratings) {
      m.ratings.endorsements = m.ratings.endorsements || [];
      const have = new Set(m.ratings.endorsements.map(e => e.url));
      const newE = { channel: 'Reviewed', type: 'review', label: 'Reviewed.com individual review — Bosch B36CT80SNS French-door', url: 'https://www.reviewed.com/refrigerators/content/bosch-b36ct80sns-french-door-refrigerator-review' };
      if (!have.has(newE.url)) {
        m.ratings.endorsements.push(newE);
        touched++; totalUpdates++;
      }
    }
  }
  data._meta.retailer_ratings_pass_4_2026_05 = `Round 10 retailer-ratings backfill 2026-05-05: ${touched} additional entries.`;
  data._meta.last_updated = '2026-05-05';
  writeFileSync(path, JSON.stringify(data, null, 2) + '\n');
  console.log(`${file}: added ${touched} entries`);
}
console.log(`\nTotal: ${totalUpdates} updates`);
