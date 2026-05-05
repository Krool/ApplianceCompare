// Round 27 (cleanup): remove records I added in round 25 that violate the
// "buyable today" rule:
//   - ge-gne25jskss (discontinued; Best Buy "no longer available in new condition")
//   - ge-profile-phs930slss (discontinued; succeeded by PHS930YPFS)
//   - ge-gts22kgnrww (duplicate of existing ge-gts22kynrs — same 21.9 cu ft
//     garage-ready top-freezer, just the white finish SKU)
//
// Also moves the Wirecutter "runner-up garage-ready" endorsement from the
// duplicate onto the canonical ge-gts22kynrs record.
import { readFileSync, writeFileSync } from 'node:fs';

// --- Refrigerators ---
{
  const path = 'public/data/refrigerators.json';
  const data = JSON.parse(readFileSync(path, 'utf8'));
  const removeIds = new Set(['ge-gne25jskss', 'ge-gts22kgnrww']);

  // Pull the Wirecutter endorsement off the dup before removing it
  const dup = data.models.find(m => m.id === 'ge-gts22kgnrww');
  const wirecutterEnd = dup?.ratings?.endorsements?.find(e => e.channel === 'Wirecutter');
  const target = data.models.find(m => m.id === 'ge-gts22kynrs');
  if (target && wirecutterEnd) {
    target.ratings = target.ratings || {};
    target.ratings.source_urls = target.ratings.source_urls || {};
    target.ratings.endorsements = target.ratings.endorsements || [];
    if (!target.ratings.wirecutter) {
      target.ratings.wirecutter = 'runner-up (garage-ready) 2026';
      target.ratings.source_urls.wirecutter = wirecutterEnd.url;
    }
    const haveUrls = new Set(target.ratings.endorsements.map(e => e.url + '|' + e.label.slice(0,60)));
    if (!haveUrls.has(wirecutterEnd.url + '|' + wirecutterEnd.label.slice(0,60))) {
      target.ratings.endorsements.push(wirecutterEnd);
    }
  }

  const before = data.models.length;
  data.models = data.models.filter(m => !removeIds.has(m.id));
  const removed = before - data.models.length;
  data._meta.cleanup_pass_2026_05 = `Round 27 cleanup: removed ${removed} models added in round 25 that failed the "buyable today" rule (discontinued or finish-only duplicates of existing records). Wirecutter garage-ready endorsement merged from ge-gts22kgnrww into the canonical ge-gts22kynrs record.`;
  data._meta.last_updated = '2026-05-05';
  writeFileSync(path, JSON.stringify(data, null, 2) + '\n');
  console.log(`refrigerators: removed ${removed}; merged Wirecutter into ge-gts22kynrs`);
}

// --- Ovens ---
{
  const path = 'public/data/ovens.json';
  const data = JSON.parse(readFileSync(path, 'utf8'));
  const removeIds = new Set(['ge-profile-phs930slss']);
  const before = data.models.length;
  data.models = data.models.filter(m => !removeIds.has(m.id));
  const removed = before - data.models.length;
  data._meta.cleanup_pass_2026_05 = `Round 27 cleanup: removed ${removed} models added in round 25 that failed the "buyable today" rule (PHS930SLSS is discontinued; PHS930YPFS is the current model and is already in the DB).`;
  data._meta.last_updated = '2026-05-05';
  writeFileSync(path, JSON.stringify(data, null, 2) + '\n');
  console.log(`ovens: removed ${removed}`);
}
