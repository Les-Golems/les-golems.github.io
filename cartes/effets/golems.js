/* Les Golems : types d'effets des Golems (etape 7). Voir cartes/effets/index.js pour le contrat.
   Crochets d'un type (tous facultatifs ; r = reglages de la fiche, ex. {type:'bonusVoisins',bonus:1}) :
     force(r,s,p,l,k,g,G,vs,el) : Force en plus du Golem lui-meme (avant les auras de colonne) ; forceFin : idem, apres.
     note(r,s,p,l,k,g,G,vs,el,b) / noteFin : evenements de bonus du decompte (b(y,p,recoit,donneur_p,donneur_c)).
     voisinBonus(r) : Force donnee a chaque voisin allie ; colonneBonus(r) : Force donnee aux autres Golems allies de la colonne.
     favoriBonus(r) : Force donnee au favori. cercle2 (propriete) : cercle a +2 ; cercle2Terrain : cercle a +2 pour les allies du terrain.
     dessus (reglage compte:'dessus') : explique la mort en chaine d'un Golem qui perd un allie au-dessus. */
(function(racine){'use strict';
function fabrique(M){
const {carte,golem,CARTES}=M;
/* Golems Foudre (ou autre element) d'une grille, animaux non compris (ils n'ont pas d'element) */
function compteElement(G,e){let n=0;G.forEach(L=>L.forEach(g=>{if(g&&carte(g.c).el.includes(e))n++}));return n}
const foudres=G=>compteElement(G,'foudre');
/* Shifukuro : KEKWait, Golems allies au-dessus de (l,k) sur le meme terrain (meme colonne, ligne d'indice plus petit), pas forcement adjacents.
   Un animal ne compte pas. Ligne 1 : 0 ; ligne 3 : 2 au plus. */
function kekwait(G,l,k){let n=0;for(let a=0;a<l;a++)if(golem(G[a][k]))n++;return n}
/* Bellock/Loxim. REGLAGE_DUO : valeur de Double up ?, modifiable pour les simulations. */
const REGLAGE_DUO={doubleUp:3};
function duoManches(s,p,k,gagne){return (s.resultats||[]).filter(r=>r[k]===(gagne?p:1-p)).length}
/* Golem du partenaire P (carte de base ou evolution) seul avec (l,k) sur sa ligne ou son terrain : l'autre case de la ligne ou du terrain est le partenaire,
   la troisieme est vide (un animal la bloque). Renvoie le partenaire (ligne d'abord) ou null. */
function duoVoisin(G,l,k,P){
  const est=g=>golem(g)&&(carte(g.c).id===P||carte(g.c).base===P),un=(a,b)=>est(a)&&!b?a:est(b)&&!a?b:null;
  const L=[0,1,2].filter(x=>x!==k).map(x=>G[l][x]),C=[0,1,2].filter(x=>x!==l).map(x=>G[x][k]);
  return un(L[0],L[1])||un(C[0],C[1]);
}
/* Double up ? (Aiges Captain, Le Ace de Aiges, ou copieur) : +REGLAGE_DUO.doubleUp une seule fois, meme si ligne et terrain sont vrais a la fois. */
function doubleUp(G,l,k,id){const e=M.effs(id).find(e=>e.r.type==='duo'&&e.r.doubleUp);return e?duoVoisin(G,l,k,e.r.partenaire):null}
const types={
  /* Cyrdan (003, 003e) : tes voisins gagnent +bonus de Force */
  bonusVoisins:{voisinBonus:r=>r.bonus},
  /* Indra (013 +1, 013e +2) : le favori gagne +bonus tant que la carte est en jeu (le choix du favori : passe des choix) */
  favori:{favoriBonus:r=>r.bonus},
  /* +1 de Force par Golem compte (compte : 'element' de la grille, lui compris ; 'dessus' : allies au-dessus sur son terrain ; 'voisins' : voisins allies).
     apres:true : ajoute apres les auras de colonne (ordre historique). note : nom du bonus dans les statistiques. */
  forceParGolem:{
    force:(r,s,p,l,k,g,G,vs)=>r.apres?0:compte(r,G,l,k,vs),
    forceFin:(r,s,p,l,k,g,G,vs)=>r.apres?compte(r,G,l,k,vs):0,
    note:(r,s,p,l,k,g,G,vs,el,b)=>{if(!r.apres)noteCompte(r,p,l,k,g,G,vs,b)},
    noteFin:(r,s,p,l,k,g,G,vs,el,b)=>{if(r.apres)noteCompte(r,p,l,k,g,G,vs,b)}},
  /* Full synergie (037e) : +1 par element partage par au moins un voisin, en plus du Trait (+2 maximum : 2 elements) */
  synergie:{
    force:(r,s,p,l,k,g,G,vs,el)=>{let v=0;el.forEach(e=>{if(vs.some(n=>carte(n.c).el.includes(e)))v++});return v},
    note:(r,s,p,l,k,g,G,vs,el,b)=>el.forEach(e=>{const n=vs.find(n=>carte(n.c).el.includes(e));if(n)b('trait',p,g.c,p,n.c)})},
  /* Counter-pick et Full synergie (037, 037e) : cercle +2 au lieu de +1 */
  cercle:{cercle2:true},
  /* Vic222 : Info tchat (042) en jeu sur le terrain k : tout Golem allie de ce terrain (lui compris) a le cercle a +2. Jamais plus de +2. */
  cercleTerrain:{cercle2Terrain:true},
  /* GeneralBrioche : Grand General (020), +bonus par exemplaire allie dans la meme colonne, autre ligne (cumulatif, pas sur lui) */
  bonusColonne:{colonneBonus:r=>r.bonus},
  /* Bellock/Loxim : Comeback (gagne:false) et Winstreak (gagne:true), +bonus par manche perdue ou remportee sur son terrain (lues dans s.resultats).
     Egalite, ou Salle Verrouillee avant la manche 3 (personne ne la remporte) : rien. Recalcule : le Golem deplace compte son nouveau terrain. */
  forceParManche:{
    force:(r,s,p,l,k)=>r.bonus*duoManches(s,p,k,r.gagne),
    note:(r,s,p,l,k,g,G,vs,el,b)=>{const n=r.bonus*duoManches(s,p,k,r.gagne);for(let i=0;i<n;i++)b(r.gagne?'winstreak':'comeback',p,g.c,p,g.c)}},
  /* Bellock/Loxim : duo avec la carte de base partenaire (partenaire). nom : nom de l'effet de Forge (« si tu forges cette carte »).
     doubleUp:true (evolutions) : Double up ?, +REGLAGE_DUO.doubleUp si le partenaire et lui sont seuls sur leur ligne ou leur terrain. */
  duo:{
    force:(r,s,p,l,k,g,G)=>r.doubleUp&&duoVoisin(G,l,k,r.partenaire)?REGLAGE_DUO.doubleUp:0,
    note:(r,s,p,l,k,g,G,vs,el,b)=>{const n=r.doubleUp?duoVoisin(G,l,k,r.partenaire):null;if(n)for(let i=0;i<REGLAGE_DUO.doubleUp;i++)b('doubleup',p,g.c,p,n.c)}}
};
function compte(r,G,l,k,vs){return r.compte==='element'?compteElement(G,r.el):r.compte==='dessus'?kekwait(G,l,k):vs.length}
function noteCompte(r,p,l,k,g,G,vs,b){
  if(r.compte==='element')G.forEach(L=>L.forEach(n=>{if(n&&carte(n.c).el.includes(r.el))b(r.note,p,g.c,p,n.c)}));
  else if(r.compte==='dessus'){for(let a=0;a<l;a++){const n=G[a][k];if(golem(n))b(r.note,p,g.c,p,n.c)}}
  else vs.forEach(n=>b(r.note,p,g.c,p,n.c));
}
return {types,fonctions:{foudres,kekwait,REGLAGE_DUO,duoManches,duoVoisin,doubleUp}};
}
if(typeof module!=='undefined'&&module.exports)module.exports=fabrique;else (racine.GolemsEffets=racine.GolemsEffets||{}).golems=fabrique;
})(typeof window!=='undefined'?window:globalThis);
