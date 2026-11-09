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
function cumulAjoute(c,l){
  const ok=!!(c&&typeof c==='object'&&c.f===1);
  const o=ok?JSON.parse(JSON.stringify(c)):{f:1,n:0,v:0,d:0,s:0,sd:0,k:0,dk:[],c:[],mv:[],a:[],ve:[],ids:[]};
  ['n','v','d','s','sd','k'].forEach(k=>{if(!Number.isFinite(o[k]))o[k]=0});
  ['dk','c','mv','a','ve','ids'].forEach(k=>{if(!Array.isArray(o[k]))o[k]=[]});
  const gr=id=>{const m=/^(-?[0-9]{1,12})-[0-9]{10,14}$/.exec(id);return m?m[1]:id};
  const vus=new Set(o.ids.map(gr)),nv=[];
  (l||[]).forEach(x=>{if(!x||typeof x!=='object')return;if(typeof x.id!=='string'||!x.id){if(!ok)nv.push(x);return}
    const g=gr(x.id);if(vus.has(g))return;vus.add(g);nv.push(x)});
  if(!nv.length)return null;
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
function resumeProfil(l,c){c=c&&typeof c==='object'?c:null;return resumeCumul(cumulAjoute(c,l)||c)}
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
/* Fenetre de profil. Sans argument : le mien. Avec { uid, p, v, n } (classement) : celui d'un autre joueur.
   Bilan en 6 cases egales, puis 6 blocs de meme taille sur 3 colonnes (une colonne au telephone, meme ordre) :
   Meilleurs decks, Meilleures cartes, Cartes les moins bonnes / Cartes MVP, Contre l'ordinateur, Adversaires les plus affrontes.
   Profil prive : bilan seul (pseudo, parties, victoires, defaites publies meme masques) ; rang lu dans le classement public. */
async function ouvreProfil(autre){
  if($('profilJoueur'))return;
  if(autre&&!autre.uid)autre=null;
  if(autre&&compteCo()&&autre.uid===room.compte.uid())autre=null;
  let R,prive=false,absent=false,nom,av,cree='',uid='';
  if(!autre){const co=compteCo();nom=co?pseudo:'Invité';av=avatarDe(co?pseudo:'?',monAvatar());R=resumeCumul(monCumul());
    try{if(co)uid=room.compte.uid()}catch(e){}
    try{const c=co&&room.compte.donnees().cree;if(c)cree='Compte créé le '+new Date(c).toLocaleDateString('fr-FR',{dateStyle:'long'})}catch(e){}
    if(!co)cree='Sans compte : historique de cet appareil';else if(!cree)cree='Date de création inconnue'}
  else{nom=autre.p;uid=autre.uid;av=avatarUid(autre.p,autre.uid);
    const r=room&&room.compte.profilDe?await room.compte.profilDe(autre.uid):null;if($('profilJoueur'))return;
    if(r){nom=r.p;if(+r.cr>0)cree='Compte créé le '+new Date(+r.cr).toLocaleDateString('fr-FR',{dateStyle:'long'})}
    if(r&&r.m===true){prive=true;R={n:r.n|0,v:r.v|0,d:r.d|0}}
    else if(r)R=resumeLu(r);
    else{absent=true;R={n:autre.n|0,v:autre.v|0,d:(autre.n|0)-(autre.v|0)}}}
  /* Classement pour le rang : celui des Statistiques s'il est deja lu, sinon une lecture. */
  let clas=statsJoueurs;
  if(!Array.isArray(clas)||!clas.length){try{clas=room&&room.litClassement?await room.litClassement().catch(()=>[]):[]}catch(e){clas=[]}if($('profilJoueur'))return}
  const v=el('div','voile'),d=el('div','boite pf-boite');v.id='profilJoueur';v.setAttribute('role','dialog');v.setAttribute('aria-modal','true');v.setAttribute('aria-labelledby','pfTitre');
  const pc=o=>o&&o.n?Math.round(100*o.v/o.n):null,coul=p=>p===null?'var(--doux)':p>55?'#3ecf6e':p>=45?'#f0a030':'#ef4f4f';
  const pl=n=>n+(n>1?' parties':' partie'),pl2=(n,m)=>n+' '+m+(n>1?'s':'');
  const tete=el('div','pf-tete'),id=el('div','pf-id');
  id.append(Object.assign(el('h2','',nom),{id:'pfTitre'}));if(cree)id.append(el('p','pf-cree',cree));
  tete.append(av,id);d.append(tete);
  /* Profil public / prive (mon compte seulement), en haut a droite. */
  if(!autre&&compteCo()){const lb=el('label','pf-inter'),cb=el('input'),tx=el('span','pf-itx'),gl=el('span','pf-glis');cb.type='checkbox';cb.id='pfPublic';cb.setAttribute('role','switch');
    lb.title='Privé : les autres joueurs ne voient que ton pseudo, ton avatar, ton taux de victoire et ton nombre de parties.';
    let m=false;try{m=!!room.compte.donnees().masque}catch(e){}cb.checked=!m;
    const maj=()=>{tx.textContent=cb.checked?'Profil public':'Profil privé'};maj();
    cb.onchange=async()=>{maj();cb.disabled=true;try{await room.compte.masquerProfil(!cb.checked)}catch(e){cb.checked=!cb.checked;maj()}cb.disabled=false};
    lb.append(tx,cb,gl);tete.append(lb)}
  /* Bilan : 6 cases de meme taille (taux, parties, victoires, defaites, serie, rang). */
  const tot=R.n,pg=pc(R),bil=el('div','pf-bilan');
  const cas=(c,b,t)=>{const s=el('div','pf-case pf-tuile '+c),x=el('b','',b);s.append(x,el('span','',t));bil.append(s);return x};
  {const rc=el('div','pf-case pf-cring'),ring=el('div','pf-ring');ring.style.setProperty('--p',(pg||0));ring.style.setProperty('--c',coul(pg));
   ring.append(el('b','',pg===null?'-':pg+' %'),el('span','','de victoires'));rc.append(ring);bil.append(rc)}
  cas('pf-tot',String(tot),tot>1?'Parties':'Partie');cas('pf-v',String(R.v),R.v>1?'Victoires':'Victoire');cas('pf-d',String(R.d),R.d>1?'Défaites':'Défaite');
  {const k=prive||absent?0:Math.abs(R.s||0),gv=R.s>0;
   cas('pf-se'+(k?(gv?' pf-sv':' pf-sd'):''),k?String(k):'-',prive||absent?'Série non partagée':k?(gv?(k>1?'victoires':'victoire'):(k>1?'défaites':'défaite'))+' d’affilée':'Aucune série en cours')}
  /* Rang : joueurs a 5 parties ou plus, meme tri que le panneau Joueurs des Statistiques. */
  {const cl=(Array.isArray(clas)?clas:[]).filter(x=>x&&x.n>=5).sort((a,b)=>b.v/b.n-a.v/a.n||b.n-a.n||String(a.p).localeCompare(String(b.p),'fr')),i=uid?cl.findIndex(x=>x.uid===uid):-1;
   if(i>=0){const b=cas('pf-rg',String(i+1),'sur '+pl2(cl.length,'joueur')+' classé'+(cl.length>1?'s':''));b.append(el('sup','',i?'e':'er'))}
   else cas('pf-rg','-','Non classé').parentNode.append(el('span','pf-cs','5 parties minimum'))}
  d.append(bil);
  const fin=()=>{const z=el('div','p-btns'),f=el('button','btn plein fermer','Fermer');f.type='button';
    const esc=e=>{if(e.key==='Escape'&&$('vue').hidden)ferme()},ferme=()=>{cacheApercu();v.remove();removeEventListener('keydown',esc);if(!autre)$('pseudoAffiche').focus()};
    f.onclick=ferme;v.onclick=e=>{if(e.target===v)ferme()};addEventListener('keydown',esc);
    z.append(f);d.append(z);v.append(d);document.body.append(v);f.focus()};
  if(prive||absent){d.append(el('p','pf-prive',prive?'Profil privé : ce joueur ne partage que son bilan.':'Le profil détaillé de ce joueur sera visible après sa prochaine connexion.'));fin();return}
  const toi=!autre;
  /* Ligne discrete commune : N parties · X % de victoires (+ peu de parties) */
  const stat=o=>{const p=pc(o),s=el('div','pf-dst'),t=el('b','pf-dt',p===null?'-':p+' %');t.style.color=coul(p);s.append(el('span','pf-dk',pl(o.n)+' - '),t,el('span','pf-dk',' de victoires'));if(o.peu)s.append(el('span','pf-peu','peu de parties'));return s};
  /* Ligne de carte compacte : apercu au survol, carte en grand au clic. */
  const ligneCarte=(x,lab)=>{const C=M.CARTES[x.c],c=C&&CARTES.find(y=>y[0]===C.id);if(!c)return null;
    const li=el('div','pf-item pf-mvps pf-slot'),q=el('button','dl-ligne'),fo=el('span','dl-force'),e=el('span','dl-els'),src=imgV('cartes/'+c[0]+'.jpg');q.type='button';
    if(c[2].length===2){q.classList.add('dl-duo');q.style.setProperty('--a','var(--fm-'+c[2][0]+')');q.style.setProperty('--b','var(--fm-'+c[2][1]+')')}else if(estAnimal(c))q.classList.add('dl-animal')
    q.setAttribute('aria-label',c[1]+', '+lab);
    const co=el('span','dl-cout');co.append(ico('enclume'),String(C.cout));{const f=forceAff(C);if(f!=null){fo.append(ico('force'),f);if(f.includes(','))fo.classList.add('dl-dec')}}c[2].forEach(y=>e.append(picto(y)));
    const vi=c[1].indexOf(', '),nm=el('span','dl-nom');nm.append(el('span','dl-pseudo',vi<0?c[1]:c[1].slice(0,vi)));
    if(vi>=0){const ti=el('span','dl-titre',c[1].slice(vi+2));ti.style.color=coulT(c);nm.append(ti)}
    if(estAnimal(c)){fo.className='dl-force dl-mot';fo.textContent='Animal';q.append(co,fo,nm)}else q.append(co,fo,e,nm);q.onclick=()=>{cacheApercu();dernier=q;zoom(src,c[1],toi?statZoomCarte(c[0]):undefined)};q.onmouseenter=()=>montreApercu(q,src);q.onmouseleave=cacheApercu;
    li.append(q,stat(x));return li};
  /* Ligne commune ordinateur / joueurs : pastille ou avatar, nom, jauge, taux ; dessous : parties et victoires. */
  const ligne=(avt,nm,o)=>{const p=pc(o),s=el('div','pf-slot'),r=el('div','pf-bl'),j=el('span','pf-jauge'),f=el('i'),b=el('b','',p===null?'-':p+' %');
    f.style.width=(p||0)+'%';f.style.background=coul(p);j.append(f);b.style.color=coul(p);r.append(avt,Object.assign(el('span','pf-an',nm),{title:nm}),j,b);
    s.append(r,el('div','pf-dst pf-dk',pl(o.n)+' - '+pl2(o.v||0,'victoire')));return s};
  const grille=el('div','pf-blocs'),bloc=(k,t,vide,items)=>{const b=el('section','pf-bloc');b.dataset.nom=k;b.append(el('h3','pf-h',t));
    const l=items.filter(Boolean);if(l.length)b.append(...l);else b.append(el('p','pf-vide pf-bvide',vide));grille.append(b)};
  bloc('dk','Meilleurs decks','Aucune donnée.',R.dk.map(x=>{const z=el('div','pf-deck pf-item pf-slot'),bd=bandeauDeck({nom:String(x.nom||'Deck'),els:String(x.e||'').split(',')}),ps=el('span','pf-dp');
    String(x.e||'').split(',').filter(y=>window.GolemsDonnees.interface.elements.ordre.includes(y)).forEach(y=>ps.append(picto(y)));bd.append(ps);z.append(bd,stat(x));return z}));
  bloc('cb','Meilleures cartes','Aucune donnée.',R.cb.map(x=>ligneCarte(x,pc(x)+' % de victoires')));
  bloc('cm','Cartes les moins bonnes','Il faut au moins 3 parties par carte.',R.cm.map(x=>ligneCarte(x,pc(x)+' % de victoires')));
  bloc('mv','Cartes les plus souvent MVP','Aucune donnée.',R.mv.map(x=>ligneCarte(x,x.n+' fois MVP')));
  bloc('o',"Contre l'ordinateur",'',NIV_ORDI.map(([k,c])=>{const pt=el('span','pf-niv');pt.style.background=c;return ligne(pt,k.charAt(0).toUpperCase()+k.slice(1),R.o[k]||{n:0,v:0})}));
  /* Adversaire : seul son pseudo est garde (historique, profil publie) ; uid retrouve dans le classement public,
     sinon dans pseudos/{pseudo minuscule} (lisibles par tout connecte), puis avatar lu comme ailleurs (avatarUid). Initiale en repli. */
  const avAdv=p=>{const mi=compteCo()&&String(p).toLowerCase()===String(pseudo).toLowerCase();if(mi)return avatarDe(p,monAvatar());
    const L=Array.isArray(clas)?clas:[],t=L.find(y=>y&&y.p===p)||L.find(y=>y&&typeof y.p==='string'&&y.p.toLowerCase()===String(p).toLowerCase());
    if(t&&t.uid)return avatarUid(p,t.uid);
    const a=avatarDe(p);if(room&&typeof room.lit==='function'&&/^.{3,20}$/.test(p)&&!/[.#$\[\]\/]/.test(p))room.lit('pseudos/'+String(p).toLowerCase()).then(u=>{if(typeof u==='string'&&u&&a.isConnected)a.replaceWith(avatarUid(p,u))}).catch(()=>{});
    return a};
  bloc('jo','Adversaires les plus affrontés','Aucune partie entre joueurs pour l’instant.',R.jo.map(x=>ligne(avAdv(x.p),x.p,x)));
  d.append(grille);
  fin();
}
$('salonPublicCase').onchange=e=>{$('salonPublicTxt').textContent=e.target.checked?'Salon public':'Salon privé'};
{const p=$('pseudoAffiche');p.setAttribute('role','button');p.tabIndex=0;p.title='Voir mon profil';p.classList.add('pf-lien');
 p.onclick=()=>ouvreProfil();p.onkeydown=e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();ouvreProfil()}}}
