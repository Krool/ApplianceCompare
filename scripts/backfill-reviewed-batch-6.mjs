// Round 51: more Reviewed.com category-roundup harvests.
// Articles: best-bottom-freezer, best-top-freezer, best-affordable-dishwashers,
// best-double-oven-ranges (re-pull for additions).
import { readFileSync, writeFileSync } from 'node:fs';

const URLS = {
  bottom_freezer: 'https://www.reviewed.com/refrigerators/best-right-now/best-bottom-freezer-refrigerators',
  top_freezer:    'https://www.reviewed.com/refrigerators/best-right-now/best-top-freezer-refrigerators',
  affordable_dw:  'https://www.reviewed.com/dishwashers/best-right-now/best-affordable-dishwashers',
  double_oven:    'https://www.reviewed.com/ovens/best-right-now/best-double-oven-ranges',
};

const FRIDGE = {
  'hisense-hrb171n6ase':   { label: 'Reviewed (Best Bottom-Freezer Refrigerators): "Editor\'s Choice / Best Value" — "remarkably consistent temperatures and is one of the best values we\'ve seen"', url: URLS.bottom_freezer },
  'whirlpool-wrb322dmbm':  { label: 'Reviewed (Best Bottom-Freezer Refrigerators): "Editor\'s Choice" — "Its temperature management system keeps both its fridge and freezer compartments at almost the exact ideal temperature"', url: URLS.bottom_freezer },
  'lg-lrdcs2603s':         { label: 'Reviewed (Best Bottom-Freezer Refrigerators): tested — "sleek LG bottom-freezer refrigerator delivers just enough features to be a good value"', url: URLS.bottom_freezer },
  'hotpoint-hps16btnrww':  { label: 'Reviewed (Best Top-Freezer Refrigerators): "Editor\'s Choice / Best Overall" — "Stable temperatures" and "Great value"', url: URLS.top_freezer },
  'whirlpool-wrt311fzdm':  { label: 'Reviewed (Best Top-Freezer Refrigerators): "Best Standard-depth" — "Energy efficient" with "Glass shelves"', url: URLS.top_freezer },
  'frigidaire-ffht1425vv': { label: 'Reviewed (Best Top-Freezer Refrigerators): "Editor\'s Choice" — "Great size for smaller spaces" and "Good temperature consistency"', url: URLS.top_freezer },
};

const DW = {
  'maytag-mdb4949skz':     { label: 'Reviewed (Best Affordable Dishwashers): "Editor\'s Choice / Best Affordable Dishwasher" — "Auto and Normal cycles scrub out most stains" ($599)', url: URLS.affordable_dw },
  'maytag-mdfs3924rz':     { label: 'Reviewed (Best Affordable Dishwashers): "Recommended" — "PowerBlast cycle offers intense cleaning" ($579)', url: URLS.affordable_dw },
  'bosch-she3aem2n':       { label: 'Reviewed (Best Affordable Dishwashers): tested — "Its good cleaning and drying performance make it a good value." ($999)', url: URLS.affordable_dw },
  'whirlpool-wdt750sakz':  { label: 'Reviewed (Best Affordable Dishwashers): tested — "Dries dishes decently" ($679)', url: URLS.affordable_dw },
  'samsung-dw80cg4021sr':  { label: 'Reviewed (Best Affordable Dishwashers): "Best Dishwasher Under $500" — "Multiple wash cycles and options" ($399)', url: URLS.affordable_dw },
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
    const newE = { channel: 'Reviewed', type: 'roundup', label: patch.label, url: patch.url };
    const key = newE.url + '|' + newE.label.slice(0, 60);
    if (!have.has(key)) {
      m.ratings.endorsements.push(newE);
      touched++;
    }
  }
  data._meta[`${label}_2026_05`] = `Round 51: ${touched} more Reviewed category endorsements.`;
  data._meta.last_updated = '2026-05-05';
  writeFileSync(path, JSON.stringify(data, null, 2) + '\n');
  console.log(`${file}: added ${touched} endorsements`);
}

applyToFile('refrigerators', FRIDGE, 'batch_round51_reviewed6_fridge');
applyToFile('dishwashers',   DW,     'batch_round51_reviewed6_dw');
