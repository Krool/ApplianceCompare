// Round 42: harvest of 4 Yale category-roundup articles I hadn't yet pulled.
// Only exact-SKU in-DB matches (or same-base-model with finish-suffix delta) are
// attributed; non-matching variants Yale lists are dropped to avoid over-attribution.
import { readFileSync, writeFileSync } from 'node:fs';

const URLS = {
  fridge_cd_2026:   'https://blog.yaleappliance.com/the-best-counter-depth-refrigerators',
  fridge_30in_cd:   'https://blog.yaleappliance.com/the-best-30-inch-counter-depth-refrigerators-reviews-ratings',
  dw_best_2026:     'https://blog.yaleappliance.com/best-dishwasher-deals',
  dw_quietest:      'https://blog.yaleappliance.com/quietest-dishwasher-by-decibel-rating',
  oven_36in_ind:    'https://blog.yaleappliance.com/best-36-inch-induction-ranges',
  oven_30in_indct:  'https://blog.yaleappliance.com/best-30-inch-induction-cooktops',
};

const FRIDGE = {
  'lg-lrflc2716s': {
    label: 'Yale (Best Counter-Depth Refrigerators 2026): "Best for Reliability/Space" — "LG is the most reliable counter-depth refrigerator brand in our service data."',
    url: URLS.fridge_cd_2026,
  },
  'bosch-b36ct80sns': {
    label: 'Yale (Best Counter-Depth Refrigerators 2026): "Best for Food Preservation" — "Bosch is the only freestanding counter-depth refrigerator brand that uses two compressors."',
    url: URLS.fridge_cd_2026,
  },
  'cafe-cye22tp4mw2': {
    label: 'Yale (Best Counter-Depth Refrigerators 2026): "Best Service Support" — "Café is the only counter-depth refrigerator brand in this group backed by a large, established domestic service network."',
    url: URLS.fridge_cd_2026,
  },
  'fp-rf201adjsx5': {
    label: 'Yale (Best Counter-Depth Refrigerators 2026): "Best Integrated Look for Less" — "Fisher & Paykel exists for one reason: to give you a true integrated refrigerator look without paying traditional luxury pricing."',
    url: URLS.fridge_cd_2026,
  },
  'thermador-t30ib905sp': {
    label: 'Yale (Best 30-inch Counter-Depth Refrigerators): "Thermador was first with smart functionality." ($8,499)',
    url: URLS.fridge_30in_cd,
  },
};

const DW = {
  'bosch-shx78cm5n': {
    label: 'Yale (Best Dishwashers 2026): "Best Overall / Best drying with CrystalDry" — "The best dishwasher for drying plastics, and one of the best-balanced machines you can buy under $1,500." (~$1,399)',
    url: URLS.dw_best_2026,
  },
  'miele-g7186scvi': {
    label: 'Yale (Best Dishwashers 2026): G 7186 SCVi family — "Best racking, washing, and cleanest dishes" — "The best dishwasher for racking, washing performance, and the cleanest results on fully loaded cycles." (~$2,399)',
    url: URLS.dw_best_2026,
  },
  'ge-profile-pdp755syvfs': {
    label: 'Yale (Quietest Dishwashers 2026): 42 dB — "quiet, and you don\'t have to clean a filter"',
    url: URLS.dw_quietest,
  },
};

const OV = {
  'bosch-his8655u': {
    label: 'Yale (Best 36-inch Induction Ranges 2026): "Best Budget option" — "At first glance, the Bosch looks good. The commercial style pegs at the bottom and the clean design fit nicely in a modern kitchen." ($6,799)',
    url: URLS.oven_36in_ind,
  },
  'miele-hr1632-3i': {
    label: 'Yale (Best 36-inch Induction Ranges 2026): HR 1632-3 family — "Best Steam cooking" — "Moisture Plus injects steam during cooking so bread rises better and roasts don\'t dry out." ($13,699)',
    url: URLS.oven_36in_ind,
  },
  'wolf-ir36551': {
    label: 'Yale (Best 36-inch Induction Ranges 2026): IR36551/S/P family — "Best Baking performance" — "At 6.3 cubic feet, it\'s one of the largest ovens in its class. And it uses Wolf\'s Dual VertiFlow convection system." ($14,070)',
    url: URLS.oven_36in_ind,
  },
  'thermador-cit30ywbb': {
    label: 'Yale (Best 30-inch Induction Cooktops 2025): "still the most featured, with 48 sensors" ($5,299)',
    url: URLS.oven_30in_indct,
  },
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
    const newE = { channel: 'Yale Appliance', type: 'article', label: patch.label, url: patch.url };
    const key = newE.url + '|' + newE.label.slice(0, 60);
    if (!have.has(key)) {
      m.ratings.endorsements.push(newE);
      touched++;
    }
  }
  data._meta[`${label}_2026_05`] = `Round 42: ${touched} Yale category-roundup endorsements (only exact-SKU in-DB matches).`;
  data._meta.last_updated = '2026-05-05';
  writeFileSync(path, JSON.stringify(data, null, 2) + '\n');
  console.log(`${file}: added ${touched} endorsements`);
}

applyToFile('refrigerators', FRIDGE, 'batch_round42_yale6_fridge');
applyToFile('dishwashers',   DW,     'batch_round42_yale6_dw');
applyToFile('ovens',         OV,     'batch_round42_yale6_oven');
