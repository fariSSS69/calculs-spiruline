// MEDFEED9 : au potassium et sans salinisation. Formules reprises de MEDFEED9.exe.
import { cDepuisPh } from "../calculs.js";

const AGENTS_PH = ["Carbonate de potassium", "Potasse (en 100 %)"];
const SEUIL_P = 44.285714285714285; // P maxi apporté par le phosphate monoammonique (mg/l)

function calculer(d) {
  const { caeau, mgeau, naeau, keau, seau, cleau, casel, mgsel, ksel, ssel, appoint, b, ph, agentPh } = d;

  // ---------- Milieu de culture ----------
  let nacl = 0, aphos = 0, uree = 0, mono = 0, car = 0, bicark = 0, koh = 0, bicarkneutr = 0, n = 0;
  let cacl2 = 0, ca = 0, mgso4 = 0, mg = 0, k2so4 = 0, p = 0, somk = 0, kasurna = 0, clmilieu = 0;
  const c = cDepuisPh(ph);

  if (agentPh === 0) {
    car = 138 * b * (1 - c);
    const x = 100 * (b * (2 * c - 1) - caeau / 20000 - mgeau / 12000);
    bicark = x > 0 ? x : 0;
  } else if (agentPh === 1) {
    koh = 56 * b * (1 - c);
    const x = 100 * (b * c - caeau / 20000 - mgeau / 12000);
    bicark = x > 0 ? x : 0;
  }

  if (!(car >= 0 && koh >= 0 && bicark >= 0 && ph >= 8.2 && ph <= 10.7)) {
    return { erreur: "pH initial trop bas (< 8,2) ou trop haut (> 10,7) : changez les données." };
  }

  // Le sel est augmenté par pas de 0,01 g/l jusqu'à K/Na < 4,98 et Cl ≥ 607 mg/l.
  do {
    nacl += 0.01;
    n += 1;
    if (n >= 100000) {
      return { erreur: "Dureté de l'eau trop forte ou K/Na trop proche du maxi autorisé." };
    }
    cacl2 = caeau + casel * nacl < 40 ? (40 - caeau - casel * nacl) / 360 : 0;
    ca = caeau + casel * nacl >= 40 ? caeau + casel * nacl : 40;
    mgso4 = mgeau + mgsel * nacl < 20 ? (20 - mgeau - mgsel * nacl) / 96 : 0;
    mg = mgeau + mgsel * nacl >= 20 ? mgeau + mgsel * nacl : 20;
    k2so4 = seau + ssel * nacl + 127 * mgso4 < 50 ? (50 - (seau + ssel * nacl + 127 * mgso4)) / 184 : 0;
    p = (ca / 2 + mg * 0.9) / 3 + 10;
    if (p >= SEUIL_P) aphos = (p - SEUIL_P) / 0.316;
    if (p >= SEUIL_P) mono = 164.28571428571428;
    if (p < SEUIL_P) mono = (p / 31) * 115;
    // NB : si p ≥ 44,29 l'urée n'est jamais recalculée (reste à 0 ou à la valeur d'un tour précédent), comme dans l'original.
    if (p < SEUIL_P) uree = (20 - 0.4516 * p) / 0.46;
    if (aphos > 0) {
      bicarkneutr = ((aphos / 98) * 2 * 100) / 1000;
      // NB : bicark est augmenté à CHAQUE tour de boucle (cumul), comme dans l'original.
      bicark += bicarkneutr;
    }
    // NB : ksel * nacl est en mg/l alors que les autres termes sont en g/l, comme dans l'original.
    somk = keau / 1000 + ksel * nacl + 0.393 * bicark + 0.56 * car + 0.696 * koh + 0.448 * k2so4;
    kasurna = somk / (naeau / 1000 + 0.39 * nacl);
    clmilieu = 607 * nacl + cleau;
  } while (kasurna >= 4.98 || clmilieu < 607);

  const avertissements = [];
  const milieu = [["Bicarbonate de potassium", bicark * 1000, "g/1000 l"]];
  if (agentPh === 0 && car > 0) milieu.push(["Carbonate de potassium", car * 1000, "g/1000 l"]);
  if (agentPh !== 0 && koh > 0) milieu.push(["Potasse (en 100 %)", koh * 1000, "g/1000 l"]);
  milieu.push(["Chlorure de sodium", nacl * 1000, "g/1000 l"]);
  if (k2so4 > 0) milieu.push(["Sulfate dipotassique", k2so4 * 1000, "g/1000 l"]);
  if (mgso4 > 0) milieu.push(["Sulfate de magnésium", mgso4 * 1000, "g/1000 l"]);
  if (cacl2 !== 0) milieu.push(["Chlorure de calcium", cacl2 * 1000, "g/1000 l"]);
  milieu.push(["Phosphate monoammonique", mono, "g/1000 l"]);
  // NB : aphos est déjà en mg/l (= g/1000 l) ; le × 1000 de l'original semble en trop.
  if (aphos !== 0) milieu.push(["Acide phosphorique (en 100 %)", aphos * 1000, "g/1000 l"]);
  milieu.push(["Urée", uree, "g/1000 l"]);
  milieu.push(["Ferfol", 8, "g/1000 l"]);
  milieu.push(["Pour info : K / Na pondéral", kasurna, ""]);
  milieu.push(["Pour info : Cl dans le milieu", clmilieu, "mg/l"]);
  // NB : en sortie de boucle kasurna < 4,98, donc cet avertissement ne peut pas apparaître (code mort dans l'original).
  if (kasurna >= 4.98) {
    avertissements.push("Le rapport K/Na est proche du maxi autorisé : changez la qualité de l'eau !");
  }

  // ---------- Nourriture ----------
  let bicarna = 0, hcl = 0, asulf = 0, chaux = 0, mgo = 0, kohN = 0, snour = 0;
  let mgso4N = 0, naclN = 0, eaum = 0;
  const eauca = caeau !== 0 ? 7000 / caeau : 10000;
  const eaumg = mgeau !== 0 ? 3500 / mgeau : 10000;
  const eauna = naeau !== 0 ? 5400 / naeau : 10000;
  const eauk = keau !== 0 ? 16000 / keau : 10000;
  const eaucl = cleau !== 0 ? 4200 / cleau : 10000;
  const eaus = seau !== 0 ? 11000 / seau : 10000;
  eaum = eauca >= eaumg ? eaumg : eauca;
  if (eaum >= eauna) eaum = eauna;
  if (eaum >= eauk) eaum = eauk;
  if (eaum >= eaucl) eaum = eaucl;
  if (eaum >= eaus) eaum = eaus;
  if (appoint <= eaum) eaum = Math.floor(appoint);

  const clg = (eaum * cleau) / 1000;
  const nag = (eaum * naeau) / 1000;
  const cag = (eaum * caeau) / 1000;
  const mgg = (eaum * mgeau) / 1000;
  const kg = (eaum * keau) / 1000;
  const sg = (eaum * seau) / 1000;

  hcl = 4.2 - clg >= 0 ? ((4.2 - clg) / 35.5) * 36.5 : 0;
  chaux = 7 - cag >= 0 ? (7 - cag) / 0.54 : 0;
  // NB : si l'eau apporte déjà assez de Mg, l'original met MgO = 3 (et non 0).
  mgo = 3.5 - mgg >= 0 ? ((3.5 - mgg) / 24.3) * 40.5 : 3;
  kohN = 18 - kg >= 0 ? ((18 - kg) / 39) * 56 : 0;
  snour = 11 - sg >= 0 ? 11 - sg : 0;
  bicarna = 5.4 - nag >= 0 ? ((5.4 - nag) / 23) * 84 : 0;
  aphos = 31.645569620253163;
  asulf = snour / 0.327;

  if (hcl / 36.5 < bicarna / 84) {
    bicarna = bicarna - (hcl / 36.5) * 84;
    naclN = (hcl / 36.5) * 58.5;
    hcl = 0;
  } else {
    hcl = hcl - (bicarna / 84) * 36.5;
    naclN = (bicarna / 84) * 58.5;
    bicarna = 0;
  }
  if (mgo / 40.3 < asulf / 98) {
    asulf = asulf - (mgo / 40.3) * 98;
    mgso4N = (mgo / 40.3) * 246.5;
    mgo = 0;
  } else {
    mgo = mgo - (asulf / 98) * 40.3;
    mgso4N = (asulf / 98) * 246.5;
    asulf = 0;
  }
  // NB : la chaux éteinte est comptée à 57 g/mol (Ca(OH)2 = 74), comme dans l'original.
  const nh4oh = ((aphos / 98) * 3 + (asulf / 98) * 2 - kohN / 56 - (mgo / 40.3) * 2 - (chaux / 57) * 2) * 35;

  const nourriture = [
    ["Eau d'appoint maxi pour compenser l'évaporation sans saliniser le milieu", eaum, "l/kg"],
    ["Urée", 300 - ((nh4oh / 35) * 14) / 0.46, "g/kg"],
    ["Potasse caustique (en 100 %)", kohN, "g/kg"],
  ];
  if (chaux !== 0) nourriture.push(["Chaux éteinte", chaux, "g/kg"]);
  if (mgo !== 0) nourriture.push(["Magnésie (MgO)", mgo, "g/kg"]);
  if (mgso4N !== 0) nourriture.push(["Sulfate de magnésium", mgso4N, "g/kg"]);
  if (naclN !== 0) nourriture.push(["Chlorure de sodium", naclN, "g/kg"]);
  if (hcl !== 0) nourriture.push(["Acide chlorhydrique (en 100 %)", hcl, "g/kg"]);
  nourriture.push(["Acide phosphorique (en 100 %)", aphos, "g/kg"]);
  if (asulf !== 0) nourriture.push(["Acide sulfurique (en 100 %)", asulf, "g/kg"]);
  nourriture.push(["Ammoniaque (en 100 % de NH4OH)", nh4oh, "g/kg"]);
  if (bicarna !== 0) nourriture.push(["Bicarbonate de soude", bicarna, "g/kg"]);
  nourriture.push(["Ferfol", 4, "g/kg"]);

  return { avertissements, milieu, nourriture };
}

export default {
  id: "medfeed9",
  titre: "Au potassium, sans salinisation",
  description: "Milieu au potassium (K/Na < 5) et nourriture sans salinisation : l'eau d'appoint est limitée pour ne pas saliniser le milieu.",
  groupes: [
    { titre: "Eau (mg/l)", colonnes: 4, champs: [
      { id: "caeau", label: "Ca", defaut: "0" },
      { id: "mgeau", label: "Mg", defaut: "0" },
      { id: "keau", label: "K", defaut: "0" },
      { id: "seau", label: "S", defaut: "0" },
      { id: "naeau", label: "Na", defaut: "0" },
      { id: "cleau", label: "Cl", defaut: "0" },
    ] },
    { titre: "Sel (mg/g)", colonnes: 4, champs: [
      { id: "casel", label: "Ca", defaut: "0" },
      { id: "mgsel", label: "Mg", defaut: "0" },
      { id: "ksel", label: "K", defaut: "0" },
      { id: "ssel", label: "S", defaut: "0" },
    ] },
    { titre: "Culture", colonnes: 2, champs: [
      { id: "b", label: "Alcalinité (mol/l)", defaut: "0,05" },
      { id: "ph", label: "pH initial", defaut: "10" },
      { id: "appoint", label: "Eau pour compenser l'évaporation, maximum autorisé (l/kg)", defaut: "1000" },
    ] },
  ],
  listes: [
    { id: "agentPh", label: "Agent d'ajustement du pH", options: AGENTS_PH },
  ],
  calculer,
};
