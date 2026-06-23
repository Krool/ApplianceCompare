// Generates public/og.png — the 1200x630 social-share card for Chef's Choice.
// Uses sharp (already a dep) to rasterize an on-brand SVG. No browser needed.
// Run: node scripts/make-og.mjs   (then rebuild so Vite copies public/ -> docs/)
import sharp from 'sharp';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const out = join(__dirname, '..', 'public', 'og.png');

// Brand palette (matches index.html boot styles + the app's --serif/accent).
const PAPER = '#F4EEDF';
const PAPER_DEEP = '#EAE2CC';
const INK = '#1a1814';
const MUTED = '#6b6557';
const ACCENT = '#b8431f';

const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="630" viewBox="0 0 1200 630">
  <rect width="1200" height="630" fill="${PAPER}"/>
  <rect x="0" y="0" width="1200" height="14" fill="${ACCENT}"/>
  <rect x="40" y="54" width="1120" height="522" fill="none" stroke="${PAPER_DEEP}" stroke-width="2" rx="14"/>

  <text x="90" y="150" font-family="Georgia, 'Times New Roman', serif" font-size="34" fill="${MUTED}"
        letter-spacing="6" text-transform="uppercase">KITCHEN APPLIANCE RESEARCH</text>

  <text x="86" y="290" font-family="Georgia, 'Times New Roman', serif" font-size="132" font-weight="700" fill="${INK}">
    Chef’s <tspan font-style="italic" fill="${ACCENT}">Choice</tspan>
  </text>

  <text x="90" y="380" font-family="Arial, Helvetica, sans-serif" font-size="40" fill="${INK}">
    Aggregated ratings from the sources you trust
  </text>

  <text x="90" y="446" font-family="Arial, Helvetica, sans-serif" font-size="32" fill="${MUTED}">
    Consumer Reports &#183; Wirecutter &#183; Reviewed &#183; Yale &#183; Rtings
  </text>

  <line x1="90" y1="486" x2="1110" y2="486" stroke="${PAPER_DEEP}" stroke-width="2"/>

  <text x="90" y="540" font-family="Arial, Helvetica, sans-serif" font-size="30" fill="${INK}">
    ~200 fridges, dishwashers &amp; ranges, scored and ranked
  </text>
  <text x="1110" y="540" text-anchor="end" font-family="Georgia, serif" font-size="30" fill="${ACCENT}">krool.github.io</text>
</svg>`;

await sharp(Buffer.from(svg)).png().toFile(out);
console.log('Wrote', out);
