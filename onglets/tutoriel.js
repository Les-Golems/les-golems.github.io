/* Partie guidee (tutoriel) et bandeau Premiere partie. */
/* Partie guidee : graine et deck fixes, Golem Facile. Le robot est deterministe, donc la partie suit toujours
   le meme chemin tant que le joueur fait les gestes demandes (les autres clics sur le plateau sont bloques).
   Cartes de la graine 19445 : KaTarN 0 et 2, Roi du Mobile 28 et 27, Trigas 26, Elessar 74, Le Q 18, Slim K 5 (0.4a : deck a 4 elements, memes places que l'ancien). Le Golem pose Trigas en (0,2) au tour 3 (Le Q refondu, 6 nov.).
   Hors historique, profil et sauvegarde (voir calcule et sauve). */
const GUIDE={graine:19445,deck:'0013001e30023002e300430073007e30183'};
const gJ=()=>partie.etat.j[partie.moi],gG=(l,k)=>gJ().grille[l][k],gId=(l,k)=>gG(l,k)&&M.carte(gG(l,k).c).id;
const gSlot=c=>'.p-slot[data-c="'+c+'"]';
const gMull=s=>s.phase==='mulligan'&&!s.mull[partie.moi];
const gTour=s=>s.phase==='jeu'&&!s.fin&&!s.attente&&!s.fil&&s.joueur===partie.moi;
const gForge=(t,m)=>s=>gTour(s)&&s.manche===(m||1)&&s.tour===t&&gJ().etapeForge;
const gAct=(t,m)=>s=>gTour(s)&&s.manche===(m||1)&&s.tour===t&&!gJ().etapeForge;
const gForgee=n=>()=>gJ().forge.length>=n;
const ETAPES=[
 {q:gMull,t:"Bienvenue ! Cette partie guidée t'apprend les bases contre un Golem Facile. Lis chaque bulle, puis fais ce qu'elle demande.",suiv:1},
 {q:gMull,c:'.p-grille.mienne',t:"Voici ta grille : 3 lignes et 3 colonnes. Celle du Golem est de l'autre côté, en miroir.",suiv:1},
 {q:gMull,c:'.p-terrains',t:"Chaque colonne correspond à un <b>terrain</b>. À la fin de chaque manche, le plus fort de la colonne conquiert le terrain et marque ses points.",suiv:1},
 {q:gMull,c:'.p-main',t:"Voici ta <b>main</b> : 5 cartes. Au départ, tu peux en remplacer jusqu'à 3. Ici, ta main est bonne.",suiv:1},
 {q:gMull,c:'.p-poste .p-btns .btn',t:"Touche <b>Garder ma main</b>.",f:s=>s.mull[partie.moi]},
 {q:gForge(1),c:'.pile.deck',t:"Ton tour commence par la <b>pioche</b> : tu prends 2 cartes de ton deck. Tu as maintenant 7 cartes en main.",suiv:1},
 {q:gForge(1),c:gSlot(28),t:"Étape 1, la <b>Forge</b>. Touche <b>Roi du Mobile</b> pour le forger.",f:()=>sel===28||gJ().forge.length>=1},
 {q:gForge(1),c:'#forger',t:"Une carte forgée reste face cachée pour toujours et donne 1 énergie à chaque tour, dès ce tour. La Forge est ta seule source d'énergie. Touche <b>Forger</b>.",f:gForgee(1)},
 {q:gAct(1),c:'.p-camp.toi .c-enclume',t:"Tu as 1 <b>énergie</b>. Elle sert à payer le coût de tes cartes.",suiv:1},
 {q:gAct(1),c:gSlot(0),t:"Pose un Golem : touche <b>KaTarN</b>, il coûte 1.",f:()=>sel===0||!!gG(1,1)},
 {q:gAct(1),c:caseDe(0,1,1),t:"Les cases dorées montrent où le poser. Touche celle du milieu.",f:()=>!!gG(1,1)},
 {q:gAct(1),c:caseDe(0,1,1),t:"Le grand chiffre est sa <b>Force</b> : 8. Touche KaTarN pour voir le détail.",f:()=>!$('vue').hidden},
 {vue:1,c:'#vueDetail',t:"Force actuelle = Force de la carte + bonus (capacités, Trait, cercle) - dégâts. Pour l'instant, KaTarN n'a ni bonus ni dégât. Touche <b>Fermer</b>.",f:()=>$('vue').hidden},
 {q:gAct(1),c:'#finTour',t:"Tu n'as plus d'énergie. Touche <b>Fin du tour</b> : l'énergie qui reste est perdue.",f:s=>s.tour>1||s.joueur!==partie.moi},
 {q:gForge(2),c:gSlot(27),t:"Le Golem a joué, à toi ! Tu as pioché 2 cartes. Forge l'autre <b>Roi du Mobile</b> pour avoir 2 énergies.",f:()=>sel===27||gJ().forge.length>=2},
 {q:gForge(2),c:'#forger',t:"Touche <b>Forger</b>.",f:gForgee(2)},
 {q:gAct(2),c:gSlot(2),t:"Touche ton deuxième <b>KaTarN</b>.",f:()=>sel===2||!!gG(1,0)},
 {q:gAct(2),c:caseDe(0,1,0),t:"Le <b>+2</b> sur la case est le bonus prévu. Pose-le ici, à côté du premier.",f:()=>!!gG(1,0)},
 {q:gAct(2),c:caseDe(0,1,1),t:"C'est le <b>Trait</b> : +1 par voisin allié pour chaque élément partagé. Les deux KaTarN partagent Magma et Foudre : +2 chacun.",suiv:1},
 {q:gAct(2),c:caseDe(0,1,0),t:"Les voisins se cumulent, sans plafond : deux voisins Foudre donneraient aussi +2.",suiv:1},
 {q:gAct(2),c:'#finTour',t:"Il te reste 1 énergie, mais aucune carte à 1 en main. Touche <b>Fin du tour</b>.",f:s=>s.tour>2||s.joueur!==partie.moi},
 {q:gForge(3),c:gSlot(26),t:"Dernier tour de la manche. Forge <b>Trigas</b> : tu auras 3 énergies.",f:()=>sel===26||gJ().forge.length>=3},
 {q:gForge(3),c:'#forger',t:"Touche <b>Forger</b>.",f:gForgee(3)},
 {q:gAct(3),c:caseDe(1,0,2),t:"Le Golem a posé <b>Trigas</b> ici. Ses éléments : Foudre et Brume.",suiv:1},
 {q:gAct(3),c:gSlot(74),t:"<b>Elessar</b> est Roche et Foudre, et Foudre domine Brume. Touche Elessar.",f:()=>sel===74||!!gG(0,2)},
 {q:gAct(3),c:caseDe(0,0,2),t:"Pose-le <b>en face</b> de Trigas : même terrain, même ligne.",f:()=>!!gG(0,2)},
 {q:gAct(3),c:caseDe(0,0,2),t:"C'est le <b>cercle</b> : +1 si le Golem en face a un élément que le tien domine. Jamais plus de +1, sauf effet de carte. Elessar passe de 2 à 3.",suiv:1},
 {q:gAct(3),c:'#finTour',t:"Touche <b>Fin du tour</b>. Le Golem joue son dernier tour, puis la manche se termine.",f:s=>s.manche>1||s.tour>3||s.joueur!==partie.moi},
 {recap:1,c:'#recap .r-terrain',t:"<b>Décompte</b> : dans chaque colonne, on additionne la Force de tous ses Golems.",suiv:1},
 {recap:1,c:'#recap .r-terrain .gagne',t:"Le plus fort <b>conquiert le terrain</b> et marque ses points. En cas d'égalité, personne ne le marque.",suiv:1},
 {recap:1,c:'#continuer',t:"Les cartes et les dégâts restent en place pour la manche suivante. Touche <b>Continuer</b>.",f:s=>$('recap').hidden&&s.manche>1},
 {q:gForge(1,2),c:'.p-trois .p-info',t:"<b>Manche 2</b> : le premier joueur change, le Golem a commencé. En second, tu ne pioches qu'1 carte à ton premier tour.",suiv:1},
 {q:gForge(1,2),c:caseDe(0,1,1),t:"À chaque fin de manche, KaTarN perd 4 de Force. Ce sont des dégâts : ils restent.",suiv:1},
 {q:gForge(1,2),c:gSlot(18),t:"Forge <b>Le Q</b> : tu auras 4 énergies.",f:()=>sel===18||gJ().forge.length>=4},
 {q:gForge(1,2),c:'#forger',t:"Touche <b>Forger</b>.",f:gForgee(4)},
 {q:gAct(1,2),c:gSlot(5),t:"<b>Slim K</b> est l'évolution de KaTarN. Elle coûte 4 et se pose sur sa base. Touche Slim K.",f:()=>sel===5||gId(1,1)==='001e'},
 {q:gAct(1,2),c:caseDe(0,1,1),t:"Touche le KaTarN du milieu pour l'<b>améliorer</b>.",f:()=>gId(1,1)==='001e'},
 {q:gAct(1,2),c:caseDe(0,1,1),t:"KaTarN part à la défausse et ses dégâts disparaissent. À la pose, Slim K inflige 1 dégât à chaque Golem de la ligne adverse.",suiv:1},
 {q:gAct(1,2),c:'#finTour',t:"Tu connais l'essentiel ! Termine ton tour, puis joue la suite de la partie comme tu veux.",suiv:'Compris',libre:1},
 {libre:1,q:s=>!!s.fin,c:'.p-fin h3',fin:1,t:"Partie terminée, bravo ! Les <b>Règles</b> détaillent tout le reste, comme les effets des terrains."}
];
const G_LIBRES='.p-outils button,.p-pied button,.oeil';
function lanceGuide(){
  if(r){alerte('erreurJeu','Salon en cours : partie guidée indisponible dans un salon. Quitte le salon d\'abord.');onglet('jouer');return}
  if(partie)finPartie();
  $('premierePartie').hidden=true;
  $('erreurJeu').textContent='';onglet('jouer');
  lancer(GUIDE.graine,0,'',{mien:[],sien:[],advNom:'Golem',niveau:'facile',local:true,tuto:true,decks:[GUIDE.deck,M.DECK_TUTO||''],deckNom:'Deck de la partie guidée'});
  tuto={i:0,vu:-1,T:setInterval(tickGuide,150)};
  const b=el('div','g-bulle'),a=el('div','g-anneau'),f=el('div','g-fleche');b.hidden=a.hidden=f.hidden=true;
  b.setAttribute('role','status');tuto.b=b;tuto.a=a;tuto.f=f;document.body.append(a,f,b);
  /* Passer le tutoriel : dans la colonne de droite, a cote de Quitter la partie (voir affiche). */
  affiche();tickGuide();
}
function arreteGuide(){
  if(!tuto)return;
  clearInterval(tuto.T);tuto.b.remove();tuto.a.remove();tuto.f.remove();tuto=null;$('gPasser').hidden=true;
}
function etapeG(){return tuto&&ETAPES[tuto.i]}
/* Etape suivante quand la condition est remplie ; bulle seulement au calme (ni animation, ni de, ni robot). */
function tickGuide(){
  if(!tuto)return;
  if(!partie||!partie.tuto||!partie.etat){arreteGuide();return}
  const s=partie.etat;let e=etapeG();
  while(e&&e.f&&e.f(s)){tuto.i++;e=etapeG()}
  if(!e){arreteGuide();return}
  const b=tuto.b,a=tuto.a,f=tuto.f;
  const calme=(e.fin||!animCours&&!verrou&&!desActif&&!fileA.length)&&$('vue').hidden===!e.vue&&$('recap').hidden===!e.recap&&$('vueTas').hidden&&$('aide').hidden;
  const z=e&&calme&&(!e.q||e.q(s))&&!$('jouer').hidden?(e.c?document.querySelector(e.c):document.body):null;
  if(!z){b.hidden=a.hidden=f.hidden=true;return}
  if(tuto.vu!==tuto.i){
    tuto.vu=tuto.i;b.textContent='';
    const p=el('p');p.innerHTML=e.t;b.append(p);
    const pied=el('div','g-pied');
    if(!e.libre)pied.append(el('span','g-num',(tuto.i+1)+' / '+(ETAPES.length-2)));
    if(e.suiv){const x=bouton(e.suiv===1?'Suivant':e.suiv,()=>{tuto.i++;tickGuide()});x.dataset.act='';pied.append(x)}
    if(e.fin){
      const x=bouton('Lire les Règles',()=>{sortie();onglet('regles');scrollTo(0,0)}),y=bouton('Fermer',()=>arreteGuide(),true);
      x.dataset.act=y.dataset.act='';pied.append(y,x);
    }
    if(pied.childNodes.length)b.append(pied);
    b.hidden=false;
    const r0=z.getBoundingClientRect();
    if(e.c&&(r0.top<60||r0.bottom>innerHeight-40))z.scrollIntoView({block:'center'});
  }
  b.hidden=false;placeGuide(z,!e.c);
}
function placeGuide(z,centre){
  const b=tuto.b,a=tuto.a,f=tuto.f,vw=document.documentElement.clientWidth,vh=innerHeight,bw=b.offsetWidth,bh=b.offsetHeight;
  const r=centre?{left:vw/2,right:vw/2,top:vh/2,bottom:vh/2,width:0,height:0}:z.getBoundingClientRect();
  a.hidden=centre;if(!centre)Object.assign(a.style,{left:r.left-4+'px',top:r.top-4+'px',width:r.width+8+'px',height:r.height+8+'px'});
  /* Positions candidates autour de la cible ; on garde celle qui masque le moins de zones cliquables (jamais la cible). */
  const cl=(v,a,z)=>Math.max(a,Math.min(z,v)),cx=cl(r.left+r.width/2-bw/2,8,vw-bw-8),cy=cl(r.top+r.height/2-bh/2,8,vh-bh-8);
  const cands=[[cx,r.bottom+14,'haut'],[cx,r.top-bh-14,'bas'],[r.right+14,cy,''],[r.left-bw-14,cy,''],[8,vh-bh-8,''],[vw-bw-8,vh-bh-8,''],[8,8,''],[vw-bw-8,8,'']];
  const C=(!centre&&z.closest('.p-grille,.p-main,.p-piles,.p-trois,.p-terrains,.p-camp,.boite'))||null,Q=C&&C!==z?C.getBoundingClientRect():null;
  if(Q)cands.push([Q.right+14,cy,''],[Q.left-bw-14,cy,''],[cx,Q.bottom+14,'haut'],[cx,Q.top-bh-14,'bas'],[Q.right+14,cl(Q.top,8,vh-bh-8),''],[Q.left-bw-14,cl(Q.top,8,vh-bh-8),'']);
  for(let gy=8;gy<=vh-bh-8;gy+=24)for(let gx=8;gx<=vw-bw-8;gx+=24)cands.push([gx,gy,'']); /* balayage : place libre la plus proche */
  const zones=[...document.querySelectorAll(G_GENE)].filter(x=>x.offsetParent||x.id==='gPasser').map(x=>x.getBoundingClientRect()).filter(q=>q.width&&q.height);
  const rec=(x,y,q)=>Math.max(0,Math.min(x+bw,q.right)-Math.max(x,q.left))*Math.max(0,Math.min(y+bh,q.bottom)-Math.max(y,q.top));
  let best=null;
  cands.forEach(([x,y,s],i)=>{
    const dehors=x<8||y<8||x+bw>vw-8||y+bh>vh-8;if(dehors)return;
    const dx=Math.max(0,r.left-(x+bw),x-r.right),dy=Math.max(0,r.top-(y+bh),y-r.bottom);
    const sc=rec(x,y,r)*100+zones.reduce((t,q)=>t+rec(x,y,q),0)*2+(dx+dy)*12+i/100;
    if(!best||sc<best.sc)best={x,y,s,sc}});
  if(!best)best={x:cx,y:r.bottom+bh+14<vh?r.bottom+14:8,s:''};
  /* Bulle centrale sur telephone : sous la barre de score et la ligne du tour, jamais dessus. */
  if(centre&&vw<700){const t=document.querySelector('#partie .p-tourde')||document.querySelector('#partie .p-barre'),tb=t?t.getBoundingClientRect().bottom+10:8;if(tb+bh<vh-8)best={x:cl(vw/2-bw/2,8,vw-bw-8),y:Math.max(best.y,tb),s:''}}
  const left=best.x,top=best.y,sens=centre?'':best.s;
  b.style.left=left+'px';b.style.top=top+'px';
  f.hidden=!sens;f.className='g-fleche '+sens;
  if(sens){f.style.left=Math.max(left+12,Math.min(left+bw-30,r.left+r.width/2-9))+'px';f.style.top=(sens==='haut'?top-18:top+bh)+'px'}
}
const G_GENE='#partie .p-info,#partie button,#partie .p-case,#partie .pile,#partie .p-slot,#partie .p-trois,#partie .p-tourde,#partie .p-terrains,#recap button,#gPasser,nav';
/* Pendant le guidage, seul l'element vise repond sur le plateau et dans le bilan de manche. */
document.addEventListener('click',e=>{
  const st=etapeG();if(!st||st.libre||!partie||!partie.tuto)return;
  const t=e.target;if(!t.closest||!t.closest('#partie,#recap'))return;
  if(t.closest(G_LIBRES))return;
  if(!st.suiv&&st.c&&t.closest(st.c))return;
  e.preventDefault();e.stopPropagation();
},true);
$('gPasser').onclick=()=>arreteGuide();
$('lanceGuide').onclick=lanceGuide;
$('propOui').onclick=()=>{ecrire('golems.guide','1');$('premierePartie').hidden=true;lanceGuide()};
$('propNon').onclick=()=>{ecrire('golems.guide','1');$('premierePartie').hidden=true;ajusteNotes()};
/* Premiere partie ? (0.4) : bandeau en haut des Nouveautes (0.5.3), montre tant que la cle golems.guide est absente ;
   la cle n'est posee qu'au clic sur Lancer la partie guidee ou Plus tard. Tutoriel permanent dans Apprendre et s'entrainer. */
function proposeGuide(){
  if(lire('golems.guide')||partie||r)return;
  $('premierePartie').hidden=false;
}
if(/^(localhost|127\.0\.0\.1)$/.test(location.hostname))window.__golemsGuide=()=>tuto&&{i:tuto.i,n:ETAPES.length,c:ETAPES[tuto.i].c||null,suiv:!!ETAPES[tuto.i].suiv};
