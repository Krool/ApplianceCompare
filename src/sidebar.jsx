// Sidebar — filters. Fully controlled by parent state.

function Sidebar({ category, models, brands, filters, setFilters, onClearAll }) {
  const setF = (k, v) => setFilters({ ...filters, [k]: v });
  const toggle = (k, val) => {
    const cur = filters[k] || [];
    setF(k, cur.includes(val) ? cur.filter(x => x !== val) : [...cur, val]);
  };

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
  const GroupHeading = ({ children, keys }) => {
    const n = (Array.isArray(keys) ? keys : [keys]).reduce((s, k) => s + filterCount(k), 0);
    return <h3>{children}{n > 0 && <span className="filter-count">{n}</span>}</h3>;
  };

  // Width facet — numeric values, sorted ascending, formatted as `30"`.
  // Kept separate from facetSection so filter values stay as numbers (matching m.width_in).
  const widthSection = () => {
    const entries = Object.keys(widths)
      .map(k => [Number(k), widths[k]])
      .sort((a, b) => a[0] - b[0]);
    if (!entries.length) return null;
    return (
      <div className="filter-group">
        <GroupHeading keys="width">Width</GroupHeading>
        <div className="filter-list">
          {entries.map(([val, n]) => (
            <label key={val} className="filter-item">
              <input type="checkbox" checked={(filters.width || []).includes(val)} onChange={() => toggle('width', val)} />
              <span>{val}&Prime;</span>
              <span className="count">{n}</span>
            </label>
          ))}
        </div>
      </div>
    );
  };

  const facetSection = (label, key, dict, order) => {
    const entries = order
      ? order.filter(k => dict[k]).map(k => [k, dict[k]])
      : Object.entries(dict).sort((a,b) => b[1] - a[1]);
    if (!entries.length) return null;
    return (
      <div className="filter-group">
        <GroupHeading keys={key}>{label}</GroupHeading>
        <div className="filter-list">
          {entries.map(([val, n]) => (
            <label key={val} className="filter-item">
              <input type="checkbox" checked={(filters[key] || []).includes(val)} onChange={() => toggle(key, val)} />
              <span style={{textTransform: 'capitalize'}}>{val.replace(/[_-]/g, ' ')}</span>
              <span className="count">{n}</span>
            </label>
          ))}
        </div>
      </div>
    );
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

  // Inline hint when min > max so the user understands why results vanished.
  const priceMin = filters.priceMin;
  const priceMax = filters.priceMax;
  const priceInverted = priceMin != null && priceMax != null && priceMin > priceMax;

  return (
    <aside className="sidebar">
      <div className="filter-group">
        <GroupHeading keys={['priceMin', 'priceMax']}>Price (street)</GroupHeading>
        <div className="range-group">
          <div className="range-row">
            <input type="number" placeholder="Min" value={filters.priceMin ?? ''} onChange={e => setF('priceMin', e.target.value ? +e.target.value : null)} />
            <span>to</span>
            <input type="number" placeholder="Max" value={filters.priceMax ?? ''} onChange={e => setF('priceMax', e.target.value ? +e.target.value : null)} />
          </div>
          {priceInverted && <div className="range-hint">Min is greater than max — no models will match.</div>}
        </div>
      </div>

      {category === 'refrigerators' && facetSection("Style", "style", styles)}
      {category === 'refrigerators' && facetSection("Depth", "depth", depths, ["standard", "counter", "built_in"])}
      {category === 'ranges_ovens_cooktops' && facetSection("Type", "type", types)}
      {category === 'ranges_ovens_cooktops' && facetSection("Style", "style", styles)}
      {category === 'ranges_ovens_cooktops' && facetSection("Fuel", "fuel", fuels, ["induction", "gas", "electric", "dual_fuel"])}
      {category === 'dishwashers' && facetSection("Tub", "tub", tubs, ["stainless", "plastic"])}
      {category === 'dishwashers' && (
        <div className="filter-group">
          <GroupHeading keys="dbMax">Quietness</GroupHeading>
          <div className="range-group">
            <div className="range-row">
              <span>&le;</span>
              <input type="number" placeholder="dB" value={filters.dbMax ?? ''} onChange={e => setF('dbMax', e.target.value ? +e.target.value : null)} />
              <span>dB</span>
            </div>
          </div>
        </div>
      )}
      {category !== 'dishwashers' && widthSection()}

      <div className="filter-group">
        <GroupHeading keys="tier">Tier</GroupHeading>
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
      </div>

      {reliVisible.length > 0 && (
        <div className="filter-group">
          <GroupHeading keys="reliability">Reliability</GroupHeading>
          <div className="filter-list">
            {reliVisible.map(r => (
              <label key={r} className="filter-item">
                <input type="checkbox" checked={(filters.reliability || []).includes(r)} onChange={() => toggle('reliability', r)} />
                <span style={{textTransform: 'capitalize'}}>{r.replace('-', ' ')}</span>
                <span className="count">{reliCounts[r]}</span>
              </label>
            ))}
          </div>
        </div>
      )}

      <div className="filter-group">
        <GroupHeading keys="brand">Brand</GroupHeading>
        <div className="filter-list" style={{maxHeight: 280, overflowY: 'auto'}}>
          {[...visibleBrands].sort((a,b) => brandCounts[b.id] - brandCounts[a.id]).map(b => (
            <label key={b.id} className="filter-item">
              <input type="checkbox" checked={(filters.brand || []).includes(b.id)} onChange={() => toggle('brand', b.id)} />
              <span>{b.name}</span>
              <span className="count">{brandCounts[b.id]}</span>
            </label>
          ))}
        </div>
      </div>

      {featureRows.length > 0 && (
        <div className="filter-group">
          <GroupHeading keys={['energyStar', 'wifi', 'panelReady', 'airFry']}>Features</GroupHeading>
          <div className="filter-list">{featureRows}</div>
        </div>
      )}

      <button className="clear-filters" onClick={onClearAll || (() => setFilters({}))}>Clear all filters</button>
    </aside>
  );
}

export { Sidebar };
