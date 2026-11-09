// Guides (votes, lien de partage) et pastille « N en ligne » du bandeau (0.6).
// r = racine des données ("root" ou "root.child('essai')"), voir 00-communs.js.
const { COMPTE, MAINTENANT } = require('./00-communs');

module.exports = r => ({
  // Votes des guides : guides/<id du guide>/votes/<uid> = 1 (pour) ou -1 (contre), un seul vote par compte,
  // changé ou retiré par son seul auteur. Lecture libre : le lien partagé (Comment jouer > Guides) s'ouvre aussi en invité.
  "guides": {
    ".read": true,
    "$g": {
      ".validate": "$g.matches(/^[a-z0-9-]{1,40}$/)",
      "votes": {
        "$uid": {
          ".write": `${COMPTE} && auth.uid === $uid`,
          ".validate": "newData.isNumber() && (newData.val() === 1 || newData.val() === -1)"
        }
      },
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
