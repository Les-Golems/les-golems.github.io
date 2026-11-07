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
  await attendu(ici('invité écrit un resume'), false, req(G, 'PUT', P + 'resume/7-' + t, resume));

  return { A, code, resume, t };
}

(async () => {
  try { await fetch(`${DB}/.json?${NS}`); } catch (e) { console.error('Émulateur absent : lancer lancer_emulateur.ps1'); process.exit(2); }
  for (const P of ['', 'essai/']) {
    const { A, resume, t } = await scenario(P);
    // Garde-fou NON appliqué (voir rapport) : resume sans salon reste accepté, les parties contre le robot n'ont pas de salon.
    const permis = await req(A, 'PUT', P + 'resume/9-' + t, { ...resume, m: 'golem-normal' });
    console.log(`[${P ? 'essai' : 'public'}] info : resume sans salon ${permis ? 'accepté (garde-fou non appliqué, voulu)' : 'refusé'}`);
  }
  console.log(`${ok} réussis, ${ko} échoués`);
  for (const e of echecs) console.log('  ÉCHEC ' + e);
  process.exit(ko ? 1 : 0);
})();
