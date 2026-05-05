// Round 28: more model-specific CR URL upgrades. Each URL was returned by
// a `site:consumerreports.org <model>` search this session.
import { readFileSync, writeFileSync } from 'node:fs';

const CR_URLS = {
  refrigerators: {
    'lg-lrmxs2806s':       'https://www.consumerreports.org/appliances/refrigerators/lg-lrmxs2806s/m404731/',
    'ge-gne27jymfs':       'https://www.consumerreports.org/appliances/refrigerators/ge-gne27jymfs/m408664/',
    'bosch-b36it905np':    'https://www.consumerreports.org/products/refrigerators-28978/built-in-refrigerator-28720/bosch-benchmark-b36it905np-405010/',
  },
  dishwashers: {
    'bosch-shx78cm5n':     'https://www.consumerreports.org/appliances/dishwashers/bosch-800-series-shx78cm5n/m410625/',
    'bosch-she53c85n':     'https://www.consumerreports.org/appliances/dishwashers/bosch-300-series-she53c85n/m410627/',
    'bosch-shp9pcm5n':     'https://www.consumerreports.org/appliances/dishwashers/bosch-benchmark-shp9pcm5n/m410623/',
    'bosch-shx5aem5n':     'https://www.consumerreports.org/appliances/dishwashers/bosch-100-series-shx5aem5n/m410626/',
  },
  ovens: {
    'ge-profile-php9036djbb': 'https://www.consumerreports.org/products/cooktops-28977/electric-induction-cooktops-200764/ge-profile-php9036djbb-406513/',
    'lg-lrel6321s':           'https://www.consumerreports.org/products/ranges-28974/electric-range-28689/lg-lrel6321s-403097/',
    'frigidaire-gcfe3059bf':  'https://www.consumerreports.org/appliances/ranges/frigidaire-gallery-gcfe3059bf/m417608/',
    'cafe-cts70dp2ns1':       'https://www.consumerreports.org/appliances/wall-ovens/cafe-cts70dp2ns1/m404933/',
    'ge-profile-pss93ypfs':   'https://www.consumerreports.org/appliances/ranges/ge-profile-pss93ypfs/m402512/',
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
  data._meta.cr_url_upgrade_2_2026_05 = `Round 28: ${touched} more CR model-specific review URLs (existing in-DB models, not new entries).`;
  data._meta.last_updated = '2026-05-05';
  writeFileSync(path, JSON.stringify(data, null, 2) + '\n');
  console.log(`${file}: upgraded ${touched} CR URLs`);
}
console.log(`\nTotal: ${totalUpgraded}`);
