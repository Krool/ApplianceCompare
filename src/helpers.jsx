// Helpers and shared logic for Kitchen Appliance Compare.
// Pure helpers — no React hooks used here, so no React import required.

// Format
const fmtPrice = (n) => n == null ? "—" : "$" + n.toLocaleString();
const fmtCapacity = (n) => n == null ? "—" : n.toFixed(1) + " cu ft";
const fmtKwh = (n) => n == null ? "—" : n + " kWh/yr";
const fmtDb = (n) => n == null ? "—" : n + " dB";
const fmtPct = (n) => n == null ? "—" : n.toFixed(1) + "%";
const fmtStars = (n) => n == null ? "—" : n.toFixed(1) + "★";
const fmtCount = (n) => {
  if (n == null) return "";
  if (n >= 10000) return "(" + (n / 1000).toFixed(0) + "k)";
  if (n >= 1000) return "(" + (n / 1000).toFixed(1) + "k)";
  return "(" + n + ")";
};

// Reliability label color
const relClass = (r) => "rel-" + (r || "unrated").replace(/[ _]/g, "-");
const tierClass = (t) => "tier-" + (t || "mainstream").replace(/[ _]/g, "-");

// Only allow http/https URLs to reach an <a href>. Defends against javascript:
// URLs sneaking in from data files if they're ever populated from a scraper
// or untrusted source. Returns null for anything else so callers can fall back.
const safeUrl = (u) => (typeof u === "string" && /^https?:\/\//i.test(u.trim()) ? u : null);

// Image variants. scripts/optimize-images.mjs writes every image as a <=1200px
// webp plus a <=240px `.thumb.webp` sibling; small renders use the thumb.
const imageSrc = (local) => './data/' + local;
const thumbSrc = (local) => './data/' + (/\.webp$/.test(local) ? local.replace(/\.webp$/, '.thumb.webp') : local);

const isRetired = (m) => m?.retired === true;

// A CR score only counts when its source link is CR's page for that model
// (current /m123456/ URLs or legacy /products/...-123456/ URLs). A link to a
// category buying guide shows CR covers the category, not where the number
// came from, so per the no-source-no-number rule the score is held back from
// the composite and the UI until a model page is found.
const CR_MODEL_URL = /consumerreports\.org\/.*(\/m\d+\/?$|-\d{5,}\/(overview\/?)?$|-\d{5,}$)/i;
const hasCrModelSource = (r) => CR_MODEL_URL.test(r?.source_urls?.cr || '');
const crScore = (r) => (r?.cr_overall != null && hasCrModelSource(r) ? r.cr_overall : null);

// CR's 0-100 numbers are proprietary; the UI shows a band, never the number.
function crBand(score) {
  if (score == null) return null;
  if (score >= 80) return 'Excellent';
  if (score >= 70) return 'Very good';
  if (score >= 60) return 'Good';
  if (score >= 45) return 'Fair';
  return 'Poor';
}

// Mean of available (non-null) numbers; null if none
function meanOfAvail(vals) {
  const xs = vals.filter(v => v != null && !Number.isNaN(v));
  return xs.length ? xs.reduce((s, v) => s + v, 0) / xs.length : null;
}

// Aggregate retailer star rating (mean across HD/Lowe's/BB/AJM), 0–5
function aggregateRetailerStars(ratings) {
  const rr = ratings?.retailer_ratings || {};
  return meanOfAvail([
    rr.home_depot?.stars,
    rr.lowes?.stars,
    rr.best_buy?.stars,
    rr.aj_madison?.stars,
  ]);
}

// Total retailer review count across sources
function totalRetailerReviewCount(ratings) {
  const rr = ratings?.retailer_ratings || {};
  return [
    rr.home_depot?.count,
    rr.lowes?.count,
    rr.best_buy?.count,
    rr.aj_madison?.count,
  ].reduce((s, c) => s + (c || 0), 0);
}

// Every numeric quality source, normalized to 0-100. Single definition shared
// by the composite, the confidence tier and the disagreement check (these used
// to keep three copies and had drifted). Non-numeric values (verdict strings
// such as a Good Housekeeping "top tested") are skipped here.
const QUALITY_SOURCES = [
  { name: 'Consumer Reports', get: r => crScore(r) },
  { name: 'Reviewed',         get: r => r.reviewed,          scale: 10 },
  { name: 'Rtings',           get: r => r.rtings,            scale: 10 },
  { name: 'CNET',             get: r => r.cnet,              scale: 10 },
  { name: 'Good Housekeeping', get: r => r.good_housekeeping, scale: 10 },
  { name: "Tom's Guide",      get: r => r.toms_guide,        scale: 20 },
  { name: 'Retailer stars',   get: r => aggregateRetailerStars(r), scale: 20 },
];
function qualityValues(r) {
  return QUALITY_SOURCES
    .map(s => { const v = s.get(r); return typeof v === 'number' && !Number.isNaN(v) ? v * (s.scale || 1) : null; })
    .filter(v => v != null);
}

// Distinct outlets behind a model's editorial endorsements. Five roundups
// from one outlet are one opinion, so the axis counts outlets, not entries.
function endorsementOutlets(r) {
  const out = new Set();
  for (const e of Array.isArray(r.endorsements) ? r.endorsements : []) {
    let key = (e.channel || e.source || '').trim().toLowerCase();
    if (!key && e.url) { try { key = new URL(e.url).hostname.replace(/^www\./, ''); } catch {} }
    if (key) out.add(key);
  }
  if (r.wirecutter != null) out.add('wirecutter');
  return out;
}

// Per-axis sub-scores that feed the composite. Returns one record per axis,
// with the 0-100 sub-score (or null if missing) and a one-line input summary
// suitable for the UI breakdown. computeScore is built directly on top of this
// so the drawer's explanation can never disagree with the headline number.
function getScoreBreakdown(item, brand) {
  const r = item.ratings || {};

  // --- Quality (all normalized to 0–100) ---
  const qualitySources = qualityValues(r);
  const qualityCount = qualitySources.length;
  const qualityScore = meanOfAvail(qualitySources);
  const qualityWhy = qualityCount === 0
    ? 'no review sources'
    : `mean of ${qualityCount} review source${qualityCount === 1 ? '' : 's'}`;

  // --- Reliability (Yale service rate, lower better; brand fallback) ---
  const yaleVal = r.yale_reliability_pct ?? brand?.service_rate_overall ?? null;
  const yaleFromModel = r.yale_reliability_pct != null;
  const yaleScore = yaleVal == null ? null : Math.max(0, Math.min(100, 100 - (yaleVal - 5) * 5));
  const yaleWhy = yaleVal == null
    ? 'no Yale data'
    : `Yale ${yaleVal}% service rate${yaleFromModel ? '' : ' (brand fallback)'}`;

  // --- Repairability (0–100, higher = easier to fix; model overrides brand) ---
  const repairVal = r.repairability_score ?? brand?.repairability_score ?? null;
  const repairFromModel = r.repairability_score != null;
  const repairScore = repairVal == null ? null : Math.max(0, Math.min(100, repairVal));
  const repairWhy = repairVal == null
    ? 'no data'
    : `${repairVal}/100${repairFromModel ? '' : ' (brand fallback)'}`;

  // --- Price (cheaper = better, log curve) ---
  const priceVal = item.street_price ?? item.msrp;
  const priceScore = priceVal == null ? null : Math.max(0, 100 - Math.log10(priceVal / 500) * 35);
  const priceWhy = priceVal == null ? 'no price' : '$' + priceVal.toLocaleString();

  // --- Energy (kWh/yr — lower better; fridges/DW only) ---
  const kwh = item.energy_kwh_yr;
  const energyScore = kwh == null ? null : Math.max(0, 100 - (kwh - 200) / 8);
  const energyWhy = kwh == null ? 'n/a for category' : `${kwh} kWh/yr`;

  // --- Quietness (decibels) ---
  const db = item.decibels ?? item.noise_db;
  const quietScore = db == null ? null : Math.max(0, 100 - (db - 38) * 5);
  const quietWhy = db == null ? 'n/a for category' : `${db} dB`;

  // --- Endorsements (qualitative editorial coverage) ---
  // Counts distinct outlets (endorsements array + a Wirecutter pick). We
  // deliberately don't count r.reviewed_status because in our data it's
  // mirrored as a Reviewed entry inside the endorsements array.
  // Curve: 0 → 0, 1 → 50, 2 → 75, 3 → 87.5, 4 → 93.75, 5+ → ~100. Zero scores
  // zero (not null) so the lack of editorial coverage is a penalty — the goal
  // of this axis is to surface models several outlets endorse.
  const endorsementCount = endorsementOutlets(r).size;
  const endorsementScore = 100 * (1 - Math.pow(0.5, endorsementCount));
  const endorsementWhy = endorsementCount === 0
    ? 'no editorial picks'
    : `picked by ${endorsementCount} outlet${endorsementCount === 1 ? '' : 's'}`;

  return [
    { key: 'quality',       label: 'Quality',       value: qualityScore,     why: qualityWhy },
    { key: 'endorsements',  label: 'Endorsements',  value: endorsementScore, why: endorsementWhy },
    { key: 'reliability',   label: 'Reliability',   value: yaleScore,        why: yaleWhy },
    { key: 'price',         label: 'Price',         value: priceScore,       why: priceWhy },
    { key: 'repairability', label: 'Repairability', value: repairScore,      why: repairWhy },
    { key: 'energy',        label: 'Energy',        value: energyScore,      why: energyWhy },
    { key: 'quiet',         label: 'Quietness',     value: quietScore,       why: quietWhy },
  ];
}

// Score: composite 0-100 based on user weights, computed by reducing the
// per-axis breakdown. Skips axes that are null (no data) or zero-weighted.
function computeScore(item, brand, weights) {
  const components = getScoreBreakdown(item, brand)
    .map(b => ({ v: b.value, w: weights[b.key] }))
    .filter(c => c.v != null && c.w > 0);

  if (!components.length) return null;
  const totalW = components.reduce((s, c) => s + c.w, 0);
  return Math.round(components.reduce((s, c) => s + c.v * c.w, 0) / totalW);
}

// Confidence in the composite score, derived from how many independent rating
// signals back it. The composite still computes from price/energy/quiet specs
// even when no review sources exist, so this lets the UI distinguish a score
// backed by 4 reviewer agreements from one that's effectively a spec sheet.
//
//   tier 'thin'    — 0 review signals, no brand reliability fallback either
//   tier 'limited' — 1 review signal, OR only a brand-level reliability fallback
//   tier 'solid'   — 2 review signals
//   tier 'strong'  — 3+ review signals
//
// "Review signals" = quality sources (CR, Reviewed, Rtings, CNET, GH numeric,
// retailer-star-aggregate counts as one) + direct Yale rate + direct
// repairability score + Wirecutter pick. Brand-level reliability and
// repairability are fallbacks — they bump 'thin' to 'limited' but don't count
// as full signals on their own.
function getScoreConfidence(item, brand) {
  const r = item.ratings || {};
  const rr = r.retailer_ratings || {};

  let qualitySources = 0;
  if (crScore(r) != null) qualitySources++;
  // Reviewed contributes one signal whether it's a numeric score or an
  // editorial pick label ("Best Overall 2026"); avoid double-counting when both.
  if (r.reviewed != null || r.reviewed_status != null) qualitySources++;
  if (r.rtings != null) qualitySources++;
  if (r.cnet != null) qualitySources++;
  // Same treatment for Good Housekeeping — a "Best Tested" tag is a signal even
  // when GH didn't publish a numeric score.
  if (r.good_housekeeping != null) qualitySources++;
  if (r.toms_guide != null) qualitySources++;
  const retailerCount = ['home_depot', 'lowes', 'best_buy', 'aj_madison']
    .filter(k => rr[k]?.stars != null).length;
  if (retailerCount > 0) qualitySources++;

  const hasReliabilityDirect = r.yale_reliability_pct != null;
  const hasReliabilityFallback = !hasReliabilityDirect && brand?.service_rate_overall != null;
  const hasRepairabilityDirect = r.repairability_score != null;
  const hasRepairabilityFallback = !hasRepairabilityDirect && brand?.repairability_score != null;
  const hasEditorialPick = r.wirecutter != null;
  // Endorsements — qualitative only, never a number. Presence counts as a
  // single signal regardless of count, and outlets already counted above
  // (Reviewed via reviewed_status, Wirecutter via its pick) don't count again.
  const outlets = endorsementOutlets(r);
  if (r.reviewed != null || r.reviewed_status != null) outlets.delete('reviewed');
  outlets.delete('wirecutter');
  const hasEndorsements = outlets.size > 0;

  const signals = qualitySources
    + (hasReliabilityDirect ? 1 : 0)
    + (hasRepairabilityDirect ? 1 : 0)
    + (hasEditorialPick ? 1 : 0)
    + (hasEndorsements ? 1 : 0);

  const hasAnyFallback = hasReliabilityFallback || hasRepairabilityFallback;

  let tier;
  if (signals === 0) tier = hasAnyFallback ? 'limited' : 'thin';
  else if (signals === 1) tier = 'limited';
  else if (signals === 2) tier = 'solid';
  else tier = 'strong';

  return {
    qualitySources, retailerCount,
    hasReliabilityDirect, hasReliabilityFallback,
    hasRepairabilityDirect, hasRepairabilityFallback,
    hasEditorialPick, hasEndorsements,
    signals, tier,
  };
}

// Source disagreement: how much the available quality sources spread across the
// 0-100 scale. The composite score silently averages CR/Reviewed/Rtings/etc.,
// which can mask cases where reviewers genuinely disagree (e.g. CR 92 vs.
// Reviewed 60 — a 32-point spread that the average would hide as "76").
//
// Returns { spread, contested, sourceCount }.
//   - spread: max-min across normalized quality sources (null if <2 sources)
//   - contested: spread > 15 with 2+ sources — a meaningful editorial dispute
//   - sourceCount: number of populated quality sources
function getSourceDisagreement(item) {
  const normalized = qualityValues(item.ratings || {});

  if (normalized.length < 2) {
    return { spread: null, contested: false, sourceCount: normalized.length };
  }
  const spread = Math.max(...normalized) - Math.min(...normalized);
  return { spread, contested: spread > 15, sourceCount: normalized.length };
}

// For the detail drawer: a flat, renderable list of every rating source with its value.
// Each source is { name, score?, max?, status?, unit?, inverted?, count?, url? }.
// - score+max = numeric rendered as N/max
// - status = non-numeric (e.g. Wirecutter "top pick")
// - inverted = lower is better (Yale service rate)
// - count = sample size (retailer reviews)
function getRatingSources(item) {
  const r = item.ratings || {};
  const out = [];
  const push = (obj) => out.push(obj);

  // CR scores are proprietary; we use them as input to our composite but do not
  // republish the raw 0-100 number in the UI. Show a coarse band with
  // attribution + link to CR for readers who subscribe.
  if (crScore(r) != null) {
    push({ name: "Consumer Reports", status: crBand(crScore(r)) + ' (test score band)', url: safeUrl(r.source_urls?.cr) });
  }
  if (r.cr_reliability && r.cr_reliability !== 'unrated') push({ name: "CR predicted reliability", status: r.cr_reliability, url: safeUrl(r.source_urls?.cr) });
  if (r.wirecutter != null) push({ name: "Wirecutter", status: r.wirecutter, url: safeUrl(r.source_urls?.wirecutter) });
  if (r.reviewed_status != null) push({ name: "Reviewed.com", status: r.reviewed_status, url: safeUrl(r.source_urls?.reviewed) });
  // Numeric vs verdict-string keys live in the same field across the data
  // (e.g. r.rtings is sometimes a 0-10 score, sometimes a "Top-20 …" string).
  // Render whichever shape it has rather than crashing on .toFixed of a string.
  const numOrStatus = (val, name, max, extra = {}) => {
    if (val == null) return;
    if (typeof val === 'number') push({ name, score: val, max, ...extra });
    else push({ name, status: val, ...extra });
  };
  numOrStatus(r.reviewed, "Reviewed score", 10, { url: safeUrl(r.source_urls?.reviewed) });
  numOrStatus(r.rtings, "Rtings", 10, { url: safeUrl(r.source_urls?.rtings) });
  numOrStatus(r.cnet, "CNET", 10, { url: safeUrl(r.source_urls?.cnet) });
  numOrStatus(r.good_housekeeping, "Good Housekeeping", 10, { url: safeUrl(r.source_urls?.good_housekeeping) });
  if (r.yale_reliability_pct != null && typeof r.yale_reliability_pct === 'number') push({ name: "Yale service rate", score: r.yale_reliability_pct, unit: "%", inverted: true, url: safeUrl(r.source_urls?.yale) });
  if (r.repairability_score != null && typeof r.repairability_score === 'number') push({ name: "Repairability", score: r.repairability_score, max: 100, url: safeUrl(r.source_urls?.repairability) });
  numOrStatus(r.toms_guide, "Tom's Guide", 5, { url: safeUrl(r.source_urls?.toms_guide) });

  const rr = r.retailer_ratings || {};
  const retailers = [
    ['home_depot', 'Home Depot'],
    ['lowes', "Lowe's"],
    ['best_buy', 'Best Buy'],
    ['aj_madison', 'AJ Madison'],
  ];
  retailers.forEach(([key, label]) => {
    if (rr[key]?.stars != null) push({ name: label, score: rr[key].stars, max: 5, count: rr[key].count, url: safeUrl(rr[key].url) });
  });

  if (r.reddit_sentiment) {
    push({
      name: "r/appliances sentiment",
      status: r.reddit_sentiment,
      detail: r.reddit_sentiment_detail?.summary,
      url: safeUrl(r.reddit_sentiment_detail?.threads?.[0]),
    });
  }
  if (Array.isArray(r.endorsements)) {
    r.endorsements.forEach(e => push({
      name: e.channel || e.source || 'Endorsement',
      status: e.label || e.summary || 'endorsed',
      url: safeUrl(e.url),
    }));
  }
  if (item.garage_ready === true) {
    push({
      name: "Garage-rated",
      status: "manufacturer-rated for wider temp range",
      url: safeUrl(r.source_urls?.garage_ready),
    });
  }
  return out;
}

// Retailer product pages we hold a link for, as "check price" destinations.
const RETAILER_LABELS = { home_depot: 'Home Depot', lowes: "Lowe's", best_buy: 'Best Buy', aj_madison: 'AJ Madison' };
function getRetailerLinks(item) {
  const rr = item.ratings?.retailer_ratings || {};
  const su = item.ratings?.source_urls || {};
  return Object.entries(RETAILER_LABELS)
    .map(([k, label]) => ({ label, url: safeUrl(rr[k]?.url || su[k]) }))
    .filter(l => l.url);
}

// Model-number search that ignores spacing/punctuation: "shp78 cm5n" finds SHP78CM5N.
const searchKey = (s) => String(s || '').toLowerCase().replace(/[^a-z0-9]/g, '');

export {
  fmtPrice, fmtCapacity, fmtKwh, fmtDb, fmtPct, fmtStars, fmtCount,
  relClass, tierClass, imageSrc, thumbSrc, isRetired, crScore, crBand, hasCrModelSource,
  aggregateRetailerStars, totalRetailerReviewCount,
  computeScore, getScoreBreakdown, getScoreConfidence, getSourceDisagreement, getRatingSources,
  getRetailerLinks, searchKey,
};
