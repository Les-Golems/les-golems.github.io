// Comptes : pseudos réservés et données de chaque compte.
// r = racine des données ("root" ou "root.child('essai')"), voir 00-communs.js.
const { gardeStats, racineApres, COMPTE, MAINTENANT, CODE } = require('./00-communs');

module.exports = r => ({
  // Pseudos réservés : pseudos/{pseudo en minuscules} = uid du propriétaire.
  // Lisible par tout connecté (vérifier qu'un pseudo est libre) ; réservé par un compte,
  // seulement s'il est libre ou déjà à lui ; effacé seulement par son propriétaire (ou Romain en console).
  "pseudos": {
    "$cle": {
      ".read": "auth != null",
      // Effacement (changement de pseudo) seulement si joueurs/{uid}/pseudo ne le porte plus après l'écriture :
      // sinon un autre compte pourrait le réserver et s'afficher sous le nom encore porté.
      ".write": `${COMPTE} && (!data.exists() || data.val() === auth.uid) && (newData.exists() || !${racineApres(2)}.child('joueurs').child(auth.uid).child('pseudo').exists() || ${racineApres(2)}.child('joueurs').child(auth.uid).child('pseudo').val().toLowerCase() !== $cle)`,
      ".validate": "$cle.length >= 3 && $cle.length <= 20 && $cle === $cle.toLowerCase() && newData.isString() && newData.val() === auth.uid"
    }
  },

  // Données d'un compte : lecture et écriture par son seul uid ; pseudo et avatar lisibles par tout connecté.
  "joueurs": {
    "$uid": {
      ".read": "auth != null && auth.uid === $uid",
      ".write": "auth != null && auth.uid === $uid && auth.token.firebase.sign_in_provider === 'password'",
      // Pseudo du compte : doit être réservé à ce compte dans pseudos/ (clé = pseudo en minuscules), dans la même écriture ou avant.
      "pseudo":   { ".read": `${COMPTE}`, ".validate": `newData.isString() && newData.val().length >= 3 && newData.val().length <= 20 && ${racineApres(3)}.child('pseudos').child(newData.val().toLowerCase()).val() === $uid` },
      "avatarId": { ".read": `${COMPTE}`, ".validate": "newData.isString() && newData.val().matches(/^[a-z0-9_-]{1,40}$/)" },
      // Avatar importé par le joueur : petite image JPEG ou WebP en texte (data URL), 140 000 caractères au plus (environ 100 Ko).
      "avatarImg": { ".read": `${COMPTE}`, ".validate": "newData.isString() && newData.val().length <= 140000 && newData.val().matches(/^data:image\\/(jpeg|webp);base64,[A-Za-z0-9+\\/=]+$/)" },
      "cree":     { ".validate": "newData.isNumber()" },
      // Résumé public des parties (victoires v sur n parties), lisible par tout connecté.
      // Garde-fou : une écriture suit la précédente (ou, si le nœud a été effacé, le classement) : voir gardeStats.
      "stats":    { ".read": `${COMPTE}`, ".validate": `newData.hasChildren(['v', 'n']) && newData.child('v').isNumber() && newData.child('n').isNumber() && newData.child('v').val() >= 0 && newData.child('v').val() <= newData.child('n').val() && (data.exists() ? ${gardeStats('data')} : ${gardeStats(r + ".child('classement').child($uid)")})`, "v": { ".validate": "newData.isNumber()" }, "n": { ".validate": "newData.isNumber()" }, "$autre": { ".validate": false } },
      // 12 decks au plus : emplacements 0 à 11 (fixes depuis la 0.6a : l'ordre est dans ordreDecks). Le total 24 à 30 est vérifié par le site
      // (un deck en cours de construction peut être plus petit).
      "decks": {
        "$i": {
          ".validate": "$i.matches(/^([0-9]|1[01])$/) && newData.hasChildren(['id', 'nom'])",
          "id":  { ".validate": "newData.isString() && newData.val().matches(/^[a-z0-9]{1,16}$/)" },
          "nom": { ".validate": "newData.isString() && newData.val().length >= 1 && newData.val().length <= 24" },
          "t":   { ".validate": "newData.isNumber()" },
          // 0.6 : version du site à l'enregistrement du deck (M.VERSION, ex. « 0.6 »), 10 caractères au plus.
          "v":   { ".validate": "newData.isString() && newData.val().matches(/^[0-9a-z.]{1,10}$/)" },
          // Carte (001, 001e...) : 1 à 3 exemplaires, base et évolution à part.
          // 0.6a : un ancien deck au-delà (ex. 5 exemplaires, d'avant la règle) peut redescendre pas à pas (5, 4, puis 3) : réparable par le joueur.
          "cartes": {
            "$c": { ".validate": "$c.matches(/^[0-9]{3}e?$/) && newData.isNumber() && newData.val() % 1 === 0 && newData.val() >= 1 && (newData.val() <= 3 || (data.isNumber() && newData.val() < data.val()))" }
          },
          "$autre": { ".validate": false }
        }
      },
      // 0.6a : ordre d'affichage des decks (ids de decks/<i> séparés par des virgules), écrit seul quand on les déplace :
      // un deck n'est plus réécrit pour changer de place (un ancien deck refusé par les règles ne bloque plus l'ordre).
      "ordreDecks": { ".validate": "newData.isString() && newData.val().matches(/^[a-z0-9]{1,16}(,[a-z0-9]{1,16}){0,11}$/)" },
      // Historique : une entrée par partie (clé graine-début), d = date, x = détail en JSON.
      // Le site garde les 50 dernières (liste et replays) et efface les plus anciennes ; le profil compte toutes les parties (cumul).
      "historique": {
        ".indexOn": ["d"],
        "$h": {
          ".validate": "$h.matches(/^-?[0-9]{1,12}-[0-9]{10,14}$/) && newData.hasChildren(['d', 'x'])",
          "d": { ".validate": "newData.isNumber()" },
          // 0.6 : x porte aussi les Forces par terrain, le deck adverse et le lien animal-maître (20 000 caractères au plus).
          "x": { ".validate": "newData.isString() && newData.val().length <= 20000" },
          // 0.6 : partie classée (c), variation d'Elo (de, -64 à 64), robot affronté (ro : facile, normal, difficile).
          "c": { ".validate": "newData.isBoolean()" },
          "de": { ".validate": "newData.isNumber() && newData.val() % 1 === 0 && newData.val() >= -64 && newData.val() <= 64" },
          "ro": { ".validate": "newData.isString() && newData.val().matches(/^(facile|normal|difficile)$/)" },
          "$autre": { ".validate": false }
        }
      },
      // Cumuls de toutes les parties (profil et classement), texte JSON écrit par le site à chaque partie, 100 000 caractères au plus.
      "cumul": { ".validate": "newData.isString() && newData.val().length <= 100000" },
      // Témoin d'import des données locales (proposé une seule fois).
      "importe": { ".validate": "newData.isNumber()" },
      // 0.5 : partie en ligne en cours, retenue par le compte (reprise sur un autre appareil ; dev = dernier appareil qui a la main).
      "salon": {
        ".validate": "newData.hasChildren(['c', 'g', 't'])",
        "c": { ".validate": `newData.isString() && newData.val().matches(${CODE})` },
        "g": { ".validate": "newData.isNumber()" },
        "dev": { ".validate": "newData.isString() && newData.val().length <= 16" },
        "x": { ".validate": "newData.isString() && newData.val().length <= 4000" },
        "t": { ".validate": `${MAINTENANT}` },
        "$autre": { ".validate": false }
      },
      "$autre": { ".validate": false }
    }
  }
});
