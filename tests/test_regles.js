// Tests des règles de la Realtime Database contre l'émulateur local (lancer_emulateur.ps1 d'abord).
// API REST de l'émulateur : Auth 9099, Database 9000, projet demo-les-golems. Rien ne part en ligne.
// Usage : node tests/test_regles.js
// Chaque test est joué deux fois : site public (préfixe "") et site d'essai (préfixe "essai/").

const AUTH = 'http://127.0.0.1:9099/identitytoolkit.googleapis.com/v1/accounts:signUp?key=demo';
const DB = 'http://127.0.0.1:9000';
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

  // Comptes : pseudo réservé et pseudo du compte dans la même écriture (comme salon-firebase.js creer()).
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
  await attendu(ici('engagement de la partie'), true, req(A, 'PUT', S + '/engages', { [A.uid]: true, [B.uid]: true }));
  await attendu(ici('coup de A'), true, req(A, 'POST', S + '/coups', { a: A.uid, s: 'sa', g: 5, n: 0, c: 'p1' }));
  await attendu(ici('coup de B'), true, req(B, 'POST', S + '/coups', { a: B.uid, s: 'sb', g: 5, n: 0, c: 'p2' }));
  await attendu(ici('coup au nom d\'un autre'), false, req(X, 'POST', S + '/coups', { a: X.uid, s: 'sx', g: 5, n: 0, c: 'p3' }));
  await attendu(ici('chat'), true, req(A, 'POST', S + '/chat', { a: A.uid, p: pA, t: HEURE, m: 'Bonne partie' }));
  await attendu(ici('spectateur X'), true, req(X, 'PUT', S + '/spectateurs/' + X.uid, { p: pX, t: HEURE }));
  await attendu(ici('chat du spectateur'), true, req(X, 'POST', S + '/chat', { a: X.uid, p: pX, t: HEURE, m: 'Allez' }));
  await attendu(ici('siège après engagement (spectateur non engagé)'), false, req(X, 'PUT', S + '/siege', X.uid));

  // Fin de partie (ordre de salon-firebase.js : historique, cumul, stats, classement, profil ; resume à part).
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
  const r = await fetch('http://127.0.0.1:9099/identitytoolkit.googleapis.com/v1/accounts:signInWithCustomToken?key=demo', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ token: jeton, returnSecureToken: true }) });
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
  await attendu(ici('salon classé (cl) par le créateur'), true, req(A, 'PUT', S2 + '/cl', true));
  await attendu(ici('ouverture du salon (cree)'), true, req(A, 'PUT', S2 + '/cree', HEURE));
  await attendu(ici('ouverture réécrite'), false, req(A, 'PUT', S2 + '/cree', HEURE));
  await attendu(ici('faille siège : le créateur prend le siège'), false, req(A, 'PUT', S2 + '/siege', A.uid));
  await attendu(ici('B prend le siège du salon classé'), true, req(B, 'PUT', S2 + '/siege', B.uid));
  await attendu(ici('B entre dans le salon classé'), true, req(B, 'PUT', S2 + '/joueurs/' + B.uid, { pseudo: pB, sid: 'sb', t: HEURE }));
  await attendu(ici('engagement classé'), true, req(A, 'PUT', S2 + '/engages', { [A.uid]: true, [B.uid]: true }));
  await attendu(ici('cl changé après engagement'), false, req(A, 'PUT', S2 + '/cl', false));
  await attendu(ici('bandeau robot avec adversaire engagé'), false, req(A, 'PUT', S2 + '/robot', { u: A.uid, n: 'normal', t: HEURE }));

  // Partie classée entre joueurs.
  const id = code2 + '-77';
  const partie = { a: A.uid, b: B.uid, gagnant: A.uid, eloA: 1000, eloB: 1000, deltaA: 32, deltaB: -32, robot: false, saison: 0, t: HEURE, sa: code2, gr: '77' };
  await attendu(ici('partie classée par un tiers'), false, req(X, 'PUT', CL + 'parties/' + id, partie));
  await attendu(ici('partie classée, Elo de départ faux'), false, req(A, 'PUT', CL + 'parties/' + id, { ...partie, eloA: 1200 }));
  await attendu(ici('partie classée, id sans graine'), false, req(A, 'PUT', CL + 'parties/' + code2 + '-78', partie));
  await attendu(ici('partie classée hors salon classé'), false, req(A, 'PUT', CL + 'parties/' + c.code + '-77', { ...partie, sa: c.code }));
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
  await attendu(ici('défaite de B appliquée par le gagnant'), true, req(A, 'PATCH', '', appli(B, { elo: 968, parties: 1, partiesTotal: 1, d: 1 })));

  // Classement (copie exacte, placement fini) et Elo affiché.
  const ligne = { pseudo: pA, elo: 1032, rang: 'topaze', v: 1, d: 0 };
  await attendu(ici('classement pendant le placement'), false, req(A, 'PUT', CL + 'classement/' + A.uid, ligne));
  await req('admin', 'PATCH', J(A), { parties: 5 });
  await attendu(ici('classement, rang faux'), false, req(X, 'PUT', CL + 'classement/' + A.uid, { ...ligne, rang: 'diamant' }));
  await attendu(ici('classement, Elo faux'), false, req(A, 'PUT', CL + 'classement/' + A.uid, { ...ligne, elo: 1500, rang: 'diamant' }));
  await attendu(ici('classement, pseudo usurpé'), false, req(X, 'PUT', CL + 'classement/' + A.uid, { ...ligne, pseudo: pX }));
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
  // L'ancien Elo est refusé ; le site relit classe/joueurs puis réécrit (salon-firebase.js, publieProfil) : accepté.
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
  await attendu(ici('instantané de fin de saison'), true, req(A, 'PUT', CL + 'instantanes/0/' + A.uid, ins));
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

  // 0.6 : propositions de guides (fenêtre « Proposer un guide »).
  const PG = P + 'propositionsGuides/', pv = { u: A.uid, p: pA, ty: 'v', ti: 'Magma rapide', yt: 'Xk29fQ_r7Ls', d1: 'GOL2-KgMPA8ADDAgA', t: HEURE };
  await attendu(ici('proposition vidéo'), true, req(A, 'PUT', PG + 'pa' + t, pv));
  await attendu(ici('proposition texte'), true, req(A, 'PUT', PG + 'pb' + t, { u: A.uid, p: pA, ty: 't', ti: 'Mon plan', tx: 'Pose Roche en premier.', d1: 'GOL2-KgMPA8ADDAgA', d2: 'GOL1-QUJD', t: HEURE }));
  await attendu(ici('proposition modifiée par son auteur'), false, req(A, 'PUT', PG + 'pa' + t, { ...pv, ti: 'Autre titre' }));
  await attendu(ici('proposition par un invité'), false, req(G, 'PUT', PG + 'pg' + t, { ...pv, u: G.uid }));
  await attendu(ici('proposition au nom de B'), false, req(A, 'PUT', PG + 'pc' + t, { ...pv, u: B.uid }));
  await attendu(ici('proposition, pseudo de B'), false, req(A, 'PUT', PG + 'pd' + t, { ...pv, p: pB }));
  await attendu(ici('proposition vidéo sans lien'), false, req(A, 'PUT', PG + 'pe' + t, { ...pv, yt: undefined }));
  await attendu(ici('proposition, lien invalide'), false, req(A, 'PUT', PG + 'pf' + t, { ...pv, yt: 'https://exemple.fr' }));
  await attendu(ici('proposition sans deck'), false, req(A, 'PUT', PG + 'ph' + t, { ...pv, d1: undefined }));
  await attendu(ici('proposition, champ inconnu'), false, req(A, 'PUT', PG + 'pi' + t, { ...pv, x: 1 }));
  await attendu(ici('propositions lues par un joueur'), false, req(A, 'GET', PG));
  await attendu(ici('propositions lues par Romain'), true, req(R, 'GET', PG));
  await attendu(ici('proposition effacée par Romain'), true, req(R, 'DELETE', PG + 'pa' + t));

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
