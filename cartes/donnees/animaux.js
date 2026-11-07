/* Les Golems : fiches des animaux de compagnie (pas des Golems : Force 0 dans les colonnes).
   Champs de chaque fiche (cle = code) : id (code), nom, el (elements), cout, force (null = fixee par l'effet), base (code de la carte de base, evolutions seulement), texte (effet affiche).
   En plus : animal:true, maitre (code du Golem maitre). reglage = REGLAGE_ANIMAUX du moteur (meme objet, modifiable par les tests).
   Script classique (navigateur, sans build) : remplit window.GolemsDonnees.animaux ; sous Node, module.exports.
   Ordre de chargement en page : fichiers de donnees, puis cartes/donnees/index.js, puis moteur.js. */
(function(r){'use strict';
const donnees={type:'animal',cartes:{
 /* Animaux de compagnie : animal:true, maitre = code du Golem de base (son evolution compte aussi). Ni Force ni element, jamais d'evolution.
    Codes 9xx, hors des numeros de membres ; 1 exemplaire par deck (ANIMAL_MAX). */
 '901':{id:'901',effet:{type:'horsDecompte'},nom:'Kiwi',el:[],cout:0,force:null,animal:true,maitre:'026',texte:'Mignonitude : à la fin de la manche, un Golem au hasard de chaque joueur ne compte pas au décompte (il reste en jeu). Puis tu pars à la défausse.'},
 '902':{id:'902',effet:{type:'piocheAnimal',n:1},nom:'Jacen et Jaina',el:[],cout:0,force:null,animal:true,maitre:'001',texte:'zqrinohbqzroihg : à la pose, pioche 1 carte. Quand ton maître est détruit, pioche 1 carte.'} /* Jacen et Jaina : animal de KaTarN */
},
reglage:{cout:0,element:false,kiwiApres:true,attache:true} /* kiwiApres : Kiwi part apres le decompte ; attache : animal sous son maitre (g.ani), +1 de Force */
};
if(typeof module!=='undefined'&&module.exports)module.exports=donnees;else (r.GolemsDonnees=r.GolemsDonnees||{}).animaux=donnees;
})(typeof window!=='undefined'?window:globalThis);
