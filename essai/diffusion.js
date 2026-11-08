/* Vue diffusion (0.3a) : ecran 1920 x 1080 pour un stream, mis a l'echelle proportionnellement.
   - Vue spectateur (partie en ligne) : le spectateur est toujours en vue diffusion ; « Quitter la partie » le ramene au site (comme l'ancien bouton Quitter).
   - Site d'essai (/essai/) seulement : bouton « Demonstration » dans l'onglet Jouer, partie Golem contre Golem locale (sans serveur ni compte).
   Lit les fonctions d'index.html par window.GOLEMS_UI et le moteur (GOLEMS_UI.M) ; ne modifie ni index.html ni spectateur-ui.js.
   Ici : window.DIFFUSION. CSS : diffusion.css (tout sous #dif). */
(function(){
'use strict';
const ESSAI=location.pathname.split('/')[1]==='essai';
/* couleurs par joueur : en vue joueur, le joueur de l'ecran est toujours en bleu (--moi), meme s'il est le joueur 2 */
const inv=()=>src==='joueur'&&E&&E.moi===1;
const COL={get 0(){return inv()?'var(--lui)':'var(--moi)'},get 1(){return inv()?'var(--moi)':'var(--lui)'}};
const BAS=()=>src==='joueur'&&E?E.moi:0; /* joueur affiche en bas (vue joueur : toi ; vue spectateur : joueur 1) */
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
/* noms de cartes et de terrains en gras (blanc), evolutions en dore */
const nbCartes=x=>{const N=noms(),f=document.createDocumentFragment();x.split(N.re).forEach((m,i)=>{if(!m)return;if(i%2)f.append(mk('b',N.evo.has(m)?'d-ca d-evo d-nw':'d-ca d-nw',m));else f.append(m)});return f};

/* ---------- Etat de la vue ---------- */
let D=null,scene=null,src=null,E=null; /* src : 'spec' ou 'demo' ; E : {etat, noms, avatars, uids} */
let suivi=null; /* memoire entre deux peintures : poses vues, halo, manches et fin deja annoncees */
function neufSuivi(){return {nev:-1,der:null,lieu:{},halo:null,nt:-1,fin:false,pop:null,vu:null,vol:null,morts:[],flash:{},snap:null,arr:{}}}
/* Animations (0.3a) : pose qui glisse de la main a la case, Golem detruit qui s'efface, Force qui clignote, moments forts du journal.
   Purement visuelles : la vue est repeinte a chaque action, chaque animation est rejouee ou elle en etait (delai negatif) ;
   aucune n'attend ni ne retarde la partie. prefers-reduced-motion : ni glissement ni clignotement. */
const REDUIT=matchMedia('(prefers-reduced-motion: reduce)');
const VOL=500,EFFACE=600,FLASH=1000,LUEUR=1600;
let couche=null,finVol=0;
const delai=t=>((t-performance.now())/1000)+'s';
/* rectangle d'un element dans le repere de la scene (1920 x 1080, avant mise a l'echelle) */
function rectScene(e){const r=e.getBoundingClientRect(),R=scene.getBoundingClientRect(),k=R.width/1920||1;return {x:(r.left-R.left)/k,y:(r.top-R.top)/k,w:r.width/k,h:r.height/k}}
const caseDe=(p,l,k,racine)=>(racine||scene).querySelector('.p-case[data-p="'+p+'"][data-l="'+l+'"][data-k="'+k+'"]');
/* Golems en jeu : cle joueur:carte -> [l,k,Force affichee] */
function photo(s){const Mo=M(),r={};for(let p=0;p<2;p++)for(let l=0;l<3;l++)for(let k=0;k<3;k++){const g=s.j[p].grille[l][k];if(g&&!Mo.carte(g.c).animal)r[p+':'+g.c]=[l,k,Mo.forceDe(s,p,l,k)]}return r}
/* Avant de vider la scene : nouvelles poses (depart dans la main), Golems detruits (copie de leur case), Forces changees */
function prepareAnims(s,premier,nev0){
  const t=performance.now(),Mo=M(),ap=photo(s),av=suivi.snap;suivi.snap=ap;
  if(premier)return;
  const ev=s.stats.ev;let pose=null;const morts=[];
  for(let i=Math.max(0,nev0);i<ev.length;i++){const e=ev[i];if(e.t==='p')pose=e;else if(e.t==='m')morts.push(e)}
  let t0=t; /* debut des effets de cette action : a l'arrivee de la carte posee */
  if(pose&&scene){const x=chercheCarte(s,pose.cp,pose.cc);
    if(x&&!REDUIT.matches){
      const b=scene.querySelector('.d-col[data-p="'+pose.cp+'"] button[data-c="'+pose.cc+'"]'),zm=scene.querySelector('.d-col[data-p="'+pose.cp+'"] .d-main');
      let de=b?rectScene(b):zm?rectScene(zm):null;
      if(de&&!b)de={x:de.x+de.w/2-51,y:de.y,w:103,h:144};
      const ca=caseDe(pose.cp,x[0],x[1]),vi=ca&&ca.querySelector(':scope>.mini');
      if(de){t0=t+VOL;suivi.vol={p:pose.cp,c:pose.cc,l:x[0],k:x[1],de,fin:t0,vieux:vi?vi.cloneNode(true):null,vevo:!!(ca&&ca.classList.contains('evo')),lance:false}}}
    if(suivi.halo&&suivi.halo.c===pose.cc)suivi.halo.t=t0;}
  /* Golems detruits par cette action : ils s'effacent ensemble */
  if(av&&scene)morts.forEach(e=>{const o=av[e.cp+':'+e.cc];if(!o)return;const ca=caseDe(e.cp,o[0],o[1]),vi=ca&&ca.querySelector(':scope>.mini:not(.d-fantome):not(.d-vieux)');
    if(vi)suivi.morts.push({p:e.cp,l:o[0],k:o[1],n:vi.cloneNode(true),t:t0})});
  /* Force affichee changee (meme Golem) : vert si elle monte, rouge si elle baisse */
  if(av&&!REDUIT.matches)Object.keys(ap).forEach(q=>{const o=av[q];if(o&&o[2]!==ap[q][2])suivi.flash[q]={h:ap[q][2]>o[2],t:t0}});
}
/* Apres la peinture du plateau : carte en vol, copies qui s'effacent, chiffres qui clignotent */
function decore(s,plat){
  const t=performance.now(),v=suivi.vol;
  if(v&&t<v.fin){const x=chercheCarte(s,v.p,v.c);
    if(x&&x[0]===v.l&&x[1]===v.k){const c=caseDe(v.p,v.l,v.k,plat);
      if(c){c.dataset.evo=c.classList.contains('evo')?'1':'';c.classList.add('d-vol');c.classList.toggle('evo',v.vevo);if(v.vieux){const o=v.vieux.cloneNode(true);o.classList.add('d-vieux');c.append(o)}}}
    clearTimeout(finVol);finVol=setTimeout(atterrit,v.fin-t+10)}
  else suivi.vol=null;
  suivi.morts=suivi.morts.filter(m=>t<m.t+EFFACE+100);
  suivi.morts.forEach(m=>{const c=caseDe(m.p,m.l,m.k,plat);if(!c)return;const o=m.n.cloneNode(true);o.classList.add('d-fantome');o.style.animationDelay=delai(m.t);c.append(o)});
  Object.keys(suivi.flash).forEach(q=>{const f=suivi.flash[q];if(t>f.t+FLASH){delete suivi.flash[q];return}
    const[p,cc]=q.split(':'),x=chercheCarte(s,+p,+cc),c=x&&caseDe(p,x[0],x[1],plat),e=c&&c.querySelector(':scope>.mini:not(.d-vieux) .f');
    if(e){e.classList.add(f.h?'d-fh':'d-fb');e.querySelector('b').style.animationDelay=delai(f.t)}});
}
/* Fin du vol : la case montre la carte posee (sans repeindre) */
function atterrit(){if(!scene)return;scene.querySelectorAll('.p-case.d-vol').forEach(c=>{c.classList.remove('d-vol');c.classList.toggle('evo',c.dataset.evo==='1');c.querySelectorAll(':scope>.d-vieux').forEach(o=>o.remove())})}
/* Carte qui glisse de la main a sa case (couche au-dessus de la scene, gardee d'une peinture a l'autre) */
function lanceVol(){
  const v=suivi.vol;if(!v||v.lance||!couche)return;v.lance=true;
  const c=caseDe(v.p,v.l,v.k);if(!c)return;
  const a=rectScene(c),d=v.de,sc=a.h*1.2/d.h,dx=a.x+a.w/2-d.x-d.w*sc/2,dy=a.y+a.h/2-d.y-d.h*sc/2,im=mk('img','d-vole'),reste=v.fin-performance.now();
  if(reste<50)return;
  im.src=U().srcC(v.c);im.alt='';Object.assign(im.style,{left:d.x+'px',top:d.y+'px',width:d.w+'px',height:d.h+'px'});couche.append(im);
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
  else scene.append(bandeau(s,qui),plateau(s,qui),main(s,1,186,qui===1),cercle(),derniere(s),actions(s),main(s,0,854,qui===0),coin());
  if(!couche||couche.parentNode!==scene)couche=mk('div','d-couche');
  if(chat.el)scene.insertBefore(couche,chat.el);else scene.append(couche);
  ajusteNoms();
  lanceVol();
  /* fenetres de fin : une fin de manche nouvelle, ou la fin de la partie */
  const nt=s.stats.t.length;
  if(suivi.nt<0)suivi.nt=premier&&!fin?nt:suivi.nt; /* arrivee en cours de partie : pas de fenetre pour une manche deja passee */
  /* les fenetres restent ouvertes jusqu'a « Fermer » ; la partie continue derriere */
  /* vue joueur : fin par abandon sur deconnexion = ecran de presence.js, pas de 2e fenetre */
  if(src==='joueur'&&fin&&!suivi.fin&&window.DECO&&DECO.etat&&DECO.etat().fin){suivi.fin=true;suivi.nt=nt}
  if(fin&&!suivi.fin){suivi.fin=true;suivi.nt=nt;ouvrePop('partie')}
  else if(!fin&&nt>suivi.nt&&nt%3===0){suivi.nt=nt;ouvrePop('manche',nt/3)}
  else if(suivi.pile&&sigPile(suivi.pile)!==suivi.pile.sig)ouvrePop('pile',suivi.pile); /* pile ouverte : mise a jour en direct */
  /* recapitulatif ouvert pendant un decompte qui continue (bonus de fin de manche, de) : refait avec le journal a jour */
  else if(suivi.vu&&suivi.vu.log!==s.log.length)ouvrePop(suivi.vu.type,suivi.vu.m);
  else if(suivi.pop)scene.append(suivi.pop);
}
function bandeau(s,qui){
  const u=U(),ban=mk('div','d-z d-ban');
  const cpt=(n,lib,v)=>{const x=mk('span');x.append(u.ico(n),lib+' ');x.append(mk('b','',String(v)));return x};
  /* Deck, Defausse, Forge (et Energie, qui prend la place de la Forge chez le joueur actif) : ouvrent la pile en grand */
  const pile=(x,p,k,lib)=>{if(!pileOuverte(p,k))return x;x.classList.add('d-pile');x.setAttribute('role','button');x.tabIndex=0;x.setAttribute('aria-label','Voir '+lib+' '+d_(nom(p))+nom(p));
    x.onclick=()=>ouvrePop('pile',{p,k});x.onkeydown=e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();ouvrePop('pile',{p,k})}};return x};
  const bloc=(p,dr)=>{
    const J=s.j[p],b=mk('div','d-j '+(p===BAS()?'toi':'lui')+(dr?' dr':'')+(qui===p?' actif':'')),id=mk('div','d-id'),c=mk('div','d-cpt'),l1=mk('div','d-l1');
    c.append(cpt('main','Main',J.main.length),pile(cpt('deck','Deck',J.deck.length),p,'deck','le deck'),pile(cpt('defausse','Défausse',J.defausse.length),p,'defausse','la défausse'),pile(cpt('enclume','Forge',J.forge.length),p,'forge','la Forge'));
    l1.append(mk('div','d-nom',nom(p)));
    if(qui===p){l1.append(mk('span','d-badge',src==='joueur'&&p===E.moi?'À toi de jouer':'À lui de jouer'));const e=mk('span','d-ener');e.append(u.ico('enclume'),'Énergie ');e.append(mk('b','',String(J.energie)));c.lastChild.replaceWith(pile(e,p,'forge','la Forge'))}
    id.append(l1,c);b.append(avatar(p),id);return b;
  };
  const pts=(n,clic)=>{const w=mk('span','d-pts');for(let i=1;i<=3;i++){const x=mk('i',i<n?'fait':i===n?'on':'');
    /* manche terminee : le losange rouvre son recapitulatif */
    if(clic&&(i<n||s.fin)){x.classList.add('d-clic');x.setAttribute('role','button');x.tabIndex=0;x.title='Manche '+i;x.setAttribute('aria-label','Revoir la fin de la manche '+i);
      x.onclick=()=>ouvrePop('manche',i);x.onkeydown=e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();ouvrePop('manche',i)}}}
    w.append(x)}return w};
  const co=(l,n,clic)=>{const c=mk('div','d-cote');c.append(mk('small','',l),mk('b','',String(n)),pts(n,clic));return c};
  const mid=mk('div','d-mid'),sc=mk('div','d-sc');
  sc.append(mk('b','',String(s.j[BAS()].score)),mk('span','','-'),mk('em','',String(s.j[1-BAS()].score)));
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
  const gh=live.length===2?live[0]:u.grilleVue(s,1,[0,1,2],[2,1,0],null),gb=live.length===2?live[1]:u.grilleVue(s,0,[0,1,2],[0,1,2],null);gh.classList.add('lui');gb.classList.add('mienne');
  const r1=mk('div','d-rg'),r2=mk('div','d-rg');
  const hb=1-BAS();r1.append(mk('div','d-vt lui'+(qui===hb?' actif':''),nom(hb)),gh);r2.append(mk('div','d-vt toi'+(qui===BAS()?' actif':''),nom(BAS())),gb);
  /* terrains : Force de chaque camp, contour du joueur qui mene (neutre a egalite), valeur dessous */
  const t=mk('div','p-terrains d-tr'),cc=Mo.colonnes(s);
  [0,1,2].forEach(k=>{const T=s.terrains[k],a=cc[k][1-BAS()],m=cc[k][BAS()],d=mk('div','p-terrain'+(m>a?' m-moi':a>m?' m-lui':'')),to=mk('div','p-totaux'),te=mk('div','p-tete');
    te.append(mk('b','',T.nom));to.append(mk('b','m'+(m>a?' tete':''),String(m)),mk('span','','contre'),mk('b','a'+(a>m?' tete':''),String(a)));
    const Mo2=Mo,v=Mo2.ptsTerrain?Mo2.ptsTerrain(s,k):T.pts;d.append(te,to,ptsEt('p-valeur',v,T.nom==='Le Tournoi',T.nom==='Les Pronos'&&Mo2.miseTotale?Mo2.miseTotale(s):0));d.onclick=()=>zoomTerrainDif(s,k);t.append(d)});
  plat.append(r1,t,r2);
  /* halo : case de la derniere carte jouee, 3,6 s a partir de la pose (repeinture : l'animation reprend ou elle en etait) */
  const h=suivi.halo;
  if(h&&!s.fin){const x=chercheCarte(s,h.p,h.c),dt=performance.now()-h.t;
    if(x&&dt<3600){const c=plat.querySelector('.p-case[data-p="'+h.p+'"][data-l="'+x[0]+'"][data-k="'+x[1]+'"]');
      if(c){c.classList.add('d-halo');c.style.setProperty('--hc',COL[h.p]);c.style.animationDelay=(-dt/1000)+'s'}}}
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
      else{const v=Mo.valeurDecompte(s,p,l,k),f=mk('span','dz-v','Force '),fb=mk('b','',String(v));fb.style.color=COLZ[p];f.append(fb);
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
    const E5=['magma','cristal','foudre','brume','roche'],IM=68,ey=(188-IM)/1.809,ex=(350-IM)/1.902,DEG=Math.PI/180,P=a=>[ex*Math.cos(a*DEG),ey*Math.sin(a*DEG)];
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
  cc.append(u.ico('enclume'),'Coût ');cc.append(mk('b','',String(C.cout)));
  cf.append(u.ico('force'),'Force ');cf.append(mk('b','',C.force==null?'au dé':String(C.force)));
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
  if(mq){t.append(pseudo(p),' marque ');t.append(nbCartes(mq[1]),' : '+mq[2]);return t}
  /* deck vide (meule) : « X n'a pas pu piocher : +1 point pour Y » */
  const dv=RE_DV.exec(x);if(dv&&(p===0||p===1)){t.append(pseudo(p)," n'a pas pu piocher : +"+dv[1]+(+dv[1]>1?' points':' point')+' pour ',pseudo(1-p));return t}
  /* « Carte : effet », « Carte (Evolution) lance ... », « Carte perd ... » : la carte en gras, le joueur entre parenthèses */
  const nm=N.re.source.slice(1,-1),m=new RegExp('^((?:'+nm+')(?: \\((?:'+nm+')\\))?)( : | )').exec(x);
  if(m){t.append(nbCartes(m[1]),' (',pseudo(p),')');t.append(nbCartes(x.slice(m[1].length)));return t}
  t.append(pseudo(p),nbCartes(' '+x));return t;
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
    if(a!=null){if(t<a+LUEUR){li.classList.add('d-neuf');li.style.animationDelay=delai(a)}else delete suivi.arr[e[2]]}
    let ph;if(e[0]===0||e[0]===1)ph=phrase(e[0],e[1]);else{ph=mk('span');ph.append(nbCartes(e[1].replace(/\.$/,'')))}
    li.append(u.ico(e[3]),ph);ol.append(li)});
  z.append(ol);
  /* page la plus recente : en bas ; manche passee : en haut (apres la peinture, quand les hauteurs sont connues) */
  requestAnimationFrame(()=>{ol.scrollTop=der?ol.scrollHeight:0});
  return z;
}
function coin(){
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
      const t=Date.now();if(t-this.dernier<1000){inf.textContent='Un message par seconde au plus.';return}
      this.dernier=t;inf.textContent='';i.value='';Promise.resolve(SPEC.dit(m)).catch(()=>{inf.textContent='Message non envoyé.';i.value=m})};
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
function fermePop(){if(src==='joueur'&&suivi&&suivi.vu&&suivi.vu.type==='manche'){const c=document.getElementById('continuer'),r=document.getElementById('recap');if(c&&r&&!r.hidden)setTimeout(()=>c.click(),0)} /* vue joueur : fermer le bilan de manche = Continuer */
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
  if(gr){const m=new Map();L.forEach(c=>{const nm=M().nomDetail(M().carte(c)),x=m.get(nm);if(x)x.k++;else m.set(nm,{c,k:1,nm})}); /* exemplaires regroupes par nom */
    const G=[...m.values()].sort((a,b)=>a.nm.localeCompare(b.nm,'fr'));
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
  else{popPartie(E.etat,pp);suivi.vu={type,m,log:E.etat.log.length};if(src==='joueur')boutonsFin(pp)}
  const fe=mk('button','pp-fermer','Fermer');fe.type='button';fe.onclick=fermePop;pp.append(fe);
  v.append(pp);scene.append(v);suivi.pop=v;
  if(type==='pile'&&haut){const g=pp.querySelector('.pp-pile');if(g)g.scrollTop=haut}
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
  const rj=document.getElementById('rejouer');
  if(rj){const x=b(rj.textContent,'plein',()=>{fermePop();rj.click()});x.disabled=rj.disabled}
  b('Partager le résumé','sec',x=>u.partageFin(x,u.texteResume(s)));
  b('Copier les données','sec',x=>u.copie(u.donneesPartie(s),x,'Copier les données'));
  b("Retour à l'accueil",'sec',()=>{fermePop();u.quitteBouton()});
  pp.append(z);
}
/* Echap ferme la fenetre d'une pile (apres le zoom d'une carte s'il est ouvert) */
document.addEventListener('keydown',e=>{if(e.key!=='Escape'||!D||!suivi)return;const z=document.getElementById('vue');if(z&&!z.hidden)return;
  if(suivi.pile)fermePop();else if(chat.el)chat.ferme()},true);
function score(sm,a,b){
  const t=mk('div','pp-tot'),d=mk('div'),x=mk('b','',String(a)),y=mk('b','',String(b));x.style.color=COL[0];y.style.color=COL[1];
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
  const pm=ptsManche(s,m)||[0,0],tot=[0,0];for(let k=1;k<=m;k++){const x=ptsManche(s,k);if(x){tot[0]+=x[0];tot[1]+=x[1]}}
  const bas=mk('div','pp-bas');
  const bo=bonusManche(s,m);
  [0,1].forEach(p=>{const w=mk('div','pp-gc'),x=mk('div','pp-gain'),n=mk('span','',nom(p)),i=mk('i','','+'+pm[p]);n.style.color=i.style.color=COL[p];x.append(avatar(p),n,i,u.ico('coupe'));w.append(x);
    /* points hors terrains (Roi du Karaoke...) : petite ligne sous le gain, deja compris dans le +n */
    if(bo[p].length)w.append(mk('div','pp-bonus',bo[p].join(' · ')));bas.append(w);
    if(p===0)bas.append(score('Score',tot[0],tot[1]))});
  pp.append(bas);
}
function popPartie(s,pp){
  const u=U(),Mo=M(),F=s.fin,w=F.gagnant,vic=mk('div','pp-vic');
  /* vue spectateur, fin par abandon : ecran neutre (« Fin par abandon », Vainqueur / Abandon) */
  if(src==='spec'&&F.abandon!==undefined&&(w===0||w===1)){vic.append(mk('h2','pp-neutre','Fin par abandon'));const duo=mk('div','pp-duo');
    [w,1-w].forEach(p=>{const j=mk('div','pp-dj'+(p===w?' g':'')),n=mk('span','pp-dn',nom(p)),a=avatar(p);if(p!==w)a.classList.add('dk-gris');n.style.color=COL[p];
      j.append(a,n,mk('span','dk-tag '+(p===w?'v':'d'),p===w?'Vainqueur':'Abandon'));duo.append(j)});vic.append(duo)}
  else if(w===0||w===1){vic.style.setProperty('--c',COL[w]);const h=mk('h2','','Victoire '+d_(nom(w))+nom(w));h.style.color=COL[w];vic.append(avatar(w),h)}
  else vic.append(mk('h2','','Match nul'));
  if(F.abandon!==undefined)vic.append(mk('p','pp-sous',nom(F.abandon)+(F.quitte?' a quitté la partie':' a abandonné')));
  else if(F.deckVide!==undefined)vic.append(mk('p','pp-sous','Victoire par deck vide : '+nom(F.deckVide)+' n\'avait plus de carte à piocher')); /* 0.4 */
  else if(F.departage&&F.scores[0]===F.scores[1])vic.append(mk('p','pp-sous','Égalité de points : départage à la Force'));
  vic.append(score('Score final',F.scores[0],F.scores[1]));pp.append(vic);
  const tb=mk('table','pp-tab'),hr=mk('tr');['','Manche 1','Manche 2','Manche 3','Total'].forEach(x=>hr.append(mk('th','',x)));tb.append(hr);
  const P=[1,2,3].map(m=>ptsManche(s,m));
  [0,1].forEach(p=>{const tr=mk('tr',w===p?'gagne':''),n=mk('td'),nm=mk('div','nm'),sp=mk('span','',nom(p));tr.style.setProperty('--c',COL[p]);sp.style.color=COL[p];nm.append(avatar(p),sp);n.append(nm);tr.append(n);
    P.forEach(x=>{const g=x&&x[p]>x[1-p],td=mk('td',g?'mg':'',x?String(x[p]):'-');td.style.color=g?COL[p]:'var(--texte)';tr.append(td)});
    const tt=mk('td','',String(F.scores[p]));tt.style.color=COL[p];tr.append(tt);tb.append(tr)});
  pp.append(tb);
  /* MVP calcule comme le site (M.bilan, comme l'Historique et la fin de partie) : « Nom, Titre » dans la couleur du joueur, pictos des elements */
  const B=Mo.bilan(s),x=B&&B.mvp;
  if(x){const C=Object.values(Mo.CARTES).find(c=>Mo.nomDetail(c)===x.carte||c.nom===x.carte),mv=mk('div','pp-mvp'),n=mk('button','pp-mvp-n',typeof u.nomComplet==='function'?u.nomComplet(x.carte):x.carte);
    n.type='button';n.style.color=COL[x.joueur];if(C)n.onclick=()=>{u.cacheApercu();u.zoom(imgV('cartes/'+C.id+'.jpg'),C.nom)};
    const col=mk('div','pp-mvp-c'),l1=mk('div','pp-mvp-l1');l1.append(n);
    if(C&&C.el&&C.el.length){const e=mk('span','pp-mvp-els');C.el.forEach(y=>{const im=mk('img');im.src=imgV('cartes/'+y+'.png');im.alt=y;e.append(im)});l1.append(e)}
    col.append(l1);const pq=pourquoiMvp(x);if(pq)col.append(mk('div','pp-mvp-pq',pq));
    mv.append(mk('span','pp-mvp-e','MVP'),col);
    pp.append(mv)}
}
/* Pourquoi MVP : meme formulation que ligneMvpD d'index.html (export Discord de l'Historique), valeurs nulles omises */
function pourquoiMvp(m){
  if(m.score==null)return '';
  const pl=(n,w)=>n+' '+w+(n>1?'s':''),l=[];
  if(m.force)l.push('Force '+m.force+' sur terrains gagnés');if(m.bonus)l.push(pl(m.bonus,'bonus donné'));
  if(m.degats)l.push(pl(m.degats,'dégât'));if(m.morts)l.push(pl(m.morts,'Golem')+' détruit'+(m.morts>1?'s':''));
  return 'Score '+m.score+(l.length?' · '+l.join(', '):'');
}

/* ---------- Ouverture et fermeture ---------- */
function ouvrir(source,entree){
  if(!window.GOLEMS_UI)return;
  if(D)fermer();
  src=source;E=entree;suivi=neufSuivi();
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
  const place=()=>[...f.children].forEach((i,k)=>i.style.left=(250-w/2+(k-(n-1)/2)*sp)+'px');place();
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
    tx.append(mk('b','',(e.nomLui||nom(1-E.moi))+" s'est déconnecté"),mk('span','',"S'il ne revient pas à temps, tu gagnes la partie par abandon."));
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
    tx.append(mk('b','',nom(minu.p)+" s'est déconnecté"),mk('span','',"Sans retour à temps, défaite par abandon."));
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
    const ra=x.querySelector('.raison');o.append(im,mk('p','','Carte '+(i+1)+' sur '+cartes.length+(x.classList.contains('surtaxe')?' · surcoût':'')+(ra?' · '+ra.textContent:'')),b);
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
  try{telephone(P)}catch(e){console.warn(e)}
  const ok=P&&P.etat&&!P.rejeu&&ECRAN_JOUEUR.matches&&box&&!box.hidden&&!(window.SPEC&&SPEC.estSpectateur&&SPEC.estSpectateur());
  if(!ok){if(D&&src==='joueur')fermer();return}
  const x={etat:P.etat,moi:P.moi,noms:[0,1].map(p=>u.nomJ(p)),avatars:[0,1].map(p=>p===P.moi?u.monAvatar():''),uids:[0,1].map(p=>p===P.moi||P.local?'':u.uidJ(p))};
  if(D&&src==='joueur'){E=x;peindre();return}
  ouvrir('joueur',x);D.classList.add('jr');document.documentElement.classList.add('dif-joueur');
  /* plein ecran au demarrage de la partie (geste de l'utilisateur : clic sur Jouer) ; refuse = rien */
  try{if(!document.fullscreenElement&&document.documentElement.requestFullscreen)document.documentElement.requestFullscreen().catch(()=>{})}catch(e){}
}
/* vue joueur : un bilan de manche de la partie ouvert (cache) sans fenetre de la vue = on ouvre celle de la vue (sinon la partie attendrait « Continuer ») */
setInterval(()=>{if(!D||src!=='joueur'||!suivi||suivi.pop)return;const r=document.getElementById('recap');if(!r||r.hidden||!E.etat.stats)return;
  const n=Math.max(1,Math.floor(E.etat.stats.t.length/3));ouvrePop('manche',n)},400);
/* « Quitter la partie » (spectateur) : la diffusion se ferme et le spectateur quitte la partie comme avec l'ancien bouton Quitter ;
   demonstration : « Quitter la diffusion » arrete la partie locale */
let sortieSpec=false; /* le spectateur vient de quitter : pas de reouverture tant qu'il est encore inscrit */
function quitter(){const sp=src==='spec';fermer();if(sp){sortieSpec=true;const u=U();if(u&&typeof u.quitteBouton==='function')u.quitteBouton()}}
function fermer(){
  if(!D)return;
  if(chat.el){chat.el.remove();chat.el=null}
  if(src==='demo')demo.stop();
  if(src==='joueur'){const cf=document.querySelector('.chat.flottant');if(cf&&D.contains(cf)){cf.classList.remove('mq-chatw');document.body.append(cf)}
    document.documentElement.classList.remove('dif-joueur');try{if(document.fullscreenElement)document.exitFullscreen().catch(()=>{})}catch(e){}}
  D.remove();D=null;scene=null;E=null;src=null;suivi=null;document.documentElement.classList.remove('dif-ouvert');
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

window.DIFFUSION={ouvrir,fermer,joueur,demo,peindre,chat,etat:()=>({ouvert:!!D,src,pause:demo.enPause,pop:!!(suivi&&suivi.pop),fin:!!(E&&E.etat&&E.etat.fin)})};
})();
