/* Compte et avatars : avatar, galerie, import et cadrage d'image, fenetre pseudo et code secret. */
/* Avatar : rond avec initiale sur une couleur tiree du pseudo. avatarId (futur choix en galerie, a stocker plus tard dans la presence ou Firebase) : si fourni, image avatars/<id>.png a la place. */
const AVATAR_COULEURS=window.GolemsDonnees.interface.elements.ordre.map(e=>"--fm-"+e); /* modele des elements : cartes/donnees/interface.js */
function avatarDe(nom,avatarId){
  const n=String(nom||"").trim()||"?",a=el("span","avatar");a.setAttribute("aria-hidden","true");
  let h=0;for(const c of n.toLowerCase())h=(h*31+c.codePointAt(0))>>>0;
  a.style.background="var("+AVATAR_COULEURS[h%AVATAR_COULEURS.length]+")";
  const imp=typeof avatarId==='string'&&/^data:image\/(jpeg|webp);base64,[A-Za-z0-9+\/=]+$/.test(avatarId);
  if(imp||avatarId&&/^[a-z0-9_-]{1,40}$/.test(avatarId)){const i=document.createElement("img");i.alt="";i.src=imp?avatarId:imgV("avatars/"+avatarId+".jpg");i.onerror=()=>{i.remove();a.textContent=Array.from(n)[0]};a.append(i)}
  else a.textContent=Array.from(n)[0];
  return a;
}
/* Mon avatar : Firebase pour un compte, appareil pour un invite. */
/* Image importee (data URL) prioritaire sur l'avatar de galerie ; invite : golems-avatar-img en local seulement. */
/* 0.6 : « Mon image » gardee quand on choisit un autre avatar ; marqueurs "__img" (image active) et "__init" (initiale, image gardee). */
function monAvatar(){try{if(compteCo())return (room.compte.avatarImg&&room.compte.avatarImg())||room.compte.avatarId()||'';
  const a=lire('golems-avatar')||'',i=lire('golems-avatar-img')||'';if(i&&(!a||a==='__img'))return i;return /^__(img|init)$/.test(a)?'':a}catch(e){return ''}}
function monImage(){try{return compteCo()?(room.compte.imageGardee?room.compte.imageGardee():room.compte.avatarImg())||'':lire('golems-avatar-img')||''}catch(e){return ''}}
/* Avatar d'un autre compte (uid) : lu une fois dans joueurs/{uid}/avatarId, puis les ronds marques data-av sont remplaces. */
const avCache={},avT={}; /* relu au plus toutes les 15 s : un remplacement chez l'adversaire finit par apparaitre */
function avatarUid(nom,uid,repli){
  if(typeof uid!=='string'||!uid)return avatarDe(nom,repli);
  if(!(uid in avCache)||Date.now()-(avT[uid]||0)>15000){if(!(uid in avCache))avCache[uid]='';avT[uid]=Date.now();
    if(room&&room.compte&&room.compte.avatarDe)room.compte.avatarDe(uid).then(id=>{if(id===avCache[uid])return;avCache[uid]=id;
      document.querySelectorAll('.avatar[data-av]').forEach(x=>{if(x.dataset.av===uid)x.replaceWith(avatarUid(x.dataset.nom,uid))})})}
  const a=avatarDe(nom,avCache[uid]||repli);a.dataset.av=uid;a.dataset.nom=nom;return a;
}
/* 0.6 : capsule du bandeau B3 (maquette 32). Connecte : [embleme + Elo |] pseudo | avatar, clic = mon profil, porte de deconnexion visible.
   Invite (I2) : « Invité » + « Se connecter » dessous, avatar « ? », clic = fenetre de connexion, pas de porte.
   Rang : majRangMoi({img, nom, elo}) appele par onglets/jouer.js (majRangBandeau) d'apres le profil classe Firebase ;
   pendant le placement ou sans compte, embleme et Elo restent masques. */
function majRangMoi(r){const g=$('rangMoi'),sep=g.nextElementSibling,ok=!!(r&&r.img&&Number.isFinite(r.elo));
  g.hidden=sep.hidden=!ok;if(ok){g.querySelector('img').src=r.img;g.querySelector('img').alt=r.nom||'';$('rangElo').textContent=Math.round(r.elo).toLocaleString('fr-FR')}}
function majMoi(){
  const co=compteCo(),c=$('capsuleMoi');
  $("pseudoAffiche").textContent=co?pseudo:'Invité';$('sousConnexion').hidden=co;
  {const p=$('pseudoAffiche');p.removeAttribute('role');p.removeAttribute('tabindex');p.removeAttribute('title');p.classList.remove('pf-lien')}
  $("avatarMoi").replaceWith(Object.assign(avatarDe(co?pseudo:"?",monAvatar()),{id:"avatarMoi"}));
  c.title=co?'Mon profil':'Se connecter';c.setAttribute('aria-label',co?'Mon profil ('+pseudo+')':'Invité : se connecter');c.classList.toggle('bd-invite',!co);
  $('modifierPseudo').hidden=!co;if(!co)majRangMoi(null);
  if(typeof majEnLigne==='function')majEnLigne();
}
/* 0.6 : fenetre « Changer d'avatar » (maquette 33, variante A), ouverte par le gros avatar du profil (au-dessus du profil).
   A gauche : apercu en grand du choix + « ACTUEL », ou recadrage d'une image importee. A droite : grille de 6 colonnes,
   Initiale, « Mon image » (si une image est enregistree : un seul emplacement), avatars de avatars/avatars.json, puis
   « Importer » / « Remplacer mon image ». [Choisir cet avatar] enregistre, ferme et met a jour profil + capsule ; [Annuler] ferme sans rien changer. */
let listeAvatars=null;
const GAL={choix:'',actuel:'',imp:false,img:''};
const galNom=()=>compteCo()?pseudo:'?';
function galListe(){const L=[{id:'',nom:'Initiale'}];if(GAL.img)L.push({id:'__img',nom:'Mon image'});
  return L.concat((listeAvatars||[]).filter(x=>x&&/^[a-z0-9_-]{1,40}$/.test(x.id)))}
function galAv(id,t){const a=avatarDe(galNom(),id==='__img'?GAL.img:id);if(t){a.style.width=a.style.height=t+'px';a.style.fontSize=Math.round(t*.45)+'px'}return a}
function galPeint(){
  const g=$('galGrille'),L=galListe();g.textContent='';
  L.forEach(x=>{const b=el('button','av-tu');b.type='button';b.title=x.nom;b.setAttribute('aria-pressed',String(!GAL.imp&&x.id===GAL.choix));
    b.append(galAv(x.id),el('span','n',x.nom));b.onclick=()=>{GAL.imp=false;GAL.choix=x.id;cadFerme();galPeint()};g.append(b)});
  const t=el('button','av-tu imp');t.type='button';t.setAttribute('aria-pressed',String(GAL.imp));
  t.title=GAL.img?"Remplacer mon image (la nouvelle image remplace l'ancienne)":'Importer une image';
  const p=el('span','avatar','+');p.setAttribute('aria-hidden','true');t.append(p,el('span','n',GAL.img?'Remplacer mon image':'Importer'));
  t.onclick=()=>$('avFichier').click();g.append(t);
  /* Panneau de gauche */
  $('cadNote').textContent="Glisse l'image pour la placer."+(GAL.img?'\nElle remplacera ton image actuelle.':'');
  $('avApercu').hidden=GAL.imp;$('avCadrage').hidden=!GAL.imp;
  if(!GAL.imp){const x=L.find(y=>y.id===GAL.choix)||L[0],a=$('avGrand');a.textContent='';a.append(galAv(x.id,160),el('div','av-gnom',x.nom));
    const ac=L.find(y=>y.id===GAL.actuel)||L[0],r=$('avActuel');r.textContent='';r.append(el('span','av-actu','Actuel'),galAv(ac.id,28),el('span','av-anom',ac.nom))}
  $('galOk').disabled=!GAL.imp&&GAL.choix===GAL.actuel;
}
async function ouvreGalerie(){
  $('galMsg').textContent='';cadMsg('');
  if(!listeAvatars){try{listeAvatars=await (await fetch('avatars/avatars.json',{cache:'no-cache'})).json()}catch(e){listeAvatars=[]}}
  const cur=monAvatar();GAL.img=monImage();GAL.actuel=/^data:/.test(cur)?'__img':cur;GAL.choix=GAL.actuel;GAL.imp=false;
  galPeint();
  $('galerieAvatar').hidden=false;document.documentElement.classList.add('galOuverte');
  const g=$('galGrille');g.scrollTop=0;(g.querySelector('[aria-pressed="true"]')||g.firstChild).focus({preventScroll:true});
}
function fermeGalerie(){cadFerme();GAL.imp=false;$('galerieAvatar').hidden=true;document.documentElement.classList.remove('galOuverte');
  const a=document.querySelector('#profilJoueur .pr-av');(a||$('capsuleMoi')).focus()}
/* Apres un choix enregistre : capsule du bandeau (majMoi), profil ouvert, salon. */
function galApplique(){fermeGalerie();majMoi();if(typeof majAvatarProfil==='function')majAvatarProfil();avatarChange()}
$('galFermer').onclick=fermeGalerie;
$('galerieAvatar').onclick=e=>{if(e.target.id==='galerieAvatar')fermeGalerie()};
$('galerieAvatar').onkeydown=e=>{if(e.key==='Escape'){e.stopPropagation();fermeGalerie()}};
$('cadChanger').onclick=()=>$('avFichier').click();
$('galOk').onclick=async()=>{
  if(GAL.imp){await cadValide();return}
  const id=GAL.choix;if(id===GAL.actuel){fermeGalerie();return}
  if(compteCo()){try{await room.compte.choisirAvatar(id)}catch(e){alerte('galMsg','Avatar : connexion perdue. Vérifie ta connexion puis réessaie.');return}}
  else ecrire('golems-avatar',id||(GAL.img?'__init':'')); /* l'image importee reste (« Mon image ») */
  galApplique();
};
/* Import d'avatar : fichier image, recadrage rond dans le panneau de gauche (glisser, molette, pincement, curseur),
   256 x 256 en WebP (repli JPEG) sous 140 000 caracteres. */
const CAD={img:null,z:1,zMin:1,x:0,y:0,T:196,pts:new Map(),d0:0,z0:1};
function cadMsg(t){alerte('cadMsg',t)}
function cadBorne(){const c=CAD,w=c.img.naturalWidth*c.z,h=c.img.naturalHeight*c.z;c.x=Math.min(0,Math.max(c.T-w,c.x));c.y=Math.min(0,Math.max(c.T-h,c.y))}
function cadDessine(){const c=CAD,i=$('cadImg');cadBorne();i.style.width=c.img.naturalWidth*c.z+'px';i.style.transform='translate('+c.x+'px,'+c.y+'px)';$('cadZoom').value=String(Math.round(Math.log(c.z/c.zMin)/Math.log(4)*100))}
function cadZoome(nz,px,py){const c=CAD;nz=Math.max(c.zMin,Math.min(c.zMin*4,nz));if(px==null){px=c.T/2;py=c.T/2}c.x=px-(px-c.x)*nz/c.z;c.y=py-(py-c.y)*nz/c.z;c.z=nz;cadDessine()}
$('avFichier').onchange=e=>{
  const f=e.target.files&&e.target.files[0];e.target.value='';if(!f)return;
  const err=t=>{alerte('galMsg',t)};err('');
  if(!/^image\//.test(f.type)){err("Avatar : ce fichier n'est pas une image. Choisis un JPEG, PNG, WebP ou GIF.");return}
  if(f.size>15*1024*1024){err('Avatar : image trop lourde, 15 Mo au plus. Choisis une image plus légère.');return}
  const u=URL.createObjectURL(f),im=new Image();
  im.onload=()=>{if(CAD.img)URL.revokeObjectURL(CAD.img.src);const c=CAD;c.img=im;$('cadImg').src=u;GAL.imp=true;galPeint();c.T=$('cadVue').clientWidth||196;
    c.zMin=c.T/Math.min(im.naturalWidth,im.naturalHeight);c.z=c.zMin;c.x=(c.T-im.naturalWidth*c.z)/2;c.y=(c.T-im.naturalHeight*c.z)/2;cadMsg('');cadDessine();$('galOk').focus()};
  im.onerror=()=>{URL.revokeObjectURL(u);err("Avatar : image illisible. Essaie un autre fichier (JPEG, PNG, WebP ou GIF).")};im.src=u;
};
(()=>{const v=$('cadVue'),c=CAD;
  const pos=e=>{const r=v.getBoundingClientRect();return[e.clientX-r.left,e.clientY-r.top]};
  v.onpointerdown=e=>{if(!c.img)return;v.setPointerCapture(e.pointerId);c.pts.set(e.pointerId,pos(e));if(c.pts.size===2){const[a,b]=[...c.pts.values()];c.d0=Math.hypot(a[0]-b[0],a[1]-b[1]);c.z0=c.z}};
  v.onpointermove=e=>{if(!c.pts.has(e.pointerId))return;const p=pos(e),o=c.pts.get(e.pointerId);c.pts.set(e.pointerId,p);
    if(c.pts.size===1){c.x+=p[0]-o[0];c.y+=p[1]-o[1];cadDessine()}
    else if(c.pts.size===2&&c.d0){const[a,b]=[...c.pts.values()];cadZoome(c.z0*Math.hypot(a[0]-b[0],a[1]-b[1])/c.d0,(a[0]+b[0])/2,(a[1]+b[1])/2)}};
  v.onpointerup=v.onpointercancel=e=>{c.pts.delete(e.pointerId);if(c.pts.size<2)c.d0=0};
  v.onwheel=e=>{if(!c.img)return;e.preventDefault();const p=pos(e);cadZoome(c.z*Math.exp(-e.deltaY*0.0015),p[0],p[1])};
  $('cadZoom').oninput=e=>{if(c.img)cadZoome(c.zMin*Math.pow(4,+e.target.value/100))};
})();
function cadFerme(){if(CAD.img){URL.revokeObjectURL(CAD.img.src);CAD.img=null}$('cadImg').removeAttribute('src');cadMsg('')}
async function cadValide(){
  const c=CAD;if(!c.img)return;const cv=document.createElement('canvas');cv.width=cv.height=256;const g=cv.getContext('2d');
  g.imageSmoothingQuality='high';const k=256/c.T;g.fillStyle='#fff';g.fillRect(0,0,256,256);
  g.drawImage(c.img,c.x*k,c.y*k,c.img.naturalWidth*c.z*k,c.img.naturalHeight*c.z*k);
  let url='';
  for(const t of ['image/webp','image/jpeg']){for(let q=0.92;q>=0.3;q-=0.1){const u=cv.toDataURL(t,q);if(u.indexOf('data:'+t+';base64,')!==0)break;if(u.length<=140000){url=u;break}}if(url)break}
  if(!url){cadMsg("Avatar : image trop détaillée. Zoome ou choisis une autre image.");return}
  if(!/^data:image\/(jpeg|webp);base64,/.test(url)||url.length>140000){cadMsg("Avatar : image impossible à préparer sur cet appareil. Essaie une autre image.");return}
  if(compteCo()){try{await room.compte.choisirImage(url)}catch(e){
    const m=String(e&&(e.code||e.message)||'').toLowerCase();console.warn('avatarImg',e,url.slice(0,30),url.length);
    cadMsg(/permission/.test(m)?"Avatar : enregistrement refusé par le serveur. Préviens KaTarN (Romain).":/too|size|large|limit/.test(m)?"Avatar : image trop lourde pour le serveur. Zoome ou choisis une autre image.":/network|disconnect|offline|unavailable/.test(m)?"Avatar : connexion perdue. Vérifie ta connexion puis réessaie.":"Avatar : enregistrement impossible ("+(e&&(e.code||e.message)||'erreur inconnue')+"). Réessaie ou préviens KaTarN (Romain).");return}}
  else{try{localStorage.setItem(LS('golems-avatar-img'),url);ecrire('golems-avatar','__img')}catch(e){cadMsg("Avatar : stockage de l'appareil plein. Libère de la place ou crée un compte.");return}}
  galApplique();
}
function avatarChange(){if(!r)return;try{majSalon()}catch(e){}r.presence({pseudo:pseudo}).catch(()=>{})}
/* Compte : pseudo reserve + code secret (Firebase). Sans compte : invite, robot seulement, donnees sur l'appareil. */
/* compteCo : declare dans commun/etat.js (charge en premier). */
function nettoie(s,n=20){return String(s||'').replace(/[\p{Cc}\p{Cf}\p{Zl}\p{Zp}]/gu,'').trim().slice(0,n)}
function modeCompte(c){
  modeCreer=c;$('titrePop').textContent=c?'Créer un compte':'Se connecter';
  $('entrer').textContent=c?'Créer mon compte':'Se connecter';
  $('basculeCompte').textContent=c?"J'ai déjà un compte":'Créer un compte';
  $('codeSecret').autocomplete=c?'new-password':'current-password';
  $('aideCompte').textContent=c?"Pseudo de 3 à 20 caractères, unique. Code secret de 6 caractères minimum, tout caractère accepté. Garde-le bien : en cas d'oubli, seul Romain peut réinitialiser le compte.":'Un compte garde tes decks et ton historique, et permet de jouer en ligne.';
  alerte('erreurPseudo','');
}
function ouvrePseudo(){
  if(r){alerte('erreurJeu','Salon en cours : changement de compte indisponible dans un salon. Quitte le salon d\'abord.');return}
  modeCompte(false);$('pseudo').value=lire('golems.pseudo')||'';$('codeSecret').value='';
  $('popPseudo').hidden=false;$('pseudo').focus();
}
/* Capsule : mon profil (connecte) ou connexion (invite). Ecoute en capture : le pseudo n'est plus un bouton a part (role=button pose par profil.js, retire dans majMoi). */
$('capsuleMoi').addEventListener('click',e=>{e.stopPropagation();e.preventDefault();if(compteCo()){if(typeof ouvreProfil==='function')ouvreProfil()}else ouvrePseudo()},true);
/* Porte de deconnexion : fenetre de confirmation [Se déconnecter] [Annuler] (sc-fenetre). */
function fermeDeco(){$('fenDeco').hidden=true;$('modifierPseudo').focus()}
$('modifierPseudo').onclick=()=>{
  if(!compteCo()){ouvrePseudo();return}
  if(r){alerte('erreurJeu','Salon en cours : déconnexion indisponible dans un salon. Quitte le salon d\'abord.');onglet('jouer');return}
  $('fenDeco').hidden=false;$('decoOui').focus();
};
$('decoNon').onclick=fermeDeco;
$('fenDeco').onclick=e=>{if(e.target.id==='fenDeco')fermeDeco()};
$('fenDeco').onkeydown=e=>{if(e.key==='Escape')fermeDeco()};
$('decoOui').onclick=async()=>{const b=$('decoOui');b.disabled=true;try{await room.compte.deconnecter()}catch(e){}b.disabled=false;$('fenDeco').hidden=true};
$('basculeCompte').onclick=()=>modeCompte(!modeCreer);
$('plusTard').onclick=()=>{ecrire('golems.invite','1');$('popPseudo').hidden=true};
$('formPseudo').onsubmit=async e=>{
  e.preventDefault();
  const p=$('pseudo').value,c=$('codeSecret').value,err=$('erreurPseudo');
  if(!room||!room.compte){alerte(err,'Compte : serveur injoignable pour le moment. Réessaie plus tard.');return}
  const x=room.compte.erreurPseudo(p);
  if(modeCreer&&x){alerte(err,x);return}
  if(modeCreer&&c.length<6){alerte(err,'Compte : code trop court, 6 caractères au moins. Allonge ton code secret.');return}
  if(!c){alerte(err,'Compte : code secret vide. Entre ton code secret.');return}
  $('entrer').disabled=true;alerteInfo(err,modeCreer?'Connexion : création du compte en cours. Patiente un instant.':'Connexion : connexion au compte en cours. Patiente un instant.');
  const m=modeCreer?await room.compte.creer(p,c):await room.compte.connecter(p,c);
  $('entrer').disabled=false;alerte(err,m);
  if(!m){$('popPseudo').hidden=true;$('codeSecret').value='';ecrire('golems.pseudo',room.compte.pseudo())}
};
/* Apres chaque changement de compte : pseudo, decks, historique, proposition d'import. */
function surCompte(){
  pseudo=compteCo()?room.compte.pseudo():'';
  majMoi();majEtat();majChoixDeck();
  if(!$('decks').hidden)peintDecks();if(!$('historique').hidden)peintHisto();
  if(compteCo())proposeImport();
}
majMoi();

