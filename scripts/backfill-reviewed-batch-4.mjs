// Round 45: 4 more high-yield Reviewed.com category-roundups.
// Articles: best-refrigerators (main guide), best-french-door (round 2),
// best-refrigerators-under-1000, best-dishwashers (main guide).
import { readFileSync, writeFileSync } from 'node:fs';

const URLS = {
  fridges_main:    'https://www.reviewed.com/refrigerators/best-right-now/best-refrigerators',
  french_door:     'https://www.reviewed.com/refrigerators/best-right-now/best-french-door-fridges-2',
  under_1000:      'https://www.reviewed.com/refrigerators/best-right-now/best-refrigerators-under-1000',
  dishwashers:     'https://www.reviewed.com/dishwashers/best-right-now/best-dishwashers',
};

const FRIDGE_PATCHES = {
  'hisense-hrm260n6tse': [
    { label: 'Reviewed (Best Refrigerators main guide): "Editor\'s Choice / Best Overall" — "the best mid-range French-door refrigerator we\'ve tested"', url: URLS.fridges_main },
    { label: 'Reviewed (Best French-Door Refrigerators): "Editor\'s Choice" — "the best mid-range French-door refrigerator we\'ve tested"', url: URLS.french_door },
  ],
  'lg-lt18s2100w':       { label: 'Reviewed (Best Refrigerators main guide): "Editor\'s Choice / Best No-Frills Fridge" — "a no-nonsense, top-freezer refrigerator that nails the basics"', url: URLS.fridges_main },
  'bosch-b36fd50sns':    { label: 'Reviewed (Best Refrigerators main guide): "Editor\'s Choice / Best French-door Fridge" — "nearly perfect. Temperatures in both the fridge and freezer are right on the mark"', url: URLS.fridges_main },
  'cafe-cae28dm5ts5':    { label: 'Reviewed (Best Refrigerators main guide): "Editor\'s Choice / Best Quad-style Refrigerator" — "one of the best 4-door fridges available"', url: URLS.fridges_main },
  'hisense-hrb171n6ase': [
    { label: 'Reviewed (Best Refrigerators main guide): "Editor\'s Choice / Best Bottom-Freezer Fridge" — "one of the best values we\'ve seen"', url: URLS.fridges_main },
    { label: 'Reviewed (Best Refrigerators Under $1,000): "Editor\'s Choice" — "remarkable temperature consistency for its price range"', url: URLS.under_1000 },
  ],
  'samsung-rs28cb760012':{ label: 'Reviewed (Best Refrigerators main guide): "Editor\'s Choice / Best Side-by-Side Fridge" — "one of the better side-by-sides we\'ve tested"', url: URLS.fridges_main },
  'hotpoint-hps16btnrww':[
    { label: 'Reviewed (Best Refrigerators main guide): "Editor\'s Choice / Best Top-Freezer Fridge" — "a good option" with solid "temperature performance"', url: URLS.fridges_main },
    { label: 'Reviewed (Best Refrigerators Under $1,000): "Editor\'s Choice" — "doesn\'t skimp on temperature performance"', url: URLS.under_1000 },
  ],
  'bosch-b36ct80sns':    { label: 'Reviewed (Best French-Door Refrigerators): "Editor\'s Choice" — "An all-around fantastic fridge that provides both cold and stable temperatures"', url: URLS.french_door },
  'samsung-rf90f29aecr': { label: 'Reviewed (Best French-Door Refrigerators): tested — "tech-forward fridge boasts a 32-inch touchscreen and AI-enhanced smart features"', url: URLS.french_door },
  'ge-profile-pvd28bynfs':{ label: 'Reviewed (Best French-Door Refrigerators): tested — "will be right at home in any kitchen"', url: URLS.french_door },
  'frigidaire-ffht1425vv':{ label: 'Reviewed (Best Refrigerators Under $1,000): "Editor\'s Choice" — "efficient use of space is truly impressive"', url: URLS.under_1000 },
  'whirlpool-wrt311fzdm':{ label: 'Reviewed (Best Refrigerators Under $1,000): tested — "one of the most efficient models we\'ve tested"', url: URLS.under_1000 },
};

const DW_PATCHES = {
  'bosch-shp78cm5n':       { label: 'Reviewed (Best Dishwashers main guide): "Editor\'s Choice / Best Overall" — "It cleans even stubborn stains completely"', url: URLS.dishwashers },
  'maytag-mdb4949skz':     { label: 'Reviewed (Best Dishwashers main guide): "Editor\'s Choice / Best Basic No-Frills" — "Auto and Normal cycles scrub out most stains"', url: URLS.dishwashers },
  'samsung-dw90f89p0usr':  { label: 'Reviewed (Best Dishwashers main guide): "Editor\'s Choice / Best for Open Kitchens" — "Auto-open door" with "Quiet operation"', url: URLS.dishwashers },
  'miele-g5266scvi-sfp':   { label: 'Reviewed (Best Dishwashers main guide): "Editor\'s Choice / Best for Drying Plastics" — "Impressive cleaning power"', url: URLS.dishwashers },
  'lg-ldth7972s':          { label: 'Reviewed (Best Dishwashers main guide): "Editor\'s Choice / Best Steam Dishwasher" — "Effective Heavy Duty cycle"', url: URLS.dishwashers },
  'ge-profile-pdp755syvfs':{ label: 'Reviewed (Best Dishwashers main guide): "Best for Large Families" — "3rd rack with dedicated jets"', url: URLS.dishwashers },
};

function applyToFile(file, patches, label) {
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
        touched++;
      }
    }
  }
  data._meta[`${label}_2026_05`] = `Round 45: ${touched} more Reviewed category endorsements.`;
  data._meta.last_updated = '2026-05-05';
  writeFileSync(path, JSON.stringify(data, null, 2) + '\n');
  console.log(`${file}: added ${touched} endorsements`);
}

applyToFile('refrigerators', FRIDGE_PATCHES, 'batch_round45_reviewed4_fridge');
applyToFile('dishwashers',   DW_PATCHES,    'batch_round45_reviewed4_dw');
