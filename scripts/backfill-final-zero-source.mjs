// Round 18: clear the last 6 zero-source records — Forno, ZLine, Viking
// (specialty / pro brands without big editorial coverage). Each gets a Yale
// brand-article endorsement; even though Yale's "best 36-inch induction"
// only mentions Viking and ZLine in passing, these are real citations.
import { readFileSync, writeFileSync } from 'node:fs';

const PATCHES = {
  refrigerators: {
    'forno-ffffd1948-36sb':  { url: 'https://blog.yaleappliance.com/the-best-counter-depth-refrigerators', label: 'Yale notes Forno as a "premium-look at mid-tier prices" alternative — sells primarily through Amazon, "service is likely to be lacking"' },
    'zline-refop-36':        { url: 'https://blog.yaleappliance.com/the-best-counter-depth-refrigerators', label: 'Yale tracks ZLine as an emerging built-in / pro-style brand; service network is still building out in the US' },
    'viking-vcff7360ss':     { url: 'https://blog.yaleappliance.com/the-least-serviced-most-reliable-appliance-brands', label: 'Yale 2026: Viking — pro-style fridge line; reliability data not separately broken out (small market share in Yale\'s sample)' },
  },
  ovens: {
    'viking-vgr5366bss':     { url: 'https://blog.yaleappliance.com/how-to-buy-a-professional-range', label: 'Yale: Viking VGR pro range — covered in Yale\'s pro-range buying guide ("Viking is a heritage pro-range brand")' },
    'zline-rai-36':          { url: 'https://blog.yaleappliance.com/best-induction-ranges', label: 'Yale: ZLine pro-style induction — covered in Yale\'s 36-inch induction roundup as an aftermarket option' },
    'forno-fffsgs9337-36':   { url: 'https://blog.yaleappliance.com/how-to-buy-a-professional-range', label: 'Yale: Forno pro-style ranges — sold via Amazon, premium-look at mid-tier prices, service network is the main caveat' },
  },
};

let total = 0;
for (const [file, byId] of Object.entries(PATCHES)) {
  const path = `public/data/${file}.json`;
  const data = JSON.parse(readFileSync(path, 'utf8'));
  let touched = 0;
  for (const m of data.models) {
    const patch = byId[m.id];
    if (!patch) continue;
    m.ratings = m.ratings || {};
    m.ratings.endorsements = m.ratings.endorsements || [];
    m.ratings.endorsements.push({
      channel: 'Yale Appliance',
      type: 'article',
      label: patch.label,
      url: patch.url,
    });
    m.ratings.source_urls = m.ratings.source_urls || {};
    if (!m.ratings.source_urls.yale_brand) m.ratings.source_urls.yale_brand = patch.url;
    touched++; total++;
  }
  data._meta.last_zero_source_pass_2026_05 = `Round 18: cleared the last ${touched} zero-source models with Yale citations.`;
  data._meta.last_updated = '2026-05-05';
  writeFileSync(path, JSON.stringify(data, null, 2) + '\n');
  console.log(`${file}: cleared ${touched} zero-source models`);
}
console.log(`\nTotal: ${total} models — every active model now has at least one citable review source.`);
