/* Demarrage : reprise de salon, liens directs, connexion au salon Firebase, ponts GOLEMS_PONT et GOLEMS_UI. */
const aReprendre=salonRepris();
window.GolemsDonnees.interface.elements.ordre.forEach(x=>{new Image().src=imgV('cartes/'+x+'.png')});
majChoixDeck();
if(deckLien!==null){onglet('decks');ouvreDeckLien(deckLien)}
else{const v=new URLSearchParams(location.search).get('carte');if(v!==null){onglet('cartes');const o=carteDeLien(v); /* 0.6 : Decks > Cartes, puis le zoom */if(o&&o.id){dernier=null;zoom(imgV('cartes/'+o.id+'.jpg'),window.GolemsDonnees.nomLong(o.id),[...statZoomCarte(o.id),boutonLienCarte(idLienCarte(o.id))])}else if(o&&o.T)ouvreTerrainGalerie(o.T);else retireCarteLien()}}
(async()=>{
  try{room=await window.golemsSalon}catch(e){room=null}
  compteCharge=true;majVueDeck();
  if(!room){indisponible();majReprise();$('modifierPseudo').disabled=true;return}
  attenteLobby=Date.now()+1500; /* la liste des présents arrive en une à deux secondes */
  const fin=()=>{if(partie&&partie.local){return}r=null;code='';finPartie();$('salon').hidden=true;$('accueil').hidden=false;indisponible()};
  room.onPeers(()=>{majEtat();if(partie)majPartie()},fin);
  room.onConnection(majEtat,fin);
  /* Annonces : ecoute relancee a chaque changement de compte (les regles refusent la lecture aux invites). */
  let stopAnn=null;const ecouteAnnonces=()=>{if(!room.annonces)return;if(typeof stopAnn==="function")stopAnn();annoncesL=[];stopAnn=null;if(!compteCo()){peintListe();return}stopAnn=room.annonces(l=>{annoncesL=l;peintListe()})};
  ecouteAnnonces();
  if(room.compte.resumeur){if(room.compte.cumuleur)room.compte.cumuleur(cumulAjoute);room.compte.resumeur(resumeProfil);if(compteCo())profilPublie=room.compte.publieProfil()}
  room.compte.onChange(()=>{ecouteAnnonces();surCompte();majVueDeck();if(compteCo()&&room.compte.publieProfil)profilPublie=room.compte.publieProfil();if(compteCo()){room.presence({pseudo:pseudo}).catch(()=>{});if(invit)suitInvit();reessaie()}});
  surCompte();
  reessaie(); /* parties restees en attente d'ecriture */
  if(compteCo())room.presence({pseudo:pseudo}).catch(()=>{});
  else if(!lire('golems.invite')&&!invit&&deckLien===null)ouvrePseudo();
  majEtat();
  if(aReprendre&&compteCo()){invit='';onglet('jouer');entre(aReprendre)}else{majReprise();suitInvit()}
  if(window.DECO)DECO.init(room);else window.__decoRoom=room; /* 0.5 deconnexion : presence, minuteur, salon retenu par le compte (presence.js) */
})();
  /* 0.5 deconnexion : pont vers presence.js (window.DECO), lecture de l'etat et quelques actions. */
  window.GOLEMS_PONT={get partie(){return partie},get r(){return r},get code(){return code},get occupe(){return occupe},
    nomJ,lire,ecrire,cleSalon,litSien,joue:a=>joue(a),compteCo:()=>compteCo(),entre:c=>{invit='';onglet('jouer');return entre(c)},quitter:()=>quittePartie(),
    jouerA(){if(!partie||partie.etat&&partie.etat.fin)return;partie.mien.push(M.code({t:'a'}));sel=null;sauve();pub({j:M.ecritJournal(partie.mien)});calcule()}, /* ma defaite par abandon (hors ligne trop longtemps) */
    forfaitAdv(){if(!partie||partie.etat&&partie.etat.fin)return;partie.sien=[...partie.sien,M.code({t:'a'})];sel=null;calcule();sauve()}, /* abandon de l'adversaire hors ligne */
    lache(msg){const a=r;r=null;code='';finPartie();$('salon').hidden=true;$('accueil').hidden=false;$('erreurJeu').textContent=msg||'';if(a&&a.lache)a.lache();majEtat();majReprise()}}; /* autre appareil du meme compte */
  window.GOLEMS_UI={el,effetCouleur,partageFin,texteResume,donneesPartie,copie,nomJ,uidJ,monAvatar,quitteAvecConfirmation,get partie(){return partie},avatarDe,avatarUid,etiquetteV,enteteDeck,infoDeck,compteNb,pastilleInconnue,texteTaux,choisirDeck,grilleVue,zoom,zoomTerrain,montreApercu,cacheApercu,srcTerrain,srcC,ico,info,points,compteur,lg,detailAnimal,quiJoue,outils,pagesLog,genreLog,causesLog,texteLog,lienLog,ligneDeckVide,piocheImpossible,NOMS_LOG,LARGE,SURVOL,quitteBouton,peintChat,chatBox,onglet,nomComplet,teinte,get M(){return M},get maV(){return maV},get chatOuvert(){return chatOuvert}};
