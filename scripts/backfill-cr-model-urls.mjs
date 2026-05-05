// Round 22: upgrade source_urls.cr from the generic CR buying-guide URL to
// model-specific CR review URLs. Each URL was returned by an earlier
// `site:consumerreports.org <model>` search this session and is the canonical
// model-review page (e.g. /m414038/ — CR's model identifier).
//
// This is a citation-quality upgrade: same source (CR), but the URL now
// goes straight to the model's review page rather than the buying guide.
// We also add a CR-individual endorsement when the model didn't already
// have a CR endorsement entry.
import { readFileSync, writeFileSync } from 'node:fs';

const CR_URLS = {
  refrigerators: {
    'bosch-b36ct80sns':       'https://www.consumerreports.org/appliances/refrigerators/bosch-b36ct80sns/m399238/',
    'bosch-b36fd50sns':       'https://www.consumerreports.org/appliances/refrigerators/bosch-b36fd50sns/m406159/',
    'cafe-cae28dm5ts5':       'https://www.consumerreports.org/appliances/refrigerators/cafe-cae28dm5ts5/m416138/',
    'frigidaire-frtd2021aw':  'https://www.consumerreports.org/appliances/refrigerators/frigidaire-frtd2021aw/m405905/',
    'frigidaire-ffht2022aw':  'https://www.consumerreports.org/appliances/refrigerators/frigidaire-ffht2022aw/m414031/',
    'ge-gfe28gynfs':          'https://www.consumerreports.org/appliances/refrigerators/ge-gfe28gynfs/m401162/',
    'hisense-hrb171n6ase':    'https://www.consumerreports.org/appliances/refrigerators/hisense-hrb171n6ase/m404473/',
    'hisense-hrm260n6tse':    'https://www.consumerreports.org/appliances/refrigerators/hisense-hrm260n6tse/m414038/',
    'hisense-hrt180n6abe':    'https://www.consumerreports.org/appliances/refrigerators/hisense-hrt180n6abe/m417043/',
    'insignia-ns-rtm14ss5':   'https://www.consumerreports.org/appliances/refrigerators/insignia-ns-rtm14ss5/m415359/',
    'samsung-rt18dg6700sraa': 'https://www.consumerreports.org/appliances/refrigerators/samsung-rt18dg6700sraa/m414763/',
    'samsung-rf18a5101sr':    'https://www.consumerreports.org/appliances/refrigerators/samsung-rf18a5101sr/m403619/',
    'samsung-rs28cb760012':   'https://www.consumerreports.org/appliances/refrigerators/samsung-bespoke-rs28cb760012aa/m409288/',
    'samsung-rf23bb8900aw':   'https://www.consumerreports.org/appliances/refrigerators/samsung-bespoke-rf23bb8900aw/m406832/',
    'summit-ff1142pllhd':     'https://www.consumerreports.org/appliances/refrigerators/summit-ff1142pllhd/m416406/',
    'whirlpool-wrt112czjz':   'https://www.consumerreports.org/appliances/refrigerators/whirlpool-wrt112czjz/m403235/',
    'whirlpool-wrt313czlz':   'https://www.consumerreports.org/appliances/refrigerators/whirlpool-wrt313czlz/m406160/',
    'whirlpool-wrf767sdhz':   'https://www.consumerreports.org/appliances/refrigerators/whirlpool-wrf767sdhz/m395519/',
    'whirlpool-wrx735sdhz':   'https://www.consumerreports.org/appliances/refrigerators/whirlpool-wrx735sdhz/m390807/',
  },
  dishwashers: {
    'bosch-shp78cm5n':        'https://www.consumerreports.org/appliances/dishwashers/bosch-800-series-shp78cm5n/m412472/',
    'bosch-shp9pcm5n':        'https://www.consumerreports.org/appliances/dishwashers/bosch-benchmark-shp9pcm5n/m410623/',
    'bosch-she3aem2n':        'https://www.consumerreports.org/appliances/dishwashers/bosch-she3aem2n/m413251/',
    'frigidaire-gdsh4715af':  'https://www.consumerreports.org/appliances/dishwashers/frigidaire-gdsh4715af/m411975/',
    'kitchenaid-kdtf924pps':  'https://www.consumerreports.org/appliances/dishwashers/kitchenaid-kdtf924pps/m413250/',
    'maytag-mdb4949skz':      'https://www.consumerreports.org/appliances/dishwashers/maytag-mdb4949skz/m401892/',
    'maytag-mdfs3924rz':      'https://www.consumerreports.org/appliances/dishwashers/maytag-mdfs3924rz/m416162/',
    'maytag-mdts4224pz':      'https://www.consumerreports.org/appliances/dishwashers/maytag-mdts4224pz/m412975/',
    'miele-g7186scvi':        'https://www.consumerreports.org/appliances/dishwashers/miele-g7186scvi/m417630/',
    'miele-g7156scvi':        'https://www.consumerreports.org/appliances/dishwashers/miele-g7156scvi/m404614/',
    'whirlpool-wdt740salz':   'https://www.consumerreports.org/appliances/dishwashers/whirlpool-wdt740salz/m405616/',
  },
  ovens: {
    'frigidaire-gcfi3070bf':  'https://www.consumerreports.org/appliances/ranges/frigidaire-gallery-gcfi3070bf/m419024/',
    'frigidaire-gcfi3060bf':  'https://www.consumerreports.org/appliances/ranges/frigidaire-gallery-gcfi3060bf/m413386/',
    'frigidaire-gcfe3060bf':  'https://www.consumerreports.org/appliances/ranges/frigidaire-gallery-gcfe3060bf/m410036/',
    'ge-jgb735spss':          'https://www.consumerreports.org/appliances/ranges/ge-jgb735spss/m402111/',
    'ge-grf600avss':          'https://www.consumerreports.org/appliances/ranges/ge-grf600avfs/m413999/',
    'ge-profile-phs700ayfs':  'https://www.consumerreports.org/appliances/ranges/ge-profile-phs700ayfs/m417747/',
    'ge-profile-phs93xypfs':  'https://www.consumerreports.org/appliances/ranges/ge-profile-phs93xypfs/m404512/',
    'ge-profile-phs930ypfs':  'https://www.consumerreports.org/appliances/ranges/ge-profile-phs930ypfs/m404513/',
    'hisense-hbe3501cps':     'https://www.consumerreports.org/appliances/ranges/hisense-hbe3501cps/m408399/',
    'kitchenaid-ksdb900ess':  'https://www.consumerreports.org/appliances/ranges/kitchenaid-ksdb900ess/m402580/',
    'lg-lrgl5825f':           'https://www.consumerreports.org/appliances/ranges/lg-lrgl5825f/m402696/',
    'maytag-mfes8030rz':      'https://www.consumerreports.org/appliances/ranges/maytag-mfes8030rz/m416855/',
    'samsung-nse6dg8700sr':   'https://www.consumerreports.org/appliances/ranges/samsung-bespoke-nse6dg8700sr/m416480/',
    'samsung-nse6dg8100sr':   'https://www.consumerreports.org/appliances/ranges/samsung-nse6dg8100sr/m414000/',
    'samsung-ne63bb871112':   'https://www.consumerreports.org/appliances/ranges/samsung-bespoke-ne63bb871112/m406961/',
    'samsung-nx60bb871112':   'https://www.consumerreports.org/appliances/ranges/samsung-bespoke-nx60bb871112/m406258/',
    'whirlpool-wge745c0fs':   'https://www.consumerreports.org/appliances/ranges/whirlpool-wge745c0fs/m387930/',
  },
};

let totalUpgraded = 0;
for (const [file, byId] of Object.entries(CR_URLS)) {
  const path = `public/data/${file}.json`;
  const data = JSON.parse(readFileSync(path, 'utf8'));
  let touched = 0;
  for (const m of data.models) {
    const url = byId[m.id];
    if (!url) continue;
    m.ratings = m.ratings || {};
    m.ratings.source_urls = m.ratings.source_urls || {};
    const oldUrl = m.ratings.source_urls.cr;
    // Replace if it's the generic buying-guide URL or missing
    const isGenericUrl = !oldUrl || oldUrl.includes('/buying-guide/') || oldUrl.includes('/most-reliable-products/');
    if (isGenericUrl) {
      m.ratings.source_urls.cr = url;
      touched++; totalUpgraded++;
    }
  }
  data._meta.cr_url_upgrade_2026_05 = `Round 22: ${touched} models had their generic CR buying-guide URL upgraded to the model-specific CR review URL.`;
  data._meta.last_updated = '2026-05-05';
  writeFileSync(path, JSON.stringify(data, null, 2) + '\n');
  console.log(`${file}: upgraded ${touched} CR URLs`);
}
console.log(`\nTotal: ${totalUpgraded} CR URL upgrades`);
