/* commun/classe.js - Parties classées, rangs, robots en classée, saisons, écussons (0.6).
   Fonctions pures (aucun accès DOM ni Firebase) : utilisables en Node (require) et dans le navigateur (window.GolemsClasse).

   FORMAT DES DONNÉES FIREBASE (à l'usage de l'agent des règles) :
   classe/saison : { id: 0, nom: "Bêta", debut: <ms>, fin: null }          saison en cours (fin null = sans date de fin)
   classe/joueurs/<uid> : profil classé de la saison en cours
     elo: nombre (départ 1000, jamais affiché pendant le placement)
     parties: entier >= 0 (classées jouées dans la saison, robots compris)
     partiesTotal: entier >= 0 (classées jouées toutes saisons, sert au K : 32 pendant les 30 premières, puis 20)
     v: entier, d: entier (victoires, défaites de la saison)
     robots: { jour: "AAAA-MM-JJ" (jour de Paris), n: 0..5 }   classées contre un robot ce jour-là
     maj: <ms> (horodatage serveur de la dernière partie)
   classe/classement/<uid> : { pseudo, elo, rang, v, d }   joueurs ayant fini leur placement seulement (jamais de robot)
   classe/parties/<idPartie> : { a: uid, b: uid ou "robot-facile|robot-normal|robot-difficile", gagnant: uid ou id robot,
     eloA, eloB (avant), deltaA, deltaB (deltaB absent pour un robot), robot: bool, saison: id, t: <ms> }
   classe/saisons/<id> : { nom, debut, fin }   saisons terminées
   classe/instantanes/<id>/<uid> : instantané complet de fin de saison (voir instantaneSaison) :
     { saison, elo, rang, place (ou null), placementFini: bool,
       modes: { classee|amicale|entrainement: { parties, v, d } },
       dernieres: [ { mode, gagne: bool, adv, t } ] (10 max, la plus récente à la fin),
       tops: { golems: [ {id, n, v} ], terrains: [ {id, n, v} ] } (5 max chacun),
       elements: { <élément>: { n, v } },
       ecusson: { saison, rang, palier, image } ou null }
   classe/ecussons/<uid>/<idSaison> : { saison, rang, palier, image }   (palier : base | top10 | podium | champion)
*/
(function (racine) {
  'use strict';
  var ELO_DEPART = 1000, K_DEBUT = 32, K_ENSUITE = 20, PARTIES_K_DEBUT = 30, PLACEMENT = 5, ROBOTS_PAR_JOUR = 5;

  var RANGS = [ // min inclus, triés par valeur
    { id: 'amethyste', nom: 'Améthyste', min: -Infinity },
    { id: 'topaze', nom: 'Topaze', min: 950 },
    { id: 'saphir', nom: 'Saphir', min: 1050 },
    { id: 'emeraude', nom: 'Émeraude', min: 1150 },
    { id: 'rubis', nom: 'Rubis', min: 1250 },
    { id: 'diamant', nom: 'Diamant', min: 1400 }
  ];

  var ROBOTS = {
    facile: { id: 'robot-facile', nom: 'Golem Facile', elo: 750 },
    normal: { id: 'robot-normal', nom: 'Golem Normal', elo: 1100 },
    difficile: { id: 'robot-difficile', nom: 'Golem Difficile', elo: 1200 }
  };

  var SAISONS = [{ id: 0, nom: 'Bêta', fin: null }];
  var PALIERS = ['base', 'top10', 'podium', 'champion'];

  function rang(elo) {
    for (var i = RANGS.length - 1; i >= 0; i--) if (elo >= RANGS[i].min) return RANGS[i];
    return RANGS[0];
  }

  function enPlacement(j) { return (j.parties || 0) < PLACEMENT; }

  /* K selon le nombre total de classées déjà jouées avant cette partie. */
  function facteurK(partiesTotal) { return (partiesTotal || 0) < PARTIES_K_DEBUT ? K_DEBUT : K_ENSUITE; }

  function attendu(elo, eloAdv) { return 1 / (1 + Math.pow(10, (eloAdv - elo) / 400)); }

  /* Variation d'Elo d'un joueur. j = { elo, parties, partiesTotal } ; opts.robot = true contre un robot. */
  function variation(j, eloAdv, gagne, opts) {
    opts = opts || {};
    var d = facteurK(j.partiesTotal) * ((gagne ? 1 : 0) - attendu(j.elo, eloAdv));
    if (enPlacement(j)) d *= 2;
    if (opts.robot) d /= 2;
    return Math.round(d);
  }

  /* Nouveau profil après une partie (copie, l'original n'est pas modifié). */
  function appliquePartie(j, eloAdv, gagne, opts) {
    opts = opts || {};
    var delta = variation(j, eloAdv, gagne, opts);
    var n = {
      elo: j.elo + delta, parties: (j.parties || 0) + 1, partiesTotal: (j.partiesTotal || 0) + 1,
      v: (j.v || 0) + (gagne ? 1 : 0), d: (j.d || 0) + (gagne ? 0 : 1), robots: j.robots || null
    };
    if (opts.robot) n.robots = compteRobot(j.robots, opts.maintenant);
    return { joueur: n, delta: delta };
  }

  function nouveauJoueur() { return { elo: ELO_DEPART, parties: 0, partiesTotal: 0, v: 0, d: 0, robots: null }; }

  /* Ce qu'on montre : pendant le placement, « Placement N/5 » + rang estimé, sans Elo. */
  function affichage(j) {
    if (enPlacement(j)) {
      var n = j.parties || 0;
      return { placement: true, texte: 'Placement ' + n + '/' + PLACEMENT, n: n, sur: PLACEMENT, estime: rangEstime(j), elo: null, rang: null };
    }
    return { placement: false, texte: rang(j.elo).nom, elo: j.elo, rang: rang(j.elo) };
  }
  function rangEstime(j) { return rang(j.elo); }

  /* Robots */
  function robotPour(elo) { return elo < 900 ? ROBOTS.facile : elo < 1150 ? ROBOTS.normal : ROBOTS.difficile; }
  function estRobot(id) { return typeof id === 'string' && id.indexOf('robot-') === 0; }

  /* Jour de Paris "AAAA-MM-JJ" (la journée change à minuit, heure de Paris). */
  function jourParis(ms) {
    var p = new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/Paris', year: 'numeric', month: '2-digit', day: '2-digit' })
      .formatToParts(new Date(ms == null ? Date.now() : ms));
    var o = {}; p.forEach(function (x) { o[x.type] = x.value; });
    return o.year + '-' + o.month + '-' + o.day;
  }
  function robotsRestants(robots, ms) {
    var jour = jourParis(ms);
    var n = robots && robots.jour === jour ? robots.n : 0;
    return Math.max(0, ROBOTS_PAR_JOUR - n);
  }
  function peutAffronterRobot(robots, ms) { return robotsRestants(robots, ms) > 0; }
  function compteRobot(robots, ms) {
    var jour = jourParis(ms);
    return { jour: jour, n: (robots && robots.jour === jour ? robots.n : 0) + 1 };
  }

  /* Classement : joueurs hors placement, jamais de robot, Elo décroissant. liste = [{ uid, elo, parties, ... }] */
  function classement(liste) {
    return liste.filter(function (j) { return !estRobot(j.uid) && !enPlacement(j); })
      .slice().sort(function (a, b) { return b.elo - a.elo; });
  }

  /* Saisons */
  function eloRemise(elo) { return Math.round(ELO_DEPART + (elo - ELO_DEPART) / 2); }
  function nouvelleSaison(j) { return { elo: eloRemise(j.elo), parties: 0, partiesTotal: j.partiesTotal || 0, v: 0, d: 0, robots: j.robots || null }; }
  function saison(id) { for (var i = 0; i < SAISONS.length; i++) if (SAISONS[i].id === id) return SAISONS[i]; return null; }

  function palier(place) {
    if (place === 1) return 'champion';
    if (place >= 2 && place <= 3) return 'podium';
    if (place >= 4 && place <= 10) return 'top10';
    return 'base';
  }
  /* Fichier d'image prévu : images/ecussons/saison-<id>-<matière>-<palier>.png ; Saison 0 = matière « pionnier ». */
  function imageEcusson(idSaison, idRang, pal) {
    return 'images/ecussons/saison-' + idSaison + '-' + (idSaison === 0 ? 'pionnier' : idRang) + '-' + pal + '.png';
  }
  /* 1 écusson par saison si placement fini, sinon null. place = place finale au classement (ou null). */
  function ecusson(idSaison, j, place) {
    if (enPlacement(j)) return null;
    var r = rang(j.elo).id, p = palier(place);
    return { saison: idSaison, rang: idSaison === 0 ? 'pionnier' : r, palier: p, image: imageEcusson(idSaison, r, p) };
  }

  /* Instantané complet de fin de saison. stats = { modes, dernieres, tops, elements } déjà calculés par l'appelant. */
  function instantaneSaison(idSaison, j, place, stats) {
    stats = stats || {};
    var fini = !enPlacement(j);
    return {
      saison: idSaison, elo: j.elo, rang: fini ? rang(j.elo).id : null, place: fini && place ? place : null, placementFini: fini,
      modes: stats.modes || {}, dernieres: (stats.dernieres || []).slice(-10),
      tops: { golems: ((stats.tops || {}).golems || []).slice(0, 5), terrains: ((stats.tops || {}).terrains || []).slice(0, 5) },
      elements: stats.elements || {}, ecusson: ecusson(idSaison, j, place)
    };
  }

  var API = {
    ELO_DEPART: ELO_DEPART, K_DEBUT: K_DEBUT, K_ENSUITE: K_ENSUITE, PARTIES_K_DEBUT: PARTIES_K_DEBUT, PLACEMENT: PLACEMENT,
    ROBOTS_PAR_JOUR: ROBOTS_PAR_JOUR, RANGS: RANGS, ROBOTS: ROBOTS, SAISONS: SAISONS, PALIERS: PALIERS,
    rang: rang, enPlacement: enPlacement, facteurK: facteurK, attendu: attendu, variation: variation, appliquePartie: appliquePartie,
    nouveauJoueur: nouveauJoueur, affichage: affichage, rangEstime: rangEstime, robotPour: robotPour, estRobot: estRobot,
    jourParis: jourParis, robotsRestants: robotsRestants, peutAffronterRobot: peutAffronterRobot, compteRobot: compteRobot,
    classement: classement, eloRemise: eloRemise, nouvelleSaison: nouvelleSaison, saison: saison, palier: palier,
    imageEcusson: imageEcusson, ecusson: ecusson, instantaneSaison: instantaneSaison
  };
  if (typeof module !== 'undefined' && module.exports) module.exports = API;
  else racine.GolemsClasse = API;
})(typeof window !== 'undefined' ? window : this);
