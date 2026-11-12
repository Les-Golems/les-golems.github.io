// Le Q refondu : Le Q (004, cartes 18-20, Jour de peche) et Seul contre tous (004e, cartes 21-23, Il suffit). Node : node tests/test_leq.js
const M=require('../moteur.js'),assert=require('assert');
let nv=0;const ok=(c,m)=>{assert(c,m);nv++},eq=(a,b,m)=>{assert.strictEqual(a,b,m);nv++},deq=(a,b,m)=>{assert.deepStrictEqual(a,b,m);nv++};
const Q=18,QE=21,TR=24,RM=27,KA=0,GL=39,AP=45,MD=48,CH=81,JJ=123,CY=12,AL=6,KC=30,BE=90;
const res=[];
const nouv=()=>{const s=M.nouvelle(5,['','']);s.phase='jeu';s.mull=[true,true];s.premier=0;s.tour=1;s.joueur=0;s.manche=1;
  s.j.forEach(J=>{J.etapeForge=false;J.main=[];J.energie=0;J.deck=[];J.defausse=[];J.grille=[[null,null,null],[null,null,null],[null,null,null]]});s.j[0].energie=9;return s};
const pose=(s,p,c,f,l,k,o={})=>{s.j[p].grille[l][k]={c,f,d:0,...o}};
const joue=(s,c,l,k)=>{s.j[0].main.push(c);M.applique(s,0,{t:'p',c,l,k})};
const ids=(s,p)=>s.j[p].grille.flat().filter(Boolean).map(g=>g.c).sort((a,b)=>a-b);
const log=(s,re)=>s.log.some(x=>re.test(x[1]));
/* Deck vide : defaite (0.4) ou, apres fusion de la regle de la meule (M.POINT_DECK_VIDE), points pour l'adversaire de q. */
const PTS=M.POINT_DECK_VIDE!==undefined,videPerdu=(s,q)=>PTS?(!s.fin&&s.j[1-q].score>0):(!!s.fin&&s.fin.deckVide===q);
{ // 0. cartes
  const A=M.CARTES['004'],B=M.CARTES['004e'];
  deq(A.el,['magma','brume']); /* 0.7 : ordre des elements */eq(A.cout,2);eq(A.force,1);ok(/^Jour de pêche : à la pose, regarde les 2 premières cartes du deck adverse\. Défausses-en 1 et replace l'autre dessus\.$/.test(A.texte));
  deq(B.el,['magma','brume']);eq(B.cout,7);eq(B.force,1);eq(B.nom,'Seul contre tous');eq(B.base,'004');ok(/^Il suffit : à la pose, détruis toutes tes cartes et toutes les cartes adverses posées en plusieurs exemplaires, toi compris\.$/.test(B.texte));
  eq(M.carte(18).id,'004');eq(M.carte(23).id,'004e');eq(M.TYPES.length,45);res.push('cartes');
}
{ // 1. Jour de peche, deck adverse a 2 cartes ou plus : choix, la carte choisie a la defausse adverse, l'autre reste dessus
  const s=nouv();s.j[1].deck=[60,61,62];s.j[0].deck=[70,71];joue(s,Q,1,1);
  eq(s.attente.t,'q');eq(s.attente.adv,1);deq(s.attente.options,[60,61]);deq(M.legales(s,0).map(M.code),['cY','cZ']);
  deq(M.legales(s,1),[],'l adversaire attend');
  M.applique(s,0,{t:'c',c:61});deq(s.j[1].deck,[60,62]);deq(s.j[1].defausse,[61]);deq(s.j[0].deck,[70,71],'son deck intact');eq(s.attente,null);
  ok(log(s,/^Le Q : Jour de pêche, défausse .* du deck adverse et replace l'autre carte dessus\.$/));ok(!s.stats.vues[0].includes(60),'cartes adverses vues : pas dans ses cartes vues');
  const t=nouv();t.j[1].deck=[60,61];joue(t,Q,0,0);M.applique(t,0,{t:'c',c:60});deq(t.j[1].deck,[61],'deck de 2 : 1 reste');
  ok(M.decode('c~0').c===63);res.push('peche 2');
}
{ // 2. deck adverse a 1 carte : vue et defaussee ; 0 carte : rien, personne ne perd ; puis defaite quand l'adversaire pioche
  const s=nouv();s.j[1].deck=[60];joue(s,Q,1,1);eq(s.attente,null);deq(s.j[1].deck,[]);deq(s.j[1].defausse,[60]);ok(log(s,/regarde la dernière carte du deck adverse et la défausse/));ok(!s.fin);
  M.applique(s,0,{t:'x'});ok(videPerdu(s,1),'l adversaire doit piocher, deck vide');
  const u=nouv();joue(u,Q,1,1);eq(u.attente,null);ok(!u.fin,'deck adverse vide : pas de defaite');ok(log(u,/deck adverse vide, rien à regarder/));
  const v=nouv();v.tour=2;v.j[1].deck=[60,61];joue(v,Q,1,1);M.applique(v,0,{t:'c',c:60});M.applique(v,0,{t:'x'});ok(videPerdu(v,1),'deck de 2 : 1 pechee, il doit en piocher 2 (tour 2) : defaite');
  const w=nouv();w.tour=2;w.j[1].deck=[60,61,62];joue(w,Q,1,1);M.applique(w,0,{t:'c',c:60});M.applique(w,0,{t:'x'});ok(!w.fin,'3 cartes : il en pioche 2');eq(w.j[1].main.length,2);res.push('peche 1 et 0');
}
{ // 3. Il suffit : Trigas base + evolution = 2 cartes differentes ; base + 2 evolutions : les 2 evolutions detruites, la base reste
  let s=nouv();pose(s,0,Q,1,1,1);pose(s,0,TR,1,0,0);pose(s,0,RM,4,2,2);joue(s,QE,1,1);
  deq(ids(s,0),[QE,TR,RM].sort((a,b)=>a-b),'1 base + 1 evolution : rien');ok(log(s,/aucune carte posée en plusieurs exemplaires/));
  s=nouv();pose(s,0,Q,1,1,1);pose(s,0,TR,1,0,0);pose(s,0,RM,4,2,2);pose(s,0,RM+1,4,2,0);joue(s,QE,1,1);
  deq(ids(s,0),[QE,TR].sort((a,b)=>a-b),'1 base + 2 evolutions : les evolutions');ok(s.j[0].defausse.includes(RM)&&s.j[0].defausse.includes(RM+1));
  // tous les exemplaires d'une carte doublee, 3 compris, des deux cotes ; une carte seule reste
  s=nouv();pose(s,0,Q,1,1,1);pose(s,0,GL,5,0,0);pose(s,0,GL+1,5,0,2);pose(s,0,GL+2,5,2,2);pose(s,0,CY,5,2,0);
  pose(s,1,AL,5,0,0);pose(s,1,AL+1,5,0,1);pose(s,1,KC,5,2,2);joue(s,QE,1,1);
  deq(ids(s,0),[CY,QE].sort((a,b)=>a-b),'3 Glad detruits');deq(ids(s,1),[KC],'2 Alrevan adverses detruits, K-Chan reste');
  ok(log(s,/Il suffit, détruit .*Alrevan \(adverse\)/));res.push('Trigas');
}
{ // 4. Le Q contre Le Q : deux Seul contre tous sur sa grille = morts tous les deux ; avec un Le Q de base : rien
  let s=nouv();pose(s,0,Q,1,1,1);pose(s,0,QE+1,1,0,0);joue(s,QE,1,1);deq(ids(s,0),[],'les deux Seul contre tous');
  s=nouv();pose(s,0,Q,1,1,1);pose(s,0,Q+1,1,0,0);joue(s,QE,1,1);deq(ids(s,0),[Q+1,QE].sort((a,b)=>a-b),'avec un Le Q de base : rien');
  // Seul contre tous adverse en double : detruits ; le sien seul reste
  s=nouv();pose(s,0,Q,1,1,1);pose(s,1,QE+1,1,0,0);pose(s,1,QE+2,1,2,2);joue(s,QE,1,1);deq(ids(s,1),[]);deq(ids(s,0),[QE]);res.push('Le Q contre Le Q');
}
{ // 5. On flip (0.7, ex-Mode Avion) : Roi du Mobile protege (g.prot, de de la pose) chez l'adversaire (meme logique que Slim K), pas chez soi ; sans g.prot, rien
  let s=nouv();pose(s,0,Q,1,1,1);pose(s,1,RM,4,0,0,{prot:true});pose(s,1,RM+1,4,1,1,{prot:true});pose(s,1,TR,1,2,2);pose(s,1,TR+1,1,2,1);joue(s,QE,1,1);
  deq(ids(s,1),[RM,RM+1],'2 Roi du Mobile adverses proteges, 2 Trigas detruits');ok(log(s,/sont protégés \(On flip\)/));
  s=nouv();pose(s,0,Q,1,1,1);pose(s,1,RM,4,0,0);pose(s,1,RM+1,4,1,1,{prot:true});joue(s,QE,1,1);deq(ids(s,1),[RM+1],'Roi du Mobile sans protection (de rate) : detruit');
  // Apo deguise en Roi du Mobile : protege ; l'autre Maitre du deguisement (meme carte) est detruit
  s=nouv();pose(s,0,Q,1,1,1);pose(s,1,MD,3,0,0,{cp:'007e',prot:true});pose(s,1,MD+1,3,2,2,{cp:null});joue(s,QE,1,1);deq(ids(s,1),[MD],'Apo deguise en Roi du Mobile protege reste');
  ok(!M.ciblable(s,1,0,0,0)&&M.ciblable(s,0,1,1,0));
  s=nouv();pose(s,0,Q,1,1,1);pose(s,0,RM,4,0,0,{prot:true});pose(s,0,RM+1,4,2,2,{prot:true});joue(s,QE,1,1);deq(ids(s,0),[QE],'ses propres Roi du Mobile : detruits');res.push('On flip');
}
{ // 6. copies : Maitre du deguisement (Apo) voisin de Seul contre tous, et Le chansonnier (Velnen) en face d'un Seul contre tous adverse
  let s=nouv();pose(s,0,QE,1,1,0);pose(s,0,GL,5,0,2);pose(s,0,GL+1,5,2,2);pose(s,1,AL,5,0,0);pose(s,1,AL+1,5,2,0);pose(s,0,AP,2,1,1);s.j[0].main=[MD];
  M.applique(s,0,{t:'p',c:MD,l:1,k:1});eq(s.j[0].grille[1][1].cp,'004e','Apo copie Il suffit (1 voisin : d office)');
  deq(ids(s,0),[QE,MD].sort((a,b)=>a-b),'Glad detruits par la copie');deq(ids(s,1),[],'Alrevan adverses detruits');
  // Apo qui copie Il suffit avec un autre Maitre du deguisement en jeu : les deux meurent (et rien ne plante)
  s=nouv();pose(s,0,QE,1,1,0);pose(s,0,MD+1,3,2,2,{cp:null});pose(s,0,AP,2,1,1);s.j[0].main=[MD];M.applique(s,0,{t:'p',c:MD,l:1,k:1});deq(ids(s,0),[QE],'le copieur et l autre Maitre');
  // Velnen : Imitation d'Il suffit en face, balayage du point de vue du chansonnier
  s=nouv();pose(s,1,QE,1,1,1);pose(s,1,TR,1,0,0);pose(s,1,TR+1,1,0,1);pose(s,0,KC,2,2,2);pose(s,0,KC+1,2,2,1);pose(s,0,78,1,1,1);s.j[0].main=[CH];
  M.applique(s,0,{t:'p',c:CH,l:1,k:1});eq(s.attente.t,'i');M.applique(s,0,{t:'i',o:1});eq(s.j[0].grille[1][1].cp,'004e');
  deq(ids(s,1),[QE],'Trigas adverses detruits');deq(ids(s,0),[CH],'ses K-Chan detruits');
  // chansonnier contre chansonnier : un balayage relance qui le detruit avec l'autre chansonnier
  s=nouv();pose(s,1,QE,1,1,1);pose(s,0,CH+1,3,0,0,{cp:null});pose(s,0,78,1,1,1);s.j[0].main=[CH];M.applique(s,0,{t:'p',c:CH,l:1,k:1});M.applique(s,0,{t:'i',o:1});deq(ids(s,0),[],'deux chansonniers');
  // robot : choisit sa copie sans planter, deterministe
  s=nouv();pose(s,0,QE,1,1,0);pose(s,0,GL,5,0,1);pose(s,1,AL,5,0,0);pose(s,1,AL+1,5,2,0);pose(s,0,AP,2,1,1);s.j[0].main=[MD];M.applique(s,0,{t:'p',c:MD,l:1,k:1});
  if(s.attente){const a=M.robot(s,0,'difficile');deq(a,M.robot(s,0,'difficile'));M.applique(s,0,a)}res.push('copies');
}
{ // 7. quand detruit : Jacen et Jaina piochent quand leur maitre (KaTarN, en double) est detruit ; morts en chaine ensuite
  let s=nouv();s.j[0].deck=[100,101,102];pose(s,0,Q,1,1,1);pose(s,0,KA,8,0,0);pose(s,0,KA+1,8,2,2);pose(s,0,JJ,0,0,1,{maitre:KA});joue(s,QE,1,1);
  deq(ids(s,0),[QE]);ok(s.j[0].defausse.includes(JJ));deq(s.j[0].main,[100],'chats : 1 pioche');ok(log(s,/son maître est détruit, pioche 1 carte/));
  // chats a deck vide : defaite du joueur du Q (pioche obligatoire)
  s=nouv();pose(s,0,Q,1,1,1);pose(s,0,KA,8,0,0);pose(s,0,KA+1,8,2,2);pose(s,0,JJ,0,0,1,{maitre:KA});joue(s,QE,1,1);ok(videPerdu(s,0),'chats sur deck vide');
  // mort en chaine : Alrevan a 1 + 1 de Trait (voisin Trigas Brume) ; les 2 Trigas detruits, Alrevan tombe a 1 (survit) ; Glad a 0 de base + Trait Magma meurt ensuite
  s=nouv();pose(s,0,Q,1,1,1);pose(s,1,TR,1,0,0);pose(s,1,TR+1,1,0,2);pose(s,1,KC,1,1,0,{d:1});pose(s,1,KC+1,1,2,1,{d:0});pose(s,1,GL,1,2,0,{d:1});
  joue(s,QE,1,1);ok(!ids(s,1).includes(GL),'Glad meurt en chaine (Trait Magma perdu)');ok(log(s,/meurt/));res.push('quand detruit et chaine');
}
{ // 8. robot : pose Seul contre tous quand il detruit plus chez l'adversaire, pas quand il se detruit lui-meme
  let s=nouv();s.terrains=[M.TERRAINS[1],M.TERRAINS[2],M.TERRAINS[6]];pose(s,0,Q,1,1,1);pose(s,0,CY,3,0,0);
  pose(s,1,AL,5,0,0);pose(s,1,AL+1,5,0,1);pose(s,1,AL+2,5,0,2);pose(s,1,GL,4,1,1);pose(s,1,GL+1,4,2,1);s.j[0].main=[QE+1];s.j[0].energie=7;
  let a=M.robot(s,0,'difficile');eq(M.code(a),'p'+M.code({t:'f',c:QE+1}).slice(1)+'11','robot : balayage favorable joue');
  s=nouv();pose(s,0,Q,1,1,1);pose(s,0,GL,6,0,0);pose(s,0,GL+1,6,0,1);pose(s,0,GL+2,6,0,2);pose(s,1,AL,3,0,0);s.j[0].main=[QE+1];s.j[0].energie=7;
  a=M.robot(s,0,'difficile');ok(!(a.t==='p'&&a.c===QE+1),'robot : pas de balayage contre lui');
  for(const n of ['facile','normal']){const u=nouv();pose(u,0,Q,1,1,1);pose(u,1,AL,5,0,0);pose(u,1,AL+1,5,0,1);u.j[0].main=[QE];u.j[0].energie=7;M.robot(u,0,n)}
  // Jour de peche : le robot defausse la plus utile a l'adversaire, sans voir sa main ; il pose Le Q quand la peche rend la defaite adverse certaine
  s=nouv();s.j[1].deck=[RM,1];pose(s,1,TR,1,0,0);joue(s,Q,1,1);const c=M.robot(s,0,'difficile');eq(c.t,'c');eq(c.c,RM,'il defausse l evolution du Trigas adverse en jeu');
  s=nouv();s.manche=3;s.tour=3;s.j[1].deck=[60,61];s.j[0].main=[Q,CY];s.j[0].energie=3;pose(s,0,KC,2,0,0);
  if(!PTS){ok(M.risqueDeck(s,0,'004',[0,0],0)===50,'2 cartes, il doit en piocher 2 : la peche le condamne');a=M.robot(s,0,'difficile');eq(a.t==='p'&&a.c,Q,'robot : pose Le Q pour gagner au deck vide')}
  else ok(M.risqueDeck(s,0,'004',[0,0],0)>0,'regle de la meule : la peche coute au moins 1 point a l adversaire');
  res.push('robot');
}
{ // 9. parties robot avec Le Q : pas de blocage, rejeux identiques, bilan lisible
  const D=M.deckTexte({'004':3,'004e':3,'015':3,'015e':3,'016':3,'016e':3,'029':3,'029e':3,'009':3,'009e':3}),E=M.deckTexte({'004':3,'004e':3,'007':3,'007e':3,'001':3,'001e':3,'902':1,'041':3,'041e':3,'013':3});
  let nIS=0,nJP=0,nf=0;
  for(let i=0;i<300;i++){const gr=(i*2654435761+11)|0,dk=i%3?[D,E]:[E,D],s=M.nouvelle(gr,dk),j=[[],[]];let pas=0;const niv=['difficile','normal','facile'][i%3];
    while(!s.fin){ok(++pas<3000,'blocage');const p=M.attendus(s)[0],a=M.robot(s,p,niv);M.applique(s,p,a);j[p].push(M.code(a))}
    const r=M.rejoue(gr,j,dk);ok(!r.erreur,r.erreur);eq(JSON.stringify(r.etat),JSON.stringify(s),'rejeu');M.bilan(s);
    nIS+=s.log.filter(x=>/ : Il suffit/.test(x[1])).length;nJP+=s.log.filter(x=>/Jour de pêche/.test(x[1])).length;if(s.fin.deckVide!==undefined)nf++}
  ok(nIS>0&&nJP>0);res.push('300 parties robot ('+nIS+' Il suffit, '+nJP+' lignes Jour de peche, '+nf+' fins par deck vide), rejeux identiques');
}
{ // 0.6 : Il suffit detruit un Golem qui porte un animal attache : l'animal va a la defausse (robust.js i=570, graine 788581627)
  const TI=57,KI=69;let s=nouv();s.j[1].deck=[90,91,92];
  pose(s,0,Q,1,1,1);pose(s,0,TI,1,0,0,{ani:{c:KI}});pose(s,0,TI+1,1,0,2);pose(s,1,KA,5,0,0,{ani:{c:JJ}});pose(s,1,KA+1,5,2,2);joue(s,QE,1,1);
  deq(ids(s,0),[QE],'les 2 Titom76 detruits');deq(ids(s,1),[],'les 2 KaTarN detruits');
  ok(s.j[0].defausse.includes(KI),'Kiwi attache a la defausse');ok(s.j[1].defausse.includes(JJ),'Jacen et Jaina attaches a la defausse');
  eq(s.j[1].main.length,1,'Jacen et Jaina : pioche, maitre detruit');ok(log(s,/Kiwi part à la défausse/)&&log(s,/Jacen et Jaina part à la défausse/));
  s.j.forEach(J=>{const vu=[...J.deck,...J.main,...J.defausse,...J.grille.flat().filter(Boolean).flatMap(g=>g.ani?[g.c,g.ani.c]:[g.c])];eq(new Set(vu).size,vu.length)});
  res.push('animaux attaches a la defausse');
}
console.log('Le Q OK : '+nv+' verifications. '+res.join(' ; '));
