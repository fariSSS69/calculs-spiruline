// MEDFEED5 : cas NPK + MgSO4 + CaCl2. Formules reprises de MEDFEED5.exe (Medfeed_NPK_MgSO4).
import { cDepuisPh } from "../calculs.js";

const AGENTS_PH = ["Carbonate de soude", "Soude (en 100 %)"];

function calculer(d) {
  const { caeau, mgeau, keau, seau, casel, mgsel, ksel, ssel, nnpk, pnpk, knpk, snpk, appoint, b, ph, agentPh } = d;
  let nnh4 = d.nnh4;
  if (nnh4 === 0) nnh4 = 0.01;

  const fracn = nnpk / 100;
  const fracp = (pnpk * 0.437) / 100;
  const frack = (knpk * 0.83) / 100;
  const fracs = snpk / 100;

  let nacl = 12 - 40 * b;
  if (nacl < 4) nacl = 4;

  // NB : l'original calcule ici un premier p à partir de ca et mg non encore définis ; valeur jamais utilisée.
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

  // Milieu (mg/l)
  let mg = mgeau + mgsel * nacl;
  let ca = caeau + casel * nacl;
  let k = keau + ksel * nacl;
  let s = seau + ssel * nacl;
  let mgm = 20 - mg;
  let cam = 40 - ca;
  let mgso4 = mgm >= 0 ? mgm / 0.096 : 0;
  let cacl2 = cam >= 0 ? cam / 0.36 : 0;
  if (mgm >= 0) mg = 20;
  if (cam >= 0) ca = 40;
  const p = (ca / 2 + 0.9 * mg) / 3 + 10;
  let npk = p / fracp;
  k = k + npk * frack;
  let km = 100 - k;
  if (km > 0) npk += km / frack;
  s = s + npk * fracs + mgso4 * 0.127;
  let sm = 50 - s;
  if (sm > 0) npk += sm / fracs;
  const nh4 = (npk * nnh4 * 18) / 14 / 100;
  let desamo = (1 - 20 / nh4) * 100;
  if (desamo < 0) desamo = 0;

  const milieu = [["Bicarbonate de sodium", bicar, "g/l"]];
  if (agentPh === 0 && car > 0) milieu.push(["Carbonate de sodium", car, "g/l"]);
  if (agentPh === 1 && naoh > 0) milieu.push(["Soude (en 100 %)", naoh, "g/l"]);
  milieu.push(["Chlorure de sodium", nacl, "g/l"]);
  milieu.push(["NPK", npk / 1000, "g/l"]);
  milieu.push(["NPK à désammonier avant utilisation", desamo, "%"]);
  if (nh4 < 20) milieu.push(["Urée", ((20 - nh4) * 14) / 18 / 460, "g/l"]);
  if (cacl2 !== 0) milieu.push(["Chlorure de calcium", cacl2 / 1000, "g/l"]);
  if (mgso4 !== 0) milieu.push(["Sulfate de magnésium", mgso4 / 1000, "g/l"]);
  milieu.push(["Ferfol", 8, "mg/l"]);

  // Nourriture (g/kg de spiruline)
  nacl = 7;
  mgso4 = 0;
  cacl2 = 0;
  npk = 0;
  let uree = 0;
  mg = appoint * mgeau + nacl * mgsel;
  ca = appoint * caeau + nacl * casel;
  k = appoint * keau + nacl * ksel + npk * frack * 1000;
  s = appoint * seau + nacl * ssel + npk * fracs * 1000;
  mgm = 3.5 - mg / 1000;
  cam = 7 - ca / 1000;
  km = 16 - k / 1000;
  sm = 11 - s / 1000; // NB : valeur recalculée plus bas avant usage, comme dans l'original.
  mgso4 = mgm > 0 ? mgm / 0.096 : 0;
  cacl2 = cam > 0 ? cam / 0.36 : 0;
  if (km > 0) npk += km / frack / 1000;
  mg = appoint * mgeau + nacl * mgsel + mgso4 * 96;
  ca = appoint * caeau + nacl * casel + cacl2 * 360;
  k = appoint * keau + nacl * ksel + npk * frack * 1000;
  s = appoint * seau + nacl * ssel + npk * fracs * 1000 + mgso4 * 127;
  sm = 11 - s / 1000;
  // NB : les compléments K et S ajoutent km/frack/1000 et sm/fracs/1000 (en kg) alors que npk est
  // affiché en g et que le complément P (pm/fracp) est en g : apports K/S 1000 fois trop faibles.
  // Sans effet en pratique quand le besoin en P domine ; reproduit tel quel.
  if (sm > 0) npk += sm / fracs / 1000;
  const caex = ca / 1000 - 7;
  // NB : seuil Mg de 3 g ici contre 3,5 g plus haut, comme dans l'original.
  const mgex = mg / 1000 - 3;
  const pm = 10 + (caex / 2 + mgex * 0.9) / 3 - npk * fracp;
  if (pm > 0) npk += pm / fracp;
  uree = 300 - (npk * fracn) / 0.46;
  if (uree < 0) uree = 0;

  const nourriture = [
    ["Urée", uree, "g/kg"],
    ["NPK", npk, "g/kg"],
  ];
  if (mgso4 !== 0) nourriture.push(["Sulfate de magnésium", mgso4, "g/kg"]);
  if (cacl2 !== 0) nourriture.push(["Chlorure de calcium", cacl2, "g/kg"]);
  nourriture.push(["Chlorure de sodium", nacl, "g/kg"]);
  nourriture.push(["Ferfol", 4, "g/kg"]);

  return { avertissements: [], milieu, nourriture };
}

export default {
  id: "medfeed5",
  titre: "NPK + MgSO4 + CaCl2",
  description: "Engrais NPK complété par sulfate de magnésium et chlorure de calcium.",
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
    { titre: "Engrais NPK (%)", colonnes: 4, champs: [
      { id: "nnpk", label: "N", defaut: "15" },
      { id: "pnpk", label: "P2O5", defaut: "15" },
      { id: "knpk", label: "K2O", defaut: "15" },
      { id: "snpk", label: "S", defaut: "12", aide: "S dans le NPK = N-NH4 en général." },
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
