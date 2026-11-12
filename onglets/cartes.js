/* Onglet Cartes : liste CARTES, filtres, tri, galerie, zoom d'une carte, liens directs ?carte=. */
/* Cartes */
/* Liste d'affichage, lue dans les fiches (cartes/donnees/*.js) : [code, nom long, elements, 0 base | 1 evolution | 'a' animal], dans l'ordre des fiches. */
const CARTES=window.GolemsDonnees.ordreAffichage.map(id=>{const c=window.GolemsDonnees.CARTES[id];return [id,window.GolemsDonnees.nomLong(id),c.el||[],c.animal?'a':c.base?1:0]});
/* 4e champ d'une carte : 0 = base, 1 = évolution, 'a' = animal de compagnie (ex. ['041','Kiwi',['brume'],'a']). */
const estAnimal=c=>c[3]==='a';
/* Couleur du sous-titre : premier element ; animal = vert clair --animal-titre (#effed9, d'apres le sous-titre de 901 et 902) ; sinon or. */
const coulT=c=>c[2][0]?'var(--'+c[2][0]+')':estAnimal(c)?'var(--animal-titre)':'var(--or)';
/* Aperçus : visibles dans la galerie, absents du moteur, des decks et de l'éditeur. */
const APERCUS=[],GALERIE=[...CARTES,...APERCUS];
const NUMERO_AFFICHE=window.GolemsDonnees.interface.numeroAffiche; /* cartes/donnees/interface.js */
const NUMERO_ANIMAL=window.GolemsDonnees.interface.numeroAnimal;
const numeroAffiche=id=>{if(NUMERO_ANIMAL[id])return 'A-'+String(NUMERO_ANIMAL[id]).padStart(3,'0');const n=NUMERO_AFFICHE[String(id).slice(0,3)];return n?'G-'+String(n).padStart(3,'0')+(String(id).endsWith('e')?' ★':''):''};
const EL=[['','Tous'],['magma','Magma'],['cristal','Cristal'],['foudre','Foudre'],['brume','Brume'],['roche','Roche']];
const TY=[['','Toutes'],['0','Base'],['1','Évolution'],['a','Animaux'],['t','Terrains']]; /* 0.4 : bouton « À venir » retiré des filtres (tuiles et logique gardées) */
const MSG_ANIMAUX="Aucun animal de compagnie pour l'instant.";
const A_VENIR=window.GolemsDonnees.interface.aVenir; /* cartes/donnees/interface.js */
function pastilles(box,liste,get,set,point){
  liste.forEach(([v,t])=>{
    const b=document.createElement('button');b.className='pastille';b.dataset.v=v;
    if(point&&v){const i=document.createElement('i');i.style.setProperty('--c','var(--'+v+')');b.append(i)}
    b.append(t);b.onclick=()=>{set(v);maj()};box.append(b);
  });
  box._get=get;
}
pastilles($('filtreType'),TY,()=>fTy,v=>fTy=v);
/* Elements : meme composant et meme regle pour l'onglet Cartes et l'editeur de deck. Aucune pastille choisie (depart, toutes en couleur)
   = aucun filtre ; les 5 choisies reviennent a aucune. Mode « Au moins un » : la carte a un des elements choisis ; « Tous » : elle les a tous.
   Les animaux (sans element) ne passent que sans filtre d'element ; avec Animaux, les pastilles sont grisees. */
const ELS=EL.filter(x=>x[0]).map(x=>x[0]);
const MODES_EL=[['ou','Au moins un'],['et','Tous']]; /* 3e mode possible : ['seul','Seulement'] = aucun element hors de ceux choisis */
/* Filtres d'elements : un animal prend l'element imprime sur sa carte (interface.elementAnimal). */
const elFiltre=c=>c[2].length?c[2]:(estAnimal(c)&&(window.GolemsDonnees.interface.elementAnimal||{})[c[0]])||[];
const passeEl=(c,f)=>{const e=elFiltre(c);return !f.sel.size||e.length>0&&(f.mode==='et'?[...f.sel].every(x=>e.includes(x)):f.mode==='seul'?e.every(x=>f.sel.has(x)):e.some(x=>f.sel.has(x)))};
/* Recherche : nom ou numero affiche (G-009), sans accents ni majuscules. */
const sansAccent=s=>s.normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase();
const cleRech=c=>sansAccent(c[1]+' '+numeroAffiche(c[0]));
const passeRech=(cle,q)=>{q=sansAccent(q.trim());return !q||cle.includes(q)};
/* Pastille ronde a picto d'un element : meme composant pour l'onglet Cartes et l'editeur de deck. */
function pastilleEl(v,clic){const b=document.createElement('button');b.type='button';b.className='f-el';b.dataset.el=v;b.style.setProperty('--c','var(--'+v+')');
  const t=EL.find(x=>x[0]===v)[1];b.title=t;b.setAttribute('aria-label',t);const i=document.createElement('img');i.src=imgV('cartes/'+v+'.png');i.alt='';b.append(i);
  b.onclick=clic;return b}
function ligneEls(f,change,off){
  const r=el('div','filtres f-ligne'),box=el('div','f-els'),m=el('div','f-btns f-mode');
  ELS.forEach(v=>box.append(pastilleEl(v,()=>{f.sel.has(v)?f.sel.delete(v):f.sel.add(v);if(f.sel.size===ELS.length)f.sel.clear();change()})));
  MODES_EL.forEach(([v,t])=>{const b=el('button','pastille',t);b.type='button';b.dataset.mode=v;b.onclick=()=>{f.mode=v;change()};m.append(b)});
  m.setAttribute('role','group');m.setAttribute('aria-label','Une carte doit avoir');
  r.append(el('span','f-lib','Éléments'),m,box);peintEls(r,f,off);return r}
/* Mode toujours actif (on peut le choisir avant les pastilles) ; grise avec Animaux, Terrains, A venir. */
function peintEls(r,f,off){
  r.querySelector('.f-els').classList.toggle('neutre',!f.sel.size);
  r.querySelectorAll('.f-el').forEach(b=>{b.disabled=off;b.setAttribute('aria-pressed',String(f.sel.has(b.dataset.el)))});
  r.querySelectorAll('[data-mode]').forEach(b=>{b.disabled=off;b.setAttribute('aria-pressed',String(b.dataset.mode===f.mode))});
}
function msgVide(f){
  if(f.mode==='et'&&f.sel.size>1&&!CARTES.some(c=>passeEl(c,f))){
    if(f.sel.size>2)return 'Aucune carte n’a '+f.sel.size+' éléments : une carte en a deux au plus.';
    const [a,b]=[...f.sel].map(v=>EL.find(x=>x[0]===v)[1]);return 'Aucune carte n’a à la fois '+a+' et '+b+'.'}
  return 'Aucune carte pour ce filtre.'}
const fCartes={sel:new Set(),mode:'ou'},ligneElC=ligneEls(fCartes,()=>maj(),false);$('filtreType').parentElement.after(ligneElC);
$('rechCarte').oninput=()=>maj();
const TRI=[['','Numéro'],['cout','Coût'],['force','Force']];let fTri='',triDesc=false;
pastilles($('filtreTri'),TRI,()=>fTri,v=>fTri=v);
{const s=document.createElement('button');s.className='pastille';s.id='triSens';s.type='button';s.innerHTML='<svg viewBox="0 0 16 16" aria-hidden="true"><path d="M8 13V3M3.5 7.5L8 3l4.5 4.5" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg><span></span>';s.onclick=()=>{triDesc=!triDesc;maj()};const g=el('div','f-btns');g.append(s);$('filtreTri').after(g)}
const valTri=(id,k)=>{const C=window.GolemsMoteur.CARTES[id];if(!C)return 99;return k==='force'?(C.force==null?0:C.force):C.cout}; /* animal : ni Force ni de, trie a 0 */
function trie(){
  const g=$('grille');
  if(!fTri){const ps=[...g.querySelectorAll('.paire')];if(triDesc)ps.reverse();ps.forEach(p=>g.append(p));
    const ord=GALERIE.map(c=>c[0]);ord.forEach(id=>g.querySelector('[data-paire="'+id.slice(0,3)+'"]').append(g.querySelector('[data-id="'+id+'"]')))}
  else{const ord=GALERIE.map((c,i)=>[c[0],valTri(c[0],fTri),i]).sort((x,y)=>(triDesc?y[1]-x[1]:x[1]-y[1])||x[2]-y[2]);
    const p0=g.querySelector('.paire');ord.forEach(([id])=>g.insertBefore(g.querySelector('[data-id="'+id+'"]'),p0))}
  g.querySelectorAll('[data-terrain],[data-avenir]').forEach(b=>g.append(b));
  const s=$('triSens');s.dataset.sens=triDesc?'desc':'asc';s.querySelector('span').textContent=triDesc?'Décroissant':'Croissant';s.setAttribute('aria-label','Ordre '+(triDesc?'décroissant':'croissant')+', inverser');
  $('filtreTri').querySelectorAll('button').forEach(b=>{if(b.id!=='triSens')b.setAttribute('aria-pressed',String(b.dataset.v===fTri))});
}
/* Reinitialiser : meme fonction que l'ancien Tout afficher (type, elements et leur mode, recherche), plus le tri remis a Numero croissant. */
$('toutAfficher').onclick=()=>{fTy='';fCartes.sel.clear();fCartes.mode='ou';$('rechCarte').value='';fTri='';triDesc=false;maj()};
GALERIE.forEach(c=>{
  const b=document.createElement('button');b.className='carte';b.dataset.id=c[0];b.dataset.q=cleRech(c);b.setAttribute('aria-label',[numeroAffiche(c[0]),c[1]].filter(Boolean).join(', '));
  const i=document.createElement('img');i.src=imgV('cartes/'+c[0]+'.jpg');i.alt=c[1];i.loading='lazy';i.width=600;i.height=840;
  b.append(i);b.onclick=()=>{dernier=b;zoom(i.src,c[1],[...statZoomCarte(c[0]),boutonLienCarte(idLienCarte(c[0]))])};
  const num=c[0].slice(0,3);let p=$('grille').querySelector('[data-paire="'+num+'"]');
  if(!p){p=el('div','paire');p.dataset.paire=num;$('grille').append(p)}
  p.append(b);
});
/* 0.4a : valeur annoncee d'un terrain hors partie ; Le Tournoi (« ? » sur la carte) varie avec la manche. */
const ptsAnnonce=T=>effetTerrain(T,'pointsManche')?'? (1 à 3 points selon la manche)':T.pts+(T.pts>1?' points':' point');
function tuilesTerrains(){
  if($('grille').querySelector('[data-terrain]'))return;
  window.GolemsMoteur.TERRAINS.forEach(T=>{
    const b=document.createElement('button'),i=document.createElement('img');b.className='carte';b.dataset.terrain=T.nom;b.dataset.q=sansAccent(T.nom);b.setAttribute('aria-label',T.nom+', '+ptsAnnonce(T));
    i.src=srcTerrain(T);i.alt=T.nom+'. '+T.texte;i.loading='lazy';i.width=600;i.height=840;b.append(i);b.onclick=()=>{ouvreTerrainGalerie(T);dernier=b};$('grille').append(b);
  });
}
function carteAVenir(num,nom){
  const c=el('div','c-avenir');c.append(el('span','n',numeroAffiche(num)),el('span','q','?'),el('span','m',nom),el('span','v','À venir'));return c;
}
function tuilesAVenir(){
  if($('grille').querySelector('[data-avenir]'))return;
  A_VENIR.forEach(([num,nom])=>{
    const b=el('button','carte');b.type='button';b.dataset.avenir=num;b.dataset.q=sansAccent(nom);b.setAttribute('aria-label',nom+', à venir');b.append(carteAVenir(num,nom));
    b.onclick=()=>{
      cacheApercu();dernier=b;zoom('',nom,[el('p','',nom+" n'a pas encore sa carte. Elle arrivera bientôt.")]);
      const v=$('vueTerrain');v.textContent='';v.append(carteAVenir(num,nom));$('vueImg').hidden=$('vueBoite').hidden=true;v.hidden=false;
    };
    $('grille').append(b);
  });
}
function maj(){
  ecrireJ('golems.filtres.cartes',{ty:fTy,sel:[...fCartes.sel],mode:fCartes.mode,tri:fTri,desc:triDesc}); /* filtres et tris memorises sur l'appareil */
  const ter=fTy==='t',av=fTy==='v',offEl=ter||av||fTy==='a',q=$('rechCarte').value;if(ter){fEl='';tuilesTerrains()}
  if(av){fEl='';tuilesAVenir()}
  let n=0;const vu=(b,ok)=>{ok=ok&&passeRech(b.dataset.q,q);b.hidden=!ok;if(ok)n++};
  $('grille').querySelectorAll('[data-avenir]').forEach(b=>vu(b,av));
  peintEls(ligneElC,fCartes,offEl);
  $('grille').querySelectorAll('[data-terrain]').forEach(b=>vu(b,ter));
  ['filtreType'].forEach(id=>{const box=$(id);box.querySelectorAll('button').forEach(b=>b.setAttribute('aria-pressed',b.dataset.v===box._get()))});
  GALERIE.forEach(c=>vu($('grille').querySelector('[data-id="'+c[0]+'"]'),!ter&&!av&&(offEl||passeEl(c,fCartes))&&(fTy===''||String(c[3])===fTy)));
  trie();
  $('grille').querySelectorAll('.paire').forEach(p=>{p.hidden=![...p.children].some(b=>!b.hidden)});
  $('grille').classList.toggle('groupee',fTy===''&&!fTri);
  $('nbCartes').textContent=n+(n>1?' cartes':' carte');
  $('vide').textContent=fTy==='a'&&!q.trim()?MSG_ANIMAUX:offEl?'Aucune carte pour ce filtre.':msgVide(fCartes);$('vide').hidden=n>0;
}
maj();
/* calque : éléments redessinés par-dessus l'image (badgeSurcout, badgeForce), repère 750 x 1050 de la carte */
function zoom(src,alt,detail,calque){
  $('vueGrand').classList.remove('zt-bac');
  $('vueImg').hidden=$('vueBoite').hidden=false;$('vueTerrain').hidden=true;$('vueImg').src=src;$('vueImg').alt=alt;
  const q=$('vueCalque');q.textContent='';if(calque)q.append(...calque);
  const d=$('vueDetail'),vu=!!detail&&detail.some(x=>!x.hidden);d.textContent='';d.hidden=!vu;$('vueGrand').classList.toggle('avecDetail',vu);if(detail)d.append(...detail);
  $('vue').hidden=false;$('fermer').focus({preventScroll:true});$('vue').scrollTop=0;
}
$('tasFermer').onclick=()=>{$('vueTas').hidden=true};
$('vueTas').onclick=e=>{if(e.target===$('vueTas'))$('vueTas').hidden=true};
function fermeVue(){$('vue').hidden=true;retireCarteLien();if(dernier)dernier.focus()}
/* Lien direct vers une carte (0.5) : https://les-golems.github.io/?carte=G-004 (base), G-004e (evolution), A-001 (animal),
   T-la-boutique (terrain : pas de numero affiche, nom sans accents). Golems et animaux : numero affiche (stable), pas le code interne ;
   casse et tiret indifferents a la lecture. Lien invalide : onglet Cartes seul. */
const idLienCarte=id=>numeroAffiche(id).replace(' ★','e');
const idLienTerrain=T=>'T-'+sansAccent(T.nom).replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'');
function lienCarte(k){return 'https://les-golems.github.io/'+(ESSAI?'essai/':'')+'?carte='+k}
function carteDeLien(v){const k=String(v||'').trim().toUpperCase().replace(/^([GAT])-?/,'$1-');
  if(k.startsWith('T-')){const T=window.GolemsMoteur.TERRAINS.find(T=>idLienTerrain(T).toUpperCase()===k);return T?{T}:null}
  const c=CARTES.find(c=>idLienCarte(c[0]).toUpperCase()===k);return c?{id:c[0]}:null}
function ouvreTerrainGalerie(T){cacheApercu();dernier=null;zoom(srcTerrain(T),T.nom+'. '+T.texte,[...statZoomTerrain(T),boutonLienCarte(idLienTerrain(T))])}
function retireCarteLien(){try{const u=new URL(location.href);if(!u.searchParams.has('carte'))return;u.searchParams.delete('carte');history.replaceState(history.state,'',u.pathname+u.search+u.hash)}catch(e){}}
function boutonLienCarte(id){const b=el('button','btn sec btnLienCarte','Copier le lien');b.type='button';b.onclick=()=>copie(lienCarte(id),b,'Copier le lien',null);return b}
/* Filtres et tris memorises : retablis au chargement. */
{const m=lireJ('golems.filtres.cartes');if(m){if(TY.some(x=>x[0]===m.ty))fTy=m.ty;if(Array.isArray(m.sel))m.sel.filter(e=>ELS.includes(e)).forEach(e=>fCartes.sel.add(e));
  if(MODES_EL.some(x=>x[0]===m.mode))fCartes.mode=m.mode;if(TRI.some(x=>x[0]===m.tri))fTri=m.tri;triDesc=m.desc===true}}
$('fermer').onclick=fermeVue;
$('vue').onclick=e=>{if(e.target===$('vue'))fermeVue()};
addEventListener('keydown',e=>{if(e.key!=='Escape')return;if(!$('aide').hidden)fermeAide();else if(!$('vue').hidden)fermeVue();else $('vueTas').hidden=true});

