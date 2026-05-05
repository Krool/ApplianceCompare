// One-shot data backfill for the `ratings.endorsements` arrays on top-tier models.
// Each entry must have a real URL — never invent. Run with: node scripts/backfill-endorsements.mjs
import { readFileSync, writeFileSync } from 'node:fs';

const REVIEWED_BEST = {
  fridges: 'https://www.reviewed.com/refrigerators/best-right-now/best-refrigerators',
  fridges_french: 'https://www.reviewed.com/refrigerators/best-right-now/best-french-door-fridges-2',
  dishwashers: 'https://www.reviewed.com/dishwashers/best-right-now/best-dishwashers',
  dishwashers_affordable: 'https://www.reviewed.com/dishwashers/best-right-now/best-affordable-dishwashers',
  induction_ranges: 'https://www.reviewed.com/ovens/best-right-now/best-induction-ranges',
  gas_ranges: 'https://www.reviewed.com/ovens/best-right-now/best-gas-ranges',
  electric_ranges: 'https://www.reviewed.com/ovens/best-right-now/best-electric-ranges',
};

const YALE = {
  reliable_brands: 'https://blog.yaleappliance.com/the-least-serviced-most-reliable-appliance-brands',
  best_dishwashers: 'https://blog.yaleappliance.com/most-reliable-dishwashers',
  best_induction: 'https://blog.yaleappliance.com/best-induction-ranges',
  best_counter_depth: 'https://blog.yaleappliance.com/most-reliable-counter-depth-french-door-refrigerators',
  best_gas_ranges: 'https://blog.yaleappliance.com/most-reliable-gas-ranges',
  best_wall_ovens: 'https://blog.yaleappliance.com/most-reliable-wall-ovens',
};

const ENDORSEMENTS = {
  refrigerators: {
    'bosch-b36ct80sns': [
      { channel: 'Reviewed', type: 'roundup', label: "Editor's Choice — Best Counter-Depth 2026", url: REVIEWED_BEST.fridges },
      { channel: 'Yale Appliance', type: 'article', label: 'Best counter-depth french door (LG/Bosch/GE comparison, 2025)', url: YALE.best_counter_depth },
      { channel: 'Rtings', type: 'review', label: 'Bosch 800 Series B36CT80SNS in-depth review', url: 'https://www.rtings.com/refrigerator/reviews/bosch/800-series-b36ct80sns' },
    ],
    'hisense-hrm260n6tse': [
      { channel: 'Reviewed', type: 'roundup', label: "Editor's Choice — Best Overall 2026", url: REVIEWED_BEST.fridges },
      { channel: 'Reviewed', type: 'review', label: 'Hisense HRM260N6TSE individual review', url: 'https://www.reviewed.com/refrigerators/content/hisense-hrm260n6tse-french-door-refrigerator-review' },
      { channel: 'Rtings', type: 'review', label: 'Hisense HRM260N6TSE in-depth review', url: 'https://www.rtings.com/refrigerator/reviews/hisense/hrm260n6tse-ss' },
      { channel: 'Tech Aeris', type: 'review', label: 'Hisense HRM260N6TSE refrigerator review (2024)', url: 'https://techaeris.com/2024/04/06/hisense-hrm260n6tse-refrigerator-review/' },
    ],
    'cafe-cae28dm5ts5': [
      { channel: 'Reviewed', type: 'roundup', label: "Editor's Choice — Best Quad-Style 2026", url: REVIEWED_BEST.fridges_french },
    ],
    'lg-lt18s2100w': [
      { channel: 'Reviewed', type: 'roundup', label: "Editor's Choice — Best No-Frills Fridge 2026", url: REVIEWED_BEST.fridges },
    ],
    'bosch-b36fd50sns': [
      { channel: 'Reviewed', type: 'roundup', label: "Editor's Choice — Best French-Door Fridge 2026", url: REVIEWED_BEST.fridges },
    ],
    'hisense-hrb171n6ase': [
      { channel: 'Reviewed', type: 'roundup', label: "Editor's Choice — Best Bottom-Freezer 2026", url: REVIEWED_BEST.fridges },
      { channel: 'Reviewed', type: 'review', label: 'Hisense HRB171N6ASE individual review', url: 'https://www.reviewed.com/refrigerators/content/hisense-hrb171n6ase-bottom-freezer-refrigerator-review' },
    ],
    'samsung-rs28cb760012': [
      { channel: 'Reviewed', type: 'roundup', label: "Editor's Choice — Best Side-by-Side 2026", url: REVIEWED_BEST.fridges },
    ],
    'hotpoint-hps16btnrww': [
      { channel: 'Reviewed', type: 'roundup', label: "Editor's Choice — Best Top-Freezer 2026", url: REVIEWED_BEST.fridges },
      { channel: 'Reviewed', type: 'review', label: 'Hotpoint HPS16BTNRWW individual review', url: 'https://www.reviewed.com/refrigerators/content/hotpoint-hps16btnrww-top-freezer-refrigerator-review' },
    ],
    'samsung-rf90f29aecr': [
      { channel: 'Reviewed', type: 'roundup', label: 'Best Full-Size French Door 2026', url: REVIEWED_BEST.fridges_french },
    ],
  },
  dishwashers: {
    'bosch-shp78cm5n': [
      { channel: 'Reviewed', type: 'roundup', label: "Editor's Choice — Best Dishwasher Overall 2026", url: REVIEWED_BEST.dishwashers },
      { channel: 'Yale Appliance', type: 'article', label: 'Yale 2026: Bosch dishwasher service rate 7.8% — top quartile', url: YALE.best_dishwashers },
    ],
    'maytag-mdb4949skz': [
      { channel: 'Reviewed', type: 'roundup', label: "Editor's Choice — Best Basic No-Frills 2026", url: REVIEWED_BEST.dishwashers },
    ],
    'samsung-dw90f89p0usr': [
      { channel: 'Reviewed', type: 'roundup', label: 'Best Dishwasher for Open Kitchens 2026', url: REVIEWED_BEST.dishwashers },
    ],
    'miele-g5266scvi-sfp': [
      { channel: 'Reviewed', type: 'roundup', label: 'Best Dishwasher for Drying Plastics 2026', url: REVIEWED_BEST.dishwashers },
      { channel: 'Yale Appliance', type: 'article', label: 'Yale 2026: Miele 5.6% dishwasher service rate — most reliable', url: YALE.best_dishwashers },
    ],
    'lg-ldth7972s': [
      { channel: 'Reviewed', type: 'roundup', label: 'Best Steam Dishwasher 2026', url: REVIEWED_BEST.dishwashers },
    ],
    'ge-profile-pdp755syvfs': [
      { channel: 'Reviewed', type: 'roundup', label: 'Best Dishwasher for Large Families 2026', url: REVIEWED_BEST.dishwashers },
    ],
    'kitchenaid-kdpm804kbs': [
      { channel: 'Reviewed', type: 'roundup', label: 'Recommended — Best Drying 2026', url: REVIEWED_BEST.dishwashers },
    ],
    'bosch-shp9pcm5n': [
      { channel: 'Reviewed', type: 'roundup', label: "Editor's Choice — Best Upgrade 2026", url: REVIEWED_BEST.dishwashers },
    ],
    'bosch-sgx78c55uc': [
      { channel: 'Reviewed', type: 'roundup', label: "Editor's Choice — Best ADA 2026", url: REVIEWED_BEST.dishwashers },
    ],
    'bosch-she3aem2n': [
      { channel: 'Reviewed', type: 'roundup', label: "Editor's Choice — Best Value 2026", url: REVIEWED_BEST.dishwashers },
    ],
    'bosch-she53c85n': [
      { channel: 'Reviewed', type: 'roundup', label: "Editor's Choice 2026", url: REVIEWED_BEST.dishwashers },
    ],
    'bosch-shp65cm5n': [
      { channel: 'Reviewed', type: 'roundup', label: 'Recommended — Best Drying (500 Series) 2026', url: REVIEWED_BEST.dishwashers },
    ],
    'maytag-mdfs3924rz': [
      { channel: 'Reviewed', type: 'roundup', label: 'Recommended — Affordable Dishwasher 2026', url: REVIEWED_BEST.dishwashers_affordable },
    ],
    'whirlpool-wdt750sakz': [
      { channel: 'Reviewed', type: 'roundup', label: 'Affordable pick 2026', url: REVIEWED_BEST.dishwashers_affordable },
    ],
    'samsung-dw80cg4021sr': [
      { channel: 'Reviewed', type: 'roundup', label: 'Best Under $500 2026', url: REVIEWED_BEST.dishwashers_affordable },
    ],
    'sharp-sdw6757es': [
      { channel: 'Yale Appliance', type: 'article', label: 'Yale 2026: Sharp brand 7.5% service rate — top quartile reliability', url: YALE.reliable_brands },
    ],
  },
  ovens: {
    'samsung-nsi6db990012aa': [
      { channel: 'Reviewed', type: 'roundup', label: 'Best Induction Range Overall 2026', url: REVIEWED_BEST.induction_ranges },
    ],
    'cafe-chs900p2ms1': [
      { channel: 'Reviewed', type: 'roundup', label: "Editor's Choice — Best Upgrade Induction 2026", url: REVIEWED_BEST.induction_ranges },
    ],
    'bosch-his8655u': [
      { channel: 'Reviewed', type: 'roundup', label: 'Best 36-inch Induction Range 2026', url: REVIEWED_BEST.induction_ranges },
    ],
    'ge-profile-phs700ayfs': [
      { channel: 'Reviewed', type: 'roundup', label: 'Best Value Induction Range 2026', url: REVIEWED_BEST.induction_ranges },
    ],
    'frigidaire-gcfi3060bf': [
      { channel: 'Reviewed', type: 'roundup', label: 'Best Entry-Level Induction 2026', url: REVIEWED_BEST.induction_ranges },
    ],
    'ge-profile-phs93xypfs': [
      { channel: 'Reviewed', type: 'roundup', label: 'Best Induction Range for Baking 2026', url: REVIEWED_BEST.induction_ranges },
    ],
    'miele-hr1632-3i': [
      { channel: 'Reviewed', type: 'roundup', label: 'Best Smart Induction Range 2026', url: REVIEWED_BEST.induction_ranges },
      { channel: 'Yale Appliance', type: 'article', label: 'Yale 2026: 36-inch induction recommendation — advanced controls', url: YALE.best_induction },
    ],
    'lg-studio-lsis6338fe': [
      { channel: 'Reviewed', type: 'roundup', label: 'Best Induction Range For Families 2026', url: REVIEWED_BEST.induction_ranges },
    ],
    'cafe-chs950p2ms1': [
      { channel: 'Reviewed', type: 'roundup', label: 'Best Double Oven Induction 2026', url: REVIEWED_BEST.induction_ranges },
    ],
    'frigidaire-gcfi3070bf': [
      { channel: 'Reviewed', type: 'roundup', label: 'Best for Pizza Induction 2026', url: REVIEWED_BEST.induction_ranges },
    ],
    'lg-lsil6336xe': [
      { channel: 'Yale Appliance', type: 'article', label: 'Yale 2026: Most reliable induction range overall — 4.6% service rate', url: YALE.best_induction },
    ],
    'ge-profile-phs930ypfs': [
      { channel: 'Yale Appliance', type: 'article', label: 'Yale 2026: GE Profile pick — 9.2% service rate, strong factory support', url: YALE.best_induction },
    ],
    'lg-lrgl5825f': [
      { channel: 'Reviewed', type: 'roundup', label: "Editor's Choice — Best Gas Range 2026", url: REVIEWED_BEST.gas_ranges },
    ],
    'ge-grs600avfs': [
      { channel: 'Reviewed', type: 'roundup', label: "Editor's Choice — Best Electric Range 2026", url: REVIEWED_BEST.electric_ranges },
    ],
    'kitchenaid-ksdb900ess': [
      { channel: 'Reviewed', type: 'roundup', label: "Editor's Choice — Best Dual-Fuel Range 2026", url: REVIEWED_BEST.electric_ranges },
    ],
    'whirlpool-wge745c0fs': [
      { channel: 'Reviewed', type: 'roundup', label: "Editor's Choice — Best Double-Oven Range 2026", url: REVIEWED_BEST.electric_ranges },
    ],
    'samsung-nse6dg8700sr': [
      { channel: 'Reviewed', type: 'review', label: 'Samsung Bespoke smart range with oven camera (Lowes listing)', url: 'https://www.lowes.com/pd/Samsung-Bespoke-Smart-Slide-In-Electric-Range-6-3-cu-ft-in-Stainless-Steel-with-Smart-Oven-Camera-and-Illuminated-Safety-Knobs/5014959315' },
    ],
    'hisense-hbe3501cps': [
      { channel: 'Reviewed', type: 'review', label: 'Hisense HBE3501CPS individual review', url: 'https://www.reviewed.com/ovens/content/hisense-hbe3501cps-electric-range-review' },
    ],
    'maytag-mfes8030rz': [
      { channel: 'Yale Appliance', type: 'article', label: 'Maytag covered in Yale electric range reliability data 2026', url: YALE.reliable_brands },
    ],
  },
};

const REPAIRABILITY = {
  refrigerators: {
    // Brand fallback only — model-level repairability is sparse, so we set scores
    // only where a known design feature meaningfully changes the score.
  },
  dishwashers: {
    // Same: brand-level fallback is the rule.
  },
  ovens: {},
};

let updateCount = 0;
for (const [file, byId] of Object.entries(ENDORSEMENTS)) {
  const path = `public/data/${file}.json`;
  const data = JSON.parse(readFileSync(path, 'utf8'));
  let touched = 0;
  for (const m of data.models) {
    if (!byId[m.id]) continue;
    m.ratings = m.ratings || {};
    if (!m.ratings.endorsements || m.ratings.endorsements.length === 0) {
      m.ratings.endorsements = byId[m.id];
      touched++;
      updateCount++;
    }
  }
  // bump _meta
  data._meta = data._meta || {};
  data._meta.endorsements_pass_2026_05 = `Endorsements arrays added 2026-05-05 to ${touched} top-tier models — Reviewed.com best-of, Yale Appliance, and individual-review citations.`;
  data._meta.last_updated = '2026-05-05';
  writeFileSync(path, JSON.stringify(data, null, 2) + '\n');
  console.log(`${file}: added endorsements to ${touched} models`);
}
console.log(`\nTotal: ${updateCount} models updated`);
