/* Les Golems : types d'effets des animaux de compagnie (etape 7). Voir cartes/effets/index.js pour le contrat.
   Crochets (r = reglages de la fiche de l'animal) :
     poseAnimal(r,s,p) : l'animal vient d'etre pose (sur sa case ou sous son maitre) ; maitreDetruit(r,s,p) : il part a la defausse, son maitre detruit (pas remplace) ;
     avantDecompte(r,s,p,l,k,H,A,J,res) : avant le decompte (H : case, A : l'animal, sur sa case ou attache sous H ; res : Golems exclus, res.partir : departs differes) ;
     risque(r,s,p,gr,D) : robot, pioches de la pose [pour p, pour l'adversaire] ; robotPose(r,s,p,a,apres,g) : robot, gain de la pose. */
(function(racine){'use strict';
function fabrique(M){
const {carte,golem,dire,nomDetail}=M;
/* Jacen et Jaina (902) : pioche 1 carte. Deck vide : 1 point pour l'adversaire (evenement 'jj' seulement si une carte est piochee). */
function chatsPioche(s,p,pq){const v=!s.j[p].deck.length&&!s.deckLibre;dire(s,p,'Jacen et Jaina : '+pq+', pioche 1 carte.');M.pioche(s,p,1);if(!v)s.stats.ev.push({t:'jj',cp:p,y:pq})} /* journal : l'effet, puis le point si le deck est vide */
const types={
  /* Uki (903) : Meilleur ami, compte comme un Golem allie au-dessus de son maitre. Lu par le compte 'dessus' de forceParGolem (KEKWait de Shifukuro de base) ;
     sans effet sur un maitre qui ne compte pas les Golems au-dessus (Le moderateur : seulement le +1 de l'animal attache). Attache, donc jamais deplace seul (meandyou). */
  golemAuDessus:{compteDessus:true},
  /* Jacen et Jaina (902) : a la pose, pioche r.n carte ; quand son maitre est detruit, pioche r.n carte. */
  piocheAnimal:{
    poseAnimal:(r,s,p)=>chatsPioche(s,p,'à la pose'),
    maitreDetruit:(r,s,p)=>chatsPioche(s,p,'son maître est détruit'),
    risque:(r)=>[r.n,0],
    robotPose:(r,s,p,a,apres,g)=>g+((s.j[p].deck.length?.5:0)-.05)}, /* 1 carte piochee */
  /* Kiwi (901) : Mignonitude, a la fin de la manche, un Golem au hasard de chaque grille (la sienne puis l'adverse) ne compte pas au decompte
     (g.hors = s.manche ; il reste en jeu). Hasard : generateur du joueur de Kiwi (rejeu identique). Grille sans Golem : rien.
     Puis Kiwi part a la defausse (REGLAGE_ANIMAUX.kiwiApres : juste apres le decompte). */
  horsDecompte:{
    avantDecompte:(r,s,p,l,k,H,A,J,res)=>{
      [p,1-p].forEach(q=>{
        const cs=[];s.j[q].grille.forEach((L,a)=>L.forEach((g,b)=>{if(golem(g)&&g.hors!==s.manche)cs.push([a,b])}));
        if(!cs.length){dire(s,p,'Kiwi : Mignonitude, aucun Golem '+(q===p?'dans sa grille':'dans la grille adverse')+'.');return}
        const[a,b]=cs[Math.floor(M.alea(s.rng,p)*cs.length)],g=s.j[q].grille[a][b],f=M.forceDe(s,q,a,b),n=nomDetail(carte(g.c));
        g.hors=s.manche;res.push({p,q,l:a,k:b,c:g.c,f});
        s.stats.ev.push({t:'h',sp:p,sc:A.c,cp:q,cc:g.c,n:f,m:s.manche});M.declenche(s,'Mignonitude',n+(q===p?'':' (adverse)')+' ne compte pas');
        dire(s,p,'Kiwi : Mignonitude, '+n+(q===p?'':' (adverse)')+' ne compte pas au décompte.');
      });
      const part=()=>{J.defausse.push(A.c);if(A===H)J.grille[l][k]=null;else delete H.ani;dire(s,p,'Kiwi part à la défausse.')};
      if(M.REGLAGE_ANIMAUX.kiwiApres)res.partir.push(part);else part();
    },
    robotPose:(r,s,p,a,apres,g)=>g+(M.mignonEstime(apres,p)-.05)} /* Mignonitude estimee sur le plateau actuel, moins la case occupee */
};
return {types,fonctions:{chatsPioche}};
}
if(typeof module!=='undefined'&&module.exports)module.exports=fabrique;else (racine.GolemsEffets=racine.GolemsEffets||{}).animaux=fabrique;
})(typeof window!=='undefined'?window:globalThis);
