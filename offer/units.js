// Assl New Cairo — Phase 01 unit data (source: Digital_ASSL_v3 brochure, plan pages 23–40)
// Areas in m². G = ground floor, T = typical floors (1–6). Index 0 = AP-01.
window.ASSL_UNITS = {
  A: { buildings: ['A1-7', 'A1-8', 'A1-9', 'A1-10'],
       G: [158, 143, 127, 143, 158, 92, 92],
       T: [178, 159, 137, 161, 178, 104, 104] },
  C: { buildings: ['C1-3', 'C1-4'],
       G: [155, 142, 127, 100, 123, 142, 154, 65, 90, 90, 65],
       T: [179, 162, 140, 101, 137, 163, 179, 74, 104, 104, 74] },
  D: { buildings: ['D1-2', 'D1-3'],
       G: [157, 147, 140, 157, 123, 93, 61],
       T: [183, 152, 161, 181, 138, 108, 72] },
  E: { buildings: ['E1-2'],
       G: [160, 130, 154, 142, 142, 140, 140],
       T: [175, 131, 169, 164, 164, 163, 163] },
  F: { buildings: ['F1-2'],
       G: [156, 94, 93, 156, 131, 147, 147, 131],
       T: [174, 106, 106, 174, 149, 164, 164, 148] },
  H: { buildings: ['H1-2', 'H1-3', 'H1-4'],
       G: [163, 156, 153, 144, 162, 93, 94, 95, 92],
       T: [185, 157, 154, 165, 181, 107, 108, 108, 107] },
};
// Optional per-unit details for the "Unit AP-xx" page, keyed "Type-Floor-AP" (Floor G or T).
//   box: unit outline on furn_<Type>_<Floor>.jpg as fractions [x0, y0, x1, y1] (highlighted on the locator)
//   img: close-up image in offer/img; beds / baths / reception / terrace: room schedule
// Units without an entry get the fallback page (key plan + floor plan with AP numbers).
window.ASSL_UNIT_DETAIL = {
  'H-G-04': { box: [0.163, 0.452, 0.445, 0.625], img: 'unit_H_G_04.jpg',
              beds: '3 (منها ماستر بدريسنج)', baths: '3', reception: '✓', terrace: '1' },
};
// Building outlines on masterplan_cut.webp as fractions [x0, y0, x1, y1] (matched from the brochure key plans)
window.ASSL_BUILDING_BOX = {
 "H1-4": [
  0.1611,
  0.1823,
  0.2229,
  0.2826
 ],
 "A1-9": [
  0.2306,
  0.1845,
  0.2962,
  0.2403
 ],
 "A1-10": [
  0.304,
  0.1823,
  0.3683,
  0.238
 ],
 "D1-3": [
  0.3773,
  0.1778,
  0.4223,
  0.2982
 ],
 "D1-2": [
  0.1521,
  0.3005,
  0.21,
  0.3985
 ],
 "C1-3": [
  0.2126,
  0.354,
  0.3065,
  0.4409
 ],
 "E1-2": [
  0.3323,
  0.2804,
  0.4133,
  0.4922
 ],
 "H1-2": [
  0.1238,
  0.4298,
  0.1856,
  0.5212
 ],
 "A1-8": [
  0.1894,
  0.4409,
  0.2589,
  0.5122
 ],
 "F1-2": [
  0.2615,
  0.4565,
  0.3297,
  0.5524
 ],
 "H1-3": [
  0.1109,
  0.5301,
  0.1688,
  0.6594
 ],
 "C1-4": [
  0.1779,
  0.6348,
  0.2756,
  0.6906
 ],
 "A1-7": [
  0.2834,
  0.6415,
  0.3554,
  0.6906
 ]
};
// Gold outline overlays (offer/img/bld_<building>.png) and their position on masterplan_cut.webp
window.ASSL_BUILDING_OVERLAY = {"H1-4": [0.1476, 0.1599, 0.2353, 0.3045], "A1-9": [0.2176, 0.1619, 0.3088, 0.2617], "A1-10": [0.2906, 0.1599, 0.3812, 0.2597], "D1-3": [0.3641, 0.1548, 0.4347, 0.3198], "D1-2": [0.1388, 0.278, 0.2229, 0.4206], "C1-3": [0.1994, 0.331, 0.3194, 0.4623], "E1-2": [0.3188, 0.2576, 0.4259, 0.5143], "H1-2": [0.1106, 0.4073, 0.1982, 0.5428], "A1-8": [0.1759, 0.4175, 0.2718, 0.5336], "F1-2": [0.2482, 0.4338, 0.3424, 0.5743], "H1-3": [0.0976, 0.5071, 0.1812, 0.6813], "C1-4": [0.1647, 0.612, 0.2882, 0.7128], "A1-7": [0.27, 0.6181, 0.3682, 0.7128]};
// Project name as it appears in the "Project Payments" sheet
window.OFFER_PROJECT = 'Assl New Cairo';
