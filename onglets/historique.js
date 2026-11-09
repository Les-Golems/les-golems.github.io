/* Onglet Historique : liste et filtres, detail d'une partie (face a face), rejeu, pagination. */
/* Deck vraiment joue : celui transmis au moteur (texte vide = paquet de test). */
function deckJoue(){
  const t=partie&&partie.decks?partie.decks[partie.moi]||'':'';
  return {nom:t?(partie.deckNom||'Deck'):'Test',cartes:t,els:elsTexte(t)};
}
function bandeauDeck(d){
  if(!d||typeof d.nom!=='string')return el('span','h-deck h-sans','Deck non noté');
  const b=el('span','h-deck',d.nom==='Test'&&!d.cartes?'Deck par défaut':d.nom),e=(Array.isArray(d.els)?d.els:[]).filter(x=>/^(magma|cristal|foudre|brume|roche)$/.test(x));
  b.style.background=e.length>1?'linear-gradient(90deg,'+e.map((x,i)=>'var(--fm-'+x+') '+Math.round(100*i/(e.length-1))+'%').join(',')+')':e.length?'var(--fm-'+e[0]+')':'var(--panneau2)';
  return b;
}
/* Version du jeu de la partie (moteur), "version inconnue" pour les anciennes entrees. */
function versionHisto(x){const v=x&&(x.moteur||(x.rejeu&&x.rejeu.v));return typeof v==='string'&&v?'v'+v:'version inconnue'}
/* Affichage : version du site (table PATCH_MOTEUR des Statistiques) et niveau du Golem avec majuscule. */
function versionAff(x){const v=x&&(x.moteur||(x.rejeu&&x.rejeu.v));return typeof v==='string'&&v?patchSite(v):'version inconnue'}
function advAff(a){const m=/^Golem \((.+)\)$/.exec(a||'');return m?'Golem ('+m[1].charAt(0).toUpperCase()+m[1].slice(1)+')':String(a||'')}
/* Carte du detail : pictos d'elements puis pseudo (★ si evolution) et titre en dessous, comme la liste condensee des decks. */
/* Nom complet comme sur la carte (« K-Chan, Reine du tilt »), d'apres CARTES. */
function nomComplet(nom){const C=Object.values(M0.CARTES).find(z=>M0.nomDetail(z)===nom||z.nom===nom),c=C&&CARTES.find(z=>z[0]===C.id);return c?c[1]:String(nom)}
function carteHisto(nom){
  const C=Object.values(M0.CARTES).find(z=>M0.nomDetail(z)===nom||z.nom===nom),c=C&&CARTES.find(z=>z[0]===C.id),b=el('span','h-crt'),e=el('span','h-cels'),nm=el('span','h-cnom');
  if(!c){nm.append(el('span','h-cps',String(nom)));b.append(nm);return b}
  c[2].forEach(x=>e.append(picto(x)));
  const v=c[1].indexOf(', '),ps=v<0?c[1]:c[1].slice(0,v);nm.append(el('span','h-cps',ps+(v<0?'':',')));
  if(v>=0){const t=el('span','h-cti',c[1].slice(v+2));t.style.color=coulT(c);t.title=c[1].slice(v+2);nm.append(t)}
  b.append(e,nm);return b;
}
/* ===== 0.6 : liste « Historique » et fenetre de detail « Face a face » (maquettes 24, 26 et 36 variante D).
   Donnees nouvelles, toutes facultatives (affichees seulement si la partie les porte) :
     x.mode    : 'classee' | 'amicale' | 'entrainement' (absent : Golem = entrainement, sinon amicale ; x.classe = classee)
     x.classe  : { elo, delta, eloAdv, robot } vus du joueur (commun/classe.js : eloA/deltaA/eloB) ; robot = classee contre un Golem
     x.terrains: une liste par manche de { nom, pts, g (0 = moi, 1 = adversaire, null = personne), f: [Force moi, Force adversaire] }
     x.deckAdv : { nom, els } deck de l'adversaire
     bilan[].cartes[i][5] : pseudo du maitre d'un animal (sinon lu dans CARTES : maitre) */
const H_NIV={facile:'Facile',normal:'Normal',difficile:'Difficile'};
const H_ELS=/^(magma|cristal|foudre|brume|roche)$/;
let filtreHisto='toutes';
const carteDe=nom=>nom?Object.values(M0.CARTES).find(c=>M0.nomDetail(c)===nom||c.nom===nom)||null:null;
/* Couleur d'une carte : son premier element (un animal prend celui de son maitre). */
const elCarte=C=>!C?null:(C.el&&C.el[0])||(C.maitre&&M0.CARTES[C.maitre]&&M0.CARTES[C.maitre].el[0])||null;
const nivHisto=a=>{const m=/^Golem \((facile|normal|difficile)\)$/i.exec(a||'');return m?NIV_ORDI.find(n=>n[0]===m[1].toLowerCase()):null};
const modeHisto=x=>x.mode||(x.classe?'classee':nivHisto(x.adv)?'entrainement':'amicale');
const resCl=x=>x.res==='Victoire'?'v':x.res==='Défaite'?'d':'n';
const pictosH=(els,cl)=>{const s=el('span','hl-pts'+(cl?' '+cl:''));(Array.isArray(els)?els:[]).filter(e=>H_ELS.test(e)).forEach(e=>s.append(picto(e)));return s};
const elsDeckH=x=>x.deck&&x.deck.nom==='Test'&&!x.deck.cartes?elsTexte(deckDefautTxt(vPartie(x))):(x.deck&&Array.isArray(x.deck.els)?x.deck.els:[]);
const nomDeckH=d=>!d||typeof d.nom!=='string'?'Deck non noté':d.nom==='Test'&&!d.cartes?'Deck par défaut':d.nom;
function resHisto(x){return el('span','hl-res '+resCl(x),x.res==='Match nul'?'Nul':x.res)}
/* Etiquettes : Classee (doree), Amicale, Entrainement ; classee contre un Golem = « Classee » + pastille grise « Golem » (variante D). */
function etqHisto(x){
  const m=modeHisto(x),z=el('span','hl-etqs');
  z.append(el('span','hl-tag '+m,m==='classee'?'Classée':m==='amicale'?'Amicale':'Entraînement'));
  if(m==='classee'&&x.classe&&x.classe.robot)z.append(el('span','hl-tag golem','Golem'));
  return z;
}
function avHisto(nom,els,golem){
  const a=el('span','hl-av'+(golem?' golem':''),golem?'G':String(nom||'?').charAt(0).toUpperCase());
  if(!golem){const e=(Array.isArray(els)?els:[]).find(y=>H_ELS.test(y))||'brume';a.style.background='var(--fm-'+e+')'}
  a.setAttribute('aria-hidden','true');return a;
}
/* Adversaire : avatar, nom (Golem + niveau en couleur), Elo s'il s'agit d'une classee. */
function advHisto(x,droite){
  const z=el('span','hl-adv'+(droite?' d':'')),nv=nivHisto(x.adv),n=el('span','hl-n');
  if(nv){n.append('Golem ');const b=el('b','',H_NIV[nv[0]]);b.style.color=nv[1];n.append(b);n.title='Golem, niveau '+H_NIV[nv[0]]}
  else{n.textContent=String(x.adv||'Adversaire');n.title=n.textContent}
  const elo=x.classe&&Number.isFinite(x.classe.eloAdv)?el('span','hl-elo',String(Math.round(x.classe.eloAdv))):null;
  if(droite){if(elo)z.append(elo);z.append(n,avHisto(x.adv,x.deckAdv&&x.deckAdv.els,!!nv))}
  else{z.append(avHisto(x.adv,x.deckAdv&&x.deckAdv.els,!!nv),n);if(elo)z.append(elo)}
  return z;
}
function deltaHisto(x){
  const d=x.classe&&Number.isFinite(x.classe.delta)?Math.round(x.classe.delta):null;
  if(d===null)return null;return el('span','hl-delta '+(d>0?'p':d<0?'m':''),(d>0?'+':'')+d);
}
function scoreHisto(x,cl){
  const z=el('span',cl||'hl-sc'),p=String(x.score||'').split(' - ');
  if(p.length===2){z.append(el('b','',p[0]),el('span','hl-ti','-'),el('b','',p[1]))}else z.append(el('b','',String(x.score||'')));
  return z;
}
/* MVP : nom de la carte dans la couleur de son premier element, ★ apres une evolution (audit 34, J11). */
function mvpHisto(nom){
  const z=el('span','hl-mvp');z.append(el('span','hl-mvpe','MVP'));
  const C=carteDe(nom),b=el('b','',C?C.nom+(C.base?' ★':''):(nom||'-'));
  if(C&&elCarte(C))b.style.color='var(--'+elCarte(C)+')';if(C&&C.base)b.title=C.nom+' (évolution de '+M0.CARTES[C.base].nom+')';else b.title=b.textContent;
  z.append(b);return z;
}
/* 0.6 : partie sans date (ou date illisible) : « - » et non « Invalid Date » */
const dateOk=t=>t!=null&&t!==''&&Number.isFinite(new Date(t).getTime());
const dateH=t=>dateOk(t)?new Date(t).toLocaleDateString('fr-FR',{day:'2-digit',month:'2-digit',year:'numeric'}):'-';
const heureH=t=>dateOk(t)?new Date(t).toLocaleTimeString('fr-FR',{hour:'2-digit',minute:'2-digit'}):'';
function verHisto(x){const w=versionAff(x);return el('span','etq-v hl-ver',/^[0-9]/.test(w)?'v'+w:w)}

/* ----- Fenetre de detail ----- */
function detailHisto(x){
  const ancien=$('detailHisto');if(ancien)ancien.remove();
  const ps=x.pseudo||pseudo||'Joueur',moiN=n=>n===ps,golem=!!nivHisto(x.adv),lui=golem?'Golem':String(x.adv||'Adversaire');
  const v=el('div','voile hd-voile'),d=el('div','sc-fenetre hd-fen '+resCl(x));
  v.setAttribute('role','dialog');v.setAttribute('aria-modal','true');v.setAttribute('aria-labelledby','hdTitre');v.id='detailHisto';
  /* Titre : resultat, etiquettes, mention ; date et version a droite */
  const t=el('h2','sc-fen-titre hd-tete');t.id='hdTitre';t.append(resHisto(x),etqHisto(x));
  if(x.abandon||x.deckVide)t.append(el('span','hd-ment',x.abandon?(x.abandon==='adv'?'abandon adverse':'abandon'):'deck vide'));
  t.append(el('span','hd-sp'),el('span','hd-date',dateOk(x.date)?dateH(x.date)+' - '+heureH(x.date):'-'),verHisto(x));d.append(t);
  /* Face a face : moi | score | adversaire */
  const ff=el('div','hd-ff'),g=el('div','hd-j g'),c=el('div','hd-s'),dr=el('div','hd-j d');
  const moi=el('span','hl-adv');
  if(x.classe&&Number.isFinite(x.classe.elo))moi.append(el('span','hl-elo',String(Math.round(x.classe.elo+(+x.classe.delta||0)))));
  moi.append(el('b','hd-moi',ps),avHisto(ps,elsDeckH(x)));
  g.append(moi,pictosH(elsDeckH(x)),el('span','hd-dn',nomDeckH(x.deck)));
  c.append(scoreHisto(x,'hd-sc'));const dl=deltaHisto(x);if(dl)c.append(dl);
  if(x.deckAdv&&typeof x.deckAdv.nom==='string')dr.append(el('span','hd-dn',x.deckAdv.nom),pictosH(x.deckAdv.els));
  dr.append(advHisto(x,true));
  ff.append(g,c,dr);d.append(ff);
  if(Array.isArray(x.manches)){
    d.append(manchesHisto(x,ps,lui,moiN));
    d.append(mvpDetail(x));
    const bl=bilanHisto(x,ps,lui,moiN,golem);if(bl)d.append(bl.el);
    if(bl&&bl.plus){const b=el('button','sc-btn sc-tertiaire hd-tout','Voir tout le bilan');b.type='button';b.setAttribute('aria-expanded','false');
      b.onclick=()=>{const o=b.getAttribute('aria-expanded')!=='true';b.setAttribute('aria-expanded',String(o));b.textContent=o?'Réduire le bilan':'Voir tout le bilan';const n=bilanHisto(x,ps,lui,moiN,golem,o);bl.el.replaceWith(n.el);bl.el=n.el};
      d.append(b)}
  }else{
    /* Ancienne entree : texte brut, Toi remplace par le pseudo, lignes a zero retirees. */
    const u=el('ul','hd-ancien');(Array.isArray(x.detail)?x.detail:[]).filter(s=>!/infligés 0, subis 0, morts causées 0, morts subies 0/.test(s)).forEach(s=>u.append(el('li','',String(s).replace(/\bToi\b/g,ps).trim())));d.append(u);
  }
  /* Actions : Replay | Partager le resume | Copier les donnees | Fermer */
  const z=el('div','sc-fen-actions hd-act'),esc=e=>{if(e.key==='Escape')ferme()},ferme=()=>{v.remove();removeEventListener('keydown',esc)};
  const bt=(txt,cl)=>{const b=el('button','sc-btn'+(cl?' '+cl:''),txt);b.type='button';z.append(b);return b};
  const ok=rejeuPossible(x.rejeu),q=bt('','hd-rj');q.append(el('span','hd-rj-i','▶'),'Replay');
  if(ok)q.onclick=()=>{ferme();lanceRejeu(x)};else{q.disabled=true;q.title=x.rejeu?'Replay impossible : partie d\'une ancienne version, plus relisible.':'Replay impossible : partie enregistrée sans ses journaux.'}
  const sh=bt('Partager le résumé','sc-secondaire');sh.id='partageHisto';sh.onclick=()=>partageFin(sh,texteHisto(x));
  /* Copier les donnees : meme format que l'ancien bouton de fin de partie (donneesHisto). Calcul lance a l'ouverture : la copie reste dans le clic. Repli : zone de texte. */
  const cd=bt('Copier les données','sc-secondaire'),msg=el('div','hd-msg'),rp=el('textarea','r-repli');
  cd.id='copieDonneesHisto';msg.hidden=rp.hidden=true;msg.setAttribute('role','status');rp.readOnly=true;rp.setAttribute('aria-label','Données à copier');
  let pret=null;const dh=donneesHisto(x).then(o=>pret=o);
  const copieD=o=>{copie(o.txt,cd,'Copier les données',()=>{rp.value=o.txt;rp.hidden=false;rp.focus();rp.select()});
    if(o.brut){alerteInfo(msg,'Copie : données brutes de la partie copiées ('+o.brut+'). Colle-les à KaTarN (Romain).');msg.hidden=false}};
  cd.onclick=()=>{if(pret)copieD(pret);else dh.then(copieD)};
  const f=bt('Fermer','sc-secondaire fermer');f.onclick=ferme;
  v.onclick=e=>{if(e.target===v)ferme()};addEventListener('keydown',esc);
  d.append(z,msg,rp);v.append(d);document.body.append(v);f.focus({preventScroll:true});
}
/* Manches en tuiles : terrains, points, gagnant et Forces (si la partie les porte), sinon les lignes enregistrees. */
function manchesHisto(x,ps,lui,moiN){
  const z=el('div','hd-man'),nm=k=>k===0?ps:lui,cote=n=>moiN(n)?'hd-moi':'hd-lui';
  x.manches.forEach((txt,i)=>{
    const tu=el('div','hd-mt'),h=el('div','hd-mh'),T=Array.isArray(x.terrains)&&Array.isArray(x.terrains[i])?x.terrains[i]:null;
    h.append(el('i','','Manche '+(i+1)),el('span','hd-sp'));
    if(T){
      const pt=[0,0];T.forEach(y=>{if(y.g===0||y.g===1)pt[y.g]+=+y.pts||0});
      const gg=pt[0]===pt[1]?null:pt[0]>pt[1]?0:1;tu.classList.add(gg===null?'hd-nul':gg?'hd-lui':'hd-moi');
      if(gg!==null)h.append(el('b',gg?'hd-lui':'hd-moi',nm(gg)));h.append(el('span','hd-mp',pt[0]+' - '+pt[1]));tu.append(h);
      T.forEach(y=>{const r=el('div','hd-tr');r.append(el('span','hd-tn',String(y.nom||'')),el('span','hd-tp',(+y.pts||0)+' pt'+((+y.pts||0)>1?'s':'')));
        const w=y.g===0||y.g===1?el('b',y.g?'hd-lui':'hd-moi',nm(y.g)):el('b','hd-nul','-');w.title=w.textContent;r.append(w);
        r.append(el('span','hd-tf',Array.isArray(y.f)?y.f[0]+' - '+y.f[1]:''));tu.append(r)});
    }else{
      const pts={},lg=[];String(txt).split(', ').forEach(s=>{const m=s.match(/^(.*) : (.*?) ?\+(\d+)$/);if(m){const n=m[1]==='Toi'?ps:m[1];pts[n]=(pts[n]||0)+ +m[3];lg.push([m[2]?m[2].charAt(0).toUpperCase()+m[2].slice(1):m[2],+m[3],n])}});
      const top=Object.keys(pts).sort((a,b)=>pts[b]-pts[a]),gn=top.length&&(top.length<2||pts[top[0]]>pts[top[1]])?top[0]:null;
      tu.classList.add(gn?cote(gn):'hd-nul');if(gn)h.append(el('b',cote(gn),gn+' +'+pts[gn]));tu.append(h);
      if(!lg.length)tu.append(el('div','hd-tr hd-rien','Aucun terrain gagné'));
      lg.forEach(([t,p,n])=>{const r=el('div','hd-tr');r.append(el('span','hd-tn',t||'-'),el('span','hd-tp',p+' pt'+(p>1?'s':'')));const w=el('b',cote(n),n);w.title=n;r.append(w,el('span','hd-tf',''));tu.append(r)});
    }
    z.append(tu)});
  return z;
}
/* MVP du detail : nom colore (★ si evolution), puis le calcul du score, picto bouclier devant « Force » (audit 34, J17). */
function mvpDetail(x){
  const p=el('p','hd-mvp');if(!x.mvp){p.append(el('span','hl-mvpe','MVP'),' Aucun');return p}
  p.append(mvpHisto(x.mvp));
  const q=(x.mvpLigne||'').match(/score .*/);
  if(q){const s=el('span','hd-mvps'),i=q[0].indexOf('Force');
    if(i<0)s.textContent=q[0];else{const f=ico('force');f.classList.add('hd-force');s.append(q[0].slice(0,i),f,q[0].slice(i))}
    p.append(s)}
  return p;
}
/* Bilan face a face : moi a gauche, l'adversaire en miroir a droite. Replie : 3 cartes (degats infliges puis morts causees, MVP toujours dedans).
   Deplie : toutes les cartes, chaque animal sous son maitre. */
function bilanHisto(x,ps,lui,moiN,golem,tout){
  const B=Array.isArray(x.bilan)?x.bilan:[];if(!B.length)return null;
  const Jm=B.find(J=>moiN(J.nom))||B[0],Jl=B.find(J=>J!==Jm)||null;let plus=false;
  const lignes=J=>{
    const R=(J&&J.cartes||[]).filter(c=>c.slice(1,5).some(n=>+n));
    if(!tout){const G=R.filter(r=>!(carteDe(r[0])||{}).animal).sort((a,b)=>b[1]-a[1]||b[3]-a[3]);let t=G.slice(0,3);const m=G.find(r=>r[0]===x.mvp);
      if(m&&!t.includes(m))t=[t[0],t[1],m];if(R.length>t.length)plus=true;return t}
    const ani=R.filter(r=>(carteDe(r[0])||{}).animal),res=R.filter(r=>!ani.includes(r));
    ani.forEach(a=>{const C=carteDe(a[0]),mt=a[5]||(C&&C.maitre&&M0.CARTES[C.maitre]?M0.CARTES[C.maitre].nom:null);
      const k=res.findIndex(r=>{const D=carteDe(r[0]);return r[0]===mt||(D&&(D.nom===mt||(D.base&&M0.CARTES[D.base].nom===mt)))});
      a=a.slice();a.sous=k>=0;if(k>=0)res.splice(k+1,0,a);else res.push(a)});
    return res};
  const nomC=(r,droite)=>{const C=carteDe(r[0]),td=el('td','hd-cc'),n=el('span','hd-cn'+(C&&C.base?' evo':C&&C.animal?' ani':''),C?C.nom:String(r[0]));n.title=n.textContent;
    const p=C?pictosH(C.el&&C.el.length?C.el:[elCarte(C)]):el('span');if(droite)td.append(n,p);else td.append(p,n);return td};
  const H=['Infligés','Subis','Morts causées','Morts subies'];
  const table=(R,droite)=>{const t=el('table','hd-tab'+(droite?' d':'')),cg=el('colgroup'),tr=el('tr');
    for(let k=0;k<5;k++){const c=el('col');if(k===(droite?4:0))c.className='c1';cg.append(c)}t.append(cg);
    const ent=droite?H.slice().reverse().concat('Carte'):['Carte'].concat(H);ent.forEach(y=>tr.append(el('th','',y)));t.append(tr);
    R.forEach(r=>{const l=el('tr',r.sous?'sous':''),v=r.slice(1,5).map(n=>el('td',+n?'':'z',String(+n||0)));
      if(droite){v.reverse().forEach(y=>l.append(y));l.append(nomC(r,1))}else{l.append(nomC(r,0));v.forEach(y=>l.append(y))}t.append(l)});
    return t};
  const tete=(nom,cl,deck,els,droite)=>{const h=el('div','hd-bt '+(droite?'d':'g')),b=el('b',cl,nom),p=pictosH(els),n=el('span','hd-dn',deck||'');
    if(droite)h.append(n,p,b);else h.append(b,p,n);return h};
  const w=el('div','hd-bil'),sg=el('div','hd-side g'),sd=el('div','hd-side d');
  sg.append(tete(ps,'hd-moi',nomDeckH(x.deck),elsDeckH(x),0),table(lignes(Jm),0));
  if(Jl)sd.append(tete(golem?'Golem':Jl.nom,'hd-lui',x.deckAdv&&x.deckAdv.nom,x.deckAdv&&x.deckAdv.els,1),table(lignes(Jl),1));
  w.append(sg,el('div','hd-axe'),sd);
  return {el:w,plus:plus||!!tout};
}
/* Rejeu : la partie est recalculee coup par coup depuis la graine, les decks et les deux journaux, sans reseau. */
function ordreRejeu(R,j){
  const s=M.nouvelle(R.graine,R.decks),i=[0,0],seq=[];let avance=true;
  while(avance){avance=false;for(const p of M.attendus(s))if(i[p]<j[p].length){M.applique(s,p,M.decode(j[p][i[p]]));seq.push(p);i[p]++;avance=true}
    /* 0.2.2 : abandon hors tour, comme dans M.rejoue (absent des anciens journaux) */
    if(!avance&&!s.fin)for(const p of [0,1])if(!s.fin&&j[p][i[p]]==='a'){M.applique(s,p,{t:'a'});seq.push(p);i[p]++;avance=true}}
  return seq;
}
async function lanceRejeu(x,confirme){
  const R=x.rejeu,err=t=>{onglet('historique');alerte('histoAlerte',t);$('histoAlerte').scrollIntoView({block:'nearest'})};alerte('histoAlerte','');
  if(r){err('Salon en cours : replay indisponible dans un salon. Quitte le salon d\'abord.');return}
  if(!R){err('Replay impossible : partie enregistrée sans ses journaux. Choisis une autre partie.');return}
  if(!rejeuPossible(R)){err('Replay impossible : partie d\'une ancienne version, plus relisible. Choisis une autre partie.');return}
  /* 0.6 : une partie en cours contre le robot n'est plus supprimee sans confirmation */
  if(!confirme&&partie&&!partie.rejeu&&!partie.tuto&&partie.etat&&!partie.etat.fin){confirmeAbandon('La partie en cours sera perdue.',()=>lanceRejeu(x,true),'Quitter la partie ?','Quitter');return}
  let Mr;try{Mr=await chargeMoteur(R.v)}catch(e){err('Replay impossible : moteur de la version '+R.v+' introuvable. Recharge la page puis réessaie.');return}
  if(partie)finPartie();
  M=Mr;
  /* 0.6 : decks normalises une seule fois, la meme liste sert au calcul de l'ordre et au lancement */
  const decks=Array.isArray(R.decks)?R.decks:['',''],Rn=decks===R.decks?R:Object.assign({},R,{decks});
  let j,seq;try{j=R.j.map(M.litJournal);seq=ordreRejeu(Rn,j)}catch(e){M=M0;err('Replay impossible : partie illisible. Choisis une autre partie.');return}
  onglet('jouer');
  lancer(R.graine,R.moi===1?1:0,'',{mien:[],sien:[],decks,advNom:x.advNom||String(x.adv||'Adversaire'),local:true,
    rejeu:{seq,j,pos:0,n:[0,0],lecture:true,vitesse:1}});
  barreRejeu();pasRejeu();
}
function barreRejeu(){
  let b=$('barreRejeu');if(!b){b=el('div','barreRejeu');b.id='barreRejeu';b.setAttribute('role','toolbar');b.setAttribute('aria-label','Replay');document.body.append(b)}
  const R=partie&&partie.rejeu;if(!R){b.remove();return}
  b.textContent='';
  const bt=(t,f,lib)=>{const q=el('button','btn sec',t);q.type='button';if(lib)q.setAttribute('aria-label',lib);q.onclick=f;b.append(q);return q};
  b.append(el('b','','Replay'),el('span','r-pos',R.pos+' / '+R.seq.length));
  bt(R.lecture?'Pause':'Lecture',()=>{R.lecture=!R.lecture;if(R.lecture&&R.pos>=R.seq.length)return relanceRejeu();barreRejeu();pasRejeu()});
  const vt=bt('',()=>{R.vitesse=R.vitesse===1?2:R.vitesse===2?4:1;barreRejeu();pasRejeu()},'Changer la vitesse');vt.append(el('span','r-long','Vitesse '),'x'+R.vitesse);
  bt('Quitter',finRejeu,'Quitter le replay');
  /* Ordinateur : sous la zone d'apercu, dans la colonne du joueur ; ailleurs, barre flottante en bas. */
  const po=ZONE.matches&&document.querySelector('#partie .p-poste:has(.p-apercu)');
  if(po){if(b.parentNode!==po)po.append(b);b.classList.add('dansPoste')}else{if(b.parentNode!==document.body)document.body.append(b);b.classList.remove('dansPoste')}
}
function relanceRejeu(){const R=partie.rejeu;const h={rejeu:{v:M.VERSION,graine:partie.graine,moi:partie.moi,decks:partie.decks,j:R.j.map(M.ecritJournal)},advNom:partie.advNom};lanceRejeu(h)}
function pasRejeu(){
  clearTimeout(rejeuT);rejeuT=0;
  const R=partie&&partie.rejeu;if(!R)return;
  if(!R.lecture||R.pos>=R.seq.length){if(R.pos>=R.seq.length)R.lecture=false;barreRejeu();return}
  rejeuT=setTimeout(()=>{
    if(!partie||partie.rejeu!==R)return;
    if(!$('recap').hidden){const c=$('continuer');if(c)c.click();pasRejeu();return}
    if(desActif||animCours){pasRejeu();return}
    const p=R.seq[R.pos],c=R.j[p][R.n[p]];R.n[p]++;R.pos++;
    (p===partie.moi?partie.mien:partie.sien).push(c);calcule();barreRejeu();pasRejeu();
  },(!$('recap').hidden?2500:900)/R.vitesse);
}
function finRejeu(){clearTimeout(rejeuT);rejeuT=0;finPartie();const b=$('barreRejeu');if(b)b.remove();$('accueil').hidden=false;onglet('historique')}
window.__golemsRejeu=()=>partie&&partie.rejeu?{pos:partie.rejeu.pos,total:partie.rejeu.seq.length,fin:!!(partie.etat&&partie.etat.fin)}:null;
/* Confirmations au modele de la deconnexion (commun/alertes.js, confirmeFen) : titre en question, phrase, [Action] [Annuler]. */
function confirmeAbandon(msg,oui,titre,bouton){confirmeFen({titre:titre||'Abandonner la partie ?',texte:msg,action:bouton||'Abandonner'}).then(v=>{if(v)oui()})}
function confirmePage(box,titre,oui,texte,bouton){confirmeFen({titre,texte,action:bouton||'Supprimer'}).then(v=>{if(v)oui()})}
/* ----- Liste : filtres (selecteur sc-sel), lignes, pagination a place fixe en bas a droite.
   Grand ecran : le bloc descend jusqu'au bas de l'ecran, autant de lignes qu'il en tient (14 au plus) ; telephone : 14 par page. */
const PAS_HISTO=50;
const FILTRES_H=[['toutes','Toutes',()=>true],['victoires','Victoires',x=>x.res==='Victoire'],['defaites','Défaites',x=>x.res==='Défaite'],
  ['classees','Classées',x=>modeHisto(x)==='classee'],['amicales','Amicales',x=>modeHisto(x)==='amicale'],['entrainement','Entraînement',x=>modeHisto(x)==='entrainement']];
const VIDE_H={toutes:'Aucune partie pour l’instant',victoires:'Aucune victoire pour l’instant',defaites:'Aucune défaite pour l’instant',
  classees:'Aucune partie classée pour l’instant',amicales:'Aucune partie amicale pour l’instant',entrainement:'Aucun entraînement pour l’instant'};
function ligneHisto(x){
  const li=el('li','hl-l '+resCl(x));li.tabIndex=0;li.setAttribute('role','button');
  const e=elsDeckH(x).filter(y=>H_ELS.test(y));
  if(e.length){const cm=(c,a)=>'color-mix(in srgb,var(--fm-'+c+') '+a+'%,transparent)';li.style.background='linear-gradient(90deg,'+cm(e[0],30)+' 0%,'+cm(e[1]||e[0],14)+' 20%,transparent 40%),var(--panneau2)'}
  const dk=el('span','hl-deck'),dn=el('span','hl-dn',nomDeckH(x.deck));dn.title=dn.textContent;dk.append(pictosH(e),dn);
  const sc=el('span','hl-scz');sc.append(scoreHisto(x));const dl=deltaHisto(x);if(dl)sc.append(dl);
  const dt=el('span','hl-date',dateH(x.date));if(dateOk(x.date))dt.append(el('small','',heureH(x.date)));
  const res=resHisto(x);if(x.abandon||x.deckVide)res.title=x.res+(x.abandon?' (abandon)':' (deck vide)');
  li.append(res,etqHisto(x),dk,el('span','hl-vs','contre'),advHisto(x),sc,mvpHisto(x.mvp),dt,verHisto(x),el('span','hl-fl','›'));
  li.lastChild.setAttribute('aria-hidden','true');
  li.setAttribute('aria-label',x.res+' contre '+advAff(x.adv)+', '+String(x.score||'-')+', '+dateH(x.date));
  li.onclick=()=>detailHisto(x);li.onkeydown=ev=>{if(ev.key==='Enter'||ev.key===' '){ev.preventDefault();detailHisto(x)}};
  return li;
}
function peintHisto(){
  const sec=$('historique'),b=$('histo'),tout=lesParties(),F=FILTRES_H.find(f=>f[0]===filtreHisto)||FILTRES_H[0],l=tout.filter(F[2]);
  /* Filtres : un seul selecteur, nombre de parties de chaque filtre */
  const fz=$('hFiltres');fz.textContent='';
  FILTRES_H.forEach(([k,lib,f])=>{const q=el('button','',lib);q.type='button';q.setAttribute('aria-pressed',String(k===F[0]));q.append(el('i','',String(tout.filter(f).length)));
    q.onclick=()=>{if(filtreHisto===k)return;filtreHisto=k;pageHisto=0;peintHisto()};fz.append(q)});
  const z=sec.querySelector('.h-pied .nv-pages');
  if(!z.dataset.pret){z.dataset.pret='1';z.querySelector('.nv-prec').onclick=()=>{pageHisto--;peintHisto()};z.querySelector('.nv-suiv').onclick=()=>{pageHisto++;peintHisto()}}
  b.textContent='';
  const grand=innerWidth>=700&&!document.fullscreenElement,bloc=sec.querySelector('.h-bloc');
  if(grand){const m=document.querySelector('main'),pb=m?parseFloat(getComputedStyle(m).paddingBottom)||0:0;
    bloc.style.height=Math.max(360,Math.floor(innerHeight-(bloc.getBoundingClientRect().top+scrollY)-pb))+'px'}else bloc.style.height='';
  z.style.visibility='hidden';
  if(!l.length){const v=el('div','h-vide');v.append(el('b','',VIDE_H[F[0]]));b.append(v);return}
  const ul=el('ul','h-grille hl-liste');b.append(ul);
  if(grand){ul.append(ligneHisto(l[0]));const h=ul.firstChild.getBoundingClientRect().height,gap=parseFloat(getComputedStyle(ul).rowGap)||0;
    lignesPage=Math.max(2,Math.min(14,Math.floor((ul.getBoundingClientRect().height+gap)/(h+gap))));ul.textContent=''}
  else lignesPage=14;
  const nb=Math.ceil(l.length/lignesPage);pageHisto=Math.max(0,Math.min(pageHisto,nb-1));
  l.slice(pageHisto*lignesPage,(pageHisto+1)*lignesPage).forEach(x=>ul.append(ligneHisto(x)));
  z.style.visibility=nb<2?'hidden':'';z.querySelector('.nv-num').textContent=(pageHisto+1)+' / '+nb;
  z.querySelector('.nv-prec').disabled=pageHisto===0;z.querySelector('.nv-suiv').disabled=pageHisto>=nb-1;
}
