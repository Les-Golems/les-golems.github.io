/* Alertes et confirmations du site (socle 0.6, charte : bandeau sc-alerte, fenetre sc-fenetre). Plus aucun alert()/prompt()/confirm() natif.
   Redaction validee (28 - Alertes, 9 nov. 2026) : « Titre : raison. Action. » ; erreur en rouge (sc-erreur), information en bleu (sc-info).
   alerte(cible,texte,{info,bouton:{texte,action},lignes}) : remplace le contenu de cible (element ou id) par un bandeau ; texte vide = efface. Rend le bandeau.
   alerteInfo(cible,texte,o) : idem en bleu.
   alerteTexte(cible) : texte du bandeau affiche (ou '').
   confirmeFen({titre,texte,action,annuler}) : fenetre de confirmation au modele de la deconnexion (titre en question, phrase, [Action] [Annuler]) ; Promise<boolean>.
   copieManuelle(cible,txt) : presse-papiers refuse : bandeau rouge + champ du texte deja selectionne dessous (remplace l'ancien prompt()). */
function alerte(cible,texte,o){
  o=o||{};const z=typeof cible==='string'?document.getElementById(cible):cible;if(!z)return null;
  z.replaceChildren();if(!texte)return null;
  const a=document.createElement('div');a.className='sc-alerte '+(o.info?'sc-info':'sc-erreur');a.setAttribute('role',o.info?'status':'alert');
  const s=document.createElement('span');s.textContent=texte;a.append(document.createElement('i'),s);
  if(o.bouton){const b=document.createElement('button');b.type='button';b.className='sc-btn sc-tertiaire';b.textContent=o.bouton.texte;b.onclick=o.bouton.action;a.append(b)}
  z.append(a);return a;
}
function alerteInfo(cible,texte,o){return alerte(cible,texte,Object.assign({},o,{info:true}))}
function alerteTexte(cible){const z=typeof cible==='string'?document.getElementById(cible):cible,s=z&&z.querySelector('.sc-alerte>span');return s?s.textContent:''}
function confirmeFen(o){
  return new Promise(fin=>{
    const f=document.createElement('div');f.className='bd-fond';
    const d=document.createElement('div');d.className='sc-fenetre bd-fen';d.setAttribute('role','dialog');d.setAttribute('aria-modal','true');
    const h=document.createElement('h3');h.className='sc-fen-titre';h.textContent=o.titre;h.id='fenConfT'+Date.now();d.setAttribute('aria-labelledby',h.id);
    d.append(h);
    if(o.texte){const p=document.createElement('p');p.className='sc-fen-texte';p.textContent=o.texte;d.append(p)}
    const r=document.createElement('div');r.className='sc-fen-actions';
    const oui=document.createElement('button');oui.type='button';oui.className='sc-btn';oui.textContent=o.action;
    const non=document.createElement('button');non.type='button';non.className='sc-btn sc-secondaire';non.textContent=o.annuler||'Annuler';
    r.append(oui,non);d.append(r);f.append(d);document.body.append(f);
    const ret=document.activeElement;
    const ferme=v=>{f.remove();if(ret&&ret.focus)try{ret.focus()}catch(e){}fin(v)};
    oui.onclick=()=>ferme(true);non.onclick=()=>ferme(false);
    f.onclick=e=>{if(e.target===f)ferme(false)};f.onkeydown=e=>{if(e.key==='Escape')ferme(false)};
    oui.focus();
  });
}
function copieManuelle(cible,txt){
  const a=alerte(cible,'Action impossible : presse-papiers bloqué par le navigateur. Sélectionne le texte et copie-le à la main.');if(!a)return;
  const z=a.parentNode,t=document.createElement('textarea');t.className='sc-copie';t.readOnly=true;t.value=txt;t.rows=Math.min(6,String(txt).split('\n').length+1);
  z.append(t);t.focus();t.select();
}
