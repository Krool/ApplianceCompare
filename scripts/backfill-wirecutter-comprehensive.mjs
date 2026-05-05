// Round 14 (BIG): tag every Wirecutter pick across fridges, dishwashers,
// electric ranges, gas ranges, and counter-depth fridges. Picks come from
// the four Wirecutter articles the user pasted into the conversation:
//   - Best Refrigerators (general)         — Updated Feb 23 2026
//   - Best Dishwashers                      — Updated Feb 2 2026
//   - Best Electric Stoves and Ranges       — Updated Oct 3 2025
//   - Best Gas Stoves and Ranges            — Updated Mar 20 2026
//   - Best Counter-Depth Refrigerators      — Updated Apr 20 2026
import { readFileSync, writeFileSync } from 'node:fs';

const URLS = {
  fridges: 'https://www.nytimes.com/wirecutter/reviews/best-refrigerators/',
  dishwashers: 'https://www.nytimes.com/wirecutter/reviews/best-dishwashers/',
  electric: 'https://www.nytimes.com/wirecutter/reviews/best-electric-stoves/',
  gas: 'https://www.nytimes.com/wirecutter/reviews/best-gas-ranges/',
  counter_depth: 'https://www.nytimes.com/wirecutter/reviews/best-counter-depth-refrigerators/',
};

const FRIDGE_PICKS = {
  'lg-lrflc2706s':       { status: 'top pick (best french-door) 2026',   url: URLS.fridges,       label: 'Top pick — Best French-Door 2026: "spacious… consistently rank at the top for customer satisfaction"' },
  'ge-gne27jymfs':       { status: 'runner-up (french-door) 2026',       url: URLS.fridges,       label: "Runner-up French-Door 2026: more-flexible layout, isn't smart" },
  'lg-lrdcs2603s':       { status: 'top pick (best 33-inch bottom-freezer) 2026', url: URLS.fridges, label: 'Best 33-inch Bottom-Freezer 2026: "loads of capacity and smart features"' },
  'whirlpool-wrb329dmbm':{ status: 'top pick (best 30-inch bottom-freezer) 2026', url: URLS.fridges, label: 'Best 30-inch Bottom-Freezer 2026: "ample capacity… high marks for repairability"' },
  'lg-ltcs20020s':       { status: 'top pick (energy-efficient top-freezer) 2026', url: URLS.fridges, label: 'Energy-Efficient Top-Freezer 2026: "Energy Star–approved"' },
  'ge-gts22kynrs':       { status: 'runner-up (garage-ready) 2026',      url: URLS.fridges,       label: 'Runner-up Garage-Ready 2026: "five finishes… not quite as big, efficient, or attractive"' },
  // Counter-depth article
  'fp-rf201acjsx1':      { status: 'wirecutter-cited cousin (CD French-Door) 2026', url: URLS.counter_depth, label: 'Counter-Depth article cites the RF201ADJSX5 (slightly newer SKU) as Best CD French-Door — same Series 7 platform' },
  'miele-kfn4776ed':     { status: 'upgrade pick (premium CD bottom-freezer) 2026', url: URLS.counter_depth, label: 'Counter-Depth Upgrade Pick 2026: "Good-looking, smart, and nearly counter-depth"' },
};

const DISHWASHER_PICKS = {
  'miele-g5008scu':      { status: 'top pick 2026',          url: URLS.dishwashers, label: 'Top pick — Best Overall 2026: "powerful, durable cleaner… highest owner-satisfaction rate"' },
  'maytag-mdb8959skz':   { status: 'runner-up 2026',         url: URLS.dishwashers, label: 'Runner-up 2026: "strong cleaner, better dryer… plastic dries thoroughly"' },
  'whirlpool-wdta50sakz':{ status: 'budget pick 2026',       url: URLS.dishwashers, label: 'Budget Pick 2026: "stainless steel tub… effective wash system" (sub-$700)' },
  // Bosch nuance per Wirecutter — they removed Bosch from picks but still flag the 300 series as a former pick worth considering. Add an endorsement note rather than a wirecutter-pick status.
  'bosch-she53c85n':     { status: null, url: URLS.dishwashers, label: '"Former top pick" — Wirecutter no longer features Bosch but says "we still like the 300 Series SHE53C85N… better dishwashers available for the price"' },
  'bosch-she41cm5n':     { status: null, url: URLS.dishwashers, label: 'Wirecutter notes the new cheaper SHE41CM5N: "no third rack… not yet tested" (Feb 2026)' },
};

const OVEN_PICKS = {
  // Electric ranges
  'ge-grf600avss':           { status: 'top pick (best electric range) 2026', url: URLS.electric, label: 'Top pick — Best Electric Range: "great cooktop and baking features for a good price… four finishes"' },
  'whirlpool-wfes3030rs':    { status: 'budget pick (electric) 2026',         url: URLS.electric, label: 'Budget pick — Electric: "great value… ranks high for repairability"' },
  'frigidaire-gcre3060bf':   { status: 'best for baking (electric) 2026',     url: URLS.electric, label: 'Best for Baking — Electric: "true convection… cooktop bridge for a dual-element griddle"' },
  'frigidaire-gcre3060af':   { status: 'predecessor to wirecutter pick',      url: URLS.electric, label: 'Wirecutter notes GCRE3060A is the "discontinued version" — newer GCRE3060B is current pick' },
  'ikea-tvarsaker':          { status: 'best for induction (freestanding) 2026', url: URLS.electric, label: 'Best for Induction — Electric: "the only widely available [freestanding induction] option and a great value"' },
  // Gas ranges
  'ge-ggf600avss':           { status: 'top pick (best gas range) 2026',      url: URLS.gas,      label: 'Top pick — Best Gas Range 2026: "sturdy, powerful stove with basic convection… excellent baking features"' },
  'frigidaire-gcrg3060bf':   { status: 'upgrade pick (gas, baking) 2026',     url: URLS.gas,      label: 'Upgrade Pick (Gas) 2026: "true convection oven… powerful cooktop with integrated griddle"  | RECALL: Mar 2026 Electrolux recall for delayed-ignition burn risk' },
  'ge-profile-pgb965ypfs':   { status: 'best for double-oven (gas) 2026',     url: URLS.gas,      label: 'Best for Double Oven — Gas 2026: "particularly large lower oven… powerful 20,000 Btu cooktop"' },
  // GE JGB735 (already added in round 3) — Wirecutter's "former top pick"
  'ge-jgb735spss':           { status: 'former top pick (gas) — still recommended 2026', url: URLS.gas, label: 'Wirecutter (Mar 2026): "former top pick" — still cited as having "best looks and build quality of any affordable gas range"' },
};

let updateCount = 0;

function applyPatches(file, picks) {
  const path = `public/data/${file}.json`;
  const data = JSON.parse(readFileSync(path, 'utf8'));
  let touched = 0;
  for (const m of data.models) {
    const patch = picks[m.id];
    if (!patch) continue;
    m.ratings = m.ratings || {};
    m.ratings.source_urls = m.ratings.source_urls || {};
    if (patch.status && !m.ratings.wirecutter) {
      m.ratings.wirecutter = patch.status;
      m.ratings.source_urls.wirecutter = patch.url;
    }
    m.ratings.endorsements = m.ratings.endorsements || [];
    const have = new Set(m.ratings.endorsements.map(e => e.url + '|' + (e.label || '').slice(0, 60)));
    const newE = { channel: 'Wirecutter', type: 'roundup', label: patch.label, url: patch.url };
    const key = newE.url + '|' + newE.label.slice(0, 60);
    if (!have.has(key)) {
      m.ratings.endorsements.push(newE);
      touched++; updateCount++;
    }
  }
  data._meta.wirecutter_pass_2026_05 = `Round 14 Wirecutter backfill 2026-05-05: ${touched} models tagged with Wirecutter pick status + endorsement. Source: full Wirecutter articles for fridges, dishwashers, electric ranges, gas ranges, counter-depth fridges (all updated Feb–Apr 2026).`;
  data._meta.last_updated = '2026-05-05';
  writeFileSync(path, JSON.stringify(data, null, 2) + '\n');
  console.log(`${file}: tagged ${touched} models`);
}

applyPatches('refrigerators', FRIDGE_PICKS);
applyPatches('dishwashers', DISHWASHER_PICKS);
applyPatches('ovens', OVEN_PICKS);

console.log(`\nTotal: ${updateCount} Wirecutter tags applied`);
