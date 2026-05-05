// Round 38: tier upgrade pass — adds the FIRST retailer rating (and CR URL
// where applicable) to in-DB "limited"-tier models, pushing them up to
// "solid" tier in the score-confidence calculation. Each retailer_ratings
// addition counts as a new signal in helpers.jsx.
import { readFileSync, writeFileSync } from 'node:fs';

const FRIDGE = {
  CR_URLS: {
    'ge-gfe28gynfs':  'https://www.consumerreports.org/appliances/refrigerators/ge-gfe28gynfs/m401162/',
    'lg-lrfws2906v':  'https://www.consumerreports.org/appliances/refrigerators/lg-lrfws2906v/m406162/',
  },
  RETAILER: {
    'ge-gfe28gynfs':     { best_buy: { stars: 4.2, count: 467, url: 'https://www.bestbuy.com/site/reviews/ge-27-7-cu-ft-french-door-refrigerator-with-space-saving-ice-maker-stainless-steel/10886054' } },
    'lg-lrfws2906v':     { best_buy: { stars: 4.5, count: 42,  url: 'https://www.bestbuy.com/site/reviews/lg-29-cu-ft-french-door-in-door-smart-refrigerator-with-external-water-dispenser-stainless-steel/6494792' } },
    'maytag-mfi2570fez': { best_buy: { stars: 4.4, count: 611, url: 'https://www.bestbuy.com/site/reviews/maytag-24-7-cu-ft-french-door-refrigerator-stainless-steel/5495101' } },
  },
};

const DW = {
  CR_URLS: {},
  RETAILER: {
    // KitchenAid KDTF924PPS already had a retailer rating from earlier
    // (Best Buy 4.0/12 from round 4) — skip duplicate.
  },
};

const OV = {
  CR_URLS: {
    'samsung-nsi6dg9500sr':       'https://www.consumerreports.org/appliances/ranges/samsung-bespoke-nsi6dg9500sr/m416482/',
    'bosch-benchmark-ngmp059uc':  'https://www.consumerreports.org/appliances/cooktops/bosch-benchmark-ngmp059uc/m416254/',
  },
  RETAILER: {
    'samsung-nsi6dg9500sr':       { best_buy: { stars: 4.5, count: 120, url: 'https://www.bestbuy.com/site/samsung-bespoke-6-3-cu-ft-slide-in-electric-induction-range-with-ambient-edge-lighting-stainless-steel/6569005.p?skuId=6569005' } },
    'bosch-benchmark-ngmp059uc':  { best_buy: { stars: 5.0, count: 1,   url: 'https://www.bestbuy.com/site/bosch-benchmark-series-30-built-in-gas-cooktop-with-5-burners-with-flameselect-stainless-steel/6571840.p?skuId=6571840' } },
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
  data._meta[`${label}_2026_05`] = `Round 38 tier upgrade: ${crCount} CR URL upgrades + ${retailerCount} retailer ratings (each retailer add = new signal slot, pushes "limited" → "solid" in score-confidence tier).`;
  data._meta.last_updated = '2026-05-05';
  writeFileSync(path, JSON.stringify(data, null, 2) + '\n');
  console.log(`${file}: ${crCount} CR upgrades, ${retailerCount} retailer adds`);
}

applyToFile('refrigerators', FRIDGE.CR_URLS, FRIDGE.RETAILER, 'tier_upgrade_fridge');
applyToFile('dishwashers',   DW.CR_URLS,    DW.RETAILER,    'tier_upgrade_dw');
applyToFile('ovens',         OV.CR_URLS,    OV.RETAILER,    'tier_upgrade_oven');
