// Etape 7 : le moteur ne teste jamais un code ni un nom de carte ou de terrain. Usage : node tests/test_ids_moteur.js
// Echoue si une chaine de moteur.js (hors commentaires) contient un code de carte ('013e', '9xx', 'T-0xx'...) ou le nom d'une carte ou d'un terrain.
// Les effets se declarent dans les fiches (cartes/donnees/*.js, champ effet) et se codent dans cartes/effets/*.js.
const fs=require('fs'),path=require('path');
const D=require('../cartes/donnees/index.js');
const src=fs.readFileSync(path.join(__dirname,'..','moteur.js'),'utf8').split('\r\n').join('\n');
const sansCommentaires=src.replace(/\/\*[\s\S]*?\*\//g,m=>m.replace(/[^\n]/g,' ')); /* garde les numeros de ligne */
const CHAINE=/'(?:[^'\\\n]|\\.)*'|"(?:[^"\\\n]|\\.)*"|`(?:[^`\\]|\\.)*`/g;
const CODE=/(^|[^0-9A-Za-z_])(T-)?[0-9][0-9][0-9]e?($|[^0-9A-Za-z_])/;
const noms=[...Object.values(D.CARTES).map(c=>c.nom),...D.terrains.liste.map(t=>t.nom)];
const ecarts=[];
sansCommentaires.split('\n').forEach((l,i)=>{
  for(const lit of l.match(CHAINE)||[]){
    const x=lit.slice(1,-1).replace(/\\'/g,'\'');
    if(CODE.test(x))ecarts.push('ligne '+(i+1)+' : code de carte '+lit);
    for(const n of noms)if(x.includes(n))ecarts.push('ligne '+(i+1)+' : nom « '+n+' » dans '+lit);
  }
  for(const id of Object.keys(D.CARTES))if(new RegExp('[\\[.]'+id.replace(/[^0-9a-z]/g,'')+'\\b').test(l.replace(CHAINE,'')))ecarts.push('ligne '+(i+1)+' : code '+id+' hors chaine');
});
if(ecarts.length){console.error('Codes ou noms de cartes ecrits en dur dans moteur.js ('+ecarts.length+') :\n'+ecarts.join('\n'));process.exit(1)}
console.log('Aucun code ni nom de carte ou de terrain en dur dans moteur.js ('+Object.keys(D.CARTES).length+' cartes, '+D.terrains.liste.length+' terrains verifies).');
