// Round 46: more Reviewed.com (best-dishwashers-that-dry, best-ranges) and
// Yale (best-miele-dishwashers, differences-between-bosch-dishwashers) harvests.
import { readFileSync, writeFileSync } from 'node:fs';

const URLS = {
  dw_drying:        'https://www.reviewed.com/dishwashers/best-right-now/the-best-dishwashers-that-dry-your-dishes',
  ranges_main:      'https://www.reviewed.com/ovens/best-right-now/best-ranges',
  yale_miele_dw:    'https://blog.yaleappliance.com/best-miele-dishwashers',
  yale_bosch_diff:  'https://blog.yaleappliance.com/differences-between-bosch-dishwashers',
};

// {channel, type, label, url} pulled from each article
const DW_PATCHES = {
  'bosch-shp78cm5n':       [{ channel: 'Reviewed', type: 'roundup', label: 'Reviewed (Best Dishwashers That Dry): "Editor\'s Choice / Best Overall" — "It cleans even stubborn stains completely"', url: URLS.dw_drying }],
  'miele-g5266scvi-sfp':   [{ channel: 'Reviewed', type: 'roundup', label: 'Reviewed (Best Dishwashers That Dry): "Editor\'s Choice / Best Upgrade" — "Impressive cleaning power"', url: URLS.dw_drying }],
  'bosch-shp9pcm5n':       [{ channel: 'Reviewed', type: 'roundup', label: 'Reviewed (Best Dishwashers That Dry): "Editor\'s Choice" — "PowerControl-driven cleaning performance"', url: URLS.dw_drying }],
  'lg-ldth7972s':          [{ channel: 'Reviewed', type: 'roundup', label: 'Reviewed (Best Dishwashers That Dry): "Editor\'s Choice" — "Effective Heavy Duty cycle"', url: URLS.dw_drying }],
  'kitchenaid-kdpm804kbs': [{ channel: 'Reviewed', type: 'roundup', label: 'Reviewed (Best Dishwashers That Dry): "Recommended" — third rack with dedicated jets', url: URLS.dw_drying }],
  'bosch-shp65cm5n':       [{ channel: 'Reviewed', type: 'roundup', label: 'Reviewed (Best Dishwashers That Dry): tested — "Good cleaning power"', url: URLS.dw_drying }],
  'miele-g7196scvisf':     [{ channel: 'Yale Appliance', type: 'article', label: 'Yale (Best Miele Dishwashers): "Most Popular" — "This is the sweet spot in Miele\'s G7000 lineup. You get many of the same cleaning and drying features as the top-end model for about $1,500 less." ($2,149)', url: URLS.yale_miele_dw }],
  'miele-g5008scu':        [{ channel: 'Yale Appliance', type: 'article', label: 'Yale (Best Miele Dishwashers): "Lowest Price" — "Think of this one as the intro course in Miele." ($1,299)', url: URLS.yale_miele_dw }],
  'bosch-shxm4ay55n':      [{ channel: 'Yale Appliance', type: 'article', label: 'Yale (Bosch Dishwasher Series Differences): cited — Bosch 100 Series 24" stainless steel built-in', url: URLS.yale_bosch_diff }],
  'bosch-shp65cp5n':       [{ channel: 'Yale Appliance', type: 'article', label: 'Yale (Bosch Dishwasher Series Differences): cited — Bosch 500 Series 24" with pocket handle', url: URLS.yale_bosch_diff }],
  'bosch-shp78cp5n':       [{ channel: 'Yale Appliance', type: 'article', label: 'Yale (Bosch Dishwasher Series Differences): cited — Bosch 800 Series 24" stainless steel', url: URLS.yale_bosch_diff }],
  'bosch-shx78cm5n':       [{ channel: 'Yale Appliance', type: 'article', label: 'Yale (Bosch Dishwasher Series Differences): cited — Bosch 800 Series 24" stainless top-control', url: URLS.yale_bosch_diff }],
};

const OV_PATCHES = {
  'samsung-nsi6db990012aa':[{ channel: 'Reviewed', type: 'roundup', label: 'Reviewed (Best Ranges main guide): "Editor\'s Choice" — "smart induction range boasts speedy results, intuitive features, and a modern design"', url: URLS.ranges_main }],
  'ge-grs600avfs':         [{ channel: 'Reviewed', type: 'roundup', label: 'Reviewed (Best Ranges main guide): "Editor\'s Choice" — "slide-in electric convection range, with its Energy Star rating and removable Easy-wash Oven Tray"', url: URLS.ranges_main }],
  'lg-lrgl5825f':          [{ channel: 'Reviewed', type: 'roundup', label: 'Reviewed (Best Ranges main guide): "Editor\'s Choice" — "This LG range bakes like a pro and succeeds at its Air Fry mode"', url: URLS.ranges_main }],
  'kitchenaid-ksdb900ess': [{ channel: 'Reviewed', type: 'roundup', label: 'Reviewed (Best Ranges main guide): "Editor\'s Choice" — "If you need fine control for your burners and mostly even baking in the oven, look no further"', url: URLS.ranges_main }],
  'bosch-his8655u':        [{ channel: 'Reviewed', type: 'roundup', label: 'Reviewed (Best Ranges main guide): "Editor\'s Choice" — "high-end induction range is feature-rich and aced all of our tests"', url: URLS.ranges_main }],
  'whirlpool-wge745c0fs':  [{ channel: 'Reviewed', type: 'roundup', label: 'Reviewed (Best Ranges main guide): "Editor\'s Choice" — "the best double-oven electric range we\'ve tested"', url: URLS.ranges_main }],
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
      const newE = { channel: p.channel, type: p.type, label: p.label, url: p.url };
      const key = newE.url + '|' + newE.label.slice(0, 60);
      if (!have.has(key)) {
        m.ratings.endorsements.push(newE);
        have.add(key);
        touched++;
      }
    }
  }
  data._meta[`${label}_2026_05`] = `Round 46: ${touched} more Reviewed/Yale category endorsements.`;
  data._meta.last_updated = '2026-05-05';
  writeFileSync(path, JSON.stringify(data, null, 2) + '\n');
  console.log(`${file}: added ${touched} endorsements`);
}

applyToFile('dishwashers', DW_PATCHES, 'batch_round46_mixed_dw');
applyToFile('ovens',       OV_PATCHES, 'batch_round46_mixed_oven');
