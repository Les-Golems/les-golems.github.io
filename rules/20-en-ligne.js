// Jeu en ligne : accueil, activité des salons, annonces, salons.
// r = racine des données ("root" ou "root.child('essai')"), voir 00-communs.js.
const { COMPTE, MAINTENANT, CODE, SEPT_JOURS, pseudoReel } = require('./00-communs');
const { aujourdhui } = require('./50-classe');

module.exports = r => ({
  // Accueil : qui est connecté, et départs volontaires (quitte). Comptes seulement.
  "hall": {
    ".read": `${COMPTE}`,
    "$uid": {
      // Chacun n'écrit que sa propre présence, avec son vrai pseudo.
      ".write": "auth != null && auth.uid === $uid && auth.token.firebase.sign_in_provider === 'password'",
      ".validate": "newData.hasChild('t')",
      "pseudo": { ".validate": `newData.isString() && ${pseudoReel(r, '$uid')}` },
      "salon":  { ".validate": `newData.isString() && newData.val().matches(${CODE})` },
      "quitte": { ".validate": "newData.isNumber()" },
      "t":      { ".validate": `${MAINTENANT}` },
      // Aucun autre champ.
      "$autre": { ".validate": false }
    }
  },

  // Dernière activité d'un salon : activite/{code} = heure serveur, posée par un joueur présent.
  // Lecture seulement par la requête du nettoyage (tri par valeur, 50 au plus) ; effacement seulement si plus de 7 jours.
  "activite": {
    ".read": `${COMPTE} && query.orderByValue == true && query.limitToFirst <= 50`,
    ".indexOn": ".value",
    "$code": {
      // pres/<uid> aussi (écrit par ce seul uid, gardé à c:false par le serveur à la coupure) : le renvoi par le SDK, après une coupure,
      // d'un set envoyé juste avant arrive quand joueurs/<uid> est déjà effacé ; il n'est plus refusé.
      ".write": `${COMPTE} && ((newData.exists() && (${r}.child('salons').child($code).child('joueurs').hasChild(auth.uid) || ${r}.child('salons').child($code).child('pres').hasChild(auth.uid))) || (!newData.exists() && data.val() < now - ${SEPT_JOURS}))`,
      ".validate": `$code.matches(${CODE}) && ${MAINTENANT}`
    }
  },

  // Salons publics en attente d'un adversaire : annonce posée par le créateur présent dans son salon (u = son uid),
  // retirée par lui ou par un joueur présent dans le salon ; effacée à sa déconnexion.
  "annonces": {
    ".read": `${COMPTE}`,
    "$code": {
      ".write": `${COMPTE} && ((newData.exists() && newData.child('u').val() === auth.uid && (!data.exists() || data.child('u').val() === auth.uid || !${r}.child('salons').child($code).child('joueurs').hasChild(data.child('u').val())) && (${r}.child('salons').child($code).child('joueurs').hasChild(auth.uid) || ${r}.child('salons').child($code).child('pres').hasChild(auth.uid))) || (!newData.exists() && (data.child('u').val() === auth.uid || ${r}.child('salons').child($code).child('joueurs').hasChild(auth.uid))))`,
      ".validate": `$code.matches(${CODE}) && newData.hasChildren(['u', 'p', 't'])`,
      "u": { ".validate": "newData.val() === auth.uid" },
      "p": { ".validate": `newData.isString() && ${pseudoReel(r, 'auth.uid')}` },
      "a": { ".validate": "newData.isString() && newData.val().matches(/^[a-z0-9_-]{1,40}$/)" },
      "d": { ".validate": "newData.isString() && newData.val().length <= 24" },
      "e": { ".validate": "newData.isString() && newData.val().matches(/^[a-z,]{0,60}$/)" },
      // Version du site du créateur ("0.2b|<build>" de version.json) ; absente = ancienne version.
      "v": { ".validate": "newData.isString() && newData.val().matches(/^[0-9a-z.|: -]{1,40}$/)" },
      // 0.4 : adversaire assis (uid w présent dans le salon, pseudo q) et nombre de spectateurs n.
      "w": { ".validate": `newData.isString() && ${r}.child('salons').child($code).child('joueurs').hasChild(newData.val())` },
      "q": { ".validate": "newData.isString() && newData.val().length <= 24" },
      "n": { ".validate": "newData.isNumber() && newData.val() >= 0 && newData.val() <= 999" },
      // Partie en cours : g = true, manche m (1 a 9), score k "a-b" (place 0 - place 1), mis a jour en fin de manche.
      "g": { ".validate": "newData.val() === true" },
      "m": { ".validate": "newData.isNumber() && newData.val() >= 1 && newData.val() <= 9" },
      "k": { ".validate": "newData.isString() && newData.val().matches(/^[0-9]{1,2}-[0-9]{1,2}$/)" },
      "f": { ".validate": "newData.isString() && newData.val().matches(/^[a-z,]{0,60}$/)" },
      // 0.6 : salon classé (cl) et Elo du créateur (el, celui de son profil classé, absent pendant le placement).
      "cl": { ".validate": "newData.isBoolean()" },
      "el": { ".validate": `newData.isNumber() && newData.val() === ${r}.child('classe').child('joueurs').child(auth.uid).child('elo').val() && ${r}.child('classe').child('joueurs').child(auth.uid).child('parties').val() >= 5` },
      "t": { ".validate": `${MAINTENANT}` },
      "$autre": { ".validate": false }
    }
  },
  "salons": {
    // Identifiant de salon court : 3 à 8 lettres minuscules ou chiffres.
    "$code": {
      ".validate": `$code.matches(${CODE})`,
      // Effacement du salon entier (joueurs, coups, chat) seulement si sa dernière activité date de plus de 7 jours.
      ".write": `${COMPTE} && !newData.exists() && ${r}.child('activite').child($code).val() < now - ${SEPT_JOURS}`,
      // Lecture d'un salon (joueurs et coups) pour tout joueur connecté.
      ".read": `${COMPTE}`,

      // Verrou de partie : les deux uid engagés, posé au démarrage par un joueur présent.
      // Ensuite seuls ces deux comptes peuvent écrire dans le salon (un tiers voit « salon complet »).
      // Un engagé peut l'effacer (adversaire parti), ce qui rouvre le salon.
      // 0.6.1 : g = graine de la partie engagée (texte). Salon classé : g obligatoire, les deux engagés connectés à la création,
      // et le verrou n'est levé qu'une fois la partie classée de cette graine écrite (une seule partie par engagement).
      "engages": {
        ".write": `${COMPTE} && ((!data.exists() && newData.hasChild(auth.uid) && (${r}.child('salons').child($code).child('cl').val() !== true || newData.hasChild('g'))) || (data.hasChild(auth.uid) && !newData.exists() && (${r}.child('salons').child($code).child('cl').val() !== true || !data.hasChild('g') || ${r}.child('classe').child('parties').child($code + '-' + data.child('g').val()).exists())))`,
        "g": { ".validate": "newData.isString() && newData.val().matches(/^-?[0-9]{1,12}$/)" },
        "$u": { ".validate": `newData.val() === true && ${r}.child('salons').child($code).child('joueurs').child($u).exists() && (${r}.child('salons').child($code).child('cl').val() !== true || ${r}.child('salons').child($code).child('pres').child($u).child('c').val() === true)` }
      },

      "joueurs": {
        "$uid": {
          // Chaque compte n'écrit que sous son propre uid (le jeu en ligne exige un compte),
          // et seulement s'il est engagé quand une partie a commencé.
          ".write": `auth != null && auth.uid === $uid && auth.token.firebase.sign_in_provider === 'password' && (!newData.exists() || !${r}.child('salons').child($code).child('engages').exists() || ${r}.child('salons').child($code).child('engages').hasChild($uid)) && (!newData.exists() || !${r}.child('salons').child($code).child('spectateurs').hasChild($uid))`,
          ".validate": "newData.hasChild('t')",
          "pseudo":  { ".validate": `newData.isString() && ${pseudoReel(r, '$uid')}` },
          "sid":     { ".validate": "newData.isString() && newData.val().length <= 16" },
          "adv":     { ".validate": "newData.isString() && newData.val().length <= 16" },
          "arrivee": { ".validate": "newData.isNumber()" },
          "graine":  { ".validate": "newData.isNumber()" },
          "jg":      { ".validate": "newData.isNumber()" },
          "veut":    { ".validate": "newData.isNumber()" },
          "quitte":  { ".validate": "newData.isNumber()" },
          "pret":    { ".validate": "newData.isBoolean()" },
          // Version du site du joueur ("0.2b|<build>" de version.json) ; absente = ancienne version.
          "v":       { ".validate": "newData.isString() && newData.val().matches(/^[0-9a-z.|: -]{1,40}$/)" },
          // Deck joué, texte compact (carte puis nombre : 0013002e2...) ; absent = paquet de test.
          "deck":    { ".validate": "newData.isString() && newData.val().length <= 300 && newData.val().matches(/^([0-9]{3}e?[1-3])+$/)" },
          "t":       { ".validate": `${MAINTENANT}` },
          "$autre":  { ".validate": false }
        }
      },

      // 0.5 : connexion de chaque joueur (c = connecté, t = heure serveur), écrite par lui seul, aussi par le serveur à sa coupure.
      "pres": {
        "$uid": {
          ".write": `auth != null && auth.uid === $uid && auth.token.firebase.sign_in_provider === 'password' && (!newData.exists() || !${r}.child('salons').child($code).child('engages').exists() || ${r}.child('salons').child($code).child('engages').hasChild($uid))`,
          ".validate": "newData.hasChildren(['c', 't'])",
          "c": { ".validate": "newData.isBoolean()" },
          "t": { ".validate": `${MAINTENANT}` },
          "$autre": { ".validate": false }
        }
      },
      // 0.5 : défaite par abandon d'un joueur hors ligne depuis plus de 70 s (10 s de reconnexion + 60 s de minuteur),
      // déclarée une seule fois par graine, par l'autre joueur engagé ; vérifiée sur la présence du déconnecté (marge de 5 s).
      "forfait": {
        "$g": {
          ".write": `${COMPTE} && !data.exists() && ${r}.child('salons').child($code).child('engages').hasChild(auth.uid) && (${r}.child('salons').child($code).child('cl').val() !== true || ${r}.child('salons').child($code).child('engages').child('g').val() === $g) && newData.child('u').val() !== auth.uid && ${r}.child('salons').child($code).child('engages').hasChild(newData.child('u').val()) && ${r}.child('salons').child($code).child('pres').child(newData.child('u').val()).child('c').val() === false && ${r}.child('salons').child($code).child('pres').child(newData.child('u').val()).child('t').val() < now - 65000`,
          ".validate": "$g.matches(/^-?[0-9]{1,12}$/) && newData.hasChildren(['u', 't'])",
          "u": { ".validate": "newData.isString() && newData.val().length <= 128" },
          "t": { ".validate": `${MAINTENANT}` },
          "$autre": { ".validate": false }
        }
      },

      "coups": {
        // Permet la recherche des coups d'un joueur à la reprise.
        ".indexOn": ["a"],
        "$coup": {
          // Ajout seulement (jamais de modification ni d'effacement),
          // et uniquement ses propres coups : le champ a doit être son uid, et la clé doit être
          // une clé push (anciennes parties) ou commencer par son uid + '_' (personne ne réserve la clé d'un autre).
          ".write": `${COMPTE} && !data.exists() && newData.child('a').val() === auth.uid && ($coup.beginsWith('-') || $coup.beginsWith(auth.uid + '_')) && !${r}.child('salons').child($code).child('spectateurs').hasChild(auth.uid) && (!${r}.child('salons').child($code).child('engages').exists() || ${r}.child('salons').child($code).child('engages').hasChild(auth.uid))`,
          ".validate": "newData.hasChildren(['a', 's', 'g', 'n', 'c'])",
          "a": { ".validate": "newData.isString() && newData.val().length <= 128" },
          "s": { ".validate": "newData.isString() && newData.val().length <= 16" },
          "g": { ".validate": "newData.isNumber()" },
          "n": { ".validate": "newData.isNumber() && newData.val() >= 0 && newData.val() < 2000" },
          "c": { ".validate": "newData.isString() && newData.val().length <= 40" },
          "$autre": { ".validate": false }
        }
      },

      // Chat du salon : ajout seulement (jamais modifié ni effacé), par un joueur présent ou engagé,
      // sous son propre uid et son pseudo. Effacé avec le salon.
      "chat": {
        "$m": {
          ".write": `${COMPTE} && !data.exists() && newData.child('a').val() === auth.uid && (${r}.child('salons').child($code).child('joueurs').hasChild(auth.uid) || ${r}.child('salons').child($code).child('engages').hasChild(auth.uid) || ${r}.child('salons').child($code).child('spectateurs').hasChild(auth.uid))`,
          ".validate": "newData.hasChildren(['a', 'p', 't', 'm'])",
          "a": { ".validate": "newData.isString() && newData.val().length <= 128" },
          "p": { ".validate": `newData.isString() && ${pseudoReel(r, 'auth.uid')}` },
          "t": { ".validate": `${MAINTENANT}` },
          "m": { ".validate": "newData.isString() && newData.val().length >= 1 && newData.val().length <= 200" },
          "$autre": { ".validate": false }
        }
      },

      // Mode spectateur (0.3). siege = uid de l'adversaire, pris par transaction s'il est libre, rendu par son seul détenteur.
      "siege": {
        // Prise seulement dans un salon ouvert (un joueur y est présent) et, partie commencée, par un engagé.
        ".write": `${COMPTE} && ((!data.exists() && newData.val() === auth.uid && ${r}.child('salons').child($code).child('joueurs').exists() && (${r}.child('salons').child($code).child('engages').exists() ? ${r}.child('salons').child($code).child('engages').hasChild(auth.uid) : !${r}.child('salons').child($code).child('joueurs').hasChild(auth.uid))) || (data.val() === auth.uid && (!newData.exists() || newData.val() === auth.uid)))`,
        ".validate": "newData.isString() && newData.val().length <= 128"
      },
      // Spectateurs présents : chacun n'écrit que sous son uid, pseudo de son compte et heure serveur.
      "spectateurs": {
        "$uid": {
          ".write": "auth != null && auth.uid === $uid && auth.token.firebase.sign_in_provider === 'password'",
          ".validate": "newData.hasChildren(['p', 't'])",
          "p": { ".validate": `newData.isString() && ${pseudoReel(r, '$uid')}` },
          "t": { ".validate": `${MAINTENANT}` },
          "$autre": { ".validate": false }
        }
      },

      // 0.6 : salon CLASSÉ (cl = true), posé ou retiré par un joueur présent avant le début de la partie ; jamais changé ensuite.
      // 0.6.1 : hote = uid du créateur du salon, posé une fois par lui, présent ; seul l'hôte pose ou retire cl.
      "hote": {
        ".write": `${COMPTE} && !data.exists() && newData.val() === auth.uid && (${r}.child('salons').child($code).child('joueurs').hasChild(auth.uid) || ${r}.child('salons').child($code).child('pres').hasChild(auth.uid))`,
        ".validate": "newData.isString()"
      },
      "cl": {
        ".write": `${COMPTE} && ${r}.child('salons').child($code).child('hote').val() === auth.uid && (${r}.child('salons').child($code).child('joueurs').hasChild(auth.uid) || ${r}.child('salons').child($code).child('pres').hasChild(auth.uid)) && !${r}.child('salons').child($code).child('engages').exists()`,
        ".validate": "newData.isBoolean()"
      },
      // 0.6 : ouverture du salon (heure serveur), posée une fois par un joueur présent : sert au délai du bandeau robot.
      "cree": {
        ".write": `${COMPTE} && !data.exists() && (${r}.child('salons').child($code).child('joueurs').hasChild(auth.uid) || ${r}.child('salons').child($code).child('pres').hasChild(auth.uid))`,
        ".validate": `${MAINTENANT}`
      },
      // 0.6 : bandeau « Affronter un Golem » d'un salon classé : 2 min après l'ouverture, sans adversaire engagé,
      // par un joueur présent ayant fini son placement ou non, 5 classées contre un robot par jour au plus ;
      // niveau imposé par son Elo (< 900 facile, 900-1149 normal, >= 1150 difficile). Retiré par lui seul.
      "robot": {
        ".write": `${COMPTE} && ((!data.exists() && newData.child('u').val() === auth.uid && ${r}.child('salons').child($code).child('cl').val() === true && ${r}.child('salons').child($code).child('joueurs').hasChild(auth.uid) && !${r}.child('salons').child($code).child('engages').exists() && ${r}.child('salons').child($code).child('cree').val() <= now - 120000 && ${r}.child('classe').child('joueurs').child(auth.uid).exists() && (!${r}.child('classe').child('joueurs').child(auth.uid).child('robots').exists() || !${aujourdhui(r + ".child('classe').child('joueurs').child(auth.uid)" + ".child('robots').child('j').val()")} || ${r}.child('classe').child('joueurs').child(auth.uid).child('robots').child('n').val() < 5)) || (data.child('u').val() === auth.uid && !newData.exists()))`,
        ".validate": `newData.hasChildren(['u', 'n', 't']) && newData.child('n').val() === (${r}.child('classe').child('joueurs').child(auth.uid).child('elo').val() < 900 ? 'facile' : ${r}.child('classe').child('joueurs').child(auth.uid).child('elo').val() < 1150 ? 'normal' : 'difficile')`,
        "u": { ".validate": "newData.isString()" },
        "n": { ".validate": "newData.isString()" },
        "t": { ".validate": `${MAINTENANT}` },
        "$autre": { ".validate": false }
      },

      // Rien d'autre dans un salon.
      "$autre": { ".validate": false }
    }
  }
});
