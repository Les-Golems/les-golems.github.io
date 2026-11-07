/* Les Golems : types d'effets des Golems (etape 7). Voir cartes/effets/index.js pour le contrat.
   Crochets d'un type (tous facultatifs ; r = reglages de la fiche, ex. {type:'bonusVoisins',bonus:1}) :
     force(r,s,p,l,k,g,G,vs,el) : Force en plus du Golem lui-meme (avant les auras de colonne) ; forceFin : idem, apres.
     note(r,s,p,l,k,g,G,vs,el,b) / noteFin : evenements de bonus du decompte (b(y,p,recoit,donneur_p,donneur_c)).
     voisinBonus(r) : Force donnee a chaque voisin allie ; colonneBonus(r) : Force donnee aux autres Golems allies de la colonne.
     favoriBonus(r) : Force donnee au favori. cercle2 (propriete) : cercle a +2 ; cercle2Terrain : cercle a +2 pour les allies du terrain.
     dessus (reglage compte:'dessus') : explique la mort en chaine d'un Golem qui perd un allie au-dessus. */
(function(racine){'use strict';
function fabrique(M){
const {carte,golem,CARTES,dire,nomDetail}=M;
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
/* Comptes d'effets en jeu dans une grille (Golems seulement, copieurs compris) : somme du reglage du crochet h. */
const compteEffet=(G,h)=>{let n=0;G.forEach(L=>L.forEach(g=>{if(golem(g))for(const e of M.effs(M.idEff(g)))if(e.T[h])n+=e.T[h](e.r)}));return n};
/* Elessar : Realisation de l'age en jeu dans une grille (Elessar, Maitre du deguisement qui l'a copiee). Le pomplard ne la garde pas. */
const elessars=G=>compteEffet(G,'surtaxe');
/* Velnen : Graine de Golem en jeu dans une grille (Velnen de base, Apo ou chansonnier qui l'a copiee), cumulatif. Le chansonnier ne la garde pas. */
const graines=G=>compteEffet(G,'piocheEnPlus');
/* Spom en jeu (Forge eclair, Apo deguise compris) : animaux compris dans le parcours (ils n'ont pas cet effet) */
function spoms(G){let n=0;G.forEach(L=>L.forEach(g=>{if(g)for(const e of M.effs(M.idEff(g)))if(e.T.forgeEnPlus)n+=e.T.forgeEnPlus(e.r)}));return n}
/* Le Q : Jour de peche (004, ou copieur), a la pose. Deck adverse vide : rien (regarder n'est pas piocher). 1 carte : defaussee d'office.
   Sinon attente 'q' (adv:1, options = les 2 premieres cartes du deck adverse) ; coup 'c' + carte : elle va a la defausse adverse, l'autre reste dessus. */
function jourDePeche(s,p,g){
  const K=s.j[1-p],n=nomDetail(carte(g.c))+' : Jour de pêche';
  if(!K.deck.length){M.declenche(s,'Jour de pêche','Deck adverse vide');dire(s,p,n+', deck adverse vide, rien à regarder.');return}
  if(K.deck.length===1){const c=K.deck.shift();K.defausse.push(c);M.declenche(s,'Jour de pêche','Défausse la dernière carte');dire(s,p,n+', regarde la dernière carte du deck adverse et la défausse ('+nomDetail(carte(c))+').');return}
  M.declenche(s,'Jour de pêche','Regarde 2 cartes');dire(s,p,n+', regarde les 2 premières cartes du deck adverse.');
  s.attente={t:'q',p,adv:1,options:K.deck.slice(0,2),src:n};
}
/* Le Q : Il suffit (Seul contre tous, 004e, ou copieur). Chaque grille a part : carte exacte (id de la carte, base et evolution differentes ;
   un copieur compte comme sa propre carte) posee en 2 exemplaires ou plus sur la grille. Animaux jamais (1 par deck).
   Renvoie {T : detruits [{q,l,k,c}], pr : proteges par Mode Avion (chez l'adversaire seulement, ciblable)}. Le Golem protege compte dans les exemplaires. */
function doublons(s,p){
  const T=[],pr=[];
  [p,1-p].forEach(q=>{const G=s.j[q].grille,nb={};
    G.forEach(L=>L.forEach(h=>{if(golem(h)){const id=carte(h.c).id;nb[id]=(nb[id]||0)+1}}));
    G.forEach((L,a)=>L.forEach((h,b)=>{if(golem(h)&&nb[carte(h.c).id]>1)(M.ciblable(s,q,a,b,p)?T:pr).push({q,l:a,k:b,c:h.c})}));
  });
  return {T,pr};
}
/* Destruction simultanee : toutes les cartes quittent les grilles, puis les animaux orphelins (Jacen et Jaina : pioche, quand detruit), joueur de l'effet d'abord.
   Les morts en chaine (bonus perdus) : nettoie, apres. */
function ilSuffit(s,p,g){
  const {T,pr}=doublons(s,p),n=nomDetail(carte(g.c))+' : Il suffit',m=T.filter(x=>x.q===p).length,a=T.length-m;
  const nm=x=>x.map(y=>nomDetail(carte(y.c))+(y.q===p?'':' (adverse)')).join(', ');
  M.declenche(s,'Il suffit',m+' allié'+(m>1?'s':'')+' et '+a+' adverse'+(a>1?'s':'')+' détruits');
  if(!T.length&&!pr.length){dire(s,p,n+', aucune carte posée en plusieurs exemplaires.');return}
  dire(s,p,n+(T.length?', détruit '+nm(T):'')+(pr.length?(T.length?' ; ':', ')+nm(pr)+(pr.length>1?' sont protégés':' est protégé')+' (Mode Avion)':'')+'.');
  T.forEach(x=>M.note(s,'m',1,{p,c:g.c,lib:'À la pose'},x.q,x.c));
  T.forEach(x=>{const J=s.j[x.q];J.defausse.push(x.c);J.grille[x.l][x.k]=null});
  T.forEach(x=>M.orphelins(s,x.q,x.c));
}
/* Elessar : Extinction du feu (Le pomplard, 018e, ou Maitre du deguisement qui l'a copiee), a la pose : chaque Golem adverse en jeu
   qui a l'element r.el perd r.degats, comme une blessure. Mode Avion protege (ciblable), Menfou palu aussi (blesse). Les morts : nettoie, apres. */
function extinction(r,s,p,g){
  const G=s.j[1-p].grille,cs=[],pr=[],n=nomDetail(carte(g.c))+' : Extinction du feu';
  for(let a=0;a<3;a++)for(let b=0;b<3;b++){const h=G[a][b];if(golem(h)&&carte(h.c).el.includes(r.el))(M.ciblable(s,1-p,a,b,p)?cs:pr).push([a,b])}
  const nm=x=>x.map(([a,b])=>nomDetail(carte(G[a][b].c))).join(' et ');
  if(!cs.length&&!pr.length){dire(s,p,n+', aucun Golem Magma adverse.');return}
  dire(s,p,n+(cs.length?', '+nm(cs)+(cs.length>1?' perdent':' perd')+' 1 de Force':'')+(pr.length?(cs.length?' ; ':', ')+nm(pr)+(pr.length>1?' sont protégés':' est protégé')+' (Mode Avion)':'')+'.');
  cs.forEach(([a,b])=>M.blesse(s,1-p,a,b,r.degats,{p,c:g.c,lib:'À la pose'}));
}
/* Gamba (Apo, 029) : 1 de. 1-2 : Apo perd 2. 5-6 : le Golem adverse en face perd 2 (Mode Avion le protege, Menfou palu aussi). Copieur : « (Gamba) ». */
function gamba(s,p,l,k,g){
  const v=M.de(s,p),n=nomDetail(carte(g.c))+(M.estCopieur(carte(g.c).id)?' (Gamba)':'');
  if(v<=2){dire(s,p,n+' lance '+v+' : perd 2 de Force.');M.blesse(s,p,l,k,2,{p,c:g.c,lib:'À la pose'});return}
  if(v<=4){dire(s,p,n+' lance '+v+' : rien ne se passe.');return}
  const h=s.j[1-p].grille[l][k];
  if(!golem(h)){dire(s,p,n+' lance '+v+' : aucun Golem en face.');return}
  if(!M.ciblable(s,1-p,l,k,p)){dire(s,p,n+' lance '+v+' : '+nomDetail(carte(h.c))+' est protégé (Mode Avion).');return}
  dire(s,p,n+' lance '+v+' : '+nomDetail(carte(h.c))+' perd 2 de Force.');
  M.blesse(s,1-p,l,k,2,{p,c:g.c,lib:'À la pose'});
}
/* La Bretagne (Titom76, 026) : chaque joueur pioche 1 carte par Golem de ses elements r.els dans sa grille (r.max au plus), animaux non compris. */
const elDe=(r,c)=>carte(c).el.some(e=>r.els.includes(e));
function bretagne(r,s,p){
  [p,1-p].forEach(q=>{
    const J=s.j[q];let n=0;J.grille.forEach(L=>L.forEach(g=>{if(g&&elDe(r,g.c))n++}));n=Math.min(r.max,n);
    dire(s,q,'La Bretagne : '+(n?'pioche '+n+' carte'+(n>1?'s':'')+'.':'aucune pioche.'));
    M.pioche(s,q,n); /* carte par carte, deck vide : 1 point a l'adversaire du joueur qui pioche (le joueur de Titom76 pioche le premier ; journal : l'effet, puis les points) */
  });
}
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
    note:(r,s,p,l,k,g,G,vs,el,b)=>{const n=r.doubleUp?duoVoisin(G,l,k,r.partenaire):null;if(n)for(let i=0;i<REGLAGE_DUO.doubleUp;i++)b('doubleup',p,g.c,p,n.c)}},
  /* KaTarN (001) : Jeunesse ephemere, pose uniquement a la manche r.manche (pas sur un remplacement ni une evolution). */
  poseManche:{interdit:(r,s)=>s.manche!==r.manche},
  /* KaTarN (001) : perd r.degats de Force a chaque fin de manche (une blessure de son propre camp). */
  pertesFinManche:{finManche:(r,s,p,l,k,g)=>{dire(s,p,'KaTarN perd '+r.degats+' de Force.');M.blesse(s,p,l,k,r.degats,{p,c:g.c,lib:'Perte de fin de manche'})}},
  /* Slim K (001e) : Rap God, a la pose, r.degats a chaque Golem ciblable de la ligne adverse. */
  degatsLigne:{pose:(r,s,p,l,k,g)=>{
    const cs=[0,1,2].filter(c=>M.ciblable(s,1-p,l,c,p)),ts=cs.map(c=>nomDetail(carte(s.j[1-p].grille[l][c].c)));
    dire(s,p,ts.length?'Slim K : 1 dégât à '+ts.join(' et ')+'.':'Slim K : aucune cible sur la ligne adverse.');
    cs.forEach(c=>M.blesse(s,1-p,l,c,r.degats,{p,c:g.c,lib:'À la pose'}));
  }},
  /* Alrevan (002, des:1) : Force = 1 de ; KEKWRevan (002e, des:2) : somme de 2 des, sur un double la valeur d'un seul. */
  forceAuDe:{pose:(r,s,p,l,k,g)=>{
    if(r.des===1){g.f=M.de(s,p);dire(s,p,'Alrevan lance le dé : Force '+g.f+'.');return}
    const a=M.de(s,p),b=M.de(s,p);g.f=a===b?a:a+b;dire(s,p,'Alrevan (KEKWRevan) lance '+a+' et '+b+' : Force '+g.f+'.');
  }},
  /* Roi du Karaoke (003e) : Palmares, fin de manche, +r.points si son joueur remporte le terrain qui rapporte le moins. */
  pointsTerrainMin:{finManche:(r,s,p,l,k,g,J,remporte)=>{if(remporte){J.score+=r.points;dire(s,p,'Cyrdan (Roi du Karaoké) : +'+r.points+' points.')}}},
  /* Le Q (004) : Jour de peche, apres les morts de la pose. */
  jourDePeche:{poseApres:(r,s,p,l,k,g)=>jourDePeche(s,p,g)},
  /* Seul contre tous (004e) : Il suffit, avant les morts en chaine. */
  ilSuffit:{pose:(r,s,p,l,k,g)=>ilSuffit(s,p,g)},
  /* Trigas (007) : Spam, apres les morts de la pose : pioche 1 carte, puis attente 's' (placer 1 carte de sa main dans sa Forge). */
  spam:{poseApres:(r,s,p)=>{
    dire(s,p,'Trigas : Spam, pioche 1 carte.');
    M.pioche(s,p,1); /* deck vide : 1 point a l'adversaire (journal : l'effet, puis le point) */
    if(s.j[p].main.length)s.attente={t:'s',p};
  }},
  /* Roi du Mobile (007e) : Mode Avion, jamais cible par un effet de carte adverse (ciblable). */
  intouchable:{intouchable:true},
  /* K-Chan (008) : Rage, chaque blessure survecue donne +1 de Force (r.max au plus) ; tranchee par nettoie, une fois la survie connue. */
  rage:{
    blessure:(r,g)=>{g.rp=(g.rp||0)+1},
    cumule:(r,s,p,g)=>{const n=Math.min(g.rp,r.max-(g.ra||0));delete g.rp;if(n>0){g.ra=(g.ra||0)+n;dire(s,p,nomDetail(carte(g.c))+' : Rage, +'+n+' de Force.')}}},
  /* GymRat (009e, Menfou palu) : ignore toute perte de Force venue d'un effet adverse (il reste ciblable).
     Baby gamer (042e, Chance du debutant, unique:true) : la premiere seulement (g.cdb une fois utilisee). nom : nom de l'effet dans le journal. */
  immunite:{protege:(r,s,p,g,src)=>{
    if(!(src&&src.p!==null&&src.p!==undefined&&src.p!==p))return false;
    if(r.unique){if(g.cdb)return false;g.cdb=1}
    dire(s,p,nomDetail(carte(g.c))+' : '+r.nom+', ne perd pas de Force.');return true;
  }},
  /* Elessar (018) : Realisation de l'age, les evolutions adverses coutent r.cout de plus (cumulatif ; pas un ciblage). */
  surtaxeEvolution:{surtaxe:r=>r.cout},
  /* Le pomplard (018e) : Extinction du feu, a la pose, chaque Golem adverse de l'element r.el perd r.degats. */
  perteElement:{pose:(r,s,p,l,k,g)=>extinction(r,s,p,g)},
  /* Titom76 (026) : La Bretagne, chaque joueur pioche 1 carte par Golem de ses elements r.els dans sa grille (r.max au plus). */
  piocheParElement:{pose:(r,s,p)=>bretagne(r,s,p)},
  /* Apo (029) : Gamba. */
  gamba:{pose:(r,s,p,l,k,g)=>gamba(s,p,l,k,g)},
  /* Spom (036) : Forge eclair, r.n carte de plus a forger au debut du tour (J.eclair), reprise en fin de tour. */
  forgeEclair:{forgeEnPlus:r=>r.n,
    finTour:(s,p,J)=>{ /* fin du tour, avant la defausse a 7 cartes : une reprise par Forge eclair utilisee ce tour (meme si Spom est mort depuis), au hasard du generateur du joueur */
      for(;J.eclairUtil>0;J.eclairUtil--){
        if(!J.forge.length)continue;
        M.melange(s.rng,p,J.forge);J.main.push(J.forge.pop());
        M.declenche(s,'Forge éclair','Reprend 1 carte');dire(s,p,'Spom : Forge éclair, mélange sa Forge et reprend 1 carte en main.');
      }}},
  /* Velnen (041) : Graine de Golem, r.n carte de plus a la pioche de chaque tour (cumulatif, premier tour de manche compris). */
  piocheTour:{piocheEnPlus:r=>r.n,
    debutTour:(s,p,J)=>{const nv=graines(J.grille);
      if(nv){M.declenche(s,'Graine de Golem','Pioche +'+nv);dire(s,p,'Graine de Golem : pioche '+nv+' carte'+(nv>1?'s':'')+' de plus.');M.pioche(s,p,nv)}}}, /* journal : l'effet, puis les points si le deck est vide */

};
/* Realisation de l'age : surtaxe annoncee a la pose d'une evolution (sur : total de la surtaxe adverse) */
function annonceSurtaxe(s,p,C,sur){M.declenche(s,'Réalisation de l\'âge','Coût +'+sur+' pour '+nomDetail(C));dire(s,p,'Réalisation de l\'âge : '+nomDetail(C)+' coûte '+sur+' de plus.')}
/* Actions jouees a son tour, par lettre (format du journal inchange) */
const actions={
  /* 'j' : Forge eclair (Spom), +1 energie des ce tour, reprise due en fin de tour ; compte comme forger */
  j:{applique:(s,p,a,J)=>{
    J.main.splice(J.main.indexOf(a.c),1);J.forge.push(a.c);J.energie++;J.eclair--;J.eclairUtil++;J.etapeForge=(!J.aForge||J.eclair>0)&&J.main.length>0;
    M.declenche(s,'Forge éclair','Forge 1 carte de plus');dire(s,p,'Spom : Forge éclair, forge 1 carte de plus.');
    M.forgee(s,p,a.c,true);
  }}
};
function compte(r,G,l,k,vs){return r.compte==='element'?compteElement(G,r.el):r.compte==='dessus'?kekwait(G,l,k):vs.length}
function noteCompte(r,p,l,k,g,G,vs,b){
  if(r.compte==='element')G.forEach(L=>L.forEach(n=>{if(n&&carte(n.c).el.includes(r.el))b(r.note,p,g.c,p,n.c)}));
  else if(r.compte==='dessus'){for(let a=0;a<l;a++){const n=G[a][k];if(golem(n))b(r.note,p,g.c,p,n.c)}}
  else vs.forEach(n=>b(r.note,p,g.c,p,n.c));
}
return {types,actions,fonctions:{annonceSurtaxe,foudres,kekwait,REGLAGE_DUO,duoManches,duoVoisin,doubleUp,elessars,graines,spoms,jourDePeche,doublons,ilSuffit}};
}
if(typeof module!=='undefined'&&module.exports)module.exports=fabrique;else (racine.GolemsEffets=racine.GolemsEffets||{}).golems=fabrique;
})(typeof window!=='undefined'?window:globalThis);
