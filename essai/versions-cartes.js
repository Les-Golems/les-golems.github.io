/* Les Golems : version de la DERNIÈRE modification de chaque carte (effet, coût, Force, éléments, règle qui la touche).
   À RENSEIGNER À CHAQUE PATCH : une ligne par carte modifiée, code de la carte -> version du site (sans le « v »).
   Une carte absente n'a pas changé depuis sa création. Un nouveau changement remplace l'ancienne version de la ligne.
   Lu par l'interface seule (onglets/decks.js, etqVersionDeck) : l'étiquette de version d'un deck passe en ROUGE (vx-diff)
   si une de ses cartes a été modifiée après la version du deck, avec la raison au survol. Ne change jamais le jeu.
   Fichier à la racine (hors cartes/donnees) : un correctif d'affichage peut le mettre à jour sans toucher aux données du moteur. */
window.VERSIONS_CARTES={
  '004':'0.4','004e':'0.4', /* Le Q et son évolution : rework Brume et Magma, nouveaux effets */
  '901':'0.5','902':'0.5','903':'0.5' /* animaux de compagnie retravaillés : coût 0, plus de case, +1 de Force à leur maître */
};
