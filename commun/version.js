/* Nouvelle version : version.json relu toutes les 5 minutes, encadre ou rechargement silencieux au premier moment calme (etape 3). */
/* Nouvelle version : version.json relu toutes les 5 minutes sans cache. Ecart : encadre dans l'en-tete, puis la page se recharge
   seule au premier moment calme : ni partie (robot, en ligne, tutoriel, replay), ni salon, ni deck ouvert, ni saisie, ni fenetre
   ouverte, ni envoi en cours, et 3 s sans geste. Sinon on attend (essai chaque seconde).
   window.nouvelleVersion() ou l'evenement 'golems:versionAncienne' sur document (salon : adversaire sur une version plus recente) :
   meme effet. Evenement 'golems:nouvelle-version' emis sur window a l'apparition de l'encadre. */
(()=>{
  let ref='',dispo=false,geste=Date.now(),envois=0,parti=false;
  /* Etape 3 : v change = version (encadre, comme avant) ; seul build change = correctif : aucun message, rechargement silencieux
     au premier moment calme (jamais en partie ni dans un salon : calme() ; fin de partie = retour a l'accueil, vu par l'essai chaque seconde). */
  let silencieux=false;
  const lit=async()=>{try{const x=await (await fetch('version.json?t='+Date.now(),{cache:'no-store'})).json();return String(x.v||'')+'|'+String(x.build||'')}catch(e){return ''}};
  if(window.GOLEMS_VERSION)ref=GOLEMS_VERSION.v+'|'+GOLEMS_VERSION.build;
  const vu=e=>e.getClientRects().length>0;
  const CHAMPS='input:not([type]),input[type=text],input[type=search],input[type=password],input[type=email],input[type=number],input[type=url],input[type=tel],textarea,[contenteditable]:not([contenteditable=false])';
  const saisie=()=>{const a=document.activeElement;if(a&&a!==document.body&&a.matches(CHAMPS))return true;
    return [...document.querySelectorAll(CHAMPS)].some(e=>!e.readOnly&&!e.disabled&&vu(e)&&(e.isContentEditable?e.textContent:String(e.value)).trim()!=='')};
  const modale=()=>[...document.querySelectorAll('[aria-modal="true"],[role="dialog"],[role="alertdialog"]')].some(vu);
  const calme=()=>!(partie||r||code||occupe||tuto||rejeuT||$('barreRejeu')||!$('salon').hidden||deckOuvert&&!$('decks').hidden
    ||decksT||decksVol||envois||reessai||modale()||saisie());
  /* Envois de parties (compte) : deja gardes sur l'appareil, mais on laisse finir l'envoi en cours. */
  envoieAttente=(f=>function(){envois++;let p;try{p=f.apply(this,arguments)}catch(e){envois--;throw e}Promise.resolve(p).then(()=>envois--,()=>envois--);return p})(envoieAttente);
  ['pointerdown','keydown','wheel','touchstart','input'].forEach(t=>addEventListener(t,()=>{geste=Date.now()},{capture:true,passive:true}));
  const tente=()=>{if((dispo||silencieux)&&!parti&&calme()&&Date.now()-geste>=3000){parti=true;location.reload()}};
  const correctif=()=>{if(dispo||silencieux)return;silencieux=true;setInterval(tente,1000);tente()};
  const signale=()=>{if(dispo)return;dispo=true;$('majDispo').hidden=false;setInterval(tente,1000);dispatchEvent(new Event('golems:nouvelle-version'));tente()};
  const verifie=async()=>{const v=await lit();if(!v)return;if(!ref){ref=v;return}if(v===ref)return;if(v.split('|')[0]!==ref.split('|')[0])signale();else correctif()};
  $('majRecharger').onclick=()=>location.reload();
  window.nouvelleVersion=signale;document.addEventListener('golems:versionAncienne',signale);
  verifie();setInterval(verifie,5*60*1000);
  if(/^(localhost|127\.0\.0\.1)$/.test(location.hostname)){window.__golemsVersion=verifie;window.__golemsCalme=calme}
})();
