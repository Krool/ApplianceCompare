# Chef's Choice — contributor notes for Claude

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

## Build and deploy

- `npm run dev` for local. `npm run build` writes to `docs/`.
- `docs/` IS committed — GitHub Pages serves from `main` / `/docs`.
- When you change source, rebuild and commit `docs/` in the same commit so
  the live site stays in sync with source.
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
consciously cutting the design-tool dependency.

## Working style

- Implement → review → next. Holistic reviews at the end, not after every
  small edit.
- Don't ask about audience, scope, or visual direction — those are settled
  (see the buying guide tone for reference).
