// Main app — Chef's Choice
import { useState, useEffect, useMemo, useRef } from 'react';
import { Sidebar } from './sidebar.jsx';
import { ApplianceTable, Drawer, CompareBar, CompareModal } from './table-views.jsx';
import { GuidePage } from './guide-page.jsx';
import { getScoreConfidence } from './helpers.jsx';
import {
  useTweaks, TweaksPanel, TweakSection, TweakSlider, TweakRadio, TweakToggle,
} from './tweaks-panel.jsx';

// Persisted state — filters/search/collapsed-groups survive reload via
// localStorage and ride along in the URL hash so links are shareable. URL
// wins over localStorage on initial load when the hash has any data params.
const LS_KEY = 'cc:state:v1';
const TABS = new Set(['refrigerators', 'dishwashers', 'ranges_ovens_cooktops', 'guide']);
const DEFAULT_TAB = 'refrigerators';

// Filter keys we serialize. Type drives encode/decode.
const FILTER_SCHEMA = {
  brand: 'array', tier: 'array', style: 'array', depth: 'array',
  fuel: 'array', type: 'array', tub: 'array', reliability: 'array',
  width: 'array-num',
  priceMin: 'num', priceMax: 'num',
  dbMax: 'num', capacityMin: 'num', capacityMax: 'num',
  heightMin: 'num', heightMax: 'num',
  energyStar: 'bool', wifi: 'bool', panelReady: 'bool', airFry: 'bool',
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

function readUrlState() {
  const raw = window.location.hash.replace(/^#/, '');
  if (!raw) return null;
  const p = new URLSearchParams(raw);
  const tab = p.get('tab');
  const c = p.get('c');
  return {
    tab: TABS.has(tab) ? tab : null,
    search: p.get('q') || '',
    // null collapsed means "URL didn't say" — fall back to stored
    collapsed: c != null
      ? Object.fromEntries(c.split(',').filter(Boolean).map(k => [k, true]))
      : null,
    filters: decodeFilters(p),
  };
}

function writeUrlState({ tab, filters, search, collapsed }) {
  const p = new URLSearchParams();
  if (tab && tab !== DEFAULT_TAB) p.set('tab', tab);
  if (tab !== 'guide') {
    encodeFiltersInto(p, filters);
    if (search) p.set('q', search);
  }
  const ck = Object.keys(collapsed).filter(k => collapsed[k]);
  if (ck.length) p.set('c', ck.join(','));
  const str = p.toString();
  const desired = str ? '#' + str : '';
  if (window.location.hash === desired) return;
  const newUrl = window.location.pathname + window.location.search + desired;
  window.history.replaceState(null, '', newUrl || window.location.pathname);
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
  "showRetiredScores": true,
  "hideThinConfidence": false
}/*EDITMODE-END*/;

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
    };
  }, []);

  const [tab, setTab] = useState(initialState.tab); // refrigerators | dishwashers | ranges_ovens_cooktops | guide
  const [filters, setFilters] = useState(initialState.filters);
  const [sort, setSort] = useState({ key: 'score', dir: 'desc' });
  const [search, setSearch] = useState(initialState.search);
  const [collapsed, setCollapsed] = useState(initialState.collapsed);
  const [openId, setOpenId] = useState(null);
  const [compareIds, setCompareIds] = useState([]);
  const [compareOpen, setCompareOpen] = useState(false);
  const [tweaks, setTweaks] = useTweaks(TWEAK_DEFAULTS);

  const weights = {
    quality: tweaks.weight_quality,
    reliability: tweaks.weight_reliability,
    price: tweaks.weight_price,
    repairability: tweaks.weight_repairability,
    energy: tweaks.weight_energy,
    quiet: tweaks.weight_quiet,
    endorsements: tweaks.weight_endorsements,
  };

  const isGuide = tab === 'guide';
  const category = isGuide ? 'refrigerators' : tab;

  const allModels = useMemo(() => {
    const cat = data.categories[category];
    return cat ? cat.models : [];
  }, [data, category]);

  const brandsById = useMemo(() => {
    const m = {};
    data.brands.forEach(b => m[b.id] = b);
    return m;
  }, [data.brands]);

  // Apply filters
  const filteredModels = useMemo(() => {
    return allModels.filter(m => {
      const b = brandsById[m.brand];
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
      if (search) {
        const q = search.toLowerCase();
        if (!(m.name + ' ' + m.model + ' ' + (b?.name || '')).toLowerCase().includes(q)) return false;
      }
      if (tweaks.hideThinConfidence && getScoreConfidence(m, b).tier === 'thin') return false;
      return true;
    });
  }, [allModels, filters, brandsById, search, tweaks.hideThinConfidence]);

  // On tab switch (not initial mount), load that category's saved filters/search.
  // Sort keys are category-specific so always reset sort.
  const prevTabRef = useRef(initialState.tab);
  useEffect(() => {
    if (prevTabRef.current === tab) return;
    prevTabRef.current = tab;
    setSort({ key: 'score', dir: 'desc' });
    if (tab === 'guide') return;
    const stored = loadStorage();
    const sd = (stored.byCategory && stored.byCategory[tab]) || {};
    setFilters(sd.filters || {});
    setSearch(sd.search || '');
  }, [tab]);

  // Persist filter / search / collapsed / tab state — URL hash + localStorage.
  // Per-category storage keeps each tab's filters separate; collapsed state is global.
  useEffect(() => {
    const stored = loadStorage();
    const next = { ...stored, tab, collapsed };
    if (tab !== 'guide') {
      next.byCategory = {
        ...(stored.byCategory || {}),
        [tab]: { filters, search },
      };
    }
    saveStorage(next);
    writeUrlState({ tab, filters, search, collapsed });
  }, [tab, filters, search, collapsed]);

  const openModel = filteredModels.find(m => m.id === openId) || allModels.find(m => m.id === openId);
  const openBrand = openModel ? brandsById[openModel.brand] : null;

  const toggleCompare = (id) => {
    setCompareIds(ids => ids.includes(id) ? ids.filter(x => x !== id) : ids.length >= 4 ? ids : [...ids, id]);
  };

  const tabs = [
    { id: 'refrigerators', label: 'Refrigerators', n: data.categories.refrigerators.models.length },
    { id: 'dishwashers', label: 'Dishwashers', n: data.categories.dishwashers.models.length },
    { id: 'ranges_ovens_cooktops', label: 'Ranges & Ovens', n: data.categories.ranges_ovens_cooktops.models.length },
    { id: 'guide', label: 'Buying Guide' },
  ];

  const totalModels = useMemo(
    () => data.categories.refrigerators.models.length
        + data.categories.dishwashers.models.length
        + data.categories.ranges_ovens_cooktops.models.length,
    [data]
  );

  // Reserve bottom padding while the fixed Compare bar is visible
  useEffect(() => {
    if (compareIds.length) document.body.classList.add('has-compare');
    else document.body.classList.remove('has-compare');
    return () => document.body.classList.remove('has-compare');
  }, [compareIds.length]);

  // Sync density tweak to body so CSS can respond
  useEffect(() => {
    document.body.dataset.density = tweaks.density;
    return () => { delete document.body.dataset.density; };
  }, [tweaks.density]);

  return (
    <>
      <a className="skip-link" href="#main">Skip to main content</a>
      <header className="site-header">
        <div className="header-inner">
          <div className="brand">
            <span className="brand-mark">Chef's <em>Choice</em></span>
            <span className="brand-tag">Kitchen appliance research · 2026</span>
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
            models={allModels}
            brands={data.brands}
            filters={filters}
            setFilters={setFilters}
            collapsed={collapsed}
            setCollapsed={setCollapsed}
            onClearAll={() => { setFilters({}); setSearch(''); }}
          />
          <div className="main">
            <h1 className="sr-only">Chef's Choice — {tabs.find(t => t.id === tab)?.label || 'kitchen appliance'} research</h1>
            <div className="toolbar">
              <div className="search-box">
                <input value={search} onChange={e => setSearch(e.target.value)} aria-label={`Search ${tabs.find(t => t.id === tab)?.label.toLowerCase()}`} placeholder={`Search ${tabs.find(t => t.id === tab)?.label.toLowerCase()}…`} />
                {search && (
                  <button type="button" className="search-clear" aria-label="Clear search" onClick={() => setSearch('')}>✕</button>
                )}
              </div>
              {category === 'refrigerators' && (
                <LocationToggle
                  value={filters.location || 'kitchen'}
                  onChange={v => setFilters({ ...filters, location: v === 'kitchen' ? null : v })}
                />
              )}
            </div>
            <div className="results-meta">
              <span aria-live="polite" aria-atomic="true">Showing <strong>{filteredModels.length}</strong> of {allModels.length} models</span>
              <span>Click a column header to sort. Click any row for full specs.</span>
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
              onClearFilters={() => { setFilters({}); setSearch(''); }}
            />
          </div>
        </main>
      )}

      {openModel && (
        <Drawer
          model={openModel}
          brand={openBrand}
          weights={weights}
          onClose={() => setOpenId(null)}
          onAddCompare={(id) => toggleCompare(id)}
          isCompared={compareIds.includes(openId)}
        />
      )}

      <CompareBar
        ids={compareIds}
        models={[...data.categories.refrigerators.models, ...data.categories.dishwashers.models, ...data.categories.ranges_ovens_cooktops.models]}
        brandsById={brandsById}
        onRemove={(id) => setCompareIds(ids => ids.filter(x => x !== id))}
        onClear={() => setCompareIds([])}
        onOpen={() => setCompareOpen(true)}
      />

      {compareOpen && (
        <CompareModal
          ids={compareIds}
          models={[...data.categories.refrigerators.models, ...data.categories.dishwashers.models, ...data.categories.ranges_ovens_cooktops.models]}
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
async function loadAll() {
  const fetchJson = async (path) => {
    const r = await fetch(path);
    if (!r.ok) throw new Error(`${path}: ${r.status} ${r.statusText}`);
    return r.json();
  };
  const [brandsRes, fridges, dws, ovens, guide] = await Promise.all([
    fetchJson('data/brands.json'),
    fetchJson('data/refrigerators.json'),
    fetchJson('data/dishwashers.json'),
    fetchJson('data/ovens.json'),
    fetchJson('data/buying-guide.json'),
  ]);
  return {
    brands: brandsRes.brands,
    categories: {
      refrigerators: { models: fridges.models },
      dishwashers: { models: dws.models },
      ranges_ovens_cooktops: { models: ovens.models },
    },
    guide,
  };
}

export { App, loadAll };
