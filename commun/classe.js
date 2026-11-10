/* commun/classe.js - Parties classées, rangs, robots en classée, saisons, récompenses (0.6).
   Fonctions pures (aucun accès DOM ; Firebase seulement par service(B), base injectée) : utilisables en Node (require) et dans le navigateur (window.GolemsClasse).

   FORMAT DES DONNÉES FIREBASE (à l'usage de l'agent des règles) :
   classe/saison : { id: 0, nom: "Bêta", debut: <ms>, fin: null }          saison en cours (fin null = sans date de fin)
   (Champs exigés par rules/50-classe.js, branche v06-regles : joueurs.saison, joueurs.dern, robots.j, parties.sa / gr / ok / fait, salon cl / cree / robot.)
   salons/<code> (0.6) : cl: true (salon classé), cree: horodatage serveur, robot: { u: uid, n: "facile|normal|difficile", t: horodatage serveur }
   classe/joueurs/<uid> : profil classé de la saison en cours
     saison: id de la saison du profil ; dern: id de la dernière partie appliquée (absent à la création et après remise)
     elo: nombre (départ 1000, jamais affiché pendant le placement)
     parties: entier >= 0 (classées jouées dans la saison, robots compris)
     partiesTotal: entier >= 0 (classées jouées toutes saisons, sert au K : 32 pendant les 30 premières, puis 20)
     v: entier, d: entier (victoires, défaites de la saison)
     robots: { jour: "AAAA-MM-JJ" (affichage), j: floor((ms + 3600000) / 86400000) (jour de Paris, hiver, vérifié par les règles), n: 0..5 }   classées contre un robot ce jour-là
     maj: <ms> (horodatage serveur de la dernière partie)
   classe/classement/<uid> : { pseudo, elo, rang, v, d }   joueurs ayant fini leur placement seulement (jamais de robot)
   classe/parties/<id> : id = sa + "-" + gr entre joueurs (libre contre un robot : [a-z0-9-]) ; + sa: code du salon, gr: graine en texte,
     ok/<uid>: true (confirmation du résultat), fait/<uid>: true (posé dans la même écriture que le profil) ; jamais de nul (moteur.js : départage aux points, Force, terrains, second joueur) ;
     { a: uid, b: uid ou "robot-facile|robot-normal|robot-difficile", gagnant: uid ou id robot,
     eloA, eloB (avant), deltaA, deltaB (deltaB absent pour un robot), robot: bool, saison: id, t: <ms> }
   classe/saisons/<id> : { nom, debut, fin }   saisons terminées
   classe/instantanes/<id>/<uid> : instantané complet de fin de saison (voir instantaneSaison), écrit par le joueur, placement fini seulement :
     { saison, elo, rang, placementFini: true, place (posée ENSUITE à la main par Romain),
       modes: { classee|amicale|entrainement: { parties, v, d, best (meilleure série), serie (série finale) } },
       dernieres: [ { mode, gagne: bool, adv, t } ] (10 max, la plus récente à la fin),
       tops: { golems: [ {id, n, v} ], terrains: [ {id, n, v} ], decks: [ {nom, e, n, v} ], mvp: [ {id, n} ] } (5 max chacun),
       elements: { <élément>: { n, v } } }
   classe/ecussons/<uid>/<idSaison> : récompense publique { saison, place?, ecu? } (voir recompense) :
     médaille ronde de la saison pour tout placement fini (Saison 0 = Pionnier) ; écu en plus pour un top 10 (or 1, argent 2-3, bronze 4-10).
   salons/<code>/robot est posé par le joueur avant une classée contre un robot ; ids de partie toujours en minuscules.
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
  /* gagne : true, false ou 'nul'. */
  function variation(j, eloAdv, gagne, opts) {
    opts = opts || {};
    var d = facteurK(j.partiesTotal) * ((gagne === 'nul' ? 0.5 : gagne ? 1 : 0) - attendu(j.elo, eloAdv));
    if (enPlacement(j)) d *= 2;
    if (opts.robot) d /= 2;
    return Math.round(d);
  }

  /* Nouveau profil après une partie (copie, l'original n'est pas modifié). */
  function appliquePartie(j, eloAdv, gagne, opts) {
    opts = opts || {};
    var delta = opts.delta != null ? opts.delta : variation(j, eloAdv, gagne, opts), nul = gagne === 'nul';
    var n = {
      elo: j.elo + delta, parties: (j.parties || 0) + 1, partiesTotal: (j.partiesTotal || 0) + 1,
      v: (j.v || 0) + (gagne === true ? 1 : 0), d: (j.d || 0) + (gagne === false ? 1 : 0)
    };
    if (j.saison != null) n.saison = j.saison;
    if (opts.idPartie != null) n.dern = opts.idPartie; else if (j.dern != null) n.dern = j.dern;
    if (opts.robot) n.robots = compteRobot(j.robots, opts.maintenant); else if (j.robots) n.robots = j.robots;
    if (nul) n.v = j.v || 0;
    return { joueur: n, delta: delta };
  }

  function nouveauJoueur(idSaison) { return { elo: ELO_DEPART, parties: 0, partiesTotal: 0, v: 0, d: 0, saison: idSaison || 0 }; }

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
  /* Numéro du jour de Paris en heure d'hiver, comme les règles Firebase. */
  function numJour(ms) { return Math.floor(((ms == null ? Date.now() : ms) + 3600000) / 86400000); }
  function memeJour(robots, ms) { return !!robots && (robots.j != null ? robots.j === numJour(ms) : robots.jour === jourParis(ms)); }
  function robotsRestants(robots, ms) {
    var n = memeJour(robots, ms) ? robots.n : 0;
    return Math.max(0, ROBOTS_PAR_JOUR - n);
  }
  function peutAffronterRobot(robots, ms) { return robotsRestants(robots, ms) > 0; }
  function compteRobot(robots, ms) {
    return { jour: jourParis(ms), j: numJour(ms), n: (memeJour(robots, ms) ? robots.n : 0) + 1 };
  }

  /* Classement : joueurs hors placement, jamais de robot, Elo décroissant. liste = [{ uid, elo, parties, ... }] */
  function classement(liste) {
    return liste.filter(function (j) { return !estRobot(j.uid) && !enPlacement(j); })
      .slice().sort(function (a, b) { return b.elo - a.elo; });
  }

  /* Saisons */
  function eloRemise(elo) { return Math.round(ELO_DEPART + (elo - ELO_DEPART) / 2); }
  function nouvelleSaison(j, idSaison) {
    var n = { elo: eloRemise(j.elo), parties: 0, partiesTotal: j.partiesTotal || 0, v: 0, d: 0, saison: idSaison == null ? (j.saison || 0) + 1 : idSaison };
    if (j.robots) n.robots = j.robots;
    return n;
  }
  function saison(id) { for (var i = 0; i < SAISONS.length; i++) if (SAISONS[i].id === id) return SAISONS[i]; return null; }

  /* ----- Récompenses de saison (règle du 9 nov. 2026) -----
     Médaille ronde de la saison pour tout joueur ayant fini son placement (Saison 0 = médaille Pionnier) ;
     un top 10 reçoit EN PLUS un écu à sa place : or 1, argent 2-3, bronze 4-10.
     La place finale est posée à la main par Romain dans classe/instantanes/<saison>/<uid>/place. */
  function metalEcu(place) { return place === 1 ? 'or' : place >= 2 && place <= 3 ? 'argent' : place >= 4 && place <= 10 ? 'bronze' : null; }
  function nomMedaille(idSaison) { return idSaison === 0 ? 'Pionnier' : 'Saison ' + idSaison; }
  /* Images : images/recompenses/saison-<id>-<taille>.png et ecu-<métal>-<place>-<taille>.png (tailles 104 et 56). */
  function imageMedaille(idSaison, taille) { return 'images/recompenses/saison-' + idSaison + '-' + (taille || 104) + '.png'; }
  function imageEcu(place, taille) { var m = metalEcu(place); return m ? 'images/recompenses/ecu-' + m + '-' + place + '-' + (taille || 104) + '.png' : null; }
  /* Récompense d'une saison d'après l'instantané : null si placement non fini ; { saison } = médaille seule ; + place, ecu pour un top 10. */
  function recompense(idSaison, inst) {
    if (!inst || inst.placementFini !== true) return null;
    var r = { saison: idSaison }, p = inst.place;
    if (Number.isInteger(p) && metalEcu(p)) { r.place = p; r.ecu = metalEcu(p); }
    return r;
  }

  /* Instantané complet de fin de saison (sans la place, posée ensuite par Romain).
     stats = { modes: { classee|amicale|entrainement: { parties, v, d, best, serie } }, dernieres, tops: { golems, terrains, decks, mvp }, elements }. */
  function instantaneSaison(idSaison, j, stats) {
    stats = stats || {};
    var fini = !enPlacement(j), t = stats.tops || {}, o = {
      saison: idSaison, elo: j.elo, rang: rang(j.elo).id, placementFini: fini,
      modes: stats.modes || {}, dernieres: (stats.dernieres || []).slice(-10),
      tops: {
        golems: (t.golems || []).slice(0, 5), terrains: (t.terrains || []).slice(0, 5),
        decks: (t.decks || []).slice(0, 5), mvp: (t.mvp || []).slice(0, 5)
      },
      elements: stats.elements || {}
    };
    return o;
  }

  /* ----- Objets à écrire dans Firebase ----- */
  var HORODATAGE = { '.sv': 'timestamp' };
  /* Id de partie toujours en minuscules (règle : [a-z0-9-]{3,60}). */
  function idPartie(sa, gr) { return (String(sa) + '-' + String(gr)).toLowerCase(); }
  /* Une partie a toujours un gagnant (moteur.js) : une fin sans gagnant est refusée. */
  function sansGagnant() { return Object.assign(new Error('classe/sans-gagnant'), { code: 'classe/sans-gagnant' }); }
  /* Partie entre joueurs : o = { sa, gr, a, b, profilA, profilB, gagnant (uid de a ou de b), saison }. */
  function creePartie(o) {
    if (o.gagnant !== o.a && o.gagnant !== o.b) throw sansGagnant();
    var ga = o.gagnant === o.a, gb = o.gagnant === o.b;
    return { id: idPartie(o.sa, o.gr), partie: {
      a: o.a, b: o.b, gagnant: o.gagnant, eloA: o.profilA.elo, eloB: o.profilB.elo,
      deltaA: variation(o.profilA, o.profilB.elo, ga), deltaB: variation(o.profilB, o.profilA.elo, gb),
      robot: false, saison: o.saison, t: HORODATAGE, sa: String(o.sa).toLowerCase(), gr: String(o.gr) } };
  }
  /* Partie contre un robot : o = { sa, gr, a, profilA, niveau ('facile|normal|difficile'), gagne: true | false, saison, id (facultatif) }. */
  function creePartieRobot(o) {
    if (o.gagne !== true && o.gagne !== false) throw sansGagnant();
    var R = ROBOTS[o.niveau];
    return { id: (o.id || (idPartie(o.sa, o.gr) + '-' + R.id)).toLowerCase(), partie: {
      a: o.a, b: R.id, gagnant: o.gagne ? o.a : R.id, eloA: o.profilA.elo, eloB: R.elo,
      deltaA: variation(o.profilA, R.elo, o.gagne, { robot: true }),
      robot: true, saison: o.saison, t: HORODATAGE, sa: String(o.sa).toLowerCase(), gr: String(o.gr) } };
  }
  function perdantDe(p) { return p.gagnant === p.a ? p.b : p.a; }
  function confirmation(id, uid) { var u = {}; u['classe/parties/' + id + '/ok/' + uid] = true; return u; }
  /* Application d'une partie au profil de uid (par lui ou par son adversaire) : une seule écriture multi-chemins. */
  function application(uid, profil, id, partie, ms) {
    var estA = partie.a === uid, res = partie.gagnant === 'nul' ? 'nul' : partie.gagnant === uid;
    var n = appliquePartie(profil, estA ? partie.eloB : partie.eloA, res,
      { delta: estA ? partie.deltaA : partie.deltaB, idPartie: id, robot: partie.robot === true, maintenant: ms }).joueur;
    n.maj = HORODATAGE;
    var u = {}; u['classe/joueurs/' + uid] = n; u['classe/parties/' + id + '/fait/' + uid] = true; return u;
  }
  function salonClasse() { return { cl: true, cree: HORODATAGE }; }
  function niveauRobot(elo) { return elo < 900 ? 'facile' : elo < 1150 ? 'normal' : 'difficile'; }
  function salonRobot(uid, elo) { return { u: uid, n: niveauRobot(elo), t: HORODATAGE }; }
  /* Ligne du classement (copie exacte du profil, placement fini seulement). */
  function ligneClassement(pseudo, j) { return enPlacement(j) ? null : { pseudo: pseudo, elo: j.elo, rang: rang(j.elo).id, v: j.v || 0, d: j.d || 0, saison: j.saison | 0 }; }
  function sansNuls(o) {
    if (Array.isArray(o)) return o.map(sansNuls);
    if (!o || typeof o !== 'object') return o;
    var r = {}; for (var k in o) if (o[k] !== null && o[k] !== undefined) r[k] = sansNuls(o[k]); return r;
  }

  /* ----- Branchement Firebase : service(B), B = { lit(chemin), ecrit(maj multi-chemins), uid(), pseudo() }.
     Chemins relatifs à la racine des données (le préfixe essai/ est ajouté par salon-firebase.js).
     Chaque étape relit Firebase : aucune valeur locale n'est crue. Les échecs (règles, hors ligne) remontent à l'appelant. */
  function service(B) {
    function m1(chemin, val) { var u = {}; u[chemin] = val; return u; }
    async function saisonCourante() { var s = await B.lit('classe/saison'); return s && Number.isInteger(s.id) ? s : null; }
    /* Profil classé du joueur : créé s'il manque, remis à la nouvelle saison (instantané d'abord si placement fini),
       ligne du classement et récompenses tenues à jour. opts.stats(idSaison, saison) -> stats de l'instantané. */
    async function profil(opts) {
      opts = opts || {};
      var u = B.uid(), s = await saisonCourante(); if (!u || !s) return null;
      var j = await B.lit('classe/joueurs/' + u);
      if (!j) {
        var n = nouveauJoueur(s.id); n.maj = HORODATAGE;
        await B.ecrit(m1('classe/joueurs/' + u, n)); j = await B.lit('classe/joueurs/' + u);
      } else if (j.saison < s.id) {
        // 0.6.3 : instantané pour tout joueur (les trois modes) ; la récompense reste réservée au placement fini.
        if (!(await B.lit('classe/instantanes/' + j.saison + '/' + u))) {
          var st = opts.stats ? await opts.stats(j.saison) : {};
          await B.ecrit(m1('classe/instantanes/' + j.saison + '/' + u, sansNuls(instantaneSaison(j.saison, j, st))));
        }
        var r = nouvelleSaison(j, s.id); r.maj = HORODATAGE;
        await B.ecrit(m1('classe/joueurs/' + u, r));
        try { await B.ecrit(m1('classe/classement/' + u, null)); } catch (e) {}
        j = await B.lit('classe/joueurs/' + u);
      }
      try { await publieClassement(j); } catch (e) {}
      try { await recompenses(); } catch (e) {}
      return j;
    }
    async function publieClassement(j) {
      var u = B.uid(), l = j && B.pseudo ? ligneClassement(B.pseudo(), j) : null;
      if (!l || !l.pseudo) return false;
      var o = await B.lit('classe/classement/' + u);
      if (o && o.elo === l.elo && o.v === l.v && o.d === l.d && o.pseudo === l.pseudo && o.saison === l.saison) return false;
      await B.ecrit(m1('classe/classement/' + u, l)); return true;
    }
    /* Récompenses des saisons terminées : copie publique (classe/ecussons/<uid>/<s>) de ce que donne l'instantané. */
    async function recompenses() {
      var u = B.uid(), ss = await B.lit('classe/saisons'), deja = (await B.lit('classe/ecussons/' + u)) || {}, n = 0;
      for (var k in (ss || {})) {
        var id = +k; if (!Number.isInteger(id)) continue;
        var r = recompense(id, await B.lit('classe/instantanes/' + id + '/' + u)), o = deja[k];
        if (!r) continue;
        if (o && o.saison === r.saison && o.place === r.place && o.ecu === r.ecu) continue;
        await B.ecrit(m1('classe/ecussons/' + u + '/' + id, r)); n++;
      }
      return n;
    }
    /* Applique la partie id au profil de qui, une seule fois (déjà faite : true). */
    async function appliqueUn(id, qui) {
      var p = await B.lit('classe/parties/' + id); if (!p) return false;
      if (p.fait && p.fait[qui]) return true;
      var j = await B.lit('classe/joueurs/' + qui); if (!j) return false;
      try { await B.ecrit(application(qui, j, id, p)); } catch (e) { return false; }
      return true;
    }
    /* Applique la partie id au profil de qui (moi par défaut). Renvoie true si c'est fait (ou déjà fait).
       Partie entre joueurs reprise par son PERDANT (fin normale ou nouvel essai au chargement) : il confirme si besoin,
       applique sa partie puis celle du gagnant. Le gagnant n'écrit que la sienne, et seulement si le perdant a confirmé. */
    async function applique(id, qui) {
      var moi = B.uid(); qui = qui || moi;
      var p = await B.lit('classe/parties/' + id); if (!p) return false;
      if (qui === moi && p.robot !== true && p.gagnant !== 'nul' && perdantDe(p) === moi) {
        if (!(p.ok && p.ok[moi])) { try { await B.ecrit(confirmation(id, moi)); } catch (e) { return false; } }
        var fait = await appliqueUn(id, moi);
        try { await appliqueUn(id, p.gagnant); } catch (e) {}
        return fait;
      }
      return appliqueUn(id, qui);
    }
    /* Le gagnant d'une classée entre joueurs n'écrit rien : il écoute son profil jusqu'à ce que le perdant y ait appliqué la partie id.
       Relecture toutes les o.delai ms (1 500), o.essais fois (40, soit une minute). Renvoie le profil relu, ou null (partie restée en attente). */
    async function attends(id, o) {
      o = o || {};
      var u = B.uid(), n = o.essais || 40, d = o.delai || 1500;
      var pause = o.pause || function (ms) { return new Promise(function (r) { setTimeout(r, ms); }); };
      for (var i = 0; i < n; i++) {
        var j = await B.lit('classe/joueurs/' + u);
        if (j && (j.dern === id || await B.lit('classe/parties/' + id + '/fait/' + u))) return j;
        if (i < n - 1) await pause(d);
      }
      return null;
    }
    /* Fin d'une classée contre un robot (salons/<sa>/robot posé avant la partie). o = { sa, gr, niveau, gagne }. */
    async function finRobot(o) {
      var u = B.uid(), s = await saisonCourante(), j = await B.lit('classe/joueurs/' + u);
      if (!s || !j) throw new Error('classe/profil');
      var P = creePartieRobot({ sa: o.sa, gr: o.gr, a: u, profilA: j, niveau: o.niveau, gagne: o.gagne, saison: s.id });
      if (!(await B.lit('classe/parties/' + P.id))) await B.ecrit(m1('classe/parties/' + P.id, P.partie));
      var ok = await applique(P.id, u), n = await B.lit('classe/joueurs/' + u);
      try { await publieClassement(n); } catch (e) {}
      return { id: P.id, fait: ok, avant: j, apres: n, delta: ok && n ? n.elo - j.elo : P.partie.deltaA };
    }
    /* Fin d'une classée entre joueurs. o = { sa, gr, a, b, gagnant (uid de a ou de b, jamais de nul) }.
       UN SEUL côté écrit, le PERDANT (les règles n'acceptent la partie que confirmée par lui) : il crée la partie, confirme,
       applique sa partie puis celle du gagnant (il ne peut pas esquiver sa défaite). Le gagnant n'écrit rien (attente: true) :
       il écoute son profil (attends) ; s'il ne voit rien venir, la partie reste en attente et applique() est réessayé au chargement.
       Renvoie { id, fait, partie } (perdant) ou { id, fait: false, attente: true } (gagnant). */
    async function finJoueurs(o) {
      if (o.gagnant !== o.a && o.gagnant !== o.b) throw sansGagnant();
      var u = B.uid(), id = idPartie(o.sa, o.gr);
      if (u === o.gagnant) return { id: id, fait: false, attente: true };
      var p = await B.lit('classe/parties/' + id);
      if (!p) {
        var s = await saisonCourante(), pa = await B.lit('classe/joueurs/' + o.a), pb = await B.lit('classe/joueurs/' + o.b);
        if (!s || !pa || !pb) throw new Error('classe/profil');
        try { await B.ecrit(m1('classe/parties/' + id, creePartie({ sa: o.sa, gr: o.gr, a: o.a, b: o.b, profilA: pa, profilB: pb, gagnant: o.gagnant, saison: s.id }).partie)); } catch (e) {}
        p = await B.lit('classe/parties/' + id); if (!p) throw new Error('classe/partie');
      }
      var fait = await applique(id);
      try { await publieClassement(await B.lit('classe/joueurs/' + u)); } catch (e) {}
      return { id: id, fait: fait, partie: p };
    }
    /* 0.6.1 : victoire par forfait (salons/<sa>/forfait/<gr>.u = perdant, parti) : le GAGNANT crée la partie et applique
       les deux profils (la règle « confirme » accepte le forfait à la place de la confirmation du perdant). o comme finJoueurs. */
    async function finForfait(o) {
      if (o.gagnant !== o.a && o.gagnant !== o.b) throw sansGagnant();
      var u = B.uid(), id = idPartie(o.sa, o.gr), perd = o.gagnant === o.a ? o.b : o.a;
      if (u !== o.gagnant) return { id: id, fait: false };
      var p = await B.lit('classe/parties/' + id);
      if (!p) {
        var s = await saisonCourante(), pa = await B.lit('classe/joueurs/' + o.a), pb = await B.lit('classe/joueurs/' + o.b);
        if (!s || !pa || !pb) throw new Error('classe/profil');
        try { await B.ecrit(m1('classe/parties/' + id, creePartie({ sa: o.sa, gr: o.gr, a: o.a, b: o.b, profilA: pa, profilB: pb, gagnant: o.gagnant, saison: s.id }).partie)); } catch (e) {}
        p = await B.lit('classe/parties/' + id); if (!p) throw new Error('classe/partie');
      }
      var fait = await appliqueUn(id, u);
      try { await appliqueUn(id, perd); } catch (e) {}
      try { await publieClassement(await B.lit('classe/joueurs/' + u)); } catch (e) {}
      return { id: id, fait: fait, partie: p };
    }
    return { saisonCourante: saisonCourante, profil: profil, publieClassement: publieClassement, recompenses: recompenses,
      applique: applique, attends: attends, finRobot: finRobot, finJoueurs: finJoueurs, finForfait: finForfait };
  }

  var API = {
    HORODATAGE: HORODATAGE, numJour: numJour, idPartie: idPartie, creePartie: creePartie, creePartieRobot: creePartieRobot,
    confirmation: confirmation, application: application, salonClasse: salonClasse, niveauRobot: niveauRobot, salonRobot: salonRobot,
    ligneClassement: ligneClassement, sansNuls: sansNuls, service: service,
    ELO_DEPART: ELO_DEPART, K_DEBUT: K_DEBUT, K_ENSUITE: K_ENSUITE, PARTIES_K_DEBUT: PARTIES_K_DEBUT, PLACEMENT: PLACEMENT,
    ROBOTS_PAR_JOUR: ROBOTS_PAR_JOUR, RANGS: RANGS, ROBOTS: ROBOTS, SAISONS: SAISONS,
    rang: rang, enPlacement: enPlacement, facteurK: facteurK, attendu: attendu, variation: variation, appliquePartie: appliquePartie,
    nouveauJoueur: nouveauJoueur, affichage: affichage, rangEstime: rangEstime, robotPour: robotPour, estRobot: estRobot,
    jourParis: jourParis, robotsRestants: robotsRestants, peutAffronterRobot: peutAffronterRobot, compteRobot: compteRobot,
    classement: classement, eloRemise: eloRemise, nouvelleSaison: nouvelleSaison, saison: saison,
    metalEcu: metalEcu, nomMedaille: nomMedaille, imageMedaille: imageMedaille, imageEcu: imageEcu, recompense: recompense,
    instantaneSaison: instantaneSaison
  };
  if (typeof module !== 'undefined' && module.exports) module.exports = API;
  else racine.GolemsClasse = API;
})(typeof window !== 'undefined' ? window : this);
