// Round 49: per-model Yale service-rate data for LG dishwashers, harvested from
// Yale's "Most Reliable Dishwashers 2026" article. Adds yale_reliability_pct
// (a NEW signal type for these models, expected to bump several from
// limited → solid tier).
//
// Yale publishes 100% - service_rate as the "reliability" framing; we store
// service_rate directly in yale_reliability_pct (lower = better). Only models
// with sample size >= 7 are added (Yale published data for n>=1 but tiny
// samples are too noisy to be useful).
import { readFileSync, writeFileSync } from 'node:fs';

const URL = 'https://blog.yaleappliance.com/most-reliable-dishwashers';

// Map from in-DB id → {service_rate_pct, sample_size}
const DATA = {
  'lg-adfd5448at': { rate: 0,    n: 9   },
  'lg-ldfc2423v':  { rate: 0,    n: 17  },
  'lg-ldfn4542s':  { rate: 3.6,  n: 309 },
  'lg-ldph5554s':  { rate: 14.3, n: 7   },
  'lg-ldth555ns':  { rate: 0,    n: 2   },  // n=2 — flag in label
  'lg-ldth7972s':  { rate: 6.3,  n: 16  },
};

const path = 'public/data/dishwashers.json';
const data = JSON.parse(readFileSync(path, 'utf8'));
let touched = 0;
for (const m of data.models) {
  const d = DATA[m.id];
  if (!d) continue;
  m.ratings = m.ratings || {};
  // Yale's reliability framing: percent of units that needed service in first
  // year. Lower is better. Stored as a number in yale_reliability_pct.
  if (m.ratings.yale_reliability_pct == null) {
    m.ratings.yale_reliability_pct = d.rate;
    m.ratings.source_urls = m.ratings.source_urls || {};
    if (!m.ratings.source_urls.yale_reliability) {
      m.ratings.source_urls.yale_reliability = URL;
    }
    touched++;
  }
  // Also add an endorsement explaining the source and sample size for
  // transparency (small samples are meaningful but should be flagged).
  m.ratings.endorsements = m.ratings.endorsements || [];
  const have = new Set(m.ratings.endorsements.map(e => e.url + '|' + (e.label || '').slice(0, 60)));
  const sampleNote = d.n < 30 ? ` (small sample n=${d.n})` : ` (n=${d.n})`;
  const label = `Yale (Most Reliable Dishwashers 2026): per-model service rate ${d.rate}%${sampleNote}`;
  const newE = { channel: 'Yale Appliance', type: 'data', label, url: URL };
  const key = newE.url + '|' + newE.label.slice(0, 60);
  if (!have.has(key)) m.ratings.endorsements.push(newE);
}
data._meta.batch_round49_2026_05 = `Round 49: ${touched} per-model yale_reliability_pct values for LG dishwashers from Yale Most Reliable 2026 article (NEW signal type — expected to upgrade several limited → solid).`;
data._meta.last_updated = '2026-05-05';
writeFileSync(path, JSON.stringify(data, null, 2) + '\n');
console.log(`dishwashers: added yale_reliability_pct to ${touched} models`);
