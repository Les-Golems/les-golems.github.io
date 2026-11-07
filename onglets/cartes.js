/* Onglet Cartes : liste CARTES, filtres, tri, galerie, zoom d'une carte, liens directs ?carte=. */
/* Cartes */
const CARTES=[
 ['001','KaTarN, Romain 18 ans',['magma','foudre'],0],['001e','KaTarN, Slim K',['magma','foudre'],1],
 ['002','Alrevan, Le High Roller Originel',['brume','roche'],0],['002e','Alrevan, KEKWRevan',['brume','roche'],1],
 ['003','Cyrdan, Le Champion des Tournois Annexes',['cristal','roche'],0],['003e','Cyrdan, Le Roi du Karaoké',['cristal','roche'],1],
 ['004','Le Q, Ragebaiter',['brume','magma'],0],['004e','Le Q, Seul contre tous',['brume','magma'],1],
 ['007','Trigas, Accro au Gacha',['foudre','brume'],0],['007e','Trigas, Le Roi du Mobile',['foudre','brume'],1],
 ['008','K-Chan, Reine du tilt',['magma','cristal'],0],['008e',"K-Chan, L'attachiante",['magma','cristal'],1],
 ['013','Indra, La Groupie',['cristal','magma'],0],['013e','Indra, La Fan enflammée',['cristal','magma'],1],
 ['009','Glad, /Poll',['roche','magma'],0],['009e','Glad, GymRat',['roche','magma'],1],
 ['029','Apo, Clown junior',['magma','roche'],0],['029e','Apo, Maître du déguisement',['magma','roche'],1],
 ['037','SuperFishman, Elosit Master',['roche','cristal'],0],['037e','SuperFishman, Monsieur Poisson',['roche','cristal'],1],
 ['026','Titom76, Le Breton',['brume','foudre'],0],['026e','Titom76, Maître du bilig',['brume','foudre'],1],
 ['036','Spom, Innocent ordinaire',['foudre','magma'],0],['036e','Spom, A encore menti',['foudre','magma'],1],
 ['018',"Elessar, Le p'tit jeune du Discord",['roche','foudre'],0],['018e','Elessar, Le pomplard',['roche','foudre'],1],
 ['041','Velnen, Spécialiste du potager',['roche','brume'],0],['041e','Velnen, Le chansonnier',['roche','brume'],1],
 ['025','Shifukuro, Le chatteur',['roche','cristal'],0],['025e','Shifukuro, Le modérateur',['roche','cristal'],1],
 ['015','Bellock, La terreur du PBE',['brume','magma'],0],['015e','Bellock, Aiges Captain',['brume','magma'],1],
 ['016',"Loxim, Le roi de l'impro",['brume','magma'],0],['016e','Loxim, Le Ace de Aiges',['brume','magma'],1],
 ['035',"JackJoy, Viewer de l'ombre",['foudre','cristal'],0],['035e','JackJoy, Drafteur expérimenté',['foudre','cristal'],1],
 ['042','Vic222, Lurker du discord',['cristal','roche'],0],['042e','Vic222, Baby gamer',['cristal','roche'],1],
 ['020','GénéralBrioche, Le pas sûr de lui',['cristal','roche'],0],['020e','GénéralBrioche, Le civ player',['cristal','roche'],1],
 ['901','Kiwi, Le lapin de Titom76',[],'a'],['902','Jacen et Jaina, Les chats de KaTarN',[],'a']];
/* 4e champ d'une carte : 0 = base, 1 = évolution, 'a' = animal de compagnie (ex. ['041','Kiwi',['brume'],'a']). */
const estAnimal=c=>c[3]==='a';
/* Couleur du sous-titre : premier element ; animal = vert clair --animal-titre (#effed9, d'apres le sous-titre de 901 et 902) ; sinon or. */
const coulT=c=>c[2][0]?'var(--'+c[2][0]+')':estAnimal(c)?'var(--animal-titre)':'var(--or)';
/* Aperçus : visibles dans la galerie, absents du moteur, des decks et de l'éditeur. */
const APERCUS=[],GALERIE=[...CARTES,...APERCUS];
/* Numéro AFFICHÉ des Golems (ordre où ils deviennent jouables) : code interne -> numéro. Les codes internes ne changent jamais.
   Golem à venir : absent de la table, aucun numéro affiché. Prochain jouable : 18. */
const NUMERO_AFFICHE={'001':1,'002':2,'003':3,'004':4,'007':5,'008':6,'013':7,'009':8,'029':9,'037':10,'026':11,'036':12,'018':13,'041':14,'025':15,'015':16,'016':17,'035':18,'042':19,'020':20};
/* Animaux de compagnie : numero affiche A-0NN, table a part (codes internes 9xx). */
const NUMERO_ANIMAL={'901':11,'902':1};
const numeroAffiche=id=>{if(NUMERO_ANIMAL[id])return 'A-'+String(NUMERO_ANIMAL[id]).padStart(3,'0');const n=NUMERO_AFFICHE[String(id).slice(0,3)];return n?'G-'+String(n).padStart(3,'0')+(String(id).endsWith('e')?' ★':''):''};
const EL=[['','Tous'],['magma','Magma'],['cristal','Cristal'],['foudre','Foudre'],['brume','Brume'],['roche','Roche']];
const TY=[['','Toutes'],['0','Base'],['1','Évolution'],['a','Animaux'],['t','Terrains']]; /* 0.4 : bouton « À venir » retiré des filtres (tuiles et logique gardées) */
const MSG_ANIMAUX="Aucun animal de compagnie pour l'instant.";
/* Cartes à venir, hors moteur : retirer la ligne d'un membre quand sa carte arrive, les numéros restent fixes. */
const A_VENIR=[
 ['005','Driscop'],['006','Falys'],['010','Orotembu'],
 ['011','Sleepy'],['012','Simon'],['014','Boubou'],
 ['017','Letran'],['019','Victone'],['021','Elccino'],['022','Shantiruka'],
 ['023','Kun_Mamba'],['024','MrTitou'],['027','Merser'],['028','Nadzu'],
 ['030','Cyd'],['031','Obsess'],['032','Marech'],['033','Greeny'],['034','Harentros'],
 ['038','TortueGourmande'],['039','TortueVéloce'],['040','PoulpeHome']];
let fEl='',fTy='',dernier=null;
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
const passeEl=(c,f)=>!f.sel.size||c[2].length>0&&(f.mode==='et'?[...f.sel].every(x=>c[2].includes(x)):f.mode==='seul'?c[2].every(x=>f.sel.has(x)):c[2].some(x=>f.sel.has(x)));
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
/* Force au de : moyenne reelle des lancers (forceMoy), sinon theorique (Alrevan 3,5 ; KEKWRevan 6,4). */
const FORCE_TRI={'002':3.5,'002e':6.4};
const valTri=(id,k)=>{const C=window.GolemsMoteur.CARTES[id];if(!C)return 99;return k==='force'?(C.force==null?forceMoy(id)??0:C.force):C.cout}; /* animal : ni Force ni de, trie a 0 */
/* Moyenne reelle : forces tirees (champ dr des resumes deja charges pour les Statistiques), par code, 1 decimale ;
   theorique tant qu'un code a moins de 30 lancers ou sans donnees (invite, hors ligne). Aucune lecture ni ecriture en plus. */
let forceMoySrc=null,forceMoyVal={};
function forceMoy(id){
  if(!(id in FORCE_TRI))return null;
  let L=null;try{L=statsData}catch(e){} /* statsData est declare plus bas */
  if(L!==forceMoySrc){forceMoySrc=L;forceMoyVal={};const t={};
    (Array.isArray(L)?L:[]).forEach(r=>{const d=r&&r.dr;if(!d||typeof d!=='object')return;
      for(const k in FORCE_TRI)if(Array.isArray(d[k]))d[k].forEach(f=>{f=+f;if(Number.isInteger(f)&&f>=1&&f<=12){const x=t[k]=t[k]||{n:0,s:0};x.n++;x.s+=f}})});
    for(const k in t)if(t[k].n>=30)forceMoyVal[k]=Math.round(10*t[k].s/t[k].n)/10}
  return forceMoyVal[id]??FORCE_TRI[id];
}
function trie(){
  const g=$('grille');
  if(!fTri){const ps=[...g.querySelectorAll('.paire')];if(triDesc)ps.reverse();ps.forEach(p=>g.append(p));
    const ord=GALERIE.map(c=>c[0]);if(triDesc)ord.reverse();ord.forEach(id=>g.querySelector('[data-paire="'+id.slice(0,3)+'"]').append(g.querySelector('[data-id="'+id+'"]')))}
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
const ptsAnnonce=T=>T.nom==='Le Tournoi'?'? (1 à 3 points selon la manche)':T.pts+(T.pts>1?' points':' point');
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
$('fermer').onclick=fermeVue;
$('vue').onclick=e=>{if(e.target===$('vue'))fermeVue()};
addEventListener('keydown',e=>{if(e.key!=='Escape')return;if(!$('aide').hidden)fermeAide();else if(!$('vue').hidden)fermeVue();else $('vueTas').hidden=true});

