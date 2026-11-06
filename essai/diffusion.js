/* Vue diffusion (0.3a) : ecran 1920 x 1080 pour un stream, mis a l'echelle proportionnellement.
   - Vue spectateur (partie en ligne) : bouton « Mode diffusion » a cote de la pastille Spectateur ; « Quitter la diffusion » ramene a la vue spectateur.
   - Site d'essai (/essai/) seulement : bouton « Demonstration » dans l'onglet Jouer, partie Golem contre Golem locale (sans serveur ni compte).
   Lit les fonctions d'index.html par window.GOLEMS_UI et le moteur (GOLEMS_UI.M) ; ne modifie ni index.html ni spectateur-ui.js.
   Ici : window.DIFFUSION. CSS : diffusion.css (tout sous #dif). */
(function(){
'use strict';
const ESSAI=location.pathname.split('/')[1]==='essai';
const COL=['var(--moi)','var(--lui)'];
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
function neufSuivi(){return {nev:-1,der:null,lieu:{},halo:null,nt:-1,fin:false,pop:null,popT:0}}

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
/* Points de chaque joueur a la manche m, lus dans le journal du decompte (terrains, de du Plateau, bonus de cartes) */
function ptsManche(s,m){
  const R=s.reperes[m-1];if(!R)return null;
  const r=[0,0];
  for(let i=R[0];i<s.log.length&&(m<s.reperes.length?i<s.reperes[m][0]:true);i++){const[p,x]=s.log[i];if(p!==0&&p!==1)continue;
    const q=/:\s\+(\d+)( points?)?\.$/.exec(x);if(q)r[p]+=+q[1]}
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
  const u=U(),s=E.etat,premier=suivi.nev<0;
  suitPoses(s,premier);
  scene.textContent='';
  const fin=!!s.fin,qui=fin||s.phase==='mulligan'?null:u.quiJoue(s);
  scene.append(bandeau(s,qui),plateau(s,qui),main(s,1,186,qui===1),cercle(),derniere(s),actions(s),main(s,0,854,qui===0),coin());
  ajusteNoms();
  /* fenetres de fin : une fin de manche nouvelle, ou la fin de la partie */
  const nt=s.stats.t.length;
  if(suivi.nt<0)suivi.nt=premier&&!fin?nt:suivi.nt; /* arrivee en cours de partie : pas de fenetre pour une manche deja passee */
  if(fin&&!suivi.fin){suivi.fin=true;suivi.nt=nt;ouvrePop('partie')}
  else if(!fin&&nt>suivi.nt&&nt%3===0){suivi.nt=nt;ouvrePop('manche',nt/3)}
  else if(suivi.pop)scene.append(suivi.pop);
}
function bandeau(s,qui){
  const u=U(),ban=mk('div','d-z d-ban');
  const cpt=(n,lib,v)=>{const x=mk('span');x.append(u.ico(n),lib+' ');x.append(mk('b','',String(v)));return x};
  const bloc=(p,dr)=>{
    const J=s.j[p],b=mk('div','d-j '+(p===0?'toi':'lui')+(dr?' dr':'')+(qui===p?' actif':'')),id=mk('div','d-id'),c=mk('div','d-cpt'),l1=mk('div','d-l1');
    c.append(cpt('main','Main',J.main.length),cpt('deck','Deck',J.deck.length),cpt('defausse','Défausse',J.defausse.length),cpt('enclume','Forge',J.forge.length));
    l1.append(mk('div','d-nom',nom(p)));
    if(qui===p){l1.append(mk('span','d-badge','À lui de jouer'));const e=mk('span','d-ener');e.append(u.ico('enclume'),'Énergie ');e.append(mk('b','',String(J.energie)));c.lastChild.replaceWith(e)}
    id.append(l1,c);b.append(avatar(p),id);return b;
  };
  const pts=n=>{const w=mk('span','d-pts');for(let i=1;i<=3;i++)w.append(mk('i',i<n?'fait':i===n?'on':''));return w};
  const co=(l,n)=>{const c=mk('div','d-cote');c.append(mk('small','',l),mk('b','',String(n)),pts(n));return c};
  const mid=mk('div','d-mid'),sc=mk('div','d-sc');
  sc.append(mk('b','',String(s.j[0].score)),mk('span','','-'),mk('em','',String(s.j[1].score)));
  mid.append(co('Manche',s.manche),sc,co('Tour',s.tour));
  ban.append(bloc(0,false),mid,bloc(1,true));
  return ban;
}
function plateau(s,qui){
  const u=U(),Mo=M(),plat=mk('div','d-z d-plat');
  const gh=u.grilleVue(s,1,[0,1,2],[2,1,0],null),gb=u.grilleVue(s,0,[0,1,2],[0,1,2],null);gh.classList.add('lui');gb.classList.add('mienne');
  const r1=mk('div','d-rg'),r2=mk('div','d-rg');
  r1.append(mk('div','d-vt lui'+(qui===1?' actif':''),nom(1)),gh);r2.append(mk('div','d-vt toi'+(qui===0?' actif':''),nom(0)),gb);
  /* terrains : Force de chaque camp, contour du joueur qui mene (neutre a egalite), valeur dessous */
  const t=mk('div','p-terrains d-tr'),cc=Mo.colonnes(s);
  [0,1,2].forEach(k=>{const T=s.terrains[k],a=cc[k][1],m=cc[k][0],d=mk('div','p-terrain'+(m>a?' m-moi':a>m?' m-lui':'')),to=mk('div','p-totaux'),te=mk('div','p-tete');
    te.append(mk('b','',T.nom));to.append(mk('b','m'+(m>a?' tete':''),String(m)),mk('span','','contre'),mk('b','a'+(a>m?' tete':''),String(a)));
    d.append(te,to,mk('span','p-valeur',T.pts+(T.pts>1?' pts':' pt')));d.onclick=()=>u.zoomTerrain(T);t.append(d)});
  plat.append(r1,t,r2);
  /* halo : case de la derniere carte jouee, 3,6 s a partir de la pose (repeinture : l'animation reprend ou elle en etait) */
  const h=suivi.halo;
  if(h&&!s.fin){const x=chercheCarte(s,h.p,h.c),dt=performance.now()-h.t;
    if(x&&dt<3600){const c=plat.querySelector('.p-case[data-p="'+h.p+'"][data-l="'+x[0]+'"][data-k="'+x[1]+'"]');
      if(c){c.classList.add('d-halo');c.style.setProperty('--hc',COL[h.p]);c.style.animationDelay=(-dt/1000)+'s'}}}
  return plat;
}
function zoomCarte(c){
  const u=U(),C=M().carte(c);u.cacheApercu();
  let det=null;
  if(C.animal&&typeof u.detailAnimal==='function')det=u.detailAnimal(C);
  else if(typeof u.lg==='function'){const a=mk('section');a.append(mk('h3','','Force'),u.lg('Force de base',C.force!=null?String(C.force):'aucune'),u.lg('Coût',String(C.cout)));if(C.texte)a.append(mk('p','',C.texte));det=[a]}
  u.zoom(u.srcC(c),C.nom,det);
}
function main(s,p,top,joue){
  const z=mk('div','d-z d-col'+(p===0?' bas':'')),J=s.j[p],h=mk('div','d-tm '+(p===0?'toi':'lui'),'Main '+d_(nom(p))+nom(p));
  /* meme taille de carte pour les deux mains (calculee sur la plus grande), une seule ligne */
  const W=769,n=Math.max(s.j[0].main.length,s.j[1].main.length,1),gp=n<=5?12:8,w=Math.min(120,Math.floor((W-(n-1)*gp)/n));
  z.style.top=top+'px';
  h.append(mk('span','',J.main.length+(J.main.length>1?' cartes':' carte')));if(joue)h.append(mk('span','d-joue','Joue'));
  const r=mk('div','d-main');r.style.gap=gp+'px';
  J.main.forEach(c=>{const C=M().carte(c),b=mk('button'),i=mk('img');b.type='button';b.style.width=w+'px';b.style.height=Math.round(w*1.4)+'px';
    i.src=U().srcC(c);i.alt=C.nom;b.setAttribute('aria-label','Agrandir '+M().nomDetail(C));b.onclick=()=>zoomCarte(c);b.append(i);r.append(b)});
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
    pos.forEach(([x,y],i)=>{g+='<image href="cartes/'+E5[i]+'.png" x="'+(x-IM/2)+'" y="'+(y-IM/2)+'" width="'+IM+'" height="'+IM+'"/>'});
    const x0=Math.min(...pos.map(p=>p[0]))-IM/2-3,x1=Math.max(...pos.map(p=>p[0]))+IM/2+3,y0=Math.min(...pos.map(p=>p[1]))-IM/2-3,y1=Math.max(...pos.map(p=>p[1]))+IM/2+3;
    SVG='<svg xmlns="http://www.w3.org/2000/svg" role="img" aria-label="Cercle des éléments : Magma, Cristal, Foudre, Brume, Roche" viewBox="'+[x0,y0,x1-x0,y1-y0].join(' ')+'" width="'+(x1-x0)+'" height="'+(y1-y0)+'">'+g+'</svg>';
  }
  cw.innerHTML=SVG;z.append(cw);return z;
}
function derniere(s){
  const u=U(),Mo=M(),z=mk('div','d-z d-bloc d-der'),tx=mk('div','d-txt'),d=suivi.der;
  tx.append(mk('div','d-h','Dernière carte jouée'));
  if(!d){z.classList.add('vide');tx.append(mk('p','d-phr d-rien','Aucune carte jouée pour le moment.'));z.append(tx);return z}
  const C=Mo.carte(d.c),bt=mk('button'),im=mk('img');bt.type='button';im.src='cartes/'+C.id+'.jpg';im.alt=C.nom;bt.setAttribute('aria-label','Agrandir '+Mo.nomDetail(C));bt.append(im);
  const x=chercheCarte(s,d.p,d.c);bt.onclick=()=>{if(x){const c=document.querySelector('#dif .p-case[data-p="'+d.p+'"][data-l="'+x[0]+'"][data-k="'+x[1]+'"]');if(c&&c.onclick){c.onclick();return}}zoomCarte(d.c)};
  /* 1re ligne : « X pose Y sur Z. » / « X ameliore A en B. » / « X remplace A par B sur Z. » */
  const ph=mk('p','d-phr'),L=ligneDerniere(s)||'pose '+Mo.nomDetail(C)+'.',lieu=suivi.lieu[d.c],ter=lieu?s.terrains[lieu[1]].nom:null;
  const bl=t=>{const b=mk('b');b.style.color=COL[d.p];b.append(nbEvo(t));return b};
  let q;
  if((q=/^améliore (.+) en (.+)\.$/.exec(L))){ph.append(bl(nom(d.p)+' améliore '+q[1]+' en '));const e=mk('b','d-evo',q[2]);ph.append(e,'.')}
  else{ph.append(bl(nom(d.p)+' '+L.replace(/\.$/,'')),ter?' sur '+ter+'.':'.')}
  /* 2e ligne : l'effet, son nom en gras */
  const pe=mk('p','d-phr'),t=C.texte||'',i=t.indexOf(' : ');
  if(i>0){pe.append(mk('strong','',t.slice(0,i)),nb(t.slice(i)))}else if(t)pe.append(nb(t));
  const ch=mk('div','d-chips'),cc=mk('span'),cf=mk('span'),ce=mk('span');
  cc.append(u.ico('enclume'),'Coût ');cc.append(mk('b','',String(C.cout)));
  cf.append(u.ico('force'),'Force ');cf.append(mk('b','',C.force==null?'au dé':String(C.force)));
  (C.el||[]).forEach(e=>{const im2=mk('img');im2.src='cartes/'+e+'.png';im2.alt=e;ce.append(im2)});
  ch.append(cc,cf);if(C.el&&C.el.length)ch.append(ce);
  tx.append(ph);if(t)tx.append(pe);tx.append(ch);
  z.append(bt,tx);return z;
}
/* Phrase courte d'une ligne du journal */
function phrase(p,x){
  const t=mk('span'),N=noms();x=x.replace(/\.$/,'');
  if(x==='garde une carte du dessus du deck'){t.append(mk('b','d-ca','Le Q'),' : ',pseudo(p),' garde 1 carte parmi 3');return t}
  /* « marque T (a contre b) : +n » : sans le detail des Forces */
  const mq=/^marque (.+) \(\d+ contre \d+\) : (\+\d+)$/.exec(x);
  if(mq){t.append(pseudo(p),' marque ');t.append(nbCartes(mq[1]),' : '+mq[2]);return t}
  /* « Carte : effet », « Carte (Evolution) lance ... », « Carte perd ... » : la carte en gras, le joueur entre parenthèses */
  const nm=N.re.source.slice(1,-1),m=new RegExp('^((?:'+nm+')(?: \\((?:'+nm+')\\))?)( : | )').exec(x);
  if(m){t.append(nbCartes(m[1]),' (',pseudo(p),')');t.append(nbCartes(x.slice(m[1].length)));return t}
  t.append(pseudo(p),nbCartes(' '+x));return t;
}
function actions(s){
  const u=U(),z=mk('div','d-z d-bloc d-act'),ol=mk('ol'),L=s.log.filter(e=>e[0]===0||e[0]===1).slice(-3);
  z.append(mk('div','d-h','Dernières actions'));
  L.forEach((e,i)=>{const li=mk('li',i===L.length-1?'dern':''),g=u.genreLog(e[1]);li.append(u.ico(g[1]),phrase(e[0],e[1]));ol.append(li)});
  z.append(ol);return z;
}
function coin(){
  const z=mk('div','d-z d-coin'),lo=mk('div','d-logo'),li=mk('img'),bas=mk('div','d-bas');li.src='cartes/logo.png';li.alt='Les Golems';lo.append(li);
  if(src==='demo'){const v=mk('div','d-vit');v.setAttribute('role','group');v.setAttribute('aria-label','Vitesse');
    [1,2,4].forEach(n=>{const b=mk('button',demo.vit===n?'on':'','x'+n);b.type='button';b.onclick=()=>{demo.vit=n;v.querySelectorAll('button').forEach(o=>o.classList.toggle('on',o===b))};v.append(b)});bas.append(v)}
  const qt=mk('button','d-quit','Quitter la diffusion');qt.type='button';qt.onclick=fermer;bas.append(qt);
  z.append(lo,bas);return z;
}
/* Nom trop long pour son bandeau : la police se reduit (54 px au plus) */
function ajusteNoms(){
  scene.querySelectorAll('.d-j').forEach(j=>{const n=j.querySelector('.d-nom');let f=54;
    while(f>26&&j.scrollWidth>j.clientWidth+1){f-=2;n.style.fontSize=f+'px'}});
  scene.querySelectorAll('.d-vt').forEach(v=>{let f=28;while(f>14&&v.scrollHeight>v.clientHeight+1){f-=2;v.style.fontSize=f+'px'}});
}

/* ---------- Fenetres de fin ---------- */
function fermePop(){clearTimeout(suivi.popT);if(suivi.pop)suivi.pop.remove();suivi.pop=null;if(src==='demo')demo.reprend()}
function ouvrePop(type,m){
  clearTimeout(suivi.popT);if(suivi.pop)suivi.pop.remove();
  const s=E.etat,v=mk('div','pp-voile'),pp=mk('div','pp');
  if(type==='manche')popManche(s,m,pp);else popPartie(s,pp);
  const fe=mk('button','pp-fermer','Fermer');fe.type='button';fe.onclick=fermePop;pp.append(fe);
  v.append(pp);scene.append(v);suivi.pop=v;
  /* fin de manche : se ferme seule (12 s, demonstration 8 s a x1) ; la demonstration attend sa fermeture */
  if(type==='manche'){if(src==='demo')demo.pause();suivi.popT=setTimeout(fermePop,src==='demo'?8000/demo.vit:12000)}
}
function score(sm,a,b){
  const t=mk('div','pp-tot'),d=mk('div'),x=mk('b','',String(a)),y=mk('b','',String(b));x.style.color=COL[0];y.style.color=COL[1];
  d.append(U().ico('coupe'),x,mk('span','','-'),y);t.append(mk('small','',sm),d);return t;
}
function popManche(s,m,pp){
  const u=U();pp.append(mk('h2','','Fin de la manche '+m));
  const g=mk('div','pp-ters');
  s.stats.t.filter(t=>t.manche===m).forEach(t=>{const c=mk('div','pp-ter'),h=mk('div','pp-th');h.append(mk('b','',t.terrain),mk('span','pp-pts',t.points+(t.points>1?' pts':' pt')));c.append(h);
    const T=s.terrains.find(x=>x.nom===t.terrain);if(T){h.firstChild.textContent=T.nom;h.lastChild.textContent=T.pts+(T.pts>1?' pts':' pt')}
    [0,1].forEach(p=>{const l=mk('div','pp-l'+(t.gagnant===p?' gagne':''));l.style.setProperty('--c',COL[p]);const n=mk('span','',nom(p));n.style.color=COL[p];const f=mk('em','',String(t.forces[p]));f.style.color=COL[p];l.append(avatar(p),n,f);c.append(l)});
    const r=mk('div','pp-res');
    if(t.gagnant===0||t.gagnant===1){const b=mk('b','',nom(t.gagnant));b.style.color=COL[t.gagnant];r.append(b,' marque '+t.points+(t.points>1?' points':' point'))}
    else if(t.forces[0]===t.forces[1])r.append('Égalité, personne ne marque');
    else r.append('Marque à la manche 3');
    const de=deManche(s,m,t.terrain);if(de)r.append(mk('br'),de);
    c.append(r);g.append(c)});
  pp.append(g);
  const pm=ptsManche(s,m)||[0,0],tot=[0,0];for(let k=1;k<=m;k++){const x=ptsManche(s,k);if(x){tot[0]+=x[0];tot[1]+=x[1]}}
  const bas=mk('div','pp-bas');
  [0,1].forEach(p=>{const x=mk('div','pp-gain'),n=mk('span','',nom(p)),i=mk('i','','+'+pm[p]);n.style.color=i.style.color=COL[p];x.append(avatar(p),n,i,u.ico('coupe'));bas.append(x);
    if(p===0)bas.append(score('Score',tot[0],tot[1]))});
  pp.append(bas);
}
function popPartie(s,pp){
  const u=U(),Mo=M(),F=s.fin,w=F.gagnant,vic=mk('div','pp-vic');
  if(w===0||w===1){vic.style.setProperty('--c',COL[w]);const h=mk('h2','','Victoire '+d_(nom(w))+nom(w));h.style.color=COL[w];vic.append(avatar(w),h)}
  else vic.append(mk('h2','','Match nul'));
  if(F.abandon!==undefined)vic.append(mk('p','pp-sous',nom(F.abandon)+' a abandonné'));
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
    n.type='button';n.style.color=COL[x.joueur];if(C)n.onclick=()=>{u.cacheApercu();u.zoom('cartes/'+C.id+'.jpg',C.nom)};
    const col=mk('div','pp-mvp-c'),l1=mk('div','pp-mvp-l1');l1.append(n);
    if(C&&C.el&&C.el.length){const e=mk('span','pp-mvp-els');C.el.forEach(y=>{const im=mk('img');im.src='cartes/'+y+'.png';im.alt=y;e.append(im)});l1.append(e)}
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
  D=mk('div');D.id='dif';D.setAttribute('role','dialog');D.setAttribute('aria-label','Vue diffusion');
  scene=mk('div','d-scene');D.append(scene);document.body.append(D);document.documentElement.classList.add('dif-ouvert');
  echelle();peindre();
}
function fermer(){
  if(!D)return;
  if(src==='demo')demo.stop();
  if(suivi)clearTimeout(suivi.popT);
  D.remove();D=null;scene=null;E=null;src=null;suivi=null;document.documentElement.classList.remove('dif-ouvert');
}

/* ---------- Vue spectateur : bouton « Mode diffusion » et mise a jour en direct ---------- */
const TV='<svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="7" width="18" height="12" rx="2"/><path d="M8 3l4 4 4-4"/><circle cx="12" cy="13" r="2.2" fill="currentColor" stroke="none"/></svg>';
function lisSpec(x){
  if(!x)return null;
  if(x.etat&&x.etat.j){
    if(Array.isArray(x.joueurs)&&!x.noms){const f=x.joueurs;return {etat:x.etat,noms:f.map(o=>o&&o.pseudo||''),avatars:f.map(o=>o&&o.avatar||''),uids:f.map(o=>o&&o.uid||'')}}
    return {etat:x.etat,noms:x.noms||[],avatars:x.avatars||[],uids:x.uids||[]}}
  if(x.j)return {etat:x,noms:x.noms||[],avatars:x.avatars||[],uids:[]};
  return null;
}
let dernierSpec=null;
function boutonSpec(){
  /* dans la barre, juste avant la pastille Spectateur (place de la maquette : 5e case de la barre Score / Manche / Tour / Energie) */
  const tr=document.querySelector('#partie.sp .p-trois');if(!tr||tr.querySelector('.md-btn'))return;
  const b=mk('button','btn sec md-btn');b.type='button';b.innerHTML=TV;b.append('Mode diffusion');
  b.onclick=()=>{const e=lisSpec(dernierSpec);if(e)ouvrir('spec',e)};
  tr.append(b);
}
function brancheSpec(){
  const S=window.SPEC_UI;if(!S||S.__dif)return !!S;
  const o=S.peindrePartieSpectateur;
  S.peindrePartieSpectateur=function(e){const r=o.apply(this,arguments);dernierSpec=e;try{boutonSpec();if(D&&src==='spec'){const x=lisSpec(e);if(x){E=x;peindre()}}}catch(z){console.warn(z)}return r};
  S.__dif=true;return true;
}
if(!brancheSpec()){let n=0;const t=setInterval(()=>{if(brancheSpec()||++n>100)clearInterval(t)},100)}

/* ---------- Demonstration (site d'essai seulement) : Golem Bleu contre Golem Rouge, robots Normal, deck par defaut ---------- */
const demo={vit:1,t:0,s:null,arret:true,enPause:false,
  lance(){
    const Mo=M(),dk=Mo.deckTexte(Mo.DECK_DEFAUT);
    this.s=Mo.nouvelle((Math.random()*2147483647)|0,[dk,dk]);this.arret=false;this.enPause=false;this.vit=1;
    ouvrir('demo',{etat:this.s,noms:['Golem Bleu','Golem Rouge'],avatars:['golem67v2','golemheart'],uids:[]});
    this.suite();
  },
  /* rythme d'un match : environ 1,5 a 2 s par action a x1 (mulligan plus court) */
  suite(){
    clearTimeout(this.t);if(this.arret||this.enPause||!this.s||this.s.fin)return;
    const s=this.s,Mo=M(),p=Mo.attendus(s)[0];if(p===undefined)return;
    const a=Mo.robot(s,p,'normal');if(!a)return;
    const ms=a.t==='m'?900:a.t==='p'?2000:a.t==='x'?1500:1700;
    this.t=setTimeout(()=>{if(this.arret||this.enPause)return;
      try{Mo.applique(s,p,a)}catch(e){console.warn('Démonstration',e);return}
      if(D&&src==='demo')peindre();this.suite()},ms/this.vit);
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

window.DIFFUSION={ouvrir,fermer,demo,etat:()=>({ouvert:!!D,src,vit:demo.vit,pause:demo.enPause,pop:!!(suivi&&suivi.pop),fin:!!(E&&E.etat&&E.etat.fin)})};
})();
