// Decks conseilles et deck par defaut valides selon toutes les regles du site (0.7). Node : node tests/test_decks.js
const M=require('../moteur.js'),assert=require('assert');
require('../cartes/donnees/interface.js');
const L=globalThis.GolemsDonnees.interface.decksConseilles;
let nv=0;const ok=(c,m)=>{assert(c,m);nv++};
const verifie=(nom,o)=>{
  const n=Object.values(o).reduce((a,b)=>a+b,0);
  ok(n===M.DECK_MAX,nom+' : '+n+' cartes au lieu de '+M.DECK_MAX);
  ok(!M.erreurDeck(o),nom+' : '+M.erreurDeck(o));
  ok(!M.erreurElements(o),nom+' : '+M.erreurElements(o));
  ok(!M.erreurEvolutions(o),nom+' : '+M.erreurEvolutions(o));
  for(const k in o){ok(M.TYPES.includes(k),nom+' : carte inconnue '+k);ok(Number.isInteger(o[k])&&o[k]>0,nom+' : nombre invalide pour '+k);
    ok(M.CARTES[k].nom!=='Cyd',nom+' : Cyd interdit')}
  ok(M.lisDeck(M.deckTexte(o))!==null,nom+' : texte du deck illisible');
};
ok(Array.isArray(L)&&L.length>=6,'decks conseilles absents');
L.forEach(d=>verifie(d.nom,d.cartes));
verifie('deck par defaut',M.DECK_DEFAUT);
ok(M.TAILLE_DECK===M.DECK_MAX,'TAILLE_DECK');
console.log('Decks OK : '+nv+' verifications ('+L.length+' decks conseilles et le deck par defaut).');
