/* Vue diffusion : animations de la couche (0.6a, maquette 47) et vols de cartes, separes de vue/diffusion.js (lot E, 11 nov.).
   Rectangles dans le repere de la scene (rect*), vols entre piles, main et plateau (lanceVols, lanceVol, etoileVol, atterrit),
   animations an* et leurs utilitaires (anA, anCalque, anFin, anPlus, lanceAn, prevoit).
   Charge AVANT vue/diffusion.js : window.DiffusionAnimations(I) rend ces fonctions ; I donne l'etat de la vue (getters : suivi, scene,
   couche, KV, src, E, D, GRAND) et les outils de vue/diffusion.js. Aucun etat propre ici. CSS : css/diffusion.css. */
window.DiffusionAnimations=function(I){
'use strict';
const {BAS,COL,REDUIT,U,cache,caseDe,lueur,majScore,mk,nom}=I;
/* rectangle d'un element dans le repere de la scene (1920 x 1080, avant mise a l'echelle) */
function rectScene(e){const r=e.getBoundingClientRect(),R=I.scene.getBoundingClientRect(),k=R.width/1920||1;return {x:(r.left-R.left)/k,y:(r.top-R.top)/k,w:r.width/k,h:r.height/k}}
/* rectangles dans le repere de la scene : pile d'un joueur, carte de sa main, case */
function rectPile(p,k){
  let e=I.src==='joueur'&&p===I.E.moi?I.scene.querySelector('.mq-piles .pile.'+k):null;
  if(!e)e=I.scene.querySelector('.d-ban .d-j[data-p="'+p+'"] [data-k="'+k+'"]');
  return e?rectScene(e):null;
}
function rectMain(p,c){
  if(cache(p)){const f=I.scene.querySelector('.mq-haut .mq-fan');if(!f)return null;const r=rectScene(f);return {x:r.x+r.w/2-43,y:r.y+r.h/2-60,w:86,h:120}}
  const b=I.scene.querySelector('.d-col[data-p="'+p+'"] button[data-c="'+c+'"]');if(b)return rectScene(b);
  const z=I.scene.querySelector('.d-col[data-p="'+p+'"] .d-main');if(!z)return null;const r=rectScene(z);return {x:r.x+r.w/2-51,y:r.y,w:103,h:144};
}
function rectVers(o,p){if(!o)return null;if(o.pile)return rectPile(o.p!=null?o.p:p,o.pile);if(o.main!=null)return rectMain(p,o.main);
  if(o.case){const c=caseDe(p,o.case[0],o.case[1]);return c?rectScene(c):null}return null}
/* cadre d'une carte (5 x 7) centre sur un rectangle : au moins 84 px de haut (compteurs du bandeau) */
function cadre(r){const h=Math.max(r.h,84),w=h*5/7;return {x:r.x+r.w/2-w/2,y:r.y+r.h/2-h/2,w,h}}
/* lance les vols en attente (apres la peinture : les destinations existent) ; ceux deja lances continuent dans la couche */
function lanceVols(){
  if(!I.couche||!I.suivi.vols.length)return;const now=performance.now(),L=I.suivi.vols;I.suivi.vols=[];
  L.forEach(v=>{if(now>v.t+v.d)return;prevoit(v.t+v.d);
    if(v.etoile){const de=rectVers(v.de,v.p),vers=rectScore(v.p);if(de&&vers)etoileVol(de,vers,v.etoile,v.t,v.d,v.p);return}
    const A0=v.deR||rectVers(v.de,v.p),B0=rectVers(v.vers,v.p);if(!A0||!B0)return;
    const A=cadre(A0),B=cadre(B0),im=mk('img','d-vole d-vole2');im.src=v.dos?imgV('cartes/verso.jpg'):U().srcC(v.c);im.alt='';
    Object.assign(im.style,{left:A.x+'px',top:A.y+'px',width:A.w+'px',height:A.h+'px'});I.couche.append(im);
    const T='translate('+(B.x-A.x)+'px,'+(B.y-A.y)+'px) scale('+(B.w/A.w)+')';
    const an=im.animate([{transform:'none',opacity:1},{transform:T,opacity:1,offset:.85},{transform:T,opacity:0}],{duration:v.d,delay:Math.max(0,v.t-now),easing:'cubic-bezier(.3,.7,.3,1)',fill:'forwards'});
    an.onfinish=()=>im.remove();an.oncancel=()=>im.remove()});
}
/* score du bandeau : le chiffre du joueur */
function rectScore(p){const e=I.scene.querySelector('.d-sc '+(p===BAS()?'b':'em'));return e?rectScene(e):null}
function etoileVol(de,vers,txt,t,d,p){
  /* le score du bandeau ne monte qu'a l'arrivee de l'etoile */
  prevoit(t+d);if(p!=null){const n=parseInt(txt,10)||0,S=I.suivi,a={p,n,t:t+d};S.etArr.push(a);setTimeout(()=>{if(I.suivi!==S)return;S.etArr=S.etArr.filter(x=>x!==a);majScore();if(I.scene)lueur(I.scene.querySelector('.d-sc '+(p===BAS()?'b':'em')))},Math.max(0,t+d-performance.now()))}
  /* 0.6a (maquette 47) : etoile doree qui monte, file en arc vers le score et tourne sur elle-meme */
  const z=mk('div','d-etoile an-etoile','★');if(txt&&txt!=='+1')z.append(mk('b','',txt));I.couche.append(z);
  const x0=de.x+de.w/2-30,y0=de.y+de.h/2-30,x1=vers.x+vers.w/2-30,y1=vers.y+vers.h/2-30,f=(x,y,k,r)=>'translate('+x+'px,'+y+'px) scale('+k+') rotate('+r+'deg)';
  const an=z.animate([{transform:f(x0,y0,.5,0),opacity:0},{transform:f(x0,y0-20,1.2,0),opacity:1,offset:.15},{transform:f((x0+x1)/2,(y0+y1)/2-90,1.1,180),opacity:1,offset:.55},
    {transform:f(x1,y1,.8,360),opacity:1,offset:.92},{transform:f(x1,y1,.4,360),opacity:0}],{duration:d,delay:Math.max(0,t-performance.now()),easing:'ease-in-out',fill:'forwards'});
  an.onfinish=()=>z.remove();an.oncancel=()=>z.remove();
}
/* ---------- 0.6a : animations de la maquette 47 (validees par Romain le 10 nov.) ----------
   Lancees une fois apres la peinture (cases et piles en place), dans la couche gardee d'une peinture a l'autre ;
   ce que porte la tuile elle-meme (rebond, tremblement, pastille, Force) passe par suivi.fx (classes CSS, delai negatif).
   Mouvements reduits : ni deplacement ni tremblement, fondus et couleurs seulement. Rejeu : durees divisees par la vitesse (KV). Images jamais modifiees. */
/* rejeu : heure de fin prevue des animations de la couche, declaree a leur lancement depuis leurs propres durees (cadence du rejeu sans mesure) */
function prevoit(f){if(I.suivi&&f>(I.suivi.prevu||0))I.suivi.prevu=f}
function anA(el,kf,o){
  if(REDUIT.matches){if(o.tremble)return null;kf=kf.map(f=>{const g=Object.assign({},f);delete g.transform;return g});if(kf.every(f=>Object.keys(f).every(k=>k==='offset'||k==='easing')))return null}
  const now=performance.now(),de=(o.t!=null?o.t:now)+(o.delay||0)/I.KV-now,du=(o.duration||300)/I.KV;if(de+du<=0)return null;
  if(I.couche&&I.couche.contains(el))prevoit(now+de+du); /* fin prevue, calculee (pas mesuree) */
  return el.animate(kf,{fill:o.fill||'both',easing:o.easing||'ease-out',delay:de,duration:du});
}
const anFin=(e,t,ms)=>setTimeout(()=>e.remove(),Math.max(0,t+ms/I.KV-performance.now())+60);
function anCalque(cl,r,pad,txt){const e=mk('div','an-abs '+cl,txt);if(r){pad=pad||0;Object.assign(e.style,{left:(r.x-pad)+'px',top:(r.y-pad)+'px',width:(r.w+2*pad)+'px',height:(r.h+2*pad)+'px'})}I.couche.append(e);return e}
const caseR=(p,l,k)=>{const c=caseDe(p,l,k);return c?rectScene(c):null};
/* file d'attente : {t (debut), ms (duree a vitesse 1), f(t)} */
const anPlus=(t,ms,f)=>I.suivi.an.push({t,ms,f});
function lanceAn(){if(!I.couche||!I.suivi.an.length)return;const now=performance.now(),L=I.suivi.an;I.suivi.an=[];L.forEach(o=>{if(now<o.t+o.ms/I.KV)try{o.f(o.t)}catch(e){}})}
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
  if(REDUIT.matches)anA(rf,[{background:'rgba(var(--an-or-rgb),0)'},{background:'rgba(var(--an-or-rgb),.35)',offset:.5},{background:'rgba(var(--an-or-rgb),0)'}],{t,delay:60,duration:420});
  anEtoile(r.x+r.w-6,r.y+4,t,180);anFin(cad,t,1000);anFin(rf,t,500)}
/* Animal : la carte glisse sous son maitre et disparait ; le maitre rebondit, halo vert, la pastille verte eclot, la Force saute */
function anAnimal(t,p,l,k,c,de){const r=caseR(p,l,k);if(!r)return;
  const ch=r.h*1.12,cw=ch*63.5/88.9,x=r.x+r.w/2-cw/2,y=r.y+r.h/2-ch/2,im=mk('img','an-abs an-carte');im.src=U().srcC(c);im.alt='';Object.assign(im.style,{left:x+'px',top:y+'px',width:cw+'px',height:ch+'px'});I.couche.append(im);
  const dx=de?de.x+de.w/2-(x+cw/2):-300,dy=de?de.y+de.h/2-(y+ch/2):190,sk=de?Math.min(1.2,de.h/ch):1;
  anA(im,[{opacity:0,transform:'translate('+dx+'px,'+dy+'px) rotate(-12deg) scale('+sk+')'},{opacity:1,transform:'translate('+dx*.77+'px,'+dy*.74+'px) rotate(-9deg) scale('+sk+')',offset:.2},{opacity:1,transform:'translate('+dx*.37+'px,'+dy*.32+'px) rotate(-6deg) scale(.95)',offset:.45},
    {opacity:1,transform:'translate('+dx*.07+'px,'+dy*.05+'px) rotate(-1deg) scale(.85)',offset:.75},{opacity:0,transform:'translate(0,0) rotate(0) scale(.75)'}],{t,duration:640,easing:'cubic-bezier(.3,.6,.4,1)'});anFin(im,t,700);
  const h=anCalque('an-halo',r,4);anA(h,[{opacity:0},{opacity:1,offset:.35},{opacity:0}],{t,delay:480,duration:600});anFin(h,t,1100)}
/* Destruction : fissure, puis poussiere qui file vers la Defausse du joueur */
const POUSSIERE=window.GolemsDonnees.interface.poussiere; /* cartes/donnees/interface.js */
function anBrise(t,p,l,k){const r=caseR(p,l,k);if(!r)return;
  const ns='http://www.w3.org/2000/svg',sv=document.createElementNS(ns,'svg');sv.setAttribute('viewBox','0 0 100 100');sv.setAttribute('preserveAspectRatio','none');sv.setAttribute('class','an-abs an-fissure');
  Object.assign(sv.style,{left:r.x+'px',top:r.y+'px',width:r.w+'px',height:r.h+'px',overflow:'visible'});I.couche.append(sv);
  ['M48 0 L44 22 L55 36 L41 55 L52 72 L46 100','M44 22 L22 30 L6 26','M55 36 L78 42 L96 38','M41 55 L20 64 L3 78','M52 72 L74 80 L92 96'].forEach((d,i)=>{
    for(const[w,col]of[[3.2,'var(--encre)'],[1.2,'var(--an-trait)']]){const q=document.createElementNS(ns,'path');q.setAttribute('d',d);q.setAttribute('fill','none');q.style.stroke=col;q.setAttribute('stroke-width',w);q.setAttribute('vector-effect','non-scaling-stroke');q.setAttribute('stroke-linejoin','round');q.setAttribute('pathLength','1');q.style.strokeDasharray='1';sv.append(q);
      anA(q,[{strokeDashoffset:1},{strokeDashoffset:0}],{t,delay:i?90+i*30:0,duration:200,easing:'linear'})}});
  anA(sv,[{opacity:1},{opacity:0}],{t,delay:330,duration:250});anFin(sv,t,620);
  if(REDUIT.matches)return;
  const d=rectPile(p,'defausse');if(!d)return;const tx=d.x+d.w*.5,ty=d.y+d.h/2;
  for(let i=0;i<40;i++){const q=anCalque('an-poussiere'),x=r.x+((i*37)%100)/100*r.w,y=r.y+((i*61)%100)/100*r.h;q.style.left=x+'px';q.style.top=y+'px';q.style.background=POUSSIERE[i%POUSSIERE.length];
    const mx=(x+tx)/2+((i%7)-3)*22,my=Math.min(y,ty)-60-((i*13)%50),dl=300+(i%10)*18;
    anA(q,[{opacity:0,transform:'translate(0,0) scale(1)'},{opacity:1,transform:'translate('+((i%5-2)*6)+'px,'+(-6-(i%4)*4)+'px) scale(1.1)',offset:.12},{opacity:.9,transform:'translate('+(mx-x)+'px,'+(my-y)+'px) scale(.8)',offset:.6},{opacity:0,transform:'translate('+(tx-x)+'px,'+(ty-y)+'px) scale(.3)'}],{t,delay:dl,duration:520,easing:'ease-in'});anFin(q,t,dl+560)}
  const pe=I.src==='joueur'&&p===I.E.moi?I.scene.querySelector('.mq-piles .pile.defausse'):I.scene.querySelector('.d-ban .d-j[data-p="'+p+'"] [data-k="defausse"]');
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
const COEUR_AN='<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 20.6C6.6 16.9 2.6 13.4 2.6 9.2 2.6 6.4 4.7 4.3 7.3 4.3c1.9 0 3.6 1 4.7 2.7 1.1-1.7 2.8-2.7 4.7-2.7 2.6 0 4.7 2.1 4.7 4.9 0 4.2-4 7.7-9.4 11.4z" fill="currentColor" style="stroke:var(--encre)" stroke-width="1.6" stroke-linejoin="round" paint-order="stroke"/></svg>';
function anFavori(t,de,vers){const s=caseR(de[0],de[1],de[2]),c=caseDe(vers[0],vers[1],vers[2]);if(!s||!c)return;const r=rectScene(c),pa=c.querySelector('.d-past.rose'),q=pa?rectScene(pa):{x:r.x+6,y:r.y+r.h-26,w:60,h:20};
  const tx=q.x+12,ty=q.y+q.h/2,x0=s.x+s.w/2,y0=s.y+s.h/2,cr=anCalque('an-coeur');cr.innerHTML=COEUR_AN;Object.assign(cr.style,{left:(x0-16)+'px',top:(y0-16)+'px'});
  anA(cr,[{opacity:0,transform:'translate(0,0) scale(.4)'},{opacity:1,transform:'translate(0,-16px) scale(1.25)',offset:.18},{opacity:1,transform:'translate('+((tx-x0)/2)+'px,'+((ty-y0)/2-110)+'px) scale(1.1)',offset:.6},{opacity:1,transform:'translate('+(tx-x0)+'px,'+(ty-y0)+'px) scale(.9)',offset:.8},{opacity:0,transform:'translate('+(tx-x0)+'px,'+(ty-y0)+'px) scale(.9)'}],{t,duration:800,easing:'ease-in-out'});anFin(cr,t,850);
  const o=anCalque('an-rose',s);anA(o,[{opacity:0},{opacity:1,offset:.3},{opacity:0}],{t,duration:600});anFin(o,t,650)}
/* Bandeau en travers (debut de manche, victoire, defaite) ; rend sa duree (divisee par la vitesse du rejeu, KV = 1 ailleurs) */
function anBandeau(txt,sous,co,haut,fin){if(!I.couche||!I.scene)return 0;const t=performance.now(),k=x=>x/I.KV; /* rejeu x2/x4 : durees divisees par la vitesse */
  let v=null;if(fin){v=anCalque('an-voile',{x:0,y:0,w:1920,h:1080});anA(v,[{opacity:0},{opacity:1,offset:.15},{opacity:1,offset:.88},{opacity:0}],{t,duration:k(1650)});anFin(v,t,k(1650))}
  const tr=I.scene.querySelector('.d-tr'),p=I.scene.querySelector('.d-plat'),R=fin||!tr||!p?{x:0,y:440,w:1920,h:200}:(()=>{const a=rectScene(tr);return {x:0,y:a.y+a.h/2-60,w:1920,h:120}})(); /* toute la largeur : le texte ne sort jamais de l'ecran */
  const bd=anCalque('an-bandeau'+(fin?'':' an-bandeau-l'),R),sp=mk('span','',txt);bd.style.color=co;if(sous)sp.append(mk('small','',sous));bd.append(sp);
  if(fin){const sc=I.scene.querySelector('.d-sc');if(sc&&!fin.calme)anA(sc,[{transform:'scale(1)'},{transform:'scale(1.12)',offset:.4},{transform:'scale(1)'}],{t,delay:k(150),duration:k(450),fill:'none'});
    anA(sp,[{opacity:0,transform:'scale(.85)'},{opacity:1,transform:'scale(1.03)',offset:.6},{opacity:1,transform:'scale(1)'}],{t,delay:k(250),duration:k(450),easing:'cubic-bezier(.3,1.3,.5,1)'});
    anA(sp,[{opacity:1},{opacity:0}],{t,delay:k(1300),duration:k(250),fill:'forwards'});anFin(bd,t,k(1600));return k(1500)} /* test2j : ~1,5 s (valide par Romain) */
  anA(sp,[{opacity:0,transform:'translateX(-60px)'},{opacity:1,transform:'translateX(0)',offset:.3},{opacity:1,transform:'translateX(0)',offset:.75},{opacity:0,transform:'translateX(60px)'}],{t,duration:k(1000),easing:'ease-in-out'});
  I.scene.querySelectorAll('.d-pts i.on').forEach(i=>anA(i,[{filter:'brightness(1)'},{filter:'brightness(1.6) drop-shadow(0 0 8px var(--an-or))',offset:.4},{filter:'brightness(1)'}],{t,delay:k(200),duration:k(500),fill:'none'}));
  anFin(bd,t,k(1050));return k(1000)}
/* Debut de manche : apres la fermeture du recapitulatif de la manche qui vient de finir */
function anManche(m,n){const s=I.E&&I.E.etat;if(!s||s.fin||!I.D)return;if(Number.isInteger(m)&&s.manche<=m){if((n|0)<25)setTimeout(()=>anManche(m,(n|0)+1),150);return} /* test2j : attendre l'etat de la manche suivante */const q=s.phase==='mulligan'?null:U().quiJoue(s);
  anBandeau('Manche '+s.manche+(q===0||q===1?' - '+(I.src==='joueur'&&q===I.E.moi?'Tu commences':nom(q)+' commence'):''),null,'var(--an-or)',0,null)}
/* Victoire ou defaite : bandeau d'environ 1,5 s avant l'ecran de fin ; rend la duree reelle (ms) */
function anVictoire(){const s=I.E.etat,F=s.fin;if(!F||(I.src==='spec'&&F.abandon!==undefined))return 0;
  const w=F.gagnant,sc=F.scores||[s.j[0].score,s.j[1].score],dp=F.departage&&(F.scores||[0,1])[0]===(F.scores||[0,1])[1]?' au départage':'',moi=I.src==='joueur'||I.src==='rejeu'?I.E.moi:null,o=moi!=null?moi:(w===0||w===1?w:0),ab=sc[o]+' - '+sc[1-o];
  let d;
  if(w!==0&&w!==1)d=anBandeau('Match nul',ab,'var(--an-or)',0,{calme:1});
  else if(moi==null||w===moi)d=anBandeau('Victoire',phraseFin(true,moi!=null&&I.src==='joueur'?null:nom(w))+dp+' '+sc[w]+' - '+sc[1-w],COL[w],0,{});
  else d=anBandeau('Défaite',phraseFin(false,I.src==='joueur'?null:nom(moi))+dp+' '+ab,'var(--adverse,#ee6a2c)',0,{calme:1});
  return d/I.KV}
/* Fin de manche : une etoile par terrain remporte (et par bonus du decompte) vers le score du bandeau, avant la fenetre de manche ; rend la duree */
const ONDE=620;
function anOnde(t,el,p){const r=rectScene(el);
  [0,170].forEach(dl=>{const o=anCalque('an-onde',r);o.style.color=COL[p];anA(o,[{opacity:1,transform:'scale(1)'},{opacity:0,transform:'scale(1.45,1.8)'}],{t,delay:dl,duration:650,easing:'cubic-bezier(.2,.6,.3,1)'});anFin(o,t,dl+700)});
  const v=anCalque('an-voile-c',r);v.style.color=COL[p];anA(v,[{opacity:0},{opacity:1,offset:.3},{opacity:0}],{t,duration:800});anFin(v,t,850);
  const pv=el.querySelector('.p-valeur');if(pv)anA(pv,[{transform:'scale(1)'},{transform:'scale(1.3)',offset:.45},{transform:'scale(1)'}],{t,delay:260,duration:380,easing:'cubic-bezier(.3,1.5,.5,1)',fill:'none'})}
/* Fin du vol : la case montre la carte posee (sans repeindre) */
function atterrit(){if(!I.scene)return;I.scene.querySelectorAll('.d-der>button img').forEach(i=>i.style.visibility='');I.scene.querySelectorAll('.p-case.d-vol').forEach(c=>{c.classList.remove('d-vol');c.classList.toggle('evo',c.dataset.evo==='1');c.querySelectorAll(':scope>.d-vieux').forEach(o=>o.remove())})}
/* Carte qui glisse de la main a sa case (couche au-dessus de la scene, gardee d'une peinture a l'autre) */
function lanceVol(){
  const v=I.suivi.vol;if(!v||v.lance||!I.couche)return;v.lance=true;prevoit(v.fin);
  const c=caseDe(v.p,v.l,v.k);if(!c)return;
  const a=rectScene(c),d=v.de,sc=a.h*1.2/d.h,dx=a.x+a.w/2-d.x-d.w*sc/2,dy=a.y+a.h/2-d.y-d.h*sc/2,im=mk('img','d-vole'),reste=v.fin-performance.now();
  if(reste<50)return;
  im.src=U().srcC(v.c);im.alt='';Object.assign(im.style,{left:d.x+'px',top:d.y+'px',width:d.w+'px',height:d.h+'px'});I.couche.append(im);
  /* 0.6 : comme montreGrand en 0.4, la carte passe en grand sur l'image de « Derniere carte jouee » (a cote du plateau, sans le cacher), puis glisse vers sa case */
  const g=I.scene.querySelector('.d-der>button img');
  if(g&&reste>I.GRAND*.5){const G=rectScene(g),k=G.h/d.h,gx=G.x-d.x,gy=G.y-d.y,tr=(x,y,z)=>'translate('+x+'px,'+y+'px) scale('+z+')';
    g.style.visibility='hidden';
    const an=im.animate([{transform:tr(0,0,1),opacity:1},{transform:tr(gx,gy,k),opacity:1,offset:.14},{transform:tr(gx,gy,k),opacity:1,offset:.62},
      {transform:tr(dx,dy,sc),opacity:1,offset:.95},{transform:tr(dx,dy,sc),opacity:0}],{duration:reste,easing:'ease-in-out',fill:'forwards'});
    an.onfinish=()=>im.remove();an.oncancel=()=>im.remove();return}
  const an=im.animate([{transform:'translate(0,0) scale(1)',opacity:1},{transform:'translate('+dx*.3+'px,'+(dy*.3-30)+'px) scale('+(1+(sc-1)*.3+.06)+')',opacity:1,offset:.35},
    {transform:'translate('+dx+'px,'+dy+'px) scale('+sc+')',opacity:1,offset:.85},{transform:'translate('+dx+'px,'+dy+'px) scale('+sc+')',opacity:0}],{duration:reste,easing:'cubic-bezier(.35,.6,.3,1)',fill:'forwards'});
  an.onfinish=()=>im.remove();an.oncancel=()=>im.remove();
}
return {rectScene,rectMain,lanceVols,rectScore,etoileVol,prevoit,anPlus,lanceAn,anEvo,anAnimal,anBrise,anRecup,anFrappe,anBonus,anCopie,COEUR_AN,anFavori,anManche,anVictoire,ONDE,anOnde,atterrit,lanceVol};
};
