/* Les Golems : types d'effets des terrains (etape 7). Voir cartes/effets/index.js pour le contrat. */
(function(racine){'use strict';
function fabrique(M){
const types={};
return {types};
}
if(typeof module!=='undefined'&&module.exports)module.exports=fabrique;else (racine.GolemsEffets=racine.GolemsEffets||{}).terrains=fabrique;
})(typeof window!=='undefined'?window:globalThis);
