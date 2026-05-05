// Round 31: high-CR fridges — CR URL upgrades + Best Buy retailer ratings
// for in-DB models that previously had only the Yale brand citation.
import { readFileSync, writeFileSync } from 'node:fs';

const CR_URLS = {
  'lg-lt18s2100w':       'https://www.consumerreports.org/appliances/refrigerators/lg-lt18s2100w/m414246/',
  'lg-lbnc15231v':       'https://www.consumerreports.org/appliances/refrigerators/lg-lbnc15231v/m399868/',
  'miele-kfn4776ed':     'https://www.consumerreports.org/appliances/refrigerators/miele-kfn4776ed/m417681/',
};

const RETAILER_RATINGS = {
  'miele-kfn4776ed':  { best_buy: { stars: 4.8, count: 4, url: 'https://www.bestbuy.com/site/searchpage.jsp?st=KFN4776ED' } },
  'bosch-b36bt935ns': { best_buy: { stars: 4.5, count: 2, url: 'https://www.bestbuy.com/product/bosch-benchmark-series-19-4-cu-ft-french-door-built-in-smart-refrigerator-stainless-steel/J3P322SS4R' } },
};

const path = 'public/data/refrigerators.json';
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
  const ratings = RETAILER_RATINGS[m.id];
  if (ratings) {
    m.ratings = m.ratings || {};
    m.ratings.retailer_ratings = m.ratings.retailer_ratings || {};
    for (const [retailer, data2] of Object.entries(ratings)) {
      if (m.ratings.retailer_ratings[retailer]) continue;
      m.ratings.retailer_ratings[retailer] = data2;
      retailerCount++;
    }
  }
}
data._meta.fridge_cr_retailer_pass_2026_05 = `Round 31: high-CR fridges — ${crCount} CR URL upgrades, ${retailerCount} retailer ratings.`;
data._meta.last_updated = '2026-05-05';
writeFileSync(path, JSON.stringify(data, null, 2) + '\n');
console.log(`refrigerators: ${crCount} CR URL upgrades, ${retailerCount} retailer ratings`);
