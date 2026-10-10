// Formules reprises à l'identique des programmes d'origine (VB.NET, 2010-2011),
// décompilés depuis DeltapH.exe et MEDFEED1.exe.

// Rapport molaire C = CO2/NaOH en fonction du pH (table linéaire par morceaux d'origine).
export function cDepuisPh(ph) {
  if (ph < 8.2) return 1 + 0.083 * (8.2 - ph);
  if (ph <= 8.5) return 1 - 0.03333 * (ph - 8.2);
  if (ph <= 8.8) return 0.99 - 0.05 * (ph - 8.5);
  if (ph <= 9.2) return 0.975 - 0.1875 * (ph - 8.8);
  if (ph <= 9.8) return 0.9 - 0.2333 * (ph - 9.2);
  if (ph <= 10.4) return 0.76 - 0.2666 * (ph - 9.8);
  if (ph <= 10.6) return 0.6 - 0.2 * (ph - 10.4);
  if (ph <= 10.8) return 0.56 - 0.15 * (ph - 10.6);
  if (ph <= 11) return 0.53 - 0.1 * (ph - 10.8);
  if (ph <= 11.2) return 0.51 - 0.05 * (ph - 11);
  return 0.5 - 0.025 * (ph - 11.2);
}

export const PRODUITS_BAISSE = [
  "Bicarbonate de soude",
  "CO2",
  "Acide chlorhydrique (en 100 %)",
  "Acide sulfurique (en 100 %)",
];
export const PRODUITS_HAUSSE = ["Carbonate de sodium", "Soude (en 100 %)"];

// DeltapH : ajout de produit pour passer de phInitial à phFinal.
export function deltaPh({ concInitiale, phInitial, phFinal, produitBaisse, produitHausse }) {
  const ci = cDepuisPh(phInitial);
  const cf = cDepuisPh(phFinal);
  const fracCarb = 106 / (106 + (84 * (2 * ci - 1)) / (1 - ci));
  const bi = concInitiale * ((fracCarb / 106) * 2 + (1 - fracCarb) / 84);
  let ajout, bf, produit;

  if (phFinal < phInitial) {
    produit = PRODUITS_BAISSE[produitBaisse];
    switch (produitBaisse) {
      case 1: // CO2
        ajout = 44 * bi * (cf - ci);
        bf = bi;
        break;
      case 2: // HCl
        ajout = 36.5 * bi * (1 - ci / cf);
        bf = (bi * ci) / cf;
        break;
      case 3: // H2SO4
        ajout = 49 * bi * (1 - ci / cf);
        bf = (bi * ci) / cf;
        break;
      default: // bicarbonate
        ajout = (84 * bi * (cf - ci)) / (1 - cf);
        bf = (bi * (1 - ci)) / (1 - cf);
    }
  } else {
    produit = PRODUITS_HAUSSE[produitHausse];
    if (produitHausse === 1) {
      ajout = 40 * bi * (ci / cf - 1);
      bf = (bi * ci) / cf;
    } else {
      ajout = (53 * bi * (ci - cf)) / (2 * cf - 1);
      bf = (bi * (2 * ci - 1)) / (2 * cf - 1);
    }
  }
  return { alcaliniteInitiale: bi, ajout, alcaliniteFinale: bf, produit };
}

// pHexC : inverse de cDepuisPh (fonction continue et strictement décroissante), par dichotomie.
// Renvoie null si C est hors de la plage couverte (pH 6 à 13).
export function phDepuisC(c) {
  let bas = 6, haut = 13;
  if (!(c <= cDepuisPh(bas) && c >= cDepuisPh(haut))) return null;
  for (let i = 0; i < 60; i++) {
    const milieu = (bas + haut) / 2;
    if (cDepuisPh(milieu) > c) bas = milieu;
    else haut = milieu;
  }
  return (bas + haut) / 2;
}
