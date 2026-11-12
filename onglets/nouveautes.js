/* Onglet Nouveautes : notes de patch, details des versions, feuille de route, epingles, pagination. */
/* Notes de patch : ajouter la nouvelle version en tête de liste. */
/* Date de publication de la 0.5 : A REMPLACER LE JOUR J (ex. '8 novembre 2026'), sert au bloc de version et au bloc video. */
const DATE_V05='7 novembre 2026';
/* Date de publication de la 0.6 : A REMPLACER LE JOUR J (ex. '10 novembre 2026'), bloc de version et Details. */
const DATE_V06='9 novembre 2026';
/* Date de publication de la 0.6a : A REMPLACER LE JOUR J (ex. '11 novembre 2026'), bloc de version et Details. */
const DATE_V06A='11 novembre 2026';
/* Date de publication de la 0.7 : A REMPLIR LE JOUR J (ex. '13 novembre 2026'), bloc de version et Details. */
const DATE_V07='';
const NOUVEAUTES=[
 /* EMPLACEMENT DU BLOC 0.7 : coller ici l'entree de entree_nouveautes_0.7.js (session Equilibrage, avec la video), date:DATE_V07.
    Elle sera epinglee seule (EPINGLE_VERSION ci-dessous) ; ajouter aussi ses Details en tete de DETAILS_VERSIONS et sa video dans NOUVEAUX_GOLEMS. */
 {version:'Version 0.6a',date:DATE_V06A,notes:["Mode clair, dans le menu Affichage","Nouvelles animations : évolution, animal, destruction, victoire et plus","Rejeu corrigé dans la nouvelle interface de partie","Guides éditables : publication, modification ou suppression","Classement des decks par glisser-déposer","Profil et Statistiques corrigés","Nouveaux avatars disponibles","Nombreux bugs corrigés"]},
 {version:'Version 0.6',date:DATE_V06,notes:["Nouvelle interface","Parties classées (6 rangs, saison 0)","Récompenses : médaille Pionnier, écus du top 10","Nouveau Golem : {{Elccino}} (Brume, Cristal)","Nouvel animal : {{Uki}}, l'animal de Shifukuro (Roche)","6 decks conseillés, un par archétype","Le Golem adverse joue l'un d'eux au hasard","Nouveau mot-clé : Récupérer"]},
 {version:'Version 0.5a',date:'8 novembre 2026',notes:["Sur ordinateur, les piles Deck, Forge et Défausse s'ouvrent de nouveau","Sur téléphone, les compteurs des bandeaux affichent les cartes","Ton deck se consulte trié par nom, avec le nombre d'exemplaires","Le deck adverse n'est plus consultable, seul son nombre de cartes s'affiche"]},
 {version:'Version 0.5',date:DATE_V05,notes:["Nouvel écran de partie","6 nouveaux terrains","Animaux de compagnie retravaillés","Nouvelle règle : 4 éléments différents au plus par deck","Decks conseillés retravaillés","État de la connexion et reprise de la partie","Mode daltonien","Nouvel onglet Guides","Diverses améliorations de confort"]},
 {version:'Version 0.4',date:'6 novembre 2026',notes:["Nouvelle vue spectateur : pensée pour la diffusion","En spectateur : récaps de manche et de fin de partie","Onglet Jouer : retravaillé","Infobulles sur les mots-clés ajoutées","Onglet Règles : sommaire et recherche","Onglet Decks : 4 decks conseillés","Rework de Le Q : Brume et Magma, nouveaux effets","Nouvelle règle : deck vide, 1 point à l'adversaire par carte à piocher","Bug de Jacen et Jaina corrigé"]},
 {version:'Version 0.3',date:'5 novembre 2026',notes:["Mode spectateur : regarde une partie en direct depuis le salon","Nouveaux Golems : JackJoy, Vic222 et GénéralBrioche, avec leurs évolutions","K-Chan passe en Magma et Cristal et reçoit son évolution L'attachiante","Nouvel animal de compagnie : Jacen et Jaina, les chats de KaTarN","Deck par défaut (ex « Test ») à 30 cartes","Onglet Decks : panneau du deck toujours ouvert pendant la modification","Onglet Decks : renommage au crayon, boutons + et − plus petits","Petites corrections : journal, Historique, copie du lien d'un deck"]},
 {version:'Version 0.2c',date:'5 novembre 2026',notes:["La Boutique réduit aussi le coût des évolutions","Éditeur de deck : teste tes placements dans un bac à sable","Statistiques repensées : recherche, classement complet, toutes tes parties comptées","Profil des joueurs réorganisé, avec ton rang au classement","Partage de deck par lien cliquable","Résumé de partie prêt à coller sur Discord","Version vérifiée dans le salon, page mise à jour automatiquement","Appli installée : nouvelle icône, lancement bleu ciel","QoL ajoutés"]},
 {version:'Version 0.2b',date:'4 novembre 2026',notes:["Nouveaux Golems : trop nombreux pour les citer","Premier animal de compagnie : Kiwi, le lapin de Titom76","K-Chan devient Magma + Brume","Plateau en miroir : ton camp en bas","Statistiques par patch et par adversaire, profils publics","Cartes et éditeur de deck : nouveaux filtres et tri","Aide en partie avec le cercle des éléments","Historique repensé, decks à 3 par ligne, 7 nouveaux avatars, QoL ajoutés"]},
 {version:'Version 0.2a',date:'3 novembre 2026',notes:["Jeu en ligne sur le site, avec comptes (pseudo et code)","Parties publiques et privées, avec discussion","Apprendre à jouer (tutoriel) et entraînement contre les Golems","Decks, historique, rejeu et profil","Avatars personnalisables"]},
 {version:'Version 0.1',date:'2 novembre 2026',notes:["Création du jeu de cartes communautaire Les Golems","Premières cartes Golem jouables avec leurs évolutions, et 10 terrains","Règles disponibles sur le site","Parties contre les Golems en 3 niveaux et jeu en ligne à deux","Decks personnalisés et historique des parties"]}
];
/* 0.6.1 : calendrier des sorties, tire de NOUVEAUTES (version et date de chaque bloc) ; heure de mise en ligne des builds connus
   (journal de main) pour departager deux versions du meme jour. Sert a l'Historique : version deduite de la date d'une partie ancienne. */
const HEURES_SORTIE={'0.2a':'09:40','0.2b':'09:45','0.2c':'11:01','0.3':'18:40','0.4':'10:09','0.5':'14:48','0.5a':'12:52','0.6':'19:46','0.6a':'11:15','0.7':''}; /* 0.7 : heure de mise en ligne A REMPLIR LE JOUR J (ex. '18:30') */
const MOIS_FR=['janvier','février','mars','avril','mai','juin','juillet','août','septembre','octobre','novembre','décembre'];
function sortiesVersions(){
  return NOUVEAUTES.map(n=>{const v=String(n.version).replace(/^Version /,''),m=/^(\d{1,2}) (\S+) (\d{4})$/.exec(String(n.date||'')),mo=m?MOIS_FR.indexOf(m[2]):-1;if(mo<0)return null;
    const h=(HEURES_SORTIE[v]||'00:00').split(':');return {v,t:new Date(+m[3],mo,+m[1],+h[0],+h[1]).getTime()}}).filter(Boolean).sort((a,b)=>a.t-b.t);
}
/* Version en ligne a la date t (ms), ou '' si avant la premiere sortie. */
function versionALaDate(t){if(!(t>0))return '';let v='';sortiesVersions().forEach(x=>{if(x.t<=t)v=x.v});return v}
/* Details des versions (bouton « Détails » des blocs de version) : trois rubriques par version, cle = titre du bloc dans NOUVEAUTES.
   Une ligne = une phrase courte pour les joueurs. Sous-liste : {t:"titre :",l:[...]}. Rubrique vide : [] (message neutre affiché).
   Nouvelle version : ajouter son entree en tete, comme dans NOUVEAUTES. */
const DETAILS_VERSIONS={
 'Version 0.6a':{
  nouveautes:[
   "Mode clair : un nouveau thème clair pour tout le site, à choisir dans Affichage (compatible avec le mode daltonien).",
   "Nouvelles animations en partie : évolution, animal de compagnie, destruction, terrain conquis, Récupérer, grosse frappe, bonus, copie, favori, début de manche, victoire et défaite.",
   "Rejeu dans la nouvelle interface : les parties rejouées s'affichent enfin avec le nouvel écran de partie, commandes du rejeu dans la colonne de droite.",
   "Guides publiés par les joueurs : un guide publié est visible tout de suite. L'auteur peut le Modifier ou le Supprimer (10 guides par jour et par compte). Une pastille « nouveau » signale chaque guide récent. Nouveau guide officiel Bien débuter, avec pictos et noms de cartes cliquables comme dans les Règles.",
   "Classement des decks : decks réordonnables par glisser-déposer, l'ordre choisi est enregistré (ou Alt + flèches au clavier).",
   "« Évolue en » dans le zoom d'une carte : en quoi elle évolue, d'un coup d'œil.",
   "Nouveaux avatars de terrain.",
   "Statistiques sans compte : un aperçu flouté, avec Se connecter et Créer un compte.",
   {t:"Confort :",l:[
    "Noms courts des cartes dans le journal de partie, les bilans de manche et l'historique : « Trigas » pour la base, « Trigas ★ » pour l'évolution.",
    "Bandeau de fin de partie : en cas d'égalité de points, il indique que la partie s'est jouée au départage.",
    "Profils accessibles : le profil de n'importe quel joueur s'ouvre, et la recherche de Statistiques trouve désormais tous les joueurs.",
    "Choix mémorisés : Publique/Privée, filtres et tris sont conservés sur l'appareil, même après un rechargement."]}],
  corrections:[
   "Vic222 s'appelle désormais Vic2222 (nom corrigé, carte inchangée). Les anciennes parties s'affichent sous le nouveau nom.",
   "Animations de partie rétablies : pioche, pose, Forge, Défausse et étoiles de fin de manche reviennent.",
   "Profil : Meilleurs decks, Meilleures cartes et MVP se remplissent de nouveau, y compris avec les anciennes parties. Un profil de plus de 50 parties s'affiche correctement. Les blocs encore vides indiquent « Pas encore assez de parties ». La saison passée apparaît sur le badge.",
   "Statistiques : chiffres par saison justes, 100 % sur une seule ligne, taux lisibles en mode daltonien. Le message « Lecture impossible » n'apparaît plus à tort.",
   "Salon : deck invalide (avec son étiquette de version) et salon d'attente corrigés, plus de défilement de la page sur un écran 1920 x 1080. Les noms de decks identiques se distinguent.",
   "Decks : Dupliquer numérote les copies : deux decks ne portent plus le même nom. Accords justes au singulier (« 1 partie », « 1 pt ») dans tout le site.",
   "Decks et Cartes : en tri par numéro décroissant, la base passe avant son évolution. Le filtre d'élément classe chaque animal selon l'élément imprimé sur sa carte.",
   "Avatar inconnu : plus d'image cassée.",
   "Chargement plus fiable : si un fichier du site ne se charge pas ou arrive en retard, la page le recharge toute seule.",
   "Decks invalides : un ancien deck devenu invalide (ex. 5 exemplaires d'une carte) ne bloque plus l'enregistrement des autres decks et se répare pas à pas. Dupliquer est grisé sur un deck invalide. L'import ramène les cartes à 3 exemplaires.",
   "Fenêtre Importer : la fenêtre « Importer tes données ? » reprend la présentation des autres fenêtres du site.",
   "Vitesse du rejeu : x2 et x4 vont vraiment deux et quatre fois plus vite, animations comprises.",
   "Quitter en Entraînement : compté comme un abandon (défaite, Revanche possible, partie dans l'historique).",
   "Partie guidée : les bulles n'apparaissent plus avant la fin des animations.",
   "Revanche : la fin de partie ne reste plus bloquée après une Revanche, et le spectateur suit bien la nouvelle partie.",
   "Bandeau de fin : « Tu remportes » ou « Tu perds » au lieu de son propre pseudo.",
   "Fenêtre de connexion : la touche Échap la ferme.",
   "Parties en ligne : une coupure brève de connexion ne fait plus déclarer un joueur absent à tort, ni perdant par abandon. La partie reste visible dans « Parties en ligne » après la reconnexion de son créateur.",
   "Classées : le résultat d'une partie, forfait compris, est toujours compté pour les deux joueurs, même après une coupure : il est rattrapé automatiquement au retour.",
   "Classée contre le Golem : le bouton « Affronter un Golem » apparaît bien après 2 minutes, même après une coupure. Le salon ne reste plus bloqué sur « Vérification de l'heure du salon » : en cas d'échec, un message clair propose Réessayer.",
   "Salon classé : l'heure d'ouverture du salon se vérifie de façon plus fiable en cas de coupure. Réessayer relance vraiment la vérification, et le bandeau d'échec affiche son propre bouton Réessayer.",
   "Historique classé : une partie classée absente de l'historique y est ajoutée au chargement du site ou à la reconnexion, sans toucher à l'Elo. Une ligne à jour n'est plus écrasée par un envoi en retard.",
   "Bouton Supprimer : dans Decks, il reprend le bouton rouge d'Abandonner. Texte de Supprimer et d'Abandonner plus lisible, dans tous les modes d'affichage.",
   "Fenêtres : à la fermeture du détail d'une partie ou du zoom d'une carte, la navigation au clavier reprend là où elle était.",
   "Récompenses de saison : le texte de la médaille Pionnier tient sur deux lignes."],
  regles:[]
 },
 'Version 0.6':{
  nouveautes:[
   "Refonte graphique complète du site : nouveaux onglets Jouer, Decks (Decks et Cartes réunis), Statistiques, Comment jouer (Règles et Guides), Nouveautés et Profil. Nouveau bandeau en haut de page, nouvelles alertes et nouveaux sélecteurs.",
   "Parties classées : 6 rangs, Améthyste, Topaze, Saphir, Émeraude, Rubis et Diamant. Ton rang se révèle après 5 parties de placement, puis tes points Elo montent ou descendent à chaque partie.",
   "Robots en classée : quand tu lances une partie classée, un minuteur de 2 minutes démarre. Si personne ne te rejoint, tu peux affronter un Golem robot de la difficulté de ton Elo : Facile sous 900, Normal de 900 à 1149, Difficile à partir de 1150. Points divisés par 2, 5 parties par jour au plus.",
   "Robot Difficile renforcé : il gagne désormais environ 65 % de ses parties contre le robot Normal.",
   "Saison 0 - Bêta : la première saison classée commence. Récompenses : la médaille Pionnier pour tout joueur ayant fini son placement, et un écu or, argent ou bronze pour le top 10.",
   {t:"Nouveau Golem : Elccino (G-021, Brume et Cristal).",l:[
    "{{Elccino, Life happens, coffee helps}} (3/1) - Café du matin : à la pose et à chaque début de manche, regarde les 2 premières cartes de ton deck, prends-en 1 et remets l'autre sous ton deck. Puis un Golem allié gagne +1 de Force.",
    "Évolution {{Elccino, Agent double SOLAEGIS ★}} (4/2) - La taupe : à la pose, regarde la main adverse et choisis-en 1 : ton adversaire la défausse. Un Golem allié gagne +2 de Force."]},
   "Nouvel animal : {{Uki, Le chien de Shifukuro}} (A-015, coût 0) - Meilleur ami : tu comptes comme un Golem allié au-dessus de ton maître.",
   "Decks conseillés de la v0.6 : 6 nouveaux decks de 30 cartes, un par archétype : Montée en puissance, Attaque rapide, Meule, Contrôle, Soutien et Combo. Ils remplacent les anciens, et les robots jouent désormais l'un d'eux, tiré au hasard.",
   "Zoom des cartes : le texte des terrains s'affiche sous l'image, comme pour les Golems. Coût, Force, éléments et points en pictos.",
   "Étiquette de version sur les decks."],
  corrections:[
   "Partie guidée : l'étape 5 fonctionne de nouveau et chaque bulle reste visible."],
  regles:[
   "Nouveau mot-clé : Récupérer X : ton Golem regagne jusqu'à X de Force perdue après des dégâts, sans jamais dépasser sa Force de base. Un Golem sans dégâts ne récupère rien.",
   "{{K-Chan, L'attachiante ★}} : « Love inconditionnel : une fois par manche, à ton tour, un Golem allié récupère 1. »",
   "{{Le Camp}} : « Fin de manche : tous les Golems ici récupèrent 1. »"],
  avenir:[
   {t:"Prochaine version (v0.6a) :",l:[
    "Rejeu des parties : il s'affiche encore avec l'ancien écran de partie. Il passera sur la nouvelle interface.",
    "Équilibrage des cartes et des éléments.",
    "Mode clair.",
    "Nouveaux guides : une pastille signalera chaque nouveau guide publié."]},
   "Version ultérieure : la nouvelle interface sera adaptée à la tablette et au téléphone."]
 },
 'Version 0.5a':{
  nouveautes:[
   "Ton deck se consulte trié par nom, avec le nombre d'exemplaires (ex. « Glad x2 »), et plus dans l'ordre de pioche.",
   "Le deck adverse n'est plus consultable : seul son nombre de cartes s'affiche.",
   "Forge et Défausse restent consultables des deux côtés."],
  corrections:[
   "Sur ordinateur, les piles Deck, Forge et Défausse de l'écran de partie s'ouvrent de nouveau (merci à Bellock).",
   "Sur téléphone, les compteurs Deck, Défausse et Forge des bandeaux se touchent pour voir les cartes."],
  regles:[]},
 'Version 0.5':{
  nouveautes:[
   "Nouvel écran de partie : la mise en page de la vue spectateur, le plateau en grand, les deux mains, la dernière carte jouée et les dernières actions. Il s'ouvre en plein écran ; « Quitter » demande confirmation.",
   {t:"6 nouveaux terrains, 16 en tout :",l:[
    "L'École (2 points) : fin de manche, le perdant pioche 1 carte.",
    "Le Karaoké (2 points) : si tu as exactement 2 Golems ici, ils gagnent +2 de Force chacun.",
    "Les Pronos (1 point) : une fois par manche, mise 1 énergie ici avec le bouton « Miser ». Fin de manche : le gagnant marque 1 point de plus par mise des deux joueurs.",
    "Le Cirque (2 points) : une fois par manche, inflige 1 dégât à un Golem adverse ici.",
    "Le Tournoi (« ? ») : vaut 1 point à la manche 1, 2 points à la manche 2 et 3 points à la manche 3.",
    "Le Versus (3 points) : un seul Golem par joueur ici. Quand tu en poses un, le Golem adverse ici perd 1 de Force."]},
   "La partie guidée garde les 10 terrains d'origine.",
   "Animaux de compagnie : pour en poser un, choisis son maître (sa case est dorée).",
   "Mode daltonien : un interrupteur à côté de ton avatar (et en partie) affiche une flèche ▲ ou ▼ sur la Force modifiée, un « ! » sur la carte fautive d'un deck et le mot « Animal » dans les listes. Désactivé par défaut, retenu sur ton appareil. Aucune couleur ne change.",
   "Nouvel onglet Guides : les vidéos de Bellock, avec le deck à importer en un clic.",
   "Déconnexion en ligne : « Reconnexion » pendant 10 secondes, puis « Hors ligne » avec un minuteur de 60 secondes ; sans retour à temps, défaite par abandon. Connecté à ton compte, tu retrouves ta partie sur n'importe quel appareil. Contre les Golems, pas de minuteur.",
   "Deck conseillé Marée bretonne : un deck Brume et Magma qui vide le deck adverse, autour du nouveau Le Q.",
   "Lien direct vers une carte, un Golem, son évolution, un animal ou un terrain : il ouvre la carte en grand.",
   "Historique : 14 parties par page.",
   "Statistiques : le classement des meilleures cartes commence à 10 parties (5 pour les joueurs).",
   "Nouveautés : les versions sont rangées par pages, avec les flèches en haut à droite."],
  corrections:[
   "Le panneau d'une évolution affiche le bon texte.",
   "Un deck refusé affiche le nom de l'évolution en cause et les éléments cités."],
  regles:[
   "4 éléments différents au plus par deck : un Golem à 2 éléments compte les deux, un animal n'en a aucun.",
   "Une évolution demande au moins un exemplaire de sa carte de base dans le deck : retirer la dernière base rend le deck injouable, l'évolution n'est pas retirée.",
   "Animaux de compagnie retravaillés : coût 0, plus de case. L'animal se glisse sous son maître déjà en jeu (un seul par maître) et lui donne +1 de Force. Il suit son maître (La Faille, Le Vaisseau, Slam), reste s'il évolue, part s'il est détruit ou remplacé. Jacen et Jaina piochent toujours quand leur maître est détruit.",
   "Un animal demande au moins un exemplaire de la base de son maître dans le deck (son évolution seule ne suffit plus).",
   "Un animal n'est toujours pas un Golem : ni ciblé, ni bonus, ni favori, et il ne compte ni pour le Trait, ni pour le cercle, ni pour un terrain.",
   "Kiwi : la Mignonitude en fin de manche, puis le décompte (avec le +1 de Kiwi), et juste après Kiwi part à la défausse.",
   "Deck par défaut et decks conseillés Tempête et Forge rapide refaits pour respecter les 4 éléments.",
   "Les Pronos : les mises sont perdues si personne ne conquiert le terrain.",
   "L'École : en cas d'égalité, personne ne pioche. Deck vide : 1 point pour l'adversaire, comme pour toute pioche.",
   "Le Cirque et Le Versus : Mode Avion protège."]
 },
 'Version 0.4':{
  nouveautes:[
   "Nouvelle vue spectateur : le plateau en grand, les deux mains, la dernière carte jouée avec son effet en clair, les dernières actions et le cercle des éléments. Pensée pour regarder une partie ou la diffuser en direct.",
   "En spectateur, clique sur une carte ou un terrain pour le voir en grand, consulte le Deck, la Défausse et la Forge de chaque joueur, et retrouve le récapitulatif de chaque manche et le MVP de la partie.",
   "Parties ouvertes et Parties en cours dans l'onglet Jouer : rejoins une place libre ou observe une partie, même déjà commencée.",
   "Les parties s'affichent en tuiles teintées : teinte neutre avant la partie (rien du deck n'est révélé), puis teinte des éléments de chaque joueur une fois la partie lancée.",
   "Si le créateur d'un salon part, l'adversaire devient le créateur et sa place se libère.",
   "Salon sur 3 colonnes : les deux joueurs, le chat et la colonne Spectateurs.",
   "Chat : le pseudo du créateur s'affiche en doré, celui de l'adversaire en bleu, celui des spectateurs en gris clair avec un petit œil. Le rôle s'affiche au survol.",
   "Onglet Jouer : le bandeau « Première partie ? » propose le tutoriel, et le bloc « Apprendre et s'entraîner » réunit le tutoriel et les trois niveaux de Golem.",
   "Infobulles sur les mots-clés des règles (Forge, Voisin, Cercle…) : survole ou touche un mot souligné.",
   "Onglet Règles : un sommaire et une recherche.",
   "Decks conseillés : 4 decks prêts à jouer dans l'onglet Decks.",
   "En partie, clique sur un terrain pour voir la Force de chaque Golem des deux camps.",
   "Onglet Cartes : filtres réalignés, le bouton « À venir » est retiré.",
   "Dans les listes de deck, les animaux ont une ligne aux couleurs de leur carte.",
   "Rework de Le Q : Brume et Magma, nouveaux effets (détail dans Équilibrage et règles).",
   "Nouvelles illustrations de Le Q (Ragebaiter et Seul contre tous) par @LeQ.",
   "Nouveautés : la feuille de route épinglée en tête et les anciennes versions repliées."],
  corrections:[
   "Le contour doré des cartes évoluées a des coins bien arrondis.",
   "Le profil d'un joueur affiche l'avatar de ses adversaires.",
   "Le bilan de fin de partie ne plante plus quand Jacen et Jaina font piocher.",
   "Les nouvelles illustrations s'affichent tout de suite, sans attendre."],
  regles:[
   "Si ton deck est vide, chaque carte que tu dois piocher donne 1 point à ton adversaire. Toutes les pioches comptent, y compris celles des effets de cartes.",
   "Le Q passe en Brume et Magma (avant : Brume et Cristal).",
   "Le Q (Ragebaiter), coût 2, Force 1. Jour de pêche : à la pose, regarde les 2 premières cartes du deck adverse. Défausses-en 1 et replace l'autre dessus.",
   "Le Q (Seul contre tous), coût 7, Force 1. Il suffit : à la pose, détruis toutes tes cartes et toutes les cartes adverses posées en plusieurs exemplaires, toi compris. Une base et son évolution comptent comme deux cartes différentes. Seul Mode Avion protège.",
   "Deck par défaut et decks conseillés Tempête, Forge rapide et Gros Golems mis à jour."]
 },
 'Version 0.3':{
  nouveautes:[
   "Mode spectateur : dans un salon, ton adversaire peut céder sa place et devenir spectateur. Un spectateur peut prendre une place libre.",
   "La liste des spectateurs s'affiche dans le salon.",
   "En partie, le spectateur voit les deux grilles, les deux mains et le journal, et il peut agrandir les cartes.",
   {t:"3 nouveaux Golems, chacun avec sa base et son évolution :",l:[
    "G-018 JackJoy : Viewer de l'ombre, puis Drafteur expérimenté (Foudre, Cristal)",
    "G-019 Vic222 : Lurker du discord, puis Baby gamer (Cristal, Roche)",
    "G-020 GénéralBrioche : Le pas sûr de lui, puis Le civ player (Cristal, Roche)"]},
   "G-006 K-Chan reçoit son évolution : L'attachiante (Magma, Cristal).",
   "Nouvel animal de compagnie : A-001 Jacen et Jaina, les chats de KaTarN.",
   "JackJoy : quand il te demande un Golem, les cases possibles s'allument en doré. Touche celle de ton choix.",
   "K-Chan (L'attachiante) : le bouton « Love » sur ta ligne d'actions, puis touche le Golem blessé à soigner.",
   "Le détail de la Force affiche les nouveaux bonus : Sub offert, Draft diff, Info tchat, Grand Général, Bonus d'adjacence, et l'état de Chance du débutant (disponible ou utilisée).",
   "Le bilan de fin de partie compte les soins de K-Chan.",
   "Onglet Decks : un clic sur un deck ouvre son panneau. Il reste ouvert pendant « Modifier » et se masque dans « Tester des placements ».",
   "Onglet Decks : le nom se renomme seulement avec le crayon.",
   "Onglet Decks : boutons + et − plus petits, champ de recherche plus court."],
  corrections:[
   "Journal : le point final reste collé au dernier mot, il ne passe plus seul à la ligne.",
   "Historique : une ancienne partie jouée avec le deck par défaut affiche la liste de cartes de l'époque (33 cartes).",
   "Copier le lien d'un deck fonctionne de nouveau sur téléphone et dans Discord."],
  regles:[
   "JackJoy (Viewer de l'ombre), coût 2, Force 1. Sub offert : si tu forges cette carte, un Golem allié en jeu de ton choix gagne +1 de Force jusqu'à la fin de la partie.",
   "JackJoy (Drafteur expérimenté), coût 4, Force 3. Draft diff : chaque fois que tu forges, un Golem allié non voisin (les diagonales comptent, jamais lui-même) gagne +1 de Force jusqu'à la fin de la partie.",
   "Sub offert et Draft diff : tu choisis la cible à chaque fois, les bonus se cumulent. Sans Golem possible, rien ne se passe. Kiwi n'est jamais choisi. La Forge éclair de Spom et le Spam de Trigas comptent comme forger.",
   "Ces bonus suivent le Golem s'il évolue, est déplacé ou échangé. Ils sont perdus s'il meurt ou est remplacé.",
   "Vic222 (Lurker du discord), coût 3, Force 1. Info tchat : les Golems alliés de sa colonne, lui compris, gagnent +2 au lieu de +1 grâce au cercle. Jamais plus de +2, même avec SuperFishman ou plusieurs Vic222.",
   "Vic222 (Baby gamer), coût 3, Force 4. Chance du débutant : la première perte de Force causée par un effet adverse est annulée en entier. Une fois par exemplaire en jeu, de nouveau disponible si la carte revient en jeu. Le cercle, le Trait et les terrains ne sont pas bloqués.",
   "GénéralBrioche (Le pas sûr de lui), coût 2, Force 1. Grand Général : les autres Golems alliés de sa colonne gagnent +1 de Force. Il n'en profite pas lui-même, plusieurs GénéralBrioche se cumulent.",
   "GénéralBrioche (Le civ player), coût 4, Force 2. Bonus d'adjacence : +1 de Force par voisin allié (haut, bas, gauche, droite), sans plafond. Les diagonales et les animaux ne comptent pas.",
   "K-Chan (Reine du tilt) passe en Magma et Cristal (avant : Magma et Brume). Coût 2, Force 2, Rage inchangée.",
   "K-Chan (L'attachiante), coût 4, Force 4. Love inconditionnel : une fois par manche, à ton tour après la Forge, retire 1 dégât à un Golem allié blessé (K-Chan comprise), sans dépasser sa Force imprimée. Facultatif, une fois par exemplaire, proposé seulement s'il y a un blessé.",
   "Jacen et Jaina, animal de KaTarN (ou Slim K), coût 1, un seul exemplaire, KaTarN obligatoire dans le deck. Ils se posent à côté de leur maître. zqrinohbqzroihg : à la pose, pioche 1 carte. Quand leur maître est détruit, pioche 1 carte, puis les chats partent à la défausse.",
   "Jacen et Jaina : si leur maître évolue, ils restent. Si tu remplaces toi-même leur maître, ils partent à la défausse sans pioche. Deck vide : pas de pioche.",
   "Deck par défaut (ex « Test ») : 30 cartes. Un exemplaire de moins pour KEKWRevan, Roi du Karaoké et Oracle des Stats."]
 },
 'Version 0.2c':{
  nouveautes:[
   "Éditeur de deck : le bouton « Tester des placements » ouvre un bac à sable avec ta grille et 3 terrains au choix.",
   "Dans le bac à sable, pose les cartes de ton deck, déplace-les, échange-les et fais-les évoluer, sans lancer de partie.",
   "La Force de chaque Golem y est calculée comme en partie, avec son détail au clic, et chaque colonne affiche son total.",
   "Cartes à dés : choisis la valeur des dés ou relance au hasard. Le favori et la copie se choisissent comme en partie.",
   "Le bac à sable indique l'énergie qu'il faut pour tout poser. Sur ordinateur, les cartes se glissent à la souris.",
   "Statistiques en quatre colonnes de même largeur : Joueurs et Terrains, Meilleures cartes, Cartes les plus jouées, Éléments.",
   "Bouton « Voir tout » pour afficher un classement en entier, avec une recherche par nom.",
   "Toutes tes parties comptent désormais dans les statistiques, pas seulement les 50 dernières.",
   "Profil réorganisé : en haut, tes meilleurs decks, tes meilleures cartes et tes cartes les moins bonnes. En bas, tes cartes MVP, tes résultats contre l'ordinateur et tes adversaires les plus affrontés.",
   "Ton rang au classement s'affiche dans ton bilan, avec ton taux de victoire, tes parties et ta série.",
   "Tes adversaires les plus affrontés s'affichent avec leur avatar.",
   "Un profil privé s'ouvre aussi depuis le classement : il ne montre que le pseudo, l'avatar, le taux de victoire et le nombre de parties.",
   "Partage de deck : « Copier pour Discord » prépare un message avec le nom du deck, ses cartes, ses éléments et un lien « Voir le deck ». « Copier le lien seul » sert à l'envoyer à un ami.",
   "Le lien ouvre le deck sur le site : liste des cartes, courbe des coûts, puis Importer ou Jouer, même sans compte.",
   "Fin de partie et Historique : « Partager le résumé » copie un résumé prêt à coller sur Discord, avec le résultat, les manches, le MVP, les chiffres clés et le lien du site.",
   "Salon : la version du jeu de chaque joueur est affichée. Si elles diffèrent, le bouton Prêt est bloqué et affiche « Versions différentes ».",
   "Parties publiques : une partie lancée sur une autre version affiche « Version différente » à la place de Rejoindre.",
   "Nouvelle version du site : un encadré s'affiche dans l'en-tête, puis la page se recharge toute seule dès que tu as fini ta partie, ton salon ou ta saisie.",
   "Salon et parties publiques : le deck de ton adversaire reste caché. Tu vois seulement qu'il a choisi un deck et son nombre de cartes.",
   "La version du jeu s'affiche dans l'en-tête (touche-la pour voir les nouveautés), dans le salon, dans l'Historique et sur chaque bloc des Nouveautés.",
   "Historique : « Copier les données » copie les données d'une partie, à joindre à un signalement de bug.",
   "Appli installée : nouvelle icône et écran de lancement sur fond bleu ciel, le logo ne saute plus au démarrage. Si l'ancienne icône reste, désinstalle puis réinstalle l'appli.",
   "Historique : le mot « Golem » prend la couleur du niveau de l'ordinateur affronté (Facile en vert, Normal en jaune, Difficile en rouge), avec une légende.",
   "Bac à sable « Tester des placements » : un encart Détail reste affiché sous ta main, et le calcul de la Force s'y affiche au lieu d'ouvrir une fenêtre.",
   {t:"QoL ajoutés :",l:[
    "Pictogrammes des éléments dans les textes des Nouveautés et de ces Détails.",
    "Statistiques : messages vides harmonisés, et « Aucune partie avec ces filtres. » quand un filtre vide la liste.",
    "La bulle « À toi » est retirée : le grand bandeau « À toi de jouer » reste.",
    "Boutons Fermer harmonisés dans toutes les fenêtres."]}],
  corrections:[
   "Deux joueurs sur des versions différentes ne peuvent plus lancer une partie ensemble : la partie risquait de se dérégler.",
   "« Remplacer » et « Améliorer » deviennent « Remp. » et « Amél. » quand la case est trop étroite : le bandeau tient toujours sur une ligne, sur téléphone comme sur un petit écran.",
   "Champs du code secret : un œil affiche ou masque ce que tu tapes.",
   "Statistiques : le classement des joueurs commence à 5 parties, et une note indique combien de joueurs n'en ont pas encore assez.",
   "Journal : en revenant à la partie, il se replace sur la manche en cours.",
   "Historique : le bouton « Vider » est retiré, la pagination passe à gauche.",
   "Statistiques : les parties jouées depuis la sortie de la 0.2c sont bien rangées en 0.2c."],
  regles:[
   "La Boutique : jouer un Golem ici coûte 1 de moins, évolutions comprises. Avant, la réduction ne valait que pour la pose et le remplacement.",
   "La réduction s'applique après la hausse de coût d'Elessar, sans descendre sous 0. Elle ne touche jamais un animal de compagnie.",
   "Sur une case de La Boutique, le bouton Améliorer affiche le coût réduit.",
   "Onglet Règles et livret mis à jour."]
 },
 'Version 0.2b':{
  nouveautes:[
   {t:"9 nouveaux Golems, chacun avec sa base et son évolution :",l:[
    "G-009 Apo : Clown junior, puis Maître du déguisement (Magma, Roche)",
    "G-010 SuperFishman : Elosit Master, puis Monsieur Poisson (Roche, Cristal)",
    "G-011 Titom76 : Le Breton, puis Maître du bilig (Brume, Foudre)",
    "G-012 Spom : Innocent ordinaire, puis A encore menti (Foudre, Magma)",
    "G-013 Elessar : Le p'tit jeune du Discord, puis Le pomplard (Roche, Foudre)",
    "G-014 Velnen : Spécialiste du potager, puis Le chansonnier (Roche, Brume)",
    "G-015 Shifukuro : Le chatteur, puis Le modérateur (Roche, Cristal)",
    "G-016 Bellock : La terreur du PBE, puis Aiges Captain (Brume, Magma)",
    "G-017 Loxim : Le roi de l'impro, puis Le Ace de Aiges (Brume, Magma)"]},
   "Premier animal de compagnie : A-011 Kiwi, le lapin de Titom76. Un nouveau type de carte, sans Force ni élément.",
   "Vidéo de présentation des nouvelles cartes dans l'onglet Nouveautés.",
   "Filtre « Animaux » dans l'onglet Cartes et dans l'éditeur de deck.",
   "Plateau en miroir : ton camp est toujours en bas.",
   "Force sur la grille en couleur : verte au-dessus de la Force de base, rouge en dessous, blanche à égalité. Le détail complet s'ouvre au clic.",
   "Carte agrandie : Force et coût redessinés, coût augmenté par Elessar en rouge avec son explication, cœur du favori.",
   "Carte agrandie 10 % plus grande, aussi dans l'éditeur de deck.",
   "Indicateur de tour : une bande au-dessus de ta main montre à qui c'est de jouer.",
   "Boutons de partie rangés sur 2 lignes de 3, avec un seul bouton Caramel.",
   "Aide « ? » en partie réorganisée, avec le cercle des éléments en image.",
   "Statistiques : barre de filtres par patch et par adversaire (Facile, Normal, Difficile, Entre joueurs).",
   "Classement des joueurs filtré par niveau, avec avatars ronds et filtre de patch.",
   "Profils publics : un clic sur un joueur du classement ouvre son profil, le survol montre son bilan. Un interrupteur te laisse choisir Profil public ou Profil privé.",
   "Profil repensé : meilleurs decks, meilleures cartes, cartes MVP, cartes les moins bonnes, adversaires contre l'ordinateur et entre joueurs.",
   "Onglet Cartes et éditeur de deck : filtres par type et par élément, recherche par nom, choix « Au moins un » ou « Tous », tri par numéro, coût ou Force.",
   "Salon public ou privé au choix, par un interrupteur.",
   "Historique repensé, decks à 3 par ligne, 7 nouveaux avatars.",
   "Deck invalide : un encadré et une bordure rouge expliquent ce qui ne va pas.",
   "Journal de partie : ton adversaire ne voit plus quelle carte tu pioches avec Bellock ou Loxim.",
   "Nouvelles illustrations : Indra, Titom76, Trigas, Bellock et Elessar."],
  corrections:[
   "Parties en ligne parfois non enregistrées : corrigé. Le résultat est enregistré chez les deux joueurs.",
   "Partie bloquée quand l'adversaire quittait : corrigé.",
   "Quitter une partie en cours compte comme un abandon.",
   "Si l'enregistrement échoue, le message « Partie non enregistrée » te prévient.",
   "Fin de la manche 3 : les choix qui ne changent plus rien sont faits automatiquement.",
   "Deux parties en ligne perdues ont été retrouvées et remises dans les historiques.",
   "Replay des parties amélioré.",
   "Alrevan : sa Force moyenne affichée vient de ses vrais lancers de dés.",
   "Copieurs : une info-bulle indique l'effet copié.",
   "Vidéos : plus de lecture automatique. Elles se lancent au clic, avec le son, une seule fois.",
   "Historique lisible sur téléphone, sur 3 lignes.",
   "Sur téléphone, « Remplacer » devient « Remp. » pour tenir dans la case.",
   "Statistiques : tous les patchs sont cochés par défaut.",
   "Onglet Cartes : la grille ne reste plus vide après Réinitialiser.",
   "Images de plusieurs cartes corrigées."],
  regles:[
   "K-Chan devient Magma et Brume (avant : Magma et Roche).",
   "Bellock et Loxim : quand tu forges l'un, tu pioches au hasard un exemplaire de l'autre dans ton deck, base ou évolution. Avant, tu choisissais.",
   "Animaux de compagnie : ni Force ni élément. Ils se posent sur une case voisine de leur maître, qui doit être en jeu, et partent si leur maître meurt.",
   "Un animal n'est jamais concerné par les effets des Golems et n'est jamais MVP. La Boutique ne réduit pas son coût.",
   "Deck : 1 seul exemplaire de chaque animal, et seulement si son maître est dans le deck.",
   "Cercle des éléments : jamais plus de +1, sauf effet de carte (SuperFishman).",
   "Copie : un copieur ne prend que l'effet, ni le nom, ni la Force, ni les éléments. Copier un copieur donne l'effet qu'il a copié.",
   "Caramel à volonté (Titom76 évolué) : une fois par manche et par carte.",
   "Forge éclair (Spom) : chaque Spom en jeu donne la sienne.",
   "Onglet Règles et livret mis à jour, avec une partie Animaux de compagnie."]
 },
 'Version 0.2a':{
  nouveautes:[
   "Les Golems ont leur propre site, avec des comptes : un pseudo et un code secret.",
   {t:"2 nouveaux Golems, avec leur vidéo de présentation :",l:[
    "G-007 Indra : La Groupie, puis La Fan enflammée (Cristal, Magma)",
    "G-008 Glad : /Poll, puis GymRat (Roche, Magma)"]},
   "Avatars : choisis-en un dans la galerie ou importe ta propre image, recadrée.",
   "Onglet Jouer : crée une partie publique ou privée, rejoins une partie privée, apprends à jouer avec le tutoriel guidé ou entraîne-toi contre un Golem.",
   "Parties publiques affichées en cartes.",
   "Salon : code et lien d'invitation, deck choisi, bouton Prêt, compte à rebours, discussion, taux de victoire et face-à-face.",
   "En partie : réactions rapides, signal quand c'est ton tour et quand ton adversaire arrive.",
   "Decks enregistrés sur ton compte (10 au maximum) et partage de deck par code.",
   "Historique des 50 dernières parties, rejeu et profil.",
   "Onglet Statistiques : classement, Joueurs, Cartes, Terrains et Éléments, par patch.",
   "Carte agrandie : taux de victoire de la carte, pour toi et pour la communauté.",
   "Bandeau « Nouvelle version » quand le site est mis à jour.",
   "Site installable sur téléphone, onglets à icônes, aperçu du lien sur Discord."],
  corrections:[
   "Favori d'Indra : corrigé quand le favori meurt à la pose.",
   "Encarts d'évolution corrigés sur plusieurs cartes. Les effets sont écrits en « tu ».",
   "Salon : place libre alignée, bouton Rejoindre plus petit.",
   "Enclumes de coût bien visibles et colonnes en bleu ciel.",
   "Statistiques : les cartes et les éléments ne comptent que les decks des joueurs, pas celui de l'ordinateur.",
   "Alrevan : ses vrais lancers de dés sont enregistrés.",
   "Les salons de plus de 7 jours sont nettoyés automatiquement."],
  regles:[
   "Second joueur de chaque manche : il pioche 1 carte au lieu de 2 à son premier tour.",
   "Trait cumulé : pour chacun de ses éléments, un Golem gagne +1 par voisin allié qui le partage, sans plafond. Avant : +1 par élément partagé, +2 au maximum.",
   "Forge : 0 ou 1 carte par tour, seule source d'énergie.",
   "Plus de match nul : à égalité, la plus grande Force totale au dernier décompte gagne, puis le plus de terrains conquis, puis le joueur qui jouait en second à la manche 3.",
   "Abandon possible à tout moment : ton adversaire gagne.",
   "Règles réécrites et livret de 5 pages mis à jour."]
 },
 'Version 0.1':{
  nouveautes:[
   "Création du jeu de cartes communautaire Les Golems : chaque membre retenu a sa carte et son évolution.",
   "Parties en 3 manches, sur 3 terrains tirés parmi 10, avec une grille de 3 sur 3 par joueur.",
   "5 éléments et leur cercle : Magma, Cristal, Foudre, Brume et Roche.",
   {t:"6 Golems jouables :",l:[
    "G-001 KaTarN : Romain 18 ans, puis Slim K (Magma, Foudre)",
    "G-002 Alrevan : Le High Roller Originel, puis KEKWRevan (Brume, Roche)",
    "G-003 Cyrdan : Le Champion des Tournois Annexes, puis Le Roi du Karaoké (Cristal, Roche)",
    "G-004 Le Q : Maître de l'Excel, puis L'Oracle des Stats (Brume, Cristal)",
    "G-005 Trigas : Accro au Gacha, puis Le Roi du Mobile (Foudre, Brume)",
    "G-006 K-Chan : Reine du tilt, évolution à venir (Magma, Roche)"]},
   "10 terrains : Le Buzzer, Le Camp, L'Écran du MJ, La Boutique, La Faille, La Nuit au Village, Le Plateau de Jeu, Le Vaisseau, Le Carrousel et La Salle Verrouillée.",
   "Orotembu en aperçu dans l'onglet Cartes.",
   "Entraînement contre les Golems en 3 niveaux : Facile, Normal et Difficile.",
   "Jeu en ligne à deux par code de salon, avec reprise après une coupure.",
   "En partie : carte jouée montrée en grand aux deux joueurs, aide « ? », vitesse Normal ou Rapide, son, journal avec cartes cliquables, récapitulatif de manche et animations.",
   "Fin de partie : bilan carte par carte et résumé à copier.",
   "Éditeur de deck, historique des 50 dernières parties, onglets Cartes et Règles."],
  corrections:[],
  regles:[
   "KEKWRevan (Alrevan évolué) coûte 3. High Roll : à la pose, lance 2 dés, ta Force est leur somme. Sur un double, ta Force est la valeur d'un seul dé.",
   "L'Oracle des Stats (Le Q évolué) coûte 3.",
   "Deck : 24 à 30 cartes, 3 exemplaires au maximum de chaque carte.",
   "Spam (Trigas) : l'énergie de la carte placée en Forge n'arrive qu'au tour suivant.",
   "Mode Avion bloque Slim K, pas les terrains."]
 }
};
/* Pictos d'elements, ajoutes au rendu (blocs Nouveautes et Details, futurs blocs compris) :
   nom d'element ecrit avec majuscule et isole (pas dans un mot ni un mot compose avec -) -> picto juste avant le mot, insecables ;
   parens=true (Details) : liste entre parentheses faite seulement d'elements, « (Magma, Roche) » -> pictos seuls, nom en infobulle. */
const EL_TXT={Magma:'magma',Cristal:'cristal',Foudre:'foudre',Brume:'brume',Roche:'roche'};
function textePictos(s,parens){
  const f=document.createDocumentFragment(),pic=n=>{const i=document.createElement('img');i.className='el-pic';i.src=imgV('cartes/'+EL_TXT[n]+'.png');i.alt=n;i.title=n;return i},
    N='(?:Magma|Cristal|Foudre|Brume|Roche)',
    re=new RegExp((parens?'\\(('+N+'(?:, '+N+')*)\\)|':'')+'(?<![\\p{L}\\p{N}-])('+N+')(?![\\p{L}\\p{N}-])','gu');
  let k=0,m;
  while((m=re.exec(s))){
    f.append(s.slice(k,m.index));k=re.lastIndex;
    if(parens&&m[1]){const p=document.createElement('span');p.className='el-mot';p.append('(');m[1].split(', ').forEach((n,j)=>{if(j)p.append(' ');p.append(pic(n))});p.append(')');f.append(p)}
    else{const n=m[parens?2:1],w=document.createElement('span');w.className='el-mot';w.append(pic(n),' '+n);w.querySelector('img').alt='';f.append(w)}
  }
  f.append(s.slice(k));return f;
}
/* 0.6 : nom de carte cite entre {{ }} (charte du 9 nov.) : cliquable (zoom), couleur de son type, gras.
   Bloc court : {{Nom}} (nom seul ; evolution : {{Nom ★}}). Details : {{Nom, Titre}} (nom long ; evolution suivie de ★). Terrain : {{Le Camp}}.
   Carte absente des donnees (pas encore integree) : nom en couleur Golem, non cliquable. */
function lienNv(cle){
  const D=window.GolemsDonnees,K=D?.interface?.couleursTexte||{},evo=/ ★$/.test(cle),n=cle.replace(/ ★$/,''),MM=window.GolemsMoteur||{},cs=Object.values(MM.CARTES||{});
  const C=cs.find(c=>!!c.base===evo&&D?.nomLong&&D.nomLong(c.id)===n)||cs.find(c=>evo?(c.base&&cs.find(b=>b.id===c.base)?.nom===n):(!c.base&&c.nom===n)),
    T=!C&&(MM.TERRAINS||[]).find(t=>t.nom===n);
  const b=document.createElement(C||T?'button':'b');b.className='nv-lien';b.textContent=cle;
  b.style.color=T?K.terrain:C?.animal?K.animal:C?.base?K.evolution:K.golem;
  if(C||T){b.type='button';b.onclick=()=>{if(T){typeof ouvreTerrainGalerie==='function'&&ouvreTerrainGalerie(T)}else zoom(imgV('cartes/'+C.id+'.jpg'),C.nom)}}
  return b;
}
function texteNv(s,parens){
  const f=document.createDocumentFragment();String(s).split(/\{\{([^}]+)\}\}/).forEach((x,i)=>{if(i%2)f.append(lienNv(x));else if(x)f.append(textePictos(x,parens))});return f;
}
/* Fenetre « Détails » : note de patch complete d'une version, en trois rubriques. Fermer, Echap ou clic dehors. */
const RUBRIQUES_VERSION=[['nouveautes','Nouveautés'],['regles','Équilibrage et règles'],['corrections','Corrections'],['avenir','À venir']];
function ouvreDetailsVersion(n,bouton){
  $('popDetailsVersion')?.remove();
  const mk=(t,c,x)=>{const e=document.createElement(t);if(c)e.className=c;if(x!=null)e.textContent=x;return e};
  const D=DETAILS_VERSIONS[n.version],v=mk('div','voile'),x=mk('div','boite dv-boite'),te=mk('div','dv-tete'),h=mk('h2','',n.version),co=mk('div','dv-corps'),pb=mk('div','p-btns dv-pied'),fe=mk('button','sc-btn sc-secondaire fermer','Fermer');
  v.id='popDetailsVersion';v.setAttribute('role','dialog');v.setAttribute('aria-modal','true');v.setAttribute('aria-labelledby','dvTitre');h.id='dvTitre';fe.type='button';
  const fr=s=>s.replace(/« /g,'«\u00a0').replace(/ (»|:)/g,'\u00a0$1'),liste=L=>{const u=mk('ul');L.forEach(y=>{const li=mk('li');li.append(texteNv(fr(typeof y==='string'?y:y.t),true));if(y.l)li.append(liste(y.l));u.append(li)});return u};
  RUBRIQUES_VERSION.forEach(([k,titre])=>{const L=D[k]||[];if(k==='avenir'&&!L.length)return;co.append(mk('h3','',titre),L.length?liste(L):mk('p','dv-vide',k==='corrections'&&n===NOUVEAUTES[NOUVEAUTES.length-1]?'Première version du jeu.':'Rien pour cette version.'))});
  const esc=e=>{if(e.key==='Escape')ferme()},ferme=()=>{v.remove();removeEventListener('keydown',esc);bouton?.focus()};addEventListener('keydown',esc);
  fe.onclick=ferme;v.onclick=e=>{if(e.target===v)ferme()};
  te.append(h,mk('time','',n.date));pb.append(fe);x.append(te,co,pb);v.append(x);document.body.append(v);fe.focus({preventScroll:true});
}
/* Etiquette de version d'un bloc (« Version 0.2b » -> v0.2b), en haut a droite. */
const etqBloc=v=>{const e=document.createElement('span');e.className='etq-v nv-etq';e.textContent='v'+String(v).replace(/^Version /,'');return e};
NOUVEAUTES.forEach(n=>{
  const a=document.createElement('article'),h=document.createElement('h3'),d=document.createElement('time'),u=document.createElement('ul');
  a.className='note';h.textContent=n.version;d.textContent=n.date;
  n.notes.forEach(x=>{const li=document.createElement('li');li.append(texteNv(x,true));u.append(li)});
  a.append(h,etqBloc(n.version),d,u);$('notes').append(a);
  /* Bouton « Détails » : blocs de version seulement (jamais les blocs video), s'ils ont leurs details. */
  if(DETAILS_VERSIONS[n.version]){const b=document.createElement('button');b.type='button';b.className='sc-btn sc-tertiaire nv-det';b.textContent='Détails';
    b.setAttribute('aria-haspopup','dialog');b.setAttribute('aria-label','Détails de la '+n.version.toLowerCase());b.onclick=()=>ouvreDetailsVersion(n,b);a.classList.add('a-det');a.append(b)}
});
/* Une seule liste du plus récent au plus ancien (grille 2 colonnes, gauche puis droite) : tout nouveau bloc s'insère en tête.
   Blocs vidéo : présentation seule, cadrée à la hauteur du bloc voisin, juste avant le bloc de sa version. Un bloc par entrée, le plus récent en tête. */
const NOUVEAUX_GOLEMS=[
 {titre:'Version 0.6',date:DATE_V06,version:'Version 0.6',apres:true,
  video:'videos/patch_06.mp4',affiche:'videos/patch_06.jpg',aria:'Présentation de la version 0.6'},
 {titre:'Nouvel écran de partie. Et plus encore…',date:DATE_V05,version:'Version 0.5',puces:["Nouvel écran de partie", "6 nouveaux terrains", "Animaux de compagnie retravaillés", "4 éléments différents au plus par deck", "Decks conseillés retravaillés", "Connexion et reprise de la partie", "Mode daltonien", "Nouvel onglet Guides"],apres:true,
  video:'videos/patch_05.mp4',affiche:'videos/patch_05.jpg',aria:'Présentation de la version 0.5'},
 {titre:'Nouveaux Golems disponibles : GénéralBrioche, JackJoy, K-Chan, Vic222.\nEt plus encore…',date:'5 novembre 2026',version:'Version 0.3',puces:["Mode spectateur depuis le salon", "Golems : JackJoy, Vic222, GénéralBrioche", "K-Chan passe en Magma et Cristal", "Évolution de K-Chan : L'attachiante", "Nouvel animal : Jacen et Jaina", "Deck par défaut à 30 cartes", "Decks : panneau toujours ouvert", "Renommage du deck au crayon"],apres:true,
  video:'videos/nouvelles_cartes_05nov.mp4',affiche:'videos/nouvelles_cartes_05nov.jpg',aria:'Présentation des nouvelles cartes de la version 0.3'},
 {titre:'Nouveaux Golems disponibles : trop nombreux pour les citer',date:'4 novembre 2026',version:'Version 0.2b',puces:["De nombreux nouveaux Golems", "Premier animal : Kiwi, de Titom76", "K-Chan devient Magma + Brume", "Plateau en miroir : ton camp en bas", "Statistiques par patch et adversaire", "Profils publics des joueurs", "Nouveaux filtres et tri des cartes", "Aide : le cercle des éléments"],
  video:'videos/nouvelles_cartes_04nov.mp4',affiche:'videos/nouvelles_cartes_04nov.jpg',aria:'Présentation des nouvelles cartes'},
 {titre:'Nouveaux Golems disponibles : Indra et Glad',date:'3 novembre 2026',version:'Version 0.2a',puces:["Jeu en ligne, avec comptes", "Parties publiques et privées", "Discussion pendant la partie", "Tutoriel et entraînement", "Decks et historique des parties", "Rejeu des parties et profil", "Avatars personnalisables"],
  video:'videos/nouveaux_golems.mp4',affiche:'videos/nouveaux_golems.jpg',aria:'Présentation des nouveaux Golems'}
];
NOUVEAUX_GOLEMS.forEach(g=>{const mk=(t,c,x)=>{const e=document.createElement(t);if(c)e.className=c;if(x!=null)e.textContent=x;return e};
  /* Nouveautes B4 (16 - Nouveautés trois lignespresB4, decision de Romain) : UN SEUL bloc par version ; la video entre dans le bloc de sa version,
     a gauche, les puces courtes a droite (8 lignes au plus, le reste dans Details). */
  const a=[...$('notes').children].find(x=>x.querySelector('h3')?.textContent===g.version),l=mk('div','nv-corps'),v=mk('video','nv-video');
  v.src=g.video;v.poster=g.affiche;v.preload='metadata';v.controls=v.playsInline=true;v.volume=0.6;
  v.setAttribute('playsinline','');v.setAttribute('aria-label',g.aria);
  if(!a)return;{const u=a.querySelector(':scope>ul');if(g.puces){u.replaceChildren();g.puces.forEach(x=>{const li=document.createElement('li');li.append(texteNv(x,true));u.append(li)})}
  l.append(v,u)}a.querySelector(':scope>time').after(l);a.classList.add('nv-avid');
  /* Aucune lecture automatique : tu cliques sur lecture (avec le son, volume 0,6). Une seule lecture, pas de boucle. Pause hors de l'onglet. */
  const sec=$('nouveautes');new MutationObserver(()=>{if(sec.hidden)v.pause()}).observe(sec,{attributes:true,attributeFilter:['hidden']});
});
/* Nouveautes (0.4) : blocs epingles, Feuille de route, pagination.
   Epingles : 2 au plus, en tete et COMPRIS dans les 6 blocs affiches (1 epingle : 5 recents ; 2 epingles : 4 recents) (ligne 1 colonnes 1 et 2 ; un seul epingle : le bloc le plus recent prend la colonne 2 ;
   telephone : epingles en premier). Etat dans Firebase (nouveautes/epingles), ecrit par le seul compte de Romain ; noeud vide = Feuille de route epinglee.
   Pagination : 6 blocs au total, epingles compris ; un couple version + video n'est jamais coupe (il passe entier a la page suivante) ;
   page 1 = epingles + recents ; pages suivantes : 6 blocs chacune, sans epingles. Fleches < x / n > a droite de la ligne d'intro
   (alignees sur le bord droit de la grille), masquees s'il n'y a qu'une page ; changer de page remonte en haut de la liste. */
const FEUILLE_DE_ROUTE=[
 {v:'0.7',nom:'Équilibrage et bug corrigé (Café du matin)',etat:'actuelle'},
 {nom:'Tournois',etat:'tard'},
 {nom:'Nouveau type de carte : Événements',etat:'tard'},
 {nom:'Équilibrages',etat:'tard'},
 {v:'1.0',nom:'Sortie officielle',etat:'tard'}
];
const ETATS_FDR={precedente:'Version précédente',actuelle:'Version actuelle',proche:'Prochaine mise à jour',prevu:'Prévu',tard:'Plus tard'};
const SVG_EPINGLE='<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M14.6 2.6l6.8 6.8-1.9.9-3.4 3.4.4 4.6-1.6 1.6-4.2-4.2-5.6 5.6-1.3-1.3 5.6-5.6-4.2-4.2 1.6-1.6 4.6.4 3.4-3.4z"/></svg>';
const NV={page:0,par:6,blocs:[...$('notes').children]}; /* blocs : ordre d'origine, du plus recent au plus ancien */
{
  const mk=(t,c,x)=>{const e=document.createElement(t);if(c)e.className=c;if(x!=null)e.textContent=x;return e};
  const N=$('notes');
  /* Identifiants des blocs : v0.3 (version), video-v0.3 (video de la version), feuille-de-route */
  [...N.children].forEach(a=>{const v=a.querySelector('.nv-etq')?.textContent||'';a.dataset.id=(a.classList.contains('nv-golem')?'video-':'')+v});
  const f=mk('article','note nv-fdr'),h=mk('h3'),ol=mk('ol','fdr-l');f.dataset.id='feuille-de-route';
  h.append('Feuille de route');f.append(h,mk('p','fdr-sous','Les prochaines étapes du jeu, dans l’ordre prévu.'));
  FEUILLE_DE_ROUTE.forEach(x=>{const li=mk('li','fdr-'+x.etat),t=mk('div','fdr-t');if(!matchMedia('(min-width:700px)').matches)li.style.minHeight='42px'; /* 0.7 : lignes plus espacees (ordinateur : 5 lignes reparties sur la hauteur du bloc) */
    if(x.v)t.append(mk('small','','Version '+x.v));t.append(mk('b','',x.nom));li.append(mk('span','fdr-pt'),t,mk('span','fdr-etat',ETATS_FDR[x.etat]));ol.append(li)});
  f.append(ol);N.prepend(f);
}
/* Unites de pagination, du plus recent au plus ancien : un bloc seul, ou un couple version + video de la meme version (jamais coupe). */
function unitesNotes(){
  const L=NV.blocs,U=[];
  for(let i=0;i<L.length;i++){const a=L[i],b=L[i+1],va=a.querySelector('.nv-etq')?.textContent;
    if(b&&va&&va===b.querySelector('.nv-etq')?.textContent&&a.classList.contains('nv-golem')!==b.classList.contains('nv-golem')){U.push([a,b]);i++}else U.push([a])}
  return U;
}
const EPINGLE_VERSION='0.7';
function epinglesNotes(){
  const ids=new Set([...$('notes').querySelectorAll(':scope>article.note')].map(a=>a.dataset.id));
  /* 0.5 (decision de Romain) : epingles AUTOMATIQUES. 1 = Feuille de route, 2 = bloc de la version la plus recente (NOUVEAUTES[0]) ;
     a chaque nouvelle version l'ancienne se desepingle seule. Les epingles de Firebase (nouveautes/epingles) sont ignorees. */
  /* 0.7 : seul le bloc de EPINGLE_VERSION est epingle (0.6a desepinglee) ; tant que le bloc 0.7 n'est pas colle, seule la Feuille de route l'est. */
  const l=['feuille-de-route','v'+EPINGLE_VERSION];
  return l.filter(x=>ids.has(x));
}
function peintNotes0(){
  const mk=(t,c,x)=>{const e=document.createElement(t);if(c)e.className=c;if(x!=null)e.textContent=x;return e};
  const N=$('notes'),ep=epinglesNotes(),fdr=N.querySelector('.nv-fdr'),par=id=>N.querySelector(':scope>article[data-id="'+id+'"]');
  /* Feuille de route desepinglee : premier bloc de la liste (Romain peut la reepingler) */
  const U=[...(ep.includes('feuille-de-route')?[]:[[fdr]]),...unitesNotes()].map(u=>u.filter(a=>!ep.includes(a.dataset.id))).filter(u=>u.length);
  const pages=[[]];let n=ep.length;
  /* 0.5a.1 (decision de Romain) : ordre chronologique strict, chaque page remplie au maximum. Un couple version + video
     peut etre coupe en fin de page : la video passe en haut de la page suivante. Aucun bloc plus ancien ne remonte. */
  U.flat().forEach(a=>{if(n>=NV.par&&n>0){pages.push([]);n=0}pages[pages.length-1].push(a);n++});
  if(pages.length>1&&!pages[0].length&&!ep.length)pages.shift(); /* 0.5.2 : epingles seuls en page 1 s il ne reste pas de place */
  NV.page=Math.max(0,Math.min(NV.page,pages.length-1));
  {const cols=getComputedStyle(N).gridTemplateColumns.split(' ').filter(Boolean).length||1; /* B4 : hauteur d'une page pleine, la pagination reste a sa place */
   N.style.gridTemplateRows=innerWidth<700?'':'repeat('+Math.ceil(NV.par/cols)+',var(--h-bloc,297px))'}
  const ordre=[...ep.map(par),...pages.flat()],vus=new Set([...(NV.page===0?ep.map(par):[]),...pages[NV.page]]);
  if(ordre.some((a,i)=>N.children[i]!==a))ordre.forEach(a=>N.append(a));
  N.querySelectorAll(':scope>article.note').forEach(a=>{const e=ep.includes(a.dataset.id);a.classList.toggle('nv-epingle',e);a.hidden=!vus.has(a);
    a.querySelector('h3>.nv-pin')?.remove();if(e)a.querySelector('h3').prepend(Object.assign(mk('span','nv-pin'),{innerHTML:SVG_EPINGLE}));
    if(a.hidden)a.querySelector('video')?.pause()});
  /* B4 : pagination sous les blocs, calee en bas a droite (un seul composant partout), creee une fois */
  {
    let z=document.querySelector('#nouveautes .nv-pages');
    if(!z){z=mk('div','nv-pages bas');z.setAttribute('role','navigation');z.setAttribute('aria-label','Pages des nouveautés');
      const p=mk('button','j-btn nv-prec','<'),s=mk('button','j-btn nv-suiv','>');p.type=s.type='button';
      p.title='Page précédente';s.title='Page suivante';p.setAttribute('aria-label',p.title);s.setAttribute('aria-label',s.title);
      p.onclick=()=>pageNotes(-1);s.onclick=()=>pageNotes(1);z.append(p,mk('span','nv-num'),s);
      $('notes').after(z)}
    z.hidden=pages.length<2;z.querySelector('.nv-num').textContent=(NV.page+1)+'/'+pages.length;
    z.querySelector('.nv-prec').disabled=NV.page===0;z.querySelector('.nv-suiv').disabled=NV.page>=pages.length-1}
}
/* B4 : coupe propre des blocs trop longs (lignes entieres masquees), le bouton Details donne le reste */
function peintNotes(){peintNotes0();if(innerWidth<700)return;
  for(const n of document.querySelectorAll('#notes>.note')){if(!n.offsetParent)continue;n.querySelectorAll('.coupe').forEach(x=>x.classList.remove('coupe'));
    const lim=n.getBoundingClientRect().bottom-14,li=[...n.querySelectorAll('ul>li,ol>li')];
    for(let k=li.length-1;k>0&&li[k].getBoundingClientRect().bottom>lim;k--)li[k].classList.add('coupe')}}
function pageNotes(d){
  NV.page+=d;peintNotes();
  const y=$('notes').getBoundingClientRect().top+scrollY-(document.querySelector('body>nav,nav.onglets')?.offsetHeight||0)-12;
  if(y<scrollY)scrollTo({top:Math.max(0,y)});
}
peintNotes();
/* 0.6 : epingles automatiques (depuis la 0.5) : bouton Epingler et ecriture dans Firebase retires. */

