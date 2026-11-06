// Node : parties aleatoires + cas de regles. Usage : node test_moteur.js [nombre]
const M=require('../moteur.js'),assert=require('assert');
const N=+process.argv[2]||200;
const ANC=["La Faille", "Le Carrousel", "La Boutique", "Le Plateau de Jeu", "La Salle Verrouillée", "Le Vaisseau", "La Nuit au Village", "Le Buzzer", "L'Écran du MJ", "Le Camp"],TA=i=>M.TERRAINS.find(t=>t.nom===ANC[i]);
let graineTest=12345;
const rnd=n=>{graineTest=(Math.imul(graineTest,1103515245)+12345)|0;return ((graineTest>>>8)%n)};
function partie(gr,dk){
  const s=M.nouvelle(gr,dk),j=[[],[]];let pas=0;
  while(!s.fin){
    assert(++pas<2000,'blocage graine '+gr);
    const att=M.attendus(s);assert(att.length,'personne attendu '+gr);
    const p=att[rnd(att.length)],l=M.legales(s,p);assert(l.length,'aucune action '+gr);
    const pref=l.filter(a=>a.t==='p'||a.t==='f'||a.t==='w'||a.t==='y');
    const a=pref.length&&rnd(5)?pref[rnd(pref.length)]:l[rnd(l.length)];
    M.applique(s,p,a);j[p].push(M.code(a));
    verifie(s);
  }
  const r=M.rejoue(gr,j,dk);assert(!r.erreur,r.erreur);
  assert.strictEqual(JSON.stringify(r.etat),JSON.stringify(s),'rejeu different');
  // ordre d'arrivee inverse : meme resultat
  const r2=M.rejoue(gr,[M.litJournal(M.ecritJournal(j[0])),M.litJournal(M.ecritJournal(j[1]))],dk);
  assert.strictEqual(JSON.stringify(r2.etat),JSON.stringify(s));
  return {s,taille:Math.max(M.ecritJournal(j[0]).length,M.ecritJournal(j[1]).length),n:Math.max(j[0].length,j[1].length)};
}
function verifie(s){
  s.j.forEach((J,p)=>{
    const vu=[...J.deck,...J.main,...J.defausse,...J.forge];
    J.grille.forEach(L=>L.forEach(g=>{if(g)vu.push(g.c)}));
    const o=M.lisDeck(s.decks&&s.decks[p]),n=o?Object.values(o).reduce((a,b)=>a+b,0):M.TAILLE_DECK;
    assert.strictEqual(new Set(vu).size,n,'cartes perdues');assert.strictEqual(vu.length,n,'cartes doublees');
    J.grille.forEach((L,l)=>L.forEach((g,k)=>{
      if(g&&M.estAnimal(g.c)){assert(J.grille.some(R=>R.some(h=>h&&h.c===g.c?false:h&&h.c===g.maitre)),'animal sans son maitre en jeu');assert.strictEqual(M.forceDe(s,p,l,k),0,'animal : Force 0');return}
      if(g&&!s.attente)assert(M.forceDe(s,p,l,k)>0,'Golem mort en jeu')}));
  });
}
let tMax=0,nMax=0;const bilan={0:0,1:0,nul:0};
for(let i=0;i<N;i++){const r=partie((i*2654435761)|0);tMax=Math.max(tMax,r.taille);nMax=Math.max(nMax,r.n);
  const g=r.s.fin.gagnant;bilan[g===null?'nul':g]++}

// Decks personnalises (0.2a)
{
  const d24={'001':3,'002':3,'002e':3,'003':3,'004':3,'007':3,'008':3,'003e':3},t=M.deckTexte(d24);
  assert.strictEqual(t,['0013','0023','002e3','0033','003e3','0043','0073','0083'].join(''),'ordre de TYPES');
  assert.strictEqual(M.deckTexte(M.lisDeck(t)),t,'aller-retour texte');assert.strictEqual(Object.keys(M.lisDeck(t)).length,8);
  assert.strictEqual(M.erreurDeck(d24),'');
  assert(M.erreurDeck({'001':4}),'4 exemplaires');assert(M.erreurDeck({'001':3}),'trop petit');assert(M.erreurDeck({'999':3}),'carte inconnue');
  const gros={};M.TYPES.forEach(k=>gros[k]=3);assert(M.erreurDeck(gros),'33 cartes : hors regle');
  assert.strictEqual(M.lisDeck('0014'),null);assert.strictEqual(M.lisDeck(''),null);assert.strictEqual(M.lisDeck('00130013'),null,'doublon');
  const s=M.nouvelle(77,[t,'']);assert.strictEqual(s.j[0].deck.length+s.j[0].main.length,24);assert.strictEqual(s.j[1].deck.length+s.j[1].main.length,30);
  assert.strictEqual(JSON.stringify(M.nouvelle(77)),JSON.stringify(M.nouvelle(77,['',''])),'paquet de test inchange');
  assert.strictEqual(M.nouvelle(77,['n importe quoi','']).decks[0],'','deck invalide = paquet de test');
  const d30={...d24,'001e':3,'004e':3};
  for(let i=0;i<60;i++){const r=partie((i*97531)|0,[i%2?t:M.deckTexte(d30),i%3?M.deckTexte(d30):'']);nMax=Math.max(nMax,r.n)}
  // les cartes d'un joueur viennent toutes de son deck
  const s2=M.nouvelle(5,[t,'']);[...s2.j[0].deck,...s2.j[0].main].forEach(c=>assert(M.carte(c).id in d24,'carte hors deck'));
}
// Cas de regles
function vide(){const s=M.nouvelle(1);s.phase='jeu';s.mull=[true,true];s.joueur=0;s.premier=0;
  s.j.forEach(J=>{J.deck=[];J.main=[];J.defausse=[]});s.deckLibre=true;s.terrains=[TA(0),TA(1),TA(4)];return s} /* 0.4 : decks vides sans defaite (banc d'essai) */
const gol=(c,f,d=0)=>({c,f,d});
{ // Trait et cercle : +3 max
  const s=vide();s.j[0].grille[0][0]=gol(0,8);s.j[0].grille[1][0]=gol(1,3);s.j[1].grille[0][0]=gol(12,1);
  assert.strictEqual(M.valeurDecompte(s,0,0,0),8+2+1,'trait + cercle');
  assert.strictEqual(M.forceDe(s,0,0,0),8+2+1,'trait et cercle toujours actifs');
}
{ // 0.2.1 Trait cumule : deux voisins du meme element
  const s=vide();s.j[0].grille[1][1]=gol(0,8);s.j[0].grille[0][1]=gol(24,1);s.j[0].grille[1][0]=gol(25,1);
  assert.strictEqual(M.forceDe(s,0,1,1),8+2,'KaTarN + deux voisins Foudre = +2');
  assert.strictEqual(M.forceDe(s,0,0,1),1+1,'Trigas : un seul voisin Foudre');
}
{ // 0.2.1 Trait cumule : voisin double, puis voisins mixtes sans plafond
  const s=vide();s.j[0].grille[1][1]=gol(0,8);s.j[0].grille[0][1]=gol(1,8);
  assert.strictEqual(M.forceDe(s,0,1,1),8+2,'un voisin Magma + Foudre = +2 a lui seul');
  s.j[0].grille[1][0]=gol(24,1);s.j[0].grille[2][1]=gol(30,2);
  assert.strictEqual(M.forceDe(s,0,1,1),8+4,'double + Foudre + Magma = +4');
  s.j[1].grille[1][1]=gol(39,3);assert.strictEqual(M.forceDe(s,0,1,1),8+4,'Glad en face : pas de cercle');
  s.j[1].grille[1][1]=gol(31,3);assert.strictEqual(M.forceDe(s,0,1,1),8+4+1,'K-Chan en face (Magma + Cristal) : Magma domine Cristal, cercle +1');
  s.j[1].grille[1][1]=gol(18,3);assert.strictEqual(M.forceDe(s,0,1,1),8+4+1,'Le Q en face, double domination : cercle +1 seulement');
}
{ // 0.2.1 plus de nul : terrains conquis, puis second joueur de la manche 3
  const fin=(prem,t)=>{const s=vide();s.manche=3;s.premier=prem;s.joueur=1-prem;s.tour=3;s.stats.t=t;M.applique(s,1-prem,{t:'x'});return s};
  let s=fin(0,[{gagnant:1},{gagnant:0},{gagnant:1},{gagnant:null}]);
  assert(s.fin,'partie finie');assert.strictEqual(s.fin.gagnant,1,'plus de terrains conquis');assert.strictEqual(s.fin.departage,'terrains');assert.deepStrictEqual(s.fin.terrains,[1,2]);
  s=fin(0,[{gagnant:0},{gagnant:1}]);assert.strictEqual(s.fin.gagnant,1,'second de la manche 3');assert.strictEqual(s.fin.departage,'second');
  s=fin(1,[]);assert.strictEqual(s.fin.gagnant,0,'second de la manche 3 (J1)');
  s=vide();s.manche=3;s.joueur=1;s.tour=3;s.j[0].grille[0][0]=gol(6,3);M.applique(s,1,{t:'x'});assert.strictEqual(s.fin.departage,false,'points d abord');
}
{ // Cyrdan + Trait + cercle comptent pour la survie
  const s=vide();s.j[0].grille[0][0]=gol(12,1);s.j[0].grille[1][0]=gol(18,1,1);
  assert.strictEqual(M.forceDe(s,0,1,0),1+1+1-1,'aura + Trait cristal');
}
{ // Boutique, KaTarN apres manche 1
  const s=vide();s.terrains=[TA(2),TA(3),TA(0)];s.j[0].grille[0][0]=gol(6,3);
  assert.strictEqual(M.coutPose(s,0,12,0,0),2,'Boutique');assert.strictEqual(M.coutPose(s,0,12,1,1),3,'autre terrain');
  s.manche=2;s.j[0].main=[0];s.j[0].energie=5;
  assert(!M.legales(s,0).some(a=>a.t==='p'),'KaTarN manche 2');
}
{ // Evolution sur base seulement, 2 cartes a la defausse
  const s=vide();s.j[0].main=[3,12];s.j[0].energie=9;s.j[0].grille[0][0]=gol(0,8,3);
  const l=M.legales(s,0).filter(a=>a.t==='p'&&a.c===3);assert.strictEqual(l.length,1,'Slim K sur KaTarN seul');
  s.j[1].grille[0][1]=gol(0,1);s.j[1].grille[1][2]=gol(18,2);
  M.applique(s,0,l[0]);const g=s.j[0].grille[0][0];
  assert.strictEqual(g.d,0);assert.strictEqual(g.f,3);assert.deepStrictEqual(s.j[0].defausse,[0],'base defaussee aussitot');assert.strictEqual(s.j[1].grille[0][1],null,'Slim K tue');
  assert.strictEqual(s.j[1].grille[1][2].d,0,'autre ligne intacte');
  M.applique(s,0,{t:'p',c:12,l:0,k:0});assert.strictEqual(s.j[0].defausse.length,2,'base + evolution remplacee');
}
{ // Vagues simultanees : deux morts ensemble, puis un mort en chaine explique
  const s=vide();s.j[0].main=[3];s.j[0].energie=9;s.j[0].grille[0][0]=gol(0,8);
  s.j[1].grille[0][1]=gol(6,1,4);s.j[1].grille[0][2]=gol(6,1,2);s.j[1].grille[1][1]=gol(12,1,1); /* 0.2.1 : Alrevan 0,1 a +3 de Trait (double + Cyrdan), d'ou 4 degats */
  M.applique(s,0,{t:'p',c:3,l:0,k:0});
  assert.strictEqual(s.j[1].grille[1][1],null,'Cyrdan meurt en chaine');
  assert(s.log.some(([,x])=>/ et .* meurent\.$/.test(x)),'vague annoncee ensemble');
  assert(s.log.some(([,x])=>/meurt ensuite : il perd le bonus de /.test(x)),'cause');
}
{ // Fin de manche : KaTarN 8,4,0, Salle bloquee, Palmares
  const s=vide();s.joueur=1;s.tour=3;s.j[0].grille[0][2]=gol(0,8);s.j[1].grille[0][0]=gol(15,2);
  s.terrains=[TA(2),TA(1),TA(4)];
  M.applique(s,1,{t:'x'});
  assert.strictEqual(s.j[0].score,0,'Salle verrouillee');assert.strictEqual(s.j[0].grille[0][2].d,4);
  assert.strictEqual(s.j[1].score,2+2,'terrain + Karaoke');assert.strictEqual(s.manche,2);assert.strictEqual(s.joueur,1,'premier change');
}
{ // Le Q et Oracle
  const s=vide();s.j[0].deck=[1,3,4,6];s.j[0].main=[18,21];s.j[0].energie=9;s.j[0].grille[1][1]=gol(0,8);
  M.applique(s,0,{t:'p',c:18,l:0,k:0});assert.strictEqual(s.attente.t,'q');
  M.applique(s,0,{t:'c',c:3});assert.deepStrictEqual(s.j[0].deck,[1,4,6]);
  M.applique(s,0,{t:'p',c:21,l:0,k:0});assert.strictEqual(s.attente.t,'o');
  M.applique(s,0,{t:'e',a:[0,0],b:[1,1]});assert.strictEqual(s.j[0].grille[0][0].c,0);assert.strictEqual(s.j[0].grille[1][1].c,21);
}
{ // Defausse a 7, journal trafique refuse
  const s=vide();s.j[0].main=[0,1,3,4,6,7,9,10,12];M.applique(s,0,{t:'x'});assert.strictEqual(s.attente.t,'d');
  M.applique(s,0,{t:'d',c:0});M.applique(s,0,{t:'d',c:1});assert.strictEqual(s.joueur,1);
  assert(M.rejoue(5,[['pf00'],[]]).lus[0]===0);
  assert.throws(()=>M.litJournal('1:x 3:x'));
}
{ // 0.2 : le second de la manche ne pioche qu'1 carte a son premier tour, puis 2
  const s=vide();s.j[0].etapeForge=false;s.j[1].deck=[20,21,22,23,24,25];s.j[0].deck=[10,11,12,13];
  M.applique(s,0,{t:'x'});assert.strictEqual(s.j[1].main.length,1,'second : 1 carte au tour 1');
  s.j[1].etapeForge=false;M.applique(s,1,{t:'x'});assert.strictEqual(s.j[0].main.length,2,'premier : 2 cartes au tour 2');
  s.j[0].etapeForge=false;M.applique(s,0,{t:'x'});assert.strictEqual(s.j[1].main.length,3,'second : 2 cartes au tour 2');
}
{ // 0.2 : nouvelle partie, apres les mulligans le second n'a pioche qu'1 carte
  const s=M.nouvelle(77),pr=s.premier;M.applique(s,pr,{t:'m',c:[]});M.applique(s,1-pr,{t:'m',c:[]});
  const m0=s.j[1-pr].main.length;
  while(s.joueur===pr)M.applique(s,pr,M.robot(s,pr));
  assert.strictEqual(s.j[1-pr].main.length,m0+1,'second : une seule carte a son premier tour');
}
// Les 10 terrains
const T=n=>M.TERRAINS.find(t=>t.nom===n);
assert.strictEqual(M.TERRAINS.length,10);assert.strictEqual(M.TERRAINS[0].nom,'Le Buzzer');assert.strictEqual(M.TERRAINS[9].nom,'La Salle Verrouillée');
function sur(n){const s=vide();s.terrains=[T(n),TA(3),TA(2)];return s}
function finDeManche(s){s.joueur=1;s.premier=0;s.tour=3;M.applique(s,1,{t:'x'})}
{ // Faille : gratuite, une fois par manche et par joueur, degats gardes
  const s=sur('La Faille');s.j[0].grille[1][1]=gol(0,8,2);s.j[0].grille[0][0]=gol(6,3);
  const y=M.legales(s,0).filter(a=>a.t==='y');assert.strictEqual(y.length,2,'2 cases libres');
  assert.strictEqual(M.code(y[0]),'y'+y[0].l+y[0].k+y[0].d);assert.deepStrictEqual(M.decode(M.code(y[0])),y[0]);
  M.applique(s,0,{t:'y',l:1,k:1,d:2});
  assert.strictEqual(s.j[0].grille[1][1],null);assert.strictEqual(s.j[0].grille[2][0].d,2,'degats gardes');
  assert(!s.j[0].aAgi,'gratuit');assert(!M.legales(s,0).some(a=>a.t==='y'),'une fois');
  s.j[1].grille[0][1]=gol(0,8);s.joueur=1;assert(M.legales(s,1).some(a=>a.t==='y'),'par joueur');
  const u=sur('La Faille');u.j[0].grille[0][0]=gol(0,8);assert(!M.legales(u,0).some(a=>a.t==='y'),'deja ici');
}
{ // Carrousel : le gagnant choisit la carte, la manche reprend apres le choix, main vide : rien
  const s=sur('Le Carrousel');s.j[0].main=[7,9];s.j[0].grille[0][0]=gol(6,3);finDeManche(s);
  assert.strictEqual(s.attente.t,'d');assert.strictEqual(s.attente.src,'Le Carrousel');
  assert.strictEqual(s.manche,1,'manche en attente');assert.deepStrictEqual(M.attendus(s),[0]);
  assert.deepStrictEqual(M.legales(s,0).map(a=>a.c),[7,9]);
  M.applique(s,0,{t:'d',c:9});assert.deepStrictEqual(s.j[0].main.includes(9),false);assert(s.j[0].defausse.includes(9));assert.strictEqual(s.manche,2);
  assert(s.log.some(([,x])=>/^Le Carrousel : défausse /.test(x)));
  const e=sur('Le Carrousel');e.j[0].main=[7];finDeManche(e);assert(!e.attente,'egalite');assert.deepStrictEqual(e.j[0].defausse,[]);
  const v=sur('Le Carrousel');v.j[0].grille[0][0]=gol(6,3);finDeManche(v);assert(v.log.some(([,x])=>/main vide/.test(x)));assert(!v.attente);assert.strictEqual(v.manche,2);
  assert.strictEqual(T('Le Carrousel').pts,3);
}
{ // Boutique : poser, remplacer et faire evoluer (0.2b.2), minimum 0
  const s=sur('La Boutique');s.j[0].grille[0][0]=gol(6,3);
  assert.strictEqual(M.coutPose(s,0,12,0,0),2,'remplace');assert.strictEqual(M.coutPose(s,0,12,1,0),2,'pose');assert.strictEqual(M.coutPose(s,0,9,0,0),2,'evolution : 1 de moins aussi');
  assert.strictEqual(M.coutPose(s,0,0,1,0),0,'KaTarN 1 - 1');
}
{ // Plateau de Jeu : 5 ou 6 seulement, pas de de sans gagnant
  let ok=0,non=0;
  for(let g=1;g<60;g++){const s=sur('Le Plateau de Jeu');s.terrains[1]=T('La Boutique');s.rng=[g,g*7];s.manche=3;s.j[0].grille[0][0]=gol(6,3);finDeManche(s);
    const m=s.log.map(x=>/lance (\d)/.exec(x[1])).find(Boolean);assert(m,'de lance');
    assert.strictEqual(s.j[0].score,2+(+m[1]>=5?1:0));if(+m[1]>=5)ok++;else non++}
  assert(ok&&non);
  const e=sur('Le Plateau de Jeu');e.terrains[1]=T('La Boutique');e.manche=3;finDeManche(e);assert(!e.log.some(([,x])=>/lance/.test(x)));
}
{ // Salle : rien avant la manche 3, 4 points a la 3
  const s=sur('La Salle Verrouillée');s.j[0].grille[0][0]=gol(6,3);finDeManche(s);assert.strictEqual(s.j[0].score,0);assert.strictEqual(s.dernier.gagnants[0],null);
  const u=sur('La Salle Verrouillée');u.manche=3;u.j[0].grille[0][0]=gol(6,3);finDeManche(u);assert.strictEqual(u.j[0].score,4);assert(u.fin);
}
{ // Vaisseau : une fois par manche, degats gardes, code, colonne imposee
  const s=sur('Le Vaisseau');s.j[0].grille[0][0]=gol(6,3,1);s.j[0].grille[2][0]=gol(0,8);s.j[0].grille[1][1]=gol(1,8);
  const w=M.legales(s,0).filter(a=>a.t==='w');assert.strictEqual(w.length,1);assert.strictEqual(M.code(w[0]),'w002');
  M.applique(s,0,w[0]);assert.strictEqual(s.j[0].grille[2][0].c,6);assert.strictEqual(s.j[0].grille[2][0].d,1,'degats gardes');
  assert(!M.legales(s,0).some(a=>a.t==='w'),'une fois');assert(!s.j[0].aAgi,'gratuit');
  s.manche=2;assert(M.legales(s,0).some(a=>a.t==='w'),'manche suivante');
}
{ // Nuit : plus faible detruit tous camps, egalite sans mort
  const s=sur('La Nuit au Village');s.j[0].grille[0][0]=gol(6,5);s.j[1].grille[2][0]=gol(6,2);finDeManche(s);
  assert.strictEqual(s.j[1].grille[2][0],null,'detruit');assert(s.j[0].grille[0][0],'survit');assert(s.j[1].defausse.includes(6));
  const e=sur('La Nuit au Village');e.j[0].grille[0][0]=gol(6,3);e.j[1].grille[2][0]=gol(6,3);finDeManche(e);
  assert(e.j[0].grille[0][0]&&e.j[1].grille[2][0],'egalite');assert(e.log.some(([,x])=>/égalité, aucun/.test(x)));
}
{ // Buzzer : ordre choisi puis pioche dans cet ordre, deck court
  const s=sur('Le Buzzer');s.j[1].deck=[13,15,16,4];s.j[1].grille[0][0]=gol(6,3);finDeManche(s);
  assert.strictEqual(s.attente.t,'b');assert.strictEqual(M.legales(s,1).length,6);
  const a={t:'b',o:[16,13,15]};assert.deepStrictEqual(M.decode(M.code(a)),a);M.applique(s,1,a);
  assert.strictEqual(s.manche,2);assert.deepStrictEqual(s.j[1].main,[16,13],'premier de la manche 2 pioche');assert.deepStrictEqual(s.j[1].deck,[15,4]);
  const u=sur('Le Buzzer');u.j[0].deck=[13,15];u.j[0].grille[0][0]=gol(6,3);u.manche=3;finDeManche(u);
  assert.strictEqual(M.legales(u,0).length,2);M.applique(u,0,{t:'b',o:[15,13]});assert.deepStrictEqual(u.j[0].deck,[15,13]);assert(u.fin);
}
{ // Ecran du MJ : main adverse donnee au gagnant
  const s=sur("L'Écran du MJ");s.j[1].main=[4,10];s.j[0].grille[0][0]=gol(6,3);s.manche=3;finDeManche(s);
  assert.deepStrictEqual(s.dernier.ecran,{p:0,main:[4,10]});
}
{ // Camp : deux camps, 1 degat au plus, KaTarN puis soin, jamais au-dessus de la base
  const s=sur('Le Camp');s.j[0].grille[0][0]=gol(6,3,2);s.j[1].grille[0][0]=gol(6,3,1);s.j[0].grille[1][0]=gol(6,3);finDeManche(s);
  assert.strictEqual(s.j[0].grille[0][0].d,1);assert.strictEqual(s.j[1].grille[0][0].d,0);assert.strictEqual(s.j[0].grille[1][0].d,0);
  const u=sur('Le Camp');u.j[0].grille[0][0]=gol(0,8);finDeManche(u);assert.strictEqual(u.j[0].grille[0][0].d,3,'3 puis soin 1');
}
{ // Reperes du journal : effets de terrain dans la bonne page
  const s=sur('Le Camp');s.j[0].grille[0][0]=gol(6,3,2);finDeManche(s);
  const [d,e,f]=s.reperes[0];assert(d<e&&e<f);assert(s.log.slice(e,f).some(([,x])=>/^Le Camp/.test(x)));
}
{ // Forge en premier : rien d'autre tant que l'etape n'est pas tranchee
  const s=M.nouvelle(7);M.applique(s,0,{t:'m',c:[]});M.applique(s,1,{t:'m',c:[]});
  const p=s.joueur,J=s.j[p],n=J.main.length;
  const l=M.legales(s,p);assert.strictEqual(l.length,n+1);assert(l.every(a=>a.t==='f'||a.t==='n'));
  assert.strictEqual(M.code(M.decode('n')),'n');
  M.applique(s,p,{t:'n'});assert(!J.etapeForge);assert(!M.legales(s,p).some(a=>a.t==='f'||a.t==='n'));
  assert(M.legales(s,p).some(a=>a.t==='x'));assert.strictEqual(J.energie,0);
  const u=M.nouvelle(7);M.applique(u,0,{t:'m',c:[]});M.applique(u,1,{t:'m',c:[]});
  const c=u.j[p].main[0];M.applique(u,p,{t:'f',c});assert.strictEqual(u.j[p].energie,1);assert(!M.legales(u,p).some(a=>a.t==='f'));
}
{ // Slim K nomme ses cibles, bilan infliges, subis, morts et chaine
  const s=vide();s.j[0].main=[3];s.j[0].energie=9;s.j[0].grille[0][0]=gol(0,8,1);
  s.j[1].grille[0][1]=gol(6,1,4);s.j[1].grille[0][2]=gol(6,1,2);s.j[1].grille[1][1]=gol(12,1,1); /* 0.2.1 : Alrevan 0,1 a +3 de Trait (double + Cyrdan), d'ou 4 degats */
  M.applique(s,0,{t:'p',c:3,l:0,k:0});
  assert(s.log.some(([,x])=>/^Slim K : 1 dégât à .* et .*\.$/.test(x)),'cibles nommees');
  const B=M.bilan(s),sl=B.joueurs[0].cartes.find(c=>/Slim K/.test(c.carte));
  assert.strictEqual(sl.degats,2);assert.strictEqual(sl.morts,3,'2 morts + chaine');assert.strictEqual(B.joueurs[1].subis,2);assert.strictEqual(B.joueurs[1].mortsSubies,3);
  assert(sl.sources.some(q=>/en chaîne/.test(q.source)));
  assert.strictEqual(sl.coutPaye,4);assert.deepStrictEqual(sl.manches,[1]);assert.strictEqual(sl.recuperes,1,'evolution efface');
  const n=sur('La Nuit au Village');n.j[0].grille[0][0]=gol(6,5);n.j[1].grille[2][0]=gol(6,2);finDeManche(n);
  assert.deepStrictEqual(M.bilan(n).autres.map(o=>o.source),['La Nuit au Village']);
  const tn=M.bilan(n).terrains[0];assert.strictEqual(tn.declenchements,1);assert.strictEqual(tn.gagnant,0);assert.deepStrictEqual(tn.forces,[5,2]);assert.strictEqual(tn.points,2);
  const k=sur('Le Camp');k.j[0].grille[0][0]=gol(0,8);k.j[0].grille[1][0]=gol(12,1);finDeManche(k);
  const ka=M.bilan(k).joueurs[0].cartes.find(c=>c.carte==='KaTarN');
  assert.strictEqual(ka.auto,4,'perte KaTarN sur soi');assert.strictEqual(ka.recuperes,1);assert.strictEqual(M.bilan(k).joueurs[0].degats,0);
  assert.strictEqual(ka.bonusRecus.voisins,1);assert.strictEqual(M.bilan(k).joueurs[0].cartes.find(c=>c.carte==='Cyrdan').bonusDonnes.voisins,1);
}
{ // MVP, tours, cartes vues
  const s=sur('Le Camp');s.manche=3;s.j[0].main=[9];s.j[0].grille[0][0]=gol(12,1);s.j[0].grille[1][0]=gol(15,5);finDeManche(s);
  const B=M.bilan(s);assert.strictEqual(B.mvp.joueur,0);assert.strictEqual(B.mvp.carte,'Cyrdan (Roi du Karaoké)');
  assert.strictEqual(B.mvp.score,B.mvp.force*M.POIDS_MVP.force+B.mvp.bonus*M.POIDS_MVP.bonus);
  assert.deepStrictEqual(B.tours[0],{manche:3,tour:3,joueur:1,energieGaspillee:0,pose:false});
  assert(B.joueurs[0].vuesNonPosees.length===1);
  assert.strictEqual(M.CARTES['002e'].cout,3);assert.strictEqual(M.CARTES['004e'].cout,3);assert.strictEqual(M.CARTES['001'].cout,1);assert.strictEqual(T('La Faille').pts,2);
  {let dbl=0;for(let g=1;g<200;g++){const u=vide();u.rng=[g,g*7];u.j[0].main=[9];u.j[0].energie=9;u.j[0].grille[0][0]=gol(6,3);M.applique(u,0,{t:'p',c:9,l:0,k:0});const m=/lance (\d) et (\d) : Force (\d+)/.exec(u.log.map(x=>x[1]).join(' '));assert(m);const[a,b,f]=[+m[1],+m[2],+m[3]];if(a===b)dbl++;assert.strictEqual(f,a===b?a:a+b,'KEKWRevan')}assert(dbl)}
  assert.strictEqual(M.TAILLE_DECK,30);
  { /* 0.3 : 'tuto33', paquet de 33 cartes du Golem de la partie guidee, refuse comme deck de joueur */
    assert.strictEqual(M.DECK_TUTO,'tuto33');assert.strictEqual(M.lisDeck('tuto33'),null,'tuto33 jamais un deck de joueur');
    const a=M.nouvelle(19445,['0013001e30023002e30033003e300430083','tuto33']),ids=a.j[1].deck.concat(a.j[1].main).sort((x,y)=>x-y);
    assert.deepStrictEqual(ids,Array.from({length:33},(_,i)=>i),'tuto33 : identifiants 0 a 32');
    assert.deepStrictEqual(a.j[1].main.map(c=>M.carte(c).id),['001e','008','008','002e','003'],'main du Golem de la partie guidee comme en 0.2c');
    const b=M.nouvelle(19445,['0013001e30023002e30033003e300430083','']);assert.strictEqual(b.j[1].deck.length+b.j[1].main.length,30,'deck par defaut inchange');
    assert.deepStrictEqual(a.j[0],b.j[0],'camp du joueur inchange');assert.deepStrictEqual(a.terrains,b.terrains,'terrains inchanges');
  }
  for(let c=0;c<45;c++){assert.strictEqual(M.decode(M.code({t:'f',c})).c,c);assert.strictEqual(M.decode(M.code({t:'p',c,l:2,k:1})).c,c)}
  assert.throws(()=>M.decode('f~'),'f~ incomplet refuse (63 et plus = ~ + 1 caractere ; J et _ acceptes)');assert.strictEqual(M.decode('fJ').c,45);assert.strictEqual(M.code({t:'f',c:62}),'f_');assert.strictEqual(M.decode('f_').c,62);assert.strictEqual(M.carte(23).id,'004e');assert.strictEqual(M.carte(2).id,'001');assert.strictEqual(M.carte(3).id,'001e');
}
{ // Spam : pioche puis Forge, sans energie ce tour, tour qui continue, code, deck vide
  const s=vide();s.j[0].main=[24,6];s.j[0].deck=[9];s.j[0].energie=1;
  M.applique(s,0,{t:'p',c:24,l:0,k:0});assert.strictEqual(s.attente.t,'s');assert.deepStrictEqual(s.j[0].main,[6,9]);
  assert.deepStrictEqual(M.legales(s,0).map(a=>a.c),[6,9]);assert.deepStrictEqual(M.attendus(s),[0]);
  assert.deepStrictEqual(M.decode(M.code({t:'s',c:9})),{t:'s',c:9});
  M.applique(s,0,{t:'s',c:9});assert.deepStrictEqual(s.j[0].forge,[9]);assert.strictEqual(s.j[0].energie,0);assert(!s.attente);assert(M.legales(s,0).some(a=>a.t==='x'));
  const u=vide();delete u.deckLibre;u.j[0].main=[24];u.j[0].energie=1;M.applique(u,0,{t:'p',c:24,l:0,k:0});assert(!u.attente,'main vide, deck vide');assert(!u.fin&&u.j[1].score===1&&u.j[0].score===0,'Spam sur deck vide : 1 point pour l adversaire');
  const r=vide();r.j[0].main=[24];r.j[0].deck=[6];r.j[0].energie=1;M.applique(r,0,{t:'p',c:24,l:0,k:0});assert.strictEqual(r.attente.t,'s');assert.strictEqual(M.robot(r,0,'difficile').c,6);
}
{ // Mode Avion : Slim K adverse bloque, ses voisins touches, les terrains non filtres
  const s=vide();s.j[0].main=[3];s.j[0].energie=9;s.j[0].grille[0][0]=gol(0,8);s.j[1].grille[0][0]=gol(27,4);s.j[1].grille[0][1]=gol(6,3);
  assert(!M.ciblable(s,1,0,0,0));assert(M.ciblable(s,1,0,0,1));assert(M.ciblable(s,1,0,1,0));
  M.applique(s,0,{t:'p',c:3,l:0,k:0});assert.strictEqual(s.j[1].grille[0][0].d,0,'Avion');assert.strictEqual(s.j[1].grille[0][1].d,1);
  const n=sur('La Nuit au Village');n.j[0].grille[0][0]=gol(6,5);n.j[1].grille[0][0]=gol(27,1);finDeManche(n);assert.strictEqual(n.j[1].grille[0][0],null,'terrain non bloque');
  const v=vide();v.j[0].grille[0][0]=gol(24,1);v.j[0].main=[27];v.j[0].energie=4;assert.strictEqual(M.legales(v,0).filter(a=>a.t==='p').length,1,'evolution sur Trigas');
}
{ // Rage : +1 si elle survit, 3 maximum, rien si elle meurt, pas d'evolution
  const s=vide();s.j[0].main=[3];s.j[0].energie=9;s.j[0].grille[0][0]=gol(0,8);s.j[1].grille[0][1]=gol(30,2,0);
  const base=M.forceDe(s,1,0,1);M.applique(s,0,{t:'p',c:3,l:0,k:0});
  const g=s.j[1].grille[0][1];assert.strictEqual(g.ra,1);assert.strictEqual(g.d,1);assert.strictEqual(M.forceDe(s,1,0,1),base,'-1 +1');assert(s.log.some(([,x])=>/Rage/.test(x)));
  const m=vide();m.j[0].main=[3];m.j[0].energie=9;m.j[0].grille[0][0]=gol(0,8);m.j[1].grille[0][1]=gol(30,2,1);M.applique(m,0,{t:'p',c:3,l:0,k:0});
  assert.strictEqual(m.j[1].grille[0][1],null,'morte sans bonus');
  const x=vide();x.j[0].main=[3];x.j[0].energie=9;x.j[0].grille[0][0]=gol(0,8);x.j[1].grille[0][1]={c:30,f:2,d:0,ra:3};M.applique(x,0,{t:'p',c:3,l:0,k:0});assert.strictEqual(x.j[1].grille[0][1].ra,3,'plafond');
  assert.strictEqual(M.TYPES.filter(t=>M.CARTES[t].base==='008').join(),'008e','une evolution : L attachiante');
}
// Humain aleatoire contre robot : 300 parties, deux places, jamais de coup illegal
const R=+process.argv[3]||300,vr={robot:0,hum:0,nul:0};let pts=[0,0];
for(let i=0;i<R;i++){
  const gr=(i*40503+7)|0,s=M.nouvelle(gr),j=[[],[]],rb=i%2;let pas=0;
  while(!s.fin){
    assert(++pas<2000,'blocage robot '+gr);
    const att=M.attendus(s);assert(att.length,'personne '+gr);
    const p=att[0],l=M.legales(s,p);assert(l.length,'sans action '+gr);
    const a=p===rb?M.robot(s,p):l[rnd(l.length)];
    M.applique(s,p,a);j[p].push(M.code(a));verifie(s);
  }
  const r=M.rejoue(gr,j);assert(!r.erreur,r.erreur);assert.strictEqual(JSON.stringify(r.etat),JSON.stringify(s));
  const bl=M.bilan(s);assert(s.fin.gagnant===null?!bl.mvp:bl.mvp||!bl.joueurs[s.fin.gagnant].cartes.length,'mvp');assert(bl.tours.length>=18);pts[0]+=s.j[rb].score;pts[1]+=s.j[1-rb].score;
  const g=s.fin.gagnant;vr[g===null?'nul':g===rb?'robot':'hum']++;
}
console.log(R+' parties robot sans blocage. Robot/humain/nul : '+vr.robot+'/'+vr.hum+'/'+vr.nul+', points moyens '+(pts[0]/R).toFixed(1)+' contre '+(pts[1]/R).toFixed(1));
console.log(N+' parties sans blocage, cas de regles OK. Victoires J1/J2/nul : '+bilan[0]+'/'+bilan[1]+'/'+bilan.nul+', journal max '+tMax+' caracteres, '+nMax+' actions.');
// Niveaux du Golem, 300 parties par duel, places alternees ; cartes restantes en fin de partie
function duel(a,b,N2=300){const v={a:0,b:0,nul:0};let dk=0,mn=0,tj=0;
  for(let i=0;i<N2;i++){const gr=(i*7919+11)|0,s=M.nouvelle(gr),ca=i%2,j=[[],[]];let pas=0;
    while(!s.fin){assert(++pas<2000,'blocage duel');const p=M.attendus(s)[0],x=M.robot(s,p,p===ca?a:b);assert(x);M.applique(s,p,x);j[p].push(M.code(x))}
    assert.strictEqual(JSON.stringify(M.rejoue(gr,j).etat),JSON.stringify(s));tj=Math.max(tj,M.ecritJournal(j[0]).length,M.ecritJournal(j[1]).length);
    s.j.forEach(J=>{dk+=J.deck.length;mn+=J.main.length});const g=s.fin.gagnant;v[g===null?'nul':g===ca?'a':'b']++}
  console.log(a+' contre '+b+' : '+v.a+'/'+v.b+'/'+v.nul+' ('+(100*v.a/N2).toFixed(1)+' % / '+(100*v.b/N2).toFixed(1)+' %), deck restant moyen '+(dk/N2/2).toFixed(1)+', main '+(mn/N2/2).toFixed(1)+', journal max '+tj)}
duel('facile','normal');duel('normal','difficile');
{ // 0.2.2 : abandon a tout moment, hors tour, rejeu identique, jamais propose ni joue par le robot
  for(let k=0;k<40;k++){
    const gr=(k*9173+5)|0,s=M.nouvelle(gr),j=[[],[]],stop=5+rnd(80);let pas=0;
    while(!s.fin&&pas<stop){pas++;const p=M.attendus(s)[0],a=M.robot(s,p);assert(a.t!=='a');M.applique(s,p,a);j[p].push(M.code(a))}
    if(s.fin)continue;
    const q=rnd(2);M.applique(s,q,M.decode('a'));j[q].push('a');
    assert(s.fin&&s.fin.abandon===q&&s.fin.gagnant===1-q&&s.phase==='fin','abandon');
    assert.throws(()=>M.applique(s,1-q,{t:'a'}),'abandon apres la fin');
    assert(!M.legales(s,0).length&&!M.attendus(s).length);
    const r=M.rejoue(gr,j);assert(!r.erreur,r.erreur);assert.strictEqual(JSON.stringify(r.etat),JSON.stringify(s),'rejeu abandon');
    const r2=M.rejoue(gr,[M.litJournal(M.ecritJournal(j[0])),M.litJournal(M.ecritJournal(j[1]))]);assert.strictEqual(JSON.stringify(r2.etat),JSON.stringify(s));
    M.bilan(s);
  }
  const s=M.nouvelle(77);assert(!M.legales(s,0).some(a=>a.t==='a'));M.applique(s,1,{t:'a'});assert.strictEqual(s.fin.gagnant,0,'abandon au mulligan');
  console.log('Abandon 0.2.2 OK');
}
{ // 0.2a.1 : Indra (013, 013e). Ids : Indra 33-35, Fan enflammee 36-38, Cyrdan 12, Alrevan 6, K-Chan 30, Roi du Mobile 27, Le Q 18.
  assert(['0.2a.1','0.2a.2','0.2b','0.2b.1','0.2b.2','0.2c','0.3','0.4'].includes(M.VERSION));
  const D=M.deckTexte({'002':3,'003':3,'004':3,'007e':3,'008':3,'013':3,'013e':3,'001':3});assert(M.lisDeck(D),'deck Indra valide');
  assert.strictEqual(M.decode(M.code({t:'p',c:38,l:1,k:2})).c,38,'code base 36 etendu');assert.strictEqual(M.code({t:'p',c:36,l:0,k:0}),'pA00');
  assert.deepStrictEqual(M.decode('g12'),{t:'g',l:1,k:2});
  const prep=main=>{const s=M.nouvelle(5,[D,D]);s.phase='jeu';s.mull=[true,true];s.joueur=0;s.premier=0;const J=s.j[0];J.etapeForge=false;J.energie=30;J.main=main.slice();return s};
  const pose=(s,c,l,k)=>{M.applique(s,0,{t:'p',c,l,k});if(s.attente&&s.attente.t==='q')M.applique(s,0,{t:'c',c:s.attente.options[0]})};
  const adv=(s,c,f,l,k)=>{s.j[1].grille[l][k]={c,f,d:0}};
  // sans autre Golem : rien
  let s=prep([33,36]);pose(s,33,1,1);assert(!s.attente&&s.j[0].grille[1][1].fav===undefined,'sans autre Golem');
  assert(/aucun autre Golem/.test(s.log[s.log.length-1][1]));
  // favori +1 (un seul candidat : choisi d'office)
  s=prep([12,33,36]);pose(s,12,0,0);let f0=M.forceDe(s,0,0,0);pose(s,33,2,2);
  assert.strictEqual(s.j[0].grille[2][2].fav,12);assert.strictEqual(M.forceDe(s,0,0,0),f0+1,'favori +1');
  assert(s.log.some(x=>/devient son favori \(\+1/.test(x[1])),'journal favori');
  // evolution : favori garde, +2, -2 en face
  adv(s,6,5,0,0);pose(s,36,2,2);assert.strictEqual(s.j[0].grille[2][2].fav,12,'favori garde');
  assert.strictEqual(M.forceDe(s,0,0,0),f0+2,'evolution +2');assert.strictEqual(s.j[1].grille[0][0].d,2,'-2 en face');
  // la base retiree : plus de bonus
  s.j[0].grille[2][2]=null;assert.strictEqual(M.forceDe(s,0,0,0),f0,'bonus perdu');
  // Mode Avion en face : protege
  s=prep([12,33,36]);pose(s,12,0,0);pose(s,33,2,2);adv(s,27,4,0,0);pose(s,36,2,2);
  assert.strictEqual(s.j[1].grille[0][0].d,0,'Mode Avion');assert(s.log.some(x=>/Mode Avion/.test(x[1])));
  // choix entre plusieurs : attente 'g', robot deterministe, cases dorees = Golems sauf Indra
  s=prep([12,18,33,36]);pose(s,12,0,0);pose(s,18,1,0);pose(s,33,2,2);
  assert(s.attente&&s.attente.t==='g','choix du favori');const lg=M.legales(s,0);
  assert.deepStrictEqual(lg.map(M.code).sort(),['g00','g10']);
  const r1=M.robot(s,0),r2=M.robot(s,0,'difficile');assert.deepStrictEqual(r1,M.robot(s,0),'robot deterministe');assert(r1&&r2&&r1.t==='g');
  M.applique(s,0,{t:'g',l:1,k:0});assert.strictEqual(s.j[0].grille[2][2].fav,18);assert(!s.attente);
  // favori mort avant l'evolution : nouveau choix, puis -2 en face du nouveau
  s.j[0].grille[1][0]=null;adv(s,6,5,0,0);pose(s,36,2,2);assert.strictEqual(s.j[0].grille[2][2].fav,12,'un seul candidat restant');
  assert.strictEqual(s.j[1].grille[0][0].d,2,'-2 en face du nouveau favori');
  s=prep([12,18,13,33,36]);pose(s,12,0,0);pose(s,18,1,0);pose(s,13,2,0);pose(s,33,2,2);M.applique(s,0,{t:'g',l:0,k:0});s.j[0].grille[0][0]=null;
  adv(s,6,6,1,0);pose(s,36,2,2);assert(s.attente&&s.attente.t==='g','favori mort : nouveau choix');
  M.applique(s,0,{t:'g',l:1,k:0});assert.strictEqual(s.j[0].grille[2][2].fav,18);assert.strictEqual(s.j[1].grille[1][0].d,2);
  // le favori evolue : l'evolution reste le favori (KaTarN 0 en Slim K 3)
  s=prep([0,3,33]);pose(s,0,0,0);pose(s,33,2,2);f0=M.forceDe(s,0,0,0);pose(s,3,0,0);assert.strictEqual(s.j[0].grille[2][2].fav,3,'favori evolue');assert.strictEqual(M.favori(s,0,3),1,'bonus garde');
  // parties aleatoires et robot avec Indra : rejeu identique, sans blocage
  let nG=0,nR=0;
  for(let i=0;i<150;i++){const r=partie((i*7741+3)|0,[D,D]);nG+=r.s.log.filter(x=>/favori/.test(x[1])).length}
  const V={robot:0},niv=['facile','normal','difficile'];
  for(let i=0;i<300;i++){const gr=(i*15485863+9)|0,s=M.nouvelle(gr,[D,D]),j=[[],[]];let pas=0;
    while(!s.fin){assert(++pas<2000,'blocage robot Indra '+gr);const p=M.attendus(s)[0],a=M.robot(s,p,niv[(i+p)%3]);assert(a,'robot sans coup');M.applique(s,p,a);j[p].push(M.code(a));verifie(s)}
    nR+=s.log.filter(x=>/Ragebait/.test(x[1])).length;
    const r=M.rejoue(gr,[M.litJournal(M.ecritJournal(j[0])),M.litJournal(M.ecritJournal(j[1]))],[D,D]);assert(!r.erreur,r.erreur);assert.strictEqual(JSON.stringify(r.etat),JSON.stringify(s),'rejeu Indra');M.bilan(s)}
  assert(nG>0&&nR>0,'Indra jamais jouee');
  console.log('Indra 0.2a.1 OK : 150 parties aleatoires ('+nG+' favoris) et 300 parties robot sans blocage ('+nR+' Ragebait), rejeux identiques');
}
{ // 0.2a.2 : Glad (009, 009e). Ids : Glad 39-41, GymRat 42-44, KaTarN 0, Slim K 3, Cyrdan 12, Indra 33, Fan enflammee 36, Roi du Mobile 27, K-Chan 30, Alrevan 6.
  assert(['0.2a.2','0.2b','0.2b.1','0.2b.2','0.2c','0.3','0.4'].includes(M.VERSION));
  const D=M.deckTexte({'001':3,'001e':3,'003':3,'008':3,'013':3,'013e':3,'009':3,'009e':3});assert(M.lisDeck(D),'deck Glad valide');
  assert.strictEqual(M.code({t:'p',c:44,l:0,k:0}),'pI00');assert.strictEqual(M.decode('pI00').c,44,'code etendu a 44');
  assert.deepStrictEqual(M.decode('h0102'),{t:'h',l:0,k:1,m:0,n:2});assert.strictEqual(M.code({t:'h',l:2,k:0,m:1,n:0}),'h2010');
  const prep=main=>{const s=M.nouvelle(5,[D,D]);s.phase='jeu';s.mull=[true,true];s.joueur=0;s.premier=0;const J=s.j[0];J.etapeForge=false;J.energie=30;J.main=main.slice();return s};
  const pose=(s,c,l,k)=>{M.applique(s,0,{t:'p',c,l,k})};
  const adv=(s,c,f,l,k)=>{s.j[1].grille[l][k]={c,f,d:0}};
  const codes=s=>M.legales(s,0).map(M.code).sort();
  // aucune cible : rien, pas d'attente
  let s=prep([39]);pose(s,39,1,1);assert(!s.attente,'sans cible');assert(/aucun Golem adverse/.test(s.log[s.log.length-1][1]));
  // coin : 2 cases adjacentes libres, jamais en diagonale
  s=prep([39]);adv(s,6,5,0,0);pose(s,39,1,1);assert(s.attente&&s.attente.t==='h','choix du Slam');
  assert.deepStrictEqual(codes(s),['h0001','h0010']);
  const r1=M.robot(s,0),r2=M.robot(s,0,'difficile');assert.deepStrictEqual(r1,M.robot(s,0),'robot deterministe');assert(r1.t==='h'&&r2.t==='h');
  assert.throws(()=>M.applique(s,0,{t:'h',l:0,k:0,m:1,n:1}),'diagonale interdite');
  M.applique(s,0,{t:'h',l:0,k:0,m:1,n:0});assert(!s.attente);assert.strictEqual(s.j[1].grille[0][0],null);
  assert.strictEqual(s.j[1].grille[1][0].d,1,'perd 1');assert(s.log.some(x=>/Slam, Alrevan est déplacé et perd 1 de Force/.test(x[1])),'journal Slam');
  // centre : 4 cases adjacentes
  s=prep([39]);adv(s,6,5,1,1);pose(s,39,0,0);assert.deepStrictEqual(codes(s),['h1101','h1110','h1112','h1121']);
  // un Golem bloque n'est pas cible tant qu'un autre peut bouger
  s=prep([39]);adv(s,6,5,0,0);adv(s,6,5,0,1);adv(s,6,5,1,0);pose(s,39,2,2);
  assert(!codes(s).some(c=>c.startsWith('h00')),'bloque non propose');assert(codes(s).every(c=>c.slice(1,3)!==c.slice(3)),'toujours deplace');
  // grille adverse pleine : tout Golem ciblable, reste en place, perd 1
  s=prep([39]);for(let l=0;l<3;l++)for(let k=0;k<3;k++)adv(s,6,5,l,k);s.j[1].grille[1][1]={c:27,f:4,d:0};pose(s,39,0,0);
  assert.strictEqual(codes(s).length,8,'8 cibles, Mode Avion exclu');assert(codes(s).includes('h0000'));
  M.applique(s,0,{t:'h',l:0,k:0,m:0,n:0});assert.strictEqual(s.j[1].grille[0][0].d,1,'perd 1 sur place');
  assert(s.log.some(x=>/reste en place \(aucune case libre\) et perd 1/.test(x[1])));
  // une seule option : d'office ; Mode Avion jamais cible ; K-Chan gagne sa Rage
  s=prep([39]);adv(s,30,2,0,0);adv(s,27,4,0,1);adv(s,27,4,1,0);pose(s,39,2,2);assert(!s.attente,'option unique');
  assert.strictEqual(s.j[1].grille[0][0].c,30);assert.strictEqual(s.j[1].grille[0][0].d,1);assert.strictEqual(s.j[1].grille[0][0].ra,1,'Rage');
  assert.strictEqual(s.j[1].grille[0][1].d,0,'Mode Avion non cible');
  // Golem tue par le Slam (Force 1)
  s=prep([39]);adv(s,6,1,0,0);pose(s,39,1,1);M.applique(s,0,{t:'h',l:0,k:0,m:0,n:1});assert.strictEqual(s.j[1].grille[0][1],null,'mort');
  // GymRat : deplace mais ne perd rien
  s=prep([39]);adv(s,42,3,0,0);pose(s,39,1,1);assert(s.attente&&s.attente.t==='h','GymRat reste ciblable');
  M.applique(s,0,{t:'h',l:0,k:0,m:0,n:1});assert.strictEqual(s.j[1].grille[0][1].c,42,'GymRat deplace');assert.strictEqual(s.j[1].grille[0][1].d,0,'Menfou palu contre Slam');
  assert(s.log.some(x=>/Menfou palu, ne perd pas de Force/.test(x[1])));
  // GymRat contre Slim K : l'autre Golem de la ligne perd 1, pas GymRat
  s=prep([0,3]);adv(s,42,3,0,0);adv(s,6,5,0,2);pose(s,0,0,1);pose(s,3,0,1);
  assert.strictEqual(s.j[1].grille[0][0].d,0,'Menfou palu contre Slim K');assert.strictEqual(s.j[1].grille[0][2].d,1,'Slim K touche les autres');
  // GymRat contre Ragebait
  s=prep([12,33,36]);pose(s,12,1,0);pose(s,33,2,2);adv(s,42,3,1,0);pose(s,36,2,2);
  assert.strictEqual(s.j[0].grille[2][2].fav,12);assert.strictEqual(s.j[1].grille[1][0].d,0,'Menfou palu contre Ragebait');
  // l'evolution n'a pas de Slam
  s=prep([39,42]);pose(s,39,1,1);pose(s,42,1,1);assert.strictEqual(M.carte(s.j[0].grille[1][1].c).id,'009e');assert(!s.attente,'evolution sans Slam');
  // parties aleatoires et robot avec Glad : rejeu identique, sans blocage
  let nS=0,nM=0;
  for(let i=0;i<150;i++){const r=partie((i*7741+11)|0,[D,D]);nS+=r.s.log.filter(x=>/Slam, .* perd 1/.test(x[1])).length}
  const niv=['facile','normal','difficile'];
  for(let i=0;i<300;i++){const gr=(i*15485863+17)|0,s=M.nouvelle(gr,[D,D]),j=[[],[]];let pas=0;
    while(!s.fin){assert(++pas<2000,'blocage robot Glad '+gr);const p=M.attendus(s)[0],a=M.robot(s,p,niv[(i+p)%3]);assert(a,'robot sans coup');M.applique(s,p,a);j[p].push(M.code(a));verifie(s)}
    nM+=s.log.filter(x=>/Menfou palu/.test(x[1])).length;
    const r=M.rejoue(gr,[M.litJournal(M.ecritJournal(j[0])),M.litJournal(M.ecritJournal(j[1]))],[D,D]);assert(!r.erreur,r.erreur);assert.strictEqual(JSON.stringify(r.etat),JSON.stringify(s),'rejeu Glad');M.bilan(s)}
  assert(nS>0,'Glad jamais joue');
  console.log('Glad 0.2a.2 OK : 150 parties aleatoires ('+nS+' Slam) et 300 parties robot sans blocage ('+nM+' Menfou palu), rejeux identiques');
}
{ // 0.2b : K-Chan (008) Magma + Brume au lieu de Magma + Roche. Ids : K-Chan 30-32, Trigas 24, Cyrdan 12, Alrevan 6, Le Q 18, Glad 39.
  assert(['0.2b','0.2b.1','0.2b.2','0.2c','0.3','0.4'].includes(M.VERSION));assert.deepStrictEqual(M.CARTES['008'].el,['magma','cristal'],'K-Chan Magma + Cristal');
  const s=vide();s.j[0].grille[1][1]=gol(30,2);
  s.j[0].grille[0][1]=gol(24,1);assert.strictEqual(M.forceDe(s,0,1,1),2,'Trigas voisin : plus de Trait');
  s.j[0].grille[0][1]=gol(12,1);assert.strictEqual(M.forceDe(s,0,1,1),2+2,'Cyrdan voisin : son +1 et Trait Cristal');
  s.j[0].grille[0][1]=gol(6,3);assert.strictEqual(M.forceDe(s,0,1,1),2,'Alrevan : plus rien en commun');
  s.j[0].grille[0][1]=null;s.j[1].grille[1][1]=gol(24,3);assert.strictEqual(M.forceDe(s,0,1,1),2+1,'Trigas en face : Cristal domine Foudre, cercle +1');
  s.j[1].grille[1][1]=gol(39,3);assert.strictEqual(M.forceDe(s,0,1,1),2,'Glad en face : plus de cercle');
  s.j[1].grille[1][1]=gol(12,1);assert.strictEqual(M.forceDe(s,0,1,1),2+1,'Cyrdan en face : Magma domine Cristal, cercle +1');
  const D=M.deckTexte({'002':3,'003':3,'004':3,'007':3,'008':3,'009':3,'013':3,'001':3});assert(M.lisDeck(D),'deck K-Chan valide');
  let nR=0;const niv=['facile','normal','difficile'];
  for(let i=0;i<150;i++){const r=partie((i*6151+29)|0,[D,D]);nR+=r.s.log.filter(x=>/Rage/.test(x[1])).length}
  for(let i=0;i<300;i++){const gr=(i*104729+31)|0,s=M.nouvelle(gr,[D,i%2?D:'']),j=[[],[]];let pas=0;
    while(!s.fin){assert(++pas<2000,'blocage robot K-Chan '+gr);const p=M.attendus(s)[0],a=M.robot(s,p,niv[(i+p)%3]);assert(a,'robot sans coup');M.applique(s,p,a);j[p].push(M.code(a));verifie(s)}
    nR+=s.log.filter(x=>/Rage/.test(x[1])).length;
    const r=M.rejoue(gr,[M.litJournal(M.ecritJournal(j[0])),M.litJournal(M.ecritJournal(j[1]))],[D,i%2?D:'']);assert(!r.erreur,r.erreur);assert.strictEqual(JSON.stringify(r.etat),JSON.stringify(s),'rejeu K-Chan');M.bilan(s)}
  assert(nR>0,'Rage jamais declenchee');
  console.log('K-Chan 0.2b OK : Trait et cercle Magma + Cristal, 150 parties aleatoires et 300 parties robot sans blocage ('+nR+' Rage), rejeux identiques');
}
{ // Apo (029, 029e), SuperFishman (037, 037e), Titom76 (026, 026e). Ids : Apo 45-47, Maitre du deguisement 48-50, SuperFishman 51-53, Monsieur Poisson 54-56, Titom76 57-59, Maitre du bilig 60-62.
  // Anciens : KaTarN 0, Slim K 3, Alrevan 6, Cyrdan 12, Le Q 18, Trigas 24, Roi du Mobile 27, K-Chan 30, Indra 33, Glad 39, GymRat 42.
  assert.strictEqual(M.carte(45).id,'029');assert.strictEqual(M.carte(62).id,'026e');assert.strictEqual(M.code({t:'p',c:62,l:1,k:2}),'p_12');assert.strictEqual(M.decode('p_12').c,62);
  assert.deepStrictEqual(M.decode('k10'),{t:'k',l:1,k:0});assert.deepStrictEqual(M.decode('z22'),{t:'z',l:2,k:2});
  const D=M.deckTexte({'029':3,'029e':3,'037':3,'037e':3,'026':3,'026e':3,'003':3,'001':3});assert(M.lisDeck(D),'deck essai valide');
  const prep=(main,rg)=>{const s=M.nouvelle(5,[D,D]);s.phase='jeu';s.mull=[true,true];s.joueur=0;s.premier=0;const J=s.j[0];J.etapeForge=false;J.energie=30;J.main=main.slice();s.j[1].main=[];
    s.terrains=[TA(1),TA(8),TA(4)];if(rg!==undefined)s.rng=[rg,rg*7];return s}; /* Carrousel, Ecran du MJ, Salle : ni Faille, ni Vaisseau, ni Boutique */
  const pose=(s,c,l,k)=>M.applique(s,0,{t:'p',c,l,k});
  const adv=(s,c,f,l,k,x)=>{s.j[1].grille[l][k]={c,f,d:0,...(x||{})}};
  const moi=(s,c,f,l,k,x)=>{s.j[0].grille[l][k]={c,f,d:0,...(x||{})}};
  const de=s=>{const m=s.log.map(x=>/lance (\d)/.exec(x[1])).filter(Boolean).pop();return m?+m[1]:null};
  // --- Gamba : les 6 faces, Golem en face, rien en face, Mode Avion, GymRat, K-Chan
  const vus=new Set();
  for(let g=1;g<300;g++){
    let s=prep([45],g);adv(s,6,5,1,1);pose(s,45,1,1);const v=de(s);vus.add(v);
    if(v<=2){assert.strictEqual(s.j[0].grille[1][1],null,'Gamba 1-2 : Apo 2-2 meurt');assert(s.j[0].defausse.includes(45));assert.strictEqual(s.j[1].grille[1][1].d,0)}
    else if(v<=4){assert.strictEqual(s.j[0].grille[1][1].d,0);assert.strictEqual(s.j[1].grille[1][1].d,0,'Gamba 3-4 : rien')}
    else{assert.strictEqual(s.j[0].grille[1][1].d,0);assert.strictEqual(s.j[1].grille[1][1].d,2,'Gamba 5-6 : -2 en face')}
    s=prep([45],g);moi(s,39,1,0,1);pose(s,45,1,1);
    if(v<=2){assert.strictEqual(s.j[0].grille[1][1].d,2,'Apo survit grace au Trait');assert.strictEqual(M.forceDe(s,0,1,1),2+2-2)}
    if(v>=5)assert(s.log.some(x=>/aucun Golem en face/.test(x[1])),'Gamba sans Golem en face');
    s=prep([45],g);adv(s,27,4,1,1);pose(s,45,1,1);if(v>=5){assert.strictEqual(s.j[1].grille[1][1].d,0,'Mode Avion');assert(s.log.some(x=>/protégé \(Mode Avion\)/.test(x[1])))}
    s=prep([45],g);adv(s,42,3,1,1);pose(s,45,1,1);if(v>=5)assert.strictEqual(s.j[1].grille[1][1].d,0,'Menfou palu');
    s=prep([45],g);adv(s,30,5,1,1);pose(s,45,1,1);if(v>=5){assert.strictEqual(s.j[1].grille[1][1].d,2);assert.strictEqual(s.j[1].grille[1][1].ra,1,'Rage')}
  }
  assert.strictEqual(vus.size,6,'six faces');
  // --- Deguisement sans voisin
  let s=prep([48]);moi(s,45,2,1,1);pose(s,48,1,1);let A=s.j[0].grille[1][1];
  assert(!s.attente&&A.cp===null,'sans voisin : rien');assert.strictEqual(M.forceDe(s,0,1,1),3);assert(s.log.some(x=>/aucun voisin, rien à copier/.test(x[1])));
  // un seul voisin : copie d'office (Cyrdan : voisins +1)
  s=prep([48]);moi(s,45,2,1,1);moi(s,12,1,0,1);pose(s,48,1,1);A=s.j[0].grille[1][1];
  assert(!s.attente);assert.strictEqual(A.cp,'003','copie Cyrdan');assert.strictEqual(M.forceDe(s,0,0,1),1+1+1,'Cyrdan recoit +1 du deguise et +1 de Trait Roche');
  assert.strictEqual(M.forceDe(s,0,1,1),3+1+1,'Apo : aura de Cyrdan + Trait Roche');
  // la diagonale n'est pas voisine
  s=prep([48]);moi(s,45,2,1,1);moi(s,12,1,0,0);pose(s,48,1,1);assert.strictEqual(s.j[0].grille[1][1].cp,null,'diagonale');
  // copie de Gamba : le deguise lance le de, perd 2 sur 1-2, -2 en face sur 5-6
  const vg=new Set();
  for(let g=1;g<200;g++){s=prep([48],g);moi(s,45,2,1,1);moi(s,45,2,0,1);adv(s,6,6,1,1);pose(s,48,1,1);A=s.j[0].grille[1][1];
    assert.strictEqual(A.cp,'029','copie de Gamba');const v=de(s);vg.add(v);assert(s.log.some(x=>/\(Gamba\) lance/.test(x[1])));
    if(v<=2)assert.strictEqual(A.d,2,'deguise perd 2');else assert.strictEqual(A.d,0);
    assert.strictEqual(s.j[1].grille[1][1].d,v>=5?2:0)}
  assert.strictEqual(vg.size,6);
  // copie de KaTarN, inconvenient compris : -4 en fin de manche
  s=prep([48]);moi(s,45,2,1,0);moi(s,0,8,0,0);pose(s,48,1,0);assert.strictEqual(s.j[0].grille[1][0].cp,'001');
  s.j[0].main=[];s.joueur=1;s.tour=3;s.j[1].etapeForge=false;M.applique(s,1,{t:'x'});
  assert.strictEqual(s.j[0].grille[1][0],null,'deguise en KaTarN : 3+1-4 = 0, detruit');assert.strictEqual(s.j[0].grille[0][0].d,4);
  // plusieurs voisins : choix 'k', robot deterministe, copie d'Indra puis choix du favori
  s=prep([48]);moi(s,45,2,1,1);moi(s,0,8,0,1);moi(s,33,2,1,0);moi(s,24,1,1,2);pose(s,48,1,1);
  assert(s.attente&&s.attente.t==='k','choix du deguisement');assert.deepStrictEqual(M.legales(s,0).map(M.code).sort(),['k01','k10','k12']);
  const r1=M.robot(s,0,'difficile');assert.deepStrictEqual(r1,M.robot(s,0,'difficile'),'robot deterministe');assert(r1.t==='k');assert(M.robot(s,0).t==='k');
  M.applique(s,0,{t:'k',l:1,k:0});A=s.j[0].grille[1][1];assert.strictEqual(A.cp,'013');assert(s.attente&&s.attente.t==='g','Indra copiee : favori a choisir');
  assert(!M.legales(s,0).some(a=>a.l===1&&a.k===1),'pas lui-meme');
  M.applique(s,0,{t:'g',l:0,k:1});assert.strictEqual(A.fav,0);assert.strictEqual(M.favori(s,0,0),1,'favori +1 par le deguise');
  // copie de Mode Avion : non ciblable ; copie de GymRat : Menfou palu
  s=prep([48]);moi(s,45,2,1,1);moi(s,27,4,0,1);pose(s,48,1,1);assert(!M.ciblable(s,0,1,1,1),'Mode Avion copie');
  s=prep([48]);moi(s,45,2,1,1);moi(s,42,3,0,1);pose(s,48,1,1);assert.strictEqual(s.j[0].grille[1][1].cp,'009e');
  // copie de Le Q : attente 'q' ; copie de Bretagne : pioche ; copie d'une copie : l'effet copie
  s=prep([48]);s.j[0].deck=[1,2,4];moi(s,45,2,1,1);moi(s,18,1,0,1);pose(s,48,1,1);assert(s.attente&&s.attente.t==='q','Le Q copie');
  s=prep([48]);s.j[0].deck=[1,2,4];s.j[1].deck=[5,7];moi(s,45,2,1,1);moi(s,57,1,0,1);adv(s,24,1,2,2);pose(s,48,1,1);
  assert.strictEqual(s.j[0].main.length,1,'Bretagne copiee : Titom76 seul compte (Apo Magma + Roche)');assert.strictEqual(s.j[1].main.length,1);
  s=prep([48]);moi(s,45,2,1,1);moi(s,48,3,0,1,{cp:'003'});pose(s,48,1,1);assert.strictEqual(s.j[0].grille[1][1].cp,'003','copie d un deguise = son effet copie');
  s=prep([48]);moi(s,45,2,1,1);moi(s,48,3,0,1,{cp:null});pose(s,48,1,1);assert.strictEqual(s.j[0].grille[1][1].cp,null);
  // copie de SuperFishman : cercle +2 avec les elements d'Apo (Roche domine Magma)
  s=prep([48]);moi(s,45,2,1,1);moi(s,51,1,0,1);adv(s,0,8,1,1);pose(s,48,1,1);assert.strictEqual(M.forceDe(s,0,1,1),3+1+2,'Trait Roche + cercle +2');
  // copie de Caramel : bouton z sur le deguise
  s=prep([48]);moi(s,45,2,1,1);moi(s,60,3,0,1,{car:1});pose(s,48,1,1);assert.deepStrictEqual(M.legales(s,0).filter(a=>a.t==='z').map(M.code),['z11'],'Caramel copie, l original deja utilise');
  // --- SuperFishman : Counter-pick
  s=prep([]);moi(s,51,1,0,0);adv(s,0,8,0,0);assert.strictEqual(M.forceDe(s,0,0,0),1+2,'domine KaTarN : +2');
  adv(s,6,3,0,0);assert.strictEqual(M.forceDe(s,0,0,0),1,'Alrevan : pas de cercle');
  s.j[1].grille[0][0]=null;assert.strictEqual(M.forceDe(s,0,0,0),1,'personne en face');
  moi(s,12,1,0,0);adv(s,0,8,0,0);assert.strictEqual(M.forceDe(s,0,0,0),1+1,'Cyrdan : cercle +1 normal');
  // --- Full synergie 0, 1, 2 (+2 maximum), en plus du Trait, cercle +2
  s=prep([]);moi(s,54,2,1,1);assert.strictEqual(M.forceDe(s,0,1,1),2,'0 voisin');
  moi(s,39,1,0,1);assert.strictEqual(M.forceDe(s,0,1,1),2+1+1,'1 element (Roche) : Trait +1, synergie +1');
  moi(s,18,1,1,0);assert.strictEqual(M.forceDe(s,0,1,1),2+2+2,'2 elements : Trait +2, synergie +2');
  moi(s,6,3,2,1);assert.strictEqual(M.forceDe(s,0,1,1),2+3+2,'3e voisin Roche : Trait +1, synergie plafonnee a +2');
  adv(s,24,1,1,1);assert.strictEqual(M.forceDe(s,0,1,1),2+3+2+2,'Trigas en face : Cristal domine Foudre, +2');
  s=prep([]);moi(s,54,2,1,1);moi(s,12,1,1,2);assert.strictEqual(M.forceDe(s,0,1,1),2+1+2+2,'Cyrdan seul : aura +1, Trait +2, synergie +2');
  // --- La Bretagne : 0 et 4 Golems Brume ou Foudre, deck vide
  s=prep([57]);s.j[0].deck=[1,2,4,5,7];s.j[1].deck=[13,14,16];moi(s,24,1,0,0);moi(s,30,2,0,1);moi(s,18,1,0,2);adv(s,12,1,0,0);adv(s,39,1,0,1);
  pose(s,57,1,1);assert.strictEqual(s.j[0].main.length,3,'4 Golems Brume/Foudre : 3 maximum');assert.strictEqual(s.j[1].main.length,0,'0 Golem : rien');
  assert.deepStrictEqual(s.j[0].deck,[5,7]);assert(s.log.some(x=>/La Bretagne : aucune pioche/.test(x[1])));
  /* Deck vide : 1 point a l'adversaire par carte. L'adversaire doit piocher 3 cartes, deck vide : 3 points pour le joueur de Titom76 ; 2 a piocher (Trigas et Titom76, K-Chan n'est ni Brume ni Foudre) avec 1 carte au deck : 1 point pour l'adversaire */
  s=prep([57]);delete s.deckLibre;s.j[0].deck=[1,2];s.j[1].deck=[];adv(s,6,3,0,0);adv(s,0,8,0,1);adv(s,24,1,0,2);pose(s,57,1,1);
  assert.strictEqual(s.j[0].main.length,1,'Titom76 seul : 1');assert.strictEqual(s.j[1].main.length,0,'deck vide');assert(!s.fin&&s.j[0].score===3&&s.j[1].score===0,'Bretagne : 3 points pour le joueur de Titom76');
  s=prep([57]);delete s.deckLibre;s.j[0].deck=[1];moi(s,24,1,0,0);moi(s,30,2,0,1);pose(s,57,1,1);assert.strictEqual(s.j[0].main.length,1,'2 a piocher, 1 carte au deck');assert(!s.fin&&s.j[1].score===1&&s.j[0].score===0,'Bretagne : 1 point pour l adversaire');
  s=prep([60]);s.j[0].deck=[1,2,4];moi(s,57,1,1,1);pose(s,60,1,1);assert.strictEqual(s.j[0].main.length,0,'evolution : pas de Bretagne');
  // --- Caramel a volonte : tour de la pose, une fois par manche, apres la Forge, perdu en fin de tour
  s=prep([60,45]);s.j[0].energie=4;moi(s,57,1,1,1);pose(s,60,1,1);assert.strictEqual(s.j[0].energie,0);
  assert(!M.legales(s,0).some(a=>a.t==='p'),'plus d energie');assert.deepStrictEqual(M.legales(s,0).filter(a=>a.t==='z').map(M.code),['z11'],'Caramel des la pose');
  M.applique(s,0,{t:'z',l:1,k:1});assert.strictEqual(s.j[0].energie,1);assert(!M.legales(s,0).some(a=>a.t==='z'),'une fois par manche');
  assert(M.legales(s,0).some(a=>a.t==='p'&&a.c===45),'Apo payable avec le Caramel');
  s.manche=2;assert(M.legales(s,0).some(a=>a.t==='z'),'manche suivante');s.manche=1;
  M.applique(s,0,{t:'x'});assert.strictEqual(s.j[0].energie,0,'energie perdue en fin de tour');
  s=prep([45]);moi(s,60,3,1,1);s.j[0].etapeForge=true;assert(!M.legales(s,0).some(a=>a.t==='z'),'pas avant la Forge');
  // robot : Caramel seulement s'il paie une carte impayable sinon
  s=prep([51]);s.j[0].energie=1;moi(s,60,3,1,1);adv(s,0,8,0,0);let a=M.robot(s,0,'difficile');assert.strictEqual(a.t,'z','Caramel pour payer SuperFishman');
  M.applique(s,0,a);a=M.robot(s,0,'difficile');assert.strictEqual(a.t,'p','puis la pose');assert.strictEqual(a.c,51);
  s=prep([45]);s.j[0].energie=1;moi(s,60,3,1,1);a=M.robot(s,0,'difficile');assert.notStrictEqual(a.t,'z','inutile : pas de Caramel');
  s=prep([]);s.j[0].energie=0;moi(s,60,3,1,1);assert.notStrictEqual(M.robot(s,0,'difficile').t,'z','main vide : pas de Caramel');
  // --- parties aleatoires et robot avec les trois Golems : rejeu identique, sans blocage
  let nGa=0,nDe=0,nBr=0,nCa=0;
  for(let i=0;i<150;i++){const r=partie((i*7741+23)|0,[D,D]);const L=r.s.log.map(x=>x[1]);nGa+=L.filter(x=>/^Apo.* lance \d : /.test(x)).length;nDe+=L.filter(x=>/déguisement\) copie/.test(x)).length;nBr+=L.filter(x=>/La Bretagne/.test(x)).length;nCa+=L.filter(x=>/Caramel/.test(x)).length}
  const niv=['facile','normal','difficile'];let rDe=0,rCa=0;
  for(let i=0;i<300;i++){const gr=(i*15485863+41)|0,dk=[D,i%2?D:''],s=M.nouvelle(gr,dk),j=[[],[]];let pas=0;
    while(!s.fin){assert(++pas<2000,'blocage robot essai '+gr);const p=M.attendus(s)[0],a=M.robot(s,p,niv[(i+p)%3]);assert(a,'robot sans coup');M.applique(s,p,a);j[p].push(M.code(a));verifie(s)}
    const L=s.log.map(x=>x[1]);rDe+=L.filter(x=>/déguisement\) copie/.test(x)).length;rCa+=L.filter(x=>/Caramel/.test(x)).length;
    const r=M.rejoue(gr,[M.litJournal(M.ecritJournal(j[0])),M.litJournal(M.ecritJournal(j[1]))],dk);assert(!r.erreur,r.erreur);assert.strictEqual(JSON.stringify(r.etat),JSON.stringify(s),'rejeu essai');M.bilan(s)}
  assert(nGa&&nDe&&nBr&&nCa&&rDe&&rCa,'effet jamais joue');
  console.log('Apo, SuperFishman, Titom76 OK : 150 parties aleatoires ('+nGa+' Gamba, '+nDe+' Deguisement, '+nBr+' Bretagne, '+nCa+' Caramel) et 300 parties robot ('+rDe+' Deguisement, '+rCa+' Caramel), rejeux identiques');
}
{ // Spom (036, ids 63-65, codes ~0 ~1 ~2) et Survolte (036e, ids 66-68, codes ~3 ~4 ~5), coup 'j' (Forge eclair).
  // Autres : KaTarN 0 (Magma Foudre), Cyrdan 12 (Cristal Roche), Trigas 24 (Foudre Brume), Apo 45, Maitre du deguisement 48, Titom76 57 (Brume Foudre).
  let nv=0;const ok=(c,m)=>{assert(c,m);nv++},eq=(a,b,m)=>{assert.strictEqual(a,b,m);nv++},deq=(a,b,m)=>{assert.deepStrictEqual(a,b,m);nv++};
  eq(M.carte(63).id,'036');eq(M.carte(65).id,'036');eq(M.carte(66).id,'036e');eq(M.carte(68).id,'036e');eq(M.nomDetail(M.carte(66)),'Spom (A encore menti)');
  deq(M.CARTES['036'].el,['foudre','magma']);eq(M.CARTES['036'].cout,2);eq(M.CARTES['036'].force,1);eq(M.CARTES['036e'].cout,6);eq(M.CARTES['036e'].force,0);eq(M.CARTES['036e'].base,'036');
  eq(M.TYPES.indexOf('036'),21);eq(M.TYPES.indexOf('036e'),22);eq(M.TYPES_TEST.length,11,'paquet de test inchange');
  // --- encodage : anciens codes inchanges, 63 et plus = '~' + 1 caractere
  eq(M.code({t:'f',c:0}),'f0');eq(M.code({t:'f',c:35}),'fz');eq(M.code({t:'f',c:36}),'fA');eq(M.code({t:'f',c:61}),'fZ');eq(M.code({t:'f',c:62}),'f_');
  eq(M.code({t:'f',c:63}),'f~0');eq(M.code({t:'f',c:68}),'f~5');eq(M.code({t:'p',c:66,l:2,k:1}),'p~321');eq(M.code({t:'j',c:63}),'j~0');eq(M.code({t:'f',c:125}),'f~_','limite du schema');
  deq(M.decode('j~0'),{t:'j',c:63});deq(M.decode('p~321'),{t:'p',c:66,l:2,k:1});deq(M.decode('p_12'),{t:'p',c:62,l:1,k:2});deq(M.decode('pJ00'),{t:'p',c:45,l:0,k:0});
  deq(M.decode('f~_'),{t:'f',c:125});deq(M.decode('ja'),{t:'j',c:10});
  eq(M.code({t:'m',c:[68,5,63]}),'m5~0~5','mulligan trie, jetons mixtes');deq(M.decode('m5~0~5'),{t:'m',c:[5,63,68]});deq(M.decode('m~0~1~2'),{t:'m',c:[63,64,65]});deq(M.decode('m'),{t:'m',c:[]});
  eq(M.code({t:'b',o:[68,1,63]}),'b~51~0');deq(M.decode('b~51~0'),{t:'b',o:[68,1,63]});
  for(const x of ['f~','j~','j','f~~~~0','p~0','p~01','p~0122','m~0~1~2~3','b','b~0~1~2~3','j~0x','f~ ','~0','q~0','f-'])assert.throws(()=>M.decode(x),'illisible '+x),nv++;
  for(let c=0;c<69;c++)for(const t of ['f','j','c','d','s']){deq(M.decode(M.code({t,c})),{t,c});eq(M.code({t,c}).length,c<63?2:3)}
  for(let c=0;c<69;c++){deq(M.decode(M.code({t:'p',c,l:1,k:2})),{t:'p',c,l:1,k:2})}
  for(let i=0;i<300;i++){const c=[(i*7)%69,(i*13+5)%69,(i*29+11)%69];deq(M.decode(M.code({t:'m',c})).c,c.slice().sort((a,b)=>a-b));deq(M.decode(M.code({t:'b',o:c})).o,c)}
  const D2=M.deckTexte({'036':3,'036e':3,'029':3,'029e':3,'007':3,'001':3,'003':3,'026':3});ok(M.lisDeck(D2),'deck Spom valide');eq(D2,'0013'+'0033'+'0073'+'0293'+'029e3'+'0263'+'0363'+'036e3','ordre de TYPES');
  const sd=M.nouvelle(9,[D2,D2]);ok([...sd.j[0].deck,...sd.j[0].main].every(c=>M.carte(c).id in M.lisDeck(D2)),'cartes du deck');
  // --- outils
  const prep=(main,rg)=>{const s=M.nouvelle(5,[D2,D2]);s.phase='jeu';s.mull=[true,true];s.joueur=0;s.premier=0;const J=s.j[0];J.etapeForge=false;J.energie=30;J.main=main.slice();J.deck=[];J.forge=[];
    s.j[1].main=[];s.j[1].deck=[];s.j[1].etapeForge=false;s.deckLibre=true;s.terrains=[TA(1),TA(8),TA(4)];if(rg!==undefined)s.rng=[rg,rg*7];return s};
  const moi=(s,c,f,l,k,x)=>{s.j[0].grille[l][k]={c,f,d:0,...(x||{})}};
  const adv=(s,c,f,l,k,x)=>{s.j[1].grille[l][k]={c,f,d:0,...(x||{})}};
  const pose=(s,c,l,k)=>M.applique(s,0,{t:'p',c,l,k});
  const codes=s=>M.legales(s,0).map(M.code);
  /* fin du tour du joueur 0, tour du joueur 1 sans rien faire, retour au debut du tour suivant du joueur 0 */
  const tourSuivant=s=>{M.applique(s,0,{t:'x'});if(s.attente&&s.attente.t==='d')M.applique(s,0,{t:'d',c:s.j[0].main[0]});
    if(s.j[1].etapeForge)M.applique(s,1,{t:'n'});M.applique(s,1,{t:'x'});eq(s.joueur,0,'retour au joueur 0')};
  const reprises=s=>s.log.filter(x=>/reprend 1 carte/.test(x[1])).length;
  // --- tour de la pose : pas de Forge eclair ; tour suivant : oui, en plus de la Forge normale
  let s=prep([63,12,13]);s.j[0].forge=[14,15];s.j[0].energie=2;s.j[0].deck=[16,17,18,19];pose(s,63,1,1);
  ok(!codes(s).some(x=>x[0]==='j'),'pas de Forge eclair au tour de la pose');assert.throws(()=>M.applique(s,0,{t:'j',c:12}),'j hors etape');nv++;
  tourSuivant(s);let J=s.j[0];eq(J.eclair,1,'1 Spom en jeu');ok(J.etapeForge,'etape de Forge');eq(J.energie,2);
  deq(codes(s).filter(x=>x[0]==='j').sort(),['jc','jd','jg','jh'],'Forge eclair sur chaque carte de la main');ok(codes(s).includes('fc')&&codes(s).includes('n'),'Forge normale et refus');
  ok(!codes(s).some(x=>x[0]==='p'||x==='x'),'rien d autre pendant la Forge');
  M.applique(s,0,{t:'j',c:12});eq(J.energie,3,'+1 energie des ce tour');deq(J.forge,[14,15,12]);eq(J.eclair,0);eq(J.eclairUtil,1);ok(J.etapeForge,'la Forge normale reste possible');
  ok(!codes(s).some(x=>x[0]==='j'),'une seule Forge eclair par Spom');ok(codes(s).some(x=>x[0]==='f'));
  M.applique(s,0,{t:'f',c:13});eq(J.energie,4,'Forge normale en plus');ok(!J.etapeForge,'fin de l etape');ok(codes(s).includes('x'));
  const mainAv=J.main.length;M.applique(s,0,{t:'x'});eq(J.forge.length,3,'reprise : 4 - 1, la Forge normale reste');eq(s.j[0].main.length,mainAv+1,'carte reprise en main');
  ok([14,15,12,13].filter(c=>!J.forge.includes(c)).length===1&&J.main.some(c=>[14,15,12,13].includes(c)),'la carte reprise vient de la Forge');eq(reprises(s),1);
  ok(s.log.some(x=>/Forge éclair, forge 1 carte de plus/.test(x[1])));ok(s.stats.act.some(x=>x.nom==='Forge éclair'));
  // ordre inverse : Forge normale puis Forge eclair ; l'etape continue tant qu'il reste une Forge eclair
  s=prep([63,12,13]);s.j[0].forge=[14,15];s.j[0].deck=[16,17,18,19];pose(s,63,1,1);tourSuivant(s);J=s.j[0];
  M.applique(s,0,{t:'f',c:12});ok(J.etapeForge,'Forge eclair encore possible');deq(codes(s).sort(),['jd','jg','jh','n'],'apres la Forge normale : j ou refus');
  M.applique(s,0,{t:'j',c:13});ok(!J.etapeForge);eq(J.energie,4);M.applique(s,0,{t:'x'});eq(J.forge.length,3);eq(reprises(s),1);
  // refus : 'n' tout de suite, ou Forge normale puis 'n' : aucune reprise
  s=prep([63,12,13]);s.j[0].forge=[14,15];s.j[0].deck=[16,17,18,19];pose(s,63,1,1);tourSuivant(s);J=s.j[0];
  M.applique(s,0,{t:'n'});ok(!J.etapeForge);eq(J.energie,2);M.applique(s,0,{t:'x'});deq(J.forge,[14,15],'refus : Forge intacte');eq(reprises(s),0);
  s=prep([63,12,13]);s.j[0].forge=[14,15];s.j[0].deck=[16,17,18,19];pose(s,63,1,1);tourSuivant(s);J=s.j[0];
  M.applique(s,0,{t:'f',c:12});M.applique(s,0,{t:'n'});ok(!J.etapeForge);eq(J.energie,3);M.applique(s,0,{t:'x'});deq(J.forge,[14,15,12],'Forge normale seule : pas de reprise (interpretation a)');eq(reprises(s),0);
  // Forge eclair seule (sans Forge normale), puis refus de la Forge normale : reprise quand meme
  s=prep([63,12,13]);s.j[0].forge=[14,15];s.j[0].deck=[16,17,18,19];pose(s,63,1,1);tourSuivant(s);J=s.j[0];
  M.applique(s,0,{t:'j',c:12});M.applique(s,0,{t:'n'});eq(J.energie,3);M.applique(s,0,{t:'x'});eq(J.forge.length,2,'Forge eclair seule : taille d avant');eq(reprises(s),1);
  // main vide au debut du tour : pas d'etape de Forge, rien a reprendre ; main d'une carte : l'etape s'arrete
  s=prep([63]);s.j[0].forge=[14];pose(s,63,1,1);tourSuivant(s);J=s.j[0];ok(!J.etapeForge,'main et deck vides : pas de Forge');ok(!codes(s).some(x=>x[0]==='j'));
  M.applique(s,0,{t:'x'});deq(J.forge,[14]);eq(reprises(s),0);
  s=prep([63]);s.j[0].forge=[14];s.j[0].deck=[16];pose(s,63,1,1);tourSuivant(s);J=s.j[0];deq(J.main,[16]);
  M.applique(s,0,{t:'j',c:16});ok(!J.etapeForge,'main vide : fin de l etape');deq(J.main,[]);eq(J.energie,2);M.applique(s,0,{t:'x'});eq(J.forge.length,1);eq(J.main.length,1,'la reprise rend une carte');
  // la reprise passe avant la defausse a 7 cartes
  s=prep([63,12,13,14,15,16,17]);s.j[0].forge=[18];s.j[0].deck=[19,20];pose(s,63,1,1);tourSuivant(s);J=s.j[0];eq(J.main.length,8);
  M.applique(s,0,{t:'j',c:12});M.applique(s,0,{t:'n'});eq(J.main.length,7);M.applique(s,0,{t:'x'});eq(J.main.length,8,'reprise faite');ok(s.attente&&s.attente.t==='d','puis defausse a 7');
  M.applique(s,0,{t:'d',c:J.main[0]});eq(J.main.length,7);eq(s.joueur,1);
  // reprise au hasard dans toute la Forge (la carte qui vient d'etre forgee comprise), identique a etat egal
  const vusR=new Set();let deja=0;
  for(let g=1;g<200;g++){
    const run=()=>{const u=prep([63,12],g);u.j[0].forge=[13,14,15];u.j[0].deck=[16,17];pose(u,63,1,1);tourSuivant(u);M.applique(u,0,{t:'j',c:12});M.applique(u,0,{t:'n'});M.applique(u,0,{t:'x'});return u};
    const u=run(),v=run(),r=[12,13,14,15].find(c=>!u.j[0].forge.includes(c));vusR.add(r);if(r===12)deja++;
    eq(JSON.stringify(u),JSON.stringify(v),'meme graine, meme reprise');eq(u.j[0].forge.length,3);ok(u.j[0].main.includes(r));
  }
  eq(vusR.size,4,'les 4 cartes de la Forge peuvent revenir');ok(deja>20&&deja<90,'la carte forgee ce tour revient environ 1 fois sur 4 : '+deja);
  // plusieurs Spom : 1 Forge eclair et 1 reprise chacun
  s=prep([12,13,14,15]);moi(s,63,1,0,0);moi(s,64,1,2,2);s.j[0].forge=[16];s.j[0].deck=[17,18];tourSuivant(s);J=s.j[0];eq(J.eclair,2,'2 Spom');
  M.applique(s,0,{t:'j',c:12});ok(codes(s).some(x=>x[0]==='j'),'2e Forge eclair');M.applique(s,0,{t:'j',c:13});ok(!codes(s).some(x=>x[0]==='j'));ok(J.etapeForge);
  M.applique(s,0,{t:'f',c:14});ok(!J.etapeForge);eq(J.energie,4,'1 + 3 cartes forgees');M.applique(s,0,{t:'x'});eq(J.forge.length,2,'2 reprises : 4 - 2');eq(reprises(s),2);
  s=prep([12,13,14,15]);moi(s,63,1,0,0);moi(s,64,1,2,2);s.j[0].forge=[16];s.j[0].deck=[17,18];tourSuivant(s);J=s.j[0];
  M.applique(s,0,{t:'j',c:12});M.applique(s,0,{t:'n'});M.applique(s,0,{t:'x'});eq(J.forge.length,1,'1 seule Forge eclair utilisee : 1 reprise');eq(reprises(s),1);
  // Spom qui quitte le jeu pendant le tour, apres la Forge eclair : la reprise a lieu quand meme (interpretation b)
  s=prep([63,12,13,6]);s.j[0].forge=[14];s.j[0].deck=[16,17];pose(s,63,1,1);tourSuivant(s);J=s.j[0];
  M.applique(s,0,{t:'j',c:12});M.applique(s,0,{t:'n'});J.energie=30;pose(s,6,1,1);ok(M.carte(J.grille[1][1].c).id==='002'&&J.defausse.includes(63),'Spom remplace');
  M.applique(s,0,{t:'x'});eq(J.forge.length,1,'reprise malgre Spom parti');eq(reprises(s),1);
  s=prep([63,12,13]);s.j[0].forge=[14];s.j[0].deck=[16,17];pose(s,63,1,1);tourSuivant(s);J=s.j[0];
  M.applique(s,0,{t:'j',c:12});M.applique(s,0,{t:'n'});J.grille[1][1].d=9;J.energie=30;pose(s,13,0,0);ok(!J.grille[1][1]&&J.defausse.includes(63),'Spom mort pendant le tour');
  M.applique(s,0,{t:'x'});eq(J.forge.length,1);eq(reprises(s),1,'reprise apres la mort de Spom');
  // Spom mort pendant le tour adverse : plus de Forge eclair au tour suivant
  s=prep([12,13]);moi(s,63,1,1,1);s.j[0].deck=[16,17];M.applique(s,0,{t:'x'});s.j[0].grille[1][1]=null;M.applique(s,1,{t:'x'});eq(s.j[0].eclair,0);ok(!codes(s).some(x=>x[0]==='j'));
  // evolution : Survolte remplace Spom, plus de Forge eclair (interpretation e) ; evoluer apres une Forge eclair garde la reprise due
  s=prep([66,12,13]);moi(s,63,1,1,1);s.j[0].deck=[16,17,18,19];pose(s,66,1,1);eq(M.carte(s.j[0].grille[1][1].c).id,'036e');tourSuivant(s);eq(s.j[0].eclair,0,'evolution : plus de Forge eclair');ok(!codes(s).some(x=>x[0]==='j'));
  s=prep([66,12,13]);moi(s,63,1,1,1);s.j[0].deck=[16,17];s.j[0].forge=[14];tourSuivant(s);J=s.j[0];M.applique(s,0,{t:'j',c:12});M.applique(s,0,{t:'n'});J.energie=30;pose(s,66,1,1);M.applique(s,0,{t:'x'});eq(reprises(s),1,'evolution apres Forge eclair : reprise due');
  // Apo evolue qui copie Spom : Forge eclair (interpretation d), en plus de celle de Spom ; seul s'il reste
  s=prep([48,12,13,14]);moi(s,63,1,1,1);moi(s,45,2,1,2);pose(s,48,1,2);eq(s.j[0].grille[1][2].cp,'036','copie de Spom');s.j[0].deck=[16,17];tourSuivant(s);J=s.j[0];eq(J.eclair,2,'Spom + Apo deguise');
  M.applique(s,0,{t:'j',c:12});M.applique(s,0,{t:'j',c:13});M.applique(s,0,{t:'n'});M.applique(s,0,{t:'x'});eq(reprises(s),2);
  s=prep([12,13]);moi(s,48,3,0,0,{cp:'036'});s.j[0].deck=[16,17];tourSuivant(s);eq(s.j[0].eclair,1,'Apo deguise en Spom, seul');
  // --- Survolte : +1 par Golem Foudre de sa grille, lui compris ; diagonales pour eviter Trait et Cyrdan
  s=prep([]);moi(s,66,0,1,1);eq(M.forceDe(s,0,1,1),1,'seul : 1 (lui-meme)');eq(M.foudres(s.j[0].grille),1);
  moi(s,24,1,0,0);eq(M.forceDe(s,0,1,1),2,'+ Trigas');moi(s,0,8,2,2);eq(M.forceDe(s,0,1,1),3,'+ KaTarN');
  moi(s,12,1,0,2);eq(M.forceDe(s,0,1,1),3,'Cyrdan n est pas Foudre');adv(s,57,1,2,0);adv(s,24,1,0,0);eq(M.forceDe(s,0,1,1),3,'Foudre adverses non comptes');
  moi(s,57,1,2,0);eq(M.forceDe(s,0,1,1),4,'Titom76 (Brume Foudre)');moi(s,63,1,0,1);eq(M.forceDe(s,0,1,1),7,'Spom voisin : +1 Foudre, +2 Trait (Foudre et Magma)');
  // continu : la mort d'un allie Foudre fait baisser la Force, jusqu'a la mort en chaine
  s=prep([12]);moi(s,66,0,1,1,{d:1});moi(s,24,1,0,0,{d:5});moi(s,0,8,2,2);eq(M.forceDe(s,0,1,1),2);pose(s,12,0,2);ok(!s.j[0].grille[0][0],'Trigas meurt');eq(M.forceDe(s,0,1,1),1,'Survolte perd 1');
  s=prep([12]);moi(s,66,0,1,1,{d:2});moi(s,24,1,0,0,{d:5});moi(s,0,8,2,2);pose(s,12,0,2);ok(!s.j[0].grille[1][1],'Survolte meurt en chaine');ok(s.log.some(x=>/Spom \(A encore menti\) meurt ensuite/.test(x[1])));
  // pose de Survolte sur Spom : Force recalculee aussitot
  s=prep([66]);moi(s,63,1,1,1);moi(s,24,1,0,0);moi(s,57,1,2,2);pose(s,66,1,1);eq(M.forceDe(s,0,1,1),3,'Survolte pose : 3 Foudre');
  // Apo evolue qui copie Survolte : +1 par Golem Foudre de sa grille (Apo n'est pas Foudre)
  s=prep([48]);moi(s,66,0,1,1);moi(s,45,2,1,2);pose(s,48,1,2);eq(s.j[0].grille[1][2].cp,'036e','copie de Survolte');
  eq(M.forceDe(s,0,1,2),3+1+1,'Apo : 3 + Trait Magma + 1 Foudre (Survolte)');eq(M.forceDe(s,0,1,1),0+1+1,'Survolte : Trait Magma + lui-meme');
  moi(s,24,1,0,0);eq(M.forceDe(s,0,1,2),6,'+ Trigas');eq(M.forceDe(s,0,1,1),3);
  // bilan : le bonus de Survolte est explique (recu par Survolte, donne par les autres Golems Foudre)
  s=prep([]);moi(s,66,0,1,1);moi(s,24,1,0,0);moi(s,0,8,2,2);s.manche=3;s.j[1].etapeForge=false;finDeManche(s);ok(s.fin,'partie finie');
  let B=M.bilan(s),cs=B.joueurs[0].cartes,sp=cs.find(c=>c.carte==='Spom (A encore menti)'),tg=cs.find(c=>c.carte==='Trigas'),kt=cs.find(c=>c.carte==='KaTarN');
  eq(sp.bonusRecus.survolte,3,'Survolte recoit 3');eq(sp.bonusDonnes.survolte,undefined,'ne se donne rien');eq(tg.bonusDonnes.survolte,1);eq(kt.bonusDonnes.survolte,1);
  eq(sp.forceTerrains,3,'Force au decompte');
  
  // --- robot : Forge eclair si une carte est impayable ce tour meme avec l'energie en plus, et seulement alors
  const robotForge=(main,forge,manche,niv)=>{const u=prep(main);moi(u,63,1,1,1);u.manche=manche;u.tour=2;const K=u.j[0];K.forge=forge.slice();K.energie=forge.length;K.etapeForge=true;K.eclair=1;K.eclairUtil=0;K.aForge=false;return [u,M.robot(u,0,niv)]};
  for(const niv of ['normal','difficile']){
    let [u,a]=robotForge([1,12],[14,15,16,17,18,19],2,niv);ok(a.t==='f'||a.t==='j',niv+' : forge');
    let n=0;while(u.j[0].etapeForge&&n++<5){a=M.robot(u,0,niv);ok(M.legales(u,0).some(x=>M.code(x)===M.code(a)),'coup legal');M.applique(u,0,a)}
    ok(u.log.some(x=>/Forge éclair/.test(x[1])),niv+' : KaTarN impayable en manche 2, Forge eclair');ok(u.j[0].forge.includes(1),niv+' : forge KaTarN');
    [u,a]=robotForge([12,13],[14,15,16,17,18,19],2,niv);n=0;while(u.j[0].etapeForge&&n++<5){a=M.robot(u,0,niv);ok(a.t!=='j',niv+' : tout est payable, pas de Forge eclair');M.applique(u,0,a)}
    [u,a]=robotForge([66,12,13],[14],2,niv);n=0;while(u.j[0].etapeForge&&n++<5){a=M.robot(u,0,niv);M.applique(u,0,a)}deq(u.j[0].forge,[14,13,66],niv+' : Forge normale de Cyrdan, puis Forge eclair de Survolte (6, impayable avec 3 energie)');
    [u,a]=robotForge([12],[14],2,niv);ok(a.t!=='j','main d une carte : garde sa carte');
  }
  // robot : estime Spom et Survolte a la pose sans planter, et prend Survolte quand il y a des Golems Foudre
  for(const niv of ['facile','normal','difficile']){
    s=prep([63,66,48,12]);moi(s,63,1,1,1);moi(s,45,2,1,2);moi(s,24,1,0,0);s.j[0].energie=8;
    for(let i=0;i<6&&!s.fin&&s.joueur===0&&!s.attente;i++){const a=M.robot(s,0,niv);ok(a,'coup');M.applique(s,0,a);if(a.t==='x')break}
  }
  s=prep([66]);moi(s,63,1,1,1);moi(s,24,1,0,0);moi(s,0,8,2,2);moi(s,57,1,2,0);adv(s,39,2,1,1);s.j[0].energie=6;let a=M.robot(s,0,'difficile');deq(a,{t:'p',c:66,l:1,k:1},'Survolte avec 4 Golems Foudre : 4 contre 3 au lieu de 1 contre 3');
  ok(M.robot(s,0,'normal').c===66,'normal aussi');
  // --- parties aleatoires (coups au hasard, Forge eclair favorisee) et robot contre robot : sans exception ni blocage, rejeux identiques
  const partieJ=(gr,dk)=>{const u=M.nouvelle(gr,dk),j=[[],[]];let pas=0;
    while(!u.fin){assert(++pas<2000,'blocage Spom '+gr);const att=M.attendus(u);const p=att[rnd(att.length)],l=M.legales(u,p);assert(l.length,'aucune action '+gr);
      const pref=l.filter(x=>x.t==='p'||x.t==='f'||x.t==='j'||x.t==='w'||x.t==='y');const x=pref.length&&rnd(5)?pref[rnd(pref.length)]:l[rnd(l.length)];
      M.applique(u,p,x);j[p].push(M.code(x));verifie(u)}
    const r=M.rejoue(gr,[M.litJournal(M.ecritJournal(j[0])),M.litJournal(M.ecritJournal(j[1]))],dk);assert(!r.erreur,r.erreur);assert.strictEqual(JSON.stringify(r.etat),JSON.stringify(u),'rejeu Spom '+gr);M.bilan(u);nv++;return {s:u,j}};
  const cpt=L=>({e:L.filter(x=>/Forge éclair, forge/.test(x)).length,r:L.filter(x=>/reprend 1 carte/.test(x)).length,sv:L.filter(x=>/en A encore menti\./.test(x)).length,ap:L.filter(x=>/déguisement\) copie Spom/.test(x)).length});
  const tot={e:0,r:0,sv:0,ap:0},D3=M.deckTexte({'036':3,'036e':3,'007':3,'001':3,'026':3,'026e':3,'029':3,'029e':3,'003':3,'009':3});let codesLongs=0;
  for(let i=0;i<300;i++){const r=partieJ((i*7741+911)|0,[i%3?D2:D3,i%2?D2:'']);const c=cpt(r.s.log.map(x=>x[1]));for(const k in tot)tot[k]+=c[k];codesLongs+=r.j.flat().filter(x=>x.includes('~')).length}
  B=M.bilan(partieJ(77,['','']).s);ok(B.joueurs.every(j=>j.cartes.length&&j.cartes.every(c=>!('survolte' in c.bonusRecus)&&!('survolte' in c.bonusDonnes))),'paquet de test : bilan sans cle survolte');
  assert(tot.e&&tot.r&&tot.sv&&tot.ap&&codesLongs,'effet jamais joue '+JSON.stringify(tot));
  const niv=['facile','normal','difficile'],rt={e:0,r:0,sv:0,ap:0};let nr=0;
  for(let i=0;i<450;i++){const gr=(i*15485863+77)|0,dk=[i%3?D2:D3,i%4?D2:''],u=M.nouvelle(gr,dk),j=[[],[]];let pas=0;
    while(!u.fin){assert(++pas<2000,'blocage robot Spom '+gr);const p=M.attendus(u)[0],x=M.robot(u,p,niv[i<300?(i+p)%3:i%3]);assert(x,'robot sans coup');M.applique(u,p,x);j[p].push(M.code(x));verifie(u)}
    const c=cpt(u.log.map(x=>x[1]));for(const k in rt)rt[k]+=c[k];
    const r=M.rejoue(gr,[M.litJournal(M.ecritJournal(j[0])),M.litJournal(M.ecritJournal(j[1]))],dk);assert(!r.erreur,r.erreur);assert.strictEqual(JSON.stringify(r.etat),JSON.stringify(u),'rejeu robot Spom');M.bilan(u);nr++;nv++}
  assert(rt.e&&rt.r&&rt.sv,'robot : effet jamais joue '+JSON.stringify(rt));
  console.log('Spom OK : '+nv+' verifications, 300 parties aleatoires ('+tot.e+' Forges eclair, '+tot.r+' reprises, '+tot.sv+' Survolte, '+tot.ap+' Apo deguise en Spom, '+codesLongs+' coups codes sur 2 caracteres) et '+nr+' parties robot (dont 150 a niveau egal ; '+rt.e+' Forges eclair, '+rt.r+' reprises, '+rt.sv+' Survolte, '+rt.ap+' Apo en Spom), rejeux identiques');
}
{ // Cas ajoutes : Rage copiee par Apo, Maitre du deguisement qui quitte le jeu avant son choix, deux Maitres du bilig en jeu
  const D=M.deckTexte({'029':3,'029e':3,'037':3,'037e':3,'026':3,'026e':3,'003':3,'001':3});
  const prep=main=>{const s=M.nouvelle(5,[D,D]);s.phase='jeu';s.mull=[true,true];s.joueur=0;s.premier=0;const J=s.j[0];J.etapeForge=false;J.energie=30;J.main=main.slice();
    s.j[1].main=[];s.j[1].etapeForge=false;s.terrains=[TA(1),TA(8),TA(4)];return s};
  const moi=(s,c,f,l,k,x)=>{s.j[0].grille[l][k]={c,f,d:0,...(x||{})}},adv=(s,c,f,l,k,x)=>{s.j[1].grille[l][k]={c,f,d:0,...(x||{})}};
  // Rage copiee : le deguise copie K-Chan, subit 1 degat de Slim K adverse, survit et gagne +1
  let s=prep([48]);moi(s,45,2,1,1);moi(s,30,2,0,1);M.applique(s,0,{t:'p',c:48,l:1,k:1});const A=s.j[0].grille[1][1];assert.strictEqual(A.cp,'008','copie de Rage');
  s.joueur=1;s.j[1].energie=30;s.j[1].main=[3];adv(s,0,8,1,1);M.applique(s,1,{t:'p',c:3,l:1,k:1});
  assert.strictEqual(A.d,1,'1 degat de Slim K');assert.strictEqual(A.ra,1,'Rage copiee : +1');assert.strictEqual(M.forceDe(s,0,1,1),3+1+1+1-1,'3 + Trait Magma + cercle + Rage - 1');
  assert(s.log.some(x=>x[1]==='Apo (Maître du déguisement) : Rage, +1 de Force.'),'journal au nom du deguise');
  A.ra=3;s.j[1].main=[4];adv(s,1,8,1,0);M.applique(s,1,{t:'p',c:4,l:1,k:0});assert.strictEqual(A.ra,3,'Rage copiee : 3 maximum');
  // le Maitre du deguisement quitte le jeu avant de choisir sa copie : le choix ne fait rien, la partie continue
  s=prep([48]);moi(s,45,2,1,1);moi(s,12,1,0,1);moi(s,0,8,1,0);M.applique(s,0,{t:'p',c:48,l:1,k:1});assert(s.attente&&s.attente.t==='k','choix de copie');
  s.j[0].defausse.push(s.j[0].grille[1][1].c);s.j[0].grille[1][1]=null;
  M.applique(s,0,{t:'k',l:0,k:1});assert.strictEqual(s.attente,null);assert(!s.log.some(x=>/déguisement\) copie/.test(x[1])),'rien de copie');assert(M.legales(s,0).some(a=>a.t==='x'),'la partie continue');
  // deux Maitres du bilig : un Caramel chacun, une fois par manche
  s=prep([]);s.j[0].energie=0;moi(s,60,3,0,0);moi(s,61,3,2,2);
  assert.deepStrictEqual(M.legales(s,0).filter(a=>a.t==='z').map(M.code),['z00','z22'],'deux Caramels');
  M.applique(s,0,{t:'z',l:0,k:0});assert.strictEqual(s.j[0].energie,1);assert.deepStrictEqual(M.legales(s,0).filter(a=>a.t==='z').map(M.code),['z22'],'le second reste');
  M.applique(s,0,{t:'z',l:2,k:2});assert.strictEqual(s.j[0].energie,2,'+1 chacun');assert(!M.legales(s,0).some(a=>a.t==='z'));
  assert.throws(()=>M.applique(s,0,{t:'z',l:0,k:0}),'pas deux fois');
  s.manche=2;assert.strictEqual(M.legales(s,0).filter(a=>a.t==='z').length,2,'les deux de nouveau a la manche suivante');
  console.log('Cas ajoutes OK : Rage copiee par Apo, deguise parti avant son choix, deux Maitres du bilig');
}
{ // Kiwi (901, carte de partie 69, code ~6) : premier animal de compagnie, maitre Titom76 (026 : 57-59, 026e : 60-62)
  // Autres : KaTarN 0, Slim K 3, Alrevan 6, Cyrdan 12, Le Q 18, Oracle 21, Trigas 24, Indra 33, Fan 36, Glad 39, Apo 45, Maitre du deguisement 48, M. Poisson 54, A encore menti 66.
  let nv=0;const ok=(c,m)=>{assert(c,m);nv++},eq=(a,b,m)=>{assert.strictEqual(a,b,m);nv++},deq=(a,b,m)=>{assert.deepStrictEqual(a,b,m);nv++};
  const K=69;
  eq(M.carte(K).id,'901');eq(M.CARTES['901'].nom,'Kiwi');eq(M.CARTES['901'].cout,1);eq(M.CARTES['901'].force,null);deq(M.CARTES['901'].el,[]);ok(!M.CARTES['901'].base,'jamais d evolution');
  ok(M.estAnimal('901')&&M.estAnimal(K)&&M.estAnimal(M.CARTES['901']),'estAnimal');ok(!M.estAnimal('026')&&!M.estAnimal(57)&&!M.estAnimal('999'),'Titom76 n est pas un animal');
  eq(M.maitreDe('901'),'026');eq(M.maitreDe('026'),null);eq(M.maxEx('901'),1);eq(M.maxEx('026'),3);eq(M.ANIMAL_MAX,1);eq(M.TYPES.indexOf('901'),23);eq(M.TYPES_TEST.length,11,'paquet de test inchange');
  // --- encodage
  eq(M.code({t:'p',c:K,l:0,k:1}),'p~601');deq(M.decode('p~601'),{t:'p',c:K,l:0,k:1});eq(M.code({t:'m',c:[K,3]}),'m3~6');deq(M.decode('m3~6'),{t:'m',c:[3,K]});
  for(const t of ['f','c','d','s','j'])deq(M.decode(M.code({t,c:K})),{t,c:K});
  // --- deck : 1 exemplaire, maitre obligatoire (base ou evolution), compte dans les 24 a 30
  const base={'026':3,'026e':3,'001':3,'003':3,'029':3,'029e':3,'013':3,'009':3},avec={...base,'901':1},DK=M.deckTexte(avec);
  eq(DK,'0013'+'0033'+'0133'+'0093'+'0293'+'029e3'+'0263'+'026e3'+'9011','ordre de TYPES, Kiwi en dernier');
  eq(M.erreurDeck(avec),'');ok(M.lisDeck(DK),'deck avec Kiwi valide');deq(M.lisDeck(DK),avec);
  eq(M.erreurDeck({...avec,'901':2}),'un seul exemplaire de Kiwi');eq(M.lisDeck(DK.replace('9011','9012')),null,'2 Kiwi : refuse');
  const sans={'001':3,'003':3,'029':3,'029e':3,'013':3,'009':3,'037':3,'037e':3,'901':1};eq(M.erreurDeck(sans),'Kiwi demande Titom76 dans le deck');eq(M.lisDeck(M.deckTexte(sans)),null);
  eq(M.erreurDeck({...sans,'026e':1}),'','l evolution suffit');eq(M.erreurDeck({...sans,'026':1}),'','la base suffit');eq(M.erreurDeck({...sans,'901':0,'026':1}),'');
  const p23={'026':3,'026e':3,'001':3,'003':3,'029':3,'029e':3,'013':3,'009':2};eq(M.erreurDeck(p23),'moins de 24 cartes');eq(M.erreurDeck({...p23,'901':1}),'','Kiwi compte dans les 24');
  const p30={...base,'037':3,'037e':3};eq(M.erreurDeck(p30),'');eq(M.erreurDeck({...p30,'901':1}),'plus de 30 cartes','Kiwi compte dans les 30');
  const sd=M.nouvelle(9,[DK,'']),tout=[...sd.j[0].deck,...sd.j[0].main];eq(tout.length,25);eq(tout.filter(c=>c===K).length,1,'1 Kiwi');ok(!tout.includes(70)&&!tout.includes(71));
  // --- outils
  const prep=(main,rg)=>{const s=M.nouvelle(5,[DK,DK]);s.phase='jeu';s.mull=[true,true];s.joueur=0;s.premier=0;s.tour=1;const J=s.j[0];J.etapeForge=false;J.energie=30;J.main=main.slice();J.deck=[];J.forge=[];
    s.j[1].main=[];s.j[1].deck=[];s.j[1].etapeForge=false;s.deckLibre=true;s.terrains=[TA(1),TA(8),TA(4)];if(rg!==undefined)s.rng=[rg,rg*7];return s};
  const moi=(s,c,f,l,k,x)=>{s.j[0].grille[l][k]={c,f,d:0,...(x||{})}},adv=(s,c,f,l,k,x)=>{s.j[1].grille[l][k]={c,f,d:0,...(x||{})}};
  const kiwi=(s,q,l,k,m)=>{s.j[q].grille[l][k]={c:K,f:0,d:0,maitre:m}};
  const auTourAdv=(s,main)=>{s.joueur=1;s.j[1].energie=30;s.j[1].main=main.slice();s.j[1].etapeForge=false};
  const poses=s=>M.legales(s,0).filter(a=>a.t==='p'&&a.c===K).map(M.code).sort();
  const parti=s=>s.log.filter(x=>x[1]==='Kiwi part à la défausse : son maître a quitté le jeu.').length;
  // --- pose : case libre orthogonalement voisine du maitre en jeu, jamais en diagonale ni sans maitre
  let s=prep([K]);eq(poses(s).length,0,'sans maitre : pas de pose');assert.throws(()=>M.applique(s,0,{t:'p',c:K,l:0,k:0}));nv++;
  moi(s,57,1,1,1);deq(poses(s),['p~601','p~610','p~612','p~621'],'4 cases voisines, pas les diagonales');
  moi(s,12,1,0,1);deq(poses(s),['p~610','p~612','p~621'],'case occupee : non');assert.throws(()=>M.applique(s,0,{t:'p',c:K,l:0,k:0}),'diagonale');nv++;
  s.j[0].grille[1][1]=null;s.j[0].grille[0][1]=null;moi(s,60,3,2,2);deq(poses(s),['p~612','p~621'],'maitre evolue (Maitre du bilig) : oui');
  s.j[0].grille[2][2]=null;moi(s,48,3,1,1,{cp:'026'});eq(poses(s).length,0,'Apo deguise en Titom76 n est pas son maitre');
  s.j[0].grille[1][1]=null;adv(s,57,1,1,1);eq(poses(s).length,0,'Titom76 adverse : non');
  s=prep([K]);moi(s,57,1,1,1);s.j[0].energie=0;eq(poses(s).length,0,'cout 1');s.j[0].energie=1;
  M.applique(s,0,{t:'p',c:K,l:0,k:1});deq(s.j[0].grille[0][1],{c:K,f:0,d:0,maitre:57});eq(s.j[0].energie,0);ok(s.log.some(x=>x[0]===0&&x[1]==='pose Kiwi.'));
  eq(M.forceDe(s,0,0,1),0,'Kiwi : Force 0');eq(M.forceDe(s,0,1,1),1,'Titom76 : pas de Trait avec Kiwi');deq(M.colonnes(s)[1],[1,0],'Kiwi compte 0 dans sa colonne');
  ok(!M.legales(s,0).some(a=>a.t==='p'&&a.l===0&&a.k===1),'case de Kiwi occupee');
  s=prep([K,45]);s.terrains=[TA(2),TA(8),TA(4)];moi(s,57,1,1,0);eq(M.coutPose(s,0,K,0,0),1,'La Boutique : pas pour un animal');eq(M.coutPose(s,0,45,0,0),0,'un Golem : 1 de moins');
  s=prep([45,6,57]);moi(s,57,1,1,1);kiwi(s,0,0,1,57);ok(!M.legales(s,0).some(a=>a.t==='p'&&a.l===0&&a.k===1),'aucun Golem ne remplace Kiwi');
  s=prep([K,K+1]);moi(s,57,1,1,1);ok(M.legales(s,0).every(a=>a.t!=='p'||a.c===K||a.c===K+1),'coups legaux');
  // deux maitres voisins : lie au premier (haut, bas, gauche, droite)
  s=prep([K,45]);moi(s,57,1,0,1);moi(s,58,1,1,0);M.applique(s,0,{t:'p',c:K,l:1,k:1});eq(s.j[0].grille[1][1].maitre,57,'lie au maitre du haut');
  s.j[0].grille[1][0].d=9;M.applique(s,0,{t:'p',c:45,l:2,k:2});ok(!s.j[0].grille[1][0],'l autre Titom76 meurt');ok(s.j[0].grille[1][1]&&s.j[0].grille[1][1].c===K,'Kiwi reste : son maitre vit');eq(parti(s),0);
  // --- disparition : maitre mort, maitre remplace ; Kiwi a la defausse
  s=prep([12]);moi(s,57,1,1,1);kiwi(s,0,1,2,57);s.j[0].grille[1][1].d=1;M.applique(s,0,{t:'p',c:12,l:2,k:0});
  ok(!s.j[0].grille[1][1]&&!s.j[0].grille[1][2],'maitre mort : Kiwi part');ok(s.j[0].defausse.includes(57)&&s.j[0].defausse.includes(K));eq(parti(s),1);
  ok(s.log.findIndex(x=>/Titom76 meurt/.test(x[1]))<s.log.findIndex(x=>/Kiwi part/.test(x[1])),'journal : la mort puis le depart');
  s=prep([6]);moi(s,57,1,1,1);kiwi(s,0,1,2,57);M.applique(s,0,{t:'p',c:6,l:1,k:1});eq(M.carte(s.j[0].grille[1][1].c).id,'002');eq(s.j[0].grille[1][2],null,'maitre remplace : Kiwi part');ok(s.j[0].defausse.includes(K));eq(parti(s),1);
  s=prep([]);moi(s,57,1,1,1);kiwi(s,0,1,2,57);adv(s,0,8,1,0);auTourAdv(s,[3]);M.applique(s,1,{t:'p',c:3,l:1,k:0});ok(!s.j[0].grille[1][1]&&!s.j[0].grille[1][2],'tue par Slim K adverse : Kiwi part');eq(parti(s),1);
  // --- Slam : le maitre deplace garde son animal, Kiwi n est pas une cible
  s=prep([]);moi(s,57,3,1,1);kiwi(s,0,1,2,57);auTourAdv(s,[39]);M.applique(s,1,{t:'p',c:39,l:0,k:0});
  ok(s.attente&&s.attente.t==='h');ok(M.legales(s,1).every(a=>a.l===1&&a.k===1),'Kiwi n est pas une cible de Slam');ok(!M.legales(s,1).some(a=>a.m===1&&a.n===2),'la case de Kiwi n est pas libre');
  M.applique(s,1,{t:'h',l:1,k:1,m:1,n:0});eq(s.j[0].grille[1][0].c,57);deq(s.j[0].grille[1][2],{c:K,f:0,d:0,maitre:57},'Slam : Kiwi reste, meme plus voisin');
  s.j[0].grille[1][0].d=9;auTourAdv(s,[40]);M.applique(s,1,{t:'p',c:40,l:2,k:2});ok(!s.j[0].grille[1][2],'puis la mort du maitre deplace : Kiwi part');
  // --- evolution du maitre : Kiwi reste et suit l evolution
  s=prep([60]);moi(s,57,1,1,1);kiwi(s,0,1,2,57);M.applique(s,0,{t:'p',c:60,l:1,k:1});eq(s.j[0].grille[1][2].maitre,60,'Kiwi suit l evolution');eq(parti(s),0);
  s.j[0].grille[1][1].d=9;s.j[0].main=[45];M.applique(s,0,{t:'p',c:45,l:2,k:0});ok(!s.j[0].grille[1][1]&&!s.j[0].grille[1][2],'mort du maitre evolue : Kiwi part');
  // --- aucun effet de Golem ne concerne Kiwi
  s=prep([]);moi(s,57,1,1,1);kiwi(s,0,1,2,57);ok(!M.ciblable(s,0,1,2,1)&&!M.ciblable(s,0,1,2,0),'jamais ciblable');
  // Slim K : la ligne adverse, sans Kiwi
  adv(s,0,8,1,0);s.j[0].grille[1][1].f=3;auTourAdv(s,[3]);M.applique(s,1,{t:'p',c:3,l:1,k:0});eq(s.j[0].grille[1][2].d,0,'Slim K : Kiwi intact');ok(s.log.some(x=>x[1]==='Slim K : 1 dégât à Titom76.'),'Slim K ne vise que Titom76');
  s=prep([]);s.j[0].grille[1][1]=null;moi(s,57,1,0,2);kiwi(s,0,1,2,57);adv(s,0,8,1,0);auTourAdv(s,[3]);M.applique(s,1,{t:'p',c:3,l:1,k:0});ok(s.log.some(x=>x[1]==='Slim K : aucune cible sur la ligne adverse.'),'ligne avec Kiwi seul : aucune cible');
  // Gamba : Kiwi en face n est pas un « Golem en face »
  let vu56=0;
  for(let g=1;g<120;g++){s=prep([],g);moi(s,57,1,1,1);kiwi(s,0,1,2,57);auTourAdv(s,[45]);M.applique(s,1,{t:'p',c:45,l:1,k:2});
    const m=s.log.map(x=>/lance (\d)/.exec(x[1])).filter(Boolean).pop(),v=+m[1];eq(s.j[0].grille[1][2].d,0);if(v>=5){vu56++;ok(s.log.some(x=>/aucun Golem en face/.test(x[1])),'Gamba : aucun Golem en face')}}
  ok(vu56>10,'Gamba 5-6 tire');
  // Ragebait : le favori a Kiwi adverse en face
  s=prep([36]);moi(s,57,1,0,0);kiwi(s,0,0,1,57);moi(s,33,2,2,2);adv(s,57,1,1,0);kiwi(s,1,0,0,57);M.applique(s,0,{t:'p',c:36,l:2,k:2});
  ok(!s.attente,'favori d office : Kiwi n est pas candidat');eq(s.j[0].grille[2][2].fav,57);ok(s.log.some(x=>x[1]==='Ragebait : aucun Golem en face du favori.'),'Ragebait : Kiwi n est pas un Golem en face');eq(s.j[1].grille[0][0].d,0);
  // favori : jamais Kiwi
  s=prep([33]);moi(s,57,1,0,0);kiwi(s,0,0,1,57);moi(s,12,1,2,0);M.applique(s,0,{t:'p',c:33,l:2,k:2});
  ok(s.attente&&s.attente.t==='g');deq(M.legales(s,0).map(M.code).sort(),['g00','g20'],'favori : Titom76 ou Cyrdan, pas Kiwi');
  s=prep([33]);moi(s,57,1,0,0);kiwi(s,0,0,1,57);M.applique(s,0,{t:'p',c:33,l:2,k:2});ok(!s.attente);eq(s.j[0].grille[2][2].fav,57,'seul autre Golem : Titom76');
  // Cyrdan : pas de bonus pour Kiwi ; Trait : Kiwi n est pas un voisin ; Full synergie : idem
  s=prep([]);moi(s,57,1,0,0);kiwi(s,0,0,1,57);moi(s,12,1,1,1);eq(M.forceDe(s,0,0,1),0,'Cyrdan voisin : Kiwi reste a 0');eq(M.forceDe(s,0,1,1),1,'Cyrdan : rien de Kiwi');
  s=prep([]);moi(s,57,1,0,1);kiwi(s,0,1,1,57);moi(s,54,2,2,1);eq(M.forceDe(s,0,2,1),2,'Full synergie : Kiwi n est pas un voisin');moi(s,12,1,2,2);eq(M.forceDe(s,0,2,1),2+1+2+2,'avec Cyrdan : aura +1, Trait +2, synergie +2');
  // cercle : Kiwi en face ne donne ni ne prend rien
  s=prep([]);moi(s,57,1,1,1);adv(s,57,1,1,2);kiwi(s,1,1,1,57);adv(s,12,1,0,0);moi(s,0,8,0,0);
  const f0=M.forceDe(s,0,1,1);s.j[1].grille[1][1]=null;eq(M.forceDe(s,0,1,1),f0,'Kiwi en face : pas de cercle');
  // Deguisement : Kiwi n est pas un voisin a copier
  s=prep([48]);moi(s,57,1,0,0);kiwi(s,0,0,1,57);moi(s,45,2,1,1);M.applique(s,0,{t:'p',c:48,l:1,k:1});eq(s.j[0].grille[1][1].cp,null,'Deguisement : Kiwi seul voisin, rien a copier');
  s=prep([48]);moi(s,57,1,0,0);kiwi(s,0,0,1,57);moi(s,45,2,1,1);moi(s,12,1,1,2);M.applique(s,0,{t:'p',c:48,l:1,k:1});ok(!s.attente,'un seul voisin Golem : copie d office');eq(s.j[0].grille[1][1].cp,'003');
  // Survolte et Bretagne ne comptent pas Kiwi
  s=prep([]);moi(s,66,0,2,2);moi(s,57,1,0,0);kiwi(s,0,0,1,57);eq(M.foudres(s.j[0].grille),2,'Survolte : Kiwi non compte');eq(M.forceDe(s,0,2,2),2);
  s=prep([58]);s.j[0].deck=[1,2,4,5];moi(s,57,1,0,0);kiwi(s,0,0,1,57);M.applique(s,0,{t:'p',c:58,l:2,k:2});eq(s.j[0].main.length,2,'Bretagne : 2 Titom76, Kiwi non compte');
  // terrains qui deplacent ou echangent des Golems : jamais Kiwi
  s=prep([]);s.terrains=[TA(1),TA(5),TA(4)];moi(s,57,1,1,1);kiwi(s,0,0,1,57);ok(!M.legales(s,0).some(a=>a.t==='w'),'Vaisseau : Kiwi ne s echange pas');
  moi(s,12,1,2,1);deq(M.legales(s,0).filter(a=>a.t==='w').map(M.code),['w112'],'Vaisseau : les 2 Golems seulement');
  s=prep([]);s.terrains=[TA(0),TA(8),TA(4)];moi(s,57,1,1,1);kiwi(s,0,1,2,57);ok(M.legales(s,0).filter(a=>a.t==='y').every(a=>a.l===1&&a.k===1),'Faille : Kiwi ne se deplace pas');
  s=prep([21]);moi(s,57,1,0,0);kiwi(s,0,0,1,57);moi(s,18,1,2,2);M.applique(s,0,{t:'p',c:21,l:2,k:2});ok(s.attente&&s.attente.t==='o');deq(M.legales(s,0).map(M.code),['e0022'],'Oracle : Kiwi ne s echange pas');
  // --- Mignonitude : fin de manche, 1 Golem au hasard par grille ne compte pas (il reste), puis Kiwi part a la defausse
  const scene=rg=>{const u=prep([],rg);moi(u,57,1,1,1);kiwi(u,0,1,2,57);moi(u,12,1,0,0);moi(u,45,2,2,2);adv(u,13,1,0,1);adv(u,46,2,2,1);adv(u,6,4,1,0);return u};
  const forces=u=>u.j.map((J,p)=>J.grille.map((L,l)=>L.map((g,k)=>g&&!M.estAnimal(g.c)?M.forceDe(u,p,l,k):0)));
  const exclus=new Set(),exclusAdv=new Set();
  for(let g=1;g<150;g++){
    const u=scene(g),F=forces(u);finDeManche(u);const v=scene(g);finDeManche(v);eq(JSON.stringify(u),JSON.stringify(v),'meme graine, meme tirage');
    eq(u.manche,2,'manche suivante');ok(!u.j[0].grille[1][2]&&u.j[0].defausse.includes(K),'Kiwi a la defausse');
    const X=u.dernier.exclus;eq(X.length,2,'1 Golem par grille');eq(X[0].p,0);eq(X[0].q,0);eq(X[1].q,1);
    for(const x of X){const g=u.j[x.q].grille[x.l][x.k];ok(g&&g.c===x.c&&g.hors===1,'le Golem exclu reste en jeu');eq(x.f,F[x.q][x.l][x.k])}
    eq(u.j[0].grille.flat().filter(h=>h&&h.hors===1).length,1);eq(u.j[1].grille.flat().filter(h=>h&&h.hors===1).length,1);
    (X[0].q===0?exclus:exclusAdv).add(''+X[0].l+X[0].k);exclusAdv.add(''+X[1].l+X[1].k);
    const cols=[0,1,2].map(k=>[0,1].map(p=>[0,1,2].reduce((t,l)=>t+(X.some(x=>x.q===p&&x.l===l&&x.k===k)?0:F[p][l][k]),0)));
    deq(u.dernier.colonnes,cols,'decompte sans les Golems exclus');deq(u.stats.t.map(t=>t.forces),cols);
    deq(u.forceTotale,[0,1].map(p=>cols.reduce((t,c)=>t+c[p],0)),'Force totale sans les exclus');
    deq(M.colonnes(u),[0,1,2].map(k=>[0,1].map(p=>[0,1,2].reduce((t,l)=>t+F[p][l][k],0))),'manche suivante : ils comptent de nouveau');
    const L=u.log.map(x=>x[1]),i=L.findIndex(x=>/^Kiwi : Mignonitude/.test(x));ok(i>=u.reperes[0][0]&&i<L.findIndex(x=>/^Le Carrousel :|marque|égalité|ne marque pas/.test(x)),'journal : avant le decompte, dans son repere');
    eq(L.filter(x=>/^Kiwi : Mignonitude, .* ne compte pas au décompte\.$/.test(x)).length,2);eq(L.filter(x=>x==='Kiwi part à la défausse.').length,1);
    ok(L.some(x=>/\(adverse\) ne compte pas/.test(x)),'journal : le Golem adverse');
    const B=M.bilan(u);eq(B.mignonitude.length,2);eq(B.mignonitude[0].joueur,0);const kl=B.joueurs[0].cartes.find(c=>c.carte==='Kiwi');eq(kl.mignonitude,2);ok(kl.animal);
    eq(B.joueurs.flatMap(j=>j.cartes).reduce((t,c)=>t+(c.horsDecompte||0),0),2,'bilan : 2 Golems hors decompte');
    ok(u.stats.act.filter(a=>a.nom==='Mignonitude').length===2);
  }
  eq(exclus.size,3,'chaque Golem de la grille peut etre tire, Titom76 compris');ok(exclus.has('11'),'Titom76 compris');eq(exclusAdv.size,3);
  // grille sans Golem : rien a exclure ; grille avec Titom76 seul : Titom76 exclu
  s=prep([]);moi(s,57,3,1,1);kiwi(s,0,1,2,57);finDeManche(s);eq(s.dernier.exclus.length,1);eq(s.dernier.exclus[0].q,0);eq(s.dernier.exclus[0].c,57,'Titom76 seul : exclu');
  ok(s.log.some(x=>x[1]==='Kiwi : Mignonitude, aucun Golem dans la grille adverse.'));deq(s.dernier.colonnes[1],[0,0],'Titom76 ne compte pas');ok(!s.j[0].grille[1][2]);
  // sans Kiwi en jeu : rien ne change
  s=prep([]);moi(s,57,3,1,1);finDeManche(s);deq(s.dernier.exclus,[]);ok(!s.log.some(x=>/Mignonitude/.test(x[1])));deq(s.dernier.colonnes[1],[3,0]);
  // deux Kiwi (un par joueur) : 2 Golems differents par grille
  s=prep([]);moi(s,57,1,1,1);kiwi(s,0,1,2,57);moi(s,12,1,0,0);moi(s,45,2,2,2);adv(s,57,1,1,1);kiwi(s,1,1,0,57);adv(s,13,1,0,2);adv(s,46,2,2,2);finDeManche(s);
  eq(s.dernier.exclus.length,4);for(const q of [0,1])eq(s.j[q].grille.flat().filter(h=>h&&h.hors===1).length,2,'2 exclus par grille');ok(!s.j[0].grille[1][2]&&!s.j[1].grille[1][0],'les deux Kiwi partent');
  eq(s.dernier.exclus[0].p,0,'premier joueur d abord');eq(s.dernier.exclus[2].p,1);
  // derniere manche : fin de partie avec Mignonitude, bilan sans MVP animal
  s=prep([]);s.manche=3;moi(s,57,1,1,1);kiwi(s,0,1,2,57);moi(s,12,1,0,0);moi(s,45,2,2,2);finDeManche(s);ok(s.fin,'partie finie');const B=M.bilan(s);ok(!B.mvp||B.mvp.carte!=='Kiwi','Kiwi jamais MVP');
  // --- robot : sait poser Kiwi quand il est mene, s'en passe quand il mene
  for(const niv of ['normal','difficile']){
    s=prep([K]);s.j[0].energie=1;moi(s,57,1,1,1);adv(s,0,8,0,0);adv(s,1,8,0,1);adv(s,2,8,0,2);let a=M.robot(s,0,niv);eq(a.t,'p',niv+' : mene, il pose Kiwi');eq(a.c,K);
    ok(M.legales(s,0).some(x=>M.code(x)===M.code(a)),'coup legal');
    s=prep([K]);s.j[0].energie=1;moi(s,57,1,1,1);moi(s,0,8,0,0);moi(s,1,8,0,1);moi(s,2,8,0,2);adv(s,6,1,2,0);a=M.robot(s,0,niv);ok(a.t!=='p','mene : pas de Kiwi ('+niv+')');
  }
  for(const niv of ['facile','normal','difficile'])for(let g=1;g<40;g++){s=prep([K,45,57,12],g);s.j[0].energie=3;moi(s,57,1,1,1);adv(s,0,8,0,0);
    for(let i=0;i<8&&!s.fin&&s.joueur===0&&!s.attente;i++){const a=M.robot(s,0,niv);ok(a&&M.legales(s,0).some(x=>M.code(x)===M.code(a)),'coup legal');M.applique(s,0,a);if(a.t==='x')break}}
  s=prep([K,K+1,45]);s.j[0].energie=5;let a=M.robot(s,0,'difficile');ok(a,'Kiwi en main sans maitre : pas de plantage');
  // --- parties aleatoires et robot contre robot avec Kiwi dans les decks : sans exception ni blocage, rejeux identiques
  const D2=M.deckTexte({'026':3,'026e':3,'901':1,'007':3,'003':3,'029':3,'029e':3,'037':3,'036':3}),D3=M.deckTexte({'026':2,'901':1,'001':3,'002':3,'003':3,'004':3,'007':3,'008':3,'013':3});
  ok(M.lisDeck(D2)&&M.lisDeck(D3),'decks Kiwi valides');
  const cpt=L=>({p:L.filter(x=>x==='pose Kiwi.').length,m:L.filter(x=>/^Kiwi : Mignonitude/.test(x)).length,o:L.filter(x=>/^Kiwi part à la défausse : son maître/.test(x)).length});
  const tot={p:0,m:0,o:0};
  for(let i=0;i<300;i++){const dk=[[DK,D2,D3][i%3],[D2,D3,'',DK][i%4]],r=partie((i*7919+31)|0,dk);const c=cpt(r.s.log.map(x=>x[1]));for(const k in tot)tot[k]+=c[k];M.bilan(r.s);nv++}
  assert(tot.p&&tot.m&&tot.o,'Kiwi jamais joue '+JSON.stringify(tot));
  const niv=['facile','normal','difficile'],rt={p:0,m:0,o:0};let nr=0;
  for(let i=0;i<600;i++){const gr=(i*15485863+97)|0,dk=[[DK,D2,D3][i%3],[D2,D3,'',DK][i%4]],u=M.nouvelle(gr,dk),j=[[],[]];let pas=0;
    while(!u.fin){assert(++pas<2000,'blocage robot Kiwi '+gr);const p=M.attendus(u)[0],x=M.robot(u,p,niv[i<300?(i+p)%3:i%3]);assert(x,'robot sans coup');M.applique(u,p,x);j[p].push(M.code(x));verifie(u)}
    const c=cpt(u.log.map(x=>x[1]));for(const k in rt)rt[k]+=c[k];
    const r=M.rejoue(gr,[M.litJournal(M.ecritJournal(j[0])),M.litJournal(M.ecritJournal(j[1]))],dk);assert(!r.erreur,r.erreur);assert.strictEqual(JSON.stringify(r.etat),JSON.stringify(u),'rejeu robot Kiwi');M.bilan(u);nr++;nv++}
  assert(rt.p&&rt.m,'robot : Kiwi jamais pose '+JSON.stringify(rt));
  console.log('Kiwi OK : '+nv+' verifications, 300 parties aleatoires ('+tot.p+' Kiwi poses, '+tot.m+' Mignonitude, '+tot.o+' departs a la mort du maitre) et '+nr+' parties robot (dont 300 a niveaux melanges ; '+rt.p+' Kiwi poses, '+rt.m+' Mignonitude, '+rt.o+' departs), rejeux identiques');
}
{ // Elessar : Elessar (018, cartes 72-74, codes ~9 ~a ~b) et Le pomplard (018e, cartes 75-77, codes ~c ~d ~e).
  // Autres : KaTarN 0 (Magma Foudre), Alrevan 6 (KEKWRevan 9), Cyrdan 12, Le Q 18, Trigas 24 (Roi du Mobile 27), K-Chan 30 (Magma Brume), Indra 33, Glad 39, GymRat 42,
  // Apo 45 (Magma Roche), Maitre du deguisement 48, Titom76 57, Spom 63, Kiwi 69.
  let nv=0;const ok=(c,m)=>{assert(c,m);nv++},eq=(a,b,m)=>{assert.strictEqual(a,b,m);nv++},deq=(a,b,m)=>{assert.deepStrictEqual(a,b,m);nv++};
  const E=72,P=75;
  eq(M.carte(72).id,'018');eq(M.carte(74).id,'018');eq(M.carte(75).id,'018e');eq(M.carte(77).id,'018e');eq(M.carte(69).id,'901','Kiwi inchange');
  eq(M.TYPES.indexOf('018'),24);eq(M.TYPES.indexOf('018e'),25);eq(M.TYPES.indexOf('901'),23);eq(M.TYPES_TEST.length,11,'paquet de test inchange');
  eq(M.CARTES['018'].nom,'Elessar');deq(M.CARTES['018'].el,['roche','foudre']);eq(M.CARTES['018'].cout,2);eq(M.CARTES['018'].force,2);ok(!M.CARTES['018'].base);
  eq(M.CARTES['018e'].nom,'Le pomplard');eq(M.CARTES['018e'].base,'018');deq(M.CARTES['018e'].el,['roche','foudre']);eq(M.CARTES['018e'].cout,4);eq(M.CARTES['018e'].force,3);
  eq(M.nomDetail(M.carte(P)),'Elessar (Le pomplard)');ok(!M.estAnimal('018')&&!M.estAnimal(P));
  // --- encodage
  deq([72,73,74,75,76,77].map(c=>M.code({t:'f',c})),['f~9','f~a','f~b','f~c','f~d','f~e']);eq(M.code({t:'p',c:P,l:2,k:1}),'p~c21');deq(M.decode('p~c21'),{t:'p',c:P,l:2,k:1});
  eq(M.code({t:'m',c:[77,5,72]}),'m5~9~e');deq(M.decode('m5~9~e'),{t:'m',c:[5,72,77]});eq(M.code({t:'b',o:[75,69,0]}),'b~c~60');deq(M.decode('b~c~60'),{t:'b',o:[75,69,0]});
  for(let c=0;c<78;c++){for(const t of ['f','j','c','d','s'])deq(M.decode(M.code({t,c})),{t,c});deq(M.decode(M.code({t:'p',c,l:0,k:2})),{t:'p',c,l:0,k:2})}
  // --- decks
  const DE1=M.deckTexte({'018':3,'018e':3,'029':3,'029e':3,'008':3,'009':3,'009e':3,'007':3});
  const DE2=M.deckTexte({'018':3,'018e':3,'026':3,'026e':3,'901':1,'013':3,'013e':3,'036':3,'004':3});
  const DE3=M.deckTexte({'001':3,'001e':3,'008':3,'029':3,'029e':3,'036':3,'036e':3,'009':3,'009e':3});
  eq(DE1,'0073'+'0083'+'0093'+'009e3'+'0293'+'029e3'+'0183'+'018e3','ordre de TYPES : Elessar apres Kiwi');ok(M.lisDeck(DE1)&&M.lisDeck(DE2)&&M.lisDeck(DE3),'decks valides');
  eq(DE2.slice(-13),'9011'+'0183'+'018e3');
  const sd=M.nouvelle(3,[DE1,'']),tout=[...sd.j[0].deck,...sd.j[0].main].sort((a,b)=>a-b);deq(tout.filter(c=>c>=72),[72,73,74,75,76,77]);
  // --- outils (joueur 0 = moi, joueur 1 = adversaire)
  const prep=(main,rg)=>{const s=M.nouvelle(5,[DE1,DE2]);s.phase='jeu';s.mull=[true,true];s.joueur=0;s.premier=0;s.tour=1;const J=s.j[0];J.etapeForge=false;J.energie=30;J.main=main.slice();J.deck=[];J.forge=[];
    s.j[1].main=[];s.j[1].deck=[];s.j[1].etapeForge=false;s.deckLibre=true;s.terrains=[TA(1),TA(8),TA(4)];if(rg!==undefined)s.rng=[rg,rg*7];return s};
  const moi=(s,c,f,l,k,x)=>{s.j[0].grille[l][k]={c,f,d:0,...(x||{})}},adv=(s,c,f,l,k,x)=>{s.j[1].grille[l][k]={c,f,d:0,...(x||{})}};
  const pose=(s,c,l,k)=>M.applique(s,0,{t:'p',c,l,k}),codes=s=>M.legales(s,0).map(M.code),C=(s,p,c,l,k)=>M.coutPose(s,p,c,l||0,k||0);
  const L=s=>s.log.map(x=>x[1]);
  // --- Realisation de l'age : evolutions adverses +1 par Elessar, cumulatif
  let s=prep([]);moi(s,6,3,1,1);moi(s,24,1,0,0);
  eq(C(s,0,9,1,1),3,'sans Elessar');adv(s,E,2,0,0);eq(C(s,0,9,1,1),4,'+1 avec un Elessar');eq(C(s,0,27,0,0),5,'Roi du Mobile aussi : pas un ciblage');
  adv(s,E+1,2,2,2);eq(C(s,0,9,1,1),5,'+2 avec deux');eq(M.elessars(s.j[1].grille),2);
  eq(C(s,0,12),3,'Golem de base inchange');eq(C(s,0,E),2,'Elessar de base inchange');eq(C(s,0,0),1);eq(C(s,0,P),6,'Le pomplard adverse : evolution, +2');
  eq(C(s,1,9),3,'ses propres evolutions inchangees');eq(C(s,1,P),4,'son propre Pomplard inchange');
  moi(s,E+2,2,2,1);eq(C(s,1,9),4,'et l inverse : Elessar du joueur 0 sur les evolutions du joueur 1');s.j[0].grille[2][1]=null;
  s.j[1].grille[2][2]=null;eq(C(s,0,9,1,1),4,'un Elessar en moins');
  adv(s,P,3,0,0);eq(C(s,0,9,1,1),3,'Elessar evolue en Pomplard : plus de Realisation');s.j[1].grille[0][0]=null;eq(C(s,0,9,1,1),3,'Elessar parti : cout normal');
  // Kiwi : un animal n'est pas une evolution
  adv(s,E,2,0,0);eq(C(s,0,69,0,1),1,'Kiwi : cout inchange');
  // Boutique (0.2b.2) : reduit tout Golem joue dessus, evolutions comprises, sur le cout total apres la surtaxe d'Elessar, jamais sous 0 ; jamais un animal
  s.terrains=[TA(2),TA(8),TA(4)];eq(s.terrains[0].nom,'La Boutique');eq(C(s,0,0,0,0),0,'KaTarN sur la Boutique : 0, jamais negatif');eq(C(s,0,12,1,0),2);eq(C(s,0,9,1,0),3,'evolution sur la Boutique : 3 + 1 (Elessar) - 1');
  eq(C(s,0,9,1,1),4,'meme evolution hors de la Boutique : 3 + 1');eq(C(s,0,99,1,0),1,'Le Ace de Aiges : 1 + 1 - 1');
  eq(C(s,0,69,0,0),1,'Kiwi sur la Boutique : inchange');
  // Apo evolue qui copie Realisation de l'age : +1 de plus ; qui copie Extinction du feu : rien
  adv(s,48,3,2,2,{cp:'018'});eq(C(s,0,9,1,1),5,'Elessar + Maitre du deguisement en Elessar');adv(s,48,3,2,2,{cp:'018e'});eq(C(s,0,9,1,1),4,'copie de Pomplard : pas de Realisation');
  adv(s,48,3,2,2,{cp:null});eq(C(s,0,9,1,1),4);s.j[1].grille[0][0]=null;adv(s,48,3,2,2,{cp:'018'});eq(C(s,0,9,1,1),4,'Apo seul en Elessar');
  // legalite : evolution impayable a cause d'Elessar refusee, payee avec l'energie en plus
  s=prep([9,12]);moi(s,6,3,1,1);adv(s,E,2,0,0);s.j[0].energie=3;
  ok(!codes(s).includes('p911'),'KEKWRevan impayable a 3');ok(codes(s).includes('pc00'),'Cyrdan payable');assert.throws(()=>pose(s,9,1,1),'interdit');nv++;
  for(const niv of ['facile','normal','difficile'])for(let g=1;g<30;g++){const u=prep([9,12],g);moi(u,6,3,1,1);adv(u,E,2,0,0);u.j[0].energie=3;const a=M.robot(u,0,niv);ok(a&&M.legales(u,0).some(x=>M.code(x)===M.code(a)),'robot : coup legal');ok(!(a.t==='p'&&a.c===9),'robot : pas d evolution impayable')}
  s.j[0].energie=4;ok(codes(s).includes('p911'),'payable a 4');pose(s,9,1,1);eq(s.j[0].energie,0,'4 payes');
  ok(L(s).includes('Réalisation de l\'âge : Alrevan (KEKWRevan) coûte 1 de plus.'),'journal');ok(s.stats.act.some(x=>x.nom==='Réalisation de l\'âge'&&x.e==='Coût +1 pour Alrevan (KEKWRevan)'),'declenchement');
  ok(s.stats.ev.some(e=>e.t==='p'&&e.cc===9&&e.n===4),'cout paye dans le bilan');eq(M.bilan(s).joueurs[0].cartes.find(c=>c.carte==='Alrevan (KEKWRevan)').coutPaye,4);
  // Caramel : l'energie en plus paie le surcout
  s=prep([9]);moi(s,6,3,1,1);moi(s,60,3,2,1);adv(s,E,2,0,0);s.j[0].energie=3;ok(!codes(s).includes('p911'));M.applique(s,0,{t:'z',l:2,k:1});ok(codes(s).includes('p911'),'payable avec le Caramel');
  // Apo evolue qui copie Elessar par une vraie pose, puis son Elessar meurt
  s=prep([48,9]);moi(s,45,2,1,1);moi(s,E,2,0,1);pose(s,48,1,1);eq(s.j[0].grille[1][1].cp,'018','copie d office');ok(L(s).some(x=>/copie Elessar\./.test(x)));
  eq(C(s,1,9),5,'joueur 1 : Elessar + Apo en Elessar');s.j[0].grille[0][1]=null;eq(C(s,1,9),4,'Elessar mort : Apo seul');
  // --- Extinction du feu
  s=prep([P]);moi(s,E,2,1,1);moi(s,30,3,2,0);
  adv(s,30,3,0,0);adv(s,45,3,1,0);adv(s,12,3,2,0);adv(s,42,3,0,2);adv(s,48,3,2,2,{cp:'007e'});adv(s,57,3,1,2);adv(s,69,0,2,1,{maitre:57});adv(s,24,3,0,1);
  const avant=s.j[1].grille.map(R=>R.map(g=>g&&g.d));pose(s,P,1,1);const G=s.j[1].grille;
  eq(G[0][0].d,1,'K-Chan Magma -1');eq(G[0][0].ra,1,'K-Chan survit : Rage');eq(G[1][0].d,1,'Apo Magma -1');eq(G[2][0].d,0,'Cyrdan non Magma intact');eq(G[0][1].d,0,'Trigas intact');eq(G[1][2].d,0,'Titom76 intact');
  eq(G[0][2].d,0,'GymRat : Menfou palu');eq(G[2][2].d,0,'Apo en Roi du Mobile : Mode Avion');ok(G[2][1]&&M.carte(G[2][1].c).id==='901'&&G[2][1].d===0,'Kiwi intact et en jeu');
  eq(s.j[0].grille[2][0].d,0,'son propre K-Chan Magma intact');deq(avant[2][1],0);
  ok(L(s).includes('Elessar (Le pomplard) : Extinction du feu, K-Chan et Glad (GymRat) et Apo perdent 1 de Force ; Apo (Maître du déguisement) est protégé (Mode Avion).'),'journal Extinction '+JSON.stringify(L(s).slice(-4)));
  ok(L(s).includes('Glad (GymRat) : Menfou palu, ne perd pas de Force.'));ok(L(s).some(x=>/améliore Elessar en Le pomplard/.test(x)));eq(C(s,1,9),3,'Pomplard : plus de Realisation');
  let B=M.bilan(s),pl=B.joueurs[0].cartes.find(c=>c.carte==='Elessar (Le pomplard)');eq(pl.degats,2,'bilan : 2 degats');eq(B.joueurs[1].subis,2);
  // mort d'un Magma a 1 de Force, source au bilan ; Extinction une seule fois
  s=prep([P]);moi(s,E,2,0,0);adv(s,45,1,2,2);adv(s,0,1,0,2);adv(s,30,3,2,0);pose(s,P,0,0);
  ok(!s.j[1].grille[2][2]&&!s.j[1].grille[0][2],'Apo et KaTarN a 1 meurent');eq(s.j[1].grille[2][0].d,1);ok(L(s).includes('KaTarN et Apo meurent.'),'journal des morts');
  B=M.bilan(s);pl=B.joueurs[0].cartes.find(c=>c.carte==='Elessar (Le pomplard)');eq(pl.morts,2,'2 morts pour le Pomplard');ok(pl.sources.some(x=>x.source==='À la pose'&&x.morts===2&&x.degats===3));
  M.applique(s,0,{t:'x'});eq(s.j[1].grille[2][0].d,1,'effet de pose : une seule fois');
  // grille adverse vide, ou sans Magma ; pose d'Elessar de base : rien
  s=prep([P]);moi(s,E,2,0,0);pose(s,P,0,0);ok(L(s).includes('Elessar (Le pomplard) : Extinction du feu, aucun Golem Magma adverse.'));
  s=prep([P]);moi(s,E,2,0,0);adv(s,12,1,1,1);adv(s,69,0,1,2,{maitre:57});adv(s,57,1,2,2);pose(s,P,0,0);eq(s.j[1].grille[1][1].d,0);ok(s.j[1].grille[1][2],'Kiwi reste');ok(L(s).some(x=>/aucun Golem Magma adverse/.test(x)));
  s=prep([E]);adv(s,30,1,0,0);pose(s,E,1,1);eq(s.j[1].grille[0][0].d,0,'Elessar de base : pas d effet de pose');
  s=prep([P]);moi(s,E,2,0,0);adv(s,27,4,1,1);pose(s,P,0,0);eq(s.j[1].grille[1][1].d,0,'Roi du Mobile non Magma');
  // Apo evolue qui copie Extinction du feu : declenchee aussitot (d'office, puis par le choix 'k')
  s=prep([48]);moi(s,P,3,0,1);moi(s,45,2,1,1);adv(s,30,3,2,2);adv(s,39,3,0,0);adv(s,12,3,1,0);pose(s,48,1,1);
  eq(s.j[0].grille[1][1].cp,'018e');eq(s.j[1].grille[2][2].d,1,'K-Chan -1');eq(s.j[1].grille[0][0].d,1,'Glad -1');eq(s.j[1].grille[1][0].d,0);
  ok(L(s).some(x=>x.startsWith('Apo (Maître du déguisement) : Extinction du feu, Glad et K-Chan perdent 1')),'journal Apo');
  B=M.bilan(s);ok(B.joueurs[0].cartes.find(c=>c.carte==='Apo (Maître du déguisement)').degats===2,'degats au Maitre du deguisement');
  s=prep([48]);moi(s,P,3,0,1);moi(s,12,1,1,0);moi(s,45,2,1,1);adv(s,30,3,2,2);pose(s,48,1,1);eq(s.attente&&s.attente.t,'k','deux voisins : choix');eq(s.j[1].grille[2][2].d,0,'pas encore');
  M.applique(s,0,{t:'k',l:0,k:1});eq(s.j[1].grille[2][2].d,1,'apres le choix');eq(s.attente,null);
  // l'adversaire joue Le pomplard (joueur 1) : symetrique
  s=prep([]);s.joueur=1;s.j[1].main=[P];s.j[1].energie=9;adv(s,E,2,1,1);moi(s,30,2,0,0);moi(s,33,2,2,2);M.applique(s,1,{t:'p',c:P,l:1,k:1});eq(s.j[0].grille[0][0].d,1);eq(s.j[0].grille[2][2].d,1,'Indra Magma');
  // --- robot : Pomplard qui tue trois Magma, Elessar posable, rien d'illegal
  for(const niv of ['normal','difficile']){
    s=prep([P]);s.j[0].energie=4;moi(s,E,2,1,1);adv(s,45,1,0,0);adv(s,39,1,2,2);adv(s,0,1,0,2);let a=M.robot(s,0,niv);eq(M.code(a),'p~c11',niv+' : Pomplard qui tue trois Magma');
    s=prep([P]);s.j[0].energie=4;moi(s,E,2,1,1);adv(s,12,3,0,0);a=M.robot(s,0,niv);ok(M.legales(s,0).some(x=>M.code(x)===M.code(a)),'coup legal sans Magma');
    s=prep([E]);s.j[0].energie=2;adv(s,6,1,0,0);adv(s,24,1,0,1);adv(s,45,1,0,2);a=M.robot(s,0,niv);ok(a.t==='p'&&a.c===E,niv+' : Elessar pose contre trois Golems evoluables');
    s=prep([48]);s.j[0].energie=5;moi(s,45,2,1,1);moi(s,P,3,0,1);moi(s,12,1,1,0);adv(s,30,1,2,2);M.applique(s,0,M.robot(s,0,niv));if(s.attente&&s.attente.t==='k'){a=M.robot(s,0,niv);ok(M.legales(s,0).some(x=>M.code(x)===M.code(a)),'choix de copie legal');M.applique(s,0,a)}
  }
  // --- parties aleatoires et robot contre robot avec Elessar dans les decks : invariant du cout, sans exception ni blocage, rejeux identiques
  const coutAttendu=(u,p,c,k)=>{const K=M.carte(c);let n=0;u.j[1-p].grille.forEach(R=>R.forEach(g=>{if(g&&!M.estAnimal(g.c)&&M.idEff(g)==='018')n++}));return K.base?Math.max(0,K.cout+n-(u.terrains[k].nom==='La Boutique'?1:0)):null}; /* 0.2b.2 : -1 sur la Boutique */
  const verifieE=u=>{for(const p of [0,1])for(const c of u.j[p].main){const x=coutAttendu(u,p,c,0);if(x!==null){eq(M.coutPose(u,p,c,0,0),x,'cout de l evolution '+c);eq(M.coutPose(u,p,c,1,2),coutAttendu(u,p,c,2))}}
    for(const p of M.attendus(u))M.legales(u,p).forEach(a=>{if(a.t==='p')assert(M.coutPose(u,p,a.c,a.l,a.k)<=u.j[p].energie,'coup legal impayable')})};
  const cpt=X=>({r:X.filter(x=>/^Réalisation de l'âge : /.test(x)).length,x:X.filter(x=>/: Extinction du feu/.test(x)).length,t:X.filter(x=>/: Extinction du feu, .* perd/.test(x)).length,
    ae:X.filter(x=>/déguisement\) copie Elessar\./.test(x)).length,ap:X.filter(x=>/déguisement\) copie Elessar \(Le pomplard\)/.test(x)).length});
  const partieE=(gr,dk)=>{const u=M.nouvelle(gr,dk),j=[[],[]];let pas=0;
    while(!u.fin){assert(++pas<2000,'blocage Elessar '+gr);const att=M.attendus(u);const p=att[rnd(att.length)],l=M.legales(u,p);assert(l.length,'aucune action '+gr);
      const pref=l.filter(x=>x.t==='p'||x.t==='f'||x.t==='j'||x.t==='w'||x.t==='y');const x=pref.length&&rnd(5)?pref[rnd(pref.length)]:l[rnd(l.length)];
      M.applique(u,p,x);j[p].push(M.code(x));verifie(u);verifieE(u)}
    const r=M.rejoue(gr,[M.litJournal(M.ecritJournal(j[0])),M.litJournal(M.ecritJournal(j[1]))],dk);assert(!r.erreur,r.erreur);assert.strictEqual(JSON.stringify(r.etat),JSON.stringify(u),'rejeu Elessar '+gr);M.bilan(u);nv++;return u};
  const tot={r:0,x:0,t:0,ae:0,ap:0};let mortsP=0;
  for(let i=0;i<300;i++){const u=partieE((i*7741+517)|0,[[DE1,DE2,DE3][i%3],[DE3,DE1,'',DE2][i%4]]);const c=cpt(u.log.map(x=>x[1]));for(const k in tot)tot[k]+=c[k];
    M.bilan(u).joueurs.forEach(J=>J.cartes.forEach(c=>{if(/Le pomplard/.test(c.carte))mortsP+=c.morts}))}
  assert(tot.r&&tot.x&&tot.t&&tot.ae&&tot.ap&&mortsP,'effet jamais joue '+JSON.stringify(tot)+' '+mortsP);
  const niv=['facile','normal','difficile'],rt={r:0,x:0,t:0,ae:0,ap:0};let nr=0;
  for(let i=0;i<450;i++){const gr=(i*15485863+313)|0,dk=[[DE1,DE2,DE3][i%3],[DE3,DE1,'',DE2][i%4]],u=M.nouvelle(gr,dk),j=[[],[]];let pas=0;
    while(!u.fin){assert(++pas<2000,'blocage robot Elessar '+gr);const p=M.attendus(u)[0],x=M.robot(u,p,niv[i<300?(i+p)%3:i%3]);assert(x,'robot sans coup');M.applique(u,p,x);j[p].push(M.code(x));verifie(u);verifieE(u)}
    const c=cpt(u.log.map(x=>x[1]));for(const k in rt)rt[k]+=c[k];
    const r=M.rejoue(gr,[M.litJournal(M.ecritJournal(j[0])),M.litJournal(M.ecritJournal(j[1]))],dk);assert(!r.erreur,r.erreur);assert.strictEqual(JSON.stringify(r.etat),JSON.stringify(u),'rejeu robot Elessar');M.bilan(u);nr++;nv++}
  assert(rt.r&&rt.x&&rt.t,'robot : effet jamais joue '+JSON.stringify(rt));
  console.log('Elessar OK : '+nv+' verifications, 300 parties aleatoires ('+tot.r+' evolutions surtaxees, '+tot.x+' Extinctions dont '+tot.t+' avec perte, '+mortsP+' morts, '+tot.ae+' Apo en Elessar, '+tot.ap+' Apo en Pomplard) et '+nr+' parties robot (dont 150 a niveau egal ; '+rt.r+' evolutions surtaxees, '+rt.x+' Extinctions dont '+rt.t+' avec perte, '+rt.ae+' Apo en Elessar, '+rt.ap+' Apo en Pomplard), rejeux identiques');
}
{ // Velnen : Velnen (041, cartes 78-80, codes ~f ~g ~h) et Le chansonnier (041e, cartes 81-83, codes ~i ~j ~k), coup 'i' (Imitation : i1 copier, i0 refuser).
  // Autres : KaTarN 0, Alrevan 6 (KEKWRevan 9), Cyrdan 12, Le Q 18, Roi du Mobile 27, K-Chan 30, Indra 33, Glad 39, Apo 45, Maitre du deguisement 48,
  // Titom76 57, Spom 63, Kiwi 69, Elessar 72, Le pomplard 75. Elements de Velnen : M.EL_VELNEN (Roche puis Brume), aucun test n'en depend.
  let nv=0;const ok=(c,m)=>{assert(c,m);nv++},eq=(a,b,m)=>{assert.strictEqual(a,b,m);nv++},deq=(a,b,m)=>{assert.deepStrictEqual(a,b,m);nv++};
  const V=78,CH=81;
  eq(M.carte(78).id,'041');eq(M.carte(80).id,'041');eq(M.carte(81).id,'041e');eq(M.carte(83).id,'041e');eq(M.carte(77).id,'018e','Pomplard inchange');eq(M.carte(69).id,'901','Kiwi inchange');
  eq(M.TYPES.indexOf('041'),26);eq(M.TYPES.indexOf('041e'),27);eq(M.TYPES.indexOf('018e'),25);eq(M.TYPES_TEST.length,11,'paquet de test inchange');
  eq(M.CARTES['041'].nom,'Velnen');eq(M.CARTES['041'].cout,3);eq(M.CARTES['041'].force,1);deq(M.EL_VELNEN,['roche','brume']);ok(!M.CARTES['041'].base);
  eq(M.CARTES['041e'].nom,'Le chansonnier');eq(M.CARTES['041e'].base,'041');eq(M.CARTES['041e'].cout,4);eq(M.CARTES['041e'].force,3);
  ok(M.CARTES['041'].el===M.EL_VELNEN&&M.CARTES['041e'].el===M.EL_VELNEN,'elements a un seul endroit');eq(M.EL_VELNEN.length,2);
  eq(M.nomDetail(M.carte(CH)),'Velnen (Le chansonnier)');ok(!M.estAnimal('041')&&!M.estAnimal(CH));deq(Object.keys(M.COPIEURS).sort(),['029e','041e']);
  // --- encodage
  deq([78,79,80,81,82,83].map(c=>M.code({t:'f',c})),['f~f','f~g','f~h','f~i','f~j','f~k']);eq(M.code({t:'p',c:CH,l:2,k:1}),'p~i21');deq(M.decode('p~i21'),{t:'p',c:CH,l:2,k:1});
  eq(M.code({t:'i',o:1}),'i1');eq(M.code({t:'i',o:0}),'i0');deq(M.decode('i1'),{t:'i',o:1});deq(M.decode('i0'),{t:'i',o:0});assert.throws(()=>M.decode('i2'));assert.throws(()=>M.decode('i'));nv+=2;
  for(let c=0;c<84;c++){for(const t of ['f','j','c','d','s'])deq(M.decode(M.code({t,c})),{t,c});deq(M.decode(M.code({t:'p',c,l:1,k:2})),{t:'p',c,l:1,k:2})}
  // --- decks
  const DV1=M.deckTexte({'041':3,'041e':3,'009':3,'009e':3,'029':3,'029e':3,'001':3,'008':3});
  const DV2=M.deckTexte({'041':3,'041e':3,'003':3,'013':3,'013e':3,'036':3,'018':3,'018e':3,'007':3,'007e':3});
  const DV3=M.deckTexte({'041':2,'041e':3,'002':3,'002e':3,'004':3,'004e':3,'026':3,'026e':3,'901':1,'037':3});
  ok(M.lisDeck(DV1)&&M.lisDeck(DV2)&&M.lisDeck(DV3),'decks valides');eq(DV2.slice(-9),'0413'+'041e3','Velnen apres Elessar');
  const sd=M.nouvelle(3,[DV1,'']);deq([...sd.j[0].deck,...sd.j[0].main].filter(c=>c>=78).sort((a,b)=>a-b),[78,79,80,81,82,83]);
  // --- outils (joueur 0 = moi, joueur 1 = adversaire)
  const prep=(main,rg)=>{const s=M.nouvelle(5,[DV1,DV2]);s.phase='jeu';s.mull=[true,true];s.joueur=0;s.premier=0;s.tour=1;const J=s.j[0];J.etapeForge=false;J.energie=30;J.main=main.slice();J.deck=[];J.forge=[];
    s.j[1].main=[];s.j[1].deck=[];s.j[1].etapeForge=false;s.deckLibre=true;s.terrains=[TA(1),TA(8),TA(4)];if(rg!==undefined)s.rng=[rg,rg*7];return s};
  const moi=(s,c,f,l,k,x)=>{s.j[0].grille[l][k]={c,f,d:0,...(x||{})}},adv=(s,c,f,l,k,x)=>{s.j[1].grille[l][k]={c,f,d:0,...(x||{})}};
  const pose=(s,c,l,k)=>M.applique(s,0,{t:'p',c,l,k}),codes=s=>M.legales(s,0).map(M.code).sort(),L=s=>s.log.map(x=>x[1]);
  const chanson=(s,l,k)=>{moi(s,V,2,l,k);pose(s,CH,l,k);return s.j[0].grille[l][k]}; /* Velnen de base deja pose, puis evolution */
  // --- Velnen de base : aucun effet de pose ; evolution sur Velnen seulement
  let s=prep([V,CH]);adv(s,12,3,1,1);pose(s,V,1,1);ok(!s.attente,'Velnen : rien a la pose');eq(s.j[0].grille[1][1].cp,undefined);
  s=prep([CH]);moi(s,12,1,1,1);ok(!codes(s).includes('p~i11'),'chansonnier sur Cyrdan interdit');
  // --- rien a copier : case vide, animal, Mode Avion (vrai ou copie), copieur sans copie
  s=prep([CH]);let g=chanson(s,1,1);ok(!s.attente&&g.cp===null,'case vide');ok(L(s).includes('Velnen (Le chansonnier) : Imitation, aucun Golem en face.'));ok(L(s).some(x=>/améliore Velnen en Le chansonnier/.test(x)));
  s=prep([CH]);adv(s,57,1,1,0);adv(s,69,0,1,1,{maitre:57});g=chanson(s,1,1);ok(!s.attente&&g.cp===null,'animal en face : rien');ok(L(s).some(x=>/aucun Golem en face/.test(x)));
  s=prep([CH]);adv(s,27,4,1,1);g=chanson(s,1,1);ok(!s.attente&&g.cp===null,'Mode Avion');ok(L(s).includes('Velnen (Le chansonnier) : Imitation, Trigas (Roi du Mobile) est protégé (Mode Avion).'),JSON.stringify(L(s).slice(-2)));
  s=prep([CH]);adv(s,48,3,1,1,{cp:'007e'});g=chanson(s,1,1);ok(!s.attente&&g.cp===null,'Apo en Roi du Mobile : Mode Avion copie');
  s=prep([CH]);adv(s,48,3,1,1,{cp:null});g=chanson(s,1,1);ok(!s.attente&&g.cp===null);ok(L(s).includes('Velnen (Le chansonnier) : Imitation, Apo (Maître du déguisement) n\'a rien à copier.'));
  s=prep([CH]);adv(s,CH+1,3,1,1,{cp:null});g=chanson(s,1,1);ok(!s.attente&&g.cp===null,'chansonnier adverse sans copie');
  s=prep([CH]);adv(s,12,3,0,1);adv(s,12,3,1,0);adv(s,12,3,2,2);g=chanson(s,1,1);ok(!s.attente&&g.cp===null,'seule la case en face compte (ni voisins ni diagonale)');
  // --- copie facultative : choix 'i', copier ou refuser
  s=prep([CH]);adv(s,12,3,1,1);moi(s,6,3,0,1);g=chanson(s,1,1);const f0=M.forceDe(s,0,0,1);
  ok(s.attente&&s.attente.t==='i'&&s.attente.p===0,'choix de l Imitation');deq(codes(s),['i0','i1']);deq(M.attendus(s),[0]);ok(!('cp' in g),'pas encore de copie');
  assert.throws(()=>M.applique(s,0,{t:'x'}));assert.throws(()=>M.applique(s,1,{t:'i',o:1}),'pas a l adversaire');nv+=2;
  const s2=JSON.parse(JSON.stringify(s));
  M.applique(s,0,{t:'i',o:1});eq(g.cp,'003','copie Cyrdan');eq(s.attente,null);eq(M.forceDe(s,0,0,1),f0+1,'Tournoi annexe : voisin +1');ok(L(s).includes('Velnen (Le chansonnier) copie Cyrdan.'));
  eq(M.idEff(g),'003');eq(M.forceDe(s,1,1,1),M.forceDe(s2,1,1,1),'le Cyrdan adverse inchange');
  M.applique(s2,0,{t:'i',o:0});const g2=s2.j[0].grille[1][1];eq(g2.cp,null,'refus');eq(M.idEff(g2),null);eq(M.forceDe(s2,0,0,1),f0);ok(L(s2).includes('Velnen (Le chansonnier) : Imitation refusée, ne copie rien.'));
  ok(s2.stats.act.some(x=>x.nom==='Imitation'&&x.e==='Refusée'));
  // copie figee a la pose : le Cyrdan adverse part, puis Velnen deplace (Faille) : la copie reste
  s.j[1].grille[1][1]=null;eq(g.cp,'003');eq(M.forceDe(s,0,0,1),f0+1,'copie gardee');
  s.j[1].grille[1][1]={c:0,f:8,d:0};eq(g.cp,'003','nouveau Golem en face : copie inchangee');
  // copie d'une copie : effet copie par Apo ou par un chansonnier adverse ; jamais un copieur
  s=prep([CH]);adv(s,48,3,1,1,{cp:'009e'});g=chanson(s,1,1);M.applique(s,0,{t:'i',o:1});eq(g.cp,'009e','Apo en GymRat : Menfou palu copie');ok(L(s).includes('Velnen (Le chansonnier) copie Apo (Maître du déguisement).'));
  s=prep([CH]);adv(s,CH,3,1,1,{cp:'003'});g=chanson(s,1,1);M.applique(s,0,{t:'i',o:1});eq(g.cp,'003','chansonnier adverse en Cyrdan');
  s=prep([CH]);adv(s,V,2,1,1);g=chanson(s,1,1);M.applique(s,0,{t:'i',o:1});eq(g.cp,'041','copie de Velnen : Graine de Golem');eq(M.graines(s.j[0].grille),1,'chansonnier en Velnen : compte');
  // --- effets de pose copies, lus du point de vue du chansonnier
  // Slam de Glad : vise la grille adverse ; degats au compte du chansonnier
  s=prep([CH]);adv(s,39,1,1,1,{d:0});adv(s,6,5,0,0);g=chanson(s,1,1);M.applique(s,0,{t:'i',o:1});eq(g.cp,'009');ok(s.attente&&s.attente.t==='h','Slam copie : choix');
  ok(M.legales(s,0).every(a=>a.t==='h'),'Slam sur la grille adverse');M.applique(s,0,{t:'h',l:0,k:0,m:0,n:1});eq(s.j[1].grille[0][1].c,6);eq(s.j[1].grille[0][1].d,1);
  ok(L(s).some(x=>/Slam, Alrevan est déplacé et perd 1 de Force/.test(x)));eq(M.bilan(s).joueurs[0].cartes.find(c=>c.carte==='Velnen (Le chansonnier)').degats,1,'bilan');
  // Gamba : le chansonnier lance, -2 a lui sur 1-2, -2 au Golem en face (l'Apo copie) sur 5-6
  const vus=new Set();for(let r=1;r<200;r++){s=prep([CH],r);adv(s,45,6,1,1);g=chanson(s,1,1);M.applique(s,0,{t:'i',o:1});const m=L(s).map(x=>/Le chansonnier\) \(Gamba\) lance (\d)/.exec(x)).filter(Boolean).pop();ok(m,'Gamba copiee');const v=+m[1];vus.add(v);
    eq(g.d,v<=2?2:0);eq(s.j[1].grille[1][1].d,v>=5?2:0)}
  eq(vus.size,6,'six faces');
  // Extinction du feu : les Magma adverses (camp de l'original) perdent 1
  s=prep([CH]);adv(s,75,3,1,1);adv(s,30,3,0,0);adv(s,12,3,0,2);moi(s,30,3,2,2);g=chanson(s,1,1);M.applique(s,0,{t:'i',o:1});
  eq(s.j[1].grille[0][0].d,1,'K-Chan adverse -1');eq(s.j[1].grille[0][2].d,0);eq(s.j[0].grille[2][2].d,0,'son K-Chan intact');ok(L(s).some(x=>x.startsWith('Velnen (Le chansonnier) : Extinction du feu, K-Chan perd 1')));
  // Realisation de l'age : les evolutions de l'autre camp coutent 1 de plus ; un Elessar adverse surtaxe le chansonnier
  s=prep([CH]);adv(s,72,2,1,1);moi(s,V,2,1,1);eq(M.coutPose(s,0,CH,1,1),5,'chansonnier : 4 + 1 (Elessar adverse)');pose(s,CH,1,1);eq(s.j[0].energie,25);
  M.applique(s,0,{t:'i',o:1});eq(M.elessars(s.j[0].grille),1);eq(M.coutPose(s,1,9,0,0),4,'KEKWRevan adverse : +1');eq(M.coutPose(s,1,12,0,0),3,'base inchangee');
  // Forge eclair, Indra (favori puis +1), Le Q (son deck), Alrevan (son de)
  s=prep([CH]);adv(s,63,1,1,1);chanson(s,1,1);M.applique(s,0,{t:'i',o:1});eq(M.spoms(s.j[0].grille),1);eq(M.spoms(s.j[1].grille),1);
  s=prep([CH]);adv(s,33,2,1,1);moi(s,12,1,0,1);moi(s,6,3,2,2);g=chanson(s,1,1);M.applique(s,0,{t:'i',o:1});ok(s.attente&&s.attente.t==='g','Indra copiee : favori');
  ok(!M.legales(s,0).some(a=>a.l===1&&a.k===1),'pas lui-meme');M.applique(s,0,{t:'g',l:0,k:1});eq(g.fav,12);eq(M.favori(s,0,12),1);
  s=prep([CH]);s.j[0].deck=[1,2,4];s.j[1].deck=[5,7,8];adv(s,18,1,1,1);chanson(s,1,1);M.applique(s,0,{t:'i',o:1});ok(s.attente&&s.attente.t==='q'&&s.attente.p===0);deq(s.attente.options,[1,2,4],'son propre deck');
  s=prep([CH],9);adv(s,6,4,1,1);g=chanson(s,1,1);M.applique(s,0,{t:'i',o:1});ok(g.f>=1&&g.f<=6,'Force = de');ok(L(s).some(x=>/^Alrevan lance le dé : Force \d\./.test(x)));
  // KaTarN : inconvenient compris (-4 en fin de manche)
  s=prep([CH]);adv(s,0,8,1,1);g=chanson(s,1,1);M.applique(s,0,{t:'i',o:1});eq(g.cp,'001');s.j[0].main=[];s.joueur=1;s.tour=3;s.j[1].etapeForge=false;M.applique(s,1,{t:'x'});
  ok(!s.j[0].grille[1][1]||s.j[0].grille[1][1].d===4,'KaTarN copie : -4');
  // l'adversaire (joueur 1) joue le chansonnier : symetrique
  s=prep([]);s.joueur=1;s.j[1].main=[CH];s.j[1].energie=9;adv(s,V,2,0,0);moi(s,12,1,0,0);M.applique(s,1,{t:'p',c:CH,l:0,k:0});ok(s.attente&&s.attente.t==='i'&&s.attente.p===1);
  deq(M.legales(s,1).map(M.code).sort(),['i0','i1']);deq(M.legales(s,0),[]);M.applique(s,1,{t:'i',o:1});eq(s.j[1].grille[0][0].cp,'003');
  // --- Graine de Golem : +1 a la pioche de chaque tour par Velnen en jeu, cumulatif, premier tour de manche compris, deck vide sans penalite
  const tour=(s,p)=>{s.j[p].main=[];s.j[p].etapeForge=false;M.applique(s,p,{t:'x'})}; /* p finit son tour (main vide), l'autre commence le sien */
  const dk=n=>Array.from({length:n},(_,i)=>i%3===0?1:i%3===1?2:4);
  s=prep([]);s.j[1].deck=dk(9);adv(s,V,1,0,0);tour(s,0);eq(s.joueur,1);eq(s.j[1].main.length,2,'second, 1er tour de manche : 1 + 1');ok(L(s).includes('Graine de Golem : pioche 1 carte de plus.'));
  ok(s.stats.act.some(x=>x.nom==='Graine de Golem'&&x.e==='Pioche +1'));eq(s.j[1].deck.length,7);
  s.j[0].deck=dk(9);moi(s,V,1,2,2);moi(s,V+1,1,2,0);tour(s,1);eq(s.joueur,0);eq(s.tour,2);eq(s.j[0].main.length,4,'2 + 2 Velnen');ok(L(s).includes('Graine de Golem : pioche 2 cartes de plus.'));
  moi(s,V+2,1,0,1);tour(s,0);tour(s,1);eq(s.j[0].main.length,5,'2 + 3 Velnen');
  s=prep([]);s.j[0].deck=dk(9);s.j[1].deck=dk(9);adv(s,12,1,0,0);moi(s,V,1,0,0);tour(s,0);eq(s.j[1].main.length,1,'le Velnen adverse ne compte pas');tour(s,1);eq(s.j[0].main.length,3);
  /* Deck vide : 1 point a l'adversaire par carte. Deck de 3 et deux Velnen : 2 + 1, puis la 2e pioche de la Graine donne 1 point ; deck de 2 : la Graine donne 1 point ; deck vide : 2 + 1 points */
  s=prep([]);delete s.deckLibre;s.j[0].deck=dk(3);moi(s,V,1,0,0);moi(s,V+1,1,0,1);s.joueur=1;tour(s,1);eq(s.j[0].main.length,3,'deck de 3 : 2 + 1');eq(s.j[0].deck.length,0);ok(!s.fin&&s.j[1].score===1,'Graine sur deck vide : 1 point');
  s=prep([]);delete s.deckLibre;s.j[0].deck=dk(2);moi(s,V,1,0,0);s.joueur=1;tour(s,1);eq(s.j[0].main.length,2,'deck de 2 : les 2 du tour');ok(!s.fin&&s.j[1].score===1,'deck de 2 + Velnen : 1 point');
  s=prep([]);delete s.deckLibre;s.j[0].deck=[];moi(s,V,1,0,0);s.joueur=1;tour(s,1);eq(s.j[0].main.length,0,'deck vide');ok(!s.fin&&s.j[1].score===3&&s.j[0].score===0,'deck vide + Velnen : 3 points');
  // copies : Apo deguise en Velnen et chansonnier qui l'a copie comptent ; chansonnier sans copie, non ; Velnen mort ou evolue, non
  s=prep([]);s.j[0].deck=dk(9);moi(s,48,3,0,0,{cp:'041'});moi(s,CH,3,1,1,{cp:'041'});moi(s,CH+1,3,2,2,{cp:null});eq(M.graines(s.j[0].grille),2);s.joueur=1;tour(s,1);eq(s.j[0].main.length,4,'Apo + chansonnier en Velnen');
  s=prep([CH]);s.j[0].deck=dk(9);moi(s,V,1,1,1);eq(M.graines(s.j[0].grille),1);pose(s,CH,1,1);eq(M.graines(s.j[0].grille),0,'evolue : plus de Graine');
  s=prep([48]);s.j[0].deck=dk(9);moi(s,45,2,1,1);moi(s,V,1,0,1);pose(s,48,1,1);eq(s.j[0].grille[1][1].cp,'041','Apo copie la Graine d office');eq(M.graines(s.j[0].grille),2);
  s=prep([]);moi(s,V,1,0,0);moi(s,57,1,0,1);moi(s,69,0,1,1,{maitre:57});eq(M.graines(s.j[0].grille),1,'un animal ne compte pas');
  // robot : Velnen posable et pose de valeur ; evolution qui perd la Graine reste legale
  for(const niv of ['normal','difficile']){s=prep([V]);s.j[0].energie=3;s.j[0].deck=dk(30);let a=M.robot(s,0,niv);eq(M.code(a).slice(0,2),'p~',niv+' : Velnen pose')}
  // --- robot : refus des copies nuisibles, copies utiles, determinisme
  for(const niv of ['normal','difficile']){
    s=prep([CH]);adv(s,0,8,1,1);chanson(s,1,1);let a=M.robot(s,0,niv);deq(a,{t:'i',o:0},niv+' : refuse KaTarN en manche 1');deq(M.robot(s,0,niv),a,'deterministe');
    s=prep([CH]);adv(s,9,7,1,1);chanson(s,1,1);eq(M.robot(s,0,niv).o,1,niv+' : copie KEKWRevan');
    s=prep([CH]);adv(s,12,3,1,1);moi(s,6,3,0,1);moi(s,6,3,1,0);chanson(s,1,1);eq(M.robot(s,0,niv).o,1,niv+' : copie Cyrdan avec deux voisins');
    s=prep([CH]);adv(s,72,2,1,1);chanson(s,1,1);eq(M.robot(s,0,niv).o,1,niv+' : copie Elessar');
    for(let r=1;r<20;r++){s=prep([CH],r);adv(s,[6,45,30,63,18,33,37*0+13*3,24][r%8],3,1,1);moi(s,12,1,0,1);chanson(s,1,1);if(s.attente){const x=M.robot(s,0,niv);ok(M.legales(s,0).some(y=>M.code(y)===M.code(x)),'choix legal')}}
    s=prep([CH,12]);s.j[0].energie=4;moi(s,V,2,1,1);adv(s,9,7,1,1);a=M.robot(s,0,niv);ok(M.legales(s,0).some(y=>M.code(y)===M.code(a)),'pose legale');
  }
  // --- parties aleatoires et robot contre robot avec Velnen : copie figee, jamais un copieur, rejeux identiques
  const fige=new WeakMap();
  const verifieV=u=>{u.j.forEach(J=>J.grille.forEach(R=>R.forEach(h=>{if(!h||M.carte(h.c).id!=='041e'||!('cp' in h))return;ok(!(h.cp in M.COPIEURS),'copie de copieur');
    if(fige.has(h))eq(fige.get(h),h.cp,'copie figee');else fige.set(h,h.cp)})))};
  const cpt=(X,J)=>({c:X.filter(x=>/Le chansonnier\) copie /.test(x)).length,r:X.filter(x=>/Imitation refusée/.test(x)).length,n:X.filter(x=>/Le chansonnier\) : Imitation, /.test(x)).length,
    g:X.filter(x=>/^Graine de Golem : pioche/.test(x)).length,i1:J.flat().filter(x=>x==='i1').length,i0:J.flat().filter(x=>x==='i0').length});
  const jouer=(gr,dk,choix)=>{const u=M.nouvelle(gr,dk),j=[[],[]];let pas=0;
    while(!u.fin){assert(++pas<2000,'blocage Velnen '+gr);const att=M.attendus(u),p=choix?att[0]:att[rnd(att.length)],l=M.legales(u,p);assert(l.length,'aucune action '+gr);let x;
      if(choix){x=M.robot(u,p,choix(p));assert(x,'robot sans coup');}else{const pref=l.filter(y=>y.t==='p'||y.t==='f'||y.t==='j'||y.t==='i'||y.t==='w'||y.t==='y');x=pref.length&&rnd(5)?pref[rnd(pref.length)]:l[rnd(l.length)]}
      M.applique(u,p,x);j[p].push(M.code(x));verifie(u);verifieV(u)}
    const r=M.rejoue(gr,[M.litJournal(M.ecritJournal(j[0])),M.litJournal(M.ecritJournal(j[1]))],dk);assert(!r.erreur,r.erreur);assert.strictEqual(JSON.stringify(r.etat),JSON.stringify(u),'rejeu Velnen '+gr);M.bilan(u);nv++;
    return cpt(u.log.map(y=>y[1]),j)};
  const add=(t,c)=>{for(const k in c)t[k]=(t[k]||0)+c[k]};
  const tot={};for(let i=0;i<300;i++)add(tot,jouer((i*7741+911)|0,[[DV1,DV2,DV3][i%3],[DV3,DV1,'',DV2][i%4]]));
  ok(tot.c&&tot.r&&tot.n&&tot.i1&&tot.i0&&tot.g,'Imitation jamais jouee '+JSON.stringify(tot));
  const niv=['facile','normal','difficile'],rt={};let nr=0;
  for(let i=0;i<450;i++){add(rt,jouer((i*15485863+977)|0,[[DV1,DV2,DV3][i%3],[DV3,DV1,'',DV2][i%4]],p=>niv[i<300?(i+p)%3:i%3]));nr++}
  ok(rt.c&&rt.i1&&rt.g,'robot : Imitation jamais jouee '+JSON.stringify(rt));
  console.log('Velnen OK : '+nv+' verifications, 300 parties aleatoires ('+tot.c+' copies, '+tot.r+' refus, '+tot.n+' Imitations sans cible, '+tot.g+' Graines de Golem) et '+nr+' parties robot (dont 150 a niveau egal ; '+rt.c+' copies, '+rt.r+' refus, '+rt.n+' sans cible, '+rt.g+' Graines), rejeux identiques');
}
{ // Shifukuro : Shifukuro (025, cartes 84-86, codes ~l ~m ~n, KEKWait) et Le moderateur (025e, cartes 87-89, codes ~o ~p ~q), meandyou : attente 'u', coup 'e' (echange) ou 'v' (passer).
  // Autres : KaTarN 0, Slim K 3, Trigas 24, K-Chan 30, Glad 39, Apo 45, Maitre du deguisement 48, SuperFishman 51 (memes elements que Shifukuro), Titom76 57, Kiwi 69, Velnen 78, chansonnier 81.
  let nv=0;const ok=(c,m)=>{assert(c,m);nv++},eq=(a,b,m)=>{assert.strictEqual(a,b,m);nv++},deq=(a,b,m)=>{assert.deepStrictEqual(a,b,m);nv++};
  const SH=84,MO=87,TR=24,KC=90 /* K-Chan : Bellock, memes elements que l'ancienne K-Chan */,SF=51,AP=45,MD=48,VE=78,CH=81;
  eq(M.carte(84).id,'025');eq(M.carte(86).id,'025');eq(M.carte(87).id,'025e');eq(M.carte(89).id,'025e');eq(M.carte(83).id,'041e','chansonnier inchange');eq(M.carte(78).id,'041','Velnen inchange');
  eq(M.TYPES.indexOf('025'),28);eq(M.TYPES.indexOf('025e'),29);eq(M.TYPES.length,42); /* 30 avant Bellock/Loxim */eq(M.TYPES.indexOf('041e'),27);eq(M.TYPES_TEST.length,11,'paquet de test inchange');
  const C0=M.CARTES['025'],C1=M.CARTES['025e'];
  eq(C0.nom,'Shifukuro');eq(C0.cout,2);eq(C0.force,1);deq(C0.el,['roche','cristal']);ok(!C0.base);
  eq(C1.nom,'Le modérateur');eq(C1.base,'025');eq(C1.cout,3);eq(C1.force,4);deq(C1.el,['roche','cristal']);
  eq(M.nomDetail(M.carte(SH)),'Shifukuro');eq(M.nomDetail(M.carte(MO)),'Shifukuro (Le modérateur)');ok(!M.estAnimal('025')&&!M.estAnimal(MO));deq(Object.keys(M.COPIEURS).sort(),['029e','041e'],'pas un copieur');
  // --- encodage
  deq([84,85,86,87,88,89].map(c=>M.code({t:'f',c})),['f~l','f~m','f~n','f~o','f~p','f~q']);eq(M.code({t:'p',c:MO,l:2,k:1}),'p~o21');deq(M.decode('p~o21'),{t:'p',c:MO,l:2,k:1});
  for(let c=0;c<90;c++){for(const t of ['f','j','c','d','s'])deq(M.decode(M.code({t,c})),{t,c});deq(M.decode(M.code({t:'p',c,l:2,k:0})),{t:'p',c,l:2,k:0})}
  eq(M.code({t:'e',a:[0,1],b:[1,1]}),'e0111');deq(M.decode('e0111'),{t:'e',a:[0,1],b:[1,1]});eq(M.code({t:'v'}),'v');
  // --- decks
  const DS1=M.deckTexte({'025':3,'025e':3,'029':3,'029e':3,'041':3,'041e':3,'008':3,'007':3});
  const DS2=M.deckTexte({'025':3,'025e':3,'003':3,'013':3,'013e':3,'036':3,'004':3,'004e':3,'018':3});
  const DS3=M.deckTexte({'025':2,'025e':3,'002':3,'002e':3,'009':3,'009e':3,'026':3,'026e':3,'901':1,'037':3});
  ok(M.lisDeck(DS1)&&M.lisDeck(DS2)&&M.lisDeck(DS3),'decks valides');eq(DS1.slice(-9),'0253025e3','Shifukuro apres Velnen');
  const sd=M.nouvelle(3,[DS1,'']);deq([...sd.j[0].deck,...sd.j[0].main].filter(c=>c>=84).sort((a,b)=>a-b),[84,85,86,87,88,89]);
  // --- outils (joueur 0 = moi, joueur 1 = adversaire)
  const prep=(main,rg)=>{const s=M.nouvelle(5,[DS1,DS2]);s.phase='jeu';s.mull=[true,true];s.joueur=0;s.premier=0;s.tour=1;const J=s.j[0];J.etapeForge=false;J.energie=30;J.main=main.slice();J.deck=[];J.forge=[];
    s.j[1].main=[];s.j[1].deck=[];s.j[1].etapeForge=false;s.deckLibre=true;s.terrains=[TA(1),TA(8),TA(4)];if(rg!==undefined)s.rng=[rg,rg*7];return s};
  const moi=(s,c,f,l,k,x)=>{s.j[0].grille[l][k]={c,f,d:0,...(x||{})}},adv=(s,c,f,l,k,x)=>{s.j[1].grille[l][k]={c,f,d:0,...(x||{})}};
  const pose=(s,c,l,k)=>M.applique(s,0,{t:'p',c,l,k}),codes=s=>M.legales(s,0).map(M.code).sort(),L=s=>s.log.map(x=>x[1]);
  /* bonus KEKWait : Shifukuro moins SuperFishman a la meme place (memes elements, Force 1 ; aucun Golem adverse en face dans ces cas) ; copieur : cp '025' moins cp null */
  const kw=(s,l,k)=>{const g=s.j[0].grille[l][k],c=g.c,f1=M.forceDe(s,0,l,k);g.c=SF;const f0=M.forceDe(s,0,l,k);g.c=c;return f1-f0};
  const kc=(s,l,k)=>{const g=s.j[0].grille[l][k],cp=g.cp,f1=M.forceDe(s,0,l,k);g.cp=null;const f0=M.forceDe(s,0,l,k);g.cp=cp;return f1-f0};
  // --- KEKWait : +1 par Golem allie au-dessus sur son terrain, en continu
  let s=prep([]);moi(s,SH,1,0,1);eq(M.forceDe(s,0,0,1),1,'ligne 1 : +0');eq(M.kekwait(s.j[0].grille,0,1),0);
  s=prep([]);moi(s,TR,1,0,1);moi(s,SH,1,1,1);eq(kw(s,1,1),1,'ligne 2 : +1');eq(M.forceDe(s,0,1,1),2);
  s=prep([]);moi(s,TR,1,0,1);moi(s,KC,1,1,1);moi(s,SH,1,2,1);eq(kw(s,2,1),2,'ligne 3 : +2');eq(M.forceDe(s,0,2,1),3,'1 + 2, sans Trait');eq(M.kekwait(s.j[0].grille,2,1),2);
  s=prep([]);moi(s,TR,1,0,1);moi(s,SH,1,2,1);eq(kw(s,2,1),1,'pas besoin d etre adjacent');eq(M.forceDe(s,0,2,1),2);
  s=prep([]);moi(s,TR,1,0,0);moi(s,TR+1,1,1,2);moi(s,TR+2,1,0,2);moi(s,KC,1,2,0);moi(s,SH,1,2,1);eq(kw(s,2,1),0,'autres terrains, diagonales, voisins de ligne : rien');
  s=prep([]);moi(s,SH,1,0,1);moi(s,TR,1,1,1);moi(s,KC,1,2,1);eq(kw(s,0,1),0,'au-dessous : rien');
  s=prep([]);moi(s,57,1,0,0);moi(s,69,0,0,1,{maitre:57});moi(s,SH,1,1,1);eq(kw(s,1,1),0,'animal au-dessus : rien');
  s=prep([]);moi(s,69,0,0,1,{maitre:57});moi(s,57,1,1,1);moi(s,SH,1,2,1);eq(kw(s,2,1),1,'animal + Golem au-dessus : +1');
  s=prep([]);adv(s,TR,5,0,1);adv(s,TR+1,5,1,1);moi(s,SH,1,2,1);eq(kw(s,2,1),0,'Golems adverses : rien');
  s=prep([]);moi(s,TR,1,0,1);moi(s,KC,1,1,1);moi(s,SH,1,2,1,{d:2});eq(M.forceDe(s,0,2,1),1,'degats deduits');
  // perte du bonus : mort en chaine (Slim K adverse tue le Golem au-dessus)
  s=prep([]);moi(s,TR,1,0,1);moi(s,SH,1,2,1,{d:1});eq(M.forceDe(s,0,2,1),1);
  s.joueur=1;s.j[1].main=[3];s.j[1].energie=9;adv(s,0,8,0,0);M.applique(s,1,{t:'p',c:3,l:0,k:0});
  ok(!s.j[0].grille[0][1]&&!s.j[0].grille[2][1],'Trigas puis Shifukuro meurent');ok(L(s).includes('Trigas meurt.'));ok(L(s).includes('Shifukuro meurt ensuite : il perd le bonus de Trigas.'),JSON.stringify(L(s).slice(-3)));
  ok(s.stats.ev.some(e=>e.t==='m'&&e.cc===SH&&e.ch===1&&e.sc===3),'mort de Shifukuro au compte de Slim K (en chaine)');
  // decompte : bonus KEKWait note (statistiques) ; bilan sans erreur
  s=prep([]);moi(s,TR,1,0,1);moi(s,KC,1,1,1);moi(s,SH,1,2,1);s.j[0].main=[];s.joueur=1;s.tour=3;s.j[1].etapeForge=false;M.applique(s,1,{t:'x'});
  eq(s.stats.ev.filter(e=>e.t==='b'&&e.y==='kekwait'&&e.r===SH).length,2,'deux bonus KEKWait au decompte');const bl=M.bilan(s);eq(bl.joueurs[0].cartes.find(c=>c.carte==='Shifukuro').bonusRecus.kekwait,2);
  // copies de KEKWait : Apo et chansonnier, depuis leur propre case
  s=prep([]);moi(s,TR,1,0,1);moi(s,KC,1,1,1);moi(s,MD,3,2,1,{cp:'025'});eq(kc(s,2,1),2,'Apo en Shifukuro, ligne 3 : +2');
  s=prep([]);moi(s,TR,1,0,0);moi(s,MD,3,1,0,{cp:'025'});moi(s,SH,1,1,1);eq(kc(s,1,0),1,'depuis sa case');eq(kw(s,1,1),0,'le Shifukuro original n a rien au-dessus');
  s=prep([]);moi(s,TR,1,0,1);moi(s,CH,3,2,1,{cp:'025'});eq(kc(s,2,1),1,'chansonnier en Shifukuro');
  s=prep([MD]);moi(s,TR,1,0,1);moi(s,SH,1,2,0);moi(s,AP,2,2,1);pose(s,MD,2,1);let g=s.j[0].grille[2][1];eq(g.cp,'025','Deguisement d office');eq(kc(s,2,1),1);ok(!s.attente);
  ok(L(s).includes('Apo (Maître du déguisement) copie Shifukuro.'));
  s=prep([CH]);moi(s,TR,1,0,1);moi(s,VE,2,2,1);adv(s,SH,1,2,1);pose(s,CH,2,1);ok(s.attente&&s.attente.t==='i');M.applique(s,0,{t:'i',o:1});g=s.j[0].grille[2][1];eq(g.cp,'025','Imitation de Shifukuro');eq(kc(s,2,1),1,'au-dessus du chansonnier, dans sa grille');
  // --- evolution : perd KEKWait, Force 4, meandyou
  s=prep([MO]);moi(s,TR,1,0,1);moi(s,KC,1,1,1);moi(s,SH,1,2,1,{d:1});eq(M.forceDe(s,0,2,1),2);pose(s,MO,2,1);g=s.j[0].grille[2][1];
  eq(M.carte(g.c).id,'025e');eq(M.idEff(g),'025e');eq(g.d,0,'degats effaces par l evolution');eq(M.forceDe(s,0,2,1),4,'Force 4, KEKWait perdu');
  ok(s.attente&&s.attente.t==='u'&&s.attente.p===0,'choix meandyou');deq(s.attente.i,[2,1]);deq(codes(s),['e0111','e1121','v'],'paires sans doublon');deq(s.attente.haut,[[0,1],[1,1]]);deq(M.attendus(s),[0]);
  assert.throws(()=>M.applique(s,0,{t:'x'}));assert.throws(()=>M.applique(s,1,{t:'v'}),'pas a l adversaire');assert.throws(()=>M.applique(s,0,{t:'e',a:[0,1],b:[2,1]}),'pas voisins');nv+=3;
  // ligne 1 : aucun Golem au-dessus ; animal seul au-dessus ; vide au-dessus
  s=prep([MO]);moi(s,SH,1,0,1);moi(s,TR,1,1,1);pose(s,MO,0,1);ok(!s.attente);ok(L(s).includes('Shifukuro (Le modérateur) : meandyou, aucun échange possible.'));
  s=prep([MO]);moi(s,57,1,0,0);moi(s,69,0,0,1,{maitre:57});moi(s,SH,1,1,1);pose(s,MO,1,1);ok(!s.attente,'animal au-dessus : rien');ok(s.j[0].grille[0][1].c===69);
  s=prep([MO]);moi(s,TR,1,1,0);moi(s,SH,1,2,1);pose(s,MO,2,1);ok(!s.attente,'colonne vide au-dessus');
  // ligne 2 : le moderateur est voisin du Golem juste au-dessus ; animaux, diagonales et Golems adverses exclus
  s=prep([MO]);moi(s,TR,1,0,1);moi(s,SH,1,1,1);pose(s,MO,1,1);deq(codes(s),['e0111','v']);
  M.applique(s,0,{t:'e',a:[1,1],b:[0,1]});eq(s.j[0].grille[0][1].c,MO,'le moderateur monte');eq(s.j[0].grille[1][1].c,TR);eq(s.attente,null);
  ok(L(s).includes('Shifukuro (Le modérateur) : meandyou, échange Trigas et Shifukuro (Le modérateur).'),JSON.stringify(L(s).slice(-2)));
  s=prep([MO]);moi(s,57,1,0,0);moi(s,69,0,1,0,{maitre:57});moi(s,TR,1,1,1);moi(s,KC,1,1,2);moi(s,0,8,0,2);moi(s,SH,1,2,1);adv(s,TR,1,1,1);adv(s,TR,1,0,1);pose(s,MO,2,1);
  deq(codes(s),['e1112','e1121','v'],'Kiwi, diagonales et adverses exclus');deq(s.attente.haut,[[1,1]]);
  // echange : degats gardes, aucun effet a la pose, ordre libre, hasard intact
  s=prep([MO]);moi(s,39,1,0,0,{d:1});moi(s,AP,2,0,1,{d:1});moi(s,SH,1,1,1);pose(s,MO,1,1);deq(codes(s),['e0001','e0111','v']);const s2=JSON.parse(JSON.stringify(s));const rg=JSON.stringify(s.rng),n0=s.log.length;
  M.applique(s,0,{t:'e',a:[0,1],b:[0,0]});eq(s.j[0].grille[0][0].c,AP);eq(s.j[0].grille[0][0].d,1,'degats gardes');eq(s.j[0].grille[0][1].c,39);eq(s.j[0].grille[0][1].d,1);eq(JSON.stringify(s.rng),rg,'aucun de');
  deq(L(s).slice(n0),['Shifukuro (Le modérateur) : meandyou, échange Glad et Apo.'],'ni Gamba ni Slam');ok(s.stats.act.some(x=>x.nom==='meandyou'&&x.e==='Échange 2 Golems'));
  M.applique(s2,0,{t:'v'});eq(s2.attente,null);eq(s2.j[0].grille[0][0].c,39,'passer : rien ne bouge');ok(L(s2).includes('Shifukuro (Le modérateur) : meandyou, pas d\'échange.'));ok(s2.stats.act.some(x=>x.nom==='meandyou'&&x.e==='Refusé'));
  // echange qui tue : Trigas perd son Trait
  s=prep([MO]);moi(s,TR,1,0,0,{d:1});moi(s,KC,2,0,1);moi(s,SH,1,1,1);eq(M.forceDe(s,0,0,0),1);pose(s,MO,1,1);deq(codes(s),['e0001','e0111','v']);M.applique(s,0,{t:'e',a:[0,1],b:[1,1]});
  ok(!s.j[0].grille[0][0],'Trigas meurt');ok(L(s).includes('Trigas meurt.'));ok(s.stats.ev.some(e=>e.t==='m'&&e.cc===TR&&e.sc===MO&&e.lib==='À la pose'),'mort au compte du moderateur');
  // Apo qui copie meandyou : joue depuis sa case
  s=prep([MD]);moi(s,MO,4,2,0);moi(s,TR,1,0,1);moi(s,KC,1,0,2);moi(s,AP,2,2,1);pose(s,MD,2,1);g=s.j[0].grille[2][1];eq(g.cp,'025e');ok(L(s).includes('Apo (Maître du déguisement) copie Shifukuro (Le modérateur).'));
  ok(s.attente&&s.attente.t==='u');deq(s.attente.i,[2,1]);deq(codes(s),['e0102','v']);M.applique(s,0,{t:'e',a:[0,1],b:[0,2]});eq(s.j[0].grille[0][1].c,KC);
  ok(L(s).includes('Apo (Maître du déguisement) : meandyou, échange Trigas et Bellock.'));
  s=prep([MD]);moi(s,MO,4,2,0);moi(s,AP,2,2,1);pose(s,MD,2,1);ok(!s.attente);ok(L(s).includes('Apo (Maître du déguisement) : meandyou, aucun échange possible.'));
  // chansonnier qui copie meandyou (Moderateur adverse en face) : depuis sa case, dans sa grille
  s=prep([CH]);moi(s,TR,1,0,1);moi(s,VE,2,1,1);adv(s,MO,4,1,1);adv(s,KC,2,0,1);pose(s,CH,1,1);M.applique(s,0,{t:'i',o:1});g=s.j[0].grille[1][1];eq(g.cp,'025e');
  ok(s.attente&&s.attente.t==='u');deq(codes(s),['e0111','v']);M.applique(s,0,{t:'e',a:[0,1],b:[1,1]});eq(s.j[0].grille[0][1].c,CH);ok(L(s).includes('Velnen (Le chansonnier) : meandyou, échange Trigas et Velnen (Le chansonnier).'));
  // l'adversaire joue le moderateur : symetrique
  s=prep([]);s.joueur=1;s.j[1].main=[MO];s.j[1].energie=9;adv(s,TR,1,0,2);adv(s,SH,1,1,2);M.applique(s,1,{t:'p',c:MO,l:1,k:2});ok(s.attente&&s.attente.t==='u'&&s.attente.p===1);
  deq(M.legales(s,1).map(M.code).sort(),['e0212','v']);deq(M.legales(s,0),[]);M.applique(s,1,{t:'e',a:[0,2],b:[1,2]});eq(s.j[1].grille[0][2].c,MO);
  // --- robot : echange seulement s'il ameliore son estimation
  const gagne=f=>{const s=prep([MO]);moi(s,TR,1,0,0);moi(s,0,8,0,1);moi(s,SH,1,1,0);adv(s,TR,f,2,0);adv(s,TR+1,3,1,1);s.j[0].energie=3;return s};
  for(const niv of ['normal','difficile']){
    s=gagne(7);eq(M.code(M.robot(s,0,niv)),'p~o10',niv+' : pose le moderateur');pose(s,MO,1,0);deq(codes(s),['e0001','e0010','v']);
    eq(M.code(M.robot(s,0,niv)),'e0001',niv+' : echange gagnant');eq(M.code(M.robot(s,0,niv)),'e0001','deterministe');
    s=gagne(15);pose(s,MO,1,0);eq(M.robot(s,0,niv).t,'v',niv+' : echange inutile, passe');
    s=prep([MO]);moi(s,TR,1,0,1);moi(s,SH,1,1,1);pose(s,MO,1,1);eq(M.robot(s,0,niv).t,'v',niv+' : rien a gagner, passe');
  }
  for(let r=1;r<30;r++){s=prep([MO],r);moi(s,TR,r%4,0,1);moi(s,KC,1+r%3,0,r%2*2);moi(s,SH,1,1+r%2,1);if(r%3)adv(s,TR,r%5+1,r%3,r%3);pose(s,MO,1+r%2,1);
    if(s.attente)for(const niv of ['facile','normal','difficile']){const x=M.robot(s,0,niv);ok(M.legales(s,0).some(y=>M.code(y)===M.code(x)),'choix legal '+niv)}}
  // --- parties aleatoires et robot contre robot : rejeux identiques, paire donnee dans les deux ordres
  const verifieU=u=>{const a=u.attente;if(!a||a.t!=='u')return;ok(a.coups.length>0,'attente sans echange');const G=u.j[a.p].grille,[il,ik]=a.i;
    a.coups.forEach(([x,y,p2,q])=>{ok(M.idEff(G[il][ik])==='025e'||M.carte(G[il][ik].c).id==='025e','case du moderateur');ok(golem(G[x][y])&&golem(G[p2][q])&&Math.abs(x-p2)+Math.abs(y-q)===1,'paire voisine');
      ok((y===ik&&x<il)||(q===ik&&p2<il),'un Golem au-dessus');ok(x*3+y<p2*3+q,'ordre de lecture')})};
  const golem=h=>!!h&&!M.estAnimal(h.c);
  const cpt=(X,J,u)=>({e:X.filter(x=>/: meandyou, échange /.test(x)).length,v:X.filter(x=>/: meandyou, pas d'échange/.test(x)).length,n:X.filter(x=>/: meandyou, aucun échange/.test(x)).length,
    m:X.filter(x=>/Shifukuro meurt ensuite : il perd le bonus/.test(x)).length,kb:u.stats.ev.filter(e=>e.t==='b'&&e.y==='kekwait').length,
    c0:X.filter(x=>/copie Shifukuro\.$/.test(x)).length,c1:X.filter(x=>/copie Shifukuro \(Le modérateur\)\./.test(x)).length,
    ps:u.stats.ev.filter(e=>e.t==='p'&&M.carte(e.cc).id==='025').length,pm:u.stats.ev.filter(e=>e.t==='p'&&M.carte(e.cc).id==='025e').length});
  let rev=0;
  const jouer=(gr,dk,choix)=>{const u=M.nouvelle(gr,dk),j=[[],[]];let pas=0;
    while(!u.fin){assert(++pas<2000,'blocage Shifukuro '+gr);const att=M.attendus(u),p=choix?att[0]:att[rnd(att.length)],l=M.legales(u,p);assert(l.length,'aucune action '+gr);let x;
      if(choix){x=M.robot(u,p,choix(p));assert(x,'robot sans coup');}else{const pref=l.filter(y=>y.t==='p'||y.t==='f'||y.t==='j'||y.t==='i'||y.t==='e'||y.t==='w'||y.t==='y');x=pref.length&&rnd(5)?pref[rnd(pref.length)]:l[rnd(l.length)]}
      if(x.t==='e'&&u.attente&&u.attente.t==='u'&&rnd(2)){x={t:'e',a:x.b,b:x.a};rev++}
      M.applique(u,p,x);j[p].push(M.code(x));verifie(u);verifieU(u)}
    const r=M.rejoue(gr,[M.litJournal(M.ecritJournal(j[0])),M.litJournal(M.ecritJournal(j[1]))],dk);assert(!r.erreur,r.erreur);assert.strictEqual(JSON.stringify(r.etat),JSON.stringify(u),'rejeu Shifukuro '+gr);M.bilan(u);nv++;
    return cpt(u.log.map(y=>y[1]),j,u)};
  const add=(t,c)=>{for(const k in c)t[k]=(t[k]||0)+c[k]};
  const tot={};for(let i=0;i<300;i++)add(tot,jouer((i*7741+523)|0,[[DS1,DS2,DS3][i%3],[DS3,DS1,'',DS2][i%4]]));
  const rev0=rev;rev=0;ok(tot.e&&tot.v&&tot.n&&tot.kb&&rev0,'meandyou ou KEKWait jamais joue '+JSON.stringify(tot));
  const niv=['facile','normal','difficile'],rt={};let nr=0;
  for(let i=0;i<450;i++){add(rt,jouer((i*15485863+1231)|0,[[DS1,DS2,DS3][i%3],[DS3,DS1,'',DS2][i%4]],p=>niv[i<300?(i+p)%3:i%3]));nr++}
  ok(rt.e&&rt.kb&&rev,'robot : meandyou jamais joue '+JSON.stringify(rt));
  console.log('Shifukuro OK : '+nv+' verifications, 300 parties aleatoires ('+tot.ps+' Shifukuro poses, '+tot.pm+' moderateurs, '+tot.e+' echanges dont '+rev0+' paires inversees, '+tot.v+' refus, '+tot.n+' sans cible, '+tot.kb+' bonus KEKWait au decompte, '+tot.m+' morts par perte du bonus, copies '+tot.c0+'/'+tot.c1+')'
    +' et '+nr+' parties robot (dont 150 a niveau egal ; '+rt.ps+' Shifukuro, '+rt.pm+' moderateurs, '+rt.e+' echanges dont '+rev+' paires inversees, '+rt.v+' refus, '+rt.n+' sans cible, '+rt.kb+' bonus KEKWait, '+rt.m+' morts par perte du bonus, copies '+rt.c0+'/'+rt.c1+'), rejeux identiques');
}
{ // Bellock/Loxim : Bellock (015, cartes 90-92, ~r ~s ~t), Aiges Captain (015e, 93-95, ~u ~v ~w), Loxim (016, 96-98, ~x ~y ~z), Le Ace de Aiges (016e, 99-101, ~A ~B ~C).
  // Comeback / Winstreak (s.resultats), « si tu forges cette carte » (0.2b.1 : pioche au hasard parmi tous les exemplaires du partenaire, plus de coup 'r'), Double up ? (REGLAGE_DUO.doubleUp).
  // Autres : KaTarN 0, Slim K 3, Cyrdan 12, Trigas 24, K-Chan 30, Apo 45, Maitre du deguisement 48, Titom76 57, Spom 63, Kiwi 69, Velnen 78, chansonnier 81.
  let nv=0;const ok=(c,m)=>{assert(c,m);nv++},eq=(a,b,m)=>{assert.strictEqual(a,b,m);nv++},deq=(a,b,m)=>{assert.deepStrictEqual(a,b,m);nv++};
  const BE=90,AC=93,LO=96,AA=99,TR=24,KC=30,AP=45,MD=48,TI=57,SP=63,VE=78,CH=81;
  eq(M.carte(90).id,'015');eq(M.carte(92).id,'015');eq(M.carte(93).id,'015e');eq(M.carte(95).id,'015e');eq(M.carte(96).id,'016');eq(M.carte(98).id,'016');eq(M.carte(99).id,'016e');eq(M.carte(101).id,'016e');
  eq(M.carte(89).id,'025e','moderateur inchange');eq(M.carte(84).id,'025','Shifukuro inchange');
  eq(M.TYPES.indexOf('015'),30);eq(M.TYPES.indexOf('015e'),31);eq(M.TYPES.indexOf('016'),32);eq(M.TYPES.indexOf('016e'),33);eq(M.TYPES.length,42);eq(M.TYPES.indexOf('025e'),29);eq(M.TYPES_TEST.length,11,'paquet de test inchange');
  const B0=M.CARTES['015'],B1=M.CARTES['015e'],L0=M.CARTES['016'],L1=M.CARTES['016e'];
  eq(B0.nom,'Bellock');eq(B0.cout,1);eq(B0.force,1);ok(!B0.base);eq(B1.nom,'Aiges Captain');eq(B1.base,'015');eq(B1.cout,5);eq(B1.force,4);
  eq(L0.nom,'Loxim');eq(L0.cout,5);eq(L0.force,4);ok(!L0.base);eq(L1.nom,'Le Ace de Aiges');eq(L1.base,'016');eq(L1.cout,1);eq(L1.force,4);
  [B0,B1,L0,L1].forEach(C=>deq(C.el,['brume','magma'],'Brume puis Magma'));
  eq(M.nomDetail(M.carte(AC)),'Bellock (Aiges Captain)');eq(M.nomDetail(M.carte(AA)),'Loxim (Le Ace de Aiges)');deq(Object.keys(M.COPIEURS).sort(),['029e','041e'],'pas un copieur');eq(M.REGLAGE_DUO.doubleUp,3);
  // --- encodage (limite 125)
  deq([90,91,92,93,94,95,96,97,98,99,100,101].map(c=>M.code({t:'f',c})),['f~r','f~s','f~t','f~u','f~v','f~w','f~x','f~y','f~z','f~A','f~B','f~C']);
  eq(M.code({t:'p',c:AA,l:2,k:1}),'p~A21');deq(M.decode('p~A21'),{t:'p',c:AA,l:2,k:1});assert.throws(()=>M.decode('r~A'),'plus de coup r');assert.throws(()=>M.decode('r5'),'plus de coup r');nv+=2;
  for(let c=0;c<102;c++){for(const t of ['f','j','c','d','s'])deq(M.decode(M.code({t,c})),{t,c});deq(M.decode(M.code({t:'p',c,l:1,k:2})),{t:'p',c,l:1,k:2})}
  assert.throws(()=>M.decode('r'));assert.throws(()=>M.decode('r~'));nv+=2;
  // --- decks
  const DB1=M.deckTexte({'015':3,'015e':3,'016':3,'016e':3,'007':3,'036':3,'008':3,'029':2,'029e':2});
  const DB2=M.deckTexte({'015':3,'015e':2,'016':2,'016e':3,'001':3,'001e':3,'003':3,'041':3,'041e':3});
  const DB3=M.deckTexte({'015':3,'015e':3,'002':3,'002e':3,'009':3,'009e':3,'026':3,'026e':3,'901':1});
  const DB4=M.deckTexte({'016':3,'016e':3,'013':3,'013e':3,'037':3,'037e':3,'004':3,'004e':3,'018':3});
  ok(M.lisDeck(DB1)&&M.lisDeck(DB2)&&M.lisDeck(DB3)&&M.lisDeck(DB4),'decks valides');eq(DB1.slice(-18),'0153015e30163016e3','Bellock et Loxim apres Shifukuro');
  const sd=M.nouvelle(3,[DB1,'']);deq([...sd.j[0].deck,...sd.j[0].main].filter(c=>c>=90).sort((a,b)=>a-b),[90,91,92,93,94,95,96,97,98,99,100,101]);deq(sd.resultats,[],'historique vide');
  // --- outils (joueur 0 = moi, joueur 1 = adversaire)
  const prep=(main,T)=>{const s=M.nouvelle(5,[DB1,DB2]);s.phase='jeu';s.mull=[true,true];s.joueur=0;s.premier=0;s.tour=1;const J=s.j[0];J.etapeForge=false;J.energie=30;J.main=main.slice();J.deck=[];J.forge=[];
    s.j[1].main=[];s.j[1].deck=[];s.j[1].etapeForge=false;s.deckLibre=true;s.terrains=(T||[8,9,3]).map(TA);return s};
  const moi=(s,c,f,l,k,x)=>{s.j[0].grille[l][k]={c,f,d:0,...(x||{})}},adv=(s,c,f,l,k,x)=>{s.j[1].grille[l][k]={c,f,d:0,...(x||{})}};
  const pose=(s,c,l,k)=>M.applique(s,0,{t:'p',c,l,k}),codes=(s,p)=>M.legales(s,p||0).map(M.code).sort(),L=s=>s.log.map(x=>x[1]);
  /* bonus d'historique (Comeback, Winstreak) : Force moins Force sans historique ; Double up ? : Force moins Force avec REGLAGE_DUO.doubleUp a 0 ; copie : cp moins cp null */
  const hb=(s,p,l,k)=>{const r=s.resultats,f1=M.forceDe(s,p,l,k);s.resultats=[];const f0=M.forceDe(s,p,l,k);s.resultats=r;return f1-f0};
  const du=(s,l,k,p)=>{const r=M.REGLAGE_DUO.doubleUp,f1=M.forceDe(s,p||0,l,k);M.REGLAGE_DUO.doubleUp=0;const f0=M.forceDe(s,p||0,l,k);M.REGLAGE_DUO.doubleUp=r;return f1-f0};
  const kc=(s,l,k)=>{const g=s.j[0].grille[l][k],cp=g.cp,f1=M.forceDe(s,0,l,k);g.cp=null;const f0=M.forceDe(s,0,l,k);g.cp=cp;return f1-f0};
  const finManche=s=>{s.j[0].main=[];s.j[1].main=[];const q=1-s.premier;s.joueur=q;s.tour=3;s.j[q].etapeForge=false;s.attente=null;M.applique(s,q,{t:'x'})};
  // --- Comeback et Winstreak : manches deja decomptees, egalite exclue, terrain du Golem, propriétaire
  const H=[[1,0,null],[1,1,0]]; /* terrain 0 : perdu 2 fois ; terrain 1 : gagne puis perdu ; terrain 2 : egalite puis gagne */
  const un=(c,f,l,k,p)=>{const s=prep([]);s.resultats=H;(p?adv:moi)(s,c,f,l,k);return hb(s,p||0,l,k)};
  eq(un(BE,1,0,0),2,'Bellock : 2 manches perdues');eq(un(BE,1,1,1),1);eq(un(BE,1,2,2),0,'egalite et victoire : rien');
  eq(un(LO,4,0,0),0);eq(un(LO,4,1,1),1,'Loxim : 1 manche remportee');eq(un(LO,4,2,2),1,'egalite exclue');
  eq(un(AC,4,0,0),4,'Aiges Captain : +2 par manche perdue');eq(un(AC,4,1,1),2);eq(un(AA,4,2,2),2,'Le Ace de Aiges : +2 par manche remportee');eq(un(AA,4,0,0),0);
  eq(un(BE,1,0,0,1),0,'adversaire : il a gagne le terrain 0');eq(un(LO,4,0,0,1),2,'adversaire : Winstreak 2');eq(un(AC,4,2,2,1),2,'adversaire : terrain 2 perdu une fois');
  {const s=prep([]);moi(s,BE,1,0,0);eq(M.forceDe(s,0,0,0),1,'sans historique : Force de la carte');s.resultats=H;eq(M.forceDe(s,0,0,0),3);moi(s,BE,1,0,0,{d:2});eq(M.forceDe(s,0,0,0),1,'degats deduits');}
  // decompte reel : historique memorise, bonus au decompte suivant (statistiques), egalite qui ne compte pas
  let s=prep([]);moi(s,BE,1,0,0);adv(s,BE+1,2,0,0);moi(s,LO,4,2,1);finManche(s);
  deq(s.resultats,[[1,0,null]],'historique de la manche 1');eq(s.manche,2);eq(M.forceDe(s,0,0,0),2,'Bellock : +1 aussitot');eq(M.forceDe(s,0,2,1),5,'Loxim : +1 aussitot');
  ok(!s.stats.ev.some(e=>e.t==='b'&&(e.y==='comeback'||e.y==='winstreak')),'rien au premier decompte');
  finManche(s);deq(s.resultats,[[1,0,null],[null,0,null]],'egalite 2 contre 2 sur le terrain 0');eq(M.forceDe(s,0,0,0),2,'egalite : pas de +1');eq(M.forceDe(s,0,2,1),6);
  eq(s.stats.ev.filter(e=>e.t==='b'&&e.y==='comeback'&&e.r===BE).length,1,'Comeback au decompte');eq(s.stats.ev.filter(e=>e.t==='b'&&e.y==='winstreak'&&e.r===LO).length,1,'Winstreak au decompte');
  {const bl=M.bilan(s),c=bl.joueurs[0].cartes;eq(c.find(x=>x.carte==='Bellock').bonusRecus.comeback,1);eq(c.find(x=>x.carte==='Loxim').bonusRecus.winstreak,1);eq(c.find(x=>x.carte==='Loxim').bonusDonnes.winstreak,undefined,'pas donne a soi');}
  // Salle Verrouillee avant la manche 3 : personne ne la remporte
  s=prep([],[4,8,9]);moi(s,BE,1,0,0);adv(s,BE+1,2,0,0);finManche(s);deq(s.resultats,[[null,null,null]]);eq(M.forceDe(s,0,0,0),1,'Salle : rien avant la manche 3');
  // evolution : relit le meme historique en +2, rien n'est perdu
  s=prep([AC]);moi(s,BE,1,0,0,{d:1});s.resultats=[[1,null,null],[1,null,null]];eq(M.forceDe(s,0,0,0),2);pose(s,AC,0,0);eq(M.forceDe(s,0,0,0),8,'Aiges Captain : 4 + 2 x 2, degats effaces');ok(!s.attente);
  s=prep([AA]);moi(s,LO,4,1,2);s.resultats=[[null,null,0]];eq(M.forceDe(s,0,1,2),5);pose(s,AA,1,2);eq(M.forceDe(s,0,1,2),6,'Le Ace de Aiges : 4 + 2');
  // deplace : compte les manches de son nouveau terrain (La Faille en terrain 0)
  s=prep([],[0,8,9]);moi(s,BE,1,0,1);s.resultats=[[1,0,null]];eq(hb(s,0,0,1),0);M.applique(s,0,{t:'y',l:0,k:1,d:2});ok(s.j[0].grille[2][0]&&s.j[0].grille[2][0].c===BE);eq(hb(s,0,2,0),1,'deplace : +1 sur La Faille');
  // --- « si tu forges cette carte » (0.2b.1) : un exemplaire du partenaire AU HASARD parmi tous ceux du deck (bases et evolutions), sans choix ni attente
  const forge=(main,deck)=>{const s=prep(main);s.j[0].deck=deck.slice();s.j[0].energie=0;s.j[0].etapeForge=true;return s};
  /* pioche : la carte du duo arrivee en main (une seule) ; ligne de journal attendue pour cette carte */
  const pioche=(s,av)=>{const n=s.j[0].main.filter(c=>!av.includes(c));eq(n.length,1,'une carte piochee');return n[0]};
  const ligneP=(de,c)=>de+', pioche '+M.nomDetail(M.carte(c))+' dans son deck, puis le mélange.';
  s=forge([BE,KC],[TR,LO,KC+1,AA,LO+1]);ok(codes(s).includes('f~r'));deq(M.partenaires(s.j[0],BE),[LO,LO+1,AA],'tous les exemplaires, par numero');deq(M.partenaires(s.j[0],KC),[],'pas du duo');
  let rg=JSON.stringify(s.rng);const s2=JSON.parse(JSON.stringify(s));M.applique(s,0,{t:'f',c:BE});
  eq(s.attente,null,'pas de choix');ok(!M.legales(s,0).some(a=>a.t==='r'),'plus de coup r');deq(M.attendus(s),[0]);eq(s.j[0].energie,1);
  let x=pioche(s,[KC]);ok([LO,LO+1,AA].includes(x),'un Loxim');ok(!s.j[0].deck.includes(x));eq(s.j[0].deck.length,4);deq(s.j[0].deck.concat(x).sort((a,b)=>a-b),[TR,KC+1,LO,LO+1,AA]);
  ok(JSON.stringify(s.rng)!==rg,'tirage et melange');eq(s.j[0].etapeForge,false,'etape de Forge finie');ok(L(s).includes(ligneP('Bellock : Comeback',x)),JSON.stringify(L(s).slice(-2)));
  ok(s.stats.act.some(x=>x.nom==='Comeback'&&x.e==='Cherche Loxim'));
  M.applique(s2,0,{t:'f',c:BE});eq(JSON.stringify(s2),JSON.stringify(s),'meme graine : meme tirage, meme deck');
  // ancien coup 'r' refuse
  s=forge([BE,KC],[LO,AA]);M.applique(s,0,{t:'f',c:BE});assert.throws(()=>M.applique(s,0,{t:'r',c:LO}),'coup r interdit');nv++;
  // pondere par les exemplaires : graines variees du generateur du joueur, frequence de chaque exemplaire
  const freq=(deck,N)=>{const s0=forge([BE,KC],deck),n={};for(let i=0;i<N;i++){const s=JSON.parse(JSON.stringify(s0));s.rng[0]=Math.imul(i+1,2654435761)|0;
      M.applique(s,0,{t:'f',c:BE});const c=pioche(s,[KC]);n[c]=(n[c]||0)+1}return n};
  const N=6000,proche=(n,p,m)=>{const e=Math.abs((n||0)/N-p);ok(e<.025,m+' : '+((n||0)/N).toFixed(3)+' attendu '+p.toFixed(3))};
  let fq=freq([LO,LO+1,LO+2,AA,TR,KC+1],N);deq(Object.keys(fq).map(Number).sort((a,b)=>a-b),[LO,LO+1,LO+2,AA],'jamais une autre carte');
  [LO,LO+1,LO+2,AA].forEach(c=>proche(fq[c],.25,'3 Loxim et 1 Ace : exemplaire '+c));proche(fq[AA],.25,'evolution 1 fois sur 4');
  fq=freq([LO,AA,AA+1,AA+2],N);proche((fq[AA]||0)+(fq[AA+1]||0)+(fq[AA+2]||0),.75,'1 Loxim et 3 Ace : evolution 3 fois sur 4');
  fq=freq([LO,AA],N);proche(fq[LO],.5,'1 et 1');proche(fq[AA],.5,'1 et 1');
  fq=freq([TR,AA+2,KC+1],200);deq(Object.keys(fq).map(Number),[AA+2],'un seul exemplaire : toujours lui');
  // aucun : rien, pas de melange
  s=forge([BE,KC],[TR,KC+1]);rg=JSON.stringify(s.rng);M.applique(s,0,{t:'f',c:BE});eq(s.attente,null);deq(s.j[0].deck,[TR,KC+1],'deck intact');eq(JSON.stringify(s.rng),rg,'pas de tirage ni de melange');
  ok(L(s).includes('Bellock : Comeback, aucun Loxim dans le deck.'));ok(s.stats.act.some(x=>x.nom==='Comeback'&&x.e==='Aucun Loxim'));
  // Loxim et les evolutions piochent aussi
  s=forge([LO+2,KC],[TR,AC,BE+1,AC+1]);M.applique(s,0,{t:'f',c:LO+2});eq(s.attente,null);x=pioche(s,[KC]);ok([BE+1,AC,AC+1].includes(x));ok(L(s).includes(ligneP('Loxim : Winstreak',x)));
  s=forge([AC,KC],[LO]);M.applique(s,0,{t:'f',c:AC});ok(s.j[0].main.includes(LO));ok(L(s).includes('Bellock (Aiges Captain) : Comeback, pioche Loxim dans son deck, puis le mélange.'));
  s=forge([AA+1,KC],[BE,TR]);M.applique(s,0,{t:'f',c:AA+1});ok(s.j[0].main.includes(BE));
  s=forge([KC,TR],[LO]);M.applique(s,0,{t:'f',c:KC});deq(s.j[0].deck,[LO],'autre carte forgee : rien');
  // Forge eclair (Spom) : compte comme forger ; l'etape reprend si la main se remplit
  s=forge([BE],[LO]);moi(s,SP,1,2,2);s.j[0].eclair=1;M.applique(s,0,{t:'f',c:BE});deq(s.j[0].main,[LO]);eq(s.j[0].etapeForge,true,'main remplie : Forge eclair encore possible');ok(codes(s).includes('j~x'));
  M.applique(s,0,{t:'j',c:LO});deq(s.j[0].main,[]);ok(L(s).includes('Loxim : Winstreak, aucun Bellock dans le deck.'));
  s=forge([KC,BE,TR],[LO,AA,LO+1]);moi(s,SP,1,2,2);s.j[0].eclair=1;M.applique(s,0,{t:'f',c:KC});M.applique(s,0,{t:'j',c:BE});eq(s.attente,null,'Forge eclair : pas de choix');
  x=pioche(s,[TR]);ok([LO,LO+1,AA].includes(x));eq(s.j[0].deck.length,2);eq(s.j[0].etapeForge,false,'eclair use, Forge faite');eq(s.j[0].eclairUtil,1);ok(L(s).includes(ligneP('Bellock : Comeback',x)));
  // Spam de Trigas : compte comme forger (hors etape de Forge)
  s=prep([TR,BE]);s.j[0].deck=[KC,LO,AA];pose(s,TR,0,0);ok(s.attente&&s.attente.t==='s');let av=s.j[0].main.filter(c=>c!==BE);M.applique(s,0,{t:'s',c:BE});eq(s.attente,null,'Spam : pas de choix');
  x=pioche(s,av);ok([LO,AA].includes(x));eq(s.j[0].etapeForge,false);ok(L(s).includes(ligneP('Bellock : Comeback',x)));
  s=prep([TR,BE]);s.j[0].deck=[KC,LO];pose(s,TR,0,0);M.applique(s,0,{t:'s',c:BE});eq(s.attente,null);ok(s.j[0].main.includes(LO));
  // defausse a 7 : ce n'est pas forger
  s=prep([BE,KC,KC+1,TR,TR+1,TR+2,AP,AP+1]);s.j[0].deck=[LO];M.applique(s,0,{t:'x'});ok(s.attente&&s.attente.t==='d');M.applique(s,0,{t:'d',c:BE});deq(s.j[0].deck,[LO]);ok(!L(s).some(x=>/Comeback/.test(x)),'pas de recherche');
  // --- Double up ? : meme ligne ou meme terrain, troisieme case vide, +3 une seule fois, evolutions seulement
  const D=(f)=>{const s=prep([]);f(s);return s};
  s=D(s=>{moi(s,AC,4,0,0);moi(s,LO,4,0,2)});eq(du(s,0,0),3,'ligne, case du milieu vide');eq(M.forceDe(s,0,0,0),7);eq(du(s,0,2),0,'Loxim de base : pas de Double up');eq(M.doubleUp(s.j[0].grille,0,0,'015e').c,LO);
  s=D(s=>{moi(s,AA,4,0,1);moi(s,BE,1,2,1)});eq(du(s,0,1),3,'terrain');eq(du(s,2,1),0,'Bellock de base : rien');
  s=D(s=>{moi(s,AC,4,1,0);moi(s,LO,4,1,1)});eq(du(s,1,0),3,'voisins');eq(M.forceDe(s,0,1,0),9,'4 + Trait 2 + 3');
  s=D(s=>{moi(s,AC,4,0,0);moi(s,TR,1,0,1);moi(s,LO,4,0,2)});eq(du(s,0,0),0,'troisieme case occupee');
  s=D(s=>{moi(s,AC,4,0,0);moi(s,TI,1,1,1);moi(s,69,0,0,1,{maitre:TI});moi(s,LO,4,0,2)});eq(du(s,0,0),0,'un animal bloque');
  s=D(s=>{moi(s,AC,4,1,1);moi(s,LO,4,1,0);moi(s,AA,4,0,1)});eq(du(s,1,1),3,'ligne et terrain : +3 une seule fois');eq(du(s,0,1),3,'Le Ace avec Aiges Captain sur le terrain');
  s=D(s=>{moi(s,AC,4,0,0);moi(s,AA,4,0,2)});eq(du(s,0,0),3);eq(du(s,0,2),3,'deux evolutions : +3 chacune');
  s=D(s=>{moi(s,BE,1,0,0);moi(s,LO,4,0,2)});eq(du(s,0,0),0);eq(du(s,0,2),0,'deux bases : rien');
  s=D(s=>{moi(s,AC,4,0,0);moi(s,LO,4,0,1);moi(s,LO+1,4,0,2)});eq(du(s,0,0),0,'pas seuls');
  s=D(s=>{moi(s,AC,4,0,0);moi(s,AC+1,4,0,2)});eq(du(s,0,0),0,'deux Bellock : rien');
  s=D(s=>{moi(s,AC,4,0,0);adv(s,LO,4,0,2);adv(s,LO+1,4,1,0)});eq(du(s,0,0),0,'Loxim adverse : rien');
  s=D(s=>{moi(s,AC,4,0,0);moi(s,MD,3,0,2,{cp:'016'})});eq(du(s,0,0),0,'Apo deguise en Loxim n est pas Loxim');
  s=D(s=>{moi(s,AC,4,0,0);moi(s,LO,4,2,1)});eq(du(s,0,0),0,'diagonale : rien');
  s=D(s=>{adv(s,AC,4,2,2);adv(s,AA,4,0,2)});eq(du(s,2,2,1),3,'adversaire aussi');
  M.REGLAGE_DUO.doubleUp=2;s=D(s=>{moi(s,AC,4,0,0);moi(s,LO,4,0,2)});eq(du(s,0,0),2,'variante +2');eq(M.forceDe(s,0,0,0),6);M.REGLAGE_DUO.doubleUp=3;
  // perte de Double up : mort en chaine expliquee (Slim K adverse tue Loxim)
  s=prep([]);moi(s,AC,4,0,0,{d:5});moi(s,LO,4,0,2,{d:3});eq(M.forceDe(s,0,0,0),2);
  s.joueur=1;s.j[1].main=[3];s.j[1].energie=9;adv(s,0,8,0,0);M.applique(s,1,{t:'p',c:3,l:0,k:0});
  ok(!s.j[0].grille[0][2]&&!s.j[0].grille[0][0],'Loxim puis Aiges Captain meurent');ok(L(s).includes('Loxim meurt.'),JSON.stringify(L(s).slice(-3)));ok(L(s).includes('Bellock (Aiges Captain) meurt ensuite : il perd le bonus de Loxim.'),JSON.stringify(L(s).slice(-3)));
  ok(s.stats.ev.some(e=>e.t==='m'&&e.cc===AC&&e.ch===1&&e.sc===3),'mort au compte de Slim K (en chaine)');
  // la troisieme case remplie par sa propre pose : Double up ? perdu tout de suite
  s=prep([TR]);moi(s,AC,4,0,0,{d:5});moi(s,LO,4,0,2);eq(M.forceDe(s,0,0,0),2);pose(s,TR,0,1);ok(!s.j[0].grille[0][0],'Aiges Captain meurt : Trigas comble la ligne (Trait +1 seulement)');
  // decompte : bonus notes (statistiques), bilan et MVP sans erreur
  s=prep([]);moi(s,AC,4,0,0);moi(s,LO,4,0,2);s.resultats=[[1,null,null]];s.manche=2;s.premier=0;finManche(s);
  eq(s.stats.ev.filter(e=>e.t==='b'&&e.y==='doubleup'&&e.r===AC&&e.d===LO).length,3,'Double up ? : 3 au decompte');eq(s.stats.ev.filter(e=>e.t==='b'&&e.y==='comeback'&&e.r===AC).length,2,'Comeback +2');
  {const bl=M.bilan(s),c=bl.joueurs[0].cartes;eq(c.find(x=>x.carte==='Bellock (Aiges Captain)').bonusRecus.doubleup,3);eq(c.find(x=>x.carte==='Loxim').bonusDonnes.doubleup,3);}eq(s.resultats.length,2);
  // --- copies (Apo, chansonnier) : la Force depuis la case du copieur, jamais de pioche
  s=prep([MD]);s.j[0].deck=[LO];moi(s,AP,2,1,0);moi(s,BE,1,1,1);s.resultats=[[1,0,null]];pose(s,MD,1,0);let g=s.j[0].grille[1][0];eq(g.cp,'015','Deguisement d office');
  eq(kc(s,1,0),1,'Apo en Bellock : terrain 0 perdu');eq(hb(s,0,1,1),0,'Bellock original : terrain 1 gagne');deq(s.j[0].deck,[LO],'pas de pioche');ok(!L(s).some(x=>/Comeback, pioche/.test(x)));
  s=prep([MD]);moi(s,AP,2,1,0);moi(s,AC,4,1,1);moi(s,LO,4,0,0);s.resultats=[[1,null,null]];pose(s,MD,1,0);g=s.j[0].grille[1][0];ok(s.attente&&s.attente.t==='k');M.applique(s,0,{t:'k',l:1,k:1});eq(g.cp,'015e');
  eq(kc(s,1,0),5,'Apo en Aiges Captain : +2 et Double up ? avec Loxim sur son terrain');eq(du(s,1,1),0,'Aiges Captain original : Loxim pas sur sa ligne ni son terrain');
  s=prep([CH]);moi(s,VE,2,1,1);moi(s,BE,1,1,0);adv(s,AA,4,1,1);s.resultats=[[null,0,null]];pose(s,CH,1,1);ok(s.attente&&s.attente.t==='i');M.applique(s,0,{t:'i',o:1});g=s.j[0].grille[1][1];eq(g.cp,'016e');
  eq(kc(s,1,1),5,'chansonnier en Le Ace de Aiges : Winstreak de son camp + Double up ? avec Bellock');
  // --- robot : version du partenaire, carte a forger, Double up ? vise
  for(const niv of ['normal','difficile']){
    s=forge([BE,KC],[LO,AA,TR]);x=M.robot(s,0,niv);eq(M.code(x),'f~r',niv+' : forge Bellock');M.applique(s,0,x);eq(s.attente,null);ok(s.j[0].main.some(c=>c===LO||c===AA),niv+' : Loxim pioche sans choix');
    ok(M.robot(s,0,niv).t!=='r',niv+' : pas de coup r');
    s=forge([KC,BE],[LO]);s.j[0].forge=[0,1,2,4,5,6,7];eq(M.code(M.robot(s,0,niv)),'f~r',niv+' : forge Bellock pour chercher Loxim, meme au-dela de la cible');
    s=forge([KC,BE],[TR]);s.j[0].forge=[0,1,2,4,5,6,7];eq(M.robot(s,0,niv).t,'n',niv+' : sans Loxim au deck, pas de Forge en plus');
    s=forge([AC,KC],[LO]);moi(s,BE,1,0,0);s.j[0].forge=[0,1,2,4,5,6,7];eq(M.robot(s,0,niv).t,'n',niv+' : garde Aiges Captain, sa base est en jeu');
    s=forge([BE,AC,KC],[LO]);eq(M.forgeUtile(s,0,s.j[0].main),AC,'garde la seule base de son evolution');
    s=prep([TR,BE,KC]);s.j[0].deck=[LO+1,LO];pose(s,TR,0,0);eq(M.code(M.robot(s,0,niv)),'s~r',niv+' : Spam sur Bellock');
    s=prep([LO]);s.j[0].energie=5;moi(s,AC,4,1,0);const a=M.robot(s,0,niv);eq(a.t,'p');M.applique(s,0,a);ok(M.doubleUp(s.j[0].grille,1,0,'015e'),niv+' : Loxim pose pour Double up ? '+M.code(a));
  }
  // --- parties aleatoires et robot contre robot : rejeux identiques
  const golem=h=>!!h&&!M.estAnimal(h.c);
  const verifieR=u=>assert(!u.attente||u.attente.t!=='r','attente r'); /* 0.2b.1 : plus jamais d'attente 'r' */
  const cpt=(X,u)=>{const r={fo:0,pi:0,pe:0,ch:0,au:0,no:0,cb:0,ws:0,dup:0,mc:0,cop:0,pB:0,pL:0,ev:0};
    X.forEach(x=>{if(/: (Comeback|Winstreak), pioche /.test(x)){r.pi++;if(/, pioche (Bellock|Loxim) \(/.test(x))r.pe++}if(/: (Comeback|Winstreak), aucun /.test(x))r.no++;if(/il perd le bonus de (Bellock|Loxim)/.test(x))r.mc++;if(/copie (Bellock|Loxim)/.test(x))r.cop++});
    u.stats.act.forEach(x=>{if(x.nom==='Comeback'||x.nom==='Winstreak')r.fo++});
    u.stats.ev.forEach(e=>{if(e.t==='b'){if(e.y==='comeback')r.cb++;if(e.y==='winstreak')r.ws++;if(e.y==='doubleup')r.dup++}
      if(e.t==='p'){const id=M.carte(e.cc).id;if(id==='015')r.pB++;if(id==='016')r.pL++;if(id==='015e'||id==='016e')r.ev++}});
    return r};
  const jouer=(gr,dk,choix)=>{const u=M.nouvelle(gr,dk),j=[[],[]];let pas=0;
    while(!u.fin){assert(++pas<2000,'blocage Bellock/Loxim '+gr);const att=M.attendus(u),p=choix?att[0]:att[rnd(att.length)],l=M.legales(u,p);assert(l.length,'aucune action '+gr);let x;
      if(choix){x=M.robot(u,p,choix(p));assert(x,'robot sans coup');}else{const pref=l.filter(y=>y.t==='p'||y.t==='f'||y.t==='j'||y.t==='i'||y.t==='e'||y.t==='w'||y.t==='y');x=pref.length&&rnd(5)?pref[rnd(pref.length)]:l[rnd(l.length)]}
      assert(x.t!=='r','coup r');
      M.applique(u,p,x);j[p].push(M.code(x));verifie(u);verifieR(u)}
    eq(u.resultats.length,3,'trois manches memorisees');
    const r=M.rejoue(gr,[M.litJournal(M.ecritJournal(j[0])),M.litJournal(M.ecritJournal(j[1]))],dk);assert(!r.erreur,r.erreur);assert.strictEqual(JSON.stringify(r.etat),JSON.stringify(u),'rejeu Bellock/Loxim '+gr);M.bilan(u);nv++;
    return cpt(u.log.map(y=>y[1]),u)};
  const add=(t,c)=>{for(const k in c)t[k]=(t[k]||0)+c[k]};
  const tot={};for(let i=0;i<300;i++)add(tot,jouer((i*7741+911)|0,[[DB1,DB2,DB3,DB4][i%4],[DB4,DB1,'',DB2][i%4]]));
  ok(tot.pi&&tot.pe&&tot.pi>tot.pe&&tot.no&&tot.cb&&tot.ws&&tot.dup,'aleatoire : effet jamais vu '+JSON.stringify(tot));
  const niv=['facile','normal','difficile'],rt={};let nr=0;
  for(let i=0;i<450;i++){add(rt,jouer((i*15485863+4211)|0,[[DB1,DB2,DB3,DB4][i%4],[DB4,DB1,'',DB2][(i>>2)%4]],p=>niv[i<300?(i+p)%3:i%3]));nr++}
  ok(rt.pi&&rt.pe&&rt.pi>rt.pe&&rt.cb&&rt.ws&&rt.dup,'robot : effet jamais vu '+JSON.stringify(rt));
  const f=o=>o.fo+' cartes du duo forgees ('+o.pi+' partenaires pioches au hasard dont '+o.pe+' evolutions, '+o.no+' sans partenaire), '+o.pB+' Bellock et '+o.pL+' Loxim poses, '+o.ev+' evolutions, bonus au decompte : Comeback '+o.cb+', Winstreak '+o.ws+', Double up ? '+o.dup+', '+o.mc+' morts par perte du partenaire, '+o.cop+' copies';
  console.log('Bellock/Loxim 0.2b.1 OK : '+nv+' verifications (dont tirages ponderes sur '+N+' graines), 300 parties aleatoires ('+f(tot)+') et '+nr+' parties robot (dont 150 a niveau egal ; '+f(rt)+'), aucun coup r, rejeux identiques');
}
{ // 0.2b.2 : La Boutique reduit aussi les evolutions (poser, remplacer, faire evoluer), minimum 0 sur le cout total apres la surtaxe d'Elessar, jamais un animal
  let nv=0;const ok=(c,m)=>{assert(c,m);nv++},eq=(a,b,m)=>{assert.strictEqual(a,b,m);nv++};
  const vide3=()=>[[null,null,null],[null,null,null],[null,null,null]];
  const prep=(main,rg)=>{const s=M.nouvelle(5,['','']);s.phase='jeu';s.mull=[true,true];s.joueur=0;s.premier=0;s.tour=1;s.manche=2;const J=s.j[0];J.etapeForge=false;J.energie=30;J.main=main.slice();J.deck=[];J.forge=[];
    J.grille=vide3();s.j[1].grille=vide3();s.j[1].main=[];s.j[1].deck=[];s.j[1].etapeForge=false;s.deckLibre=true;s.terrains=[TA(2),TA(8),TA(4)];if(rg!==undefined)s.rng=[rg,rg*7];return s};
  const moi=(s,c,f,l,k,x)=>{s.j[0].grille[l][k]={c,f,d:0,...(x||{})}},adv=(s,c,f,l,k,x)=>{s.j[1].grille[l][k]={c,f,d:0,...(x||{})}};
  const C=(s,p,c,l,k)=>M.coutPose(s,p,c,l,k),L=s=>s.log.map(x=>x[1]),leg=(s,c,l,k)=>M.legales(s,0).some(a=>a.t==='p'&&a.c===c&&a.l===l&&a.k===k);
  const E=72,KW=9,AL=6,LX=96,ACE=99,KIWI=69,TI=57,CY=12;
  eq(M.VERSION,'0.4');eq(TA(2).nom,'La Boutique');eq(TA(2).texte,'Jouer un Golem ici coûte 1 de moins.');
  eq(M.carte(KW).id,'002e');eq(M.carte(ACE).id,'016e');eq(M.carte(LX).id,'016');eq(M.carte(KIWI).id,'901');eq(M.carte(E).id,'018');
  // evolution -1 sur la Boutique (colonne 0), cout plein ailleurs ; pose et remplacement aussi
  let s=prep([KW,CY]);moi(s,AL,3,0,0);moi(s,AL,3,1,1);moi(s,CY,1,2,0);
  eq(C(s,0,KW,0,0),2,'evolution sur la Boutique : 3 - 1');eq(C(s,0,KW,1,1),3,'evolution ailleurs : 3');eq(C(s,0,CY,1,0),2,'pose : 3 - 1');eq(C(s,0,CY,2,0),2,'remplacement : 3 - 1');eq(C(s,0,CY,1,1),3);
  s.j[0].energie=2;ok(leg(s,KW,0,0),'evolution payable a 2 sur la Boutique');ok(!leg(s,KW,1,1),'pas ailleurs');
  M.applique(s,0,{t:'p',c:KW,l:0,k:0});eq(s.j[0].energie,0,'2 payes');ok(s.stats.act.some(x=>x.nom==='La Boutique'&&x.e==='Coût réduit de 1 pour Alrevan (KEKWRevan)'),'declenchement de la Boutique');
  ok(!L(s).some(x=>/^Réalisation de l'âge/.test(x)),'sans Elessar : pas de surtaxe');ok(s.stats.ev.some(e=>e.t==='p'&&e.cc===KW&&e.n===2),'cout paye dans le bilan');
  // avec Elessar : surtaxe puis reduction, les deux annoncees
  s=prep([KW]);moi(s,AL,3,0,0);moi(s,AL,3,1,1);adv(s,E,2,0,0);
  eq(C(s,0,KW,0,0),3,'3 + 1 - 1');eq(C(s,0,KW,1,1),4,'3 + 1 hors de la Boutique');adv(s,E+1,2,1,1);eq(C(s,0,KW,0,0),4,'3 + 2 - 1');eq(C(s,0,KW,1,1),5);s.j[1].grille[1][1]=null;
  s.j[0].energie=3;ok(leg(s,KW,0,0),'payable a 3 sur la Boutique');ok(!leg(s,KW,1,1));M.applique(s,0,{t:'p',c:KW,l:0,k:0});eq(s.j[0].energie,0,'3 payes');
  ok(s.stats.act.some(x=>x.nom==='La Boutique'&&x.e==='Coût réduit de 1 pour Alrevan (KEKWRevan)'),'Boutique annoncee');ok(s.stats.act.some(x=>x.nom==='Réalisation de l\'âge'&&x.e==='Coût +1 pour Alrevan (KEKWRevan)'),'Elessar annonce');
  ok(L(s).includes('Réalisation de l\'âge : Alrevan (KEKWRevan) coûte 1 de plus.'),'journal Elessar');
  // minimum 0 : Le Ace de Aiges (1) sur la Boutique, sans puis avec Elessar ; jamais negatif
  s=prep([ACE]);moi(s,LX,4,0,0);moi(s,LX,4,1,1);eq(C(s,0,ACE,0,0),0,'1 - 1 = 0');eq(C(s,0,ACE,1,1),1);
  s.j[0].energie=0;ok(leg(s,ACE,0,0),'evolution gratuite jouable a 0');ok(!leg(s,ACE,1,1));M.applique(s,0,{t:'p',c:ACE,l:0,k:0});eq(s.j[0].energie,0,'rien paye');
  s=prep([ACE]);moi(s,LX,4,0,0);adv(s,E,2,0,0);eq(C(s,0,ACE,0,0),1,'1 + 1 - 1');adv(s,E+1,2,0,1);adv(s,E+2,2,0,2);eq(C(s,0,ACE,0,0),3,'1 + 3 - 1');
  s=prep([0]);s.manche=1;eq(C(s,0,0,0,0),0,'KaTarN : 1 - 1 = 0');
  for(let k=0;k<3;k++)for(let l=0;l<3;l++)for(const c of [0,KW,ACE,CY,KIWI])ok(C(s,0,c,l,k)>=0,'jamais negatif');
  // animal : jamais reduit, meme avec Elessar adverse
  s=prep([KIWI]);moi(s,TI,1,0,0);eq(C(s,0,KIWI,1,0),1,'Kiwi sur la Boutique : 1');eq(C(s,0,KIWI,0,1),1,'Kiwi ailleurs : 1');adv(s,E,2,0,0);eq(C(s,0,KIWI,1,0),1,'Kiwi : ni surtaxe ni reduction');
  s.j[0].energie=0;ok(!leg(s,KIWI,1,0),'Kiwi impayable a 0 sur la Boutique');s.j[0].energie=1;ok(leg(s,KIWI,1,0),'Kiwi payable a 1');
  // robot : evolution payable seulement sur la Boutique ; parties robot contre robot avec la Boutique en jeu, rejeux identiques
  for(const niv of ['facile','normal','difficile'])for(let g=1;g<20;g++){s=prep([KW],g);moi(s,AL,1,0,0);moi(s,AL,1,1,1);s.j[0].energie=2;const a=M.robot(s,0,niv);
    ok(a&&M.legales(s,0).some(x=>M.code(x)===M.code(a)),'robot : coup legal');ok(!(a.t==='p'&&a.c===KW&&a.k!==0),'robot : pas d evolution impayable hors Boutique')}
  let evB=0,evE=0,nr=0;const niv=['facile','normal','difficile'];
  for(let i=0;i<400&&nr<150;i++){const gr=(i*2654435761+97)|0,u=M.nouvelle(gr,['','']);let pas=0;const j=[[],[]];
    if(!u.terrains.some(t=>t.nom==='La Boutique'))continue;
    while(!u.fin){assert(++pas<2000,'blocage Boutique '+gr);const p=M.attendus(u)[0],x=M.robot(u,p,niv[i%3]);assert(x,'robot sans coup');
      if(x.t==='p'){const K=M.carte(x.c),cout=M.coutPose(u,p,x.c,x.l,x.k),av=u.j[p].energie,b=u.terrains[x.k].nom==='La Boutique';
        eq(cout,Math.max(0,K.cout+(K.base?M.elessars(u.j[1-p].grille):0)-(b&&!K.animal?1:0)),'cout de '+K.id);
        if(K.base&&b){evB++;if(M.elessars(u.j[1-p].grille))evE++}
        M.applique(u,p,x);eq(u.j[p].energie,av-cout,'energie payee')}else M.applique(u,p,x);j[p].push(M.code(x))}
    const r=M.rejoue(gr,[M.litJournal(M.ecritJournal(j[0])),M.litJournal(M.ecritJournal(j[1]))],['','']);assert(!r.erreur,r.erreur);assert.strictEqual(JSON.stringify(r.etat),JSON.stringify(u),'rejeu Boutique '+gr);nr++}
  ok(evB>0,'aucune evolution jouee sur la Boutique par le robot');
  console.log('Boutique 0.2b.2 OK : '+nv+' verifications, '+nr+' parties robot avec La Boutique ('+evB+' evolutions jouees dessus, dont '+evE+' avec Elessar adverse), rejeux identiques');
}
{ // Deck vide (regle de la meule) : « Si ton deck est vide, chaque carte que tu dois piocher donne 1 point a ton adversaire. » La partie continue.
  // Ids : KaTarN 0, Slim K 3, Cyrdan 12, Le Q 18, Trigas 24, Titom76 57, Velnen 78, Jacen et Jaina 123.
  let nv=0;const ok=(c,m)=>{assert(c,m);nv++},eq=(a,b,m)=>{assert.strictEqual(a,b,m);nv++},deq=(a,b,m)=>{assert.deepStrictEqual(a,b,m);nv++};
  const LIGNE='n\'a pas pu piocher (deck vide) : +1 point pour l\'adversaire.';
  const prep=()=>{const s=M.nouvelle(11,['','']);s.phase='jeu';s.mull=[true,true];s.joueur=0;s.premier=0;s.tour=1;
    s.j.forEach(J=>{J.main=[];J.deck=[];J.forge=[];J.defausse=[];J.etapeForge=false;J.energie=30;J.grille=[[null,null,null],[null,null,null],[null,null,null]]});s.terrains=[TA(1),TA(8),TA(4)];return s};
  const moi=(s,c,f,l,k,x)=>{s.j[0].grille[l][k]={c,f,d:0,...(x||{})}},adv=(s,c,f,l,k,x)=>{s.j[1].grille[l][k]={c,f,d:0,...(x||{})}};
  /* p a manque n pioches : n lignes de journal a son nom, n evenements 'dv', score de l'adversaire sc, partie qui continue, bilan juste */
  const manque=(s,p,n,sc,m)=>{ok(!s.fin,m+' : la partie continue');eq(s.log.filter(x=>x[0]===p&&x[1]===LIGNE).length,n,m+' : journal');
    eq(s.stats.ev.filter(e=>e.t==='dv'&&e.cp===p).length,n,m+' : stats');eq(s.j[1-p].score,sc,m+' : score de l adversaire');
    const B=M.bilan(s);eq(B.joueurs[p].piochesManquees,n,m+' : bilan, pioches manquees');eq(B.joueurs[1-p].pointsDeckVide,n,m+' : bilan, points recus')};
  // --- debut de tour : second joueur, 1er tour de manche, 1 carte a piocher, deck vide : 1 point ; le score du joueur au deck vide ne bouge pas
  let s=prep();s.j[1].score=12;M.applique(s,0,{t:'x'});manque(s,1,1,1,'debut de tour');eq(s.j[1].score,12);eq(s.joueur,1);deq(M.attendus(s),[1]);
  // tour 2 : 2 a piocher, deck vide : 2 points
  s=prep();s.tour=2;M.applique(s,0,{t:'x'});manque(s,1,2,2,'2 a piocher, deck vide');
  // --- pioche de 2 avec 1 carte au deck : 1 carte + 1 point
  s=prep();s.tour=2;s.j[1].deck=[40];M.applique(s,0,{t:'x'});manque(s,1,1,1,'2 pour 1');deq(s.j[1].main,[40],'la derniere carte est piochee');eq(s.j[1].deck.length,0);
  // second joueur au 1er tour de la manche : 1 seule carte, deck de 1 : aucun point
  s=prep();s.j[1].deck=[40];M.applique(s,0,{t:'x'});manque(s,1,0,0,'1 a piocher, 1 au deck');
  // le jeu continue : le joueur au deck vide joue son tour, l'autre repioche normalement
  s=prep();s.tour=2;s.j[1].deck=[40,41];s.j[0].deck=[42,43,44];M.applique(s,0,{t:'x'});M.applique(s,1,{t:'n'});M.applique(s,1,{t:'x'});eq(s.tour,3);manque(s,0,0,0,'deck de 3');deq(s.j[0].main,[42,43]);
  // --- Graine de Golem : 2 du tour + 1 de Velnen, deck de 2 : 1 point
  s=prep();s.j[1].deck=[40,41];adv(s,78,1,0,0);s.tour=2;M.applique(s,0,{t:'x'});manque(s,1,1,1,'Graine de Golem');eq(s.j[1].main.length,2);{const L=s.log.map(x=>x[1]),i=L.indexOf('Graine de Golem : pioche 1 carte de plus.');ok(i>=0&&L[i+1]===LIGNE,'Graine : l effet, puis le point')}
  // --- Spam de Trigas : deck vide, 1 point, Trigas reste pose ; 1 carte au deck : pioche puis Forge, aucun point
  s=prep();s.j[0].main=[24];M.applique(s,0,{t:'p',c:24,l:0,k:0});manque(s,0,1,1,'Spam');ok(s.j[0].grille[0][0]&&s.j[0].grille[0][0].c===24,'Trigas reste pose');ok(!s.attente,'main vide : pas de Forge du Spam');
  s=prep();s.j[0].main=[24];s.j[0].deck=[40];M.applique(s,0,{t:'p',c:24,l:0,k:0});manque(s,0,0,0,'Spam, 1 carte');eq(s.attente.t,'s');
  // --- La Bretagne : chacun pioche, le joueur de Titom76 d'abord ; c'est le joueur qui pioche qui donne le point
  s=prep();s.j[0].main=[57];adv(s,24,1,0,0);M.applique(s,0,{t:'p',c:57,l:1,k:1});manque(s,0,1,1,'Bretagne, son joueur');manque(s,1,1,1,'Bretagne, l adversaire');
  ok(s.log.findIndex(x=>x[0]===0&&x[1]===LIGNE)<s.log.findIndex(x=>x[0]===1&&x[1]===LIGNE),'le joueur de Titom76 pioche le premier');
  s=prep();s.j[0].main=[57];s.j[0].deck=[40];adv(s,24,1,0,0);adv(s,6,2,0,1);M.applique(s,0,{t:'p',c:57,l:1,k:1});manque(s,1,2,2,'Bretagne sur l adversaire');manque(s,0,0,0,'Bretagne, son joueur pioche');eq(s.j[0].main.length,1);
  s=prep();s.j[0].main=[57];s.j[0].deck=[40];M.applique(s,0,{t:'p',c:57,l:1,k:1});manque(s,1,0,0,'adversaire sans Golem Brume ou Foudre : 0 a piocher');
  // --- Jacen et Jaina : a la pose (les chats sont poses, pas de ligne de pioche), puis a la mort du maitre, jamais quand on remplace soi-meme le maitre
  s=prep();moi(s,0,8,1,1);s.j[0].main=[123];M.applique(s,0,{t:'p',c:123,l:0,k:1});manque(s,0,1,1,'Jacen et Jaina a la pose');ok(s.j[0].grille[0][1]&&s.j[0].grille[0][1].c===123,'chats sur la grille');
  ok(!s.stats.ev.some(e=>e.t==='jj'),'pas d evenement de pioche des chats');{const i=s.log.findIndex(x=>/^Jacen et Jaina : à la pose, pioche/.test(x[1]));ok(i>=0&&s.log[i+1][1]===LIGNE,'journal : l effet, puis le point')}
  s=prep();moi(s,0,8,1,1);s.j[0].main=[123];s.j[0].deck=[40];M.applique(s,0,{t:'p',c:123,l:0,k:1});manque(s,0,0,0,'Jacen et Jaina, 1 carte');deq(s.j[0].main,[40]);
  s=prep();moi(s,0,1,0,0);moi(s,123,0,0,1,{maitre:0});adv(s,1,8,0,2);s.joueur=1;s.j[1].main=[3];
  M.applique(s,1,{t:'p',c:3,l:0,k:2});manque(s,0,1,1,'Jacen et Jaina, maitre detruit par Slim K adverse');ok(s.j[0].defausse.includes(123)&&!s.j[0].grille[0][1],'chats a la defausse');
  s=prep();moi(s,0,8,1,1);moi(s,123,0,0,1,{maitre:0});s.j[0].main=[12];M.applique(s,0,{t:'p',c:12,l:1,k:1});manque(s,0,0,0,'maitre remplace par son joueur : pas de pioche');ok(s.j[0].defausse.includes(123));
  // --- Le Q : Analyse (prends-en 1 en main) n'est pas une pioche ; deck vide : rien ; deck de 2 : la carte prise ne donne aucun point
  s=prep();s.j[0].main=[18];M.applique(s,0,{t:'p',c:18,l:0,k:0});manque(s,0,0,0,'Le Q, deck vide');ok(!s.attente);
  s=prep();s.j[0].main=[18];s.j[0].deck=[40,41];M.applique(s,0,{t:'p',c:18,l:0,k:0});eq(s.attente.t,'q');M.applique(s,0,{t:'c',c:41});manque(s,0,0,0,'Le Q, carte prise');deq(s.j[0].main,[41]);
  // --- deckLibre (banc d'essai) : pioche arretee sans point
  s=prep();s.deckLibre=true;s.tour=2;M.applique(s,0,{t:'x'});manque(s,1,0,0,'deckLibre');
  s=prep();s.deckLibre=true;moi(s,0,8,1,1);s.j[0].main=[123];M.applique(s,0,{t:'p',c:123,l:0,k:1});manque(s,0,0,0,'deckLibre, Jacen et Jaina');
  // --- fin de partie aux points : plus de cause « deck vide »
  s=prep();s.manche=3;s.tour=3;s.joueur=1;s.premier=0;s.j[0].score=2;s.j[1].score=0;M.applique(s,1,{t:'x'});ok(s.fin,'partie finie au decompte de la manche 3');ok(s.fin.deckVide===undefined);eq(M.bilan(s).fin.cause,'points');
  // --- robot : le risque se compte en points (pioches manquees en plus), plus de -50
  s=prep();eq(M.risqueDeck(s,0,'007',[0,0],0),-1,'Spam sur deck vide : -1');
  s=prep();s.j[0].deck=Array.from({length:17},(_,i)=>40+i);eq(M.risqueDeck(s,0,'007',[0,0],0),0,'Spam, deck assez grand jusqu a la fin : 0');
  s=prep();s.j[0].deck=Array.from({length:17},(_,i)=>40+i);eq(M.risqueDeck(s,0,'026',[1,2],0),2,'La Bretagne, adversaire au deck vide avec 2 Golems Brume ou Foudre : +2');
  /* Velnen au tour 2 de la manche 3 (premier joueur) : 1 tour a venir, 2 a piocher, 3 avec la Graine : deck de 2, -1 ; deck de 3, 0 */
  s=prep();s.manche=3;s.tour=2;s.j[0].deck=[40,41];eq(M.risqueDeck(s,0,'041',[0,0],1),-1,'Velnen : 1 pioche manquee de plus');s.j[0].deck.push(45);eq(M.risqueDeck(s,0,'041',[0,0],1),0,'Velnen sans risque');
  // --- parties robot contre robot, decks de 24 a forte pioche : jamais bloquees, rejeux identiques, scores = terrains + effets a points + pioches manquees adverses
  const FP=M.deckTexte({'001':3,'007':3,'026':3,'041':3,'004':3,'003':3,'002':3,'029':2,'902':1}),niv=['facile','normal','difficile'];let nd=0,np=0,ng=0;
  ok(M.lisDeck(FP),'deck a forte pioche valide');eq(Object.values(M.lisDeck(FP)).reduce((a,b)=>a+b,0),24);
  const NP=+process.env.MEULE_PARTIES||300;
  for(let i=0;i<NP;i++){const gr=(i*2654435761+77)|0,dk=[FP,i%3===0?'':i%3===1?FP:M.deckTexte(M.DECK_DEFAUT)],u=M.nouvelle(gr,dk),j=[[],[]];let pas=0;
    while(!u.fin){assert(++pas<3000,'blocage deck vide '+gr);const p=M.attendus(u)[0],x=M.robot(u,p,niv[(i+p)%3]);M.applique(u,p,x);j[p].push(M.code(x));verifie(u)}
    const r=M.rejoue(gr,[M.litJournal(M.ecritJournal(j[0])),M.litJournal(M.ecritJournal(j[1]))],dk);assert(!r.erreur,r.erreur);assert.strictEqual(JSON.stringify(r.etat),JSON.stringify(u),'rejeu deck vide '+gr);nv++;
    eq(u.manche,3,'partie jusqu a la manche 3');ok(u.fin.deckVide===undefined);eq(u.resultats.length,3);deq(u.fin.scores,[u.j[0].score,u.j[1].score]);
    const B=M.bilan(u);ok(B.fin.cause==='points','cause de fin');
    for(let q=0;q<2;q++){const ter=u.stats.t.filter(t=>t.gagnant===q).reduce((a,t)=>a+t.points,0),eff=u.log.filter(x=>x[0]===q&&/: \+(\d+) points?\.$/.test(x[1])).reduce((a,x)=>a+ +/: \+(\d+) points?\.$/.exec(x[1])[1],0),
      dv=u.stats.ev.filter(e=>e.t==='dv'&&e.cp===1-q).length;
      eq(u.j[q].score,ter+eff+dv,'score '+q+' = terrains + effets + pioches manquees adverses ('+gr+')');eq(B.joueurs[q].pointsDeckVide,dv);eq(B.joueurs[1-q].piochesManquees,dv);
      eq(u.log.filter(x=>x[0]===1-q&&x[1]===LIGNE).length,dv);np+=dv}
    if(np>ng)nd++;ng=np}
  ok(nd>0,'aucune partie avec une pioche manquee');
  console.log('Deck vide (meule) OK : '+nv+' verifications, '+nd+' parties robot sur '+NP+' avec au moins une pioche manquee ('+np+' points donnes en tout), decks de 24 a forte pioche, rejeux identiques');
}
