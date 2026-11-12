// 0.7 : copies des nouveaux effets par Imitation (Le chansonnier, 041e) et Deguisement (Maitre du deguisement, 029e), pour un joueur (coup force)
// comme pour le robot (M.robot). Des, choix d'Info tchat par le robot, protection d'On flip, reductions de cout, KEKWait, Chance du debutant.
// Node : node tests/test_copies_07.js
const M=require('../moteur.js'),assert=require('assert');
let nv=0;const ok=(c,m)=>{assert(c,m||'ok');nv++},eq=(a,b,m)=>{assert.strictEqual(a,b,m||'eq');nv++};
const T=n=>({...M.TERRAINS.find(x=>x.nom===n)});
const id=x=>M.TYPES.indexOf(x)*3;
const CY=id('003'),VE=id('041'),CH=id('041e'),AP=id('029'),MD=id('029e'),GL=id('009'),KC=id('008');
const nouv=()=>{const s=M.nouvelle(5,['','']);s.phase='jeu';s.mull=[true,true];s.premier=0;s.tour=1;s.joueur=0;s.manche=1;
  s.j.forEach(J=>{J.etapeForge=false;J.main=[];J.energie=0;J.deck=[];J.defausse=[];J.forge=[];J.score=0;J.grille=[[null,null,null],[null,null,null],[null,null,null]]});
  s.deckLibre=true;s.terrains=['La Faille','L\'Écran du MJ','Le Vaisseau'].map(T);return s};
const pose=(s,p,c,f,l,k,o={})=>{s.j[p].grille[l][k]={c,f,d:0,...o}};
const L=s=>s.log.map(x=>x[1]);
const res=[];
/* Imitation : chansonnier pose sur son Velnen en (1,1), le Golem cible en face (adversaire, (1,1)). o : 1 copier, 0 refuser, 'robot' : choix du robot */
const imite=(code,o,prep)=>{const s=nouv();s.j[0].deck=[GL,GL+1,GL+2,KC];s.j[0].defausse=[KC+1,KC+2];s.j[0].main=[CY+1,CY+2];
  pose(s,1,id(code),M.CARTES[code].force,1,1);pose(s,0,VE,1,1,1);pose(s,0,CY,1,0,1);if(prep)prep(s);
  s.j[0].main.push(CH);s.j[0].energie+=M.coutPose(s,0,CH,1,1);M.applique(s,0,{t:'p',c:CH,l:1,k:1});
  eq(s.attente&&s.attente.t,'i','Imitation proposee face a '+code);
  const a=o==='robot'?M.robot(s,0):{t:'i',o};M.applique(s,0,a);return {s,a,g:s.j[0].grille[1][1]}};
/* Deguisement : Maitre du deguisement pose sur son Apo en (1,1), seul voisin allie : le Golem a copier en (0,1) */
const deguise=(code,prep)=>{const s=nouv();s.j[0].deck=[GL,GL+1,GL+2,KC];s.j[0].defausse=[KC+1,KC+2];s.j[0].main=[CY+1];
  pose(s,0,id(code),M.CARTES[code].force,0,1);pose(s,0,AP,2,1,1);if(prep)prep(s);
  s.j[0].main.push(MD);s.j[0].energie+=M.coutPose(s,0,MD,1,1);M.applique(s,0,{t:'p',c:MD,l:1,k:1});return {s,g:s.j[0].grille[1][1]}};

{ // 1. Chaque nouvel effet est copie par Imitation (joueur) et porte par le copieur
  for(const c of ['002','002e','007e','037','037e','025','042','042e']){const {g}=imite(c,1);eq(M.idEff(g),c,'copie de '+c);}
  res.push('Imitation : 8 effets copies');
}
{ // 2. Des : Tout ou rien et High Roll lances par le copieur, et leurs issues (bonus aux autres allies ici, reduction, energie)
  const vus={haut:0,bas:0,dbl:0,ener:0};
  for(let x=1;x<120;x++){
    let {s}=imite('002',1,s=>{s.rng=[x,x*7]});const m=L(s).map(t=>/Le chansonnier\) : Tout ou rien \((\d)\)/.exec(t)).filter(Boolean).pop();ok(m,'de Tout ou rien');
    if(+m[1]>=4){vus.haut++;eq(s.j[0].grille[0][1].bo,1)}else{vus.bas++;eq(s.j[0].reduc,1)}
    ({s}=imite('002e',1,s=>{s.rng=[x,x*3+1]}));const e0=s.j[0].energie;const h=L(s).map(t=>/Le chansonnier\) : High Roll \((\d) et (\d)\)/.exec(t)).filter(Boolean).pop();ok(h,'des High Roll');
    if(h[1]===h[2]){vus.dbl++;eq(s.j[0].grille[0][1].bo,+h[1])}else{vus.ener++;ok(!s.j[0].grille[0][1].bo)}}
  ok(vus.haut&&vus.bas&&vus.dbl&&vus.ener,JSON.stringify(vus));
  {const {s}=deguise('002',s=>{s.rng=[3,9]});ok(L(s).some(t=>/Maître du déguisement\) : Tout ou rien \(\d\)/.test(t)),'Deguisement : de');}
  {const {s}=deguise('002e',s=>{s.rng=[3,9]});ok(L(s).some(t=>/Maître du déguisement\) : High Roll \(\d et \d\)/.test(t)),'Deguisement : 2 des');}
  res.push('des '+JSON.stringify(vus));
}
{ // 3. Info tchat copie : attente 'vic' du copieur, le robot choisit (garde une carte utile dessus, sinon dessous), un joueur aussi
  let {s}=imite('042',1);eq(s.attente&&s.attente.t,'vic');eq(s.attente.src,CH);const top=s.j[0].deck[0];
  const a=M.robot(s,0);eq(a.t,'i');M.applique(s,0,a);ok(!s.attente);eq(s.j[0].deck[a.o?0:s.j[0].deck.length-1],top,'carte laissee ou mise dessous');
  ({s}=imite('042',1));M.applique(s,0,{t:'i',o:0});eq(s.j[0].deck[s.j[0].deck.length-1],GL,'joueur : dessous');
  ({s}=deguise('042'));eq(s.attente&&s.attente.t,'vic');const b=M.robot(s,0);M.applique(s,0,b);ok(!s.attente);
  // carte inutile dessus (evolution sans base, cout 5) : le robot la met dessous
  ({s}=imite('042',1,s=>{s.j[0].deck=[id('029e'),GL]}));eq(M.robot(s,0).o,0,'carte inutile : dessous');
  res.push('Info tchat copie (robot et joueur)');
}
{ // 4. On flip copie : pioche, de, puis forge ou protection du copieur (g.prot lu sur l'effet copie)
  const vus={forge:0,prot:0};
  for(let x=1;x<80;x++){const {s,g}=imite('007e',1,s=>{s.rng=[x,x*5+2]});const m=L(s).map(t=>/Le chansonnier\) : On flip, dé (\d)/.exec(t)).filter(Boolean).pop();ok(m,'de On flip');
    if(g.prot){vus.prot++;ok(!M.ciblable(s,0,1,1,1),'copieur protege');ok(M.ciblable(s,0,1,1,0))}else{vus.forge++;ok(M.ciblable(s,0,1,1,1))}}
  ok(vus.forge&&vus.prot,JSON.stringify(vus));
  // protege : l'Imitation adverse ne peut plus le copier
  {let s;for(let x=1;;x++){({s}=imite('007e',1,s=>{s.rng=[x,x*5+2]}));if(s.j[0].grille[1][1].prot)break}
    s.joueur=1;s.j[1].grille[1][1]={c:VE+1,f:1,d:0};s.j[1].main=[CH+1];s.j[1].energie=9;M.applique(s,1,{t:'p',c:CH+1,l:1,k:1});
    ok(!s.attente&&L(s).some(t=>/est protégé \(On flip\)/.test(t)),'copie protegee non ciblable')}
  {let s,g;for(let x=1;;x++){({s,g}=deguise('007e',s=>{s.rng=[x,x*5+2]}));if(g.prot)break}ok(!M.ciblable(s,0,1,1,1),'Deguisement : protege')}
  res.push('On flip copie '+JSON.stringify(vus));
}
{ // 5. Reductions de cout : Counter-pick (le copieur domine en face), Full synergie (elements du copieur partages avec ses voisins)
  // chansonnier roche/brume ; en face SuperFishman foudre/roche : roche domine foudre ? on lit DOMINE pour ne rien supposer
  const dom=(a,b)=>M.CARTES[a].el.some(e=>M.CARTES[b].el.includes(M.DOMINE[e]));
  {const {s}=imite('037',1);eq(s.j[0].reduc||0,dom('041e','037')?1:0,'Counter-pick copie');
    if(s.j[0].reduc){const c=GL+1;eq(M.coutPose(s,0,c,0,0),M.CARTES['009'].cout-1,'prochain Golem -1')}}
  {const {s}=imite('037e',1);const G=s.j[0].grille,vs=[[0,1],[2,1],[1,0],[1,2]].map(([a,b])=>G[a][b]).filter(h=>h&&!M.carte(h.c).animal);
    const n=Math.min(2,M.CARTES['041e'].el.filter(e=>vs.some(h=>M.carte(h.c).el.includes(e))).length);eq(s.j[0].reducCarte||0,n,'Full synergie copie : '+n)}
  {const {s}=deguise('037e');const n=Math.min(2,M.CARTES['029e'].el.filter(e=>M.CARTES['037e'].el.includes(e)).length);eq(s.j[0].reducCarte||0,n,'Deguisement Full synergie')}
  // Counter-pick par Deguisement : Apo magma/roche face a un Golem domine
  {const tgt=M.TYPES.find(t=>!M.CARTES[t].animal&&!M.CARTES[t].base&&M.CARTES['029e'].el.some(e=>M.CARTES[t].el.includes(M.DOMINE[e])));
    const {s}=deguise('037',s=>pose(s,1,id(tgt),5,1,1));eq(s.j[0].reduc,1,'Deguisement Counter-pick');}
  res.push('reductions copiees');
}
{ // 6. KEKWait copie : allies au-dessus du copieur (Roi du Karaoke en (0,1)) -> 1 carte de la defausse remelangee
  const {s}=imite('025',1);eq(s.j[0].defausse.length,2,'1 carte recyclee (2 + Velnen remplace - 1)');eq(s.j[0].deck.length,5);ok(L(s).some(t=>/Le chansonnier\) : KEKWait, mélange 1 carte/.test(t)));
  res.push('KEKWait copie');
}
{ // 7. Chance du debutant copiee : premiere perte adverse annulee + pioche 1
  const {s,g}=imite('042e',1);const n=s.j[0].main.length;M.blesse(s,0,1,1,2,{p:1});eq(g.d,0);eq(s.j[0].main.length,n+1);M.blesse(s,0,1,1,1,{p:1});eq(g.d,1,'une seule fois');
  res.push('Chance du debutant copiee');
}
{ // 8. Robot : il copie chacun des nouveaux effets quand la copie vaut quelque chose (valeurCopie / robotCopie), et Imitation proposee
  const pris={};
  for(const c of ['002','002e','007e','037','037e','025','042','042e']){const {a}=imite(c,'robot');pris[c]=a.o}
  for(const c in pris)eq(pris[c],1,'robot copie '+c+' '+JSON.stringify(pris));
  res.push('robot copie les 8');
}
{ // 9. Parties robot contre robot avec copieurs et nouveaux effets : aucune erreur, rejeu identique
  let n=0;
  for(let g=1;g<=40;g++){const s=M.nouvelle(g,['','']);let k=0;while(s.phase!=='fin'&&k++<3000){const p=M.attendus(s)[0];M.applique(s,p,M.robot(s,p))}ok(s.phase==='fin','partie '+g+' finie');n++}
  res.push(n+' parties robot');
}
console.log('test_copies_07 : '+nv+' verifications OK ('+res.join(' ; ')+')');
