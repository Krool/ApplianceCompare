// Diagnostic: list models in 'limited' tier that have endorsements but no
// retailer_ratings — these are the highest-leverage candidates for tier upgrade
// (adding a Best Buy rating bumps them limited → solid).
import { readFileSync } from 'node:fs';

const FILES = ['refrigerators', 'dishwashers', 'ovens'];

for (const file of FILES) {
  const data = JSON.parse(readFileSync(`public/data/${file}.json`, 'utf8'));
  const candidates = [];
  for (const m of data.models) {
    if (m.retired) continue;
    const r = m.ratings || {};
    const rr = r.retailer_ratings || {};
    const hasRetailer = ['home_depot', 'lowes', 'best_buy', 'aj_madison']
      .some(k => rr[k]?.stars != null);
    if (hasRetailer) continue;
    const hasEndorsements = Array.isArray(r.endorsements) && r.endorsements.length > 0;
    if (!hasEndorsements) continue;
    // Count other signals (excluding endorsements)
    let otherSignals = 0;
    if (r.cr_overall != null) otherSignals++;
    if (r.reviewed != null || r.reviewed_status != null) otherSignals++;
    if (r.rtings != null) otherSignals++;
    if (r.cnet != null) otherSignals++;
    if (r.good_housekeeping != null) otherSignals++;
    if (r.toms_guide != null) otherSignals++;
    if (r.yale_reliability_pct != null) otherSignals++;
    if (r.repairability_score != null) otherSignals++;
    if (r.wirecutter != null) otherSignals++;
    // Endorsements add 1 signal. So total = otherSignals + 1.
    // We want models where otherSignals === 0 (so total = 1, "limited").
    if (otherSignals === 0) {
      candidates.push({ id: m.id, brand: m.brand, model: m.model, name: m.name });
    }
  }
  console.log(`\n=== ${file}: ${candidates.length} limited-tier-with-only-endorsements ===`);
  for (const c of candidates.slice(0, 20)) {
    console.log(`  ${c.id}  (${c.brand} ${c.model})`);
  }
  if (candidates.length > 20) console.log(`  ...and ${candidates.length - 20} more`);
}
