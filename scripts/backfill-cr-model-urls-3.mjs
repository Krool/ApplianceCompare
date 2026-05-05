// Round 29: more CR URL upgrades. Existing in-DB models only — no new entries.
import { readFileSync, writeFileSync } from 'node:fs';

const CR_URLS = {
  refrigerators: {
    'whirlpool-wrf555sdfz':  'https://www.consumerreports.org/appliances/refrigerators/whirlpool-wrf555sdfz/m387126/',
    'samsung-rt70f18lrsr':   'https://www.consumerreports.org/appliances/refrigerators/samsung-rt70f18lrsr/m417041/',
  },
  dishwashers: {
    'whirlpool-wdt750sakz':  'https://www.consumerreports.org/appliances/dishwashers/whirlpool-wdt750sakz/m403608/',
    'samsung-dw80b7070us':   'https://www.consumerreports.org/appliances/dishwashers/samsung-dw80b7070us/m406581/',
    'miele-g7176scvi':       'https://www.consumerreports.org/appliances/dishwashers/miele-g7176scvi/m410064/',
    'bosch-shp65cm5n':       'https://www.consumerreports.org/appliances/dishwashers/bosch-500-series-shp65cm5n/m410624/',
  },
  ovens: {
    'frigidaire-gcre3060bf': 'https://www.consumerreports.org/appliances/ranges/frigidaire-gallery-gcre3060bf/m417044/',
    'lg-lrel6325f':          'https://www.consumerreports.org/appliances/ranges/lg-lrel6325f/m402113/',
    'samsung-ne63a6711ss':   'https://www.consumerreports.org/appliances/ranges/samsung-ne63a6711ss/m403780/',
    'bosch-hei8056u':        'https://www.consumerreports.org/appliances/ranges/bosch-hei8056u/m402513/',
    'frigidaire-fcfe3083as': 'https://www.consumerreports.org/appliances/ranges/frigidaire-fcfe3083as/m409398/',
    'ge-profile-pb900yvfs':  'https://www.consumerreports.org/appliances/ranges/ge-profile-pb900yvfs/m413387/',
  },
};

let totalUpgraded = 0;
for (const [file, byId] of Object.entries(CR_URLS)) {
  const path = `public/data/${file}.json`;
  const data = JSON.parse(readFileSync(path, 'utf8'));
  let touched = 0;
  for (const m of data.models) {
    const url = byId[m.id];
    if (!url) continue;
    m.ratings = m.ratings || {};
    m.ratings.source_urls = m.ratings.source_urls || {};
    const oldUrl = m.ratings.source_urls.cr;
    const isGenericUrl = !oldUrl || oldUrl.includes('/buying-guide/') || oldUrl.includes('/most-reliable-products/') || !oldUrl.includes('/m');
    if (isGenericUrl) {
      m.ratings.source_urls.cr = url;
      touched++; totalUpgraded++;
    }
  }
  data._meta.cr_url_upgrade_3_2026_05 = `Round 29: ${touched} more CR model-specific review URLs (existing in-DB models only).`;
  data._meta.last_updated = '2026-05-05';
  writeFileSync(path, JSON.stringify(data, null, 2) + '\n');
  console.log(`${file}: upgraded ${touched} CR URLs`);
}
console.log(`\nTotal: ${totalUpgraded}`);
