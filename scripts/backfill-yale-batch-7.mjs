// Round 43: 4 more Yale category-roundup articles harvested.
// Articles: best-48-inch CD fridges, best-paneled dishwashers, best-bosch dishwashers,
// best-36/48-inch pro ranges, best-wall-ovens (and the speed-ovens article that yielded
// no exact in-DB matches).
import { readFileSync, writeFileSync } from 'node:fs';

const URLS = {
  fridge_48cd:    'https://blog.yaleappliance.com/best-48-inch-counter-depth-refrigerators-reviews-ratings',
  dw_panelready:  'https://blog.yaleappliance.com/best-paneled-dishwasher-reviews',
  dw_bosch:       'https://blog.yaleappliance.com/the-best-bosch-dishwashers-ratings-reviews-prices',
  oven_36proin:   'https://blog.yaleappliance.com/best-36-inch-pro-ranges',
  oven_48pro:     'https://blog.yaleappliance.com/best-48-inch-professional-ranges',
  oven_wallovens: 'https://blog.yaleappliance.com/best-double-wall-ovens',
};

const FRIDGE = {
  'sks-sksfd4826p': {
    label: 'Yale (Best 48-inch Counter-Depth Refrigerators): "Best for Quiet Operation & Cocktail Ice" — "Quietest refrigerator on the market at 39 dB" with Craft Ice ($14,999+)',
    url: URLS.fridge_48cd,
  },
};

const DW = {
  'bosch-shx5aem5n': {
    label: 'Yale (Best Bosch Dishwashers): "Best Budget Pick" — "If you want Bosch\'s reliability without paying a premium price, the 100 Series is your best option." ($799-$899)',
    url: URLS.dw_bosch,
  },
  'miele-g5051scvi': {
    label: 'Yale (Best Panel-Ready Dishwashers): budget panel-ready pick — "You lose AutoDos and some rack flexibility, but it has the same core wash and dry system." ($1,449)',
    url: URLS.dw_panelready,
  },
  'miele-g7186scvi': {
    label: 'Yale (Best Panel-Ready Dishwashers): "Best Washing System" — "If you want the most complete wash system, Miele is still the standard." ($1,999)',
    url: URLS.dw_panelready,
  },
};

const OV = {
  'miele-h7780bp': {
    label: 'Yale (Best Wall Ovens 2026): "Best Steam Assist Oven" — "Plumbed steam bursts. Large recipe library. Wireless probe"',
    url: URLS.oven_wallovens,
  },
  'miele-hr1934-3df': {
    label: 'Yale (Best 36-inch Pro Ranges): "steam with Moisture Plus, keeping bread light and crusty and roasts juicy and golden" — twin convection fans, MasterChef guided cooking ($10,499)',
    url: URLS.oven_36proin,
  },
  'thermador-pgr486gdg': {
    label: 'Yale (Best 48-inch Pro Ranges): PRG486WDG — recommended all-gas pro range with 6 burners + griddle and convection oven',
    url: URLS.oven_48pro,
  },
  'viking-vgr5366bss': {
    label: 'Yale (Best 36-inch Pro Ranges): reference model — "built to perform without getting too fancy" with "strong burners, solid construction" ($7,999)',
    url: URLS.oven_36proin,
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
  data._meta[`${label}_2026_05`] = `Round 43: ${touched} Yale category-roundup endorsements (only exact-SKU in-DB matches).`;
  data._meta.last_updated = '2026-05-05';
  writeFileSync(path, JSON.stringify(data, null, 2) + '\n');
  console.log(`${file}: added ${touched} endorsements`);
}

applyToFile('refrigerators', FRIDGE, 'batch_round43_yale7_fridge');
applyToFile('dishwashers',   DW,     'batch_round43_yale7_dw');
applyToFile('ovens',         OV,     'batch_round43_yale7_oven');
