/* Les Golems : index des donnees de cartes. A charger APRES les fichiers de donnees et AVANT moteur.js.
   TYPES_DE_CARTES : un fichier de donnees par type de carte. Chaque fichier expose {type, cartes:{code:fiche}} ;
   nouveau type (ex. les Evenements) = nouveau fichier cartes/donnees/evenements.js + une ligne ici, sans toucher le moteur.
   Resultat (window.GolemsDonnees, ou module.exports sous Node) :
     CARTES   : toutes les fiches de tous les types, par code (ce que lit le moteur) ;
     ordre    : codes dans l'ordre des rangs (TYPES du moteur) : l'identifiant de carte de partie en depend, TOUJOURS ajouter en fin ;
     deckDefaut : deck par defaut, code -> nombre d'exemplaires ;
     terrains : liste des terrains ; reglageAnimaux : REGLAGE_ANIMAUX ; elVelnen : elements partages de Velnen et du chansonnier. */
(function(r){'use strict';
const TYPES_DE_CARTES=[ /* cle de window.GolemsDonnees = nom du fichier sans .js */
 {cle:'golems',type:'golem'},
 {cle:'animaux',type:'animal'}
];
const enNode=typeof module!=='undefined'&&module.exports&&typeof require==='function';
const D=enNode?{}:(r.GolemsDonnees=r.GolemsDonnees||{});
const lire=cle=>{const x=enNode?require('./'+cle+'.js'):D[cle];if(!x)throw new Error('donnees absentes : cartes/donnees/'+cle+'.js');return x};
const CARTES={};
for(const t of TYPES_DE_CARTES){const x=lire(t.cle);D[t.cle]=x;for(const k in x.cartes){if(CARTES[k])throw new Error('code en double : '+k);CARTES[k]=x.cartes[k]}}
D.terrains=lire('terrains');
Object.assign(D,{
TYPES_DE_CARTES,CARTES,
/* Deck par defaut (ancien paquet de test) : les 11 premiers types. 0.3 : 30 cartes, 3 exemplaires sauf 2 de KEKWRevan (002e), Roi du Karaoke (003e)
   et Oracle des Stats (004e) ; jusqu'a 0.2c, 33 cartes (identifiants 0 a 32, rejeux par moteurs/moteur-0.2c.js et avant).
   Le Q (refonte) : Le Q 3 et Seul contre tous 2 remplaces par Velnen 3 et Titom76 2 (cartes qui aident a trouver ses cartes), toujours 30 cartes. */
ordre:['001','001e','002','002e','003','003e','004','004e','007','007e','008','013','013e','009','009e','029','029e','037','037e','026','026e','036','036e','901','018','018e','041','041e','025','025e','015','015e','016','016e','035','035e','042','042e','008e','020','020e','902','903','021','021e'], /* toujours ajouter en fin : l'identifiant de carte depend du rang. Kiwi (901) : rang 23, carte de partie 69, codee '~6'. Elessar : 018 rang 24 (72-74, '~9' a '~b'), 018e rang 25 (75-77, '~c' a '~e'). Velnen : 041 rang 26 (78-80, '~f' a '~h'), 041e rang 27 (81-83, '~i' a '~k'). Shifukuro : 025 rang 28 (84-86, '~l' a '~n'), 025e rang 29 (87-89, '~o' a '~q'). Bellock/Loxim : 015 rang 30 (90-92, '~r' a '~t'), 015e rang 31 (93-95, '~u' a '~w'), 016 rang 32 (96-98, '~x' a '~z'), 016e rang 33 (99-101, '~A' a '~C'). JackJoy : 035 rang 34 (102-104, '~D' a '~F'), 035e rang 35 (105-107, '~G' a '~I'). Vic222 : 042 rang 36 (108-110, '~J' a '~L'), 042e rang 37 (111-113, '~M' a '~O'). Uki (903) : rang 42, carte de partie 126. Elccino : 021 rang 43 (129-131, '~~3' a '~~5'), 021e rang 44 (132-134, '~~6' a '~~8') */
deckDefaut:{'001':3,'001e':3,'002':3,'002e':2,'007':3,'007e':3,'041':3,'026':2,'018':3,'018e':2,'009':3} /* 0.4a, 4 elements au plus : Cyrdan 3, Roi du Karaoke 2, K-Chan 3 remplaces par Elessar 3, Le pomplard 2, Glad 3 */
,
terrainsListe:D.terrains.liste,reglageAnimaux:D.animaux.reglage,elVelnen:D.golems.elVelnen
});
for(const k of D.ordre)if(!CARTES[k])throw new Error('code sans fiche : '+k);
/* Nom long affiche (onglet Cartes, editeur, historique) : nom du membre (la base pour une evolution) + ', ' + titre ; nomLong de la fiche s'il existe (nom hors regle). */
D.nomLong=id=>{const c=CARTES[id];if(!c)return String(id);if(c.nomLong)return c.nomLong;const m=c.base&&CARTES[c.base]?CARTES[c.base].nom:c.nom;return c.titre?m+', '+c.titre:m};
/* Ordre d'affichage (galerie, editeur) : ordre des fiches dans chaque fichier de donnees, types dans l'ordre de TYPES_DE_CARTES (pas l'ordre des rangs). */
D.ordreAffichage=[].concat(...TYPES_DE_CARTES.map(t=>Object.keys(D[t.cle].cartes)));
if(enNode)module.exports=D;
})(typeof window!=='undefined'?window:globalThis);
