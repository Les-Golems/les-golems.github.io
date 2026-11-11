/* Navigation : onglets, version vue (point des Nouveautes), lignes qui tiennent sans defilement. */
/* Onglets */
const noms=['nouveautes','jouer','decks','historique','stats','cartes','regles'];
function onglet(n){
  if(n==='cartes'){if(typeof vueDk!=='undefined'){vueDk='cartes';pageDk=0}n='decks'} /* 0.6 : l'onglet Cartes vit dans Decks (selecteur Decks | Cartes) */
  if(n==='guides'){onglet('regles');if(typeof cjVue==='function')cjVue('guides');return} /* ancien onglet Guides : Comment jouer > Guides */
  noms.forEach(x=>{$(x).hidden=x!==n;$('t-'+x).setAttribute('aria-selected',x===n)});
  if(n==='decks')peintDecks();if(n==='historique')ajusteHisto();if(n==='stats')peintStats();if(n==='nouveautes'){proposeGuide();ajusteNotes()}
  ecrire('golems.onglet',n);
  if(n==='nouveautes'&&!versionVue())ecrire('golems.versionVue',M.VERSION);majPointNv();
}
noms.forEach(n=>$('t-'+n).onclick=()=>onglet(n));
/* 0.5.1 : version vue (golems.versionVue). Version pas encore vue : point sur l'onglet Nouveautes et arrivee sur Nouveautes une fois. */
function versionVue(){return lire('golems.versionVue')===M.VERSION}
function majPointNv(){const t=$('t-nouveautes');let p=t.querySelector('.o-nvpt');
  if(versionVue()&&$('nouveautes').hidden){p?.remove();return} /* le point reste pendant la premiere visite des Nouveautes */
  if(versionVue())return;
  if(!p){p=document.createElement('span');p.className='o-nvpt';p.setAttribute('aria-hidden','true');t.append(p);t.setAttribute('aria-label','Nouveautés (nouvelle version)')}}
/* 0.5.2 : Guides, Historique et Nouveautes : le maximum de lignes qui tient sans defilement (au moins 1), colonnes lues dans la grille.
   Critere : la page ne defile pas (hauteur du document <= hauteur de fenetre), plus de marge forfaitaire.
   Une seule colonne sur telephone (< 700 px) : nombres d'origine, la page defile. Pas de recalcul en plein ecran (video).
   Recalcul au redimensionnement et quand une image de la section finit de charger. */
function ajustePage(sec,grille,set,peint,defaut){
  if($(sec).hidden||document.fullscreenElement)return;const g=grille();if(!g){peint();return}
  const cs=getComputedStyle(g),cols=cs.display==='grid'?cs.gridTemplateColumns.split(' ').filter(Boolean).length:1;
  if(cols<2&&innerWidth<700){set(defaut);peint();return}
  const deborde=()=>document.documentElement.scrollHeight>innerHeight;
  let r=12;set(r*cols);peint();
  while(r>1&&deborde()){r--;set(r*cols);peint()}
}
function ajusteNotes(){if(typeof peintNotes!=="function")return;ajustePage('nouveautes',()=>$('notes'),v=>NV.par=v,peintNotes,6)}
function ajusteHisto(){if(typeof peintHisto!=="function")return;ajustePage('historique',()=>document.querySelector('#histo .h-grille')||(peintHisto(),document.querySelector('#histo .h-grille')),v=>lignesPage=v,peintHisto,14)}
/* 0.6.1 : peintHisto recree les images de #histo, dont le load relancait tout() en boucle (clignotement, clics de filtre perdus) :
   ces load sont ignores, et un redimensionnement ne recalcule que si la hauteur utile (taille de fenetre) change vraiment. */
/* Pas avant la fin de l'analyse de la page : ajusteNotes (onglets/nouveautes.js) et ajusteHisto (onglets/historique.js) sont charges apres ce fichier ; fonts.ready ou une image peuvent arriver pendant le chargement (ReferenceError). Le passage du 'load' fait le premier ajustement. */
{let t=0,cle='';const tout=f=>{if(document.readyState==='loading')return;const k=innerWidth+'x'+innerHeight;if(f!==true&&k===cle)return;clearTimeout(t);t=setTimeout(()=>{cle=innerWidth+'x'+innerHeight;ajusteNotes();ajusteHisto()},120)};
  addEventListener('resize',()=>tout());
  ['nouveautes','historique'].forEach(x=>$(x).addEventListener('load',e=>{if(e.target.tagName==='IMG'&&!e.target.closest('#histo')&&!document.querySelector('#gdBlocs [data-joue="1"]'))tout(true)},true));document.fonts?.ready.then(()=>tout(true));addEventListener('load',()=>tout(true))}

/* Lien #guides : ouvre Comment jouer > Guides. */
function lienGuides(){if(location.hash==='#guides')onglet('guides')}
addEventListener('hashchange',lienGuides);addEventListener('load',()=>setTimeout(lienGuides,0));


/* 0.6 : onglets de la refonte (maquette 32, B3) : Nouveautes, Jouer, Decks, Statistiques, Comment jouer, etires sur toute la largeur.
   Boutons Historique et Cartes masques (suite de la refonte : voir Reste a faire.md) ; les sections restent ouvrables par onglet('historique') etc. */
['t-historique','t-cartes'].forEach(i=>{const b=$(i);if(b)b.hidden=true});

/* 0.6 : bandeau superieur B3 (maquette 32 - Bandeau superieur). Pastille « N en ligne » (affichage seul), capsule du compte
   (clic = profil, ou connexion pour un invite : commun/compte.js), menu Affichage (theme + couleurs), porte de deconnexion. */
/* Couleurs : selecteur [Standard] [Daltonien], le meme partout (bandeau, barre d'outils de la partie, diffusion). Remplace
   l'ancien interrupteur oui/non : window.interDal (appele par vue/partie.js et diffusion.js) rend ce selecteur.
   body.daltonien affiche les reperes ; memorise sur l'appareil (golems.daltonien). La case cachee #daltonienCase reste pour vue/partie.js. */
const AIDE_DAL="Ajoute des repères en plus des couleurs : flèches sur la Force modifiée, « ! » sur une carte fautive, mot « Animal » dans les listes.";
const DAL={K:'golems.daltonien',on:false};
try{DAL.on=localStorage.getItem(DAL.K)==='1'}catch(e){}
function appDal(v){DAL.on=!!v;document.body.classList.toggle('daltonien',DAL.on);
  document.querySelectorAll('.dal-sel').forEach(s=>s.querySelectorAll('button').forEach(b=>b.setAttribute('aria-pressed',String((b.dataset.v==='1')===DAL.on))));
  document.querySelectorAll('input.dal-case').forEach(c=>{c.checked=DAL.on})}
function choisitDal(v){appDal(v);try{localStorage.setItem(DAL.K,v?'1':'0')}catch(e){}}
function remplitSelDal(s){s.classList.add('dal-sel');s.setAttribute('role','group');s.setAttribute('aria-label','Couleurs');s.textContent='';
  [['0','Standard'],['1','Daltonien']].forEach(([v,t])=>{const b=document.createElement('button');b.type='button';b.dataset.v=v;b.textContent=t;
    if(v==='1')b.title=AIDE_DAL;b.setAttribute('aria-pressed',String((v==='1')===DAL.on));b.onclick=()=>choisitDal(v==='1');s.append(b)});return s}
function selDaltonien(){const s=document.createElement('div');s.className='sc-sel sc-petit dal-inter';return remplitSelDal(s)}
Object.defineProperty(window,'interDal',{configurable:true,get:()=>selDaltonien,set:()=>{}}); /* l'ancienne definition de vue/partie.js est ignoree */
remplitSelDal($('selCouleurs'));
$('daltonienCase').addEventListener('change',e=>choisitDal(e.target.checked));
addEventListener('storage',e=>{if(e.key===DAL.K)appDal(e.newValue==='1')});
appDal(DAL.on);
/* Theme (0.6a) : [Sombre] [Clair]. html.clair (variables de css/base.css), memorise sur l'appareil (golems.theme) ; deja pose
   avant le CSS par le petit script d'index.html (pas de flash sombre). */
const THEME={K:'golems.theme'};
function appTheme(v){const c=v==='clair';document.documentElement.classList.toggle('clair',c);
  const m=document.querySelector('meta[name=theme-color]');if(m)m.content=c?'#e4e9ee':'#0a121a';
  $('selTheme').querySelectorAll('button').forEach(x=>x.setAttribute('aria-pressed',String(x.dataset.v===(c?'clair':'sombre'))))}
$('selTheme').querySelectorAll('button').forEach(b=>b.onclick=()=>{appTheme(b.dataset.v);try{localStorage.setItem(THEME.K,b.dataset.v)}catch(e){}});
addEventListener('storage',e=>{if(e.key===THEME.K)appTheme(e.newValue==='clair'?'clair':'sombre')});
appTheme(document.documentElement.classList.contains('clair')?'clair':'sombre');
/* Menu Affichage : s'ouvre par-dessus (position absolue), rien ne bouge ; ferme au clic dehors et sur Echap. */
function menuAff(o){const m=$('menuAffichage'),b=$('btnAffichage');m.hidden=!o;b.setAttribute('aria-expanded',String(o))}
$('btnAffichage').onclick=e=>{e.stopPropagation();menuAff($('menuAffichage').hidden)};
document.addEventListener('click',e=>{if(!$('menuAffichage').hidden&&!e.target.closest('.bd-affw'))menuAff(false)});
document.addEventListener('keydown',e=>{if(e.key==='Escape'&&!$('menuAffichage').hidden){menuAff(false);$('btnAffichage').focus()}});
/* Pastille « N en ligne » : visiteurs de enligne/ (invites compris), ecrits par firebase/salon.js. Affichage seul, non cliquable.
   Repli (ancienne base sans enligne/) : comptes presents dans hall/ (room.peers). */
function majEnLigne(){const p=$('enLigne');let n=0;
  try{n=room&&room.enLigneN?room.enLigneN():0;if(!n&&room&&room.peers)n=room.peers().length}catch(e){n=0}
  p.hidden=!n;$('enLigneN').textContent=String(n);p.title=n+(n>1?' visiteurs en ligne':' visiteur en ligne')+' sur le site'}
{const t=setInterval(()=>{try{if(typeof room!=='undefined'&&room&&room.onPeers){clearInterval(t);room.onPeers(majEnLigne,majEnLigne);if(room.onEnLigne)room.onEnLigne(majEnLigne);majEnLigne()}}catch(e){}},400)}
