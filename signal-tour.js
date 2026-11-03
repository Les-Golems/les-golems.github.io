/* Signal de tour : en partie en ligne, si c'est mon tour et que l'onglet est cache,
   le titre alterne "À toi ! · Les Golems" et le titre normal jusqu'au retour sur l'onglet. */
(function(){
  var ALERTE='À toi ! · Les Golems',normal=null,minuteur=0,bascule=false;
  function monTour(){
    try{
      if(typeof partie==='undefined'||!partie||partie.local||!partie.etat)return false;
      var s=partie.etat,me=partie.moi;
      if(s.fin)return false;
      if(s.phase==='mulligan')return !!s.mull&&!s.mull[me];
      return (s.attente?s.attente.p:s.joueur)===me;
    }catch(e){return false}
  }
  function arrete(){
    if(minuteur){clearInterval(minuteur);minuteur=0}
    if(normal!==null){document.title=normal;normal=null}
  }
  /* Adversaire arrive dans ma partie en attente : meme alternance avec "Adversaire arrivé ! · Les Golems",
     declenchee par index.html (window.golemsAdversaireArrive) et levee au retour sur l'onglet. */
  var ARRIVEE='Adversaire arrivé ! · Les Golems',arrivee=false;
  function texte(){return monTour()?ALERTE:arrivee?ARRIVEE:''}
  function verifie(){
    if(!document.hidden)arrivee=false;
    if(document.hidden&&texte()){
      if(!minuteur){
        normal=document.title;bascule=false;
        minuteur=setInterval(function(){bascule=!bascule;document.title=bascule?(texte()||normal):normal},1000);
        document.title=texte();bascule=true;
      }
    }else arrete();
  }
  window.golemsAdversaireArrive=function(){if(document.hidden){arrivee=true;verifie()}};
  document.addEventListener('visibilitychange',verifie);
  setInterval(verifie,1000);
})();
