// Round 36: tag Reviewed.com picks from 4 best-of articles onto in-DB models.
// Sources:
//   - Best Electric Induction Cooktops (Reviewed)
//   - Best 36-inch Gas Cooktops (Reviewed)
//   - Best 36-inch Dual-Fuel Ranges (Reviewed)
//   - Best Refrigerators Under $1,000 (Reviewed)
import { readFileSync, writeFileSync } from 'node:fs';

const URLS = {
  ind_cooktops: 'https://www.reviewed.com/ovens/best-right-now/best-electric-induction-cooktops',
  gas_cooktops: 'https://www.reviewed.com/ovens/best-right-now/the-best-high-end-36-inch-gas-cooktops',
  dual_fuel:    'https://www.reviewed.com/ovens/best-right-now/the-best-36-inch-dual-fuel-ranges',
  under_1k:     'https://www.reviewed.com/refrigerators/best-right-now/best-refrigerators-under-1000',
};

const FRIDGE_PATCHES = {
  // hisense-hrb171n6ase, hotpoint-hps16btnrww, whirlpool-wrt311fzdm,
  // frigidaire-ffht1425vv already have Reviewed endorsements from earlier
  // rounds. Only add the under-$1k roundup citation if it's a distinct angle.
  'hisense-hrb171n6ase': {
    label: 'Reviewed (Best Refrigerators Under $1,000): Best Overall — "steady temperatures in both fridge and freezer; great value"',
    url: URLS.under_1k,
  },
  'hotpoint-hps16btnrww': {
    label: 'Reviewed (Best Refrigerators Under $1,000): Top-freezer tested — "stable temperatures, great value"',
    url: URLS.under_1k,
  },
  'whirlpool-wrt311fzdm': {
    label: 'Reviewed (Best Refrigerators Under $1,000): Top-freezer tested — "energy efficient with glass shelves"',
    url: URLS.under_1k,
  },
  'frigidaire-ffht1425vv': {
    label: 'Reviewed (Best Refrigerators Under $1,000): Top-freezer tested — "great size for smaller spaces, good temperature consistency"',
    url: URLS.under_1k,
  },
  // GE GTS22KGNRBB is the black-finish sibling of in-DB ge-gts22kynrs.
  // Same product, different finish SKU — fair to apply the family endorsement.
  'ge-gts22kynrs': {
    label: 'Reviewed (Best Refrigerators Under $1,000): GTS22K family tested — "maintains stable temperatures, large freezer, garage-ready"',
    url: URLS.under_1k,
  },
};

const OVEN_PATCHES = {
  // PHP9036DJBB (in DB) is the DJBB-finish sibling of the DTBB picked by
  // Reviewed — same induction cooktop family.
  'ge-profile-php9036djbb': {
    label: 'Reviewed (Best Electric Induction Cooktops): "Best 36-inch Induction Cooktop" (PHP9036 family) — "5-burner with SyncBurner technology and built-in Wi-Fi"',
    url: URLS.ind_cooktops,
  },
  'frigidaire-pcci3080af': {
    label: 'Reviewed (Best Electric Induction Cooktops): "powerful 5,200-watt 11-inch PowerPlus burner, plus a bridge burner"',
    url: URLS.ind_cooktops,
  },
  'thermador-sgsx365ts': {
    label: 'Reviewed (Best 36-inch Gas Cooktops): Best Gas Cooktop — "five-burner cooktop delivers high temperatures, even cooking, and a stylish look"',
    url: URLS.gas_cooktops,
  },
  'ge-profile-pgp7036slss': {
    label: 'Reviewed (Best 36-inch Gas Cooktops): tested — "sleek construction, continuous steel grating"',
    url: URLS.gas_cooktops,
  },
  'kitchenaid-ksdb900ess': {
    label: 'Reviewed (Best 36-inch Dual-Fuel Ranges): Best 36-inch Dual-Fuel — "fine control for your burners, mostly even baking"',
    url: URLS.dual_fuel,
  },
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
    const newE = { channel: 'Reviewed', type: 'roundup', label: patch.label, url: patch.url };
    const key = newE.url + '|' + newE.label.slice(0, 60);
    if (!have.has(key)) {
      m.ratings.endorsements.push(newE);
      touched++; totalAdded++;
    }
  }
  data._meta.reviewed_batch_round36_2026_05 = `Round 36: ${touched} Reviewed.com category-roundup endorsements (best induction cooktops, best 36in gas cooktops, best 36in dual-fuel, best fridges under $1k).`;
  data._meta.last_updated = '2026-05-05';
  writeFileSync(path, JSON.stringify(data, null, 2) + '\n');
  console.log(`${file}: added ${touched} endorsements`);
}
console.log(`\nTotal: ${totalAdded}`);
