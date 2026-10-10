// MEDFEED7 : cas NPK + eau de mer (comme apport de Mg) + CaCl2. Formules reprises de MEDFEED NPK + EDM + CaCl2.exe.
import { cDepuisPh } from "../calculs.js";

const AGENTS_PH = ["Carbonate de soude", "Soude (en 100 %)"];

function calculer(d) {
  const { caeau, mgeau, keau, seau, casel, mgsel, ksel, ssel, nnpk, pnpk, knpk, snpk, appoint, b, ph, agentPh } = d;
  let { nnh4 } = d;
  if (nnh4 === 0) nnh4 = 0.01;

  const fracn = nnpk / 100;
  const fracp = (pnpk * 0.437) / 100;
  const frack = (knpk * 0.83) / 100;
  const fracs = snpk / 100;

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

  // Milieu
  let nacl = 12 - 40 * b;
  if (nacl < 4) nacl = 4;
  const mg = mgeau + mgsel * nacl;
  let ca = caeau + casel * nacl;
  const mgm = 20 - mg;
  const edm = mgm >= 0 ? mgm / 1.295 : 0; // ml/l
  nacl -= (edm * 25) / 1000;
  ca = caeau * (1 - edm / 1000) + casel * nacl + edm * 0.416;
  const cam = 40 - ca;
  const cacl2 = cam >= 0 ? cam / 360 : 0;
  // NB : mg n'est pas recalculé après l'ajout d'eau de mer (Mg d'avant EDM utilisé pour P), comme dans l'original.
  const p = (ca / 2 + 0.9 * mg) / 3 + 10;
  let npk = p / fracp;
  const k = keau * (1 - edm / 1000) + ksel * nacl + edm * 0.39 + npk * frack;
  const km = 100 - k;
  const npkk = km > 0 ? km / frack : 0;
  const s = seau * (1 - edm / 1000) + ssel * nacl + npk * fracs + edm * 0.9;
  const sm = 50 - s;
  const npks = sm > 0 ? sm / fracs : 0;
  npk += npkk > npks ? npkk : npks;

  const milieu = [["Bicarbonate de sodium", bicar, "g/l"]];
  if (agentPh === 0 && car > 0) milieu.push(["Carbonate de sodium", car, "g/l"]);
  if (agentPh === 1 && naoh > 0) milieu.push(["Soude (en 100 %)", naoh, "g/l"]);
  if (nacl > 0) milieu.push(["Chlorure de sodium", nacl, "g/l"]);
  milieu.push(["NPK", npk / 1000, "g/l"]);
  const nh4 = (npk * nnh4) / 100;
  let desamo = (1 - 20 / nh4) * 100;
  if (desamo < 0) desamo = 0;
  milieu.push(["NPK à désammonier avant utilisation", desamo, "%"]);
  if (nh4 < 20) milieu.push(["Urée", ((20 - nh4) * 14) / 18 / 460, "g/l"]);
  if (edm > 0) milieu.push(["Eau de mer", edm, "ml/l"]);
  if (cacl2 > 0) milieu.push(["Chlorure de calcium (en 100 %)", cacl2, "g/l"]);
  milieu.push(["Ferfol", 8, "mg/l"]);

  // Nourriture
  let naclN = 7;
  let mgN = appoint * mgeau + naclN * mgsel;
  const mgmN = 3.5 - mgN / 1000;
  const edmN = mgmN > 0 ? mgmN / 1.295 : 0; // l/kg
  naclN -= edmN * 25;
  let caN = appoint * caeau + naclN * casel + edmN * 416;
  const camN = 7 - caN / 1000;
  const cacl2N = camN > 0 ? camN / 0.36 : 0;
  mgN = appoint * mgeau + naclN * mgsel + edmN * 1295;
  // NB : cacl2 (g) × 0,36 ajouté à ca (mg) : facteur 1000 probablement manquant, comme dans l'original.
  caN = appoint * caeau + naclN * casel + edmN * 416 + cacl2N * 0.36;
  const caex = Math.max(0, caN / 1000 - 7);
  // NB : seuil Mg de 3 g/kg ici contre 3,5 plus haut, comme dans l'original.
  const mgex = Math.max(0, mgN / 1000 - 3);
  const pm = 10 + (caex / 2 + mgex * 0.9) / 3;
  let npkN = pm / fracp;
  const kN = appoint * keau + naclN * ksel + npkN * frack * 1000 + edmN * 390;
  const sN = appoint * seau + naclN * ssel + npkN * fracs * 1000 + edmN * 900;
  const kmN = 16 - kN / 1000;
  const smN = 11 - sN / 1000;
  const npkkN = kmN > 0 ? kmN / frack : 0;
  const npksN = smN > 0 ? smN / fracs : 0;
  npkN += npkkN >= npksN ? npkkN : npksN;
  const uree = Math.max(0, 300 - (npkN * fracn) / 0.46);

  const nourriture = [
    ["Urée", uree, "g/kg"],
    ["NPK", npkN, "g/kg"],
  ];
  if (edmN !== 0) nourriture.push(["Eau de mer", edmN, "l/kg"]);
  if (cacl2N !== 0) nourriture.push(["Chlorure de calcium", cacl2N, "g/kg"]);
  if (naclN !== 0) nourriture.push(["Chlorure de sodium", naclN, "g/kg"]);
  nourriture.push(["Ferfol", 4, "g/kg"]);

  return { avertissements: [], milieu, nourriture };
}

export default {
  id: "medfeed7",
  titre: "NPK + eau de mer + CaCl2",
  description: "Cas NPK + eau de mer (comme apport de Mg) + chlorure de calcium.",
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
    { titre: "NPK (%)", colonnes: 4, aide: "S dans NPK = N-NH4 en général.", champs: [
      { id: "nnpk", label: "N", defaut: "15" },
      { id: "pnpk", label: "P2O5", defaut: "15" },
      { id: "knpk", label: "K2O", defaut: "15" },
      { id: "snpk", label: "S", defaut: "12" },
      { id: "nnh4", label: "N-NH4", defaut: "12" },
    ] },
    { titre: "Culture", colonnes: 2, champs: [
      { id: "b", label: "Alcalinité (mol/l)", defaut: "0,10" },
      { id: "ph", label: "pH initial", defaut: "9,6" },
      { id: "appoint", label: "Eau évaporée (l/kg de spiruline)", defaut: "500" },
    ] },
  ],
  listes: [
    { id: "agentPh", label: "Agent d'ajustement du pH", options: AGENTS_PH },
  ],
  calculer,
};
