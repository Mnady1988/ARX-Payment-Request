// ── GENERATE OFFER ──
// Builds a multi-page A4 offer (cover, project, building, floor plan, 3 payment plans, schedules)
// for one Assl unit, using the payment plans loaded from the "Project Payments" sheet.
(function () {
  const U = window.ASSL_UNITS;
  const IMG = 'offer/img/';
  const $ = id => document.getElementById(id);
  const val = id => ($(id) ? $(id).value.trim() : '');
  const FLOORS = [
    { v: 'G', label: 'Ground floor', ar: 'الدور الأرضي' },
    { v: '1', label: 'Typical · 1st floor', ar: 'الدور الأول' },
    { v: '2', label: 'Typical · 2nd floor', ar: 'الدور الثاني' },
    { v: '3', label: 'Typical · 3rd floor', ar: 'الدور الثالث' },
    { v: '4', label: 'Typical · 4th floor', ar: 'الدور الرابع' },
    { v: '5', label: 'Typical · 5th floor', ar: 'الدور الخامس' },
    { v: '6', label: 'Typical · 6th floor', ar: 'الدور السادس' },
  ];
  const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const egp = n => Math.round(n).toLocaleString('en-US');
  const ap = i => 'AP-' + String(i + 1).padStart(2, '0');

  // ── tabs ──
  window.showTab = function (name) {
    document.querySelectorAll('.tab-btn').forEach(b => b.classList.toggle('active', b.dataset.tab === name));
    $('tab-payment').style.display = name === 'payment' ? '' : 'none';
    $('tab-offer').style.display = name === 'offer' ? '' : 'none';
    try { localStorage.setItem('arx-tab', name); } catch (e) {}
  };

  // ── form ──
  function initForm() {
    const t = $('of-type');
    t.innerHTML = '<option value="" disabled selected>Select building type</option>' +
      Object.keys(U).map(k => `<option value="${k}">Type ${k}</option>`).join('');
    const f = $('of-floor');
    f.innerHTML = '<option value="" disabled selected>Select floor</option>' +
      FLOORS.map(x => `<option value="${x.v}">${x.label}</option>`).join('');
    t.onchange = onType; f.onchange = fillUnits;
    $('of-unit').onchange = $('of-price').oninput = $('of-building').onchange = refreshOffer;
    try { if (localStorage.getItem('arx-tab') === 'offer') showTab('offer'); } catch (e) {}
  }
  function onType() {
    const k = $('of-type').value, b = $('of-building');
    b.innerHTML = U[k].buildings.map(x => `<option value="${x}">${x}</option>`).join('');
    b.disabled = false;
    fillUnits();
  }
  function fillUnits() {
    const k = $('of-type').value, fl = $('of-floor').value, u = $('of-unit');
    if (!k || !fl) { u.disabled = true; u.innerHTML = '<option value="" disabled selected>Select type and floor first</option>'; refreshOffer(); return; }
    const areas = U[k][fl === 'G' ? 'G' : 'T'];
    const prev = u.value;
    u.innerHTML = '<option value="" disabled selected>Select unit</option>' +
      areas.map((a, i) => `<option value="${i}">${ap(i)} — ${a} m²</option>`).join('');
    if (prev !== '' && +prev < areas.length) u.value = prev;
    u.disabled = false;
    refreshOffer();
  }

  // ── plans from the sheet ──
  function offerPlans() {
    const rows = (typeof SHEET !== 'undefined' ? SHEET : []).filter(r =>
      r.p === window.OFFER_PROJECT && r.insN > 0 && /standard/i.test(r.t));
    const pick = rows.length ? rows : (typeof SHEET !== 'undefined' ? SHEET : []).filter(r => r.p === window.OFFER_PROJECT && r.insN > 0);
    return pick.slice().sort((a, b) => (parseInt(a.t) || 0) - (parseInt(b.t) || 0));
  }
  function planCalc(r, price) {
    const selling = Math.round(price * (1 - (r.launch || 0)) * (1 - r.dis / 100));
    const s = buildSchedule({ systemPrice: price, sellingPrice: selling, adminAmt: 0, schedTotal: selling, r });
    const dp = s.rows.filter(x => x.desc.startsWith('DP')).reduce((a, x) => a + x.amt, 0);
    const ins = s.rows.filter(x => x.desc.startsWith('INS'));
    return {
      r, selling, sched: s, dp, ins, years: parseInt(r.t) || '', saving: price - selling,
      totalDisc: 1 - selling / price, maint: s.maintAmt + (s.maint2Amt || 0),
    };
  }

  function getOffer() {
    const k = $('of-type').value, fl = $('of-floor').value, ui = $('of-unit').value;
    const price = parseFloat($('of-price').value);
    if (!k || !fl || ui === '' || isNaN(price) || price <= 0) return null;
    const plans = offerPlans();
    if (!plans.length) return { error: 'No ' + window.OFFER_PROJECT + ' payment plans found in the sheet.' };
    const floor = FLOORS.find(x => x.v === fl);
    const area = U[k][fl === 'G' ? 'G' : 'T'][+ui];
    return {
      type: k, building: $('of-building').value, floor, ground: fl === 'G', unitIdx: +ui, unit: ap(+ui), area, price,
      client: val('of-client'), sales: val('of-sales'), mobile: val('of-mobile'),
      date: new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }),
      plans: plans.map(r => planCalc(r, price)),
    };
  }

  function refreshOffer() {
    const o = getOffer(), box = $('of-summary'), btn = $('of-btn');
    btn.disabled = !o || !!o.error;
    if (!o) { box.style.display = 'none'; return; }
    box.style.display = 'block';
    if (o.error) { box.innerHTML = `<div class="status-msg error">⚠ ${esc(o.error)}</div>`; return; }
    box.innerHTML = `<div class="sum-title">${esc(o.building)} · ${esc(o.floor.label)} · ${o.unit} · ${o.area} m²</div>` +
      `<div class="sum-row"><span class="k">Unit price</span><span class="v">EGP ${egp(o.price)}</span></div>` +
      `<hr class="sum-divider">` +
      o.plans.map(p => `<div class="sum-row"><span class="k">${p.years} years${p.totalDisc > 0.0001 ? ` <span class="pill">−${(p.totalDisc * 100).toFixed(2)}%</span>` : ''}</span><span class="v">EGP ${egp(p.selling)} · ${p.ins.length} × ${egp(p.ins[0] ? p.ins[0].amt : 0)}</span></div>`).join('');
  }

  // ── PDF pages (A4 landscape, same order as the Assl unit offer) ──
  const D = () => window.ASSL_UNIT_DETAIL || {};
  const pn = n => String(n).padStart(2, '0');
  const paperFoot = n => `<div class="pf"><span>ASSL NEW CAIRO</span><span>${pn(n)}</span></div>`;
  const floorEn = o => o.ground ? 'Ground Floor' : 'Typical Floor';
  const floorAr = o => o.ground ? 'الدور الأرضي' : 'الدور المتكرر';

  function coverPage(o) {
    return `<section class="op op-cover" style="background-image:url('${IMG}cover_bg.jpg')">
      <div class="cv-box">
        <div class="cv-tag">UNIT OFFER</div>
        <div class="cv-line"></div>
        <div class="cv-type">TYPE ${o.type} · ${floorEn(o).toUpperCase()}</div>
        <div class="cv-ar">${o.floor.ar} — نموذج ${o.type} — مبنى ${esc(o.building)}</div>
        <div class="cv-unit"><span class="cv-unit-ar">الوحدة رقم <b>${o.unit.slice(3)}</b></span><span class="cv-sep"></span><span class="cv-unit-en">UNIT ${o.unit}</span></div>
      </div>
    </section>`;
  }
  function lifePage(n) {
    const smalls = [['life_gate.jpg', 'البوابة الرئيسية'], ['life_pool.jpg', 'حمام السباحة'], ['life_garden.jpg', 'حدائق خاصة'], ['life_kids.jpg', 'منطقة الأطفال']];
    const fig = (f, cap, cls = '') => `<figure class="lf ${cls}" style="background-image:url('${IMG}${f}')"><figcaption>${cap}</figcaption></figure>`;
    return `<section class="op op-paper" style="background-image:url('${IMG}paper.jpg')">
      <div class="ph"><h2>Life at Assl</h2><div class="ph-ar">العمارات · البوابة · حمام السباحة · الحدائق · منطقة الأطفال</div></div>
      <div class="lf-wrap">${fig('life_a1.jpg', 'عمارات أصل · Type A', 'lf-hero')}<div class="lf-grid">${smalls.map(x => fig(x[0], x[1])).join('')}</div></div>
      ${paperFoot(n)}</section>`;
  }
  function locationPage(n) {
    const d = [['10', 'طريق السويس', 'Suez Road'], ['20', 'مطار القاهرة الدولي', 'Cairo International Airport'],
               ['5', 'الجامعة الأمريكية', 'AUC'], ['15', 'العاصمة الإدارية الجديدة', 'New Administrative Capital']];
    return `<section class="op op-paper" style="background-image:url('${IMG}paper.jpg')">
      <img class="loc-map" src="${IMG}location_map.png" alt="Location map"><div class="loc-pin">أصل نيو كايرو</div>
      <div class="ph"><h2>Location</h2><div class="ph-ar">قلب التجمع السادس · القاهرة الجديدة</div></div>
      <div class="loc-txt">
        <p class="loc-ar">يقع أصل في قلب التجمع السادس، في واحدة من أكثر مناطق القاهرة الجديدة تميزًا وأسرعها نموًا، وعلى بُعد دقائق من أهم الطرق والوجهات الحيوية.</p>
        <p class="loc-en">Assl sits at the heart of Sixth Settlement, one of New Cairo's most strategic and fastest-growing areas, minutes from major roads and vital destinations.</p>
        <div class="loc-d">${d.map(x => `<div><b>${x[0]}<small>MIN</small></b><span>${x[1]}</span><em>${x[2]}</em></div>`).join('')}</div>
      </div>
      ${paperFoot(n)}</section>`;
  }
  function masterplanPage(o, n) {
    const v = (window.ASSL_BUILDING_OVERLAY || {})[o.building], b = (window.ASSL_BUILDING_BOX || {})[o.building];
    let mark = '';
    if (v) {
      mark = `<img class="mp-ov" src="${IMG}bld_${esc(o.building)}.png" alt="" style="left:${v[0] * 100}%;top:${v[1] * 100}%;width:${(v[2] - v[0]) * 100}%;height:${(v[3] - v[1]) * 100}%">` +
        `<span class="mp-pill" style="right:${(100 - v[0] * 100 + 0.4).toFixed(2)}%;top:${((v[1] + v[3]) / 2 * 100).toFixed(2)}%">${esc(o.building)}</span>`;
    } else if (b) {
      mark = `<i class="mp-box" style="left:${b[0] * 100}%;top:${b[1] * 100}%;width:${(b[2] - b[0]) * 100}%;height:${(b[3] - b[1]) * 100}%"></i>`;
    }
    return `<section class="op op-paper" style="background-image:url('${IMG}paper.jpg')">
      <img class="mp-icons" src="${IMG}mp_icons.png" alt="">
      <div class="ph"><h2>Masterplan</h2><div class="ph-ar">يمتد أصل على مساحة 43 فدانًا، ليجمع السكن والاستثمار والعمل والترفيه في مجتمع متكامل</div></div>
      <div class="mp-wrap"><img src="${IMG}masterplan_cut.webp" alt="Masterplan">${mark}</div>
      ${paperFoot(n)}</section>`;
  }
  const imgPage = f => `<section class="op op-img" style="background-image:url('${IMG}${f}')"></section>`;

  // Furnished floor plan with only the given unit in full colour (kept for the Unit page).
  const fitBox = (w, h, maxW, maxH) => { const k = Math.min(maxW / w, maxH / h); return `width:${(w * k).toFixed(2)}mm;height:${(h * k).toFixed(2)}mm`; };
  function planStage(type, fl, apn, box) {
    const alt = (window.ASSL_PLAN_ALT || {})[`${type}_${fl}`];
    const sz = alt ? alt.size : ((window.ASSL_FURN_SIZE || {})[`${type}_${fl}`] || [1, 1]);
    const poly = ((window.ASSL_UNIT_POLY || {})[`${type}-${fl}`] || {})[apn];
    const src = alt ? `${IMG}${alt.img}` : `${IMG}furn_${type}_${fl}.jpg`;
    if (!poly) return `<img src="${src}" alt="">`;
    // Drawn into a canvas after render (renderCrops), so it prints and exports to PDF the same way.
    const spec = { src, poly, sz };
    return `<img class="stage-c" alt="" data-stage='${JSON.stringify(spec)}' style="${box ? fitBox(sz[0], sz[1], box[0], box[1]) : ''}">`;
  }

  function floorPage(o, n) {
    const fl = o.ground ? 'G' : 'T', areas = U[o.type][fl];
    const tiles = areas.map((a, i) => `<div class="tile${i === o.unitIdx ? ' sel' : ''}"><span>${ap(i)}</span><b>${a}<small> m²</small></b></div>`).join('');
    return `<section class="op op-paper" style="background-image:url('${IMG}paper.jpg')">
      <div class="ph"><h2>Type ${o.type} · ${floorEn(o)}</h2><div class="ph-ar">${floorAr(o)} · ${areas.length} وحدات في الدور</div></div>
      <div class="fl-wrap">
        <div class="fl-plan"><img src="${IMG}furn_${o.type}_${fl}.jpg" alt=""></div>
        <div class="fl-areas"><div class="fl-t">مساحات الوحدات</div><div class="tiles" style="grid-template-columns:repeat(${areas.length},1fr)">${tiles}</div></div>
      </div>${paperFoot(n)}</section>`;
  }

  // The unit alone, cut out of the furnished plan along its outline.
  function unitCrop(type, fl, apn, box) {
    const sz = (window.ASSL_FURN_SIZE || {})[`${type}_${fl}`] || [1, 1];
    const poly = ((window.ASSL_UNIT_POLY || {})[`${type}-${fl}`] || {})[apn];
    if (!poly) return '';
    const xs = poly.map(p => p[0]), ys = poly.map(p => p[1]);
    const x0 = Math.min(...xs), x1 = Math.max(...xs), y0 = Math.min(...ys), y1 = Math.max(...ys);
    const bw = x1 - x0, bh = y1 - y0, pw = bw * sz[0], ph = bh * sz[1];
    // Straighten units drawn at an angle (Type F wings): align the longest wall with the page.
    const P = poly.map(p => [p[0] * sz[0], p[1] * sz[1]]);
    let best = 0, ang = 0;
    P.forEach((p, i) => { const q = P[(i + 1) % P.length], L = Math.hypot(q[0] - p[0], q[1] - p[1]); if (L > best) { best = L; ang = Math.atan2(q[1] - p[1], q[0] - p[0]); } });
    ang = ang % (Math.PI / 2); if (ang > Math.PI / 4) ang -= Math.PI / 2; if (ang < -Math.PI / 4) ang += Math.PI / 2;
    if (Math.abs(ang) < 0.05) ang = 0;
    const cx = (x0 + x1) / 2 * sz[0], cy = (y0 + y1) / 2 * sz[1], c = Math.cos(-ang), s2 = Math.sin(-ang);
    const R = P.map(([x, y]) => [(x - cx) * c - (y - cy) * s2, (x - cx) * s2 + (y - cy) * c]);
    const rw = Math.max(...R.map(r => r[0])) - Math.min(...R.map(r => r[0])), rh = Math.max(...R.map(r => r[1])) - Math.min(...R.map(r => r[1]));
    const rcx = (Math.max(...R.map(r => r[0])) + Math.min(...R.map(r => r[0]))) / 2, rcy = (Math.max(...R.map(r => r[1])) + Math.min(...R.map(r => r[1]))) / 2;
    const k = Math.min(box[0] / rw, box[1] / rh);
    // Drawn into a canvas after render (renderCrops): rotated + clipped CSS images print wrongly in Chrome.
    const spec = { src: `${IMG}furn_${type}_${fl}.jpg`, P, ang, cx, cy, rcx, rcy, rw, rh };
    return `<img class="uc" alt="" data-crop='${JSON.stringify(spec)}' style="width:${(rw * k).toFixed(2)}mm;height:${(rh * k).toFixed(2)}mm">`;
  }

  function renderCrops(root) {
    const jobs = [...root.querySelectorAll('img[data-crop]')].map(el => new Promise(res => {
      const c = JSON.parse(el.dataset.crop), im = new Image();
      im.onload = () => {
        const sc = 1.6, cv = document.createElement('canvas');
        cv.width = Math.round(c.rw * sc); cv.height = Math.round(c.rh * sc);
        const g = cv.getContext('2d');
        g.fillStyle = '#fff'; g.fillRect(0, 0, cv.width, cv.height);
        g.translate(cv.width / 2 - c.rcx * sc, cv.height / 2 - c.rcy * sc); g.scale(sc, sc); g.rotate(-c.ang); g.translate(-c.cx, -c.cy);
        g.beginPath(); c.P.forEach((p, i) => i ? g.lineTo(p[0], p[1]) : g.moveTo(p[0], p[1])); g.closePath(); g.clip();
        g.drawImage(im, 0, 0);
        // Put the canvas itself on the page (works when the file is opened locally, where toDataURL is blocked).
        cv.className = 'uc'; cv.style.cssText = el.style.cssText; el.replaceWith(cv); res();
      };
      im.onerror = res; im.src = c.src;
    }));
    const stages = [...root.querySelectorAll('img[data-stage]')].map(el => new Promise(res => {
      const c = JSON.parse(el.dataset.stage), im = new Image();
      im.onload = () => {
        const [W, H] = c.sz, cv = document.createElement('canvas'); cv.width = W; cv.height = H;
        const g = cv.getContext('2d'), P = c.poly.map(p => [p[0] * W, p[1] * H]);
        const path = () => { g.beginPath(); P.forEach((p, i) => i ? g.lineTo(p[0], p[1]) : g.moveTo(p[0], p[1])); g.closePath(); };
        g.fillStyle = '#fff'; g.fillRect(0, 0, W, H);
        g.save(); g.globalAlpha = 0.22; g.filter = 'grayscale(50%)'; g.drawImage(im, 0, 0, W, H); g.restore();
        g.save(); path(); g.clip(); g.drawImage(im, 0, 0, W, H); g.restore();
        g.save(); path(); g.strokeStyle = '#C9A24A'; g.lineWidth = Math.max(W, H) / 160; g.lineJoin = 'round';
        g.shadowColor = 'rgba(201,162,74,.9)'; g.shadowBlur = Math.max(W, H) / 120; g.stroke(); g.restore();
        cv.className = 'stage-c'; cv.style.cssText = el.style.cssText; el.replaceWith(cv); res();
      };
      im.onerror = res; im.src = c.src;
    }));
    return Promise.all(jobs.concat(stages));
  }

  function unitPage(o, n) {
    const fl = o.ground ? 'G' : 'T', apn = o.unit.slice(3), d = D()[`${o.type}-${fl}-${apn}`];
    const crop = unitCrop(o.type, fl, apn, [134, 148]);
    const rc = ((window.ASSL_ROOMS || {})[`${o.type}-${fl}`] || {})[apn];
    const rows = d
      ? [['غرف النوم', d.beds], ['الحمامات', d.baths], ['ريسبشن · مطبخ', d.reception], ['تراس', d.terrace]].filter(r => r[1])
      : rc
      ? [['غرف النوم', rc[0] > 1 ? `${rc[0]} (منها ماستر)` : '1 ماستر'], ['الحمامات', String(rc[1])], ['ريسبشن · مطبخ', '✓'],
         ['تراس', rc[2] ? String(rc[2]) : '—'], ...(rc[3] ? [['غرفة خادمة', '✓']] : [])]
      : [['المبنى', o.building], ['النموذج', 'Type ' + o.type], ['الدور', o.floor.ar], ['رقم الوحدة', o.unit]];
    const right = crop || `<img src="${IMG}line_${o.type}_${fl}.jpg" alt="">`;
    return `<section class="op op-paper" style="background-image:url('${IMG}paper.jpg')">
      <div class="ph"><h2>Unit ${o.unit}</h2><div class="ph-ar">Type ${o.type} · ${floorAr(o)} · موقع الوحدة في الدور</div></div>
      <div class="u-wrap">
        <div class="u-right">${right}</div>
        <div class="u-left">
          <div class="u-top"><div class="u-area"><span>مساحة الوحدة</span><b>${o.area}</b><small>m²</small></div>
            <div class="u-locbox"><div class="u-loc">${planStage(o.type, fl, apn, [62, 49])}</div><div class="u-cap">مكان الوحدة في الدور</div></div></div>
          <table class="u-spec">${rows.map(r => `<tr><th>${r[0]}</th><td>${esc(r[1])}</td></tr>`).join('')}</table>
        </div>
      </div>${paperFoot(n)}</section>`;
  }

  function paymentPage(o, n) {
    const P = o.plans.slice().sort((a, b) => (b.years || 0) - (a.years || 0)); // 10, 8, 6 (right → left)
    const launch = Math.max(...P.map(p => p.r.launch || 0));
    const pct = v => (Math.round(v * 1000) / 10) + '%';
    const row = (label, f, cls = '') => `<tr class="${cls}"><th>${label}</th>${P.map(p => `<td>${f(p)}</td>`).join('')}</tr>`;
    return `<section class="op op-lea" style="background-image:url('${IMG}leather_bg.jpg')">
      ${launch > 0 ? `<div class="pp-badge">خصم إضافي <span dir="ltr">${pct(launch)}</span> · <b>Launch Offer</b></div>` : ''}
      <div class="ph ph-dark"><h2>Payment Plans</h2><div class="ph-ar">سعر الوحدة ${egp(o.price)} جنيه · مبنى ${esc(o.building)} · ${o.unit}</div></div>
      <table class="pp">
        <thead><tr><th></th>${P.map(p => `<th>${p.years} سنوات</th>`).join('')}</tr></thead>
        <tbody>
          ${row('خصم نظام السداد', p => p.r.dis > 0 ? p.r.dis + '%' : '—')}
          ${row('عرض الإطلاق', p => p.r.launch > 0 ? pct(p.r.launch) : '—')}
          ${row('السعر بعد الخصم', p => egp(p.selling), 'hl')}
          ${row('مقدم التعاقد', p => `${pct(p.r.dp1 + p.r.dp2)} <small>${egp(p.dp)}</small>`)}
          ${row('الأقساط', p => `${p.ins.length} قسط ربع سنوي`)}
          ${row('قيمة القسط', p => egp(p.ins[0] ? p.ins[0].amt : 0), 'hl')}
        </tbody>
      </table>
      <div class="pp-note">الخصومات بالتتابع: خصم الإطلاق ثم خصم نظام السداد · الأقساط ربع سنوية تبدأ ${esc(P[0].ins[0] ? P[0].ins[0].date : '')} · الأسعار بالجنيه المصري ولا تشمل رسوم التسجيل</div>
      <div class="pf pf-dark"><span>ASSL NEW CAIRO <img src="${IMG}arx_dark_bg.png" alt=""></span><span>${pn(n)}</span></div>
    </section>`;
  }

  function buildOffer(o) {
    return coverPage(o) + lifePage(2) + locationPage(3) + masterplanPage(o, 4) +
      floorPage(o, 5) + unitPage(o, 6) + paymentPage(o, 7);
  }

  // ── preview / print ──
  window.generateOffer = function () {
    const o = getOffer();
    if (!o || o.error) { alert(o ? o.error : 'Please fill in type, floor, unit and price.'); return; }
    const html = buildOffer(o);
    $('offer-pages').innerHTML = html;
    window.__cropsReady = renderCrops($('offer-pages'));
    $('print-area').innerHTML = '';
    $('offer-preview').classList.add('show');
    $('offer-preview').scrollTop = 0;
    fitOffer();
    document.title = `Assl Offer ${o.building} ${o.unit}`;
  };
  window.closeOffer = function () {
    $('offer-preview').classList.remove('show');
    document.title = 'ARX Development — Payment Request v2';
  };
  window.printOffer = async function () {
    if (document.documentElement.classList.contains('touch-device')) return shareOffer();
    if (window.__cropsReady) await window.__cropsReady;
    const pa = $('print-area');
    pa.innerHTML = '';
    [...$('offer-pages').childNodes].forEach(n => pa.appendChild(n.cloneNode(true)));
    pa.querySelectorAll('canvas.uc').forEach((c, i) => c.getContext('2d').drawImage($('offer-pages').querySelectorAll('canvas.uc')[i], 0, 0));
    document.body.classList.add('printing-offer');
    if (!$('offer-page-style')) {
      const st = document.createElement('style');
      st.id = 'offer-page-style';
      st.textContent = '@page{size:A4 landscape;margin:0}';
      document.head.appendChild(st);
    }
    const imgs = [...pa.querySelectorAll('img')];
    await Promise.all(imgs.map(i => i.complete ? 0 : new Promise(r => { i.onload = i.onerror = r; })));
    if (document.fonts && document.fonts.ready) await document.fonts.ready;
    window.print();
  };
  // ── share / download a real PDF file ──
  const loadScript = src => new Promise((res, rej) => {
    if (document.querySelector(`script[src="${src}"]`)) return res();
    const sc = document.createElement('script'); sc.src = src; sc.onload = res; sc.onerror = () => rej(new Error('Could not load ' + src)); document.head.appendChild(sc);
  });
  // Pages are painted onto a canvas by our own code: backgrounds, borders, pictures and text (canvas fillText),
  // read from the laid-out page. No print, no SVG snapshot, no html2canvas, so laptop, iPhone and Android
  // all produce the same file.
  const JSPDF = 'https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js';
  const imgCache = {};
  const loadImg = src => imgCache[src] || (imgCache[src] = new Promise(res => {
    const im = new Image(); im.onload = () => res(im); im.onerror = () => res(null); im.src = src;
  }));
  const isClear = c => !c || c === 'transparent' || /rgba\([^)]*,\s*0\)$/.test(c);
  const pct = (v, def) => { const m = /(-?[\d.]+)%/.exec(v || ''); return m ? +m[1] / 100 : (/left|top/.test(v) ? 0 : /right|bottom/.test(v) ? 1 : def); };
  function drawFit(g, im, x, y, w, h, mode, px, py) {
    const iw = im.naturalWidth || im.width, ih = im.naturalHeight || im.height; if (!iw || !ih || w <= 0 || h <= 0) return;
    if (mode === 'fill') return g.drawImage(im, x, y, w, h);
    const k = mode === 'contain' ? Math.min(w / iw, h / ih) : Math.max(w / iw, h / ih), dw = iw * k, dh = ih * k;
    g.save(); g.beginPath(); g.rect(x, y, w, h); g.clip(); g.drawImage(im, x + (w - dw) * px, y + (h - dh) * py, dw, dh); g.restore();
  }
  function rrect(g, x, y, w, h, r) {
    r = Math.min(r, w / 2, h / 2); g.beginPath();
    g.moveTo(x + r, y); g.lineTo(x + w - r, y); g.quadraticCurveTo(x + w, y, x + w, y + r); g.lineTo(x + w, y + h - r);
    g.quadraticCurveTo(x + w, y + h, x + w - r, y + h); g.lineTo(x + r, y + h); g.quadraticCurveTo(x, y + h, x, y + h - r);
    g.lineTo(x, y + r); g.quadraticCurveTo(x, y, x + r, y); g.closePath();
  }
  function gradient(g, css, x, y, w, h) {
    const cols = css.match(/rgba?\([^)]*\)|#[0-9a-f]{3,8}/gi); if (!cols || cols.length < 2) return null;
    const vertical = !/to right|90deg/.test(css), gr = vertical ? g.createLinearGradient(0, y, 0, y + h) : g.createLinearGradient(x, 0, x + w, 0);
    cols.forEach((c, i) => gr.addColorStop(i / (cols.length - 1), c)); return gr;
  }
  async function paintBox(g, el, cs, r) {
    if (cs.visibility === 'hidden' || cs.display === 'none' || r.width === 0) return;
    const rad = parseFloat(cs.borderTopLeftRadius) || 0;
    if (!isClear(cs.backgroundColor)) { g.fillStyle = cs.backgroundColor; rad ? (rrect(g, r.x, r.y, r.w, r.h, rad), g.fill()) : g.fillRect(r.x, r.y, r.w, r.h); }
    const bi = cs.backgroundImage || 'none';
    if (/gradient/.test(bi)) { const gr = gradient(g, bi, r.x, r.y, r.w, r.h); if (gr) { g.fillStyle = gr; g.fillRect(r.x, r.y, r.w, r.h); } }
    const u = /url\(["']?(.*?)["']?\)/.exec(bi);
    if (u) {
      const im = await loadImg(u[1]);
      if (im) { const pos = (cs.backgroundPosition || '50% 50%').split(' '), bs = cs.backgroundSize || '';
        drawFit(g, im, r.x, r.y, r.w, r.h, /100% 100%/.test(bs) ? 'fill' : bs === 'contain' ? 'contain' : 'cover', pct(pos[0], .5), pct(pos[1] || pos[0], .5)); }
    }
    const sides = [['Top', 0, 0, r.w, 'h'], ['Bottom', 0, r.h, r.w, 'h'], ['Left', 0, 0, r.h, 'v'], ['Right', r.w, 0, r.h, 'v']];
    for (const [S, dx, dy, len, o] of sides) {
      const bw = parseFloat(cs['border' + S + 'Width']) || 0, bc = cs['border' + S + 'Color'];
      if (!bw || isClear(bc) || cs['border' + S + 'Style'] === 'none') continue;
      g.fillStyle = bc;
      if (rad && S === 'Top') { g.lineWidth = bw; g.strokeStyle = bc; rrect(g, r.x + bw / 2, r.y + bw / 2, r.w - bw, r.h - bw, rad); g.stroke(); break; }
      if (o === 'h') g.fillRect(r.x, r.y + dy - (S === 'Bottom' ? bw : 0), len, bw); else g.fillRect(r.x + dx - (S === 'Right' ? bw : 0), r.y, bw, len);
    }
  }
  function paintText(g, node, cs, P) {
    let text = node.textContent; if (!text.trim()) return;
    if (cs.textTransform === 'uppercase') text = text.toUpperCase();
    const font = `${cs.fontStyle === 'italic' ? 'italic ' : ''}${cs.fontWeight} ${cs.fontSize} ${cs.fontFamily}`;
    g.font = font; g.fillStyle = cs.color; g.textBaseline = 'alphabetic';
    const ls = parseFloat(cs.letterSpacing) || 0, rtlBlock = cs.direction === 'rtl', arabic = /[؀-ۿ]/;
    // group characters into visual lines using their layout boxes
    const rng = document.createRange(), lines = []; let cur = null;
    for (let i = 0; i < node.length; i++) {
      rng.setStart(node, i); rng.setEnd(node, i + 1);
      const rs = rng.getClientRects(); if (!rs.length) continue;
      const b = rs[0], top = Math.round(b.top);
      if (!cur || Math.abs(top - cur.top) > b.height * 0.5) { cur = { top, l: b.left, r: b.right, t: b.top, h: b.height, chars: [] }; lines.push(cur); }
      cur.l = Math.min(cur.l, b.left); cur.r = Math.max(cur.r, b.right); cur.h = Math.max(cur.h, b.height);
      cur.chars.push({ c: text[i], x: b.left, w: b.width });
    }
    for (const ln of lines) {
      const str = ln.chars.map(c => c.c).join('').replace(/\s+$/, ''), m = g.measureText('Hg');
      const asc = m.fontBoundingBoxAscent || parseFloat(cs.fontSize) * 0.8, desc = m.fontBoundingBoxDescent || parseFloat(cs.fontSize) * 0.2;
      const y = ln.t - P.top + (ln.h - asc - desc) / 2 + asc;
      if (!arabic.test(str) && (ls || !rtlBlock)) {               // latin: put each letter exactly where the page has it
        g.direction = 'ltr'; g.textAlign = 'left';
        for (const c of ln.chars) if (c.c.trim()) g.fillText(cs.textTransform === 'uppercase' ? c.c.toUpperCase() : c.c, c.x - P.left, y);
      } else {                                                    // arabic / mixed: draw the line as one run, browser shapes it
        g.direction = rtlBlock ? 'rtl' : 'ltr'; g.textAlign = rtlBlock ? 'right' : 'left';
        g.fillText(str.trim(), (rtlBlock ? ln.r : ln.l) - P.left, y);
      }
    }
  }
  async function paintNode(g, el, P) {
    const cs = getComputedStyle(el); if (cs.display === 'none' || cs.visibility === 'hidden') return;
    const op = parseFloat(cs.opacity); g.save(); if (op < 1) g.globalAlpha *= op;
    const b = el.getBoundingClientRect(), r = { x: b.left - P.left, y: b.top - P.top, w: b.width, h: b.height };
    if (el.tagName === 'IMG' || el.tagName === 'CANVAS') {
      const im = el.tagName === 'CANVAS' ? el : await loadImg(el.currentSrc || el.src);
      if (im) drawFit(g, im, r.x, r.y, r.w, r.h, cs.objectFit === 'contain' ? 'contain' : cs.objectFit === 'cover' ? 'cover' : 'fill', .5, .5);
      g.restore(); return;
    }
    await paintBox(g, el, cs, r);
    if (cs.overflow === 'hidden' && el.tagName !== 'SECTION') { g.beginPath(); g.rect(r.x, r.y, r.w, r.h); g.clip(); }
    for (const ch of el.childNodes) {
      if (ch.nodeType === 3) paintText(g, ch, cs, P);
      else if (ch.nodeType === 1) await paintNode(g, ch, P);
    }
    g.restore();
  }
  async function pageToJpeg(page, w, h) {
    const S = 2, P = page.getBoundingClientRect(), cv = document.createElement('canvas');
    cv.width = Math.round(w * S); cv.height = Math.round(h * S);
    const g = cv.getContext('2d'); g.scale(S, S); g.fillStyle = '#fff'; g.fillRect(0, 0, w, h);
    g.beginPath(); g.rect(0, 0, w, h); g.clip();
    await paintNode(g, page, P);
    return cv.toDataURL('image/jpeg', 0.88);
  }
  async function buildPdfFile() {
    await loadScript(JSPDF);
    if (window.__cropsReady) await window.__cropsReady;
    if (document.fonts && document.fonts.ready) await document.fonts.ready;
    const src = $('offer-pages'), box = document.createElement('div');
    box.style.cssText = 'position:fixed;left:0;top:0;width:297mm;zoom:1;z-index:-1;pointer-events:none;';
    [...src.children].forEach(n => box.appendChild(n.cloneNode(true)));
    const srcCv = src.querySelectorAll('canvas'), dstCv = box.querySelectorAll('canvas');
    dstCv.forEach((c, i) => { c.width = srcCv[i].width; c.height = srcCv[i].height; c.getContext('2d').drawImage(srcCv[i], 0, 0); });
    // canvases become images so every renderer copies them reliably
    dstCv.forEach(c => { try { const im = new Image(); im.src = c.toDataURL('image/jpeg', 0.9); im.className = c.className; im.style.cssText = c.style.cssText; c.replaceWith(im); } catch (e) {} });
    document.body.appendChild(box);
    try {
      await Promise.all([...box.querySelectorAll('img')].map(i => i.complete ? 0 : new Promise(r => { i.onload = i.onerror = r; })));
      const { jsPDF } = window.jspdf, pdf = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4', compress: true });
      const pages = [...box.querySelectorAll('section.op')];
      for (let i = 0; i < pages.length; i++) {
        const r = pages[i].getBoundingClientRect();
        const data = await pageToJpeg(pages[i], Math.round(r.width), Math.round(r.height));
        if (i) pdf.addPage('a4', 'landscape');
        pdf.addImage(data, 'JPEG', 0, 0, 297, 210, undefined, 'FAST');
      }
      return new File([pdf.output('blob')], (document.title || 'Assl Offer').replace(/[\\/:*?"<>|]+/g, '-') + '.pdf', { type: 'application/pdf' });
    } finally { box.remove(); }
  }
  // One PDF for every device: the file is always built here, never by the browser's print,
  // so laptop, iPhone and Android all get exactly the same 7 landscape pages.
  let readyFile = null, readyKey = '';
  const offerKey = () => document.title + '|' + ($('offer-pages').textContent || '').length;
  function deliver(file) {
    if (navigator.canShare && navigator.canShare({ files: [file] })) {
      return navigator.share({ files: [file], title: file.name }).then(() => true, e => {
        if (e && e.name === 'AbortError') return true;
        if (e && e.name === 'NotAllowedError') return false;   // took too long after the tap; ask for a second tap
        download(file); return true;
      });
    }
    download(file); return Promise.resolve(true);
  }
  function download(file) {
    const a = document.createElement('a'); a.href = URL.createObjectURL(file); a.download = file.name;
    document.body.appendChild(a); a.click(); setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 60000);
  }
  window.shareOffer = async function () {
    const btn = $('offer-share-btn'), label = '⤴ Share / Save PDF';
    if (readyFile && readyKey === offerKey()) {             // second tap: file already built, share right away
      await deliver(readyFile); readyFile = null; if (btn) btn.innerHTML = label; return;
    }
    if (btn) { btn.disabled = true; btn.innerHTML = 'Preparing PDF…'; }
    try {
      const file = await buildPdfFile();
      if (btn) btn.disabled = false;
      const done = await deliver(file);
      if (!done) { readyFile = file; readyKey = offerKey(); if (btn) btn.innerHTML = '✓ PDF ready · tap to share'; return; }
      if (btn) btn.innerHTML = label;
    } catch (e) {
      if (btn) { btn.disabled = false; btn.innerHTML = label; }
      alert('Could not create the PDF (' + (e && e.message ? e.message : e) + '). Check the internet connection and try again.');
    }
  };
  window.__buildPdfFile = buildPdfFile;
  window.printOffer = window.shareOffer;

  window.addEventListener('afterprint', () => {
    if (document.body.classList.contains('printing-offer')) {
      document.body.classList.remove('printing-offer');
      const st = $('offer-page-style'); if (st) st.remove();
      $('print-area').innerHTML = '';
    }
  });
  function fitOffer() {
    const w = Math.min(window.innerWidth - 24, 1123);
    $('offer-pages').style.zoom = (w / 1123).toFixed(3);
  }
  window.addEventListener('resize', () => { if ($('offer-preview').classList.contains('show')) fitOffer(); });

  // expose for testing
  window.__offer = { getOffer, buildOffer, refreshOffer };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', initForm); else initForm();
})();
