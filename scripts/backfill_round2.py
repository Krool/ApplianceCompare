#!/usr/bin/env python3
"""
Round-2 backfill — applies data from these live fetches on 2026-04-24:

  - Yale Appliance "Most Reliable Dishwashers 2026" (published Dec 17 2025, 33,190 calls)
      blog.yaleappliance.com/most-reliable-dishwashers
      → brand-level DW service rates + 2 LG model-level rates

  - Reviewed.com "Best Refrigerators 2026" (published Mar 19 2026)
      reviewed.com/refrigerators/best-right-now/best-refrigerators
      → 7 picks; 5 new models to add, 2 existing to re-designate

  - Reviewed.com "Best Ranges 2026" (published Mar 19 2026)
      reviewed.com/ovens/best-right-now/best-ranges
      → 6 picks across all fuel types; 4 new models to add, 2 already present
"""
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
DATA = ROOT / "public" / "data"

YALE_DW = "https://blog.yaleappliance.com/most-reliable-dishwashers"
REVIEWED_FRIDGE_MAIN = "https://www.reviewed.com/refrigerators/best-right-now/best-refrigerators"
REVIEWED_RANGES_MAIN = "https://www.reviewed.com/ovens/best-right-now/best-ranges"

# ========== brands.json updates ==========
# Yale 2026 DW-specific service rates
DW_RATES = {
    "miele": 5.6,
    "bosch-benchmark": 7.7,
    "bosch": 7.8,
    "thermador": 8.1,
    "kitchenaid": 8.2,
    "ge": 8.9,
    "ge-profile": 10.3,
    "lg": 11.6,
    "fisher-paykel": 16.6,
    "cafe": 16.6,
}

def update_brands():
    p = DATA / "brands.json"
    data = json.loads(p.read_text(encoding="utf-8"))
    updated = 0
    for b in data["brands"]:
        if b["id"] in DW_RATES:
            b["service_rate_dishwasher"] = DW_RATES[b["id"]]
            b["service_rate_dishwasher_source"] = "yale_2026_dw"
            updated += 1
    meta = data["_meta"]
    meta.setdefault("sources", {})["yale_2026_dw"] = YALE_DW
    meta["last_updated"] = "2026-04-24"
    p.write_text(json.dumps(data, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")
    print(f"brands.json                  DW-rates-applied={updated}")

# ========== Refrigerator updates ==========
FRIDGE_EXISTING_UPDATES = {
    # Reviewed promoted this from "Best Value" to "Best Overall" in the main list
    "hisense-hrm260n6tse": {
        "ratings.reviewed_status": "Editor's Choice · Best Overall 2026",
        "ratings.source_urls.reviewed": REVIEWED_FRIDGE_MAIN,
    },
    # cafe-cae28dm5ts5 keeps "Best Quad-Style" designation from the specialized list,
    # but also appears in the main list — note both.
    "cafe-cae28dm5ts5": {
        "ratings.reviewed_status": "Editor's Choice · Best Quad-Style 2026",
        # source_urls.reviewed already set from the french-door list; keep that
    },
}

NEW_FRIDGES = [
    {
        "id": "lg-lt18s2100w",
        "brand": "lg",
        "model": "LT18S2100W",
        "name": "LG LT18S2100W 18 cu ft Garage-Ready Top-Freezer",
        "style": "top_freezer",
        "depth": "standard",
        "capacity_cf": 18.0,
        "icemaker": "none",
        "water_dispenser": "none",
        "msrp": None,
        "street_price": 649,
        "ratings": {
            "reviewed_status": "Editor's Choice · Best No-Frills Fridge 2026",
            "source_urls": {"reviewed": REVIEWED_FRIDGE_MAIN},
        },
        "pros": [
            "Reviewed.com: 'excellent temperature control'",
            "Garage-ready — rated to operate in wider temperature range",
            "No ice maker / no smart = fewer failure points",
        ],
        "cons": [
            "No features — basic top-freezer only",
        ],
        "release_year": None,
    },
    {
        "id": "bosch-b36fd50sns",
        "brand": "bosch",
        "model": "B36FD50SNS",
        "name": "Bosch B36FD50SNS 26 cu ft French-Door Smart Refrigerator",
        "style": "french_door",
        "depth": "standard",
        "width_in": 36,
        "capacity_cf": 26.0,
        "wifi": True,
        "msrp": None,
        "street_price": 2699,
        "ratings": {
            "reviewed_status": "Editor's Choice · Best French-Door 2026",
            "source_urls": {"reviewed": REVIEWED_FRIDGE_MAIN},
        },
        "pros": [
            "Reviewed.com: 'temperatures in both fridge and freezer are exactly spot on'",
            "Abundant storage",
            "Home Connect smart integration",
        ],
        "cons": [],
        "release_year": None,
    },
    {
        "id": "hisense-hrb171n6ase",
        "brand": "hisense",
        "model": "HRB171N6ASE",
        "name": "Hisense HRB171N6ASE 17.2 cu ft Bottom-Freezer",
        "style": "bottom_freezer",
        "depth": "standard",
        "capacity_cf": 17.2,
        "msrp": None,
        "street_price": 799,
        "ratings": {
            "reviewed_status": "Editor's Choice · Best Bottom-Freezer 2026",
            "source_urls": {"reviewed": REVIEWED_FRIDGE_MAIN},
        },
        "pros": [
            "Reviewed.com: 'remarkably consistent temperatures'",
            "'One of the best values' per Reviewed",
        ],
        "cons": [
            "Reviewed.com: requires calibration on setup",
        ],
        "release_year": None,
    },
    {
        "id": "samsung-rs28cb760012",
        "brand": "samsung",
        "model": "RS28CB760012",
        "name": "Samsung Bespoke RS28CB760012 28 cu ft Side-by-Side",
        "style": "side_by_side",
        "depth": "standard",
        "capacity_cf": 28.0,
        "msrp": None,
        "street_price": None,
        "ratings": {
            "reviewed_status": "Editor's Choice · Best Side-by-Side 2026",
            "source_urls": {"reviewed": REVIEWED_FRIDGE_MAIN},
        },
        "pros": [
            "Reviewed.com: 'excels in performance tests' and has 'ample storage'",
            "Bespoke customizable panels",
        ],
        "cons": [
            "Reviewed.com: 'crispers don't retain humidity effectively'",
        ],
        "release_year": None,
    },
    {
        "id": "hotpoint-hps16btnrww",
        "brand": "hotpoint",
        "model": "HPS16BTNRWW",
        "name": "Hotpoint HPS16BTNRWW 15.6 cu ft Top-Freezer",
        "style": "top_freezer",
        "depth": "standard",
        "capacity_cf": 15.6,
        "msrp": None,
        "street_price": 599,
        "ratings": {
            "reviewed_status": "Editor's Choice · Best Top-Freezer 2026",
            "source_urls": {"reviewed": REVIEWED_FRIDGE_MAIN},
        },
        "pros": [
            "Reviewed.com: temperature variance under 2°F",
            "'Great value' despite minimal features",
        ],
        "cons": [
            "Minimal features (by design)",
        ],
        "release_year": None,
    },
]

# ========== Dishwasher updates ==========
# Yale 2026 LG model-level service rates
DW_EXISTING_UPDATES = {
    "lg-ldfn4542s": {
        "ratings.yale_reliability_pct": 3.6,
        "ratings.source_urls.yale": YALE_DW,
    },
    "lg-ldth7972s": {
        "ratings.yale_reliability_pct": 6.3,
        "ratings.source_urls.yale": YALE_DW,
    },
}

# ========== Range/oven updates ==========
RANGE_EXISTING_UPDATES = {
    # bosch-his8655u already added in round 1 as "Best 36-inch Induction 2026"
    # — now also shows on the main ranges list.  Keep existing status.
    # samsung-nsi6db990012aa already added — currently "Best Induction Overall 2026",
    # and the main ranges list has it as the #1 overall pick.  Keep existing status.
}

NEW_RANGES = [
    {
        "id": "ge-grs600avfs",
        "brand": "ge",
        "model": "GRS600AVFS",
        "name": "GE GRS600AVFS 30-inch Electric Slide-in Range",
        "type": "range",
        "fuel": "electric",
        "style": "slide-in",
        "width_in": 30,
        "convection": "convection + air fry",
        "air_fry": True,
        "msrp": None,
        "street_price": 964,
        "ratings": {
            "reviewed_status": "Editor's Choice · Best Electric Range 2026",
            "source_urls": {"reviewed": REVIEWED_RANGES_MAIN},
        },
        "pros": [
            "Reviewed.com: removable dishwasher-safe oven bottom tray",
            "Convection with air-fry capability",
            "Strong value at sub-$1,000",
        ],
        "cons": [],
        "release_year": None,
    },
    {
        "id": "lg-lrgl5825f",
        "brand": "lg",
        "model": "LRGL5825F",
        "name": "LG LRGL5825F 30-inch Gas Slide-in Range",
        "type": "range",
        "fuel": "gas",
        "style": "slide-in",
        "width_in": 30,
        "convection": "true convection",
        "air_fry": True,
        "msrp": None,
        "street_price": 1349,
        "ratings": {
            "reviewed_status": "Editor's Choice · Best Gas Range 2026",
            "source_urls": {"reviewed": REVIEWED_RANGES_MAIN},
        },
        "pros": [
            "Reviewed.com: 'excellent baking performance'",
            "Effective air-fryer mode",
            "True convection oven",
        ],
        "cons": [],
        "release_year": None,
    },
    {
        "id": "kitchenaid-ksdb900ess",
        "brand": "kitchenaid",
        "model": "KSDB900ESS",
        "name": "KitchenAid KSDB900ESS Dual-Fuel Double-Oven Slide-in",
        "type": "range",
        "fuel": "dual_fuel",
        "style": "slide-in",
        "width_in": 30,
        "oven_capacity_cf": 7.0,
        "self_clean": "AquaLift",
        "msrp": None,
        "street_price": 2925,
        "ratings": {
            "reviewed_status": "Editor's Choice · Best Dual-Fuel Range 2026",
            "source_urls": {"reviewed": REVIEWED_RANGES_MAIN},
        },
        "pros": [
            "7 cu ft combined double-oven capacity",
            "Steam rack included",
            "Gas burners + electric oven (dual-fuel)",
        ],
        "cons": [
            "AquaLift self-clean is weaker than pyrolytic",
        ],
        "release_year": None,
    },
    {
        "id": "whirlpool-wge745c0fs",
        "brand": "whirlpool",
        "model": "WGE745C0FS",
        "name": "Whirlpool WGE745C0FS Double-Oven Electric Range",
        "type": "range",
        "fuel": "electric",
        "style": "freestanding",
        "width_in": 30,
        "msrp": None,
        "street_price": 1473,
        "ratings": {
            "reviewed_status": "Editor's Choice · Best Double-Oven Range 2026",
            "source_urls": {"reviewed": REVIEWED_RANGES_MAIN},
        },
        "pros": [
            "Reviewed.com: 'effective burners' and large multitasking capacity",
            "Double-oven configuration",
        ],
        "cons": [],
        "release_year": None,
    },
]

# ----- runtime -----
def deep_set(obj, dotted, value):
    parts = dotted.split(".")
    cur = obj
    for p in parts[:-1]:
        cur = cur.setdefault(p, {})
    cur[parts[-1]] = value

def apply_existing(models, updates):
    changed = 0
    for m in models:
        if m.get("id") in updates:
            for k, v in updates[m["id"]].items():
                deep_set(m, k, v)
            changed += 1
    return changed

def merge_new(models, new_items):
    existing_ids = {m["id"] for m in models}
    added = 0
    for n in new_items:
        if n["id"] not in existing_ids:
            models.append(n)
            added += 1
    return added

def process(path, existing_updates, new_items, label):
    data = json.loads(path.read_text(encoding="utf-8"))
    ch = apply_existing(data["models"], existing_updates)
    add = merge_new(data["models"], new_items)
    path.write_text(json.dumps(data, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")
    print(f"{label:28s}  updated={ch}  new={add}  total={len(data['models'])}")

update_brands()
process(DATA / "refrigerators.json", FRIDGE_EXISTING_UPDATES, NEW_FRIDGES, "refrigerators.json")
process(DATA / "dishwashers.json",   DW_EXISTING_UPDATES,     [],           "dishwashers.json")
process(DATA / "ovens.json",         RANGE_EXISTING_UPDATES,  NEW_RANGES,   "ovens.json")
