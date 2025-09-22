// scraper/scrape_kfive_to_json.js
// Ejecuta: npm start (desde la carpeta scraper) o node scraper/scrape_kfive_to_json.js
// Salida: ../data/products.json y ../data/kfive_captura_con_50.csv

const fs = require('fs');
const path = require('path');
const puppeteer = require('puppeteer');

const ROOT = path.join(__dirname, '..');
const DATA_DIR = path.join(ROOT, 'data');

const MARKUP = parseFloat(process.env.MARKUP_PCT || '50'); // % por env, default 50

const toNumber = (s='') => {
  const t = s.replace(/\s/g,'')
    .replace(/[^\d.,-]/g,'')
    .replace(/\.(?=\d{3}(\D|$))/g,'')
    .replace(',', '.');
  const n = Number(t);
  return isNaN(n) ? 0 : n;
};

async function extractProducts(page) {
  return await page.evaluate(() => {
    const toNumber = (s='') => {
      const t = s.replace(/\s/g,'')
        .replace(/[^\d.,-]/g,'')
        .replace(/\.(?=\d{3}(\D|$))/g,'')
        .replace(',', '.');
      const n = Number(t);
      return isNaN(n) ? 0 : n;
    };

    const nodes = [...document.querySelectorAll('a, article, div')];
    const cards = nodes.filter(el => {
      const text = el.innerText || '';
      const hasPrice = /\$\s?\d{1,3}(?:\.\d{3})*(?:,\d{1,2})?/.test(text);
      const hasImg = !!el.querySelector('img');
      return hasPrice && hasImg;
    });

    const rows = [];
    const seen = new Set();

    cards.forEach(card => {
      const tEl = card.querySelector('h3,h2,h4,[class*="title"],[class*="titulo"],[class*="nombre"]');
      let title = (tEl?.innerText || '').trim();
      if (!title) {
        const lines = (card.innerText || '').split('\n').map(s=>s.trim()).filter(Boolean);
        const sorted = [...lines].sort((a,b)=>b.length-a.length);
        title = (sorted.find(x=>!x.includes('$')) || '').slice(0,120);
      }

      const priceMatch = (card.innerText || '').match(/\$\s?\d{1,3}(?:\.\d{3})*(?:,\d{1,2})?/);
      const basePrice = toNumber(priceMatch ? priceMatch[0] : '');

      const imgEl = card.querySelector('img');
      const image = imgEl?.currentSrc || imgEl?.src || '';

      if (!title || !basePrice) return;
      const key = title + '|' + basePrice + '|' + (image || '');
      if (seen.has(key)) return;
      seen.add(key);

      rows.push({ title, basePrice, image });
    });

    return rows;
  });
}

(async () => {
  const browser = await puppeteer.launch({ headless: true });
  const page = await browser.newPage();
  page.setDefaultNavigationTimeout(120000);

  await page.goto('https://kfivehome.com.ar/shop', { waitUntil: 'networkidle2' });

  // scrolleo lazy
  for (let i=0;i<12;i++) {
    await page.evaluate(() => window.scrollBy(0, document.body.scrollHeight));
    await page.waitForTimeout(1200);
  }

  let items = await extractProducts(page);

  // intentar botones ver más / next
  for (let i=0; i<15; i++) {
    const clicked = await page.evaluate(() => {
      const btn = [...document.querySelectorAll('button, a')]
        .find(b => /ver más|cargar más|siguiente|más productos|more|next/i.test(b.innerText || ''));
      if (btn) { btn.click(); return true; }
      return false;
    });
    if (!clicked) break;
    await page.waitForTimeout(2000);
    const more = await extractProducts(page);
    items = items.concat(more);
  }

  const enriched = items.map(p => ({
    title: p.title,
    basePrice: p.basePrice,
    finalPrice: Math.round(p.basePrice * (1 + MARKUP/100)),
    image: p.image,
    category: 'General'
  }));

  // Asegurar carpeta data
  fs.mkdirSync(DATA_DIR, { recursive: true });

  // JSON
  const jsonPath = path.join(DATA_DIR, 'products.json');
  fs.writeFileSync(jsonPath, JSON.stringify({ updatedAt: new Date().toISOString(), markupPct: MARKUP, items: enriched }, null, 2), 'utf8');

  // CSV auxiliar
  const header = ['title','basePrice','finalPrice','image','category'];
  const lines = [header.join(',')].concat(
    enriched.map(r => [
      `"${(r.title||'').replace(/"/g,'""')}"`,
      r.basePrice,
      r.finalPrice,
      `"${(r.image||'').replace(/"/g,'""')}"`,
      `"${(r.category||'General').replace(/"/g,'""')}"`
    ].join(','))
  );
  const csvPath = path.join(DATA_DIR, 'kfive_captura_con_50.csv');
  fs.writeFileSync(csvPath, lines.join('\n'), 'utf8');

  console.log(`OK -> ${enriched.length} productos`);
  console.log(`JSON: ${jsonPath}`);
  console.log(`CSV:  ${csvPath}`);

  await browser.close();
})().catch(err => {
  console.error(err);
  process.exit(1);
});
