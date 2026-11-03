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
    J.grille.forEach((L,l)=>L.forEach((g,k)=>{if(g&&!s.attente)assert(M.forceDe(s,p,l,k)>0,'Golem mort en jeu')}));
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
  const s=M.nouvelle(77,[t,'']);assert.strictEqual(s.j[0].deck.length+s.j[0].main.length,24);assert.strictEqual(s.j[1].deck.length+s.j[1].main.length,33);
  assert.strictEqual(JSON.stringify(M.nouvelle(77)),JSON.stringify(M.nouvelle(77,['',''])),'paquet de test inchange');
  assert.strictEqual(M.nouvelle(77,['n importe quoi','']).decks[0],'','deck invalide = paquet de test');
  const d30={...d24,'001e':3,'004e':3};
  for(let i=0;i<60;i++){const r=partie((i*97531)|0,[i%2?t:M.deckTexte(d30),i%3?M.deckTexte(d30):'']);nMax=Math.max(nMax,r.n)}
  // les cartes d'un joueur viennent toutes de son deck
  const s2=M.nouvelle(5,[t,'']);[...s2.j[0].deck,...s2.j[0].main].forEach(c=>assert(M.carte(c).id in d24,'carte hors deck'));
}
// Cas de regles
function vide(){const s=M.nouvelle(1);s.phase='jeu';s.mull=[true,true];s.joueur=0;s.premier=0;
  s.j.forEach(J=>{J.deck=[];J.main=[];J.defausse=[]});s.terrains=[TA(0),TA(1),TA(4)];return s}
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
  s.j[1].grille[1][1]=gol(31,3);assert.strictEqual(M.forceDe(s,0,1,1),8+4,'K-Chan en face : pas de cercle');
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
{ // Boutique : poser et remplacer, evolution exclue, minimum 0
  const s=sur('La Boutique');s.j[0].grille[0][0]=gol(6,3);
  assert.strictEqual(M.coutPose(s,0,12,0,0),2,'remplace');assert.strictEqual(M.coutPose(s,0,12,1,0),2,'pose');assert.strictEqual(M.coutPose(s,0,9,0,0),3,'evolution pleine');
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
  assert.strictEqual(M.VERSION,'0.2.1');assert.strictEqual(M.CARTES['002e'].cout,3);assert.strictEqual(M.CARTES['004e'].cout,3);assert.strictEqual(M.CARTES['001'].cout,1);assert.strictEqual(T('La Faille').pts,2);
  {let dbl=0;for(let g=1;g<200;g++){const u=vide();u.rng=[g,g*7];u.j[0].main=[9];u.j[0].energie=9;u.j[0].grille[0][0]=gol(6,3);M.applique(u,0,{t:'p',c:9,l:0,k:0});const m=/lance (\d) et (\d) : Force (\d+)/.exec(u.log.map(x=>x[1]).join(' '));assert(m);const[a,b,f]=[+m[1],+m[2],+m[3]];if(a===b)dbl++;assert.strictEqual(f,a===b?a:a+b,'KEKWRevan')}assert(dbl)}
  assert.strictEqual(M.TAILLE_DECK,33);
  for(let c=0;c<33;c++){assert.strictEqual(M.decode(M.code({t:'f',c})).c,c);assert.strictEqual(M.decode(M.code({t:'p',c,l:2,k:1})).c,c)}
  assert.throws(()=>M.decode('fx'),'carte 33 refusee');assert.strictEqual(M.carte(23).id,'004e');assert.strictEqual(M.carte(2).id,'001');assert.strictEqual(M.carte(3).id,'001e');
}
{ // Spam : pioche puis Forge, sans energie ce tour, tour qui continue, code, deck vide
  const s=vide();s.j[0].main=[24,6];s.j[0].deck=[9];s.j[0].energie=1;
  M.applique(s,0,{t:'p',c:24,l:0,k:0});assert.strictEqual(s.attente.t,'s');assert.deepStrictEqual(s.j[0].main,[6,9]);
  assert.deepStrictEqual(M.legales(s,0).map(a=>a.c),[6,9]);assert.deepStrictEqual(M.attendus(s),[0]);
  assert.deepStrictEqual(M.decode(M.code({t:'s',c:9})),{t:'s',c:9});
  M.applique(s,0,{t:'s',c:9});assert.deepStrictEqual(s.j[0].forge,[9]);assert.strictEqual(s.j[0].energie,0);assert(!s.attente);assert(M.legales(s,0).some(a=>a.t==='x'));
  const u=vide();u.j[0].main=[24];u.j[0].energie=1;M.applique(u,0,{t:'p',c:24,l:0,k:0});assert(!u.attente,'main vide, deck vide');
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
  assert(!M.TYPES.some(t=>M.CARTES[t].base==='008'),'aucune evolution');
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
