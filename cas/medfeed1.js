// MEDFEED1 : cas classique (ancien MILNOUR). Formules reprises de MEDFEED1.exe.
import { cDepuisPh } from "../calculs.js";

const AGENTS_PH = ["Carbonate de soude", "Soude (en 100 %)"];
const REMPLACANTS_PHOSPHATE = [
  "Acide phosphorique (en 100 %)",
  "Phosphate disodique",
  "Phosphate trisodique",
  "Phosphate dipotassique",
];

function calculer(d) {
  const { caeau, mgeau, keau, seau, casel, mgsel, ksel, ssel, appoint, b, ph, agentPh, remplacant } = d;

  let nacl = 12 - 40 * b;
  if (nacl < 4) nacl = 4;

  let cacl2 = 0, ca;
  if (caeau + casel * nacl < 40) {
    cacl2 = (40 - caeau - casel * nacl) / 360;
    ca = 40;
  } else ca = caeau + casel * nacl;

  let mgso4 = 0, mg;
  if (mgeau + mgsel * nacl < 20) {
    mgso4 = (20 - mgeau - mgsel * nacl) / 96;
    mg = 20;
  } else mg = mgeau + mgsel * nacl;

  let k2so4 = 0;
  if (keau + ksel * nacl < 100) k2so4 = (100 - keau - ksel * nacl) / 448;
  // NB : test et correction n'utilisent pas la même échelle (0,184/1000 vs 184), comme dans l'original.
  if (seau + ssel * nacl + (k2so4 * 0.184) / 1000 < 50) {
    k2so4 += (50 - (seau + ssel * nacl + k2so4 * 184)) / 184;
  }

  const p = (ca / 2 + mg * 0.9) / 3 + 10;
  const c = cDepuisPh(ph);

  let car = 0, naoh = 0, bicar = 0;
  if (agentPh === 0) {
    car = 106 * b * (1 - c);
    bicar = 84 * (b * (2 * c - 1) - caeau / 20000 - mgeau / 12000);
  } else {
    naoh = 40 * b * (1 - c);
    bicar = Math.max(0, 84 * (b * c - caeau / 20000 - mgeau / 12000));
  }

  if (!(car >= 0 && naoh >= 0 && bicar >= 0 && ph >= 8.2 && ph <= 10.7)) {
    return { erreur: "pH initial trop bas (< 8,2) ou trop haut (> 10,7), ou alcalinité incompatible : changez les données." };
  }

  const uree = ((20 - (p / 270) * 1000 * 0.15) / 18 * 14 / 0.46) / 1000;
  const avertissements = [];
  let bicarNeutr = 0;
  if (uree < 0) {
    avertissements.push("On ne peut pas utiliser le phosphate monoammonique pour le milieu de culture.");
    if (remplacant === 0) bicarNeutr = ((p / 31) * 2 * 84) / 1000;
  }
  bicar += bicarNeutr;

  const milieu = [["Bicarbonate de sodium", bicar, "g/l"]];
  if (agentPh === 0 && car > 0) milieu.push(["Carbonate de sodium", car, "g/l"]);
  if (agentPh !== 0 && naoh > 0) milieu.push(["Soude (en 100 %)", naoh, "g/l"]);
  milieu.push(["Chlorure de sodium", nacl, "g/l"]);
  if (uree >= 0) {
    milieu.push(["Phosphate monoammonique", p / 270, "g/l"]);
  } else {
    const diviseurs = [316, 87, 81, 178];
    milieu.push([REMPLACANTS_PHOSPHATE[remplacant], p / diviseurs[remplacant], "g/l"]);
  }
  if (k2so4 > 0) milieu.push(["Sulfate dipotassique", k2so4, "g/l"]);
  if (mgso4 > 0) milieu.push(["Sulfate de magnésium", mgso4, "g/l"]);
  if (cacl2 !== 0) milieu.push(["Chlorure de calcium", cacl2, "g/l"]);
  milieu.push(["Urée", uree < 0 ? 0.03381642512077295 : uree, "g/l"]);
  milieu.push(["Ferfol", 8, "mg/l"]);

  // Nourriture
  const naclNour = 7;
  const cag = (appoint * caeau + naclNour * casel) / 1000;
  const mgg = (appoint * mgeau + naclNour * mgsel) / 1000;
  const kg = (appoint * keau + naclNour * ksel) / 1000;
  const sg = (appoint * seau + naclNour * ssel) / 1000;
  const caNour = Math.max(0, 7 - cag);
  const mgNour = Math.max(0, 3.5 - mgg);
  const kNour = Math.max(0, 16 - kg);
  const caPhos = Math.max(0, cag - 7);
  const mgPhos = Math.max(0, mgg - 3.5);
  let k2so4N = kNour / 0.448;
  const mgso4N = mgNour / 0.096;
  const manqueS = 11 - sg - k2so4N * 0.184 - mgso4N * 0.127;
  if (manqueS > 0) k2so4N += manqueS / 0.184;
  const phosMono = (10 + (caPhos / 2 + mgPhos * 0.9) / 3) / 0.27;

  const nourriture = [
    ["Urée", 300 - (phosMono * 0.12) / 0.46, "g/kg"],
    ["Phosphate monoammonique", phosMono, "g/kg"],
  ];
  if (k2so4N > 0) nourriture.push(["Sulfate dipotassique", k2so4N, "g/kg"]);
  if (mgso4N > 0) nourriture.push(["Sulfate de magnésium", mgso4N, "g/kg"]);
  if (caNour > 0) nourriture.push(["Chlorure de calcium", caNour / 0.36, "g/kg"]);
  nourriture.push(["Chlorure de sodium", 7, "g/kg"]);
  nourriture.push(["Ferfol", 4, "g/kg"]);

  return { avertissements, milieu, nourriture };
}

export default {
  id: "medfeed1",
  titre: "Classique",
  description: "Cas classique (ancien MILNOUR).",
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
    { titre: "Culture", colonnes: 2, champs: [
      { id: "b", label: "Alcalinité (mol/l)", defaut: "0,10" },
      { id: "ph", label: "pH initial", defaut: "9,6" },
      { id: "appoint", label: "Eau évaporée (l/kg de spiruline)", defaut: "500" },
    ] },
  ],
  listes: [
    { id: "agentPh", label: "Agent d'ajustement du pH", options: AGENTS_PH },
    { id: "remplacant", label: "Remplaçant du phosphate monoammonique", options: REMPLACANTS_PHOSPHATE,
      aide: "Utilisé seulement si le phosphate monoammonique ne convient pas." },
  ],
  calculer,
};
