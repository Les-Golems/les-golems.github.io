# Plan du code des Golems

Ce fichier dit où se trouve chaque partie du site et où faire chaque type de changement.
À lire avant toute modification, par Romain comme par une nouvelle session.

**Règle d'or : modifier le bloc existant, ne jamais en créer un nouveau s'il en existe déjà un pour ce rôle.**
Une nouvelle carte va dans le fichier de son type, un nouvel effet dans le fichier d'effets de son type, une retouche d'onglet dans le CSS et le JS de cet onglet. Aucun code de carte (« 001 », « 002e »...) ni nom de carte ou de terrain n'est écrit en dur dans le moteur ou l'interface : les tests `test_ids_moteur.js` et `test_ids_interface.js` le refusent.

## 1. Les dossiers et fichiers

| Emplacement | Rôle |
|---|---|
| `index.html` | Structure de la page (onglets, fenêtres) et chargeur `golemsCharge` : il ajoute à chaque CSS et JS le `?v=` du build (version.json) et charge les fichiers dans l'ordre. Images versionnées par `imgV(...)`. |
| `version.json` | Seul endroit du numéro de version et du build : `{"v":"0.5","build":"...","type":"version" ou "correctif"}`. Écrit par `outils/publier.js`, jamais à la main. |
| `css/` | Styles communs : `base.css`, `cartes.css`, `partie.css` (vue joueur), `partie-diffusion.css`, `profil.css`, `tutoriel.css`, `reprises.css`, `boutons-entete.css`, `chargement.css`. |
| `css/onglets/` | Un fichier par onglet : `jouer.css`, `jouer-salon.css`, `decks-bac.css`, `decks-historique.css`, `guides.css`, `nouveautes.css`, `statistiques.css`. |
| `commun/` | Code commun de l'interface : `etat.js` (variables partagées, chargé en premier), `alertes.js` (bandeaux d'alerte et confirmations), `outils.js` ($, stockage local, détection du site d'essai), `compte.js`, `profil.js`, `navigation.js`, `version.js` (relit version.json : encadré « Nouvelle version » ou rechargement silencieux), `raccords.js`, `demarrage.js` (chargé en dernier). |
| `onglets/` | Un fichier JS par onglet : `nouveautes.js`, `jouer.js`, `decks.js`, `cartes.js`, `historique.js`, `statistiques.js`, `guides.js`, `regles.js`, `tutoriel.js` (partie guidée). |
| `vue/` | La partie à l'écran : `partie.js` (lancement, animations, fin, liste `MOTEURS_ARCHIVES` des rejeux), `joueur.js` (rendu de la vue joueur). |
| `cartes/donnees/` | **Fiches des cartes** (données seules) : `golems.js` (Golems et évolutions), `animaux.js`, `terrains.js`, `interface.js` (numéros affichés, cartes à venir, decks conseillés, bac à sable, **modèle des éléments** `elements` et couleurs des cartes imprimées `couleursCarte` : source unique, aucune couleur d'élément en dur ailleurs), `index.js` (`TYPES_DE_CARTES`, `ordre` des codes, `nomLong`, deck par défaut). |
| `cartes/effets/` | **Registre des types d'effets** : `golems.js`, `animaux.js`, `terrains.js` (une fabrique par type de carte), `index.js` (liste `FICHIERS` et assemblage). |
| `cartes/*.jpg, *.png` | Images : `<code>.jpg` (ex. `001.jpg`, évolution `001e.jpg`), terrains `t001.jpg`..., pictos d'éléments `brume.png`..., `logo.png`. |
| `versions-cartes.js` | Version de la **dernière modification** de chaque carte (`window.VERSIONS_CARTES`, code -> version). À renseigner à chaque patch qui change une carte. L'étiquette de version d'un deck passe en rouge (vx-diff) si une de ses cartes a changé depuis la version du deck (interface seule). |
| `moteur.js` | Moteur pur des règles (sans affichage), chargé en page et sous Node. Lit les fiches et les effets, ne teste jamais un code de carte. Contient `VERSION`. |
| `moteurs/` | Archives gelées `moteur-<version>.js` pour rejouer les anciennes parties. Jamais modifiées ni supprimées. |
| `salon-firebase.js` | Comptes, données des joueurs, jeu en ligne (Firebase). Préfixe `essai/` automatique sur le site d'essai. |
| `presence.js` | Présence et déconnexion en ligne. |
| `spectateur.js`, `spectateur-ui.js`, `spectateur.css` | Vue spectateur. |
| `diffusion.js`, `diffusion.css` | Vue diffusion (grand écran), vue joueur sur ordinateur et, depuis la 0.6, rejeu sur ordinateur (`DIFFUSION.rejeu`, commandes dans le coin droit ; calcul et `vaA(k)` dans `onglets/historique.js`). Effets de cases de la 0.4 (`effetsCases`, classes de `css/partie.css`). |
| `aide.js`, `aide.css` | Aide « ? » et panneaux d'explication. |
| `firebase-config.js` | Configuration publique Firebase. |
| `database.rules.json` | Règles Firebase **générées** (voir section 3), jamais retouchées à la main. |
| `avatars/`, `videos/`, icônes, `manifest.webmanifest`, `og.jpg` | Ressources du site. |
| `essai/` | Site d'essai **généré** (copie du site) : ne jamais le modifier à la main. |
| `outils/publier.js` | Publication : `version` ou `correctif`. |
| `outils/generer_essai.js` | Régénère `essai/`. |
| `tests/` | Tests (Node) et corpus de référence (`tests/reference/`). |
| `lancer_emulateur.ps1` | Émulateur Firebase local (tests en ligne). |

## 2. Ordre de chargement (index.html)

1. CSS : `spectateur.css`, `diffusion.css`, `aide.css`, puis `css/chargement.css`, puis les autres `css/` et `css/onglets/`.
2. Scripts du jeu : `salon-firebase.js` et `spectateur.js` (modules), `spectateur-ui.js`, `diffusion.js`, `aide.js` (différés), puis
   `cartes/donnees/golems.js`, `animaux.js`, `terrains.js`, `index.js`, puis `cartes/effets/golems.js`, `animaux.js`, `terrains.js`, `index.js`, puis `moteur.js`, puis `presence.js`.
   Les données et les effets doivent être chargés **avant** `moteur.js` (sinon le moteur s'arrête avec un message clair).
3. Interface : `cartes/donnees/interface.js`, `versions-cartes.js`, `commun/etat.js`, `commun/outils.js`, `commun/alertes.js`, `commun/compte.js`, `onglets/guides.js`, `commun/navigation.js`, `onglets/nouveautes.js`, `onglets/cartes.js`, `onglets/jouer.js`, `vue/partie.js`, `onglets/statistiques.js`, `onglets/historique.js`, `commun/profil.js`, `onglets/decks.js`, `vue/joueur.js`, `onglets/tutoriel.js`, `commun/raccords.js`, `onglets/regles.js`, `commun/version.js`, `commun/demarrage.js`.

Un nouveau fichier JS ou CSS doit être ajouté à la liste `golemsCharge` d'index.html, à sa place dans cet ordre.

## 3. Où faire chaque type de changement

| Changement | Où |
|---|---|
| Nouvelle carte (Golem, évolution, animal) | Section 4 ci-dessous. |
| Nouvel effet | Un type d'effet existant si possible (reglages dans la fiche) ; sinon un nouveau type dans `cartes/effets/<type de carte>.js`. |
| Nouveau terrain | Fiche en **fin** de `cartes/donnees/terrains.js` (le rang sert d'identifiant), effet dans `cartes/effets/terrains.js`, image `cartes/tNNN.jpg`. Source : `terrains.json` du gabarit (1 - Gabarit de carte), à reporter à la main. |
| Nouveau type de carte (futurs Événements) | `cartes/donnees/evenements.js` + une ligne dans `TYPES_DE_CARTES` (`cartes/donnees/index.js`) ; `cartes/effets/evenements.js` + une ligne dans `FICHIERS` (`cartes/effets/index.js`) ; ajouter les deux fichiers à `golemsCharge` (index.html), avant `moteur.js`. Les lettres d'action et le format du journal ne changent jamais. |
| Retouche d'un onglet | Son CSS dans `css/onglets/<onglet>.css` et son JS dans `onglets/<onglet>.js` ; la structure HTML de l'onglet est dans `index.html`. |
| Vue joueur / spectateur / diffusion | `vue/` et `css/partie.css` ; `spectateur*.js` ; `diffusion.*`. |
| Numéros affichés, cartes à venir, decks conseillés | `cartes/donnees/interface.js` (interface seule, ne change pas le jeu). |
| Règle de jeu | `moteur.js` (règle générale) ou l'effet de la carte concernée. Tests, corpus et publication en VERSION (section 5). Mettre à jour en même temps l'onglet Règles, les Nouveautés, la note de patch et le PDF des règles. |
| Nouveautés / note de version | `onglets/nouveautes.js`. |
| Règles Firebase | Branche `reorg-regles` : blocs `rules/00-communs.js`, `10-comptes.js`, `20-en-ligne.js`, `30-stats.js`, `40-nouveautes.js` ; `node rules/generer.js` fabrique `database.rules.json` (racine + miroir `essai/` identique au préfixe près) ; `node rules/generer.js --verifier` contrôle ; tests `tests/test_regles.js` (émulateur). Romain importe ensuite le fichier complet dans la console. |
| Publication | `node outils/publier.js version 0.6` (nouveauté, carte, règle, équilibrage : message aux joueurs) ou `node outils/publier.js correctif` (affichage, texte : rechargement silencieux hors partie). Le correctif est refusé si `moteur.js`, `moteurs/`, `cartes/donnees/` (sauf `interface.js`) ou `cartes/effets/` ont changé depuis la dernière publication. |
| Site d'essai | `node outils/generer_essai.js` (ou `publier_essai.ps1` des outils), puis Romain pousse. Adresse : `/essai/`. Le code reconnaît l'adresse seul (clés locales `essai.`, préfixe Firebase `essai/`, pastille « SITE D'ESSAI »). Les vidéos `.mp4` ne sont pas copiées (affiches seulement). |
| Nouvelle version du moteur | Changer `VERSION` dans `moteur.js`, copier le moteur publié dans `moteurs/moteur-<version>.js`, ajouter la version à `MOTEURS_ARCHIVES` (`vue/partie.js`). |

## 4. Ajouter une carte, pas à pas

1. **Fiche** dans `cartes/donnees/golems.js` (Golem ou évolution) ou `animaux.js` (animal), jamais ailleurs. Champs :
   `id` (code, ex. `'043'`, évolution `'043e'`), `nom`, `titre` (affiché après le nom : « KaTarN, Romain 18 ans » ; `nomLong` seulement pour une exception), `el` (éléments), `cout`, `force` (`null` si l'effet la fixe), `base` (code de la base, évolutions seulement), `texte` (effet affiché, à la 2e personne), `effet` (`{type:'...', ...reglages}` ou une liste). Animal en plus : `animal:true`, `maitre`.
   L'ordre des fiches dans le fichier = ordre d'affichage dans l'onglet Cartes.
2. **Code en fin de `ordre`** dans `cartes/donnees/index.js` : l'identifiant de carte des parties dépend du rang, toujours ajouter à la fin.
3. **Effet** : réutiliser un type existant de `cartes/effets/<type>.js` avec ses réglages ; sinon créer le type dans ce même fichier (crochets décrits en tête du fichier et dans `cartes/effets/index.js`). Jamais de test du code de la carte dans `moteur.js`.
4. **Interface** : numéro affiché dans `numeroAffiche` (ou `numeroAnimal`) de `cartes/donnees/interface.js` ; retirer la ligne de `aVenir` si la carte y était.
5. **Image** : `cartes/<code>.jpg` (600 x 840), venue du gabarit de carte.
6. **Tests**, depuis la racine du dépôt :
   - `node tests/reference/comparer.js` : doit dire « identique » si la carte ne change pas les parties existantes. Si elle change le jeu (nouvelle carte tirée dans les decks du corpus, règle changée), régénérer le corpus après vérification : `node tests/reference/generer_corpus.js` (voir `tests/reference/LISEZ-MOI.txt`) ;
   - `node tests/test_ids_moteur.js` et `node tests/test_ids_interface.js` ;
   - `node tests/test_moteur.js`, `test_animaux.js`, `test_leq.js`, `test_terrains.js`, `test_encodage.js` ;
   - contrôle en navigateur (Chrome headless) : onglet Cartes, une partie contre le robot avec la carte.
7. **Publication en VERSION** (`node outils/publier.js version X`), car le moteur et les données changent : le correctif est refusé par le garde-fou. Penser aux Nouveautés, à la note de patch et au PDF des règles.

## 5. Tests

- `tests/reference/comparer.js` : 540 parties de référence, doit répondre « identique » après tout changement qui ne doit pas modifier le jeu.
- `tests/test_ids_moteur.js`, `tests/test_ids_interface.js` : aucun code ni nom de carte en dur.
- `tests/test_moteur.js`, `test_animaux.js`, `test_leq.js`, `test_terrains.js`, `test_encodage.js` : règles du moteur.
- Hors dépôt (`6 - Outils et simulations\1 - Outils\3 - Tests du site`) : harnais Chrome headless (`cdp.py`, `t_moteur.py` ; variable `GOLEMS_SITE` pour tester un autre dossier que « 4 - Site GitHub »).

## 6. Socle commun 0.6 (css/base.css, commun/outils.js)

Composants de la charte graphique, préfixe `sc-`, à utiliser par tous les écrans refaits. Les anciennes classes (`.pastille`, `.btn`...) restent valides tant que les écrans ne sont pas adaptés. Démonstration : `_tmp/socle_demo.html`.

| Nom | Usage |
|---|---|
| Variables `--rouge` #ff4d4f, `--rouge-texte` #ffd0ca, `--adverse` #ee6a2c, `--ambre`, `--vert`, `--gris-taux`, `--info-bord` | Rouge d'erreur unique (remplace #ff6b5e, encore écrit en dur dans `css/partie.css`, `css/reprises.css`, `css/onglets/jouer-salon.css`, `css/onglets/decks-historique.css`, `onglets/decks.js` : à passer en `var(--rouge)` à l'adaptation des écrans) ; orange de l'adversaire ; couleurs des taux. |
| États communs : `.sc-etat`, `.sc-selectionne`, `.sc-desactive`, `.sc-tuile` | Survol brightness 1,08 (souris seulement), clic, focus 2 px bleu, désactivé .45, sélectionné bleu ; déjà inclus dans `.sc-btn` et `.sc-sel`. Tuile : bordure bleue au survol, contour 3 px sélectionnée. |
| `.sc-sel` (+ `.sc-petit`, `.sc-large`) | Sélecteur unique à 2, 3 ou 4 options (`<button aria-pressed>`). 46 px (options 38 px, 14,5 px) pour vue/mode ; `.sc-petit` 34 px pour les filtres d'un bloc. Remplace tout interrupteur oui/non. |
| `.sc-btn` (+ `.sc-secondaire`, `.sc-tertiaire`), `.sc-rangee`, `.sc-pousse` | Bouton principal bleu / secondaire gris, 46 px, Lilita 18 px ; tertiaire 30 px 14 px ; rangée à 12 px d'écart ; `.sc-pousse` cale à droite. |
| `.sc-fenetre`, `.sc-fen-titre`, `.sc-fen-actions` | Fenêtre : titre 800 18 px police du texte, bandeau éventuel juste dessous, rangée [action] à gauche, [Annuler/Fermer] (`.sc-secondaire` en dernier ou `.sc-pousse`) à droite, 24 px sous la rangée. |
| `.sc-alerte.sc-erreur` / `.sc-alerte.sc-info` (+ `.sc-une-ligne` 40 px, `.sc-deux-lignes` 56 px) | Bandeau d'alerte : `<i></i>` (icône « ! » ou « i » mise par le CSS), `<span>` texte (2 lignes max), bouton `.sc-btn.sc-tertiaire` éventuel à droite ; empilés à 8 px. |
| `commun/alertes.js` : `alerte(cible,texte,{info,bouton})`, `alerteInfo`, `alerteTexte`, `confirmeFen({titre,texte,action})`, `copieManuelle(cible,txt)` | Tous les messages du site (textes validés le 9 nov. 2026, « Titre : raison. Action. », dossier 28 - Alertes) : bandeau `.sc-alerte` rouge (erreur) ou bleu (information) posé dans la zone de l'écran (`#erreurJeu`, `#erreurPseudo`, `#galMsg`/`#cadMsg` sous le titre de la fenêtre, `#histoAlerte`...) ; texte vide = efface. Confirmations (Supprimer, Abandonner, Quitter) au modèle de la déconnexion : titre en question, phrase, [Action] [Annuler] (`confirmeFen`, Promise). Plus aucun `alert()`, `prompt()`, `confirm()` natif. Chargé juste après commun/outils.js. |
| `.sc-titre-bloc` | Titre de bloc commun (Lilita 22 px, une ligne, 12 px dessous) : même place dans tous les blocs (défaut J02). |
| `couleurTaux(taux, parties, {neutre})` (commun/outils.js) et `.sc-taux-*` | Rend la classe : vert >= 50 %, ambre 40-49 %, rouge < 40 %, gris si moins de 5 parties ; `neutre:true` = blanc (classement des joueurs). `couleurTaux.valeur(...)` rend la couleur CSS. Taux en pourcentage 0-100. |
