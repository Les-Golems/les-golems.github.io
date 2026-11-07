/* Compte et avatars : avatar, galerie, import et cadrage d'image, fenetre pseudo et code secret. */
/* Avatar : rond avec initiale sur une couleur tiree du pseudo. avatarId (futur choix en galerie, a stocker plus tard dans la presence ou Firebase) : si fourni, image avatars/<id>.png a la place. */
const AVATAR_COULEURS=["--fm-magma","--fm-cristal","--fm-foudre","--fm-brume","--fm-roche"];
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
function monAvatar(){try{return compteCo()?(room.compte.avatarImg&&room.compte.avatarImg())||room.compte.avatarId()||'':lire('golems-avatar-img')||lire('golems-avatar')||''}catch(e){return ''}}
/* Avatar d'un autre compte (uid) : lu une fois dans joueurs/{uid}/avatarId, puis les ronds marques data-av sont remplaces. */
const avCache={},avT={}; /* relu au plus toutes les 15 s : un remplacement chez l'adversaire finit par apparaitre */
function avatarUid(nom,uid,repli){
  if(typeof uid!=='string'||!uid)return avatarDe(nom,repli);
  if(!(uid in avCache)||Date.now()-(avT[uid]||0)>15000){if(!(uid in avCache))avCache[uid]='';avT[uid]=Date.now();
    if(room&&room.compte&&room.compte.avatarDe)room.compte.avatarDe(uid).then(id=>{if(id===avCache[uid])return;avCache[uid]=id;
      document.querySelectorAll('.avatar[data-av]').forEach(x=>{if(x.dataset.av===uid)x.replaceWith(avatarUid(x.dataset.nom,uid))})})}
  const a=avatarDe(nom,avCache[uid]||repli);a.dataset.av=uid;a.dataset.nom=nom;return a;
}
function majMoi(){
  const co=compteCo();
  $("pseudoAffiche").textContent=co?pseudo:'Invité';
  $("avatarMoi").replaceWith(Object.assign(avatarDe(co?pseudo:"?",monAvatar()),{id:"avatarMoi"}));
  const b=$('modifierPseudo'),t=co?'Se déconnecter':'Se connecter';b.querySelector('.txt').textContent=t;
  b.classList.toggle('deco',co);if(co){b.title=t;b.setAttribute('aria-label',t)}else{b.removeAttribute('title');b.removeAttribute('aria-label')}
}
/* Galerie d'avatars : avatars/avatars.json (id, nom), l'initiale en premier. */
let listeAvatars=null;
async function ouvreGalerie(){
  const g=$('galGrille');$('galMsg').textContent='';
  if(!listeAvatars){try{listeAvatars=await (await fetch('avatars/avatars.json',{cache:'no-cache'})).json()}catch(e){listeAvatars=[]}}
  const cur=monAvatar(),nom=compteCo()?pseudo:'?';g.textContent='';
  [{id:'',nom:'Initiale'}].concat(listeAvatars.filter(x=>x&&/^[a-z0-9_-]{1,40}$/.test(x.id))).forEach(x=>{
    const b=el('button');b.type='button';b.setAttribute('aria-pressed',String(x.id===cur));
    b.append(avatarDe(nom,x.id),el('span','',x.nom));
    b.onclick=async()=>{
      if(compteCo()){try{await room.compte.choisirAvatar(x.id)}catch(e){return}}else{ecrire('golems-avatar',x.id);try{localStorage.removeItem(LS('golems-avatar-img'))}catch(e){}}
      fermeGalerie();majMoi();avatarChange();
    };g.append(b);
  });
  const imp=el('button');imp.type='button';imp.className='galImp';
  const ia=el('span','avatar','+');ia.setAttribute('aria-hidden','true');imp.append(ia,el('span','','Importer'));
  if(/^data:/.test(cur)){imp.setAttribute('aria-pressed','true');ia.textContent='';const i=document.createElement('img');i.alt='';i.src=cur;ia.append(i)}
  imp.onclick=()=>$('avFichier').click();g.append(imp);
  $('galerieAvatar').hidden=false;document.documentElement.classList.add('galOuverte');g.scrollTop=0;
  {const f=g.querySelector('[aria-pressed="true"]')||g.firstChild;f.focus({preventScroll:true});
   const a=g.getBoundingClientRect(),b=f.getBoundingClientRect();if(b.bottom>a.bottom)g.scrollTop+=b.bottom-a.bottom+8}
}
function fermeGalerie(){$('galerieAvatar').hidden=true;document.documentElement.classList.remove('galOuverte');$('choixAvatar').focus()}
$('choixAvatar').onclick=ouvreGalerie;
$('galFermer').onclick=fermeGalerie;
$('galerieAvatar').onclick=e=>{if(e.target.id==='galerieAvatar')fermeGalerie()};
$('galerieAvatar').onkeydown=e=>{if(e.key==='Escape')fermeGalerie()};
/* Import d'avatar : fichier image, cadrage rond (glisser, molette, pincement, curseur), 256 x 256 en WebP (repli JPEG) sous 140 000 caracteres. */
const CAD={img:null,z:1,zMin:1,x:0,y:0,T:240,pts:new Map(),d0:0,z0:1};
function cadMsg(t){$('cadMsg').textContent=t||''}
function cadBorne(){const c=CAD,w=c.img.naturalWidth*c.z,h=c.img.naturalHeight*c.z;c.x=Math.min(0,Math.max(c.T-w,c.x));c.y=Math.min(0,Math.max(c.T-h,c.y))}
function cadDessine(){const c=CAD,i=$('cadImg');cadBorne();i.style.width=c.img.naturalWidth*c.z+'px';i.style.transform='translate('+c.x+'px,'+c.y+'px)';$('cadZoom').value=String(Math.round(Math.log(c.z/c.zMin)/Math.log(4)*100))}
function cadZoome(nz,px,py){const c=CAD;nz=Math.max(c.zMin,Math.min(c.zMin*4,nz));if(px==null){px=c.T/2;py=c.T/2}c.x=px-(px-c.x)*nz/c.z;c.y=py-(py-c.y)*nz/c.z;c.z=nz;cadDessine()}
$('avFichier').onchange=e=>{
  const f=e.target.files&&e.target.files[0];e.target.value='';if(!f)return;
  const err=t=>{$('galMsg').textContent=t};err('');
  if(!/^image\//.test(f.type)){err("Ce fichier n'est pas une image. Choisis un fichier JPEG, PNG, WebP ou GIF.");return}
  if(f.size>15*1024*1024){err('Image trop lourde (15 Mo au plus).');return}
  const u=URL.createObjectURL(f),im=new Image();
  im.onload=()=>{const c=CAD;c.img=im;$('cadImg').src=u;$('cadre').hidden=false;c.T=$('cadVue').clientWidth||240;
    c.zMin=c.T/Math.min(im.naturalWidth,im.naturalHeight);c.z=c.zMin;c.x=(c.T-im.naturalWidth*c.z)/2;c.y=(c.T-im.naturalHeight*c.z)/2;cadMsg('');cadDessine();$('cadOk').focus()};
  im.onerror=()=>{URL.revokeObjectURL(u);err("Image illisible. Essaie un autre fichier (JPEG, PNG ou WebP).")};im.src=u;
};
(()=>{const v=$('cadVue'),c=CAD;
  const pos=e=>{const r=v.getBoundingClientRect();return[e.clientX-r.left,e.clientY-r.top]};
  v.onpointerdown=e=>{if(!c.img)return;v.setPointerCapture(e.pointerId);c.pts.set(e.pointerId,pos(e));if(c.pts.size===2){const[a,b]=[...c.pts.values()];c.d0=Math.hypot(a[0]-b[0],a[1]-b[1]);c.z0=c.z}};
  v.onpointermove=e=>{if(!c.pts.has(e.pointerId))return;const p=pos(e),o=c.pts.get(e.pointerId);c.pts.set(e.pointerId,p);
    if(c.pts.size===1){c.x+=p[0]-o[0];c.y+=p[1]-o[1];cadDessine()}
    else if(c.pts.size===2&&c.d0){const[a,b]=[...c.pts.values()];cadZoome(c.z0*Math.hypot(a[0]-b[0],a[1]-b[1])/c.d0,(a[0]+b[0])/2,(a[1]+b[1])/2)}};
  v.onpointerup=v.onpointercancel=e=>{c.pts.delete(e.pointerId);if(c.pts.size<2)c.d0=0};
  v.onwheel=e=>{if(!c.img)return;e.preventDefault();const p=pos(e);cadZoome(c.z*Math.exp(-e.deltaY*0.0015),p[0],p[1])};
  $('cadZoom').oninput=e=>cadZoome(c.zMin*Math.pow(4,+e.target.value/100));
})();
function cadFerme(){$('cadre').hidden=true;if(CAD.img){URL.revokeObjectURL(CAD.img.src);CAD.img=null}$('cadImg').removeAttribute('src')}
$('cadAnnuler').onclick=cadFerme;
$('cadre').onkeydown=e=>{if(e.key==='Escape'){e.stopPropagation();cadFerme()}};
$('cadOk').onclick=async()=>{
  const c=CAD;if(!c.img)return;const cv=document.createElement('canvas');cv.width=cv.height=256;const g=cv.getContext('2d');
  g.imageSmoothingQuality='high';const k=256/c.T;g.fillStyle='#fff';g.fillRect(0,0,256,256);
  g.drawImage(c.img,c.x*k,c.y*k,c.img.naturalWidth*c.z*k,c.img.naturalHeight*c.z*k);
  let url='';
  for(const t of ['image/webp','image/jpeg']){for(let q=0.92;q>=0.3;q-=0.1){const u=cv.toDataURL(t,q);if(u.indexOf('data:'+t+';base64,')!==0)break;if(u.length<=140000){url=u;break}}if(url)break}
  if(!url){cadMsg("Image trop détaillée pour être enregistrée. Essaie de zoomer ou choisis une autre image.");return}
  if(!/^data:image\/(jpeg|webp);base64,/.test(url)||url.length>140000){cadMsg("Image impossible à préparer sur cet appareil. Essaie une autre image.");return}
  if(compteCo()){try{await room.compte.choisirImage(url)}catch(e){
    const m=String(e&&(e.code||e.message)||'').toLowerCase();console.warn('avatarImg',e,url.slice(0,30),url.length);
    cadMsg(/permission/.test(m)?"Enregistrement refusé par le serveur (permission refusée, image "+Math.round(url.length/1000)+" k caractères). Préviens Romain.":/too|size|large|limit/.test(m)?"Image trop lourde pour le serveur. Zoome ou choisis une autre image.":/network|disconnect|offline|unavailable/.test(m)?"Enregistrement impossible. Vérifie ta connexion puis réessaie.":"Enregistrement impossible ("+(e&&(e.code||e.message)||'erreur inconnue')+").");return}}
  else{try{localStorage.setItem(LS('golems-avatar-img'),url)}catch(e){cadMsg("Image impossible à garder sur cet appareil (stockage plein).");return}}
  cadFerme();fermeGalerie();majMoi();avatarChange();
};
/* Avatar change en salon : mon siege redessine, presence reecrite pour que l'adversaire redessine (et relise l'avatar). */
function avatarChange(){if(!r)return;try{majSalon()}catch(e){}r.presence({pseudo:pseudo}).catch(()=>{})}
/* Compte : pseudo reserve + code secret (Firebase). Sans compte : invite, robot seulement, donnees sur l'appareil. */
const compteCo=()=>{try{return !!(room&&room.compte&&room.compte.connecte())}catch(e){return false}}; /* room est declare plus bas */
function nettoie(s,n=20){return String(s||'').replace(/[\p{Cc}\p{Cf}\p{Zl}\p{Zp}]/gu,'').trim().slice(0,n)}
function modeCompte(c){
  modeCreer=c;$('titrePop').textContent=c?'Créer un compte':'Se connecter';
  $('entrer').textContent=c?'Créer mon compte':'Se connecter';
  $('basculeCompte').textContent=c?"J'ai déjà un compte":'Créer un compte';
  $('codeSecret').autocomplete=c?'new-password':'current-password';
  $('aideCompte').textContent=c?"Pseudo de 3 à 20 caractères, unique. Code secret de 6 caractères minimum, tout caractère accepté. Garde-le bien : en cas d'oubli, seul Romain peut réinitialiser le compte.":'Un compte garde tes decks et ton historique, et permet de jouer en ligne.';
  $('erreurPseudo').textContent='';
}
function ouvrePseudo(){
  if(r){$('erreurJeu').textContent='Quitte le salon avant de changer de compte.';return}
  modeCompte(false);$('pseudo').value=lire('golems.pseudo')||'';$('codeSecret').value='';
  $('popPseudo').hidden=false;$('pseudo').focus();
}
$('modifierPseudo').onclick=async()=>{
  if(!compteCo()){ouvrePseudo();return}
  if(r){$('erreurJeu').textContent='Quitte le salon avant de te déconnecter.';onglet('jouer');return}
  const b=$('modifierPseudo');b.disabled=true;
  try{await room.compte.deconnecter()}catch(e){}
  b.disabled=false;
};
$('basculeCompte').onclick=()=>modeCompte(!modeCreer);
$('plusTard').onclick=()=>{ecrire('golems.invite','1');$('popPseudo').hidden=true};
$('formPseudo').onsubmit=async e=>{
  e.preventDefault();
  const p=$('pseudo').value,c=$('codeSecret').value,err=$('erreurPseudo');
  if(!room||!room.compte){err.textContent='Connexion au serveur impossible pour le moment.';return}
  const x=room.compte.erreurPseudo(p);
  if(modeCreer&&x){err.textContent=x;return}
  if(modeCreer&&c.length<6){err.textContent='Le code doit faire au moins 6 caractères.';return}
  if(!c){err.textContent='Entre ton code secret.';return}
  $('entrer').disabled=true;err.textContent=modeCreer?'Création du compte...':'Connexion...';
  const m=modeCreer?await room.compte.creer(p,c):await room.compte.connecter(p,c);
  $('entrer').disabled=false;err.textContent=m;
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

