/* Les Golems : archive gelee du moteur pour les rejeux (moteurs/moteur-<version>.js).
   Depuis la 0.6, le moteur lit ses fiches (cartes/donnees) et ses effets (cartes/effets) : copier moteur.js seul ne gele pas les cartes.
   Ce script assemble en UN fichier autonome les donnees, les effets et le moteur TELS QU'ILS SONT dans le dossier, dans un espace prive
   (ils ne touchent ni window.GolemsDonnees ni window.GolemsEffets du site), et expose seulement GolemsMoteur (page) ou module.exports (Node).
   A lancer AVANT de modifier le moteur ou les cartes de la nouvelle version :
     node outils/archiver_moteur.js            (version lue dans moteur.js)
   Refuse d'ecraser une archive existante (les archives ne sont jamais modifiees). */
'use strict';
const fs=require('fs'),path=require('path');
const RAC=path.join(__dirname,'..');
const lit=f=>fs.readFileSync(path.join(RAC,f),'utf8').replace(/^﻿/,'');
const m=/const VERSION='([^']+)'/.exec(lit('moteur.js'));if(!m)throw new Error('VERSION introuvable dans moteur.js');
const v=m[1],sortie=path.join(RAC,'moteurs','moteur-'+v+'.js');
if(fs.existsSync(sortie)){console.error('moteurs/moteur-'+v+'.js existe deja : archive jamais modifiee.');process.exit(1)}
const ORDRE=['cartes/donnees/golems.js','cartes/donnees/animaux.js','cartes/donnees/terrains.js','cartes/donnees/index.js',
  'cartes/effets/golems.js','cartes/effets/animaux.js','cartes/effets/terrains.js','cartes/effets/index.js','moteur.js'];
let txt='/* Les Golems : moteur '+v+' ARCHIVE (rejeux des parties '+v+'), genere par outils/archiver_moteur.js. Ne jamais modifier.\n'+
  '   Contient, dans un espace prive, les fichiers de la version '+v+' : '+ORDRE.join(', ')+'. */\n'+
  '(function(reel){\n'+
  'const P={}; /* espace prive : GolemsDonnees, GolemsEffets et GolemsMoteur de cette version */\n'+
  '(function(window,globalThis,module,require){\n';
for(const f of ORDRE)txt+='/* ===== '+f+' ===== */\n'+lit(f).replace(/\r\n/g,'\n')+'\n';
txt+='})(P,P,undefined,undefined);\n'+
  'if(!P.GolemsMoteur||P.GolemsMoteur.VERSION!=='+JSON.stringify(v)+')throw new Error("moteur archive '+v+' incomplet");\n'+
  'if(typeof module!=="undefined"&&module.exports)module.exports=P.GolemsMoteur;else reel.GolemsMoteur=P.GolemsMoteur;\n'+
  '})(typeof window!=="undefined"?window:globalThis);\n';
fs.writeFileSync(sortie,txt);
console.log('moteurs/moteur-'+v+'.js ecrit ('+txt.length+' caracteres).');
