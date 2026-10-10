// MEDFEED2 : cas classique sans salinisation. Formules reprises de MEDFEED2.exe (MEDFEED sans salinisation).
import { cDepuisPh } from "../calculs.js";

const AGENTS_PH = ["Carbonate de soude", "Soude (en 100 %)"];
const REMPLACANTS_PHOSPHATE = [
  "Acide phosphorique (en 100 %)",
  "Phosphate disodique",
  "Phosphate trisodique",
  "Phosphate dipotassique",
];

function calculer(d) {
  const { caeau, mgeau, keau, seau, naeau, cleau, casel, mgsel, ksel, ssel, appoint, b, ph, agentPh, remplacant } = d;

  // ---- Milieu de culture (identique à MEDFEED1) ----
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
  // NB : dans l'original, bicarneutr n'était pas remis à zéro entre deux clics (valeur résiduelle possible) ; ici calcul neuf.
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

  // ---- Nourriture (sans salinisation : l'eau d'appoint est limitée par l'élément le plus abondant) ----
  const eauca = caeau !== 0 ? 7000 / caeau : 10000;
  const eaumg = mgeau !== 0 ? 3500 / mgeau : 10000;
  const eauna = naeau !== 0 ? 6000 / naeau : 10000;
  const eauk = keau !== 0 ? 16000 / keau : 10000;
  const eaucl = cleau !== 0 ? 4200 / cleau : 10000;
  const eaus = seau !== 0 ? 11000 / seau : 10000;
  let eaum = eauca >= eaumg ? eaumg : eauca;
  if (eaum >= eauna) eaum = eauna;
  if (eaum >= eauk) eaum = eauk;
  if (eaum >= eaucl) eaum = eaucl;
  if (eaum >= eaus) eaum = eaus;
  if (appoint <= eaum) eaum = appoint;

  const clg = (eaum * cleau) / 1000;
  const nag = (eaum * naeau) / 1000;
  const cag = (eaum * caeau) / 1000;
  const mgg = (eaum * mgeau) / 1000;
  const kg = (eaum * keau) / 1000;
  const sg = (eaum * seau) / 1000;

  let hcl = 4.2 - clg >= 0 ? ((4.2 - clg) / 35.5) * 36.5 : 0;
  const chaux = 7 - cag >= 0 ? (7 - cag) / 0.54 : 0;
  // NB : si l'eau apporte déjà assez de Mg, l'original met mgo = 3 (et non 0) ; reproduit tel quel.
  // NB : masse molaire MgO prise à 40,5 ici puis 40,3 plus bas, comme dans l'original.
  let mgo = 3.5 - mgg >= 0 ? ((3.5 - mgg) / 24.3) * 40.5 : 3;
  const koh = 18 - kg >= 0 ? ((18 - kg) / 39) * 56 : 0;
  const snour = 11 - sg >= 0 ? 11 - sg : 0;
  let bicarbonate = 6 - nag >= 0 ? ((6 - nag) / 23) * 84 : 0;
  const aphos = 31.645569620253163;
  let asulf = snour / 0.327;

  let naclN, mgso4N;
  if (hcl / 36.5 < bicarbonate / 84) {
    bicarbonate -= (hcl / 36.5) * 84;
    naclN = (hcl / 36.5) * 58.5;
    hcl = 0;
  } else {
    hcl -= (bicarbonate / 84) * 36.5;
    naclN = (bicarbonate / 84) * 58.5;
    bicarbonate = 0;
  }
  if (mgo / 40.3 < asulf / 98) {
    asulf -= (mgo / 40.3) * 98;
    mgso4N = (mgo / 40.3) * 246.5;
    mgo = 0;
  } else {
    mgo -= (asulf / 98) * 40.3;
    mgso4N = (asulf / 98) * 246.5;
    asulf = 0;
  }
  // NB : chaux divisée par 57 (Ca(OH)2 = 74 g/mol) dans le bilan ammoniaque, comme dans l'original.
  const nh4oh =
    ((aphos / 98) * 3 + (asulf / 98) * 2 - koh / 56 - (mgo / 40.3) * 2 - (chaux / 57) * 2) * 35;

  const nourriture = [
    ["Eau d'appoint pour compenser l'évaporation", Math.floor(eaum), "l/kg"],
    ["Urée", 300 - ((nh4oh / 35) * 14) / 0.46, "g/kg"],
    ["Potasse (en 100 %)", koh, "g/kg"],
  ];
  if (chaux !== 0) nourriture.push(["Chaux éteinte", chaux, "g/kg"]);
  if (mgo !== 0) nourriture.push(["Magnésie (MgO)", mgo, "g/kg"]);
  if (mgso4N !== 0) nourriture.push(["Sulfate de magnésium", mgso4N, "g/kg"]);
  if (naclN !== 0) nourriture.push(["Chlorure de sodium", naclN, "g/kg"]);
  if (hcl !== 0) nourriture.push(["Acide chlorhydrique (en 100 %)", hcl, "g/kg"]);
  nourriture.push(["Acide phosphorique (en 100 %)", aphos, "g/kg"]);
  if (asulf !== 0) nourriture.push(["Acide sulfurique (en 100 %)", asulf, "g/kg"]);
  nourriture.push(["Ammoniaque (en 100 % de NH4OH)", nh4oh, "g/kg"]);
  if (bicarbonate !== 0) nourriture.push(["Bicarbonate de soude", bicarbonate, "g/kg"]);
  nourriture.push(["Ferfol", 4, "g/kg"]);

  return { avertissements, milieu, nourriture };
}

export default {
  id: "medfeed2",
  titre: "Sans salinisation",
  description: "Cas classique sans salinisation (MEDFEED sans salinisation) : nourriture à base d'acides et de bases, eau d'appoint limitée.",
  groupes: [
    { titre: "Eau (mg/l)", colonnes: 4, champs: [
      { id: "caeau", label: "Ca", defaut: "30" },
      { id: "mgeau", label: "Mg", defaut: "8" },
      { id: "keau", label: "K", defaut: "1" },
      { id: "seau", label: "S", defaut: "9" },
      { id: "naeau", label: "Na", defaut: "3" },
      { id: "cleau", label: "Cl", defaut: "0" },
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
      { id: "appoint", label: "Eau pour compenser l'évaporation, maximum (l/kg)", defaut: "1000" },
    ] },
  ],
  listes: [
    { id: "agentPh", label: "Agent d'ajustement du pH", options: AGENTS_PH },
    { id: "remplacant", label: "Remplaçant du phosphate monoammonique", options: REMPLACANTS_PHOSPHATE,
      aide: "Utilisé seulement si le phosphate monoammonique ne convient pas." },
  ],
  calculer,
};
