/* Vue diffusion (0.3a) : ecran 1920 x 1080 pour un stream, mis a l'echelle proportionnellement.
   - Vue spectateur (partie en ligne) : le spectateur est toujours en vue diffusion ; « Quitter la partie » le ramene au site (comme l'ancien bouton Quitter).
   - Site d'essai (/essai/) seulement : bouton « Demonstration » dans l'onglet Jouer, partie Golem contre Golem locale (sans serveur ni compte).
   Lit les fonctions d'index.html par window.GOLEMS_UI et le moteur (GOLEMS_UI.M) ; ne modifie ni index.html ni spectateur-ui.js.
   Ici : window.DIFFUSION. CSS : diffusion.css (tout sous #dif). */
(function(){
'use strict';
const ESSAI=location.pathname.split('/')[1]==='essai';
/* couleurs par joueur : en vue joueur, le joueur de l'ecran est toujours en bleu (--moi), meme s'il est le joueur 2 */
const inv=()=>(src==='joueur'||src==='rejeu')&&E&&E.moi===1;
const COL={get 0(){return inv()?'var(--lui)':'var(--moi)'},get 1(){return inv()?'var(--moi)':'var(--lui)'}};
const BAS=()=>(src==='joueur'||src==='rejeu')&&E?E.moi:0; /* joueur affiche en bas (vue joueur : toi ; vue spectateur : joueur 1) */
const mk=(t,c,x)=>{const e=document.createElement(t);if(c)e.className=c;if(x!=null)e.textContent=x;return e};
const U=()=>window.GOLEMS_UI,M=()=>U().M;
const d_=n=>/^[aeiouyhàâäéèêëîïôöùûü]/i.test(n)?"d'":'de '; /* Main d'Alrevan, Victoire de KaTarN */
const re_=x=>x.replace(/[-\/\\^$*+?.()|[\]{}]/g,'\\$&');

/* ---------- Noms de cartes : evolutions en dore, mots a trait d'union jamais coupes ---------- */
let NOMS=null;
function noms(){
  if(NOMS&&NOMS.M===M())return NOMS;
  const C=Object.values(M().CARTES),evo=C.filter(c=>c.base).map(c=>c.nom),tous=[...new Set(C.map(c=>c.nom).concat(M().TERRAINS.map(T=>T.nom)))].sort((a,b)=>b.length-a.length);
  NOMS={M:M(),evo:new Set(evo),re:new RegExp('('+tous.map(re_).join('|')+')'),reEvo:new RegExp('('+evo.sort((a,b)=>b.length-a.length).map(re_).join('|')+')')};
  return NOMS;
}
const nb=x=>{const f=document.createDocumentFragment();x.split(/(\S+-\S+)/).forEach((m,i)=>{if(!m)return;f.append(i%2?mk('span','d-nw',m):m)});return f};
const nbEvo=x=>{const f=document.createDocumentFragment();x.split(noms().reEvo).forEach((m,i)=>{if(!m)return;f.append(i%2?mk('span','d-evo d-nw',m):nb(m))});return f};
/* Journal (charte, 9 nov.) : noms de cartes, terrains et effets en couleur de leur type, sans gras, cliquables (zoom) : texteLog commun (vue/joueur.js) */
const nbCartes=x=>{const u=U();if(u&&u.texteLog)return u.texteLog(x);const f=document.createDocumentFragment();f.append(x);return f};
/* 0.6a : forme courte des noms (charte, 10 nov.) dans le journal, les bilans de manche et l'ecran de fin : « Trigas », « Trigas ★ », nom complet au survol */
const nbCourt=x=>{const u=U();if(u&&u.texteLog)return u.texteLog(x,null,true);const f=document.createDocumentFragment();f.append(x);return f};
const nomCourtC=C=>C.base&&M().CARTES[C.base]?M().CARTES[C.base].nom+' ★':C.nom;

/* ---------- Etat de la vue ---------- */
let D=null,scene=null,src=null,E=null; /* src : 'spec' ou 'demo' ; E : {etat, noms, avatars, uids} */
let suivi=null; /* memoire entre deux peintures : poses vues, halo, manches et fin deja annoncees */
function neufSuivi(){return {nev:-1,der:null,lieu:{},halo:null,nt:-1,fin:false,pop:null,vu:null,vol:null,morts:[],flash:{},snap:null,arr:{},pq:null,vols:[],popT:0,etArr:[],fx:[],traits:[],gr:null,nrep:-1,decT:0,tenus:[],an:[]}}
/* Animations (0.3a) : pose qui glisse de la main a la case, Golem detruit qui s'efface, Force qui clignote, moments forts du journal.
   Purement visuelles : la vue est repeinte a chaque action, chaque animation est rejouee ou elle en etait (delai negatif) ;
   aucune n'attend ni ne retarde la partie. prefers-reduced-motion : ni glissement ni clignotement. */
const REDUIT=matchMedia('(prefers-reduced-motion: reduce)');
let VOL,EFFACE,FLASH,LUEUR,HALO,KV=1;
/* 0.6 : durees de la 0.4 (vue/partie.js) : carte jouee en grand puis glissade 1,95 s, pioche 450 ms (140 ms d'ecart), Forge 600, Defausse 500, detruit 450, etoile 700 */
let GRAND,PIOCHE,PAS_P,FORGE,DEFAUSSE,DETRUIT,ETOILE,PAS_E;
/* rejeu a x2 / x4 : toutes les durees divisees par la vitesse */
function vitesseAnims(k){KV=k||1;const d=x=>x/KV;VOL=d(500);EFFACE=d(650);FLASH=d(1000);LUEUR=d(1600);HALO=d(1200);
  GRAND=d(1950);PIOCHE=d(450);PAS_P=d(140);FORGE=d(600);DEFAUSSE=d(500);DETRUIT=d(450);ETOILE=d(700);PAS_E=d(500)}
vitesseAnims(1);
let couche=null,finVol=0;
const delai=t=>((t-performance.now())/1000)+'s';
/* rectangle d'un element dans le repere de la scene (1920 x 1080, avant mise a l'echelle) */
function rectScene(e){const r=e.getBoundingClientRect(),R=scene.getBoundingClientRect(),k=R.width/1920||1;return {x:(r.left-R.left)/k,y:(r.top-R.top)/k,w:r.width/k,h:r.height/k}}
const caseDe=(p,l,k,racine)=>(racine||scene).querySelector('.p-case[data-p="'+p+'"][data-l="'+l+'"][data-k="'+k+'"]');
/* Golems en jeu : cle joueur:carte -> [l,k,Force affichee] */
function photo(s){const Mo=M(),r={};for(let p=0;p<2;p++)for(let l=0;l<3;l++)for(let k=0;k<3;k++){const g=s.j[p].grille[l][k];if(g&&!Mo.carte(g.c).animal)r[p+':'+g.c]=[l,k,Mo.forceDe(s,p,l,k),g.hors===s.manche]}return r}
/* Avant de vider la scene : nouvelles poses (depart dans la main), Golems detruits (copie de leur case), Forces changees */
function prepareAnims(s,premier,nev0){
  const t=performance.now(),Mo=M(),ap=photo(s),av=suivi.snap,pv=suivi.pq,G0=suivi.gr,G1=grilles(s),nr0=suivi.nrep;suivi.snap=ap;suivi.pq=tas(s);suivi.gr=G1;suivi.nrep=s.reperes.length;
  suivi.decT=0;
  if(premier)return;
  const ev=s.stats.ev;let pose=null;const morts=[],X={recup:[],degs:[],ani:null};
  for(let i=Math.max(0,nev0);i<ev.length;i++){const e=ev[i];if(e.t==='p')pose=e;else if(e.t==='m')morts.push(e);else if(e.t==='r'&&e.y!=='evolution')X.recup.push(e);else if(e.t==='d')X.degs.push(e)}
  let t0=t; /* debut des effets de cette action : a l'arrivee de la carte posee */
  /* Choix a faire tout de suite par ce joueur (Elccino : Cafe du matin, La taupe) : pas de vol, la tuile est deja en place pendant le choix */
  const A=s.attente,choix=src==='joueur'&&A&&A.p===E.moi&&(A.t==='cafe'||A.t==='taupe');
  if(choix&&suivi.vol){suivi.vol=null;if(couche)couche.querySelectorAll('.d-vole').forEach(i=>i.remove())}
  if(pose&&scene){const x=chercheCarte(s,pose.cp,pose.cc);
    if(x&&!REDUIT.matches&&!choix){
      const b=scene.querySelector('.d-col[data-p="'+pose.cp+'"] button[data-c="'+pose.cc+'"]'),zm=scene.querySelector('.d-col[data-p="'+pose.cp+'"] .d-main');
      let de=b?rectScene(b):zm?rectScene(zm):null;
      if(de&&!b)de={x:de.x+de.w/2-51,y:de.y,w:103,h:144};
      const ca=caseDe(pose.cp,x[0],x[1]),vi=ca&&ca.querySelector(':scope>.mini');
      if(de){t0=t+GRAND;suivi.vol={p:pose.cp,c:pose.cc,l:x[0],k:x[1],de,fin:t0,vieux:vi?vi.cloneNode(true):null,vevo:!!(ca&&ca.classList.contains('evo')),lance:false}}}
    if(suivi.halo&&suivi.halo.c===pose.cc)suivi.halo.t=t0;
    /* 0.6a : animal attache (pas de case a lui) : il part de la main vers son maitre */
    const PA=Mo.carte(pose.cc),mt=PA&&PA.animal&&suivi.pq&&suivi.pq[pose.cp].g[pose.cc];if(mt&&!choix)X.ani={p:pose.cp,c:pose.cc,l:mt[0],k:mt[1],de:rectMain(pose.cp,pose.cc)};}
  /* Golems detruits par cette action : ils s'effacent ensemble */
  if(av&&scene)morts.forEach(e=>{const o=av[e.cp+':'+e.cc];if(!o)return;const ca=caseDe(e.cp,o[0],o[1]),vi=ca&&ca.querySelector(':scope>.mini:not(.d-fantome):not(.d-vieux)');
    if(vi)suivi.morts.push({p:e.cp,l:o[0],k:o[1],n:vi.cloneNode(true),t:t0});
    anPlus(t0,1150,q=>anBrise(q,e.cp,o[0],o[1]))});
  /* Force affichee changee (meme Golem) : vert si elle monte, rouge si elle baisse */
  if(av&&!REDUIT.matches)Object.keys(ap).forEach(q=>{const o=av[q];if(o&&o[2]!==ap[q][2])suivi.flash[q]={h:ap[q][2]>o[2],t:t0}});
  if(pv&&scene&&!REDUIT.matches)mouvements(s,pv,suivi.pq,t,t0,nev0);
  if(scene)effetsCases(s,G0,G1,av,ap,t,t0,pose,morts,nr0>=0&&s.reperes.length>nr0,X);
}
/* ---------- 0.6 : effets sur les cases de la 0.4 (vue/partie.js), portes dans #dif ----------
   arrive, fx-evo (eclat d'evolution), traits entre cartes (.v-lien) + fx-lien, bonus « +n », degat « -n » + frappe, secoue,
   compte « +n » et fx-hors au decompte, bascule (Energie, score). Memes classes CSS que la 0.4 (css/partie.css). */
/* Lancers de des (0.4 : #des) : Alrevan, KEKWRevan, Le Plateau de Jeu, Gamba d'Apo ; meme fenetre, dans la couche de #dif */
const DES_RE=[[/^Alrevan lance le dé : Force (\d+)\.$/,m=>['Alrevan',[+m[1]],'Force '+m[1]]],
  [/^Alrevan \(KEKWRevan\) lance (\d) et (\d) : Force (\d+)\.$/,m=>['Alrevan (KEKWRevan)',[+m[1],+m[2]],'Force '+m[3]]],
  [/^Le Plateau de Jeu lance (\d) : (.+)\.$/,m=>['Le Plateau de Jeu',[+m[1]],m[2]]],
  [/^(Apo|(?:Apo \(Maître du déguisement\)|Velnen \(Le chansonnier\)) \(Gamba\)) lance (\d) : (.+)\.$/,m=>[m[1]==='Apo'?'Apo (Gamba)':m[1],[+m[2]],m[3].charAt(0).toUpperCase()+m[3].slice(1)]]];
const desF={L:[],t:0,el:null,iv:0};
function des(s,t0){const n0=suivi.nlog!=null?suivi.nlog:s.log.length;
  let t=Math.max(t0,desF.fin||0);
  for(let i=n0;i<s.log.length;i++){const[p,x]=s.log[i];for(const[re,f]of DES_RE){const m=re.exec(x);if(m){const[nm,v,r]=f(m);desF.L.push({p,nm,v,r,t});t+=(REDUIT.matches?1700:2700)/KV;break}}}
  desF.fin=t;if(!desF.cur)desSuite()}
function desStop(){desF.L=[];desF.cur=null;desF.fin=0;clearTimeout(desF.t);clearInterval(desF.iv);if(desF.el)desF.el.remove();desF.el=null}
function desSuite(){
  clearTimeout(desF.t);const o=desF.L[0];if(!o||!D){if(desF.el&&!desF.cur){desF.el.remove();desF.el=null}return}
  const now=performance.now();if(now<o.t){desF.t=setTimeout(desSuite,o.t-now);return}
  desF.L.shift();desF.cur=o;clearInterval(desF.iv);if(!desF.el||!couche||!couche.contains(desF.el)){desF.el=mk('div','d-des');desF.el.setAttribute('role','status');if(couche)couche.append(desF.el)}
  const b=desF.el,fa=mk('div','faces'),re=mk('p');b.textContent='';b.append(mk('h3','',(src==='joueur'&&o.p===E.moi?'Toi':nom(o.p))+' : '+o.nm),fa,re);
  const svg=window.deSvg||(v=>String(v)),faces=a=>{fa.innerHTML=a.map(svg).join('')};
  const finit=()=>{clearInterval(desF.iv);b.classList.remove('roule');faces(o.v);re.textContent=o.r;desF.t=setTimeout(()=>{desF.cur=null;if(!desF.L.length&&desF.el){desF.el.remove();desF.el=null}desSuite()},1700/KV)};
  if(REDUIT.matches){finit();return}
  b.classList.add('roule');const h=()=>faces(o.v.map(()=>1+Math.floor(Math.random()*6)));h();desF.iv=setInterval(h,90);desF.t=setTimeout(finit,1000/KV);
}
function grilles(s){return s.j.map(J=>J.grille.map(r=>r.map(g=>g?{c:g.c,hors:g.hors}:null)))}
const COUL=e=>'var(--'+e+')';
function liens(G){
  const Mo=M(),t={},c={},el=x=>{const C=Mo.carte(x.c);return C&&!C.animal&&C.el?C.el:[]};
  for(let p=0;p<2;p++)for(let l=0;l<3;l++)for(let k=0;k<3;k++){const g=G[p][l][k];if(!g)continue;const E=el(g);
    [[l,k+1],[l+1,k]].forEach(([x,y])=>{const n=G[p][x]&&G[p][x][y];if(n)E.filter(e=>el(n).includes(e)).forEach(e=>{t[[p,l,k,x,y,e]]={p,l,k,x,y,e}})});
    const f=G[1-p][l][k],m=f&&Mo.DOMINE&&E.find(e=>el(f).includes(Mo.DOMINE[e]));if(m)c[[p,l,k]]={p,l,k,e:m}}
  return {t,c};
}
function effetsCases(s,G0,G1,av,ap,t,t0,pose,morts,dec,X){
  const F=suivi.fx,Mo=M(),K=x=>x/KV,cs=(p,l,k)=>[p,l,k];
  const fx=(o,q,ms)=>F.push(Object.assign({t:q,ms:K(ms)},o));
  /* pose : la carte arrive dans sa case ; evolution : eclat dore */
  if(pose){const x=chercheCarte(s,pose.cp,pose.cc);if(x){fx({cs:cs(pose.cp,x[0],x[1]),classe:'arrive',mini:true},t0,480);
    const C=Mo.carte(pose.cc);if(C&&C.base)anPlus(t0,1000,q=>anEvo(q,pose.cp,x[0],x[1]))}}
  /* 0.6a : animal glisse sous son maitre : rebond du maitre, pastille verte qui eclot, Force qui saute */
  if(X&&X.ani){const a=X.ani,c=cs(a.p,a.l,a.k);anPlus(t,1150,q=>anAnimal(q,a.p,a.l,a.k,a.c,a.de));
    fx({cs:c,classe:'fx-rebond',mini:true},t+K(480),300);fx({cs:c,classe:'fx-past',sel:'.d-past.vert'},t+K(560),280);fx({cs:c,classe:'fx-saute',sel:'.f'},t+K(580),420)}
  /* 0.6a : copie du Maitre du deguisement et favori d'Indra, lus dans les nouvelles lignes du journal (noms detailles des cartes en jeu) */
  const fav=new Set(),n0=suivi.nlog!=null?suivi.nlog:s.log.length,ou=(nm,pp)=>{for(const q of [pp,1-pp])for(let l=0;l<3;l++)for(let k=0;k<3;k++){const g=s.j[q].grille[l][k];if(g&&Mo.nomDetail(Mo.carte(g.c))===nm)return [q,l,k]}return null};
  for(let i=n0;i<s.log.length;i++){const[p,x]=s.log[i];if(p!==0&&p!==1)continue;let m;
    if((m=/^(.+?) copie (.+)\.$/.exec(x))){const a=ou(m[1],p),b=ou(m[2],p);if(a&&b&&a.join()!==b.join()){const C=Mo.carte(s.j[b[0]].grille[b[1]][b[2]].c),nm=C.base&&Mo.CARTES[C.base]?Mo.CARTES[C.base].nom:C.nom;anPlus(t0,2400,q=>anCopie(q,b,a,nm))}}
    else if((m=/^(.+?) : (.+) devient son favori/.exec(x))){const a=ou(m[1],p),b=ou(m[2],p);if(a&&b){fav.add(b.join());anPlus(t0,850,q=>anFavori(q,a,b));
      fx({cs:b,classe:'fx-past',sel:'.d-past.rose'},t0+K(600),320);fx({cs:b,classe:'fx-saute',sel:'.f'},t0+K(660),420)}}}
  /* Golems qui bougent (Slam, Deguisement, echange...) : ils arrivent dans leur nouvelle case */
  if(av)Object.keys(ap).forEach(q=>{const o=av[q],n=ap[q];if(o&&(o[0]!==n[0]||o[1]!==n[1]))fx({cs:cs(+q.split(':')[0],n[0],n[1]),classe:'arrive',mini:true},t0,480)});
  /* mise des Pronos : « +1 » sur le terrain des paris */
  if(Mo.miseTotale){const mt=Mo.miseTotale(s),k=s.terrains.findIndex(T=>typeof effetTerrain==='function'&&effetTerrain(T,'paris'));if(suivi.mise!=null&&mt>suivi.mise&&k>=0)fx({ter:k,classe:'fx-bonus',texte:'+'+(mt-suivi.mise)},t,1300);suivi.mise=mt}
  des(s,t0);
  if(!G0||!av)return;
  let u=t0;const A=liens(G0),B=liens(G1),nT=Object.keys(B.t).filter(x=>!A.t[x]).map(x=>B.t[x]),nC=Object.keys(B.c).filter(x=>!A.c[x]).map(x=>B.c[x]);
  /* traits : nouveau lien d'element entre voisins (trait), domination de la case d'en face (eclair) */
  nT.forEach(o=>{suivi.traits.push({a:cs(o.p,o.l,o.k),b:cs(o.p,o.x,o.y),c:COUL(o.e),eclair:false,t:u,d:K(1000)});
    [[o.l,o.k],[o.x,o.y]].forEach(([l,k])=>{fx({cs:cs(o.p,l,k),classe:'fx-lien',eclat:true,c:COUL(o.e)},u,1000);fx({cs:cs(o.p,l,k),classe:'fx-bonus',texte:'+1'},u,1300)});u+=K(650)});
  nC.forEach(o=>{suivi.traits.push({a:cs(o.p,o.l,o.k),b:cs(1-o.p,o.l,o.k),c:COUL(o.e),eclair:true,t:u,d:K(800)});
    fx({cs:cs(o.p,o.l,o.k),classe:'fx-lien',eclat:true,c:COUL(o.e)},u,800);fx({cs:cs(o.p,o.l,o.k),classe:'fx-bonus',texte:'+1'},u,1300);u+=K(550)});
  /* Force changee sur place : reste du gain en « +n », perte en « -n » avec frappe ; gros degats ou plusieurs morts : le plateau tremble */
  /* 0.6a : Recuperer (« +n » vert), bonus (chevron « ▲ +n » depuis la carte posee voisine), grosse frappe de 3 ou plus (tremblement de la carte, « -n ») */
  const gros={},rec={},pz=pose&&chercheCarte(s,pose.cp,pose.cc);
  if(X){X.degs.forEach(e=>{if(e.n>=3)gros[e.cp+':'+e.cc]=1});X.recup.forEach(e=>{rec[e.cp+':'+e.cc]=(rec[e.cp+':'+e.cc]||0)+e.n})}
  if(!dec)Object.keys(ap).forEach(q=>{const o=av[q],n=ap[q];if(!o||o[0]!==n[0]||o[1]!==n[1])return;const p=+q.split(':')[0],l=n[0],k=n[1],c=cs(p,l,k);
    const dej=nT.filter(x=>x.p===p&&((x.l===l&&x.k===k)||(x.x===l&&x.y===k))).length+(nC.some(x=>x.p===p&&x.l===l&&x.k===k)?1:0),g=n[2]-o[2],rc=Math.min(Math.max(0,g),rec[q]||0),reste=g-dej-rc;
    if(rc>0){anPlus(t0,950,z=>anRecup(z,p,l,k,rc));fx({cs:c,classe:'fx-saute',sel:'.f'},t0+K(320),420)}
    if(reste>0&&!fav.has(c.join())){const de=pz&&pose.cp===p&&Math.abs(pz[0]-l)+Math.abs(pz[1]-k)===1?cs(p,pz[0],pz[1]):null;anPlus(u,700,z=>anBonus(z,de,c,reste));fx({cs:c,classe:'fx-saute',sel:'.f'},u+K(480),420)}
    else if(g<0){if(gros[q]){anPlus(t0,950,z=>anFrappe(z,p,l,k,-g));fx({cs:c,classe:'fx-tremble',mini:true},t0,340);fx({cs:c,classe:'fx-saute',sel:'.f'},t0+K(150),420)}
      else{fx({cs:c,classe:'fx-deg',texte:String(g)},t0,1500);fx({cs:c,classe:'fx-frappe',mini:true},t0,500)}}});
  if(morts.length>=2&&!REDUIT.matches)fx({plat:true,classe:'fx-secoue'},t0,500);
  /* decompte de fin de manche : chaque Golem compte sa Force (« +n », « +0 » hors decompte), colonne par colonne ; les etoiles partent ensuite */
  if(dec){const ordre=BAS()===0?[0,1,2]:[2,1,0],me=BAS();let d=t+K(350);
    const ex=(s.dernier&&s.dernier.exclus)||[],hx=(p,l,k)=>ex.some(x=>x.q===p&&x.l===l&&x.k===k);
    Object.keys(av).forEach(q=>{const o=av[q];o[3]=o[3]||hx(+q.split(':')[0],o[0],o[1])});
    const vieux=[];Object.keys(av).forEach(q=>{const o=av[q],p=+q.split(':')[0],c=caseDe(p,o[0],o[1]),vi=c&&c.querySelector(':scope>.mini:not(.d-fantome):not(.d-vieux)');if(vi)vieux.push({p,l:o[0],k:o[1],n:vi.cloneNode(true)})});
    Object.keys(av).forEach(q=>{const o=av[q];if(o[3]){const p=+q.split(':')[0];fx({cs:cs(p,o[0],o[1]),classe:'fx-hors',texte:'Hors décompte'},d,7000);fx({cs:cs(p,o[0],o[1]),classe:'fx-frappe',mini:true},d,500)}});
    if(Object.keys(av).some(q=>av[q][3]))d+=K(1100);
    ordre.forEach(k=>{[0,1,2].forEach(l=>[me,1-me].forEach(p=>{const q=Object.keys(av).find(x=>+x.split(':')[0]===p&&av[x][0]===l&&av[x][1]===k);if(!q)return;
      fx({cs:cs(p,l,k),classe:'fx-compte',texte:'+'+(av[q][3]?0:av[q][2])},d,650);d+=K(240)}));d+=K(320)});
    /* plateau de la manche finie garde a l'ecran pendant le decompte (comme fixe(av) en 0.4) */
    const fin=d+K(300);vieux.forEach(v=>suivi.tenus.push(Object.assign(v,{fin})));
    suivi.decT=Math.max(0,d-t);}
}
/* traits entre cartes (0.4 : trace) : dans la couche, du centre d'une case au centre de l'autre */
function lanceTraits(){
  if(!couche||!suivi.traits.length)return;const now=performance.now(),L=suivi.traits;suivi.traits=[];
  L.forEach(o=>{if(now>o.t+o.d)return;const A=caseDe(o.a[0],o.a[1],o.a[2]),B=caseDe(o.b[0],o.b[1],o.b[2]);if(!A||!B)return;
    const a=rectScene(A),b=rectScene(B),x0=a.x+a.w/2,y0=a.y+a.h/2,x1=b.x+b.w/2,y1=b.y+b.h/2;let dp='M'+x0+' '+y0;
    if(o.eclair){const nx=-(y1-y0),ny=x1-x0,n=Math.hypot(nx,ny)||1;for(let i=1;i<7;i++){const q=i/7,f=(i%2?1:-1)*(8+Math.random()*12);dp+='L'+(x0+(x1-x0)*q+nx/n*f)+' '+(y0+(y1-y0)*q+ny/n*f)}}
    dp+='L'+x1+' '+y1;
    const ns='http://www.w3.org/2000/svg',sv=document.createElementNS(ns,'svg'),pa=document.createElementNS(ns,'path');sv.setAttribute('class','d-trait');sv.setAttribute('width','1920');sv.setAttribute('height','1080');
    pa.setAttribute('d',dp);pa.setAttribute('class','v-lien');pa.style.stroke=o.c;pa.style.color=o.c;pa.style.animationDuration=o.d+'ms';pa.style.animationDelay=(o.t-now)+'ms';sv.append(pa);couche.append(sv);
    setTimeout(()=>sv.remove(),o.t+o.d-now+50)});
}
/* effets en cours remis sur les cases a chaque peinture (l'animation reprend ou elle en etait) */
function poseEffets(plat){
  const t=performance.now();suivi.fx=suivi.fx.filter(o=>t<o.t+o.ms);
  suivi.tenus=suivi.tenus.filter(v=>t<v.fin);
  suivi.tenus.forEach(v=>{const c=caseDe(v.p,v.l,v.k,plat);if(!c)return;c.querySelectorAll(':scope>.mini').forEach(m=>m.style.visibility='hidden');const o=v.n.cloneNode(true);o.classList.add('fx-tenu');o.style.visibility='';c.append(o)});
  suivi.fx.forEach(o=>{let z=o.plat?plat:o.ter!=null?plat.querySelectorAll('.d-tr>.p-terrain')[o.ter]:caseDe(o.cs[0],o.cs[1],o.cs[2],plat);if(!z)return;let e=z;
    if(o.mini)e=z.querySelector(':scope>.mini:not(.d-fantome):not(.d-vieux)')||z;
    if(o.sel){e=z.querySelector(':scope>.mini:not(.d-fantome):not(.d-vieux) '+o.sel);if(!e)return}
    if(o.eclat)z.append(e=mk('span',o.classe));else if(o.texte)z.append(e=mk('span',o.classe,o.texte));else e.classList.add(o.classe);
    if(o.c)e.style.setProperty('--c',o.c);e.style.animationDuration=o.ms+'ms';e.style.animationDelay=(o.t-t)+'ms'});
}
/* bascule (0.4) : chiffre qui grossit un instant (score a l'arrivee d'une etoile, Energie qui monte) */
/* 0.6a : score qui recoit une etoile : il brille sans changer de taille ni de couleur */
function lueur(e){if(!e)return;e.classList.remove('d-lueur');void e.offsetWidth;e.style.animationDuration=(700/KV)+'ms';e.classList.add('d-lueur')}
function bascule(e){if(!e||REDUIT.matches)return;e.classList.remove('bascule');void e.offsetWidth;e.style.animationDuration=(750/KV)+'ms';e.classList.add('bascule')}
/* ---------- 0.6 : cartes qui volent entre piles, main et plateau (comme la 0.4), dans la couche de vol ----------
   Piles de chaque joueur avant / apres l'action : pioche (deck ou Forge -> main), main -> Forge / Defausse, Golem ou animal detruit
   ou remplace (case -> Defausse), defausse du deck. Vue joueur : l'adversaire reste cache (verso) pour sa main, sa pioche et sa Forge. */
function tas(s){return [0,1].map(p=>{const J=s.j[p],g={};
  for(let l=0;l<3;l++)for(let k=0;k<3;k++){const v=J.grille[l][k];if(!v)continue;g[v.c]=[l,k];if(v.ani)g[v.ani.c]=[l,k]}
  return {main:J.main.slice(),deck:new Set(J.deck),forge:new Set(J.forge),defausse:new Set(J.defausse),g}})}
const cache=p=>(src==='joueur'||src==='rejeu')&&E&&p!==E.moi;
function mouvements(s,a2,b2,t,t0,nev0){
  const V=suivi.vols,pose=suivi.vol,Mo=M(),ev0=s.stats.ev,mo=new Set();for(let i=Math.max(0,nev0);i<ev0.length;i++)if(ev0[i].t==='m')mo.add(ev0[i].cp+':'+ev0[i].cc);
  for(let p=0;p<2;p++){const a=a2[p],b=b2[p],ori=c=>a.forge.has(c)?'forge':a.deck.has(c)?'deck':a.defausse.has(c)?'defausse':null;
    let np=0,nm=0,nd=0;
    /* pioche : du deck ou de la Forge vers la main */
    b.main.forEach(c=>{if(a.main.includes(c))return;const o=ori(c);if(!o)return;
      V.push({p,c,de:{pile:o},vers:{main:c},t:t+PAS_P*np++,d:PIOCHE,dos:cache(p)})});
    /* main -> Forge, Defausse, deck (mulligan) ou plateau (animal attache) ; la pose sur une case est le vol en grand */
    a.main.forEach(c=>{if(b.main.includes(c))return;const k=b.forge.has(c)?'forge':b.defausse.has(c)?'defausse':b.deck.has(c)?'deck':null;
      const de=rectMain(p,c);if(!de)return;
      if(k)V.push({p,c,deR:de,vers:{pile:k},t:t+120*nm++,d:k==='forge'?FORGE:k==='deck'?PIOCHE:DEFAUSSE,dos:cache(p)});
      else if(b.g[c]&&!(pose&&pose.c===c)&&!(Mo.carte(c)||{}).animal)V.push({p,c,deR:de,vers:{case:b.g[c]},t:t+120*nm++,d:VOL,dos:false})});
    /* Defausse : Golem ou animal detruit, remplace (apres l'arrivee de la carte posee), defausse du deck ou de la Forge */
    b.defausse.forEach(c=>{if(a.defausse.has(c)||a.main.includes(c))return;
      if(a.g[c]){if(mo.has(p+':'+c))return;const ca=caseDe(p,a.g[c][0],a.g[c][1]);V.push({p,c,deR:ca?rectScene(ca):null,de:{case:a.g[c]},vers:{pile:'defausse'},t:t0+90*nd++,d:DETRUIT,dos:false})}
      else{const o=ori(c);if(o)V.push({p,c,de:{pile:o},vers:{pile:'defausse'},t:t+120*nd++,d:DEFAUSSE,dos:false})}});
  }
  /* deck vide (meule) : l'etoile part du deck de celui qui n'a pas pu piocher vers le score de l'autre */
  const ev=s.stats.ev;let ne=0;
  for(let i=Math.max(0,nev0);i<ev.length;i++){const e=ev[i];if(e.t==='dv')V.push({etoile:'+'+e.n,p:1-e.cp,de:{pile:'deck',p:e.cp},t:t+PAS_E*ne++,d:ETOILE})}
}
/* rectangles dans le repere de la scene : pile d'un joueur, carte de sa main, case */
function rectPile(p,k){
  let e=src==='joueur'&&p===E.moi?scene.querySelector('.mq-piles .pile.'+k):null;
  if(!e)e=scene.querySelector('.d-ban .d-j[data-p="'+p+'"] [data-k="'+k+'"]');
  return e?rectScene(e):null;
}
function rectMain(p,c){
  if(cache(p)){const f=scene.querySelector('.mq-haut .mq-fan');if(!f)return null;const r=rectScene(f);return {x:r.x+r.w/2-43,y:r.y+r.h/2-60,w:86,h:120}}
  const b=scene.querySelector('.d-col[data-p="'+p+'"] button[data-c="'+c+'"]');if(b)return rectScene(b);
  const z=scene.querySelector('.d-col[data-p="'+p+'"] .d-main');if(!z)return null;const r=rectScene(z);return {x:r.x+r.w/2-51,y:r.y,w:103,h:144};
}
function rectVers(o,p){if(!o)return null;if(o.pile)return rectPile(o.p!=null?o.p:p,o.pile);if(o.main!=null)return rectMain(p,o.main);
  if(o.case){const c=caseDe(p,o.case[0],o.case[1]);return c?rectScene(c):null}return null}
/* cadre d'une carte (5 x 7) centre sur un rectangle : au moins 84 px de haut (compteurs du bandeau) */
function cadre(r){const h=Math.max(r.h,84),w=h*5/7;return {x:r.x+r.w/2-w/2,y:r.y+r.h/2-h/2,w,h}}
/* lance les vols en attente (apres la peinture : les destinations existent) ; ceux deja lances continuent dans la couche */
function lanceVols(){
  if(!couche||!suivi.vols.length)return;const now=performance.now(),L=suivi.vols;suivi.vols=[];
  L.forEach(v=>{if(now>v.t+v.d)return;
    if(v.etoile){const de=rectVers(v.de,v.p),vers=rectScore(v.p);if(de&&vers)etoileVol(de,vers,v.etoile,v.t,v.d,v.p);return}
    const A0=v.deR||rectVers(v.de,v.p),B0=rectVers(v.vers,v.p);if(!A0||!B0)return;
    const A=cadre(A0),B=cadre(B0),im=mk('img','d-vole d-vole2');im.src=v.dos?imgV('cartes/verso.jpg'):U().srcC(v.c);im.alt='';
    Object.assign(im.style,{left:A.x+'px',top:A.y+'px',width:A.w+'px',height:A.h+'px'});couche.append(im);
    const T='translate('+(B.x-A.x)+'px,'+(B.y-A.y)+'px) scale('+(B.w/A.w)+')';
    const an=im.animate([{transform:'none',opacity:1},{transform:T,opacity:1,offset:.85},{transform:T,opacity:0}],{duration:v.d,delay:Math.max(0,v.t-now),easing:'cubic-bezier(.3,.7,.3,1)',fill:'forwards'});
    an.onfinish=()=>im.remove();an.oncancel=()=>im.remove()});
}
/* score affiche : sans les etoiles encore en vol */
function scoreAff(s,p){return s.j[p].score-(suivi?suivi.etArr.filter(a=>a.p===p).reduce((x,a)=>x+a.n,0):0)}
function majScore(){if(!scene||!E)return;const b=scene.querySelector('.d-sc b'),e=scene.querySelector('.d-sc em');if(b)b.textContent=String(scoreAff(E.etat,BAS()));if(e)e.textContent=String(scoreAff(E.etat,1-BAS()))}
/* score du bandeau : le chiffre du joueur */
function rectScore(p){const e=scene.querySelector('.d-sc '+(p===BAS()?'b':'em'));return e?rectScene(e):null}
function etoileVol(de,vers,txt,t,d,p){
  /* le score du bandeau ne monte qu'a l'arrivee de l'etoile */
  if(p!=null){const n=parseInt(txt,10)||0,S=suivi,a={p,n,t:t+d};S.etArr.push(a);setTimeout(()=>{if(suivi!==S)return;S.etArr=S.etArr.filter(x=>x!==a);majScore();if(scene)lueur(scene.querySelector('.d-sc '+(p===BAS()?'b':'em')))},Math.max(0,t+d-performance.now()))}
  /* 0.6a (maquette 47) : etoile doree qui monte, file en arc vers le score et tourne sur elle-meme */
  const z=mk('div','d-etoile an-etoile','★');if(txt&&txt!=='+1')z.append(mk('b','',txt));couche.append(z);
  const x0=de.x+de.w/2-30,y0=de.y+de.h/2-30,x1=vers.x+vers.w/2-30,y1=vers.y+vers.h/2-30,f=(x,y,k,r)=>'translate('+x+'px,'+y+'px) scale('+k+') rotate('+r+'deg)';
  const an=z.animate([{transform:f(x0,y0,.5,0),opacity:0},{transform:f(x0,y0-20,1.2,0),opacity:1,offset:.15},{transform:f((x0+x1)/2,(y0+y1)/2-90,1.1,180),opacity:1,offset:.55},
    {transform:f(x1,y1,.8,360),opacity:1,offset:.92},{transform:f(x1,y1,.4,360),opacity:0}],{duration:d,delay:Math.max(0,t-performance.now()),easing:'ease-in-out',fill:'forwards'});
  an.onfinish=()=>z.remove();an.oncancel=()=>z.remove();
}
/* ---------- 0.6a : animations de la maquette 47 (validees par Romain le 10 nov.) ----------
   Lancees une fois apres la peinture (cases et piles en place), dans la couche gardee d'une peinture a l'autre ;
   ce que porte la tuile elle-meme (rebond, tremblement, pastille, Force) passe par suivi.fx (classes CSS, delai negatif).
   Mouvements reduits : ni deplacement ni tremblement, fondus et couleurs seulement. Rejeu : durees divisees par la vitesse (KV). Images jamais modifiees. */
function anA(el,kf,o){
  if(REDUIT.matches){if(o.tremble)return null;kf=kf.map(f=>{const g=Object.assign({},f);delete g.transform;return g});if(kf.every(f=>Object.keys(f).every(k=>k==='offset'||k==='easing')))return null}
  const now=performance.now(),de=(o.t!=null?o.t:now)+(o.delay||0)/KV-now,du=(o.duration||300)/KV;if(de+du<=0)return null;
  return el.animate(kf,{fill:o.fill||'both',easing:o.easing||'ease-out',delay:de,duration:du});
}
const anFin=(e,t,ms)=>setTimeout(()=>e.remove(),Math.max(0,t+ms/KV-performance.now())+60);
function anCalque(cl,r,pad,txt){const e=mk('div','an-abs '+cl,txt);if(r){pad=pad||0;Object.assign(e.style,{left:(r.x-pad)+'px',top:(r.y-pad)+'px',width:(r.w+2*pad)+'px',height:(r.h+2*pad)+'px'})}couche.append(e);return e}
const caseR=(p,l,k)=>{const c=caseDe(p,l,k);return c?rectScene(c):null};
/* file d'attente : {t (debut), ms (duree a vitesse 1), f(t)} */
const anPlus=(t,ms,f)=>suivi.an.push({t,ms,f});
function lanceAn(){if(!couche||!suivi.an.length)return;const now=performance.now(),L=suivi.an;suivi.an=[];L.forEach(o=>{if(now<o.t+o.ms/KV)try{o.f(o.t)}catch(e){}})}
/* eclat ★ avec rayons (evolution) */
function anEtoile(cx,cy,t,dl){const s=anCalque('an-etoile',null,0,'★');Object.assign(s.style,{left:(cx-23)+'px',top:(cy-23)+'px',width:'46px',textAlign:'center'});
  anA(s,[{opacity:0,transform:'scale(0) rotate(-40deg)'},{opacity:1,transform:'scale(1.35) rotate(8deg)',offset:.55},{opacity:1,transform:'scale(1) rotate(0)',offset:.8},{opacity:0,transform:'scale(1) rotate(0)'}],{t,delay:dl,duration:640,easing:'cubic-bezier(.3,1.4,.5,1)'});anFin(s,t,dl+700);
  if(REDUIT.matches)return;
  for(let i=0;i<8;i++){const r=anCalque('an-rayon'),a=i*45;Object.assign(r.style,{left:(cx-2)+'px',top:(cy-11)+'px'});
    anA(r,[{opacity:0,transform:'rotate('+a+'deg) translateY(-10px) scaleY(.4)'},{opacity:1,transform:'rotate('+a+'deg) translateY(-34px) scaleY(1)',offset:.4},{opacity:0,transform:'rotate('+a+'deg) translateY(-52px) scaleY(.3)'}],{t,delay:dl+60,duration:420});anFin(r,t,dl+500)}}
/* chiffre qui monte au-dessus d'une case (« +1 » vert de Recuperer, « -3 » rouge d'une grosse frappe) */
function anChiffre(r,txt,cl,t,kf){const p=anCalque('an-chiffre '+cl,null,0,txt);Object.assign(p.style,{left:(r.x+r.w/2-60)+'px',top:(r.y+r.h*.15)+'px',width:'120px',textAlign:'center'});anA(p,kf,{t,duration:850});anFin(p,t,900)}
/* Evolution : cadre dore, lueur qui traverse la carte en diagonale, eclat ★ (t = arrivee de la carte sur sa base) */
function anEvo(t,p,l,k){const r=caseR(p,l,k);if(!r)return;
  const cad=anCalque('an-cadre',r);anA(cad,[{opacity:0},{opacity:1,offset:.25},{opacity:1,offset:.75},{opacity:0}],{t,delay:40,duration:900});
  const rf=anCalque('an-reflet',r),i=mk('i');rf.append(i);anA(i,[{transform:'translateX(-120%) rotate(20deg)'},{transform:'translateX('+(r.w*2.6)+'px) rotate(20deg)'}],{t,delay:60,duration:420,easing:'ease-in-out'});
  if(REDUIT.matches)anA(rf,[{background:'rgba(241,195,90,0)'},{background:'rgba(241,195,90,.35)',offset:.5},{background:'rgba(241,195,90,0)'}],{t,delay:60,duration:420});
  anEtoile(r.x+r.w-6,r.y+4,t,180);anFin(cad,t,1000);anFin(rf,t,500)}
/* Animal : la carte glisse sous son maitre et disparait ; le maitre rebondit, halo vert, la pastille verte eclot, la Force saute */
function anAnimal(t,p,l,k,c,de){const r=caseR(p,l,k);if(!r)return;
  const ch=r.h*1.12,cw=ch*63.5/88.9,x=r.x+r.w/2-cw/2,y=r.y+r.h/2-ch/2,im=mk('img','an-abs an-carte');im.src=U().srcC(c);im.alt='';Object.assign(im.style,{left:x+'px',top:y+'px',width:cw+'px',height:ch+'px'});couche.append(im);
  const dx=de?de.x+de.w/2-(x+cw/2):-300,dy=de?de.y+de.h/2-(y+ch/2):190,sk=de?Math.min(1.2,de.h/ch):1;
  anA(im,[{opacity:0,transform:'translate('+dx+'px,'+dy+'px) rotate(-12deg) scale('+sk+')'},{opacity:1,transform:'translate('+dx*.77+'px,'+dy*.74+'px) rotate(-9deg) scale('+sk+')',offset:.2},{opacity:1,transform:'translate('+dx*.37+'px,'+dy*.32+'px) rotate(-6deg) scale(.95)',offset:.45},
    {opacity:1,transform:'translate('+dx*.07+'px,'+dy*.05+'px) rotate(-1deg) scale(.85)',offset:.75},{opacity:0,transform:'translate(0,0) rotate(0) scale(.75)'}],{t,duration:640,easing:'cubic-bezier(.3,.6,.4,1)'});anFin(im,t,700);
  const h=anCalque('an-halo',r,4);anA(h,[{opacity:0},{opacity:1,offset:.35},{opacity:0}],{t,delay:480,duration:600});anFin(h,t,1100)}
/* Destruction : fissure, puis poussiere qui file vers la Defausse du joueur */
const POUSSIERE=['#c64213','#ee6a2c','#896b10','#f2cb2e','#3a2a20','#e8d9b0'];
function anBrise(t,p,l,k){const r=caseR(p,l,k);if(!r)return;
  const ns='http://www.w3.org/2000/svg',sv=document.createElementNS(ns,'svg');sv.setAttribute('viewBox','0 0 100 100');sv.setAttribute('preserveAspectRatio','none');sv.setAttribute('class','an-abs an-fissure');
  Object.assign(sv.style,{left:r.x+'px',top:r.y+'px',width:r.w+'px',height:r.h+'px',overflow:'visible'});couche.append(sv);
  ['M48 0 L44 22 L55 36 L41 55 L52 72 L46 100','M44 22 L22 30 L6 26','M55 36 L78 42 L96 38','M41 55 L20 64 L3 78','M52 72 L74 80 L92 96'].forEach((d,i)=>{
    for(const[w,col]of[[3.2,'#0a121a'],[1.2,'#fff4d6']]){const q=document.createElementNS(ns,'path');q.setAttribute('d',d);q.setAttribute('fill','none');q.setAttribute('stroke',col);q.setAttribute('stroke-width',w);q.setAttribute('vector-effect','non-scaling-stroke');q.setAttribute('stroke-linejoin','round');q.setAttribute('pathLength','1');q.style.strokeDasharray='1';sv.append(q);
      anA(q,[{strokeDashoffset:1},{strokeDashoffset:0}],{t,delay:i?90+i*30:0,duration:200,easing:'linear'})}});
  anA(sv,[{opacity:1},{opacity:0}],{t,delay:330,duration:250});anFin(sv,t,620);
  if(REDUIT.matches)return;
  const d=rectPile(p,'defausse');if(!d)return;const tx=d.x+d.w*.5,ty=d.y+d.h/2;
  for(let i=0;i<40;i++){const q=anCalque('an-poussiere'),x=r.x+((i*37)%100)/100*r.w,y=r.y+((i*61)%100)/100*r.h;q.style.left=x+'px';q.style.top=y+'px';q.style.background=POUSSIERE[i%POUSSIERE.length];
    const mx=(x+tx)/2+((i%7)-3)*22,my=Math.min(y,ty)-60-((i*13)%50),dl=300+(i%10)*18;
    anA(q,[{opacity:0,transform:'translate(0,0) scale(1)'},{opacity:1,transform:'translate('+((i%5-2)*6)+'px,'+(-6-(i%4)*4)+'px) scale(1.1)',offset:.12},{opacity:.9,transform:'translate('+(mx-x)+'px,'+(my-y)+'px) scale(.8)',offset:.6},{opacity:0,transform:'translate('+(tx-x)+'px,'+(ty-y)+'px) scale(.3)'}],{t,delay:dl,duration:520,easing:'ease-in'});anFin(q,t,dl+560)}
  const pe=src==='joueur'&&p===E.moi?scene.querySelector('.mq-piles .pile.defausse'):scene.querySelector('.d-ban .d-j[data-p="'+p+'"] [data-k="defausse"]');
  if(pe)anA(pe,[{transform:'scale(1)'},{transform:'scale(1.12)',offset:.4},{transform:'scale(1)'}],{t,delay:800,duration:300,fill:'none'})}
/* Recuperer : lueur verte et « +n » vert qui monte */
function anRecup(t,p,l,k,n){const r=caseR(p,l,k);if(!r)return;
  const g=anCalque('an-lueur-v',r);anA(g,[{opacity:0},{opacity:1,offset:.35},{opacity:0}],{t,duration:850});anFin(g,t,900);
  anChiffre(r,'+'+n,'an-vert',t,[{opacity:0,transform:'translateY(10px) scale(.7)'},{opacity:1,transform:'translateY(-20px) scale(1.05)',offset:.3},{opacity:1,transform:'translateY(-50px) scale(1)',offset:.75},{opacity:0,transform:'translateY(-70px) scale(1)'}])}
/* Grosse frappe (3 degats ou plus) : voile rouge et « -n » (le tremblement est porte par la tuile, fx-tremble) */
function anFrappe(t,p,l,k,n){const r=caseR(p,l,k);if(!r)return;
  const f=anCalque('an-voile-rouge',r);anA(f,[{opacity:0},{opacity:1,offset:.15},{opacity:0}],{t,duration:380});anFin(f,t,420);
  anChiffre(r,'-'+n,'an-rouge',t,[{opacity:0,transform:'scale(1.8)'},{opacity:1,transform:'scale(1)',offset:.2},{opacity:1,transform:'translateY(-22px)',offset:.7},{opacity:0,transform:'translateY(-40px)'}])}
/* Bonus de Force : chevron dore « ▲ +n » de la carte qui le donne (si on la connait) vers celle qui le recoit */
function anBonus(t,de,vers,n){const r=caseR(vers[0],vers[1],vers[2]);if(!r)return;const s=de&&caseR(de[0],de[1],de[2]);
  if(s){const c=anCalque('an-cadre',s);anA(c,[{opacity:0},{opacity:.9,offset:.3},{opacity:0}],{t,duration:520});anFin(c,t,560)}
  const a=s||{x:r.x,y:r.y+r.h*.25,w:r.w,h:r.h},v=anCalque('an-chevron',null,0,'▲ +'+n),x0=a.x+a.w/2-60,y0=a.y+a.h*.3,x1=r.x+r.w/2-60,y1=r.y+r.h*.3;Object.assign(v.style,{left:x0+'px',top:y0+'px',width:'120px',textAlign:'center'});
  anA(v,[{opacity:0,transform:'translate(0,0) scale(.7)'},{opacity:1,transform:'translate(0,-8px) scale(1)',offset:.2},{opacity:1,transform:'translate('+(x1-x0)+'px,'+(y1-y0-(s?0:24))+'px) scale(1)',offset:.75},{opacity:0,transform:'translate('+(x1-x0)+'px,'+(y1-y0-(s?20:40))+'px) scale(.9)'}],{t,duration:650,easing:'ease-in-out'});anFin(v,t,700)}
/* Copie du Maitre du deguisement : silhouette en pointilles du Golem copie qui glisse jusqu'au copieur, contour blanc, etiquette */
function anCopie(t,de,vers,nm){const r=caseR(vers[0],vers[1],vers[2]),c=caseDe(de[0],de[1],de[2]);if(!r||!c)return;const s=rectScene(c),mi=c.querySelector(':scope>.mini');
  const g=anCalque('an-fantome '+(c.parentElement?c.parentElement.className:''),s);g.style.display='block';if(mi){const b=mi.cloneNode(true);b.classList.remove('arrive');g.append(b)}
  anA(g,[{opacity:0,transform:'translate(0,0) scale(1)'},{opacity:.7,transform:'translate(0,-6px) scale(.97)',offset:.2},{opacity:.65,transform:'translate('+(r.x-s.x)+'px,'+(r.y-s.y)+'px) scale(.97)',offset:.7},{opacity:0,transform:'translate('+(r.x-s.x)+'px,'+(r.y-s.y)+'px) scale(.86)'}],{t,duration:700,easing:'ease-in-out'});anFin(g,t,760);
  const o=anCalque('an-blanc',r);anA(o,[{opacity:0},{opacity:1,offset:.3},{opacity:0}],{t,delay:480,duration:420});anFin(o,t,950);
  const e=anCalque('an-etiq',null,0,'Copie : effet de '+nm);Object.assign(e.style,{left:(r.x+r.w/2)+'px',top:(r.y+r.h+10)+'px'});
  anA(e,[{opacity:0,transform:'translate(-50%,6px) scale(.8)'},{opacity:1,transform:'translate(-50%,0) scale(1)',offset:.12},{opacity:1,transform:'translate(-50%,0) scale(1)',offset:.85},{opacity:0,transform:'translate(-50%,0) scale(1)'}],{t,delay:520,duration:1800,easing:'ease-out'});
  if(REDUIT.matches)e.style.transform='translate(-50%,0)';anFin(e,t,2400)}
/* Favori d'Indra : petit coeur rose qui vole d'Indra jusqu'a la pastille « Favori » du Golem choisi */
const COEUR_AN='<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 20.6C6.6 16.9 2.6 13.4 2.6 9.2 2.6 6.4 4.7 4.3 7.3 4.3c1.9 0 3.6 1 4.7 2.7 1.1-1.7 2.8-2.7 4.7-2.7 2.6 0 4.7 2.1 4.7 4.9 0 4.2-4 7.7-9.4 11.4z" fill="currentColor" stroke="#0a121a" stroke-width="1.6" stroke-linejoin="round" paint-order="stroke"/></svg>';
function anFavori(t,de,vers){const s=caseR(de[0],de[1],de[2]),c=caseDe(vers[0],vers[1],vers[2]);if(!s||!c)return;const r=rectScene(c),pa=c.querySelector('.d-past.rose'),q=pa?rectScene(pa):{x:r.x+6,y:r.y+r.h-26,w:60,h:20};
  const tx=q.x+12,ty=q.y+q.h/2,x0=s.x+s.w/2,y0=s.y+s.h/2,cr=anCalque('an-coeur');cr.innerHTML=COEUR_AN;Object.assign(cr.style,{left:(x0-16)+'px',top:(y0-16)+'px'});
  anA(cr,[{opacity:0,transform:'translate(0,0) scale(.4)'},{opacity:1,transform:'translate(0,-16px) scale(1.25)',offset:.18},{opacity:1,transform:'translate('+((tx-x0)/2)+'px,'+((ty-y0)/2-110)+'px) scale(1.1)',offset:.6},{opacity:1,transform:'translate('+(tx-x0)+'px,'+(ty-y0)+'px) scale(.9)',offset:.8},{opacity:0,transform:'translate('+(tx-x0)+'px,'+(ty-y0)+'px) scale(.9)'}],{t,duration:800,easing:'ease-in-out'});anFin(cr,t,850);
  const o=anCalque('an-rose',s);anA(o,[{opacity:0},{opacity:1,offset:.3},{opacity:0}],{t,duration:600});anFin(o,t,650)}
/* Bandeau en travers (debut de manche, victoire, defaite) ; rend la duree a vitesse 1 */
function anBandeau(txt,sous,co,haut,fin){if(!couche||!scene)return 0;const t=performance.now();
  let v=null;if(fin){v=anCalque('an-voile',{x:0,y:0,w:1920,h:1080});anA(v,[{opacity:0},{opacity:1,offset:.15},{opacity:1,offset:.88},{opacity:0}],{t,duration:1650});anFin(v,t,1650)}
  const tr=scene.querySelector('.d-tr'),p=scene.querySelector('.d-plat'),R=fin||!tr||!p?{x:0,y:440,w:1920,h:200}:(()=>{const a=rectScene(tr);return {x:0,y:a.y+a.h/2-60,w:1920,h:120}})(); /* toute la largeur : le texte ne sort jamais de l'ecran */
  const bd=anCalque('an-bandeau'+(fin?'':' an-bandeau-l'),R),sp=mk('span','',txt);bd.style.color=co;if(sous)sp.append(mk('small','',sous));bd.append(sp);
  if(fin){const sc=scene.querySelector('.d-sc');if(sc&&!fin.calme)anA(sc,[{transform:'scale(1)'},{transform:'scale(1.12)',offset:.4},{transform:'scale(1)'}],{t,delay:150,duration:450,fill:'none'});
    anA(sp,[{opacity:0,transform:'scale(.85)'},{opacity:1,transform:'scale(1.03)',offset:.6},{opacity:1,transform:'scale(1)'}],{t,delay:250,duration:450,easing:'cubic-bezier(.3,1.3,.5,1)'});
    anA(sp,[{opacity:1},{opacity:0}],{t,delay:1300,duration:250,fill:'forwards'});anFin(bd,t,1600);return 1500} /* test2j : ~1,5 s (valide par Romain) */
  anA(sp,[{opacity:0,transform:'translateX(-60px)'},{opacity:1,transform:'translateX(0)',offset:.3},{opacity:1,transform:'translateX(0)',offset:.75},{opacity:0,transform:'translateX(60px)'}],{t,duration:1000,easing:'ease-in-out'});
  scene.querySelectorAll('.d-pts i.on').forEach(i=>anA(i,[{filter:'brightness(1)'},{filter:'brightness(1.6) drop-shadow(0 0 8px #f1c35a)',offset:.4},{filter:'brightness(1)'}],{t,delay:200,duration:500,fill:'none'}));
  anFin(bd,t,1050);return 1000}
/* Debut de manche : apres la fermeture du recapitulatif de la manche qui vient de finir */
function anManche(m,n){const s=E&&E.etat;if(!s||s.fin||!D)return;if(Number.isInteger(m)&&s.manche<=m){if((n|0)<25)setTimeout(()=>anManche(m,(n|0)+1),150);return} /* test2j : attendre l'etat de la manche suivante */const q=s.phase==='mulligan'?null:U().quiJoue(s);
  anBandeau('Manche '+s.manche+(q===0||q===1?' - '+(src==='joueur'&&q===E.moi?'Tu commences':nom(q)+' commence'):''),null,'#f1c35a',0,null)}
/* Victoire ou defaite : bandeau d'environ 1,5 s avant l'ecran de fin ; rend la duree reelle (ms) */
function anVictoire(){const s=E.etat,F=s.fin;if(!F||(src==='spec'&&F.abandon!==undefined))return 0;
  const w=F.gagnant,sc=F.scores||[s.j[0].score,s.j[1].score],dp=F.departage&&(F.scores||[0,1])[0]===(F.scores||[0,1])[1]?' au départage':'',moi=src==='joueur'||src==='rejeu'?E.moi:null,o=moi!=null?moi:(w===0||w===1?w:0),ab=sc[o]+' - '+sc[1-o];
  let d;
  if(w!==0&&w!==1)d=anBandeau('Match nul',ab,'#f1c35a',0,{calme:1});
  else if(moi==null||w===moi)d=anBandeau('Victoire',nom(w)+' remporte la partie'+dp+' '+sc[w]+' - '+sc[1-w],COL[w],0,{});
  else d=anBandeau('Défaite',nom(moi)+' perd la partie'+dp+' '+ab,'var(--adverse,#ee6a2c)',0,{calme:1});
  return d/KV}
/* Fin de manche : une etoile par terrain remporte (et par bonus du decompte) vers le score du bandeau, avant la fenetre de manche ; rend la duree */
const ONDE=620;
function anOnde(t,el,p){const r=rectScene(el);
  [0,170].forEach(dl=>{const o=anCalque('an-onde',r);o.style.color=COL[p];anA(o,[{opacity:1,transform:'scale(1)'},{opacity:0,transform:'scale(1.45,1.8)'}],{t,delay:dl,duration:650,easing:'cubic-bezier(.2,.6,.3,1)'});anFin(o,t,dl+700)});
  const v=anCalque('an-voile-c',r);v.style.color=COL[p];anA(v,[{opacity:0},{opacity:1,offset:.3},{opacity:0}],{t,duration:800});anFin(v,t,850);
  const pv=el.querySelector('.p-valeur');if(pv)anA(pv,[{transform:'scale(1)'},{transform:'scale(1.3)',offset:.45},{transform:'scale(1)'}],{t,delay:260,duration:380,easing:'cubic-bezier(.3,1.5,.5,1)',fill:'none'})}
function etoilesManche(s,m){
  if(REDUIT.matches||!scene||!couche)return 0;
  const R=s.reperes[m-1];if(!R)return 0;const t=performance.now()+(suivi.decT||0),tr=[...scene.querySelectorAll('.d-tr>.p-terrain')];let n=0,on=0;
  for(let i=R[0];i<s.log.length&&(m<s.reperes.length?i<s.reperes[m][0]:true);i++){const[p,x]=s.log[i];if(p!==0&&p!==1)continue;
    const q=/:\s\+(\d+)( points?)?\.$/.exec(x);if(!q)continue;
    const k=s.terrains.findIndex(T=>x.startsWith('marque '+T.nom+' ')||x.startsWith(T.nom+' lance '));
    const o=k>=0&&tr[k]?tr[k]:scene.querySelector('.d-plat'),vers=rectScore(p);if(!o||!vers)continue;
    /* 0.6a : terrain conquis : onde de la couleur du gagnant, puis l'etoile part vers son score */
    const t1=t+PAS_E*n;if(k>=0&&tr[k]){anOnde(t1,tr[k],p);on=ONDE/KV}
    etoileVol(rectScene(o),vers,'+'+q[1],t1+(k>=0&&tr[k]?ONDE/KV:0),ETOILE,p);n++}
  return n?(suivi.decT||0)+PAS_E*(n-1)+on+ETOILE+150:0;
}
/* Apres la peinture du plateau : carte en vol, copies qui s'effacent, chiffres qui clignotent */
function decore(s,plat){
  const t=performance.now(),v=suivi.vol;
  /* 0.6a : mentions de tuile (charte, pastilles pleines en bas a gauche) : nom entier de l'animal attache (vert), « Favori » d'Indra (rose, coeur) */
  const Mo=M();for(let p=0;p<2;p++)for(let l=0;l<3;l++)for(let k=0;k<3;k++){const g=s.j[p].grille[l][k],c=g&&caseDe(p,l,k,plat),mi=c&&c.querySelector(':scope>.mini:not(.d-fantome):not(.d-vieux)');if(!mi||(Mo.carte(g.c)||{}).animal)continue;
    mi.querySelectorAll(':scope>.d-pasts').forEach(x=>x.remove());const L=[];
    if(g.ani&&Mo.carte(g.ani.c)){const a=Mo.carte(g.ani.c).nom;L.push(mk('span','d-past vert',a))}
    if(Mo.favori&&Mo.favori(s,p,g.c)>0){const f=mk('span','d-past rose');f.innerHTML=COEUR_AN;f.append('Favori');L.push(f)}
    mi.classList.toggle('a-past',L.length>0);if(L.length){const w=mk('span','d-pasts');w.append(...L);mi.append(w)}}
  if(v&&t<v.fin){const x=chercheCarte(s,v.p,v.c);
    if(x&&x[0]===v.l&&x[1]===v.k){const c=caseDe(v.p,v.l,v.k,plat);
      if(c){c.dataset.evo=c.classList.contains('evo')?'1':'';c.classList.add('d-vol');c.classList.toggle('evo',v.vevo);if(v.vieux){const o=v.vieux.cloneNode(true);o.classList.add('d-vieux');c.append(o)}}}
    clearTimeout(finVol);finVol=setTimeout(atterrit,v.fin-t+10)}
  else suivi.vol=null;
  poseEffets(plat);
  suivi.morts=suivi.morts.filter(m=>t<m.t+EFFACE+100);
  suivi.morts.forEach(m=>{const c=caseDe(m.p,m.l,m.k,plat);if(!c)return;const o=m.n.cloneNode(true);o.classList.add('d-fantome','fx-fantome');o.style.animationDelay=delai(m.t);o.style.animationDuration=EFFACE+'ms';c.append(o)});
  Object.keys(suivi.flash).forEach(q=>{const f=suivi.flash[q];if(t>f.t+FLASH){delete suivi.flash[q];return}
    const[p,cc]=q.split(':'),x=chercheCarte(s,+p,+cc),c=x&&caseDe(p,x[0],x[1],plat),e=c&&c.querySelector(':scope>.mini:not(.d-vieux) .f');
    if(e){e.classList.add(f.h?'d-fh':'d-fb');const fb=e.querySelector('b');fb.style.animationDelay=delai(f.t);fb.style.animationDuration=FLASH+'ms'}});
}
/* Fin du vol : la case montre la carte posee (sans repeindre) */
function atterrit(){if(!scene)return;scene.querySelectorAll('.d-der>button img').forEach(i=>i.style.visibility='');scene.querySelectorAll('.p-case.d-vol').forEach(c=>{c.classList.remove('d-vol');c.classList.toggle('evo',c.dataset.evo==='1');c.querySelectorAll(':scope>.d-vieux').forEach(o=>o.remove())})}
/* Carte qui glisse de la main a sa case (couche au-dessus de la scene, gardee d'une peinture a l'autre) */
function lanceVol(){
  const v=suivi.vol;if(!v||v.lance||!couche)return;v.lance=true;
  const c=caseDe(v.p,v.l,v.k);if(!c)return;
  const a=rectScene(c),d=v.de,sc=a.h*1.2/d.h,dx=a.x+a.w/2-d.x-d.w*sc/2,dy=a.y+a.h/2-d.y-d.h*sc/2,im=mk('img','d-vole'),reste=v.fin-performance.now();
  if(reste<50)return;
  im.src=U().srcC(v.c);im.alt='';Object.assign(im.style,{left:d.x+'px',top:d.y+'px',width:d.w+'px',height:d.h+'px'});couche.append(im);
  /* 0.6 : comme montreGrand en 0.4, la carte passe en grand sur l'image de « Derniere carte jouee » (a cote du plateau, sans le cacher), puis glisse vers sa case */
  const g=scene.querySelector('.d-der>button img');
  if(g&&reste>GRAND*.5){const G=rectScene(g),k=G.h/d.h,gx=G.x-d.x,gy=G.y-d.y,tr=(x,y,z)=>'translate('+x+'px,'+y+'px) scale('+z+')';
    g.style.visibility='hidden';
    const an=im.animate([{transform:tr(0,0,1),opacity:1},{transform:tr(gx,gy,k),opacity:1,offset:.14},{transform:tr(gx,gy,k),opacity:1,offset:.62},
      {transform:tr(dx,dy,sc),opacity:1,offset:.95},{transform:tr(dx,dy,sc),opacity:0}],{duration:reste,easing:'ease-in-out',fill:'forwards'});
    an.onfinish=()=>im.remove();an.oncancel=()=>im.remove();return}
  const an=im.animate([{transform:'translate(0,0) scale(1)',opacity:1},{transform:'translate('+dx*.3+'px,'+(dy*.3-30)+'px) scale('+(1+(sc-1)*.3+.06)+')',opacity:1,offset:.35},
    {transform:'translate('+dx+'px,'+dy+'px) scale('+sc+')',opacity:1,offset:.85},{transform:'translate('+dx+'px,'+dy+'px) scale('+sc+')',opacity:0}],{duration:reste,easing:'cubic-bezier(.35,.6,.3,1)',fill:'forwards'});
  an.onfinish=()=>im.remove();an.oncancel=()=>im.remove();
}
/* Deck vide (regle de la meule) : « n'a pas pu piocher (deck vide) : +1 point pour l'adversaire. », au nom du joueur qui n'a pas pu piocher */
const RE_DV=/^n'a pas pu piocher \(deck vide\) : \+(\d+) points? pour l'adversaire\.?$/;
/* Points recus a la manche m quand l'adversaire n'a pas pu piocher (evenements 'dv' du moteur) */
function piocheImp(s,m){const r=[0,0];(s.stats.ev||[]).forEach(e=>{if(e.t==='dv'&&e.m===m)r[1-e.cp]+=e.n});return r}
/* Moments forts du journal : destruction, evolution, terrain remporte ou egalite, pose d'animal, points hors terrains, pioche impossible */
function fort(p,x){
  if(p!==0&&p!==1){if(/ meur(t|ent)( ensuite)?[ .:]/.test(x)||/ est détruit\.$/.test(x))return 'defausse';if(/ : égalité \d+ partout\.$/.test(x))return 'coupe';return null}
  if(/^améliore /.test(x))return 'manche';
  if(/: Il suffit, détruit /.test(x))return 'defausse'; /* Le Q (Seul contre tous) : destruction */
  if(/^marque /.test(x))return 'coupe';
  if(RE_DV.test(x))return 'coupe';
  const a=/^pose (.+?)(?: sous .+)?\.$/.exec(x); /* 0.5 : « pose Kiwi sous Titom76. » */if(a&&Object.values(M().CARTES).some(c=>c.animal&&c.nom===a[1]))return 'main';
  if(/:\s\+\d+( points?)?\.$/.test(x)&&!(E&&E.etat.terrains.some(T=>x.startsWith(T.nom+' lance '))))return 'coupe';
  return null;
}

function avatar(p){
  const u=U(),n=E.noms[p]||'Joueur',id=E.uids&&E.uids[p];
  return id&&typeof u.avatarUid==='function'?u.avatarUid(n,id,E.avatars&&E.avatars[p]||''):u.avatarDe(n,E.avatars&&E.avatars[p]||'');
}
const nom=p=>E.noms[p]||'Joueur '+(p+1);
const pseudo=p=>{const b=mk('b','d-pj',nom(p));b.style.color=COL[p];return b};

/* ---------- Mise a l'echelle ---------- */
function echelle(){
  if(!D)return;
  const W=innerWidth,H=innerHeight,k=Math.min(W/1920,H/1080);
  scene.style.transform='translate('+((W-1920*k)/2)+'px,'+((H-1080*k)/2)+'px) scale('+k+')';
}
addEventListener('resize',echelle);

/* ---------- Analyse de l'etat ---------- */
function chercheCarte(s,p,cc){const G=s.j[p].grille;for(let l=0;l<3;l++)for(let k=0;k<3;k++){const v=G[l][k];if(v&&v.c===cc)return [l,k]}return null}
/* Derniere pose (pose, remplacement, amelioration) : evenement 'p' du moteur ; lieu memorise a la premiere vue (une carte peut bouger ou mourir ensuite) */
function suitPoses(s,premier){
  const ev=s.stats.ev,n=ev.length;
  if(n===suivi.nev)return;
  for(let i=Math.max(0,suivi.nev);i<n;i++){const e=ev[i];if(e.t!=='p')continue;
    const x=chercheCarte(s,e.cp,e.cc);if(x&&!suivi.lieu[e.cc])suivi.lieu[e.cc]=x;
    suivi.der={p:e.cp,c:e.cc,i};
    if(!premier&&x)suivi.halo={p:e.cp,c:e.cc,t:performance.now()};}
  suivi.nev=n;
}
/* Phrase de la derniere pose : ligne du journal du meme joueur */
function ligneDerniere(s){
  const d=suivi.der;if(!d)return null;
  for(let i=s.log.length-1;i>=0;i--){const[p,x]=s.log[i];if(p===d.p&&/^(pose|remplace|améliore) /.test(x))return x}
  return null;
}
/* Points de chaque joueur a la manche m, lus dans le journal du decompte (terrains, de du Plateau, bonus de cartes), plus les pioches impossibles adverses de la manche */
function ptsManche(s,m){
  const R=s.reperes[m-1];if(!R)return null;
  const r=[0,0];
  for(let i=R[0];i<s.log.length&&(m<s.reperes.length?i<s.reperes[m][0]:true);i++){const[p,x]=s.log[i];if(p!==0&&p!==1)continue;
    const q=/:\s\+(\d+)( points?)?\.$/.exec(x);if(q)r[p]+=+q[1]}
  const d=piocheImp(s,m);r[0]+=d[0];r[1]+=d[1]; /* deck vide (meule) : pioches impossibles adverses de la manche */
  return r;
}
/* Points de la manche gagnes hors terrains : lignes « Carte (Evolution) : +n points. » du journal (ni « marque T », ni « T lance »), puis pioches impossibles adverses */
function bonusManche(s,m){
  const R=s.reperes[m-1],r=[[],[]];if(!R)return r;
  for(let i=R[0];i<s.log.length&&(m<s.reperes.length?i<s.reperes[m][0]:true);i++){const[p,x]=s.log[i];if(p!==0&&p!==1)continue;
    const q=/:\s\+(\d+)( points?)?\.$/.exec(x);if(!q||/^marque /.test(x)||s.terrains.some(T=>x.startsWith(T.nom+' lance ')))continue;
    const a=/^(.+?) \((.+?)\) : /.exec(x),C=a&&Object.values(M().CARTES).find(c=>c.nom===a[2]),ef=C&&C.texte&&C.texte.indexOf(' : ')>0?C.texte.slice(0,C.texte.indexOf(' : ')):null;
    r[p].push('+'+q[1]+' '+(a?(ef?ef+' ('+a[2]+')':a[1]+' ('+a[2]+')'):x.slice(0,x.indexOf(' : '))))}
  const d=piocheImp(s,m);[0,1].forEach(p=>{if(d[p])r[p].push('+'+d[p]+' Deck vide de '+nom(1-p))}); /* deck vide (meule) */
  return r;
}
function deManche(s,m,terrain){
  const R=s.reperes[m-1];if(!R)return null;
  for(let i=R[0];i<s.log.length&&(m<s.reperes.length?i<s.reperes[m][0]:true);i++){const x=s.log[i][1];
    if(x.startsWith(terrain+' lance ')){const q=/ lance (\d+) : (.*)\.$/.exec(x);if(q)return 'Dé : '+q[1]+', '+q[2]}}
  return null;
}

/* ---------- Peinture ---------- */
function peindre(){
  if(!D||!E)return;
  const u=U(),s=E.etat,premier=suivi.nev<0,nev0=suivi.nev;
  suitPoses(s,premier);
  prepareAnims(s,premier,nev0);
  /* une nouvelle action ramene le journal a la page la plus recente ; ses moments forts brillent a leur arrivee */
  if(suivi.nlog!==s.log.length){if(suivi.nlog!=null){suivi.page=null;const t=performance.now();
      if(!premier)for(let i=suivi.nlog;i<s.log.length;i++)if(fort(s.log[i][0],s.log[i][1]))suivi.arr[i]=t}
    suivi.nlog=s.log.length}
  [...scene.children].forEach(n=>{if(n!==chat.el&&n!==couche)n.remove()}); /* la fenetre de chat reste en place (saisie en cours), la carte en vol aussi */
  const fin=!!s.fin,qui=fin||s.phase==='mulligan'?null:u.quiJoue(s);
  if(src==='joueur')peindreJoueur(s,qui);
  else if(src==='rejeu')scene.append(bandeau(s,qui),plateau(s,qui),eventail(s,1-BAS()),cercle(),derniere(s),actions(s),main(s,BAS(),854,qui===BAS()),coin());
  else scene.append(bandeau(s,qui),plateau(s,qui),main(s,1,186,qui===1),cercle(),derniere(s),actions(s),main(s,0,854,qui===0),coin());
  if(!couche||couche.parentNode!==scene)couche=mk('div','d-couche');
  if(chat.el)scene.insertBefore(couche,chat.el);else scene.append(couche);
  ajusteNoms();
  /* Energie qui monte (Caramel, mise des Pronos, Forge) : le compteur bascule comme en 0.4 */
  {const en=[0,1].map(p=>s.j[p].energie),t=performance.now();if(suivi.ener&&!premier)[0,1].forEach(p=>{if(en[p]>suivi.ener[p])suivi.basc={p,t}});suivi.ener=en;
    const b=suivi.basc;if(b&&t<b.t+750/KV){const e=(src==='joueur'&&b.p===E.moi&&scene.querySelector('.mq-piles .pile.forge'))||scene.querySelector('.d-ban .d-j[data-p="'+b.p+'"] [data-k="forge"]');
      if(e&&!REDUIT.matches){e.classList.add('bascule');e.style.animationDuration=(750/KV)+'ms';e.style.animationDelay=(b.t-t)+'ms'}}}
  if(suivi.vol&&suivi.vol.lance&&performance.now()<suivi.vol.fin-GRAND*.38){const g=scene.querySelector('.d-der>button img');if(g)g.style.visibility='hidden'}
  lanceVol();lanceVols();lanceTraits();lanceAn();
  /* fenetres de fin : une fin de manche nouvelle, ou la fin de la partie */
  const nt=s.stats.t.length;
  if(suivi.nt<0)suivi.nt=premier&&(!fin||suivi.calme)?nt:suivi.nt;
  /* rejeu : apres un saut (retour arriere, Debut, Fin), ni etoiles ni fenetre de manche ; en pause, pas de fenetre de manche automatique */
  if(suivi.calme&&fin&&!suivi.fin){suivi.fin=true;ouvrePop('partie')}
  const auto=!(src==='rejeu'&&!rejeu.lecture()); /* arrivee en cours de partie : pas de fenetre pour une manche deja passee */
  /* les fenetres restent ouvertes jusqu'a « Fermer » ; la partie continue derriere */
  /* vue joueur : fin par abandon sur deconnexion = ecran de presence.js, pas de 2e fenetre */
  if(src==='joueur'&&fin&&!suivi.fin&&window.DECO&&DECO.etat&&DECO.etat().fin){suivi.fin=true;suivi.nt=nt}
  /* 0.6 : les etoiles de fin de manche volent vers le score, puis la fenetre s'ouvre */
  if(fin&&!suivi.fin){suivi.fin=true;const d=nt>suivi.nt&&nt%3===0?etoilesManche(s,nt/3):0;suivi.nt=nt;popApres(d,'partie')}
  else if(!fin&&nt>suivi.nt&&nt%3===0){suivi.nt=nt;const d=etoilesManche(s,nt/3);if(auto)popApres(d,'manche',nt/3)}
  else if(suivi.pile&&sigPile(suivi.pile)!==suivi.pile.sig)ouvrePop('pile',suivi.pile); /* pile ouverte : mise a jour en direct */
  /* recapitulatif ouvert pendant un decompte qui continue (bonus de fin de manche, de) : refait avec le journal a jour ;
     fin de partie : refaite quand le souhait de revanche change (le mien ou celui de l'adversaire) */
  else if(suivi.vu&&(suivi.vu.log!==s.log.length||(suivi.vu.type==='partie'&&suivi.vu.rv!==revSig())))ouvrePop(suivi.vu.type,suivi.vu.m);
  /* fenetre de fin fermee et l'adversaire demande sa revanche : elle se rouvre */
  else if(src==='joueur'&&fin&&!suivi.pop&&suivi.rvVu!==revSig()&&(revSig()&2))ouvrePop('partie');
  else if(suivi.pop)scene.append(suivi.pop);
  if(suivi.etArr.length)majScore(); /* etoiles lancees apres la peinture du bandeau */
}
/* 0.6a : fin de partie : bandeau Victoire / Defaite (~1,5 s) avant l'ecran de fin ; fin de manche : le bandeau de la manche suivante viendra a la fermeture du recapitulatif */
function popApres(d,type,m){const S=suivi;clearTimeout(S.popT);if(type==='manche')S.mAuto=m;
  const go=()=>{if(type==='partie'){const b=anVictoire();if(b){S.popT=setTimeout(()=>{S.popT=0;if(suivi===S&&D)ouvrePop(type,m)},b);return}}ouvrePop(type,m)};
  if(!d){go();return}
  S.popT=setTimeout(()=>{S.popT=0;if(suivi===S&&D)go()},d)}
function bandeau(s,qui){
  const u=U(),ban=mk('div','d-z d-ban');
  const cpt=(n,lib,v)=>{const x=mk('span');x.append(u.ico(n),lib+' ');x.append(mk('b','',String(v)));return x};
  /* Deck, Defausse, Forge (et Energie, qui prend la place de la Forge chez le joueur actif) : ouvrent la pile en grand */
  const pile=(x,p,k,lib)=>{x.dataset.k=k;if(!pileOuverte(p,k))return x;x.classList.add('d-pile');x.setAttribute('role','button');x.tabIndex=0;x.setAttribute('aria-label','Voir '+lib+' '+d_(nom(p))+nom(p));
    x.onclick=()=>ouvrePop('pile',{p,k});x.onkeydown=e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();ouvrePop('pile',{p,k})}};return x};
  const bloc=(p,dr)=>{
    const J=s.j[p],b=mk('div','d-j '+(p===BAS()?'toi':'lui')+(dr?' dr':'')+(qui===p?' actif':'')),id=mk('div','d-id'),c=mk('div','d-cpt'),l1=mk('div','d-l1');b.dataset.p=p;
    c.append(cpt('main','Main',J.main.length),pile(cpt('deck','Deck',J.deck.length),p,'deck','le deck'),pile(cpt('defausse','Défausse',J.defausse.length),p,'defausse','la défausse'),pile(cpt('enclume','Forge',J.forge.length),p,'forge','la Forge'));
    l1.append(mk('div','d-nom',nom(p)));
    if(qui===p){l1.append(mk('span','d-badge',src==='joueur'&&p===E.moi?'À toi de jouer':src==='rejeu'?'Joue':'À lui de jouer'));const e=mk('span','d-ener');e.append(u.ico('enclume'),'Énergie ');e.append(mk('b','',String(J.energie)));c.lastChild.replaceWith(pile(e,p,'forge','la Forge'))}
    id.append(l1,c);b.append(avatar(p),id);return b;
  };
  const pts=(n,clic)=>{const w=mk('span','d-pts');for(let i=1;i<=3;i++){const x=mk('i',i<n?'fait':i===n?'on':'');
    /* manche terminee : le losange rouvre son recapitulatif */
    if(clic&&(i<n||s.fin)){x.classList.add('d-clic');x.setAttribute('role','button');x.tabIndex=0;x.title='Manche '+i;x.setAttribute('aria-label','Revoir la fin de la manche '+i);
      x.onclick=()=>ouvrePop('manche',i);x.onkeydown=e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();ouvrePop('manche',i)}}}
    w.append(x)}return w};
  const co=(l,n,clic)=>{const c=mk('div','d-cote');c.append(mk('small','',l),mk('b','',String(n)),pts(n,clic));return c};
  const mid=mk('div','d-mid'),sc=mk('div','d-sc');
  sc.append(mk('b','',String(scoreAff(s,BAS()))),mk('span','','-'),mk('em','',String(scoreAff(s,1-BAS()))));
  /* partie finie : le score rouvre la fenetre de fin de partie (pendant la partie, il ne reagit pas) */
  if(s.fin){sc.classList.add('d-clic');sc.setAttribute('role','button');sc.tabIndex=0;sc.title='Résultat de la partie';sc.setAttribute('aria-label','Revoir le résultat de la partie');
    sc.onclick=()=>ouvrePop('partie');sc.onkeydown=e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();ouvrePop('partie')}}}
  mid.append(co('Manche',s.manche,true),sc,co('Tour',s.tour));
  ban.append(bloc(BAS(),false),mid,bloc(1-BAS(),src!=='joueur'));
  return ban;
}
function plateau(s,qui){
  const u=U(),Mo=M(),plat=mk('div','d-z d-plat');
  const live=src==='joueur'?document.querySelectorAll('#partie .p-plateau>.p-grille'):[]; /* vue joueur : les vraies grilles de la partie (cibles et clics) */
  const gh=live.length===2?live[0]:u.grilleVue(s,1-BAS(),[0,1,2],[2,1,0],null),gb=live.length===2?live[1]:u.grilleVue(s,BAS(),[0,1,2],[0,1,2],null);gh.classList.add('lui');gb.classList.add('mienne');
  const r1=mk('div','d-rg'),r2=mk('div','d-rg');
  const hb=1-BAS();r1.append(mk('div','d-vt lui'+(qui===hb?' actif':''),nom(hb)),gh);r2.append(mk('div','d-vt toi'+(qui===BAS()?' actif':''),nom(BAS())),gb);
  /* terrains : Force de chaque camp, contour du joueur qui mene (neutre a egalite), valeur dessous */
  const t=mk('div','p-terrains d-tr'),cc=Mo.colonnes(s);
  [0,1,2].forEach(k=>{const T=s.terrains[k],a=cc[k][1-BAS()],m=cc[k][BAS()],d=mk('div','p-terrain'+(m>a?' m-moi':a>m?' m-lui':'')),to=mk('div','p-totaux'),te=mk('div','p-tete');
    te.append(mk('b','',T.nom));to.append(mk('b','m'+(m>a?' tete':''),String(m)),mk('span','','contre'),mk('b','a'+(a>m?' tete':''),String(a)));
    const Mo2=Mo,v=Mo2.ptsTerrain?Mo2.ptsTerrain(s,k):T.pts;d.append(te,to,ptsEt('p-valeur',v,!!effetTerrain(T,'pointsManche'),!!effetTerrain(T,'paris')&&Mo2.miseTotale?Mo2.miseTotale(s):0));d.onclick=()=>zoomTerrainDif(s,k);t.append(d)});
  plat.append(r1,t,r2);
  /* halo : case de la derniere carte jouee, 3,6 s a partir de la pose (repeinture : l'animation reprend ou elle en etait) */
  const h=suivi.halo;
  if(h&&!s.fin){const x=chercheCarte(s,h.p,h.c),dt=performance.now()-h.t;
    if(x&&dt<HALO*3){const c=plat.querySelector('.p-case[data-p="'+h.p+'"][data-l="'+x[0]+'"][data-k="'+x[1]+'"]');
      if(c){c.classList.add('d-halo');c.style.setProperty('--hc',COL[h.p]);c.style.animationDelay=(-dt/1000)+'s';c.style.animationDuration=HALO+'ms'}}}
  decore(s,plat);
  return plat;
}
/* Terrain en grand : a droite, un panneau par joueur (ses Golems sur ce terrain en lignes condensees, valeur au decompte, total) ;
   valeurs = M.valeurDecompte, comme les « n contre m » de la tuile (M.colonnes) */
const COLZ={get 0(){return inv()?'var(--magma)':'var(--bleu)'},get 1(){return inv()?'var(--bleu)':'var(--magma)'}};
function zoomTerrainDif(s,k){
  const u=U(),Mo=M(),T=s.terrains[k],cc=Mo.colonnes(s)[k];u.cacheApercu();
  const pan=p=>{const a=mk('section','dz-camp'),h=mk('h3','',nom(p)),ol=mk('ol','dz-l');h.style.color=COLZ[p];a.append(h);
    for(let l=0;l<3;l++){const g=s.j[p].grille[l][k],li=mk('li');
      if(!g){li.className='dz-vide';li.append(mk('span','','Case vide'),mk('span'))}
      else{const v=Mo.valeurDecompte(s,p,l,k),f=mk('span','dz-v'),fb=mk('b','',String(v));fb.style.color=COLZ[p];f.append(u.ico('force'),fb);f.setAttribute('role','img');f.setAttribute('aria-label','Force '+v);
        if(g.hors===s.manche&&!(M().carte(g.c).animal))f.title='Ne compte pas au décompte de cette manche';li.append(lignePile(g.c),f)}
      ol.append(li)}
    const o=cc[1-p],n=cc[p],tt=mk('div','dz-tot'),b=mk('b','',String(n));b.style.color=COLZ[p];tt.append('Total : ',b);
    if(n>o){tt.classList.add('mene');tt.style.setProperty('--c',COLZ[p])}else if(n===o)tt.append(mk('span','dz-eg','Égalité'));
    a.append(ol,tt);return a};
  u.zoom(u.srcTerrain(T),T.nom+'. '+T.texte,[pan(0),pan(1)]);
}
/* Etiquette de points d'un terrain : l'etoile du score (pictogramme des points) avant le nombre, « ★ 2 pts » */
function ptsEt(cl,n,q,m){const e=mk('span',cl+' d-ptse');e.append(U().ico('coupe'),(q?'? = ':'')+n+(n>1?' pts':' pt')+(m?' +'+m:''));return e} /* 0.4a : q = Le Tournoi (etoile « ? »), m = mises des Pronos */
function zoomCarte(c){
  const u=U(),C=M().carte(c);u.cacheApercu();
  let det=null;
  if(C.animal&&typeof u.detailAnimal==='function')det=u.detailAnimal(C);
  else if(typeof u.lg==='function'){const a=mk('section');a.append(mk('h3','','Force'),u.lg('Force de base',C.force!=null?String(C.force):'aucune'),u.lg('Coût',String(C.cout)));if(C.texte)a.append(u.effetCouleur?u.effetCouleur(C,'p',''):mk('p','',C.texte));det=[a]}
  u.zoom(u.srcC(c),C.nom,det);
}
function main(s,p,top,joue){
  const z=mk('div','d-z d-col'+(p===BAS()?' bas':'')),J=s.j[p],h=mk('div','d-tm '+(p===BAS()?'toi':'lui'),src==='joueur'&&p===E.moi?'Ta main':'Main '+d_(nom(p))+nom(p));
    /* taille FIXE pour toute la partie (7 cartes sur une ligne : 103 x 144 px) ; au-dela de 7 cartes, elles se chevauchent sans changer de taille */
  const jr=src==='joueur'&&p===E.moi,W=769,w=103,n=J.main.length,gp=(n<=7?8:(W-n*w)/(n-1))+(jr&&n>1?22/(n-1):0); /* vue joueur : « Ta main » sur 791 px, seul le pas grandit */
  z.style.top=top+'px';z.dataset.p=p;
  h.append(mk('span','',J.main.length+(J.main.length>1?' cartes':' carte')));if(joue)h.append(mk('span','d-joue','Joue'));
  const r=mk('div','d-main');
  J.main.forEach((c,k)=>{const C=M().carte(c),b=mk('button'),i=mk('img');b.type='button';b.dataset.c=c;b.style.width=w+'px';b.style.height=Math.round(w*1.4)+'px';if(k)b.style.marginLeft=gp+'px';
    i.src=U().srcC(c);i.alt=C.nom;b.setAttribute('aria-label','Agrandir '+M().nomDetail(C));b.onclick=()=>zoomCarte(c);b.append(i);
    if(C.base){const st=mk('span','evs','★');st.setAttribute('aria-hidden','true');b.append(st)} /* 0.5 : evolution, etoile centree sur les chiffres cout / Force (les deux modes) */
    /* vue joueur : la carte reprend l'etat de la vraie main (grisee, surcout, choisie) et le clic passe par elle */
    const v=jr&&document.querySelector('#partie .p-poste .p-slot[data-c="'+c+'"]>.p-carte');
    if(v){['grisee','surtaxe'].forEach(x=>b.classList.toggle(x,v.classList.contains(x)));if(v.title)b.title=v.title;
      if(v.hasAttribute('aria-pressed'))b.setAttribute('aria-pressed',v.getAttribute('aria-pressed'));
      b.setAttribute('aria-label',(v.dataset.act?'Jouer ':'Agrandir ')+M().nomDetail(C));
      [...v.children].forEach(x=>{if(x.tagName!=='IMG')b.append(x.cloneNode(true))});b.onclick=()=>v.click();
      /* apercu au survol (comme l'ancienne main) et oeil : la carte en grand sans la jouer */
      const sl=v.parentNode,oe=sl&&sl.querySelector('.oeil');
      if(U().SURVOL&&U().SURVOL.matches){b.onmouseenter=()=>U().montreApercu(b,i.src);b.onmouseleave=()=>U().cacheApercu()}
      if(oe&&v.dataset.act){const o=mk('span','oeil');o.setAttribute('role','button');o.setAttribute('aria-label','Agrandir '+C.nom);o.innerHTML=oe.innerHTML;
        o.onclick=e=>{e.stopPropagation();oe.click()};b.append(o)}}
    r.append(b)});
  z.append(h,r);return z;
}
/* Cercle des elements : gros pictos sans anneau, fleches dans les espaces libres (maquette c1 : 68 px, cadre 350 x 188) */
let SVG=null;
function cercle(){
  const z=mk('div','d-z d-bloc d-cer'),cw=mk('div','d-cw');
  if(!SVG){
    const E5=window.GolemsDonnees.interface.elements.ordre,IM=68,ey=(188-IM)/1.809,ex=(350-IM)/1.902,DEG=Math.PI/180,P=a=>[ex*Math.cos(a*DEG),ey*Math.sin(a*DEG)];
    const pos=E5.map((e,i)=>P(-90+72*i)),libre=a=>{const[x,y]=P(a);return !pos.some(([X,Y])=>Math.hypot(x-X,y-Y)<IM/2+5)};
    let g='<defs><marker id="dFl" viewBox="0 0 10 10" refX="7" refY="5" markerWidth="4" markerHeight="4" orient="auto"><path d="M0 0L10 5L0 10Z" style="fill:var(--bleu)"/></marker></defs>';
    for(let i=0;i<5;i++){const a0=-90+72*i;let best=[0,0],cur=null;for(let a=a0;a<=a0+72;a+=.25){if(libre(a)){if(cur===null)cur=a;if(a-cur>best[1]-best[0])best=[cur,a]}else cur=null}
      const p=P(best[0]+1),q=P(best[1]-1);g+='<path class="arc" d="M'+p+'A'+ex+' '+ey+' 0 0 1 '+q+'" marker-end="url(#dFl)"/>'}
    pos.forEach(([x,y],i)=>{g+='<image href="'+imgV('cartes/'+E5[i]+'.png')+'" x="'+(x-IM/2)+'" y="'+(y-IM/2)+'" width="'+IM+'" height="'+IM+'"/>'});
    const x0=Math.min(...pos.map(p=>p[0]))-IM/2-3,x1=Math.max(...pos.map(p=>p[0]))+IM/2+3,y0=Math.min(...pos.map(p=>p[1]))-IM/2-3,y1=Math.max(...pos.map(p=>p[1]))+IM/2+3;
    SVG='<svg xmlns="http://www.w3.org/2000/svg" role="img" aria-label="Cercle des éléments : Magma, Cristal, Foudre, Brume, Roche" viewBox="'+[x0,y0,x1-x0,y1-y0].join(' ')+'" width="'+(x1-x0)+'" height="'+(y1-y0)+'">'+g+'</svg>';
  }
  cw.innerHTML=SVG;z.append(cw);return z;
}
function derniere(s){
  const u=U(),Mo=M(),z=mk('div','d-z d-bloc d-der'),tx=mk('div','d-txt'),d=suivi.der;
  /* vue joueur, choix de carte a faire (Cafe du matin, La taupe) : « Choisis une carte » a la place de la derniere carte jouee ; le clic passe par la vraie vue (.p-choix) */
  const A0=s.attente;
  if(src==='joueur'&&A0&&A0.p===E.moi&&(A0.t==='cafe'||A0.t==='taupe')){
    z.classList.add('d-choix');tx.append(mk('div','d-h','Choisis une carte'));const r=mk('div','d-main');
    /* cartes a 103 x 144 (taille de la main) sur toute la largeur de la zone (755 px utiles) ; trop nombreuses : chevauchement, jamais reduites */
    const nO=A0.options.length,ec=nO>1?Math.min(8,Math.floor((755-103*nO)/(nO-1))):0;
    A0.options.forEach((c,k)=>{const C=Mo.carte(c),b=mk('button'),im=mk('img');b.type='button';im.src=imgV('cartes/'+C.id+'.jpg');im.alt=C.nom;b.setAttribute('aria-label','Choisir '+Mo.nomDetail(C));
      b.style.width='103px';b.style.height='144px';if(k)b.style.marginLeft=ec+'px';b.append(im);
      b.onclick=()=>{const v=document.querySelector('#partie .p-choix .p-slot[data-c="'+c+'"]>.p-carte');if(v)v.click()};r.append(b)});
    tx.append(r);z.append(tx);return z;
  }
  tx.append(mk('div','d-h','Dernière carte jouée'));
  if(!d){z.classList.add('vide');tx.append(mk('p','d-phr d-rien','Aucune carte jouée pour le moment.'));z.append(tx);return z}
  const C=Mo.carte(d.c),bt=mk('button'),im=mk('img');bt.type='button';im.src=imgV('cartes/'+C.id+'.jpg');im.alt=C.nom;bt.setAttribute('aria-label','Agrandir '+Mo.nomDetail(C));bt.append(im);
  const x=chercheCarte(s,d.p,d.c);bt.onclick=()=>{if(x){const c=document.querySelector('#dif .p-case[data-p="'+d.p+'"][data-l="'+x[0]+'"][data-k="'+x[1]+'"]');if(c&&c.onclick){c.onclick();return}}zoomCarte(d.c)};
  /* 1re ligne : « X pose Y sur Z. » / « X ameliore A en B. » / « X remplace A par B sur Z. » */
  const ph=mk('p','d-phr'),L=ligneDerniere(s)||'pose '+Mo.nomDetail(C)+'.',lieu=suivi.lieu[d.c],ter=lieu?s.terrains[lieu[1]].nom:null;
  const bl=t=>{const b=mk('b');b.style.color=COL[d.p];b.append(nbEvo(t));return b};
  let q;
  if((q=/^améliore (.+) en (.+)\.$/.exec(L))){ph.append(bl(nom(d.p)+' améliore '+q[1]+' en '));const e=mk('b','d-evo',q[2]);ph.append(e,'.')}
  else{ph.append(bl(nom(d.p)+' '+L.replace(/\.$/,'')),ter?' sur '+ter+'.':'.')}
  /* 2e ligne : l'effet, son nom en gras */
  const pe=mk('p','d-phr'),t=C.texte||'',i=t.indexOf(' : ');
  if(i>0){const sg=mk('strong','',t.slice(0,i));if(u.effetCouleur)sg.style.color=u.effetCouleur(C).firstChild.style.color;pe.append(sg,nb(t.slice(i)))}else if(t)pe.append(nb(t));
  const ch=mk('div','d-chips'),cc=mk('span'),cf=mk('span'),ce=mk('span');
  /* Charte : pictos seuls pour les donnees, libelles en mots pour les lecteurs d'ecran */
  cc.append(u.ico('enclume'),mk('b','',String(C.cout)));cc.setAttribute('role','img');cc.setAttribute('aria-label','Coût '+C.cout);
  cf.append(u.ico('force'),mk('b','',C.force==null?'au dé':String(C.force)));cf.setAttribute('role','img');cf.setAttribute('aria-label',C.force==null?'Force au dé':'Force '+C.force);
  (C.el||[]).forEach(e=>{const im2=mk('img');im2.src=imgV('cartes/'+e+'.png');im2.alt=e;ce.append(im2)});
  ch.append(cc,cf);if(C.el&&C.el.length)ch.append(ce);
  tx.append(ph);if(t)tx.append(pe);
  /* Le Q : Jour de peche en cours (attente 'q' sur le deck adverse) : les 2 cartes regardees, a la place des pastilles */
  const A=s.attente;
  if(A&&A.t==='q'&&A.adv&&A.options){const pq=mk('p','d-phr d-peche');pq.append(mk('strong','','Jour de pêche'),' : défausser ');
    A.options.forEach((c,i)=>{if(i)pq.append(' ou ');pq.append(nbCartes(Mo.nomDetail(Mo.carte(c))))});pq.append(' ?');tx.append(pq)}
  else tx.append(ch);
  z.append(bt,tx);return z;
}
/* Phrase courte d'une ligne du journal */
function phrase(p,x){
  const t=mk('span'),N=noms();x=x.replace(/\.$/,'');
  if(x==='garde une carte du dessus du deck'){t.append(mk('b','d-ca','Le Q'),' : ',pseudo(p),' garde 1 carte parmi 3');return t}
  /* « marque T (a contre b) : +n » : sans le detail des Forces */
  const mq=/^marque (.+) \(\d+ contre \d+\) : (\+\d+)$/.exec(x);
  if(mq){t.append(pseudo(p),' marque ');t.append(nbCourt(mq[1]),' : '+mq[2]);return t}
  /* deck vide (meule) : « X n'a pas pu piocher : +1 point pour Y » */
  const dv=RE_DV.exec(x);if(dv&&(p===0||p===1)){t.append(pseudo(p)," n'a pas pu piocher : +"+dv[1]+(+dv[1]>1?' points':' point')+' pour ',pseudo(1-p));return t}
  /* « Carte : effet », « Carte (Evolution) lance ... », « Carte perd ... » : la carte en gras, le joueur entre parenthèses */
  const nm=N.re.source.slice(1,-1),m=new RegExp('^((?:'+nm+')(?: \\((?:'+nm+')\\))?)( : | )').exec(x);
  if(m){t.append(nbCourt(m[1]),' (',pseudo(p),')');t.append(nbCourt(x.slice(m[1].length)));return t}
  t.append(pseudo(p),nbCourt(' '+x));return t;
}
/* Journal pagine par manche (decoupage de pagesLog, comme le journal du jeu) : manche en cours par defaut, fleches pour remonter ;
   une nouvelle action ramene a la page la plus recente */
function actions(s){
  const u=U(),z=mk('div','d-z d-bloc d-act'),ol=mk('ol'),pg=typeof u.pagesLog==='function'?u.pagesLog(s):[s.log];
  const n=Math.max(1,pg.length);if(suivi.page==null||suivi.page>=n)suivi.page=n-1;const i=suivi.page,der=i===n-1;
  /* indice de chaque ligne dans le journal complet (les pages se suivent depuis le debut) ; lignes sans joueur : seulement les moments forts (destructions, egalites) */
  let o0=0;for(let j=0;j<i;j++)o0+=(pg[j]||[]).length;
  const L=(pg[i]||[]).map((e,j)=>[e[0],e[1],o0+j,fort(e[0],e[1])]).filter(e=>e[0]===0||e[0]===1||e[3]),t=performance.now();
  const h=mk('div','d-h d-ah'),ti=mk('span','','Dernières actions'),nav=mk('span','d-nav');
  const fl=(t,lib,v,off)=>{const b=mk('button','',t);b.type='button';b.setAttribute('aria-label',lib);b.disabled=off;b.onclick=()=>{suivi.page=v;suivi.pageMain=true;peindre()};return b};
  nav.append(fl('‹','Manche précédente',i-1,i<=0),mk('span','d-mn','Manche '+(i+1)),fl('›','Manche suivante',i+1,der));
  h.append(ti,nav);z.append(h);
  if(!L.length)ol.append(mk('li','d-rien','Aucune action pour le moment.'));
  L.forEach((e,k)=>{const li=mk('li',der&&k===L.length-1?'dern':''),g=u.genreLog(e[1]);
    if(!e[3]){li.append(u.ico(g[1]),phrase(e[0],e[1]));ol.append(li);return}
    /* moment fort : liseré dore, fond teinte, pictogramme sur pastille doree, courte lueur a l'arrivee */
    li.classList.add('d-fort');const a=suivi.arr[e[2]];
    if(a!=null){if(t<a+LUEUR){li.classList.add('d-neuf');li.style.animationDelay=delai(a);li.style.animationDuration=LUEUR+'ms'}else delete suivi.arr[e[2]]}
    let ph;if(e[0]===0||e[0]===1)ph=phrase(e[0],e[1]);else{ph=mk('span');ph.append(nbCourt(e[1].replace(/\.$/,'')))}
    li.append(u.ico(e[3]),ph);ol.append(li)});
  z.append(ol);
  /* page la plus recente : en bas ; manche passee : en haut (apres la peinture, quand les hauteurs sont connues) */
  requestAnimationFrame(()=>{ol.scrollTop=der?ol.scrollHeight:0});
  return z;
}
function coin(){
  if(src==='rejeu')return coinRejeu();
  const z=mk('div','d-z d-coin'),lo=mk('div','d-logo'),li=mk('img'),bas=mk('div','d-bas');li.src=imgV('cartes/logo.png');li.alt='Les Golems';lo.append(li);
  if(window.interDal)bas.append(interDal('Daltonien')); /* 0.5 : mode daltonien, a gauche de Chat */
  if(src==='spec'&&window.SPEC&&SPEC.chat){const b=mk('button','d-chat','Chat');b.type='button';b.setAttribute('aria-label','Ouvrir le chat');b.onclick=()=>chat.ouvre();
    const n=chat.nonLus();if(n>0){b.append(mk('span','d-pastille',n>9?'9+':String(n)));b.setAttribute('aria-label','Ouvrir le chat, '+n+' nouveau'+(n>1?'x':'')+' message'+(n>1?'s':''))}bas.append(b)}
  const qt=mk('button','d-quit',src==='spec'?'Quitter la partie':'Quitter la vue spectateur');qt.type='button';qt.onclick=quitter;bas.append(qt);
  z.append(lo,bas);return z;
}
/* Chat (vue spectateur seulement) : ferme par defaut, pastille des nouveaux messages, fenetre par-dessus la vue ;
   lecture par SPEC.chat / SPEC.onChat, ecriture par SPEC.dit (memes regles que le salon) */
const chat={el:null,ul:null,in:null,inf:null,vus:0,branche:false,dernier:0,
  liste(){return window.SPEC&&SPEC.chat?SPEC.chat()||[]:[]},
  nonLus(){return this.el?0:Math.max(0,this.liste().length-this.vus)},
  brancher(){if(this.branche||!window.SPEC||!SPEC.onChat)return;this.branche=true;
    SPEC.onChat(()=>{if(!D||src!=='spec')return;if(this.el)this.peint();else{const b=scene&&scene.querySelector('.d-coin');if(b)b.replaceWith(coin())}})},
  ouvre(){
    if(this.el){this.in.focus();return}
    const w=mk('div','d-chatw'),h=mk('div','d-ch'),fe=mk('button','pp-fermer','Fermer'),ul=mk('ul','d-cl'),f=mk('form','d-cf'),i=mk('input'),ok=mk('button','d-cenv','Envoyer'),inf=mk('div','d-cinf');
    w.setAttribute('role','dialog');w.setAttribute('aria-label','Chat');fe.type='button';fe.onclick=()=>this.ferme();ok.type='submit';
    i.type='text';i.maxLength=200;i.placeholder='Écrire un message';i.setAttribute('aria-label','Message');i.autocomplete='off';
    h.append(mk('span','d-h','Chat'),fe);f.append(i,ok);w.append(h,ul,f,inf);
    f.onsubmit=e=>{e.preventDefault();const m=i.value.replace(/\s+/g,' ').trim().slice(0,200);if(!m||!window.SPEC||!SPEC.dit)return;
      const t=Date.now();if(t-this.dernier<1000){alerte(inf,'Chat : un message par seconde au plus. Patiente un instant.');return}
      this.dernier=t;inf.textContent='';i.value='';Promise.resolve(SPEC.dit(m)).catch(()=>{alerte(inf,'Chat : message non envoyé. Réessaie.');i.value=m})};
    this.el=w;this.ul=ul;this.in=i;this.inf=inf;scene.append(w);this.peint();
    const b=scene.querySelector('.d-coin');if(b)b.replaceWith(coin());i.focus();
  },
  peint(){
    const l=this.liste(),ul=this.ul,bas=ul.scrollHeight-ul.scrollTop-ul.clientHeight<30;ul.textContent='';this.vus=l.length;
    if(!l.length)ul.append(mk('li','d-rien','Aucun message pour le moment.'));
    l.slice(-100).forEach(x=>{const li=mk('li'),d=new Date(+x.t||Date.now());
      li.append(mk('time','',String(d.getHours()).padStart(2,'0')+':'+String(d.getMinutes()).padStart(2,'0')),window.golemsNomChat?golemsNomChat(x):mk('b','',(typeof x.p==='string'?x.p:'Joueur')+' :'),' '+String(x.m));ul.append(li)});
    if(bas||!ul.dataset.vu){ul.scrollTop=ul.scrollHeight;ul.dataset.vu='1'}
  },
  ferme(){if(!this.el)return;this.vus=this.liste().length;this.el.remove();this.el=null;const b=scene&&scene.querySelector('.d-coin');if(b)b.replaceWith(coin())}
};

/* Nom trop long pour son bandeau : la police se reduit (54 px au plus) */
function ajusteNoms(){
  scene.querySelectorAll('.d-j').forEach(j=>{const n=j.querySelector('.d-nom'),c=j.querySelector('.d-cpt'),l=j.querySelector('.d-l1');let f=54,z=1;
    while(f>26&&j.scrollWidth>j.clientWidth+1){f-=2;n.style.fontSize=f+'px'}
    /* filet de securite : si les compteurs ou le badge ne tiennent toujours pas, ils rapetissent un peu plutot que d'etre coupes */
    while(z>.7&&j.scrollWidth>j.clientWidth+1){z-=.03;c.style.zoom=z;if(src!=='joueur')l.querySelectorAll('.d-badge').forEach(b=>b.style.zoom=z)}}); /* vue joueur : etiquettes toujours 171 x 38 */
  scene.querySelectorAll('.d-vt').forEach(v=>{let f=28;while(f>14&&v.scrollHeight>v.clientHeight+1){f-=2;v.style.fontSize=f+'px'}});
}

/* ---------- Fenetres de fin ---------- */
/* souhait de revanche (vue joueur en ligne) : 1 = le mien, 2 = celui de l'adversaire */
function revSig(){const P=src==='joueur'&&U()?U().partie:null;return P&&!P.local?(P.veut?1:0)+(P.luiVeut?2:0):0}
function fermePop(){const mb=suivi&&suivi.vu&&suivi.vu.type==='manche'&&suivi.mAuto===suivi.vu.m;if(mb){suivi.mAuto=null;const mm=suivi.vu.m;setTimeout(()=>anManche(mm),120)} /* 0.6a : bandeau « Manche n » apres le recapitulatif */
if(src==='joueur'&&suivi&&suivi.vu&&suivi.vu.type==='manche'){const c=document.getElementById('continuer'),r=document.getElementById('recap');if(c&&r&&!r.hidden)setTimeout(()=>c.click(),0)} /* vue joueur : fermer le bilan de manche = Continuer */
if(suivi.pile)U().cacheApercu();if(suivi.pop)suivi.pop.remove();suivi.pop=null;suivi.pile=null;suivi.vu=null}
/* Piles (Deck, Defausse, Forge) : ordre de pioche (1 = prochaine carte), defausse de la plus recente a la plus ancienne, forge dans l'ordre */
const PILES={deck:'Deck',defausse:'Défausse',forge:'Forge'};
function cartesPile(o){const L=(E.etat.j[o.p][o.k]||[]).slice();return o.k==='defausse'?L.reverse():L}
/* vue joueur (correctif 0.5a) : le deck adverse ne s'ouvre pas ; son propre deck : trie par nom et regroupe, jamais l'ordre de pioche.
   Vue spectateur et demonstration : inchange (ordre de pioche). */
function pileOuverte(p,k){return !(src==='joueur'&&k==='deck'&&p!==E.moi)}
function deckGroupe(o){return src==='joueur'&&o.k==='deck'}
function sigPile(o){return o.p+o.k+':'+cartesPile(o).join()}
function popPile(o,pp){
  const L=cartesPile(o),n=L.length,h=mk('h2'),b=mk('span','',nom(o.p)),gr=deckGroupe(o);b.style.color=COL[o.p];
  h.append(PILES[o.k]+' '+d_(nom(o.p)),b,' ('+n+(n>1?' cartes':' carte')+')');pp.append(h);
  if(!n){pp.append(mk('p','pp-sous pp-vide','Aucune carte.'));return}
  if(gr){const m=new Map();L.forEach(c=>m.set(c,(m.get(c)||0)+1));
    const G=[...m].map(([c,k])=>({c,k,nm:M().nomDetail(M().carte(c))})).sort((a,b)=>a.nm.localeCompare(b.nm,'fr'));
    pp.append(mk('p','pp-sous','Cartes restantes, triées par nom.'));
    const nc=G.length<=12?1:G.length<=36?2:3,g=mk('ul','pp-pile pp-groupe');g.style.setProperty('--nc',nc);g.style.gridTemplateRows='repeat('+Math.ceil(G.length/nc)+',auto)';
    G.forEach(x=>{const li=mk('li');li.append(mk('span','pp-num','x'+x.k),lignePile(x.c));g.append(li)});pp.append(g);return}
  /* lignes condensees comme le panneau de l'onglet Decks ; 1 colonne jusqu'a 12 cartes, 2 jusqu'a 36, 3 au-dela ; lecture colonne par colonne */
  const nc=n<=12?1:n<=36?2:3,g=mk('ol','pp-pile');g.style.setProperty('--nc',nc);g.style.gridTemplateRows='repeat('+Math.ceil(n/nc)+',auto)';
  L.forEach((c,i)=>{const li=mk('li');li.append(mk('span','pp-num',String(i+1)),lignePile(c));g.append(li)});
  pp.append(g);
}
/* Ligne de carte condensee (cout, Force, elements, nom et titre) : couleurs des deux elements, animaux en vert, titre des evolutions en dore */
function lignePile(c){
  const u=U(),Mo=M(),C=Mo.carte(c),q=mk('button','dl-ligne'),co=mk('span','dl-cout'),fo=mk('span','dl-force'),e=mk('span','dl-els'),els=C.el||[];q.type='button';
  if(els.length===2){q.classList.add('dl-duo');q.style.setProperty('--a','var(--fm-'+els[0]+')');q.style.setProperty('--b','var(--fm-'+els[1]+')')}else if(C.animal)q.classList.add('dl-animal');
  co.append(u.ico('enclume'),String(C.cout));if(C.force!=null)fo.append(u.ico('force'),String(C.force));
  els.forEach(x=>{const im=mk('img');im.src=imgV('cartes/'+x+'.png');im.alt=x;e.append(im)});
  const pl=typeof u.nomComplet==='function'?u.nomComplet(Mo.nomDetail(C)):C.nom,v=pl.indexOf(', '),nm=mk('span','dl-nom');
  nm.append(mk('span','dl-pseudo',v<0?pl:pl.slice(0,v)));
  if(v>=0){const ti=mk('span','dl-titre',pl.slice(v+2));ti.style.color=C.base?'var(--or)':els[0]?'var(--'+els[0]+')':C.animal?'var(--animal-titre)':'var(--or)';nm.append(ti)}
  if(C.animal){fo.className='dl-force dl-mot';fo.textContent='Animal';q.append(co,fo,nm)}else q.append(co,fo,e,nm);q.setAttribute('aria-label','Agrandir '+pl);
  q.onclick=()=>zoomCarte(c);q.onmouseenter=()=>u.montreApercu(q,u.srcC(c));q.onmouseleave=()=>u.cacheApercu();
  return q;
}
/* Fenetre de fin de manche (copie gardee de cette manche, sinon l'etat courant) ou de fin de partie ; seul « Fermer » la ferme */
function ouvrePop(type,m){
  if(!D)return;
  const g0=suivi.pop&&suivi.pile&&suivi.pop.querySelector('.pp-pile'),haut=g0?g0.scrollTop:0;
  if(suivi.pile)U().cacheApercu();if(suivi.pop)suivi.pop.remove();suivi.pile=null;
  const v=mk('div','pp-voile'),pp=mk('div','pp');
  suivi.vu=null;
  /* tout recapitulatif se lit dans l'etat courant : journal et reperes de manche ne font que grandir */
  if(type==='manche'){popManche(E.etat,m,pp);suivi.vu={type,m,log:E.etat.log.length}}
  else if(type==='pile'){pp.classList.add('pp-p');popPile(m,pp);suivi.pile={p:m.p,k:m.k,sig:sigPile(m)};v.onclick=e=>{if(e.target===v)fermePop()}}
  else if(type==='abandon')popAbandon(E.etat,m,pp);
  else{popPartie(E.etat,pp);suivi.vu={type,m,log:E.etat.log.length,rv:revSig()};suivi.rvVu=suivi.vu.rv;if(src==='joueur')boutonsFin(pp)}
  if(!(type==='partie'&&src==='joueur')){const fe=mk('button','pp-fermer','Fermer');fe.type='button';fe.onclick=fermePop;pp.append(fe)} /* J06 : fin de partie du joueur sans petit Fermer */
  v.append(pp);scene.append(v);suivi.pop=v;ajustePop(pp);
  if(type==='pile'&&haut){const g=pp.querySelector('.pp-pile');if(g)g.scrollTop=haut}
}
/* Pseudos des recapitulatifs : la police se reduit (28 -> 20 px dans les lignes de terrain, 22 -> 16 px dans « X marque n points ») avant toute coupure « ... » */
function ajustePop(pp){
  /* meme taille pour toutes les lignes d'un meme role (la plus petite necessaire) */
  const cale=(L,el,f0,fmin)=>{let f=f0;const trop=()=>L.some(x=>{const n=el(x);return n&&n.scrollWidth>n.clientWidth+1});
    while(f>fmin&&trop()){f--;L.forEach(x=>x.style.fontSize=f+'px')}};
  cale([...pp.querySelectorAll('.pp-l>span:not(.avatar)')],x=>x,28,20);
  cale([...pp.querySelectorAll('.pp-rl')],x=>x.querySelector(':scope>b'),22,16);
}
/* vue spectateur : fin par abandon (deconnexion), ecran neutre : Vainqueur / Abandon, score */
function popAbandon(s,perdant,pp){
  const w=1-perdant,vic=mk('div','pp-vic'),duo=mk('div','pp-duo');vic.append(mk('h2','pp-neutre','Fin par abandon'));
  [w,perdant].forEach(p=>{const j=mk('div','pp-dj'+(p===w?' g':'')),n=mk('span','pp-dn',nom(p)),a=avatar(p);if(p!==w)a.classList.add('dk-gris');n.style.color=COL[p];
    j.append(a,n,mk('span','pp-dsc',String(s.j[p].score)),mk('span','dk-tag '+(p===w?'v':'d'),p===w?'Vainqueur':'Abandon'));duo.append(j)});
  vic.append(duo,mk('p','pp-sous',nom(perdant)+" ne s'est pas reconnecté à temps."));pp.append(vic);
}
/* vue joueur : boutons du bilan de fin (Rejouer, Partager le resume, Copier les donnees, Retour a l'accueil) */
function boutonsFin(pp){
  const u=U(),s=E.etat,z=mk('div','pp-fbtns'),b=(t,cl,f)=>{const x=mk('button','btn'+(cl?' '+cl:''),t);x.type='button';x.onclick=()=>f(x);z.append(x);return x};
  const rj=document.getElementById('rejouer'),P=u.partie;
  if(rj){const rv=mk('div','pp-rev'),moiP=P?P.moi:0,j=p=>{const d=mk('div','pp-rj'+(p===moiP?'':' lui')),n=mk('b','',nom(p));n.style.color=COL[p];d.append(avatar(p),n);return d};
    /* en ligne : apres « Revanche », la fenetre reste ouverte, « En attente de l'adversaire » et « Annuler » ; l'adversaire voit le souhait (P.luiVeut) */
    const enLigne=P&&!P.local,attend=enLigne&&P.veut,lv=enLigne&&!P.veut&&P.luiVeut;
    const x=mk('button','sc-btn pp-revb'+(attend?' sc-secondaire':''),attend?'Annuler':'Revanche');x.type='button';x.disabled=attend?false:rj.disabled;
    /* classee contre un Golem : la revanche relance une classee contre le Golem choisi par l'Elo (limite du jour comprise) */
    const cl=P&&P.classe&&P.classe.robot&&typeof lanceClasseRobot==='function'&&typeof profilClasse==='function';
    if(cl&&!GolemsClasse.peutAffronterRobot(profilClasse().robots)){x.disabled=true;x.textContent='Limite du jour atteinte'}
    x.onclick=()=>{if(cl){fermePop();lanceClasseRobot(profilClasse(),P.classe.sa);return}
      if(!enLigne){fermePop();rj.click();return}
      if(attend){if(typeof u.annuleRevanche==='function')u.annuleRevanche()}else rj.click();
      if(suivi&&suivi.vu&&suivi.vu.type==='partie'&&suivi.vu.rv!==revSig())ouvrePop('partie')};
    const c=mk('div','pp-revc'+(attend||lv?' pp-revq':''));c.append(x,mk('small','',P&&P.local?(cl?'Nouvelle classée contre un Golem':'Nouvelle partie contre le Golem'):attend?'En attente de l\'adversaire':lv?nom(1-moiP)+' veut sa revanche':'Personne n\'a encore choisi'));
    rv.append(j(moiP),c,j(1-moiP));pp.append(rv)}
  b('Changer de deck','sec',()=>{if(typeof u.choisirDeck==='function')u.choisirDeck(()=>{},'Choisir')});
  b('Partager le résumé','sec',x=>u.partageFin(x,u.texteResume(s)));
  b('Copier les données','sec',x=>u.copie(u.donneesPartie(s),x,'Copier les données'));
  b("Retour à l'accueil",'sec',()=>{fermePop();u.quitteBouton()});
  pp.append(z);
}
/* Echap ferme la fenetre d'une pile (apres le zoom d'une carte s'il est ouvert) */
document.addEventListener('keydown',e=>{if(e.key!=='Escape'||!D||!suivi)return;const z=document.getElementById('vue');if(z&&!z.hidden)return;
  if(suivi.pile)fermePop();else if(chat.el)chat.ferme()},true);
/* sc = scores par place ; vue joueur : le sien d'abord, comme le bandeau du haut (BAS) */
function score(sm,sc){
  const o=BAS(),t=mk('div','pp-tot'),d=mk('div'),x=mk('b','',String(sc[o])),y=mk('b','',String(sc[1-o]));x.style.color=COL[o];y.style.color=COL[1-o];
  d.append(U().ico('coupe'),x,mk('span','','-'),y);t.append(mk('small','',sm),d);return t;
}
function popManche(s,m,pp){
  const u=U();pp.append(mk('h2','','Fin de la manche '+m));
  const g=mk('div','pp-ters');
  s.stats.t.filter(t=>t.manche===m).forEach(t=>{const c=mk('div','pp-ter'),h=mk('div','pp-th');const T=s.terrains.find(x=>x.nom===t.terrain);h.append(mk('b','',T?T.nom:t.terrain),ptsEt('pp-pts',T?T.pts:t.points));c.append(h);
    [0,1].forEach(p=>{const l=mk('div','pp-l'+(t.gagnant===p?' gagne':''));l.style.setProperty('--c',COL[p]);const n=mk('span','',nom(p));n.style.color=COL[p];const f=mk('em','',String(t.forces[p]));f.style.color=COL[p];l.append(avatar(p),n,f);c.append(l)});
    /* une ligne : le pseudo se tronque (« Golem Ro... ») si la phrase ne tient pas ; la suite sur la ligne de base du pseudo */
    const r=mk('div','pp-res'),l1=mk('div','pp-rl');
    if(t.gagnant===0||t.gagnant===1){const b=mk('b','',nom(t.gagnant));b.style.color=COL[t.gagnant];l1.append(b,mk('span','',' marque '+t.points+(t.points>1?' points':' point')))}
    else if(t.forces[0]===t.forces[1])l1.append(mk('span','','Égalité, personne ne marque'));
    else l1.append(mk('span','','Marque à la manche 3'));
    r.append(l1);
    const de=deManche(s,m,t.terrain);if(de)r.append(mk('div','pp-rde',de));
    c.append(r);g.append(c)});
  pp.append(g);
  /* vue joueur : L'Ecran du MJ gagne a la derniere manche jouee, main adverse revelee (comme l'ancien bilan #recap) */
  const ec=s.dernier&&s.dernier.ecran;
  if(src==='joueur'&&ec&&ec.p===E.moi&&ec.main&&m===Math.max(...s.stats.t.map(t=>t.manche))){
    const z=mk('div','pp-ecran'),l=mk('div','pp-ecran-l'),ad=1-E.moi,t=mk('p'),b=mk('b','',nom(ad));b.style.color=COL[ad];
    t.append("L'Écran du MJ : main de ",b,ec.main.length?'.':' : vide.');z.append(t);
    ec.main.forEach(c=>{const C=M().carte(c),i=mk('img');i.src=imgV('cartes/'+C.id+'.jpg');i.alt=C.nom;l.append(i)});
    if(ec.main.length)z.append(l);pp.append(z)}
  const pm=ptsManche(s,m)||[0,0],tot=[0,0];for(let k=1;k<=m;k++){const x=ptsManche(s,k);if(x){tot[0]+=x[0];tot[1]+=x[1]}}
  const bas=mk('div','pp-bas');
  const bo=bonusManche(s,m);
  [BAS(),1-BAS()].forEach((p,rg)=>{const w=mk('div','pp-gc'),x=mk('div','pp-gain'),n=mk('span','',nom(p)),i=mk('i','','+'+pm[p]);n.style.color=i.style.color=COL[p];x.append(avatar(p),n,i,u.ico('coupe'));w.append(x);
    /* points hors terrains (Roi du Karaoke...) : petite ligne sous le gain, deja compris dans le +n */
    if(bo[p].length){const bx=mk('div','pp-bonus');bx.append(nbCourt(bo[p].join(' - ')));w.append(bx)}bas.append(w);
    if(rg===0)bas.append(score('Score',tot))});
  pp.append(bas);
}
function popPartie(s,pp){
  const u=U(),Mo=M(),F=s.fin,w=F.gagnant,vic=mk('div','pp-vic');
  /* vue spectateur, fin par abandon : ecran neutre (« Fin par abandon », Vainqueur / Abandon) */
  if(src==='spec'&&F.abandon!==undefined&&(w===0||w===1)){vic.append(mk('h2','pp-neutre','Fin par abandon'));const duo=mk('div','pp-duo');
    [w,1-w].forEach(p=>{const j=mk('div','pp-dj'+(p===w?' g':'')),n=mk('span','pp-dn',nom(p)),a=avatar(p);if(p!==w)a.classList.add('dk-gris');n.style.color=COL[p];
      j.append(a,n,mk('span','dk-tag '+(p===w?'v':'d'),p===w?'Vainqueur':'Abandon'));duo.append(j)});vic.append(duo)}
  else if(w===0||w===1){vic.style.setProperty('--c',COL[w]);const h=mk('h2','','Victoire '+d_(nom(w))+nom(w));h.style.color=COL[w];vic.append(avatar(w),titreFin(h))}
  else vic.append(titreFin(mk('h2','','Match nul')));
  if(F.abandon!==undefined)vic.append(mk('p','pp-sous',nom(F.abandon)+(F.quitte?' a quitté la partie':' a abandonné')));
  else if(F.deckVide!==undefined)vic.append(mk('p','pp-sous','Victoire par deck vide : '+nom(F.deckVide)+' n\'avait plus de carte à piocher')); /* 0.4 */
  else if(F.departage&&F.scores[0]===F.scores[1])vic.append(mk('p','pp-sous','Égalité de points : départage à la Force'));
  vic.append(score('Score final',F.scores));pp.append(vic);
  const tb=mk('table','pp-tab'),hr=mk('tr');['','Manche 1','Manche 2','Manche 3','Total'].forEach(x=>hr.append(mk('th','',x)));tb.append(hr);
  const P=[1,2,3].map(m=>ptsManche(s,m));
  [BAS(),1-BAS()].forEach(p=>{const tr=mk('tr',w===p?'gagne':''),n=mk('td'),nm=mk('div','nm'),sp=mk('span','',nom(p));tr.style.setProperty('--c',COL[p]);sp.style.color=COL[p];nm.append(avatar(p),sp);n.append(nm);tr.append(n);
    P.forEach(x=>{const g=x&&x[p]>x[1-p],td=mk('td',g?'mg':'',x?String(x[p]):'-');td.style.color=g?COL[p]:'var(--texte)';tr.append(td)});
    const tt=mk('td','',String(F.scores[p]));tt.style.color=COL[p];tr.append(tt);tb.append(tr)});
  pp.append(tb);
  /* MVP calcule comme le site (M.bilan, comme l'Historique et la fin de partie) : « Nom, Titre » dans la couleur du joueur, pictos des elements */
  const B=Mo.bilan(s),x=B&&B.mvp;
  if(x){const C=Object.values(Mo.CARTES).find(c=>Mo.nomDetail(c)===x.carte||c.nom===x.carte),mv=mk('div','pp-mvp'),n=mk('button','pp-mvp-n',C?nomCourtC(C):x.carte);n.title=typeof u.nomComplet==='function'?u.nomComplet(x.carte):x.carte; /* 0.6a : forme courte, nom complet au survol */
    n.type='button';n.style.color=COL[x.joueur];if(C)n.onclick=()=>{u.cacheApercu();u.zoom(imgV('cartes/'+C.id+'.jpg'),C.nom)};
    const col=mk('div','pp-mvp-c'),l1=mk('div','pp-mvp-l1');l1.append(n);
    if(C&&C.el&&C.el.length){const e=mk('span','pp-mvp-els');C.el.forEach(y=>{const im=mk('img');im.src=imgV('cartes/'+y+'.png');im.alt=y;e.append(im)});l1.append(e)}
    col.append(l1);const pq=pourquoiMvp(x);if(pq)col.append(mk('div','pp-mvp-pq',pq));
    mv.append(mk('span','pp-mvp-e','MVP'),col);
    pp.append(mv)}
  rangFin(pp);
}
/* 0.6 : partie classee (vue joueur) : pastille « Classée » (J05) a cote du titre, encart de rang sous le MVP (maquette 21, classe a-e). */
const classeFin=()=>{const u=U(),P=src==='joueur'&&u?u.partie:null;return P&&P.classe?P.classe:null};
function titreFin(h){if(!classeFin())return h;const z=mk('div','pp-titre');z.append(h,mk('span','pp-cl','Classée'));return z}
function rangFin(pp){
  const c=classeFin(),C=window.GolemsClasse;if(!c||!c.res||!C)return;
  const x=c.res,A=C.affichage(x.profil),R=A.placement?A.estime:A.rang,i=C.RANGS.indexOf(R),suiv=C.RANGS[i+1],b=mk('div','pp-rang'),im=mk('img','pp-remb');
  im.src=imgV('images/rangs/'+(A.placement?'placement':R.id)+'.png');im.alt=R.nom;
  const mid=mk('div','pp-rmid'),l1=mk('div','pp-rl1'),nm=mk('b','pp-rnom',A.placement?'Placement '+A.n+'/'+A.sur:R.nom),el=mk('span','pp-relo');
  el.append(mk('small','','ELO'),' '+Math.round(x.avant)+' -> '+Math.round(x.apres));l1.append(nm);if(!A.placement)l1.append(el);
  const br=mk('div','pp-rbar'),bas=Number.isFinite(R.min)?R.min:(suiv?suiv.min-100:0),haut=suiv?suiv.min:bas+100,pct=e=>Math.max(0,Math.min(100,100*(e-bas)/(haut-bas)));
  const a=mk('i','pp-ra'),d=mk('i','pp-rd '+(x.delta>=0?'up':'down'));a.style.width=pct(Math.min(x.avant,x.apres))+'%';d.style.left=pct(Math.min(x.avant,x.apres))+'%';d.style.width=Math.abs(pct(x.apres)-pct(x.avant))+'%';br.append(a,d);
  const l3=mk('div','pp-rl3');l3.append(mk('span','',A.placement?'Rang révélé après '+A.sur+' parties':R.nom+' dès '+(Number.isFinite(R.min)?R.min:0)),mk('span','',suiv&&!A.placement?Math.ceil(suiv.min-x.apres)+' pts avant '+suiv.nom:''));
  mid.append(l1);if(!A.placement)mid.append(br);mid.append(l3);
  const pts=mk('div','pp-rpts '+(x.delta>=0?'up':'down'));pts.append(mk('b','',(x.delta>=0?'+':'')+x.delta),mk('small','',c.robot?'POINTS / 2':'POINTS'));
  b.append(im,mid,pts);pp.append(b);
}
/* Pourquoi MVP : meme formulation que ligneMvpD d'index.html (export Discord de l'Historique), valeurs nulles omises */
function pourquoiMvp(m){
  if(m.score==null)return '';
  const pl=(n,w)=>n+' '+w+(n>1?'s':''),l=[];
  if(m.force)l.push('Force '+m.force+' sur terrains gagnés');if(m.bonus)l.push(pl(m.bonus,'bonus donné'));
  if(m.degats)l.push(pl(m.degats,'dégât'));if(m.morts)l.push(pl(m.morts,'Golem')+' détruit'+(m.morts>1?'s':''));
  return 'Score '+m.score+(l.length?' - '+l.join(', '):'');
}

/* ---------- Ouverture et fermeture ---------- */
function ouvrir(source,entree){
  if(!window.GOLEMS_UI)return;
  if(D)fermer();
  src=source;E=entree;suivi=neufSuivi();if(source!=='rejeu')vitesseAnims(1);
  D=mk('div');D.id='dif';D.setAttribute('role','dialog');D.setAttribute('aria-label',source==='joueur'?'Partie':'Vue spectateur');
  scene=mk('div','d-scene');D.append(scene);
  /* telephone en portrait : la vue 16:9 se centre ; invitation discrete a tourner l'ecran */
  const tp=mk('div','d-tourne');tp.append(mk('span','','Tourne ton téléphone pour agrandir la vue.'));
  D.append(tp);
  if(source==='spec'){chat.brancher();setTimeout(decoSpec,0)}chat.vus=chat.liste().length;document.body.append(D);document.documentElement.classList.add('dif-ouvert');
  echelle();peindre();
}
/* ---------- Vue joueur (0.5) : l'ecran de partie sur ordinateur, a la mise en page de la vue spectateur (maquette mq2) ----------
   index.html dessine toujours la partie dans #partie (cache) ; a la fin de chaque affiche(), DIFFUSION.joueur() repeint la vue joueur :
   les vraies grilles, consigne, boutons et piles de #partie y sont deplaces (gestionnaires d'origine), la main y renvoie ses clics. */
const ECRAN_JOUEUR=matchMedia('(min-width:1200px) and (min-height:600px)');
function eventail(s,p){ /* main adverse en eventail de versos, resserre dans sa colonne */
  const z=mk('div','d-z d-col mq-haut'),n=s.j[p].main.length,h=mk('div','d-tm lui','Main '+d_(nom(p))+nom(p)),f=mk('div','mq-fan'),w=86;
  z.style.top='186px';h.style.margin='0';h.append(mk('span','',n+(n>1?' cartes':' carte')));
  let sp=Math.min(40,560/Math.max(1,n));
  for(let k=0;k<n;k++){const i=mk('img');i.src=imgV('cartes/verso.jpg');i.alt='';i.style.width=w+'px';i.style.height=Math.round(w*1.4)+'px';
    i.style.transform='rotate('+(n>1?(k-(n-1)/2)*(24/(n-1)):0)+'deg)';f.append(i)}
  const cx=src==='rejeu'?384:250,place=()=>[...f.children].forEach((i,k)=>i.style.left=(cx-w/2+(k-(n-1)/2)*sp)+'px');place();
  requestAnimationFrame(()=>{if(!scene)return;const im=[...f.children],R=scene.getBoundingClientRect(),k=R.width/1920||1;
    for(let t=0;t<60&&im.length>1;t++){const r=Math.max(...im.map(e=>(e.getBoundingClientRect().right-R.left)/k));if(r<=1500)break;sp*=.95;place()}});
  z.append(h,f);return z;
}
function peindreJoueur(s,qui){
  const u=U(),P=document.getElementById('partie'),po=P&&P.querySelector('.p-poste');
  D.classList.toggle('verrou',!!(P&&P.classList.contains('verrou')));
  scene.append(bandeau(s,qui),plateau(s,qui),eventail(s,1-E.moi),cercle(),actions(s),main(s,E.moi,876,false));
  /* etape : consigne de la partie, sinon « X : etape 1, Forge / etape 2, actions » */
  const et=mk('div','mq-etape'),cs=po&&po.querySelector(':scope>.p-consigne:not(.p-cale)');
  if(cs)et.append(cs);else{const d=mk('div','p-consigne'),q=M().attendus(s)[0],J=s.j[q];d.append(mk('b','',s.fin?'Partie terminée':q==null?'':nom(q)+(J&&J.etapeForge?' : étape 1, Forge':' : étape 2, actions')));et.append(d)}
  scene.append(et);
  /* cartes a choisir (main de choix de la partie, differente de ta main) : a la place de la derniere carte jouee */
  const mains=po?[...po.querySelectorAll(':scope>.p-main')]:[],mainJ=s.j[E.moi].main.join(),ch=mains.find(m=>[...m.querySelectorAll('.p-slot')].map(x=>x.dataset.c).join()!==mainJ);
  if(ch){const z=mk('div','d-z mq-choix');z.append(mk('div','mq-ch-t','Choisis une carte'),ch);scene.append(z);
    /* cartes entierement dans la section (791 x 472) : taille commune, ecarts egaux, de 1 a 6 cartes */
    const sl=[...ch.querySelectorAll(':scope>.p-slot')],n=Math.max(1,sl.length),G=16,W=791-28,H=472-28-26-10,w=Math.floor(Math.min((W-G*(n-1))/n,H*5/7));
    sl.forEach(x=>{x.style.width=w+'px';x.style.height=Math.round(w*7/5)+'px';x.style.flex='none'})}else scene.append(derniere(s));
  const bt=po&&po.querySelector(':scope>.p-btns:not(.p-cale)');if(bt){const b=mk('div','mq-btns');b.append(bt);scene.append(b)}
  const pl=mk('div','mq-piles');if(po)po.querySelectorAll('.p-piles>.pile').forEach(x=>pl.append(x));scene.append(pl);
  /* correctif 0.5a : ces piles ouvraient la fenetre de l'ancien ecran (#vueTas), cachee sous la vue joueur ; elles ouvrent maintenant la fenetre de la vue */
  pl.querySelectorAll('.pile').forEach(x=>{const k=['deck','forge','defausse'].find(c=>x.classList.contains(c)),n=k?E.etat.j[E.moi][k].length:0;
    if(!n){x.classList.remove('clic');x.onclick=x.onkeydown=null;x.removeAttribute('role');x.removeAttribute('tabindex');return}
    const f=()=>ouvrePop('pile',{p:E.moi,k});x.classList.add('clic');x.tabIndex=0;x.setAttribute('role','button');x.setAttribute('aria-label','Voir '+PILES[k]+' : '+n);
    x.onclick=f;x.onkeydown=e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();f()}}});
  /* outils : Chat (parties en ligne), Daltonien, ?, son, Quitter (confirmation) */
  const ou=mk('div','mq-outils p-outils'),o=typeof u.outils==='function'?u.outils():null;
  if(o){const v=o.querySelector('#btnVitesse');if(v)v.remove();const x=o.querySelector('.dal-inter .pf-itx');if(x)x.textContent='Daltonien';ou.append(...o.children)}
  const cf=document.querySelector('.chat.flottant');
  if(cf){const c=mk('button','d-chat','Chat'),nb=cf.querySelector('.chat-nb'),n=nb?+nb.textContent||0:0;c.type='button';if(n)c.append(mk('span','d-pastille',n>9?'9+':String(n)));
    c.onclick=()=>{cf.classList.toggle('replie');if(!cf.classList.contains('replie')){const i=cf.querySelector('input');if(i)i.focus()}placeChat()};const di=ou.querySelector('.dal-inter');if(di)di.after(c);else ou.prepend(c)}
  const q=mk('button','d-quit','Quitter');q.type='button';q.title='Quitter la partie';q.onclick=()=>u.quitteAvecConfirmation();ou.append(q);
  scene.append(ou);placeChat();decoJoueur();
}
/* Deconnexion (presence.js, window.DECO) : pastille 16 px au bord droit des deux bandeaux, etiquettes 171 x 38
   « Reconnexion » / « Hors ligne » a la place de « A toi / A lui de jouer » ; ma coupure : mon etiquette Reconnexion doree ;
   minuteur : bandeau dore a la place de l'encadre d'etape, barre detachee. L'ecran de fin par abandon reste celui de presence.js. */
const DK_LIB={att:'Reconnexion',off:'Hors ligne'};
/* pastille : centre vertical = centre de l'etiquette visible du bandeau (sinon de la ligne du nom), mesure dans le repere 1920 */
function centrePastilles(){if(!scene)return;const k=scene.getBoundingClientRect().height/1080||1;
  scene.querySelectorAll('.d-ban>.d-j').forEach(b=>{const pt=b.querySelector(':scope>.dk-pt');if(!pt)return;
    const ref=[...b.querySelectorAll('.d-badge')].find(x=>!x.hidden&&x.offsetWidth)||b.querySelector('.d-l1');if(!ref)return;
    const rb=b.getBoundingClientRect(),rr=ref.getBoundingClientRect(),bt=parseFloat(getComputedStyle(b).borderTopWidth)||0;
    pt.style.marginTop='0';pt.style.top=((rr.top+rr.height/2-rb.top)/k-bt-8)+'px'})}
const mnS=ms=>{const s=Math.ceil(ms/1000);return Math.floor(s/60)+':'+String(s%60).padStart(2,'0')};
function decoJoueur(){
  if(!D||src!=='joueur'||!window.DECO)return;
  const e=DECO.etat()||{},on=!!e.actif;
  scene.querySelectorAll('.dk-pt,.dk-et').forEach(x=>x.remove());
  scene.querySelectorAll('.d-badge.dk-lab').forEach(x=>x.remove());
  scene.querySelectorAll('.d-badge.dk-cache').forEach(x=>{x.hidden=false;x.classList.remove('dk-cache')});
  D.classList.toggle('dk-on',on);
  const et=scene.querySelector('.mq-etape');if(et)et.hidden=false;
  if(!on)return;
  [['toi',e.moi||'ok'],['lui',e.lui||'ok']].forEach(([c,st])=>{
    const b=scene.querySelector('.d-ban>.d-j.'+c);if(!b)return;
    const pt=mk('i','dk-pt '+st);pt.title=st==='ok'?'En ligne':DK_LIB[st];b.append(pt);
    if(st!=='ok'){const l1=b.querySelector('.d-l1'),bg=l1&&l1.querySelector('.d-badge');if(bg){bg.hidden=true;bg.classList.add('dk-cache')}
      if(l1)l1.append(mk('span','d-badge dk-lab '+st,DK_LIB[st]))}
  });
  centrePastilles();
  if(e.lui==='off'&&e.reste!=null&&et){
    const m=mk('div','dk-et'),tx=mk('div','t'),br=mk('div','barre'),i=mk('i');m.setAttribute('role','status');
    tx.append(mk('b','','Partie : '+(e.nomLui||nom(1-E.moi))+" s'est déconnecté."),mk('span','','Sans retour à temps, tu gagnes par abandon.'));
    i.style.width=(100*e.reste/(e.total||60000))+'%';br.append(i);m.append(tx,mk('div','n',mnS(e.reste)),br);
    et.hidden=true;scene.append(m);
  }
}
if(window.DECO&&DECO.onChange)DECO.onChange(decoJoueur);else addEventListener('load',()=>{if(window.DECO&&DECO.onChange)DECO.onChange(decoJoueur)});
/* Vue spectateur : connexion des deux joueurs lue dans la presence du salon (salons/{code}/pres/{uid}), memes seuils que presence.js
   (10 s de reconnexion, puis 60 s) ; minuteur au texte neutre. */
function decoSpec(){
  if(!D||src!=='spec'||!E||!E.uids)return;
  const S=window.SPEC;if(!S||typeof S.pres!=='function')return;
  const et=S.pres()||{},now=typeof S.heure==='function'?S.heure():Date.now(),fin=E.etat&&E.etat.fin;
  scene.querySelectorAll('.dk-pt,.dk-et,.d-badge.dk-lab').forEach(x=>x.remove());
  scene.querySelectorAll('.d-badge.dk-cache').forEach(x=>{x.hidden=false;x.classList.remove('dk-cache')});
  if(!Object.keys(et).length)return;
  D.classList.add('dk-on');let minu=null;
  [0,1].forEach(p=>{const u=E.uids[p],e=u&&et[u];let st='ok',reste=null;
    if(e&&e.c===false&&!fin){const t0=+e.t||now;if(now<t0+10000)st='att';else{st='off';reste=Math.max(0,t0+70000-now)}}
    const b=scene.querySelector('.d-ban>.d-j.'+(p===BAS()?'toi':'lui'));if(!b)return;
    const pt=mk('i','dk-pt '+st),l1=b.querySelector('.d-l1'),nm=l1&&l1.querySelector('.d-nom');pt.title=st==='ok'?'En ligne':DK_LIB[st];if(nm)nm.after(pt);else b.append(pt); /* vue spectateur : pastille juste apres le nom */
    if(st!=='ok'){const bg=l1&&l1.querySelector('.d-badge');if(bg){bg.hidden=true;bg.classList.add('dk-cache')}if(l1)l1.append(mk('span','d-badge dk-lab '+st,DK_LIB[st]))}
    if(st==='off'&&!minu)minu={p,reste}});
  /* defaite declaree (salons/{code}/forfait, depuis le debut de cette partie) : ecran neutre « Fin par abandon » */
  if(!fin&&typeof S.forfaits==='function'&&!suivi.abandon){const FF=S.forfaits()||{};if(!suivi.ffVus)suivi.ffVus=new Set(Object.keys(FF)); /* forfaits deja la a l'arrivee : parties precedentes du salon */
    const F=Object.keys(FF).filter(k=>!suivi.ffVus.has(k)).map(k=>FF[k]).filter(x=>x&&E.uids.includes(x.u)).pop();
    if(F){suivi.abandon=1;scene.querySelectorAll('.dk-et').forEach(x=>x.remove());ouvrePop('abandon',E.uids.indexOf(F.u));return}}
  if(suivi.abandon)return;
  if(minu){const m=mk('div','dk-et dk-spec'),tx=mk('div','t'),br=mk('div','barre'),i=mk('i');m.setAttribute('role','status');
    tx.append(mk('b','','Partie : '+nom(minu.p)+" s'est déconnecté."),mk('span','','Sans retour à temps, il perd par abandon.'));
    i.style.width=(100*minu.reste/60000)+'%';br.append(i);m.append(tx,mk('div','n',mnS(minu.reste)),br);scene.append(m)}
}
setInterval(decoSpec,1000);
/* chat de la partie en ligne : panneau de la maquette (colonne de droite, jusqu'au bas de « Dernieres actions ») quand il est ouvert */
function placeChat(){const cf=document.querySelector('.chat.flottant');if(!cf||!scene)return;const o=!cf.classList.contains('replie');cf.classList.toggle('mq-chatw',o);
  if(o&&cf.parentNode!==scene)scene.append(cf);else if(!o&&cf.parentNode===scene)document.body.append(cf)}
/* ---------- Vue joueur, telephone (0.5, maquette mqt2 v10) : #partie reste l'ecran, re-agence par html.tel-joueur ----------
   barre d'action collee en bas (etape + vrais boutons), main defilante avec fleche, apercu au toucher (Jouer / Fermer),
   barre du haut sur une ligne, eventail adverse dans le bandeau Golem, ligne « Daltonien » sous le Journal. */
const TEL=matchMedia('(max-width:899px)');
function telephone(P){
  const H=document.documentElement,box=document.getElementById('partie');
  const ok=P&&P.etat&&!P.rejeu&&TEL.matches&&box&&!box.hidden&&!(window.SPEC&&SPEC.estSpectateur&&SPEC.estSpectateur());
  H.classList.toggle('tel-joueur',!!ok);document.querySelectorAll('#mqAp').forEach(x=>x.remove());if(!ok)return;
  const u=U(),s=P.etat,moi=P.moi,lui=1-moi,att=s.fin?[]:M().attendus(s),aMoi=att.includes(moi),nomJ=u.nomJ;
  const camps={[moi]:box.querySelector('.p-camp.toi'),[lui]:box.querySelector('.p-camp.lui')};
  const e=window.DECO&&DECO.etat?DECO.etat():{},on=!!e.actif,etat={[moi]:on?e.moi||'ok':null,[lui]:on?e.lui||'ok':null};
  [moi,lui].forEach(p=>{const c=camps[p];if(!c)return;let l1=c.querySelector('.p-l1');
    if(!l1){l1=mk('div','p-l1');const b=c.querySelector(':scope>b');if(b){b.before(l1);l1.append(b)}else c.prepend(l1)}
    const st=etat[p];
    if(st&&st!=='ok')l1.append(mk('span','mq-lab dk-'+st,DK_LIB[st]));
    else if(att.includes(p))l1.append(mk('span','mq-lab',p===moi?'À toi de jouer':'À lui de jouer'));
    if(st){const d=mk('span','mq-pt dk-'+st);d.title=st==='ok'?'En ligne':DK_LIB[st];l1.append(d)}});
  /* main adverse : eventail 34 px dans le bandeau Golem */
  const n=s.j[lui].main.length,z=mk('div','mqt'),sm=mk('small'),f=mk('div','mqt-fan'),w=24,sp=Math.min(9,70/Math.max(1,n));
  if(att.includes(lui)){sm.append(mk('b','',String(n)),'cartes')}else{sm.append(mk('b','','Main de '+nomJ(lui)),n+' cartes')}
  f.style.setProperty('--fw',Math.round(w+(n-1)*sp+8)+'px');
  for(let k=0;k<n;k++){const i=mk('img');i.src=imgV('cartes/verso.jpg');i.alt='';i.style.width=w+'px';i.style.height=Math.round(w*1.4)+'px';i.style.left=(4+k*sp)+'px';i.style.transform='rotate('+(n>1?(k-(n-1)/2)*(20/(n-1)):0)+'deg)';f.append(i)}
  z.append(sm,f);if(camps[lui])camps[lui].append(z);
  box.querySelectorAll('.p-tete').forEach(x=>x.classList.toggle('long',x.textContent.trim().length>13));
  /* barre d'action collee en bas : etape + vrais boutons, puis la main (ou les cartes a choisir) */
  const po=box.querySelector('.p-poste');if(!po)return;
  const cs=po.querySelector('.p-consigne:not(.p-cale)'),L=mk('div','mqb-l'),c=mk('div','mqb-c'),forge=aMoi&&s.j[moi].etapeForge;
  const t1=s.fin?'Partie terminée':aMoi?(cs&&cs.querySelector('b')?cs.querySelector('b').textContent:forge?'Étape 1 : Forge':'Étape 2 : actions'):'Tour de '+nomJ(att[0]!=null?att[0]:lui);
  c.append(t1,mk('small','',aMoi?'Touche une carte':'Touche une carte pour la lire'));L.append(c);
  const bt=po.querySelector(':scope>.p-btns:not(.p-cale)');if(bt)bt.querySelectorAll('.btn').forEach(b=>{b.classList.add('mqb-b');if(!b.classList.contains('sec'))b.classList.add('plein');L.append(b)});
  const Mm=mk('div','mqb-m'),r=mk('div','mqb-r'),mains=[...po.querySelectorAll(':scope>.p-main')];
  const mj=s.j[moi].main.join(),src=mains.find(m=>[...m.querySelectorAll('.p-slot')].map(x=>x.dataset.c).join()!==mj)||mains[0];
  const cartes=src?[...src.querySelectorAll('.p-carte')]:[];
  const ouvre=(x,i)=>{document.querySelectorAll('#mqAp').forEach(y=>y.remove());const o=mk('div');o.id='mqAp';const im=mk('img');im.src=x.querySelector('img').src;im.alt='';
    const b=mk('div','mqa-b'),fe=mk('button','mqb-b','Fermer');fe.type='button';fe.onclick=()=>o.remove();
    if(x.dataset.act&&!x.classList.contains('grisee')){const okb=mk('button','mqb-b plein',forge?'Forger':'Jouer');okb.type='button';okb.onclick=()=>{o.remove();x.click()};b.append(fe,okb)}else b.append(fe);
    const sl=x.parentNode,oe=sl&&sl.querySelector('.oeil');if(oe){const z2=mk('button','mqb-b','Détails');z2.type='button';z2.onclick=()=>{o.remove();oe.click()};b.prepend(z2)}
    const ra=x.querySelector('.raison');o.append(im,mk('p','','Carte '+(i+1)+' sur '+cartes.length+(x.classList.contains('surtaxe')?' - surcoût':'')+(ra?' - '+ra.textContent:'')),b);
    o.onclick=ev=>{if(ev.target===o)o.remove()};document.body.append(o);r.querySelectorAll('button').forEach(y=>y.classList.remove('choisi'));if(r.children[i])r.children[i].classList.add('choisi')};
  cartes.forEach((x,i)=>{const b=mk('button');b.type='button';if(x.classList.contains('surtaxe'))b.className='surtaxe';if(x.classList.contains('grisee'))b.classList.add('grisee');const im=mk('img');im.src=x.querySelector('img').src;im.alt=x.querySelector('img').alt||'';b.append(im);
    {const sl=x.parentNode,cc=sl&&sl.dataset.c,C=cc!=null&&M().carte(+cc);if(C&&C.base){const st=mk('span','evs','★');st.setAttribute('aria-hidden','true');b.append(st)}} /* evolution : etoile a cote du cout */
    b.onclick=()=>ouvre(x,i);r.append(b)});
  const g=mk('div','mqb-g','›');Mm.append(r,g);const majG=()=>{g.style.display=r.scrollLeft+r.clientWidth>=r.scrollWidth-2?'none':'flex'};r.addEventListener('scroll',majG);
  po.append(L,Mm);requestAnimationFrame(majG);
  window.__telOuvre=i=>ouvre(cartes[i||0],i||0);
  /* barre du haut : Chat (en ligne), ?, son, Quitter ; « Daltonien » sur sa ligne sous le Journal */
  const ou=box.querySelector('.p-outils');
  if(ou){const v=ou.querySelector('#btnVitesse');if(v)v.remove();const di=ou.querySelector('.dal-inter');if(di)di.remove();
    const cf=document.querySelector('.chat.flottant');
    if(cf){const ch=mk('button','mq-chat','Chat'),nb=cf.querySelector('.chat-nb'),k=nb?+nb.textContent||0:0;ch.type='button';if(k)ch.append(mk('i','',k>9?'9+':String(k)));ch.onclick=()=>{cf.classList.toggle('replie')};ou.prepend(ch)}
    const q=mk('button','mq-q','Quitter');q.type='button';q.onclick=()=>u.quitteAvecConfirmation();ou.append(q)}
  const cote=box.querySelector('.p-cote');
  if(cote&&window.interDal){const l=mk('div','mq-dal');l.append(interDal('Daltonien'));cote.append(l)}
}
function joueur(){
  const u=U();if(!u)return;const P=u.partie,box=document.getElementById('partie');
  if(D&&src==='rejeu'){if(P&&P.rejeu&&P.etat){E.etat=P.etat;peindre()}else fermer();return}
  try{telephone(P)}catch(e){console.warn(e)}
  const ok=P&&P.etat&&!P.rejeu&&ECRAN_JOUEUR.matches&&box&&!box.hidden&&!(window.SPEC&&SPEC.estSpectateur&&SPEC.estSpectateur());
  if(!ok){if(D&&src==='joueur')fermer();return}
  const x={etat:P.etat,moi:P.moi,noms:[0,1].map(p=>u.nomJ(p)),avatars:[0,1].map(p=>p===P.moi?u.monAvatar():''),uids:[0,1].map(p=>p===P.moi||P.local?'':u.uidJ(p))};
  /* nouvelle partie dans la meme vue (revanche) : memoire de la vue remise a zero (fenetres, derniere carte, manches vues) */
  if(D&&src==='joueur'&&suivi&&suivi.P!==P){if(suivi.pile)U().cacheApercu();if(suivi.pop)suivi.pop.remove();suivi=neufSuivi();suivi.P=P}
  if(D&&src==='joueur'){E=x;peindre();return}
  ouvrir('joueur',x);suivi.P=P;D.classList.add('jr');document.documentElement.classList.add('dif-joueur');
  /* plein ecran au demarrage de la partie (geste de l'utilisateur : clic sur Jouer) ; refuse = rien */
  try{if(!document.fullscreenElement&&document.documentElement.requestFullscreen)document.documentElement.requestFullscreen().catch(()=>{})}catch(e){}
}
/* vue joueur : un bilan de manche de la partie ouvert (cache) sans fenetre de la vue = on ouvre celle de la vue (sinon la partie attendrait « Continuer ») */
setInterval(()=>{if(!D||src!=='joueur'||!suivi||suivi.pop||suivi.popT)return;const r=document.getElementById('recap');if(!r||r.hidden||!E.etat.stats)return;
  /* partie finie : le bilan de la manche 3 est deja dans la fenetre de fin ; il est seulement marque vu (sinon il revenait apres « Revanche ») */
  if(E.etat.fin){const c=document.getElementById('continuer');if(c)c.click();return}
  const n=Math.max(1,Math.floor(E.etat.stats.t.length/3));ouvrePop('manche',n)},400);
/* « Quitter la partie » (spectateur) : la diffusion se ferme et le spectateur quitte la partie comme avec l'ancien bouton Quitter ;
   demonstration : « Quitter la diffusion » arrete la partie locale */
let sortieSpec=false; /* le spectateur vient de quitter : pas de reouverture tant qu'il est encore inscrit */
function quitter(){if(src==='rejeu'){fermer();rejeu.cmd('quitter');return}const sp=src==='spec';fermer();if(sp){sortieSpec=true;const u=U();if(u&&typeof u.quitteBouton==='function')u.quitteBouton()}}
function fermer(){
  if(!D)return;
  if(chat.el){chat.el.remove();chat.el=null}
  if(src==='demo')demo.stop();
  if(src==='joueur'){const cf=document.querySelector('.chat.flottant');if(cf&&D.contains(cf)){cf.classList.remove('mq-chatw');document.body.append(cf)}
    document.documentElement.classList.remove('dif-joueur');try{if(document.fullscreenElement)document.exitFullscreen().catch(()=>{})}catch(e){}}
  desStop();D.remove();D=null;scene=null;E=null;src=null;suivi=null;document.documentElement.classList.remove('dif-ouvert');
}

/* ---------- Vue spectateur : bouton « Mode diffusion » et mise a jour en direct ---------- */
function lisSpec(x){
  if(!x)return null;
  if(x.etat&&x.etat.j){
    if(Array.isArray(x.joueurs)&&!x.noms){const f=x.joueurs;return {etat:x.etat,noms:f.map(o=>o&&o.pseudo||''),avatars:f.map(o=>o&&o.avatar||''),uids:f.map(o=>o&&o.uid||'')}}
    return {etat:x.etat,noms:x.noms||[],avatars:x.avatars||[],uids:x.uids||[]}}
  if(x.j)return {etat:x,noms:x.noms||[],avatars:x.avatars||[],uids:[]};
  return null;
}
let dernierSpec=null;
/* joueurs partis (fin de partie) : on garde leurs noms et avatars deja connus */
function garde(x){if(!E)return;['noms','avatars','uids'].forEach(k=>{const a=x[k]||(x[k]=[]),o=E[k]||[];[0,1].forEach(p=>{if(!a[p]&&o[p])a[p]=o[p]})})}
function brancheSpec(){
  const S=window.SPEC_UI;if(!S||S.__dif)return !!S;
  const o=S.peindrePartieSpectateur;
  S.peindrePartieSpectateur=function(e){const r=o.apply(this,arguments);dernierSpec=e;try{if(D&&src==='spec'){const x=lisSpec(e);if(x){garde(x);E=x;peindre()}}
    /* un spectateur est toujours en vue diffusion : elle s'ouvre des qu'il regarde une partie */
    else if(!D&&!sortieSpec&&window.SPEC&&SPEC.estSpectateur&&SPEC.estSpectateur()&&document.querySelector('#partie.sp')){const x=lisSpec(e);if(x)ouvrir('spec',x)}}catch(z){console.warn(z)}return r};
  /* plus spectateur (sortie du salon) : la diffusion se ferme ; une nouvelle entree comme spectateur la rouvrira */
  if(window.SPEC&&SPEC.onChange)SPEC.onChange(()=>{if(SPEC.estSpectateur())return;sortieSpec=false;if(D&&src==='spec')fermer()});
  S.__dif=true;return true;
}
if(!brancheSpec()){let n=0;const t=setInterval(()=>{if(brancheSpec()||++n>100)clearInterval(t)},100)}

/* ---------- Demonstration (site d'essai seulement) : Golem Bleu contre Golem Rouge, robots Normal, deck par defaut ---------- */
const demo={t:0,s:null,arret:true,enPause:false,
  lance(){
    if(D)fermer(); /* relance : l'ancienne partie s'arrete avant que la nouvelle commence */
    const Mo=M(),dk=Mo.deckTexte(Mo.DECK_DEFAUT);
    this.s=Mo.nouvelle((Math.random()*2147483647)|0,[dk,dk]);this.arret=false;this.enPause=false;
    ouvrir('demo',{etat:this.s,noms:['Golem Bleu','Golem Rouge'],avatars:['golem67v2','golemheart'],uids:[]});
    this.suite();
  },
  /* temps reel : environ 1,5 a 2 s par action (mulligan plus court) ; ne s'arrete pas pour les fenetres de fin de manche */
  suite(){
    clearTimeout(this.t);if(this.arret||this.enPause||!this.s||this.s.fin)return;
    const s=this.s,Mo=M(),p=Mo.attendus(s)[0];if(p===undefined)return;
    const a=Mo.robot(s,p,'normal');if(!a)return;
    const ms=a.t==='m'?900:a.t==='p'?2000:a.t==='x'?1500:1700;
    this.t=setTimeout(()=>{if(this.arret||this.enPause)return;
      try{Mo.applique(s,p,a)}catch(e){console.warn('Démonstration',e);return}
      if(D&&src==='demo')peindre();this.suite()},ms);
  },
  pause(){this.enPause=true;clearTimeout(this.t)},
  reprend(){if(!this.enPause)return;this.enPause=false;this.suite()},
  stop(){this.arret=true;clearTimeout(this.t);this.s=null}
};
function blocDemo(){
  if(!ESSAI||document.getElementById('blocDemo'))return;
  const r=document.getElementById('blocRobot');if(!r)return;
  const b=mk('div','bloc'),bt=mk('button','btn plein','Démonstration');b.id='blocDemo';bt.type='button';bt.id='lanceDemo';
  b.append(mk('h3','','Démonstration en vue diffusion'),bt);bt.onclick=()=>demo.lance();r.after(b);
}
blocDemo();

/* ---------- Rejeu (0.6, maquette 45 B) : vue spectateur, main adverse de dos, commandes a la place du logo ----------
   Le calcul reste dans onglets/historique.js (partie.rejeu) : la vue lit window.__golemsRejeu() et commande par window.__golemsRejeuCmd(nom,val). */
const rejeu={
  info(){return window.__golemsRejeu?window.__golemsRejeu():null},
  lecture(){const r=this.info();return !!(r&&r.lecture)},
  cmd(n,v){if(window.__golemsRejeuCmd)window.__golemsRejeuCmd(n,v)},
  ouvre(x){ouvrir('rejeu',{etat:x.etat,noms:x.noms,avatars:x.avatars||['',''],uids:[],moi:x.moi});D.classList.add('rj');D.setAttribute('aria-label','Rejeu');this.maj()},
  /* barre seule repeinte (position, Lecture/Pause, vitesse) */
  maj(){const r=this.info();if(r)vitesseAnims(r.vitesse);if(!D||src!=='rejeu')return;const b=scene.querySelector('.d-coin');if(b)b.replaceWith(coinRejeu())},
  /* retour arriere ou saut : animations coupees, vue repeinte comme a une arrivee en cours de partie */
  saut(etat){if(!D||src!=='rejeu')return;clearTimeout(suivi.popT);clearTimeout(finVol);if(suivi.pile)U().cacheApercu();
    desStop();suivi=neufSuivi();suivi.calme=true;if(couche){couche.getAnimations({subtree:true}).forEach(a=>a.cancel());couche.textContent=''}
    if(etat)E.etat=etat;peindre();suivi.calme=false},
  /* etat des fenetres pour la lecture : 'attente' (etoiles en vol avant la fenetre), 'manche', 'partie' ou null */
  pop(){if(!suivi)return null;if(suivi.popT)return 'attente';return suivi.pop&&suivi.vu?suivi.vu.type:null},
  fermePop(){if(suivi&&suivi.pop)fermePop()},
  /* temps restant des animations en cours (ms), pour cadencer la lecture */
  reste(){if(!suivi)return 0;const t=performance.now();let f=0;if(suivi.vol)f=Math.max(f,suivi.vol.fin-t);suivi.etArr.forEach(a=>f=Math.max(f,a.t-t));
    if(couche)couche.getAnimations({subtree:true}).forEach(a=>{const e=a.effect&&a.effect.getComputedTiming();if(e&&e.endTime&&a.currentTime!=null)f=Math.max(f,e.endTime-a.currentTime)});return Math.max(0,f)}
};
function coinRejeu(){
  const r=rejeu.info()||{pos:0,total:0,manche:1,vitesse:1,lecture:false,fin:false},z=mk('div','d-z d-coin'),B=mk('div','d-bloc d-rj'),bas=mk('div','d-bas');
  B.setAttribute('role','toolbar');B.setAttribute('aria-label','Rejeu');
  const r1=mk('div','d-rj-l'),ps=mk('div','d-rj-pos');ps.append(mk('b','','Coup '+r.pos+' / '+r.total),mk('span','',' - Manche '+r.manche));r1.append(ps);
  const chev=d=>'<svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true"><path d="'+(d<0?'M15 4 7 12l8 8':'M9 4l8 8-8 8')+'" fill="none" stroke="currentColor" stroke-width="3.2" stroke-linecap="round" stroke-linejoin="round"/></svg>';
  const bt=(t,cl,lib,n,off)=>{const b=mk('button','sc-btn '+cl,t==='‹'||t==='›'?null:t);if(t==='‹'||t==='›')b.innerHTML=chev(t==='‹'?-1:1);b.type='button';if(lib)b.setAttribute('aria-label',lib);b.disabled=!!off;b.onclick=()=>rejeu.cmd(n);return b};
  const au=r.pos>=r.total,r2=mk('div','d-rj-cmd');
  r2.append(bt('Début','sc-secondaire','Aller au début','debut',r.pos<=0),bt('‹','sc-secondaire d-rj-fl','Coup précédent','prec',r.pos<=0),
    bt(r.lecture?'Pause':au?'Revoir':'Lecture','d-rj-pp',r.lecture?'Mettre en pause':au?'Revoir depuis le début':'Lancer la lecture','lecture'),
    bt('›','sc-secondaire d-rj-fl','Coup suivant','suiv',au),bt('Fin','sc-secondaire','Aller à la fin','fin',au));
  const r3=mk('div','d-rj-l'),v=mk('div','sc-sel sc-petit');v.setAttribute('role','group');v.setAttribute('aria-label','Vitesse');
  [1,2,4].forEach(k=>{const b=mk('button','','x'+k);b.type='button';b.setAttribute('aria-pressed',String(r.vitesse===k));b.onclick=()=>rejeu.cmd('vitesse',k);v.append(b)});
  r3.append(mk('span','d-rj-vt','Vitesse'),v);B.append(r1,r2,r3);
  if(window.interDal)bas.append(interDal('Daltonien'));
  const qt=mk('button','d-quit','Quitter le rejeu');qt.type='button';qt.onclick=quitter;bas.append(qt);
  z.append(B,bas);return z;
}

window.DIFFUSION={ouvrir,fermer,joueur,demo,peindre,chat,rejeu,etat:()=>({ouvert:!!D,src,pause:demo.enPause,pop:!!(suivi&&suivi.pop),fin:!!(E&&E.etat&&E.etat.fin)})};
})();
