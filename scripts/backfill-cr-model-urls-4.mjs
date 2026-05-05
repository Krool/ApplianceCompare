// Round 32: more CR URL upgrades (existing in-DB models).
import { readFileSync, writeFileSync } from 'node:fs';

const CR_URLS = {
  refrigerators: {},
  dishwashers: {
    'lg-ldfn4542s':    'https://www.consumerreports.org/appliances/dishwashers/lg-ldfn4542s/m403609/',
    'lg-ldts5552s':    'https://www.consumerreports.org/appliances/dishwashers/lg-ldts5552s/m404462/',
    'lg-ldpn454ht':    'https://www.consumerreports.org/appliances/dishwashers/lg-ldpn454ht-home-depot/m414654/',
    'lg-adfd5448at':   'https://www.consumerreports.org/appliances/dishwashers/lg-adfd5448at/m414655/',
  },
  ovens: {
    'samsung-nx60a6711ss': 'https://www.consumerreports.org/products/ranges-28974/gas-range-28694/samsung-nx60a6711ss-403962/',
  },
};

let totalUpgraded = 0;
for (const [file, byId] of Object.entries(CR_URLS)) {
  if (Object.keys(byId).length === 0) continue;
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
  data._meta.cr_url_upgrade_4_2026_05 = `Round 32: ${touched} more CR model-specific review URLs.`;
  data._meta.last_updated = '2026-05-05';
  writeFileSync(path, JSON.stringify(data, null, 2) + '\n');
  console.log(`${file}: upgraded ${touched} CR URLs`);
}
console.log(`\nTotal: ${totalUpgraded}`);
