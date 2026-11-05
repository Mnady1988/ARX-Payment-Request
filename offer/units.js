// Assl New Cairo — Phase 01 unit data (source: Digital_ASSL_v3 brochure, plan pages 23–40)
// Areas in m². G = ground floor, T = typical floors (1–6). Index 0 = AP-01.
window.ASSL_UNITS = {
  A: { buildings: ['A1-7', 'A1-8', 'A1-9', 'A1-10'],
       G: [158, 143, 127, 143, 158, 92, 92],
       T: [178, 159, 137, 161, 178, 104, 104] },
  C: { buildings: ['C1-4', 'C1-5'],
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
// Project name as it appears in the "Project Payments" sheet
window.OFFER_PROJECT = 'Assl New Cairo';
