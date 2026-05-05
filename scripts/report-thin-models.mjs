// Diagnostic: count models by tier and identify the thinnest ones —
// models with ZERO signals (no CR/Reviewed/RTINGS/Cnet/GH/TG, no retailer
// ratings, no Yale reliability, no repairability, no Wirecutter, no
// endorsements). These are the most-improvable.
import { readFileSync } from 'node:fs';

const FILES = ['refrigerators', 'dishwashers', 'ovens'];

for (const file of FILES) {
  const data = JSON.parse(readFileSync(`public/data/${file}.json`, 'utf8'));
  const tierCount = { thin: 0, limited: 0, solid: 0, strong: 0 };
  const thinModels = [];
  for (const m of data.models) {
    if (m.retired) continue;
    const r = m.ratings || {};
    const rr = r.retailer_ratings || {};
    let sigs = 0;
    if (r.cr_overall != null) sigs++;
    if (r.reviewed != null || r.reviewed_status != null) sigs++;
    if (r.rtings != null) sigs++;
    if (r.cnet != null) sigs++;
    if (r.good_housekeeping != null) sigs++;
    if (r.toms_guide != null) sigs++;
    if (['home_depot', 'lowes', 'best_buy', 'aj_madison'].some(k => rr[k]?.stars != null)) sigs++;
    if (r.yale_reliability_pct != null) sigs++;
    if (r.repairability_score != null) sigs++;
    if (r.wirecutter != null) sigs++;
    if (Array.isArray(r.endorsements) && r.endorsements.length > 0) sigs++;

    let tier;
    if (sigs === 0) tier = 'thin';   // (treating brand fallback as thin for this report)
    else if (sigs === 1) tier = 'limited';
    else if (sigs === 2) tier = 'solid';
    else tier = 'strong';
    tierCount[tier]++;
    if (sigs === 0) thinModels.push(m);
  }
  console.log(`\n=== ${file} ===`);
  console.log(`  thin: ${tierCount.thin}, limited: ${tierCount.limited}, solid: ${tierCount.solid}, strong: ${tierCount.strong}`);
  console.log(`  Thin models (first 15):`);
  for (const m of thinModels.slice(0, 15)) {
    console.log(`    ${m.id}  (${m.brand} ${m.model})`);
  }
  if (thinModels.length > 15) console.log(`    ...and ${thinModels.length - 15} more`);
}
