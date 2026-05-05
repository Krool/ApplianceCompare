// Round 44: 4 more Reviewed.com category-roundup harvests with high in-DB hit rates.
// Articles: best induction ranges, best gas ranges, best 36-inch high-end gas cooktops,
// best stainless steel dishwashers.
import { readFileSync, writeFileSync } from 'node:fs';

const URLS = {
  induction_ranges: 'https://www.reviewed.com/ovens/best-right-now/best-induction-ranges',
  gas_ranges:       'https://www.reviewed.com/ovens/best-right-now/best-gas-ranges',
  gas_cooktops_36:  'https://www.reviewed.com/ovens/best-right-now/the-best-high-end-36-inch-gas-cooktops',
  ss_dishwashers:   'https://www.reviewed.com/dishwashers/best-right-now/best-stainless-steel-dishwashers',
};

const OV = {
  'samsung-nsi6db990012aa': {
    label: 'Reviewed (Best Induction Ranges): "Best Induction Range Overall" — "This smart induction range boasts speedy results, intuitive features, and a modern design that sets it apart from other models."',
    url: URLS.induction_ranges,
  },
  'cafe-chs900p2ms1': {
    label: 'Reviewed (Best Induction Ranges): "Best Upgrade" — "This attractive induction range boasts even baking, fast cooktop heating, and intuitive app compatibility."',
    url: URLS.induction_ranges,
  },
  'bosch-his8655u': {
    label: 'Reviewed (Best Induction Ranges): "Best 36-Inch Induction Range" — "This high-end induction range is feature-rich and aced all of our tests. Its intuitive controls make it a delight to use."',
    url: URLS.induction_ranges,
  },
  'ge-profile-phs700ayfs': {
    label: 'Reviewed (Best Induction Ranges): "Best Value" — "This reasonably priced induction range features built-in Wi-Fi plus GE\'s latest EasyWash oven tray."',
    url: URLS.induction_ranges,
  },
  'frigidaire-gcfi3060bf': {
    label: 'Reviewed (Best Induction Ranges): "Best Entry-Level Model" — "This Frigidaire range offers a great entry point into induction cooking—the price is low, and the functionality is high."',
    url: URLS.induction_ranges,
  },
  'ge-profile-phs93xypfs': {
    label: 'Reviewed (Best Induction Ranges): "Best Induction Range for Baking"',
    url: URLS.induction_ranges,
  },
  'miele-hr1632-3i': {
    label: 'Reviewed (Best Induction Ranges): "Best Smart Induction Range"',
    url: URLS.induction_ranges,
  },
  'lg-studio-lsis6338fe': {
    label: 'Reviewed (Best Induction Ranges): "Best Induction Range For Families"',
    url: URLS.induction_ranges,
  },
  'cafe-chs950p2ms1': {
    label: 'Reviewed (Best Induction Ranges): "Best Double Oven Induction Range"',
    url: URLS.induction_ranges,
  },
  'frigidaire-gcfi3070bf': {
    label: 'Reviewed (Best Induction Ranges): "Best Induction Range for Pizza Lovers" — "No other range on this list can match the GCFI3070BF\'s oven temperature of 750°F-plus, the threshold for authentic Neapolitan-style pizza."',
    url: URLS.induction_ranges,
  },
  'lg-lrgl5825f': {
    label: 'Reviewed (Best Gas Ranges): "Editor\'s Choice" — "This LG range bakes like a pro and succeeds at its Air Fry mode, unlike some of its competition."',
    url: URLS.gas_ranges,
  },
  'ge-profile-pgb935ypfs': {
    label: 'Reviewed (Best Gas Ranges): tested',
    url: URLS.gas_ranges,
  },
  'frigidaire-gcrg3060bf': {
    label: 'Reviewed (Best Gas Ranges): tested',
    url: URLS.gas_ranges,
  },
  'thermador-sgsx365ts': {
    label: 'Reviewed (Best 36-inch High-End Gas Cooktops): "Best Gas Cooktop" / Editor\'s Choice — "This five-burner cooktop delivers high temperatures, even cooking, and a stylish look for your kitchen."',
    url: URLS.gas_cooktops_36,
  },
  'ge-profile-pgp7036slss': {
    label: 'Reviewed (Best 36-inch High-End Gas Cooktops): "This GE Profile cooktop offers sleek construction, continuous steel grating, and nice features."',
    url: URLS.gas_cooktops_36,
  },
};

const DW = {
  'bosch-shp78cm5n': {
    label: 'Reviewed (Best Stainless Steel Dishwashers): "Editor\'s Choice / Best Overall" — "It cleans even stubborn stains completely."',
    url: URLS.ss_dishwashers,
  },
  'cafe-cdt888p2vs1': {
    label: 'Reviewed (Best Stainless Steel Dishwashers): "Editor\'s Choice / Best Upgrade" — "Extremely quiet."',
    url: URLS.ss_dishwashers,
  },
  'maytag-mdb4949skz': {
    label: 'Reviewed (Best Stainless Steel Dishwashers): "Editor\'s Choice / Best Value" — "Auto and Normal cycles scrub out most stains."',
    url: URLS.ss_dishwashers,
  },
  'lg-ldth7972s': {
    label: 'Reviewed (Best Stainless Steel Dishwashers): "Editor\'s Choice" — "Effective Heavy Duty cycle."',
    url: URLS.ss_dishwashers,
  },
  'bosch-she53c85n': {
    label: 'Reviewed (Best Stainless Steel Dishwashers): "Editor\'s Choice" — "Great cleaning quality."',
    url: URLS.ss_dishwashers,
  },
};

function applyToFile(file, patches, label, channel = 'Reviewed', type = 'roundup') {
  const path = `public/data/${file}.json`;
  const data = JSON.parse(readFileSync(path, 'utf8'));
  let touched = 0;
  for (const m of data.models) {
    const patch = patches[m.id];
    if (!patch) continue;
    m.ratings = m.ratings || {};
    m.ratings.endorsements = m.ratings.endorsements || [];
    const have = new Set(m.ratings.endorsements.map(e => e.url + '|' + (e.label || '').slice(0, 60)));
    const newE = { channel, type, label: patch.label, url: patch.url };
    const key = newE.url + '|' + newE.label.slice(0, 60);
    if (!have.has(key)) {
      m.ratings.endorsements.push(newE);
      touched++;
    }
  }
  data._meta[`${label}_2026_05`] = `Round 44: ${touched} Reviewed category-roundup endorsements (only exact-SKU in-DB matches).`;
  data._meta.last_updated = '2026-05-05';
  writeFileSync(path, JSON.stringify(data, null, 2) + '\n');
  console.log(`${file}: added ${touched} endorsements`);
}

applyToFile('ovens',       OV, 'batch_round44_reviewed3_oven');
applyToFile('dishwashers', DW, 'batch_round44_reviewed3_dw');
