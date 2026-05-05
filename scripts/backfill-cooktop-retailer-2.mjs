// Round 34: more cooktop retailer ratings + a CR URL.
import { readFileSync, writeFileSync } from 'node:fs';

const RATINGS = {
  'cafe-chp90362tss':         { best_buy: { stars: 3.0, count: 6,  url: 'https://www.bestbuy.com/site/cafe-36-electric-built-in-cooktop-customizable-stainless-steel/6527328.p?skuId=6527328' } },
  'kitchenaid-kced606gbl':    { best_buy: { stars: 4.6, count: 36, url: 'https://www.bestbuy.com/product/kitchenaid-36-electric-cooktop-black/J3KHV89Q9V' } },
  'ge-profile-php9036djbb':   { best_buy: { stars: 4.5, count: 34, url: 'https://www.bestbuy.com/site/ge-profile-36-built-in-electric-induction-cooktop-black-on-black/7686073.p?skuId=7686073' } },
};

const CR_URLS = {
  'kitchenaid-kced606gbl': 'https://www.consumerreports.org/appliances/cooktops/kitchenaid-kced606gbl/m401542/',
};

const path = 'public/data/ovens.json';
const data = JSON.parse(readFileSync(path, 'utf8'));
let crCount = 0, retailerCount = 0;
for (const m of data.models) {
  if (m.retired) continue;
  const crUrl = CR_URLS[m.id];
  if (crUrl) {
    m.ratings = m.ratings || {};
    m.ratings.source_urls = m.ratings.source_urls || {};
    const oldUrl = m.ratings.source_urls.cr;
    const isGenericUrl = !oldUrl || oldUrl.includes('/buying-guide/') || oldUrl.includes('/most-reliable-products/') || !oldUrl.includes('/m');
    if (isGenericUrl) {
      m.ratings.source_urls.cr = crUrl;
      crCount++;
    }
  }
  const r = RATINGS[m.id];
  if (r) {
    m.ratings = m.ratings || {};
    m.ratings.retailer_ratings = m.ratings.retailer_ratings || {};
    for (const [retailer, data2] of Object.entries(r)) {
      if (m.ratings.retailer_ratings[retailer]) continue;
      m.ratings.retailer_ratings[retailer] = data2;
      retailerCount++;
    }
  }
}
data._meta.cooktop_round34_2026_05 = `Round 34: ${crCount} CR URL upgrades + ${retailerCount} cooktop retailer ratings.`;
data._meta.last_updated = '2026-05-05';
writeFileSync(path, JSON.stringify(data, null, 2) + '\n');
console.log(`ovens: ${crCount} CR upgrades, ${retailerCount} retailer ratings`);
