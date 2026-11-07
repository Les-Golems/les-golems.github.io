/* Test (etape 8) : aucun code de carte ('001', '002e', '901'...) ni nom de terrain compare en dur dans le code d'interface.
   L'interface lit les fiches (cartes/donnees/*.js) : effetDe(id,type), effetTerrain(T,type), idsAvecEffet(type) (commun/outils.js).
   Fichiers verifies : commun/, onglets/, vue/, aide.js, diffusion.js, spectateur*.js, presence.js. Commentaires ignores.
   Detecte : un code de carte entre guillemets ou dans un chemin ('001', "002e", 'cartes/001.jpg') ; un nom de terrain compare (=== 'Le Cirque', 'La Faille'===...).
   Les textes affiches et les lignes du journal du moteur qui citent un nom (« KaTarN perd 4 de Force. ») ne sont pas des comparaisons de code : non concernes.
   Usage : node tests/test_ids_interface.js (depuis la racine du site). */
'use strict';
const fs=require('fs'),path=require('path');
const R=path.resolve(__dirname,'..');
const D=require('../cartes/donnees/index.js');
/* Liste blanche : fichier -> codes permis, avec la raison. Toute autre occurrence fait echouer le test. */
const PERMIS={
  'onglets/regles.js':{'001':"Regles > Lire une carte : l'image annotee est celle de KaTarN (illustration choisie, pas une regle)"},
  'onglets/tutoriel.js':{'001e':"Partie guidee : scenario ecrit autour de KaTarN et Slim K (deck du tutoriel fixe, DECK_TUTO du moteur)"},
};
const TERRAINS_PERMIS={
  'onglets/regles.js':{'La Boutique':"Regles > Lire un terrain : l'image annotee est celle de La Boutique (illustration choisie)"},
};
const fichiers=[];
for(const d of ['commun','onglets','vue'])for(const f of fs.readdirSync(path.join(R,d)))if(f.endsWith('.js'))fichiers.push(d+'/'+f);
for(const f of fs.readdirSync(R))if(/^(aide|diffusion|presence|spectateur[^.]*)\.js$/.test(f))fichiers.push(f);
const sansCommentaires=t=>t.replace(/\/\*[\s\S]*?\*\//g,m=>m.replace(/[^\n]/g,' '));
const RE_CODE=/(['"`\/])(0\d\d(?:e)?|9\d\d)(?=['"`.])/g;
const noms=D.terrains.liste.map(T=>T.nom.replace(/[.*+?^${}()|[\]\\]/g,'\\$&')).join('|');
const RE_TERRAIN=new RegExp("(?:[=!]==?\\s*(['\"])("+noms+")\\1)|(?:(['\"])("+noms+")\\3\\s*[=!]==?)",'g');
const ecarts=[];let vus=0;
for(const f of fichiers){
  const L=sansCommentaires(fs.readFileSync(path.join(R,f),'utf8')).split('\n');
  L.forEach((l,i)=>{
    let m;RE_CODE.lastIndex=0;
    while((m=RE_CODE.exec(l))){vus++;if(!(PERMIS[f]&&PERMIS[f][m[2]]))ecarts.push(f+':'+(i+1)+' : code '+m[2])}
    RE_TERRAIN.lastIndex=0;
    while((m=RE_TERRAIN.exec(l))){const n=m[2]||m[4];vus++;if(!(TERRAINS_PERMIS[f]&&TERRAINS_PERMIS[f][n]))ecarts.push(f+':'+(i+1)+' : terrain '+n)}
  });
}
/* La liste blanche doit rester utile : une entree qui ne sert plus est signalee. */
for(const f in PERMIS)for(const c in PERMIS[f]){const t=sansCommentaires(fs.readFileSync(path.join(R,f),'utf8'));if(!new RegExp("['\"`/]"+c+"['\"`.]").test(t))ecarts.push(f+' : liste blanche inutile ('+c+')')}
if(ecarts.length){console.error('Codes de carte ou noms de terrain en dur dans l\'interface :\n  '+ecarts.join('\n  '));process.exit(1)}
console.log('Aucun code de carte ni nom de terrain en dur hors liste blanche ('+fichiers.length+' fichiers, '+vus+' occurrences permises).');
