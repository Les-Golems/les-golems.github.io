/* Onglet Statistiques : archive commune, filtres, agregats, encart du zoom. */
/* Statistiques : archive commune resume/, calculs en direct, aucune donnee de joueur. */
/* Filtre Adversaires : niveaux de l'ordinateur et parties entre joueurs, tous allumes par defaut, jamais tous eteints. */
const ADV_ST=[['facile','Facile','var(--js-taux-haut)'],['normal','Normal','var(--js-taux-moyen)'],['difficile','Difficile','var(--js-taux-bas)'],['ligne','Entre joueurs','var(--js-ligne)']];let statsAdv=new Set(ADV_ST.map(x=>x[0]));
const modeSt=r=>r.m==='ligne'?'ligne':String(r.m||'').replace(/^golem-/,'');
/* Deck par defaut (deck du robot, ancien paquet de test), en texte de deck : 30 cartes depuis 0.3 (33 avant). Le camp du robot est ignore dans les Statistiques. */
const DECK_TEST=M.DECK_DEFAUT?{...M.DECK_DEFAUT}:Object.fromEntries(M.TYPES_TEST.map(t=>[t,3])),DECK_TEST_TXT=M.deckTexte(DECK_TEST);
/* Deck par defaut d'une partie selon la version de son moteur : jusqu'a 0.2c, celui des moteurs archives (moteurs/moteur-<v>.js : pas de DECK_DEFAUT,
   TYPES_TEST a 3 exemplaires, 33 cartes) ; texte lu dans le moteur archive s'il est deja charge, sinon meme composition ecrite ici. */
const DECK_ANCIEN_TXT=M.deckTexte(Object.fromEntries(M.TYPES_TEST.map(t=>[t,3])));
function deckDefautTxt(v){
  v=typeof v==='string'?versionMoteur(v):'';if(!v||v===M0.VERSION)return DECK_TEST_TXT;
  const A=moteursCharges[v]&&moteursCharges[v].__m;if(A)return A.deckTexte(A.DECK_DEFAUT||Object.fromEntries((A.TYPES_TEST||A.TYPES).map(t=>[t,3])));
  return MOTEURS_ARCHIVES.indexOf(v)>=0&&MOTEURS_ARCHIVES.indexOf(v)<MOTEURS_ARCHIVES.indexOf('0.3')?DECK_ANCIEN_TXT:DECK_TEST_TXT;
}
const vPartie=x=>x&&(x.moteur||(x.rejeu&&x.rejeu.v));
/* Force affichee dans les listes : cartes a des, Force moyenne (forceMoy : reelle des 30 lancers, sinon theorique 3,5 et 6,4), une decimale. Affichage seulement. */
function forceAff(C){if(C.force!=null)return String(C.force);const v=forceMoy(C.id);return v==null?null:v.toFixed(1).replace('.',',')}
const NOMS_EL_ST={magma:'Magma',cristal:'Cristal',foudre:'Foudre',brume:'Brume',roche:'Roche'};
/* Patch du site d'une version du moteur : table unique pour les anciens moteurs,
   puis tout moteur nomme d'apres une version du site (0.2a.1, 0.2b...) est regroupe sous elle. */
const PATCH_MOTEUR={'0.2':'0.2a','0.2a':'0.2a','0.2.1':'0.2a','0.2.2':'0.2a','0.2a.1':'0.2a','0.2a.2':'0.2a','0.2b':'0.2b','0.2b.1':'0.2b','0.2b.2':'0.2c'};
function patchSite(v){v=String(v||'');if(PATCH_MOTEUR[v])return PATCH_MOTEUR[v];const m=/^(\d+\.\d+[a-z])/.exec(v);return m?m[1]:v}
/* Patchs presents dans l'archive, le plus recent en premier. */
function versStats(RT){
  const cle=p=>{const m=/^(\d+)\.(\d+)([a-z]?)/.exec(p)||[0,0,0,''];return [+m[1],+m[2],m[3]]};
  const cv=(a,b)=>{const x=cle(a),y=cle(b);return y[0]-x[0]||y[1]-x[1]||(y[2]>x[2]?1:y[2]<x[2]?-1:0)};
  return [...new Set(RT.map(r=>patchSite(r.v)))].sort(cv);
}
/* Agregats de l'archive (onglet Statistiques et encart du zoom). */
function agregeStats(R){
  const NOMS_EL=NOMS_EL_ST;
  /* Cartes : presence dans le deck de chaque camp, victoire si ce camp gagne. */
  const cartes=new Map(),els=new Map(),duos=new Map(),add=(m,k,w)=>{const o=m.get(k)||{n:0,v:0};o.n++;if(w)o.v++;m.set(k,o)};
  const terr=new Map();M.TERRAINS.forEach(T=>terr.set(T.nom,{n:0,m:0,c:0,cv:0,e:0,q:0}));
  let pj=0,pv=0,golem=0,ab=0;
  uneParGraine(R).forEach(r=>{
    /* Deck vide ou illisible (paquet de test) : compte pour la partie, jamais pour une carte ni un element. */
    /* Partie contre un Golem : seul le camp du joueur (0) compte, le deck du robot (camp 1) est ignore. */
    (/^golem-/.test(r.m)?[0]:[0,1]).forEach(p=>{const w=r.g===p,o=M.lisDeck(r['k'+p]);if(!o)return;Object.keys(o).forEach(id=>add(cartes,id,w));
      const e=String(r['e'+p]||'').split(',').filter(x=>NOMS_EL[x]).sort();e.forEach(x=>add(els,x,w));
      for(let i=0;i<e.length;i++)for(let j=i+1;j<e.length;j++)add(duos,e[i]+'+'+e[j],w)});
    Object.values(r.t||{}).forEach(t=>{const o=terr.get(t.n);if(!o)return;o.n++;o.q+=+t.q||0;
      String(t.r||'').split('').forEach(ch=>{if(ch==='-')return;o.m++;if(ch==='=')o.e++;else{o.c++;if(r.g===+ch)o.cv++}})});
    if(r.g!==-1){pj++;if(r.pg)pv++}
    if(/^golem-/.test(r.m))golem++;if(r.a)ab++;
  });
  return {cartes,els,duos,terr,pj,pv,golem,ab};
}
/* Archive pour le zoom : meme cache que l'onglet Statistiques (statsData), patch le plus recent. */
let zoomAgreg=null,zoomAgregSrc=null,zoomCharge=null;
function agregZoom(){
  if(statsData){if(zoomAgregSrc!==statsData){const v=versStats(statsData)[0];zoomAgregSrc=statsData;zoomAgreg=v?agregeStats(statsData.filter(r=>patchSite(r.v)===v)):null}return Promise.resolve(zoomAgreg)}
  if(!room||!room.litResumes)return Promise.resolve(null);
  if(!zoomCharge)zoomCharge=room.litResumes(2000).then(l=>{if(!statsData)statsData=uneParGraine(l.filter(r=>r&&typeof r.d==='number'&&(r.g===0||r.g===1||r.g===-1)));return agregZoom()}).catch(e=>{console.warn(e);return null}).finally(()=>{zoomCharge=null});
  return zoomCharge;
}
/* Encart sous le zoom : lignes Toi / Communaute ; masque tant qu'aucune donnee. */
function encartZoom(lignes){
  const b=el('div','zs');b.hidden=true;
  const pose=(nom,txt)=>{let r=b.querySelector('[data-l="'+nom+'"]');if(!r){r=el('div','zs-l');r.dataset.l=nom;r.append(el('b','zs-n',nom),el('span','zs-v'));b.append(r)}r.lastChild.textContent=txt};
  const montre=()=>{const ok=lignes.some(x=>x.v);if(!ok){b.hidden=true;return}b.hidden=false;lignes.forEach(x=>pose(x.nom,x.v||VIDE_ST));
    const d=$('vueDetail');if(d.contains(b)){d.hidden=false;$('vueGrand').classList.add('avecDetail')}};
  return {b,montre};
}
function statZoomCarte(id){
  const pl=n=>n+(n>1?' parties':' partie'),f=o=>o&&o.n?pl(o.n)+' - '+Math.round(100*o.v/o.n)+' % de victoires':'';
  const L=[{nom:'Toi',v:f(statsCartes().get(id))},{nom:'Communauté',v:''}],E=encartZoom(L);E.montre();
  agregZoom().then(a=>{if(!a)return;L[1].v=f(a.cartes.get(id));E.montre()});
  return [E.b];
}
function statZoomTerrain(T){
  const L=[{nom:'Communauté',v:''}],E=encartZoom(L);
  agregZoom().then(a=>{const o=a&&a.terr.get(T.nom);if(!o||!o.n)return;
    const pc=(v,n)=>n?Math.round(100*v/n)+' %':'-';
    L[0].v='Victoire du conquérant '+pc(o.cv,o.c)+' - '+String(Math.round(10*o.q/o.n)/10).replace('.',',')+' pts en moyenne - '+pc(o.e,o.m)+' d’égalités - '+o.m+(o.m>1?' manches':' manche');E.montre()});
  return [E.b];
}
/* ===== Onglet Statistiques 0.6 (maquette 29\Saison, variante C) =====
   Barre : sélecteur Classées | Amicales | Entraînement, panneau de saison (Classées) ou total de parties, Patchs (menu déroulant), recherche commune.
   4 colonnes égales : Classement (ou Joueurs), Cartes (Meilleures | Plus jouées), Terrains (triable), Éléments (éléments puis duos).
   Les colonnes prennent la hauteur de l'écran (au moins celle d'Éléments) ; les listes défilent dedans, en nombre entier de lignes.
   Mode d'une partie (résumé) : classée si r.cl (ou r.m === 'classee'), entraînement si contre un Golem, amicale sinon. */
const VIDE_ST='Pas encore assez de parties.',VIDE_FILTRES='Aucune partie avec ces filtres.',VIDE_RECH='Aucun résultat pour cette recherche.';
const MODES_ST=[['classees','Classées','classées'],['amicales','Amicales','amicales'],['entrainement','Entraînement',"d'entraînement"]];
const modeRes=r=>r&&(r.cl===true||r.m==='classee')?'classees':/^golem-/.test(String(r&&r.m||''))?'entrainement':'amicales';
let statsMode='classees',statsQ='',statsQBrut='',statsTriC=lire('golems.tri.statsCartes')==='1'?1:0, /* tris memorises sur l'appareil */statsClasse=null,statsAjuste=null,statsLarg=0;
{const t=lire('golems.tri.stats');if(t)statsTri=t} /* tri des terrains memorise (inconnu : taux, voir terrains()) */
let statsTriEl=lire('golems.tri.statsEl')||'taux',statsTriDuo=lire('golems.tri.statsDuo')||'n'; /* tris des elements et des duos, memorises de meme */
addEventListener('resize',()=>{if(statsAjuste&&innerWidth!==statsLarg){statsLarg=innerWidth;statsAjuste()}});
const escSt=s=>String(s==null?'':s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'})[c]);
const normSt=s=>String(s).normalize('NFD').replace(/[̀-ͯ]/g,'').toLowerCase();
/* Surligne la recherche dans un texte (échappé). */
function hlSt(s){s=String(s);if(!statsQ)return escSt(s);const i=normSt(s).indexOf(statsQ);if(i<0)return escSt(s);const j=i+statsQ.length;return escSt(s.slice(0,i))+'<mark>'+escSt(s.slice(i,j))+'</mark>'+escSt(s.slice(j))}
const okSt=s=>!statsQ||normSt(s).includes(statsQ);
const pcSt=(v,n)=>n?Math.round(100*v/n):null;
/* Taux coloré par la charte : couleurTaux (vert >= 50, ambre 40-49, rouge < 40, gris < 5 parties) ; neutre = blanc (classement des joueurs). */
const tauxSt=(p,n,neutre)=>`<span class="st-pc ${couleurTaux(p,n,neutre?{neutre:true}:null)}">${p==null?'-':p+' %'}</span>`;
const rangImgSt=id=>'images/rangs/'+(id||'placement')+'.png';
const eSt=n=>n===1?'er':'e';
/* Saison en cours : classe/saison, sinon la saison 0 de classe.js. */
function saisonSt(){const G=window.GolemsClasse,s=statsClasse&&statsClasse.saison,b=G&&G.SAISONS[0]||{id:0,nom:'Bêta'};
  const o=s&&typeof s==='object'?{id:s.id|0,nom:String(s.nom||b.nom),debut:s.debut||null,fin:s.fin||null}:{id:b.id,nom:b.nom,debut:null,fin:b.fin};
  o.titre='Saison '+o.id+(o.nom?' - '+o.nom:'');return o}
/* Lecture du classement classé (classe/classement), de mon profil classé et de la saison ; aucune écriture. */
async function litClasseSt(){
  const lit=p=>room&&room.lit?room.lit(p).catch(()=>null):Promise.resolve(null);
  const uid=compteCo()?room.compte.uid():null;
  const [cl,moi,sa]=await Promise.all([lit('classe/classement'),uid?lit('classe/joueurs/'+uid):null,lit('classe/saison')]);
  const G=window.GolemsClasse;
  const sid=sa&&typeof sa==='object'?sa.id|0:G.SAISONS[0].id; /* 0.6.1 : lignes de la saison en cours seulement */
  const L=Object.keys(cl||{}).map(u=>({uid:u,...cl[u]})).filter(x=>x&&typeof x.pseudo==='string'&&Number.isFinite(x.elo)&&!G.estRobot(x.uid)&&x.saison===sid)
    .sort((a,b)=>b.elo-a.elo||(b.v|0)-(a.v|0)||a.pseudo.localeCompare(b.pseudo,'fr'));
  L.forEach((x,i)=>{x.place=i+1});
  return {liste:L,moi:moi&&typeof moi==='object'?moi:null,uid,saison:sa};
}
async function peintStats(){
  const z=$('statsCorps');
  /* Salon pas encore pret (onglet memorise rouvert au chargement) : attente, puis l'onglet se repeint. */
  if(!room&&!compteCharge&&window.golemsSalon){z.textContent='';alerteInfo(z.appendChild(el('div','pf-vide')),'Connexion : statistiques en cours de lecture. Patiente un instant.');
    Promise.resolve(window.golemsSalon).catch(()=>{}).finally(()=>setTimeout(()=>{if(!$('stats').hidden)peintStats()},0));return}
  if(!room||!room.litResumes){z.textContent='';alerte(z.appendChild(el('div','pf-vide')),'Lecture impossible : statistiques indisponibles pour le moment. Réessaie plus tard.');return}
  if(!compteCo()){verrouStats();return} /* invite : les regles refusent la lecture, invitation a se connecter (charte, comme Jouer) */
  if(!statsData){z.textContent='';alerteInfo(z.appendChild(el('div','pf-vide')),'Connexion : statistiques en cours de lecture. Patiente un instant.')}else dessineStats(statsData);
  try{statsJoueurs=room.litClassement?await room.litClassement().catch(()=>[]):[]}catch(e){statsJoueurs=[]}
  try{statsClasse=await litClasseSt()}catch(e){console.warn(e);statsClasse={liste:[],moi:null,uid:null,saison:null}}
  if(profilPublie&&compteCo())await Promise.race([Promise.resolve(profilPublie).catch(()=>{}),new Promise(r=>setTimeout(r,3000))]);
  try{const pr=await Promise.all(statsJoueurs.filter(x=>x.n>=5).map(x=>room.compte.profilDe?room.compte.profilDe(x.uid).then(r=>[x.uid,r]):[x.uid,null]));statsProfils=Object.fromEntries(pr)}catch(e){statsProfils={}}
  try{statsData=uneParGraine((await room.litResumes(2000)).filter(r=>r&&typeof r.d==='number'&&(r.g===0||r.g===1||r.g===-1)))}catch(e){console.warn(e);if(!statsData){z.textContent='';alerte(z.appendChild(el('div','pf-vide')),'Lecture impossible : statistiques injoignables. Réessaie plus tard.')}return}
  if(!$('stats').hidden)dessineStats(statsData);
}
/* Invite : apercu floute de l'onglet sous un cadenas, Se connecter / Creer un compte (meme verrou que la colonne Classement). */
function verrouStats(){
  const z=$('statsCorps');try{dessineStats([])}catch(e){console.warn(e);z.textContent=''}
  const v=el('div','st-verrou st-verrou-tout'),f=el('div','st-flou');f.setAttribute('aria-hidden','true');f.append(...z.childNodes);
  const o=el('div','st-vo');o.innerHTML='<svg width="30" height="34" viewBox="0 0 30 34" aria-hidden="true"><rect x="3" y="14" width="24" height="18" rx="4" fill="none" style="stroke:var(--bleu)" stroke-width="3"/><path d="M8 14V10a7 7 0 0 1 14 0v4" fill="none" style="stroke:var(--bleu)" stroke-width="3"/></svg><b>Statistiques des joueurs</b><p>Connecte-toi pour voir les classements, les cartes et les terrains.</p><div class="sc-rangee"><button class="sc-btn" type="button" data-a="co">Se connecter</button><button class="sc-btn sc-secondaire" type="button" data-a="cree">Créer un compte</button></div>';
  o.querySelectorAll('[data-a]').forEach(b=>b.onclick=()=>{ouvrePseudo();if(b.dataset.a==='cree')modeCompte(true)});
  v.append(f,o);z.textContent='';z.append(v);statsAjuste=null;
}
/* Médaille de saison (image finale, images/recompenses/saison-<id>-<taille>.png) ; repli : emblème de placement. k = échelle (40 px x k). */
let medSt=0;
function medailleSt(n,k){const G=window.GolemsClasse,t=(k||1)>1.5?104:56,s=G?G.imageMedaille(n,t):'images/recompenses/saison-'+n+'-'+t+'.png';return `<span class="st-med" style="--k:${k||1}"><img src="${imgV(s)}" alt="" onerror="this.onerror=null;this.src='images/rangs/placement.png'"></span>`}
/* Badges de récompense (images finales, règle du 9 nov.) : écu or (1re place), argent (2e-3e), bronze (4e-10e), médaille de saison (placement fini, Saison 0 = Pionnier). */
const BADGES_ST={or:[1,'Écu d’or'],ar:[2,'Écu d’argent'],br:[4,'Écu de bronze']};
function badgeSt(t,lbl,grand){const G=window.GolemsClasse,z=grand?104:56,s=t==='pi'?(G?G.imageMedaille(lbl|0,z):'images/recompenses/saison-0-'+z+'.png'):(G?G.imageEcu(BADGES_ST[t][0],z):'');return `<img class="st-bd" src="${imgV(s)}" alt="" onerror="this.onerror=null;this.src='images/rangs/placement.png'">`}
/* Ma situation classée : place (si classé), palier, placement. */
function situationSt(){
  const C=statsClasse||{liste:[]},G=window.GolemsClasse,moi=C.uid?C.liste.find(x=>x.uid===C.uid):null,pr=C.moi;
  const parties=pr?pr.parties|0:0,place=moi?moi.place:null;
  return {co:compteCo(),moi,pr,parties,place,placement:!moi&&parties>0&&parties<G.PLACEMENT,fini:!!moi||parties>=G.PLACEMENT,
    palier:place===1?'champion':place&&place<=3?'podium':place&&place<=10?'top10':null};
}
function dessineStats(RT){
  const z=$('statsCorps');z.textContent='';statsAjuste=null;
  const G=window.GolemsClasse,vers=versStats(RT);if(!statsPatchs||![...statsPatchs].some(v=>vers.includes(v)))statsPatchs=new Set(vers);
  const R=uneParGraine(RT).filter(r=>statsPatchs.has(patchSite(r.v))&&modeRes(r)===statsMode),A=agregeStats(R);
  const iM=MODES_ST.findIndex(m=>m[0]===statsMode),S=saisonSt(),sit=situationSt(),pl=(n,m)=>n+' '+m+(n>1?'s':'');
  /* ---- Barre ---- */
  const barre=el('div','st-barre');
  const sel=el('div','sc-sel st-mode');sel.setAttribute('role','group');sel.setAttribute('aria-label','Type de parties');
  MODES_ST.forEach(([k,t])=>{const b=el('button','',t);b.type='button';b.setAttribute('aria-pressed',String(k===statsMode));b.onclick=()=>{if(statsMode===k)return;statsMode=k;dessineStats(RT);const n=$('statsCorps').querySelector('.st-mode [aria-pressed=true]');if(n)n.focus()};sel.append(b)});
  barre.append(sel);
  if(statsMode==='classees'){
    const sz=el('button','st-saison');sz.type='button';sz.setAttribute('aria-label',S.titre+' : récompenses de la saison');
    const etat=!sit.co?'':sit.palier?`<span class="st-sz-cs st-sz-rg">Tu es ${sit.place}${eSt(sit.place)}<b>${{champion:'Champion',podium:'Podium',top10:'Top 10'}[sit.palier]}</b></span>`
      :sit.moi?`<span class="st-sz-cs st-sz-rg">Tu es ${sit.place}e<b class="st-sz-hors">${escSt(G.rang(sit.moi.elo).nom)}</b></span>`
      :sit.placement?`<span class="st-sz-cs st-sz-rg">Placement<b class="st-sz-hors">${sit.parties}/${G.PLACEMENT}</b></span>`:'';
    const on=p=>sit.palier===p?' on':'';
    const bg=`<span class="st-sz-cs st-sz-bgs"><span class="st-bx or${on('champion')}" title="Champion">${badgeSt('or',S.id)}</span><span class="st-bx ar${on('podium')}" title="Podium">${badgeSt('ar',S.id)}</span><span class="st-bx br${on('top10')}" title="Top 10">${badgeSt('br',S.id)}</span><span class="st-bx pi${sit.fini?' on':''}" title="${S.id===0?'Médaille Pionnier':'Médaille de la saison '+S.id}">${badgeSt('pi',S.id)}</span></span>`;
    const fin=S.fin?'fin dans <b>'+Math.max(0,Math.ceil((S.fin-Date.now())/864e5))+' j</b>':"jusqu'à la <b>1.0</b>";
    sz.innerHTML=`<span class="st-sz-c1">${medailleSt(S.id)}<span class="st-sz-n">${escSt(S.titre)}</span></span>${etat}${bg}<span class="st-sz-cs st-sz-du"><span>${fin}</span></span>`;
    sz.onclick=()=>fenSaisonSt(S,sit,R);barre.append(sz);
  }else{const t=el('span','st-tot');t.innerHTML=`<b>${R.length.toLocaleString('fr-FR')}</b>${R.length>1?'parties':'partie'} ${MODES_ST[iM][2]}`;barre.append(t)}
  /* Patchs : menu déroulant (exception de la charte) */
  const pat=el('div','st-pat'),pb=el('button','st-pat-b'),pm=el('div','st-pat-m');pb.type='button';pb.setAttribute('aria-expanded','false');pb.setAttribute('aria-haspopup','true');pm.hidden=true;
  pb.innerHTML=`Patchs : <b>${vers.every(v=>statsPatchs.has(v))?'tous':statsPatchs.size===1?'v'+escSt([...statsPatchs][0]):statsPatchs.size+' sur '+vers.length}</b> ▾`;
  vers.forEach(v=>{const lb=el('label'),cb=el('input');cb.type='checkbox';cb.checked=statsPatchs.has(v);cb.dataset.v=v;
    cb.onchange=()=>{if(!cb.checked&&statsPatchs.size<2){cb.checked=true;return}cb.checked?statsPatchs.add(v):statsPatchs.delete(v);dessineStats(RT);
      const b=$('statsCorps').querySelector('.st-pat-b');if(b){b.click();const c=$('statsCorps').querySelector('.st-pat-m input[data-v="'+v+'"]');if(c)c.focus()}};
    lb.append(cb,'v'+v);pm.append(lb)});
  pm.append(el('p','','Ne change pas le classement Elo.'));
  pb.onclick=e=>{e.stopPropagation();const o=pm.hidden;pm.hidden=!o;pb.setAttribute('aria-expanded',String(o))};
  pat.append(pb,pm);barre.append(pat);
  const rech=el('label','st-rech');rech.innerHTML='<svg viewBox="0 0 20 20" aria-hidden="true"><circle cx="8.5" cy="8.5" r="6" fill="none" stroke="var(--doux)" stroke-width="2.2"/><path d="M13 13l5 5" stroke="var(--doux)" stroke-width="2.2" stroke-linecap="round"/></svg>';
  const q=el('input');q.type='search';q.placeholder='Chercher un joueur, une carte, un terrain';q.setAttribute('aria-label',q.placeholder);q.autocomplete='off';q.value=statsQBrut;
  q.oninput=()=>{statsQBrut=q.value;statsQ=normSt(q.value.trim());peintCols()};rech.append(q);barre.append(rech);
  const g=el('div','st-g4'),P=['c1','cC','cT','cE'].map(k=>{const s=el('section','st-p');s.dataset.p=k;g.append(s);return s});
  z.append(barre,g);
  const tete=(t,x)=>`<div class="st-ph"><h3>${t}</h3>${x||''}</div>`;
  const enc=a=>`<div class="st-enc">${a.map(x=>`<div><i>${x[0]}</i><b>${x[1]}</b><small>${x[2]}</small></div>`).join('')}</div>`;
  const moiUid=compteCo()?room.compte.uid():null;
  /* 0.6.3 : saison en cours seulement (compteurs par saison ; ceux d'un autre publiés pour cette saison). */
  const saSt=statsClasse&&statsClasse.saison&&Number.isInteger(statsClasse.saison.id)?statsClasse.saison:null,sidSt=saSt?saSt.id:undefined;
  const mesPmSt=(()=>{try{return mesCompteurs(saSt)}catch(e){return {}}})();
  const cls=(x,moi)=>moi?' st-moi':x.place<=3?' st-t'+x.place:'';
  /* Recherche : tous les joueurs (classement public), meme sous le minimum de la liste ; clic = profil. Les listes gardent leur minimum. */
  const autresSt=(V,g,nv)=>{if(!statsQ)return '';const deja=new Set(V.map(x=>x.uid));
    return (statsJoueurs||[]).filter(x=>x&&x.uid&&!deja.has(x.uid)&&typeof x.p==='string'&&okSt(x.p)).sort((a,b)=>a.p.localeCompare(b.p,'fr')).map(x=>`<div class="st-ln st-cl ${g}${x.uid===moiUid?' st-moi':''}" tabindex="0" role="button" data-uid="${escSt(x.uid)}" aria-label="Profil de ${escSt(x.p)}" title="Pas encore classé : moins de 5 parties"><span class="st-rk">-</span>${g==='st-gcl'?'<span></span>':''}<span class="st-jg" data-av="${escSt(x.uid)}"><span class="st-ps" title="${escSt(x.p)}">${hlSt(x.p)}</span></span>${'<span class="r">-</span>'.repeat(nv)}</div>`).join('')};
  /* ---- Colonne 1 : Classement (Classées) ---- */
  function classement(){
    const L=(statsClasse||{liste:[]}).liste,gc='st-gcl';let en='';
    if(!sit.co)en=enc([['Ton rang','Saphir','Elo 1087 - 7e'],['Prochain rang','63 pts','avant Émeraude'],['Classés',String(L.length),L.length>1?'joueurs':'joueur']]); /* flouté, illisible */
    else if(sit.moi){const r=G.rang(sit.moi.elo),nx=G.RANGS[G.RANGS.indexOf(r)+1];
      en=enc([['Ton rang',`<span class="st-rg-${r.id}">${r.nom}</span>`,'Elo '+Math.round(sit.moi.elo)+' - '+sit.place+eSt(sit.place)],nx?['Prochain rang',pl(Math.ceil(nx.min-sit.moi.elo),'pt'),'avant '+nx.nom]:['Prochain rang','-','rang maximal'],['Classés',String(L.length),L.length>1?'joueurs':'joueur']])}
    else if(sit.placement)en=enc([['Ton rang',`<span class="st-enc-pl"><img src="${rangImgSt()}" alt="">${sit.parties}/${G.PLACEMENT}</span>`,'en placement'],['Prochain rang','-','après '+G.PLACEMENT+' parties'],['Classés',String(L.length),L.length>1?'joueurs':'joueur']]);
    else en='<div class="st-premier"><b>Joue ta première partie classée</b><button class="sc-btn" type="button" data-a="jouer">Jouer une partie classée</button></div>';
    let h=en+`<div class="st-th ${gc}"><span class="r">#</span><span></span><span>Joueur</span><span class="r">Elo</span><span class="c">V - D</span><span class="r">Vict.</span></div><div class="st-corps">`;
    const ligne=x=>{const n=(x.v|0)+(x.d|0),r=G.rang(x.elo);return `<div class="st-ln st-cl ${gc}${cls(x,x.uid===moiUid)}" tabindex="0" role="button" data-uid="${escSt(x.uid)}" aria-label="Profil de ${escSt(x.pseudo)}, ${x.place}${eSt(x.place)}"><span class="st-rk">${x.place}</span><img class="st-emb" src="${rangImgSt(r.id)}" alt="" title="${r.nom}"><span class="st-ps" title="${escSt(x.pseudo)}">${hlSt(x.pseudo)}</span><span class="r st-n">${Math.round(x.elo)}</span><span class="c st-n">${x.v|0} - ${x.d|0}</span><span class="r">${tauxSt(pcSt(x.v|0,n),n,true)}</span></div>`};
    const V=statsQ?L.filter(x=>okSt(x.pseudo)):L.slice(0,10);
    const AU=autresSt(V,gc,3);if(!V.length&&!AU)h+=`<div class="st-vide">${statsQ?VIDE_RECH:'Aucun joueur classé pour le moment.'}</div>`;
    V.forEach(x=>h+=ligne(x));h+=AU;
    if(!statsQ&&sit.moi&&sit.place>10)h+='<div class="st-etc">…</div>'+ligne(sit.moi);
    h+='</div>';
    if(!sit.co)h=`<div class="st-verrou"><div class="st-flou" aria-hidden="true">${h}</div><div class="st-vo"><svg width="30" height="34" viewBox="0 0 30 34" aria-hidden="true"><rect x="3" y="14" width="24" height="18" rx="4" fill="none" stroke="var(--bleu-titre)" stroke-width="3"/><path d="M8 14V10a7 7 0 0 1 14 0v4" fill="none" stroke="var(--bleu-titre)" stroke-width="3"/></svg><b>Rang, Elo et classement</b><p>Connecte-toi pour voir ta place parmi les joueurs.</p><div class="sc-rangee"><button class="sc-btn" type="button" data-a="co">Se connecter</button><button class="sc-btn sc-secondaire" type="button" data-a="cree">Créer un compte</button></div></div></div>`;
    return tete('Classement')+h;
  }
  /* ---- Colonne 1 : Joueurs (Amicales) : classement public, 5 parties minimum ---- */
  function joueurs(){
    /* 0.6.2 : parties amicales seulement, compteurs complets publies (compteursMode, les memes que le profil). */
    const J=(statsJoueurs||[]).map(x=>{const pm=x.uid===moiUid?mesPmSt:compteursPublies(statsProfils[x.uid],sidSt);if(!pm)return null;const a=compteursMode(pm,'amicale');return {...x,n:a.n,v:a.v,d:a.d,pct:pcSt(a.v,a.n)}}).filter(x=>x&&x.n>=5)
      .sort((a,b)=>b.pct-a.pct||b.n-a.n||a.p.localeCompare(b.p,'fr')).map((x,i)=>({...x,place:i+1}));
    const moi=moiUid?compteursMode(mesPmSt,'amicale'):null,gj='st-gjo';
    let h=enc([['Parties',R.length.toLocaleString('fr-FR'),'entre joueurs'],['Tes victoires',moi&&moi.n?pcSt(moi.v,moi.n)+' %':'-',moi&&moi.n?moi.v+' sur '+moi.n:'aucune partie'],['Classés',String(J.length),J.length>1?'joueurs':'joueur']]);
    h+=`<div class="st-th ${gj}"><span class="r">#</span><span>Joueur (5 min.)</span><span class="r">Parties</span><span class="c">V - D</span><span class="r">Vict.</span></div><div class="st-corps">`;
    const V=statsQ?J.filter(x=>okSt(x.p)):J.slice(0,10),AU=autresSt(V,gj,3);if(!V.length&&!AU)h+=`<div class="st-vide">${statsQ?VIDE_RECH:VIDE_ST}</div>`;
    V.forEach(x=>h+=`<div class="st-ln st-cl ${gj}${cls(x,x.uid===moiUid)}" tabindex="0" role="button" data-uid="${escSt(x.uid)}" aria-label="Profil de ${escSt(x.p)}"><span class="st-rk">${x.place}</span><span class="st-jg" data-av="${escSt(x.uid)}"><span class="st-ps" title="${escSt(x.p)}">${hlSt(x.p)}</span></span><span class="r st-n">${x.n}</span><span class="c st-n">${x.v} - ${x.d}</span><span class="r">${tauxSt(x.pct,x.n)}</span></div>`);
    return tete('Joueurs')+h+AU+'</div>';
  }
  /* ---- Colonne 1 : Joueurs (Entraînement) : taux contre chaque niveau (profil public) ---- */
  function robots(){
    const niv=['facile','normal','difficile'],gr='st-grb',tot=niv.map(k=>{const a=R.filter(r=>r.m==='golem-'+k&&r.g!==-1);return {n:a.length,p:pcSt(a.filter(r=>r.g===0).length,a.length)}});
    let h=enc(niv.map((k,i)=>[k[0].toUpperCase()+k.slice(1),tot[i].p==null?'-':tot[i].p+' %',pl(tot[i].n,'partie')]));
    const pk=(x,k)=>{const p=pcSt(x.o[k].v,x.o[k].n);return p==null?-1:p};
    /* 0.6.2 : entrainement par niveau, compteurs complets publies (compteursMode, les memes que le profil). */
    const J=(statsJoueurs||[]).map(x=>{const pm=x.uid===moiUid?mesPmSt:compteursPublies(statsProfils[x.uid],sidSt);if(!pm||compteursMode(pm,'entrainement').n<5)return null;const o={};niv.forEach(k=>{const c=compteursMode(pm,'entrainement',k);o[k]={n:c.n,v:c.v}});return {...x,o}}).filter(x=>x&&niv.some(k=>x.o[k].n))
      .sort((a,b)=>pk(b,'difficile')-pk(a,'difficile')||pk(b,'normal')-pk(a,'normal')||pk(b,'facile')-pk(a,'facile')||a.p.localeCompare(b.p,'fr')).map((x,i)=>({...x,place:i+1}));
    h+=`<div class="st-th ${gr}"><span class="r">#</span><span>Joueur (5 min.)</span><span class="r">Facile</span><span class="r">Normal</span><span class="r">Difficile</span></div><div class="st-corps">`;
    const V=statsQ?J.filter(x=>okSt(x.p)):J.slice(0,10),AU=autresSt(V,gr,3);if(!V.length&&!AU)h+=`<div class="st-vide">${statsQ?VIDE_RECH:VIDE_ST}</div>`;
    V.forEach(x=>h+=`<div class="st-ln st-cl ${gr}${cls(x,x.uid===moiUid)}" tabindex="0" role="button" data-uid="${escSt(x.uid)}" aria-label="Profil de ${escSt(x.p)}"><span class="st-rk">${x.place}</span><span class="st-jg" data-av="${escSt(x.uid)}"><span class="st-ps" title="${escSt(x.p)}">${hlSt(x.p)}</span></span>${niv.map(k=>`<span class="r">${tauxSt(pcSt(x.o[k].v,x.o[k].n),x.o[k].n)}</span>`).join('')}</div>`);
    return tete('Joueurs')+h+AU+'</div>';
  }
  /* ---- Cartes : Meilleures (10 parties minimum) | Plus jouées ---- */
  const MIN_CARTES=10,lc=[...A.cartes].map(([id,o])=>{const c=CARTES.find(y=>y[0]===id);return c&&M.CARTES[id]?{id,c,n:o.n,p:pcSt(o.v,o.n)}:null}).filter(Boolean);
  function cartes(){
    let L=statsTriC===0?lc.filter(x=>x.n>=MIN_CARTES).sort((a,b)=>b.p-a.p||b.n-a.n):lc.slice().sort((a,b)=>b.n-a.n||b.p-a.p);
    if(statsQ)L=(statsTriC===0?L.concat(lc.filter(x=>x.n<MIN_CARTES).sort((a,b)=>b.n-a.n)):L).filter(x=>okSt(x.c[1]));
    const sel=`<div class="sc-sel sc-petit st-tric" role="group" aria-label="Tri des cartes"><button type="button" aria-pressed="${statsTriC===0}">Meilleures</button><button type="button" aria-pressed="${statsTriC===1}">Plus jouées</button></div>`;
    let h=tete('Cartes',sel)+`<div class="st-th st-thc"><span title="Coût" data-ico="enclume"></span><span title="Force" data-ico="force"></span><span></span><span>${statsTriC===0?'Carte ('+MIN_CARTES+' min.)':'Carte'}</span><span class="r" title="Parties">Part.</span><span class="r" title="Taux de victoire">Vict.</span></div><div class="st-corps">`;
    if(!L.length)h+=`<div class="st-vide">${statsQ?VIDE_RECH:R.length?'Il faut au moins '+MIN_CARTES+' parties par carte.':VIDE_FILTRES}</div>`;
    L.forEach(x=>{const c=x.c,C=M.CARTES[x.id],v=c[1].indexOf(', '),ps=v<0?c[1]:c[1].slice(0,v),ti=v<0?'':c[1].slice(v+2),ani=estAnimal(c),f=forceAff(C);
      const cl=c[2].length===2?` st-duo" style="--a:var(--fm-${c[2][0]});--b:var(--fm-${c[2][1]})`:ani?' st-ani':'';
      h+=`<div class="st-lc${cl}" tabindex="0" role="button" data-id="${escSt(x.id)}" title="${escSt(c[1])}" aria-label="${escSt(c[1])}, ${pl(x.n,'partie')}${x.p==null?'':', '+x.p+' % de victoires'}"><span class="st-cf" data-ico="enclume">${C.cout}</span>${ani?'<span class="st-mot">Animal</span>':`<span class="st-cf${f&&f.includes(',')?' st-dec':''}" data-ico="force">${f==null?'':f}</span><span class="st-els" data-els="${c[2].join(',')}"></span>`}<span class="st-nom"><span>${hlSt(ps)}</span>${ti?`<span class="st-ti" style="color:${coulT(c)}">${hlSt(ti)}</span>`:''}</span><span class="st-np">${x.n}</span><span class="st-pv ${couleurTaux(x.p,x.n)}">${x.p==null?'-':x.p+' %'}</span></div>`});
    return h+'</div>';
  }
  /* ---- Terrains : tri par colonne ---- */
  const TT_ST={pts:'Points du terrain',taux:'Victoire du conquérant : part des conquêtes où le joueur qui remporte le terrain gagne aussi la partie',moy:'Points rapportés en moyenne sur une partie',eg:'Part des manches à égalité'};
  if(!TT_ST[statsTri])statsTri='taux';
  /* En-tete triable commun (Terrains, Elements, Duos) : g = groupe, cur = cle de tri active */
  const thTri=(g,cur,k,t,c,ti)=>`<button type="button" class="st-tri ${c}${cur===k?' on':''}" data-g="${g}" data-k="${k}" title="${ti}" aria-pressed="${cur===k}">${t}${cur===k?'<small> ▾</small>':''}</button>`;
  const TT_EL={n:'Nombre de parties',taux:'Taux de victoire',dk:'Part des decks qui contiennent cet élément'};
  if(!TT_EL[statsTriEl])statsTriEl='taux';if(!TT_EL[statsTriDuo])statsTriDuo='n';
  const TRI_ST={t:['golems.tri.stats',k=>statsTri=k],e:['golems.tri.statsEl',k=>statsTriEl=k],d:['golems.tri.statsDuo',k=>statsTriDuo=k]};
  function terrains(){
    let L=[...A.terr].map(([nom,o])=>{const T=M.TERRAINS.find(t=>t.nom===nom);return {nom,pts:T?T.pts|0:0,n:o.n,c:o.c,taux:pcSt(o.cv,o.c),moy:o.n?Math.round(10*o.q/o.n)/10:null,eg:pcSt(o.e,o.m)}}).filter(x=>x.n);
    const v=x=>x==null?-1:x;L.sort((a,b)=>v(b[statsTri])-v(a[statsTri])||a.nom.localeCompare(b.nom,'fr'));
    if(statsQ)L=L.filter(x=>okSt(x.nom));
    const th=(k,t,c)=>thTri('t',statsTri,k,t,c,TT_ST[k]);
    let h=tete('Terrains')+`<div class="st-th st-tht"><span>Terrain</span>${th('pts','Pts','c')}${th('taux','Vict.','r')}${th('moy','Moy.','r')}${th('eg','Égal.','r')}</div><div class="st-corps">`;
    if(!L.length)h+=`<div class="st-vide">${statsQ?VIDE_RECH:R.length?VIDE_ST:VIDE_FILTRES}</div>`;
    L.forEach(x=>h+=`<div class="st-lt" tabindex="0" role="button" data-t="${escSt(x.nom)}" aria-label="${escSt(x.nom)}"><span class="st-ps" title="${escSt(x.nom)} - ${pl(x.n,'partie')}">${hlSt(x.nom)}</span><span class="st-pz" data-ico="coupe">${x.pts}</span><span class="r">${tauxSt(x.taux,x.c)}</span><span class="r st-n">${x.moy==null?'-':x.moy.toFixed(1).replace('.',',')}</span><span class="r st-n">${x.eg==null?'-':x.eg+' %'}</span></div>`);
    return h+'</div>';
  }
  /* ---- Éléments : taux par élément puis duos ; Decks = part des decks qui le contiennent ---- */
  function elements(){
    const ge='st-gel',nd=Math.max(1,R.reduce((s,r)=>s+(/^golem-/.test(r.m)?1:2),0)),E=Object.keys(NOMS_EL_ST),tx=o=>o&&o.n?o.v/o.n:-1;
    const ligne=(ic,nom,o)=>`<div class="st-ln ${ge}"><span class="st-pk" data-els="${ic}"><span class="st-nm">${nom}</span></span><span class="r st-n">${o?o.n:0}</span><span class="r">${tauxSt(o?pcSt(o.v,o.n):null,o?o.n:0)}</span><span class="r st-n">${o?Math.round(100*o.n/nd):0} %</span></div>`;
    /* meme tri que les Terrains : decroissant, egalites par nom */
    const val=(o,k)=>k==='taux'?tx(o):o?o.n:0,tri=k=>(a,b)=>val(b.o,k)-val(a.o,k)||a.nom.localeCompare(b.nom,'fr');
    const ths=(g,cur)=>thTri(g,cur,'n','Parties','r',TT_EL.n)+thTri(g,cur,'taux','Vict.','r',TT_EL.taux)+thTri(g,cur,'dk','Decks','r',TT_EL.dk);
    let h=tete('Éléments')+`<div class="st-th ${ge}"><span>Élément</span>${ths('e',statsTriEl)}</div><div class="st-els1">`;
    if(!R.length)h+=`<div class="st-vide">${VIDE_FILTRES}</div>`;
    else E.map(e=>({e,nom:NOMS_EL_ST[e],o:A.els.get(e)})).sort(tri(statsTriEl)).forEach(x=>h+=ligne(x.e,x.nom,x.o));
    h+=`</div><div class="st-th st-sh2 ${ge}"><span>Duo</span>${ths('d',statsTriDuo)}</div><div class="st-els2">`;
    const D=[];for(let i=0;i<E.length;i++)for(let j=i+1;j<E.length;j++){const k=[E[i],E[j]].sort();D.push({k,nom:NOMS_EL_ST[k[0]]+' et '+NOMS_EL_ST[k[1]],o:A.duos.get(k.join('+'))})}
    if(R.length)D.sort(tri(statsTriDuo)).forEach(x=>h+=ligne(x.k.join(','),x.nom,x.o));
    return h+'</div>';
  }
  /* ---- Rendu des colonnes (la recherche ne redessine que les colonnes) ---- */
  function peintCols(){
    P[0].innerHTML=statsMode==='classees'?classement():statsMode==='amicales'?joueurs():robots();
    P[1].innerHTML=cartes();P[2].innerHTML=terrains();P[3].innerHTML=elements();
    g.querySelectorAll('[data-ico]').forEach(s=>s.prepend(ico(s.dataset.ico)));
    g.querySelectorAll('[data-els]').forEach(s=>s.dataset.els.split(',').filter(Boolean).reverse().forEach(e=>s.prepend(picto(e))));
    g.querySelectorAll('[data-av]').forEach(s=>{const x=(statsJoueurs||[]).find(y=>y.uid===s.dataset.av);if(x)s.prepend(avatarUid(x.p,x.uid))});
    const clic=(n,f)=>{n.onclick=f;n.onkeydown=e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();f()}}};
    g.querySelectorAll('.st-cl[data-uid]').forEach(n=>{const u=n.dataset.uid,C=(statsClasse&&statsClasse.liste||[]).find(x=>x.uid===u),J=(statsJoueurs||[]).find(x=>x.uid===u);
      clic(n,()=>ouvreProfil(statsMode==='classees'&&C?{uid:u,p:C.pseudo,v:C.v|0,n:(C.v|0)+(C.d|0)}:{uid:u,p:J?J.p:C?C.pseudo:'',v:J?J.v:0,n:J?J.n:0}))});
    g.querySelectorAll('.st-lc[data-id]').forEach(n=>{const c=CARTES.find(y=>y[0]===n.dataset.id),src=imgV('cartes/'+c[0]+'.jpg');clic(n,()=>{cacheApercu();dernier=n;zoom(src,c[1],statZoomCarte(c[0]))});n.onmouseenter=()=>montreApercu(n,src);n.onmouseleave=cacheApercu});
    g.querySelectorAll('.st-lt[data-t]').forEach(n=>{const T=M.TERRAINS.find(t=>t.nom===n.dataset.t);if(!T)return;clic(n,()=>zoomTerrain(T));n.onmouseenter=()=>montreApercu(n,srcTerrain(T));n.onmouseleave=cacheApercu});
    g.querySelectorAll('.st-tri').forEach(b=>b.onclick=()=>{const gr=b.dataset.g,k=b.dataset.k,T=TRI_ST[gr];T[1](k);ecrire(T[0],k);peintCols();const n=g.querySelector('.st-tri[data-g="'+gr+'"][data-k="'+k+'"]');if(n)n.focus()});
    g.querySelectorAll('.st-tric button').forEach((b,i)=>b.onclick=()=>{statsTriC=i;ecrire('golems.tri.statsCartes',String(i));peintCols();const n=g.querySelectorAll('.st-tric button')[i];if(n)n.focus()});
    g.querySelectorAll('[data-a]').forEach(b=>b.onclick=()=>{const a=b.dataset.a;if(a==='jouer')onglet('jouer');else{ouvrePseudo();if(a==='cree')modeCompte(true)}});
    if(statsAjuste)statsAjuste();
  }
  /* Hauteurs (PC) : Éléments garde sa hauteur naturelle, au moins jusqu'au bas de l'écran ; les 3 autres colonnes s'alignent ;
     listes en nombre entier de lignes visibles (l'espace restant est réparti entre les lignes). */
  statsAjuste=()=>{if(!g.isConnected||!g.offsetParent)return;
    const pE=P[3],sh=pE.querySelector('.st-sh2');P.forEach(p=>p.style.height='');if(sh)sh.style.marginTop='';
    P.slice(0,3).forEach(p=>{const c=p.querySelector('.st-corps');if(c){c.style.removeProperty('--L');c.style.removeProperty('--g')}});
    if(!matchMedia('(min-width:1200px)').matches)return;
    const nat=pE.offsetHeight,He=Math.max(nat,Math.floor(innerHeight-24-(g.getBoundingClientRect().top+scrollY)));
    if(sh)sh.style.marginTop=(10+He-nat)+'px';P.forEach(p=>p.style.height=He+'px');
    P.slice(0,3).forEach(p=>{const c=p.querySelector('.st-corps');if(!c)return;const H=c.clientHeight;
      if(c.querySelector('.st-lc,.st-lt')){const n=Math.floor((H+4)/48);if(n>1)c.style.setProperty('--g',((H-n*44)/(n-1))+'px')}
      else if(c.querySelector('.st-ln')){const n=Math.floor(H/44);if(n)c.style.setProperty('--L',(H/n)+'px')}
      c.classList.toggle('st-defile',c.scrollHeight>c.clientHeight+1)})};
  statsLarg=innerWidth;peintCols();
  if(document.fonts&&document.fonts.status!=='loaded')document.fonts.ready.then(()=>statsAjuste&&statsAjuste());
}
/* Fenêtre des récompenses de la saison (grande médaille centrée, comme FINAL_recompenses). */
function fenSaisonSt(S,sit,R){
  const L=(statsClasse||{liste:[]}).liste,nom=i=>L[i]?escSt(L[i].pseudo):'-',dt=ms=>new Date(ms).toLocaleDateString('fr-FR',{day:'numeric',month:'short',year:'numeric'});
  const nbT=Math.max(0,Math.min(7,L.length-3)),tu=sit.place&&sit.place>3&&sit.place<=10;
  const v=el('div','st-fd'),f=el('div','sc-fenetre st-fn');f.setAttribute('role','dialog');f.setAttribute('aria-modal','true');f.setAttribute('aria-label','Récompenses - '+S.titre);
  f.innerHTML=`<div class="st-fh">${medailleSt(S.id,2.3)}<div class="st-fnm">${escSt(S.titre)}</div><div class="st-fdt">${S.debut?'Du <b>'+dt(S.debut)+'</b> au ':'Jusqu’à '}<b>${S.fin?dt(S.fin):'la sortie de la 1.0'}</b>${S.fin?'':' (date à venir)'}</div><div class="st-fdt"><b>${R.length.toLocaleString('fr-FR')}</b> parties classées cette saison</div></div><div class="st-sep"><span>Récompenses</span></div>
  <div class="st-rw${sit.place===1?' toi':''}">${badgeSt('or',S.id,true)}<div><b>Champion de la saison ${S.id}</b><small>1re place du classement</small></div><div class="st-pl">Actuel<b title="${nom(0)}">${nom(0)}</b></div></div>
  <div class="st-rw${sit.place===2||sit.place===3?' toi':''}">${badgeSt('ar',S.id,true)}<div><b>Podium de la saison ${S.id}</b><small>2e et 3e places</small></div><div class="st-pl">Actuels<b title="${nom(1)}, ${nom(2)}">${nom(1)}, ${nom(2)}</b></div></div>
  <div class="st-rw${tu?' toi':''}">${badgeSt('br',S.id,true)}<div><b>Top 10 de la saison ${S.id}</b><small>4e à 10e places${tu?' - tu es '+sit.place+'e':''}</small></div><div class="st-pl">Places<b>${nbT} sur 10</b></div></div>
  <div class="st-rw">${badgeSt('pi',S.id,true)}<div><b>${S.id===0?'Médaille Pionnier':'Médaille de la saison '+S.id}</b><small>Placement fini (5 parties), pour tous :<br>le top 10 a aussi son écu</small></div><div class="st-pl">Statut<b class="${sit.fini?'st-ok':''}">${sit.fini?'Obtenu':sit.co?'Pas encore':'-'}</b></div></div>
  <p class="st-nt">Les récompenses s'affichent sur le profil. Classement figé à la fin de la saison.</p><div class="sc-fen-actions"><button class="sc-btn sc-secondaire sc-pousse" type="button">Fermer</button></div>`;
  const ferme=()=>{v.remove();document.removeEventListener('keydown',ech);const b=$('statsCorps').querySelector('.st-saison');if(b)b.focus()},ech=e=>{if(e.key==='Escape')ferme()};
  f.querySelector('.sc-fen-actions button').onclick=ferme;v.onclick=e=>{if(e.target===v)ferme()};document.addEventListener('keydown',ech);
  v.append(f);document.body.append(v);f.querySelector('.sc-fen-actions button').focus();
}
document.addEventListener('click',e=>{const m=document.querySelector('#statsCorps .st-pat-m:not([hidden])');if(m&&!m.parentNode.contains(e.target)){m.hidden=true;m.previousSibling.setAttribute('aria-expanded','false')}});
