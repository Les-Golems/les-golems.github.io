// Classées, rangs, robots, saisons, écussons (0.6). Node : node tests/test_classe.js
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
  ok(C.peutAffronterRobot(r,t2));eq(C.robotsRestants(r,t2),5);deq(C.compteRobot(r,t2),{jour:'2026-11-10',n:1});
  const p=C.appliquePartie({elo:1000,parties:6,partiesTotal:6,robots:{jour:'2026-11-09',n:2}},1100,true,{robot:true,maintenant:t1}).joueur;deq(p.robots,{jour:'2026-11-09',n:3});
  const q=C.appliquePartie({elo:1000,parties:6,partiesTotal:6,robots:{jour:'2026-11-09',n:2}},1000,true).joueur;deq(q.robots,{jour:'2026-11-09',n:2},'partie humaine : compteur inchangé');
  res.push('jour');
}
{ // saisons, remise mi-chemin
  eq(C.saison(0).nom,'Bêta');eq(C.saison(0).fin,null);
  eq(C.eloRemise(1400),1200);eq(C.eloRemise(800),900);eq(C.eloRemise(1000),1000);eq(C.eloRemise(1101),1051);
  const n=C.nouvelleSaison({elo:1300,parties:40,partiesTotal:40,v:25,d:15});eq(n.elo,1150);eq(n.parties,0);eq(n.partiesTotal,40);eq(n.v,0);
  ok(C.enPlacement(n));eq(C.facteurK(n.partiesTotal),20);res.push('saisons');
}
{ // écussons et instantané
  eq(C.palier(1),'champion');eq(C.palier(2),'podium');eq(C.palier(3),'podium');eq(C.palier(4),'top10');eq(C.palier(10),'top10');eq(C.palier(11),'base');eq(C.palier(null),'base');
  eq(C.ecusson(0,{elo:1200,parties:3},null),null,'placement non fini : pas d écusson');
  deq(C.ecusson(0,{elo:1200,parties:5},2),{saison:0,rang:'pionnier',palier:'podium',image:'images/ecussons/saison-0-pionnier-podium.png'});
  deq(C.ecusson(1,{elo:1420,parties:20},1),{saison:1,rang:'diamant',palier:'champion',image:'images/ecussons/saison-1-diamant-champion.png'});
  eq(C.ecusson(1,{elo:960,parties:8},40).image,'images/ecussons/saison-1-topaze-base.png');
  const dern=Array.from({length:14},(_,i)=>({mode:'classee',gagne:i%2===0,adv:'x',t:i}));
  const s=C.instantaneSaison(0,{elo:1260,parties:12},7,{modes:{classee:{parties:12,v:7,d:5}},dernieres:dern,tops:{golems:[1,2,3,4,5,6].map(id=>({id,n:1,v:1})),terrains:[]},elements:{feu:{n:3,v:2}}});
  eq(s.rang,'rubis');eq(s.place,7);ok(s.placementFini);eq(s.dernieres.length,10);eq(s.dernieres[9].t,13);eq(s.tops.golems.length,5);eq(s.ecusson.palier,'top10');eq(s.elements.feu.v,2);
  const s2=C.instantaneSaison(0,{elo:1100,parties:2},null,{});eq(s2.rang,null);eq(s2.ecusson,null);ok(!s2.placementFini);
  res.push('ecussons');
}
console.log('test_classe : '+nv+' vérifications OK ('+res.join(', ')+')');
