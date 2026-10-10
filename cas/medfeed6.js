// MEDFEED6 : cas NPK + eau de mer (comme apport de Ca et de Mg). Formules reprises de MEDFEED6.exe.
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
  // NB : si P2O5, K2O ou S du NPK vaut 0, les divisions par fracp/frack/fracs donnent l'infini, comme dans l'original.

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
  let mg = mgeau + mgsel * nacl;
  let ca = caeau + casel * nacl;
  let mgm = 20 - mg;
  let cam = 40 - ca;
  let edmmg = mgm >= 0 ? mgm / 1.295 : 0;
  let edmca = cam >= 0 ? cam / 0.416 : 0;
  let edm = edmmg > edmca ? edmmg : edmca;
  let eau = 1 - edm / 1000;
  nacl = nacl - (edm * 25) / 1000;
  if (nacl < 0) nacl = 0;
  mg = mgeau * eau + mgsel * nacl + edm * 1.295;
  ca = caeau * eau + casel * nacl + edm * 0.416;
  mgm = 20 - mg;
  cam = 40 - ca;
  const edmmgplus = mgm >= 0 ? mgm / 1.295 : 0;
  const edmcaplus = cam >= 0 ? cam / 0.416 : 0;
  const edmplus = edmmgplus > edmcaplus ? edmmgplus : edmcaplus;
  edm = edm + edmplus;
  // NB : la dilution ne tient compte que du complément d'eau de mer (edmplus), pas du total, et le NaCl
  // n'est pas réduit pour ce complément, comme dans l'original.
  eau = 1 - edmplus / 1000;
  mg = mgeau * eau + mgsel * nacl + edm * 1.295;
  ca = caeau * eau + casel * nacl + edm * 0.416;
  const p = (ca / 2 + 0.9 * mg) / 3 + 10;
  let npk = p / fracp;
  const k = keau + ksel * nacl + edm * 0.39 + npk * frack;
  const km = 100 - k;
  let npkk = km > 0 ? km / frack : 0;
  const s = seau + ssel * nacl + npk * fracs + edm * 0.9;
  const sm = 50 - s;
  let npks = sm > 0 ? sm / fracs : 0;
  npk = npkk > npks ? npk + npkk : npk + npks;
  // (L'original calcule ici une variable « uree » à partir d'un nh4 pas encore calculé ; elle n'est jamais affichée.)

  const milieu = [["Bicarbonate de sodium", bicar, "g/l"]];
  if (agentPh === 0 && car > 0) milieu.push(["Carbonate de sodium", car, "g/l"]);
  if (agentPh === 1 && naoh > 0) milieu.push(["Soude (en 100 %)", naoh, "g/l"]);
  if (nacl > 0) milieu.push(["Chlorure de sodium", nacl, "g/l"]);
  milieu.push(["NPK", npk / 1000, "g/l"]);
  const nh4 = (npk * nnh4) / 100;
  const desamo = (1 - 20 / nh4) * 100;
  if (desamo > 0) milieu.push(["Part du NPK à désammonier avant utilisation", desamo, "%"]);
  if (nh4 < 20) milieu.push(["Urée", ((20 - nh4) * 14) / 18 / 460, "g/l"]);
  if (edm > 0) milieu.push(["Eau de mer", edm, "ml/l"]);
  milieu.push(["Ferfol", 8, "mg/l"]);

  // Nourriture
  nacl = 7;
  mg = appoint * mgeau + nacl * mgsel;
  ca = appoint * caeau + nacl * casel;
  const mgmN = 3.5 - mg / 1000;
  const camN = 7 - ca / 1000;
  edmmg = mgmN > 0 ? mgmN / 1.295 : 0;
  edmca = camN > 0 ? camN / 0.416 : 0;
  edm = edmmg >= edmca ? edmmg : edmca;
  nacl = nacl - edm * 25;
  if (nacl < 0) nacl = 0;
  mg = appoint * mgeau + nacl * mgsel + edm * 1295;
  ca = appoint * caeau + nacl * casel + edm * 416;
  const caex = Math.max(0, ca / 1000 - 7);
  const mgex = Math.max(0, mg / 1000 - 3.5);
  const pm = 10 + (caex / 2 + mgex * 0.9) / 3;
  npk = pm / fracp;
  const kN = appoint * keau + nacl * ksel + npk * frack * 1000 + edm * 390;
  const sN = appoint * seau + nacl * ssel + npk * fracs * 1000 + edm * 900;
  const kmN = 16 - kN / 1000;
  const smN = 11 - sN / 1000;
  npkk = kmN > 0 ? kmN / frack : 0;
  npks = smN > 0 ? smN / fracs : 0;
  npk = npkk >= npks ? npk + npkk : npk + npks;
  let uree = 300 - (npk * fracn) / 0.46;
  if (uree < 0) uree = 0;

  const nourriture = [
    ["Urée", uree, "g/kg"],
    ["NPK", npk, "g/kg"],
  ];
  if (edm > 0) nourriture.push(["Eau de mer", edm, "l/kg"]);
  if (nacl > 0) nourriture.push(["Chlorure de sodium", nacl, "g/kg"]);
  nourriture.push(["Ferfol", 4, "g/kg"]);

  return { avertissements: [], milieu, nourriture };
}

export default {
  id: "medfeed6",
  titre: "NPK + eau de mer",
  description: "Cas NPK + eau de mer (comme apport de Ca et de Mg).",
  groupes: [
    { titre: "Eau d'appoint (mg/l)", colonnes: 4, champs: [
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
      { id: "appoint", label: "Eau d'appoint (l/kg de spiruline)", defaut: "500" },
    ] },
  ],
  listes: [
    { id: "agentPh", label: "Agent d'ajustement du pH", options: AGENTS_PH },
  ],
  calculer,
};
