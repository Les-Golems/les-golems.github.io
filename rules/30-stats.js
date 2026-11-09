// Statistiques publiques : classement, profils, archive des parties.
// r = racine des données ("root" ou "root.child('essai')"), voir 00-communs.js.
const { COMPTE, MAINTENANT, pseudoReel } = require('./00-communs');

module.exports = r => ({
  // Classement public (onglet Statistiques, colonne Joueurs) : classement/{uid} = pseudo p, victoires v, parties n (toutes ses parties).
  // Lisible par tout connecté ; écrit par le seul compte propriétaire.
  "classement": {
    ".read": `${COMPTE}`,
    "$uid": {
      // Jamais effacé par le joueur. n et v = ceux de joueurs/{uid}/stats, écrits juste avant par le site (garde-fou là-bas).
      ".write": "auth != null && auth.uid === $uid && auth.token.firebase.sign_in_provider === 'password' && newData.exists()",
      ".validate": `newData.hasChildren(['p', 'v', 'n']) && newData.child('v').val() <= newData.child('n').val() && newData.child('n').val() === ${r}.child('joueurs').child($uid).child('stats').child('n').val() && newData.child('v').val() === ${r}.child('joueurs').child($uid).child('stats').child('v').val()`,
      // p = pseudo du compte.
      "p": { ".validate": `newData.isString() && ${pseudoReel(r, '$uid')}` },
      "v": { ".validate": "newData.isNumber() && newData.val() >= 0 && newData.val() % 1 === 0" },
      "n": { ".validate": "newData.isNumber() && newData.val() >= 0 && newData.val() <= 100000 && newData.val() % 1 === 0" },
      "$autre": { ".validate": false }
    }
  },

  // Résumé public du profil (mêmes chiffres que la fenêtre de compte, sur toutes les parties), publié par son propriétaire à la connexion et à chaque fin de partie.
  // m = profil privé : seuls p, m, n, v, d, t, cr sont alors acceptés. L'historique complet reste privé (joueurs/{uid}/historique).
  "profils": {
    ".read": `${COMPTE}`,
    "$uid": {
      // Jamais effacé par le joueur. n et v = ceux du classement (écrit juste avant) ; sans classement, 0 partie.
      ".write": "auth != null && auth.uid === $uid && auth.token.firebase.sign_in_provider === 'password' && newData.exists()",
      ".validate": `(${r}.child('classement').child($uid).exists() ? newData.child('n').val() === ${r}.child('classement').child($uid).child('n').val() && newData.child('v').val() === ${r}.child('classement').child($uid).child('v').val() : newData.child('n').val() === 0) && newData.hasChildren(['p', 'm', 'n', 'v', 'd', 't']) && newData.child('v').val() + newData.child('d').val() <= newData.child('n').val() && (newData.child('m').val() === false || !(newData.hasChild('s') || newData.hasChild('dk') || newData.hasChild('cb') || newData.hasChild('cm') || newData.hasChild('mv') || newData.hasChild('o') || newData.hasChild('jo') || newData.hasChild('pv')))`,
      "p":  { ".validate": `newData.isString() && ${pseudoReel(r, '$uid')}` },
      "m":  { ".validate": "newData.isBoolean()" },
      "t":  { ".validate": `${MAINTENANT}` },
      "cr": { ".validate": "newData.isNumber() && newData.val() >= 0" },
      // 0.6 : Elo classé affiché sur le profil = celui du profil classé, placement fini seulement (pas d'Elo exact pendant le placement).
      "el": { ".validate": `newData.isNumber() && newData.val() === ${r}.child('classe').child('joueurs').child($uid).child('elo').val() && ${r}.child('classe').child('joueurs').child($uid).child('parties').val() >= 5` },
      "n":  { ".validate": "newData.isNumber() && newData.val() >= 0 && newData.val() <= 100000 && newData.val() % 1 === 0" },
      "v":  { ".validate": "newData.isNumber() && newData.val() >= 0 && newData.val() <= 100000 && newData.val() % 1 === 0" },
      "d":  { ".validate": "newData.isNumber() && newData.val() >= 0 && newData.val() <= 100000 && newData.val() % 1 === 0" },
      "s":  { ".validate": "newData.isNumber() && newData.val() % 1 === 0 && newData.val() <= newData.parent().child('n').val() && newData.val() + newData.parent().child('n').val() >= 0" },
      // Meilleurs decks (3 au plus) : nom, éléments, parties, victoires, peu de parties.
      "dk": { "$i": { ".validate": "$i.matches(/^[0-2]$/) && newData.hasChildren(['nom', 'e', 'n', 'v'])", "nom": { ".validate": "newData.isString() && newData.val().length >= 1 && newData.val().length <= 24" }, "e": { ".validate": "newData.isString() && newData.val().matches(/^[a-z,]{0,40}$/)" }, "peu": { ".validate": "newData.isBoolean()" }, "n": { ".validate": "newData.isNumber() && newData.val() >= 0 && newData.val() % 1 === 0 && newData.val() <= newData.parent().parent().parent().child('n').val()" }, "v": { ".validate": "newData.isNumber() && newData.val() >= 0 && newData.val() % 1 === 0 && newData.val() <= newData.parent().child('n').val()" }, "$autre": { ".validate": false } } },
      // Meilleures cartes, cartes les moins bonnes, cartes MVP : code de carte, parties, victoires.
      "cb": { "$i": { ".validate": "$i.matches(/^[0-2]$/) && newData.hasChildren(['c', 'n', 'v'])", "c": { ".validate": "newData.isString() && newData.val().matches(/^[0-9]{3}e?$/)" }, "peu": { ".validate": "newData.isBoolean()" }, "n": { ".validate": "newData.isNumber() && newData.val() >= 0 && newData.val() % 1 === 0 && newData.val() <= newData.parent().parent().parent().child('n').val()" }, "v": { ".validate": "newData.isNumber() && newData.val() >= 0 && newData.val() % 1 === 0 && newData.val() <= newData.parent().child('n').val()" }, "$autre": { ".validate": false } } },
      "cm": { "$i": { ".validate": "$i.matches(/^[0-2]$/) && newData.hasChildren(['c', 'n', 'v'])", "c": { ".validate": "newData.isString() && newData.val().matches(/^[0-9]{3}e?$/)" }, "n": { ".validate": "newData.isNumber() && newData.val() >= 0 && newData.val() % 1 === 0 && newData.val() <= newData.parent().parent().parent().child('n').val()" }, "v": { ".validate": "newData.isNumber() && newData.val() >= 0 && newData.val() % 1 === 0 && newData.val() <= newData.parent().child('n').val()" }, "$autre": { ".validate": false } } },
      "mv": { "$i": { ".validate": "$i.matches(/^[0-2]$/) && newData.hasChildren(['c', 'n', 'v'])", "c": { ".validate": "newData.isString() && newData.val().matches(/^[0-9]{3}e?$/)" }, "n": { ".validate": "newData.isNumber() && newData.val() >= 0 && newData.val() % 1 === 0 && newData.val() <= newData.parent().parent().parent().child('n').val()" }, "v": { ".validate": "newData.isNumber() && newData.val() >= 0 && newData.val() % 1 === 0 && newData.val() <= newData.parent().child('n').val()" }, "$autre": { ".validate": false } } },
      // Contre l'ordinateur, par niveau.
      "o": {
        "$niv": { ".validate": "$niv.matches(/^(facile|normal|difficile)$/) && newData.hasChildren(['n', 'v'])", "n": { ".validate": "newData.isNumber() && newData.val() >= 0 && newData.val() % 1 === 0 && newData.val() <= newData.parent().parent().parent().child('n').val()" }, "v": { ".validate": "newData.isNumber() && newData.val() >= 0 && newData.val() % 1 === 0 && newData.val() <= newData.parent().child('n').val()" }, "$autre": { ".validate": false } }
      },
      // Joueurs les plus affrontés (3 au plus) : pseudo, parties, victoires.
      "jo": { "$i": { ".validate": "$i.matches(/^[0-2]$/) && newData.hasChildren(['p', 'n', 'v'])", "p": { ".validate": "newData.isString() && newData.val().length >= 1 && newData.val().length <= 20" }, "n": { ".validate": "newData.isNumber() && newData.val() >= 0 && newData.val() % 1 === 0 && newData.val() <= newData.parent().parent().parent().child('n').val()" }, "v": { ".validate": "newData.isNumber() && newData.val() >= 0 && newData.val() % 1 === 0 && newData.val() <= newData.parent().child('n').val()" }, "$autre": { ".validate": false } } },
      // Détail par version du site (0.2a, 0.2b...) pour le filtre Patch du panneau Joueurs : 10 versions au plus (emplacements 0 à 9),
      // chacune avec son nom p, ses parties n, ses victoires v et le detail contre l'ordinateur o (comme ci-dessus).
      "pv": { ".validate": "newData.hasChildren()", "$i": { ".validate": "$i.matches(/^[0-9]$/) && newData.hasChildren(['p', 'n', 'v'])", "p": { ".validate": "newData.isString() && newData.val().matches(/^[0-9a-z.]{1,12}$/)" }, "n": { ".validate": "newData.isNumber() && newData.val() >= 0 && newData.val() % 1 === 0 && newData.val() <= newData.parent().parent().parent().child('n').val()" }, "v": { ".validate": "newData.isNumber() && newData.val() >= 0 && newData.val() % 1 === 0 && newData.val() <= newData.parent().child('n').val()" }, "o": { "$niv": { ".validate": "$niv.matches(/^(facile|normal|difficile)$/) && newData.hasChildren(['n', 'v'])", "n": { ".validate": "newData.isNumber() && newData.val() >= 0 && newData.val() % 1 === 0 && newData.val() <= newData.parent().parent().parent().child('n').val()" }, "v": { ".validate": "newData.isNumber() && newData.val() >= 0 && newData.val() % 1 === 0 && newData.val() <= newData.parent().child('n').val()" }, "$autre": { ".validate": false } } }, "$autre": { ".validate": false } } },
      "$autre": { ".validate": false }
    }
  },

  // Archive commune des parties (onglet Statistiques) : resume/{graine-debut}, anonyme (ni pseudo ni uid).
  // Lecture par tout connecté ; écriture par un compte seulement, ajout seulement (jamais modifié ni effacé).
  "resume": {
    ".read": `${COMPTE}`,
    ".indexOn": ["d"],
    "$id": {
      ".write": `${COMPTE} && !data.exists() && newData.exists()`,
      ".validate": "$id.matches(/^-?[0-9]{1,12}-[0-9]{13}$/) && newData.hasChildren(['d', 'v', 'm', 'g', 'pg', 'a', 'k0', 'k1', 'e0', 'e1', 's0', 's1', 'mvp', 't'])",
      "d":   { ".validate": `${MAINTENANT}` },
      "v":   { ".validate": "newData.isString() && newData.val().matches(/^[0-9a-z.]{1,12}$/)" },
      "m":   { ".validate": "newData.isString() && newData.val().matches(/^(golem-[a-z]{1,12}|ligne)$/)" },
      "g":   { ".validate": "newData.isNumber() && (newData.val() === 0 || newData.val() === 1 || newData.val() === -1)" },
      "pg":  { ".validate": "newData.isBoolean()" },
      "a":   { ".validate": "newData.isBoolean()" },
      "k0":  { ".validate": "newData.isString() && newData.val().length <= 300 && newData.val().matches(/^([0-9]{3}e?[1-3])*$/)" },
      "k1":  { ".validate": "newData.isString() && newData.val().length <= 300 && newData.val().matches(/^([0-9]{3}e?[1-3])*$/)" },
      "e0":  { ".validate": "newData.isString() && newData.val().matches(/^[a-z,]{0,60}$/)" },
      "e1":  { ".validate": "newData.isString() && newData.val().matches(/^[a-z,]{0,60}$/)" },
      "s0":  { ".validate": "newData.isNumber() && newData.val() >= 0 && newData.val() <= 30" },
      "s1":  { ".validate": "newData.isNumber() && newData.val() >= 0 && newData.val() <= 30" },
      "mvp": { ".validate": "newData.isString() && newData.val().length <= 40" },
      "dr":  { ".validate": "newData.hasChildren()",
        "002":  { ".validate": "newData.hasChildren()", "$i": { ".validate": "$i.matches(/^([0-9]|[12][0-9])$/) && newData.isNumber() && newData.val() >= 1 && newData.val() <= 12 && newData.val() % 1 === 0" } },
        "002e": { ".validate": "newData.hasChildren()", "$i": { ".validate": "$i.matches(/^([0-9]|[12][0-9])$/) && newData.isNumber() && newData.val() >= 1 && newData.val() <= 12 && newData.val() % 1 === 0" } },
        "$autre": { ".validate": false } },
      "t": {
        "$k": {
          ".validate": "$k.matches(/^[0-2]$/) && newData.hasChildren(['n', 'r', 'q'])",
          "n": { ".validate": "newData.isString() && newData.val().length >= 1 && newData.val().length <= 40" },
          "r": { ".validate": "newData.isString() && newData.val().matches(/^[01=-]{1,3}$/)" },
          "q": { ".validate": "newData.isNumber() && newData.val() >= 0 && newData.val() <= 20" },
          "$autre": { ".validate": false }
        }
      },
      "$autre": { ".validate": false }
    }
  }
});
