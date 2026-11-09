/* Onglet Comment jouer (0.6) : selecteur « Regles | Guides » (sc-sel 46 px), vue Guides (maquette 31\Guides variante B + 37 - Partage de guide).
   Guides : liste a gauche (tri « Les mieux notés | Les plus récents », pagination « 1/2 »), guide ouvert a droite (auteur, date, votes en Lilita (audit 34, D08),
   « Copier le lien » entre les votes et « Voir sur YouTube », bandeau « Guide : lien copié. Colle-le sur Discord. », bande du deck a importer, video ou texte).
   Lien partage : ?guide=<id> ouvre Comment jouer > Guides sur ce guide.
   Ancien onglet Guides retire : onglet('guides') et le lien #guides ouvrent Comment jouer > Guides (commun/navigation.js).
   Votes partages (0.6) : guides/<id>/votes/<uid> en ligne (salon-firebase.js, room.guides ; regle rules/60-guides.js). Invite : son vote reste sur l'appareil. */
/* yt : identifiant YouTube ; titre, auteur et date releves a la main (aucune requete a YouTube au chargement) ; decks : liens ?deck= du site.
   texte : guide ecrit (HTML simple, noms de cartes reconnus et cliquables) ; officiel : guide de l'equipe (etiquette « Officiel »). */
const GUIDES=[
 {id:'bien-debuter',titre:'Bien débuter : ton premier deck',auteur:'Équipe des Golems',date:'8 nov. 2026',officiel:true,min:5,decks:[],
  texte:`<div class="sec"><h4><span class="n">1</span>Choisis deux éléments</h4><p>Pour ton premier deck, reste sur <b>deux éléments</b>. Roche donne des Golems solides qui tiennent une colonne ; Magma frappe fort mais s'use vite. Ensemble, ils se couvrent l'un l'autre et tu sauras toujours quoi poser.</p></div>
<div class="sec"><h4><span class="n">2</span>24 cartes pour commencer</h4><p>Le deck compte de 24 à 30 cartes. Avec <b>24 cartes</b>, tu pioches plus souvent tes meilleures cartes. Mets 3 exemplaires de tes Golems préférés et 2 des autres.</p></div>
<div class="sec"><h4><span class="n">3</span>Des bases avant les évolutions</h4><p>Une évolution se pose sur son Golem de base. Garde au moins <b>deux bases</b> pour chaque évolution : sans Glad, /Poll en jeu, Glad, GymRat reste coincé dans ta main.</p></div>
<div class="sec"><h4><span class="n">4</span>Regarde le coût</h4><p>Au premier tour, tu as peu d'énergie. Prévois 8 à 10 cartes de coût 1 ou 2, comme Apo, Clown junior, pour ne jamais passer ton tour sans rien poser.</p></div>
<div class="sec"><h4><span class="n">5</span>Vise les bons terrains</h4><p>Un terrain à 3 points comme Le Carrousel vaut plus qu'un terrain à 1 point. Mets tes Golems les plus forts face aux gros terrains, et laisse l'adversaire s'épuiser sur les petits.</p></div>
<div class="sec"><h4><span class="n">6</span>Teste tes placements</h4><p>Dans Decks, le bouton <b>Placements</b> te laisse essayer ton deck sur une grille sans adversaire. Fais trois ou quatre essais avant ta première partie classée.</p></div>
<div class="sec"><h4><span class="n">7</span>Ajuste après 5 parties</h4><p>Regarde dans Statistiques les cartes que tu poses le moins. Remplace-les par des Golems de coût plus bas, ou ajoute une 2e copie de ta carte MVP. Attention à l'effet Jeunesse éphémère de KaTarN, Romain 18 ans : il ne se pose qu'à la manche 1.</p></div>`},
 {titre:'Meule-Contrôle',auteur:'Bellock',date:'7 nov. 2026',yt:'l8-g9rcBFnI',
  decks:[{nom:'Meule/Contrôle',lien:'https://les-golems.github.io/?deck=GOL2-KgswBsyDwALAAAAATWV1bGUvQ29udHLDtGxlCkJlbGxvY2s'}]},
 {titre:'Q-Bellock & Loxim Contrôle',auteur:'Bellock',date:'7 nov. 2026',yt:'G6EM_E0vT4w',
  decks:[{nom:'Q Bellock & Loxim',lien:'https://les-golems.github.io/?deck=GOL2-KmagBgiACRSoAgAAUSBCZWxsb2NrICYgTG94aW0KQmVsbG9jaw'}]},
 {titre:'Apo/Cyrdan Roche/Cristal',auteur:'Bellock',date:'7 nov. 2026',yt:'u9amOoOXy1A',
  decks:[{nom:'Apo/Cyrdan Comeback',lien:'https://les-golems.github.io/?deck=GOL2-KgMPA8ADDAgAMMABQXBvL0N5cmRhbiBDb21lYmFjawpCZWxsb2Nr'}]},
 {titre:'FORGE !',auteur:'Bellock',date:'6 nov. 2026',yt:'fXJVQ7yxy6w',
  decks:[{onglet:'30 cartes',nom:'Deck Forge expérimental',lien:'https://les-golems.github.io/?deck=GOL2-KgMAw8DDzAAA8AAARGVjayBGb3JnZSBleHDDqXJpbWVudGFsCkJlbGxvY2s'},
         {onglet:'24 cartes',nom:'Forge NoPioche',lien:'https://les-golems.github.io/?deck=GOL2-KgMAAMwDzAAA8AAARm9yZ2UgTm9QaW9jaGUKQmVsbG9jaw'}]},
 {titre:'Bellock Loxim',auteur:'Bellock',date:'6 nov. 2026',yt:'4fw5nB_H-2g',
  decks:[{nom:'Bellock & Loxim',lien:'https://les-golems.github.io/?deck=GOL2-KgcwCgCACAD8MwAAQmVsbG9jayAmIExveGltCkJlbGxvY2s'}]},
 {titre:'Brume Cristal',auteur:'Bellock',date:'6 nov. 2026',yt:'J_famvZzFng',
  decks:[{nom:'Big Roche/Cristal',lien:'https://les-golems.github.io/?deck=GOL2-KgMPAwC8BAwAIMABQmlnIFJvY2hlL0NyaXN0YWwKQmVsbG9jaw'}]},
 {titre:'Spom Électrique !!! Le deck régulier',auteur:'Bellock',date:'6 nov. 2026',yt:'biR_tFUhM1k',
  decks:[{nom:'26 Foudre et 4 Apo',lien:'https://les-golems.github.io/?deck=GOL2-KgcAD4DCvAIAMAAAMjYgRm91ZHJlIGV0IDQgQXBvCkJlbGxvY2s'}]}
];
GUIDES.forEach((g,i)=>{if(!g.id)g.id=g.yt||('g'+i);g.i=i;g.dk=0});
const GD={votes:null,room:null,tri:'notes',type:'tous',els:new Set(),q:'',page:0,par:8,cur:null,fait:false};
const CJ={vue:'regles'};
const SVG_LECTURE='<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M7 4.5v15l12-7.5z"/></svg>';
const SVG_POUCE='<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M2 21h4V9H2v12zm20-11a2 2 0 0 0-2-2h-6.3l1-4.6v-.3c0-.4-.2-.8-.4-1.1L13.2 1 6.6 7.6C6.2 8 6 8.5 6 9v10a2 2 0 0 0 2 2h9c.8 0 1.5-.5 1.8-1.2l3-7.1.2-.7v-2z"/></svg>';
const SVG_LIEN='<svg viewBox="0 0 16 16" aria-hidden="true"><path d="M6.5 9.5l3-3M7 4.5l1.2-1.2a2.8 2.8 0 0 1 4 4L11 8.5M9 11.5l-1.2 1.2a2.8 2.8 0 0 1-4-4L5 7.5" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>';
const SVG_EXT='<svg viewBox="0 0 16 16" aria-hidden="true"><path d="M6 3H3v10h10v-3M9 2h5v5M14 2L7 9" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>';
const gdMk=(t,c,x)=>{const e=document.createElement(t);if(c)e.className=c;if(x!=null)e.textContent=x;return e};
const gdNorm=s=>String(s).normalize('NFD').replace(/[̀-ͯ]/g,'').toLowerCase();
const gdMois={janv:0,'févr':1,mars:2,avr:3,mai:4,juin:5,juil:6,'août':7,sept:8,oct:9,nov:10,'déc':11};
const gdJour=g=>{const m=/(\d+) (\S+?)\.? (\d{4})/.exec(g.date)||[];return new Date(+m[3],gdMois[m[2]]??0,+m[1]).getTime()||0};
/* Deck d'un guide, decode depuis son code ?deck= avec les fonctions du site : elements (nombre de cartes de chacun), total, version. */
function gdDeck(d){
  const c=(/[?&]deck=([A-Za-z0-9_-]+)/.exec(d.lien)||[])[1]||'',o=litCodeDeck(c);
  if(o.err||!o.cartes)return {code:c,err:o.err||'Import impossible : deck illisible. Préviens KaTarN (Romain).'};
  const dd={cartes:o.cartes},E=elsOrdre(dd),r=raisonsDeck(dd);
  return {code:c,els:E.map(e=>[e,Object.keys(o.cartes).filter(k=>(M.CARTES[k]?.el||[]).includes(e)).reduce((t,k)=>t+o.cartes[k],0)]),n:totalDeck(dd),ok:!r.length,raisons:r};
}
const gdInfo=g=>g._d||(g._d=(g.decks||[]).map(gdDeck));
const gdEls=g=>new Set(gdInfo(g).flatMap(d=>(d.els||[]).map(x=>x[0])));
/* Votes (0.6) : GD.votes = { id du guide: { uid: 1 | -1 } } lu en ligne (tous les joueurs). Compte connecte : son vote est en ligne ;
   invite : vote sur l'appareil (golems.votesGuides), ajoute a ceux des autres. gdComptes(g) : {haut,bas,mien}, mien compris. */
const gdVotesLocaux=()=>{try{return JSON.parse(lire('golems.votesGuides')||'{}')||{}}catch(e){return {}}};
const gdUid=()=>GD.room&&GD.room.guides&&compteCo()?GD.room.guides.uid():null;
function gdComptes(g){
  const w=(GD.votes&&GD.votes[g.id])||{},u=gdUid();let haut=g.haut||0,bas=g.bas||0;
  for(const k in w)if(k!==u){if(w[k]===1)haut++;else if(w[k]===-1)bas++}
  const mien=u?(w[u]||0):(gdVotesLocaux()[g.id]||0);if(mien===1)haut++;else if(mien===-1)bas++;
  return {haut,bas,mien};
}
const gdVote=g=>gdComptes(g).mien;
const gdScore=g=>{const c=gdComptes(g);return c.haut-c.bas};
function gdVoter(g,v){
  const u=gdUid(),n=gdVote(g)===v?0:v;
  if(!u){const o=gdVotesLocaux();o[g.id]=n;ecrire('golems.votesGuides',JSON.stringify(o));peintGuidesCJ();return}
  GD.votes=GD.votes||{};const w=GD.votes[g.id]=Object.assign({},GD.votes[g.id]);if(n)w[u]=n;else delete w[u];peintGuidesCJ(); /* affichage immediat, l'ecoute corrige */
  GD.room.guides.vote(g.id,n).catch(e=>console.warn('vote guide',e));
}
if(window.golemsSalon)Promise.resolve(window.golemsSalon).then(r=>{if(!r||!r.guides)return;GD.room=r;
  r.guides.ecoute(v=>{GD.votes=v;peintGuidesCJ()});if(r.compte&&r.compte.onChange)r.compte.onChange(()=>peintGuidesCJ())}).catch(()=>{});
/* Filtres, tri, liste */
function gdListe(){
  let L=GUIDES.filter(g=>(GD.type==='tous'||(GD.type==='texte')===!!g.texte)&&(!GD.q||gdNorm(g.titre+' '+g.auteur).includes(GD.q))
    &&(!GD.els.size||[...GD.els].every(e=>gdEls(g).has(e))));
  return L.sort((a,b)=>GD.tri==='notes'?(gdScore(b)-gdScore(a))||(!!b.officiel-!!a.officiel)||(gdJour(b)-gdJour(a))||a.i-b.i:(gdJour(b)-gdJour(a))||a.i-b.i);
}
const gdVer=d=>{const s=gdMk('span','etq-v gd-ver'+(d.ok?'':' gd-diff'),d.ok?'v0.5':'v0.4');s.title=d.ok?'Deck conforme aux règles actuelles':'Hors règles actuelles : '+d.raisons.map(x=>x.t).join(' ');return s};
function gdItem(g){
  const li=gdMk('li'),b=gdMk('button','gd-li'+(g===GD.cur?' on':''));b.type='button';b.setAttribute('aria-pressed',String(g===GD.cur));
  const mi=gdMk('span','gd-mi'+(g.texte?' t':''));if(g.texte)mi.textContent='TEXTE';else{const i=gdMk('img');i.src='https://i.ytimg.com/vi/'+g.yt+'/mqdefault.jpg';i.alt='';i.loading='lazy';mi.append(i)}
  const tx=gdMk('span','gd-lt'),t=gdMk('b','',g.titre),s=gdMk('small');t.title=g.titre;
  const sc=gdScore(g);s.append(gdMk('span','gd-sc',(sc>0?'+':'')+sc));const D=gdInfo(g);if(D.length&&!D[0].err)s.append(gdVer(D.find(x=>!x.ok)||D[0]));
  if(g.officiel)s.append(gdMk('span','gd-tag','Officiel'));s.append(g.auteur+' - '+g.date.replace(/ \d{4}$/,''));
  tx.append(t,s);b.append(mi,tx);b.onclick=()=>{GD.cur=g;gdAlerte(false);peintGuidesCJ()};li.append(b);return li;
}
/* Noms de cartes cites dans un guide texte : meme composant que le journal (texteLog, clic = zoom). */
function gdNoms(r){if(typeof texteLog!=='function')return;const w=document.createTreeWalker(r,NodeFilter.SHOW_TEXT),L=[];while(w.nextNode())L.push(w.currentNode);
  L.forEach(t=>{if(!t.data.trim()||t.parentNode.closest('h4,.j-lien'))return;const s=texteLog(t.data);if(s.querySelector('.j-lien'))t.replaceWith(...s.childNodes)})}
function gdAlerte(on){const z=$('gdAlq');if(!z)return;z.replaceChildren();if(!on)return;
  const a=gdMk('div','sc-alerte sc-info sc-une-ligne');a.setAttribute('role','status');a.append(gdMk('i'),gdMk('span','','Guide : lien copié. Colle-le sur Discord.'));z.append(a)}
const gdLien=g=>location.origin+location.pathname+'?guide='+encodeURIComponent(g.id);
function gdCopie(g){const u=gdLien(g),fin=()=>gdAlerte(true);
  (navigator.clipboard?.writeText?navigator.clipboard.writeText(u):Promise.reject()).then(fin,()=>{const t=gdMk('textarea');t.value=u;document.body.append(t);t.select();try{document.execCommand('copy')}catch(e){}t.remove();fin()})}
function gdArrete(){const e=$('gdEcran');if(e&&e.querySelector('iframe'))peintEcran(GD.cur)}
function peintEcran(g){const e=$('gdEcran');if(!e)return;e.replaceChildren();
  const z=gdMk('button','gd-vid');z.type='button';z.setAttribute('aria-label','Lire la vidéo « '+g.titre+' »');
  const i=gdMk('img');i.src='https://i.ytimg.com/vi/'+g.yt+'/hqdefault.jpg';i.alt='';const p=gdMk('span','gd-lec');p.innerHTML=SVG_LECTURE;z.append(i,p);
  z.onclick=()=>{const f=gdMk('iframe');f.src='https://www.youtube-nocookie.com/embed/'+g.yt+'?autoplay=1&rel=0';f.title=g.titre;f.allow='autoplay; encrypted-media; picture-in-picture; fullscreen';f.allowFullscreen=true;z.replaceWith(f)};
  e.append(z)}
function gdDetail(g){
  const P=$('gdDet');P.replaceChildren();if(!g){P.append(gdMk('p','gd-vide','Aucun guide ne correspond.'));return}
  const ph=gdMk('div','gd-ph'),h=gdMk('h3','',g.titre);h.title=g.titre;ph.append(h);if(g.officiel)ph.append(gdMk('span','gd-tag','Officiel'));
  const r2=gdMk('div','gd-r2'),me=gdMk('div','gd-meta'),av=gdMk('i','gd-av',g.officiel?'':g.auteur[0]);
  if(g.officiel){const im=gdMk('img');im.src=imgV('cartes/logo.png');im.alt='';av.append(im)}
  me.append(av,gdMk('b','gd-aut',g.auteur),gdMk('span','','-'),gdMk('span','gd-date',g.date));if(g.texte)me.append(gdMk('span','','-'),gdMk('span','',g.min+' min de lecture'));
  const ac=gdMk('div','gd-act'),vo=gdMk('div','gd-vo'),C=gdComptes(g),v=C.mien;
  [[1,'Guide utile',C.haut],[-1,'Guide peu utile',C.bas]].forEach(([s,t,n])=>{
    const b=gdMk('button','sc-btn sc-tertiaire gd-vb'+(v===s?' on':''));b.type='button';b.title=t;b.setAttribute('aria-label',t+' ('+n+')');b.setAttribute('aria-pressed',String(v===s));
    b.innerHTML=s>0?SVG_POUCE:'<span class="gd-bas">'+SVG_POUCE+'</span>';b.append(String(n));b.onclick=()=>gdVoter(g,s);vo.append(b)});
  const cp=gdMk('button','sc-btn sc-secondaire gd-cp','Copier le lien ');cp.type='button';cp.insertAdjacentHTML('beforeend',SVG_LIEN);cp.onclick=()=>gdCopie(g);
  ac.append(vo,cp);
  if(!g.texte){const y=gdMk('a','sc-btn sc-secondaire gd-yt','Voir sur YouTube ');y.href='https://www.youtube.com/watch?v='+g.yt;y.target='_blank';y.rel='noopener';y.insertAdjacentHTML('beforeend',SVG_EXT);ac.append(y)}
  r2.append(me,ac);
  const alq=gdMk('div','gd-alq');alq.id='gdAlq';
  /* Bande du deck : fond aux couleurs de ses elements, selecteur s'il y a deux versions, compteur x/30, version, Importer le deck */
  const D=gdInfo(g),d=D[g.dk],st=gdMk('div','gd-strip');
  if(D.length>1){const s=gdMk('div','sc-sel sc-petit gd-dsel');s.setAttribute('role','group');s.setAttribute('aria-label','Version du deck');
    g.decks.forEach((x,j)=>{const b=gdMk('button','',x.onglet||x.nom);b.type='button';b.setAttribute('aria-pressed',String(j===g.dk));b.onclick=()=>{g.dk=j;peintGuidesCJ()};s.append(b)});st.append(s)}
  else{const n=gdMk('div','gd-dn'+(D.length?'':' vide'));n.append(gdMk('small','','Deck'),gdMk('b','',D.length?g.decks[0].nom:'Aucun deck à importer'));if(D.length)n.lastChild.title=g.decks[0].nom;st.append(n)}
  if(d&&!d.err){const E=d.els.map(x=>x[0]);st.style.background=E.length>1?'linear-gradient(120deg,'+E.map(e=>'color-mix(in srgb,var(--'+e+') 60%,#0a121a)').join(',')+')':'color-mix(in srgb,var(--'+E[0]+') 60%,#0a121a)';st.classList.add('dg');
    const pe=gdMk('div','gd-els');d.els.forEach(([e,n])=>{const s=gdMk('span','gd-el');s.title=nomEl(e);s.append(picto(e),gdMk('b','',String(n)));pe.append(s)});
    st.append(pe,gdMk('span','gd-ct',d.n+'/30'),gdVer(d))}
  else if(d&&d.err)st.append(gdMk('span','gd-err',d.err));
  st.append(gdMk('span','gd-esp'));
  if(d&&!d.err){const im=gdMk('button','sc-btn gd-imp','Importer le deck');im.type='button';im.setAttribute('aria-label','Importer le deck « '+g.decks[g.dk].nom+' »');im.onclick=()=>ouvreDeckLien(d.code);st.append(im)}
  let corps;
  if(g.texte){corps=gdMk('div','gd-txtB');const t=gdMk('div','gd-txt');t.innerHTML=g.texte;gdNoms(t);corps.append(t)}
  else{corps=gdMk('div','gd-ecran');corps.id='gdEcran'}
  P.append(ph,r2,alq,st,corps);if(!g.texte)peintEcran(g);
}
function peintGuidesCJ(){
  if(!$('gdVue'))return;
  const L=gdListe(),n=Math.max(1,Math.ceil(L.length/GD.par));
  if(GD.cur&&!L.includes(GD.cur))GD.cur=null;if(!GD.cur)GD.cur=L[0]||null;
  if(GD.cur&&!GD.fait){GD.page=Math.floor(L.indexOf(GD.cur)/GD.par)}GD.fait=true;GD.page=Math.max(0,Math.min(GD.page,n-1));
  $('gdNb').textContent=L.length+(L.length>1?' guides':' guide');
  const ol=$('gdLst');ol.replaceChildren(...L.slice(GD.page*GD.par,(GD.page+1)*GD.par).map(gdItem));
  if(!L.length)ol.append(gdMk('li','gd-vide','Aucun guide ne correspond.'));
  $('gdNum').textContent=(GD.page+1)+'/'+n;$('gdPrec').disabled=GD.page===0;$('gdSuiv').disabled=GD.page>=n-1;
  const ancien=$('gdDet').dataset.id;if(ancien!==(GD.cur?.id||'')||true){gdDetail(GD.cur);$('gdDet').dataset.id=GD.cur?.id||''}
}
/* Barre commune : selecteur Regles | Guides, filtres (Guides seulement), recherche (un texte par vue). */
const CJ_RECH={regles:'',guides:''};
function cjHauteur(){const v=CJ.vue==='guides'?$('gdVue'):$('rgVue');if(!v||$('regles').hidden)return;
  if(innerWidth<700){$('regles').style.removeProperty('--cj-h');return}
  const h=Math.max(560,innerHeight-(v.getBoundingClientRect().top+scrollY)-24);$('regles').style.setProperty('--cj-h',h+'px')}
function cjVue(v){CJ.vue=v;const R=v==='regles';
  document.querySelectorAll('#cjSel>button').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.v===v)));
  $('rgVue').hidden=!R;$('gdVue').hidden=R;$('gdFiltres').hidden=R;
  const q=$('cjRech');q.placeholder=R?'Chercher dans les règles':'Chercher un guide';q.value=CJ_RECH[v];q.setAttribute('aria-label',q.placeholder);
  if(R){gdArrete();window.golemsRegles?.rendre()}else peintGuidesCJ();
  cjHauteur();
}
/* Lancement : appele a la fin de onglets/regles.js (charge apres decks.js : litCodeDeck, picto). */
function cjInit(){
  if(!$('cjSel'))return;
  document.querySelectorAll('#cjSel>button').forEach(b=>b.onclick=()=>cjVue(b.dataset.v));
  $('cjRech').oninput=()=>{const v=$('cjRech').value;CJ_RECH[CJ.vue]=v;
    if(CJ.vue==='regles')window.golemsRegles?.cherche(v);else{GD.q=gdNorm(v.trim());GD.page=0;GD.cur=null;peintGuidesCJ()}};
  /* Filtres des guides : elements (tous ceux choisis presents dans le deck), type */
  const fe=$('gdEls');['magma','cristal','foudre','brume','roche'].forEach(e=>{const b=gdMk('button','gd-e3');b.type='button';b.style.setProperty('--c','var(--'+e+')');
    b.title=nomEl(e);b.setAttribute('aria-pressed','false');b.setAttribute('aria-label',nomEl(e));b.append(picto(e));
    b.onclick=()=>{GD.els.has(e)?GD.els.delete(e):GD.els.add(e);b.setAttribute('aria-pressed',String(GD.els.has(e)));GD.page=0;GD.cur=null;peintGuidesCJ()};fe.append(b)});
  document.querySelectorAll('#gdType>button').forEach(b=>b.onclick=()=>{GD.type=b.dataset.t;document.querySelectorAll('#gdType>button').forEach(x=>x.setAttribute('aria-pressed',String(x===b)));GD.page=0;GD.cur=null;peintGuidesCJ()});
  document.querySelectorAll('#gdTri>button').forEach(b=>b.onclick=()=>{GD.tri=b.dataset.t;document.querySelectorAll('#gdTri>button').forEach(x=>x.setAttribute('aria-pressed',String(x===b)));GD.page=0;peintGuidesCJ()});
  $('gdPrec').onclick=()=>{GD.page--;GD.cur=gdListe()[GD.page*GD.par]||GD.cur;peintGuidesCJ()};
  $('gdSuiv').onclick=()=>{GD.page++;GD.cur=gdListe()[GD.page*GD.par]||GD.cur;peintGuidesCJ()};
  addEventListener('resize',cjHauteur);
  /* Sortie de l'onglet : la video s'arrete ; entree : hauteur recalculee. */
  new MutationObserver(()=>{if($('regles').hidden)gdArrete();else requestAnimationFrame(cjHauteur)}).observe($('regles'),{attributes:true,attributeFilter:['hidden']});
  cjVue('regles');
  /* Lien partage ?guide=<id> : ouvre ce guide dans Comment jouer > Guides (apres le demarrage du site, qui choisit l'onglet). */
  const id=new URLSearchParams(location.search).get('guide');
  if(id){const g=GUIDES.find(x=>x.id===id);const ouvre=()=>{if(typeof onglet==='function')onglet('regles');if(g){GD.cur=g;GD.fait=false}cjVue('guides');scrollTo(0,0)};
    if(document.readyState==='complete')setTimeout(ouvre,0);else addEventListener('load',()=>setTimeout(ouvre,0))}
}
/* ----- 0.6 : « Proposer un guide » (maquette 31\Guides, B3 compte et B4 invite ; choix du deck B6 = fenetre de deck unique choisirDeck).
   Bouton sous la pagination de la liste ; invite : bouton secondaire au cadenas, fenetre floutee + « Se connecter » / « Créer un compte ».
   Envoi : room.guides.propose (propositionsGuides, rules/60-guides.js), relu par l'equipe avant publication. */
const SVG_CADENAS='<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="4" y="10.5" width="16" height="11" rx="2.5" fill="currentColor"/><path d="M8 10.5V7.5a4 4 0 0 1 8 0v3" fill="none" stroke="currentColor" stroke-width="2.2"/></svg>';
function gdMajProp(){const b=$('gdProp');if(!b)return;const co=compteCo();b.className='sc-btn gd-prop'+(co?'':' sc-secondaire');b.innerHTML=(co?'':'<span class="gd-pcad">'+SVG_CADENAS+'</span>')+'Proposer un guide'}
const gdYt=u=>{u=String(u||'').trim();const m=/(?:youtu\.be\/|[?&]v=|\/shorts\/|\/embed\/|\/live\/)([A-Za-z0-9_-]{11})/.exec(u)||/^([A-Za-z0-9_-]{11})$/.exec(u);return m?m[1]:''};
function gdTuileDeck(d){
  const t=gdMk('div','gd-strip dg gd-tf'),E=elsOrdre(d);t.style.background=fondDeck(E);
  const n=gdMk('div','gd-dn');n.append(gdMk('small','','Deck'),gdMk('b','',d.nom));n.lastChild.title=d.nom;
  const pe=gdMk('div','gd-els');
  E.forEach(e=>{const s=gdMk('span','gd-el'),q=Object.keys(d.cartes).filter(k=>+d.cartes[k]>0&&(M.CARTES[k]?.el||[]).includes(e)).reduce((x,k)=>x+(+d.cartes[k]),0);
    s.title=nomEl(e);s.append(picto(e),gdMk('b','',String(q)));pe.append(s)});
  t.append(n,pe,gdMk('span','gd-ct',totalDeck(d)+'/30'),etqVersionDeck(d.v||V_DECK_ANCIEN,d.cartes));return t;
}
function ouvrePropGuide(){
  $('gdPFen')?.remove();
  const co=compteCo(),v=gdMk('div','voile gd-pvoile'),f=gdMk('div','sc-fenetre gd-pfen');
  v.id='gdPFen';v.setAttribute('role','dialog');v.setAttribute('aria-modal','true');v.setAttribute('aria-labelledby','gdPT');
  const h=gdMk('h3','sc-fen-titre','Proposer un guide');h.id='gdPT';const msg=gdMk('div','gd-pmsg');f.append(h,msg);
  const ferme=()=>{v.remove();$('gdProp')?.focus()};v.onclick=e=>{if(e.target===v)ferme()};v.onkeydown=e=>{if(e.key==='Escape'&&!$('popDeck'))ferme()};
  const choisi=()=>{const id=lire('golems.deckChoisi')||'';return lesDecks().find(x=>x.id===id)||null};
  const P={ty:'v',d1:co?choisi():null,d2:null};
  const corps=gdMk('div','gd-pcorps'),info=gdMk('div','gd-pinfo');
  alerteInfo(info,'L\'équipe relit chaque guide avant de le publier.').classList.add('sc-une-ligne');
  const fl=gdMk('div','gd-fl'),lab=(t,s)=>{const l=gdMk('label','',t);if(s)l.append(gdMk('small','',s));return l};
  const ty=gdMk('div','sc-sel gd-pty');ty.setAttribute('role','group');ty.setAttribute('aria-label','Type de guide');
  [['v','Vidéo'],['t','Texte']].forEach(([k,t])=>{const b=gdMk('button','',t);b.type='button';b.dataset.k=k;b.onclick=()=>{P.ty=k;maj()};ty.append(b)});
  const ti=gdMk('input','gd-ch');ti.maxLength=80;ti.placeholder='Titre de ton guide';ti.setAttribute('aria-label','Titre');
  const yt=gdMk('input','gd-ch');yt.placeholder='https://www.youtube.com/watch?v=...';yt.setAttribute('aria-label','Lien YouTube');
  const tx=gdMk('textarea','gd-ch');tx.maxLength=4000;tx.placeholder='Explique ton plan de jeu, tes choix de cartes, les terrains que tu vises...';tx.setAttribute('aria-label','Texte');
  const lYt=lab('Lien YouTube'),lTx=lab('Texte'),d1=gdMk('div','gd-ldk'),d2=gdMk('div','gd-ldk');
  /* Choix d'un deck : fenetre de deck unique (B6) ; le deck choisi pour jouer est remis tel quel ensuite. */
  const prend=k=>{const av=lire('golems.deckChoisi')||'';
    choisirDeck(()=>{const d=choisi();ecrire('golems.deckChoisi',av);if(typeof majChoixDeck==='function')majChoixDeck();if(d)P[k]=d;maj()},'Choisir ce deck','Deck à importer avec ton guide');
    const pd=$('popDeck');if(pd)pd.style.zIndex=60};
  const ligneDk=(z,k)=>{z.replaceChildren();const d=P[k];
    if(d)z.append(gdTuileDeck(d));
    else{const t=gdMk('div','gd-strip gd-tf'),n=gdMk('div','gd-dn vide');n.append(gdMk('small','','Deck'),gdMk('b','',k==='d1'?'Aucun deck choisi':'Aucune 2e version'));t.append(n);z.append(t)}
    const b=gdMk('button','sc-btn sc-secondaire',k==='d2'&&d?'Retirer':d?'Changer':'Choisir');b.type='button';b.onclick=()=>{if(k==='d2'&&d){P.d2=null;maj()}else prend(k)};z.append(b)};
  fl.append(lab('Type'),ty,lab('Titre'),ti,lYt,yt,lab('Deck à importer','version 1'),d1,lab('2e version','facultative'),d2,lTx,tx);
  const rg=gdMk('div','sc-fen-actions'),ok=gdMk('button','sc-btn','Envoyer pour relecture'),an=gdMk('button','sc-btn sc-secondaire','Annuler');
  ok.type=an.type='button';an.onclick=ferme;rg.append(ok,an);
  function maj(){
    ty.querySelectorAll('button').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.k===P.ty)));
    const vid=P.ty==='v';lYt.hidden=yt.hidden=!vid;
    lTx.replaceChildren('Texte');if(vid)lTx.append(gdMk('small','','facultatif pour une vidéo'));
    ligneDk(d1,'d1');ligneDk(d2,'d2');
  }
  ok.onclick=async()=>{
    const titre=ti.value.trim(),id=gdYt(yt.value),texte=tx.value.trim(),vid=P.ty==='v';
    const e=titre.length<3?'Guide : titre manquant. Donne un titre de 3 caractères au moins.'
      :vid&&!id?'Guide : lien YouTube invalide. Colle le lien de ta vidéo.'
      :!vid&&!texte?'Guide : texte manquant. Écris ton guide.'
      :!P.d1?'Guide : aucun deck choisi. Choisis le deck à importer.':'';
    if(e){alerte(msg,e);return}
    if(!GD.room||!GD.room.guides||!GD.room.guides.propose){alerte(msg,'Guide : serveur injoignable. Réessaie dans un instant.');return}
    ok.disabled=true;alerte(msg,'');
    const ps=GD.room.compte&&GD.room.compte.pseudo?GD.room.compte.pseudo():'';
    try{await GD.room.guides.propose({ty:P.ty,ti:titre,yt:vid?id:'',tx:texte,d1:codeDeck2(P.d1,ps),d2:P.d2?codeDeck2(P.d2,ps):''})}
    catch(x){console.warn('proposition de guide',x);ok.disabled=false;alerte(msg,'Guide : envoi impossible. Réessaie dans un instant.');return}
    ferme();alerteInfo('gdAlq','Guide : proposition envoyée. L\'équipe la relit avant de la publier.');
  };
  corps.append(info,fl,rg);
  if(co)f.append(corps);
  else{
    const w=gdMk('div','gd-verrou');corps.classList.add('gd-flou');corps.setAttribute('aria-hidden','true');corps.inert=true;
    const c=gdMk('div','gd-cad'),ic=gdMk('span','gd-cadi');ic.innerHTML=SVG_CADENAS;
    const r=gdMk('div','sc-rangee'),a=gdMk('button','sc-btn','Se connecter'),b=gdMk('button','sc-btn sc-secondaire','Créer un compte');a.type=b.type='button';
    a.onclick=()=>{ferme();ouvrePseudo()};b.onclick=()=>{ferme();ouvrePseudo();modeCompte(true)};r.append(a,b);
    c.append(ic,gdMk('b','','Un compte est nécessaire pour proposer un guide'),gdMk('span','','Connecte-toi pour envoyer une vidéo ou un texte à l\'équipe.'),r);
    w.append(corps,c);f.append(w);
  }
  maj();v.append(f);document.body.append(v);(co?ti:f.querySelector('.gd-cad .sc-btn')).focus();
}
if($('gdProp')){$('gdProp').onclick=ouvrePropGuide;gdMajProp();
  if(window.golemsSalon)Promise.resolve(window.golemsSalon).then(r=>{if(r&&r.compte&&r.compte.onChange)r.compte.onChange(gdMajProp);gdMajProp()}).catch(()=>{})}
