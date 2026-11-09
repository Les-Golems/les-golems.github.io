/* Les Golems : registre des types d'effets (etape 7). A charger APRES les fichiers d'effets et AVANT moteur.js.
   Chaque fiche de carte (cartes/donnees/*.js) declare son effet : effet:{type:'...', ...reglages} ou une liste de ces objets.
   Chaque fichier d'effets (cartes/effets/<cle>.js) est une fabrique : function(M){return {types, attentes, actions, fonctions}}.
     M : les outils internes du moteur (carte, golem, blesse, dire, nettoie...), fournis par moteur.js au chargement.
     types : type d'effet -> crochets (pose, force, finManche, robot...) et proprietes ; le moteur appelle les crochets, il ne teste jamais un code de carte.
     attentes : lettre d'attente (s.attente.t) -> {legales, applique, robot} ; actions : lettre d'action jouee a son tour -> {applique, estime...}.
     fonctions : fonctions exposees par l'API du moteur (noms historiques, pour les tests et l'interface).
   Nouveau type de carte (ex. les Evenements) : cartes/donnees/evenements.js (+ ligne dans cartes/donnees/index.js), cartes/effets/evenements.js
   (+ ligne dans FICHIERS ci-dessous), sans toucher le moteur. Les lettres d'action et le format du journal ne changent jamais.
   Script classique (navigateur, sans build) : remplit window.GolemsEffets ; sous Node, module.exports. */
(function(r){'use strict';
const FICHIERS=['golems','animaux','terrains']; /* l'ordre compte : ordre d'enregistrement des types (actions de tour proposees dans cet ordre) */
const enNode=typeof module!=='undefined'&&module.exports&&typeof require==='function';
const E=enNode?{}:(r.GolemsEffets=r.GolemsEffets||{});
const GROUPES=['types','attentes','actions','fonctions'];
function construit(M){
  const R={};GROUPES.forEach(g=>R[g]={});
  for(const f of FICHIERS){
    const fab=enNode?require('./'+f+'.js'):E[f];if(typeof fab!=='function')throw new Error('effets absents : cartes/effets/'+f+'.js');
    const x=fab(M)||{};
    for(const g of GROUPES)for(const k in x[g]||{}){if(R[g][k])throw new Error('effets : '+g+' '+k+' en double');R[g][k]=x[g][k]}
  }
  return R;
}
E.construit=construit;E.FICHIERS=FICHIERS;
if(enNode)module.exports=E;
})(typeof window!=='undefined'?window:globalThis);
