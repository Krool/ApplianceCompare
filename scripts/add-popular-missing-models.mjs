// Round 25: add 6 popular missing models that show up in retailer / Wirecutter
// data but weren't in our DB. Each entry is built with verified specs,
// retailer ratings, CR URL, and a Yale brand endorsement (via brand defaults).
import { readFileSync, writeFileSync } from 'node:fs';

const URLS = {
  wirecutter: 'https://www.nytimes.com/wirecutter/reviews/best-dishwashers/',
  yale_brands: 'https://blog.yaleappliance.com/the-least-serviced-most-reliable-appliance-brands',
};

const NEW_FRIDGES = [
  {
    id: 'ge-gne25jskss',
    brand: 'ge', model: 'GNE25JSKSS',
    name: 'GE GNE25JSKSS 24.8 cu ft 33" French Door',
    style: 'french_door', depth: 'standard', width_in: 33,
    capacity_cf: 24.8, energy_star: true,
    icemaker: 'in-door', water_dispenser: 'external', wifi: false,
    finishes: ['stainless'],
    msrp: 2199, street_price: 1899,
    water_filter_model: 'XWFE', water_filter_cost_yr: 115,
    ratings: {
      cr_overall: null, cr_reliability: 'very-good', yale_reliability_pct: null, reviewed: null,
      source_urls: {
        cr: 'https://www.consumerreports.org/products/refrigerators-28978/french-door-refrigerator-37162/ge-gne25jskss-386062/',
        specs: 'https://www.bestbuy.com/site/ge-24-8-cu-ft-french-door-refrigerator-stainless-steel/5003906.p?skuId=5003906',
      },
      retailer_ratings: {
        best_buy: { stars: 4.4, count: 809, url: 'https://www.bestbuy.com/site/reviews/ge-24-8-cu-ft-french-door-refrigerator-stainless-steel/5003906' },
      },
      endorsements: [
        { channel: 'Yale Appliance', type: 'article', label: 'Yale 2026: GE Appliances — 9.2% service rate; one of the few US brands with its own national service fleet (Bodewell)', url: URLS.yale_brands },
      ],
    },
    pros: [
      '33" width fits narrower kitchens than standard 36" french-doors',
      'Best Buy 4.4/809 reviews — large customer-validation sample',
      'GE service network coverage one of the strongest in the US',
    ],
    cons: [
      'Through-door dispenser adds failure points',
      'No Wi-Fi/smart features',
      'Status: "no longer available in new condition" at Best Buy as of 2026',
    ],
    release_year: 2020,
  },
  {
    id: 'ge-gts22kgnrww',
    brand: 'ge', model: 'GTS22KGNRWW',
    name: 'GE GTS22KGNR 21.9 cu ft Garage-Ready Top-Freezer (white)',
    style: 'top_freezer', depth: 'standard', width_in: 33,
    capacity_cf: 21.9, energy_star: false,
    icemaker: 'optional', water_dispenser: 'none', wifi: false,
    finishes: ['white', 'stainless', 'black'],
    garage_ready: true,
    msrp: 949, street_price: 798,
    ratings: {
      cr_overall: null, cr_reliability: 'very-good', yale_reliability_pct: null,
      wirecutter: 'runner-up (garage-ready) 2026',
      source_urls: {
        wirecutter: 'https://www.nytimes.com/wirecutter/reviews/best-refrigerators/',
        garage_ready: 'https://www.geappliances.com/appliance/GE-21-9-Cu-Ft-Garage-Ready-Top-Freezer-Refrigerator-GTS22KGNRWW',
      },
      endorsements: [
        { channel: 'Wirecutter', type: 'roundup', label: 'Runner-up Garage-Ready 2026: "five finishes, but not quite as big, efficient, or attractive as our top pick"', url: 'https://www.nytimes.com/wirecutter/reviews/best-refrigerators/' },
        { channel: 'Yale Appliance', type: 'article', label: 'Yale 2026: GE Appliances — 9.2% service rate', url: URLS.yale_brands },
      ],
    },
    pros: [
      'Wirecutter Runner-up Garage-Ready — five finish options',
      'Garage-rated to 38°F ambient',
      '21.9 cu ft is large for a 33" top-freezer',
    ],
    cons: [
      'Wirecutter notes it\'s "less efficient than our top pick"',
      'Not Energy Star certified',
      'Through-door dispenser not available',
    ],
    release_year: 2023,
  },
];

const NEW_DISHWASHERS = [
  {
    id: 'bosch-shem63w55n',
    brand: 'bosch', model: 'SHEM63W55N',
    name: 'Bosch 300 Series SHEM63W55N 24" 44 dBA w/ 3rd Rack (long-time Wirecutter pick)',
    tub: 'stainless', decibels: 44, place_settings: 16,
    third_rack: 'yes', wash_cycles: 5,
    energy_kwh_yr: 269, water_gal_cycle: 3.2, energy_star: true,
    wifi: false, panel_ready: false,
    dry_method: 'condensation', cycle_time_min: 145, filter_type: 'manual',
    leak_protection: 'AquaStop', interior_light: false,
    msrp: 1099, street_price: 949,
    ratings: {
      cr_overall: 79, cr_reliability: 'very-good', yale_reliability_pct: 7.7, yale_reliability_source: 'yale_2026_dw',
      reviewed: null, reviewed_status: 'former Wirecutter top pick (still recommended) 2026',
      wirecutter: 'former top pick — still recommended 2026',
      source_urls: {
        wirecutter: URLS.wirecutter,
        cr: 'https://www.consumerreports.org/appliances/dishwashers/bosch-300-series-shem63w55n/m388671/',
        yale_reliability: 'https://blog.yaleappliance.com/most-reliable-dishwashers',
        specs: 'https://www.bosch-home.com/us/en/product/SHEM63W55N',
      },
      retailer_ratings: {
        best_buy: { stars: 4.5, count: 2644, url: 'https://www.bestbuy.com/product/bosch-300-series-24-front-control-built-in-tub-dishwasher-with-tub-with-3rd-rack-44-dba-stainless-steel/J3P322Y756' },
      },
      endorsements: [
        { channel: 'Wirecutter', type: 'roundup', label: 'Wirecutter (2017-2024 top pick): "best mix of cycle options, wash performance, and low price… recommended since 2017." Still listed as a "former pick worth considering" in Feb 2026 update.', url: URLS.wirecutter },
        { channel: 'Consumer Reports', type: 'review', label: 'CR overall 79; reliability rated very-good; CrystalDry, 44 dBA, 3rd rack', url: 'https://www.consumerreports.org/appliances/dishwashers/bosch-300-series-shem63w55n/m388671/' },
        { channel: 'Yale Appliance', type: 'article', label: 'Yale 2026: Bosch 300 series shares the 7.7% dishwasher service rate with the 800 series — "Best dishwashers under $1,000"', url: 'https://blog.yaleappliance.com/most-reliable-dishwashers' },
      ],
    },
    pros: [
      'Wirecutter top pick 2017-2024; still cited as a strong value in 2026',
      '2,644 Best Buy reviews at 4.5/5 — massive customer validation sample',
      '44 dBA quiet + 16 place settings + 3rd rack at sub-$1k',
      'BSH North Carolina platform; widely available parts/service',
    ],
    cons: [
      'Wirecutter\'s 2026 update: "we think there are better dishwashers available for the price" (test conditions varied)',
      'Touch-sensitive controls finickier than older button-based 300 series',
      'No interior light (Bosch reserves that for 800/Benchmark)',
    ],
    release_year: 2017,
  },
  {
    id: 'samsung-dw80b6060us',
    brand: 'samsung', model: 'DW80B6060US',
    name: 'Samsung Smart 44 dBA w/ StormWash+ & AutoRelease Door',
    tub: 'stainless', decibels: 44, place_settings: 15,
    third_rack: 'yes', wash_cycles: 7,
    energy_kwh_yr: 230, water_gal_cycle: 3.5, energy_star: true,
    wifi: true, panel_ready: false,
    dry_method: 'heated', cycle_time_min: 130, filter_type: 'self_cleaning',
    leak_protection: 'leak sensor', interior_light: false,
    msrp: 1099, street_price: 949,
    ratings: {
      cr_overall: null, cr_reliability: 'fair', yale_reliability_pct: null,
      source_urls: {
        specs: 'https://www.samsung.com/us/home-appliances/dishwashers/rotary/smart-44dba-dishwasher-with-stormwash-in-stainless-steel-dw80b6060us-aa/',
      },
      retailer_ratings: {
        best_buy: { stars: 4.8, count: 104, url: 'https://www.bestbuy.com/site/samsung-smart-44dba-dishwasher-with-stormwash-stainless-steel/6491920.p?skuId=6491920' },
      },
      endorsements: [
        { channel: 'Yale Appliance', type: 'article', label: 'Yale 2026: Samsung — covered in Yale appliance reliability data; control-board reliability is the recurring concern', url: URLS.yale_brands },
      ],
    },
    pros: [
      'Best Buy 4.8/104 — top-tier customer ratings',
      'StormWash+ dual-arm spray + AutoRelease door drying',
      '44 dBA quiet operation + Wi-Fi via SmartThings',
      'ENERGY STAR certified',
    ],
    cons: [
      'Samsung control-board reliability is the recurring concern',
      'CR rates Samsung dishwasher reliability "fair"',
      'Higher cycle times when extra-dry option is selected',
    ],
    release_year: 2023,
  },
  {
    id: 'kitchenaid-kdpm704kps',
    brand: 'kitchenaid', model: 'KDPM704KPS',
    name: 'KitchenAid KDPM704KPS 24" 44 dBA w/ FreeFlex 3rd Rack + Interior LED',
    tub: 'stainless', decibels: 44, place_settings: 16,
    third_rack: 'FreeFlex', wash_cycles: 5,
    energy_kwh_yr: 245, water_gal_cycle: 3.5, energy_star: true,
    wifi: false, panel_ready: false,
    dry_method: 'fan_assist', cycle_time_min: 145, filter_type: 'manual',
    leak_protection: 'overflow + leak sensor', interior_light: true,
    msrp: 1599, street_price: 1485,
    ratings: {
      cr_overall: null, cr_reliability: 'fair', yale_reliability_pct: 8.2, yale_reliability_source: 'yale_2026_dw',
      reviewed: null, reviewed_status: 'Wirecutter mention 2026 — "we love KitchenAid dishwashers"',
      source_urls: {
        wirecutter: URLS.wirecutter,
        cr: 'https://www.consumerreports.org/appliances/dishwashers/kitchenaid-kdpm704kps/m404464/',
        yale_reliability: 'https://blog.yaleappliance.com/most-reliable-dishwashers',
        specs: 'https://www.kitchenaid.com/major-appliances/dishwashers/integrated-control/p.360%C2%B0-max-jets-third-rack-dishwasher-with-ultra-bright-led-lighting,-44-dba.kdpm704kps.html',
      },
      retailer_ratings: {
        best_buy: { stars: 4.5, count: 65, url: 'https://www.bestbuy.com/site/kitchenaid-24-top-control-built-in-stainless-steel-tub-dishwasher-with-3rd-rack-ultra-bright-led-lighting-44dba-stainless-steel/6398229.p?skuId=6398229' },
      },
      endorsements: [
        { channel: 'Wirecutter', type: 'roundup', label: 'Wirecutter (Feb 2026) discusses the KDPM704KPS predecessor: "we love KitchenAid dishwashers, and we expect the quirks on this will be improved when newer models are released."', url: URLS.wirecutter },
        { channel: 'Consumer Reports', type: 'review', label: 'CR review of KDPM704KPS', url: 'https://www.consumerreports.org/appliances/dishwashers/kitchenaid-kdpm704kps/m404464/' },
        { channel: 'Yale Appliance', type: 'article', label: 'Yale 2026: KitchenAid 8.2% dishwasher service rate; M-Series build quality', url: 'https://blog.yaleappliance.com/most-reliable-dishwashers' },
      ],
    },
    pros: [
      '44 dBA + FreeFlex 3rd rack + interior LED at $1,500 street',
      '360° Max Jets bottom rack scrubs hard-stuck soils',
      'PrintShield finish hides smudges',
      'Yale 2026: KitchenAid 8.2% service rate (top quartile)',
    ],
    cons: [
      'CR rates KitchenAid dishwasher reliability only "fair"',
      'No Wi-Fi (M-Series KDPM has it; this 700-series does not)',
      'ProDry fan-assist isn\'t as effective as Bosch CrystalDry / Miele AutoOpen',
    ],
    release_year: 2022,
  },
];

const NEW_OVENS = [
  {
    id: 'ge-profile-phs930slss',
    brand: 'ge-profile', model: 'PHS930SLSS',
    name: 'GE Profile PHS930SLSS 30" Smart Slide-In Induction (predecessor to PHS930YPFS)',
    type: 'range', fuel: 'induction', style: 'slide-in',
    width_in: 30, oven_capacity_cf: 5.3, burners: 5,
    max_burner_btu: null, max_burner_w: 3700,
    convection: 'true convection', air_fry: false,
    self_clean: 'pyrolytic', wifi: true,
    finishes: ['stainless'],
    msrp: 2799, street_price: 2399,
    ratings: {
      cr_overall: null, cr_reliability: 'very-good', yale_reliability_pct: null,
      source_urls: {
        cr: 'https://www.consumerreports.org/appliances/ranges/ge-profile-phs930slss/m393950/',
        specs: 'https://www.geappliances.com/appliance/GE-Profile-30-Smart-Slide-In-Front-Control-Induction-and-Convection-Range-PHS930SLSS',
      },
      retailer_ratings: {
        best_buy: { stars: 4.5, count: 64, url: 'https://www.bestbuy.com/site/ge-5-3-cu-ft-slide-in-electric-induction-convection-range-stainless-steel/5979216.p?skuId=5979216' },
      },
      endorsements: [
        { channel: 'Reviewed', type: 'review', label: 'Reviewed.com individual review — GE Profile PHS930SLSS', url: 'https://www.reviewed.com/ovens/content/ge-phs930slss-induction-and-convection-range-review' },
        { channel: 'Yale Appliance', type: 'article', label: 'Yale 2026: GE Profile 8.0% service rate', url: URLS.yale_brands },
      ],
    },
    pros: [
      '5 induction zones + true convection oven',
      'Wi-Fi via SmartHQ + Chef Connect (auto-syncs with GE range hood)',
      'GE Profile 8.0% Yale service rate is top-quartile',
      '"No longer in new condition" status — buy refurb/open-box at discount',
    ],
    cons: [
      'No air fry (newer PHS930YPFS adds it)',
      'Discontinued — succeeded by PHS930YPFS (Wirecutter mention)',
    ],
    release_year: 2020,
  },
];

function addModels(file, newModels) {
  const path = `public/data/${file}.json`;
  const data = JSON.parse(readFileSync(path, 'utf8'));
  const existing = new Set(data.models.map(m => m.id));
  let added = 0;
  for (const m of newModels) {
    if (existing.has(m.id)) {
      console.log(`  SKIP (exists): ${m.id}`);
      continue;
    }
    data.models.push(m);
    added++;
  }
  data._meta.popular_missing_pass_2026_05 = `Round 25: added ${added} popular missing models (Bosch SHEM63W55N, GE GNE25JSKSS, etc.) sourced from retailer-rating searches.`;
  data._meta.last_updated = '2026-05-05';
  writeFileSync(path, JSON.stringify(data, null, 2) + '\n');
  console.log(`${file}: added ${added} new models`);
  return added;
}

let total = 0;
total += addModels('refrigerators', NEW_FRIDGES);
total += addModels('dishwashers', NEW_DISHWASHERS);
total += addModels('ovens', NEW_OVENS);
console.log(`\nTotal: ${total} new models added`);
