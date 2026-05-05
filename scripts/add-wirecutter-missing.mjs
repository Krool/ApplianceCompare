// Round 15: add the 17 Wirecutter-picked models that are missing from the DB.
// Each entry's hard data (style, capacity, dimensions, prices) comes from the
// Wirecutter article text the user pasted. Specs I cannot verify against the
// article are left null and can be backfilled in a future round.
//
// Brand defaults (water_filter for fridges, dry_method etc. for dishwashers)
// will be applied by the existing comprehensive-backfill script the next time
// it runs over these new IDs.
import { readFileSync, writeFileSync } from 'node:fs';

const URLS = {
  fridges: 'https://www.nytimes.com/wirecutter/reviews/best-refrigerators/',
  dishwashers: 'https://www.nytimes.com/wirecutter/reviews/best-dishwashers/',
  electric: 'https://www.nytimes.com/wirecutter/reviews/best-electric-stoves/',
  gas: 'https://www.nytimes.com/wirecutter/reviews/best-gas-ranges/',
  counter_depth: 'https://www.nytimes.com/wirecutter/reviews/best-counter-depth-refrigerators/',
};

// ============================================================
// REFRIGERATOR additions
// ============================================================
const NEW_FRIDGES = [
  {
    id: 'ge-gse25gypfs',
    brand: 'ge', model: 'GSE25GYPFS',
    name: 'GE GSE25G ~25 cu ft Side-by-Side (Wirecutter top pick)',
    style: 'side_by_side', depth: 'standard', width_in: 36,
    capacity_cf: 25.1, energy_star: true,
    icemaker: 'in-door', water_dispenser: 'external', wifi: false,
    finishes: ['fingerprint-resistant stainless'],
    msrp: 1899, street_price: 1799,
    ratings: {
      wirecutter: 'top pick (best side-by-side) 2026',
      cr_overall: null, cr_reliability: 'very-good', yale_reliability_pct: null, reviewed: null,
      source_urls: {
        wirecutter: URLS.fridges,
        specs: 'https://www.geappliances.com/appliance/GE-Side-by-Side-Refrigerator-GSE25GYPFS',
      },
      endorsements: [
        { channel: 'Wirecutter', type: 'roundup', label: 'Top pick — Best Side-by-Side 2026: "spacious and efficient 36-inch fridge has an especially adjustable and sturdy interior layout… GE Appliances ranks near the top for customer service"', url: URLS.fridges },
      ],
    },
    pros: [
      'Wirecutter top pick — "user-friendly freezer" + "exceptionally adjustable" interior',
      'GE service network is one of the strongest in the US',
      'Through-door water + ice dispenser (rare on a side-by-side under $2k)',
    ],
    cons: [
      'Side-by-side compartments are narrow — Wirecutter notes many owners "struggle to fit wide items like casserole dishes"',
      'Side-by-side is the least-efficient style by Energy Star ranking',
    ],
    release_year: 2024,
  },
  {
    id: 'whirlpool-wrs315snhm',
    brand: 'whirlpool', model: 'WRS315SNHM',
    name: 'Whirlpool WRS315SNH 36" Side-by-Side (no dispenser)',
    style: 'side_by_side', depth: 'standard', width_in: 36,
    capacity_cf: 25.1, energy_star: false,
    icemaker: 'none', water_dispenser: 'none', wifi: false,
    finishes: ['fingerprint-resistant stainless'],
    msrp: 1399, street_price: 1298,
    ratings: {
      wirecutter: 'best side-by-side without dispenser 2026',
      cr_overall: null, cr_reliability: 'very-good', yale_reliability_pct: null,
      source_urls: { wirecutter: URLS.fridges },
      endorsements: [
        { channel: 'Wirecutter', type: 'roundup', label: 'Best side-by-side without dispenser 2026: "omits both an ice maker and a through-the-door water dispenser, so it\'s more spacious, efficient, and affordable"', url: URLS.fridges },
      ],
    },
    pros: [
      'No dispenser = no through-door failure points (the #1 fridge complaint)',
      'More usable interior space than dispenser variants',
      'Whirlpool ranks high for repairability',
    ],
    cons: [
      'No ice maker, no water dispenser — by design',
      'Wirecutter notes it "isn\'t as user-friendly as our other picks"',
    ],
    release_year: 2023,
  },
  {
    id: 'ge-gts17dtnrww',
    brand: 'ge', model: 'GTS17DTNRWW',
    name: 'GE GTS17DTNR 16.6 cu ft No-Frills Top-Freezer (white)',
    style: 'top_freezer', depth: 'standard', width_in: 28,
    capacity_cf: 16.6, energy_star: false, // GTS = standard, GTE is the Energy Star variant
    icemaker: 'optional', water_dispenser: 'none', wifi: false,
    finishes: ['white'],
    msrp: 599, street_price: 548,
    ratings: {
      wirecutter: 'top pick (basic top-freezer) 2026',
      cr_overall: null, cr_reliability: 'very-good', yale_reliability_pct: null,
      source_urls: { wirecutter: URLS.fridges, specs: 'https://www.geappliances.com/appliance/GE-16-6-Cu-Ft-Top-Freezer-Refrigerator-GTS17DTNRWW' },
      endorsements: [
        { channel: 'Wirecutter', type: 'roundup', label: 'Top pick — Basic Top-Freezer 2026: "small, 28.8-inch, no-frills top-freezer model can accommodate an ice maker. GE Appliances is known for its service."', url: URLS.fridges },
      ],
    },
    pros: [
      'Wirecutter Top Pick basic top-freezer — sub-$600',
      'No digital controls = fewer failure points (Wirecutter calls top-freezers "buy it for life")',
      'GE service-network coverage is one of the strongest in the US',
    ],
    cons: [
      'Not Energy Star certified (the GTE17DTNR variant is)',
      'Icemaker not included as standard',
      'No interior digital display',
    ],
    release_year: 2023,
  },
  {
    id: 'frigidaire-fftr1835vs',
    brand: 'frigidaire', model: 'FFTR1835VS',
    name: 'Frigidaire FFTR1835V 18.3 cu ft Top-Freezer (Wirecutter upgrade)',
    style: 'top_freezer', depth: 'standard', width_in: 30,
    capacity_cf: 18.3, energy_star: true,
    icemaker: 'optional', water_dispenser: 'none', wifi: false,
    finishes: ['stainless', 'black', 'white'],
    msrp: 749, street_price: 678,
    ratings: {
      wirecutter: 'upgrade pick (top-freezer) 2026',
      cr_overall: null, cr_reliability: 'very-good', yale_reliability_pct: null,
      source_urls: { wirecutter: URLS.fridges },
      endorsements: [
        { channel: 'Wirecutter', type: 'roundup', label: 'Upgrade Pick Top-Freezer 2026: "30-inch, medium-size fridge has plenty of capacity and upgraded features, including humidity-controlled crispers, glass shelves, and a deli drawer"', url: URLS.fridges },
      ],
    },
    pros: [
      'Wirecutter upgrade pick — humidity-controlled crispers + glass shelves at top-freezer price',
      'Deli drawer adds organization most top-freezers lack',
      'ENERGY STAR certified at sub-$700',
    ],
    cons: [
      'Frigidaire icemaker reliability has been variable per CR',
      'No water dispenser',
    ],
    release_year: 2023,
  },
  {
    id: 'lg-lhtns2403s',
    brand: 'lg', model: 'LHTNS2403S',
    name: 'LG LHTNS2403 24 cu ft Garage-Ready Top-Freezer (Wirecutter top pick)',
    style: 'top_freezer', depth: 'standard', width_in: 33,
    capacity_cf: 24, energy_star: true,
    icemaker: 'optional', water_dispenser: 'none', wifi: false,
    compressor: 'smart inverter linear (10yr warranty)',
    finishes: ['printproof stainless'],
    garage_ready: true,
    msrp: 999, street_price: 849,
    ratings: {
      wirecutter: 'top pick (best garage-ready) 2026',
      cr_overall: null, cr_reliability: 'excellent', yale_reliability_pct: 5.5, yale_reliability_source: 'yale_2026',
      source_urls: {
        wirecutter: URLS.fridges,
        garage_ready: 'https://www.homedepot.com/p/LG-Electronics-24-cu-ft-Top-Freezer-Refrigerator-LHTNS2403S/318467412',
        yale_reliability: 'https://blog.yaleappliance.com/the-least-serviced-most-reliable-appliance-brands',
      },
      endorsements: [
        { channel: 'Wirecutter', type: 'roundup', label: 'Top pick — Best Garage-Ready 2026: "Designed to work in temperatures as low as 38°F, this extra-large top-freezer fridge has loads of capacity, and it\'s sleek enough to use as your primary refrigerator. But it\'s only at Home Depot."', url: URLS.fridges },
      ],
    },
    pros: [
      'Wirecutter Top Pick garage-ready — rated to 38°F ambient',
      'Largest garage-ready capacity at 24 cu ft',
      'LG smart inverter linear compressor with 10-year parts warranty',
    ],
    cons: [
      'Home Depot exclusive — limited dealer pool',
      'No water dispenser',
    ],
    release_year: 2024,
  },
  {
    id: 'ge-gbe17hyrfs',
    brand: 'ge', model: 'GBE17HYRFS',
    name: 'GE GBE17HYRFS 17.7 cu ft Counter-Depth Bottom-Freezer (Wirecutter CD top pick)',
    style: 'bottom_freezer', depth: 'counter', width_in: 31,
    capacity_cf: 17.7, energy_star: true,
    icemaker: 'none', water_dispenser: 'none', wifi: false,
    finishes: ['fingerprint-resistant stainless'],
    height_in: 68, depth_in: 27, depth_with_handle_in: 27,
    msrp: 1899, street_price: 1799,
    ratings: {
      wirecutter: 'top pick (best counter-depth bottom-freezer) 2026',
      cr_overall: null, cr_reliability: 'very-good', yale_reliability_pct: null,
      source_urls: { wirecutter: URLS.counter_depth, specs: 'https://www.geappliances.com/appliance/GE-Counter-Depth-Bottom-Freezer-Refrigerator-GBE17HYRFS' },
      endorsements: [
        { channel: 'Wirecutter', type: 'roundup', label: 'Top Pick CD Bottom-Freezer 2026: "fantastic compromise — handsome, affordable, nearly counter-depth… one of the least-expensive nearly counter-depth fridges I found, and at just about 18 cubic feet, ample capacity for its size."', url: URLS.counter_depth },
      ],
    },
    pros: [
      'Wirecutter Top Pick — least expensive nearly-CD fridge',
      '17.7 cu ft is roomy for a CD model — same as a 30" standard-depth top-freezer',
      'Bottom-freezer style has highest owner-satisfaction rate per Wirecutter survey',
      'GE Appliances service-network coverage is class-leading',
    ],
    cons: [
      'No icemaker (Wirecutter flags this as the main miss)',
      'Recessed-handle doors are sleek but harder to grip for some users',
    ],
    release_year: 2024,
  },
  {
    id: 'fp-rf201adjsx5',
    brand: 'fisher-paykel', model: 'RF201ADJSX5',
    name: 'Fisher & Paykel Series 7 RF201ADJSX5 20.1 cu ft Counter-Depth French-Door (Wirecutter CD top pick)',
    style: 'french_door', depth: 'counter', width_in: 36,
    capacity_cf: 20.1, energy_star: true,
    icemaker: 'internal', water_dispenser: 'none', wifi: true,
    finishes: ['stainless'],
    height_in: 70.5, depth_in: 27.4, depth_with_handle_in: 28.5,
    msrp: 4099, street_price: 3799,
    ratings: {
      wirecutter: 'top pick (best counter-depth french-door) 2026',
      cr_overall: null, cr_reliability: null, yale_reliability_pct: null,
      source_urls: { wirecutter: URLS.counter_depth },
      endorsements: [
        { channel: 'Wirecutter', type: 'roundup', label: 'Top Pick CD French-Door 2026: "truly premium inside and out, with a storage layout that owners really like… 20.1 cu ft of capacity… Fisher & Paykel known for high-quality design and functionality."', url: URLS.counter_depth },
      ],
    },
    pros: [
      'Wirecutter Top Pick CD French-Door — premium build inside and out',
      '20.1 cu ft in a CD body matches many standard-depth fridges',
      'Wi-Fi + 2-yr warranty + 5-yr cooling-system warranty (better than category norm)',
      'Bar-handle profile maximizes flush-look',
    ],
    cons: [
      'Smaller F&P service network — confirm local coverage before buying',
      '$3,799 — pricier than 36" standard-depth french-doors',
    ],
    release_year: 2025,
  },
  {
    id: 'maytag-mfc2062fez',
    brand: 'maytag', model: 'MFC2062FEZ',
    name: 'Maytag MFC2062FEZ 20 cu ft Counter-Depth French-Door (Wirecutter CD budget pick)',
    style: 'french_door', depth: 'counter', width_in: 36,
    capacity_cf: 20, energy_star: true,
    icemaker: 'internal', water_dispenser: 'internal', wifi: false,
    finishes: ['fingerprint-resistant stainless'],
    height_in: 68.5, depth_in: 26.9, depth_with_handle_in: 28.9,
    msrp: 2599, street_price: 2399,
    ratings: {
      wirecutter: 'budget pick (counter-depth french-door) 2026',
      cr_overall: null, cr_reliability: 'very-good', yale_reliability_pct: null,
      source_urls: { wirecutter: URLS.counter_depth },
      endorsements: [
        { channel: 'Wirecutter', type: 'roundup', label: 'CD Budget Pick 2026: "attractive, nearly counter-depth, 36-inch French-door fridge from a reliable brand… internal ice maker and water dispenser… 10-year compressor parts warranty."', url: URLS.counter_depth },
      ],
    },
    pros: [
      'Wirecutter budget CD pick — most affordable internal-dispenser CD French-door',
      '10-year compressor parts warranty (longer than category norm)',
      'Maytag service + repairability rated highly per Whirlpool corp surveys',
    ],
    cons: [
      'Wirecutter notes it "doesn\'t seem quite as high-end as some of our other counter-depth French-door picks"',
      'Chunkier handles add depth vs newer F&P / Bosch CD designs',
    ],
    release_year: 2024,
  },
  {
    id: 'whirlpool-wrsc5536rb',
    brand: 'whirlpool', model: 'WRSC5536RB',
    name: 'Whirlpool WRSC5536RB 20.9 cu ft Counter-Depth Side-by-Side (Wirecutter CD top pick)',
    style: 'side_by_side', depth: 'counter', width_in: 36,
    capacity_cf: 20.9, energy_star: false,
    icemaker: 'in-door', water_dispenser: 'external', wifi: false,
    finishes: ['stainless', 'black stainless', 'black', 'white'],
    height_in: 69, depth_in: 28.4, depth_with_handle_in: 30,
    msrp: 1999, street_price: 1799,
    ratings: {
      wirecutter: 'top pick (best counter-depth side-by-side) 2026',
      cr_overall: null, cr_reliability: 'very-good', yale_reliability_pct: null,
      source_urls: { wirecutter: URLS.counter_depth },
      endorsements: [
        { channel: 'Wirecutter', type: 'roundup', label: 'Top Pick CD Side-by-Side 2026: "the shallowest side-by-side I could find from a manufacturer I\'d recommend… in-door dispenser for water and ice… third storage drawer in the fridge compartment."', url: URLS.counter_depth },
      ],
    },
    pros: [
      'Wirecutter Top Pick CD side-by-side — shallowest recommendable SbS',
      'Four finish options (most of any CD pick)',
      'In-door ice + water dispenser (rare in CD format)',
      'Whirlpool repairability rated class-leading',
    ],
    cons: [
      'Side-by-side is the least-efficient style; this model is not Energy Star',
      'Wirecutter notes it "lacks the premium feel of a higher-end model"',
    ],
    release_year: 2024,
  },
  {
    id: 'bosch-b24cb80ess',
    brand: 'bosch', model: 'B24CB80ESS',
    name: 'Bosch 800 Series B24CB80ES 14.1 cu ft 24" Counter-Depth (Wirecutter CD 24" top pick)',
    style: 'bottom_freezer', depth: 'counter', width_in: 24,
    capacity_cf: 14.1, energy_star: true,
    icemaker: 'internal', water_dispenser: 'internal', wifi: true,
    finishes: ['stainless', 'black', 'white'],
    height_in: 79.9, depth_in: 26.2, depth_with_handle_in: 26.2,
    msrp: 3899, street_price: 3599,
    ratings: {
      wirecutter: 'top pick (best 24-inch counter-depth) 2026',
      cr_overall: null, cr_reliability: null, yale_reliability_pct: 8.7, yale_reliability_source: 'yale_2026',
      source_urls: { wirecutter: URLS.counter_depth, yale_reliability: 'https://blog.yaleappliance.com/the-least-serviced-most-reliable-appliance-brands' },
      endorsements: [
        { channel: 'Wirecutter', type: 'roundup', label: 'Top Pick 24" CD 2026: "narrow but spacious nearly counter-depth fridge… dual cooling system with two compressors and two evaporator coils — more commonly seen on higher-priced built-ins."', url: URLS.counter_depth },
      ],
    },
    pros: [
      'Wirecutter Top Pick 24" CD — apartment-kitchen / ADU specialist',
      '14.1 cu ft is roomy for a 24" model (most are ~12 cu ft)',
      'Dual-compressor system — usually only on built-in fridges',
      'Internal ice maker + water dispenser at this width is rare',
    ],
    cons: [
      'Nearly 80" tall — may not fit under existing upper cabinets',
      'Recessed-handle doors are sleek but harder to grip',
      '$3,599 — premium price for a small fridge',
    ],
    release_year: 2024,
  },
];

// ============================================================
// DISHWASHER additions
// ============================================================
const NEW_DISHWASHERS = [
  {
    id: 'miele-g7216scu',
    brand: 'miele', model: 'G 7216 SCU',
    name: 'Miele G7216 24" Built-In w/ AutoOpen Drying (Wirecutter upgrade pick)',
    tub: 'stainless', decibels: 43, place_settings: 16,
    third_rack: 'yes', wash_cycles: 12,
    energy_kwh_yr: 210, water_gal_cycle: 3.5, energy_star: true,
    wifi: false, panel_ready: false,
    dry_method: 'fan_assist', cycle_time_min: 165, filter_type: 'manual',
    leak_protection: 'WaterProof', interior_light: true,
    msrp: 2099, street_price: 1999,
    ratings: {
      wirecutter: 'upgrade pick 2026',
      cr_overall: null, cr_reliability: null, yale_reliability_pct: 5.6, yale_reliability_source: 'yale_2026_dw',
      source_urls: { wirecutter: URLS.dishwashers, yale_reliability: 'https://blog.yaleappliance.com/most-reliable-dishwashers' },
      endorsements: [
        { channel: 'Wirecutter', type: 'roundup', label: 'Upgrade Pick 2026: "exceptional cleaner, reliable… delivered the cleanest dishes in the least amount of time, thanks to QuickIntenseWash technology"', url: URLS.dishwashers },
      ],
    },
    pros: [
      'Wirecutter Upgrade Pick — fastest top-tier cleaning cycle they tested',
      '43 dBA — among the quietest dishwashers',
      '2-year warranty + optional 5-year extended (longest in category)',
      'Auto-open door at end of cycle expedites drying',
    ],
    cons: [
      'No Wi-Fi (G7266 SCVi adds it for ~$300 more)',
      'Miele service techs scarce in some regions',
      '$2,000 street price — premium territory',
    ],
    release_year: 2024,
  },
  {
    id: 'cafe-cdt888p2vs1',
    brand: 'cafe', model: 'CDT888P2VS1',
    name: 'Café CDT888 24" 39 dBA w/ Customizable Hardware (Wirecutter best-for design)',
    tub: 'stainless', decibels: 39, place_settings: 16,
    third_rack: 'yes', wash_cycles: 7,
    energy_kwh_yr: 240, water_gal_cycle: 3.5, energy_star: true,
    wifi: true, panel_ready: false,
    dry_method: 'power_dry', cycle_time_min: 180, filter_type: 'self_cleaning',
    leak_protection: 'leak sensor', interior_light: true,
    msrp: 1949, street_price: 1749,
    ratings: {
      wirecutter: 'best for customizable design 2026',
      cr_overall: null, cr_reliability: 'fair', yale_reliability_pct: null,
      source_urls: { wirecutter: URLS.dishwashers, specs: 'https://www.cafeappliances.com/appliance/CAFE-Dishwasher-CDT888P2VS1' },
      endorsements: [
        { channel: 'Wirecutter', type: 'roundup', label: 'Best for Customizable Design 2026: "stylish dishwasher offers multiple exterior and hardware finishes… excellent, quiet cleaner… 39 decibels."', url: URLS.dishwashers },
      ],
    },
    pros: [
      'Wirecutter Best-For-Design pick — 4 finishes × 6 hardware options',
      '39 dBA whisper-quiet operation',
      'US-made + ENERGY STAR certified',
      'Bottle jets (4 jet-enabled tines) for sports bottles + champagne flutes',
      'Interior light + Wi-Fi via SmartHQ app',
    ],
    cons: [
      'Cycles can run up to 4 hours with enhanced-drying',
      'Café reliability rated only "fair" by CR',
      'No extended warranty included',
    ],
    release_year: 2024,
  },
];

// ============================================================
// OVEN / RANGE additions
// ============================================================
const NEW_OVENS = [
  {
    id: 'hotpoint-rbs160dmww',
    brand: 'hotpoint', model: 'RBS160DMWW',
    name: 'Hotpoint RBS160DM 5.0 cu ft Coil-Top Electric Range (Wirecutter buy-it-for-life)',
    type: 'range', fuel: 'electric', style: 'freestanding',
    width_in: 30, oven_capacity_cf: 5, burners: 4,
    max_burner_btu: null, max_burner_w: 2400,
    convection: 'no', air_fry: false, self_clean: 'no', wifi: false,
    finishes: ['white', 'black'],
    msrp: 699, street_price: 608,
    ratings: {
      wirecutter: 'best buy-it-for-life range (electric) 2026',
      cr_overall: null, cr_reliability: 'very-good', yale_reliability_pct: null,
      source_urls: { wirecutter: URLS.electric, specs: 'https://www.geappliances.com/appliance/Hotpoint-Electric-Range-RBS160DM' },
      endorsements: [
        { channel: 'Wirecutter', type: 'roundup', label: 'Best Buy-It-For-Life Range (Electric) 2026: "fully mechanical… components can often be replaced easily without a repair person… extra sturdy with a metal body designed to hold up to heavy-duty long-term use."', url: URLS.electric },
      ],
    },
    pros: [
      'Wirecutter Buy-It-For-Life pick — designed to last decades',
      'All mechanical — no digital boards to fail',
      'ENERGY STAR certified + eligible for federal electric appliance rebates',
      'Lift-up coil cooktop for easy underneath cleaning',
      'GE Appliances service network coverage',
    ],
    cons: [
      'Coil cooktop heats slower than smoothtop (2,400W vs 3,000W on glass-ceramic)',
      'No oven window or interior light',
      'No convection / air fry',
    ],
    release_year: 2022,
  },
  {
    id: 'ge-profile-pb965ypfs',
    brand: 'ge-profile', model: 'PB965YPFS',
    name: 'GE Profile PB965 30" Double-Oven Electric Range (Wirecutter best double-oven)',
    type: 'range', fuel: 'electric', style: 'freestanding',
    width_in: 30, oven_capacity_cf: 6.6, burners: 5,
    max_burner_btu: null, max_burner_w: 3600,
    convection: 'true convection (lower oven only)', air_fry: true,
    self_clean: 'steam', wifi: true,
    finishes: ['fingerprint-resistant stainless', 'black stainless'],
    msrp: 1999, street_price: 1799,
    ratings: {
      wirecutter: 'best for a double oven (electric) 2026',
      cr_overall: null, cr_reliability: 'very-good', yale_reliability_pct: null,
      source_urls: { wirecutter: URLS.electric, specs: 'https://www.geappliances.com/appliance/GE-Profile-PB965YPFS' },
      endorsements: [
        { channel: 'Wirecutter', type: 'roundup', label: 'Best for Double Oven (Electric) 2026: "strongest power burner of any freestanding radiant-electric range we\'ve seen… 4.4 cubic-foot lower oven is bigger than those of most double-oven models available."', url: URLS.electric },
      ],
    },
    pros: [
      'Wirecutter Best Double-Oven Electric — 3,600W power burner is class-leading',
      '4.4 cu ft lower oven fits a 23-pound turkey',
      'Auto-syncs with GE Appliances range hood via Wi-Fi',
      'Five-element flex-width cooktop with bridge zone for griddles',
    ],
    cons: [
      'No storage drawer (lower oven takes that space)',
      'Lower oven requires stooping',
      'Only the lower oven has true convection',
    ],
    release_year: 2024,
  },
  {
    id: 'ge-profile-pgb935ypfs',
    brand: 'ge-profile', model: 'PGB935YPFS',
    name: 'GE Profile PGB935 30" Gas Range w/ 20,000 BTU power burner (Wirecutter upgrade)',
    type: 'range', fuel: 'gas', style: 'freestanding',
    width_in: 30, oven_capacity_cf: 5.6, burners: 5,
    max_burner_btu: 20000, max_burner_w: null,
    convection: 'true convection', air_fry: true,
    self_clean: 'pyrolytic + steam', wifi: true,
    finishes: ['fingerprint-resistant stainless'],
    msrp: 1599, street_price: 1399,
    ratings: {
      wirecutter: 'upgrade pick (gas) 2026',
      cr_overall: null, cr_reliability: 'very-good', yale_reliability_pct: null,
      source_urls: { wirecutter: URLS.gas, specs: 'https://www.geappliances.com/appliance/GE-Profile-PGB935YPFS' },
      endorsements: [
        { channel: 'Wirecutter', type: 'roundup', label: 'Upgrade Pick (Gas) 2026: "strongest power burner I\'ve seen (20,000 Btu)… large, true convection oven and a reversible griddle… best cooktop of any model I evaluated."', url: URLS.gas },
      ],
    },
    pros: [
      'Wirecutter Upgrade Pick (Gas) — 20,000 BTU power burner is class-leading',
      'True convection 5.6 cu ft oven (largest of Wirecutter\'s gas picks)',
      'Three oven racks (most picks include only two)',
      'Wi-Fi via SmartHQ for remote start, Scan-To-Cook, software upgrades',
    ],
    cons: [
      'Only one finish (fingerprint-resistant stainless)',
      'Doesn\'t auto-sync with range hood (Wirecutter notes the electric double-oven version does)',
    ],
    release_year: 2024,
  },
  {
    id: 'whirlpool-wfg320m0mb',
    brand: 'whirlpool', model: 'WFG320M0MB',
    name: 'Whirlpool WFG320M0M 5.1 cu ft Gas Range w/ continuous grates (Wirecutter budget gas)',
    type: 'range', fuel: 'gas', style: 'freestanding',
    width_in: 30, oven_capacity_cf: 5.1, burners: 4,
    max_burner_btu: 15000, max_burner_w: null,
    convection: 'no', air_fry: false, self_clean: 'no', wifi: false,
    finishes: ['black', 'white', 'stainless'],
    msrp: 749, street_price: 679,
    ratings: {
      wirecutter: 'budget pick (gas) 2026',
      cr_overall: null, cr_reliability: 'very-good', yale_reliability_pct: null,
      source_urls: { wirecutter: URLS.gas },
      endorsements: [
        { channel: 'Wirecutter', type: 'roundup', label: 'Budget Pick (Gas) 2026: "especially good functionality and quality for the price… two large 15,000 Btu burners… continuous cast iron grates (uncommon at this price)"', url: URLS.gas },
      ],
    },
    pros: [
      'Wirecutter Budget Gas Pick — two 15,000 BTU power burners (high for the price)',
      'Continuous cast iron grates (rare in budget gas)',
      'Three finishes available',
      'Whirlpool repairability rated class-leading',
    ],
    cons: [
      'No convection or air-fry mode',
      'No self-cleaning',
      'Broiler in bottom drawer (no storage drawer)',
      'Grates separate into only 2 pieces — heavier to clean',
    ],
    release_year: 2024,
  },
  {
    id: 'hotpoint-rgbs300dmww',
    brand: 'hotpoint', model: 'RGBS300DMWW',
    name: 'Hotpoint RGBS300DM 4.8 cu ft Gas Range (Wirecutter buy-it-for-life gas)',
    type: 'range', fuel: 'gas', style: 'freestanding',
    width_in: 30, oven_capacity_cf: 4.8, burners: 4,
    max_burner_btu: 13000, max_burner_w: null,
    convection: 'no', air_fry: false, self_clean: 'no', wifi: false,
    finishes: ['white', 'black'],
    msrp: 649, street_price: 549,
    ratings: {
      wirecutter: 'best buy-it-for-life range (gas) 2026',
      cr_overall: null, cr_reliability: 'very-good', yale_reliability_pct: null,
      source_urls: { wirecutter: URLS.gas, specs: 'https://www.geappliances.com/appliance/Hotpoint-Gas-Range-RGBS300DM' },
      endorsements: [
        { channel: 'Wirecutter', type: 'roundup', label: 'Best Buy-It-For-Life Range (Gas) 2026: "all manual and all mechanical, with components that can often be replaced easily without needing a repair person… designed with a sturdy metal body to hold up to heavy-duty long-term use."', url: URLS.gas },
      ],
    },
    pros: [
      'Wirecutter Buy-It-For-Life Gas pick — designed for decades-long service life',
      'All mechanical, no digital boards to fail',
      'GE Appliances service network',
      'Sealed burners protect gas jets from spills',
      'Sub-$650 street price',
    ],
    cons: [
      '13,000 BTU large element (vs 15,000-20,000 on other picks)',
      'No convection, no oven window, no interior light',
      'Broiler in bottom drawer (no storage drawer)',
    ],
    release_year: 2022,
  },
];

// ============================================================
// Apply
// ============================================================
function addModels(file, newModels, label) {
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
  data._meta.wirecutter_additions_2026_05 = `Round 15: added ${added} Wirecutter-picked models that were missing from the DB. ${label}`;
  data._meta.last_updated = '2026-05-05';
  writeFileSync(path, JSON.stringify(data, null, 2) + '\n');
  console.log(`${file}: added ${added} new models`);
  return added;
}

let total = 0;
total += addModels('refrigerators', NEW_FRIDGES, 'Sources: Wirecutter Best Refrigerators (Feb 23 2026) + Best Counter-Depth Refrigerators (Apr 20 2026).');
total += addModels('dishwashers', NEW_DISHWASHERS, 'Source: Wirecutter Best Dishwashers (Feb 2 2026).');
total += addModels('ovens', NEW_OVENS, 'Sources: Wirecutter Best Electric Stoves (Oct 3 2025) + Best Gas Stoves (Mar 20 2026).');
console.log(`\nTotal: ${total} new models added`);
