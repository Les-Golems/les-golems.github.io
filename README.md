# Les Golems

Jeu de cartes communautaire du Discord Les Golems, jouable dans le navigateur : https://les-golems.github.io

- `index.html`, `moteur.js`, `cartes/` : l'interface et le moteur de jeu.
- `salon-firebase.js` : comptes (pseudo + code secret), données des joueurs et jeu en ligne à deux (Firebase Realtime Database).
- `firebase-config.js` : configuration publique du projet Firebase (non secrète).
- `database.rules.json` : règles de sécurité de la base, à coller dans la console Firebase (Realtime Database > Règles > Publier).
- `tests/test_moteur.js` : tests du moteur (Node, ou Chrome headless avec un petit harnais).

## Comptes

- Sans compte (invité) : jeu contre le robot ; decks et historique restent sur l'appareil.
- Avec compte : pseudo réservé (3 à 20 caractères, unique sans tenir compte des majuscules) et code secret (6 caractères minimum). Decks (12 au plus) et historique (50 dernières parties) sont dans Firebase. Le jeu en ligne exige un compte.
- En interne, chaque compte est un utilisateur Firebase « Adresse e-mail/Mot de passe » avec une adresse fictive calculée depuis le pseudo (`j<empreinte>@joueurs.les-golems.invalid`). Le joueur ne la voit jamais.
- Site d'essai (`/essai/`) : mêmes comptes, mais pseudos et données sous le nœud `essai/` de la base.

## Réinitialiser un compte (code oublié), sans serveur

Firebase ne permet pas de changer le mot de passe d'un compte depuis la console sans e-mail réel : on supprime le compte, le joueur le recrée avec le même pseudo.

1. Console Firebase > Realtime Database > Données : ouvrir `pseudos/<pseudo en minuscules>` et noter la valeur (l'UID du joueur).
2. Pour garder ses données : ouvrir `joueurs/<UID>`, menu des trois points > Exporter JSON (fichier sur ton ordinateur).
3. Authentication > Utilisateurs : rechercher l'UID, menu des trois points > Supprimer le compte.
4. Realtime Database : supprimer `pseudos/<pseudo en minuscules>` puis `joueurs/<UID>`.
5. Le joueur recrée son compte avec le même pseudo et un nouveau code.
6. Pour lui rendre ses données : noter son nouvel UID (dans `pseudos/<pseudo>`), ouvrir `joueurs/<nouvel UID>`, trois points > Importer JSON, choisir le fichier de l'étape 2. Vérifier que `pseudo` est bien le sien.

Ce qui est perdu sans l'étape 2 : ses decks et son historique enregistrés sur le compte. Autres moyens de limiter la perte : à la première connexion d'un compte, le site propose d'importer les decks et parties gardés sur l'appareil ; et l'historique de ses adversaires garde la trace des parties jouées contre lui.

Le site supporte les réinitialisations partielles : si `pseudos/<pseudo>` a été effacé mais pas le compte, la réservation est refaite à la connexion ; si le pseudo a été repris par un autre compte entre-temps, la connexion est refusée avec un message.

## Test en local

`python -m http.server 8000` dans ce dossier, puis http://localhost:8000. En local seulement, `window.__golemsDebug` expose quelques fonctions pour les tests automatiques.

## Émulateur Firebase local (tests sans toucher la vraie base)

Servi depuis `localhost` ou `127.0.0.1`, le site se branche automatiquement sur l'émulateur Firebase (Auth 127.0.0.1:9099, Realtime Database 127.0.0.1:9000, projet de démonstration `demo-les-golems`), jamais sur la vraie base. En ligne (github.io), rien ne change.

1. Prérequis : Java 21 (Eclipse Temurin) et le binaire autonome `firebase-tools-win.exe` dans `../13 - Outils/firebase/`.
2. `powershell -ExecutionPolicy Bypass -File lancer_emulateur.ps1` (charge `database.rules.json`, voir `firebase.json` et `.firebaserc`).
3. Dans un autre terminal : `python -m http.server 8000 --bind 127.0.0.1`, puis http://127.0.0.1:8000
4. Ctrl+C arrête l'émulateur ; comptes et données de test disparaissent. Comptes d'essai notés dans `tests/comptes_emulateur.txt`.

Pour tester contre la vraie base, il faut désormais servir le site sous un autre nom d'hôte (par exemple l'adresse IP du PC sur le réseau local).