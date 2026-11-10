/* Vue joueur : quitter, coups du salon, detail de Force, grille, main, journal, affiche (rendu de la partie). */
/* Ouvre le detail de la Force d'une case du bac a sable (apres repeint : l'etat du moteur est relu). */
function nouvelleGraine(){return Math.floor(Math.random()*2147483646)+1}
/* Depart volontaire : aussi publie dans le lobby, car la presence du salon disparait avec lui. */
function adversaireParti(){
  const g=partie.graine,vu=p=>!p.sameTab&&p.presence&&p.presence.quitte===g;
  return personnes(r.peers()).some(vu)||!!room&&personnes(room.peers()).some(vu);
}
/* 0.6.1 : classee entre joueurs : le verrou (engages) n'est leve qu'apres l'ecriture de la partie (sinon refus des regles). */
function liberePres(a,cl){const e=cl&&!cl.robot&&cl.envoi;if(e)e.finally(()=>a.libere());else a.libere()}
/* envoi : promesse du coup d'abandon, attendue avant d'annoncer le depart. */
function quittePartie(envoi){
  if(partie&&partie.rejeu){finRejeu();return}
  if(partie&&partie.local){if(!partie.tuto)oublieLocal();sortie();return}
  const a=r,g=partie&&partie.graine;
  oublie(code);
  if(!a||!g){sortie();return}
  grainesFinies.add(g);
  if(a.libere)liberePres(a,partie&&partie.classe);
  /* Derniers coups envoyes d'abord, puis depart publie dans le salon, puis dans le lobby : chez l'adversaire, le salon voit le depart avant le lobby (sinon la partie se relancait en boucle). */
  sortie('',Promise.all([envoi,envoiPub]).catch(()=>{}).then(()=>a.presence({quitte:g})).catch(()=>{}).then(()=>room&&room.presence({quitte:g})).catch(()=>{}).then(()=>pause(400)));
}
/* Bouton Quitter la partie : en ligne et en cours, confirmation puis abandon (coup 'a' envoye avant le depart). */
/* Vue joueur : « Quitter » demande toujours confirmation (en ligne : par quitteBouton ; contre le robot : ici) */
function quitteAvecConfirmation(){
  if(!partie||partie.rejeu||!partie.etat||partie.etat.fin||partie.tuto){quitteBouton();return}
  if(!partie.local&&r){quitteBouton();return}
  if(partie.classe){quitteBouton();return} /* 0.6.1 : classee contre le robot : abandon enregistre (quitteBouton) */
  confirmeAbandon('La partie en cours sera perdue.',()=>{if(partie)quitteBouton()},'Quitter la partie ?','Quitter');
}
function quitteBouton(){
  /* 0.6.1 : classee contre le robot en cours : abandon joue (defaite, Elo, historique), ecriture attendue avant de quitter. */
  const robotCl=()=>partie&&partie.local&&partie.classe&&!partie.rejeu&&!partie.tuto&&partie.etat&&!partie.etat.fin;
  if(robotCl()){
    confirmeAbandon('Partir maintenant compte comme une défaite.',async()=>{
      if(!robotCl()){quittePartie();return}
      const p=partie,id=p.graine+'-'+p.debut;
      p.mien.push(M.code({t:'a'}));sel=null;
      calcule(); /* fin par abandon : finClasse (finRobot gagne:false) et historique */
      const fin=Promise.all([p.classe&&p.classe.envoi,typeof envoieAttente==='function'&&compteCo()?envoieAttente(id):null]).catch(()=>{});
      await Promise.race([fin,pause(10000)]);
      if(partie===p)quittePartie();
    },'Quitter la partie ?','Quitter');
    return;
  }
  const enCours=()=>partie&&!partie.local&&!partie.rejeu&&!partie.tuto&&r&&partie.etat&&!partie.etat.fin&&M.VERSION===M0.VERSION;
  /* 0.5.1 : retour a l'accueil apres une partie terminee (hors replay) : Nouveautes si la version n'est pas encore vue */
  if(!enCours()){const fini=partie&&!partie.rejeu&&partie.etat&&partie.etat.fin;quittePartie();if(fini&&!versionVue())onglet('nouveautes');return}
  confirmeAbandon('Partir maintenant compte comme un abandon.',()=>{
    if(!enCours()){quittePartie();return}
    partie.mien.push(M.code({t:'a'}));sel=null;
    const envoi=r.presence({j:M.ecritJournal(partie.mien)});
    calcule(); /* fin par abandon : defaite enregistree ici */
    quittePartie(envoi);
  },'Quitter la partie ?','Quitter');
}
/* Journal de l'adversaire lu dans les coups du salon, meme s'il est parti : son dernier coup est toujours joue (et la partie enregistree). */
function litSien(j){
  if(!partie||partie.local||partie.rejeu||typeof j!=='string')return;
  let l;try{l=M.litJournal(j)}catch(e){return}
  if(l.length>partie.sien.length){partie.sien=l;sel=null;calcule()}
}
function rattrape(){if(partie&&r&&r.journalDe&&partie.adv)litSien(r.journalDe(partie.adv,partie.graine))}
/* Relecture sur le serveur, une fois par partie et par cas (cle), puis suite(). */
function relit(cle,suite){
  const p=partie,a=r;if(!p||!a||!a.journalFrais||!p.adv||p[cle]||(p.etat&&p.etat.fin))return false;
  p[cle]=1;
  a.journalFrais(p.adv,p.graine).then(j=>{if(partie===p&&r===a)litSien(j)},()=>{}).then(()=>{p[cle]=2;if(suite&&partie===p&&r===a)suite()});
  return true;
}
function majPartie(){
  if(!r)return;
  if(partie&&adversaireParti()){
    /* Avant de fermer : coups de l'adversaire pas encore recus (lus dans le salon, puis relus sur le serveur). */
    rattrape();if(partie.relDep===1||relit('relDep',majPartie))return;
    const ab=partie.etat&&partie.etat.fin&&partie.etat.fin.abandon===1-partie.moi;
    grainesFinies.add(partie.graine);
    const cl=partie.classe,rr=r;
    oublie(code);finPartie();notice=ab?'Partie : ton adversaire a abandonné. Tu es de retour dans le salon.':'Partie : ton adversaire a quitté la partie. Tu es de retour dans le salon.';if(rr.libere)liberePres(rr,cl);
    pub({graine:null,jg:null,j:null,veut:null,adv:null});
    $('salon').hidden=false;majSalon();return;
  }
  let l=ordre(r.peers());
  if(partie&&partie.adv)l=l.filter(p=>p.sameTab||p.presence.sid===partie.adv);
  l=l.slice(0,2);
  const prets=l.length===2&&l.every(p=>+p.presence.arrivee>0);
  if(partie){
    if(l.length<2){
      rattrape();relit('relAbs'); /* son dernier coup est peut-etre deja dans le salon */
      $('absence').textContent='Adversaire absent';$('absence').hidden=!!window.DECO; /* coupure ou rechargement ; 0.5 : presence.js affiche Reconnexion / Hors ligne et le minuteur */
      return;
    }
    if(!$('absence').hidden){$('absence').hidden=true;if(partie.etat)affiche()}
  }
  if(!prets)return;
  if(!partie&&maV&&l.some(p=>!vEg(vDe(p),maV)))return; /* versions differentes : aucune partie neuve (moteurs differents) */
  const moi=partie?partie.moi:l.findIndex(p=>p.sameTab);if(moi<0||moi>1)return;
  const g=l[0].presence.graine,lui=l[1-moi];
  /* Revanche : souhait de l'adversaire (veut = graine de la partie finie) suivi a l'ecran de fin */
  if(partie&&partie.etat&&partie.etat.fin&&!partie.local){const lv=lui.presence.veut===partie.graine;if(!!partie.luiVeut!==lv){partie.luiVeut=lv;affiche()}}
  const rejouer=partie&&g===partie.graine&&partie.etat&&partie.etat.fin&&partie.veut&&lui.presence.veut===g;
  /* Salon neuf : la graine attend les deux Pret (voir ticCompte). Rejouer et reprise ne passent pas par la. */
  const neuf=!partie&&!l.some(p=>Number.isInteger(p.presence.jg));
  if(neuf&&!Number.isInteger(g))return;
  if(moi===0&&(!Number.isInteger(g)||rejouer)){pub({graine:nouvelleGraine()});return}
  if(!Number.isInteger(g))return;
  if((!partie||partie.graine!==g)&&grainesFinies.has(g))return; /* partie terminee ou quittee : jamais relancee */
  if(!partie||partie.graine!==g){
    /* Decks : le mien tel que publie avec Pret (ou garde par la partie precedente en cas de Rejouer), le sien lu dans sa presence. */
    const mien=partie?{texte:partie.decks[partie.moi]||'',nom:partie.deckNom}:deckPret,sien=typeof lui.presence.deck==='string'?lui.presence.deck:'';
    const dks=['',''];dks[moi]=mien.texte||'';dks[1-moi]=sien;
    if(!partie&&M.erreurElements)[0,1].forEach(p=>{const o=M.lisDeck(dks[p]);if(o&&(M.erreurElements(o)||(M.erreurEvolutions&&M.erreurEvolutions(o))))dks[p]=''}); /* 0.4a : deck a 5 elements = deck par defaut, des deux cotes ; 0.5 : idem evolution sans sa base */
    if(moi===0&&r&&r.engage)r.engage([l[0].peer,l[1].peer],g,partie&&partie.classe&&partie.classe.envoi); /* 0.6.1 : graine dans le verrou (regles du classe) ; revanche : nouveau verrou une fois la partie precedente ecrite */
    lancer(g,moi,typeof lui.presence.sid==='string'?lui.presence.sid:'',{mien:[],sien:[],decks:dks,deckNom:mien.texte?mien.nom:'',classe:salonClasse?{sa:code,a:l[0].peer,b:l[1].peer}:null});if(partie.classe)prepareClasse(partie.classe);sauve();return} /* 0.6 : classee entre joueurs (uids des places 0 et 1) */
  if(partie.advNom!==nomDe(lui)){partie.advNom=nomDe(lui);sauve()}
  if(lui.presence.jg!==g||typeof lui.presence.j!=='string')return;
  let liste;try{liste=M.litJournal(lui.presence.j)}catch(e){return}
  if(liste.length>partie.sien.length){partie.sien=liste;sel=null;calcule()}
}
/* Revanche annulee avant la reponse de l'adversaire : le souhait est retire de la presence */
function annuleRevanche(){if(!partie||partie.local||!partie.veut)return;partie.veut=false;sauve();pub({veut:null});affiche()}
function joue(a){
  if(!partie||partie.rejeu)return;
  if(window.SPEC&&SPEC.estSpectateur())return; /* spectateur : aucun coup */
  partie.mien.push(M.code(a));
  sel=null;selMull=[];selCases=[];modeVaisseau=false;modeFaille=false;modeCaramel=false;modeLove=false;modeTarte=false;
  sauve();pub({j:M.ecritJournal(partie.mien)});calcule();
}
function uidJ(p){
  const q=r&&partie&&partie.adv?personnes(r.peers()).find(x=>x.presence.sid===partie.adv):(r?ordre(r.peers()).slice(0,2)[p]:null);
  return q&&!q.sameTab?q.peer:'';
}
function nomJ(p){
  if(partie){
    if(p===partie.moi)return pseudo||'Joueur';
    const q=r&&partie.adv?personnes(r.peers()).find(x=>x.presence.sid===partie.adv):null;
    if(q)return nomDe(q);
    if(partie.advNom)return partie.advNom;
  }
  const l=r?ordre(r.peers()).slice(0,2):[];
  return l[p]?nomDe(l[p]):'Adversaire';
}
/* Cœur du favori d'Indra : dessin vectoriel (le caractère ♥ devient un émoji sur certains téléphones), contour sombre comme les chiffres. */
const COEUR='<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 20.6C6.6 16.9 2.6 13.4 2.6 9.2 2.6 6.4 4.7 4.3 7.3 4.3c1.9 0 3.6 1 4.7 2.7 1.1-1.7 2.8-2.7 4.7-2.7 2.6 0 4.7 2.1 4.7 4.9 0 4.2-4 7.7-9.4 11.4z" fill="currentColor" stroke="#0a121a" stroke-width="2.4" stroke-linejoin="round" paint-order="stroke"/></svg>';
function miniVue(s,p,l,k){
  const v=s.j[p].grille[l][k],C=M.carte(v.c);
  if(C.animal){ /* animal de compagnie : nom, cout, maitre ; ni Force ni element */
    const m=el('span','mini animal'),co=el('span','cout'),ba=el('span','bas');
    co.append(ico('enclume'),String(C.cout));ba.append(co,el('span','ani','Animal'));
    m.append(el('span','nom',C.nom),ba);m.title=C.nom+', animal de compagnie de '+M.CARTES[C.maitre].nom;return m;
  }
  const m=el('span','mini'),co=el('span','cout'),ba=el('span','bas'),f=el('span','f'),e=el('span','els');
  m.style.setProperty('--a','var(--fm-'+C.el[0]+')');m.style.setProperty('--b','var(--fm-'+C.el[1]+')');
  C.el.forEach(x=>{const i=el('img');i.src=imgV('cartes/'+x+'.png');i.alt='';i.width=22;i.height=22;e.append(i)});
  co.append(ico('enclume'),String(C.cout));ba.append(co);if(C.base){const st=el('span','evs','★');st.setAttribute('aria-hidden','true');ba.append(st)} /* degats, Rage, bonus : plus de pastille, la couleur du chiffre de Force et le zoom suffisent */
  const fv=M.favori?M.favori(s,p,v.c):0; /* 0.2a.1 : favori d'Indra, coeur seul a gauche de l'hexagone (le bonus est dans le chiffre et au zoom) */
  let hf=null;if(fv){hf=el('span','fav');hf.innerHTML=COEUR;hf.title="Favori d'Indra";hf.setAttribute('role','img');hf.setAttribute('aria-label',"Favori d'Indra, +"+fv+' de Force')}
  if(COPIEUR[C.id]&&v.cp!==undefined){const n=v.cp?M.CARTES[v.cp]:null,h=el('span','cp',n?'Copie '+(n.base?M.CARTES[n.base].nom:n.nom):'Sans copie');h.title=h.textContent+'\n'+(n?COPIEUR[C.id]+" : copie l'effet de "+M.nomDetail(n):COPIEUR[C.id]+' : rien à copier'); /* texte entier en premiere ligne (l'etiquette peut etre coupee) */m.append(h)}
  const fa=M.forceDe(s,p,l,k),sf=sensForce(fa,v.f);if(sf)f.classList.add(sf);
  f.append(ico('force'),el('b','',String(fa)));
  m.append(el('span','nom',C.base?M.CARTES[C.base].nom:C.nom),e,ba,f);if(hf)m.append(hf);
  return m;
}
/* Detail de Force d'un Golem : lecture seule de l'etat du moteur. */
/* Elements : modele unique cartes/donnees/interface.js (elements) */
const ELEMENTS=window.GolemsDonnees.interface.elements,COUL_CARTE=window.GolemsDonnees.interface.couleursCarte,NOMS_EL=Object.fromEntries(ELEMENTS.ordre.map(e=>[e,ELEMENTS[e].nom]));
function signe(n){return (n>=0?'+':'')+n}
function lg(t,v,cl){const d=el('div','lg'+(cl?' '+cl:''));d.append(el('span','',t),el('b','',v));return d}
/* Identifiant d'effet : le Maitre du deguisement (029e) et Le chansonnier (041e) portent l'effet copie. Anciens moteurs (rejeu) : celui de la carte. */
const effId=g=>M.idEff?M.idEff(g):M.carte(g.c).id;
/* Copieurs (badge « Copie X », detail de Force) : code -> nom de la capacite qui copie (meme liste que COPIEURS du moteur). */
const COPIEUR={};idsAvecEffet('copie').forEach(id=>{const t=M0.CARTES[id].texte||'',i=t.indexOf(' :');COPIEUR[id]=i>0?t.slice(0,i):''}); /* type d'effet copie (fiches) -> nom de capacite (texte avant « : ») */
const CERCLE_2=idsAvecEffet('cercle'); /* Counter-pick et Full synergie : cercle +2 (type d'effet cercle des fiches, comme le moteur) */
/* Comeback (Bellock, Aiges Captain) et Winstreak (Loxim, Le Ace de Aiges) : Force par manche, perdue (0) ou remportee (1) sur son terrain (meme table que DUO_MANCHE du moteur) */
const DUO_MANCHE={};idsAvecEffet('forceParManche').forEach(id=>{const r=effetDe(id,'forceParManche');DUO_MANCHE[id]=[r.bonus,r.gagne?1:0]}); /* lu dans les fiches : [bonus, gagnee] */
/* Couleur de la Force en jeu : 'plus' au-dessus de la Force de base (g.f, résultat du dé pour Alrevan), 'moins' en dessous. */
const sensForce=(fa,f)=>fa>f?'plus':fa<f?'moins':'';
/* Nom de capacité d'une carte (texte avant « : », moteur en service M0 : les anciens textes disaient « En jeu »), pour dire d'où vient un bonus */
const capa=id=>{const t=(M0.CARTES[id]||{}).texte||'';const i=t.indexOf(' :');return i>0?t.slice(0,i):''};
function detailForce(s,p,l,k){
  const G=s.j[p].grille,g=G[l][k],C=M.carte(g.c),a=el('section'),id=effId(g),fa=M.forceDe(s,p,l,k);
  let somme=0;const ajoute=(t,n,v)=>{somme+=n;a.append(lg(t,v!==undefined?v:signe(n)))};
  a.append(el('h3','','Force'));
  if(COPIEUR[C.id]&&g.cp!==undefined)a.append(lg(g.cp?COPIEUR[C.id]+' : copie '+M.nomDetail(M.CARTES[g.cp]):COPIEUR[C.id]+' : rien à copier',''));
  {const r=effetDe(id,'forceAuDe');ajoute(r?(r.des>1?'Résultat des dés':'Résultat du dé'):'Force de base',g.f,String(g.f))}
  const vs=[[l-1,k],[l+1,k],[l,k-1],[l,k+1]].map(([x,y])=>G[x]&&G[x][y]).filter(Boolean);
  vs.forEach(v=>{const c=M.carte(v.c),e=effId(v);if(effetDe(e,'bonusVoisins'))ajoute((capa(e)||'Bonus')+' : voisin '+M.nomDetail(c)+(c.id!==e?' (copie de '+M0.CARTES[M0.CARTES[e].base||e].nom+')':''),1)});
  if(g.ra)ajoute('Rage',g.ra);
  if(g.ani)ajoute('Animal : '+M.carte(g.ani.c).nom,1); /* 0.5 : animal attache */
  if(M.indrasDe)M.indrasDe(s,p,g.c).forEach(n=>ajoute('Favori de '+M.nomDetail(M.carte(n.c)),M.FAV_BONUS[effId(n)]));
  if(g.fav!==undefined&&M.FAV_BONUS&&M.FAV_BONUS[id]){const x=G.flat().find(h=>h&&h.c===g.fav);if(x)a.append(lg('Son favori : '+M.nomDetail(M.carte(x.c)),'♥'))}
  let d=g.d;
  {const r=effetDe(C.id,'pertesFinManche'),X=r&&r.degats;if(r&&d>=X-1){
    const n=Math.min(Math.floor(d/X),s.log.filter(([q,x])=>q===p&&x===M0.CARTES[C.id].nom+' perd '+X+' de Force.').length); /* ligne du journal du moteur */
    if(n){ajoute(capa(C.id)+' : fin de manche',-X*n);d-=X*n}}
  }
  if(M.generaux){const n=M.generaux(G,l,k);if(n)ajoute('Grand Général',n)} /* GeneralBrioche : +1 par GeneralBrioche allie de la colonne (pas lui-meme) */
  if(effetDe(id,'forceParGolem',r=>r.compte==='voisins')){const n=vs.filter(v=>!M.carte(v.c).animal).length;ajoute("Bonus d'adjacence"+(n?'':' : aucun voisin'),n)} /* Le civ player : +1 par voisin allie */
  if(g.sub&&g.sub.length)ajoute('Sub offert',g.sub.length); /* JackJoy : bonus recus, gardes jusqu'a la fin de la partie */
  if(g.dr&&g.dr.length)ajoute('Draft diff',g.dr.length);
  if(d>0)ajoute('Dégâts subis',-d);
  const gs=vs.filter(v=>!M.carte(v.c).animal);
  C.el.forEach(e=>{const n=gs.filter(v=>M.carte(v.c).el.includes(e)).map(v=>M.nomDetail(M.carte(v.c)));
    ajoute('Trait '+NOMS_EL[e]+(n.length?' : voisin '+n.join(', '):' : aucun voisin'),M.TRAIT_CUMULE?n.length:Math.min(n.length,1))}); /* 0.2.1 : +1 par voisin */
  if(effetDe(id,'synergie')){const n=C.el.filter(e=>gs.some(v=>M.carte(v.c).el.includes(e))).length;if(n)ajoute(capa(id)+' : '+(n>1?'2 éléments partagés':'1 élément partagé'),n)}
  if(effetDe(id,'forceParGolem',r=>r.compte==='element')&&M.foudres){const n=M.foudres(G);if(n)ajoute(capa(id)+' : '+n+(n>1?' Golems Foudre':' Golem Foudre')+' en jeu',n)}
  if(effetDe(id,'forceParGolem',r=>r.compte==='dessus')&&M.kekwait){const n=M.kekwait(G,l,k);ajoute((capa(id)||'KEKWait')+' : '+(n?n+(n>1?' Golems alliés':' Golem allié'):'aucun Golem allié')+' au-dessus',n)} /* Shifukuro, ou Apo et chansonnier qui l'ont copié */
  if(DUO_MANCHE[id]&&M.duoManches){ /* Bellock et Loxim (ou Apo et chansonnier qui les ont copiés) : manches de ce terrain, lues dans s.resultats */
    const[x,w]=DUO_MANCHE[id],n=M.duoManches(s,p,k,!!w),q=w?'remportée':'perdue';
    ajoute((capa(id)||(w?'Winstreak':'Comeback'))+' : '+(n?n+' manche'+(n>1?'s '+q+'s':' '+q):'aucune manche '+q)+' sur ce terrain'+(n&&x>1?' (+'+x+' chacune)':''),x*n)}
  if(M.doubleUp&&M.DUO&&M.DUO[id]&&M.CARTES[id].base){ /* Double up ? des évolutions du duo : une seule fois, ligne ou terrain */
    const v=M.doubleUp(G,l,k,id),nP=M.CARTES[M.DUO[id]].nom;
    ajoute(v?'Double up ? : seul avec '+M.nomDetail(M.carte(v.c))+' sur '+(G[l].includes(v)?'sa ligne':'son terrain'):'Double up ? : pas seul avec '+nP+' sur sa ligne ni son terrain',v?M.REGLAGE_DUO.doubleUp:0)}
  {const r=effetTerrain(s.terrains[k],'paire');if(r&&M.golemsIci&&M.golemsIci(s,p,k)===r.n)ajoute(s.terrains[k].nom+' : exactement '+r.n+' Golems ici',r.bonus)} /* 0.4a */
  const h=s.j[1-p].grille[l][k],hC=h?M.carte(h.c):null,dom=hC?C.el.find(e=>hC.el.includes(M.DOMINE[e])):null,c2=dom&&(M.cercle2?M.cercle2(G,k,id):CERCLE_2.includes(id)),c2n=CERCLE_2.includes(id)?', Counter-pick':', Info tchat'; /* Vic222 : +2 aussi dans sa colonne */
  ajoute(dom?'Cercle : '+NOMS_EL[dom]+' domine '+NOMS_EL[M.DOMINE[dom]]+' ('+M.nomDetail(hC)+' en face)'+(c2?c2n:''):hC&&!hC.animal?'Cercle : '+M.nomDetail(hC)+' en face, pas de domination':'Cercle : aucun Golem en face',dom?(c2?2:1):0,dom?(c2?'+2':'+1'):'+0');
  {const r=effetDe(id,'immunite',r=>r.unique);if(r)a.append(lg(r.nom,g.cdb?'utilisée':'disponible'))} /* Vic222 : bouclier unique (g.cdb une fois utilisé) */
  if(fa!==somme)ajoute('Autres effets',fa-somme); /* filet : le total affiché reste celui du moteur */
  const t=lg('Force actuelle',String(fa),'tot'),sf=sensForce(fa,g.f);if(sf)t.lastChild.classList.add(sf);a.append(t);
  return [a];
}
/* Chiffres redessinés (badgeForce, badgeSurcout) en Anton (Google Fonts, chargée avec Lilita One) : même dessin qu'Impact, présente sur tous les appareils.
   Taille = Impact x 0,931 (même hauteur de chiffre), décalages recalés chiffre par chiffre ; textLength garde la chasse d'Impact.
   Tant qu'Anton n'est pas chargée, le chiffre reste caché (classe attente) : pas de saut de police visible. */
const ANTON="400 88px Anton";
function attendAnton(k){
  if(!document.fonts||document.fonts.check(ANTON))return;
  k.classList.add('attente');const f=()=>k.classList.remove('attente');
  document.fonts.load(ANTON).then(f,f);setTimeout(f,2500);
}
if(document.fonts){const pre=()=>document.fonts.load(ANTON).catch(()=>0);if(document.readyState==='complete')pre();else addEventListener('load',pre)}
/* Hexagone de Force de la carte redessiné à l'identique par-dessus l'image (force() de generer_cartes.py : pans en relief, Impact 323,28,
   décalages par chiffre), avec la Force actuelle : blanc si égale à la base, vert au-dessus, rouge en dessous (mêmes teintes que la grille). */
const FORCE_SIL='M281.2 52 L318.8 52 Q398.7 112 499.75 126 L499.75 390 L325.85 512 L295.3 534 L280 547 L100.25 390 L100.25 126 Q201.3 112 281.2 52Z',
  FORCE_PANS=[['M300 98 L285 98 Q210 152 144 164 L144 370 L281 490 Z','#bf6049'],['M300 98 L315 98 Q390 152 456 164 L456 367 L281 490 Z','#8a3524'],
    ['M281.2 52 L300 52 L300 98 L285 98Z','#d27a5e'],['M300 52 L318.8 52 L315 98 L300 98Z','#a4452f'],
    ['M318.8 52 Q398.7 112 499.75 126 L456 164 Q390 152 315 98Z','#d27a5e'],['M499.75 126 L499.75 390 L456 367 L456 164Z','#70291b'],
    ['M499.75 390 L325.85 512 L295.3 534 L280 547 L281 490 L456 367Z','#551d13'],['M280 547 L100.25 390 L144 370 L281 490Z','#a4452f'],
    ['M100.25 390 L100.25 126 L144 164 L144 370Z','#d27a5e'],['M100.25 126 Q201.3 112 281.2 52 L285 98 Q210 152 144 164Z','#efb096']],
  FORCE_DEC=[[-.01,32.39],[3.04,32.86],[-2.27,33.46],[1.33,31.67],[.42,32.71],[-.63,30.92],[-2.37,32.71],[-.79,32.86],[.24,32.69],[-2.37,32.55]],
  FORCE_COUL={plus:'#3ee86a',moins:'#ff3b30','':'#fff'};
function badgeForce(fa,f){
  const t=String(fa),sf=sensForce(fa,f),d=t.length>1?[0,32.3]:FORCE_DEC[+t]||[0,32.3],
    L=Math.min(330,[...t].reduce((a,x)=>a+(x>='0'&&x<='9'?ENC_CH[+x]:x==='-'?26:22)*323.28/88,0)),k=el('span','force-zoom');
  k.setAttribute('role','img');k.setAttribute('aria-label','Force actuelle '+t+(sf?', Force de base '+f:''));
  k.innerHTML='<svg viewBox="0 0 750 1050" aria-hidden="true"><svg x="611.1" y="24" width="116.9" height="135" viewBox="71 35 458 529" preserveAspectRatio="xMidYMin meet" overflow="visible">'
    +FORCE_PANS.map(([p,c])=>'<path d="'+p+'" fill="'+c+'" stroke="'+c+'" stroke-width="1.5" stroke-linejoin="round"/>').join('')
    +'<path d="M160 180 Q222 166 288 116" fill="none" stroke="#ffe3d6" stroke-opacity=".55" stroke-width="7" stroke-linecap="round"/>'
    +'<path d="'+FORCE_SIL+'" fill="none" stroke="#0b0a10" stroke-width="34" stroke-linejoin="round"/>'
    +'<text x="'+(300+d[0])+'" y="'+(396+d[1])+'" text-anchor="middle" textLength="'+L.toFixed(1)+'" lengthAdjust="spacingAndGlyphs" fill="'+FORCE_COUL[sf]+'" stroke="#0b0a10" stroke-width="44.08" stroke-linejoin="round" paint-order="stroke" style="font:400 301px Anton,Impact,\'Lilita One\',sans-serif">'+t+'</text></svg></svg>';
  attendAnton(k);return k;
}
/* 0.5 : animal attache sous son maitre (affichage valide, piste A des maquettes « 12 - Animaux attachés »).
   Au repos : rien ne depasse, seule la Force du maitre montre le +1 (vert, comme tout bonus : sensForce).
   A la pose (dernier evenement 'p' du moteur = cet animal) : la carte arrive par-dessus la tuile, glisse dessous puis disparait (CSS .ani-pose, aniPose).
   L'animation reprend ou elle en etait si la vue est repeinte (delai negatif). Vue joueur et vue spectateur passent toutes deux par grilleVue. */
const PATTE='<svg viewBox="0 0 24 24" aria-hidden="true"><g fill="currentColor"><ellipse cx="12" cy="16.5" rx="5.2" ry="4.3"/><ellipse cx="5.2" cy="10.5" rx="2.2" ry="2.8"/><ellipse cx="9.3" cy="6" rx="2.2" ry="2.9"/><ellipse cx="14.7" cy="6" rx="2.2" ry="2.9"/><ellipse cx="18.8" cy="10.5" rx="2.2" ry="2.8"/></g></svg>';
const ANI_POSE=1300,aniVu={};
function vueAnimalAttache(b,g,s,p){
  if(!g||!g.ani)return;const A=M.carte(g.ani.c);b.classList.add('a-ani');
  b.title=(b.title?b.title+' ; ':'')+A.nom+' (animal, sous son maître) : +1 de Force';
  const ev=s&&s.stats&&s.stats.ev;if(!ev||!ev.length||matchMedia('(prefers-reduced-motion: reduce)').matches)return;
  let i=ev.length-1;while(i>=0&&ev[i].t!=='p')i--;const e=ev[i];if(!e||e.cc!==g.ani.c||e.cp!==p)return;
  const q=p+':'+i+':'+e.cc,t=performance.now();if(!(q in aniVu))aniVu[q]=t;const t0=aniVu[q];if(t-t0>ANI_POSE)return;
  const d=el('span','ani-pose');d.style.backgroundImage='url("'+imgV('cartes/'+A.id+'.jpg')+'")';d.style.animationDelay=((t0-t)/1000)+'s';
  b.classList.add('ani-vol');b.prepend(d);setTimeout(()=>{d.remove();b.classList.remove('ani-vol')},t0+ANI_POSE-t+20);
}
/* Clic sur la tuile d'un maitre avec son animal : les deux cartes, le maitre (blanc, dore si evolution), « Kiwi : +1 de Force », l'animal (vert) et son effet. */
function detailMaitreAnimal(g){
  fermeDetailAnimal();const C=M.carte(g.c),A=M.carte(g.ani.c),d=el('div','');d.id='aniDet';d.setAttribute('role','dialog');d.setAttribute('aria-label',C.nom+' et '+A.nom);
  const x=el('button','x','×');x.type='button';x.setAttribute('aria-label','Fermer');x.onclick=fermeDetailAnimal;
  const im=c=>{const i=el('img');i.src=imgV('cartes/'+c.id+'.jpg');i.alt=c.nom;return i};
  const t=el('div','t'),h=el('h3','',C.nom),l=el('div','l');h.style.color=C.base?'var(--or)':'#fff';
  l.innerHTML=PATTE;l.append(A.nom+' : +1 de Force');
  t.append(h,effetCouleur(C),l,el('h3','an',A.nom),effetCouleur(A),el('div','e rap',"Sous son maître. Part si le maître est détruit ou remplacé, reste s'il évolue."));
  const f=el('div','ani-fond');f.onclick=fermeDetailAnimal;
  d.append(x,im(C),im(A),t);document.body.append(f,d);x.focus({preventScroll:true});
}
/* Nom d'effet en couleur, comme sur la carte (generer_cartes.py / generer_animaux.py) : evolution en or, base = teinte claire de l'element 1 (TEXTE_ELT), animal = VERT_CLAIR */
/* Fonction commune a tous les panneaux de detail et zooms (vue joueur, vue spectateur, diffusion) : GOLEMS_UI.effetCouleur */
function effetCouleur(C,tag,cls){const d=el(tag||'div',cls===undefined?'e':cls),x=C.texte||'',i=x.indexOf(' :');if(i<0){d.textContent=x;return d}
  const b=el('b','',x.slice(0,i+2));b.style.color=C.animal?COUL_CARTE.animal:C.base?COUL_CARTE.evoEffet:(ELEMENTS[C.el[0]]||{}).texte||'#fff';d.append(b,x.slice(i+2));return d}
function fermeDetailAnimal(){document.querySelectorAll('#aniDet,.ani-fond').forEach(x=>x.remove())}
addEventListener('keydown',e=>{if(e.key==='Escape'&&document.getElementById('aniDet'))fermeDetailAnimal()});
function detailAnimal(C){const a=el('section');a.append(el('h3','','Animal de compagnie'),lg('Maître',M.CARTES[C.maitre].nom),lg('Force','aucune'),effetCouleur(C,'p',''));return [a]}
function ouvreTas(titre,ids){
  const b=$('tasCartes');b.textContent='';$('tasTitre').textContent=titre;$('tasVide').hidden=ids.length>0;
  /* entree {c,n} : deck du joueur trie par nom et regroupe (« Glad x2 ») */
  ids.forEach(x=>{const g=typeof x==='object',c=g?x.c:x,C=M.carte(c),i=el('img');i.src=imgV('cartes/'+C.id+'.jpg');i.alt=C.nom;
    if(g){const f=el('figure','tas-g');f.append(i,el('figcaption','',M.nomDetail(C)+' x'+x.n));b.append(f)}else b.append(i)});
  $('vueTas').hidden=false;$('tasFermer').focus();
}
/* Piles d'un joueur (correctif 0.5a) : Forge et Defausse consultables des deux cotes ; Deck : le sien seulement, trie par nom
   et regroupe (jamais l'ordre de pioche) ; deck adverse : nombre seul. Rejeu et spectateurs : deck jamais ouvert ici (inchange). */
function tasPile(p,k){if(!partie||!partie.etat)return null;const J=partie.etat.j[p];
  if(k==='forge')return J.forge.slice();if(k==='defausse')return J.defausse.slice().reverse();
  if(k!=='deck'||p!==partie.moi||partie.rejeu||window.SPEC&&SPEC.estSpectateur&&SPEC.estSpectateur())return null;
  const m=new Map();J.deck.forEach(c=>{const k=M.nomDetail(M.carte(c)),x=m.get(k);if(x)x.n++;else m.set(k,{c,n:1,nom:k})}); /* exemplaires d'une meme carte (codes differents) regroupes par nom */
  /* 0.6.1 : meme regle que l'onglet Decks (cmpNomCarte de v06-divers) : cle = nom de la base pour une evolution, animaux meles, base avant son evolution. */
  const C=M.CARTES,id=x=>(M.carte(x.c)||{}).id,cle=i=>{const y=C[i]||{};return y.base&&C[y.base]?C[y.base].nom:(y.nom||'')};
  return [...m.values()].sort((a,b)=>{const i=id(a),j=id(b);return cle(i).localeCompare(cle(j),'fr',{sensitivity:'base',numeric:true})||(!!(C[i]||{}).base-!!(C[j]||{}).base)||a.nom.localeCompare(b.nom,'fr')})}
const LIB_PILE={deck:'Deck',forge:'Forge',defausse:'Défausse'};
function voirPile(p,k){const t=tasPile(p,k);if(t)ouvreTas(LIB_PILE[k]+(p===partie.moi?'':' de '+nomJ(p))+(k==='deck'?' (trié par nom)':''),t)}
/* compteur du bandeau d'un camp (Deck, Defausse, Forge ou Energie) : ouvre la pile, comme les piles de la vue joueur */
function compteurPile(x,p,k){if(partie.rejeu||!tasPile(p,k))return x;x.classList.add('clic');x.tabIndex=0;x.setAttribute('role','button');x.setAttribute('aria-label','Voir '+LIB_PILE[k]+(p===partie.moi?'':' de '+nomJ(p)));
  x.onclick=()=>voirPile(p,k);x.onkeydown=e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();voirPile(p,k)}};return x}
let uidN=0;
/* Enclume B : Ressources/9 - Pictos points/Enclume relief.svg, sans le chiffre. Ids uniques : un doublon masque casserait le rendu. */
function enclumeB(){const n=++uidN,P='M50 14L170 14L170 52L140 58Q130 78 136 100L158 114L158 148L42 148L42 114L64 100Q70 78 60 58L52 56Q20 50 6 16Z';
  return '<svg viewBox="0 9 180 144" aria-hidden="true" style="overflow:visible"><defs><clipPath id="cB'+n+'"><path d="'+P+'"/></clipPath><linearGradient id="gB'+n+'" x1="10" y1="10" x2="165" y2="150" gradientUnits="userSpaceOnUse"><stop offset="0" stop-color="#a9b4bd"/><stop offset=".42" stop-color="#6f7a84"/><stop offset=".62" stop-color="#3b434b"/><stop offset="1" stop-color="#1f252a"/></linearGradient><linearGradient id="fB'+n+'" x1="0" y1="20" x2="0" y2="148" gradientUnits="userSpaceOnUse"><stop offset="0" stop-color="#4b545d"/><stop offset="1" stop-color="#2d343b"/></linearGradient></defs><g clip-path="url(#cB'+n+')"><rect width="180" height="160" fill="url(#fB'+n+')"/><path d="M100 0H180V160H100Z" fill="#000" fill-opacity=".2"/><path d="'+P+'" fill="none" stroke="url(#gB'+n+')" stroke-width="20"/></g><path d="'+P+'" fill="none" stroke="#0b0a10" stroke-width="10" stroke-linejoin="round"/></svg>'}
function pile(cls,lib,n,tas){
  const d=el('div','pile '+cls+(n?'':' vide')),o=el('span','dos'),v=el('span','v-ico');
  o.append(el('span','fond'));
  if(cls==='forge')v.insertAdjacentHTML('beforeend',enclumeB());
  else{const i=el('img');i.src=imgV('cartes/logo.png');i.alt='';v.append(i)}
  o.append(v,el('span','v-mot',lib.toUpperCase()),el('span','v-nb',String(n)));d.append(o);d.setAttribute('aria-label',lib+' : '+n);
  if(tas&&n){d.classList.add('clic');d.tabIndex=0;d.setAttribute('role','button');d.setAttribute('aria-label','Voir '+lib+' : '+n);d.onclick=()=>ouvreTas(lib,tas);d.onkeydown=e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();ouvreTas(lib,tas)}}} /* 0.4a : plus d'oeil, la pile entière s'ouvre */
  return d;
}
/* Bandeau « Remplacer / Améliorer N +X » des cases : mesuré à chaque changement de taille de la case et au chargement des polices ; trop large pour une ligne : « Remp. / Amél. N +X ». */
function ajusteRemp(a){
  a.classList.remove('court','serre');if(!a.offsetWidth)return;
  /* largeur du texte comparée à la place entre les marges intérieures (scrollWidth ignore la marge de droite) ; k : échelle d'un éventuel transform.
     Forme courte encore trop large (case très étroite, +X à 2 chiffres) : marges intérieures réduites (serre). */
  const r=document.createRange();r.selectNodeContents(a);
  const deborde=()=>{const b=a.getBoundingClientRect(),k=b.width/a.offsetWidth,s=getComputedStyle(a);return r.getBoundingClientRect().width>b.width-(parseFloat(s.paddingLeft)+parseFloat(s.paddingRight))*k+.5*k};
  if(deborde()){a.classList.add('court');if(deborde())a.classList.add('serre')}}
const obsRemp=window.ResizeObserver?new ResizeObserver(es=>{for(const e of es){if(e.target.isConnected)ajusteRemp(e.target);else obsRemp.unobserve(e.target)}}):null;
if(document.fonts&&document.fonts.addEventListener)document.fonts.addEventListener('loadingdone',()=>document.querySelectorAll('.p-case>.act').forEach(a=>{if(a.querySelector('.act-c'))ajusteRemp(a)}));
function grilleVue(s,p,cols,lignes,cible){
  const g=el('div','p-grille'),J=s.j[p];
  lignes.forEach(l=>cols.forEach(k=>{
    const v=J.grille[l][k],b=el('button','p-case');b.type='button';
    b.dataset.p=p;b.dataset.l=l;b.dataset.k=k;
    const lib=cible&&cible(l,k);
    if(v){
      const C=M.carte(v.c);if(C.base)b.classList.add('evo');
      b.append(miniVue(s,p,l,k));vueAnimalAttache(b,v,s,p);
      if(C.animal){b.classList.add('animal');b.setAttribute('aria-label',C.nom+', animal de compagnie de '+M.CARTES[C.maitre].nom+', coût '+C.cout);b.onclick=()=>{dernier=null;zoom(imgV('cartes/'+C.id+'.jpg'),C.nom,detailAnimal(C))}}
      else{
      const fa=M.forceDe(s,p,l,k);
      b.setAttribute('aria-label',M.nomDetail(C)+(C.base?', évolution':'')+', coût '+C.cout+', Force '+fa+(fa!==v.f?' (base '+v.f+')':'')+(v.d>0?', dégâts '+v.d:'')+(v.ra?', Rage +'+v.ra:'')+(M.favori&&M.favori(s,p,v.c)?", favori d'Indra":''));
      b.onclick=v.ani?()=>{dernier=null;detailMaitreAnimal(v)}:()=>{dernier=null;zoom(imgV('cartes/'+C.id+'.jpg'),C.nom,detailForce(s,p,l,k),[badgeForce(fa,v.f)])};}
    }else b.disabled=!lib;
    if(lib){
      b.classList.add(lib.choisie?'choisie':'cible');b.dataset.act='case';
      let porte=b;
      if(lib.texte){if(v){porte=el('span','act');b.append(porte);
        /* « Remplacer » / « Améliorer » si ça tient sur une ligne, sinon « Remp. » / « Amél. » (le cout de la carte en place reste visible) : mesuré par ajusteRemp. */
        const mo=/^(Remplacer|Améliorer) /.exec(lib.texte);
        if(mo){porte.append(el('span','act-l',mo[1]),el('span','act-c',mo[1]==='Remplacer'?'Remp.':'Amél.'),lib.texte.slice(mo[1].length));if(obsRemp)obsRemp.observe(porte)}else porte.textContent=lib.texte}
        else b.textContent=lib.texte}
      if(lib.bonus){
        const B=lib.bonus,n=B.trait+B.cercle+(B.synergie||0)+(B.survolte||0)+(B.kekwait||0)+(B.comeback||0)+(B.winstreak||0)+(B.doubleup||0),det='Bonus prévu : Trait +'+B.trait+', cercle +'+B.cercle+(B.synergie?', Full synergie +'+B.synergie:'')+(B.survolte?', Survolté +'+B.survolte:'')+(B.kekwait?', KEKWait +'+B.kekwait:'')+(B.comeback?', Comeback +'+B.comeback:'')+(B.winstreak?', Winstreak +'+B.winstreak:'')+(B.doubleup?', Double up ? +'+B.doubleup:''),h=el('small','p-hint','+'+n);
        h.dataset.n=n;porte.append(h);b.title=det;
        b.setAttribute('aria-label',(v?M.nomDetail(M.carte(v.c))+', ':'')+lib.texte+', '+det);
      }
      b.onclick=lib.fait;
    }
    g.append(b);
  }));
  return g;
}
function camp(s,p,moi){
  const J=s.j[p],d=el('div','p-camp '+(moi?'toi':'lui'));
  const nb=el('b','',nomJ(p)+(moi?' (toi)':''));d.append(moi?avatarDe(nomJ(p),monAvatar()):partie&&partie.local?avatarDe(nomJ(p)):avatarUid(nomJ(p),uidJ(p)),nb);
  /* 0.4a (style diffusion) : étiquette « JOUE » à la couleur du joueur actif ; mêmes compteurs dans les deux bandeaux, groupe de largeur fixe calé à droite (alignés au pixel). */
  const l1=el('span','p-l1'),actif=!s.fin&&(s.phase==='mulligan'?!s.mull[p]:quiJoue(s)===p);d.append(l1);l1.append(d.lastChild.previousSibling,nb);
  if(actif){d.classList.add('joue');l1.append(el('span','p-joue','Joue'))}
  /* Forge, ou Énergie (étiquette dorée de la diffusion) pendant le tour de ce joueur : même case de largeur fixe, aucun compteur ne bouge */
  const cz=el('span','p-comptes'),fo=actif&&s.phase==='jeu'?compteur('enclume','Énergie',J.energie,'energie'):compteur('enclume','Forge',J.forge.length);
  cz.append(compteur('main','Main',J.main.length),compteurPile(compteur('deck','Deck',J.deck.length),p,'deck'),compteurPile(compteur('defausse','Défausse',J.defausse.length),p,'defausse'),compteurPile(fo,p,'forge'));d.append(cz);
  return d;
}
const SURVOL=matchMedia('(hover:hover) and (min-width:900px)');
/* Noms cites (journal, bulles d'aide, zooms ; charte du 9 nov.) : cartes, terrains et noms d'effet cliquables (zoom de la carte).
   Libelle = nom exact avec son titre (nomLong), evolution suivie de ★ ; couleur de son type (couleursTexte, cartes/donnees/interface.js), sans gras.
   Cles reconnues : nom detaille « Base (Evolution) », nom long, nom seul, terrain, nom d'effet (texte avant « : ») ; la plus longue d'abord. */
const NOMS_LOG=(()=>{const m=new Map(),D=window.GolemsDonnees,cs=Object.values(M.CARTES),mets=(k,o)=>{if(k&&k.length>1&&!m.has(k))m.set(k,o)},av=x=>{const i=(x.texte||'').indexOf(' :');return i>0?x.texte.slice(0,i):''};
  cs.forEach(C=>{mets(M.nomDetail(C),{C});mets(D.nomLong(C.id),{C})});cs.forEach(C=>mets(C.nom,{C}));
  M.TERRAINS.forEach(T=>mets(T.nom,{T}));
  cs.forEach(C=>mets(av(C),{E:C}));M.TERRAINS.forEach(T=>{const n=av(T);if(n.length<40)mets(n,{ET:T})});
  const e=[...m.keys()].sort((a,b)=>b.length-a.length).map(x=>x.replace(/[.*+?^${}()|[\]\\]/g,'\\$&'));
  return {m,re:new RegExp('(?<![\\p{L}\\p{N}])('+e.join('|')+')(?![\\p{L}\\p{N}])','gu')}})();
/* Forme courte (charte, 10 nov.) : journaux, bilans de manche, ecran de fin, detail d'une partie de l'Historique : « Trigas », « Trigas ★ » pour l'evolution. */
function nomCourt(C){return C.base&&M.CARTES[C.base]?M.CARTES[C.base].nom+' ★':C.nom}
function lienLog(nom,court){
  const o=NOMS_LOG.m.get(nom),K=window.GolemsDonnees.interface.couleursTexte,C=o.C||o.E,T=o.T||o.ET;
  const lib=o.C?(court?nomCourt(C):window.GolemsDonnees.nomLong(C.id)+(C.base?' ★':'')):o.T?T.nom:nom;
  const b=el('button','j-lien'+(o.C&&C.base?' j-evo':''),lib);b.type='button';if(court&&o.C)b.title=window.GolemsDonnees.nomLong(C.id); /* titre au survol */
  b.style.color=o.E||o.ET?K.effet:T?K.terrain:C.animal?K.animal:C.base?K.evolution:K.golem;
  if(T){b.onclick=()=>zoomTerrain(T);b.onmouseenter=()=>montreApercu(b,srcTerrain(T))}
  else{const src=imgV('cartes/'+C.id+'.jpg');b.onclick=()=>{cacheApercu();dernier=null;zoom(src,C.nom)};b.onmouseenter=()=>montreApercu(b,src)}
  b.onmouseleave=cacheApercu;return b;
}
/* sauf(o) : vrai pour un nom a laisser en texte (zoom : la carte zoomee elle-meme) */
function texteLog(x,sauf,court){
  const s=el('span','');let d=0;
  /* Ponctuation qui suit un lien (point, virgule...) collee a lui : un bouton laisse sinon le navigateur couper la ligne juste avant. */
  for(const m of x.matchAll(NOMS_LOG.re)){if(sauf&&sauf(NOMS_LOG.m.get(m[0])))continue;s.append(x.slice(d,m.index));d=m.index+m[0].length;
    const p=/^[.,;:!?)…]+/.exec(x.slice(d)),b=lienLog(m[0],court);
    if(p){const n=el('span','j-colle');n.append(b,p[0]);s.append(n);d+=p[0].length}else s.append(b)}
  s.append(x.slice(d));return s;
}
function cacheApercu(){$('apercu').hidden=true}
function montreApercu(z,src){
  if(!SURVOL.matches)return;
  const a=$('apercu'),r=z.getBoundingClientRect(),H=420;
  a.src=src;a.hidden=false;
  a.style.left=Math.max(8,Math.min(innerWidth-308,r.left+r.width/2-150))+'px';
  a.style.top=(r.bottom+8+H<innerHeight?r.bottom+8:Math.max(8,r.top-H-8))+'px';
}
function zoomTerrain(T){cacheApercu();dernier=null;zoom(srcTerrain(T),T.nom+'. '+T.texte,statZoomTerrain(T))}
/* Zoom d'un terrain en partie : le terrain en grand, a droite deux blocs de memes dimensions (adversaire en haut, toi en bas).
   Toujours 3 lignes (une par case, « Case vide » discret), cartes en lignes condensees (comme le panneau Decks), Force finale en couleur du joueur.
   Valeurs = M.valeurDecompte (comme diffusion.js) ; total en bas de chaque bloc = « n contre m » de la tuile (M.colonnes). */
function ligneZt(c){
  const C=M.carte(c),cc=CARTES.find(z=>z[0]===C.id),q=el('button','dl-ligne'),co=el('span','dl-cout'),fo=el('span','dl-force'),e=el('span','dl-els'),els=C.el||[],src=imgV('cartes/'+C.id+'.jpg');q.type='button';
  if(els.length===2){q.classList.add('dl-duo');q.style.setProperty('--a','var(--fm-'+els[0]+')');q.style.setProperty('--b','var(--fm-'+els[1]+')')}else if(C.animal)q.classList.add('dl-animal');
  co.append(ico('enclume'),String(C.cout));if(C.force!=null)fo.append(ico('force'),String(C.force));els.forEach(x=>e.append(picto(x)));
  const pl=cc?cc[1]:C.nom,v=pl.indexOf(', '),nm=el('span','dl-nom');nm.append(el('span','dl-pseudo',v<0?pl:pl.slice(0,v)));
  if(v>=0){const ti=el('span','dl-titre',pl.slice(v+2));ti.style.color=C.base?'var(--or)':els[0]?'var(--'+els[0]+')':C.animal?'var(--animal-titre)':'var(--or)';ti.title=pl.slice(v+2);nm.append(ti)}
  if(C.animal){fo.className='dl-force dl-mot';fo.textContent='Animal';q.append(co,fo,nm)}else q.append(co,fo,e,nm);q.setAttribute('aria-label','Agrandir '+pl);
  q.onclick=()=>{cacheApercu();zoom(src,C.nom)};q.onmouseenter=()=>montreApercu(q,src);q.onmouseleave=cacheApercu;
  return q;
}
function zoomTerrainJeu(s,k,me){
  const T=s.terrains[k],cc=M.colonnes(s)[k];cacheApercu();dernier=null;
  const pan=p=>{const moi=p===me,coul=moi?'var(--moi-texte,var(--bleu))':'var(--lui-texte,var(--magma))',a=el('section','zt-camp '+(moi?'toi':'lui')),h=el('h3','',nomJ(p)+(moi?' (toi)':'')),ol=el('ol','zt-l');h.style.color=coul;a.append(h);
    for(let l=0;l<3;l++){const g=s.j[p].grille[l][k],li=el('li');
      if(!g){li.className='zt-vide';li.append(el('span','','Case vide'))}
      else{const v=M.valeurDecompte(s,p,l,k),f=el('span','zt-v'),fb=el('b','',String(v));fb.style.color=coul;f.append(ico('force'),fb);f.setAttribute('role','img');f.setAttribute('aria-label','Force '+v);
        if(g.hors===s.manche&&!M.carte(g.c).animal)f.title='Ne compte pas au décompte de cette manche';li.append(ligneZt(g.c),f)}
      ol.append(li)}
    const o=cc[1-p],n=cc[p],tt=el('div','zt-tot'),b=el('b','',String(n));b.style.color=coul;tt.append('Total : ',b);
    if(n>o)tt.classList.add('mene');else if(n===o)tt.append(el('span','zt-eg','Égalité'));
    a.append(ol,tt);return a};
  zoom(srcTerrain(T),T.nom+'. '+T.texte,[pan(1-me),pan(me)]);
}
/* Elessar (Réalisation de l'âge) : surcoût d'une évolution pour le joueur p, lu dans le moteur (coutPose ; 0 sans Elessar adverse en jeu).
   Lu sur une colonne sans La Boutique : depuis le moteur 0.2b.2 elle réduit aussi les évolutions, son -1 s'affiche sur la case (Améliorer N), pas sur la carte en main. */
function surcout(s,p,c){const C=M.carte(c);if(!s||!C.base)return 0;const k=s.terrains.findIndex(T=>!effetTerrain(T,'reduction'));return M.coutPose(s,p,c,0,k<0?0:k)-C.cout}
/* Explication du surcoût (survol, zoom, aria-label) : +1 par Elessar adverse. */
const causeSurcout=n=>"Réalisation de l'âge "+(n>1?'de '+n+' Elessar adverses':"d'Elessar adverse")+', +'+n+'.';
function txtSurcout(C,n){return 'Coûte '+(C.cout+n)+' énergie au lieu de '+C.cout+' : '+causeSurcout(n)}
function detailSurcout(C,n){if(!(n>0))return undefined;const p=el('p','surcout-txt');p.append(el('b','','Coûte '+(C.cout+n)+' énergie'),' au lieu de '+C.cout+' : '+causeSurcout(n));return [p]}
/* Enclume de la carte redessinée à l'identique par-dessus l'image (cout() de generer_cartes.py : silhouette, dégradés, Impact 88, décalages par chiffre),
   avec le vrai coût en rouge : le chiffre imprimé disparaît dessous. Repère de la carte 750 x 1050. textLength = chasse d'Impact (Anton ramenée à la même largeur). */
const ENC_SIL='M50 14 L170 14 L170 52 L140 58 Q130 78 136 100 L158 114 L158 148 L42 148 L42 114 L64 100 Q70 78 60 58 L52 56 Q20 50 6 16Z',
  ENC_DEC=[[-.09,2.17],[1,2.21],[-.71,2.38],[.28,1.97],[.03,2.17],[-.26,1.76],[-.65,2.17],[-.21,2.21],[-.02,2.25],[-.65,2.21]],
  ENC_CH=[47.19,33.52,44.17,46.67,43.97,47.23,47.66,34.47,47.06,47.66],ENC_G='<g transform="translate(20 24) scale(.9375) translate(0 -9)">';
let nEnc=0;
function badgeSurcout(C,n){
  const k=el('span','surcout'),t=String(C.cout+n),d=t.length>1?[0,2.13]:ENC_DEC[+t],L=Math.min(56,[...t].reduce((a,x)=>a+ENC_CH[+x],0)),i='enc'+(++nEnc);
  k.setAttribute('role','img');k.setAttribute('aria-label',txtSurcout(C,n));
  k.innerHTML='<svg class="fond" viewBox="0 0 750 1050" aria-hidden="true">'+ENC_G+'<defs><clipPath id="'+i+'c"><path d="'+ENC_SIL+'"/></clipPath>'
    +'<linearGradient id="'+i+'b" x1="10" y1="10" x2="165" y2="150" gradientUnits="userSpaceOnUse"><stop offset="0" stop-color="#a9b4bd"/><stop offset=".42" stop-color="#6f7a84"/><stop offset=".62" stop-color="#3b434b"/><stop offset="1" stop-color="#1f252a"/></linearGradient>'
    +'<linearGradient id="'+i+'f" x1="0" y1="20" x2="0" y2="148" gradientUnits="userSpaceOnUse"><stop offset="0" stop-color="#4b545d"/><stop offset="1" stop-color="#2d343b"/></linearGradient></defs>'
    +'<g clip-path="url(#'+i+'c)"><rect width="180" height="160" fill="url(#'+i+'f)"/><path d="M100 0 H180 V160 H100Z" fill="#000" fill-opacity=".2"/><path d="'+ENC_SIL+'" fill="none" stroke="url(#'+i+'b)" stroke-width="20"/></g>'
    +'<path d="'+ENC_SIL+'" fill="none" stroke="#0b0a10" stroke-width="10" stroke-linejoin="round"/></g></svg>'
    +'<svg viewBox="0 0 750 1050" aria-hidden="true">'+ENC_G+'<text x="'+(100+d[0])+'" y="'+(114+d[1])+'" text-anchor="middle" textLength="'+L+'" lengthAdjust="spacingAndGlyphs" fill="#ff3b30" stroke="#0b0a10" stroke-width="12" stroke-linejoin="round" paint-order="stroke" style="font:400 81.93px Anton,Impact,\'Lilita One\',sans-serif">'+t+'</text></g></svg>';
  attendAnton(k);return k;
}
/* Même enclume rouge sur la carte agrandie (zoom, œil, bouton Voir) : le dessin est au repère 750 x 1050, il suit la taille de l'image. */
const calqueSurcout=(C,n)=>n>0?[badgeSurcout(C,n)]:null;
function mainVue(ids,opts){
  const m=el('div','p-main'),s=partie&&partie.etat,sp=opts.p!==undefined?opts.p:partie&&partie.moi;m.style.setProperty('--n',Math.max(7,ids.length)); /* 0.4a : 7 places au moins, au-dela les cartes se resserrent (hauteur fixe sur ordinateur) */
  ids.forEach(c=>{
    const C=M.carte(c),b=el('button','p-carte');b.type='button';
    const i=el('img');i.src=imgV('cartes/'+C.id+'.jpg');i.alt=C.nom;b.append(i);
    const rz=opts.raison&&opts.raison(c),sc=surcout(s,sp,c);
    if(sc>0){b.classList.add('surtaxe');b.append(badgeSurcout(C,sc));b.title=txtSurcout(C,sc)}
    if(rz){b.classList.add('grisee');b.append(el('span','raison',rz.court));b.title=rz.long+(sc>0?' Coût imprimé '+C.cout+' : '+causeSurcout(sc):'')}
    if(opts.presse)b.setAttribute('aria-pressed',opts.presse(c));
    if(opts.clic){b.dataset.act='carte';b.onclick=()=>opts.clic(c)}else b.onclick=()=>{dernier=null;zoom(i.src,C.nom,detailSurcout(C,sc),calqueSurcout(C,sc))};
    const z=el('div','p-slot'); /* 0.4a : plus d'oeil ; carte choisie : bouton Voir, ordinateur : zone d'aperçu */
    z.dataset.c=c;z.onmouseenter=()=>{if(zoneEl()&&SURVOL.matches){zoneSurvol=c;zoneMaj()}else montreApercu(z,imgV('cartes/'+C.id+'.jpg'))};
    z.onmouseleave=()=>{cacheApercu();if(zoneSurvol!==null){zoneSurvol=null;zoneMaj()}};
    z.append(b);m.append(z);
  });
  return m;
}
/* Pourquoi une carte ne peut pas etre posee : null si elle le peut. */
function raisonPose(s,me,c,leg){
  if(leg.some(a=>a.t==='p'&&a.c===c))return null;
  const C=M.carte(c),G=s.j[me].grille,e=s.j[me].energie;
  if(C.animal){ /* 0.5 : animal attache sous son maitre en jeu (base ou evolution), un seul animal par maitre */
    const m=C.maitre,lib=[],pris=[];G.forEach((L,l)=>L.forEach((g,k)=>{const x=g&&M.carte(g.c);if(x&&(x.id===m||x.base===m))(g.ani?pris:lib).push(M.coutPose(s,me,c,l,k))}));
    if(!lib.length)return pris.length?{court:'Maître déjà pris',long:M.CARTES[m].nom+' a déjà un animal.'}:{court:M.CARTES[m].nom+' requis',long:'Il faut '+M.CARTES[m].nom+' en jeu.'};
    return {court:'Trop chère',long:'Coûte '+Math.min(...lib)+' énergie, il te reste '+e+'.'};
  }
  {const r=effetDe(C.id,'poseManche');if(r&&s.manche!==r.manche)return {court:'Manche '+r.manche+' seulement',long:'Se pose uniquement en manche '+r.manche+'.'}}
  const cases=[];
  for(let l=0;l<3;l++)for(let k=0;k<3;k++)if(!C.base||(G[l][k]&&M.carte(G[l][k].c).id===C.base))cases.push(M.coutPose(s,me,c,l,k));
  if(!cases.length)return {court:'Base absente',long:'Il faut '+M.CARTES[C.base].nom+' en jeu.'};
  const v=Math.min(...cases);
  return {court:'Trop chère',long:'Coûte '+v+' énergie, il te reste '+e+'.'};
}
function bouton(txt,fait,sec){const b=el('button','btn'+(sec?' sec':''),txt);b.type='button';b.dataset.act='btn';b.onclick=fait;return b}
function affiche(){
  if(window.SPEC&&SPEC.estSpectateur())return; /* spectateur : vue peinte par spectateur-ui.js */
  if(!partie||!partie.etat)return;
  const s=partie.etat,me=partie.moi,lui=1-me,J=s.j[me],box=$('partie');
  const cols=me===0?[0,1,2]:[2,1,0],leg=M.legales(s,me),att=s.attente&&s.attente.p===me?s.attente:null;
  const hautPage=scrollY;
  cacheApercu();
  box.textContent='';box.classList.toggle('verrou',verrou);
  if(verrou)$('passer').hidden=false;
  const table=el('div','p-table'+(s.fin?' fini':'')),plat=el('div','p-plateau'),pl=el('div','p-poste');
  if(partie.erreur)pl.append(el('p','absent','Les deux écrans ne sont plus synchronisés : '+partie.erreur));
  const qui=s.attente?s.attente.p:s.joueur,aMoi=!s.fin&&(s.phase==='mulligan'?!s.mull[me]:qui===me);
  const b=el('div','p-barre'+(aMoi?' amoi':''));
  const sc=el('div','p-score');sc.setAttribute('aria-label','Toi '+J.score+', adversaire '+s.j[lui].score);
  sc.append(el('b','',String(J.score)),el('span','','-'),el('em','',String(s.j[lui].score)));
  const tr=el('div','p-trois');tr.append(info('','manche','Manche',points(s.manche,'Manche')),info('score','coupe','Score',sc),info('','tour','Tour',points(s.tour,'Tour')));b.append(tr); /* 0.4a : comme la diffusion, Manche, Score, Tour ; l'énergie passe dans ton bandeau */
  let cible=null,cibleAdv=null;
  const coupsV=leg.filter(a=>a.t==='w');
  if(!coupsV.length)modeVaisseau=false;
  const coupsF=leg.filter(a=>a.t==='y');
  if(!coupsF.length)modeFaille=false;
  const coupsZ=leg.filter(a=>a.t==='z');
  if(coupsZ.length<2)modeCaramel=false;
  const coupsR=leg.filter(a=>a.t==='r'); /* K-Chan (L'attachiante) : Love inconditionnel, coup 'r' + case de K-Chan + case du blesse */
  if(!coupsR.length)modeLove=false;
  const coupsO=leg.filter(a=>a.t==='o'),coupsT=leg.filter(a=>a.t==='t'); /* 0.4a : Le Cirque (tarte, coup 'o' + ligne du Golem adverse) et Les Pronos (mise, coup 't') */
  if(!coupsO.length)modeTarte=false;
  const srcR=[...new Set(coupsR.map(a=>a.l+','+a.k))];
  if(modeLove&&!selCases.length&&srcR.length===1)selCases=[srcR[0].split(',').map(Number)];
  if(modeLove){
    cible=(l,k)=>{
      if(!selCases.length)return srcR.includes(l+','+k)?{texte:'Choisir',fait:()=>{selCases=[[l,k]];affiche()}}:null;
      const[x,y]=selCases[0],a=coupsR.find(c=>c.l===x&&c.k===y&&c.m===l&&c.n===k);
      if(a)return {texte:'Soigner',fait:()=>{modeLove=false;selCases=[];joue(a)}};
      if(x===l&&y===k&&srcR.length>1)return {choisie:true,fait:()=>{selCases=[];affiche()}};
      return null;
    };
  }else if(modeTarte){ /* Le Cirque : touche un Golem adverse de la colonne du Cirque (cases dorees de la grille adverse) */
    const kc=indexTerrainEffet(s,'cirque');
    cibleAdv=(l,k)=>{const a=k===kc&&coupsO.find(c=>c.l===l);return a?{texte:'',fait:()=>{modeTarte=false;joue(a)}}:null};
  }else if(modeFaille){
    const kf=indexTerrainEffet(s,'deplacement');
    cible=(l,k)=>{
      if(!selCases.length)return coupsF.some(a=>a.l===l&&a.k===k)?{texte:'Choisir',fait:()=>{selCases=[[l,k]];affiche()}}:null;
      const[x,y]=selCases[0];
      if(x===l&&y===k)return {choisie:true,fait:()=>{selCases=[];affiche()}};
      const a=k===kf&&coupsF.find(c=>c.l===x&&c.k===y&&c.d===l);
      return a?{texte:'Déplacer ici',fait:()=>joue(a)}:null;
    };
  }else if(modeVaisseau){
    const kv=coupsV[0].k;
    cible=(l,k)=>{
      if(k!==kv||!J.grille[l][k])return null;
      const pris=selCases.some(c=>c[0]===l);
      return {choisie:pris,fait:()=>{
        if(pris){selCases=[];affiche();return}
        selCases.push([l,k]);
        if(selCases.length===2){const x=Math.min(selCases[0][0],l),y=Math.max(selCases[0][0],l);joue(coupsV.find(a=>a.a===x&&a.b===y))}else affiche();
      }};
    };
  }else if(att&&att.t==='h'){ /* 0.2a.2 : Slam de Glad, sur la grille adverse : 1) Golem a soulever, 2) case libre adjacente */
    const hs=leg.filter(x=>x.t==='h');
    cibleAdv=(l,k)=>{
      if(!selCases.length){
        const o=hs.filter(x=>x.l===l&&x.k===k);if(!o.length)return null;
        return {texte:'Soulever',fait:()=>{if(o.length===1&&o[0].m===l&&o[0].n===k)joue(o[0]);else{selCases=[[l,k]];affiche()}}};
      }
      const[x,y]=selCases[0];
      if(x===l&&y===k)return {choisie:true,fait:()=>{selCases=[];affiche()}};
      const a=hs.find(c=>c.l===x&&c.k===y&&c.m===l&&c.n===k);
      return a?{texte:'Reposer ici',fait:()=>joue(a)}:null;
    };
  }else if(att&&att.t==='g'){ /* 0.2a.1 : favori d'Indra, cases dorees */
    cible=(l,k)=>{const a=leg.find(x=>x.t==='g'&&x.l===l&&x.k===k);return a?{texte:'Favori',fait:()=>joue(a)}:null};
  }else if(att&&att.t==='l'){ /* JackJoy : Sub offert (035) ou Draft diff (035e), Golem allie qui recoit +1, cases dorees, pas de bouton passer */
    cible=(l,k)=>{const a=leg.find(x=>x.t==='l'&&x.l===l&&x.k===k);return a?{texte:'+1',fait:()=>joue(a)}:null};
  }else if(att&&att.t==='boost'){ /* Elccino : Cafe du matin (+1) ou La taupe (+2), Golem allie qui recoit le bonus, cases dorees */
    cible=(l,k)=>{const a=leg.find(x=>x.t==='q'&&x.l===l&&x.k===k);return a?{texte:'+'+att.n,fait:()=>joue(a)}:null};
  }else if(att&&att.t==='k'){ /* Deguisement d'Apo (029e) : voisin dont il copie l'effet, cases dorees */
    cible=(l,k)=>{const a=leg.find(x=>x.t==='k'&&x.l===l&&x.k===k);return a?{texte:'Copier',fait:()=>joue(a)}:null};
  }else if(att&&att.t==='i'){ /* Imitation du chansonnier (041e) : le Golem adverse en face, case doree sur la grille adverse ; refus par le bouton Ne pas copier */
    const a=leg.find(x=>x.t==='i'&&x.o===1);
    cibleAdv=(l,k)=>a&&l===att.i[0]&&k===att.i[1]?{texte:'Copier',fait:()=>joue(a)}:null;
  }else if(att&&att.t==='u'){ /* meandyou du modérateur (025e) : 1) un Golem allié au-dessus (haut), 2) un de ses voisins d'après coups, cases dorées ;
       toucher de nouveau le premier, ou un autre Golem du dessus, change d'avis ; refus par le bouton Ne pas échanger */
    const es=leg.filter(x=>x.t==='e'),m=(p,q)=>p[0]===q[0]&&p[1]===q[1],enHaut=c=>att.haut.some(h=>m(h,c));
    const u=selCases.length&&enHaut(selCases[0])?selCases[0]:null,choisir=c=>({texte:'Choisir',fait:()=>{selCases=[c];affiche()}});
    cible=(l,k)=>{
      const c=[l,k];
      if(!u)return enHaut(c)?choisir(c):null;
      if(m(u,c))return {choisie:true,fait:()=>{selCases=[];affiche()}};
      const a=es.find(x=>(m(x.a,u)&&m(x.b,c))||(m(x.b,u)&&m(x.a,c)));
      return a?{texte:'Échanger',fait:()=>joue(a)}:enHaut(c)?choisir(c):null;
    };
  }else if(att&&att.t==='o'&&leg[0].t==='e'){
    cible=(l,k)=>{
      if(!J.grille[l][k])return null;
      const pris=selCases.some(c=>c[0]===l&&c[1]===k);
      return {choisie:pris,fait:()=>{
        if(pris){selCases=[];affiche();return}
        selCases.push([l,k]);
        if(selCases.length===2){const[u,v]=selCases,m=(p,q)=>p[0]===q[0]&&p[1]===q[1];joue(leg.find(a=>m(a.a,u)&&m(a.b,v)||m(a.a,v)&&m(a.b,u)))}else affiche();
      }};
    };
  }else if(sel!==null&&!att&&s.phase==='jeu'){
    const ps=leg.filter(a=>a.t==='p'&&a.c===sel);
    cible=(l,k)=>{const a=ps.find(x=>x.l===l&&x.k===k);if(!a)return null;
      const mot=!J.grille[l][k]||M.carte(sel).animal?'Poser':M.carte(sel).base?'Améliorer':'Remplacer'; /* animal : pose sous son maitre */
      return {texte:mot+' '+M.coutPose(s,me,sel,l,k),bonus:M.carte(sel).animal?null:bonusPrevu(s,me,sel,l,k),fait:()=>joue(a)}};
  } /* Caramel a volonte (026e) : seulement par son bouton ; toucher la carte ouvre le detail de sa Force comme pour tout Golem */
  if(partie.rejeu){cible=null;cibleAdv=null}
  repeint=()=>{
    const A=partie&&partie.ecran||s,t=el('div','p-terrains'),cc=M.colonnes(A);
    /* 0.4a (variante B, style diffusion) : total adverse en haut, nom + « ★ N pts » au milieu, ton total en bas ; contour à la couleur du joueur qui mène. Plus d'oeil. */
    cols.forEach(k=>{const T=s.terrains[k],d=el('div','p-terrain'),x=cc[k][lui],y=cc[k][me];d.dataset.k=k;
    if(y>x)d.classList.add('m-moi');else if(x>y)d.classList.add('m-lui');
    d.tabIndex=0;d.setAttribute('role','button');const VT=valTerrain(M,A,k);d.setAttribute('aria-label',T.nom+', '+VT.long+' : toi '+y+', '+nomJ(lui)+' '+x);
    const te=el('div','p-tete'),mi=el('div','p-tmil'),pt=el('span','p-valeur');
    te.append(el('b','',T.nom));pt.append(ico('coupe'),VT.txt);if(effetTerrain(T,'pointsManche'))pt.title=T.nom+' : 1, 2 puis 3 points selon la manche';mi.append(te,pt);
    d.onclick=()=>zoomTerrainJeu(A,k,me);d.onkeydown=e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();zoomTerrainJeu(A,k,me)}};d.onmouseenter=()=>montreApercu(d,srcTerrain(T));d.onmouseleave=cacheApercu;
    d.append(el('b','p-tot a'+(x>y?' tete':''),String(x)),mi,el('b','p-tot m'+(y>x?' tete':''),String(y)));t.append(d)});
    /* Miroir, comme aux echecs : l'adversaire en haut, moi en bas ; la ligne 0 du moteur (ligne 1 des regles) colle aux terrains
       des deux cotes, donc lignes 2,1,0 pour lui et 0,1,2 pour moi. Memes colonnes des deux cotes : chaque terrain reste face a face. */
    const gm=grilleVue(A,me,cols,[0,1,2],cible);gm.classList.add('mienne');if(aMoi)gm.classList.add('active');
    plat.textContent='';plat.append(camp(s,lui,false),grilleVue(A,lui,cols,[2,1,0],cibleAdv),t,gm,camp(s,me,true));
  };
  repeint();
  /* Case du haut : etat de la partie seulement, couleur neutre ; le tour se lit sur la bande au-dessus de la main. */
  const tdt=el('div','p-tourde');tdt.append(el('span','',partie.rejeu?'Replay':s.fin?'Partie terminée':'Partie en cours'),outils());b.append(tdt);
  let btnRejouer=null,btnPartage=null;
  if(s.fin){
    const f=el('div','bloc p-fin'),w=s.fin.gagnant;
    f.append(el('h3',w===null?'f-n':w===me?'f-v':'f-d',w===null?'Match nul':w===me?'Victoire':'Défaite'));
    if(s.fin.abandon!==undefined)f.append(el('p','p-abandon',(s.fin.abandon===me?(pseudo||'Toi'):nomJ(lui))+' a abandonné'));
    if(s.fin.deckVide!==undefined)f.append(el('p','p-abandon',(w===me?'Victoire':'Victoire de '+nomJ(lui))+' par deck vide')); /* 0.4 : le perdant devait piocher, deck vide */
    f.append(el('p','',J.score+' à '+s.j[lui].score+(s.fin.departage?', '+departageTxt(s,me,lui):'')));
    const b=bouton(partie.veut?"En attente de l'adversaire":'Rejouer',()=>{if(partie.local){niveauChoisi=partie.niveau||niveauChoisi;lanceLocal(null);return}partie.veut=true;sauve();pub({veut:partie.graine});affiche();majPartie()});
    b.id='rejouer';b.disabled=partie.veut;
    /* Partager le resume : a cote de Rejouer, memes dimensions (seul en fin de rejeu). */
    const sh=bouton('Partager le résumé',()=>partageFin(sh,texteResume(s)),true);sh.id='partageResume';
    if(!partie.rejeu){if(LARGE.matches){btnRejouer=b;btnPartage=sh}else{const z=el('div','p-duo');z.append(sh,b);f.append(z)}}else f.append(sh);
    const nm=p=>p===me?'Toi':nomJ(p),rf=el('div','r-fin');
    parManche(s).forEach((o,i)=>{const d=el('div');d.append(el('b','','Manche '+(i+1)),lignesManche(o,nm));rf.append(d)});
    const lm=ligneMvp(M.bilan(s));if(lm){const q=el('p','',lm);q.id='ligneMvp';f.append(rf,q)}else f.append(rf);
    f.append(vueBilan(s,nm));
    const rp=el('textarea','r-repli');rp.id='repliFin';rp.readOnly=true;rp.setAttribute('aria-label','Texte à copier');rp.hidden=!partie.repli;rp.value=partie.repli||'';f.append(rp);
    pl.append(f);
  }
  const con=x=>pl.append(el('div','p-consigne',x));
  let choixCartes=null; /* Elccino : cartes a choisir (Cafe du matin, La taupe), montrees dans la zone « Choisis une carte » a la place de « Derniere carte jouee » */
  if(s.fin)pl.append(mainVue(J.main,{}));
  else if(s.phase==='mulligan'){
    if(s.mull[me]){con("En attente de l'adversaire.");pl.append(mainVue(J.main,{}))}
    else{
      con("Mulligan : touche jusqu'à 3 cartes à remplacer.");
      pl.append(mainVue(J.main,{presse:c=>selMull.includes(c),clic:c=>{
        if(selMull.includes(c))selMull=selMull.filter(x=>x!==c);else if(selMull.length<3)selMull.push(c);
        affiche()}}));
      const z=el('div','p-btns');
      z.append(bouton(selMull.length?'Remplacer '+selMull.length+(selMull.length>1?' cartes':' carte'):'Garder ma main',()=>joue({t:'m',c:selMull.slice()})));
      pl.append(z);
    }
  }else if(att&&att.t==='q'&&att.adv){
    /* Le Q (refonte) : Jour de peche, les 2 premieres cartes du deck adverse ; la carte touchee va a sa defausse, l'autre reste dessus. Source : Le Q ou son copieur. */
    con((att.src||'Le Q : Jour de pêche').replace(/ : Jour de pêche$/,'')+' (Jour de pêche) : choisis la carte à défausser parmi les 2 premières du deck adverse. L\'autre reste dessus.');
    pl.append(mainVue(att.options,{p:lui,clic:c=>joue({t:'c',c})}),mainVue(J.main,{}));
  }else if(att&&att.t==='q'){ /* ancien Le Q (Analyse, son propre deck) : replays des versions archivees */
    con('Le Q : choisis 1 carte, les autres restent sur le deck.');
    pl.append(mainVue(att.options,{clic:c=>joue({t:'c',c})}),mainVue(J.main,{}));
  }else if(att&&(att.t==='cafe'||att.t==='taupe')){
    const N=M.nomDetail(M.carte(att.src));
    con(att.t==='cafe'?N+' (Café du matin) : touche la carte à prendre parmi les 2 premières de ton deck. L\'autre va sous ton deck.'
      :N+' (La taupe) : touche la carte de la main adverse que ton adversaire défausse.');
    choixCartes=mainVue(att.options,{p:att.t==='taupe'?lui:me,clic:c=>joue({t:'u',c})});
    pl.append(mainVue(J.main,{}));
  }else if(att&&att.t==='boost'){
    con(M.nomDetail(M.carte(att.src))+' ('+att.nom+') : touche une case dorée pour choisir le Golem allié qui gagne +'+att.n+" de Force jusqu'à la fin de la partie.");
    pl.append(mainVue(J.main,{}));
  }else if(att&&att.t==='b'){
    const n=att.options.length;
    con('Le Buzzer : fin de manche, touche '+(n>1?'tes '+n+" prochaines cartes dans l'ordre où tu veux les piocher, la première en premier.":'ta prochaine carte pour continuer.')+(selMull.length?' Ordre : '+selMull.map(c=>M.nomDetail(M.carte(c))).join(', puis ')+'.':''));
    pl.append(mainVue(att.options,{presse:c=>selMull.includes(c),clic:c=>{
      if(selMull.includes(c))selMull=selMull.filter(x=>x!==c);else selMull.push(c);
      if(selMull.length===n)joue({t:'b',o:selMull.slice()});else affiche()}}),mainVue(J.main,{}));
  }else if(att&&att.t==='o'){ /* ancien Oracle des Stats (Optimisation) : replays des versions archivees seulement, plus rien ne cree l'attente 'o' */
    con(leg[0].t==='e'?'Oracle des Stats : main adverse ci-dessous. Touche 2 de tes Golems à échanger.':'Oracle des Stats : main adverse ci-dessous. Pas assez de Golems pour échanger.');
    pl.append(mainVue(s.j[lui].main,{p:lui}));
    if(leg[0].t==='v'){const z=el('div','p-btns');z.append(bouton('Continuer',()=>joue({t:'v'})));pl.append(z)}
  }else if(att&&att.t==='h'){
    const pl1=leg.some(x=>x.t==='h'&&(x.m!==x.l||x.n!==x.k));
    con(selCases.length?'Glad (Slam) : touche une case libre en surbrillance pour y reposer ce Golem. Il perdra 1 de Force.':pl1?'Glad (Slam) : touche un Golem adverse en surbrillance pour le soulever.':'Glad (Slam) : aucune case libre, touche un Golem adverse : il reste en place et perd 1 de Force.');
    pl.append(mainVue(J.main,{}));
  }else if(att&&att.t==='g'){
    const I=J.grille[att.i[0]][att.i[1]],evo=I&&!!effetDe(M.carte(I.c).id,'favori',r=>r.ragebait);
    con('Indra'+(evo?' (La Fan enflammée)':'')+' : touche une case dorée pour choisir son favori'+(evo?' (+2 de Force, et le Golem adverse en face perd 2 de Force).':' (+1 de Force).'));
    pl.append(mainVue(J.main,{}));
  }else if(att&&att.t==='l'){
    con(att.y==='sub'?"JackJoy (Sub offert) : touche une case dorée pour choisir le Golem allié qui gagne +1 de Force jusqu'à la fin de la partie."
      :"JackJoy (Draft diff) : touche une case dorée pour choisir le Golem allié non voisin qui gagne +1 de Force jusqu'à la fin de la partie.");
    pl.append(mainVue(J.main,{}));
  }else if(att&&att.t==='k'){
    const vs=leg.filter(x=>x.t==='k').map(x=>{const v=J.grille[x.l][x.k];return v?M.nomDetail(M.carte(v.c)):''}).filter(Boolean);
    con('Apo (Maître du déguisement) : touche un de tes Golems voisins en surbrillance pour copier son effet'+(vs.length?' ('+vs.join(', ')+')':'')+". S'il agit à la pose, il se déclenche aussitôt.");
    pl.append(mainVue(J.main,{}));
  }else if(att&&att.t==='i'){
    const I=J.grille[att.i[0]][att.i[1]],h=s.j[lui].grille[att.i[0]][att.i[1]],hC=h?M.carte(h.c):null,ef=h?M.CARTES[effId(h)]:null;
    const nh=hC?M.nomDetail(hC):'',deN=/^Le /.test(nh)?'du '+nh.slice(3):/^[aeiouyéh]/i.test(nh)?"d'"+nh:'de '+nh;
    con((I?M.nomDetail(M.carte(I.c)):'Velnen (Le chansonnier)')+' : touche le Golem adverse en surbrillance pour copier '+(hC?"l'effet "+deN+(ef?' ('+(ef.id!==hC.id?'copie de '+M.nomDetail(ef)+', ':'')+ef.texte.replace(/\.$/,'')+')':''):'son effet')+". S'il agit à la pose, il se déclenche aussitôt. Sinon, touche Ne pas copier.");
    pl.append(mainVue(J.main,{}));
    const z=el('div','p-btns'),r=leg.find(x=>x.t==='i'&&x.o===0),bi=bouton('Ne pas copier',()=>{if(r)joue(r)},true);bi.id='nePasCopier';z.append(bi);pl.append(z);
  }else if(att&&att.t==='u'){
    const I=J.grille[att.i[0]][att.i[1]],N=I?M.nomDetail(M.carte(I.c)):'Shifukuro (Le modérateur)',m=(p,q)=>p[0]===q[0]&&p[1]===q[1];
    const nomC=([l,k])=>{const g=J.grille[l][k];return g?M.nomDetail(M.carte(g.c)):''},liste=cs=>{const n=[...new Set(cs.map(nomC).filter(Boolean))];return n.length?' ('+n.join(', ')+')':''};
    const u=selCases.length&&att.haut.some(h=>m(h,selCases[0]))?selCases[0]:null;
    if(!u)con(N+' : touche un de tes Golems au-dessus en surbrillance'+liste(att.haut)+", puis le voisin avec qui il échange sa case. Sinon, touche Ne pas échanger.");
    else{const ps=leg.filter(x=>x.t==='e'&&(m(x.a,u)||m(x.b,u))).map(x=>m(x.a,u)?x.b:x.a);
      con(N+' : touche le voisin en surbrillance avec qui '+nomC(u)+' échange sa case'+liste(ps)+'. Touche '+nomC(u)+' de nouveau pour changer de Golem. Sinon, touche Ne pas échanger.')}
    pl.append(mainVue(J.main,{}));
    const z=el('div','p-btns'),r=leg.find(x=>x.t==='v'),bu=bouton('Ne pas échanger',()=>{if(r)joue(r)},true);bu.id='nePasEchanger';z.append(bu);pl.append(z);
  }else if(att&&att.t==='r'){
    /* Ancienne règle de Bellock et Loxim (moteur 0.2b, coup 'r') : base ou évolution du partenaire au choix. Depuis 0.2b.1, pioche au hasard sans attente :
       ne sert plus qu'au replay des parties 0.2b, sans clic. */
    const D=M.carte(att.de),nP=M.DUO&&M.DUO[D.id]?M.CARTES[M.DUO[D.id]].nom:'son partenaire';
    con(M.nomDetail(D)+' : '+(capa(D.id)||'Duo')+'. Choix de la version de '+nP+' à piocher dans le deck (règle de la version 0.2b).');
    pl.append(mainVue(att.options,{}),mainVue(J.main,{}));
  }else if(att&&att.t==='s'){
    /* Spam de Trigas : choix comme a la Forge (carte pressee, changement d'avis possible), puis confirmation ; meme coup 's'. */
    if(sel!==null&&!J.main.includes(sel))sel=null;
    con(sel!==null?'Trigas : '+M.nomDetail(M.carte(sel))+' sera placée dans ta Forge, face cachée et définitivement. Touche une autre carte pour changer.':'Trigas : touche 1 carte de ta main à placer dans ta Forge, puis confirme.');
    pl.append(mainVue(J.main,{presse:c=>c===sel,clic:c=>{sel=sel===c?null:c;affiche()}}));
    const z=el('div','p-btns'),v=sel,bs=bouton('Forger cette carte',()=>{if(v!==null)joue({t:'s',c:v})});bs.id='forgerSpam';bs.disabled=v===null;z.append(bs);pl.append(z);
  }else if(att&&att.t==='d'){
    con(att.src?att.src+' : fin de manche, touche 1 carte de ta main à défausser.':"Défausse jusqu'à 7 cartes : touche une carte ("+(J.main.length-7)+' de trop).');
    pl.append(mainVue(J.main,{clic:c=>joue({t:'d',c})}));
  }else if(s.joueur===me&&!s.attente){
    if(J.etapeForge){
      if(sel!==null&&!J.main.includes(sel))sel=null;
      /* Forge eclair (Spom, 036) : 'f' une fois, puis 'j' tant qu'il en reste ; 'n' termine l'etape. */
      const nbx=(n,m)=>n+' '+m+(n>1?'s':''),nf=leg.some(a=>a.t==='f'),ne=J.eclair||0,eclair=!nf&&leg.some(a=>a.t==='j'),deja=J.aForge||(J.eclairUtil||0)>0;
      const e=el('div','p-consigne p-etape');e.append(el('b','','Étape 1 : Forge'+(ne?' (Forge éclair : '+nbx(ne,'carte')+' de plus)':'')),
        sel!==null?M.nomDetail(M.carte(sel))+(eclair?' sera forgée par Forge éclair : +1 énergie dès ce tour, et à la fin du tour tu reprendras 1 carte au hasard de ta Forge.':' sera forgée, face cachée et définitivement.')
        :eclair?'Forge éclair : tu peux forger encore '+nbx(ne,'carte')+' (+1 énergie chacune). À la fin du tour, tu reprendras 1 carte au hasard de ta Forge par Forge éclair utilisée. Sinon, termine la Forge.'
        :'Choisis une carte à forger, ou passe. Les actions, La Faille et Le Vaisseau se débloquent ensuite.'+(ne?' Spom : après cette carte, tu pourras en forger '+nbx(ne,'autre')+' (Forge éclair).':''));pl.append(e);
      pl.append(mainVue(J.main,{presse:c=>c===sel,clic:c=>{sel=sel===c?null:c;affiche()}}));
      const z=el('div','p-btns');
      if(sel!==null){const v=sel,bf=eclair?bouton('Forge éclair',()=>joue({t:'j',c:v})):bouton('Forger',()=>joue({t:'f',c:v}));bf.id=eclair?'forgeEclair':'forger';z.append(bf)}
      const bn=bouton(deja?'Terminer la Forge':'Ne pas forger',()=>joue({t:'n'}),true);bn.id='nePasForger';z.append(bn);pl.append(z);
    }else if(modeLove){
      con(selCases.length?"Love inconditionnel : touche un Golem allié blessé (case dorée), il récupère 1 de Force. Une fois par manche.":"Love inconditionnel : touche la K-Chan (L'attachiante) qui soigne.");
      pl.append(mainVue(J.main,{}));
      const z=el('div','p-btns'),ba=bouton('Annuler',()=>{modeLove=false;selCases=[];affiche()},true);ba.id='annulerLove';z.append(ba);pl.append(z);
    }else if(modeTarte){
      con('Le Cirque : touche un Golem adverse de ce terrain, il subit 1 dégât. Une fois par manche, gratuit.');
      pl.append(mainVue(J.main,{}));
      /* deux boutons cote a cote (comme Forger / Ne pas forger) : Tarte enfonce (Golems vises mis en evidence) et Annuler */
      const z=el('div','p-btns'),bt=bouton('Tarte',()=>{},false),ba=bouton('Annuler',()=>{modeTarte=false;affiche()},true);bt.id='tarteActive';bt.setAttribute('aria-pressed','true');bt.title='Touche un Golem adverse doré du Cirque';ba.id='annulerTarte';z.append(bt,ba);pl.append(z);
    }else if(modeFaille){
      con(selCases.length?'La Faille : touche une case libre de ce terrain.':'La Faille : touche un de tes Golems sur un autre terrain. Une fois par manche, gratuit.');
      pl.append(mainVue(J.main,{}));
      const z=el('div','p-btns');z.append(bouton('Annuler',()=>{modeFaille=false;selCases=[];affiche()},true));pl.append(z);
    }else if(modeVaisseau){
      con('Le Vaisseau : touche 2 de tes Golems de ce terrain pour les échanger. Une fois par manche.');
      pl.append(mainVue(J.main,{}));
      const z=el('div','p-btns');z.append(bouton('Annuler',()=>{modeVaisseau=false;selCases=[];affiche()},true));pl.append(z);
    }else if(modeCaramel){
      /* Plusieurs Titom76 (Maître du bilig) : un seul bouton Caramel en jeu, le terrain se choisit ici (meme coup 'z' qu'avant). */
      con('Caramel : choisis le Titom76 (Maître du bilig) qui te donne +1 énergie. Une fois par manche chacun.');
      pl.append(mainVue(J.main,{}));
      /* Libelle = nom du terrain seul (la consigne dit deja Caramel) ; deux Titom76 sur un meme terrain : numerotes, rangee dans le title. */
      const z=el('div','p-btns p-choix'),nT=a=>s.terrains[a.k].nom,meme=a=>coupsZ.filter(b=>b.k===a.k);
      coupsZ.forEach((a,i)=>{const d=meme(a),T=nT(a)+(d.length>1?' '+(d.indexOf(a)+1):''),bc=bouton(T,()=>{modeCaramel=false;joue(a)});
        bc.title='Caramel : +1 énergie ('+nT(a)+(d.length>1?', rangée '+(a.l+1):'')+')';bc.setAttribute('aria-label',bc.title);bc.classList.add('caramel');bc.id='caramel'+i;z.append(bc)});
      const ba=bouton('Annuler',()=>{modeCaramel=false;affiche()},true);ba.id='annulerCaramel';z.append(ba);pl.append(z);
    }else{
    if(sel!==null&&!J.main.includes(sel))sel=null;
    const C=sel!==null?M.carte(sel):null;
    const rs=c=>raisonPose(s,me,c,leg),rz=sel!==null?rs(sel):null;
    const pc=el('div','p-consigne');
    if(C){pc.append(M.nomDetail(C)+(C.animal?', animal de compagnie de '+M.CARTES[C.maitre].nom:'')+', coût '+(C.cout+surcout(s,me,sel))+(surcout(s,me,sel)>0?" (Réalisation de l'âge : +"+surcout(s,me,sel)+')':'')+(C.force!=null?', Force '+C.force:'')+'. '+C.texte+(C.animal&&!rz?' Pose-le sur une case dorée, voisine de '+M.CARTES[C.maitre].nom+'.':''));if(rz)pc.append(el('em','',rz.long));
      {const kv=indexTerrainEffet(s,'unSeul');if(!C.animal&&!C.base&&kv>=0&&M.golemsIci(s,me,kv))pc.prepend(el('em','versus-non',s.terrains[kv].nom+' : un seul Golem par joueur, tu peux seulement remplacer le tien. '))}}
    else if(J.main.some(c=>!rs(c)))pc.append('Touche une carte, puis une case dorée.');
    else pc.append('Aucune pose possible ce tour. Termine ton tour.');
    pl.append(pc);
    pl.append(mainVue(J.main,{raison:rs,presse:c=>c===sel,clic:c=>{sel=sel===c?null:c;affiche()}}));
    const z=el('div','p-btns');
    if(sel!==null){
      const v=sel;
      const bz=el('button','btn sec','Voir');bz.type='button';bz.onclick=()=>{dernier=null;const n=surcout(s,me,v);zoom(imgV('cartes/'+C.id+'.jpg'),C.nom,detailSurcout(C,n),calqueSurcout(C,n))};z.append(bz);
    }
    /* Libelles courts (une ligne par case, 3 boutons par ligne au plus) ; explication complete en title et aria-label. */
    const expl=(b,x)=>{b.title=x;b.setAttribute('aria-label',x);return b};
    if(coupsF.length){const bf=expl(bouton('Faille',()=>{modeFaille=true;sel=null;selCases=[];affiche()},true),'Déplacement de La Faille : une fois par manche, déplace un de tes Golems vers une case libre de La Faille');bf.id='deplaceFaille';z.append(bf)}
    if(coupsV.length){const bv=expl(bouton('Vaisseau',()=>{modeVaisseau=true;sel=null;selCases=[];affiche()},true),'Échange du Vaisseau : une fois par manche, échange 2 de tes Golems du Vaisseau');bv.id='echangeVaisseau';z.append(bv)}
    /* Un seul bouton Caramel : un Caramel possible = coup direct ; plusieurs = choix du terrain (modeCaramel). 6 boutons au plus. */
    if(coupsZ.length){const n=coupsZ.length,bc=expl(bouton('Caramel',()=>{if(n===1)joue(coupsZ[0]);else{modeCaramel=true;sel=null;selCases=[];affiche()}},true),
      n===1?'Caramel : +1 énergie. Titom76 (Maître du bilig) : une fois par manche, +1 énergie':'Caramel : +1 énergie, '+n+' Titom76 (Maître du bilig) possibles, choisis le terrain. Une fois par manche chacun');bc.classList.add('caramel');bc.id='caramel';z.append(bc)}
    if(coupsR.length){const br=expl(bouton('Love',()=>{modeLove=true;sel=null;selCases=[];affiche()},true),"Love inconditionnel de K-Chan (L'attachiante) : une fois par manche, un Golem allié blessé récupère 1 de Force");br.id='love';z.append(br)}
    if(coupsO.length){const bo=expl(bouton('Tarte',()=>{modeTarte=true;sel=null;selCases=[];affiche()},true),'Tarte du Cirque : une fois par manche, inflige 1 dégât à un Golem adverse du Cirque');bo.id='tarte';z.append(bo)}
    if(coupsT.length){const bt=expl(bouton('Miser',()=>joue(coupsT[0]),true),'Les Pronos : une fois par manche, mise 1 énergie. Fin de manche : le gagnant des Pronos marque 1 point de plus par mise des deux joueurs');bt.id='miser';z.append(bt)}
    const fx=bouton('Fin du tour',()=>joue({t:'x'}));fx.id='finTour';z.append(fx);pl.append(z);
    }
  }else{
    /* « X joue. » : deja dit par la bande de tour adverse, seule la fin de manche garde sa consigne. */
    if(s.attente&&s.attente.t==='q'&&s.attente.adv&&s.attente.p!==me)con(nomJ(s.attente.p)+' : Jour de pêche, regarde les 2 premières cartes de ton deck et choisit celle à défausser.'); /* Le Q adverse */
    else if(s.fil||aMoi)con(nomJ(qui)+(s.fil?' choisit, fin de manche.':' joue.'));
    else pl.append(el('div','p-consigne p-cale'))
    if(!s.fil&&!aMoi&&!(s.attente&&s.attente.t==='q'&&s.attente.adv&&s.attente.p!==me))pl.append(el('div','p-btns p-cale')); /* 0.4a : place de la consigne gardee, la main ne bouge pas d'un tour a l'autre */
    pl.append(mainVue(J.main,{}));
  }
  const piles=el('div','p-piles');
  piles.append(pile('deck','Deck',J.deck.length,tasPile(me,'deck')),pile('forge','Forge',J.forge.length,J.forge.slice()),pile('defausse','Défausse',J.defausse.length,J.defausse.slice().reverse()));
  {const d=piles.firstChild;if(d.classList.contains('clic')){const f=()=>voirPile(me,'deck');d.onclick=f;d.onkeydown=e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();f()}}}}
  pl.append(piles);
  if(choixCartes){const z=el('div','p-choix');z.append(el('p','p-ap-leg','Choisis une carte'),choixCartes);pl.append(z)}
  else if(ZONE.matches&&!s.fin){const ap=el('div','p-apercu'),fi=el('div','p-ap-img'),im=el('img'),tx=el('div','p-ap-txt');im.alt='';fi.append(im);
    /* 0.4a (variante A, style diffusion) : carte a gauche ; a droite titre, « X pose Y sur Z. », effet, Cout / Force / elements */
    tx.append(el('p','p-ap-leg'),el('p','p-ap-ph'),el('p','p-ap-ef'),el('div','p-ap-chips'));ap.append(fi,tx);pl.append(ap);
    /* Clic sur la zone : la carte montree en grand (comme l'oeil de la main). */
    ap.onclick=()=>{if(ap.dataset.c===undefined||!partie)return;const c=+ap.dataset.c,C=M.carte(c),n=partie.etat.j[partie.moi].main.includes(c)?surcout(partie.etat,partie.moi,c):0;cacheApercu();dernier=null;zoom(srcC(c),C.nom,detailSurcout(C,n),calqueSurcout(C,n))}}
  const jo=el('details','p-journal'),li=el('div','p-lignes'),su=el('summary','','Journal');
  jo.open=journalOuvert||LARGE.matches;
  jo.ontoggle=()=>{if(!LARGE.matches)journalOuvert=jo.open;if(jo.open)li.scrollTop=li.scrollHeight};
  /* Nouvelle manche (un repere de plus) : retour a la manche en cours ; pendant la meme manche, la page choisie reste. */
  if(s.reperes.length>journalReperes)journalPage=null;journalReperes=s.reperes.length;
  const pages=pagesLog(s),nb=pages.length,pg=journalPage===null?nb:Math.min(journalPage,nb),nav=el('div','j-nav');
  const va=(txt,lib,v,off)=>{const z=el('button','j-btn',txt);z.type='button';z.setAttribute('aria-label',lib);z.disabled=off;z.onclick=()=>{journalPage=v>=nb?null:v;affiche()};return z};
  su.append(' ',el('span','j-manche','Manche '+pg));nav.append(va('<','Manche précédente',pg-1,pg<=1),va('>','Manche suivante',pg+1,pg>=nb));
  const causes=causesLog(s);pages[pg-1].forEach(e=>{const[p,x]=e,[c,n]=genreLog(x),d=el('div',c);
    /* 0.4a : ligne à la couleur du joueur (liseré à gauche), nom du joueur en gras à sa couleur */
    let t=ligneLog(p,x,me)+(causes.get(e)||''),q=null;
    if(p!==null){d.classList.add(p===me?'j-moi':'j-lui');const pr=(p===me?'Toi':nomJ(p))+' : ';if(t.startsWith(pr)){q=el('b','j-qui',pr.slice(0,-3));t=t.slice(pr.length-3)}}
    const sp=texteLog(t,null,true);if(q)sp.prepend(q);d.append(ico(n),sp);li.append(d)});
  jo.append(su,nav,li);
  const pied=el('div','p-pied'),q=el('button','btn sec plein','Quitter la partie');q.type='button';q.onclick=quitteBouton;pied.append(q);
  let enTuto=false;try{enTuto=!!tuto}catch(e){}
  if(partie.tuto&&enTuto&&!s.fin){const gp=el('button','btn sec plein','Passer le tutoriel');gp.type='button';gp.id='passerTuto';gp.onclick=()=>{arreteGuide();affiche()};pied.classList.add('duo');pied.append(gp)}
  else if(btnRejouer){pied.classList.add('duo','trio');pied.append(btnPartage,btnRejouer)}
  /* Abandon (moteur 0.2.2) : coup 'a' dans le journal, victoire a l'adversaire, chez les deux joueurs. */
  else if(!s.fin&&!partie.rejeu&&!partie.tuto&&M.VERSION===M0.VERSION){const ab=el('button','btn danger plein p-abandon-btn','Abandonner');ab.type='button';ab.id='abandonner';
    ab.onclick=()=>{if(!partie||partie.rejeu||!partie.etat||partie.etat.fin)return;confirmeAbandon(partie.local?'La partie comptera comme une défaite.':nomJ(1-partie.moi)+' gagne et ta défaite est enregistrée.',()=>{if(!partie||partie.rejeu||!partie.etat||partie.etat.fin)return;joue({t:'a'})})};
    pied.classList.add('duo');pied.append(ab)}
  const cote=el('div','p-cote');if(!partie.local&&!partie.rejeu&&r&&!s.fin)cote.append(reactions()); /* fin de partie (abandon compris) : plus de reactions */cote.append(pied,cercleJeu(),jo);
  /* 0.4a : chat des parties en ligne, bouton discret en bas de la colonne du journal (pastille des messages non lus), fenetre fermee par defaut ; contre le robot, rien. */
  if(!partie.local&&!partie.rejeu&&r){const bc=el('button','p-chat','Chat'),pa=el('span','p-chat-nb',chatBox.nb.textContent);bc.type='button';bc.id='btnChat';bc.append(pa);
    bc.setAttribute('aria-label','Ouvrir le chat'+(pa.textContent?', '+pa.textContent+' non lu'+(+pa.textContent>1?'s':''):''));
    bc.onclick=()=>{const c=chatBox.c;if(c.classList.contains('replie'))c.querySelector('.chat-tete').click()};cote.append(bc)}
  table.append(b,plat,pl,cote);
  /* Signal de tour juste au-dessus de la main, la consigne reste en dessous ; au tour adverse, main grisee (toujours consultable). */
  if(!s.fin&&s.phase==='jeu'){
    const sg=el('div','p-signal '+(aMoi?'s-moi':'s-lui')),av=pl.querySelector('.p-consigne,.p-main');
    if(aMoi)sg.append(el('b','','À toi de jouer'));
    else{sg.append(el('b','','Tour de '+nomJ(qui)),el('span','','Tu peux regarder ta main en attendant.'));pl.querySelectorAll('.p-main').forEach(m=>m.classList.add('en-veille'))}
    pl.insertBefore(sg,av||pl.firstChild);
  }
  box.append(table);
  li.scrollTop=li.scrollHeight;
  /* Rejeu : on regarde seulement, toutes les commandes de jeu sont inactives. */
  if(partie.rejeu)pl.querySelectorAll('.p-main button,.p-btns button').forEach(x=>{if(!x.closest('.p-fin'))x.disabled=true});
  poseFx();
  zoneSurvol=null;zoneMaj();if(partie.rejeu)barreRejeu();
  scrollTo(0,hautPage);
  if(window.DIFFUSION&&DIFFUSION.joueur)DIFFUSION.joueur(); /* 0.5 : vue joueur sur ordinateur (diffusion.js) */
}
const LARGE=matchMedia('(min-width:900px)');
/* Zone d'apercu (ordinateur, 1200 px et plus) : carte survolee ou choisie de la main, sinon derniere carte posee par l'adversaire. */
/* 0.4a : cercle des elements permanent en partie (style diffusion : pictos sans anneau, fleches dans les espaces libres). Noms dans l'aide « ? ».
   Ordinateur : toujours visible ; telephone : repliable, ferme par defaut. */
let svgCercleJeu=null,cercleOuvert=false;
function cercleJeu(){
  const d=el('details','p-cercle'),su=el('summary','','Cercle des éléments'),w=el('div','p-cw');
  if(!svgCercleJeu){
    const E5=ELEMENTS.ordre,IM=68,ey=(188-IM)/1.809,ex=(350-IM)/1.902,DEG=Math.PI/180,P=a=>[ex*Math.cos(a*DEG),ey*Math.sin(a*DEG)];
    const pos=E5.map((e,i)=>P(-90+72*i)),libre=a=>{const[x,y]=P(a);return !pos.some(([X,Y])=>Math.hypot(x-X,y-Y)<IM/2+5)};
    let g='<defs><marker id="flJeu" viewBox="0 0 10 10" refX="7" refY="5" markerWidth="4" markerHeight="4" orient="auto"><path d="M0 0L10 5L0 10Z" style="fill:var(--bleu)"/></marker></defs>';
    for(let i=0;i<5;i++){const a0=-90+72*i;let best=[0,0],cur=null;for(let a=a0;a<=a0+72;a+=.25){if(libre(a)){if(cur===null)cur=a;if(a-cur>best[1]-best[0])best=[cur,a]}else cur=null}
      const p=P(best[0]+1),q=P(best[1]-1);g+='<path class="arc" d="M'+p+'A'+ex+' '+ey+' 0 0 1 '+q+'" marker-end="url(#flJeu)"/>'}
    pos.forEach(([x,y],i)=>{g+='<image href="'+imgV('cartes/'+E5[i]+'.png')+'" x="'+(x-IM/2)+'" y="'+(y-IM/2)+'" width="'+IM+'" height="'+IM+'"/>'});
    const x0=Math.min(...pos.map(p=>p[0]))-IM/2-3,x1=Math.max(...pos.map(p=>p[0]))+IM/2+3,y0=Math.min(...pos.map(p=>p[1]))-IM/2-3,y1=Math.max(...pos.map(p=>p[1]))+IM/2+3;
    svgCercleJeu='<svg role="img" aria-label="Cercle des éléments : Magma domine Cristal, Cristal domine Foudre, Foudre domine Brume, Brume domine Roche, Roche domine Magma" viewBox="'+[x0,y0,x1-x0,y1-y0].map(v=>+v.toFixed(1)).join(' ')+'">'+g+'</svg>';
  }
  w.innerHTML=svgCercleJeu;d.open=cercleOuvert||LARGE.matches;d.ontoggle=()=>{if(!LARGE.matches)cercleOuvert=d.open};d.append(su,w);return d;
}
function zoneEl(){const z=document.querySelector('#partie .p-apercu');return z&&z.offsetParent?z:null}
function zoneMaj(){
  const z=zoneEl();if(!z||!partie||!partie.etat)return;
  const main=partie.etat.j[partie.moi].main,c=zoneSurvol!==null?zoneSurvol:sel!==null&&main.includes(sel)?sel:derniereAdv;
  const im=z.querySelector('img'),lg=z.querySelector('.p-ap-leg'),ph=z.querySelector('.p-ap-ph'),ef=z.querySelector('.p-ap-ef'),ch=z.querySelector('.p-ap-chips');
  ph.textContent='';ef.textContent='';ch.textContent='';
  if(c===null){delete z.dataset.c;z.classList.add('vide');im.hidden=true;lg.textContent='Dernière carte jouée';ph.textContent='Survole une carte de ta main pour la voir en grand.';return}
  let src,C;try{src=srcC(c);C=M.carte(c)}catch(e){return}
  z.dataset.c=c;z.classList.remove('vide');im.hidden=false;if(im.getAttribute('src')!==src)im.src=src;im.alt=C.nom;
  const der=c===derniereAdv&&c!==zoneSurvol&&c!==sel,s=partie.etat,lui=1-partie.moi;
  lg.textContent=der?'Dernière carte jouée':'Aperçu';
  const nm=el('b','p-ap-nom'+(C.base?' evo':''),C.nom);
  if(der){let k=null;s.j[lui].grille.forEach(L=>L.forEach((x,kk)=>{if(x&&x.c===c)k=kk}));
    ph.append(el('span','p-ap-qui',nomJ(lui)+' pose '),nm,k!==null?' sur '+s.terrains[k].nom+'.':'.')}
  else ph.append(nm);
  const t=C.texte||'',i=t.indexOf(' : ');if(i>0)ef.append(el('b','',t.slice(0,i)),t.slice(i));else ef.textContent=t;
  const chip=(l,v)=>{const x=el('span');x.append(l+' ',el('b','',v));return x};
  ch.append(chip('Coût',String(C.cout)));
  if(C.animal)ch.append(el('span','','Animal'));else{ch.append(chip('Force',C.force==null?'au dé':String(C.force)));if((C.el||[]).length){const e=el('span','p-ap-els');C.el.forEach(x=>e.append(picto(x)));ch.append(e)}}
}
LARGE.addEventListener('change',()=>{if(partie)affiche()});
