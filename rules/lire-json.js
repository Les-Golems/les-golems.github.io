// Lecture d'un fichier de règles Firebase (JSON avec commentaires //) et comparaison sémantique.
const fs = require('fs');

function sansCommentaires(t) {
  let o = '', dansChaine = false;
  for (let i = 0; i < t.length; i++) {
    const c = t[i];
    if (dansChaine) {
      o += c;
      if (c === '\\') { o += t[++i]; } else if (c === '"') dansChaine = false;
      continue;
    }
    if (c === '"') { dansChaine = true; o += c; continue; }
    if (c === '/' && t[i + 1] === '/') { while (i < t.length && t[i] !== '\n') i++; o += '\n'; continue; }
    o += c;
  }
  return o;
}

function lireRegles(chemin) {
  return JSON.parse(sansCommentaires(fs.readFileSync(chemin, 'utf8').replace(/^﻿/, '')));
}

// Écarts entre deux arbres (ordre des clés ignoré).
function ecarts(a, b, chemin = '', sortie = []) {
  const objA = a !== null && typeof a === 'object' && !Array.isArray(a);
  const objB = b !== null && typeof b === 'object' && !Array.isArray(b);
  if (!objA || !objB) {
    if (JSON.stringify(a) !== JSON.stringify(b)) sortie.push({ chemin, avant: a, apres: b });
    return sortie;
  }
  for (const k of new Set([...Object.keys(a), ...Object.keys(b)])) ecarts(a[k], b[k], chemin + '/' + k, sortie);
  return sortie;
}

module.exports = { sansCommentaires, lireRegles, ecarts };
