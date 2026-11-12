/* Les Golems : types d'effets des terrains (etape 7). Voir cartes/effets/index.js pour le contrat.
   Chaque terrain (cartes/donnees/terrains.js) declare effet:{type,...reglages}. Le moteur retrouve les effets d'un terrain de la partie par son nom
   (s.terrains garde la copie de la fiche, sans le champ effet). Crochets (r = reglages, k = colonne du terrain) :
     force(r,s,p,k) : Force en plus pour un Golem ici ; inverse(r) : le terrain inverse la Force (pas de Trait ni de cercle) ;
     gagnant(r,s,k,c) : gagnant de la colonne (undefined : regle normale) ; points(r,s) : points du terrain ; bloque(r,s) : ne marque pas cette manche ;
     reduction(r) : cout en moins pour jouer un Golem ici ; unSeul (propriete) : un seul Golem par joueur ici ;
     poseIci(r,s,p,k,C,g,genre) : un Golem vient d'etre pose, remplace ou evolue ici, avant son effet de pose ;
     statsDecompte(r,s,k,c,w,T) : statistiques du decompte ; finManche(r,s,p,k,gagnants,J,gagne) : effet de fin de manche, pour chaque joueur ;
     enDernier (propriete) : son effet de fin de manche passe apres les autres terrains ;
     actionsTerrain(r,s,p,k,J,res) : actions proposees a son tour (ordre : ordre d'enregistrement des types ci-dessous) ;
     robot : ecart(r,s,c,k,p), ptsRobot(r,s), ptsFort(r,s), coefRobot(r,s), robotBonus(r,s,p,k,d), robotFin(s,p,l) (type), estimePose(r,c,p,a). */
(function(racine){'use strict';
function fabrique(M){
const {carte,golem,dire,nomDetail,REGLAGE_TERRAINS}=M;
const declenche=(...a)=>M.declenche(...a);
const CIRQUE_INV={inverse:1,moins:1,premier:1}; /* ancien Cirque (Force inversee), abandonne le 6 nov. au soir, garde derriere le reglage */
const cirqueInv=()=>!!CIRQUE_INV[REGLAGE_TERRAINS.cirque];
const tarteX=s=>REGLAGE_TERRAINS.cirque==='tarte'?1:REGLAGE_TERRAINS.cirque==='tarte_manche'?s.manche:0; /* Le Cirque : X de la tarte (0 : pas de tarte) */
const miseTotale=s=>s.pronos&&s.pronos.m===s.manche?s.pronos.mises[0]+s.pronos.mises[1]:0;
function stT(s){return s.stats.terr||(s.stats.terr={ecole:[],mises:[],cf:[],tartes:[]})}
const stV=s=>{const E=stT(s);if(!E.versus){E.versus=[];E.vs=[]}return E}; /* Le Versus : cles creees a la premiere pose ou au premier decompte (etat des parties sans Versus inchange) */
/* Le Cirque (tarte), statistiques : gagnant si les tartes n'avaient rien fait (approche) : chaque Golem ici recupere les degats de tarte qu'il porte (g.tt, toutes manches),
   et les Golems tues ici par une tarte de cette manche reviennent avec leur Force d'avant la tarte. Ni Trait ni morts en chaine recalcules. */
function cfTarte(s,k,c,w){
  const E=stT(s),c0=c.slice();
  for(let p=0;p<2;p++)for(let l=0;l<3;l++){const g=s.j[p].grille[l][k];if(golem(g)&&g.tt&&g.hors!==s.manche)c0[p]+=g.tt}
  E.tartes.forEach(x=>{if(x.m===s.manche&&x.mort)c0[1-x.p]+=x.f});
  E.cf.push({m:s.manche,k,nom:s.terrains[k].nom,w,w0:c0[0]!==c0[1]?(c0[0]>c0[1]?0:1):null,c:c.slice(),c0,n:[0,1].map(p=>M.golemsIci(s,p,k,true)),duo:[0,0],t:E.tartes.filter(x=>x.m===s.manche).length});
}
/* Le Versus : le Golem adverse ici (un seul au plus) perd r.perte de Force ; protection On flip : rien ; GymRat, Chance du debutant : blesse. */
function versusPose(s,p,k,y,g){
  const K=s.j[1-p].grille,l=[0,1,2].find(x=>golem(K[x][k])),E=stV(s);
  if(l===undefined){E.versus.push({m:s.manche,p,y,eff:0,mort:0,vide:1});return}
  const h=K[l][k],n=nomDetail(carte(h.c));
  if(!M.ciblable(s,1-p,l,k,p)){dire(s,p,'Le Versus : '+n+' est protégé (On flip).');E.versus.push({m:s.manche,p,y,eff:0,mort:0});return}
  const d0=h.d;declenche(s,'Le Versus',n+' perd 1');dire(s,p,'Le Versus : '+n+' (adverse) perd 1 de Force.');
  M.blesse(s,1-p,l,k,1,{p,c:g.c,lib:'Le Versus'});const eff=h.d-d0;if(eff)M.nettoie(s);
  E.versus.push({m:s.manche,p,y,eff,mort:K[l][k]!==h?1:0});
}
const types={
  /* Le Vaisseau : une fois par manche, echange 2 de tes Golems ici (action 'w'). Les types a actions viennent d'abord, dans l'ordre des actions proposees. */
  echange:{actionsTerrain:(r,s,p,k,J,res)=>{
    if(J.vaisseau===s.manche)return;
    const ls=[0,1,2].filter(l=>golem(J.grille[l][k]));
    ls.forEach((a,i)=>ls.forEach((b,j)=>{if(j>i)res.push({t:'w',k,a,b})}));
  }},
  /* La Faille : une fois par manche, deplace un de tes Golems d'un autre terrain vers une case libre ici (action 'y'). */
  deplacement:{actionsTerrain:(r,s,p,kf,J,res)=>{
    if(J.faille===s.manche)return;
    const libres=[0,1,2].filter(l=>!J.grille[l][kf]);
    for(let l=0;l<3;l++)for(let k=0;k<3;k++)if(k!==kf&&golem(J.grille[l][k]))libres.forEach(d=>res.push({t:'y',l,k,d}));
  }},
  /* Le Cirque : tarte (action 'o', reglage REGLAGE_TERRAINS.cirque 'tarte' ou 'tarte_manche'), une fois par manche, Golem adverse ciblable ici (protection On flip : jamais).
     Variantes abandonnees (inverse, moins, premier) : Force inversee, sans Trait ni cercle, departages. */
  cirque:{
    actionsTerrain:(r,s,p,kc,J,res)=>{if(tarteX(s)&&J.tarte!==s.manche)for(let l=0;l<3;l++)if(M.ciblable(s,1-p,l,kc,p))res.push({t:'o',l})},
    inverse:()=>cirqueInv(),
    /* au moins 1 Golem qui compte au decompte ; un seul camp en a : il gagne ; sinon la plus petite Force, egalite : personne */
    gagnant:(r,s,k,c)=>{
      if(!cirqueInv())return undefined;
      const n=[0,1].map(p=>M.golemsIci(s,p,k,true));
      if(!n[0]||!n[1])return n[0]?0:n[1]?1:null;
      if(c[0]!==c[1])return c[0]<c[1]?0:1;
      const V=REGLAGE_TERRAINS.cirque; /* variantes de departage, jamais par defaut */
      if(V==='moins'&&n[0]!==n[1])return n[0]<n[1]?0:1;
      if(V==='premier'&&s.cirqueP&&s.cirqueP.m===s.manche)return s.cirqueP.p;
      return null;
    },
    poseIci:(r,s,p,k)=>{if(REGLAGE_TERRAINS.cirque==='premier'&&!(s.cirqueP&&s.cirqueP.m===s.manche))s.cirqueP={m:s.manche,p}}, /* Cirque V2 : premier Golem pose ici dans la manche */
    statsDecompte:(r,s,k,c,w,T)=>{if(tarteX(s))cfTarte(s,k,c,w);if(cirqueInv())M.statsSansTerrain(s,k,c,w,T)},
    /* robot : ecart vu par p (inverse, +-3 si un seul camp a des Golems) */
    ecart:(r,s,c,k,p)=>{
      if(!cirqueInv())return undefined;
      const n=[p,1-p].map(q=>M.golemsIci(s,q,k));
      if(!n[0]||!n[1])return !n[0]?(n[1]?-3:0):3;
      const d=c[1-p]-c[p];if(d||REGLAGE_TERRAINS.cirque==='inverse')return d;
      const w=M.gagnantColonne(s,k,c);return w===null?0:w===p?1:-1; /* variantes : egalite departagee, comptee comme 1 d'avance */
    }},
  /* Les Pronos : une fois par manche, mise 1 energie ici (action 't') ; fin de manche, le gagnant marque 1 point de plus par mise des deux joueurs. */
  paris:{
    actionsTerrain:(r,s,p,k,J,res)=>{if(J.energie>=1&&!(s.pronos&&s.pronos.m===s.manche&&s.pronos.mises[p]))res.push({t:'t'})},
    statsDecompte:(r,s,k,c,w)=>{if(miseTotale(s)){stT(s).mises.push({m:s.manche,mises:s.pronos.mises.slice(),w});if(w===null)dire(s,null,'Les Pronos : personne ne gagne, les mises sont perdues.')}},
    finManche:(r,s,p,k,gagnants,J,gagne)=>{const nom=s.terrains[k].nom;if(gagne&&miseTotale(s)){const n=miseTotale(s);J.score+=n;declenche(s,nom,'+'+n+' point'+(n>1?'s':''));dire(s,p,'Les Pronos, '+n+' mise'+(n>1?'s':'')+' : +'+n+' point'+(n>1?'s':'')+'.')}},
    ptsRobot:(r,s)=>1+miseTotale(s),
    /* robot : mise en fin de tour (l'energie restante serait perdue), si p gagne ici de plus de 2 par tour adverse restant dans la manche */
    robotFin:(s,p,l)=>{
      if(!l.some(a=>a.t==='t'))return null;
      const k=M.kAvec(s,'ptsRobot'),d=M.ecart(s,M.colonnes(s)[k],k,p),r=3-s.tour+(p===s.premier?1:0);
      return d>2*r?{t:'t'}:null;
    }},
  /* Le Buzzer : fin de manche, le gagnant regarde ses r.n prochaines cartes et les remet dans l'ordre (attente 'b'). Passe apres les autres terrains. */
  reordonne:{enDernier:true,finManche:(r,s,p,k,gagnants,J,gagne)=>{
    if(!gagne)return;const nom=s.terrains[k].nom;
    if(J.deck.length){s.attente={t:'b',p,options:J.deck.slice(0,r.n)};declenche(s,nom,'Réordonne');dire(s,p,'Le Buzzer : regarde ses prochaines cartes et les remet dans l\'ordre.')}
    else dire(s,p,'Le Buzzer : deck vide, rien à regarder.');
  }},
  /* Le Camp : fin de manche, tous les Golems ici recuperent r.n de Force (degats). */
  soin:{finManche:(r,s,p,k,gagnants,J)=>{
    const nom=s.terrains[k].nom,soin=[0,1,2].map(l=>J.grille[l][k]).filter(g=>golem(g)&&g.d>0);
    soin.forEach(g=>{g.d=Math.max(0,g.d-r.n);s.stats.ev.push({t:'r',cp:p,cc:g.c,n:r.n,y:'camp'});declenche(s,nom,'Soigne '+nomDetail(carte(g.c)))});
    if(soin.length)dire(s,p,'Le Camp : '+soin.map(g=>nomDetail(carte(g.c))).join(' et ')+(soin.length>1?' récupèrent':' récupère')+' 1 de Force.');
  }},
  /* L'Ecran du MJ : fin de manche, le gagnant regarde la main adverse (s.dernier.ecran, remplie a la fin des effets). */
  regardeMain:{finManche:(r,s,p,k,gagnants,J,gagne)=>{if(gagne){const nom=s.terrains[k].nom;s.dernier.ecran={p,main:null};declenche(s,nom,'Regarde la main');dire(s,p,'L\'Écran du MJ : regarde la main adverse.')}}},
  /* La Boutique : jouer un Golem ici (poser, remplacer, faire evoluer ; jamais un animal) coute r.cout de moins. */
  reduction:{reduction:r=>r.cout},
  /* La Nuit au Village : fin de manche (une seule fois, au tour du premier joueur), le Golem le plus faible ici est detruit ; egalite : aucun. */
  detruitFaible:{finManche:(r,s,p,k)=>{
    if(p!==s.premier)return;const nom=s.terrains[k].nom;
    const l=[];
    for(let q=0;q<2;q++)for(let y=0;y<3;y++)if(golem(s.j[q].grille[y][k]))l.push({q,y,v:M.forceDe(s,q,y,k)});
    if(l.length){
      const min=Math.min(...l.map(x=>x.v)),f=l.filter(x=>x.v===min);
      if(f.length===1){dire(s,null,'La Nuit au Village : '+nomDetail(carte(s.j[f[0].q].grille[f[0].y][k].c))+' est détruit.');declenche(s,nom,'Détruit '+nomDetail(carte(s.j[f[0].q].grille[f[0].y][k].c)));s.stats.cause={p:null,c:null,lib:nom};M.note(s,'m',1,s.stats.cause,f[0].q,s.j[f[0].q].grille[f[0].y][k].c);M.retire(s,f[0].q,f[0].y,k)}
      else dire(s,null,'La Nuit au Village : égalité, aucun Golem détruit.');
    }
  }},
  /* Le Plateau de Jeu : fin de manche, le gagnant lance 1 de ; a partir de r.min, r.points de plus. */
  dePoint:{finManche:(r,s,p,k,gagnants,J,gagne)=>{
    if(!gagne)return;const nom=s.terrains[k].nom;
    const v=M.de(s,p);declenche(s,nom,'Dé '+v+(v>=r.min?', +1 point':''));
    if(v>=r.min){J.score+=r.points;dire(s,p,'Le Plateau de Jeu lance '+v+' : +1 point.')}
    else dire(s,p,'Le Plateau de Jeu lance '+v+' : pas de point.');
  }},
  /* Le Carrousel : fin de manche, le gagnant defausse 1 carte de sa main (attente 'd' avec src). */
  defausse:{finManche:(r,s,p,k,gagnants,J,gagne)=>{
    if(!gagne)return;const nom=s.terrains[k].nom;
    if(J.main.length){s.attente={t:'d',p,src:nom};declenche(s,nom,'Défausse 1 carte')}
    else dire(s,p,'Le Carrousel : main vide, rien à défausser.');
  }},
  /* La Salle Verrouillee : ne marque qu'a la manche r.manche. Robot : moitie de sa valeur avant (valeur forte), coefficient .4 (valeur normale). */
  derniereManche:{bloque:(r,s)=>s.manche<r.manche,ptsFort:(r,s)=>s.manche<r.manche?2:4,coefRobot:(r,s)=>s.manche<r.manche?.4:1},
  /* L'Ecole : fin de manche, le perdant (s'il y a un gagnant) pioche 1 carte (deck vide : 1 point a l'adversaire). Robot : 1 point de plus ou de moins si le perdant a un deck vide. */
  piochePerdant:{
    finManche:(r,s,p,k,gagnants,J,gagne)=>{
      if(gagnants[k]===null||gagne)return;const nom=s.terrains[k].nom;
      const v=!J.deck.length&&!s.deckLibre?1:0;declenche(s,nom,v?'Deck vide : +1 point adverse':'Pioche 1 carte');dire(s,p,'L\'École : pioche 1 carte.');
      M.pioche(s,p,1);stT(s).ecole.push({m:s.manche,p,v});
    },
    robotBonus:(r,s,p,k,d)=>d>0&&!s.j[1-p].deck.length?1:d<0&&!s.j[p].deck.length?-1:0},
  /* Le Karaoke : si tu as exactement r.n Golems ici, ils gagnent +r.bonus chacun. */
  paire:{force:(r,s,p,k)=>M.golemsIci(s,p,k)===r.n?r.bonus:0,statsDecompte:(r,s,k,c,w,T)=>M.statsSansTerrain(s,k,c,w,T)},
  /* Le Tournoi : vaut le numero de la manche (1, 2, 3). */
  pointsManche:{points:(r,s)=>s.manche},
  /* Le Versus : un seul Golem par joueur ici ; quand tu en poses un (pose, remplacement, evolution), le Golem adverse ici perd 1 de Force. */
  unSeul:{unSeul:true,
    poseIci:(r,s,p,k,C,g,genre)=>versusPose(s,p,k,genre,g),
    statsDecompte:(r,s,k,c,w)=>{const E=stV(s),v=E.versus.filter(x=>x.m===s.manche);E.vs.push({m:s.manche,w,d:v.length?v[v.length-1].p:null,c:c.slice()})},
    estimePose:(r,c,p,a)=>{const K=c.j[1-p].grille,l=[0,1,2].find(x=>golem(K[x][a.k]));if(l!==undefined){const h=K[l][a.k];if(M.ciblable(c,1-p,l,a.k,p)&&!M.protegeRobot(h))h.d++}}}
};
/* Actions des terrains jouees a son tour, par lettre (format du journal inchange). */
const actions={
  w:{applique:(s,p,a,J)=>{ /* Le Vaisseau */
      const kv=M.kAvec(s,'actionsTerrain','echange'),nom=s.terrains[kv].nom;s.stats.cause={p,c:null,lib:nom};declenche(s,nom,'Échange 2 Golems');
      const G=J.grille,x=G[a.a][a.k],y=G[a.b][a.k];
      G[a.a][a.k]=y;G[a.b][a.k]=x;J.vaisseau=s.manche;
      dire(s,p,'Le Vaisseau : échange '+nomDetail(carte(x.c))+' et '+nomDetail(carte(y.c))+'.');M.nettoie(s);
    },
    estime:(c,p,a,G)=>{const x=G[a.a][a.k];G[a.a][a.k]=G[a.b][a.k];G[a.b][a.k]=x}},
  y:{applique:(s,p,a,J)=>{ /* La Faille */
      const kf=M.kAvec(s,'actionsTerrain','deplacement'),nom=s.terrains[kf].nom;s.stats.cause={p,c:null,lib:nom};declenche(s,nom,'Déplace 1 Golem');
      const G=J.grille,g=G[a.l][a.k];
      G[a.d][kf]=g;G[a.l][a.k]=null;J.faille=s.manche;
      dire(s,p,'La Faille : déplace '+nomDetail(carte(g.c))+'.');M.nettoie(s);
    },
    estime:(c,p,a,G,s)=>{G[a.d][M.kAvec(s,'actionsTerrain','deplacement')]=G[a.l][a.k];G[a.l][a.k]=null}},
  o:{applique:(s,p,a,J)=>{ /* Le Cirque : tarte, X de Force en moins (definitif), protections de blesse ; J.tarte cree au premier usage */
      const kc=M.kAvec(s,'actionsTerrain','cirque'),X=tarteX(s),K=s.j[1-p],g=K.grille[a.l][kc],f=M.forceDe(s,1-p,a.l,kc),d0=g.d,n=nomDetail(carte(g.c)),nom=s.terrains[kc].nom;
      J.tarte=s.manche;s.stats.cause={p,c:null,lib:nom};declenche(s,nom,'Tarte : '+n+' subit '+X+(X>1?' dégâts':' dégât'));dire(s,p,'Le Cirque : tarte sur '+n+' (adverse), '+X+(X>1?' dégâts.':' dégât.'));
      M.blesse(s,1-p,a.l,kc,X,{p,c:null,lib:nom});const eff=g.d-d0;if(eff)g.tt=(g.tt||0)+eff;M.nettoie(s);
      stT(s).tartes.push({m:s.manche,p,l:a.l,x:X,eff,mort:K.grille[a.l][kc]!==g?1:0,f});
    },
    estime:(c,p,a,G,s)=>{const h=c.j[1-p].grille[a.l][M.kAvec(s,'actionsTerrain','cirque')];if(!M.protegeRobot(h))h.d+=tarteX(s)}, /* GymRat et Chance du debutant : rien */
    gainRobot:(s,p,a,apres)=>!apres.j[1-p].grille[a.l][M.kAvec(s,'actionsTerrain','cirque')]?.3:0}, /* tarte qui tue, une perte definitive pour l'adversaire */
  t:{applique:(s,p,a,J)=>{ /* Les Pronos : mise de 1 energie, remise a zero a chaque manche */
      const nom=s.terrains[M.kAvec(s,'ptsRobot')].nom;
      if(!s.pronos||s.pronos.m!==s.manche)s.pronos={m:s.manche,mises:[0,0]};
      s.pronos.mises[p]=1;J.energie--;declenche(s,nom,'Mise');dire(s,p,'Les Pronos : mise 1 énergie.');
    }}
};
return {types,actions,fonctions:{cirqueInv,tarteX,miseTotale,stT,stV,cfTarte,versusPose}};
}
if(typeof module!=='undefined'&&module.exports)module.exports=fabrique;else (racine.GolemsEffets=racine.GolemsEffets||{}).terrains=fabrique;
})(typeof window!=='undefined'?window:globalThis);
