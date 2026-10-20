#!/usr/bin/env node
// Data integrity validator. Exits non-zero on any error so it can gate `npm run build`
// and CI. Warnings are reported but don't fail the build.
//
// Run:  node scripts/validate-data.mjs
// Or:   npm run validate

import fs from 'node:fs';
import path from 'node:path';
import url from 'node:url';

const ROOT = path.resolve(path.dirname(url.fileURLToPath(import.meta.url)), '..');
const DATA = path.join(ROOT, 'public', 'data');

const errors = [];
const warnings = [];
const err = (cat, id, msg) => errors.push(`[${cat}:${id}] ${msg}`);
const warn = (cat, id, msg) => warnings.push(`[${cat}:${id}] ${msg}`);

const load = (file) => JSON.parse(fs.readFileSync(path.join(DATA, file), 'utf8'));

// --- enum sets per category (from public/data/README.md) ---
const ENUMS = {
  refrigerators: {
    style: new Set(['french_door', 'side_by_side', 'top_freezer', 'bottom_freezer', 'built_in', 'column']),
    depth: new Set(['standard', 'counter', 'built_in']),
    water_dispenser: null, // free-text per schema
  },
  dishwashers: {
    tub: new Set(['stainless', 'plastic', 'hybrid']),
  },
  ovens: {
    type: new Set(['range', 'cooktop', 'wall_oven', 'specialty']),
    fuel: new Set(['gas', 'electric', 'induction', 'dual_fuel']),
    style: new Set([
      'slide-in', 'freestanding', 'freestanding-pro', 'rangetop', 'cooktop',
      'single', 'double', 'combo-microwave', 'single-steam', 'coffee_built_in',
    ]),
  },
};

ENUMS.dishwashers.dry_method = new Set(['heated', 'condensation', 'power_dry', 'zeolite', 'fan_assist']);
ENUMS.dishwashers.filter_type = new Set(['manual', 'self_cleaning']);
const CR_RELIABILITY = new Set(['poor', 'fair', 'good', 'very-good', 'excellent', 'unrated']);

const REQUIRED = ['id', 'brand', 'model', 'name'];
const ID_PATTERN = /^[a-z0-9][a-z0-9-]*$/;

// "No source, no number": each rating field must carry its own source link,
// under one of these source_urls keys, on one of these domains.
const RATING_SOURCES = {
  cr_overall:           { keys: ['cr'], domains: ['consumerreports.org'] },
  reviewed:             { keys: ['reviewed', 'reviewed_individual'], domains: ['reviewed.com', 'usatoday.com'] },
  rtings:               { keys: ['rtings'], domains: ['rtings.com'] },
  cnet:                 { keys: ['cnet'], domains: ['cnet.com'] },
  toms_guide:           { keys: ['toms_guide'], domains: ['tomsguide.com'] },
  yale_reliability_pct: { keys: ['yale', 'yale_reliability'], domains: ['yaleappliance.com'] },
  repairability_score:  { keys: ['repairability'], domains: null },
  wirecutter:           { keys: ['wirecutter'], domains: ['nytimes.com'] },
};
// A CR link must point at CR's page for the model, not a category guide, for
// the score to be shown (see hasCrModelSource in src/helpers.jsx).
const CR_MODEL_URL = /consumerreports\.org\/.*(\/m\d+\/?$|-\d{5,}\/(overview\/?)?$|-\d{5,}$)/i;

// Plausible ranges; a value outside is almost certainly a unit or typing slip.
const RANGES = {
  'ratings.cr_overall': [0, 100], 'ratings.reviewed': [0, 10], 'ratings.rtings': [0, 10],
  'ratings.cnet': [0, 10], 'ratings.toms_guide': [0, 5], 'ratings.yale_reliability_pct': [0, 60],
  'ratings.repairability_score': [0, 100],
  decibels: [30, 70], noise_db: [20, 70], energy_kwh_yr: [50, 2000],
  msrp: [50, 60000], street_price: [50, 60000],
  width_in: [10, 80], height_in: [1, 100], depth_in: [10, 40], depth_with_handle_in: [10, 40],
};
const getPath = (o, p) => p.split('.').reduce((v, k) => v?.[k], o);

const hostOf = (u) => { try { return new URL(u).hostname.toLowerCase(); } catch { return null; } };
const onDomain = (host, domains) => domains.some((d) => host === d || host.endsWith('.' + d));

const STALE_DAYS = 180;
const today = new Date();
const daysSince = (iso) => (today - new Date(iso + 'T00:00:00Z')) / 86400000;
const stats = { crCategoryOnly: 0, noDate: 0, stale: 0, crRelNoUrl: 0 };

// --- validate brands first (other files reference brand ids) ---
const brandsDoc = load('brands.json');
const knownBrands = new Set();
brandsDoc.brands.forEach((b) => {
  if (!b.id) {
    err('brands', '?', 'missing id');
    return;
  }
  if (knownBrands.has(b.id)) err('brands', b.id, 'duplicate brand id');
  knownBrands.add(b.id);
  if (!ID_PATTERN.test(b.id)) err('brands', b.id, 'id is not kebab-case');
  if (!b.name) err('brands', b.id, 'missing name');
  if (!['budget', 'mainstream', 'premium', 'ultra-premium'].includes(b.tier)) {
    err('brands', b.id, `unknown tier: ${b.tier}`);
  }
  // parent_company should reference a real brand id when it's a kebab-case string
  // matching the brand-id pattern; else it's a holding-company name (bsh, haier, etc.)
  if (b.parent_company && ID_PATTERN.test(b.parent_company)) {
    // It looks like a brand id â€” if so, it should exist OR be a known holding company.
    // Holding-company string-only values are allowed; we don't enforce them here.
  }
});
if (!brandsDoc._meta?.last_updated) warn('brands', '_meta', 'missing last_updated');

// --- validate each model file ---
for (const cat of ['refrigerators', 'dishwashers', 'ovens']) {
  const doc = load(`${cat}.json`);
  if (!doc._meta?.last_updated) warn(cat, '_meta', 'missing last_updated');
  const seenIds = new Set();
  const seenModels = new Set();
  const enums = ENUMS[cat] || {};

  for (const m of doc.models) {
    const id = m.id || '?';

    // Required fields
    for (const f of REQUIRED) {
      if (m[f] == null || m[f] === '') err(cat, id, `missing required field: ${f}`);
    }

    // ID format + uniqueness
    if (m.id) {
      if (!ID_PATTERN.test(m.id)) err(cat, id, 'id is not kebab-case');
      if (seenIds.has(m.id)) err(cat, id, 'duplicate model id');
      seenIds.add(m.id);
    }

    // Brand exists
    if (m.brand && !knownBrands.has(m.brand)) {
      err(cat, id, `references unknown brand: ${m.brand}`);
    }

    // Enum compliance
    for (const [field, allowed] of Object.entries(enums)) {
      if (allowed && m[field] != null && !allowed.has(m[field])) {
        err(cat, id, `field ${field}=${JSON.stringify(m[field])} not in allowed set`);
      }
    }

    // Pricing sanity â€” msrp must be >= street_price (street is what you pay; msrp is sticker)
    if (m.msrp != null && m.street_price != null && m.msrp < m.street_price) {
      err(cat, id, `msrp (${m.msrp}) < street_price (${m.street_price}) â€” impossible`);
    }
    if (m.msrp != null && m.msrp <= 0) err(cat, id, `non-positive msrp: ${m.msrp}`);
    if (m.street_price != null && m.street_price <= 0) err(cat, id, `non-positive street_price: ${m.street_price}`);

    // Same brand + model number twice in one file is a duplicate under two ids.
    if (m.brand && m.model) {
      const key = m.brand + '|' + String(m.model).toUpperCase();
      if (seenModels.has(key)) err(cat, id, `duplicate brand+model: ${m.model}`);
      seenModels.add(key);
    }

    // Source traceability, per field: every rating needs its own source link.
    const r = m.ratings || {};
    const su = r.source_urls || {};
    for (const [field, { keys, domains }] of Object.entries(RATING_SOURCES)) {
      if (r[field] == null) continue;
      const k = keys.find((key) => su[key]);
      if (!k) { err(cat, id, `ratings.${field} has no source URL (source_urls.${keys.join(' | ')})`); continue; }
      const host = hostOf(su[k]);
      if (!host) err(cat, id, `source_urls.${k} is not a valid URL: ${su[k]}`);
      else if (domains && !onDomain(host, domains)) err(cat, id, `source_urls.${k} is on ${host}, expected ${domains.join(' or ')}`);
    }
    for (const [k, u] of Object.entries(su)) {
      if (typeof u !== 'string' || !/^https?:\/\//.test(u) || !hostOf(u)) err(cat, id, `source_urls.${k} is not an http(s) URL`);
    }
    if (r.cr_overall != null && su.cr && !CR_MODEL_URL.test(su.cr)) stats.crCategoryOnly++;
    if (r.cr_reliability != null && !CR_RELIABILITY.has(r.cr_reliability)) {
      err(cat, id, `cr_reliability=${JSON.stringify(r.cr_reliability)} not in allowed set`);
    }
    if (r.cr_reliability && r.cr_reliability !== 'unrated' && !su.cr) stats.crRelNoUrl++;
    for (const [rk, v] of Object.entries(r.retailer_ratings || {})) {
      if (v?.stars == null) continue;
      if (v.stars < 0 || v.stars > 5) err(cat, id, `retailer_ratings.${rk}.stars out of range: ${v.stars}`);
      if (!hostOf(v.url)) err(cat, id, `retailer_ratings.${rk} has stars but no valid url`);
    }
    for (const e of Array.isArray(r.endorsements) ? r.endorsements : []) {
      if (!hostOf(e.url)) err(cat, id, `endorsement "${e.label || e.channel}" has no valid url`);
    }

    // Ranges
    for (const [p, [lo, hi]] of Object.entries(RANGES)) {
      const v = getPath(m, p);
      if (typeof v === 'number' && (v < lo || v > hi)) err(cat, id, `${p}=${v} outside plausible range ${lo}-${hi}`);
    }

    // Images: every referenced file must exist, plus its thumbnail when it is
    // an optimized webp (scripts/optimize-images.mjs).
    for (const img of [m.image, ...(Array.isArray(m.images) ? m.images : [])]) {
      if (!img?.local) continue;
      const abs = path.join(DATA, img.local);
      if (!fs.existsSync(abs)) err(cat, id, `image file missing: ${img.local}`);
      else if (/\.webp$/.test(img.local) && !fs.existsSync(abs.replace(/\.webp$/, '.thumb.webp'))) {
        warn(cat, id, `no thumbnail for ${img.local} â€” run node scripts/optimize-images.mjs`);
      }
    }

    // Freshness: prices drift. Counted, reported once in the summary.
    if (!m.retired) {
      const asOf = m.price_as_of || m.last_updated;
      if (!asOf) stats.noDate++;
      else if (daysSince(asOf) > STALE_DAYS) stats.stale++;
    }
    if (m.price_as_of != null && !/^\d{4}-\d{2}-\d{2}$/.test(m.price_as_of)) {
      err(cat, id, `price_as_of must be YYYY-MM-DD, got ${JSON.stringify(m.price_as_of)}`);
    }

    // Retired models should disclose a reason
    if (m.retired === true && !m.retired_reason) {
      warn(cat, id, 'retired=true but missing retired_reason');
    }

    // last_updated must be a valid ISO date when present (the field is optional â€”
    // legacy records omit it; new/edited records SHOULD include it).
    if (m.last_updated != null) {
      if (!/^\d{4}-\d{2}-\d{2}$/.test(m.last_updated)) {
        err(cat, id, `last_updated must be YYYY-MM-DD, got ${JSON.stringify(m.last_updated)}`);
      }
    }
  }
}

// --- buying-guide cross-references ---
const bg = load('buying-guide.json');
const reportCardIds = new Set((bg.brand_report_card || []).map((b) => b.brand_id));
for (const id of reportCardIds) {
  if (!knownBrands.has(id)) err('buying-guide', id, `brand_report_card entry references unknown brand`);
}

// --- dataset-level warnings (one line each instead of hundreds) ---
if (stats.crCategoryOnly) warn('all', 'cr', `${stats.crCategoryOnly} CR scores cite only a CR category page; the site hides them until a model-page URL is added`);
if (stats.crRelNoUrl) warn('all', 'cr', `${stats.crRelNoUrl} cr_reliability values have no source_urls.cr`);
if (stats.noDate) warn('all', 'freshness', `${stats.noDate} active priced models have no price_as_of date`);
if (stats.stale) warn('all', 'freshness', `${stats.stale} active models have prices last checked more than ${STALE_DAYS} days ago`);

// --- summary ---
const summary = `\nValidator summary: ${errors.length} error(s), ${warnings.length} warning(s).`;
if (errors.length) {
  console.error('ERRORS');
  errors.forEach((e) => console.error('  ' + e));
}
if (warnings.length) {
  console.log('WARNINGS');
  warnings.forEach((w) => console.log('  ' + w));
}
console.log(summary);
process.exit(errors.length ? 1 : 0);
