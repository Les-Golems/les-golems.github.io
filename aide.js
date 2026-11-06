/* Aide 0.4 : infobulles des mots-cles (variante A) et sommaire + recherche de l'onglet Regles (variante A).
   Mots-cles reperes dans les textes affiches en texte : Regles, fenetre « Details » des Nouveautes, panneau de detail du zoom
   (texte de la carte ajoute en tete), journal de partie, encart Detail du bac a sable. Jamais sur les images, jamais dans un nom
   de carte, de terrain ou de capacite, jamais dans un bouton, un lien ou un titre. */
(function(){
'use strict';
const $=i=>document.getElementById(i);
const h=(t,c,x)=>{const e=document.createElement(t);if(c)e.className=c;if(x!=null)e.textContent=x;return e};

/* ===== Definitions (validees par Romain ; ne pas modifier sans son accord) ===== */
const MC={
  forge:{t:'Forge',d:'Au début de ton tour, juste après la pioche, tu peux placer 1 carte de ta main face cachée dans ta Forge, pour toute la partie. Chaque carte de ta Forge te donne 1 énergie par tour, dès ce tour. Certaines cartes permettent de forger autrement (Spom, Trigas).',va:['energie']},
  energie:{t:'Énergie',d:'Elle sert à poser, remplacer et améliorer tes Golems. Elle vient de ta Forge et de certains effets (Maître du bilig), et ce qui reste à la fin de ton tour est perdu.',va:['forge']},
  voisin:{t:'Voisin',d:'Un Golem allié sur une case adjacente à la tienne (en haut, en bas, à gauche ou à droite, hors diagonale). Un animal n\'est jamais un voisin.',va:['trait']},
  enface:{t:'En face',d:'Le Golem adverse sur le même terrain et la même ligne que le tien.',va:['domine','cercle']},
  taligne:{t:'Ta ligne / ton terrain',d:'Ta ligne, ce sont les 3 cases d\'une même rangée de ta grille. Ton terrain, ce sont les 3 cases de ta colonne sous ce terrain.',va:['enface','voisin']},
  domine:{t:'Domine',d:'Chaque élément en domine un autre : Magma domine Cristal, qui domine Foudre, qui domine Brume, qui domine Roche, qui domine Magma.',va:['cercle']},
  cercle:{t:'Cercle',d:'+1 de Force si un de tes éléments domine un élément du Golem en face. Jamais plus de +1, sauf si une carte le dit (+2 avec SuperFishman, Monsieur Poisson, ou pour les alliés du terrain de Vic222).',cercle:1,va:['domine','enface']},
  trait:{t:'Trait',d:'Pour chacun de tes 2 éléments, tu gagnes +1 de Force par voisin qui a aussi cet élément, sans plafond. Si tu perds un voisin, tu perds aussitôt ce bonus.',va:['voisin']},
  degats:{t:'Dégâts',d:'Perdre de la Force, c\'est subir des dégâts. Ils restent d\'une manche à l\'autre et ne disparaissent que si le Golem est amélioré ou soigné par un effet (L\'attachiante).',va:['detruit']},
  detruit:{t:'Détruit',d:'À 0 de Force ou moins, ton Golem va aussitôt à la défausse, et tous ceux qui tombent à 0 partent en même temps. Il perd tout ce qu\'il portait, et son animal va aussi à la défausse. Ses voisins perdent le bonus qu\'il leur donnait.',va:['degats','defausse']},
  ameliorer:{t:'Améliorer / Évolution',d:'Améliorer, c\'est poser l\'évolution sur sa version de base en payant son coût. La base va à la défausse et ses dégâts sont effacés. L\'évolution a sa propre Force et son propre effet, mais garde le favori, l\'animal et les bonus reçus (Sub offert, Draft diff).',va:['remplacer']},
  remplacer:{t:'Remplacer',d:'Tu poses une nouvelle carte sur un de tes propres Golems en payant son coût, et l\'ancien va à la défausse. Ce n\'est pas une destruction.',va:['defausse','ameliorer']},
  decompte:{t:'Décompte',d:'À la fin de chaque manche, on additionne la Force de tes Golems dans chaque colonne. Le plus fort remporte le terrain et marque ses points. En cas d\'égalité, personne ne marque.',va:['taligne']},
  animal:{t:'Animal de compagnie / Maître',d:'Un animal n\'est pas un Golem : il n\'a ni Force ni élément, il compte 0 et se pose sur une case libre à côté de son maître. Il ne peut être ni déplacé ni recouvert, et il part à la défausse quand son maître quitte le jeu.',va:['detruit']},
  favori:{t:'Favori',d:'Le Golem allié que tu choisis à la pose d\'Indra. Il gagne +1 de Force tant qu\'Indra est en jeu (+2 avec La Fan enflammée), et il le reste si l\'un des deux est amélioré.',va:['ameliorer']},
  defausse:{t:'Défausse',d:'La pile des cartes qui quittent le jeu : Golems détruits ou remplacés, base d\'un Golem amélioré, animal qui part, cartes défaussées de ta main. Une carte en défausse ne revient jamais en jeu.',va:['detruit','remplacer']}
};
/* Formes reconnues (mot entier, sans tenir compte de la casse) : pluriels et formes conjuguees */
const FORMES={
  animal:'animaux de compagnie|animal de compagnie|animaux|animal|maîtres?',
  enface:'en face',
  taligne:'(?:ta|sa) ligne(?! d[\'’])|(?:ton|son) terrain',
  forge:'forg(?:e|es|er|ez|ent|eons|eant|é|ée|és|ées|era|eras|erai)',
  energie:'énergies?',
  voisin:'voisin(?:e|es|s)?',
  domine:'domin(?:e|es|ent|er|ez|é|ée|és|ées|ant|ation|ations)',
  cercle:'cercles?',
  trait:'traits?',
  degats:'dégâts?',
  detruit:'détrui(?:t|te|ts|tes|re|s|sent|sez|sait)|destructions?',
  ameliorer:'amélior(?:e|es|ent|er|ez|é|ée|és|ées|ation|ations)|évolutions?|évolu(?:e|es|ent|er|é|ée|és|ées)',
  remplacer:'rempla(?:ce|ces|cent|cer|cez|cé|cée|cés|cées|cement|cements|çant)',
  decompte:'décomptes?',
  favori:'favori(?:s|te|tes)?',
  defausse:'défauss(?:e|es|ent|er|ez|é|ée|és|ées)'
};
const CLES=Object.keys(FORMES);
const RE_MOTS=new RegExp('(?<![\\p{L}\\p{N}-])(?:'+CLES.map(k=>'('+FORMES[k]+')').join('|')+')(?![\\p{L}\\p{N}-])','giu');

/* Noms proteges : cartes, terrains, capacites (texte avant « : » d'une carte ou d'un terrain) */
let RE_NOMS=null;
function nomsProteges(){
  if(RE_NOMS)return RE_NOMS;
  const G=window.GolemsMoteur,S=new Set();
  if(G){Object.values(G.CARTES||{}).forEach(C=>{if(C.nom)S.add(C.nom);const i=(C.texte||'').indexOf(' :');if(i>0)S.add(C.texte.slice(0,i))});
    (G.TERRAINS||[]).forEach(T=>{if(T.nom)S.add(T.nom);const i=(T.texte||'').indexOf(' :');if(i>0&&i<40)S.add(T.texte.slice(0,i))})}
  const L=[...S].filter(n=>n&&n.length>1).sort((a,b)=>b.length-a.length).map(n=>n.replace(/[.*+?^${}()|[\]\\]/g,'\\$&'));
  RE_NOMS=L.length?new RegExp('(?<![\\p{L}\\p{N}])(?:'+L.join('|')+')(?![\\p{L}\\p{N}])','gu'):/$^/g;
  return RE_NOMS;
}

/* ===== Reperage des mots-cles dans un bloc ===== */
const SAUTE='button,a,summary,h1,h2,h3,h4,h5,h6,.mc,.ib,figure,.etapes,input,textarea,select,label,time,mark,.aide-nom,.el-mot,script,style';
function decore(racine){
  if(!racine)return;
  const w=document.createTreeWalker(racine,NodeFilter.SHOW_TEXT,{acceptNode:n=>{const p=n.parentElement;return p&&!p.closest(SAUTE)&&n.nodeValue.trim()?1:2}}),l=[];
  while(w.nextNode())l.push(w.currentNode);
  const RN=nomsProteges();
  l.forEach(n=>{
    const s=n.nodeValue;RE_MOTS.lastIndex=0;if(!RE_MOTS.test(s))return;
    const prot=[];let m;RN.lastIndex=0;while((m=RN.exec(s))){prot.push([m.index,m.index+m[0].length]);if(!m[0].length)RN.lastIndex++}
    const f=document.createDocumentFragment();let i=0,fait=0;RE_MOTS.lastIndex=0;
    while((m=RE_MOTS.exec(s))){
      const a=m.index,b=a+m[0].length;if(prot.some(([x,y])=>a<y&&b>x))continue;
      const k=CLES[m.slice(1).findIndex(Boolean)];
      f.append(s.slice(i,a));const sp=h('span','mc',m[0]);sp.dataset.mc=k;sp.tabIndex=0;sp.setAttribute('role','button');sp.setAttribute('aria-haspopup','dialog');
      f.append(sp);i=b;fait++;
    }
    if(!fait)return;f.append(s.slice(i));n.replaceWith(f);
  });
}

/* ===== Bulle ===== */
const tactile=matchMedia('(hover:none)');
const ib=h('div','ib');ib.hidden=true;ib.setAttribute('role','dialog');ib.setAttribute('aria-live','polite');
let mot=null,pile=[];
function cercleHtml(){const p=h('p','ib-cercle');[['Magma','m'],['Cristal','c'],['Foudre','f'],['Brume','b'],['Roche','r'],['Magma','m']].forEach(([n,k],i)=>{if(i)p.append(' > ');p.append(h('span','el-'+k,n))});return p}
function remplit(){
  const k=pile[pile.length-1],m=MC[k],prec=pile.length>1?MC[pile[pile.length-2]]:null;ib.textContent='';
  if(prec){const r=h('button','ib-ret','< Retour : '+prec.t);r.type='button';r.onclick=()=>{pile.pop();remplit();place(true)};ib.append(r)}
  const t=h('h4','',m.t);t.id='ibTitre';ib.setAttribute('aria-labelledby','ibTitre');ib.append(t,h('p','ib-def',m.d));
  if(m.cercle)ib.append(cercleHtml());
  const va=h('p','ib-va','Voir aussi : ');m.va.forEach((x,i)=>{if(i)va.append(', ');const b=h('button','ib-lien',MC[x].t);b.type='button';b.onclick=()=>{pile.push(x);remplit();place(true)};va.append(b)});
  ib.append(va);
}
function parentDefile(e){
  for(let p=e.parentElement;p&&p!==document.body;p=p.parentElement){const o=getComputedStyle(p).overflowY;if(o==='auto'||o==='scroll')return p}
  return document.scrollingElement||document.documentElement;
}
/* Marge temporaire en bas du bloc qui defile, pour pouvoir remonter un paragraphe place tout en bas (rendue a la fermeture). */
let marge=null;
function rendMarge(){if(marge){marge.el.style.paddingBottom=marge.avant;marge=null}}
/* Sous le paragraphe entier, fleche vers le mot, jamais sur le texte ; si la bulle ne tient pas dessous, on fait defiler
   (avec une marge si besoin) ; au-dessus seulement en dernier recours. */
function place(defile){
  if(!mot||ib.hidden)return;
  if(!mot.isConnected){ferme();return}
  const bloc=mot.closest('p,li,.lg,.p-lignes>div,div')||mot,M=12,w=ib.offsetWidth,hh=ib.offsetHeight;
  /* Paragraphe du mot : le bloc sans ses sous-listes (une puce qui contient une liste imbriquee) */
  const sousBloc=[...bloc.children].find(c=>/^(UL|OL|DIV|P|TABLE)$/.test(c.tagName)&&!c.contains(mot)&&c.compareDocumentPosition(mot)&Node.DOCUMENT_POSITION_PRECEDING);
  const rect=()=>{if(!sousBloc)return bloc.getBoundingClientRect();const g=document.createRange();g.setStartBefore(bloc.firstChild);g.setEndBefore(sousBloc);return g.getBoundingClientRect()};
  let r=mot.getBoundingClientRect(),p=rect();
  const manque=()=>p.bottom+10+hh-(innerHeight-M);
  if(defile&&manque()>0){
    const sp=parentDefile(bloc),cible=sp===document.scrollingElement||sp===document.documentElement?document.body:sp;
    const lim=()=>Math.max(0,p.top-M-60),fais=()=>{const d=Math.min(manque(),lim());if(d>0){sp.scrollTop+=d;r=mot.getBoundingClientRect();p=bloc.getBoundingClientRect()}};
    fais();
    if(manque()>0&&lim()>0&&!marge){marge={el:cible,avant:cible.style.paddingBottom};cible.style.paddingBottom=(hh+40)+'px';r=mot.getBoundingClientRect();p=rect();fais()}
  }
  let x=Math.min(Math.max(M,r.left+r.width/2-w/2),innerWidth-w-M),y,dessous=true;
  if(manque()<=0||p.top-10-hh<M)y=p.bottom+10;else{y=p.top-10-hh;dessous=false}
  ib.style.left=x+'px';ib.style.top=y+'px';ib.style.setProperty('--fl',Math.min(Math.max(14,r.left+r.width/2-x),w-14)+'px');
  ib.classList.toggle('dessous',dessous);ib.classList.toggle('dessus',!dessous);
}
function ouvre(m){
  document.querySelectorAll('.mc.actif').forEach(x=>x.classList.remove('actif'));
  mot=m;m.classList.add('actif');m.setAttribute('aria-expanded','true');pile=[m.dataset.mc];
  if(!ib.isConnected)document.body.append(ib);
  rendMarge();ib.hidden=false;remplit();place(true);
}
function ferme(){clearTimeout(tOuvre);clearTimeout(tFerme);epingle=false;ib.hidden=true;rendMarge();if(mot){mot.classList.remove('actif');mot.removeAttribute('aria-expanded')}mot=null}
window.golemsAide={ouvre,ferme,decore,MC};

/* Ordinateur : survol du mot 300 ms -> bulle ; elle se ferme quand la souris quitte le mot et la bulle (le passage du mot a la bulle
   ne la ferme pas, « Voir aussi » reste cliquable). Clic sur le mot (ou dans la bulle) : bulle epinglee, fermee par un clic ailleurs ou Echap.
   Telephone : toucher le mot ouvre, toucher ailleurs ferme. */
let epingle=false,tOuvre=0,tFerme=0;
const basculeClic=m=>{if(mot===m&&!ib.hidden){if(epingle||tactile.matches)ferme();else epingle=true}else{ouvre(m);epingle=true}};
document.addEventListener('click',e=>{
  const m=e.target.closest&&e.target.closest('.mc');
  if(m){e.preventDefault();e.stopPropagation();clearTimeout(tOuvre);clearTimeout(tFerme);basculeClic(m);return}
  if(ib.hidden)return;
  if(ib.contains(e.target)){epingle=true;clearTimeout(tFerme);return}
  ferme();
},true);
document.addEventListener('keydown',e=>{
  const m=e.target.closest&&e.target.closest('.mc');
  if(m&&(e.key==='Enter'||e.key===' ')){e.preventDefault();e.stopPropagation();basculeClic(m)}
},true);
addEventListener('keydown',e=>{if(e.key==='Escape'&&!ib.hidden){e.stopPropagation();const m=mot;ferme();m&&m.focus&&m.focus({preventScroll:true})}},true);
const dansZone=n=>n&&n.nodeType===1&&(ib.contains(n)||(mot&&mot.contains(n)));
document.addEventListener('mouseover',e=>{
  if(tactile.matches)return;
  if(dansZone(e.target)){clearTimeout(tFerme);return}
  const m=e.target.closest&&e.target.closest('.mc');
  clearTimeout(tOuvre);
  if(m&&!epingle)tOuvre=setTimeout(()=>{if(m.isConnected&&m.matches(':hover'))ouvre(m)},300);
});
document.addEventListener('mouseout',e=>{
  if(tactile.matches||epingle||ib.hidden)return;
  const m=e.target.closest&&e.target.closest('.mc');
  if(m&&!mot)clearTimeout(tOuvre);
  if(!dansZone(e.target)||dansZone(e.relatedTarget))return;
  clearTimeout(tFerme);tFerme=setTimeout(()=>{if(!epingle&&!ib.matches(':hover')&&!(mot&&mot.matches(':hover')))ferme()},200);
});
addEventListener('scroll',()=>{if(!ib.hidden)place()},true);
addEventListener('resize',()=>{if(!ib.hidden)place()});

/* ===== Texte de la carte en tete du panneau de detail (zoom) ===== */
const NOMS_EL={magma:'Magma',cristal:'Cristal',foudre:'Foudre',brume:'Brume',roche:'Roche'};
function texteCarte(){
  const d=$('vueDetail'),img=$('vueImg'),G=window.GolemsMoteur;
  if(window.golemsAide&&window.golemsAide.sansTexteCarte)return; /* reglage de comparaison (captures avant/apres) */
  if(!d||!img||!G||d.querySelector('.aide-carte')||!$('vue')||$('vue').hidden)return;
  if($('vueTerrain')&&!$('vueTerrain').hidden)return;
  /* alt = nom, ou « nom, sous-titre » dans l'onglet Cartes */
  const alt=img.alt||'',C=Object.values(G.CARTES).filter(c=>c.nom&&(alt===c.nom||alt.startsWith(c.nom+', '))).sort((a,b)=>b.nom.length-a.nom.length)[0];
  if(!C||C.animal||!C.texte)return;
  const s=h('section','aide-carte'),sous=[],st=alt.slice(C.nom.length+2).trim();
  if(st)sous.push(st);
  if(C.base&&G.CARTES[C.base])sous.push('Évolution de '+G.CARTES[C.base].nom);
  if(C.el&&C.el.length)sous.push(C.el.map(e=>NOMS_EL[e]||e).join(', '));
  sous.push('coût '+C.cout);sous.push(C.force==null?'Force au dé':'Force '+C.force);
  const t=h('p','aide-txt'),i=C.texte.indexOf(' :');
  if(i>0){t.append(h('b','',C.texte.slice(0,i)+' :'),C.texte.slice(i+2))}else t.append(C.texte);
  s.append(h('h3','aide-nom',C.nom),h('p','aide-sous',sous.join(' · ')),t);
  d.prepend(s);
  /* Panneau cache (pas de statistiques, invite) : on l'affiche pour le texte de la carte */
  if(d.hidden){d.hidden=false;$('vueGrand')&&$('vueGrand').classList.add('avecDetail')}
}

/* ===== Surveillance : blocs reconstruits par le site ===== */
const BLOCS='#vueDetail:not([hidden]),#popDetailsVersion .dv-corps,.p-lignes,.bac-det';
let prevu=0;
function balaye(){prevu=0;texteCarte();document.querySelectorAll(BLOCS).forEach(decore);if(mot&&!mot.isConnected)ferme()}
new MutationObserver(()=>{if(!prevu)prevu=requestAnimationFrame(balaye)}).observe(document.body,{childList:true,subtree:true,attributes:true,attributeFilter:['hidden']});

/* ===== Onglet Regles : bandeau collant, recherche, pastilles des sections ===== */
function regles(){
  const R=$('regles');if(!R)return;
  const intro=R.querySelector('.intro'),cols=R.querySelector('.colonnes');if(!intro||!cols)return;
  R.querySelectorAll('.corps').forEach(decore);
  const dets=[...R.querySelectorAll('details')];
  let ouvertes=null;
  const passages=d=>[...d.querySelectorAll(':scope>.corps>ul>li,:scope>.corps>ol>li,:scope>.corps>p,:scope>.corps>figure,:scope>.corps>div,:scope>.corps>table')];
  const norm=s=>[...s].map(c=>c.normalize('NFD').replace(/\p{M}/gu,'').toLowerCase()[0]||c).join('');
  /* Meme champ que les onglets Cartes et Decks : ligne de filtre (filtres f-ligne), libelle « Rechercher » (f-lib), champ f-rech */
  const champ=h('div','filtres f-ligne rg-ligne'),lib=h('label','f-lib','Rechercher'),inp=h('input','f-rech');
  inp.id='rechRegles';lib.htmlFor='rechRegles';inp.type='search';inp.placeholder='Mot ou expression';inp.autocomplete='off';
  const compte=h('span','rg-compte');compte.setAttribute('role','status');compte.hidden=true;champ.append(lib,inp,compte);
  const vide=h('p','rg-vide','Aucune règle ne contient ce mot.');vide.hidden=true;cols.before(vide);
  const barre=h('div','rg-barre'),gauche=h('div','rg-gauche'),pas=h('div','rg-pastilles');pas.setAttribute('role','navigation');pas.setAttribute('aria-label','Sections des règles');
  const boutons=dets.map(d=>{const b=h('button','rg-pas');b.type='button';b.append(d.querySelector('h3').textContent);b.onclick=()=>va(d);pas.append(b);return b});
  gauche.append(champ);barre.append(gauche,pas);intro.after(barre);
  function hauteurs(){const nav=document.querySelector('nav'),nh=nav&&getComputedStyle(nav).position==='sticky'?nav.offsetHeight:0;
    document.documentElement.style.setProperty('--rgNav',nh+'px');document.documentElement.style.setProperty('--rgHaut',(nh+barre.offsetHeight)+'px')}
  function va(d){if(d.hidden)return;hauteurs();d.open=true;d.scrollIntoView({block:'start'})}
  addEventListener('resize',hauteurs);
  function nettoie(){R.querySelectorAll('mark.rg-sur').forEach(m=>m.replaceWith(...m.childNodes));R.normalize()}
  function surligne(el,n){
    const w=document.createTreeWalker(el,NodeFilter.SHOW_TEXT),l=[];while(w.nextNode())l.push(w.currentNode);
    l.forEach(t=>{const s=t.nodeValue,ns=norm(s);let i=ns.indexOf(n);if(i<0)return;const f=document.createDocumentFragment();let j=0;
      while(i>=0){f.append(s.slice(j,i));f.append(h('mark','rg-sur',s.slice(i,i+n.length)));j=i+n.length;i=ns.indexOf(n,j)}f.append(s.slice(j));t.replaceWith(f)});
  }
  function filtre(){
    if(!ib.hidden)ferme();
    nettoie();const n=norm(inp.value.trim().replace(/\s+/g,' '));let tot=0,sec=0;
    if(n&&!ouvertes)ouvertes=dets.map(d=>d.open);
    dets.forEach((d,k)=>{
      let c=0;
      passages(d).forEach(p=>{const ok=!n||norm(p.textContent.replace(/\s+/g,' ')).includes(n);p.hidden=!ok;if(ok&&n){c++;surligne(p,n)}});
      d.hidden=!!n&&!c;if(n)d.open=c>0;else if(ouvertes)d.open=ouvertes[k];
      if(n&&c){tot+=c;sec++}
      const b=boutons[k];b.querySelector('small')?.remove();b.classList.toggle('zero',!!n&&!c);b.disabled=!!n&&!c;if(n&&c)b.append(h('small','',String(c)));
    });
    if(!n)ouvertes=null;
    vide.hidden=!n||tot>0;
    compte.hidden=!n||!tot;compte.textContent=tot?tot+(tot>1?' passages':' passage')+' dans '+sec+(sec>1?' sections':' section'):'';
    hauteurs();
  }
  inp.addEventListener('input',filtre);
  hauteurs();
  window.golemsAide.chercheRegles=v=>{inp.value=v;filtre()};
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',regles);else regles();
})();
