// Round 53: derive ratings.wirecutter field from existing Wirecutter endorsements.
// Same leverage as round 52: Wirecutter is its own signal slot in
// helpers.jsx#getScoreConfidence (hasEditorialPick = r.wirecutter != null).
// When a model has a Wirecutter endorsement but null wirecutter field, the
// signal isn't being counted. Set the field to the editorial designation.
import { readFileSync, writeFileSync } from 'node:fs';

function pickStatus(eds) {
  function rank(e) {
    const l = (e.label || '').toLowerCase();
    if (l.includes('top pick') || l.includes('best overall')) return 4;
    if (l.includes('runner-up') || l.includes('runner up') || l.includes('also great')) return 3;
    if (l.includes('budget pick') || l.includes('upgrade pick')) return 3;
    if (l.match(/best\s+[a-z]/)) return 2;
    return 1;
  }
  let best = null, br = -1;
  for (const e of eds) {
    const r = rank(e);
    if (r > br) { br = r; best = e; }
  }
  if (!best) return null;
  // Extract a concise designation
  const label = best.label || '';
  const m1 = label.match(/(Top Pick|Runner-?Up|Also Great|Budget Pick|Upgrade Pick|Best [A-Za-z][^.,]*)/i);
  if (m1) return m1[1].trim();
  return 'Wirecutter pick';
}

const FILES = ['refrigerators', 'dishwashers', 'ovens'];
let total = 0;
for (const file of FILES) {
  const path = `public/data/${file}.json`;
  const data = JSON.parse(readFileSync(path, 'utf8'));
  let setCount = 0;
  for (const m of data.models) {
    if (m.retired) continue;
    const r = m.ratings || {};
    if (r.wirecutter != null && r.wirecutter !== '') continue;
    const eds = (r.endorsements || []).filter(e => e.channel === 'Wirecutter');
    if (eds.length === 0) continue;
    const status = pickStatus(eds);
    if (!status) continue;
    m.ratings.wirecutter = status;
    m.ratings.source_urls = m.ratings.source_urls || {};
    if (!m.ratings.source_urls.wirecutter) {
      m.ratings.source_urls.wirecutter = eds[0].url;
    }
    setCount++;
  }
  data._meta[`derive_wirecutter_2026_05`] = `Round 53: derived wirecutter field from existing endorsements for ${setCount} models.`;
  data._meta.last_updated = '2026-05-05';
  writeFileSync(path, JSON.stringify(data, null, 2) + '\n');
  console.log(`${file}: set wirecutter on ${setCount} models`);
  total += setCount;
}
console.log(`\nTotal: ${total} models gained wirecutter field`);
