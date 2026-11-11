/* Partie : moteur en service, sauvegarde, lancement, file d'animations, des, son, fin de partie, recapitulatif, enregistrement. */
/* Partie : graine + journaux dans la presence, tout le reste est recalcule. */
/* M : moteur en service. Le rejeu le remplace le temps de la partie par le moteur archive de sa version (moteurs/moteur-<v>.js). */
const M0=window.GolemsMoteur;let M=M0;
/* Versions archivees dans moteurs/ : en ajouter une a chaque nouvelle version du moteur (voir README). */
const MOTEURS_ARCHIVES=['0.2','0.2.1','0.2.2','0.2a.1','0.2a.2','0.2b','0.2b.1','0.2b.2','0.2c','0.3','0.4','0.5'];
const versionMoteur=v=>v==='0.2a'?'0.2':v;
const rejeuPossible=R=>!!(R&&typeof R.v==='string'&&Number.isInteger(R.graine)&&Array.isArray(R.j)&&(versionMoteur(R.v)===M0.VERSION||MOTEURS_ARCHIVES.includes(versionMoteur(R.v))));
const moteursCharges={};
function chargeMoteur(v){
  v=versionMoteur(v);
  if(v===M0.VERSION)return Promise.resolve(M0);
  if(moteursCharges[v])return moteursCharges[v];
  return moteursCharges[v]=new Promise((ok,ko)=>{
    const s=document.createElement('script');s.src='moteurs/moteur-'+v+'.js';
    s.onload=()=>{const m=window.GolemsMoteur;window.GolemsMoteur=M0;s.remove();if(m&&m!==M0&&m.VERSION===v){moteursCharges[v].__m=m;ok(m)}else{delete moteursCharges[v];ko(new Error('moteur '+v))}};
    s.onerror=()=>{window.GolemsMoteur=M0;s.remove();delete moteursCharges[v];ko(new Error('moteur '+v+' introuvable'))};
    document.head.append(s);
  });
}
const REDUIT=matchMedia('(prefers-reduced-motion:reduce)');
/* Graines terminees ou quittees : jamais relancees par majPartie. */
const grainesFinies=new Set();
const ZONE=matchMedia('(min-width:1200px)');
const ICONES={
 force:'<svg width="66" height="66" viewBox="71 35 458 529"><path d="M300 98 L285 98 Q210 152 144 164 L144 370 L281 490 Z" fill="#bf6049" stroke="#bf6049" stroke-width="1.5" stroke-linejoin="round"/><path d="M300 98 L315 98 Q390 152 456 164 L456 367 L281 490 Z" fill="#8a3524" stroke="#8a3524" stroke-width="1.5" stroke-linejoin="round"/><path d="M281.2 52 L300 52 L300 98 L285 98Z" fill="#d27a5e" stroke="#d27a5e" stroke-width="1.5" stroke-linejoin="round"/><path d="M300 52 L318.8 52 L315 98 L300 98Z" fill="#a4452f" stroke="#a4452f" stroke-width="1.5" stroke-linejoin="round"/><path d="M318.8 52 Q398.7 112 499.75 126 L456 164 Q390 152 315 98Z" fill="#d27a5e" stroke="#d27a5e" stroke-width="1.5" stroke-linejoin="round"/><path d="M499.75 126 L499.75 390 L456 367 L456 164Z" fill="#70291b" stroke="#70291b" stroke-width="1.5" stroke-linejoin="round"/><path d="M499.75 390 L325.85 512 L295.3 534 L280 547 L281 490 L456 367Z" fill="#551d13" stroke="#551d13" stroke-width="1.5" stroke-linejoin="round"/><path d="M280 547 L100.25 390 L144 370 L281 490Z" fill="#a4452f" stroke="#a4452f" stroke-width="1.5" stroke-linejoin="round"/><path d="M100.25 390 L100.25 126 L144 164 L144 370Z" fill="#d27a5e" stroke="#d27a5e" stroke-width="1.5" stroke-linejoin="round"/><path d="M100.25 126 Q201.3 112 281.2 52 L285 98 Q210 152 144 164Z" fill="#efb096" stroke="#efb096" stroke-width="1.5" stroke-linejoin="round"/><path d="M160 180 Q222 166 288 116" fill="none" stroke="#ffe3d6" stroke-opacity=".55" stroke-width="7" stroke-linecap="round"/><path d="M281.2 52 L318.8 52 Q398.7 112 499.75 126 L499.75 390 L325.85 512 L295.3 534 L280 547 L100.25 390 L100.25 126 Q201.3 112 281.2 52Z" fill="none" stroke="#0b0a10" stroke-width="34" stroke-linejoin="round"/></svg>',
 bouclier:'<path fill="currentColor" stroke="#0a121a" stroke-width="5" stroke-linejoin="round" d="M33 3L59 14V40L33 63L7 40V14Z"/>',
 degat:'<path fill="currentColor" d="M38 3L12 37H29L24 63L54 25H36Z"/>',
 manche:'<path fill="none" stroke="currentColor" stroke-width="5" stroke-linejoin="round" stroke-linecap="round" d="M16 6H50V30C50 42 42 50 33 58C23 50 16 42 16 30Z"/><path fill="currentColor" d="M33 15L37 25L47 26L39 33L42 43L33 37L24 43L27 33L19 26L29 25Z"/>',
 tour:'<path fill="none" stroke="currentColor" stroke-width="5" stroke-linecap="round" stroke-linejoin="round" d="M16 5H50M16 59H50M20 5V15C20 25 33 26 33 32C33 38 20 39 20 49V59M46 5V15C46 25 33 26 33 32C33 38 46 39 46 49V59"/><path fill="currentColor" d="M26 18H40L33 28ZM24 57C25 48 31 45 33 42C35 45 41 48 42 57Z"/>',
 coupe:'<svg viewBox="-6 -6 312 318" width="100%" height="100%" aria-hidden="true">'+ETOILE_G+'</svg>',
 main:'<g fill="var(--panneau2)" stroke="currentColor" stroke-width="5" stroke-linejoin="round"><rect x="9" y="17" width="23" height="36" rx="4" transform="rotate(-18 20 35)"/><rect x="34" y="17" width="23" height="36" rx="4" transform="rotate(18 45 35)"/><rect x="21" y="9" width="24" height="38" rx="4"/></g>',
 deck:'<g fill="var(--panneau2)" stroke="currentColor" stroke-width="5" stroke-linejoin="round"><rect x="23" y="5" width="30" height="42" rx="4"/><rect x="17" y="11" width="30" height="42" rx="4"/><rect x="11" y="17" width="30" height="42" rx="4"/></g>',
 oeil:'<path fill="none" stroke="currentColor" stroke-width="6" stroke-linejoin="round" d="M4 33C14 17 23 12 33 12S52 17 62 33C52 49 43 54 33 54S14 49 4 33Z"/><circle cx="33" cy="33" r="10" fill="currentColor"/>',
 defausse:'<g fill="none" stroke="currentColor" stroke-width="5" stroke-linejoin="round" stroke-linecap="round"><rect x="13" y="7" width="38" height="50" rx="5" transform="rotate(7 32 32)"/><path d="M23 23L41 41M41 23L23 41"/></g>'};
function ico(n){const s=document.createElement('span');s.className='ico';s.setAttribute('aria-hidden','true');s.innerHTML=n==='enclume'?enclumeB():'<svg viewBox="0 0 66 66">'+ICONES[n]+'</svg>';return s}
function points(n,lib){const d=el('span','p-pts');d.setAttribute('role','img');d.setAttribute('aria-label',lib+' '+n+' sur 3');
  for(let i=1;i<=3;i++)d.append(el('i',i===n?'on':i<n?'fait':''));return d}
function info(cls,n,lib,suite){const d=el('div','p-info '+cls);d.append(el('small','',lib),ico(n),suite);return d}
function compteur(n,lib,v,cls){const d=el('span','p-compteur c-'+n+(cls?' '+cls:''));d.append(ico(n),lib+' ');d.append(el('b','',String(v)));return d}
function oeilCode(i){
  const w=el('span','champ-code'),b=el('button','oeil oeil-code');b.type='button';b.append(ico('oeil'));i.before(w);w.append(i,b);
  if(i.id)b.setAttribute('aria-controls',i.id);i.setAttribute('autocapitalize','off');i.setAttribute('autocorrect','off');i.spellcheck=false;
  const montre=v=>{const f=document.activeElement===i,a=i.selectionStart,z=i.selectionEnd,s=i.selectionDirection;
    i.type=v?'text':'password';b.classList.toggle('actif',v);b.setAttribute('aria-label',v?'Masquer le code':'Afficher le code');
    if(f&&a!=null)try{i.setSelectionRange(a,z,s)}catch(e){}};
  montre(false);b.onmousedown=e=>e.preventDefault();b.onclick=()=>montre(i.type==='password');
  if(i.form)i.form.addEventListener('submit',()=>montre(false),true);
  const v=i.closest('.voile');if(v)new MutationObserver(()=>{if(v.hidden)montre(false)}).observe(v,{attributes:true,attributeFilter:['hidden']});
}
document.querySelectorAll('input[type=password]').forEach(oeilCode);
function pub(p){if(r)envoiPub=r.presence(p).catch(()=>{})}
function finPartie(){arreteGuide();M=M0;clearTimeout(rejeuT);rejeuT=0;{const b=$('barreRejeu');if(b)b.remove()}arreteAnim();clearTimeout(robotT);robotT=0;fermeAide();stopCompte();jePret=false;$('vueTas').hidden=true;$('absence').hidden=true;partie=null;fx=[];derniereAdv=null;zoneSurvol=null;fermeRecap();arreteDes();$('partie').hidden=true;$('jouer').classList.remove('enJeu');if(window.DIFFUSION&&DIFFUSION.joueur)DIFFUSION.joueur()}
function nouveauSid(){return Math.random().toString(36).slice(2,12)}
/* Sauvegarde locale par code de salon */
function cleSalon(c){return 'golems.partie.'+c}
function oublie(c){notePublic(c,false);try{localStorage.removeItem(LS(cleSalon(c)));if(lire('golems.derniere')===c)localStorage.removeItem(LS('golems.derniere'))}catch(e){}}
function sauve(){
  if(partie&&(partie.rejeu||partie.tuto))return; /* partie guidee : ni reprise ni sauvegarde */
  if(partie&&partie.local){ecrire('golems.local',JSON.stringify({version:M.VERSION,niveau:partie.niveau,debut:partie.debut,graine:partie.graine,mien:partie.mien,sien:partie.sien,decks:partie.decks,deckNom:partie.deckNom,recapVu:partie.recapVu,classe:partie.classe||null,fin:!!(partie.etat&&partie.etat.fin),t:Date.now()}));return}
  if(!partie||!code)return;
  ecrire(cleSalon(code),JSON.stringify({version:M.VERSION,debut:partie.debut,pseudo:pseudo,decks:partie.decks,deckNom:partie.deckNom,graine:partie.graine,mien:partie.mien,sien:partie.sien,place:partie.moi,arrivee:arrivee,sid:sid,adv:partie.adv,advNom:partie.advNom,recapVu:partie.recapVu,veut:partie.veut,classe:partie.classe||null,fin:!!(partie.etat&&partie.etat.fin),t:Date.now()}));
  ecrire('golems.derniere',code);
}
function chargeSalon(c){
  try{
    const v=JSON.parse(lire(cleSalon(c)));
    const liste=x=>Array.isArray(x)&&x.every(e=>typeof e==='string');
    if(!v||!memeVersion(v.version)||v.fin||Date.now()-v.t>7200000)return null;
    if(!Number.isInteger(v.graine)||(v.place!==0&&v.place!==1)||!(v.arrivee>0)||typeof v.sid!=='string'||!liste(v.mien)||!liste(v.sien))return null;
    return v;
  }catch(e){return null}
}
function salonRepris(){const c=lire('golems.derniere');return c&&/^[a-z0-9]{3,8}$/.test(c)&&chargeSalon(c)?c:null}
function majReprise(){
  const c=r?null:salonRepris();$('reprise').hidden=!c;
  $('repriseRobot').hidden=!chargeLocal();
  if(c)$('repriseCode').textContent=c.toUpperCase();
}
$('reprendre').onclick=()=>{const c=salonRepris();if(room&&c&&!occupe)entre(c)};
$('oublier').onclick=()=>{const c=lire('golems.derniere');if(c)oublie(c);majReprise()};
/* Entrainement : meme moteur et meme ecran, le journal du robot est rempli ici, sans salon. */
function chargeLocal(){
  try{
    const v=JSON.parse(lire('golems.local')),liste=x=>Array.isArray(x)&&x.every(e=>typeof e==='string');
    if(!v||!memeVersion(v.version)||v.fin||Date.now()-v.t>7200000||!Number.isInteger(v.graine)||!liste(v.mien)||!liste(v.sien))return null;
    return v;
  }catch(e){return null}
}
function oublieLocal(){try{localStorage.removeItem(LS('golems.local'))}catch(e){}}
function lanceLocal(v){
  if(partie)finPartie();
  $('erreurJeu').textContent='';
  const dc=deckChoisi(),g=v?v.graine:nouvelleGraine();
  lancer(g,0,'',{mien:v?v.mien:[],sien:v?v.sien:[],advNom:'Golem',niveau:v?v.niveau:niveauChoisi,recapVu:v?v.recapVu:0,debut:v&&v.debut,local:true,
    decks:v&&Array.isArray(v.decks)?v.decks:[dc.texte,deckRobot(g)],deckNom:v?v.deckNom:dc.nom,classe:v?v.classe||null:classeEnAttente});
  classeEnAttente=null;
}
/* 0.6 : classee contre un Golem (bouton « Affronter un Golem » du salon classe, onglets/jouer.js). Le robot est choisi par l'Elo (GolemsClasse.niveauRobot),
   son deck tire par deckRobot(graine) comme a l'entrainement. partie.classe = { robot: 'facile|normal|difficile', eloAdv, profil (avant), sa: code du salon } ;
   salons/<sa>/robot a ete pose juste avant (onglets/jouer.js), sinon les regles refusent la partie. */
let classeEnAttente=null;
function lanceClasseRobot(profil,sa){
  const C=window.GolemsClasse,n=C.niveauRobot(profil.elo),R=C.ROBOTS?C.ROBOTS[n]:null;
  classeEnAttente={robot:n,eloAdv:R?R.elo:profil.elo,profil:{elo:profil.elo,parties:profil.parties||0,partiesTotal:profil.partiesTotal||0,v:profil.v||0,d:profil.d||0,robots:profil.robots||null},sa:sa||''};
  niveauChoisi=n;oublieLocal();lanceLocal(null);
}
/* 0.6 : classee entre joueurs. partie.classe = { sa: code du salon, a, b : uids des places 0 et 1, profil (le mien avant), eloAdv } ;
   les deux profils classes sont lus des le lancement (ecran de fin) puis relus par le service au moment d'ecrire. */
function prepareClasse(c){
  const S=typeof serviceClasse==='function'?serviceClasse():null;if(!S||!c||c.robot||c.profil||c.prep)return;c.prep=1; /* 0.6.1 : relance possible (reprise, fin) */
  const B=room.classeBase(),u=room.compte.uid(),adv=c.a===u?c.b:c.a;
  Promise.all([B.lit('classe/joueurs/'+u),B.lit('classe/joueurs/'+adv)]).then(([m,o])=>{
    if(partie&&partie.classe===c&&!c.res&&m&&o){c.profil={elo:m.elo,parties:m.parties||0,partiesTotal:m.partiesTotal||0,v:m.v||0,d:m.d||0};c.eloAdv=o.elo;sauve();if(partie.etat&&partie.etat.fin)finClasse(partie.etat)}
  },e=>console.warn('classe',e)).finally(()=>{delete c.prep});
}
/* Fin d'une classee (robot ou joueur) : variation estimee tout de suite par commun/classe.js pour l'ecran de fin (partie.classe.res),
   puis ecriture Firebase par le service (classe/parties/<id>, confirmation, profil, classement) ; la valeur ecrite remplace l'estimation.
   Partie pas encore appliquee (adversaire qui n'a pas confirme, coupure) : gardee en attente, nouvel essai au chargement. */
function finClasse(s){
  const c=partie&&partie.classe;if(!c||c.res||!s||!s.fin)return;
  if(!c.profil){prepareClasse(c);return} /* 0.6.1 : profils pas encore lus : relus, puis finClasse rappele */
  const C=window.GolemsClasse,w=s.fin.gagnant,g=w===null||w===undefined?'nul':w===partie.moi,A=C.appliquePartie(c.profil,c.eloAdv,g,{robot:!!c.robot}),apres=A.joueur;
  c.res={gagne:g,avant:c.profil.elo,apres:apres.elo,delta:A.delta,placement:C.enPlacement(c.profil),profil:apres};
  const e=envoieClasse(c,w,partie.graine);Object.defineProperty(c,'envoi',{value:e,configurable:true}); /* non enumerable : hors sauvegarde */
  return e;
}
/* Classee entre joueurs : UN SEUL cote ecrit, le perdant (commun/classe.js finJoueurs) ; le gagnant n'ecrit rien et ecoute son profil
   (S.attends) puis met a jour son ecran de fin, sa capsule (chargeClasse -> majRangMoi) et son historique avec la valeur ecrite.
   Le perdant garde sa fin sur l'appareil (FINS_CL) tant qu'elle n'est pas ecrite : coupure avant l'ecriture = nouvel essai au chargement (reessaie). */
async function envoieClasse(c,w,gr){
  const S=typeof serviceClasse==='function'?serviceClasse():null;if(!S)return;
  const C=window.GolemsClasse,u=room.compte.uid(),id=c.robot?C.creePartieRobot({sa:c.sa,gr,a:'',profilA:c.profil,niveau:c.robot,gagne:false,saison:0}).id:C.idPartie(c.sa,gr);
  attenteClasse(id,true);
  try{
    let j=null;
    if(c.robot){const o={sa:c.sa,gr,niveau:c.robot,gagne:w===partie.moi};finRobotAttente(u,o,true);const r=await S.finRobot(o);if(r.fait){finRobotAttente(u,o,false);j=await room.classeBase().lit('classe/joueurs/'+u)}}
    else{
      const o={sa:c.sa,gr,a:c.a,b:c.b,gagnant:w===0?c.a:w===1?c.b:null};
      /* 0.6.1 : forfait de l'adversaire (salons/<sa>/forfait/<gr>.u = perdant) : le gagnant ecrit la partie et les deux profils. */
      const f=o.gagnant===u?await room.lit('salons/'+c.sa+'/forfait/'+gr).catch(()=>null):null,perd=o.gagnant===c.a?c.b:c.a;
      if(o.gagnant===u&&f&&f.u===perd){finEnAttente(u,o,true,true);const r=await S.finForfait(o);if(r.fait&&r.faitAdv)finEnAttente(u,o,false);if(r.fait)j=await room.classeBase().lit('classe/joueurs/'+u)}
      else if(o.gagnant===u)j=await S.attends(id);
      else{finEnAttente(u,o,true);const r=await S.finJoueurs(o);if(r.fait){finEnAttente(u,o,false);j=await room.classeBase().lit('classe/joueurs/'+u)}}
    }
    if(j){attenteClasse(id,false);
      if(c.res&&j.dern===id){c.res.delta=Math.round(j.elo-c.res.avant);c.res.apres=j.elo;c.res.profil=j;c.res.ecrit=true;sauve();histoClasse(partie.graine+'-'+partie.debut,c.res.delta)}}
  }catch(e){console.warn('classe',e)}
  if(typeof chargeClasse==='function')chargeClasse();
}
/* Variation ecrite reportee sur l'entree d'historique de la partie (en memoire et dans l'envoi en attente). */
function histoClasse(hid,delta){
  const f=x=>{if(x&&x.classe&&(x.classe.delta!==delta||x.classe.attente)){x.classe.delta=delta;delete x.classe.attente;return true}return false};
  try{if(compteCo())(room.compte.donnees().historique||[]).filter(x=>x&&x.id===hid).forEach(x=>{if(f(x)&&room.compte.majHisto)room.compte.majHisto(x).catch(e=>console.warn('historique',e))})}catch(e){}
  if(typeof majAttente==='function'&&litListe(ATTENTE).some(y=>y&&y.id===hid&&y.h))majAttente(hid,y=>f(y.h));
}
/* Fins de classees du perdant pas encore ecrites (coupure avant ou pendant l'ecriture) : rejouees au chargement. */
const FINS_CL='golems.classeFins';
function finEnAttente(u,o,on,ff){const id=GolemsClasse.idPartie(o.sa,o.gr),l=litListe(FINS_CL).filter(x=>x&&x.id!==id);if(on)l.unshift(ff?{id,u,o,f:1}:{id,u,o}); /* f : victoire par forfait (le gagnant ecrit les deux profils) */ecrire(FINS_CL,JSON.stringify(l.slice(0,20)))}
/* 0.6.1 : classee contre le robot aussi gardee (r = { sa, gr, niveau, gagne }) tant que finRobot n'a pas abouti. */
function finRobotAttente(u,o,on){const id='r:'+GolemsClasse.idPartie(o.sa,o.gr),l=litListe(FINS_CL).filter(x=>x&&x.id!==id);if(on)l.unshift({id,u,r:o});ecrire(FINS_CL,JSON.stringify(l.slice(0,20)))}
/* 0.6.1 : classee contre le robot laissee en cours (onglet ferme, rechargement) : comptee comme une defaite (abandon). */
function abandonLocalClasse(u){
  let v=null;try{v=JSON.parse(lire('golems.local'))}catch(e){}
  if(!v||v.fin||!v.classe||!v.classe.robot||!Number.isInteger(v.graine)||(partie&&partie.local&&partie.graine===v.graine))return;
  if(v.classe.res)return; /* fin deja calculee (ecriture en attente dans FINS_CL) */
  finRobotAttente(u,{sa:v.classe.sa||'',gr:v.graine,niveau:v.classe.robot,gagne:false},true);oublieLocal();
  if(typeof majReprise==='function')majReprise();
}
async function reprendFins(){
  const S=typeof serviceClasse==='function'?serviceClasse():null;if(!S)return;const u=room.compte.uid();
  abandonLocalClasse(u);
  for(const x of litListe(FINS_CL).filter(y=>y&&y.u===u&&(y.o||y.r)))
    try{
      if(x.r){const r=await S.finRobot(x.r);if(r.fait){finRobotAttente(u,x.r,false);if(typeof attenteClasse==='function')attenteClasse(r.id,false)}continue}
      if(x.f){const r=await S.finForfait(x.o);if(r.fait&&r.faitAdv)finEnAttente(u,x.o,false);if(r.fait&&typeof attenteClasse==='function')attenteClasse(r.id,false);continue}
      const r=await S.finJoueurs(x.o);if(r.fait){finEnAttente(u,x.o,false);if(typeof attenteClasse==='function')attenteClasse(r.id,false)}
    }catch(e){console.warn('classe',e)}
  /* Reprise garantie : toute classee de la saison ou je figure sans fait/<moi> est appliquee (et la part de l'adversaire si
     le perdant a confirme ou a ete declare forfait) ; la variation ecrite remplace « en attente » dans l'historique. */
  try{const l=await S.rattrape();if(!l.length||room.compte.uid()!==u)return;
    const hs=(room.compte.donnees().historique||[]).concat(litListe(ATTENTE).filter(y=>y&&y.u===u&&y.h).map(y=>y.h));
    for(const r of l){if(!Number.isInteger(r.delta))continue;if(typeof attenteClasse==='function')attenteClasse(r.id,false);
      for(const h of hs)if(h&&h.classe&&typeof h.id==='string'&&h.id.indexOf(r.gr+'-')===0&&(h.classe.attente||h.classe.delta!==r.delta))histoClasse(h.id,r.delta)}
    await histoRattrape(u,l);
  }catch(e){console.warn('classe',e)}
}
/* 0.6a : classee appliquee (fait/<moi>) dont l'entree d'historique n'a jamais ete ecrite (ecriture perdue sous coupures) :
   entree reconstruite depuis classe/parties, une seule fois (relue sur le serveur, une entree par graine), sans toucher a l'Elo.
   Seulement les parties recentes (3 jours) et plus recentes que la plus ancienne des 50 gardees : les anciennes sont sans effet.
   Une entree complete encore en attente sur cet appareil (golems.enAttente) est laissee a son envoi. */
async function histoRattrape(u,l){
  if(!compteCo()||room.compte.uid()!==u||!room.compte.rattrapeHisto)return;
  const C=window.GolemsClasse,h=room.compte.donnees().historique||[],att=litListe(ATTENTE).filter(y=>y&&y.u===u&&y.h).map(y=>String(y.h.id));
  const min=h.length>=50?Math.min(...h.map(x=>+x.date||0)):0,deb=Date.now()-3*86400000;let n=0;
  for(const r of l){const p=r.partie;if(!p||!(+p.t>=deb&&+p.t>min)||att.some(i=>i.indexOf(r.gr+'-')===0))continue;
    try{if(await room.compte.aHistoServeur(r.gr))continue;
      const adv=p.a===u?p.b:p.a;let nom='';if(p.robot!==true)try{const c=await room.classeBase().lit('classe/classement/'+adv);nom=c&&typeof c.pseudo==='string'?c.pseudo:''}catch(e){}
      if(!nom&&p.robot!==true)try{nom=await room.lit('joueurs/'+adv+'/pseudo')||''}catch(e){}
      const x=C.entreeRattrapee(p,u,nettoie(String(nom||'')));if(x&&await room.compte.rattrapeHisto(x))n++}catch(e){console.warn('historique',e)}}
  if(n&&!$('historique').hidden&&typeof peintHisto==='function')peintHisto();
}
/* Reconnexion : reprise des classees en attente (sans attendre le prochain chargement). */
if(window.golemsSalon)Promise.resolve(window.golemsSalon).then(x=>{if(x&&x.onConnection)x.onConnection(()=>{if(x.connected&&x.connected()&&compteCo()&&!reprendFins.cours){reprendFins.cours=true;reprendFins().finally(()=>{reprendFins.cours=false;if(typeof chargeClasse==='function')chargeClasse()})}})}).catch(()=>{});
/* 0.6 : deck du Golem tire dans la reserve (decks conseilles) a partir de la graine de la partie : meme graine = meme deck, rejeux exacts (le deck est aussi garde dans partie.decks). Partie guidee : deck fixe (onglets/tutoriel.js). */
function deckRobot(g){
  const R=(window.GolemsDonnees.interface.decksConseilles)||[];if(!R.length)return '';
  let h=Math.imul((g|0)^0x9E3779B9,2654435761);h^=h>>>15;h=Math.imul(h,0x85EBCA6B);h^=h>>>13;
  return M.deckTexte(R[(h>>>0)%R.length].cartes);
}
function suiteRobot(){
  clearTimeout(robotT);robotT=0;
  if(!partie||!partie.local||partie.rejeu||!partie.etat)return;
  const s=partie.etat,lui=1-partie.moi;
  if(s.fin||!M.attendus(s).includes(lui))return;
  const a0=M.robot(s,lui,partie.niveau);
  robotT=setTimeout(()=>{
    if(!partie||!partie.local)return;
    if(!$('recap').hidden||desActif||animCours){suiteRobot();return}
    partie.sien.push(M.code(a0));calcule();
  },a0.t==='p'?1000:a0.t==='x'?700:450);
}
document.querySelectorAll('[data-niveau]').forEach(b=>{b.onclick=()=>choisirDeck(()=>{niveauChoisi=b.dataset.niveau;oublieLocal();lanceLocal(null)})});
$('repriseRobot').onclick=()=>{const v=chargeLocal();if(v)lanceLocal(v)};
function lancer(g,moi,adv,sv){
  const dks=sv&&Array.isArray(sv.decks)&&sv.decks.length===2?sv.decks.map(t=>typeof t==='string'?t:''):['',''];
  partie={classe:sv&&sv.classe||null,decks:dks,deckNom:sv&&typeof sv.deckNom==='string'?sv.deckNom:'',rejeu:sv&&sv.rejeu||null,debut:sv&&+sv.debut||Date.now(),local:!!(sv&&sv.local),tuto:!!(sv&&sv.tuto),niveau:sv&&sv.niveau||'normal',graine:g,moi:moi,mien:sv?sv.mien:[],sien:sv?sv.sien:[],etat:null,erreur:null,veut:!!(sv&&sv.veut),adv:adv||'',advNom:sv&&typeof sv.advNom==='string'?nettoie(sv.advNom):'',recapVu:sv?+sv.recapVu||0:0};
  CARTES.forEach(c=>{new Image().src=imgV('cartes/'+c[0]+'.jpg')});M.TERRAINS.forEach(T=>{new Image().src=srcTerrain(T)});new Image().src=DOS;
  notice='';sel=null;selMull=[];selCases=[];modeVaisseau=false;modeFaille=false;modeCaramel=false;modeLove=false;modeTarte=false;fx=[];journalPage=null;journalReperes=0;
  fermeRecap();derniereAdv=null;zoneSurvol=null; /* revanche : rien de la partie precedente (bilan de manche, derniere carte adverse) */
  stopCompte();jePret=false;
  pub({jg:g,j:M.ecritJournal(partie.mien),veut:partie.veut?g:null,adv:partie.adv||null,pret:null});
  if(room)room.presence({salon:null}).catch(()=>{});
  $('salon').hidden=true;$('accueil').hidden=true;$('partie').hidden=false;$('jouer').classList.add('enJeu');
  calcule();placeChat();
}
function calcule(){
  const jx=(m,o)=>M.rejoue(partie.graine,partie.moi===0?[m,o]:[o,m],partie.decks);
  const x=jx(partie.mien,partie.sien),av=partie.etat,nm=partie.lusM||0,ns=partie.lusS||0,n=partie.mien.length-nm+partie.sien.length-ns;
  partie.lusM=partie.mien.length;partie.lusS=partie.sien.length;
  /* Une serie d'etapes par action, la meme sur les deux ecrans ; trop d'actions d'un coup (reprise) : rien a rejouer. */
  if(av&&n>0&&n<=8&&!x.erreur){
    let pr=av;const me=partie.moi,cours=[];
    for(let i=nm;i<partie.mien.length;i++)cours.push([me,partie.mien.slice(0,i+1),partie.sien.slice(0,ns),partie.mien[i]]);
    for(let i=ns;i<partie.sien.length;i++)cours.push([1-me,partie.mien,partie.sien.slice(0,i+1),partie.sien[i]]);
    cours.forEach(([p,m,o,c])=>{
      const y=jx(m,o);if(y.erreur)return;
      const L=etapes(pr,y.etat,M.decode(c),p);
      if(!animCours&&!fileA.length&&!partie.ecran)partie.ecran=pr;
      fileA.push(...L);pr=y.etat;
    });
  }
  partie.etat=x.etat;partie.erreur=x.erreur;
  if(x.etat&&x.etat.fin&&!partie.rejeu&&!partie.tuto&&partie.classe)finClasse(x.etat);
  if(x.etat&&x.etat.fin&&!partie.rejeu&&!partie.tuto)enregistrePartie(x.etat); /* partie guidee : hors historique et profil */
  if(x.etat&&x.etat.fin&&!partie.local&&!partie.rejeu&&!partie.tuto)grainesFinies.add(partie.graine);
  affiche();
  lanceFile();
  verifieRecap();
  sauve();
  suiteRobot();
  choixFinal();
}
/* Fin de la manche 3 : un choix de fin de manche (Carrousel : defausse, Buzzer : ordre du deck) ne change plus le score.
   Il est joue tout de suite, avec le meme coup qu'un clic (premiere carte de la main, ordre garde), pour que la partie
   atteigne sa fin et soit enregistree meme si le gagnant quitte aussitot. En ligne, chaque ecran ne joue que son choix. */
function choixFinal(){
  if(!partie||partie.rejeu||partie.tuto||partie.erreur)return;
  const s=partie.etat,a=s&&s.attente;
  if(!a||s.fin||s.manche!==3||!s.fil)return;
  if(a.p!==partie.moi&&!partie.local)return;
  let c=null;
  if(a.t==='b')c={t:'b',o:a.options.slice()};
  else{const l=M.legales(s,a.p);if(a.t==='d')c=l.find(x=>x.t==='d'&&x.c===s.j[a.p].main[0])||l[0];else c=l[0]}
  if(!c)return;
  if(a.p===partie.moi)joue(c);else{clearTimeout(robotT);robotT=0;partie.sien.push(M.code(c));calcule()}
}
function quiJoue(s){return s.attente?s.attente.p:s.joueur}
function texteTour(s,me){
  const qui=quiJoue(s),aMoi=!s.fin&&(s.phase==='mulligan'?!s.mull[me]:qui===me);
  return s.fin?'Partie terminée':s.phase==='mulligan'?(aMoi?'À toi : mulligan':'Mulligan'):qui===me?'À toi':'Au tour de '+nomJ(qui);
}
/* Effets visuels : liste datee, reposee apres chaque rendu avec un delai negatif, donc jamais rejouee. */
const VITESSES={normal:1,rapide:.5};
let vitesse=lire('golems.vitesse')==='rapide'?'rapide':'normal';
const vite=()=>sauter||document.hidden||$('jouer').hidden;
const T=ms=>ms*VITESSES[vitesse]*(fileA.length>30?.3:fileA.length>12?.6:1);
function ajoutFx(o,ms){if(vite())return;const n=Date.now();ms=T(ms);o.debut=n;o.fin=n+ms;o.ms=ms;fx.push(o);poseUn(o,n)}
function caseDe(p,l,k){return '.p-case[data-p="'+p+'"][data-l="'+l+'"][data-k="'+k+'"]'}
function poseUn(o,n){
  const z=$('partie').querySelector(o.q);if(!z)return;
  let e=z;
  if(o.mini)e=z.querySelector('.mini')||z;
  if(o.eclat)z.append(e=el('span',o.classe));
  else if(o.texte)z.append(e=el('span',o.classe,o.texte));
  else if(o.fantome){e=o.fantome();e.classList.add('fx-fantome');z.append(e)}
  else{e.classList.remove(o.classe);void e.offsetWidth;e.classList.add(o.classe)}
  if(o.c)e.style.setProperty('--c',o.c);
  e.style.animationDuration=o.ms+'ms';e.style.animationDelay=(o.debut-n)+'ms';
}
function poseFx(){
  const n=Date.now(),box=$('partie');fx=fx.filter(o=>o.fin>n);
  tenus.forEach(t=>{const z=box.querySelector(t.q);if(z)z.append(t.vue())});
  fx.forEach(o=>poseUn(o,n));
  masques.forEach(q=>{const z=box.querySelector(q);if(z)z.classList.add('fx-cache')});
  peintFin();
}
function peintFin(){
  const f=ecranFin,box=$('partie');if(!f||!partie)return;
  const me=partie.moi;
  box.querySelectorAll('.p-terrain[data-k]').forEach(d=>{
    const k=+d.dataset.k,a=d.querySelector('b.m'),b=d.querySelector('b.a'),w=f.gagnants[k];
    if(a){a.textContent=f.comptes[k][me];b.textContent=f.comptes[k][1-me];a.classList.remove('tete');b.classList.remove('tete')}
    d.classList.toggle('g-moi',w===me);d.classList.toggle('g-lui',w===1-me);
  });
  const x=box.querySelector('.p-score b'),y=box.querySelector('.p-score em');
  if(x){x.textContent=f.score[me];y.textContent=f.score[1-me]}
}
const rectDe=q=>{const z=q&&$('partie').querySelector(q);return z?z.getBoundingClientRect():null};
function piles(p,nom){return p===partie.moi?'.pile.'+nom:'.p-camp.lui .c-'+nom}
function cadre(r,hm){const h=Math.max(r.height,hm),w=h*5/7,cl=(v,m)=>Math.max(4,Math.min(v,m-4));return {x:cl(r.left+r.width/2-w/2,innerWidth-w),y:cl(r.top+r.height/2-h/2,innerHeight-h),w}}
const tf=c=>'translate('+c.x+'px,'+c.y+'px) scale('+c.w/200+')';
function carteVol(src){const d=el('div','v-carte'),i=el('img');i.src=src;i.alt='';d.append(i);$('scene').append(d);return d}
function vol(de,vers,src,ms,delai){
  if(vite()||REDUIT.matches||!de||!vers)return;
  if(document.documentElement.classList.contains('dif-joueur'))return; /* vue joueur : le vol est celui de diffusion.js (pas de double) */
  const d=carteVol(src),a=d.animate([{transform:tf(cadre(de,56))},{transform:tf(cadre(vers,56))}],{duration:T(ms),delay:T(delai||0),easing:'cubic-bezier(.3,.7,.3,1)',fill:'both'});
  a.finished.finally(()=>d.remove()).catch(()=>{});
}
const srcC=c=>imgV('cartes/'+M.carte(c).id+'.jpg'),DOS=imgV('cartes/verso.jpg');
/* Image du terrain, rendue par generer_terrains.py ; le texte de regle reste dans moteur.js. */
/* 0.4a : valeur affichee d'un terrain en jeu. Le Tournoi (etoile « ? » sur la carte) : valeur de la manche en cours ; Les Pronos : mises de la manche en plus. */
function valTerrain(Mx,s,k){const T=s.terrains[k],v=Mx.ptsTerrain?Mx.ptsTerrain(s,k):T.pts,n=Mx.miseTotale&&effetTerrain(T,'paris')?Mx.miseTotale(s):0,tou=!!effetTerrain(T,'pointsManche');
  return {v,txt:(tou?'? = ':'')+v+(v>1?' pts':' pt')+(n?' +'+n:''),long:v+(v>1?' points':' point')+(tou?' à cette manche':'')+(n?', '+n+(n>1?' mises':' mise'):'')}}
const srcTerrain=T=>imgV('cartes/t'+String(window.GolemsMoteur.TERRAINS.findIndex(x=>x.nom===T.nom)+1).padStart(3,'0')+'.jpg');
/* Carte jouee : grande au centre environ 1,5 s, puis glissade vers sa case. */
function montreGrand(c,de,vers){
  if(vite()||document.documentElement.classList.contains('dif-joueur'))return 0; /* vue joueur : « Derniere carte jouee » et le vol de diffusion.js suffisent */
  /* Ordinateur : la carte s'affiche dans la zone d'apercu sous les piles, puis glisse vers sa case. */
  const zo=zoneEl(),zi=zo&&zo.querySelector('.p-ap-img'),zr=zi&&zi.getBoundingClientRect(); /* 0.4a : cadre de l'image de la zone (carte a gauche, texte a droite) */
  if(zo&&zr.height>120&&zr.bottom>0&&zr.top<innerHeight){
    const h=Math.min(zr.height,zr.width*7/5),w=h*5/7,C={x:zr.left+zr.width/2-w/2,y:zr.top+zr.height/2-h/2,w};
    zo.classList.add('vol');const tot=T(1950);setTimeout(()=>zo.classList.remove('vol'),tot);
    const d=carteVol(srcC(c));
    if(REDUIT.matches){const a=d.animate([{opacity:0,transform:tf(C)},{opacity:1,transform:tf(C),offset:.1},{opacity:1,transform:tf(C),offset:.9},{opacity:0,transform:tf(C)}],{duration:T(1500)});a.finished.finally(()=>d.remove()).catch(()=>{});return T(1500)}
    const A=de?cadre(de,56):C,B=vers?cadre(vers,56):C;
    const a=d.animate([{transform:tf(A)},{transform:tf(C),offset:.14},{transform:tf(C),offset:.62},{transform:tf(B)}],{duration:tot,easing:'ease-in-out',fill:'both'});
    a.finished.finally(()=>d.remove()).catch(()=>{});
    return tot;
  }
  const h=Math.min(innerHeight*.62,420,(innerWidth-24)*7/5),w=h*5/7,C={x:innerWidth/2-w/2,y:innerHeight/2-h/2,w};
  const d=carteVol(srcC(c));
  if(REDUIT.matches){const a=d.animate([{opacity:0,transform:tf(C)},{opacity:1,transform:tf(C),offset:.1},{opacity:1,transform:tf(C),offset:.9},{opacity:0,transform:tf(C)}],{duration:T(1500)});a.finished.finally(()=>d.remove()).catch(()=>{});return T(1500)}
  const A=de?cadre(de,56):C,B=vers?cadre(vers,56):C,tot=T(1950);
  const a=d.animate([{transform:tf(A)},{transform:tf(C),offset:.14},{transform:tf(C),offset:.77},{transform:tf(B)}],{duration:tot,easing:'ease-in-out',fill:'both'});
  a.finished.finally(()=>d.remove()).catch(()=>{});
  return tot;
}
function etoile(de,txt){
  const v=rectDe('.p-info.score');if(vite()||REDUIT.matches||!de||!v)return;
  const d=el('div','v-etoile');d.append(ico('coupe'),el('b','',txt));$('scene').append(d);
  const f=(r,s)=>'translate('+(r.left+r.width/2-30)+'px,'+(r.top+r.height/2-30)+'px) scale('+s+')';
  const a=d.animate([{transform:f(de,.6)},{transform:f(de,1.5),offset:.3},{transform:f(v,.7)}],{duration:T(700),easing:'ease-in',fill:'both'});
  a.finished.finally(()=>d.remove()).catch(()=>{});
}
function trace(a,b,coul,eclair,ms){
  if(vite()||!a||!b)return;
  const x0=a.left+a.width/2,y0=a.top+a.height/2,x1=b.left+b.width/2,y1=b.top+b.height/2;
  let dp='M'+x0+' '+y0;
  if(eclair){const nx=-(y1-y0),ny=x1-x0,n=Math.hypot(nx,ny)||1;for(let i=1;i<7;i++){const t=i/7,o=(i%2?1:-1)*(8+Math.random()*12);dp+='L'+(x0+(x1-x0)*t+nx/n*o)+' '+(y0+(y1-y0)*t+ny/n*o)}}
  dp+='L'+x1+' '+y1;
  const ns='http://www.w3.org/2000/svg',s=document.createElementNS(ns,'svg'),p=document.createElementNS(ns,'path');
  p.setAttribute('d',dp);p.setAttribute('class','v-lien');p.style.stroke=coul;p.style.color=coul;p.style.animationDuration=T(ms)+'ms';s.append(p);$('scene').append(s);
  setTimeout(()=>s.remove(),T(ms));
}
/* File : chaque etape renvoie sa duree. Le rendu reste vrai pour la main et les boutons ; seul le plateau attend. */
function lanceFile(){if(!animCours&&fileA.length){animCours=true;clearTimeout(animT);animT=setTimeout(suivant,0)}}
function suivant(){
  clearTimeout(animT);
  while(fileA.length){
    if(!partie){arreteAnim();return}
    const e=fileA.shift();let ms=0;
    try{ms=e()||0}catch(x){console.error(x)}
    if(!vite()&&ms>0){animT=setTimeout(suivant,ms);return}
  }
  finFile();
}
function finFile(){
  const av=verrou||ecranFin||partie&&partie.ecran;
  animCours=false;verrou=false;ecranFin=null;tenus=[];masques=[];
  $('passer').hidden=true;
  if(!partie)return;
  partie.ecran=null;
  if(av)affiche();
  verifieRecap();
}
function arreteAnim(){clearTimeout(animT);fileA=[];animCours=false;verrou=false;ecranFin=null;tenus=[];masques=[];$('scene').textContent='';$('passer').hidden=true;if(partie)partie.ecran=null}
$('passer').onclick=()=>{sauter=true;$('scene').textContent='';fx=[];suivant();sauter=false};
function fixe(st,ajout){partie.ecran=st;if(ajout)tenus=tenus.concat(ajout);if(repeint){repeint();poseFx()}}
function libere(q){masques=masques.filter(x=>x!==q);const z=$('partie').querySelector(q);if(z)z.classList.remove('fx-cache')}
const voisinsDe=(l,k)=>[[l-1,k],[l+1,k],[l,k-1],[l,k+1]].filter(([a,b])=>a>=0&&a<3&&b>=0&&b<3);
function traitActif(st,p,l,k,e){const G=st.j[p].grille;return !!G[l][k]&&M.carte(G[l][k].c).el.includes(e)&&voisinsDe(l,k).some(([a,b])=>G[a][b]&&M.carte(G[a][b].c).el.includes(e))}
function actifs(st){
  const t={},c={};
  for(let p=0;p<2;p++)for(let l=0;l<3;l++)for(let k=0;k<3;k++){
    const G=st.j[p].grille,g=G[l][k];if(!g)continue;const E=M.carte(g.c).el;
    [[l,k+1],[l+1,k]].forEach(([x,y])=>{const n=G[x]&&G[x][y];if(n)E.filter(e=>M.carte(n.c).el.includes(e)).forEach(e=>{t[[p,l,k,x,y,e]]={p,l,k,x,y,e}})});
    const f=st.j[1-p].grille[l][k],m=f&&E.find(e=>M.carte(f.c).el.includes(M.DOMINE[e]));
    if(m)c[[p,l,k]]={p,l,k,e:m};
  }
  return {t,c};
}
const COUL=e=>'var(--'+e+')';
function lienSteps(L,av,s){
  const A=actifs(av),B=actifs(s),nT=Object.keys(B.t).filter(x=>!A.t[x]).map(x=>B.t[x]),nC=Object.keys(B.c).filter(x=>!A.c[x]).map(x=>B.c[x]),vu={};
  nT.forEach(o=>L.push(()=>{
    trace(rectDe(caseDe(o.p,o.l,o.k)),rectDe(caseDe(o.p,o.x,o.y)),COUL(o.e),false,1000);
    [[o.l,o.k],[o.x,o.y]].forEach(([l,k])=>{
      const q=caseDe(o.p,l,k);ajoutFx({q,classe:'fx-lien',eclat:true,c:COUL(o.e)},1000);
      const cle=o.p+':'+l+k+o.e;if(M.TRAIT_CUMULE)ajoutFx({q,classe:'fx-bonus',texte:'+1'},1300); /* 0.2.1 : chaque nouveau lien donne +1 aux deux bouts */
      else if(!vu[cle]&&!traitActif(av,o.p,l,k,o.e)){vu[cle]=1;ajoutFx({q,classe:'fx-bonus',texte:'+1'},1300)}
    });
    return T(650);
  }));
  nC.forEach(o=>L.push(()=>{
    const q=caseDe(o.p,o.l,o.k);
    trace(rectDe(q),rectDe(caseDe(1-o.p,o.l,o.k)),COUL(o.e),true,800);
    ajoutFx({q,classe:'fx-lien',eclat:true,c:COUL(o.e)},800);ajoutFx({q,classe:'fx-bonus',texte:'+1'},1300);
    return T(550);
  }));
  L.push(()=>{ /* Voisins de Cyrdan, soins : le reste du gain de Force. */
    for(let p=0;p<2;p++)for(let l=0;l<3;l++)for(let k=0;k<3;k++){
      const u=av.j[p].grille[l][k],w=s.j[p].grille[l][k];if(!u||!w||u.c!==w.c)continue;
      const g=M.forceDe(s,p,l,k)-M.forceDe(av,p,l,k);
      const dej=(M.TRAIT_CUMULE?nT.filter(o=>o.p===p&&((o.l===l&&o.k===k)||(o.x===l&&o.y===k))).length:M.carte(w.c).el.filter(e=>traitActif(s,p,l,k,e)&&!traitActif(av,p,l,k,e)).length)+(nC.some(o=>o.p===p&&o.l===l&&o.k===k)?1:0);
      if(g-dej>0)ajoutFx({q:caseDe(p,l,k),classe:'fx-bonus',texte:'+'+(g-dej)},1300);
    }
    return 0;
  });
}
/* Le Q (Seul contre tous) : « X : Il suffit, détruit A, B (adverse) ; C est protégé (Mode Avion). » -> [{nom,adv}] des cartes detruites, null sinon. */
function ilSuffitNoms(x){
  const m=/: Il suffit, détruit (.+?)(?: ; .*)?\.$/.exec(x);if(!m)return null;
  return m[1].split(', ').map(n=>{const a=/ \(adverse\)$/.test(n);return {nom:a?n.slice(0,-10):n,adv:a}});
}
/* Noms du journal vers cases : les morts du moteur, vague par vague. */
function vaguesDe(av,s,lignes,act){ /* act : action jouee (Il suffit : Seul contre tous qui se detruit a sa pose) */
  const pris={},cherche=(nom,pq)=>{ /* pq : joueur impose (Il suffit), sinon les deux */
    for(let p=0;p<2;p++)for(let l=0;l<3;l++)for(let k=0;k<3;k++){
      const a=av.j[p].grille[l][k],b=s.j[p].grille[l][k],c=p+''+l+k;
      if((pq===undefined||p===pq)&&a&&!b&&!pris[c]&&M.nomDetail(M.carte(a.c))===nom){pris[c]=1;return {p,l,k,c:a.c}}
    }
    return null};
  return lignes.map(([q,x])=>{
    let m=/^(.+) (?:meurent|meurt)\.$/.exec(x),v=null;const is=ilSuffitNoms(x);
    if(is){v={noms:is.map(o=>o.nom),perte:false,secoue:true};v.cases=is.map(o=>cherche(o.nom,o.adv?1-q:q)).filter(Boolean); /* Le Q : destruction simultanee, une seule vague */
      /* la carte posee se detruit elle-meme : absente de av (case vide ou base remplacee), sa vue vient d'un etat ou elle est posee */
      if(act&&act.t==='p'&&!s.j[q].grille[act.l][act.k]&&!v.cases.some(c=>c.p===q&&c.l===act.l&&c.k===act.k)&&is.some(o=>!o.adv&&o.nom===M.nomDetail(M.carte(act.c)))){
        const st=JSON.parse(JSON.stringify(av));st.j[q].grille[act.l][act.k]={c:act.c,f:M.carte(act.c).force,d:0};v.cases.push({p:q,l:act.l,k:act.k,c:act.c,st})}
      return v}
    if(m)v={noms:m[1].split(' et '),perte:false};
    else if((m=/^La Nuit au Village : (.+) est détruit\.$/.exec(x)))v={noms:[m[1]],perte:false,secoue:true};
    else{const e=[...x.matchAll(/(?:^|\. )([^.:]+?) meurt ensuite/g)];if(e.length)v={noms:e.map(q=>q[1].trim()),perte:true}}
    if(v)v.cases=v.noms.map(n=>cherche(n)).filter(Boolean);
    return v;
  });
}
function etapesLignes(L,av,s,lignes,a){
  const vagues=vaguesDe(av,s,lignes,a),touche=(cs,n)=>{
    cs.forEach(([p,l,k])=>{const q=caseDe(p,l,k);ajoutFx({q,classe:'fx-deg',texte:'-'+n},1500);ajoutFx({q,classe:'fx-frappe'},500)});
    if(cs.length*n>=3&&!REDUIT.matches)ajoutFx({q:'.p-plateau',classe:'fx-secoue'},500);
    return T(cs.length?700:0);
  };
  const des=(p,nom,vals,f)=>L.push(()=>{if(vite())return 0;lanceDes(p,nom,vals,f);return REDUIT.matches?1700:2700});
  let mort=false;
  lignes.forEach(([p,x],i)=>{
    let m=/^Alrevan lance le dé : Force (\d+)\.$/.exec(x);
    if(m)des(p,'Alrevan',[+m[1]],+m[1]);
    m=/^Alrevan \(KEKWRevan\) lance (\d) et (\d) : Force (\d+)\.$/.exec(x);
    if(m)des(p,'Alrevan (KEKWRevan)',[+m[1],+m[2]],+m[3]);
    m=/^Le Plateau de Jeu lance (\d) : (.+)\.$/.exec(x);
    if(m)des(p,'Le Plateau de Jeu',[+m[1]],m[2]);
    /* Gamba d'Apo (029, ou copiee par le Maitre du deguisement ou Le chansonnier) : de, puis 2 degats a Apo (1-2) ou en face (5-6). Case d'Apo : la pose, ou l'attente de copie. */
    m=/^(Apo|(?:Apo \(Maître du déguisement\)|Velnen \(Le chansonnier\)) \(Gamba\)) lance (\d) : (.+)\.$/.exec(x);
    if(m){const v=+m[2],o=a&&a.t==='p'?[a.l,a.k]:a&&(a.t==='k'||a.t==='i')&&av.attente&&av.attente.i?av.attente.i:null;
      des(p,m[1]==='Apo'?'Apo (Gamba)':m[1],[v],m[3].charAt(0).toUpperCase()+m[3].slice(1));
      if(o&&/perd 2 de Force$/.test(m[3]))L.push(()=>touche([[v<=2?p:1-p,o[0],o[1]]],2))}
    if(/^Glad : Slam, .* perd 1 de Force\.$/.test(x)&&a&&a.t==='h')L.push(()=>touche([[1-p,a.m,a.n]],1));
    /* Le Q : Jour de peche, la carte defaussee vole du deck adverse a sa defausse (face visible : elle y est publique) */
    if(/: Jour de pêche, (défausse |regarde la dernière carte du deck adverse et la défausse)/.test(x))L.push(()=>{const q=1-p,nv=s.j[q].defausse.filter(c=>!av.j[q].defausse.includes(c));
      nv.forEach((c,i)=>vol(rectDe(piles(q,'deck')),rectDe(piles(q,'defausse')),srcC(c),500,i*120));return T(nv.length?500:0)});
    if(/^Slim K : 1 dégât/.test(x)&&a&&a.t==='p'){const c=[];[0,1,2].forEach(k=>{if(M.ciblable(av,1-p,a.l,k,p))c.push([1-p,a.l,k])});L.push(()=>touche(c,1))}
    if(/^(Kiwi|Jacen et Jaina) part à la défausse : son maître/.test(x))L.push(()=>{aniPartis(av,s,p,450,0);return T(300)});
    if(x==='KaTarN perd 4 de Force.'){const c=[];for(let l=0;l<3;l++)for(let k=0;k<3;k++){const g=av.j[p].grille[l][k];if(g&&effetDe(M.carte(g.c).id,'pertesFinManche'))c.push([p,l,k])}L.push(()=>touche(c,4))}
    m=/: \+(\d+) points?\.$/.exec(x);
    if(m){const n=+m[1];L.push(()=>{etoile(rectDe('.p-plateau'),'+'+n);return T(700)},()=>{if(ecranFin)ecranFin.score[p]+=n;peintFin();ajoutFx({q:'.p-info.score',classe:'bascule'},700);return 0})}
    m=p!==null&&RE_DV.exec(x); /* deck vide (meule) : l'etoile part du deck de celui qui n'a pas pu piocher, le point va a l'autre */
    if(m){const n=+m[1];L.push(()=>{etoile(rectDe(piles(p,'deck'))||rectDe('.p-plateau'),'+'+n);return T(700)},()=>{if(ecranFin)ecranFin.score[1-p]+=n;peintFin();ajoutFx({q:'.p-info.score',classe:'bascule'},700);return 0})}
    const v=vagues[i];
    if(v&&v.cases.length){mort=true;L.push(()=>{
      v.cases.forEach(c=>{
        const q=caseDe(c.p,c.l,c.k);
        tenus=tenus.filter(t=>t.q!==q);$('partie').querySelectorAll(q+' .fx-tenu').forEach(z=>z.remove());
        if(v.perte)ajoutFx({q,classe:'fx-deg',texte:'-1'},1100);
        ajoutFx({q,fantome:()=>miniVue(c.st||av,c.p,c.l,c.k)},1100);
        vol(rectDe(q),rectDe(piles(c.p,'defausse')),srcC(c.c),450,650);
      });
      if(v.secoue&&!REDUIT.matches)ajoutFx({q:'.p-plateau',classe:'fx-secoue'},500);
      return T(500);
    })}
  });
  if(mort)L.push(()=>{ /* Survivants qui perdent un bonus. */
    for(let p=0;p<2;p++)for(let l=0;l<3;l++)for(let k=0;k<3;k++){
      const u=av.j[p].grille[l][k],w=s.j[p].grille[l][k];
      if(u&&w&&u.c===w.c&&u.d===w.d){const d=M.forceDe(av,p,l,k)-M.forceDe(s,p,l,k);if(d>0)ajoutFx({q:caseDe(p,l,k),classe:'fx-deg',texte:'-'+d},1200)}
    }
    return T(500);
  });
}
/* 0.5 : animaux partis (maitre detruit ou remplace, Kiwi apres le decompte) : la carte vole de la case du maitre a la defausse */
function aniPartis(av,s,p,du,de){for(let l=0;l<3;l++)for(let k=0;k<3;k++){const g=av.j[p].grille[l][k],w=s.j[p].grille[l][k];
  if(g&&g.ani&&!(w&&w.ani&&w.ani.c===g.ani.c))vol(rectDe(caseDe(p,l,k)),rectDe(piles(p,'defausse')),srcC(g.ani.c),du,de)}}
function tenusDe(av,s,lignes,act){
  return vaguesDe(av,s,lignes,act).filter(Boolean).flatMap(v=>v.cases).map(c=>({q:caseDe(c.p,c.l,c.k),vue:()=>{const m=miniVue(c.st||av,c.p,c.l,c.k);m.classList.add('fx-tenu');return m}}));
}
function etapesDecompte(L,av,s,lignes){
  const me=partie.moi,cols=me===0?[0,1,2]:[2,1,0],D=s.dernier,S=[av.j[0].score,av.j[1].score];
  L.push(()=>{ecranFin={comptes:[[0,0],[0,0],[0,0]],gagnants:{},score:S.slice()};$('passer').hidden=false;fixe(av);return T(350)});
  /* Mignonitude (Kiwi) : Golems exclus du decompte, marques jusqu'a la fin de l'animation ; Kiwi part a la defausse. */
  const ex=(D&&D.exclus)||[],exclu=(p,l,k)=>ex.some(x=>x.q===p&&x.l===l&&x.k===k);
  if(ex.length)L.push(()=>{
    ex.forEach(x=>{const q=caseDe(x.q,x.l,x.k);ajoutFx({q,classe:'fx-hors',texte:'Hors décompte'},7000);ajoutFx({q,classe:'fx-frappe'},500)});
    for(let p=0;p<2;p++)aniPartis(av,s,p,500,400);
    return T(1100)});
  cols.forEach(k=>{
    [0,1,2].forEach(l=>[me,1-me].forEach(p=>{
      const g=av.j[p].grille[l][k];if(!g||M.carte(g.c).animal)return;
      const hx=exclu(p,l,k),n=hx?0:M.forceDe(av,p,l,k);
      L.push(()=>{ecranFin.comptes[k][p]+=n;peintFin();ajoutFx({q:caseDe(p,l,k),classe:'fx-compte',texte:hx?'+0':'+'+n},650);return T(240)});
    }));
    const w=D.gagnants[k],pts=M.ptsTerrain?M.ptsTerrain(av,k):s.terrains[k].pts; /* 0.4a : Le Tournoi vaut la manche */
    L.push(()=>{ecranFin.gagnants[k]=w;peintFin();return T(320)});
    if(w!==null)L.push(()=>{etoile(rectDe('.p-terrain[data-k="'+k+'"]'),'+'+pts);return T(700)},()=>{ecranFin.score[w]+=pts;peintFin();ajoutFx({q:'.p-info.score',classe:'bascule'},700);return 0});
  });
  L.push(()=>{fixe(s,tenusDe(av,s,lignes));return T(300)});
  etapesLignes(L,av,s,lignes,null);
  L.push(()=>T(500));
}
function etapes(av,s,a,p){
  const me=partie.moi,L=[],neuf=s.log.slice(av.log.length),dec=s.reperes.length>av.reperes.length;
  const avant=dec?neuf.slice(0,s.reperes[s.reperes.length-1][0]-av.log.length):neuf,apres=dec?neuf.slice(s.reperes[s.reperes.length-1][1]-av.log.length):[];
  const bouge=['w','y','e','h','k','i'].includes(a.t); /* 0.2a.2 : h = Slam de Glad ; k = copie du Deguisement (029e) ; i = Imitation (041e) */
  L.push(()=>{sonsDe(av,s);return 0});
  if(a.t==='p'){
    const de=p===me?rectDe('.p-slot[data-c="'+a.c+'"]'):null,q=caseDe(p,a.l,a.k),old=av.j[p].grille[a.l][a.k];
    L.push(()=>montreGrand(a.c,de||rectDe('.p-camp.lui'),rectDe(q)));
    L.push(()=>{
      if(p!==me){derniereAdv=a.c;zoneMaj()}
      if(old)vol(rectDe(q),rectDe(piles(p,'defausse')),srcC(old.c),500);
      fixe(s,tenusDe(av,s,avant,a));
      ajoutFx({q,classe:'arrive',mini:true},480);
      if(M.carte(a.c).base)ajoutFx({q,classe:'fx-evo',eclat:true},1950);
      return T(M.carte(a.c).base?900:300);
    });
    if(neuf.some(x=>/^Le Versus : .* perd 1 de Force/.test(x[1]))){ /* 0.4a : Le Versus, frappe et -1 sur le Golem adverse ici (comme la tarte) */
      const lv=[0,1,2].find(l=>{const g=av.j[1-p].grille[l][a.k];return g&&!M.carte(g.c).animal});
      if(lv!==undefined){const qv=caseDe(1-p,lv,a.k);L.push(()=>{ajoutFx({q:qv,classe:'fx-frappe'},500);ajoutFx({q:qv,classe:'fx-deg',texte:'-1'},1100);return T(550)})}
    }
  }else if(a.t==='z'){ /* Caramel a volonte : +1 energie */
    L.push(()=>{ajoutFx({q:caseDe(p,a.l,a.k),classe:'fx-bonus',texte:'+1'},1300);if(p===me)ajoutFx({q:'.p-camp.toi .c-enclume',classe:'bascule'},750);return T(450)});
  }else if(a.t==='o'){ /* 0.4a : tarte du Cirque, frappe et -1 sur le Golem adverse vise */
    const q=caseDe(1-p,a.l,indexTerrainEffet(s,'cirque'));
    L.push(()=>{ajoutFx({q,classe:'fx-frappe'},500);ajoutFx({q,classe:'fx-deg',texte:'-1'},1100);return T(550)});
  }else if(a.t==='t'){ /* 0.4a : mise des Pronos, +1 sur le terrain, l'energie bascule */
    const q='.p-terrain[data-k="'+indexTerrainEffet(s,'paris')+'"]';
    L.push(()=>{ajoutFx({q,classe:'fx-bonus',texte:'+1'},1300);if(p===me)ajoutFx({q:'.p-camp.toi .c-enclume',classe:'bascule'},750);return T(450)});
  }else if(a.t==='f'||a.t==='s'||a.t==='j'){ /* j : Forge eclair de Spom */
    const de=p===me?rectDe('.p-slot[data-c="'+a.c+'"]'):rectDe('.p-camp.lui .c-main');
    L.push(()=>{vol(de,rectDe(piles(p,'forge')),p===me?srcC(a.c):DOS,600);return T(600)});
  }else if(a.t==='d'){
    const de=p===me?rectDe('.p-slot[data-c="'+a.c+'"]'):rectDe('.p-camp.lui .c-main');
    L.push(()=>{vol(de,rectDe(piles(p,'defausse')),p===me||partie.rejeu?srcC(a.c):DOS,500);return T(500)}); /* defausse adverse de dos, comme sa pioche */
  }else if(bouge){
    L.push(()=>{fixe(s,tenusDe(av,s,avant));
      for(let q=0;q<2;q++)for(let l=0;l<3;l++)for(let k=0;k<3;k++){const u=av.j[q].grille[l][k],w=s.j[q].grille[l][k];if(w&&(!u||u.c!==w.c))ajoutFx({q:caseDe(q,l,k),classe:'arrive',mini:true},480)}
      return T(450)});
  }
  if(dec)etapesDecompte(L,av,s,apres);
  else{
    if(a.t!=='p'&&!bouge)L.push(()=>{fixe(s,tenusDe(av,s,avant));return 0});
    etapesLignes(L,av,s,avant,a);
    if(a.t==='p'||bouge)lienSteps(L,av,s);
  }
  /* Pioche : face visible pour soi, de dos cote adverse. */
  const vus=av.j[me].main,neuves=s.j[me].main.filter(c=>!vus.includes(c)),pq=c=>'.p-slot[data-c="'+c+'"]';
  if(neuves.length){
    neuves.forEach(c=>masques.push(pq(c)));
    L.push(()=>{neuves.forEach((c,i)=>vol(rectDe(av.j[me].forge.includes(c)?'.pile.forge':'.pile.deck'),rectDe(pq(c)),srcC(c),450,i*140));return T(450+140*(neuves.length-1))},()=>{neuves.forEach(c=>libere(pq(c)));return 0});
  }
  const n=s.j[1-me].main.length-av.j[1-me].main.length,nf=a.t==='x'&&p!==me?Math.max(0,Math.min(n,av.j[1-me].forge.length-s.j[1-me].forge.length)):0; /* reprise de Forge eclair adverse */
  if(n>0)L.push(()=>{for(let i=0;i<n;i++)vol(rectDe(i<nf?'.p-camp.lui .c-enclume':'.p-camp.lui .c-deck'),rectDe('.p-camp.lui .c-main'),DOS,420,i*140);return T(420+140*(n-1))});
  if(dec)verrou=true;
  return L;
}
/* Des : purement visuel, la valeur vient du journal du moteur. */
const PIPS={1:[[50,50]],2:[[30,30],[70,70]],3:[[30,30],[50,50],[70,70]],4:[[30,30],[70,30],[30,70],[70,70]],5:[[30,30],[70,30],[50,50],[30,70],[70,70]],6:[[30,27],[70,27],[30,50],[70,50],[30,73],[70,73]]};
function deSvg(v){
  return '<svg viewBox="0 0 100 100" role="img" aria-label="Dé : '+v+'"><path fill="#f4f7f9" stroke="#0a121a" stroke-width="5" stroke-linejoin="round" d="M20 5C40 3 62 4 81 6C92 8 95 16 95 26C97 45 96 63 94 80C93 91 85 95 75 95C55 97 38 96 20 94C9 93 5 85 5 75C3 56 4 38 6 21C7 11 11 6 20 5Z"/>'+PIPS[v].map(([x,y])=>'<circle cx="'+x+'" cy="'+y+'" r="8.5" fill="#0a121a"/>').join('')+'</svg>';
}
function lanceDes(p,nom,vals,force){fileDes.push({p,nom,vals,force});if(!desActif)deSuivant()}
function arreteDes(){desActif=false;fileDes=[];clearInterval(desT);clearTimeout(desF);$('des').hidden=true}
function deSuivant(){
  const o=fileDes.shift(),b=$('des');
  if(!o||!partie){desActif=false;b.hidden=true;return}
  desActif=true;
  const h=el('h3','',(o.p===partie.moi?'Toi':nomJ(o.p))+' : '+o.nom),fa=el('div','faces'),res=el('p');
  b.textContent='';b.append(h,fa,res);b.hidden=false;
  const faces=a=>{fa.innerHTML=a.map(deSvg).join('')};
  const finit=()=>{clearInterval(desT);b.classList.remove('roule');faces(o.vals);res.textContent=typeof o.force==='number'?'Force '+o.force:o.force;desF=setTimeout(deSuivant,1700)};
  if(REDUIT.matches){finit();return}
  b.classList.add('roule');
  const hasard=()=>faces(o.vals.map(()=>1+Math.floor(Math.random()*6)));
  hasard();desT=setInterval(hasard,90);desF=setTimeout(finit,1000);
}
/* Aide rapide */
function fermeAide(){if($('aide').hidden)return;$('aide').hidden=true;const b=$('btnAide');if(b)b.focus()}
$('aideFermer').onclick=fermeAide;
$('aide').onclick=e=>{if(e.target===$('aide'))fermeAide()};
/* Mode daltonien (0.5) : body.daltonien affiche les reperes (fleches, !, Animal). Desactive par defaut, memorise sur l'appareil seulement (aucune preference de compte).
   Interrupteurs synchronises (input.dal-case) : bandeau du site, barre d'outils de la partie, diffusion / vue spectateur (window.interDal). */
{const K='golems.daltonien';let on=false;try{on=localStorage.getItem(K)==='1'}catch(e){}
 const app=v=>{on=v;document.body.classList.toggle('daltonien',v);document.querySelectorAll('input.dal-case').forEach(c=>{c.checked=v})};
 const lie=c=>{c.checked=on;c.onchange=()=>{app(c.checked);try{localStorage.setItem(K,c.checked?'1':'0')}catch(e){}}};
 window.interDal=(texte='Mode daltonien')=>{const lb=el('label','pf-inter dal-inter'),cb=el('input','dal-case'),tx=el('span','pf-itx',texte);cb.type='checkbox';cb.setAttribute('role','switch');cb.setAttribute('aria-label','Mode daltonien');
   lb.title='Mode daltonien : flèches sur la Force modifiée, « ! » sur une carte fautive, mot « Animal » dans les listes.';lie(cb);lb.append(tx,cb,el('span','pf-glis'));return lb};
 lie($('daltonienCase'));app(on);addEventListener('storage',e=>{if(e.key===K)app(e.newValue==='1')})}
/* Son : aucun AudioContext avant un clic, rien ne passe par la presence ni le journal. */
let sonOn=lire('golems.son')==='1',actx=null;
function armeSon(){
  if(!actx){const A=window.AudioContext||window.webkitAudioContext;if(!A)return;try{actx=new A()}catch(e){return}}
  if(actx.state==='suspended')actx.resume().catch(()=>{});
}
addEventListener('click',()=>{if(sonOn)armeSon()},true);
const SONS={ /* frequence, depart, duree, forme */
 pose:[[330,0,.07,'triangle']],
 degat:[[150,0,.11,'square']],
 mort:[[220,0,.13,'triangle'],[147,.1,.2,'triangle']],
 evo:[[440,0,.09,'triangle'],[587,.08,.09,'triangle'],[784,.16,.15,'triangle']],
 manche:[[392,0,.13,'sine'],[523,.12,.2,'sine']],
 victoire:[[523,0,.12,'triangle'],[659,.11,.12,'triangle'],[784,.22,.12,'triangle'],[1047,.33,.3,'triangle']],
 tour:[[660,0,.1,'sine']],
 arrivee:[[523,0,.12,'sine'],[784,.1,.18,'sine']]};
function joueSons(l){
  if(!sonOn||!actx||actx.state!=='running')return;
  let t=actx.currentTime+.01;
  l.forEach(n=>{
    let fin=0;
    SONS[n].forEach(([f,d,du,forme])=>{
      const o=actx.createOscillator(),g=actx.createGain(),a=t+d;o.type=forme;o.frequency.value=f;
      g.gain.setValueAtTime(.0001,a);g.gain.exponentialRampToValueAtTime(forme==='square'?.018:.05,a+.012);g.gain.exponentialRampToValueAtTime(.0001,a+du);
      o.connect(g);g.connect(actx.destination);o.start(a);o.stop(a+du+.02);fin=Math.max(fin,d+du);
    });
    t+=fin+.05;
  });
}
function sonsDe(av,s){
  const l=[],me=partie.moi,neuf=s.log.slice(av.log.length).map(x=>x[1]),a=r=>neuf.some(x=>r.test(x));
  let deg=false;
  for(let p=0;p<2;p++)for(let y=0;y<3;y++)for(let k=0;k<3;k++){const u=av.j[p].grille[y][k],v=s.j[p].grille[y][k];if(u&&v&&u.c===v.c&&v.d>u.d)deg=true}
  if(a(/^améliore /))l.push('evo');else if(a(/^(pose|remplace) /))l.push('pose');
  if(deg)l.push('degat');
  if(a(/ meur|est détruit/))l.push('mort');
  if(s.fin&&!av.fin)l.push(s.fin.gagnant===me?'victoire':'manche');
  else if(s.reperes.length>av.reperes.length)l.push('manche');
  if(!s.fin&&s.phase==='jeu'&&quiJoue(s)===me&&(av.phase!=='jeu'||quiJoue(av)!==me||av.tour!==s.tour||av.manche!==s.manche))l.push('tour');
  joueSons(l);
}
const SVG_SON='<svg viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="M3 9H7L13 4V20L7 15H3Z"/>';
function outils(){
  const d=el('div','p-outils'),q=el('button','p-outil','?'),m=el('button','p-outil'),v=el('button','p-outil');
  v.type='button';v.id='btnVitesse';
  const pv=()=>{v.textContent=vitesse==='rapide'?'>>':'>';const l='Vitesse des animations : '+(vitesse==='rapide'?'Rapide':'Normal');v.title=l;v.setAttribute('aria-label',l)};
  v.onclick=()=>{vitesse=vitesse==='rapide'?'normal':'rapide';ecrire('golems.vitesse',vitesse);pv()};pv();
  q.type=m.type='button';q.id='btnAide';m.id='btnSon';q.setAttribute('aria-label','Aide rapide');q.title='Aide rapide';
  q.onclick=()=>{$('aide').hidden=false;$('aideFermer').focus()};
  const peint=()=>{
    m.innerHTML=SVG_SON+(sonOn?'<path fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" d="M16 9C17.5 10.8 17.5 13.2 16 15M18.8 6.5C21.6 9.8 21.6 14.2 18.8 17.5"/>':'<path fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" d="M16 9.5L21 14.5M21 9.5L16 14.5"/>')+'</svg>';
    m.setAttribute('aria-pressed',sonOn);m.setAttribute('aria-label',sonOn?'Couper le son':'Activer le son');m.title=m.getAttribute('aria-label');
  };
  m.onclick=()=>{sonOn=!sonOn;ecrire('golems.son',sonOn?'1':'0');if(sonOn){armeSon();setTimeout(()=>joueSons(['tour']),60)}peint()};
  peint();d.append(window.interDal?interDal():'',v,q,m);return d;
}
/* Copie : d'abord execCommand dans le clic meme (iOS, WebView de Discord et appli installee refusent une copie faite plus tard),
   champ cache en lecture seule et selection complete ; sinon presse-papiers asynchrone ; sinon repli : selectionne (texte montre
   a l'ecran pour Ctrl+C) s'il est donne, ou fenetre avec le texte a copier a la main. surOk : seulement si la copie a reussi. */
function copie(txt,b,lib,selectionne,surOk){
  const ok=m=>{b.textContent=m;setTimeout(()=>{b.textContent=lib},1800)},reussi=()=>{ok('Copié');if(surOk)surOk()};
  const s=document.createElement('textarea');s.value=txt;s.readOnly=true;s.setAttribute('aria-hidden','true');
  s.style.cssText='position:fixed;top:0;left:0;width:1px;height:1px;opacity:0;font-size:16px';
  document.body.append(s);s.focus();s.select();try{s.setSelectionRange(0,txt.length)}catch(e){}
  let fait=false;try{fait=document.execCommand('copy')}catch(e){}
  s.remove();try{b.focus()}catch(e){}
  if(fait){reussi();return}
  const echec=()=>{const P=b.parentNode;let z=P&&P.nextElementSibling;if(P&&!(z&&z.classList.contains('copie-alerte'))){z=document.createElement('div');z.className='copie-alerte';P.after(z)}if(selectionne){selectionne();ok('Sélectionné : Ctrl+C');if(z)alerte(z,'Action impossible : presse-papiers bloqué. Texte sélectionné, appuie sur Ctrl+C.')}else{ok('Copie impossible');if(z)copieManuelle(z,txt)}};
  try{if(navigator.clipboard&&window.isSecureContext)navigator.clipboard.writeText(txt).then(reussi,echec);else echec()}catch(e){echec()}
}
/* Fin de partie : tout vient du journal, le moteur ne garde que la derniere manche. */
function parManche(s){
  return s.reperes.map((x,i)=>{
    const o={terrains:[],bonus:[0,0]};
    s.log.slice(x[0],x[1]).forEach(([p,t])=>{const m=/^marque (.+) \(\d+ contre \d+\) : \+(\d+)\.$/.exec(t);if(m)o.terrains.push({p,nom:m[1],pts:+m[2]})});
    s.log.slice(x[1],x[2]).forEach(([p,t])=>{const m=/: \+(\d+) points?\.$/.exec(t);if(m&&p!==null)o.bonus[p]+=+m[1]});
    o.pioche=piocheImpossible(s,i+1); /* deck vide (meule) : points recus quand l'adversaire n'a pas pu piocher, pendant la manche */
    return o;
  });
}
function lignesManche(o,nom){
  const l=o.terrains.map(x=>nom(x.p)+' : '+x.nom+' +'+x.pts);
  [0,1].forEach(p=>{if(o.bonus[p])l.push(nom(p)+' : bonus +'+o.bonus[p])});
  [0,1].forEach(p=>{if(o.pioche&&o.pioche[p])l.push(nom(p)+' : '+(nom(1-p)==='Toi'?'ton deck vide':'deck vide de '+nom(1-p))+' +'+o.pioche[p])});
  return l.length?l.join(', '):'aucun terrain gagné';
}
const pl=(n,m)=>n+' '+m+(n>1?'s':'');
const texteSources=c=>c.sources.map(q=>q.source+' : '+[q.degats?pl(q.degats,'dégât'):'',q.morts?pl(q.morts,'mort'):''].filter(Boolean).join(', ')).join(' ; ');
function ligneMvp(B){
  const x=B.mvp,P=M.POIDS_MVP;if(!x)return '';
  return 'MVP : '+nomComplet(x.carte)+', score '+x.score+' (Force sur terrains gagnés '+x.force+' x '+P.force+', bonus donnés '+x.bonus+' x '+P.bonus+', dégâts '+x.degats+' x '+P.degats+', morts '+x.morts+' x '+P.morts+')';
}
function lignesBilan(s,n){
  const B=M.bilan(s),l=(B.mvp?[ligneMvp(B)]:[]).concat('Bilan par carte');
  B.joueurs.forEach((J,p)=>{
    l.push(n(p)+' : infligés '+J.degats+', subis '+J.subis+', morts causées '+J.morts+', morts subies '+J.mortsSubies+(J.soins?', soins '+J.soins:'')+(J.piochesManquees?', pioches impossibles '+J.piochesManquees:''));
    J.cartes.forEach(c=>l.push('  '+c.carte+' : infligés '+c.degats+', subis '+c.subis+', morts causées '+c.morts+', morts subies '+c.mortsSubies+(c.soinsDonnes?', soins donnés '+c.soinsDonnes:'')+(c.sources.length?' ('+texteSources(c)+')':'')));
  });
  B.autres.forEach(o=>l.push('Autre source, '+o.source+' : '+pl(o.morts,'mort')));
  (B.mignonitude||[]).forEach(o=>l.push('Mignonitude, manche '+o.manche+' (Kiwi de '+n(o.joueur)+') : '+o.carte+' ne compte pas au décompte (Force '+o.force+')'));
  return l;
}
function vueBilan(s,nm){
  const B=M.bilan(s),d=el('details','b-fin');d.open=true;d.append(el('summary','','Bilan par carte'));
  B.joueurs.forEach((J,p)=>{
    d.append(el('h4',nm(p)==='Toi'?'h-moi':'h-lui',nm(p)+' : infligés '+J.degats+', subis '+J.subis+', morts causées '+J.morts+', morts subies '+J.mortsSubies+(J.soins?', soins '+J.soins:'')+(J.piochesManquees?', pioches impossibles '+J.piochesManquees:''))); /* K-Chan : soins donnes ; deck vide (meule) */
    if(!J.cartes.length){d.append(el('p','','Aucun Golem joué.'));return}
    const t=el('table','h-tab'),cg=el('colgroup');['c','n','n','n','n'].forEach(k=>cg.append(el('col','h-col-'+k)));t.append(cg);
    const h=el('tr');['Carte','Infligés','Subis','Morts causées','Morts subies'].forEach(x=>h.append(el('th','',x)));t.append(h);
    const cl=['','h-chaud','h-froid','h-chaud','h-froid'];
    J.cartes.forEach(c=>{
      const r=el('tr');[c.carte,c.degats,c.subis,c.morts,c.mortsSubies].forEach((x,k)=>{if(!k){const td=el('td','h-cn');td.append(carteHisto(x));r.append(td);return}r.append(el('td',+x?cl[k]:'h-zero',String(x)))});t.append(r);
      if(c.sources.length){const q=el('tr'),z=el('td','src',texteSources(c));z.colSpan=5;q.append(z);t.append(q)}
      if(c.soinsDonnes){const q=el('tr'),z=el('td','src','Soins donnés : '+c.soinsDonnes);z.colSpan=5;q.append(z);t.append(q)}
    });
    d.append(t);
  });
  B.autres.forEach(o=>d.append(el('p','',o.source+' : '+pl(o.morts,'mort'))));
  (B.mignonitude||[]).forEach(o=>d.append(el('p','b-mignon','Mignonitude, manche '+o.manche+' (Kiwi '+(nm(o.joueur)==='Toi'?'à toi':'de '+nm(o.joueur))+') : '+nomComplet(o.carte)+' ne compte pas au décompte (Force '+o.force+').')));
  return d;
}
/* Departage a egalite de points : true (moteur 0.2) ou 'force', 'terrains', 'second' (0.2.1). a = point de vue. */
function departageTxt(s,a,b){const d=s.fin.departage;
  if(d==='terrains')return 'Force totale '+s.forceTotale[a]+' partout, terrains conquis '+s.fin.terrains[a]+' contre '+s.fin.terrains[b];
  if(d==='second')return 'Force totale et terrains conquis à égalité, victoire au second joueur de la manche 3';
  return 'Force totale '+s.forceTotale[a]+' contre '+s.forceTotale[b]}
/* Resume a coller sur Discord (Markdown : ## titres, -# sous-texte, > citation, **gras**, lien masque avec apercu).
   Deux adaptateurs (fin de partie, Historique) vers une meme forme D, puis trois mises en forme : A (sans emoji), B (quelques emoji), C (compacte).
   Limite Discord de 2000 caracteres : niveaux 0 (complet), 1 (sans detail des terrains), 2 (sans chiffres), puis la forme C. */
const VD=(()=>{
const LIEN='https://les-golems.github.io',MAX=2000;
const NOM_EL={magma:'Magma',cristal:'Cristal',foudre:'Foudre',brume:'Brume',roche:'Roche'};
/* Echappe le Markdown de Discord dans les noms (pseudo_avec_tirets, *etoiles*...) et retire les @ (pas de mention). */
const esc=t=>String(t).replace(/@/g,'').replace(/([\\*_~`|<>\[\]#])/g,'\\$1');
const cap=t=>String(t).charAt(0).toUpperCase()+String(t).slice(1);
const els=l=>(Array.isArray(l)?l:[]).filter(x=>NOM_EL[x]).map(x=>NOM_EL[x]);

/* ---------- Adaptateur 1 : fin de partie (etat du moteur) ---------- */
function deFin(s){
  const me=partie.moi,B=M.bilan(s),rj=!!partie.rejeu;
  /* Replay : lance en local, l'adversaire est partie.advNom (« Golem » pour une partie contre l'ordinateur, niveau inconnu). */
  const robot=rj?/^Golem( \(|$)/.test(partie.advNom||''):!!partie.local;
  const nom=p=>p===me?(pseudo||'Joueur'):rj?advAff(nomJ(p)):robot?'Golem ('+cap(partie.niveau||'normal')+')':nomJ(p);
  const noms=[nom(0),nom(1)];
  const dn=p=>p===me?(rj?'':partie.decks&&partie.decks[me]?(partie.deckNom||'Deck'):'Deck par défaut'):(robot?'Deck par défaut':'');
  const decks=[0,1].map(p=>({nom:dn(p),els:els(elsTexte(s.decks[p]||DECK_TEST_TXT))}));
  const manches=parManche(s).map((o,i)=>{const pts=[0,0];o.terrains.forEach(t=>pts[t.p]+=t.pts);[0,1].forEach(p=>pts[p]+=o.bonus[p]+o.pioche[p]);
    const f=(B.terrains||[]).filter(t=>t.manche===i+1);
    return {pts,terrains:o.terrains.map(t=>{const z=f.find(y=>y.terrain===t.nom&&y.gagnant===t.p);return {p:t.p,nom:t.nom,pts:t.pts,forces:z&&z.forces?[z.forces[t.p],z.forces[1-t.p]]:null}}),bonus:o.bonus,pioche:o.pioche}});
  const m=B.mvp;
  return {noms,scores:[s.j[0].score,s.j[1].score],gagnant:s.fin.gagnant,abandon:s.fin.abandon,deckVide:s.fin.deckVide, /* 0.4 : deck vide */
    departage:s.fin.departage?departageTxt(s,s.fin.gagnant===1?1:0,s.fin.gagnant===1?0:1):'',
    mode:robot?'robot':'ligne',decks,manches,
    mvp:m?{carte:nomComplet(m.carte),p:m.joueur,score:m.score,force:m.force,bonus:m.bonus,degats:m.degats,morts:m.morts}:null,
    chiffres:B.joueurs.map(J=>({degats:J.degats,morts:J.morts})),
    version:patchSite(M.VERSION),nomsCourts:[0,1].map(p=>p===me?(pseudo||'Joueur'):robot?'Golem':nomJ(p))};
}

/* ---------- Adaptateur 2 : partie de l'Historique (x) ---------- */
function deHisto(x){
  const ps=x.pseudo||pseudo||'Joueur',adv=advAff(x.adv),noms=[ps,adv],robot=/^Golem \(/.test(adv);
  const sc=String(x.score||'0 - 0').split(' - ').map(Number);
  const advCourt=x.advNom||(robot?'Golem':adv);
  const qui=n=>n===ps||n==='Toi'?0:1; /* anciennes entrees : « Toi » */
  const manches=(Array.isArray(x.manches)?x.manches:[]).map(t=>{
    const o={pts:[0,0],terrains:[],bonus:[0,0],pioche:[0,0]};
    if(t==='aucun terrain gagné')return o;
    String(t).split(', ').forEach(z=>{let r=/^(.+) : bonus \+(\d+)$/.exec(z);if(r){o.bonus[qui(r[1])]+=+r[2];o.pts[qui(r[1])]+=+r[2];return}
      r=/^(.+) : (?:ton deck vide|deck vide de .+) \+(\d+)$/.exec(z)||/^(.+) : pioche impossible adverse \+(\d+)$/.exec(z);if(r){o.pioche[qui(r[1])]+=+r[2];o.pts[qui(r[1])]+=+r[2];return} /* deck vide (meule) */
      r=/^(.+) : (.+) \+(\d+)$/.exec(z);if(r){const p=qui(r[1]);o.terrains.push({p,nom:r[2],pts:+r[3],forces:null});o.pts[p]+=+r[3]}});
    return o;
  });
  const q=/score (\d+) \(Force sur terrains gagnés (\d+) x \d+, bonus donnés (\d+) x \d+, dégâts (\d+) x \d+, morts (\d+)/.exec(x.mvpLigne||'');
  const g=x.res==='Victoire'?0:x.res==='Défaite'?1:null;
  const bl=Array.isArray(x.bilan)?x.bilan:[];
  const chiffres=[0,1].map(p=>{const c=(bl[p]&&bl[p].cartes)||[];return {degats:c.reduce((a,z)=>a+(+z[1]||0),0),morts:c.reduce((a,z)=>a+(+z[3]||0),0)}});
  return {noms,scores:sc,gagnant:g,abandon:x.abandon==='moi'?0:x.abandon==='adv'?1:undefined,deckVide:x.deckVide==='moi'?0:x.deckVide==='adv'?1:undefined,departage:'',
    mode:robot?'robot':'ligne',
    decks:[x.deck&&typeof x.deck.nom==='string'?{nom:x.deck.nom==='Test'?'Deck par défaut':x.deck.nom,els:els(x.deck.els)}:{nom:'',els:[]},robot?{nom:'Deck par défaut',els:els(elsTexte(DECK_TEST_TXT))}:{nom:'',els:[]}],
    manches,mvp:x.mvp?{carte:nomComplet(x.mvp),p:g,score:q?+q[1]:null,force:q?+q[2]:null,bonus:q?+q[3]:null,degats:q?+q[4]:null,morts:q?+q[5]:null}:null,
    chiffres,version:(v=>v==='v?'?'inconnue':v)(versionAff(x)),nomsCourts:[ps,advCourt]};
}

/* ---------- Morceaux communs ---------- */
const N=(D,p)=>esc(D.noms[p]),C=(D,p)=>esc((D.nomsCourts||D.noms)[p]);
function resultat(D){
  const [a,b]=D.gagnant===1?[1,0]:[0,1];
  if(D.gagnant===null)return {titre:'Match nul, '+D.scores[0]+' partout',vainq:null};
  if(D.abandon!==undefined)return {titre:N(D,a)+' gagne par abandon',vainq:a,perd:b};
  if(D.deckVide!==undefined)return {titre:N(D,a)+' gagne par deck vide',vainq:a,perd:b}; /* 0.4 */
  return {titre:N(D,a)+' bat '+N(D,b)+', '+D.scores[a]+' à '+D.scores[b],vainq:a,perd:b};
}
const contexte=D=>(D.mode==='robot'?"Contre l'ordinateur":'Partie en ligne')+' - version '+esc(D.version);
const elsAff=l=>l.length===5?'les 5 éléments':l.join(', ');
const ligneDeck=(D,p)=>'**'+N(D,p)+'**'+(D.decks[p].nom?' - *'+esc(D.decks[p].nom)+'*':'')+(D.decks[p].els.length?' - '+elsAff(D.decks[p].els):'');
const scoreManche=(D,o)=>C(D,0)+' '+o.pts[0]+', '+C(D,1)+' '+o.pts[1];
function detailCamp(D,o,p){
  const l=o.terrains.filter(t=>t.p===p).map(t=>esc(t.nom)+' +'+t.pts+(t.forces?' ('+t.forces[0]+' contre '+t.forces[1]+')':''));
  if(o.bonus[p])l.push('bonus +'+o.bonus[p]);
  if(o.pioche&&o.pioche[p])l.push('deck vide de '+C(D,1-p)+' +'+o.pioche[p]); /* deck vide (meule) */
  return l.join(', ');
}
function ligneMvpD(m){
  if(m.score===null)return '';
  const l=[];if(m.force)l.push('Force '+m.force+' sur terrains gagnés');if(m.bonus)l.push(pl(m.bonus,'bonus donné'));
  if(m.degats)l.push(pl(m.degats,'dégât'));if(m.morts)l.push(pl(m.morts,'Golem')+' détruit'+(m.morts>1?'s':''));
  return 'Score '+m.score+(l.length?' - '+l.join(', '):'');
}
const abandonTxt=D=>D.abandon!==undefined?N(D,D.abandon)+' a abandonné à '+D.scores[D.abandon]+' contre '+D.scores[1-D.abandon]:'';
function chiffres(D){
  const l=[],t=[0,1].map(p=>D.manches.reduce((a,o)=>a+o.terrains.filter(x=>x.p===p).length,0));
  const deux=(lib,v)=>'- '+lib+' : '+C(D,0)+' '+v[0]+', '+C(D,1)+' '+v[1];
  if(t[0]+t[1])l.push(deux('Terrains gagnés',t));
  const d=D.chiffres.map(x=>x.degats),m=D.chiffres.map(x=>x.morts);
  if(d[0]+d[1])l.push(deux('Dégâts infligés',d));
  if(m[0]+m[1])l.push(deux('Golems détruits',m));
  return l;
}

/* ---------- A (sans emoji) et B (quelques emoji) : meme fiche ---------- */
function fiche(D,niv,emo){
  const R=resultat(D),l=[],e=(x,y)=>emo?x+' ':(y||'');
  l.push('## '+(emo?(R.vainq===null?'\u{1F91D} ':'\u{1F3C6} '):'Les Golems - ')+R.titre);
  l.push('-# '+(emo?'Les Golems - ':'')+contexte(D)+(D.departage?' - '+esc(D.departage):'')+(D.abandon!==undefined?' - '+e('\u{1F3F3}️')+abandonTxt(D):''));
  l.push((emo?'> ':'')+ligneDeck(D,0),(emo?'> ':'')+ligneDeck(D,1));
  l.push('### '+e('⚔️')+'Manche par manche');
  if(!D.manches.length)l.push('*Aucune manche décomptée*');
  D.manches.forEach((o,i)=>{
    l.push('**Manche '+(i+1)+'** - '+scoreManche(D,o));
    if(niv<1){const d=[0,1].map(p=>{const x=detailCamp(D,o,p);return x?C(D,p)+' : '+x:''}).filter(Boolean);if(d.length)l.push('-# '+d.join(' - '))}
  });
  if(D.mvp){l.push('### '+e('⭐')+'MVP - '+esc(D.mvp.carte));const q=ligneMvpD(D.mvp);if(q&&niv<2)l.push('-# '+q)}
  if(niv<2){const c=chiffres(D);if(c.length)l.push('### '+e('\u{1F4CA}')+'Chiffres clés',...c,'')} /* ligne vide : ferme la liste pour Discord */
  l.push('-# '+e('\u{1F517}')+'[Jouer aux Golems]('+LIEN+')');
  return l.join('\n');
}
const formeA=(D,n)=>fiche(D,n,false),formeB=(D,n)=>fiche(D,n,true);

/* ---------- C : compacte (aussi le dernier repli si A ou B depasse 2000) ---------- */
function formeC(D,emo){
  const R=resultat(D),l=[];
  l.push((emo?(R.vainq===null?'\u{1F91D} ':'\u{1F3C6} '):'')+'**Les Golems** - '+R.titre+(D.abandon!==undefined?' *('+abandonTxt(D)+')*':''));
  const m=D.manches.map((o,i)=>'M'+(i+1)+' **'+o.pts[0]+'-'+o.pts[1]+'**').join(' - ');
  if(m)l.push('> '+(emo?'⚔️ ':'')+'Manches, '+C(D,0)+' contre '+C(D,1)+' : '+m);
  if(D.mvp)l.push('> '+(emo?'⭐ ':'')+'MVP : **'+esc(D.mvp.carte)+'**'+(D.mvp.score!==null?' (score '+D.mvp.score+')':''));
  const dk=[0,1].map(p=>D.decks[p].els.length?C(D,p)+' ('+(D.decks[p].els.length===5?'5 éléments':D.decks[p].els.join(', '))+')':'').filter(Boolean).join(' contre ');
  l.push('-# '+(dk?dk+' - ':'')+'version '+esc(D.version)+' - [les-golems.github.io]('+LIEN+')');
  return l.join('\n');
}

/* Longueur comptee en points de code (un emoji compte pour 1 ou 2). */
const lg=t=>[...t].length;
function texteDiscord(D,forme){
  if(forme==='C')return formeC(D,false);
  const f=forme==='B'?formeB:formeA;
  for(let n=0;n<3;n++){const t=f(D,n);if(lg(t)<=MAX)return t}
  return formeC(D,forme==='B');
}
return {deFin,deHisto,texteDiscord,lg};
})();
/* Partager le resume : texte mis en forme pour Discord (variante B, repli automatique sur la forme compacte au-dela de 2000 caracteres). */
function texteResume(s){return VD.texteDiscord(VD.deFin(s),'B')}
/* Donnees de partie (JSON). Par defaut : partie et moteur en cours, a l'instant ; l'Historique passe une partie
   reconstruite (P, avec son x.rejeu), le moteur de sa version (Mx) et l'heure de fin enregistree (h).
   rejeu : de quoi rejouer la partie a l'identique (version, graine, place, decks, journaux), meme forme que l'Historique. */
function donneesPartie(s,P,Mx,h){
  P=P||partie;Mx=Mx||M;h=h||Date.now();
  const j=P.moi===0?[P.mien,P.sien]:[P.sien,P.mien];
  return JSON.stringify({robot:!!P.local,version:P.version||Mx.VERSION,dureeSecondes:Math.round((h-P.debut)/1000),date:new Date(h).toISOString(),graine:P.graine,terrains:s.terrains.map(t=>t.nom),scores:s.fin.scores,gagnant:s.fin.gagnant,
    cartes:j.map(l=>l.filter(c=>c[0]==='p').map(c=>Mx.nomDetail(Mx.carte(Mx.decode(c).c)))),bilan:Mx.bilan(s),journaux:j,
    rejeu:P.rejeu||{v:Mx.VERSION,graine:P.graine,moi:P.moi,decks:(P.decks||['','']).slice(),j:j.map(x=>Mx.ecritJournal(x))}},null,1);
}
/* Historique : memes donnees, la partie etant rejouee sans affichage avec le moteur archive de sa version (comme le Replay).
   Replay impossible : donnees brutes de l'entree (rejeu compris), avec la raison (o.brut). */
async function donneesHisto(x){
  const R=x&&x.rejeu,brut=t=>({brut:t,txt:JSON.stringify(Object.assign({remarque:'Replay impossible ('+t+') : données brutes de l’historique.'},x),null,1)});
  if(!R||!Array.isArray(R.j)||!R.j.some(t=>t))return brut('partie enregistrée sans ses journaux');
  if(!rejeuPossible(R))return brut('moteur de la version '+R.v+' non archivé');
  let Mx;try{Mx=await chargeMoteur(R.v)}catch(e){return brut('moteur de la version '+R.v+' introuvable')}
  try{
    const j=R.j.map(Mx.litJournal),r=Mx.rejoue(R.graine,j,Array.isArray(R.decks)?R.decks:['','']),s=r.etat;
    if(r.erreur||!s||!s.fin)throw new Error(r.erreur||'partie inachevée');
    const me=R.moi===1?1:0,id=String(x.id||''),d=+id.slice(id.lastIndexOf('-')+1),h=Number.isFinite(+x.date)&&+x.date>0?+x.date:Date.now();
    const P={moi:me,mien:j[me],sien:j[1-me],local:/^Golem \(.+\)$/.test(String(x.adv||'')),debut:Number.isFinite(d)&&d>0?d:h,graine:R.graine,version:R.v,rejeu:R};
    return {brut:null,txt:donneesPartie(s,P,Mx,h)};
  }catch(e){return brut('partie illisible')}
}
function copieFin(b,lib,txt){
  copie(txt,b,lib,()=>{const z=$('repliFin');if(!z)return;partie.repli=txt;z.value=txt;z.hidden=false;z.focus();z.select()});
}
/* Partager : feuille de partage du telephone si elle existe, sinon copie (repli : zone de texte). */
function partageFin(b,txt){
  const lib='Partager le résumé';
  if(navigator.share&&matchMedia('(pointer:coarse)').matches){navigator.share({title:'Les Golems',text:txt}).catch(()=>{});return}
  if($('repliFin'))copieFin(b,lib,txt);else copie(txt,b,lib,()=>{});
}
/* Resume d'une partie de l'historique (meme forme que texteResume). */
function texteHisto(x){return VD.texteDiscord(VD.deHisto(x),'B')}
/* Bonus prevu de Trait et de cercle, memes regles que forceDe, sans toucher a l'etat. */
function bonusPrevu(s,me,c,l,k){
  const G=s.j[me].grille,C=M.carte(c),vs=[[l-1,k],[l+1,k],[l,k-1],[l,k+1]].map(([x,y])=>G[x]&&G[x][y]).filter(Boolean);
  const trait=C.el.reduce((t,e)=>{const n=vs.filter(v=>M.carte(v.c).el.includes(e)).length;return t+(M.TRAIT_CUMULE?n:Math.min(n,1))},0),f=s.j[1-me].grille[l][k];
  const dom=f&&C.el.some(e=>M.carte(f.c).el.includes(M.DOMINE[e])),c2=M.cercle2?M.cercle2(G,k,C.id)||!!effetDe(C.id,'cercleTerrain'):CERCLE_2.includes(C.id),o={trait,cercle:dom?(c2?2:1):0}; /* Vic222 : Info tchat dans la colonne */
  if(effetDe(C.id,'synergie')){const n=C.el.filter(e=>vs.some(v=>M.carte(v.c).el.includes(e))).length;if(n)o.synergie=n}
  if(effetDe(C.id,'forceParGolem',r=>r.compte==='element')&&M.foudres){const n=M.foudres(G)-(G[l][k]&&M.carte(G[l][k].c).el.includes('foudre')?1:0)+(C.el.includes('foudre')?1:0);if(n)o.survolte=n}
  if(effetDe(C.id,'forceParGolem',r=>r.compte==='dessus')&&M.kekwait){const n=M.kekwait(G,l,k);if(n)o.kekwait=n} /* Shifukuro : KEKWait */
  if(DUO_MANCHE[C.id]&&M.duoManches){const[x,w]=DUO_MANCHE[C.id],n=x*M.duoManches(s,me,k,!!w);if(n)o[w?'winstreak':'comeback']=n} /* Bellock et Loxim : manches deja jouees sur ce terrain */
  if(M.doubleUp&&M.doubleUp(G,l,k,C.id))o.doubleup=M.REGLAGE_DUO.doubleUp; /* Double up ? des evolutions du duo */
  return o;
}
/* Recapitulatif de fin de manche : local, ne touche ni a la presence ni au journal. */
function mancheFinie(s){return s.fin?(s.fin.abandon!==undefined||s.fin.deckVide!==undefined?s.reperes.length:3):s.manche-1} /* 0.4 : deck vide, comme l'abandon */ /* abandon (0.2.2) : seulement les manches decomptees */
function fermeRecap(){$('recap').hidden=true;$('recap').textContent='';recapAff=0}
/* Decoupe le journal par manche : chaque page finit avec le decompte et ses effets. */
function pagesLog(s){
  const r=[];let d=0;
  s.reperes.forEach(x=>{r.push(s.log.slice(d,x[2]));d=x[2]});
  if(!s.fin||s.fin.abandon!==undefined||(s.fin.deckVide!==undefined&&d<s.log.length))r.push(s.log.slice(d)); /* abandon ou deck vide (0.4) : fin de partie hors decompte */
  return r;
}
function genreLog(x){
  if(/: Il suffit, /.test(x))return / détruit /.test(x)?['j-mort','defausse']:['','tour']; /* Le Q (Seul contre tous) : destruction, ou rien (aucun doublon, Mode Avion) */
  if(/: Jour de pêche, /.test(x))return /défausse/.test(x)?['j-degat','defausse']:['','tour']; /* Le Q : carte du deck adverse defaussee */
  if(/: (Comeback|Winstreak), pioche /.test(x))return ['j-pose','main']; /* Bellock et Loxim : partenaire pioché dans le deck, comme Graine de Golem */
  if(/: (Comeback|Winstreak), aucun /.test(x))return ['','tour']; /* aucun partenaire dans le deck : neutre */
  if(/: meandyou, /.test(x))return ['','tour']; /* Shifukuro (Le modérateur) : échange, refus ou rien à échanger, neutre comme l'échange du Q ; en tête, les noms échangés ne doivent rien déclencher */
  if(/^doit piocher mais son deck est vide/.test(x))return ['j-mort','defausse']; /* 0.4 : defaite par deck vide (anciennes parties) */
  if(RE_DV.test(x))return ['j-point','coupe']; /* deck vide (meule) : point pour l'adversaire */
  if(/meur|est détruit/.test(x))return ['j-mort','defausse'];
  if(/^Le Cirque : tarte /.test(x))return ['j-degat','degat']; /* 0.4a : tarte du Cirque */
  if(/^Le Versus : .* perd 1 de Force/.test(x))return ['j-degat','degat']; /* 0.4a : Le Versus, -1 au Golem adverse ici */
  if(/^Les Pronos : mise /.test(x))return ['j-bonus','coupe']; /* 0.4a : mise des Pronos */
  if(/^L'École : pioche /.test(x))return ['j-pose','main']; /* 0.4a : pioche du perdant */
  if(/^marque |\+\d points?\.$/.test(x))return ['j-point','coupe'];
  if(/^améliore /.test(x))return ['j-evo','manche'];
  if(/^(pose|remplace|garde) /.test(x))return ['j-pose','main'];
  if(/ lance /.test(x))return ['j-bonus','bouclier'];
  if(/perd(ent)? \d|dégât/.test(x))return ['j-degat','degat'];
  if(/^Le Camp : /.test(x))return ['j-bonus','bouclier'];
  if(/^(Le Vaisseau|Le Carrousel|Le Buzzer|La Faille|L'Écran du MJ) : /.test(x))return ['j-pose','main'];
  if(/^La Bretagne : /.test(x))return ['j-pose','main'];
  if(/^Kiwi : Mignonitude/.test(x))return ['j-bonus','bouclier'];
  if(/^(Kiwi|Jacen et Jaina) part à la défausse/.test(x))return ['','defausse'];
  if(/^Spom : Forge éclair/.test(x))return ['j-pose','enclume'];
  if(/^Réalisation de l'âge : /.test(x))return ['j-degat','enclume'];
  if(/: Extinction du feu, /.test(x))return ['j-degat','degat'];
  if(/^Graine de Golem : /.test(x))return ['j-pose','main']; /* Velnen : pioche en plus, comme La Bretagne */
  if(/: Imitation(,| refusée)/.test(x))return ['','tour']; /* Imitation sans copie : neutre, comme Apo sans voisin */
  if(/ copie |: Caramel à volonté/.test(x))return ['j-bonus','bouclier'];
  return ['','tour'];
}
function causesLog(s){
  const m=new Map(),ev=s.stats.ev.filter(e=>e.t==='m');let i=0;
  s.log.forEach(e=>{const x=e[1],a=/^(.+) (?:meurent|meurt)\.$/.exec(x),is=ilSuffitNoms(x),n=a?a[1].split(' et ').length:/est détruit\.$/.test(x)?1:is?is.length:(x.match(/meurt ensuite/g)||[]).length; /* Il suffit : 1 evenement de mort par carte detruite */
    if(a){const t=[...new Set(ev.slice(i,i+n).map(c=>(c.sc!=null?M.nomDetail(M.carte(c.sc))+', ':'')+(M.TERRAINS.some(t=>t.nom===c.lib)?c.lib:String(c.lib).toLowerCase())))];if(t.length)m.set(e,' Cause : '+t.join(' ; ')+'.')}
    i+=n});
  return m;
}
/* Secret des mains : chez l'adversaire (robot compris), la carte piochee (Comeback, Winstreak) ou defaussee (Le Carrousel) n'est pas nommee. Le rejeu montre tout. */
function masqueLog(p,x,me){
  if(p===null||p===me||(partie&&partie.rejeu))return x;
  return x.replace(/^(.+? : (?:Comeback|Winstreak)), pioche .+ dans son deck, puis le mélange\.$/,'$1, pioche une carte dans son deck, puis le mélange.').replace(/^(.+?) : défausse .+\.$/,'$1 : défausse une carte.');
}
/* Deck vide (regle de la meule) : « n'a pas pu piocher (deck vide) : +1 point pour l'adversaire. », au nom du joueur qui n'a pas pu piocher */
const RE_DV=/^n'a pas pu piocher \(deck vide\) : \+(\d+) points? pour l'adversaire\.$/;
function ligneDeckVide(x,nomP,nomQ,toiP,toiQ){const m=RE_DV.exec(x);if(!m)return null;const n=+m[1],pt=n+(n>1?' points':' point');
  return toiP?"Tu n'as pas pu piocher (deck vide) : +"+pt+' pour '+nomQ+'.':nomP+" n'a pas pu piocher (deck vide) : +"+pt+' pour '+(toiQ?'toi':nomQ)+'.'}
/* Points donnes par les pioches impossibles a la manche m (evenements 'dv' du moteur) : r[q] = points recus par q */
function piocheImpossible(s,m){const r=[0,0];((s.stats&&s.stats.ev)||[]).forEach(e=>{if(e.t==='dv'&&e.m===m)r[1-e.cp]+=e.n});return r}
function ligneLog(p,x,me){
  if(p!==null&&RE_DV.test(x))return ligneDeckVide(x,nomJ(p),nomJ(1-p),p===me,1-p===me);
  if(p!==null&&x==='doit piocher mais son deck est vide : il perd la partie.')return p===me?'Tu dois piocher mais ton deck est vide : tu perds la partie.':nomJ(p)+' doit piocher mais son deck est vide : '+nomJ(p)+' perd la partie.'; /* 0.4 : deck vide */
  return (p===null?'':(p===me?'Toi : ':nomJ(p)+' : '))+masqueLog(p,x,me)}
function effetsManche(s){
  const x=s.reperes[s.reperes.length-1];
  return x?s.log.slice(x[1],x[2]):[];
}
function verifieRecap(){
  const s=partie.etat,n=mancheFinie(s);
  if(animCours)return;
  if(!s.dernier||n<=partie.recapVu||n===recapAff)return;
  /* Fin d'un rejeu : pas de recap de manche, le score final s'affiche directement. */
  if(partie.rejeu&&s.fin){partie.recapVu=n;return}
  const me=partie.moi,lui=1-me,cols=me===0?[0,1,2]:[2,1,0],box=$('recap'),d=el('div','boite');
  const nl=nomJ(lui),h=el('h2','','Fin de la manche '+n);h.id='recapTitre';d.append(h);
  cols.forEach(k=>{
    const T=s.terrains[k],c=s.dernier.colonnes[k],w=s.dernier.gagnants[k],z=el('div','r-terrain');
    const fo=el('div','forces');fo.append('Toi ',el('b','',String(c[me])),' contre ',el('b','',String(c[lui])),' '+nl);
    const bloque=(r=>!!r&&n<r.manche)(effetTerrain(T,'derniereManche'));
    z.append(el('h3','',T.nom),el('div','pts',w===null?'0 pt':(v=>'+'+v+(v>1?' pts':' pt'))(effetTerrain(T,'pointsManche')?n:T.pts)),fo,
      el('div','gagne',bloque?'Ne marque pas encore':w===null?'Égalité':w===me?'Gagné par toi':'Gagné par '+nl));
    d.append(z);
  });
  {const ex=s.dernier.exclus||[];if(ex.length){const u=el('ul','r-effets r-mignon');ex.forEach(x=>{const n=M.nomDetail(M.carte(x.c));u.append(el('li','','Mignonitude (Kiwi '+(x.p===me?'à toi':'de '+nl)+') : '+n+(x.q===me?' (à toi)':' ('+nl+')')+' ne compte pas, Force '+x.f+'.'))});d.append(u)}}
  const ef=effetsManche(s);
  if(ef.length){const u=el('ul','r-effets');ef.forEach(([p,x])=>u.append(el('li','',ligneLog(p,x,me))));d.append(u)}
  {const pi=piocheImpossible(s,n);if(pi[0]+pi[1]){const u=el('ul','r-effets r-pioche'); /* deck vide (meule) : points de la manche hors terrains */
    [me,lui].forEach(q=>{if(pi[q])u.append(el('li','',q===me?'Deck vide de '+nl+' : +'+pi[q]+' pour toi.':'Ton deck vide : +'+pi[q]+' pour '+nl+'.'))});d.append(u)}}
  const ec=s.dernier.ecran;
  if(ec&&ec.p===me&&ec.main){
    const z=el('div','r-quiz r-ecran'),l=el('div','r-mains');
    z.append(el('p','',"L'Écran du MJ : main de "+nl+(ec.main.length?'.':' : vide.')));
    ec.main.forEach(c=>{const C=M.carte(c),i=el('img');i.src=imgV('cartes/'+C.id+'.jpg');i.alt=C.nom;l.append(i)});
    z.append(l);d.append(z);
  }
  {const ap=[0,0];for(let m=n+1;m<=3;m++){const x=piocheImpossible(s,m);ap[0]+=x[0];ap[1]+=x[1]} /* score a la fin de la manche n : sans les pioches impossibles du debut de la manche suivante */
  d.append(el('p','r-total','Score : '+(s.j[me].score-ap[me])+' - '+(s.j[lui].score-ap[lui])))}
  const b=el('button','btn plein','Continuer');b.type='button';b.id='continuer';
  b.onclick=()=>{if(partie){partie.recapVu=n;sauve()}fermeRecap()};
  d.append(b);box.textContent='';box.append(d);box.hidden=false;recapAff=n;b.focus({preventScroll:true});
}
/* Historique : sur cet appareil seulement. */
function litListe(k){try{const v=JSON.parse(lire(k));return Array.isArray(v)?v:[]}catch(e){return []}}
/* Compte : historique dans Firebase (50 dernieres, purge). Invite : sur l'appareil. */
const lesParties=()=>compteCo()?room.compte.donnees().historique.slice():litListe('golems.historique');
function enregistrePartie(s){
  const l=lesParties(),id=partie.graine+'-'+partie.debut;
  if(l.some(x=>x.id===id))return;
  const o=archiveResume(s,id);
  enregistreDans(l,s,id);
  {const k=partie.classe,c=k&&k.res;if(k&&l[0]&&l[0].id===id){l[0].mode='classee';l[0].classe=c?{elo:c.avant,delta:c.delta,eloAdv:k.eloAdv,robot:!!k.robot}:{robot:!!k.robot};if(k.robot)l[0].classe.niveau=k.robot;if(!(c&&c.ecrit))l[0].classe.attente=true}} /* 0.6.1 : etiquette d'apres partie.classe ; variation « en attente » tant que non ecrite */ /* 0.6 : etiquette Classee (+ Golem) de l'Historique ; c, de, ro dans Firebase (salon-firebase.js) */
  if(compteCo()){const x={id,u:room.compte.uid(),h:l[0]};if(o)x.r=o;majAttente(id,y=>Object.assign(y,x));envoieAttente(id);return}
  ecrire('golems.historique',JSON.stringify(l.slice(0,50)));
}
/* Ecriture d'une partie (compte) : mise en attente sur l'appareil avant l'envoi, retiree une fois ecrite.
   Echec ou pas de reponse en 15 s : message visible ; nouvel essai automatique au chargement suivant. */
const ATTENTE='golems.enAttente';
function majAttente(id,f){const l=litListe(ATTENTE).filter(x=>x&&typeof x.id==='string');let x=l.find(y=>y.id===id);if(!x){x={id};l.unshift(x)}f(x);ecrire(ATTENTE,JSON.stringify(l.filter(y=>y.h||y.r).slice(0,20)))}
function nonEnregistre(on){$('nonEnr').hidden=!on}
$('nonEnrOk').onclick=()=>nonEnregistre(false);
function archivee(id){const l=litListe('golems.archives');if(!l.includes(id)){l.unshift(id);ecrire('golems.archives',JSON.stringify(l.slice(0,200)))}}
/* Un seul envoi a la fois par partie : un 2e appel (abandon classe contre le robot, nouvel essai) reprend l'envoi en cours (sinon resume ecrit deux fois : refus). */
const envoisCours=new Map();
function envoieAttente(id){
  if(envoisCours.has(id))return envoisCours.get(id);
  const p=envoieAttente1(id);envoisCours.set(id,p);p.then(()=>envoisCours.delete(id),()=>envoisCours.delete(id));return p;
}
function envoieAttente1(id){
  const u=compteCo()?room.compte.uid():'',x=litListe(ATTENTE).find(y=>y&&y.id===id&&y.u===u);
  if(!x)return Promise.resolve(true);
  /* 0.6a : pas de reponse en 15 s (reponse perdue sans fermeture du socket) : nouvelle connexion forcee, le SDK renvoie l'ecriture. */
  let tard=false;const t=setTimeout(()=>{tard=true;nonEnregistre(true);try{room.compte.relance&&room.compte.relance()}catch(e){}},15000);
  const h=x.h?room.compte.ajouteHisto([x.h]).then(()=>majAttente(id,y=>{delete y.h}),e=>{if(e&&e.code==='golems/trop-long')majAttente(id,y=>{delete y.h});throw e}):null;
  const z=x.r&&room.ecritResume?room.ecritResume(id,x.r).then(()=>{archivee(id);majAttente(id,y=>{delete y.r})}):null;
  return Promise.allSettled([h,z]).then(v=>{clearTimeout(t);const ok=v.every(e=>e.status==='fulfilled');
    v.forEach(e=>{if(e.status==='rejected')console.warn('Partie non enregistrée',e.reason)});
    if(!ok)nonEnregistre(true);else if(tard)nonEnregistre(false);return ok});
}
/* Au chargement (compte connecte) : nouvel essai des parties restees en attente. */
async function reessaie(){
  if(compteCo()&&!reprendFins.cours){reprendFins.cours=true;reprendFins().finally(()=>{reprendFins.cours=false;if(typeof chargeClasse==='function')chargeClasse()})} /* 0.6 : classees du perdant pas encore ecrites */
  if(reessai||!compteCo())return;const u=room.compte.uid(),l=litListe(ATTENTE).filter(x=>x&&x.u===u&&typeof x.id==='string');if(!l.length)return;
  reessai=true;try{for(const x of l)await envoieAttente(x.id)}finally{reessai=false}
  if(!$('historique').hidden)peintHisto();
}
/* Archive commune (onglet Statistiques) : resume anonyme, un compte seulement ; en ligne, chacun des deux joueurs l'ecrit
   (cle graine-debut differente), l'affichage n'en garde qu'un par graine (uneParGraine). Renvoie le resume a ecrire. */
function archiveResume(s,id){
  if(!compteCo()||!room.ecritResume||!s.fin)return null;
  const w=s.fin.gagnant,p0=s.premier^((s.manche-1)&1),B=M.bilan(s),st=(s.stats&&s.stats.t)||[];
  const t={};s.terrains.forEach((T,k)=>{const e=st.filter(x=>x.k===k);
    t[k]={n:String(T.nom).slice(0,40),r:e.map(x=>x.gagnant===0||x.gagnant===1?String(x.gagnant):(r=>!!r&&x.manche<r.manche)(effetTerrain(T,'derniereManche'))?'-':x.forces[0]===x.forces[1]?'=':'-').join('').slice(0,3)||'-',q:Math.min(20,e.reduce((a,x)=>a+(+x.points||0),0))}});
  const o={v:String(M.VERSION).slice(0,12),m:partie.local?'golem-'+partie.niveau:'ligne',...(partie.classe?{cl:true}:{}),g:w===0||w===1?w:-1,pg:w===p0,a:s.fin.abandon!==undefined,
    s0:Math.min(30,s.j[0].score),s1:Math.min(30,s.j[1].score),mvp:B.mvp?String(B.mvp.carte).slice(0,40):'',t};
  /* Deck par defaut (texte vide : joueur sans deck choisi, robot) : enregistre sous son texte (30 cartes depuis 0.3, 33 avant), sinon cartes et elements perdus pour les Statistiques. */
  const kDef=M.DECK_DEFAUT?M.deckTexte(M.DECK_DEFAUT):DECK_TEST_TXT;
  [0,1].forEach(p=>{const k=M.lisDeck(s.decks[p])?s.decks[p]:kDef;o['k'+p]=k;o['e'+p]=elsTexte(k).join(',')});
  /* Forces reellement tirees par les cartes a de (type forceAuDe : Alrevan 1 de, KEKWRevan 2 des), des deux camps ; cle = code de la carte. Lignes du journal du moteur. */
  {const dr={},id1=idsAvecEffet('forceAuDe',r=>r.des===1)[0],id2=idsAvecEffet('forceAuDe',r=>r.des===2)[0];(s.log||[]).forEach(x=>{const t=String(x[1]);let m=/^Alrevan lance le dé : Force (\d+)\.$/.exec(t),id=id1;
     if(!m){m=/^Alrevan \(KEKWRevan\) lance \d+ et \d+ : Force (\d+)\.$/.exec(t);id=id2}
     if(m){const f=+m[1];if(f>=1&&f<=12)(dr[id]=dr[id]||[]).length<30&&dr[id].push(f)}});
   if(Object.keys(dr).length)o.dr=dr}
  /* Une seule fois par partie sur cet appareil, quel que soit le compte (la regle refuse aussi toute reecriture). */
  const vu=litListe('golems.archives');if(vu.includes(id))return null;
  return o;
}
/* En ligne, les deux joueurs ecrivent un resume (cle graine-debut) : une seule partie par graine dans les Statistiques. */
function uneParGraine(l){const vu=new Set();return l.filter(r=>{if(r.m!=='ligne'||typeof r.id!=='string')return true;const g=r.id.slice(0,r.id.lastIndexOf('-'));if(vu.has(g))return false;vu.add(g);return true})}
function enregistreDans(l,s,id){
  const me=partie.moi,lui=1-me,w=s.fin.gagnant,nm=p=>p===me?'Toi':nomJ(p),B=M.bilan(s);
  const ps=pseudo||'Joueur',np=p=>p===me?ps:nomJ(p);
  l.unshift({id,date:Date.now(),adv:partie.local?'Golem ('+partie.niveau+')':nomJ(lui),res:w===null?'Match nul':w===me?'Victoire':'Défaite',abandon:s.fin.abandon===undefined?undefined:s.fin.abandon===me?'moi':'adv',deckVide:s.fin.deckVide===undefined?undefined:s.fin.deckVide===me?'moi':'adv',score:s.j[me].score+' - '+s.j[lui].score,mvp:B.mvp?B.mvp.carte:'',
    pseudo:ps,deck:deckJoue(),advNom:lui===1-me?nomJ(lui):'',
    moteur:M.VERSION,rejeu:{v:M.VERSION,graine:partie.graine,moi:me,decks:(partie.decks||['','']).slice(),j:(me===0?[partie.mien,partie.sien]:[partie.sien,partie.mien]).map(x=>M.ecritJournal(x))},
    manches:parManche(s).map(o=>lignesManche(o,np)),mvpLigne:ligneMvp(B),
    bilan:B.joueurs.map((J,p)=>({nom:np(p),cartes:J.cartes.map(c=>[c.carte,c.degats,c.subis,c.morts,c.mortsSubies])}))});
}
