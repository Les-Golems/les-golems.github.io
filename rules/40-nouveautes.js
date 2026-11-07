// Nouveautés : blocs épinglés par Romain.
// r = racine des données ("root" ou "root.child('essai')"), voir 00-communs.js.
const { UID_ROMAIN } = require('./00-communs');

module.exports = r => ({
  // Nouveautés (0.4) : blocs épinglés, nouveautes/epingles = { "0": id, "1": id } (2 au plus ; "aucun" = rien d'épinglé ;
  // nœud vide = Feuille de route épinglée par défaut). Lus par tous ; écrits par le seul compte de Romain, reconnu par son uid.
  // Épinglage des Nouveautés : réservé au compte de Romain (KaTarN).
  "nouveautes": {
    "epingles": {
      ".read": true,
      ".write": `auth != null && auth.uid === '${UID_ROMAIN}'`,
      ".validate": "newData.hasChildren()",
      "$i": { ".validate": "($i === '0' || $i === '1') && newData.isString() && newData.val().matches(/^[a-z0-9.-]{1,40}$/)" }
    }
  }
});
