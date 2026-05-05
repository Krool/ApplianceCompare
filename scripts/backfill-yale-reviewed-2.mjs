// Round 3 backfill: attach Yale Appliance + Reviewed.com pick endorsements
// and yale_reliability_pct to models already in the DB. Never invent — every
// claim cites the Yale 2026 article or the Reviewed best-of roundup.
import { readFileSync, writeFileSync } from 'node:fs';

const YALE = {
  best_dishwashers: 'https://blog.yaleappliance.com/best-dishwasher-deals',
  best_gas_ranges: 'https://blog.yaleappliance.com/most-reliable-gas-ranges',
  best_induction: 'https://blog.yaleappliance.com/best-induction-ranges',
  best_cooktops: 'https://blog.yaleappliance.com/the-most-reliable-induction-cooktops',
  reliable_brands: 'https://blog.yaleappliance.com/the-least-serviced-most-reliable-appliance-brands',
};

const REVIEWED = {
  electric_ranges: 'https://www.reviewed.com/ovens/best-right-now/best-electric-ranges',
  gas_ranges: 'https://www.reviewed.com/ovens/best-right-now/best-gas-ranges',
  induction_ranges: 'https://www.reviewed.com/ovens/best-right-now/best-induction-ranges',
  wall_ovens: 'https://www.reviewed.com/ovens/best-right-now/best-wall-ovens',
};

// { id: { yale_pct, yale_source, endorsements:[], reviewed_status } }
const PATCHES = {
  ovens: {
    'lg-studio-lsgs6338f': {
      yale_pct: 5.5,
      yale_source: 'yale_2026',
      endorsements: [
        { channel: 'Yale Appliance', type: 'article', label: 'Yale 2026: Most reliable upgraded gas range pick — 5.5% service rate', url: YALE.best_gas_ranges },
      ],
    },
    'ge-profile-pgs930ypfs': {
      yale_pct: 10.1,
      yale_source: 'yale_2026',
      endorsements: [
        { channel: 'Yale Appliance', type: 'article', label: 'Yale 2026: Slide-in gas range with air fry pick — 10.1% service rate', url: YALE.best_gas_ranges },
      ],
    },
    'lg-studio-cbis3618be': {
      yale_pct: 5.3,
      yale_source: 'yale_2026_cooktops',
      endorsements: [
        { channel: 'Yale Appliance', type: 'article', label: 'Yale 2026: Most affordable smart induction cooktop pick — 5.3% service rate, 7,000W center', url: YALE.best_cooktops },
      ],
    },
    'ge-grs600avfs': {
      // Already has reviewed_status; add the explicit Reviewed roundup link as endorsement
      endorsements: [
        { channel: 'Reviewed', type: 'roundup', label: "Editor's Choice — Best Electric Range 2026", url: REVIEWED.electric_ranges },
      ],
    },
    'whirlpool-wfes7530rz': {
      endorsements: [
        { channel: 'Reviewed', type: 'roundup', label: 'Recommended — Easy-Clean Cooktop electric range 2026', url: REVIEWED.electric_ranges },
      ],
      reviewed_status: 'Easy-Clean Cooktop pick 2026',
    },
    // Induction range Yale picks already in DB
    'lg-lsil6336xe': {
      yale_pct: 4.6,
      yale_source: 'yale_2026',
    },
    'ge-profile-phs930ypfs': {
      yale_pct: 9.2,
      yale_source: 'yale_2026',
    },
  },
  dishwashers: {
    'bosch-shx78cm5n': {
      yale_pct: 7.7,
      yale_source: 'yale_2026_dw',
      endorsements: [
        { channel: 'Yale Appliance', type: 'article', label: "Yale 2026: 'Best drying with CrystalDry. Solid racks. Great for families with plastics.' — 7.7% service rate", url: YALE.best_dishwashers },
      ],
    },
    'miele-g7186scvi': {
      yale_pct: 5.6,
      yale_source: 'yale_2026_dw',
      endorsements: [
        { channel: 'Yale Appliance', type: 'article', label: "Yale 2026: 'Best racking. Best washing. Cleanest dishes. AutoOpen drying.' — 5.6% service rate", url: YALE.best_dishwashers },
      ],
    },
    'ge-profile-pdp755syvfs': {
      yale_pct: 10.3,
      yale_source: 'yale_2026_dw',
      // Endorsements already present from round 2; append Yale link
      append_endorsements: [
        { channel: 'Yale Appliance', type: 'article', label: "Yale 2026: 'Best for service. Hard-food disposer. Quiet American-style loading.' — 10.3% service rate", url: YALE.best_dishwashers },
      ],
    },
  },
};

let updateCount = 0;
for (const [file, byId] of Object.entries(PATCHES)) {
  const path = `public/data/${file}.json`;
  const data = JSON.parse(readFileSync(path, 'utf8'));
  let touched = 0;
  for (const m of data.models) {
    const patch = byId[m.id];
    if (!patch) continue;
    m.ratings = m.ratings || {};
    m.ratings.source_urls = m.ratings.source_urls || {};

    if (patch.yale_pct != null && m.ratings.yale_reliability_pct == null) {
      m.ratings.yale_reliability_pct = patch.yale_pct;
      m.ratings.yale_reliability_source = patch.yale_source;
      m.ratings.source_urls.yale_reliability = m.ratings.source_urls.yale_reliability || YALE.reliable_brands;
    }

    if (patch.reviewed_status && !m.ratings.reviewed_status) {
      m.ratings.reviewed_status = patch.reviewed_status;
    }

    if (patch.endorsements && (!m.ratings.endorsements || m.ratings.endorsements.length === 0)) {
      m.ratings.endorsements = patch.endorsements;
    }
    if (patch.append_endorsements) {
      m.ratings.endorsements = m.ratings.endorsements || [];
      // Skip duplicates by URL
      const have = new Set(m.ratings.endorsements.map(e => e.url));
      for (const e of patch.append_endorsements) {
        if (!have.has(e.url)) m.ratings.endorsements.push(e);
      }
    }

    touched++;
    updateCount++;
  }
  data._meta = data._meta || {};
  data._meta.review_data_pass_2 = `Round 2 review-data pass 2026-05-05: ${touched} models received Yale Appliance reliability data and/or Reviewed.com roundup endorsements.`;
  data._meta.last_updated = '2026-05-05';
  writeFileSync(path, JSON.stringify(data, null, 2) + '\n');
  console.log(`${file}: patched ${touched} models`);
}
console.log(`\nTotal: ${updateCount} model patches`);
