import fs from 'node:fs';
const cats = ['refrigerators', 'ovens', 'dishwashers'];
const out = [];
for (const cat of cats) {
  const d = JSON.parse(fs.readFileSync('public/data/' + cat + '.json', 'utf8'));
  for (const m of d.models) {
    if (m.retired) continue;
    const isFP = m.brand === 'fisher-paykel' || /^(fp|fisher-paykel)-/i.test(m.id);
    if (!isFP) continue;
    const urls = (m.ratings && m.ratings.source_urls) || {};
    out.push({
      id: m.id,
      cat,
      model: m.model_number || m.id,
      mfg: urls.manufacturer || null,
      specs: urls.specs || null,
      hasGallery: Array.isArray(m.images) && m.images.length > 1,
    });
  }
}
fs.writeFileSync('.image-audit/fp-survey.txt', out.map(o => JSON.stringify(o)).join('\n'));
