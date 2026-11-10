// 0.6.2 : compteurs par mode et par niveau (commun/profil.js : cumulAjoute, mdCompte, resumeModes, compteursMode).
// Cas Bellock : 78 parties (entraînement à trois niveaux, amicales anciennes, quelques classées), cumul 0.6 sans md,
// historique des 50 dernières ; reconstruction exacte de n, v, d par mode et par niveau. Puis compte neuf.
// Usage : node tests/test_compteurs.js [ancien_profil.js]
const fs = require('fs'), path = require('path'), vm = require('vm');
let ok = 0, ko = 0;
const eq = (a, b, m) => { const A = JSON.stringify(a), B = JSON.stringify(b); if (A === B) ok++; else { ko++; console.log('ÉCHEC', m, A, '!=', B); } };
function charge(fichier) {
  const stub = new Proxy({}, { get: () => stub, set: () => true, apply: () => stub });
  const ctx = { window: { GolemsDonnees: { interface: { elements: { ordre: ['magma', 'cristal', 'foudre', 'brume', 'roche'] } } } },
    M: { CARTES: { '001': { id: '001', nom: 'Spom' }, '002': { id: '002', nom: 'Cyd' } } }, deckDefautTxt: () => '', vPartie: () => '0.6',
    patchSite: v => v, versStats: l => l.map(x => x.v), $: () => ({ onchange: null, setAttribute() {}, classList: { add() {} } }), console };
  vm.createContext(ctx); vm.runInContext(fs.readFileSync(fichier, 'utf8') + '\n;this.API={cumulAjoute,resumeModes,pfModeDe,pfStats,compteursMode:typeof compteursMode===\'function\'?compteursMode:null};', ctx);
  return ctx.API;
}
const N = charge(path.join(__dirname, '..', 'commun', 'profil.js'));
const ancien = process.argv[2] ? charge(process.argv[2]) : N;

// 78 parties : 2 amicales anciennes (dont un nul de 0.2), 60 entraînements (facile, normal, difficile), 4 amicales récentes,
// 6 classées (3 contre le robot normal, 3 contre des joueurs), 6 entraînements récents.
function partie(i, adv, res, extra) { return { id: (1000 + i) + '-' + (1700000000000 + i * 1000), date: 1700000000000 + i * 1000, adv, res, moteur: '0.6', deck: { nom: 'Deck ' + (i % 3), els: ['magma', 'brume'], cartes: '0012' + (i % 2 ? '0021' : '') }, mvp: 'Spom', ...(extra || {}) }; }
const L = []; let i = 0;
L.push(partie(i++, 'Trigas', 'Victoire', { moteur: '0.2' })); L.push(partie(i++, 'Spom', 'Match nul', { moteur: '0.2' }));
const niv = ['facile', 'normal', 'difficile'];
for (let k = 0; k < 60; k++) L.push(partie(i++, 'Golem (' + niv[k % 3] + ')', (k % 3 === 0 || k % 4 === 0) ? 'Victoire' : 'Défaite'));
for (let k = 0; k < 4; k++) L.push(partie(i++, 'Spom', k ? 'Défaite' : 'Victoire'));
for (let k = 0; k < 6; k++) L.push(partie(i++, k < 3 ? 'Golem (normal)' : 'Trigas', k % 2 ? 'Défaite' : 'Victoire', { mode: 'classee', classe: { niveau: k < 3 ? 'normal' : undefined } }));
for (let k = 0; k < 6; k++) L.push(partie(i++, 'Golem (' + niv[k % 3] + ')', k % 2 ? 'Victoire' : 'Défaite'));
eq(L.length, 78, '78 parties');
// Vérité : chaque partie dans son mode et son niveau.
const vrai = {};
L.forEach(x => { const m = x.mode === 'classee' ? 'classee' : /^Golem/.test(x.adv) ? 'entrainement' : 'amicale';
  const ks = [m]; if (m === 'entrainement') ks.push(/\((\w+)\)/.exec(x.adv)[1]);
  ks.forEach(k => { const o = vrai[k] = vrai[k] || { n: 0, v: 0, d: 0 }; o.n++; if (x.res === 'Victoire') o.v++; if (x.res === 'Défaite') o.d++; }); });
// Cumul tenu par le site 0.6 (ancien code) partie par partie, historique des 50 dernières.
let c = null; L.forEach(x => { c = ancien.cumulAjoute(c, [x]) || c; });
if (ancien !== N) eq(c.md, undefined, 'cumul 0.6 sans md'); else delete c.md;
const histo = L.slice(-50).reverse();
const cl = { v: L.filter(x => x.mode === 'classee' && x.res === 'Victoire').length, d: L.filter(x => x.mode === 'classee' && x.res === 'Défaite').length };
const c2 = N.cumulAjoute(c, histo, { cl });
const pm = N.resumeModes(c2.md);
['classee', 'amicale', 'entrainement'].forEach(m => { const x = N.compteursMode(pm, m); eq({ n: x.n, v: x.v, d: x.d }, vrai[m], 'mode ' + m); });
niv.forEach(k => { const x = N.compteursMode(pm, 'entrainement', k); eq({ n: x.n, v: x.v, d: x.d }, vrai[k], 'niveau ' + k); });
eq(N.compteursMode(pm, 'amicale').dk, [], 'amicales récentes : moins de 5 parties par deck');
// 0.6.3 : tops amorcés depuis l'historique, chaque partie dans son mode et son niveau (mêmes tops que pfStats sur l'historique).
// MVP : affichés dès 5 parties du mode (compteur complet) ; comparés quand l'historique en contient aussi 5.
const tops = (x, sansMv) => JSON.stringify([x.dk.map(y => [y.nom, y.n, y.v]), x.cb.map(y => [y.c, y.n, y.v]), sansMv ? [] : x.mv.map(y => [y.c, y.n]), x.els]);
const cmp1 = (a, b, m) => eq(tops(a, b.n < 5), tops(b, b.n < 5), m);
const cmpH = (P, H, m) => { ['classee', 'amicale', 'entrainement'].forEach(k => cmp1(N.compteursMode(P, k), N.pfStats(H, k, '', 0), m + ' tops ' + k));
  niv.forEach(k => cmp1(N.compteursMode(P, 'entrainement', k), N.pfStats(H, 'entrainement', k, 0), m + ' tops ' + k)); };
cmpH(pm, histo, 'amorce');
eq(N.compteursMode(pm, 'entrainement').dk.length > 0, true, 'tops entraînement remplis');
eq(c2.md.am, 1, 'amorce notée');
// Rien de nouveau : pas de réécriture ; une nouvelle amicale : comptée une fois, détail réparti.
eq(N.cumulAjoute(c2, histo, { cl }), null, 'stable');
const nv = partie(200, 'Spom', 'Défaite');
const c3 = N.cumulAjoute(c2, [nv].concat(histo));
const a3 = N.compteursMode(N.resumeModes(c3.md), 'amicale');
eq([a3.n, a3.v, a3.d, a3.der.slice(-1)[0], a3.serie], [vrai.amicale.n + 1, vrai.amicale.v, vrai.amicale.d + 1, 'D', -4], 'nouvelle amicale');
// Site 0.6 qui ajoute une partie (md en retard) : n, v, d recalculés depuis les totaux.
const nv2 = partie(201, 'Golem (difficile)', 'Victoire');
const c4 = ancien.cumulAjoute(c3, [nv2]) || c3;
const c5 = N.cumulAjoute(c4, [nv2, nv].concat(histo), { cl }) || c4;
const d5 = N.compteursMode(N.resumeModes(c5.md), 'entrainement', 'difficile');
eq([d5.n, d5.v], [vrai.difficile.n + 1, vrai.difficile.v + 1], 'rattrapage après le site 0.6');
// Compte neuf : tout vient du détail des parties.
const neuf = [partie(300, 'Golem (facile)', 'Victoire'), partie(301, 'Golem (facile)', 'Victoire'), partie(302, 'Spom', 'Défaite')];
let cn = null; neuf.forEach(x => { cn = N.cumulAjoute(cn, [x]) || cn; });
const pn = N.resumeModes(cn.md);
eq([N.compteursMode(pn, 'entrainement', 'facile').n, N.compteursMode(pn, 'entrainement', 'facile').v, N.compteursMode(pn, 'amicale').d, N.compteursMode(pn, 'classee').n], [2, 2, 1, 0], 'compte neuf');
eq(N.pfModeDe({ adv: 'Golem (normal)', mode: 'classee' }), 'classee', 'classée contre le robot');
// 0.6.3 : compte déjà passé en 0.6.2 (tops vides, am absent), puis 7 parties jouées après : amorce sans doubler ces 7 parties.
{ const c0 = JSON.parse(JSON.stringify(c2)); delete c0.md.am; ['classee', 'amicale', 'entrainement', 'facile', 'normal', 'difficile'].forEach(k => { Object.assign(c0.md[k], { el: {}, dk: [], c: [], mv: [] }); });
  const apres = []; for (let k = 0; k < 7; k++) apres.push(partie(400 + k, k % 2 ? 'Spom' : 'Golem (' + niv[k % 3] + ')', k % 3 ? 'Victoire' : 'Défaite'));
  // Parties ajoutées comme par le site 0.6.2 (pas d'amorce), puis passage en 0.6.3.
  let cc = c0, H = histo.slice(); cc.md.am = 1; apres.forEach(x => { H = [x].concat(H).slice(0, 50); const r = N.cumulAjoute(cc, H); if (r) cc = r; });
  eq(N.compteursMode(N.resumeModes(cc.md), 'entrainement').dk.reduce((s, y) => s + y.n, 0) < 10, true, 'avant : tops quasi vides');
  delete cc.md.am; cc = N.cumulAjoute(cc, H);
  eq(cc.md.am, 1, 'amorce après des parties 0.6.2');
  cmpH(N.resumeModes(cc.md), H, 'sans doublon');
  eq(N.cumulAjoute(cc, H), null, 'amorce stable'); }
// 0.6.3 : toutes les parties dans un seul mode (80 amicales, historique de 50) : tops tirés des totaux du cumul (80 parties).
{ const A = []; for (let k = 0; k < 80; k++) A.push(partie(500 + k, 'Spom', k % 3 ? 'Victoire' : 'Défaite'));
  let ca = null; A.forEach(x => { ca = ancien.cumulAjoute(ca, [x]) || ca; }); delete ca.md;
  const r = N.cumulAjoute(ca, A.slice(-50).reverse()), a = N.compteursMode(N.resumeModes(r.md), 'amicale');
  eq(a.dk.reduce((s, y) => s + y.n, 0), 80, 'totaux du cumul : 80 parties'); eq(tops(a), tops(N.pfStats(A, 'amicale', '', 0)), 'totaux = toutes les parties'); }
console.log(ko ? ko + ' échec(s), ' + ok + ' réussi(s)' : 'test_compteurs : ' + ok + ' réussis, 0 échec');
process.exit(ko ? 1 : 0);
