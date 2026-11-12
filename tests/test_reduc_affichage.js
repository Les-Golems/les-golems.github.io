// 0.7 : cout reduit affiche en main (vue/joueur.js surcout = coutPose - cout imprime, colonne sans La Boutique).
// Verifie le cumul du moteur que la vue relit : J.reduc (Golems), J.reducCarte (-1 / -2, toute carte), La Boutique (case), plancher 0,
// jouabilite (legales) et retour au cout imprime une fois la reduction consommee. Node : node tests/test_reduc_affichage.js
const M=require('../moteur.js'),assert=require('assert');
let nv=0;const eq=(a,b,m)=>{assert.strictEqual(a,b,m);nv++};
const T=n=>({...M.TERRAINS.find(x=>x.nom===n)});
const id=x=>M.TYPES.indexOf(x)*3;
const nouv=()=>{const s=M.nouvelle(5,['','']);s.phase='jeu';s.mull=[true,true];s.premier=0;s.tour=1;s.joueur=0;s.manche=1;
  s.j.forEach(J=>{J.etapeForge=false;J.main=[];J.energie=0;J.deck=[];J.defausse=[];J.forge=[];J.score=0;J.grille=[[null,null,null],[null,null,null],[null,null,null]]});
  s.deckLibre=true;s.terrains=['La Faille','La Boutique','Le Vaisseau'].map(T);return s};
const G=Object.values(M.CARTES).find(C=>!C.animal&&!C.base&&C.cout>=3&&!(C.effet&&/interdit|poseManche/.test(JSON.stringify(C.effet)))),GC=id(G.id),c0=G.cout;
const A=M.CARTES['901'],AC=M.TYPES.indexOf('901')*3; // Kiwi, animal
const ecart=(s,c)=>M.coutPose(s,0,c,0,0)-M.carte(c).cout; // meme lecture que la vue (colonne 0 = sans Boutique)
{const s=nouv();eq(ecart(s,GC),0,'sans reduction');
 s.j[0].reduc=1;eq(ecart(s,GC),-1,'reduc -1 Golem');eq(M.coutPose(s,0,GC,0,1),c0-2,'reduc + Boutique');
 s.j[0].reducCarte=2;eq(ecart(s,GC),-3,'reduc + reducCarte -2');eq(M.coutPose(s,0,GC,0,1),Math.max(0,c0-4),'cumul des trois, plancher');
 s.j[0].reduc=0;s.j[0].reducCarte=1;eq(ecart(s,GC),-1,'reducCarte -1');
 s.j[0].reduc=5;s.j[0].reducCarte=2;eq(M.coutPose(s,0,GC,0,1),0,'plancher 0');}
{const s=nouv();s.j[0].reduc=1;eq(M.coutPose(s,0,AC,0,0),M.coutPose(nouv(),0,AC,0,0),'reduc ne vaut pas pour un animal');
 s.j[0].reducCarte=2;eq(M.coutPose(s,0,AC,0,0),Math.max(0,M.coutPose(nouv(),0,AC,0,0)-2),'reducCarte vaut pour un animal');}
{ // jouabilite : energie = cout reduit sur la Boutique seulement
 const s=nouv();s.j[0].main=[GC];s.j[0].reduc=1;s.j[0].energie=c0-2;
 const L=M.legales(s,0).filter(a=>a.t==='p'&&a.c===GC);eq(L.length>0,true,'posable avec la reduction');eq(L.every(a=>a.k===1),true,'seulement sur La Boutique');
 // consommation : le Golem suivant retrouve son cout
 s.j[0].main.push(GC+1);M.applique(s,0,L[0]);eq(s.j[0].reduc,0,'reduc consommee');eq(ecart(s,GC+1),0,'cout imprime retrouve');}
{ // reducCarte consommee par la carte suivante quelle qu'elle soit
 const s=nouv();s.j[0].main=[GC,GC+1];s.j[0].reducCarte=2;s.j[0].energie=c0;eq(ecart(s,GC+1),-2,'-2 en main');
 M.applique(s,0,{t:'p',c:GC,l:0,k:0});eq(s.j[0].reducCarte,0,'reducCarte consommee');eq(ecart(s,GC+1),0,'cout imprime retrouve');}
console.log('test_reduc_affichage : '+nv+' verifications OK ('+G.nom+', cout '+c0+')');
