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
  if(inc.length){const q=inc.reduce((t,k)=>t+o[k],0);R.push({c:q>1?q+' cartes retirées':'1 carte retirée',t:(q>1?q+' cartes retirées du jeu':'1 carte retirée du jeu')+' (code '+inc.join(', ')+').',ids:[],inc})}
  ok.forEach(k=>{const mx=maxEx(k);if(!Number.isInteger(o[k])||o[k]>mx)R.push({c:nom(k)+' ×'+o[k],t:nom(k)+' : '+(mx===1?'1 exemplaire au plus (animal de compagnie)':mx+' exemplaires au plus')+', '+o[k]+' dans le deck.',ids:[k]})});
  /* 0.5 : un animal demande au moins un exemplaire de la base de son maitre (M.animauxSansBase ; le moteur garde l'ancienne regle pour les rejeux). Carte fautive = l'animal, nom en vert. */
  ok.filter(k=>M.estAnimal(k)).forEach(k=>{const m=M.maitreDe(k);if(+o[m]>0)return;const cb=CARTES.find(x=>x[0]===m),nb=cb?cb[1]:nom(m);
    R.push({c:nom(k)+' sans '+nb,t:nom(k)+' : ajoute au moins un '+nb+'.',pc:[{ani:nom(k)},' sans '+nb],pt:[{ani:nom(k)},' : ajoute au moins un '+nb+'.'],ids:[k]})});
  if(n<DECK_MIN)R.push({c:n+' cartes sur '+DECK_MIN,t:'Deck incomplet : '+n+' carte'+(n>1?'s':'')+' sur '+DECK_MIN+' minimum, il en manque '+(DECK_MIN-n)+'.',ids:[]});
  if(n>DECK_MAX)R.push({c:n+' cartes sur '+DECK_MAX,t:'Trop de cartes : '+n+' pour '+DECK_MAX+' au plus, '+(n-DECK_MAX)+' en trop.',ids:[]});
  /* 0.5 : une evolution demande au moins un exemplaire de sa base (M.evolutionsSansBase ; le moteur ne le verifie pas, pour les rejeux). Carte fautive = l'evolution. */
  if(M.evolutionsSansBase)M.evolutionsSansBase(o).forEach(k=>{const b=M.CARTES[k].base,cb=CARTES.find(x=>x[0]===b),nb=cb?cb[1]:nom(b);R.push({c:nom(k)+' sans '+nb,t:nom(k)+' : ajoute au moins un '+nb+'.',pc:[{or:nom(k)},' sans '+nb],pt:[{or:nom(k)},' : ajoute au moins un '+nb+'.'],ids:[k]})});
  /* 0.4a : 4 elements differents au plus (M.erreurElements ; le moteur ne le verifie pas, pour les rejeux). */
  {const E=M.elementsDeck?M.elementsDeck(o):[];if(E.length>M.ELEM_MAX)R.push({c:E.length+' éléments sur '+M.ELEM_MAX,t:'Trop d’éléments : '+E.length+' éléments différents ('+E.map(nomEl).join(', ')+') pour '+M.ELEM_MAX+' au plus.',pt:['Trop d’éléments : '+E.length+' éléments différents (',...E.flatMap((e,i)=>[...(i?[', ']:[]),{el:e}]),') pour '+M.ELEM_MAX+' au plus.'],ids:[]})}
  /* Le moteur fait foi : s'il refuse le deck pour une raison non prevue ici, son message est repris. */
  if(!R.length){let e='';try{e=M.erreurDeck(o)||''}catch(x){e='deck illisible'}if(e)R.push({c:e,t:'Deck invalide : '+e+'.',ids:[]})}
  return R;
}
/* 0.5 : texte riche d'une raison (pt, pc) : nom d'evolution en dore, picto + nom d'element a la taille du texte ; sinon le texte simple. */
function texteRiche(P,txt){if(!P)return [txt];return P.map(x=>{if(typeof x==='string')return x;if(x.or)return el('span','r-evo',x.or);if(x.ani)return el('span','r-ani',x.ani);const z=el('span','r-el'),i=picto(x.el);i.alt='';z.append(i,nomEl(x.el));return z})}
/* Encadre des raisons dans l'editeur ; Retirer enleve les cartes retirees du jeu, invisibles dans la grille. */
function blocErreurs(R,d,l){
  const z=el('div','dl-erreurs');z.setAttribute('role','status');
  const ret=r=>{const q=el('button','btn sec','Retirer');q.type='button';q.onclick=e=>{e.stopPropagation();r.inc.forEach(k=>delete d.cartes[k]);gardeDecks(l);peintDecks()};return q};
  if(R.length===1){z.append(el('b','','Deck invalide : '),...texteRiche(R[0].pt,R[0].t));if(R[0].inc)z.append(ret(R[0]));return z}
  const u=el('ul');R.forEach(r=>{const li=el('li');li.append(...texteRiche(r.pt,r.t));if(r.inc)li.append(ret(r));u.append(li)});
  z.append(el('b','','Deck invalide, '+R.length+' raisons :'),u);return z;
}
/* Raison courte sur une tuile de deck : visible sans survol (telephone), texte complet en title pour la souris. */
function raisonTuile(R){const p=el('span','d-raison','Invalide : '+R.map(r=>r.c).join(' - '));p.title=R.map(r=>r.t).join('\n');return p}
const fDeck={ty:'',sel:new Set(),mode:'ou',q:''};
/* Compte connecte : decks dans Firebase (ecriture groupee apres 600 ms). Invite : sur l'appareil. */
const decksLocaux=()=>litListe('golems.decks').filter(d=>d&&typeof d.nom==='string'&&d.cartes);
const lesDecks=()=>compteCo()?room.compte.donnees().decks.map(d=>({...d,cartes:{...d.cartes}})):decksLocaux();
function gardeDecks(l){
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
/* Fenetre de choix du deck avant une partie : ecrit golems.deckChoisi puis continue. */
function choisirDeck(suite,libOk){
  const old=$('popDeck');if(old)old.remove();
  const v=el('div','voile'),b=el('div','boite cd-boite'),g=el('div','cd-grille');
  v.id='popDeck';v.setAttribute('role','dialog');v.setAttribute('aria-modal','true');v.setAttribute('aria-label','Choisis ton deck');
  let sel=deckChoisi().id;
  const tuiles=[];
  const tuile=(id,nom,els,nb,R)=>{
    const raison=R.length>0,t=el('button','cd-tuile'+(raison?' cd-off':''));t.type='button';
    t.append(...enteteDeck(nom,els,nb,raison));
    if(raison){t.setAttribute('aria-disabled','true');const s=raisonTuile(R);t.title=s.title;t.append(s)}
    else t.onclick=()=>{sel=id;tuiles.forEach(x=>x.t.setAttribute('aria-pressed',x.id===sel?'true':'false'))};
    t.ondblclick=()=>{if(!raison){sel=id;go()}};
    t.setAttribute('aria-pressed',!raison&&id===sel?'true':'false');tuiles.push({id,t});g.append(t);
  };
  tuile('','Deck par défaut',M.TYPES?[...new Set(M.TYPES.flatMap(k=>M.CARTES[k].el))]:[],M.TAILLE_DECK,[]);
  lesDecks().forEach(d=>{
    const o={};for(const k in d.cartes)if(+d.cartes[k]>0)o[k]=+d.cartes[k];
    const els=[...new Set(Object.keys(o).filter(k=>M.CARTES[k]).flatMap(k=>M.CARTES[k].el))];
    tuile(d.id,d.nom,els,totalDeck(d),raisonsDeck(d));
  });
  const ferme=()=>{v.remove();document.removeEventListener('keydown',esc)};
  const esc=e=>{if(e.key==='Escape')ferme()};document.addEventListener('keydown',esc);
  const go=()=>{ecrire('golems.deckChoisi',sel);majChoixDeck();ferme();suite()};
  const pb=el('div','p-btns'),ok=el('button','btn plein',libOk||'Jouer'),an=el('button','btn sec','Annuler');ok.type=an.type='button';
  ok.onclick=go;an.onclick=ferme;v.onclick=e=>{if(e.target===v)ferme()};pb.append(ok,an);
  b.append(el('h2','','Choisis ton deck'),g,pb);v.append(b);document.body.append(v);ok.focus();
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
/* Tuile de deck du salon et de la fenetre de choix : bandeau + compteur comme l'onglet Decks, puis pictos. */
function enteteDeck(nom,els,nb,injouable){
  /* Compteur rouge hors de 24 a 30 cartes, deck par defaut compris ; neutre si le deck est injouable pour une autre raison. */
  const h=el('div','cd-haut');h.append(bandeauDeck({nom,els}),compteNb(nb,injouable));
  const p=el('div','d-pict');(els||[]).filter(x=>/^(magma|cristal|foudre|brume|roche)$/.test(x)).forEach(e=>p.append(picto(e)));
  return [h,p];
}
/* Pastille « ? » du deck adverse masque (a la place des pictos d'elements). */
function pastilleInconnue(){const s=el('span','dk-inc','?');s.setAttribute('aria-hidden','true');return s}
function picto(e){const i=el('img');i.src=imgV('cartes/'+e+'.png');i.alt=e;i.width=26;i.height=26;return i}
/* 0.6 (maquette 25, disposition A) : onglet Decks fusionne avec Cartes derriere le selecteur « Decks | Cartes ».
   Decks = trois colonnes (Mes decks - catalogue filtre avec quantites - panneau du deck ouvert) ; Cartes = le meme catalogue, sans quantites.
   Le deck choisi se modifie directement dans le catalogue (plus d'editeur a part) ; « Placements » ouvre « Tester des placements » en fenetre. */
let vueDk='decks',pageDk=0,msgDk=null,msgDkId=null,listeDepliee=false;
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
function selVueDk(){const s=el('div','sc-sel sc-large dk-vue');s.setAttribute('role','group');s.setAttribute('aria-label','Vue');
  [['decks','Decks'],['cartes','Cartes']].forEach(([v,t])=>{const b=el('button','',t);b.type='button';b.setAttribute('aria-pressed',String(vueDk===v));b.onclick=()=>{if(vueDk===v)return;vueDk=v;pageDk=0;if(v==='cartes'&&fDk.ty==='m')fDk.ty='';peintDecks()};s.append(b)});return s}
function peintDecks(){
  const b=$('listeDecks');if(!b)return;b.textContent='';$('popTest')?.remove();
  const l=lesDecks(),co=compteCo(),plein=l.length>=MAX_DECKS;
  if(deckVu&&!l.some(x=>x.id===deckVu))deckVu=null;if(!deckVu&&l.length)deckVu=l[0].id;
  const d=vueDk==='decks'?l.find(x=>x.id===deckVu)||null:null;deckOuvert=d?d.id:null;
  const W=el('div',vueDk==='decks'?'dkA':'dkA dk-cartes');W.id='dkA';b.append(W);
  /* 1. Mes decks */
  const L=el('div','bloc dk-col');
  L.append(selVueDk());
  if(vueDk==='decks'){
    const h=el('h3','dk-titre','Mes decks');h.append(el('span','dk-nb',l.length+' sur '+MAX_DECKS));L.append(h);
    const ls=el('div','dk-dks');ls.setAttribute('role','list');
    l.forEach(x=>{const E=elsOrdre(x),R=raisonsDeck(x),n=totalDeck(x),t=el('div','dk-tuile'+(x.id===deckVu?' sel':'')+(R.length?' inv':''));
      t.style.background=fondDeck(E);t.tabIndex=0;t.setAttribute('role','listitem');t.setAttribute('aria-current',String(x.id===deckVu));
      const g=el('div'),nm=el('b','',x.nom);nm.title=x.nom;const pi=el('span','pi');E.forEach(e=>pi.append(picto(e)));g.append(nm,pi);
      t.append(g,el('span','ct'+(n<DECK_MIN||n>DECK_MAX?' ko':''),n+'/'+DECK_MAX));
      if(R.length){const r=el('span','rs','Invalide : '+R[0].c);r.title=R.map(z=>z.t).join('\n');t.append(r)}
      const ouvre=()=>{deckVu=x.id;msgDk=null;listeDepliee=false;peintDecks()};t.onclick=ouvre;t.onkeydown=e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();ouvre()}};ls.append(t)});
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
    i.onclick=()=>{dernier=i;zoom(i.src,c[1],statZoomCarte(id))};i.onkeydown=e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();i.onclick()}};z.append(i);
    if(qte){const mx=maxEx(id),q=el('div','dk-q'+(n?'':' zero')),m=el('button','','-'),p=el('button','','+');m.type=p.type='button';
      m.setAttribute('aria-label','Retirer '+c[1]);p.setAttribute('aria-label','Ajouter '+c[1]);m.disabled=!n;
      const ch=v=>{d.cartes[id]=n+v;if(!d.cartes[id])delete d.cartes[id];msgDk=msgDkId=null;gardeDecks(l);peintDecks()};m.onclick=()=>ch(-1);
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
function ouvreTest(d,l){const {v,f,ferme}=fenDk('popTest');f.classList.add('dk-test');v.setAttribute('aria-label','Tester des placements');
  const B=bacDe(d);B.ouvert=true;const peint=()=>{f.textContent='';bacASable(f,d);const a=el('div','sc-fen-actions');a.append(btnDk('Fermer','sc-secondaire',()=>{B.ouvert=false;ferme()}));f.append(a)};
  f._peint=peint;peint();f.querySelector('button')?.focus()}
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
  const abime={err:'Code abîmé : vérifie qu’il est complet.'};let u,txt;
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
  const m=/^GOL(\d+)-([A-Za-z0-9_-]+)$/.exec(c);if(!m)return {err:/^GOL\d+-/.test(c)?'Code abîmé : vérifie qu’il est complet.':'Code illisible : il doit commencer par '+CODE_DECK+'.'};
  if(m[1]!=='1')return {err:'Code d’une version plus récente du site (format '+m[1]+').'};
  let txt;try{const b=atob(m[2].replace(/-/g,'+').replace(/_/g,'/'));txt=new TextDecoder('utf-8',{fatal:true}).decode(Uint8Array.from(b,x=>x.charCodeAt(0)))}catch(e){return {err:'Code abîmé : vérifie qu’il est complet.'}}
  const i=txt.indexOf('\n');if(i<0)return {err:'Code abîmé : vérifie qu’il est complet.'};
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
function partageDeck(z,d){
  $('popPartage')?.remove();
  const aut=compteCo()?pseudo:'',lien=lienDeck(d,aut),md=texteDiscord(d,lien);
  const v=el('div','voile'),x=el('div','boite');v.id='popPartage';v.setAttribute('role','dialog');v.setAttribute('aria-modal','true');v.setAttribute('aria-labelledby','ppTitre');
  const ap=el('div','pp-dc'),a=el('a','','Voir le deck'),E=elsOrdre(d).map(nomEl).join(', ');a.href=lien;a.target='_blank';a.rel='noopener';
  ap.append(el('b','',d.nom),' - '+totalDeck(d)+' cartes'+(E?' - '+E:'')+' - ',a);
  const msg=el('p','pp-m','Colle le message dans Discord : « Voir le deck » ouvre le deck sur le site.'),pb=el('div','p-btns'),cp=el('button','btn','Copier pour Discord'),cl=el('button','btn sec','Copier le lien seul'),fe=el('button','btn fermer','Fermer');cp.type=cl.type=fe.type='button';
  const esc=e=>{if(e.key==='Escape')ferme()},ferme=()=>{v.remove();removeEventListener('keydown',esc)};addEventListener('keydown',esc);
  fe.onclick=ferme;v.onclick=e=>{if(e.target===v)ferme()};
  /* Message seulement si la copie a reussi (sinon copie() propose le texte a copier a la main). */
  cp.onclick=()=>copie(md,cp,'Copier pour Discord',null,()=>{msg.textContent='Message copié : colle-le dans Discord.'});
  cl.onclick=()=>copie(lien,cl,'Copier le lien seul',null,()=>{msg.textContent='Lien copié : colle-le à un ami.'});
  const h=el('h2','','Partager « '+d.nom+' »');h.id='ppTitre';
  pb.append(cp,cl,fe);x.append(h,el('p','pp-l','Aperçu dans Discord'),ap,el('p','pp-lien',lien),msg,pb);v.append(x);document.body.append(v);v.hidden=false;cp.focus();
}
/* Deck ouvert par un lien ?deck=CODE : liste comme le panneau de l'onglet Decks, courbe, Importer et Jouer. Invite compris. */
const memeDeck=(a,b)=>{const k=o=>Object.keys(o).filter(x=>+o[x]>0).sort().map(x=>x+(+o[x])).join();return k(a.cartes)===k(b.cartes)};
/* Importer et Jouer grises tant que le compte n'est pas connu (sinon le deck irait sur l'appareil au lieu du compte). */
function majVueDeck(){
  const v=$('popVueDeck');if(!v)return;
  v.querySelectorAll('[data-attend]').forEach(b=>{b.disabled=!compteCharge||b.dataset.injouable==='1'});
  const m=v.querySelector('[data-etat]');if(m&&!m.classList.contains('ok'))m.textContent=!compteCharge?'Chargement de ton compte…':compteCo()?'':'Sans compte, le deck est gardé sur cet appareil.';
}
function ouvreDeckLien(c){
  $('popVueDeck')?.remove();
  const o=litCodeDeck(c),v=el('div','voile'),x=el('div','boite vd-boite');v.id='popVueDeck';v.setAttribute('role','dialog');v.setAttribute('aria-modal','true');v.setAttribute('aria-label','Deck partagé');
  const esc=e=>{if(e.key==='Escape'&&$('vue').hidden)ferme()},ferme=()=>{v.remove();removeEventListener('keydown',esc)};addEventListener('keydown',esc);v.onclick=e=>{if(e.target===v)ferme()};
  if(o.err||!Object.keys(o.cartes).length){
    x.classList.remove('vd-boite');const pb=el('div','p-btns'),fe=el('button','btn fermer','Fermer');fe.type='button';fe.onclick=ferme;pb.append(fe);
    x.append(el('h2','','Lien de deck illisible'),el('p','',o.err||'Aucune carte connue dans ce lien.'),pb);v.append(x);document.body.append(v);fe.focus();return;
  }
  const d={id:'',nom:o.nom,cartes:o.cartes},E=elsOrdre(d),R=raisonsDeck(d);
  /* Bandeau : meme fond que la tuile de l'onglet Decks. */
  const t=el('div','vd-tete'),l1=el('div','vd-l1'),l2=el('div','vd-l2'),p=el('div','d-pict');
  t.style.background=E.length>1?'linear-gradient(120deg,'+E.map(e=>'color-mix(in srgb,var(--'+e+') 60%,#0a121a)').join(',')+')':E.length?'color-mix(in srgb,var(--'+E[0]+') 60%,#0a121a)':'var(--panneau2)';
  E.forEach(e=>p.append(picto(e)));
  const fx=el('button','vd-x','×');fx.type='button';fx.title='Fermer';fx.setAttribute('aria-label','Fermer');fx.onclick=ferme;
  const so=el('p','vd-sous',o.auteur?'Partagé par '+o.auteur:'Deck partagé');if(E.length)so.append(el('span','vd-noms',' - '+E.map(nomEl).join(', ')));
  l1.append(el('h2','',d.nom),compteDeck(d),fx);l2.append(p,so);t.append(l1,l2);
  const corps=el('div','vd-corps');
  if(R.length)corps.append(el('p','vd-raison','Invalide : '+R.map(r=>r.c).join(' - ')));
  decklist(corps,d,[]);corps.querySelector('.d-haut')?.remove();
  if(o.inc)corps.append(el('p','vd-m',o.inc+' carte'+(o.inc>1?'s inconnues ignorées':' inconnue ignorée')+' (lien venu d’une version plus récente du site ?)'));
  const pied=el('div','vd-pied'),pb=el('div','p-btns'),imp=el('button','btn','Importer dans mes decks'),jo=el('button','btn','Jouer avec ce deck'),msg=el('p','vd-m');imp.type=jo.type='button';
  imp.dataset.attend=jo.dataset.attend='1';msg.dataset.etat='1';if(R.length){jo.dataset.injouable='1';jo.title='Deck invalide'}
  /* Ajout dans mes decks : deck identique deja present = reutilise, sinon nom unique comme l'import par code. */
  const ajoute=()=>{
    const L=lesDecks(),deja=L.find(y=>memeDeck(y,d));if(deja)return {id:deja.id,nom:deja.nom,deja:true};
    if(L.length>=MAX_DECKS)return {err:'Limite de '+MAX_DECKS+' decks atteinte : supprime un deck avant d’importer.'};
    const pris=new Set(L.map(y=>y.nom));let nom=d.nom,k=2;while(pris.has(nom)){const s=' ('+k+++')';nom=d.nom.slice(0,24-s.length).trim()+s}
    const n={id:nouveauSid(),nom,cartes:{...d.cartes}};gardeDecks(L.concat(n));return {id:n.id,nom,deja:false};
  };
  const ko=r=>{msg.className='vd-m';msg.textContent=r.err};
  /* 0.4a/0.5 : deck refuse s'il depasse 4 elements ou contient une evolution sans sa base (Importer et Jouer). */
  const refus=()=>{const E=M.elementsDeck(d.cartes);if(E.length>M.ELEM_MAX)return 'Deck refusé : '+E.length+' éléments différents, '+M.ELEM_MAX+' au plus.';const v=M.erreurEvolutions?M.erreurEvolutions(d.cartes):'';return v?'Deck refusé : '+v+' (une évolution ou un animal demande au moins un exemplaire de la base).':''};
  imp.onclick=()=>{const rf=refus();if(rf)return ko({err:rf});const r=ajoute();if(r.err)return ko(r);
    msg.className='vd-m ok';msg.textContent=(r.deja?'Déjà dans tes decks : « ':'Ajouté à tes decks : « ')+r.nom+' ».';
    imp.textContent='Voir dans mes decks';imp.onclick=()=>{deckVu=r.id;deckOuvert=null;ferme();onglet('decks')}};
  /* Jouer : deck ajoute et preselectionne (Choisis ton deck l'aura coche), onglet Jouer avec un bandeau d'info. */
  jo.onclick=()=>{const rf=refus();if(rf)return ko({err:rf});const r=ajoute();if(r.err)return ko(r);ecrire('golems.deckChoisi',r.id);majChoixDeck();ferme();onglet('jouer');
    $('infoDeckJeu')?.remove();const q=el('p','vd-info','Deck « '+r.nom+' » choisi : lance une partie contre un Golem ou crée un salon.');q.id='infoDeckJeu';$('erreurJeu').before(q)};
  pb.append(imp,jo);pied.append(pb,msg);x.append(t,corps,pied);v.append(x);document.body.append(v);majVueDeck();fx.focus();
}
/* Decks de depart conseilles (0.4) : donnees dans cartes/donnees/interface.js. */
const DECKS_CONSEILLES=window.GolemsDonnees.interface.decksConseilles;
/* Deux elements dominants d'un deck (nombre de cartes par element). */
function elsDominants(c){const n={};for(const k in c){const C=M.CARTES[k];if(C)(C.el||[]).forEach(e=>n[e]=(n[e]||0)+c[k])}return Object.keys(n).sort((a,b)=>n[b]-n[a]).slice(0,2)}
function deckConseille(){
  const old=$('popConseil');if(old)old.remove();
  const v=el('div','voile'),x=el('div','boite dc-boite');v.id='popConseil';v.setAttribute('role','dialog');v.setAttribute('aria-modal','true');v.setAttribute('aria-labelledby','dcTitre');
  const esc=e=>{if(e.key==='Escape')ferme()},ferme=()=>{v.remove();removeEventListener('keydown',esc)};addEventListener('keydown',esc);
  v.onclick=e=>{if(e.target===v)ferme()};
  const msg=el('p','d-code-m',''),g=el('div','dc-liste');
  DECKS_CONSEILLES.forEach(o=>{
    const E=elsDominants(o.cartes),b=el('button','dc-deck');b.type='button';
    b.style.background=E.length>1?'linear-gradient(120deg,'+E.map(e=>'color-mix(in srgb,var(--'+e+') 60%,#0a121a)').join(',')+')':'color-mix(in srgb,var(--'+E[0]+') 60%,#0a121a)';
    const h=el('span','dc-haut'),pi=el('span','dc-pict');E.forEach(e=>pi.append(picto(e)));
    h.append(el('b','dc-nom',o.nom),pi);
    b.append(h,el('span','dc-els',E.map(nomEl).join(' et ')+' - '+Object.values(o.cartes).reduce((a,n)=>a+n,0)+' cartes'),el('span','dc-tx',o.txt));
    b.onclick=()=>{
      const L=lesDecks();if(L.length>=MAX_DECKS){msg.textContent='Limite de '+MAX_DECKS+' decks atteinte : supprime un deck avant d’en ajouter un.';return}
      const pris=new Set(L.map(d=>d.nom));let nom=o.nom,k=2;while(pris.has(nom)){const s=' ('+k+++')';nom=o.nom.slice(0,24-s.length).trim()+s}
      const d={id:nouveauSid(),nom,cartes:{...o.cartes}};gardeDecks(L.concat(d));deckVu=d.id;deckOuvert=null;ferme();peintDecks();
      const p=$('listeDecks').querySelector('.o-nb');if(p)p.after(el('p','d-code-m','Deck « '+nom+' » ajouté à tes decks ('+totalDeck(d)+' cartes). Tu peux le modifier comme les autres.'));
    };
    g.append(b);
  });
  const z=el('div','p-btns'),an=el('button','btn sec','Annuler');an.type='button';an.onclick=ferme;z.append(an);
  const t=el('h2','','Partir d\'un deck conseillé');t.id='dcTitre';
  x.append(t,el('p','','Choisis un deck de départ : il est copié dans tes decks et tu pourras le modifier.'),g,msg,z);v.append(x);document.body.append(v);
  g.querySelector('button').focus();
}
function importeDeck(b,l){
  const old=$('popImportDeck');if(old)old.remove();
  const v=el('div','voile'),x=el('div','boite');v.id='popImportDeck';v.setAttribute('role','dialog');v.setAttribute('aria-modal','true');v.setAttribute('aria-label','Importer un deck');
  const t=el('textarea');t.rows=3;t.placeholder='Lien https://les-golems.github.io/?deck=… ou code GOL…';t.setAttribute('aria-label','Code du deck');t.style.width='100%';
  const msg=el('p','d-code-m',''),z=el('div','p-btns'),ok=el('button','btn plein','Importer'),an=el('button','btn sec','Annuler');ok.type=an.type='button';
  const esc=e=>{if(e.key==='Escape')ferme()},ferme=()=>{v.remove();removeEventListener('keydown',esc)};addEventListener('keydown',esc);
  an.onclick=ferme;v.onclick=e=>{if(e.target===v)ferme()};
  ok.onclick=()=>{
    const L=lesDecks();if(L.length>=MAX_DECKS){msg.textContent='Limite de '+MAX_DECKS+' decks atteinte : supprime un deck avant d’importer.';return}
    const o=litCodeDeck(t.value);if(o.err){msg.textContent=o.err;return}
    if(!Object.keys(o.cartes).length){msg.textContent='Aucune carte connue dans ce code.';return}
    {const E=M.elementsDeck(o.cartes);if(E.length>M.ELEM_MAX){msg.textContent='Deck refusé : '+E.length+' éléments différents ('+E.map(nomEl).join(', ')+'), '+M.ELEM_MAX+' au plus.';return}}
    {const v=M.erreurEvolutions?M.erreurEvolutions(o.cartes):'';if(v){msg.textContent='Deck refusé : '+v+'. Une évolution ou un animal demande au moins un exemplaire de la base.';return}} /* 0.5 */
    const pris=new Set(L.map(d=>d.nom));let nom=o.nom,k=2;while(pris.has(nom)){const s=' ('+k+++')';nom=o.nom.slice(0,24-s.length).trim()+s}
    const d={id:nouveauSid(),nom,cartes:o.cartes};gardeDecks(L.concat(d));deckVu=d.id;ferme();peintDecks();
    const n=[];if(o.inc)n.push(o.inc+' carte'+(o.inc>1?'s inconnues ignorées':' inconnue ignorée'));if(o.cou)n.push('quantités ramenées à '+MAX_EX+' exemplaires et '+DECK_MAX+' cartes au plus');
    const p=$('listeDecks').querySelector('.o-nb');if(p)p.after(el('p','d-code-m','Deck « '+nom+' » importé ('+totalDeck(d)+' cartes)'+(n.length?'. '+n.join(', '):'')+'.'));
  };
  z.append(ok,an);x.append(el('h2','','Importer un deck'),el('p','','Colle le lien ou le code reçu d’un ami.'),t,msg,z);v.append(x);document.body.append(v);t.focus();
}
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
function editeur(b,l,d){
  const h=el('div','d-haut'),r=el('button','btn sec','Retour aux decks');r.type='button';r.onclick=()=>{deckOuvert=null;peintDecks()};
  /* Bac a sable de placement : bouton dans l'en-tete, le bac s'ouvre sous l'en-tete (au-dessus des filtres et du catalogue). */
  const B=bacDe(d),tb=el('button',(B.ouvert?'btn sec':'btn')+' bac-btn',B.ouvert?'Fermer le test':'Tester des placements');tb.type='button';tb.setAttribute('aria-expanded',String(B.ouvert));
  tb.onclick=()=>{B.ouvert=!B.ouvert;peintDecks()};
  h.append(el('h3','',d.nom),compteDeck(d),tb,r);b.append(h);
  /* 0.4a : elements du deck (4 au plus), discret sous l'en-tete ; message si un + ferait depasser. */
  const Ed=M.elementsDeck(d.cartes),eTxt=el('p','d-code-m d-els-nb','Éléments : '+Ed.length+'/'+M.ELEM_MAX+(Ed.length?' ('+Ed.map(nomEl).join(', ')+')':''));
  if(Ed.length>M.ELEM_MAX)eTxt.style.color='var(--rouge)';const eMsg=el('p','d-code-m');eMsg.setAttribute('role','status');b.append(eTxt,eMsg);
  /* Raisons a jour a chaque ajout ou retrait (peintDecks repeint l'editeur) ; carte en cause cerclee dans la grille. */
  const R=raisonsDeck(d),fautes=new Map();R.forEach(r=>r.ids.forEach(k=>fautes.set(k,r.c)));if(R.length)b.append(blocErreurs(R,d,l));
  if(B.ouvert)bacASable(b,d);
  /* Filtres : memes lignes et memes composants que l'onglet Cartes (Rechercher, Afficher, Elements, Trier par, puis le compte et
     Reinitialiser au-dessus de la grille), sans Terrains ni A venir. La recherche masque les cartes sans tout repeindre (le champ garde le focus et le clavier du telephone). */
  const offEl=fDeck.ty==='a';
  {const t=el('div','filtres f-ligne'),s=el('input','f-rech'),lb=el('label','f-lib','Rechercher');s.id='rechDeck';lb.htmlFor='rechDeck';
   s.type='search';s.placeholder='Nom ou numéro';s.autocomplete='off';s.value=fDeck.q;s.oninput=()=>{fDeck.q=s.value;filtreNom()};t.append(lb,s);b.append(t)}
  {const t=el('div','filtres f-ligne'),bx=el('div','f-btns');
   TY.filter(x=>x[0]!=='t'&&x[0]!=='v').forEach(([v,x])=>{const q=el('button','pastille',x);q.type='button';q.setAttribute('aria-pressed',String(v===fDeck.ty));q.onclick=()=>{fDeck.ty=v;peintDecks()};bx.append(q)});
   t.append(el('span','f-lib','Afficher'),bx);b.append(t)}
  b.append(ligneEls(fDeck,peintDecks,offEl));
  /* Tri : memes options et meme composant que l'onglet Cartes (numero, cout, Force ; croissant ou decroissant). */
  const nb=el('span');nb.setAttribute('aria-live','polite');
  {const t=el('div','filtres f-ligne d-tri'),bx=el('div','f-btns');t.append(el('span','f-lib','Trier par'),bx);
   TRI.forEach(([v,x])=>{const q=el('button','pastille',x);q.type='button';q.dataset.v=v;q.setAttribute('aria-pressed',String(v===triDeck));q.onclick=()=>{triDeck=v;peintDecks()};bx.append(q)});
   const q=el('button','pastille tri-sens');q.type='button';q.dataset.sens=triDeckDesc?'desc':'asc';
   q.innerHTML='<svg viewBox="0 0 16 16" aria-hidden="true"><path d="M8 13V3M3.5 7.5L8 3l4.5 4.5" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>';
   q.append(el('span','',triDeckDesc?'Décroissant':'Croissant'));q.setAttribute('aria-label','Ordre '+(triDeckDesc?'décroissant':'croissant')+', inverser');
   q.onclick=()=>{triDeckDesc=!triDeckDesc;peintDecks()};const bs=el('div','f-btns');bs.append(q);t.append(bs);
   b.append(t)}
  {const f=el('div','f-res'),z=el('button','f-reinit','Réinitialiser');z.type='button';
   z.onclick=()=>{fDeck.ty='';fDeck.sel.clear();fDeck.mode='ou';fDeck.q='';triDeck='';triDeckDesc=false;peintDecks()};
   f.append(nb,z);b.append(f)}
  const vues=CARTES.map((c,i)=>[c,i]).filter(([c])=>(offEl||passeEl(c,fDeck))&&(fDeck.ty===''||String(c[3])===fDeck.ty))
    .sort((x,y)=>{const d=triDeck?valTri(x[0][0],triDeck)-valTri(y[0][0],triDeck):x[1]-y[1];return (triDeckDesc?-d:d)||x[1]-y[1]}).map(x=>x[0]),g=el('div','grille'),vide=el('p','vide');
  b.append(vide);
  vues.forEach(c=>{
    const z=el('div','d-carte'),i=el('img'),n=d.cartes[c[0]]||0;i.src=imgV('cartes/'+c[0]+'.jpg');i.alt=c[1];i.loading='lazy';z.dataset.q=cleRech(c);
    const q=el('div','d-qte'),m=el('button','j-btn','-'),p=el('button','j-btn','+');m.type=p.type='button';m.setAttribute('aria-label','Retirer '+c[1]);p.setAttribute('aria-label','Ajouter '+c[1]);
    const mx=maxEx(c[0]);m.disabled=!n;p.disabled=n>=mx||totalDeck(d)>=DECK_MAX;if(mx===1&&!n&&!p.disabled)p.title='1 exemplaire au plus';
    const ch=v=>{d.cartes[c[0]]=n+v;gardeDecks(l);peintDecks()};m.onclick=()=>ch(-1);
    const neufs=(M.CARTES[c[0]]?M.CARTES[c[0]].el:[]).filter(e=>!Ed.includes(e)),trop=!n&&neufs.length&&Ed.length+neufs.length>M.ELEM_MAX;
    if(trop&&!p.disabled){p.classList.add('d-trop-el');p.title=M.ELEM_MAX+' éléments au plus par deck';
      p.onclick=()=>{eMsg.textContent='Impossible d’ajouter '+M.CARTES[c[0]].nom+' : le deck passerait à '+(Ed.length+neufs.length)+' éléments ('+M.ELEM_MAX+' au plus). Retire d’abord les cartes d’un élément.';eMsg.style.color='var(--rouge)'}}
    else p.onclick=()=>ch(1);
    /* Clic sur l'image : la carte en grand, comme dans l'onglet Cartes (les boutons + et - restent a part). */
    i.classList.add('d-zoom');i.tabIndex=0;i.setAttribute('role','button');i.setAttribute('aria-label','Agrandir '+c[1]);
    i.onclick=()=>{dernier=i;zoom(i.src,c[1],statZoomCarte(c[0]))};i.onkeydown=e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();i.onclick()}};
    q.append(m,el('b','',n+'/'+mx),p);z.append(i,q);
    if(fautes.has(c[0]))z.classList.add('d-fautive'); /* encadre rouge seul, la raison est dans le bandeau */
    g.append(z);
  });
  b.append(g);
  function filtreNom(){let n=0;g.querySelectorAll('.d-carte').forEach(z=>{const ok=passeRech(z.dataset.q,fDeck.q);z.hidden=!ok;if(ok)n++});
    nb.textContent=n+(n>1?' cartes':' carte');vide.textContent=fDeck.ty==='a'&&!vues.length?MSG_ANIMAUX:offEl?'Aucune carte pour ce filtre.':msgVide(fDeck);vide.hidden=n>0}
  filtreNom();
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
function bacASable(b,d){
  const B=bacDe(d);
  /* deck modifie : on retire les exemplaires en trop */
  M.TYPES.forEach(t=>{let n=bacUtilises(B,t)-(+d.cartes[t]||0);for(let l=2;l>=0&&n>0;l--)for(let k=2;k>=0&&n>0;k--){const g=B.G[l][k];if(g&&M.carte(g.c).id===t){bacRetire(B,l,k);n--}}});
  if(B.sel&&!(+d.cartes[B.sel]>0))B.sel=null;
  if(B.selC&&!B.G[B.selC[0]][B.selC[1]]){B.selC=null;B.mode=null}
  const z=el('section','bac');z.id='bacASable';z.setAttribute('aria-label','Tester des placements');
  const peint=()=>{const y=scrollY,n=bacASable(el('div'),d);z.replaceWith(n);scrollTo(0,y)};
  const h=el('div','bac-haut'),ha=el('button','btn sec','Terrains au hasard'),ef=el('button','btn sec','Tout effacer');
  ef.type=ha.type='button';
  ef.onclick=()=>{B.G=bacVide();B.selC=null;B.mode=null;peint()};
  ha.onclick=()=>{B.T=bacTirage();peint()};
  h.append(el('h3','','Tester des placements'),ha,ef);z.append(h);
  const corps=el('div','bac-corps'),gauche=el('div','bac-gauche'),pl=el('div','bac-plateau');corps.append(pl,gauche);z.append(corps);
  const s=bacEtat(B),G=B.G,cols=[0,1,2];
  /* Carte posee touchee : son detail s'affiche dans l'encart Detail sous la main (plus de fenetre). */
  const choisit=(l,k)=>{B.sel=null;B.selC=[l,k];B.mode=null;peint()};
  /* Cartes du deck, comme la main en partie : toucher la carte la choisit, l'oeil l'ouvre en grand. Pastille : exemplaires restant a poser. */
  const pool=el('div','bac-pool');pool.setAttribute('aria-label','Cartes du deck');
  M.TYPES.filter(t=>+d.cartes[t]>0).forEach(t=>{
    const C=M.CARTES[t],reste=+d.cartes[t]-bacUtilises(B,t),sl=el('div','bac-slot'),q=el('button','bac-carte'),i=el('img'),o=el('button','oeil');q.type=o.type='button';
    i.src=imgV('cartes/'+t+'.jpg');i.alt='';i.loading='lazy';q.append(i,el('span','n',String(reste)));
    q.setAttribute('aria-label',M.nomDetail(C)+', '+reste+' sur '+d.cartes[t]+' à poser');q.title=M.nomDetail(C)+(C.base?' : se pose sur '+M.CARTES[C.base].nom:C.animal?' : à côté de '+M.CARTES[C.maitre].nom:'');
    q.setAttribute('aria-pressed',String(B.sel===t));q.disabled=reste<=0;
    q.onclick=()=>{B.sel=B.sel===t?null:t;B.selC=null;B.mode=null;peint()};
    q.draggable=reste>0;q.ondragstart=e=>{e.dataTransfer.setData('text/plain','t:'+t);e.dataTransfer.effectAllowed='move'};
    o.append(ico('oeil'));o.setAttribute('aria-label','Agrandir '+C.nom);o.onclick=()=>{cacheApercu();dernier=o;zoom(imgV('cartes/'+t+'.jpg'),C.nom,statZoomCarte(t))};
    sl.append(q,o);pool.append(sl);
  });
  pool.ondragover=e=>{e.preventDefault();pool.classList.add('survol')};pool.ondragleave=()=>pool.classList.remove('survol');
  pool.ondrop=e=>{e.preventDefault();const x=e.dataTransfer.getData('text/plain');if(x.startsWith('c:')){const[l,k]=x.slice(2).split(',').map(Number);bacRetire(B,l,k);B.selC=null;B.mode=null;peint()}else pool.classList.remove('survol')};
  gauche.append(pool);
  /* Plateau : terrains (choix), grille du moteur (grilleVue, comme en partie), totaux par colonne. */
  const t=el('div','p-terrains');
  cols.forEach(k=>{
    const T=s.terrains[k],dv=el('div','p-terrain'),sl=el('select');sl.setAttribute('aria-label','Terrain '+(k+1));
    M.TERRAINS.forEach((x,i)=>{const o=el('option','',x.nom);o.value=i;sl.append(o)});sl.value=B.T[k];
    sl.onchange=()=>{const v=+sl.value,j=B.T.indexOf(v);if(j>=0&&j!==k)B.T[j]=B.T[k];B.T[k]=v;peint()};
    dv.append(sl,el('span','p-valeur',T.pts+(T.pts>1?' pts':' pt')),el('span','bac-tinfo',(r=>r?'Coût -'+r.cout+' ici':'Force inchangée')(effetTerrain(T,'reduction'))));const zv=el('button','sc-btn sc-tertiaire bac-zt','Voir');zv.type='button';zv.title='Voir '+T.nom+' en grand, avec tes Golems';zv.onclick=()=>zoomTerrainBac(s,k);dv.append(zv);t.append(dv);
  });
  let cible=null;const[sa,sb]=B.selC||[];
  if(B.sel){const c=bacLibre(B,d,B.sel);if(c!==null)cible=(l,k)=>M.peutPoser(s,0,c,l,k)?{texte:(G[l][k]?(M.carte(c).base?'Améliorer ':'Remplacer '):'Poser ')+M.coutPose(s,0,c,l,k),fait:()=>{bacPlace(B,d,B.sel,l,k);peint()}}:null}
  else if(B.selC&&B.mode==='fav')cible=(l,k)=>l===sa&&k===sb?{choisie:true,fait:()=>{}}:bacGolem(G[l][k])?{texte:'Favori',fait:()=>{G[sa][sb].fav=G[l][k].c;B.mode=null;peint()}}:null;
  else if(B.selC&&B.mode==='copie')cible=(l,k)=>l===sa&&k===sb?{choisie:true,fait:()=>{}}:bacVois(sa,sb).some(([a,b])=>a===l&&b===k)&&bacGolem(G[l][k])?{texte:'Copier',fait:()=>{const g=G[sa][sb];g.cp=M.idEff(G[l][k]);delete g.de;g.f=M.carte(g.c).force||0;B.mode=null;bacPose(B,sa,sb);peint()}}:null;
  else if(B.selC&&B.mode==='bouge')cible=(l,k)=>l===sa&&k===sb?{choisie:true,fait:()=>{B.mode=null;peint()}}:bacPeut(B,sa,sb,l,k)?{texte:G[l][k]?'Échanger':'Ici',fait:()=>{bacBouge(B,sa,sb,l,k);B.selC=[l,k];B.mode=null;peint()}}:null;
  else if(B.selC)cible=(l,k)=>l===sa&&k===sb?{choisie:true,fait:()=>{}}:null;
  const g=grilleVue(s,0,cols,[0,1,2],cible);g.classList.add('mienne');
  g.querySelectorAll('.p-case').forEach(q=>{
    const l=+q.dataset.l,k=+q.dataset.k,v=G[l][k];
    if(v&&v.de&&BAC_DES[M.idEff(v)])q.querySelector('.mini').append(el('span','cp',(v.de.length>1?'Dés : '+v.de.join(' et '):'Dé : '+v.de[0])));
    if(v&&!q.classList.contains('cible')&&!q.classList.contains('choisie'))q.onclick=()=>choisit(l,k); /* comme en partie : detail de la Force */
    /* glisser-deposer (ordinateur) : une carte du deck ou une carte posee */
    if(v){q.draggable=true;q.ondragstart=e=>{e.dataTransfer.setData('text/plain','c:'+l+','+k);e.dataTransfer.effectAllowed='move'}}
    q.ondragover=e=>{e.preventDefault();q.classList.add('survol')};q.ondragleave=()=>q.classList.remove('survol');
    q.ondrop=e=>{e.preventDefault();q.classList.remove('survol');const x=e.dataTransfer.getData('text/plain');
      if(x.startsWith('t:')){if(bacPlace(B,d,x.slice(2),l,k)&&!B.mode)B.sel=null}
      else if(x.startsWith('c:')){const[a,b2]=x.slice(2).split(',').map(Number);if(bacBouge(B,a,b2,l,k)){B.selC=null;B.mode=null}}
      peint()};
  });
  const cc=M.colonnes(s),to=el('div','bac-totaux');
  cols.forEach(k=>{const x=el('div');x.append(el('span','',s.terrains[k].nom),el('b','',String(cc[k][0])));to.append(x)});
  /* Energie pour tout poser (moteur : coutPose, La Boutique comprise ; evolution = base puis evolution) */
  let en=0;G.forEach((L,l)=>L.forEach((v,k)=>{if(!v)return;const C=M.carte(v.c);en+=M.coutPose(s,0,v.c,l,k);if(C.base)en+=M.coutPose(s,0,M.TYPES.indexOf(C.base)*3,l,k)}));
  const so=el('p','bac-somme');so.append('Force totale ',el('b','',String(cc.reduce((a,c)=>a+c[0],0))),' - énergie pour tout poser ',el('b','',String(en)));
  pl.append(t,g,to);corps.append(so);
  /* Encart Detail permanent sous la main : sans selection, mode d'emploi et Force par terrain ;
     carte posee choisie, calcul de sa Force (detailForce, comme en partie), note, des, deplacer, retirer, favori, copie. */
  const o=el('div','bac-det');o.setAttribute('aria-live','polite');o.append(el('h4','','Détail'));
  const lgn=(a,v,c)=>{const x=el('div','lg'+(c?' '+c:''));x.append(el('span','',a),el('b','',v));return x};
  /* Force en picto (bouclier + nombre), libelle en mots pour les lecteurs d'ecran */
  const lgf=(a,n,c)=>{const x=lgn(a,String(n),c),b=x.lastChild;b.prepend(ico('force'));b.setAttribute('role','img');b.setAttribute('aria-label','Force '+n);return x};
  if(!B.selC){
    if(B.sel)o.append(el('p','','Touche une case en surbrillance pour poser '+M.CARTES[B.sel].nom+'.'));
    const ol=el('ol');['Touche une carte de ton deck, puis une case en surbrillance (ou glisse-la).','Touche une carte posée pour voir le calcul de sa Force ici.','Déplace, échange ou retire-la avec les boutons qui apparaissent.'].forEach(x=>ol.append(el('li','',x)));
    o.append(ol,el('h5','','Force par terrain'));
    let tot=0;cols.forEach(k=>{tot+=cc[k][0];o.append(lgf(s.terrains[k].nom+' ('+s.terrains[k].pts+(s.terrains[k].pts>1?' pts)':' pt)'),cc[k][0]))});
    o.append(lgf('Total',tot,'tot'));
  }else{
    const v=G[sa][sb],C=M.carte(v.c),id=M.idEff(v),tt=el('div','t'),bs=el('div','bs');
    const bt=(x,f,p)=>{const q=el('button','pastille',x);q.type='button';q.onclick=f;if(p!==undefined)q.setAttribute('aria-pressed',String(p));bs.append(q);return q};
    tt.append(el('b','',M.nomDetail(C)));if(!C.animal)tt.append(el('span','fo','Force '+M.forceDe(s,0,sa,sb)));o.append(tt);
    o.append(...(C.animal?detailAnimal(C):detailForce(s,0,sa,sb)));
    if(B.mode==='fav')o.append(el('p','','Choisis son favori : touche un de tes Golems.'));
    else if(B.mode==='copie')o.append(el('p','','Déguisement : touche le voisin à copier.'));
    else if(B.mode==='bouge')o.append(el('p','','Touche une case libre, ou un autre Golem pour échanger.'));
    const notes=[BAC_NOTE[C.id]];if(C.id!==id&&id&&BAC_NOTE[id])notes.push('Copie : '+BAC_NOTE[id]);const nt=notes.filter(Boolean).join(' ');if(nt)o.append(el('p','',nt));
    if(BAC_DES[id])o.append(bacDes(v,id,peint));
    o.append(bs);
    bt('Déplacer',()=>{B.mode=B.mode==='bouge'?null:'bouge';peint()},B.mode==='bouge');
    bt('Retirer',()=>{bacRetire(B,sa,sb);B.selC=null;B.mode=null;peint()});
    if(M.FAV_BONUS[id])bt('Changer le favori',()=>{B.mode='fav';peint()},B.mode==='fav');
    if(effetDe(C.id,'copie',r=>r.cible==='voisin')&&bacVois(sa,sb).filter(([a,b])=>bacGolem(G[a][b])).length>1)bt('Changer la copie',()=>{delete v.cp;delete v.fav;B.mode='copie';peint()},B.mode==='copie');
    bt('Désélectionner',()=>{B.selC=null;B.mode=null;peint()});
  }
  gauche.append(o);
  /* Ce que le bac a sable compte : resume visible, detail depliable */
  const m=el('details','bac-mention'),sm=el('summary','','Ton côté seulement : ni cercle des éléments, ni effet adverse, ni fin de manche.');m.append(sm);
  const ul=el('ul');
  const li=(cl,a,x)=>{const i=el('li');i.append(el('span',cl,a),' '+x);ul.append(i)};
  li('oui','Compté :','Force de la carte, Trait (voisins alliés), Cyrdan et Roi du Karaoké, favori d\'Indra, Survolté, KEKWait, Full synergie (éléments partagés), Double up ?, copie du Maître du déguisement.');
  li('oui','Dés :','Alrevan (4) et KEKWRevan (3 et 4) : choisis le résultat sur la carte posée, ou relance.');
  li('non','Pas compté :','cercle des éléments et Counter-pick, effets sur le Golem en face ou la ligne adverse, dégâts et Rage, Comeback et Winstreak (manche 1), Gamba d\'Apo, fin de manche (KaTarN, terrains, Mignonitude), pioche, Forge et énergie.');
  li('non','Terrains :','aucun ne change la Force ; ils donnent les points. La Boutique baisse le coût (énergie pour tout poser).');
  const vus=M.TYPES.filter(x=>+d.cartes[x]>0&&BAC_NOTE[x]);
  if(vus.length){const p=el('li');p.append(el('span','oui','Tes cartes :'));const u2=el('ul');vus.forEach(x=>u2.append(el('li','',M.nomDetail(M.CARTES[x])+' : '+BAC_NOTE[x])));p.append(u2);ul.append(p)}
  m.append(ul);gauche.append(m);
  b.append(z);return z;
}
