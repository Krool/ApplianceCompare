// Main app — Kitchen Appliance Compare
import { useState, useEffect, useMemo, useRef } from 'react';
import { Sidebar } from './sidebar.jsx';
import { ApplianceTable, Drawer, CompareBar, CompareModal } from './table-views.jsx';
import { GuidePage } from './guide-page.jsx';
import { RankBy, WEIGHT_AXES } from './rank-by.jsx';
import { getScoreConfidence, isRetired, searchKey } from './helpers.jsx';
import {
  useTweaks, TweaksPanel, TweakSection, TweakSlider, TweakRadio, TweakToggle,
} from './tweaks-panel.jsx';

// Persisted state — filters/search/collapsed-groups survive reload via
// localStorage and ride along in the URL hash so links are shareable. URL
// wins over localStorage on initial load when the hash has any data params.
// The open model, compare set, sort and score weights are URL-only, so a
// shared link reproduces exactly what the sender saw.
const LS_KEY = 'cc:state:v1';
const TABS = new Set(['refrigerators', 'dishwashers', 'ranges_ovens_cooktops', 'guide']);
const DEFAULT_TAB = 'refrigerators';
const DEFAULT_SORT = { key: 'score', dir: 'desc' };

// Filter keys we serialize. Type drives encode/decode.
const FILTER_SCHEMA = {
  brand: 'array', tier: 'array', style: 'array', depth: 'array',
  fuel: 'array', type: 'array', tub: 'array', reliability: 'array',
  width: 'array-num',
  priceMin: 'num', priceMax: 'num',
  dbMax: 'num', capacityMin: 'num', capacityMax: 'num',
  heightMin: 'num', heightMax: 'num', depthMax: 'num',
  energyStar: 'bool', wifi: 'bool', panelReady: 'bool', airFry: 'bool',
  inProduction: 'bool', retired: 'bool',
  location: 'str',
};

function encodeFiltersInto(params, filters) {
  for (const [k, type] of Object.entries(FILTER_SCHEMA)) {
    const v = filters[k];
    if (v == null || v === '' || (Array.isArray(v) && v.length === 0) || v === false) continue;
    if (type === 'array' || type === 'array-num') params.set(k, v.join(','));
    else if (type === 'bool') params.set(k, '1');
    else params.set(k, String(v));
  }
}

function decodeFilters(params) {
  const f = {};
  for (const [k, type] of Object.entries(FILTER_SCHEMA)) {
    const v = params.get(k);
    if (v == null) continue;
    if (type === 'array') f[k] = v.split(',').filter(Boolean);
    else if (type === 'array-num') f[k] = v.split(',').map(Number).filter(n => !Number.isNaN(n));
    else if (type === 'num') { const n = Number(v); if (!Number.isNaN(n)) f[k] = n; }
    else if (type === 'bool') { if (v === '1') f[k] = true; }
    else f[k] = v;
  }
  return f;
}

// Weights travel as `w=30,30,15,5,5,5,10` in WEIGHT_AXES order.
const encodeWeights = (w) => WEIGHT_AXES.map(([k]) => w[k] ?? 0).join(',');
function decodeWeights(s) {
  if (!s) return null;
  const nums = s.split(',').map(Number);
  if (nums.length !== WEIGHT_AXES.length || nums.some(n => Number.isNaN(n) || n < 0)) return null;
  return Object.fromEntries(WEIGHT_AXES.map(([k], i) => [k, nums[i]]));
}

function readUrlState() {
  const raw = window.location.hash.replace(/^#/, '');
  if (!raw) return null;
  const p = new URLSearchParams(raw);
  const tab = p.get('tab');
  const c = p.get('c');
  const s = (p.get('s') || '').split(':');
  return {
    tab: TABS.has(tab) ? tab : null,
    search: p.get('q') || '',
    // null collapsed means "URL didn't say" — fall back to stored
    collapsed: c != null
      ? Object.fromEntries(c.split(',').filter(Boolean).map(k => [k, true]))
      : null,
    filters: decodeFilters(p),
    openId: p.get('m') || null,
    compareIds: (p.get('cmp') || '').split(',').filter(Boolean).slice(0, 4),
    sort: s[0] ? { key: s[0], dir: s[1] === 'asc' ? 'asc' : 'desc' } : null,
    weights: decodeWeights(p.get('w')),
  };
}

function buildHash({ tab, filters, search, collapsed, openId, compareIds, sort, weights, defaultWeights }) {
  const p = new URLSearchParams();
  if (tab && tab !== DEFAULT_TAB) p.set('tab', tab);
  if (tab !== 'guide') {
    encodeFiltersInto(p, filters);
    if (search) p.set('q', search);
    if (sort.key !== DEFAULT_SORT.key || sort.dir !== DEFAULT_SORT.dir) p.set('s', sort.key + ':' + sort.dir);
    if (compareIds.length) p.set('cmp', compareIds.join(','));
    if (openId) p.set('m', openId);
  }
  const w = encodeWeights(weights);
  if (w !== encodeWeights(defaultWeights)) p.set('w', w);
  const ck = Object.keys(collapsed).filter(k => collapsed[k]);
  if (ck.length) p.set('c', ck.join(','));
  const str = p.toString();
  return str ? '#' + str : '';
}

// Filter edits replace the history entry; switching tabs or opening a model
// pushes one, so Back closes the drawer or returns to the previous tab
// instead of leaving the site.
function writeUrl(hash, push) {
  if (window.location.hash === hash) return;
  const newUrl = window.location.pathname + window.location.search + hash;
  window.history[push ? 'pushState' : 'replaceState'](null, '', newUrl || window.location.pathname);
}

function loadStorage() {
  try { return JSON.parse(localStorage.getItem(LS_KEY)) || {}; }
  catch { return {}; }
}
function saveStorage(state) {
  try { localStorage.setItem(LS_KEY, JSON.stringify(state)); } catch {}
}

const TWEAK_DEFAULTS = /*EDITMODE-BEGIN*/{
  "weight_quality": 30,
  "weight_reliability": 15,
  "weight_price": 5,
  "weight_repairability": 5,
  "weight_energy": 5,
  "weight_quiet": 10,
  "weight_endorsements": 30,
  "density": "comfortable",
  "hideThinConfidence": false
}/*EDITMODE-END*/;

const weightsFromTweaks = (t) => Object.fromEntries(WEIGHT_AXES.map(([k]) => [k, t['weight_' + k]]));
const tweaksFromWeights = (w) => Object.fromEntries(WEIGHT_AXES.map(([k]) => ['weight_' + k, w[k]]));

const CATEGORY_LABELS = {
  refrigerators: 'Refrigerators',
  dishwashers: 'Dishwashers',
  ranges_ovens_cooktops: 'Ranges & Ovens',
};

// Mobile sort menu: the column headers are small tap targets on a phone.
const SORT_OPTIONS = {
  common: [['score:desc', 'Score (high to low)'], ['price:asc', 'Price (low to high)'], ['price:desc', 'Price (high to low)'], ['reliability:asc', 'Yale service rate (low first)']],
  refrigerators: [['capacity:desc', 'Capacity (largest)'], ['energy:asc', 'Energy (lowest)']],
  dishwashers: [['db:asc', 'Quietest'], ['energy:asc', 'Energy (lowest)']],
  ranges_ovens_cooktops: [],
};

function App({ data }) {
  // Hydrate from URL hash first, then localStorage. Computed once.
  const initialState = useMemo(() => {
    const url = readUrlState();
    const stored = loadStorage();
    let tab;
    if (url?.tab) tab = url.tab;
    else if (stored.tab && TABS.has(stored.tab)) tab = stored.tab;
    else tab = DEFAULT_TAB;
    const sd = (stored.byCategory && stored.byCategory[tab]) || {};
    const urlHasData = url && (Object.keys(url.filters).length > 0 || url.search);
    return {
      tab,
      filters: urlHasData ? url.filters : (sd.filters || {}),
      search: urlHasData ? url.search : (sd.search || ''),
      // Collapsed state is global (not per-category) — same group stays
      // collapsed when you switch tabs. URL `c` overrides stored.
      collapsed: url?.collapsed != null ? url.collapsed : (stored.collapsed || {}),
      openId: url?.openId || null,
      compareIds: url?.compareIds || [],
      sort: url?.sort || DEFAULT_SORT,
      weights: url?.weights || stored.weights || null,
    };
  }, []);

  const defaultWeights = weightsFromTweaks(TWEAK_DEFAULTS);
  const [tab, setTab] = useState(initialState.tab); // refrigerators | dishwashers | ranges_ovens_cooktops | guide
  const [filters, setFilters] = useState(initialState.filters);
  const [sort, setSort] = useState(initialState.sort);
  const [search, setSearch] = useState(initialState.search);
  const [collapsed, setCollapsed] = useState(initialState.collapsed);
  const [openId, setOpenId] = useState(initialState.openId);
  // Compare sets are per category: a fridge never sits next to a dishwasher.
  const [compareByCat, setCompareByCat] = useState(
    initialState.compareIds.length ? { [initialState.tab]: initialState.compareIds } : {}
  );
  const [compareOpen, setCompareOpen] = useState(false);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [tweaks, setTweaks] = useTweaks(
    initialState.weights ? { ...TWEAK_DEFAULTS, ...tweaksFromWeights(initialState.weights) } : TWEAK_DEFAULTS
  );

  const weights = useMemo(() => weightsFromTweaks(tweaks), [tweaks]);
  const setWeights = (w) => setTweaks(tweaksFromWeights(w));

  const isGuide = tab === 'guide';
  const category = isGuide ? 'refrigerators' : tab;
  const compareIds = compareByCat[category] || [];
  const setCompareIds = (fn) => setCompareByCat(c => ({ ...c, [category]: fn(c[category] || []) }));

  const allModels = useMemo(() => {
    const cat = data.categories[category];
    return cat ? cat.models : [];
  }, [data, category]);

  const retiredCount = useMemo(() => allModels.filter(isRetired).length, [allModels]);

  const brandsById = useMemo(() => {
    const m = {};
    data.brands.forEach(b => m[b.id] = b);
    return m;
  }, [data.brands]);

  // Apply filters
  const filteredModels = useMemo(() => {
    const q = searchKey(search);
    return allModels.filter(m => {
      const b = brandsById[m.brand];
      // Retired models stay in the data so deep links work, but are hidden
      // from the list unless the reader asks for them.
      if (!filters.retired && isRetired(m)) return false;
      if (filters.brand?.length && !filters.brand.includes(m.brand)) return false;
      if (filters.tier?.length && !filters.tier.includes(b?.tier)) return false;
      if (filters.style?.length && !filters.style.includes(m.style)) return false;
      if (filters.depth?.length && !filters.depth.includes(m.depth)) return false;
      if (filters.width?.length && !filters.width.includes(m.width_in)) return false;
      if (filters.fuel?.length && !filters.fuel.includes(m.fuel)) return false;
      if (filters.type?.length && !filters.type.includes(m.type)) return false;
      if (filters.reliability?.length && !filters.reliability.includes(m.ratings?.cr_reliability)) return false;
      if (filters.tub?.length && !filters.tub.includes(m.tub)) return false;
      if (filters.energyStar && !m.energy_star) return false;
      if (filters.wifi && !m.wifi) return false;
      if (filters.panelReady && !m.panel_ready) return false;
      if (filters.airFry && !m.air_fry) return false;
      if (filters.inProduction && m.availability === 'discontinued') return false;
      // Kitchen excludes models explicitly rated for garage use — those have
      // a wider ambient temp range that trades efficiency / temp stability for
      // outdoor tolerance, so they're not the right pick for an indoor kitchen.
      // Models with garage_ready null/false stay in (unverified ≠ garage-only).
      if (filters.location === 'garage') {
        if (!m.garage_ready) return false;
      } else if (m.garage_ready === true) {
        return false;
      }
      const price = m.street_price ?? m.msrp;
      if (filters.priceMin != null && price < filters.priceMin) return false;
      if (filters.priceMax != null && price > filters.priceMax) return false;
      if (filters.dbMax != null) {
        const db = m.decibels ?? m.noise_db;
        // Strict: a quietness threshold should hide models with no dB data,
        // since we can't verify they meet it.
        if (db == null || db > filters.dbMax) return false;
      }
      if (filters.capacityMin != null || filters.capacityMax != null) {
        const cap = m.capacity_cf ?? m.oven_capacity_cf;
        if (cap == null) return false;
        if (filters.capacityMin != null && cap < filters.capacityMin) return false;
        if (filters.capacityMax != null && cap > filters.capacityMax) return false;
      }
      if (filters.heightMin != null || filters.heightMax != null) {
        // Strict: a height threshold should hide models with no height_in data,
        // since we can't verify they fit.
        const h = m.height_in;
        if (h == null) return false;
        if (filters.heightMin != null && h < filters.heightMin) return false;
        if (filters.heightMax != null && h > filters.heightMax) return false;
      }
      if (filters.depthMax != null) {
        // Strict, and handle-inclusive when known: that's what has to clear
        // the counter edge or the cabinet opening.
        const d = m.depth_with_handle_in ?? m.depth_in;
        if (d == null || d > filters.depthMax) return false;
      }
      if (q && !searchKey(m.name + ' ' + m.model + ' ' + (b?.name || '')).includes(q)) return false;
      if (tweaks.hideThinConfidence && getScoreConfidence(m, b).tier === 'thin') return false;
      return true;
    });
  }, [allModels, filters, brandsById, search, tweaks.hideThinConfidence]);

  // On tab switch (not initial mount, not Back/Forward), load that category's
  // saved filters/search. Sort keys are category-specific so always reset sort.
  const prevTabRef = useRef(initialState.tab);
  const fromHistoryRef = useRef(false);
  useEffect(() => {
    if (prevTabRef.current === tab) return;
    prevTabRef.current = tab;
    setFiltersOpen(false);
    if (fromHistoryRef.current) { fromHistoryRef.current = false; return; }
    setSort(DEFAULT_SORT);
    setOpenId(null);
    if (tab === 'guide') return;
    const stored = loadStorage();
    const sd = (stored.byCategory && stored.byCategory[tab]) || {};
    setFilters(sd.filters || {});
    setSearch(sd.search || '');
  }, [tab]);

  // Back/Forward: restore everything the hash carries.
  useEffect(() => {
    const onPop = () => {
      const url = readUrlState() || {};
      const nextTab = url.tab || DEFAULT_TAB;
      if (nextTab !== prevTabRef.current) fromHistoryRef.current = true;
      // Pre-set the nav ref so the persist effect replaces rather than pushes;
      // pushing here would wipe the Forward stack.
      lastNavRef.current = { tab: nextTab, openId: url.openId || null };
      drawerPushedRef.current = false;
      setTab(nextTab);
      setFilters(url.filters || {});
      setSearch(url.search || '');
      setSort(url.sort || DEFAULT_SORT);
      setOpenId(url.openId || null);
      if (url.compareIds) setCompareByCat(c => ({ ...c, [nextTab]: url.compareIds }));
      if (url.weights) setTweaks(tweaksFromWeights(url.weights));
    };
    window.addEventListener('popstate', onPop);
    return () => window.removeEventListener('popstate', onPop);
  }, [setTweaks]);

  // Persist filter / search / collapsed / tab / weights — URL hash + localStorage.
  // Per-category storage keeps each tab's filters separate; collapsed state is global.
  const lastNavRef = useRef({ tab: initialState.tab, openId: initialState.openId });
  const drawerPushedRef = useRef(false);
  useEffect(() => {
    const stored = loadStorage();
    const next = { ...stored, tab, collapsed, weights };
    if (tab !== 'guide') {
      next.byCategory = {
        ...(stored.byCategory || {}),
        [tab]: { filters, search },
      };
    }
    saveStorage(next);
    const last = lastNavRef.current;
    const tabChanged = last.tab !== tab;
    const drawerOpened = !!openId && last.openId !== openId;
    const push = tabChanged || drawerOpened;
    if (tabChanged || !openId) drawerPushedRef.current = false;
    if (drawerOpened && !tabChanged) drawerPushedRef.current = true;
    lastNavRef.current = { tab, openId };
    writeUrl(buildHash({ tab, filters, search, collapsed, openId, compareIds, sort, weights, defaultWeights }), push);
  }, [tab, filters, search, collapsed, openId, compareIds, sort, weights]);

  const openModel = openId ? allModels.find(m => m.id === openId) : null;
  const openBrand = openModel ? brandsById[openModel.brand] : null;

  const toggleCompare = (id) => {
    setCompareIds(ids => ids.includes(id) ? ids.filter(x => x !== id) : ids.length >= 4 ? ids : [...ids, id]);
  };

  const activeCount = (cat) => data.categories[cat].models.filter(m => !isRetired(m)).length;
  const tabs = [
    { id: 'refrigerators', label: 'Refrigerators', n: activeCount('refrigerators') },
    { id: 'dishwashers', label: 'Dishwashers', n: activeCount('dishwashers') },
    { id: 'ranges_ovens_cooktops', label: 'Ranges & Ovens', n: activeCount('ranges_ovens_cooktops') },
    { id: 'guide', label: 'Buying Guide' },
  ];
  const totalModels = tabs.reduce((s, t) => s + (t.n || 0), 0);
  const categoryLabel = CATEGORY_LABELS[category] || 'kitchen appliance';

  const activeFilterCount = Object.entries(filters)
    .filter(([k, v]) => k !== 'location' && k !== 'retired' && v != null && v !== '' && v !== false && !(Array.isArray(v) && !v.length))
    .length;
  const clearAll = () => { setFilters(f => (f.location ? { location: f.location } : {})); setSearch(''); };

  // Reserve bottom padding while the fixed Compare bar is visible
  useEffect(() => {
    const show = compareIds.length && !isGuide;
    document.body.classList.toggle('has-compare', !!show);
    return () => document.body.classList.remove('has-compare');
  }, [compareIds.length, isGuide]);

  // Sync density tweak to body so CSS can respond
  useEffect(() => {
    document.body.dataset.density = tweaks.density;
    return () => { delete document.body.dataset.density; };
  }, [tweaks.density]);

  const sortOptions = [...SORT_OPTIONS.common, ...(SORT_OPTIONS[category] || [])];
  const sortValue = sort.key + ':' + sort.dir;

  return (
    <>
      <a className="skip-link" href="#main" onClick={e => { e.preventDefault(); document.getElementById('main')?.focus(); }}>Skip to main content</a>
      <header className="site-header">
        <div className="header-inner">
          <div className="brand">
            <span className="brand-mark">Kitchen Appliance <em>Compare</em></span>
            <span className="brand-tag">Aggregated ratings research · 2026</span>
          </div>
          <nav className="tabs" aria-label="Section">
            {tabs.map(t => (
              <button
                key={t.id}
                aria-current={tab === t.id ? 'page' : undefined}
                className={"tab-btn " + (tab === t.id ? 'active' : '')}
                onClick={() => setTab(t.id)}
              >
                {t.label}{t.n ? <span className="tab-count">{t.n}</span> : null}
              </button>
            ))}
          </nav>
          <div className="header-right">
            <span className="header-stats">
              <strong>{data.brands.length}</strong> brands · <strong>{totalModels}</strong> models
            </span>
          </div>
        </div>
      </header>

      {isGuide ? (
        <main className="guide-wrap" id="main" tabIndex={-1}>
          <GuideTabbed guide={data.guide} brandsById={brandsById} />
        </main>
      ) : (
        <main className="app" id="main" tabIndex={-1}>
          <Sidebar
            category={category}
            models={allModels.filter(m => filters.retired || !isRetired(m))}
            brands={data.brands}
            filters={filters}
            setFilters={setFilters}
            collapsed={collapsed}
            setCollapsed={setCollapsed}
            onClearAll={clearAll}
            open={filtersOpen}
            onClose={() => setFiltersOpen(false)}
            resultCount={filteredModels.length}
          />
          <div className="main">
            <h1 className="sr-only">Kitchen Appliance Compare — {categoryLabel} research</h1>
            <div className="toolbar">
              <div className="search-box">
                <input value={search} onChange={e => setSearch(e.target.value)} aria-label={`Search ${categoryLabel.toLowerCase()} by name or model number`} placeholder={`Search ${categoryLabel.toLowerCase()} or model #…`} />
                {search && (
                  <button type="button" className="search-clear" aria-label="Clear search" onClick={() => setSearch('')}>✕</button>
                )}
              </div>
              <button type="button" className="filters-toggle" aria-expanded={filtersOpen} onClick={() => setFiltersOpen(true)}>
                Filters{activeFilterCount ? ` (${activeFilterCount})` : ''}
              </button>
              <label className="sort-select-wrap">
                <span className="sr-only">Sort by</span>
                <select className="sort-select" value={sortOptions.some(([v]) => v === sortValue) ? sortValue : ''}
                  onChange={e => { const [key, dir] = e.target.value.split(':'); setSort({ key, dir }); }}>
                  {!sortOptions.some(([v]) => v === sortValue) && <option value="">Custom sort</option>}
                  {sortOptions.map(([v, label]) => <option key={v} value={v}>{label}</option>)}
                </select>
              </label>
              <RankBy weights={weights} onChange={setWeights} />
              {category === 'refrigerators' && (
                <LocationToggle
                  value={filters.location || 'kitchen'}
                  onChange={v => setFilters({ ...filters, location: v === 'kitchen' ? null : v })}
                />
              )}
            </div>
            <div className="results-meta">
              <span aria-live="polite" aria-atomic="true">
                Showing <strong>{filteredModels.length}</strong> of {allModels.length - (filters.retired ? 0 : retiredCount)} models
                {retiredCount > 0 && (
                  <button type="button" className="link-btn" onClick={() => setFilters({ ...filters, retired: filters.retired ? null : true })}>
                    {filters.retired ? 'Hide retired models' : `Show ${retiredCount} retired`}
                  </button>
                )}
              </span>
              <span className="results-hint">Click a column header to sort. Click any row for full specs.</span>
            </div>
            <ApplianceTable
              category={category}
              models={filteredModels}
              brandsById={brandsById}
              weights={weights}
              sort={sort}
              setSort={setSort}
              selected={compareIds}
              toggleCompare={toggleCompare}
              onOpen={(m) => setOpenId(m.id)}
              onClearFilters={clearAll}
            />
          </div>
        </main>
      )}

      {openModel && !isGuide && (
        <Drawer
          model={openModel}
          brand={openBrand}
          weights={weights}
          onClose={() => {
            // If opening the drawer pushed a history entry, closing pops it so
            // Back doesn't reopen what the reader just closed.
            if (drawerPushedRef.current) window.history.back();
            else setOpenId(null);
          }}
          onAddCompare={(id) => toggleCompare(id)}
          isCompared={compareIds.includes(openId)}
        />
      )}

      {!isGuide && (
        <CompareBar
          ids={compareIds}
          models={allModels}
          brandsById={brandsById}
          onRemove={(id) => setCompareIds(ids => ids.filter(x => x !== id))}
          onClear={() => setCompareIds(() => [])}
          onOpen={() => setCompareOpen(true)}
        />
      )}

      {compareOpen && !isGuide && (
        <CompareModal
          ids={compareIds}
          models={allModels}
          brandsById={brandsById}
          weights={weights}
          onClose={() => setCompareOpen(false)}
        />
      )}

      <TweaksPanel title="Tweaks">
        <TweakSection label="Score weights">
          <TweakSlider label="Quality (review aggregate)" value={tweaks.weight_quality} onChange={v => setTweaks('weight_quality', v)} min={0} max={50} step={5} />
          <TweakSlider label="Endorsements (editorial picks)" value={tweaks.weight_endorsements} onChange={v => setTweaks('weight_endorsements', v)} min={0} max={50} step={5} />
          <TweakSlider label="Reliability (Yale service rate)" value={tweaks.weight_reliability} onChange={v => setTweaks('weight_reliability', v)} min={0} max={50} step={5} />
          <TweakSlider label="Price" value={tweaks.weight_price} onChange={v => setTweaks('weight_price', v)} min={0} max={50} step={5} />
          <TweakSlider label="Repairability" value={tweaks.weight_repairability} onChange={v => setTweaks('weight_repairability', v)} min={0} max={50} step={5} />
          <TweakSlider label="Energy (ongoing cost)" value={tweaks.weight_energy} onChange={v => setTweaks('weight_energy', v)} min={0} max={50} step={5} />
          <TweakSlider label="Quietness" value={tweaks.weight_quiet} onChange={v => setTweaks('weight_quiet', v)} min={0} max={50} step={5} />
        </TweakSection>
        <TweakSection label="Display">
          <TweakRadio label="Density" value={tweaks.density} onChange={v => setTweaks('density', v)}
            options={[{ value: 'comfortable', label: 'Comfortable' }, { value: 'compact', label: 'Compact' }]} />
          <TweakToggle label="Hide thin-confidence rows" value={tweaks.hideThinConfidence}
            onChange={v => setTweaks('hideThinConfidence', v)} />
        </TweakSection>
      </TweaksPanel>
    </>
  );
}

// Refrigerator location toggle — Kitchen hides garage-rated models (those
// trade indoor efficiency / temp stability for a wider ambient temp range,
// so they're not really designed for indoors). Garage filters to only those
// manufacturer-rated for the wider range (typically 38–110°F).
function LocationToggle({ value, onChange }) {
  const opts = [
    { id: 'kitchen', label: 'Kitchen', tip: 'Indoor-only fridges. Hides garage-rated models — those are tuned for wider ambient temps and aren\'t really designed for indoors.' },
    { id: 'garage',  label: 'Garage',  tip: 'Only models the manufacturer rates as Garage Ready (wider ambient temp range, typically 38–110°F).' },
  ];
  const onKeyDown = (e) => {
    const i = opts.findIndex(o => o.id === value);
    let next = null;
    if (e.key === 'ArrowRight' || e.key === 'ArrowDown') next = (i + 1) % opts.length;
    else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') next = (i - 1 + opts.length) % opts.length;
    if (next == null) return;
    e.preventDefault();
    onChange(opts[next].id);
  };
  return (
    <div className="loc-toggle" role="radiogroup" aria-label="Refrigerator location">
      <span className="loc-toggle-label" aria-hidden="true">Location</span>
      {opts.map(o => (
        <button
          key={o.id}
          role="radio"
          type="button"
          aria-checked={value === o.id}
          tabIndex={value === o.id ? 0 : -1}
          className={value === o.id ? 'active' : ''}
          onClick={() => onChange(o.id)}
          onKeyDown={onKeyDown}
        >
          <span className="th-label">{o.label}</span>
          <span className="th-tip" role="tooltip">{o.tip}</span>
        </button>
      ))}
    </div>
  );
}

// Guide page with internal sub-tabs
function GuideTabbed({ guide, brandsById }) {
  const [cat, setCat] = useState('refrigerators');
  if (!guide) {
    return <p className="load-note">The buying guide failed to load. Reload the page to try again; the comparison tables still work.</p>;
  }
  const catOptions = [
    ['refrigerators', 'Refrigerators'],
    ['dishwashers', 'Dishwashers'],
    ['ranges_ovens_cooktops', 'Ranges, Ovens & Cooktops'],
  ];
  return (
    <>
      <div className="guide-cat-tabs" role="group" aria-label="Guide category">
        {catOptions.map(([id, label]) => (
          <button
            key={id}
            type="button"
            aria-pressed={cat === id}
            className={"guide-cat-tab " + (cat === id ? 'active' : '')}
            onClick={() => setCat(id)}
          >
            {label}
          </button>
        ))}
      </div>
      <GuidePage guide={guide} category={cat} brandsById={brandsById} />
    </>
  );
}

// === Bootstrap ===
// The model tables need brands + the three category files. The buying guide
// is optional: if it fails, the guide tab says so and the tables still work.
async function loadAll() {
  const fetchJson = async (path) => {
    const r = await fetch(path);
    if (!r.ok) throw new Error(`${path}: ${r.status} ${r.statusText}`);
    return r.json();
  };
  const guideP = fetchJson('data/buying-guide.json').catch(() => null);
  const [brandsRes, fridges, dws, ovens] = await Promise.all([
    fetchJson('data/brands.json'),
    fetchJson('data/refrigerators.json'),
    fetchJson('data/dishwashers.json'),
    fetchJson('data/ovens.json'),
  ]);
  return {
    brands: brandsRes.brands,
    categories: {
      refrigerators: { models: fridges.models },
      dishwashers: { models: dws.models },
      ranges_ovens_cooktops: { models: ovens.models },
    },
    guide: await guideP,
  };
}

export { App, loadAll };
