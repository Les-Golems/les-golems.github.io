/* Onglet Guides : blocs video (lecteur YouTube au clic), resume de deck. */
/* Guides (0.5) : un bloc par video, le plus recent en tete. GUIDES vide = onglet cache.
   yt : identifiant YouTube ; titre (YouTube), auteur (pseudo de ses codes de deck) et date de publication (heure de Paris) releves a la main : aucune requete a YouTube au chargement ; decks : liens ?deck= du site (nom et nombre de cartes affiches a cote du bouton) ; pas de notes d'auteur (decision de Romain). */
const GUIDES=[ /* guides de Bellock (accord du 7 nov. 2026) ; liste vide = onglet cache */
 {titre:'Meule-Contrôle',auteur:'Bellock',date:'7 nov. 2026',yt:'l8-g9rcBFnI',
  decks:[{nom:'Meule/Contrôle',lien:'https://les-golems.github.io/?deck=GOL2-KgswBsyDwALAAAAATWV1bGUvQ29udHLDtGxlCkJlbGxvY2s'}]},
 {titre:'Q-Bellock & Loxim Contrôle',auteur:'Bellock',date:'7 nov. 2026',yt:'G6EM_E0vT4w',
  decks:[{nom:'Q Bellock & Loxim',lien:'https://les-golems.github.io/?deck=GOL2-KmagBgiACRSoAgAAUSBCZWxsb2NrICYgTG94aW0KQmVsbG9jaw'}]},
 {titre:'Apo/Cyrdan Roche/Cristal',auteur:'Bellock',date:'7 nov. 2026',yt:'u9amOoOXy1A',
  decks:[{nom:'Apo/Cyrdan Comeback',lien:'https://les-golems.github.io/?deck=GOL2-KgMPA8ADDAgAMMABQXBvL0N5cmRhbiBDb21lYmFjawpCZWxsb2Nr'}]},
 {titre:'FORGE !',auteur:'Bellock',date:'6 nov. 2026',yt:'fXJVQ7yxy6w',
  decks:[{onglet:'30 cartes',nom:'Deck Forge expérimental',lien:'https://les-golems.github.io/?deck=GOL2-KgMAw8DDzAAA8AAARGVjayBGb3JnZSBleHDDqXJpbWVudGFsCkJlbGxvY2s'},
         {onglet:'24 cartes',nom:'Forge NoPioche',lien:'https://les-golems.github.io/?deck=GOL2-KgMAAMwDzAAA8AAARm9yZ2UgTm9QaW9jaGUKQmVsbG9jaw'}]},
 {titre:'Bellock Loxim',auteur:'Bellock',date:'6 nov. 2026',yt:'4fw5nB_H-2g',
  decks:[{nom:'Bellock & Loxim',lien:'https://les-golems.github.io/?deck=GOL2-KgcwCgCACAD8MwAAQmVsbG9jayAmIExveGltCkJlbGxvY2s'}]},
 {titre:'Brume Cristal',auteur:'Bellock',date:'6 nov. 2026',yt:'J_famvZzFng',
  decks:[{nom:'Big Roche/Cristal',lien:'https://les-golems.github.io/?deck=GOL2-KgMPAwC8BAwAIMABQmlnIFJvY2hlL0NyaXN0YWwKQmVsbG9jaw'}]},
 {titre:'Spom Électrique !!! Le deck régulier',auteur:'Bellock',date:'6 nov. 2026',yt:'biR_tFUhM1k',
  decks:[{nom:'26 Foudre et 4 Apo',lien:'https://les-golems.github.io/?deck=GOL2-KgcAD4DCvAIAMAAAMjYgRm91ZHJlIGV0IDQgQXBvCkJlbGxvY2s'}]}
];
const GD={page:0,fait:false,par:6};
const SVG_LECTURE='<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M7 4.5v15l12-7.5z"/></svg>';
/* Lecteur YouTube (nocookie) charge au clic seulement ; en quittant l'onglet ou la page, retour a la miniature (la video s'arrete). */
function gdMiniature(z,g){
  z.replaceChildren();const i=document.createElement('img');i.src='https://i.ytimg.com/vi/'+g.yt+'/hqdefault.jpg';i.alt='';i.loading='lazy';
  const p=document.createElement('span');p.className='gd-lecture';p.innerHTML=SVG_LECTURE;z.append(i,p);z.dataset.joue='';
}
function gdArrete(){document.querySelectorAll('#gdBlocs .gd-vid[data-joue="1"]').forEach(z=>gdMiniature(z,GUIDES[+z.dataset.i]))}
/* Resume d'un deck, decode depuis son code ?deck= avec les fonctions du site : pictos des elements (nombre de cartes de chacun), total,
   (liste des cartes retiree, decision de Romain). Etiquette v0.5 / v0.4 selon les regles actuelles. */
function gdResume(z,d){
  const mk=(t,c,x)=>{const e=document.createElement(t);if(c)e.className=c;if(x!=null)e.textContent=x;return e};
  const c=(/[?&]deck=([A-Za-z0-9_-]+)/.exec(d.lien)||[])[1]||'',o=litCodeDeck(c);z.replaceChildren();
  if(o.err||!o.cartes){z.append(mk('p','gd-m',o.err||'Deck illisible.'));return}
  const dd={cartes:o.cartes},E=elsOrdre(dd),pe=mk('div','gd-els');
  E.forEach(e=>{const s=mk('span','gd-el');s.title=nomEl(e);s.append(picto(e),mk('b','',String(Object.keys(o.cartes).filter(k=>(M.CARTES[k]?.el||[]).includes(e)).reduce((t,k)=>t+o.cartes[k],0))));pe.append(s)});
  z.append(pe);
  const tot=mk('p','gd-tot',totalDeck(dd)+' cartes');z.append(tot);
  /* Etiquette de version (style du badge de l'en-tete, etq-v) : v0.5 si le deck respecte les regles actuelles, v0.4 sinon (plus de M.ELEM_MAX elements). */
  {const ok=!raisonsDeck(dd).length,v=mk('span','etq-v gd-ver',ok?'v0.5':'v0.4');v.title=ok?'Deck conforme aux règles de la 0.5':'Hors règles de la 0.5 : '+raisonsDeck(dd).map(x=>x.t).join(' ');z.append(v)} /* ligne a part, sous « 30 cartes » */
  return c;
}
function peintGuides(){
  const mk=(t,c,x)=>{const e=document.createElement(t);if(c)e.className=c;if(x!=null)e.textContent=x;return e};
  const N=$('gdBlocs');
  if(!GD.fait){GD.fait=true;
    /* 0.5 (Romain) : guides dont un deck est valide (v0.5) d'abord, puis les autres (v0.4) ; ordre de GUIDES (recent en tete) garde dans chaque groupe.
       Onglet ouvert par defaut : le premier deck valide. Calcule a partir de raisonsDeck, rien de fige. */
    const gdOk=d=>{const o=litCodeDeck((/[?&]deck=([A-Za-z0-9_-]+)/.exec(d.lien)||[])[1]||'');return !!(o&&o.cartes&&!o.err&&!raisonsDeck({cartes:o.cartes}).length)};
    const ordre=GUIDES.map((g,i)=>({g,i,ok:(g.decks||[]).map(gdOk)})).sort((x,y)=>(y.ok.includes(true)-x.ok.includes(true))||x.i-y.i);
    ordre.forEach(({g,i,ok})=>{const j0=Math.max(0,ok.indexOf(true));const a=mk('article','note gd-bloc'),h=mk('h3','',g.titre),pa=mk('p','gd-par','par '+g.auteur);
      if(g.date){pa.append(' - ');pa.append(mk('time','',g.date))}
      const z=mk('button','gd-vid');z.type='button';z.dataset.i=i;z.setAttribute('aria-label','Lire la vidéo « '+g.titre+' »');gdMiniature(z,g);
      z.onclick=()=>{if(z.dataset.joue==='1')return;gdArrete();const f=document.createElement('iframe');
        f.src='https://www.youtube-nocookie.com/embed/'+g.yt+'?autoplay=1&rel=0';f.title=g.titre;f.allow='autoplay; encrypted-media; picture-in-picture; fullscreen';f.allowFullscreen=true;
        z.replaceChildren(f);z.dataset.joue='1'};
      const D=g.decks||[],cote=mk('div','gd-cote'),res=mk('div','gd-res'),imp=mk('button','btn','Importer le deck'),nm=null;imp.type='button';
      let code='';const choisit=j=>{code=gdResume(res,D[j])||'';imp.setAttribute('aria-label','Importer le deck « '+D[j].nom+' »')};
      if(D.length>1){const tl=mk('div','gd-ongl');tl.setAttribute('role','tablist');
        D.forEach((d,j)=>{const b=mk('button','gd-o',d.onglet||d.nom);b.type='button';b.setAttribute('role','tab');b.setAttribute('aria-selected',String(j===j0));
          b.onclick=()=>{tl.querySelectorAll('.gd-o').forEach(x=>x.setAttribute('aria-selected',String(x===b)));choisit(j)};tl.append(b)});cote.append(tl)}
      cote.append(res,imp);
      imp.onclick=()=>ouvreDeckLien(code); /* meme vue que l'ouverture d'un lien ?deck=, sans recharger */
      const y=mk('a','gd-yt','Voir sur YouTube');y.href='https://www.youtube.com/watch?v='+g.yt;y.target='_blank';y.rel='noopener';
      if(D.length)choisit(j0);else imp.hidden=true;
      const co=mk('div','gd-corps');co.append(z,cote,y); /* grille : miniature | colonne droite (hauteur de la miniature), lien sous la miniature */
      a.append(h,pa,co);N.append(a)});
    new MutationObserver(()=>{if($('guides').hidden)gdArrete()}).observe($('guides'),{attributes:true,attributeFilter:['hidden']});
  }
  /* Pagination comme les Nouveautes : 6 blocs par page (grille 3 x 2 des 1200 px, 1 colonne sur telephone), fleches < x / n > a droite de la phrase d'intro, masquees s'il n'y a qu'une page. */
  const B=[...N.children],n=Math.max(1,Math.ceil(B.length/GD.par));GD.page=Math.max(0,Math.min(GD.page,n-1));
  B.forEach((a,i)=>{a.hidden=Math.floor(i/GD.par)!==GD.page});gdArrete();
  let z=document.querySelector('#guides .nv-pages');
  if(!z){z=mk('div','nv-pages haut');z.setAttribute('role','navigation');z.setAttribute('aria-label','Pages des guides');
    const p=mk('button','j-btn nv-prec','<'),s=mk('button','j-btn nv-suiv','>');p.type=s.type='button';
    p.title='Page précédente';s.title='Page suivante';p.setAttribute('aria-label',p.title);s.setAttribute('aria-label',s.title);
    p.onclick=()=>{GD.page--;peintGuides()};s.onclick=()=>{GD.page++;peintGuides()};z.append(p,mk('span','nv-num'),s);
    const i=document.querySelector('#guides>.intro');i.classList.add('va');i.append(z)}
  z.hidden=n<2;z.querySelector('.nv-num').textContent=(GD.page+1)+' / '+n;
  z.querySelector('.nv-prec').disabled=GD.page===0;z.querySelector('.nv-suiv').disabled=GD.page>=n-1;
}
if(GUIDES.length)$('t-guides').hidden=false;else $('t-guides').remove();

