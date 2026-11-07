// Genere le corpus de reference. Usage : node tests/reference/generer_corpus.js
const fs=require('fs'),path=require('path'),zlib=require('zlib'),{M,plan,joue,LOT}=require('./commun.js');
const dir=path.join(__dirname,'corpus');fs.mkdirSync(dir,{recursive:true});
fs.readdirSync(dir).forEach(f=>fs.unlinkSync(path.join(dir,f)));
const t0=Date.now(),P=plan();
for(let l=0;l*LOT<P.length;l++){
  const lot=P.slice(l*LOT,(l+1)*LOT).map(joue);
  fs.writeFileSync(path.join(dir,'lot'+String(l).padStart(2,'0')+'.json.gz'),zlib.gzipSync(JSON.stringify({version:M.VERSION,parties:lot}),{level:9}));
}
console.log(P.length+' parties, '+((Date.now()-t0)/1000).toFixed(1)+' s');
