// Round 13: Yale's 36-inch induction range picks attached to existing models.
// Yale article doesn't cite per-model service rates here, but the brand rates
// are on file; the endorsement quote is what's new.
import { readFileSync, writeFileSync } from 'node:fs';

const URL = 'https://blog.yaleappliance.com/best-36-inch-induction-ranges';

const PATCHES = {
  'bosch-his8655u': {
    label: "Yale 2026: Best budget-conscious 36-inch induction range — 'Best if you want the Bosch name or any brand name at a lower price.'",
  },
  'wolf-ir36551': {
    label: "Yale 2026: 'Best for bakers who want power and consistency.' Top 36-inch induction for baking.",
  },
  'miele-hr1632-3i': {
    label: "Yale 2026: 'If you bake or roast a lot and want humidity control in a full-size range, start here.' Steam-injected oven 36-inch induction pick.",
    // Already endorsed in earlier round; just append.
    append: true,
  },
};

const path = 'public/data/ovens.json';
const data = JSON.parse(readFileSync(path, 'utf8'));
let touched = 0;
for (const m of data.models) {
  const patch = PATCHES[m.id];
  if (!patch) continue;
  m.ratings = m.ratings || {};
  m.ratings.endorsements = m.ratings.endorsements || [];
  const have = new Set(m.ratings.endorsements.map(e => e.url + '|' + e.label));
  const newE = { channel: 'Yale Appliance', type: 'article', label: patch.label, url: URL };
  const key = newE.url + '|' + newE.label;
  if (!have.has(key)) {
    m.ratings.endorsements.push(newE);
    touched++;
  }
}
data._meta.yale_36inch_pass_2026_05 = `Round 13 backfill 2026-05-05: ${touched} models received Yale 2026 'Best 36-inch Induction Range' endorsement.`;
data._meta.last_updated = '2026-05-05';
writeFileSync(path, JSON.stringify(data, null, 2) + '\n');
console.log(`ovens: added ${touched} Yale 36-inch endorsements`);
