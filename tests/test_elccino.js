// Elccino (021, G-021) et Agent double SOLAEGIS (021e). Node : node tests/test_elccino.js
// Porte du prototype (6 - Outils et simulations\2 - Simulations\Elccino\tests\test_elccino.js), nouveau Cafe du matin seulement (regarde 2, prend 1, l'autre sous le deck).
const M=require('../moteur.js'),assert=require('assert');
let nv=0;const ok=(c,m)=>{assert(c,m||'ok');nv++},eq=(a,b,m)=>{assert.strictEqual(a,b,m||'eq');nv++},deq=(a,b,m)=>{assert.deepStrictEqual(a,b,m||'deq');nv++};
const T=n=>({...M.TERRAINS.find(x=>x.nom===n)});
/* ids : KaTarN 0, Alrevan 6, Cyrdan 12, Roi du Mobile 27, Apo 45, Maitre du deguisement 48, Velnen 78, Le chansonnier 81, Elccino 129-131, SOLAEGIS 132-134 */
const KA=0,AL=6,RM=27,AP=45,MD=48,VE=78,CH=81,EL=129,EL2=130,SO=132;
const res=[];
const nouv=(manche)=>{const s=M.nouvelle(5,['','']);s.phase='jeu';s.mull=[true,true];s.premier=0;s.tour=1;s.joueur=0;s.manche=manche||1;
  s.j.forEach((J,p)=>{J.etapeForge=false;J.main=[];J.energie=0;J.deck=[40+10*p,41+10*p,42+10*p,43+10*p,44+10*p,45+10*p];J.defausse=[];J.forge=[];J.score=0;J.grille=[[null,null,null],[null,null,null],[null,null,null]]});
  s.terrains=['La Boutique','L\'Écran du MJ','Le Camp'].map(T);return s};
const pose=(s,p,c,f,l,k,o={})=>{s.j[p].grille[l][k]={c,f,d:0,...o}};
const joue=(s,p,c,l,k)=>{s.j[p].main.push(c);s.j[p].energie+=M.coutPose(s,p,c,l,k);M.applique(s,p,{t:'p',c,l,k})};
const log=(s,re)=>s.log.some(x=>re.test(x[1]));
const fm=s=>{s.joueur=1;s.premier=0;s.tour=3;s.j[1].etapeForge=false;M.applique(s,1,{t:'x'})};
{ // 0. cartes, rangs, codes
  const B=M.CARTES['021'],E=M.CARTES['021e'];deq(B.el,['brume','cristal']);deq(E.el,['brume','cristal']);eq(B.nom,'Elccino');eq(E.nom,'Agent double SOLAEGIS');eq(E.base,'021');
  eq(B.cout,3);eq(B.force,1);eq(E.cout,4);eq(E.force,2);
  eq(B.texte,'Café du matin : à la pose et à chaque début de manche, regarde les 2 premières cartes de ton deck, prends-en 1 et remets l\'autre sous ton deck. Puis un Golem allié gagne +1 de Force.');
  eq(E.texte,'La taupe : à la pose, regarde la main adverse et choisis-en 1 : ton adversaire la défausse. Un Golem allié gagne +2 de Force.');
  eq(M.TYPES.length,45);eq(M.TYPES.indexOf('021'),43);eq(M.TYPES.indexOf('021e'),44);eq(M.TYPES.indexOf('903'),42,'Uki inchange');eq(M.carte(EL).id,'021');eq(M.carte(SO).id,'021e');
  eq(M.code({t:'u',c:SO}),'u~~6');deq(M.decode('u~~6'),{t:'u',c:SO});deq(M.decode('q21'),{t:'q',l:2,k:1});eq(M.code({t:'q',l:2,k:1}),'q21');
  assert.throws(()=>M.decode('q~0'));assert.throws(()=>M.decode('q3'));assert.throws(()=>M.decode('u'));nv+=3;
  const D={'021':3,'021e':3,'003':3,'003e':3,'020':3,'020e':3,'013':3,'013e':3,'042':3,'025':3};eq(M.erreurDeck(D),'');deq(M.lisDeck(M.deckTexte(D)),D);
  res.push('cartes');
}
{ // 1. Cafe du matin a la pose
  let s=nouv();joue(s,0,EL,0,0);eq(s.attente.t,'cafe');ok(s.attente.regard);deq(s.attente.options,[40,41]);deq(M.legales(s,0),[{t:'u',c:40},{t:'u',c:41}],'prendre l une des 2, pas de refus');
  deq(s.j[0].main,[],'rien de pioche');eq(s.j[0].deck.length,6);ok(log(s,/Elccino : Café du matin, regarde les 2 premières cartes de son deck\./));
  M.applique(s,0,{t:'u',c:41});deq(s.j[0].main,[41]);deq(s.j[0].deck,[42,43,44,45,40],'l autre tout en bas');eq(s.attente,null,'un seul Golem : bonus d office');
  eq(s.j[0].grille[0][0].cf,1);eq(M.forceDe(s,0,0,0),2);eq(s.j[1].score,0);
  deq(s.stats.elc.cafe,[{m:1,p:0,n:1,v:0,q:'pose'}]);deq(s.stats.elc.boost,[{m:1,p:0,n:1,c:EL}]);
  // autre allie : choix ; puis le tour continue
  s=nouv();pose(s,0,AL,3,1,1);joue(s,0,EL,0,0);M.applique(s,0,{t:'u',c:40});eq(s.attente.t,'boost');deq(M.legales(s,0),[{t:'q',l:0,k:0},{t:'q',l:1,k:1}]);
  M.applique(s,0,{t:'q',l:1,k:1});eq(s.j[0].grille[1][1].cf,1);eq(M.forceDe(s,0,1,1),3+1);eq(s.attente,null);ok(M.legales(s,0).some(a=>a.t==='x'),'le tour continue');
  // 1 carte : prise d'office ; deck vide : rien, aucun point, +1 quand meme
  s=nouv();s.j[0].deck=[40];joue(s,0,EL,0,0);eq(s.attente,null,'1 carte : prise d office');deq(s.j[0].main,[40]);deq(s.j[0].deck,[]);eq(s.j[0].grille[0][0].cf,1);eq(s.j[1].score,0);
  s=nouv();s.j[0].deck=[];joue(s,0,EL,0,0);eq(s.attente,null);deq(s.j[0].main,[]);eq(s.j[1].score,0,'deck vide : pas une pioche');eq(s.j[0].grille[0][0].cf,1,'+1 quand meme');
  ok(!s.stats.ev.some(e=>e.t==='dv'));
  res.push('Cafe a la pose');
}
{ // 2. debut des manches 2 et 3, avant le premier tour
  let s=nouv();pose(s,0,EL,1,0,0);pose(s,1,AL,3,2,2);const m1=s.j[1].main.length;fm(s);
  eq(s.manche,2);eq(s.premier,1);eq(s.attente.t,'cafe');eq(s.attente.p,0);deq(M.attendus(s),[0]);eq(s.j[1].main.length,m1,'le premier joueur n a pas encore pioche');ok(s.cafes);
  M.applique(s,0,{t:'u',c:s.attente.options[1]});eq(s.j[0].grille[0][0].cf,1);ok(!('cafes' in s),'file videe');eq(s.j[1].main.length,m1+2,'puis le tour du premier joueur');deq(M.attendus(s),[1]);
  eq(s.stats.elc.cafe[0].q,'manche');
  s=nouv();pose(s,0,EL,1,0,0);pose(s,1,EL2,1,0,0);fm(s);eq(s.attente.p,1,'premier joueur de la manche d abord');M.applique(s,1,{t:'u',c:s.attente.options[0]});eq(s.attente.p,0);M.applique(s,0,{t:'u',c:s.attente.options[0]});
  eq(s.attente,null);eq(s.j[0].grille[0][0].cf,1);eq(s.j[1].grille[0][0].cf,1);
  s=nouv();pose(s,0,SO,2,0,0);fm(s);eq(s.attente,null,'SOLAEGIS : pas de Cafe');ok(!s.stats.elc);
  s=nouv(2);pose(s,0,EL,1,0,0);fm(s);eq(s.manche,3);eq(s.attente.t,'cafe','manche 3');
  s=nouv(3);pose(s,0,EL,1,0,0);fm(s);ok(s.fin,'fin de partie');ok(!s.stats.elc,'pas de Cafe apres la manche 3');
  res.push('Cafe en debut de manche');
}
{ // 3. La taupe
  let s=nouv();pose(s,0,EL,1,0,0,{cf:1});s.j[1].main=[12,30,60];joue(s,0,SO,0,0);eq(s.attente.t,'taupe');ok(s.attente.adv);deq(M.legales(s,0).map(a=>a.c),[12,30,60]);
  ok(!s.stats.vues[0].includes(30),'main adverse pas comptee comme vue');
  M.applique(s,0,{t:'u',c:30});deq(s.j[1].main,[12,60]);ok(s.j[1].defausse.includes(30));eq(s.j[0].grille[0][0].cf,3,'bonus du Cafe garde a l evolution, +2');eq(M.forceDe(s,0,0,0),2+3);
  ok(log(s,/La taupe : l'adversaire défausse/));deq(s.stats.elc.taupe,[{m:1,p:0,c:30}]);
  s=nouv();pose(s,0,EL,1,0,0);s.j[1].main=[];joue(s,0,SO,0,0);eq(s.attente,null,'main adverse vide');eq(s.j[0].grille[0][0].cf,2,'+2 quand meme');
  s=nouv();pose(s,0,EL,1,0,0);pose(s,1,RM,4,0,0);s.j[1].main=[12];joue(s,0,SO,0,0);eq(s.attente.t,'taupe','Mode Avion ne protege pas la main');
  s=nouv();pose(s,0,AL,3,1,1,{cf:1});joue(s,0,AL+1,1,1);ok(!s.j[0].grille[1][1].cf,'perdu au remplacement');
  res.push('La taupe');
}
{ // 4. copies
  let s=nouv();pose(s,0,EL,1,0,0);pose(s,0,AP,2,0,1);joue(s,0,MD,0,1);eq(s.attente.t,'cafe','Apo copie le Cafe a la pose');ok(s.attente.regard);
  M.applique(s,0,{t:'u',c:s.attente.options[0]});eq(s.attente.t,'boost');M.applique(s,0,{t:'q',l:0,k:1});eq(s.j[0].grille[0][1].cf,1);
  fm(s);eq(s.attente.t,'cafe');let n=0;while(s.attente&&n<6){M.applique(s,s.attente.p,M.robot(s,s.attente.p,'difficile'));n++}eq(s.stats.elc.cafe.filter(x=>x.q==='manche').length,2,'Elccino et Apo : 2 Cafes');
  s=nouv();pose(s,1,SO,2,0,0);pose(s,0,VE,1,0,0);s.j[1].main=[12,13];joue(s,0,CH,0,0);eq(s.attente.t,'i');M.applique(s,0,{t:'i',o:1});eq(s.attente.t,'taupe','le chansonnier copie La taupe');deq(s.attente.options,[12,13]);
  res.push('copies');
}
{ // 5. robot
  let s=nouv();pose(s,0,AL,3,1,1);s.j[0].deck=[AL+1,KA,50];joue(s,0,EL,0,0);eq(M.robot(s,0,'difficile').c,KA,'prend la plus utile (KaTarN a la manche 1)');
  M.applique(s,0,{t:'u',c:KA});deq(s.j[0].deck,[50,AL+1]);eq(s.attente.t,'boost');
  s=nouv();pose(s,0,EL,1,0,0);s.j[1].main=[AL,KA];joue(s,0,SO,0,0);eq(M.robot(s,0,'difficile').c,KA,'taupe : la carte adverse la plus utile');
  s=nouv();pose(s,0,AL,3,0,1);pose(s,0,AL+1,3,0,2);pose(s,1,AL,3,0,2);pose(s,1,AL+1,9,0,1);joue(s,0,EL,1,1);M.applique(s,0,{t:'u',c:s.attente.options[0]});eq(s.attente.t,'boost');
  deq(M.robot(s,0,'difficile'),{t:'q',l:0,k:2},'bonus sur le terrain a egalite');deq(M.robot(s,0,'normal'),{t:'q',l:0,k:2});
  s=nouv();s.manche=3;s.tour=3;s.joueur=1;s.premier=0;s.j[1].deck=[];eq(M.risqueDeck(s,1,'021',[0,0],0),0,'aucune pioche, aucun risque');
  res.push('robot');
}
{ // 6. parties completes, Elccino dans les deux decks, 4 niveaux : rejeu identique, cartes conservees
  const D=[M.deckTexte({'021':3,'021e':3,'003':3,'003e':3,'020':3,'020e':2,'013':3,'013e':3,'042':3,'025':3,'903':1}),M.deckTexte({'021':2,'021e':2,'007':3,'007e':3,'026':3,'026e':3,'041':3,'041e':3,'004':3,'004e':2,'901':1})];
  let c=0,t=0,b=0,dv=0;const niv=['aleatoire','facile','normal','difficile'];
  for(let g=1;g<=200;g++){const dk=g%2?D:[D[1],D[0]],u=M.nouvelle(g,dk),j=[[],[]];let pas=0,h=g|1;const hz=n=>{h=(Math.imul(h,1103515245)+12345)|0;return (h>>>8)%n};
    while(!u.fin){assert(++pas<3000,'blocage '+g);const p=M.attendus(u)[0];let x;if(g%4===0){const l=M.legales(u,p);x=l[hz(l.length)]}else x=M.robot(u,p,niv[g%4]);M.applique(u,p,x);j[p].push(M.code(x));
      u.j.forEach((J,q)=>{const vu=[...J.deck,...J.main,...J.defausse,...J.forge];J.grille.forEach(L=>L.forEach(z=>{if(z){vu.push(z.c);if(z.ani)vu.push(z.ani.c)}}));const n=Object.values(M.lisDeck(dk[q])).reduce((a,b)=>a+b,0);
        if(new Set(vu).size!==n||vu.length!==n)throw new Error('cartes '+g)})}
    const r=M.rejoue(g,j,dk);eq(r.erreur,null);eq(JSON.stringify(r.etat),JSON.stringify(u),'rejeu Elccino '+g);M.bilan(u);
    if(u.stats.elc){c+=u.stats.elc.cafe.length;t+=u.stats.elc.taupe.length;b+=u.stats.elc.boost.length;dv+=u.stats.elc.cafe.reduce((a,x)=>a+x.v,0)}}
  ok(c>50&&t>10&&b>50&&dv===0,'Cafes '+c+', taupes '+t+', bonus '+b);res.push('parties ('+c+' Cafes, '+t+' taupes, '+b+' bonus)');
}
console.log('Elccino OK : '+nv+' vérifications ('+res.join(', ')+')');
