// Round 48: more Yale article harvests — lg-cd-max review, gas-cooktops comparison,
// fastest-dishwasher cycles, Miele vs Bosch Benchmark.
import { readFileSync, writeFileSync } from 'node:fs';

const URLS = {
  yale_lg_cdmax:        'https://blog.yaleappliance.com/lg-counter-depth-max-french-door-refrigerator-review',
  yale_gas_cooktops:    'https://blog.yaleappliance.com/wolf-vs-thermador-vs-viking-gas-cooktops',
  yale_fastest_dw:      'https://blog.yaleappliance.com/fastest-dishwasher-cycle-times',
  yale_miele_bench:     'https://blog.yaleappliance.com/miele-vs-bosch-benchmark-dishwashers',
};

const FRIDGE = {
  'lg-lrflc2706s': { label: 'Yale (LG Counter-Depth MAX Review): "27 Cu Ft PrintProof Smart Counter Depth French Door" — internal water dispenser ($1,799)', url: URLS.yale_lg_cdmax },
  'lg-lrfxc2606s': { label: 'Yale (LG Counter-Depth MAX Review): "25.5 Cu Ft PrintProof Counter-Depth French Door" — ice and water dispenser, dual ice makers ($1,999)', url: URLS.yale_lg_cdmax },
  'lg-lrfoc2606s': { label: 'Yale (LG Counter-Depth MAX Review): "25.5 Cu Ft PrintProof Smart InstaView Counter Depth" — outside water dispenser, knock-twice InstaView window ($2,199)', url: URLS.yale_lg_cdmax },
};

const OV = {
  'thermador-sgsx365ts': { label: 'Yale (Wolf vs Thermador vs Viking Gas Cooktops): SGSX365TS — "two intermittent simmers with 16,000 BTU center burner" ($2,099)', url: URLS.yale_gas_cooktops },
  'viking-vgsu53616bss': { label: 'Yale (Wolf vs Thermador vs Viking Gas Cooktops): VGSU5361-6B — "six more durable brass burners with 66,000 total BTU output" ($2,649)', url: URLS.yale_gas_cooktops },
};

const DW = {
  'bosch-shp9pcm5n':       { label: 'Yale (Miele vs Bosch Benchmark): SHP9PCM5N — "Pocket handle, 38 dB" (~$2,000)', url: URLS.yale_miele_bench },
  'kitchenaid-kdte204kps': { label: 'Yale (Fastest Dishwasher Cycles 2025): KDTE204KPS — "Express Wash Cycle: 60 mins" ($999)', url: URLS.yale_fastest_dw },
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
  data._meta[`${label}_2026_05`] = `Round 48: ${touched} more Yale category endorsements.`;
  data._meta.last_updated = '2026-05-05';
  writeFileSync(path, JSON.stringify(data, null, 2) + '\n');
  console.log(`${file}: added ${touched} endorsements`);
}

applyToFile('refrigerators', FRIDGE, 'batch_round48_yale9_fridge');
applyToFile('ovens',         OV,     'batch_round48_yale9_oven');
applyToFile('dishwashers',   DW,     'batch_round48_yale9_dw');
