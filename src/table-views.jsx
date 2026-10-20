// Table, Drawer, Compare bar/modal
import { useEffect, useMemo, useRef, useState } from 'react';
import {
  fmtPrice, fmtCapacity, fmtKwh, fmtDb, fmtPct, fmtCount,
  relClass, tierClass, imageSrc, thumbSrc, isRetired, crScore, crBand,
  computeScore, getScoreBreakdown, getScoreConfidence, getSourceDisagreement,
  getRatingSources, getRetailerLinks, aggregateRetailerStars, totalRetailerReviewCount,
} from './helpers.jsx';

const fmtInches = (v) => v == null ? '—' : (Number.isInteger(v) ? v : v.toFixed(1)) + '"';

// Product hero / thumbnail. Falls back to a brand-initial monogram when the
// model has no image, or when the file fails to load (catches typo'd paths
// or partially-populated data without a runtime crash). Local-only by design
// — the page CSP blocks third-party img-src.
function ProductImage({ model, brand, size = 'thumb' }) {
  const [failed, setFailed] = useState(false);
  const path = model.image?.local;
  const showImage = path && !failed;
  const initial = (brand?.name || model.brand || '?').trim().charAt(0).toUpperCase();
  const className = 'product-image product-image-' + size;
  if (showImage) {
    return (
      <img
        className={className}
        src={size === 'hero' ? imageSrc(path) : thumbSrc(path)}
        alt={model.name + ' product photo'}
        loading="lazy"
        decoding="async"
        onError={() => setFailed(true)}
      />
    );
  }
  return (
    <span className={className + ' is-placeholder'} role="img" aria-label={`${model.name} (no image available)`}>
      <span className="product-image-monogram">{initial}</span>
    </span>
  );
}

// Drawer-only gallery. If `model.images` is a populated array, shows the
// main image with prev/next pagers, a counter, and a thumbnail strip.
// Falls back to the existing single-image ProductImage when there is no
// gallery (so list cards keep their consistent thumbnail look elsewhere).
function DrawerGallery({ model, brand }) {
  const gallery = useMemo(() => {
    if (Array.isArray(model.images) && model.images.length > 0) return model.images;
    if (model.image?.local) return [model.image];
    return [];
  }, [model.images, model.image]);

  const [idx, setIdx] = useState(0);
  const [failed, setFailed] = useState({});
  const [zoomed, setZoomed] = useState(false);
  useEffect(() => { setIdx(0); setFailed({}); setZoomed(false); }, [model.id]);

  const many = gallery.length > 1;

  // Arrow-key nav (gallery or lightbox). Skips when focus is in a text field
  // so the ranges/search box still work normally inside the drawer.
  // When the lightbox is open, Escape closes it instead of the drawer — the
  // drawer's own dismiss handler is on `keydown` too, but we stopPropagation
  // here so it doesn't fire.
  useEffect(() => {
    if (!many && !zoomed) return;
    const onKey = (e) => {
      const t = e.target;
      if (t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || t.isContentEditable)) return;
      if (zoomed && e.key === 'Escape') { e.stopPropagation(); e.preventDefault(); setZoomed(false); return; }
      if (!many) return;
      if (e.key === 'ArrowLeft') { e.preventDefault(); setIdx(i => (i - 1 + gallery.length) % gallery.length); }
      else if (e.key === 'ArrowRight') { e.preventDefault(); setIdx(i => (i + 1) % gallery.length); }
    };
    // Capture phase so we beat useDismissableSurface's bubble-phase Escape
    window.addEventListener('keydown', onKey, true);
    return () => window.removeEventListener('keydown', onKey, true);
  }, [many, gallery.length, zoomed]);

  // Lock background scroll while the lightbox is open
  useEffect(() => {
    if (!zoomed) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = prev; };
  }, [zoomed]);

  const current = gallery[idx];
  if (!current) {
    return (
      <div className="drawer-hero-block">
        <ProductImage model={model} brand={brand} size="hero" />
      </div>
    );
  }

  const isFailed = failed[idx];
  const initial = (brand?.name || model.brand || '?').trim().charAt(0).toUpperCase();
  const creditSource = current.source === 'manufacturer' ? (brand?.name || 'manufacturer') : (current.source || 'source').replace(/_/g, ' ');

  return (
    <div className="drawer-hero-block">
      <div className={"drawer-gallery" + (many ? ' has-many' : '')}>
        <div className="drawer-gallery-main">
          {isFailed ? (
            <span className="product-image product-image-hero is-placeholder" role="img" aria-label={`${model.name} (image failed to load)`}>
              <span className="product-image-monogram">{initial}</span>
            </span>
          ) : (
            <button
              type="button"
              className="product-image-zoom-btn"
              onClick={() => setZoomed(true)}
              aria-label="Open photo at full size"
            >
              <img
                className="product-image product-image-hero"
                src={imageSrc(current.local)}
                alt={model.name + ' product photo' + (current.view && current.view !== 'primary' ? ' — view ' + current.view : '')}
                loading="lazy"
                decoding="async"
                onError={() => setFailed(f => ({ ...f, [idx]: true }))}
              />
            </button>
          )}
          {many && (
            <>
              <button type="button" className="gallery-nav gallery-prev"
                onClick={() => setIdx(i => (i - 1 + gallery.length) % gallery.length)}
                aria-label="Previous photo">‹</button>
              <button type="button" className="gallery-nav gallery-next"
                onClick={() => setIdx(i => (i + 1) % gallery.length)}
                aria-label="Next photo">›</button>
              <span className="gallery-counter" aria-live="polite">{idx + 1} / {gallery.length}</span>
            </>
          )}
        </div>
        {many && (
          <div className="gallery-thumbs" role="tablist" aria-label="Product photos">
            {gallery.map((g, i) => (
              <button
                key={g.local || i}
                type="button"
                role="tab"
                aria-selected={i === idx}
                className={"gallery-thumb" + (i === idx ? ' is-active' : '')}
                onClick={() => setIdx(i)}
                aria-label={"Show photo " + (i + 1) + ' of ' + gallery.length}>
                <img src={thumbSrc(g.local)} alt="" loading="lazy" decoding="async" />
              </button>
            ))}
          </div>
        )}
      </div>
      {current.source_url && (
        <a className="drawer-hero-credit"
           href={current.source_url}
           target="_blank" rel="noopener noreferrer"
           title="Image source">
          Photo: {creditSource}
        </a>
      )}
      {zoomed && !isFailed && (
        <div
          className="lightbox-backdrop"
          role="dialog"
          aria-modal="true"
          aria-label={`${model.name} photo ${idx + 1} of ${gallery.length}`}
          onClick={() => setZoomed(false)}
        >
          <img
            className="lightbox-image"
            src={imageSrc(current.local)}
            alt={model.name + ' product photo'}
            onClick={(e) => e.stopPropagation()}
          />
          {many && (
            <>
              <button type="button"
                className="lightbox-nav lightbox-prev"
                onClick={(e) => { e.stopPropagation(); setIdx(i => (i - 1 + gallery.length) % gallery.length); }}
                aria-label="Previous photo">‹</button>
              <button type="button"
                className="lightbox-nav lightbox-next"
                onClick={(e) => { e.stopPropagation(); setIdx(i => (i + 1) % gallery.length); }}
                aria-label="Next photo">›</button>
              <span className="lightbox-counter">{idx + 1} / {gallery.length}</span>
            </>
          )}
          <button
            type="button"
            className="lightbox-close"
            onClick={(e) => { e.stopPropagation(); setZoomed(false); }}
            aria-label="Close full-size view"
          >×</button>
        </div>
      )}
    </div>
  );
}

// Shared: closes a surface when Escape is pressed, traps Tab focus inside the
// surface so keyboard users can't tab out of an open modal, and restores focus
// to the previously-focused element on unmount. onClose is tracked by ref so
// inline-callback callers don't re-bind the keydown on every render.
const FOCUSABLE_SEL = 'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';
function useDismissableSurface(onClose) {
  const rootRef = useRef(null);
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;
  useEffect(() => {
    const prevFocus = document.activeElement;
    const onKey = (e) => {
      if (e.key === 'Escape') { e.stopPropagation(); onCloseRef.current(); return; }
      if (e.key === 'Tab' && rootRef.current?.contains(document.activeElement)) {
        const items = rootRef.current.querySelectorAll(FOCUSABLE_SEL);
        if (!items.length) return;
        const first = items[0];
        const last = items[items.length - 1];
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault(); last.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault(); first.focus();
        }
      }
    };
    window.addEventListener('keydown', onKey);
    const el = rootRef.current?.querySelector(FOCUSABLE_SEL);
    el?.focus();
    return () => {
      window.removeEventListener('keydown', onKey);
      if (prevFocus && typeof prevFocus.focus === 'function') prevFocus.focus();
    };
  }, []);
  return rootRef;
}

function ScoreBar({ value, confidence, disagreement }) {
  if (value == null) return <span className="score-bar muted"><span className="num">—</span></span>;
  const tier = confidence?.tier;
  // The tier word is visible text (not a hover-only title) so touch users see it.
  const detail = confidence
    ? (confidence.signals === 0
        ? (tier === 'limited' ? 'spec sheet + brand data only' : 'no rating sources')
        : `${confidence.signals} rating signal${confidence.signals === 1 ? '' : 's'}`)
    : null;
  return (
    <span className={"score-bar conf-" + (tier || 'unknown')}>
      <span className="num">{value}</span>
      <span className="bar"><div style={{width: value + '%'}} /></span>
      {tier && <span className="conf" title={detail}>{tier}<span className="sr-only"> confidence, {detail}</span></span>}
      {disagreement?.contested && (
        <span className="contested" title={`Reviewers disagree by ${Math.round(disagreement.spread)} points across ${disagreement.sourceCount} sources`}>
          ⚠<span className="sr-only"> reviewers disagree</span>
        </span>
      )}
    </span>
  );
}

// Sort accessors, shared by the table and the mobile sort menu.
const SORT_KEYS = {
  name: (m) => m.name,
  price: (m) => m.street_price ?? m.msrp,
  capacity: (m) => m.capacity_cf ?? m.oven_capacity_cf,
  cr: (m) => crScore(m.ratings),
  reliability: (m) => m.ratings?.yale_reliability_pct,
  energy: (m) => m.energy_kwh_yr,
  db: (m) => m.decibels ?? m.noise_db,
};

function ApplianceTable({ category, models, brandsById, weights, sort, setSort, selected, toggleCompare, onOpen, onClearFilters }) {
  // Score, confidence and disagreement once per model per weight change, not
  // once per comparator call plus once per row.
  const derived = useMemo(() => {
    const out = new Map();
    for (const m of models) {
      const b = brandsById[m.brand];
      out.set(m.id, {
        score: computeScore(m, b, weights),
        confidence: getScoreConfidence(m, b),
        disagreement: getSourceDisagreement(m),
      });
    }
    return out;
  }, [models, brandsById, weights]);

  const sorted = useMemo(() => {
    const get = sort.key === 'score' ? (m) => derived.get(m.id).score
      : sort.key === 'brand' ? (m) => brandsById[m.brand]?.name || ''
      : SORT_KEYS[sort.key] || (() => null);
    const dir = sort.dir === 'asc' ? 1 : -1;
    return [...models].sort((a, b) => {
      const av = get(a), bv = get(b);
      if (av == null && bv == null) return 0;
      if (av == null) return 1;
      if (bv == null) return -1;
      if (typeof av === 'string') return av.localeCompare(bv) * dir;
      return (av - bv) * dir;
    });
  }, [models, sort, derived, brandsById]);

  const atCompareLimit = selected.length >= 4;

  // Sortable header: a real <button> inside the <th> so keyboard and screen
  // reader users get native button semantics; aria-sort stays on the <th>.
  const sortHead = (key, label, tip, className = '') => {
    const isSorted = sort.key === key;
    const ariaSort = isSorted ? (sort.dir === 'asc' ? 'ascending' : 'descending') : 'none';
    const toggle = () => setSort({ key, dir: isSorted && sort.dir === 'desc' ? 'asc' : 'desc' });
    return (
      <th className={(isSorted ? 'sorted ' + sort.dir + ' ' : '') + className} scope="col" aria-sort={ariaSort}>
        <button type="button" className="th-sort" onClick={toggle}>
          <span className="th-label">{label}</span>
          {tip && <span className="th-tip" role="tooltip">{tip}</span>}
        </button>
      </th>
    );
  };

  // Static (non-sortable) header with the same tooltip affordance.
  const plainHead = (label, tip, props = {}) => (
    <th scope="col" tabIndex={tip ? 0 : -1} {...props}>
      <span className="th-label">{label}</span>
      {tip && <span className="th-tip" role="tooltip">{tip}</span>}
    </th>
  );

  const TIPS = {
    score: 'Composite 0–100 weighted across review quality, editorial picks, reliability, price, repairability, energy, and quietness. Change the weighting with "Rank by" above the table. The word under each score is its confidence: thin, limited, solid, or strong, depending on how many independent rating sources back it.',
    model: 'Manufacturer name and SKU. Click any row for full specs.',
    brand: 'Manufacturer.',
    capacity: 'Total interior volume in cubic feet (fresh food + freezer).',
    db: 'Decibels at the normal cycle. Lower is quieter — under 44 dB is luxury territory.',
    typeFuel: 'Range / cooktop / wall oven, plus fuel type.',
    price: 'Typical street price. MSRP shown below in light grey if higher.',
    cr: 'Consumer Reports overall test score, shown as a band (Excellent 80+, Very good 70+, Good 60+, Fair 45+, Poor). Blank when CR has not tested the model, or when we have not yet linked the score to CR\'s page for that model.',
    yale: 'Yale Appliance first-year service-call rate. Lower is better. Falls back to brand-level rate when model-specific data is missing.',
    energy: 'Annual electricity use per the federal Energy Guide label. Lower is better.',
    tier: 'Brand price/positioning tier — budget, mainstream, premium, or ultra-premium.',
    compare: 'Tick up to 4 rows, then click Compare in the bottom bar for a side-by-side view.',
  };

  return (
    <div className="table-wrap">
      <table className="appliance-table">
        <thead>
          <tr>
            {plainHead('Compare', TIPS.compare, { className: 'compare-cell' })}
            {sortHead('score', 'Score', TIPS.score)}
            {sortHead('name', 'Model', TIPS.model)}
            {sortHead('brand', 'Brand', TIPS.brand)}
            {category === 'refrigerators' && sortHead('capacity', 'Capacity', TIPS.capacity)}
            {category === 'dishwashers' && sortHead('db', 'Quietness', TIPS.db)}
            {category === 'ranges_ovens_cooktops' && plainHead('Type / Fuel', TIPS.typeFuel)}
            {sortHead('price', 'Price', TIPS.price)}
            {sortHead('cr', 'CR', TIPS.cr, 'col-opt')}
            {sortHead('reliability', 'Yale Svc%', TIPS.yale, 'col-opt')}
            {(category !== 'ranges_ovens_cooktops') && sortHead('energy', 'Energy', TIPS.energy, 'col-opt')}
            {plainHead('Tier', TIPS.tier, { className: 'col-opt' })}
          </tr>
        </thead>
        <tbody>
          {sorted.length === 0 && (
            <tr>
              <td colSpan={99} className="empty">
                <div>No models match the current filters.</div>
                {onClearFilters && (
                  <button className="empty-clear" onClick={onClearFilters}>Clear all filters</button>
                )}
              </td>
            </tr>
          )}
          {sorted.map(m => {
            const b = brandsById[m.brand];
            const { score, confidence, disagreement } = derived.get(m.id);
            const isSel = selected.includes(m.id);
            const compareBlocked = !isSel && atCompareLimit;
            const retired = isRetired(m);
            return (
              // Mouse users can click anywhere on the row; keyboard and screen
              // reader users get the model-name button (a row can't be a button
              // without hiding its cells and nesting the checkbox).
              <tr key={m.id} className={(isSel ? 'selected' : '') + (retired ? ' is-retired' : '')}
                  onClick={() => onOpen(m)}>
                <td className="compare-cell" onClick={e => e.stopPropagation()}>
                  <input type="checkbox" checked={isSel} disabled={compareBlocked}
                    onChange={() => toggleCompare(m.id)}
                    title={compareBlocked ? 'Comparison holds 4 models. Remove one to add another.' : undefined}
                    aria-label={`Add ${m.name} to comparison`} />
                </td>
                <td><ScoreBar value={score} confidence={confidence} disagreement={disagreement} /></td>
                <td>
                  <div className="cell-name-row">
                    <ProductImage model={m} brand={b} size="thumb" />
                    <div className="cell-name">
                      <button type="button" className="name name-btn" onClick={e => { e.stopPropagation(); onOpen(m); }}>
                        {m.name}
                      </button>
                      <span className="sub">
                        {m.model}
                        {retired && <span className="retired-tag">Retired</span>}
                        {!retired && m.availability === 'discontinued' && <span className="retired-tag" title="The manufacturer has stopped making it; remaining stock may still be on sale.">Discontinued</span>}
                      </span>
                    </div>
                  </div>
                </td>
                <td className="cell-brand">{b?.name || m.brand}</td>
                {category === 'refrigerators' && <td>{fmtCapacity(m.capacity_cf)}</td>}
                {category === 'dishwashers' && <td>{fmtDb(m.decibels)}</td>}
                {category === 'ranges_ovens_cooktops' && <td style={{textTransform: 'capitalize', fontSize: 12, color: 'var(--ink-2)'}}>{(m.type || '').replace('_',' ')}<br/><span style={{color: 'var(--ink-3)'}}>{(m.fuel || '').replace('_', ' ')}</span></td>}
                <td className="cell-price">
                  {fmtPrice(m.street_price ?? m.msrp)}
                  {m.street_price && m.msrp && m.msrp > m.street_price && <span className="msrp">{fmtPrice(m.msrp)}</span>}
                </td>
                <td className="col-opt">{crBand(crScore(m.ratings)) ?? '—'}</td>
                <td className="col-opt">{fmtPct(m.ratings?.yale_reliability_pct ?? b?.service_rate_overall)}</td>
                {(category !== 'ranges_ovens_cooktops') && <td className="col-opt">{fmtKwh(m.energy_kwh_yr)}</td>}
                <td className="col-opt">{b?.tier
                  ? <span className={"pill " + tierClass(b.tier)}>{b.tier.replace('-', ' ')}</span>
                  : <span className="dim">—</span>}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

function Drawer({ model, brand, weights, onClose, onAddCompare, isCompared }) {
  const surfaceRef = useDismissableSurface(onClose);
  if (!model) return null;
  const score = computeScore(model, brand, weights);
  const confidence = getScoreConfidence(model, brand);
  const disagreement = getSourceDisagreement(model);
  const yaleRate = model.ratings?.yale_reliability_pct ?? brand?.service_rate_overall;
  const reviewed = model.ratings?.reviewed;
  const cr = crScore(model.ratings);
  const retailerLinks = getRetailerLinks(model);
  const confSubtitle = (() => {
    if (score == null) return 'no data';
    if (confidence.signals === 0) {
      const fallbacks = [];
      if (confidence.hasReliabilityFallback) fallbacks.push('brand reliability');
      if (confidence.hasRepairabilityFallback) fallbacks.push('brand repairability');
      return fallbacks.length
        ? 'spec sheet + ' + fallbacks.join(', ')
        : 'spec sheet only';
    }
    const parts = [];
    if (confidence.qualitySources) parts.push(confidence.qualitySources + ' review source' + (confidence.qualitySources === 1 ? '' : 's'));
    if (confidence.hasReliabilityDirect) parts.push('Yale reliability');
    if (confidence.hasRepairabilityDirect) parts.push('repairability');
    if (confidence.hasEditorialPick) parts.push('editorial pick');
    return parts.join(' · ');
  })();

  const specs = [];
  if (model.capacity_cf) specs.push(['Capacity', fmtCapacity(model.capacity_cf)]);
  if (model.oven_capacity_cf) specs.push(['Oven capacity', fmtCapacity(model.oven_capacity_cf)]);
  if (model.width_in) specs.push(['Width', model.width_in + '"']);
  if (typeof model.height_in === 'number') specs.push(['Height', fmtInches(model.height_in)]);
  if (typeof model.depth_in === 'number') specs.push(['Depth (body)', fmtInches(model.depth_in)]);
  if (typeof model.depth_with_handle_in === 'number') specs.push(['Depth (with handle)', fmtInches(model.depth_with_handle_in)]);
  if (model.style) specs.push(['Style', String(model.style).replace(/_/g, ' ')]);
  if (model.depth) specs.push(['Depth class', String(model.depth).replace(/_/g, ' ')]);
  if (model.fuel) specs.push(['Fuel', model.fuel.replace('_', ' ')]);
  if (model.burners) specs.push(['Burners', model.burners]);
  if (model.max_burner_btu) specs.push(['Max burner', model.max_burner_btu.toLocaleString() + ' BTU']);
  if (model.max_burner_w) specs.push(['Max burner', model.max_burner_w.toLocaleString() + ' W']);
  if (model.convection) specs.push(['Convection', model.convection]);
  if (model.air_fry !== undefined) specs.push(['Air fry', model.air_fry ? 'Yes' : 'No']);
  if (model.self_clean) specs.push(['Self-clean', model.self_clean]);
  if (model.decibels) specs.push(['Noise', fmtDb(model.decibels)]);
  if (model.noise_db) specs.push(['Noise', fmtDb(model.noise_db)]);
  if (model.place_settings) specs.push(['Place settings', model.place_settings]);
  if (model.third_rack) specs.push(['3rd rack', model.third_rack]);
  if (model.tub) specs.push(['Tub', model.tub]);
  if (model.icemaker) specs.push(['Ice maker', model.icemaker]);
  if (model.water_dispenser) specs.push(['Water', model.water_dispenser]);
  if (model.garage_ready) specs.push(['Garage rating', 'Manufacturer-rated for garage temp range']);
  if (model.compressor) specs.push(['Compressor', model.compressor]);
  if (model.energy_kwh_yr) specs.push(['Energy', fmtKwh(model.energy_kwh_yr)]);
  if (model.water_gal_cycle) specs.push(['Water/cycle', model.water_gal_cycle + ' gal']);
  if (model.energy_star !== undefined) specs.push(['Energy Star', model.energy_star ? 'Yes' : 'No']);
  if (model.wifi !== undefined) specs.push(['Wi-Fi', model.wifi ? 'Yes' : 'No']);
  if (model.panel_ready) specs.push(['Panel-ready', 'Yes']);
  if (model.finishes) specs.push(['Finishes', model.finishes.join(', ')]);
  if (model.release_year) specs.push(['Released', model.release_year]);
  if (model.warranty_parts_yr != null) specs.push(['Warranty (parts)', model.warranty_parts_yr + ' yr']);
  if (model.warranty_labor_yr != null) specs.push(['Warranty (labor)', model.warranty_labor_yr + ' yr']);

  return (
    <>
      <div className="drawer-overlay" onClick={onClose}></div>
      <aside className="drawer" ref={surfaceRef} role="dialog" aria-modal="true" aria-label={`Details for ${model.name}`}>
        <div className="drawer-header">
          <div className="drawer-title-block">
            <h2 className="drawer-title">{model.name}</h2>
            <span className="drawer-model">{brand?.name} · {model.model}</span>
            <div className="drawer-pillrow">
              {brand?.tier && (
                <span className={"pill " + tierClass(brand.tier)}>{brand.tier.replace('-', ' ')}</span>
              )}
              {model.ratings?.cr_reliability && model.ratings.cr_reliability !== 'unrated' && (
                <span className={"pill " + relClass(model.ratings.cr_reliability)}>{model.ratings.cr_reliability.replace('-', ' ')}</span>
              )}
              {model.availability === 'discontinued' && <span className="pill rel-fair" title="The manufacturer has stopped making it; remaining stock may still be on sale.">Discontinued</span>}
              {model.energy_star && <span className="pill rel-very-good">Energy Star</span>}
              {model.wifi && <span className="pill rel-good">Wi-Fi</span>}
              {model.panel_ready && <span className="pill rel-good">Panel-ready</span>}
              {model.garage_ready && <span className="pill rel-good" title="Manufacturer-rated for garage temperature range">Garage-rated</span>}
            </div>
          </div>
          <button className="drawer-close" onClick={onClose} aria-label="Close details">✕</button>
        </div>

        <div className="drawer-body">
          {isRetired(model) && (
            <div className="retired-note" role="note">
              <strong>Retired from active comparison.</strong> {model.retired_reason}
            </div>
          )}
          <DrawerGallery model={model} brand={brand} />

          <div className="drawer-section">
            <h3>Composite score</h3>
            <div className="score-grid">
              <div className={"score-card conf-" + confidence.tier}>
                <div className="lbl">Our score</div>
                <div className={"val" + (score == null ? " muted" : "")}>{score ?? '—'}</div>
                <div className="src">
                  <span className={"conf-pill conf-" + confidence.tier}>{confidence.tier}</span>
                  <span className="conf-detail">{confSubtitle}</span>
                </div>
                {disagreement.contested && (
                  <div className="contested-note" title="Reviewer disagreement">
                    ⚠ Sources disagree by {Math.round(disagreement.spread)} pts
                  </div>
                )}
              </div>
              <div className="score-card">
                <div className="lbl">Consumer Reports</div>
                <div className={"val val-word" + (cr == null ? " muted" : "")}>{crBand(cr) ?? '—'}</div>
                <div className="src">
                  {cr != null ? 'overall test score band'
                    : model.ratings?.cr_overall != null ? 'score not yet linked to CR\'s model page'
                    : 'not tested by CR'}
                </div>
              </div>
              {reviewed != null && (
                <div className="score-card">
                  <div className="lbl">Reviewed.com</div>
                  <div className="val">{reviewed.toFixed(1)}</div>
                  <div className="src">out of 10</div>
                </div>
              )}
              {(() => {
                const retailerAvg = aggregateRetailerStars(model.ratings);
                const retailerCount = totalRetailerReviewCount(model.ratings);
                if (retailerAvg == null) return null;
                return (
                  <div className="score-card">
                    <div className="lbl">Owner reviews</div>
                    <div className="val">{retailerAvg.toFixed(1)}<span style={{fontSize: 18, color: 'var(--accent)'}}>★</span></div>
                    <div className="src">avg across retailers {retailerCount ? fmtCount(retailerCount) : ''}</div>
                  </div>
                );
              })()}
            </div>
          </div>

          {(() => {
            const breakdown = getScoreBreakdown(model, brand);
            const active = breakdown.filter(b => b.value != null && weights[b.key] > 0);
            if (!active.length) return null;
            const totalW = active.reduce((s, b) => s + weights[b.key], 0);
            return (
              <div className="drawer-section">
                <h3>Score breakdown</h3>
                <div className="breakdown-grid">
                  {breakdown.map(b => {
                    const w = weights[b.key] ?? 0;
                    const hasValue = b.value != null;
                    const inComposite = hasValue && w > 0;
                    const effective = inComposite ? (w / totalW) * 100 : 0;
                    const lostPoints = inComposite ? ((100 - b.value) * w) / totalW : null;
                    let tagText, tagTitle;
                    if (!hasValue) {
                      tagText = 'no data';
                      tagTitle = 'No input data; this axis is excluded from the composite.';
                    } else if (w === 0) {
                      tagText = 'weight 0';
                      tagTitle = 'You have this axis weighted at zero, so it does not affect the composite.';
                    } else {
                      tagText = `${effective.toFixed(0)}% of score`;
                      tagTitle = `Weight ${w} of ${totalW} active = ${effective.toFixed(1)}% of the composite`;
                    }
                    return (
                      <div key={b.key} className={"breakdown-row" + (inComposite ? '' : ' breakdown-muted')}>
                        <span className="breakdown-label">{b.label}</span>
                        <span className="breakdown-score">{hasValue ? Math.round(b.value) : '—'}</span>
                        <span className="breakdown-share" title={tagTitle}>{tagText}</span>
                        <span className="breakdown-cost" title="Points lost to this axis on the final composite">
                          {lostPoints != null && lostPoints > 0.05 ? `−${lostPoints.toFixed(1)}` : ''}
                        </span>
                        <span className="breakdown-why">{b.why}</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })()}

          {(() => {
            const sources = getRatingSources(model);
            if (!sources.length) return null;
            return (
              <div className="drawer-section">
                <h3>Source ratings</h3>
                <div className="sources-grid">
                  {sources.map((s, i) => {
                    const numeric = s.score != null;
                    const invertedGood = s.inverted && typeof s.score === 'number' && s.score <= 10;
                    let scoreText = null;
                    if (numeric) {
                      if (s.max === 5) scoreText = s.score.toFixed(1) + '★';
                      else if (s.max === 10) scoreText = s.score.toFixed(1) + ' / 10';
                      else if (s.max === 100) scoreText = s.score + ' / 100';
                      else if (s.unit) scoreText = s.score.toFixed(1) + s.unit;
                      else scoreText = String(s.score);
                    }
                    return (
                      <div key={s.name + i} className="source-row">
                        <span className="source-name">{s.name}</span>
                        <span className="source-val">
                          {numeric
                            ? <span className={"source-score" + (invertedGood ? " inverted" : "")}>{scoreText}{s.count ? <span className="source-count"> {fmtCount(s.count)}</span> : null}</span>
                            : <span className="source-status">{s.status}</span>}
                          {s.url && <a className="source-link" href={s.url} target="_blank" rel="noreferrer" onClick={e => e.stopPropagation()} title={`Open ${s.name} source`} aria-label={`Open ${s.name} source in new tab`}>↗</a>}
                        </span>
                        {s.detail && <span className="source-detail">{s.detail}</span>}
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })()}

          <div className="drawer-section">
            <h3>Price</h3>
            <div style={{display: 'flex', gap: 18, alignItems: 'baseline'}}>
              <div style={{fontFamily: 'var(--serif)', fontSize: 32, fontWeight: 500, color: 'var(--ink)'}}>{fmtPrice(model.street_price ?? model.msrp)}</div>
              {model.msrp && model.street_price && model.msrp > model.street_price && (
                <div style={{color: 'var(--ink-3)'}}>MSRP {fmtPrice(model.msrp)} <span style={{color: 'var(--good)', fontWeight: 600}}>· save {fmtPrice(model.msrp - model.street_price)}</span></div>
              )}
            </div>
            <div className="price-meta">
              {model.price_as_of
                ? <>Price last checked {model.price_as_of}. Appliance prices move often; confirm at the retailer.</>
                : <>Price date not recorded. Confirm at the retailer.</>}
            </div>
            {retailerLinks.length > 0 && (
              <div className="retailer-links">
                <span>Check price at</span>
                {retailerLinks.map(l => (
                  <a key={l.label} href={l.url} target="_blank" rel="noopener noreferrer">{l.label} ↗</a>
                ))}
              </div>
            )}
          </div>

          <div className="drawer-section">
            <h3>
              Specifications
              {model.ratings?.source_urls?.specs && (
                <a
                  className="source-link"
                  href={model.ratings.source_urls.specs}
                  target="_blank"
                  rel="noreferrer"
                  onClick={e => e.stopPropagation()}
                  title="Manufacturer spec sheet"
                  aria-label="Open manufacturer spec sheet in new tab"
                  style={{marginLeft: 8, fontSize: '0.75em', verticalAlign: 'middle'}}
                >↗</a>
              )}
            </h3>
            <div className="spec-grid">
              {specs.map(([k, v]) => (
                <div key={k}>
                  <span className="spec-label">{k}</span>
                  <span className="spec-val">{v}</span>
                </div>
              ))}
            </div>
          </div>

          {(model.pros || model.cons) && (
            <div className="drawer-section">
              <h3>Reviewer takeaways</h3>
              <div className="proscons">
                <div className="pros">
                  <h4>Strengths</h4>
                  <ul>{(model.pros || []).map((p, i) => <li key={i}>{p}</li>)}</ul>
                </div>
                <div className="cons">
                  <h4>Limitations</h4>
                  <ul>{(model.cons || []).map((c, i) => <li key={i}>{c}</li>)}</ul>
                </div>
              </div>
            </div>
          )}

          {brand && (
            <div className="drawer-section">
              <h3>About {brand.name}</h3>
              <div className="brand-callout">
                <strong>{brand.country}</strong> · {brand.tier.replace('-', ' ')} tier
                {yaleRate != null && <> · Yale 2026 service rate <strong>{fmtPct(yaleRate)}</strong></>}
                <p style={{margin: '8px 0 0'}}>{brand.notes}</p>
              </div>
            </div>
          )}

          <div className="drawer-section">
            <button
              className={"btn-primary " + (isCompared ? 'is-active' : '')}
              onClick={() => onAddCompare(model.id)}
            >
              {isCompared ? '✓ In comparison' : '+ Add to comparison'}
            </button>
          </div>
        </div>
      </aside>
    </>
  );
}

function CompareBar({ ids, models, brandsById, onRemove, onClear, onOpen }) {
  if (!ids.length) return null;
  return (
    <div className="compare-bar">
      <span style={{fontSize: 12, color: 'rgba(255,255,255,0.7)', marginRight: 4}}>Compare ({ids.length}/4):</span>
      {ids.map(id => {
        const m = models.find(x => x.id === id);
        if (!m) return null;
        return (
          <span key={id} className="compare-chip">
            {brandsById[m.brand]?.name || m.brand} {m.model}
            <button onClick={() => onRemove(id)} title="Remove" aria-label={`Remove ${brandsById[m.brand]?.name || m.brand} ${m.model} from comparison`}>✕</button>
          </span>
        );
      })}
      <button className="compare-clear" onClick={onClear}>Clear</button>
      <button className="compare-go" onClick={onOpen} disabled={ids.length < 2}>Compare {ids.length} →</button>
    </div>
  );
}

function CompareModal({ ids, models, brandsById, weights, onClose }) {
  const surfaceRef = useDismissableSurface(onClose);
  const [diffOnly, setDiffOnly] = useState(false);
  const [copied, setCopied] = useState(false);
  if (!ids.length) return null;
  const items = ids.map(id => models.find(m => m.id === id)).filter(Boolean);
  const copyLink = () => {
    navigator.clipboard?.writeText(window.location.href).then(() => setCopied(true), () => {});
  };

  // Rows: dynamic based on what's present
  const allKeys = new Set();
  items.forEach(m => Object.keys(m).forEach(k => allKeys.add(k)));

  const rowDefs = [
    { label: 'Brand', get: m => brandsById[m.brand]?.name },
    { label: 'Tier', get: m => brandsById[m.brand]?.tier?.replace('-', ' ') },
    { label: 'Our score', get: m => computeScore(m, brandsById[m.brand], weights), best: 'high', fmt: v => v ?? '—' },
    { label: 'Confidence', get: m => getScoreConfidence(m, brandsById[m.brand]).tier, fmt: v => v || '—' },
    { label: 'Street price', get: m => m.street_price ?? m.msrp, best: 'low', fmt: fmtPrice },
    { label: 'MSRP', get: m => m.msrp, fmt: fmtPrice },
    { label: 'CR test score', get: m => crScore(m.ratings), best: 'high', fmt: v => crBand(v) ?? '—' },
    { label: 'CR reliability', get: m => m.ratings?.cr_reliability },
    { label: 'Yale service %', get: m => m.ratings?.yale_reliability_pct ?? brandsById[m.brand]?.service_rate_overall, best: 'low', fmt: fmtPct },
    { label: 'Wirecutter', get: m => m.ratings?.wirecutter, condFn: m => m.ratings?.wirecutter != null },
    { label: 'Reviewed.com', get: m => m.ratings?.reviewed, best: 'high', fmt: v => v?.toFixed(1) ?? '—' },
    { label: 'Rtings', get: m => m.ratings?.rtings, best: 'high', fmt: v => v != null ? v.toFixed(1) : '—', condFn: m => m.ratings?.rtings != null },
    { label: 'CNET', get: m => m.ratings?.cnet, best: 'high', fmt: v => v != null ? v.toFixed(1) : '—', condFn: m => m.ratings?.cnet != null },
    { label: 'Good Housekeeping', get: m => m.ratings?.good_housekeeping, fmt: v => v == null ? '—' : (typeof v === 'number' ? v.toFixed(1) : v), condFn: m => m.ratings?.good_housekeeping != null },
    { label: 'Owner reviews (avg)', get: m => aggregateRetailerStars(m.ratings), best: 'high', fmt: v => v != null ? v.toFixed(1) + '★' : '—', condFn: m => aggregateRetailerStars(m.ratings) != null },
    { label: 'Capacity', get: m => m.capacity_cf, best: 'high', fmt: fmtCapacity, condIf: 'capacity_cf' },
    { label: 'Oven capacity', get: m => m.oven_capacity_cf, best: 'high', fmt: fmtCapacity, condIf: 'oven_capacity_cf' },
    { label: 'Width', get: m => m.width_in, fmt: v => v ? v + '"' : '—' },
    { label: 'Height', get: m => m.height_in, fmt: fmtInches, condIf: 'height_in' },
    { label: 'Depth (with handle)', get: m => m.depth_with_handle_in ?? m.depth_in, fmt: fmtInches, condIf: 'depth_in' },
    { label: 'Style / Type', get: m => (m.style || m.type || '—').replace(/_/g, ' ') },
    { label: 'Fuel', get: m => m.fuel, condIf: 'fuel' },
    { label: 'Decibels', get: m => m.decibels ?? m.noise_db, best: 'low', fmt: fmtDb },
    { label: 'Energy', get: m => m.energy_kwh_yr, best: 'low', fmt: fmtKwh },
    { label: '3rd rack', get: m => m.third_rack, condIf: 'third_rack' },
    { label: 'Convection', get: m => m.convection, condIf: 'convection' },
    { label: 'Air fry', get: m => m.air_fry === true ? 'Yes' : m.air_fry === false ? 'No' : '—', condIf: 'air_fry' },
    { label: 'Self-clean', get: m => m.self_clean, condIf: 'self_clean' },
    { label: 'Wi-Fi', get: m => m.wifi === true ? 'Yes' : m.wifi === false ? 'No' : '—' },
    { label: 'Panel-ready', get: m => m.panel_ready ? 'Yes' : '—' },
    { label: 'Energy Star', get: m => m.energy_star === true ? 'Yes' : '—' },
    { label: 'Released', get: m => m.release_year },
  ].filter(r => {
    if (r.condFn) return items.some(r.condFn);
    if (r.condIf) return items.some(m => m[r.condIf] != null);
    return true;
  }).filter(r => {
    if (!diffOnly) return true;
    const shown = items.map(m => { const v = r.get(m); return r.fmt ? String(r.fmt(v)) : String(v ?? '—'); });
    return new Set(shown).size > 1;
  });

  return (
    <div className="compare-modal-overlay" onClick={onClose}>
      <div className="compare-modal" ref={surfaceRef} role="dialog" aria-modal="true" aria-label="Side-by-side comparison" onClick={e => e.stopPropagation()}>
        <div className="compare-modal-header">
          <h2>Side-by-side comparison</h2>
          <div className="compare-actions">
            <label className="compare-diff">
              <input type="checkbox" checked={diffOnly} onChange={e => setDiffOnly(e.target.checked)} />
              Differences only
            </label>
            <button type="button" className="compare-action" onClick={copyLink}>{copied ? 'Link copied' : 'Copy link'}</button>
            <button type="button" className="compare-action" onClick={() => window.print()}>Print</button>
          </div>
          <button className="drawer-close" onClick={onClose} aria-label="Close comparison">✕</button>
        </div>
        <div style={{overflowX: 'auto'}}>
          <table className="compare-table">
            <thead>
              <tr>
                <th scope="col"><span className="sr-only">Specification</span></th>
                {items.map(m => (
                  <th key={m.id} scope="col">
                    <ProductImage model={m} brand={brandsById[m.brand]} size="compare" />
                    {m.name}
                    <span className="sub">{m.model}</span>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rowDefs.map(row => {
                const vals = items.map(row.get);
                const numVals = vals.filter(v => typeof v === 'number');
                let bestVal = null;
                if (row.best && numVals.length > 1) {
                  bestVal = row.best === 'high' ? Math.max(...numVals) : Math.min(...numVals);
                }
                return (
                  <tr key={row.label}>
                    <th scope="row">{row.label}</th>
                    {items.map((m, i) => {
                      const v = vals[i];
                      const isBest = bestVal != null && v === bestVal;
                      return (
                        <td key={m.id} className={isBest ? 'best' : ''}>
                          {row.fmt ? row.fmt(v) : (v ?? '—')}
                          {isBest && <span className="sr-only"> (best)</span>}
                        </td>
                      );
                    })}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

export { ApplianceTable, Drawer, CompareBar, CompareModal };
