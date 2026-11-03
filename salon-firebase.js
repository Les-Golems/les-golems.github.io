// Salon en ligne sur Firebase Realtime Database + connexion anonyme.
// Remplace la capacité « room » de l'artifact Claude avec la même interface
// (presence, peers, onPeers, onConnection, connected, join, leave), pour que
// index.html reste inchangé hors de son point d'entrée.
//
// Arborescence :
//   hall/{uid}                  présence dans l'accueil (pseudo, salon, quitte)
//   salons/{code}/joueurs/{uid} présence dans le salon (pseudo, arrivee, sid, pret,
//                               graine, jg, adv, veut, quitte), effacée par onDisconnect
//   salons/{code}/coups/{push}  journal : un coup par entrée, jamais modifié
//                               { a: uid auteur, s: sid, g: graine, n: rang, c: code du coup }
// Le champ « j » (journal complet) de l'ancienne présence n'est jamais stocké :
// il est découpé en coups ajoutés par push, puis reconstruit à la lecture.
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import { getAuth, signInAnonymously, setPersistence, browserSessionPersistence } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import { getDatabase, ref, onValue, update, remove, push, set, onDisconnect, serverTimestamp, get, query, orderByChild, equalTo } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-database.js";
import { firebaseConfig } from "./firebase-config.js";

const CHAMPS_HALL = ["pseudo", "salon", "quitte"];
const CHAMPS_SALON = ["pseudo", "arrivee", "sid", "pret", "graine", "jg", "adv", "veut", "quitte"];

function filtre(p, champs) {
  const o = {};
  for (const k of champs) if (k in p) o[k] = p[k] === undefined ? null : p[k];
  return o;
}

async function ouvre() {
  const app = initializeApp(firebaseConfig);
  const auth = getAuth(app);
  // Session par onglet : deux onglets du même navigateur = deux joueurs ; un rechargement garde l'uid.
  await setPersistence(auth, browserSessionPersistence);
  const moi = auth.currentUser ? auth.currentUser.uid : (await signInAnonymously(auth)).user.uid;
  const db = getDatabase(app);

  let enLigne = false;
  const ecouteCo = [];
  onValue(ref(db, ".info/connected"), s => { enLigne = s.val() === true; ecouteCo.forEach(f => f()); });

  // Accueil
  const hallRef = ref(db, "hall/" + moi);
  let hallPres = {}, hallPeers = [], hallPerdu = [], hallErreur = false;
  const ecouteHall = [];
  onDisconnect(hallRef).remove();
  onValue(ref(db, "hall"), s => {
    const v = s.val() || {};
    hallPeers = Object.keys(v).map(u => pair(u, v[u]));
    ecouteHall.forEach(f => f());
  }, () => { hallErreur = true; hallPerdu.forEach(f => f()); });
  // Après une reconnexion, la présence effacée par onDisconnect est réécrite.
  ecouteCo.push(() => { if (enLigne) { onDisconnect(hallRef).remove(); ecritHall(); } });

  function pair(u, p) {
    p = p || {};
    const { t, ...presence } = p;
    return { peer: u, kind: "viewer", sameTab: u === moi, presence, updatedAt: +t || 0 };
  }
  function ecritHall() {
    return update(hallRef, { ...hallPres, t: serverTimestamp() });
  }

  async function join(code) {
    if (!/^[a-z0-9]{3,8}$/.test(code)) throw new Error("code");
    const base = "salons/" + code;
    const moiRef = ref(db, base + "/joueurs/" + moi);
    let pres = {}, joueurs = {}, coups = {}, fini = false;
    const ecoute = [], perdu = [], stop = [];
    const pousses = {}; // "sid|graine" -> nombre de coups déjà envoyés

    // Coups déjà envoyés par cet uid (reprise après rechargement).
    const deja = await get(query(ref(db, base + "/coups"), orderByChild("a"), equalTo(moi)));
    const v0 = deja.val() || {};
    for (const k in v0) { const c = v0[k], cle = c.s + "|" + c.g; pousses[cle] = Math.max(pousses[cle] || 0, c.n + 1); }

    const notifie = () => { if (!fini) ecoute.forEach(f => f()); };
    const erreur = () => { if (!fini) perdu.forEach(f => f()); };
    stop.push(onValue(ref(db, base + "/joueurs"), s => { joueurs = s.val() || {}; notifie(); }, erreur));
    stop.push(onValue(ref(db, base + "/coups"), s => { coups = s.val() || {}; notifie(); }, erreur));

    function journal(sid, g) {
      const l = [];
      for (const k in coups) { const c = coups[k]; if (c.s === sid && c.g === g) l[c.n] = c.c; }
      const sortie = [];
      for (let i = 0; i < l.length && l[i] !== undefined; i++) sortie.push(l[i]);
      return window.GolemsMoteur.ecritJournal(sortie);
    }
    async function envoieJournal(j) {
      const sid = pres.sid, g = pres.jg;
      if (typeof j !== "string" || typeof sid !== "string" || !Number.isInteger(g)) return;
      const liste = window.GolemsMoteur.litJournal(j), cle = sid + "|" + g;
      for (let n = pousses[cle] || 0; n < liste.length; n++) {
        await set(push(ref(db, base + "/coups")), { a: moi, s: sid, g: g, n: n, c: liste[n] });
        pousses[cle] = n + 1;
      }
    }
    function ecrit() { return update(moiRef, { ...pres, t: serverTimestamp() }); }
    const reco = () => { if (enLigne && !fini) { onDisconnect(moiRef).remove(); ecrit().catch(() => {}); } };
    ecouteCo.push(reco);

    await onDisconnect(moiRef).remove();
    const salon = {
      peers() {
        return Object.keys(joueurs).map(u => {
          const q = pair(u, joueurs[u]);
          if (Number.isInteger(q.presence.jg) && typeof q.presence.sid === "string") q.presence.j = journal(q.presence.sid, q.presence.jg);
          return q;
        });
      },
      onPeers(f, g) { ecoute.push(f); if (g) perdu.push(g); },
      async presence(p) {
        const { j, ...reste } = p;
        Object.assign(pres, filtre(reste, CHAMPS_SALON));
        for (const k in pres) if (pres[k] === null) delete pres[k];
        // null efface le champ côté base
        const maj = { ...filtre(reste, CHAMPS_SALON), t: serverTimestamp() };
        await update(moiRef, maj);
        if (j !== undefined && j !== null) await envoieJournal(j);
      },
      async leave() {
        fini = true;
        stop.forEach(f => f());
        const i = ecouteCo.indexOf(reco); if (i >= 0) ecouteCo.splice(i, 1);
        await onDisconnect(moiRef).cancel();
        await remove(moiRef);
      }
    };
    return salon;
  }

  return {
    connected: () => enLigne,
    peers: () => hallPeers,
    onPeers(f, g) { ecouteHall.push(f); if (g) { hallPerdu.push(g); if (hallErreur) setTimeout(g, 0); } },
    onConnection(f, g) { ecouteCo.push(f); },
    async presence(p) {
      Object.assign(hallPres, filtre(p, CHAMPS_HALL));
      for (const k in hallPres) if (hallPres[k] === null) delete hallPres[k];
      await update(hallRef, { ...filtre(p, CHAMPS_HALL), t: serverTimestamp() });
    },
    join
  };
}

// index.html attend window.golemsSalon (promesse posée avant son script principal).
ouvre().then(r => window.__golemsSalonPret(r), e => { console.warn("Salon indisponible", e); window.__golemsSalonPret(null); });
