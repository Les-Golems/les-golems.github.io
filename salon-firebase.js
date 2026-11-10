// Salon en ligne sur Firebase Realtime Database, comptes pseudo + code secret.
// Remplace la capacité « room » de l'artifact Claude avec la même interface
// (presence, peers, onPeers, onConnection, connected, join, leave), plus « compte ».
//
// Connexion :
//   invité  = connexion anonyme, par onglet : jeu contre le robot seulement, rien en ligne.
//   compte  = Firebase Auth Email/Mot de passe en interne. L'adresse est fictive, dérivée du
//             pseudo normalisé (j<empreinte>@joueurs.les-golems.invalid) ; le joueur ne la voit jamais.
//             Le code secret est le mot de passe (6 caractères minimum, tout caractère accepté).
//
// Arborescence :
//   pseudos/{pseudo minuscule}  uid du propriétaire
//   joueurs/{uid}               pseudo, avatarId, cree, importe, decks/0..11, historique/{id} {d, x},
//                               cumul (texte JSON : cumuls de toutes les parties, fabriqués par la page)
//   profils/{uid}               résumé public du profil (chiffres de la fenêtre de compte), m = profil privé
//   hall/{uid}                  présence dans l'accueil (pseudo, salon, quitte), comptes seulement
//   salons/{code}/joueurs/{uid} présence dans le salon (pseudo, arrivee, sid, pret, deck,
//                               graine, jg, adv, veut, quitte, v = version du site), effacée par onDisconnect
//   salons/{code}/coups/{push}  journal : un coup par entrée, jamais modifié
//                               { a: uid auteur, s: sid, g: graine, n: rang, c: code du coup }
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import { getAuth, signInAnonymously, setPersistence, browserSessionPersistence, browserLocalPersistence,
  createUserWithEmailAndPassword, signInWithEmailAndPassword, signOut, connectAuthEmulator } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import { getDatabase, ref, onValue, update, remove, push, set, onDisconnect, serverTimestamp, get, query, orderByChild, orderByValue, endAt, limitToFirst, limitToLast, equalTo, runTransaction, connectDatabaseEmulator } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-database.js";
import { firebaseConfig as configEnLigne } from "./firebase-config.js";

// Servi depuis localhost ou 127.0.0.1 : émulateur Firebase local (projet de démonstration
// demo-les-golems, voir lancer_emulateur.ps1). Jamais en ligne.
const EMULATEUR = /^(localhost|127\.0\.0\.1)$/.test(location.hostname);
const HOTE_EMU = "127.0.0.1";
const firebaseConfig = EMULATEUR
  ? { apiKey: "demo-cle", authDomain: "demo-les-golems.firebaseapp.com", projectId: "demo-les-golems",
      databaseURL: `http://${HOTE_EMU}:9000?ns=demo-les-golems-default-rtdb` }
  : configEnLigne;

const CHAMPS_HALL = ["pseudo", "salon", "quitte"];
// v : version du site ("0.2b|<build>" lu dans version.json), comparée dans le salon et les parties publiques.
const CHAMPS_SALON = ["pseudo", "arrivee", "sid", "pret", "deck", "graine", "jg", "adv", "veut", "quitte", "v"];
const VERSION_OK = /^[0-9a-z.|: -]{1,40}$/;
const MAX_HISTO = 50, MAX_DECKS = 12;
// Préfixe de base : vide pour le site public, "essai/" pour le site d'essai (les-golems.github.io/essai/).
// Comptes Auth partagés ; pseudos, données, accueil et salons séparés.
export const PREFIXE = location.pathname.split("/")[1] === "essai" ? "essai/" : "";
const P = PREFIXE;

function filtre(p, champs) {
  const o = {};
  for (const k of champs) if (k in p) o[k] = p[k] === undefined ? null : p[k];
  return o;
}

// Pseudo affiché : espaces resserrés, 3 à 20 caractères, lettres, chiffres, espace, _ - '.
export function nettoiePseudo(s) { return String(s || "").normalize("NFKC").replace(/\s+/g, " ").trim(); }
export function erreurPseudo(s) {
  const v = nettoiePseudo(s);
  if (v.length < 3) return "Compte : pseudo trop court, 3 caractères au moins. Allonge ton pseudo.";
  if (v.length > 20) return "Compte : pseudo trop long, 20 caractères au plus. Raccourcis ton pseudo.";
  if (!/^[\p{L}\p{N} _'-]+$/u.test(v)) return "Compte : caractère refusé dans le pseudo. Utilise des lettres, des chiffres, des espaces et _ - '.";
  return "";
}
export const clePseudo = s => nettoiePseudo(s).toLowerCase();
async function adresse(pseudo) {
  const o = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(clePseudo(pseudo)));
  return "j" + [...new Uint8Array(o)].map(b => b.toString(16).padStart(2, "0")).join("").slice(0, 40) + "@joueurs.les-golems.invalid";
}
function messageErreur(e) {
  const c = e && e.code || "";
  if (c === "auth/email-already-in-use") return "Compte : pseudo déjà pris. Choisis-en un autre.";
  if (c === "auth/weak-password") return "Compte : code trop court, 6 caractères au moins. Allonge ton code secret.";
  if (c === "auth/invalid-credential" || c === "auth/wrong-password" || c === "auth/user-not-found" || c === "auth/invalid-login-credentials") return "Compte : pseudo ou code incorrect. Vérifie-les puis réessaie.";
  if (c === "auth/too-many-requests") return "Compte : trop d'essais. Réessaie dans quelques minutes.";
  if (c === "auth/network-request-failed") return "Compte : pas de connexion internet. Vérifie ta connexion puis réessaie.";
  if (c === "auth/operation-not-allowed") return "Compte : création de comptes fermée pour le moment. Joue sans compte en attendant.";
  if (c === "auth/user-disabled") return "Compte : compte désactivé. Demande à KaTarN (Romain).";
  if (e && /PERMISSION_DENIED/i.test(String(e.message || e.code))) return "Compte : accès refusé par le serveur. Préviens KaTarN (Romain).";
  return "Compte : erreur inattendue. Réessaie.";
}

async function ouvre() {
  const app = initializeApp(firebaseConfig);
  const auth = getAuth(app);
  const db = getDatabase(app);
  if (EMULATEUR) {
    connectAuthEmulator(auth, `http://${HOTE_EMU}:9099`, { disableWarnings: true });
    connectDatabaseEmulator(db, HOTE_EMU, 9000);
  }
  // Un compte reste connecté (stockage local) ; un invité vit le temps de l'onglet.
  await auth.authStateReady();
  if (!auth.currentUser) { await setPersistence(auth, browserSessionPersistence); await signInAnonymously(auth); }
  const estCompte = () => !!auth.currentUser && !auth.currentUser.isAnonymous;
  let moi = auth.currentUser.uid;
  let donnees = null, resumeur = null, cumuleur = null;        // copie de joueurs/{uid} pour un compte
  const imageActive = () => !!donnees && !!donnees.avatarImg && (!donnees.avatarId || donnees.avatarId === "__img");
  const ecouteCompte = [];
  const signale = () => ecouteCompte.forEach(f => { try { f(); } catch (e) {} });

  let enLigne = false;
  const ecouteCo = [];
  onValue(ref(db, ".info/connected"), s => { enLigne = s.val() === true; ecouteCo.forEach(f => f()); });
  // Écart entre l'horloge locale et celle du serveur (déconnexion : minuteurs comptés en heure serveur).
  let decalage = 0;
  onValue(ref(db, ".info/serverTimeOffset"), s => { decalage = +s.val() || 0; });

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
  ecouteCo.push(() => { if (enLigne && hallRef) { onDisconnect(hallRef).remove(); ecritHall().catch(() => {}); } });

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
  onValue(ref(db, P + "enligne"), s => { enligneN = Object.keys(s.val() || {}).length; ecouteEnligne.forEach(f => { try { f(); } catch (e) {} }); }, () => {});
  ecouteCo.push(() => { if (enLigne && enligneRef) majEnligne(); });
  majEnligne();

  // Données du compte
  function versListe(o) { return Object.values(o || {}).filter(Boolean); }
  function lisCumul(t) { if (typeof t !== "string") return null; try { const c = JSON.parse(t); return c && typeof c === "object" ? c : null; } catch (e) { return null; } }
  async function chargeDonnees() {
    if (!estCompte()) { donnees = null; return; }
    const v = (await get(ref(db, P + "joueurs/" + moi))).val() || {};
    donnees = {
      pseudo: typeof v.pseudo === "string" ? v.pseudo : "",
      avatarId: typeof v.avatarId === "string" ? v.avatarId : "",
      avatarImg: typeof v.avatarImg === "string" ? v.avatarImg : "",
      importe: !!v.importe,
      cree: +v.cree || 0,
      decks: versListe(v.decks).map(d => ({ id: d.id, nom: d.nom, cartes: d.cartes || {}, t: d.t || 0, ...(d.v ? { v: d.v } : {}) })),
      historique: Object.keys(v.historique || {}).map(k => { try { return JSON.parse(v.historique[k].x); } catch (e) { return null; } })
        .filter(x => x && x.id).sort((a, b) => (+b.date || 0) - (+a.date || 0)),
      cumul: lisCumul(v.cumul),
      masque: false
    };
    // Profil privé : champ m du résumé public (profils/{uid}).
    try { donnees.masque = (await get(ref(db, P + "profils/" + moi + "/m"))).val() === true; } catch (e) {}
  }
  // Après connexion : pseudo et réservation réparés si besoin (réinitialisation partielle par Romain).
  async function repare(pseudo) {
    const cle = clePseudo(pseudo);
    const maj = {};
    const r = (await get(ref(db, P + "pseudos/" + cle))).val();
    if (r !== moi) { if (r) throw Object.assign(new Error("pris"), { code: "golems/pris" }); maj[P + "pseudos/" + cle] = moi; }
    if (!donnees.pseudo) { maj[P + "joueurs/" + moi + "/pseudo"] = nettoiePseudo(pseudo); maj[P + "joueurs/" + moi + "/cree"] = Date.now(); }
    if (Object.keys(maj).length) await update(ref(db), maj);
    if (!donnees.pseudo) donnees.pseudo = nettoiePseudo(pseudo);
  }
  async function bascule(f) {
    await arreteHall();
    await quitteEnligne();
    await f();
    moi = auth.currentUser.uid;
    majEnligne();
    await chargeDonnees();
    demarreHall();
    signale();
  }

  // Cumuls de toutes les parties (joueurs/{uid}/cumul, texte JSON fabriqué par la page) : les parties de l'historique,
  // et celles qui viennent d'être écrites (extra), pas encore comptées y sont ajoutées par transaction, chacune une seule
  // fois, même depuis deux onglets ou deux appareils. Première connexion : reconstruits depuis l'historique.
  // Échec (hors ligne, règles pas encore à jour) : sans effet, nouvel essai à la prochaine partie ou connexion.
  // Les appels passent l'un après l'autre. Renvoie true si les cumuls ont changé.
  let fileCumul = Promise.resolve();
  function rattrape(extra) {
    const f = async () => {
      if (!compte.connecte() || !cumuleur) return false;
      const qui = moi, l = (extra || []).concat(donnees.historique);
      // 0.6.3 : compteurs par saison : la saison en cours (classe/saison, lecture publique) déclenche la bascule (remise à zéro, archive).
      let saison = null;
      try { const s = (await get(ref(db, P + "classe/saison"))).val(); if (s && Number.isInteger(s.id)) saison = { id: s.id, debut: +s.debut || 0 }; } catch (e) {}
      try { if (!cumuleur(donnees.cumul, l, saison ? { saison } : undefined)) return false; } catch (e) { console.warn("cumul", e); return false; }
      // 0.6.2 : compteurs par mode à (re)construire (md absent ou en retard) : profil classé et, si l'historique ne contient
      // plus toutes les classées, classées contre le robot lues dans classe/parties (lecture seule).
      let ctx = saison ? { saison } : null; const c0 = donnees.cumul;
      if (c0 && c0.f === 1 && (+c0.k || 0) > 0 && !(c0.md && c0.md.k === c0.k)) {
        ctx = ctx || {};
        try { const j = (await get(ref(db, P + "classe/joueurs/" + qui))).val(); if (j && Number.isFinite(j.v) && Number.isFinite(j.d)) ctx.cl = { v: j.v, d: j.d }; } catch (e) {}
        const nh = donnees.historique.filter(x => x && (x.mode === "classee" || x.cl === true)).length;
        if (ctx.cl && ctx.cl.v + ctx.cl.d > nh) {
          try {
            const ps = (await get(ref(db, P + "classe/parties"))).val() || {}, rob = { facile: { n: 0, v: 0 }, normal: { n: 0, v: 0 }, difficile: { n: 0, v: 0 } };
            for (const k in ps) { const p = ps[k]; const m = p && p.robot === true && p.a === qui && /^robot-(facile|normal|difficile)$/.exec(String(p.b)); if (m) { rob[m[1]].n++; if (p.gagnant === qui) rob[m[1]].v++; } }
            ctx.rob = rob;
          } catch (e) { console.warn("cumul", e); return false; }
        }
      }
      try {
        const r = await runTransaction(ref(db, P + "joueurs/" + qui + "/cumul"), t => { const c = cumuleur(lisCumul(t), l, ctx); return c ? JSON.stringify(c) : undefined; });
        if (qui === moi && donnees) donnees.cumul = lisCumul(r.snapshot.val()) || donnees.cumul;
        return r.committed;
      } catch (e) { console.warn("cumul", e); return false; }
    };
    return (fileCumul = fileCumul.then(f, f));
  }

  // 0.6 : marque classée de l'historique (rules/10-comptes.js) : c = classée, de = variation d'Elo, ro = robot affronté.
  function marqueClassee(e, x) {
    const c = x && x.classe; if (!(x && (x.mode === "classee" || c))) return;
    e.c = true;
    if (c && !c.attente && Number.isInteger(c.delta) && Math.abs(c.delta) <= 64) e.de = c.delta;
    if (c && /^(facile|normal|difficile)$/.test(c.niveau || "")) e.ro = c.niveau;
  }
  // Texte d'une entrée d'historique (12 000 caractères au plus ; allégé si besoin) ; null si impossible.
  const texteHisto = x => { let t = JSON.stringify(x); if (t.length > 12000) t = JSON.stringify({ ...x, bilan: [] }); if (t.length > 12000) t = JSON.stringify({ ...x, bilan: [], manches: [] }); if (t.length > 12000) t = JSON.stringify({ ...x, bilan: [], manches: [], rejeu: null }); if (t.length > 12000) t = JSON.stringify({ id: x.id, date: x.date, adv: x.adv, res: x.res, abandon: x.abandon, score: x.score, mvp: x.mvp, pseudo: x.pseudo, advNom: x.advNom, moteur: x.moteur }); return t.length > 12000 ? null : t; };
  const compte = {
    erreurPseudo, nettoiePseudo,
    connecte: () => estCompte() && !!donnees,
    uid: () => moi,
    pseudo: () => donnees ? donnees.pseudo : "",
    // 0.6 : « Mon image » n'est plus effacée quand on choisit un autre avatar. avatarId = "__img" : image importée active ;
    // "__init" : initiale alors qu'une image est gardée ; absent : image si elle existe (anciens comptes), sinon initiale.
    avatarId: () => donnees && !/^__(img|init)$/.test(donnees.avatarId) && !imageActive() ? donnees.avatarId : "",
    // Avatar choisi en galerie ("" = initiale, "__img" = mon image) : joueurs/{uid}/avatarId ; l'image importée reste.
    async choisirAvatar(id) {
      if (!estCompte() || !donnees) return;
      const v = id === "__img" ? (donnees.avatarImg ? "__img" : "") : id || (donnees.avatarImg ? "__init" : "");
      await update(ref(db, P + "joueurs/" + moi), { avatarId: v || null });
      donnees.avatarId = v;
    },
    // Image active (affichée) ; imageGardee : image enregistrée, active ou non (case « Mon image » de la galerie).
    avatarImg: () => imageActive() ? donnees.avatarImg : "",
    imageGardee: () => donnees ? donnees.avatarImg : "",
    // Image importée (data:image/webp|jpeg;base64, 140 000 caractères au plus) : joueurs/{uid}/avatarImg, et elle devient active.
    async choisirImage(url) {
      if (!estCompte() || !donnees) return;
      await update(ref(db, P + "joueurs/" + moi), { avatarImg: url, avatarId: "__img" });
      donnees.avatarImg = url; donnees.avatarId = "__img";
    },
    // 0.6 : profil classé d'un autre compte (classe/joueurs/{uid}, lisible par tout compte : rules/50-classe.js) ; null si absent.
    async classeDe(uid) {
      if (!estCompte() || typeof uid !== "string" || !uid) return null;
      try { const j = (await get(ref(db, P + "classe/joueurs/" + uid))).val(); return j && typeof j === "object" ? j : null; } catch (e) { return null; }
    },
    // Avatar d'un autre compte (lisible par tout connecté, aucune règle à changer).
    async avatarDe(uid) {
      if (typeof uid !== "string" || !uid) return "";
      let v = "";
      try { v = (await get(ref(db, P + "joueurs/" + uid + "/avatarId"))).val(); v = typeof v === "string" ? v : ""; } catch (e) {}
      if (v === "__init") return "";
      if (!v || v === "__img") { try { const i = (await get(ref(db, P + "joueurs/" + uid + "/avatarImg"))).val(); if (typeof i === "string" && i) return i; } catch (e) {} return ""; }
      return v;
    },
    // Résumé public des parties (joueurs/{uid}/stats = { v: victoires, n: parties }) et classement, sur toutes les parties
    // (cumuls), après ajout au cumul des parties qui viennent d'être écrites (extra). Sans la page : l'historique seul.
    async publieStats(extra) {
      if (!compte.connecte()) return;
      await rattrape(extra);
      if (resumeur) { await compte.publieProfil(); return; }
      const h = donnees.historique, v = h.filter(x => x.res === "Victoire").length;
      try { await set(ref(db, P + "joueurs/" + moi + "/stats"), { v, n: h.length }); } catch (e) {}
      try { await set(ref(db, P + "classement/" + moi), { p: donnees.pseudo, v, n: h.length }); } catch (e) {}
    },
    // Résumé public du profil : fabriqué par la page (mêmes calculs que la fenêtre de compte), sur toutes les parties,
    // publié à la connexion et à chaque fin de partie, avec stats et classement (mêmes n et v).
    // Profil privé : pseudo, parties, victoires, défaites seulement.
    resumeur(f) { resumeur = f; },
    // Fabrique des cumuls (page) : f(cumuls, parties) renvoie de nouveaux cumuls si une partie est nouvelle, sinon null.
    cumuleur(f) { cumuleur = f; },
    async publieProfil() {
      if (!compte.connecte() || !resumeur) return false;
      await rattrape();
      if (!compte.connecte()) return false;
      let r; try { r = resumeur(donnees.historique.slice(), donnees.cumul || null); } catch (e) { console.warn("profil", e); return false; }
      if (!r) return false;
      if (r.n > 0) {
        try { await set(ref(db, P + "joueurs/" + moi + "/stats"), { v: r.v, n: r.n }); } catch (e) {}
        try { await set(ref(db, P + "classement/" + moi), { p: donnees.pseudo, v: r.v, n: r.n }); } catch (e) {}
      }
      const o = { p: donnees.pseudo, m: !!donnees.masque, n: r.n, v: r.v, d: r.d, t: serverTimestamp() };
      // 0.6 : profil privé (masque) : ni date de création (cr) ni Elo (el).
      if (donnees.cree && !donnees.masque) o.cr = donnees.cree;
      if (!donnees.masque) for (const k of ["s", "dk", "cb", "cm", "mv", "o", "jo", "pv", "pm", "pmf", "pms"]) if (r[k] !== undefined && r[k] !== null) o[k] = r[k];
      // 0.6 : Elo classé affiché (placement fini seulement, règle profils/el).
      const lisEl = async () => { delete o.el; if (donnees.masque) return; try { const j = (await get(ref(db, P + "classe/joueurs/" + moi))).val(); if (j && j.parties >= 5 && Number.isFinite(j.elo)) o.el = j.elo; } catch (e) {} };
      await lisEl();
      try { await set(ref(db, P + "profils/" + moi), o); return true; } catch (e) {
        // el doit égaler classe/joueurs/<uid>/elo au moment de l'écriture : une fin de classée (finRobot, finJoueurs) peut
        // l'avoir changé entre la lecture et l'écriture. Nouvelle lecture, puis un second essai.
        await new Promise(f => setTimeout(f, 800)); await lisEl();
        try { await set(ref(db, P + "profils/" + moi), o); return true; } catch (e2) { console.warn("profil", e2); return false; }
      }
    },
    async masquerProfil(b) {
      if (!compte.connecte()) return;
      const avant = donnees.masque; donnees.masque = !!b;
      if (!(await compte.publieProfil())) { donnees.masque = avant; throw new Error("profil"); }
    },
    async profilDe(uid) {
      if (typeof uid !== "string" || !uid) return null;
      try { const v = (await get(ref(db, P + "profils/" + uid))).val(); return v && typeof v.p === "string" && Number.isInteger(v.n) ? v : null; } catch (e) { return null; }
    },
    async statsDe(uid) {
      if (typeof uid !== "string" || !uid) return null;
      try { const s = (await get(ref(db, P + "joueurs/" + uid + "/stats"))).val(); return s && Number.isInteger(s.n) ? s : null; } catch (e) { return null; }
    },
    donnees: () => donnees,
    onChange(f) { ecouteCompte.push(f); },
    async creer(pseudo, code) {
      const e = erreurPseudo(pseudo); if (e) return e;
      if (typeof code !== "string" || code.length < 6) return "Compte : code trop court, 6 caractères au moins. Allonge ton code secret.";
      const nom = nettoiePseudo(pseudo), cle = clePseudo(pseudo);
      try {
        if ((await get(ref(db, P + "pseudos/" + cle))).exists()) return "Compte : pseudo déjà pris. Choisis-en un autre.";
        const mail = await adresse(nom);
        await bascule(async () => {
          const u = (await createUserWithEmailAndPassword(auth, mail, code)).user;
          try {
            await update(ref(db), { [P + "pseudos/" + cle]: u.uid, [P + "joueurs/" + u.uid + "/pseudo"]: nom, [P + "joueurs/" + u.uid + "/cree"]: Date.now() });
          } catch (x) {
            // Pseudo réservé entre-temps : le compte vide est supprimé, retour en invité.
            try { await u.delete(); } catch (y) {}
            await setPersistence(auth, browserSessionPersistence); await signInAnonymously(auth);
            throw Object.assign(new Error("pris"), { code: "auth/email-already-in-use" });
          }
          await setPersistence(auth, browserLocalPersistence);
        });
        return "";
      } catch (x) { console.warn(x); return messageErreur(x); }
    },
    async connecter(pseudo, code) {
      const e = erreurPseudo(pseudo); if (e) return "Compte : pseudo ou code incorrect. Vérifie-les puis réessaie.";
      if (typeof code !== "string" || !code) return "Compte : code secret vide. Entre ton code secret.";
      try {
        let refus = "";
        await bascule(async () => {
          await signInWithEmailAndPassword(auth, await adresse(pseudo), code);
          moi = auth.currentUser.uid;
          await chargeDonnees();
          try { await repare(pseudo); }
          catch (x) {
            if (x.code !== "golems/pris") throw x;
            refus = "Compte : pseudo lié à un autre compte. Demande à KaTarN (Romain).";
            await signOut(auth); await setPersistence(auth, browserSessionPersistence); await signInAnonymously(auth);
            return;
          }
          await setPersistence(auth, browserLocalPersistence);
        });
        return refus;
      } catch (x) {
        console.warn(x);
        if (!auth.currentUser) { try { await setPersistence(auth, browserSessionPersistence); await signInAnonymously(auth); moi = auth.currentUser.uid; donnees = null; signale(); } catch (y) {} }
        return messageErreur(x);
      }
    },
    async deconnecter() {
      await bascule(async () => {
        await signOut(auth);
        await setPersistence(auth, browserSessionPersistence);
        await signInAnonymously(auth);
      });
    },
    // Decks : la liste entière est réécrite (12 au plus, emplacements 0 à 11).
    async ecritDecks(l) {
      if (!compte.connecte()) return;
      const o = {};
      l.slice(0, MAX_DECKS).forEach((d, i) => {
        const c = {}; for (const k in d.cartes || {}) if (+d.cartes[k] > 0) c[k] = +d.cartes[k];
        o[i] = { id: String(d.id), nom: String(d.nom).slice(0, 24) || "Deck", cartes: c, t: Date.now() };
        if (typeof d.v === "string" && /^[0-9a-z.]{1,10}$/.test(d.v)) o[i].v = d.v;
      });
      donnees.decks = l.slice(0, MAX_DECKS);
      await set(ref(db, P + "joueurs/" + moi + "/decks"), o);
    },
    // Historique : ajoute les entrées, puis purge au-delà des 50 plus récentes (liste et replays).
    // Les cumuls (profil, classement) comptent toutes les parties, même celles purgées aussitôt.
    async ajouteHisto(entrees) {
      if (!compte.connecte()) return;
      const maj = {}, ajoutes = [];
      // Trop long : on retire d'abord le bilan, puis le detail des manches, le rejeu en dernier, jamais en coupant le JSON.
      // En dernier recours, l'essentiel seulement (résultat, score, adversaire) : la partie compte toujours.
      const texte = texteHisto;
      const trop = [];
      entrees.forEach(x => { const t = x && x.id && texte(x); if (x && x.id && !t) trop.push(x.id); if (t && !donnees.historique.some(y => y.id === x.id)) { donnees.historique.push(x); ajoutes.push(x); maj[x.id] = { d: +x.date || Date.now(), x: t }; marqueClassee(maj[x.id], x); } });
      donnees.historique.sort((a, b) => b.date - a.date);
      donnees.historique.splice(MAX_HISTO).forEach(x => { maj[x.id] = null; });
      for (const k in maj) if (maj[k] && !donnees.historique.some(y => y.id === k)) delete maj[k];
      if (Object.keys(maj).length) await update(ref(db, P + "joueurs/" + moi + "/historique"), maj);
      compte.publieStats(ajoutes);
      // Plus d'échec silencieux : la page affiche « Partie non enregistrée ».
      if (trop.length) throw Object.assign(new Error("historique trop long"), { code: "golems/trop-long" });
    },
    // 0.6.1 : réécrit une entrée déjà enregistrée (variation classée écrite après coup : fin de « en attente »).
    async majHisto(x) {
      if (!compte.connecte() || !x || !x.id || !donnees.historique.some(y => y.id === x.id)) return false;
      const t = texteHisto(x); if (!t) return false;
      const e = { d: +x.date || Date.now(), x: t }; marqueClassee(e, x);
      await set(ref(db, P + "joueurs/" + moi + "/historique/" + x.id), e); return true;
    },
    async marqueImport() {
      if (!compte.connecte()) return;
      donnees.importe = true;
      await set(ref(db, P + "joueurs/" + moi + "/importe"), Date.now());
    }
  };

  await chargeDonnees().catch(() => { donnees = null; });
  demarreHall();

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
        await set(push(ref(db, base + "/coups")), { a: uid, s: sid, g: g, n: n, c: liste[n] });
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
    const annRef = ref(db, P + "annonces/" + code);
    let annonceOn = false, presOk = false;
    function ecrit() { return update(moiRef, { ...pres, t: serverTimestamp() }); }
    // Présence de connexion (0.5, déconnexion) : salons/{code}/pres/{uid} = { c: connecté, t: heure serveur du dernier changement }.
    // Le serveur écrit c:false lui-même à la coupure (onDisconnect) ; l'adversaire en tire « reconnexion » puis « hors ligne ».
    const presRef = ref(db, base + "/pres/" + uid);
    let etats = {}, forfaits = {};
    const ecouteDeco = [];
    const notifieDeco = () => { if (!fini) ecouteDeco.forEach(f => { try { f(); } catch (e) {} }); };
    stop.push(onValue(ref(db, base + "/pres"), s => { etats = s.val() || {}; notifieDeco(); }, () => {}));
    stop.push(onValue(ref(db, base + "/forfait"), s => { forfaits = s.val() || {}; notifieDeco(); }, () => {}));
    function presCo() {
      return onDisconnect(presRef).set({ c: false, t: serverTimestamp() }).then(() => set(presRef, { c: true, t: serverTimestamp() })).catch(() => {});
    }
    const reco = () => { if (enLigne && !fini) { onDisconnect(moiRef).remove(); ecrit().catch(() => {}); presCo(); } };
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
      declareForfait(u, g) { return set(ref(db, base + "/forfait/" + g), { u, t: serverTimestamp() }); },
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
            await set(ref(db, base + "/engages"), o);
            return true;
          } catch (e) { await new Promise(r => setTimeout(r, 2000)); }
        }
        return false;
      },
      chat: () => chat,
      onChat(f) { ecouteChat.push(f); f(chat); },
      async dit(m) {
        m = String(m || "").replace(/\s+/g, " ").trim().slice(0, 200);
        if (!m || !donnees || !donnees.pseudo) return;
        await set(push(ref(db, base + "/chat")), { a: uid, p: donnees.pseudo, t: serverTimestamp(), m });
      },
      async libere() { try { await remove(ref(db, base + "/engages")); } catch (e) {} },
      // 0.6 : salon classé. marqueClasse : cl = true et heure d'ouverture (cree, une fois) ; estClasse : lecture de cl ;
      // poseRobot(o) : bandeau « Affronter un Golem » (o = GolemsClasse.salonRobot), à poser avant de quitter le salon.
      // 0.6.1 : hote = créateur du salon (seul à pouvoir poser cl), posé à la création de tout salon.
      async marqueHote() { try { await set(ref(db, base + "/hote"), uid); } catch (e) {} },
      async marqueClasse() { try { await set(ref(db, base + "/hote"), uid); } catch (e) {} await set(ref(db, base + "/cl"), true); try { await set(ref(db, base + "/cree"), serverTimestamp()); } catch (e) {} },
      async estClasse() { try { return (await get(ref(db, base + "/cl"))).val() === true; } catch (e) { return false; } },
      poseRobot(o) { return set(ref(db, base + "/robot"), o); },
      async presence(p) {
        const { j, ...reste } = p;
        if ("pseudo" in reste) reste.pseudo = donnees && donnees.pseudo || null;
        Object.assign(pres, filtre(reste, CHAMPS_SALON));
        for (const k in pres) if (pres[k] === null) delete pres[k];
        // null efface le champ côté base
        const maj = { ...filtre(reste, CHAMPS_SALON), t: serverTimestamp() };
        await update(moiRef, maj); presOk = true;
        touche();
        if (j !== undefined && j !== null) await envoieJournal(j);
      },
      // o = { d: nom du deck, e: éléments "brume,roche", v: version du site, w: uid de l'adversaire, q: son pseudo,
      //       n: nombre de spectateurs } pour publier, null pour retirer. L'annonce reste tant que la partie n'a pas commencé.
      // Une fois publiée, elle est mise à jour sans toucher à t (heure de création).
      async annonce(o) {
        // Salon quitté (robot lancé, sortie) : plus d'annonce, la règle la refuserait (joueur absent du salon).
        // Avant l'écriture de joueurs/<uid> : refusée aussi ; majSalon la republie après presence().
        if (o && (fini || !presOk)) return false; // false : rien d'écrit, l'appelant réessaiera
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
            try { await update(annRef, maj); return; } catch (e) { /* annonce effacée entre-temps : republiée */ }
          }
          // onDisconnect posé APRÈS l'écriture : la règle de retrait (u = moi) est alors vraie (sinon PERMISSION_DENIED).
          const pose = !annonceOn;
          await set(annRef, v); annonceOn = true;
          if (pose) await onDisconnect(annRef).remove();
        } else {
          // Le créateur ou un joueur présent peut retirer l'annonce (salon complet).
          const v = annonceOn ? true : (await get(annRef).catch(() => null));
          if (v === true || (v && v.exists())) { try { await remove(annRef); } catch (e) {} }
          if (annonceOn) { try { await onDisconnect(annRef).cancel(); } catch (e) {} annonceOn = false; }
        }
      },
      async leave() {
        if (annonceOn) { annonceOn = false; try { await onDisconnect(annRef).cancel(); await remove(annRef); } catch (e) {} }
        fini = true;
        stop.forEach(f => f());
        const i = ecouteCo.indexOf(reco); if (i >= 0) ecouteCo.splice(i, 1);
        await onDisconnect(moiRef).cancel();
        try { await onDisconnect(presRef).cancel(); await remove(presRef); } catch (e) {}
        await remove(moiRef);
      }
    };
    return salon;
  }

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
      ecrit: m => { const o = {}; for (const k in m) o[P + k] = m[k]; return update(ref(db), o); }
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
      if ((await get(r)).exists()) return false;
      await set(r, { ...o, d: serverTimestamp() });
      return true;
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
    // 0.6 : votes des guides (rules/60-guides.js) : guides/<id>/votes/<uid> = 1 ou -1, lus par tous, écrits par un compte pour lui seul.
    // ecoute(f) : f({ id: { uid: 1 | -1 } }) à chaque changement ({} si illisible) ; vote(id, v) : v = 1, -1, ou 0 pour retirer.
    // uid() : uid du compte connecté (null en invité).
    guides: {
      ecoute(f) {
        return onValue(ref(db, P + "guides"), s => {
          const v = s.val() || {}, o = {};
          for (const g in v) { const w = v[g] && v[g].votes; if (w && typeof w === "object") { o[g] = {}; for (const u in w) if (w[u] === 1 || w[u] === -1) o[g][u] = w[u]; } }
          f(o);
        }, () => f({}));
      },
      vote(id, v) {
        if (!estCompte()) return Promise.reject(new Error("compte"));
        const r = ref(db, P + "guides/" + id + "/votes/" + moi);
        return v === 1 || v === -1 ? set(r, v) : remove(r);
      },
      uid: () => estCompte() ? moi : null,
      // Proposition de guide (rules/60-guides.js, propositionsGuides) : o = { ty: 'v'|'t', ti, yt?, tx?, d1, d2? } ; rend la clé écrite.
      async propose(o) {
        if (!estCompte() || !donnees) throw new Error("compte");
        const x = { u: moi, p: donnees.pseudo, ty: o.ty, ti: o.ti, d1: o.d1, t: serverTimestamp() };
        for (const k of ["yt", "tx", "d2"]) if (o[k]) x[k] = o[k];
        const r = push(ref(db, P + "propositionsGuides"));
        await set(r, x); return r.key;
      }
    },
    // Lecture brute (tests locaux) : soumise aux mêmes règles que le reste.
    lit: p => get(ref(db, P + p)).then(s => s.val()),
    join
  };
}

// index.html attend window.golemsSalon (promesse posée avant son script principal).
ouvre().then(r => window.__golemsSalonPret(r), e => { console.warn("Salon indisponible", e); window.__golemsSalonPret(null); });
