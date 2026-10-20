// Sidebar — filters. Fully controlled by parent state. On phones it becomes a
// full-screen sheet opened from the toolbar's Filters button (`open`).

// Min/max (or max-only) number inputs for one numeric filter.
function RangeFilter({ label, unit, step, minKey, maxKey, filters, setF }) {
  const input = (key, which) => (
    <input type="number" step={step} aria-label={`${which === 'min' ? 'Minimum' : 'Maximum'} ${label}`}
      placeholder={minKey ? (which === 'min' ? 'Min' : 'Max') : unit}
      value={filters[key] ?? ''} onChange={e => setF(key, e.target.value ? +e.target.value : null)} />
  );
  const inverted = minKey && filters[minKey] != null && filters[maxKey] != null && filters[minKey] > filters[maxKey];
  return (
    <div className="range-group">
      <div className="range-row">
        {minKey ? <>{input(minKey, 'min')}<span>to</span></> : <span>&le;</span>}
        {input(maxKey, 'max')}
        {!minKey && unit && <span>{unit}</span>}
      </div>
      {inverted && <div className="range-hint">Min is greater than max — no models will match.</div>}
    </div>
  );
}

function Sidebar({ category, models, brands, filters, setFilters, collapsed, setCollapsed, onClearAll, open, onClose, resultCount }) {
  const setF = (k, v) => setFilters({ ...filters, [k]: v });
  const toggle = (k, val) => {
    const cur = filters[k] || [];
    setF(k, cur.includes(val) ? cur.filter(x => x !== val) : [...cur, val]);
  };
  const toggleCollapsed = (id) => setCollapsed({ ...collapsed, [id]: !collapsed[id] });

  // Single-pass aggregation across the unfiltered category. Row counts are
  // intentionally pre-filter — users want to see "French Door (42)" even
  // after narrowing by brand.
  const brandTier = {};
  brands.forEach(b => brandTier[b.id] = b.tier);

  const brandCounts = {};
  const tierCounts = {};
  const reliCounts = {};
  const styles = {};
  const fuels = {};
  const depths = {};
  const types = {};
  const tubs = {};
  const widths = {}; // numeric keys; filter values stored as numbers to match m.width_in
  let hasEnergyStar = false, hasWifi = false, hasPanelReady = false, hasAirFry = false;
  let hasNoiseDb = false, hasCapacity = false, hasHeight = false, hasDepth = false;
  models.forEach(m => {
    brandCounts[m.brand] = (brandCounts[m.brand] || 0) + 1;
    const t = brandTier[m.brand];
    if (t) tierCounts[t] = (tierCounts[t] || 0) + 1;
    const r = m.ratings?.cr_reliability;
    if (r) reliCounts[r] = (reliCounts[r] || 0) + 1;
    if (m.style) styles[m.style] = (styles[m.style] || 0) + 1;
    if (m.fuel) fuels[m.fuel] = (fuels[m.fuel] || 0) + 1;
    if (m.depth) depths[m.depth] = (depths[m.depth] || 0) + 1;
    if (m.type) types[m.type] = (types[m.type] || 0) + 1;
    if (m.tub) tubs[m.tub] = (tubs[m.tub] || 0) + 1;
    if (typeof m.width_in === 'number') widths[m.width_in] = (widths[m.width_in] || 0) + 1;
    if (m.energy_star === true) hasEnergyStar = true;
    if (m.wifi === true) hasWifi = true;
    if (m.panel_ready === true) hasPanelReady = true;
    if (m.air_fry === true) hasAirFry = true;
    if (typeof m.decibels === 'number' || typeof m.noise_db === 'number') hasNoiseDb = true;
    if (typeof m.capacity_cf === 'number' || typeof m.oven_capacity_cf === 'number') hasCapacity = true;
    if (typeof m.height_in === 'number') hasHeight = true;
    if (typeof m.depth_in === 'number' || typeof m.depth_with_handle_in === 'number') hasDepth = true;
  });
  const visibleBrands = brands.filter(b => brandCounts[b.id]);

  const tierOrder = ["budget", "mainstream", "premium", "ultra-premium"];
  const reliOrder = ["excellent", "very-good", "good", "fair", "poor"];

  // Active-count badge for a filter group heading. Uses != null so a literal
  // 0 (e.g. priceMin: 0) still counts as an active filter.
  const filterCount = (key) => {
    const v = filters[key];
    if (Array.isArray(v)) return v.length;
    if (typeof v === 'boolean') return v ? 1 : 0;
    return v != null && v !== '' ? 1 : 0;
  };

  // Collapsible group wrapper. `id` is the collapse-state key; `keys` is the
  // filter key(s) used to compute the active-count badge.
  const group = (id, label, keys, body) => {
    const n = (Array.isArray(keys) ? keys : [keys]).reduce((s, k) => s + filterCount(k), 0);
    const isOpen = !collapsed[id];
    return (
      <div key={id} className={"filter-group" + (isOpen ? '' : ' is-collapsed')}>
        <button
          type="button"
          className="filter-group-toggle"
          aria-expanded={isOpen}
          aria-controls={`filter-body-${id}`}
          onClick={() => toggleCollapsed(id)}
        >
          <span className="filter-group-label">{label}</span>
          {n > 0 && <span className="filter-count">{n}</span>}
          <span className="filter-group-chevron" aria-hidden="true" />
        </button>
        {isOpen && <div id={`filter-body-${id}`} className="filter-group-body">{body}</div>}
      </div>
    );
  };

  // Width facet — numeric values, sorted ascending, formatted as `30"`.
  // Kept separate from facetGroup so filter values stay as numbers (matching m.width_in).
  const widthGroup = () => {
    const entries = Object.keys(widths)
      .map(k => [Number(k), widths[k]])
      .sort((a, b) => a[0] - b[0]);
    // A single-option facet offers no narrowing — hide it.
    if (entries.length < 2) return null;
    return group('width', 'Width', 'width', (
      <div className="filter-list">
        {entries.map(([val, n]) => (
          <label key={val} className="filter-item">
            <input type="checkbox" checked={(filters.width || []).includes(val)} onChange={() => toggle('width', val)} />
            <span>{val}&Prime;</span>
            <span className="count">{n}</span>
          </label>
        ))}
      </div>
    ));
  };

  const facetGroup = (id, label, key, dict, order) => {
    const entries = order
      ? order.filter(k => dict[k]).map(k => [k, dict[k]])
      : Object.entries(dict).sort((a,b) => b[1] - a[1]);
    // A single-option facet offers no narrowing — hide it.
    if (entries.length < 2) return null;
    return group(id, label, key, (
      <div className="filter-list">
        {entries.map(([val, n]) => (
          <label key={val} className="filter-item">
            <input type="checkbox" checked={(filters[key] || []).includes(val)} onChange={() => toggle(key, val)} />
            <span style={{textTransform: 'capitalize'}}>{val.replace(/[_-]/g, ' ')}</span>
            <span className="count">{n}</span>
          </label>
        ))}
      </div>
    ));
  };

  const featureRow = (key, label) => (
    <label key={key} className="filter-item">
      <input type="checkbox" checked={!!filters[key]} onChange={e => setF(key, e.target.checked)} />
      <span>{label}</span>
    </label>
  );

  const reliVisible = reliOrder.filter(r => reliCounts[r]);
  const featureRows = [];
  if (hasEnergyStar) featureRows.push(featureRow('energyStar', 'Energy Star'));
  if (hasWifi) featureRows.push(featureRow('wifi', 'Wi-Fi / Smart'));
  if (hasPanelReady) featureRows.push(featureRow('panelReady', 'Panel-ready'));
  if (hasAirFry) featureRows.push(featureRow('airFry', 'Air fry'));
  if (models.some(m => m.availability === 'discontinued')) featureRows.push(featureRow('inProduction', 'Hide discontinued'));

  const range = (props) => <RangeFilter {...props} filters={filters} setF={setF} />;

  return (
    <aside className={"sidebar" + (open ? ' is-open' : '')} aria-label="Filters">
      <div className="sidebar-sheet-head">
        <span>Filters</span>
        <button type="button" className="drawer-close" onClick={onClose} aria-label="Close filters">✕</button>
      </div>
      {group('price', 'Price (street)', ['priceMin', 'priceMax'],
        range({ label: 'price (street), dollars', minKey: 'priceMin', maxKey: 'priceMax' }))}

      {category === 'refrigerators' && facetGroup('style', "Style", "style", styles)}
      {category === 'refrigerators' && facetGroup('depth', "Depth", "depth", depths, ["standard", "counter", "built_in"])}
      {category === 'ranges_ovens_cooktops' && facetGroup('type', "Type", "type", types)}
      {category === 'ranges_ovens_cooktops' && facetGroup('style', "Style", "style", styles)}
      {category === 'ranges_ovens_cooktops' && facetGroup('fuel', "Fuel", "fuel", fuels, ["induction", "gas", "electric", "dual_fuel"])}
      {category === 'dishwashers' && facetGroup('tub', "Tub", "tub", tubs, ["stainless", "plastic"])}
      {hasCapacity && group('capacity', 'Capacity (cu ft)', ['capacityMin', 'capacityMax'],
        range({ label: 'capacity, cubic feet', step: 0.1, minKey: 'capacityMin', maxKey: 'capacityMax' }))}
      {hasNoiseDb && group('noise', 'Quietness', 'dbMax',
        range({ label: 'noise level, decibels', unit: 'dB', maxKey: 'dbMax' }))}
      {category !== 'dishwashers' && widthGroup()}
      {hasHeight && group('height', 'Height (in)', ['heightMin', 'heightMax'],
        range({ label: 'height, inches', step: 0.1, minKey: 'heightMin', maxKey: 'heightMax' }))}
      {hasDepth && group('depthMax', 'Max depth (in)', 'depthMax', (
        <>
          {range({ label: 'depth, inches', unit: 'in', step: 0.1, maxKey: 'depthMax' })}
          <div className="range-note">Includes the handle when the spec sheet lists it. Hides models with no depth data.</div>
        </>
      ))}

      {group('tier', 'Tier', 'tier', (
        <div className="filter-list">
          {tierOrder.map(t => {
            const n = tierCounts[t] || 0;
            if (!n) return null;
            return (
              <label key={t} className="filter-item">
                <input type="checkbox" checked={(filters.tier || []).includes(t)} onChange={() => toggle('tier', t)} />
                <span style={{textTransform: 'capitalize'}}>{t.replace('-', ' ')}</span>
                <span className="count">{n}</span>
              </label>
            );
          })}
        </div>
      ))}

      {reliVisible.length > 0 && group('reliability', 'Reliability', 'reliability', (
        <div className="filter-list">
          {reliVisible.map(r => (
            <label key={r} className="filter-item">
              <input type="checkbox" checked={(filters.reliability || []).includes(r)} onChange={() => toggle('reliability', r)} />
              <span style={{textTransform: 'capitalize'}}>{r.replace('-', ' ')}</span>
              <span className="count">{reliCounts[r]}</span>
            </label>
          ))}
        </div>
      ))}

      {group('brand', 'Brand', 'brand', (
        <div className="filter-list" style={{maxHeight: 280, overflowY: 'auto'}}>
          {[...visibleBrands].sort((a,b) => brandCounts[b.id] - brandCounts[a.id]).map(b => (
            <label key={b.id} className="filter-item">
              <input type="checkbox" checked={(filters.brand || []).includes(b.id)} onChange={() => toggle('brand', b.id)} />
              <span>{b.name}</span>
              <span className="count">{brandCounts[b.id]}</span>
            </label>
          ))}
        </div>
      ))}

      {featureRows.length > 0 && group('features', 'Features', ['energyStar', 'wifi', 'panelReady', 'airFry', 'inProduction'], (
        <div className="filter-list">{featureRows}</div>
      ))}

      <button className="clear-filters" onClick={onClearAll || (() => setFilters({}))}>Clear all filters</button>
      <div className="sidebar-sheet-foot">
        <button type="button" className="btn-primary" onClick={onClose}>Show {resultCount} result{resultCount === 1 ? '' : 's'}</button>
      </div>
    </aside>
  );
}

export { Sidebar };
