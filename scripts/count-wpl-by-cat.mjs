import fs from 'node:fs';
const cats = ['refrigerators', 'ovens', 'dishwashers'];
const out = [];
for (const cat of cats) {
  const d = JSON.parse(fs.readFileSync('public/data/' + cat + '.json', 'utf8'));
  let cnt = 0, urlCnt = 0, hasG = 0;
  for (const m of d.models) {
    if (m.retired) continue;
    if (m.brand !== 'whirlpool' && !/^whirlpool-/i.test(m.id)) continue;
    cnt++;
    const mfg = m.ratings?.source_urls?.manufacturer || m.ratings?.source_urls?.specs;
    if (mfg && /whirlpool\.com/i.test(mfg)) urlCnt++;
    if (Array.isArray(m.images) && m.images.length > 1) hasG++;
  }
  out.push(cat + ': ' + cnt + ' whirlpool models, ' + urlCnt + ' with URL, ' + hasG + ' already have galleries');
}
fs.writeFileSync('.image-audit/wpl-by-cat.txt', out.join('\n'));
