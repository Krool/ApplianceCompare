// "Rank by" control: weight presets for the composite score, plus a Customize
// popover with one slider per axis. This is the reader-facing way to change
// weights; the Tweaks panel only opens inside the Claude design host.
import { useEffect, useRef, useState } from 'react';

const WEIGHT_AXES = [
  ['quality', 'Review quality', 'Mean of CR, Reviewed, retailer stars and other test scores'],
  ['endorsements', 'Editorial picks', 'How many outlets (Wirecutter, Reviewed, Yale...) pick it'],
  ['reliability', 'Reliability', 'Yale first-year service-call rate'],
  ['price', 'Low price', 'Cheaper scores higher'],
  ['repairability', 'Repairability', 'Ease of repair and parts availability'],
  ['energy', 'Energy use', 'kWh/yr (fridges, dishwashers)'],
  ['quiet', 'Quietness', 'dB (fridges, dishwashers)'],
];

// Balanced must stay equal to the TWEAK_DEFAULTS weights in app.jsx.
const PRESETS = [
  { id: 'balanced', label: 'Balanced', w: { quality: 30, endorsements: 30, reliability: 15, price: 5, repairability: 5, energy: 5, quiet: 10 } },
  { id: 'reliability', label: 'Reliability first', w: { quality: 20, endorsements: 10, reliability: 45, price: 5, repairability: 15, energy: 0, quiet: 5 } },
  { id: 'value', label: 'Best value', w: { quality: 30, endorsements: 10, reliability: 20, price: 35, repairability: 5, energy: 0, quiet: 0 } },
  { id: 'quiet', label: 'Quiet & efficient', w: { quality: 25, endorsements: 10, reliability: 15, price: 5, repairability: 0, energy: 20, quiet: 25 } },
  { id: 'picks', label: "Editors' picks", w: { quality: 30, endorsements: 50, reliability: 10, price: 0, repairability: 0, energy: 5, quiet: 5 } },
];

const sameWeights = (a, b) => WEIGHT_AXES.every(([k]) => (a[k] ?? 0) === (b[k] ?? 0));

function RankBy({ weights, onChange }) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef(null);
  const active = PRESETS.find(p => sameWeights(p.w, weights));

  useEffect(() => {
    if (!open) return;
    const onDown = (e) => { if (!rootRef.current?.contains(e.target)) setOpen(false); };
    const onKey = (e) => { if (e.key === 'Escape') setOpen(false); };
    document.addEventListener('mousedown', onDown);
    document.addEventListener('keydown', onKey);
    return () => { document.removeEventListener('mousedown', onDown); document.removeEventListener('keydown', onKey); };
  }, [open]);

  const total = WEIGHT_AXES.reduce((s, [k]) => s + (weights[k] || 0), 0);

  return (
    <div className="rank-by" ref={rootRef}>
      <label className="rank-by-label" htmlFor="rank-by-select">Rank by</label>
      <select
        id="rank-by-select"
        className="rank-by-select"
        value={active ? active.id : 'custom'}
        onChange={e => { const p = PRESETS.find(x => x.id === e.target.value); if (p) onChange(p.w); }}
      >
        {PRESETS.map(p => <option key={p.id} value={p.id}>{p.label}</option>)}
        {!active && <option value="custom">Custom</option>}
      </select>
      <button type="button" className="rank-by-custom" aria-expanded={open} onClick={() => setOpen(o => !o)}>
        Customize
      </button>
      {open && (
        <div className="rank-by-panel" role="group" aria-label="Score weights">
          <p className="rank-by-help">Each slider sets how much that factor counts. Shares are relative; a factor at 0 is ignored.</p>
          {WEIGHT_AXES.map(([k, label, hint]) => (
            <label key={k} className="rank-by-row">
              <span className="rank-by-row-head">
                <span>{label}</span>
                <span className="rank-by-share">{total ? Math.round(((weights[k] || 0) / total) * 100) : 0}%</span>
              </span>
              <input type="range" min={0} max={50} step={5} value={weights[k] || 0}
                aria-describedby={`rank-hint-${k}`}
                onChange={e => onChange({ ...weights, [k]: Number(e.target.value) })} />
              <span id={`rank-hint-${k}`} className="rank-by-hint">{hint}</span>
            </label>
          ))}
          <button type="button" className="rank-by-reset" onClick={() => onChange(PRESETS[0].w)}>Reset to Balanced</button>
        </div>
      )}
    </div>
  );
}

export { RankBy, WEIGHT_AXES };
