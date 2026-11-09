/* Onglet Decks : decks du joueur, choix avant partie, partage par code et lien, decks conseilles, editeur, bac a sable. */
/* Decks : visuels pour ce test, le moteur n'en sait rien. */
const MAX_DECKS=12,MAX_EX=3,DECK_MIN=24,DECK_MAX=30;
const maxEx=id=>M.maxEx?M.maxEx(id):MAX_EX; /* animal : 1 exemplaire */
/* Toutes les raisons qui rendent un deck injouable (memes regles que M.erreurDeck, qui s'arrete a la premiere) :
   [{t:texte long, c:texte court, ids:cartes en cause, inc:cartes retirees du jeu}]. [] = deck jouable. */
function raisonsDeck(d){
  const o={},R=[],nom=k=>M.CARTES[k].nom;let n=0;
  for(const k in d.cartes){const v=+d.cartes[k];if(v>0){o[k]=v;n+=v}}
  const inc=Object.keys(o).filter(k=>!M.TYPES.includes(k)),ok=Object.keys(o).filter(k=>M.TYPES.includes(k));
  if(inc.length){const q=inc.reduce((t,k)=>t+o[k],0);R.push({c:q>1?q+' cartes retirées':'1 carte retirée',t:q>1?'Deck invalide : '+q+' cartes retirées du jeu. Retire-les pour jouer ce deck.':'Deck invalide : 1 carte retirée du jeu. Retire-la pour jouer ce deck.',ids:[],inc})}
  ok.forEach(k=>{const mx=maxEx(k);if(!Number.isInteger(o[k])||o[k]>mx)R.push({c:nom(k)+' ×'+o[k],t:'Deck invalide : '+nom(k)+' x'+o[k]+', '+(mx===1?'1 exemplaire au plus pour un animal':mx+' exemplaires au plus')+'. Retire '+(o[k]-mx)+' '+nom(k)+'.',ids:[k]})});
  /* 0.5 : un animal demande au moins un exemplaire de la base de son maitre (M.animauxSansBase ; le moteur garde l'ancienne regle pour les rejeux). Carte fautive = l'animal, nom en vert. */
  ok.filter(k=>M.estAnimal(k)).forEach(k=>{const m=M.maitreDe(k);if(+o[m]>0)return;const cb=CARTES.find(x=>x[0]===m),nb=cb?cb[1]:nom(m);
    R.push({c:nom(k)+' sans '+nb,t:'Deck invalide : '+nom(k)+' sans '+nb+' de base. Ajoute un '+nb+' de base.',pc:[{ani:nom(k)},' sans '+nb],pt:['Deck invalide : ',{ani:nom(k)},' sans '+nb+' de base. Ajoute un '+nb+' de base.'],ids:[k]})});
  if(n<DECK_MIN)R.push({c:n+' cartes sur '+DECK_MIN,t:'Deck invalide : '+n+' carte'+(n>1?'s':'')+', '+DECK_MIN+' au moins. Ajoute '+(DECK_MIN-n)+' carte'+(DECK_MIN-n>1?'s':'')+'.',ids:[]});
  if(n>DECK_MAX)R.push({c:n+' cartes sur '+DECK_MAX,t:'Deck invalide : '+n+' cartes, '+DECK_MAX+' au plus. Retire '+(n-DECK_MAX)+' carte'+(n-DECK_MAX>1?'s':'')+'.',ids:[]});
  /* 0.5 : une evolution demande au moins un exemplaire de sa base (M.evolutionsSansBase ; le moteur ne le verifie pas, pour les rejeux). Carte fautive = l'evolution. */
  if(M.evolutionsSansBase)M.evolutionsSansBase(o).forEach(k=>{const b=M.CARTES[k].base,cb=CARTES.find(x=>x[0]===b),nb=cb?cb[1]:nom(b);R.push({c:nom(k)+' sans '+nb,t:'Deck invalide : '+nom(k)+' sans '+nb+' de base. Ajoute un '+nb+' de base.',pc:[{or:nom(k)},' sans '+nb],pt:['Deck invalide : ',{or:nom(k)},' sans '+nb+' de base. Ajoute un '+nb+' de base.'],ids:[k]})});
  /* 0.4a : 4 elements differents au plus (M.erreurElements ; le moteur ne le verifie pas, pour les rejeux). */
  {const E=M.elementsDeck?M.elementsDeck(o):[];if(E.length>M.ELEM_MAX)R.push({c:E.length+' éléments sur '+M.ELEM_MAX,t:'Deck invalide : '+E.length+' éléments, '+M.ELEM_MAX+' au plus. Retire les cartes d’un élément.',ids:[]})}
  /* Le moteur fait foi : s'il refuse le deck pour une raison non prevue ici, son message est repris. */
  if(!R.length){let e='';try{e=M.erreurDeck(o)||''}catch(x){e='deck illisible'}if(e)R.push({c:e,t:e==='deck illisible'?'Deck invalide : deck illisible. Recrée-le ou importe-le à nouveau.':'Deck invalide : '+e+'.',ids:[]})}
  return R;
}
/* 0.5 : texte riche d'une raison (pt, pc) : nom d'evolution en dore, picto + nom d'element a la taille du texte ; sinon le texte simple. */
function texteRiche(P,txt){if(!P)return [txt];return P.map(x=>{if(typeof x==='string')return x;if(x.or)return el('span','r-evo',x.or);if(x.ani)return el('span','r-ani',x.ani);const z=el('span','r-el'),i=picto(x.el);i.alt='';z.append(i,nomEl(x.el));return z})}
/* Compte connecte : decks dans Firebase (ecriture groupee apres 600 ms). Invite : sur l'appareil. */
const decksLocaux=()=>litListe('golems.decks').filter(d=>d&&typeof d.nom==='string'&&d.cartes);
const lesDecks=()=>compteCo()?room.compte.donnees().decks.map(d=>({...d,cartes:{...d.cartes}})):decksLocaux();
function gardeDecks(l){
  l.forEach(x=>{if(x&&!x.v)x.v=M.VERSION}); /* 0.6 : version du site a l'enregistrement (etiquette de version) */
  if(!compteCo()){ecrire('golems.decks',JSON.stringify(l));majChoixDeck();return}
  room.compte.donnees().decks=l.map(d=>({...d,cartes:{...d.cartes}}));majChoixDeck();
  clearTimeout(decksT);decksT=setTimeout(()=>{decksT=0;decksVol++;room.compte.ecritDecks(room.compte.donnees().decks).catch(e=>console.warn(e)).finally(()=>decksVol--)},600);
}
/* Choix du deck avant Pret et contre le robot : paquet de test ou deck complet (24 a 30 cartes). */
function decksJouables(){return lesDecks().filter(d=>{const o=Object.fromEntries(Object.entries(d.cartes).filter(([,n])=>+n>0).map(([k,n])=>[k,+n]));return !M.erreurDeck(o)&&!(M.erreurElements&&M.erreurElements(o))&&!(M.erreurEvolutions&&M.erreurEvolutions(o))})}
function deckChoisi(){
  const id=lire('golems.deckChoisi')||'',d=id&&decksJouables().find(x=>x.id===id);
  if(!d)return {id:'',nom:'Test',texte:''};
  const o={};for(const k in d.cartes)if(+d.cartes[k]>0)o[k]=+d.cartes[k];
  return {id:d.id,nom:d.nom,texte:M.deckTexte(o)};
}
function majChoixDeck(){
  const l=decksJouables(),c=deckChoisi();
  document.querySelectorAll('.selDeck').forEach(s=>{
    s.textContent='';const o0=el('option','','Deck par défaut ('+M.TAILLE_DECK+'/30)');o0.value='';s.append(o0);
    l.forEach(d=>{const o=el('option','',d.nom+' ('+totalDeck(d)+' cartes)');o.value=d.id;s.append(o)});
    s.value=c.id;s.disabled=s.id==='deckSalon'&&jePret;
  });
}
document.querySelectorAll('.selDeck').forEach(s=>s.onchange=()=>{ecrire('golems.deckChoisi',s.value);majChoixDeck()});
document.querySelectorAll('.choixDeck').forEach(d=>d.hidden=true);
/* Fenetre de choix du deck avant une partie (fenetre UNIQUE, design B2a) : titre, contexte, tuiles de deck uniques (tuileDk) sur 2 colonnes,
   deck invalide grise avec sa raison, derniere tuile « + Nouveau deck » en pointilles ; rangee [Jouer / Choisir...] [Modifier ce deck] [Annuler].
   Ecrit golems.deckChoisi puis continue. ctx = ligne de contexte sous le titre (sinon : niveau du Golem si un bouton de niveau a ouvert la fenetre). */
/* Appels sans libelle (commun/raccords.js : Creer une partie amicale, Rejoindre par code) : jouer.js pose choixDeckCtx juste avant (lu une fois). */
let choixDeckCtx=null;
function choisirDeck(suite,libOk,ctx){
  $('popDeck')?.remove();
  if(choixDeckCtx&&Date.now()-choixDeckCtx.t<1500){if(!libOk)libOk=choixDeckCtx.lib;if(!ctx)ctx=choixDeckCtx.ctx}choixDeckCtx=null;
  if(!ctx){const n=document.activeElement&&document.activeElement.closest&&document.activeElement.closest('[data-niveau]');if(n){const x=n.dataset.niveau||'';ctx='Entraînement contre le Golem - '+x.charAt(0).toUpperCase()+x.slice(1)}}
  const {v,f,ferme}=fenDk('popDeck');f.classList.add('cd-fen');
  const h=el('h3','sc-fen-titre','Choisis ton deck');h.id='cdTitre';v.setAttribute('aria-labelledby','cdTitre');f.append(h);
  if(ctx)f.append(el('p','cd-ctx',ctx));
  const g=el('div','cd-grille');g.setAttribute('role','listbox');g.setAttribute('aria-labelledby','cdTitre');f.append(g);
  let sel=deckChoisi().id;const tuiles=[];
  const marque=()=>tuiles.forEach(x=>{x.t.classList.toggle('sel',x.id===sel);x.t.setAttribute('aria-selected',String(x.id===sel))});
  const tuile=(id,o)=>{
    const t=tuileDk(o),off=!!(o.R&&o.R.length);t.setAttribute('role','option');t.tabIndex=off?-1:0;
    if(off){t.classList.add('cd-off');t.setAttribute('aria-disabled','true')}
    else{t.onclick=()=>{sel=id;marque();majBtns()};t.ondblclick=()=>{sel=id;go()};t.onkeydown=e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();sel=id;marque();majBtns()}}}
    tuiles.push({id,t});g.append(t);
  };
  tuile('',{nom:'Deck par défaut',els:M.TYPES?[...new Set(M.TYPES.flatMap(k=>M.CARTES[k].el))]:[],nb:M.TAILLE_DECK,R:[],v:M.VERSION});
  const L=lesDecks();
  L.forEach(d=>tuile(d.id,{nom:d.nom,els:elsOrdre(d),nb:totalDeck(d),R:raisonsDeck(d),v:d.v||M.VERSION,cartes:d.cartes}));
  if(!tuiles.some(x=>x.id===sel&&!x.t.classList.contains('cd-off')))sel='';
  const nv=el('button','cd-nouveau');nv.type='button';nv.append(el('span','cd-plus','+'),'Nouveau deck');
  if(L.length>=MAX_DECKS){nv.disabled=true;nv.title=MAX_DECKS+' decks au plus'}
  nv.onclick=()=>{const L2=lesDecks();if(L2.length>=MAX_DECKS)return;const x={id:nouveauSid(),nom:'Deck '+(L2.length+1),cartes:{}};gardeDecks(L2.concat(x));ferme();vueDk='decks';deckVu=x.id;msgDk=null;onglet('decks')};
  g.append(nv);
  const go=()=>{ecrire('golems.deckChoisi',sel);majChoixDeck();ferme();suite()};
  const ac=el('div','sc-fen-actions'),ok=el('button','sc-btn',libOk||'Jouer'),md=el('button','sc-btn sc-secondaire','Modifier ce deck'),an=el('button','sc-btn sc-secondaire','Annuler');
  ok.type=md.type=an.type='button';ok.onclick=go;an.onclick=ferme;
  md.onclick=()=>{if(!sel)return;ferme();vueDk='decks';deckVu=sel;msgDk=null;msgInfoDk=null;onglet('decks')};
  const majBtns=()=>{md.disabled=!sel;md.title=sel?'':'Le deck par défaut ne se modifie pas'};
  ac.append(ok,md,an);f.append(ac);marque();majBtns();ok.focus();
}
/* Element du deck pour le bandeau d'historique */
function elsTexte(t){const o=M.lisDeck(t);return [...new Set((o?Object.keys(o):M.TYPES).flatMap(k=>M.CARTES[k].el))]}
/* Import des donnees de l'appareil a la premiere connexion d'un compte */
function proposeImport(){
  const D=room.compte.donnees();if(!D||D.importe||lire('golems.import.'+room.compte.uid()))return;
  const dl=decksLocaux(),hl=litListe('golems.historique');
  if(!dl.length&&!hl.length){room.compte.marqueImport().catch(()=>{});return}
  const v=el('div','voile'),b=el('div','boite');v.setAttribute('role','dialog');v.setAttribute('aria-modal','true');v.id='popImport';
  b.append(el('h2','','Importer tes données ?'),el('p','',"Cet appareil contient "+dl.length+" deck"+(dl.length>1?'s':'')+" et "+hl.length+" partie"+(hl.length>1?'s':'')+" jouée"+(hl.length>1?'s':'')+". Les ajouter à ton compte ?"+(D.decks.length+dl.length>MAX_DECKS?' Au-delà de '+MAX_DECKS+' decks, les derniers ne sont pas importés.':'')));
  const z=el('div','p-btns'),oui=el('button','btn plein','Importer'),non=el('button','btn sec','Non merci');oui.type=non.type='button';
  const fin=()=>{ecrire('golems.import.'+room.compte.uid(),'1');room.compte.marqueImport().catch(()=>{});v.remove()};
  oui.onclick=async()=>{
    oui.disabled=non.disabled=true;
    try{
      const ids=new Set(D.decks.map(d=>d.id)),l=D.decks.concat(dl.filter(d=>!ids.has(d.id)).map(d=>({id:String(d.id).replace(/[^a-z0-9]/g,'').slice(0,16)||nouveauSid(),nom:nettoie(d.nom,24)||'Deck',cartes:d.cartes}))).slice(0,MAX_DECKS);
      await room.compte.ecritDecks(l);
      await room.compte.ajouteHisto(hl.filter(x=>x&&typeof x.id==='string'&&/^-?[0-9]{1,12}-[0-9]{10,14}$/.test(x.id)));
    }catch(e){console.warn(e)}
    fin();majChoixDeck();if(!$('decks').hidden)peintDecks();if(!$('historique').hidden)peintHisto();
  };
  non.onclick=fin;z.append(oui,non);b.append(z);v.append(b);document.body.append(v);oui.focus();
}
const totalDeck=d=>Object.values(d.cartes).reduce((t,n)=>t+(+n||0),0);
const elsDeck=d=>[...new Set(CARTES.filter(c=>d.cartes[c[0]]>0).flatMap(c=>c[2]))];
const valide=d=>{const n=totalDeck(d);return n>=DECK_MIN&&n<=DECK_MAX};
/* Vert seulement si le deck est jouable : bon nombre de cartes mais deck injouable = compteur neutre. */
function compteNb(n,injouable){return el('span','d-compte'+(n<DECK_MIN||n>DECK_MAX?' ko':injouable?'':' ok'),n+'/'+DECK_MAX)}
function compteDeck(d){return compteNb(totalDeck(d),raisonsDeck(d).length>0)}
/* 0.6 : TUILE DE DECK UNIQUE (charte : celle de Mes decks, degrade des elements, compteur x/30), partout ou un deck est montre :
   Mes decks, fenetre de choix du deck (B2a), sieges du salon (le mien ; celui de l'adversaire en neutre, deck masque).
   o = {nom, els, nb, R (raisons, [] = jouable), v (version du deck, etiquette etq-v), cartes ({id:n}, pour l'etiquette rouge),
   masque (deck adverse : fond neutre, pastille « ? »), sous (petite ligne a la place des pictos : place libre du salon)}. */
function tuileDk(o){
  const E=ELS_DK.filter(e=>(o.els||[]).includes(e)),R=o.R||[],n=o.nb,t=el('div','dk-tuile'+(R.length?' inv':'')+(o.masque?' dk-masque':''));
  t.style.background=o.masque?'var(--panneau2)':fondDeck(E);
  const g=el('div'),nm=el('b','',o.nom);nm.title=o.nom;const pi=el('span','pi');
  if(o.sous)pi.append(el('span','dk-sous',o.sous));else if(o.masque)pi.append(pastilleInconnue());else E.forEach(e=>pi.append(picto(e)));
  if(o.v&&!o.masque){const ev=etqVersionDeck(o.v,o.cartes);ev.style.marginLeft=(8+Math.max(0,4-E.length)*19)+'px';pi.append(ev)}
  g.append(nm,pi);t.append(g);
  if(Number.isFinite(n))t.append(el('span','ct'+(n<DECK_MIN||n>DECK_MAX?' ko':''),n+'/'+DECK_MAX));
  if(R.length){const r=el('span','rs',R.length>1?'Deck invalide : '+R.length+' raisons. Ouvre le deck pour corriger.':'Deck invalide : '+R[0].c+'.');r.title=R.map(z=>z.t).join('\n');t.append(r)}
  return t;
}
/* Ancien point d'entree (salon, spectateur-ui.js) : rend la tuile unique, a poser dans un conteneur .cd-tuile. */
function enteteDeck(nom,els,nb,injouable,v,cartes){return [tuileDk({nom,els,nb,R:injouable&&typeof injouable==='object'?injouable:[],v,cartes})]}
/* 0.6 : etiquette de version d'un deck. Bleue (etq-v) toujours ; ROUGE (vx-diff) si une carte du deck a ete modifiee depuis la
   version du deck (liste VERSIONS_CARTES, versions-cartes.js), la raison au survol. */
function cmpVersion(a,b){
  const p=s=>String(s||'').match(/[0-9]+|[a-z]+/g)||[],x=p(a),y=p(b);
  for(let i=0;i<Math.max(x.length,y.length);i++){const u=x[i],w=y[i];if(u===w)continue;if(u===undefined)return -1;if(w===undefined)return 1;
    const nu=/^[0-9]/.test(u),nw=/^[0-9]/.test(w);if(nu&&nw)return +u-+w;if(nu!==nw)return nu?1:-1;return u<w?-1:1}
  return 0;
}
function cartesModifiees(v,cartes){
  const L=window.VERSIONS_CARTES||{};if(!v||!cartes)return [];
  return Object.keys(cartes).filter(k=>+cartes[k]>0&&L[k]&&cmpVersion(L[k],v)>0).map(k=>({id:k,v:L[k]}));
}
function etqVersionDeck(v,cartes){
  const m=cartesModifiees(v,cartes),e=el('span','etq-v vx-etq'+(m.length?' vx-diff':''),'v'+v);
  if(!m.length){e.title='Deck de la version '+v;return e}
  const nomC=k=>{const c=CARTES.find(x=>x[0]===k);return c?c[1]:M.CARTES[k]?M.CARTES[k].nom:k};
  const parV={};m.forEach(x=>(parV[x.v]=parV[x.v]||[]).push(nomC(x.id)));
  e.title='Deck de la v'+v+' : '+Object.keys(parV).sort(cmpVersion).map(w=>parV[w].join(', ')+(parV[w].length>1?' modifiées':' modifiée')+' en v'+w).join(' ; ')+'. Vérifie ton deck.';
  e.setAttribute('aria-label',e.title);return e;
}
/* Pastille « ? » du deck adverse masque (a la place des pictos d'elements). */
function pastilleInconnue(){const s=el('span','dk-inc','?');s.setAttribute('aria-hidden','true');return s}
function picto(e){const i=el('img');i.src=imgV('cartes/'+e+'.png');i.alt=e;i.width=26;i.height=26;return i}
/* 0.6 (maquette 25, disposition A) : onglet Decks fusionne avec Cartes derriere le selecteur « Decks | Cartes ».
   Decks = trois colonnes (Mes decks - catalogue filtre avec quantites - panneau du deck ouvert) ; Cartes = le meme catalogue, sans quantites.
   Le deck choisi se modifie directement dans le catalogue (plus d'editeur a part) ; « Placements » ouvre « Tester des placements » en fenetre. */
let vueDk='decks',pageDk=0,msgDk=null,msgDkId=null,msgInfoDk=null,listeDepliee=false;
const fDk={q:'',inc:new Set(),exc:new Set(),mode:'ou',ty:'',cout:new Set(),tri:'',desc:false};
const ELS_DK=['magma','cristal','foudre','brume','roche'];
const fondDeck=E=>E.length>1?'linear-gradient(120deg,'+E.map(e=>'color-mix(in srgb,var(--'+e+') 60%,#0a121a)').join(',')+')':E.length?'color-mix(in srgb,var(--'+E[0]+') 60%,#0a121a)':'var(--panneau2)';
const dkAuDepart=()=>!fDk.q&&!fDk.inc.size&&!fDk.exc.size&&!fDk.cout.size&&!fDk.ty&&!fDk.tri&&!fDk.desc&&fDk.mode==='ou';
function dkPasse(id,d){const C=M.CARTES[id],c=CARTES.find(x=>x[0]===id);if(!C||!c)return false;
  if(fDk.ty==='m'&&!(d&&+d.cartes[id]>0))return false;
  if(fDk.q){const t=sansAccent(c[1]+' '+numeroAffiche(id)+' '+(C.texte||''));if(!t.includes(sansAccent(fDk.q.trim())))return false}
  if(fDk.ty==='a'&&!C.animal)return false;if(fDk.ty==='0'&&(C.base||C.animal))return false;if(fDk.ty==='1'&&!C.base)return false;
  const e=C.el||[];if((fDk.inc.size||fDk.exc.size)&&!e.length)return false;if(e.some(x=>fDk.exc.has(x)))return false;
  if(fDk.inc.size&&!(fDk.mode==='et'?[...fDk.inc].every(x=>e.includes(x)):e.some(x=>fDk.inc.has(x))))return false;
  if(fDk.cout.size&&!fDk.cout.has(Math.min(6,C.cout)))return false;return true}
function dkVues(d){
  if(fDk.ty==='t'){const L=M.TERRAINS.slice();if(fDk.tri==='nom')L.sort((a,b)=>a.nom.localeCompare(b.nom,'fr',{sensitivity:'base'}));return fDk.desc?L.reverse():L}
  const ORD=CARTES.map(c=>c[0]),o=(a,b)=>ORD.indexOf(a)-ORD.indexOf(b),C=M.CARTES;
  const k={nom:(a,b)=>C[a].nom.localeCompare(C[b].nom,'fr',{sensitivity:'base',numeric:true})||o(a,b),cout:(a,b)=>C[a].cout-C[b].cout||o(a,b),force:(a,b)=>(C[a].force||0)-(C[b].force||0)||o(a,b)}[fDk.tri]||o;
  const L=ORD.filter(id=>dkPasse(id,d)).sort(k);return fDk.desc?L.reverse():L}
const btnDk=(t,cl,f)=>{const b=el('button','sc-btn'+(cl?' '+cl:''),t);b.type='button';if(f)b.onclick=f;return b};
const alerteDk=(t,info,cl)=>{const a=el('div','sc-alerte '+(info?'sc-info':'sc-erreur')+(cl?' '+cl:''));a.setAttribute('role',info?'status':'alert');a.append(el('i'));const s=el('span');if(typeof t==='string')s.textContent=t;else s.append(...t);a.append(s);return a};
function selVueDk(){const s=el('div','sc-sel dk-vue');s.setAttribute('role','group');s.setAttribute('aria-label','Vue');
  [['decks','Decks'],['cartes','Cartes']].forEach(([v,t])=>{const b=el('button','',t);b.type='button';b.setAttribute('aria-pressed',String(vueDk===v));b.onclick=()=>{if(vueDk===v)return;vueDk=v;pageDk=0;if(v==='cartes'&&fDk.ty==='m')fDk.ty='';peintDecks()};s.append(b)});return s}
function peintDecks(){
  const b=$('listeDecks');if(!b)return;b.textContent='';$('popTest')?.remove();
  const l=lesDecks(),co=compteCo(),plein=l.length>=MAX_DECKS;
  if(deckVu&&!l.some(x=>x.id===deckVu))deckVu=null;if(!deckVu&&l.length)deckVu=l[0].id;
  const d=vueDk==='decks'?l.find(x=>x.id===deckVu)||null:null;deckOuvert=d?d.id:null;
  const ba=el('div','dk-barre');ba.append(selVueDk());b.append(ba);
  const W=el('div',vueDk==='decks'?'dkA':'dkA dk-cartes');W.id='dkA';b.append(W);
  /* 1. Mes decks */
  const L=el('div','bloc dk-col');
  if(vueDk==='decks'){
    const h=el('h3','dk-titre','Mes decks');h.append(el('span','dk-nb',l.length+' sur '+MAX_DECKS));L.append(h);
    const ls=el('div','dk-dks');ls.setAttribute('role','list');
    l.forEach(x=>{const t=tuileDk({nom:x.nom,els:elsOrdre(x),nb:totalDeck(x),R:raisonsDeck(x),v:x.v||M.VERSION,cartes:x.cartes});
      if(x.id===deckVu)t.classList.add('sel');t.tabIndex=0;t.setAttribute('role','listitem');t.setAttribute('aria-current',String(x.id===deckVu));
      const ouvre=()=>{deckVu=x.id;msgDk=null;msgInfoDk=null;listeDepliee=false;peintDecks()};t.onclick=ouvre;t.onkeydown=e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();ouvre()}};ls.append(t)});
    if(!l.length)ls.append(el('p','dk-vide0','Aucun deck pour le moment. Crée ton premier deck.'));
    L.append(ls);
    /* Invite (variante B) : tuile sous la liste, decks gardes sur l'appareil, repris a la connexion */
    if(!co){const iv=el('div','dk-invite');iv.innerHTML='<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="6" y="2.5" width="12" height="19" rx="2.5" fill="none" stroke="currentColor" stroke-width="2"/><path d="M10.5 18h3" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>';
      const p=el('p');p.append(el('b','','Decks sur cet appareil'),'Connecte-toi pour les avoir partout.');
      const c1=btnDk('Se connecter','',()=>ouvrePseudo()),c2=btnDk('Créer un compte','sc-secondaire',()=>{ouvrePseudo();const c=$('creerCompte')||document.querySelector('#popPseudo [data-mode="creer"],#popPseudo .co-creer');if(c)c.click()});
      iv.append(p,c1,c2);L.append(iv)}
    if(plein)L.append(alerteDk('Limite atteinte : '+MAX_DECKS+' decks. Supprime-en un.',0,'sc-deux-lignes dk-lim'));
    const nv=btnDk('Nouveau deck','dk-plein',()=>{if(lesDecks().length>=MAX_DECKS)return;const L2=lesDecks(),x={id:nouveauSid(),nom:'Deck '+(L2.length+1),cartes:{}};gardeDecks(L2.concat(x));deckVu=x.id;msgDk=null;peintDecks()});
    const im=btnDk('Importer','sc-secondaire',()=>importeDeck(b,lesDecks())),cs=btnDk('Conseillés','sc-secondaire',deckConseille);
    if(plein)[nv,im,cs].forEach(x=>{x.disabled=true;x.title=MAX_DECKS+' decks au plus'});
    const r2=el('div','dk-ligne');r2.append(im,cs);L.append(nv,r2);
  }else L.append(el('p','dk-aide-c','Toutes les cartes du jeu. Touche une carte pour la voir en grand.'));
  W.append(L);
  /* 2. Catalogue */
  const Cc=el('div','bloc dk-cat');W.append(Cc);
  const f1=el('div','dk-f'),f2=el('div','dk-f'),f3=el('div','dk-f');
  const rc=el('input','dk-rech');rc.type='search';rc.placeholder='Nom, numéro ou mot';rc.value=fDk.q;rc.setAttribute('aria-label','Rechercher une carte');
  let tq=0;rc.oninput=()=>{fDk.q=rc.value;clearTimeout(tq);tq=setTimeout(()=>{pageDk=0;peintDecks();const r=document.querySelector('#dkA .dk-rech');if(r){r.focus();r.setSelectionRange(r.value.length,r.value.length)}},250)};
  const pills=(L2,sel,clic,cl)=>{const z=el('div','dk-pp'+(cl?' '+cl:''));L2.forEach(([v,t])=>{const q=el('button','dk-p',t);q.type='button';q.setAttribute('aria-pressed',String(sel(v)));q.onclick=()=>clic(v);z.append(q)});return z};
  const re=()=>{pageDk=0;peintDecks()};
  const tri=pills([['','Numéro'],['nom','Nom'],['cout','Coût'],['force','Force']],v=>v===fDk.tri,v=>{fDk.tri=v;re()});
  if(fDk.ty==='t')[...tri.children].slice(2).forEach(x=>{x.disabled=true;x.title='Les terrains n’ont ni coût ni Force'});
  {const s=el('button','dk-p');s.type='button';s.innerHTML='<svg viewBox="0 0 16 16" aria-hidden="true"><path d="'+(fDk.desc?'M8 3v10M3.5 8.5L8 13l4.5-4.5':'M8 13V3M3.5 7.5L8 3l4.5 4.5')+'" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>';s.append(fDk.desc?'Décroissant':'Croissant');s.onclick=()=>{fDk.desc=!fDk.desc;re()};tri.append(s)}
  const ri=btnDk('Réinitialiser','sc-tertiaire dk-reinit',()=>{fDk.q='';fDk.inc.clear();fDk.exc.clear();fDk.cout.clear();fDk.ty='';fDk.tri='';fDk.desc=false;fDk.mode='ou';re()});ri.disabled=dkAuDepart();
  f1.append(rc,el('span','dk-sep'),el('span','dk-lib','Trier'),tri,el('span','dk-sep'),ri);
  const TYS=[['','Toutes'],['0','Base'],['1','Évolution'],['a','Animaux'],['t','Terrains']].concat(d?[['m','Dans mon deck']]:[]);
  f2.append(el('span','dk-lib','Afficher'),pills(TYS,v=>v===fDk.ty,v=>{fDk.ty=v;if(v==='t'&&fDk.tri!=='nom')fDk.tri='';re()}));
  {const q2=el('span','dk-lib dk-q2');q2.append('Éléments ');const i=el('i','','?');i.tabIndex=0;i.setAttribute('aria-label','Aide : 1 clic inclure, 2 clics exclure, 3e clic neutre');q2.append(i);
   const bu=el('span','dk-bulle');bu.innerHTML='1 clic : <b>inclure</b> - 2 clics : <b class="dk-x">exclure</b> - 3e clic : neutre';q2.append(bu);
   const es=el('div','e3s'+(fDk.inc.size?'':' neutre'));
   ELS_DK.forEach(e=>{const x=el('button','e3');x.type='button';const im=el('img');im.src=imgV('cartes/'+e+'.png');im.alt='';x.append(im);x.style.setProperty('--c','var(--'+e+')');
     const s=fDk.inc.has(e)?'in':fDk.exc.has(e)?'out':'';x.dataset.s=s;x.title=nomEl(e)+(s==='in'?' : inclus':s==='out'?' : exclu':'');x.setAttribute('aria-label',x.title);
     x.onclick=()=>{if(s==='')fDk.inc.add(e);else if(s==='in'){fDk.inc.delete(e);fDk.exc.add(e)}else fDk.exc.delete(e);re()};es.append(x)});
   const md=el('div','sc-sel sc-petit dk-mode');md.setAttribute('role','group');md.setAttribute('aria-label','Une carte doit avoir');
   [['ou','Au moins un'],['et','Tous']].forEach(([v,t])=>{const x=el('button','',t);x.type='button';x.setAttribute('aria-pressed',String(fDk.mode===v));x.onclick=()=>{fDk.mode=v;re()};md.append(x)});
   const cts=pills([[0,'0'],[1,'1'],[2,'2'],[3,'3'],[4,'4'],[5,'5'],[6,'6+']],v=>fDk.cout.has(v),v=>{fDk.cout.has(v)?fDk.cout.delete(v):fDk.cout.add(v);re()},'dk-couts');
   f3.append(q2,es,md,el('span','dk-sep'),el('span','dk-lib','Coût'),cts);if(fDk.ty==='t')f3.classList.add('dk-off')}
  Cc.append(f1,f2,f3);
  if(msgDk&&d)Cc.append(alerteDk(msgDk,0,'sc-une-ligne dk-msg'));
  if(msgInfoDk&&!msgDk)Cc.append(alerteDk(msgInfoDk,1,'sc-une-ligne dk-msg'));
  if(fDk.q.trim()){const a=alerteDk('Recherche : « '+fDk.q.trim()+' » dans le nom, le numéro et le texte des cartes.',1,'sc-une-ligne dk-msg'),x=btnDk('Effacer la recherche','sc-tertiaire',()=>{fDk.q='';re()});a.append(x);Cc.append(a)}
  const gb=el('div','dk-gb');Cc.append(gb);
  /* 3. Panneau du deck ouvert */
  let R=null;
  if(vueDk==='decks'){R=el('div','bloc dk-pan');W.append(R);
    if(!d){R.classList.add('dk-r0');R.append(el('p','dk-aide-c','De '+DECK_MIN+' à '+DECK_MAX+' cartes, 3 exemplaires au plus, '+M.ELEM_MAX+' éléments au plus.'))}
    else panneauDk(R,d,l)}
  /* hauteur : l'onglet tient dans l'ecran (24 px sous les blocs), sauf ecran trop bas */
  const top=W.getBoundingClientRect().top+scrollY;W.style.height=Math.max(640,innerHeight-top-24)+'px';
  grilleDk(gb,d,l);
}
function grilleDk(box,d,l){
  const ids=dkVues(d),g=el('div','dk-gr'),pd=el('div','dk-pied');box.append(g,pd);
  const W2=g.clientWidth,H2=box.getBoundingClientRect().bottom-g.getBoundingClientRect().top-52,cols=vueDk==='cartes'?(innerWidth>1800?9:8):(innerWidth>1800?7:6),gap=14,qte=vueDk==='decks'&&d&&fDk.ty!=='t',bas=(qte?36:0)+(fDk.q.trim()?24:0);
  const w=Math.max(60,Math.floor(Math.min((W2-gap*(cols-1))/cols,((H2+gap)/3-gap-bas)/1.4)));
  g.style.gridTemplateColumns='repeat('+cols+','+w+'px)';g.style.setProperty('--h',Math.round(w*1.4)+'px');
  const per=cols*3,pages=Math.max(1,Math.ceil(ids.length/per));if(pageDk>=pages)pageDk=pages-1;
  const Ed=d?M.elementsDeck(d.cartes):[],tot=d?totalDeck(d):0,fautes=new Set(d?raisonsDeck(d).flatMap(r=>r.ids):[]);
  ids.slice(pageDk*per,pageDk*per+per).forEach(id=>{
    if(typeof id==='object'){const T=id,z=el('div','dk-c dk-ter'),i=el('img');i.src=srcTerrain(T);i.alt=T.nom;i.tabIndex=0;i.setAttribute('role','button');i.setAttribute('aria-label','Agrandir '+T.nom);
      i.onclick=()=>{dernier=i;ouvreTerrainGalerie(T)};i.onkeydown=e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();i.onclick()}};const p=el('div','dk-tn'),s=el('span','dk-pts');s.append(ico('coupe'),T.pts+(T.pts>1?' pts':' pt'));p.append(s);z.append(i,p);g.append(z);return}
    const c=CARTES.find(x=>x[0]===id),C=M.CARTES[id],n=d?+d.cartes[id]||0:0,z=el('div','dk-c'+(n?' dans':'')+(fautes.has(id)?' faute':'')),i=el('img');
    i.src=imgV('cartes/'+id+'.jpg');i.alt=c[1];i.loading='lazy';i.tabIndex=0;i.setAttribute('role','button');i.setAttribute('aria-label','Agrandir '+c[1]);
    i.onclick=()=>{dernier=i;zoom(i.src,c[1],[...statZoomCarte(id),boutonLienCarte(idLienCarte(id))])};i.onkeydown=e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();i.onclick()}};z.append(i);
    if(qte){const mx=maxEx(id),q=el('div','dk-q'+(n?'':' zero')),m=el('button','','-'),p=el('button','','+');m.type=p.type='button';
      m.setAttribute('aria-label','Retirer '+c[1]);p.setAttribute('aria-label','Ajouter '+c[1]);m.disabled=!n;
      const ch=v=>{d.cartes[id]=n+v;d.v=M.VERSION;msgInfoDk=null;if(!d.cartes[id])delete d.cartes[id];msgDk=msgDkId=null;gardeDecks(l);peintDecks()};m.onclick=()=>ch(-1);
      const neufs=(C.el||[]).filter(e=>!Ed.includes(e)),trop=!n&&neufs.length&&Ed.length+neufs.length>M.ELEM_MAX;
      if(tot>=DECK_MAX){p.classList.add(msgDkId===id?'dk-ko':'dk-gris');p.title=DECK_MAX+' cartes au plus';p.onclick=()=>{msgDkId=id;msgDk='Ajout impossible : deck complet, '+DECK_MAX+' cartes au plus. Retire une carte avant d’en ajouter une.';peintDecks()}}
      else if(n>=mx){p.classList.add(msgDkId===id?'dk-ko':'dk-gris');p.title=mx===1?'1 exemplaire au plus':mx+' exemplaires au plus';p.onclick=()=>{msgDkId=id;msgDk='Ajout impossible : '+C.nom+' x'+n+', '+(mx===1?'1 exemplaire au plus pour un animal.':mx+' exemplaires au plus.');peintDecks()}}
      else if(trop){p.classList.add(msgDkId===id?'dk-ko':'dk-gris');p.title=M.ELEM_MAX+' éléments au plus par deck';p.onclick=()=>{msgDkId=id;msgDk='Ajout impossible : '+C.nom+' ajouterait un '+(Ed.length+neufs.length)+'e élément, '+M.ELEM_MAX+' au plus. Retire d’abord les cartes d’un élément.';peintDecks()}}
      else p.onclick=()=>ch(1);
      q.append(m,el('b','',n+'/'+mx),p);z.append(q)}
    if(fDk.q.trim()){const src=C.texte||'',k=sansAccent(src).indexOf(sansAccent(fDk.q.trim())),ex=el('div','dk-ex');
      if(k>=0){const L=fDk.q.trim().length,a=Math.max(0,k-14),b2=Math.min(src.length,k+L+14);ex.append((a?'…':'')+src.slice(a,k),el('mark','',src.slice(k,k+L)),src.slice(k+L,b2)+(b2<src.length?'…':''))}else ex.append(el('mark','',C.nom));ex.title=src;z.append(ex)}
    g.append(z)});
  if(!ids.length){const a=alerteDk('Aucun résultat pour ces filtres. Réinitialise les filtres.',1,'sc-une-ligne dk-vide2');a.append(btnDk('Réinitialiser les filtres','sc-tertiaire',()=>{fDk.q='';fDk.inc.clear();fDk.exc.clear();fDk.cout.clear();fDk.ty='';fDk.mode='ou';pageDk=0;peintDecks()}));g.append(a)}
  const nb=el('span','nb',ids.length+(fDk.ty==='t'?(ids.length>1?' terrains':' terrain'):ids.length>1?' cartes':' carte')),pg=el('span','dk-pag'),pr=el('button','','‹'),su=el('button','','›');pr.type=su.type='button';
  pr.setAttribute('aria-label','Page précédente');su.setAttribute('aria-label','Page suivante');pr.disabled=pageDk<=0;su.disabled=pageDk>=pages-1;
  pr.onclick=()=>{pageDk--;peintDecks()};su.onclick=()=>{pageDk++;peintDecks()};pg.append(pr,(pageDk+1)+'/'+pages,su);pd.append(nb,pg);
}
function panneauDk(R,d,l){
  const E=elsOrdre(d),n=totalDeck(d),en=el('div','dk-ent'),nm=el('span','nm',d.nom),pi=el('span','pi'),cr=el('button','cr');nm.title=d.nom;E.forEach(e=>pi.append(picto(e)));
  cr.type='button';cr.title='Renommer';cr.setAttribute('aria-label','Renommer '+d.nom);cr.innerHTML='<svg viewBox="0 0 24 24" aria-hidden="true"><path fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" d="M4 20h4L19 9l-4-4L4 16zM13.5 6.5l4 4"/></svg>';
  cr.onclick=()=>{en.classList.add('dl-edit');renomme(en,l,d)};
  en.append(nm,pi,cr,el('span','ct'+(n<DECK_MIN||n>DECK_MAX?' ko':''),n+'/'+DECK_MAX));R.append(en);
  const Ed=M.elementsDeck(d.cartes),inf=el('div','dk-inf'),nb=f=>Object.keys(d.cartes).filter(k=>M.CARTES[k]&&f(M.CARTES[k])).reduce((a,k)=>a+(+d.cartes[k]||0),0);
  const sp=(t,v,ko)=>{const s=el('span','',t+' ');s.append(el('b',ko?'ko':'',v));inf.append(s)};
  sp('Éléments',Ed.length+'/'+M.ELEM_MAX,Ed.length>M.ELEM_MAX);sp('Bases',String(nb(C=>!C.base&&!C.animal)));sp('Évolutions',String(nb(C=>!!C.base)));R.append(inf);
  const RS=raisonsDeck(d);RS.forEach(r=>{const a=alerteDk(['Deck invalide : ',...texteRiche(r.pt,r.t.replace(/^(Deck incomplet|Trop de cartes|Deck invalide) : /,''))],0,'sc-deux-lignes dk-errp');a.title=r.t;
    if(r.inc){const q=btnDk('Retirer','sc-tertiaire',()=>{r.inc.forEach(k=>delete d.cartes[k]);gardeDecks(l);peintDecks()});a.append(q)}R.append(a)});
  const p=el('div','dk-liste'+(listeDepliee?' deplie':''));decklist(p,d,l);R.append(p);
  const ul=p.querySelector('.dl-liste');
  if(ul){const v=el('button','sc-btn sc-tertiaire dk-voir');v.type='button';ul.after(v);
    requestAnimationFrame(()=>{if(listeDepliee){v.textContent='Réduire la liste';v.onclick=()=>{listeDepliee=false;peintDecks()};return}
      const bot=ul.getBoundingClientRect().bottom;let k=0;[...ul.children].forEach(li=>{if(li.getBoundingClientRect().bottom>bot+.5){li.hidden=true;k++}});
      if(k){v.textContent='Voir toute la liste ('+k+' de plus)';v.onclick=()=>{listeDepliee=true;peintDecks()}}else v.remove()})}
  const r1=el('div','dk-ligne'),r2=el('div','dk-ligne');
  r1.append(btnDk('Placements','',()=>ouvreTest(d,l)),btnDk('Partager','sc-secondaire',()=>partageDeck(R,d)));
  const du=btnDk('Dupliquer','sc-secondaire',()=>{const L2=lesDecks();if(L2.length>=MAX_DECKS)return;const c={id:nouveauSid(),nom:nettoie(d.nom.slice(0,16).trim()+' (copie)',24)||'Deck',cartes:{...d.cartes}};gardeDecks(L2.concat(c));deckVu=c.id;peintDecks()});
  if(l.length>=MAX_DECKS){du.disabled=true;du.title=MAX_DECKS+' decks au plus'}
  r2.append(du,btnDk('Supprimer','dk-danger',()=>confirmeSuppr(d,l)));R.append(r1,r2);
}
function fenDk(id){$(id)?.remove();const v=el('div','voile dk-voile'),f=el('div','sc-fenetre dk-fen');v.id=id;v.append(f);v.setAttribute('role','dialog');v.setAttribute('aria-modal','true');
  const prec=document.activeElement,esc=e=>{if(e.key==='Escape'&&$('vue').hidden)ferme()},ferme=()=>{v.remove();removeEventListener('keydown',esc);if(prec&&prec.isConnected)prec.focus()};addEventListener('keydown',esc);
  v.onclick=e=>{if(e.target===v)ferme()};document.body.append(v);v.hidden=false;return {v,f,ferme}}
function confirmeSuppr(d,l){const {v,f,ferme}=fenDk('popSuppr'),t=el('h3','sc-fen-titre','Supprimer le deck '+d.nom+' ?');t.id='suTitre';v.setAttribute('aria-labelledby','suTitre');
  const a=el('div','sc-fen-actions'),ok=btnDk('Supprimer','dk-danger',()=>{gardeDecks(lesDecks().filter(x=>x.id!==d.id));deckVu=null;ferme();peintDecks()}),an=btnDk('Annuler','sc-secondaire',ferme);
  a.append(ok,an);f.append(t,el('p','dk-fen-p','Le deck et ses '+totalDeck(d)+' cartes seront effacés. Cette action est définitive.'),a);an.focus()}
/* Tester des placements : le bac a sable dans une fenetre, Fermer en bas a droite */
/* Partage de deck par code : GOL1- + base64 URL de "nom\ntexte du deck" (format 1). */
const CODE_DECK='GOL1-';
function codeDeck(d){
  const o={};for(const k in d.cartes)if(+d.cartes[k]>0)o[k]=Math.min(maxEx(k),+d.cartes[k]);
  const t=Object.keys(o).sort().map(k=>k+o[k]).join(''),u=new TextEncoder().encode(d.nom+'\n'+t);
  let s='';u.forEach(x=>s+=String.fromCharCode(x));
  return CODE_DECK+btoa(s).replace(/\+/g,'-').replace(/\//g,'_').replace(/=+$/,'');
}
/* Format 2 (lien ?deck=) : 1 octet N, puis N quantites sur 2 bits dans l'ordre ORDRE_CODE, puis "nom\nauteur" en UTF-8, le tout en base64 URL.
   ORDRE_CODE : AJOUTER LES NOUVELLES CARTES EN FIN SEULEMENT, ne jamais retirer ni deplacer (les anciens liens restent lisibles). */
const ORDRE_CODE='001 001e 002 002e 003 003e 004 004e 007 007e 008 013 013e 009 009e 029 029e 037 037e 026 026e 036 036e 018 018e 041 041e 025 025e 015 015e 016 016e 901 035 035e 042 042e 008e 020 020e 902'.split(' ');
const b64u=u=>{let s='';u.forEach(x=>s+=String.fromCharCode(x));return btoa(s).replace(/\+/g,'-').replace(/\//g,'_').replace(/=+$/,'')};
function codeDeck2(d,auteur){
  if(Object.keys(d.cartes).some(k=>+d.cartes[k]>0&&!ORDRE_CODE.includes(k)))return codeDeck(d); /* carte oubliee dans ORDRE_CODE : format 1 */
  const N=ORDRE_CODE.length,q=new Uint8Array(1+Math.ceil(N/4));q[0]=N;
  ORDRE_CODE.forEach((k,i)=>{const n=Math.max(0,Math.min(3,maxEx(k),+d.cartes[k]||0));q[1+(i>>2)]|=n<<(2*(i&3))});
  const t=new TextEncoder().encode(d.nom+(auteur?'\n'+auteur:'')),u=new Uint8Array(q.length+t.length);u.set(q);u.set(t,q.length);
  return 'GOL2-'+b64u(u);
}
function lienDeck(d,auteur){return 'https://les-golems.github.io/'+(ESSAI?'essai/':'')+'?deck='+codeDeck2(d,auteur)}
function litCode2(s){
  const abime={err:'Import impossible : code abîmé. Vérifie qu’il est complet.'};let u,txt;
  try{const b=atob(s.replace(/-/g,'+').replace(/_/g,'/'));u=Uint8Array.from(b,x=>x.charCodeAt(0))}catch(e){return abime}
  const N=u[0],L=1+Math.ceil(N/4);if(!N||u.length<L)return abime;
  try{txt=new TextDecoder('utf-8',{fatal:true}).decode(u.slice(L))}catch(e){return abime}
  const i=txt.indexOf('\n'),nom=nettoie(i<0?txt:txt.slice(0,i),24)||'Deck importé',auteur=i<0?'':nettoie(txt.slice(i+1),20);
  const connus=new Set(CARTES.map(x=>x[0])),cartes={};let inc=0,tot=0,cou=0;
  for(let j=0;j<N;j++){const v=(u[1+(j>>2)]>>(2*(j&3)))&3;if(!v)continue;const k=ORDRE_CODE[j];
    if(!k||!connus.has(k)){inc++;continue}
    const n=Math.min(maxEx(k),v,DECK_MAX-tot);if(n<v)cou++;if(n<=0)continue;cartes[k]=n;tot+=n}
  return {nom,cartes,inc,cou,auteur};
}
function litCodeDeck(c){
  c=String(c||'').trim();{const l=/[?&]deck=([A-Za-z0-9_-]+)/.exec(c);if(l)c=l[1]} /* lien colle en entier */
  if(/^GOL2-[A-Za-z0-9_-]+$/.test(c))return litCode2(c.slice(5));
  const m=/^GOL(\d+)-([A-Za-z0-9_-]+)$/.exec(c);if(!m)return {err:/^GOL\d+-/.test(c)?'Import impossible : code abîmé. Vérifie qu’il est complet.':'Import impossible : code illisible, il doit commencer par '+CODE_DECK+'. Colle le lien ou le code en entier.'};
  if(m[1]!=='1')return {err:'Import impossible : code d’une version plus récente du site. Recharge la page.'};
  let txt;try{const b=atob(m[2].replace(/-/g,'+').replace(/_/g,'/'));txt=new TextDecoder('utf-8',{fatal:true}).decode(Uint8Array.from(b,x=>x.charCodeAt(0)))}catch(e){return {err:'Import impossible : code abîmé. Vérifie qu’il est complet.'}}
  const i=txt.indexOf('\n');if(i<0)return {err:'Import impossible : code abîmé. Vérifie qu’il est complet.'};
  const nom=nettoie(txt.slice(0,i),24)||'Deck importé',cartes={},connus=new Set(CARTES.map(x=>x[0]));let inc=0,tot=0,cou=0;
  const re=/([0-9]{3}e?)([0-9])/g;let r;
  while((r=re.exec(txt.slice(i+1)))){
    if(!connus.has(r[1])){inc++;continue}
    if(r[1] in cartes)continue;
    const n=Math.min(maxEx(r[1]),+r[2],DECK_MAX-tot);if(n<+r[2])cou++;if(n<=0)continue;cartes[r[1]]=n;tot+=n;
  }
  return {nom,cartes,inc,cou};
}
/* Elements d'un deck dans l'ordre du cercle (Magma, Cristal, Foudre, Brume, Roche). */
const elsOrdre=d=>{const E=elsDeck(d);return EL.map(x=>x[0]).filter(x=>x&&E.includes(x))};
const nomEl=e=>e.charAt(0).toUpperCase()+e.slice(1);
/* Texte pour Discord : nom en gras, total, elements, lien masque. Caracteres Markdown du nom echappes. */
function texteDiscord(d,lien){
  const E=elsOrdre(d).map(nomEl).join(', ');
  return '**'+d.nom.replace(/([\\*_~`|\[\]()<>])/g,'\\$1')+'** - '+totalDeck(d)+' cartes'+(E?' - '+E:'')+' - [Voir le deck]('+lien+')';
}
/* Partager : apercu du message Discord, Copier pour Discord (message complet, lien masque) ou Copier le lien seul. */
/* Deck ouvert par un lien ?deck=CODE : liste comme le panneau de l'onglet Decks, courbe, Importer et Jouer. Invite compris. */
const memeDeck=(a,b)=>{const k=o=>Object.keys(o).filter(x=>+o[x]>0).sort().map(x=>x+(+o[x])).join();return k(a.cartes)===k(b.cartes)};
/* Importer et Jouer grises tant que le compte n'est pas connu (sinon le deck irait sur l'appareil au lieu du compte). */
function majVueDeck(){
  const v=$('popVueDeck');if(!v)return;
  v.querySelectorAll('[data-attend]').forEach(b=>{b.disabled=!compteCharge||b.dataset.injouable==='1'});
  const m=v.querySelector('[data-etat]');if(m&&!m.classList.contains('ok'))m.textContent=!compteCharge?'Chargement de ton compte…':compteCo()?'':'Sans compte, le deck est gardé sur cet appareil.';
}
/* Decks de depart conseilles (0.4) : donnees dans cartes/donnees/interface.js. */
const DECKS_CONSEILLES=window.GolemsDonnees.interface.decksConseilles;
/* Deux elements dominants d'un deck (nombre de cartes par element). */
function elsDominants(c){const n={};for(const k in c){const C=M.CARTES[k];if(C)(C.el||[]).forEach(e=>n[e]=(n[e]||0)+c[k])}return Object.keys(n).sort((a,b)=>n[b]-n[a]).slice(0,2)}
/* Taux de victoire par carte, d'apres la liste du deck notee dans chaque partie : toutes les parties d'un compte (cumuls),
   l'historique de l'appareil pour un invite. Paquet de test (deck note "Test" sans liste) : ses 33 cartes comptent aussi. */
function statsCartes(){
  let c=null;try{c=monCumul()}catch(e){}
  return new Map((c&&Array.isArray(c.c)?c.c:[]).map(e=>[e[0],{n:e[1],v:e[2]}]));
}
function ligneStatCarte(id){
  const o=statsCartes().get(id);if(!o||o.n<1)return null;
  return [el('p','pf-dk','Jouée dans '+o.n+(o.n>1?' parties':' partie')+' - '+Math.round(100*o.v/o.n)+' % de victoires'),el('p','pf-note',compteCo()?'Calculé sur toutes tes parties.':'Calculé sur tes 50 dernières parties.')];
}
/* Hauteur restante jusqu'au bas de la fenetre : le CSS n'en tient compte qu'a partir de 1200 px. */
function hauteurDecks(){
  const z=document.querySelector('.d-zone');if(!z||!z.offsetParent)return;
  /* Grand ecran : le bas du panneau s'aligne sur le bas de la derniere ligne de tuiles. */
  const g=z.querySelector('.d-grille'),gh=g&&innerWidth>=1200?Math.round(g.getBoundingClientRect().height):0;
  if(g&&!g._obs&&window.ResizeObserver){g._obs=new ResizeObserver(()=>hauteurDecks());g._obs.observe(g)}
  const zt=(z.querySelector('.d-ed~.d-panneau')||z).getBoundingClientRect().top; /* editeur : haut du panneau (decale comme dans la liste) */
  z.style.setProperty('--d-h',(gh>=320?gh:Math.min(570,Math.max(320,innerHeight-Math.ceil(zt+scrollY)-12)))+'px');
}
addEventListener('resize',hauteurDecks);
if(document.fonts&&document.fonts.ready)document.fonts.ready.then(hauteurDecks);
/* Liste compacte d'un deck : triee par cout, puis par nom. */
/* Champ Renommer : 24 caracteres, comme nettoie(..,24). */
function renomme(z,l,d){
  z.textContent='';const f=el('form','ligne'),i=el('input');i.type='text';i.maxLength=24;i.value=d.nom;i.setAttribute('aria-label','Nom du deck');
  const ok=el('button','btn','OK');f.append(i,ok);f.onsubmit=e=>{e.preventDefault();const v=nettoie(i.value,24);if(v){d.nom=v;gardeDecks(l)}peintDecks()};z.append(f);i.focus();
}
function decklist(b,d,l){
  /* Nom, pictos des elements juste a sa droite, puis le compte ; Renommer reste sur la tuile. */
  const h=el('div','d-haut'),p=el('div','d-pict');elsDeck(d).forEach(e=>p.append(picto(e)));
  /* Renommer se fait sur la tuile du deck (crayon a gauche du compteur). */
  h.append(el('h3','',d.nom),p,compteDeck(d));
  b.append(h);
  const fautes=new Set(raisonsDeck(d).flatMap(r=>r.ids)); /* raison dans le bandeau a cote d'Importer un deck */
  /* M.CARTES est indexe par identifiant ('001e') ; M.carte attend un numero d'exemplaire de partie. */
  const L=CARTES.filter(c=>d.cartes[c[0]]>0).map(c=>({c,C:M.CARTES[c[0]],n:+d.cartes[c[0]]})).sort((x,y)=>x.C.cout-y.C.cout||x.c[1].localeCompare(y.c[1],'fr'));
  if(!L.length){b.append(el('p','intro o-nb','Ce deck est vide.'));return}
  const u=el('ul','dl-liste'),ap=el('img','dl-apercu');ap.alt='';ap.hidden=true;
  const place=e=>{const W=220,H=308,x=e.clientX+18,y=e.clientY-H/2;ap.style.left=(x+W>innerWidth?e.clientX-W-18:x)+'px';ap.style.top=Math.max(8,Math.min(innerHeight-H-8,y))+'px'};
  L.forEach(({c,C,n})=>{
    const li=el('li'),q=el('button','dl-ligne'),co=el('span','dl-cout'),e=el('span','dl-els'),fo=el('span','dl-force');
    const src=imgV('cartes/'+c[0]+'.jpg');q.type='button';if(fautes.has(c[0]))q.classList.add('dl-fautive');
    if(c[2].length===2){q.classList.add('dl-duo');q.style.setProperty('--a','var(--fm-'+c[2][0]+')');q.style.setProperty('--b','var(--fm-'+c[2][1]+')')}else if(estAnimal(c))q.classList.add('dl-animal')
    q.setAttribute('aria-label',n+' exemplaire'+(n>1?'s':'')+' de '+c[1]+', coût '+C.cout+(C.force!=null?', Force '+C.force:''));
    co.append(ico('enclume'),String(C.cout));c[2].forEach(x=>e.append(picto(x)));
    {const f=forceAff(C);if(f!=null){fo.append(ico('force'),f);if(f.includes(','))fo.classList.add('dl-dec')}}
    /* Pseudo du Golem en haut, titre dessous dans la couleur de son premier element, coupe par des points de suspension */
    const v=c[1].indexOf(', '),nm=el('span','dl-nom');
    nm.append(el('span','dl-pseudo',v<0?c[1]:c[1].slice(0,v)));
    if(v>=0){const ti=el('span','dl-titre',c[1].slice(v+2));ti.style.color=coulT(c);ti.title=c[1].slice(v+2);nm.append(ti)}
    if(estAnimal(c)){fo.className='dl-force dl-mot';fo.textContent='Animal';q.append(co,fo,nm,el('span','dl-nb','×'+n))}else q.append(co,fo,e,nm,el('span','dl-nb','×'+n));
    q.onclick=()=>{ap.hidden=true;zoom(src,c[1])};
    if(matchMedia('(hover:hover)').matches){
      q.onmouseenter=ev=>{ap.src=src;ap.hidden=false;place(ev)};q.onmousemove=place;q.onmouseleave=()=>{ap.hidden=true};
    }
    li.append(q);u.append(li);
  });
  b.append(u,ap);
  /* Pied : compte a gauche, cout moyen a droite ; courbe 0 a 6+ centree, colonne du cout moyen arrondi surlignee. */
  const tot=L.reduce((t,x)=>t+x.n,0),moy=L.reduce((t,x)=>t+x.n*x.C.cout,0)/tot,im=Math.min(6,Math.round(moy));
  const pa=Array.from({length:7},(_,i)=>L.filter(x=>i<6?x.C.cout===i:x.C.cout>=6).reduce((t,x)=>t+x.n,0)),hm=Math.max(1,...pa);
  const pied=el('div','dl-pied'),cv=el('div','dl-courbe'),ent=el('div','dl-total'),mo=el('span','dl-moy');
  mo.append('Coût moyen ',el('b','',moy.toFixed(1).replace('.',',')));
  ent.append(el('b','dl-tot','Courbe d\'énergie'),mo);
  cv.setAttribute('role','img');cv.setAttribute('aria-label','Courbe de coûts : '+pa.map((v,i)=>v+' à '+(i<6?i:'6 ou plus')).join(', '));
  pa.forEach((v,i)=>{const k=el('div','dl-col'+(v?'':' dl-vide')+(i===im?' dl-moy-col':'')),ba=el('i'),pc=el('span','dl-pc');ba.style.setProperty('--v',v/hm);
    pc.append(ico('enclume'),i<6?String(i):'6+');k.append(el('small','',String(v)),ba,pc);cv.append(k)});
  pied.append(ent,cv);
  b.append(pied);
}
/* Bac a sable de placement (editeur de deck). Notre cote seulement : une grille 3 x 3 et 3 terrains, les cartes du deck posees librement.
   Toute Force vient du moteur (M.forceDe, M.colonnes, M.coutPose, M.peutPoser) sur un etat minimal : grille adverse vide, manche 1, aucun resultat.
   Donc : Force de base, Trait, Cyrdan, favori d'Indra, Survolte, KEKWait, Full synergie (partie Trait), Double up ? comptes ;
   cercle, effets sur le Golem en face, degats, Rage, Comeback, Winstreak, fin de manche : non comptes (il faut un adversaire ou une manche jouee).
   Des (Alrevan, KEKWRevan) : resultat choisi (4 ; 3 et 4) ou relance au hasard, Force toujours entiere. Aucune ecriture : l'etat vit en memoire, par deck. */
const bacs={};
/* Des a la pose : nombre de des et valeurs par defaut ; resultat comme effetPose du moteur (2 des : leur somme, un double vaut un seul de). */
const BAC_DES={};idsAvecEffet('forceAuDe').forEach(id=>{const v=window.GolemsDonnees.interface.bacDes[effetDe(id,'forceAuDe').des];if(v)BAC_DES[id]=v}); /* cartes a de (fiches) -> valeurs par defaut selon le nombre de des (cartes/donnees/interface.js) */
const bacDeF=v=>v.length>1&&v[0]!==v[1]?v[0]+v[1]:v[0];
const BAC_NOTE=window.GolemsDonnees.interface.bacNotes;
const bacVide=()=>[[null,null,null],[null,null,null],[null,null,null]];
const bacTirage=()=>M.TERRAINS.map((_,i)=>i).sort(()=>Math.random()-.5).slice(0,3);
function bacDe(d){
  if(!bacs[d.id])bacs[d.id]={T:bacTirage(),G:bacVide(),sel:null,selC:null,mode:null,ouvert:false};
  return bacs[d.id];
}
/* Etat minimal lu par le moteur : notre grille (joueur 0), grille adverse vide, manche 1, aucune manche jouee. */
function bacEtat(B){
  const J=g=>({grille:g,energie:99,main:[],deck:[],defausse:[],forge:[]});
  return {terrains:B.T.map(i=>({...M.TERRAINS[i]})),manche:1,premier:0,joueur:0,resultats:[],log:[],stats:{ev:[],act:[],coups:{}},j:[J(B.G),J(bacVide())]};
}
const bacGolem=g=>!!g&&!M.carte(g.c).animal;
function bacUtilises(B,t){let n=0;B.G.forEach(L=>L.forEach(g=>{if(g&&M.carte(g.c).id===t)n++}));return n}
/* Identifiant de partie libre pour le type t (rang * 3 + exemplaire), comme idsDeck du moteur. */
function bacLibre(B,d,t){
  if(bacUtilises(B,t)>=(+d.cartes[t]||0))return null;
  const r=M.TYPES.indexOf(t),pris=new Set();B.G.forEach(L=>L.forEach(g=>{if(g)pris.add(g.c)}));
  for(let n=0;n<3;n++)if(!pris.has(r*3+n))return r*3+n;
  return null;
}
const bacVois=(l,k)=>[[l-1,k],[l+1,k],[l,k-1],[l,k+1]].filter(([a,b])=>a>=0&&a<3&&b>=0&&b<3);
function bacRetire(B,l,k){
  const g=B.G[l][k];B.G[l][k]=null;if(!g)return;
  /* son animal part avec lui (le moteur : orphelins) */
  if(bacGolem(g))B.G.forEach(L=>L.forEach((h,b)=>{if(h&&M.carte(h.c).animal&&h.maitre===g.c)L[b]=null}));
}
/* Effets de pose qui changent notre Force : des, favori, copie. Les autres effets de pose regardent l'adversaire, la pioche ou la Forge. */
function bacPose(B,l,k){
  const g=B.G[l][k],C=M.carte(g.c);
  if(effetDe(C.id,'copie',r=>r.cible==='face'))g.cp=null; /* Imitation : le Golem en face, absent ici */
  if(effetDe(C.id,'copie',r=>r.cible==='voisin')&&!('cp' in g)){
    const vs=bacVois(l,k).filter(([a,b])=>bacGolem(B.G[a][b]));
    if(!vs.length)g.cp=null;
    else if(vs.length===1)g.cp=M.idEff(B.G[vs[0][0]][vs[0][1]]);
    else{B.selC=[l,k];B.mode='copie';return}
  }
  const id=M.idEff(g);
  if(BAC_DES[id]&&!g.de){g.de=BAC_DES[id].slice();g.f=bacDeF(g.de)}
  if(M.FAV_BONUS[id]){
    if(g.fav!==undefined&&!B.G.flat().some(h=>h&&h.c===g.fav))delete g.fav;
    if(g.fav===undefined){
      const cs=[];B.G.forEach((L,a)=>L.forEach((h,b)=>{if(bacGolem(h)&&!(a===l&&b===k))cs.push([a,b])}));
      if(cs.length===1)g.fav=B.G[cs[0][0]][cs[0][1]].c;
      else if(cs.length>1){B.selC=[l,k];B.mode='fav'}
    }
  }
}
function bacPlace(B,d,t,l,k){
  const s=bacEtat(B),c=bacLibre(B,d,t);if(c===null||!M.peutPoser(s,0,c,l,k))return false;
  const C=M.carte(c),occ=B.G[l][k],g={c,f:C.force||0,d:0};
  if(C.base){ /* evolution sur sa base : la base revient dans le deck du bac a sable */
    if(effetDe(C.id,'favori',r=>r.ragebait)&&occ.fav!==undefined)g.fav=occ.fav;if(occ.ani)g.ani=occ.ani; /* 0.5 : l'animal reste si son maitre evolue */
    B.G.forEach(L=>L.forEach(h=>{if(h&&h.fav===occ.c)h.fav=c;if(h&&M.carte(h.c).animal&&h.maitre===occ.c)h.maitre=c}));
  }else if(C.animal){occ.ani={c};B.sel=null;return true} /* 0.5 : animal sous son maitre, aucune case */
  else if(occ)bacRetire(B,l,k);
  B.G[l][k]=g;B.selC=null;B.mode=null;
  bacPose(B,l,k);
  if(B.mode||!(+d.cartes[t]>bacUtilises(B,t)))B.sel=null; /* choix en attente (favori, copie) ou plus d'exemplaire : carte deselectionnee */
  return true;
}
/* Deplacer (case libre) ou echanger (deux Golems). Un animal ne bouge que vers une case voisine de son maitre ; jamais echange. */
function bacPeut(B,a,b,l,k){
  if(a===l&&b===k)return false;const g=B.G[a][b],h=B.G[l][k];
  if(!h)return bacGolem(g)||bacVois(l,k).some(([x,y])=>B.G[x][y]&&B.G[x][y].c===g.maitre);
  return bacGolem(g)&&bacGolem(h);
}
function bacBouge(B,a,b,l,k){
  if(!bacPeut(B,a,b,l,k))return false;
  const g=B.G[a][b];B.G[a][b]=B.G[l][k];B.G[l][k]=g;return true;
}
/* Choix des des d'une carte posee (barre d'outils et fenetre de detail) : 1 a 6 par de, Relancer au hasard. */
function bacDes(v,id,apres){
  const z=el('div','bac-des');
  v.de.forEach((x,i)=>{const r=el('div','bs');r.append(el('span','',v.de.length>1?'Dé '+(i+1)+' :':'Dé :'));
    for(let n=1;n<=6;n++){const q=el('button','pastille',String(n));q.type='button';q.setAttribute('aria-pressed',String(x===n));q.setAttribute('aria-label',(v.de.length>1?'Dé '+(i+1):'Dé')+' : '+n);
      q.onclick=()=>{v.de[i]=n;v.f=bacDeF(v.de);apres()};r.append(q)}
    z.append(r)});
  const r=el('div','bs'),q=el('button','pastille','Relancer');q.type='button';
  q.onclick=()=>{v.de=v.de.map(()=>1+Math.floor(Math.random()*6));v.f=bacDeF(v.de);apres()};
  r.append(q,el('span','',(effetDe(id,'forceAuDe',r=>r.des>1)?'Force des dés : ':'Force du dé : ')+v.f+(v.de.length>1&&v.de[0]===v.de[1]?' (double)':'')));z.append(r);
  return z;
}
/* Terrain du bac en grand : ton camp seulement, lignes condensees (cout, Force, elements, nom + titre coupe par « … », titre complet au survol). */
function zoomTerrainBac(s,k){
  const T=s.terrains[k],cc=M.colonnes(s)[k];cacheApercu();dernier=document.activeElement;
  const a=el('section','zt-camp toi bt-camp'),h=el('h3','',compteCo()?pseudo:'Ton camp'),ol=el('ol','zt-l');h.style.color='var(--bleu)';a.append(h);
  for(let l=0;l<3;l++){const g=s.j[0].grille[l][k],li=el('li');
    if(!g){li.className='zt-vide';li.append(el('span','','Case vide'))}
    else{const v=M.valeurDecompte(s,0,l,k),f=el('span','zt-v'),fb=el('b','',String(v));fb.style.color='var(--bleu)';f.append(ico('force'),fb);f.setAttribute('role','img');f.setAttribute('aria-label','Force '+v);
      const q=ligneZt(g.c);q.title=(q.getAttribute('aria-label')||'').replace(/^Agrandir /,'');li.append(q,f)}
    ol.append(li)}
  const tt=el('div','zt-tot'),b=el('b','',String(cc[0]));b.style.color='var(--bleu)';tt.append('Total ',ico('force'),b);tt.setAttribute('aria-label','Force totale '+cc[0]);a.append(ol,tt);
  zoom(srcTerrain(T),T.nom+'. '+T.texte,[a]);$('vueGrand').classList.add('zt-bac');
}
/* 0.6 : fenetres au modele sc-fenetre (titre 800 18 px a gauche, bandeau d'alerte sous le titre, [action] a gauche, [Annuler/Fermer] a droite). */
function fenTitre(f,v,t,id){const h=el('h3','sc-fen-titre',t);h.id=id;v.setAttribute('aria-labelledby',id);f.append(h);return h}
function fenErr(f,t){f.querySelector(':scope>.dk-fen-err')?.remove();if(!t)return;const a=alerteDk(t,0,'dk-fen-err');f.querySelector('.sc-fen-titre').after(a)}
function infoDk(t){msgInfoDk=t;peintDecks()}
function partageDeck(z,d){
  const {v,f,ferme}=fenDk('popPartage');f.classList.add('dk-fen-l');fenTitre(f,v,'Partager « '+d.nom+' »','ppTitre');
  const aut=compteCo()?pseudo:'',lien=lienDeck(d,aut),md=texteDiscord(d,lien);
  const ap=el('div','pp-dc'),a=el('a','','Voir le deck'),E=elsOrdre(d).map(nomEl).join(', ');a.href=lien;a.target='_blank';a.rel='noopener';
  ap.append(el('b','',d.nom),' - '+totalDeck(d)+' cartes'+(E?' - '+E:'')+' - ',a);
  const msg=el('p','dk-fen-p','Colle le message dans Discord : « Voir le deck » ouvre le deck sur le site.'),ac=el('div','sc-fen-actions');
  const cp=btnDk('Copier pour Discord'),cl=btnDk('Copier le lien seul','sc-secondaire'),fe=btnDk('Fermer','sc-secondaire sc-pousse',ferme);
  cp.onclick=()=>copie(md,cp,'Copier pour Discord',null,()=>{alerteInfo(msg,'Deck : message copié. Colle-le dans Discord.')});
  cl.onclick=()=>copie(lien,cl,'Copier le lien seul',null,()=>{alerteInfo(msg,'Deck : lien copié. Colle-le à un ami.')});
  ac.append(cp,cl,fe);f.append(el('p','dk-fen-lib','Aperçu dans Discord'),ap,el('p','pp-lien',lien),msg,ac);cp.focus();
}
function deckConseille(){
  const {v,f,ferme}=fenDk('popConseil');f.classList.add('dk-fen-c');fenTitre(f,v,'Partir d\'un deck conseillé','dcTitre');
  const g=el('div','dc-liste');
  DECKS_CONSEILLES.forEach(o=>{
    const E=elsDominants(o.cartes),b=el('button','dc-deck');b.type='button';b.style.background=fondDeck(E);
    const h=el('span','dc-haut'),pi=el('span','dc-pict');E.forEach(e=>pi.append(picto(e)));
    h.append(el('b','dc-nom',o.nom),pi);
    b.append(h,el('span','dc-els',E.map(nomEl).join(' et ')+' - '+Object.values(o.cartes).reduce((a,n)=>a+n,0)+' cartes'),el('span','dc-tx',o.txt));
    b.onclick=()=>{
      const L=lesDecks();if(L.length>=MAX_DECKS){fenErr(f,'Ajout impossible : '+MAX_DECKS+' decks, '+MAX_DECKS+' au plus. Supprime un deck d’abord.');return}
      const pris=new Set(L.map(d=>d.nom));let nom=o.nom,k=2;while(pris.has(nom)){const s=' ('+k+++')';nom=o.nom.slice(0,24-s.length).trim()+s}
      const d={id:nouveauSid(),nom,cartes:{...o.cartes},v:M.VERSION};gardeDecks(L.concat(d));deckVu=d.id;ferme();vueDk='decks';
      infoDk('Deck « '+nom+' » ajouté à tes decks ('+totalDeck(d)+' cartes). Tu peux le modifier comme les autres.')};
    g.append(b)});
  const ac=el('div','sc-fen-actions');ac.append(btnDk('Annuler','sc-secondaire sc-pousse',ferme));
  f.append(el('p','dk-fen-p','Choisis un deck de départ : il est copié dans tes decks et tu pourras le modifier.'),g,ac);g.querySelector('button').focus();
}
function importeDeck(b,l){
  const {v,f,ferme}=fenDk('popImportDeck');fenTitre(f,v,'Importer un deck','idTitre');
  const t=el('textarea','dk-code');t.rows=3;t.placeholder='Lien https://les-golems.github.io/?deck=… ou code GOL…';t.setAttribute('aria-label','Code du deck');
  const ac=el('div','sc-fen-actions'),ok=btnDk('Importer'),an=btnDk('Annuler','sc-secondaire sc-pousse',ferme);
  if(lesDecks().length>=MAX_DECKS){ok.disabled=true;setTimeout(()=>fenErr(f,'Import impossible : '+MAX_DECKS+' decks, '+MAX_DECKS+' au plus. Supprime un deck d’abord.'))}
  t.oninput=()=>{fenErr(f,'');ok.disabled=lesDecks().length>=MAX_DECKS};
  ok.onclick=()=>{
    const L=lesDecks();if(L.length>=MAX_DECKS){fenErr(f,'Import impossible : '+MAX_DECKS+' decks, '+MAX_DECKS+' au plus. Supprime un deck d’abord.');return}
    const o=litCodeDeck(t.value);if(o.err){fenErr(f,o.err);ok.disabled=true;return}
    if(!Object.keys(o.cartes).length){fenErr(f,'Import impossible : aucune carte connue dans ce code. Recharge la page ou demande un autre lien.');ok.disabled=true;return}
    {const E=M.elementsDeck(o.cartes);if(E.length>M.ELEM_MAX){fenErr(f,'Deck invalide : '+E.length+' éléments, '+M.ELEM_MAX+' au plus. Retire les cartes d’un élément.');return}}
    {const e=M.erreurEvolutions?M.erreurEvolutions(o.cartes):'';if(e){fenErr(f,'Deck invalide : '+e+'. Ajoute sa carte de base.');return}}
    const pris=new Set(L.map(d=>d.nom));let nom=o.nom,k=2;while(pris.has(nom)){const s=' ('+k+++')';nom=o.nom.slice(0,24-s.length).trim()+s}
    const d={id:nouveauSid(),nom,cartes:o.cartes,v:M.VERSION};gardeDecks(L.concat(d));deckVu=d.id;ferme();vueDk='decks';
    const n=[];if(o.inc)n.push('Deck : '+o.inc+' carte'+(o.inc>1?'s inconnues ignorées':' inconnue ignorée')+'. Recharge la page pour les retrouver.');if(o.cou)n.push('Deck : quantités ramenées à '+MAX_EX+' exemplaires et '+DECK_MAX+' cartes au plus. Vérifie le deck.');
    infoDk('Deck « '+nom+' » importé ('+totalDeck(d)+' cartes)'+(n.length?'. '+n.join(', '):'')+'.');
  };
  ac.append(ok,an);f.append(el('p','dk-fen-p','Colle le lien ou le code reçu (bouton Partager d’un autre joueur).'),t,ac);t.focus();
}
function ouvreDeckLien(c){
  const o=litCodeDeck(c),{v,f,ferme}=fenDk('popVueDeck');
  if(o.err||!Object.keys(o.cartes).length){fenTitre(f,v,'Lien de deck illisible','vdTitre');fenErr(f,o.err||'Import impossible : aucune carte connue dans ce code. Recharge la page ou demande un autre lien.');
    const ac=el('div','sc-fen-actions'),fe=btnDk('Fermer','sc-secondaire sc-pousse',ferme);ac.append(fe);f.append(ac);fe.focus();return}
  f.classList.add('dk-fen-lien');const d={id:'',nom:o.nom,cartes:o.cartes},E=elsOrdre(d),R=raisonsDeck(d),n=totalDeck(d);
  /* Bandeau aux couleurs du deck (titre de la fenetre), sans croix : seul Fermer ferme */
  const bd=el('div','vd-bd'),h=el('h3','sc-fen-titre',d.nom),pi=el('span','pi');h.id='vdTitre';v.setAttribute('aria-labelledby','vdTitre');bd.style.background=fondDeck(E);E.forEach(e=>pi.append(picto(e)));
  bd.append(h,pi,el('span','ct'+(n<DECK_MIN||n>DECK_MAX?' ko':''),n+'/'+DECK_MAX));f.append(bd);
  if(o.auteur)f.append(el('p','dk-fen-lib','Partagé par '+o.auteur));
  R.forEach(r=>f.append(alerteDk(['Deck invalide : ',...texteRiche(r.pt,r.t.replace(/^(Deck incomplet|Trop de cartes|Deck invalide) : /,''))],0,'dk-fen-err')));
  if(o.inc)f.append(alerteDk('Deck : '+o.inc+' carte'+(o.inc>1?'s inconnues ignorées':' inconnue ignorée')+'. Recharge la page pour les retrouver.',1));
  const co=el('div','dk-liste deplie vd-co');decklist(co,d,[]);f.append(co);
  const ac=el('div','sc-fen-actions'),imp=btnDk('Importer dans mes decks'),jo=btnDk('Jouer avec ce deck'),fe=btnDk('Fermer','sc-secondaire sc-pousse',ferme),msg=el('p','dk-fen-p vd-m');
  imp.dataset.attend=jo.dataset.attend='1';msg.dataset.etat='1';if(R.length){jo.dataset.injouable='1';jo.title='Deck invalide'}
  {const deja=lesDecks().find(y=>memeDeck(y,d));if(deja){imp.textContent='Déjà dans tes decks';imp.dataset.injouable='1';imp.title='Le même contenu est déjà dans tes decks (« '+deja.nom+' »), quel que soit le nom'}}
  const ajoute=()=>{
    const L=lesDecks(),deja=L.find(y=>memeDeck(y,d));if(deja)return {id:deja.id,nom:deja.nom,deja:true};
    if(L.length>=MAX_DECKS)return {err:'Import impossible : '+MAX_DECKS+' decks, '+MAX_DECKS+' au plus. Supprime un deck d’abord.'};
    const pris=new Set(L.map(y=>y.nom));let nom=d.nom,k=2;while(pris.has(nom)){const s=' ('+k+++')';nom=d.nom.slice(0,24-s.length).trim()+s}
    const x={id:nouveauSid(),nom,cartes:{...d.cartes},v:M.VERSION};gardeDecks(L.concat(x));return {id:x.id,nom,deja:false}};
  const refus=()=>{const E=M.elementsDeck(d.cartes);if(E.length>M.ELEM_MAX)return 'Deck invalide : '+E.length+' éléments, '+M.ELEM_MAX+' au plus. Retire les cartes d’un élément.';const e=M.erreurEvolutions?M.erreurEvolutions(d.cartes):'';return e?'Deck invalide : '+e+'. Ajoute sa carte de base.':''};
  imp.onclick=()=>{const rf=refus();if(rf)return fenErr(f,rf);const r=ajoute();if(r.err)return fenErr(f,r.err);
    ferme();deckVu=r.id;vueDk='decks';onglet('decks');infoDk(r.deja?'Déjà dans tes decks : « '+r.nom+' ».':'Deck « '+r.nom+' » importé ('+n+' cartes).')};
  jo.onclick=()=>{const rf=refus();if(rf)return fenErr(f,rf);const r=ajoute();if(r.err)return fenErr(f,r.err);ecrire('golems.deckChoisi',r.id);majChoixDeck();ferme();onglet('jouer');
    $('infoDeckJeu')?.remove();const q=el('div','vd-info');alerteInfo(q,'Deck : « '+r.nom+' » choisi. Lance une partie contre un Golem ou crée un salon.');q.id='infoDeckJeu';$('erreurJeu').before(q)};
  ac.append(imp,jo,fe);f.append(ac,msg);majVueDeck();fe.focus();
}
/* ===== Tester des placements (maquette 25, refonte validee) : plateau de la vue joueur, « Tout le deck | Main de depart », mentions de tuile,
   « Changer » sur les terrains (fenetre « Choisir un terrain »), clic sur un terrain = zoom de ton camp. ===== */
const COEUR_BAC='<svg viewBox="0 0 24 24" width="12" height="12" aria-hidden="true"><path fill="currentColor" d="M12 21s-7.5-4.6-10-9.3C.4 8.4 2.4 4.5 6.2 4.5c2.2 0 3.7 1.3 4.6 2.6.9-1.3 2.4-2.6 4.6-2.6 3.8 0 5.8 3.9 4.2 7.2C19.5 16.4 12 21 12 21z"/></svg>';
/* Mentions de tuile (charte, variante A) : les etiquettes natives de grilleVue deviennent des pastilles alignees en bas a gauche */
function mentionsTuile(g){
  g.querySelectorAll('.p-case').forEach(q=>{if(!q.querySelector('.mini'))return;const ms=el('span','tp-ms');
    const fv=q.querySelector('.fav');if(fv){fv.remove();const m=el('span','tp-mt m-fav');m.innerHTML=COEUR_BAC;m.append('Favori');ms.append(m)}
    const cp=q.querySelector('.mini>.cp,.cp');if(cp){cp.remove();ms.append(el('span','tp-mt m-cp',cp.textContent))}
    q.querySelectorAll('.ani').forEach(x=>x.remove());
    const a=q.querySelector(':scope>.act');if(a){const hi=a.querySelector('.p-hint');if(hi)hi.remove();a.querySelector('.act-c')?.remove();const t=a.textContent.trim();a.remove();ms.append(el('span','tp-mt m-act',t));if(hi)ms.append(el('span','tp-mt m-hint',hi.textContent))}
    if(ms.childElementCount){q.append(ms);q.classList.add('a-ms')}})}
const pzBac=(n,v)=>{const s=el('span','tp-pz');s.append(ico(n),String(v));s.title=n==='force'?'Force':'Coût';return s};
function pzCarteBac(C,fo){const z=el('div','tp-dh');z.append(el('b','',C.nom),pzBac('enclume',C.cout));if(!C.animal)z.append(pzBac('force',fo==null?C.force||0:fo));if(C.el&&C.el.length){const s=el('span','tp-pz');C.el.forEach(e=>s.append(picto(e)));z.append(s)}return z}
function choisirTerrain(B,k,peint){
  const {v,f,ferme}=fenDk('popTerrain');v.classList.add('dk-voile2');f.classList.add('dk-choix');fenTitre(f,v,'Choisir un terrain','ctTitre');
  const ul=el('div','ct-liste'),sansArt=n=>n.replace(/^(Les |Le |La |L['’])/,''),TOURNOI=T=>/Tournoi/.test(T.nom);
  const teinte=(src,b)=>{const im=new Image();im.onload=()=>{try{const cv=document.createElement('canvas');cv.width=2;cv.height=1;const x=cv.getContext('2d');x.drawImage(im,0,0,2,1);const d=x.getImageData(0,0,2,1).data,col=j=>'color-mix(in srgb,rgb('+d[j]+','+d[j+1]+','+d[j+2]+') 70%,#0a121a)';b.style.background='linear-gradient(90deg,'+col(0)+','+col(4)+')'}catch(e){}};im.src=src};
  M.TERRAINS.map((T,i)=>[T,i]).sort(([a],[b])=>(TOURNOI(a)-TOURNOI(b))||(a.pts-b.pts)||sansArt(a.nom).localeCompare(sansArt(b.nom),'fr')).forEach(([T,i])=>{
    const b=el('button','ct-l'),p=el('span','ct-p');b.type='button';p.append(ico('coupe'),TOURNOI(T)?'1 à 3 pts':T.pts+(T.pts>1?' pts':' pt'));b.append(el('span','ct-n',T.nom),p);
    b.setAttribute('aria-label',T.nom+', '+T.pts+(T.pts>1?' points':' point'));teinte(srcTerrain(T),b);
    const j=B.T.indexOf(i);if(j===k){b.classList.add('actuel');b.setAttribute('aria-current','true')}else if(j>=0){b.disabled=true;b.title=T.nom+' : déjà posé'}
    b.onclick=()=>{B.T[k]=i;ferme();peint()};ul.append(b)});
  const ac=el('div','sc-fen-actions'),fe=btnDk('Fermer','sc-secondaire sc-pousse',ferme);ac.append(fe);f.append(ul,ac);setTimeout(()=>fe.focus(),30);
}
function tireMain(B,d){const p=[];Object.keys(d.cartes).forEach(k=>{for(let i=0;i<+d.cartes[k];i++)p.push(k)});for(let i=p.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[p[i],p[j]]=[p[j],p[i]]}
  B.main=p.slice(0,5);B.en=0;B.G=bacVide();B.sel=null;B.selC=null;B.mode=null}
const BAC_ENERGIE=2; /* energie du 1er tour */
function bacFen(f,d,ferme){
  const B=bacDe(d),peint=()=>{const y=f.scrollTop;bacFen(f,d,ferme);f.scrollTop=y};f.textContent='';
  M.TYPES.forEach(t=>{let n=bacUtilises(B,t)-(+d.cartes[t]||0);for(let l=2;l>=0&&n>0;l--)for(let k=2;k>=0&&n>0;k--){const g=B.G[l][k];if(g&&M.carte(g.c).id===t){bacRetire(B,l,k);n--}}});
  if(B.sel&&!(+d.cartes[B.sel]>0))B.sel=null;if(B.selC&&!B.G[B.selC[0]][B.selC[1]]){B.selC=null;B.mode=null}
  const MAIN=!!B.main,reste=MAIN?BAC_ENERGIE-B.en:0;
  const s=bacEtat(B),G=B.G,cols=[0,1,2],cc=M.colonnes(s),[sa,sb]=B.selC||[];
  /* En-tete : titre, aide, selecteur de mode 34 px */
  const hd=el('div','tp-h'),ti=el('h3','sc-fen-titre','Tester des placements');ti.id='tpTitre';
  const md=el('div','sc-sel sc-petit tp-mode');md.setAttribute('role','group');md.setAttribute('aria-label','Mode');
  [['Tout le deck',false],['Main de départ',true]].forEach(([x,m])=>{const b=el('button','',x);b.type='button';b.setAttribute('aria-pressed',String(MAIN===m));b.onclick=()=>{if(MAIN===m)return;if(m)tireMain(B,d);else{B.main=null;B.G=bacVide();B.sel=B.selC=null}peint()};md.append(b)});
  hd.append(ti,el('span','tp-aide',d.nom+' - ton côté seulement'),md);f.append(hd);
  const co=el('div','tp-co'),dif=el('div','jr tp-bac'),plat=el('div','d-plat'),tr=el('div','p-terrains d-tr');
  cols.forEach(k=>{const T=s.terrains[k],dv=el('div','p-terrain m-moi'),te=el('div','p-tete'),to=el('div','p-totaux'),va=el('span','p-valeur d-ptse');
    te.append(el('b','',T.nom));to.append(el('b','m tete',String(cc[k][0])));va.append(ico('coupe'),T.pts+(T.pts>1?' pts':' pt'));
    const ch=btnDk('Changer','sc-tertiaire tp-chg',e=>{e.stopPropagation();choisirTerrain(B,k,peint)});
    dv.append(te,to,va,ch);dv.tabIndex=0;dv.setAttribute('role','button');dv.setAttribute('aria-label','Voir '+T.nom+' en grand');dv.title='Voir '+T.nom+' en grand, avec tes Golems';
    dv.onclick=e=>{if(e.target===ch)return;zoomTerrainBac(s,k)};dv.onkeydown=e=>{if(e.target===dv&&(e.key==='Enter'||e.key===' ')){e.preventDefault();zoomTerrainBac(s,k)}};tr.append(dv)});
  let cible=null;
  const agrandir=(l,k)=>{const v=G[l][k],C=M.carte(v.c);cacheApercu();dernier=document.activeElement;zoom(imgV('cartes/'+M.idEff(v)+'.jpg'),M.nomDetail(C),C.animal?detailAnimal(C):detailForce(s,0,l,k))};
  if(B.sel){const c=bacLibre(B,d,B.sel);if(c!==null)cible=(l,k)=>{if(!M.peutPoser(s,0,c,l,k))return null;const cout=M.coutPose(s,0,c,l,k);if(MAIN&&cout>reste)return null;
    return {texte:(G[l][k]?(M.carte(c).base?'Améliorer ':'Remplacer '):'Poser ')+cout,fait:()=>{const t=B.sel;if(bacPlace(B,d,t,l,k)&&MAIN){B.en+=cout;const i=B.main.indexOf(t);if(i>=0)B.main.splice(i,1);B.sel=null}peint()}}}}
  else if(B.selC&&B.mode==='fav')cible=(l,k)=>l===sa&&k===sb?{choisie:true,fait:()=>{}}:bacGolem(G[l][k])?{texte:'Choisir',fait:()=>{G[sa][sb].fav=G[l][k].c;B.mode=null;peint()}}:null;
  else if(B.selC&&B.mode==='copie')cible=(l,k)=>l===sa&&k===sb?{choisie:true,fait:()=>{}}:bacVois(sa,sb).some(([a,b])=>a===l&&b===k)&&bacGolem(G[l][k])?{texte:'Copier',fait:()=>{const g=G[sa][sb];g.cp=M.idEff(G[l][k]);delete g.de;g.f=M.carte(g.c).force||0;B.mode=null;bacPose(B,sa,sb);peint()}}:null;
  else if(B.selC&&B.mode==='bouge')cible=(l,k)=>l===sa&&k===sb?{choisie:true,fait:()=>{B.mode=null;peint()}}:bacPeut(B,sa,sb,l,k)?{texte:G[l][k]?'Échanger':'Ici',fait:()=>{bacBouge(B,sa,sb,l,k);B.selC=[l,k];B.mode=null;peint()}}:null;
  else if(B.selC)cible=(l,k)=>l===sa&&k===sb?{choisie:true,fait:()=>agrandir(l,k)}:null;
  const g=grilleVue(s,0,cols,[0,1,2],cible);g.classList.add('mienne');
  g.querySelectorAll('.p-case').forEach(q=>{const l=+q.dataset.l,k=+q.dataset.k,v=G[l][k];
    if(v&&v.de&&BAC_DES[M.idEff(v)])q.querySelector('.mini').append(el('span','cp',(v.de.length>1?'Dés : '+v.de.join(' et '):'Dé : '+v.de[0])));
    if(v&&!q.classList.contains('cible')&&!q.classList.contains('choisie'))q.onclick=()=>{B.sel=null;B.selC=[l,k];B.mode=null;peint()};
    if(v){q.draggable=true;q.ondragstart=e=>{e.dataTransfer.setData('text/plain','c:'+l+','+k);e.dataTransfer.effectAllowed='move'}}
    q.ondragover=e=>{e.preventDefault();q.classList.add('survol')};q.ondragleave=()=>q.classList.remove('survol');
    q.ondrop=e=>{e.preventDefault();q.classList.remove('survol');const x=e.dataTransfer.getData('text/plain');
      if(x.startsWith('t:')&&!MAIN){if(bacPlace(B,d,x.slice(2),l,k)&&!B.mode)B.sel=null}
      else if(x.startsWith('c:')){const[a,b2]=x.slice(2).split(',').map(Number);if(bacBouge(B,a,b2,l,k)){B.selC=null;B.mode=null}}peint()}});
  mentionsTuile(g);
  if(MAIN&&B.sel&&!g.querySelector('.cible'))g.querySelectorAll('.p-case').forEach(q=>{if(!q.querySelector('.mini')&&!q.childElementCount){q.classList.add('tp-ko');q.textContent='Énergie insuffisante'}});
  const r2=el('div','d-rg');r2.append(el('div','d-vt toi',compteCo()?pseudo:'Toi'),g);plat.append(tr,r2);dif.append(plat);
  const dr=el('div','tp-dr');co.append(dif,dr);f.append(co);
  /* Cartes du deck (ou main) */
  const ids=MAIN?B.main.slice():M.TYPES.filter(t=>+d.cartes[t]>0).sort((a,b)=>M.CARTES[a].cout-M.CARTES[b].cout||M.TYPES.indexOf(a)-M.TYPES.indexOf(b));
  const lz=el('div','tp-main'+(MAIN?'':' tp-2r'));lz.append(el('div','tp-lib',MAIN?'Ta main - '+B.main.length+' carte'+(B.main.length>1?'s':'')+' (5 tirées)':'Cartes du deck - touche une carte, puis une case'));
  const rr=el('div','tp-mc');
  (MAIN?ids.map((t,i)=>[t,i]):ids.map(t=>[t,-1])).forEach(([t,i])=>{const C=M.CARTES[t],n=MAIN?1:+d.cartes[t]-bacUtilises(B,t),m=el('button','tp-m'+(B.sel===t&&(!MAIN||i===ids.indexOf(t))?' sel':''));m.type='button';
    const im=el('img');im.src=imgV('cartes/'+t+'.jpg');im.alt='';m.append(im);if(!MAIN)m.append(el('span','tp-x'+(n?'':' zero'),'x'+n));
    m.setAttribute('aria-label',M.nomDetail(C)+(MAIN?'':', '+n+' à poser'));m.title=M.nomDetail(C);m.disabled=n<=0;m.setAttribute('aria-pressed',String(B.sel===t));
    m.onclick=()=>{B.sel=B.sel===t?null:t;B.selC=null;B.mode=null;peint()};
    if(!MAIN){m.draggable=n>0;m.ondragstart=e=>{e.dataTransfer.setData('text/plain','t:'+t);e.dataTransfer.effectAllowed='move'}}
    rr.append(m)});
  lz.append(rr);dr.append(lz);
  /* Detail */
  const dt=el('div','tp-det');dt.setAttribute('aria-live','polite');
  if(B.selC){const v=G[sa][sb],C=M.carte(v.c),id=M.idEff(v);dt.append(pzCarteBac(C,C.animal?null:M.forceDe(s,0,sa,sb)));
    const msg={bouge:'Touche une case libre (Ici) ou un autre Golem (Échanger).',fav:'Choisis son favori : touche un de tes Golems.',copie:'Déguisement : touche le voisin à copier.'}[B.mode];if(msg)dt.append(el('p','tp-msg',msg));
    const notes=[BAC_NOTE[C.id]];if(C.id!==id&&id&&BAC_NOTE[id])notes.push('Copie : '+BAC_NOTE[id]);const nt=notes.filter(Boolean).join(' ');if(nt)dt.append(el('p','',nt));
    if(BAC_DES[id])dt.append(bacDes(v,id,peint));
    const bs=el('div','tp-acts'),bt=(x,fn,p)=>{const q=btnDk(x,'sc-tertiaire',fn);if(p!==undefined)q.setAttribute('aria-pressed',String(p));bs.append(q)};
    bt('Agrandir',()=>agrandir(sa,sb));bt('Déplacer',()=>{B.mode=B.mode==='bouge'?null:'bouge';peint()},B.mode==='bouge');
    bt('Retirer',()=>{bacRetire(B,sa,sb);B.selC=null;B.mode=null;peint()});
    if(M.FAV_BONUS[id])bt('Changer le favori',()=>{B.mode='fav';peint()},B.mode==='fav');
    if(effetDe(C.id,'copie',r=>r.cible==='voisin')&&bacVois(sa,sb).filter(([a,b])=>bacGolem(G[a][b])).length>1)bt('Changer la copie',()=>{delete v.cp;delete v.fav;B.mode='copie';peint()},B.mode==='copie');
    bt('Désélectionner',()=>{B.selC=null;B.mode=null;peint()});dt.append(bs,el('p','tp-aide','Calcul complet de la Force : Agrandir, ou second clic sur la carte.'))}
  else if(B.sel){const C=M.CARTES[B.sel];dt.append(el('div','tp-lib','Détail'),pzCarteBac(C),el('p','',C.base?'Évolution de '+M.CARTES[C.base].nom+' : touche une case en surbrillance pour l’améliorer.':'Touche une case en surbrillance pour la poser.'))}
  else if(MAIN){const cm=B.main.length?B.main.reduce((a,x)=>a+M.CARTES[x].cout,0)/B.main.length:0,po=B.main.filter(x=>M.CARTES[x].cout<=reste).length,l1=el('div','tp-dh'),els=el('span','tp-pz');
    [...new Set(B.main.flatMap(x=>M.CARTES[x].el||[]))].forEach(e=>els.append(picto(e)));l1.append(el('span','tp-lib','Coût moyen'),pzBac('enclume',cm.toFixed(1).replace('.',',')),el('span','tp-lib','Éléments'),els);
    dt.append(el('div','tp-lib','Bilan de la main'),l1,el('p','',po+' carte'+(po>1?'s':'')+' encore posable'+(po>1?'s':'')+' avec l’énergie restante'),el('p','tp-aide','Pose tes cartes dans la limite de l’énergie, puis tire une nouvelle main pour comparer.'))}
  else dt.append(el('div','tp-lib','Détail'),el('p','','Touche une carte de ton deck, puis une case en surbrillance (ou glisse-la).'),el('p','tp-aide','Toucher une carte posée : calcul de sa Force, Déplacer, Retirer, dés, favori, copie. Toucher un terrain : ton camp en grand.'));
  dr.append(dt);
  const so=el('div','tp-sum'),pz=(lib,n,ic)=>{const sp=el('span');sp.setAttribute('aria-label',lib+' '+n);sp.append(lib+' ');const b=el('b','tp-pzt');b.append(ico(ic),String(n));sp.append(b);return sp};
  if(MAIN)so.append(pz('Énergie du 1er tour',BAC_ENERGIE,'enclume'),pz('Restante',reste,'enclume'));else so.append(pz('Total',cc.reduce((a,c)=>a+c[0],0),'force'));dr.append(so);
  const ac=el('div','sc-fen-actions tp-pied');
  if(MAIN)ac.append(btnDk('Nouvelle main','',()=>{tireMain(B,d);peint()}));
  ac.append(btnDk('Terrains au hasard','sc-secondaire',()=>{B.T=bacTirage();peint()}));
  if(!MAIN)ac.append(btnDk('Tout effacer','sc-secondaire',()=>{B.G=bacVide();B.selC=null;B.mode=null;peint()}));
  ac.append(btnDk('Fermer','sc-secondaire sc-pousse',()=>{B.ouvert=false;ferme()}));f.append(ac);
  const m=el('details','bac-mention'),sm=el('summary','','Ce que le test compte : ton côté seulement, ni cercle des éléments, ni effet adverse, ni fin de manche.');m.append(sm,el('p','',
    'Compté : Force, Trait, favori, copie, dés, Full synergie, Double up ?. Pas compté : cercle des éléments, effets sur l’adversaire, dégâts, Comeback et Winstreak, fin de manche, pioche et Forge. Les terrains donnent les points ; La Boutique baisse le coût.'));f.append(m);
}
function ouvreTest(d,l){const {v,f,ferme}=fenDk('popTest');f.classList.add('dk-test');v.setAttribute('aria-labelledby','tpTitre');
  const B=bacDe(d);B.ouvert=true;bacFen(f,d,ferme);f.querySelector('.tp-mode button')?.focus()}
