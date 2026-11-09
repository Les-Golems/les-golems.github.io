/* Les Golems : donnees de l'interface (hors moteur, hors regles) : numeros affiches et cartes a venir (onglet Cartes), decks conseilles (Decks > Deck conseille) et bac a sable de l'editeur de deck.
   Cles = codes de cartes (cartes/donnees/golems.js, animaux.js). Script classique : remplit window.GolemsDonnees.interface ; a charger avant onglets/decks.js. */
(function(r){'use strict';
(r.GolemsDonnees=r.GolemsDonnees||{}).interface={
/* Numéro AFFICHÉ des Golems (ordre où ils deviennent jouables) : code interne -> numéro. Les codes internes ne changent jamais.
   Golem à venir : absent de la table, aucun numéro affiché. Prochain jouable : 22. */
numeroAffiche:{'001':1,'002':2,'003':3,'004':4,'007':5,'008':6,'013':7,'009':8,'029':9,'037':10,'026':11,'036':12,'018':13,'041':14,'025':15,'015':16,'016':17,'035':18,'042':19,'020':20,'021':21},
/* Animaux de compagnie : numero affiche A-0NN, table a part (codes internes 9xx). */
numeroAnimal:{'901':11,'902':1,'903':15},
/* Cartes à venir, hors moteur : retirer la ligne d'un membre quand sa carte arrive, les numéros restent fixes. */
aVenir:[
 ['005','Driscop'],['006','Falys'],['010','Orotembu'],
 ['011','Sleepy'],['012','Simon'],['014','Boubou'],
 ['017','Letran'],['019','Victone'],['022','Shantiruka'],
 ['023','Kun_Mamba'],['024','MrTitou'],['027','Merser'],['028','Nadzu'],
 ['030','Cyd'],['031','Obsess'],['032','Marech'],['033','Greeny'],['034','Harentros'],
 ['038','TortueGourmande'],['039','TortueVéloce'],['040','PoulpeHome']],
/* Decks conseilles (0.6) : 6 archetypes valides de 30 cartes, copies dans les decks du joueur (invite compris) ; aussi la reserve des robots (tirage au hasard). */
decksConseilles:[
 {nom:"Montée en puissance",cartes:{"007":3,"007e":3,"026":1,"026e":2,"041":2,"041e":1,"015":3,"016":3,"016e":3,"002":3,"002e":3,"015e":3},
  txt:"Pioche avec Trigas, Titom76 et Velnen, prends de l'énergie avec Maître du bilig, puis pose tes gros Golems (KEKWRevan, Loxim, Le Ace de Aiges, Aiges Captain) pour finir fort."},
 {nom:"Attaque rapide",cartes:{"903":1,"001":3,"029":3,"009":3,"009e":2,"025":3,"020":3,"020e":3,"018":3,"035":3,"037":3},
  txt:"Pose KaTarN, Apo et Glad dès la manche 1, serre tes Golems autour de GénéralBrioche et Shifukuro, et renforce-les en forgeant JackJoy."},
 {nom:"Meule",cartes:{"901":1,"004":3,"004e":2,"026":3,"026e":2,"007":3,"007e":3,"001":3,"001e":2,"018":3,"018e":2,"036":3},
  txt:"Vide le deck adverse avec Le Q et Titom76, tiens la grille avec KaTarN et Elessar, et laisse chaque pioche impossible marquer pour toi."},
 {nom:"Contrôle",cartes:{"001":3,"001e":3,"009":3,"009e":2,"018":3,"018e":2,"013":3,"013e":3,"008":3,"036":3,"029":2},
  txt:"Affaiblis les Golems d'en face avec Slim K, Glad, Apo, La Fan enflammée et Le pomplard, et freine leurs évolutions avec Elessar."},
 {nom:"Soutien",cartes:{"903":1,"003":3,"003e":3,"020":3,"020e":1,"013":3,"013e":3,"042":3,"025":3,"037":2,"008":2,"008e":3},
  txt:"Groupe tes Golems Cristal et Roche : Cyrdan, GénéralBrioche, Indra et Vic222 renforcent leurs voisins, et L'attachiante soigne les blessés."},
 {nom:"Combo",cartes:{"015":3,"015e":2,"016":2,"016e":3,"036":3,"036e":2,"035":3,"035e":3,"007":3,"007e":2,"026":1,"026e":1,"013":2},
  txt:"Forge Bellock et Loxim pour qu'ils se cherchent l'un l'autre, nourris ta Forge avec Trigas et Spom, et fais grandir tes Golems avec JackJoy et le Drafteur."}
],
/* Bac a sable : ce qui est compte ou non pour chaque carte posee (code -> texte). */
bacNotes:{
 '001':'Jeunesse éphémère : Force de la manche 1 ; la perte de 4 en fin de manche n\'est pas comptée.',
 '001e':'Rap God touche la ligne adverse : non compté.',
 '002':'Tout ou rien : choisis le résultat du dé, ou relance-le.',
 '002e':'High Roll : choisis les 2 dés (un double vaut un seul dé), ou relance-les.',
 '003':'Tournoi annexe compté : +1 à chaque voisin.',
 '003e':'Palmarès : +1 aux voisins compté ; les +2 points de fin de manche ne le sont pas.',
 '004':'Jour de pêche vise le deck adverse : sans effet sur la Force.',
 '004e':'Il suffit : la destruction des cartes en plusieurs exemplaires n\'est pas comptée.',
 '007':'Spam (pioche et Forge) : sans effet sur la Force.',
 '007e':'Mode Avion (protection) : sans effet ici.',
 '008':'Rage : il faut subir des dégâts, non comptée.',
 '008e':"Love inconditionnel (soin d'un Golem blessé) : sans effet ici.",
 '013':'Soutien inconditionnel compté : choisis son favori (+1).',
 '013e':'Favori +2 compté ; Ragebait vise le Golem en face : non compté.',
 '009':'Slam vise un Golem adverse : non compté.',
 '009e':'Menfou palu (protection) : sans effet ici.',
 '029':'Gamba : dé à la pose (1 ou 2 : -2 ; 5 ou 6 : vise le Golem en face), non compté.',
 '029e':'Déguisement compté : choisis le voisin copié, son effet en jeu est gardé.',
 '037':'Counter-pick (cercle) : il faut un Golem en face, non compté.',
 '037e':'Full synergie : +1 par élément partagé compté ; le cercle +2 ne l\'est pas.',
 '026':'La Bretagne (pioche) : sans effet sur la Force.',
 '026e':'Caramel à volonté (énergie) : sans effet sur la Force.',
 '036':'Forge éclair : sans effet sur la Force.',
 '036e':'Survolté compté : +1 par Golem Foudre de ta grille.',
 '901':'Animal : pas de Force. Mignonitude (hasard, fin de manche) non comptée.',
 '902':'Animal : pas de Force. zqrinohbqzroihg (pioche) : sans effet sur la Force.',
 '903':'Animal : pas de Force. Meilleur ami compté : +1 au KEKWait de Shifukuro.',
 '018':'Réalisation de l\'âge (coût adverse) : sans effet sur la Force.',
 '018e':'Extinction du feu vise les Golems adverses : non compté.',
 '041':'Graine de Golem (pioche) : sans effet sur la Force.',
 '041e':'Imitation copie le Golem en face : rien à copier ici.',
 '025':'KEKWait compté : +1 par Golem allié au-dessus.',
 '025e':'meandyou : l\'échange se teste avec Déplacer.',
 '015':'Comeback dépend des manches perdues : non compté (manche 1).',
 '015e':'Double up ? compté ; Comeback non compté (manche 1).',
 '016':'Winstreak dépend des manches remportées : non compté (manche 1).',
 '016e':'Double up ? compté ; Winstreak non compté (manche 1).',
 '035':'Sub offert : il faut forger la carte, non compté.',
 '035e':'Draft diff : il faut forger, non compté.',
 '042':'Info tchat (cercle +2 dans sa colonne) : il faut un Golem en face, non compté.',
 '042e':'Chance du débutant (protection) : sans effet ici.',
 '020':'Grand Général compté : +1 aux autres Golems alliés de sa colonne.',
 '020e':"Bonus d'adjacence compté : +1 par voisin allié."
},
/* Bac a sable : valeurs des des par defaut, selon le nombre de des de l'effet forceAuDe (Alrevan 4 ; KEKWRevan 3 et 4). */
bacDes:{1:[4],2:[3,4]},
/* MODELE DES ELEMENTS (source unique, lue par tout le code d'interface : aide.js, vue/joueur.js, diffusion.js, commun/compte.js, commun/profil.js, commun/demarrage.js).
   ordre = ordre du cercle ; nom = libelle affiche ; texte = teinte du titre et du nom d'effet sur la carte imprimee (TEXTE_ELT de generer_cartes.py) ;
   image cartes/<id>.png ; couleur de fond CSS var(--fm-<id>). couleursCarte : autres couleurs des cartes imprimees (generer_cartes.py, generer_animaux.py, generer_terrains.py). */
elements:{
 ordre:['magma','cristal','foudre','brume','roche'],
 magma:{nom:'Magma',texte:'#ffb52a'},cristal:{nom:'Cristal',texte:'#ffa8d6'},foudre:{nom:'Foudre',texte:'#ffe36e'},brume:{nom:'Brume',texte:'#c9b6f2'},roche:{nom:'Roche',texte:'#ecbc8c'}
},
couleursCarte:{evoNom:'#ffd23a',evoTitre:'#fff0b8',evoEffet:'#ffd23a',evoEncart:'#ffd23a',animal:'#c8f58a',terrain:'#a9e6f7'},
/* Noms cites dans un texte (charte, 9 nov.) : couleur de leur type dans le journal, les bulles d'aide, les zooms, les Regles (lue par vue/joueur.js : lienLog, texteLog). */
couleursTexte:{golem:'var(--or)',evolution:'var(--or)',animal:'#7be07f',terrain:'#a9e6f7',effet:'#c9b6f2'}
};
})(typeof window!=='undefined'?window:globalThis);
