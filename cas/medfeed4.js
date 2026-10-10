// MEDFEED4 : eau de cendre + eau de mer + acide phosphorique + urée.
// Formules reprises de MEDFEED4.exe (medfeed_EDM_EDC_Acide_Phos).
// NB : l'original fixe ph = 10 sans s'en servir et n'appelle pas fcexph : pas d'import de cDepuisPh ici.

function calculer(d) {
  const { caeau, mgeau, keau, seau, casel, mgsel, ksel, ssel, caedc, mgedc, kedc, sedc, appoint, b } = d;

  // ---- Milieu (par litre) ----
  let edc = 0, edm = 0, edms = 0;
  edc = (b / (kedc - 2.438 * sedc)) * 39000;
  if (edc >= 1) return { erreur: "L'eau de cendre est trop diluée en K." };

  let nacl = 12 - 40 * b;
  if (nacl < 4) nacl = 4;

  // Composition du milieu (mg/l) pour les quantités courantes d'eau de cendre (edc, l) et d'eau de mer (edm, l).
  const compo = () => ({
    mg: mgeau * (1 - edc - edm) + mgsel * nacl + edm * 1295 + edc * mgedc,
    ca: caeau * (1 - edc - edm) + casel * nacl + edm * 416 + edc * caedc,
    k: keau * (1 - edc - edm) + ksel * nacl + edm * 390 + edc * kedc,
    s: seau * (1 - edc - edm) + ssel * nacl + edm * 900 + edc * sedc,
  });

  // (edm = 0 ici : même formule que compo().mg)
  let mg = mgeau * (1 - edc) + mgsel * nacl + mgedc * edc;
  edm = mg <= 20 ? (20 - mg) / 1295 : 0;
  if (mg <= 20) mg = 20;
  nacl -= edm * 25;
  let { ca, k, s } = compo();
  if (k < 100) return { erreur: "Augmenter la basicité car on manque de K." };

  edms = s <= 50 ? (50 - s) / 900 : 0;
  edm += edms;
  if (s <= 50) s = 50;
  nacl -= edms * 25;
  ({ mg, ca, k, s } = compo());

  // NB : si ca > 40, edms garde la valeur de l'étape soufre et est rajouté à edm (deux fois), comme dans l'original.
  for (let i = 0; i < 2; i++) {
    if (ca <= 40) edms = (40 - ca) / 416;
    edm += edms;
    if (ca <= 40) ca = 40;
    nacl -= edms * 25;
    ({ mg, ca, k, s } = compo());
  }

  if (k / 1000 / ((nacl * 23) / 58.5) >= 5) {
    return { erreur: "Rapport pondéral K/Na > 5 : baissez l'alcalinité." };
  }

  const p = (ca / 2 + mg * 0.9) / 3 + 10;
  const h3po4 = p / 316;
  const uree = 7.0 / 207.0;

  const milieu = [
    ["Eau de cendre", edc * 1000, "ml/l"],
    ["Eau de mer", edm * 1000, "ml/l"],
    ["Chlorure de sodium", nacl, "g/l"],
    ["Acide phosphorique (en 100 %)", h3po4, "g/l"],
    ["Urée", uree * 1000, "mg/l"],
    ["Ferfol", 8, "mg/l"],
  ];

  // ---- Nourriture (par kg de spiruline) ----
  edc = 0;
  edm = 0;
  nacl = 7;
  // Apports en g/kg ; edc et edm en litres/kg.
  const apports = () => ({
    mg: (appoint * mgeau + nacl * mgsel + edc * mgedc + edm * 1295) / 1000,
    ca: (appoint * caeau + nacl * casel + edc * caedc + edm * 416) / 1000,
    k: (appoint * keau + nacl * ksel + edc * kedc + edm * 390) / 1000,
    s: (appoint * seau + nacl * ssel + edc * sedc + edm * 900) / 1000,
  });
  const manques = () => {
    const a = apports();
    return { mg: a.mg, ca: a.ca, mgm: 3.5 - a.mg, cam: 7 - a.ca, km: 16 - a.k, sm: 11 - a.s };
  };

  let m = manques();
  edc = m.km > 0 ? (m.km / kedc) * 1000 : 0;
  m = manques();
  if (m.sm > 0) edm += (m.sm / 900) * 1000;
  nacl = 7 - 25 * edm > 0 ? 7 - 25 * edm : 0;
  m = manques();
  if (m.cam > 0) edm += (m.cam / 416) * 1000;
  nacl = 7 - 25 * edm > 0 ? 7 - 25 * edm : 0;
  m = manques();
  if (m.mgm > 0) edm += (m.mgm / 1295) * 1000;
  nacl = 7 - 25 * edm > 0 ? 7 - 25 * edm : 0;
  m = manques();

  const nourriture = [
    ["Eau de mer", edm, "l/kg"],
    ["Eau de cendre", edc, "l/kg"],
    ["Urée", 300, "g/kg"],
    ["Acide phosphorique (en 100 %)", ((m.ca / 2 + m.mg * 0.9) / 3 + 10) / 0.316, "g/kg"],
  ];
  if (nacl !== 0) nourriture.push(["Chlorure de sodium", nacl, "g/kg"]);
  // NB : l'original affiche « Ferfol, mg/kg » = 4 (MEDFEED1 affiche 4 g/kg).
  nourriture.push(["Ferfol", 4, "mg/kg"]);

  return { avertissements: [], milieu, nourriture };
}

export default {
  id: "medfeed4",
  titre: "Eau de cendre + eau de mer + acide phosphorique",
  description: "Milieu et nourriture avec eau de cendre (EDC), eau de mer (EDM), acide phosphorique et urée.",
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
      aide: "On admet que l'eau de cendre est carbonatée à pH 10 et que le soufre est sous forme K2SO4 (K lié au S = 2,438 × S). Teneurs typiques : K = 15000, S = 1500 ; Mg et Ca < 10.",
      champs: [
        { id: "caedc", label: "Ca", defaut: "1" },
        { id: "mgedc", label: "Mg", defaut: "1" },
        { id: "kedc", label: "K", defaut: "15000" },
        { id: "sedc", label: "S", defaut: "1500" },
      ] },
    { titre: "Culture", colonnes: 2, champs: [
      { id: "appoint", label: "Eau évaporée (l/kg de spiruline)", defaut: "500" },
      { id: "b", label: "Alcalinité (mol/l)", defaut: "0,10" },
    ] },
  ],
  listes: [],
  calculer,
};
