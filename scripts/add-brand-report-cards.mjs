// One-shot: append 18 missing brand_report_card entries to buying-guide.json.
// Each entry is distilled from the existing brands.json `notes` prose — no fabrication.
// After this lands, brand_report_card covers all 43 brands.

import fs from 'node:fs';
import path from 'node:path';
import url from 'node:url';

const ROOT = path.resolve(path.dirname(url.fileURLToPath(import.meta.url)), '..');
const BG_PATH = path.join(ROOT, 'public', 'data', 'buying-guide.json');
const BRANDS_PATH = path.join(ROOT, 'public', 'data', 'brands.json');

const newEntries = [
  {
    brand_id: 'lg-studio',
    one_liner: "LG's upscale line — wall ovens and steam-assist ranges. Yale 2026: 8.2% service rate.",
    you_want_this_if: "You like LG's tech but want premium fit-and-finish without jumping to SKS pricing.",
    avoid_if: "You can't articulate the difference between LG, LG Studio, and SKS — the gap is real but narrow.",
  },
  {
    brand_id: 'bosch-benchmark',
    one_liner: "Bosch's flagship — Benchmark dishwashers and induction cooktops. 39 dB silence at the top of the range.",
    you_want_this_if: "You're already buying Bosch and want the quietest, most feature-loaded version.",
    avoid_if: "The 800 Series is 95% of the experience for two-thirds the price.",
  },
  {
    brand_id: 'ge',
    one_liner: "Best mainstream value per Yale 2026 (9.2% service rate). CR 2026 best brand for gas ranges and side-by-side fridges. Operates its own national service network.",
    you_want_this_if: "You want a workhorse appliance with parts in stock anywhere in the country.",
    avoid_if: "You want premium aesthetics or sub-44 dB dishwasher silence — go GE Profile or Café.",
  },
  {
    brand_id: 'haier',
    one_liner: "Parent company of GE Appliances. Haier-branded units are mostly compact / apartment-scale.",
    you_want_this_if: "You need a 24-inch fridge or a small-footprint kitchen appliance and the price is right.",
    avoid_if: "You're shopping full-size — buy GE-branded instead; same ownership, deeper US service.",
  },
  {
    brand_id: 'hotpoint',
    one_liner: "GE's budget sub-brand — stripped-down top-freezers and basic ranges. Reviewed.com's pick for best 2026 top-freezer (HPS16BTNRWW).",
    you_want_this_if: "Rental property, garage fridge, or you genuinely just need a box that keeps food cold.",
    avoid_if: "Anyone in the household will use it daily for cooking that matters.",
  },
  {
    brand_id: 'amana',
    one_liner: "Whirlpool budget sub-brand. Shares parts and platform with Whirlpool at lower price.",
    you_want_this_if: "You'd buy Whirlpool but want $200 off the same machine in a different badge.",
    avoid_if: "You want the Whirlpool name for resale or cosmetic reasons.",
  },
  {
    brand_id: 'asko',
    one_liner: "Scandinavian premium dishwasher specialist. Limited US distribution.",
    you_want_this_if: "Bosch / Miele aesthetics aren't to your taste and you have an Asko dealer nearby.",
    avoid_if: "Your zip code doesn't have authorized Asko service — the brand is too rare to repair easily.",
  },
  {
    brand_id: 'bertazzoni',
    one_liner: "Italian range specialist with pro-style aesthetics at a step below Bluestar / Wolf pricing.",
    you_want_this_if: "You want pro-style colors (yellow, red, orange) without paying ultra-premium.",
    avoid_if: "You need national service depth — Bertazzoni's US network is thin.",
  },
  {
    brand_id: 'dacor',
    one_liner: "Samsung-owned ultra-premium line. Built-in fridges, ranges, ovens.",
    you_want_this_if: "You like Samsung's tech (Family Hub, smart features) and want it in a built-in form.",
    avoid_if: "You're buying ultra-premium for reliability — Sub-Zero, Wolf, and Miele have stronger track records.",
  },
  {
    brand_id: 'ikea',
    one_liner: "Rebadged Whirlpool, Electrolux, and others under IKEA house names.",
    you_want_this_if: "You're doing an IKEA kitchen and want one-stop assembly.",
    avoid_if: "You care which OEM made the appliance — the badge hides it; check the model number against the parent brand.",
  },
  {
    brand_id: 'insignia',
    one_liner: "Best Buy house brand. Rebadged from various OEMs at value pricing.",
    you_want_this_if: "You're shopping Best Buy and want the cheapest functional option.",
    avoid_if: "You need warranty service from anyone other than Best Buy / Geek Squad.",
  },
  {
    brand_id: 'kenmore',
    one_liner: "Sears legacy brand under Transformco. Sub-brand of various OEMs depending on model.",
    you_want_this_if: "Inheriting a Kenmore or matching an existing built-in cavity from a Sears install.",
    avoid_if: "You're starting fresh — Kenmore's post-Sears service network is uneven and the OEM is opaque.",
  },
  {
    brand_id: 'kucht',
    one_liner: "Pro-style ranges at a budget price. Newer brand; long-term reliability unverified.",
    you_want_this_if: "You want the pro-range look on a tight budget and accept the unknown reliability tradeoff.",
    avoid_if: "You want a 10+ year track record — Bertazzoni / Forno / ZLINE offer similar looks with more history.",
  },
  {
    brand_id: 'midea',
    one_liner: "Chinese mid-tier brand expanding US dishwasher and microwave distribution. Strong value per CR testing.",
    you_want_this_if: "You're shopping CR-tested value and don't need brand recognition.",
    avoid_if: "You want premium service responsiveness — US technician familiarity is still building.",
  },
  {
    brand_id: 'sharp',
    one_liner: "Japanese electronics maker, expanding US dishwasher line.",
    you_want_this_if: "You want a quiet DW from a brand most people overlook — Sharp's 39 dB models are competitively priced.",
    avoid_if: "You're shopping a brand-name suite — Sharp won't match your fridge or range aesthetically.",
  },
  {
    brand_id: 'summit',
    one_liner: "Compact and specialty appliance specialist — small kitchens, ADA, RV, undercounter.",
    you_want_this_if: "You have a non-standard cavity (24-inch, ADA-height, ADA-front-controls, RV) and need a unit that actually fits.",
    avoid_if: "You have standard kitchen dimensions — mainstream brands offer better value at scale.",
  },
  {
    brand_id: 'thor-kitchen',
    one_liner: "Pro-style ranges at a budget price. Newer brand; long-term reliability unverified.",
    you_want_this_if: "Pro-range aesthetic on a tight budget and you're comfortable with limited track record.",
    avoid_if: "You want a service network you can rely on outside major metros.",
  },
  {
    brand_id: 'unique-appliances',
    one_liner: "Canadian specialty maker — off-grid, propane, retro styling.",
    you_want_this_if: "Off-grid cabin, RV, or you want a 1950s-styled fridge in a modern kitchen.",
    avoid_if: "You want a conventional appliance — there are easier options at every price point.",
  },
];

// Verify every brand_id resolves
const knownBrands = new Set(JSON.parse(fs.readFileSync(BRANDS_PATH, 'utf8')).brands.map((b) => b.id));
for (const e of newEntries) {
  if (!knownBrands.has(e.brand_id)) {
    console.error(`Unknown brand_id: ${e.brand_id}`);
    process.exit(1);
  }
}

const bg = JSON.parse(fs.readFileSync(BG_PATH, 'utf8'));
const existingIds = new Set(bg.brand_report_card.map((e) => e.brand_id));
const toAdd = newEntries.filter((e) => !existingIds.has(e.brand_id));

bg.brand_report_card.push(...toAdd);
bg._meta.last_updated = '2026-05-05';
fs.writeFileSync(BG_PATH, JSON.stringify(bg, null, 2) + '\n');

console.log(`Added ${toAdd.length} brand_report_card entries; total now ${bg.brand_report_card.length}`);
console.log(`buying-guide _meta.last_updated → ${bg._meta.last_updated}`);
