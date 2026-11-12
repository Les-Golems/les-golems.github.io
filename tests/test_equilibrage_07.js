// 0.7 (equilibrage valide le 12 nov. 2026) : les 22 cartes revues et leurs nouveaux effets. Node : node tests/test_equilibrage_07.js
// Tout ou rien, High Roll, Counter-pick, Full synergie, KEKWait a la pose, Info tchat, On flip, Chance du debutant (pioche), KaTarN (perte 6),
// reductions de cout (J.reduc, J.reducCarte, plancher 0), cas limites, parties robot contenant les cartes revues, rejeux identiques.
const M=require('../moteur.js'),assert=require('assert');
let nv=0;const ok=(c,m)=>{assert(c,m||'ok');nv++},eq=(a,b,m)=>{assert.strictEqual(a,b,m||'eq');nv++},deq=(a,b,m)=>{assert.deepStrictEqual(a,b,m||'deq');nv++};
const T=n=>({...M.TERRAINS.find(x=>x.nom===n)});
const id=x=>M.TYPES.indexOf(x)*3; /* premier identifiant de partie d'un code (3 exemplaires) */
const KA=id('001'),SK=id('001e'),AL=id('002'),KR=id('002e'),CY=id('003'),TR=id('007'),RM=id('007e'),KC=id('008'),SF=id('037'),MP=id('037e'),
  MD=id('029e'),AP=id('029'),VE=id('041'),CH=id('041e'),SH=id('025'),MO=id('025e'),VI=id('042'),BG=id('042e'),UK=id('903'),GL=id('009');
const res=[];
const nouv=(manche)=>{const s=M.nouvelle(5,['','']);s.phase='jeu';s.mull=[true,true];s.premier=0;s.tour=1;s.joueur=0;s.manche=manche||1;
  s.j.forEach((J,p)=>{J.etapeForge=false;J.main=[];J.energie=0;J.deck=[];J.defausse=[];J.forge=[];J.score=0;J.grille=[[null,null,null],[null,null,null],[null,null,null]]});
  s.deckLibre=true;s.terrains=['La Faille','L\'Écran du MJ','Le Vaisseau'].map(T);return s}; /* aucun terrain qui soigne ni ne reduit */
const pose=(s,p,c,f,l,k,o={})=>{s.j[p].grille[l][k]={c,f,d:0,...o}};
const joue=(s,p,c,l,k)=>{s.j[p].main.push(c);s.j[p].energie+=M.coutPose(s,p,c,l,k);M.applique(s,p,{t:'p',c,l,k})};
const L=s=>s.log.map(x=>x[1]);
const fm=s=>{s.joueur=1;s.premier=0;s.tour=3;s.j[1].etapeForge=false;s.j[0].main=[];s.j[1].main=[];M.applique(s,1,{t:'x'})};
const aDe=(s,re)=>{const m=L(s).map(x=>re.exec(x)).filter(Boolean).pop();return m?m.slice(1).map(Number):null};

{ // 0. fiches : les 22 cartes revues (valeurs de golems.js v0.7d), identifiants inchanges
  const V={'015':[1,2,['brume','magma']],'020':[1,1,['cristal','roche']],'001':[1,8,['magma','foudre']],'007':[1,1,['brume','foudre']],'002':[2,1,['foudre','cristal']],
    '021':[2,1,['brume','cristal']],'004':[2,1,['magma','brume']],'037':[2,1,['foudre','roche']],'026':[2,2,['brume','foudre']],'025':[3,1,['roche','brume']],
    '042':[3,1,['cristal','brume']],'016':[4,4,['brume','magma']],'016e':[1,5,['brume','magma']],'002e':[3,4,['foudre','cristal']],'026e':[3,3,['brume','foudre']],
    '015e':[4,4,['brume','magma']],'025e':[4,4,['roche','brume']],'037e':[4,2,['foudre','roche']],'007e':[4,5,['brume','foudre']],'041e':[4,5,['roche','brume']],
    '042e':[4,4,['cristal','brume']],'004e':[7,1,['magma','brume']]};
  eq(Object.keys(V).length,22);
  for(const k in V){const C=M.CARTES[k];eq(C.cout,V[k][0],k+' cout');eq(C.force,V[k][1],k+' force');deq(C.el,V[k][2],k+' elements')}
  eq(M.TYPES.length,45);eq(M.carte(AL).id,'002');eq(M.carte(RM).id,'007e');eq(M.carte(VI).id,'042');eq(M.VERSION,'0.7');
  deq(M.CARTES['001'].effet,[{type:'poseManche',manche:1},{type:'pertesFinManche',degats:6}]);
  for(const k of Object.keys(M.CARTES))for(const e of [].concat(M.CARTES[k].effet||[]))ok(!['forceAuDe','intouchable','synergie'].includes(e.type),'ancien effet retire : '+k);
  res.push('fiches');
}
{ // 1. KaTarN : 8 au decompte de la manche 1, 2 a celui de la manche 2, detruit apres
  const s=nouv();pose(s,0,KA,8,0,0);eq(M.forceDe(s,0,0,0),8,'manche 1 : 8');fm(s);eq(s.manche,2);eq(s.j[0].grille[0][0].d,6);eq(M.forceDe(s,0,0,0),2,'manche 2 : 2');
  ok(L(s).includes('KaTarN perd 6 de Force.'));fm(s);eq(s.manche,3);eq(s.j[0].grille[0][0],null,'detruit a la fin de la manche 2');
  res.push('KaTarN 8, 2, detruit');
}
{ // 2. Alrevan : Tout ou rien (1 de). 4+ : +1 aux autres Golems allies ICI (g.bo, garde a l'evolution, perdu au remplacement) ; 1-3 : prochain Golem -1
  const vus={haut:0,bas:0};
  for(let g=1;g<80;g++){const s=nouv();s.rng=[g,g*7];pose(s,0,CY,1,0,1);pose(s,0,VE,1,2,1);pose(s,0,TR,1,0,0);joue(s,0,AL,1,1);
    const [v]=aDe(s,/: Tout ou rien \((\d)\)/);const G=s.j[0].grille;
    eq(G[1][1].f,1,'Force 1');ok(!G[1][1].bo,'pas pour lui');ok(!G[0][0].bo,'autre terrain : rien');
    if(v>=4){vus.haut++;eq(G[0][1].bo,1);eq(G[2][1].bo,1);ok(!s.j[0].reduc);
      const f=M.forceDe(s,0,0,0);s.j[0].main=[VE+1];s.j[0].energie=9;M.applique(s,0,{t:'p',c:VE+1,l:1,k:1});eq(s.j[0].grille[2][1].bo,1,'Alrevan remplace : le bonus reste');eq(M.forceDe(s,0,0,0),f);
      s.j[0].main=[CH];M.applique(s,0,{t:'p',c:CH,l:2,k:1});if(s.attente)M.applique(s,0,{t:'i',o:0});eq(s.j[0].grille[2][1].bo,1,'garde a l evolution (Velnen -> chansonnier)');
      s.j[0].main=[CY+1];s.j[0].energie=9;M.applique(s,0,{t:'p',c:CY+1,l:0,k:1});ok(!s.j[0].grille[0][1].bo,'perdu au remplacement')}
    else{vus.bas++;eq(s.j[0].reduc,1);ok(!G[0][1].bo&&!G[2][1].bo);eq(M.coutPose(s,0,CY+1,0,2),M.CARTES['003'].cout-1,'prochain Golem -1')}}
  ok(vus.haut>10&&vus.bas>10,'les deux issues '+JSON.stringify(vus));
  // seul sur son terrain : rien a donner
  {let fait=false;for(let g=1;g<40&&!fait;g++){const s=nouv();s.rng=[g,g*7];joue(s,0,AL,0,0);const[v]=aDe(s,/: Tout ou rien \((\d)\)/);if(v>=4){ok(L(s).some(x=>/aucun autre Golem allié ici/.test(x)));fait=true}}ok(fait)}
  res.push('Tout ou rien '+JSON.stringify(vus));
}
{ // 3. KEKWRevan : High Roll ; double : les AUTRES Golems allies ici gagnent sa valeur (permanent)
  let dbl=0;for(let g=1;g<200;g++){const s=nouv();s.rng=[g,g*3+1];pose(s,0,AL,1,1,1);pose(s,0,CY,1,0,1);s.j[0].energie=0;joue(s,0,KR,1,1);
    const[a,b]=aDe(s,/High Roll \((\d) et (\d)\)/);const G=s.j[0].grille;
    if(a===b){dbl++;eq(G[0][1].bo,a);eq(s.j[0].energie,0)}else{ok(!G[0][1].bo);eq(s.j[0].energie,Math.abs(a-b))}
    eq(G[1][1].f,4)}
  ok(dbl>0);res.push('High Roll ('+dbl+' doubles)');
}
{ // 4. Counter-pick : a la pose seulement ; La Boutique et la reduction se cumulent ; un animal ne consomme pas la reduction du prochain Golem
  let s=nouv();pose(s,1,KA,8,0,0);joue(s,0,SF,0,0);eq(s.j[0].reduc,1);
  s.terrains[1]=T('La Boutique');eq(M.coutPose(s,0,CY,0,1),M.CARTES['003'].cout-2,'Boutique et Counter-pick');
  s=nouv();joue(s,0,SF,0,0);pose(s,1,KA,8,0,0);eq(s.j[0].reduc||0,0,'Golem pose en face apres : rien');
  s=nouv();pose(s,0,id('026'),2,1,0);pose(s,1,KA,8,0,0);joue(s,0,SF,0,0);M.REGLAGE_ANIMAUX.attache&&0;joue(s,0,id('901'),1,0);eq(s.j[0].reduc,1,'animal (Kiwi) pose : reduction gardee pour le prochain Golem');
  res.push('Counter-pick');
}
{ // 5. Shifukuro : KEKWait a la pose, 1 carte de la defausse melangee dans le deck par Golem allie au-dessus (Uki compris) ; defausse vide ; Force +1 par allie au-dessus
  let s=nouv();pose(s,0,TR,1,0,1);pose(s,0,KC,2,1,1);s.j[0].defausse=[CY,VE,KC+1];s.j[0].deck=[AP];joue(s,0,SH,2,1);
  eq(s.j[0].defausse.length,1,'2 cartes reprises');eq(s.j[0].deck.length,3);ok(L(s).some(x=>/KEKWait, mélange 2 cartes de sa défausse dans son deck/.test(x)));eq(M.kekwait(s.j[0].grille,2,1),2);
  s=nouv();pose(s,0,TR,1,0,1);s.j[0].defausse=[];joue(s,0,SH,1,1);ok(L(s).some(x=>/KEKWait, défausse vide/.test(x)),'defausse vide : rien');eq(s.j[0].deck.length,0);
  s=nouv();s.j[0].defausse=[CY];joue(s,0,SH,0,1);ok(L(s).some(x=>/KEKWait, aucun allié au-dessus/.test(x)));deq(s.j[0].defausse,[CY]);
  s=nouv();pose(s,0,TR,1,0,1);s.j[0].defausse=[CY,VE];joue(s,0,SH,1,1);s.j[0].main=[UK];s.j[0].energie=9;eq(s.j[0].defausse.length,1,'1 allie au-dessus : 1 carte');
  res.push('KEKWait a la pose');
}
{ // 6. Vic2222 : Info tchat a la pose (attente 'vic', coup 'i' o:1 laisser, o:0 dessous) ; deck vide : rien ; cercle +2 garde
  let s=nouv();s.j[0].deck=[CY,VE,KC];joue(s,0,VI,0,0);eq(s.attente.t,'vic');deq(s.attente.options,[CY]);eq(s.attente.src,VI);deq(M.attendus(s),[0]);
  deq(M.legales(s,0),[{t:'i',o:1},{t:'i',o:0}]);deq(M.decode(M.code({t:'i',o:0})),{t:'i',o:0});
  const s2=JSON.parse(JSON.stringify(s));M.applique(s,0,{t:'i',o:0});deq(s.j[0].deck,[VE,KC,CY],'dessous');eq(s.attente,null);
  M.applique(s2,0,{t:'i',o:1});deq(s2.j[0].deck,[CY,VE,KC],'laissee');ok(L(s2).some(x=>/laisse la carte sur son deck/.test(x)));
  s=nouv();joue(s,0,VI,0,0);eq(s.attente,null,'deck vide : pas de choix');ok(L(s).some(x=>/Info tchat, deck vide/.test(x)));eq(s.j[1].score,0,'pas une pioche : aucun point');
  s=nouv();pose(s,1,KA,8,0,0);pose(s,0,VI,1,0,0);eq(M.forceDe(s,0,0,0),1+2,'Cristal domine Foudre : cercle +2 (Info tchat)');
  for(const niv of ['facile','normal','difficile']){const u=nouv();u.j[0].deck=[CY,KA+1];joue(u,0,VI,0,0);const a=M.robot(u,0,niv);ok(a.t==='i'&&(a.o===0||a.o===1),'robot '+niv)}
  res.push('Info tchat');
}
{ // 7. Roi du Mobile : On flip. Pioche 1, lance 1 de : cout de la carte < de : forgee ; sinon (egalite comprise) protege (g.prot) ; deck vide : protege
  const vus={forge:0,prot:0};
  for(let g=1;g<120;g++){const s=nouv();s.rng=[g,g*5];pose(s,0,TR,1,0,0);s.j[0].deck=[[CY,KA,MO,SK][g%4]];const c=s.j[0].deck[0],co=M.carte(c).cout;joue(s,0,RM,0,0);
    const[v]=aDe(s,/On flip, dé (\d)/);const G=s.j[0].grille[0][0];
    if(co<v){vus.forge++;ok(s.j[0].forge.includes(c)&&!s.j[0].main.includes(c),'forgee');ok(!G.prot);ok(M.ciblable(s,0,0,0,1),'ciblable')}
    else{vus.prot++;ok(s.j[0].main.includes(c),'gardee en main');eq(G.prot,true);ok(!M.ciblable(s,0,0,0,1),'non ciblable par l adversaire');ok(M.ciblable(s,0,0,0,0),'ciblable par soi')}}
  ok(vus.forge>10&&vus.prot>10,JSON.stringify(vus));
  let s=nouv();pose(s,0,TR,1,0,0);joue(s,0,RM,0,0);eq(s.j[0].grille[0][0].prot,true,'deck vide : protege');ok(L(s).some(x=>/deck vide, dé \d : aucune carte piochée/.test(x)));
  // protege : Slim K adverse ne le touche pas ; non protege : touche
  s=nouv();pose(s,1,RM,5,0,0,{prot:true});pose(s,1,TR,1,0,1);s.joueur=1;s.j[1].main=[];s.j[0].main=[SK];s.j[0].energie=9;pose(s,0,KA,8,0,0);s.joueur=0;M.applique(s,0,{t:'p',c:SK,l:0,k:0});
  eq(s.j[1].grille[0][0].d,0,'protege');eq(s.j[1].grille[0][1].d,1,'Trigas voisin touche');
  s=nouv();pose(s,1,RM,5,0,0);s.j[0].main=[SK];s.j[0].energie=9;pose(s,0,KA,8,0,0);M.applique(s,0,{t:'p',c:SK,l:0,k:0});eq(s.j[1].grille[0][0].d,1,'sans protection : touche');
  // Apo deguise en Roi du Mobile : la protection n'existe que si son propre On flip l'a donnee
  s=nouv();pose(s,0,AP,2,1,1);pose(s,0,RM,5,0,1);s.j[0].deck=[];joue(s,0,MD,1,1);eq(s.j[0].grille[1][1].cp,'007e');eq(s.j[0].grille[1][1].prot,true,'copie : On flip joue (deck vide : protege)');
  res.push('On flip '+JSON.stringify(vus));
}
{ // 8. Baby gamer : Chance du debutant, la premiere perte adverse annulee et 1 carte piochee ; une seule fois
  const s=nouv();pose(s,1,BG,4,0,0);pose(s,1,TR,1,1,0);s.j[1].deck=[CY,VE];s.j[0].main=[SK];s.j[0].energie=9;pose(s,0,KA,8,0,0);M.applique(s,0,{t:'p',c:SK,l:0,k:0});
  eq(s.j[1].grille[0][0].d,0);deq(s.j[1].main,[CY],'pioche 1');ok(L(s).some(x=>/Chance du débutant, ne perd pas de Force et pioche 1 carte/.test(x)));
  s.j[0].main=[SK+1];s.j[0].energie=9;pose(s,0,KA+1,8,0,1);M.applique(s,0,{t:'p',c:SK+1,l:0,k:1});eq(s.j[1].grille[0][0].d,1,'deuxieme fois : touche');eq(s.j[1].main.length,1);
  res.push('Chance du debutant');
}
{ // 9. Parties robot contre robot avec les cartes revues (decks a 4 elements), rejeux identiques, aucun blocage
  const decks=[{'002':3,'002e':3,'037':3,'037e':3,'035':3,'035e':3,'018':3,'018e':3,'003':3,'003e':3},
    {'007':3,'007e':3,'025':3,'025e':3,'041':3,'041e':3,'026':3,'026e':3,'015':3,'015e':3},
    {'042':3,'042e':3,'021':3,'021e':3,'020':3,'020e':3,'004':3,'004e':2,'013':3,'013e':3,'008':1},
    {'001':3,'001e':3,'016':3,'016e':3,'015':3,'015e':3,'036':3,'036e':3,'037':3,'037e':3}].map(d=>{const t=M.deckTexte(d);ok(M.lisDeck(t)&&!M.erreurDeck(d)&&!M.erreurElements(d),'deck valide '+t);return t});
  const vu={};let n=0;const niv=['facile','normal','difficile'];
  for(let i=0;i<120;i++){const dk=[decks[i%4],decks[(i+1+(i>>2)%3)%4]],g=(i*2654435761+11)|0,s=M.nouvelle(g,dk),j=[[],[]];let pas=0;
    while(!s.fin){ok(++pas<3000,'blocage '+g);const p=M.attendus(s)[0],a=M.robot(s,p,niv[(i+p)%3]);M.applique(s,p,a);j[p].push(M.code(a))}
    for(const x of L(s)){for(const k of ['Tout ou rien','High Roll','Counter-pick','Full synergie','KEKWait, mélange','Info tchat','On flip','Chance du débutant'])if(x.includes(k))vu[k]=(vu[k]||0)+1}
    const r=M.rejoue(g,j,dk);eq(r.erreur,null);eq(JSON.stringify(r.etat),JSON.stringify(s),'rejeu '+g);n++}
  for(const k of ['Tout ou rien','High Roll','Counter-pick','Full synergie','KEKWait, mélange','Info tchat','On flip'])ok(vu[k]>0,'vu en partie : '+k+' '+JSON.stringify(vu));
  res.push(n+' parties robot '+JSON.stringify(vu));
}
console.log('0.7 OK : '+nv+' verifications ('+res.join(', ')+')');
