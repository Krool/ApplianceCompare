// Round 39: more Reviewed.com + Yale category-roundup endorsements.
import { readFileSync, writeFileSync } from 'node:fs';

const URLS = {
  reviewed_cd:  'https://www.reviewed.com/refrigerators/best-right-now/best-counter-depth-fridges-refrigerators',
  yale_cd_max:  'https://blog.yaleappliance.com/largest-counter-depth-french-door-refrigerators',
};

const FRIDGE_PATCHES = {
  // Bosch B36CL81ENW is the W-finish variant; Reviewed picked B36CL81ENG (G-finish) as Best for Wine Lovers
  'bosch-b36cl81enw': {
    label: 'Reviewed (Best Counter-Depth Refrigerators): "Best for Wine Lovers" — "dedicated wine drawer is a stand-out feature of this stylish and high-performing Bosch fridge" (B36CL81 family)',
    url: URLS.reviewed_cd,
  },
  'lg-lrfoc2606s': {
    label: 'Yale (Largest Counter-Depth French-Door): tested — 25.5 cu ft InstaView with PrintProof finish',
    url: URLS.yale_cd_max,
  },
  'jennair-jffcc72efs': {
    label: 'Yale (Largest Counter-Depth French-Door): tested — Preserva Food Care system with ethylene gas filter',
    url: URLS.yale_cd_max,
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
  const channel = patch.url.includes('yaleappliance') ? 'Yale Appliance' : 'Reviewed';
  const newE = { channel, type: channel === 'Yale Appliance' ? 'article' : 'roundup', label: patch.label, url: patch.url };
  const key = newE.url + '|' + newE.label.slice(0, 60);
  if (!have.has(key)) {
    m.ratings.endorsements.push(newE);
    touched++; added++;
  }
}
data._meta.batch_round39_2026_05 = `Round 39: ${touched} more Reviewed/Yale category endorsements on in-DB fridges (jennair-jffcc72efs was 0-source before this).`;
data._meta.last_updated = '2026-05-05';
writeFileSync(path, JSON.stringify(data, null, 2) + '\n');
console.log(`refrigerators: added ${touched} endorsements`);
console.log(`Total: ${added}`);
