// Guides (votes, guides publiés par les joueurs, lien de partage) et pastille « N en ligne » du bandeau (0.6).
// r = racine des données ("root" ou "root.child('essai')"), voir 00-communs.js.
const { COMPTE, MAINTENANT, UID_ROMAIN, racineApres } = require('./00-communs');
const fs = require('fs'), path = require('path'), vm = require('vm');

// Guides écrits dans le code (liste GUIDES d'onglets/guides.js, source unique) : id (sinon yt, sinon 'g'+rang) et pseudo de
// l'auteur en minuscules (vide pour un guide officiel : Romain seul le modifie).
function guidesCode() {
  const s = fs.readFileSync(path.join(__dirname, '..', 'onglets', 'guides.js'), 'utf8');
  const m = /const GUIDES=(\[[\s\S]*?\r?\n\]);/.exec(s);
  if (!m) throw new Error('Liste GUIDES introuvable dans onglets/guides.js');
  const L = vm.runInNewContext('(' + m[1] + ')');
  const G = L.map((g, i) => ({ id: g.id || g.yt || ('g' + i), auteur: g.officiel ? '' : String(g.auteur || '').toLowerCase() }));
  if (!G.length || G.some(x => !/^[A-Za-z0-9_-]{1,40}$/.test(x.id) || !/^[a-z0-9 _-]{0,20}$/.test(x.auteur))) throw new Error('Guide du code invalide');
  return G;
}
const G = guidesCode();
const ROMAIN = `(auth != null && auth.uid === '${UID_ROMAIN}')`;
// $g est un guide du code.
const DU_CODE = '(' + G.map(x => `$g === '${x.id}'`).join(' || ') + ')';
// Le compte connecté est l'auteur d'un guide du code, reconnu par son pseudo (pseudos/<pseudo minuscule>).
const AUTEUR_CODE = r => '(' + (G.filter(x => x.auteur).map(x => `($g === '${x.id}' && auth.uid === ${r}.child('pseudos').child('${x.auteur}').val())`).join(' || ') || 'false') + ')';
// Auteur d'un guide publié (fiche.u).
const AUTEUR_FICHE = "data.child('fiche').child('u').val() === auth.uid";
// Fenêtre du compteur de publications (24 h) et maximum par fenêtre.
const JOUR = '86400000', MAX_JOUR = 10;

module.exports = r => ({
  // guides/<id> : votes (tous les guides), fiche (guide publié par un joueur, ou modification d'un guide du code), sup (guide du code retiré).
  //   votes/<uid> = 1 (pour) ou -1 (contre), un seul vote par compte, changé ou retiré par son seul auteur.
  //   fiche = { u: uid de l'auteur, p: son pseudo, ty: 'v' | 't', ti: titre (3-80), yt: identifiant YouTube (11 caractères, vidéo),
  //             tx: texte (1-4000, obligatoire pour un texte), d1: code du deck (GOL1-/GOL2-), d2: 2e version facultative, v: version des decks (étiquette),
  //             t: heure de publication (serveur, jamais changée), m: heure de la dernière modification (serveur) }.
  //   Publication sans relecture (décision de Romain, 10 nov.) : compte obligatoire, 10 publications par 24 h et par compte
  //   (compteurGuides/<uid>, écrit dans la même écriture). Modification et suppression : l'auteur (u, ou le pseudo d'un guide
  //   du code) et Romain. Lecture libre : le lien partagé s'ouvre aussi en invité.
  "guides": {
    ".read": true,
    "$g": {
      // Suppression d'un guide publié (fiche et votes) : son auteur ou Romain ; un guide du code se retire par sup.
      ".write": `!newData.exists() && !${DU_CODE} && data.child('fiche').exists() && ((${COMPTE} && ${AUTEUR_FICHE}) || ${ROMAIN})`,
      ".validate": `$g.matches(/^[A-Za-z0-9_-]{1,40}$/) && (${DU_CODE} || newData.child('fiche').exists())`,
      "votes": {
        "$uid": {
          ".write": `${COMPTE} && auth.uid === $uid && (${DU_CODE} || ${r}.child('guides').child($g).child('fiche').exists())`,
          ".validate": "newData.isNumber() && (newData.val() === 1 || newData.val() === -1)"
        }
      },
      "fiche": {
        // Création d'un nouveau guide (compteur du jour écrit dans la même écriture), première modification d'un guide du code
        // par son auteur, modification par l'auteur ; Romain partout. Jamais effacée seule (suppression : guides/<id> entier).
        ".write": `newData.exists() && (${ROMAIN} || (${COMPTE} && newData.child('u').val() === auth.uid && (` +
          `(!data.exists() && !${DU_CODE} && ${racineApres(3)}.child('compteurGuides').child(auth.uid).child('t').val() === now)` +
          ` || (data.exists() && data.child('u').val() === auth.uid)` +
          ` || (${DU_CODE} && ${AUTEUR_CODE(r)}))))`,
        ".validate": "newData.hasChildren(['u', 'p', 'ty', 'ti', 'd1', 't', 'm']) && (newData.child('ty').val() === 'v' ? newData.hasChild('yt') : newData.hasChild('tx'))",
        // L'auteur ne change jamais (sauf par Romain, qui peut publier au nom de l'auteur d'un guide du code).
        "u": { ".validate": `newData.isString() && (!data.exists() || newData.val() === data.val() || ${ROMAIN})` },
        "p": { ".validate": `newData.val() === ${r}.child('joueurs').child(newData.parent().child('u').val()).child('pseudo').val()` },
        "ty": { ".validate": "newData.val() === 'v' || newData.val() === 't'" },
        "ti": { ".validate": "newData.isString() && newData.val().length >= 3 && newData.val().length <= 80" },
        "yt": { ".validate": "newData.isString() && newData.val().matches(/^[A-Za-z0-9_-]{11}$/)" },
        "tx": { ".validate": "newData.isString() && newData.val().length >= 1 && newData.val().length <= 4000" },
        "d1": { ".validate": "newData.isString() && newData.val().matches(/^GOL[12]-[A-Za-z0-9_-]{4,200}$/)" },
        "d2": { ".validate": "newData.isString() && newData.val().matches(/^GOL[12]-[A-Za-z0-9_-]{4,200}$/)" },
        "v": { ".validate": "newData.isString() && newData.val().matches(/^[0-9][0-9a-z.]{0,9}$/)" },
        "t": { ".validate": `newData.isNumber() && (data.exists() ? newData.val() === data.val() : ${MAINTENANT})` },
        "m": { ".validate": MAINTENANT },
        "$autre": { ".validate": false }
      },
      // Guide du code retiré du site : son auteur (pseudo) ou Romain.
      "sup": {
        ".write": `${DU_CODE} && (${ROMAIN} || (${COMPTE} && ${AUTEUR_CODE(r)}))`,
        ".validate": "newData.val() === true"
      },
      "$autre": { ".validate": false }
    }
  },

  // Compteur des publications de guides : compteurGuides/<uid> = { d: début de la fenêtre de 24 h, n: guides publiés depuis, t: heure de l'écriture }.
  // Écrit par le compte pour lui seul, dans la même écriture que la fiche du nouveau guide ; 10 au plus par fenêtre.
  "compteurGuides": {
    "$uid": {
      ".read": "auth != null && auth.uid === $uid",
      ".write": `${COMPTE} && auth.uid === $uid && newData.exists()`,
      ".validate": `newData.hasChildren(['d', 'n', 't']) && newData.child('t').val() === now && ((!data.exists() || now - data.child('d').val() >= ${JOUR}) ? (newData.child('d').val() === now && newData.child('n').val() === 1) : (newData.child('d').val() === data.child('d').val() && newData.child('n').val() === data.child('n').val() + 1 && newData.child('n').val() <= ${MAX_JOUR}))`,
      "$autre": { ".validate": "$autre === 'd' || $autre === 'n' || $autre === 't'" }
    }
  },

  // Propositions de guides (relecture par l'équipe, avant le 10 nov.) : plus écrites ; les anciennes sont lues et effacées par Romain seul.
  "propositionsGuides": {
    ".read": ROMAIN,
    "$id": {
      ".write": `${ROMAIN} && !newData.exists()`
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
