/* Navigation : onglets, version vue (point des Nouveautes), lignes qui tiennent sans defilement. */
/* Onglets */
const noms=['nouveautes','jouer','decks','historique','stats','cartes','regles'].concat(GUIDES.length?['guides']:[]);
function onglet(n){
  noms.forEach(x=>{$(x).hidden=x!==n;$('t-'+x).setAttribute('aria-selected',x===n)});
  if(n==='decks')peintDecks();if(n==='historique')ajusteHisto();if(n==='stats')peintStats();if(n==='guides')ajusteGuides();if(n==='nouveautes'){proposeGuide();ajusteNotes()}
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
function ajusteGuides(){if(typeof peintGuides!=="function")return;ajustePage('guides',()=>$('gdBlocs'),v=>GD.par=v,peintGuides,6)}
function ajusteNotes(){if(typeof peintNotes!=="function")return;ajustePage('nouveautes',()=>$('notes'),v=>NV.par=v,peintNotes,6)}
function ajusteHisto(){if(typeof peintHisto!=="function")return;ajustePage('historique',()=>document.querySelector('#histo .h-grille')||(peintHisto(),document.querySelector('#histo .h-grille')),v=>lignesPage=v,peintHisto,14)}
{let t=0;const tout=()=>{clearTimeout(t);t=setTimeout(()=>{ajusteGuides();ajusteNotes();ajusteHisto()},120)};addEventListener('resize',tout);
  ['guides','nouveautes','historique'].forEach(x=>$(x).addEventListener('load',e=>{if(e.target.tagName==='IMG'&&!document.querySelector('#gdBlocs [data-joue="1"]'))tout()},true));document.fonts?.ready.then(tout);addEventListener('load',tout)}

/* Deux colonnes : une section ouverte de chaque côté pour les équilibrer. */
if(matchMedia('(min-width:1200px)').matches)$('dTerrains').open=true;

