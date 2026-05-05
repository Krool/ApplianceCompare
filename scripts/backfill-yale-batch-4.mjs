// Round 40: Yale 33-inch counter-depth article — only the exact-match
// in-DB model gets the endorsement (not the 36"-platform-cousin variants
// of the 42/48" Thermador Freedom and Sub-Zero Classic models, which
// would be over-attribution).
import { readFileSync, writeFileSync } from 'node:fs';

const URLS = {
  yale_33in_cd:    'https://blog.yaleappliance.com/33-inch-counter-depth-refrigerators',
  yale_integrated: 'https://blog.yaleappliance.com/best-integrated-refrigerators',
};

const FRIDGE_PATCHES = {
  'samsung-rf18a5101sr': {
    label: 'Yale (Best 33-inch Counter-Depth): tested — "affordable price for a counter-depth French door refrigerator" ($1,099-$1,499)',
    url: URLS.yale_33in_cd,
  },
  'miele-kf2982vi': {
    label: 'Yale (Best Integrated Refrigerators): KF 2982 family — "Best Temperature Control" with PerfectFresh Technology allowing humidity adjustment for different produce types',
    url: URLS.yale_integrated,
  },
};

let added = 0;
const path = 'public/data/refrigerators.json';
const data = JSON.parse(readFileSync(path, 'utf8'));
let touched = 0;
for (const m of data.models) {
  const patch = FRIDGE_PATCHES[m.id];
  if (!patch) continue;
  m.ratings = m.ratings || {};
  m.ratings.endorsements = m.ratings.endorsements || [];
  const have = new Set(m.ratings.endorsements.map(e => e.url + '|' + (e.label || '').slice(0, 60)));
  const newE = { channel: 'Yale Appliance', type: 'article', label: patch.label, url: patch.url };
  const key = newE.url + '|' + newE.label.slice(0, 60);
  if (!have.has(key)) {
    m.ratings.endorsements.push(newE);
    touched++; added++;
  }
}
data._meta.batch_round40_2026_05 = `Round 40: ${touched} Yale 33-inch counter-depth article endorsement (only exact-match in-DB models).`;
data._meta.last_updated = '2026-05-05';
writeFileSync(path, JSON.stringify(data, null, 2) + '\n');
console.log(`refrigerators: added ${touched} endorsements`);
