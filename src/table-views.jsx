// Table, Drawer, Compare bar/modal
import { useEffect, useMemo, useRef } from 'react';
import {
  fmtPrice, fmtCapacity, fmtKwh, fmtDb, fmtPct, fmtStars, fmtCount,
  relClass, tierClass,
  computeScore, getScoreConfidence, getSourceDisagreement,
  getRatingSources, aggregateRetailerStars, totalRetailerReviewCount,
} from './helpers.jsx';

// Shared: closes a surface when Escape is pressed. Also moves focus into the
// surface on mount and restores it to the previously-focused element on unmount
// so keyboard users aren't dropped at the top of the page. onClose is tracked
// by ref so inline-callback callers don't re-bind the keydown on every render.
function useDismissableSurface(onClose) {
  const rootRef = useRef(null);
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;
  useEffect(() => {
    const prevFocus = document.activeElement;
    const onKey = (e) => { if (e.key === 'Escape') { e.stopPropagation(); onCloseRef.current(); } };
    window.addEventListener('keydown', onKey);
    const el = rootRef.current?.querySelector('button, [href], input, [tabindex]:not([tabindex="-1"])');
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
  const label = confidence
    ? (confidence.signals === 0
        ? (tier === 'limited' ? 'spec only' : 'no sources')
        : confidence.signals + ' src')
    : null;
  return (
    <span className={"score-bar conf-" + (tier || 'unknown')}>
      <span className="num">{value}</span>
      <span className="bar"><div style={{width: value + '%'}} /></span>
      {label && <span className="conf" title={`Confidence: ${tier}`}>{label}</span>}
      {disagreement?.contested && (
        <span className="contested" title={`Reviewers disagree by ${Math.round(disagreement.spread)} points across ${disagreement.sourceCount} sources`}>⚠</span>
      )}
    </span>
  );
}

function ApplianceTable({ category, models, brandsById, weights, sort, setSort, selected, toggleCompare, onOpen, onClearFilters }) {
  const sorted = useMemo(() => {
    const arr = [...models];
    arr.sort((a, b) => {
      const dir = sort.dir === 'asc' ? 1 : -1;
      let av, bv;
      if (sort.key === 'score') { av = computeScore(a, brandsById[a.brand], weights); bv = computeScore(b, brandsById[b.brand], weights); }
      else if (sort.key === 'name') { av = a.name; bv = b.name; }
      else if (sort.key === 'brand') { av = brandsById[a.brand]?.name || ''; bv = brandsById[b.brand]?.name || ''; }
      else if (sort.key === 'price') { av = a.street_price ?? a.msrp; bv = b.street_price ?? b.msrp; }
      else if (sort.key === 'capacity') { av = a.capacity_cf ?? a.oven_capacity_cf; bv = b.capacity_cf ?? b.oven_capacity_cf; }
      else if (sort.key === 'cr') { av = a.ratings?.cr_overall; bv = b.ratings?.cr_overall; }
      else if (sort.key === 'reliability') { av = a.ratings?.yale_reliability_pct; bv = b.ratings?.yale_reliability_pct; }
      else if (sort.key === 'energy') { av = a.energy_kwh_yr; bv = b.energy_kwh_yr; }
      else if (sort.key === 'db') { av = a.decibels ?? a.noise_db; bv = b.decibels ?? b.noise_db; }
      if (av == null && bv == null) return 0;
      if (av == null) return 1;
      if (bv == null) return -1;
      if (typeof av === 'string') return av.localeCompare(bv) * dir;
      return (av - bv) * dir;
    });
    return arr;
  }, [models, sort, weights, brandsById]);

  const sortHead = (key, label, tip) => {
    const isSorted = sort.key === key;
    const ariaSort = isSorted ? (sort.dir === 'asc' ? 'ascending' : 'descending') : 'none';
    const toggle = () => setSort({ key, dir: isSorted && sort.dir === 'desc' ? 'asc' : 'desc' });
    return (
      <th className={isSorted ? 'sorted ' + sort.dir : ''}
          aria-sort={ariaSort}
          tabIndex={0}
          role="columnheader"
          onClick={toggle}
          onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); toggle(); } }}>
        <span className="th-label">{label}</span>
        {tip && <span className="th-tip" role="tooltip">{tip}</span>}
      </th>
    );
  };

  // Static (non-sortable) header with the same tooltip affordance.
  const plainHead = (label, tip, props = {}) => (
    <th tabIndex={tip ? 0 : -1} {...props}>
      <span className="th-label">{label}</span>
      {tip && <span className="th-tip" role="tooltip">{tip}</span>}
    </th>
  );

  const TIPS = {
    score: 'Composite 0–100 weighted across quality, reliability, price, repairability, energy, and quietness. Adjust weights from the Tweaks panel. The small caption next to each score shows how many independent rating sources back it — "no sources" or "spec only" means the score is essentially a price/spec read.',
    model: 'Manufacturer name and SKU. Click any row for full specs.',
    brand: 'Manufacturer.',
    capacity: 'Total interior volume in cubic feet (fresh food + freezer).',
    db: 'Decibels at the normal cycle. Lower is quieter — under 44 dB is luxury territory.',
    typeFuel: 'Range / cooktop / wall oven, plus fuel type.',
    price: 'Typical street price. MSRP shown below in light grey if higher.',
    cr: 'Consumer Reports overall test score, 0–100. Blank when CR has not tested or the score is paywalled.',
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
            {plainHead('⊕', TIPS.compare, { className: 'compare-cell' })}
            {sortHead('score', 'Score', TIPS.score)}
            {sortHead('name', 'Model', TIPS.model)}
            {sortHead('brand', 'Brand', TIPS.brand)}
            {category === 'refrigerators' && sortHead('capacity', 'Capacity', TIPS.capacity)}
            {category === 'dishwashers' && sortHead('db', 'Quietness', TIPS.db)}
            {category === 'ranges_ovens_cooktops' && plainHead('Type / Fuel', TIPS.typeFuel)}
            {sortHead('price', 'Price', TIPS.price)}
            {sortHead('cr', 'CR', TIPS.cr)}
            {sortHead('reliability', 'Yale Svc%', TIPS.yale)}
            {(category !== 'ranges_ovens_cooktops') && sortHead('energy', 'Energy', TIPS.energy)}
            {plainHead('Tier', TIPS.tier)}
          </tr>
        </thead>
        <tbody>
          {sorted.length === 0 && (
            <tr>
              <td colSpan={category === 'ranges_ovens_cooktops' ? 9 : 10} className="empty">
                <div>No models match the current filters.</div>
                {onClearFilters && (
                  <button className="empty-clear" onClick={onClearFilters}>Clear all filters</button>
                )}
              </td>
            </tr>
          )}
          {sorted.map(m => {
            const b = brandsById[m.brand];
            const score = computeScore(m, b, weights);
            const confidence = getScoreConfidence(m, b);
            const disagreement = getSourceDisagreement(m);
            const isSel = selected.includes(m.id);
            return (
              <tr key={m.id} className={isSel ? 'selected' : ''}
                  tabIndex={0}
                  role="button"
                  aria-label={`Open details for ${m.name}`}
                  onClick={() => onOpen(m)}
                  onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onOpen(m); } }}>
                <td className="compare-cell" onClick={e => e.stopPropagation()}>
                  <input type="checkbox" checked={isSel} onChange={() => toggleCompare(m.id)} />
                </td>
                <td><ScoreBar value={score} confidence={confidence} disagreement={disagreement} /></td>
                <td>
                  <div className="cell-name">
                    <span className="name">{m.name}</span>
                    <span className="sub">{m.model}</span>
                  </div>
                </td>
                <td className="cell-brand">{b?.name || m.brand}</td>
                {category === 'refrigerators' && <td>{fmtCapacity(m.capacity_cf)}</td>}
                {category === 'dishwashers' && <td>{fmtDb(m.decibels)}</td>}
                {category === 'ranges_ovens_cooktops' && <td style={{textTransform: 'capitalize', fontSize: 12, color: 'var(--ink-2)'}}>{(m.type || '').replace('_',' ')}<br/><span style={{color: 'var(--ink-3)'}}>{m.fuel}</span></td>}
                <td className="cell-price">
                  {fmtPrice(m.street_price ?? m.msrp)}
                  {m.street_price && m.msrp && m.msrp > m.street_price && <span className="msrp">{fmtPrice(m.msrp)}</span>}
                </td>
                <td>{m.ratings?.cr_overall ?? '—'}</td>
                <td>{fmtPct(m.ratings?.yale_reliability_pct ?? b?.service_rate_overall)}</td>
                {(category !== 'ranges_ovens_cooktops') && <td>{fmtKwh(m.energy_kwh_yr)}</td>}
                <td>{b?.tier
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
  const confSubtitle = (() => {
    if (!score) return 'no data';
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
  if (model.style) specs.push(['Style', String(model.style).replace(/_/g, ' ')]);
  if (model.depth) specs.push(['Depth', String(model.depth).replace(/_/g, ' ')]);
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

  return (
    <>
      <div className="drawer-overlay" onClick={onClose}></div>
      <aside className="drawer" ref={surfaceRef} role="dialog" aria-modal="true" aria-label={`Details for ${model.name}`}>
        <div className="drawer-header">
          <div className="drawer-title-block">
            <h2 className="drawer-title">{model.name}</h2>
            <span className="drawer-model">{brand?.name} · {model.model}</span>
            <div className="drawer-pillrow">
              <span className={"pill " + tierClass(brand?.tier)}>{brand?.tier?.replace('-', ' ')}</span>
              {model.ratings?.cr_reliability && model.ratings.cr_reliability !== 'unrated' && (
                <span className={"pill " + relClass(model.ratings.cr_reliability)}>{model.ratings.cr_reliability.replace('-', ' ')}</span>
              )}
              {model.energy_star && <span className="pill rel-very-good">Energy Star</span>}
              {model.wifi && <span className="pill rel-good">Wi-Fi</span>}
              {model.panel_ready && <span className="pill rel-good">Panel-ready</span>}
              {model.garage_ready && <span className="pill rel-good" title="Manufacturer-rated for garage temperature range">Garage-rated</span>}
            </div>
          </div>
          <button className="drawer-close" onClick={onClose}>✕</button>
        </div>

        <div className="drawer-body">
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
                <div className={"val" + (model.ratings?.cr_overall == null ? " muted" : "")}>{model.ratings?.cr_overall ?? '—'}</div>
                <div className="src">overall test score</div>
              </div>
              <div className="score-card">
                <div className="lbl">Reviewed.com</div>
                <div className={"val" + (reviewed == null ? " muted" : "")}>{reviewed != null ? reviewed.toFixed(1) : '—'}</div>
                <div className="src">out of 10</div>
              </div>
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
                <div style={{color: 'var(--ink-3)'}}>MSRP {fmtPrice(model.msrp)} <span style={{color: 'var(--good)', fontWeight: 600}}>·  save ${model.msrp - model.street_price}</span></div>
              )}
            </div>
          </div>

          <div className="drawer-section">
            <h3>Specifications</h3>
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
  if (!ids.length) return null;
  const items = ids.map(id => models.find(m => m.id === id)).filter(Boolean);

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
    { label: 'CR overall', get: m => m.ratings?.cr_overall, best: 'high', fmt: v => v ?? '—' },
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
  });

  return (
    <div className="compare-modal-overlay" onClick={onClose}>
      <div className="compare-modal" ref={surfaceRef} role="dialog" aria-modal="true" aria-label="Side-by-side comparison" onClick={e => e.stopPropagation()}>
        <div className="compare-modal-header">
          <h2>Side-by-side comparison</h2>
          <button className="drawer-close" onClick={onClose}>✕</button>
        </div>
        <div style={{overflowX: 'auto'}}>
          <table className="compare-table">
            <thead>
              <tr>
                <th></th>
                {items.map(m => (
                  <th key={m.id}>
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
                    <th>{row.label}</th>
                    {items.map((m, i) => {
                      const v = vals[i];
                      const isBest = bestVal != null && v === bestVal;
                      return (
                        <td key={m.id} className={isBest ? 'best' : ''}>
                          {row.fmt ? row.fmt(v) : (v ?? '—')}
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
