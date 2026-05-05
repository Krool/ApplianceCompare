// Round 47: Yale (bosch-vs-miele, kitchenaid-vs-bosch-vs-miele) + Reviewed (best-quiet-dishwashers)
// + Yale (sub-zero classic vs thermador freedom) yields 0 in-DB matches for built-ins.
import { readFileSync, writeFileSync } from 'node:fs';

const URLS = {
  yale_bosch_miele:        'https://blog.yaleappliance.com/bosch-vs-miele-dishwashers',
  yale_ka_bosch_miele:     'https://blog.yaleappliance.com/kitchenaid-vs-bosch-vs-miele-dishwashers',
  reviewed_quiet:          'https://www.reviewed.com/dishwashers/best-right-now/best-quiet-dishwashers-2',
};

const DW_PATCHES = {
  'bosch-shx78cm5n': [
    { channel: 'Yale Appliance', type: 'article', label: 'Yale (Bosch vs Miele Dishwashers): cited — Bosch 800 Series 24" stainless top-control ($1,549)', url: URLS.yale_bosch_miele },
    { channel: 'Yale Appliance', type: 'article', label: 'Yale (Bosch vs KitchenAid vs Miele Dishwashers 2026): cited — "7 cycles, 7 options | Sound Level: 42 dB | CrystalDry & AutoAir | Third Rack: Yes"', url: URLS.yale_ka_bosch_miele },
  ],
  'bosch-shp9pcm5n': [
    { channel: 'Yale Appliance', type: 'article', label: 'Yale (Bosch vs Miele Dishwashers): cited — Bosch Benchmark 24" stainless top-control ($1,799)', url: URLS.yale_bosch_miele },
    { channel: 'Yale Appliance', type: 'article', label: 'Yale (Bosch vs KitchenAid vs Miele Dishwashers 2026): cited — "9 cycles, 8 options | Sound Level: 39 dB | CrystalDry | Third Rack: Yes, adjustable"', url: URLS.yale_ka_bosch_miele },
  ],
  'miele-g5056scvisf': [
    { channel: 'Yale Appliance', type: 'article', label: 'Yale (Bosch vs Miele Dishwashers): cited — Miele 24" built-in ($1,599)', url: URLS.yale_bosch_miele },
  ],
  'miele-g5266scvi-sfp': [
    { channel: 'Yale Appliance', type: 'article', label: 'Yale (Bosch vs Miele Dishwashers): cited — Miele 24" built-in ($1,899)', url: URLS.yale_bosch_miele },
  ],
  'miele-g7186scvi': [
    { channel: 'Yale Appliance', type: 'article', label: 'Yale (Bosch vs Miele Dishwashers): G 7186 SCVi family — Miele 24" stainless top-control built-in ($2,199)', url: URLS.yale_bosch_miele },
    { channel: 'Yale Appliance', type: 'article', label: 'Yale (Bosch vs KitchenAid vs Miele Dishwashers 2026): G 7186 SCVi SF — "9 cycles | Sound Level: 42 dB | SensorDry | Third Rack: Yes"', url: URLS.yale_ka_bosch_miele },
  ],
  'samsung-dw90f89p0usr': [
    { channel: 'Reviewed', type: 'roundup', label: 'Reviewed (Best Quiet Dishwashers): "Editor\'s Choice / Lowest dBA" — "operating at a mere 38 dBA"', url: URLS.reviewed_quiet },
  ],
  'cafe-cdt888p2vs1': [
    { channel: 'Reviewed', type: 'roundup', label: 'Reviewed (Best Quiet Dishwashers): "Recommended" — "impressively quiet 39 dBA"', url: URLS.reviewed_quiet },
  ],
  'bosch-shp78cm5n': [
    { channel: 'Reviewed', type: 'roundup', label: 'Reviewed (Best Quiet Dishwashers): "Best Overall Dishwasher" — "operation levels are a very quiet 42 dBA"', url: URLS.reviewed_quiet },
  ],
  'lg-ldth7972s': [
    { channel: 'Reviewed', type: 'roundup', label: 'Reviewed (Best Quiet Dishwashers): "Editors\' Choice" — "at just 42 dBA, this quiet dishwasher certainly won\'t disrupt your dinner"', url: URLS.reviewed_quiet },
  ],
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
    for (const p of patch) {
      const newE = { channel: p.channel, type: p.type, label: p.label, url: p.url };
      const key = newE.url + '|' + newE.label.slice(0, 60);
      if (!have.has(key)) {
        m.ratings.endorsements.push(newE);
        have.add(key);
        touched++;
      }
    }
  }
  data._meta[`${label}_2026_05`] = `Round 47: ${touched} more Yale/Reviewed dishwasher endorsements.`;
  data._meta.last_updated = '2026-05-05';
  writeFileSync(path, JSON.stringify(data, null, 2) + '\n');
  console.log(`${file}: added ${touched} endorsements`);
}

applyToFile('dishwashers', DW_PATCHES, 'batch_round47_mixed_dw');
