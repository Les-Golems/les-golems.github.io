// 0.4a (sans Cyd), textes definitifs. Terrains T-011 a T-016 (L'Ecole, Le Karaoke, Les Pronos, Le Cirque, Le Tournoi, Le Versus). Node : node tests/test_terrains.js ; Chrome : harnais_terrains.html
const M=require('../moteur.js'),assert=require('assert');
let nv=0;const ok=(c,m)=>{assert(c,m);nv++},eq=(a,b,m)=>{assert.strictEqual(a,b,m||'eq');nv++},deq=(a,b,m)=>{assert.deepStrictEqual(a,b,m||'deq');nv++};
const ANC=['Le Buzzer','Le Camp','L\'Écran du MJ','La Boutique','La Faille','La Nuit au Village','Le Plateau de Jeu','Le Vaisseau','Le Carrousel','La Salle Verrouillée'];
const NOUV=['L\'École','Le Karaoké','Les Pronos','Le Cirque','Le Tournoi','Le Versus'];
const T=n=>({...M.TERRAINS.find(x=>x.nom===n)});
/* ids : KaTarN 0 (magma foudre), Alrevan 6 (brume roche), Cyrdan 12 (cristal roche, voisins +1), Roi du Karaoke 15, Trigas 24 (foudre brume),
   K-Chan 30 (magma cristal), SuperFishman 51 (roche cristal), Titom76 57 (brume foudre), Kiwi 69 (animal de Titom76), Vic222 108 (cristal roche) */
const KA=0,AL=6,CY=12,RK=15,TR=24,KC=30,SF=51,TI=57,KI=69,VI=108;
const res=[];
const nouv=(noms,manche)=>{const s=M.nouvelle(5,['','']);s.phase='jeu';s.mull=[true,true];s.premier=0;s.tour=1;s.joueur=0;s.manche=manche||1;
  s.j.forEach((J,p)=>{J.etapeForge=false;J.main=[];J.energie=0;J.deck=[90+p,91+p,92+p,93+p,94+p,95+p];J.defausse=[];J.forge=[];J.score=0;J.grille=[[null,null,null],[null,null,null],[null,null,null]]});
  s.terrains=noms.map(T);return s};
const pose=(s,p,c,f,l,k,o={})=>{s.j[p].grille[l][k]={c,f,d:0,...o}};
const fm=s=>{s.joueur=1;s.premier=0;s.tour=3;s.j[1].etapeForge=false;s.j[1].main=s.j[1].main.slice(0,7);M.applique(s,1,{t:'x'})}; /* fin de manche : le second joueur finit le tour 3 */
const log=(s,re)=>s.log.some(x=>re.test(x[1]));
const R0={liste:null,force:null,cirque:'tarte'},regle=o=>Object.assign(M.REGLAGE_TERRAINS,R0,o||{});
{ // 0. table des terrains
  eq(M.TERRAINS.length,16);eq(M.ANCIENS_TERRAINS,10);deq(M.TERRAINS.slice(0,10).map(x=>x.nom),['Le Buzzer','Le Camp','L\'Écran du MJ','La Boutique','La Faille','La Nuit au Village','Le Plateau de Jeu','Le Vaisseau','Le Carrousel','La Salle Verrouillée'],'10 anciens, meme ordre');
  M.TERRAINS.slice(0,10).forEach(x=>deq(Object.keys(x),['nom','pts','texte','cit'],'anciens : memes champs'));
  deq(M.TERRAINS.slice(10).map(x=>[x.nom,x.pts]),[['L\'École',2],['Le Karaoké',2],['Les Pronos',1],['Le Cirque',2],['Le Tournoi',1],['Le Versus',3]]);
  eq(T('L\'École').texte,'Fin de manche : le perdant pioche 1 carte.');eq(T('L\'École').cit,'C\'est en perdant qu\'on apprend.');
  eq(T('Le Karaoké').texte,'Si tu as exactement 2 Golems ici, ils gagnent +2 de Force chacun.');eq(T('Le Karaoké').cit,'À toi le micro !');
  eq(T('Les Pronos').texte,'Une fois par manche : mise 1 énergie ici.\nFin de manche : le gagnant marque 1 point de plus par mise des deux joueurs.');eq(T('Les Pronos').cit,'Celle-là, elle est safe.');
  eq(T('Le Cirque').texte,'Une fois par manche : inflige 1 dégât à un Golem adverse ici.');eq(T('Le Cirque').cit,'Honk honk.');
  eq(T('Le Tournoi').texte,'Vaut 1 point à la manche 1, 2 points à la manche 2 et 3 points à la manche 3.');eq(T('Le Tournoi').cit,'On garde le meilleur pour la fin.');
  M.TERRAINS.forEach(x=>{ok(!/—/.test(x.texte+x.cit),'aucun tiret cadratin')});
  deq({...M.REGLAGE_TERRAINS},R0,'reglage par defaut : tirage parmi les 15, rien de force');
  res.push('table');
}
{ // 1. tirage : 15 terrains, liste restreinte, terrain force, partie guidee
  regle();const vus={};let pr=[0,0];
  for(let g=1;g<=3000;g++){const s=M.nouvelle(g,['','']);eq(new Set(s.terrains.map(x=>x.nom)).size,3);s.terrains.forEach(x=>vus[x.nom]=(vus[x.nom]||0)+1);pr[s.premier]++}
  eq(Object.keys(vus).length,16,'les 16 sortent');Object.values(vus).forEach(n=>ok(n>440&&n<690,'tirage uniforme ('+n+' sur 562 attendus)'));ok(pr[0]>1350&&pr[1]>1350,'premier joueur au hasard');
  regle({liste:ANC});for(let g=1;g<=500;g++){const s=M.nouvelle(g,['','']);ok(s.terrains.every(x=>ANC.includes(x.nom)),'liste des 10 anciens')}
  regle({liste:['Le Cirque','Le Tournoi','L\'École']});{const s=M.nouvelle(7,['','']);deq(s.terrains.map(x=>x.nom).sort(),['L\'École','Le Cirque','Le Tournoi'])}
  regle({liste:[10,11,12]});{const s=M.nouvelle(7,['','']);deq(s.terrains.map(x=>x.nom).sort(),['L\'École','Le Karaoké','Les Pronos'],'liste par rangs')}
  regle({liste:['Inconnu','Le Camp','Le Buzzer']});assert.throws(()=>M.nouvelle(1,['','']));nv++;
  // force : le terrain force remplace une place, les deux autres et le premier joueur ne changent pas ; place au hasard
  const place=[0,0,0];
  for(let g=1;g<=900;g++){regle({liste:ANC});const a=M.nouvelle(g,['','']);
    for(const f of NOUV){regle({liste:ANC,force:f});const b=M.nouvelle(g,['','']),i=b.terrains.findIndex(x=>x.nom===f);
      ok(i>=0,'terrain force present');eq(b.premier,a.premier,'premier joueur inchange');eq(b.terrains.filter((x,k)=>k!==i&&x.nom===a.terrains[k].nom).length,2,'les deux autres terrains inchanges');
      deq(b.j,a.j,'mains et decks inchanges');if(f==='Le Cirque')place[i]++}}
  place.forEach(n=>ok(n>240&&n<360,'place du terrain force au hasard ('+n+')'));
  regle({force:'Les Pronos'});for(let g=1;g<=300;g++){const s=M.nouvelle(g,['','']);eq(s.terrains.filter(x=>x.nom==='Les Pronos').length,1,'force parmi les 15 : une seule fois')}
  regle({force:12});ok(M.nouvelle(3,['','']).terrains.some(x=>x.nom==='Les Pronos'),'force par rang');
  // partie guidee : 10 anciens terrains, comme une partie restreinte aux 10
  regle();for(let g=19440;g<19460;g++){const a=M.nouvelle(g,['0013001e30023002e30033003e300430083','tuto33']);ok(a.terrains.every(x=>ANC.includes(x.nom)),'partie guidee : anciens terrains');
    regle({liste:ANC});const b=M.nouvelle(g,['0013001e30023002e30033003e300430083','']);deq(a.terrains,b.terrains,'tirage de la partie guidee = 10 anciens');regle()}
  regle();res.push('tirage');
}
{ // 2. L'Ecole : le perdant pioche 1 carte ; sans gagnant, rien ; deck vide : 1 point a l'adversaire
  let s=nouv(['L\'École','L\'Écran du MJ','La Boutique'],3);pose(s,0,AL,5,0,0);s.j[1].deck=[40,41];fm(s);
  ok(s.fin,'manche 3 : fin');deq(s.j[1].main,[40],'le perdant pioche');deq(s.j[1].deck,[41]);eq(s.j[0].main.length,0,'le gagnant ne pioche pas');eq(s.j[0].score,2);eq(s.j[1].score,0);
  ok(log(s,/L'École : pioche 1 carte\./));deq(s.stats.terr.ecole,[{m:3,p:1,v:0}]);
  s=nouv(['La Boutique','L\'École','L\'Écran du MJ'],3);pose(s,1,AL,5,0,1);s.j[0].deck=[40];fm(s);deq(s.j[0].main,[40],'perdant joueur 0');eq(s.j[1].main.length,0);eq(s.j[1].score,2);
  s=nouv(['L\'École','L\'Écran du MJ','La Boutique'],3);pose(s,0,AL,5,0,0);s.j[1].deck=[];fm(s);eq(s.j[0].score,3,'deck vide : 2 + 1 point');eq(s.j[1].score,0);
  ok(s.stats.ev.some(e=>e.t==='dv'&&e.cp===1),'evenement de deck vide');deq(s.stats.terr.ecole,[{m:3,p:1,v:1}]);eq(M.bilan(s).joueurs[0].pointsDeckVide,1);
  s=nouv(['L\'École','L\'Écran du MJ','La Boutique'],3);pose(s,0,AL,3,0,0);pose(s,1,AL,3,0,0);fm(s);eq(s.j[0].main.length+s.j[1].main.length,0,'egalite : personne ne pioche');ok(!s.stats.terr,'aucune statistique');
  s=nouv(['L\'École','L\'Écran du MJ','La Boutique'],3);fm(s);eq(s.j[0].main.length+s.j[1].main.length,0,'terrain vide : rien');
  s=nouv(['L\'École','L\'Écran du MJ','La Boutique'],1);pose(s,0,AL,5,0,0);fm(s);eq(s.manche,2);eq(s.j[1].main.length,1+2,'manche 1 : 1 (Ecole) + 2 (premier joueur de la manche 2)');deq(s.stats.terr.ecole,[{m:1,p:1,v:0}]);
  s=nouv(['L\'École','L\'Écran du MJ','La Boutique'],3);pose(s,0,AL,5,0,0);s.j[1].deck=[];s.deckLibre=true;fm(s);eq(s.j[0].score,2,'banc d essai (deckLibre) : pas de point');
  res.push('Ecole');
}
{ // 3. Le Karaoke : exactement 2 Golems ici, +2 chacun
  let s=nouv(['Le Karaoké','L\'Écran du MJ','La Boutique']);pose(s,0,KA,8,0,0);eq(M.forceDe(s,0,0,0),8,'1 Golem : rien');
  pose(s,0,AL,3,1,0);eq(M.forceDe(s,0,0,0),10);eq(M.forceDe(s,0,1,0),5,'2 Golems : +2 chacun');
  pose(s,0,SF,1,2,0);eq(M.forceDe(s,0,0,0),8);eq(M.forceDe(s,0,1,0),4,'3 Golems : rien (Trait Roche seul)');eq(M.forceDe(s,0,2,0),2);
  s=nouv(['L\'Écran du MJ','Le Karaoké','La Boutique']);pose(s,0,KA,8,0,1);pose(s,0,AL,3,2,1);eq(M.forceDe(s,0,0,1),10,'cases non voisines : duo quand meme');pose(s,0,TR,1,0,0);eq(M.forceDe(s,0,0,0),2,'voisin d un autre terrain : rien de plus que son Trait');
  pose(s,1,AL,3,0,1);eq(M.forceDe(s,1,0,1),3+1,'adversaire seul : rien (cercle sur KaTarN en face)');pose(s,1,CY,1,1,1);eq(M.forceDe(s,1,0,1),3+1+1+1+2,'adversaire en duo : +2 (avec cercle, Cyrdan et Trait)');
  s=nouv(['Le Karaoké','L\'Écran du MJ','La Boutique']);pose(s,0,TI,1,0,0);pose(s,0,KI,0,1,0,{maitre:TI});eq(M.forceDe(s,0,0,0),1,'animal : pas un Golem');pose(s,0,AL,3,2,0);eq(M.forceDe(s,0,0,0),3);eq(M.forceDe(s,0,2,0),5,'Titom + Alrevan (Kiwi entre eux) : duo');
  eq(M.golemsIci(s,0,0),2);
  // decompte et statistiques : gagnant avec et sans le Karaoke
  s=nouv(['Le Karaoké','L\'Écran du MJ','La Boutique'],3);pose(s,0,KA,3,0,0);pose(s,0,AL,3,1,0);pose(s,1,AL,9,0,0);fm(s);
  eq(s.j[0].score,2,'duo 5 + 5 contre 9 : gagne');deq(s.stats.terr.cf,[{m:3,k:0,nom:'Le Karaoké',w:0,w0:1,c:[11,10],c0:[7,10],n:[2,1],duo:[1,0]}],'statistiques du Karaoke (cercle de part et d autre)');
  res.push('Karaoke');
}
{ // 4. Les Pronos : coup 't', 1 energie, une fois par manche, apres la Forge ; le gagnant marque 1 point par mise ; sans gagnant, perdues
  let s=nouv(['Les Pronos','L\'Écran du MJ','La Boutique']);s.j[0].energie=2;
  ok(M.legales(s,0).some(a=>a.t==='t'),'miser : propose');deq(M.legales(s,1),[],'pas a son tour');
  eq(M.code({t:'t'}),'t');deq(M.decode('t'),{t:'t'});assert.throws(()=>M.decode('t1'));nv++;
  M.applique(s,0,{t:'t'});eq(s.j[0].energie,1);deq(s.pronos,{m:1,mises:[1,0]});ok(!M.legales(s,0).some(a=>a.t==='t'),'une fois par manche');ok(log(s,/Les Pronos : mise 1 énergie\./));
  assert.throws(()=>M.applique(s,0,{t:'t'}));nv++;
  let u=nouv(['Les Pronos','L\'Écran du MJ','La Boutique']);ok(!M.legales(u,0).some(a=>a.t==='t'),'sans energie : non');
  u.j[0].energie=3;u.j[0].etapeForge=true;u.j[0].main=[40];ok(!M.legales(u,0).some(a=>a.t==='t'),'pendant la Forge : non');
  u=nouv(['L\'Écran du MJ','La Boutique','Le Camp']);u.j[0].energie=3;ok(!M.legales(u,0).some(a=>a.t==='t'),'sans Les Pronos : non');
  s.manche=2;ok(M.legales(s,0).some(a=>a.t==='t'),'nouvelle manche : a nouveau');eq(M.miseTotale(s),0,'mises remises a zero');M.applique(s,0,{t:'t'});deq(s.pronos,{m:2,mises:[1,0]});
  // fin de manche : mises des deux joueurs au gagnant
  s=nouv(['Les Pronos','L\'Écran du MJ','La Boutique'],3);pose(s,0,AL,5,0,0);s.j[0].energie=1;M.applique(s,0,{t:'t'});s.joueur=1;s.premier=0;s.tour=3;s.j[1].energie=1;M.applique(s,1,{t:'t'});
  deq(s.pronos,{m:3,mises:[1,1]});M.applique(s,1,{t:'x'});ok(s.fin);eq(s.j[0].score,1+2,'1 + 2 mises');eq(s.j[1].score,0);ok(log(s,/Les Pronos, 2 mises : \+2 points\./));
  deq(s.stats.terr.mises,[{m:3,mises:[1,1],w:0}]);
  s=nouv(['Les Pronos','L\'Écran du MJ','La Boutique'],3);pose(s,1,AL,5,0,0);s.pronos={m:3,mises:[1,0]};fm(s);eq(s.j[1].score,2,'la mise adverse va au gagnant');eq(s.j[0].score,0);
  s=nouv(['Les Pronos','L\'Écran du MJ','La Boutique'],3);pose(s,0,AL,5,0,0);pose(s,1,AL,5,0,0);s.pronos={m:3,mises:[1,1]};fm(s);eq(s.j[0].score+s.j[1].score,0,'egalite : mises perdues');
  ok(log(s,/Les Pronos : personne ne gagne, les mises sont perdues\./));deq(s.stats.terr.mises,[{m:3,mises:[1,1],w:null}]);
  s=nouv(['Les Pronos','L\'Écran du MJ','La Boutique'],3);pose(s,0,AL,5,0,0);s.pronos={m:2,mises:[1,1]};fm(s);eq(s.j[0].score,1,'mises d une manche passee : rien');
  // rejeu avec 't'
  {regle({force:'Les Pronos'});let n=0;for(let g=1;g<=40&&n<5;g++){const a=M.nouvelle(g,['','']),j=[[],[]];let pas=0;
    while(!a.fin){assert(++pas<3000);const p=M.attendus(a)[0],x=M.robot(a,p,g%2?'difficile':'normal');M.applique(a,p,x);j[p].push(M.code(x))}
    if(j[0].concat(j[1]).includes('t')){n++;const r=M.rejoue(g,j,['','']);eq(r.erreur,null);eq(JSON.stringify(r.etat),JSON.stringify(a),'rejeu avec mises')}}
   ok(n>=3,'le robot mise');regle()}
  // robot : mise en fin de tour s'il gagne ici de plus de 2 par tour adverse restant
  s=nouv(['Les Pronos','L\'Écran du MJ','La Boutique'],2);s.premier=1;s.joueur=0;s.tour=3;s.j[0].energie=1;pose(s,0,AL,4,0,0);pose(s,1,AL,3,0,0);
  deq(M.pronoRobot(s,0,M.legales(s,0)),{t:'t'},'dernier a jouer, devant : mise');deq(M.robot(s,0,'difficile'),{t:'t'});deq(M.robot(s,0,'normal'),{t:'t'});
  s.j[1].grille[0][0].f=6;eq(M.pronoRobot(s,0,M.legales(s,0)),null,'derriere : pas de mise');deq(M.robot(s,0,'difficile'),{t:'x'});
  s.j[1].grille[0][0].f=4;eq(M.pronoRobot(s,0,M.legales(s,0)),null,'egalite : pas de mise');
  s.j[1].grille[0][0].f=1;s.premier=0;s.tour=2;eq(M.pronoRobot(s,0,M.legales(s,0)),null,'2 tours adverses a venir, 3 devant : pas de mise');s.j[0].grille[0][0].f=9;deq(M.pronoRobot(s,0,M.legales(s,0)),{t:'t'},'8 devant : mise');
  // valeur pour le robot : 1 + mises
  s=nouv(['Les Pronos','L\'Écran du MJ','La Boutique']);eq(M.ptsRobot(s,0),1);s.pronos={m:1,mises:[1,1]};eq(M.ptsRobot(s,0),3);s.manche=2;eq(M.ptsRobot(s,0),1);
  res.push('Pronos');
}
{ regle({cirque:'inverse'}); // 5. ANCIEN Cirque (abandonne, reglage 'inverse') : la plus petite Force gagne ; ni Trait ni cercle ici ; les effets de cartes restent ; Trait donne aux voisins des autres terrains
  let s=nouv(['Le Cirque','L\'Écran du MJ','La Boutique']);pose(s,0,KA,8,0,0);pose(s,0,TR,1,0,1);pose(s,1,CY,1,0,0);pose(s,1,AL,3,1,0);
  eq(M.forceDe(s,0,0,0),8,'KaTarN : ni Trait (Trigas) ni cercle (Cyrdan en face)');eq(M.forceDe(s,0,0,1),2,'Trigas, hors du Cirque : Trait donne par KaTarN');
  eq(M.forceDe(s,1,0,0),1,'Cyrdan : ni cercle ni Trait');eq(M.forceDe(s,1,1,0),4,'Alrevan : +1 de Cyrdan (effet de carte), pas de Trait');
  deq(M.colonnes(s)[0],[8,5]);eq(M.gagnantColonne(s,0,[8,5]),1,'plus petite Force');
  s.terrains[0]=T('Le Camp');eq(M.forceDe(s,0,0,0),10,'ailleurs : Trait et cercle');eq(M.forceDe(s,1,1,0),5);s.terrains[0]=T('Le Cirque');
  // noteBonus : aucun Trait ni cercle explique au Cirque
  s.stats.ev=[];M.noteBonus(s);ok(!s.stats.ev.some(e=>e.t==='b'&&(e.y==='trait'||e.y==='cercle')&&e.p!==undefined&&s.j[e.p].grille[0][0]&&s.j[e.p].grille[0][0].c===e.r),'bilan : pas de Trait ni de cercle au Cirque');
  ok(s.stats.ev.some(e=>e.t==='b'&&e.y==='trait'&&e.r===TR),'bilan : Trigas recoit le Trait de KaTarN');ok(s.stats.ev.some(e=>e.t==='b'&&e.y==='voisins'&&e.r===AL),'bilan : Cyrdan donne +1');
  // cercle +2 (Vic222) : rien non plus
  s=nouv(['Le Cirque','L\'Écran du MJ','La Boutique']);pose(s,0,SF,1,0,0);pose(s,1,KA,8,0,0);eq(M.forceDe(s,0,0,0),1,'Counter-pick : pas de cercle au Cirque');
  s.terrains[0]=T('Le Camp');eq(M.forceDe(s,0,0,0),3,'ailleurs : +2');
  // gagnant : au moins 1 Golem, un seul camp, egalite, Golem hors decompte
  s=nouv(['Le Cirque','L\'Écran du MJ','La Boutique']);eq(M.gagnantColonne(s,0,[0,0]),null,'personne ici');pose(s,1,AL,6,0,0);eq(M.gagnantColonne(s,0,[0,6]),1,'seul camp avec un Golem : il gagne');
  pose(s,0,AL,6,0,0);eq(M.gagnantColonne(s,0,[6,6]),null,'egalite : personne');s.j[1].grille[0][0].hors=s.manche;eq(M.gagnantColonne(s,0,[6,0]),0,'Golem hors decompte (Mignonitude) : ne compte pas');
  eq(M.gagnantColonne({...s,terrains:[T('Le Camp'),T('Le Camp'),T('Le Camp')]},0,[6,0]),0,'ailleurs : la plus grande');
  // decompte complet et statistiques
  s=nouv(['Le Cirque','L\'Écran du MJ','La Boutique'],3);pose(s,0,KA,8,0,0);pose(s,1,CY,1,0,0);fm(s);eq(s.j[1].score,2,'Cyrdan 1 contre KaTarN 8 : Cyrdan gagne');eq(s.j[0].score,0);
  deq(s.stats.terr.cf,[{m:3,k:0,nom:'Le Cirque',w:1,w0:0,c:[8,1],c0:[9,2],n:[1,1],duo:[0,0]}]);ok(log(s,/marque Le Cirque \(1 contre 8\) : \+2\./));deq(s.stats.t[0].gagnant,1);
  s=nouv(['Le Cirque','L\'Écran du MJ','La Boutique'],3);pose(s,0,KA,8,0,0);fm(s);eq(s.j[0].score,2,'seul Golem ici : gagne');
  // robot : ecart inverse
  s=nouv(['Le Cirque','L\'Écran du MJ','La Boutique']);eq(M.ecart(s,[0,0],0,0),0);pose(s,0,AL,3,0,0);eq(M.ecart(s,[3,0],0,0),3);eq(M.ecart(s,[3,0],0,1),-3);pose(s,1,AL,5,0,0);eq(M.ecart(s,[3,5],0,0),2);eq(M.ecart(s,[3,5],0,1),-2);
  eq(M.ecart(s,[3,5],1,0),-2,'autre terrain : ecart normal');
  // robot : contre un Golem adverse de 5 au Cirque, pose Cyrdan (1) ici ; KaTarN (8) jamais ici
  s=nouv(['Le Cirque','La Faille','La Boutique']);s.j[0].energie=9;s.j[0].main=[KA,CY];pose(s,1,AL,5,0,0);
  let a=M.robot(s,0,'difficile');ok(a.t==='p'&&a.k===0&&a.c===CY,'robot : Cyrdan (1) au Cirque, '+JSON.stringify(a));
  s.j[0].main=[KA];a=M.robot(s,0,'difficile');ok(a.t==='p'&&a.c===KA&&a.k!==0,'robot : KaTarN (8) ailleurs, '+JSON.stringify(a));
  // variantes de departage (reglage, jamais par defaut) : V1 le moins de Golems ici, V2 le premier a poser un Golem ici dans la manche
  s=nouv(['Le Cirque','La Faille','La Boutique']);pose(s,0,AL,2,0,0);pose(s,0,AL,2,2,0);pose(s,1,AL,4,0,0);
  eq(M.gagnantColonne(s,0,[4,4]),null,'defaut : egalite, personne');
  regle({cirque:'moins'});eq(M.gagnantColonne(s,0,[4,4]),1,'V1 : 1 Golem contre 2');eq(M.ecart(s,[4,4],0,1),1);eq(M.ecart(s,[4,4],0,0),-1);
  pose(s,1,AL,1,1,0);eq(M.gagnantColonne(s,0,[4,4]),null,'V1 : autant de Golems, personne');eq(M.gagnantColonne(s,0,[3,4]),0,'Forces differentes : la plus faible');
  regle({cirque:'premier'});eq(M.gagnantColonne(s,0,[4,4]),null,'V2 : personne n a pose ici cette manche');
  s=nouv(['Le Cirque','La Faille','La Boutique']);s.j[0].energie=9;s.j[0].main=[CY];pose(s,1,AL,1,1,0);
  M.applique(s,0,{t:'p',c:CY,l:0,k:0});deq(s.cirqueP,{m:1,p:0},'premier Golem pose ici');s.joueur=1;s.j[1].energie=9;s.j[1].main=[CY+1];M.applique(s,1,{t:'p',c:CY+1,l:0,k:0});deq(s.cirqueP,{m:1,p:0},'le second ne change rien');
  eq(M.gagnantColonne(s,0,[1,2]),0);eq(M.gagnantColonne(s,0,[2,2]),0,'V2 : egalite, le premier poseur gagne');s.manche=2;eq(M.gagnantColonne(s,0,[2,2]),null,'V2 : manche suivante, a refaire');
  s=nouv(['La Faille','Le Cirque','La Boutique']);s.j[0].energie=9;s.j[0].main=[CY];M.applique(s,0,{t:'p',c:CY,l:0,k:0});ok(!s.cirqueP,'pose hors du Cirque : rien');
  regle({cirque:'inverse'});s=nouv(['Le Cirque','La Faille','La Boutique']);s.j[0].energie=9;s.j[0].main=[CY];M.applique(s,0,{t:'p',c:CY,l:0,k:0});ok(!('cirqueP' in s),'inverse : aucun champ nouveau dans l etat');
  for(const v of ['moins','premier']){regle({cirque:v,force:'Le Cirque'});for(let g=1;g<=20;g++){const a=M.nouvelle(g,['','']),j=[[],[]];let pas=0;
    while(!a.fin){assert(++pas<3000);const p=M.attendus(a)[0],x=M.robot(a,p,'difficile');M.applique(a,p,x);j[p].push(M.code(x))}
    const r=M.rejoue(g,j,['','']);eq(r.erreur,null);eq(JSON.stringify(r.etat),JSON.stringify(a),'rejeu variante '+v)}}
  regle();
  res.push('Cirque');
}
{ // 6. Le Tournoi : 1, 2, 3 points ; Roi du Karaoke (terrain qui rapporte le moins) ; robot
  for(const m of [1,2,3]){const s=nouv(['Le Tournoi','L\'Écran du MJ','La Boutique'],m);pose(s,0,AL,5,0,0);fm(s);eq(s.j[0].score,m,'manche '+m);eq(s.stats.t.find(x=>x.terrain==='Le Tournoi').points,m);eq(M.ptsTerrain(s,0),m===3?3:m+1)}
  let s=nouv(['Le Tournoi','La Boutique','La Faille'],1);pose(s,0,RK,2,0,0);fm(s);eq(s.j[0].score,1+2,'manche 1 : le Tournoi (1) rapporte le moins, Palmares +2');
  s=nouv(['Le Tournoi','La Boutique','La Faille'],3);pose(s,0,RK,2,0,0);fm(s);eq(s.j[0].score,3,'manche 3 : le Tournoi (3) ne rapporte plus le moins');
  s=nouv(['Le Tournoi','La Boutique','Le Camp'],2);pose(s,0,RK,2,0,0);fm(s);eq(s.j[0].score,2,'manche 2 : 2 contre Le Camp (1) : pas de Palmares');
  s=nouv(['Le Tournoi','L\'Écran du MJ','La Boutique']);eq(M.ptsRobot(s,0),1);s.manche=3;eq(M.ptsRobot(s,0),3);pose(s,0,AL,5,0,0);s.fort=true;
  const v3=M.valeur(s,0);s.manche=1;ok(v3-M.valeur(s,0)>1.9,'robot : le Tournoi vaut 3 a la manche 3');
  res.push('Tournoi');
}
{ // 7. robot et L'Ecole : point de deck vide
  const s=nouv(['L\'École','L\'Écran du MJ','La Boutique']);s.fort=true;pose(s,0,AL,5,0,0);const v=M.valeur(s,0);s.j[1].deck=[];eq(Math.round((M.valeur(s,0)-v)*100),100,'adversaire perdant au deck vide : +1');
  s.j[1].deck=[1,2];pose(s,1,AL,9,0,0);s.j[0].deck=[];const w=M.valeur(s,0);s.j[0].deck=[1];eq(Math.round((M.valeur(s,0)-w)*100),100,'perdant au deck vide : -1');
  res.push('robot Ecole');
}
{ // 8. parties completes, chaque nouveau terrain force, 4 niveaux : rejeu identique, cartes conservees, aucun blocage
  const POOL=['001','002','003','004','007','008','013','009','029','037','026','036','018','041','025','015','016','035','042','020']; /* sans Cyd (le vol de l'evolution deplace des cartes d'un camp a l'autre) */
  const EVO={};M.TYPES.forEach(t=>{const b=M.CARTES[t].base;if(b)EVO[b]=t});
  let r=4242;const rnd=()=>{r=(r+0x6D2B79F5)|0;let t=r;t=Math.imul(t^(t>>>15),t|1);t^=t+Math.imul(t^(t>>>7),t|61);return ((t^(t>>>14))>>>0)/4294967296};
  const deck=()=>{for(;;){const g=POOL.slice().sort(()=>rnd()-.5).slice(0,5),o={};g.forEach(x=>{o[x]=3;if(EVO[x])o[EVO[x]]=3});let n=Object.values(o).reduce((a,b)=>a+b,0);
    for(const k of Object.keys(o)){while(n>30&&o[k]>1){o[k]--;n--}}if(!M.erreurDeck(o))return M.deckTexte(o)}};
  const niv=['aleatoire','facile','normal','difficile'],C={parties:0,mises:0,ecole:0,cf:0,duo:0,cirque:0};
  for(const f of NOUV){regle({force:f});
    for(let i=0;i<60;i++){const gr=(i*2654435761+f.length*977)|0,dk=[deck(),deck()],v=niv[i%4],s=M.nouvelle(gr,dk),j=[[],[]];let pas=0,h=gr|1;const hz=n=>{h=(Math.imul(h,1103515245)+12345)|0;return (h>>>8)%n};
      ok(s.terrains.some(x=>x.nom===f),'terrain force');
      while(!s.fin){assert(++pas<3000,'blocage '+gr);const p=M.attendus(s)[0];let a;if(v==='aleatoire'){const l=M.legales(s,p);a=l[hz(l.length)]}else a=M.robot(s,p,v);M.applique(s,p,a);j[p].push(M.code(a));
        s.j.forEach((J,q)=>{const vu=[...J.deck,...J.main,...J.defausse,...J.forge];J.grille.forEach(L=>L.forEach(g=>{if(g)vu.push(g.c)}));const n=Object.values(M.lisDeck(dk[q])).reduce((a,b)=>a+b,0);
          if(new Set(vu).size!==n||vu.length!==n)throw new Error('cartes perdues ou doublees '+gr)});
        ok(s.j[0].energie>=0&&s.j[1].energie>=0,'energie jamais negative')}
      const z=M.rejoue(gr,j,dk);eq(z.erreur,null);eq(JSON.stringify(z.etat),JSON.stringify(s),'rejeu identique '+f+' '+gr);
      deq(s.fin.scores,[s.j[0].score,s.j[1].score]);M.bilan(s);
      C.parties++;C.mises+=j.flat().filter(x=>x==='t').length;const Tt=s.stats.terr;if(Tt){C.ecole+=Tt.ecole.length;C.cf+=Tt.cf.length;C.duo+=Tt.cf.filter(x=>x.nom==='Le Karaoké'&&(x.duo[0]||x.duo[1])).length;C.cirque+=Tt.cf.filter(x=>x.nom==='Le Cirque'&&x.w!==x.w0).length}}}
  regle();ok(C.mises>0&&C.ecole>0&&C.duo>0&&C.cirque>0,'chaque effet sert : '+JSON.stringify(C));
  res.push('parties '+JSON.stringify(C));
}
{ // 9. Le Cirque refait : « Une fois par manche : un Golem adverse ici perd X de Force. » (tarte, coup 'o')
  const RM=27,GY=42,BG=111,o=(s,p)=>M.legales(s,p).filter(a=>a.t==='o');
  regle();let s=nouv(['Le Cirque','La Faille','La Boutique']);eq(M.REGLAGE_TERRAINS.cirque,'tarte','defaut : T1');eq(M.tarteX(s),1);
  deq(o(s,0),[],'aucun Golem adverse ici : pas de tarte');pose(s,0,AL,3,0,0);deq(o(s,0),[],'ses propres Golems : jamais');
  pose(s,1,AL,3,0,0);pose(s,1,KI,0,1,0,{maitre:TI});pose(s,1,TI,1,2,0);pose(s,1,KA,8,0,1);
  deq(o(s,0),[{t:'o',l:0},{t:'o',l:2}],'Golems adverses ici seulement (ni animal, ni autre terrain)');deq(o(s,1),[],'pas a son tour');
  eq(M.code({t:'o',l:2}),'o2');deq(M.decode('o1'),{t:'o',l:1});assert.throws(()=>M.decode('o3'));assert.throws(()=>M.decode('o'));nv+=2;
  s.j[0].etapeForge=true;s.j[0].main=[40];deq(o(s,0),[],'pendant la Forge : non');s.j[0].etapeForge=false;s.j[0].main=[];
  {const u=nouv(['Le Cirque','La Faille','La Boutique']);pose(u,0,KA,8,0,0);pose(u,0,TR,1,1,0);eq(M.forceDe(u,0,0,0),9,'nouveau Cirque : Trait');pose(u,1,CY,1,0,0);eq(M.forceDe(u,0,0,0),10,'et cercle, comme ailleurs')}eq(M.gagnantColonne(s,0,[5,3]),0,'la plus grande Force gagne');
  M.applique(s,0,{t:'o',l:0});eq(s.j[1].grille[0][0].d,1,'perd 1 de Force (degat)');eq(s.j[1].grille[0][0].tt,1);eq(s.j[0].tarte,1);deq(o(s,0),[],'une fois par manche');
  assert.throws(()=>M.applique(s,0,{t:'o',l:2}));nv++;ok(log(s,/Le Cirque : tarte sur Alrevan \(adverse\), 1 dégât./));
  deq(s.stats.terr.tartes,[{m:1,p:0,l:0,x:1,eff:1,mort:0,f:4}],'tarte : Alrevan a 4 (cercle) avant');
  s.manche=2;eq(o(s,0).length,2,'nouvelle manche : a nouveau');eq(s.j[1].grille[0][0].d,1,'perte definitive');M.applique(s,0,{t:'o',l:2});
  ok(!s.j[1].grille[2][0],'Titom76 a 0 : meurt');ok(s.j[1].defausse.includes(TI),'a la defausse');ok(!s.j[1].grille[1][0],'Kiwi suit son maitre');eq(s.stats.terr.tartes[1].mort,1);
  ok(M.bilan(s).autres.some(x=>x.source==='Le Cirque'&&x.morts>=1),'bilan : source Le Cirque');
  // tarte non utilisee : perdue en fin de manche (une seule a la manche suivante)
  s=nouv(['Le Cirque','La Faille','La Boutique']);pose(s,1,AL,5,0,0);pose(s,1,AL,5,1,0);s.manche=2;M.applique(s,0,{t:'o',l:0});deq(o(s,0),[],'pas de tarte en reserve');
  // T2 : X = numero de la manche
  regle({cirque:'tarte_manche'});for(const m of [1,2,3]){const u=nouv(['Le Cirque','La Faille','La Boutique'],m);pose(u,1,AL,9,0,0);eq(M.tarteX(u),m);M.applique(u,0,{t:'o',l:0});eq(u.j[1].grille[0][0].d,m,'T2 : manche '+m)}
  // protections
  regle();s=nouv(['Le Cirque','La Faille','La Boutique']);pose(s,1,RM,4,0,0);pose(s,1,GY,3,1,0);pose(s,1,BG,4,2,0);
  deq(o(s,0),[{t:'o',l:1},{t:'o',l:2}],'Mode Avion : pas une cible');M.applique(s,0,{t:'o',l:1});eq(s.j[1].grille[1][0].d,0,'GymRat : Menfou palu');ok(log(s,/Menfou palu/));eq(s.stats.terr.tartes[0].eff,0);
  s.manche=2;M.applique(s,0,{t:'o',l:2});eq(s.j[1].grille[2][0].d,0,'Chance du debutant');eq(s.j[1].grille[2][0].cdb,1);s.manche=3;M.applique(s,0,{t:'o',l:2});eq(s.j[1].grille[2][0].d,1,'Chance du debutant deja utilisee');
  // ancien Cirque et sans Cirque : aucune tarte
  for(const v of ['inverse','moins','premier']){regle({cirque:v});const u=nouv(['Le Cirque','La Faille','La Boutique']);pose(u,1,AL,5,0,0);deq(o(u,0),[],'ancien Cirque ('+v+') : pas de tarte');eq(M.tarteX(u),0)}
  regle();{const u=nouv(['La Faille','Le Camp','La Boutique']);pose(u,1,AL,5,0,0);deq(o(u,0),[],'sans Cirque : rien')}
  // fin de manche : la tarte fait basculer le terrain ; statistiques
  s=nouv(['Le Cirque','La Faille','La Boutique'],3);pose(s,0,AL,3,0,0);pose(s,1,AL,3,0,0);M.applique(s,0,{t:'o',l:0});fm(s);eq(s.j[0].score,2,'4 contre 3 apres la tarte');
  deq(s.stats.terr.cf,[{m:3,k:0,nom:'Le Cirque',w:0,w0:null,c:[4,3],c0:[4,4],n:[1,1],duo:[0,0],t:1}],'sans la tarte : egalite (cercle de part et d autre)');
  s=nouv(['Le Cirque','La Faille','La Boutique'],3);pose(s,0,AL,1,0,0);pose(s,1,AL,1,0,0);M.applique(s,0,{t:'o',l:0});fm(s);eq(s.j[0].score,2,'tarte : 2 contre 1');
  eq(s.stats.terr.cf[0].w0,null,'degat rendu : egalite');s=nouv(['Le Cirque','La Faille','La Boutique'],3);pose(s,0,KA,8,0,0);pose(s,1,TR,1,0,0);M.applique(s,0,{t:'o',l:0});fm(s);eq(s.stats.terr.tartes[0].mort,1,'Trigas tue');deq(s.stats.terr.cf[0].c0,[8,1],'Golem tue rendu avec sa Force d avant (KaTarN perd son cercle)');
  // robot : vise le Golem qu'il peut tuer ; utilise la tarte des qu'elle sert
  s=nouv(['Le Cirque','La Faille','La Boutique']);pose(s,1,KA,8,0,0);pose(s,1,TR,1,2,0);
  deq(M.robot(s,0,'difficile'),{t:'o',l:2},'difficile : tue Trigas');deq(M.robot(s,0,'normal'),{t:'o',l:2},'normal : tue Trigas');
  s=nouv(['Le Cirque','La Faille','La Boutique']);pose(s,0,AL,5,0,0);pose(s,1,AL,5,0,0);pose(s,1,AL,5,0,1);deq(M.robot(s,0,'difficile'),{t:'o',l:0},'egalite au Cirque : la tarte le fait basculer');
  // parties completes avec tarte, T1 et T2 : rejeu identique
  let nt=0,nm=0;for(const v of ['tarte','tarte_manche']){regle({cirque:v,force:'Le Cirque'});for(let g=1;g<=40;g++){const a=M.nouvelle(g,['','']),j=[[],[]];let pas=0;
    while(!a.fin){assert(++pas<3000);const p=M.attendus(a)[0],x=M.robot(a,p,['facile','normal','difficile'][g%3]);M.applique(a,p,x);j[p].push(M.code(x))}
    const r=M.rejoue(g,j,['','']);eq(r.erreur,null);eq(JSON.stringify(r.etat),JSON.stringify(a),'rejeu tarte '+v);M.bilan(a);
    nt+=j.flat().filter(x=>/^o/.test(x)).length;nm+=a.stats.terr?a.stats.terr.tartes.filter(x=>x.mort).length:0}}
  ok(nt>100&&nm>0,'tartes jouees '+nt+', morts '+nm);regle();
  res.push('Cirque refait ('+nt+' tartes, '+nm+' morts en parties robot)');
}
{ // 10. T-016 Le Versus : un seul Golem par joueur ici ; a chaque pose ici, le Golem adverse ici perd 1 de Force
  const RM=27,GY=42,BG=111,GL=39,SL=24,SK=3,AE=90,AEE=93,EVK=24;
  eq(T('Le Versus').pts,3);eq(T('Le Versus').texte,'Un seul Golem par joueur ici. Quand tu en poses un, le Golem adverse ici perd 1 de Force.');eq(T('Le Versus').cit,'Un nouveau challenger arrive !');
  const P=(s,p,c)=>M.legales(s,p).filter(a=>a.t==='p'&&a.c===c).map(a=>a.l*3+a.k);
  let s=nouv(['Le Versus','La Faille','La Boutique']);s.j[0].energie=20;s.j[0].main=[AL,CY,KA,TR+1];
  ok(P(s,0,AL).includes(0)&&P(s,0,AL).includes(3)&&P(s,0,AL).includes(6),'colonne vide : 3 cases');
  pose(s,0,TR,1,1,0);deq(P(s,0,AL).filter(x=>x%3===0),[3],'deja un Golem ici : seulement le remplacer');
  s.j[0].main.push(27);ok(P(s,0,27).includes(3),'evolution sur place (Roi du Mobile sur Trigas)');
  pose(s,0,TI,1,0,1);s.j[0].main.push(KI);deq(P(s,0,KI),[1],'animal (0.5) : seulement sous son maitre, jamais sur une case');
  // pose : le Golem adverse ici perd 1 ; pas de Golem adverse : rien
  s=nouv(['Le Versus','La Faille','La Boutique']);s.j[0].energie=20;s.j[0].main=[AL,CY];pose(s,1,AL,5,2,0);
  M.applique(s,0,{t:'p',c:CY,l:0,k:0});eq(s.j[1].grille[2][0].d,1,'pose : -1 au Golem adverse ici');ok(log(s,/Le Versus : Alrevan \(adverse\) perd 1 de Force\./));
  deq(s.stats.terr.versus,[{m:1,p:0,y:'poser',eff:1,mort:0}]);
  M.applique(s,0,{t:'p',c:AL,l:0,k:0});eq(s.j[1].grille[2][0].d,2,'remplacement : -1 encore');eq(s.stats.terr.versus[1].y,'remplacer');ok(s.j[0].defausse.includes(CY),'Cyrdan remplace');
  s=nouv(['Le Versus','La Faille','La Boutique']);s.j[0].energie=20;s.j[0].main=[CY];M.applique(s,0,{t:'p',c:CY,l:1,k:0});eq(s.stats.terr.versus[0].vide,1,'pas de Golem adverse : rien');
  // evolution sur place, mort, ordre (avant l'effet de pose)
  s=nouv(['Le Versus','La Faille','La Boutique']);s.j[0].energie=20;pose(s,0,TR,1,0,0);s.j[0].main=[27];pose(s,1,TR,1,1,0);
  M.applique(s,0,{t:'p',c:27,l:0,k:0});ok(!s.j[1].grille[1][0],'evolution : Trigas adverse (1) meurt');eq(s.stats.terr.versus[0].y,'evoluer');eq(s.stats.terr.versus[0].mort,1);ok(s.j[1].defausse.includes(TR));
  // protections
  for(const [c,m,d] of [[RM,'Mode Avion',0],[GY,'GymRat',0],[BG,'Chance du debutant',0]]){const u=nouv(['Le Versus','La Faille','La Boutique']);u.j[0].energie=9;u.j[0].main=[CY];pose(u,1,c,4,0,0);
    M.applique(u,0,{t:'p',c:CY,l:2,k:0});eq(u.j[1].grille[0][0].d,d,m+' protege');eq(u.stats.terr.versus[0].eff,0)}
  {const u=nouv(['Le Versus','La Faille','La Boutique']);u.j[0].energie=9;u.j[0].main=[CY,AL];pose(u,1,BG,4,0,0);M.applique(u,0,{t:'p',c:CY,l:2,k:0});M.applique(u,0,{t:'p',c:AL,l:2,k:0});eq(u.j[1].grille[0][0].d,1,'Chance du debutant deja utilisee')}
  // Slam (Glad, 39) : pas de 2e Golem adverse ici ; La Faille ne vient jamais ici
  s=nouv(['La Boutique','Le Versus','La Faille']);s.j[0].energie=9;pose(s,1,AL,5,0,1);pose(s,1,AL,5,1,0);
  ok(!M.slams(s,0).some(([l,k,m,n])=>n===1&&k!==1),'Slam : jamais un 2e Golem adverse dans le Versus');ok(M.slams(s,0).some(([l,k,m,n])=>l===1&&k===0&&m===2&&n===0),'Slam ailleurs : permis');
  s.j[1].grille[0][1]=null;ok(M.slams(s,0).some(([l,k,m,n])=>l===1&&k===0&&m===1&&n===1),'Versus vide cote adverse : Slam peut y amener un Golem');
  // gagnant : la plus grande Force ; robot
  s=nouv(['Le Versus','La Faille','La Boutique'],3);pose(s,0,AL,4,0,0);pose(s,1,AL,3,1,0);fm(s);eq(s.j[0].score,3,'plus grande Force : 3 points');deq(s.stats.terr.vs,[{m:3,w:0,d:null,c:[4,3]}],'gagnant, dernier poseur, Forces');
  s=nouv(['Le Versus','La Faille','La Boutique'],3);s.j[0].energie=9;s.j[0].main=[CY];pose(s,1,AL,5,1,0);M.applique(s,0,{t:'p',c:CY,l:0,k:0});fm(s);eq(s.stats.terr.vs[0].d,0,'dernier poseur ici');eq(s.stats.terr.vs[0].w,1);
  s=nouv(['Le Versus','La Faille','La Boutique']);s.j[0].energie=9;s.j[0].main=[CY];pose(s,1,TR,1,0,0);pose(s,1,AL,9,0,1);pose(s,1,AL,9,0,2);
  const a=M.robot(s,0,'difficile');ok(a.t==='p'&&a.k===0,'robot : pose au Versus, Trigas adverse meurt, '+JSON.stringify(a));
  // parties completes Versus force (4 niveaux) et tirage parmi 16 : rejeux identiques, jamais 2 Golems d'un joueur ici
  let n2=0,np=0;for(const f of ['Le Versus',null]){regle({force:f});for(let g=1;g<=60;g++){const u=M.nouvelle(g,['','']),j=[[],[]];let pas=0,h=g|1;const hz=n=>{h=(Math.imul(h,1103515245)+12345)|0;return (h>>>8)%n};
    const kv=u.terrains.findIndex(x=>x.nom==='Le Versus');
    while(!u.fin){assert(++pas<3000);const p=M.attendus(u)[0];let x;if(g%4===0){const l=M.legales(u,p);x=l[hz(l.length)]}else x=M.robot(u,p,['facile','normal','difficile'][g%3]);M.applique(u,p,x);j[p].push(M.code(x));
      if(kv>=0)for(let q=0;q<2;q++)if(M.golemsIci(u,q,kv)>1)n2++}
    const r=M.rejoue(g,j,['','']);eq(r.erreur,null);eq(JSON.stringify(r.etat),JSON.stringify(u),'rejeu Versus');M.bilan(u);if(u.stats.terr)np+=(u.stats.terr.versus||[]).length}}
  eq(n2,0,'jamais 2 Golems d un joueur au Versus');ok(np>100,'poses au Versus : '+np);regle();
  res.push('Versus ('+np+' poses en parties)');
}
console.log('Terrains OK : '+nv+' verifications ('+res.join(', ')+')');
