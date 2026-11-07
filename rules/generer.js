// Fabrique database.rules.json à partir des blocs de rules/ : site public à la racine, site d'essai sous essai/,
// identiques au préfixe près.
//   node rules/generer.js             écrit database.rules.json
//   node rules/generer.js --verifier  échoue (code 1) si le fichier n'est pas à jour, si le miroir essai/ lit la base
//                                     sans son préfixe, ou si une source remonte à une collection par parent().parent()
const fs = require('fs'), path = require('path');
const { lireRegles } = require('./lire-json');

const ICI = __dirname, CIBLE = path.join(ICI, '..', 'database.rules.json');
const BLOCS = ['10-comptes.js', '20-en-ligne.js', '30-stats.js', '40-nouveautes.js'];
// Remonter de plusieurs crans pour atteindre une collection de la racine (le bug de essai/activite) : interdit.
const VERS_AILLEURS = /parent\(\)\.parent\(\)(\.parent\(\))*\.child\('(pseudos|joueurs|hall|activite|annonces|salons|classement|profils|resume|nouveautes|essai)'\)/;
const RACINE = 'root', RACINE_ESSAI = "root.child('essai')";

function blocs(r) {
  const o = {};
  for (const b of BLOCS) {
    const part = require(path.join(ICI, b))(r);
    for (const k in part) {
      if (k in o) throw new Error(`Clé ${k} définie deux fois (${b})`);
      o[k] = part[k];
    }
  }
  return o;
}

function texte() {
  const regles = {
    rules: {
      // Rien en lecture ni en écriture à la racine.
      '.read': false,
      '.write': false,
      ...blocs(RACINE),
      essai: blocs(RACINE_ESSAI)
    }
  };
  const corps = JSON.stringify(regles, null, 2);
  return '// FICHIER GÉNÉRÉ par rules/generer.js : ne pas modifier à la main, modifier rules/*.js puis relancer\n' +
    '//   node rules/generer.js   (contrôle : node rules/generer.js --verifier)\n' +
    "// Règles de la Realtime Database « les-golems » (à coller dans la console, onglet Règles).\n" +
    "// essai/ = site d'essai (les-golems.github.io/essai) : mêmes règles, données séparées (comptes Auth partagés).\n" +
    corps + '\n';
}

// Toutes les chaînes d'un arbre de règles.
function chaines(o, sortie = []) {
  if (typeof o === 'string') sortie.push(o);
  else if (o && typeof o === 'object') for (const k in o) chaines(o[k], sortie);
  return sortie;
}

function verifier() {
  const fautes = [];
  for (const b of BLOCS) {
    const t = fs.readFileSync(path.join(ICI, b), 'utf8').split('\n').filter(l => !/^\s*\/\//.test(l)).join('\n');
    if (VERS_AILLEURS.test(t)) fautes.push(`${b} : parent().parent()...child(<collection>) interdit (passer par r)`);
    if (/[^.\w]root\./.test(t) || /["`]root\./.test(t)) fautes.push(`${b} : root. en dur (passer par r)`);
  }
  const genere = texte();
  if (!fs.existsSync(CIBLE) || fs.readFileSync(CIBLE, 'utf8') !== genere) fautes.push('database.rules.json pas à jour : lancer node rules/generer.js');
  const r = lireRegles(CIBLE).rules;
  for (const s of chaines(r.essai)) {
    const sans = s.split(RACINE_ESSAI).join('');
    if (/\broot\b/.test(sans)) fautes.push(`essai/ lit la base sans préfixe : ${s.slice(0, 120)}`);
  }
  // Miroir identique au préfixe près.
  const p = { ...r }; delete p.essai; delete p['.read']; delete p['.write'];
  const e = JSON.parse(JSON.stringify(r.essai).split(RACINE_ESSAI).join(RACINE));
  if (JSON.stringify(p) !== JSON.stringify(e)) fautes.push('essai/ diffère du site public au-delà du préfixe');
  if (fautes.length) { console.error('Échec :\n- ' + fautes.join('\n- ')); process.exit(1); }
  console.log('Règles à jour, miroir essai/ correct.');
}

if (process.argv.includes('--verifier')) verifier();
else { fs.writeFileSync(CIBLE, texte()); console.log('database.rules.json écrit.'); }
