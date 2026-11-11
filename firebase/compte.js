// Comptes des Golems (Firebase) : ouverture de la base, connexion (invité ou compte pseudo + code secret), pseudo, profil,
// historique et cumuls. Découpé de salon-firebase.js (lot E de l'audit 0.6a) : code déplacé sans changement.
// Point d'entrée : firebase/salon.js (chargé par index.html), qui appelle ouvreCompte() puis assemble le salon.
//
// Connexion :
//   invité  = connexion anonyme, par onglet : jeu contre le robot seulement, rien en ligne.
//   compte  = Firebase Auth Email/Mot de passe en interne. L'adresse est fictive, dérivée du
//             pseudo normalisé (j<empreinte>@joueurs.les-golems.invalid) ; le joueur ne la voit jamais.
//             Le code secret est le mot de passe (6 caractères minimum, tout caractère accepté).
//
// Arborescence :
//   pseudos/{pseudo minuscule}  uid du propriétaire
//   joueurs/{uid}               pseudo, avatarId, cree, importe, decks/0..11 (emplacements fixes), ordreDecks (ordre affiché), historique/{id} {d, x},
//                               cumul (texte JSON : cumuls de toutes les parties, fabriqués par la page)
//   profils/{uid}               résumé public du profil (chiffres de la fenêtre de compte), m = profil privé
//   hall/{uid}                  présence dans l'accueil (pseudo, salon, quitte), comptes seulement
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import { getAuth, signInAnonymously, setPersistence, browserSessionPersistence, browserLocalPersistence,
  createUserWithEmailAndPassword, signInWithEmailAndPassword, signOut, connectAuthEmulator } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import { getDatabase, goOffline, goOnline, ref, update, set, serverTimestamp, get, query, orderByKey, startAt, endAt, runTransaction, connectDatabaseEmulator } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-database.js";
import { firebaseConfig as configEnLigne } from "../firebase-config.js";
import { lisDecks, ecritDecks as ecritDecksEnFile } from "./decks.js";

// Servi depuis localhost ou 127.0.0.1 : émulateur Firebase local (projet de démonstration
// demo-les-golems, voir lancer_emulateur.ps1). Jamais en ligne.
const EMULATEUR = /^(localhost|127\.0\.0\.1)$/.test(location.hostname);
const HOTE_EMU = "127.0.0.1";
// Ports de l'émulateur : 9000 (base) et 9099 (Auth), ou ceux de la clé locale golems.emuPorts = "base,auth" (tests sur un 2e émulateur).
const PORTS_EMU = (() => { try { const m = /^(\d{4,5}),(\d{4,5})$/.exec(localStorage.getItem("golems.emuPorts") || ""); if (m) return [+m[1], +m[2]]; } catch (e) {} return [9000, 9099]; })();
const firebaseConfig = EMULATEUR
  ? { apiKey: "demo-cle", authDomain: "demo-les-golems.firebaseapp.com", projectId: "demo-les-golems",
      databaseURL: `http://${HOTE_EMU}:${PORTS_EMU[0]}?ns=demo-les-golems-default-rtdb` }
  : configEnLigne;


const MAX_HISTO = 50;
// Préfixe de base : vide pour le site public, "essai/" pour le site d'essai (les-golems.github.io/essai/).
// Comptes Auth partagés ; pseudos, données, accueil et salons séparés.
export const PREFIXE = location.pathname.split("/")[1] === "essai" ? "essai/" : "";
export const P = PREFIXE;

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

// Accueil et pastille « en ligne » (firebase/salon.js), branchés par brancheSalon() : bascule() les arrête puis les relance.
let demarreHall, arreteHall, majEnligne, quitteEnligne;
export function brancheSalon(o) { ({ demarreHall, arreteHall, majEnligne, quitteEnligne } = o); }

export let auth = null, db = null;
// Ouverture (une seule initialisation Firebase), appelée en premier par ouvre() de firebase/salon.js.
export async function ouvreCompte() {
  const app = initializeApp(firebaseConfig);
  auth = getAuth(app);
  db = getDatabase(app);
  if (EMULATEUR) {
    connectAuthEmulator(auth, `http://${HOTE_EMU}:${PORTS_EMU[1]}`, { disableWarnings: true });
    connectDatabaseEmulator(db, HOTE_EMU, PORTS_EMU[0]);
  }
  // Un compte reste connecté (stockage local) ; un invité vit le temps de l'onglet.
  await auth.authStateReady();
  if (!auth.currentUser) { await setPersistence(auth, browserSessionPersistence); await signInAnonymously(auth); }
  moi = auth.currentUser.uid;
}
export const estCompte = () => !!auth.currentUser && !auth.currentUser.isAnonymous;
export let moi = null;
export let donnees = null;
let resumeur = null, cumuleur = null;        // copie de joueurs/{uid} pour un compte : donnees
const imageActive = () => !!donnees && !!donnees.avatarImg && (!donnees.avatarId || donnees.avatarId === "__img");
const ecouteCompte = [];
const signale = () => ecouteCompte.forEach(f => { try { f(); } catch (e) {} });

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
    decks: lisDecks(v.decks, v.ordreDecks),
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
export const compte = {
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
  // Stats publiques puis classement. Règle PAS_MAX (rules/00-communs.js) : n monte de 50 au plus par écriture ; un compte
  // de plus de 50 parties sans stats publiées monte donc par paliers de 50 (v suit, sans jamais dépasser la hausse de n).
  async ecritStats(v, n) {
    const chemin = ref(db, P + "joueurs/" + moi + "/stats");
    let a = null; try { a = (await get(chemin)).val(); } catch (e) {}
    if (!a || typeof a !== "object") { try { a = (await get(ref(db, P + "classement/" + moi))).val(); } catch (e) {} }
    let n0 = a && Number.isFinite(a.n) ? a.n : 0, v0 = a && Number.isFinite(a.v) ? a.v : 0, ok = true;
    if (n < n0 || v < v0 || v - v0 > n - n0) { n0 = 0; v0 = 0; } // valeur précédente incohérente : écriture directe (refusée si la règle l'exige)
    for (let i = 0; i < 2000; i++) {
      const n1 = Math.min(n, n0 + 50), v1 = Math.max(v0, v - (n - n1));
      try { await set(chemin, { v: v1, n: n1 }); } catch (e) { console.warn("stats", e); ok = false; break; }
      n0 = n1; v0 = v1; if (n1 >= n) break;
    }
    try { await set(ref(db, P + "classement/" + moi), { p: donnees.pseudo, v, n }); } catch (e) { if (ok) console.warn("classement", e); }
  },
  async publieStats(extra) {
    if (!compte.connecte()) return;
    await rattrape(extra);
    if (resumeur) { await compte.publieProfil(); return; }
    const h = donnees.historique, v = h.filter(x => x.res === "Victoire").length;
    await compte.ecritStats(v, h.length);
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
      await compte.ecritStats(r.v, r.n);
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
  // Decks (0.6a) : chaque écriture ne touche que ce qui change, deck par deck (ajout, suppression, champs modifiés),
  // puis l'ordre (ordreDecks) à part. Un ancien deck refusé par les règles (ex. 5 exemplaires) ne bloque plus le reste :
  // seule SA modification échoue. Échec : erreur avec refuses = noms des decks non enregistrés (la page affiche le bandeau) ;
  // decksBase reste l'état de la base, la prochaine écriture renvoie tout ce qui diffère encore.
  ecritDecks(l) { return ecritDecksEnFile(l); },
  // Historique : ajoute les entrées, puis purge au-delà des 50 plus récentes (liste et replays).
  // Les cumuls (profil, classement) comptent toutes les parties, même celles purgées aussitôt.
  async ajouteHisto(entrees) {
    if (!compte.connecte()) return;
    const maj = {}, ajoutes = [];
    // Trop long : on retire d'abord le bilan, puis le detail des manches, le rejeu en dernier, jamais en coupant le JSON.
    // En dernier recours, l'essentiel seulement (résultat, score, adversaire) : la partie compte toujours.
    const texte = texteHisto;
    const trop = [];
    // Classée : une seule entrée par graine. Une entrée reconstruite (rt, rattrapeHisto) cède la place à l'entrée complète.
    const grH = id => String(id).slice(0, String(id).lastIndexOf("-")), clH = y => !!y && (y.mode === "classee" || !!y.classe);
    entrees.forEach(x => { const t = x && x.id && texte(x); if (x && x.id && !t) trop.push(x.id); if (t && !donnees.historique.some(y => y.id === x.id)) {
      if (clH(x)) { const g = grH(x.id), m = donnees.historique.filter(y => y && clH(y) && grH(y.id) === g);
        if (m.some(y => !y.rt) || (x.rt && m.length)) return;
        m.forEach(y => { donnees.historique.splice(donnees.historique.indexOf(y), 1); maj[y.id] = null; }); }
      donnees.historique.push(x); ajoutes.push(x); maj[x.id] = { d: +x.date || Date.now(), x: t }; marqueClassee(maj[x.id], x); } });
    donnees.historique.sort((a, b) => b.date - a.date);
    donnees.historique.splice(MAX_HISTO).forEach(x => { maj[x.id] = null; });
    for (const k in maj) if (maj[k] && !donnees.historique.some(y => y.id === k)) delete maj[k];
    // Échec : les entrées sortent de la copie en mémoire, sinon le nouvel essai (même page) les croirait écrites.
    if (Object.keys(maj).length) {
      try { await update(ref(db, P + "joueurs/" + moi + "/historique"), maj); }
      catch (e) { ajoutes.forEach(x => { const i = donnees.historique.indexOf(x); if (i >= 0) donnees.historique.splice(i, 1); }); throw e; }
    }
    compte.publieStats(ajoutes);
    // Plus d'échec silencieux : la page affiche « Partie non enregistrée ».
    if (trop.length) throw Object.assign(new Error("historique trop long"), { code: "golems/trop-long" });
  },
  // 0.6a : nouvelle connexion forcée (écriture restée sans réponse, socket resté ouvert) : le SDK renvoie les écritures en attente.
  relance() { try { goOffline(db); goOnline(db); } catch (e) {} },
  // 0.6a : entrée d'historique d'une classée (graine gr) relue SUR LE SERVEUR : true si elle y est. Sert au rattrapage :
  // la copie en mémoire peut contenir une entrée dont l'écriture a été perdue (coupure, réponse jamais reçue).
  async aHistoServeur(gr) {
    if (!compte.connecte()) return true;
    const g = String(gr), v = (await get(query(ref(db, P + "joueurs/" + moi + "/historique"), orderByKey(), startAt(g + "-"), endAt(g + "-~")))).val() || {};
    return Object.keys(v).some(k => k.slice(0, k.lastIndexOf("-")) === g);
  },
  // 0.6a : (ré)écrit une entrée absente du serveur : la copie en mémoire de même graine (écriture perdue) est retirée d'abord.
  // Relu sur le serveur juste avant : jamais de doublon. Renvoie true si l'entrée a été écrite.
  async rattrapeHisto(x) {
    if (!compte.connecte() || !x || !x.id) return false;
    const g = String(x.id).slice(0, String(x.id).lastIndexOf("-"));
    if (await compte.aHistoServeur(g)) return false;
    donnees.historique = donnees.historique.filter(y => !(y && String(y.id).slice(0, String(y.id).lastIndexOf("-")) === g));
    await compte.ajouteHisto([x]); return donnees.historique.some(y => y.id === x.id);
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

// Chargement des données du compte à l'ouverture (échec : invité).
export async function chargeInitiale() {
  await chargeDonnees().catch(() => { donnees = null; });
}
