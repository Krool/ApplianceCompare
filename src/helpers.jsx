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
    { v: energyScore,  w: weights.energy },
    { v: quietScore,   w: weights.quiet },
  ].filter(c => c.v != null && c.w > 0);

  if (!components.length) return null;
  const totalW = components.reduce((s, c) => s + c.w, 0);
  return Math.round(components.reduce((s, c) => s + c.v * c.w, 0) / totalW);
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

  if (r.cr_overall != null) push({ name: "Consumer Reports", score: r.cr_overall, max: 100, url: r.source_urls?.cr });
  if (r.cr_reliability && r.cr_reliability !== 'unrated') push({ name: "CR predicted reliability", status: r.cr_reliability, url: r.source_urls?.cr });
  if (r.wirecutter != null) push({ name: "Wirecutter", status: r.wirecutter, url: r.source_urls?.wirecutter });
  if (r.reviewed_status != null) push({ name: "Reviewed.com", status: r.reviewed_status, url: r.source_urls?.reviewed });
  if (r.reviewed != null) push({ name: "Reviewed score", score: r.reviewed, max: 10, url: r.source_urls?.reviewed });
  if (r.rtings != null) push({ name: "Rtings", score: r.rtings, max: 10, url: r.source_urls?.rtings });
  if (r.cnet != null) push({ name: "CNET", score: r.cnet, max: 10, url: r.source_urls?.cnet });
  if (r.good_housekeeping != null) {
    if (typeof r.good_housekeeping === 'number') push({ name: "Good Housekeeping", score: r.good_housekeeping, max: 10, url: r.source_urls?.good_housekeeping });
    else push({ name: "Good Housekeeping", status: r.good_housekeeping, url: r.source_urls?.good_housekeeping });
  }
  if (r.yale_reliability_pct != null) push({ name: "Yale service rate", score: r.yale_reliability_pct, unit: "%", inverted: true, url: r.source_urls?.yale });

  const rr = r.retailer_ratings || {};
  const retailers = [
    ['home_depot', 'Home Depot'],
    ['lowes', "Lowe's"],
    ['best_buy', 'Best Buy'],
    ['aj_madison', 'AJ Madison'],
  ];
  retailers.forEach(([key, label]) => {
    if (rr[key]?.stars != null) push({ name: label, score: rr[key].stars, max: 5, count: rr[key].count, url: rr[key].url });
  });

  if (r.reddit_sentiment) {
    push({
      name: "r/appliances sentiment",
      status: r.reddit_sentiment,
      detail: r.reddit_sentiment_detail?.summary,
      url: r.reddit_sentiment_detail?.threads?.[0],
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
  relClass, tierClass,
  meanOfAvail, aggregateRetailerStars, totalRetailerReviewCount,
  computeScore, getRatingSources, enrichModel,
};
