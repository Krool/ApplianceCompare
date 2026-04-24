#!/usr/bin/env python3
"""
Round-4 backfill — three more DWs from Reviewed.com's 'Best Affordable
Dishwashers 2026' list (reviewed.com/dishwashers/best-right-now/best-affordable-dishwashers).
"""
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
DATA = ROOT / "public" / "data"
URL = "https://www.reviewed.com/dishwashers/best-right-now/best-affordable-dishwashers"

NEW = [
    {
        "id": "maytag-mdfs3924rz",
        "brand": "maytag",
        "model": "MDFS3924RZ",
        "name": "Maytag MDFS3924RZ Eco Series",
        "tub": "stainless",
        "msrp": None,
        "street_price": 549,
        "ratings": {
            "reviewed_status": "Recommended · Affordable 2026",
            "source_urls": {"reviewed": URL},
        },
        "pros": [
            "Reviewed.com: listed among best affordable DWs at $549",
            "Eco-focused water/energy use",
        ],
        "cons": [],
        "release_year": None,
    },
    {
        "id": "whirlpool-wdt750sakz",
        "brand": "whirlpool",
        "model": "WDT750SAKZ",
        "name": "Whirlpool WDT750SAKZ Black Stainless",
        "tub": "stainless",
        "msrp": None,
        "street_price": 649,
        "ratings": {
            "reviewed_status": "Affordable pick 2026",
            "source_urls": {"reviewed": URL},
        },
        "pros": [
            "Black-stainless finish",
            "Reviewed.com best-affordable list at $649",
        ],
        "cons": [],
        "release_year": None,
    },
    {
        "id": "samsung-dw80cg4021sr",
        "brand": "samsung",
        "model": "DW80CG4021SR",
        "name": "Samsung DW80CG4021SR Budget Smart DW",
        "tub": "stainless",
        "wifi": True,
        "msrp": None,
        "street_price": 399,
        "ratings": {
            "reviewed_status": "Best Under $500 2026",
            "source_urls": {"reviewed": URL},
        },
        "pros": [
            "Reviewed.com: 'Best Under $500'",
            "Adjustable-height upper rack + stemware holders",
            "SmartThings integration",
        ],
        "cons": [],
        "release_year": None,
    },
]

def apply(path, new_items):
    data = json.loads(path.read_text(encoding="utf-8"))
    existing_ids = {m["id"] for m in data["models"]}
    add = 0
    for n in new_items:
        if n["id"] not in existing_ids:
            data["models"].append(n)
            add += 1
    path.write_text(json.dumps(data, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")
    print(f"{path.name:28s}  new={add}  total={len(data['models'])}")

apply(DATA / "dishwashers.json", NEW)
