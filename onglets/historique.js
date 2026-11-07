/* Onglet Historique : detail d'une partie, rejeu, pagination. */
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
/* MVP : etiquette coloree et nom en gras dans la couleur du premier element de la carte. */
function mvpHisto(nom,ver){
  const z=el('span','h-mvp'),C=nom?Object.values(M0.CARTES).find(c=>M0.nomDetail(c)===nom||c.nom===nom):null;
  z.append(el('span','h-mvp-e','MVP'));
  const n=el('b','h-mvp-n',nom?nomComplet(nom):'-');if(C&&C.el&&C.el[0])n.style.color='var(--'+C.el[0]+')';z.append(n);
  if(ver)z.append(el('span','h-ver',ver));
  return z;
}
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
function detailHisto(x){
  const v=el('div','voile'),d=el('div','boite h-detail'),ps=x.pseudo||pseudo||'Joueur',toi=t=>String(t).replace(/\bToi\b/g,ps);
  v.setAttribute('role','dialog');v.setAttribute('aria-modal','true');v.id='detailHisto';
  const h2=el('h2',x.res==='Victoire'?'h-dv':x.res==='Défaite'?'h-dd':'h-dn');h2.append(el('span','',x.res+(x.abandon?' (abandon)':x.deckVide?' (deck vide)':'')),' ',el('span','h-dsc',x.score));
  d.append(h2,el('p','h-dsub',new Date(x.date).toLocaleString('fr-FR',{dateStyle:'long',timeStyle:'short'})+' contre '+advAff(x.adv)),(()=>{const p=el('p','h-dver','Version du jeu : '),w=versionAff(x);p.append(el('span','etq-v h-dver-v',/^[0-9]/.test(w)?'v'+w:w));return p})());
  const moiN=n=>n===ps;
  if(Array.isArray(x.manches)){
    const u=el('ul','h-man');x.manches.forEach((t,i)=>{
      const li=el('li');li.append(el('span','h-man-n','Manche '+(i+1)));
      const pts={};String(t).split(', ').forEach(s=>{const m=s.match(/^(.*) : (.*?)\+(\d+)$/);if(m)pts[m[1]]=(pts[m[1]]||0)+ +m[3]});
      const top=Object.keys(pts).sort((a,b)=>pts[b]-pts[a]),g=top.length&&(top.length<2||pts[top[0]]>pts[top[1]])?top[0]:null;
      if(g)li.append(el('b','h-man-g '+(moiN(g)?'h-moi':'h-lui'),g+' +'+pts[g]));
      const det=el('span','h-man-d');String(t).split(', ').forEach((s,k)=>{if(k)det.append(', ');const m=s.match(/^(.*) : (.*?)(\+\d+)$/);if(!m){det.append(s);return}det.append(el('span',moiN(m[1])?'h-moi':'h-lui',m[1]),' : '+m[2],el('b','h-pt',m[3]))});
      li.append(det);u.append(li)});
    d.append(el('h3','','Manches'),u);
    d.append(el('h3','','MVP'));
    if(x.mvp){const pm=el('p','h-dmvp'),mz=el('span','h-mvp');mz.append(el('span','h-mvp-e','MVP'),carteHisto(x.mvp));pm.append(mz);const q=(x.mvpLigne||'').match(/score .*/);if(q)pm.append(el('span','h-dmvp-s',q[0]));d.append(pm)}else d.append(el('p','h-dsub','Aucun'));
    d.append(el('h3','','Bilan par carte'));
    (Array.isArray(x.bilan)?x.bilan:[]).forEach(J=>{
      const r=(J.cartes||[]).filter(c=>c.slice(1).some(n=>+n));
      d.append(el('h4',moiN(J.nom)?'h-moi':'h-lui',J.nom));
      if(!r.length){d.append(el('p','h-dsub','Rien à signaler.'));return}
      const t=el('table','h-tab'),cg=el('colgroup');['c','n','n','n','n'].forEach(k=>cg.append(el('col','h-col-'+k)));t.append(cg);
      const h=el('tr');['Carte','Infligés','Subis','Morts causées','Morts subies'].forEach(y=>h.append(el('th','',y)));t.append(h);
      const cl=['','h-chaud','h-froid','h-chaud','h-froid'];
      r.forEach(c=>{const tr=el('tr');c.forEach((y,k)=>{
        if(!k){const td=el('td','h-cn');td.append(carteHisto(y));tr.append(td);return}
        tr.append(el('td',+y?cl[k]:'h-zero',String(y)))});t.append(tr)});d.append(t);
    });
  }else{
    /* Ancienne entree : texte brut, Toi remplace par le pseudo, lignes a zero retirees. */
    const u=el('ul');(Array.isArray(x.detail)?x.detail:[]).filter(t=>!/infligés 0, subis 0, morts causées 0, morts subies 0/.test(t)).forEach(t=>u.append(el('li','',toi(t).trim())));d.append(u);
  }
  const z=el('div','p-btns'),f=el('button','btn plein fermer','Fermer');f.type='button';
  const esc=e=>{if(e.key==='Escape')ferme()},ferme=()=>{v.remove();removeEventListener('keydown',esc)};
  f.onclick=ferme;v.onclick=e=>{if(e.target===v)ferme()};addEventListener('keydown',esc);
  const pile=el('div','p-pile'),sh=el('button','btn sec','Partager le résumé');sh.type='button';sh.id='partageHisto';sh.onclick=()=>partageFin(sh,texteHisto(x));
  if(rejeuPossible(x.rejeu)){const q=el('button','btn','▶ Replay');q.type='button';q.onclick=()=>{ferme();lanceRejeu(x)};pile.append(q)}
  /* Copier les donnees : bouton secondaire comme Partager le resume, meme format que l'ancien bouton de fin de partie (donneesPartie).
     Calcul lance a l'ouverture : la copie reste dans le clic. Repli : zone de texte selectionnee. */
  const cd=el('button','btn sec','Copier les données'),msg=el('p','h-dmsg'),rp=el('textarea','r-repli');
  cd.type='button';cd.id='copieDonneesHisto';msg.hidden=rp.hidden=true;msg.setAttribute('role','status');rp.readOnly=true;rp.setAttribute('aria-label','Données à copier');
  let pret=null;const dh=donneesHisto(x).then(o=>pret=o);
  const copieD=o=>{copie(o.txt,cd,'Copier les données',()=>{rp.value=o.txt;rp.hidden=false;rp.focus();rp.select()});
    if(o.brut){msg.textContent='Replay impossible ('+o.brut+') : données brutes de la partie copiées.';msg.hidden=false}};
  cd.onclick=()=>{if(pret)copieD(pret);else dh.then(copieD)};
  pile.append(sh,cd);z.append(pile,f);d.append(z,msg,rp);v.append(d);document.body.append(v);f.focus();
}
/* Rejeu : la partie est recalculee coup par coup depuis la graine, les decks et les deux journaux, sans reseau. */
let rejeuT=0;
function ordreRejeu(R,j){
  const s=M.nouvelle(R.graine,R.decks),i=[0,0],seq=[];let avance=true;
  while(avance){avance=false;for(const p of M.attendus(s))if(i[p]<j[p].length){M.applique(s,p,M.decode(j[p][i[p]]));seq.push(p);i[p]++;avance=true}
    /* 0.2.2 : abandon hors tour, comme dans M.rejoue (absent des anciens journaux) */
    if(!avance&&!s.fin)for(const p of [0,1])if(!s.fin&&j[p][i[p]]==='a'){M.applique(s,p,{t:'a'});seq.push(p);i[p]++;avance=true}}
  return seq;
}
async function lanceRejeu(x){
  const R=x.rejeu,err=t=>{onglet('historique');alert(t)};
  if(r){err('Quitte le salon avant de regarder un replay.');return}
  if(!R){err('Replay impossible : cette partie a été enregistrée sans ses journaux.');return}
  if(!rejeuPossible(R)){err('Replay impossible : le moteur de la version '+R.v+' n’est pas archivé.');return}
  let Mr;try{Mr=await chargeMoteur(R.v)}catch(e){err('Replay impossible : moteur de la version '+R.v+' introuvable.');return}
  if(partie)finPartie();
  M=Mr;
  let j,seq;try{j=R.j.map(M.litJournal);seq=ordreRejeu(R,j)}catch(e){M=M0;err('Replay impossible : partie illisible.');return}
  onglet('jouer');
  lancer(R.graine,R.moi===1?1:0,'',{mien:[],sien:[],decks:Array.isArray(R.decks)?R.decks:['',''],advNom:x.advNom||String(x.adv||'Adversaire'),local:true,
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
function confirmeAbandon(msg,oui,titre,bouton){
  const v=el('div','voile'),d=el('div','boite'),z=el('div','p-btns ab-btns'),n=el('button','btn danger',bouton||'Abandonner'),a=el('button','btn sec','Annuler');n.type=a.type='button';
  v.setAttribute('role','dialog');v.setAttribute('aria-modal','true');v.setAttribute('aria-labelledby','abTitre');v.id='popAbandon';
  const esc=e=>{if(e.key==='Escape')ferme()},ferme=()=>{v.remove();removeEventListener('keydown',esc)};
  a.onclick=ferme;n.onclick=()=>{ferme();oui()};v.onclick=e=>{if(e.target===v)ferme()};addEventListener('keydown',esc);
  const h=el('h2','',titre||'Abandonner la partie ?');h.id='abTitre';z.append(n,a);d.append(h,el('p','',msg),z);v.append(d);document.body.append(v);a.focus();
}
function confirmePage(box,msg,oui){
  box.textContent='';const n=el('button','btn danger','Confirmer'),a=el('button','btn sec','Annuler');n.type=a.type='button';
  n.onclick=oui;a.onclick=()=>{peintDecks();peintHisto()};
  const z=el('div','p-btns');z.append(n,a);box.append(el('p','o-conf',msg),z);
}
/* 14 parties par page (2 colonnes x 7 sur grand ecran). Pagination des Nouveautes (< 1 / N >) a droite de la phrase d'intro. */
let pageHisto=0,lignesPage=14;
const PAS_HISTO=50;
function peintHisto(){
  const b=$('histo'),l=lesParties();b.textContent='';
  let z=document.querySelector('#historique .nv-pages');
  if(!z){z=el('div','nv-pages haut');z.setAttribute('role','navigation');z.setAttribute('aria-label','Pages de l’historique');
    const p=el('button','j-btn nv-prec','<'),s=el('button','j-btn nv-suiv','>');p.type=s.type='button';
    p.title='Page précédente';s.title='Page suivante';p.setAttribute('aria-label',p.title);s.setAttribute('aria-label',s.title);
    p.onclick=()=>{pageHisto--;peintHisto()};s.onclick=()=>{pageHisto++;peintHisto()};z.append(p,el('span','nv-num'),s);
    const i=document.querySelector('#historique>.intro');i.classList.add('va');i.append(z)}
  z.hidden=true;
  if(!l.length){b.append(el('p','vide','Aucune partie enregistrée.'));return}
  const nb=Math.ceil(l.length/lignesPage);pageHisto=Math.max(0,Math.min(pageHisto,nb-1));
  z.hidden=nb<2;z.querySelector('.nv-num').textContent=(pageHisto+1)+' / '+nb;
  z.querySelector('.nv-prec').disabled=pageHisto===0;z.querySelector('.nv-suiv').disabled=pageHisto>=nb-1;
  const gr=el('div','h-grille'),pageL=l.slice(pageHisto*lignesPage,(pageHisto+1)*lignesPage);
  /* Niveau du Golem : le mot Golem prend la couleur du niveau (memes couleurs que le filtre Adversaires des Statistiques), legende au-dessus. */
  const nivG=a=>{const m=/^Golem \((facile|normal|difficile)\)$/i.exec(a||'');return m?NIV_ORDI.find(n=>n[0]===m[1].toLowerCase()):null};
  const NIV_LB={facile:'Facile',normal:'Normal',difficile:'Difficile'};
  if(pageL.some(x=>nivG(x.adv))){const lg=el('p','h-leg');lg.append(el('span','','Niveau des Golems :'));NIV_ORDI.forEach(([k,c])=>{const q=el('b','',NIV_LB[k]);q.style.color=c;lg.append(q)});b.append(lg)}
  b.append(gr);
  pageL.forEach(x=>{
    const c=el('div','h-carte '+(x.res==='Victoire'?'h-v':x.res==='Défaite'?'h-d':'h-n'));c.tabIndex=0;c.setAttribute('role','button');
    c.onkeydown=e=>{if(e.target===c&&(e.key==='Enter'||e.key===' ')){e.preventDefault();detailHisto(x)}};
    const l1=el('span','h-l1');const vh=versionAff(x),nv=nivG(x.adv),ha=el('span','h-adv','contre '+(nv?'':advAff(x.adv)));
    if(nv){const q=el('span','niv','Golem');q.style.color=nv[1];ha.append(q);ha.title='Golem, niveau '+NIV_LB[nv[0]];ha.setAttribute('aria-label','contre Golem, niveau '+NIV_LB[nv[0]])}
    l1.append(el('span','h-date',new Date(x.date).toLocaleDateString('fr-FR',{dateStyle:'short'})),ha,el('span','h-sc',x.score),el('span','h-ver h-ver-l etq-v',/^[0-9]/.test(vh)?'v'+vh:vh));
    /* Elements du deck joue (paquet de test : ses elements). */
    const pe=el('span','h-els');(x.deck&&x.deck.nom==='Test'&&!x.deck.cartes?elsTexte(deckDefautTxt(vPartie(x))):(x.deck&&Array.isArray(x.deck.els)?x.deck.els:[])).filter(y=>/^(magma|cristal|foudre|brume|roche)$/.test(y)).forEach(y=>pe.append(picto(y)));
    const rj=el('button','h-rj'),ok=rejeuPossible(x.rejeu);rj.type='button';rj.append(el('span','h-rj-i','▶'),'Replay');
    rj.setAttribute('aria-label',ok?'Replay de cette partie':'Replay indisponible');rj.title=ok?'Replay':x.rejeu?'Replay indisponible : moteur de la version '+x.rejeu.v+' non archivé':'Replay indisponible : partie enregistrée sans ses journaux';
    if(!ok)rj.setAttribute('aria-disabled','true');
    rj.onclick=e=>{e.stopPropagation();if(ok)lanceRejeu(x)};
    const rs=el('b','h-res',x.res+(x.abandon?" (abandon)":x.deckVide?" (deck vide)":""));if(x.abandon||x.deckVide)rs.classList.add('h-res-ab');
    const bd=bandeauDeck(x.deck);bd.title=bd.textContent;
    c.append(l1,rj,rs,mvpHisto(x.mvp,''),pe,bd);
    c.onclick=()=>detailHisto(x);gr.append(c);
  });
}
