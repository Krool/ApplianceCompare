import fs from 'node:fs';

const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0 Safari/537.36';
const out = [];
function log(...a) { out.push(a.join(' ')); }

// Maytag: extract data-asset= values to see if AEM lists gallery assets
const maytagUrl = 'https://www.maytag.com/kitchen/refrigerators/french-door/p.36-inch-wide-french-door-refrigerator-with-powercold-feature-25-cu.-ft.mfi2570fez.html';
log('=== Maytag data-asset extraction');
const r1 = await fetch(maytagUrl, { headers: { 'User-Agent': UA } });
const html1 = await r1.text();
const assetRe = /data-asset=["']([^"']+)["']/g;
let m;
while ((m = assetRe.exec(html1)) !== null) log('  ' + m[1]);

// Fisher & Paykel: try several models with mfg URLs
const fpUrls = [
  { id: 'fp-ci365dtb4', url: 'https://www.fisherpaykel.com/us/cooking/cooktops/minimal-cooktops/induction-cooktop-36in-5-zones-with-smartzone-ci365dtb4-81972.html' },
  { id: 'fp-dd24dtx6hi1', url: 'https://www.fisherpaykel.com/us/dishwashing/integrated-dishwashers/series-11-integrated-tall-double-dishdrawer-dishwasher-dd24dtx6hi1-82163.html' },
];

log('\n=== Fisher & Paykel sample probes');
for (const t of fpUrls) {
  log('\n  ' + t.id + ' :: ' + t.url);
  const r = await fetch(t.url, { headers: { 'User-Agent': UA } });
  log('    status ' + r.status);
  if (!r.ok) continue;
  const html = await r.text();
  const urls = new Set();
  // og:image / twitter:image
  for (const re of [
    /<meta[^>]+property=["']og:image[^"']*["'][^>]+content=["']([^"']+)["']/gi,
    /<meta[^>]+name=["']twitter:image[^"']*["'][^>]+content=["']([^"']+)["']/gi,
  ]) {
    let m; while ((m = re.exec(html)) !== null) urls.add(m[1]);
  }
  // dam.fisherpaykel.com URLs in HTML
  const damRe = /https?:\/\/dam\.fisherpaykel\.com\/[^"'\s)]+/gi;
  let mm; while ((mm = damRe.exec(html)) !== null) urls.add(mm[0]);
  // JSON-LD
  const ldRe = /<script[^>]+type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi;
  let mmm;
  while ((mmm = ldRe.exec(html)) !== null) {
    try {
      const obj = JSON.parse(mmm[1]);
      const visit = (o) => {
        if (!o) return;
        if (Array.isArray(o)) { o.forEach(visit); return; }
        if (typeof o === 'object') {
          if (o.image) {
            if (Array.isArray(o.image)) o.image.forEach(s => typeof s === 'string' && urls.add(s));
            else if (typeof o.image === 'string') urls.add(o.image);
          }
          for (const v of Object.values(o)) visit(v);
        }
      };
      visit(obj);
    } catch {}
  }
  // Filter to dam.fisherpaykel.com only (real product photos)
  const dam = [...urls].filter(u => /dam\.fisherpaykel\.com/i.test(u));
  log('    dam URLs: ' + dam.length);
  // De-dup by base (strip query)
  const dedup = new Set();
  for (const u of dam) {
    const base = u.split('?')[0];
    if (dedup.has(base)) continue;
    dedup.add(base);
    log('      ' + u);
  }
}

fs.writeFileSync('.image-audit/maytag-fp-probe.txt', out.join('\n'));
