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
  T.forEach(x=>{const J=s.j[x.q];x.ani=J.grille[x.l][x.k].ani;J.defausse.push(x.c);J.grille[x.l][x.k]=null});
  T.forEach(x=>M.orphelins(s,x.q,x.c,false,x.ani)); /* 0.6 : l'animal attache (Kiwi, Jacen et Jaina) va aussi a la defausse */
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
const aEffet=(id,type,f)=>M.effs(id).find(e=>e.r.type===type&&(!f||f(e.r))); /* effet d'un type (et d'un reglage) dans la fiche id */
/* ---- Bellock/Loxim : « Si tu forges cette carte ». La carte c vient de passer de la main a la Forge (Forge 'f', Forge eclair 'j', Spam 's'). Le joueur pioche AU HASARD
   un exemplaire du partenaire parmi tous ceux de son deck, bases et evolutions confondues (chaque exemplaire a la meme chance : tirage pondere par
   le nombre d'exemplaires), par le generateur du joueur (rejeu identique), dans l'ordre des numeros de carte (l'ordre du deck ne compte pas).
   Aucun : rien, pas de melange. Puis il melange son deck. etape : pendant l'etape de Forge (on la recalcule).
   Jamais pour une copie (Apo, chansonnier) : on ne forge pas une carte en jeu. */
function partenaires(J,c){
  const e=aEffet(carte(c).id,'duo');if(!e)return [];const P=e.r.partenaire;
  return J.deck.filter(x=>{const id=carte(x).id;return id===P||CARTES[id].base===P}).sort((a,b)=>a-b);
}
function forgeDuo(r,s,p,c,etape){
  const C=carte(c),J=s.j[p],o=partenaires(J,c),n=nomDetail(C)+' : '+r.nom,P=CARTES[r.partenaire].nom;
  M.declenche(s,r.nom,o.length?'Cherche '+P:'Aucun '+P);
  if(!o.length){dire(s,p,n+', aucun '+P+' dans le deck.');return}
  prendDuo(s,p,o[Math.floor(M.alea(s.rng,p)*o.length)],n);if(etape)J.etapeForge=(!J.aForge||J.eclair>0)&&J.main.length>0;
}
function prendDuo(s,p,x,n){
  const J=s.j[p];J.deck.splice(J.deck.indexOf(x),1);J.main.push(x);M.melange(s.rng,p,J.deck);
  dire(s,p,n+', pioche '+nomDetail(carte(x))+' dans son deck, puis le mélange.');
}
/* Robot : carte du duo a forger, ou null. Seulement si une version du partenaire reste dans le deck (le contenu du deck se deduit
   de la liste du deck et des cartes vues ; l'ordre n'est jamais regarde). Garde une evolution dont la base est en jeu (elle se joue),
   et une base qui est la seule voie vers son evolution en main. Parmi les autres : la moins utile. */
function forgeUtile(s,p,l){
  const J=s.j[p],G=J.grille,enJeu=id=>G.some(L=>L.some(g=>golem(g)&&carte(g.c).id===id)),enMain=id=>J.main.filter(q=>carte(q).id===id).length;
  const cs=l.filter(c=>{const C=carte(c);if(!aEffet(C.id,'duo')||!partenaires(J,c).length)return false;
    if(C.base)return !enJeu(C.base);
    return !(J.main.some(q=>carte(q).base===C.id)&&!enJeu(C.id)&&enMain(C.id)<2)});
  return cs.length?M.parUtilite(s,p,cs).pop():null;
}
/* ---- JackJoy. Sub offert (bonusForge, mode sub) : si la carte est forgee (Forge, Forge eclair, Spam), un Golem allie en jeu au choix gagne +1 pour la partie (g.sub).
   Draft diff (mode draft, ou Apo / chansonnier qui l'a copie) : chaque fois que son joueur forge, un Golem allie en jeu non voisin (haut, bas, gauche,
   droite ; diagonales permises), jamais lui-meme, gagne +1 jusqu'a la fin de la partie (V2 ; g.dr). Copier Sub offert ne sert a rien (on ne forge pas une copie).
   Bonus portes par l'objet du Golem : listes des cartes donneuses. Perdus s'il meurt ou est remplace ; a l'evolution, Sub offert et Draft diff gardes (V2) ; gardes s'il est deplace
   ou echange. g.dr est vide apres le decompte et les effets de fin de manche (finDraft). Animaux jamais cibles.
   Declenchements d'une Forge : Sub offert d'abord, puis chaque Draft diff dans l'ordre de lecture de la grille. Aucune cible : rien ;
   une seule : d'office ; sinon attente 'l' (cases, file des declenchements restants), coup 'l' + ligne + colonne.
   REGLAGE_JJ : regle V2 decidee par Romain et JackJoy le 5 nov. (par defaut) : garde = Sub offert et Draft diff gardes quand le Golem booste evolue ;
   partie = Draft diff dure toute la partie (g.dr n'expire plus). false/false = premiere version (manche, perdu a l'evolution), simulations seulement. */
const REGLAGE_JJ={garde:true,partie:true};
const estSub=id=>!!aEffet(id,'bonusForge',r=>r.mode==='sub'),estDraft=id=>!!aEffet(id,'bonusForge',r=>r.mode==='draft');
function jjBonus(g){return (g.sub?g.sub.length:0)+(g.dr?g.dr.length:0)}
function ciblesJJ(G,y,i){const r=[];G.forEach((L,a)=>L.forEach((g,b)=>{if(golem(g)&&(y==='sub'||Math.abs(a-i[0])+Math.abs(b-i[1])>1))r.push([a,b])}));return r}
function forgeJJ(s,p,c){
  const f=[];if(estSub(carte(c).id))f.push({y:'sub',src:c});
  s.j[p].grille.forEach(L=>L.forEach(g=>{if(golem(g)&&estDraft(M.idEff(g)))f.push({y:'draft',src:g.c})}));
  if(f.length)suiteJJ(s,p,f);
}
function suiteJJ(s,p,f){
  const J=s.j[p];
  while(f.length){
    const e=f.shift();let i=null;
    if(e.y==='draft'){i=M.caseDeCarte(s,p,e.src);if(!i||!estDraft(M.idEff(J.grille[i[0]][i[1]])))continue}
    const cs=ciblesJJ(J.grille,e.y,i);
    if(!cs.length){dire(s,p,nomDetail(carte(e.src))+' : '+(e.y==='sub'?'Sub offert':'Draft diff')+', aucun Golem allié à cibler.');continue}
    if(cs.length===1){donneJJ(s,p,e,cs[0][0],cs[0][1]);continue}
    s.attente={t:'l',p,y:e.y,src:e.src,i,cases:cs,file:f};return;
  }
}
function donneJJ(s,p,e,l,k){
  const g=s.j[p].grille[l][k],sub=e.y==='sub',x=sub?'sub':'dr',fin=sub||REGLAGE_JJ.partie?'partie':'manche';(g[x]||(g[x]=[])).push(e.src);
  M.declenche(s,sub?'Sub offert':'Draft diff','+1 pour '+nomDetail(carte(g.c)));
  dire(s,p,nomDetail(carte(e.src))+' : '+(sub?'Sub offert':'Draft diff')+', '+nomDetail(carte(g.c))+' gagne +1 de Force jusqu\'à la fin de la '+fin+'.');
}
function finDraft(s){
  if(REGLAGE_JJ.partie)return false;let n=0;s.j.forEach(J=>J.grille.forEach(L=>L.forEach(g=>{if(g&&g.dr){n+=g.dr.length;delete g.dr}})));
  if(n)dire(s,null,'Fin de manche : les bonus de Draft diff disparaissent.');
  return n>0;
}
/* Robot. Forge une carte Sub offert de base si un Golem allie est en jeu, sauf si c'est la seule voie vers un Draft diff en main.
   draftActif : un Draft diff en jeu a une cible, chaque Forge rapporte (on forge meme au-dela de la cible de Forge).
   Cible : celle qui donne la meilleure valeur du plateau (gagner ou garder un terrain serre) ; Sub offert : petite preference pour une evolution
   (elle ne sera pas remplacee), Golem qui perd de la Force a chaque fin de manche (KaTarN) evite. Egalite : premiere case. */
function jjForgeRobot(s,p){
  const J=s.j[p],G=J.grille;if(!G.some(L=>L.some(golem)))return null;
  const b=J.main.filter(c=>estSub(carte(c).id));if(!b.length)return null;
  if(J.main.some(c=>estDraft(carte(c).id))&&!G.some(L=>L.some(g=>golem(g)&&estSub(carte(g.c).id)))&&b.length<2)return null;
  return b[0];
}
function draftActif(s,p){const G=s.j[p].grille;return G.some((L,a)=>L.some((g,b)=>golem(g)&&estDraft(M.idEff(g))&&ciblesJJ(G,'draft',[a,b]).length>0))}
function choixJJ(s,p,l){
  const A=s.attente,x=A.y==='sub'?'sub':'dr';let m=l[0],v=-Infinity;
  l.forEach(a=>{const C=carte(s.j[p].grille[a.l][a.k].c);
    const w=M.valeur(M.simule(s,d=>{const g=d.j[p].grille[a.l][a.k];g[x]=(g[x]||[]).concat(A.src)}),p)+(A.y==='sub'?(C.base?.02:0)-(aEffet(C.id,'pertesFinManche')?.1:0):0);
    if(w>v){v=w;m=a}});
  return m;
}
/* ---- Indra : favori. choisitFavori : le Golem (l,k) devient le favori de I ; ragebait (La Fan enflammee) : le Golem adverse en face perd r.ragebait. */
function choisitFavori(s,p,I,l,k){
  const f=s.j[p].grille[l][k],e=aEffet(M.idEff(I),'favori');I.fav=f.c;
  dire(s,p,nomDetail(carte(I.c))+' : '+nomDetail(carte(f.c))+' devient son favori (+'+M.favBonus(M.idEff(I))+' de Force).');
  if(e&&e.r.ragebait)ragebait(e.r,s,p,I,l,k);
}
/* Ragebait : degats au Golem adverse en face du favori, effet de carte cible (Mode Avion le protege). */
function ragebait(r,s,p,I,l,k){
  const h=s.j[1-p].grille[l][k];
  if(!golem(h)){dire(s,p,'Ragebait : aucun Golem en face du favori.');return}
  if(!M.ciblable(s,1-p,l,k,p)){dire(s,p,'Ragebait : '+nomDetail(carte(h.c))+' est protégé (Mode Avion).');return}
  dire(s,p,'Ragebait : '+nomDetail(carte(h.c))+' perd '+r.ragebait+' de Force.');
  M.blesse(s,1-p,l,k,r.ragebait,{p,c:I.c,lib:'À la pose'});
}
/* Robot, favori d'Indra : le plus fort, +2 s'il partage un element avec Indra, +1 si un Golem adverse ciblable est en face (Ragebait). Egalite : premier de la liste. */
function choixFavori(s,p,l){
  const [il,ik]=s.attente.i,I=s.j[p].grille[il][ik],el=carte(I.c).el,e=aEffet(M.idEff(I),'favori'),evo=!!(e&&e.r.ragebait);let m=l[0],v=-Infinity;
  l.forEach(a=>{const g=s.j[p].grille[a.l][a.k],x=M.forceDe(s,p,a.l,a.k)+(carte(g.c).el.some(e=>el.includes(e))?2:0)+(evo&&M.ciblable(s,1-p,a.l,a.k,p)?1:0);if(x>v){v=x;m=a}});
  return m;
}
/* ---- Glad : Slam. Seuls les Golems adverses ciblables (Mode Avion exclu) ayant une case libre adjacente (haut, bas, gauche, droite, jamais en diagonale)
   sont proposes, vers chacune de ces cases. Si aucun n'en a : tout Golem adverse ciblable, [l,k,l,k], il reste en place et perd quand meme 1. */
function slams(s,p){
  const G=s.j[1-p].grille,r=[],place=[];
  for(let l=0;l<3;l++)for(let k=0;k<3;k++)if(G[l][k]&&M.ciblable(s,1-p,l,k,p)){
    place.push([l,k,l,k]);
    [[l-1,k],[l+1,k],[l,k-1],[l,k+1]].filter(([a,b])=>G[a]&&b>=0&&b<3&&!G[a][b]&&!(b!==k&&M.estVersus(s,b)&&M.golemsIci(s,1-p,b))).forEach(([a,b])=>r.push([l,k,a,b])); /* Le Versus : jamais un 2e Golem ici */
  }
  return r.length?r:place;
}
function slam(s,p,c,l,k,m,n){
  const G=s.j[1-p].grille,h=G[l][k],bouge=m!==l||n!==k;if(bouge){G[m][n]=h;G[l][k]=null}
  dire(s,p,'Glad : Slam, '+nomDetail(carte(h.c))+(bouge?' est déplacé':' reste en place (aucune case libre)')+' et perd 1 de Force.');
  M.blesse(s,1-p,m,n,1,{p,c,lib:'À la pose'});
}
/* ---- Copies. Deguisement (Apo, 029e, cible:'voisin') : voisins allies (haut, bas, gauche, droite). 0 : rien. 1 : d'office. Sinon : attente 'k'.
   Un copieur ne porte jamais l'identifiant d'un copieur (idEff) : copier un copieur donne son effet copie, sans boucle possible. */
function deguisement(s,p,l,k,g){
  const J=s.j[p];
  M.nettoie(s);
  if(J.grille[l][k]!==g)return;
  const cs=M.voisinsCases(J.grille,l,k);
  if(!cs.length){g.cp=null;dire(s,p,nomDetail(carte(g.c))+' : aucun voisin, rien à copier.');return}
  if(cs.length===1)return copie(s,p,l,k,g,cs[0][0],cs[0][1]);
  s.attente={t:'k',p,i:[l,k],cases:cs};
}
function copie(s,p,l,k,g,a,b,q){ /* q : camp du Golem copie (le sien par defaut ; l'adverse pour Imitation, Velnen) */
  const n=s.j[q===undefined?p:q].grille[a][b];g.cp=M.idEff(n);
  dire(s,p,nomDetail(carte(g.c))+' copie '+nomDetail(carte(n.c))+(g.cp?'.':' : rien à copier.'));
  M.effetPose(s,p,l,k,g);
}
/* Velnen : Imitation (Le chansonnier, 041e, cible:'face'), a la pose. Cible : le Golem adverse en face (meme terrain, meme ligne). Case vide ou animal : rien.
   Mode Avion : rien (ciblable). Apo ou chansonnier en face qui n'a rien copie : rien. Sinon, choix 'i' : copier (1) ou refuser (0), toujours propose.
   La copie est figee a la pose (g.cp) et se lit du point de vue du chansonnier (« adverse » = l'autre camp). */
function imitation(s,p,l,k,g){
  const J=s.j[p],n=nomDetail(carte(g.c))+' : Imitation';
  M.nettoie(s);
  if(J.grille[l][k]!==g)return;
  const h=s.j[1-p].grille[l][k];
  if(!golem(h)){g.cp=null;dire(s,p,n+', aucun Golem en face.');return}
  if(!M.ciblable(s,1-p,l,k,p)){g.cp=null;dire(s,p,n+', '+nomDetail(carte(h.c))+' est protégé (Mode Avion).');return}
  if(!M.idEff(h)){g.cp=null;dire(s,p,n+', '+nomDetail(carte(h.c))+' n\'a rien à copier.');return}
  s.attente={t:'i',p,i:[l,k]};
}
/* ---- Shifukuro : meandyou (Le moderateur, 025e), a la pose, facultatif. Choix 1 : un Golem allie au-dessus de (l,k) sur le meme terrain ;
   choix 2 : un de ses voisins (Golem allie adjacent, sans diagonale ; le moderateur lui-meme compte comme voisin du Golem juste au-dessus).
   Paires sans doublon, chaque paire dans l'ordre de lecture (ligne puis colonne) : [a,b,x,y]. Un animal n'est jamais echange. */
function echangesMeandyou(G,l,k){
  const r=[],vu={};
  for(let a=0;a<l;a++)if(golem(G[a][k]))M.voisinsCases(G,a,k).forEach(([x,y])=>{
    const P=[[a,k],[x,y]].sort((A,B)=>A[0]*3+A[1]-B[0]*3-B[1]),c=P.join();if(!vu[c]){vu[c]=1;r.push([P[0][0],P[0][1],P[1][0],P[1][1]])}});
  return r;
}
/* Aucun echange possible : une ligne de journal. Sinon attente 'u' : coup 'e' (la paire, dans n'importe quel ordre) ou 'v' (passer).
   haut : les Golems au-dessus qui ont au moins un echange (premier choix de l'interface). */
function meandyou(s,p,l,k,g){
  const J=s.j[p],n=nomDetail(carte(g.c))+' : meandyou';
  M.nettoie(s);
  if(J.grille[l][k]!==g)return;
  const coups=echangesMeandyou(J.grille,l,k);
  if(!coups.length){dire(s,p,n+', aucun échange possible.');return}
  const haut=[];for(let a=0;a<l;a++)if(coups.some(([x,y,u,v])=>(x===a&&y===k)||(u===a&&v===k)))haut.push([a,k]);
  s.attente={t:'u',p,i:[l,k],coups,haut};
}
/* ---- K-Chan : Love inconditionnel (008e, ou copieur), une fois par manche et par exemplaire (g.love), a son tour apres la Forge :
   un Golem allie blesse (g.d > 0, K-Chan comprise) perd 1 degat, jamais au-dela de sa Force imprimee. Coup 'r' + l k (K-Chan) + m n (cible). Sans blesse : rien. */
const estType=(g,type)=>!!aEffet(M.idEff(g),type);
function loves(s,p){const r=[],G=s.j[p].grille,bl=[];for(let l=0;l<3;l++)for(let k=0;k<3;k++)if(golem(G[l][k])&&G[l][k].d>0)bl.push([l,k]);if(!bl.length)return r;
  for(let l=0;l<3;l++)for(let k=0;k<3;k++){const g=G[l][k];if(golem(g)&&estType(g,'soinAllie')&&g.love!==s.manche)bl.forEach(([m,n])=>r.push({t:'r',l,k,m,n}))}return r}
/* Robot : soigne en fin de tour (apres ses poses) des qu'il y a une cible. Cible : la meilleure valeur du plateau apres le soin
   (colonne qui bascule), plus REGLAGE_KC.risque si la cible est a 1 de Force (moitie a 2 : elle risque de mourir). Egalite : premiere option. */
const REGLAGE_KC={risque:.3};
function choixLove(s,p,l){
  const r=l.filter(a=>a.t==='r');if(!r.length)return null;let m=null,v=-Infinity;
  r.forEach(a=>{const f=M.forceDe(s,p,a.m,a.n),w=M.valeur(M.simule(s,d=>{const h=d.j[p].grille[a.m][a.n];h.d=Math.max(0,h.d-1)}),p)+REGLAGE_KC.risque*(f<=1?1:f<=2?.5:0);if(w>v){v=w;m=a}});
  return m;
}
/* ---- Caramel a volonte (Titom76, 026e) : une fois par manche et par carte, a son tour apres la Forge, +1 energie. */
function caramels(s,p){const r=[],G=s.j[p].grille;for(let l=0;l<3;l++)for(let k=0;k<3;k++){const g=G[l][k];if(g&&estType(g,'energieTour')&&g.car!==s.manche)r.push({t:'z',l,k})}return r}
/* Robot : seulement si le +1 permet de payer une carte impayable sinon, et que ce coup vaut mieux que le meilleur coup sans lui. */
function caramelUtile(s,p,l,seuil){
  const z=l.find(a=>a.t==='z');if(!z)return null;
  const J=s.j[p],b0=M.meilleur(s,p,l.filter(a=>a.t!=='z'&&a.t!=='x'&&a.t!=='r'));
  const H={...s,j:s.j.map((K,i)=>i===p?{...K,energie:K.energie+1}:K)};
  const neuf=M.legales(H,p).filter(a=>a.t==='p'&&M.coutPose(s,p,a.c,a.l,a.k)>J.energie);
  if(!neuf.length)return null;
  const b1=M.meilleur(H,p,neuf);
  return b1.a&&b1.g>seuil&&b1.g>(b0.a?b0.g:-Infinity)?z:null;
}
/* ---- Le Q, robot : Jour de peche, defausse la carte la plus utile a l'adversaire (utilite vue de son camp, sa main cachee : vide). */
function choixPeche(s,p,l){const H={...s,j:s.j.map((K,i)=>i===1-p?{...K,main:[]}:K)};return M.parUtilite(H,1-p,l.map(a=>a.c))[0]}
/* ---- Elccino. Cafe du matin (cafeDuMatin, Elccino de base ou copieur) : a la pose (apres les morts de la pose), puis au debut des manches 2 et 3
   avant le premier tour (chaque Golem en jeu qui porte l'effet, premier joueur de la manche d'abord, file s.cafes creee seulement dans ce cas).
   Regarde les 2 premieres cartes de son deck : attente 'cafe' (coup 'u' + carte prise), l'autre va tout en bas du deck. 1 carte : prise d'office.
   Deck vide : rien, ce n'est pas une pioche (aucun point). Puis un Golem allie au choix, lui compris, gagne +r.bonus (g.cf, jusqu'a la fin de la partie).
   La taupe (taupe, evolution ou copieur) : a la pose, regarde la main adverse, attente 'taupe' (coup 'u' + carte), l'adversaire la defausse (main vide : rien),
   puis un Golem allie au choix gagne +r.bonus. Pas un ciblage de Golem (Mode Avion ne protege pas). Le Cafe du matin ne joue plus apres l'evolution.
   Bonus : attente 'boost' (coup 'q' + ligne + colonne) ; un seul Golem allie : d'office ; aucun : rien. g.cf garde a l'evolution, suit les deplacements,
   perdu au remplacement. Statistiques : s.stats.elc = {cafe, taupe, boost}, cree au premier effet. src : carte qui agit (Elccino ou copieur). */
function stE(s){return s.stats.elc||(s.stats.elc={cafe:[],taupe:[],boost:[]})}
function cafe(s,p,src,quand,r){
  const J=s.j[p],D=J.deck,n=nomDetail(carte(src));
  if(D.length>=2){dire(s,p,n+' : Café du matin, regarde les 2 premières cartes de son deck.');M.declenche(s,'Café du matin','Regarde 2');stE(s).cafe.push({m:s.manche,p,n:1,v:0,q:quand});
    s.attente={t:'cafe',p,options:D.slice(0,2),regard:1,oblig:1,src,b:r.bonus};return}
  const pris=D.length;
  if(pris){J.main.push(D.shift());dire(s,p,n+' : Café du matin, prend la dernière carte de son deck.');M.declenche(s,'Café du matin','Prend 1')}
  else{dire(s,p,n+' : Café du matin, deck vide, rien à prendre.');M.declenche(s,'Café du matin','Deck vide')}
  stE(s).cafe.push({m:s.manche,p,n:pris,v:0,q:quand});
  boost(s,p,r.bonus,src,'Café du matin');
}
function taupe(s,p,src,r){
  const K=s.j[1-p],n=nomDetail(carte(src));M.declenche(s,'La taupe','Regarde la main adverse');dire(s,p,n+' : La taupe, regarde la main adverse.');
  if(K.main.length){s.attente={t:'taupe',p,adv:1,options:K.main.slice(),src,b:r.bonus};return}
  stE(s).taupe.push({m:s.manche,p,c:null});dire(s,p,'La taupe : main adverse vide, rien à défausser.');boost(s,p,r.bonus,src,'La taupe');
}
function boost(s,p,n,src,nom){
  const cs=[];s.j[p].grille.forEach((L,l)=>L.forEach((g,k)=>{if(golem(g))cs.push([l,k])}));
  if(cs.length>1){s.attente={t:'boost',p,cases:cs,n,src,nom};return}
  if(cs.length)donneBoost(s,p,cs[0][0],cs[0][1],n,nom);
  suiteCafe(s);
}
function donneBoost(s,p,l,k,n,nom){
  const g=s.j[p].grille[l][k];g.cf=(g.cf||0)+n;stE(s).boost.push({m:s.manche,p,n,c:g.c});
  M.declenche(s,nom,nomDetail(carte(g.c))+' +'+n);dire(s,p,nomDetail(carte(g.c))+' gagne +'+n+' de Force.');
}
/* debut des manches 2 et 3 : renvoie true si des Cafes sont en file (debutTour viendra a la fin de la file) */
function cafesManche(s){
  const f=[];[s.premier,1-s.premier].forEach(p=>s.j[p].grille.forEach(L=>L.forEach(g=>{if(golem(g)){const e=aEffet(M.idEff(g),'cafeDuMatin');if(e)f.push({p,c:g.c})}})));
  if(!f.length)return false;
  s.cafes=f;suiteCafe(s);return true;
}
function suiteCafe(s){
  if(!s.cafes||s.attente)return;
  while(s.cafes.length){const x=s.cafes.shift(),i=M.caseDeCarte(s,x.p,x.c);if(!i)continue;const e=aEffet(M.idEff(s.j[x.p].grille[i[0]][i[1]]),'cafeDuMatin');if(!e)continue;
    cafe(s,x.p,x.c,'manche',e.r);if(s.attente)return}
  delete s.cafes;M.debutTour(s);
}
/* Robot : Cafe, la carte la plus utile ; La taupe, la carte adverse la plus utile (il la voit) ; bonus, le Golem qui fait le plus monter la valeur du plateau. */
function choixElccino(s,p,l){
  const A=s.attente;
  if(A.t==='cafe')return {t:'u',c:M.parUtilite(s,p,A.options)[0]};
  if(A.t==='taupe')return {t:'u',c:M.parUtilite(s,1-p,A.options)[0]};
  const F={...s,fort:true},v0=M.valeur(F,p);let m=l[0],v=-Infinity;
  l.forEach(a=>{const x=M.valeur(M.simule(F,c=>{const g=c.j[p].grille[a.l][a.k];g.cf=(g.cf||0)+A.n}),p)-v0;if(x>v){v=x;m=a}});
  return m;
}
/* Attentes (s.attente.t) des Golems : coups proposes, application, choix du robot (X : etat vu par le robot, {fort:true} en Difficile). */
const attentes={
  q:{legales:(s,p,a,J,r)=>a.options.forEach(c=>r.push({t:'c',c})), /* Le Q : Jour de peche, coup 'c' */
     applique:(s,p,a)=>{ /* la carte choisie va a la defausse adverse, l'autre reste sur le deck adverse */
       const K=s.j[1-p],src=s.attente.src||'Le Q : Jour de pêche';K.deck.splice(K.deck.indexOf(a.c),1);s.attente=null;
       K.defausse.push(a.c);dire(s,p,src+', défausse '+nomDetail(carte(a.c))+' du deck adverse et replace l\'autre carte dessus.');
     },
     robot:(s,p,l)=>({t:'c',c:choixPeche(s,p,l)})},
  s:{legales:(s,p,a,J,r)=>J.main.forEach(c=>r.push({t:'s',c})), /* Trigas : Spam, coup 's' */
     applique:(s,p,a,J)=>{ /* Pas de +1 d'energie ce tour : ce n'est pas l'etape de Forge */
       J.main.splice(J.main.indexOf(a.c),1);J.forge.push(a.c);s.attente=null;dire(s,p,'Trigas : place 1 carte dans sa Forge.');
       M.forgee(s,p,a.c,false); /* le Spam compte comme forger */
     },
     robot:(s,p,l,X,fort)=>{const du=M.forgePreferee(s,p);return {t:'s',c:du!==null?du:fort?M.forgeForte(s,p):M.parUtilite(s,p,l.map(a=>a.c)).pop()}}},
  g:{legales:(s,p,a,J,r)=>a.cases.forEach(([l,k])=>r.push({t:'g',l,k})), /* Indra : favori */
     applique:(s,p,a,J)=>{const [il,ik]=s.attente.i,I=J.grille[il][ik];s.attente=null;
       if(I&&J.grille[a.l][a.k]){s.stats.cause={p,c:I.c,lib:'À la pose'};choisitFavori(s,p,I,a.l,a.k);M.nettoie(s)}},
     robot:(s,p,l)=>choixFavori(s,p,l)},
  h:{legales:(s,p,a,J,r)=>a.coups.forEach(([l,k,m,n])=>r.push({t:'h',l,k,m,n})), /* Glad : Slam */
     applique:(s,p,a,J)=>{const [il,ik]=s.attente.i,I=J.grille[il][ik];s.attente=null;
       s.stats.cause={p,c:I?I.c:null,lib:'À la pose'};slam(s,p,I?I.c:null,a.l,a.k,a.m,a.n);M.nettoie(s)},
     robot:(s,p,l,X)=>M.meilleur(X,p,l).a}, /* le deplacement qui ameliore le plus la valeur du plateau (perte de 1 comprise, mort eventuelle, bonus perdus) */
  k:{legales:(s,p,a,J,r)=>a.cases.forEach(([l,k])=>r.push({t:'k',l,k})), /* Deguisement : copie du voisin choisi, puis son effet de pose s'il en a un */
     applique:(s,p,a,J)=>{const [il,ik]=s.attente.i,I=J.grille[il][ik];s.attente=null;
       if(I){s.stats.cause={p,c:I.c,lib:'À la pose'};copie(s,p,il,ik,I,a.l,a.k)}},
     robot:(s,p,l,X)=>M.choixCopie(X,p,l)},
  i:{legales:(s,p,a,J,r)=>r.push({t:'i',o:1},{t:'i',o:0}), /* Velnen : Imitation, copier (1) ou refuser (0) */
     applique:(s,p,a,J)=>{const [il,ik]=s.attente.i,I=J.grille[il][ik],h=s.j[1-p].grille[il][ik];s.attente=null;
       if(I){s.stats.cause={p,c:I.c,lib:'À la pose'};
         if(a.o&&golem(h))copie(s,p,il,ik,I,il,ik,1-p);
         else{I.cp=null;M.declenche(s,'Imitation','Refusée');dire(s,p,nomDetail(carte(I.c))+' : Imitation refusée, ne copie rien.')}}},
     robot:(s,p,l,X)=>M.choixImitation(X,p)},
  u:{normalise:a=>a&&a.t==='e'&&a.a&&a.b&&a.a[0]*3+a.a[1]>a.b[0]*3+a.b[1]?{t:'e',a:a.b,b:a.a}:a, /* Shifukuro : meandyou, paire remise dans l'ordre de lecture */
     legales:(s,p,a,J,r)=>{a.coups.forEach(([x,y,u,v])=>r.push({t:'e',a:[x,y],b:[u,v]}));r.push({t:'v'})}, /* echanger ou passer */
     applique:(s,p,a,J)=>{const [il,ik]=s.attente.i,I=J.grille[il][ik];
       if(a.t==='v'){M.declenche(s,'meandyou','Refusé');dire(s,p,(I?nomDetail(carte(I.c)):'meandyou')+' : meandyou, pas d\'échange.');s.attente=null;return}
       const G=J.grille,[x,y]=a.a,[u,v]=a.b,A=G[x][y],B=G[u][v];s.attente=null; /* echange de cases. Pas une pose : degats gardes, aucun effet a la pose */
       s.stats.cause={p,c:I?I.c:null,lib:'À la pose'};G[x][y]=B;G[u][v]=A;M.declenche(s,'meandyou','Échange 2 Golems');
       dire(s,p,(I?nomDetail(carte(I.c)):'meandyou')+' : meandyou, échange '+nomDetail(carte(A.c))+' et '+nomDetail(carte(B.c))+'.');M.nettoie(s)},
     robot:(s,p,l,X)=>M.choixMeandyou(X,p,l)},
  l:{legales:(s,p,a,J,r)=>a.cases.forEach(([l,k])=>r.push({t:'l',l,k})), /* JackJoy : cible de Sub offert ou Draft diff */
     applique:(s,p,a)=>{const A=s.attente;s.attente=null;donneJJ(s,p,A,a.l,a.k);suiteJJ(s,p,A.file)}, /* cible choisie, puis la suite */
     robot:(s,p,l,X)=>choixJJ(X,p,l)},
  cafe:{legales:(s,p,a,J,r)=>a.options.forEach(c=>r.push({t:'u',c})), /* Elccino : Cafe du matin, carte prise (l'autre sous le deck) */
     applique:(s,p,a,J)=>{const A=s.attente,D=J.deck,o=A.options.find(c=>c!==a.c);s.attente=null;D.splice(D.indexOf(a.c),1);D.splice(D.indexOf(o),1);J.main.push(a.c);D.push(o);
       dire(s,p,'Café du matin : prend une carte et remet l\'autre sous son deck.');boost(s,p,A.b,A.src,'Café du matin')},
     robot:(s,p,l)=>choixElccino(s,p,l)},
  taupe:{legales:(s,p,a,J,r)=>a.options.forEach(c=>r.push({t:'u',c})), /* Elccino : La taupe, carte adverse defaussee */
     applique:(s,p,a)=>{const A=s.attente,K=s.j[1-p];s.attente=null;K.main.splice(K.main.indexOf(a.c),1);K.defausse.push(a.c);stE(s).taupe.push({m:s.manche,p,c:a.c});
       dire(s,p,'La taupe : l\'adversaire défausse '+nomDetail(carte(a.c))+'.');boost(s,p,A.b,A.src,'La taupe')},
     robot:(s,p,l)=>choixElccino(s,p,l)},
  boost:{legales:(s,p,a,J,r)=>a.cases.forEach(([l,k])=>r.push({t:'q',l,k})), /* Elccino : Golem allie qui gagne le bonus */
     applique:(s,p,a)=>{const A=s.attente;s.attente=null;donneBoost(s,p,a.l,a.k,A.n,A.nom);suiteCafe(s)},
     robot:(s,p,l)=>choixElccino(s,p,l)}
};
const types={
  /* Cyrdan (003, 003e) : tes voisins gagnent +bonus de Force */
  bonusVoisins:{voisinBonus:r=>r.bonus},
  /* Indra (013 +1, 013e +2) : le favori gagne +bonus tant que la carte est en jeu (le choix du favori : passe des choix) */
  favori:{favoriBonus:r=>r.bonus,
    /* a la pose : La Fan enflammee (ragebait) qui garde son favori le frappe ; sinon choix du favori (attente 'g' s'il y a plusieurs candidats) */
    pose:(r,s,p,l,k,g)=>{
      const J=s.j[p];let choix=null;
      if(r.ragebait&&g.fav!==undefined){const x=M.caseDeCarte(s,p,g.fav);if(x){dire(s,p,'Indra (La Fan enflammée) : '+nomDetail(carte(g.fav))+' reste son favori (+2 de Force).');ragebait(r,s,p,g,x[0],x[1])}else delete g.fav}
      if(g.fav===undefined){
        const cs=[];J.grille.forEach((L,a)=>L.forEach((h,b)=>{if(golem(h)&&!(a===l&&b===k))cs.push([a,b])}));
        if(!cs.length)dire(s,p,nomDetail(carte(g.c))+' : aucun autre Golem, pas de favori.');
        else if(cs.length===1)choisitFavori(s,p,g,cs[0][0],cs[0][1]);
        else choix={t:'g',p,i:[l,k],cases:cs};
      }
      return choix;
    },
    /* 0.2a.2 : la pose a pu tuer un candidat (bonus perdus) : on ne garde que les cases encore occupees */
    reprendChoix:(r,s,p,l,k,g,choix)=>{const J=s.j[p];choix.cases=choix.cases.filter(([a,b])=>J.grille[a][b]);if(!choix.cases.length)return null;
      if(choix.cases.length===1){const[a,b]=choix.cases[0];if(J.grille[l][k])choisitFavori(s,p,g,a,b);M.nettoie(s);return null}return choix}},
  /* +1 de Force par Golem compte (compte : 'element' de la grille, lui compris ; 'dessus' : allies au-dessus sur son terrain ; 'voisins' : voisins allies).
     apres:true : ajoute apres les auras de colonne (ordre historique). note : nom du bonus dans les statistiques. */
  forceParGolem:{
    force:(r,s,p,l,k,g,G,vs)=>r.apres?0:compte(r,G,l,k,vs,g),
    forceFin:(r,s,p,l,k,g,G,vs)=>r.apres?compte(r,G,l,k,vs,g):0,
    note:(r,s,p,l,k,g,G,vs,el,b)=>{if(!r.apres)noteCompte(r,p,l,k,g,G,vs,b)},
    noteFin:(r,s,p,l,k,g,G,vs,el,b)=>{if(r.apres)noteCompte(r,p,l,k,g,G,vs,b)}},
  /* Full synergie (037e) : +1 par element partage par au moins un voisin, en plus du Trait (+2 maximum : 2 elements) */
  synergie:{
    force:(r,s,p,l,k,g,G,vs,el)=>{let v=0;el.forEach(e=>{if(vs.some(n=>carte(n.c).el.includes(e)))v++});return v},
    note:(r,s,p,l,k,g,G,vs,el,b)=>el.forEach(e=>{const n=vs.find(n=>carte(n.c).el.includes(e));if(n)b('trait',p,g.c,p,n.c)})},
  /* Counter-pick et Full synergie (037, 037e) : cercle +2 au lieu de +1 */
  cercle:{cercle2:true},
  /* Vic2222 : Info tchat (042) en jeu sur le terrain k : tout Golem allie de ce terrain (lui compris) a le cercle a +2. Jamais plus de +2. */
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
    forgee:(r,s,p,c,etape)=>forgeDuo(r,s,p,c,etape), /* « si tu forges cette carte » : cherche le partenaire dans le deck */
    robotForge:(s,p,l)=>forgeUtile(s,p,l),
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

  /* Glad (009) : Slam, a la pose, deplace un Golem adverse ciblable sur une case libre adjacente (attente 'h' s'il y a plusieurs coups) ; il perd 1 de Force. */
  deplaceAdverse:{
    pose:(r,s,p,l,k,g)=>{ /* coups possibles [ligne, case de depart, case d'arrivee] chez l'adversaire */
      const cs=slams(s,p);
      if(!cs.length){dire(s,p,'Glad : Slam, aucun Golem adverse à déplacer.');return null}
      if(cs.length===1){slam(s,p,g.c,...cs[0]);return null}
      return {t:'h',p,i:[l,k],coups:cs};
    },
    reprendChoix:(r,s,p,l,k,g,choix)=>{choix.coups=slams(s,p);if(!choix.coups.length)return null;if(choix.coups.length===1){slam(s,p,g.c,...choix.coups[0]);M.nettoie(s);return null}return choix}},
  /* Copieurs : Maitre du deguisement (029e, cible:'voisin') et Le chansonnier (041e, cible:'face'). Ils portent l'effet copie (g.cp, null = rien). */
  copie:{copieur:true,poseCopieur:(r,s,p,l,k,g)=>r.cible==='face'?imitation(s,p,l,k,g):deguisement(s,p,l,k,g)},
  /* Le moderateur (025e) : meandyou, a la pose, echange facultatif (attente 'u'). */
  echangeAllies:{poseSeule:(r,s,p,l,k,g)=>meandyou(s,p,l,k,g)},
  /* JackJoy (035, mode:'sub') : Sub offert ; Drafteur experimente (035e, mode:'draft') : Draft diff. Crochets de type (une fois, toutes cartes confondues). */
  bonusForge:{
    apresForge:(s,p,c)=>forgeJJ(s,p,c),
    forceRecue:g=>jjBonus(g),
    noteRecue:(g,p,b)=>{(g.sub||[]).forEach(()=>b('sub',p,g.c,p,g.c));(g.dr||[]).forEach(x=>b('draft',p,g.c,p,x))}, /* la carte de Sub offert est dans la Forge, rien a lui attribuer */
    evolution:(s,occ,g)=>{if(REGLAGE_JJ.garde){if(occ.sub)g.sub=occ.sub.slice();if(occ.dr)g.dr=occ.dr.slice()}}, /* V2 : gardes a l'evolution */
    expire:s=>finDraft(s),
    robotForge:(s,p)=>jjForgeRobot(s,p),
    robotForgeEncore:(s,p)=>draftActif(s,p)},
  /* Maitre du bilig (026e) : Caramel a volonte, +r.energie une fois par manche, a son tour (action 'z'). Avant soinAllie : ordre des actions proposees. */
  energieTour:{actionsTour:(s,p)=>caramels(s,p),robotAvant:(X,p,l,seuil)=>caramelUtile(X,p,l,seuil)},
  /* L'attachiante (008e) : Love inconditionnel, une fois par manche, un Golem allie blesse recupere 1 de Force (action 'r'). */
  soinAllie:{actionsTour:(s,p)=>loves(s,p),robotFinTour:(X,p,l)=>choixLove(X,p,l)},
  /* Elccino (021) : Cafe du matin, a la pose et au debut des manches 2 et 3. Crochets de type : bonus g.cf (Cafe et La taupe), garde a l'evolution. */
  cafeDuMatin:{poseApres:(r,s,p,l,k,g)=>cafe(s,p,g.c,'pose',r),debutManche:s=>cafesManche(s),
    forceRecue:g=>g.cf||0,evolution:(s,occ,g)=>{if(occ.cf)g.cf=occ.cf}},
  /* Agent double SOLAEGIS (021e) : La taupe, a la pose. */
  taupe:{poseApres:(r,s,p,l,k,g)=>taupe(s,p,g.c,r)},
};
/* ---- Robot : estimations par type d'effet (le robot ne voit que ce qu'un joueur voit).
   forceEstimee(r) : Force moyenne d'une pose a Force aleatoire ; tirages(r) : toutes les Forces possibles (Imitation, moyenne exacte) ;
   estime(r,c,p,l,k,copie) : effet de pose simule sur la copie c du plateau (copie : estimation d'une copie, Deguisement ou Imitation) ;
   robotPose(r,s,p,a,apres,g,v0) : gain d'une pose, renvoie le nouveau gain (apres : plateau simule) ; robotPerte(r,s,p) : gain perdu quand la carte evolue ;
   robotPoseFin(r,s,p,a,g) : ajustements apres le cout ; robotCopie(r,c,p,l,k) : gain en plus d'une copie de cet effet ;
   compteRisque(r,etat,q) et risque(r,s,p,gr,D) : pioches de la pose [pour p, pour l'adversaire] (regle de la meule).
   Reglage valeurCopie (fiche) : bonus fixe d'une copie de cet effet pour le Deguisement et l'Imitation. */
const toursRestants=s=>9-((s.manche-1)*3+s.tour);
/* esperances, sans regarder les des ni le deck. Gamba : 1 chance sur 3 de -2 pour soi, 1 sur 3 de -2 en face. */
function gambaEstime(c,p,l,k){
  const G=c.j[p].grille[l][k];G.d+=2/3;
  const h=c.j[1-p].grille[l][k];if(h&&M.ciblable(c,1-p,l,k,p)&&!M.insensible(h))h.d+=2/3;
}
/* Extinction du feu estimee (Golems de l'element adverses ciblables -1, Menfou palu exclu ; simule retire les morts). */
function extinctionEstime(r,c,p){const G=c.j[1-p].grille;for(let a=0;a<3;a++)for(let b=0;b<3;b++){const h=G[a][b];if(golem(h)&&carte(h.c).el.includes(r.el)&&M.ciblable(c,1-p,a,b,p)&&!M.insensible(h))h.d+=r.degats}}
/* Il suffit estime (copie du plateau) : les Golems detruits quittent les grilles, Mode Avion adverse garde. */
function ilSuffitEstime(c,p){doublons(c,p).T.forEach(x=>{c.j[x.q].grille[x.l][x.k]=null})}
/* Realisation de l'age : petit bonus si l'adversaire jouera encore, selon ses Golems de base en jeu qui ont une evolution (seule information visible :
   le robot ne regarde ni la main ni le deck adverses). */
function elessarEstime(s,p){
  if(s.manche===3&&s.tour===3&&s.joueur!==s.premier)return 0; /* dernier tour de la partie : l'adversaire ne posera plus rien */
  let n=0;s.j[1-p].grille.forEach(L=>L.forEach(g=>{if(golem(g)&&!carte(g.c).base&&M.TYPES.some(t=>CARTES[t].base===carte(g.c).id))n++}));
  return .1+.1*Math.min(3,n);
}
const elementsDe=(r,etat,q)=>etat.j[q].grille.flat().filter(h=>h&&elDe(r,h.c)).length; /* La Bretagne : Golems de ses elements dans la grille q */
const robot={
  pertesFinManche:{estime:(r,c,p,l,k,copie)=>{if(copie&&c.manche<3)c.j[p].grille[l][k].d+=r.degats}}, /* KaTarN copie : -4 a chaque fin de manche */
  degatsLigne:{estime:(r,c,p,l)=>c.j[1-p].grille[l].forEach((h,q)=>{if(M.ciblable(c,1-p,l,q,p)&&!M.insensible(h))h.d+=r.degats})},
  forceAuDe:{forceEstimee:r=>r.estime,
    tirages:r=>{const fs=[];for(let a=1;a<=6;a++){if(r.des===1)fs.push(a);else for(let b=1;b<=6;b++)fs.push(a===b?a:a+b)}return fs}},
  gamba:{estime:(r,c,p,l,k)=>gambaEstime(c,p,l,k)},
  perteElement:{estime:(r,c,p)=>extinctionEstime(r,c,p)},
  ilSuffit:{estime:(r,c,p)=>ilSuffitEstime(c,p)}, /* simule retire ensuite les morts en chaine */
  /* copieurs : la meilleure copie possible depuis cette case (Deguisement) ; la meilleure option, copier ou refuser (Imitation) */
  copie:{robotPose:(r,s,p,a,apres,g,v0)=>{
    if(r.cible==='face'){
      const h=apres.j[1-p].grille[a.l][a.k];
      if(apres.j[p].grille[a.l][a.k]&&golem(h)&&M.ciblable(apres,1-p,a.l,a.k,p)&&M.idEff(h))g=Math.max(M.valeurImitation(apres,p,a.l,a.k,M.idEff(h)),M.gainCopie(apres,p,a.l,a.k,null))-v0;
      return g;
    }
    const cs=apres.j[p].grille[a.l][a.k]?M.voisinsCases(apres.j[p].grille,a.l,a.k):[];
    if(cs.length)g=Math.max(...cs.map(([x,y])=>M.gainCopie(apres,p,a.l,a.k,M.idEff(apres.j[p].grille[x][y]))))-v0;
    return g;
  }},
  /* meandyou : le meilleur echange s'il est utile (copie : joue depuis la case du copieur) */
  echangeAllies:{robotPose:(r,s,p,a,apres,g)=>apres.j[p].grille[a.l][a.k]?g+Math.max(0,M.gainEchange(apres,p,a.l,a.k)):g,
    robotCopie:(r,c,p,l,k)=>Math.max(0,M.gainEchange(c,p,l,k))},
  /* Bellock/Loxim : vise Double up ? (deja compte dans la Force si une evolution en profite) */
  duo:{robotPose:(r,s,p,a,apres,g)=>apres.j[p].grille[a.l][a.k]&&duoVoisin(apres.j[p].grille,a.l,a.k,r.partenaire)?g+.25:g},
  piocheParElement:{
    robotPose:(r,s,p,a,apres,g)=>{const n=[p,1-p].map(q=>Math.min(r.max,elementsDe(r,s,q)+(q===p?1:0)));return g+(.25*Math.min(n[0],s.j[p].deck.length)-.15*Math.min(n[1],s.j[1-p].deck.length))},
    robotCopie:(r,c,p)=>{const n=[p,1-p].map(q=>Math.min(r.max,elementsDe(r,c,q)));return .25*Math.min(n[0],c.j[p].deck.length)-.15*Math.min(n[1],c.j[1-p].deck.length)},
    compteRisque:(r,etat,q)=>elementsDe(r,etat,q),
    risque:(r,s,p,gr)=>[Math.min(r.max,gr[p]),Math.min(r.max,gr[1-p])]},
  energieTour:{robotPose:(r,s,p,a,apres,g)=>g+.4},
  /* Realisation de l'age gagnee (pose), perdue en evoluant (robotPerte de la base) */
  surtaxeEvolution:{robotPose:(r,s,p,a,apres,g)=>g+elessarEstime(s,p),robotPerte:(r,s,p)=>elessarEstime(s,p),robotCopie:(r,c,p)=>elessarEstime(c,p)},
  /* Graine de Golem : cartes en plus aux tours suivants (perdue en evoluant) */
  piocheTour:{robotPose:(r,s,p,a,apres,g)=>g+.08*Math.min(4,toursRestants(s)),robotPerte:(r,s)=>.08*Math.min(4,toursRestants(s))},
  /* Draft diff aux Forges suivantes */
  bonusForge:{robotPose:(r,s,p,a,apres,g)=>r.mode==='draft'?g+.1*Math.min(4,toursRestants(s)):g},
  /* Forge eclair aux tours suivants (rien apres le dernier tour) */
  forgeEclair:{robotPose:(r,s,p,a,apres,g)=>s.manche*3+s.tour<12?g+.3:g},
  /* Jour de peche : 1 carte adverse en moins (risque en points) */
  jourDePeche:{robotPoseFin:(r,s,p,a,g)=>s.j[1-p].deck.length?g+.25:g,risque:(r,s,p,gr,D)=>[0,D[1-p]>0?1:0]},
  spam:{robotPoseFin:(r,s,p,a,g)=>g+.3,risque:()=>[1,0]},
  favori:{robotPoseFin:(r,s,p,a,g)=>s.j[p].grille.some(L=>L.some(Boolean))?g+.3:g},
  /* Elccino : +1 carte, +1 de Force, et le Cafe des manches suivantes (perdu en evoluant) ; La taupe : +2, une carte adverse */
  cafeDuMatin:{robotPose:(r,s,p,a,apres,g)=>g+.45+.3*(3-s.manche),robotPerte:(r,s)=>.3*(3-s.manche)},
  taupe:{robotPose:(r,s,p,a,apres,g)=>g+.6+(s.j[1-p].main.length?.3:0)},
  deplaceAdverse:{robotPoseFin:(r,s,p,a,g)=>slams(s,p).length?g+.3:g,robotCopie:(r,c,p)=>slams(c,p).length?.4:0}
};
for(const t in robot){if(!types[t])throw new Error('robot : type inconnu '+t);Object.assign(types[t],robot[t])}
/* Realisation de l'age : surtaxe annoncee a la pose d'une evolution (sur : total de la surtaxe adverse) */
function annonceSurtaxe(s,p,C,sur){M.declenche(s,'Réalisation de l\'âge','Coût +'+sur+' pour '+nomDetail(C));dire(s,p,'Réalisation de l\'âge : '+nomDetail(C)+' coûte '+sur+' de plus.')}
/* Actions jouees a son tour, par lettre (format du journal inchange) */
const actions={
  /* 'r' : Love inconditionnel, 1 degat retire, une fois par manche et par exemplaire */
  r:{applique:(s,p,a,J)=>{
    const g=J.grille[a.l][a.k],h=J.grille[a.m][a.n];g.love=s.manche;h.d=Math.max(0,h.d-1);
    s.stats.ev.push({t:'r',cp:p,cc:h.c,n:1,y:'love',sp:p,sc:g.c,m:s.manche});M.declenche(s,'Love inconditionnel','Soigne '+nomDetail(carte(h.c)));
    dire(s,p,nomDetail(carte(g.c))+' : Love inconditionnel, '+nomDetail(carte(h.c))+' récupère 1 de Force.');
  }},
  /* 'z' : Caramel a volonte, +1 energie, une fois par manche */
  z:{applique:(s,p,a,J)=>{
    const g=J.grille[a.l][a.k];g.car=s.manche;J.energie++;M.declenche(s,'Caramel à volonté','+1 énergie');
    dire(s,p,nomDetail(carte(g.c))+' : Caramel à volonté, +1 énergie.');
  }},
  /* 'h' (attente de Slam) : estimation du robot, le Golem deplace perd 1 (GymRat : rien) */
  h:{estime:(c,p,a)=>{const H=c.j[1-p].grille,h=H[a.l][a.k];if(a.m!==a.l||a.n!==a.k){H[a.m][a.n]=h;H[a.l][a.k]=null}if(!M.insensible(h))h.d++}},
  /* 'j' : Forge eclair (Spom), +1 energie des ce tour, reprise due en fin de tour ; compte comme forger */
  j:{applique:(s,p,a,J)=>{
    J.main.splice(J.main.indexOf(a.c),1);J.forge.push(a.c);J.energie++;J.eclair--;J.eclairUtil++;J.etapeForge=(!J.aForge||J.eclair>0)&&J.main.length>0;
    M.declenche(s,'Forge éclair','Forge 1 carte de plus');dire(s,p,'Spom : Forge éclair, forge 1 carte de plus.');
    M.forgee(s,p,a.c,true);
  }}
};
/* animal attache dont l'effet compte comme un Golem allie au-dessus de son maitre (Uki : Meilleur ami) */
const aniDessus=g=>!!(g&&g.ani&&M.effs(carte(g.ani.c).id).some(e=>e.T.compteDessus));
function compte(r,G,l,k,vs,g){return r.compte==='element'?compteElement(G,r.el):r.compte==='dessus'?kekwait(G,l,k)+(aniDessus(g)?1:0):vs.length}
function noteCompte(r,p,l,k,g,G,vs,b){
  if(r.compte==='element')G.forEach(L=>L.forEach(n=>{if(n&&carte(n.c).el.includes(r.el))b(r.note,p,g.c,p,n.c)}));
  else if(r.compte==='dessus'){for(let a=0;a<l;a++){const n=G[a][k];if(golem(n))b(r.note,p,g.c,p,n.c)}if(aniDessus(g))b(r.note,p,g.c,p,g.ani.c)}
  else vs.forEach(n=>b(r.note,p,g.c,p,n.c));
}
return {types,actions,attentes,fonctions:{cafe,taupe,boost,cafesManche,choixElccino,partenaires,forgeUtile,REGLAGE_JJ,jjBonus,ciblesJJ,choisitFavori,slams,echangesMeandyou,loves,choixLove,REGLAGE_KC,caramels,choixPeche,choixJJ,choixFavori,annonceSurtaxe,foudres,kekwait,REGLAGE_DUO,duoManches,duoVoisin,doubleUp,elessars,graines,spoms,jourDePeche,doublons,ilSuffit}};
}
if(typeof module!=='undefined'&&module.exports)module.exports=fabrique;else (racine.GolemsEffets=racine.GolemsEffets||{}).golems=fabrique;
})(typeof window!=='undefined'?window:globalThis);
