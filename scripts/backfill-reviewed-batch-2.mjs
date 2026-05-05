// Round 37: more Reviewed.com category-roundup endorsements.
// Sources:
//   - Best Stainless-Steel Refrigerators Under $2,000
//   - Best Side-by-Side Refrigerators
//   - Best Ranges Under $800
//   - Best Double Oven Ranges
import { readFileSync, writeFileSync } from 'node:fs';

const URLS = {
  ss_under_2k:  'https://www.reviewed.com/refrigerators/best-right-now/best-stainless-steel-fridges-under-2000',
  side_by_side: 'https://www.reviewed.com/refrigerators/best-right-now/best-side-by-side-fridges-refrigerators',
  under_800:    'https://www.reviewed.com/ovens/best-right-now/best-gas-electric-ranges-under-800',
  double_oven:  'https://www.reviewed.com/ovens/best-right-now/best-double-oven-ranges',
};

const FRIDGE_PATCHES = {
  'whirlpool-wrb322dmbm':  { label: 'Reviewed (Best Stainless-Steel Fridges Under $2,000): tested — French-door pick noted as solid value', url: URLS.ss_under_2k },
  'frigidaire-frss2623as': [
    { label: 'Reviewed (Best Stainless-Steel Fridges Under $2,000): tested side-by-side', url: URLS.ss_under_2k },
    { label: 'Reviewed (Best Side-by-Side Refrigerators): "Best Value" — "solid temperatures, lots of storage, through-the-door dispenser"', url: URLS.side_by_side },
  ],
  'samsung-rs27t5200sr':   [
    { label: 'Reviewed (Best Stainless-Steel Fridges Under $2,000): tested side-by-side', url: URLS.ss_under_2k },
    { label: 'Reviewed (Best Side-by-Side Refrigerators): tested — "tons of storage and won\'t miss smart features"', url: URLS.side_by_side },
  ],
};

const OVEN_PATCHES = {
  // Note: ge-jbs60dkbb is the BB-finish variant of the WW reviewed by Reviewed
  'ge-jbs60dkbb': { label: 'Reviewed (Best Ranges Under $800): JBS60DKWW family tested — "lacks special features, but does a good job with baking and roasting"', url: URLS.under_800 },
  'ge-jgbs66rekss': { label: 'Reviewed (Best Ranges Under $800): tested — "center-mounted griddle is a nifty addition"', url: URLS.under_800 },
  // KFGD500EBS = the EBS finish; KFGD500ESS in DB is the SS finish — same product family
  'kitchenaid-kfgd500ess': { label: 'Reviewed (Best Double Oven Ranges): KFGD500 family tested — "Even-Heat True Convection allows your oven to heat up evenly"', url: URLS.double_oven },
  'maytag-met8800fz': { label: 'Reviewed (Best Double Oven Ranges): tested — "powerful stove-top elements, True Convection, 10-year limited parts warranty"', url: URLS.double_oven },
  // whirlpool-wge745c0fs is the Best Double Oven — already tagged in earlier rounds with the broader best-electric-ranges article. Adding the more specific best-double-oven URL here.
  'whirlpool-wge745c0fs': { label: 'Reviewed (Best Double Oven Ranges): "Best Double Oven Range" — "effective burners, spacious ovens that evenly bake food"', url: URLS.double_oven },
};

let totalAdded = 0;
for (const [file, patches] of [['refrigerators', FRIDGE_PATCHES], ['ovens', OVEN_PATCHES]]) {
  const path = `public/data/${file}.json`;
  const data = JSON.parse(readFileSync(path, 'utf8'));
  let touched = 0;
  for (const m of data.models) {
    const patch = patches[m.id];
    if (!patch) continue;
    m.ratings = m.ratings || {};
    m.ratings.endorsements = m.ratings.endorsements || [];
    const have = new Set(m.ratings.endorsements.map(e => e.url + '|' + (e.label || '').slice(0, 60)));
    const entries = Array.isArray(patch) ? patch : [patch];
    for (const p of entries) {
      const newE = { channel: 'Reviewed', type: 'roundup', label: p.label, url: p.url };
      const key = newE.url + '|' + newE.label.slice(0, 60);
      if (!have.has(key)) {
        m.ratings.endorsements.push(newE);
        have.add(key);
        touched++; totalAdded++;
      }
    }
  }
  data._meta.reviewed_batch_round37_2026_05 = `Round 37: ${touched} more Reviewed.com category endorsements (under-$2k stainless, side-by-side, under-$800 ranges, double-oven).`;
  data._meta.last_updated = '2026-05-05';
  writeFileSync(path, JSON.stringify(data, null, 2) + '\n');
  console.log(`${file}: added ${touched} endorsements`);
}
console.log(`\nTotal: ${totalAdded}`);
