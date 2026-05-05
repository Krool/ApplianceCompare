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

const REQUIRED = ['id', 'brand', 'model', 'name'];
const ID_PATTERN = /^[a-z0-9][a-z0-9-]*$/;

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
    // It looks like a brand id — if so, it should exist OR be a known holding company.
    // Holding-company string-only values are allowed; we don't enforce them here.
  }
});
if (!brandsDoc._meta?.last_updated) warn('brands', '_meta', 'missing last_updated');

// --- validate each model file ---
for (const cat of ['refrigerators', 'dishwashers', 'ovens']) {
  const doc = load(`${cat}.json`);
  if (!doc._meta?.last_updated) warn(cat, '_meta', 'missing last_updated');
  const seenIds = new Set();
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

    // Pricing sanity — msrp must be >= street_price (street is what you pay; msrp is sticker)
    if (m.msrp != null && m.street_price != null && m.msrp < m.street_price) {
      err(cat, id, `msrp (${m.msrp}) < street_price (${m.street_price}) — impossible`);
    }
    if (m.msrp != null && m.msrp <= 0) err(cat, id, `non-positive msrp: ${m.msrp}`);
    if (m.street_price != null && m.street_price <= 0) err(cat, id, `non-positive street_price: ${m.street_price}`);

    // Source traceability — if any rating field has a non-null numeric value, source_urls
    // should be present. This is a warning (not error) because some legacy records may
    // pre-date the rule; failing build on every legacy record is too noisy.
    const r = m.ratings || {};
    const ratingNumericKeys = ['cr_overall', 'reviewed', 'rtings', 'cnet', 'yale_reliability_pct', 'toms_guide', 'repairability_score'];
    const anyNumeric = ratingNumericKeys.some((k) => typeof r[k] === 'number');
    const hasUrls = r.source_urls && Object.keys(r.source_urls).length > 0;
    if (anyNumeric && !hasUrls) {
      warn(cat, id, 'has numeric ratings but no source_urls — untraceable');
    }

    // Retired models should disclose a reason
    if (m.retired === true && !m.retired_reason) {
      warn(cat, id, 'retired=true but missing retired_reason');
    }

    // last_updated must be a valid ISO date when present (the field is optional —
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
