// Helpers and shared logic for Chef's Choice.
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

// Score: composite 0-100 based on user weights.
// Quality is the mean of available quality sources (CR, Reviewed, Rtings, CNET, GH-numeric,
// retailer-star-avg), so adding sources improves robustness without double-counting.
function computeScore(item, brand, weights) {
  const r = item.ratings || {};

  // --- Quality (all normalized to 0–100) ---
  const retailerAvg = aggregateRetailerStars(r);
  const qualitySources = [
    r.cr_overall,
    r.reviewed != null ? r.reviewed * 10 : null,
    r.rtings != null ? r.rtings * 10 : null,
    r.cnet != null ? r.cnet * 10 : null,
    typeof r.good_housekeeping === 'number' ? r.good_housekeeping * 10 : null,
    retailerAvg != null ? retailerAvg * 20 : null,
  ];
  const qualityScore = meanOfAvail(qualitySources);

  // --- Reliability (Yale service rate, lower better; brand fallback) ---
  const yale = r.yale_reliability_pct ?? brand?.service_rate_overall ?? null;
  const yaleScore = yale == null ? null : Math.max(0, Math.min(100, 100 - (yale - 5) * 5));

  // --- Repairability (0–100, higher = easier to fix; model overrides brand) ---
  const repair = r.repairability_score ?? brand?.repairability_score ?? null;
  const repairScore = repair == null ? null : Math.max(0, Math.min(100, repair));

  // --- Price (cheaper = better, log curve; rough cap at $15k) ---
  const priceVal = item.street_price ?? item.msrp;
  const priceScore = priceVal == null ? null : Math.max(0, 100 - Math.log10(priceVal / 500) * 35);

  // --- Energy (only applies to fridges / dishwashers — kWh/yr lower better) ---
  const kwh = item.energy_kwh_yr;
  const energyScore = kwh == null ? null : Math.max(0, 100 - (kwh - 200) / 8);

  // --- Quietness (decibels — DW primarily; fridges via noise_db) ---
  const db = item.decibels ?? item.noise_db;
  const quietScore = db == null ? null : Math.max(0, 100 - (db - 38) * 5);

  // Compose, skipping null components and zero-weight components
  const components = [
    { v: qualityScore, w: weights.quality },
    { v: yaleScore,    w: weights.reliability },
    { v: priceScore,   w: weights.price },
    { v: repairScore,  w: weights.repairability },
    { v: energyScore,  w: weights.energy },
    { v: quietScore,   w: weights.quiet },
  ].filter(c => c.v != null && c.w > 0);

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
  if (r.cr_overall != null) qualitySources++;
  // Reviewed contributes one signal whether it's a numeric score or an
  // editorial pick label ("Best Overall 2026"); avoid double-counting when both.
  if (r.reviewed != null || r.reviewed_status != null) qualitySources++;
  if (r.rtings != null) qualitySources++;
  if (r.cnet != null) qualitySources++;
  // Same treatment for Good Housekeeping — a "Best Tested" tag is a signal even
  // when GH didn't publish a numeric score.
  if (r.good_housekeeping != null) qualitySources++;
  const retailerCount = ['home_depot', 'lowes', 'best_buy', 'aj_madison']
    .filter(k => rr[k]?.stars != null).length;
  if (retailerCount > 0) qualitySources++;

  const hasReliabilityDirect = r.yale_reliability_pct != null;
  const hasReliabilityFallback = !hasReliabilityDirect && brand?.service_rate_overall != null;
  const hasRepairabilityDirect = r.repairability_score != null;
  const hasRepairabilityFallback = !hasRepairabilityDirect && brand?.repairability_score != null;
  const hasEditorialPick = r.wirecutter != null;

  const signals = qualitySources
    + (hasReliabilityDirect ? 1 : 0)
    + (hasRepairabilityDirect ? 1 : 0)
    + (hasEditorialPick ? 1 : 0);

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
    hasEditorialPick,
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
  const r = item.ratings || {};
  const retailerAvg = aggregateRetailerStars(r);
  const normalized = [
    r.cr_overall,
    r.reviewed != null ? r.reviewed * 10 : null,
    r.rtings != null ? r.rtings * 10 : null,
    r.cnet != null ? r.cnet * 10 : null,
    typeof r.good_housekeeping === 'number' ? r.good_housekeeping * 10 : null,
    retailerAvg != null ? retailerAvg * 20 : null,
  ].filter(v => v != null && !Number.isNaN(v));

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

  if (r.cr_overall != null) push({ name: "Consumer Reports", score: r.cr_overall, max: 100, url: safeUrl(r.source_urls?.cr) });
  if (r.cr_reliability && r.cr_reliability !== 'unrated') push({ name: "CR predicted reliability", status: r.cr_reliability, url: safeUrl(r.source_urls?.cr) });
  if (r.wirecutter != null) push({ name: "Wirecutter", status: r.wirecutter, url: safeUrl(r.source_urls?.wirecutter) });
  if (r.reviewed_status != null) push({ name: "Reviewed.com", status: r.reviewed_status, url: safeUrl(r.source_urls?.reviewed) });
  if (r.reviewed != null) push({ name: "Reviewed score", score: r.reviewed, max: 10, url: safeUrl(r.source_urls?.reviewed) });
  if (r.rtings != null) push({ name: "Rtings", score: r.rtings, max: 10, url: safeUrl(r.source_urls?.rtings) });
  if (r.cnet != null) push({ name: "CNET", score: r.cnet, max: 10, url: safeUrl(r.source_urls?.cnet) });
  if (r.good_housekeeping != null) {
    if (typeof r.good_housekeeping === 'number') push({ name: "Good Housekeeping", score: r.good_housekeeping, max: 10, url: safeUrl(r.source_urls?.good_housekeeping) });
    else push({ name: "Good Housekeeping", status: r.good_housekeeping, url: safeUrl(r.source_urls?.good_housekeeping) });
  }
  if (r.yale_reliability_pct != null) push({ name: "Yale service rate", score: r.yale_reliability_pct, unit: "%", inverted: true, url: safeUrl(r.source_urls?.yale) });
  if (r.repairability_score != null) push({ name: "Repairability", score: r.repairability_score, max: 100, url: safeUrl(r.source_urls?.repairability) });

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
  if (item.garage_ready === true) {
    push({
      name: "Garage-rated",
      status: "manufacturer-rated for wider temp range",
      url: safeUrl(r.source_urls?.garage_ready),
    });
  }
  return out;
}

// Get full data for an item
function enrichModel(model, brandsById) {
  return { ...model, _brand: brandsById[model.brand] };
}

export {
  fmtPrice, fmtCapacity, fmtKwh, fmtDb, fmtPct, fmtStars, fmtCount,
  relClass, tierClass, safeUrl,
  meanOfAvail, aggregateRetailerStars, totalRetailerReviewCount,
  computeScore, getScoreConfidence, getSourceDisagreement, getRatingSources, enrichModel,
};
