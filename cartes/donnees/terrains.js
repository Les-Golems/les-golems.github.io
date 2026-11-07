/* Les Golems : terrains, dans l'ordre des numeros (le rang sert d'identifiant : toujours ajouter en fin).
   Champs : nom, pts (points de victoire), texte (regle), cit (citation), effet (type d'effet et reglages : cartes/effets/terrains.js ; absent des terrains de la partie).
   Copie de terrains.json (1 - Gabarit de carte, generer_terrains.py) : a reporter ici a la main.
   Script classique (navigateur, sans build) : remplit window.GolemsDonnees.terrains ; sous Node, module.exports.
   Ordre de chargement en page : fichiers de donnees, puis cartes/donnees/index.js, puis moteur.js. */
(function(r){'use strict';
const donnees={type:'terrain',liste:[
 {"nom": "Le Buzzer", "pts": 1, "texte": "Fin de manche : le gagnant regarde ses 3 prochaines cartes et les remet dans l'ordre de son choix.", "cit": "Je l'avais sur le bout de la langue !", "effet": {type:'reordonne',n:3}},
 {"nom": "Le Camp", "pts": 1, "texte": "Fin de manche : tous les Golems ici récupèrent 1 de Force.", "cit": "On fait un repos long ?", "effet": {type:'soin',n:1}},
 {"nom": "L'Écran du MJ", "pts": 1, "texte": "Fin de manche : le gagnant regarde la main adverse.", "cit": "Fais-moi un jet... discrètement.", "effet": {type:'regardeMain'}},
 {"nom": "La Boutique", "pts": 2, "texte": "Jouer un Golem ici coûte 1 de moins.", "cit": "Promis, un dernier reroll et j'arrête.", "effet": {type:'reduction',cout:1}},
 {"nom": "La Faille", "pts": 2, "texte": "Une fois par manche : déplace un de tes Golems d'un autre terrain vers une case libre ici.", "cit": "Je vais gank sa daronne", "effet": {type:'deplacement'}},
 {"nom": "La Nuit au Village", "pts": 2, "texte": "Fin de manche : le Golem le plus faible ici est détruit.", "cit": "Le village s'endort...", "effet": {type:'detruitFaible'}},
 {"nom": "Le Plateau de Jeu", "pts": 2, "texte": "Fin de manche : lance 1 dé. Sur 5 ou 6, le gagnant marque 1 point de plus.", "cit": "C'est à qui de jouer ?", "effet": {type:'dePoint',min:5,points:1}},
 {"nom": "Le Vaisseau", "pts": 2, "texte": "Une fois par manche : échange 2 de tes Golems ici.", "cit": "Je l'ai vu sortir du conduit.", "effet": {type:'echange'}},
 {"nom": "Le Carrousel", "pts": 3, "texte": "Fin de manche : le gagnant défausse 1 carte de sa main.", "cit": "Merde, je n'ai pas la prio.", "effet": {type:'defausse'}},
 {"nom": "La Salle Verrouillée", "pts": 4, "texte": "Ne marque qu'à la dernière manche.", "cit": "Il nous reste combien de temps ?", "effet": {type:'derniereManche',manche:3}},
 {"nom": "L'École", "pts": 2, "texte": "Fin de manche : le perdant pioche 1 carte.", "cit": "C'est en perdant qu'on apprend.", "effet": {type:'piochePerdant'}},
 {"nom": "Le Karaoké", "pts": 2, "texte": "Si tu as exactement 2 Golems ici, ils gagnent +2 de Force chacun.", "cit": "À toi le micro !", "effet": {type:'paire',n:2,bonus:2}},
 {"nom": "Les Pronos", "pts": 1, "texte": "Une fois par manche : mise 1 énergie ici.\nFin de manche : le gagnant marque 1 point de plus par mise des deux joueurs.", "cit": "Celle-là, elle est safe.", "effet": {type:'paris'}},
 {"nom": "Le Cirque", "pts": 2, "texte": "Une fois par manche : inflige 1 dégât à un Golem adverse ici.", "cit": "Honk honk.", "effet": {type:'cirque'}},
 {"nom": "Le Tournoi", "pts": 1, "texte": "Vaut 1 point à la manche 1, 2 points à la manche 2 et 3 points à la manche 3.", "cit": "On garde le meilleur pour la fin.", "effet": {type:'pointsManche'}},
 {"nom": "Le Versus", "pts": 3, "texte": "Un seul Golem par joueur ici. Quand tu en poses un, le Golem adverse ici perd 1 de Force.", "cit": "Un nouveau challenger arrive !", "effet": {type:'unSeul',perte:1}}
]};
if(typeof module!=='undefined'&&module.exports)module.exports=donnees;else (r.GolemsDonnees=r.GolemsDonnees||{}).terrains=donnees;
})(typeof window!=='undefined'?window:globalThis);
