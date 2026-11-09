/* Etat partage : variables globales communes a plusieurs fichiers (commun/, onglets/, vue/), declarees ici et charge en premier. */
/* Compte : pseudo du joueur, mode Creer/Se connecter de la fenetre pseudo ; compteCharge : compte connu (salon pret ou indisponible). */
let pseudo='',modeCreer=false;
let compteCharge=false;
/* Salon en ligne (onglet Jouer) : room = salon Firebase (window.golemsSalon), r = salon rejoint, code = son code, occupe = entree en cours ;
   maV = ma version v|build, ecart de version ; salon public et createur ; annonces des parties ouvertes ; chat. */
let room=null,r=null,code='',entree=0,nbSalon=0,occupe=false,attenteLobby=0,jePret=false,compteFin=0,compteT=0;
/* Compte connecte (pas invite). Declare ici et non dans commun/compte.js : lesDecks (onglets/decks.js), appelee au demarrage, ne depend plus du chargement de compte.js (ReferenceError intermittente). */
const compteCo=()=>{try{return !!(room&&room.compte&&room.compte.connecte())}catch(e){return false}};
let maV='',vxEcart=false,vxRouge='';
let salonPublic=false,createur=false,annonceVue='',specAnn=false;
let annoncesL=[];
let chatVu=0,chatDernier=0,chatOuvert=false;
/* Partie en cours (vue joueur) : partie = { etat du moteur, journaux, moi... } ou null ; selection, modes de ciblage des capacites,
   effets visuels fx, des, apercu de la derniere carte adverse, envoi de presence, niveau du robot, journal ouvert. */
let robotT=0,sid='',arrivee=0,recapAff=0,fx=[],fileDes=[],desActif=false,desT=0,desF=0;
let partie=null,notice='',sel=null,selMull=[],selCases=[],modeVaisseau=false,modeFaille=false,modeCaramel=false,modeLove=false,modeTarte=false;
let derniereAdv=null,zoneSurvol=null; /* zone d'apercu de la partie (ordinateur) */
/* envoiPub : dernier envoi de presence (et du journal), attendu avant d'annoncer un depart. */
let envoiPub=null;
let niveauChoisi='normal';
let journalOuvert=false,journalPage=null,journalReperes=0;
/* File d'animations de la partie : etapes en attente, animation en cours, Passer, verrou du plateau, ecran de fin, cartes tenues ou masquees. */
let fileA=[],animT=0,animCours=false,sauter=false,verrou=false,ecranFin=null,tenus=[],masques=[],repeint=null;
/* Onglet Cartes : filtre d'element et de type, derniere carte ouverte. */
let fEl='',fTy='',dernier=null;
/* Statistiques : tri, archive commune chargee (resumes, patchs, joueurs, profils), profil republie a la connexion. */
let statsTri='taux',statsData=null,statsPatchs=null,statsJoueurs=[],statsProfils={};
/* Republication du profil du joueur connecte (au chargement, a la connexion) : les Statistiques l'attendent 3 s au plus avant de lire les profils. */
let profilPublie=null;
/* Historique : parties en attente d'ecriture, minuteur du rejeu, page et nombre de lignes. */
let reessai=false;
let rejeuT=0;
let pageHisto=0,lignesPage=14;
/* Decks : deck ouvert dans l'editeur, tri, ecriture groupee, deck choisi avant la partie. */
let deckOuvert=null,deckVu=null,triDeck='',triDeckDesc=false;
let decksT=0,decksVol=0;
let deckPret={id:'',nom:'Test',texte:''};
/* Partie guidee : etat du tutoriel en cours (null hors tutoriel). */
let tuto=null;
/* Restent a leur place (valeur calculee au chargement) : M moteur en service (vue/partie.js), vitesse (vue/partie.js), invit et deckLien (onglets/jouer.js). */
