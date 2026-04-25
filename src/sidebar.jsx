// Sidebar — filters
// useState is not actually used here; sidebar is fully controlled by parent state.

function Sidebar({ category, models, brands, filters, setFilters }) {
  const setF = (k, v) => setFilters({ ...filters, [k]: v });
  const toggle = (k, val) => {
    const cur = filters[k] || [];
    setF(k, cur.includes(val) ? cur.filter(x => x !== val) : [...cur, val]);
  };

  // Brand counts
  const brandCounts = {};
  models.forEach(m => { brandCounts[m.brand] = (brandCounts[m.brand] || 0) + 1; });
  const visibleBrands = brands.filter(b => brandCounts[b.id]);

  // Category-specific facets
  const styles = {};
  const fuels = {};
  const depths = {};
  const types = {};
  models.forEach(m => {
    if (m.style) styles[m.style] = (styles[m.style] || 0) + 1;
    if (m.fuel) fuels[m.fuel] = (fuels[m.fuel] || 0) + 1;
    if (m.depth) depths[m.depth] = (depths[m.depth] || 0) + 1;
    if (m.type) types[m.type] = (types[m.type] || 0) + 1;
  });

  const tierOrder = ["budget", "mainstream", "premium", "ultra-premium"];
  const reliOrder = ["excellent", "very-good", "good", "fair", "poor"];

  // Active-count badge for a filter group heading. Scalar truthy filters
  // (energyStar, wifi, panelReady) count as 1; array filters show length.
  const filterCount = (key) => {
    const v = filters[key];
    if (Array.isArray(v)) return v.length;
    return v ? 1 : 0;
  };
  const GroupHeading = ({ children, keys }) => {
    const n = (Array.isArray(keys) ? keys : [keys]).reduce((s, k) => s + filterCount(k), 0);
    return <h3>{children}{n > 0 && <span className="filter-count">{n}</span>}</h3>;
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

  return (
    <aside className="sidebar">
      <div className="filter-group">
        <GroupHeading keys={['priceMin', 'priceMax']}>Price (street)</GroupHeading>
        <div className="range-group">
          <div className="range-row">
            <input type="number" placeholder="Min" value={filters.priceMin || ''} onChange={e => setF('priceMin', e.target.value ? +e.target.value : null)} />
            <span>to</span>
            <input type="number" placeholder="Max" value={filters.priceMax || ''} onChange={e => setF('priceMax', e.target.value ? +e.target.value : null)} />
          </div>
        </div>
      </div>

      {category === 'refrigerators' && facetSection("Style", "style", styles)}
      {category === 'refrigerators' && facetSection("Depth", "depth", depths, ["standard", "counter", "built_in"])}
      {(category === 'ranges_ovens_cooktops') && facetSection("Type", "type", types)}
      {(category === 'ranges_ovens_cooktops') && facetSection("Fuel", "fuel", fuels, ["induction", "gas", "electric", "dual_fuel"])}

      <div className="filter-group">
        <GroupHeading keys="tier">Tier</GroupHeading>
        <div className="filter-list">
          {tierOrder.map(t => {
            const n = visibleBrands.filter(b => b.tier === t).reduce((s, b) => s + (brandCounts[b.id] || 0), 0);
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

      <div className="filter-group">
        <GroupHeading keys="reliability">Reliability</GroupHeading>
        <div className="filter-list">
          {reliOrder.map(r => {
            const n = models.filter(m => (m.ratings?.cr_reliability) === r).length;
            if (!n) return null;
            return (
              <label key={r} className="filter-item">
                <input type="checkbox" checked={(filters.reliability || []).includes(r)} onChange={() => toggle('reliability', r)} />
                <span style={{textTransform: 'capitalize'}}>{r.replace('-', ' ')}</span>
                <span className="count">{n}</span>
              </label>
            );
          })}
        </div>
      </div>

      <div className="filter-group">
        <GroupHeading keys="brand">Brand</GroupHeading>
        <div className="filter-list" style={{maxHeight: 280, overflowY: 'auto'}}>
          {visibleBrands.sort((a,b) => brandCounts[b.id] - brandCounts[a.id]).map(b => (
            <label key={b.id} className="filter-item">
              <input type="checkbox" checked={(filters.brand || []).includes(b.id)} onChange={() => toggle('brand', b.id)} />
              <span>{b.name}</span>
              <span className="count">{brandCounts[b.id]}</span>
            </label>
          ))}
        </div>
      </div>

      <div className="filter-group">
        <GroupHeading keys={['energyStar', 'wifi', 'panelReady']}>Features</GroupHeading>
        <div className="filter-list">
          <label className="filter-item">
            <input type="checkbox" checked={!!filters.energyStar} onChange={e => setF('energyStar', e.target.checked)} />
            <span>Energy Star</span>
          </label>
          <label className="filter-item">
            <input type="checkbox" checked={!!filters.wifi} onChange={e => setF('wifi', e.target.checked)} />
            <span>Wi-Fi / Smart</span>
          </label>
          <label className="filter-item">
            <input type="checkbox" checked={!!filters.panelReady} onChange={e => setF('panelReady', e.target.checked)} />
            <span>Panel-ready</span>
          </label>
        </div>
      </div>

      <button className="clear-filters" onClick={() => setFilters({})}>Clear all filters</button>
    </aside>
  );
}

export { Sidebar };
