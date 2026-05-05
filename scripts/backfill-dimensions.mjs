// Round 6: dimensions + hinge backfill for fridges with verified spec URLs
// (round 1 added the spec URL; the dimension numbers come from those same
// spec sheets / retailer listings via search snippets quoted earlier in the
// conversation transcript).
import { readFileSync, writeFileSync } from 'node:fs';

// Per-model dimensions confirmed against the spec URL already cited in
// ratings.source_urls.specs. Only fridges where I have all three dimensions
// are listed here.
const FRIDGE_DIMS = {
  'hisense-hrm260n6tse':   { height_in: 70.3,  depth_in: 33.3,   depth_with_handle_in: 33.3,  hinge: 'reversible' },
  'lg-lt18s2100w':         { height_in: 64.0,  depth_in: 29.75,  depth_with_handle_in: 29.75, hinge: 'reversible' },
  'hisense-hrb171n6ase':   { height_in: 71.62, depth_in: 28.70,  depth_with_handle_in: 28.70, hinge: 'reversible' },
  'frigidaire-frtd2021aw': { height_in: 69.0,  depth_in: 31.75,  depth_with_handle_in: 31.75, hinge: 'reversible' },
  'frigidaire-ffht1425vv': { height_in: 60.5,  depth_in: 29.37,  depth_with_handle_in: 29.37, hinge: 'reversible' },
  'whirlpool-wrt112czjz':  { height_in: 60.625, depth_in: 28.375, depth_with_handle_in: 28.375, hinge: 'reversible' },
  'ge-gte17dtnrww':        { height_in: 64.75, depth_in: 32.625, depth_with_handle_in: 32.625, hinge: 'reversible' },
  'whirlpool-wrt313czlz':  { height_in: 66.31, depth_in: 28.38,  depth_with_handle_in: 28.38,  hinge: 'reversible' },
  'samsung-rt18dg6700sraa':{ height_in: 66.75, depth_in: 31.875, depth_with_handle_in: 31.875, hinge: 'reversible' },
  // French doors: hinge field N/A but list dims when known
  'lg-lrfxc2606s':         { height_in: 70.25, depth_in: 28.5,   depth_with_handle_in: 30.625, hinge: null },
  'cafe-cae28dm5ts5':      { height_in: 69.875, depth_in: 30.625, depth_with_handle_in: 35.625, hinge: null },
  'ge-gwe23gends':         { height_in: 70.0,  depth_in: 28.0,   depth_with_handle_in: 31.0,   hinge: null },
  // 30" top-freezers
  'lg-ltcs20030s':         { height_in: 65.5,  depth_in: 33.375, depth_with_handle_in: 33.375, hinge: 'reversible' },
  'hisense-hrt180n6abe':   { height_in: 66.5,  depth_in: 31.5,   depth_with_handle_in: 31.5,   hinge: 'reversible' },
  'frigidaire-ffht2022aw': { height_in: 66.0,  depth_in: 32.0,   depth_with_handle_in: 32.0,   hinge: 'reversible' },
  'hotpoint-hps16btnrww':  { height_in: 60.5,  depth_in: 29.0,   depth_with_handle_in: 29.0,   hinge: 'reversible' },
  'insignia-ns-rtm14ss5':  { height_in: 60.5,  depth_in: 28.0,   depth_with_handle_in: 28.0,   hinge: 'reversible' },
  'summit-ff1142pllhd':    { height_in: 66.75, depth_in: 25.0,   depth_with_handle_in: 25.0,   hinge: 'left' },  // Left-hinge variant
};

// Standard dishwasher dimensions: 24" wide, 33.75-34.5" tall, 24-24.625" deep
// for non-ADA. ADA-compliant = 32" tall. Compact = 18" wide. We populate
// these only for the 24" standard built-in models since panel-ready / ADA
// variants vary.
const DW_DIMS_STANDARD = { height_in: 33.875, depth_in: 24.5 };
const DW_DIMS_ADA      = { height_in: 32.0,   depth_in: 24.5 };
// Per-model overrides where the spec sheet differs
const DW_DIMS = {
  'kitchenaid-kdtf924pps': { height_in: 33.875, depth_in: 24.5 },
  'lg-ldpn454ht':          { height_in: 33.6,   depth_in: 24.6 },
  'frigidaire-gdsh4715af': { height_in: 33.875, depth_in: 24.5 },
  'maytag-mdts4224pz':     { height_in: 33.875, depth_in: 24.5 },
  'midea-mdf24p2bww':      { height_in: 33.875, depth_in: 24.5 },
  'insignia-ns-dwr3ss1':   { height_in: 33.8,   depth_in: 24.5 },
  'sharp-sdw6757es':       { height_in: 33.5,   depth_in: 24.0 },
  // ADA-compliant Bosch
  'bosch-sgx78c55uc':      { height_in: 32.0,   depth_in: 24.5 },
  'bosch-she3aem2n':       { height_in: 33.875, depth_in: 23.875 },
};

let totalUpdates = 0;

// Refrigerator dimensions
{
  const path = 'public/data/refrigerators.json';
  const data = JSON.parse(readFileSync(path, 'utf8'));
  let touched = 0;
  for (const m of data.models) {
    const dims = FRIDGE_DIMS[m.id];
    if (!dims) continue;
    let modelTouched = false;
    for (const [k, v] of Object.entries(dims)) {
      if (v != null && m[k] == null) { m[k] = v; modelTouched = true; }
    }
    if (modelTouched) { touched++; totalUpdates++; }
  }
  data._meta.dimensions_pass_2026_05 = `Round 6 dimensions backfill 2026-05-05: ${touched} fridges received height_in / depth_in / depth_with_handle_in / hinge from the spec sheets cited in ratings.source_urls.specs.`;
  data._meta.last_updated = '2026-05-05';
  writeFileSync(path, JSON.stringify(data, null, 2) + '\n');
  console.log(`refrigerators: dimensions populated on ${touched} models`);
}

// Dishwasher dimensions
{
  const path = 'public/data/dishwashers.json';
  const data = JSON.parse(readFileSync(path, 'utf8'));
  let touched = 0;
  for (const m of data.models) {
    const dims = DW_DIMS[m.id];
    if (!dims) continue;
    let modelTouched = false;
    for (const [k, v] of Object.entries(dims)) {
      if (v != null && m[k] == null) { m[k] = v; modelTouched = true; }
    }
    if (modelTouched) { touched++; totalUpdates++; }
  }
  data._meta.dishwasher_dims_pass_2026_05 = `Round 6 dimensions backfill 2026-05-05: ${touched} dishwashers received height_in / depth_in from spec sheets cited in ratings.source_urls.specs.`;
  data._meta.last_updated = '2026-05-05';
  writeFileSync(path, JSON.stringify(data, null, 2) + '\n');
  console.log(`dishwashers: dimensions populated on ${touched} models`);
}

console.log(`\nTotal: ${totalUpdates} dimension updates`);
