/* Les Golems : moteur pur, sans affichage. Etat = f(graine, journaux). Charge en page et en Node. */
(function(racine){
'use strict';
const VERSION='0.5';const TRAIT_CUMULE=true; /* 0.2.1 : Trait cumule (+1 par voisin allie par element partage), plus de match nul. 0.2.2 : coup 'a' = abandon (a tout moment, hors tour). 0.2a.1 : Indra (013, 013e), favori et coup 'g'. 0.2a.2 : Glad (009, 009e), Slam (coup 'h') et Menfou palu. 0.2b : K-Chan (008) Magma + Brume au lieu de Magma + Roche. Apo (029, 029e), SuperFishman (037, 037e), Titom76 (026, 026e), coups 'k' (Deguisement) et 'z' (Caramel), carte 62 codee '_'. Spom (036, 036e), coup 'j' (Forge eclair), cartes 63 et plus codees '~' + 1 caractere. Kiwi (901), premier animal de compagnie (carte 69, '~6') : pose a cote de son maitre (Titom76), Mignonitude avant le decompte (g.hors), erreurDeck : 1 exemplaire et son maitre dans le deck. Elessar (018, cartes 72-74, '~9' a '~b') et Le pomplard (018e, cartes 75-77, '~c' a '~e'). Velnen : Velnen (041, cartes 78-80, '~f' a '~h', Graine de Golem : +1 a la pioche de chaque tour, cumulatif) et Le chansonnier (041e, cartes 81-83, '~i' a '~k', Imitation, coup 'i'). Shifukuro : Shifukuro (025, cartes 84-86, '~l' a '~n', KEKWait : +1 de Force par Golem allie au-dessus, dans forceDe) et Le moderateur (025e, cartes 87-89, '~o' a '~q', meandyou : attente 'u', coup 'e' pour echanger, 'v' pour passer). Bellock/Loxim : Bellock (015, cartes 90-92, '~r' a '~t'), Aiges Captain (015e, 93-95, '~u' a '~w'), Loxim (016, 96-98, '~x' a '~z'), Le Ace de Aiges (016e, 99-101, '~A' a '~C'). Comeback et Winstreak (+1 ou +2 de Force par manche perdue ou remportee sur son terrain, lues dans s.resultats) ; « si tu forges cette carte » (Forge, Forge eclair, Spam) : partenaire cherche dans le deck, attente 'r' et coup 'r' + carte s'il y a deux versions ; Double up ? des evolutions (+REGLAGE_DUO.doubleUp). 0.2b.1 : Bellock/Loxim, le partenaire est pioche au hasard parmi tous ses exemplaires du deck (bases et evolutions, generateur du joueur), plus d'attente 'r' ni de coup 'r'. 0.2b.2 : La Boutique reduit aussi les evolutions (pose, remplacement et evolution, jamais un animal), minimum 0 sur le cout total apres la surtaxe d'Elessar 0.2c : simple renommage de 0.2b.2 pour suivre la version du site, aucune regle ne change (sauvegardes 0.2b.2 reprises, rejeux 0.2b.2 par moteurs/moteur-0.2b.2.js). JackJoy : JackJoy (035, cartes 102-104, '~D' a '~F', Sub offert) et Drafteur experimente (035e, 105-107, '~G' a '~I', Draft diff) ; bonus g.sub (partie) et g.dr (manche), attente 'l' et coup 'l' + ligne + colonne pour la cible. Vic222 : Vic222 (042, cartes 108-110, '~J' a '~L', Info tchat : cercle +2 pour les Golems allies de sa colonne) et son evolution (042e, 111-113, '~M' a '~O', Chance du debutant : bouclier unique, g.cdb une fois use). Deck par defaut a 30 cartes (DECK_DEFAUT, TAILLE_DECK 30). 0.4 : deck vide, un joueur qui doit piocher alors que son deck est vide perd aussitot la partie (pioche carte par carte, s.fin.deckVide = le perdant ; rejeux 0.3 par moteurs/moteur-0.3.js). Puis regle de la meule : chaque carte a piocher sur deck vide donne 1 point a l'adversaire, la partie continue (plus de s.fin.deckVide ; evenement de stats t:'dv'). */
/* Le Q (refonte, 6 nov.) : Brume + Magma. Le Q (004) Jour de peche, attente 'q' (adv:1) sur le deck adverse, coup 'c' = carte defaussee ;
   Seul contre tous (004e, cout 7, Force 1) Il suffit, balayage des cartes en plusieurs exemplaires de chaque grille (ilSuffit). Plus d'Analyse ni d'Optimisation. */
const POIDS_MVP={force:1,bonus:1,degats:1,morts:3};
/* Donnees des cartes (etape 6) : cartes/donnees/*.js. Sous Node, require ; en page, window.GolemsDonnees rempli par les scripts de donnees charges avant. */
const D=(typeof module!=='undefined'&&module.exports&&typeof require==='function')?require('./cartes/donnees/index.js'):racine.GolemsDonnees;
if(!D||!D.CARTES)throw new Error('Les Golems : donnees des cartes absentes (charger cartes/donnees/golems.js, animaux.js, terrains.js puis index.js avant moteur.js)');
/* Registre des types d'effets (etape 7) : cartes/effets/*.js. Chaque fiche declare effet:{type,...reglages} (ou une liste) ; le moteur appelle les crochets
   du type (effs(code) : [{T:type,r:reglages}]) et ne teste jamais un code ni un nom de carte. Construit en fin de fichier (fabriques appelees avec M). */
const FX=(typeof module!=='undefined'&&module.exports&&typeof require==='function')?require('./cartes/effets/index.js'):racine.GolemsEffets;
if(!FX||!FX.construit)throw new Error('Les Golems : registre des effets absent (charger cartes/effets/golems.js, animaux.js, terrains.js puis index.js avant moteur.js)');
let R=null,F=null;const EFF={},VIDE=[]; /* R : registre ; F : fonctions des fichiers d'effets ; EFF : code -> effets de la fiche */
const effs=id=>id&&EFF[id]||VIDE;
function somme(L,h,...a){let n=0;for(const e of L)if(e.T[h])n+=e.T[h](e.r,...a);return n}
const aProp=(id,h)=>effs(id).some(e=>e.T[h]);
const EL_VELNEN=D.elVelnen; /* Velnen : elements de Velnen et du chansonnier (cartes/donnees/golems.js) */
const CARTES=D.CARTES; /* toutes les fiches, tous types confondus : cartes/donnees/golems.js, animaux.js */
const TYPES=D.ordre; /* cartes/donnees/index.js : toujours ajouter en fin, l'identifiant de carte depend du rang */
const TYPES_TEST=TYPES.slice(0,11);
const DECK_DEFAUT=D.deckDefaut; /* cartes/donnees/index.js */
/* Partie guidee : le Golem garde l'ancien paquet de 33 cartes (identifiants 0 a 32, comme jusqu'a 0.2c) pour retrouver la meme partie avec la graine 19445.
   Texte reserve, refuse par lisDeck (jamais un deck de joueur), lu seulement par nouvelle. */
const DECK_TUTO='tuto33';
const EXEMPLAIRES=3,TAILLE_DECK=Object.values(DECK_DEFAUT).reduce((a,b)=>a+b,0); /* identifiant = type*3 + exemplaire ; deck par defaut : 30 cartes */
const TERRAINS=D.terrainsListe; /* cartes/donnees/terrains.js (copie de terrains.json) */
/* Terrains T-011 a T-015 (6 nov. 2026) : L'Ecole, Le Karaoke, Les Pronos (coup 't'), Le Cirque, Le Tournoi (pts = numero de la manche, ptsTerrain ; pts:1 garde pour l'affichage minimal).
   Tirage parmi les 15 ; REGLAGE_TERRAINS : liste (tirage restreint, noms ou rangs) et force (un terrain present a coup sur). */
const ANCIENS_TERRAINS=10,REGLAGE_TERRAINS={liste:null,force:null,cirque:'tarte'}; /* cirque : departage des Forces egales au Cirque, null (personne), 'moins' (V1 : le moins de Golems ici), 'premier' (V2 : premier a poser un Golem ici dans la manche) */
let NEUTRE=false; /* statistiques seulement : forceDe sans les effets de terrain (Karaoke, Cirque inverse), le temps d'un calcul */
/* Effets des terrains : par le nom du terrain de la partie (s.terrains garde la fiche sans le champ effet). kAvec : premier terrain qui a le crochet h (et le type). */
const EFFT={},effsT=(s,k)=>EFFT[s.terrains[k].nom]||VIDE;
const kAvec=(s,h,type)=>s.terrains.findIndex((_,k)=>effsT(s,k).some(e=>e.T[h]&&(!type||e.r.type===type)));
const aPropT=(s,k,h)=>effsT(s,k).some(e=>e.T[h]);
const inverseIci=(s,k)=>effsT(s,k).some(e=>e.T.inverse&&e.T.inverse(e.r)); /* Le Cirque (variantes inversees) : ni Trait ni cercle */
function indexTerrain(x){const i=typeof x==='number'?x:TERRAINS.findIndex(T=>T.nom===x);if(!(i>=0&&i<TERRAINS.length))throw new Error('terrain inconnu '+x);return i}
function tirageTerrains(g,graine,tuto){
  const R=REGLAGE_TERRAINS,pool=R.liste?R.liste.map(indexTerrain):TERRAINS.map((_,i)=>i).slice(0,tuto?ANCIENS_TERRAINS:TERRAINS.length); /* partie guidee : les 10 anciens */
  const ix=melange(g,'v',pool).slice(0,3);
  if(R.force!==null&&R.force!==undefined){const f=indexTerrain(R.force);if(!ix.includes(f))ix[Math.floor(alea({v:(graine^0x6A09E667)|0},'v')*3)]=f} /* generateur a part : premier joueur inchange */
  return ix.map(i=>{const {effet,...x}=TERRAINS[i];return x}); /* copie sans l'effet (etat des parties inchange) */
}
const ptsTerrain=(s,k)=>{const e=effsT(s,k).find(e=>e.T.points);return e?e.T.points(e.r,s):s.terrains[k].pts}; /* Le Tournoi : 1, 2, 3 */
function golemsIci(s,p,k,compte){let n=0;for(let l=0;l<3;l++){const g=s.j[p].grille[l][k];if(golem(g)&&!(compte&&g.hors===s.manche))n++}return n}
/* Gagnant d'une colonne : la plus grande Force ; un terrain peut changer la regle (Le Cirque inverse). */
function gagnantColonne(s,k,c){
  if(!NEUTRE)for(const e of effsT(s,k))if(e.T.gagnant){const w=e.T.gagnant(e.r,s,k,c);if(w!==undefined)return w}
  return c[0]!==c[1]?(c[0]>c[1]?0:1):null;
}
/* Statistiques : gagnant sans l'effet du terrain (Force recalculee sans Karaoke ni Cirque, plus grande Force) */
function statsSansTerrain(s,k,c,w,T){
  NEUTRE=true;const c0=[0,1].map(p=>[0,1,2].reduce((x,l)=>x+valeurDecompte(s,p,l,k),0)),w0=gagnantColonne(s,k,c0);NEUTRE=false;
  F.stT(s).cf.push({m:s.manche,k,nom:T.nom,w,w0,c:c.slice(),c0,n:[0,1].map(p=>golemsIci(s,p,k,true)),duo:[0,1].map(p=>golemsIci(s,p,k)===2?1:0)});
}
const estVersus=(s,k)=>aPropT(s,k,'unSeul'); /* Le Versus : un seul Golem par joueur ici */
const DOMINE={magma:'cristal',cristal:'foudre',foudre:'brume',brume:'roche',roche:'magma'};
const carte=i=>CARTES[TYPES[Math.floor(i/EXEMPLAIRES)]];
const nomDetail=C=>C.base?CARTES[C.base].nom+' ('+C.nom+')':C.nom;
const b32=i=>i<36?i.toString(36):i<62?String.fromCharCode(29+i):i===62?'_':'~'+b32(i-63); /* 1 caractere par carte : 0-9, a-z, puis A-Z des 36, puis '_' pour 62 ; 63 a 125 = '~' + le code de 0 a 62 ('~0' = 63, '~_' = 125). Les anciens codes restent identiques */
const h32=q=>q[0]==='~'?63+h32(q.slice(1)):q==='_'?62:/[A-Z]/.test(q)?q.charCodeAt(0)-29:parseInt(q,36);
const CARTE_RE='~{0,3}[0-9a-zA-Z_]',cartesDe=x=>x.match(new RegExp(CARTE_RE,'g'))||[]; /* jeton de carte, 1 ou 2 caracteres */ /* Encodage etendu : 126-188 = '~~' + 1 caractere, 189-251 = '~~~' + 1 caractere ; 0-125 inchanges */
/* identifiant d'effet. Le Maitre du deguisement (029e) et Le chansonnier (041e, Velnen) portent l'effet copie (g.cp, null = rien) ; les autres, le leur.
   Un copieur ne porte jamais l'identifiant d'un copieur : copier un copieur donne son effet copie, sans boucle possible. */
const COPIEURS={'029e':1,'041e':1};
function idEff(g){const id=carte(g.c).id;return COPIEURS[id]?(g.cp||null):id}
/* Vic222 : Info tchat (042, ou copieur qui l'a copiee) en jeu sur le terrain k : tout Golem allie de ce terrain (lui compris) a le cercle a +2.
   Jamais plus de +2 (plusieurs Vic222, SuperFishman : pas de cumul). */
function cercle2(G,k,id){return aProp(id,'cercle2')||[0,1,2].some(a=>golem(G[a][k])&&aProp(idEff(G[a][k]),'cercle2Terrain'))}
/* Animaux de compagnie (Kiwi). Ce ne sont pas des Golems : aucun effet de Golem ne les concerne, Force 0 dans les colonnes.
   estAnimal accepte un code ('901'), une fiche de CARTES ou une carte de partie (69). Sur la grille : g.maitre = carte de partie du maitre. */
const estAnimal=x=>{const C=typeof x==='number'?carte(x):typeof x==='string'?CARTES[x]:x;return !!(C&&C.animal)};
/* Animaux jouables (7 nov.) : cout (1 = ancien, 0 = nouveau) ; element : l'animal porte le 1er element de son maitre et compte comme voisin pour le Trait. */
const REGLAGE_ANIMAUX=D.reglageAnimaux; /* cartes/donnees/animaux.js (reglage) ; kiwiApres : Kiwi part apres le decompte ; attache : animal sous son maitre (g.ani), +1 de Force */
const coutCarte=C=>C.animal?REGLAGE_ANIMAUX.cout:C.cout; /* cout de base, avant Elessar et La Boutique */
const elAnimal=A=>REGLAGE_ANIMAUX.element&&!REGLAGE_ANIMAUX.attache&&A.animal&&CARTES[A.maitre]?CARTES[A.maitre].el[0]:null;
/* animaux allies voisins de (l,k) qui portent un element (nouveau reglage seulement) */
function animauxVoisins(G,l,k){if(!REGLAGE_ANIMAUX.element)return [];return [[l-1,k],[l+1,k],[l,k-1],[l,k+1]].map(([a,c])=>G[a]&&G[a][c]).filter(g=>animal(g)&&elAnimal(carte(g.c)))}
const ANIMAL_MAX=1,maxEx=id=>estAnimal(id)?ANIMAL_MAX:MAX_EX;
const animal=g=>!!g&&!!carte(g.c).animal,golem=g=>!!g&&!carte(g.c).animal;
/* Maitre : la carte de base ou son evolution, par la carte et non par l'effet (Apo deguise en Titom76 n'est pas Titom76). */
const estMaitreDe=(g,A)=>golem(g)&&(carte(g.c).id===A.maitre||carte(g.c).base===A.maitre);
const maitreDe=id=>CARTES[id]&&CARTES[id].maitre||null;
/* Case du maitre voisine de (l,k), dans l'ordre haut, bas, gauche, droite (jamais en diagonale) ; null si aucune. */
function maitreVoisin(G,A,l,k){return [[l-1,k],[l+1,k],[l,k-1],[l,k+1]].find(([a,b])=>G[a]&&b>=0&&b<3&&estMaitreDe(G[a][b],A))||null}

function alea(o,cle){ /* mulberry32 */
  o[cle]=(o[cle]+0x6D2B79F5)|0;let t=o[cle];
  t=Math.imul(t^(t>>>15),t|1);t^=t+Math.imul(t^(t>>>7),t|61);
  return ((t^(t>>>14))>>>0)/4294967296;
}
function melange(o,cle,l){for(let i=l.length-1;i>0;i--){const k=Math.floor(alea(o,cle)*(i+1));[l[i],l[k]]=[l[k],l[i]]}return l}
const de=(s,p)=>1+Math.floor(alea(s.rng,p)*6);
const dire=(s,p,t)=>s.log.push([p,t]);

/* Decks personnalises. Texte compact : identifiant de carte puis nombre d'exemplaires, dans l'ordre de TYPES,
   ex. "0013002e2008 1" sans espace : "0013002e20081". Vide ou null : paquet de test (3 exemplaires de chaque type).
   Base et evolution comptent a part. Identifiant de partie = rang du type * 3 + exemplaire, comme le paquet de test. */
const DECK_MIN=24,DECK_MAX=30,MAX_EX=3;
function erreurDeck(o){
  if(!o||typeof o!=='object')return 'deck illisible';
  let n=0;
  for(const id in o){
    if(!TYPES.includes(id))return 'carte inconnue '+id;
    const v=o[id],mx=maxEx(id);if(!Number.isInteger(v)||v<0||v>mx)return mx===1?'un seul exemplaire de '+CARTES[id].nom:'trop d\'exemplaires de '+CARTES[id].nom;
    n+=v;
  }
  /* Animal : interdit sans au moins une carte de son maitre (base ou evolution) */
  for(const id in o)if(o[id]>0&&estAnimal(id)){const m=maitreDe(id);if(!TYPES.some(t=>(t===m||CARTES[t].base===m)&&o[t]>0))return CARTES[id].nom+' demande '+CARTES[m].nom+' dans le deck';}
  if(n<DECK_MIN)return 'moins de '+DECK_MIN+' cartes';
  if(n>DECK_MAX)return 'plus de '+DECK_MAX+' cartes';
  return '';
}
/* Regle des elements (0.4a) : un deck contient au plus ELEM_MAX elements differents (union des elements de ses cartes ; animaux sans element).
   Verifiee par le site (editeur, import, choix du deck, salon), jamais par erreurDeck ni lisDeck : rejeux et parties en cours inchanges. */
const ELEM_MAX=4;
function elementsDeck(o){const E=new Set();for(const id in o)if(+o[id]>0&&CARTES[id])CARTES[id].el.forEach(e=>E.add(e));return [...E]}
function erreurElements(o){const n=elementsDeck(o||{}).length;return n>ELEM_MAX?n+' éléments différents ('+ELEM_MAX+' au plus)':''}
/* Regle des evolutions (0.5) : une evolution (champ base) demande au moins un exemplaire de sa base dans le deck. Meme statut que erreurElements :
   verifiee par le site seulement, jamais par erreurDeck ni lisDeck (rejeux et parties en cours inchanges). Renvoie les evolutions orphelines. */
function evolutionsSansBase(o){o=o||{};return Object.keys(o).filter(id=>+o[id]>0&&CARTES[id]&&CARTES[id].base&&!(+o[CARTES[id].base]>0))}
/* Regle des animaux (0.5) : un animal demande au moins un exemplaire de la BASE de son maitre (l'evolution seule ne suffit pas).
   Meme statut : verifiee par le site seulement ; erreurDeck garde l'ancienne regle (base ou evolution) pour les rejeux. */
function animauxSansBase(o){o=o||{};return Object.keys(o).filter(id=>+o[id]>0&&CARTES[id]&&CARTES[id].animal&&!(+o[CARTES[id].maitre]>0))}
function erreurEvolutions(o){const L=evolutionsSansBase(o).map(id=>CARTES[id].nom+' sans '+CARTES[CARTES[id].base].nom).concat(animauxSansBase(o).map(id=>CARTES[id].nom+' sans '+CARTES[CARTES[id].maitre].nom));return L.join(', ')}
function deckTexte(o){
  if(!o)return '';
  return TYPES.filter(t=>+o[t]>0).map(t=>t+o[t]).join('');
}
function lisDeck(t){ /* objet {id:nombre} valide, ou null (paquet de test) si vide ou invalide */
  if(typeof t!=='string'||!t||t.length>300||!/^([0-9]{3}e?[1-3])+$/.test(t))return null;
  const o={},re=/([0-9]{3}e?)([1-3])/g;let m;
  while((m=re.exec(t))){if(m[1] in o)return null;o[m[1]]=+m[2]}
  return erreurDeck(o)?null:o;
}
function idsDeck(o){
  if(!o)o=DECK_DEFAUT; /* 0.3 : deck par defaut de 30 cartes (33 identifiants consecutifs jusqu'a 0.2c) */
  const l=[];TYPES.forEach((t,i)=>{for(let c=0;c<(o[t]||0);c++)l.push(i*EXEMPLAIRES+c)});
  return l;
}
function nouvelle(graine,decks){
  graine=graine|0;
  const g={v:graine};
  const t=tirageTerrains(g,graine,!!decks&&(decks[0]===DECK_TUTO||decks[1]===DECK_TUTO)); /* 15 terrains ; partie guidee : 10 anciens */
  const premier=alea(g,'v')<.5?0:1;
  const dk=[0,1].map(p=>{const o=lisDeck(decks&&decks[p]);return o?deckTexte(o):decks&&decks[p]===DECK_TUTO?DECK_TUTO:''}); /* 'tuto33' garde (partie guidee) */
  const s={graine,decks:dk,rng:[(graine^0x51ED270B)|0,(graine^0x2F7A9C31)|0],terrains:t,manche:1,tour:1,premier,joueur:premier,
    phase:'mulligan',mull:[false,false],attente:null,fil:null,dernier:null,forceTotale:[0,0],resultats:[],fin:null,log:[],reperes:[],stats:{ev:[],coups:{},cause:null,t:[],act:[],tours:[],vues:[[],[]]},j:[]};
  for(let p=0;p<2;p++){
    const deck=melange(s.rng,p,dk[p]===DECK_TUTO?Array.from({length:33},(_,i)=>i):idsDeck(lisDeck(dk[p]))); /* 0.3 : 'tuto33', ancien paquet de 33 cartes (ids 0 a 32), Golem de la partie guidee seulement */
    s.j.push({deck,main:deck.splice(0,5),defausse:[],forge:[],energie:0,score:0,aForge:false,aAgi:false,etapeForge:false,vaisseau:0,faille:0,eclair:0,eclairUtil:0,
      grille:[[null,null,null],[null,null,null],[null,null,null]]});
  }
  return s;
}
function bonus(s,p,l,k){
  const G=s.j[p].grille;let b=0;
  [[l-1,k],[l+1,k],[l,k-1],[l,k+1]].forEach(([a,c])=>{
    const v=G[a]&&G[a][c];if(v)b+=somme(effs(idEff(v)),'voisinBonus')
  });
  return b;
}
/* GeneralBrioche : Grand General (020, ou copieur), +1 par exemplaire allie dans la meme colonne, autre ligne (cumulatif, pas sur lui). */
function generaux(G,l,k){let n=0;for(let a=0;a<3;a++)if(a!==l&&golem(G[a][k]))n+=somme(effs(idEff(G[a][k])),'colonneBonus');return n}
function voisins(G,l,k){return [[l-1,k],[l+1,k],[l,k-1],[l,k+1]].map(([a,c])=>G[a]&&G[a][c]).filter(golem)}
/* 0.2a.1 : Indra. g.fav = identifiant de carte du favori, dans le camp d'Indra. Base +1, evolution +2. */
const FAV_BONUS={}; /* code -> bonus du favori, deduit des fiches (type favori) en fin de fichier */
const favBonus=id=>somme(effs(id),'favoriBonus');
function indrasDe(s,p,c){const r=[];s.j[p].grille.forEach(L=>L.forEach(g=>{if(g&&g.fav===c&&favBonus(idEff(g)))r.push(g)}));return r}
function favori(s,p,c){return indrasDe(s,p,c).reduce((t,g)=>t+favBonus(idEff(g)),0)}
function caseDeCarte(s,p,c){for(let l=0;l<3;l++)for(let k=0;k<3;k++){const g=s.j[p].grille[l][k];if(g&&g.c===c)return [l,k]}return null}
/* Force actuelle = base + capacites + Trait + cercle - degats, partout. */
function forceDe(s,p,l,k){
  const J=s.j[p].grille,g=J[l][k];if(!g||animal(g))return 0;
  const el=carte(g.c).el,vs=voisins(J,l,k),ET=NEUTRE||!s.terrains[k]?VIDE:effsT(s,k),ci=ET.some(e=>e.T.inverse&&e.T.inverse(e.r));let v=g.f+(g.ra||0)+bonus(s,p,l,k)+favori(s,p,g.c)-g.d;
  if(!ci)el.forEach(e=>{v+=vs.filter(n=>carte(n.c).el.includes(e)).length}); /* 0.2.1 : +1 par voisin partageant l'element ; Le Cirque : pas de Trait */
  if(!ci&&REGLAGE_ANIMAUX.element)animauxVoisins(J,l,k).forEach(A=>{if(el.includes(elAnimal(carte(A.c))))v++}); /* animal voisin : +1 s'il partage son element */
  for(const e of ET)if(e.T.force){const x=e.T.force(e.r,s,p,k);if(x)v+=x} /* terrain (Le Karaoke : exactement 2 Golems ici, +2 chacun) */
  const id=idEff(g),E=effs(id);
  for(const e of E)if(e.T.force)v+=e.T.force(e.r,s,p,l,k,g,J,vs,el); /* capacites du Golem (copieurs : l'effet copie, depuis leur case) */
  v+=generaux(J,l,k); /* auras de colonne (Grand General) */
  for(const e of E)if(e.T.forceFin)v+=e.T.forceFin(e.r,s,p,l,k,g,J,vs,el); /* capacites ajoutees apres les auras (Bonus d'adjacence) */
  v+=jjBonus(g); /* JackJoy : Sub offert (partie) et Draft diff (manche) recus */
  if(g.ani)v+=1; /* animal attache : +1 a son maitre */
  const f=s.j[1-p].grille[l][k];
  if(!ci&&f&&el.some(e=>carte(f.c).el.includes(DOMINE[e])))v+=cercle2(J,k,id)?2:1; /* Vic222 : Info tchat ; Le Cirque : pas de cercle */
  return v;
}
/* Mignonitude : un Golem marque hors = s.manche ne compte pas au decompte de cette manche (il reste en jeu, sa Force ne change pas). */
const valeurDecompte=(s,p,l,k)=>{const g=s.j[p].grille[l][k];return g&&g.hors===s.manche?0:forceDe(s,p,l,k)};
/* Spom (Forge eclair), Elessar (Realisation de l'age), Velnen (Graine de Golem) en jeu : spoms, elessars, graines (cartes/effets/golems.js) */
/* Bellock/Loxim. DUO : carte (base ou evolution) -> Golem de base du partenaire. Les cartes se reconnaissent par la carte, pas par l'effet
   (Apo deguise en Loxim n'est pas Loxim). REGLAGE_DUO : valeur de Double up ?, modifiable pour les simulations. */
const DUO={},DUO_NOM={}; /* code -> partenaire, nom de l'effet : deduits des fiches (type duo) en fin de fichier */
/* Comeback (Bellock +1, Aiges Captain +2) : manches deja decomptees ou p a perdu le terrain k ; Winstreak (Loxim +1, Le Ace de Aiges +2) : ou il l'a remporte.
   Egalite, ou Salle Verrouillee avant la manche 3 (personne ne la remporte) : rien. Jamais stocke sur la carte : recalcule, le Golem deplace compte son nouveau terrain. */
/* Golem du partenaire P (carte de base ou evolution) seul avec (l,k) sur sa ligne ou son terrain : l'autre case de la ligne ou du terrain est le partenaire,
   la troisieme est vide (un animal la bloque). Renvoie le partenaire (ligne d'abord) ou null. */
/* Double up ? (Aiges Captain, Le Ace de Aiges, ou copieur) : +REGLAGE_DUO.doubleUp une seule fois, meme si ligne et terrain sont vrais a la fois. */
/* Mort en chaine : le partenaire mort a la vague d'avant, sur la meme ligne ou le meme terrain, explique la perte de Double up ? */
function duoMort(s,a,x){const g=s.j[x.p].grille[x.l][x.k],id=g&&idEff(g),e=effs(id).find(e=>e.r.doubleUp);return !!id&&!!e&&a.p===x.p&&(a.l===x.l||a.k===x.k)&&a.nom.split(' (')[0]===CARTES[e.r.partenaire].nom}
/* « Si tu forges cette carte » : la carte c vient de passer de la main a la Forge (Forge 'f', Forge eclair 'j', Spam 's'). Le joueur pioche AU HASARD
   un exemplaire du partenaire parmi tous ceux de son deck, bases et evolutions confondues (chaque exemplaire a la meme chance : tirage pondere par
   le nombre d'exemplaires), par le generateur du joueur (rejeu identique), dans l'ordre des numeros de carte (l'ordre du deck ne compte pas).
   Aucun : rien, pas de melange. Puis il melange son deck. etape : pendant l'etape de Forge (on la recalcule).
   Jamais pour une copie (Apo, chansonnier) : on ne forge pas une carte en jeu. */
function partenaires(J,c){
  const P=DUO[carte(c).id];if(!P)return [];
  return J.deck.filter(x=>{const id=carte(x).id;return id===P||CARTES[id].base===P}).sort((a,b)=>a-b);
}
function forgeDuo(s,p,c,etape){
  const C=carte(c);if(!DUO[C.id])return;
  const J=s.j[p],o=partenaires(J,c),n=nomDetail(C)+' : '+DUO_NOM[C.id];
  declenche(s,DUO_NOM[C.id],o.length?'Cherche '+CARTES[DUO[C.id]].nom:'Aucun '+CARTES[DUO[C.id]].nom);
  if(!o.length){dire(s,p,n+', aucun '+CARTES[DUO[C.id]].nom+' dans le deck.');return}
  prendDuo(s,p,o[Math.floor(alea(s.rng,p)*o.length)],n);if(etape)J.etapeForge=(!J.aForge||J.eclair>0)&&J.main.length>0;
}
function prendDuo(s,p,x,n){
  const J=s.j[p];J.deck.splice(J.deck.indexOf(x),1);J.main.push(x);melange(s.rng,p,J.deck);
  dire(s,p,n+', pioche '+nomDetail(carte(x))+' dans son deck, puis le mélange.');
}
/* JackJoy. Sub offert (035) : si la carte est forgee (Forge, Forge eclair, Spam), un Golem allie en jeu au choix gagne +1 pour la partie (g.sub).
   Draft diff (035e, ou Apo / chansonnier qui l'a copie) : chaque fois que son joueur forge, un Golem allie en jeu non voisin (haut, bas, gauche,
   droite ; diagonales permises), jamais lui-meme, gagne +1 jusqu'a la fin de la partie (V2 ; g.dr). Copier Sub offert ne sert a rien (on ne forge pas une copie).
   Bonus portes par l'objet du Golem : listes des cartes donneuses. Perdus s'il meurt ou est remplace ; a l'evolution, Sub offert et Draft diff gardes (V2) ; gardes s'il est deplace
   ou echange. g.dr est vide apres le decompte et les effets de fin de manche (finDraft). Animaux jamais cibles.
   Declenchements d'une Forge : Sub offert d'abord, puis chaque Draft diff dans l'ordre de lecture de la grille. Aucune cible : rien ;
   une seule : d'office ; sinon attente 'l' (cases, file des declenchements restants), coup 'l' + ligne + colonne. */
/* REGLAGE_JJ : regle V2 decidee par Romain et JackJoy le 5 nov. (par defaut) : garde = Sub offert et Draft diff gardes quand le Golem booste evolue ;
   partie = Draft diff dure toute la partie (g.dr n'expire plus). false/false = premiere version (manche, perdu a l'evolution), simulations seulement. */
const REGLAGE_JJ={garde:true,partie:true};
function jjBonus(g){return (g.sub?g.sub.length:0)+(g.dr?g.dr.length:0)}
function ciblesJJ(G,y,i){const r=[];G.forEach((L,a)=>L.forEach((g,b)=>{if(golem(g)&&(y==='sub'||Math.abs(a-i[0])+Math.abs(b-i[1])>1))r.push([a,b])}));return r}
function forgeJJ(s,p,c){
  const f=[];if(carte(c).id==='035')f.push({y:'sub',src:c});
  s.j[p].grille.forEach(L=>L.forEach(g=>{if(golem(g)&&idEff(g)==='035e')f.push({y:'draft',src:g.c})}));
  if(f.length)suiteJJ(s,p,f);
}
function suiteJJ(s,p,f){
  const J=s.j[p];
  while(f.length){
    const e=f.shift();let i=null;
    if(e.y==='draft'){i=caseDeCarte(s,p,e.src);if(!i||idEff(J.grille[i[0]][i[1]])!=='035e')continue}
    const cs=ciblesJJ(J.grille,e.y,i);
    if(!cs.length){dire(s,p,nomDetail(carte(e.src))+' : '+(e.y==='sub'?'Sub offert':'Draft diff')+', aucun Golem allié à cibler.');continue}
    if(cs.length===1){donneJJ(s,p,e,cs[0][0],cs[0][1]);continue}
    s.attente={t:'l',p,y:e.y,src:e.src,i,cases:cs,file:f};return;
  }
}
function donneJJ(s,p,e,l,k){
  const g=s.j[p].grille[l][k],sub=e.y==='sub',x=sub?'sub':'dr',fin=sub||REGLAGE_JJ.partie?'partie':'manche';(g[x]||(g[x]=[])).push(e.src);
  declenche(s,sub?'Sub offert':'Draft diff','+1 pour '+nomDetail(carte(g.c)));
  dire(s,p,nomDetail(carte(e.src))+' : '+(sub?'Sub offert':'Draft diff')+', '+nomDetail(carte(g.c))+' gagne +1 de Force jusqu\'à la fin de la '+fin+'.');
}
function finDraft(s){
  if(REGLAGE_JJ.partie)return false;let n=0;s.j.forEach(J=>J.grille.forEach(L=>L.forEach(g=>{if(g&&g.dr){n+=g.dr.length;delete g.dr}})));
  if(n)dire(s,null,'Fin de manche : les bonus de Draft diff disparaissent.');
  return n>0;
}
const colonnes=s=>[0,1,2].map(k=>[0,1].map(p=>[0,1,2].reduce((t,l)=>t+valeurDecompte(s,p,l,k),0)));
/* La carte c vient de passer de la main a la Forge (Forge, Forge eclair, Spam) : effets « si tu forges ». etape : pendant l'etape de Forge. */
function forgee(s,p,c,etape){forgeDuo(s,p,c,etape);forgeJJ(s,p,c)}
function retire(s,p,l,k,rem){
  const J=s.j[p],g=J.grille[l][k];
  J.defausse.push(g.c);
  J.grille[l][k]=null;
  if(golem(g))orphelins(s,p,g.c,rem);
  if(g.ani){const A=carte(g.ani.c);J.defausse.push(g.ani.c);if(!rem&&A.id==='902')chatsPioche(s,p,'son maître est détruit');dire(s,p,A.nom+' part à la défausse : son maître a quitté le jeu.')} /* animal attache */
}
/* Un animal part a la defausse quand son maitre quitte le jeu (mort, remplace, detruit). Deplace ou evolue, le maitre le garde (agit suit l'evolution). */
function orphelins(s,p,c,rem){ /* rem : remplacement par son joueur, pas une destruction (Jacen et Jaina) */
  const J=s.j[p];
  /* 0.4 : les chats quittent la grille avant de piocher ; journal dans le meme ordre */
  J.grille.forEach(L=>L.forEach((h,k)=>{if(animal(h)&&h.maitre===c){J.defausse.push(h.c);L[k]=null;if(!rem&&carte(h.c).id==='902')chatsPioche(s,p,'son maître est détruit');dire(s,p,carte(h.c).nom+' part à la défausse : son maître a quitté le jeu.')}}));
}
/* Jacen et Jaina (902) : pioche 1 carte. Deck vide : 1 point pour l'adversaire (evenement 'jj' seulement si une carte est piochee). */
function chatsPioche(s,p,pq){const v=!s.j[p].deck.length&&!s.deckLibre;dire(s,p,'Jacen et Jaina : '+pq+', pioche 1 carte.');pioche(s,p,1);if(!v)s.stats.ev.push({t:'jj',cp:p,y:pq})} /* journal : l'effet, puis le point si le deck est vide */
/* Statistiques : evenements en lecture seule, aucun effet sur la partie. src = {p,c,lib}, c et p peuvent etre null. */
function note(s,t,n,src,cp,cc,ch){const o={t,n,sp:src.p,sc:src.c,lib:src.lib,cp,cc};if(ch)o.ch=1;s.stats.ev.push(o)}
function declenche(s,nom,e){s.stats.act.push({m:s.manche,nom,e})}
/* Seul point de controle du ciblage : tout effet de carte passe par ici. Les terrains n'y passent pas. */
function ciblable(s,p,l,k,src){
  const g=s.j[p].grille[l][k];
  return golem(g)&&!(aProp(idEff(g),'intouchable')&&src!==p); /* Mode Avion */
}
function blesse(s,p,l,k,n,src){
  const g=s.j[p].grille[l][k];
  const E=effs(idEff(g));
  for(const e of E)if(e.T.protege&&e.T.protege(e.r,s,p,g,src))return; /* Menfou palu, Chance du debutant : perte venue d'un effet adverse annulee */
  g.d+=n;
  for(const e of E)if(e.T.blessure)e.T.blessure(e.r,g); /* Rage : tranchee par nettoie, une fois la survie connue */
  note(s,'d',n,src,p,g.c);s.stats.coups[p+''+l+k]=src;
}
function rage(s){
  for(let p=0;p<2;p++)for(let l=0;l<3;l++)for(let k=0;k<3;k++){
    const g=s.j[p].grille[l][k];if(!g||!g.rp)continue;
    for(const e of effs(idEff(g)))if(e.T.cumule)e.T.cumule(e.r,s,p,g);
  }
}
const dessus=id=>effs(id).some(e=>e.r.compte==='dessus'),colonne=id=>aProp(id,'colonneBonus'); /* explications des morts en chaine */
/* Vagues simultanees : tous les Golems a 0 ou moins meurent ensemble, puis on recalcule. */
function nettoie(s){
  let avant=null;
  for(;;){
    const morts=[];
    for(let p=0;p<2;p++)for(let l=0;l<3;l++)for(let k=0;k<3;k++){
      if(golem(s.j[p].grille[l][k])&&forceDe(s,p,l,k)<=0)morts.push({p,l,k,nom:nomDetail(carte(s.j[p].grille[l][k].c)),e:idEff(s.j[p].grille[l][k])});
    }
    if(!morts.length){s.stats.coups={};rage(s);return}
    if(!avant)dire(s,null,morts.map(x=>x.nom).join(' et ')+(morts.length>1?' meurent.':' meurt.'));
    else dire(s,null,morts.map(x=>{
      const c=avant.find(a=>(a.p===x.p&&Math.abs(a.l-x.l)+Math.abs(a.k-x.k)===1)||(a.p!==x.p&&a.l===x.l&&a.k===x.k))||avant.find(a=>a.p===x.p&&a.k===x.k&&a.l<x.l&&dessus(idEff(s.j[x.p].grille[x.l][x.k])))||avant.find(a=>duoMort(s,a,x))||avant.find(a=>a.p===x.p&&a.k===x.k&&colonne(a.e)); /* Shifukuro */
      return x.nom+' meurt ensuite'+(c?' : il perd le bonus de '+c.nom:'')+'.'}).join(' '));
    morts.forEach(x=>{
      const c=avant&&(avant.find(a=>(a.p===x.p&&Math.abs(a.l-x.l)+Math.abs(a.k-x.k)===1)||(a.p!==x.p&&a.l===x.l&&a.k===x.k))||avant.find(a=>a.p===x.p&&a.k===x.k&&a.l<x.l&&dessus(idEff(s.j[x.p].grille[x.l][x.k])))||avant.find(a=>duoMort(s,a,x))||avant.find(a=>a.p===x.p&&a.k===x.k&&colonne(a.e))); /* Shifukuro */
      x.src=(c&&c.src)||s.stats.coups[x.p+''+x.l+x.k]||s.stats.cause||{p:null,c:null,lib:'Perte de bonus'};
      note(s,'m',1,x.src,x.p,s.j[x.p].grille[x.l][x.k].c,avant?1:0);
    });
    morts.forEach(x=>retire(s,x.p,x.l,x.k));
    avant=morts;
  }
}
/* Bonus de chaque Golem au moment du decompte : qui recoit, qui donne. */
function noteBonus(s){
  const b=(y,p,r,dp,d)=>s.stats.ev.push({t:'b',y,p,r,dp,d});
  for(let p=0;p<2;p++)for(let l=0;l<3;l++)for(let k=0;k<3;k++){
    const G=s.j[p].grille,g=G[l][k];if(!golem(g)||g.hors===s.manche)continue; /* animal ou Golem hors decompte (Mignonitude) : rien a expliquer */
    const vs=voisins(G,l,k),el=carte(g.c).el,ci=inverseIci(s,k);
    vs.forEach(n=>{if(somme(effs(idEff(n)),'voisinBonus'))b('voisins',p,g.c,p,n.c)});
    indrasDe(s,p,g.c).forEach(n=>b('favori',p,g.c,p,n.c));
    if(!ci)el.forEach(e=>vs.forEach(n=>{if(carte(n.c).el.includes(e))b('trait',p,g.c,p,n.c)}));
    if(!ci&&REGLAGE_ANIMAUX.element)animauxVoisins(G,l,k).forEach(A=>{if(el.includes(elAnimal(carte(A.c))))b('trait',p,g.c,p,A.c)}); /* animal voisin */
    const f=s.j[1-p].grille[l][k];
    if(!ci&&f&&el.some(e=>carte(f.c).el.includes(DOMINE[e]))){b('cercle',p,g.c,1-p,f.c);if(cercle2(G,k,idEff(g)))b('cercle',p,g.c,1-p,f.c)} /* Vic222 : Info tchat */
    const E=effs(idEff(g));
    for(const e of E)if(e.T.note)e.T.note(e.r,s,p,l,k,g,G,vs,el,b); /* capacites du Golem */
    for(let a=0;a<3;a++){const n=G[a][k];if(a!==l&&golem(n)&&colonne(idEff(n)))b('general',p,g.c,p,n.c)} /* auras de colonne */
    for(const e of E)if(e.T.noteFin)e.T.noteFin(e.r,s,p,l,k,g,G,vs,el,b);
    (g.sub||[]).forEach(()=>b('sub',p,g.c,p,g.c));(g.dr||[]).forEach(x=>b('draft',p,g.c,p,x)); /* JackJoy : la carte de Sub offert est dans la Forge, rien a lui attribuer */
  }
}
/* Deck vide (regle de la meule, remplace la defaite de 0.4) : « Si ton deck est vide, chaque carte que tu dois piocher donne 1 point a ton adversaire. »
   Toute pioche se fait carte par carte (debut de tour, Graine de Golem, Spam, La Bretagne, Jacen et Jaina, mulligan) : chaque carte manquante
   donne POINT_DECK_VIDE au score de l'adversaire (le meme que les terrains), la partie continue. La Bretagne : c'est le joueur qui pioche qui donne le point.
   Regarder, prendre ou reordonner le deck sans piocher (Jour de peche du Q sur le deck adverse, Le Buzzer) ne donne jamais de point ; Comeback et Winstreak (Bellock/Loxim) cherchent
   une carte precise dans le deck, ce n'est pas une pioche (aucune : rien). Evenement de stats : {t:'dv',cp:qui pioche,n:points,m:manche}. */
const POINT_DECK_VIDE=1;
/* s.deckLibre : banc d'essai seulement (tests unitaires qui vident les decks pour autre chose), jamais pose par nouvelle ni par le site :
   la pioche s'arrete sans point, comme jusqu'a 0.3. */
function pioche(s,p,n){const J=s.j[p];for(let i=0;i<n;i++){if(!J.deck.length){if(s.deckLibre)return;piocheVide(s,p);continue}J.main.push(J.deck.shift())}}
function piocheVide(s,p){
  s.j[1-p].score+=POINT_DECK_VIDE;s.stats.ev.push({t:'dv',cp:p,n:POINT_DECK_VIDE,m:s.manche});
  dire(s,p,'n\'a pas pu piocher (deck vide) : +'+POINT_DECK_VIDE+' point pour l\'adversaire.');
}
function debutTour(s){
  const J=s.j[s.joueur];pioche(s,s.joueur,s.tour===1&&s.joueur!==s.premier?1:2); /* 0.2 : le second de la manche ne pioche qu'1 carte a son premier tour */
  for(const T of TYPES_AVEC('debutTour'))T.debutTour(s,s.joueur,J); /* Graine de Golem : pioche en plus */
  J.energie=J.forge.length;J.aForge=false;J.aAgi=false;
  J.etapeForge=J.main.length>0; /* la Forge passe avant toute action, Faille et Vaisseau compris */
  J.eclair=spoms(J.grille);J.eclairUtil=0; /* Forge eclair : cartes de plus a forger au debut du tour ; reprises dues en fin de tour */
}
function coutPose(s,p,c,l,k){
  const evo=!!carte(c).base;
  let v=coutCarte(carte(c)); /* animaux : REGLAGE_ANIMAUX.cout */
  if(evo)v+=elessars(s.j[1-p].grille); /* surtaxe des evolutions (Realisation de l'age adverse en jeu, cumulatif) ; pas un ciblage (Mode Avion n'y change rien) */
  if(!carte(c).animal)v-=somme(effsT(s,k),'reduction'); /* La Boutique (0.2b.2) : « Jouer un Golem ici » = poser, remplacer et faire evoluer ; pas un animal */
  return Math.max(0,v); /* minimum 0, sur le cout total (surtaxe comprise) */
}
const interditManche=(C,s)=>effs(C.id).some(e=>e.T.interdit&&e.T.interdit(e.r,s)); /* carte posable seulement a certaines manches (par la carte, pas l'effet) */
function genre(s,p,l,k){return s.j[p].grille[l][k]?'remplacer':'poser'}
function peutPoser(s,p,c,l,k){
  const J=s.j[p],occ=J.grille[l][k],C=carte(c);
  if(C.animal){if(REGLAGE_ANIMAUX.attache){if(!estMaitreDe(occ,C)||occ.ani)return false}else if(occ||!maitreVoisin(J.grille,C,l,k))return false} /* case libre, voisine de son maitre en jeu ; attache : sur la case de son maitre, sans autre animal */
  else if(C.base){if(!occ||carte(occ.c).id!==C.base)return false}
  else if(animal(occ)||interditManche(C,s))return false; /* un Golem ne remplace jamais un animal ; Jeunesse ephemere */
  else if(!occ&&estVersus(s,k)&&golemsIci(s,p,k))return false; /* Le Versus : un seul Golem par joueur ici (remplacement et evolution sur place permis) */
  return coutPose(s,p,c,l,k)<=J.energie;
}
function legales(s,p){
  if(s.fin)return [];
  const J=s.j[p],r=[];
  if(s.phase==='mulligan'){
    if(s.mull[p])return r;
    const m=J.main;r.push({t:'m',c:[]});
    m.forEach((a,i)=>{r.push({t:'m',c:[a]});
      m.forEach((b,j)=>{if(j>i){r.push({t:'m',c:[a,b]});
        m.forEach((d,q)=>{if(q>j)r.push({t:'m',c:[a,b,d]})})}})});
    return r;
  }
  if(s.attente){
    if(s.attente.p!==p)return r;
    const a=s.attente;
    if(a.t==='q')a.options.forEach(c=>r.push({t:'c',c}));
    if(a.t==='b')permutations(a.options).forEach(o=>r.push({t:'b',o}));
    if(a.t==='d')J.main.forEach(c=>r.push({t:'d',c}));
    if(a.t==='s')J.main.forEach(c=>r.push({t:'s',c}));
    if(a.t==='g')a.cases.forEach(([l,k])=>r.push({t:'g',l,k}));
    if(a.t==='h')a.coups.forEach(([l,k,m,n])=>r.push({t:'h',l,k,m,n}));
    if(a.t==='k')a.cases.forEach(([l,k])=>r.push({t:'k',l,k}));
    if(a.t==='i')r.push({t:'i',o:1},{t:'i',o:0}); /* Velnen : Imitation, copier (1) ou refuser (0) */
    if(a.t==='u'){a.coups.forEach(([x,y,u,v])=>r.push({t:'e',a:[x,y],b:[u,v]}));r.push({t:'v'})} /* Shifukuro : meandyou, echanger ou passer */
    if(a.t==='l')a.cases.forEach(([l,k])=>r.push({t:'l',l,k})); /* JackJoy : cible de Sub offert ou Draft diff */
    if(a.t==='o'){
      const cs=[];J.grille.forEach((L,l)=>L.forEach((g,k)=>{if(golem(g))cs.push([l,k])}));
      if(cs.length<2)r.push({t:'v'});
      else cs.forEach((x,i)=>cs.forEach((y,j)=>{if(j>i)r.push({t:'e',a:x,b:y})}));
    }
    return r;
  }
  if(p!==s.joueur)return r;
  if(J.etapeForge){ /* 'f' Forge normale (1 fois), 'j' Forge eclair (1 par Spom), 'n' fin de l'etape */
    if(!J.aForge)J.main.forEach(c=>r.push({t:'f',c}));
    if(J.eclair>0)J.main.forEach(c=>r.push({t:'j',c}));
    r.push({t:'n'});return r}
  J.main.forEach(c=>{
    for(let l=0;l<3;l++)for(let k=0;k<3;k++)if(peutPoser(s,p,c,l,k))r.push({t:'p',c,l,k});
  });
  for(const T of TYPES_AVEC('actionsTerrain')){ /* actions des terrains (Vaisseau, Faille, Cirque, Pronos), dans l'ordre d'enregistrement des types */
    const k=s.terrains.findIndex((_,i)=>effsT(s,i).some(e=>e.T===T));if(k<0)continue;
    const e=effsT(s,k).find(e=>e.T===T);T.actionsTerrain(e.r,s,p,k,J,r);
  }
  r.push(...caramels(s,p));
  r.push(...loves(s,p)); /* K-Chan */
  r.push({t:'x'});
  return r;
}
function permutations(l){
  if(l.length<2)return [l.slice()];
  return l.flatMap((x,i)=>permutations(l.filter((_,j)=>j!==i)).map(q=>[x,...q]));
}
function code(a){
  switch(a.t){
    case 'm':return 'm'+a.c.slice().sort((x,y)=>x-y).map(b32).join('');
    case 'p':return 'p'+b32(a.c)+a.l+a.k;
    case 'e':return 'e'+a.a.join('')+a.b.join('');
    case 'w':return 'w'+a.k+a.a+a.b;
    case 'y':return 'y'+a.l+a.k+a.d;
    case 'g':case 'k':case 'z':case 'l':return a.t+a.l+a.k; /* 'l' : JackJoy */
    case 'h':case 'r':return a.t+a.l+a.k+a.m+a.n; /* 'r' : K-Chan */
    case 'i':return 'i'+(a.o?1:0); /* Velnen */
    case 'o':return 'o'+a.l; /* Le Cirque : tarte */
    case 'b':return 'b'+a.o.map(b32).join('');
    case 'f':case 'c':case 'd':case 's':case 'j':return a.t+b32(a.c);
    default:return a.t;
  }
}
function decode(x){
  const C='(?:'+CARTE_RE+')'; /* carte sur 1 ou 2 caracteres, coup 'j' */
  if(typeof x!=='string'||!new RegExp('^(m'+C+'{0,3}|p'+C+'[0-2][0-2]|e[0-2]{4}|w[0-2]{3}|y[0-2]{3}|[hr][0-2]{4}|[gklz][0-2]{2}|i[01]|b'+C+'{1,3}|[fcdsj]'+C+'|o[0-2]|[xvnat])$').test(x))throw new Error('action illisible');
  const t=x[0],h=h32;
  if(t==='g'||t==='k'||t==='z'||t==='l')return {t,l:+x[1],k:+x[2]};
  if(t==='h'||t==='r')return {t,l:+x[1],k:+x[2],m:+x[3],n:+x[4]};
  if(t==='i')return {t,o:+x[1]}; /* Velnen */
  if(t==='o')return {t,l:+x[1]}; /* Le Cirque : tarte */
  if(t==='m')return {t,c:cartesDe(x.slice(1)).map(h)};
  if(t==='p')return {t,c:h(x.slice(1,-2)),l:+x[x.length-2],k:+x[x.length-1]};
  if(t==='e')return {t,a:[+x[1],+x[2]],b:[+x[3],+x[4]]};
  if(t==='w')return {t,k:+x[1],a:+x[2],b:+x[3]};
  if(t==='y')return {t,l:+x[1],k:+x[2],d:+x[3]};
  if(t==='b')return {t,o:cartesDe(x.slice(1)).map(h)};
  if(t==='x'||t==='v'||t==='n'||t==='a'||t==='t')return {t}; /* 't' : Les Pronos */
  return {t,c:h(x.slice(1))};
}
function effetPose(s,p,l,k,g){
  const J=s.j[p];
  if(carte(g.c).id==='029e'&&!('cp' in g))return deguisement(s,p,l,k,g);
  if(carte(g.c).id==='041e'&&!('cp' in g))return imitation(s,p,l,k,g); /* Velnen */
  if(idEff(g)==='025e')return meandyou(s,p,l,k,g); /* Shifukuro : Le moderateur, ou Apo et chansonnier qui l'ont copie */
  const C={id:idEff(g)},E=effs(C.id); /* le Maitre du deguisement joue l'effet copie */
  for(const e of E)if(e.T.pose)e.T.pose(e.r,s,p,l,k,g); /* effets a la pose, avant les morts en chaine */
  let choix=null;
  if(C.id==='013e'&&g.fav!==undefined){const x=caseDeCarte(s,p,g.fav);if(x){dire(s,p,'Indra (La Fan enflammée) : '+nomDetail(carte(g.fav))+' reste son favori (+2 de Force).');ragebait(s,p,g,x[0],x[1])}else delete g.fav}
  if(FAV_BONUS[C.id]&&g.fav===undefined){
    const cs=[];J.grille.forEach((L,a)=>L.forEach((h,b)=>{if(golem(h)&&!(a===l&&b===k))cs.push([a,b])}));
    if(!cs.length)dire(s,p,nomDetail(carte(g.c))+' : aucun autre Golem, pas de favori.');
    else if(cs.length===1)choisitFavori(s,p,g,cs[0][0],cs[0][1]);
    else choix={t:'g',p,i:[l,k],cases:cs};
  }
  if(C.id==='009'){ /* 0.2a.2 : Slam, coups possibles [ligne, case de depart, case d'arrivee] chez l'adversaire */
    const cs=slams(s,p);
    if(!cs.length)dire(s,p,'Glad : Slam, aucun Golem adverse à déplacer.');
    else if(cs.length===1)slam(s,p,g.c,...cs[0]);
    else choix={t:'h',p,i:[l,k],coups:cs};
  }
  nettoie(s);
  /* 0.2a.2 : la pose a pu tuer un candidat (bonus perdus) : on ne garde que les cases encore occupees */
  if(choix&&choix.t==='g'){choix.cases=choix.cases.filter(([a,b])=>J.grille[a][b]);if(!choix.cases.length)choix=null;else if(choix.cases.length===1){const[a,b]=choix.cases[0];if(J.grille[l][k])choisitFavori(s,p,g,a,b);choix=null;nettoie(s)}}
  if(choix&&choix.t==='h'){choix.coups=slams(s,p);if(!choix.coups.length)choix=null;else if(choix.coups.length===1){slam(s,p,g.c,...choix.coups[0]);choix=null;nettoie(s)}}
  if(choix)s.attente=choix;
  for(const e of E)if(e.T.poseApres)e.T.poseApres(e.r,s,p,l,k,g); /* effets apres les morts de la pose (Jour de peche, Spam) */
}
const BRETON=c=>carte(c).el.some(e=>e==='brume'||e==='foudre');
/* Deguisement (Apo, 029e) : voisins allies (haut, bas, gauche, droite). 0 : rien. 1 : d'office. Sinon : attente 'k'. */
function voisinsCases(G,l,k){return [[l-1,k],[l+1,k],[l,k-1],[l,k+1]].filter(([a,b])=>G[a]&&b>=0&&b<3&&golem(G[a][b]))}
function deguisement(s,p,l,k,g){
  const J=s.j[p];
  nettoie(s);
  if(J.grille[l][k]!==g)return;
  const cs=voisinsCases(J.grille,l,k);
  if(!cs.length){g.cp=null;dire(s,p,nomDetail(carte(g.c))+' : aucun voisin, rien à copier.');return}
  if(cs.length===1)return copie(s,p,l,k,g,cs[0][0],cs[0][1]);
  s.attente={t:'k',p,i:[l,k],cases:cs};
}
function copie(s,p,l,k,g,a,b,q){ /* q : camp du Golem copie (le sien par defaut ; l'adverse pour Imitation, Velnen) */
  const n=s.j[q===undefined?p:q].grille[a][b];g.cp=idEff(n);
  dire(s,p,nomDetail(carte(g.c))+' copie '+nomDetail(carte(n.c))+(g.cp?'.':' : rien à copier.'));
  effetPose(s,p,l,k,g);
}
/* Velnen : Imitation (Le chansonnier, 041e), a la pose. Cible : le Golem adverse en face (meme terrain, meme ligne). Case vide ou animal : rien.
   Mode Avion : rien (ciblable). Apo ou chansonnier en face qui n'a rien copie : rien. Sinon, choix 'i' : copier (1) ou refuser (0), toujours propose.
   La copie est figee a la pose (g.cp) et se lit du point de vue du chansonnier (« adverse » = l'autre camp). */
function imitation(s,p,l,k,g){
  const J=s.j[p],n=nomDetail(carte(g.c))+' : Imitation';
  nettoie(s);
  if(J.grille[l][k]!==g)return;
  const h=s.j[1-p].grille[l][k];
  if(!golem(h)){g.cp=null;dire(s,p,n+', aucun Golem en face.');return}
  if(!ciblable(s,1-p,l,k,p)){g.cp=null;dire(s,p,n+', '+nomDetail(carte(h.c))+' est protégé (Mode Avion).');return}
  if(!idEff(h)){g.cp=null;dire(s,p,n+', '+nomDetail(carte(h.c))+' n\'a rien à copier.');return}
  s.attente={t:'i',p,i:[l,k]};
}
/* Shifukuro : meandyou (Le moderateur, 025e), a la pose, facultatif. Choix 1 : un Golem allie au-dessus de (l,k) sur le meme terrain ;
   choix 2 : un de ses voisins (Golem allie adjacent, sans diagonale ; le moderateur lui-meme compte comme voisin du Golem juste au-dessus).
   Paires sans doublon, chaque paire dans l'ordre de lecture (ligne puis colonne) : [a,b,x,y]. Un animal n'est jamais echange. */
function echangesMeandyou(G,l,k){
  const r=[],vu={};
  for(let a=0;a<l;a++)if(golem(G[a][k]))voisinsCases(G,a,k).forEach(([x,y])=>{
    const P=[[a,k],[x,y]].sort((A,B)=>A[0]*3+A[1]-B[0]*3-B[1]),c=P.join();if(!vu[c]){vu[c]=1;r.push([P[0][0],P[0][1],P[1][0],P[1][1]])}});
  return r;
}
/* Aucun echange possible : une ligne de journal. Sinon attente 'u' : coup 'e' (la paire, dans n'importe quel ordre) ou 'v' (passer).
   haut : les Golems au-dessus qui ont au moins un echange (premier choix de l'interface). */
function meandyou(s,p,l,k,g){
  const J=s.j[p],n=nomDetail(carte(g.c))+' : meandyou';
  nettoie(s);
  if(J.grille[l][k]!==g)return;
  const coups=echangesMeandyou(J.grille,l,k);
  if(!coups.length){dire(s,p,n+', aucun échange possible.');return}
  const haut=[];for(let a=0;a<l;a++)if(coups.some(([x,y,u,v])=>(x===a&&y===k)||(u===a&&v===k)))haut.push([a,k]);
  s.attente={t:'u',p,i:[l,k],coups,haut};
}
/* K-Chan : Love inconditionnel (008e, ou copieur), une fois par manche et par exemplaire (g.love), a son tour apres la Forge :
   un Golem allie blesse (g.d > 0, K-Chan comprise) perd 1 degat, jamais au-dela de sa Force imprimee. Coup 'r' + l k (K-Chan) + m n (cible). Sans blesse : rien. */
function loves(s,p){const r=[],G=s.j[p].grille,bl=[];for(let l=0;l<3;l++)for(let k=0;k<3;k++)if(golem(G[l][k])&&G[l][k].d>0)bl.push([l,k]);if(!bl.length)return r;
  for(let l=0;l<3;l++)for(let k=0;k<3;k++){const g=G[l][k];if(golem(g)&&idEff(g)==='008e'&&g.love!==s.manche)bl.forEach(([m,n])=>r.push({t:'r',l,k,m,n}))}return r}
/* Caramel a volonte (Titom76, 026e) : une fois par manche et par carte, a son tour apres la Forge, +1 energie. */
function caramels(s,p){const r=[],G=s.j[p].grille;for(let l=0;l<3;l++)for(let k=0;k<3;k++){const g=G[l][k];if(g&&idEff(g)==='026e'&&g.car!==s.manche)r.push({t:'z',l,k})}return r}
function choisitFavori(s,p,I,l,k){
  const f=s.j[p].grille[l][k],evo=idEff(I)==='013e';I.fav=f.c;
  dire(s,p,nomDetail(carte(I.c))+' : '+nomDetail(carte(f.c))+' devient son favori (+'+FAV_BONUS[idEff(I)]+' de Force).');
  if(evo)ragebait(s,p,I,l,k);
}
/* Slam : seuls les Golems adverses ciblables (Mode Avion exclu) ayant une case libre adjacente (haut, bas, gauche, droite, jamais en diagonale)
   sont proposes, vers chacune de ces cases. Si aucun n'en a : tout Golem adverse ciblable, [l,k,l,k], il reste en place et perd quand meme 1. */
function slams(s,p){
  const G=s.j[1-p].grille,r=[],place=[];
  for(let l=0;l<3;l++)for(let k=0;k<3;k++)if(G[l][k]&&ciblable(s,1-p,l,k,p)){
    place.push([l,k,l,k]);
    [[l-1,k],[l+1,k],[l,k-1],[l,k+1]].filter(([a,b])=>G[a]&&b>=0&&b<3&&!G[a][b]&&!(b!==k&&estVersus(s,b)&&golemsIci(s,1-p,b))).forEach(([a,b])=>r.push([l,k,a,b])); /* Le Versus : jamais un 2e Golem ici */
  }
  return r.length?r:place;
}
function slam(s,p,c,l,k,m,n){
  const G=s.j[1-p].grille,h=G[l][k],bouge=m!==l||n!==k;if(bouge){G[m][n]=h;G[l][k]=null}
  dire(s,p,'Glad : Slam, '+nomDetail(carte(h.c))+(bouge?' est déplacé':' reste en place (aucune case libre)')+' et perd 1 de Force.');
  blesse(s,1-p,m,n,1,{p,c,lib:'À la pose'});
}
/* Ragebait : 2 degats au Golem adverse en face du favori, effet de carte cible (Mode Avion le protege). */
function ragebait(s,p,I,l,k){
  const h=s.j[1-p].grille[l][k];
  if(!golem(h)){dire(s,p,'Ragebait : aucun Golem en face du favori.');return}
  if(!ciblable(s,1-p,l,k,p)){dire(s,p,'Ragebait : '+nomDetail(carte(h.c))+' est protégé (Mode Avion).');return}
  dire(s,p,'Ragebait : '+nomDetail(carte(h.c))+' perd 2 de Force.');
  blesse(s,1-p,l,k,2,{p,c:I.c,lib:'À la pose'});
}
function agit(s,p,a){
  const J=s.j[p],C=carte(a.c),occ=J.grille[a.l][a.k],cout=coutPose(s,p,a.c,a.l,a.k);
  s.stats.ev.push({t:'p',cp:p,cc:a.c,n:cout,m:s.manche});
  const sur=C.base?elessars(s.j[1-p].grille):0,red=coutCarte(C)+sur-cout; /* 0.2b.2 : surtaxe d'Elessar et reduction de La Boutique annoncees chacune (une evolution peut avoir les deux) */
  if(red>0)declenche(s,s.terrains[a.k].nom,'Coût réduit de '+red+' pour '+nomDetail(C));
  if(sur>0)F.annonceSurtaxe(s,p,C,sur); /* Realisation de l'age */
  if(C.base&&occ.d>0)s.stats.ev.push({t:'r',cp:p,cc:a.c,n:occ.d,y:'evolution'});
  J.energie-=cout;J.aAgi=true;J.main.splice(J.main.indexOf(a.c),1);
  if(C.animal&&REGLAGE_ANIMAUX.attache){occ.ani={c:a.c};dire(s,p,'pose '+C.nom+' sous '+nomDetail(carte(occ.c))+'.');if(C.id==='902')chatsPioche(s,p,'à la pose');return} /* animal attache : sous son maitre, aucune case */
  const g={c:a.c,f:C.force||0,d:0};
  if(C.base){J.defausse.push(occ.c);dire(s,p,'améliore '+nomDetail(carte(occ.c))+' en '+C.nom+'.');if(C.id==='013e'&&occ.fav!==undefined)g.fav=occ.fav;J.grille.forEach(L=>L.forEach(h=>{if(h&&h.fav===occ.c)h.fav=a.c;if(animal(h)&&h.maitre===occ.c)h.maitre=a.c}))} /* 0.2a.1 : le favori survit a l'evolution d'Indra et a la sienne ; l'animal suit son maitre qui evolue */
  else if(C.animal){const[x,y]=maitreVoisin(J.grille,C,a.l,a.k);g.maitre=J.grille[x][y].c;dire(s,p,'pose '+C.nom+'.')} /* lie au maitre voisin (haut, bas, gauche, droite) ; Jacen et Jaina piochent une fois poses (0.4) */
  else if(occ){dire(s,p,'remplace '+nomDetail(carte(occ.c))+' par '+nomDetail(C)+'.');retire(s,p,a.l,a.k,true)} /* remplacement : pas une destruction */
  else dire(s,p,'pose '+nomDetail(C)+'.');
  if(C.base&&REGLAGE_JJ.garde){if(occ.sub)g.sub=occ.sub.slice();if(occ.dr)g.dr=occ.dr.slice()}
  if(C.base&&occ.ani)g.ani=occ.ani; /* animal attache : reste si son maitre evolue */ /* JackJoy, V2 : Sub offert et Draft diff gardes a l'evolution */
  J.grille[a.l][a.k]=g;
  if(C.id==='902')chatsPioche(s,p,'à la pose'); /* Jacen et Jaina : pioche a la pose, une fois sur la grille (deck vide : 1 point a l'adversaire) */
  if(!C.animal)for(const e of effsT(s,a.k))if(e.T.poseIci)e.T.poseIci(e.r,s,p,a.k,C,g,C.base?'evoluer':occ?'remplacer':'poser'); /* terrain (Le Versus, Cirque V2) : avant l'effet de pose de la carte */
  effetPose(s,p,a.l,a.k,g);
}
/* Mignonitude (Kiwi), avant le decompte : pour chaque Kiwi en jeu (premier joueur de la manche d'abord), un Golem au hasard de chaque grille,
   le sien puis l'adverse, ne compte pas au decompte (g.hors = s.manche) ; il reste en jeu. Puis Kiwi part a la defausse.
   Hasard : generateur du joueur de Kiwi (rejeu identique). Grille sans Golem : rien. Renvoie [{p (joueur de Kiwi), q (grille), l, k, c, f}]. */
function mignonitude(s){
  const r=[];Object.defineProperty(r,'partir',{value:[]}); /* kiwiApres : departs differes apres le decompte (propriete non enumerable : hors JSON et hors comparaisons) */
  [s.premier,1-s.premier].forEach(p=>{
    const J=s.j[p];
    for(let l=0;l<3;l++)for(let k=0;k<3;k++){
      const H=J.grille[l][k],A=animal(H)&&carte(H.c).id==='901'?H:golem(H)&&H.ani&&carte(H.ani.c).id==='901'?H.ani:null;if(!A)continue; /* Kiwi sur sa case, ou attache sous son maitre */
      [p,1-p].forEach(q=>{
        const cs=[];s.j[q].grille.forEach((L,a)=>L.forEach((g,b)=>{if(golem(g)&&g.hors!==s.manche)cs.push([a,b])}));
        if(!cs.length){dire(s,p,'Kiwi : Mignonitude, aucun Golem '+(q===p?'dans sa grille':'dans la grille adverse')+'.');return}
        const[a,b]=cs[Math.floor(alea(s.rng,p)*cs.length)],g=s.j[q].grille[a][b],f=forceDe(s,q,a,b),n=nomDetail(carte(g.c));
        g.hors=s.manche;r.push({p,q,l:a,k:b,c:g.c,f});
        s.stats.ev.push({t:'h',sp:p,sc:A.c,cp:q,cc:g.c,n:f,m:s.manche});declenche(s,'Mignonitude',n+(q===p?'':' (adverse)')+' ne compte pas');
        dire(s,p,'Kiwi : Mignonitude, '+n+(q===p?'':' (adverse)')+' ne compte pas au décompte.');
      });
      const part=()=>{J.defausse.push(A.c);if(A===H)J.grille[l][k]=null;else delete H.ani;dire(s,p,'Kiwi part à la défausse.')};
      if(REGLAGE_ANIMAUX.kiwiApres)r.partir.push(part);else part();
    }
  });
  return r;
}
function decompte(s){
  const debut=s.log.length,exclus=mignonitude(s),cols=colonnes(s),gagnants=[];
  noteBonus(s);
  s.forceTotale=[0,1].map(p=>cols.reduce((t,c)=>t+c[p],0));
  cols.forEach((c,k)=>{
    const T=s.terrains[k],ET=effsT(s,k),w=gagnantColonne(s,k,c),pts=ptsTerrain(s,k); /* Le Cirque : la plus petite Force ; Le Tournoi : 1, 2, 3 */
    for(const e of ET)if(e.T.statsDecompte)e.T.statsDecompte(e.r,s,k,c,w,T); /* statistiques propres au terrain (Cirque, Versus, Karaoke, Pronos) */
    const bl=ET.some(e=>e.T.bloque&&e.T.bloque(e.r,s)); /* La Salle Verrouillee : ne marque pas encore */
    s.stats.t.push({manche:s.manche,terrain:T.nom,k,gagnant:bl?null:w,forces:c.slice(),points:bl||w===null?0:pts});
    if(bl){gagnants.push(null);dire(s,null,T.nom+' : '+c[0]+' contre '+c[1]+', ne marque pas encore.');return}
    gagnants.push(w);
    if(w!==null)for(let l=0;l<3;l++){const g=s.j[w].grille[l][k];if(golem(g)&&g.hors!==s.manche)s.stats.ev.push({t:'a',cp:w,cc:g.c,n:forceDe(s,w,l,k)})}
    if(w===null)dire(s,null,T.nom+' : égalité '+c[0]+' partout.');
    else{s.j[w].score+=pts;dire(s,w,'marque '+T.nom+' ('+c[w]+' contre '+c[1-w]+') : +'+pts+'.')}
  });
  (s.resultats||(s.resultats=[])).push(gagnants.slice()); /* Bellock/Loxim : resultat de chaque terrain a chaque manche (null : egalite, ou Salle Verrouillee avant la manche 3) */
  s.dernier={colonnes:cols,gagnants,ecran:null,exclus};
  exclus.partir.forEach(f=>f()); /* kiwiApres : Kiwi part juste apres le decompte */
  s.reperes.push([debut,s.log.length,s.log.length]); /* debut du decompte, debut des effets, fin des effets */
  return gagnants;
}
function effetsGolems(s,p,gagnants){
  const J=s.j[p],pk=s.terrains.map((_,k)=>ptsTerrain(s,k)),min=Math.min(...pk); /* Le Tournoi : sa valeur de la manche ; Les Pronos : 1 (mises a part) */
  const remporte=gagnants.some((w,k)=>w===p&&pk[k]===min);
  for(let l=0;l<3;l++)for(let k=0;k<3;k++){
    const g=J.grille[l][k];if(!g)continue;
    for(const e of effs(idEff(g)))if(e.T.finManche)e.T.finManche(e.r,s,p,l,k,g,J,remporte); /* Perte de fin de manche, Palmares */
  }
}
/* Un terrain pour un joueur. Carrousel et Buzzer peuvent mettre la fin de manche en attente d'un choix. */
function effetTerrain(s,p,k,gagnants){
  const J=s.j[p],gagne=gagnants[k]===p;
  for(const e of effsT(s,k))if(e.T.finManche)e.T.finManche(e.r,s,p,k,gagnants,J,gagne);
}
/* File des effets, gardee dans l'etat : le choix d'un joueur la reprend au meme endroit. */
function finManche(s){
  const gagnants=decompte(s);s.fil={gagnants,etapes:[]};
  [s.premier,1-s.premier].forEach(p=>{
    s.fil.etapes.push({p,k:null});
    const ordre=s.premier===0?[0,1,2]:[2,1,0];
    ordre.sort((a,b)=>aPropT(s,a,'enDernier')-aPropT(s,b,'enDernier')); /* Le Buzzer passe en dernier */
    ordre.forEach(k=>s.fil.etapes.push({p,k}));
  });
  deroule(s);
}
function deroule(s){
  while(s.fil.etapes.length){
    const e=s.fil.etapes.shift();s.stats.cause=null;
    if(e.k===null)effetsGolems(s,e.p,s.fil.gagnants);else effetTerrain(s,e.p,e.k,s.fil.gagnants);
    nettoie(s);
    if(s.attente)return;
  }
  s.fil=null;
  const ec=s.dernier.ecran;if(ec)ec.main=s.j[1-ec.p].main.slice();
  s.reperes[s.reperes.length-1][2]=s.log.length;
  if(s.manche===3){
    const [a,b]=[s.j[0].score,s.j[1].score],[x,y]=s.forceTotale;
    /* 0.2.1 : points, puis Force totale, puis terrains conquis sur la partie, puis le second joueur de la manche 3. Jamais de nul. */
    const tc=[0,1].map(p=>s.stats.t.filter(t=>t.gagnant===p).length),[u,w]=tc,sec=1-s.premier;
    const dep=a!==b?false:x!==y?'force':u!==w?'terrains':'second';
    s.fin={gagnant:a!==b?(a>b?0:1):x!==y?(x>y?0:1):u!==w?(u>w?0:1):sec,scores:[a,b],terrains:tc,departage:dep};
    s.phase='fin';return;
  }
  if(finDraft(s))nettoie(s); /* JackJoy : Draft diff expire (un Golem peut en mourir) */
  s.manche++;s.tour=1;s.premier=1-s.premier;s.joueur=s.premier;
  debutTour(s);
}
function passe(s){
  if(s.joueur===s.premier){s.joueur=1-s.premier;debutTour(s);return}
  if(s.tour===3){finManche(s);return}
  s.tour++;s.joueur=s.premier;debutTour(s);
}
function vues(s){
  [0,1].forEach(p=>{const v=s.stats.vues[p],l=s.j[p].main.concat(s.attente&&s.attente.p===p&&!s.attente.adv&&s.attente.options||[]);
    l.forEach(c=>{if(!v.includes(c))v.push(c)})});
}
function applique(s,p,a){
  if(a&&a.t==='e'&&a.a&&a.b&&s.attente&&s.attente.t==='u'&&a.a[0]*3+a.a[1]>a.b[0]*3+a.b[1])a={t:'e',a:a.b,b:a.a}; /* Shifukuro : meandyou, paire remise dans l'ordre de lecture */
  const c=code(a);
  if(a.t==='a')return abandonne(s,p);
  if(!legales(s,p).some(x=>code(x)===c))throw new Error('action interdite '+c);
  const J=s.j[p];
  vues(s);
  s.stats.cause=a.t==='p'?{p,c:a.c,lib:'Pose'}:a.t==='e'?{p,c:null,lib:'Oracle des Stats'}:null; /* actions de terrain : cause posee par leur fichier d'effets */
  if(a.t==='m'){
    a.c.slice().sort((x,y)=>x-y).forEach(i=>{J.main.splice(J.main.indexOf(i),1);J.deck.push(i)});
    melange(s.rng,p,J.deck);pioche(s,p,a.c.length);
    s.mull[p]=true;
    if(s.mull[0]&&s.mull[1]){s.phase='jeu';debutTour(s)}
  }else if(a.t==='f'){
    J.main.splice(J.main.indexOf(a.c),1);J.forge.push(a.c);J.energie++;J.aForge=true;J.etapeForge=J.eclair>0&&J.main.length>0;dire(s,p,'forge une carte.'); /* l'etape continue s'il reste une Forge eclair */
    forgee(s,p,a.c,true); /* « si tu forges cette carte », Draft diff */
  }else if(ACT[a.t])ACT[a.t].applique(s,p,a,J); /* actions declarees par les fichiers d'effets (Forge eclair...) */
  else if(a.t==='n')J.etapeForge=false;
  else if(a.t==='p')agit(s,p,a);
  else if(a.t==='s'){ /* Pas de +1 d'energie ce tour : ce n'est pas l'etape de Forge */
    J.main.splice(J.main.indexOf(a.c),1);J.forge.push(a.c);s.attente=null;dire(s,p,'Trigas : place 1 carte dans sa Forge.');
    forgee(s,p,a.c,false); /* le Spam compte comme forger */
  }
  else if(a.t==='l'){const A=s.attente;s.attente=null;donneJJ(s,p,A,a.l,a.k);suiteJJ(s,p,A.file)} /* JackJoy : cible choisie, puis la suite */
  else if(a.t==='c'){ /* Le Q : Jour de peche, la carte choisie va a la defausse adverse, l'autre reste sur le deck adverse */
    const K=s.j[1-p],src=s.attente.src||'Le Q : Jour de pêche';K.deck.splice(K.deck.indexOf(a.c),1);s.attente=null;
    K.defausse.push(a.c);dire(s,p,src+', défausse '+nomDetail(carte(a.c))+' du deck adverse et replace l\'autre carte dessus.');
  }else if(a.t==='v'){ /* Oracle sans echange possible, ou meandyou refuse (Shifukuro) */
    if(s.attente&&s.attente.t==='u'){const [il,ik]=s.attente.i,I=J.grille[il][ik];declenche(s,'meandyou','Refusé');dire(s,p,(I?nomDetail(carte(I.c)):'meandyou')+' : meandyou, pas d\'échange.')}
    s.attente=null;
  }
  else if(a.t==='g'){
    const [il,ik]=s.attente.i,I=J.grille[il][ik];s.attente=null;
    if(I&&J.grille[a.l][a.k]){s.stats.cause={p,c:I.c,lib:'À la pose'};choisitFavori(s,p,I,a.l,a.k);nettoie(s)}
  }
  else if(a.t==='k'){ /* Deguisement : copie du voisin choisi, puis son effet de pose s'il en a un */
    const [il,ik]=s.attente.i,I=J.grille[il][ik];s.attente=null;
    if(I){s.stats.cause={p,c:I.c,lib:'À la pose'};copie(s,p,il,ik,I,a.l,a.k)}
  }
  else if(a.t==='i'){ /* Velnen : Imitation, copie du Golem adverse en face (puis son effet de pose s'il en a un) ou refus */
    const [il,ik]=s.attente.i,I=J.grille[il][ik],h=s.j[1-p].grille[il][ik];s.attente=null;
    if(I){s.stats.cause={p,c:I.c,lib:'À la pose'};
      if(a.o&&golem(h))copie(s,p,il,ik,I,il,ik,1-p);
      else{I.cp=null;declenche(s,'Imitation','Refusée');dire(s,p,nomDetail(carte(I.c))+' : Imitation refusée, ne copie rien.')}}
  }
  else if(a.t==='r'){ /* K-Chan : Love inconditionnel, 1 degat retire, une fois par manche et par exemplaire */
    const g=J.grille[a.l][a.k],h=J.grille[a.m][a.n];g.love=s.manche;h.d--;
    s.stats.ev.push({t:'r',cp:p,cc:h.c,n:1,y:'love',sp:p,sc:g.c,m:s.manche});declenche(s,'Love inconditionnel','Soigne '+nomDetail(carte(h.c)));
    dire(s,p,nomDetail(carte(g.c))+' : Love inconditionnel, '+nomDetail(carte(h.c))+' récupère 1 de Force.');
  }
  else if(a.t==='z'){ /* Caramel a volonte : +1 energie, une fois par manche */
    const g=J.grille[a.l][a.k];g.car=s.manche;J.energie++;declenche(s,'Caramel à volonté','+1 énergie');
    dire(s,p,nomDetail(carte(g.c))+' : Caramel à volonté, +1 énergie.');
  }
  else if(a.t==='h'){
    const [il,ik]=s.attente.i,I=J.grille[il][ik];s.attente=null;
    s.stats.cause={p,c:I?I.c:null,lib:'À la pose'};slam(s,p,I?I.c:null,a.l,a.k,a.m,a.n);nettoie(s);
  }
  else if(a.t==='e'&&s.attente&&s.attente.t==='u'){ /* Shifukuro : meandyou, echange de cases. Pas une pose : degats gardes, aucun effet a la pose */
    const [il,ik]=s.attente.i,I=J.grille[il][ik],G=J.grille,[x,y]=a.a,[u,v]=a.b,A=G[x][y],B=G[u][v];s.attente=null;
    s.stats.cause={p,c:I?I.c:null,lib:'À la pose'};G[x][y]=B;G[u][v]=A;declenche(s,'meandyou','Échange 2 Golems');
    dire(s,p,(I?nomDetail(carte(I.c)):'meandyou')+' : meandyou, échange '+nomDetail(carte(A.c))+' et '+nomDetail(carte(B.c))+'.');nettoie(s);
  }
  else if(a.t==='e'){
    const G=J.grille,[x,y]=a.a,[u,v]=a.b;
    [G[x][y],G[u][v]]=[G[u][v],G[x][y]];s.attente=null;
    dire(s,p,'échange 2 Golems.');nettoie(s);
  }else if(a.t==='b'){
    J.deck.splice(0,a.o.length,...a.o);s.attente=null;deroule(s);
  }else if(a.t==='x'){
    s.stats.tours.push({manche:s.manche,tour:s.tour,joueur:p,energieGaspillee:J.energie,pose:J.aAgi});
    J.energie=0;dire(s,p,'finit son tour.');
    for(const T of TYPES_AVEC('finTour'))T.finTour(s,p,J); /* reprises de Forge eclair */
    if(J.main.length>7)s.attente={t:'d',p};else passe(s);
  }else if(a.t==='d'){
    J.main.splice(J.main.indexOf(a.c),1);J.defausse.push(a.c);
    if(s.attente.src){dire(s,p,s.attente.src+' : défausse '+nomDetail(carte(a.c))+'.');s.attente=null;deroule(s)}
    else if(J.main.length<=7){s.attente=null;passe(s)}
  }
  vues(s);
  return s;
}
/* 0.2.2 : abandon de p, a tout moment avant la fin ; victoire de l'adversaire, scores gardes. Jamais propose par legales (ni au robot). */
function abandonne(s,p){
  if(s.fin)throw new Error('action interdite a');
  if(p!==0&&p!==1)throw new Error('joueur inconnu');
  dire(s,p,'abandonne la partie.');
  const tc=[0,1].map(q=>s.stats.t.filter(t=>t.gagnant===q).length);
  s.attente=null;s.fil=null;
  s.fin={gagnant:1-p,scores:[s.j[0].score,s.j[1].score],terrains:tc,departage:false,abandon:p};
  s.phase='fin';return s;
}
function attendus(s){
  if(s.fin)return [];
  if(s.phase==='mulligan')return [0,1].filter(p=>!s.mull[p]);
  return [s.attente?s.attente.p:s.joueur];
}
/* Journal numerote : "1:m02 2:f3 3:x". Illisible ou trou : exception. */
const ecritJournal=l=>l.map((e,i)=>(i+1)+':'+e).join(' ');
function litJournal(t){
  if(!t)return [];
  return t.split(' ').map((e,i)=>{const m=/^(\d+):(.+)$/.exec(e);
    if(!m||+m[1]!==i+1)throw new Error('journal mal numéroté');return m[2]});
}
/* Rejoue tout. Les entrees en avance attendent leur tour. */
function rejoue(graine,journaux,decks){
  const s=nouvelle(graine,decks),i=[0,0];
  let avance=true;
  try{
    while(avance){avance=false;
      for(const p of attendus(s)){
        if(i[p]<journaux[p].length){applique(s,p,decode(journaux[p][i[p]]));i[p]++;avance=true}
      }
      /* 0.2.2 : un abandon (hors tour) passe quand plus rien d'autre n'avance */
      if(!avance&&!s.fin)for(const p of [0,1])if(!s.fin&&journaux[p][i[p]]==='a'){applique(s,p,{t:'a'});i[p]++;avance=true}
    }
  }catch(e){return {etat:s,erreur:e.message,lus:i}}
  return {etat:s,erreur:null,lus:i};
}
/* Bilan par joueur, par carte et par terrain. Les degats sur son propre camp sont a part (auto).
   Bonus : comptes a chaque decompte de fin de manche. */
function bilan(s){
  const J=[0,1].map(()=>({degats:0,morts:0,subis:0,mortsSubies:0,auto:0,soins:0,piochesManquees:0,pointsDeckVide:0,cartes:{}})),autres={},hors=[];
  const ligne=(p,c)=>{const n=nomDetail(carte(c));return J[p].cartes[n]||(J[p].cartes[n]={carte:n,poses:0,coutPaye:0,manches:[],degats:0,subis:0,morts:0,mortsSubies:0,auto:0,recuperes:0,soinsDonnes:0,forceTerrains:0,
    bonusRecus:{voisins:0,trait:0,cercle:0,favori:0},bonusDonnes:{voisins:0,trait:0,cercle:0,favori:0},sources:{}})};
  s.stats.ev.forEach(e=>{
    if(e.t==='jj')return; /* 0.4 : pioche de Jacen et Jaina, sans carte ni source (en 0.3, bilan plantait des que les chats avaient pioche) */
    if(e.t==='dv'){J[e.cp].piochesManquees+=1;J[1-e.cp].pointsDeckVide+=e.n;return} /* deck vide : cartes non piochees, points donnes a l'adversaire */
    if(e.t==='p'){const r=ligne(e.cp,e.cc);r.poses++;r.coutPaye+=e.n;r.manches.push(e.m);if(estAnimal(e.cc))r.animal=true;return}
    if(e.t==='a'){ligne(e.cp,e.cc).forceTerrains+=e.n;return}
    if(e.t==='r'){ligne(e.cp,e.cc).recuperes+=e.n;if(e.y==='love'){ligne(e.sp,e.sc).soinsDonnes+=e.n;J[e.sp].soins+=e.n}return} /* K-Chan : soins donnes */
    if(e.t==='h'){const v=ligne(e.cp,e.cc),A=ligne(e.sp,e.sc);v.horsDecompte=(v.horsDecompte||0)+1;A.mignonitude=(A.mignonitude||0)+1;A.animal=true;
      hors.push({manche:e.m,joueur:e.sp,grille:e.cp,carte:v.carte,force:e.n});return} /* Mignonitude : cles ajoutees seulement si elles servent */
    if(e.t==='b'){const R=ligne(e.p,e.r).bonusRecus;R[e.y]=(R[e.y]||0)+1;if(e.dp===e.p&&e.d===e.r)return;const D=ligne(e.dp,e.d).bonusDonnes;D[e.y]=(D[e.y]||0)+1;return} /* cle 'survolte' ajoutee seulement si elle sert ; Survolte qui se compte lui-meme ne se donne rien */
    const d=e.t==='d',v=ligne(e.cp,e.cc),lib=e.lib+(e.ch?' (en chaîne)':'')+(e.sp===e.cp?' (son camp)':'');
    if(d){v.subis+=e.n;J[e.cp].subis+=e.n}else{v.mortsSubies++;J[e.cp].mortsSubies++}
    if(e.sc===null||e.sc===undefined){const o=autres[lib]||(autres[lib]={source:lib,joueur:e.sp,morts:0});o.morts++;return}
    const r=ligne(e.sp,e.sc),q=r.sources[lib]||(r.sources[lib]={source:lib,degats:0,morts:0});
    if(d)q.degats+=e.n;else q.morts++;
    if(e.sp!==e.cp){if(d){r.degats+=e.n;J[e.sp].degats+=e.n}else{r.morts++;J[e.sp].morts++}}
    else if(d){r.auto+=e.n;J[e.sp].auto+=e.n}
  });
  const terrains=s.stats.t.map(({manche,terrain,gagnant,forces,points})=>{
    const a=s.stats.act.filter(x=>x.m===manche&&x.nom===terrain).map(x=>x.e);
    return {manche,terrain,points,gagnant,forces,declenchements:a.length,effets:a};
  });
  const poses=[new Set(),new Set()];s.stats.ev.forEach(e=>{if(e.t==='p')poses[e.cp].add(e.cc)});
  const joueurs=J.map((j,p)=>({...j,cartes:Object.values(j.cartes).map(c=>({...c,sources:Object.values(c.sources)})),
    vuesNonPosees:s.stats.vues[p].filter(c=>!poses[p].has(c)).map(c=>nomDetail(carte(c)))}));
  const P=POIDS_MVP;let mvp=null;
  if(s.fin&&s.fin.gagnant!==null)joueurs[s.fin.gagnant].cartes.forEach(c=>{if(c.animal)return; /* un animal n'est jamais MVP */
    const bonus=c.bonusDonnes.voisins+c.bonusDonnes.trait+c.bonusDonnes.cercle+c.bonusDonnes.favori+(c.bonusDonnes.survolte||0)+(c.bonusDonnes.kekwait||0)+(c.bonusDonnes.doubleup||0)+(c.bonusDonnes.draft||0)+(c.bonusDonnes.general||0)+(c.bonusDonnes.adjacence||0); /* GeneralBrioche */ /* Spom, Shifukuro, Bellock/Loxim, JackJoy */
    const score=c.forceTerrains*P.force+bonus*P.bonus+c.degats*P.degats+c.morts*P.morts;
    if(!mvp||score>mvp.score)mvp={carte:c.carte,joueur:s.fin.gagnant,score,force:c.forceTerrains,bonus,degats:c.degats,morts:c.morts};
  });
  /* 0.4 : cause de la fin (abandon ou points) et perdant, pour le bilan et l'Historique ; plus de fin par deck vide */
  const F=s.fin,fin=!F?null:F.abandon!==undefined?{cause:'abandon',perdant:F.abandon}:{cause:'points',perdant:F.gagnant===null?null:1-F.gagnant};
  return {joueurs,autres:Object.values(autres),terrains,tours:s.stats.tours,mvp,mignonitude:hors,fin};
}
/* Robot : deterministe, ne regarde que ce qu'un joueur voit (sa main, les grilles, les options proposees). */
function simule(s,f){
  const c={...s,j:s.j.map(J=>({...J,grille:J.grille.map(L=>L.map(g=>g&&{...g}))}))};
  f(c);
  for(let n=1;n;){n=0;
    const m=[];for(let p=0;p<2;p++)for(let l=0;l<3;l++)for(let k=0;k<3;k++)if(golem(c.j[p].grille[l][k])&&forceDe(c,p,l,k)<=0)m.push([p,l,k]);
    m.forEach(([p,l,k])=>{c.j[p].grille[l][k]=null;n++});
  }
  return c;
}
/* Robot et nouveaux terrains : ecart vu par p (Le Cirque : inverse, +-3 si un seul camp a des Golems), valeur du terrain (Le Tournoi : manche ; Les Pronos : 1 + mises),
   L'Ecole : 1 point de plus ou de moins si le perdant a un deck vide. Anciens terrains : calcul inchange. */
function ecart(s,c,k,p){
  for(const e of effsT(s,k))if(e.T.ecart){const d=e.T.ecart(e.r,s,c,k,p);if(d!==undefined)return d}
  return c[p]-c[1-p];
}
const ptsRobot=(s,k)=>{const e=effsT(s,k).find(e=>e.T.ptsRobot);return e?e.T.ptsRobot(e.r,s):ptsTerrain(s,k)};
const ecoleVide=(s,p,k,d)=>{const e=effsT(s,k).find(e=>e.T.robotBonus);return e?e.T.robotBonus(e.r,s,p,k,d):0};
/* Actions de terrain du robot en fin de tour (Les Pronos : mise). */
function pronoRobot(s,p,l){for(const T of TYPES_AVEC('robotFin')){const a=T.robotFin(s,p,l);if(a)return a}return null}
function valeurForte(s,p){
  const J=s.j[p];let v=0;
  colonnes(s).forEach((c,k)=>{
    const T=s.terrains[k],d=ecart(s,c,k,p),reste=3-s.manche;
    const e=effsT(s,k).find(e=>e.T.ptsFort),pts=e?e.T.ptsFort(e.r,s):ptsRobot(s,k); /* La Salle Verrouillee */
    v+=pts*(d>0?1:d===0?.3:0)+.15*Math.max(-7,Math.min(7,d))+ecoleVide(s,p,k,d);
  });
  return v;
}
function valeur(s,p){
  if(s.fort)return valeurForte(s,p);
  return colonnes(s).reduce((t,c,k)=>{
    const e=effsT(s,k).find(e=>e.T.coefRobot),pts=ptsRobot(s,k)*(e?e.T.coefRobot(e.r,s):1),d=ecart(s,c,k,p); /* La Salle Verrouillee */
    return t+pts*(d>0?1:d===0?.3:0)+.06*Math.max(-6,Math.min(6,d));
  },0);
}
function utilite(s,p,c){
  const J=s.j[p],C=carte(c);
  if(interditManche(C,s))return 0;
  if(C.animal){const nv=REGLAGE_ANIMAUX.cout===0||REGLAGE_ANIMAUX.element||REGLAGE_ANIMAUX.attache;return J.grille.some(L=>L.some(g=>estMaitreDe(g,C)&&!g.ani))?(nv?5:3):J.main.some(q=>carte(q).id===C.maitre)?(nv?4:2):(nv?1:.5)} /* Kiwi : utile si son maitre est en jeu ou en main ; animaux jouables : plus utile, il ne coute rien */
  if(C.base){
    const base=q=>carte(q).id===C.base,enJeu=J.grille.some(L=>L.some(g=>g&&base(g.c)));
    return (enJeu?6:J.main.some(base)?3:1)-.5*elessars(s.j[1-p].grille); /* Elessar : evolution plus chere tant qu'un Elessar adverse est en jeu */
  }
  return 5-C.cout*.5;
}
const parUtilite=(s,p,l)=>l.slice().sort((a,b)=>utilite(s,p,b)-utilite(s,p,a)||a-b);
/* Robot : deck vide. Pioches obligatoires de p d'ici la fin de la partie (debuts de tour a venir, tour en cours exclu), avec g Graines de Golem en jeu.
   La partie va toujours jusqu'au dernier tour de la manche 3 et aucune carte ne revient dans le deck : au-dela, chaque pioche donne 1 point a l'adversaire. */
function piochesAVenir(s,p,g){
  let n=0;
  for(let m=s.manche;m<=3;m++){const pr=s.premier^((m-s.manche)&1);
    for(let t=m===s.manche?s.tour:1;t<=3;t++){if(m===s.manche&&t===s.tour&&(p===s.joueur||p===pr))continue;n+=(t===1&&p!==pr?1:2)+g}}
  return n;
}
/* Effet de pose id (Spam, Jacen et Jaina, La Bretagne, Graine de Golem) joue par p : valeur en points de deck vide. Pioches manquees en plus pour p
   (tout de suite, puis aux debuts de tour a venir), comptees en moins ; pioches manquees en plus pour l'adversaire (La Bretagne), comptees en plus.
   gr : Golems Brume ou Foudre de chaque grille apres la pose (La Bretagne) ; g : Graines de Golem de p apres la pose. Le robot ne voit que la taille des decks. */
const PIOCHE_POSE={'007':1,'902':1};
function risqueDeck(s,p,id,gr,g){
  const D=[s.j[0].deck.length,s.j[1].deck.length],moi=PIOCHE_POSE[id]||(id==='026'?Math.min(3,gr[p]):0),lui=id==='026'?Math.min(3,gr[1-p]):id==='004'&&D[1-p]>0?1:0; /* Le Q : Jour de peche, 1 carte adverse en moins (risque en points) */
  const g0=graines(s.j[p].grille),ga=graines(s.j[1-p].grille);
  const manque=(q,n,gq,gq0)=>Math.max(0,n-D[q])+Math.max(0,piochesAVenir(s,q,gq)-Math.max(0,D[q]-n))-Math.max(0,piochesAVenir(s,q,gq0)-D[q]);
  return POINT_DECK_VIDE*(manque(1-p,lui,ga,ga)-manque(p,moi,g,g0));
}
const bretons=(c,q)=>c.j[q].grille.flat().filter(h=>h&&BRETON(h.c)).length;
function gainCoup(s,p,a,v0){
  const f=c=>{const G=c.j[p].grille;
    if(a.t==='p'){
      const C=carte(a.c);
      if(C.animal&&REGLAGE_ANIMAUX.attache){G[a.l][a.k].ani={c:a.c};return} /* animal attache : +1 a son maitre */
      const old=G[a.l][a.k];G[a.l][a.k]={c:a.c,f:C.id==='002'?3.5:C.id==='002e'?6.4:C.force,d:0};
      if(C.id==='013e'&&old&&old.fav!==undefined)G[a.l][a.k].fav=old.fav;
      if(C.base&&old)G.forEach(L=>L.forEach(h=>{if(h&&h.fav===old.c)h.fav=a.c}));
      if(!C.animal)for(const e of effsT(s,a.k))if(e.T.estimePose)e.T.estimePose(e.r,c,p,a); /* terrain (Le Versus) */
      if(C.id==='001e')c.j[1-p].grille[a.l].forEach((g,q)=>{if(ciblable(c,1-p,a.l,q,p)&&idEff(g)!=='009e')g.d++});
      if(C.id==='029')gambaEstime(c,p,a.l,a.k);
      if(C.id==='018e')extinctionEstime(c,p); /* Elessar */
      if(C.id==='004e')ilSuffitEstime(c,p); /* Le Q : Il suffit, simule retire ensuite les morts en chaine */
    }else if(ACT[a.t]&&ACT[a.t].estime)ACT[a.t].estime(c,p,a,G,s); /* actions des fichiers d'effets (Vaisseau, Faille, tarte du Cirque) */
    else if(a.t==='e'){const[x,y]=a.a,[u,w]=a.b,q=G[x][y];G[x][y]=G[u][w];G[u][w]=q}
    else if(a.t==='h'){const H=c.j[1-p].grille,h=H[a.l][a.k];if(a.m!==a.l||a.n!==a.k){H[a.m][a.n]=h;H[a.l][a.k]=null}if(idEff(h)!=='009e')h.d++}
  };
  const apres=simule(s,f);let g=valeur(apres,p)-v0;
  if(a.t==='p'&&carte(a.c).id==='029e'){ /* la meilleure copie possible depuis cette case */
    const cs=apres.j[p].grille[a.l][a.k]?voisinsCases(apres.j[p].grille,a.l,a.k):[];
    if(cs.length)g=Math.max(...cs.map(([x,y])=>gainCopie(apres,p,a.l,a.k,idEff(apres.j[p].grille[x][y]))))-v0;
  }
  if(a.t==='p'&&carte(a.c).id==='041e'){ /* Velnen : Imitation, la meilleure option (copier ou refuser) */
    const h=apres.j[1-p].grille[a.l][a.k];
    if(apres.j[p].grille[a.l][a.k]&&golem(h)&&ciblable(apres,1-p,a.l,a.k,p)&&idEff(h))g=Math.max(valeurImitation(apres,p,a.l,a.k,idEff(h)),gainCopie(apres,p,a.l,a.k,null))-v0;
  }
  if(a.t==='p'&&carte(a.c).id==='025e'&&apres.j[p].grille[a.l][a.k])g+=Math.max(0,gainEchange(apres,p,a.l,a.k)); /* Shifukuro : meandyou, le meilleur echange s'il est utile */
  if(a.t==='p'&&DUO[carte(a.c).id]&&apres.j[p].grille[a.l][a.k]&&duoVoisin(apres.j[p].grille,a.l,a.k,DUO[carte(a.c).id]))g+=.25; /* Bellock/Loxim : vise Double up ? (deja compte dans la Force si une evolution en profite) */
  if(a.t==='p'&&carte(a.c).id==='026'){const n=[p,1-p].map(q=>Math.min(3,s.j[q].grille.flat().filter(h=>h&&BRETON(h.c)).length+(q===p?1:0)));g+=.25*Math.min(n[0],s.j[p].deck.length)-.15*Math.min(n[1],s.j[1-p].deck.length)}
  if(a.t==='p'&&carte(a.c).id==='026e')g+=.4;
  if(a.t==='p'&&carte(a.c).id==='901')g+=mignonEstime(apres,p)-.05;if(a.t==='p'&&carte(a.c).id==='902')g+=(s.j[p].deck.length?.5:0)-.05; /* Jacen et Jaina : 1 carte piochee */ /* Kiwi : Mignonitude estimee sur le plateau actuel, moins la case occupee */
  if(a.t==='p'&&carte(a.c).id==='018')g+=elessarEstime(s,p); /* Elessar : Realisation de l'age gagnee */
  if(a.t==='p'&&carte(a.c).id==='018e')g-=elessarEstime(s,p); /* Elessar : Realisation de l'age perdue en evoluant */
  if(a.t==='p'&&(carte(a.c).id==='041'||carte(a.c).id==='041e')){const r=9-((s.manche-1)*3+s.tour);g+=(carte(a.c).id==='041'?1:-1)*.08*Math.min(4,r)} /* Velnen : Graine de Golem, cartes en plus aux tours suivants (perdue en evoluant) */
  if(a.t==='p'&&carte(a.c).id==='035e'){const r=9-((s.manche-1)*3+s.tour);g+=.1*Math.min(4,r)} /* JackJoy : Draft diff aux Forges suivantes */
  if(a.t==='p'&&carte(a.c).id==='036'&&s.manche*3+s.tour<12)g+=.3;
  if(a.t==='p'&&apres.j[p].grille[a.l][a.k]&&!COPIEURS[carte(a.c).id])g+=risqueDeck(s,p,carte(a.c).id,[0,1].map(q=>bretons(apres,q)),graines(apres.j[p].grille)); /* 0.4 : deck vide (copieurs : dans gainCopie) */ /* Forge eclair aux tours suivants (rien apres le dernier tour) */
  if(ACT[a.t]&&ACT[a.t].gainRobot)g+=ACT[a.t].gainRobot(s,p,a,apres); /* tarte du Cirque qui tue */
  if(a.t==='p'){g-=.03*coutPose(s,p,a.c,a.l,a.k);if(carte(a.c).id==='004'&&s.j[1-p].deck.length)g+=.25;if(carte(a.c).id==='007')g+=.3;if(FAV_BONUS[carte(a.c).id]&&s.j[p].grille.some(L=>L.some(Boolean)))g+=.3;if(carte(a.c).id==='009'&&slams(s,p).length)g+=.3}
  return g;
}
/* Kiwi : esperance de la valeur du plateau sur tous les tirages de Mignonitude (1 Golem par grille), moins la valeur sans tirage.
   Estimation sur le plateau actuel, sans regarder le hasard. */
function mignonEstime(c,p){
  const cs=[0,1].map(q=>{const r=[];c.j[q].grille.forEach((L,a)=>L.forEach((g,b)=>{if(golem(g))r.push([a,b])}));return r.length?r:[null]});
  const v0=valeur(c,p);let t=0,n=0;
  cs[0].forEach(x=>cs[1].forEach(y=>{
    const d={...c,j:c.j.map(J=>({...J,grille:J.grille.map(L=>L.map(g=>g&&{...g}))}))};
    if(x)d.j[0].grille[x[0]][x[1]].hors=d.manche;if(y)d.j[1].grille[y[0]][y[1]].hors=d.manche;
    t+=valeur(d,p);n++}));
  return t/n-v0;
}
/* esperances, sans regarder les des ni le deck.
 Gamba : 1 chance sur 3 de -2 pour soi, 1 sur 3 de -2 en face. */
function gambaEstime(c,p,l,k){
  const G=c.j[p].grille[l][k];G.d+=2/3;
  const h=c.j[1-p].grille[l][k];if(h&&ciblable(c,1-p,l,k,p)&&idEff(h)!=='009e')h.d+=2/3;
}
/* Valeur d'une copie pour le Maitre du deguisement en (l,k) dans l'etat c (deja simule) : effets passifs par la Force, effets de pose estimes. */
/* Elessar : Extinction du feu estimee (Golems Magma adverses ciblables -1, Menfou palu exclu ; simule retire les morts).
   Realisation de l'age : petit bonus si l'adversaire jouera encore, selon ses Golems de base en jeu qui ont une evolution (seule information visible :
   le robot ne regarde ni la main ni le deck adverses). */
/* Le Q : Il suffit estime (copie du plateau) : les Golems detruits quittent les grilles, Mode Avion adverse garde. */
function ilSuffitEstime(c,p){doublons(c,p).T.forEach(x=>{c.j[x.q].grille[x.l][x.k]=null})}
function extinctionEstime(c,p){const G=c.j[1-p].grille;for(let a=0;a<3;a++)for(let b=0;b<3;b++){const h=G[a][b];if(golem(h)&&carte(h.c).el.includes('magma')&&ciblable(c,1-p,a,b,p)&&idEff(h)!=='009e')h.d++}}
function elessarEstime(s,p){
  if(s.manche===3&&s.tour===3&&s.joueur!==s.premier)return 0; /* dernier tour de la partie : l'adversaire ne posera plus rien */
  let n=0;s.j[1-p].grille.forEach(L=>L.forEach(g=>{if(golem(g)&&!carte(g.c).base&&TYPES.some(t=>CARTES[t].base===carte(g.c).id))n++}));
  return .1+.1*Math.min(3,n);
}
const BONUS_COPIE={'041':.3,'036':.3,'004':.25,'007':.3,'007e':.3,'008':.3,'009e':.3,'013':.4,'013e':.9,'026e':.4,'003e':.4,'035e':.3,'008e':.3};
function gainCopie(c,p,l,k,id){
  const f=d=>{const G=d.j[p].grille[l][k];if(!G)return;G.cp=id;
    if(id==='001'&&d.manche<3)G.d+=4; /* KaTarN : -4 a chaque fin de manche */
    if(id==='001e')d.j[1-p].grille[l].forEach((h,q)=>{if(h&&ciblable(d,1-p,l,q,p)&&idEff(h)!=='009e')h.d++});
    if(id==='002')G.f=3.5;
    if(id==='002e')G.f=6.4;
    if(id==='029')gambaEstime(d,p,l,k);
    if(id==='018e')extinctionEstime(d,p); /* Elessar */
    if(id==='004e')ilSuffitEstime(d,p); /* Le Q : Il suffit copie */
  };
  let v=valeur(simule(c,f),p)+(BONUS_COPIE[id]||0);
  if(id==='009'&&slams(c,p).length)v+=.4;
  if(id==='018')v+=elessarEstime(c,p); /* Elessar */
  if(id==='025e')v+=Math.max(0,gainEchange(c,p,l,k)); /* Shifukuro : meandyou copie, joue depuis la case du copieur */
  if(id==='026'){const n=[p,1-p].map(q=>Math.min(3,c.j[q].grille.flat().filter(h=>h&&BRETON(h.c)).length));v+=.25*Math.min(n[0],c.j[p].deck.length)-.15*Math.min(n[1],c.j[1-p].deck.length)}
  if(c.j[p].grille[l][k])v+=risqueDeck(c,p,id,[0,1].map(q=>bretons(c,q)),graines(c.j[p].grille)+(id==='041'?1:0)); /* 0.4 : deck vide (copie de Spam, La Bretagne, Graine de Golem) */
  return v;
}
/* Choix du Deguisement : la copie de plus grande valeur. Egalite : premier de la liste. */
function choixCopie(s,p,l){
  const [il,ik]=s.attente.i;let m=l[0],v=-Infinity;
  l.forEach(a=>{const x=gainCopie(s,p,il,ik,idEff(s.j[p].grille[a.l][a.k]));if(x>v){v=x;m=a}});
  return m;
}
/* Velnen : valeur d'une Imitation (copie de id) pour le chansonnier en (l,k). Des d'Alrevan : moyenne sur tous les tirages
   (le risque d'un mauvais de compte), le reste comme le Deguisement (gainCopie). */
function valeurImitation(c,p,l,k,id){
  if(id!=='002'&&id!=='002e')return gainCopie(c,p,l,k,id);
  const fs=[];for(let a=1;a<=6;a++){if(id==='002')fs.push(a);else for(let b=1;b<=6;b++)fs.push(a===b?a:a+b)}
  return fs.reduce((t,x)=>t+valeur(simule(c,d=>{const G=d.j[p].grille[l][k];if(G){G.cp=id;G.f=x}}),p),0)/fs.length;
}
/* Imitation du robot : copie seulement si elle vaut mieux que de refuser (KaTarN avant la manche 3, de d'Alrevan trop risque... : refus). */
function choixImitation(s,p){
  const [l,k]=s.attente.i,h=s.j[1-p].grille[l][k],id=golem(h)?idEff(h):null;
  if(!id)return {t:'i',o:0};
  return {t:'i',o:valeurImitation(s,p,l,k,id)>gainCopie(s,p,l,k,null)+.02?1:0};
}
/* Shifukuro : meandyou du robot. Gain du meilleur echange depuis (l,k) (valeur du plateau : Trait, cercle, bonus, morts comprises),
   -Infinity sans echange. Le robot n'echange que si l'echange ameliore son estimation (plus de .01), sinon il passe ('v'). */
function gainEchange(c,p,l,k){
  const v0=valeur(c,p);let m=-Infinity;
  echangesMeandyou(c.j[p].grille,l,k).forEach(([x,y,u,w])=>{const v=valeur(simule(c,d=>{const G=d.j[p].grille,q=G[x][y];G[x][y]=G[u][w];G[u][w]=q}),p)-v0;if(v>m)m=v});
  return m;
}
function choixMeandyou(s,p,l){
  const b=meilleur(s,p,l.filter(a=>a.t==='e'));
  return b.a&&b.g>.01?b.a:{t:'v'};
}
/* K-Chan, robot : soigne en fin de tour (apres ses poses) des qu'il y a une cible. Cible : la meilleure valeur du plateau apres le soin
   (colonne qui bascule), plus REGLAGE_KC.risque si la cible est a 1 de Force (moitie a 2 : elle risque de mourir). Egalite : premiere option. */
const REGLAGE_KC={risque:.3};
function choixLove(s,p,l){
  const r=l.filter(a=>a.t==='r');if(!r.length)return null;let m=null,v=-Infinity;
  r.forEach(a=>{const f=forceDe(s,p,a.m,a.n),w=valeur(simule(s,d=>{d.j[p].grille[a.m][a.n].d--}),p)+REGLAGE_KC.risque*(f<=1?1:f<=2?.5:0);if(w>v){v=w;m=a}});
  return m;
}
/* Caramel : seulement si le +1 permet de payer une carte impayable sinon, et que ce coup vaut mieux que le meilleur coup sans lui. */
function caramelUtile(s,p,l,seuil){
  const z=l.find(a=>a.t==='z');if(!z)return null;
  const J=s.j[p],b0=meilleur(s,p,l.filter(a=>a.t!=='z'&&a.t!=='x'&&a.t!=='r'));
  const H={...s,j:s.j.map((K,i)=>i===p?{...K,energie:K.energie+1}:K)};
  const neuf=legales(H,p).filter(a=>a.t==='p'&&coutPose(s,p,a.c,a.l,a.k)>J.energie);
  if(!neuf.length)return null;
  const b1=meilleur(H,p,neuf);
  return b1.a&&b1.g>seuil&&b1.g>(b0.a?b0.g:-Infinity)?z:null;
}
/* Forge eclair si la main garde au moins 1 carte et contient une carte impayable ce tour meme avec l'energie en plus
   (cout trop haut, evolution sans sa base, KaTarN hors manche 1) : on forge la moins utile de celles-la. */
function eclairRobot(s,p,l){
  const J=s.j[p];if(!l.some(a=>a.t==='j')||J.main.length<2)return null;
  const H={...s,j:s.j.map((K,i)=>i===p?{...K,energie:K.energie+1}:K)};
  const hors=J.main.filter(c=>{for(let x=0;x<3;x++)for(let y=0;y<3;y++)if(peutPoser(H,p,c,x,y))return false;return true});
  const du=forgeUtile(s,p,J.main)??jjForgeRobot(s,p);if(du!==null)return {t:'j',c:du}; /* Bellock/Loxim */
  return hors.length?{t:'j',c:parUtilite(s,p,hors).pop()}:null;
}
/* Bellock/Loxim : carte du duo a forger, ou null. Seulement si une version du partenaire reste dans le deck (le contenu du deck se deduit
   de la liste du deck et des cartes vues ; l'ordre n'est jamais regarde). Garde une evolution dont la base est en jeu (elle se joue),
   et une base qui est la seule voie vers son evolution en main. Parmi les autres : la moins utile. */
function forgeUtile(s,p,l){
  const J=s.j[p],G=J.grille,enJeu=id=>G.some(L=>L.some(g=>golem(g)&&carte(g.c).id===id)),enMain=id=>J.main.filter(q=>carte(q).id===id).length;
  const cs=l.filter(c=>{const C=carte(c);if(!DUO[C.id]||!partenaires(J,c).length)return false;
    if(C.base)return !enJeu(C.base);
    return !(J.main.some(q=>carte(q).base===C.id)&&!enJeu(C.id)&&enMain(C.id)<2)});
  return cs.length?parUtilite(s,p,cs).pop():null;
}
/* JackJoy, robot. Forge un JackJoy de base si un Golem allie est en jeu (Sub offert), sauf s'il est la seule voie vers un Drafteur en main.
   draftActif : un Draft diff en jeu a une cible, chaque Forge rapporte (on forge meme au-dela de la cible de Forge).
   Cible : celle qui donne la meilleure valeur du plateau (gagner ou garder un terrain serre) ; Sub offert : petite preference pour une evolution
   (elle ne sera pas remplacee), KaTarN de base evite. Egalite : premiere case. */
function jjForgeRobot(s,p){
  const J=s.j[p],G=J.grille;if(!G.some(L=>L.some(golem)))return null;
  const b=J.main.filter(c=>carte(c).id==='035');if(!b.length)return null;
  if(J.main.some(c=>carte(c).id==='035e')&&!G.some(L=>L.some(g=>golem(g)&&carte(g.c).id==='035'))&&b.length<2)return null;
  return b[0];
}
function draftActif(s,p){const G=s.j[p].grille;return G.some((L,a)=>L.some((g,b)=>golem(g)&&idEff(g)==='035e'&&ciblesJJ(G,'draft',[a,b]).length>0))}
function choixJJ(s,p,l){
  const A=s.attente,x=A.y==='sub'?'sub':'dr';let m=l[0],v=-Infinity;
  l.forEach(a=>{const C=carte(s.j[p].grille[a.l][a.k].c);
    const w=valeur(simule(s,d=>{const g=d.j[p].grille[a.l][a.k];g[x]=(g[x]||[]).concat(A.src)}),p)+(A.y==='sub'?(C.base?.02:0)-(C.id==='001'?.1:0):0);
    if(w>v){v=w;m=a}});
  return m;
}
/* Le Q, robot : Jour de peche, defausse la carte la plus utile a l'adversaire (utilite vue de son camp, sa main cachee : vide). */
function choixPeche(s,p,l){const H={...s,j:s.j.map((K,i)=>i===1-p?{...K,main:[]}:K)};return parUtilite(H,1-p,l.map(a=>a.c))[0]}
function meilleur(s,p,l){
  const v0=valeur(s,p);let m=null,g=-Infinity;
  l.forEach(a=>{const x=gainCoup(s,p,a,v0);if(x>g){g=x;m=a}});
  return {a:m,g};
}
function alea2(s,p,sel){let h=(s.graine^Math.imul(s.log.length+s.stats.tours.length*97+sel,2654435761)^p)|0;h=Math.imul(h^(h>>>15),h|1);h^=h+Math.imul(h^(h>>>7),h|61);return ((h^(h>>>14))>>>0)/4294967296}
function forgeForte(s,p){return parUtilite(s,p,s.j[p].main).pop()}
/* Favori d'Indra : le plus fort, +2 s'il partage un element avec Indra, +1 si un Golem adverse ciblable est en face (evolution). Egalite : premier de la liste. */
function choixFavori(s,p,l){
  const [il,ik]=s.attente.i,I=s.j[p].grille[il][ik],el=carte(I.c).el,evo=idEff(I)==='013e';let m=l[0],v=-Infinity;
  l.forEach(a=>{const g=s.j[p].grille[a.l][a.k],x=forceDe(s,p,a.l,a.k)+(carte(g.c).el.some(e=>el.includes(e))?2:0)+(evo&&ciblable(s,1-p,a.l,a.k,p)?1:0);if(x>v){v=x;m=a}});
  return m;
}
/* niveau : 'facile', 'normal' ou 'difficile'. Jamais la main adverse ni le deck. */
function robot(s,p,niveau){
  const l=legales(s,p),J=s.j[p];
  if(!l.length)return null;
  const t=l[0].t;
  if(niveau==='facile'&&alea2(s,p,l.length)<.55&&t!=='m'){
    const q=l.filter(a=>a.t!=='x'&&a.t!=='n');const u=q.length&&alea2(s,p,7)<.7?q:l;return u[Math.floor(alea2(s,p,13)*u.length)];
  }
  if(niveau==='difficile')return robotFort(s,p,l,t);
  if(t==='m')return {t:'m',c:J.main.filter(c=>carte(c).cout>=4||(carte(c).base&&utilite(s,p,c)<3)).slice(0,3)};
  if(t==='c')return {t:'c',c:choixPeche(s,p,l)}; /* Le Q : Jour de peche */
  if(t==='b')return {t:'b',o:parUtilite(s,p,s.attente.options)};
  if(t==='d')return {t:'d',c:parUtilite(s,p,l.map(a=>a.c)).pop()};
  if(t==='s'){const du=forgeUtile(s,p,J.main)??jjForgeRobot(s,p);return {t:'s',c:du!==null?du:parUtilite(s,p,l.map(a=>a.c)).pop()}} /* Bellock/Loxim : Spam */
  if(t==='v')return l[0];
  if(t==='g')return choixFavori(s,p,l);
  if(t==='k')return choixCopie(s,p,l);
  if(t==='i')return choixImitation(s,p); /* Velnen */
  if(t==='l')return choixJJ(s,p,l); /* JackJoy */
  if(s.attente&&s.attente.t==='u')return choixMeandyou(s,p,l); /* Shifukuro */
  /* Slam : le deplacement qui ameliore le plus la valeur du plateau (perte de 1 comprise, mort eventuelle, bonus perdus). Egalite : premier de la liste. */
  if(t==='h')return meilleur(s,p,l).a;
  if(t==='e')return meilleur(s,p,l).a;
  if(t==='f'||t==='n'||t==='j'){ /* 'j' */
    const cible=Math.min(5,(s.manche-1)*3+s.tour);
    const du=J.main.length>1?forgeUtile(s,p,J.main)??jjForgeRobot(s,p):null; /* Bellock/Loxim : forge la carte du duo, meme au-dela de la cible */
    if(!J.aForge&&J.main.length>1&&(du!==null||J.forge.length<cible||draftActif(s,p)))return {t:'f',c:du!==null?du:parUtilite(s,p,J.main).pop()};
    return eclairRobot(s,p,l)||{t:'n'};
  }
  const z=caramelUtile(s,p,l,.05);if(z)return z;
  const b=meilleur(s,p,l.filter(a=>a.t!=='x'&&a.t!=='z'&&a.t!=='r'&&a.t!=='t'));
  return b.a&&b.g>.05?b.a:choixLove(s,p,l)||pronoRobot(s,p,l)||{t:'x'}; /* K-Chan ; Les Pronos */
}
function robotFort(s,p,l,t){
  const J=s.j[p],F={...s,fort:true};
  if(t==='m')return {t:'m',c:J.main.filter(c=>carte(c).cout>=4||(carte(c).base&&utilite(s,p,c)<3)).slice(0,3)};
  if(t==='c')return {t:'c',c:choixPeche(s,p,l)}; /* Le Q : Jour de peche */
  if(t==='b')return {t:'b',o:parUtilite(s,p,s.attente.options)};
  if(t==='d')return {t:'d',c:forgeForte(s,p)};
  if(t==='s'){const du=forgeUtile(s,p,J.main)??jjForgeRobot(s,p);return {t:'s',c:du!==null?du:forgeForte(s,p)}} /* Bellock/Loxim : Spam */
  if(t==='v')return l[0];
  if(t==='g')return choixFavori(s,p,l);
  if(t==='k')return choixCopie(F,p,l);
  if(t==='i')return choixImitation(F,p); /* Velnen */
  if(t==='l')return choixJJ(F,p,l); /* JackJoy */
  if(s.attente&&s.attente.t==='u')return choixMeandyou(F,p,l); /* Shifukuro */
  if(t==='h')return meilleur(F,p,l).a;
  if(t==='e')return meilleur(F,p,l).a;
  if(t==='f'||t==='n'||t==='j'){ /* 'j' */
    const cible=Math.min(6,(s.manche-1)*3+s.tour);
    const du=J.main.length>1?forgeUtile(s,p,J.main)??jjForgeRobot(s,p):null; /* Bellock/Loxim : forge la carte du duo, meme au-dela de la cible */
    return !J.aForge&&J.main.length>1&&(du!==null||J.forge.length<cible||draftActif(s,p))?{t:'f',c:du!==null?du:forgeForte(s,p)}:eclairRobot(s,p,l)||{t:'n'};
  }
  const z=caramelUtile(F,p,l,.01);if(z)return z;
  const q=l.filter(a=>a.t!=='x'&&a.t!=='z'&&a.t!=='r'&&a.t!=='t');
  /* garde une evolution pour son Golem deja pose : elle vaut mieux qu'une pose faible */
  const b=meilleur(F,p,q);
  return b.a&&b.g>.01?b.a:choixLove(F,p,l)||pronoRobot(s,p,l)||{t:'x'}; /* K-Chan ; Les Pronos */
}
/* Registre des effets : outils internes donnes aux fichiers d'effets (M), puis effets de chaque fiche. */
const protegeRobot=h=>effs(idEff(h)).some(e=>e.T.protege&&(!e.r.unique||!h.cdb)); /* robot : perte adverse annulee (Menfou palu, Chance du debutant pas encore utilisee) */
const M={carte,golem,animal,CARTES,TYPES,effs,idEff,REGLAGE_TERRAINS,golemsIci,kAvec,statsSansTerrain,gagnantColonne,ecart,colonnes,forceDe,retire,protegeRobot,dire,declenche,note,nomDetail,blesse,ciblable,de,pioche,melange,orphelins,nettoie,forgee,estCopieur:id=>!!COPIEURS[id]};
R=FX.construit(M);F=R.fonctions;const ACT={};for(const x in R.actions)ACT[x]=R.actions[x];
for(const T of TERRAINS)EFFT[T.nom]=[].concat(T.effet||[]).map(r=>{const X=R.types[r.type];if(!X)throw new Error('type d\'effet inconnu '+r.type+' ('+T.nom+')');return {T:X,r}});
const {cirqueInv,tarteX,miseTotale,stT,stV,cfTarte,versusPose}=F;
const TY_HOOKS={};function TYPES_AVEC(h){return TY_HOOKS[h]||(TY_HOOKS[h]=Object.values(R.types).filter(T=>T[h]))} /* types qui ont le crochet h, dans l'ordre d'enregistrement */
for(const id in CARTES){
  EFF[id]=[].concat(CARTES[id].effet||[]).map(r=>{const T=R.types[r.type];if(!T)throw new Error('type d\'effet inconnu '+r.type+' ('+id+')');return {T,r}});
  for(const e of EFF[id]){if(e.T.favoriBonus)FAV_BONUS[id]=(FAV_BONUS[id]||0)+e.T.favoriBonus(e.r);if(e.r.type==='duo'){DUO[id]=e.r.partenaire;DUO_NOM[id]=e.r.nom}}
}
const {foudres,kekwait,REGLAGE_DUO,duoManches,duoVoisin,doubleUp,elessars,graines,spoms,jourDePeche,doublons,ilSuffit}=F;
const api={VERSION,TRAIT_CUMULE,TAILLE_DECK,DECK_MIN,DECK_MAX,MAX_EX,erreurDeck,ELEM_MAX,elementsDeck,erreurElements,evolutionsSansBase,animauxSansBase,erreurEvolutions,deckTexte,lisDeck,POIDS_MVP,bilan,robot,CARTES,TYPES,DOMINE,TERRAINS,carte,nouvelle,legales,applique,attendus,code,decode,rejoue,ecritJournal,litJournal,
  nomDetail,forceDe,ciblable,colonnes,valeurDecompte,coutPose,genre,TYPES_TEST,DECK_DEFAUT,DECK_TUTO,FAV_BONUS,favori,indrasDe,idEff,foudres,spoms,
  estAnimal,ANIMAL_MAX,maxEx,maitreDe,peutPoser,elessars,graines,COPIEURS,EL_VELNEN,kekwait,echangesMeandyou,DUO,REGLAGE_DUO,duoManches,duoVoisin,doubleUp,partenaires,forgeUtile,jjBonus,ciblesJJ,REGLAGE_JJ,cercle2,blesse,loves,choixLove,REGLAGE_KC,generaux,nettoie,noteBonus,retire,chatsPioche,effetsGolems,agit,piochesAVenir,risqueDeck,doublons,ilSuffit,jourDePeche,POINT_DECK_VIDE,
  REGLAGE_ANIMAUX,coutCarte,elAnimal,animauxVoisins,ANCIENS_TERRAINS,REGLAGE_TERRAINS,estVersus,versusPose,slams,tarteX,cirqueInv,tirageTerrains,indexTerrain,ptsTerrain,gagnantColonne,golemsIci,ecart,ptsRobot,pronoRobot,miseTotale,decompte,effetTerrain,valeur,valeurForte};

if(typeof module!=='undefined'&&module.exports)module.exports=api;else racine.GolemsMoteur=api;
})(typeof window!=='undefined'?window:globalThis);
