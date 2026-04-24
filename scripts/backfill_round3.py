#!/usr/bin/env python3
"""
Round-3 backfill. Single source this round:

  Reviewed.com "The Best Dishwashers 2026" (published 2026-03-10)
  reviewed.com/dishwashers/best-right-now/best-dishwashers

Adds 3 new dishwashers to the catalog with real pick status + prices from the
article. Updates a few existing models' status if they appear in the main
list but weren't previously linked to it.
"""
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
DATA = ROOT / "public" / "data"

REVIEWED_DW_MAIN = "https://www.reviewed.com/dishwashers/best-right-now/best-dishwashers"

EXISTING = {
    # miele-g5266scvi-sfp is confirmed in both the "drying" list and the main
    # list — the main list designates it "Plastic Drying" pick. Keep its
    # existing source_urls.reviewed (drying list URL) — we don't need a map.
}

NEW = [
    {
        "id": "maytag-mdb4949skz",
        "brand": "maytag",
        "model": "MDB4949SKZ",
        "name": "Maytag MDB4949SKZ Dishwasher",
        "tub": "stainless",
        "msrp": None,
        "street_price": 569,
        "ratings": {
            "reviewed_status": "Editor's Choice · Budget Pick 2026",
            "source_urls": {"reviewed": REVIEWED_DW_MAIN},
        },
        "pros": [
            "Reviewed.com: 'Auto and Normal cycles scrub out most stains'",
            "Budget pick: starting at $569",
        ],
        "cons": [
            "Reviewed.com: 'cleaning performance is commensurate with price'",
            "Heated dry (older tech)",
        ],
        "release_year": None,
    },
    {
        "id": "samsung-dw90f89p0usr",
        "brand": "samsung",
        "model": "DW90F89P0USR",
        "name": "Samsung Bespoke DW90F89P0USR Panel-Ready",
        "tub": "stainless",
        "decibels": 38,
        "wifi": True,
        "panel_ready": True,
        "msrp": None,
        "street_price": 999,
        "ratings": {
            "reviewed_status": "Editor's Choice · Open-Kitchen Pick 2026",
            "source_urls": {"reviewed": REVIEWED_DW_MAIN},
        },
        "pros": [
            "Ultra-quiet at 38 dB (Reviewed lab measured)",
            "Auto-open door",
            "Extensive wash cycle options",
        ],
        "cons": [],
        "release_year": None,
    },
    {
        "id": "ge-profile-pdp755syvfs",
        "brand": "ge-profile",
        "model": "PDP755SYVFS",
        "name": "GE Profile PDP755SYVFS Large-Family Dishwasher",
        "tub": "stainless",
        "place_settings": 16,
        "third_rack": "dedicated third-rack jets",
        "wifi": True,
        "msrp": None,
        "street_price": 879,
        "ratings": {
            "reviewed_status": "Best for Large Families 2026",
            "source_urls": {"reviewed": REVIEWED_DW_MAIN},
        },
        "pros": [
            "16 place settings",
            "Dedicated third-rack jets",
            "Twin Turbo Dry Boost for plastics",
        ],
        "cons": [],
        "release_year": None,
    },
]

def deep_set(obj, dotted, value):
    parts = dotted.split(".")
    cur = obj
    for p in parts[:-1]:
        cur = cur.setdefault(p, {})
    cur[parts[-1]] = value

def apply(path, existing_updates, new_items):
    data = json.loads(path.read_text(encoding="utf-8"))
    existing_ids = {m["id"] for m in data["models"]}
    ch = 0
    for m in data["models"]:
        if m["id"] in existing_updates:
            for k, v in existing_updates[m["id"]].items():
                deep_set(m, k, v)
            ch += 1
    add = 0
    for n in new_items:
        if n["id"] not in existing_ids:
            data["models"].append(n)
            add += 1
    path.write_text(json.dumps(data, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")
    print(f"{path.name:28s}  updated={ch}  new={add}  total={len(data['models'])}")

apply(DATA / "dishwashers.json", EXISTING, NEW)
