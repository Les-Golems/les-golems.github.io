// Animaux jouables (REGLAGE_ANIMAUX). Node : node tests/test_animaux.js ; Chrome : harnais_animaux.html
const M=require('../moteur.js'),assert=require('assert');
let nv=0;const ok=(c,m)=>{assert(c,m||'ok');nv++},eq=(a,b,m)=>{assert.strictEqual(a,b,m||'eq');nv++},deq=(a,b,m)=>{assert.deepStrictEqual(a,b,m||'deq');nv++};
const T=n=>({...M.TERRAINS.find(x=>x.nom===n)});
/* ids : KaTarN 0 (magma foudre), Alrevan 6 (brume roche), Cyrdan 12 (cristal roche), Trigas 24 (foudre brume), K-Chan 30 (magma cristal), Titom76 57 (brume foudre),
   Kiwi 69 (animal de Titom76), Monsieur Poisson 54 (roche cristal), Jacen et Jaina 123 (animal de KaTarN) */
const KA=0,AL=6,CY=12,TR=24,KC=30,MP=54,TI=57,KI=69,JJ=123;
const res=[];
const nouv=(noms)=>{const s=M.nouvelle(5,['','']);s.phase='jeu';s.mull=[true,true];s.premier=0;s.tour=1;s.joueur=0;s.manche=1;
  s.j.forEach((J,p)=>{J.etapeForge=false;J.main=[];J.energie=0;J.deck=[90+p,91+p,92+p,93+p];J.defausse=[];J.forge=[];J.score=0;J.grille=[[null,null,null],[null,null,null],[null,null,null]]});
  s.terrains=(noms||['La Boutique','L\'Écran du MJ','Le Camp']).map(T);return s};
const pose=(s,p,c,f,l,k,o={})=>{s.j[p].grille[l][k]={c,f,d:0,...o}};
const ANC={cout:1,element:false,kiwiApres:false,attache:false},NOU={cout:0,element:true,kiwiApres:false,attache:false},regle=o=>Object.assign(M.REGLAGE_ANIMAUX,o);
/* 0.4a/0.5 : reglage par defaut du site = animal attache, Kiwi apres le decompte, cout 0 ; les blocs ci-dessous partent de l'ancien reglage */
const DEF={...M.REGLAGE_ANIMAUX};assert.deepStrictEqual(DEF,{cout:0,element:false,kiwiApres:true,attache:true},'defaut du site');regle(ANC);
{ // 0. reglage par defaut = ancien comportement ; elements
  deq({...M.REGLAGE_ANIMAUX},ANC,'ancien reglage');eq(M.CARTES['901'].cout,0,'cout imprime 0 (0.5)');eq(M.CARTES['902'].cout,0);
  eq(M.carte(KI).id,'901');eq(M.carte(JJ).id,'902');deq(M.CARTES['026'].el,['brume','foudre']);deq(M.CARTES['001'].el,['magma','foudre']);
  eq(M.elAnimal(M.CARTES['901']),null,'ancien : pas d element');regle(NOU);eq(M.elAnimal(M.CARTES['901']),'brume','Kiwi : Brume (Titom76)');eq(M.elAnimal(M.CARTES['902']),'magma','Jacen et Jaina : Magma (KaTarN)');
  eq(M.coutCarte(M.CARTES['901']),0);eq(M.coutCarte(M.CARTES['026']),2,'Golem inchange');regle(ANC);eq(M.coutCarte(M.CARTES['901']),1);
  res.push('reglage');
}
{ // 1. cout : 1 (ancien) ou 0 (nouveau), toujours a cote du maitre, jamais reduit par La Boutique
  let s=nouv();pose(s,0,TI,1,1,1);s.j[0].main=[KI];
  eq(M.legales(s,0).filter(a=>a.t==='p').length,0,'ancien : 0 energie, pas de Kiwi');regle(NOU);eq(M.legales(s,0).filter(a=>a.t==='p').length,4,'nouveau : 4 cases voisines du maitre, a 0');
  M.applique(s,0,{t:'p',c:KI,l:0,k:1});eq(s.j[0].energie,0);eq(s.j[0].grille[0][1].maitre,TI);
  s=nouv();s.j[0].main=[KI];eq(M.legales(s,0).filter(a=>a.t==='p').length,0,'sans maitre en jeu : jamais');
  s=nouv(['La Boutique','La Faille','Le Camp']);pose(s,0,TI,1,1,1);s.j[0].main=[KI];M.applique(s,0,{t:'p',c:KI,l:1,k:0});ok(!s.stats.act.some(x=>/Coût réduit/.test(x.e)),'La Boutique ne reduit pas un animal (0)');
  regle(ANC);s=nouv(['La Boutique','La Faille','Le Camp']);pose(s,0,TI,1,1,1);s.j[0].main=[KI];s.j[0].energie=1;M.applique(s,0,{t:'p',c:KI,l:1,k:0});eq(s.j[0].energie,0,'ancien : 1, sans reduction');ok(!s.stats.act.some(x=>/Coût réduit/.test(x.e)));
  res.push('cout');
}
{ // 2. Trait : l'animal porte l'element principal de son maitre, +1 a chaque Golem allie voisin qui le partage ; il ne recoit rien
  regle(NOU);let s=nouv();pose(s,0,TI,1,1,1);pose(s,0,KI,0,0,1,{maitre:TI});pose(s,0,AL,3,0,0);pose(s,0,KA,8,0,2);
  eq(M.forceDe(s,0,0,0),3+1,'Alrevan (Brume) voisin de Kiwi : +1');eq(M.forceDe(s,0,0,2),8,'KaTarN (Magma, Foudre) : rien');eq(M.forceDe(s,0,1,1),1+1,'Titom76 (Brume) voisin de Kiwi : +1');eq(M.forceDe(s,0,0,1),0,'Kiwi : pas de Force');
  regle(ANC);eq(M.forceDe(s,0,0,0),3,'ancien : rien');eq(M.forceDe(s,0,1,1),1);regle(NOU);
  // cumule avec le Trait habituel ; plusieurs Golems ; Jacen et Jaina en Magma
  s=nouv();pose(s,0,KA,8,1,1);pose(s,0,JJ,0,1,0,{maitre:KA});pose(s,0,KC,2,0,0);pose(s,0,KC+1,2,2,0);
  eq(M.forceDe(s,0,0,0),2+1,'K-Chan (Magma) voisin de Jacen et Jaina : +1');eq(M.forceDe(s,0,2,0),2+1);eq(M.forceDe(s,0,1,1),8+1,'KaTarN (Magma) voisin : +1');
  pose(s,0,TR,1,0,1);eq(M.forceDe(s,0,1,1),8+1+1,'KaTarN : +1 de Trigas (Foudre) et +1 de l animal');
  // pas un Golem pour les effets : Full synergie, Karaoke, cercle, voisins de Cyrdan
  s=nouv(['Le Karaoké','La Faille','Le Camp']);pose(s,0,TI,1,0,0);pose(s,0,KI,0,1,0,{maitre:TI});eq(M.golemsIci(s,0,0),1,'Karaoke : pas un Golem');eq(M.forceDe(s,0,0,0),1+1,'Titom76 : +1 de Kiwi, pas de duo');
  s=nouv();pose(s,0,MP,2,1,1);pose(s,0,KI,0,0,1,{maitre:TI});pose(s,0,TI,1,0,0);eq(M.forceDe(s,0,1,1),2,'Monsieur Poisson (Roche, Cristal) : ni Trait ni Full synergie par Kiwi');
  s=nouv();pose(s,0,AL,3,0,0);pose(s,1,KI,0,0,0,{maitre:TI});eq(M.forceDe(s,0,0,0),3,'animal en face : pas de cercle');
  s=nouv();pose(s,1,TI,1,1,1);pose(s,1,KI,0,0,1,{maitre:TI});pose(s,0,TR,1,0,0);eq(M.forceDe(s,0,0,0),1,'animal adverse voisin : rien');
  // Cirque a Force inversee (reglage) : pas de Trait, rien de l'animal
  M.REGLAGE_TERRAINS.cirque='inverse';s=nouv(['Le Cirque','La Faille','Le Camp']);pose(s,0,AL,3,0,0);pose(s,0,TI,1,1,1);pose(s,0,KI,0,0,1,{maitre:TI});eq(M.forceDe(s,0,0,0),3,'ancien Cirque : pas de Trait');M.REGLAGE_TERRAINS.cirque='tarte';
  // bilan : Trait donne par l'animal, jamais MVP
  s=nouv();pose(s,0,TI,1,1,1);pose(s,0,KI,0,0,1,{maitre:TI});pose(s,0,AL,3,0,0);s.stats.ev=[];M.noteBonus(s);
  eq(s.stats.ev.filter(e=>e.t==='b'&&e.y==='trait'&&e.d===KI).length,2,'bilan : Kiwi donne 2 Trait (Alrevan, Titom76)');
  res.push('Trait');
}
{ // 3. robot : pose l'animal a 0 la ou il donne du Trait ; ne le forge plus en premier
  regle(NOU);let s=nouv();pose(s,0,KA,8,1,1);pose(s,0,KC,2,0,0);pose(s,1,AL,2,0,0);s.j[0].main=[JJ];s.j[0].deck=Array.from({length:20},(_,i)=>60+i);
  let a=M.robot(s,0,'difficile');ok(a.t==='p'&&a.c===JJ&&a.l===0&&a.k===1,'robot : Jacen et Jaina entre K-Chan et KaTarN, '+JSON.stringify(a));
  regle(ANC);s.j[0].energie=0;deq(M.robot(s,0,'difficile'),{t:'x'},'ancien : pas d energie, rien');regle(NOU);
  // Kiwi : pose quand son Trait compense Mignonitude (adversaire avec des Golems)
  s=nouv();pose(s,0,TI,1,1,1);pose(s,0,AL,3,0,0);pose(s,1,AL,3,0,0);pose(s,1,AL,3,1,1);pose(s,1,AL,3,2,2);s.j[0].main=[KI];
  a=M.robot(s,0,'difficile');ok(a.t==='p'&&a.c===KI&&a.l===0&&a.k===1,'robot : Kiwi entre Alrevan et Titom76, '+JSON.stringify(a));
  s=nouv();pose(s,0,TI,1,1,1);s.j[0].main=[KI,AL,CY];s.j[0].etapeForge=true;const f=M.robot(s,0,'difficile');ok(f.t==='f'&&f.c!==KI,'Forge : pas l animal (maitre en jeu)');
  regle(ANC);s=nouv();pose(s,0,TI,1,1,1);s.j[0].main=[KI,AL,CY];s.j[0].etapeForge=true;eq(M.robot(s,0,'difficile').c,KI,'ancien : l animal se forge en premier (comme avant)');
  res.push('robot');
}
{ // 4. parties completes, nouveau reglage, 4 niveaux : rejeu identique, cartes conservees ; animaux poses
  regle(NOU);const DK=[M.deckTexte({"007":3,"007e":3,"026":3,"026e":3,"901":1,"041":2,"041e":2,"018":3,"018e":2,"036":2,"036e":2,"035":3,"035e":1}),
    M.deckTexte({"009":3,"009e":3,"029":3,"029e":2,"001":3,"001e":3,"018":3,"018e":3,"036":2,"036e":2,"002":2,"902":1})];
  let poses=0,tr=0;const niv=['aleatoire','facile','normal','difficile'];
  for(let g=1;g<=120;g++){const dk=g%2?DK:[DK[1],DK[0]],s=M.nouvelle(g,dk),j=[[],[]];let pas=0,h=g|1;const hz=n=>{h=(Math.imul(h,1103515245)+12345)|0;return (h>>>8)%n};
    while(!s.fin){assert(++pas<3000);const p=M.attendus(s)[0];let x;if(g%4===0){const l=M.legales(s,p);x=l[hz(l.length)]}else x=M.robot(s,p,niv[g%4]);
      if(x.t==='p'&&M.carte(x.c).animal){poses++;eq(M.coutPose(s,p,x.c,x.l,x.k),0)}M.applique(s,p,x);j[p].push(M.code(x));
      s.j.forEach((J,q)=>{const vu=[...J.deck,...J.main,...J.defausse,...J.forge];J.grille.forEach(L=>L.forEach(c=>{if(c)vu.push(c.c)}));const n=Object.values(M.lisDeck(dk[q])).reduce((a,b)=>a+b,0);if(new Set(vu).size!==n||vu.length!==n)throw new Error('cartes '+g)})}
    const r=M.rejoue(g,j,dk);eq(r.erreur,null);eq(JSON.stringify(r.etat),JSON.stringify(s),'rejeu');M.bilan(s);
    tr+=s.stats.ev.filter(e=>e.t==='b'&&e.y==='trait'&&M.carte(e.d).animal).length;ok(!(M.bilan(s).mvp&&/Kiwi|Jacen/.test(M.bilan(s).mvp.carte)),'jamais MVP')}
  ok(poses>20&&tr>0,'animaux poses '+poses+', Trait donne '+tr);regle(ANC);
  res.push('parties ('+poses+' animaux poses, '+tr+' Trait donnes)');
}
const log=(s,re)=>s.log.some(x=>re.test(x[1]));const fm=s=>{s.joueur=1;s.premier=0;s.tour=3;s.j[1].etapeForge=false;M.applique(s,1,{t:'x'})};
const ATT={cout:1,element:false,kiwiApres:true,attache:true};
{ // 5. Kiwi apres le decompte (kiwiApres) : tirage de Mignonitude, decompte, puis Kiwi part
  for(const apres of [false,true]){regle({...ANC,kiwiApres:apres});const s=nouv();s.manche=3;pose(s,0,TI,5,0,0);pose(s,0,KI,0,1,0,{maitre:TI});pose(s,1,AL,3,0,0);fm(s);
    const L=s.log.map(x=>x[1]),iK=L.indexOf('Kiwi part à la défausse.'),iM=L.findIndex(x=>/^Kiwi : Mignonitude/.test(x)),iD=L.findIndex(x=>/égalité|marque/.test(x));
    ok(iK>=0&&iM>=0&&iD>=0,'journal');ok(iM<iD,'tirage avant le decompte');ok(apres?iK>iD:iK<iD,apres?'Kiwi part apres le decompte':'ancien : Kiwi part avant le decompte');
    ok(s.j[0].defausse.includes(KI)&&!s.j[0].grille[1][0],'Kiwi a la defausse');ok(s.stats.ev.some(e=>e.t==='h'),'Mignonitude jouee')}
  // nouveau modele a cases + kiwiApres : Kiwi encore la au decompte, son Trait compte
  regle({cout:0,element:true,kiwiApres:true,attache:false});{const s=nouv();s.manche=3;pose(s,0,AL,3,0,1);pose(s,0,TI,1,1,1);pose(s,0,KI,0,0,0,{maitre:TI});fm(s);
    ok(s.stats.ev.some(e=>e.t==='b'&&e.y==='trait'&&e.d===KI),'Trait de Kiwi note au decompte (il est encore la)')}
  regle(ANC);res.push('Kiwi apres le decompte');
}
{ // 6. animal attache : sous son maitre, +1 de Force, un seul par maitre, pas un Golem, pas de Trait
  regle(ATT);let s=nouv();pose(s,0,TI,1,1,1);pose(s,0,AL,3,0,1);s.j[0].main=[KI];s.j[0].energie=1;
  deq(M.legales(s,0).filter(a=>a.t==='p'),[{t:'p',c:KI,l:1,k:1}],'seulement sur la case de son maitre');
  M.applique(s,0,{t:'p',c:KI,l:1,k:1});eq(s.j[0].energie,0,'cout 1');deq(s.j[0].grille[1][1].ani,{c:KI});eq(s.j[0].grille[0][0],null,'aucune case prise');
  eq(M.forceDe(s,0,1,1),1+1+1,'Titom76 : 1 + Trait d Alrevan (Brume) + 1 de Kiwi');eq(M.forceDe(s,0,0,1),3+1,'Alrevan : seulement le Trait de Titom76, rien de Kiwi');
  ok(log(s,/pose Kiwi sous Titom76\./));
  regle({...ATT,cout:0});s=nouv();pose(s,0,TI,1,1,1,{ani:{c:JJ}});s.j[0].main=[KI];eq(M.legales(s,0).filter(a=>a.t==='p').length,0,'un seul animal par maitre');
  s=nouv();pose(s,0,AL,3,1,1);s.j[0].main=[KI];eq(M.legales(s,0).filter(a=>a.t==='p').length,0,'pas sous un autre Golem');
  s=nouv();s.j[0].main=[KI];eq(M.legales(s,0).filter(a=>a.t==='p').length,0,'sans maitre en jeu : non');
  s=nouv(['Le Karaoké','L\'Écran du MJ','Le Camp']);pose(s,0,TI,1,0,0,{ani:{c:KI}});eq(M.golemsIci(s,0,0),1,'Karaoke : pas un Golem');eq(M.forceDe(s,0,0,0),2);
  // mort du maitre : l'animal part ; Jacen et Jaina piochent
  regle(ATT);s=nouv();pose(s,0,KA,1,0,0,{ani:{c:JJ}});s.j[0].deck=[40,41];pose(s,1,KC,2,0,1);
  M.blesse(s,0,0,0,2,{p:1,c:KC,lib:'test'});M.nettoie(s);ok(!s.j[0].grille[0][0],'KaTarN meurt');ok(s.j[0].defausse.includes(JJ),'Jacen et Jaina a la defausse');deq(s.j[0].main,[40],'pioche 1 carte');
  ok(log(s,/Jacen et Jaina part à la défausse : son maître a quitté le jeu\./));
  s=nouv();pose(s,0,TI,1,0,0,{ani:{c:KI}});pose(s,0,TI,1,0,0,{ani:{c:KI}});s.j[0].main=[AL];s.j[0].energie=3;M.applique(s,0,{t:'p',c:AL,l:0,k:0});
  ok(s.j[0].defausse.includes(KI)&&s.j[0].defausse.includes(TI),'remplace : Kiwi part avec son maitre');ok(!s.j[0].grille[0][0].ani);
  s=nouv();pose(s,0,KA,8,0,0,{ani:{c:JJ}});s.j[0].deck=[40];s.j[0].main=[AL];s.j[0].energie=3;M.applique(s,0,{t:'p',c:AL,l:0,k:0});deq(s.j[0].main,[],'remplacement : Jacen et Jaina ne piochent pas');
  // evolution : l'animal reste
  s=nouv();pose(s,0,TI,1,0,0,{ani:{c:KI}});s.j[0].main=[60];s.j[0].energie=4;M.applique(s,0,{t:'p',c:60,l:0,k:0});deq(s.j[0].grille[0][0].ani,{c:KI},'Maitre du bilig garde Kiwi');eq(M.forceDe(s,0,0,0),3+1);
  // deplacements : La Faille, Le Vaisseau, Slam ; le maitre emporte son animal
  s=nouv(['La Faille','Le Vaisseau','Le Camp']);pose(s,0,TI,1,1,1,{ani:{c:KI}});pose(s,0,AL,3,2,1);M.applique(s,0,{t:'y',l:1,k:1,d:0});deq(s.j[0].grille[0][0].ani,{c:KI},'La Faille : Kiwi suit');eq(s.j[0].grille[1][1],null);
  s=nouv(['La Faille','Le Vaisseau','Le Camp']);pose(s,0,TI,1,0,1,{ani:{c:KI}});pose(s,0,AL,3,2,1);M.applique(s,0,{t:'w',k:1,a:0,b:2});deq(s.j[0].grille[2][1].ani,{c:KI},'Le Vaisseau : Kiwi suit');ok(!s.j[0].grille[0][1].ani);
  s=nouv(['La Boutique','L\'Écran du MJ','Le Camp']);pose(s,1,TI,5,1,1,{ani:{c:KI}});s.j[0].main=[39];s.j[0].energie=2;M.applique(s,0,{t:'p',c:39,l:0,k:0});
  const mv=M.legales(s,0).find(a=>a.t==='h'&&a.l===1&&a.k===1&&(a.m!==1||a.n!==1));M.applique(s,0,mv);deq(s.j[1].grille[mv.m][mv.n].ani,{c:KI},'Slam : Kiwi suit son maitre');eq(s.j[1].grille[mv.m][mv.n].d,1);
  // Kiwi attache : Mignonitude, decompte avec son +1, puis depart
  s=nouv();s.manche=3;pose(s,0,TI,4,0,0,{ani:{c:KI}});pose(s,0,AL,3,1,1);pose(s,1,AL,3,2,2);fm(s);
  ok(s.j[0].defausse.includes(KI)&&!s.j[0].grille[0][0].ani,'Kiwi attache part apres le decompte');ok(s.stats.ev.some(e=>e.t==='h'&&e.sc===KI),'Mignonitude de Kiwi attache');
  { const L=s.log.map(x=>x[1]);ok(L.indexOf('Kiwi part à la défausse.')>L.findIndex(x=>/marque|égalité/.test(x)),'apres le decompte') }
  // robot : pose l'animal sur son maitre
  s=nouv();pose(s,0,KA,8,1,1);pose(s,1,AL,9,1,1);s.j[0].main=[JJ];s.j[0].energie=1;s.j[0].deck=Array.from({length:20},(_,i)=>60+i);
  deq(M.robot(s,0,'difficile'),{t:'p',c:JJ,l:1,k:1},'robot : Jacen et Jaina sous KaTarN');
  s=nouv();pose(s,0,TI,3,1,1);pose(s,0,AL,3,0,0);pose(s,0,AL,3,2,2);pose(s,1,AL,4,1,1);pose(s,1,AL,3,0,0);pose(s,1,AL,3,2,2);s.j[0].main=[KI];s.j[0].energie=1;
  deq(M.robot(s,0,'difficile'),{t:'p',c:KI,l:1,k:1},'robot : Kiwi sous Titom76 (egalite qui bascule)');
  // parties completes, cout 1 et 0, 4 niveaux : rejeu identique, cartes conservees (animaux sous leur maitre compris)
  const DK=[M.deckTexte({"007":3,"007e":3,"026":3,"026e":3,"901":1,"041":2,"041e":2,"018":3,"018e":2,"036":2,"036e":2,"035":3,"035e":1}),
    M.deckTexte({"009":3,"009e":3,"029":3,"029e":2,"001":3,"001e":3,"018":3,"018e":3,"036":2,"036e":2,"002":2,"902":1})];
  let poses=0;const niv=['aleatoire','facile','normal','difficile'];
  for(const c of [1,0]){regle({...ATT,cout:c});for(let g=1;g<=80;g++){const dk=g%2?DK:[DK[1],DK[0]],u=M.nouvelle(g,dk),j=[[],[]];let pas=0,h=g|1;const hz=n=>{h=(Math.imul(h,1103515245)+12345)|0;return (h>>>8)%n};
    while(!u.fin){assert(++pas<3000);const p=M.attendus(u)[0];let x;if(g%4===0){const l=M.legales(u,p);x=l[hz(l.length)]}else x=M.robot(u,p,niv[g%4]);
      if(x.t==='p'&&M.carte(x.c).animal)poses++;M.applique(u,p,x);j[p].push(M.code(x));
      u.j.forEach((J,q)=>{const vu=[...J.deck,...J.main,...J.defausse,...J.forge];J.grille.forEach(L=>L.forEach(z=>{if(z){vu.push(z.c);if(z.ani)vu.push(z.ani.c)}}));
        ok(J.grille.flat().every(z=>!z||!M.carte(z.c).animal),'aucun animal sur une case');const n=Object.values(M.lisDeck(dk[q])).reduce((a,b)=>a+b,0);if(new Set(vu).size!==n||vu.length!==n)throw new Error('cartes '+g)})}
    const r=M.rejoue(g,j,dk);eq(r.erreur,null);eq(JSON.stringify(r.etat),JSON.stringify(u),'rejeu attache');M.bilan(u)}}
  ok(poses>30,'animaux attaches poses : '+poses);regle(ANC);
  res.push('animal attache ('+poses+' poses en parties)');
}
{ // 7. Uki (903, A-015) : chien de Shifukuro, attache, +1 ; Meilleur ami : compte comme un Golem allie au-dessus de son maitre (KEKWait de Shifukuro de base seulement)
  const SH=84,MO=87,UK=126;regle(DEF);
  eq(M.carte(UK).id,'903');eq(M.CARTES['903'].maitre,'025');eq(M.CARTES['903'].cout,0);ok(M.estAnimal(UK));
  let s=nouv();pose(s,0,SH,1,2,0);eq(M.forceDe(s,0,2,0),1,'Shifukuro seul : 1');
  s.j[0].main=[UK];deq(M.legales(s,0).filter(a=>a.t==='p'),[{t:'p',c:UK,l:2,k:0}],'Uki : seulement sous son maitre');
  M.applique(s,0,{t:'p',c:UK,l:2,k:0});deq(s.j[0].grille[2][0].ani,{c:UK},'Uki attache');eq(M.forceDe(s,0,2,0),1+2,'Shifukuro de base : +2 (attache +1, Meilleur ami +1)');
  s=nouv();pose(s,0,SH,1,1,0,{ani:{c:UK}});pose(s,0,KA,8,0,0);eq(M.forceDe(s,0,1,0),1+1+2,'KEKWait : KaTarN au-dessus +1, Uki +2');
  s=nouv();pose(s,0,MO,4,1,1,{ani:{c:UK}});eq(M.forceDe(s,0,1,1),4+1,'Le moderateur : Uki ne donne que +1');
  s=nouv();pose(s,0,SH,1,2,0,{ani:{c:UK}});s.j[0].main=[MO];s.j[0].energie=5;M.applique(s,0,{t:'p',c:MO,l:2,k:0});
  deq(s.j[0].grille[2][0].ani,{c:UK},'evolution : Uki reste');s.attente=null;eq(M.forceDe(s,0,2,0),4+1,'evolue : +1 seulement');
  s=nouv();pose(s,0,KA,8,2,0,{ani:{c:JJ}});eq(M.forceDe(s,0,2,0),8+1,'autre animal : pas de Meilleur ami');
  s=nouv();pose(s,0,SH,1,1,0,{ani:{c:UK}});pose(s,0,SH+1,1,2,0);eq(M.forceDe(s,0,2,0),1+1+2,'autre Shifukuro dessous : KEKWait +1 (le Golem, pas Uki), Trait +2');
  // bilan : Meilleur ami note comme bonus KEKWait donne par Uki
  s=nouv();s.manche=3;pose(s,0,SH,1,1,0,{ani:{c:UK}});pose(s,1,KA,1,2,2);fm(s);
  { const b=M.bilan(s),U=b.joueurs[0].cartes.find(c=>c.c===UK||c.id==='903');ok(!U||!U.mvp,'Uki jamais MVP') }
  // meandyou : jamais Uki seul (aucune case d'animal) ; Shifukuro de base avec Uki deplace par Le moderateur : Uki suit
  s=nouv();pose(s,0,SH,1,0,1,{ani:{c:UK}});pose(s,0,KA,8,0,0);pose(s,0,SH+1,1,1,1);s.j[0].main=[MO];s.j[0].energie=5;M.applique(s,0,{t:'p',c:MO,l:1,k:1});
  eq(s.attente&&s.attente.t,'u','meandyou propose');
  const ech=M.legales(s,0).filter(a=>a.t==='e');ok(ech.length>0);ok(ech.every(a=>[a.a,a.b].every(([x,y])=>s.j[0].grille[x][y]&&!M.carte(s.j[0].grille[x][y].c).animal)),'meandyou : Golems seulement, jamais Uki seul');
  const e1=ech.find(a=>(a.a[0]===0&&a.a[1]===1&&a.b[0]===0&&a.b[1]===0)||(a.b[0]===0&&a.b[1]===1&&a.a[0]===0&&a.a[1]===0));ok(e1,'echange Shifukuro / KaTarN');
  M.applique(s,0,e1);eq(s.j[0].grille[0][0].c,SH);deq(s.j[0].grille[0][0].ani,{c:UK},'Uki suit son maitre');ok(!s.j[0].grille[0][1].ani,'rien ne reste derriere');
  // Shifukuro + Uki sous Le moderateur (Moderateur au-dessus) : Shifukuro echange avec Le moderateur, Uki suit
  s=nouv();pose(s,0,SH,1,1,1,{ani:{c:UK}});pose(s,0,SH+1,1,2,1);s.j[0].main=[MO];s.j[0].energie=5;M.applique(s,0,{t:'p',c:MO,l:2,k:1});
  const e2=M.legales(s,0).find(a=>a.t==='e'&&((a.a[0]===1&&a.b[0]===2)||(a.a[0]===2&&a.b[0]===1))&&a.a[1]===1&&a.b[1]===1);ok(e2,'echange Shifukuro / Le moderateur');
  M.applique(s,0,e2);eq(s.j[0].grille[2][1].c,SH);deq(s.j[0].grille[2][1].ani,{c:UK},'Uki suit Shifukuro');eq(M.forceDe(s,0,2,1),1+1+2+2,'Le moderateur au-dessus : KEKWait +1, Uki +2, Trait +2');
  // maitre detruit : Uki a la defausse
  s=nouv();pose(s,0,SH,1,0,0,{ani:{c:UK}});M.retire(s,0,0,0);ok(s.j[0].defausse.includes(UK),'Uki a la defausse avec son maitre');
  // parties completes avec Uki : rejeu identique, cartes conservees
  const DU=[M.deckTexte({"025":3,"025e":3,"903":1,"009":3,"009e":3,"029":3,"029e":2,"001":3,"001e":3,"018":3,"018e":3}),M.deckTexte({"007":3,"007e":3,"026":3,"026e":3,"901":1,"041":2,"041e":2,"018":3,"018e":2,"036":2,"036e":2,"035":3,"035e":1})];
  let pu=0;const nv2=['aleatoire','facile','normal','difficile'];
  for(let g=1;g<=80;g++){const dk=g%2?DU:[DU[1],DU[0]],u=M.nouvelle(g,dk),j=[[],[]];let pas=0,h=g|1;const hz=n=>{h=(Math.imul(h,1103515245)+12345)|0;return (h>>>8)%n};
    while(!u.fin){assert(++pas<3000);const p=M.attendus(u)[0];let x;if(g%4===0){const l=M.legales(u,p);x=l[hz(l.length)]}else x=M.robot(u,p,nv2[g%4]);
      if(x.t==='p'&&x.c===UK)pu++;M.applique(u,p,x);j[p].push(M.code(x));
      u.j.forEach((J,q)=>{const vu=[...J.deck,...J.main,...J.defausse,...J.forge];J.grille.forEach(L=>L.forEach(z=>{if(z){vu.push(z.c);if(z.ani)vu.push(z.ani.c)}}));const n=Object.values(M.lisDeck(dk[q])).reduce((a,b)=>a+b,0);if(new Set(vu).size!==n||vu.length!==n)throw new Error('cartes Uki '+g)})}
    const r=M.rejoue(g,j,dk);eq(r.erreur,null);eq(JSON.stringify(r.etat),JSON.stringify(u),'rejeu Uki');M.bilan(u)}
  ok(pu>10,'Uki pose en parties : '+pu);regle(ANC);
  res.push('Uki ('+pu+' poses en parties)');
}
{ // 8. Uki : cas repris du prototype (6 - Outils et simulations\2 - Simulations\Animaux\tests\test_uki.js), avec le code de partie de la structure reorg (126)
  const SH=84,SH2=85,MO=87,UK=126,GL=39,lg=(s,re)=>s.log.some(x=>re.test(x[1]));regle(DEF);
  eq(M.TYPES.indexOf('903'),42,'en fin de TYPES');eq(M.TYPES.indexOf('902'),41,'rangs precedents inchanges');deq(M.decode(M.code({t:'p',c:UK,l:1,k:2})),{t:'p',c:UK,l:1,k:2});
  const D={'025':3,'025e':3,'903':1,'037':3,'037e':3,'042':3,'042e':3,'020':3,'020e':3,'003':3};eq(M.erreurDeck(D),'');deq(M.lisDeck(M.deckTexte(D)),D);
  ok(M.erreurDeck({...D,'903':2}),'un seul exemplaire');{const E={...D};delete E['025'];delete E['025e'];E['002']=3;E['002e']=3;ok(M.erreurDeck(E),'maitre obligatoire')}
  let s=nouv();pose(s,0,MO,4,0,0);s.j[0].main=[UK];eq(M.legales(s,0).filter(a=>a.t==='p').length,1,'sous Le moderateur aussi');
  s=nouv();pose(s,0,SH,1,0,0,{ani:{c:UK}});pose(s,0,SH2,1,1,1);s.j[0].main=[KI];eq(M.legales(s,0).filter(a=>a.t==='p').length,0,'Kiwi n est pas l animal de Shifukuro');
  s=nouv();pose(s,0,SH,1,2,0,{ani:{c:UK}});pose(s,0,KA,8,1,0);eq(M.kekwait(s.j[0].grille,2,0),1,'kekwait : seulement les vrais Golems');
  s.stats.ev=[];M.noteBonus(s);eq(s.stats.ev.filter(e=>e.t==='b'&&e.y==='kekwait'&&e.r===SH).length,2,'bilan : KEKWait de KaTarN et d Uki');ok(s.stats.ev.some(e=>e.y==='kekwait'&&e.d===UK));
  s=nouv(['Le Karaoké','L\'Écran du MJ','Le Camp']);pose(s,0,SH,1,2,0,{ani:{c:UK}});eq(M.golemsIci(s,0,0),1,'pas un Golem (Karaoke)');
  // Maitre du deguisement copiant Shifukuro : pas son maitre
  s=nouv();pose(s,0,48,3,2,0,{cp:'025'});s.j[0].main=[UK];eq(M.legales(s,0).filter(a=>a.t==='p').length,0,'copie de Shifukuro : pas un maitre');
  // mort, remplacement
  s=nouv();pose(s,0,SH,1,2,0,{ani:{c:UK}});M.blesse(s,0,2,0,3,{p:1,c:AL,lib:'test'});M.nettoie(s);ok(!s.j[0].grille[2][0]&&s.j[0].defausse.includes(UK),'Uki part avec son maitre');ok(lg(s,/Uki part à la défausse : son maître a quitté le jeu\./));
  s=nouv();pose(s,0,SH,1,2,0,{ani:{c:UK}});s.j[0].main=[AL];s.j[0].energie=3;M.applique(s,0,{t:'p',c:AL,l:2,k:0});ok(s.j[0].defausse.includes(UK)&&!s.j[0].grille[2][0].ani,'remplace : Uki part');
  // Slam, La Faille, Le Vaisseau : Uki suit
  s=nouv(['La Faille','Le Vaisseau','Le Camp']);pose(s,0,SH,1,1,1,{ani:{c:UK}});pose(s,0,AL,3,2,1);M.applique(s,0,{t:'y',l:1,k:1,d:0});deq(s.j[0].grille[0][0].ani,{c:UK},'La Faille');
  s=nouv(['La Faille','Le Vaisseau','Le Camp']);pose(s,0,SH,1,0,1,{ani:{c:UK}});pose(s,0,AL,3,2,1);M.applique(s,0,{t:'w',k:1,a:0,b:2});deq(s.j[0].grille[2][1].ani,{c:UK},'Le Vaisseau');
  s=nouv();pose(s,1,SH,3,1,1,{ani:{c:UK}});s.j[0].main=[GL];s.j[0].energie=2;M.applique(s,0,{t:'p',c:GL,l:0,k:0});
  {const mv=M.legales(s,0).find(a=>a.t==='h'&&a.l===1&&a.k===1&&(a.m!==1||a.n!==1));M.applique(s,0,mv);deq(s.j[1].grille[mv.m][mv.n].ani,{c:UK},'Slam')}
  // robot : pose Uki sous Shifukuro
  s=nouv();pose(s,0,SH,1,2,0);pose(s,0,AL,3,0,1);pose(s,0,AL,3,2,2);pose(s,1,AL,2,2,0);pose(s,1,AL,3,0,1);pose(s,1,AL,3,2,2);s.j[0].main=[UK];s.j[0].deck=Array.from({length:12},(_,i)=>60+i);
  deq(M.robot(s,0,'difficile'),{t:'p',c:UK,l:2,k:0},'robot : Uki sous Shifukuro');
  regle(ANC);res.push('Uki, cas du prototype');
}
console.log('Animaux OK : '+nv+' verifications ('+res.join(', ')+')');
