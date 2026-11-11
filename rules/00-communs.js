// Morceaux communs des règles de la Realtime Database.
// Chaque bloc (10-..., 20-..., 30-..., 40-...) est une fonction r => ({ ... }) où r est la racine des données :
//   "root" pour le site public, "root.child('essai')" pour le site d'essai (/essai).
// Toujours passer par r pour lire ailleurs dans la base : jamais root.child(...) en dur, jamais parent().parent().
// generer.js assemble les blocs et écrit database.rules.json ; node rules/generer.js --verifier contrôle le tout.

// Connecté par pseudo et code (fournisseur password), pas en invité anonyme.
const COMPTE = "auth != null && auth.token.firebase.sign_in_provider === 'password'";
// Compte de Romain (KaTarN), reconnu par son uid.
const UID_ROMAIN = 'doSJZ1I6ixVUFejD842Jz2JrkFs1';
// Romain (KaTarN) connecté : droits d'administration.
const ROMAIN = `(auth != null && auth.uid === '${UID_ROMAIN}')`;
// Heure du serveur imposée.
const MAINTENANT = 'newData.val() === now';
// Code de salon : 3 à 8 lettres minuscules ou chiffres.
const CODE = '/^[a-z0-9]{3,8}$/';
// 7 jours en millisecondes (nettoyage des salons inactifs).
const SEPT_JOURS = '604800000';

// Le texte écrit est le pseudo du compte uid (expression ou variable de règle, ex. '$uid' ou 'auth.uid').
const pseudoReel = (r, uid) => `newData.val() === ${r}.child('joueurs').child(${uid}).child('pseudo').val()`;

// Racine des données APRÈS l'écriture, en remontant de n crans depuis newData (même préfixe que le nœud écrit).
// Seul moyen de voir une autre partie d'une écriture multiple (ex. pseudos/ et joueurs/ posés ensemble à la création).
// L'utilisateur est dans le salon $code : parmi ses joueurs, ou présent (pres/<uid>) même si joueurs/<uid> vient d'être effacé.
const dansSalon = r => `(${r}.child('salons').child($code).child('joueurs').hasChild(auth.uid) || ${r}.child('salons').child($code).child('pres').hasChild(auth.uid))`;

const racineApres = n => 'newData' + '.parent()'.repeat(n);

// Garde-fou des statistiques publiques : par rapport à la valeur précédente (expression a, nœud avec n et v),
// les parties n et victoires v ne baissent jamais, n monte de PAS_MAX (50) au plus par écriture
// et v ne monte pas plus que n. Sans valeur précédente (a absent) : n de PAS_MAX (50) au plus.
// PAS_MAX = 50 et pas 1 : l'import des parties de l'appareil (50 au plus) et les parties en attente
// renvoyées d'un coup font monter n de plusieurs parties en une seule écriture.
const PAS_MAX = 50;
const gardeStats = a => {
  const N = "newData.child('n').val()", V = "newData.child('v').val()", n0 = a + ".child('n').val()", v0 = a + ".child('v').val()";
  return '(' + a + '.exists() ? (' + N + ' >= ' + n0 + ' && ' + N + ' <= ' + n0 + ' + ' + PAS_MAX + ' && ' + V + ' >= ' + v0 + ' && ' + V + ' - ' + v0 + ' <= ' + N + ' - ' + n0 + ') : ' + N + ' <= ' + PAS_MAX + ')';
};

// Tops 5 des résumés par mode (profils/pm et classe/historique/modes) : dk decks (nom, e = éléments séparés par des virgules,
// 5 au plus : 32 caractères au plus), cb cartes, mv MVP. Une seule définition pour les deux nœuds (commun/profil.js écrit les mêmes valeurs).
const NB = "newData.isNumber() && newData.val() >= 0 && newData.val() % 1 === 0 && newData.val() <= 100000";
const CARTE = { ".validate": "newData.isString() && newData.val().matches(/^[0-9]{3}e?$/)" };
const TOPS_MODE = {
  "dk": { "$i": { ".validate": "$i.matches(/^[0-4]$/) && newData.hasChildren(['nom', 'n', 'v'])", "nom": { ".validate": "newData.isString() && newData.val().length >= 1 && newData.val().length <= 40" }, "e": { ".validate": "newData.isString() && newData.val().matches(/^[a-z,]{0,40}$/)" }, "n": { ".validate": NB }, "v": { ".validate": NB }, "$autre": { ".validate": false } } },
  "cb": { "$i": { ".validate": "$i.matches(/^[0-4]$/) && newData.hasChildren(['c', 'n', 'v'])", "c": CARTE, "n": { ".validate": NB }, "v": { ".validate": NB }, "$autre": { ".validate": false } } },
  "mv": { "$i": { ".validate": "$i.matches(/^[0-4]$/) && newData.hasChildren(['c', 'n'])", "c": CARTE, "n": { ".validate": NB }, "$autre": { ".validate": false } } }
};

module.exports = { TOPS_MODE, COMPTE, UID_ROMAIN, ROMAIN, dansSalon, MAINTENANT, CODE, SEPT_JOURS, pseudoReel, racineApres, gardeStats };
