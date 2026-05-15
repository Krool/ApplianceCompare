# Gallery work — session notes

Written 2026-05-14, after the multi-brand gallery backfill push.

## What shipped

- **DrawerGallery component** (`src/table-views.jsx`): paginated alt-views
  inside the drawer, with prev/next pagers, thumbnail strip, counter,
  ArrowLeft/Right keys, and click-to-open lightbox. List-card thumbnails
  still use the single `image.local` canonical so the cohesive grid look
  is preserved.
- **Lightbox**: full-screen overlay, Escape/backdrop-click closes, arrow
  keys keep working inside it, background scroll locks while open.
- **Schema**: `image: {...}` (canonical, list thumbnail) is unchanged;
  optional `images: [{local, source_url, source, view}, ...]` array
  populates the gallery. Absent ⇒ drawer renders the single canonical.
- **158 of 523 active models (30%) ship with multi-image galleries**;
  460 of 523 (88%) have a canonical thumbnail.

## Per-brand scraping notes (what works, what doesn't)

| Brand(s) | Source | Approach | Notes |
|---|---|---|---|
| Bosch, Thermador | `media*.bsh-group.com` | Fetch `bosch-home.com` / `thermador.com` product page, extract JSON-LD `image` arrays. Filter to `/Product_Shots/` paths only (skip `/Line_Drawings/`). | Cleanest brand by far. 5-9 real product photos per model. Same CDN for both — see `scripts/fetch-bsh-galleries.mjs`. |
| Whirlpool, Maytag | Adobe Scene7 `/is/image/...image-set/MODEL?req=set,json` | Fetch product page → extract `data-asset=` value → query Scene7 set,json → download each item with `?fmt=webp&wid=1200`. | Page renders server-side enough that the data-asset value is in HTML. See `scripts/fetch-wpl-galleries.mjs`. |
| KitchenAid | Same Scene7 API as Whirlpool, but at different DAM path: `/majors/refrigeration/` (vs `/refrigeration/refrigerator/`) and lowercase model number. Attribute is `asset=` (no `data-` prefix). | Generalized fetcher handles all three. |
| Samsung | `images.samsung.com` Scene7 URLs in HTML | Scrape page for URLs containing the model SKU, dedup by base path, filter by compression density. | **Tricky** — see "Samsung filter" below. |
| Fisher & Paykel | `dam.fisherpaykel.com` URLs in HTML | Filter to URLs containing model number, extension is `.jpg`/`.png`/`.webp` (skip CAD, PDFs, accessories). | Only 2 of 5 F&P models in DB have manufacturer URLs; rest have no product page reference. |
| JennAir, Amana | — | image-set asset URL is not exposed in HTML; only the hero image (which we already have as canonical). | Skipped. |
| LG | `media.us.lg.com` URLs in `__NEXT_DATA__` | 1-3 distinct images per model after dedup; most variants are size-presets of the same hero. | Marginal over canonical. Skipped. |
| GE, Cafe, GE Profile | `cdn11.bigcommerce.com` | Bigcommerce uses internal product IDs (not model numbers) in image URLs, so per-page scrape has no model-keyed matcher. | Skipped. |
| Frigidaire, Miele, Sub-Zero, Electrolux | — | Product pages are client-rendered SPAs with no useful images in initial HTML. | Skipped. |

## Samsung filter (compression-density)

Samsung's CMS interleaves corporate marketing assets — warranty banners,
"Award Winner" seals, Limited-Time-Offer strips — into the same gallery
feed as real product photography, with the same URL structure and same
canvas dimensions (1600×1200 or 1920×1280 landscape). Aspect ratio,
file path, content type, asset ID — none separate them.

What does separate them: **compression density**. A real product photo
with textures, shadows, food packaging compresses to **250-340 KB per
megapixel** after PNG/WebP. A vector warranty seal or a banner with text
on solid background compresses to **30-100 KB per megapixel**.

Threshold of 200 KB/MP in `scripts/fetch-samsung-galleries-v2.mjs`
rejected 775 of 840 candidate URLs across the batch (92% reject rate)
while keeping the real product shots. WebP/PNG/JPEG dimensions are
parsed inline from file headers (no external deps).

Edge case: occasional hybrid images (real-product feature with a small
"ICEMAKER SATISFACTION 2025" award badge in the corner) make it past the
filter. The underlying image is still a real product feature, just with
small marketing overlay — acceptable.

## Image trust audit

A pre-gallery image audit (chunked across 6 parallel agents) reviewed
every canonical image. **30 egregiously wrong canonicals** were removed:
brand logos, water-filter packaging, completely-wrong products. **11
lifestyle/interior shots** were kept pending replacement with cleaner
product framing. Hash-dedup against all known image bytes catches
brand-logo og:images and Best Buy's "Image Unavailable" placeholder
(which returns 200 OK with a generic ~15KB PNG instead of 404).

## Open questions

1. **25 Samsung models** have no gallery — 10 have PDF-only `manufacturer`
   URLs (no live product page), 15 have URLs that resolve but don't yield
   a model-matched gallery. Per the new "flag missing products" rule,
   these need a manual call on availability. See the list in the
   conversation just before the loop pause.

2. **`bosch-b24cb50ess`** is labeled "Bosch 500 Series 24" Integrated
   Column Fridge" with `style: "column"`, `depth: "built_in"`,
   `finishes: ["panel-ready"]` — but the manufacturer gallery photos
   show a stainless-steel-fronted unit. Either the name/style/finish
   data is wrong (real product is a counter-depth bottom freezer with
   stainless option) or the gallery photos are wrong (e.g. wrong model
   shared on Bosch's CDN). Needs research before fixing.

3. **17 lifestyle/interior canonicals** flagged during the image audit
   for "replace with better-framed product shot if available." Now that
   many of those brands have rich galleries, we could promote a clean
   gallery photo to canonical position — but that disrupts the cohesive
   list-view look the user explicitly likes. May need per-model judgment.

4. **Best Buy alt-views** are uniformly placeholder for all SKUs tested
   (Bosch, Samsung, others). They look like a real source but the
   `_sN.jpg` suffix returns a ~15KB "Image Unavailable" PNG with 200 OK
   for every product. Don't try this path again.

5. **Manufacturer URLs that return PDFs** are a strong signal the model
   is retired or replaced. The "flag missing products" memory entry now
   documents this — surface these to the user instead of synthesizing
   alternative URLs.

## Repo size impact

Image budget at ~40MB pre-session ⇒ ~190MB post-session. GitHub Pages
soft cap is 1GB per repo, 100MB per file, 100GB/month bandwidth — well
under all of these.

## Scripts left in `scripts/` (kept for future expansion)

Fetchers: `fetch-bsh-galleries.mjs` (Bosch+Thermador), `fetch-bosch-
galleries.mjs` (original one-shot), `fetch-wpl-galleries.mjs`
(Whirlpool/Maytag/KitchenAid/JennAir/Amana), `fetch-samsung-galleries-
v2.mjs`, `fetch-fp-galleries.mjs`, `fetch-gallery-demo.mjs`.

Probes: `probe-bb-page.mjs`, `probe-bb-samsung-alts.mjs`, `probe-mfg-
page.mjs`, `probe-aem-imageset.mjs`, `probe-whirlpool-deep.mjs`, `probe-
kitchenaid-deep.mjs`, `probe-lg-ge-samsung.mjs`, `probe-lg-nextdata.mjs`,
`probe-samsung-nextdata.mjs`, `probe-maytag-and-fp.mjs`,
`probe-brand-galleries.mjs`. These document the per-brand investigations
so the next person doesn't have to redo them.

Rollback: `rollback-samsung-galleries.mjs` (used once during the v1→v2
pivot; kept as a template for future per-brand rollbacks).
