/* Onglet Statistiques : archive commune, filtres, agregats, encart du zoom. */
/* Statistiques : archive commune resume/, calculs en direct, aucune donnee de joueur. */
let statsTri='taux',statsData=null,statsPatchs=null,statsJoueurs=[],statsProfils={};
/* Republication du profil du joueur connecte (au chargement, a la connexion) : les Statistiques l'attendent 3 s au plus avant de lire les profils. */
let profilPublie=null;
/* Filtre Adversaires : niveaux de l'ordinateur et parties entre joueurs, tous allumes par defaut, jamais tous eteints. */
const ADV_ST=[['facile','Facile','#6fd08c'],['normal','Normal','#f3d163'],['difficile','Difficile','#ea7a6c'],['ligne','Entre joueurs','#7fd8f5']];let statsAdv=new Set(ADV_ST.map(x=>x[0]));
const modeSt=r=>r.m==='ligne'?'ligne':String(r.m||'').replace(/^golem-/,'');
async function peintStats(){
  const z=$('statsCorps');
  if(!room||!room.litResumes){z.textContent='';z.append(el('p','pf-vide','Les statistiques ne sont pas disponibles pour le moment.'));return}
  if(!statsData){z.textContent='';z.append(el('p','pf-vide','Chargement des statistiques...'))}else dessineStats(statsData);
  try{statsJoueurs=room.litClassement?await room.litClassement().catch(()=>[]):[]}catch(e){statsJoueurs=[]}
  /* Resume public de chaque joueur classe : clic seulement si son profil est public. */
  if(profilPublie&&compteCo())await Promise.race([Promise.resolve(profilPublie).catch(()=>{}),new Promise(r=>setTimeout(r,3000))]);
  try{const pr=await Promise.all(statsJoueurs.filter(x=>x.n>=5).map(x=>room.compte.profilDe?room.compte.profilDe(x.uid).then(r=>[x.uid,r]):[x.uid,null]));statsProfils=Object.fromEntries(pr)}catch(e){statsProfils={}}
  try{statsData=uneParGraine((await room.litResumes(2000)).filter(r=>r&&typeof r.d==='number'&&(r.g===0||r.g===1||r.g===-1)))}catch(e){console.warn(e);if(!statsData){z.textContent='';z.append(el('p','pf-vide','Lecture impossible pour le moment.'))}return}
  if(!$('stats').hidden)dessineStats(statsData);
}
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
  const pl=n=>n+(n>1?' parties':' partie'),f=o=>o&&o.n?pl(o.n)+' · '+Math.round(100*o.v/o.n)+' % de victoires':'';
  const L=[{nom:'Toi',v:f(statsCartes().get(id))},{nom:'Communauté',v:''}],E=encartZoom(L);E.montre();
  agregZoom().then(a=>{if(!a)return;L[1].v=f(a.cartes.get(id));E.montre()});
  return [E.b];
}
function statZoomTerrain(T){
  const L=[{nom:'Communauté',v:''}],E=encartZoom(L);
  agregZoom().then(a=>{const o=a&&a.terr.get(T.nom);if(!o||!o.n)return;
    const pc=(v,n)=>n?Math.round(100*v/n)+' %':'-';
    L[0].v='Victoire du conquérant '+pc(o.cv,o.c)+' · '+String(Math.round(10*o.q/o.n)/10).replace('.',',')+' pts en moyenne · '+pc(o.e,o.m)+' d’égalités · '+o.m+(o.m>1?' manches':' manche');E.montre()});
  return [E.b];
}
/* Grille des Statistiques : 4 colonnes de meme largeur (2 de 641 a 1499 px, 1 au telephone).
   Colonne 1 : Joueurs puis Terrains, chacun a demi-hauteur ; puis Meilleures cartes, Cartes les plus jouees, Elements, de meme hauteur H.
   H = hauteur naturelle la plus grande des trois (10 cartes), verrouillee ; recalcul seulement quand la largeur change. */
let statsAjuste=null,statsLarg=0;addEventListener('resize',()=>{if(statsAjuste&&innerWidth!==statsLarg){statsLarg=innerWidth;statsAjuste()}});
/* Message vide des Statistiques : un seul texte, une seule classe (pf-vide). */
const VIDE_ST='Pas encore assez de parties.';
/* Meme classe, autre texte quand ce sont les filtres qui vident la liste. */
const VIDE_FILTRES='Aucune partie avec ces filtres.';
function dessineStats(RT){
  const z=$('statsCorps');z.textContent='';statsAjuste=null;
  if(!RT.length){const v=el('div','bloc');v.append(el('p','pf-vide',VIDE_ST),el('p','pf-note','Les statistiques apparaîtront dès les premières parties terminées par des joueurs connectés avec un compte, contre un Golem ou en ligne.'));z.append(v);return}
  /* Patchs coches : tous par defaut. */
  const vers=versStats(RT);if(!statsPatchs||![...statsPatchs].some(v=>vers.includes(v)))statsPatchs=new Set(vers);
  const R=uneParGraine(RT).filter(r=>statsPatchs.has(patchSite(r.v))&&statsAdv.has(modeSt(r)));
  /* Liste videe par les filtres : meme classe, texte des filtres (Joueurs, Cartes, Elements). */
  const VIDE_R=R.length?VIDE_ST:VIDE_FILTRES;
  const pc=(v,n)=>n?Math.round(100*v/n):null,coul=p=>p===null?'var(--doux)':p>55?'#3ecf6e':p>=45?'#f0a030':'#ef4f4f',txt=p=>p===null?'-':p+' %';
  const pl2=(n,m)=>n+' '+m+(n>1?'s':''),rangTx=i=>i+(i===1?'er':'e');
  const NOMS_EL=NOMS_EL_ST;
  const {cartes,els,duos,terr,pj,pv,golem,ab}=agregeStats(R);
  const g=el('div','st-g4'),pile=el('div','st-pile');g.append(pile);
  const panneau=(dans,cle,titre,note)=>{const c=el('div','bloc st-col st-p'),h=el('div','st-ph');c.dataset.p=cle;h.append(el('h3','st-h',titre));c.append(h);if(note)c.append(el('p','pf-note st-sous',note));dans.append(c);return {c,h}};
  const sous=(c,t)=>c.append(el('h4','st-sh',t)),vide=c=>c.append(el('p','pf-vide',VIDE_R));
  const plie=()=>matchMedia('(min-width:641px)').matches; /* plusieurs colonnes : hauteurs verrouillees */
  const norm=s=>String(s).normalize('NFD').replace(/[̀-ͯ]/g,'').toLowerCase();
  /* Liste de panneau : k lignes (10 au plus ; Joueurs et Terrains : ce qui tient dans la demi-hauteur).
     En-tete : titre, bouton Voir tout (gris ; inactif si tout tient ; bleu « Reduire » une fois deplie), puis recherche pleine largeur.
     Liste complete a l'interieur du panneau (defilement, taille inchangee) ; recherche sans accents ni majuscules sur o.tous, rang reel. */
  const listeP=(P,items,ligne,o)=>{
    const tout=el('button','pastille st-tout','Voir tout'),champ=el('input','st-rech');tout.type='button';
    champ.type='search';champ.placeholder=o.rech;champ.setAttribute('aria-label',o.rech);champ.autocomplete='off';
    P.h.append(tout);P.h.after(champ);
    const corps=el('div','st-corps'),pied=el('div','st-pied');P.c.append(corps,pied);
    const bas=()=>corps.classList.toggle('st-bas',corps.scrollTop+corps.clientHeight>=corps.scrollHeight-2);corps.onscroll=bas;
    let k=10,ouvert=false,q='',hPlie=0;
    const fixe=()=>!(o.demi&&plie());
    const peint=()=>{corps.textContent='';pied.textContent='';
      const L=q?(o.tous||items).filter(x=>norm(x.cle).includes(q)):ouvert?items:items.slice(0,k),libre=!!q||ouvert;
      corps.classList.toggle('st-defile',libre);corps.style.height=libre&&fixe()&&hPlie?hPlie+'px':'';
      if(o.entete)corps.append(o.entete());
      if(!items.length&&!q)corps.append(el('p','pf-vide',o.vide));else if(q&&!L.length)corps.append(el('p','pf-vide',o.aucun));
      L.forEach(x=>{const n=ligne(x);if(n)corps.append(n)});
      {const rien=items.length<=k;tout.disabled=rien;if(rien)tout.title='Toute la liste est déjà affichée';else tout.removeAttribute('title')}
      tout.textContent=ouvert?'Réduire':'Voir tout';tout.setAttribute('aria-pressed',String(ouvert));
      if(o.piedPlus)o.piedPlus(pied,{q,ouvert,k});
      pied.hidden=!pied.childNodes.length;bas();
    };
    champ.oninput=()=>{q=norm(champ.value.trim());peint();corps.scrollTop=0;bas()};
    tout.onclick=()=>{if(q){champ.value='';q='';ouvert=true}else ouvert=!ouvert;peint();corps.scrollTop=0;bas()};
    o.repeint=peint;
    /* Mesure en deux temps : etat replie naturel (hauteur H), puis lignes qui tiennent et etat courant. */
    const mesure=()=>{const s=[ouvert,q];ouvert=false;q='';k=10;corps.style.height='';peint();return s};
    const finit=s=>{if(o.demi&&plie())while(k>1&&corps.scrollHeight>corps.clientHeight+1){k--;peint()}hPlie=corps.offsetHeight;[ouvert,q]=s;peint()};
    return {mesure,finit};
  };
  const listes=[];
  /* Joueurs : classement public (toutes les parties de chacun), 5 parties minimum.
     Filtre Adversaires : parties par niveau du profil public (o), entre joueurs = le reste ; profil prive ecarte.
     Filtre Patch : detail par version du profil public (pv) ; profil prive ecarte, profil sans ce detail (pas encore republie) ecarte aussi.
     Recherche : classes, puis joueurs a moins de 5 parties (avec ces filtres), mention « moins de 5 parties ». */
  {const P=panneau(pile,'j','Joueurs','Taux de victoire, 5 parties minimum'),tousAdv=ADV_ST.every(([k])=>statsAdv.has(k)),tousPatchs=vers.every(v=>statsPatchs.has(v));let prives=0,anciens=0,peu=0;
   const surF=[tousPatchs?'':statsPatchs.size>1?'sur ces patchs':'sur ce patch',tousAdv?'':'contre ces adversaires'].filter(Boolean).join(' ');
   const parPatch=rp=>{if(rp&&rp.m===true){prives++;return null}const pv=rp&&rp.pv?Object.values(rp.pv):[];if(!pv.length){anciens++;return null}
     const f={n:0,v:0};pv.forEach(z=>{if(!z||!statsPatchs.has(z.p)||!Number.isInteger(z.n))return;const zv=Number.isInteger(z.v)?z.v:0;
       if(tousAdv){f.n+=z.n;f.v+=zv;return}const o=resumeLu({o:z.o}).o,g={n:0,v:0};NIV_ORDI.forEach(([k])=>{g.n+=o[k].n;g.v+=o[k].v});
       o.ligne={n:Math.max(0,z.n-g.n),v:Math.max(0,zv-g.v)};statsAdv.forEach(k=>{if(o[k]){f.n+=o[k].n;f.v+=o[k].v}})});return f};
   const parAdv=x=>{if(tousAdv&&tousPatchs)return {n:x.n,v:x.v};const rp=statsProfils[x.uid];if(!tousPatchs)return parPatch(rp);if(!rp||rp.m===true||!rp.o){prives++;return null}
     const o=resumeLu(rp).o,g={n:0,v:0};NIV_ORDI.forEach(([k])=>{g.n+=o[k].n;g.v+=o[k].v});o.ligne={n:Math.max(0,(rp.n|0)-g.n),v:Math.max(0,(rp.v|0)-g.v)};
     const f={n:0,v:0};statsAdv.forEach(k=>{if(o[k]){f.n+=o[k].n;f.v+=o[k].v}});return f};
   const tri=(a,b)=>b.pct-a.pct||b.n-a.n||a.p.localeCompare(b.p,'fr');
   const F=(statsJoueurs||[]).filter(x=>x.n>=5).map(x=>{const f=parAdv(x);return f&&{...x,...f,pct:pc(f.v,f.n)}}).filter(Boolean);
   const J=F.filter(x=>{if(x.n<5)peu++;return x.n>=5}).sort(tri);J.forEach((x,i)=>{x.rang=i+1;x.cle=x.p});
   /* Moins de 5 parties : avec ces filtres (detail du profil), ou au total quand tout est coche. */
   const P5=F.filter(x=>x.n>0&&x.n<5).concat(tousAdv&&tousPatchs?(statsJoueurs||[]).filter(x=>x.n>0&&x.n<5).map(x=>({...x,pct:pc(x.v,x.n)})):[]).sort(tri).map(x=>({...x,rang:null,peu:true,cle:x.p}));
   const moi=compteCo()?J.find(x=>x.uid===room.compte.uid()):null;
   const ligneJ=(x,toi)=>{const li=el('div','st-r st-jl'+(toi?' st-toi':'')),gch=el('span','st-g'),dr=el('span','st-d'),t=el('b','st-pc',txt(x.pct));t.style.color=coul(x.pct);
     gch.append(el('span','st-rang',toi?'':x.rang?String(x.rang):'-'),avatarUid(x.p,x.uid),el('span','st-ps',toi?'Toi : '+rangTx(x.rang):x.p));if(x.peu)gch.append(el('span','st-peu','moins de 5 parties'));
     dr.append(el('span','st-np',pl2(x.n,'partie')),t);li.append(gch,dr);
     if(x===moi&&!toi)li.classList.add('st-moi');
     li.tabIndex=0;const fi=el('div','st-fiche'),ft=el('div','st-ft'),fv=el('b','',txt(x.pct));fv.style.color=coul(x.pct);
     ft.append(avatarUid(x.p,x.uid),el('b','st-fp',x.p));fi.append(ft,el('p',''),el('p',''),el('p',''));
     fi.children[1].append('Taux de victoire : ',fv);fi.children[2].textContent=pl2(x.v,'victoire')+', '+pl2(x.n-x.v,'défaite');fi.children[3].textContent=pl2(x.n,'partie');li.append(fi);
     const rp=statsProfils[x.uid],moiJ=compteCo()&&x.uid===room.compte.uid();
     if(rp&&rp.m===true&&!moiJ)fi.append(el('p','st-fprive','Profil privé'));
     if(moiJ||rp){li.classList.add('st-jclic');li.setAttribute('role','button');li.setAttribute('aria-label','Profil de '+x.p+(x.rang?', '+rangTx(x.rang):''));
       li.onclick=()=>ouvreProfil({uid:x.uid,p:x.p,v:x.v,n:x.n});li.onkeydown=e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();li.onclick()}}}
     return li};
   listes.push(listeP(P,J,x=>ligneJ(x,false),{demi:true,tous:J.concat(P5),rech:'Chercher un joueur',aucun:'Aucun joueur à ce nom.',
     vide:VIDE_R,
     piedPlus:(pd,s)=>{if(moi&&!s.q&&!s.ouvert&&moi.rang>s.k)pd.append(ligneJ(moi,true));
       if(peu)pd.append(el('p','pf-note',pl2(peu,'joueur')+' avec moins de 5 parties '+surF+'.'));
       if(prives)pd.append(el('p','pf-note',pl2(prives,'joueur')+' au profil privé, non '+(prives>1?'comptés':'compté')+' avec ce filtre.'));
       if(anciens)pd.append(el('p','pf-note',pl2(anciens,'joueur')+' pas encore à jour, non '+(anciens>1?'comptés':'compté')+' avec ce filtre.'))}}));}
  /* Terrains : tableau triable, en-tete fixe en haut de la liste. */
  {const P=panneau(pile,'t','Terrains',null);
   const cols=[['nom','Terrain','Nom du terrain'],['taux','Victoire',"Taux de victoire du conquérant : part des conquêtes de ce terrain où le joueur qui le remporte gagne aussi la partie."],['pts','Pts',"Points moyens : points rapportés par ce terrain en moyenne sur une partie."],['eg','Égalités',"Égalités : part des manches où les deux joueurs ont la même Force, personne ne marque."]];
   const L=[...terr].map(([nom,o])=>({nom,cle:nom,n:o.n,taux:pc(o.cv,o.c),pts:o.n?Math.round(10*o.q/o.n)/10:null,conq:pc(o.c,o.m),eg:pc(o.e,o.m)}));
   const v=x=>x===null?-1:x,trie=()=>L.sort((a,b)=>statsTri==='nom'?a.nom.localeCompare(b.nom,'fr'):v(b[statsTri])-v(a[statsTri])||a.nom.localeCompare(b.nom,'fr'));trie();
   const o={demi:true,rech:'Chercher un terrain',aucun:'Aucun terrain à ce nom.',vide:VIDE_ST};
   o.entete=()=>{const h=el('div','st-tl st-th');cols.forEach(([k,t,d])=>{const b=el('button','st-tri'+(statsTri===k?' actif':''),t+(statsTri===k?(k==='nom'?' ▲':' ▼'):''));b.setAttribute('aria-pressed',statsTri===k);b.type='button';b.title=d;b.setAttribute('aria-label','Trier par '+d.split(' :')[0].toLowerCase());b.onclick=()=>{statsTri=k;trie();o.repeint()};h.append(b)});return h};
   const ligneT=x=>{const r=el('div','st-tl'),t=el('b','',txt(x.taux)),TT=M.TERRAINS.find(T=>T.nom===x.nom);if(TT){r.classList.add('st-tc');r.tabIndex=0;r.onmouseenter=()=>montreApercu(r,srcTerrain(TT));r.onmouseleave=cacheApercu;r.onclick=()=>zoomTerrain(TT);r.onkeydown=e=>{if(e.key==='Enter')zoomTerrain(TT)}}t.style.color=coul(x.taux);const nm=el('span','st-tn',x.nom);nm.title=pl2(x.n,'partie');
     r.append(nm,t,el('span','',x.pts===null?'-':String(x.pts).replace('.',',')),el('span','',txt(x.eg)));return r};
   listes.push(listeP(P,L,ligneT,o));}
  /* Ligne de carte compacte (comme le profil), apercu au survol, zoom au clic ; rang reel, « moins de 10 parties » hors classement. */
  const ligneC=x=>{const id=x.id,n=x.n,p=x.p,c=CARTES.find(y=>y[0]===id),C=M.CARTES[id];if(!c||!C)return null;
    const li=el('div','pf-item pf-mvps st-carte'),q=el('button','dl-ligne'),fo=el('span','dl-force'),e=el('span','dl-els'),src=imgV('cartes/'+c[0]+'.jpg');q.type='button';
    if(c[2].length===2){q.classList.add('dl-duo');q.style.setProperty('--a','var(--fm-'+c[2][0]+')');q.style.setProperty('--b','var(--fm-'+c[2][1]+')')}else if(estAnimal(c))q.classList.add('dl-animal')
    const co=el('span','dl-cout');co.append(ico('enclume'),String(C.cout));{const f=forceAff(C);if(f!=null){fo.append(ico('force'),f);if(f.includes(','))fo.classList.add('dl-dec')}}c[2].forEach(y=>e.append(picto(y)));
    const v=c[1].indexOf(', '),nm=el('span','dl-nom');nm.append(el('span','dl-pseudo',v<0?c[1]:c[1].slice(0,v)));
    if(v>=0){const ti=el('span','dl-titre',c[1].slice(v+2));ti.style.color=coulT(c);nm.append(ti)}
    if(estAnimal(c)){fo.className='dl-force dl-mot';fo.textContent='Animal';q.append(co,fo,nm)}else q.append(co,fo,e,nm);q.setAttribute('aria-label',c[1]+', '+pl2(n,'partie')+(p===null?'':', '+p+' % de victoires'));
    q.onclick=()=>{cacheApercu();dernier=q;zoom(src,c[1])};q.onmouseenter=()=>montreApercu(q,src);q.onmouseleave=cacheApercu;
    const s=el('div','pf-dst'),t=el('b','pf-dt',txt(p));t.style.color=coul(p);
    if(x.rang)s.append(el('span','pf-dk st-rg',rangTx(x.rang)+' · '));s.append(t,el('span','pf-dk',' de victoires · '+pl2(n,'partie')));if(x.peu)s.append(el('span','pf-peu','moins de '+MIN_CARTES+' parties'));
    li.append(q,s);return li};
  const MIN_CARTES=10; /* 0.4a : seuil des cartes (Meilleures cartes), distinct des joueurs (5) */
  const lc=[...cartes].map(([id,o])=>{const c=CARTES.find(y=>y[0]===id);return {id,n:o.n,p:pc(o.v,o.n),cle:c?c[1]:id}});
  {const P=panneau(g,'m','Meilleures cartes','Taux de victoire, '+MIN_CARTES+' parties minimum');
   const tv=lc.filter(x=>x.n>=MIN_CARTES).sort((a,b)=>b.p-a.p||b.n-a.n).map((x,i)=>({...x,rang:i+1}));
   const p5=lc.filter(x=>x.n<MIN_CARTES).sort((a,b)=>b.p-a.p||b.n-a.n).map(x=>({...x,rang:null,peu:true}));
   listes.push(listeP(P,tv,ligneC,{tous:tv.concat(p5),rech:'Chercher une carte',aucun:'Aucune carte à ce nom.',vide:R.length?'Il faut au moins '+MIN_CARTES+' parties par carte.':VIDE_FILTRES}));}
  {const P=panneau(g,'p','Cartes les plus jouées','Nombre de parties où elle est jouée');
   const lp=lc.slice().sort((a,b)=>b.n-a.n||b.p-a.p).map((x,i)=>({...x,rang:i+1}));
   listes.push(listeP(P,lp,ligneC,{rech:'Chercher une carte',aucun:'Aucune carte à ce nom.',vide:VIDE_R}));}
  /* Elements : taux par element puis duos les plus joues, dans le meme panneau (sans Voir tout ni recherche). */
  {const P=panneau(g,'e','Éléments',null),c=P.c,l=[...els].map(([e,o])=>({e,n:o.n,p:pc(o.v,o.n)}));
   const barre=(nom,n,p,ic,u)=>{const li=el('div','pf-barre pf-item'),h=el('div','pf-bh'),j=el('div','pf-jauge'),f=el('i'),b=el('b','',txt(p)),s=el('span','st-bn');
    if(ic)ic.forEach(x=>s.append(picto(x)));s.append(nom);b.style.color=coul(p);h.append(s,b);f.style.width=(p||0)+'%';f.style.background=coul(p);j.append(f);
    li.append(h,j,el('div','pf-dk pf-np',pl2(n,u||'partie')));return li};
   sous(c,'Taux de victoire par élément');if(!l.length)vide(c);
   l.slice().sort((a,b)=>b.p-a.p||b.n-a.n).forEach(x=>c.append(barre(NOMS_EL[x.e],x.n,x.p,[x.e])));
   sous(c,'Duos les plus joués');
   const d=[...duos].sort((a,b)=>b[1].n-a[1].n).slice(0,10);if(!d.length)vide(c);
   const u2=el('ul','pf-liste st-liste');d.forEach(([k,o])=>{const [a,b]=k.split('+'),li=el('li'),s=el('span','st-bn'),p=pc(o.v,o.n),t=el('b','',txt(p)+' · '+pl2(o.n,'partie'));
     s.append(picto(a),picto(b),NOMS_EL[a]+' et '+NOMS_EL[b]);li.append(s,t);u2.append(li)});if(d.length)c.append(u2);}
  /* Bandeau Parties : barre de filtres (Patch, Adversaires) puis chiffres cles en tuiles */
  const ban=el('div','bloc st-bandeau');ban.append(el('h3','st-h','Parties'));
  {const fb=el('div','st-filtres'),g1=el('div','st-fg'),g2=el('div','st-fg');
   const dd=el('details','st-dd'),sm=el('summary'),lst=el('div','st-ddl');sm.setAttribute('aria-label','Patchs comptés');
   const resume=()=>{sm.textContent=statsPatchs.size===1?'v'+[...statsPatchs][0]:vers.every(v=>statsPatchs.has(v))?'Tous les patchs':statsPatchs.size+' patchs'};resume();
   vers.forEach(v=>{const lb=el('label','st-ddc'),cb=el('input');cb.type='checkbox';cb.checked=statsPatchs.has(v);
     cb.onchange=()=>{if(!cb.checked&&statsPatchs.size<2){cb.checked=true;return}cb.checked?statsPatchs.add(v):statsPatchs.delete(v);dessineStats(RT);const n=$('statsCorps').querySelector('.st-dd');if(n){n.open=true;n.querySelector('summary').focus()}};
     lb.append(cb,'v'+v);lst.append(lb)});
   dd.append(sm,lst);g1.append(el('span','st-fl','Patch'),dd);
   const bt=el('div','st-advs');ADV_ST.forEach(([k,t,c])=>{const b=el('button','pastille st-adv',t);b.type='button';b.style.setProperty('--c',c);b.setAttribute('aria-pressed',String(statsAdv.has(k)));
     b.onclick=()=>{if(statsAdv.has(k)){if(statsAdv.size<2)return;statsAdv.delete(k)}else statsAdv.add(k);dessineStats(RT);const n=$('statsCorps').querySelector('.st-adv[data-k="'+k+'"]');if(n)n.focus()};b.dataset.k=k;bt.append(b)});
   g2.append(el('span','st-fl','Adversaires'),bt);fb.append(g1,g2);ban.append(fb);
  }
  {const tu=el('div','st-tuiles'),tuile=(n,t,col)=>{const s=el('div','pf-tuile'),b=el('b','',String(n));if(col)b.style.color=col;s.append(b,t instanceof Node?t:el('span','',t));return s};
   const p1=pc(pv,pj),ce=p=>p===null?'':Math.abs(p-50)<=3?'#3ecf6e':Math.abs(p-50)<=8?'#f0a030':'#ef4f4f';
   const ligne=R.filter(r=>r.m==='ligne').length;
   /* Victoires contre l'ordinateur : camp du joueur (0) contre chaque niveau. */
   const to=el('div','pf-tuile st-ordi'),tr=el('div','st-trois');
   ADV_ST.slice(0,3).forEach(([k,t,c])=>{const a=R.filter(r=>r.m==='golem-'+k&&r.g!==-1),p=pc(a.filter(r=>r.g===0).length,a.length),b=el('b','',txt(p));b.style.color=c;b.title=t+' : '+pl2(a.length,'partie');tr.append(b)});
   to.append(tr,el('span','',"Victoires contre l'ordinateur"));
   const l1=el('span','');l1.append('Victoires du 1',Object.assign(document.createElement('sup'),{textContent:'er'}),' joueur');
   tu.append(tuile(R.length,R.length>1?'Parties':'Partie'),tuile(ligne,'Parties entre joueurs'),to,tuile(txt(p1),l1,ce(p1)),tuile(txt(pc(ab,R.length)),'Abandons'));
   ban.append(tu);}
  z.append(ban,g);
  /* Hors de la grille : sinon le message prendrait une rangee de hauteur H. */
  if(!R.length)g.before(el('p','pf-vide',VIDE_FILTRES));
  /* Apres mise en page : H mesuree puis verrouillee, Joueurs et Terrains gardent les lignes qui tiennent.
     H minimale = grille avec 10 cartes : pendant la mesure, Meilleures cartes est completee par des lignes de carte invisibles (messages masques), retirees ensuite. */
  const sonde=()=>{const c=g.querySelector('[data-p=m] .st-corps'),id=(CARTES.find(x=>M.CARTES[x[0]])||[])[0];if(!c||!id)return ()=>{};
    const caches=[...c.children].filter(x=>!x.classList.contains('st-carte')),aj=[];caches.forEach(x=>x.style.display='none');
    for(let i=c.querySelectorAll('.st-carte').length;i<10;i++){const n=ligneC({id,n:1,p:50,rang:1});if(!n)break;n.style.visibility='hidden';n.setAttribute('aria-hidden','true');c.append(n);aj.push(n)}
    return ()=>{aj.forEach(x=>x.remove());caches.forEach(x=>x.style.display='')}};
  statsAjuste=()=>{if(!g.isConnected||!g.offsetParent)return;g.style.gridAutoRows='';const S=listes.map(x=>x.mesure());
    if(plie()){const fin=sonde(),H=Math.max(...['m','p','e'].map(k=>g.querySelector('[data-p='+k+']').offsetHeight));fin();g.style.gridAutoRows=H+'px'}
    listes.forEach((x,i)=>x.finit(S[i]))};
  statsLarg=innerWidth;statsAjuste();
}
document.addEventListener('click',e=>{const d=document.querySelector('#statsCorps .st-dd[open]');if(d&&!d.contains(e.target))d.open=false});
