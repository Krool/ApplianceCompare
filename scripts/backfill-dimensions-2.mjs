// Round 11: dimensions for popular fridges (LG LRMVS, Bosch B36CT80, Samsung
// RS28CB, Samsung RF90F). All values verified against manufacturer or
// authorized-dealer spec sheets via search.
import { readFileSync, writeFileSync } from 'node:fs';

const FRIDGE_DIMS = {
  'lg-lrmvs2806s':       { height_in: 68.5,  depth_in: 33.75, depth_with_handle_in: 36.25, hinge: null },
  'bosch-b36ct80sns':    { height_in: 72.0,  depth_in: 25.0,  depth_with_handle_in: 31.13, hinge: null },
  'samsung-rs28cb760012':{ height_in: 70.625, depth_in: 33.75, depth_with_handle_in: 33.75, hinge: null },
  'samsung-rf90f29aecr': { height_in: 70.25, depth_in: 34.25, depth_with_handle_in: 34.25, hinge: null },
};

let touched = 0;
const path = 'public/data/refrigerators.json';
const data = JSON.parse(readFileSync(path, 'utf8'));
for (const m of data.models) {
  const dims = FRIDGE_DIMS[m.id];
  if (!dims) continue;
  let modelTouched = false;
  for (const [k, v] of Object.entries(dims)) {
    if (v != null && m[k] == null) { m[k] = v; modelTouched = true; }
  }
  if (modelTouched) touched++;
}
data._meta.dimensions_pass_2_2026_05 = `Round 11 dimensions backfill 2026-05-05: ${touched} more fridges (popular flagships) received height_in / depth_in / depth_with_handle_in.`;
data._meta.last_updated = '2026-05-05';
writeFileSync(path, JSON.stringify(data, null, 2) + '\n');
console.log(`refrigerators: dimensions on ${touched} more models`);
