// Spec-derived pros/cons backfill.
//
// Rules:
//   1. Only fill EMPTY pros/cons arrays — never overwrite existing editorial.
//   2. Each bullet must be derivable from a populated field (no fabrication).
//   3. Add INTERPRETATION ("ultra-quiet", "high-output"), not raw spec restatements.
//      The spec table already shows decibels=42 — the pro adds the editorial framing
//      that <44 dB is luxury per the buying guide.
//   4. Cap at 4 pros / 3 cons per model. Skip models with <2 derivable pros' worth
//      of signal (better to leave blank than to ship generic bullets).
//   5. Pass --dry-run to print proposed changes without writing.
//
// Run:  node scripts/derive-pros-cons.mjs --dry-run [--category=ovens] [--limit=5]
//       node scripts/derive-pros-cons.mjs              (writes for real)

import fs from 'node:fs';
import path from 'node:path';
import url from 'node:url';

const ROOT = path.resolve(path.dirname(url.fileURLToPath(import.meta.url)), '..');
const DATA = path.join(ROOT, 'public', 'data');

const args = new Set(process.argv.slice(2));
const dry = args.has('--dry-run');
const catFilter = [...args].find((a) => a.startsWith('--category='))?.split('=')[1];
const limit = parseInt([...args].find((a) => a.startsWith('--limit='))?.split('=')[1] || '0', 10);

// --- per-category derivers ---

function fridgePros(m) {
  const pros = [];
  const r = m.ratings || {};

  if (m.noise_db != null) {
    if (m.noise_db <= 39) pros.push(`Near-silent operation (${m.noise_db} dB)`);
    else if (m.noise_db <= 42) pros.push(`Quiet (${m.noise_db} dB)`);
  }
  if (m.compressor) {
    const c = m.compressor.toLowerCase();
    if (c.includes('dual')) pros.push('Dual compressors (independent fridge / freezer temp control)');
    else if (c.includes('linear')) pros.push('Linear compressor (variable-speed, lower noise floor)');
    else if (c.includes('inverter')) pros.push('Inverter compressor (variable-speed, more efficient than fixed-speed)');
  }
  if (m.depth === 'built_in') pros.push('Built-in (flush installation)');
  else if (m.depth === 'counter') pros.push('Counter-depth (flush with cabinets)');
  if (m.water_dispenser === 'internal') pros.push('Internal water dispenser (lower failure rate than through-door)');
  if (m.garage_ready === true) pros.push('Garage-ready (rated for wider ambient temp range)');
  if (m.capacity_cf != null && m.capacity_cf >= 27) pros.push(`Large capacity (${m.capacity_cf} cu ft)`);
  if (m.finishes && m.finishes.some((f) => /panel.?ready/i.test(f))) {
    pros.push('Panel-ready option available');
  }
  return pros;
}

function fridgeCons(m) {
  const cons = [];
  if (m.water_dispenser === 'external' || (typeof m.water_dispenser === 'string' && /through.?door/i.test(m.water_dispenser))) {
    cons.push('External through-door dispenser — top failure point on every fridge');
  }
  if (m.noise_db != null && m.noise_db >= 48) cons.push(`Audible at ${m.noise_db} dB (above 47 dB you'll notice in an open kitchen)`);
  if (m.energy_kwh_yr != null && m.energy_kwh_yr >= 800) cons.push(`Higher energy use (${m.energy_kwh_yr} kWh/yr)`);
  return cons;
}

function dwPros(m) {
  const pros = [];
  if (m.decibels != null) {
    if (m.decibels <= 39) pros.push(`Whisper-quiet (${m.decibels} dB)`);
    else if (m.decibels <= 42) pros.push(`Ultra-quiet (${m.decibels} dB)`);
    else if (m.decibels <= 44) pros.push(`Quiet (${m.decibels} dB)`);
  }
  if (m.tub === 'stainless') pros.push('Stainless tub (heat retention, no odor)');
  else if (m.tub === 'hybrid') pros.push('Hybrid tub (sound-damped stainless)');
  if (m.third_rack && typeof m.third_rack === 'string') {
    const t = m.third_rack.toLowerCase();
    if (t.includes('myway')) pros.push('MyWay 3rd rack (deep, V-shaped — fits mugs and cereal bowls)');
    else if (t.includes('3d') || t.includes('multiflex')) pros.push('3D MultiFlex 3rd rack (fully adjustable)');
    else if (t.includes('freeflex')) pros.push('FreeFlex 3rd rack (tilt-adjustable)');
    else if (t.includes('powerblast')) pros.push('PowerBlast 3rd rack with dedicated spray');
    else if (!t.includes('basic') && !t.includes('flat')) pros.push(`3rd rack: ${m.third_rack}`);
  }
  if (m.panel_ready === true) pros.push('Panel-ready (matches custom cabinetry)');
  if (m.place_settings != null && m.place_settings >= 16) pros.push(`Large capacity (${m.place_settings} place settings)`);
  return pros;
}

function dwCons(m) {
  const cons = [];
  if (m.tub === 'plastic') cons.push('Plastic tub (retains odor; lower heat retention than stainless)');
  if (m.decibels != null && m.decibels >= 50) cons.push(`Audible at ${m.decibels} dB — noticeable in open-plan kitchens`);
  if (m.third_rack === 'basic' || m.third_rack === false || (typeof m.third_rack === 'string' && /^basic|^flat/i.test(m.third_rack))) {
    cons.push('Basic 3rd rack (utensils only — no real capacity boost)');
  }
  if (m.place_settings != null && m.place_settings <= 12) cons.push(`Small capacity (${m.place_settings} place settings)`);
  if (m.water_gal_cycle != null && m.water_gal_cycle >= 5) cons.push(`Higher water use (${m.water_gal_cycle} gal / cycle)`);
  return cons;
}

function ovenPros(m) {
  const pros = [];
  if (m.fuel === 'induction') pros.push('Induction (fast, precise, no open flame)');
  else if (m.fuel === 'dual_fuel') pros.push('Dual fuel (gas burners + electric oven for even baking)');
  if (m.max_burner_btu != null) {
    if (m.max_burner_btu >= 22000) pros.push(`Pro-level burner (${m.max_burner_btu.toLocaleString()} BTU)`);
    else if (m.max_burner_btu >= 18000) pros.push(`High-output burner (${m.max_burner_btu.toLocaleString()} BTU)`);
  }
  if (m.max_burner_w != null) {
    if (m.max_burner_w >= 4500) pros.push(`Power burner (${m.max_burner_w.toLocaleString()} W induction)`);
    else if (m.max_burner_w >= 3700) pros.push(`High-output element (${m.max_burner_w.toLocaleString()} W induction)`);
  }
  if (m.convection && typeof m.convection === 'string' && !/^no$/i.test(m.convection)) {
    pros.push(`Convection (${m.convection})`);
  }
  if (m.air_fry === true) pros.push('Built-in air fry mode');
  if (m.self_clean && typeof m.self_clean === 'string') {
    const s = m.self_clean.toLowerCase();
    if (s.includes('pyrolytic')) pros.push('Pyrolytic self-clean (high-heat ash — no chemicals, no scrubbing)');
    else if (s.includes('steam') && !s.includes('aqualift')) pros.push('Steam self-clean (lower-heat option)');
  }
  if (m.oven_capacity_cf != null && m.oven_capacity_cf >= 6) pros.push(`Large oven (${m.oven_capacity_cf} cu ft)`);
  return pros;
}

function ovenCons(m) {
  const cons = [];
  if (m.self_clean && typeof m.self_clean === 'string' && /aqualift/i.test(m.self_clean)) {
    cons.push('AquaLift only (low-heat steam — needs manual scrubbing for tough messes)');
  }
  if (m.fuel === 'gas' && m.air_fry !== true && m.convection == null) {
    // Conservative: only flag when both are missing on a gas range
    cons.push('No convection or air fry — straight gas oven');
  }
  if (m.oven_capacity_cf != null && m.oven_capacity_cf <= 4.5 && m.type === 'range') {
    cons.push(`Compact oven cavity (${m.oven_capacity_cf} cu ft)`);
  }
  return cons;
}

const DERIVERS = {
  refrigerators: { pros: fridgePros, cons: fridgeCons },
  dishwashers: { pros: dwPros, cons: dwCons },
  ovens: { pros: ovenPros, cons: ovenCons },
};

const cats = catFilter ? [catFilter] : Object.keys(DERIVERS);

let totalEdited = 0;
let totalSkippedThin = 0;

for (const cat of cats) {
  const file = path.join(DATA, `${cat}.json`);
  const doc = JSON.parse(fs.readFileSync(file, 'utf8'));
  const { pros: deriveP, cons: deriveC } = DERIVERS[cat];

  let editedThisFile = 0;

  for (const m of doc.models) {
    const hasPros = Array.isArray(m.pros) && m.pros.length > 0;
    const hasCons = Array.isArray(m.cons) && m.cons.length > 0;
    if (hasPros && hasCons) continue;

    const newPros = hasPros ? m.pros : deriveP(m).slice(0, 4);
    const newCons = hasCons ? m.cons : deriveC(m).slice(0, 3);

    // Threshold: at least 2 pros derivable when filling pros (avoid generic 1-bullet entries)
    if (!hasPros && newPros.length < 2) {
      totalSkippedThin++;
      continue;
    }

    if (dry) {
      console.log(`\n[${cat}] ${m.id}`);
      if (!hasPros) console.log('  pros: ' + JSON.stringify(newPros));
      if (!hasCons) console.log('  cons: ' + JSON.stringify(newCons));
    } else {
      m.pros = newPros;
      m.cons = newCons;
      m.last_updated = '2026-05-05';
    }

    editedThisFile++;
    if (limit && editedThisFile >= limit) break;
  }

  if (!dry && editedThisFile > 0) {
    doc._meta.last_updated = '2026-05-05';
    fs.writeFileSync(file, JSON.stringify(doc, null, 2) + '\n');
  }

  console.log(`\n${cat}: ${dry ? 'would edit' : 'edited'} ${editedThisFile} models`);
  totalEdited += editedThisFile;
}

console.log(`\nTotal: ${dry ? 'would edit' : 'edited'} ${totalEdited} models`);
console.log(`Skipped (thin signal — <2 derivable pros): ${totalSkippedThin}`);
