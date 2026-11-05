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
      `<div class="sum-row"><span class="k">Price / m²</span><span class="v">EGP ${egp(o.price / o.area)}</span></div><hr class="sum-divider">` +
      o.plans.map(p => `<div class="sum-row"><span class="k">${p.years} years${p.totalDisc > 0.0001 ? ` <span class="pill">−${(p.totalDisc * 100).toFixed(2)}%</span>` : ''}</span><span class="v">EGP ${egp(p.selling)} · ${p.ins.length} × ${egp(p.ins[0] ? p.ins[0].amt : 0)}</span></div>`).join('');
  }

  // ── PDF pages ──
  const lhTop = `<img class="op-lh-top" src="${IMG}lh_header.png" alt="">`;
  const lhBottom = `<img class="op-lh-bot" src="${IMG}lh_footer.png" alt="">`;
  const mark = `<img class="op-mark" src="${IMG}lh_mark.png" alt="">`;
  function page(title, sub, body, n) {
    return `<section class="op op-lh">${lhTop}${mark}<div class="op-body">
      <div class="op-h"><div class="op-kicker">${esc(sub)}</div><h2>${esc(title)}</h2></div>${body}</div>
      <div class="op-pno">${n}</div>${lhBottom}</section>`;
  }

  function coverPage(o) {
    return `<section class="op op-cover">
      <div class="oc-img" style="background-image:url('${IMG}hero.jpg')"></div>
      <div class="oc-shade"></div>
      <div class="oc-top"><img src="${ARX_LOGO_PDF}" alt="ARX" class="oc-arx"></div>
      <div class="oc-mid">
        <div class="oc-ar">أصل نيو كايرو</div>
        <div class="oc-en">ASSL NEW CAIRO</div>
        <div class="oc-line"></div>
        <div class="oc-tag">UNIT OFFER</div>
      </div>
      <div class="oc-card">
        <div class="oc-grid">
          <div><span>Building</span><b>${esc(o.building)}</b></div>
          <div><span>Unit</span><b>${o.unit}</b></div>
          <div><span>Floor</span><b>${o.ground ? 'Ground' : esc(o.floor.label.replace('Typical · ', ''))}</b></div>
          <div><span>Area</span><b>${o.area} m²</b></div>
        </div>
        ${o.client ? `<div class="oc-for">Prepared for <b>${esc(o.client)}</b></div>` : ''}
        <div class="oc-date">${o.date}</div>
      </div>
    </section>`;
  }

  function projectPage(o, n) {
    return page('The Project', 'Assl New Cairo · ARX Development', `
      <div class="op-fig"><img src="${IMG}location.jpg" alt="Location"><div class="op-cap">Location</div></div>
      <div class="op-fig"><img src="${IMG}masterplan.jpg" alt="Master plan"><div class="op-cap">Master plan</div></div>`, n);
  }

  function buildingPage(o, n) {
    const areas = U[o.type][o.ground ? 'G' : 'T'];
    const rows = [
      ['Project', 'المشروع', 'Assl New Cairo'],
      ['Building', 'المبنى', o.building + ' · Type ' + o.type],
      ['Floor', 'الدور', o.floor.label, o.floor.ar],
      ['Unit', 'رقم الوحدة', o.unit],
      ['Built-up area', 'المساحة', o.area + ' m²'],
      ['Unit price', 'سعر الوحدة', 'EGP ' + egp(o.price)],
      ['Price per m²', 'سعر المتر', 'EGP ' + egp(o.price / o.area)],
    ];
    return page('Your Unit', 'Phase 01 · Type ' + o.type + ' · ' + o.building, `
      <div class="op-two">
        <div class="op-fig op-key"><img src="${IMG}key_${o.type}.jpg" alt="Key plan"><div class="op-cap">Building ${esc(o.building)} on the Phase 01 key plan — circled numbers are unit (AP) numbers</div></div>
        <table class="op-spec">${rows.map(r => `<tr><th>${r[0]}<small>${r[1]}</small></th><td>${esc(r[2])}${r[3] ? `<small class="ar">${esc(r[3])}</small>` : ''}</td></tr>`).join('')}</table>
      </div>
      <div class="op-areas-t">Type ${o.type} · ${o.ground ? 'ground floor' : 'typical floor'} unit areas</div>
      <table class="op-areas"><tr>${areas.map((a, i) => `<th class="${i === o.unitIdx ? 'sel' : ''}">${ap(i)}</th>`).join('')}</tr>
      <tr>${areas.map((a, i) => `<td class="${i === o.unitIdx ? 'sel' : ''}">${a} m²</td>`).join('')}</tr></table>`, n);
  }

  function planPage(o, n) {
    const fl = o.ground ? 'G' : 'T';
    return page('Floor Plan', 'Type ' + o.type + ' · ' + (o.ground ? 'Ground floor' : 'Typical floor') + ' · your unit: ' + o.unit, `
      <div class="op-fig"><img src="${IMG}line_${o.type}_${fl}.jpg" alt="Floor plan with unit numbers"><div class="op-cap">Unit numbers (AP) — your unit is <b>${o.unit}</b></div></div>
      <div class="op-fig op-furn"><img src="${IMG}furn_${o.type}_${fl}.jpg" alt="Furnished plan"><div class="op-cap">Furnished plan (illustrative)</div></div>`, n);
  }

  function paymentPage(o, n) {
    const cards = o.plans.map(p => {
      const first = p.ins[0];
      const disc = [];
      if (p.r.launch > 0) disc.push((p.r.launch * 100).toFixed(0) + '% launch offer');
      if (p.r.dis > 0) disc.push(p.r.dis + '% plan discount');
      const best = p.r.dis > 0 && p.r.dis === Math.max(...o.plans.map(x => x.r.dis));
      return `<div class="pc${best ? ' pc-best' : ''}">${best ? '<div class="pc-flag">BEST VALUE</div>' : ''}
        <div class="pc-y">${p.years}<small>YEARS</small></div>
        <div class="pc-d">${disc.join(' + ') || 'Standard price'}</div>
        <div class="pc-price"><span>Price after discount</span><b>EGP ${egp(p.selling)}</b>${p.saving > 0 ? `<em>You save EGP ${egp(p.saving)}</em>` : ''}</div>
        <dl>
          <dt>Down payment (${(p.r.dp1 * 100 + p.r.dp2 * 100).toFixed(0)}%)</dt><dd>EGP ${egp(p.dp)}</dd>
          <dt>Quarterly installment</dt><dd>EGP ${egp(first ? first.amt : 0)}</dd>
          <dt>Number of installments</dt><dd>${p.ins.length}</dd>
          <dt>First installment</dt><dd>${esc(first ? first.date : '—')}</dd>
          <dt>Maintenance deposit (${(p.r.maint * 100).toFixed(0)}%)</dt><dd>EGP ${egp(p.maint)}</dd>
        </dl></div>`;
    }).join('');
    return page('Payment Plans', 'Unit price EGP ' + egp(o.price) + ' · ' + o.building + ' ' + o.unit, `
      <div class="pcs">${cards}</div>
      <ul class="op-notes">
        <li>Discounts apply to the unit price; the launch offer is applied first, then the plan discount.</li>
        <li>Installments are paid quarterly after the down payment.</li>
        <li>The maintenance deposit is calculated on the unit price and paid separately on ${esc(o.plans[0].r.maintDate || 'the date set in the contract')}.</li>
        <li>Prices and payment plans are subject to change without prior notice until the reservation is confirmed.</li>
      </ul>`, n);
  }

  function schedulePage(o, n) {
    const cols = o.plans.map(p => `<div class="sc"><div class="sc-h">${p.years} Years<small>EGP ${egp(p.selling)}</small></div>
      <table><thead><tr><th></th><th>Date</th><th>Amount</th></tr></thead><tbody>
      ${p.sched.rows.map(x => `<tr${x.desc.startsWith('DP') ? ' class="dp"' : ''}><td>${x.desc.replace('INS-', '')}</td><td>${esc(x.date)}</td><td>${egp(x.amt)}</td></tr>`).join('')}
      <tr class="tot"><td></td><td>Total</td><td>${egp(p.selling)}</td></tr></tbody></table></div>`).join('');
    const contact = (o.sales || o.mobile) ? `<div class="op-contact">Your sales consultant: <b>${esc(o.sales)}</b>${o.mobile ? ' · ' + esc(o.mobile) : ''} · Hotline 16591</div>` : '';
    return page('Payment Schedules', 'Quarterly installments for each plan (EGP)', `<div class="scs">${cols}</div>${contact}`, n);
  }

  function buildOffer(o) {
    let n = 2;
    return coverPage(o) + projectPage(o, n++) + buildingPage(o, n++) + planPage(o, n++) + paymentPage(o, n++) + schedulePage(o, n++);
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
      st.textContent = '@page{size:A4 portrait;margin:0}';
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
    const w = Math.min(window.innerWidth - 24, 794);
    $('offer-pages').style.zoom = (w / 794).toFixed(3);
  }
  window.addEventListener('resize', () => { if ($('offer-preview').classList.contains('show')) fitOffer(); });

  // expose for testing
  window.__offer = { getOffer, buildOffer, refreshOffer };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', initForm); else initForm();
})();
