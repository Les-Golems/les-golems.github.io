/* Onglet Comment jouer, vue Regles (maquette 31 - Comment jouer\Regles\A, validee le 9 nov. 2026) : sommaire (1 colonne) + section (3 colonnes),
   recherche commune a la barre (#cjRech), pastilles des mots du lexique (bulle au clic), pictos dans le texte, noms de cartes cliquables (texteLog),
   pagination des longues sections (Lexique, Precisions) en bas a droite, compteur « 1/16 » sans espaces en haut (audit 34, D06).
   Le selecteur « Regles | Guides » et la hauteur de la vue sont geres par onglets/guides.js (cjVue). Aide rapide : cercle des elements (#cercleAide). */
(()=>{
/* Cercle de l'aide rapide (fenetre #aide) */
const E=['magma','cristal','foudre','brume','roche'],N=['Magma','Cristal','Foudre','Brume','Roche'],R=118,cx=180,cy=172,pt=(a,r)=>[cx+r*Math.cos(a),cy+r*Math.sin(a)].map(v=>v.toFixed(1));
let a='',b='',k='';E.forEach((e,i)=>{
  const t=-Math.PI/2+i*2*Math.PI/5,[x,y]=pt(t,R),m=.36,p=pt(t+m,R),q=pt(t+2*Math.PI/5-m,R);
  a+='<path d="M'+p+'A'+R+' '+R+' 0 0 1 '+q+'" marker-end="url(#fl2)"/>';
  b+='<image href="'+imgV('cartes/'+e+'.png')+'" x="'+(x-29)+'" y="'+(y-29)+'" width="58" height="58"/><text x="'+x+'" y="'+(+y+45)+'">'+N[i]+'</text>';
  k+='<circle cx="'+x+'" cy="'+y+'" r="33" style="fill:var(--panneau);stroke:var(--'+e+');stroke-width:3"/>';
});
if($('cercleAide'))$('cercleAide').innerHTML='<svg class="cercle-el" viewBox="0 0 360 350" role="img" aria-label="Cercle des éléments : Magma domine Cristal, Cristal domine Foudre, Foudre domine Brume, Brume domine Roche, Roche domine Magma"><defs><marker id="fl2" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="5" markerHeight="5" orient="auto"><path d="M0 0L10 5L0 10Z" style="fill:var(--bleu);stroke:none"/></marker></defs>'+a+k+b+'</svg>';
})();
window.golemsRegles=(()=>{
if(!$('rgVue'))return null;
/* Images de la maquette (img/...) -> images du site, cherchees dans les fiches par leur nom (aucun code de carte en dur, sauf KaTarN, liste blanche du test). */
const CJ_C=Object.values(M.CARTES),cjNom=(n,f)=>CJ_C.find(c=>c.nom===n&&f(c));
const CJ_IMG={'001.jpg':()=>imgV('cartes/001.jpg'),'@cyrdan':()=>{const c=cjNom('Cyrdan',c=>!c.base);return c&&imgV('cartes/'+c.id+'.jpg')},
  '@kchanEvo':()=>{const c=CJ_C.find(c=>c.base&&window.GolemsDonnees.nomLong(c.id).startsWith('K-Chan'));return c&&imgV('cartes/'+c.id+'.jpg')},
  '@kiwi':()=>{const c=cjNom('Kiwi',c=>c.animal);return c&&imgV('cartes/'+c.id+'.jpg')},
  '@boutique':()=>{const T=M.TERRAINS.find(x=>x.nom==='La Boutique');return T&&srcTerrain(T)}};
function chemins(r){r.querySelectorAll('img[src^="img/"],image[href^="img/"]').forEach(i=>{const at=i.tagName==='IMG'?'src':'href',f=i.getAttribute(at).slice(4),s=CJ_IMG[f]?CJ_IMG[f]():imgV('cartes/'+f);if(s)i.setAttribute(at,s)})}
const FORCE='<svg viewBox="0 0 66 66"><svg width="66" height="66" viewBox="71 35 458 529"><path d="M300 98 L285 98 Q210 152 144 164 L144 370 L281 490 Z" fill="#bf6049" stroke="#bf6049" stroke-width="1.5" stroke-linejoin="round"/><path d="M300 98 L315 98 Q390 152 456 164 L456 367 L281 490 Z" fill="#8a3524" stroke="#8a3524" stroke-width="1.5" stroke-linejoin="round"/><path d="M281.2 52 L300 52 L300 98 L285 98Z" fill="#d27a5e" stroke="#d27a5e" stroke-width="1.5" stroke-linejoin="round"/><path d="M300 52 L318.8 52 L315 98 L300 98Z" fill="#a4452f" stroke="#a4452f" stroke-width="1.5" stroke-linejoin="round"/><path d="M318.8 52 Q398.7 112 499.75 126 L456 164 Q390 152 315 98Z" fill="#d27a5e" stroke="#d27a5e" stroke-width="1.5" stroke-linejoin="round"/><path d="M499.75 126 L499.75 390 L456 367 L456 164Z" fill="#70291b" stroke="#70291b" stroke-width="1.5" stroke-linejoin="round"/><path d="M499.75 390 L325.85 512 L295.3 534 L280 547 L281 490 L456 367Z" fill="#551d13" stroke="#551d13" stroke-width="1.5" stroke-linejoin="round"/><path d="M280 547 L100.25 390 L144 370 L281 490Z" fill="#a4452f" stroke="#a4452f" stroke-width="1.5" stroke-linejoin="round"/><path d="M100.25 390 L100.25 126 L144 164 L144 370Z" fill="#d27a5e" stroke="#d27a5e" stroke-width="1.5" stroke-linejoin="round"/><path d="M100.25 126 Q201.3 112 281.2 52 L285 98 Q210 152 144 164Z" fill="#efb096" stroke="#efb096" stroke-width="1.5" stroke-linejoin="round"/><path d="M160 180 Q222 166 288 116" fill="none" stroke="#ffe3d6" stroke-opacity=".55" stroke-width="7" stroke-linecap="round"/><path d="M281.2 52 L318.8 52 Q398.7 112 499.75 126 L499.75 390 L325.85 512 L295.3 534 L280 547 L100.25 390 L100.25 126 Q201.3 112 281.2 52Z" fill="none" stroke="#0b0a10" stroke-width="34" stroke-linejoin="round"/></svg></svg>',ENCL='<svg viewBox="0 9 180 144" style="overflow:visible"><defs><clipPath id="cB"><path d="M50 14L170 14L170 52L140 58Q130 78 136 100L158 114L158 148L42 148L42 114L64 100Q70 78 60 58L52 56Q20 50 6 16Z"/></clipPath><linearGradient id="gB" x1="10" y1="10" x2="165" y2="150" gradientUnits="userSpaceOnUse"><stop offset="0" stop-color="#a9b4bd"/><stop offset=".42" stop-color="#6f7a84"/><stop offset=".62" stop-color="#3b434b"/><stop offset="1" stop-color="#1f252a"/></linearGradient><linearGradient id="fB" x1="0" y1="20" x2="0" y2="148" gradientUnits="userSpaceOnUse"><stop offset="0" stop-color="#4b545d"/><stop offset="1" stop-color="#2d343b"/></linearGradient></defs><g clip-path="url(#cB)"><rect width="180" height="160" fill="url(#fB)"/><path d="M100 0H180V160H100Z" fill="#000" fill-opacity=".2"/><path d="M50 14L170 14L170 52L140 58Q130 78 136 100L158 114L158 148L42 148L42 114L64 100Q70 78 60 58L52 56Q20 50 6 16Z" fill="none" stroke="url(#gB)" stroke-width="20"/></g><path d="M50 14L170 14L170 52L140 58Q130 78 136 100L158 114L158 148L42 148L42 114L64 100Q70 78 60 58L52 56Q20 50 6 16Z" fill="none" stroke="#0b0a10" stroke-width="10" stroke-linejoin="round"/></svg>',ETOILE='<svg viewBox="-6 -6 312 318"><path d="M150.0 162.0 L103.0 97.3 L150.0 20.0 Z" fill="#ffe48a" stroke="#ffe48a" stroke-width="1" stroke-linejoin="round"/><path d="M150.0 162.0 L150.0 20.0 L197.0 97.3 Z" fill="#f09a1a" stroke="#f09a1a" stroke-width="1" stroke-linejoin="round"/><path d="M150.0 162.0 L197.0 97.3 L288.9 116.9 Z" fill="#ffc02e" stroke="#ffc02e" stroke-width="1" stroke-linejoin="round"/><path d="M150.0 162.0 L288.9 116.9 L222.3 185.5 Z" fill="#b8650f" stroke="#b8650f" stroke-width="1" stroke-linejoin="round"/><path d="M150.0 162.0 L222.3 185.5 L231.1 273.6 Z" fill="#f09a1a" stroke="#f09a1a" stroke-width="1" stroke-linejoin="round"/><path d="M150.0 162.0 L231.1 273.6 L150.0 244.0 Z" fill="#b8650f" stroke="#b8650f" stroke-width="1" stroke-linejoin="round"/><path d="M150.0 162.0 L150.0 244.0 L65.4 278.5 Z" fill="#f09a1a" stroke="#f09a1a" stroke-width="1" stroke-linejoin="round"/><path d="M150.0 162.0 L65.4 278.5 L75.8 186.1 Z" fill="#ffc02e" stroke="#ffc02e" stroke-width="1" stroke-linejoin="round"/><path d="M150.0 162.0 L75.8 186.1 L16.9 118.7 Z" fill="#ffc02e" stroke="#ffc02e" stroke-width="1" stroke-linejoin="round"/><path d="M150.0 162.0 L16.9 118.7 L103.0 97.3 Z" fill="#f09a1a" stroke="#f09a1a" stroke-width="1" stroke-linejoin="round"/><path d="M150.0 20.0 L197.0 97.3 L190.4 106.3 L150.0 39.9 Z" fill="#ffc02e" stroke="#ffc02e" stroke-width="1"/><path d="M197.0 97.3 L288.9 116.9 L269.4 123.2 L190.4 106.3 Z" fill="#fff0b0" stroke="#fff0b0" stroke-width="1"/><path d="M288.9 116.9 L222.3 185.5 L212.2 182.2 L269.4 123.2 Z" fill="#b8650f" stroke="#b8650f" stroke-width="1"/><path d="M222.3 185.5 L231.1 273.6 L219.8 258.0 L212.2 182.2 Z" fill="#b8650f" stroke="#b8650f" stroke-width="1"/><path d="M231.1 273.6 L150.0 244.0 L150.0 232.5 L219.8 258.0 Z" fill="#b8650f" stroke="#b8650f" stroke-width="1"/><path d="M150.0 244.0 L65.4 278.5 L77.2 262.2 L150.0 232.5 Z" fill="#b8650f" stroke="#b8650f" stroke-width="1"/><path d="M65.4 278.5 L75.8 186.1 L86.2 182.7 L77.2 262.2 Z" fill="#fff0b0" stroke="#fff0b0" stroke-width="1"/><path d="M75.8 186.1 L16.9 118.7 L35.5 124.8 L86.2 182.7 Z" fill="#ffc02e" stroke="#ffc02e" stroke-width="1"/><path d="M16.9 118.7 L103.0 97.3 L109.6 106.3 L35.5 124.8 Z" fill="#fff0b0" stroke="#fff0b0" stroke-width="1"/><path d="M103.0 97.3 L150.0 20.0 L150.0 39.9 L109.6 106.3 Z" fill="#fff0b0" stroke="#fff0b0" stroke-width="1"/><path d="M150.0 20.0 L197.0 97.3 L288.9 116.9 L222.3 185.5 L231.1 273.6 L150.0 244.0 L65.4 278.5 L75.8 186.1 L16.9 118.7 L103.0 97.3 Z" fill="none" stroke="#0b0b10" stroke-width="13" stroke-linejoin="round"/></svg>';
let UID=0;const uid=v=>{const n=++UID;return v.replace(/id="(\w+)"/g,'id="$1_'+n+'"').replace(/url\(#(\w+)\)/g,'url(#$1_'+n+')')};const ic=s=>`<span class="ico">${uid(s)}</span>`;
const NE={magma:'Magma',cristal:'Cristal',foudre:'Foudre',brume:'Brume',roche:'Roche'};
const el=e=>`<img class="pe" src="img/${e}.png" alt="">${NE[e]}`;
const DEF={};
const K=(m,c)=>`<span class="rg-mot" tabindex="0" data-k="${c||m}">${m}</span>`;
const CARTE='<svg viewBox="0 0 66 66" style="color:#01C1F0"><g fill="#1a2a38" stroke="currentColor" stroke-width="5" stroke-linejoin="round"><rect x="23" y="5" width="30" height="42" rx="4"/><rect x="17" y="11" width="30" height="42" rx="4"/><rect x="11" y="17" width="30" height="42" rx="4"/></g></svg>';
const DEFAU='<svg viewBox="0 0 66 66" style="color:#01C1F0"><g fill="none" stroke="currentColor" stroke-width="5" stroke-linejoin="round" stroke-linecap="round"><rect x="13" y="7" width="38" height="50" rx="5" transform="rotate(7 32 32)"/><path d="M23 23L41 41M41 23L23 41"/></g></svg>';
const MAIN='<svg viewBox="0 0 66 66" style="color:#01C1F0"><g fill="#1a2a38" stroke="currentColor" stroke-width="5" stroke-linejoin="round"><rect x="9" y="17" width="23" height="36" rx="4" transform="rotate(-18 20 35)"/><rect x="34" y="17" width="23" height="36" rx="4" transform="rotate(18 45 35)"/><rect x="21" y="9" width="24" height="38" rx="4"/></g></svg>';
const MOTS=[
 ["Remporter","Avoir la plus grande Force sur un terrain en fin de manche : tu marques ses points. Égalité : personne ne le remporte."],
 ["Amicale","Partie sans enjeu de rang : ni Elo gagné ni Elo perdu."],
 ["Base","Version d'un Golem sans évolution. Elle doit être en jeu pour poser son évolution, et dans le deck pour y mettre l'évolution."],
 ["Classée","Partie qui compte pour ton rang : tu gagnes ou perds des points d'Elo selon le résultat."],
 ["Défausse","La pile des cartes qui quittent le jeu : Golems détruits ou remplacés, base d'un Golem amélioré, animal qui part, cartes défaussées de ta main. Une carte en défausse ne revient jamais en jeu."],
 ["Favori","Le Golem allié que tu choisis à la pose d'Indra, La Groupie. Il gagne +1 de Force tant qu'Indra, La Groupie est en jeu (+2 avec La Fan enflammée), et il le reste si l'une des deux est améliorée."],
 ["Main","Les cartes que tu tiens : 5 au départ, 7 au plus en fin de tour."],
 ["Manche","Une partie se joue en 3 manches, et chaque manche en 3 tours par joueur. Elle se termine par le décompte."],
 ["Mulligan","Au départ, remettre jusqu'à 3 cartes de ta main dans le deck, mélanger et repiocher autant de cartes."],
 ["MVP","En fin de partie, la carte du gagnant qui a le plus pesé : Force sur les terrains, bonus donnés, dégâts infligés et Golems détruits."],
 ["Pioche","Prendre la carte du dessus de ton deck : 2 par tour (1 au premier tour de la manche pour le second joueur)."],
 ["À la pose","À chaque arrivée sur la grille (Poser, Remplacer, Améliorer), après paiement."],
 ["Améliorer","Payer le coût d'une évolution pour la poser sur sa base, dès le tour de la pose."],
 ["Animal de compagnie","Coût 0, se glisse sous son maître et lui donne +1 de Force. Ce n'est pas un Golem."],
 ["Cercle","+1 de Force si le Golem en face a un élément que le tien domine. Jamais plus de +1, sauf effet de carte."],
 ["Ciblé","Touché par un effet adverse, de carte ou de terrain, même s'il touche plusieurs Golems. Un Golem Mode Avion n'en subit aucun."],
 ["Copie","On ne prend que l'effet, ni le nom, ni la Force, ni les éléments."],
 ["Décompte","En fin de manche, somme de la Force actuelle de tes Golems dans chaque colonne."],
 ["Dégâts","Force perdue. Ils restent d'une manche à l'autre. À 0 ou moins, le Golem est détruit."],
 ["Deck vide","Chaque carte que tu dois piocher donne 1 point à ton adversaire."],
 ["En face","Même terrain, même ligne, côté adverse."],
 ["En jeu","Une carte posée sur une grille, tant qu'elle y reste."],
 ["Énergie","Donnée par la Forge, 1 par carte et par tour. Perdue en fin de tour."],
 ["Évolution","Se pose sur sa base. Elle a sa propre Force et son propre effet ; ses dégâts sont effacés. Elle garde le favori, l'animal et les bonus reçus."],
 ["Forge","0 ou 1 carte de ta main, face cachée, définitivement, après la pioche. Ta seule source d'énergie."],
 ["Force actuelle","Force de la carte + bonus + Trait + cercle - dégâts subis."],
 ["Hors décompte","Le Golem tiré par Kiwi, Le lapin de Titom76, reste en jeu, mais sa Force sort de sa colonne."],
 ["Ligne adverse","Les 3 cases adverses de la même ligne."],
 ["Mise","Le terrain Les Pronos : 1 énergie misée par manche ; celui qui remporte le terrain marque 1 point de plus par mise des deux joueurs."],
 ["Poser","Payer le coût d'une carte pour la placer sur une case libre."],
 ["Récupérer X","Ton Golem regagne jusqu'à X de Force perdue, sans dépasser sa Force de base."],
 ["Remplacer","Payer le coût de la nouvelle carte ; l'ancienne va à la défausse. Seulement tes Golems."],
 ["Tarte","Le Cirque : une fois par manche, 1 dégât gratuit à un Golem adverse de cette colonne. Mode Avion en protège."],
 ["Trait","Pour chacun de tes 2 éléments, +1 de Force par voisin allié qui le partage. Un voisin qui a tes deux éléments compte deux fois : jusqu'à +8 de Force au centre de la grille."],
 ["Un seul Golem","Le Versus : pas de 2e Golem ici. À chaque pose, le Golem adverse ici perd 1 de Force."],
 ["Valeur variable","Terrain marqué « ? » : sa valeur change selon la manche (Le Tournoi : 1, 2 puis 3 points)."],
 ["Voisin","Golem allié sur une case adjacente, sans diagonale."]];
function norm0(x){return String(x).normalize('NFD').replace(/[̀-ͯ]/g,'').toLowerCase()}
MOTS.sort((a,b)=>norm0(a[0]).localeCompare(norm0(b[0])));MOTS.forEach(([m,d])=>DEF[norm0(m)]=d);
const PREC=[
 ["Menfou palu","Effet","Il reste ciblable : un effet adverse le vise, mais ne lui fait pas perdre de Force. Le Versus lui en fait perdre quand même (une perte de terrain n'est pas un effet adverse)."],
 ["Chance du débutant","Effet","Une seule fois par partie. Ne protège pas contre Le Versus."],
 ["Il suffit","Effet","Une base et son évolution comptent comme deux cartes différentes ; chaque grille est comptée à part. La destruction a lieu avant les morts en chaîne."],
 ["Jour de pêche","Effet","Deck adverse vide : rien, et regarder n'est pas piocher. Une seule carte : elle est défaussée d'office."],
 ["Rage","Effet","+1 seulement si le Golem survit à la perte, 3 au maximum."],
 ["Slam","Effet","Seuls les Golems adverses ciblables qui ont une case libre adjacente, sans diagonale. Sinon, rien."],
 ["Imitation","Effet","Case vide ou animal en face : rien. La copie est facultative."],
 ["Déguisement","Effet","Aucun voisin : rien. Un seul voisin : copié d'office."],
 ["Graine de Golem","Effet","Se cumule entre exemplaires et compte aussi au premier tour de la manche. Perdue si le Golem est amélioré."],
 ["Réalisation de l'âge","Effet","Se cumule entre exemplaires. Ce n'est pas un ciblage : Mode Avion n'y change rien."],
 ["Sub offert / Draft diff","Effet","Comptent aussi les cartes forgées par Forge éclair (Spom) et par Spam (Trigas), une fois par forge."],
 ["Grand Général","Effet","Se cumule entre exemplaires, sur le même terrain mais une autre ligne, jamais sur lui-même."],
 ["Le Plateau de Jeu","Terrain","C'est le gagnant du terrain qui lance le dé."],
 ["La Boutique","Terrain","La réduction vaut aussi pour remplacer et améliorer, jamais pour un animal."],
 ["Le Buzzer","Terrain","Le Buzzer est résolu en dernier parmi les terrains de chaque joueur."],
 ["Le Cirque","Terrain","<b>Tarte.</b> Une fois par manche, pendant tes actions, 1 dégât gratuit à un Golem adverse de cette colonne. Mode Avion en protège."],
 ["L'École","Terrain","Le joueur qui perd ce terrain pioche 1 carte. Égalité : personne ne pioche."],
 ["Jacen et Jaina","Animal","Animaux de KaTarN, ou de son évolution Slim K. À la pose, pioche 1 carte. Si leur maître est détruit, pioche 1 carte, puis ils partent à la défausse. Si tu remplaces toi-même leur maître, pas de pioche."],
 ["KaTarN","Golem","Compte 8 au décompte de la manche 1, puis 4 à celui de la manche 2, et il est détruit juste après (sans bonus)."],
 ["Kiwi","Animal","Son effet (Mignonitude) joue en fin de manche avant le décompte, puis il part à la défausse. Si les deux joueurs ont Kiwi : celui du premier joueur d'abord, jamais deux fois le même Golem. Les Golems tirés (un par joueur) sont hors décompte : ils restent en jeu avec leurs bonus, seule leur Force sort de leur colonne."],
 ["Mode Avion","Effet","Aucun effet adverse ne peut le toucher, même s'il touche plusieurs Golems (Rap God, Extinction du feu, Le Cirque, Le Versus). Il n'est pas protégé de La Nuit au Village ni de la surtaxe de Réalisation de l'âge."],
 ["La Nuit au Village","Terrain","Se résout avec le premier joueur de la manche. Détruit le Golem le plus faible ici, des deux côtés. Égalité : aucun."],
 ["Les Pronos","Terrain","<b>Mise.</b> Une fois par manche, pendant tes actions, mise 1 énergie ici (bouton « Miser »). Celui qui remporte le terrain marque 1 point de plus par mise des deux joueurs. Personne ne le remporte : les mises sont perdues."],
 ["Le Versus","Terrain","<b>Un seul Golem.</b> Remplacer ou améliorer le tien compte aussi comme une pose : le Golem adverse ici perd 1 de Force. Mode Avion en protège. Un animal ne compte pas et ne déclenche rien."]];
const sansArt=x=>norm0(x.replace(/^(Le |La |Les |L')/,''));
PREC.sort((x,y)=>sansArt(x[0]).localeCompare(sansArt(y[0])));
const rang=(L,n,c)=>{let h='';for(let i=0;i<L.length;i+=n)h+=`<div class="${c}">${L.slice(i,i+n).join('')}</div>`;return h};
const ETAPES=(c)=>`<div class="enc4${c||''}">
 <div><i>Étape 1</i><b>${ic(CARTE)} Pioche</b><small>2 cartes</small></div>
 <div><i>Étape 2</i><b>${ic(ENCL)} Forge</b><small>0 ou 1 carte</small></div>
 <div><i>Étape 3</i><b>Actions</b><small>Poser, remplacer…</small></div>
 <div><i>Étape 4</i><b>${ic(DEFAU)} Fin du tour</b><small>7 cartes max</small></div></div>`;
const S0=[
{id:'essentiel',t:"L'essentiel en 1 minute",h:`
<div class="ess">
 <div class="bl"><h4><span class="n">1</span>Le plateau</h4><svg class="sv" viewBox="0 0 454 182" id="rgSvP"></svg><p>Une colonne par terrain ; ton Golem affronte celui en face : même terrain, même ligne.</p></div>
 <div class="bl"><h4><span class="n">2</span>Ton tour</h4>${ETAPES(' e2')}
  <p>Chaque carte en Forge donne 1 énergie par tour pour payer les cartes ; 3 manches de 3 tours.</p></div>
 <div class="bl"><h4><span class="n">3</span>Marquer des points</h4><div class="sco" id="rgSvS"></div><p>Par colonne, la plus grande Force remporte les points du terrain ; après 3 manches, le plus de points gagne.</p></div>
 <div class="bl"><h4><span class="n">4</span>Les éléments</h4><div class="el4"><div><svg class="cercle petit" id="rgCerE"></svg></div>
  <div><p><b>Cercle :</b> ${ic(FORCE)} +1 si ton Golem domine celui d'en face.</p><p><b>Trait :</b> ${ic(FORCE)} +1 par voisin allié qui partage un de ses éléments.</p></div></div>
  <p class="leg5 l1">${["magma","cristal","foudre","brume","roche"].map(e=>`<span><img class="pe" src="img/${e}.png" alt="">${NE[e]}</span>`).join("")}</p><p style="padding-top:6px">Chaque flèche va de l'élément qui domine vers l'élément dominé.</p></div>
</div>`},
{id:'partie',t:'La partie',h:`
<div class="cols">
 <div class="bl"><h4>${ic(ETOILE)} Le but</h4><ul>
  <li>Marquer le plus de points en remportant des terrains.</li>
  <li>La partie dure <b>3 manches</b> de <b>3 tours</b> par joueur.</li>
  <li>Le premier joueur est tiré au sort, puis il change à chaque manche.</li></ul></div>
 <div class="bl"><h4>Le plateau</h4><ul>
  <li><b>3 terrains</b> tirés au hasard parmi 16, placés aléatoirement. Chacun rapporte les points imprimés dessus.</li>
  <li>Chaque joueur a une <b>grille 3 x 3</b>, en miroir de l'autre. Une colonne = un terrain.</li></ul></div>
</div>
<div class="bl mt"><h4>Désigner une case</h4>
 <div class="duo"><div class="plat"><small class="lg" style="color:#ee6a2c;font-weight:800">ADVERSAIRE</small>
  <div class="gr adv"><span></span><span></span><span></span><span class="la">ligne</span><span class="fa">en face</span><span class="la">ligne</span><span></span><span></span><span></span></div>
  <div class="trs"><span>Terrain 1</span><span>Terrain 2</span><span>Terrain 3</span></div>
  <div class="gr toi"><span></span><span class="vo">voisin</span><span></span><span class="vo">voisin</span><span class="moi">toi</span><span class="vo">voisin</span><span></span><span class="vo">voisin</span><span></span></div><small class="lg" style="color:#01C1F0;font-weight:800">TOI</small>
 </div>
 <div><p>Les cartes ne citent jamais de numéro de ligne ou de colonne : elles désignent les cases par le terrain, la case en face ou la ligne adverse.</p>
 <ul class="leg mt">
  <li><i style="background:var(--magma)"></i><b>En face :</b>&nbsp;même terrain, même ligne.</li>
  <li><i style="background:rgba(238,106,44,.25);border:1px solid var(--magma)"></i><b>Ligne adverse :</b>&nbsp;les 3 cases adverses de la même ligne.</li>
  <li><i style="background:rgba(1,193,240,.18);border:1px solid var(--bleu)"></i><b>Voisin :</b>&nbsp;Golem allié adjacent, sans diagonale.</li>
  <li><i style="background:transparent;border:1px dashed #3a5263"></i><b>En jeu :</b>&nbsp;une carte posée sur une grille.</li></ul></div></div></div>`},
{id:'lire',t:'Lire une carte',h:`
<div class="lire4">
 <div class="bl"><h4>Un Golem</h4><div class="an2" id="rgAnG"></div></div>
 <div class="bl"><h4>Une évolution</h4><div class="an2" id="rgAnE"></div></div>
 <div class="bl"><h4>Un animal</h4><div class="an2" id="rgAnA"></div></div>
 <div class="bl"><h4>Un terrain</h4><div class="an2" id="rgAnT"></div></div>
</div>`},
{id:'mise',t:'Mise en place',h:`
<div class="cols c3">
 <div class="bl"><h4><span class="n">1</span>Le deck</h4><p>${ic(CARTE)} Chaque joueur arrive avec son deck de 24 à 30 cartes, mélangé.</p></div>
 <div class="bl"><h4><span class="n">2</span>La main</h4><p>${ic(MAIN)} Pioche <b>5 cartes</b>.</p></div>
 <div class="bl"><h4><span class="n">3</span>Le mulligan</h4><p>${ic(CARTE)} Remets jusqu'à <b>3 cartes</b> dans le deck : on mélange, puis tu repioches autant de cartes.</p></div>
</div>`},
{id:'tour',t:'Le tour de jeu',h:`${ETAPES('')}
<div class="cols">
 <div class="bl"><h4><span class="n">1</span>Pioche</h4><ul>
  <li>${ic(CARTE)} Pioche <b>2 cartes</b>.</li>
  <li>À chaque manche, le joueur qui joue en second ne pioche qu'<b>1 carte</b> à son premier tour.</li>
  <li><b>Deck vide :</b> chaque carte que tu dois piocher donne 1 point à ton adversaire, effets de cartes compris.</li></ul></div>
 <div class="bl"><h4><span class="n">2</span>Forge</h4><ul>
  <li>Toujours juste après la pioche, avant toute action.</li>
  <li>Place 0 ou 1 carte de ta main, face cachée, définitivement.</li>
  <li>Chaque carte en Forge donne <b>1 énergie</b> par tour, dès ce tour. La Forge est ta seule source d'énergie.</li></ul></div>
 <div class="bl"><h4><span class="n">3</span>Actions</h4><p>Paie en énergie, autant de fois que tu veux, puis passe.</p><ul>
  <li><b>Poser :</b> paie le coût de la carte.</li>
  <li><b>Remplacer :</b> paie le coût de la nouvelle carte ; l'ancienne va à la ${ic(DEFAU)} défausse. Seulement tes propres Golems.</li>
  <li><b>Améliorer :</b> paie le coût de l'évolution, dès le tour de la pose. La base doit déjà être en jeu.</li></ul></div>
 <div class="bl"><h4><span class="n">4</span>Fin du tour</h4><ul>
  <li>L'énergie restante est perdue.</li>
  <li>${ic(DEFAU)} Défausse jusqu'à <b>7 cartes</b> en main.</li></ul></div>
</div>`},
{id:'force',t:'Force et dégâts',h:`
<p class="form"><b>Force actuelle</b> = Force de la carte + bonus d'effets + Trait + cercle - dégâts subis.</p>
<div class="cols">
 <div class="bl"><h4>Les dégâts</h4><ul>
  <li>Perdre de la Force, c'est subir des dégâts. Ils restent d'une manche à l'autre.</li>
  <li>On n'attaque que par les effets de cartes.</li>
  <li>À 0 ou moins, le Golem est détruit et part aussitôt à la ${ic(DEFAU)} défausse. Tous ceux à 0 ou moins meurent en même temps, puis on recalcule, et ainsi de suite.</li>
  <li>Tuer ne rapporte rien.</li></ul></div>
 <div class="bl"><h4>Soigner et évoluer</h4><ul>
  <li><b>Récupérer X :</b> ton Golem regagne jusqu'à X de Force perdue, sans dépasser sa Force de base. Sans dégâts, il ne récupère rien.</li>
  <li><b>Évolution :</b> se pose sur sa base, qui part aussitôt à la ${ic(DEFAU)} défausse. L'évolution a sa propre Force et son propre effet ; ses dégâts sont effacés. Elle garde le favori, l'animal et les bonus reçus.</li></ul></div>
</div>`},
{id:'elements',t:'Éléments',h:`
<div class="cols">
 <div class="bl blcer"><h4>Le cercle des éléments</h4><svg class="cercle" id="rgCer"></svg>
  <p class="lg" style="text-align:center;margin-top:8px">Chaque flèche va de l'élément qui domine vers l'élément dominé.</p>
  <ul class="els5 mt">
   <li>${el('magma')} : dégâts et Force pour attaquer</li>
   <li>${el('cristal')} : soutien, bonus et récupération de Force</li>
   <li>${el('foudre')} : énergie et coût des cartes</li>
   <li>${el('brume')} : pioche et deck</li>
   <li>${el('roche')} : terrains, placement et déplacement des cartes</li></ul></div>
 <div>
 <div class="bl"><h4>Cercle : +1 au plus</h4><p>${ic(FORCE)} +1 si le Golem en face a un élément que le tien domine. Jamais plus de +1, sauf effet de carte. Les deux Golems face à face peuvent gagner +1 chacun.</p>
  <div class="face"><figure><img src="img/001.jpg" alt="KaTarN">+1 de Force</figure><span>face à face</span><figure><img src="img/@cyrdan" alt="Cyrdan">+1 de Force</figure></div>
  <p class="lg elx">KaTarN (${el('magma')}, ${el('foudre')})<br>Cyrdan (${el('cristal')}, ${el('roche')})<br>${el('magma')} domine ${el('cristal')}, ${el('roche')} domine ${el('magma')} : les deux gagnent ${ic(FORCE)} +1.</p></div>
 <div class="bl mt"><h4>Trait : jusqu'à ${ic(FORCE)} +8</h4><p>Pour chacun de tes 2 éléments, ${ic(FORCE)} +1 par voisin allié qui le partage. Un voisin qui a tes deux éléments compte donc deux fois. Au centre de la grille, avec 4 voisins aux deux mêmes éléments, ton Golem gagne jusqu'à ${ic(FORCE)} +8.</p><p>Avec KaTarN : deux voisins ${el('foudre')} +2 ; un seul voisin ${el('magma')} et ${el('foudre')} +2 à lui seul.</p>
  <p>Trait et cercle sont toujours actifs : perdre un voisin ou un Golem en face peut détruire un Golem, en chaîne.</p></div>
 </div>
</div>`},
{id:'effets',t:'Effets',h:`
<div class="cols">
 <div class="bl"><h4>Quand ?</h4><ul>
  <li><b>À la pose :</b> à chaque arrivée sur la grille (Poser, Remplacer, Améliorer), après paiement.</li>
  <li>Échanger ou déplacer n'est pas une pose et garde les dégâts.</li>
  <li><b>En jeu :</b> tant que la carte est sur la grille.</li></ul></div>
 <div class="bl"><h4>Comment ?</h4><ul>
  <li>Un effet s'applique en entier. Sans cible, il ne se passe rien.</li>
  <li><b>Copie :</b> on ne prend que l'effet, ni le nom, ni la Force, ni les éléments. Copier un Golem qui a copié donne l'effet qu'il a copié.</li></ul></div>
</div>
<div class="bl mt"><h4>Les cartes ont le dernier mot</h4><p>Les règles décrivent le jeu de base ; une carte peut y faire exception. Par exemple, Maître du bilig donne de l'énergie, et Spom et Trigas forgent en plus. Le détail est dans <a class="lien" href="#" data-s="precisions">Précisions sur les cartes</a>.</p></div>`},
{id:'manche',t:'Fin de manche',h:`
<div class="enc4">
 <div><i>Étape 1</i><b>${ic(FORCE)} Décompte</b><small>Force par colonne</small></div>
 <div><i>Étape 2</i><b>${ic(ETOILE)} Points</b><small>Le plus fort remporte</small></div>
 <div><i>Étape 3</i><b>Effets</b><small>De fin de manche</small></div>
 <div><i>Étape 4</i><b>Suite</b><small>Tout reste en place</small></div></div>
<div class="cols">
 <div class="bl"><h4><span class="n">1</span>Décompte</h4><p>Additionne la Force actuelle de tes Golems dans chaque colonne. Une colonne vide vaut 0. Juste avant, Mignonitude (Kiwi) retire du décompte un Golem par joueur.</p></div>
 <div class="bl"><h4><span class="n">2</span>Points</h4><p>Le plus fort remporte le terrain et marque ses points. Égalité : personne ne le remporte.</p></div>
 <div class="bl"><h4><span class="n">3</span>Effets de fin de manche</h4><p>Pour chaque joueur, en commençant par le premier joueur de la manche : ses Golems d'abord, puis ses terrains de gauche à droite vus du premier joueur.</p></div>
 <div class="bl"><h4><span class="n">4</span>Suite</h4><p>Les cartes et les dégâts restent. Le premier joueur change.</p></div>
</div>`},
{id:'fin',t:'Fin de partie',h:`
<div class="cols">
 <div class="bl"><h4>${ic(ETOILE)} Victoire</h4><p>Le plus de points après la manche 3, effets compris.</p><p class="mt"><b>Il n'y a jamais de match nul.</b></p></div>
 <div class="bl"><h4>En cas d'égalité, dans l'ordre</h4><ol>
  <li>La plus grande Force totale (les trois colonnes) au dernier décompte.</li>
  <li>Le plus de terrains remportés sur toute la partie.</li>
  <li>Celui qui jouait en second à la manche 3.</li></ol></div>
</div>`},
{id:'terrains',t:'Terrains',h:`
<div class="cols">
 <div class="bl"><h4>Principe</h4><ul>
  <li>Un effet de terrain s'applique aux deux joueurs, sauf mention contraire.</li>
  <li>Un terrain est actif toute la partie ; son résultat est définitif pour chaque manche.</li>
  <li>Chaque terrain rapporte les points imprimés dessus.</li></ul></div>
 <div class="bl"><h4>Valeur variable « ? »</h4><p>Un terrain marqué « ? » change de valeur selon la manche. Exemple : Le Tournoi rapporte ${ic(ETOILE)} 1, puis 2, puis 3.</p></div>
</div>`},
{id:'animaux',t:'Animaux de compagnie',h:`
<div class="cols">
 <div class="bl"><h4>Pose et nature</h4><ul>
  <li><b>Pose :</b> ${ic(ENCL)} 0. L'animal se glisse sous son maître, déjà en jeu, et lui donne ${ic(FORCE)} +1. Il ne prend pas de case. Un seul animal par maître.</li>
  <li><b>Pas un Golem :</b> pas de Force à lui, jamais d'évolution. Son seul élément est l'élément majeur de son maître (celui de gauche). Aucun effet ne le concerne ; il ne compte ni pour le Trait, ni pour le cercle, ni pour un terrain.</li>
  <li>Un animal n'est jamais MVP.</li></ul></div>
 <div class="bl"><h4>Deck et maître</h4><ul>
  <li><b>Deck :</b> 1 exemplaire par animal, avec au moins un exemplaire de la base de son maître.</li>
  <li><b>Son maître :</b> s'il quitte le jeu, l'animal part à la ${ic(DEFAU)} défausse ; s'il évolue, l'animal reste ; s'il est déplacé, l'animal le suit.</li>
  <li>Un Golem qui copie son effet n'est pas son maître.</li></ul></div>
</div>`},
{id:'decks',t:'Cartes et decks',h:`
<div class="cols c3">
 <div class="bl"><h4>${ic(CARTE)} Taille</h4><p><b>24 à 30 cartes.</b></p></div>
 <div class="bl"><h4>Exemplaires</h4><p><b>3 au plus</b> par carte, <b>1</b> par animal. Une base et son évolution comptent à part.</p></div>
 <div class="bl"><h4>Éléments</h4><p><b>4 éléments au plus</b> par deck, parmi les 5 (${el('magma')}, ${el('cristal')}, ${el('foudre')}, ${el('brume')}, ${el('roche')}). Un Golem à 2 éléments compte les deux. Un animal ne compte pas dans la limite : il a un seul élément, l'élément majeur de son maître (celui de gauche).</p></div>
</div>
<div class="bl mt"><h4>Pas d'évolution sans sa base</h4><p>Pour mettre une évolution dans ton deck, ajoute au moins un exemplaire de sa carte de base.</p></div>`},
{id:'connexion',t:'Connexion et abandon',h:`
<div class="cols">
 <div class="bl"><h4>Abandon</h4><p>Quitter une partie en cours compte comme un abandon.</p></div>
 <div class="bl"><h4>Perte de connexion</h4><ol>
  <li>Le joueur apparaît « Reconnexion » pendant 10 secondes.</li>
  <li>Puis « Hors ligne » : un minuteur de 60 secondes démarre. S'il ne revient pas à temps, il perd par abandon ; sinon la partie reprend où elle en était.</li>
  <li>Les deux joueurs déconnectés : personne ne gagne, le minuteur repart au retour du premier.</li></ol>
  <p style="margin-top:12px">Connecté à ton compte, tu retrouves ta partie sur n'importe quel appareil. Contre les Golems, pas de minuteur.</p></div>
</div>`},
{id:'lexique',t:'Lexique',h:`<div class="pg"><div class="pict"><span>${ic(ENCL)} Coût</span><span>${ic(FORCE)} Force</span><span>${ic(ETOILE)} Points</span><span>${ic(DEFAU)} Défausse</span><span>${el('magma')}</span><span>${el('cristal')}</span><span>${el('foudre')}</span><span>${el('brume')}</span><span>${el('roche')}</span></div>${rang(MOTS.map(([m,d])=>`<div class="lx"><b>${m}</b><p>${d}</p></div>`),4,'lxr')}</div>`},
{id:'precisions',t:'Précisions sur les cartes',h:'<div class="pg">'+[['Golem','Golems'],['Effet','Effets'],['Animal','Animaux'],['Terrain','Terrains']].map(([k,g])=>`<div class="grp">${g}</div>`+rang(PREC.filter(x=>x[1]===k).map(([n,t,d])=>`<div class="pr"><div class="prt"><b>${n}</b><span class="tg tg-${norm0(t)}">${t}</span></div><p>${d}</p></div>`),3,'prec')).join('')+'</div>'}];
const S=S0;
const norm=s=>String(s).normalize('NFD').replace(/[̀-ͯ]/g,'').toLowerCase();
const txt=h=>{const d=document.createElement('div');d.innerHTML=h;return d.textContent};
const nb=(h,q)=>q?norm(txt(h)).split(q).length-1:0;
let cur=0,Q='';
function rendre(){
  const ok=S.map(s=>!Q||nb(s.h,Q)>0);
  $('rgSom').innerHTML=S.map((s,i)=>`<li><button class="${i===cur?'on':''}${ok[i]?'':' off'}" ${ok[i]?'':'disabled'} data-i="${i}"><i>${i+1}</i><span>${s.t}</span>${Q&&ok[i]?`<b>${nb(s.h,Q)}</b>`:''}</button></li>`).join('');
  const n=ok.filter(Boolean).length;
  $('rgNb').textContent=Q?n+' sur '+S.length:S.length+' sections';
  $('rgTitre').textContent=S[cur].t;$('rgPos').textContent=(cur+1)+'/'+S.length;
  $('rgCorps').innerHTML=S[cur].h;if(S[cur].id==='lire'){annote($('rgAnG'),'img/001.jpg',G);annote($('rgAnE'),'img/@kchanEvo',E);annote($('rgAnA'),'img/@kiwi',A);annote($('rgAnT'),'img/@boutique',T)}
  $('rgInfo').innerHTML=Q?`<div class="info"><span class="r">i</span>Recherche « ${$('cjRech').value} » : ${n} section${n>1?'s':''}, ${nb(S[cur].h,Q)} résultat${nb(S[cur].h,Q)>1?'s':''} ici.<button class="ter" id="rgEff" type="button">Effacer la recherche</button></div>`:'';
  if($('rgEff'))$('rgEff').onclick=()=>{$('cjRech').value='';Q='';rendre()};
  if(Q)surl($('rgCorps'));
  const v=ok.map((o,i)=>o?i:-1).filter(i=>i>=0);
  const p=v.filter(i=>i<cur).pop(),s=v.find(i=>i>cur);
  $('rgPrec').disabled=p==null;$('rgSuiv').disabled=s==null;$('rgPrec').onclick=()=>{cur=p;rendre()};$('rgSuiv').onclick=()=>{cur=s;rendre()};
  $('rgPrec').textContent='‹ '+(p!=null?S[p].t:'Section précédente');$('rgSuiv').textContent=(s!=null?S[s].t:'Section suivante')+' ›';
  noms($('rgCorps'));pictos($('rgCorps'));motsCles($('rgCorps'));chemins($('rgCorps'));setTimeout(paginer,50);setTimeout(paginer,600);if(S[cur].id==='elements')cercle('rgCer');if(S[cur].id==='essentiel'){cercle('rgCerE');schemas()}chemins($('rgCorps'));
}
/* Noms de cartes et d'effets : gras, couleur du type, cliquables (zoom simule) */
/* Noms de cartes, terrains et effets : meme composant que le journal et les zooms (texteLog de vue/joueur.js : couleur du type, clic = zoom). */
function noms(r){if(typeof texteLog!=="function")return;const w=document.createTreeWalker(r,NodeFilter.SHOW_TEXT),L=[];while(w.nextNode())L.push(w.currentNode);
 L.forEach(t=>{if(!t.data.trim()||t.parentNode.closest("svg,.rg-mot,.anc,.lv,.tg,h4,.j-lien,.prt,.lx>b"))return;const s=texteLog(t.data);if(!s.querySelector(".j-lien"))return;t.replaceWith(...s.childNodes)})}
function surl(r){
  const w=document.createTreeWalker(r,NodeFilter.SHOW_TEXT),L=[];while(w.nextNode())L.push(w.currentNode);
  L.forEach(t=>{const n=norm(t.data);let i=n.indexOf(Q);if(i<0||t.parentNode.closest('svg'))return;const f=document.createDocumentFragment();let a=0;
    while(i>=0){f.append(t.data.slice(a,i));const m=document.createElement('mark');m.textContent=t.data.slice(i,i+Q.length);f.append(m);a=i+Q.length;i=n.indexOf(Q,a)}
    f.append(t.data.slice(a));t.replaceWith(f)});
}
const LG=(v,t)=>`<span class="lv">${v}</span><span class="lt">${t}</span>`;
const G=[[LG(ic(ENCL)+' 1','Coût'),.03,.02,.23,.15,.012,.13],[LG(ic(FORCE)+' 8','Force'),.82,.025,.96,.15,.09],[LG('<span class="l-nom">KaTarN</span>','Nom'),.05,.615,.33,.668,.6,.2],[LG('<i style="color:#ffb52a;font-weight:700">Romain, 18 ans</i>','Sous-titre'),.05,.668,.33,.71,.73,.2],[LG('<img class="pe" src="img/magma.png" alt=""><img class="pe" src="img/foudre.png" alt="">','Éléments du Golem'),.735,.605,.953,.682,.65],[LG('<b style="color:#ffb52a">Jeunesse éphémère :</b>',"Nom de l'effet"),.11,.745,.9,.872,.8],[LG('<span class="l-evo">Évolue en Slim K</span>','Sa future évolution'),.317,.884,.682,.933,.908],[LG('<span class="l-cit">« Fan Aegis »</span>','Citation'),.055,.95,.245,.985,.933,.15],[LG('<span class="l-num">G-001</span>','Numéro de la carte'),.855,.952,.93,.982,.967]];
const T=[[LG('<span class="ico" style="width:20px;height:20px">'+ETOILE+'</span><span class="l-nom">2</span>','Points rapportés'),.77,.02,.97,.16,.09],[LG('<span class="l-nom">La Boutique</span> <i style="color:#a9e6f7;font-weight:700">Terrain</i>','Nom et type'),.05,.62,.5,.71,.65],[LG('<span style="color:#fff">Poser un Golem ici…</span>','Effet'),.13,.79,.87,.845,.75,.7],[LG('<span class="l-cit">« Promis, un dernier…</span>','Citation'),.055,.95,.62,.986,.933,.3],[LG('<span class="l-num">T-004</span>','Numéro de la carte'),.855,.952,.935,.986,.967]];
const E=[[LG(ic(ENCL)+' 4','Coût'),0],[LG(ic(FORCE)+' 4','Force'),0],[LG('<span class="l-nom" style="color:#ffd23a">K-Chan</span>','Nom'),0],[LG('<i style="color:#ffb52a;font-weight:700">L’attachiante</i>','Sous-titre'),0],[LG('<img class="pe" src="img/magma.png" alt=""><img class="pe" src="img/cristal.png" alt="">','Éléments du Golem'),0],[LG('<b style="color:#ffb52a">Love inconditionnel :</b>',"Nom de l'effet"),0],[LG('<span class="l-evo">Évolution de la Reine du tilt</span>','Évolution : la carte de base'),0],[LG('<span class="l-cit">« J’vous love… »</span>','Citation'),0],[LG('<span class="l-num">G-006 ★</span>','Numéro de la carte'),0]];
const A=[[LG(ic(ENCL)+' 0','Coût'),0],[LG(ic(FORCE)+' +1','Force donnée au maître'),0],[LG('<span class="l-nom">Kiwi</span>','Nom'),0],[LG('<i style="color:#7be07f;font-weight:700">Le lapin de Titom76</i>','Sous-titre'),0],[LG('<img class="pe" src="img/brume.png" alt="">','Éléments de l’animal'),0],[LG('<b style="color:#7be07f">Mignonitude :</b>',"Nom de l'effet"),0],[LG('<span style="color:#fff">Animal de compagnie de Titom76</span>','Son maître'),0],[LG('<span class="l-num">A-011</span>','Numéro de la carte'),0]];
function schemas(){const star=(x,y,z)=>`<svg x="${x}" y="${y}" width="${z}" height="${z}" viewBox="-6 -6 312 318">`+ETOILE.replace(/^<svg[^>]*>/,'');
 let p='';const T=[['Boutique',2],['Cirque',2],['Tournoi','?']],R='#ee6a2c',B='#01C1F0';
 p+=`<text x="0" y="40" fill="${R}" font-size="14" font-weight="800">ADV.</text><text x="0" y="146" fill="${B}" font-size="14" font-weight="800">TOI</text><text x="0" y="93" fill="#a6bac6" font-size="13" font-weight="800">TERRAINS</text>`;
 const cel=(x,y,w,f,st,t,tc)=>`<rect x="${x}" y="${y}" width="${w}" height="20" rx="8" fill="${f}" stroke="${st}" stroke-width="1.5"${f==='#0f1a24'?' stroke-dasharray="3 3"':''}/>`+(t?`<text x="${x+w/2}" y="${y+14.5}" fill="${tc}" font-size="12" font-weight="800" text-anchor="middle">${t}</text>`:'');
 T.forEach(([n,v],i)=>{const x0=94+i*120,w=112;
  for(let r=0;r<3;r++){p+=cel(x0,2+r*24,w,'#0f1a24','#2a3f50');p+=cel(x0,110+r*24,w,'#0f1a24','#2a3f50')}
  p+=`<rect x="${x0}" y="76" width="${w}" height="28" rx="9" fill="#1a2a38" stroke="#2a3f50"/><text x="${x0+8}" y="94.5" fill="#eaf4f8" font-size="14" font-weight="800">${n}</text>`;
  p+=v==='?'?`<text x="${x0+w-14}" y="95" fill="#f1c35a" font-size="15" font-weight="800">?</text>`:star(x0+w-34,80,20)+`<text x="${x0+w-9}" y="95" fill="#eaf4f8" font-size="13" font-weight="800">${v}</text>`});
 p+=cel(214,50,112,'rgba(238,106,44,.35)',R,'en face','#fff');
 p+=cel(214,110,112,B,B,'ton Golem','#0a121a');
 p+=cel(94,110,112,'rgba(1,193,240,.18)',B,'voisin','#fff')+cel(334,110,112,'rgba(1,193,240,.18)',B,'voisin','#fff')+cel(214,134,112,'rgba(1,193,240,.18)',B,'voisin','#fff');
 $('rgSvP').innerHTML=p;
 let s='';[["L'École",9,7,2,'Tu remportes','b'],["L'Écran du MJ",4,4,1,'Égalité : personne','n'],['Le Versus',3,5,3,"L'adversaire remporte",'r']].forEach(([n,a,b,v,t,c])=>{
  s+=`<div><div class="ptr ${c}"><b>${n}</b><span class="vs"><em class="cb">${a}</em> contre <em class="cr">${b}</em></span><span class="pv">${ic(ETOILE)} ${v} pt${v>1?'s':''}</span></div><small class="${c}">${t}</small></div>`});
 $('rgSvS').innerHTML=s}
/* Tous les mots du lexique en pointilles, une fois par bloc */
const VAR=[['remportés','Remporter'],['remportes','Remporter'],['remporter','Remporter'],['remporte','Remporter'],['remportant','Remporter'],['ciblables','Ciblé'],['ciblable','Ciblé'],['mvp','MVP'],['défaussée','Défausse'],['défausse','Défausse'],['mulligan','Mulligan'],['classée','Classée'],['amicale','Amicale'],['favori','Favori'],['pioche','Pioche'],['manche','Manche'],['base','Base'],['main','Main'],['à la pose','À la pose'],['améliorer','Améliorer'],['animal de compagnie','Animal de compagnie'],['animaux','Animal de compagnie'],['animal','Animal de compagnie'],['cercle','Cercle'],['ciblé','Ciblé'],['copie','Copie'],['décompte','Décompte'],['dégâts','Dégâts'],['dégât','Dégâts'],['deck vide','Deck vide'],['en face','En face'],['en jeu','En jeu'],['énergie','Énergie'],['évolutions','Évolution'],['évolution','Évolution'],['évolue','Évolution'],['forge','Forge'],['forgent','Forge'],['force actuelle','Force actuelle'],['hors décompte','Hors décompte'],['ligne adverse','Ligne adverse'],['mise','Mise'],['poser','Poser'],['récupérer','Récupérer X'],['remplacer','Remplacer'],['remplaces','Remplacer'],['tarte','Tarte'],['trait','Trait'],['un seul golem','Un seul Golem'],['valeur variable','Valeur variable'],['voisins','Voisin'],['voisin','Voisin']];
let PAGE=0,PSEC=-1;
function paginer(){const c=$('rgCorps'),g=c.querySelector('.pg');const old=c.querySelector('.pag');if(old)old.remove();if(!g)return;g.querySelectorAll('.grp.suite').forEach(x=>x.remove());if(PSEC!==cur){PAGE=0;PSEC=cur}
 const B=[...g.children];B.forEach(e=>e.style.display='');c.style.overflow='hidden';const H=c.clientHeight-50;
 const pages=[];let pg=[],st=null;const T0=g.getBoundingClientRect().top;B.forEach(e=>{const r=e.getBoundingClientRect(),t=r.top-T0,bt=r.bottom-T0;if(st===null)st=t;
  if(bt-st>H&&pg.length){if(pg[pg.length-1].classList.contains('grp')){const x=pg.pop();pages.push(pg);pg=[x];st=x.getBoundingClientRect().top-T0}else{pages.push(pg);pg=[];st=t}}pg.push(e)});if(pg.length)pages.push(pg);
 if(pages.length<2){c.style.overflow='';return}PAGE=Math.min(PAGE,pages.length-1);
 B.forEach(e=>e.style.display='none');pages[PAGE].forEach(e=>e.style.display='');{const f=pages[PAGE][0];if(f&&!f.classList.contains('grp')){const i=B.indexOf(f);let gp=null;for(let k=i-1;k>=0;k--)if(B[k].classList.contains('grp')){gp=B[k];break}if(gp){const cl=gp.cloneNode(true);cl.classList.add('suite');cl.style.display='';cl.textContent=gp.textContent+' (suite)';g.insertBefore(cl,f)}}}
 const d=document.createElement('div');d.className='pag';d.innerHTML=`<button class="pb" ${PAGE?'':'disabled'}>‹</button><b>${PAGE+1}/${pages.length}</b><button class="pb on" ${PAGE<pages.length-1?'':'disabled'}>›</button>`;
 c.append(d);const [p1,p2]=d.querySelectorAll('button');p1.onclick=()=>{PAGE--;paginer()};p2.onclick=()=>{PAGE++;paginer()}}
function couper(){const c=$('rgCorps');c.style.flex='';c.style.height='';if(c.scrollHeight<=c.clientHeight+1)return;const H=c.clientHeight,top0=c.getBoundingClientRect().top;
 const it=[...c.querySelectorAll('.pr,.grp')].map(e=>{const r=e.getBoundingClientRect();return{e,t:r.top-top0,b:r.bottom-top0}});
 let cut=H,ch=1;while(ch){ch=0;it.forEach(x=>{if(x.t<cut&&x.b>cut-3){cut=x.t-6;ch=1}})}
 it.filter(x=>x.e.classList.contains('grp')).forEach(g=>{const nx=g.e.nextElementSibling;if(g.t<cut&&nx&&nx.getBoundingClientRect().top-top0+20>cut)cut=Math.min(cut,g.t-4)});
 c.style.flex='none';c.style.height=cut+'px'}
function pictos(r){const w=document.createTreeWalker(r,NodeFilter.SHOW_TEXT),L=[];while(w.nextNode())L.push(w.currentNode);
 const LX=!!r.closest&&false;const RE=/([cC]o[uû]t(?:e|ent)?|Force|points?|Magma|Cristal|Foudre|Brume|Roche|[Pp]ioche[rz]?|[Mm]ain|[Dd]éfauss(?:e|ée|ées|és|é)|[Pp]rendre la carte)(?![\p{L}])/gu;
 L.forEach(t=>{if(t.parentNode.closest('svg,.lv,.prt,.ico,h4,.sv,.sco,.tg,mark,.pict,.an2,.enc4,.lx>b,.j-lien'))return;const d=t.data;if(!RE.test(d))return;RE.lastIndex=0;
  const f=document.createDocumentFragment();let a=0,m;
  while((m=RE.exec(d))){const x=m[1],e=x.toLowerCase(),i=m.index;
   const pre=d.slice(Math.max(0,i-1),i);if(i>0&&/\p{L}/u.test(pre))continue;
   let pre2=d.slice(a,i),num='';const mm=/(^|\s)([+-]?\d+)( de)?\s$/.exec(pre2);if(mm&&!NE[e]&&(e.startsWith('point')||(e==='force'&&mm[3]))){num=mm[2]+(mm[3]||'')+' ';pre2=pre2.slice(0,mm.index+mm[1].length)}
   f.append(pre2);const nx=d.slice(i+x.length,i+x.length+3);
   if(NE[e]){const prev=(t.previousSibling&&a===0&&i<2)?t.previousSibling:null;if(!(prev&&prev.nodeName==='IMG')){const im=document.createElement('img');im.className='pe';im.src='img/'+e+'.png';im.alt='';f.append(im)}f.append(x)}
   else if(/^(pioche|prendre|main|défauss)/.test(e)&&!t.parentNode.closest('.pg')){f.append(x)}
   else if(e.startsWith('point')&&/^ d'Elo/.test(d.slice(i+x.length))){f.append(x)}
   else if(e.startsWith('co')&&/^ (\d+)/.test(d.slice(i+x.length))){const n=/^ (\d+)/.exec(d.slice(i+x.length))[1];const sp=document.createElement('span');sp.className='ico';sp.innerHTML=uid(ENCL);const nw=document.createElement('span');nw.style.whiteSpace='nowrap';nw.append(sp,'\u00a0'+n);f.append(x,' ',nw);a=i+x.length+1+n.length;RE.lastIndex=a;continue}
   else{const pv=(a===0&&i<3)?t.previousSibling:null;const avant=d.slice(Math.max(0,i-2),i);
    if((pv&&pv.classList&&pv.classList.contains('ico'))||/\S/.test(avant)===false&&pv&&pv.querySelector&&pv.querySelector('.ico:last-child')){f.append(x)}
    else{const sp=document.createElement('span');sp.className='ico';sp.innerHTML=uid(e.startsWith('co')?ENCL:e==='force'?FORCE:/^(pioche|prendre)/.test(e)?CARTE:e==='main'?MAIN:e.startsWith('défauss')?DEFAU:ETOILE);const nw=document.createElement('span');nw.style.whiteSpace='nowrap';nw.append(sp,' '+num+x);f.append(nw)}}
   a=i+x.length}
  f.append(d.slice(a));t.replaceWith(f)});
 r.querySelectorAll('.ico+.ico').forEach(x=>{if(x.previousElementSibling.innerHTML===x.innerHTML&&x.previousSibling===x.previousElementSibling)x.remove()});}
function motsCles(r){
  const blocs=r.querySelectorAll('.bl,.pr,.formule,.form');
  blocs.forEach(bl=>{const vus=new Set([...bl.querySelectorAll('.rg-mot')].map(m=>norm0(m.dataset.k)));
    const w=document.createTreeWalker(bl,NodeFilter.SHOW_TEXT),L=[];while(w.nextNode())L.push(w.currentNode);
    L.forEach(t=>{if(t.parentNode.closest('.rg-mot,svg,.prt,.n,.et,.an2,h4,.enc4,.j-lien'))return;
      for(;;){const d=t.data;let best=null;
        for(const [v,k] of VAR){if(vus.has(norm0(k)))continue;const re=new RegExp('(^|[^\\p{L}])('+v+')(?![\\p{L}])','giu');let m;
          while((m=re.exec(d))){const i=m.index+m[1].length;if(norm0(k)==='base'&&/(force|jeu) de\s*$/i.test(((t.previousSibling&&t.previousSibling.textContent)||'')+d.slice(0,i)))continue;if(!best||i<best.i)best={i,len:m[2].length,k};break}}
        if(!best)break;vus.add(norm0(best.k));const sp=document.createElement('span');sp.className='rg-mot';sp.tabIndex=0;sp.dataset.k=best.k;
        const after=t.splitText(best.i);const rest=after.splitText(best.len);sp.textContent=after.data;after.replaceWith(sp);t=rest}})});
}

function annote(box,src,items){box.innerHTML='<img class="anc" src="'+src+'" alt=""><ol class="anl">'+items.map(([t])=>'<li>'+t+'</li>').join('')+'</ol>'}
function cercle(id){
 const E5=['magma','cristal','foudre','brume','roche'],IM=id==='rgCer'?80:68,RD=id==='rgCer',ey=RD?120:(188-IM)/1.809,ex=RD?120:(350-IM)/1.902,DEG=Math.PI/180,P=a=>[ex*Math.cos(a*DEG),ey*Math.sin(a*DEG)];
 const pos=E5.map((e,i)=>P(-90+72*i)),libre=a=>{const[x,y]=P(a);return !pos.some(([X,Y])=>Math.hypot(x-X,y-Y)<IM/2+5)};
 let g='<defs><marker id="fl'+id+'" viewBox="0 0 10 10" refX="7" refY="5" markerWidth="4" markerHeight="4" orient="auto"><path d="M0 0L10 5L0 10Z" style="fill:var(--bleu)"/></marker></defs>';
 for(let i=0;i<5;i++){const a0=-90+72*i;let best=[0,0],cu=null;for(let a=a0;a<=a0+72;a+=.25){if(libre(a)){if(cu===null)cu=a;if(a-cu>best[1]-best[0])best=[cu,a]}else cu=null}
  const p=P(best[0]+1),q=P(best[1]-1);g+='<path class="arc" d="M'+p+'A'+ex+' '+ey+' 0 0 1 '+q+'" marker-end="url(#fl'+id+')"/>'}
 pos.forEach(([x,y],i)=>{g+='<image href="img/'+E5[i]+'.png" x="'+(x-IM/2)+'" y="'+(y-IM/2)+'" width="'+IM+'" height="'+IM+'"/>'});
 const x0=Math.min(...pos.map(p=>p[0]))-IM/2-3,x1=Math.max(...pos.map(p=>p[0]))+IM/2+3,y0=Math.min(...pos.map(p=>p[1]))-IM/2-3,y1=Math.max(...pos.map(p=>p[1]))+IM/2+3;
 const sv=$(id);sv.setAttribute('viewBox',[x0,y0,x1-x0,y1-y0].map(v=>+v.toFixed(1)).join(' '));sv.innerHTML=g;
}

$('rgSom').onclick=e=>{const b=e.target.closest('button');if(b&&!b.disabled){cur=+b.dataset.i;rendre()}};
$('rgCorps').addEventListener('click',e=>{const l=e.target.closest('a.lien[data-s]');if(!l)return;e.preventDefault();const i=S.findIndex(s=>s.id===l.dataset.s);if(i>=0){cur=i;rendre()}});
/* Bulle d'un mot du lexique : clic (ou Entree) sur un mot en pointilles ; un clic ailleurs la ferme. */
function bulle(m){$('rgVue').querySelectorAll('.bulle').forEach(x=>x.remove());if(!m)return;
  const d=document.createElement('div');d.className='bulle';d.setAttribute('role','tooltip');d.innerHTML='<b>'+m.textContent+'</b> : '+(DEF[norm0(m.dataset.k)]||'');$('rgVue').append(d);
  const r=m.getBoundingClientRect();d.style.left=Math.min(r.left,innerWidth-316)+'px';d.style.top=(r.bottom+6)+'px'}
document.addEventListener('click',e=>bulle(e.target.closest&&e.target.closest('#rgVue .rg-mot')));
$('rgVue').addEventListener('keydown',e=>{if(e.key==='Enter'&&e.target.classList.contains('rg-mot'))bulle(e.target)});
addEventListener('resize',()=>{if(!$('rgVue').hidden)setTimeout(paginer,60)});
rendre();
return {rendre,cherche:v=>{Q=norm(String(v).trim());if(Q&&!nb(S[cur].h,Q)){const i=S.findIndex(s=>nb(s.h,Q));if(i>=0)cur=i}rendre()},
  section:id=>{const i=S.findIndex(s=>s.id===id);if(i>=0){cur=i;rendre()}}};
})();
if(typeof cjInit==='function')cjInit();
