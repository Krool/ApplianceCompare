// Round 52: derive reviewed_status field from existing Reviewed endorsements.
// reviewed_status occupies the same signal slot as a Reviewed numeric score
// (helpers.jsx#getScoreConfidence collapses both into one). For models that
// have a Reviewed editorial pick (Editor's Choice / Best Of) but no
// reviewed_status set, populating the field adds a NEW signal slot that the
// endorsements bucket doesn't already fill — bumping many limited-tier models
// to solid-tier.
//
// Heuristic: take the strongest Reviewed endorsement label and extract the
// award designation. Conservative — only sets reviewed_status when the label
// clearly contains "Editor's Choice" or "Best [category]" or similar.
import { readFileSync, writeFileSync } from 'node:fs';

function pickBestStatus(reviewedEndorsements) {
  // Rank endorsements by strength of award. "Best Overall" > "Editor's Choice"
  // > "Best [X]" > "Recommended" > tested.
  function rank(e) {
    const l = (e.label || '').toLowerCase();
    if (l.includes('best overall') || l.includes('best refrigerator')
        || l.includes('best dishwasher') || l.includes('best range')) return 5;
    if (l.includes("editor's choice") || l.includes('editors\' choice') || l.includes("editors choice")) return 4;
    if (l.match(/best\s+[a-z]/)) return 3;
    if (l.includes('recommended')) return 2;
    if (l.includes('tested')) return 1;
    return 0;
  }
  let best = null, bestRank = -1;
  for (const e of reviewedEndorsements) {
    const r = rank(e);
    if (r > bestRank) { bestRank = r; best = e; }
  }
  if (!best || bestRank === 0) return null;

  // Extract a concise status string from the label. Try to capture the award
  // phrase, or fall back to the parenthetical category.
  const label = best.label || '';
  // Look for "Editor's Choice / Best X" or "Best X" or "Editor's Choice"
  const m1 = label.match(/(["']?[Bb]est [^"'·:—]+["']?)/);
  const m2 = label.match(/(Editor['’]?s? Choice[^"'·:—]*)/i);
  const m3 = label.match(/\(([^)]+)\):\s*"([^"]+)"/);
  let status;
  if (m2 && m1) {
    status = `${m2[1].replace(/['’"]/g,'').trim()} · ${m1[1].replace(/['’"]/g,'').trim()}`;
  } else if (m2) {
    status = m2[1].replace(/['’"]/g,'').trim();
  } else if (m1) {
    status = m1[1].replace(/['’"]/g,'').trim();
  } else if (m3) {
    status = m3[1].trim();
  } else {
    return null;
  }
  return status.replace(/\s+/g, ' ').trim();
}

function findReviewedSourceUrl(reviewedEndorsements) {
  // Prefer a "main guide" URL; otherwise first URL.
  for (const e of reviewedEndorsements) {
    if (/best-(refrigerators|dishwashers|ranges)$/.test(e.url)) return e.url;
  }
  return reviewedEndorsements[0]?.url || null;
}

const FILES = ['refrigerators', 'dishwashers', 'ovens'];
let totalSet = 0;
for (const file of FILES) {
  const path = `public/data/${file}.json`;
  const data = JSON.parse(readFileSync(path, 'utf8'));
  let setCount = 0;
  for (const m of data.models) {
    if (m.retired) continue;
    const r = m.ratings || {};
    if (r.reviewed != null) continue;
    if (r.reviewed_status != null && r.reviewed_status !== '') continue;
    const eds = (r.endorsements || []).filter(e => e.channel === 'Reviewed');
    if (eds.length === 0) continue;
    const status = pickBestStatus(eds);
    if (!status) continue;
    m.ratings.reviewed_status = status;
    m.ratings.source_urls = m.ratings.source_urls || {};
    if (!m.ratings.source_urls.reviewed) {
      const u = findReviewedSourceUrl(eds);
      if (u) m.ratings.source_urls.reviewed = u;
    }
    setCount++;
  }
  data._meta[`derive_reviewed_status_2026_05`] = `Round 52: derived reviewed_status from existing Reviewed endorsements for ${setCount} models. NEW signal slot — expected to upgrade many limited→solid.`;
  data._meta.last_updated = '2026-05-05';
  writeFileSync(path, JSON.stringify(data, null, 2) + '\n');
  console.log(`${file}: set reviewed_status on ${setCount} models`);
  totalSet += setCount;
}
console.log(`\nTotal: ${totalSet} models gained reviewed_status (= new Reviewed signal slot)`);
