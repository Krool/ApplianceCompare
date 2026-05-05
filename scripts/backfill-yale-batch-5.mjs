// Round 41: Yale Miele G7000 series article — 3 exact SKU matches in DB.
import { readFileSync, writeFileSync } from 'node:fs';

const URL = 'https://blog.yaleappliance.com/are-the-miele-g-7000-dishwashers-any-good';

const PATCHES = {
  'miele-g7196scvisf':  'Yale (Miele G7000 series review): G 7196 SCVi — "mid-range stainless steel model with top controls" ($2,149)',
  'miele-g7186scvi':    'Yale (Miele G7000 series review): G 7186 SCVi — "panel-ready configuration with top controls" ($1,949)',
  'miele-g7216scu':     'Yale (Miele G7000 series review): G 7216 SCU — "stainless steel with front controls" ($1,749)',
};

const path = 'public/data/dishwashers.json';
const data = JSON.parse(readFileSync(path, 'utf8'));
let touched = 0;
for (const m of data.models) {
  const label = PATCHES[m.id];
  if (!label) continue;
  m.ratings = m.ratings || {};
  m.ratings.endorsements = m.ratings.endorsements || [];
  const have = new Set(m.ratings.endorsements.map(e => e.url + '|' + (e.label || '').slice(0, 60)));
  const newE = { channel: 'Yale Appliance', type: 'article', label, url: URL };
  const key = newE.url + '|' + newE.label.slice(0, 60);
  if (!have.has(key)) {
    m.ratings.endorsements.push(newE);
    touched++;
  }
}
data._meta.batch_round41_2026_05 = `Round 41: ${touched} Yale Miele G7000 series article endorsements (exact SKU matches only).`;
data._meta.last_updated = '2026-05-05';
writeFileSync(path, JSON.stringify(data, null, 2) + '\n');
console.log(`dishwashers: added ${touched}`);
