/* Raccords de fin : crochets de test locaux, creer et rejoindre un salon, onglet de depart, apercu au survol des Cartes. */
/* Tests automatiques, en local seulement */
if(/^(localhost|127\.0\.0\.1)$/.test(location.hostname))window.__golemsDebug={room:()=>room,partie:()=>partie,joue:a=>joue(a),lanceRejeu:x=>lanceRejeu(x),lesParties:()=>lesParties(),lesDecks:()=>lesDecks(),entre:c=>entre(c)};
window.__golemsEtat=()=>partie&&partie.etat?JSON.stringify(partie.etat):null;

$('creer').onclick=()=>{if(!compteCo()){msgInvite();return}choisirDeck(creerSalon)};
const creerSalon=async()=>{
  occupe=true;majEtat();
  const reste=attenteLobby-Date.now();if(reste>0)await pause(reste);
  createur=true;salonPublic=$('salonPublicCase').checked;const c0=nouveauCode();notePublic(c0,salonPublic);
  if(room&&room.nettoie)room.nettoie().catch(()=>{}); /* salons inactifs depuis plus de 7 jours */
  await entre(c0);
};
$('formCode').onsubmit=e=>{
  e.preventDefault();
  if(!room||$('rejoindre').disabled)return;
  const c=$('champCode').value.trim().toLowerCase();
  if(!/^[a-z0-9]{3,8}$/.test(c)){$('erreurJeu').textContent='Code invalide.';return}
  if(!compteCo()){msgInvite();return}
  choisirDeck(()=>{$('champCode').value='';createur=false;salonPublic=false;entre(c)});
};
$('quitter').onclick=()=>{oublie(code);sortie()};
const memo=lire('golems.onglet'),lienDirect=/[?&](deck|carte|salon)=/.test(location.search)||!!salonRepris(); /* liens directs et reprise de salon gardent la priorite */
majPointNv();onglet(!versionVue()&&!lienDirect?'nouveautes':noms.includes(memo)?memo:'nouveautes');
/* Aperçu au survol de l'onglet Cartes, comme en partie */
$('grille').addEventListener('mouseover',e=>{
  const b=e.target.closest('.carte');if(!b||b.contains(e.relatedTarget))return;
  if(b.dataset.id)montreApercu(b,imgV('cartes/'+b.dataset.id+'.jpg'));
  else if(b.dataset.terrain)montreApercu(b,srcTerrain({nom:b.dataset.terrain}));
});
$('grille').addEventListener('mouseout',e=>{const b=e.target.closest('.carte');if(b&&!b.contains(e.relatedTarget))cacheApercu()});
$('grille').addEventListener('click',cacheApercu,true);
