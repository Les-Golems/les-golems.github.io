// Guides (votes, lien de partage) et pastille « N en ligne » du bandeau (0.6).
// r = racine des données ("root" ou "root.child('essai')"), voir 00-communs.js.
const { COMPTE, MAINTENANT, UID_ROMAIN, pseudoReel } = require('./00-communs');
const fs = require('fs'), path = require('path'), vm = require('vm');

// 0.6 : identifiants des guides, lus dans la liste GUIDES d'onglets/guides.js (source unique) : id, sinon yt, sinon 'g'+rang.
function idsGuides() {
  const s = fs.readFileSync(path.join(__dirname, '..', 'onglets', 'guides.js'), 'utf8');
  const m = /const GUIDES=(\[[\s\S]*?\r?\n\]);/.exec(s);
  if (!m) throw new Error('Liste GUIDES introuvable dans onglets/guides.js');
  const L = vm.runInNewContext('(' + m[1] + ')');
  const ids = L.map((g, i) => g.id || g.yt || ('g' + i));
  if (!ids.length || ids.some(x => !/^[A-Za-z0-9_-]{1,40}$/.test(x))) throw new Error('Identifiant de guide invalide');
  return ids;
}
const ID_GUIDE = '(' + idsGuides().map(x => `$g === '${x}'`).join(' || ') + ')';

module.exports = r => ({
  // Votes des guides : guides/<id du guide>/votes/<uid> = 1 (pour) ou -1 (contre), un seul vote par compte,
  // changé ou retiré par son seul auteur. Lecture libre : le lien partagé (Comment jouer > Guides) s'ouvre aussi en invité.
  "guides": {
    ".read": true,
    "$g": {
      // 0.6 : seuls les guides de la liste GUIDES (onglets/guides.js) reçoivent des votes.
      ".validate": ID_GUIDE,
      "votes": {
        "$uid": {
          ".write": `${COMPTE} && auth.uid === $uid && ${ID_GUIDE}`,
          ".validate": "newData.isNumber() && (newData.val() === 1 || newData.val() === -1)"
        }
      },
      "$autre": { ".validate": false }
    }
  },

  // 0.6 : propositions de guides (fenêtre « Proposer un guide », maquette 31Guides B3) : propositionsGuides/<clé push> =
  // { u: uid de l'auteur, p: son pseudo, ty: 'v' (vidéo) ou 't' (texte), ti: titre, yt: identifiant YouTube (vidéo),
  //   tx: texte (obligatoire pour un texte, facultatif pour une vidéo), d1: code du deck (GOL1-/GOL2-), d2: 2e version facultative, t: heure serveur }.
  // Créée par un compte pour lui seul, jamais modifiée ; lue et effacée par Romain seul (relecture).
  "propositionsGuides": {
    ".read": `auth != null && auth.uid === '${UID_ROMAIN}'`,
    "$id": {
      ".write": `(${COMPTE} && !data.exists() && newData.child('u').val() === auth.uid) || (auth != null && auth.uid === '${UID_ROMAIN}' && !newData.exists())`,
      ".validate": "newData.hasChildren(['u', 'p', 'ty', 'ti', 'd1', 't']) && (newData.child('ty').val() === 'v' ? newData.hasChild('yt') : newData.hasChild('tx'))",
      "u": { ".validate": "newData.isString()" },
      "p": { ".validate": pseudoReel(r, 'auth.uid') },
      "ty": { ".validate": "newData.val() === 'v' || newData.val() === 't'" },
      "ti": { ".validate": "newData.isString() && newData.val().length >= 3 && newData.val().length <= 80" },
      "yt": { ".validate": "newData.isString() && newData.val().matches(/^[A-Za-z0-9_-]{11}$/)" },
      "tx": { ".validate": "newData.isString() && newData.val().length >= 1 && newData.val().length <= 4000" },
      "d1": { ".validate": "newData.isString() && newData.val().matches(/^GOL[12]-[A-Za-z0-9_-]{4,200}$/)" },
      "d2": { ".validate": "newData.isString() && newData.val().matches(/^GOL[12]-[A-Za-z0-9_-]{4,200}$/)" },
      "t": { ".validate": MAINTENANT },
      "$autre": { ".validate": false }
    }
  },

  // Pastille « N en ligne » : enligne/<uid> = heure serveur, posée par chaque visiteur (invités compris) pour lui seul,
  // effacée à sa déconnexion. Lecture par tout visiteur connecté (compte ou invité).
  "enligne": {
    ".read": "auth != null",
    "$uid": {
      ".write": "auth != null && auth.uid === $uid",
      ".validate": MAINTENANT
    }
  }
});
