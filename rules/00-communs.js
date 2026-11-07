// Morceaux communs des règles de la Realtime Database.
// Chaque bloc (10-..., 20-..., 30-..., 40-...) est une fonction r => ({ ... }) où r est la racine des données :
//   "root" pour le site public, "root.child('essai')" pour le site d'essai (/essai).
// Toujours passer par r pour lire ailleurs dans la base : jamais root.child(...) en dur, jamais parent().parent().
// generer.js assemble les blocs et écrit database.rules.json ; node rules/generer.js --verifier contrôle le tout.

// Connecté par pseudo et code (fournisseur password), pas en invité anonyme.
const COMPTE = "auth != null && auth.token.firebase.sign_in_provider === 'password'";
// Compte de Romain (KaTarN), reconnu par son uid.
const UID_ROMAIN = 'doSJZ1I6ixVUFejD842Jz2JrkFs1';
// Heure du serveur imposée.
const MAINTENANT = 'newData.val() === now';
// Code de salon : 3 à 8 lettres minuscules ou chiffres.
const CODE = '/^[a-z0-9]{3,8}$/';
// 7 jours en millisecondes (nettoyage des salons inactifs).
const SEPT_JOURS = '604800000';

// Le texte écrit est le pseudo du compte uid (expression ou variable de règle, ex. '$uid' ou 'auth.uid').
const pseudoReel = (r, uid) => `newData.val() === ${r}.child('joueurs').child(${uid}).child('pseudo').val()`;

module.exports = { COMPTE, UID_ROMAIN, MAINTENANT, CODE, SEPT_JOURS, pseudoReel };
