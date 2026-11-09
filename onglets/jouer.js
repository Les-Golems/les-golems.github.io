/* Onglet Jouer : salon en ligne, versions des joueurs (etape 3), parties ouvertes et en cours, invitations, chat, spectateur. */
/* Salon en ligne : tout repose sur la présence */
const MAX=2,ALPHA='abcdefghjkmnpqrstuvwxyz23456789';
const personnes=l=>l.filter(p=>p.kind==='viewer');
const pause=ms=>new Promise(f=>setTimeout(f,ms));
function nouveauCode(){let s='';for(let i=0;i<5;i++)s+=ALPHA[Math.floor(Math.random()*ALPHA.length)];return s}
function nomDe(p){const n=p.presence&&p.presence.pseudo;return nettoie(typeof n==='string'?n:'')||'Joueur'}
/* Version du site de chaque joueur (salon et parties publiques) : v = "<v de version.json>|<build>", lue une fois au chargement.
   Champ v absent chez l'autre = ancienne version. Versions differentes : Pret bloque ; le plus ancien (build le plus petit) doit recharger. */
const vOk=v=>typeof v==='string'&&/^[0-9a-z.|: -]{1,40}$/.test(v)?v:'';
/* Etape 3 : seul le numero v compte (builds differents d'une meme version = correctifs, compatibles). maV garde v|build pour les pages deja en ligne. */
const vEg=(a,b)=>vNom(a)===vNom(b);
const maVersion=window.GOLEMS_VERSION?Promise.resolve(maV=vOk(GOLEMS_VERSION.v+'|'+GOLEMS_VERSION.build)):fetch('version.json?t='+Date.now(),{cache:'no-store'}).then(x=>x.json()).then(x=>{maV=vOk(String(x.v||'')+'|'+String(x.build||''));return maV}).catch(()=>'');
const vDe=p=>p.sameTab?maV:vOk(p.presence&&p.presence.v);
const vNom=v=>v?v.split('|')[0]:'';
/* Vrai si la version v (autre joueur) est plus ancienne que la mienne ou de meme build : c'est elle qui doit recharger. */
const vAncienne=v=>!v||(v.split('|')[1]||'')<=(maV.split('|')[1]||'');
function etiquetteV(v,rouge){
  const e=el('span','etq-v vx-etq'+(rouge?' vx-diff':''));
  /* Sans champ v : site d'avant ce controle, donc 0.2b. Texte : version du site (champ v de version.json) ; v… tant qu'elle n'est pas lue. */
  e.textContent=rouge?'v'+(v?vNom(v):'0.2b')+' - page à recharger':v?'v'+vNom(v):'v…';
  return e;
}
/* Ma page est la plus ancienne : petit encadre Nouvelle version de l'en-tete. */
function vJeSuisAncien(){if(!$('majDispo').hidden)return;$('majDispo').hidden=false;document.dispatchEvent(new CustomEvent('golems:versionAncienne'))}
/* Etiquette de version de l'en-tete : champ v de version.json (lu par maVersion). Clic ou Entree : fenetre « Détails »
   de cette version si elle a ses details, sinon rien. Lecture impossible : etiquette masquee. */
maVersion.then(()=>{
  const b=$('verEtq'),v=vNom(maV);b.classList.remove('ve-charge');b.removeAttribute('aria-busy');
  if(!v){b.hidden=true;return}
  const n=NOUVEAUTES.find(x=>x.version==='Version '+v),ok=!!(n&&typeof DETAILS_VERSIONS==='object'&&DETAILS_VERSIONS[n.version]&&typeof ouvreDetailsVersion==='function');
  b.textContent='v'+v;b.title=ok?'Détails de la version '+v:'Version '+v;b.setAttribute('aria-label',b.title);
  if(ok){b.removeAttribute('tabindex');b.setAttribute('aria-haspopup','dialog');b.onclick=()=>ouvreDetailsVersion(n,b)}else b.classList.add('ve-inerte');
});
maVersion.then(()=>{if(r&&maV)r.presence({v:maV}).catch(()=>{});if(r)majSalon();else if(annoncesL.length)peintListe()});
function indisponible(){room=null;$('absent').hidden=false;$('etat').hidden=true;$('creer').disabled=$('rejoindre').disabled=true}
function majEtat(){
  if(!room)return;
  const co=room.connected(),n=personnes(room.peers()).length;
  $('etat').classList.toggle('ok',co);
  const cc=compteCo();
  $('etatTexte').textContent=!co?'Connexion au salon en ligne...':!cc?'Connecte-toi pour jouer en ligne.':n<2?'1 joueur connecté':n+' joueurs connectés';
  $('creer').disabled=$('rejoindre').disabled=!co||occupe||!cc;
  $('reprendre').disabled=!cc;
}
function annoncePseudo(){
  if(!room)return;
  room.presence({pseudo:pseudo,salon:partie?null:code||null}).catch(()=>{});
  if(r)r.presence({pseudo:pseudo}).catch(()=>{});
}
function ordre(l){
  const t=personnes(l).filter(p=>!p.presence.quitte).sort((a,b)=>{
    const x=+a.presence.arrivee||Infinity,y=+b.presence.arrivee||Infinity;
    return x-y||(a.peer<b.peer?-1:1)});
  /* Apres un rechargement, l'ancienne presence peut survivre un instant : une seule par joueur. */
  const m={};
  t.forEach(p=>{const i=p.presence.sid;if(typeof i!=='string'||!i)return;
    const q=m[i];if(!q||p.sameTab||(!q.sameTab&&p.updatedAt>q.updatedAt))m[i]=p});
  return t.filter(p=>{const i=p.presence.sid;return typeof i!=='string'||!i||m[i]===p});
}
/* Adversaire arrive dans ma partie en attente, onglet cache : le titre alterne « Adversaire arrivé ! · Les Golems » et le titre normal
   jusqu'au retour sur l'onglet (repris de signal-tour.js, retire a l'etape 8 : son signal « À toi ! » ne marchait pas, une etiquette le remplace). */
(()=>{const ARRIVEE='Adversaire arrivé ! - Les Golems';let normal=null,minuteur=0,bascule=false,arrivee=false;
  const arrete=()=>{if(minuteur){clearInterval(minuteur);minuteur=0}if(normal!==null){document.title=normal;normal=null}};
  const verifie=()=>{if(!document.hidden)arrivee=false;
    if(document.hidden&&arrivee){if(!minuteur){normal=document.title;bascule=false;minuteur=setInterval(()=>{bascule=!bascule;document.title=bascule?(arrivee?ARRIVEE:normal):normal},1000);document.title=ARRIVEE;bascule=true}}
    else arrete()};
  window.golemsAdversaireArrive=()=>{if(document.hidden){arrivee=true;verifie()}};
  document.addEventListener('visibilitychange',verifie);setInterval(verifie,1000);})();
function majSalon(){
  if(!r)return;
  const l=ordre(r.peers());
  /* Adversaire arrive dans ma partie en attente : son doux et titre de l'onglet (golemsAdversaireArrive ci-dessus). */
  {const n=Math.min(l.length,MAX);if(createur&&!partie&&nbSalon===1&&n===2){joueSons(['arrivee']);if(window.golemsAdversaireArrive)window.golemsAdversaireArrive()}nbSalon=n}
  if(l.findIndex(p=>p.sameTab)>=MAX&&Date.now()-entree>1500){sortie('Ce salon est complet.');return}
  /* Versions differentes avant la partie : Pret retire et bloque, etiquette rouge sur le siege le plus ancien. */
  {const d=l.slice(0,MAX),o=d.find(p=>!p.sameTab);vxEcart=!partie&&!!maV&&d.length>=MAX&&!!o&&!vEg(vDe(o),maV);vxRouge=vxEcart?(vAncienne(vDe(o))?o.peer:'moi'):'';
   if(vxEcart&&jePret){jePret=false;pub({pret:null,deck:null});majChoixDeck()}
   if(vxRouge==='moi')vJeSuisAncien()}
  const u=$('joueurs'),specUI=!!(window.SPEC&&window.SPEC_UI&&SPEC.etatSalon().actif); /* mode spectateur : sieges peints par spectateur-ui.js */
  if(!specUI)u.textContent='';
  const sieges=l.slice(0,MAX).map(siegeSalon);
  while(sieges.length<MAX){const v=el('div','sl-j sl-libre'),a=el('div','avatar','?'),t=el('div','cd-tuile');
    t.append(el('span','h-deck h-sans','Place libre'),el('span','cd-nb','Partage le code ci-dessus'));
    const e=etiquetteV(maV,false);e.classList.add('sl-vide');
    v.append(a,el('div','sl-nom','Adversaire'),el('span','sl-etat sl-vide','En attente'),e,t);sieges.push(v)}
  if(!specUI)u.append(sieges[0],el('div','sl-vs','VS'),sieges[1]);
  const adv=l.slice(0,MAX).find(p=>!p.sameTab);majFace(adv?nomDe(adv):'');
  if(!partie&&l.some(p=>!p.sameTab&&Number.isInteger(p.presence.jg)&&typeof p.presence.adv==='string'&&p.presence.adv!==sid&&p.presence.sid!==sid)&&Date.now()-entree>1500){sortie('Ce salon est complet.');return}
  const c=l.length>=MAX;
  const duo=l.slice(0,MAX),libre=!partie&&c&&!vxEcart&&!duo.some(p=>Number.isInteger(p.presence.jg));
  if(libre&&duo.every(estPret))armeCompte();else stopCompte();
  if(!partie&&!c){const m=l.find(p=>p.sameTab);if(m&&Number.isInteger(m.presence.graine))pub({graine:null})} /* graine orpheline : l'adversaire est parti juste apres le compte */
  /* Pret toujours visible sous les deux joueurs : grise tant qu'on est seul, ou si les versions different. */
  $('pret').hidden=!!partie;$('pret').disabled=vxEcart||!(libre||jePret);
  $('pret').textContent=vxEcart?'Versions différentes':jePret?'Pas prêt':!c?'En attente d\'un adversaire':'Prêt';$('pret').classList.toggle('sec',jePret);
  majAnnonce(l);
  $('attente').textContent=vxEcart?'':compteFin?texteCompte():!c?notice||'':jePret?'En attente de ton adversaire':duo.some(estPret)?'Ton adversaire est prêt':'Salon complet, clique sur Prêt';
  $('attente').classList.toggle('pret',c&&!vxEcart);
  majPartie();placeChat();
}
/* Siege d'un joueur : avatar, pseudo, etat, deck en tuile (comme l'onglet Decks) */
function infoDeck(t){
  if(typeof t!=='string'||!t)return {nom:'Deck par défaut',els:[...new Set(M.TYPES.flatMap(k=>M.CARTES[k].el))],nb:M.TAILLE_DECK};
  const o=M.lisDeck(t);let nb=0;if(o)for(const k in o)nb+=+o[k]||0;
  return {nom:'',els:elsTexte(t),nb:nb||M.TAILLE_DECK};
}
function siegeSalon(p){
  const nom=nomDe(p),moi=p.sameTab,pr=estPret(p),s=el('div','sl-j'+(pr?' pret':'')+(moi?' sl-moi':''));
  const n=el('div','sl-nom',nom);if(moi)n.append(el('em','','toi'));
  s.append(moi?avatarDe(nom,monAvatar()):avatarUid(nom,p.peer),n,el('span','sl-etat',pr?'Prêt':'En attente'),etiquetteV(vDe(p),vxRouge===(moi?'moi':p.peer)));
  const t=el('div','cd-tuile');
  if(moi){const c=jePret&&deckPret?deckPret:deckChoisi(),i=infoDeck(c.texte);t.append(...enteteDeck(c.nom,i.els,i.nb))}
  /* Deck de l'adversaire masque avant la partie : meme tuile que la mienne, bandeau neutre « Deck choisi » (ni nom, ni element, ni couleur),
     nombre de cartes, pastille « ? » ; « Choix en cours » tant qu'il n'est pas pret. Il se decouvre en jeu, carte par carte. */
  else{const h=el('div','cd-haut'),pi=el('div','d-pict');
    if(pr){h.append(el('span','h-deck dk-neutre','Deck choisi'),compteNb(infoDeck(p.presence.deck).nb));pi.append(pastilleInconnue())}
    else h.append(el('span','h-deck dk-neutre','Choix en cours'));
    t.append(h,pi)}
  s.append(t,tauxSiege(p));
  if(moi&&!partie){const b=el('button','btn sec','Changer de deck');b.type='button';b.disabled=jePret;b.title=jePret?'Retire ton Prêt pour changer de deck':'';b.onclick=()=>choisirDeck(()=>majSalon(),'Choisir');s.append(b)}
  return s;
}
/* Taux de victoire sur toutes les parties : le mien en direct (cumuls), celui de l'adversaire via joueurs/{uid}/stats. */
const statsCache={};
function texteTaux(s){return s&&s.n?Math.round(100*s.v/s.n)+' % de victoires ('+s.n+' partie'+(s.n>1?'s':'')+')':'Aucune partie jouée'}
function tauxSiege(p){
  if(p.sameTab){const c=monCumul()||{n:0,v:0};return el('span','sl-taux',texteTaux({v:c.v|0,n:c.n|0}))}
  const z=el('span','sl-taux',p.peer in statsCache?texteTaux(statsCache[p.peer]):'…');
  if(!(p.peer in statsCache)&&room&&room.compte.statsDe){statsCache[p.peer]=null;room.compte.statsDe(p.peer).then(s=>{statsCache[p.peer]=s;if(r)majSalon()})}
  return z;
}
/* Face-a-face : bilan de mes parties en ligne contre ce pseudo (nuls a part). */
function majFace(nom){
  const z=$('faceAFace');
  const h=nom?lesParties().filter(x=>!/^Golem/.test(x.adv||'')&&x.adv===nom):[];
  const v=h.filter(x=>x.res==='Victoire').length,d=h.filter(x=>x.res==='Défaite').length;
  z.hidden=!(v+d);if(v+d)z.textContent='Face-à-face : '+(pseudo||'Toi')+' '+v+' - '+d+' '+nom;
}
/* Annonce publique (0.4) : tenue par le createur d'un salon public tant que la partie n'a pas commence
   (adversaire assis w, q et spectateurs n), puis pendant la partie par le joueur de la place 0 (en cours g, manche m,
   score k), retiree a la fin. Les autres joueurs n'y touchent pas. Salon public note sur l'appareil (rechargement en partie). */
const estPublic=c=>!!c&&lire('golems.pub.'+c)==='1';
function notePublic(c,v){try{if(v)ecrire('golems.pub.'+c,'1');else localStorage.removeItem(LS('golems.pub.'+c))}catch(e){}}
function majAnnonce(l){
  if(!r||!r.annonce)return;
  const E=window.SPEC&&SPEC.etatSalon?SPEC.etatSalon():null,ns=E&&E.actif&&Array.isArray(E.spectateurs)?E.spectateurs.length:0;
  const adv=l.slice(0,MAX).find(p=>!p.sameTab),d=deckChoisi();
  let o=null;
  if(partie&&!partie.local){
    if(partie.moi!==0||!(salonPublic||estPublic(code)))return;
    const st=partie.etat;
    if(st&&!st.fin)o={d:d.nom,e:elsPrincipaux(partie.decks[0]).join(','),f:elsPrincipaux(partie.decks[1]).join(','),v:maV,n:ns,g:true,m:st.manche,k:st.j[0].score+'-'+st.j[1].score};
    else if(!st)return;
  }else{
    if(!createur||l.some(p=>Number.isInteger(p.presence.jg)))return; /* lancement en cours : rien a changer */
    if(salonPublic)o={d:d.nom,e:elsTexte(d.texte).join(','),v:maV,n:ns};
  }
  if(o&&adv){o.w=adv.peer;o.q=nomDe(adv)}
  const cle=o?JSON.stringify(o):'';
  if(cle===annonceVue)return;annonceVue=cle;
  r.annonce(o).catch(e=>{console.warn(e);annonceVue=''});
}
/* Design B (0.4) : tuiles teintees. Avant la partie (parties ouvertes, salon) : teinte neutre, rien du deck n'est revele.
   Parties en cours : degrade d'apres les elements des decks des deux joueurs. */
const TEINTE_NEUTRE='linear-gradient(135deg,#4a5a68,#26323d)';
function teinte(els,sens){const l=(els||[]).filter(e=>NOMS_EL[e]);if(!l.length)return TEINTE_NEUTRE;
  const c=l.map(e=>'color-mix(in srgb,var(--'+e+') 70%,#0a121a)');if(c.length===1)c.push(c[0]);return 'linear-gradient('+(sens||'135deg')+','+c.join(',')+')'}
/* Elements principaux d'un deck (texte, '' = deck par defaut) : par nombre de cartes, ceux qui couvrent au moins 30 % du deck, 2 au moins, 3 au plus. */
function elsPrincipaux(t){
  const o=(typeof t==='string'&&t&&M.lisDeck(t))||M.DECK_DEFAUT||{},n={};let tot=0;
  for(const k in o){const C=M.CARTES[k];if(!C)continue;tot+=+o[k]||0;(C.el||[]).forEach(e=>n[e]=(n[e]||0)+(+o[k]||0))}
  const l=Object.keys(n).sort((a,b)=>n[b]-n[a]);return l.filter((e,i)=>i<2||(i<3&&n[e]>=0.3*tot));
}
function depuis(t){const m=Math.max(0,Math.round((Date.now()-(+t||Date.now()))/60000));return m<1?'à l\'instant':m<60?'il y a '+m+' min':'il y a '+Math.floor(m/60)+' h'}
const OEIL_PO='<svg viewBox="0 0 66 66" aria-hidden="true"><path fill="none" stroke="currentColor" stroke-width="6" stroke-linejoin="round" d="M4 33C14 17 23 12 33 12S52 17 62 33C52 49 43 54 33 54S14 49 4 33Z"/><circle cx="33" cy="33" r="10" fill="currentColor"/></svg>';
function nbSpec(x){const n=Number.isInteger(x.n)&&x.n>0?x.n:0,z=el('span','po-spec');z.innerHTML=OEIL_PO;z.append(el('b','',String(n)),el('span','','spectateur'+(n>1?'s':'')));return z}
/* Observer : entrer dans le salon en spectateur (vue diffusion des que la partie commence). */
function observer(x){if(!compteCo()){msgInvite();return}createur=false;salonPublic=false;annonceVue='';entre(x.code,{observer:true})}
function boutonObserver(x,off){const b=el('button','btn sec po-obs');b.type='button';b.innerHTML=OEIL_PO;b.append(el('span','po-obs-t','Observer'));b.title='Observer';b.setAttribute('aria-label','Observer');b.disabled=!!r||occupe||off;b.onclick=()=>observer(x);return b}
/* Parties en cours (0.4) : parties publiques lancees et pas finies, une ligne chacune (joueurs, manche, score, spectateurs, Observer). */
function peintEnCours(moi){
  const u=$('listeEnCours');if(!u)return;u.textContent='';
  const l=annoncesL.filter(x=>x.g===true&&typeof x.w==='string');
  const g=el('ul','sl-liste po-lignes');
  if(!l.length){g.append(el('li','sl-vide','Aucune partie en cours.'));u.append(g);return}
  l.forEach(x=>{
    const mien=!!moi&&(x.u===moi||x.w===moi),li=el('li','po-ligne po-ec b-teinte'+(mien?' sl-mien':'')),nom=nettoie(typeof x.p==='string'?x.p:'')||'Joueur',nq=nettoie(typeof x.q==='string'?x.q:'')||'Joueur';
    const ea=String(x.e||'').split(',').filter(z=>NOMS_EL[z]).slice(0,3),eb=String(x.f||'').split(',').filter(z=>NOMS_EL[z]).slice(0,3);
    /* Partie lancee : les elements sont visibles des spectateurs, la teinte suit chaque joueur (gauche, droite) */
    const ca=ea[0]?'color-mix(in srgb,var(--'+ea[0]+') 70%,#0a121a)':'#3a4955',cb=eb[0]?'color-mix(in srgb,var(--'+eb[0]+') 70%,#0a121a)':'#3a4955';
    li.style.setProperty('--tinte','linear-gradient(90deg,'+ca+','+cb+')');
    const xv=vOk(x.v),vd=!mien&&!!maV&&!vEg(xv,maV),duo=el('div','po-duo');
    /* Joueur : avatar, pseudo, pictos discrets des elements principaux de son deck (2 ou 3) */
    const j=(n,a,e)=>{const s=el('span','po-j'),pi=el('span','po-els');e.forEach(z=>{const i=picto(z);i.width=i.height=16;i.title=nomEl(z);pi.append(i)});
      s.append(a,el('b','',n));if(pi.childNodes.length)s.append(pi);return s};
    const k=typeof x.k==='string'&&/^\d{1,2}-\d{1,2}$/.test(x.k)?x.k.split('-'):['0','0'],sc=el('span','po-score');
    sc.append('Manche '+(Number.isInteger(x.m)?x.m:1),el('b','',k[0]+' - '+k[1]));
    duo.append(j(nom,x.u?avatarUid(nom,x.u,x.a):avatarDe(nom,x.a),ea),sc,j(nq,avatarUid(nq,x.w),eb));
    const pied=el('div','po-pied');pied.append(nbSpec(x));
    if(mien)pied.append(el('span','sl-badge po-badge','Ta partie'));else pied.append(boutonObserver(x,vd));
    li.append(duo,pied);g.append(li);
  });
  u.append(g);
}
/* Parties ouvertes (variante C) : places libres en cartes (Rejoindre / Observer), puis salons complets en lignes (Observer). */
function peintListe(){
  const u=$('listeSalons');if(!u)return;u.textContent='';
  const moi=room&&room.compte?room.compte.uid():'';
  peintEnCours(moi);
  const l=[...annoncesL.filter(x=>moi&&x.u===moi),...annoncesL.filter(x=>x.u!==moi)].filter(x=>x.g!==true);
  if(!l.length){const v=el('ul','sl-liste');v.append(el('li','sl-vide','Aucune partie ouverte. Crée la tienne !'));u.append(v);return}
  const libres=l.filter(x=>typeof x.w!=='string'),pleins=l.filter(x=>typeof x.w==='string');
  const titre=(t,n)=>{const h=el('p','po-gt',t+' ');h.append(el('b','',String(n)));u.append(h)};
  const stats=x=>{const tx=el('span','sl-tx',x.u in statsCache?tauxCourt(statsCache[x.u]):'…');
    if(x.u&&!(x.u in statsCache)&&room&&room.compte.statsDe){statsCache[x.u]=false;room.compte.statsDe(x.u).then(s=>{statsCache[x.u]=s;if(!r)peintListe()})}
    else if(x.u in statsCache)colTaux(tx,statsCache[x.u]);return tx};
  /* Version de l'annonce : differente de la mienne = Rejoindre et Observer bloques, etiquette rouge si c'est elle la plus ancienne. */
  const version=(x,mien)=>{const xv=mien?maV:vOk(x.v),vd=!mien&&!!maV&&!vEg(xv,maV),vr=vd&&vAncienne(xv);if(vd&&!vr)vJeSuisAncien();return {xv,vd,vr}};
  if(libres.length){
    titre('Place libre',libres.length);
    const g=el('ul','sl-liste sl-grille');
    libres.forEach(x=>{
      const mien=!!moi&&x.u===moi,li=el('li','sl-carte'+(mien?' sl-mien':'')),nom=nettoie(typeof x.p==='string'?x.p:'')||'Joueur';
      /* Design B : tuile a teinte neutre (le deck du createur n'est pas revele avant la partie) */
      li.classList.add('b-teinte');li.style.setProperty('--tinte',TEINTE_NEUTRE);
      if(mien)li.append(el('span','sl-badge','Ta partie'));
      const V=version(x,mien),inf=el('span','po-inf');inf.append(el('span','sl-dep','Créée '+depuis(x.t)),nbSpec(x));
      const nm=el('b','sl-nm',nom);nm.title=nom;
      li.append(x.u?avatarUid(nom,x.u,x.a):x.a?avatarDe(nom,x.a):avatarDe(nom),nm,stats(x),inf,etiquetteV(V.xv,V.vr));
      if(mien)li.append(el('span','sl-att','Partage le lien ou attends un adversaire'));
      else{
        const z=el('div','po-btns'),b=el('button','btn',V.vd?'Version différente':'Rejoindre');b.type='button';b.disabled=!!r||occupe||V.vd;
        b.onclick=()=>{if(!compteCo()){msgInvite();return}choisirDeck(()=>{salonPublic=false;createur=false;annonceVue='';entre(x.code)})};
        z.append(b,boutonObserver(x,V.vd));li.append(z);
      }
      g.append(li);
    });
    u.append(g);
  }
  if(pleins.length){
    titre('Salon complet, à observer',pleins.length);
    const g=el('ul','sl-liste po-lignes');
    pleins.forEach(x=>{
      const mien=!!moi&&x.u===moi,li=el('li','po-ligne b-teinte'+(mien?' sl-mien':'')),nom=nettoie(typeof x.p==='string'?x.p:'')||'Joueur',nq=nettoie(typeof x.q==='string'?x.q:'')||'Joueur';
      li.style.setProperty('--tinte',TEINTE_NEUTRE);
      const V=version(x,mien),duo=el('div','po-duo'),j=(n,a)=>{const s=el('span','po-j');s.append(a,el('b','',n));return s};
      duo.append(j(nom,x.u?avatarUid(nom,x.u,x.a):avatarDe(nom,x.a)),el('span','po-vs','VS'),j(nq,avatarUid(nq,x.w)));
      const inf=el('span','po-inf');inf.append(nbSpec(x),el('span','sl-dep','Créée '+depuis(x.t)));
      li.append(duo,inf);if(mien)li.append(el('span','sl-badge po-badge','Ta partie'));else li.append(boutonObserver(x,V.vd));
      g.append(li);
    });
    u.append(g);
  }
}
function tauxCourt(s){return s&&s.n?Math.round(100*s.v/s.n)+' % de victoires - '+s.n+' partie'+(s.n>1?'s':''):s===false?'…':'Aucune partie jouée'}
function colTaux(z,s){if(!s||!s.n)return;const p=100*s.v/s.n;z.style.color=p>=55?'#6fd08c':p>=45?'var(--or)':'#ef7a6c'}
setInterval(()=>{if(!$('jouer').hidden&&!r)peintListe()},30000);
function estPret(p){return p.sameTab?jePret:p.presence.pret===true}
function texteCompte(){const n=compteFin-Date.now();return n>0?'La partie démarre dans '+Math.ceil(n/1000)+' s':'La partie démarre'}
function armeCompte(){if(compteFin)return;compteFin=Date.now()+3000;compteT=setInterval(ticCompte,100)}
function stopCompte(){clearInterval(compteT);compteT=0;compteFin=0;const z=$('slCompte');if(z){z.hidden=true;z.textContent='';z.dataset.n=''}}
function grandCompte(){
  const z=$('slCompte'),n=Math.max(1,Math.ceil((compteFin-Date.now())/1000));
  if(z.dataset.n===String(n))return;
  z.dataset.n=String(n);z.textContent='';z.append(el('b','',String(n)));z.hidden=false;
}
function ticCompte(){
  $('attente').textContent=texteCompte();grandCompte();
  if(Date.now()<compteFin)return;
  clearInterval(compteT);compteT=0;
  const l=r?ordre(r.peers()):[];
  if(!partie&&l[0]&&l[0].sameTab)pub({graine:nouvelleGraine()}); /* le premier arrive fixe la graine */
}
$('copieCode').onclick=e=>{
  const b=e.currentTarget;
  copie($('codeSalon').textContent,b,'Copier le code',()=>{const g=getSelection(),x=document.createRange();x.selectNodeContents($('codeSalon'));g.removeAllRanges();g.addRange(x)});
};
/* Lien d'invitation direct : https://les-golems.github.io/?salon=CODE (ou /essai/?salon=CODE). */
function lienSalon(){return 'https://les-golems.github.io/'+(ESSAI?'essai/':'')+'?salon='+code}
$('copieLien').onclick=e=>{
  const b=e.currentTarget,t=lienSalon();
  copie(t,b,'Copier le lien',null);
};
/* Ouverture par un lien ?salon=CODE : parametre lu puis retire de l'adresse, suivi apres connexion. */
let invit=(()=>{try{const u=new URL(location.href);if(!u.searchParams.has('salon'))return '';
  const c=(u.searchParams.get('salon')||'').trim().toLowerCase();u.searchParams.delete('salon');
  history.replaceState(history.state,'',u.pathname+u.search+u.hash);return /^[a-z0-9]{3,8}$/.test(c)?c:'!'}catch(e){return ''}})();
/* Ouverture par un lien ?deck=CODE (partage de deck) : parametre lu puis retire, vue du deck ouverte au demarrage, sans compte. */
const deckLien=(()=>{try{const u=new URL(location.href);if(!u.searchParams.has('deck'))return null;
  const c=u.searchParams.get('deck')||'';u.searchParams.delete('deck');
  history.replaceState(history.state,'',u.pathname+u.search+u.hash);return c}catch(e){return null}})();
/* Compte connu (salon pret ou indisponible) : avant, Importer et Jouer de la vue du deck restent grises. */
async function suitInvit(){
  if(!invit||!room)return;
  onglet('jouer');
  if(invit==='!'){invit='';$('erreurJeu').textContent="Lien d'invitation invalide.";return}
  if(!compteCo()){
    const z=$('erreurJeu'),b=el('button','modif','Se connecter');z.textContent='Connecte-toi pour rejoindre le salon '+invit.toUpperCase()+'. ';
    b.type='button';b.style.marginLeft='6px';b.onclick=ouvrePseudo;z.append(b);
    if($('popPseudo').hidden)ouvrePseudo();return;
  }
  const c=invit;invit='';
  if(r||partie)return;
  const C=c.toUpperCase();let j=null,eng=null;
  try{j=await room.lit('salons/'+c+'/joueurs');eng=await room.lit('salons/'+c+'/engages')}catch(e){}
  const moi=room.compte.uid(),n=j?Object.keys(j).length:0;
  if(!n){$('erreurJeu').textContent='Salon '+C+" introuvable : la partie est terminée ou son créateur est parti.";return}
  if(!(j&&j[moi])&&(eng&&!eng[moi]||n>=MAX)){$('erreurJeu').textContent='Le salon '+C+' est complet.';return}
  $('erreurJeu').textContent='';
  choisirDeck(()=>{createur=false;salonPublic=false;annonceVue='';entre(c)});
}
$('pret').onclick=()=>{
  jePret=!jePret;
  if(jePret){deckPret=deckChoisi()}
  pub({pret:jePret||null,deck:jePret&&deckPret.texte||null});majChoixDeck();majSalon();
};
async function sortie(msg,avant){
  let spec=false;
  if(window.SPEC){spec=SPEC.estSpectateur();if(spec&&window.SPEC_UI&&SPEC_UI.quitterVuePartie)try{SPEC_UI.quitterVuePartie()}catch(e){}SPEC.sortir().catch(()=>{})}
  const a=r;r=null;code='';finPartie();annonceVue='';createur=false;peintListe();
  $('salon').hidden=true;$('accueil').hidden=false;$('erreurJeu').textContent=msg||'';
  if(spec)onglet('jouer'); /* spectateur : retour sur l'onglet Jouer, pas sur le dernier onglet memorise */
  if(a)try{if(avant)await avant;await a.leave()}catch(e){}
  if(room)room.presence({salon:null}).catch(()=>{});
  majEtat();majReprise();placeChat();
}
/* Chat du salon et de la partie en ligne : 200 caracteres, 1 message par seconde au plus. */
const chatBox=(()=>{
  const c=el('div','chat'),h=el('div','chat-tete'),tt=el('span','','Chat'),nb=el('span','chat-nb'),x=el('button','','×');
  x.type='button';x.setAttribute('aria-label','Replier le chat');tt.append(nb);h.append(tt,x);
  const ul=el('ul','chat-liste'),f=document.createElement('form'),i=document.createElement('input'),b=el('button','btn','Envoyer'),inf=el('div','chat-info');
  ul.setAttribute('aria-live','polite');i.maxLength=200;i.placeholder=matchMedia('(max-width:520px)').matches?'Message':'Message (200 caractères max)';i.setAttribute('aria-label','Message');i.autocomplete='off';b.type='submit';
  f.append(i,b);c.append(h,ul,inf,f);
  h.onclick=e=>{if(!c.classList.contains('flottant'))return;chatOuvert=c.classList.contains('replie');c.classList.toggle('replie',!chatOuvert);if(chatOuvert){chatVu=r&&r.chat?r.chat().length:0;nb.textContent='';ul.scrollTop=ul.scrollHeight;i.focus()}{const p=document.querySelector('#partie .p-chat-nb');if(p)p.textContent=nb.textContent}};
  f.onsubmit=async e=>{
    e.preventDefault();const m=i.value.replace(/\s+/g,' ').trim().slice(0,200);if(!m||!r||!r.dit)return;
    const t=Date.now();if(t-chatDernier<1000){inf.textContent='Un message par seconde au plus.';return}
    chatDernier=t;inf.textContent='';i.value='';
    try{await r.dit(m)}catch(er){inf.textContent="Message non envoyé.";i.value=m}
  };
  return {c,ul,nb,inf};
})();
/* Reactions rapides : messages de chat predefinis (memes regles Firebase), bulle breve pres du pseudo de l'expediteur. */
const REACTIONS=['Bien joué','Oups','GG','Bien vu','Merci'];let reacDernier=0,reacVus=new Set(),reacT=0;
function reactions(){
  const z=el('div','p-reac');z.setAttribute('aria-label','Réactions rapides');
  const maj=()=>{const att=Date.now()-reacDernier<3000;z.querySelectorAll('button').forEach(b=>b.disabled=att);if(att){clearTimeout(reacT);reacT=setTimeout(()=>document.querySelectorAll('.p-reac button').forEach(b=>b.disabled=false),3000-(Date.now()-reacDernier))}};
  REACTIONS.forEach(m=>{const b=el('button','',m);b.type='button';b.onclick=async()=>{
    if(!r||!r.dit||Date.now()-reacDernier<3000)return;reacDernier=Date.now();document.querySelectorAll('.p-reac button').forEach(x=>x.disabled=true);maj();
    try{await r.dit(m)}catch(e){chatBox.inf.textContent='Réaction non envoyée.'}};z.append(b)});
  maj();return z;
}
function bulleReac(x,moi){
  const c=$('partie').querySelector('.p-camp.'+(x.a===moi?'toi':'lui')+' b');if(!c||$('partie').hidden)return;
  const q=c.getBoundingClientRect(),b=el('div','bulle-reac',x.m);b.setAttribute('role','status');document.body.append(b);
  const w=b.offsetWidth;b.style.left=Math.max(8,Math.min(innerWidth-w-8,q.left))+'px';b.style.top=Math.max(8,q.top-b.offsetHeight-6)+'px';
  setTimeout(()=>b.remove(),2700);
}
function peintChat(l){
  {const moi=room&&room.compte&&room.compte.uid?room.compte.uid():'',neuf=chatVu>=0;
    l.forEach(x=>{if(reacVus.has(x.id))return;reacVus.add(x.id);if(neuf&&partie&&!partie.local&&REACTIONS.includes(x.m))bulleReac(x,moi)})}
  if(chatVu<0)chatVu=l.length;const {ul,nb}=chatBox,bas=ul.scrollHeight-ul.scrollTop-ul.clientHeight<30;ul.textContent='';
  if(!l.length)ul.append(el('li','chat-vide','Aucun message pour le moment.'));
  const moi=room&&room.compte&&room.compte.uid?room.compte.uid():'';
  l.slice(-100).forEach(x=>{const li=el('li');const d=new Date(+x.t||Date.now());
    const h=el('time','',String(d.getHours()).padStart(2,'0')+':'+String(d.getMinutes()).padStart(2,'0'));
    li.append(h,nomChat(x),document.createTextNode(x.m));ul.append(li)});
  const fl=chatBox.c.classList.contains('flottant'),rep=chatBox.c.classList.contains('replie');
  if(fl&&rep){const n=l.slice(chatVu).filter(x=>x.a!==moi).length;nb.textContent=n>0?String(n):''}else{chatVu=l.length;nb.textContent=''}
  {const p=document.querySelector('#partie .p-chat-nb');if(p)p.textContent=nb.textContent}
  if(bas||!rep)ul.scrollTop=ul.scrollHeight;
}
/* 0.4 : couleur du pseudo selon le role dans le salon (places de spectateur.js) : createur dore, adversaire bleu, spectateur gris clair avec un oeil.
   Role au survol. Auteur parti du salon : couleur neutre, sans role. Sert aussi au chat de la vue spectateur (diffusion.js). */
const ROLES_CHAT={createur:'Créateur',adversaire:'Adversaire',spectateur:'Spectateur'};
function roleChat(u){
  if(!u)return '';
  const E=window.SPEC&&SPEC.etatSalon?SPEC.etatSalon():null;
  if(E&&E.actif){if(E.j1&&E.j1.uid===u)return 'createur';if(E.adv&&E.adv.uid===u)return 'adversaire';return (E.spectateurs||[]).some(x=>x.uid===u)?'spectateur':''}
  const moi=room&&room.compte&&room.compte.uid?room.compte.uid():'';
  if(!r||!moi)return '';
  if(u===moi)return createur?'createur':'adversaire';
  return r.peers&&r.peers().some(p=>p.peer===u)?(createur?'adversaire':'createur'):'';
}
const SVG_OEIL='<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 5C6.5 5 2.6 9.2 1.5 12c1.1 2.8 5 7 10.5 7s9.4-4.2 10.5-7C21.4 9.2 17.5 5 12 5zm0 11.2a4.2 4.2 0 1 1 0-8.4 4.2 4.2 0 0 1 0 8.4zm0-2.2a2 2 0 1 0 0-4 2 2 0 0 0 0 4z"/></svg>';
function nomChat(x){
  const ro=roleChat(x.a),b=el('b',ro?'chat-'+ro:'chat-parti');
  if(ro==='spectateur'){const o=el('span','chat-oeil');o.innerHTML=SVG_OEIL;b.append(o)}
  b.append((typeof x.p==='string'?x.p:'Joueur')+' :');if(ro)b.title=ROLES_CHAT[ro];return b;
}
window.golemsNomChat=nomChat;
function placeChat(){
  const c=chatBox.c,enLigne=!!r&&!!partie&&!partie.local,salon=!!r&&!partie,spec=!r&&!!(window.SPEC&&SPEC.estSpectateur());
  if(salon){c.classList.remove('flottant','replie');$('chatPlace').append(c)}
  else if(enLigne){if(!c.classList.contains('flottant')){c.classList.add('flottant');c.classList.toggle('replie',!chatOuvert);document.body.append(c)}}
  else if(spec){if(window.SPEC.chat)peintChat(SPEC.chat())} /* spectateur : boite gardee, placee par spectateur-ui.js */
  else{c.remove();chatOuvert=false;chatBox.ul.textContent='';chatBox.nb.textContent='';chatBox.inf.textContent=''}
  if(c.isConnected&&r&&r.chat)peintChat(r.chat());
}
function msgInvite(){
  const z=$('erreurJeu'),b=el('button','modif','Se connecter');z.textContent='Crée un compte ou connecte-toi pour jouer en ligne. ';
  b.type='button';b.style.marginLeft='6px';b.onclick=ouvrePseudo;z.append(b);
}
/* Mode spectateur (spectateur.js) : quitter joueurs sans revenir a l'accueil, ou y entrer comme adversaire. */
window.__golemsSpecQuitte=async()=>{const a=r;r=null;finPartie();if(a)try{await a.leave()}catch(e){}};
/* 0.4 : le createur est parti avant la partie, je deviens createur (spectateur.js) ; salon public = annonce republiee par majAnnonce. */
window.__golemsSpecPromu=o=>{createur=true;salonPublic=!!(o&&o.public);notePublic(code,salonPublic);annonceVue='';nbSalon=1;if(r)majSalon()};
window.__golemsSpecRejoint=c=>{if(window.SPEC_UI&&SPEC_UI.quitterVuePartie)try{SPEC_UI.quitterVuePartie()}catch(e){}$('partie').hidden=true;$('jouer').classList.remove('enJeu');return entre(c)};
/* Spectateur : la vue de partie s'ouvre comme au lancement d'une partie des qu'une partie tourne dans le salon. */
let specVue=false;function specBranche(){if(specVue||!window.SPEC)return;specVue=true;SPEC.onChange(()=>{if(!SPEC.estSpectateur()||!SPEC.etatPartie())return;if($('partie').hidden||!$('jouer').classList.contains('enJeu')){$('salon').hidden=true;$('accueil').hidden=true;$('partie').hidden=false;$('jouer').classList.add('enJeu')}})}
async function entre(c,opt){
  if(!compteCo()){occupe=false;majEtat();msgInvite();return}
  occupe=true;majEtat();$('erreurJeu').textContent='';jePret=false;nbSalon=0;
  const sv=chargeSalon(c);
  try{
    if(window.SPEC&&!specAnn){specAnn=true;SPEC.onChange(()=>{if(r)majAnnonce(ordre(r.peers()))})} /* spectateurs comptes dans l'annonce */
    if(window.SPEC){const rl=await SPEC.entrer(c,{createur,observer:!!(opt&&opt.observer)});if(rl==='spec'){specBranche();r=null;code=c;$('codeSalon').textContent=c.toUpperCase();$('accueil').hidden=true;$('salon').hidden=false;occupe=false;majEtat();return}}
    const s=await room.join(c);
    r=s;code=c;entree=Date.now();
    sid=sv?sv.sid:nouveauSid();arrivee=sv?sv.arrivee:entree;
    $('codeSalon').textContent=c.toUpperCase();
    if(sv)lancer(sv.graine,sv.place,sv.adv,sv);
    s.onPeers(()=>{if(r===s)majSalon()},()=>{if(r===s)sortie('Le salon a été perdu.')});
    chatVu=-1;if(s.onChat)s.onChat(l=>{if(r===s)peintChat(l)});
    const pres={pseudo:pseudo,arrivee:arrivee,sid:sid,pret:null};if(maV)pres.v=maV;
    if(sv){pres.deck=Array.isArray(sv.decks)&&sv.decks[sv.place]||null;pres.jg=sv.graine;pres.j=M.ecritJournal(sv.mien);pres.adv=sv.adv;if(sv.place===0)pres.graine=sv.graine;if(sv.veut)pres.veut=sv.graine}
    await s.presence(pres);
    await room.presence({pseudo:pseudo,salon:sv?null:c,quitte:null});
    if(!partie){$('accueil').hidden=true;$('salon').hidden=false}
    majSalon();
    setTimeout(()=>{if(r===s)majSalon()},1700);
  }catch(e){
    r=null;code='';finPartie();
    if(e&&e.code==='compte')msgInvite();else $('erreurJeu').textContent=e&&e.code==='complet'?'Ce salon est complet.':e&&e.code==='compte'?'Connecte-toi pour jouer en ligne.':e&&e.code==='limit_reached'?'Trop de salons ouverts, réessaie plus tard.':"Impossible d'entrer dans ce salon.";
    majReprise();
  }
  occupe=false;majEtat();
}
