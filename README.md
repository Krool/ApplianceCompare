# Kitchen Appliance Compare

A public research tool for comparing kitchen appliances — refrigerators, dishwashers, and ranges/ovens/cooktops — with aggregated ratings and a transparent composite score you can re-weight.

**Live site:** [krool.github.io/ApplianceCompare](https://krool.github.io/ApplianceCompare/)

**Repo:** [github.com/Krool/ApplianceCompare](https://github.com/Krool/ApplianceCompare)

## What's inside

- **500+ models across 3 categories** with specs, dated prices, and ratings from multiple review sources (Consumer Reports, Wirecutter, Reviewed, Yale Appliance, retailer owner reviews). The schema also carries slots for Rtings, CNET, Good Housekeeping, and Reddit sentiment, populated as data passes land.
- **43 brands** profiled with reliability data (Yale 2026 service rates, CR 2026 predicted reliability) and tier classification.
- **Filterable / sortable table** with a detail drawer and side-by-side compare (2–4 models, same category). Filters include price, size, max depth, and features. The URL carries the view (filters, open model, compare set, sort, weights), so links are shareable and Back works.
- **Weighted composite scoring** across seven axes (quality, endorsements, reliability, price, repairability, energy, quietness). Readers pick a "Rank by" preset (Balanced, Reliability first, Best value, Quiet & efficient, Editors' picks) or set the weights themselves under Customize.
- **Buying guide** with per-category decision trees, red flags, and pro recommendations.
- **Market trends doc** covering 2020–2026 shifts: induction adoption, inverter compressors, smart-home standards, gas-stove policy, heat-pump tech, and rebate programs.

## Running locally

This is a Vite project. First-time setup:

```bash
npm install
```

Dev server with hot reload:

```bash
npm run dev
# open http://localhost:5173
```

Production build (validates the data, then outputs to `dist/`):

```bash
npm run build
```

Preview the production build locally:

```bash
npm run preview
```

## Project structure

```
index.html            Vite entry; Vite injects the bundled JS + CSS
src/
  main.jsx            bootstrap: fetches data, renders <App/>
  app.jsx             top-level App + state (tab, filters, sort, compare, weights, URL/history)
  rank-by.jsx         "Rank by" weight presets + Customize sliders (the reader-facing weights UI)
  sidebar.jsx         filter panel (full-screen sheet on phones)
  table-views.jsx     main table + detail drawer + compare modal
  guide-page.jsx      buying-guide rendering
  tweaks-panel.jsx    Claude design Tweaks panel (opens only inside the design host); exports useTweaks
  helpers.jsx         scoring, CR source rules, formatting, aggregators
  styles.css          all styles (no framework)
public/
  data/               JSON database — served at /data/ (see public/data/README.md)
  MARKET_TRENDS.md    editorial doc linked from the buying guide
.github/workflows/    pages.yml builds + deploys on push to main; ci.yml builds PRs
scripts/              data tooling: validate-data, optimize-images, download-image, gallery fetchers
                      (own package.json; `npm install --prefix scripts` for sharp/playwright)
```

The `useTweaks` hook and the `/*EDITMODE-BEGIN*/ ... /*EDITMODE-END*/` markers
in `app.jsx` originate from Claude design and let you round-trip edits back
into the design tool. Preserve them if you still plan to edit there.

## Composite scoring

The score shown in the table is a weighted blend of:

| Axis | Default weight | What it pulls from |
| --- | --- | --- |
| Quality | 30 | Mean of available 0–100-normalized sources: CR overall, Reviewed, Rtings, CNET, GH (numeric), Tom's Guide, and retailer star averages. A CR score counts only when `source_urls.cr` is CR's page for that model; a category buying-guide link doesn't trace the number, so that score is held back. The site shows CR as a band (Excellent 80+, Very good 70+, Good 60+, Fair 45+, Poor), never the raw number. |
| Endorsements | 30 | Number of distinct outlets (by `channel`) in `ratings.endorsements`, plus a Wirecutter pick; five roundups from one outlet count once. Diminishing-returns curve `100·(1 − 0.5^count)` — 0 → 0, 1 → 50, 2 → 75, 3 → 88, 4 → 94, 5+ → ~100. Zero endorsements scores zero (not excluded), so models with no editorial backing are docked — the axis exists to surface consistently-endorsed picks. |
| Reliability | 15 | Yale service rate (model-specific, falls back to brand rate) |
| Price | 5 | Log curve on street price, anchored around $500 |
| Repairability | 5 | 0–100 ease-of-repair score (model-specific, falls back to brand) — sourced from Yale tech notes, parts-availability, and design factors (modular vs. board-driven) |
| Energy | 5 | kWh/yr — treated as ongoing-cost contributor (fridges, DW); neutral for cooking |
| Quietness | 10 | Noise dB (fridges, DW) — neutral for cooking |

Readers change these weights with the "Rank by" presets or the Customize sliders above the table, and the ranking recalculates live. Presets live in `src/rank-by.jsx`; Balanced must match the defaults above. The goal is an honest, transparent score — not a hidden editorial ranking.

### Score confidence

Because the no-fake-data rule means many models start with most rating fields `null`, every score is paired with a **confidence tier** so readers can tell a 4-source consensus from a thin price-driven number:

| Tier | Meaning |
| --- | --- |
| `thin` | 0 review signals and no brand reliability data — score is essentially price/energy/quietness specs |
| `limited` | 1 review signal, OR only a brand-level Yale fallback |
| `solid` | 2 independent review signals |
| `strong` | 3+ review signals |

A "review signal" is any of: a quality source (CR / Reviewed / Rtings / CNET / GH / Tom's Guide / retailer star aggregate), a model-specific Yale service rate, a model-specific repairability score, a Wirecutter pick, or an endorsement from an outlet not already counted. The tier is shown next to every score in the table and called out in the model drawer.

## Deployment

GitHub Actions builds and deploys the site; the build output is not committed.

1. In GitHub, go to **Settings → Pages** and set **Source** to "GitHub Actions".
2. Push to `main`. `.github/workflows/pages.yml` runs `npm ci`, `npm run build` (which validates the data first) and publishes `dist/`. A data validation error stops the deploy and the live site stays as it was.
3. Optional: add a `public/CNAME` file with a custom domain if you own one; it is copied into the build.

## Contributing data

The model database lives in `public/data/*.json`. Schema is documented in [public/data/README.md](public/data/README.md). Rules of the road:

- Only US-market models (for now).
- Cite the source when adding a rating: the URL goes into the `ratings.source_urls` map under that rating's key (see schema). `npm run validate` fails the build when a rating has no matching source URL or the URL is on the wrong domain.
- Set `null` for unverified fields rather than guessing.
- When adding a new model, include at minimum: `id`, `brand`, `model`, `name`, `msrp`, `street_price` with `price_as_of`, at least one `ratings.*` entry, and `release_year`.
- After adding images, run `node scripts/optimize-images.mjs` (webp + thumbnail; see the data README).

## License

[MIT](LICENSE). Data is aggregated from publicly available sources and presented with attribution; individual rating values remain the property of their publishers and are used here for comparison/research.

## Disclaimer

Prices drift. Ratings change. This site is a research snapshot, not investment advice. Verify current pricing and availability at the retailer before buying. Contributor views are their own and do not represent endorsements by Consumer Reports, Wirecutter, Yale Appliance, or any other rating source cited.
