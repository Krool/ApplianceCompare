// Buying guide page renderer
import { Fragment } from 'react';

function GuidePage({ guide, category, brandsById }) {
  if (!guide || !guide.categories) return null;
  const catKey = category || 'refrigerators';
  const cat = guide.categories[catKey];
  const catLabels = {
    refrigerators: 'Refrigerators',
    dishwashers: 'Dishwashers',
    ranges_ovens_cooktops: 'Ranges, Ovens & Cooktops'
  };

  // Convert snake_case install-field keys into human labels
  const formatInstallKey = (k) => {
    const map = {
      cavity: 'Cavity',
      cavity_range: 'Cavity — range',
      cavity_cooktop: 'Cavity — cooktop',
      cavity_wall_oven: 'Cavity — wall oven',
      electrical: 'Electrical',
      electrical_gas: 'Electrical — gas',
      electrical_electric_induction: 'Electrical — electric / induction',
      electrical_dual_fuel: 'Electrical — dual-fuel',
      plumbing: 'Plumbing',
      professional_install_cost: 'Professional install cost',
      diy_difficulty: 'DIY difficulty',
      common_issues: 'Common issues',
    };
    return map[k] || k.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
  };

  return (
    <div className="guide-page" style={{padding: '32px 0 80px'}}>
      <div style={{fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.12em', color: 'var(--ink-3)', fontFamily: 'var(--sans)', marginBottom: 8}}>
        Buying Guide · {guide._meta?.last_updated}
      </div>
      <h1>How to buy a <em>{catLabels[catKey].toLowerCase()}</em> in 2026</h1>
      <p className="deck">{guide._meta?.philosophy}</p>

      <div className="guide-toc">
        <h4>In this guide</h4>
        <ul>
          <li><a href="#questions">Five questions to answer first</a></li>
          <li><a href="#tree">Decision tree by budget</a></li>
          <li><a href="#redflags">Red flags</a></li>
          <li><a href="#pros">What pros buy</a></li>
          {cat.installation && <li><a href="#install">Installation &amp; electrical</a></li>}
          {cat.common_pitfalls && <li><a href="#pitfalls">Common pitfalls</a></li>}
          {catKey === 'ranges_ovens_cooktops' && <li><a href="#induction">Induction caveats &amp; rebates</a></li>}
          <li><a href="#cross">Cross-category principles</a></li>
          {guide.brand_report_card && <li><a href="#brands">Brand report card</a></li>}
        </ul>
      </div>

      <h2 id="questions">{cat.headline}</h2>
      {(cat.key_questions || []).map((kq, i) => (
        <div key={i}>
          <h3>{kq.q}</h3>
          <p>{kq.a}</p>
        </div>
      ))}

      <h2 id="tree">Decision tree</h2>
      <div className="guide-card tip">
        <p style={{marginTop: 0}}>Read top-down — the first row that matches your budget is your starting point. Use the tweak controls to bias the score toward what matters to you.</p>
        {(cat.decision_tree || []).map((d, i) => (
          <div key={i} className="guide-decision-row">
            <div className="if">{d.if}</div>
            <div className="then">{d.then}</div>
          </div>
        ))}
      </div>

      <h2 id="redflags">Red flags</h2>
      <div className="guide-card warn">
        <ul style={{margin: 0, paddingLeft: 20}}>
          {(cat.red_flags || []).map((r, i) => <li key={i}>{r}</li>)}
        </ul>
      </div>

      <h2 id="pros">What pros buy</h2>
      <p>{cat.what_pros_buy}</p>

      {cat.installation && (
        <>
          <h2 id="install">Installation &amp; electrical</h2>
          <div className="guide-card">
            <dl className="install-dl">
              {Object.entries(cat.installation).map(([key, val]) => (
                <Fragment key={key}>
                  <dt>{formatInstallKey(key)}</dt>
                  <dd>
                    {Array.isArray(val)
                      ? <ul>{val.map((v, i) => <li key={i}>{v}</li>)}</ul>
                      : val}
                  </dd>
                </Fragment>
              ))}
            </dl>
          </div>
        </>
      )}

      {cat.common_pitfalls && (
        <>
          <h2 id="pitfalls">Common pitfalls</h2>
          <div className="pitfalls-list">
            {cat.common_pitfalls.map((p, i) => (
              <div key={i} className="pitfall-row">
                <div className="pitfall-q">{p.pitfall}</div>
                <div className="pitfall-a"><span className="pitfall-how">How to avoid</span> {p.avoid}</div>
              </div>
            ))}
          </div>
        </>
      )}

      {catKey === 'ranges_ovens_cooktops' && cat.induction_caveats && (
        <>
          <h2 id="induction">Induction caveats</h2>
          <div className="guide-card">
            <ul style={{margin: 0, paddingLeft: 20}}>
              {cat.induction_caveats.map((c, i) => <li key={i}>{c}</li>)}
            </ul>
          </div>
          <h3 style={{marginTop: 24}}>2026 rebates</h3>
          <div className="guide-card tip">
            <ul style={{margin: 0, paddingLeft: 20}}>
              {cat.rebates_2026.map((r, i) => <li key={i}>{r}</li>)}
            </ul>
            <p style={{marginTop: 10, fontSize: 12, color: 'var(--ink-3)'}}>
              See <a href="https://github.com/Krool/ApplianceCompare/blob/main/public/MARKET_TRENDS.md" target="_blank" rel="noreferrer">MARKET_TRENDS</a> for
              the current state-by-state HEAR rollout.
            </p>
          </div>
        </>
      )}

      <h2 id="cross">Cross-category principles</h2>
      {(guide.cross_category_principles || []).map((p, i) => (
        <div key={i} className="guide-card">
          <strong style={{display: 'block', marginBottom: 4, fontSize: 15, color: 'var(--ink)'}}>{p.title}</strong>
          {p.body}
        </div>
      ))}

      {guide.brand_report_card && (
        <>
          <h2 id="brands">Brand report card</h2>
          <p style={{color: 'var(--ink-2)', fontSize: 14}}>
            One-liner take on every brand in the database. Pair with the table data — this is
            editorial context, not a ranking.
          </p>
          <div className="brand-cards">
            {guide.brand_report_card.map((b, i) => {
              const brandInfo = brandsById?.[b.brand_id];
              const displayName = brandInfo?.name || b.brand_id;
              const tier = brandInfo?.tier;
              return (
                <div key={i} className="brand-card">
                  <div className="bc-head">
                    <h4>{displayName}</h4>
                    {tier && <span className={"pill tier-" + tier.replace(/[ _]/g, '-')}>{tier.replace('-', ' ')}</span>}
                  </div>
                  <p className="bc-oneliner">{b.one_liner}</p>
                  <div className="bc-want"><strong>You want this if:</strong> {b.you_want_this_if}</div>
                  <div className="bc-avoid"><strong>Avoid if:</strong> {b.avoid_if}</div>
                </div>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}

export { GuidePage };
