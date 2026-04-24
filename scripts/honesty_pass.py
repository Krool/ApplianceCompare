#!/usr/bin/env python3
"""
Strip all unverified rating data from model JSON files.

What we keep (facts about the product itself):
  - id, brand, model, name
  - physical specs (width_in, capacity_cf, oven_capacity_cf, burners, ...)
  - feature booleans (wifi, energy_star, panel_ready, air_fry)
  - descriptive strings (style, depth, fuel, tub, third_rack, convection, etc.)
  - prices (msrp, street_price) — these are editorial "typical" and the site
    shows a disclaimer that they drift, so leaving them is acceptable v1
  - finishes, pros, cons, compressor (editorial opinion / manufacturer claim)
  - release_year
  - ratings.source_urls  (links to where we sourced data, trustworthy)

What we null (all unverified rating/subjective data):
  - ratings.cr_overall
  - ratings.cr_reliability
  - ratings.yale_reliability_pct
  - ratings.reviewed
  - ratings.rtings
  - ratings.cnet
  - ratings.good_housekeeping
  - ratings.wirecutter  (except when we explicitly verified)
  - ratings.retailer_ratings
  - ratings.reddit_sentiment
  - ratings.reddit_sentiment_detail

Explicitly verified via WebSearch / WebFetch on 2026-04-24 — preserved:
  - lg-lrflc2706s    wirecutter = "top pick 2026"  (nytimes.com/wirecutter)
  - lg-lsel6337f     wirecutter = "top pick"        (nytimes.com/wirecutter)

After running this, a follow-up backfill cycle will re-populate rating fields
from fetched primary sources.
"""
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
DATA = ROOT / "public" / "data"

VERIFIED_WIRECUTTER = {
    "lg-lrflc2706s": "top pick 2026",
    "lg-lsel6337f": "top pick",
}

# These ratings fields are all unverified in the seed — null them everywhere
# unless explicitly whitelisted per model above.
NULL_FIELDS = [
    "cr_overall", "cr_reliability", "yale_reliability_pct",
    "reviewed", "rtings", "cnet", "good_housekeeping",
]
REMOVE_FIELDS = [
    "retailer_ratings", "reddit_sentiment", "reddit_sentiment_detail",
]

def scrub_ratings(model):
    r = model.get("ratings") or {}

    # Null numeric/categorical ratings we can't trace to a source
    for f in NULL_FIELDS:
        if f in r:
            r[f] = None

    # Wirecutter: preserve only the explicitly verified set
    mid = model.get("id")
    if mid in VERIFIED_WIRECUTTER:
        r["wirecutter"] = VERIFIED_WIRECUTTER[mid]
    elif "wirecutter" in r:
        r["wirecutter"] = None

    # Remove noise we fabricated (Reddit summaries, retailer star aggregates)
    for f in REMOVE_FIELDS:
        r.pop(f, None)

    model["ratings"] = r
    return model

def scrub_file(path):
    data = json.loads(path.read_text(encoding="utf-8"))
    data["models"] = [scrub_ratings(m) for m in data["models"]]
    meta = data.setdefault("_meta", {})
    meta["last_updated"] = "2026-04-24"
    meta["honesty_pass"] = (
        "Unverified rating fields nulled on 2026-04-24. Numeric scores "
        "(cr_overall, reviewed, rtings, yale_reliability_pct, etc.) will be "
        "repopulated as they are confirmed against primary sources; "
        "source URLs will be added to ratings.source_urls."
    )
    path.write_text(json.dumps(data, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")
    kept = sum(1 for m in data["models"] if (m.get("ratings") or {}).get("wirecutter"))
    total = len(data["models"])
    print(f"{path.name:28s}  models={total:3d}  verified_wirecutter={kept}")

for fname in ("refrigerators.json", "dishwashers.json", "ovens.json"):
    scrub_file(DATA / fname)
