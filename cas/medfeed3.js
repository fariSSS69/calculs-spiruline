// MEDFEED3 : eau de mer + acide phosphorique. Formules reprises de MEDFEED EDM + Acide Phosphorique.exe.
import { cDepuisPh } from "../calculs.js";

const AGENTS_PH = ["Carbonate de soude", "Soude (en 100 %)"];

function calculer(d) {
  const { caeau, mgeau, keau, seau, casel, mgsel, ksel, ssel, appoint, b, ph, agentPh } = d;

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
  let salfix = 12 - 40 * b;
  if (salfix < 4) salfix = 4;
  let nacl = salfix;
  let mg = mgeau + mgsel * nacl;
  let ca = caeau + casel * nacl;
  let mgm = 20 - mg;
  let cam = 40 - ca;
  let edmmg = mgm >= 0 ? mgm / 1.295 : 0;
  let edmca = cam >= 0 ? cam / 0.416 : 0;
  let edm = edmmg > edmca ? edmmg : edmca; // ml d'eau de mer par litre

  nacl = salfix - (edm * 25) / 1000;
  mg = mgeau * (1 - edm / 1000) + mgsel * nacl + edm * 1.295;
  ca = caeau * (1 - edm / 1000) + casel * nacl + edm * 0.416;
  const p = (ca / 2 + 0.9 * mg) / 3 + 10;
  let h3po4 = ((p / 31) * 98) / 1000;
  // NB : « ersatz » n'est jamais affecté dans l'original (Nothing = 0), donc la neutralisation
  // de l'acide phosphorique par du bicarbonate est toujours ajoutée.
  const bicarNeutr = ((p / 31) * 2 * 84) / 1000;
  bicar += bicarNeutr;

  let k = keau * (1 - edm / 1000) + ksel * nacl + edm * 0.39;
  let km = 100 - k;
  let k2so4 = km > 0 ? km / 448 : 0;
  let s = seau * (1 - edm / 1000) + ssel * nacl + k2so4 * 184 + edm * 0.9;
  let sm = 50 - s;
  if (sm > 0) k2so4 += sm / 184;

  const uree = 7 / 207;

  const milieu = [["Bicarbonate de sodium", bicar, "g/l"]];
  if (agentPh === 0 && car > 0) milieu.push(["Carbonate de sodium", car, "g/l"]);
  if (agentPh !== 0 && naoh > 0) milieu.push(["Soude (en 100 %)", naoh, "g/l"]);
  milieu.push(["Eau de mer", edm, "ml/l"]);
  milieu.push(["Chlorure de sodium", nacl, "g/l"]);
  milieu.push(["Acide phosphorique (en 100 %)", h3po4, "g/l"]);
  if (k2so4 > 0) milieu.push(["Sulfate dipotassique", k2so4, "g/l"]);
  milieu.push(["Urée", uree * 1000, "mg/l"]);
  milieu.push(["Ferfol", 8, "mg/l"]);

  // Nourriture
  // NB : l'original réutilise ici « nacl » du milieu (g/l) comme quantité de sel par kg,
  // alors que la ligne « Sel » affichée vaut 7 - 25 × eau de mer.
  mg = appoint * mgeau + nacl * mgsel;
  ca = appoint * caeau + nacl * casel;
  mgm = 3.5 - mg / 1000;
  cam = 7 - ca / 1000;
  edmmg = mgm > 0 ? mgm / 1.295 : 0;
  edmca = cam > 0 ? cam / 0.416 : 0;
  edm = edmmg >= edmca ? edmmg : edmca; // litres d'eau de mer par kg

  mg = appoint * mgeau + nacl * mgsel + edm * 1295;
  ca = appoint * caeau + nacl * casel + edm * 416;
  const caex = ca / 1000 - 7;
  // NB : seuil Mg de 3 ici contre 3,5 plus haut, et caex/mgex ne sont pas bornés à 0 (comme dans l'original).
  const mgex = mg / 1000 - 3;
  const pm = 10 + (caex / 2 + mgex * 0.9) / 3;
  h3po4 = pm / 0.316;
  k = appoint * keau + nacl * ksel + edm * 390;
  km = 16 - k / 1000;
  k2so4 = km > 0 ? km / 0.448 : 0;
  s = appoint * seau + nacl * ssel + edm * 900 + k2so4 * 184;
  sm = 11 - s / 1000;
  if (sm > 0) k2so4 += sm / 0.184;

  const nourriture = [
    ["Urée", 300, "g/kg"],
    ["Acide phosphorique (en 100 %)", h3po4, "g/kg"],
  ];
  if (k2so4 > 0) nourriture.push(["Sulfate dipotassique", k2so4, "g/kg"]);
  if (edm !== 0) nourriture.push(["Eau de mer", edm, "l/kg"]);
  if (7 - edm * 25 > 0) nourriture.push(["Sel", 7 - edm * 25, "g/kg"]);
  nourriture.push(["Ferfol", 4, "g/kg"]);

  return { avertissements: [], milieu, nourriture };
}

export default {
  id: "medfeed3",
  titre: "Eau de mer + acide phosphorique",
  description: "Milieu et nourriture avec eau de mer (apport Ca/Mg) et acide phosphorique comme source de phosphore.",
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
  ],
  calculer,
};
