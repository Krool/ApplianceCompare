#!/usr/bin/env python3
"""
Apply verified 2026 data from primary-source fetches to the model JSONs.

Each update below was extracted from a specific live fetch on 2026-04-24:
- Reviewed.com Best French-Door Fridges 2026       (pub 2025-11-05)
- Reviewed.com Best Induction Ranges 2026          (upd 2026-03-20)
- Reviewed.com Best Bosch Dishwashers 2026         (pub 2025-07-24)
- Reviewed.com Best Dishwashers That Dry           (pub 2025-09-29)
- Yale Appliance Best Induction Ranges 2026        (brand + model-level service rates)

Rules:
- We only write values we can point at a URL for.
- New model entries include brand, model, name, style/type, rating, source URL, price (where the article gave one), and release_year=null when unknown.
- We do NOT invent capacity/db/kwh/etc. — those await a manufacturer spec-sheet pass.
- Script is idempotent — re-running replaces updated fields but doesn't duplicate rows.
"""
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
DATA = ROOT / "public" / "data"

# URLs used as sources — single source of truth
REVIEWED_FRENCH = "https://www.reviewed.com/refrigerators/best-right-now/best-french-door-fridges-2"
REVIEWED_INDUCTION = "https://www.reviewed.com/ovens/best-right-now/best-induction-ranges"
REVIEWED_BOSCH_DW = "https://www.reviewed.com/dishwashers/best-right-now/best-bosch-dishwashers"
REVIEWED_DRY_DW = "https://www.reviewed.com/dishwashers/best-right-now/the-best-dishwashers-that-dry-your-dishes"
YALE_INDUCTION = "https://blog.yaleappliance.com/best-induction-ranges"

# ========== Updates to EXISTING models ==========
# Keyed by model id; each entry merges into the model's `ratings` block.
EXISTING_UPDATES = {
    # --- Refrigerators (file: refrigerators.json) ---
    "bosch-b36ct80sns": {
        "ratings.reviewed_status": "Editor's Choice · Best Counter-Depth 2026",
        "ratings.source_urls.reviewed": REVIEWED_FRENCH,
    },

    # --- Dishwashers (file: dishwashers.json) ---
    "bosch-shp78cm5n": {
        "ratings.reviewed_status": "Editor's Choice · Best Overall 2026",
        "ratings.source_urls.reviewed": REVIEWED_BOSCH_DW,
    },
    "bosch-shp9pcm5n": {
        "ratings.reviewed_status": "Editor's Choice · Best Upgrade 2026",
        "ratings.source_urls.reviewed": REVIEWED_BOSCH_DW,
    },
    "lg-ldth7972s": {
        "ratings.reviewed_status": "Editor's Choice · Best Drying 2026",
        "ratings.source_urls.reviewed": REVIEWED_DRY_DW,
    },
    "kitchenaid-kdpm804kbs": {
        "ratings.reviewed_status": "Recommended · Best Drying 2026",
        "ratings.source_urls.reviewed": REVIEWED_DRY_DW,
    },

    # --- Ranges / ovens (file: ovens.json) ---
    "cafe-chs900p2ms1": {
        "ratings.reviewed_status": "Editor's Choice · Best Upgrade Induction 2026",
        "ratings.source_urls.reviewed": REVIEWED_INDUCTION,
    },
    "ge-profile-phs930ypfs": {
        # Yale 2026 model-specific rate from the best-induction-ranges page
        "ratings.yale_reliability_pct": 9.2,
        "ratings.source_urls.yale": YALE_INDUCTION,
    },
}

# ========== NEW models to append ==========
# Each is a full record with only verified fields populated.
NEW_REFRIGERATORS = [
    {
        "id": "hisense-hrm260n6tse",
        "brand": "hisense",
        "model": "HRM260N6TSE",
        "name": "Hisense HRM260N6TSE 25.6 cu ft Smart French Door",
        "style": "french_door",
        "depth": "standard",
        "capacity_cf": 25.6,
        "water_dispenser": "external",
        "msrp": None,
        "street_price": 1399,
        "ratings": {
            "reviewed_status": "Editor's Choice · Best Value 2026",
            "source_urls": {"reviewed": REVIEWED_FRENCH},
        },
        "pros": [
            "Reviewed.com lab: 'steady temperatures' and 'excellent temperature control'",
            "Editor's Choice Best Value at $1,399 (Lowe's)",
        ],
        "cons": [],
        "release_year": None,
    },
    {
        "id": "samsung-rf90f29aecr",
        "brand": "samsung",
        "model": "RF90F29AECR",
        "name": "Samsung Bespoke 4-Door RF90F29AECR 28.6 cu ft w/ AI Family Hub+",
        "style": "french_door",
        "depth": "standard",
        "capacity_cf": 28.6,
        "water_dispenser": "internal",
        "msrp": None,
        "street_price": 3299,
        "ratings": {
            "reviewed_status": "Best Full-Size French Door 2026",
            "source_urls": {"reviewed": REVIEWED_FRENCH},
        },
        "pros": [
            "32-inch touchscreen with AI Family Hub+",
            "Reviewed.com: 'Best Full-Size' French door 2026",
        ],
        "cons": [
            "Reviewed.com: 'AI Vision may not always be accurate'",
        ],
        "release_year": None,
    },
    {
        "id": "cafe-cae28dm5ts5",
        "brand": "cafe",
        "model": "CAE28DM5TS5",
        "name": "Café Smart Quad-Door CAE28DM5TS5 28.3 cu ft",
        "style": "french_door",
        "depth": "standard",
        "capacity_cf": 28.3,
        "water_dispenser": "internal",
        "msrp": None,
        "street_price": 4589,
        "ratings": {
            "reviewed_status": "Editor's Choice · Best Quad-Style 2026",
            "source_urls": {"reviewed": REVIEWED_FRENCH},
        },
        "pros": [
            "Reviewed.com: 'Near-perfect temperature performance'",
            "LED-lit back wall",
        ],
        "cons": [],
        "release_year": None,
    },
]

NEW_DISHWASHERS = [
    {
        "id": "bosch-sgx78c55uc",
        "brand": "bosch",
        "model": "SGX78C55UC",
        "name": "Bosch 800 Series SGX78C55UC ADA-Compliant",
        "tub": "stainless",
        "msrp": None,
        "street_price": 1399,
        "ratings": {
            "reviewed_status": "Editor's Choice · Best ADA 2026",
            "source_urls": {"reviewed": REVIEWED_BOSCH_DW},
        },
        "pros": [
            "Reviewed.com prior-model testing: ~99% stain removal on Heavy cycle",
            "Express cycle: 98.3% stain removal in 30 min",
            "ADA-compliant height",
        ],
        "cons": [],
        "release_year": None,
    },
    {
        "id": "bosch-she3aem2n",
        "brand": "bosch",
        "model": "SHE3AEM2N",
        "name": "Bosch 100 Series SHE3AEM2N",
        "tub": "stainless",
        "msrp": None,
        "street_price": 748,
        "ratings": {
            "reviewed_status": "Editor's Choice · Best Value 2026",
            "source_urls": {"reviewed": REVIEWED_BOSCH_DW},
        },
        "pros": [
            "Reviewed.com: 'Removes >90% of ultra-tough food stains on Quick cycle'",
            "Entry Bosch reliability at sub-$800",
        ],
        "cons": [],
        "release_year": None,
    },
    {
        "id": "bosch-she53c85n",
        "brand": "bosch",
        "model": "SHE53C85N",
        "name": "Bosch 300 Series SHE53C85N",
        "tub": "stainless",
        "msrp": None,
        "street_price": 1099,
        "ratings": {
            "reviewed_status": "Editor's Choice 2026",
            "source_urls": {"reviewed": REVIEWED_BOSCH_DW},
        },
        "pros": [
            "Reviewed.com: 'Great balance between price and performance'",
            "Strong cleaning + customizable features",
        ],
        "cons": [],
        "release_year": None,
    },
    {
        "id": "bosch-shp65cm5n",
        "brand": "bosch",
        "model": "SHP65CM5N",
        "name": "Bosch 500 Series SHP65CM5N",
        "tub": "stainless",
        "msrp": None,
        "street_price": 999,
        "ratings": {
            "reviewed_status": "Recommended · Best Drying (500 Series) 2026",
            "source_urls": {"reviewed": REVIEWED_DRY_DW},
        },
        "pros": [
            "AutoAir door-pop for condensation drying",
            "Reviewed.com: 'good cleaning power', slightly behind 800 Series",
        ],
        "cons": [],
        "release_year": None,
    },
    {
        "id": "miele-g5266scvi-sfp",
        "brand": "miele",
        "model": "G 5266 SCVi SFP",
        "name": "Miele G 5266 SCVi SFP Panel-Ready",
        "tub": "stainless",
        "panel_ready": True,
        "msrp": None,
        "street_price": 1779,
        "ratings": {
            "reviewed_status": "Editor's Choice · Best Upgrade Drying 2026",
            "source_urls": {"reviewed": REVIEWED_DRY_DW},
        },
        "pros": [
            "AutoOpen Drying (door pops automatically post-cycle)",
            "Miele's 20-year tested lifespan reputation",
        ],
        "cons": [],
        "release_year": None,
    },
]

NEW_OVENS = [
    {
        "id": "samsung-nsi6db990012aa",
        "brand": "samsung",
        "model": "NSI6DB990012AA",
        "name": "Samsung Bespoke NSI6DB990012AA Induction Slide-in",
        "type": "range",
        "fuel": "induction",
        "style": "slide-in",
        "width_in": 30,
        "wifi": True,
        "msrp": None,
        "street_price": 2700,
        "ratings": {
            "reviewed_status": "Best Induction Range Overall 2026",
            "source_urls": {"reviewed": REVIEWED_INDUCTION},
        },
        "pros": [
            "Reviewed.com: 'fast boiling', 'steady oven temperatures', 'even baking on multiple racks'",
            "Internal oven camera",
        ],
        "cons": [],
        "release_year": None,
    },
    {
        "id": "bosch-his8655u",
        "brand": "bosch",
        "model": "HIS8655U",
        "name": "Bosch 800 Series HIS8655U 36-inch Induction Range",
        "type": "range",
        "fuel": "induction",
        "style": "slide-in",
        "width_in": 36,
        "wifi": True,
        "msrp": None,
        "street_price": 6799,
        "ratings": {
            "reviewed_status": "Best 36-inch Induction Range 2026",
            "source_urls": {"reviewed": REVIEWED_INDUCTION},
        },
        "pros": [
            "Reviewed.com: 'impressively even heating' on spacious 36\" cooktop",
        ],
        "cons": [
            "Reviewed.com noted intense initial off-gassing",
        ],
        "release_year": None,
    },
    {
        "id": "ge-profile-phs700ayfs",
        "brand": "ge-profile",
        "model": "PHS700AYFS",
        "name": "GE Profile PHS700AYFS 30-inch Smart Slide-in Induction",
        "type": "range",
        "fuel": "induction",
        "style": "slide-in",
        "width_in": 30,
        "wifi": True,
        "msrp": None,
        "street_price": 1394,
        "ratings": {
            "reviewed_status": "Best Value Induction Range 2026",
            "source_urls": {"reviewed": REVIEWED_INDUCTION},
        },
        "pros": [
            "EasyWash oven tray",
            "Griddle Zone on cooktop",
        ],
        "cons": [],
        "release_year": None,
    },
    {
        "id": "frigidaire-gcfi3060bf",
        "brand": "frigidaire",
        "model": "GCFI3060BF",
        "name": "Frigidaire Gallery GCFI3060BF 30-inch Induction Range",
        "type": "range",
        "fuel": "induction",
        "style": "slide-in",
        "width_in": 30,
        "msrp": None,
        "street_price": 1499,
        "ratings": {
            "reviewed_status": "Best Entry-Level Induction 2026",
            "source_urls": {"reviewed": REVIEWED_INDUCTION},
        },
        "pros": [
            "Reviewed.com: 'Boils fast', 'excellent value', 'precise temperature control'",
        ],
        "cons": [
            "Reviewed.com: touch controls 'can be finicky'",
        ],
        "release_year": None,
    },
    {
        "id": "ge-profile-phs93xypfs",
        "brand": "ge-profile",
        "model": "PHS93XYPFS",
        "name": "GE Profile PHS93XYPFS 5-Burner Slide-in Induction",
        "type": "range",
        "fuel": "induction",
        "style": "slide-in",
        "width_in": 30,
        "burners": 5,
        "convection": "True European Convection",
        "wifi": True,
        "msrp": None,
        "street_price": 3499,
        "ratings": {
            "reviewed_status": "Best for Baking Induction 2026",
            "source_urls": {"reviewed": REVIEWED_INDUCTION},
        },
        "pros": [
            "True European Convection",
            "Reviewed.com: 'oven efficiently baked cookies evenly'",
        ],
        "cons": [
            "Reviewed.com: air-fry setting underperformed",
        ],
        "release_year": None,
    },
    {
        "id": "miele-hr1632-3i",
        "brand": "miele",
        "model": "HR 1632-3 I",
        "name": "Miele HR 1632-3 I 36-inch Induction Range",
        "type": "range",
        "fuel": "induction",
        "style": "freestanding-pro",
        "width_in": 36,
        "wifi": True,
        "msrp": None,
        "street_price": 13699,
        "ratings": {
            "reviewed_status": "Best Smart Induction Range 2026",
            "source_urls": {"reviewed": REVIEWED_INDUCTION, "yale": YALE_INDUCTION},
        },
        "pros": [
            "Moisture Plus steam injection",
            "Wireless precision probe",
        ],
        "cons": [
            "Premium pricing ($13,699)",
        ],
        "release_year": None,
    },
    {
        "id": "lg-studio-lsis6338fe",
        "brand": "lg-studio",
        "model": "LSIS6338FE",
        "name": "LG Studio LSIS6338FE 30-inch Smart Slide-in Induction",
        "type": "range",
        "fuel": "induction",
        "style": "slide-in",
        "width_in": 30,
        "oven_capacity_cf": 6.3,
        "wifi": True,
        "msrp": None,
        "street_price": 2799,
        "ratings": {
            "reviewed_status": "Best Induction for Families 2026",
            "source_urls": {"reviewed": REVIEWED_INDUCTION},
        },
        "pros": [
            "6.3 cu ft oven — one of the largest in class",
            "InstaView window",
        ],
        "cons": [],
        "release_year": None,
    },
    {
        "id": "cafe-chs950p2ms1",
        "brand": "cafe",
        "model": "CHS950P2MS1",
        "name": "Café CHS950P2MS1 30-inch Smart Slide-in Double-Oven Induction",
        "type": "range",
        "fuel": "induction",
        "style": "slide-in",
        "width_in": 30,
        "oven_capacity_cf": 6.7,
        "wifi": True,
        "msrp": None,
        "street_price": 4499,
        "ratings": {
            "reviewed_status": "Best Double Oven Induction 2026",
            "source_urls": {"reviewed": REVIEWED_INDUCTION},
        },
        "pros": [
            "Dual independent ovens (6.7 cu ft total)",
            "Reviewed.com: 'consistent temperature performance on burners'",
        ],
        "cons": [],
        "release_year": None,
    },
    {
        "id": "frigidaire-gcfi3070bf",
        "brand": "frigidaire",
        "model": "GCFI3070BF",
        "name": "Frigidaire Gallery GCFI3070BF Induction w/ Pizza Kit",
        "type": "range",
        "fuel": "induction",
        "style": "slide-in",
        "width_in": 30,
        "msrp": None,
        "street_price": 1699,
        "ratings": {
            "reviewed_status": "Best for Pizza Induction 2026",
            "source_urls": {"reviewed": REVIEWED_INDUCTION},
        },
        "pros": [
            "Reaches 750°F+ for Neapolitan-style pizza",
            "Includes stone, shield, and peel",
        ],
        "cons": [
            "Reviewed.com: touch controls may be 'temperamental'",
        ],
        "release_year": None,
    },
    {
        "id": "lg-lsil6336xe",
        "brand": "lg",
        "model": "LSIL6336XE",
        "name": "LG LSIL6336XE 6.3 cu ft Induction Slide-in",
        "type": "range",
        "fuel": "induction",
        "style": "slide-in",
        "width_in": 30,
        "oven_capacity_cf": 6.3,
        "burners": 5,
        "wifi": True,
        "msrp": None,
        "street_price": 1899,
        "ratings": {
            "yale_reliability_pct": 4.6,
            "source_urls": {"yale": YALE_INDUCTION},
        },
        "pros": [
            "Yale 2026 'most reliable induction range' (4.6% service rate)",
            "InstaView oven window",
        ],
        "cons": [],
        "release_year": None,
    },
]

# ---------- Execution ----------

def deep_set(obj, dotted, value):
    parts = dotted.split(".")
    cur = obj
    for p in parts[:-1]:
        cur = cur.setdefault(p, {})
    cur[parts[-1]] = value

def apply_updates(models, updates):
    changed = 0
    for m in models:
        mid = m.get("id")
        if mid in updates:
            for k, v in updates[mid].items():
                deep_set(m, k, v)
            changed += 1
    return changed

def merge_new(models, new_items):
    existing_ids = {m["id"] for m in models}
    added = 0
    for n in new_items:
        if n["id"] in existing_ids:
            continue
        models.append(n)
        added += 1
    return added

def process(path, updates, new_items):
    data = json.loads(path.read_text(encoding="utf-8"))
    ch = apply_updates(data["models"], updates)
    add = merge_new(data["models"], new_items)
    path.write_text(json.dumps(data, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")
    print(f"{path.name:28s}  updated={ch}  new={add}  total={len(data['models'])}")

# File-scoped filters so we don't merge fridge updates into the ovens file etc.
FRIDGE_EXISTING = {k: v for k, v in EXISTING_UPDATES.items() if k in {"bosch-b36ct80sns"}}
DW_EXISTING = {k: v for k, v in EXISTING_UPDATES.items() if k in {"bosch-shp78cm5n","bosch-shp9pcm5n","lg-ldth7972s","kitchenaid-kdpm804kbs"}}
OVEN_EXISTING = {k: v for k, v in EXISTING_UPDATES.items() if k in {"cafe-chs900p2ms1","ge-profile-phs930ypfs"}}

process(DATA / "refrigerators.json", FRIDGE_EXISTING, NEW_REFRIGERATORS)
process(DATA / "dishwashers.json",   DW_EXISTING,     NEW_DISHWASHERS)
process(DATA / "ovens.json",         OVEN_EXISTING,   NEW_OVENS)
