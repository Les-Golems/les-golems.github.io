/* Outils communs : $, site d'essai et stockage local (lire, ecrire), compatibilite des versions ; etoile SVG. */
const ETOILE_G='<path d="M150.0 162.0 L103.0 97.3 L150.0 20.0 Z" fill="#ffe48a" stroke="#ffe48a" stroke-width="1" stroke-linejoin="round"/><path d="M150.0 162.0 L150.0 20.0 L197.0 97.3 Z" fill="#f09a1a" stroke="#f09a1a" stroke-width="1" stroke-linejoin="round"/><path d="M150.0 162.0 L197.0 97.3 L288.9 116.9 Z" fill="#ffc02e" stroke="#ffc02e" stroke-width="1" stroke-linejoin="round"/><path d="M150.0 162.0 L288.9 116.9 L222.3 185.5 Z" fill="#b8650f" stroke="#b8650f" stroke-width="1" stroke-linejoin="round"/><path d="M150.0 162.0 L222.3 185.5 L231.1 273.6 Z" fill="#f09a1a" stroke="#f09a1a" stroke-width="1" stroke-linejoin="round"/><path d="M150.0 162.0 L231.1 273.6 L150.0 244.0 Z" fill="#b8650f" stroke="#b8650f" stroke-width="1" stroke-linejoin="round"/><path d="M150.0 162.0 L150.0 244.0 L65.4 278.5 Z" fill="#f09a1a" stroke="#f09a1a" stroke-width="1" stroke-linejoin="round"/><path d="M150.0 162.0 L65.4 278.5 L75.8 186.1 Z" fill="#ffc02e" stroke="#ffc02e" stroke-width="1" stroke-linejoin="round"/><path d="M150.0 162.0 L75.8 186.1 L16.9 118.7 Z" fill="#ffc02e" stroke="#ffc02e" stroke-width="1" stroke-linejoin="round"/><path d="M150.0 162.0 L16.9 118.7 L103.0 97.3 Z" fill="#f09a1a" stroke="#f09a1a" stroke-width="1" stroke-linejoin="round"/><path d="M150.0 20.0 L197.0 97.3 L190.4 106.3 L150.0 39.9 Z" fill="#ffc02e" stroke="#ffc02e" stroke-width="1"/><path d="M197.0 97.3 L288.9 116.9 L269.4 123.2 L190.4 106.3 Z" fill="#fff0b0" stroke="#fff0b0" stroke-width="1"/><path d="M288.9 116.9 L222.3 185.5 L212.2 182.2 L269.4 123.2 Z" fill="#b8650f" stroke="#b8650f" stroke-width="1"/><path d="M222.3 185.5 L231.1 273.6 L219.8 258.0 L212.2 182.2 Z" fill="#b8650f" stroke="#b8650f" stroke-width="1"/><path d="M231.1 273.6 L150.0 244.0 L150.0 232.5 L219.8 258.0 Z" fill="#b8650f" stroke="#b8650f" stroke-width="1"/><path d="M150.0 244.0 L65.4 278.5 L77.2 262.2 L150.0 232.5 Z" fill="#b8650f" stroke="#b8650f" stroke-width="1"/><path d="M65.4 278.5 L75.8 186.1 L86.2 182.7 L77.2 262.2 Z" fill="#fff0b0" stroke="#fff0b0" stroke-width="1"/><path d="M75.8 186.1 L16.9 118.7 L35.5 124.8 L86.2 182.7 Z" fill="#ffc02e" stroke="#ffc02e" stroke-width="1"/><path d="M16.9 118.7 L103.0 97.3 L109.6 106.3 L35.5 124.8 Z" fill="#fff0b0" stroke="#fff0b0" stroke-width="1"/><path d="M103.0 97.3 L150.0 20.0 L150.0 39.9 L109.6 106.3 Z" fill="#fff0b0" stroke="#fff0b0" stroke-width="1"/><path d="M150.0 20.0 L197.0 97.3 L288.9 116.9 L222.3 185.5 L231.1 273.6 L150.0 244.0 L65.4 278.5 L75.8 186.1 L16.9 118.7 L103.0 97.3 Z" fill="none" stroke="#0b0b10" stroke-width="13" stroke-linejoin="round"/>';
const $=id=>document.getElementById(id);
/* Site d'essai (/essai/) : cles locales prefixees pour ne pas se meler au site public (meme origine), titre marque. */
const ESSAI=location.pathname.split('/')[1]==='essai';
const LS=k=>(ESSAI?'essai.':'')+k;
if(ESSAI){document.title='Les Golems (Essai)';document.documentElement.classList.add('essai');const h=document.querySelector('.haut h1'),st=h&&h.querySelector('.st-ligne');if(st){const p=document.createElement('span');p.className='essai-pastille';p.textContent="SITE D'ESSAI";h.insertBefore(p,st)}}
function lire(k){try{return localStorage.getItem(LS(k))}catch(e){return null}}
function ecrire(k,v){try{localStorage.setItem(LS(k),v)}catch(e){}}
/* Filtres et tris memorises sur l'appareil (JSON) ; illisible ou absent : null. */
function lireJ(k){try{const v=JSON.parse(lire(k)||'null');return v&&typeof v==='object'?v:null}catch(e){return null}}
function ecrireJ(k,v){try{ecrire(k,JSON.stringify(v))}catch(e){}}
/* Le moteur est revenu de 0.2a a 0.2 sans changement de regles : les sauvegardes et rejeux 0.2a restent valides. */
/* 0.2c = 0.2b.2 renomme, memes regles : une partie 0.2b.2 sauvegardee se reprend. */
function memeVersion(v){return v===M.VERSION||(M.VERSION==='0.2'&&v==='0.2a')||(M.VERSION==='0.2c'&&v==='0.2b.2')}

/* Declarations remontees ici depuis un fichier charge plus tard : elles servent des le chargement (avant, une seule portee les hissait). */
function el(tag,cls,txt){const e=document.createElement(tag);if(cls)e.className=cls;if(txt!=null)e.textContent=txt;return e}
/* Nombre accorde : pluriel(1,'carte') = « 1 carte », pluriel(2,'carte') = « 2 cartes ». */
const pluriel=(n,mot)=>n+' '+mot+(n>1?'s':'');
/* Fin de partie, textes communs (vue/joueur.js, vue/partie.js, vue/diffusion.js) : titre selon le gagnant w (null = match nul) vu par me ;
   phrase du bandeau de fin : nom null = « Tu remportes / Tu perds la partie », sinon « <nom> remporte / perd la partie ». */
const titreFin=(w,me)=>w===null?'Match nul':w===me?'Victoire':'Défaite';
const phraseFin=(gagne,nom)=>nom==null?(gagne?'Tu remportes la partie':'Tu perds la partie'):nom+(gagne?' remporte la partie':' perd la partie');
/* Oeil des champs de code (type password) : affiche ou masque le code tape, meme icone que le zoom des cartes.
   Focus et curseur gardes ; autocomplete intact ; remasque a l'envoi (gestionnaire de mots de passe) et a la fermeture de la fenetre. */

/* Etape 8 : l'interface ne teste jamais un code de carte ni un nom de terrain ; elle lit les effets dans les fiches (cartes/donnees/*.js).
   Fiches du jeu en service (window.GolemsDonnees) : les codes et les noms ne changent jamais d'une version a l'autre, un rejeu ancien lit donc les memes effets.
   effetsCarte(id) : liste des effets de la carte ; effetDe(id,type,filtre) : son 1er effet de ce type (ou null) ; idsAvecEffet(type,filtre) : codes des cartes qui l'ont.
   effetTerrain(T,type) : effet de ce type du terrain T (lu par son nom), ou null ; indexTerrainEffet(s,type) : colonne du 1er terrain de la partie qui l'a (-1 sinon). */
const effetsCarte=id=>{const C=(window.GolemsDonnees.CARTES||{})[id];return C?[].concat(C.effet||[]):[]};
const effetDe=(id,type,f)=>effetsCarte(id).find(r=>r.type===type&&(!f||f(r)))||null;
const idsAvecEffet=(type,f)=>Object.keys(window.GolemsDonnees.CARTES).filter(id=>effetDe(id,type,f));
const effetTerrain=(T,type)=>{const x=T&&window.GolemsDonnees.terrains.liste.find(z=>z.nom===T.nom);return x&&[].concat(x.effet||[]).find(r=>r.type===type)||null};
const indexTerrainEffet=(s,type)=>s.terrains.findIndex(T=>effetTerrain(T,type));

/* Couleur d'un taux (victoires, etc.), regle unique du site : vert >= 50 %, ambre 40-49 %, rouge < 40 %, gris si moins de 5 parties (donnees insuffisantes).
   taux : en pourcentage 0-100 ; parties : nombre de parties derriere le taux ; opts.neutre : blanc partout (classement des joueurs).
   Rend la classe CSS (sc-taux-vert / ambre / rouge / gris / neutre) ; couleurTaux.valeur(...) rend la couleur CSS (var(--...)). */
function couleurTaux(taux,parties,opts){
  if(opts&&opts.neutre)return 'sc-taux-neutre';
  if(parties!=null&&parties<5)return 'sc-taux-gris';
  if(taux==null||isNaN(taux))return 'sc-taux-gris';
  const r=Math.round(taux*10)/10;
  return r>=50?'sc-taux-vert':r>=40?'sc-taux-ambre':'sc-taux-rouge';
}
couleurTaux.valeur=(taux,parties,opts)=>({'sc-taux-vert':'var(--vert)','sc-taux-ambre':'var(--ambre)','sc-taux-rouge':'var(--rouge-texte-clair)','sc-taux-gris':'var(--gris-taux)','sc-taux-neutre':'var(--blanc)'})[couleurTaux(taux,parties,opts)];
/* Seuils d'ecran partages (0.7a). Ordinateur = 1080 px et plus ; tablette = 768 a 1079 ; telephone = 767 et moins.
   Memes valeurs que les <link media> de index.html et que css/tablette/, css/telephone/ (Plan du code, section 7). */
const LARGEUR_PC=1080;                       /* innerWidth < LARGEUR_PC : vue telephone / tablette */
const ECRAN_MOBILE='(max-width:1079px)';     /* telephone et tablette */
const ECRAN_PC='(min-width:1080px)';         /* ordinateur */
const ECRAN_TELEPHONE='(max-width:767px)';   /* telephone seul */

/* Glisser-deposer commun (0.7a) : partie (vue/joueur.js, main -> grille) et Tester des placements (onglets/decks.js, deck -> grille).
   Il rejoue les gestes existants : selection de la carte (o.choisit), puis depot (o.depose, ex. clic sur la case doree). Aucune regle ici.
   Souris : detache apres 6 px. Toucher : appui immobile 200 ms (tolerance 8 px), ou deplacement vertical franc si la carte est deja
   choisie (o.choisie) ; sinon defilement natif. Bande de 60 px en haut et en bas : defilement (o.defile). CSS : .glisse-* dans css/base.css.
   o : ecoute (element ou window qui recoit pointerdown), source (selecteur CSS), accepte(b), choisie(b), avant(g) (false = abandon ;
   peut remplacer g.b), choisit(g), marque(g) (element grise pendant le geste), cible(x,y) (case survolee), depose(c,g) (true = depose,
   sinon retour), valide(g) (verifie a chaque image), defile(p) (p = profondeur signee dans la bande), decalage(tactile) (hauteur du
   fantome au-dessus du doigt, en fraction), retour(g) (rectangle de retour du fantome), fondu, bloqueClic (ms). */
const GLISSE={SOURIS:6,TOL:8,APPUI:200,BORD:60};
const glisserDeposer=(()=>{
  let g=null; /* un seul geste a la fois, toutes sources confondues */
  const reduit=()=>matchMedia('(prefers-reduced-motion: reduce)').matches;
  const purge=sauf=>document.querySelectorAll('.glisse-fantome').forEach(x=>{if(x!==sauf)x.remove()}); /* aucun fantome ne survit a un geste */
  const survol=c=>{if(g.sv===c)return;if(g.sv)g.sv.classList.remove('glisse-survol');g.sv=c;if(c)c.classList.add('glisse-survol')};
  const place=()=>{const f=g.f;if(!f)return;f.style.left=(g.x-g.w/2)+'px';f.style.top=(g.y-g.h*g.o.decalage(g.tactile))+'px'};
  function fin(){if(!g)return;const G=g;g=null;clearTimeout(G.t);cancelAnimationFrame(G.raf);document.documentElement.classList.remove('glisse-en-cours');
    removeEventListener('pointermove',bouge,true);removeEventListener('pointerup',lache,true);removeEventListener('pointercancel',lache,true);
    if(G.sv)G.sv.classList.remove('glisse-survol');document.querySelectorAll('.glisse-source').forEach(x=>x.classList.remove('glisse-source'));return G}
  function annule(){const G=fin();if(G&&G.f)G.f.remove();purge()}
  function retour(G){const f=G.f;if(!f)return;const r=G.o.retour(G);if(reduit()||!r||!r.width||!r.height||!f.isConnected){f.remove();return}
    f.style.transition='left .18s ease-out,top .18s ease-out'+(G.o.fondu?',opacity .18s':'');f.style.left=r.left+'px';f.style.top=r.top+'px';if(G.o.fondu)f.style.opacity='0';
    setTimeout(()=>f.remove(),200);f.addEventListener('transitionend',()=>f.remove(),{once:true})}
  function detache(){const o=g.o;
    if(o.avant&&o.avant(g)===false){fin();return}
    g.on=true;clearTimeout(g.t);document.documentElement.classList.add('glisse-en-cours');purge();
    const r=g.b.getBoundingClientRect(),im=g.b.tagName==='IMG'?g.b:g.b.querySelector('img');g.w=Math.min(110,r.width||80);g.h=g.w*1.4;g.r0=r;
    const f=document.createElement('div');f.className='glisse-fantome';f.setAttribute('aria-hidden','true');f.style.width=g.w+'px';f.style.height=g.h+'px';
    if(im){const i=document.createElement('img');i.src=im.src;i.alt='';f.append(i)}document.body.append(f);g.f=f;
    o.choisit(g);const s=o.marque?o.marque(g):g.b;if(s)s.classList.add('glisse-source');place();
    const tic=()=>{if(!g||!g.on)return;if(g.o.valide&&!g.o.valide(g)){annule();return} /* tour change, fin de partie, main redessinee */
      const y=g.y,B=GLISSE.BORD,p=y<B?-(B-y):y>innerHeight-B?y-(innerHeight-B):0;
      if(p){g.o.defile(p);survol(g.o.cible(g.x,g.y))}g.raf=requestAnimationFrame(tic)};g.raf=requestAnimationFrame(tic)}
  function bouge(e){
    if(!g||e.pointerId!==g.id||e.__gl)return;e.__gl=1;g.x=e.clientX;g.y=e.clientY;const dx=g.x-g.x0,dy=g.y-g.y0,d=Math.hypot(dx,dy);
    if(!g.on){
      if(!g.tactile){if(d>GLISSE.SOURIS)detache();return}
      if(d>GLISSE.TOL){if(g.o.choisie(g.b)&&Math.abs(dy)>Math.abs(dx))detache();else fin()} /* sinon : defilement normal */
      return}
    if(e.cancelable)e.preventDefault();place();survol(g.o.cible(g.x,g.y))}
  function lache(e){if(!g||e.pointerId!==g.id||e.__gl)return;e.__gl=1;if(!g.on){fin();return}
    const o=g.o,c=e.type==='pointerup'?o.cible(e.clientX,e.clientY):null,G=fin();
    if(c&&o.depose(c,G)){if(G.f)G.f.remove()}else retour(G);
    const bloque=ev=>{ev.stopPropagation();ev.preventDefault()};addEventListener('click',bloque,true);setTimeout(()=>removeEventListener('click',bloque,true),o.bloqueClic||350)} /* pas d'apercu ni de deselection au relachement */
  function bloqueTm(e){if(g&&g.on&&e.cancelable)e.preventDefault()}
  if(typeof addEventListener==='function'&&typeof document!=='undefined'){addEventListener('blur',()=>{if(g)annule()});document.addEventListener('visibilitychange',()=>{if(document.hidden&&g)annule()})}
  return function(o){const L=o.ecoute||window,cap=L===window;
    L.addEventListener('pointerdown',e=>{
      if(!g)purge();
      if(g||!e.isPrimary||(e.pointerType==='mouse'&&e.button!==0))return;
      const b=e.target.closest&&e.target.closest(o.source);if(!b||(o.accepte&&!o.accepte(b)))return;
      g={o,b,id:e.pointerId,x0:e.clientX,y0:e.clientY,x:e.clientX,y:e.clientY,tactile:e.pointerType!=='mouse',on:false,sv:null};
      addEventListener('pointermove',bouge,true);addEventListener('pointerup',lache,true);addEventListener('pointercancel',lache,true);
      /* la selection peut redessiner la source : la cible touchee quitte la page et ses evenements ne remontent plus, on les ecoute aussi sur elle */
      const t=e.target;if(!t.__glisse){t.__glisse=1;t.addEventListener('pointermove',bouge);t.addEventListener('pointerup',lache);t.addEventListener('pointercancel',lache);t.addEventListener('touchmove',bloqueTm,{passive:false})}
      if(g.tactile)g.t=setTimeout(()=>{if(g&&!g.on)detache()},GLISSE.APPUI);
    },cap);
    L.addEventListener('touchmove',bloqueTm,{passive:false,capture:cap});
    L.addEventListener('contextmenu',e=>{if(g)e.preventDefault()},cap);
    L.addEventListener('dragstart',e=>{if(e.target.closest&&e.target.closest(o.source))e.preventDefault()},cap)}
})();
if(typeof module!=='undefined'&&module.exports)module.exports.couleurTaux=couleurTaux;
