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
  const imgPage = f => `<section class="op op-img" style="background-image:url('${IMG}${f}')"></section>`;

  function floorPage(o, n) {
    const fl = o.ground ? 'G' : 'T', areas = U[o.type][fl];
    const tiles = areas.map((a, i) => `<div class="tile${i === o.unitIdx ? ' sel' : ''}"><span>${ap(i)}</span><b>${a}<small> m²</small></b></div>`).join('');
    return `<section class="op op-paper" style="background-image:url('${IMG}paper.jpg')">
      <div class="ph"><h2>Type ${o.type} · ${floorEn(o)}</h2><div class="ph-ar">${floorAr(o)} · ${areas.length} وحدات في الدور</div></div>
      <div class="fl-wrap">
        <div class="fl-plan"><img src="${IMG}furn_${o.type}_${fl}.jpg" alt=""></div>
        <div class="fl-areas"><div class="fl-t">مساحات الوحدات</div><div class="tiles${areas.length > 9 ? ' t4' : ''}">${tiles}</div></div>
      </div>${paperFoot(n)}</section>`;
  }

  function unitPage(o, n) {
    const fl = o.ground ? 'G' : 'T', key = `${o.type}-${fl}-${o.unit.slice(3)}`, d = D()[key];
    let locator, rows, right;
    if (d) {
      const [x0, y0, x1, y1] = d.box;
      locator = `<div class="u-loc"><div class="u-loc-in"><img src="${IMG}furn_${o.type}_${fl}.jpg" alt=""><i style="left:${x0 * 100}%;top:${y0 * 100}%;width:${(x1 - x0) * 100}%;height:${(y1 - y0) * 100}%"></i></div></div><div class="u-cap">مكان الوحدة في الدور</div>`;
      rows = [['غرف النوم', d.beds], ['الحمامات', d.baths], ['ريسبشن · مطبخ', d.reception], ['تراس', d.terrace]].filter(r => r[1]);
      right = `<img src="${IMG}${d.img}" alt="">`;
    } else {
      locator = `<div class="u-loc"><img src="${IMG}key_${o.type}.jpg" alt=""></div><div class="u-cap">مكان المبنى ${esc(o.building)} في الموقع — الأرقام هي أرقام الوحدات</div>`;
      rows = [['المبنى', o.building], ['النموذج', 'Type ' + o.type], ['الدور', o.floor.ar], ['رقم الوحدة', o.unit]];
      right = `<img src="${IMG}line_${o.type}_${fl}.jpg" alt=""><div class="u-note">وحدتك <b>${o.unit}</b> على مسقط الدور</div>`;
    }
    return `<section class="op op-paper" style="background-image:url('${IMG}paper.jpg')">
      <div class="ph"><h2>Unit ${o.unit}</h2><div class="ph-ar">Type ${o.type} · ${floorAr(o)} · موقع الوحدة في الدور</div></div>
      <div class="u-wrap">
        <div class="u-right">${right}</div>
        <div class="u-left">
          <div class="u-top"><div class="u-area"><span>مساحة الوحدة</span><b>${o.area}</b><small>m²</small></div><div class="u-locbox">${locator}</div></div>
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
          ${row('وديعة الصيانة', p => `${pct(p.r.maint)} <small>${egp(p.maint)}</small>`)}
        </tbody>
      </table>
      <div class="pp-note">الخصومات بالتتابع: خصم الإطلاق ثم خصم نظام السداد · الأقساط ربع سنوية تبدأ ${esc(P[0].ins[0] ? P[0].ins[0].date : '')} · الأسعار بالجنيه المصري ولا تشمل رسوم التسجيل · وديعة الصيانة على سعر الوحدة</div>
      <div class="pf pf-dark"><span>ASSL NEW CAIRO <img src="${ARX_LOGO_PDF}" alt=""></span><span>${pn(n)}</span></div>
    </section>`;
  }

  function buildOffer(o) {
    return coverPage(o) + lifePage(2) + imgPage('location_page.jpg') + imgPage('masterplan_page.jpg') +
      floorPage(o, 5) + unitPage(o, 6) + paymentPage(o, 7);
  }

  // ── preview / print ──
  window.generateOffer = function () {
    const o = getOffer();
    if (!o || o.error) { alert(o ? o.error : 'Please fill in type, floor, unit and price.'); return; }
    const html = buildOffer(o);
    $('offer-pages').innerHTML = html;
    $('print-area').innerHTML = '';
    $('offer-preview').classList.add('show');
    $('offer-preview').scrollTop = 0;
    fitOffer();
    document.title = `Offer ${o.building} ${o.unit}${o.client ? ' - ' + o.client : ''}`;
  };
  window.closeOffer = function () {
    $('offer-preview').classList.remove('show');
    document.title = 'ARX Development — Payment Request v2';
  };
  window.printOffer = async function () {
    const pa = $('print-area');
    pa.innerHTML = $('offer-pages').innerHTML;
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
