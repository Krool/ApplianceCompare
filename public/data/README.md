# Data schemas

Every file here is a seed database consumed by the site at runtime via `fetch()`. All files share a `_meta` block (with notes, sources, and `last_updated`) and a primary array of records.

## Files

| File | Purpose | Current count |
| --- | --- | --- |
| `refrigerators.json` | Fridge models | 68 |
| `dishwashers.json` | Dishwasher models | 60 |
| `ovens.json` | Ranges + wall ovens + cooktops + specialty cooking | 65 |
| `brands.json` | Brand-level reliability, tier, parent-company | 30 |
| `buying-guide.json` | Decision trees and editorial guidance | 1 document |

## Common fields across model files

```jsonc
{
  "id": "brand-modelnumber",            // kebab-case, unique across the category
  "brand": "bosch",                     // must match a brand id in brands.json
  "model": "SHP78CM5N",                 // manufacturer SKU (keep exact casing)
  "name": "Bosch 800 Series SHP78CM5N Panel-Ready",  // display name
  "msrp": 1599,                         // USD, no cents
  "street_price": 1299,                 // USD typical transaction price
  "wifi": true,
  "release_year": 2023,
  "ratings": {
    "cr_overall": 89,                   // 0-100 Consumer Reports overall score
    "cr_reliability": "very-good",      // poor | fair | good | very-good | excellent | unrated
    "yale_reliability_pct": 8.7,        // first-year service rate %, lower is better
    "wirecutter": "top pick",           // status string or null
    "reviewed": 9.2,                    // 0-10 Reviewed.com numeric score
    "reviewed_status": "Editor's Choice · Best Counter-Depth 2026",  // Reviewed status string (independent of numeric)
    "rtings": 8.4,                      // 0-10 Rtings.com score (many categories unsupported, leave null)
    "repairability_score": 72,          // 0-100, higher = easier to repair; falls back to brand value when null
    "source_urls": {                    // machine-readable back-links
      "wirecutter":     "https://www.nytimes.com/wirecutter/...",
      "cr":             "https://www.consumerreports.org/...",
      "reviewed":       "https://reviewed.usatoday.com/...",
      "repairability":  "https://www.yaleappliance.com/..."
    }
  },
  "pros": ["...", "..."],
  "cons": ["...", "..."]
}
```

Any rating field may be `null` when unverified — do not fabricate. The site renders absent sources gracefully and excludes them from the composite score.

### Aspirational ratings fields (schema-supported, not yet populated)

The app's `helpers.jsx` also reads the following rating shapes when present; they appear in the schema so that a future data pass can add them without code changes. No model carries them today — leave them out rather than stubbing nulls.

```jsonc
{
  "cnet": 8.8,                          // 0-10 CNET score
  "good_housekeeping": "top tested",    // GH Institute status string or numeric 0-10
  "retailer_ratings": {
    "home_depot":   { "stars": 4.6, "count": 1247, "url": "..." },
    "lowes":        { "stars": 4.4, "count":  892, "url": "..." },
    "best_buy":     { "stars": 4.5, "count":  514, "url": "..." },
    "aj_madison":   { "stars": 4.7, "count":  306, "url": "..." }
  },
  "reddit_sentiment": "mostly positive",
  "reddit_sentiment_detail": {
    "summary": "Owners praise 3rd rack capacity; common complaint is long cycle times.",
    "threads": ["https://reddit.com/r/appliances/..."]
  }
}
```

## Category-specific fields

### Refrigerators

| Field | Values / notes |
| --- | --- |
| `style` | `french_door` \| `side_by_side` \| `top_freezer` \| `bottom_freezer` \| `built_in` \| `column` |
| `depth` | `standard` \| `counter` \| `built_in` |
| `width_in` | Integer inches (24, 30, 33, 36, 42, 48) |
| `capacity_cf` | Total cubic feet |
| `energy_kwh_yr` | Per Energy Guide label |
| `energy_star` | Boolean |
| `noise_db` | Integer dB |
| `icemaker` | Free-text describing location/type |
| `water_dispenser` | `none` \| `internal` \| `external` \| description |
| `compressor` | Optional description (inverter, dual, linear, etc.) |
| `finishes` | Array of finish strings (e.g. `["stainless", "black stainless", "panel-ready"]`) |
| `garage_ready` | `true` only when the manufacturer explicitly markets the model as garage-ready (rated for wider ambient temp range, typically ~38–110°F). Cite the source in `ratings.source_urls.garage_ready`. Use `null` (or omit) when unverified. |

### Dishwashers

| Field | Values / notes |
| --- | --- |
| `tub` | `stainless` \| `plastic` |
| `decibels` | Integer dB (lower = quieter; <44 is luxury) |
| `place_settings` | Integer |
| `third_rack` | Description (`basic`, `MyWay`, `FreeFlex`, `3D MultiFlex`, etc.) |
| `wash_cycles` | Integer count of programmed cycles |
| `energy_kwh_yr` | Per Energy Guide |
| `water_gal_cycle` | Gallons per normal cycle |
| `energy_star` | Boolean |
| `panel_ready` | Boolean |

### Ovens / ranges / cooktops (mixed file)

| Field | Values / notes |
| --- | --- |
| `type` | `range` \| `cooktop` \| `wall_oven` \| `specialty` |
| `fuel` | `gas` \| `electric` \| `induction` \| `dual_fuel` |
| `style` | `slide-in` \| `freestanding` \| `freestanding-pro` \| `rangetop` \| `cooktop` \| `single` \| `double` \| `combo-microwave` \| `single-steam` \| `coffee_built_in` |
| `width_in` | Integer inches (24, 30, 36, 48) — ranges, cooktops, wall ovens |
| `oven_capacity_cf` | Total cubic feet (ranges, wall ovens) |
| `burners` | Integer or descriptive ("freeform 4 zones") |
| `max_burner_btu` | Gas/dual-fuel peak |
| `max_burner_w` | Induction peak wattage |
| `convection` | Description string |
| `air_fry` | Boolean |
| `self_clean` | Description: `pyrolytic`, `AquaLift`, `steam + self`, `self`, `no` |

## `brands.json` schema

```jsonc
{
  "id": "bosch",
  "name": "Bosch",
  "tier": "premium",                    // budget | mainstream | premium | ultra-premium
  "country": "Germany",
  "notes": "Best-in-class dishwashers...",
  "service_rate_overall": 8.7,          // Yale first-year service call %
  "service_rate_source": "yale_2026",   // provenance tag for the overall rate
  "service_rate_dishwasher": 6.2,       // category-specific breakout, optional
  "service_rate_dishwasher_source": "yale_2026",
  "repairability_score": 65,            // 0-100, brand-level fallback when a model lacks its own
  "repairability_source": "yale_2026",  // provenance tag for repairability
  "repairability_notes": "Modular control boards; parts widely stocked through national distributors.",
  "cr_reliability": "very-good",        // poor | fair | good | very-good | excellent | unrated | null
  "cr_best_brand_2026": ["dishwasher"]  // array of CR 2026 "best brand" category awards, optional
}
```

Additional category breakouts follow the same `service_rate_<category>` + `service_rate_<category>_source` pattern (e.g. `service_rate_fridge_counter_depth`) and are optional.

## `buying-guide.json` schema

Top-level object with four keys:

- `_meta` — `last_updated`, `philosophy`, etc.
- `categories` — keyed by category id (`refrigerators`, `dishwashers`, `ranges_ovens_cooktops`). Each category has `headline`, `key_questions` (q/a pairs), `decision_tree` (if/then pairs), `red_flags`, `what_pros_buy`, `installation`, and `common_pitfalls`.
- `cross_category_principles` — array of general buying principles shared across categories.
- `brand_report_card` — array of brand-level editorial summaries used on the guide page.

See the file itself for the canonical structure.

## Source priority when data conflicts

1. Manufacturer spec sheet (objective specs only).
2. Consumer Reports overall score and reliability tier.
3. Yale Appliance service rate (for reliability).
4. Wirecutter pick status + Reviewed numeric.
5. Retailer aggregate ratings (large n, but subject to review manipulation).
6. Reddit sentiment (qualitative only, never a number).

When two sources conflict on a spec, prefer the manufacturer; when two sources conflict on a rating, show both and let the reader see the spread.

## Data update discipline

- Bump `_meta.last_updated` whenever you touch a file.
- When retiring a model, don't delete — add `"retired": true` and a `"retired_reason"` string so deep-links keep working.
- When a model is refreshed (e.g., 2024 → 2026 trim), create a new entry; don't overwrite history.
