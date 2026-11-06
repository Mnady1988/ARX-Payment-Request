// Pre-renders every offer page as an image (same Chromium engine as the laptop) so the PDF is identical on all devices.
// Usage: serve the repo on http://localhost:8765, then: node tools/prerender.js
// Re-run whenever unit data, images or page design change.
const { chromium } = require('playwright');
const fs = require('fs'), path = require('path');
const OUT = path.join(__dirname, '..', 'offer', 'pdf');
const SCALE = 1.5, Q = 80;
const FONTS = process.env.FONT_CSS ? fs.readFileSync(process.env.FONT_CSS) : null;
(async () => {
  fs.mkdirSync(OUT, { recursive: true });
  const b = await chromium.launch();
  const p = await b.newPage({ viewport: { width: 1300, height: 900 }, deviceScaleFactor: SCALE });
  if (FONTS) {
    await p.route('**/fonts.googleapis.com/**', r => r.fulfill({ body: FONTS, contentType: 'text/css' }));
    await p.route('http://fonts.local/**', r => { const u = new URL(r.request().url()); const [d, f] = u.pathname.slice(1).split('/'); r.fulfill({ body: fs.readFileSync(process.env.FONT_DIR + d + '/files/' + f), contentType: 'font/woff2' }); });
  }
  await p.goto('http://localhost:8765/');
  await p.waitForTimeout(1500);
  await p.evaluate(() => showTab('offer'));
  const U = await p.evaluate(() => window.ASSL_UNITS);
  const MF = path.join(OUT, 'manifest.json');
  const manifest = fs.existsSync(MF) ? JSON.parse(fs.readFileSync(MF)).pages : {};
  const save = () => fs.writeFileSync(MF, JSON.stringify({ w: 1122.52, h: 793.7, scale: SCALE, pages: manifest }));
  const done = new Set();
  async function make(type, building, floor, ap) {
    await p.evaluate(([t, bd, fl, u]) => {
      const set = (id, v) => { const e = document.getElementById(id); e.value = v; e.dispatchEvent(new Event('change')); e.dispatchEvent(new Event('input')); };
      set('of-type', t); set('of-building', bd); set('of-floor', fl); set('of-unit', String(u)); set('of-price', '9500000');
      generateOffer(); document.getElementById('offer-pages').classList.add('tpl');
      document.getElementById('offer-pages').style.zoom = 1;
    }, [type, building, floor, ap]);
    await p.evaluate(() => window.__cropsReady);
    await p.evaluate(() => document.fonts.ready);
    await p.waitForTimeout(150);
  }
  async function shot(i, name) {
    if (done.has(name)) return; done.add(name);
    if (fs.existsSync(path.join(OUT, name)) && (manifest[name] || !/^(cover|pay)_/.test(name))) return;
    const sec = (await p.$$('#offer-pages section.op'))[i];
    await sec.screenshot({ path: path.join(OUT, name), type: 'jpeg', quality: Q });
    const dyn = await sec.evaluate(s => {
      const P = s.getBoundingClientRect();
      return [...s.querySelectorAll('.dyn')].map(e => { const r = e.getBoundingClientRect(), c = getComputedStyle(e);
        const col = getComputedStyle(e.parentElement).color;
        return { k: e.dataset.k, x: r.left - P.left, y: r.top - P.top, w: r.width, h: r.height,
          font: `${c.fontWeight} ${c.fontSize} ${c.fontFamily}`, size: parseFloat(c.fontSize), color: col, ls: parseFloat(c.letterSpacing) || 0 }; });
    });
    if (dyn.length) manifest[name] = dyn;
  }
  const floors = ['G', '1', '2', '3', '4', '5', '6'];
  for (const [t, d] of Object.entries(U)) {
    for (const bd of d.buildings) {
      for (const fl of floors) {
        await make(t, bd, fl, 0);
        await shot(0, `cover_${bd}_${fl}.jpg`);
        if (fl === 'G') { await shot(1, 'life.jpg'); await shot(2, 'location.jpg'); await shot(3, `mp_${bd}.jpg`); await shot(6, `pay_${bd}.jpg`); }
      }
    }
    for (const fl of ['G', '1']) {
      const n = d[fl === 'G' ? 'G' : 'T'].length, gt = fl === 'G' ? 'G' : 'T';
      for (let a = 0; a < n; a++) {
        await make(t, d.buildings[0], fl, a);
        const ap = String(a + 1).padStart(2, '0');
        await shot(4, `floor_${t}_${gt}_${ap}.jpg`); await shot(5, `unit_${t}_${gt}_${ap}.jpg`);
      }
    }
    save(); console.log('type', t, 'done', done.size);
    await p.reload(); await p.waitForTimeout(1500); await p.evaluate(() => showTab('offer'));
  }
  save();
  console.log('images', done.size);
  await b.close();
})();
