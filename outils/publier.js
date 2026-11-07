#!/usr/bin/env node
/* Publication du site : met a jour version.json (seul endroit ou vit le numero ; index.html le lit au chargement).
   node outils/publier.js version 0.6   -> nouvelle version : encadre « Nouvelle version » chez les joueurs, salon bloque entre versions.
   node outils/publier.js correctif     -> meme version, build neuf : rechargement silencieux hors partie, salon compatible.
   Garde-fou : un correctif est refuse si le moteur ou les donnees de cartes different de la reference publiee
   (origin/main si connu, sinon le dernier commit qui a change version.json). Build = date et heure de Paris. */
'use strict';
const fs=require('fs'),path=require('path'),{execFileSync}=require('child_process');
const RACINE=path.resolve(__dirname,'..'),FICHIER=path.join(RACINE,'version.json');
const git=(...a)=>execFileSync('git',a,{cwd:RACINE,encoding:'utf8',stdio:['ignore','pipe','pipe']});
const stop=m=>{console.error(m);process.exit(1)};
/* Fichiers du moteur et des donnees de cartes (comparaison entiere) ; onglets/cartes.js (avant l'etape 5 : index.html) : seul le bloc const CARTES=[...] compte. */
const MOTEUR=['moteur.js','moteurs'];
const blocCartes=t=>{const i=t.indexOf('const CARTES=[');if(i<0)return '';const j=t.indexOf('];',i);return t.slice(i,j+2).replace(/\r\n/g,'\n')};

function reference(){
  try{return git('rev-parse','--verify','--quiet','origin/main').trim()}catch(e){}
  try{const c=git('log','-1','--format=%H','--','version.json').trim();if(c)return c}catch(e){}
  return '';
}
function moteurChange(ref){
  const l=[];
  const d=git('diff','--name-only',ref,'--',...MOTEUR).trim();if(d)l.push(...d.split('\n'));
  const n=git('ls-files','--others','--exclude-standard','--',...MOTEUR).trim();if(n)l.push(...n.split('\n'));
  /* Liste CARTES : onglets/cartes.js depuis l'etape 5 (avant : index.html), des deux cotes. */
  const avant=['onglets/cartes.js','index.html'].map(f=>{try{return blocCartes(git('show',ref+':'+f))}catch(e){return ''}}).find(x=>x)||'';
  const ici=['onglets/cartes.js','index.html'].map(f=>{try{return blocCartes(fs.readFileSync(path.join(RACINE,f),'utf8'))}catch(e){return ''}}).find(x=>x)||'';
  if(avant!==ici)l.push('onglets/cartes.js (liste CARTES)');
  return l;
}
function buildParis(){
  const p=Object.fromEntries(new Intl.DateTimeFormat('fr-FR',{timeZone:'Europe/Paris',year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit',hourCycle:'h23'}).formatToParts(new Date()).map(x=>[x.type,x.value]));
  return p.year+'-'+p.month+'-'+p.day+' '+p.hour+':'+p.minute;
}

const [mode,num]=process.argv.slice(2);
let cur={};try{cur=JSON.parse(fs.readFileSync(FICHIER,'utf8'))}catch(e){stop('version.json illisible : '+e.message)}
let v;
if(mode==='version'){
  if(!num||!/^[0-9a-z.]{1,20}$/.test(num))stop('Usage : node outils/publier.js version <numero>   (ex. 0.6)');
  v=num;
}else if(mode==='correctif'){
  if(num)stop('Usage : node outils/publier.js correctif   (sans numero)');
  const ref=reference();if(!ref)stop('Reference publiee introuvable (ni origin/main ni commit de version.json) : correctif refuse.');
  const l=moteurChange(ref);
  if(l.length)stop('Le moteur a changé : publie une version, pas un correctif.\nFichiers concernés (depuis '+ref.slice(0,7)+') : '+l.join(', '));
  v=String(cur.v||'');if(!v)stop('version.json sans numero v : publie une version.');
}else stop('Usage : node outils/publier.js version <numero> | correctif');
let build=buildParis();
if(build<=String(cur.build||''))build=String(cur.build).slice(0,16)+':'+String(new Date().getSeconds()).padStart(2,'0'); /* deux publications dans la meme minute */
const out={v,build,type:mode};
fs.writeFileSync(FICHIER,JSON.stringify(out));
console.log('version.json : '+JSON.stringify(out));
