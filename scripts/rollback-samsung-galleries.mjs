// Roll back Samsung gallery work — too much warranty-badge / award-banner
// content mixed in with product photography to ship as-is. Samsung's CMS
// includes corporate marketing assets in the product gallery feed, and
// there's no clean URL filter to keep only the real product shots.
//
// What this removes:
//   - All public/data/images/<cat>/samsung-*-g*.webp files
//   - All docs/data/images/<cat>/samsung-*-g*.webp files
//   - `images` field from every Samsung model in *.json (drawer falls back
//     to the single canonical thumbnail, which is unchanged)

import fs from 'node:fs';
import path from 'node:path';

const CATS = ['refrigerators', 'ovens', 'dishwashers'];
let filesRemoved = 0, modelsRolled = 0;

for (const root of ['public/data/images', 'docs/data/images']) {
  for (const cat of CATS) {
    const dir = path.join(root, cat);
    if (!fs.existsSync(dir)) continue;
    for (const f of fs.readdirSync(dir)) {
      if (/^samsung-.*-g\d+\.(webp|jpg|jpeg|png)$/i.test(f)) {
        fs.unlinkSync(path.join(dir, f));
        filesRemoved++;
      }
    }
  }
}
console.log('Removed ' + filesRemoved + ' Samsung gallery files');

for (const cat of CATS) {
  for (const root of ['public/data', 'docs/data']) {
    const p = path.join(root, cat + '.json');
    const data = JSON.parse(fs.readFileSync(p, 'utf8'));
    let dirty = false;
    for (const m of data.models) {
      if (m.brand !== 'samsung' && !/^samsung-/i.test(m.id || '')) continue;
      if (Array.isArray(m.images)) {
        delete m.images;
        if (root === 'public/data') modelsRolled++;
        dirty = true;
      }
    }
    if (dirty) fs.writeFileSync(p, JSON.stringify(data, null, 2) + '\n');
  }
}
console.log('Rolled back ' + modelsRolled + ' Samsung models');
