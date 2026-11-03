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
  function verifie(){
    if(document.hidden&&monTour()){
      if(!minuteur){
        normal=document.title;bascule=false;
        minuteur=setInterval(function(){bascule=!bascule;document.title=bascule?ALERTE:normal},1000);
        document.title=ALERTE;bascule=true;
      }
    }else arrete();
  }
  document.addEventListener('visibilitychange',verifie);
  setInterval(verifie,1000);
})();
