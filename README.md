# Chef's Choice

A public research tool for comparing kitchen appliances — refrigerators, dishwashers, and ranges/ovens/cooktops — with aggregated ratings and a transparent, tweakable composite score.

**Live site:** [krool.github.io/ApplianceCompare](https://krool.github.io/ApplianceCompare/)

**Repo:** [github.com/Krool/ApplianceCompare](https://github.com/Krool/ApplianceCompare)

## What's inside

- **~200 models across 3 categories** with full specs, pricing, and ratings from multiple review sources (Consumer Reports, Wirecutter, Reviewed, Yale Appliance, Rtings). The schema also carries slots for CNET, Good Housekeeping, retailer stars, and Reddit sentiment — populated as future data passes land.
- **30 brands** profiled with reliability data (Yale 2026 service rates, CR 2026 predicted reliability) and tier classification.
- **Filterable / sortable table** with a detail drawer and side-by-side compare (2–4 models).
- **Weighted composite scoring** across five axes — quality, reliability, price, energy, quietness — which the reader can retune live from the Tweaks panel.
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

Production build (outputs to `docs/`):

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
  app.jsx             top-level App + state (tab, filters, sort, compare, tweaks)
  sidebar.jsx         left-rail category switcher + filter panel
  table-views.jsx     main table + detail drawer + compare drawer
  guide-page.jsx      buying-guide rendering
  tweaks-panel.jsx    weight/density controls; exports useTweaks hook
  helpers.jsx         scoring, formatting, aggregators
  styles.css          all styles (no framework)
public/
  data/               JSON database — served at /data/ (see public/data/README.md)
  MARKET_TRENDS.md    editorial doc linked from the buying guide
docs/                 Vite build output — committed; GitHub Pages serves from here
scripts/              data-maintenance Python scripts (honesty_pass, backfill)
```

The `useTweaks` hook and the `/*EDITMODE-BEGIN*/ ... /*EDITMODE-END*/` markers
in `app.jsx` originate from Claude design and let you round-trip edits back
into the design tool. Preserve them if you still plan to edit there.

## Composite scoring

The score shown in the table is a weighted blend of:

| Axis | Default weight | What it pulls from |
| --- | --- | --- |
| Quality | 25 | Mean of available 0–100-normalized sources: CR overall, Reviewed, Rtings, CNET, GH (numeric), and retailer star averages |
| Reliability | 30 | Yale service rate (model-specific, falls back to brand rate) |
| Price | 20 | Log curve on street price, anchored around $500 |
| Energy | 10 | kWh/yr (fridges, DW) — neutral for cooking |
| Quietness | 15 | Noise dB (fridges, DW) — neutral for cooking |

Readers adjust these weights from the Tweaks panel and the ranking recalculates live. The goal is an honest, transparent score — not a hidden editorial ranking.

## Deployment

GitHub Pages serves the built output from the `docs/` folder on `main`.

1. Create a public GitHub repo (e.g. `<your-username>/appliance-compare`).
2. From the repo root, build and push:
   ```bash
   npm run build                 # produces docs/
   git init
   git add .
   git commit -m "Initial commit: Chef's Choice appliance comparison site"
   git branch -M main
   git remote add origin https://github.com/<your-username>/<repo>.git
   git push -u origin main
   ```
3. In GitHub, go to **Settings → Pages**, set **Source** to "Deploy from a branch", pick `main` / `/docs`. Site goes live at `https://<your-username>.github.io/<repo>/` within a minute or two.
4. After each change, re-run `npm run build` and commit the updated `docs/`.
5. Optional: add a `public/CNAME` file with a custom domain if you own one — it will be copied into `docs/CNAME` at build.

## Contributing data

The model database lives in `public/data/*.json`. Schema is documented in [public/data/README.md](public/data/README.md). Rules of the road:

- Only US-market models (for now).
- Cite the source when adding a rating — URL goes into the `ratings.source_urls` map (see schema).
- Set `null` for unverified fields rather than guessing.
- When adding a new model, include at minimum: `id`, `brand`, `model`, `name`, `msrp`, `street_price`, at least one `ratings.*` entry, and `release_year`.

## License

[MIT](LICENSE). Data is aggregated from publicly available sources and presented with attribution; individual rating values remain the property of their publishers and are used here for comparison/research.

## Disclaimer

Prices drift. Ratings change. This site is a research snapshot, not investment advice. Verify current pricing and availability at the retailer before buying. Contributor views are their own and do not represent endorsements by Consumer Reports, Wirecutter, Yale Appliance, or any other rating source cited.
