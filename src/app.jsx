// Main app — Chef's Choice
import { useState, useEffect, useMemo } from 'react';
import { Sidebar } from './sidebar.jsx';
import { ApplianceTable, Drawer, CompareBar, CompareModal } from './table-views.jsx';
import { GuidePage } from './guide-page.jsx';
import {
  useTweaks, TweaksPanel, TweakSection, TweakSlider, TweakRadio,
} from './tweaks-panel.jsx';

const TWEAK_DEFAULTS = /*EDITMODE-BEGIN*/{
  "weight_quality": 25,
  "weight_reliability": 30,
  "weight_price": 20,
  "weight_energy": 10,
  "weight_quiet": 15,
  "density": "comfortable",
  "showRetiredScores": true
}/*EDITMODE-END*/;

function App({ data }) {
  const [tab, setTab] = useState('refrigerators'); // refrigerators | dishwashers | ranges_ovens_cooktops | guide
  const [filters, setFilters] = useState({});
  const [sort, setSort] = useState({ key: 'score', dir: 'desc' });
  const [search, setSearch] = useState('');
  const [openId, setOpenId] = useState(null);
  const [compareIds, setCompareIds] = useState([]);
  const [compareOpen, setCompareOpen] = useState(false);
  const [tweaks, setTweaks] = useTweaks(TWEAK_DEFAULTS);

  const weights = {
    quality: tweaks.weight_quality,
    reliability: tweaks.weight_reliability,
    price: tweaks.weight_price,
    energy: tweaks.weight_energy,
    quiet: tweaks.weight_quiet,
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
      if (filters.fuel?.length && !filters.fuel.includes(m.fuel)) return false;
      if (filters.type?.length && !filters.type.includes(m.type)) return false;
      if (filters.reliability?.length && !filters.reliability.includes(m.ratings?.cr_reliability)) return false;
      if (filters.energyStar && !m.energy_star) return false;
      if (filters.wifi && !m.wifi) return false;
      if (filters.panelReady && !m.panel_ready) return false;
      const price = m.street_price ?? m.msrp;
      if (filters.priceMin != null && price < filters.priceMin) return false;
      if (filters.priceMax != null && price > filters.priceMax) return false;
      if (search) {
        const q = search.toLowerCase();
        if (!(m.name + ' ' + m.model + ' ' + (b?.name || '')).toLowerCase().includes(q)) return false;
      }
      return true;
    });
  }, [allModels, filters, brandsById, search]);

  // Reset filters, search, and sort when changing tab — sort keys are category-specific
  useEffect(() => { setFilters({}); setSearch(''); setSort({ key: 'score', dir: 'desc' }); }, [tab]);

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

  return (
    <>
      <header className="site-header">
        <div className="header-inner">
          <div className="brand">
            <span className="brand-mark">Chef's <em>Choice</em></span>
            <span className="brand-tag">Kitchen appliance research · 2026</span>
          </div>
          <nav className="tabs" role="tablist">
            {tabs.map(t => (
              <button
                key={t.id}
                role="tab"
                aria-selected={tab === t.id}
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
        <div className="guide-wrap">
          <GuideTabbed guide={data.guide} brandsById={brandsById} />
        </div>
      ) : (
        <div className="app">
          <Sidebar category={category} models={allModels} brands={data.brands} filters={filters} setFilters={setFilters} />
          <div className="main">
            <div className="toolbar">
              <div className="search-box">
                <input value={search} onChange={e => setSearch(e.target.value)} placeholder={`Search ${tabs.find(t => t.id === tab)?.label.toLowerCase()}…`} />
                {search && (
                  <button type="button" className="search-clear" aria-label="Clear search" onClick={() => setSearch('')}>✕</button>
                )}
              </div>
            </div>
            <div className="results-meta">
              <span>Showing <strong>{filteredModels.length}</strong> of {allModels.length} models</span>
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
        </div>
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
          <TweakSlider label="Reliability (Yale service rate)" value={tweaks.weight_reliability} onChange={v => setTweaks('weight_reliability', v)} min={0} max={50} step={5} />
          <TweakSlider label="Price" value={tweaks.weight_price} onChange={v => setTweaks('weight_price', v)} min={0} max={50} step={5} />
          <TweakSlider label="Energy efficiency" value={tweaks.weight_energy} onChange={v => setTweaks('weight_energy', v)} min={0} max={50} step={5} />
          <TweakSlider label="Quietness" value={tweaks.weight_quiet} onChange={v => setTweaks('weight_quiet', v)} min={0} max={50} step={5} />
        </TweakSection>
        <TweakSection label="Display">
          <TweakRadio label="Density" value={tweaks.density} onChange={v => setTweaks('density', v)}
            options={[{ value: 'comfortable', label: 'Comfortable' }, { value: 'compact', label: 'Compact' }]} />
        </TweakSection>
      </TweaksPanel>
    </>
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
      <div className="guide-cat-tabs" role="tablist">
        {catOptions.map(([id, label]) => (
          <button
            key={id}
            role="tab"
            aria-selected={cat === id}
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
