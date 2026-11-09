/* Mode spectateur (0.3) : interface seule. Salon (sieges, boutons de role, tribune des spectateurs) et vue de partie en lecture seule.
   Lit les fonctions d'affichage d'index.html (el, avatarDe, grilleVue, mainVue, zoom, detailForce...) sans les modifier.
   La logique (presence, roles, flux de la partie) est dans spectateur.js : window.SPEC. Ici : window.SPEC_UI. */
(function(){
'use strict';
/* Fonctions d'index.html : son script est enveloppe dans une IIFE, il les expose dans window.GOLEMS_UI (point d'accroche, voir le rapport).
   M (moteur en service) et maV (version du site) changent : lus a chaque peinture par des accesseurs. */
let dernierEtat=null;
let U=null,M=null,maV='',el,avatarDe,avatarUid,etiquetteV,enteteDeck,infoDeck,compteNb,pastilleInconnue,texteTaux,choisirDeck,grilleVue,zoom,zoomTerrain,montreApercu,cacheApercu,srcTerrain,srcC,ico,info,points,compteur,lg,detailAnimal,quiJoue,outils,pagesLog,genreLog,causesLog,texteLog,NOMS_LOG,LARGE,SURVOL,quitteBouton,peintChat,chatBox;
function lie(){
  const g=window.GOLEMS_UI;if(!g)return false;
  if(U!==g){U=g;
    ({el,avatarDe,avatarUid,etiquetteV,enteteDeck,infoDeck,compteNb,pastilleInconnue,texteTaux,choisirDeck,grilleVue,zoom,zoomTerrain,montreApercu,cacheApercu,srcTerrain,srcC,ico,info,points,compteur,lg,detailAnimal,quiJoue,outils,pagesLog,genreLog,causesLog,texteLog,NOMS_LOG,LARGE,SURVOL,quitteBouton,peintChat,chatBox}=g);
    if(LARGE)LARGE.addEventListener('change',()=>{if(dernierEtat&&document.querySelector('#partie.sp'))peindrePartieSpectateur(dernierEtat)})}
  M=g.M||window.GolemsMoteur;maV=g.maV||'';return true;
}
const OEIL='<svg viewBox="0 0 66 66" aria-hidden="true"><path fill="none" stroke="currentColor" stroke-width="6" stroke-linejoin="round" d="M4 33C14 17 23 12 33 12S52 17 62 33C52 49 43 54 33 54S14 49 4 33Z"/><circle cx="33" cy="33" r="10" fill="currentColor"/></svg>';
const q=id=>document.getElementById(id);
const mk=(t,c,x)=>{const e=document.createElement(t);if(c)e.className=c;if(x!=null)e.textContent=x;return e};
const btn=(t,c)=>{const b=mk('button','btn'+(c?' '+c:''),t);b.type='button';return b};
const SPECobj=()=>window.SPEC||null;
const nomP=o=>(o&&typeof o.pseudo==='string'&&o.pseudo.trim())||'Joueur';
function av(o){
  const n=nomP(o);
  if(o&&o.uid&&typeof avatarUid==='function')return avatarUid(n,o.uid,o.avatar||'');
  return avatarDe(n,o&&o.avatar||'');
}

/* ---------- Salon ---------- */
function message(t){
  const a=q('attente');if(!a)return;a.textContent=t;a.classList.remove('pret');
}
function tauxDe(o){
  if(typeof o.taux==='string')return o.taux;
  if(o.stats&&typeof texteTaux==='function')return texteTaux(o.stats);
  return '';
}
function tuileDeck(o,mien){
  const t=mk('div','cd-tuile');
  if(mien&&typeof enteteDeck==='function'&&typeof infoDeck==='function'){
    const i=infoDeck(o.deck);t.append(...enteteDeck(o.deckNom||i.nom||'Deck',i.els,i.nb));return t}
  /* Deck d'un autre joueur masque avant la partie (meme regle que siegeSalon) */
  const h=mk('div','cd-haut'),pi=mk('div','d-pict');
  if(o.pret){h.append(mk('span','h-deck dk-neutre','Deck choisi'),compteNb(typeof infoDeck==='function'?infoDeck(o.deck).nb:M.TAILLE_DECK));pi.append(pastilleInconnue())}
  else h.append(mk('span','h-deck dk-neutre','Choix en cours'));
  t.append(h,pi);return t;
}
function etiquette(o){
  if(typeof etiquetteV==='function')return etiquetteV(o.v!==undefined?o.v:maV,!!o.vRouge);
  return mk('span','etq-v vx-etq','');
}
/* Design B (0.4) : sieges a teinte neutre avant la partie (aucun deck revele). */
function teinteSiege(){const g=window.GOLEMS_UI;return g&&g.teinte?g.teinte([]):''}
function siege(o,moi,btns,createur){
  const s=mk('div','sl-j b-teinte'+(o.pret?' pret':'')+(moi?' sl-moi':''));
  /* 0.6 : embleme et Elo comme les sieges de jouer.js (nomSiege) ; repli sur le pseudo seul */
  let n;if(typeof window.nomSiege==='function'&&o.uid)n=window.nomSiege({peer:o.uid,sameTab:!!moi},nomP(o),!!moi);else{n=mk('div','sl-nom',nomP(o));if(moi)n.append(mk('em','','toi'))}
  const t=teinteSiege(o,moi);if(t)s.style.setProperty('--tinte',t);
  s.append(av(o),n);if(createur)s.append(mk('span','sp-role','Créateur'));
  s.append(mk('span','sl-etat',o.pret?'Prêt':'En attente'),etiquette(o),tuileDeck(o,moi));
  const tx=tauxDe(o);if(tx)s.append(mk('span','sl-taux',tx));
  if(btns.length){const w=mk('div','sp-btns');w.append(...btns);s.append(w)}
  return s;
}
function siegeLibre(btns){
  const v=mk('div','sl-j sl-libre b-teinte'),t=mk('div','cd-tuile'),e=etiquette({});e.classList.add('sl-vide');
  const g=window.GOLEMS_UI;if(g&&g.teinte)v.style.setProperty('--tinte',g.teinte([]));
  t.append(mk('span','h-deck h-sans','Place libre'),mk('span','cd-nb','Un spectateur peut la prendre'));
  v.append(mk('div','avatar','?'),mk('div','sl-nom','Adversaire'),mk('span','sl-etat sl-vide','En attente'),e,t);
  if(btns.length){const w=mk('div','sp-btns');w.append(...btns);v.append(w)}
  return v;
}
function boutonChangerDeck(o){
  const b=btn('Changer de deck','sec');b.disabled=!!o.pret;b.title=o.pret?'Retire ton Prêt pour changer de deck':'';
  b.onclick=()=>{if(typeof choisirDeck==='function')choisirDeck(()=>{const S=SPECobj();if(S)peindreSalon(S.etatSalon())},'Choisir')};
  return b;
}
function puce(x){
  const li=mk('li','sp-puce'+(x.moi?' sp-moi':'')),b=mk('b','',nomP(x));
  if(x.moi)b.append(mk('em','','toi'));li.append(av(x),b);return li;
}
/* 0.4 : colonne Spectateurs a droite des sieges (variante C « Tribune ») : oeil, nombre et mot centres, puis une ligne par spectateur.
   Bureau : meme hauteur que les sieges, la liste defile a l'interieur. Telephone : sous les sieges, hauteur maximale. */
function tribune(liste){
  document.querySelectorAll('#salon .sp-tribune').forEach(x=>x.remove()); /* ancienne bande sous les sieges */
  const w=mk('div','sp-trib'),n=liste.length;w.setAttribute('aria-label','Spectateurs');
  const t=mk('div','sp-ttl');t.innerHTML=OEIL;t.append(mk('b','sp-nb',String(n)),mk('span','',n>1?'spectateurs':'spectateur'));
  w.append(t);
  if(n){const ul=mk('ul','sp-puces');liste.forEach(x=>ul.append(puce(x)));w.append(ul)}
  else w.append(mk('span','sp-aucun','Aucun spectateur'));
  return w;
}
/* 0.4 : bandeau d'information sous le code du salon quand l'adversaire devient createur (variante A). */
function bandeauPromotion(p){
  let w=document.querySelector('#salon .sp-promo');
  if(!p){if(w)w.remove();return}
  if(!w){w=mk('div','sp-promo');w.setAttribute('role','status');const h=document.querySelector('#salon .sl-haut');if(h)h.after(w);else return}
  w.textContent='';
  const i=mk('span','sp-promo-i','i');i.setAttribute('aria-hidden','true');
  const t=mk('div','sp-promo-t');t.append(mk('b','','Salon : '+p.ancien+' est parti, '+(p.moi?'tu deviens le créateur.':(p.nouveau||'ton adversaire')+' devient le créateur.')));
  t.append(mk('span','',p.moi?'Attends un nouvel adversaire.'
    :'Prends la place libre pour jouer.'));
  const x=mk('button','sp-promo-x','×');x.type='button';x.setAttribute('aria-label','Fermer');
  x.onclick=()=>{const S=SPECobj();if(S&&S.fermerPromotion)S.fermerPromotion();else w.remove()};
  w.append(i,t,x);
}
let enCours=false;
function peindreSalon(etat){
  if(!lie())return;
  const u=q('joueurs');if(!u||!etat)return;
  const S=SPECobj(),moi=etat.moi,j1=etat.j1||{},adv=etat.adv||null,spec=Array.isArray(etat.spectateurs)?etat.spectateurs:[];
  /* 0.6 : un joueur assis voit le salon refait de jouer.js (siegeSalon, colonne des spectateurs, rangee du bas) ; seul le spectateur garde cette vue */
  if(moi!=='spec'){bandeauPromotion(etat.promotion||null);u.classList.remove('sp-3col');document.body.classList.remove('sp-spectateur');document.querySelectorAll('#salon .sp-trib').forEach(x=>x.remove());return}
  u.textContent='';
  /* Siege du createur : Changer de deck s'il est a moi (comme siegeSalon) */
  const s1=siege(j1,moi==='j1',moi==='j1'?[boutonChangerDeck(j1)]:[],!!etat.j1);
  bandeauPromotion(etat.promotion||null);
  let s2;
  if(adv){
    const bs=[];
    if(moi==='adv'){
      bs.push(boutonChangerDeck(adv));
      const p=btn('Passer spectateur','sec');p.id='passerSpectateur';p.onclick=()=>{if(S&&S.passerSpectateur)S.passerSpectateur()};bs.push(p);
    }else if(moi==='spec'){
      const p=btn('Place prise','sec sp-pris');p.disabled=true;p.title=nomP(adv)+" occupe la place d'adversaire";bs.push(p);
    }
    s2=siege(adv,moi==='adv',bs);
  }else{
    const bs=[];
    if(moi==='spec'){
      const d=btn('Devenir adversaire','plein');d.id='devenirAdversaire';d.disabled=enCours;
      d.onclick=()=>{if(!S||!S.devenirAdversaire||enCours)return;enCours=true;d.disabled=true;
        Promise.resolve(S.devenirAdversaire()).then(ok=>{enCours=false;if(!ok)message("Trop tard : la place d'adversaire vient d'être prise.");if(S.etatSalon)peindreSalon(S.etatSalon())},
          ()=>{enCours=false;message("La place d'adversaire n'a pas pu être prise.");if(S.etatSalon)peindreSalon(S.etatSalon())})};
      bs.push(d);
    }
    s2=siegeLibre(bs);
  }
  /* 0.6 : la colonne des spectateurs est celle du salon refait (jouer.js, majSpecs) : plus de tribune en double */
  u.classList.remove('sp-3col');document.querySelectorAll('#salon .sp-trib').forEach(x=>x.remove());
  u.append(s1,mk('div','sl-vs','VS'),s2);
  document.body.classList.toggle('sp-spectateur',moi==='spec');
  /* Spectateur : pas de Pret, une phrase d'etat a la place */
  if(moi==='spec'){
    const p=q('pret'),a=q('attente');if(p)p.hidden=true;
    if(a&&!enCours){a.textContent=adv?'Salon : tu regardes ce salon en spectateur. Prends une place libre pour jouer.':"Salon : place d'adversaire libre. Prends-la pour jouer.";a.classList.toggle('pret',!adv)}
  }
}

/* ---------- Partie ---------- */
const nomJoueur=(E,p)=>E.noms&&E.noms[p]||'Joueur '+(p+1);
function avatarJoueur(E,p){const n=nomJoueur(E,p),u=E.uids&&E.uids[p];return u&&typeof avatarUid==='function'?avatarUid(n,u,E.avatars&&E.avatars[p]||''):avatarDe(n,E.avatars&&E.avatars[p]||'')}
/* etatPartie : etat du moteur (s), ou {etat:s, noms:[j0,j1], avatars:[..], uids:[..], derniere:{id:type,p} ou {c:numero de carte,p}} */
function lisEntree(x){
  if(!x)return null;
  if(x.etat&&x.etat.j){
    /* Forme de SPEC.etatPartie() : {etat, joueurs:[fiche j0, fiche j1], erreur} */
    if(Array.isArray(x.joueurs)&&!x.noms){const f=x.joueurs;return {...x,noms:f.map(o=>o&&o.pseudo||''),avatars:f.map(o=>o&&o.avatar||''),uids:f.map(o=>o&&o.uid||'')}}
    return x}
  if(x.j)return {etat:x,noms:x.noms,avatars:x.avatars};
  return null;
}
/* Derniere carte jouee, a defaut d'etre fournie : derniere pose, amelioration ou remplacement du journal */
function derniereDuLog(s){
  if(typeof NOMS_LOG==='undefined')return null;
  for(let i=s.log.length-1;i>=0;i--){const[p,x]=s.log[i];if(p===null||!/^(pose|remplace|améliore) /.test(x))continue;
    const m=[...x.matchAll(NOMS_LOG.re)].map(z=>NOMS_LOG.m.get(z[0])).filter(o=>o&&o.C);
    if(m.length)return {id:m[m.length-1].C.id,p}} /* id = identifiant de TYPE ('008'), pas un numero de carte de partie */
  return null;
}
function camp(E,s,p,haut){
  const J=s.j[p],d=mk('div','p-camp '+(haut?'lui':'toi'));
  d.append(avatarJoueur(E,p),mk('b','',nomJoueur(E,p)));
  if(!s.fin&&(s.phase==='mulligan'?!s.mull[p]:quiJoue(s)===p))d.classList.add('joue');
  d.append(compteur('main','Main',J.main.length),compteur('deck','Deck',J.deck.length),compteur('defausse','Défausse',J.defausse.length),compteur('enclume','Forge',J.forge.length));
  return d;
}
function terrains(s,cols,haut,bas){
  const t=mk('div','p-terrains'),cc=M.colonnes(s);
  cols.forEach(k=>{const T=s.terrains[k],d=mk('div','p-terrain'),x=cc[k][haut],y=cc[k][bas],to=mk('div','p-totaux');d.dataset.k=k;
    to.append(mk('b','m'+(y>x?' tete':''),String(y)),mk('span','','contre'),mk('b','a'+(x>y?' tete':''),String(x)));
    const te=mk('div','p-tete'),e=mk('button','oeil');te.append(mk('b','',T.nom));
    e.type='button';e.append(ico('oeil'));e.setAttribute('aria-label','Agrandir '+T.nom);
    d.onclick=()=>zoomTerrain(T);d.onmouseenter=()=>montreApercu(d,srcTerrain(T));d.onmouseleave=cacheApercu;
    const Mq=window.GolemsMoteur,v=Mq&&Mq.ptsTerrain?Mq.ptsTerrain(s,k):T.pts;d.append(te,to,mk('span','p-valeur',(effetTerrain(T,'pointsManche')?'? = ':'')+v+(v>1?' pts':' pt')),e); /* 0.4a : Le Tournoi vaut la manche */t.append(d)});
  return t;
}
/* Detail de Force d'une carte en main : Force de base et texte (elle n'est pas encore en jeu) */
function detailMain(C){
  if(C.animal&&typeof detailAnimal==='function')return detailAnimal(C);
  const a=mk('section');a.append(mk('h3','','Force'),lg('Force de base',C.force!=null?String(C.force):'aucune'),lg('Coût',String(C.cout)));
  if(C.texte)a.append(U.effetCouleur?U.effetCouleur(C,'p',''):mk('p','',C.texte));return [a];
}
function zoomMain(c){const C=M.carte(c);cacheApercu();zoom(srcC(c),C.nom,detailMain(C))}
/* Zoom par identifiant de type : si la carte est en jeu chez son joueur, meme zoom que sa case (detail de Force), sinon detail de la carte */
function zoomId(id,p){
  const C=M.CARTES[id];if(!C)return;cacheApercu();
  const s=dernierEtat&&dernierEtat.etat;
  if(s&&p!=null&&s.j[p]){const G=s.j[p].grille;
    for(let l=0;l<G.length;l++)for(let k=0;k<G[l].length;k++){const v=G[l][k];
      if(v&&M.carte(v.c).id===id){const b=document.querySelector('#partie .p-case[data-p="'+p+'"][data-l="'+l+'"][data-k="'+k+'"]');if(b&&b.onclick){b.onclick();return}}}}
  zoom('cartes/'+id+'.jpg',C.nom,detailMain(C));
}
function main(E,s,p,cl,ap){
  const m=mk('div','p-main sp-main '+cl);
  /* Une seule ligne : au-dela de 5 cartes, elles retrecissent */
  m.style.gridTemplateColumns='repeat('+Math.max(5,s.j[p].main.length)+',minmax(0,1fr))';
  s.j[p].main.forEach(c=>{
    const C=M.carte(c),z=mk('div','p-slot'),b=mk('button','p-carte'),i=mk('img');
    b.type='button';i.src=srcC(c);i.alt=C.nom;b.append(i);b.setAttribute('aria-label','Agrandir '+M.nomDetail(C));b.onclick=()=>zoomMain(c);
    z.dataset.c=c;z.append(b);
    z.onmouseenter=()=>{if(ap&&ap.offsetParent&&SURVOL.matches)montre(ap,M.carte(c).id,'Aperçu',null);else montreApercu(z,srcC(c))};
    z.onmouseleave=()=>{cacheApercu();if(ap)montreDerniere(ap)};
    m.append(z)});
  return m;
}
function titreMain(E,s,p,cl){
  const h=mk('div','sp-tmain '+cl),n=s.j[p].main.length,c=mk('span','p-compteur');
  c.append(mk('b','',String(n)),n>1?'cartes':'carte');h.append(mk('b','','Main de '+nomJoueur(E,p)),c);return h;
}
/* id : identifiant de TYPE de carte ('008'), image cartes/<id>.jpg ; p : joueur qui l'a jouee (zoom sur sa case en jeu) */
function montre(ap,id,leg,p){
  const im=ap.querySelector('img'),l=ap.querySelector('.p-ap-leg'),C=id!=null?M.CARTES[id]:null;
  if(!C){delete ap.dataset.id;delete ap.dataset.p;ap.classList.add('vide');im.hidden=true;l.textContent='Aucune carte jouée pour le moment.';return}
  ap.dataset.id=id;if(p!=null)ap.dataset.p=p;else delete ap.dataset.p;
  ap.classList.remove('vide');im.hidden=false;const src=window.imgV?imgV('cartes/'+id+'.jpg'):'cartes/'+id+'.jpg';if(im.getAttribute('src')!==src)im.src=src;im.alt=C.nom;l.textContent=leg;
}
function montreDerniere(ap){
  const E=dernierEtat;if(!E)return;
  const d=E.derniere;
  /* derniere : {id:type} (journal) ou {c:numero de carte de partie} (fourni) */
  const id=d?(d.id!=null?d.id:d.c!=null?M.carte(d.c).id:null):null;
  if(id==null){montre(ap,null);return}
  montre(ap,id,'Dernière carte jouée par '+nomJoueur(E,d.p),d.p);
}
function journal(E,s){
  const jo=mk('details','p-journal'),li=mk('div','p-lignes'),su=mk('summary','','Journal');
  jo.open=spJournalOuvert||LARGE.matches;
  jo.ontoggle=()=>{if(!LARGE.matches)spJournalOuvert=jo.open;if(jo.open)li.scrollTop=li.scrollHeight};
  const pages=pagesLog(s),nb=pages.length,pg=spPage===null?nb:Math.min(spPage,nb),nav=mk('div','j-nav');
  const va=(t,lib,v,off)=>{const z=mk('button','j-btn',t);z.type='button';z.setAttribute('aria-label',lib);z.disabled=off;z.onclick=()=>{spPage=v>=nb?null:v;peindrePartieSpectateur(E)};return z};
  su.append(' ',mk('span','j-manche','Manche '+pg));nav.append(va('<','Manche précédente',pg-1,pg<=1),va('>','Manche suivante',pg+1,pg>=nb));
  const causes=causesLog(s);
  (pages[pg-1]||[]).forEach(e=>{const[p,x]=e,[c,n]=genreLog(x),d=mk('div',c);
    const dv=p!==null&&U.ligneDeckVide&&U.ligneDeckVide(x,nomJoueur(E,p),nomJoueur(E,1-p),false,false); /* deck vide (meule) : X n'a pas pu piocher, +1 point pour Y */
    d.append(ico(n),texteLog(dv||(p===null?'':nomJoueur(E,p)+' : ')+x+(causes.get(e)||'')));li.append(d)});
  jo.append(su,nav,li);
  return {jo,li};
}
let spJournalOuvert=false,spPage=null,spReperes=0;
function peindrePartieSpectateur(etatPartie){
  if(!lie())return;
  const E=lisEntree(etatPartie),box=q('partie');if(!E||!box)return;
  const s=E.etat;
  if(!E.derniere)E.derniere=derniereDuLog(s);
  dernierEtat=E;
  if(s.reperes.length>spReperes)spPage=null;spReperes=s.reperes.length;
  const haut=1,bas=0,cols=[0,1,2],hautPage=scrollY;
  cacheApercu();box.textContent='';box.classList.remove('verrou');box.classList.add('sp','sp-A');
  const table=mk('div','p-table'+(s.fin?' fini':'')),plat=mk('div','p-plateau'),pl=mk('div','p-poste');
  /* Barre : score bas - haut, manche, tour, energie du joueur dont c'est le tour */
  const qui=quiJoue(s),b=mk('div','p-barre'),sc=mk('div','p-score');
  sc.setAttribute('aria-label',nomJoueur(E,bas)+' '+s.j[bas].score+', '+nomJoueur(E,haut)+' '+s.j[haut].score);
  sc.append(mk('b','',String(s.j[bas].score)),mk('span','','-'),mk('em','',String(s.j[haut].score)));
  const tr=mk('div','p-trois');tr.append(info('','manche','Manche',points(s.manche,'Manche')),info('','tour','Tour',points(s.tour,'Tour')),info('score','coupe','Score',sc),info('energie','enclume','Énergie',mk('b','p-ener',String(s.j[qui]?s.j[qui].energie:0))));
  b.append(tr);
  const tdt=mk('div','p-tourde'),pill=mk('span','sp-pill');pill.innerHTML=OEIL;pill.append('Spectateur');
  pill.title=s.fin?'Partie terminée':'Tour de '+nomJoueur(E,qui);
  const sp=mk('span');sp.append(pill);tdt.append(sp,outils());b.append(tdt);
  /* Plateau : grilles sans cible (clic = zoom avec detail de Force, comme en partie) */
  const gh=grilleVue(s,haut,cols,[2,1,0],null),gb=grilleVue(s,bas,cols,[0,1,2],null);gb.classList.add('mienne');
  plat.append(camp(E,s,haut,true),gh,terrains(s,cols,haut,bas),gb,camp(E,s,bas,false));
  /* Colonne centrale : main du haut, derniere carte jouee, main du bas */
  const ap=mk('div','p-apercu'),fi=mk('div','p-ap-img'),im=mk('img');im.alt='';fi.append(im);ap.append(mk('p','p-ap-leg'),fi);
  ap.onclick=()=>{if(ap.dataset.id===undefined)return;zoomId(ap.dataset.id,ap.dataset.p!==undefined?+ap.dataset.p:null)};
  const mh=[titreMain(E,s,haut,'lui'),main(E,s,haut,'lui',ap)],mb=[titreMain(E,s,bas,'toi'),main(E,s,bas,'toi',ap)];
  if(s.fin)pl.append(finBloc(E,s));
  if(LARGE.matches){pl.append(...mh,ap,...mb)}
  else{plat.prepend(...mh);plat.append(...mb)}
  /* Cote : seul Quitter la partie, puis le journal */
  const cote=mk('div','p-cote'),pied=mk('div','p-pied'),qt=btn('Quitter la partie','sec plein');qt.id='quitterSpectateur';
  qt.onclick=()=>{if(typeof quitteBouton==='function')quitteBouton()};pied.append(qt);
  const {jo,li}=journal(E,s);cote.append(pied,jo);
  table.append(b,plat);if(LARGE.matches||s.fin)table.append(pl);table.append(cote);
  box.append(table);li.scrollTop=li.scrollHeight;
  montreDerniere(ap);
  scrollTo(0,hautPage);
}
function finBloc(E,s){
  const f=mk('div','bloc p-fin'),w=s.fin.gagnant;
  f.append(mk('h3',w===null?'f-n':'f-v',w===null?'Match nul':'Victoire de '+nomJoueur(E,w)));
  if(s.fin.abandon!==undefined)f.append(mk('p','p-abandon',nomJoueur(E,s.fin.abandon)+(s.fin.quitte?' a quitté la partie':' a abandonné')));
  f.append(mk('p','',nomJoueur(E,0)+' '+s.j[0].score+' à '+s.j[1].score+' '+nomJoueur(E,1)));
  return f;
}
function quitterVuePartie(){const b=q('partie');if(b)b.classList.remove('sp','sp-A');dernierEtat=null;spPage=null;spReperes=0}
/* Chat du spectateur : meme boite (chatBox) et meme peinture (peintChat) que les joueurs, alimentees par SPEC.chat / SPEC.onChat / SPEC.dit.
   placeChat d'index.html ne la place que si r existe : ici, salon = #chatPlace, partie = chat flottant. */
let chatBranche=false,chatDernier=0;
function estSpec(){const S=SPECobj();return !!(S&&S.estSpectateur&&S.estSpectateur())}
function placerChat(){
  if(!lie()||!chatBox||!estSpec())return;
  const c=chatBox.c,enPartie=!!document.querySelector('#partie.sp')&&!q('partie').hidden;
  if(!enPartie){c.classList.remove('flottant','replie');const z=q('chatPlace');if(z&&c.parentNode!==z)z.append(c)}
  else if(!c.classList.contains('flottant')){c.classList.add('flottant');c.classList.toggle('replie',!U.chatOuvert);document.body.append(c)}
  const S=SPECobj();if(S&&S.chat)peintChat(S.chat());
}
function brancherChat(){
  const S=SPECobj();if(chatBranche||!S||!S.onChat||!lie()||!chatBox)return;chatBranche=true;
  S.onChat(l=>{if(estSpec()&&chatBox.c.isConnected)peintChat(l)});
  const f=chatBox.c.querySelector('form'),i=f.querySelector('input'),orig=f.onsubmit;
  f.onsubmit=e=>{
    if(!estSpec())return orig&&orig.call(f,e);
    e.preventDefault();const m=i.value.replace(/\s+/g,' ').trim().slice(0,200);if(!m||!S.dit)return;
    const t=Date.now();if(t-chatDernier<1000){alerte(chatBox.inf,'Chat : un message par seconde au plus. Patiente un instant.');return}
    chatDernier=t;chatBox.inf.textContent='';i.value='';
    Promise.resolve(S.dit(m)).catch(()=>{alerte(chatBox.inf,'Chat : message non envoyé. Réessaie.');i.value=m});
  };
}
function apresPeinture(){brancherChat();placerChat()}
function mainsVisibles(){const n=c=>document.querySelectorAll('#partie .sp-main.'+c+' .p-slot').length;return {haut:n('lui'),bas:n('toi')}}
const pS=peindreSalon,pP=peindrePartieSpectateur;
window.SPEC_UI={peindreSalon(e){pS(e);apresPeinture()},peindrePartieSpectateur(e){pP(e);apresPeinture()},quitterVuePartie,mainsVisibles};
})();
