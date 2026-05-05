// Round 55: more Reviewed.com category-roundup harvests.
// Articles: best-electric-ranges, best-electric-induction-cooktops,
// best-wall-ovens, best-36-inch-dual-fuel-ranges, best-double-oven-ranges-bwamp.
import { readFileSync, writeFileSync } from 'node:fs';

const URLS = {
  el_ranges:    'https://www.reviewed.com/ovens/best-right-now/best-electric-ranges',
  ind_cooktops: 'https://www.reviewed.com/ovens/best-right-now/best-electric-induction-cooktops',
  dual_fuel_36: 'https://www.reviewed.com/ovens/best-right-now/the-best-36-inch-dual-fuel-ranges',
  double_oven_b:'https://www.reviewed.com/ovens/best-right-now/best-double-oven-ranges-bwamp',
};

const OV = {
  'ge-grs600avfs':           { label: 'Reviewed (Best Electric Ranges): "Editor\'s Choice / Best Electric Range" — "slide-in electric convection range, with its Energy Star rating and removable Easy-wash Oven Tray"', url: URLS.el_ranges },
  'whirlpool-wfes7530rz':    { label: 'Reviewed (Best Electric Ranges): "Easy-Clean Cooktop" — "Whirlpool combines several advanced features in this range, with Wi-Fi and a proprietary coating that makes the glasstop surface even easier to clean"', url: URLS.el_ranges },
  'whirlpool-wge745c0fs':    [
    { label: 'Reviewed (Best Electric Ranges): "Editor\'s Choice / Best Double-Oven Electric Range" — "knockout across the board"', url: URLS.el_ranges },
    { label: 'Reviewed (Best Double Oven Ranges 2): "Editor\'s Choice / Best Double Oven Range" — "the best we\'ve tested because of its effective burners, spacious ovens that evenly bake food, and sleek look"', url: URLS.double_oven_b },
  ],
  'frigidaire-pcci3080af':   { label: 'Reviewed (Best Electric Induction Cooktops): tested — "features a powerful 11-inch, 5,200-watt PowerPlus burner"', url: URLS.ind_cooktops },
  'kitchenaid-ksdb900ess':   { label: 'Reviewed (Best 36-inch Dual-Fuel Ranges): "Editor\'s Choice" — "the best dual-fuel range we\'ve tested"', url: URLS.dual_fuel_36 },
  'maytag-met8800fz':        { label: 'Reviewed (Best Double Oven Ranges 2): tested — "powerful stove-top elements, True Convection heating, and a 10-year limited parts warranty"', url: URLS.double_oven_b },
};

const path = 'public/data/ovens.json';
const data = JSON.parse(readFileSync(path, 'utf8'));
let touched = 0;
for (const m of data.models) {
  const patch = OV[m.id];
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
data._meta.batch_round55_2026_05 = `Round 55: ${touched} more Reviewed oven-category endorsements.`;
data._meta.last_updated = '2026-05-05';
writeFileSync('public/data/ovens.json', JSON.stringify(data, null, 2) + '\n');
console.log(`ovens: added ${touched} endorsements`);
