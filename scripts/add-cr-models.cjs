// Bulk-add all CR-tested models that aren't yet in the dataset.
// Source: CR Buying Guide 2026 (dishwashers, ranges, cooktops, refrigerators).
// Each new model gets cr_overall, cr_reliability, source_urls.cr, and price.
// Detailed specs (decibels, capacity, energy_kwh_yr, etc.) are null and will
// be backfilled from manufacturer pages in a later pass.
const fs = require('fs');
const path = require('path');
const ROOT = path.resolve(__dirname, '..');

const slug = s => (s || '').toString().replace(/[\s./_]+/g, '-').replace(/[^a-z0-9-]/gi, '').toLowerCase();
const norm = s => (s || '').toString().replace(/[\s.\-_]/g, '').toLowerCase();
const relCat = r => r === '-' || r == null ? 'unrated' : (r === 'BETTER' ? 'very-good' : 'fair');
const crUrl = cat => 'https://www.consumerreports.org/cro/' + cat + '/buying-guide/index.htm';

// Brands not yet in brands.json that some new models reference.
// Minimal entries; service_rate / repairability data unverified for these.
const NEW_BRANDS = [
  { id: 'amana', name: 'Amana', tier: 'budget', country: 'USA (Whirlpool)',
    notes: 'Whirlpool budget sub-brand. Shares parts/platform with Whirlpool. Added 2026-04-25 to support CR Buying Guide coverage.' },
  { id: 'asko', name: 'Asko', tier: 'premium', country: 'Sweden',
    notes: 'Scandinavian premium dishwasher specialist. Limited US distribution.' },
  { id: 'bertazzoni', name: 'Bertazzoni', tier: 'premium', country: 'Italy',
    notes: 'Italian range and dishwasher importer. Pro-style aesthetics.' },
  { id: 'dacor', name: 'Dacor', tier: 'ultra-premium', country: 'USA (Samsung)',
    notes: 'Samsung-owned ultra-premium line. Built-in fridges, ranges, ovens.' },
  { id: 'galanz', name: 'Galanz', tier: 'budget', country: 'China',
    notes: 'Budget Chinese brand expanding US retail-channel distribution.' },
  { id: 'ikea', name: 'Ikea', tier: 'budget', country: 'Sweden (rebadged)',
    notes: 'Ikea rebadges Whirlpool, Electrolux, and others under house names. Worth checking the underlying OEM.' },
  { id: 'insignia', name: 'Insignia', tier: 'budget', country: 'USA (Best Buy)',
    notes: 'Best Buy house brand. Generally rebadged from various OEMs at value pricing.' },
  { id: 'kenmore', name: 'Kenmore', tier: 'mainstream', country: 'USA (Transformco)',
    notes: 'Sears legacy brand, now Transformco. Sub-brand of various OEMs depending on model.' },
  { id: 'kucht', name: 'Kucht', tier: 'premium', country: 'USA',
    notes: 'Pro-style ranges. Newer brand; long-term reliability unverified.' },
  { id: 'midea', name: 'Midea', tier: 'budget', country: 'China',
    notes: 'Chinese mid-tier brand expanding US dishwasher and microwave distribution. Strong value per CR testing.' },
  { id: 'sharp', name: 'Sharp', tier: 'mainstream', country: 'Japan',
    notes: 'Japanese electronics maker; expanding US dishwasher line.' },
  { id: 'summit', name: 'Summit Appliances', tier: 'mainstream', country: 'USA',
    notes: 'Compact and specialty appliance specialist (small kitchens, ADA, RV).' },
  { id: 'thor-kitchen', name: 'Thor Kitchen', tier: 'premium', country: 'USA',
    notes: 'Pro-style on a budget. Newer brand; long-term reliability unverified.' },
  { id: 'unique-appliances', name: 'Unique Appliances', tier: 'mainstream', country: 'Canada',
    notes: 'Canadian specialty maker (off-grid, propane, retro styling).' },
];

// =====================================================================
// New dishwashers — all 24" unless noted; tub typically stainless when known
// brand-id, model, name, msrp/street, cr_overall, cr_reliability
// =====================================================================
const NEW_DISHWASHERS = [
  ['bosch','SHX5AEM5N','Bosch 100 Series SHX5AEM5N',899,81,'BETTER'],
  ['miele','G7196SCVISF','Miele G 7196 SCVi SF Panel-Ready',2174,80,'BETTER'],
  ['miele','G7176SCVI','Miele G 7176 SCVi Panel-Ready',1849,79,'BETTER'],
  ['thermador','DWHD661EFP','Thermador Star Sapphire DWHD661EFP',2499,78,'BETTER'],
  ['lg','ADFD5448AT','LG ADFD5448AT QuadWash Pro',749,78,'BETTER'],
  ['lg','LDFC353LS','LG LDFC353LS Front Control',830,77,'BETTER'],
  ['kitchenaid','KDFE204KPS','KitchenAid KDFE204KPS Front Control',849,77,'WORSE'],
  ['lg','LDTH555NS','LG LDTH555NS QuadWash Pro',974,76,'BETTER'],
  ['miele','G7186SCVI','Miele G 7186 SCVi Panel-Ready',1949,76,'BETTER'],
  ['kitchenaid','KDTF924PPS','KitchenAid KDTF924PPS Wash & Dry',1798,76,'WORSE'],
  ['midea','MDT24P3CST','Midea MDT24P3CST Smart',529,76,'-'],
  ['lg','LDFC2423V','LG LDFC2423V Front Control',445,76,'BETTER'],
  ['lg','LDPN454HT','LG LDPN454HT (Home Depot)',619,76,'BETTER'],
  ['lg','LDPH5554S','LG LDPH5554S Hybrid',749,76,'BETTER'],
  ['midea','MDF24P2BWW','Midea MDF24P2BWW (Lowe\'s)',399,75,'-'],
  ['midea','MDT24P5AST','Midea MDT24P5AST',800,75,'-'],
  ['bosch','SHE43C75N','Bosch 300 Series SHE43C75N (Best Buy)',640,75,'BETTER'],
  ['thermador','DWHD640EFM','Thermador Emerald DWHD640EFM',1475,74,'BETTER'],
  ['whirlpool','WDP730HAMZ','Whirlpool WDP730HAMZ',738,74,'BETTER'],
  ['miele','G5051SCVI','Miele G 5051 SCVi',1299,74,'BETTER'],
  ['bosch','SHE41CM5N','Bosch 300 Series SHE41CM5N',699,74,'BETTER'],
  ['miele','G5056SCVISF','Miele G 5056 SCVi SF Panel-Ready',1499,73,'BETTER'],
  ['unique-appliances','UGP-24CRDW','Unique Appliances UGP-24CR DW',1599,72,'-'],
  ['frigidaire','GDSH4715AF','Frigidaire GDSH4715AF',748,71,'WORSE'],
  ['insignia','NS-DWR3SS1','Insignia NS-DWR3SS1',550,71,'-'],
  ['whirlpool','WDT550SAPZ','Whirlpool WDT550SAPZ',938,71,'BETTER'],
  ['maytag','MDTS4224PZ','Maytag MDTS4224PZ',698,71,'BETTER'],
  ['kitchenaid','KDPM604KPS','KitchenAid KDPM604KPS',1156,70,'WORSE'],
  ['samsung','DW80BB707012','Samsung Bespoke DW80BB707012',749,70,'WORSE'],
  ['sharp','SDW6506JS','Sharp SDW6506JS',700,70,'-'],
  ['asko','DBI564IXXLS','Asko DBI564IXXLS',1249,69,'WORSE'],
  ['insignia','NS-DWRF2SS3','Insignia NS-DWRF2SS3',450,69,'-'],
  ['sharp','SDW6767HS','Sharp SDW6767HS',729,69,'-'],
  ['kitchenaid','KDTM704KPS','KitchenAid KDTM704KPS',1478,69,'WORSE'],
  ['sharp','SDW6757ES','Sharp SDW6757ES',679,68,'-'],
  ['samsung','DW80R9950UG','Samsung DW80R9950UG',814,68,'WORSE'],
  ['frigidaire','GDSP471TAF','Frigidaire GDSP471TAF (Home Depot)',678,68,'WORSE'],
  ['frigidaire','FDSH4501AS','Frigidaire FDSH4501AS',649,67,'WORSE'],
  ['whirlpool','WDPS7024RZ','Whirlpool WDPS7024RZ (Home Depot)',698,66,'BETTER'],
  ['samsung','DW80CG5451SR','Samsung DW80CG5451SR',599,66,'WORSE'],
  ['sharp','SDW6888JS','Sharp SDW6888JS',799,66,'-'],
  ['whirlpool','WDF341PAPM','Whirlpool WDF341PAPM',399,66,'BETTER'],
  ['frigidaire','PDSH4816AF','Frigidaire Professional PDSH4816AF',898,66,'WORSE'],
  ['cafe','CDP888M5VS5','Café CDP888M5VS5',1715,65,'WORSE'],
  ['whirlpool','WDP540HAMZ','Whirlpool WDP540HAMZ',479,65,'BETTER'],
  ['kitchenaid','KDTE104KPS','KitchenAid KDTE104KPS',779,65,'WORSE'],
  ['fisher-paykel','DD24DTX6HI1','Fisher & Paykel DD24DTX6HI1 DishDrawer',2599,65,'WORSE'],
  ['bertazzoni','DW24S3IPV','Bertazzoni Professional DW24S3IPV',999,65,'-'],
];

// =====================================================================
// New ovens (ranges, cooktops, wall ovens)
// brand-id, model, name, price, cr_overall, cr_reliability, type, fuel, width_in, style
// =====================================================================
const NEW_OVENS = [
  // SMOOTHTOP SINGLE OVEN ranges (30-inch)
  ['frigidaire','GCFE3060BF','Frigidaire Gallery GCFE3060BF',1200,88,'BETTER','range','electric',30,'slide-in'],
  ['ge-profile','PSS93YPFS','GE Profile PSS93YPFS',1500,88,'BETTER','range','electric',30,'slide-in'],
  ['lg','LREL6321S','LG LREL6321S',900,87,'BETTER','range','electric',30,'slide-in'],
  ['frigidaire','GCFE3059BF','Frigidaire Gallery GCFE3059BF',975,86,'BETTER','range','electric',30,'freestanding'],
  ['frigidaire','GCRE3060BF','Frigidaire Gallery GCRE3060BF',1100,86,'BETTER','range','electric',30,'freestanding'],
  ['lg','LREL6325F','LG LREL6325F',1500,85,'BETTER','range','electric',30,'slide-in'],
  ['frigidaire','PCFE3080AF','Frigidaire Professional PCFE3080AF',2290,84,'BETTER','range','electric',30,'slide-in'],
  ['lg','LSEL6333F','LG LSEL6333F',1300,83,'BETTER','range','electric',30,'slide-in'],
  ['samsung','NE63A6711SS','Samsung NE63A6711SS',1250,82,'WORSE','range','electric',30,'slide-in'],
  ['bosch','HEI8056U','Bosch HEI8056U',2400,81,'BETTER','range','electric',30,'slide-in'],
  ['frigidaire','FCFE3083AS','Frigidaire FCFE3083AS',950,81,'BETTER','range','electric',30,'freestanding'],
  ['ge-profile','PB900YVFS','GE Profile PB900YVFS',1230,81,'BETTER','range','electric',30,'slide-in'],
  ['samsung','NSE6DG8700SR','Samsung Bespoke NSE6DG8700SR',1495,80,'WORSE','range','electric',30,'slide-in'],
  ['hisense','HBE3501CPS','Hisense HBE3501CPS',700,76,'-','range','electric',30,'freestanding'],
  ['samsung','NSE6DG8100SR','Samsung NSE6DG8100SR',850,75,'WORSE','range','electric',30,'slide-in'],
  ['samsung','NE63A6311SS','Samsung NE63A6311SS',680,70,'WORSE','range','electric',30,'slide-in'],
  ['ge','GRF600AVSS','GE GRF600AVSS',730,70,'BETTER','range','electric',30,'freestanding'],
  ['whirlpool','WEE515S0LS','Whirlpool WEE515S0LS',830,69,'BETTER','range','electric',30,'slide-in'],
  ['cafe','CES700P2MS1','Café CES700P2MS1',2200,68,'BETTER','range','electric',30,'slide-in'],
  ['bosch','HEF1050MU','Bosch HEF1050MU',1535,66,'BETTER','range','electric',30,'freestanding'],
  ['maytag','MER8800FZ','Maytag MER8800FZ',999,65,'WORSE','range','electric',30,'freestanding'],
  ['kitchenaid','KFEG504KPS','KitchenAid KFEG504KPS',950,64,'WORSE','range','electric',30,'slide-in'],
  ['maytag','MFES8030RZ','Maytag MFES8030RZ',1180,63,'WORSE','range','electric',30,'slide-in'],
  ['amana','AER6603SMS','Amana AER6603SMS',670,63,'BETTER','range','electric',30,'freestanding'],
  ['whirlpool','WFES7530RZ','Whirlpool WFES7530RZ',1205,63,'BETTER','range','electric',30,'slide-in'],
  ['haier','QSS740RNSS','Haier QSS740RNSS',1650,62,'-','range','electric',30,'slide-in'],
  ['maytag','MFES6030RZ','Maytag MFES6030RZ',850,62,'WORSE','range','electric',30,'slide-in'],
  ['amana','AER6303MMS','Amana AER6303MMS',580,62,'BETTER','range','electric',30,'freestanding'],
  ['frigidaire','FCFE3062AS','Frigidaire FCFE3062AS',820,61,'BETTER','range','electric',30,'freestanding'],
  ['whirlpool','WFE550S0LZ','Whirlpool WFE550S0LZ',800,61,'BETTER','range','electric',30,'freestanding'],
  ['whirlpool','WFE775H0HZ','Whirlpool WFE775H0HZ',1350,60,'BETTER','range','electric',30,'slide-in'],
  ['kitchenaid','KSEB900ESS','KitchenAid KSEB900ESS',2870,59,'WORSE','range','electric',30,'slide-in'],
  ['whirlpool','WFES3330RZ','Whirlpool WFES3330RZ',730,59,'BETTER','range','electric',30,'freestanding'],
  ['whirlpool','WFES3030RS','Whirlpool WFES3030RS',950,58,'BETTER','range','electric',30,'freestanding'],
  ['ge','JB480DTBB','GE JB480DTBB',1220,58,'BETTER','range','electric',30,'freestanding'],
  ['whirlpool','WEE745H0LZ','Whirlpool WEE745H0LZ',2150,55,'BETTER','range','electric',30,'slide-in'],
  ['maytag','MER4600LS','Maytag MER4600LS',900,54,'WORSE','range','electric',30,'freestanding'],
  ['jennair','JES1450ML','JennAir JES1450ML',3425,54,'WORSE','range','electric',30,'slide-in'],
  ['whirlpool','WFE535S0LZ','Whirlpool WFE535S0LZ',1130,54,'BETTER','range','electric',30,'freestanding'],

  // SMOOTHTOP DOUBLE OVEN ranges
  ['lg','LTEL7337F','LG LTEL7337F Double Oven',2400,81,'BETTER','range','electric',30,'slide-in'],
  ['samsung','NE63T8751SG','Samsung NE63T8751SG Double Oven',2740,81,'WORSE','range','electric',30,'slide-in'],
  ['lg','LDE4413ST','LG LDE4413ST Double Oven',1750,81,'BETTER','range','electric',30,'freestanding'],
  ['lg','LDEL7324SE','LG LDEL7324SE Double Oven',1300,80,'BETTER','range','electric',30,'freestanding'],
  ['samsung','NE63A6751SS','Samsung NE63A6751SS Double Oven',1200,79,'WORSE','range','electric',30,'slide-in'],
  ['kitchenaid','KFED500EBS','KitchenAid KFED500EBS Double Oven',2100,79,'WORSE','range','electric',30,'slide-in'],
  ['cafe','CES750P4MW2','Café CES750P4MW2 Double Oven',3000,77,'BETTER','range','electric',30,'slide-in'],
  ['ge','JBS86SPSS','GE JBS86SPSS Double Oven',1200,77,'BETTER','range','electric',30,'freestanding'],
  ['maytag','MET8800FZ','Maytag MET8800FZ Double Oven',1770,74,'WORSE','range','electric',30,'slide-in'],
  ['whirlpool','WGE745C0FS','Whirlpool WGE745C0FS Double Oven',1450,73,'BETTER','range','electric',30,'slide-in'],
  ['samsung','NSE6DG8550SR','Samsung Bespoke NSE6DG8550SR Double Oven',1895,69,'WORSE','range','electric',30,'slide-in'],

  // INDUCTION ranges
  ['frigidaire','GCFI3060BF','Frigidaire Gallery GCFI3060BF Induction',1600,93,'BETTER','range','induction',30,'slide-in'],
  ['ge-profile','PHS93XYPFS','GE Profile PHS93XYPFS Induction',3555,89,'BETTER','range','induction',30,'slide-in'],
  ['lg','LSIL6334FE','LG LSIL6334FE Induction',2000,88,'BETTER','range','induction',30,'slide-in'],
  ['lg','LSIL6332FE','LG LSIL6332FE Induction',1500,88,'BETTER','range','induction',30,'slide-in'],
  ['frigidaire','FCFI3082BS','Frigidaire FCFI3082BS Induction',1010,87,'BETTER','range','induction',30,'freestanding'],
  ['miele','HR1422-3I','Miele HR 1422-3I Induction',7350,86,'-','range','induction',30,'freestanding-pro'],
  ['dacor','DOP30T940IS','Dacor DOP30T940IS Induction',6900,85,'WORSE','range','induction',30,'slide-in'],
  ['frigidaire','PCFI3080AF','Frigidaire Professional PCFI3080AF Induction',2710,85,'BETTER','range','induction',30,'slide-in'],
  ['samsung','NSI6DG9100SR','Samsung NSI6DG9100SR Induction',1200,85,'WORSE','range','induction',30,'slide-in'],
  ['lg','LSIL6336FE','LG LSIL6336FE Induction',1900,84,'BETTER','range','induction',30,'slide-in'],
  ['samsung','NSI6DG9900SRAA','Samsung Bespoke NSI6DG9900SRAA Induction',2300,84,'WORSE','range','induction',30,'slide-in'],
  ['ikea','TVARSAKER','Ikea Tvarsaker 404.660.06 Induction',1400,83,'-','range','induction',30,'slide-in'],
  ['samsung','NSI6DG9500SR','Samsung Bespoke NSI6DG9500SR Induction',1700,81,'WORSE','range','induction',30,'slide-in'],
  ['frigidaire','FCFI3083AS','Frigidaire Gallery FCFI3083AS Induction',1200,81,'BETTER','range','induction',30,'freestanding'],
  ['cafe','CHS90XP2MS1','Café CHS90XP2MS1 Induction',4820,76,'WORSE','range','induction',30,'slide-in'],
  ['zline','RAINDS-SN-30','ZLINE RAINDS-SN-30 Induction',3500,73,'-','range','induction',30,'freestanding-pro'],
  ['kenmore','2296853','Kenmore 2296853 Induction',1710,71,'-','range','induction',30,'slide-in'],
  ['bosch','HIS8055U','Bosch 800 Series HIS8055U Induction',4400,68,'BETTER','range','induction',30,'slide-in'],
  ['jennair','JIS1450ML','JennAir Rise JIS1450ML Induction',4225,62,'WORSE','range','induction',30,'slide-in'],
  ['kitchenaid','KSIS730PSS','KitchenAid KSIS730PSS Induction',2900,61,'WORSE','range','induction',30,'slide-in'],

  // GAS / DUAL-FUEL SINGLE OVEN ranges (30")
  ['lg','LSDL6336F','LG LSDL6336F Dual Fuel',2100,85,'BETTER','range','dual_fuel',30,'slide-in'],
  ['lg','LSGL6335D','LG LSGL6335D',1900,80,'BETTER','range','gas',30,'slide-in'],
  ['ge-profile','PGS930YPFS','GE Profile PGS930YPFS',2000,80,'BETTER','range','gas',30,'slide-in'],
  ['lg-studio','LSGS6338F','LG Studio LSGS6338F',2600,78,'BETTER','range','gas',30,'slide-in'],
  ['cafe','C2S900P2MS1','Café C2S900P2MS1 Dual Fuel',3600,77,'WORSE','range','dual_fuel',30,'slide-in'],
  ['samsung','NX60T8711SS','Samsung NX60T8711SS',1490,76,'BETTER','range','gas',30,'slide-in'],
  ['ge','GGF600AVSS','GE GGF600AVSS',780,76,'BETTER','range','gas',30,'freestanding'],
  ['ge','JGS760SPSS','GE JGS760SPSS',1420,76,'BETTER','range','gas',30,'slide-in'],
  ['ge','JGBS30DEKWW','GE JGBS30DEKWW',650,75,'BETTER','range','gas',30,'freestanding'],
  ['ge','JGSS61SPSS','GE JGSS61SPSS',1135,74,'BETTER','range','gas',30,'slide-in'],
  ['ge','JGBS66REKSS','GE JGBS66REKSS',700,74,'BETTER','range','gas',30,'freestanding'],
  ['ge','JGBS61RPSS','GE JGBS61RPSS',680,73,'BETTER','range','gas',30,'freestanding'],
  ['lg','LRGL5823S','LG LRGL5823S',1500,72,'BETTER','range','gas',30,'freestanding'],
  ['lg','LSGL5831F','LG LSGL5831F',1200,70,'BETTER','range','gas',30,'slide-in'],
  ['cafe','CGS700M2NS5','Café CGS700M2NS5',3240,70,'WORSE','range','gas',30,'slide-in'],
  ['samsung','NSG6DG8700SR','Samsung Bespoke NSG6DG8700SR',1600,69,'BETTER','range','gas',30,'slide-in'],
  ['sks','UPSG3014ST','SKS UPSG3014ST',3999,67,'-','range','gas',30,'slide-in'],
  ['samsung','NX60A6111SS','Samsung NX60A6111SS',700,67,'BETTER','range','gas',30,'freestanding'],
  ['samsung','NSG6DG8100SR','Samsung Bespoke NSG6DG8100SR',950,66,'BETTER','range','gas',30,'slide-in'],
  ['bosch','HDI8056U','Bosch 800 Series HDI8056U Dual Fuel',3125,64,'BETTER','range','dual_fuel',30,'slide-in'],
  ['ge','JGBS60DEKWW','GE JGBS60DEKWW',760,64,'BETTER','range','gas',30,'freestanding'],
  ['samsung','NX60A6311SS','Samsung NX60A6311SS',730,60,'BETTER','range','gas',30,'slide-in'],
  ['lg','LRGL5821S','LG LRGL5821S',1000,58,'BETTER','range','gas',30,'freestanding'],
  ['kitchenaid','KSGG700ESS','KitchenAid KSGG700ESS',2100,55,'WORSE','range','gas',30,'slide-in'],
  ['bosch','HGI8056UC','Bosch 800 Series HGI8056UC',2550,53,'BETTER','range','gas',30,'slide-in'],
  ['sharp','SSG3065JS','Sharp SSG3065JS',1690,51,'-','range','gas',30,'slide-in'],
  ['whirlpool','WFG775H0HV','Whirlpool WFG775H0HV',1475,49,'WORSE','range','gas',30,'slide-in'],
  ['electrolux','ECFD3068AS','Electrolux ECFD3068AS Dual Fuel',3475,48,'WORSE','range','dual_fuel',30,'slide-in'],
  ['hisense','HBG3601CPS','Hisense HBG3601CPS',785,47,'-','range','gas',30,'freestanding'],
  ['frigidaire','PCFG3080AF','Frigidaire Professional PCFG3080AF',2435,47,'BETTER','range','gas',30,'slide-in'],
  ['frigidaire','GCFG3060BF','Frigidaire Gallery GCFG3060BF',1300,47,'BETTER','range','gas',30,'slide-in'],
  ['midea','MGR30S2AST','Midea MGR30S2AST',725,47,'-','range','gas',30,'freestanding'],
  ['whirlpool','WFGS7530RZ','Whirlpool WFGS7530RZ',1310,45,'WORSE','range','gas',30,'slide-in'],
  ['whirlpool','WFG505M0MS','Whirlpool WFG505M0MS',650,45,'WORSE','range','gas',30,'freestanding'],
  ['maytag','MFGS6030RZ','Maytag MFGS6030RZ',925,45,'WORSE','range','gas',30,'slide-in'],
  ['hotpoint','RGBS330DRWW','Hotpoint RGBS330DRWW',500,44,'WORSE','range','gas',30,'freestanding'],
  ['whirlpool','WEG745H0LZ','Whirlpool WEG745H0LZ',2150,43,'WORSE','range','gas',30,'slide-in'],
  ['kitchenaid','KFGG500ESS','KitchenAid KFGG500ESS',1200,42,'WORSE','range','gas',30,'slide-in'],
  ['whirlpool','WFG975H0HV','Whirlpool WFG975H0HV',1680,42,'WORSE','range','gas',30,'slide-in'],
  ['whirlpool','WFG550S0LZ','Whirlpool WFG550S0LZ',850,39,'WORSE','range','gas',30,'freestanding'],
  ['electrolux','ECFG3068AS','Electrolux ECFG3068AS',3250,38,'WORSE','range','gas',30,'slide-in'],
  ['thor-kitchen','LRG3001U','Thor Kitchen LRG3001U',2430,38,'-','range','gas',30,'freestanding'],
  ['whirlpool','WFG525S0JZ','Whirlpool WFG525S0JZ',985,33,'WORSE','range','gas',30,'freestanding'],
  ['frigidaire','FCFG3062AS','Frigidaire FCFG3062AS',850,32,'BETTER','range','gas',30,'freestanding'],
  ['frigidaire','FCRG3083AS','Frigidaire FCRG3083AS',870,31,'BETTER','range','gas',30,'freestanding'],
  ['frigidaire','FCRG3051BS','Frigidaire FCRG3051BS',735,30,'BETTER','range','gas',30,'freestanding'],
  ['whirlpool','WEG515S0LS','Whirlpool WEG515S0LS',830,29,'WORSE','range','gas',30,'slide-in'],
  ['frigidaire','FCFG3083AS','Frigidaire FCFG3083AS',970,29,'BETTER','range','gas',30,'freestanding'],
  ['frigidaire','GCFG3059BF','Frigidaire Gallery GCFG3059BF',1000,28,'BETTER','range','gas',30,'freestanding'],
  ['frigidaire','GCRG3060BF','Frigidaire Gallery GCRG3060BF',1125,27,'BETTER','range','gas',30,'freestanding'],

  // GAS / DUAL-FUEL DOUBLE OVEN ranges
  ['ge-profile','PGB965YPFS','GE Profile PGB965YPFS Double Oven',1840,80,'BETTER','range','gas',30,'freestanding'],
  ['lg','LTGL6937F','LG LTGL6937F Double Oven',2600,79,'BETTER','range','gas',30,'slide-in'],
  ['lg-studio','LUTD4919SN','LG Signature LUTD4919SN Dual Fuel Double Oven',3499,77,'BETTER','range','dual_fuel',30,'slide-in'],
  ['ge','JGBS86SPSS','GE JGBS86SPSS Double Oven',1300,75,'BETTER','range','gas',30,'freestanding'],
  ['cafe','CGS750P4MW2','Café CGS750P4MW2 Double Oven',3600,75,'WORSE','range','gas',30,'slide-in'],
  ['cafe','C2S950P2MS1','Café C2S950P2MS1 Dual Fuel Double Oven',3945,75,'WORSE','range','dual_fuel',30,'slide-in'],
  ['ge','JGSS86SPSS','GE JGSS86SPSS Double Oven',2255,74,'BETTER','range','gas',30,'slide-in'],
  ['lg','LDGL6924S','LG LDGL6924S Double Oven',1500,72,'BETTER','range','gas',30,'freestanding'],
  ['kitchenaid','KFGD500ESS','KitchenAid KFGD500ESS Double Oven',2500,52,'WORSE','range','gas',30,'slide-in'],

  // PRO-STYLE ranges 36"
  ['electrolux','ECFD3668AS','Electrolux ECFD3668AS Pro Dual Fuel 36"',4700,69,'BETTER','range','dual_fuel',36,'freestanding-pro'],
  ['jennair','JGRP436HL','JennAir JGRP436HL Pro 36"',7285,55,'WORSE','range','gas',36,'freestanding-pro'],
  ['thor-kitchen','LRG3601U','Thor Kitchen LRG3601U Pro 36"',3840,47,'-','range','gas',36,'freestanding-pro'],

  // PRO-STYLE ranges 30"
  ['monogram','ZGP304NTSS','Monogram ZGP304NTSS Pro Gas',5700,81,'BETTER','range','gas',30,'freestanding-pro'],
  ['kitchenaid','KFDC500JSS','KitchenAid KFDC500JSS Dual Fuel Pro',5250,68,'BETTER','range','dual_fuel',30,'freestanding-pro'],
  ['dacor','DOP30T840GS','Dacor Transitional DOP30T840GS',4000,52,'WORSE','range','gas',30,'freestanding-pro'],
  ['thermador','PRG305WH','Thermador Pro Harmony PRG305WH',6600,46,'WORSE','range','gas',30,'freestanding-pro'],
  ['kitchenaid','KFGC500JPA','KitchenAid KFGC500JPA Smart Commercial',4635,43,'BETTER','range','gas',30,'freestanding-pro'],
  ['bosch','HGS8055UC','Bosch 800 Series HGS8055UC',3700,34,'WORSE','range','gas',30,'freestanding-pro'],

  // COOKTOPS — gas
  ['samsung','NA36N7755TG','Samsung NA36N7755TG 36" Gas',1400,89,'BETTER','cooktop','gas',36,'cooktop'],
  ['lg-studio','CBGS3628S','LG Studio CBGS3628S 36" Gas',1765,88,'BETTER','cooktop','gas',36,'cooktop'],
  ['lg','CBGJ3623S','LG CBGJ3623S 36" Gas',855,83,'BETTER','cooktop','gas',36,'cooktop'],
  ['monogram','ZGU36RSLSS','Monogram ZGU36RSLSS 36" Gas',2900,82,'WORSE','cooktop','gas',36,'cooktop'],
  ['thermador','SGSX365TS','Thermador Masterpiece Star SGSX365TS 36"',2570,79,'WORSE','cooktop','gas',36,'cooktop'],
  ['sks','UPCG3654ST','SKS UPCG3654ST 36" Gas',2299,75,'BETTER','cooktop','gas',36,'cooktop'],
  ['ge-profile','PGP7036SLSS','GE Profile PGP7036SLSS 36" Gas',1400,75,'BETTER','cooktop','gas',36,'cooktop'],
  ['viking','VGSU53616BSS','Viking 5 Series VGSU53616BSS 36"',3240,74,'WORSE','cooktop','gas',36,'cooktop'],
  ['ge','JGP5036SLSS','GE JGP5036SLSS 36" Gas',900,72,'BETTER','cooktop','gas',36,'cooktop'],
  ['cafe','CGP70362NS1','Café CGP70362NS1 36" Gas',1600,71,'WORSE','cooktop','gas',36,'cooktop'],
  ['ge-profile','PGP9036SLSS','GE Profile PGP9036SLSS 36" Gas',1790,71,'BETTER','cooktop','gas',36,'cooktop'],
  ['bosch','NGM8659UC','Bosch 800 Series NGM8659UC 36"',1700,67,'WORSE','cooktop','gas',36,'cooktop'],
  ['maytag','MGC9536DS','Maytag MGC9536DS 36" Gas',1180,66,'WORSE','cooktop','gas',36,'cooktop'],
  ['samsung','NA30N7755TG','Samsung NA30N7755TG 30" Gas',1400,89,'BETTER','cooktop','gas',30,'cooktop'],
  ['samsung','NA30N6555TS','Samsung NA30N6555TS 30" Gas',1100,86,'BETTER','cooktop','gas',30,'cooktop'],
  ['lg','CBGJ3023S','LG CBGJ3023S 30" Gas',800,83,'BETTER','cooktop','gas',30,'cooktop'],
  ['monogram','ZGU30RSLSS','Monogram ZGU30RSLSS 30" Gas',2500,82,'WORSE','cooktop','gas',30,'cooktop'],
  ['lg','CBGJ3027S','LG CBGJ3027S 30" Gas',1000,80,'BETTER','cooktop','gas',30,'cooktop'],
  ['thermador','SGSX305TS','Thermador Masterpiece Star SGSX305TS 30"',2400,79,'WORSE','cooktop','gas',30,'cooktop'],
  ['bosch-benchmark','NGMP059UC','Bosch Benchmark NGMP059UC 30" Gas',1995,76,'WORSE','cooktop','gas',30,'cooktop'],
  ['samsung','NA30R5310FS','Samsung NA30R5310FS 30" Gas',650,75,'BETTER','cooktop','gas',30,'cooktop'],
  ['ge-profile','PGP7030SLSS','GE Profile PGP7030SLSS 30" Gas',1200,75,'BETTER','cooktop','gas',30,'cooktop'],

  // COOKTOPS — smoothtop electric
  ['kitchenaid','KCED606GBL','KitchenAid KCED606GBL 36" Smoothtop',2250,90,'BETTER','cooktop','electric',36,'cooktop'],
  ['whirlpool','WCE55US6HB','Whirlpool WCE55US6HB 36" Smoothtop',840,85,'BETTER','cooktop','electric',36,'cooktop'],
  ['frigidaire','PCCE3680AF','Frigidaire Professional PCCE3680AF 36"',1255,82,'BETTER','cooktop','electric',36,'cooktop'],
  ['kitchenaid','KCED600GSS','KitchenAid KCED600GSS 30" Smoothtop',2250,90,'BETTER','cooktop','electric',30,'cooktop'],
  ['kitchenaid','KCES550HBL','KitchenAid KCES550HBL 30" Smoothtop',1100,89,'BETTER','cooktop','electric',30,'cooktop'],
  ['lg','LCE3010SB','LG LCE3010SB 30" Smoothtop',530,88,'BETTER','cooktop','electric',30,'cooktop'],
  ['maytag','MEC8830HB','Maytag MEC8830HB 30" Smoothtop',1120,88,'BETTER','cooktop','electric',30,'cooktop'],
  ['ge','JEP5030DTBB','GE JEP5030DTBB 30" Smoothtop',800,88,'BETTER','cooktop','electric',30,'cooktop'],
  ['sharp','SCR3041GB','Sharp SCR3041GB 30" Smoothtop',580,87,'-','cooktop','electric',30,'cooktop'],
  ['thermador','CET305YB','Thermador Masterpiece CET305YB 30"',2200,85,'BETTER','cooktop','electric',30,'cooktop'],
  ['miele','KM5624','Miele KM 5624 30" Smoothtop',2250,82,'-','cooktop','electric',30,'cooktop'],
  ['whirlpool','WCE77US0HB','Whirlpool WCE77US0HB 30" Smoothtop',900,81,'BETTER','cooktop','electric',30,'cooktop'],
  ['frigidaire','FFEC3025UB','Frigidaire FFEC3025UB 30" Smoothtop',630,81,'BETTER','cooktop','electric',30,'cooktop'],
  ['samsung','NZ30FG5332RKAA','Samsung NZ30FG5332RKAA 30" Smoothtop',900,79,'WORSE','cooktop','electric',30,'cooktop'],
  ['ge','JP3030DWBB','GE JP3030DWBB 30" Smoothtop',550,77,'BETTER','cooktop','electric',30,'cooktop'],
  ['whirlpool','WCE55US0HB','Whirlpool WCE55US0HB 30" Smoothtop',600,77,'BETTER','cooktop','electric',30,'cooktop'],
  ['samsung','NZ30R5330RK','Samsung NZ30R5330RK 30" Smoothtop',390,61,'WORSE','cooktop','electric',30,'cooktop'],

  // COOKTOPS — induction
  ['lg','CBIH3613BE','LG CBIH3613BE 36" Induction',1285,96,'-','cooktop','induction',36,'cooktop'],
  ['lg-studio','CBIS3618BE','LG Studio CBIS3618BE 36" Induction',2725,96,'-','cooktop','induction',36,'cooktop'],
  ['monogram','ZHU36RSTSS','Monogram ZHU36RSTSS 36" Induction',3595,94,'WORSE','cooktop','induction',36,'cooktop'],
  ['cafe','CHP90362TSS','Café CHP90362TSS 36" Induction',2700,93,'WORSE','cooktop','induction',36,'cooktop'],
  ['kitchenaid','KCIG556JBL','KitchenAid KCIG556JBL 36" Induction',2000,80,'WORSE','cooktop','induction',36,'cooktop'],
  ['bosch','NIT8060UC','Bosch 800 Series NIT8060UC 30" Induction',2380,98,'BETTER','cooktop','induction',30,'cooktop'],
  ['electrolux','ECCI3068AS','Electrolux ECCI3068AS 30" Induction',1860,95,'BETTER','cooktop','induction',30,'cooktop'],
  ['thermador','CIT30YWBB','Thermador Freedom CIT30YWBB 30" Induction',5800,93,'WORSE','cooktop','induction',30,'cooktop'],
  ['miele','KM7730FR','Miele KM 7730 FR 30" Induction',2600,91,'WORSE','cooktop','induction',30,'cooktop'],
  ['frigidaire','PCCI3080AF','Frigidaire Professional PCCI3080AF 30" Induction',1855,91,'BETTER','cooktop','induction',30,'cooktop'],
  ['dacor','DTI30P876BB','Dacor Transitional DTI30P876BB 30" Induction',2500,90,'WORSE','cooktop','induction',30,'cooktop'],
  ['samsung','NZ30A3060UK','Samsung NZ30A3060UK 30" Induction',1040,90,'WORSE','cooktop','induction',30,'cooktop'],
  ['viking','RVIC3304BBG','Viking RVIC3304BBG 30" Induction',2900,85,'-','cooktop','induction',30,'cooktop'],
  ['whirlpool','WCI55US0JB','Whirlpool WCI55US0JB 30" Induction',1050,78,'WORSE','cooktop','induction',30,'cooktop'],
];

// =====================================================================
// New refrigerators — style/depth/width inferred from article section
// brand-id, model, name, price, cr_overall, cr_reliability, style, depth, width_in
// =====================================================================
const NEW_FRIDGES = [
  // Top freezers, 31"+
  ['lg','LRTLS2403S','LG LRTLS2403S Top-Freezer',900,76,'BETTER','top_freezer','standard',33],
  // Top freezers, 29-30"
  ['lg','LTCS20030S','LG LTCS20030S Top-Freezer',899,76,'BETTER','top_freezer','standard',30],
  ['samsung','RT18DG6700SRAA','Samsung RT18DG6700SRAA Top-Freezer',895,75,'BETTER','top_freezer','standard',30],
  ['frigidaire','FRTD2021AW','Frigidaire FRTD2021AW Top-Freezer',885,68,'BETTER','top_freezer','standard',30],
  ['frigidaire','FFHT2022AW','Frigidaire FFHT2022AW Top-Freezer',723,67,'BETTER','top_freezer','standard',30],
  ['hisense','HRT180N6ABE','Hisense HRT180N6ABE Top-Freezer',599,66,'-','top_freezer','standard',30],
  // Top freezers, 28" and narrower
  ['samsung','RT70F18LRSR','Samsung RT70F18LRSR Top-Freezer',579,82,'BETTER','top_freezer','standard',28],
  ['samsung','RT16A6195SR','Samsung RT16A6195SR Top-Freezer',762,78,'BETTER','top_freezer','standard',28],
  ['lg','LT11C2000V','LG LT11C2000V Top-Freezer',645,75,'BETTER','top_freezer','standard',24],
  ['whirlpool','WRT112CZJZ','Whirlpool WRT112CZJZ Top-Freezer',628,74,'BETTER','top_freezer','standard',24],
  ['frigidaire','FFHT1425VV','Frigidaire FFHT1425VV Top-Freezer',623,70,'BETTER','top_freezer','standard',28],
  ['hotpoint','HPS16BTNRWW','Hotpoint HPS16BTNRWW Top-Freezer',775,69,'BETTER','top_freezer','standard',28],
  ['insignia','NS-RTM14SS5','Insignia NS-RTM14SS5 Top-Freezer',490,66,'-','top_freezer','standard',28],
  ['ge','GTE17DTNRWW','GE GTE17DTNRWW Top-Freezer',713,66,'BETTER','top_freezer','standard',28],
  ['whirlpool','WRT313CZLZ','Whirlpool WRT313CZLZ Top-Freezer',668,65,'BETTER','top_freezer','standard',28],
  ['summit','FF1142PLLHD','Summit Appliances FF1142PLLHD',968,55,'-','top_freezer','standard',24],
  // Bottom freezers
  ['lg','LRDCS2603S','LG LRDCS2603S Easy-Access Bottom-Freezer',1599,84,'BETTER','bottom_freezer','standard',33],
  ['miele','KFN4776ED','Miele KFN 4776 ED Bottom-Freezer Column',2800,84,'-','bottom_freezer','built_in',24],
  ['lg','LBNC15231V','LG LBNC15231V Bottom-Freezer',1295,77,'BETTER','bottom_freezer','counter',24],
  ['miele','KFN4799DDE','Miele KFN 4799 DDE Bottom-Freezer Column',3599,77,'-','bottom_freezer','built_in',24],
  ['ge','GDE21EYKFS','GE GDE21EYKFS Bottom-Freezer',1800,76,'BETTER','bottom_freezer','standard',30],
  ['ikea','VALGRUNDAD','Ikea Valgrundad 704.621.58 Bottom-Freezer',1300,74,'-','bottom_freezer','counter',24],
  ['amana','ABB1924BRM','Amana ABB1924BRM Bottom-Freezer',1449,74,'BETTER','bottom_freezer','standard',30],
  ['frigidaire','GRBN2012AF','Frigidaire GRBN2012AF Bottom-Freezer',1343,74,'-','bottom_freezer','standard',30],
  ['haier','HRB15N3BGS','Haier HRB15N3BGS Bottom-Freezer',1260,70,'-','bottom_freezer','counter',24],
  // French-doors, 34"+
  ['ge','GYE22GYNFS','GE GYE22GYNFS Counter-Depth French Door',2195,79,'WORSE','french_door','counter',36],
  ['lg','LRMXS2806S','LG LRMXS2806S French Door',1800,77,'WORSE','french_door','counter',36],
  ['lg','LF29S8365S','LG LF29S8365S French Door',2700,77,'WORSE','french_door','standard',36],
  ['lg','LRFS28XBS','LG LRFS28XBS French Door',1695,76,'WORSE','french_door','standard',36],
  ['ge','GWE23GENDS','GE GWE23GENDS Counter-Depth French Door',2783,76,'WORSE','french_door','counter',36],
  ['lg','LRFWS2906S','LG LRFWS2906S French Door',1700,75,'WORSE','french_door','counter',36],
  ['bosch','B36FD50SNS','Bosch B36FD50SNS Counter-Depth',2999,75,'BETTER','french_door','counter',36],
  ['lg','LRFLS3206S','LG LRFLS3206S French Door',1795,75,'WORSE','french_door','standard',36],
  ['lg','LRMDS3006S','LG LRMDS3006S French Door',2999,75,'WORSE','french_door','counter',36],
  ['ge','GFE28GYNFS','GE GFE28GYNFS French Door',2025,75,'WORSE','french_door','standard',36],
  ['lg','LRFCS29D6S','LG LRFCS29D6S French Door',1499,75,'WORSE','french_door','counter',36],
  ['lg','LF30S8210S','LG LF30S8210S French Door',1835,75,'WORSE','french_door','standard',36],
  ['lg','LF29S8330D','LG LF29S8330D French Door',2697,75,'WORSE','french_door','counter',36],
  ['lg','LMXS28626S','LG LMXS28626S French Door',1524,75,'WORSE','french_door','counter',36],
  ['lg','LRFWS2906V','LG LRFWS2906V French Door',1999,74,'WORSE','french_door','counter',36],
  ['lg','LRFLS3216S','LG LRFLS3216S French Door',1600,74,'WORSE','french_door','standard',36],
  ['bosch','B36CL81ENW','Bosch B36CL81ENW Built-in French Door',4799,74,'BETTER','french_door','built_in',36],
  ['bosch','B36CD52SNS','Bosch B36CD52SNS Counter-Depth',2970,74,'BETTER','french_door','counter',36],
  ['lg','LRYKS3106S','LG LRYKS3106S French Door',3075,74,'WORSE','french_door','counter',36],
  ['lg','LF29H8330S','LG LF29H8330S French Door',2199,73,'WORSE','french_door','counter',36],
  ['lg','LRMDC2306S','LG LRMDC2306S French Door',2999,73,'WORSE','french_door','counter',36],
  ['ge-profile','PGD29BYTFS','GE Profile PGD29BYTFS French Door',2799,73,'WORSE','french_door','counter',36],
  ['ge-profile','PGE29BYTFS','GE Profile PGE29BYTFS French Door',2599,73,'WORSE','french_door','counter',36],
  ['lg-studio','SRFB27W3','LG Studio SRFB27W3 French Door',3095,73,'WORSE','french_door','counter',36],
  ['dacor','DRF36C500SR','Dacor DRF36C500SR French Door',3299,72,'WORSE','french_door','counter',36],
  ['lg','LRFOC2606S','LG LRFOC2606S French Door',3499,72,'WORSE','french_door','counter',36],
  ['kitchenaid','KRFC704FBS','KitchenAid KRFC704FBS Counter-Depth',4198,72,'WORSE','french_door','counter',36],
  ['lg','LRFLC2716S','LG LRFLC2716S French Door',1795,72,'WORSE','french_door','counter',36],
  ['hisense','HRM260N6TSE','Hisense HRM260N6TSE French Door',1500,72,'-','french_door','counter',36],
  ['lg','LRFXS3106S','LG LRFXS3106S French Door',2200,71,'WORSE','french_door','counter',36],
  ['viking','RVFFR336SS','Viking RVFFR336SS French Door',4149,71,'-','french_door','built_in',36],
  ['ikea','OVERSKADLIG','Ikea Overskadlig 60462154 French Door',3000,71,'-','french_door','counter',36],
  ['lg','LF25G8330S','LG LF25G8330S French Door',2395,71,'WORSE','french_door','counter',36],
  ['kucht','KR900X','Kucht Professional KR900X French Door',2900,70,'-','french_door','standard',36],
  ['ge','GWE22JYMFS','GE GWE22JYMFS Counter-Depth French Door',1573,70,'WORSE','french_door','counter',36],
  ['whirlpool','WRX735SDHZ','Whirlpool WRX735SDHZ French Door',2098,70,'WORSE','french_door','standard',36],
  ['kitchenaid','KRQC506MPS','KitchenAid KRQC506MPS Counter-Depth',2500,70,'WORSE','french_door','counter',36],
  ['kitchenaid','KRMF706EBS','KitchenAid KRMF706EBS French Door',3898,70,'WORSE','french_door','standard',36],
  ['kitchenaid','KRMF536RPS','KitchenAid KRMF536RPS French Door',2998,70,'WORSE','french_door','standard',36],
  ['zline','RFM-W-36','ZLINE RFM-W-36 French Door',4600,70,'-','french_door','built_in',36],
  // French-doors, 31-33"
  ['lg','LF25H6330S','LG LF25H6330S French Door',2098,76,'WORSE','french_door','counter',33],
  ['lg','LF25H6200S','LG LF25H6200S French Door',1399,73,'WORSE','french_door','counter',33],
  ['lg','LF21G6200S','LG LF21G6200S French Door',1300,73,'WORSE','french_door','counter',33],
  // Built-in French-doors
  ['dacor','DRF485300AP','Dacor DRF485300AP Built-In French Door 48"',12499,83,'WORSE','french_door','built_in',48],
  ['dacor','DRF367500AP','Dacor DRF367500AP Built-In French Door 36"',9499,82,'WORSE','french_door','built_in',36],
  ['thermador','T36IT100NP','Thermador Freedom T36IT100NP Built-In',10799,79,'BETTER','french_door','built_in',36],
  ['sks','SKSFD4826P','SKS SKSFD4826P Built-In French Door 48"',16000,79,'WORSE','french_door','built_in',48],
  // Built-in bottom-freezers / columns
  ['thermador','T30IB905SP','Thermador Freedom T30IB905SP Built-In Column',9499,77,'BETTER','column','built_in',30],
  ['zline','RBIV-304-30','ZLINE RBIV-304-30 Built-In',6799,73,'-','column','built_in',30],
  ['sub-zero','DET3050CIID','Sub-Zero Designer DET3050CIID',10600,70,'BETTER','column','built_in',30],
  ['kitchenaid','KBBR306ESS','KitchenAid KBBR306ESS Built-In',8138,67,'WORSE','bottom_freezer','built_in',30],
  ['viking','FDBB5364L','Viking FDBB5364L Built-In',11260,67,'-','bottom_freezer','built_in',36],
];

// =====================================================================
// Apply
// =====================================================================
function makeId(brand, model) {
  return slug(brand) + '-' + slug(model);
}

function buildDishwasher([brand, model, name, price, overall, rel]) {
  return {
    id: makeId(brand, model),
    brand: brand,
    model: model,
    name: name,
    tub: null,
    decibels: null,
    place_settings: null,
    third_rack: null,
    energy_kwh_yr: null,
    water_gal_cycle: null,
    energy_star: null,
    wifi: null,
    panel_ready: null,
    msrp: null,
    street_price: price,
    ratings: {
      cr_overall: overall,
      cr_reliability: relCat(rel),
      yale_reliability_pct: null,
      reviewed: null,
      source_urls: { cr: crUrl('dishwashers') },
    },
    pros: [],
    cons: [],
    release_year: null,
  };
}

function buildOven([brand, model, name, price, overall, rel, type, fuel, width, style]) {
  return {
    id: makeId(brand, model),
    brand: brand,
    model: model,
    name: name,
    type: type,
    fuel: fuel || null,
    style: style || null,
    width_in: width || null,
    oven_capacity_cf: null,
    burners: null,
    max_burner_btu: null,
    max_burner_w: null,
    convection: null,
    air_fry: null,
    self_clean: null,
    msrp: null,
    street_price: price,
    ratings: {
      cr_overall: overall,
      cr_reliability: relCat(rel),
      yale_reliability_pct: null,
      reviewed: null,
      source_urls: { cr: crUrl(type === 'cooktop' ? 'cooktops' : 'ovens') },
    },
    pros: [],
    cons: [],
    release_year: null,
  };
}

function buildFridge([brand, model, name, price, overall, rel, style, depth, width]) {
  return {
    id: makeId(brand, model),
    brand: brand,
    model: model,
    name: name,
    style: style,
    depth: depth,
    width_in: width,
    capacity_cf: null,
    msrp: null,
    street_price: price,
    energy_kwh_yr: null,
    energy_star: null,
    noise_db: null,
    icemaker: null,
    water_dispenser: null,
    wifi: null,
    compressor: null,
    finishes: null,
    ratings: {
      cr_overall: overall,
      cr_reliability: relCat(rel),
      yale_reliability_pct: null,
      reviewed: null,
      source_urls: { cr: crUrl('refrigerators') },
    },
    pros: [],
    cons: [],
    release_year: null,
  };
}

function addToFile(category, builder, rows) {
  const file = path.join(ROOT, 'public', 'data', category + '.json');
  const data = JSON.parse(fs.readFileSync(file, 'utf8'));
  const existingIds = new Set(data.models.map(m => m.id));
  let added = 0, dupes = 0;
  rows.forEach(row => {
    const entry = builder(row);
    if (existingIds.has(entry.id)) { dupes++; return; }
    data.models.push(entry);
    existingIds.add(entry.id);
    added++;
  });
  if (data._meta) data._meta.last_updated = '2026-04-25';
  fs.writeFileSync(file, JSON.stringify(data, null, 2) + '\n');
  return { added, dupes };
}

function addBrands() {
  const file = path.join(ROOT, 'public', 'data', 'brands.json');
  const data = JSON.parse(fs.readFileSync(file, 'utf8'));
  const existing = new Set(data.brands.map(b => b.id));
  let added = 0;
  NEW_BRANDS.forEach(b => {
    if (existing.has(b.id)) return;
    data.brands.push({
      id: b.id,
      name: b.name,
      tier: b.tier,
      country: b.country,
      service_rate_overall: null,
      service_rate_source: null,
      cr_best_brand_2026: [],
      cr_reliability: null,
      notes: b.notes,
    });
    added++;
  });
  data._meta.last_updated = '2026-04-25';
  fs.writeFileSync(file, JSON.stringify(data, null, 2) + '\n');
  return added;
}

const brandsAdded = addBrands();
const dwResult = addToFile('dishwashers',   buildDishwasher, NEW_DISHWASHERS);
const ovResult = addToFile('ovens',         buildOven,       NEW_OVENS);
const frResult = addToFile('refrigerators', buildFridge,     NEW_FRIDGES);

console.log('Brands added:       ' + brandsAdded);
console.log('Dishwashers added:  ' + dwResult.added + ' (skipped dupes: ' + dwResult.dupes + ')');
console.log('Ovens added:        ' + ovResult.added + ' (skipped dupes: ' + ovResult.dupes + ')');
console.log('Refrigerators added:' + frResult.added + ' (skipped dupes: ' + frResult.dupes + ')');
