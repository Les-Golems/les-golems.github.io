#!/usr/bin/env node
/* Site d'essai : regenere essai/ comme copie exacte du site (racine du depot), servie a l'adresse /essai/.
   node outils/generer_essai.js
   Le code reconnait /essai/ tout seul : commun/outils.js (cles locales prefixees, pastille SITE D'ESSAI)
   et salon-firebase.js (prefixe essai/ dans Firebase). Rien a modifier a la main dans essai/.
   Copie : fichiers de la racine (html, js, css, json, images, manifeste) sauf configuration Firebase,
   et les dossiers css/ commun/ onglets/ vue/ cartes/ moteurs/ avatars/ ; des videos, seules les affiches .jpg
   (les .mp4 sont lourds : l'onglet Nouveautes de l'essai les lit donc sans video).
   Jamais copies : tests/ outils/ rules/ essai/ _tmp/ .git, database.rules.json, firebase.json, scripts .ps1, README. */
'use strict';
const fs=require('fs'),path=require('path');
const RACINE=path.resolve(__dirname,'..'),CIBLE=path.join(RACINE,'essai');
const DOSSIERS=['css','commun','onglets','vue','cartes','moteurs','avatars','images'];
const EXT_RACINE=/\.(html|js|css|json|png|jpg|ico|webmanifest)$/i;
const EXCLUS_RACINE=new Set(['database.rules.json','firebase.json']);
let n=0;
function copie(src,dst){fs.mkdirSync(path.dirname(dst),{recursive:true});fs.copyFileSync(src,dst);n++}
function copieDossier(d){
  for(const e of fs.readdirSync(path.join(RACINE,d),{withFileTypes:true})){
    const r=path.join(d,e.name);
    if(e.isDirectory())copieDossier(r);else copie(path.join(RACINE,r),path.join(CIBLE,r));
  }
}
fs.rmSync(CIBLE,{recursive:true,force:true});
for(const e of fs.readdirSync(RACINE,{withFileTypes:true}))
  if(e.isFile()&&EXT_RACINE.test(e.name)&&!EXCLUS_RACINE.has(e.name))copie(path.join(RACINE,e.name),path.join(CIBLE,e.name));
DOSSIERS.forEach(copieDossier);
if(fs.existsSync(path.join(RACINE,'videos')))
  for(const f of fs.readdirSync(path.join(RACINE,'videos')))if(/\.jpg$/i.test(f))copie(path.join(RACINE,'videos',f),path.join(CIBLE,'videos',f));
const v=JSON.parse(fs.readFileSync(path.join(CIBLE,'version.json'),'utf8'));
console.log('essai/ regenere : '+n+' fichiers, version '+v.v+(v.build?' (build '+v.build+')':''));
