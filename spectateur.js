// Mode spectateur (0.3) : logique seule. L'affichage est dans spectateur-ui.js (window.SPEC_UI).
// Modèle : salons/{code}/siege = uid de l'adversaire (pris par transaction) ;
//          salons/{code}/spectateurs/{uid} = { p: pseudo, t: heure serveur }.
// j1 = le créateur (entrée de joueurs qui n'est pas le siège) ; un spectateur n'écrit jamais dans joueurs ni coups.
// Même version du SDK que salon-firebase.js : même application, même base (émulateur compris).
import { getApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import { getDatabase, ref, onValue, get, set, remove, push, onDisconnect, serverTimestamp, runTransaction } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-database.js";

const P = location.pathname.split("/")[1] === "essai" ? "essai/" : "";
let db = null, auth = null;
let code = "", moi = "spec", actif = false, stops = [];
let joueurs = {}, coups = {}, siege = null, engages = null, specs = {};
const profils = {}; // uid -> { pseudo, avatar } (lus une fois)
const ecoutes = [], ecoutesChat = [];
let chat = [];

function base() { return P + "salons/" + code; }
function uid() { return auth && auth.currentUser ? auth.currentUser.uid : ""; }
async function pret() {
  if (db) return;
  try { await window.golemsSalon; } catch (e) {}
  const app = getApp(); db = getDatabase(app); auth = getAuth(app);
}
function profil(u) {
  if (profils[u]) return profils[u];
  const o = profils[u] = { pseudo: "", avatar: "" };
  Promise.all(["pseudo", "avatarImg", "avatarId"].map(k => get(ref(db, P + "joueurs/" + u + "/" + k)).then(s => s.val(), () => null)))
    .then(([p, img, id]) => { o.pseudo = p || ""; o.avatar = img || id || ""; notifie(); });
  return o;
}
let attente = 0;
function notifie() {
  if (attente) return;
  attente = requestAnimationFrame(() => {
    attente = 0;
    const e = etatSalon();
    ecoutes.forEach(f => { try { f(e); } catch (x) { console.warn(x); } });
    if (window.SPEC_UI) {
      try { if (window.SPEC_UI.peindreSalon) window.SPEC_UI.peindreSalon(e); } catch (x) { console.warn(x); }
      if (moi === "spec") { const p = etatPartie(); if (p && window.SPEC_UI.peindrePartieSpectateur) try { window.SPEC_UI.peindrePartieSpectateur(p); } catch (x) { console.warn(x); } }
    }
  });
}

// Joueurs présents (sans les départs volontaires), du plus ancien au plus récent.
function presents() {
  return Object.keys(joueurs).map(u => ({ uid: u, ...(joueurs[u] || {}) })).filter(x => !x.quitte)
    .sort((a, b) => ((+a.arrivee || Infinity) - (+b.arrivee || Infinity)) || (a.uid < b.uid ? -1 : 1));
}
function places() {
  const l = presents();
  let adv = siege ? l.find(x => x.uid === siege) || null : null;
  const j1 = l.find(x => x.uid !== siege) || null;
  if (!adv && !siege) adv = l.find(x => x !== j1) || null; // ancien client sans siège
  return { j1, adv };
}
function fiche(x) {
  if (!x) return null;
  const pr = profil(x.uid);
  return { uid: x.uid, pseudo: x.pseudo || pr.pseudo, avatar: pr.avatar, pret: !!x.pret, deck: x.deck || "", sid: x.sid || "",
    v: x.v || "", enPartie: Number.isInteger(x.jg), moi: x.uid === uid() };
}
function etatSalon() {
  const { j1, adv } = places(), u = uid();
  return {
    code, moi, actif,
    j1: fiche(j1), adv: fiche(adv),
    placeLibre: !siege && !adv && !engages,
    enPartie: !!engages || presents().some(x => Number.isInteger(x.jg)),
    spectateurs: Object.keys(specs).map(k => ({ uid: k, pseudo: (specs[k] && specs[k].p) || profil(k).pseudo, avatar: profil(k).avatar, moi: k === u, t: +(specs[k] && specs[k].t) || 0 }))
      .sort((a, b) => a.t - b.t)
  };
}

// Journal d'un joueur (sid, graine) tiré des coups du salon, repli sur sa présence.
function journal(x, g) {
  const l = [];
  for (const k in coups) { const c = coups[k]; if (c && c.s === x.sid && c.g === g && Number.isInteger(c.n)) l[c.n] = c.c; }
  const s = []; for (let i = 0; i < l.length && l[i] !== undefined; i++) s.push(l[i]);
  if (!s.length && typeof x.j === "string") try { return window.GolemsMoteur.litJournal(x.j); } catch (e) {}
  return s;
}
// État complet de la partie en cours, rejoué depuis la graine : spectateur arrivé en cours de partie compris.
let cache = { cle: "", val: null };
function etatPartie() {
  const M = window.GolemsMoteur; if (!M) return null;
  const l = presents().filter(x => Number.isInteger(x.jg) && typeof x.sid === "string");
  let a = null, b = null;
  for (const x of l) { const y = l.find(z => z !== x && z.jg === x.jg && x.graine === x.jg); if (y) { a = x; b = y; break; } }
  if (!a) return null;
  const g = a.jg, j = [journal(a, g), journal(b, g)], decks = [a.deck || "", b.deck || ""];
  const cle = g + "|" + j[0].join(",") + "|" + j[1].join(",") + "|" + decks.join("/");
  if (cache.cle !== cle) {
    let r; try { r = M.rejoue(g, j, decks); } catch (e) { r = { etat: null, erreur: String(e) }; }
    cache = { cle, val: { graine: g, decks, journaux: j, etat: r.etat, erreur: r.erreur || null } };
  }
  return { ...cache.val, joueurs: [fiche(a), fiche(b)], fin: !!(cache.val.etat && cache.val.etat.fin) };
}

function ecoute() {
  stops.forEach(f => f()); stops = [];
  const on = (k, f) => stops.push(onValue(ref(db, base() + "/" + k), s => { f(s.val()); notifie(); }, () => {}));
  on("joueurs", v => { joueurs = v || {}; });
  on("coups", v => { coups = v || {}; });
  on("siege", v => { siege = typeof v === "string" ? v : null; });
  on("engages", v => { engages = v || null; });
  on("spectateurs", v => { specs = v || {}; });
  on("chat", v => { v = v || {}; chat = Object.keys(v).sort().map(k => ({ id: k, ...v[k] })).filter(x => typeof x.m === "string"); ecoutesChat.forEach(f => f(chat)); });
}
async function pseudoDe(u) { const s = await get(ref(db, P + "joueurs/" + u + "/pseudo")); return s.val(); }
async function inscrisSpec() {
  const u = uid(), r = ref(db, base() + "/spectateurs/" + u);
  await onDisconnect(r).remove();
  await set(r, { p: await pseudoDe(u), t: serverTimestamp() });
}
async function retireSpec() { const r = ref(db, base() + "/spectateurs/" + uid()); try { await onDisconnect(r).cancel(); await remove(r); } catch (e) {} }
async function prendsSiege() {
  const u = uid();
  const t = await runTransaction(ref(db, base() + "/siege"), cur => (cur === null || cur === u) ? u : undefined, { applyLocally: false });
  if (t.committed && t.snapshot.val() === u) { try { await onDisconnect(ref(db, base() + "/siege")).remove(); } catch (e) {} return true; }
  return false;
}
async function rendsSiege() { const r = ref(db, base() + "/siege"); try { await onDisconnect(r).cancel(); } catch (e) {} try { await remove(r); } catch (e) {} }

const SPEC = {
  // Appelé par entre() d'index.html AVANT room.join. Renvoie 'j1', 'adv' ou 'spec'.
  // 'spec' : ne pas appeler room.join (le salon est regardé, rien n'est écrit dans joueurs).
  async entrer(c, o) {
    // Règles en ligne pas encore à jour (permission refusée) ou base absente : comportement d'avant (join normal).
    try { return await SPEC._entrer(c, o); } catch (e) { console.warn("Spectateur indisponible", e); moi = "adv"; notifie(); return moi; }
  },
  async _entrer(c, o) {
    await pret();
    if (code && code !== c) await SPEC.sortir();
    code = c; actif = true; ecoute();
    const u = uid();
    if (o && o.createur) { moi = "j1"; notifie(); return moi; }
    const [js, eg, sg] = await Promise.all(["joueurs", "engages", "siege"].map(k => get(ref(db, base() + "/" + k))));
    joueurs = js.val() || {}; engages = eg.val() || null; siege = typeof sg.val() === "string" ? sg.val() : null;
    if (engages) { moi = engages[u] ? (siege === u ? "adv" : "j1") : "spec"; if (moi === "spec") await inscrisSpec(); notifie(); return moi; }
    const autres = presents().filter(x => x.uid !== u);
    // Place de j1 libre (salon vide, ou j1 rechargé alors que l'adversaire est resté) : je suis j1.
    if (!autres.some(x => x.uid !== siege)) { if (siege === u) await rendsSiege(); moi = "j1"; }
    else if (await prendsSiege()) { moi = "adv"; await retireSpec(); }
    else { moi = "spec"; await inscrisSpec(); }
    notifie(); return moi;
  },
  // Sortie du salon (bouton Quitter, ou salon perdu).
  async sortir() {
    if (!code) return;
    if (moi === "spec") await retireSpec();
    if (moi === "adv") await rendsSiege();
    stops.forEach(f => f()); stops = [];
    code = ""; actif = false; moi = "spec"; joueurs = {}; coups = {}; siege = null; engages = null; specs = {}; cache = { cle: "", val: null };
    notifie();
  },
  etatSalon, etatPartie,
  // État brut du moteur (même objet que partie.etat chez les joueurs), pour comparer.
  etatMoteur() { const p = etatPartie(); return p ? p.etat : null; },
  estSpectateur: () => actif && moi === "spec",
  role: () => moi,
  onChange(f) { if (typeof f === "function") ecoutes.push(f); },
  // L'adversaire laisse sa place (avant la partie) : quitte joueurs, rend le siège, devient spectateur.
  async passerSpectateur() {
    if (!actif || moi !== "adv" || engages) return false;
    if (window.__golemsSpecQuitte) await window.__golemsSpecQuitte();
    await rendsSiege(); moi = "spec"; await inscrisSpec(); notifie(); return true;
  },
  // Un spectateur prend la place libre (transaction sur le siège). false si prise entre-temps ou partie lancée.
  async devenirAdversaire() {
    if (!actif || moi !== "spec") return false;
    if ((await get(ref(db, base() + "/engages"))).exists()) return false;
    if (!(await prendsSiege())) return false;
    await retireSpec(); moi = "adv";
    try { if (window.__golemsSpecRejoint) await window.__golemsSpecRejoint(code); }
    catch (e) { await rendsSiege(); moi = "spec"; await inscrisSpec(); notifie(); return false; }
    notifie(); return true;
  },
  chat: () => chat,
  onChat(f) { ecoutesChat.push(f); f(chat); },
  // Chat d'un spectateur (les joueurs gardent r.dit de salon-firebase.js).
  async dit(m) {
    m = String(m || "").replace(/\s+/g, " ").trim().slice(0, 200);
    if (!m || !actif) return;
    const u = uid();
    await set(push(ref(db, base() + "/chat")), { a: u, p: await pseudoDe(u), t: serverTimestamp(), m });
  }
};
window.SPEC = SPEC;
