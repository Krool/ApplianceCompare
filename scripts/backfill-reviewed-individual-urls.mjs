// Round 16: add Reviewed.com individual-review URLs as endorsements for
// every model where I've confirmed a dedicated review page via search.
// Each URL was returned by a `site:reviewed.com <model>` search this session.
import { readFileSync, writeFileSync } from 'node:fs';

const REVIEWED = {
  refrigerators: {
    'whirlpool-wrt311fzdm': 'https://www.reviewed.com/refrigerators/content/whirlpool-wrt311fzdm-refrigerator-review',
    'bosch-b36fd50sns':     'https://www.reviewed.com/refrigerators/content/bosch-b36fd50sns-french-door-refrigerator-review',
    'samsung-rs28cb760012': 'https://www.reviewed.com/refrigerators/content/samsung-bespoke-rs28cb7600-side-by-side-refrigerator-review',
    'whirlpool-wrx735sdhz': 'https://www.reviewed.com/refrigerators/content/whirlpool-wrx735sdhz-french-door-refrigerator-review',
    'cafe-cae28dm5ts5':     'https://www.reviewed.com/refrigerators/content/ge-cafe-cae28dm5ts5-4-door-french-door-fridge-review',
    'lg-lrflc2706s':        'https://www.reviewed.com/refrigerators/content/lg-lrflc2706s-french-door-refrigerator-review',
    'lg-lrfoc2606s':        'https://www.reviewed.com/refrigerators/content/lg-lrfoc2606s-review',
    'samsung-rf29db9900qd': 'https://www.reviewed.com/refrigerators/content/samsung-bespoke-refrigerator-rf29db9900qd-review',
    'samsung-rf29bb8600ap': 'https://www.reviewed.com/refrigerators/content/samsung-rf29bb8600ap-french-door-refrigerator-review',
    'samsung-rf30bb6600ql': 'https://www.reviewed.com/refrigerators/content/samsung-rf30bb6600ql-french-door-refrigerator-review',
    'lg-lrmvs3006s':        'https://www.reviewed.com/refrigerators/content/lg-lrmvs3006s-refrigerator-review',
    'lg-lrfdc2406s':        'https://www.reviewed.com/refrigerators/content/lg-lrfdc2406s-french-door-refrigerator-review',
  },
  dishwashers: {
    'bosch-shp78cm5n':      'https://www.reviewed.com/dishwashers/content/bosch-800-series-shp78cm5n-dishwasher-review',
    'bosch-she3aem2n':      'https://www.reviewed.com/dishwashers/content/bosch-she3aem2n-100-series-dishwasher-review',
    'maytag-mdb4949skz':    'https://www.reviewed.com/dishwashers/content/maytag-mdb4949skz-dishwasher-review',
    'lg-ldth7972s':         'https://www.reviewed.com/dishwashers/content/lg-ldth7972s-dishwasher-review',
    'bosch-shp9pcm5n':      'https://www.reviewed.com/products/bosch-benchmark-shp9pcm5n-dishwasher',
  },
  ovens: {
    'frigidaire-gcfi3060bf':   'https://www.reviewed.com/ovens/content/frigidaire-gallery-gcfi3060bf-induction-range-review',
    'ge-profile-phs93xypfs':   'https://www.reviewed.com/ovens/content/ge-profile-phs93xypfs-slide-induction-range-review',
    'whirlpool-wge745c0fs':    'https://www.reviewed.com/ovens/content/whirlpool-wge745c0fs-electric-range-review',
    'samsung-nsi6db990012aa':  'https://www.reviewed.com/ovens/content/samsung-bespoke-induction-range-nsi6db990012-review',
    'cafe-chs900p2ms1':        'https://www.reviewed.com/ovens/content/cafe-chs900p2ms1-induction-range-review',
    'lg-lrgl5825f':            'https://www.reviewed.com/ovens/content/lg-lrgl5825f-freestanding-gas-range-review',
    'kitchenaid-ksdb900ess':   'https://www.reviewed.com/ovens/content/kitchenaid-ksdb900ess-dual-fuel-slide-in-range-review',
  },
};

let totalAdded = 0;
for (const [file, byId] of Object.entries(REVIEWED)) {
  const path = `public/data/${file}.json`;
  const data = JSON.parse(readFileSync(path, 'utf8'));
  let touched = 0;
  for (const m of data.models) {
    const url = byId[m.id];
    if (!url) continue;
    m.ratings = m.ratings || {};
    m.ratings.endorsements = m.ratings.endorsements || [];
    const have = new Set(m.ratings.endorsements.map(e => e.url));
    if (have.has(url)) continue;
    m.ratings.endorsements.push({
      channel: 'Reviewed',
      type: 'review',
      label: 'Reviewed.com individual review',
      url,
    });
    // Also stash in source_urls so the schema-aware UI can find it
    m.ratings.source_urls = m.ratings.source_urls || {};
    if (!m.ratings.source_urls.reviewed_individual) {
      m.ratings.source_urls.reviewed_individual = url;
    }
    touched++;
    totalAdded++;
  }
  data._meta.reviewed_individual_pass_2026_05 = `Round 16: ${touched} models received Reviewed.com individual-review URL endorsements (verified via site:reviewed.com search).`;
  data._meta.last_updated = '2026-05-05';
  writeFileSync(path, JSON.stringify(data, null, 2) + '\n');
  console.log(`${file}: added ${touched} Reviewed individual-review URLs`);
}
console.log(`\nTotal: ${totalAdded} URLs added`);
