// Round 54: add rtings field for in-DB fridges that appear on RTINGS' "Best
// French-Door Refrigerators" list. RTINGS' detailed scores are paywalled, but
// the "RTINGS Tested" status alone is a real third-party signal — RTINGS
// ranked these in their top 20 French-door fridges. helpers.jsx counts r.rtings
// != null as a signal slot, so this is a new signal type for these models.
//
// Source: https://www.rtings.com/refrigerator/reviews/best/french-door
// (Confirmed via WebFetch — RTINGS lists 20 specific models on this page;
// full scores require a paid membership but inclusion in the top-20 list is
// itself a published signal we can cite.)
import { readFileSync, writeFileSync } from 'node:fs';

const URL = 'https://www.rtings.com/refrigerator/reviews/best/french-door';

// Model IDs in DB that appear on RTINGS' top-20 French-door list.
const RTINGS_TESTED = [
  'bosch-b36ct80sns',
  'bosch-b36fd10ens',
  'ge-gne27jymfs',
  'ge-profile-pge29bytfs',
  'ge-profile-pvd28bynfs',
  'hisense-hrm260n6tse',
  'lg-lrflc2706s',
  'maytag-mrff4236rz',
];

const path = 'public/data/refrigerators.json';
const data = JSON.parse(readFileSync(path, 'utf8'));
let touched = 0;
for (const m of data.models) {
  if (!RTINGS_TESTED.includes(m.id)) continue;
  m.ratings = m.ratings || {};
  if (m.ratings.rtings != null && m.ratings.rtings !== '') continue;
  m.ratings.rtings = 'RTINGS Tested · Top-20 French-Door 2026';
  m.ratings.source_urls = m.ratings.source_urls || {};
  if (!m.ratings.source_urls.rtings) m.ratings.source_urls.rtings = URL;
  // Also drop an endorsement entry for transparency.
  m.ratings.endorsements = m.ratings.endorsements || [];
  const have = new Set(m.ratings.endorsements.map(e => e.url + '|' + (e.label || '').slice(0, 60)));
  const newE = { channel: 'RTINGS', type: 'roundup', label: 'RTINGS (Best French-Door Refrigerators): listed in top-20 (full scores require membership)', url: URL };
  const key = newE.url + '|' + newE.label.slice(0, 60);
  if (!have.has(key)) m.ratings.endorsements.push(newE);
  touched++;
}
data._meta.batch_round54_2026_05 = `Round 54: ${touched} fridges gained rtings field (RTINGS Tested status). NEW signal slot — expected to upgrade some limited→solid.`;
data._meta.last_updated = '2026-05-05';
writeFileSync(path, JSON.stringify(data, null, 2) + '\n');
console.log(`refrigerators: set rtings on ${touched} models`);
