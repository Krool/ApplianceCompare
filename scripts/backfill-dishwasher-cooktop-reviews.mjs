// Round 33: high-CR dishwashers + frigidaire pro cooktop — Best Buy retailer
// ratings + a couple CR URL upgrades.
import { readFileSync, writeFileSync } from 'node:fs';

const DW = {
  CR_URLS: {
    'lg-ldfc353ls': 'https://www.consumerreports.org/appliances/dishwashers/lg-ldfc353ls-lowe-s/m413861/',
  },
  RETAILER: {
    'bosch-shx78cm5n': { best_buy: { stars: 4.5, count: 369, url: 'https://www.bestbuy.com/site/bosch-800-series-24-top-control-smart-built-in-tub-dishwasher-with-flexible-3rd-rack-42-dba-stainless-steel/6542978.p?skuId=6542978' } },
    'bosch-she53c85n': { best_buy: { stars: 4.3, count: 321, url: 'https://www.bestbuy.com/site/bosch-300-series-24-front-control-smart-built-in-stainless-steel-tub-dishwasher-with-3rd-rack-and-aquastop-plus-46dba-stainless-steel/6542986.p?skuId=6542986' } },
    'bosch-shp65cm5n': { best_buy: { stars: 4.4, count: 721, url: 'https://www.bestbuy.com/product/bosch-500-series-24-top-control-smart-built-in-tub-dishwasher-with-3rd-rack-and-autoair-44-dba-stainless-steel/J3P322SZY3' } },
  },
};

const OV = {
  CR_URLS: {
    'frigidaire-pcci3080af': 'https://www.consumerreports.org/appliances/cooktops/frigidaire-professional-pcci3080af/m416949/',
  },
  RETAILER: {
    'frigidaire-pcci3080af': { best_buy: { stars: 4.7, count: 17, url: 'https://www.bestbuy.com/product/frigidaire-professional-30-induction-cooktop-stainless-steel/J7CJ3R2JHQ' } },
  },
};

function applyToFile(file, crUrls, ratings, label) {
  const path = `public/data/${file}.json`;
  const data = JSON.parse(readFileSync(path, 'utf8'));
  let crCount = 0, retailerCount = 0;
  for (const m of data.models) {
    if (m.retired) continue;
    const crUrl = crUrls[m.id];
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
    const r = ratings[m.id];
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
  data._meta[`${label}_2026_05`] = `Round 33: ${crCount} CR URL upgrades + ${retailerCount} retailer ratings.`;
  data._meta.last_updated = '2026-05-05';
  writeFileSync(path, JSON.stringify(data, null, 2) + '\n');
  console.log(`${file}: ${crCount} CR URL upgrades, ${retailerCount} retailer ratings`);
}

applyToFile('dishwashers', DW.CR_URLS, DW.RETAILER, 'dw_round33');
applyToFile('ovens', OV.CR_URLS, OV.RETAILER, 'ov_round33');
