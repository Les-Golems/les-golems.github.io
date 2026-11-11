// Salon en ligne sur Firebase Realtime Database, comptes pseudo + code secret.
// Remplace la capacité « room » de l'artifact Claude avec la même interface
// (presence, peers, onPeers, onConnection, connected, join, leave), plus « compte ».
//
// Arborescence :
//   pseudos/{pseudo minuscule}  uid du propriétaire
//   joueurs/{uid}               pseudo, avatarId, cree, importe, decks/0..11 (emplacements fixes), ordreDecks (ordre affiché), historique/{id} {d, x},
//                               cumul (texte JSON : cumuls de toutes les parties, fabriqués par la page)
//   profils/{uid}               résumé public du profil (chiffres de la fenêtre de compte), m = profil privé
//   hall/{uid}                  présence dans l'accueil (pseudo, salon, quitte), comptes seulement
//   salons/{code}/joueurs/{uid} présence dans le salon (pseudo, arrivee, sid, pret, deck,
//                               graine, jg, adv, veut, quitte, v = version du site), effacée par onDisconnect
//   salons/{code}/coups/{uid_sid_g_n}  journal (anciennes parties : push) : un coup par entrée, jamais modifié
//                               { a: uid auteur, s: sid, g: graine, n: rang, c: code du coup }
// Découpé (lot E de l'audit 0.6a) : firebase/compte.js (ouverture, connexion, pseudo, profil, historique),
// firebase/decks.js (decks, écritures sûres sous coupures) et ce fichier (point d'entrée chargé par index.html :
// connexion à la base, accueil, présence, salons, partie en ligne, annonces, rattrapage et reconnexion).
import { goOffline, goOnline, ref, onValue, update, remove, push, set, onDisconnect, serverTimestamp, get, query, orderByChild, orderByValue, endAt, limitToFirst, limitToLast, equalTo, runTransaction } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-database.js";
import { P, clePseudo, compte, estCompte, moi, donnees, db, ouvreCompte, chargeInitiale, brancheSalon } from "./compte.js";
import { ajoute, ecritPlusieurs } from "./decks.js";
export { PREFIXE, nettoiePseudo, erreurPseudo, clePseudo } from "./compte.js";

const CHAMPS_HALL = ["pseudo", "salon", "quitte"];
// v : version du site ("0.2b|<build>" lu dans version.json), comparée dans le salon et les parties publiques.
const CHAMPS_SALON = ["pseudo", "arrivee", "sid", "pret", "deck", "graine", "jg", "adv", "veut", "quitte", "v"];
const VERSION_OK = /^[0-9a-z.|: -]{1,40}$/;

function filtre(p, champs) {
  const o = {};
  for (const k of champs) if (k in p) o[k] = p[k] === undefined ? null : p[k];
  return o;
}

let enLigne = false;
// Salons ouverts dans cette page (annonce légitime) ; les autres annonces de mon uid sont orphelines (nettoyées par annonces()).
const salonsOuverts = new Set(), orphelinesVues = new Set();
const ecouteCo = [];
// Coupures répétées : le SDK espace ses reconnexions (délai x1,3 à chaque connexion de moins de 30 s, jusqu'à plusieurs
// minutes) ; un joueur qui joue paraît alors absent plus de 60 s et perd par abandon. Coupé, on relance la connexion
// toutes les 3 s (goOffline puis goOnline remet le délai au minimum) ; les écritures en attente sont gardées.
let relance = null;
const relanceCo = () => {
  relance = null;
  if (enLigne) return;
  // Toujours coupé : prochain essai dans 3 s. Le minuteur est posé AVANT goOffline/goOnline, pour que l'événement
  // .info/connected qu'ils déclenchent (hors ligne) n'en lance pas un second.
  relance = setTimeout(relanceCo, 3000);
  // Navigateur hors ligne : inutile de relancer la connexion, on revérifie seulement.
  if (typeof navigator !== "undefined" && navigator.onLine === false) return;
  try { goOffline(db); goOnline(db); } catch (e) {}
};
// Écart entre l'horloge locale et celle du serveur (déconnexion : minuteurs comptés en heure serveur).
let decalage = 0;

// Accueil : seulement pour un compte ; arrêté puis relancé à chaque changement de compte.
let hallRef = null, hallStop = null, hallPres = {}, hallPeers = [], hallErreur = false;
const ecouteHall = [], hallPerdu = [];
function pair(u, p) {
  p = p || {};
  const { t, ...presence } = p;
  return { peer: u, kind: "viewer", sameTab: u === moi, presence, updatedAt: +t || 0 };
}
function ecritHall() {
  if (!hallRef || !hallPres.pseudo) return Promise.resolve();
  return update(hallRef, { ...hallPres, t: serverTimestamp() });
}
function demarreHall() {
  hallPeers = []; hallErreur = false;
  if (!estCompte()) { ecouteHall.forEach(f => f()); return; }
  hallRef = ref(db, P + "hall/" + moi);
  hallPres = { pseudo: donnees && donnees.pseudo || undefined };
  if (!hallPres.pseudo) delete hallPres.pseudo;
  onDisconnect(hallRef).remove();
  ecritHall().catch(() => {});
  hallStop = onValue(ref(db, P + "hall"), s => {
    const v = s.val() || {};
    hallPeers = Object.keys(v).map(u => pair(u, v[u]));
    ecouteHall.forEach(f => f());
  }, () => { hallErreur = true; hallPerdu.forEach(f => f()); });
}
async function arreteHall() {
  if (hallStop) { hallStop(); hallStop = null; }
  if (hallRef) { const h = hallRef; hallRef = null; try { await onDisconnect(h).cancel(); await remove(h); } catch (e) {} }
  hallPeers = [];
}
// Après une reconnexion, la présence effacée par onDisconnect est réécrite.

// 0.6 : pastille « N en ligne », invités compris : enligne/<uid> = heure serveur, posée par chaque visiteur pour lui seul,
// effacée à sa déconnexion (rules/60-guides.js). Retirée avant chaque changement de compte (l'ancien uid ne pourra plus l'effacer).
let enligneRef = null, enligneN = 0;
const ecouteEnligne = [];
async function majEnligne() {
  const r = ref(db, P + "enligne/" + moi); enligneRef = r;
  try { await onDisconnect(r).remove(); await set(r, serverTimestamp()); } catch (e) {}
}
async function quitteEnligne() {
  const r = enligneRef; enligneRef = null; if (!r) return;
  try { await onDisconnect(r).cancel(); await remove(r); } catch (e) {}
}
brancheSalon({ demarreHall, arreteHall, majEnligne, quitteEnligne });

async function ouvre() {
  await ouvreCompte();
  onValue(ref(db, ".info/connected"), s => { enLigne = s.val() === true;
    if (enLigne) { clearTimeout(relance); relance = null; } else if (!relance) relance = setTimeout(relanceCo, 1500);
    ecouteCo.forEach(f => f()); });
  // Écart entre l'horloge locale et celle du serveur (déconnexion : minuteurs comptés en heure serveur).
  onValue(ref(db, ".info/serverTimeOffset"), s => { decalage = +s.val() || 0; });

  ecouteCo.push(() => { if (enLigne && hallRef) { onDisconnect(hallRef).remove(); ecritHall().catch(() => {}); } });

  onValue(ref(db, P + "enligne"), s => { enligneN = Object.keys(s.val() || {}).length; ecouteEnligne.forEach(f => { try { f(); } catch (e) {} }); }, () => {});
  ecouteCo.push(() => { if (enLigne && enligneRef) majEnligne(); });
  majEnligne();

  await chargeInitiale();
  demarreHall();

  return {
    connected: () => enLigne,
    // Heure du serveur (ms), pour les minuteurs de déconnexion.
    heure: () => Date.now() + decalage,
    // Partie en ligne retenue par le compte (0.5) : joueurs/{uid}/salon. o = null pour effacer.
    salonCompte: {
      ecrit(o) { if (!estCompte()) return Promise.resolve(); return set(ref(db, P + "joueurs/" + moi + "/salon"), o ? { ...o, t: serverTimestamp() } : null); },
      async lit() { if (!estCompte()) return null; try { return (await get(ref(db, P + "joueurs/" + moi + "/salon"))).val(); } catch (e) { return null; } },
      ecoute(f) { if (!estCompte()) return () => {}; return onValue(ref(db, P + "joueurs/" + moi + "/salon"), s => f(s.val()), () => {}); },
      uid: () => moi
    },
    peers: () => hallPeers,
    // 0.6 : visiteurs en ligne (enligne/, invités compris) et écoute de ce nombre.
    enLigneN: () => enligneN,
    onEnLigne(f) { ecouteEnligne.push(f); },
    // 0.6 : base du service classé (commun/classe.js, GolemsClasse.service) : lecture et écriture multi-chemins sous le préfixe.
    classeBase: () => ({
      uid: () => moi,
      pseudo: () => donnees ? donnees.pseudo : "",
      lit: p => get(ref(db, P + p)).then(s => s.val()),
      // Ajouts seuls (partie, confirmation, partie appliquée, instantané) : transaction (déjà là = fait) ; le reste : multi-chemins.
      ecrit: async m => { const ks = Object.keys(m);
        if (ks.length === 1 && m[ks[0]] !== null && /^classe\/(parties\/[^/]+(\/(ok|fait)\/[^/]+)?|instantanes\/[^/]+\/[^/]+)$/.test(ks[0])) { await ajoute(ref(db, P + ks[0]), m[ks[0]]); return; }
        const o = {}; for (const k in m) o[P + k] = m[k]; return ecritPlusieurs(o); }
    }),
    onPeers(f, g) { ecouteHall.push(f); if (g) { hallPerdu.push(g); if (hallErreur) setTimeout(g, 0); } },
    onConnection(f, g) { ecouteCo.push(f); },
    async presence(p) {
      const q = filtre(p, CHAMPS_HALL);
      if ("pseudo" in q) q.pseudo = donnees && donnees.pseudo || null;
      Object.assign(hallPres, q);
      for (const k in hallPres) if (hallPres[k] === null) delete hallPres[k];
      if (!hallRef || !hallPres.pseudo) return;
      await update(hallRef, { ...q, t: serverTimestamp() });
    },
    compte,
    // Salons publics pas encore lancés : f(liste de { code, u, p, a, d, e, t, v, w, q, n }) à chaque changement
    // (v absent = ancienne version ; w, q = adversaire assis, absent = place libre ; n = spectateurs ;
    //  g = partie en cours, m = manche, k = score "a-b", e et f = éléments principaux des decks place 0 et place 1).
    annonces(f) {
      return onValue(ref(db, P + "annonces"), s => {
        const v = s.val() || {};
        // Annonce orpheline de mon uid (salon quitté sous coupure, page fermée) : retirée si je ne suis plus connecté à ce salon.
        for (const k in v) if (v[k] && v[k].u === moi && !salonsOuverts.has(k) && !orphelinesVues.has(k)) {
          orphelinesVues.add(k);
          get(ref(db, P + "salons/" + k + "/pres/" + moi)).then(p => { const x = p.val(); if (!(x && x.c === true) && !salonsOuverts.has(k)) return remove(ref(db, P + "annonces/" + k)); }).catch(() => { orphelinesVues.delete(k); });
        }
        f(Object.keys(v).map(k => ({ code: k, ...v[k] })).filter(x => typeof x.u === "string").sort((a, b) => (+b.t || 0) - (+a.t || 0)));
      }, () => f([]));
    },
    // Nettoyage : efface les salons sans activité depuis plus de 7 jours (avec coups, chat et annonce).
    // Les règles n'autorisent la lecture de activite que pour cette requête, et l'effacement que d'un salon vieux.
    async nettoie() {
      if (!estCompte()) return 0;
      const SEPT = 7 * 24 * 3600 * 1000;
      let n = 0;
      try {
        const s = await get(query(ref(db, P + "activite"), orderByValue(), endAt(Date.now() - SEPT - 3600 * 1000), limitToFirst(20)));
        const v = s.val() || {};
        for (const c in v) {
          try { await update(ref(db), { [P + "salons/" + c]: null, [P + "activite/" + c]: null }); n++; } catch (e) { console.warn("nettoyage", c, e); }
        }
      } catch (e) { console.warn("nettoyage", e); }
      return n;
    },
    // Archive commune (onglet Statistiques) : resume/{id}, anonyme. Écrite par un compte, une seule fois.
    // En ligne, chaque joueur écrit le sien (clé graine-début) ; l'affichage n'en garde qu'un par graine.
    // Échec d'écriture : l'erreur remonte à la page (message et nouvel essai), jamais avalée ici.
    async ecritResume(id, o) {
      if (!estCompte() || !/^-?[0-9]{1,12}-[0-9]{13}$/.test(id)) return false;
      const r = ref(db, P + "resume/" + id);
      // Transaction (écrit seulement si absent) plutôt que get + set : un set déjà appliqué mais dont la réponse est perdue
      // (coupure juste après l'envoi) est renvoyé par le SDK à la reconnexion, et la règle (ajout seulement) le refusait.
      // La transaction est rejouée sur la valeur du serveur : résumé déjà là = rien à écrire.
      // Coupure pendant la transaction (erreur « disconnect ») : relancée, elle attend la reconnexion puis relit le serveur.
      return (await ajoute(r, { ...o, d: serverTimestamp() })).committed;
    },
    // Les n résumés les plus récents (2000 par défaut), du plus ancien au plus récent, avec leur clé (id = graine-début).
    async litResumes(n) {
      const s = await get(query(ref(db, P + "resume"), orderByChild("d"), limitToLast(n || 2000)));
      const l = []; s.forEach(c => { const v = c.val(); if (v && typeof v === "object") l.push({ ...v, id: c.key }); }); return l;
    },
    // Classement public : liste de { uid, p, v, n }.
    async litClassement() {
      const v = (await get(ref(db, P + "classement"))).val() || {};
      return Object.keys(v).map(u => ({ uid: u, ...v[u] })).filter(x => typeof x.p === "string" && Number.isInteger(x.n));
    },
    // Nouveautés (0.4) : blocs épinglés (nouveautes/epingles, 2 au plus, lus par tous, écrits par le seul compte de Romain).
    // ecoute(f) : f(liste d'ids ou null si le nœud est vide) ; romain() : vrai si ce compte possède le pseudo KaTarN
    // (affichage des épingles seulement ; la règle de la base vérifie son uid).
    epingles: {
      ecoute(f) {
        return onValue(ref(db, P + "nouveautes/epingles"), s => { const v = s.val(); f(v && typeof v === "object" ? Object.keys(v).sort().map(k => v[k]).filter(x => typeof x === "string") : null); }, () => f(null));
      },
      ecrit(l) {
        const o = {}; (l || []).slice(0, 2).forEach((x, i) => { o[i] = String(x); });
        return set(ref(db, P + "nouveautes/epingles"), Object.keys(o).length ? o : { 0: "aucun" });
      },
      async romain() {
        if (!estCompte()) return false;
        try { return (await get(ref(db, P + "pseudos/katarn"))).val() === moi; } catch (e) { return false; }
      }
    },
    // 0.6 : guides (rules/60-guides.js) : guides/<id> = { votes: { uid: 1 | -1 }, fiche: guide publié ou modifié, sup: guide du code retiré }.
    // ecoute(f) : f(votes, fiches, retires) à chaque changement : votes { id: { uid: v } }, fiches { id: fiche }, retires { id: true }.
    // vote(id, v) : v = 1, -1, ou 0 pour retirer. uid() : uid du compte connecté (null en invité). pseudo() : son pseudo.
    guides: {
      ecoute(f) {
        return onValue(ref(db, P + "guides"), s => {
          const v = s.val() || {}, o = {}, F = {}, S = {};
          for (const g in v) {
            const w = v[g] && v[g].votes; if (w && typeof w === "object") { o[g] = {}; for (const u in w) if (w[u] === 1 || w[u] === -1) o[g][u] = w[u]; }
            if (v[g] && v[g].fiche && typeof v[g].fiche === "object") F[g] = v[g].fiche;
            if (v[g] && v[g].sup === true) S[g] = true;
          }
          f(o, F, S);
        }, () => f({}, {}, {}));
      },
      vote(id, v) {
        if (!estCompte()) return Promise.reject(new Error("compte"));
        const r = ref(db, P + "guides/" + id + "/votes/" + moi);
        return v === 1 || v === -1 ? set(r, v) : remove(r);
      },
      uid: () => estCompte() ? moi : null,
      pseudo: () => estCompte() && donnees ? donnees.pseudo : "",
      // Publication sans relecture (10 nov.) : o = { ty: 'v'|'t', ti, yt?, tx?, d1, d2?, v? (version des decks) }.
      // id absent : nouveau guide (clé push) et compteur des 24 h (10 au plus, erreur code "golems/limite") ; rend l'id.
      // id présent : modification (auteur ou Romain) ; auteurCode = pseudo de l'auteur d'un guide du code sans fiche (Romain publie à son nom).
      async publie(o, id, auteurCode) {
        if (!estCompte() || !donnees) throw new Error("compte");
        const x = { ty: o.ty, ti: o.ti, d1: o.d1, m: serverTimestamp() };
        for (const k of ["yt", "tx", "d2", "v"]) if (o[k]) x[k] = o[k];
        if (!id) {
          const c = (await get(ref(db, P + "compteurGuides/" + moi))).val(), maint = Date.now() + decalage;
          const neuf = !c || maint - c.d >= 86400000, n = neuf ? 1 : c.n + 1;
          if (n > 10) throw Object.assign(new Error("limite"), { code: "golems/limite" });
          id = push(ref(db, P + "guides")).key;
          await ecritPlusieurs({ [P + "guides/" + id + "/fiche"]: { ...x, u: moi, p: donnees.pseudo, t: serverTimestamp() },
            [P + "compteurGuides/" + moi]: { d: neuf ? serverTimestamp() : c.d, n, t: serverTimestamp() } });
          return id;
        }
        const a = (await get(ref(db, P + "guides/" + id + "/fiche"))).val();
        let u = a ? a.u : moi;
        if (!a && auteurCode) { const w = (await get(ref(db, P + "pseudos/" + clePseudo(auteurCode)))).val(); if (w) u = w; }
        const p = u === moi ? donnees.pseudo : (await get(ref(db, P + "joueurs/" + u + "/pseudo"))).val();
        await set(ref(db, P + "guides/" + id + "/fiche"), { ...x, u, p, t: a ? a.t : serverTimestamp() });
        return id;
      },
      // Suppression : guide publié = guides/<id> entier (votes compris) ; guide du code = sup (retiré du site).
      supprime(id, duCode) {
        if (!estCompte()) return Promise.reject(new Error("compte"));
        return duCode ? set(ref(db, P + "guides/" + id + "/sup"), true) : remove(ref(db, P + "guides/" + id));
      }
    },
    // Lecture brute (tests locaux) : soumise aux mêmes règles que le reste.
    lit: p => get(ref(db, P + p)).then(s => s.val()),
    join
  };
}

async function join(code) {
  if (!estCompte()) throw Object.assign(new Error("compte"), { code: "compte" });
  if (!/^[a-z0-9]{3,8}$/.test(code)) throw new Error("code");
  const uid = moi;
  const base = P + "salons/" + code;
  const moiRef = ref(db, base + "/joueurs/" + uid);
  let pres = {}, joueurs = {}, coups = {}, fini = false;
  const ecoute = [], perdu = [], stop = [];
  const pousses = {}; // "sid|graine" -> nombre de coups déjà envoyés

  // Partie commencée sans cet uid : salon fermé.
  const eng = (await get(ref(db, base + "/engages"))).val();
  if (eng && !eng[uid]) throw Object.assign(new Error("complet"), { code: "complet" });
  // Coups déjà envoyés par cet uid (reprise après rechargement).
  const deja = await get(query(ref(db, base + "/coups"), orderByChild("a"), equalTo(uid)));
  const v0 = deja.val() || {};
  for (const k in v0) { const c = v0[k], cle = c.s + "|" + c.g; pousses[cle] = Math.max(pousses[cle] || 0, c.n + 1); }

  const notifie = () => { if (!fini) ecoute.forEach(f => f()); };
  const erreur = () => { if (!fini) perdu.forEach(f => f()); };
  stop.push(onValue(ref(db, base + "/joueurs"), s => { joueurs = s.val() || {}; notifie(); }, erreur));
  stop.push(onValue(ref(db, base + "/coups"), s => { coups = s.val() || {}; notifie(); }, erreur));
  // Chat : salons/{code}/chat/{push} = { a: uid, p: pseudo, t: heure serveur, m: texte <= 200 }.
  let chat = [];
  const ecouteChat = [];
  stop.push(onValue(ref(db, base + "/chat"), s => {
    const v = s.val() || {};
    chat = Object.keys(v).sort().map(k => ({ id: k, ...v[k] })).filter(x => typeof x.m === "string");
    if (!fini) ecouteChat.forEach(f => f(chat));
  }, () => {}));

  function journal(sid, g) {
    const l = [];
    for (const k in coups) { const c = coups[k]; if (c.s === sid && c.g === g) l[c.n] = c.c; }
    const sortie = [];
    for (let i = 0; i < l.length && l[i] !== undefined; i++) sortie.push(l[i]);
    return window.GolemsMoteur.ecritJournal(sortie);
  }
  // Coups à jour avant une décision (adversaire parti ou absent). get() sur coups rendrait le cache de
  // l'écoute en cours : on lit à la place un chemin non écouté (engages). Sa réponse passe par la même
  // connexion, après les données que le serveur renvoie aux écoutes (reconnexion) : l'écoute des coups est alors à jour.
  async function relitCoups() {
    await get(ref(db, base + "/engages"));
  }
  // Envois à la file : deux appels rapprochés ne poussent jamais deux fois le même rang.
  let file = Promise.resolve();
  function envoieJournal(j) { const p = file.then(() => envoie(j)); file = p.catch(() => {}); return p; }
  async function envoie(j) {
    const sid = pres.sid, g = pres.jg;
    if (typeof j !== "string" || typeof sid !== "string" || !Number.isInteger(g)) return;
    const liste = window.GolemsMoteur.litJournal(j), cle = sid + "|" + g;
    for (let n = pousses[cle] || 0; n < liste.length; n++) {
      // Clé fixe par coup (joueur, partie, rang) : un renvoi après coupure retombe sur la même clé (ajout seul), jamais un 2e push.
      await ajoute(ref(db, base + "/coups/" + uid + "_" + String(sid).replace(/[.#$\/\[\]]/g, "_") + "_" + g + "_" + n), { a: uid, s: sid, g: g, n: n, c: liste[n] });
      pousses[cle] = n + 1;
    }
  }
  // Dernière activité du salon (activite/{code} = heure serveur), au plus une fois par minute.
  // Sert au nettoyage des salons inactifs depuis plus de 7 jours.
  let touche0 = 0;
  function touche() {
    if (Date.now() - touche0 < 60000) return;
    touche0 = Date.now();
    set(ref(db, P + "activite/" + code), serverTimestamp()).catch(() => { touche0 = 0; });
  }
  // Annonce publique (annonces/{code}) : effacée à la déconnexion du créateur.
  const annRef = ref(db, P + "annonces/" + code); salonsOuverts.add(code);
  let annonceOn = false, presOk = false, annonceO = null, annonceRearme = false, versRobot = false, creeAFaire = false, presConf = false, clOk = false, hoteOk = false, annoncePosee = false; // annoncePosee : une écriture d'annonce est partie (à effacer en sortant, même sans accusé) // annonceO : dernière annonce publiée (réécrite à la reconnexion) ; creeAFaire : heure d'ouverture du salon classé pas encore écrite (réessayée à la reconnexion)
  function ecrit() { return update(moiRef, { ...pres, t: serverTimestamp() }); }
  // Présence de connexion (0.5, déconnexion) : salons/{code}/pres/{uid} = { c: connecté, t: heure serveur du dernier changement }.
  // Le serveur écrit c:false lui-même à la coupure (onDisconnect) ; l'adversaire en tire « reconnexion » puis « hors ligne ».
  const presRef = ref(db, base + "/pres/" + uid);
  let etats = {}, forfaits = {}, presN = 0;
  const ecouteDeco = [];
  const notifieDeco = () => { if (!fini) ecouteDeco.forEach(f => { try { f(); } catch (e) {} }); };
  // Micro-coupure : l'onDisconnect de l'ancienne connexion peut être joué par le serveur APRÈS la réécriture c:true de la
  // reconnexion (ou la réponse de onDisconnect se perdre et bloquer presCo) : ma présence reste c:false alors que je joue,
  // et l'adversaire prononce le forfait au bout de 60 s. Toute présence c:false vue pour moi pendant que je suis connecté est réécrite.
  stop.push(onValue(ref(db, base + "/pres"), s => { etats = s.val() || {}; const m = etats[uid];
    if (enLigne && !fini && m && m.c === false) presCo();
    notifieDeco(); }, () => {}));
  stop.push(onValue(ref(db, base + "/forfait"), s => { forfaits = s.val() || {}; notifieDeco(); }, () => {}));
  // Heure d'ouverture du salon classé (cree) écoutée en continu (jamais un get qui peut rester pendant pendant une coupure) ; désabonnée par stop.
  let creeV = 0; const ecouteCree = [];
  stop.push(onValue(ref(db, base + "/cree"), s => { creeV = +s.val() || 0; if (!fini) ecouteCree.forEach(f => { try { f(creeV); } catch (e) {} }); }, () => {}));
  let creeEnCours = null; // essai de poseCree en cours (un seul à la fois, voir poseCree)
  async function poseCree1() { if (fini || !creeAFaire) return true; if (!presConf || !enLigne) return false; // réessayé par reco après la présence
      // hote confirmé une fois suffit : le réécrire à chaque essai provoquait sous coupures une déconnexion (presConf faux) avant cree, à chaque essai.
      if (!hoteOk) { try { const x = await ajoute(ref(db, base + "/hote"), uid); hoteOk = x.committed || x.snapshot.val() === uid; } catch (e) {} }
      if (!clOk) { if (fini || !presConf) return false; await set(ref(db, base + "/cl"), true); clOk = true; }
      if (fini || !presConf) return false; await ajoute(ref(db, base + "/cree"), serverTimestamp()); creeAFaire = false; return true; }
  // onDisconnect réarmé puis c:true. La réponse du serveur à onDisconnect peut se perdre dans une coupure (promesse jamais
  // tenue) : sans réponse en 3 s, connecté, on recommence (onDisconnect rejoué, idempotent).
  function presCo() {
    const n = ++presN;
    const essai = setTimeout(() => { if (n === presN && enLigne && !fini) presCo(); }, 3000);
    return onDisconnect(presRef).set({ c: false, t: serverTimestamp() }).then(() => { if (n === presN) clearTimeout(essai); return set(presRef, { c: true, t: serverTimestamp() }); }).catch(() => {});
  }
  // Reconnexion : présence réécrite, puis annonce publiée réécrite (effacée par le serveur à la coupure ; la règle exige joueurs/<uid>, d'où l'attente de ecrit()).
  // presConf : joueurs/<uid> confirmé par le serveur depuis la dernière connexion. Faux dès la coupure (le serveur l'efface) : annonce et cree
  // n'écrivent qu'avec presConf vrai, sinon leur écriture partirait avant la présence à la reconnexion et serait refusée (permission_denied).
  const reco = () => { if (!enLigne) presConf = false; if (enLigne && !fini) { onDisconnect(moiRef).remove(); const e = ecrit().then(() => { if (enLigne) presConf = true; }); presCo();
    if (creeAFaire) e.then(() => salon.poseCree()).catch(() => {}); // la règle de cree exige joueurs/<uid> : après ecrit()
    if (annonceOn && annonceO && !versRobot) { annonceRearme = true; const o = annonceO; e.then(() => { if (!fini && annonceO === o) return salon.annonce(o); }).catch(() => {}); } else e.catch(() => {}); } };
  ecouteCo.push(reco);

  await onDisconnect(moiRef).remove();
  presCo();
  const salon = {
    // Déconnexion (0.5) : états de connexion { uid: { c, t } }, forfaits { graine: { u, t } }, f() à chaque changement.
    etats: () => etats,
    forfaits: () => forfaits,
    onDeco(f) { ecouteDeco.push(f); },
    // Uids engagés dans la partie (lecture ponctuelle).
    async engages() { try { return (await get(ref(db, base + "/engages"))).val() || {}; } catch (e) { return {}; } },
    // Défaite par abandon d'un adversaire hors ligne depuis plus de 70 s (vérifié aussi par les règles de la base).
    declareForfait(u, g) { return ajoute(ref(db, base + "/forfait/" + g), { u, t: serverTimestamp() }); },
    // Autre appareil du même compte : on lâche le salon sans effacer la présence (elle est à lui maintenant).
    async lache() {
      fini = true;
      stop.forEach(f => f());
      const i = ecouteCo.indexOf(reco); if (i >= 0) ecouteCo.splice(i, 1);
      try { await onDisconnect(moiRef).cancel(); await onDisconnect(presRef).cancel(); } catch (e) {}
      if (annonceOn) { annonceOn = false; try { await onDisconnect(annRef).cancel(); } catch (e) {} }
    },
    peers() {
      return Object.keys(joueurs).map(u => {
        const q = pair(u, joueurs[u]);
        if (Number.isInteger(q.presence.jg) && typeof q.presence.sid === "string") q.presence.j = journal(q.presence.sid, q.presence.jg);
        return q;
      });
    },
    onPeers(f, g) { ecoute.push(f); if (g) perdu.push(g); },
    // Journal d'un joueur (sid, graine) lu dans les coups du salon, même s'il a quitté le salon :
    // son dernier coup n'est jamais perdu. journalFrais relit d'abord le serveur.
    journalDe: (sid, g) => journal(sid, g),
    async journalFrais(sid, g) { await relitCoups(); return journal(sid, g); },
    // Verrou de partie : les deux uid engagés (sans effet s'il existe déjà).
    // 0.6.1 : g = graine de la partie (salon classé : obligatoire ; nouvelle graine = ancien verrou levé d'abord, permis une fois sa partie écrite).
    // Revanche : avant = écriture de la partie précédente (classée) ; le verrou de l'ancienne graine n'est levé qu'une fois
    // cette partie écrite (règle engages), d'où l'attente puis de nouveaux essais (2 s, 90 s au plus). Même graine déjà posée
    // (reprise après rechargement) : rien à écrire.
    async engage(uids, g, avant) {
      const o = {}; uids.forEach(u => { if (typeof u === "string") o[u] = true; });
      if (!o[uid] || Object.keys(o).length !== 2) return false;
      if (Number.isInteger(g)) o.g = String(g);
      try { if (avant) await avant; } catch (e) {}
      for (let k = 0; k < 45 && !fini; k++) {
        try {
          const e = (await get(ref(db, base + "/engages"))).val();
          if (e && o.g && e.g === o.g && e[uid]) return true;
          if (e && !e[uid]) return false;
          // salon classé : partie de l'ancienne graine pas encore écrite = verrou pas encore levable, on attend sans essayer
          if (e && e.g && (await get(ref(db, base + "/cl"))).val() === true && !(await get(ref(db, P + "classe/parties/" + code + "-" + e.g))).exists()) throw 0;
          if (e) await remove(ref(db, base + "/engages"));
          const x = await ajoute(ref(db, base + "/engages"), o);
          if (x.committed) return true;
          const v = x.snapshot.val(); // posé entre-temps (ou renvoi déjà appliqué) : le même verrou = fait, sinon nouvel essai
          if (v && v[uid] && (!o.g || v.g === o.g)) return true;
          throw 0;
        } catch (e) { await new Promise(r => setTimeout(r, 2000)); }
      }
      return false;
    },
    chat: () => chat,
    onChat(f) { ecouteChat.push(f); f(chat); },
    async dit(m) {
      m = String(m || "").replace(/\s+/g, " ").trim().slice(0, 200);
      if (!m || !donnees || !donnees.pseudo) return;
      await ajoute(push(ref(db, base + "/chat")), { a: uid, p: donnees.pseudo, t: serverTimestamp(), m });
    },
    // Verrou levé seulement s'il existe encore et me compte (l'adversaire parti l'a peut-être déjà levé : sinon refus des règles).
    async libere() { try { const e = (await get(ref(db, base + "/engages"))).val(); if (!e || !e[uid]) return; await remove(ref(db, base + "/engages")); } catch (e) {} },
    // 0.6 : salon classé. marqueClasse : cl = true et heure d'ouverture (cree, une fois) ; estClasse : lecture de cl ;
    // poseRobot(o) : bandeau « Affronter un Golem » (o = GolemsClasse.salonRobot), à poser avant de quitter le salon.
    // 0.6.1 : hote = créateur du salon (seul à pouvoir poser cl), posé à la création de tout salon.
    async marqueHote() { try { await ajoute(ref(db, base + "/hote"), uid); } catch (e) {} },
    // cree : échec (coupure) remonté à l'appelant et réessayé à chaque reconnexion (creeAFaire) ; poseCree() pour un nouvel essai à la demande.
    // Sans attendre cree : l'entrée au salon ne reste jamais suspendue à une écriture coupée (reprise par reco et par la page).
    async marqueClasse() { creeAFaire = true; salon.poseCree().catch(e => console.warn('salon classe', e)); },
    // hote (une fois confirmé), cl puis cree, repris à chaque essai (une coupure peut faire tomber n'importe laquelle des trois écritures).
    // Un seul essai à la fois (reco, marqueClasse et la page en lancent) : deux transactions sur cree en même temps, la 2e voyait la valeur
    // encore en vol de la 1re, s'arrêtait sans écrire et marquait cree comme fait ; la 1re coupée, cree n'était plus jamais écrit
    // (bandeau « Vérification de l'heure du salon… » et Réessayer sans effet). Un appel pendant un essai attend la fin de celui-ci.
    poseCree() { if (!creeEnCours) creeEnCours = poseCree1().finally(() => { creeEnCours = null; }); return creeEnCours; },
    // Réessayer : une écriture de cree restée sans réponse (socket resté ouvert) bloque l'essai en cours : nouvelle connexion forcée
    // (le SDK fait échouer la transaction envoyée, qui est relancée), puis nouvel essai.
    relanceCree() { if (fini) return Promise.resolve(true); if (creeAFaire && enLigne) { try { goOffline(db); goOnline(db); } catch (e) {} } return salon.poseCree(); },
    lisCree() { return Promise.resolve(creeV); },
    onCree(f) { ecouteCree.push(f); },
    async estClasse() { try { return (await get(ref(db, base + "/cl"))).val() === true; } catch (e) { return false; } },
    // Bandeau robot : ajout seulement ; déjà posé par moi (renvoi après coupure) = fait.
    // versRobot : départ contre le Golem engagé, le salon va être quitté : plus aucune (ré)annonce (la règle la refuserait).
    async poseRobot(o) { versRobot = true;
      try { const x = await ajoute(ref(db, base + "/robot"), o); const v = x.committed ? null : x.snapshot.val();
        if (!x.committed && !(v && v.u === uid && v.n === o.n)) throw Object.assign(new Error("robot"), { code: "PERMISSION_DENIED" }); }
      catch (e) { versRobot = false; throw e; } },
    async presence(p) {
      const { j, ...reste } = p;
      if ("pseudo" in reste) reste.pseudo = donnees && donnees.pseudo || null;
      Object.assign(pres, filtre(reste, CHAMPS_SALON));
      for (const k in pres) if (pres[k] === null) delete pres[k];
      // null efface le champ côté base
      const maj = { ...filtre(reste, CHAMPS_SALON), t: serverTimestamp() };
      await update(moiRef, maj); presOk = true; if (enLigne) presConf = true;
      touche();
      if (j !== undefined && j !== null) await envoieJournal(j);
    },
    // o = { d: nom du deck, e: éléments "brume,roche", v: version du site, w: uid de l'adversaire, q: son pseudo,
    //       n: nombre de spectateurs } pour publier, null pour retirer. L'annonce reste tant que la partie n'a pas commencé.
    // Une fois publiée, elle est mise à jour sans toucher à t (heure de création).
    async annonce(o) {
      // Salon quitté (robot lancé, sortie) : plus d'annonce, la règle la refuserait (joueur absent du salon).
      // Avant l'écriture de joueurs/<uid> : refusée aussi ; majSalon la republie après presence().
      if (o && (fini || versRobot || !presOk || !presConf || !enLigne)) return false; // false : rien d'écrit, l'appelant réessaiera
      annonceO = o || null;
      if (o) {
        const v = { u: uid, p: donnees && donnees.pseudo || "", a: donnees && donnees.avatarId || "", d: String(o.d || "").slice(0, 24), e: String(o.e || "").slice(0, 60), t: serverTimestamp() };
        if (!v.a) delete v.a; if (!v.d) delete v.d; if (!v.e) delete v.e;
        if (typeof o.v === "string" && VERSION_OK.test(o.v)) v.v = o.v;
        if (typeof o.w === "string" && o.w) { v.w = o.w; v.q = String(o.q || "").slice(0, 24); }
        if (Number.isInteger(o.n) && o.n > 0) v.n = Math.min(o.n, 999);
        // 0.6 : salon classé (cl) et Elo du créateur hors placement (el, vérifié par les règles).
        if (o.cl === true) v.cl = true;
        if (Number.isFinite(o.el)) v.el = o.el;
        // Partie en cours : g, manche m, score k ("a-b").
        if (o.g === true) { v.g = true; if (typeof o.f === "string" && /^[a-z,]{0,60}$/.test(o.f) && o.f) v.f = o.f; if (Number.isInteger(o.m)) v.m = Math.min(Math.max(o.m, 1), 9); if (typeof o.k === "string" && /^\d{1,2}-\d{1,2}$/.test(o.k)) v.k = o.k; }
        if (annonceOn) {
          const { t, ...maj } = v;
          for (const k of ["a", "d", "e", "v", "w", "q", "n", "g", "m", "k", "f", "cl", "el"]) if (!(k in maj)) maj[k] = null;
          // Annonce absente (effacée à la coupure) : update refusé (t manquant), alors republiée par set.
          const ex = annonceRearme ? (await get(annRef).catch(() => null)) : true;
          if (fini || versRobot || !presConf) return false; // salon quitté pendant la lecture (robot lancé, fin) : plus rien à annoncer
          if (ex === true || (ex && ex.exists())) {
            // Transaction plutôt qu'update : une annonce effacée par le serveur pendant une coupure n'est jamais mise à jour
            // (update refusé et journalisé « permission_denied » au renvoi) ; elle est alors republiée par set.
            try {
              const r = await runTransaction(annRef, cur => { if (!cur || cur.u !== uid) return undefined; const x = { ...cur }; for (const k in maj) { if (maj[k] === null) delete x[k]; else x[k] = maj[k]; } return x; }, { applyLocally: false });
              if (r.committed) { if (annonceRearme) { annonceRearme = false; await onDisconnect(annRef).remove(); } return; }
            } catch (e) { /* annonce effacée entre-temps : republiée */ }
          }
        }
        // onDisconnect posé APRÈS l'écriture : la règle de retrait (u = moi) est alors vraie (sinon PERMISSION_DENIED).
        // Reconnexion : l'ancien onDisconnect a servi (annonce effacée), il est reposé.
        const pose = !annonceOn || annonceRearme;
        if (fini || versRobot || !presConf) return false;
        // Effacement à la déconnexion posé AVANT l'écriture (créateur présent : la règle de retrait est vraie) : une annonce dont l'accusé
        // se perd dans une coupure ne reste jamais orpheline si la page se ferme.
        annoncePosee = true; try { await onDisconnect(annRef).remove(); } catch (e) {}
        if (fini || versRobot) return false;
        await set(annRef, v);
        // Salon quitté pendant l'écriture (leave n'a pas vu l'annonce) : retirée aussitôt (u = moi).
        if (fini || versRobot) { try { await remove(annRef); } catch (e) {} return false; }
        annonceOn = true;
        if (pose) { annonceRearme = false; await onDisconnect(annRef).remove(); }
      } else {
        // Le créateur ou un joueur présent peut retirer l'annonce (salon complet).
        const v = annonceOn ? true : (await get(annRef).catch(() => null));
        if (v === true || (v && v.exists())) { try { await remove(annRef); } catch (e) {} }
        if (annonceOn) { try { await onDisconnect(annRef).cancel(); } catch (e) {} annonceOn = false; }
      }
    },
    // Sortie : nettoyage garanti même sous coupure. Les onDisconnect d'effacement restent posés (le serveur efface si la page se ferme
    // avant les accusés) ; celui de pres passe de c:false à l'effacement ; les effacements directs partent en parallèle.
    async leave() {
      fini = true; // d'abord : une réannonce de reconnexion en cours s'arrête avant d'écrire (salon quitté, partie finie)
      const ann = annonceOn || annoncePosee; annonceOn = false; annoncePosee = false; salonsOuverts.delete(code);
      stop.forEach(f => f());
      const i = ecouteCo.indexOf(reco); if (i >= 0) ecouteCo.splice(i, 1);
      try { await onDisconnect(presRef).remove(); } catch (e) {}
      await Promise.all([ann ? remove(annRef).catch(() => {}) : null, remove(presRef).catch(() => {}), remove(moiRef).catch(() => {})]);
    }
  };
  return salon;
}

// index.html attend window.golemsSalon (promesse posée avant son script principal).
ouvre().then(r => window.__golemsSalonPret(r), e => { console.warn("Salon indisponible", e); window.__golemsSalonPret(null); });
