# Kitchen Appliance Compare — contributor notes for Claude

Public research site comparing kitchen appliances. Vite + React static build
deployed via GitHub Pages from `/docs`. Read `README.md` for orientation and
`public/data/README.md` for the data schema before touching JSON.

## Data integrity (non-negotiable)

- **Every numeric rating must be source-traceable.** If you add a score, add
  the URL to `ratings.source_urls`. No source, no number.
- **Prefer `null` over a plausible guess.** The site renders absent data
  gracefully and excludes nulls from the composite score. Fabricated data is
  worse than missing data — it's the single thing that would break trust in
  this site.
- **Prices drift, ratings change.** When you update a model, bump
  `_meta.last_updated` in that file.
- **Never delete a retired model.** Add `"retired": true` + `"retired_reason"`
  so deep links keep working.
- US-market models only, for now.
- **A CR score needs CR's page for that model** in `source_urls.cr`, not a
  category guide; the site hides category-sourced CR scores. CR's product
  sitemaps list every model page (see `public/data/README.md`), and CR pages
  fetch fine for title checks, so no web search is needed to find them.
- **Price date is `price_as_of`, not `last_updated`.** Set it whenever you
  re-check a price and cite the page in `source_urls.price`. Home Depot,
  Lowe's, Best Buy and AJ Madison block automated fetches; Abt and PC Richard
  don't.
- `npm run validate` enforces the per-field source rules; don't weaken a check
  to get a build through.

## Build and deploy

- `npm run dev` for local. `npm run build` writes to `docs/`.
- `docs/` IS committed — GitHub Pages serves from `main` / `/docs`.
- When you change source, rebuild and commit `docs/` in the same commit so
  the live site stays in sync with source.
- Data tooling has its own `scripts/package.json` (sharp, playwright) so the
  site build and CI stay light: `npm install --prefix scripts`. After adding
  images run `node scripts/optimize-images.mjs`; never ship a full-size original.
- One-shot backfill scripts don't get committed; keep them in a scratch dir.
- Vite copies everything in `public/` into `docs/` on build, so
  `public/MARKET_TRENDS.md` → `docs/MARKET_TRENDS.md` is automatic; don't
  hand-edit the `docs/` copy.

## Scoring model

`src/helpers.jsx#computeScore` is the canonical definition. If you change
weights or add a rating source, update the scoring table in `README.md` to
match — the table has drifted before.

## Claude design round-trip

`src/app.jsx` and `src/tweaks-panel.jsx` originated in Claude design. The
`/*EDITMODE-BEGIN*/…/*EDITMODE-END*/` markers and the `useTweaks` host
protocol exist for that round-trip. Leave them in place unless you're
consciously cutting the design-tool dependency. The Tweaks panel only opens
inside the design host; readers change weights through `src/rank-by.jsx`,
which writes the same tweak keys.

## Working style

- Implement → review → next. Holistic reviews at the end, not after every
  small edit.
- Don't ask about audience, scope, or visual direction — those are settled
  (see the buying guide tone for reference).
