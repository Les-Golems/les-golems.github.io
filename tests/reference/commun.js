// Commun a generer_corpus.js et comparer.js : parties robot contre robot a graines fixes.
/* GOLEMS_MOTEUR=moteurs/moteur-<v>.js : compare le corpus avec un moteur archive (preuve qu'une archive rejoue la version qu'elle gele). */
const M=require(process.env.GOLEMS_MOTEUR?require('path').resolve(__dirname,'../..',process.env.GOLEMS_MOTEUR):'../../moteur.js');
const NIVEAUX=['facile','normal','difficile'],PAR_PAIRE=60,LOT=90;
function lcg(g){return n=>{g=(Math.imul(g,1103515245)+12345)|0;return (g>>>8)%n}}
/* Deck tire a graine fixe, valide selon les regles 0.5 : erreurDeck, elements (4 max), evolutions et animaux avec leur base. */
function deckAleatoire(graine){
  const r=lcg(graine);
  for(let essai=0;essai<500;essai++){
    const tous=[...new Set(M.TYPES.flatMap(id=>M.CARTES[id].el))],E=new Set();
    const nE=2+r(3);while(E.size<Math.min(nE,tous.length))E.add(tous[r(tous.length)]);
    const ok=id=>{const c=M.CARTES[id];return !c.animal&&c.el.every(e=>E.has(e))};
    const bases=M.TYPES.filter(id=>ok(id)&&!M.CARTES[id].base),o={};let n=0;const cible=24+r(7);
    const pool=[...bases];
    while(n<cible&&pool.length){
      const id=pool.splice(r(pool.length),1)[0],v=Math.min(1+r(M.maxEx(id)),cible-n);o[id]=v;n+=v;
      if(!o[id])continue;
      M.TYPES.forEach(t=>{const c=M.CARTES[t];if(c.base===id&&ok(t))pool.push(t);if(c.animal&&c.maitre===id)pool.push(t)});
    }
    if(n<M.DECK_MIN)continue;
    if(M.erreurDeck(o)||M.erreurElements(o)||M.evolutionsSansBase(o).length||M.animauxSansBase(o).length)continue;
    return M.deckTexte(o);
  }
  throw new Error('aucun deck valide pour la graine '+graine);
}
/* Liste fixe des parties du corpus */
function plan(){
  const P=[];let i=0;
  for(const a of NIVEAUX)for(const b of NIVEAUX)for(let k=0;k<PAR_PAIRE;k++,i++){
    const graine=(i*2654435761+7)|0,v=i%4;
    const decks=v===0?['','']:v===1?[M.deckTexte(M.DECK_DEFAUT),M.deckTexte(M.DECK_DEFAUT)]:[deckAleatoire(i*7919+1),v===2?M.deckTexte(M.DECK_DEFAUT):deckAleatoire(i*7919+2)];
    P.push({graine,niveaux:[a,b],decks});
  }
  return P;
}
/* Joue une partie ; renvoie les coups dans l'ordre d'application [joueur, code] */
function joue(q){
  const s=M.nouvelle(q.graine,q.decks),coups=[];let pas=0;
  while(!s.fin){
    if(++pas>5000)throw new Error('blocage graine '+q.graine);
    const att=M.attendus(s);if(!att.length)throw new Error('personne attendu '+q.graine);
    const p=att[0],a=M.robot(s,p,q.niveaux[p]);if(!a)throw new Error('robot sans action '+q.graine);
    M.applique(s,p,a);coups.push([p,M.code(a)]);
  }
  const journaux=[0,1].map(p=>M.ecritJournal(coups.filter(c=>c[0]===p).map(c=>c[1])));
  return {...q,coups,journaux,fin:s.fin,etat:JSON.stringify(s)};
}
module.exports={M,plan,joue,LOT};
