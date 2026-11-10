// Classées, rangs, robots, saisons, récompenses (0.6). Node : node tests/test_classe.js
const C=require('../commun/classe.js'),assert=require('assert');
let nv=0;const ok=(c,m)=>{assert(c,m);nv++},eq=(a,b,m)=>{assert.strictEqual(a,b,m||String(b));nv++},deq=(a,b,m)=>{assert.deepStrictEqual(a,b,m);nv++};
const res=[];
{ // départ, K
  const j=C.nouveauJoueur();eq(j.elo,1000);eq(j.parties,0);
  eq(C.facteurK(0),32);eq(C.facteurK(29),32);eq(C.facteurK(30),20);eq(C.facteurK(100),20);res.push('K');
}
{ // placement : points doublés, affichage sans Elo
  const j=C.nouveauJoueur();
  eq(C.variation(j,1000,true),32,'placement x2 : 32*0.5*2');eq(C.variation(j,1000,false),-32);
  const hors={elo:1000,parties:5,partiesTotal:5};eq(C.variation(hors,1000,true),16);
  const hors30={elo:1000,parties:5,partiesTotal:30};eq(C.variation(hors30,1000,true),10);
  let a=C.affichage(j);ok(a.placement);eq(a.texte,'Placement 0/5');eq(a.elo,null);eq(a.estime.id,'topaze');
  let p=j;for(let i=0;i<4;i++)p=C.appliquePartie(p,1000,true).joueur;
  a=C.affichage(p);eq(a.texte,'Placement 4/5');eq(a.elo,null);ok(C.enPlacement(p));{let e=1000;for(let i=0;i<4;i++)e+=Math.round(64*(1-C.attendu(e,1000)));eq(p.elo,e,'4 victoires de placement')}ok(p.elo>1100);
  eq(C.rangEstime(p).id,C.rang(p.elo).id);ok(p.elo>=1050&&p.elo<1150);
  p=C.appliquePartie(p,1000,false).joueur;ok(!C.enPlacement(p));a=C.affichage(p);ok(!a.placement);eq(a.elo,p.elo);eq(a.rang.id,C.rang(p.elo).id);
  eq(p.v,4);eq(p.d,1);eq(p.parties,5);eq(p.partiesTotal,5);
  eq(C.variation(p,1000,true),Math.round(32*(1-C.attendu(p.elo,1000))),'après placement : K 32 simple');
  res.push('placement');
}
{ // rangs aux bornes
  const r=e=>C.rang(e).id;
  eq(r(0),'amethyste');eq(r(949),'amethyste');eq(r(950),'topaze');eq(r(1049),'topaze');eq(r(1050),'saphir');eq(r(1149),'saphir');
  eq(r(1150),'emeraude');eq(r(1249),'emeraude');eq(r(1250),'rubis');eq(r(1399),'rubis');eq(r(1400),'diamant');eq(r(3000),'diamant');
  eq(C.rang(1150).nom,'Émeraude');eq(C.RANGS.length,6);res.push('rangs');
}
{ // robots
  eq(C.robotPour(899).id,'robot-facile');eq(C.robotPour(900).id,'robot-normal');eq(C.robotPour(1149).id,'robot-normal');eq(C.robotPour(1150).id,'robot-difficile');
  eq(C.ROBOTS.facile.elo,750);eq(C.ROBOTS.normal.elo,1100);eq(C.ROBOTS.difficile.elo,1200);ok(C.estRobot('robot-normal'));ok(!C.estRobot('uid123'));
  const j={elo:1000,parties:10,partiesTotal:10};
  eq(C.variation(j,1100,true,{robot:true}),Math.round(32*(1-C.attendu(1000,1100))/2),'demi-points');
  eq(C.variation(j,1000,true,{robot:true}),8);eq(C.variation(j,1000,false,{robot:true}),-8);
  eq(C.variation(C.nouveauJoueur(),1000,true,{robot:true}),16,'placement x2 puis /2');
  // classement sans robot ni placement
  const cl=C.classement([{uid:'a',elo:1100,parties:9},{uid:'robot-difficile',elo:1200,parties:99},{uid:'b',elo:1300,parties:2},{uid:'c',elo:1200,parties:5}]);
  deq(cl.map(x=>x.uid),['c','a']);res.push('robots');
}
{ // limite par jour, minuit de Paris
  const t1=Date.UTC(2026,10,9,22,30);// 23 h 30 à Paris (hiver, UTC+1)
  const t2=Date.UTC(2026,10,9,23,10);// 0 h 10 à Paris le 10
  eq(C.jourParis(t1),'2026-11-09');eq(C.jourParis(t2),'2026-11-10');
  eq(C.jourParis(Date.UTC(2026,6,1,22,30)),'2026-07-02','été UTC+2');
  let r=null;eq(C.robotsRestants(r,t1),5);
  for(let i=0;i<5;i++){ok(C.peutAffronterRobot(r,t1));r=C.compteRobot(r,t1);}
  eq(r.n,5);ok(!C.peutAffronterRobot(r,t1));eq(C.robotsRestants(r,t1),0);
  ok(C.peutAffronterRobot(r,t2));eq(C.robotsRestants(r,t2),5);deq(C.compteRobot(r,t2),{jour:'2026-11-10',j:C.numJour(t2),n:1});eq(C.numJour(t2),C.numJour(t1)+1);eq(r.j,Math.floor((t1+3600000)/86400000));
  const p=C.appliquePartie({elo:1000,parties:6,partiesTotal:6,robots:{jour:'2026-11-09',j:C.numJour(t1),n:2}},1100,true,{robot:true,maintenant:t1}).joueur;deq(p.robots,{jour:'2026-11-09',j:C.numJour(t1),n:3});
  const q=C.appliquePartie({elo:1000,parties:6,partiesTotal:6,robots:{jour:'2026-11-09',n:2}},1000,true).joueur;deq(q.robots,{jour:'2026-11-09',n:2},'partie humaine : compteur inchangé');
  res.push('jour');
}
{ // saisons, remise mi-chemin
  eq(C.saison(0).nom,'Bêta');eq(C.saison(0).fin,null);
  eq(C.eloRemise(1400),1200);eq(C.eloRemise(800),900);eq(C.eloRemise(1000),1000);eq(C.eloRemise(1101),1051);
  const n=C.nouvelleSaison({elo:1300,parties:40,partiesTotal:40,v:25,d:15});eq(n.elo,1150);eq(n.parties,0);eq(n.partiesTotal,40);eq(n.v,0);
  ok(C.enPlacement(n));eq(C.facteurK(n.partiesTotal),20);res.push('saisons');
}
{ // récompenses (règle du 9 nov.) et instantané
  eq(C.metalEcu(1),'or');eq(C.metalEcu(2),'argent');eq(C.metalEcu(3),'argent');eq(C.metalEcu(4),'bronze');eq(C.metalEcu(10),'bronze');eq(C.metalEcu(11),null);eq(C.metalEcu(null),null);
  eq(C.nomMedaille(0),'Pionnier');eq(C.nomMedaille(2),'Saison 2');
  eq(C.imageMedaille(0,56),'images/recompenses/saison-0-56.png');eq(C.imageMedaille(0),'images/recompenses/saison-0-104.png');
  eq(C.imageEcu(1,104),'images/recompenses/ecu-or-1-104.png');eq(C.imageEcu(3,56),'images/recompenses/ecu-argent-3-56.png');eq(C.imageEcu(7),'images/recompenses/ecu-bronze-7-104.png');eq(C.imageEcu(11),null);
  eq(C.recompense(0,null),null,'pas d instantané : rien');eq(C.recompense(0,{placementFini:false,place:1}),null,'placement non fini : rien, même avec une place');
  deq(C.recompense(0,{placementFini:true}),{saison:0},'placement fini sans place : médaille seule');
  deq(C.recompense(0,{placementFini:true,place:40}),{saison:0},'hors top 10 : médaille seule');
  deq(C.recompense(0,{placementFini:true,place:1}),{saison:0,place:1,ecu:'or'});deq(C.recompense(1,{placementFini:true,place:2}),{saison:1,place:2,ecu:'argent'});
  deq(C.recompense(1,{placementFini:true,place:10}),{saison:1,place:10,ecu:'bronze'});
  const dern=Array.from({length:14},(_,i)=>({mode:'classee',gagne:i%2===0,adv:'x',t:i}));
  const six=[1,2,3,4,5,6];
  const s=C.instantaneSaison(0,{elo:1260,parties:12},{modes:{classee:{parties:12,v:7,d:5,best:4,serie:-1}},dernieres:dern,
    tops:{golems:six.map(id=>({id,n:1,v:1})),terrains:[],decks:six.map(i=>({nom:'D'+i,e:'brume',n:5,v:3})),mvp:six.map(i=>({id:'00'+i,n:i}))},elements:{feu:{n:3,v:2}}});
  eq(s.rang,'rubis');ok(!('place' in s),'jamais de place dans l instantané du joueur');ok(s.placementFini);eq(s.dernieres.length,10);eq(s.dernieres[9].t,13);
  eq(s.tops.golems.length,5);eq(s.tops.decks.length,5);eq(s.tops.mvp.length,5);eq(s.modes.classee.best,4);eq(s.elements.feu.v,2);ok(!('ecusson' in s));
  const s2=C.instantaneSaison(0,{elo:1100,parties:2},{});ok(!s2.placementFini);eq(s2.rang,'saphir');
  deq(C.sansNuls({a:1,b:null,c:{d:null,e:[1,{f:null,g:2}]}}),{a:1,c:{e:[1,{g:2}]}});
  deq(C.ligneClassement('Bob',{elo:1260,parties:5,v:3,d:2,saison:1}),{pseudo:'Bob',elo:1260,rang:'rubis',v:3,d:2,saison:1});eq(C.ligneClassement('Bob',{elo:1260,parties:4}),null);
  res.push('recompenses');
}
{ // objets Firebase exigés par rules/50-classe.js
  const j0=C.nouveauJoueur(0);deq(j0,{elo:1000,parties:0,partiesTotal:0,v:0,d:0,saison:0});ok(!('dern' in j0)&&!('robots' in j0));
  const ns=C.nouvelleSaison({elo:1300,parties:9,partiesTotal:9,v:5,d:4,saison:0,dern:'x-1',robots:{jour:'a',j:5,n:2}});eq(ns.saison,1);ok(!('dern' in ns));deq(ns.robots,{jour:'a',j:5,n:2});
  eq(C.idPartie('ABCD',-123),'abcd--123','minuscules');
  const A={elo:1000,parties:0,partiesTotal:0,v:0,d:0,saison:0},B={elo:1100,parties:7,partiesTotal:40,v:4,d:3,saison:0};
  const {id,partie}=C.creePartie({sa:'abcd',gr:4567,a:'ua',b:'ub',profilA:A,profilB:B,gagnant:'ub',saison:0});
  eq(id,'abcd-4567');eq(partie.gr,'4567');eq(partie.sa,'abcd');eq(partie.robot,false);deq(partie.t,{'.sv':'timestamp'});eq(partie.eloA,1000);eq(partie.eloB,1100);
  eq(partie.deltaA,C.variation(A,1100,false));eq(partie.deltaB,C.variation(B,1000,true));ok(partie.deltaA<0&&partie.deltaB>0);
  deq(C.confirmation(id,'ua'),{'classe/parties/abcd-4567/ok/ua':true});
  const ua=C.application('ua',A,id,partie,0);eq(ua['classe/parties/abcd-4567/fait/ua'],true);const pa=ua['classe/joueurs/ua'];
  eq(pa.elo,1000+partie.deltaA);eq(pa.dern,id);eq(pa.saison,0);eq(pa.d,1);eq(pa.v,0);eq(pa.parties,1);ok(!('robots' in pa),'partie humaine : robots inchangés');
  const pb=C.application('ub',B,id,partie,0)['classe/joueurs/ub'];eq(pb.elo,1100+partie.deltaB);eq(pb.v,5);eq(pb.dern,id);
  assert.throws(()=>C.creePartie({sa:'abcd',gr:'9',a:'ua',b:'ub',profilA:A,profilB:B,gagnant:'nul',saison:0}),/sans-gagnant/);nv++;
  assert.throws(()=>C.creePartie({sa:'abcd',gr:'9',a:'ua',b:'ub',profilA:A,profilB:B,gagnant:null,saison:0}),/sans-gagnant/);nv++;
  assert.throws(()=>C.creePartieRobot({sa:'abcd',gr:9,a:'ua',profilA:B,niveau:'normal',gagne:'nul',saison:0}),/sans-gagnant/);nv++;
  const t=Date.UTC(2026,10,9,12);const R=C.creePartieRobot({sa:'abcd',gr:12,a:'ua',profilA:B,niveau:'normal',gagne:true,saison:0});
  ok(/^[a-z0-9-]{3,60}$/.test(R.id));eq(R.partie.b,'robot-normal');eq(R.partie.eloB,1100);ok(!('deltaB' in R.partie));eq(R.partie.deltaA,C.variation(B,1100,true,{robot:true}));
  const pr=C.application('ua',B,R.id,R.partie,t)['classe/joueurs/ua'];deq(pr.robots,{jour:'2026-11-09',j:C.numJour(t),n:1});eq(pr.elo,1100+R.partie.deltaA);
  deq(C.salonClasse(),{cl:true,cree:{'.sv':'timestamp'}});deq(C.salonRobot('ua',899),{u:'ua',n:'facile',t:{'.sv':'timestamp'}});
  eq(C.salonRobot('ua',900).n,'normal');eq(C.salonRobot('ua',1150).n,'difficile');
  res.push('firebase');
}
// service(B) : branchement Firebase simulé (base en mémoire, sans règles ; les règles sont testées sur l'émulateur par test_regles.js).
function base(uid,pseudo,db){
  const get=p=>p.split('/').reduce((o,k)=>o&&o[k]!==undefined?o[k]:undefined,db);
  const put=(p,v)=>{const k=p.split('/'),d=k.pop();let o=db;k.forEach(x=>{if(!o[x]||typeof o[x]!=='object')o[x]={};o=o[x]});
    const sv=x=>x&&typeof x==='object'?(x['.sv']==='timestamp'?1000:Object.fromEntries(Object.entries(x).map(([a,b])=>[a,sv(b)]))):x;if(v===null)delete o[d];else o[d]=sv(v)};
  return {db,ecrits:[],uid:()=>uid,pseudo:()=>pseudo,lit:async p=>{const v=get(p);return v===undefined?null:JSON.parse(JSON.stringify(v))},
    ecrit:async function(m){this.ecrits.push(Object.keys(m));for(const p in m)put(p,m[p])}};
}
(async()=>{
  const db={classe:{saison:{id:0,nom:'Bêta',debut:1}}};
  const BA=base('ua','Alice',db),BB=base('ub','Bob',db),SA=C.service(BA),SB=C.service(BB);
  const ja=await SA.profil(),jb=await SB.profil();eq(ja.elo,1000);eq(ja.saison,0);eq(ja.maj,1000,'maj en heure serveur');eq(jb.parties,0);
  ok(!db.classe.classement,'pas de classement pendant le placement');
  // Classée entre joueurs : A gagne. A (gagnant) n'écrit RIEN ; B (perdant) crée, confirme et applique les deux profils.
  const nA=BA.ecrits.length,ra=await SA.finJoueurs({sa:'AbC1',gr:-42,a:'ua',b:'ub',gagnant:'ua'});eq(ra.id,'abc1--42','id en minuscules');
  ok(ra.attente&&!ra.fait,'gagnant : en attente');eq(BA.ecrits.length,nA,'gagnant : aucune écriture');ok(!db.classe.parties,'pas de partie écrite par le gagnant');
  let pauses=0;eq(await SA.attends('abc1--42',{essais:3,pause:async()=>{pauses++}}),null,"gagnant : rien tant que le perdant n'a pas écrit");eq(pauses,2);
  const ecoute=SA.attends('abc1--42',{essais:5,pause:async()=>{await new Promise(r=>setImmediate(r))}});
  const rb=await SB.finJoueurs({sa:'abc1',gr:-42,a:'ua',b:'ub',gagnant:'ua'});ok(rb.fait);
  ok(db.classe.parties['abc1--42'].ok.ub);ok(!db.classe.parties['abc1--42'].ok.ua,'le gagnant ne confirme pas');
  eq(db.classe.joueurs.ua.elo,1032);eq(db.classe.joueurs.ub.elo,968);eq(db.classe.joueurs.ua.dern,'abc1--42');ok(db.classe.parties['abc1--42'].fait.ua&&db.classe.parties['abc1--42'].fait.ub);
  const vuA=await ecoute;ok(vuA,"gagnant : profil vu par l'écoute");eq(vuA.elo,1032,"gagnant : Elo réel (pas l'estimation)");eq(vuA.dern,'abc1--42');
  eq(BA.ecrits.length,nA,'gagnant : toujours aucune écriture');
  ok(await SA.applique('abc1--42'),'déjà appliquée : true sans rien réécrire');eq(db.classe.joueurs.ua.parties,1,'appliquée une seule fois');
  // Déconnexion du perdant AVANT toute écriture : rien dans la base ; le gagnant reste en attente ; reprise du perdant au chargement.
  const db2={classe:{saison:{id:0,nom:'Bêta',debut:1}}},A2=base('ua','Alice',db2),B2=base('ub','Bob',db2),SA2=C.service(A2),SB2=C.service(B2);
  await SA2.profil();await SB2.profil();
  eq(await SA2.attends('x-1',{essais:2,pause:async()=>{}}),null);ok(!(await SA2.applique('x-1')),'gagnant au chargement : partie absente, reste en attente');
  ok((await SB2.finJoueurs({sa:'x',gr:1,a:'ua',b:'ub',gagnant:'ua'})).fait,'perdant : reprise de la fin au chargement');
  eq(db2.classe.joueurs.ua.elo,1032);eq(db2.classe.joueurs.ub.elo,968);ok(await SA2.applique('x-1'),"gagnant : déjà appliquée, sortie de l'attente");eq(db2.classe.joueurs.ua.parties,1);
  // Déconnexion du perdant APRÈS création et confirmation, avant les profils : chacun applique la sienne au chargement.
  await B2.ecrit({['classe/parties/x-2']:C.creePartie({sa:'x',gr:2,a:'ua',b:'ub',profilA:db2.classe.joueurs.ua,profilB:db2.classe.joueurs.ub,gagnant:'ua',saison:0}).partie});
  await B2.ecrit(C.confirmation('x-2','ub'));
  ok(await SA2.applique('x-2'),'gagnant au chargement : partie confirmée, il applique la sienne');ok(!db2.classe.parties['x-2'].fait.ub);
  ok(await SB2.applique('x-2'),'perdant au chargement : applique la sienne');eq(db2.classe.joueurs.ub.parties,2);eq(db2.classe.joueurs.ua.parties,2,'gagnant appliqué une seule fois');
  // Perdant coupé après sa confirmation : sa reprise (applique) applique aussi le gagnant.
  await B2.ecrit({['classe/parties/x-3']:C.creePartie({sa:'x',gr:3,a:'ua',b:'ub',profilA:db2.classe.joueurs.ua,profilB:db2.classe.joueurs.ub,gagnant:'ub',saison:0}).partie});
  const avB=A2.ecrits.length;ok(await SA2.applique('x-3'),'perdant (A) : confirme et applique');ok(db2.classe.parties['x-3'].ok.ua);ok(db2.classe.parties['x-3'].fait.ub,'et applique aussi le gagnant');ok(A2.ecrits.length>avB);
  eq((await SB2.attends('x-3',{essais:1})).dern,'x-3','gagnant : voit la valeur écrite');
  // Classée contre un robot.
  const r=await SA.finRobot({sa:'abc1',gr:7,niveau:C.niveauRobot(1032),gagne:true});ok(r.fait);eq(r.id,'abc1-7-robot-normal');
  eq(db.classe.joueurs.ua.robots.n,1);eq(r.delta,db.classe.joueurs.ua.elo-1032);ok(r.delta>0&&r.delta<=32);
  let refus=null;try{await SA.finRobot({sa:'abc1',gr:8,niveau:'normal',gagne:'nul'})}catch(e){refus=e.code}eq(refus,'classe/sans-gagnant','fin sans gagnant refusée');ok(!db.classe.parties['abc1-8-robot-normal']);
  refus=null;try{await SA.finJoueurs({sa:'abc1',gr:9,a:'ua',b:'ub',gagnant:null})}catch(e){refus=e.code}eq(refus,'classe/sans-gagnant');ok(!db.classe.parties['abc1-9']);
  await SA.finRobot({sa:'abc1',gr:8,niveau:'normal',gagne:false});eq(db.classe.joueurs.ua.robots.n,2);
  // Placement fini : ligne du classement publiée.
  for(let i=0;i<2;i++)await SA.finRobot({sa:'abc1',gr:20+i,niveau:'normal',gagne:true});
  eq(db.classe.joueurs.ua.parties,5);deq(db.classe.classement.ua,C.ligneClassement('Alice',db.classe.joueurs.ua));
  // Fin de saison : instantané (placement fini), remise à mi-chemin, classement retiré ; puis place posée par Romain -> médaille + écu.
  const eloFin=db.classe.joueurs.ua.elo;db.classe.saison={id:1,nom:'Saison 1',debut:2};db.classe.saisons={0:{nom:'Bêta',debut:1,fin:2}};
  let vu=null;const j1=await SA.profil({stats:async s=>{vu=s;return {modes:{classee:{parties:5,v:4,d:0,best:3,serie:3}},tops:{decks:[{nom:'Montée',e:'brume',n:5,v:4}],mvp:[{id:'001',n:2}]}}}});
  eq(vu,0,'stats demandées pour la saison finie');eq(j1.saison,1);eq(j1.parties,0);eq(j1.elo,C.eloRemise(eloFin));ok(!db.classe.classement||!db.classe.classement.ua,'classement retiré');
  const I=db.classe.instantanes[0].ua;eq(I.elo,eloFin);ok(I.placementFini);ok(!('place' in I));eq(I.tops.decks[0].nom,'Montée');eq(I.modes.classee.best,3);
  deq(db.classe.ecussons.ua[0],{saison:0},'médaille Pionnier seule avant la place');
  db.classe.instantanes[0].ua.place=2;await SA.recompenses();deq(db.classe.ecussons.ua[0],{saison:0,place:2,ecu:'argent'},'écu argent après la place posée par Romain');
  eq(await SA.recompenses(),0,'rien à réécrire');
  // B : placement non fini -> 0.6.3 : instantané quand même (les trois modes), placementFini faux, sans récompense.
  await SB.profil();ok(db.classe.instantanes[0].ub&&db.classe.instantanes[0].ub.placementFini===false,'instantané hors placement');ok(!db.classe.ecussons.ub);eq(db.classe.joueurs.ub.saison,1);
  res.push('service');
  console.log('test_classe : '+nv+' vérifications OK ('+res.join(', ')+')');
})().catch(e=>{console.error(e);process.exit(1)});
