// Compare le moteur courant au corpus. Usage : node tests/reference/comparer.js
const fs=require('fs'),path=require('path'),zlib=require('zlib'),{M,joue}=require('./commun.js');
const dir=path.join(__dirname,'corpus'),t0=Date.now(),ecarts=[];let n=0;
for(const f of fs.readdirSync(dir).filter(f=>f.endsWith('.json.gz')).sort()){
  const {parties}=JSON.parse(zlib.gunzipSync(fs.readFileSync(path.join(dir,f))));
  for(const ref of parties){n++;
    const id='graine '+ref.graine+' ('+ref.niveaux.join('/')+', '+f+')';
    let cur;try{cur=joue({graine:ref.graine,niveaux:ref.niveaux,decks:ref.decks})}catch(e){ecarts.push(id+' : erreur '+e.message);continue}
    const k=ref.coups.findIndex((c,i)=>!cur.coups[i]||cur.coups[i][0]!==c[0]||cur.coups[i][1]!==c[1]);
    if(k>=0||cur.coups.length!==ref.coups.length){const i=k>=0?k:ref.coups.length;ecarts.push(id+' : premier coup divergent n'+i+' attendu '+JSON.stringify(ref.coups[i]||null)+' obtenu '+JSON.stringify(cur.coups[i]||null));continue}
    if(cur.etat!==ref.etat||JSON.stringify(cur.fin)!==JSON.stringify(ref.fin)){ecarts.push(id+' : memes coups, etat final different');continue}
    const r=M.rejoue(ref.graine,ref.journaux.map(M.litJournal),ref.decks);
    if(r.erreur||JSON.stringify(r.etat)!==ref.etat)ecarts.push(id+' : rejoue(journal) different'+(r.erreur?' ('+r.erreur+')':''));
  }
}
console.log(ecarts.length?ecarts.length+' ecart(s) sur '+n+' parties :\n'+ecarts.join('\n'):'identique ('+n+' parties, '+((Date.now()-t0)/1000).toFixed(1)+' s)');
process.exitCode=ecarts.length?1:0;
