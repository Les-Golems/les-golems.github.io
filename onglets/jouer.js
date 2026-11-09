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
function indisponible(){room=null;$('absent').hidden=false;$('etat').hidden=true;$('creer').disabled=$('creerClasse').disabled=$('rejoindre').disabled=true}
function majEtat(){
  if(!room)return;
  const co=room.connected(),n=personnes(room.peers()).length;
  $('etat').classList.toggle('ok',co);
  const cc=compteCo();
  $('etatTexte').textContent=!co?'Connexion : serveur en cours de connexion. Patiente un instant.':!cc?'Connexion : jeu en ligne réservé aux comptes. Connecte-toi pour jouer en ligne.':n<2?'1 joueur connecté':n+' joueurs connectés';
  $('creer').disabled=$('creerClasse').disabled=$('rejoindre').disabled=!co||occupe||!cc;
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
/* Adversaire arrive dans ma partie en attente, onglet cache : le titre alterne « Adversaire arrivé ! - Les Golems » et le titre normal
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
  if(l.findIndex(p=>p.sameTab)>=MAX&&Date.now()-entree>1500){sortie('Salon impossible : salon complet. Rejoins un autre salon.');return}
  /* Versions differentes avant la partie : Pret retire et bloque, etiquette rouge sur le siege le plus ancien. */
  {const d=l.slice(0,MAX),o=d.find(p=>!p.sameTab);vxEcart=!partie&&!!maV&&d.length>=MAX&&!!o&&!vEg(vDe(o),maV);vxRouge=vxEcart?(vAncienne(vDe(o))?o.peer:'moi'):'';
   if(vxEcart&&jePret){jePret=false;pub({pret:null,deck:null});majChoixDeck()}
   if(vxRouge==='moi')vJeSuisAncien()}
  const u=$('joueurs'),specUI=!!(window.SPEC&&window.SPEC_UI&&SPEC.etatSalon().actif&&SPEC.estSpectateur()); /* spectateur : sieges peints par spectateur-ui.js ; joueur assis : sieges d'ici (maquette 23, refonte2) */
  if(!specUI)u.textContent='';
  const sieges=l.slice(0,MAX).map(siegeSalon);
  while(sieges.length<MAX){const v=el('div','sl-j sl-libre'),a=el('div','avatar','?'),t=el('div','cd-tuile');
    t.append(tuileDk({nom:'Aucun deck',masque:true,sous:'Partage le code ou le lien'}));
    const e=etiquetteV(maV,false);e.classList.add('sl-vide');
    v.append(a,(()=>{const n=el('div','sl-nom'),w=el('span','sl-pw');w.append(el('span','sl-pn','Place libre'));n.append(w);return n})(),el('span','sl-etat',"En attente d'un adversaire"),e,t);sieges.push(v)}
  if(l.length)sieges[0].append(el('span','sl-role','Créateur'));
  /* charte : chacun se voit toujours a gauche (l'etiquette Createur reste sur le siege du createur) */
  if(!specUI){const g=l.length>1&&l[1].sameTab?[sieges[1],sieges[0]]:sieges;u.append(g[0],el('div','sl-vs','VS'),g[1]);calePseudos()}
  majSpecs();
  const adv=l.slice(0,MAX).find(p=>!p.sameTab);majFace(adv?nomDe(adv):'');
  if(!partie&&l.some(p=>!p.sameTab&&Number.isInteger(p.presence.jg)&&typeof p.presence.adv==='string'&&p.presence.adv!==sid&&p.presence.sid!==sid)&&Date.now()-entree>1500){sortie('Salon impossible : salon complet. Rejoins un autre salon.');return}
  const c=l.length>=MAX;
  const duo=l.slice(0,MAX),libre=!partie&&c&&!vxEcart&&!duo.some(p=>Number.isInteger(p.presence.jg));
  if(libre&&duo.every(estPret))armeCompte();else stopCompte();
  if(!partie&&!c){const m=l.find(p=>p.sameTab);if(m&&Number.isInteger(m.presence.graine))pub({graine:null})} /* graine orpheline : l'adversaire est parti juste apres le compte */
  /* Pret toujours visible sous les deux joueurs : grise tant qu'on est seul, ou si les versions different. */
  $('pret').hidden=!!partie;$('pret').disabled=vxEcart||!(libre||jePret);
  $('pret').textContent=vxEcart?'Versions différentes':jePret?'Pas prêt':!c?'En attente d\'un adversaire':'Prêt';$('pret').classList.toggle('sc-secondaire',jePret);
  $('slDeck').hidden=!!partie;$('slDeck').disabled=jePret;$('slDeck').title=jePret?'Retire ton Prêt pour changer de deck':'';
  majAnnonce(l);
  $('attente').textContent=vxEcart?'Salon impossible : ton adversaire n\'a pas la même version du site. Recharge la page.':compteFin?texteCompte():!c?notice||'':jePret?'Salon : ton adversaire n\'est pas prêt. Patiente un instant.':duo.some(estPret)?'Salon : ton adversaire est prêt. Clique sur Prêt.':'Salon : deux joueurs présents. Clique sur Prêt.';
  $('attente').classList.toggle('pret',c&&!vxEcart);
  majPartie();placeChat();majBandeauRobot();
}
/* Siege d'un joueur : avatar, pseudo, etat, deck en tuile (comme l'onglet Decks) */
function infoDeck(t){
  if(typeof t!=='string'||!t)return {nom:'Deck par défaut',els:[...new Set(M.TYPES.flatMap(k=>M.CARTES[k].el))],nb:M.TAILLE_DECK};
  const o=M.lisDeck(t);let nb=0;if(o)for(const k in o)nb+=+o[k]||0;
  return {nom:'',els:elsTexte(t),nb:nb||M.TAILLE_DECK};
}
/* 0.6 (charte, salon) : rang a cote du pseudo. Embleme a 20 px a gauche du pseudo (centre sur l'avatar, coupe avant le bord du deck),
   Elo sous l'embleme sur la ligne du statut ; salon amical : embleme seul. Placement : embleme de placement, sans Elo.
   Mon profil : profilClasse() ; adversaire : classe/joueurs/<uid> lu par room.compte.classeDe. */
const classeCache={};
function profilSiege(p){
  if(p.sameTab)return compteCo()?profilClasse():null;
  if(p.peer in classeCache)return classeCache[p.peer];
  classeCache[p.peer]=null;
  if(room&&room.compte&&typeof room.compte.classeDe==='function')room.compte.classeDe(p.peer).then(j=>{if(j&&Number.isFinite(j.elo)){classeCache[p.peer]=j;if(r)majSalon();try{if(window.SPEC&&window.SPEC_UI&&SPEC.etatSalon().actif)SPEC_UI.peindreSalon(SPEC.etatSalon())}catch(e){}}else setTimeout(()=>{if(classeCache[p.peer]===null)delete classeCache[p.peer]},3000)}).catch(()=>{}); /* profil pas encore cree : nouvel essai 3 s plus tard */
  return null;
}
function nomSiege(p,nom,moi){
  const n=el('div','sl-nom'),w=el('span','sl-pw'),pn=el('span','sl-pn',nom);pn.title=nom;w.append(pn);n.append(w);
  if(moi)w.append(el('em','','toi'));
  const j=window.GolemsClasse?profilSiege(p):null;
  if(j){const A=GolemsClasse.affichage(j),R=A.placement?{id:'placement',nom:'Placement'}:A.rang,im=el('img','sl-emb');
    im.src=imgRang(R.id);im.alt=R.nom;im.title=A.placement?A.texte:R.nom;im.width=im.height=48;w.append(im);
    if(salonClasse&&!A.placement)w.append(el('span','sl-elo',String(Math.round(A.elo))))}
  return n;
}
/* Pseudo d'un siege : centre sur l'avatar tant qu'il tient ; trop long, le groupe embleme + pseudo + « toi » glisse et le pseudo
   n'est coupe qu'au bord de l'encadre du deck (charte, Rang et joueur). Embleme 48 px + 20 px a gauche, « toi » + 6 px a droite. */
function calePseudos(){
  document.querySelectorAll('#joueurs .sl-j .sl-pw').forEach(w=>{
    const W=w.parentNode.clientWidth;if(!W)return;
    const t=w.querySelector(':scope>em'),Rt=t?t.offsetWidth+6:0,Le=w.querySelector(':scope>.sl-emb')?68:0;
    w.style.transform='';w.style.maxWidth=Math.max(40,W-Le-Rt)+'px';
    const m=(W-w.offsetWidth)/2,d=Math.max(0,Le-m)-Math.max(0,Rt-m);if(d)w.style.transform='translateX('+Math.round(d)+'px)';
  });
}
if(window.ResizeObserver&&$('joueurs'))new ResizeObserver(()=>calePseudos()).observe($('joueurs'));if(document.fonts)document.fonts.ready.then(calePseudos); /* largeur changee, salon affiche, police chargee */
/* Ligne de contexte de la fenetre de deck dans le salon. */
const ctxSalon=()=>(salonClasse?'Partie classée':'Partie amicale')+' - salon '+String(code||'').toUpperCase();
function siegeSalon(p){
  const nom=nomDe(p),moi=p.sameTab,pr=estPret(p),s=el('div','sl-j'+(pr?' pret':'')+(moi?' sl-moi':''));
  s.append(moi?avatarDe(nom,monAvatar()):avatarUid(nom,p.peer),nomSiege(p,nom,moi),el('span','sl-etat',pr?'Prêt':'En attente'),etiquetteV(vDe(p),vxRouge===(moi?'moi':p.peer)));
  const t=el('div','cd-tuile');
  /* Tuile de deck unique (tuileDk de l'onglet Decks). Mon deck : nom, elements, version (rouge si une carte a change depuis). */
  if(moi){const c=jePret&&deckPret?deckPret:deckChoisi(),i=infoDeck(c.texte),d=c.id?lesDecks().find(x=>x.id===c.id):null;
    t.append(tuileDk({nom:c.id?c.nom:'Deck par défaut',els:i.els,nb:i.nb,v:d?d.v||M.VERSION:M.VERSION,cartes:d?d.cartes:null}))}
  /* Deck de l'adversaire masque avant la partie : meme tuile, neutre (« Deck choisi », ni nom, ni element, ni couleur), nombre de cartes,
     pastille « ? » ; « Choix en cours » tant qu'il n'est pas pret. Il se decouvre en jeu, carte par carte. */
  else t.append(tuileDk(pr?{nom:'Deck choisi',masque:true,nb:infoDeck(p.presence.deck).nb}:{nom:'Choix en cours',masque:true}));
  s.append(t,tauxSiege(p));
  if(moi&&!partie){const b=el('button','btn sec','Changer de deck');b.type='button';b.disabled=jePret;b.title=jePret?'Retire ton Prêt pour changer de deck':'';b.onclick=()=>choisirDeck(()=>majSalon(),'Choisir ce deck',ctxSalon());s.append(b)}
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
  if(o&&salonClasse){o.cl=true;const j=classeMoi;if(j&&Number.isFinite(j.elo)&&!GolemsClasse.enPlacement(j))o.el=j.elo} /* Elo du createur, placement fini seulement (regle annonces/el) */
  if(o&&adv){o.w=adv.peer;o.q=nomDe(adv)}
  const cle=o?JSON.stringify(o):'';
  if(cle===annonceVue)return;annonceVue=cle;
  /* 0.6.1 : annonce classee refusee (Elo du cache perime) : Elo relu, puis nouvel essai si il a change. */
  const relu=()=>{if(!o||!Number.isFinite(o.el)||!compteCo())return;room.lit('classe/joueurs/'+room.compte.uid()).then(j=>{if(j&&Number.isFinite(j.elo)&&j.elo!==o.el&&r){classeMoi=j;annonceVue='';majAnnonce(ordre(r.peers()))}}).catch(()=>{})};
  r.annonce(o).then(ok=>{if(ok===false&&annonceVue===cle){annonceVue='';relu()}},e=>{console.warn(e);annonceVue='';relu()});
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
/* Parties ouvertes (variante C) : places libres en cartes (Rejoindre / Observer), puis salons complets en lignes (Observer). */
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
  if(invit==='!'){invit='';alerte('erreurJeu',"Salon impossible : lien d'invitation invalide. Demande un nouveau lien.");return}
  if(!compteCo()){
    alerte('erreurJeu','Connexion requise : le salon '+invit.toUpperCase()+' demande un compte. Connecte-toi pour le rejoindre.',{bouton:{texte:'Se connecter',action:ouvrePseudo}});
    if($('popPseudo').hidden)ouvrePseudo();return;
  }
  const c=invit;invit='';
  if(r||partie)return;
  const C=c.toUpperCase();let j=null,eng=null;
  try{j=await room.lit('salons/'+c+'/joueurs');eng=await room.lit('salons/'+c+'/engages')}catch(e){}
  const moi=room.compte.uid(),n=j?Object.keys(j).length:0;
  if(!n){alerte('erreurJeu','Salon impossible : salon '+C+' fermé. Crée ton salon ou rejoins-en un autre.');return}
  if(!(j&&j[moi])&&(eng&&!eng[moi]||n>=MAX)){alerte('erreurJeu','Salon impossible : salon '+C+' complet. Rejoins un autre salon.');return}
  $('erreurJeu').textContent='';
  choisirDeck(()=>{createur=false;salonPublic=false;annonceVue='';entre(c)},'Rejoindre','Salon '+C);
}
$('pret').onclick=()=>{
  jePret=!jePret;
  if(jePret){deckPret=deckChoisi()}
  pub({pret:jePret||null,deck:jePret&&deckPret.texte||null});majChoixDeck();majSalon();
};
async function sortie(msg,avant){
  let spec=false;
  if(window.SPEC){spec=SPEC.estSpectateur();if(spec&&window.SPEC_UI&&SPEC_UI.quitterVuePartie)try{SPEC_UI.quitterVuePartie()}catch(e){}SPEC.sortir().catch(()=>{})}
  const a=r;r=null;code='';finPartie();annonceVue='';createur=false;salonClasse=false;majBandeauRobot();peintListe();
  $('salon').hidden=true;$('accueil').hidden=false;alerte('erreurJeu',msg||'');
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
    const t=Date.now();if(t-chatDernier<1000){alerte(inf,'Chat : un message par seconde au plus. Patiente un instant.');return}
    chatDernier=t;inf.textContent='';i.value='';
    try{await r.dit(m)}catch(er){alerte(inf,'Chat : message non envoyé. Réessaie.');i.value=m}
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
    try{await r.dit(m)}catch(e){alerte(chatBox.inf,'Chat : réaction non envoyée. Réessaie.')}};z.append(b)});
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
  /* J03 : chacun se voit en bleu, l'adversaire en var(--adverse), spectateurs gris ; un spectateur voit le createur en bleu, l'adversaire en orange. */
  const ro=roleChat(x.a),moi=room&&room.compte&&room.compte.uid?room.compte.uid():'',vue=!!(window.SPEC&&SPEC.estSpectateur&&SPEC.estSpectateur());
  const b=el('b',!ro?'chat-parti':ro==='spectateur'?'chat-spectateur':(vue?ro==='createur':x.a===moi)?'chat-moi':'chat-adv');
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
  alerte('erreurJeu','Connexion requise : le jeu en ligne demande un compte. Crée un compte ou connecte-toi.',{bouton:{texte:'Se connecter',action:ouvrePseudo}});
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
    if(window.SPEC&&!specAnn){specAnn=true;SPEC.onChange(()=>{if(r)majAnnonce(ordre(r.peers()));if(!$('salon').hidden)majSpecs()})} /* 0.6 : compteur de spectateurs a jour (SPEC n'existe pas encore au chargement de ce fichier) */ /* spectateurs comptes dans l'annonce */
    if(window.SPEC){const rl=await SPEC.entrer(c,{createur,observer:!!(opt&&opt.observer)});if(rl==='spec'){specBranche();r=null;code=c;$('codeSalon').textContent=c.toUpperCase();$('accueil').hidden=true;$('salon').hidden=false;occupe=false;majEtat();return}}
    const s=await room.join(c);
    r=s;code=c;entree=Date.now();
    /* 0.6 classe : le createur marque le salon (cl, cree) ; les autres lisent cl (entree par code ou reprise) ; profil classe pret avant la partie. */
    if(s.marqueClasse&&!(createur&&salonClasse&&!sv))salonClasse=await s.estClasse();
    if(salonClasse)await chargeClasse();
    sid=sv?sv.sid:nouveauSid();arrivee=sv?sv.arrivee:entree;
    $('codeSalon').textContent=c.toUpperCase();
    if(sv)lancer(sv.graine,sv.place,sv.adv,sv);
    s.onPeers(()=>{if(r===s)majSalon()},()=>{if(r===s)sortie('Salon impossible : connexion au salon coupée. Rejoins-le avec son code.')});
    chatVu=-1;if(s.onChat)s.onChat(l=>{if(r===s)peintChat(l)});
    const pres={pseudo:pseudo,arrivee:arrivee,sid:sid,pret:null};if(maV)pres.v=maV;
    if(sv){pres.deck=Array.isArray(sv.decks)&&sv.decks[sv.place]||null;pres.jg=sv.graine;pres.j=M.ecritJournal(sv.mien);pres.adv=sv.adv;if(sv.place===0)pres.graine=sv.graine;if(sv.veut)pres.veut=sv.graine}
    await s.presence(pres);
    /* le createur marque cl et cree apres l'ecriture de joueurs/<uid> (la regle exige sa presence) */
    if(s.marqueClasse&&createur&&salonClasse&&!sv)await s.marqueClasse().catch(e=>console.warn('salon classe',e));
    else if(s.marqueHote&&createur&&!sv)await s.marqueHote(); /* 0.6.1 : tout salon a son hote (seul a pouvoir le rendre classe) */
    await room.presence({pseudo:pseudo,salon:sv?null:c,quitte:null});
    if(!partie){$('accueil').hidden=true;$('salon').hidden=false}
    majSalon();
    setTimeout(()=>{if(r===s)majSalon()},1700);
  }catch(e){
    r=null;code='';finPartie();
    if(e&&e.code==='compte')msgInvite();else alerte('erreurJeu',e&&e.code==='complet'?'Salon impossible : salon complet. Rejoins un autre salon.':e&&e.code==='compte'?'Connexion requise : le jeu en ligne demande un compte. Crée un compte ou connecte-toi.':e&&e.code==='limit_reached'?'Salon impossible : trop de salons ouverts. Réessaie plus tard.':'Salon impossible : entrée refusée par le serveur. Réessaie.');
    majReprise();
  }
  occupe=false;majEtat();
}

/* ===================== 0.6 : onglet Jouer refait (maquettes 18 v7/v9, 26, 36 variante B ; audit 34) ===================== */
/* Selecteur « Parties | Historique » en tete de Jouer : l'Historique (onglets/historique.js) s'ouvre par onglet('historique'),
   le selecteur passe en tete de sa section et l'onglet Jouer reste allume (le bouton d'onglet Historique reste masque). */
function jVue(v){
  const s=$('jVue');if(!s)return;
  s.querySelectorAll('button').forEach(b=>b.setAttribute('aria-pressed',b.dataset.v===v?'true':'false'));
  if(v==='historique'){if($('historique').hidden)onglet('historique');if(s.parentNode!==$('historique'))$('historique').prepend(s);$('t-jouer').setAttribute('aria-selected','true')}
  else{const j=$('jouer');if(s.parentNode!==j)j.insertBefore(s,j.firstElementChild);if(j.hidden)onglet('jouer')}
}
$('jVue').querySelectorAll('button').forEach(b=>b.onclick=()=>jVue(b.dataset.v));
new MutationObserver(()=>{if(!$('historique').hidden&&$('jVue').parentNode!==$('historique'))jVue('historique');else if(!$('jouer').hidden&&$('jVue').parentNode!==$('jouer'))jVue('parties')}).observe(document.body,{attributes:true,attributeFilter:['hidden'],subtree:true});

/* Publique / Privee des tuiles Classee et Amicale (selecteur sc-sel, J14) ; la case cachee salonPublicCase reste lue par creerSalon (commun/raccords.js). */
function selPub(id){const z=$(id),b=[...z.querySelectorAll('button')];b.forEach((x,i)=>x.onclick=()=>{b.forEach((y,k)=>y.setAttribute('aria-pressed',k===i?'true':'false'))});return ()=>b[0].getAttribute('aria-pressed')==='true'}
const pubClasse=selPub('pubClasse'),pubAmicale=selPub('pubAmicale');
let salonClasse=false; /* salon classe en cours (createur, ou joueur entre par une annonce classee) */
$('creer').addEventListener('click',()=>{salonClasse=false;$('salonPublicCase').checked=pubAmicale();choixDeckCtx={lib:'Créer le salon',ctx:'Partie amicale',t:Date.now()}},true);
/* Rejoindre par code (commun/raccords.js) : libelle et contexte de la fenetre de deck. */
$('formCode').addEventListener('submit',()=>{choixDeckCtx={lib:'Rejoindre',ctx:'Salon '+$('champCode').value.trim().toUpperCase(),t:Date.now()}},true);
$('creerClasse').onclick=()=>{if(!compteCo()){msgInvite();return}choisirDeck(()=>{salonClasse=true;$('salonPublicCase').checked=pubClasse();creerSalon()},'Créer le salon','Partie classée')};
/* Le classement de la saison est dans Statistiques (mode Classees). */
$('voirClassement').onclick=()=>onglet('stats');

/* 0.6 : profil classe du joueur, lu dans Firebase (classe/joueurs/<uid>) par le service de commun/classe.js :
   cree s'il manque, remis a la nouvelle saison (instantane d'abord), classement et recompenses tenus a jour.
   classeMoi = derniere copie lue (affichage seulement ; chaque ecriture relit Firebase). */
let classeMoi=null,classeCharge=null,classeChargeU='';
function serviceClasse(){return compteCo()&&room&&room.classeBase&&window.GolemsClasse?GolemsClasse.service(room.classeBase()):null}
function profilClasse(){return classeMoi&&Number.isFinite(classeMoi.elo)?classeMoi:GolemsClasse.nouveauJoueur(0)}
function chargeClasse(){
  const S=serviceClasse();if(!S){classeMoi=null;majRangBandeau();return Promise.resolve(null)}
  const u=room.compte.uid();
  /* un seul chargement a la fois par compte : deux creations simultanees du profil, la seconde est refusee (PERMISSION_DENIED) */
  if(classeCharge&&classeChargeU===u)return classeCharge;classeChargeU=u;
  const fin=()=>{if(classeChargeU===u){classeCharge=null;classeChargeU=''}};
  return classeCharge=S.profil({stats:id=>typeof pfInstantane==='function'?pfInstantane(id):{}}).then(j=>{if(compteCo()&&room.compte.uid()===u){classeMoi=j;majRangBandeau();majTuiles()}return j},
    e=>{console.warn('classe',e);return null}).finally(fin);
}
/* Capsule du bandeau (commun/compte.js, majRangMoi) : embleme + Elo, placement fini seulement ; pendant le placement, rien. */
function majRangBandeau(){
  if(typeof majRangMoi!=='function')return;const j=classeMoi;
  if(!compteCo()||!j||!Number.isFinite(j.elo)||GolemsClasse.enPlacement(j)){majRangMoi(null);return}
  const R=GolemsClasse.rang(j.elo);majRangMoi({img:imgRang(R.id),nom:R.nom,elo:j.elo});
}
/* Parties classees pas encore appliquees au profil (adversaire qui n'a pas encore confirme, coupure) : nouvel essai au chargement. */
const ATTENTE_CL='golems.classeAttente';
function attenteClasse(id,on){const u=compteCo()?room.compte.uid():'';let l=[];try{l=JSON.parse(lire(ATTENTE_CL))||[]}catch(e){}
  l=l.filter(x=>x&&x.id!==id);if(on&&u)l.unshift({id,u});ecrire(ATTENTE_CL,JSON.stringify(l.slice(0,20)))}
async function reessaieClasse(){
  const S=serviceClasse();if(!S){await chargeClasse();return}const u=room.compte.uid();let l=[];try{l=JSON.parse(lire(ATTENTE_CL))||[]}catch(e){}
  for(const x of l.filter(y=>y&&y.u===u))try{if(await S.applique(x.id))attenteClasse(x.id,false)}catch(e){}
  await chargeClasse();
}
function imgRang(id){return imgV('images/rangs/'+id+'.png')}
const pcJ=(v,n)=>n?Math.round(100*v/n):null;
function c3(lib,val,sous,cl){const d=el('div','j-c3'),b=el('b',cl||'',val);b.title=val;d.append(el('i','',lib),b,el('small','',sous));return d}
const txtTaux=t=>t===null?'-':t+' %';
function colore(d,t,n){const b=d.querySelector('b');if(t!==null)b.style.color=couleurTaux.valeur(t,n)}
function partiesDe(f){const l=typeof lesParties==='function'?lesParties():[];return l.filter(x=>{try{return f(typeof modeHisto==='function'?modeHisto(x):'',x)}catch(e){return false}})}
/* Encart Classee : embleme, rang + Elo (barre vers le rang suivant), prochain rang, victoires (couleurTaux, J13). Placement : n sur 5. */
function encartClasse(j){
  const C=GolemsClasse,z=$('encartRang');z.textContent='';
  const A=C.affichage(j),R=A.placement?A.estime:A.rang,i=C.RANGS.indexOf(R),suiv=C.RANGS[i+1];
  const im=el('img','j-emb');im.src=imgRang(A.placement?'placement':R.id);im.alt=R.nom;
  const r=c3('Rang',A.placement?'Placement':R.nom,A.placement?(A.n+' sur '+A.sur+' parties'):'Elo '+Math.round(j.elo),'rg');
  if(!A.placement&&suiv){const bas=Number.isFinite(R.min)?R.min:suiv.min-100,p=Math.max(0,Math.min(100,100*(j.elo-bas)/(suiv.min-bas))),br=el('span','j-barre'),u=el('u');u.style.width=p+'%';br.append(u);r.append(br)}
  const pr=A.placement?c3('Prochain rang','-','après le placement'):suiv?c3('Prochain rang',Math.ceil(suiv.min-j.elo)+' pts','avant '+suiv.nom):c3('Prochain rang','-','rang le plus haut');
  const n=(j.v||0)+(j.d||0),t=pcJ(j.v||0,n),v=c3('Victoires',txtTaux(t),(j.v||0)+' sur '+n+' partie'+(n>1?'s':''));colore(v,t,n);
  z.append(im,r,pr,v);
}
/* Encart Amicale : serie en cours, victoires, rival (adversaire le plus joue). Historique du joueur. */
function encartAmicale(){
  const z=$('encartAmicale');z.textContent='';
  const l=partiesDe(m=>m==='amicale');let serie=0;for(const x of l){if(x.res==='Victoire')serie++;else break}
  const v=l.filter(x=>x.res==='Victoire').length,t=pcJ(v,l.length),o={};
  l.forEach(x=>{const a=String(x.adv||'');if(a){o[a]=o[a]||{n:0,v:0};o[a].n++;if(x.res==='Victoire')o[a].v++}});
  const ri=Object.keys(o).sort((a,b)=>o[b].n-o[a].n)[0];
  const vi=c3('Victoires',txtTaux(t),l.length+' partie'+(l.length>1?'s':''));colore(vi,t,l.length);
  z.append(c3('Série en cours',String(serie),'victoire'+(serie>1?'s':'')+' d\'affilée'),vi,ri?c3('Rival',ri,o[ri].n+' partie'+(o[ri].n>1?'s':'')+' - '+o[ri].v+' victoire'+(o[ri].v>1?'s':'')):c3('Rival','-','aucune partie'));
}
/* Encart Entrainement : taux par niveau du Golem (couleurTaux, gris sous 5 parties). */
function encartEntrainement(){
  const z=$('encartEntrainement');z.textContent='';
  [['facile','Facile'],['normal','Normal'],['difficile','Difficile']].forEach(([k,lib])=>{
    const re=new RegExp('\\('+k+'\\)$','i'),l=partiesDe((m,x)=>m==='entrainement'&&re.test(String(x.adv||''))),v=l.filter(x=>x.res==='Victoire').length,t=pcJ(v,l.length);
    const d=c3(lib,txtTaux(t),l.length+' partie'+(l.length>1?'s':''));colore(d,t,l.length);z.append(d)});
}
/* Pastille du deck de l'Entrainement : nom + teinte des elements, clic = fenetre de choix du deck. */
function majPilDeck(){const d=deckChoisi(),b=$('jDeck');b.querySelector('span').textContent=d.nom;b.style.setProperty('--j-teinte',teinte(elsPrincipaux(d.texte),'90deg'));b.title='Deck : '+d.nom+' (changer)'}
$('jDeck').onclick=()=>choisirDeck(majPilDeck,'Choisir ce deck','Entraînement contre le Golem');
/* Invite (final_invite) : tuiles Classee et Amicale floutees sous un verrou, liste floutee avec Se connecter / Creer un compte. */
const VERROU='<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="5" y="10.5" width="14" height="10" rx="2.5"/><path d="M8.5 10.5V8a3.5 3.5 0 0 1 7 0v2.5"/></svg>';
function jVerrou(parent,titre,sous,deux){
  let v=parent.querySelector(':scope>.j-verrou');if(v)v.remove();
  v=el('div','j-verrou'+(deux?' j-vliste':''));const ic=el('span','j-cadenas');ic.innerHTML=VERROU;v.append(ic,el('b','',titre));if(sous)v.append(el('small','',sous));
  const rg=el('div','j-vbtns'),a=el('button','sc-btn','Se connecter');a.type='button';a.onclick=()=>ouvrePseudo();rg.append(a);
  if(deux){const b=el('button','sc-btn sc-secondaire','Créer un compte');b.type='button';b.onclick=()=>ouvrePseudo();rg.append(b)}
  v.append(rg);parent.append(v);
}
function majTuiles(){
  if(!window.GolemsClasse)return;
  const co=compteCo();$('accueil').classList.toggle('j-invite',!co);
  encartClasse(co?profilClasse():{elo:1087,parties:36,v:21,d:15});encartAmicale();encartEntrainement();majPilDeck();
  ['blocClasse','blocCreer','blocListe'].forEach(i=>{const v=$(i).querySelector(':scope>.j-verrou');if(v&&co)v.remove()});
  if(!co&&!$('blocClasse').querySelector(':scope>.j-verrou')){jVerrou($('blocClasse'),'Rang, Elo et classement');jVerrou($('blocCreer'),'Contre tes amis ou la communauté');jVerrou($('blocListe'),'Connecte-toi pour voir les parties en ligne','Rejoins une partie ouverte ou regarde celles en cours.',true)}
}

/* Parties en ligne : une ligne par partie (ouverte, complete, en cours), filtres Toutes / Ouvertes / En cours / Classees, pages de 6. */
let jFiltre='toutes',jPage=0;const J_PAR_PAGE=6;
const OEIL_J='<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M2 12s3.6-6.5 10-6.5S22 12 22 12s-3.6 6.5-10 6.5S2 12 2 12z"/><circle cx="12" cy="12" r="3"/></svg>';
function etatAnn(x){return x.g===true?'e':typeof x.w==='string'?'c':'o'}
function filtreAnn(l,f){return f==='ouvertes'?l.filter(x=>etatAnn(x)==='o'):f==='encours'?l.filter(x=>etatAnn(x)==='e'):f==='classees'?l.filter(x=>x.cl===true):l}
function peintFiltres(l){
  const z=$('jFiltres');z.textContent='';
  [['toutes','Toutes'],['ouvertes','Ouvertes'],['encours','En cours'],['classees','Classées']].forEach(([k,lib])=>{
    const b=el('button','',lib+' ');b.type='button';b.append(el('b','j-nb',String(filtreAnn(l,k).length)));b.setAttribute('aria-pressed',k===jFiltre?'true':'false');
    b.onclick=()=>{jFiltre=k;jPage=0;peintListe()};z.append(b)});
}
function joueurLigne(nom,av,els,elo,gauche){
  const s=el('span','j-j'+(gauche?' g':'')),pi=el('span','j-els');(els||[]).forEach(z=>{const i=picto(z);i.width=i.height=16;i.title=nomEl(z);pi.append(i)});
  const e=[];if(Number.isFinite(elo)){const R=GolemsClasse.rang(elo),im=el('img','j-mini');im.src=imgRang(R.id);im.alt=R.nom;im.width=im.height=24;e.push(im,el('span','elo',String(Math.round(elo))))}
  const b=el('b','',nom);b.title=nom;
  if(gauche)s.append(pi,...e,b,av);else s.append(av,b,...e,pi);return s;
}
function peintEnCours(){} /* 0.6 : les parties en cours sont dans la liste unique (peintListe) */
function peintListe(){
  const u=$('listeSalons');if(!u)return;u.textContent='';
  try{majTuiles()}catch(e){console.warn(e)}
  const moi=room&&room.compte?room.compte.uid():'',aMoi=x=>!!moi&&(x.u===moi||x.w===moi);
  const tout=[...annoncesL.filter(aMoi),...annoncesL.filter(x=>!aMoi(x))];
  peintFiltres(tout);
  const l=filtreAnn(tout,jFiltre),np=Math.max(1,Math.ceil(l.length/J_PAR_PAGE));jPage=Math.min(jPage,np-1);
  const g=el('ul','j-liste');
  if(!l.length)g.append(el('li','j-vide',jFiltre==='toutes'?'Aucune partie en ligne. Crée la tienne !':'Aucune partie dans ce filtre.'));
  l.slice(jPage*J_PAR_PAGE,(jPage+1)*J_PAR_PAGE).forEach(x=>{
    const et=etatAnn(x),mien=aMoi(x),li=el('li','j-p'+(mien?' mien':'')),nom=nettoie(typeof x.p==='string'?x.p:'')||'Joueur',nq=nettoie(typeof x.q==='string'?x.q:'')||'Joueur';
    const ea=String(x.e||'').split(',').filter(z=>NOMS_EL[z]).slice(0,3),eb=String(x.f||'').split(',').filter(z=>NOMS_EL[z]).slice(0,3);
    const tz=e=>e?'color-mix(in srgb,var(--'+e+') 26%,var(--panneau2))':'var(--panneau2)';
    if(et==='e')li.style.setProperty('--j-teinte','linear-gradient(90deg,'+tz(ea[0])+','+tz(eb[0])+')');
    else if(ea[0])li.style.setProperty('--j-teinte','linear-gradient(90deg,'+tz(ea[0])+',var(--panneau2) 70%)');
    const xv=vOk(x.v),vd=!mien&&!!maV&&!vEg(xv,maV);if(vd&&!vAncienne(xv))vJeSuisAncien();
    const duo=el('div','j-duo'),att=el('span','j-j');att.append(el('span','lib','En attente d\'un adversaire'));
    duo.append(joueurLigne(nom,x.u?avatarUid(nom,x.u,x.a):avatarDe(nom,x.a),ea,x.el,true),el('span','vs','contre'),et==='o'?att:joueurLigne(nq,avatarUid(nq,x.w),eb,null,false));
    const inf=el('span','j-inf');
    if(et==='e'){const k=typeof x.k==='string'&&/^\d{1,2}-\d{1,2}$/.test(x.k)?x.k.split('-'):['0','0'];inf.append('Manche '+(Number.isInteger(x.m)?x.m:1),el('b','',k[0]+'-'+k[1]))}
    else inf.append(et==='o'?'1/2 joueurs':'2/2 joueurs');
    const sp=el('span','j-spec');sp.innerHTML=OEIL_J;sp.append(String(Number.isInteger(x.n)&&x.n>0?x.n:0));sp.title='Spectateurs';
    let b;
    if(mien)b=el('span','j-tag j-moi','Ta partie');
    else if(et==='o'){b=el('button','sc-btn',vd?'Version différente':'Rejoindre');b.type='button';b.disabled=!!r||occupe||vd;
      b.onclick=()=>{if(!compteCo()){msgInvite();return}choisirDeck(()=>{salonPublic=false;createur=false;salonClasse=x.cl===true;annonceVue='';entre(x.code)},'Rejoindre',(x.cl===true?'Partie classée':'Partie amicale')+' - salon '+String(x.code).toUpperCase())}}
    else{b=el('button','sc-btn sc-secondaire','Regarder');b.type='button';b.disabled=!!r||occupe||vd;b.onclick=()=>observer(x)}
    li.append(el('span','j-et '+et,et==='o'?'Ouverte':et==='c'?'Complète':'En cours'),el('span','j-tag'+(x.cl===true?' cl':''),x.cl===true?'Classée':'Amicale'),duo,inf,sp,b);
    g.append(li);
  });
  u.append(g);
  const P=$('jPages');P.hidden=np<2;P.querySelector('.nv-num').textContent=(jPage+1)+'/'+np;
  P.querySelector('.nv-prec').disabled=jPage===0;P.querySelector('.nv-suiv').disabled=jPage>=np-1;
}
$('jPages').querySelector('.nv-prec').onclick=()=>{if(jPage>0){jPage--;peintListe()}};
$('jPages').querySelector('.nv-suiv').onclick=()=>{jPage++;peintListe()};

/* Salon classe (36 variante B) : bandeau d'information des l'ouverture ; compte a rebours de 2 min sans adversaire,
   puis « Golem X - Elo N, points divises par 2, k sur 5 aujourd'hui » et le bouton « Affronter un Golem » ; limite atteinte. */
const ATTENTE_ROBOT=120000;let robotT2=0;
function majBandeauRobot(){
  const z=$('bandeauRobot');if(!z)return;
  {const g=$('salonClasseTag');g.hidden=!r&&!code;g.textContent=salonClasse?'Classée':'Amicale';g.classList.toggle('cl',salonClasse)}
  clearTimeout(robotT2);robotT2=0;
  const seul=!!r&&!partie&&salonClasse&&createur&&ordre(r.peers()).length<2;
  if(!seul){z.hidden=true;return}
  const C=GolemsClasse,j=profilClasse(),R=C.ROBOTS[C.niveauRobot(j.elo)],reste=C.robotsRestants(j.robots),t=z.querySelector('span'),b=$('affronterGolem'),ms=ATTENTE_ROBOT-(Date.now()-entree);
  z.hidden=false;
  if(reste<=0){t.textContent='Limite atteinte : '+C.ROBOTS_PAR_JOUR+' parties contre un Golem par jour en classée. Reviens demain ou attends un adversaire.';b.hidden=true;return}
  if(ms>0){const s=Math.ceil(ms/1000);t.textContent='Salon classé : personne n\'a encore rejoint. Un Golem te sera proposé dans '+Math.floor(s/60)+':'+String(s%60).padStart(2,'0')+'.';b.hidden=true;robotT2=setTimeout(majBandeauRobot,(ms%1000)+20);return}
  t.textContent='Salon classé : personne n\'a rejoint. Affronte le '+R.nom+' - Elo '+R.elo+', points divisés par 2, '+C.compteRobot(j.robots).n+' sur '+C.ROBOTS_PAR_JOUR+' aujourd\'hui.';b.hidden=false;
}
$('affronterGolem').onclick=async()=>{
  const b=$('affronterGolem');if(b.disabled)return;b.disabled=true;try{await affronterGolem()}finally{b.disabled=false} /* 0.6.1 : un seul lancement au double clic */
};
async function affronterGolem(){
  const j=profilClasse(),sa=code;if(!GolemsClasse.peutAffronterRobot(j.robots)){majBandeauRobot();return}
  /* Bandeau robot pose dans le salon (regles : 2 min, sans adversaire, 5 par jour) avant de le quitter. */
  try{if(!r||!r.poseRobot)throw new Error('salon');await r.poseRobot(GolemsClasse.salonRobot(room.compte.uid(),j.elo))}
  catch(e){console.warn(e);alerte('erreurJeu','Partie classée impossible : Golem refusé par le serveur. Réessaie dans un instant.');return}
  await sortie('');lanceClasseRobot(j,sa);
}

/* Colonne des spectateurs du salon (refonte v2) : 5 lignes au plus, puis « +N autres » ; « Aucun spectateur » si vide. */
$('slDeck').onclick=()=>choisirDeck(()=>majSalon(),'Choisir ce deck',ctxSalon());
function majSpecs(){
  const z=$('slSpecs');if(!z)return;z.textContent='';
  const E=window.SPEC&&SPEC.etatSalon?SPEC.etatSalon():null,l=E&&Array.isArray(E.spectateurs)?E.spectateurs:[];
  const t=el('div','sl-st'),g=el('span');g.innerHTML=OEIL_J;g.append('Spectateurs');t.append(g,el('b','',String(l.length)));z.append(t);
  if(!l.length){z.append(el('div','sl-aucun','Aucun spectateur'));return}
  const u=el('ul');l.slice(0,l.length>5?4:5).forEach(x=>{const nm=nettoie(x.pseudo||'')||'Joueur',li=el('li',x.moi?'moi':'');li.append(avatarUid(nm,x.uid,x.avatar),el('b','',nm));u.append(li)});
  if(l.length>5)u.append(el('li','plus','+'+(l.length-4)+' autres'));z.append(u);
}
if(window.SPEC&&SPEC.onChange)SPEC.onChange(()=>{if(!$('salon').hidden)majSpecs()});
/* Premier affichage (invite, ou avant la connexion) : tuiles et liste peintes des que decks.js et vue/partie.js sont charges. */
(function t(){if(typeof deckChoisi==='function'&&typeof lesParties==='function'&&typeof teinte==='function')peintListe();else setTimeout(t,50)})();
