/* Les Golems : moteur pur, sans affichage. Etat = f(graine, journaux). Charge en page et en Node. */
(function(racine){
'use strict';
const VERSION='0.2b.1';const TRAIT_CUMULE=true; /* 0.2.1 : Trait cumule (+1 par voisin allie par element partage), plus de match nul. 0.2.2 : coup 'a' = abandon (a tout moment, hors tour). 0.2a.1 : Indra (013, 013e), favori et coup 'g'. 0.2a.2 : Glad (009, 009e), Slam (coup 'h') et Menfou palu. 0.2b : K-Chan (008) Magma + Brume au lieu de Magma + Roche. Apo (029, 029e), SuperFishman (037, 037e), Titom76 (026, 026e), coups 'k' (Deguisement) et 'z' (Caramel), carte 62 codee '_'. Spom (036, 036e), coup 'j' (Forge eclair), cartes 63 et plus codees '~' + 1 caractere. Kiwi (901), premier animal de compagnie (carte 69, '~6') : pose a cote de son maitre (Titom76), Mignonitude avant le decompte (g.hors), erreurDeck : 1 exemplaire et son maitre dans le deck. Elessar (018, cartes 72-74, '~9' a '~b') et Le pomplard (018e, cartes 75-77, '~c' a '~e'). Velnen : Velnen (041, cartes 78-80, '~f' a '~h', Graine de Golem : +1 a la pioche de chaque tour, cumulatif) et Le chansonnier (041e, cartes 81-83, '~i' a '~k', Imitation, coup 'i'). Shifukuro : Shifukuro (025, cartes 84-86, '~l' a '~n', KEKWait : +1 de Force par Golem allie au-dessus, dans forceDe) et Le moderateur (025e, cartes 87-89, '~o' a '~q', meandyou : attente 'u', coup 'e' pour echanger, 'v' pour passer). Bellock/Loxim : Bellock (015, cartes 90-92, '~r' a '~t'), Aiges Captain (015e, 93-95, '~u' a '~w'), Loxim (016, 96-98, '~x' a '~z'), Le Ace de Aiges (016e, 99-101, '~A' a '~C'). Comeback et Winstreak (+1 ou +2 de Force par manche perdue ou remportee sur son terrain, lues dans s.resultats) ; « si tu forges cette carte » (Forge, Forge eclair, Spam) : partenaire cherche dans le deck, attente 'r' et coup 'r' + carte s'il y a deux versions ; Double up ? des evolutions (+REGLAGE_DUO.doubleUp). 0.2b.1 : Bellock/Loxim, le partenaire est pioche au hasard parmi tous ses exemplaires du deck (bases et evolutions, generateur du joueur), plus d'attente 'r' ni de coup 'r' */
const POIDS_MVP={force:1,bonus:1,degats:1,morts:3};
const EL_VELNEN=['roche','brume']; /* Velnen : elements de Velnen et du chansonnier, ecrits ici seulement */
const CARTES={
 '001':{id:'001',nom:'KaTarN',el:['magma','foudre'],cout:1,force:8,texte:'Jeunesse éphémère : pose uniquement à la manche 1. Perds 4 de Force à chaque fin de manche.'},
 '001e':{id:'001e',nom:'Slim K',el:['magma','foudre'],cout:4,force:3,base:'001',texte:'Rap God : à la pose, inflige 1 dégât à chaque Golem de la ligne adverse.'},
 '002':{id:'002',nom:'Alrevan',el:['brume','roche'],cout:3,force:null,texte:'Tout ou rien : à la pose, lance 1 dé à 6 faces. Le résultat est ta Force.'},
 '002e':{id:'002e',nom:'KEKWRevan',el:['brume','roche'],cout:3,force:null,base:'002',texte:'High Roll : à la pose, lance 2 dés. Ta Force est leur somme. Sur un double, ta Force est la valeur d\'un seul dé.'},
 '003':{id:'003',nom:'Cyrdan',el:['cristal','roche'],cout:3,force:1,texte:'Tournoi annexe : en jeu, tes voisins gagnent +1 de Force.'},
 '003e':{id:'003e',nom:'Roi du Karaoké',el:['cristal','roche'],cout:5,force:2,base:'003',texte:'Palmarès : tes voisins gagnent +1 de Force. Fin de manche : si tu remportes le terrain qui rapporte le moins, marque +2 points.'},
 '004':{id:'004',nom:'Le Q',el:['brume','cristal'],cout:2,force:1,texte:'Analyse : à la pose, regarde les 3 premières cartes de ton deck. Prends-en 1 en main et replace les autres dessus, dans l\'ordre de ton choix.'},
 '004e':{id:'004e',nom:'Oracle des Stats',el:['brume','cristal'],cout:3,force:2,base:'004',texte:'Optimisation : à la pose, regarde la main adverse. Puis échange de place 2 de tes Golems.'},
 '007':{id:'007',nom:'Trigas',el:['foudre','brume'],cout:1,force:1,texte:'Spam : à la pose, pioche 1 carte, puis place-en 1 de ta main dans ta Forge.'},
 '007e':{id:'007e',nom:'Roi du Mobile',el:['foudre','brume'],cout:4,force:4,base:'007',texte:'Mode Avion : tu ne peux pas être ciblé par les effets de cartes adverses.'},
 '008':{id:'008',nom:'K-Chan',el:['magma','brume'],cout:2,force:2,texte:'Rage : chaque fois que tu subis des dégâts et survis, gagne +1 de Force (3 maximum).'},
 '013':{id:'013',nom:'Indra',el:['cristal','magma'],cout:2,force:2,texte:'Soutien inconditionnel : à la pose, choisis un de tes Golems : il devient ton favori. Tant que tu es en jeu, il gagne +1 de Force.'},
 '013e':{id:'013e',nom:'La Fan enflammée',el:['cristal','magma'],cout:4,force:3,base:'013',texte:'Ragebait : ton favori gagne +2 de Force et le Golem adverse en face de lui perd 2 de Force à la pose. Si ton favori n\'est plus en jeu, choisis-en un nouveau à la pose.'},
 '009':{id:'009',nom:'Glad',el:['roche','magma'],cout:2,force:1,texte:'Slam : à la pose, déplace un Golem adverse sur une case libre adjacente, si possible. Il perd 1 de Force.'},
 '009e':{id:'009e',nom:'GymRat',el:['roche','magma'],cout:3,force:3,base:'009',texte:'Menfou palu : tu ne perds jamais de Force à cause d\'un effet adverse.'},
 '029':{id:'029',nom:'Apo',el:['magma','roche'],cout:1,force:2,texte:'Gamba : à la pose, lance 1 dé. Sur 1 ou 2, tu perds 2 de Force. Sur 5 ou 6, le Golem adverse en face de toi perd 2 de Force.'},
 '029e':{id:'029e',nom:'Maître du déguisement',el:['magma','roche'],cout:5,force:3,base:'029',texte:'Déguisement : à la pose, choisis un de tes Golems voisins et copie son effet. S\'il agit à la pose, il se déclenche aussitôt. Sinon, tu le gardes tant que tu es en jeu.'},
 '037':{id:'037',nom:'SuperFishman',el:['roche','cristal'],cout:2,force:1,texte:'Counter-pick : si tu domines le Golem en face, gagne +2 de Force au lieu de +1.'},
 '037e':{id:'037e',nom:'Monsieur Poisson',el:['roche','cristal'],cout:4,force:2,base:'037',texte:'Full synergie : si tu domines le Golem en face, gagne +2 de Force au lieu de +1. Gagne aussi +1 de Force par élément que tu partages avec tes voisins (+2 maximum).'},
 '026':{id:'026',nom:'Titom76',el:['brume','foudre'],cout:2,force:1,texte:'La Bretagne, ça vous gagne : à la pose, chaque joueur pioche 1 carte par Golem Brume ou Foudre de sa grille (toi compris, 3 maximum).'},
 '026e':{id:'026e',nom:'Maître du bilig',el:['brume','foudre'],cout:4,force:3,base:'026',texte:'Caramel à volonté : une fois par manche, à ton tour, gagne +1 énergie (dès ta pose).'},
 '036':{id:'036',nom:'Spom',el:['foudre','magma'],cout:2,force:1,texte:'Forge éclair : au début de ton tour, tu peux forger 1 carte de plus. Si tu le fais, à la fin de ton tour, mélange ta Forge et reprends-en 1 au hasard dans ta main.'},
 '036e':{id:'036e',nom:'A encore menti',el:['foudre','magma'],cout:6,force:0,base:'036',texte:'Survolté : gagne +1 de Force par Golem Foudre que tu as en jeu, toi compris.'},
 /* Animaux de compagnie : animal:true, maitre = code du Golem de base (son evolution compte aussi). Ni Force ni element, jamais d'evolution.
    Codes 9xx, hors des numeros de membres ; 1 exemplaire par deck (ANIMAL_MAX). */
 '901':{id:'901',nom:'Kiwi',el:[],cout:1,force:null,animal:true,maitre:'026',texte:'Mignonitude : à la fin de la manche, un Golem au hasard de chaque joueur ne compte pas au décompte (il reste en jeu). Puis tu pars à la défausse.'},
 '018':{id:'018',nom:'Elessar',el:['roche','foudre'],cout:2,force:2,texte:'Réalisation de l\'âge : tant que tu es en jeu, les évolutions adverses coûtent 1 énergie de plus.'}, /* Elessar */
 '018e':{id:'018e',nom:'Le pomplard',el:['roche','foudre'],cout:4,force:3,base:'018',texte:'Extinction du feu : à la pose, les Golems Magma adverses perdent 1 de Force.'}, /* Elessar */
 '041':{id:'041',nom:'Velnen',el:EL_VELNEN,cout:3,force:1,texte:'Graine de Golem : tant que tu es en jeu, tu pioches 1 carte de plus à chaque tour.'}, /* Velnen */
 '041e':{id:'041e',nom:'Le chansonnier',el:EL_VELNEN,cout:4,force:3,base:'041',texte:'Imitation : à la pose, tu peux copier l\'effet du Golem adverse en face de toi. S\'il agit à la pose, il se déclenche aussitôt. Sinon, tu le gardes tant que tu es en jeu.'}, /* Velnen */
 '025':{id:'025',nom:'Shifukuro',el:['roche','cristal'],cout:2,force:1,texte:'KEKWait : gagne +1 de Force par Golem allié au-dessus de toi sur ton terrain.'}, /* Shifukuro */
 '025e':{id:'025e',nom:'Le modérateur',el:['roche','cristal'],cout:3,force:4,base:'025',texte:'meandyou : à la pose, tu peux échanger de case un Golem allié au-dessus de toi sur ton terrain avec l\'un de ses voisins.'}, /* Shifukuro */
 '015':{id:'015',nom:'Bellock',el:['brume','magma'],cout:1,force:1,texte:'Comeback : si tu forges cette carte, pioche un Loxim de ton deck. Gagne +1 de Force par manche perdue sur ton terrain.'}, /* Bellock/Loxim */
 '015e':{id:'015e',nom:'Aiges Captain',el:['brume','magma'],cout:5,force:4,base:'015',texte:'Comeback : si tu forges cette carte, pioche un Loxim de ton deck. Gagne +2 de Force par manche perdue sur ton terrain. Double up ? : si Loxim et toi êtes seuls sur ta ligne ou ton terrain, gagne +3 de Force.'}, /* Bellock/Loxim */
 '016':{id:'016',nom:'Loxim',el:['brume','magma'],cout:5,force:4,texte:'Winstreak : si tu forges cette carte, pioche un Bellock de ton deck. Gagne +1 de Force par manche remportée sur ton terrain.'}, /* Bellock/Loxim */
 '016e':{id:'016e',nom:'Le Ace de Aiges',el:['brume','magma'],cout:1,force:4,base:'016',texte:'Winstreak : si tu forges cette carte, pioche un Bellock de ton deck. Gagne +2 de Force par manche remportée sur ton terrain. Double up ? : si Bellock et toi êtes seuls sur ta ligne ou ton terrain, gagne +3 de Force.'} /* Bellock/Loxim */
};
const TYPES=['001','001e','002','002e','003','003e','004','004e','007','007e','008','013','013e','009','009e','029','029e','037','037e','026','026e','036','036e','901','018','018e','041','041e','025','025e','015','015e','016','016e']; /* toujours ajouter en fin : l'identifiant de carte depend du rang. Kiwi (901) : rang 23, carte de partie 69, codee '~6'. Elessar : 018 rang 24 (72-74, '~9' a '~b'), 018e rang 25 (75-77, '~c' a '~e'). Velnen : 041 rang 26 (78-80, '~f' a '~h'), 041e rang 27 (81-83, '~i' a '~k'). Shifukuro : 025 rang 28 (84-86, '~l' a '~n'), 025e rang 29 (87-89, '~o' a '~q'). Bellock/Loxim : 015 rang 30 (90-92, '~r' a '~t'), 015e rang 31 (93-95, '~u' a '~w'), 016 rang 32 (96-98, '~x' a '~z'), 016e rang 33 (99-101, '~A' a '~C') */
/* Paquet de test : les 11 premiers types seulement (0 a 32), pour garder la partie guidee et les parties de test d'avant 0.2a.1. */
const TYPES_TEST=TYPES.slice(0,11);
const EXEMPLAIRES=3,TAILLE_DECK=TYPES_TEST.length*EXEMPLAIRES; /* identifiant = type*3 + exemplaire : 0 a 44 */
const TERRAINS=[ /* copie de terrains.json, via generer_terrains.py */
 {"nom": "Le Buzzer", "pts": 1, "texte": "Fin de manche : le gagnant regarde ses 3 prochaines cartes et les remet dans l'ordre de son choix.", "cit": "Je l'avais sur le bout de la langue !"},
 {"nom": "Le Camp", "pts": 1, "texte": "Fin de manche : tous les Golems ici récupèrent 1 de Force.", "cit": "On fait un repos long ?"},
 {"nom": "L'Écran du MJ", "pts": 1, "texte": "Fin de manche : le gagnant regarde la main adverse.", "cit": "Fais-moi un jet... discrètement."},
 {"nom": "La Boutique", "pts": 2, "texte": "Jouer un Golem ici coûte 1 de moins.", "cit": "Promis, un dernier reroll et j'arrête."},
 {"nom": "La Faille", "pts": 2, "texte": "Une fois par manche : déplace un de tes Golems d'un autre terrain vers une case libre ici.", "cit": "Je vais gank sa daronne"},
 {"nom": "La Nuit au Village", "pts": 2, "texte": "Fin de manche : le Golem le plus faible ici est détruit.", "cit": "Le village s'endort..."},
 {"nom": "Le Plateau de Jeu", "pts": 2, "texte": "Fin de manche : lance 1 dé. Sur 5 ou 6, le gagnant marque 1 point de plus.", "cit": "C'est à qui de jouer ?"},
 {"nom": "Le Vaisseau", "pts": 2, "texte": "Une fois par manche : échange 2 de tes Golems ici.", "cit": "Je l'ai vu sortir du conduit."},
 {"nom": "Le Carrousel", "pts": 3, "texte": "Fin de manche : le gagnant défausse 1 carte de sa main.", "cit": "Merde, je n'ai pas la prio."},
 {"nom": "La Salle Verrouillée", "pts": 4, "texte": "Ne marque qu'à la dernière manche.", "cit": "Il nous reste combien de temps ?"}
];
const DOMINE={magma:'cristal',cristal:'foudre',foudre:'brume',brume:'roche',roche:'magma'};
const carte=i=>CARTES[TYPES[Math.floor(i/EXEMPLAIRES)]];
const nomDetail=C=>C.base?CARTES[C.base].nom+' ('+C.nom+')':C.nom;
const b32=i=>i<36?i.toString(36):i<62?String.fromCharCode(29+i):i===62?'_':'~'+b32(i-63); /* 1 caractere par carte : 0-9, a-z, puis A-Z des 36, puis '_' pour 62 ; 63 a 125 = '~' + le code de 0 a 62 ('~0' = 63, '~_' = 125). Les anciens codes restent identiques */
const h32=q=>q[0]==='~'?63+h32(q.slice(1)):q==='_'?62:/[A-Z]/.test(q)?q.charCodeAt(0)-29:parseInt(q,36);
const CARTE_RE='~?[0-9a-zA-Z_]',cartesDe=x=>x.match(new RegExp(CARTE_RE,'g'))||[]; /* jeton de carte, 1 ou 2 caracteres */
/* identifiant d'effet. Le Maitre du deguisement (029e) et Le chansonnier (041e, Velnen) portent l'effet copie (g.cp, null = rien) ; les autres, le leur.
   Un copieur ne porte jamais l'identifiant d'un copieur : copier un copieur donne son effet copie, sans boucle possible. */
const COPIEURS={'029e':1,'041e':1};
function idEff(g){const id=carte(g.c).id;return COPIEURS[id]?(g.cp||null):id}
const CERCLE2={'037':1,'037e':1}; /* Counter-pick et Full synergie : cercle +2 au lieu de +1 */
/* Animaux de compagnie (Kiwi). Ce ne sont pas des Golems : aucun effet de Golem ne les concerne, Force 0 dans les colonnes.
   estAnimal accepte un code ('901'), une fiche de CARTES ou une carte de partie (69). Sur la grille : g.maitre = carte de partie du maitre. */
const estAnimal=x=>{const C=typeof x==='number'?carte(x):typeof x==='string'?CARTES[x]:x;return !!(C&&C.animal)};
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
  if(!o)return Array.from({length:TAILLE_DECK},(_,i)=>i);
  const l=[];TYPES.forEach((t,i)=>{for(let c=0;c<(o[t]||0);c++)l.push(i*EXEMPLAIRES+c)});
  return l;
}
function nouvelle(graine,decks){
  graine=graine|0;
  const g={v:graine};
  const t=melange(g,'v',TERRAINS.map((_,i)=>i)).slice(0,3).map(i=>({...TERRAINS[i]}));
  const premier=alea(g,'v')<.5?0:1;
  const dk=[0,1].map(p=>{const o=lisDeck(decks&&decks[p]);return o?deckTexte(o):''});
  const s={graine,decks:dk,rng:[(graine^0x51ED270B)|0,(graine^0x2F7A9C31)|0],terrains:t,manche:1,tour:1,premier,joueur:premier,
    phase:'mulligan',mull:[false,false],attente:null,fil:null,dernier:null,forceTotale:[0,0],resultats:[],fin:null,log:[],reperes:[],stats:{ev:[],coups:{},cause:null,t:[],act:[],tours:[],vues:[[],[]]},j:[]};
  for(let p=0;p<2;p++){
    const deck=melange(s.rng,p,idsDeck(lisDeck(dk[p])));
    s.j.push({deck,main:deck.splice(0,5),defausse:[],forge:[],energie:0,score:0,aForge:false,aAgi:false,etapeForge:false,vaisseau:0,faille:0,eclair:0,eclairUtil:0,
      grille:[[null,null,null],[null,null,null],[null,null,null]]});
  }
  return s;
}
function bonus(s,p,l,k){
  const G=s.j[p].grille;let b=0;
  [[l-1,k],[l+1,k],[l,k-1],[l,k+1]].forEach(([a,c])=>{
    const v=G[a]&&G[a][c];if(v){const t=idEff(v);if(t==='003'||t==='003e')b++}
  });
  return b;
}
function voisins(G,l,k){return [[l-1,k],[l+1,k],[l,k-1],[l,k+1]].map(([a,c])=>G[a]&&G[a][c]).filter(golem)}
/* 0.2a.1 : Indra. g.fav = identifiant de carte du favori, dans le camp d'Indra. Base +1, evolution +2. */
const FAV_BONUS={'013':1,'013e':2};
function indrasDe(s,p,c){const r=[];s.j[p].grille.forEach(L=>L.forEach(g=>{if(g&&g.fav===c&&FAV_BONUS[idEff(g)])r.push(g)}));return r}
function favori(s,p,c){return indrasDe(s,p,c).reduce((t,g)=>t+FAV_BONUS[idEff(g)],0)}
function caseDeCarte(s,p,c){for(let l=0;l<3;l++)for(let k=0;k<3;k++){const g=s.j[p].grille[l][k];if(g&&g.c===c)return [l,k]}return null}
/* Force actuelle = base + capacites + Trait + cercle - degats, partout. */
function forceDe(s,p,l,k){
  const J=s.j[p].grille,g=J[l][k];if(!g||animal(g))return 0;
  const el=carte(g.c).el,vs=voisins(J,l,k);let v=g.f+(g.ra||0)+bonus(s,p,l,k)+favori(s,p,g.c)-g.d;
  el.forEach(e=>{v+=vs.filter(n=>carte(n.c).el.includes(e)).length}); /* 0.2.1 : +1 par voisin partageant l'element */
  const id=idEff(g);
  if(id==='037e')el.forEach(e=>{if(vs.some(n=>carte(n.c).el.includes(e)))v++}); /* Full synergie : +1 par element partage par au moins un voisin, en plus du Trait (+2 maximum) */
  if(id==='036e')v+=foudres(J); /* Survolte, +1 par Golem Foudre de sa grille (lui compris s'il est Foudre) */
  if(id==='025')v+=kekwait(J,l,k); /* Shifukuro : KEKWait, +1 par Golem allie au-dessus (Apo et chansonnier qui l'ont copie : depuis leur case) */
  if(DUO_MANCHE[id])v+=DUO_MANCHE[id][0]*duoManches(s,p,k,DUO_MANCHE[id][1]); /* Bellock/Loxim : Comeback, Winstreak (Apo et chansonnier qui l'ont copie : depuis leur case) */
  if(DUO_EVO[id]&&doubleUp(J,l,k,id))v+=REGLAGE_DUO.doubleUp; /* Bellock/Loxim : Double up ? */
  const f=s.j[1-p].grille[l][k];
  if(f&&el.some(e=>carte(f.c).el.includes(DOMINE[e])))v+=CERCLE2[id]?2:1;
  return v;
}
/* Mignonitude : un Golem marque hors = s.manche ne compte pas au decompte de cette manche (il reste en jeu, sa Force ne change pas). */
const valeurDecompte=(s,p,l,k)=>{const g=s.j[p].grille[l][k];return g&&g.hors===s.manche?0:forceDe(s,p,l,k)};
/* Golems Foudre d'une grille (Survolte) et Spom en jeu (Forge eclair, Apo deguise compris) */
function foudres(G){let n=0;G.forEach(L=>L.forEach(g=>{if(g&&carte(g.c).el.includes('foudre'))n++}));return n}
function spoms(G){let n=0;G.forEach(L=>L.forEach(g=>{if(g&&idEff(g)==='036')n++}));return n}
/* Elessar : Realisation de l'age en jeu dans une grille (Elessar, Maitre du deguisement qui l'a copiee). Le pomplard ne la garde pas. */
function elessars(G){let n=0;G.forEach(L=>L.forEach(g=>{if(golem(g)&&idEff(g)==='018')n++}));return n}
/* Velnen : Graine de Golem en jeu dans une grille (Velnen de base, Apo ou chansonnier qui l'a copiee), cumulatif. Le chansonnier ne la garde pas. */
function graines(G){let n=0;G.forEach(L=>L.forEach(g=>{if(golem(g)&&idEff(g)==='041')n++}));return n}
/* Shifukuro : KEKWait, Golems allies au-dessus de (l,k) sur le meme terrain (meme colonne, ligne d'indice plus petit), pas forcement adjacents.
   Un animal ne compte pas. Ligne 1 : 0 ; ligne 3 : 2 au plus. */
function kekwait(G,l,k){let n=0;for(let a=0;a<l;a++)if(golem(G[a][k]))n++;return n}
/* Bellock/Loxim. DUO : carte (base ou evolution) -> Golem de base du partenaire. Les cartes se reconnaissent par la carte, pas par l'effet
   (Apo deguise en Loxim n'est pas Loxim). REGLAGE_DUO : valeur de Double up ?, modifiable pour les simulations. */
const DUO={'015':'016','015e':'016','016':'015','016e':'015'},DUO_EVO={'015e':1,'016e':1},REGLAGE_DUO={doubleUp:3};
const DUO_NOM={'015':'Comeback','015e':'Comeback','016':'Winstreak','016e':'Winstreak'};
/* Comeback (Bellock +1, Aiges Captain +2) : manches deja decomptees ou p a perdu le terrain k ; Winstreak (Loxim +1, Le Ace de Aiges +2) : ou il l'a remporte.
   Egalite, ou Salle Verrouillee avant la manche 3 (personne ne la remporte) : rien. Jamais stocke sur la carte : recalcule, le Golem deplace compte son nouveau terrain. */
const DUO_MANCHE={'015':[1,false],'015e':[2,false],'016':[1,true],'016e':[2,true]};
function duoManches(s,p,k,gagne){return (s.resultats||[]).filter(r=>r[k]===(gagne?p:1-p)).length}
/* Golem du partenaire P (carte de base ou evolution) seul avec (l,k) sur sa ligne ou son terrain : l'autre case de la ligne ou du terrain est le partenaire,
   la troisieme est vide (un animal la bloque). Renvoie le partenaire (ligne d'abord) ou null. */
function duoVoisin(G,l,k,P){
  const est=g=>golem(g)&&(carte(g.c).id===P||carte(g.c).base===P),un=(a,b)=>est(a)&&!b?a:est(b)&&!a?b:null;
  const L=[0,1,2].filter(x=>x!==k).map(x=>G[l][x]),C=[0,1,2].filter(x=>x!==l).map(x=>G[x][k]);
  return un(L[0],L[1])||un(C[0],C[1]);
}
/* Double up ? (Aiges Captain, Le Ace de Aiges, ou copieur) : +REGLAGE_DUO.doubleUp une seule fois, meme si ligne et terrain sont vrais a la fois. */
function doubleUp(G,l,k,id){return DUO_EVO[id]?duoVoisin(G,l,k,DUO[id]):null}
/* Mort en chaine : le partenaire mort a la vague d'avant, sur la meme ligne ou le meme terrain, explique la perte de Double up ? */
function duoMort(s,a,x){const g=s.j[x.p].grille[x.l][x.k],id=g&&idEff(g);return !!id&&!!DUO_EVO[id]&&a.p===x.p&&(a.l===x.l||a.k===x.k)&&a.nom.split(' (')[0]===CARTES[DUO[id]].nom}
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
const colonnes=s=>[0,1,2].map(k=>[0,1].map(p=>[0,1,2].reduce((t,l)=>t+valeurDecompte(s,p,l,k),0)));
function retire(s,p,l,k){
  const J=s.j[p],g=J.grille[l][k];
  J.defausse.push(g.c);
  J.grille[l][k]=null;
  if(golem(g))orphelins(s,p,g.c);
}
/* Un animal part a la defausse quand son maitre quitte le jeu (mort, remplace, detruit). Deplace ou evolue, le maitre le garde (agit suit l'evolution). */
function orphelins(s,p,c){
  const J=s.j[p];
  J.grille.forEach(L=>L.forEach((h,k)=>{if(animal(h)&&h.maitre===c){J.defausse.push(h.c);L[k]=null;dire(s,p,carte(h.c).nom+' part à la défausse : son maître a quitté le jeu.')}}));
}
/* Statistiques : evenements en lecture seule, aucun effet sur la partie. src = {p,c,lib}, c et p peuvent etre null. */
function note(s,t,n,src,cp,cc,ch){const o={t,n,sp:src.p,sc:src.c,lib:src.lib,cp,cc};if(ch)o.ch=1;s.stats.ev.push(o)}
function declenche(s,nom,e){s.stats.act.push({m:s.manche,nom,e})}
/* Seul point de controle du ciblage : tout effet de carte passe par ici. Les terrains n'y passent pas. */
function ciblable(s,p,l,k,src){
  const g=s.j[p].grille[l][k];
  return golem(g)&&!(idEff(g)==='007e'&&src!==p);
}
const RAGE_MAX=3;
function blesse(s,p,l,k,n,src){
  const g=s.j[p].grille[l][k];
  /* 0.2a.2 : Menfou palu (GymRat) ignore toute perte de Force venue d'un effet adverse ; il reste ciblable */
  if(idEff(g)==='009e'&&src&&src.p!==null&&src.p!==undefined&&src.p!==p){dire(s,p,nomDetail(carte(g.c))+' : Menfou palu, ne perd pas de Force.');return}
  g.d+=n;
  if(idEff(g)==='008')g.rp=(g.rp||0)+1; /* Rage : tranchee par nettoie, une fois la survie connue */
  note(s,'d',n,src,p,g.c);s.stats.coups[p+''+l+k]=src;
}
function rage(s){
  for(let p=0;p<2;p++)for(let l=0;l<3;l++)for(let k=0;k<3;k++){
    const g=s.j[p].grille[l][k];if(!g||!g.rp)continue;
    const n=Math.min(g.rp,RAGE_MAX-(g.ra||0));delete g.rp;
    if(n>0){g.ra=(g.ra||0)+n;dire(s,p,nomDetail(carte(g.c))+' : Rage, +'+n+' de Force.')}
  }
}
/* Vagues simultanees : tous les Golems a 0 ou moins meurent ensemble, puis on recalcule. */
function nettoie(s){
  let avant=null;
  for(;;){
    const morts=[];
    for(let p=0;p<2;p++)for(let l=0;l<3;l++)for(let k=0;k<3;k++){
      if(golem(s.j[p].grille[l][k])&&forceDe(s,p,l,k)<=0)morts.push({p,l,k,nom:nomDetail(carte(s.j[p].grille[l][k].c))});
    }
    if(!morts.length){s.stats.coups={};rage(s);return}
    if(!avant)dire(s,null,morts.map(x=>x.nom).join(' et ')+(morts.length>1?' meurent.':' meurt.'));
    else dire(s,null,morts.map(x=>{
      const c=avant.find(a=>(a.p===x.p&&Math.abs(a.l-x.l)+Math.abs(a.k-x.k)===1)||(a.p!==x.p&&a.l===x.l&&a.k===x.k))||avant.find(a=>a.p===x.p&&a.k===x.k&&a.l<x.l&&idEff(s.j[x.p].grille[x.l][x.k])==='025')||avant.find(a=>duoMort(s,a,x)); /* Shifukuro */
      return x.nom+' meurt ensuite'+(c?' : il perd le bonus de '+c.nom:'')+'.'}).join(' '));
    morts.forEach(x=>{
      const c=avant&&(avant.find(a=>(a.p===x.p&&Math.abs(a.l-x.l)+Math.abs(a.k-x.k)===1)||(a.p!==x.p&&a.l===x.l&&a.k===x.k))||avant.find(a=>a.p===x.p&&a.k===x.k&&a.l<x.l&&idEff(s.j[x.p].grille[x.l][x.k])==='025')||avant.find(a=>duoMort(s,a,x))); /* Shifukuro */
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
    const vs=voisins(G,l,k),el=carte(g.c).el;
    vs.forEach(n=>{const t=idEff(n);if(t==='003'||t==='003e')b('voisins',p,g.c,p,n.c)});
    indrasDe(s,p,g.c).forEach(n=>b('favori',p,g.c,p,n.c));
    el.forEach(e=>vs.forEach(n=>{if(carte(n.c).el.includes(e))b('trait',p,g.c,p,n.c)}));
    const f=s.j[1-p].grille[l][k];
    if(f&&el.some(e=>carte(f.c).el.includes(DOMINE[e]))){b('cercle',p,g.c,1-p,f.c);if(CERCLE2[idEff(g)])b('cercle',p,g.c,1-p,f.c)}
    if(idEff(g)==='037e')el.forEach(e=>{const n=vs.find(n=>carte(n.c).el.includes(e));if(n)b('trait',p,g.c,p,n.c)});
    if(idEff(g)==='036e')G.forEach(L=>L.forEach(n=>{if(n&&carte(n.c).el.includes('foudre'))b('survolte',p,g.c,p,n.c)})); /* Spom */
    if(idEff(g)==='025')for(let a=0;a<l;a++){const n=G[a][k];if(golem(n))b('kekwait',p,g.c,p,n.c)} /* Shifukuro */
    if(DUO_MANCHE[idEff(g)]){const [m,w]=DUO_MANCHE[idEff(g)],n=m*duoManches(s,p,k,w);for(let i=0;i<n;i++)b(w?'winstreak':'comeback',p,g.c,p,g.c)} /* Bellock/Loxim */
    {const n=doubleUp(G,l,k,idEff(g));if(n)for(let i=0;i<REGLAGE_DUO.doubleUp;i++)b('doubleup',p,g.c,p,n.c)} /* Bellock/Loxim */
  }
}
function pioche(J,n){for(let i=0;i<n&&J.deck.length;i++)J.main.push(J.deck.shift())}
function debutTour(s){
  const J=s.j[s.joueur];pioche(J,s.tour===1&&s.joueur!==s.premier?1:2); /* 0.2 : le second de la manche ne pioche qu'1 carte a son premier tour */
  const nv=Math.min(graines(J.grille),J.deck.length); /* Velnen : Graine de Golem, +1 par Velnen en jeu, premier tour de manche compris ; deck vide : rien */
  if(nv){pioche(J,nv);declenche(s,'Graine de Golem','Pioche +'+nv);dire(s,s.joueur,'Graine de Golem : pioche '+nv+' carte'+(nv>1?'s':'')+' de plus.')}
  J.energie=J.forge.length;J.aForge=false;J.aAgi=false;
  J.etapeForge=J.main.length>0; /* la Forge passe avant toute action, Faille et Vaisseau compris */
  J.eclair=spoms(J.grille);J.eclairUtil=0; /* Forge eclair, 1 carte de plus par Spom en jeu au debut du tour ; reprises dues en fin de tour */
}
function coutPose(s,p,c,l,k){
  const evo=!!carte(c).base;
  let v=carte(c).cout;
  if(!evo&&!carte(c).animal&&s.terrains[k].nom==='La Boutique')v--; /* « Jouer un Golem ici » : pas un animal */
  if(evo)v+=elessars(s.j[1-p].grille); /* Elessar : +1 par Realisation de l'age adverse en jeu, cumulatif ; pas un ciblage (Mode Avion n'y change rien) */
  return Math.max(0,v);
}
function genre(s,p,l,k){return s.j[p].grille[l][k]?'remplacer':'poser'}
function peutPoser(s,p,c,l,k){
  const J=s.j[p],occ=J.grille[l][k],C=carte(c);
  if(C.animal){if(occ||!maitreVoisin(J.grille,C,l,k))return false} /* case libre, voisine de son maitre en jeu */
  else if(C.base){if(!occ||carte(occ.c).id!==C.base)return false}
  else if(animal(occ)||(C.id==='001'&&s.manche!==1))return false; /* un Golem ne remplace jamais un animal */
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
  const kv=s.terrains.findIndex(t=>t.nom==='Le Vaisseau');
  if(kv>=0&&J.vaisseau!==s.manche){
    const ls=[0,1,2].filter(l=>golem(J.grille[l][kv]));
    ls.forEach((a,i)=>ls.forEach((b,j)=>{if(j>i)r.push({t:'w',k:kv,a,b})}));
  }
  const kf=s.terrains.findIndex(t=>t.nom==='La Faille');
  if(kf>=0&&J.faille!==s.manche){
    const libres=[0,1,2].filter(l=>!J.grille[l][kf]);
    for(let l=0;l<3;l++)for(let k=0;k<3;k++)if(k!==kf&&golem(J.grille[l][k]))libres.forEach(d=>r.push({t:'y',l,k,d}));
  }
  r.push(...caramels(s,p));
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
    case 'g':case 'k':case 'z':return a.t+a.l+a.k;
    case 'h':return 'h'+a.l+a.k+a.m+a.n;
    case 'i':return 'i'+(a.o?1:0); /* Velnen */
    case 'b':return 'b'+a.o.map(b32).join('');
    case 'f':case 'c':case 'd':case 's':case 'j':return a.t+b32(a.c);
    default:return a.t;
  }
}
function decode(x){
  const C='(?:'+CARTE_RE+')'; /* carte sur 1 ou 2 caracteres, coup 'j' */
  if(typeof x!=='string'||!new RegExp('^(m'+C+'{0,3}|p'+C+'[0-2][0-2]|e[0-2]{4}|w[0-2]{3}|y[0-2]{3}|h[0-2]{4}|[gkz][0-2]{2}|i[01]|b'+C+'{1,3}|[fcdsj]'+C+'|[xvna])$').test(x))throw new Error('action illisible');
  const t=x[0],h=h32;
  if(t==='g'||t==='k'||t==='z')return {t,l:+x[1],k:+x[2]};
  if(t==='h')return {t,l:+x[1],k:+x[2],m:+x[3],n:+x[4]};
  if(t==='i')return {t,o:+x[1]}; /* Velnen */
  if(t==='m')return {t,c:cartesDe(x.slice(1)).map(h)};
  if(t==='p')return {t,c:h(x.slice(1,-2)),l:+x[x.length-2],k:+x[x.length-1]};
  if(t==='e')return {t,a:[+x[1],+x[2]],b:[+x[3],+x[4]]};
  if(t==='w')return {t,k:+x[1],a:+x[2],b:+x[3]};
  if(t==='y')return {t,l:+x[1],k:+x[2],d:+x[3]};
  if(t==='b')return {t,o:cartesDe(x.slice(1)).map(h)};
  if(t==='x'||t==='v'||t==='n'||t==='a')return {t};
  return {t,c:h(x.slice(1))};
}
function effetPose(s,p,l,k,g){
  const J=s.j[p];
  if(carte(g.c).id==='029e'&&!('cp' in g))return deguisement(s,p,l,k,g);
  if(carte(g.c).id==='041e'&&!('cp' in g))return imitation(s,p,l,k,g); /* Velnen */
  if(idEff(g)==='025e')return meandyou(s,p,l,k,g); /* Shifukuro : Le moderateur, ou Apo et chansonnier qui l'ont copie */
  const C={id:idEff(g)}; /* le Maitre du deguisement joue l'effet copie */
  if(C.id==='029')gamba(s,p,l,k,g);
  if(C.id==='026')bretagne(s,p);
  if(C.id==='002'){g.f=de(s,p);dire(s,p,'Alrevan lance le dé : Force '+g.f+'.')}
  if(C.id==='002e'){const a=de(s,p),b=de(s,p);g.f=a===b?a:a+b;dire(s,p,'Alrevan (KEKWRevan) lance '+a+' et '+b+' : Force '+g.f+'.')}
  if(C.id==='001e'){
    const cs=[0,1,2].filter(c=>ciblable(s,1-p,l,c,p)),ts=cs.map(c=>nomDetail(carte(s.j[1-p].grille[l][c].c)));
    dire(s,p,ts.length?'Slim K : 1 dégât à '+ts.join(' et ')+'.':'Slim K : aucune cible sur la ligne adverse.');
    cs.forEach(c=>blesse(s,1-p,l,c,1,{p,c:g.c,lib:'À la pose'}));
  }
  if(C.id==='018e')extinction(s,p,g); /* Elessar */
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
  if(C.id==='004'&&J.deck.length)s.attente={t:'q',p,options:J.deck.slice(0,3)};
  if(C.id==='004e'&&J.grille[l][k])s.attente={t:'o',p};
  if(C.id==='007'){
    const n=J.deck.length?1:0;pioche(J,1);
    dire(s,p,n?'Trigas : Spam, pioche 1 carte.':'Trigas : Spam, deck vide.');
    if(J.main.length)s.attente={t:'s',p};
  }
}
/* Elessar : Extinction du feu (Le pomplard, 018e, ou Maitre du deguisement qui l'a copiee), a la pose : chaque Golem adverse en jeu
   qui a l'element Magma perd 1 de Force, comme une blessure. Mode Avion protege (ciblable), Menfou palu aussi (blesse). Les morts : nettoie, apres. */
function extinction(s,p,g){
  const G=s.j[1-p].grille,cs=[],pr=[],n=nomDetail(carte(g.c))+' : Extinction du feu';
  for(let a=0;a<3;a++)for(let b=0;b<3;b++){const h=G[a][b];if(golem(h)&&carte(h.c).el.includes('magma'))(ciblable(s,1-p,a,b,p)?cs:pr).push([a,b])}
  const nm=x=>x.map(([a,b])=>nomDetail(carte(G[a][b].c))).join(' et ');
  if(!cs.length&&!pr.length){dire(s,p,n+', aucun Golem Magma adverse.');return}
  dire(s,p,n+(cs.length?', '+nm(cs)+(cs.length>1?' perdent':' perd')+' 1 de Force':'')+(pr.length?(cs.length?' ; ':', ')+nm(pr)+(pr.length>1?' sont protégés':' est protégé')+' (Mode Avion)':'')+'.');
  cs.forEach(([a,b])=>blesse(s,1-p,a,b,1,{p,c:g.c,lib:'À la pose'}));
}
/* Gamba (Apo, 029) : 1 de. 1-2 : Apo perd 2. 5-6 : le Golem adverse en face perd 2 (Mode Avion le protege, Menfou palu aussi). */
function gamba(s,p,l,k,g){
  const v=de(s,p),n=nomDetail(carte(g.c))+(carte(g.c).id==='029'?'':' (Gamba)');
  if(v<=2){dire(s,p,n+' lance '+v+' : perd 2 de Force.');blesse(s,p,l,k,2,{p,c:g.c,lib:'À la pose'});return}
  if(v<=4){dire(s,p,n+' lance '+v+' : rien ne se passe.');return}
  const h=s.j[1-p].grille[l][k];
  if(!golem(h)){dire(s,p,n+' lance '+v+' : aucun Golem en face.');return}
  if(!ciblable(s,1-p,l,k,p)){dire(s,p,n+' lance '+v+' : '+nomDetail(carte(h.c))+' est protégé (Mode Avion).');return}
  dire(s,p,n+' lance '+v+' : '+nomDetail(carte(h.c))+' perd 2 de Force.');
  blesse(s,1-p,l,k,2,{p,c:g.c,lib:'À la pose'});
}
/* La Bretagne (Titom76, 026) : chaque joueur pioche 1 carte par Golem Brume ou Foudre de sa grille (3 maximum). */
const BRETON=c=>carte(c).el.some(e=>e==='brume'||e==='foudre');
function bretagne(s,p){
  [p,1-p].forEach(q=>{
    const J=s.j[q];let n=0;J.grille.forEach(L=>L.forEach(g=>{if(g&&BRETON(g.c))n++}));n=Math.min(3,n);
    const m=Math.min(n,J.deck.length);pioche(J,n);
    dire(s,q,'La Bretagne : '+(m?'pioche '+m+' carte'+(m>1?'s':'')+'.':'aucune pioche.'));
  });
}
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
    [[l-1,k],[l+1,k],[l,k-1],[l,k+1]].filter(([a,b])=>G[a]&&b>=0&&b<3&&!G[a][b]).forEach(([a,b])=>r.push([l,k,a,b]));
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
  if(cout<C.cout)declenche(s,s.terrains[a.k].nom,'Coût réduit de '+(C.cout-cout)+' pour '+nomDetail(C));
  if(C.base&&cout>C.cout){declenche(s,'Réalisation de l\'âge','Coût +'+(cout-C.cout)+' pour '+nomDetail(C));dire(s,p,'Réalisation de l\'âge : '+nomDetail(C)+' coûte '+(cout-C.cout)+' de plus.')} /* Elessar */
  if(C.base&&occ.d>0)s.stats.ev.push({t:'r',cp:p,cc:a.c,n:occ.d,y:'evolution'});
  J.energie-=cout;J.aAgi=true;J.main.splice(J.main.indexOf(a.c),1);
  const g={c:a.c,f:C.force||0,d:0};
  if(C.base){J.defausse.push(occ.c);dire(s,p,'améliore '+nomDetail(carte(occ.c))+' en '+C.nom+'.');if(C.id==='013e'&&occ.fav!==undefined)g.fav=occ.fav;J.grille.forEach(L=>L.forEach(h=>{if(h&&h.fav===occ.c)h.fav=a.c;if(animal(h)&&h.maitre===occ.c)h.maitre=a.c}))} /* 0.2a.1 : le favori survit a l'evolution d'Indra et a la sienne ; l'animal suit son maitre qui evolue */
  else if(C.animal){const[x,y]=maitreVoisin(J.grille,C,a.l,a.k);g.maitre=J.grille[x][y].c;dire(s,p,'pose '+C.nom+'.')} /* lie au maitre voisin (haut, bas, gauche, droite) */
  else if(occ){dire(s,p,'remplace '+nomDetail(carte(occ.c))+' par '+nomDetail(C)+'.');retire(s,p,a.l,a.k)}
  else dire(s,p,'pose '+nomDetail(C)+'.');
  J.grille[a.l][a.k]=g;
  effetPose(s,p,a.l,a.k,g);
}
/* Mignonitude (Kiwi), avant le decompte : pour chaque Kiwi en jeu (premier joueur de la manche d'abord), un Golem au hasard de chaque grille,
   le sien puis l'adverse, ne compte pas au decompte (g.hors = s.manche) ; il reste en jeu. Puis Kiwi part a la defausse.
   Hasard : generateur du joueur de Kiwi (rejeu identique). Grille sans Golem : rien. Renvoie [{p (joueur de Kiwi), q (grille), l, k, c, f}]. */
function mignonitude(s){
  const r=[];
  [s.premier,1-s.premier].forEach(p=>{
    const J=s.j[p];
    for(let l=0;l<3;l++)for(let k=0;k<3;k++){
      const A=J.grille[l][k];if(!animal(A)||carte(A.c).id!=='901')continue;
      [p,1-p].forEach(q=>{
        const cs=[];s.j[q].grille.forEach((L,a)=>L.forEach((g,b)=>{if(golem(g)&&g.hors!==s.manche)cs.push([a,b])}));
        if(!cs.length){dire(s,p,'Kiwi : Mignonitude, aucun Golem '+(q===p?'dans sa grille':'dans la grille adverse')+'.');return}
        const[a,b]=cs[Math.floor(alea(s.rng,p)*cs.length)],g=s.j[q].grille[a][b],f=forceDe(s,q,a,b),n=nomDetail(carte(g.c));
        g.hors=s.manche;r.push({p,q,l:a,k:b,c:g.c,f});
        s.stats.ev.push({t:'h',sp:p,sc:A.c,cp:q,cc:g.c,n:f,m:s.manche});declenche(s,'Mignonitude',n+(q===p?'':' (adverse)')+' ne compte pas');
        dire(s,p,'Kiwi : Mignonitude, '+n+(q===p?'':' (adverse)')+' ne compte pas au décompte.');
      });
      J.defausse.push(A.c);J.grille[l][k]=null;dire(s,p,'Kiwi part à la défausse.');
    }
  });
  return r;
}
function decompte(s){
  const debut=s.log.length,exclus=mignonitude(s),cols=colonnes(s),gagnants=[];
  noteBonus(s);
  s.forceTotale=[0,1].map(p=>cols.reduce((t,c)=>t+c[p],0));
  cols.forEach((c,k)=>{
    const T=s.terrains[k];let w=null;
    if(c[0]!==c[1])w=c[0]>c[1]?0:1;
    s.stats.t.push({manche:s.manche,terrain:T.nom,k,gagnant:T.nom==='La Salle Verrouillée'&&s.manche<3?null:w,forces:c.slice(),points:T.nom==='La Salle Verrouillée'&&s.manche<3||w===null?0:T.pts});
    if(T.nom==='La Salle Verrouillée'&&s.manche<3){gagnants.push(null);dire(s,null,T.nom+' : '+c[0]+' contre '+c[1]+', ne marque pas encore.');return}
    gagnants.push(w);
    if(w!==null)for(let l=0;l<3;l++){const g=s.j[w].grille[l][k];if(golem(g)&&g.hors!==s.manche)s.stats.ev.push({t:'a',cp:w,cc:g.c,n:forceDe(s,w,l,k)})}
    if(w===null)dire(s,null,T.nom+' : égalité '+c[0]+' partout.');
    else{s.j[w].score+=T.pts;dire(s,w,'marque '+T.nom+' ('+Math.max(c[0],c[1])+' contre '+Math.min(c[0],c[1])+') : +'+T.pts+'.')}
  });
  (s.resultats||(s.resultats=[])).push(gagnants.slice()); /* Bellock/Loxim : resultat de chaque terrain a chaque manche (null : egalite, ou Salle Verrouillee avant la manche 3) */
  s.dernier={colonnes:cols,gagnants,ecran:null,exclus};
  s.reperes.push([debut,s.log.length,s.log.length]); /* debut du decompte, debut des effets, fin des effets */
  return gagnants;
}
function effetsGolems(s,p,gagnants){
  const J=s.j[p],min=Math.min(...s.terrains.map(t=>t.pts));
  const remporte=gagnants.some((w,k)=>w===p&&s.terrains[k].pts===min);
  for(let l=0;l<3;l++)for(let k=0;k<3;k++){
    const g=J.grille[l][k];if(!g)continue;
    const t=idEff(g);
    if(t==='001'){dire(s,p,'KaTarN perd 4 de Force.');blesse(s,p,l,k,4,{p,c:g.c,lib:'Perte de fin de manche'})}
    if(t==='003e'&&remporte){J.score+=2;dire(s,p,'Cyrdan (Roi du Karaoké) : +2 points.')}
  }
}
/* Un terrain pour un joueur. Carrousel et Buzzer peuvent mettre la fin de manche en attente d'un choix. */
function effetTerrain(s,p,k,gagnants){
  const J=s.j[p],nom=s.terrains[k].nom,gagne=gagnants[k]===p;
  if(nom==='Le Carrousel'&&gagne){
    if(J.main.length){s.attente={t:'d',p,src:nom};declenche(s,nom,'Défausse 1 carte')}
    else dire(s,p,'Le Carrousel : main vide, rien à défausser.');
  }
  if(nom==='Le Buzzer'&&gagne){
    if(J.deck.length){s.attente={t:'b',p,options:J.deck.slice(0,3)};declenche(s,nom,'Réordonne');dire(s,p,'Le Buzzer : regarde ses prochaines cartes et les remet dans l\'ordre.')}
    else dire(s,p,'Le Buzzer : deck vide, rien à regarder.');
  }
  if(nom==='L\'Écran du MJ'&&gagne){s.dernier.ecran={p,main:null};declenche(s,nom,'Regarde la main');dire(s,p,'L\'Écran du MJ : regarde la main adverse.')}
  if(nom==='Le Plateau de Jeu'&&gagne){
    const v=de(s,p);declenche(s,nom,'Dé '+v+(v>=5?', +1 point':''));
    if(v>=5){J.score++;dire(s,p,'Le Plateau de Jeu lance '+v+' : +1 point.')}
    else dire(s,p,'Le Plateau de Jeu lance '+v+' : pas de point.');
  }
  if(nom==='Le Camp'){
    const soin=[0,1,2].map(l=>J.grille[l][k]).filter(g=>golem(g)&&g.d>0);
    soin.forEach(g=>{g.d--;s.stats.ev.push({t:'r',cp:p,cc:g.c,n:1,y:'camp'});declenche(s,nom,'Soigne '+nomDetail(carte(g.c)))});
    if(soin.length)dire(s,p,'Le Camp : '+soin.map(g=>nomDetail(carte(g.c))).join(' et ')+(soin.length>1?' récupèrent':' récupère')+' 1 de Force.');
  }
  if(nom==='La Nuit au Village'&&p===s.premier){
    const l=[];
    for(let q=0;q<2;q++)for(let y=0;y<3;y++)if(golem(s.j[q].grille[y][k]))l.push({q,y,v:forceDe(s,q,y,k)});
    if(l.length){
      const min=Math.min(...l.map(x=>x.v)),f=l.filter(x=>x.v===min);
      if(f.length===1){dire(s,null,'La Nuit au Village : '+nomDetail(carte(s.j[f[0].q].grille[f[0].y][k].c))+' est détruit.');declenche(s,nom,'Détruit '+nomDetail(carte(s.j[f[0].q].grille[f[0].y][k].c)));s.stats.cause={p:null,c:null,lib:nom};note(s,'m',1,s.stats.cause,f[0].q,s.j[f[0].q].grille[f[0].y][k].c);retire(s,f[0].q,f[0].y,k)}
      else dire(s,null,'La Nuit au Village : égalité, aucun Golem détruit.');
    }
  }
}
/* File des effets, gardee dans l'etat : le choix d'un joueur la reprend au meme endroit. */
function finManche(s){
  const gagnants=decompte(s);s.fil={gagnants,etapes:[]};
  [s.premier,1-s.premier].forEach(p=>{
    s.fil.etapes.push({p,k:null});
    const ordre=s.premier===0?[0,1,2]:[2,1,0];
    ordre.sort((a,b)=>(s.terrains[a].nom==='Le Buzzer')-(s.terrains[b].nom==='Le Buzzer'));
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
  s.manche++;s.tour=1;s.premier=1-s.premier;s.joueur=s.premier;
  debutTour(s);
}
function passe(s){
  if(s.joueur===s.premier){s.joueur=1-s.premier;debutTour(s);return}
  if(s.tour===3){finManche(s);return}
  s.tour++;s.joueur=s.premier;debutTour(s);
}
function vues(s){
  [0,1].forEach(p=>{const v=s.stats.vues[p],l=s.j[p].main.concat(s.attente&&s.attente.p===p&&s.attente.options||[]);
    l.forEach(c=>{if(!v.includes(c))v.push(c)})});
}
function applique(s,p,a){
  if(a&&a.t==='e'&&a.a&&a.b&&s.attente&&s.attente.t==='u'&&a.a[0]*3+a.a[1]>a.b[0]*3+a.b[1])a={t:'e',a:a.b,b:a.a}; /* Shifukuro : meandyou, paire remise dans l'ordre de lecture */
  const c=code(a);
  if(a.t==='a')return abandonne(s,p);
  if(!legales(s,p).some(x=>code(x)===c))throw new Error('action interdite '+c);
  const J=s.j[p];
  vues(s);
  s.stats.cause=a.t==='p'?{p,c:a.c,lib:'Pose'}:a.t==='w'?{p,c:null,lib:'Le Vaisseau'}:a.t==='y'?{p,c:null,lib:'La Faille'}:a.t==='e'?{p,c:null,lib:'Oracle des Stats'}:null;
  if(a.t==='w')declenche(s,'Le Vaisseau','Échange 2 Golems');
  if(a.t==='y')declenche(s,'La Faille','Déplace 1 Golem');
  if(a.t==='m'){
    a.c.slice().sort((x,y)=>x-y).forEach(i=>{J.main.splice(J.main.indexOf(i),1);J.deck.push(i)});
    melange(s.rng,p,J.deck);pioche(J,a.c.length);
    s.mull[p]=true;
    if(s.mull[0]&&s.mull[1]){s.phase='jeu';debutTour(s)}
  }else if(a.t==='f'){
    J.main.splice(J.main.indexOf(a.c),1);J.forge.push(a.c);J.energie++;J.aForge=true;J.etapeForge=J.eclair>0&&J.main.length>0;dire(s,p,'forge une carte.'); /* l'etape continue s'il reste une Forge eclair */
    forgeDuo(s,p,a.c,true); /* Bellock/Loxim */
  }else if(a.t==='j'){ /* Forge eclair, +1 energie des ce tour, reprise due en fin de tour */
    J.main.splice(J.main.indexOf(a.c),1);J.forge.push(a.c);J.energie++;J.eclair--;J.eclairUtil++;J.etapeForge=(!J.aForge||J.eclair>0)&&J.main.length>0;
    declenche(s,'Forge éclair','Forge 1 carte de plus');dire(s,p,'Spom : Forge éclair, forge 1 carte de plus.');
    forgeDuo(s,p,a.c,true); /* Bellock/Loxim : la Forge eclair compte comme forger */
  }else if(a.t==='n')J.etapeForge=false;
  else if(a.t==='p')agit(s,p,a);
  else if(a.t==='s'){ /* Pas de +1 d'energie ce tour : ce n'est pas l'etape de Forge */
    J.main.splice(J.main.indexOf(a.c),1);J.forge.push(a.c);s.attente=null;dire(s,p,'Trigas : place 1 carte dans sa Forge.');
    forgeDuo(s,p,a.c,false); /* Bellock/Loxim : le Spam compte comme forger */
  }
  else if(a.t==='c'){
    J.deck.splice(J.deck.indexOf(a.c),1);J.main.push(a.c);s.attente=null;dire(s,p,'garde une carte du dessus du deck.');
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
  }else if(a.t==='w'){
    const G=J.grille,x=G[a.a][a.k],y=G[a.b][a.k];
    G[a.a][a.k]=y;G[a.b][a.k]=x;J.vaisseau=s.manche;
    dire(s,p,'Le Vaisseau : échange '+nomDetail(carte(x.c))+' et '+nomDetail(carte(y.c))+'.');nettoie(s);
  }else if(a.t==='y'){
    const G=J.grille,kf=s.terrains.findIndex(t=>t.nom==='La Faille'),g=G[a.l][a.k];
    G[a.d][kf]=g;G[a.l][a.k]=null;J.faille=s.manche;
    dire(s,p,'La Faille : déplace '+nomDetail(carte(g.c))+'.');nettoie(s);
  }else if(a.t==='b'){
    J.deck.splice(0,a.o.length,...a.o);s.attente=null;deroule(s);
  }else if(a.t==='x'){
    s.stats.tours.push({manche:s.manche,tour:s.tour,joueur:p,energieGaspillee:J.energie,pose:J.aAgi});
    J.energie=0;dire(s,p,'finit son tour.');
    reprise(s,p);
    if(J.main.length>7)s.attente={t:'d',p};else passe(s);
  }else if(a.t==='d'){
    J.main.splice(J.main.indexOf(a.c),1);J.defausse.push(a.c);
    if(s.attente.src){dire(s,p,s.attente.src+' : défausse '+nomDetail(carte(a.c))+'.');s.attente=null;deroule(s)}
    else if(J.main.length<=7){s.attente=null;passe(s)}
  }
  vues(s);
  return s;
}
/* fin du tour, avant la defausse a 7 cartes. Une reprise par Forge eclair utilisee ce tour (meme si Spom est mort depuis),
   au hasard du generateur du joueur (rejeu identique) dans toute la Forge, la carte forgee ce tour comprise. */
function reprise(s,p){
  const J=s.j[p];
  for(;J.eclairUtil>0;J.eclairUtil--){
    if(!J.forge.length)continue;
    melange(s.rng,p,J.forge);J.main.push(J.forge.pop());
    declenche(s,'Forge éclair','Reprend 1 carte');dire(s,p,'Spom : Forge éclair, mélange sa Forge et reprend 1 carte en main.');
  }
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
  const J=[0,1].map(()=>({degats:0,morts:0,subis:0,mortsSubies:0,auto:0,cartes:{}})),autres={},hors=[];
  const ligne=(p,c)=>{const n=nomDetail(carte(c));return J[p].cartes[n]||(J[p].cartes[n]={carte:n,poses:0,coutPaye:0,manches:[],degats:0,subis:0,morts:0,mortsSubies:0,auto:0,recuperes:0,forceTerrains:0,
    bonusRecus:{voisins:0,trait:0,cercle:0,favori:0},bonusDonnes:{voisins:0,trait:0,cercle:0,favori:0},sources:{}})};
  s.stats.ev.forEach(e=>{
    if(e.t==='p'){const r=ligne(e.cp,e.cc);r.poses++;r.coutPaye+=e.n;r.manches.push(e.m);if(estAnimal(e.cc))r.animal=true;return}
    if(e.t==='a'){ligne(e.cp,e.cc).forceTerrains+=e.n;return}
    if(e.t==='r'){ligne(e.cp,e.cc).recuperes+=e.n;return}
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
    const bonus=c.bonusDonnes.voisins+c.bonusDonnes.trait+c.bonusDonnes.cercle+c.bonusDonnes.favori+(c.bonusDonnes.survolte||0)+(c.bonusDonnes.kekwait||0)+(c.bonusDonnes.doubleup||0); /* Spom, Shifukuro, Bellock/Loxim */
    const score=c.forceTerrains*P.force+bonus*P.bonus+c.degats*P.degats+c.morts*P.morts;
    if(!mvp||score>mvp.score)mvp={carte:c.carte,joueur:s.fin.gagnant,score,force:c.forceTerrains,bonus,degats:c.degats,morts:c.morts};
  });
  return {joueurs,autres:Object.values(autres),terrains,tours:s.stats.tours,mvp,mignonitude:hors};
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
function valeurForte(s,p){
  const J=s.j[p];let v=0;
  colonnes(s).forEach((c,k)=>{
    const T=s.terrains[k],d=c[p]-c[1-p],reste=3-s.manche;
    const pts=T.nom==='La Salle Verrouillée'?(s.manche<3?2:4):T.pts;
    v+=pts*(d>0?1:d===0?.3:0)+.15*Math.max(-7,Math.min(7,d));
  });
  return v;
}
function valeur(s,p){
  if(s.fort)return valeurForte(s,p);
  return colonnes(s).reduce((t,c,k)=>{
    const T=s.terrains[k],pts=T.pts*(T.nom==='La Salle Verrouillée'&&s.manche<3?.4:1),d=c[p]-c[1-p];
    return t+pts*(d>0?1:d===0?.3:0)+.06*Math.max(-6,Math.min(6,d));
  },0);
}
function utilite(s,p,c){
  const J=s.j[p],C=carte(c);
  if(C.id==='001'&&s.manche!==1)return 0;
  if(C.animal)return J.grille.some(L=>L.some(g=>estMaitreDe(g,C)))?3:J.main.some(q=>carte(q).id===C.maitre)?2:.5; /* Kiwi : utile si son maitre est en jeu ou en main */
  if(C.base){
    const base=q=>carte(q).id===C.base,enJeu=J.grille.some(L=>L.some(g=>g&&base(g.c)));
    return (enJeu?6:J.main.some(base)?3:1)-.5*elessars(s.j[1-p].grille); /* Elessar : evolution plus chere tant qu'un Elessar adverse est en jeu */
  }
  return 5-C.cout*.5;
}
const parUtilite=(s,p,l)=>l.slice().sort((a,b)=>utilite(s,p,b)-utilite(s,p,a)||a-b);
function gainCoup(s,p,a,v0){
  const f=c=>{const G=c.j[p].grille;
    if(a.t==='p'){
      const C=carte(a.c);
      const old=G[a.l][a.k];G[a.l][a.k]={c:a.c,f:C.id==='002'?3.5:C.id==='002e'?6.4:C.force,d:0};
      if(C.id==='013e'&&old&&old.fav!==undefined)G[a.l][a.k].fav=old.fav;
      if(C.base&&old)G.forEach(L=>L.forEach(h=>{if(h&&h.fav===old.c)h.fav=a.c}));
      if(C.id==='001e')c.j[1-p].grille[a.l].forEach((g,q)=>{if(ciblable(c,1-p,a.l,q,p)&&idEff(g)!=='009e')g.d++});
      if(C.id==='029')gambaEstime(c,p,a.l,a.k);
      if(C.id==='018e')extinctionEstime(c,p); /* Elessar */
    }else if(a.t==='w'){const x=G[a.a][a.k];G[a.a][a.k]=G[a.b][a.k];G[a.b][a.k]=x}
    else if(a.t==='y'){G[a.d][s.terrains.findIndex(t=>t.nom==='La Faille')]=G[a.l][a.k];G[a.l][a.k]=null}
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
  if(a.t==='p'&&carte(a.c).animal)g+=mignonEstime(apres,p)-.05; /* Kiwi : Mignonitude estimee sur le plateau actuel, moins la case occupee */
  if(a.t==='p'&&carte(a.c).id==='018')g+=elessarEstime(s,p); /* Elessar : Realisation de l'age gagnee */
  if(a.t==='p'&&carte(a.c).id==='018e')g-=elessarEstime(s,p); /* Elessar : Realisation de l'age perdue en evoluant */
  if(a.t==='p'&&(carte(a.c).id==='041'||carte(a.c).id==='041e')){const r=9-((s.manche-1)*3+s.tour);g+=(carte(a.c).id==='041'?1:-1)*.08*Math.min(4,r)} /* Velnen : Graine de Golem, cartes en plus aux tours suivants (perdue en evoluant) */
  if(a.t==='p'&&carte(a.c).id==='036'&&s.manche*3+s.tour<12)g+=.3; /* Forge eclair aux tours suivants (rien apres le dernier tour) */
  if(a.t==='p'){g-=.03*coutPose(s,p,a.c,a.l,a.k);if(carte(a.c).id==='004'&&s.j[p].deck.length)g+=.5;if(carte(a.c).id==='007')g+=.3;if(FAV_BONUS[carte(a.c).id]&&s.j[p].grille.some(L=>L.some(Boolean)))g+=.3;if(carte(a.c).id==='009'&&slams(s,p).length)g+=.3}
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
function extinctionEstime(c,p){const G=c.j[1-p].grille;for(let a=0;a<3;a++)for(let b=0;b<3;b++){const h=G[a][b];if(golem(h)&&carte(h.c).el.includes('magma')&&ciblable(c,1-p,a,b,p)&&idEff(h)!=='009e')h.d++}}
function elessarEstime(s,p){
  if(s.manche===3&&s.tour===3&&s.joueur!==s.premier)return 0; /* dernier tour de la partie : l'adversaire ne posera plus rien */
  let n=0;s.j[1-p].grille.forEach(L=>L.forEach(g=>{if(golem(g)&&!carte(g.c).base&&TYPES.some(t=>CARTES[t].base===carte(g.c).id))n++}));
  return .1+.1*Math.min(3,n);
}
const BONUS_COPIE={'041':.3,'036':.3,'004':.5,'004e':.3,'007':.3,'007e':.3,'008':.3,'009e':.3,'013':.4,'013e':.9,'026e':.4,'003e':.4};
function gainCopie(c,p,l,k,id){
  const f=d=>{const G=d.j[p].grille[l][k];if(!G)return;G.cp=id;
    if(id==='001'&&d.manche<3)G.d+=4; /* KaTarN : -4 a chaque fin de manche */
    if(id==='001e')d.j[1-p].grille[l].forEach((h,q)=>{if(h&&ciblable(d,1-p,l,q,p)&&idEff(h)!=='009e')h.d++});
    if(id==='002')G.f=3.5;
    if(id==='002e')G.f=6.4;
    if(id==='029')gambaEstime(d,p,l,k);
    if(id==='018e')extinctionEstime(d,p); /* Elessar */
  };
  let v=valeur(simule(c,f),p)+(BONUS_COPIE[id]||0);
  if(id==='009'&&slams(c,p).length)v+=.4;
  if(id==='018')v+=elessarEstime(c,p); /* Elessar */
  if(id==='025e')v+=Math.max(0,gainEchange(c,p,l,k)); /* Shifukuro : meandyou copie, joue depuis la case du copieur */
  if(id==='026'){const n=[p,1-p].map(q=>Math.min(3,c.j[q].grille.flat().filter(h=>h&&BRETON(h.c)).length));v+=.25*Math.min(n[0],c.j[p].deck.length)-.15*Math.min(n[1],c.j[1-p].deck.length)}
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
/* Caramel : seulement si le +1 permet de payer une carte impayable sinon, et que ce coup vaut mieux que le meilleur coup sans lui. */
function caramelUtile(s,p,l,seuil){
  const z=l.find(a=>a.t==='z');if(!z)return null;
  const J=s.j[p],b0=meilleur(s,p,l.filter(a=>a.t!=='z'&&a.t!=='x'));
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
  const du=forgeUtile(s,p,J.main);if(du!==null)return {t:'j',c:du}; /* Bellock/Loxim */
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
  if(t==='c')return {t:'c',c:parUtilite(s,p,l.map(a=>a.c))[0]};
  if(t==='b')return {t:'b',o:parUtilite(s,p,s.attente.options)};
  if(t==='d')return {t:'d',c:parUtilite(s,p,l.map(a=>a.c)).pop()};
  if(t==='s'){const du=forgeUtile(s,p,J.main);return {t:'s',c:du!==null?du:parUtilite(s,p,l.map(a=>a.c)).pop()}} /* Bellock/Loxim : Spam */
  if(t==='v')return l[0];
  if(t==='g')return choixFavori(s,p,l);
  if(t==='k')return choixCopie(s,p,l);
  if(t==='i')return choixImitation(s,p); /* Velnen */
  if(s.attente&&s.attente.t==='u')return choixMeandyou(s,p,l); /* Shifukuro */
  /* Slam : le deplacement qui ameliore le plus la valeur du plateau (perte de 1 comprise, mort eventuelle, bonus perdus). Egalite : premier de la liste. */
  if(t==='h')return meilleur(s,p,l).a;
  if(t==='e')return meilleur(s,p,l).a;
  if(t==='f'||t==='n'||t==='j'){ /* 'j' */
    const cible=Math.min(5,(s.manche-1)*3+s.tour);
    const du=J.main.length>1?forgeUtile(s,p,J.main):null; /* Bellock/Loxim : forge la carte du duo, meme au-dela de la cible */
    if(!J.aForge&&J.main.length>1&&(du!==null||J.forge.length<cible))return {t:'f',c:du!==null?du:parUtilite(s,p,J.main).pop()};
    return eclairRobot(s,p,l)||{t:'n'};
  }
  const z=caramelUtile(s,p,l,.05);if(z)return z;
  const b=meilleur(s,p,l.filter(a=>a.t!=='x'&&a.t!=='z'));
  return b.a&&b.g>.05?b.a:{t:'x'};
}
function robotFort(s,p,l,t){
  const J=s.j[p],F={...s,fort:true};
  if(t==='m')return {t:'m',c:J.main.filter(c=>carte(c).cout>=4||(carte(c).base&&utilite(s,p,c)<3)).slice(0,3)};
  if(t==='c')return {t:'c',c:parUtilite(s,p,l.map(a=>a.c))[0]};
  if(t==='b')return {t:'b',o:parUtilite(s,p,s.attente.options)};
  if(t==='d')return {t:'d',c:forgeForte(s,p)};
  if(t==='s'){const du=forgeUtile(s,p,J.main);return {t:'s',c:du!==null?du:forgeForte(s,p)}} /* Bellock/Loxim : Spam */
  if(t==='v')return l[0];
  if(t==='g')return choixFavori(s,p,l);
  if(t==='k')return choixCopie(F,p,l);
  if(t==='i')return choixImitation(F,p); /* Velnen */
  if(s.attente&&s.attente.t==='u')return choixMeandyou(F,p,l); /* Shifukuro */
  if(t==='h')return meilleur(F,p,l).a;
  if(t==='e')return meilleur(F,p,l).a;
  if(t==='f'||t==='n'||t==='j'){ /* 'j' */
    const cible=Math.min(6,(s.manche-1)*3+s.tour);
    const du=J.main.length>1?forgeUtile(s,p,J.main):null; /* Bellock/Loxim : forge la carte du duo, meme au-dela de la cible */
    return !J.aForge&&J.main.length>1&&(du!==null||J.forge.length<cible)?{t:'f',c:du!==null?du:forgeForte(s,p)}:eclairRobot(s,p,l)||{t:'n'};
  }
  const z=caramelUtile(F,p,l,.01);if(z)return z;
  const q=l.filter(a=>a.t!=='x'&&a.t!=='z');
  /* garde une evolution pour son Golem deja pose : elle vaut mieux qu'une pose faible */
  const b=meilleur(F,p,q);
  return b.a&&b.g>.01?b.a:{t:'x'};
}
const api={VERSION,TRAIT_CUMULE,TAILLE_DECK,DECK_MIN,DECK_MAX,MAX_EX,erreurDeck,deckTexte,lisDeck,POIDS_MVP,bilan,robot,CARTES,TYPES,DOMINE,TERRAINS,carte,nouvelle,legales,applique,attendus,code,decode,rejoue,ecritJournal,litJournal,
  nomDetail,forceDe,ciblable,colonnes,valeurDecompte,coutPose,genre,TYPES_TEST,FAV_BONUS,favori,indrasDe,idEff,foudres,spoms,
  estAnimal,ANIMAL_MAX,maxEx,maitreDe,peutPoser,elessars,graines,COPIEURS,EL_VELNEN,kekwait,echangesMeandyou,DUO,REGLAGE_DUO,duoManches,duoVoisin,doubleUp,partenaires,forgeUtile};

if(typeof module!=='undefined'&&module.exports)module.exports=api;else racine.GolemsMoteur=api;
})(typeof window!=='undefined'?window:globalThis);
