// Données des comptes des Golems (Firebase) : decks à emplacement fixe (lisDecks, ecritDecks) et écritures sûres sous coupures
// (ajoute, ecritPlusieurs). Découpé de salon-firebase.js (lot E de l'audit 0.6a) : code déplacé sans changement.
import { ref, update, remove, set, get, runTransaction } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-database.js";
import { compte, donnees, moi, db, P } from "./compte.js";

const MAX_DECKS = 12;

// Écritures « ajout seulement » (règles !data.exists()) : un set déjà appliqué dont la réponse se perd dans une coupure
// est renvoyé par le SDK à la reconnexion, et la règle le refuse alors que la valeur est écrite. D'où une transaction
// qui n'écrit que si la valeur est absente (rejouée sur la valeur du serveur), relancée après une coupure (« disconnect ») :
// elle attend la reconnexion puis relit le serveur. Rend le résultat (committed, snapshot = valeur du serveur sinon).
export async function ajoute(r, val) {
  for (let k = 0; ; k++) {
    try { return await runTransaction(r, v => v === null ? val : undefined, { applyLocally: false }); }
    catch (e) { if (k >= 2 || !/disconnect/.test(String(e && e.message))) throw e; }
  }
}
// Écriture multi-chemins (atomique, pas de transaction possible sur plusieurs chemins) : même renvoi refusé après une coupure.
// Refus : chaque chemin relu sur le serveur ; tous égaux à ce qui était envoyé (heure serveur = un nombre) = écriture déjà appliquée.
function pareil(a, b) {
  if (b && typeof b === "object" && b[".sv"] === "timestamp") return typeof a === "number";
  if (b === null || b === undefined) return a === null || a === undefined;
  if (typeof b !== "object") return a === b;
  if (!a || typeof a !== "object") return false;
  const kb = Object.keys(b).filter(k => b[k] !== null && b[k] !== undefined);
  return kb.every(k => pareil(a[k], b[k])) && Object.keys(a).every(k => kb.includes(k));
}
export async function ecritPlusieurs(maj) {
  try { await update(ref(db), maj); }
  catch (e) {
    if (!/permission/i.test(String(e && (e.code || e.message)))) throw e;
    const ok = (await Promise.all(Object.keys(maj).map(async c => pareil((await get(ref(db, c))).val(), maj[c])))).every(Boolean);
    if (!ok) throw e;
  }
}

// Données du compte
// 0.6a : decks à emplacement fixe (decks/<i> ne bouge plus) et ordre d'affichage à part (ordreDecks = ids séparés par des virgules).
// decksBase = ce que la base contient (id -> { s: emplacement, o: deck normalisé }), sert à n'écrire que ce qui change.
let decksBase = new Map(), ordreBase = "", fileDecks = Promise.resolve();
const normeDeck = d => {
  const c = {}; for (const k in d.cartes || {}) if (+d.cartes[k] > 0) c[k] = +d.cartes[k];
  const o = { id: String(d.id), nom: String(d.nom || "").slice(0, 24) || "Deck", cartes: c };
  if (typeof d.v === "string" && /^[0-9a-z.]{1,10}$/.test(d.v)) o.v = d.v;
  return o;
};
export function lisDecks(brut, ordre) {
  decksBase = new Map(); ordreBase = typeof ordre === "string" ? ordre : "";
  const l = [];
  for (const k of Object.keys(brut || {})) {
    const d = brut[k]; if (!d || typeof d !== "object" || typeof d.id !== "string" || decksBase.has(d.id)) continue;
    const x = { id: d.id, nom: d.nom, cartes: d.cartes || {}, t: d.t || 0, ...(d.v ? { v: d.v } : {}) };
    decksBase.set(d.id, { s: +k, o: normeDeck(x) }); l.push(x);
  }
  const rang = new Map(ordreBase.split(",").filter(Boolean).map((id, i) => [id, i]));
  l.sort((a, b) => (rang.has(a.id) ? rang.get(a.id) : 99 + decksBase.get(a.id).s) - (rang.has(b.id) ? rang.get(b.id) : 99 + decksBase.get(b.id).s));
  return l;
}
async function ecritDecksFile(l0) {
  if (!compte.connecte()) return;
  const l = l0.slice(0, MAX_DECKS); donnees.decks = l;
  const rac = P + "joueurs/" + moi + "/decks/", ids = new Set(l.map(d => String(d.id))), refuses = [];
  let erreur = null;
  const essaie = async (nom, f) => { try { await f(); } catch (e) { console.warn("decks", nom, e); erreur = erreur || e; refuses.push(nom); } };
  for (const [id, b] of [...decksBase]) if (!ids.has(id)) await essaie(b.o.nom, async () => { await remove(ref(db, rac + b.s)); decksBase.delete(id); });
  for (const d of l) {
    const n = normeDeck(d), b = decksBase.get(n.id);
    if (!b) {
      const pris = new Set([...decksBase.values()].map(x => x.s));
      let s = 0; while (pris.has(s)) s++;
      if (s >= MAX_DECKS) { refuses.push(n.nom); erreur = erreur || new Error("emplacements pleins"); continue; }
      await essaie(n.nom, async () => { await set(ref(db, rac + s), { ...n, t: Date.now() }); decksBase.set(n.id, { s, o: n }); });
      continue;
    }
    const maj = {};
    if (n.nom !== b.o.nom) maj.nom = n.nom;
    if ((n.v || null) !== (b.o.v || null)) maj.v = n.v || null;
    for (const k of new Set([...Object.keys(n.cartes), ...Object.keys(b.o.cartes)])) if (n.cartes[k] !== b.o.cartes[k]) maj["cartes/" + k] = n.cartes[k] || null;
    if (!Object.keys(maj).length) continue;
    maj.t = Date.now();
    await essaie(n.nom, async () => { await update(ref(db, rac + b.s), maj); b.o = n; });
  }
  const ordre = l.map(d => String(d.id)).filter(id => decksBase.has(id)).join(",");
  if (ordre !== ordreBase) await essaie("ordre", async () => { await set(ref(db, P + "joueurs/" + moi + "/ordreDecks"), ordre || null); ordreBase = ordre; });
  if (erreur) throw Object.assign(new Error("decks non enregistrés"), { code: erreur.code || "", refuses });
}
  // Decks (0.6a) : chaque écriture ne touche que ce qui change, deck par deck (ajout, suppression, champs modifiés),
  // puis l'ordre (ordreDecks) à part. Un ancien deck refusé par les règles (ex. 5 exemplaires) ne bloque plus le reste :
  // seule SA modification échoue. Échec : erreur avec refuses = noms des decks non enregistrés (la page affiche le bandeau) ;
  // decksBase reste l'état de la base, la prochaine écriture renvoie tout ce qui diffère encore.
export function ecritDecks(l) {
    const p = fileDecks.then(() => ecritDecksFile(l));
    fileDecks = p.catch(() => {});
    return p;
}
