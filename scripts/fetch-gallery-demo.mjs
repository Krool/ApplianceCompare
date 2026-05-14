// One-off: download Bosch's product gallery images for bosch-b36it905np
// and stitch them into the model's `images` array, so the gallery UI has
// a real demo on production. Existing best_buy canonical stays as the
// primary entry (so list thumbnails are unchanged).

import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';

const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0 Safari/537.36';

// Bosch gallery URLs discovered via JSON-LD scrape. Hand-picked to skip
// duplicates (PNG vs WebP of the same shot) and line-drawing schematics.
const galleryUrls = [
  'https://media3.bsh-group.com/Product_Shots/MCSA02713157_i8775_2057213_B36IT900NP_K_def.webp',
  'https://media3.bsh-group.com/Product_Shots/MCSA02713158_i8776_2057214_B36IT900NP_PGA1_def.webp',
  'https://media3.bsh-group.com/Product_Shots/MCSA02713159_i8777_2057215_B36IT900NP_PGA2_Korr_def.webp',
  'https://media3.bsh-group.com/Product_Shots/MCSA02434053_i4988_1813781_B36IT900NP_PGA3_def.webp',
  'https://media3.bsh-group.com/Product_Shots/MCSA02434044_i4983_1813772_B36IT900NP_PGA4_def.webp',
  'https://media3.bsh-group.com/Product_Shots/MCSA02713156_i8774_2057212_B36IT900NP_PGA5_def.webp',
  'https://media3.bsh-group.com/Product_Shots/MCSA02713162_i8780_2057218_B36IT900NP_PGA6_def.webp',
];

const id = 'bosch-b36it905np';
const cat = 'refrigerators';
const dataPath = path.join('public/data', cat + '.json');
const data = JSON.parse(fs.readFileSync(dataPath, 'utf8'));
const model = data.models.find(m => m.id === id);
if (!model) { console.error('Model not found'); process.exit(1); }

const imgDir = path.join('public/data/images', cat);
fs.mkdirSync(imgDir, { recursive: true });

const canonical = { local: model.image.local, source_url: model.image.source_url, source: model.image.source, view: 'primary' };
const downloaded = [];
const seenHashes = new Set();

// Hash the canonical so we don't add a duplicate of it
const canonicalPath = path.join('public/data', model.image.local);
if (fs.existsSync(canonicalPath)) {
  seenHashes.add(crypto.createHash('sha1').update(fs.readFileSync(canonicalPath)).digest('hex'));
}

for (let i = 0; i < galleryUrls.length; i++) {
  const url = galleryUrls[i];
  process.stdout.write('  fetching ' + url.slice(-60) + ' ... ');
  try {
    const r = await fetch(url, { headers: { 'User-Agent': UA }, redirect: 'follow' });
    if (!r.ok) { console.log('HTTP ' + r.status); continue; }
    const buf = Buffer.from(await r.arrayBuffer());
    if (buf.length < 4096) { console.log('too small'); continue; }
    const h = crypto.createHash('sha1').update(buf).digest('hex');
    if (seenHashes.has(h)) { console.log('duplicate'); continue; }
    seenHashes.add(h);
    const ext = url.endsWith('.png') ? 'png' : 'webp';
    const filename = `${id}-g${downloaded.length + 1}.${ext}`;
    fs.writeFileSync(path.join(imgDir, filename), buf);
    downloaded.push({
      local: `images/${cat}/${filename}`,
      source_url: url,
      source: 'manufacturer',
      view: 'g' + (downloaded.length + 1),
    });
    console.log('OK ' + Math.round(buf.length/1024) + 'KB');
  } catch (e) {
    console.log('err ' + e.message);
  }
}

model.images = [canonical, ...downloaded];
model.last_updated = '2026-05-14';
fs.writeFileSync(dataPath, JSON.stringify(data, null, 2) + '\n');

console.log('\nWrote ' + downloaded.length + ' gallery alt views for ' + id);
console.log('model.images now has ' + model.images.length + ' entries');
