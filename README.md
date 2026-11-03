# Les Golems

Jeu de cartes communautaire du Discord Les Golems, jouable dans le navigateur : https://les-golems.github.io

- `index.html`, `moteur.js`, `cartes/` : l'interface et le moteur de jeu.
- `salon-firebase.js` : le jeu en ligne à deux (Firebase Realtime Database, connexion anonyme).
- `firebase-config.js` : configuration publique du projet Firebase (non secrète).
- `database.rules.json` : règles de sécurité de la base, à coller dans la console Firebase.

Le jeu contre le robot fonctionne sans connexion. Les decks, le pseudo et l'historique restent sur l'appareil.

Test en local : `python -m http.server 8000` dans ce dossier, puis http://localhost:8000.
