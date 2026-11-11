// Parties classées et saisons (0.6) : profil classé, parties, classement, saisons, instantanés, écussons.
// r = racine des données ("root" ou "root.child('essai')"), voir 00-communs.js.
//
// FORMAT : celui de commun/classe.js (branche v06-classe), plus quelques champs exigés par les règles (marqués +) :
//   classe/saison = { id, nom, debut, fin }                         saison en cours (Romain seul)
//   classe/saisons/<id> = { nom, debut, fin }                        saisons terminées (Romain seul)
//   classe/joueurs/<uid> = { elo, parties, partiesTotal, v, d, maj, +saison, +dern, robots: { jour, +j, n } }
//     + saison = id de la saison du profil (remise à mi-chemin de 1000 quand la saison change)
//     + dern   = id de la dernière partie appliquée (chaque partie ne s'applique qu'une fois : parties/<id>/fait/<uid>)
//     + robots.j = numéro du jour de Paris (hiver) = floor((now + 3 600 000) / 86 400 000), vérifiable par les règles ;
//                  jour "AAAA-MM-JJ" reste pour l'affichage. 5 classées contre un robot par jour au plus.
//   classe/parties/<id> = { a, b, gagnant ("nul" possible), eloA, eloB, deltaA, deltaB (absent contre un robot), robot, saison, t,
//                           +sa (code du salon), +gr (graine, texte) , +ok/<uid> = true, +fait/<uid> = true }
//     id d'une partie entre joueurs = sa + "-" + gr ; contre un robot : libre (lettres, chiffres, tirets).
//     ok/<uid> : chaque joueur confirme le résultat. Une partie entre joueurs ne compte que si le PERDANT a confirmé
//     (ou s'il a été déclaré forfait dans le salon), un nul que si les deux ont confirmé : le gagnant ne peut pas s'inventer une victoire.
//     Le profil classé d'un joueur peut être mis à jour par lui OU par son adversaire (même calcul) : un perdant ne peut pas
//     esquiver sa défaite en ne publiant rien.
//   classe/classement/<uid> = { pseudo, elo, rang, v, d }  copie exacte du profil classé, placement fini seulement
//   classe/instantanes/<id>/<uid> = instantané de fin de saison (place : Romain seul)
//   classe/ecussons/<uid>/<id> = { saison, place?, ecu? }  récompense publique : médaille de saison (placement fini), écu pour un top 10
//
// RESTE FALSIFIABLE sans Cloud Functions : la valeur exacte du delta (bornée par K, signe imposé par le résultat, pas la formule) ;
// le résultat d'une partie contre un robot (déclaré par le joueur : gain borné à K/2, 5 par jour) ; un tricheur qui refuse
// de confirmer sa défaite bloque la partie pour les deux (sauf forfait) ; le jour de Paris suit l'heure d'hiver (décalage d'1 h l'été).
const { COMPTE, ROMAIN, MAINTENANT, CODE, racineApres, pseudoReel } = require('./00-communs');

const ENTIER = "newData.isNumber() && newData.val() % 1 === 0 && newData.val() >= 0";
const JOUR = 86400000, DECALAGE = 3600000;
// Rang d'après un Elo (seuils validés le 9 nov.).
const rangDe = e => `(${e} >= 1400 ? 'diamant' : ${e} >= 1250 ? 'rubis' : ${e} >= 1150 ? 'emeraude' : ${e} >= 1050 ? 'saphir' : ${e} >= 950 ? 'topaze' : 'amethyste')`;
// Elo fixe des robots.
const eloRobot = b => `(${b} === 'robot-facile' ? 750 : ${b} === 'robot-normal' ? 1100 : ${b} === 'robot-difficile' ? 1200 : -1)`;
// Le nombre j est le jour en cours (heure de Paris en hiver).
const aujourdhui = j => `(${j} * ${JOUR} <= now + ${DECALAGE} && now + ${DECALAGE} < (${j} + 1) * ${JOUR})`;

module.exports = r => {
  const C = `${r}.child('classe')`;
  const COURANTE = `${C}.child('saison').child('id').val()`;
  const J = u => `${C}.child('joueurs').child(${u})`;
  const SALON = s => `${r}.child('salons').child(${s})`;

  // ----- Profil classé : les trois cas permis -----
  const n = k => `newData.child('${k}').val()`, o = k => `data.child('${k}').val()`;
  const creation = `!data.exists() && auth.uid === $uid && ${n('elo')} === 1000 && ${n('parties')} === 0 && ${n('partiesTotal')} === 0 && ${n('v')} === 0 && ${n('d')} === 0 && ${n('saison')} === ${COURANTE} && !newData.hasChild('dern') && !newData.hasChild('robots')`;
  // Nouvelle saison : Elo à mi-chemin de 1000 (arrondi libre à 0,5 près), compteurs de saison à zéro ; instantané d'abord si placement fini.
  const remise = `data.exists() && auth.uid === $uid && ${o('saison')} < ${COURANTE} && ${n('saison')} === ${COURANTE} && ${n('parties')} === 0 && ${n('v')} === 0 && ${n('d')} === 0 && ${n('partiesTotal')} === ${o('partiesTotal')} && ${n('elo')} - (1000 + (${o('elo')} - 1000) / 2) <= 0.5 && (1000 + (${o('elo')} - 1000) / 2) - ${n('elo')} <= 0.5 && !newData.hasChild('dern') && (${o('parties')} < 5 || ${C}.child('instantanes').child(${o('saison')} + '').child($uid).exists()) && newData.child('robots').child('j').val() === data.child('robots').child('j').val() && newData.child('robots').child('n').val() === data.child('robots').child('n').val()`;
  // Partie : P = la partie appliquée (déjà écrite), une seule fois (fait/<uid> posé dans la même écriture).
  const P = `${C}.child('parties').child(${n('dern')})`;
  const pv = k => `${P}.child('${k}').val()`;
  const estA = `${pv('a')} === $uid`;
  const delta = `(${n('elo')} - ${o('elo')})`;
  const kmax = `((${o('partiesTotal')} < 30 ? 32 : 20) * (${o('parties')} < 5 ? 2 : 1) / (${pv('robot')} === true ? 2 : 1))`;
  const g = pv('gagnant');
  const perdant = `(${pv('a')} === ${g} ? ${pv('b')} : ${pv('a')})`;
  const confirme = `(${pv('robot')} === true || (${g} === 'nul' ? (${P}.child('ok').child(${pv('a')}).exists() && ${P}.child('ok').child(${pv('b')}).exists()) : (${P}.child('ok').child(${perdant}).exists() || ${SALON(pv('sa'))}.child('forfait').child(${pv('gr')}).child('u').val() === ${perdant})))`;
  const resultat = `((${g} === $uid && ${delta} >= 0 && ${delta} <= ${kmax} && ${n('v')} === ${o('v')} + 1 && ${n('d')} === ${o('d')}) || (${g} !== $uid && ${g} !== 'nul' && ${delta} <= 0 && -${delta} <= ${kmax} && ${n('v')} === ${o('v')} && ${n('d')} === ${o('d')} + 1) || (${g} === 'nul' && ${delta} <= ${kmax} && -${delta} <= ${kmax} && ${n('v')} === ${o('v')} && ${n('d')} === ${o('d')}))`;
  const rn = k => `newData.child('robots').child('${k}').val()`, ro = k => `data.child('robots').child('${k}').val()`;
  const robots = `(${pv('robot')} === true ? (${rn('n')} <= 5 && (${rn('j')} === ${ro('j')} ? ${rn('n')} === ${ro('n')} + 1 : (${rn('n')} === 1 && ${aujourdhui(rn('j'))}))) : (${rn('j')} === ${ro('j')} && ${rn('n')} === ${ro('n')}))`;
  const partie = `data.exists() && ${o('saison')} === ${COURANTE} && ${n('saison')} === ${COURANTE} && newData.hasChild('dern') && ${n('dern')} !== ${o('dern')} && ${P}.exists() && ${pv('saison')} === ${COURANTE} && (${estA} || ${pv('b')} === $uid) && !${P}.child('fait').child($uid).exists() && ${racineApres(3)}.child('classe').child('parties').child(${n('dern')}).child('fait').child($uid).exists() && ((${estA} && ${pv('deltaA')} === ${delta}) || (!(${estA}) && ${pv('deltaB')} === ${delta})) && ${n('parties')} === ${o('parties')} + 1 && ${n('partiesTotal')} === ${o('partiesTotal')} + 1 && ${resultat} && ${confirme} && ${robots}`;

  // ----- Création d'une partie -----
  const nv = k => `newData.child('${k}').val()`;
  const commune = `!data.exists() && ${nv('saison')} === ${COURANTE} && newData.child('t').val() === now && ${SALON(nv('sa'))}.child('cl').val() === true`;
  const contreRobot = `${nv('robot')} === true && ${nv('a')} === auth.uid && ${nv('eloB')} === ${eloRobot(nv('b'))} && ${nv('eloA')} === ${J(nv('a'))}.child('elo').val() && ${J(nv('a'))}.child('saison').val() === ${COURANTE} && ${SALON(nv('sa'))}.child('robot').child('u').val() === auth.uid && !newData.hasChild('deltaB') && (${nv('gagnant')} === ${nv('a')} || ${nv('gagnant')} === ${nv('b')})`;
  const entreJoueurs = `${nv('robot')} === false && $id === ${nv('sa')} + '-' + ${nv('gr')} && ${SALON(nv('sa'))}.child('engages').child('g').val() === ${nv('gr')} && (${nv('a')} === auth.uid || ${nv('b')} === auth.uid) && ${nv('a')} !== ${nv('b')} && ${SALON(nv('sa'))}.child('engages').hasChild(${nv('a')}) && ${SALON(nv('sa'))}.child('engages').hasChild(${nv('b')}) && ${nv('eloA')} === ${J(nv('a'))}.child('elo').val() && ${nv('eloB')} === ${J(nv('b'))}.child('elo').val() && ${J(nv('a'))}.child('saison').val() === ${COURANTE} && ${J(nv('b'))}.child('saison').val() === ${COURANTE} && newData.hasChild('deltaB') && (${nv('gagnant')} === ${nv('a')} || ${nv('gagnant')} === ${nv('b')})`;
  const PA = `${C}.child('parties').child($id)`;

  // ----- Instantané et écusson -----
  const JI = J('$uid');
  const inst = `${C}.child('instantanes').child($s).child($uid)`;

  return {
    "classe": {
      // Saison en cours et saisons terminées : lecture libre, écriture par Romain.
      "saison": {
        ".read": true,
        ".write": ROMAIN,
        ".validate": "newData.hasChildren(['id', 'nom', 'debut'])",
        "id": { ".validate": `${ENTIER} && newData.val() <= 999` },
        "nom": { ".validate": "newData.isString() && newData.val().length >= 1 && newData.val().length <= 40" },
        "debut": { ".validate": "newData.isNumber()" },
        "fin": { ".validate": "newData.isNumber()" },
        "$autre": { ".validate": false }
      },
      "saisons": {
        ".read": true,
        ".write": ROMAIN,
        "$s": {
          ".validate": "$s.matches(/^[0-9]{1,3}$/) && newData.hasChildren(['nom', 'debut'])",
          "nom": { ".validate": "newData.isString() && newData.val().length >= 1 && newData.val().length <= 40" },
          "debut": { ".validate": "newData.isNumber()" },
          "fin": { ".validate": "newData.isNumber()" },
          "$autre": { ".validate": false }
        }
      },

      // Profil classé de la saison en cours. Lisible par tout compte ; jamais effacé par un joueur.
      "joueurs": {
        ".read": COMPTE,
        "$uid": {
          ".write": `${COMPTE} && newData.exists() && (auth.uid === $uid || (newData.hasChild('dern') && (${C}.child('parties').child(newData.child('dern').val()).child('a').val() === auth.uid || ${C}.child('parties').child(newData.child('dern').val()).child('b').val() === auth.uid)))`,
          ".validate": `newData.hasChildren(['elo', 'parties', 'partiesTotal', 'v', 'd', 'saison', 'maj']) && ((${creation}) || (${remise}) || (${partie}))`,
          "elo": { ".validate": "newData.isNumber() && newData.val() >= 0 && newData.val() <= 5000" },
          "parties": { ".validate": `${ENTIER} && newData.val() <= 100000` },
          "partiesTotal": { ".validate": `${ENTIER} && newData.val() <= 100000` },
          "v": { ".validate": `${ENTIER}` },
          "d": { ".validate": `${ENTIER}` },
          "saison": { ".validate": `${ENTIER}` },
          "dern": { ".validate": "newData.isString() && newData.val().matches(/^[a-z0-9-]{3,60}$/)" },
          "maj": { ".validate": MAINTENANT },
          "robots": {
            ".validate": "newData.hasChildren(['jour', 'j', 'n'])",
            "jour": { ".validate": "newData.isString() && newData.val().matches(/^[0-9]{4}-[0-9]{2}-[0-9]{2}$/)" },
            "j": { ".validate": `${ENTIER}` },
            "n": { ".validate": `${ENTIER} && newData.val() >= 1 && newData.val() <= 5` },
            "$autre": { ".validate": false }
          },
          "$autre": { ".validate": false }
        }
      },

      // Parties classées : créées une fois par un des joueurs, jamais modifiées ni effacées ; ok/ et fait/ ajoutés une fois.
      "parties": {
        ".read": COMPTE,
        "$id": {
          ".write": `${COMPTE} && newData.exists() && ${commune} && ((${contreRobot}) || (${entreJoueurs}))`,
          ".validate": "$id.matches(/^[a-z0-9-]{3,60}$/) && newData.hasChildren(['a', 'b', 'gagnant', 'eloA', 'eloB', 'deltaA', 'robot', 'saison', 't', 'sa', 'gr'])",
          "a": { ".validate": "newData.isString() && newData.val().length <= 128" },
          "b": { ".validate": "newData.isString() && newData.val().length <= 128" },
          "gagnant": { ".validate": "newData.isString() && newData.val().length <= 128" },
          "eloA": { ".validate": "newData.isNumber()" },
          "eloB": { ".validate": "newData.isNumber()" },
          "deltaA": { ".validate": "newData.isNumber() && newData.val() % 1 === 0 && newData.val() >= -64 && newData.val() <= 64" },
          "deltaB": { ".validate": "newData.isNumber() && newData.val() % 1 === 0 && newData.val() >= -64 && newData.val() <= 64" },
          "robot": { ".validate": "newData.isBoolean()" },
          "saison": { ".validate": `${ENTIER}` },
          "t": { ".validate": "newData.isNumber()" },
          "sa": { ".validate": `newData.isString() && newData.val().matches(${CODE})` },
          "gr": { ".validate": "newData.isString() && newData.val().matches(/^-?[0-9]{1,12}$/)" },
          // Confirmation du résultat par chaque joueur (une fois).
          "ok": {
            "$u": {
              ".write": `${COMPTE} && auth.uid === $u && !data.exists() && (${PA}.child('a').val() === $u || ${PA}.child('b').val() === $u)`,
              ".validate": "newData.val() === true"
            }
          },
          // Partie appliquée au profil classé de $u (posé dans la même écriture que ce profil).
          "fait": {
            "$u": {
              ".write": `${COMPTE} && !data.exists() && (${PA}.child('a').val() === auth.uid || ${PA}.child('b').val() === auth.uid) && (${PA}.child('a').val() === $u || ${PA}.child('b').val() === $u)`,
              ".validate": `newData.val() === true && ${racineApres(5)}.child('classe').child('joueurs').child($u).child('dern').val() === $id`
            }
          },
          "$autre": { ".validate": false }
        }
      },

      // Classement de la saison (lecture publique, invités compris) : copie exacte du profil classé (placement fini), écrite par n'importe quel compte
      // (une copie ne peut être que juste) ; retirée seulement quand le joueur n'a plus fini son placement (nouvelle saison).
      "classement": {
        ".read": true,
        "$uid": {
          ".write": `${COMPTE} && (newData.exists() || !${racineApres(3)}.child('classe').child('joueurs').child($uid).exists() || ${racineApres(3)}.child('classe').child('joueurs').child($uid).child('parties').val() < 5)`,
          ".validate": `newData.hasChildren(['pseudo', 'elo', 'rang', 'v', 'd', 'saison']) && newData.child('saison').val() === ${racineApres(3)}.child('classe').child('saison').child('id').val() && ${racineApres(3)}.child('classe').child('joueurs').child($uid).child('parties').val() >= 5 && newData.child('elo').val() === ${racineApres(3)}.child('classe').child('joueurs').child($uid).child('elo').val() && newData.child('v').val() === ${racineApres(3)}.child('classe').child('joueurs').child($uid).child('v').val() && newData.child('d').val() === ${racineApres(3)}.child('classe').child('joueurs').child($uid).child('d').val() && newData.child('rang').val() === ${rangDe("newData.child('elo').val()")}`,
          "pseudo": { ".validate": `newData.isString() && ${pseudoReel(r, '$uid')}` },
          "elo": { ".validate": "newData.isNumber()" },
          "rang": { ".validate": "newData.isString()" },
          "v": { ".validate": "newData.isNumber()" },
          "d": { ".validate": "newData.isNumber()" },
          // 0.6.1 : saison de la ligne (lignes d'une saison passée ignorées à la lecture).
          "saison": { ".validate": "newData.isNumber()" },
          "$autre": { ".validate": false }
        }
      },

      // Instantanés de fin de saison : posés une fois par le joueur après la fin de la saison (avant sa remise),
      // Elo et rang = ceux de son profil classé ; la place finale est posée par Romain seul.
      "instantanes": {
        ".read": COMPTE,
        "$s": {
          "$uid": {
            ".write": `${ROMAIN} || (${COMPTE} && auth.uid === $uid && !data.exists() && newData.exists() && $s.matches(/^[0-9]{1,3}$/) && ${JI}.child('saison').val() + '' === $s && ${COURANTE} > ${JI}.child('saison').val() && newData.child('elo').val() === ${JI}.child('elo').val() && newData.child('placementFini').val() === (${JI}.child('parties').val() >= 5) && !newData.hasChild('place'))`,
            ".validate": `newData.hasChildren(['saison', 'elo', 'rang', 'placementFini']) && newData.child('saison').val() + '' === $s && newData.child('rang').val() === ${rangDe("newData.child('elo').val()")}`,
            "saison": { ".validate": `${ENTIER}` },
            "elo": { ".validate": "newData.isNumber()" },
            "rang": { ".validate": "newData.isString()" },
            "place": { ".validate": `${ENTIER} && newData.val() >= 1` },
            "placementFini": { ".validate": "newData.isBoolean()" },
            // 0.6.3 : les trois modes ET les niveaux du robot ; par mode : r (10 dernières), el (éléments en %), tops 5 dk, cb, mv (comme profils/pm).
            "modes": { "$m": { ".validate": "$m.matches(/^(classee|amicale|entrainement|facile|normal|difficile)$/) && newData.hasChildren(['parties', 'v', 'd'])", "r": { ".validate": "newData.isString() && newData.val().matches(/^[VDN]{0,10}$/)" }, "el": { "$e": { ".validate": "$e.matches(/^[a-z]{1,12}$/) && newData.isNumber() && newData.val() >= 0 && newData.val() <= 100" } }, "dk": { "$i": { ".validate": "$i.matches(/^[0-4]$/) && newData.hasChildren(['nom', 'n', 'v'])", "nom": { ".validate": "newData.isString() && newData.val().length >= 1 && newData.val().length <= 40" }, "e": { ".validate": "newData.isString() && newData.val().length <= 80" }, "n": { ".validate": ENTIER }, "v": { ".validate": ENTIER }, "$autre": { ".validate": false } } }, "cb": { "$i": { ".validate": "$i.matches(/^[0-4]$/) && newData.hasChildren(['c', 'n', 'v'])", "c": { ".validate": "newData.isString() && newData.val().matches(/^[0-9]{3}e?$/)" }, "n": { ".validate": ENTIER }, "v": { ".validate": ENTIER }, "$autre": { ".validate": false } } }, "mv": { "$i": { ".validate": "$i.matches(/^[0-4]$/) && newData.hasChildren(['c', 'n'])", "c": { ".validate": "newData.isString() && newData.val().matches(/^[0-9]{3}e?$/)" }, "n": { ".validate": ENTIER }, "$autre": { ".validate": false } } }, "parties": { ".validate": ENTIER }, "v": { ".validate": ENTIER }, "d": { ".validate": ENTIER }, "best": { ".validate": ENTIER }, "serie": { ".validate": "newData.isNumber() && newData.val() % 1 === 0 && newData.val() >= -1000 && newData.val() <= 1000" }, "$autre": { ".validate": false } } },
            "dernieres": { "$i": { ".validate": "$i.matches(/^[0-9]$/)", "mode": { ".validate": "newData.isString() && newData.val().length <= 20" }, "gagne": { ".validate": "newData.isBoolean()" }, "adv": { ".validate": "newData.isString() && newData.val().length <= 40" }, "t": { ".validate": "newData.isNumber()" }, "$autre": { ".validate": false } } },
            // Tops 5 : golems, terrains (id, n, v), decks (nom, e = éléments, n, v), mvp (id, n).
            "tops": { "$k": { ".validate": "$k.matches(/^(golems|terrains|decks|mvp)$/)", "$i": { ".validate": "$i.matches(/^[0-4]$/) && newData.hasChild('n')", "id": { ".validate": "newData.isString() && newData.val().length <= 12" }, "nom": { ".validate": "newData.isString() && newData.val().length >= 1 && newData.val().length <= 40" }, "e": { ".validate": "newData.isString() && newData.val().matches(/^[a-z,]{0,40}$/)" }, "n": { ".validate": ENTIER }, "v": { ".validate": ENTIER }, "$autre": { ".validate": false } } } },
            "elements": { "$e": { ".validate": "$e.matches(/^[a-z]{1,12}$/)", "n": { ".validate": ENTIER }, "v": { ".validate": ENTIER }, "$autre": { ".validate": false } } },
            "$autre": { ".validate": false }
          }
        }
      },

      // Récompenses de saison (règle du 9 nov. 2026), lecture publique (profils, invités compris) : { saison, place?, ecu? }
      // posées par le joueur d'après son instantané (placement fini = médaille ronde de la saison, Saison 0 = Pionnier),
      // ou par Romain. Un top 10 reçoit EN PLUS un écu : place = celle posée par Romain dans l'instantané, or 1, argent 2-3, bronze 4-10.
      "ecussons": {
        ".read": true,
        "$uid": {
          "$s": {
            ".write": `${ROMAIN} || (${COMPTE} && auth.uid === $uid && newData.exists())`,
            ".validate": `newData.hasChild('saison') && newData.child('saison').val() + '' === $s && ${inst}.child('placementFini').val() === true && (newData.hasChild('place') === newData.hasChild('ecu')) && (!newData.hasChild('place') || (newData.child('place').val() === ${inst}.child('place').val() && newData.child('ecu').val() === (newData.child('place').val() === 1 ? 'or' : newData.child('place').val() <= 3 ? 'argent' : 'bronze')))`,
            "saison": { ".validate": ENTIER },
            "place": { ".validate": `${ENTIER} && newData.val() >= 1 && newData.val() <= 10` },
            "ecu": { ".validate": "newData.isString() && newData.val().matches(/^(or|argent|bronze)$/)" },
            "$autre": { ".validate": false }
          }
        }
      }
    }
  };
};

module.exports.aujourdhui = aujourdhui;
