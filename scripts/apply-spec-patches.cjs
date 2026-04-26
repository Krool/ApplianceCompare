// Merge spec patches into model entries. Patches keyed by model ID.
// Usage: node scripts/apply-spec-patches.cjs path/to/patches.json
const fs = require('fs');
const path = require('path');
const ROOT = path.resolve(__dirname, '..');

const patchesPath = process.argv[2];
if (!patchesPath) { console.error('usage: node apply-spec-patches.cjs path/to/patches.json'); process.exit(1); }
const patches = JSON.parse(fs.readFileSync(patchesPath, 'utf8'));

const files = ['dishwashers', 'refrigerators', 'ovens'];
const datasets = {};
files.forEach(f => {
  datasets[f] = JSON.parse(fs.readFileSync(path.join(ROOT, 'public', 'data', f + '.json'), 'utf8'));
});

const TOP_LEVEL_FIELDS = new Set([
  'tub','decibels','place_settings','third_rack','wash_cycles','energy_kwh_yr',
  'water_gal_cycle','energy_star','wifi','panel_ready','msrp','street_price',
  'finishes','release_year','capacity_cf','noise_db','icemaker','water_dispenser',
  'compressor','garage_ready','oven_capacity_cf','burners','max_burner_btu',
  'max_burner_w','convection','air_fry','self_clean','width_in','depth','style',
  'fuel','type','pros','cons','name'
]);

let applied = 0, missed = 0, fieldsSet = 0;
for (const [id, patch] of Object.entries(patches)) {
  let found = null;
  for (const f of files) {
    const m = datasets[f].models.find(x => x.id === id);
    if (m) { found = m; break; }
  }
  if (!found) { console.log('  MISS: ' + id); missed++; continue; }

  for (const [k, v] of Object.entries(patch)) {
    if (v == null) continue;
    if (k === 'source_urls') {
      found.ratings = found.ratings || {};
      let urlObj = v;
      if (Array.isArray(v)) {
        urlObj = {};
        v.forEach((u, i) => { urlObj['url_' + i] = u; });
      }
      found.ratings.source_urls = { ...(found.ratings.source_urls || {}), ...urlObj };
      fieldsSet += Object.keys(urlObj).length;
    } else if (k === 'retailer_ratings') {
      found.ratings = found.ratings || {};
      found.ratings.retailer_ratings = { ...(found.ratings.retailer_ratings || {}), ...v };
      fieldsSet += Object.keys(v).length;
    } else if (k === 'ratings') {
      // Allow patches that nest other rating fields (cnet, rtings, gh, etc.)
      found.ratings = found.ratings || {};
      for (const [rk, rv] of Object.entries(v)) {
        if (rv == null) continue;
        if (rk === 'source_urls' || rk === 'retailer_ratings') {
          found.ratings[rk] = { ...(found.ratings[rk] || {}), ...rv };
        } else {
          found.ratings[rk] = rv;
        }
        fieldsSet++;
      }
    } else if (TOP_LEVEL_FIELDS.has(k)) {
      // Only overwrite null/missing — never clobber existing data with fresh research that disagrees
      if (found[k] == null || found[k] === undefined) {
        found[k] = v;
        fieldsSet++;
      }
    }
  }
  applied++;
}

files.forEach(f => {
  if (datasets[f]._meta) datasets[f]._meta.last_updated = '2026-04-25';
  fs.writeFileSync(path.join(ROOT, 'public', 'data', f + '.json'), JSON.stringify(datasets[f], null, 2) + '\n');
});
console.log('Models patched: ' + applied + '   Fields populated: ' + fieldsSet + '   Misses: ' + missed);
