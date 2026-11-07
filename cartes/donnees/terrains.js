/* Les Golems : terrains, dans l'ordre des numeros (le rang sert d'identifiant : toujours ajouter en fin).
   Champs : nom, pts (points de victoire), texte (regle), cit (citation).
   Copie de terrains.json (1 - Gabarit de carte, generer_terrains.py) : a reporter ici a la main.
   Script classique (navigateur, sans build) : remplit window.GolemsDonnees.terrains ; sous Node, module.exports.
   Ordre de chargement en page : fichiers de donnees, puis cartes/donnees/index.js, puis moteur.js. */
(function(r){'use strict';
const donnees={type:'terrain',liste:[
 {"nom": "Le Buzzer", "pts": 1, "texte": "Fin de manche : le gagnant regarde ses 3 prochaines cartes et les remet dans l'ordre de son choix.", "cit": "Je l'avais sur le bout de la langue !"},
 {"nom": "Le Camp", "pts": 1, "texte": "Fin de manche : tous les Golems ici récupèrent 1 de Force.", "cit": "On fait un repos long ?"},
 {"nom": "L'Écran du MJ", "pts": 1, "texte": "Fin de manche : le gagnant regarde la main adverse.", "cit": "Fais-moi un jet... discrètement."},
 {"nom": "La Boutique", "pts": 2, "texte": "Jouer un Golem ici coûte 1 de moins.", "cit": "Promis, un dernier reroll et j'arrête."},
 {"nom": "La Faille", "pts": 2, "texte": "Une fois par manche : déplace un de tes Golems d'un autre terrain vers une case libre ici.", "cit": "Je vais gank sa daronne"},
 {"nom": "La Nuit au Village", "pts": 2, "texte": "Fin de manche : le Golem le plus faible ici est détruit.", "cit": "Le village s'endort..."},
 {"nom": "Le Plateau de Jeu", "pts": 2, "texte": "Fin de manche : lance 1 dé. Sur 5 ou 6, le gagnant marque 1 point de plus.", "cit": "C'est à qui de jouer ?"},
 {"nom": "Le Vaisseau", "pts": 2, "texte": "Une fois par manche : échange 2 de tes Golems ici.", "cit": "Je l'ai vu sortir du conduit."},
 {"nom": "Le Carrousel", "pts": 3, "texte": "Fin de manche : le gagnant défausse 1 carte de sa main.", "cit": "Merde, je n'ai pas la prio."},
 {"nom": "La Salle Verrouillée", "pts": 4, "texte": "Ne marque qu'à la dernière manche.", "cit": "Il nous reste combien de temps ?"},
 {"nom": "L'École", "pts": 2, "texte": "Fin de manche : le perdant pioche 1 carte.", "cit": "C'est en perdant qu'on apprend."},
 {"nom": "Le Karaoké", "pts": 2, "texte": "Si tu as exactement 2 Golems ici, ils gagnent +2 de Force chacun.", "cit": "À toi le micro !"},
 {"nom": "Les Pronos", "pts": 1, "texte": "Une fois par manche : mise 1 énergie ici.\nFin de manche : le gagnant marque 1 point de plus par mise des deux joueurs.", "cit": "Celle-là, elle est safe."},
 {"nom": "Le Cirque", "pts": 2, "texte": "Une fois par manche : inflige 1 dégât à un Golem adverse ici.", "cit": "Honk honk."},
 {"nom": "Le Tournoi", "pts": 1, "texte": "Vaut 1 point à la manche 1, 2 points à la manche 2 et 3 points à la manche 3.", "cit": "On garde le meilleur pour la fin."},
 {"nom": "Le Versus", "pts": 3, "texte": "Un seul Golem par joueur ici. Quand tu en poses un, le Golem adverse ici perd 1 de Force.", "cit": "Un nouveau challenger arrive !"}
]};
if(typeof module!=='undefined'&&module.exports)module.exports=donnees;else (r.GolemsDonnees=r.GolemsDonnees||{}).terrains=donnees;
})(typeof window!=='undefined'?window:globalThis);
