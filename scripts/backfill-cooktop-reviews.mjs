// Round 30: cooktop coverage — both CR URL upgrades AND Best Buy retailer
// ratings for high-CR cooktops that previously had only Yale-brand citation.
// All target models are existing in-DB entries.
import { readFileSync, writeFileSync } from 'node:fs';

const CR_URLS = {
  'bosch-nit8060uc':       'https://www.consumerreports.org/appliances/cooktops/bosch-800-series-nit8060uc/m408392/',
  'lg-cbih3613be':         'https://www.consumerreports.org/appliances/cooktops/lg-cbih3613be/m416607/',
  'lg-studio-cbis3618be':  'https://www.consumerreports.org/appliances/cooktops/lg-studio-cbis3618be/m410570/',
  'lg-cbih3013be':         'https://www.consumerreports.org/appliances/cooktops/lg-cbih3013be/m415023/',
  'cafe-chp90362tss':      'https://www.consumerreports.org/appliances/cooktops/cafe-chp90362tss/m417312/',
  'electrolux-ecci3068as': 'https://www.consumerreports.org/appliances/cooktops/electrolux-ecci3068as/m405552/',
};

const RETAILER_RATINGS = {
  'bosch-nit8060uc':      { best_buy: { stars: 4.6, count: 17,  url: 'https://www.bestbuy.com/site/bosch-800-series-30-built-in-electric-induction-cooktop-with-4-elements-and-wifi-frameless-black/6496114.p?skuId=6496114' } },
  'lg-cbih3613be':        { best_buy: { stars: 4.2, count: 12,  url: 'https://www.bestbuy.com/product/lg-36-built-in-electric-induction-smart-cooktop-with-5-elements-and-ultraheat-4-3kw-power-element-black-ceramic/J7G56583XS' } },
  'lg-studio-cbis3618be': { best_buy: { stars: 5.0, count: 4,   url: 'https://www.bestbuy.com/product/lg-studio-36-built-in-smart-electric-induction-cooktop-with-5-burners-and-flex-cooking-zone-black/JJ8VPZQKSR' } },
  'lg-cbih3013be':        { best_buy: { stars: 4.4, count: 41,  url: 'https://www.bestbuy.com/product/lg-30-built-in-electric-induction-smart-cooktop-with-4-elements-and-ultraheat-4-3kw-power-element-black-ceramic/J7G5658329' } },
};

const path = 'public/data/ovens.json';
const data = JSON.parse(readFileSync(path, 'utf8'));
let crCount = 0, retailerCount = 0;
for (const m of data.models) {
  if (m.retired) continue;
  // CR URL upgrade
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
  // Retailer rating
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
data._meta.cooktop_pass_2026_05 = `Round 30: high-CR cooktops — ${crCount} model-specific CR URLs upgraded, ${retailerCount} Best Buy retailer ratings added.`;
data._meta.last_updated = '2026-05-05';
writeFileSync(path, JSON.stringify(data, null, 2) + '\n');
console.log(`ovens: ${crCount} CR URL upgrades, ${retailerCount} retailer ratings`);
