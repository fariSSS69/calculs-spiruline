// MEDFEED8 : cas NPK + eau de cendre + eau de mer + CaCl2. Formules reprises de MEDFEED8.exe
// (« MEDFEED NPK + EDC + EDM + CaCl2 »).
// NB : l'original calcule c = fcexph(ph) au début du clic, mais c n'est jamais utilisé
// (et ph n'est pas une saisie : il est fixé à 10 ensuite, eau de cendre « carbonatée à pH 10 »).
// cDepuisPh n'est donc pas importé ici.

function calculer(d) {
  const {
    caeau, mgeau, keau, seau,
    casel, mgsel, ksel, ssel,
    caedc, mgedc, kedc, sedc,
    nnpk, pnpk, knpk, snpk,
    appoint, b,
  } = d;
  let nnh4 = d.nnh4;
  if (nnh4 === 0) nnh4 = 0.1;

  const fracn = nnpk / 100;
  const fracp = (pnpk * 0.437) / 100;
  const frack = (knpk * 0.83) / 100;
  const fracs = snpk / 100;

  // ---- Milieu ----
  let edm = 0, npk = 0, ca = 0, mg = 0, k = 0, s = 0, p = 0, cacl2 = 0;
  let km = 0, sm = 0, npkk = 0, npks = 0;

  const edc = (b / (kedc - 2.438 * sedc)) * 39000;
  if (edc >= 1) return { erreur: "L'eau de cendre est trop diluée en K." };

  let nacl = 12 - 40 * b;
  if (nacl < 4) nacl = 4;
  if ((99.2 * b) / nacl >= 5) return { erreur: "Rapport pondéral K/Na > 5 : baissez l'alcalinité." };

  if (mgeau * (1 - edc) + mgsel * nacl + mgedc * edc < 20) {
    edm = (20 - mgeau * (1 - edc) - mgsel * nacl - edc * mgedc) / 1295;
  } else edm = 0;
  const nacl1 = nacl - edm * 25;
  if (mgeau * (1 - edc - edm) + mgsel * nacl1 + mgedc * edc < 20) {
    edm = (20 - mgeau * (1 - edc - edm) - mgsel * nacl1 - edc * mgedc) / 1295;
  } else edm = 0;
  nacl = nacl - edm * 25;
  if ((99.2 * b) / nacl >= 5) return { erreur: "Rapport pondéral K/Na > 5 : baissez l'alcalinité." };

  // NB : ce Mg ignore l'eau de mer (facteur 1 - edc sans - edm, pas de edm × 1295), comme dans l'original.
  const mgTest = mgeau * (1 - edc) + mgsel * nacl + mgedc * edc;
  mg = mgTest >= 20 ? mgTest : 20;

  ca = caeau * (1 - edc - edm) + casel * nacl + edm * 416 + edc * caedc;
  cacl2 = ca < 40 ? (40 - ca) / 360 : 0;
  if (ca < 40) ca = 40;

  // NB : coefficient 0,8 sur Mg ici, contre 0,9 pour la nourriture, comme dans l'original.
  p = (ca / 2 + 0.8 * mg) / 3 + 10;
  npk = p / fracp;
  k = keau * (1 - edc - edm) + ksel * nacl + edm * 390 + edc * kedc + npk * frack;
  km = 100 - k;
  npkk = km > 0 ? km / frack : 0;
  // NB : le S apporté par le NPK de base (npk × fracs) n'est pas compté, alors que le K l'est.
  s = seau * (1 - edc - edm) + ssel * nacl + edm * 900 + edc * sedc;
  sm = 50 - s;
  npks = sm > 0 ? sm / fracs : 0;
  npk += npkk > npks ? npkk : npks;

  const milieu = [["Eau de cendre", edc, "l/l"]];
  if (edm > 0) milieu.push(["Eau de mer", edm * 1000, "ml/l"]);
  if (nacl > 0) milieu.push(["Chlorure de sodium", nacl, "g/l"]);
  milieu.push(["NPK", npk / 1000, "g/l"]);
  const nh4 = (npk * nnh4) / 100;
  const desamo = (1 - 20 / nh4) * 100;
  if (nh4 > 20) milieu.push(["Part du NPK à désammonier avant utilisation", Math.floor(desamo), "%"]);
  if (cacl2 > 0) milieu.push(["Chlorure de calcium (en 100 %)", cacl2, "g/l"]);
  milieu.push(["Ferfol", 8, "mg/l"]);

  // ---- Nourriture (par kg de spiruline) ----
  edm = 0;
  nacl = 7;
  ca = 0; mg = 0; k = 0; s = 0; p = 0; cacl2 = 0;

  mg = appoint * mgeau + nacl * mgsel;
  const mgm = 3.5 - mg / 1000;
  edm = mgm > 0 ? mgm / 1.295 : 0;
  nacl = nacl - 25 * edm;
  // NB : utilise nacl1 (sel du milieu) au lieu de nacl (sel de la nourriture), comme dans l'original.
  ca = appoint * caeau + nacl1 * casel + edm * 416;
  const cam = 7 - ca / 1000;
  cacl2 = cam > 0 ? cam / 0.36 : 0;
  mg = (appoint - edm) * mgeau + nacl * mgsel + edm * 1295;
  // NB : cacl2 (en g) × 0,36 ajouté à ca (en mg) : facteur 1000 manquant, comme dans l'original.
  ca = (appoint - edm) * caeau + nacl * casel + edm * 416 + cacl2 * 0.36;
  let caex = ca / 1000 - 7;
  if (caex < 0) caex = 0;
  let mgex = mg / 1000 - 3.5;
  if (mgex < 0) mgex = 0;
  const pm = 10 + (caex / 2 + mgex * 0.9) / 3;
  npk = pm / fracp;
  k = (appoint - edm) * keau + nacl * ksel + npk * frack * 1000 + edm * 390;
  s = (appoint - edm) * seau + nacl * ssel + npk * fracs * 1000 + edm * 900;
  km = 16 - k / 1000;
  sm = 11 - s / 1000;
  npkk = km > 0 ? km / frack : 0;
  npks = sm > 0 ? sm / fracs : 0;
  npk += npkk >= npks ? npkk : npks;
  let uree = 300 - (npk * fracn) / 0.46;
  if (uree < 0) uree = 0;

  const nourriture = [
    ["Urée", uree, "g/kg"],
    ["NPK", npk, "g/kg"],
  ];
  if (edm !== 0) nourriture.push(["Eau de mer", edm, "l/kg"]);
  if (cacl2 > 0) nourriture.push(["Chlorure de calcium (en 100 %)", cacl2, "g/kg"]);
  if (nacl > 0) nourriture.push(["Chlorure de sodium", nacl, "g/kg"]);
  nourriture.push(["Ferfol", 4, "g/kg"]);

  return { avertissements: [], milieu, nourriture };
}

export default {
  id: "medfeed8",
  titre: "NPK + eau de cendre + eau de mer + CaCl2",
  description: "Engrais NPK, eau de cendre (alcalinité), eau de mer (Mg) et chlorure de calcium (MEDFEED NPK + EDC + EDM + CaCl2).",
  groupes: [
    { titre: "Eau (mg/l)", colonnes: 4, champs: [
      { id: "caeau", label: "Ca", defaut: "30" },
      { id: "mgeau", label: "Mg", defaut: "8" },
      { id: "keau", label: "K", defaut: "1" },
      { id: "seau", label: "S", defaut: "9" },
    ] },
    { titre: "Sel (mg/g)", colonnes: 4, champs: [
      { id: "casel", label: "Ca", defaut: "0" },
      { id: "mgsel", label: "Mg", defaut: "0" },
      { id: "ksel", label: "K", defaut: "0" },
      { id: "ssel", label: "S", defaut: "0" },
    ] },
    { titre: "Eau de cendre (mg/l)", colonnes: 4,
      aide: "On admet que l'eau de cendre est carbonatée à pH 10 et que le soufre est sous forme K2SO4, donc que le K lié au S = 2,438 × S et le K alcalin = K total − 2,438 × S. Teneurs typiques dans l'eau de cendre (mg/l) : K = 15000, S = 1500 ; Mg et Ca < 10.",
      champs: [
        { id: "caedc", label: "Ca", defaut: "1" },
        { id: "mgedc", label: "Mg", defaut: "1" },
        { id: "kedc", label: "K", defaut: "15000" },
        { id: "sedc", label: "S", defaut: "1500" },
      ] },
    { titre: "Engrais NPK (%)", colonnes: 2,
      aide: "S dans le NPK = N-NH4 en général.",
      champs: [
        { id: "nnpk", label: "N", defaut: "15" },
        { id: "pnpk", label: "P2O5", defaut: "15" },
        { id: "knpk", label: "K2O", defaut: "15" },
        { id: "snpk", label: "S", defaut: "12" },
        { id: "nnh4", label: "N-NH4", defaut: "12" },
      ] },
    { titre: "Culture", colonnes: 2, champs: [
      { id: "b", label: "Alcalinité (mol/l)", defaut: "0,10" },
      { id: "appoint", label: "Eau évaporée (l/kg de spiruline)", defaut: "500" },
    ] },
  ],
  listes: [],
  calculer,
};
