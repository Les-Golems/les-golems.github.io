/* Outils communs : $, site d'essai et stockage local (lire, ecrire), compatibilite des versions ; etoile SVG. */
const ETOILE_G='<path d="M150.0 162.0 L103.0 97.3 L150.0 20.0 Z" fill="#ffe48a" stroke="#ffe48a" stroke-width="1" stroke-linejoin="round"/><path d="M150.0 162.0 L150.0 20.0 L197.0 97.3 Z" fill="#f09a1a" stroke="#f09a1a" stroke-width="1" stroke-linejoin="round"/><path d="M150.0 162.0 L197.0 97.3 L288.9 116.9 Z" fill="#ffc02e" stroke="#ffc02e" stroke-width="1" stroke-linejoin="round"/><path d="M150.0 162.0 L288.9 116.9 L222.3 185.5 Z" fill="#b8650f" stroke="#b8650f" stroke-width="1" stroke-linejoin="round"/><path d="M150.0 162.0 L222.3 185.5 L231.1 273.6 Z" fill="#f09a1a" stroke="#f09a1a" stroke-width="1" stroke-linejoin="round"/><path d="M150.0 162.0 L231.1 273.6 L150.0 244.0 Z" fill="#b8650f" stroke="#b8650f" stroke-width="1" stroke-linejoin="round"/><path d="M150.0 162.0 L150.0 244.0 L65.4 278.5 Z" fill="#f09a1a" stroke="#f09a1a" stroke-width="1" stroke-linejoin="round"/><path d="M150.0 162.0 L65.4 278.5 L75.8 186.1 Z" fill="#ffc02e" stroke="#ffc02e" stroke-width="1" stroke-linejoin="round"/><path d="M150.0 162.0 L75.8 186.1 L16.9 118.7 Z" fill="#ffc02e" stroke="#ffc02e" stroke-width="1" stroke-linejoin="round"/><path d="M150.0 162.0 L16.9 118.7 L103.0 97.3 Z" fill="#f09a1a" stroke="#f09a1a" stroke-width="1" stroke-linejoin="round"/><path d="M150.0 20.0 L197.0 97.3 L190.4 106.3 L150.0 39.9 Z" fill="#ffc02e" stroke="#ffc02e" stroke-width="1"/><path d="M197.0 97.3 L288.9 116.9 L269.4 123.2 L190.4 106.3 Z" fill="#fff0b0" stroke="#fff0b0" stroke-width="1"/><path d="M288.9 116.9 L222.3 185.5 L212.2 182.2 L269.4 123.2 Z" fill="#b8650f" stroke="#b8650f" stroke-width="1"/><path d="M222.3 185.5 L231.1 273.6 L219.8 258.0 L212.2 182.2 Z" fill="#b8650f" stroke="#b8650f" stroke-width="1"/><path d="M231.1 273.6 L150.0 244.0 L150.0 232.5 L219.8 258.0 Z" fill="#b8650f" stroke="#b8650f" stroke-width="1"/><path d="M150.0 244.0 L65.4 278.5 L77.2 262.2 L150.0 232.5 Z" fill="#b8650f" stroke="#b8650f" stroke-width="1"/><path d="M65.4 278.5 L75.8 186.1 L86.2 182.7 L77.2 262.2 Z" fill="#fff0b0" stroke="#fff0b0" stroke-width="1"/><path d="M75.8 186.1 L16.9 118.7 L35.5 124.8 L86.2 182.7 Z" fill="#ffc02e" stroke="#ffc02e" stroke-width="1"/><path d="M16.9 118.7 L103.0 97.3 L109.6 106.3 L35.5 124.8 Z" fill="#fff0b0" stroke="#fff0b0" stroke-width="1"/><path d="M103.0 97.3 L150.0 20.0 L150.0 39.9 L109.6 106.3 Z" fill="#fff0b0" stroke="#fff0b0" stroke-width="1"/><path d="M150.0 20.0 L197.0 97.3 L288.9 116.9 L222.3 185.5 L231.1 273.6 L150.0 244.0 L65.4 278.5 L75.8 186.1 L16.9 118.7 L103.0 97.3 Z" fill="none" stroke="#0b0b10" stroke-width="13" stroke-linejoin="round"/>';
const $=id=>document.getElementById(id);
/* Site d'essai (/essai/) : cles locales prefixees pour ne pas se meler au site public (meme origine), titre marque. */
const ESSAI=location.pathname.split('/')[1]==='essai';
const LS=k=>(ESSAI?'essai.':'')+k;
if(ESSAI){document.title='Les Golems (Essai)';document.documentElement.classList.add('essai');const h=document.querySelector('.haut h1'),st=h&&h.querySelector('.st-ligne');if(st){const p=document.createElement('span');p.className='essai-pastille';p.textContent="SITE D'ESSAI";h.insertBefore(p,st)}}
function lire(k){try{return localStorage.getItem(LS(k))}catch(e){return null}}
function ecrire(k,v){try{localStorage.setItem(LS(k),v)}catch(e){}}
/* Le moteur est revenu de 0.2a a 0.2 sans changement de regles : les sauvegardes et rejeux 0.2a restent valides. */
/* 0.2c = 0.2b.2 renomme, memes regles : une partie 0.2b.2 sauvegardee se reprend. */
function memeVersion(v){return v===M.VERSION||(M.VERSION==='0.2'&&v==='0.2a')||(M.VERSION==='0.2c'&&v==='0.2b.2')}

/* Declarations remontees ici depuis un fichier charge plus tard : elles servent des le chargement (avant, une seule portee les hissait). */
function el(tag,cls,txt){const e=document.createElement(tag);if(cls)e.className=cls;if(txt!=null)e.textContent=txt;return e}
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
couleurTaux.valeur=(taux,parties,opts)=>({'sc-taux-vert':'var(--vert)','sc-taux-ambre':'var(--ambre)','sc-taux-rouge':'var(--rouge)','sc-taux-gris':'var(--gris-taux)','sc-taux-neutre':'var(--blanc)'})[couleurTaux(taux,parties,opts)];
if(typeof module!=='undefined'&&module.exports)module.exports.couleurTaux=couleurTaux;
