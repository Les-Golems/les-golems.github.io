// Aller-retour des codes de cartes 0-251, seuls et en paquet, dans tous les coups qui portent une carte. Usage : node test_encodage.js [moteur]
const M=require(process.argv[2]||'../moteur.js'),A=require('assert');let n=0;
const ok=(a)=>{const c=M.code(a),d=M.decode(c);A.deepStrictEqual(d,a,c);n++;return c};
const anc=[];for(let c=0;c<=251;c++){
  for(const t of 'fcdsj')ok({t,c});
  for(let l=0;l<3;l++)for(let k=0;k<3;k++)ok({t:'p',c,l,k});
  ok({t:'m',c:[c]});ok({t:'b',o:[c]});
  if(c<126)anc.push(M.code({t:'f',c}).slice(1));
}
// paquets de 3 : toutes les combinaisons de tailles (1, 2, 3, 4 caracteres) et voisins
for(let c=0;c<=249;c++){ok({t:'m',c:[c,c+1,c+2]});ok({t:'b',o:[c+2,c,c+1]});ok({t:'m',c:[0,125,c+2].sort((x,y)=>x-y)})}
// anciens codes inchanges caractere pour caractere
const att=c=>c<36?c.toString(36):c<62?String.fromCharCode(29+c):c===62?'_':'~'+att(c-63);
anc.forEach((x,c)=>A.strictEqual(x,att(c)));A.strictEqual(M.code({t:'f',c:125}),'f~_');A.strictEqual(M.code({t:'f',c:126}),'f~~0');A.strictEqual(M.code({t:'f',c:200}),'f~~~b');
A.strictEqual(new Set(Array.from({length:252},(_,c)=>M.code({t:'f',c}))).size,252,'codes uniques');
// deck complet : toutes les cartes actuelles + 200 dans un journal unique
const j=[];for(let c=0;c<=200;c++)j.push(M.code({t:'p',c,l:c%3,k:(c>>2)%3}));
A.deepStrictEqual(M.litJournal(M.ecritJournal(j)).map(M.decode).map(a=>a.c),Array.from({length:201},(_,c)=>c));
for(const x of ['f~','f~~','f~~~~0','p~~00','m~','b~~~~1'])A.throws(()=>M.decode(x),x);
console.log('ENCODAGE OK',n,'allers-retours ; 126 anciens codes identiques ; codes 0-251 uniques');
