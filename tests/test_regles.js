// Tests des règles de la Realtime Database contre l'émulateur local (lancer_emulateur.ps1 d'abord).
// API REST de l'émulateur : Auth 9099, Database 9000, projet demo-les-golems. Rien ne part en ligne.
// Usage : node tests/test_regles.js
// Chaque test est joué deux fois : site public (préfixe "") et site d'essai (préfixe "essai/").

const PORT_AUTH = process.env.GOLEMS_EMU_AUTH || '9099', PORT_DB = process.env.GOLEMS_EMU_DB || '9000';
const AUTH = 'http://127.0.0.1:' + PORT_AUTH + '/identitytoolkit.googleapis.com/v1/accounts:signUp?key=demo';
const DB = 'http://127.0.0.1:' + PORT_DB;
const NS = 'ns=demo-les-golems-default-rtdb';
const HEURE = { '.sv': 'timestamp' };

let ok = 0, ko = 0;
const echecs = [];

async function compte(email) {
  const corps = email ? { email, password: 'code-secret', returnSecureToken: true } : { returnSecureToken: true };
  const r = await fetch(AUTH, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(corps) });
  const j = await r.json();
  if (!j.idToken) throw new Error('Auth : ' + JSON.stringify(j));
  return { uid: j.localId, jeton: j.idToken };
}

// Requête REST : qui = compte (jeton) ou 'admin' (contourne les règles).
async function req(qui, methode, chemin, corps) {
  const auth = qui === 'admin' ? '' : '&auth=' + qui.jeton;
  const h = qui === 'admin' ? { Authorization: 'Bearer owner' } : {};
  const r = await fetch(`${DB}/${chemin}.json?${NS}${auth}`, { method: methode, headers: h, body: corps === undefined ? undefined : JSON.stringify(corps) });
  await r.text();
  return r.status === 200;
}

async function attendu(nom, voulu, promesse) {
  const permis = await promesse;
  if (permis === voulu) ok++;
  else { ko++; echecs.push(`${nom} : ${voulu ? 'refusé, attendu AUTORISÉ' : 'autorisé, attendu REFUSÉ'}`); }
}

async function scenario(P) {
  const t = Date.now() + Math.floor(Math.random() * 1000);
  const tag = P ? 'essai' : 'public';
  const ici = n => `[${tag}] ${n}`;
  const A = await compte(`a${t}${tag}@test.invalid`), B = await compte(`b${t}${tag}@test.invalid`);
  const X = await compte(`x${t}${tag}@test.invalid`), G = await compte(null);
  const nom = s => s + (t % 100000);
  const pA = nom('Alice'), pB = nom('Bob'), pX = nom('Xav');

  // Comptes : pseudo réservé et pseudo du compte dans la même écriture (comme firebase/compte.js creer()).
  for (const [u, p] of [[A, pA], [B, pB], [X, pX]]) {
    await attendu(ici('création du compte ' + p), true,
      req(u, 'PATCH', '', { [P + 'pseudos/' + p.toLowerCase()]: u.uid, [P + 'joueurs/' + u.uid + '/pseudo']: p, [P + 'joueurs/' + u.uid + '/cree']: t }));
  }
  // Usurpation de pseudo.
  await attendu(ici('usurpation : pseudo d\'un autre dans joueurs/'), false, req(X, 'PUT', P + 'joueurs/' + X.uid + '/pseudo', pA));
  await attendu(ici('usurpation : pseudo non réservé dans joueurs/'), false, req(X, 'PUT', P + 'joueurs/' + X.uid + '/pseudo', nom('Libre')));
  await attendu(ici('usurpation : réserver un pseudo déjà pris'), false, req(X, 'PUT', P + 'pseudos/' + pA.toLowerCase(), X.uid));
  await attendu(ici('stats de départ de X'), true, req(X, 'PUT', P + 'joueurs/' + X.uid + '/stats', { v: 0, n: 1 }));
  await attendu(ici('usurpation : pseudo d\'un autre dans classement/'), false, req(X, 'PUT', P + 'classement/' + X.uid, { p: pA, v: 0, n: 1 }));
  await attendu(ici('classement de X sous son pseudo'), true, req(X, 'PUT', P + 'classement/' + X.uid, { p: pX, v: 0, n: 1 }));

  // Compte de plus de 50 parties sans stats publiées (PAS_MAX = 50) : écriture directe refusée, paliers de 50 acceptés
  // (firebase/compte.js ecritStats), puis classement et profil publiés.
  const Y = await compte(`y${t}${tag}@test.invalid`), pY = nom('Yan');
  await attendu(ici('création du compte ' + pY), true, req(Y, 'PATCH', '', { [P + 'pseudos/' + pY.toLowerCase()]: Y.uid, [P + 'joueurs/' + Y.uid + '/pseudo']: pY, [P + 'joueurs/' + Y.uid + '/cree']: t }));
  await attendu(ici('stats 120 parties en une écriture'), false, req(Y, 'PUT', P + 'joueurs/' + Y.uid + '/stats', { v: 70, n: 120 }));
  await attendu(ici('stats palier 50'), true, req(Y, 'PUT', P + 'joueurs/' + Y.uid + '/stats', { v: 0, n: 50 }));
  await attendu(ici('stats palier 100'), true, req(Y, 'PUT', P + 'joueurs/' + Y.uid + '/stats', { v: 50, n: 100 }));
  await attendu(ici('stats palier 120'), true, req(Y, 'PUT', P + 'joueurs/' + Y.uid + '/stats', { v: 70, n: 120 }));
  await attendu(ici('classement 120 parties'), true, req(Y, 'PUT', P + 'classement/' + Y.uid, { p: pY, v: 70, n: 120 }));
  await attendu(ici('profil 120 parties'), true, req(Y, 'PUT', P + 'profils/' + Y.uid, { p: pY, m: false, n: 120, v: 70, d: 50, t: HEURE }));

  // Profil et deck.
  await attendu(ici('avatar'), true, req(A, 'PATCH', P + 'joueurs/' + A.uid, { avatarId: 'golem-1', avatarImg: null }));
  await attendu(ici('deck'), true, req(A, 'PUT', P + 'joueurs/' + A.uid + '/decks', { 0: { id: 'd1', nom: 'Mon deck', cartes: { '001': 2, '002e': 1 }, t } }));
  await attendu(ici('profil de départ (0 partie)'), true, req(A, 'PUT', P + 'profils/' + A.uid, { p: pA, m: false, n: 0, v: 0, d: 0, t: HEURE }));

  // Salon : A crée, B prend le siège puis rejoint, partie engagée.
  const code = 's' + (t % 1000000).toString(36);
  const S = P + 'salons/' + code;
  await attendu(ici('accueil (hall)'), true, req(A, 'PUT', P + 'hall/' + A.uid, { pseudo: pA, t: HEURE }));
  await attendu(ici('siège dans un salon vide (étranger)'), false, req(X, 'PUT', P + 'salons/vide' + (t % 1000) + '/siege', X.uid));
  await attendu(ici('A entre dans le salon'), true, req(A, 'PUT', S + '/joueurs/' + A.uid, { pseudo: pA, sid: 'sa', arrivee: t, v: '0.5|1', t: HEURE }));
  await attendu(ici('activite du salon'), true, req(A, 'PUT', P + 'activite/' + code, HEURE));
  await attendu(ici('annonce'), true, req(A, 'PUT', P + 'annonces/' + code, { u: A.uid, p: pA, d: 'Mon deck', e: 'brume', t: HEURE }));
  await attendu(ici('B prend le siège'), true, req(B, 'PUT', S + '/siege', B.uid));
  await attendu(ici('siège déjà pris (étranger)'), false, req(X, 'PUT', S + '/siege', X.uid));
  await attendu(ici('B entre dans le salon'), true, req(B, 'PUT', S + '/joueurs/' + B.uid, { pseudo: pB, sid: 'sb', t: HEURE }));
  await attendu(ici('présence de connexion'), true, req(A, 'PUT', S + '/pres/' + A.uid, { c: true, t: HEURE }));
  { /* activite : aussi avec pres/<uid> seul (joueurs/<uid> effacé à la coupure, renvoi du SDK) ; pres/<uid> écrit par ce seul uid */
    const c2 = code + 'p', S2 = P + 'salons/' + c2;
    await attendu(ici('pres d un autre uid (étranger)'), false, req(X, 'PUT', S2 + '/pres/' + A.uid, { c: false, t: HEURE }));
    await attendu(ici('pres sans joueurs'), true, req(A, 'PUT', S2 + '/pres/' + A.uid, { c: false, t: HEURE }));
    await attendu(ici('activite avec pres seul'), true, req(A, 'PUT', P + 'activite/' + c2, HEURE));
    await attendu(ici('activite sans pres ni joueurs (autre uid)'), false, req(X, 'PUT', P + 'activite/' + c2, HEURE));
    /* annonce et cree : de même avec pres/<uid> seul (réannonce / cree renvoyés par le SDK après coupure), pour son propre uid seulement */
    await attendu(ici('annonce avec pres seul'), true, req(A, 'PUT', P + 'annonces/' + c2, { u: A.uid, p: pA, t: HEURE }));
    await attendu(ici('annonce sans pres ni joueurs (autre uid)'), false, req(X, 'PUT', P + 'annonces/' + c2, { u: X.uid, p: pX, t: HEURE }));
    await attendu(ici('annonce au nom d un autre uid (pres de A)'), false, req(X, 'PUT', P + 'annonces/' + c2, { u: A.uid, p: pA, t: HEURE }));
    await attendu(ici('cree sans pres ni joueurs (autre uid)'), false, req(X, 'PUT', S2 + '/cree', HEURE));
    await attendu(ici('cree avec pres seul'), true, req(A, 'PUT', S2 + '/cree', HEURE));
    await attendu(ici('hote sans pres ni joueurs (autre uid)'), false, req(X, 'PUT', S2 + '/hote', X.uid));
    await attendu(ici('hote avec pres seul'), true, req(A, 'PUT', S2 + '/hote', A.uid));
    await attendu(ici('cl par un autre uid (pas hote)'), false, req(X, 'PUT', S2 + '/cl', true));
    await attendu(ici('cl avec pres seul (hote)'), true, req(A, 'PUT', S2 + '/cl', true));
  }
  await attendu(ici('engagement de la partie'), true, req(A, 'PUT', S + '/engages', { [A.uid]: true, [B.uid]: true }));
  await attendu(ici('coup de A'), true, req(A, 'POST', S + '/coups', { a: A.uid, s: 'sa', g: 5, n: 0, c: 'p1' }));
  await attendu(ici('coup de B'), true, req(B, 'POST', S + '/coups', { a: B.uid, s: 'sb', g: 5, n: 0, c: 'p2' }));
  // Clé fixe (sid_graine_rang, b9384c0) : première écriture permise, renvoi sur la même clé refusé (ajout seul).
  await attendu(ici('coup de A sur clé fixe à son uid'), true, req(A, 'PUT', S + '/coups/' + A.uid + '_sa_5_1', { a: A.uid, s: 'sa', g: 5, n: 1, c: 'p1' }));
  await attendu(ici('coup de A renvoyé sur la même clé fixe'), false, req(A, 'PUT', S + '/coups/' + A.uid + '_sa_5_1', { a: A.uid, s: 'sa', g: 5, n: 1, c: 'p1' }));
  await attendu(ici('coup de A sur clé préfixée par l uid de B'), false, req(A, 'PUT', S + '/coups/' + B.uid + '_sb_5_1', { a: A.uid, s: 'sa', g: 5, n: 2, c: 'p1' }));
  await attendu(ici('coup de A sur clé sans préfixe (ancien format)'), false, req(A, 'PUT', S + '/coups/sa_5_2', { a: A.uid, s: 'sa', g: 5, n: 2, c: 'p1' }));
  await attendu(ici('coup de A sur clé push explicite'), true, req(A, 'PUT', S + '/coups/-Nzzpush01', { a: A.uid, s: 'sa', g: 5, n: 2, c: 'p1' }));
  await attendu(ici('réécriture sur une clé push existante'), false, req(A, 'PUT', S + '/coups/-Nzzpush01', { a: A.uid, s: 'sa', g: 5, n: 2, c: 'p9' }));
  await attendu(ici('coup au nom d\'un autre'), false, req(X, 'POST', S + '/coups', { a: X.uid, s: 'sx', g: 5, n: 0, c: 'p3' }));
  await attendu(ici('chat'), true, req(A, 'POST', S + '/chat', { a: A.uid, p: pA, t: HEURE, m: 'Bonne partie' }));
  await attendu(ici('spectateur X'), true, req(X, 'PUT', S + '/spectateurs/' + X.uid, { p: pX, t: HEURE }));
  await attendu(ici('chat du spectateur'), true, req(X, 'POST', S + '/chat', { a: X.uid, p: pX, t: HEURE, m: 'Allez' }));
  await attendu(ici('siège après engagement (spectateur non engagé)'), false, req(X, 'PUT', S + '/siege', X.uid));

  // Fin de partie (ordre de firebase/compte.js : historique, cumul, stats, classement, profil ; resume à part).
  const id = '5-' + t;
  await attendu(ici('historique'), true, req(A, 'PATCH', P + 'joueurs/' + A.uid + '/historique', { [id]: { d: t, x: '{"id":"' + id + '"}' } }));
  await attendu(ici('cumul'), true, req(A, 'PUT', P + 'joueurs/' + A.uid + '/cumul', '{"n":1}'));
  await attendu(ici('stats +1'), true, req(A, 'PUT', P + 'joueurs/' + A.uid + '/stats', { v: 1, n: 1 }));
  await attendu(ici('classement +1'), true, req(A, 'PUT', P + 'classement/' + A.uid, { p: pA, v: 1, n: 1 }));
  await attendu(ici('profil +1'), true, req(A, 'PUT', P + 'profils/' + A.uid, { p: pA, m: false, n: 1, v: 1, d: 0, t: HEURE }));
  await attendu(ici('profil privé'), true, req(A, 'PUT', P + 'profils/' + A.uid, { p: pA, m: true, n: 1, v: 1, d: 0, t: HEURE }));
  const resume = { d: HEURE, v: '0.5', m: 'ligne', g: 0, pg: true, a: false, k0: '0012', k1: '', e0: 'brume', e1: '', s0: 3, s1: 1, mvp: '001', t: { 0: { n: 'Terrain', r: '0', q: 2 } } };
  await attendu(ici('resume de la partie'), true, req(A, 'PUT', P + 'resume/' + id, resume));
  await attendu(ici('resume réécrit'), false, req(A, 'PUT', P + 'resume/' + id, resume));
  // Partie suivante : +1 encore, puis import de 12 parties d'un coup (autorisé, saut de 50 au plus).
  await attendu(ici('stats partie 2'), true, req(A, 'PUT', P + 'joueurs/' + A.uid + '/stats', { v: 1, n: 2 }));
  await attendu(ici('stats import de 12 parties'), true, req(A, 'PUT', P + 'joueurs/' + A.uid + '/stats', { v: 5, n: 14 }));
  await attendu(ici('classement après import'), true, req(A, 'PUT', P + 'classement/' + A.uid, { p: pA, v: 5, n: 14 }));
  // Triches sur les statistiques.
  await attendu(ici('stats +500'), false, req(A, 'PUT', P + 'joueurs/' + A.uid + '/stats', { v: 5, n: 514 }));
  await attendu(ici('stats victoires +3 pour 1 partie'), false, req(A, 'PUT', P + 'joueurs/' + A.uid + '/stats', { v: 8, n: 15 }));
  await attendu(ici('stats en baisse'), false, req(A, 'PUT', P + 'joueurs/' + A.uid + '/stats', { v: 1, n: 2 }));
  await attendu(ici('classement +500'), false, req(A, 'PUT', P + 'classement/' + A.uid, { p: pA, v: 5, n: 514 }));
  await attendu(ici('profil +500'), false, req(A, 'PUT', P + 'profils/' + A.uid, { p: pA, m: false, n: 514, v: 5, d: 0, t: HEURE }));
  await attendu(ici('effacer son classement'), false, req(A, 'DELETE', P + 'classement/' + A.uid));
  await attendu(ici('effacer son profil'), false, req(A, 'DELETE', P + 'profils/' + A.uid));
  // stats effacées puis recréées : bornées par le classement.
  await attendu(ici('effacer ses stats (permis : nœud du compte)'), true, req(A, 'DELETE', P + 'joueurs/' + A.uid + '/stats'));
  await attendu(ici('stats recréées à +500'), false, req(A, 'PUT', P + 'joueurs/' + A.uid + '/stats', { v: 5, n: 514 }));
  await attendu(ici('stats recréées au niveau du classement'), true, req(A, 'PUT', P + 'joueurs/' + A.uid + '/stats', { v: 5, n: 14 }));

  // Sortie du salon.
  await attendu(ici('B rend le siège'), true, req(B, 'DELETE', S + '/siege'));
  await attendu(ici('A quitte le salon'), true, req(A, 'DELETE', S + '/joueurs/' + A.uid));

  // Invité (connexion anonyme).
  // Lectures réservées aux comptes : invité refusé, compte autorisé.
  const lectures = [
    ['hall', P + 'hall'], ['annonces', P + 'annonces'], ['salon', S], ['classement', P + 'classement'],
    ['profils', P + 'profils'], ['profil d\'un joueur', P + 'profils/' + A.uid], ['resume', P + 'resume'],
    ['pseudo d\'un joueur', P + 'joueurs/' + A.uid + '/pseudo'], ['avatarId', P + 'joueurs/' + A.uid + '/avatarId'],
    ['avatarImg', P + 'joueurs/' + A.uid + '/avatarImg'], ['stats d\'un joueur', P + 'joueurs/' + A.uid + '/stats']
  ];
  for (const [n, c] of lectures) {
    await attendu(ici('invité lit ' + n), false, req(G, 'GET', c));
    await attendu(ici('compte lit ' + n), true, req(X, 'GET', c));
  }
  const reqActivite = (u) => fetch(`${DB}/${P}activite.json?${NS}&auth=${u.jeton}&orderBy="$value"&limitToFirst=20`).then(r => r.text().then(() => r.status === 200));
  await attendu(ici('invité lit activite (requête du nettoyage)'), false, reqActivite(G));
  await attendu(ici('compte lit activite (requête du nettoyage)'), true, reqActivite(X));
  // Restent ouverts aux invités.
  await attendu(ici('invité lit pseudos/<clé>'), true, req(G, 'GET', P + 'pseudos/' + pA.toLowerCase()));
  await attendu(ici('invité lit nouveautes/epingles'), true, req(G, 'GET', P + 'nouveautes/epingles'));
  await attendu(ici('invité entre dans un salon'), false, req(G, 'PUT', S + '/joueurs/' + G.uid, { pseudo: 'Invite', t: HEURE }));
  await attendu(ici('resume classé (cl)'), true, req(A, 'PUT', P + 'resume/8-' + t, { ...resume, cl: true }));
  await attendu(ici('resume, cl non booléen'), false, req(A, 'PUT', P + 'resume/81-' + t, { ...resume, cl: 'oui' }));
  await attendu(ici('invité écrit un resume'), false, req(G, 'PUT', P + 'resume/7-' + t, resume));

  return { A, B, X, G, pA, pB, pX, code, resume, t };
}


// Compte de Romain dans l'émulateur : jeton personnalisé non signé (accepté par l'émulateur seulement).
const UID_ROMAIN = 'doSJZ1I6ixVUFejD842Jz2JrkFs1';
async function compteRomain() {
  const b64 = o => Buffer.from(JSON.stringify(o)).toString('base64url');
  const maint = Math.floor(Date.now() / 1000);
  const jeton = b64({ alg: 'none', typ: 'JWT' }) + '.' + b64({ iss: 'demo', sub: 'demo', aud: 'https://identitytoolkit.googleapis.com/google.identity.identitytoolkit.v1.IdentityToolkit', iat: maint, exp: maint + 3600, uid: UID_ROMAIN }) + '.';
  const r = await fetch('http://127.0.0.1:' + PORT_AUTH + '/identitytoolkit.googleapis.com/v1/accounts:signInWithCustomToken?key=demo', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ token: jeton, returnSecureToken: true }) });
  const j = await r.json();
  if (!j.idToken) throw new Error('Auth Romain : ' + JSON.stringify(j));
  return { uid: j.localId, jeton: j.idToken };
}

// 0.6 : parties classées, saisons, écussons, guides, en ligne, Nouveautés, failles corrigées.
async function scenarioClasse(P, c, R) {
  const { A, B, X, G, pA, pB, pX, t } = c;
  const tag = P ? 'essai' : 'public';
  const ici = n => `[${tag}] 0.6 ${n}`;
  const CL = P + 'classe/';
  const J = u => CL + 'joueurs/' + u.uid;
  const jour = Math.floor((Date.now() + 3600000) / 86400000);
  const profil = (o) => ({ elo: 1000, parties: 0, partiesTotal: 0, v: 0, d: 0, saison: 0, maj: HEURE, ...o });

  // Saison.
  await attendu(ici('saison écrite par un joueur'), false, req(X, 'PUT', CL + 'saison', { id: 0, nom: 'Bêta', debut: t }));
  await attendu(ici('saison écrite par Romain'), true, req(R, 'PUT', CL + 'saison', { id: 0, nom: 'Bêta', debut: t }));
  await attendu(ici('invité lit la saison'), true, req(G, 'GET', CL + 'saison'));
  await attendu(ici('saisons terminées écrites par un joueur'), false, req(X, 'PUT', CL + 'saisons/0', { nom: 'Bêta', debut: t }));

  // Profils classés.
  await attendu(ici('profil classé créé à 1500'), false, req(A, 'PUT', J(A), profil({ elo: 1500 })));
  await attendu(ici('profil classé d\'un autre'), false, req(X, 'PUT', J(A), profil()));
  for (const u of [A, B, X]) await attendu(ici('profil classé de départ'), true, req(u, 'PUT', J(u), profil()));
  await attendu(ici('invité lit les profils classés'), false, req(G, 'GET', CL + 'joueurs'));
  await attendu(ici('compte lit les profils classés'), true, req(X, 'GET', CL + 'joueurs'));
  await attendu(ici('profil classé effacé'), false, req(A, 'DELETE', J(A)));

  // Salon classé.
  const code2 = 'c' + (t % 1000000).toString(36), S2 = P + 'salons/' + code2;
  await attendu(ici('A entre dans le salon classé'), true, req(A, 'PUT', S2 + '/joueurs/' + A.uid, { pseudo: pA, sid: 'sa', t: HEURE }));
  await attendu(ici('salon classé (cl) par un absent'), false, req(X, 'PUT', S2 + '/cl', true));
  await attendu(ici("0.6.1 cl sans hôte"), false, req(A, 'PUT', S2 + '/cl', true));
  await attendu(ici("0.6.1 hôte au nom d'un autre"), false, req(A, 'PUT', S2 + '/hote', B.uid));
  await attendu(ici("0.6.1 hôte posé par le créateur"), true, req(A, 'PUT', S2 + '/hote', A.uid));
  await attendu(ici("0.6.1 hôte réécrit"), false, req(A, 'PUT', S2 + '/hote', A.uid));
  await attendu(ici('salon classé (cl) par le créateur'), true, req(A, 'PUT', S2 + '/cl', true));
  await attendu(ici('ouverture du salon (cree)'), true, req(A, 'PUT', S2 + '/cree', HEURE));
  await attendu(ici('ouverture réécrite'), false, req(A, 'PUT', S2 + '/cree', HEURE));
  await attendu(ici('faille siège : le créateur prend le siège'), false, req(A, 'PUT', S2 + '/siege', A.uid));
  await attendu(ici('B prend le siège du salon classé'), true, req(B, 'PUT', S2 + '/siege', B.uid));
  await attendu(ici('B entre dans le salon classé'), true, req(B, 'PUT', S2 + '/joueurs/' + B.uid, { pseudo: pB, sid: 'sb', t: HEURE }));
  await attendu(ici("0.6.1 cl changé par un joueur qui n'est pas l'hôte"), false, req(B, 'PUT', S2 + '/cl', false));
  await req(A, 'PUT', S2 + '/pres/' + A.uid, { c: true, t: HEURE });
  await attendu(ici("0.6.1 engagement classé sans graine"), false, req(A, 'PUT', S2 + '/engages', { [A.uid]: true, [B.uid]: true }));
  await attendu(ici("0.6.1 engagement classé, adversaire déconnecté"), false, req(A, 'PUT', S2 + '/engages', { [A.uid]: true, [B.uid]: true, g: '77' }));
  await req(B, 'PUT', S2 + '/pres/' + B.uid, { c: true, t: HEURE });
  await attendu(ici('engagement classé'), true, req(A, 'PUT', S2 + '/engages', { [A.uid]: true, [B.uid]: true, g: '77' }));
  await attendu(ici("0.6.1 verrou levé avant l'écriture de la partie"), false, req(B, 'DELETE', S2 + '/engages'));
  await attendu(ici('cl changé après engagement'), false, req(A, 'PUT', S2 + '/cl', false));
  await attendu(ici('bandeau robot avec adversaire engagé'), false, req(A, 'PUT', S2 + '/robot', { u: A.uid, n: 'normal', t: HEURE }));

  // Partie classée entre joueurs.
  const id = code2 + '-77';
  const partie = { a: A.uid, b: B.uid, gagnant: A.uid, eloA: 1000, eloB: 1000, deltaA: 32, deltaB: -32, robot: false, saison: 0, t: HEURE, sa: code2, gr: '77' };
  await attendu(ici('partie classée par un tiers'), false, req(X, 'PUT', CL + 'parties/' + id, partie));
  await attendu(ici('partie classée, Elo de départ faux'), false, req(A, 'PUT', CL + 'parties/' + id, { ...partie, eloA: 1200 }));
  await attendu(ici('partie classée, id sans graine'), false, req(A, 'PUT', CL + 'parties/' + code2 + '-78', partie));
  await attendu(ici('partie classée hors salon classé'), false, req(A, 'PUT', CL + 'parties/' + c.code + '-77', { ...partie, sa: c.code }));
  await attendu(ici("0.6.1 partie classée sur une autre graine que l'engagement"), false, req(A, 'PUT', CL + 'parties/' + code2 + '-76', { ...partie, gr: '76' }));
  await attendu(ici('partie classée créée'), true, req(A, 'PUT', CL + 'parties/' + id, partie));
  await attendu(ici('partie classée sans gagnant (nul)'), false, req(B, 'PUT', CL + 'parties/' + code2 + '-79', { ...partie, gr: '79', gagnant: 'nul' }));
  await attendu(ici('partie classée réécrite'), false, req(A, 'PUT', CL + 'parties/' + id, { ...partie, gagnant: B.uid }));
  const appli = (u, o) => ({ [J(u)]: { ...profil(o), dern: id }, [CL + 'parties/' + id + '/fait/' + u.uid]: true });
  await attendu(ici('victoire sans confirmation du perdant'), false, req(A, 'PATCH', '', appli(A, { elo: 1032, parties: 1, partiesTotal: 1, v: 1 })));
  await attendu(ici('confirmation au nom de l\'adversaire'), false, req(A, 'PUT', CL + 'parties/' + id + '/ok/' + B.uid, true));
  await attendu(ici('confirmation du perdant'), true, req(B, 'PUT', CL + 'parties/' + id + '/ok/' + B.uid, true));
  await attendu(ici('confirmation réécrite'), false, req(B, 'PUT', CL + 'parties/' + id + '/ok/' + B.uid, true));
  await attendu(ici('Elo gonflé (+100)'), false, req(A, 'PATCH', '', appli(A, { elo: 1100, parties: 1, partiesTotal: 1, v: 1 })));
  await attendu(ici('victoire sans compter la partie'), false, req(A, 'PATCH', '', appli(A, { elo: 1032, parties: 0, partiesTotal: 1, v: 1 })));
  await attendu(ici('victoire sans le témoin fait/'), false, req(A, 'PUT', J(A), { ...profil({ elo: 1032, parties: 1, partiesTotal: 1, v: 1 }), dern: id }));
  await attendu(ici('victoire appliquée'), true, req(A, 'PATCH', '', appli(A, { elo: 1032, parties: 1, partiesTotal: 1, v: 1 })));
  await attendu(ici('victoire appliquée deux fois'), false, req(A, 'PATCH', '', appli(A, { elo: 1064, parties: 2, partiesTotal: 2, v: 2 })));
  await attendu(ici('défaite de B appliquée par un tiers'), false, req(X, 'PATCH', '', appli(B, { elo: 968, parties: 1, partiesTotal: 1, d: 1 })));
  await attendu(ici('défaite de B changée en victoire'), false, req(B, 'PATCH', '', appli(B, { elo: 1032, parties: 1, partiesTotal: 1, v: 1 })));
  // 0.6.1 : profil appliqué en retard (l'Elo de B a changé depuis) : validé sur le delta de la partie.
  await req('admin', 'PATCH', J(B), { elo: 990 });
  await attendu(ici("0.6.1 défaite en retard, delta faux"), false, req(A, 'PATCH', '', appli(B, { elo: 968, parties: 1, partiesTotal: 1, d: 1 })));
  await attendu(ici('défaite de B appliquée par le gagnant'), true, req(A, 'PATCH', '', appli(B, { elo: 958, parties: 1, partiesTotal: 1, d: 1 })));
  await req('admin', 'PATCH', J(B), { elo: 968 });
  await attendu(ici("0.6.1 verrou levé une fois la partie écrite"), true, req(B, 'DELETE', S2 + '/engages'));
  // 0.6.1 : forfait seulement sur la graine engagée (vol d'Elo sur une graine inventée refusé).
  await req(A, 'PUT', S2 + '/engages', { [A.uid]: true, [B.uid]: true, g: '80' });
  await req('admin', 'PUT', S2 + '/pres/' + B.uid, { c: false, t: Date.now() - 100000 });
  await attendu(ici("0.6.1 forfait sur une graine inventée"), false, req(A, 'PUT', S2 + '/forfait/81', { u: B.uid, t: HEURE }));
  await attendu(ici("0.6.1 forfait sur la graine engagée"), true, req(A, 'PUT', S2 + '/forfait/80', { u: B.uid, t: HEURE }));
  await attendu(ici("0.6.1 partie de forfait sur une autre graine"), false, req(A, 'PUT', CL + 'parties/' + code2 + '-81', { ...partie, gr: '81', eloA: 1032, eloB: 968 }));
  await attendu(ici("0.6.1 nouvel engagement avant l'écriture de la partie 80"), false, req(A, 'DELETE', S2 + '/engages'));

  // Classement (copie exacte, placement fini) et Elo affiché.
  const ligne = { pseudo: pA, elo: 1032, rang: 'topaze', v: 1, d: 0, saison: 0 };
  await attendu(ici('classement pendant le placement'), false, req(A, 'PUT', CL + 'classement/' + A.uid, ligne));
  await req('admin', 'PATCH', J(A), { parties: 5 });
  await attendu(ici('classement, rang faux'), false, req(X, 'PUT', CL + 'classement/' + A.uid, { ...ligne, rang: 'diamant' }));
  await attendu(ici('classement, Elo faux'), false, req(A, 'PUT', CL + 'classement/' + A.uid, { ...ligne, elo: 1500, rang: 'diamant' }));
  await attendu(ici('classement, pseudo usurpé'), false, req(X, 'PUT', CL + 'classement/' + A.uid, { ...ligne, pseudo: pX }));
  await attendu(ici("0.6.1 classement sans saison"), false, req(X, 'PUT', CL + 'classement/' + A.uid, { pseudo: pA, elo: 1032, rang: 'topaze', v: 1, d: 0 }));
  await attendu(ici("0.6.1 classement, saison fausse"), false, req(X, 'PUT', CL + 'classement/' + A.uid, { ...ligne, saison: 3 }));
  await attendu(ici('classement, copie exacte par un tiers'), true, req(X, 'PUT', CL + 'classement/' + A.uid, ligne));
  await attendu(ici('classement effacé (placement fini)'), false, req(X, 'DELETE', CL + 'classement/' + A.uid));
  await attendu(ici('invité lit le classement classé'), true, req(G, 'GET', CL + 'classement'));
  await attendu(ici('compte lit le classement classé'), true, req(B, 'GET', CL + 'classement'));
  const prof = { p: pA, m: false, n: 14, v: 5, d: 0, t: HEURE };
  await attendu(ici('profil, Elo affiché faux'), false, req(A, 'PUT', P + 'profils/' + A.uid, { ...prof, el: 1500 }));
  await attendu(ici('profil, Elo affiché'), true, req(A, 'PUT', P + 'profils/' + A.uid, { ...prof, el: 1032 }));
  await attendu(ici('profil, Elo affiché pendant le placement'), false, req(B, 'PUT', P + 'profils/' + B.uid, { p: pB, m: false, n: 0, v: 0, d: 0, t: HEURE, el: 968 }));
  await attendu(ici('annonce classée avec Elo'), true, req(A, 'PUT', P + 'annonces/' + code2, { u: A.uid, p: pA, t: HEURE, cl: true, el: 1032 }));
  await attendu(ici('annonce classée, Elo faux'), false, req(A, 'PUT', P + 'annonces/' + code2, { u: A.uid, p: pA, t: HEURE, cl: true, el: 1400 }));

  // Classée contre un robot.
  const code3 = 'r' + (t % 1000000).toString(36), S3 = P + 'salons/' + code3;
  // Ordre du site : entrer, puis cl et cree (ils exigent un joueur déjà présent).
  await attendu(ici('X ouvre un salon classé'), true, req(X, 'PUT', S3 + '/joueurs/' + X.uid, { pseudo: pX, sid: 'sx', t: HEURE }));
  await req(X, 'PUT', S3 + '/hote', X.uid);
  await attendu(ici('X le rend classé'), true, req(X, 'PATCH', S3, { cl: true, cree: HEURE }));
  await attendu(ici('bandeau robot avant 2 min'), false, req(X, 'PUT', S3 + '/robot', { u: X.uid, n: 'normal', t: HEURE }));
  await req('admin', 'PUT', S3 + '/cree', Date.now() - 200000);
  await attendu(ici('bandeau robot, niveau hors tranche'), false, req(X, 'PUT', S3 + '/robot', { u: X.uid, n: 'difficile', t: HEURE }));
  await attendu(ici('bandeau robot par un absent'), false, req(B, 'PUT', S3 + '/robot', { u: B.uid, n: 'normal', t: HEURE }));
  await attendu(ici('bandeau robot'), true, req(X, 'PUT', S3 + '/robot', { u: X.uid, n: 'normal', t: HEURE }));
  const rid = 'r-' + code3 + '-5';
  const pr = { a: X.uid, b: 'robot-normal', gagnant: X.uid, eloA: 1000, eloB: 1100, deltaA: 20, robot: true, saison: 0, t: HEURE, sa: code3, gr: '5' };
  await attendu(ici('partie robot, Elo du robot faux'), false, req(X, 'PUT', CL + 'parties/' + rid, { ...pr, eloB: 500 }));
  await attendu(ici('partie robot par un autre joueur'), false, req(A, 'PUT', CL + 'parties/' + rid, { ...pr, a: A.uid, gagnant: A.uid, eloA: 1032 }));
  await attendu(ici('partie robot créée'), true, req(X, 'PUT', CL + 'parties/' + rid, pr));
  const appR = (o, rob) => ({ [J(X)]: { ...profil(o), dern: rid, robots: rob }, [CL + 'parties/' + rid + '/fait/' + X.uid]: true });
  await attendu(ici('robot : gain au-delà de K/2'), false, req(X, 'PATCH', '', appR({ elo: 1040, parties: 1, partiesTotal: 1, v: 1 }, { jour: '2026-11-09', j: jour, n: 1 })));
  await attendu(ici('robot : compteur du jour faux (2)'), false, req(X, 'PATCH', '', appR({ elo: 1020, parties: 1, partiesTotal: 1, v: 1 }, { jour: '2026-11-09', j: jour, n: 2 })));
  await attendu(ici('robot : jour inventé'), false, req(X, 'PATCH', '', appR({ elo: 1020, parties: 1, partiesTotal: 1, v: 1 }, { jour: '2026-11-08', j: jour - 1, n: 1 })));
  await attendu(ici('robot : sans compteur du jour'), false, req(X, 'PATCH', '', appR({ elo: 1020, parties: 1, partiesTotal: 1, v: 1 })));
  await attendu(ici('robot : victoire appliquée'), true, req(X, 'PATCH', '', appR({ elo: 1020, parties: 1, partiesTotal: 1, v: 1 }, { jour: '2026-11-09', j: jour, n: 1 })));
  await attendu(ici('partie robot sans gagnant (nul)'), false, req(X, 'PUT', CL + 'parties/' + rid + 'n', { ...pr, gagnant: 'nul', deltaA: 0, eloA: 1020 }));
  // Point 3 (tests en ligne du 9 nov.) : une fin de classée change l'Elo entre la lecture et l'écriture du profil public.
  // L'ancien Elo est refusé ; le site relit classe/joueurs puis réécrit (firebase/compte.js, publieProfil) : accepté.
  await req('admin', 'PATCH', J(A), { elo: 1048 });
  await attendu(ici('profil après une classée, Elo affiché périmé'), false, req(A, 'PUT', P + 'profils/' + A.uid, { ...prof, el: 1032 }));
  await attendu(ici('profil après une classée, Elo affiché relu'), true, req(A, 'PUT', P + 'profils/' + A.uid, { ...prof, el: 1048 }));
  await req('admin', 'PATCH', J(A), { elo: 1032 });
  await attendu(ici('bandeau robot retiré par son auteur'), true, req(X, 'DELETE', S3 + '/robot'));
  await req('admin', 'PATCH', J(X), { robots: { jour: '2026-11-09', j: jour, n: 5 } });
  await attendu(ici('bandeau robot après 5 classées du jour'), false, req(X, 'PUT', S3 + '/robot', { u: X.uid, n: 'normal', t: HEURE }));
  await req('admin', 'PATCH', J(X), { robots: { jour: '2026-11-08', j: jour - 1, n: 5 } });
  await attendu(ici('bandeau robot le lendemain'), true, req(X, 'PUT', S3 + '/robot', { u: X.uid, n: 'normal', t: HEURE }));

  // Fin de saison : instantané, écusson, remise à mi-chemin.
  await attendu(ici('instantané avant la fin de la saison'), false, req(A, 'PUT', CL + 'instantanes/0/' + A.uid, { saison: 0, elo: 1032, rang: 'topaze', placementFini: true }));
  await attendu(ici('nouvelle saison par Romain'), true, req(R, 'PUT', CL + 'saison', { id: 1, nom: 'Saison 1', debut: t }));
  await attendu(ici('saison terminée par Romain'), true, req(R, 'PUT', CL + 'saisons/0', { nom: 'Bêta', debut: t, fin: t }));
  await attendu(ici('remise sans instantané (placement fini)'), false, req(A, 'PUT', J(A), profil({ elo: 1016, partiesTotal: 1, saison: 1 })));
  const ins = { saison: 0, elo: 1032, rang: 'topaze', placementFini: true, modes: { classee: { parties: 5, v: 1, d: 0, best: 1, serie: 1 } },
    tops: { decks: { 0: { nom: 'Montée', e: 'brume,roche', n: 5, v: 1 } }, mvp: { 0: { id: '001', n: 2 } }, golems: { 0: { id: '001', n: 5, v: 1 } } } };
  await attendu(ici('instantané, top inconnu'), false, req(A, 'PUT', CL + 'instantanes/0/' + A.uid, { ...ins, tops: { pires: { 0: { id: '001', n: 1 } } } }));
  await attendu(ici('instantané avec sa place'), false, req(A, 'PUT', CL + 'instantanes/0/' + A.uid, { ...ins, place: 1 }));
  await attendu(ici('instantané, Elo faux'), false, req(A, 'PUT', CL + 'instantanes/0/' + A.uid, { ...ins, elo: 1500, rang: 'diamant' }));
  await attendu(ici('instantané d\'un autre'), false, req(X, 'PUT', CL + 'instantanes/0/' + A.uid, ins));
  // 0.6.3 : instantané complet : trois modes et niveaux, chacun avec 10 dernières, éléments, tops 5.
  const mc = { parties: 6, v: 4, d: 2, best: 3, serie: 1, r: 'VVDVDV', el: { brume: 60, roche: 40 }, dk: { 0: { nom: 'Montée', e: 'brume,roche', n: 6, v: 4 } }, cb: { 0: { c: '001', n: 6, v: 4 } }, mv: { 0: { c: '001', n: 3 } } };
  await attendu(ici('instantané, mode inconnu'), false, req(A, 'PUT', CL + 'instantanes/0/' + A.uid, { ...ins, modes: { tous: mc } }));
  await attendu(ici('instantané, 10 dernières invalides'), false, req(A, 'PUT', CL + 'instantanes/0/' + A.uid, { ...ins, modes: { amicale: { ...mc, r: 'VVVVVVVVVVV' } } }));
  await attendu(ici('instantané, 6e deck'), false, req(A, 'PUT', CL + 'instantanes/0/' + A.uid, { ...ins, modes: { amicale: { ...mc, dk: { 5: mc.dk[0] } } } }));
  await attendu(ici('instantané, champ inconnu dans un mode'), false, req(A, 'PUT', CL + 'instantanes/0/' + A.uid, { ...ins, modes: { amicale: { ...mc, x: 1 } } }));
  await attendu(ici('instantané de fin de saison (trois modes et niveaux)'), true, req(A, 'PUT', CL + 'instantanes/0/' + A.uid, { ...ins, modes: { ...ins.modes, amicale: mc, entrainement: mc, facile: mc, normal: { parties: 0, v: 0, d: 0 } } }));
  await attendu(ici('instantané réécrit'), false, req(A, 'PUT', CL + 'instantanes/0/' + A.uid, ins));
  await attendu(ici('place posée par un joueur'), false, req(A, 'PUT', CL + 'instantanes/0/' + A.uid + '/place', 1));
  await attendu(ici('place posée par Romain'), true, req(R, 'PUT', CL + 'instantanes/0/' + A.uid + '/place', 2));
  // Récompenses (règle du 9 nov.) : médaille de saison pour tout placement fini, écu en plus pour le top 10 (place posée par Romain).
  const EC = CL + 'ecussons/' + A.uid + '/0';
  await attendu(ici('récompense : écu or pour la 2e place'), false, req(A, 'PUT', EC, { saison: 0, place: 2, ecu: 'or' }));
  await attendu(ici('récompense : place différente de celle de Romain'), false, req(A, 'PUT', EC, { saison: 0, place: 1, ecu: 'or' }));
  await attendu(ici('récompense : écu sans place'), false, req(A, 'PUT', EC, { saison: 0, ecu: 'argent' }));
  await attendu(ici('récompense : ancien format (palier)'), false, req(A, 'PUT', EC, { saison: 0, rang: 'topaze', palier: 'podium', image: 'x.png' }));
  await attendu(ici('récompense posée pour un autre'), false, req(X, 'PUT', EC, { saison: 0 }));
  await attendu(ici('récompense sans instantané'), false, req(B, 'PUT', CL + 'ecussons/' + B.uid + '/0', { saison: 0 }));
  await attendu(ici('récompense : médaille seule'), true, req(A, 'PUT', EC, { saison: 0 }));
  await attendu(ici('récompense : médaille + écu argent (2e)'), true, req(A, 'PUT', EC, { saison: 0, place: 2, ecu: 'argent' }));
  await req(R, 'PUT', CL + 'instantanes/0/' + A.uid + '/place', 12);
  await attendu(ici('récompense : écu hors top 10'), false, req(A, 'PUT', EC, { saison: 0, place: 12, ecu: 'bronze' }));
  await req(R, 'PUT', CL + 'instantanes/0/' + A.uid + '/place', 7);
  await attendu(ici('récompense : écu bronze (7e)'), true, req(A, 'PUT', EC, { saison: 0, place: 7, ecu: 'bronze' }));
  await attendu(ici('invité lit les récompenses'), true, req(G, 'GET', CL + 'ecussons/' + A.uid));
  await attendu(ici('remise, Elo non réduit'), false, req(A, 'PUT', J(A), profil({ elo: 1032, partiesTotal: 1, saison: 1 })));
  await attendu(ici('remise, partiesTotal remis à 0'), false, req(A, 'PUT', J(A), profil({ elo: 1016, partiesTotal: 0, saison: 1 })));
  await attendu(ici('remise à mi-chemin de 1000'), true, req(A, 'PUT', J(A), profil({ elo: 1016, partiesTotal: 1, saison: 1 })));
  await attendu(ici('classement retiré après la remise'), true, req(B, 'DELETE', CL + 'classement/' + A.uid));

  // Résumé public par mode (pm).
  const pm = { classee: { n: 5, v: 3, d: 2, b: 2, s: -1, r: 'VVDVD', el: { brume: 60, roche: 40 }, dk: { 0: { nom: 'Montée', e: 'brume', n: 5, v: 3 } }, cb: { 0: { c: '001', n: 5, v: 3 } }, mv: { 0: { c: '001', n: 2 } } } };
  await attendu(ici('profil, résumé par mode'), true, req(A, 'PUT', P + 'profils/' + A.uid, { ...prof, pm }));
  await attendu(ici('profil, mode inconnu'), false, req(A, 'PUT', P + 'profils/' + A.uid, { ...prof, pm: { tournoi: pm.classee } }));
  await attendu(ici('profil, 10 dernières invalides'), false, req(A, 'PUT', P + 'profils/' + A.uid, { ...prof, pm: { classee: { ...pm.classee, r: 'VVVVVVVVVVV' } } }));
  await attendu(ici('profil privé avec résumé par mode'), false, req(A, 'PUT', P + 'profils/' + A.uid, { ...prof, m: true, pm }));
  // 0.6.2 : compteurs complets (pmf = 2) et entraînement par niveau.
  const pm2 = { ...pm, entrainement: { n: 9, v: 5, d: 4 }, facile: { n: 6, v: 4, d: 2, b: 3, s: 1, r: 'VVD' }, normal: { n: 2, v: 1, d: 1 }, difficile: { n: 1, v: 0, d: 1 } };
  await attendu(ici('profil, compteurs par niveau (pmf 2)'), true, req(A, 'PUT', P + 'profils/' + A.uid, { ...prof, pmf: 2, pm: pm2 }));
  await attendu(ici('profil 0.6, sans pmf'), true, req(A, 'PUT', P + 'profils/' + A.uid, { ...prof, pm }));
  await attendu(ici('profil, pmf inconnu'), false, req(A, 'PUT', P + 'profils/' + A.uid, { ...prof, pmf: 3, pm: pm2 }));
  await attendu(ici('profil, niveau inconnu'), false, req(A, 'PUT', P + 'profils/' + A.uid, { ...prof, pmf: 2, pm: { expert: pm2.facile } }));
  // 0.6.3 : pms = saison des compteurs pm (jamais au-delà de la saison en cours, ici 1).
  await attendu(ici('profil, compteurs de la saison 1 (pms)'), true, req(A, 'PUT', P + 'profils/' + A.uid, { ...prof, pmf: 2, pm: pm2, pms: 1 }));
  await attendu(ici('profil, saison future (pms 2)'), false, req(A, 'PUT', P + 'profils/' + A.uid, { ...prof, pmf: 2, pm: pm2, pms: 2 }));
  await attendu(ici('profil, pms 0'), false, req(A, 'PUT', P + 'profils/' + A.uid, { ...prof, pmf: 2, pm: pm2, pms: 0 }));
  await attendu(ici('profil, niveau v > n'), false, req(A, 'PUT', P + 'profils/' + A.uid, { ...prof, pmf: 2, pm: { facile: { n: 1, v: 2, d: 0 } } }));
  // Mon image gardée : marqueurs __img et __init.
  await attendu(ici('avatar : mon image active (__img)'), true, req(A, 'PUT', P + 'joueurs/' + A.uid + '/avatarId', '__img'));
  await attendu(ici('avatar : initiale, image gardée (__init)'), true, req(A, 'PUT', P + 'joueurs/' + A.uid + '/avatarId', '__init'));

  // Guides.
  const gv = P + 'guides/bien-debuter/votes/';
  await attendu(ici('invité lit les guides (lien partagé)'), true, req(G, 'GET', P + 'guides/bien-debuter'));
  await attendu(ici('vote pour'), true, req(A, 'PUT', gv + A.uid, 1));
  await attendu(ici('vote changé'), true, req(A, 'PUT', gv + A.uid, -1));
  await attendu(ici('vote de 5'), false, req(A, 'PUT', gv + A.uid, 5));
  await attendu(ici('vote au nom d\'un autre'), false, req(A, 'PUT', gv + B.uid, 1));
  await attendu(ici('vote d\'un invité'), false, req(G, 'PUT', gv + G.uid, 1));
  await attendu(ici('vote retiré'), true, req(A, 'DELETE', gv + A.uid));
  // 0.6 : seuls les guides de la liste GUIDES (identifiants YouTube compris).
  await attendu(ici('vote, guide vidéo de la liste'), true, req(A, 'PUT', P + 'guides/l8-g9rcBFnI/votes/' + A.uid, 1));
  await attendu(ici('vote, guide hors liste'), false, req(A, 'PUT', P + 'guides/guide-invente/votes/' + A.uid, 1));
  await attendu(ici('vote retiré, guide vidéo'), true, req(A, 'DELETE', P + 'guides/l8-g9rcBFnI/votes/' + A.uid));

  // 0.6 (10 nov.) : guides publiés sans relecture (guides/<id>/fiche), compteur de 10 par 24 h, modification et suppression.
  const GF = id => P + 'guides/' + id, CG = P + 'compteurGuides/' + A.uid;
  const fiche = (u, p, x) => ({ u, p, ty: 'v', ti: 'Magma rapide', yt: 'Xk29fQ_r7Ls', d1: 'GOL2-KgMPA8ADDAgA', v: '0.6', t: HEURE, m: HEURE, ...x });
  const publie = (qui, id, f, n, d) => req(qui, 'PATCH', '', { [P + 'guides/' + id + '/fiche']: f, [P + 'compteurGuides/' + qui.uid]: { d: d === undefined ? HEURE : d, n, t: HEURE } });
  const ga = 'ga' + t;
  await attendu(ici('guide publié par A'), true, publie(A, ga, fiche(A.uid, pA), 1));
  await attendu(ici('guide lu par un invité'), true, req(G, 'GET', GF(ga)));
  await attendu(ici('vote sur un guide publié'), true, req(B, 'PUT', GF(ga) + '/votes/' + B.uid, 1));
  await attendu(ici('vote sur un guide inexistant'), false, req(B, 'PUT', GF('rien' + t) + '/votes/' + B.uid, 1));
  await attendu(ici('guide sans compteur'), false, req(A, 'PUT', GF('gb' + t) + '/fiche', fiche(A.uid, pA)));
  await attendu(ici('guide par un invité'), false, req(G, 'PATCH', '', { [GF('gg' + t) + '/fiche']: fiche(G.uid, pA), [P + 'compteurGuides/' + G.uid]: { d: HEURE, n: 1, t: HEURE } }));
  const lu = await fetch(`${DB}/${CG}.json?${NS}&auth=${A.jeton}`).then(x => x.json());
  await attendu(ici('guide au nom de B'), false, publie(A, 'gc' + t, fiche(B.uid, pB), 2, lu.d));
  await attendu(ici('guide, pseudo de B'), false, publie(A, 'gc' + t, fiche(A.uid, pB), 2, lu.d));
  await attendu(ici('guide vidéo sans lien'), false, publie(A, 'gc' + t, fiche(A.uid, pA, { yt: null }), 2, lu.d));
  await attendu(ici('guide, lien de 12 caractères'), false, publie(A, 'gc' + t, fiche(A.uid, pA, { yt: 'Xk29fQ_r7Ls1' }), 2, lu.d));
  await attendu(ici('guide, deck GOL3'), false, publie(A, 'gc' + t, fiche(A.uid, pA, { d1: 'GOL3-KgMPA8ADDAgA' }), 2, lu.d));
  await attendu(ici('guide, titre de 81 caractères'), false, publie(A, 'gc' + t, fiche(A.uid, pA, { ti: 'x'.repeat(81) }), 2, lu.d));
  await attendu(ici('guide, texte de 4001 caractères'), false, publie(A, 'gc' + t, fiche(A.uid, pA, { ty: 't', yt: null, tx: 'x'.repeat(4001) }), 2, lu.d));
  await attendu(ici('guide, version de deck invalide'), false, publie(A, 'gc' + t, fiche(A.uid, pA, { v: 'v0.6<script>' }), 2, lu.d));
  await attendu(ici('guide, champ inconnu'), false, publie(A, 'gc' + t, fiche(A.uid, pA, { x: 1 }), 2, lu.d));
  await attendu(ici('guide, compteur qui ne monte pas'), false, publie(A, 'gc' + t, fiche(A.uid, pA), 1, lu.d));
  await attendu(ici('guide, compteur remis à zéro avant 24 h'), false, publie(A, 'gc' + t, fiche(A.uid, pA), 1));
  // Limite de 10 par 24 h : le 1er est publié, 9 de plus passent, le 11e est refusé.
  for (let n = 2; n <= 10; n++) await attendu(ici('guide n° ' + n + ' du jour'), true, publie(A, 'gn' + n + '-' + t, fiche(A.uid, pA, { ty: 't', yt: null, tx: 'Plan ' + n }), n, lu.d));
  await attendu(ici('11e guide du jour'), false, publie(A, 'gn11-' + t, fiche(A.uid, pA), 11, lu.d));
  await attendu(ici('compteur avec un enfant en trop'), false, req(A, 'PATCH', '', { [GF('gx' + t) + '/fiche']: fiche(A.uid, pA), [CG]: { d: lu.d, n: 11, t: HEURE, x: 1 } }));
  await attendu(ici('compteur d\'un autre'), false, req(A, 'PUT', P + 'compteurGuides/' + B.uid, { d: HEURE, n: 1, t: HEURE }));
  // Modification : l'auteur et Romain, pas un autre compte ; t et u ne changent pas.
  const ft = (await fetch(`${DB}/${GF(ga)}/fiche.json?${NS}`).then(x => x.json())).t;
  await attendu(ici('guide modifié par son auteur'), true, req(A, 'PUT', GF(ga) + '/fiche', fiche(A.uid, pA, { ti: 'Magma rapide 2', t: ft })));
  await attendu(ici('guide modifié par un autre compte'), false, req(B, 'PUT', GF(ga) + '/fiche', fiche(A.uid, pA, { ti: 'Piraté', t: ft })));
  await attendu(ici('guide repris par un autre compte'), false, req(B, 'PUT', GF(ga) + '/fiche', fiche(B.uid, pB, { t: ft })));
  await attendu(ici('guide, date de publication changée'), false, req(A, 'PUT', GF(ga) + '/fiche', fiche(A.uid, pA, { t: 5 })));
  await attendu(ici('guide modifié par Romain'), true, req(R, 'PATCH', GF(ga) + '/fiche', { ti: 'Corrigé par Romain', m: HEURE }));
  await attendu(ici('fiche effacée seule'), false, req(A, 'DELETE', GF(ga) + '/fiche'));
  // Suppression : un autre compte refusé, l'auteur accepté, Romain accepté.
  await attendu(ici('guide supprimé par un autre compte'), false, req(B, 'DELETE', GF(ga)));
  await attendu(ici('guide supprimé par son auteur'), true, req(A, 'DELETE', GF(ga)));
  await attendu(ici('guide supprimé par Romain'), true, req(R, 'DELETE', GF('gn2-' + t)));
  // Guides du code : l'auteur reconnu par son pseudo (pseudos/bellock), Romain ; pas un autre compte.
  const yb = 'l8-g9rcBFnI', bel = await compte(`bel${t}${tag}@test.invalid`);
  await req('admin', 'PATCH', '', { [P + 'pseudos/bellock']: bel.uid, [P + 'joueurs/' + bel.uid + '/pseudo']: 'Bellock' });
  await attendu(ici('guide du code modifié par son auteur (pseudo)'), true, req(bel, 'PUT', GF(yb) + '/fiche', fiche(bel.uid, 'Bellock', { ti: 'Meule-Contrôle v0.6' })));
  await attendu(ici('guide du code modifié par un autre compte'), false, req(A, 'PUT', GF(yb) + '/fiche', fiche(A.uid, pA)));
  await attendu(ici('guide officiel modifié par un joueur'), false, req(A, 'PUT', GF('bien-debuter') + '/fiche', fiche(A.uid, pA)));
  await attendu(ici('guide du code modifié par Romain'), true, req(R, 'PATCH', GF(yb) + '/fiche', { ti: 'Meule-Contrôle', m: HEURE }));
  await attendu(ici('guide du code retiré par un autre compte'), false, req(A, 'PUT', GF(yb) + '/sup', true));
  await attendu(ici('guide du code effacé en entier'), false, req(bel, 'DELETE', GF(yb)));
  await attendu(ici('guide du code retiré par son auteur'), true, req(bel, 'PUT', GF(yb) + '/sup', true));
  await attendu(ici('guide officiel retiré par Romain'), true, req(R, 'PUT', GF('bien-debuter') + '/sup', true));
  await req('admin', 'DELETE', GF(yb)); await req('admin', 'DELETE', GF('bien-debuter') + '/sup'); await req('admin', 'DELETE', P + 'pseudos/bellock');
  // 0.6a : propositionsGuides retiré des règles : ni lu ni écrit par personne, Romain compris (console Firebase seulement).
  const PG = P + 'propositionsGuides/';
  await attendu(ici('proposition (relecture retirée)'), false, req(A, 'PUT', PG + 'pa' + t, { u: A.uid, p: pA, ty: 'v', ti: 'Magma rapide', yt: 'Xk29fQ_r7Ls', d1: 'GOL2-KgMPA8ADDAgA', t: HEURE }));
  await attendu(ici('propositions lues par un joueur'), false, req(A, 'GET', PG));
  await attendu(ici('propositions lues par Romain'), false, req(R, 'GET', PG));
  await attendu(ici('proposition effacée par Romain'), false, req(R, 'DELETE', PG + 'pa' + t));

  // En ligne (invités compris).
  await attendu(ici('invité se signale en ligne'), true, req(G, 'PUT', P + 'enligne/' + G.uid, HEURE));
  await attendu(ici('invité signale un autre'), false, req(G, 'PUT', P + 'enligne/' + A.uid, HEURE));
  await attendu(ici('invité lit en ligne'), true, req(G, 'GET', P + 'enligne'));

  // 0.6 : nouveautes/message retiré des règles (aucun code ne le lit) : refusé à tous, Romain compris.
  await attendu(ici('message des Nouveautés par un joueur'), false, req(A, 'PUT', P + 'nouveautes/message', { t: 'Saison 1', d: t }));
  await attendu(ici('message des Nouveautés par Romain'), false, req(R, 'PUT', P + 'nouveautes/message', { t: 'Saison 1', d: t }));

  // Historique 0.6 et 12 decks.
  const h = '6-' + t;
  await attendu(ici('historique classé (c, de, ro)'), true, req(A, 'PATCH', P + 'joueurs/' + A.uid + '/historique', { [h]: { d: t, x: '{}', c: true, de: -12, ro: 'normal' } }));
  await attendu(ici('historique, variation d\'Elo de 100'), false, req(A, 'PATCH', P + 'joueurs/' + A.uid + '/historique', { [h]: { d: t, x: '{}', de: 100 } }));
  await attendu(ici('12e deck (emplacement 11)'), true, req(A, 'PUT', P + 'joueurs/' + A.uid + '/decks/11', { id: 'd12', nom: 'Douze' }));
  await attendu(ici('13e deck (emplacement 12)'), false, req(A, 'PUT', P + 'joueurs/' + A.uid + '/decks/12', { id: 'd13', nom: 'Treize' }));
  // 0.6 : étiquette de version du deck (v, chaîne de 10 caractères au plus).
  await attendu(ici('deck avec version v'), true, req(A, 'PUT', P + 'joueurs/' + A.uid + '/decks/1', { id: 'd2', nom: 'Versionné', v: '0.6', cartes: { '001': 2 } }));
  await attendu(ici('deck, v trop longue'), false, req(A, 'PUT', P + 'joueurs/' + A.uid + '/decks/1', { id: 'd2', nom: 'Versionné', v: '0.6.1234567' }));
  await attendu(ici('deck, v non chaîne'), false, req(A, 'PUT', P + 'joueurs/' + A.uid + '/decks/1', { id: 'd2', nom: 'Versionné', v: 6 }));
  // 0.6a : ancien deck invalide (5 exemplaires, posé en console) : ne bloque plus l'ordre ni les autres decks, réparable pas à pas.
  {
    const b = P + 'joueurs/' + A.uid;
    await req('admin', 'PUT', b + '/decks/5', { id: 'vieux', nom: 'Ancien', cartes: { '001': 5 }, t });
    await attendu(ici('ordreDecks seul'), true, req(A, 'PUT', b + '/ordreDecks', 'vieux,d2'));
    await attendu(ici('ordreDecks mal formé'), false, req(A, 'PUT', b + '/ordreDecks', 'Vieux;d2'));
    await attendu(ici('ordreDecks, 13 ids'), false, req(A, 'PUT', b + '/ordreDecks', Array.from({ length: 13 }, (_, i) => 'd' + i).join(',')));
    await attendu(ici("renommer l'ancien deck invalide"), true, req(A, 'PATCH', b + '/decks/5', { nom: 'Ancien 2', t }));
    await attendu(ici("J'ai vérifié sur l'ancien deck invalide"), true, req(A, 'PATCH', b + '/decks/5', { v: '0.6a', t }));
    await attendu(ici('ancien deck : 5 -> 4 exemplaires'), true, req(A, 'PATCH', b + '/decks/5', { 'cartes/001': 4, t }));
    await attendu(ici('ancien deck : 4 -> 5 exemplaires'), false, req(A, 'PATCH', b + '/decks/5', { 'cartes/001': 5, t }));
    await attendu(ici('nouveau deck à 4 exemplaires'), false, req(A, 'PUT', b + '/decks/6', { id: 'copie', nom: 'Copie', cartes: { '001': 4 }, t }));
    await attendu(ici('exemplaires non entiers'), false, req(A, 'PATCH', b + '/decks/5', { 'cartes/002': 1.5, t }));
    await attendu(ici('ancien deck : 4 -> 3 exemplaires'), true, req(A, 'PATCH', b + '/decks/5', { 'cartes/001': 3, t }));
    await attendu(ici("supprimer l'ancien deck"), true, req(A, 'DELETE', b + '/decks/5'));
  }

  // Faille : pseudo libéré alors que le compte le porte encore.
  await attendu(ici('faille pseudo : libérer le pseudo porté'), false, req(X, 'DELETE', P + 'pseudos/' + pX.toLowerCase()));
  const pX2 = pX + 'b';
  await attendu(ici('changement de pseudo (libère l\'ancien)'), true, req(X, 'PATCH', '', { [P + 'pseudos/' + pX2.toLowerCase()]: X.uid, [P + 'joueurs/' + X.uid + '/pseudo']: pX2, [P + 'pseudos/' + pX.toLowerCase()]: null }));
}

(async () => {
  try { await fetch(`${DB}/.json?${NS}`); } catch (e) { console.error('Émulateur absent : lancer lancer_emulateur.ps1'); process.exit(2); }
  const R = await compteRomain();
  for (const P of ['', 'essai/']) {
    const c = await scenario(P);
    const { A, resume, t } = c;
    await scenarioClasse(P, c, R);
    // Garde-fou NON appliqué (voir rapport) : resume sans salon reste accepté, les parties contre le robot n'ont pas de salon.
    const permis = await req(A, 'PUT', P + 'resume/9-' + t, { ...resume, m: 'golem-normal' });
    console.log(`[${P ? 'essai' : 'public'}] info : resume sans salon ${permis ? 'accepté (garde-fou non appliqué, voulu)' : 'refusé'}`);
  }
  console.log(`${ok} réussis, ${ko} échoués`);
  for (const e of echecs) console.log('  ÉCHEC ' + e);
  process.exit(ko ? 1 : 0);
})();
