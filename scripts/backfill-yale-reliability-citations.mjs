// Round 50: small batch — model citations harvested from Yale brand-level
// reliability articles where individual SKUs were named (no per-model rates,
// just citation as a recommended/representative model).
import { readFileSync, writeFileSync } from 'node:fs';

const URLS = {
  ind_ranges:  'https://blog.yaleappliance.com/most-reliable-induction-ranges',
  el_ranges:   'https://blog.yaleappliance.com/most-reliable-electric-ranges',
  gas_ranges:  'https://blog.yaleappliance.com/most-reliable-gas-ranges',
};

const OV = {
  'lg-lsil6336xe': {
    label: 'Yale (Most Reliable Induction Ranges 2025): LSIL6336XE — cited representative model in LG\'s 4.6% category service rate ($3,299)',
    url: URLS.ind_ranges,
  },
  'ge-profile-pb900yvfs': {
    label: 'Yale (Most Reliable Electric Ranges 2025): PB900YVFS — recommended model from GE Profile (8.5% brand service rate)',
    url: URLS.el_ranges,
  },
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
  const newE = { channel: 'Yale Appliance', type: 'article', label: patch.label, url: patch.url };
  const key = newE.url + '|' + newE.label.slice(0, 60);
  if (!have.has(key)) {
    m.ratings.endorsements.push(newE);
    touched++;
  }
}
data._meta.batch_round50_2026_05 = `Round 50: ${touched} Yale reliability-article model citations.`;
data._meta.last_updated = '2026-05-05';
writeFileSync(path, JSON.stringify(data, null, 2) + '\n');
console.log(`ovens: added ${touched} endorsements`);
