/* Les Golems : moteur pur, sans affichage. Etat = f(graine, journaux). Charge en page et en Node. */
(function(racine){
'use strict';
const VERSION='0.2';
const POIDS_MVP={force:1,bonus:1,degats:1,morts:3};
const CARTES={
 '001':{id:'001',nom:'KaTarN',el:['magma','foudre'],cout:1,force:8,texte:'Pose uniquement en manche 1. Perd 4 de Force à chaque fin de manche.'},
 '001e':{id:'001e',nom:'Slim K',el:['magma','foudre'],cout:4,force:3,base:'001',texte:'À la pose : 1 dégât à chaque Golem de la ligne adverse.'},
 '002':{id:'002',nom:'Alrevan',el:['brume','roche'],cout:3,force:null,texte:'À la pose : 1 dé donne la Force.'},
 '002e':{id:'002e',nom:'KEKWRevan',el:['brume','roche'],cout:3,force:null,base:'002',texte:'High Roll : à la pose, lance 2 dés. Ta Force est leur somme. Sur un double, ta Force est la valeur d\'un seul dé.'},
 '003':{id:'003',nom:'Cyrdan',el:['cristal','roche'],cout:3,force:1,texte:'En jeu : voisins +1.'},
 '003e':{id:'003e',nom:'Roi du Karaoké',el:['cristal','roche'],cout:5,force:2,base:'003',texte:'Voisins +1. Fin de manche : +2 points si tu remportes le terrain qui rapporte le moins.'},
 '004':{id:'004',nom:'Le Q',el:['brume','cristal'],cout:2,force:1,texte:'À la pose : regarde les 3 premières cartes, prends-en 1, replace les autres dessus.'},
 '004e':{id:'004e',nom:'Oracle des Stats',el:['brume','cristal'],cout:3,force:2,base:'004',texte:'À la pose : regarde la main adverse, puis échange 2 de tes Golems.'},
 '007':{id:'007',nom:'Trigas',el:['foudre','brume'],cout:1,force:1,texte:'Spam : à la pose, pioche 1 carte, puis place-en 1 de ta main dans ta Forge.'},
 '007e':{id:'007e',nom:'Roi du Mobile',el:['foudre','brume'],cout:4,force:4,base:'007',texte:'Mode Avion : tu ne peux pas être ciblé par les effets de cartes adverses.'},
 '008':{id:'008',nom:'K-Chan',el:['magma','roche'],cout:2,force:2,texte:'Rage : chaque fois que tu subis des dégâts et survis, gagne +1 de Force (3 maximum).'}
};
const TYPES=['001','001e','002','002e','003','003e','004','004e','007','007e','008'];
const EXEMPLAIRES=3,TAILLE_DECK=TYPES.length*EXEMPLAIRES; /* identifiant = type*3 + exemplaire : 0 a 32 */
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
const b32=i=>i.toString(36); /* 1 caractere par carte, base 36 : 0-9 puis a-z ; les anciens codes restent identiques */

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
    const v=o[id];if(!Number.isInteger(v)||v<0||v>MAX_EX)return 'trop d\'exemplaires de '+CARTES[id].nom;
    n+=v;
  }
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
    phase:'mulligan',mull:[false,false],attente:null,fil:null,dernier:null,forceTotale:[0,0],fin:null,log:[],reperes:[],stats:{ev:[],coups:{},cause:null,t:[],act:[],tours:[],vues:[[],[]]},j:[]};
  for(let p=0;p<2;p++){
    const deck=melange(s.rng,p,idsDeck(lisDeck(dk[p])));
    s.j.push({deck,main:deck.splice(0,5),defausse:[],forge:[],energie:0,score:0,aForge:false,aAgi:false,etapeForge:false,vaisseau:0,faille:0,
      grille:[[null,null,null],[null,null,null],[null,null,null]]});
  }
  return s;
}
function bonus(s,p,l,k){
  const G=s.j[p].grille;let b=0;
  [[l-1,k],[l+1,k],[l,k-1],[l,k+1]].forEach(([a,c])=>{
    const v=G[a]&&G[a][c];if(v){const t=carte(v.c).id;if(t==='003'||t==='003e')b++}
  });
  return b;
}
function voisins(G,l,k){return [[l-1,k],[l+1,k],[l,k-1],[l,k+1]].map(([a,c])=>G[a]&&G[a][c]).filter(Boolean)}
/* Force actuelle = base + capacites + Trait + cercle - degats, partout. */
function forceDe(s,p,l,k){
  const J=s.j[p].grille,g=J[l][k];if(!g)return 0;
  const el=carte(g.c).el,vs=voisins(J,l,k);let v=g.f+(g.ra||0)+bonus(s,p,l,k)-g.d;
  el.forEach(e=>{if(vs.some(n=>carte(n.c).el.includes(e)))v++});
  const f=s.j[1-p].grille[l][k];
  if(f&&el.some(e=>carte(f.c).el.includes(DOMINE[e])))v++;
  return v;
}
const valeurDecompte=forceDe;
const colonnes=s=>[0,1,2].map(k=>[0,1].map(p=>[0,1,2].reduce((t,l)=>t+forceDe(s,p,l,k),0)));
function retire(s,p,l,k){
  const J=s.j[p],g=J.grille[l][k];
  J.defausse.push(g.c);
  J.grille[l][k]=null;
}
/* Statistiques : evenements en lecture seule, aucun effet sur la partie. src = {p,c,lib}, c et p peuvent etre null. */
function note(s,t,n,src,cp,cc,ch){const o={t,n,sp:src.p,sc:src.c,lib:src.lib,cp,cc};if(ch)o.ch=1;s.stats.ev.push(o)}
function declenche(s,nom,e){s.stats.act.push({m:s.manche,nom,e})}
/* Seul point de controle du ciblage : tout effet de carte passe par ici. Les terrains n'y passent pas. */
function ciblable(s,p,l,k,src){
  const g=s.j[p].grille[l][k];
  return !!g&&!(carte(g.c).id==='007e'&&src!==p);
}
const RAGE_MAX=3;
function blesse(s,p,l,k,n,src){
  const g=s.j[p].grille[l][k];g.d+=n;
  if(carte(g.c).id==='008')g.rp=(g.rp||0)+1; /* Rage : tranchee par nettoie, une fois la survie connue */
  note(s,'d',n,src,p,g.c);s.stats.coups[p+''+l+k]=src;
}
function rage(s){
  for(let p=0;p<2;p++)for(let l=0;l<3;l++)for(let k=0;k<3;k++){
    const g=s.j[p].grille[l][k];if(!g||!g.rp)continue;
    const n=Math.min(g.rp,RAGE_MAX-(g.ra||0));delete g.rp;
    if(n>0){g.ra=(g.ra||0)+n;dire(s,p,'K-Chan : Rage, +'+n+' de Force.')}
  }
}
/* Vagues simultanees : tous les Golems a 0 ou moins meurent ensemble, puis on recalcule. */
function nettoie(s){
  let avant=null;
  for(;;){
    const morts=[];
    for(let p=0;p<2;p++)for(let l=0;l<3;l++)for(let k=0;k<3;k++){
      if(s.j[p].grille[l][k]&&forceDe(s,p,l,k)<=0)morts.push({p,l,k,nom:nomDetail(carte(s.j[p].grille[l][k].c))});
    }
    if(!morts.length){s.stats.coups={};rage(s);return}
    if(!avant)dire(s,null,morts.map(x=>x.nom).join(' et ')+(morts.length>1?' meurent.':' meurt.'));
    else dire(s,null,morts.map(x=>{
      const c=avant.find(a=>(a.p===x.p&&Math.abs(a.l-x.l)+Math.abs(a.k-x.k)===1)||(a.p!==x.p&&a.l===x.l&&a.k===x.k));
      return x.nom+' meurt ensuite'+(c?' : il perd le bonus de '+c.nom:'')+'.'}).join(' '));
    morts.forEach(x=>{
      const c=avant&&avant.find(a=>(a.p===x.p&&Math.abs(a.l-x.l)+Math.abs(a.k-x.k)===1)||(a.p!==x.p&&a.l===x.l&&a.k===x.k));
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
    const G=s.j[p].grille,g=G[l][k];if(!g)continue;
    const vs=voisins(G,l,k),el=carte(g.c).el;
    vs.forEach(n=>{const t=carte(n.c).id;if(t==='003'||t==='003e')b('voisins',p,g.c,p,n.c)});
    el.forEach(e=>{const n=vs.find(v=>carte(v.c).el.includes(e));if(n)b('trait',p,g.c,p,n.c)});
    const f=s.j[1-p].grille[l][k];
    if(f&&el.some(e=>carte(f.c).el.includes(DOMINE[e])))b('cercle',p,g.c,1-p,f.c);
  }
}
function pioche(J,n){for(let i=0;i<n&&J.deck.length;i++)J.main.push(J.deck.shift())}
function debutTour(s){
  const J=s.j[s.joueur];pioche(J,s.tour===1&&s.joueur!==s.premier?1:2); /* 0.2 : le second de la manche ne pioche qu'1 carte a son premier tour */
  J.energie=J.forge.length;J.aForge=false;J.aAgi=false;
  J.etapeForge=J.main.length>0; /* la Forge passe avant toute action, Faille et Vaisseau compris */
}
function coutPose(s,p,c,l,k){
  const evo=!!carte(c).base;
  let v=carte(c).cout;
  if(!evo&&s.terrains[k].nom==='La Boutique')v--;
  return Math.max(0,v);
}
function genre(s,p,l,k){return s.j[p].grille[l][k]?'remplacer':'poser'}
function peutPoser(s,p,c,l,k){
  const J=s.j[p],occ=J.grille[l][k],C=carte(c);
  if(C.base){if(!occ||carte(occ.c).id!==C.base)return false}
  else if(C.id==='001'&&s.manche!==1)return false;
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
    if(a.t==='o'){
      const cs=[];J.grille.forEach((L,l)=>L.forEach((g,k)=>{if(g)cs.push([l,k])}));
      if(cs.length<2)r.push({t:'v'});
      else cs.forEach((x,i)=>cs.forEach((y,j)=>{if(j>i)r.push({t:'e',a:x,b:y})}));
    }
    return r;
  }
  if(p!==s.joueur)return r;
  if(J.etapeForge){J.main.forEach(c=>r.push({t:'f',c}));r.push({t:'n'});return r}
  J.main.forEach(c=>{
    for(let l=0;l<3;l++)for(let k=0;k<3;k++)if(peutPoser(s,p,c,l,k))r.push({t:'p',c,l,k});
  });
  const kv=s.terrains.findIndex(t=>t.nom==='Le Vaisseau');
  if(kv>=0&&J.vaisseau!==s.manche){
    const ls=[0,1,2].filter(l=>J.grille[l][kv]);
    ls.forEach((a,i)=>ls.forEach((b,j)=>{if(j>i)r.push({t:'w',k:kv,a,b})}));
  }
  const kf=s.terrains.findIndex(t=>t.nom==='La Faille');
  if(kf>=0&&J.faille!==s.manche){
    const libres=[0,1,2].filter(l=>!J.grille[l][kf]);
    for(let l=0;l<3;l++)for(let k=0;k<3;k++)if(k!==kf&&J.grille[l][k])libres.forEach(d=>r.push({t:'y',l,k,d}));
  }
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
    case 'b':return 'b'+a.o.map(b32).join('');
    case 'f':case 'c':case 'd':case 's':return a.t+b32(a.c);
    default:return a.t;
  }
}
function decode(x){
  if(typeof x!=='string'||!/^(m[0-9a-w]{0,3}|p[0-9a-w][0-2][0-2]|e[0-2]{4}|w[0-2]{3}|y[0-2]{3}|b[0-9a-w]{1,3}|[fcds][0-9a-w]|[xvn])$/.test(x))throw new Error('action illisible');
  const t=x[0],h=q=>parseInt(q,36);
  if(t==='m')return {t,c:[...x.slice(1)].map(h)};
  if(t==='p')return {t,c:h(x[1]),l:+x[2],k:+x[3]};
  if(t==='e')return {t,a:[+x[1],+x[2]],b:[+x[3],+x[4]]};
  if(t==='w')return {t,k:+x[1],a:+x[2],b:+x[3]};
  if(t==='y')return {t,l:+x[1],k:+x[2],d:+x[3]};
  if(t==='b')return {t,o:[...x.slice(1)].map(h)};
  if(t==='x'||t==='v'||t==='n')return {t};
  return {t,c:h(x[1])};
}
function effetPose(s,p,l,k,g){
  const J=s.j[p],C=carte(g.c);
  if(C.id==='002'){g.f=de(s,p);dire(s,p,'Alrevan lance le dé : Force '+g.f+'.')}
  if(C.id==='002e'){const a=de(s,p),b=de(s,p);g.f=a===b?a:a+b;dire(s,p,'Alrevan (KEKWRevan) lance '+a+' et '+b+' : Force '+g.f+'.')}
  if(C.id==='001e'){
    const cs=[0,1,2].filter(c=>ciblable(s,1-p,l,c,p)),ts=cs.map(c=>nomDetail(carte(s.j[1-p].grille[l][c].c)));
    dire(s,p,ts.length?'Slim K : 1 dégât à '+ts.join(' et ')+'.':'Slim K : aucune cible sur la ligne adverse.');
    cs.forEach(c=>blesse(s,1-p,l,c,1,{p,c:g.c,lib:'À la pose'}));
  }
  nettoie(s);
  if(C.id==='004'&&J.deck.length)s.attente={t:'q',p,options:J.deck.slice(0,3)};
  if(C.id==='004e'&&J.grille[l][k])s.attente={t:'o',p};
  if(C.id==='007'){
    const n=J.deck.length?1:0;pioche(J,1);
    dire(s,p,n?'Trigas : Spam, pioche 1 carte.':'Trigas : Spam, deck vide.');
    if(J.main.length)s.attente={t:'s',p};
  }
}
function agit(s,p,a){
  const J=s.j[p],C=carte(a.c),occ=J.grille[a.l][a.k],cout=coutPose(s,p,a.c,a.l,a.k);
  s.stats.ev.push({t:'p',cp:p,cc:a.c,n:cout,m:s.manche});
  if(cout<C.cout)declenche(s,s.terrains[a.k].nom,'Coût réduit de '+(C.cout-cout)+' pour '+nomDetail(C));
  if(C.base&&occ.d>0)s.stats.ev.push({t:'r',cp:p,cc:a.c,n:occ.d,y:'evolution'});
  J.energie-=cout;J.aAgi=true;J.main.splice(J.main.indexOf(a.c),1);
  const g={c:a.c,f:C.force||0,d:0};
  if(C.base){J.defausse.push(occ.c);dire(s,p,'améliore '+nomDetail(carte(occ.c))+' en '+C.nom+'.')}
  else if(occ){dire(s,p,'remplace '+nomDetail(carte(occ.c))+' par '+nomDetail(C)+'.');retire(s,p,a.l,a.k)}
  else dire(s,p,'pose '+nomDetail(C)+'.');
  J.grille[a.l][a.k]=g;
  effetPose(s,p,a.l,a.k,g);
}
function decompte(s){
  const cols=colonnes(s),gagnants=[],debut=s.log.length;
  noteBonus(s);
  s.forceTotale=[0,1].map(p=>cols.reduce((t,c)=>t+c[p],0));
  cols.forEach((c,k)=>{
    const T=s.terrains[k];let w=null;
    if(c[0]!==c[1])w=c[0]>c[1]?0:1;
    s.stats.t.push({manche:s.manche,terrain:T.nom,k,gagnant:T.nom==='La Salle Verrouillée'&&s.manche<3?null:w,forces:c.slice(),points:T.nom==='La Salle Verrouillée'&&s.manche<3||w===null?0:T.pts});
    if(T.nom==='La Salle Verrouillée'&&s.manche<3){gagnants.push(null);dire(s,null,T.nom+' : '+c[0]+' contre '+c[1]+', ne marque pas encore.');return}
    gagnants.push(w);
    if(w!==null)for(let l=0;l<3;l++){const g=s.j[w].grille[l][k];if(g)s.stats.ev.push({t:'a',cp:w,cc:g.c,n:forceDe(s,w,l,k)})}
    if(w===null)dire(s,null,T.nom+' : égalité '+c[0]+' partout.');
    else{s.j[w].score+=T.pts;dire(s,w,'marque '+T.nom+' ('+Math.max(c[0],c[1])+' contre '+Math.min(c[0],c[1])+') : +'+T.pts+'.')}
  });
  s.dernier={colonnes:cols,gagnants,ecran:null};
  s.reperes.push([debut,s.log.length,s.log.length]); /* debut du decompte, debut des effets, fin des effets */
  return gagnants;
}
function effetsGolems(s,p,gagnants){
  const J=s.j[p],min=Math.min(...s.terrains.map(t=>t.pts));
  const remporte=gagnants.some((w,k)=>w===p&&s.terrains[k].pts===min);
  for(let l=0;l<3;l++)for(let k=0;k<3;k++){
    const g=J.grille[l][k];if(!g)continue;
    const t=carte(g.c).id;
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
    const soin=[0,1,2].map(l=>J.grille[l][k]).filter(g=>g&&g.d>0);
    soin.forEach(g=>{g.d--;s.stats.ev.push({t:'r',cp:p,cc:g.c,n:1,y:'camp'});declenche(s,nom,'Soigne '+nomDetail(carte(g.c)))});
    if(soin.length)dire(s,p,'Le Camp : '+soin.map(g=>nomDetail(carte(g.c))).join(' et ')+(soin.length>1?' récupèrent':' récupère')+' 1 de Force.');
  }
  if(nom==='La Nuit au Village'&&p===s.premier){
    const l=[];
    for(let q=0;q<2;q++)for(let y=0;y<3;y++)if(s.j[q].grille[y][k])l.push({q,y,v:forceDe(s,q,y,k)});
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
    s.fin={gagnant:a!==b?(a>b?0:1):x!==y?(x>y?0:1):null,scores:[a,b],departage:a===b};
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
  const c=code(a);
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
    J.main.splice(J.main.indexOf(a.c),1);J.forge.push(a.c);J.energie++;J.aForge=true;J.etapeForge=false;dire(s,p,'forge une carte.');
  }else if(a.t==='n')J.etapeForge=false;
  else if(a.t==='p')agit(s,p,a);
  else if(a.t==='s'){ /* Pas de +1 d'energie ce tour : ce n'est pas l'etape de Forge */
    J.main.splice(J.main.indexOf(a.c),1);J.forge.push(a.c);s.attente=null;dire(s,p,'Trigas : place 1 carte dans sa Forge.');
  }
  else if(a.t==='c'){
    J.deck.splice(J.deck.indexOf(a.c),1);J.main.push(a.c);s.attente=null;dire(s,p,'garde une carte du dessus du deck.');
  }else if(a.t==='v')s.attente=null;
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
    if(J.main.length>7)s.attente={t:'d',p};else passe(s);
  }else if(a.t==='d'){
    J.main.splice(J.main.indexOf(a.c),1);J.defausse.push(a.c);
    if(s.attente.src){dire(s,p,s.attente.src+' : défausse '+nomDetail(carte(a.c))+'.');s.attente=null;deroule(s)}
    else if(J.main.length<=7){s.attente=null;passe(s)}
  }
  vues(s);
  return s;
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
    }
  }catch(e){return {etat:s,erreur:e.message,lus:i}}
  return {etat:s,erreur:null,lus:i};
}
/* Bilan par joueur, par carte et par terrain. Les degats sur son propre camp sont a part (auto).
   Bonus : comptes a chaque decompte de fin de manche. */
function bilan(s){
  const J=[0,1].map(()=>({degats:0,morts:0,subis:0,mortsSubies:0,auto:0,cartes:{}})),autres={};
  const ligne=(p,c)=>{const n=nomDetail(carte(c));return J[p].cartes[n]||(J[p].cartes[n]={carte:n,poses:0,coutPaye:0,manches:[],degats:0,subis:0,morts:0,mortsSubies:0,auto:0,recuperes:0,forceTerrains:0,
    bonusRecus:{voisins:0,trait:0,cercle:0},bonusDonnes:{voisins:0,trait:0,cercle:0},sources:{}})};
  s.stats.ev.forEach(e=>{
    if(e.t==='p'){const r=ligne(e.cp,e.cc);r.poses++;r.coutPaye+=e.n;r.manches.push(e.m);return}
    if(e.t==='a'){ligne(e.cp,e.cc).forceTerrains+=e.n;return}
    if(e.t==='r'){ligne(e.cp,e.cc).recuperes+=e.n;return}
    if(e.t==='b'){ligne(e.p,e.r).bonusRecus[e.y]++;ligne(e.dp,e.d).bonusDonnes[e.y]++;return}
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
  if(s.fin&&s.fin.gagnant!==null)joueurs[s.fin.gagnant].cartes.forEach(c=>{
    const bonus=c.bonusDonnes.voisins+c.bonusDonnes.trait+c.bonusDonnes.cercle;
    const score=c.forceTerrains*P.force+bonus*P.bonus+c.degats*P.degats+c.morts*P.morts;
    if(!mvp||score>mvp.score)mvp={carte:c.carte,joueur:s.fin.gagnant,score,force:c.forceTerrains,bonus,degats:c.degats,morts:c.morts};
  });
  return {joueurs,autres:Object.values(autres),terrains,tours:s.stats.tours,mvp};
}
/* Robot : deterministe, ne regarde que ce qu'un joueur voit (sa main, les grilles, les options proposees). */
function simule(s,f){
  const c={...s,j:s.j.map(J=>({...J,grille:J.grille.map(L=>L.map(g=>g&&{...g}))}))};
  f(c);
  for(let n=1;n;){n=0;
    const m=[];for(let p=0;p<2;p++)for(let l=0;l<3;l++)for(let k=0;k<3;k++)if(c.j[p].grille[l][k]&&forceDe(c,p,l,k)<=0)m.push([p,l,k]);
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
  if(C.base){
    const base=q=>carte(q).id===C.base,enJeu=J.grille.some(L=>L.some(g=>g&&base(g.c)));
    return enJeu?6:J.main.some(base)?3:1;
  }
  return 5-C.cout*.5;
}
const parUtilite=(s,p,l)=>l.slice().sort((a,b)=>utilite(s,p,b)-utilite(s,p,a)||a-b);
function gainCoup(s,p,a,v0){
  const f=c=>{const G=c.j[p].grille;
    if(a.t==='p'){
      const C=carte(a.c);
      G[a.l][a.k]={c:a.c,f:C.id==='002'?3.5:C.id==='002e'?6.4:C.force,d:0};
      if(C.id==='001e')c.j[1-p].grille[a.l].forEach((g,q)=>{if(ciblable(c,1-p,a.l,q,p))g.d++});
    }else if(a.t==='w'){const x=G[a.a][a.k];G[a.a][a.k]=G[a.b][a.k];G[a.b][a.k]=x}
    else if(a.t==='y'){G[a.d][s.terrains.findIndex(t=>t.nom==='La Faille')]=G[a.l][a.k];G[a.l][a.k]=null}
    else if(a.t==='e'){const[x,y]=a.a,[u,w]=a.b,q=G[x][y];G[x][y]=G[u][w];G[u][w]=q}
  };
  let g=valeur(simule(s,f),p)-v0;
  if(a.t==='p'){g-=.03*coutPose(s,p,a.c,a.l,a.k);if(carte(a.c).id==='004'&&s.j[p].deck.length)g+=.5;if(carte(a.c).id==='007')g+=.3}
  return g;
}
function meilleur(s,p,l){
  const v0=valeur(s,p);let m=null,g=-Infinity;
  l.forEach(a=>{const x=gainCoup(s,p,a,v0);if(x>g){g=x;m=a}});
  return {a:m,g};
}
function alea2(s,p,sel){let h=(s.graine^Math.imul(s.log.length+s.stats.tours.length*97+sel,2654435761)^p)|0;h=Math.imul(h^(h>>>15),h|1);h^=h+Math.imul(h^(h>>>7),h|61);return ((h^(h>>>14))>>>0)/4294967296}
function forgeForte(s,p){return parUtilite(s,p,s.j[p].main).pop()}
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
  if(t==='s')return {t:'s',c:parUtilite(s,p,l.map(a=>a.c)).pop()};
  if(t==='v')return l[0];
  if(t==='e')return meilleur(s,p,l).a;
  if(t==='f'||t==='n'){
    const cible=Math.min(5,(s.manche-1)*3+s.tour);
    if(J.forge.length<cible&&J.main.length>1)return {t:'f',c:parUtilite(s,p,J.main).pop()};
    return {t:'n'};
  }
  const b=meilleur(s,p,l.filter(a=>a.t!=='x'));
  return b.a&&b.g>.05?b.a:{t:'x'};
}
function robotFort(s,p,l,t){
  const J=s.j[p],F={...s,fort:true};
  if(t==='m')return {t:'m',c:J.main.filter(c=>carte(c).cout>=4||(carte(c).base&&utilite(s,p,c)<3)).slice(0,3)};
  if(t==='c')return {t:'c',c:parUtilite(s,p,l.map(a=>a.c))[0]};
  if(t==='b')return {t:'b',o:parUtilite(s,p,s.attente.options)};
  if(t==='d')return {t:'d',c:forgeForte(s,p)};
  if(t==='s')return {t:'s',c:forgeForte(s,p)};
  if(t==='v')return l[0];
  if(t==='e')return meilleur(F,p,l).a;
  if(t==='f'||t==='n'){
    const cible=Math.min(6,(s.manche-1)*3+s.tour);
    return J.forge.length<cible&&J.main.length>1?{t:'f',c:forgeForte(s,p)}:{t:'n'};
  }
  const q=l.filter(a=>a.t!=='x');
  /* garde une evolution pour son Golem deja pose : elle vaut mieux qu'une pose faible */
  const b=meilleur(F,p,q);
  return b.a&&b.g>.01?b.a:{t:'x'};
}
const api={VERSION,TAILLE_DECK,DECK_MIN,DECK_MAX,MAX_EX,erreurDeck,deckTexte,lisDeck,POIDS_MVP,bilan,robot,CARTES,TYPES,DOMINE,TERRAINS,carte,nouvelle,legales,applique,attendus,code,decode,rejoue,ecritJournal,litJournal,
  nomDetail,forceDe,ciblable,colonnes,valeurDecompte,coutPose,genre};
if(typeof module!=='undefined'&&module.exports)module.exports=api;else racine.GolemsMoteur=api;
})(typeof window!=='undefined'?window:globalThis);
