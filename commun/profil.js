/* Profil joueur : cumuls, resume publie, fenetre de profil. */
/* Profil joueur : resume calcule sur TOUTES les parties d'un compte (cumuls joueurs/{uid}/cumul, tenus a jour a chaque partie),
   sur l'historique de l'appareil (50 dernieres parties) pour un invite.
   Le meme resume est publie (profils/{uid}) : la fenetre d'un autre joueur affiche exactement ses chiffres. */
const NIV_ORDI=[['facile','#6fd08c'],['normal','#f3d163'],['difficile','#ea7a6c']];
/* Cumuls (texte JSON ecrit par salon-firebase.js) : f format, n parties, v victoires, d defaites, s serie signee
   (sd : date de la partie qui l'a fixee), k parties comptees, tables de lignes [cle, parties, victoires, rang, ...] :
   dk decks (+ elements), c cartes, mv MVP (nom), a adversaires, ve versions du moteur (+ parties et victoires contre
   l'ordinateur facile, normal, difficile). Rang = ordre de derniere apparition, il departage les egalites comme avant.
   ids : cles des 100 dernieres parties comptees ; une partie deja comptee (meme graine) ne l'est jamais une seconde fois.
   Renvoie de nouveaux cumuls si une partie de l est nouvelle, sinon null ; c n'est jamais modifie. */
const CUMUL_IDS=100,CUMUL_MAX=300;
/* 0.6.2 : compteurs complets PAR MODE (classee, amicale, entrainement) et PAR NIVEAU du robot (facile, normal, difficile), dans c.md
   (tenus a chaque partie, publies dans profils/<uid>/pm). Un compteur : n parties, v victoires, d defaites, b meilleure serie, s serie en cours
   (sd : date de la partie qui l'a fixee), r 10 dernieres (V D N), el parties par element, dk [nom, parties, victoires, elements],
   c [carte, parties, victoires], mv [carte, fois MVP]. md.k = c.k au dernier calcul : s'il differe (parties ajoutees par un site 0.6),
   n, v, d sont recalcules depuis les totaux (mdCompte), les tops gardes.
   Comptes anciens : n, v, d exacts reconstruits depuis les totaux du cumul (a : parties et victoires contre chaque niveau du robot),
   le profil classe (ctx.cl = classe/joueurs/<uid>) et les classees contre le robot (historique, ou ctx.rob lu dans classe/parties) ;
   decks, cartes, MVP et elements des anciennes parties restent au total (c.dk, c.c, c.mv), la repartition part des nouvelles parties. */
const MD_CLES=['classee','amicale','entrainement','facile','normal','difficile'],MD_MAX=120;
function mdVide(){return {n:0,v:0,d:0,b:0,s:0,sd:0,r:'',el:{},dk:[],c:[],mv:[]}}
function mdCles(x){const m=pfModeDe(x),n=pfNiveauDe(x);return m==='entrainement'&&n?[m,n]:[m]}
/* Serie, meilleure serie, 10 dernieres : une partie arrivee en retard (plus ancienne) ne les change pas. */
function mdSerie(X,x){const w=x.res==='Victoire',l=x.res==='Défaite',dt=+x.date||0;if(dt<X.sd)return;X.sd=dt;
  X.s=w?(X.s>0?X.s+1:1):l?(X.s<0?X.s-1:-1):0;if(X.s>X.b)X.b=X.s;X.r=(X.r+(w?'V':l?'D':'N')).slice(-10)}
function mdPartie(X,x,idMvp){const w=x.res==='Victoire';X.n++;if(w)X.v++;else if(x.res==='Défaite')X.d++;mdSerie(X,x);
  const ordre=window.GolemsDonnees.interface.elements.ordre,d=x.deck||{},els=(Array.isArray(d.els)?d.els:[]).filter(y=>ordre.includes(y)).slice(0,5);
  els.forEach(y=>{X.el[y]=(X.el[y]|0)+1});
  const add=(k,cle,ex)=>{let e=X[k].find(z=>z[0]===cle);if(!e){e=k==='mv'?[cle,0]:[cle,0,0];X[k].push(e)}e[1]++;if(w&&k!=='mv')e[2]++;if(ex!==undefined)e[3]=ex};
  if(typeof d.nom==='string'&&d.nom)add('dk',d.nom.slice(0,40),els.join(','));
  {let t=typeof d.cartes==='string'?d.cartes:'';try{if(!t&&d.nom==='Test')t=deckDefautTxt(vPartie(x))}catch(e){}
   const ids=new Set(),re=/([0-9]{3}e?)[1-3]/g;let r;while((r=re.exec(t)))ids.add(r[1]);ids.forEach(id=>add('c',id))}
  if(typeof x.mvp==='string'&&x.mvp){const id=idMvp[x.mvp];if(id)add('mv',id)}
  ['dk','c','mv'].forEach(k=>{if(X[k].length>MD_MAX)X[k]=X[k].sort((a,b)=>b[1]-a[1]).slice(0,MD_MAX)})}
function mdIdMvp(){const o={};try{Object.values(M.CARTES).forEach(C=>{o[C.base?M.CARTES[C.base].nom+' ('+C.nom+')':C.nom]=C.base||C.id})}catch(e){}return o}
/* n, v, d de chaque compteur depuis les totaux du cumul o (parties deja comptees) ; h0 = parties de l'historique deja comptees. */
function mdCompte(o,h0,ctx,prev){
  const md={k:o.k};MD_CLES.forEach(k=>{md[k]=prev&&prev[k]&&typeof prev[k]==='object'?{...mdVide(),...prev[k],n:0,v:0,d:0}:mdVide()});
  const niv=['facile','normal','difficile'],A=Array.isArray(o.a)?o.a:[];
  /* Contre chaque niveau du robot, toutes parties (entrainement + classees contre le robot) : table a, a defaut ve. */
  const tot={};niv.forEach((k,i)=>{const e=A.find(z=>Array.isArray(z)&&z[0]==='Golem ('+k+')');
    if(e)tot[k]={n:e[1]|0,v:e[2]|0};else{tot[k]={n:0,v:0};(o.ve||[]).forEach(z=>{if(Array.isArray(z)){tot[k].n+=z[4+2*i]|0;tot[k].v+=z[5+2*i]|0}})}});
  /* Classees contre le robot par niveau : ctx.rob (classe/parties) si fourni, sinon l'historique. */
  const rob={};niv.forEach(k=>{rob[k]={n:0,v:0}});
  if(ctx&&ctx.rob)niv.forEach(k=>{const z=ctx.rob[k];if(z){rob[k].n=z.n|0;rob[k].v=z.v|0}});
  else h0.forEach(x=>{if(pfModeDe(x)!=='classee')return;const m=/^Golem \((facile|normal|difficile)\)$/.exec(String(x.adv||''));if(m){rob[m[1]].n++;if(x.res==='Victoire')rob[m[1]].v++}});
  const cl=ctx&&ctx.cl&&Number.isFinite(ctx.cl.v)?{n:(ctx.cl.v|0)+(ctx.cl.d|0),v:ctx.cl.v|0,d:ctx.cl.d|0}:(()=>{const L=h0.filter(x=>pfModeDe(x)==='classee');return {n:L.length,v:L.filter(x=>x.res==='Victoire').length,d:L.filter(x=>x.res==='Défaite').length}})();
  Object.assign(md.classee,cl);
  const E=md.entrainement;
  niv.forEach(k=>{const X=md[k];X.n=Math.max(0,tot[k].n-rob[k].n);X.v=Math.max(0,Math.min(X.n,tot[k].v-rob[k].v));X.d=X.n-X.v;E.n+=X.n;E.v+=X.v;E.d+=X.d});
  const A2=md.amicale;A2.n=Math.max(0,(o.n|0)-E.n-cl.n);A2.v=Math.max(0,(o.v|0)-E.v-cl.v);
  /* Matchs nuls (avant 0.2.1) : n - v - d du cumul. Defaites restantes negatives = ces nuls etaient contre le robot. */
  const dA=(o.d|0)-E.d-cl.d;A2.d=Math.max(0,Math.min(dA,A2.n-A2.v));let trop=Math.max(0,-dA);
  niv.forEach(k=>{const X=md[k],t=Math.min(trop,X.d);X.d-=t;E.d-=t;trop-=t});
  /* Series et 10 dernieres : historique (parties deja comptees), meilleure serie jamais en baisse. */
  const vu={};h0.filter(x=>x&&(x.res==='Victoire'||x.res==='Défaite'||x.res==='Match nul')).sort((a,b)=>(+a.date||0)-(+b.date||0)).forEach(x=>mdCles(x).forEach(k=>{
    if(!vu[k]){vu[k]=1;const P=md[k],b=P.b|0;Object.assign(P,{s:0,sd:0,r:''});P.b=b}mdSerie(md[k],x)}));
  return md;
}
function cumulAjoute(c,l,ctx){
  const ok=!!(c&&typeof c==='object'&&c.f===1);
  const o=ok?JSON.parse(JSON.stringify(c)):{f:1,n:0,v:0,d:0,s:0,sd:0,k:0,dk:[],c:[],mv:[],a:[],ve:[],ids:[]};
  ['n','v','d','s','sd','k'].forEach(k=>{if(!Number.isFinite(o[k]))o[k]=0});
  ['dk','c','mv','a','ve','ids'].forEach(k=>{if(!Array.isArray(o[k]))o[k]=[]});
  const gr=id=>{const m=/^(-?[0-9]{1,12})-[0-9]{10,14}$/.exec(id);return m?m[1]:id};
  const vus=new Set(o.ids.map(gr)),nv=[],h0=[];
  (l||[]).forEach(x=>{if(!x||typeof x!=='object')return;if(typeof x.id!=='string'||!x.id){if(!ok)nv.push(x);return}
    const g=gr(x.id);if(vus.has(g)){if(!nv.includes(x))h0.push(x);return}vus.add(g);nv.push(x)});
  const mdOk=o.md&&typeof o.md==='object'&&o.md.k===o.k;
  if(!nv.length&&mdOk)return null;
  if(!mdOk)o.md=o.k?mdCompte(o,h0,ctx,o.md):(()=>{const m={k:0};MD_CLES.forEach(k=>{m[k]=mdVide()});return m})();
  {const idM=mdIdMvp();nv.slice().sort((a,b)=>(+a.date||0)-(+b.date||0)).forEach(x=>mdCles(x).forEach(k=>mdPartie(o.md[k],x,idM)))}
  if(!nv.length)return o;
  const T={};['dk','c','mv','a','ve'].forEach(k=>{T[k]=new Map(o[k].filter(e=>Array.isArray(e)&&typeof e[0]==='string').map(e=>[e[0],e]))});
  nv.sort((a,b)=>(+a.date||0)-(+b.date||0)).forEach(x=>{
    const w=x.res==='Victoire',q=++o.k*1000,d=x.deck;
    o.n++;if(w)o.v++;else if(x.res==='Défaite')o.d++;
    /* Serie signee : +k victoires ou -k defaites d'affilee ; une partie arrivee en retard (plus ancienne) ne la change pas. */
    {const dt=+x.date||0;if(dt>=o.sd){o.sd=dt;o.s=w?(o.s>0?o.s+1:1):x.res==='Défaite'?(o.s<0?o.s-1:-1):0}}
    const add=(k,cle,pos)=>{let e=T[k].get(cle);if(!e){e=[cle,0,0,0];T[k].set(cle,e)}e[1]++;if(w)e[2]++;e[3]=q+999-pos;return e};
    if(d&&typeof d.nom==='string'&&d.nom)add('dk',d.nom.slice(0,24),0)[4]=(Array.isArray(d.els)?d.els:[]).filter(y=>window.GolemsDonnees.interface.elements.ordre.includes(y)).slice(0,5).join(',');
    /* Cartes : liste du deck notee dans la partie ; paquet de test (deck note "Test" sans liste) : ses cartes (30 depuis 0.3). */
    {let t=d&&typeof d.cartes==='string'?d.cartes:'';if(!t&&d&&d.nom==='Test')t=deckDefautTxt(vPartie(x)); /* composition de la version de la partie (33 cartes jusqu'a 0.2c) */
     const ids=new Set(),re=/([0-9]{3}e?)[1-3]/g;let r;while((r=re.exec(t)))ids.add(r[1]);[...ids].forEach((id,i)=>add('c',id,Math.min(i,999)))}
    if(typeof x.mvp==='string'&&x.mvp)add('mv',x.mvp.slice(0,60),0);
    {const a=String(x.adv||'');if(a)add('a',a.slice(0,20),0)}
    {const vm=x.moteur||(x.rejeu&&x.rejeu.v);if(typeof vm==='string'&&vm){const e=add('ve',vm.slice(0,40),0);for(let i=4;i<10;i++)e[i]=e[i]|0;
       const n=/^Golem \((facile|normal|difficile)\)$/.exec(String(x.adv||''));if(n){const j=4+2*['facile','normal','difficile'].indexOf(n[1]);e[j]++;if(w)e[j+1]++}}}
    if(typeof x.id==='string'&&x.id)o.ids.push(x.id);
  });
  o.ids=o.ids.slice(-CUMUL_IDS);
  /* Tables bornees (300 lignes) : les moins jouees partent d'abord, jamais les niveaux de l'ordinateur. */
  ['dk','c','mv','a','ve'].forEach(k=>{let L=[...T[k].values()];
    if(L.length>CUMUL_MAX){const gard=L.filter(e=>k==='a'&&/^Golem \(/.test(e[0])),reste=L.filter(e=>!gard.includes(e)).sort((a,b)=>b[1]-a[1]||b[3]-a[3]);L=gard.concat(reste.slice(0,CUMUL_MAX-gard.length))}
    o[k]=L});
  o.md.k=o.k;
  return o;
}
/* Resume du profil a partir des cumuls (memes chiffres et meme ordre que l'ancien calcul sur l'historique). */
function resumeCumul(c){
  if(!c||typeof c!=='object'||c.f!==1)c={};
  const pct=o=>o.n?o.v/o.n:0,R={n:c.n|0,v:c.v|0,d:c.d|0,s:c.s|0};
  const T=k=>(Array.isArray(c[k])?c[k]:[]).filter(e=>Array.isArray(e)&&typeof e[0]==='string'&&Number.isInteger(e[1])&&Number.isInteger(e[2])).sort((a,b)=>(+b[3]||0)-(+a[3]||0));
  /* Top 3 : 3 parties minimum, tri par taux puis parties ; complete par les plus joues, marques peu de parties. */
  const top3=L=>{const ok=L.filter(x=>x.n>=3).sort((a,b)=>pct(b)-pct(a)||b.n-a.n),rest=L.filter(x=>x.n<3).sort((a,b)=>b.n-a.n||pct(b)-pct(a));
    return ok.concat(rest.map(x=>({...x,peu:true}))).slice(0,3)};
  R.dk=top3(T('dk').map(e=>({nom:e[0],e:typeof e[4]==='string'?e[4]:'',n:e[1],v:e[2]})));
  {const L=T('c').filter(e=>M.CARTES[e[0]]).map(e=>({c:e[0],n:e[1],v:e[2]}));
   R.cb=top3(L);const pris=new Set(R.cb.filter(x=>!x.peu).map(x=>x.c));
   R.cm=L.filter(x=>x.n>=3&&!pris.has(x.c)).sort((a,b)=>pct(a)-pct(b)||b.n-a.n).slice(0,3)}
  /* MVP : uniquement des cartes Golem connues du moteur (nom ou nom evolue). */
  {const id={};Object.values(M.CARTES).forEach(C=>{id[C.base?M.CARTES[C.base].nom+' ('+C.nom+')':C.nom]=C.id});
   const m=new Map();T('mv').forEach(e=>{const k=id[e[0]];if(!k)return;const o=m.get(k)||{c:k,n:0,v:0};o.n+=e[1];o.v+=e[2];m.set(k,o)});
   R.mv=[...m.values()].sort((a,b)=>b.n-a.n||pct(b)-pct(a)).slice(0,3)}
  {const A=T('a');R.o={};NIV_ORDI.forEach(([k])=>{const e=A.find(x=>x[0]==='Golem ('+k+')');R.o[k]={n:e?e[1]:0,v:e?e[2]:0}});
   R.jo=A.filter(e=>!/^Golem \(/.test(e[0])).map(e=>({p:e[0],n:e[1],v:e[2]})).sort((a,b)=>b.n-a.n||pct(b)-pct(a)).slice(0,3)}
  /* Detail par version du site (filtre Patch du panneau Joueurs) : chaque partie garde sa version (moteur), regroupee comme les Statistiques ;
     10 versions au plus, la plus recente d'abord ; partie sans version ignoree. */
  {const m=new Map();T('ve').forEach(e=>{const p=patchSite(e[0]);if(!/^[0-9a-z.]{1,12}$/.test(p))return;
     const o=m.get(p)||{p,n:0,v:0,o:{facile:{n:0,v:0},normal:{n:0,v:0},difficile:{n:0,v:0}}};o.n+=e[1];o.v+=e[2];
     ['facile','normal','difficile'].forEach((k,i)=>{o.o[k].n+=e[4+2*i]|0;o.o[k].v+=e[5+2*i]|0});m.set(p,o)});
   R.pv=versStats([...m.keys()].map(v=>({v}))).map(p=>m.get(p)).slice(0,10)}
  return R;
}
/* Resume publie (salon-firebase.js) : cumuls c du compte completes par les parties de l'historique l pas encore comptees ;
   sans cumuls (invite, ancien fichier), l'historique seul. */
function resumeProfil(l,c,ctx){c=c&&typeof c==='object'?c:null;const cu=cumulAjoute(c,l,ctx)||c,R=resumeCumul(cu);R.pm=resumeModes(cu&&cu.md);R.pmf=2;return R}
/* 0.6.2 : resume public PAR MODE et PAR NIVEAU (profils/<uid>/pm, pmf = 2, rules/30-stats.js) tire des compteurs complets md :
   n, v, d, b meilleure serie, s serie en cours, r 10 dernieres (V D N), el elements en %, tops 5 dk / cb / mv.
   Source unique du profil (le sien comme celui d'un autre) et des colonnes par joueur de l'onglet Statistiques (compteursMode). */
function resumeModes(md){const o={};if(!md||typeof md!=='object')return o;
  const tx=e=>e[2]/e[1],top=L=>L.filter(e=>e[1]>=PF_MIN_TOP).sort((a,b)=>tx(b)-tx(a)||b[1]-a[1]).slice(0,5);
  MD_CLES.forEach(m=>{const X=md[m];if(!X||!(X.n>0))return;
  const x={n:X.n|0,v:X.v|0,d:X.d|0,b:Math.max(0,X.b|0),s:X.s|0,r:String(X.r||'')};
  const ev=Object.entries(X.el||{}).filter(([e,k])=>/^[a-z]{1,12}$/.test(e)&&k>0),te=ev.reduce((a,[,k])=>a+k,0);
  if(te){const L=ev.map(([e,k])=>[e,Math.round(100*k/te)]).sort((a,b)=>b[1]-a[1]);L[0][1]+=100-L.reduce((a,y)=>a+y[1],0);x.el={};L.forEach(([e,p])=>{x.el[e]=p})}
  const dk=top(X.dk||[]);if(dk.length)x.dk=dk.map(e=>({nom:String(e[0]).slice(0,40),e:String(e[3]||''),n:e[1],v:e[2]}));
  const cb=top((X.c||[]).filter(e=>/^[0-9]{3}e?$/.test(e[0])));if(cb.length)x.cb=cb.map(e=>({c:e[0],n:e[1],v:e[2]}));
  if(X.n>=PF_MIN_TOP){const mv=(X.mv||[]).filter(e=>/^[0-9]{3}e?$/.test(e[0])).sort((a,b)=>b[1]-a[1]).slice(0,5);if(mv.length)x.mv=mv.map(e=>({c:e[0],n:e[1]}))}
  o[m]=x});return o}
/* Fonction commune (profil et Statistiques) : compteurs d'un mode (classee, amicale, entrainement) ou d'un niveau (dif) ;
   pm = resume par mode publie (pmf = 2) ou calcule pour soi. Forme de pfStats ; compteur vide si aucune partie. */
function compteursMode(pm,mode,dif){return pfStatsMode(pm,mode==='entrainement'&&dif?dif:mode)||{n:0,v:0,d:0,best:0,serie:0,der:[],els:[],dk:[],cb:[],mv:[]}}
/* Compteurs publies d'un joueur (profils/<uid>) : null tant qu'il ne s'est pas connecte en 0.6.2 (pmf absent) ou profil prive. */
function compteursPublies(r){return r&&r.pmf===2&&r.m!==true?(r.pm||{}):null}
/* Mes compteurs (compte : cumul ; invite : historique de l'appareil). */
function mesCompteurs(){const c=monCumul();return resumeModes(c&&c.md)}
/* Lecture du resume par mode d'un autre joueur -> meme forme que pfStats ; null si absent. */
function pfStatsMode(pm,mode){const x=pm&&pm[mode];if(!x)return null;const ls=v=>Array.isArray(v)?v:Object.values(v||{});
  const els=Object.entries(x.el||{}).map(([e,p])=>[e,p|0]).sort((a,b)=>b[1]-a[1]);
  return {n:x.n|0,v:x.v|0,d:x.d|0,best:x.b|0,serie:x.s|0,der:String(x.r||'').split('').filter(Boolean),els,
    dk:ls(x.dk).map(y=>({nom:String(y.nom||'Deck'),els:String(y.e||'').split(',').filter(Boolean),n:y.n|0,v:y.v|0})),cb:ls(x.cb).map(y=>({c:y.c,n:y.n|0,v:y.v|0})),mv:ls(x.mv).map(y=>({c:y.c,n:y.n|0}))}}
/* 0.6 : statistiques de l'instantane de fin de saison (commun/classe.js, service.profil) : parties de l'historique jouees pendant la saison id. */
async function pfInstantane(id){
  const sa=await pfLit('classe/saisons/'+id)||{},de=+sa.debut||0,fi=+sa.fin||Infinity;
  let h=[];try{h=(room.compte.donnees().historique||[]).filter(x=>(+x.date||0)>=de&&(+x.date||0)<=fi)}catch(e){}
  const modes={},dern=[];let tops={golems:[],terrains:[],decks:[],mvp:[]},els={};
  PF_MODES.forEach(([m])=>{const D=pfStats(h,m,'',0);if(!D.n)return;modes[m]={parties:D.n,v:D.v,d:D.d,best:Math.max(0,D.best|0),serie:D.serie|0};
    if(m==='classee'){tops={golems:D.cb.map(y=>({id:y.c,n:y.n,v:y.v})),terrains:[],decks:D.dk.map(y=>({nom:String(y.nom).slice(0,40),e:(y.els||[]).join(','),n:y.n,v:y.v})),mvp:D.mv.map(y=>({id:String(y.c).slice(0,12),n:y.n}))};
      D.els.forEach(([e,p])=>{if(/^[a-z]{1,12}$/.test(e))els[e]={n:p,v:0}})}});
  h.filter(x=>x.res==='Victoire'||x.res==='Défaite').sort((a,b)=>(+a.date||0)-(+b.date||0)).slice(-10).forEach(x=>dern.push({mode:pfModeDe(x),gagne:x.res==='Victoire',adv:String(x.adv||'').slice(0,40),t:+x.date||0}));
  return {modes,dernieres:dern,tops,elements:els};
}
/* Cumuls du compte connecte (avec les parties de l'historique pas encore comptees), sinon ceux de l'historique de l'appareil. */
function monCumul(){
  if(compteCo()){const d=room.compte.donnees(),c=d.cumul&&typeof d.cumul==='object'?d.cumul:null;return cumulAjoute(c,d.historique)||c}
  return cumulAjoute(null,litListe('golems.historique'));
}
/* Lecture d'un resume publie : tableaux Firebase (objets 0, 1, 2) remis en listes. */
function resumeLu(r){
  const ls=x=>(Array.isArray(x)?x:Object.values(x||{})).filter(y=>y&&typeof y==='object'&&Number.isInteger(y.n)).slice(0,3);
  const o={};NIV_ORDI.forEach(([k])=>{const z=r.o&&r.o[k];o[k]={n:z&&Number.isInteger(z.n)?z.n:0,v:z&&Number.isInteger(z.v)?z.v:0}});
  return {n:r.n|0,v:r.v|0,d:r.d|0,s:r.s|0,dk:ls(r.dk),cb:ls(r.cb),cm:ls(r.cm),mv:ls(r.mv),o,jo:ls(r.jo)};
}
/* ===== 0.6 : profil P2c (maquette 33, audit 34) =====
   Colonne identite (avatar = Changer d'avatar, rang classe ou rang final de la saison choisie, ecussons de saison cliquables,
   visibilite Public | Prive) ; a droite : saison affichee, Classees | Amicales | Entrainement (+ Tous | Facile | Normal | Difficile),
   bilan (anneau du taux, parties, meilleure serie, 10 dernieres parties), donut des elements, tops 5 decks / cartes / MVP.
   Hauteur de fenetre fixe quel que soit le mode. Lectures seules : classe/saison, classe/saisons, classe/joueurs/<uid>,
   classe/classement, classe/ecussons/<uid>, classe/instantanes/<id>/<uid>. */
const PF_MODES=[['classee','Classées'],['amicale','Amicales'],['entrainement','Entraînement']],PF_DIF=['','facile','normal','difficile'];
const PF_RANG_COUL={amethyste:'#d6a8ff',topaze:'#ffe58a',saphir:'#8fc3ff',emeraude:'#9ff0b8',rubis:'#ff9aa6',diamant:'#ffffff',pionnier:'#bfe9ff'};
const PF_EMB='images/rangs/'; /* emblemes de rang : images/rangs/<id>.png et placement.png (copie unique partagee avec Jouer et Statistiques) */
const PF_MIN_TOP=5; /* un deck, une carte n'entrent dans un top qu'a partir de 5 parties */
/* Mode d'une partie de l'historique : ordinateur = entrainement ; classee si marquee (cl / mode, pose par les parties classees 0.6) ; sinon amicale. */
/* 0.6.2 : une classee contre le robot (adv « Golem (niveau) », mode classee) est une classee, plus un entrainement. */
function pfModeDe(x){if(x&&(x.cl===true||x.c===true||x.mode==='classee'))return 'classee';const a=String(x&&x.adv||'');if(/^Golem \((facile|normal|difficile)\)$/.test(a))return 'entrainement';return 'amicale'}
function pfNiveauDe(x){const m=/^Golem \((facile|normal|difficile)\)$/.exec(String(x&&x.adv||''));return m?m[1]:''}
/* Statistiques d'un mode (liste = parties de l'historique, toutes formes) : fonction pure, testee en Node. */
function pfStats(liste,mode,dif,depuis){
  const ordre=(window.GolemsDonnees&&window.GolemsDonnees.interface.elements.ordre)||['magma','cristal','foudre','brume','roche'];
  const L=(Array.isArray(liste)?liste:[]).filter(x=>x&&typeof x==='object'&&(x.res==='Victoire'||x.res==='Défaite'||x.res==='Match nul')&&pfModeDe(x)===mode&&(!dif||pfNiveauDe(x)===dif)&&(!depuis||(+x.date||0)>=depuis))
    .sort((a,b)=>(+a.date||0)-(+b.date||0));
  const R={n:L.length,v:0,d:0,best:0,serie:0,der:[],els:[],dk:[],cb:[],mv:[]};let cur=0;
  const dk=new Map(),cb=new Map(),mv=new Map(),el={};
  const idMvp={};try{Object.values(M.CARTES).forEach(C=>{idMvp[C.base?M.CARTES[C.base].nom+' ('+C.nom+')':C.nom]=C.base||C.id})}catch(e){}
  L.forEach(x=>{const w=x.res==='Victoire',l=x.res==='Défaite';if(w)R.v++;if(l)R.d++;
    cur=w?(cur>0?cur+1:1):l?(cur<0?cur-1:-1):0;if(cur>R.best)R.best=cur;
    R.der.push(w?'V':l?'D':'N');
    const d=x.deck||{},els=(Array.isArray(d.els)?d.els:[]).filter(y=>ordre.includes(y));
    els.forEach(y=>{el[y]=(el[y]||0)+1});
    if(typeof d.nom==='string'&&d.nom){const k=d.nom.slice(0,40),o=dk.get(k)||{nom:k,els,n:0,v:0};o.n++;if(w)o.v++;dk.set(k,o)}
    {let t=typeof d.cartes==='string'?d.cartes:'';try{if(!t&&d.nom==='Test')t=deckDefautTxt(vPartie(x))}catch(e){}
     const ids=new Set(),re=/([0-9]{3}e?)[1-3]/g;let r;while((r=re.exec(t)))ids.add(r[1]);
     ids.forEach(id=>{const o=cb.get(id)||{c:id,n:0,v:0};o.n++;if(w)o.v++;cb.set(id,o)})}
    if(typeof x.mvp==='string'&&x.mvp){const id=idMvp[x.mvp]||x.mvp,o=mv.get(id)||{c:id,n:0};o.n++;mv.set(id,o)}});
  R.serie=cur;R.der=R.der.slice(-10);
  const tot=Object.values(el).reduce((a,b)=>a+b,0);
  if(tot){R.els=ordre.filter(y=>el[y]).map(y=>[y,Math.round(100*el[y]/tot)]).sort((a,b)=>b[1]-a[1]);const s=R.els.reduce((a,y)=>a+y[1],0);R.els[0][1]+=100-s}
  const tx=o=>o.v/o.n,top=m=>[...m.values()].filter(o=>o.n>=PF_MIN_TOP).sort((a,b)=>tx(b)-tx(a)||b.n-a.n).slice(0,5);
  R.dk=top(dk);R.cb=top(cb);R.mv=R.n<PF_MIN_TOP?[]:[...mv.values()].sort((a,b)=>b.n-a.n).slice(0,5);
  return R;
}
/* Instantane de fin de saison (classe/instantanes) -> meme forme que pfStats (tops golems = cartes, MVP absents). */
function pfStatsInstantane(I,mode){
  const m=I&&I.modes&&I.modes[mode]||{},R={n:m.parties|0,v:m.v|0,d:m.d|0,best:m.best|0,serie:0,der:[],els:[],dk:[],cb:[],mv:[]};
  const der=(Array.isArray(I&&I.dernieres)?I.dernieres:Object.values(I&&I.dernieres||{})).filter(x=>x&&(x.mode===mode||!x.mode));
  R.der=der.slice(-10).map(x=>x.gagne?'V':'D');let c=0;R.der.forEach(z=>{c=z==='V'?(c>0?c+1:1):(c<0?c-1:-1);if(!m.best&&c>R.best)R.best=c});R.serie=c;
  const e=I&&I.elements||{},t=Object.values(e).reduce((a,o)=>a+((o&&o.n)|0),0);
  if(t)R.els=Object.keys(e).filter(k=>e[k]&&e[k].n).map(k=>[k,Math.round(100*e[k].n/t)]).sort((a,b)=>b[1]-a[1]);
  const g=I&&I.tops&&I.tops.golems;R.cb=(Array.isArray(g)?g:Object.values(g||{})).filter(x=>x&&x.id).map(x=>({c:String(x.id),n:x.n|0,v:x.v|0})).slice(0,5);
  return R;
}
/* Resume publie d'un autre joueur (tops 3, tous modes confondus). */
function pfStatsResume(R0){return {n:R0.n|0,v:R0.v|0,d:R0.d|0,best:Math.max(0,R0.s|0),serie:R0.s|0,der:[],els:[],global:true,
  dk:(R0.dk||[]).map(x=>({nom:String(x.nom||'Deck'),els:String(x.e||'').split(',').filter(Boolean),n:x.n|0,v:x.v|0})),cb:(R0.cb||[]).filter(x=>!x.peu),mv:R0.mv||[]}}
async function pfLit(p){try{return room&&typeof room.lit==='function'?await room.lit(p):null}catch(e){return null}}
const pfPl=(n,m)=>n+' '+m+(n>1?'s':'');
async function ouvreProfil(autre){
  if($('profilJoueur'))return;
  if(autre&&!autre.uid)autre=null;
  if(autre&&compteCo()&&autre.uid===room.compte.uid())autre=null;
  const CL=window.GolemsClasse,E=(t,c,x)=>{const e=el(t,c||'');if(x!=null)e.textContent=x;return e};
  const co=compteCo(),moi=!autre;let uid='',nom,cree='',prive=false,histo=[],resume=null,pmAutre=null;
  if(moi){nom=co?pseudo:'Invité';try{if(co)uid=room.compte.uid()}catch(e){}
    try{const c=co&&room.compte.donnees().cree;if(c)cree='Compte créé le '+new Date(c).toLocaleDateString('fr-FR',{dateStyle:'long'})}catch(e){}
    if(!co)cree='Sans compte : historique de cet appareil';
    try{histo=co?(room.compte.donnees().historique||[]):litListe('golems.historique')}catch(e){histo=[]}}
  else{nom=autre.p;uid=autre.uid;
    const r=room&&room.compte.profilDe?await room.compte.profilDe(autre.uid):null;if($('profilJoueur'))return;
    if(r){nom=r.p||nom;if(+r.cr>0)cree='Compte créé le '+new Date(+r.cr).toLocaleDateString('fr-FR',{dateStyle:'long'})}
    pmAutre=compteursPublies(r);if(r&&r.m===true){prive=true;resume={n:r.n|0,v:r.v|0,d:r.d|0,best:0,serie:0,der:[],els:[],dk:[],cb:[],mv:[],global:true}}}
  /* 0.6.2 : chiffres par mode et par niveau = compteurs complets (compteursMode), les memes que l'onglet Statistiques. */
  const PM=moi?mesCompteurs():pmAutre;
  /* Classe (lectures publiques ; rien si hors ligne ou invite). */
  const [sa,sas,jo,cla,ecs]=uid?await Promise.all([pfLit('classe/saison'),pfLit('classe/saisons'),pfLit('classe/joueurs/'+uid),pfLit('classe/classement'),pfLit('classe/ecussons/'+uid)]):[null,null,null,null,null];
  if($('profilJoueur'))return;
  const idCours=sa&&Number.isInteger(sa.id)?sa.id:0,debut=sa&&+sa.debut||0;
  const nomSaison=id=>'Saison '+id;
  const v=E('div','pr-voile'),b=E('div','pr-boite');v.id='profilJoueur';v.setAttribute('role','dialog');v.setAttribute('aria-modal','true');v.setAttribute('aria-labelledby','pfTitre');
  const t=E('h2','pr-t',moi?'Mon profil':'Profil de '+nom);t.id='pfTitre';b.append(t);
  const g=E('div','pr-g');b.append(g);
  /* Colonne identite */
  const id=E('div','pr-id');g.append(id);
  const avb=E('button','pr-av');avb.type='button';
  avb.append(moi?avatarDe(co?pseudo:'?',monAvatar()):avatarUid(nom,uid));
  if(moi&&co){avb.title="Changer d'avatar";avb.setAttribute('aria-label',"Changer d'avatar");
    const cr=E('span','pr-crayon');cr.innerHTML='<svg viewBox="0 0 24 24" fill="none" stroke="#0a121a" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"><path d="M4 20h4L19 9l-4-4L4 16z"/><path d="M13.5 6.5l4 4"/></svg>';
    avb.append(cr);avb.onclick=()=>ouvreGalerie()}
  else{avb.disabled=true;avb.tabIndex=-1}
  id.append(avb);
  const ps=E('p','pr-ps',nom);ps.title=nom;id.append(ps);if(cree)id.append(E('p','pr-cr',cree));
  const zr=E('div','pr-zr');id.append(zr);
  const etR=E('div','pr-et','Rang classé'),rg=E('div','pr-rg'),jg=E('div','pr-jg');zr.append(E('div','pr-sep'),etR,rg,jg);
  /* Rang en cours : placement, ou rang + Elo + place au classement + jauge vers le rang suivant. */
  const place=(()=>{const sid=sa&&typeof sa==='object'?sa.id|0:0,l=Object.entries(cla||{}).filter(([,x])=>x&&Number.isFinite(x.elo)&&x.saison===sid) /* 0.6.1 : saison en cours */.sort((a,b)=>b[1].elo-a[1].elo);const i=l.findIndex(([u])=>u===uid);return i<0?null:{i:i+1,sur:l.length}})();
  const pose=(idR,titre,sous,coul)=>{rg.textContent='';const im=el('img');im.alt='';im.src=PF_EMB+(idR||'placement')+'.png';im.onerror=()=>{im.style.visibility='hidden'};
    const tx=E('div'),bb=E('b','',titre);bb.style.color=coul||'#fff';tx.append(bb,E('small','',sous));rg.append(im,tx);id.style.setProperty('--rc',coul||'#2a3f50')};
  const rangCours=()=>{etR.textContent='Rang classé';jg.hidden=true;jg.textContent='';
    if(!CL||!jo||!Number.isFinite(jo.elo)){pose('',co||!moi?'Non classé':'Sans compte',co||!moi?'Aucune partie classée cette saison':'Crée un compte pour être classé','#a6bac6');return}
    const a=CL.affichage(jo);
    if(a.placement){pose('',a.texte,'Rang estimé : '+a.estime.nom,'#a6bac6');return}
    pose(a.rang.id,a.rang.nom,'Elo '+Math.round(jo.elo)+(place?' - '+place.i+(place.i>1?'e':'er')+' sur '+pfPl(place.sur,'classé'):''),PF_RANG_COUL[a.rang.id]);
    const i=CL.RANGS.findIndex(x=>x.id===a.rang.id),nx=CL.RANGS[i+1];
    if(nx){const lo=Number.isFinite(a.rang.min)?a.rang.min:nx.min-100,p=Math.max(0,Math.min(100,100*(jo.elo-lo)/(nx.min-lo)));jg.hidden=false;
      const bar=E('div','pr-bar'),f=el('i');f.style.width=p+'%';bar.append(f);const sm=E('small'),s2=E('span');s2.append(E('b','',Math.ceil(nx.min-jo.elo)+' pts'),' avant '+nx.nom);sm.append(E('span','','Prochain rang'),s2);jg.append(bar,sm)}};
  /* Ecussons : une case par saison terminee (classe/ecussons), puis la saison en cours. Clic = la partie droite passe sur cette saison. */
  /* Regle du 9 nov. : medaille ronde de la saison (placement fini, Saison 0 = Pionnier) + ecu pour un top 10 (or 1, argent 2-3, bronze 4-10). */
  const ecu=Object.values(ecs||{}).filter(x=>x&&Number.isInteger(x.saison)&&x.saison!==idCours).sort((a,b)=>a.saison-b.saison);
  zr.append(E('div','pr-sep'),E('div','pr-et','Badges'));const bd=E('div','pr-bd');zr.append(bd);
  let sais=idCours,mode=0,dif=0;const inst={};
  const metalTxt={or:'Écu d’or',argent:'Écu d’argent',bronze:'Écu de bronze'},repli=im=>{im.onerror=()=>{im.onerror=null;im.src=PF_EMB+'placement.png'}};
  const badge=(x,cours)=>{const q=E('button','bd'+(cours?' cours':x.saison===0?' pio':x.ecu?' top':''));q.type='button';
    const im=el('img');im.alt='';repli(im);im.src=cours?PF_EMB+(jo&&CL&&Number.isFinite(jo.elo)&&!CL.enPlacement(jo)?CL.rang(jo.elo).id:'placement')+'.png':imgV(CL.imageMedaille(x.saison,56));
    q.append(im);
    if(!cours&&x.ecu&&Number.isInteger(x.place)){const e2=el('img','bd-ecu');e2.alt=metalTxt[x.ecu]||'';repli(e2);e2.src=imgV(CL.imageEcu(x.place,56));q.append(e2)}
    q.append(E('b','',nomSaison(cours?idCours:x.saison)),E('span','',cours?'en cours':CL.nomMedaille(x.saison)+(x.ecu?' - '+x.place+(x.place>1?'e':'re'):'')));
    const s=cours?idCours:x.saison;q.dataset.tip='Voir la saison '+s;q.setAttribute('aria-label','Voir la saison '+s);q.onclick=()=>{sais=s;rend()};bd.append(q)};
  ecu.forEach(x=>badge(x,false));badge(null,true);
  const bas=E('div','pr-bas');id.append(bas);
  /* Visibilite (mon compte) : [Public] [Prive]. */
  if(moi&&co){bas.append(E('div','pr-et','Visibilité du profil'));const s=E('div','pr-seg s2');let m=false;try{m=!!room.compte.donnees().masque}catch(e){}
    const maj=x=>{s.style.setProperty('--p',x?1:0);[...s.children].forEach((y,j)=>y.setAttribute('aria-pressed',String(j===(x?1:0))))};
    ['Public','Privé'].forEach((n,i)=>{const q=E('button','',n);q.type='button';if(i)q.title='Privé : les autres joueurs ne voient que ton pseudo, ton avatar, ton rang et ton bilan.';
      q.onclick=async()=>{const x=i===1;if(x===m)return;maj(x);s.classList.add('pr-off');try{await room.compte.masquerProfil(x);m=x}catch(e){maj(m)}s.classList.remove('pr-off')};s.append(q)});
    maj(m);bas.append(s)}
  /* Partie droite */
  const dr=E('div','pr-dr');g.append(dr);
  async function rend(){
    const cours=sais===idCours;
    [...bd.children].forEach(q=>q.setAttribute('aria-pressed',String(q.getAttribute('aria-label')==='Voir la saison '+sais)));
    let I=null;if(!cours){if(!(sais in inst))inst[sais]=await pfLit('classe/instantanes/'+sais+'/'+uid);I=inst[sais]}
    if(cours)rangCours();
    else{const x=ecu.find(y=>y.saison===sais)||{},r=I&&I.rang||x.rang;etR.textContent='Rang final - Saison '+sais;jg.hidden=true;
      const R0=CL&&CL.RANGS.find(y=>y.id===r);pose(R0?R0.id:'',R0?R0.nom:r==='pionnier'?'Pionnier':'Non classé',(I&&Number.isFinite(I.elo)?'Elo final '+Math.round(I.elo):'')+(I&&I.place?' - '+I.place+(I.place>1?'e':'er'):''),PF_RANG_COUL[r])}
    dr.textContent='';
    const sb=E('div','pr-sb');sb.append(E('b','',nomSaison(sais)+(cours?' - en cours':' - terminée')));
    if(!cours){const rb=E('button','sc-btn sc-secondaire','Revenir à la saison en cours');rb.type='button';rb.onclick=()=>{sais=idCours;rend()};sb.append(rb)}
    dr.append(sb);
    const glob=false,off=prive,attente=cours&&!prive&&!PM;
    const h=E('div','pr-h'),s=E('div','pr-seg s3'+(off?' pr-off':''));s.style.setProperty('--p',mode);
    PF_MODES.forEach(([,n],i)=>{const x=E('button','',n);x.type='button';x.setAttribute('aria-pressed',String(!off&&i===mode));x.onclick=()=>{mode=i;rend()};s.append(x)});
    if(off)s.classList.add('pr-vide');
    h.append(s);
    const s2=E('div','pr-seg s4'+(mode===2&&!off?'':' cache'));s2.style.setProperty('--p',dif);s2.setAttribute('role','group');s2.setAttribute('aria-label','Difficulté');
    ['Tous','Facile','Normal','Difficile'].forEach((n,i)=>{const x=E('button','',n);x.type='button';x.setAttribute('aria-pressed',String(i===dif));x.onclick=()=>{dif=i;rend()};s2.append(x)});
    h.append(s2);dr.append(h);
    const MO=PF_MODES[mode][0];
    const D=prive&&cours?resume:I?pfStatsInstantane(I,MO):cours?compteursMode(PM,MO,mode===2?PF_DIF[dif]:''):compteursMode(null,MO);
    if(attente)D.attente=true;
    const P=prive?resume:D;
    /* 0.6.1 : ancien compte (parties d'avant le correctif du 9 nov. reconstruites au total) : aucun element compte pour le mode, ou les 10 dernieres ne couvrent pas toutes ses parties. */
    const AV=(moi?'Tes':'Ses')+" parties d'avant le 9 novembre comptent dans le total, pas par mode.",avant=!I&&!D.global&&D.n>0&&(!(D.els||[]).length||(D.der||[]).length<Math.min(D.n,10));
    /* Bilan */
    const hr=E('div','pr-hr'),gc=E('div','pr-gc'),gn=E('div','pr-gn');
    const tx=P.n?Math.round(100*P.v/P.n):null,coul=couleurTaux.valeur(tx,P.n);
    {const c=E('div');c.append(E('i','','Taux de victoire'));const an=E('div','pr-ann');
     an.innerHTML='<svg viewBox="0 0 120 120"><circle cx="60" cy="60" r="51" fill="none" stroke="rgba(255,255,255,.10)" stroke-width="12"/>'+(tx?'<circle cx="60" cy="60" r="51" fill="none" stroke="'+coul+'" stroke-width="12" stroke-linecap="round" stroke-dasharray="'+(3.2044*tx)+' 999" transform="rotate(-90 60 60)"/>':'')+'</svg>';
     an.append(E('span','',tx===null?'-':tx+' %'));c.append(an,E('small','',P.v+' V - '+P.d+' D'));gn.append(c)}
    const libM=glob?'tous modes':['parties classées','parties amicales',dif?'parties en '+['','Facile','Normal','Difficile'][dif]:"parties d'entraînement"][mode];
    {const c=E('div');c.append(E('i','','Parties'),E('b','',String(P.n)),E('small','',P.n>1?libM:libM.replace(/parties/,'partie').replace(/ées$/,'ée').replace(/ales$/,'ale')));gn.append(c)}
    {const c=E('div');c.append(E('i','','Meilleure série'),E('b','',prive||!P.best?'-':String(P.best)),E('small','',prive?'Masqué':!P.best&&D.global?'Non partagée':P.best?(P.best>1?'victoires':'victoire')+' d’affilée':'Aucune série'));gn.append(c)}
    gc.append(gn);
    const pa=E('div','pr-pa');pa.title='10 dernières parties, de la plus ancienne à la plus récente';
    if(!prive){(D.der||[]).forEach(c=>{const x=E('span',c==='V'?'v':c==='D'?'d':'n',c==='N'?'=':c);x.title=c==='V'?'Victoire':c==='D'?'Défaite':'Match nul';pa.append(x)});
      if(!D.der.length)pa.append(E('small','pr-pvide',D.attente?'Chiffres par mode publiés à sa prochaine connexion':'Aucune partie'));
      const k=Math.abs(D.serie||0);if(k&&D.der.length){const sm=E('small','pr-ser','Série : ');sm.append(E('b','',pfPl(k,D.serie>0?'victoire':'défaite')));pa.append(sm)}}
    gc.append(pa);hr.append(gc);
    /* Donut des elements */
    const an=E('div','pr-an');an.append(E('i','','Éléments les plus joués'));
    if(D&&D.els.length){const ar=E('div','pr-ar'),R0=54,C=2*Math.PI*R0;let o=0,sv='';
      D.els.forEach(x=>{const l=C*x[1]/100;sv+='<circle r="'+R0+'" cx="68" cy="68" fill="none" stroke="var(--fm-'+x[0]+')" stroke-width="20" stroke-dasharray="'+Math.max(l-3,0)+' '+C+'" stroke-dashoffset="'+(-o)+'" transform="rotate(-90 68 68)"></circle>';o+=l});
      ar.innerHTML='<svg viewBox="0 0 136 136">'+sv+'</svg>';const lg=E('div','pr-lg');
      D.els.forEach(x=>{const r=E('div');try{r.append(picto(x[0]))}catch(e){}r.append(E('span','',x[0].charAt(0).toUpperCase()+x[0].slice(1)),E('b','',x[1]+' %'));lg.append(r)});ar.append(lg);an.append(ar)}
    else an.append(E('div','pr-anv',prive?'Masqué (profil privé)':D.attente?'Pas encore publié':avant?AV:'Aucune partie'));
    hr.append(an);dr.append(hr);
    const p3=E('div','pr-p3');dr.append(p3);
    if(prive){const pn=E('div','pr-pn pr-pv');pn.append(E('div','pr-ins','Profil privé : ce joueur ne partage que son rang et son bilan.'));p3.append(pn);return}
    const st=(n,o)=>{const s=E('div','pr-st'),p=Math.round(100*o.v/o.n);s.append(pfPl(n,'partie')+' - ');const q=E('b',couleurTaux(p,o.n),p+' %');s.append(q,' de victoires');return s};
    const pan=(tt,items,ins)=>{const pn=E('section','pr-pn');pn.append(E('h3','',tt));items.filter(Boolean).forEach(x=>pn.append(x));if(items.filter(Boolean).length<5&&ins)pn.append(E('div','pr-ins',ins));p3.append(pn)};
    const deckL=x=>{const w=E('div','pr-it'),z=E('div','pr-dk'),e=x.els.length?x.els:['brume'];z.style.setProperty('--a','var(--fm-'+e[0]+')');z.style.setProperty('--b','var(--fm-'+(e[1]||e[0])+')');z.title=x.nom;
      z.append(E('span','',x.nom));x.els.forEach(y=>{try{z.append(picto(y))}catch(er){}});w.append(z,st(x.n,x));return w};
    const carteL=(k,lab)=>{const C=M.CARTES[k],c=C&&CARTES.find(y=>y[0]===C.id);if(!c)return null;const q=el('button','dl-ligne');q.type='button';q.title=c[1];
      if(c[2].length===2){q.classList.add('dl-duo');q.style.setProperty('--a','var(--fm-'+c[2][0]+')');q.style.setProperty('--b','var(--fm-'+c[2][1]+')')}else if(estAnimal(c)||C.animal)q.classList.add('dl-animal');
      const co2=el('span','dl-cout');co2.append(ico('enclume'),String(C.cout));const fo=el('span','dl-force');{const f=forceAff(C);if(f!=null)fo.append(ico('force'),f)}
      const ee=el('span','dl-els');c[2].forEach(y=>ee.append(picto(y)));
      const vi=c[1].indexOf(', '),nm=el('span','dl-nom');nm.append(el('span','dl-pseudo',vi<0?c[1]:c[1].slice(0,vi)));if(vi>=0){const ti=el('span','dl-titre',c[1].slice(vi+2));ti.style.color=coulT(c);nm.append(ti)}
      if(estAnimal(c)||C.animal){fo.className='dl-force dl-mot';fo.textContent='Animal';q.append(co2,fo,nm)}else q.append(co2,fo,ee,nm);const src=imgV('cartes/'+c[0]+'.jpg');q.onclick=()=>{cacheApercu();zoom(src,c[1])};q.onmouseenter=()=>montreApercu(q,src);q.onmouseleave=cacheApercu;
      const w=E('div','pr-it');w.append(q,lab);return w};
    const top=resume&&!pmAutre?3:5;
    pan('Meilleurs decks',D.dk.slice(0,top).map(deckL),D.global?'':I?'Non conservé pour les saisons terminées.':!D.dk.length&&avant?AV:'Un deck apparaît après 5 parties.');
    pan('Meilleures cartes',D.cb.slice(0,top).map(x=>carteL(x.c,st(x.n,x))),D.global?'':!D.cb.length&&avant?AV:'Une carte apparaît après 5 parties.');
    pan('Cartes le plus souvent MVP',D.mv.slice(0,top).map(x=>{const s=E('div','pr-st');s.append(E('span','pr-mvp','MVP'),E('b','',String(x.n)),' fois MVP');return carteL(x.c,s)}),D.global?'':I?'Non conservé pour les saisons terminées.':!D.mv.length&&avant?AV:'Pas encore assez de parties.');
  }
  await rend();
  const bt=E('div','pr-btns'),f=E('button','sc-btn sc-secondaire','Fermer');f.type='button';bt.append(f);b.append(bt);
  const esc=e=>{if(e.key==='Escape'&&$('vue').hidden&&$('galerieAvatar').hidden)ferme()},ferme=()=>{cacheApercu();v.remove();removeEventListener('keydown',esc);if(moi)$('capsuleMoi').focus()};
  f.onclick=ferme;v.onclick=e=>{if(e.target===v)ferme()};addEventListener('keydown',esc);
  v.append(b);document.body.append(v);f.focus();
}
/* Avatar change depuis la galerie : le profil ouvert suit (gros avatar). */
function majAvatarProfil(){const a=document.querySelector('#profilJoueur .pr-av .avatar');if(a)a.replaceWith(avatarDe(compteCo()?pseudo:'?',monAvatar()))}
$('salonPublicCase').onchange=e=>{$('salonPublicTxt').textContent=e.target.checked?'Salon public':'Salon privé'};
{const p=$('pseudoAffiche');p.setAttribute('role','button');p.tabIndex=0;p.title='Voir mon profil';p.classList.add('pf-lien');
 p.onclick=()=>ouvreProfil();p.onkeydown=e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();ouvreProfil()}}}
