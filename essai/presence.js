/* Les Golems 0.5 : déconnexion en partie en ligne (window.DECO).
   - Présence : salons/{code}/pres/{uid} = { c, t } (salon-firebase.js). États vus d'ici :
       ok   connecté
       att  « Reconnexion » : coupure de moins de 10 s, sans minuteur (aussi ma propre coupure, de mon côté)
       off  « Hors ligne » : au-delà, minuteur de 60 s chez l'adversaire, puis défaite par abandon du déconnecté
   - Défaite : salons/{code}/forfait/{graine} = { u } posé par le joueur resté (règle de la base : u hors ligne depuis plus de 65 s).
     Le resté ajoute le coup 'a' au journal du déconnecté chez lui ; le déconnecté, à son retour, joue lui-même 'a' :
     les deux journaux restent identiques, la partie est enregistrée comme une fin par abandon.
   - Deux joueurs absents : aucun vainqueur ; le premier qui revient lance (ou relance) le minuteur de l'autre à son retour.
   - Salon retenu par le compte : joueurs/{uid}/salon = { c, g, dev, x } ; reprise sur tout appareil, le dernier ouvert prend la main.
   - Jamais contre le robot (partie locale), ni en rejeu, ni en tutoriel.
   Points d'accroche pour l'écran de partie (nouvel écran) :
     DECO.etat()            -> { moi: 'ok'|'att', lui: 'ok'|'att'|'off', reste: ms avant la défaite (off seulement), total: 60000,
                                 nomLui, fin: null | { gagne: bool, nomAbsent } }
     DECO.onChange(f)       -> f(etat) à chaque changement (et chaque seconde pendant le minuteur)
     DECO.peintureAuto      -> false pour couper l'affichage minimal de l'écran actuel
   Lit l'état de la page par window.GOLEMS_PONT (index.html). */
(function () {
  'use strict';
  const RECO = 10000, MINU = 60000;
  const DEV = Math.random().toString(36).slice(2, 12);       // cet onglet = un « appareil »
  const P = () => window.GOLEMS_PONT;
  const ecoute = [];
  let room = null, salonVu = null, oppUid = {}, essai = {}, monRetour = 0, coPrec = false, ecrit = '', lache = false;
  let etatCourant = { moi: 'ok', lui: 'ok' }, finVue = null, finFermee = '';

  function enLigne() {
    const b = P();
    if (!b) return null;
    const p = b.partie, r = b.r;
    if (!p || p.local || p.rejeu || p.tuto || !r || !r.etats || !b.code) return null;
    return { b, p, r };
  }
  function uidMoi() { return room && room.salonCompte ? room.salonCompte.uid() : ''; }
  function adversaire(o) {
    const g = o.p.graine;
    if (oppUid[g]) return oppUid[g];
    const q = o.r.peers().find(x => !x.sameTab && x.presence && x.presence.sid === o.p.adv);
    if (q) return (oppUid[g] = q.peer);
    if (!essai['eng' + g]) {
      essai['eng' + g] = 1;
      o.r.engages().then(e => { const u = Object.keys(e).find(x => x !== uidMoi() && x !== 'g'); if (u) oppUid[g] = u; });
    }
    return '';
  }

  /* Calcul de l'état, puis actions (défaite déclarée, coup 'a' à mon retour). */
  function calcule() {
    const o = enLigne();
    if (!o) return { moi: 'ok', lui: 'ok', actif: false };
    const { b, p, r } = o, s = p.etat, g = p.graine, f = r.forfaits()[g];
    const co = room.connected();
    const res = { actif: true, moi: co ? 'ok' : 'att', lui: 'ok', total: MINU, nomLui: b.nomJ(1 - p.moi) };
    if (s && s.fin) {
      if (s.fin.abandon !== undefined && f) res.fin = { gagne: s.fin.abandon !== p.moi, nomAbsent: s.fin.abandon === p.moi ? b.nomJ(p.moi) : res.nomLui };
      return res;
    }
    if (!s) return res;
    // Défaite déjà déclarée par l'adversaire : je joue moi-même l'abandon (journaux identiques des deux côtés).
    if (f && f.u === uidMoi()) { if (co) b.jouerA(); return res; }
    const u = adversaire(o);
    if (f && f.u === u) { b.forfaitAdv(); return res; }
    if (!co || !u) return res;                        // ma coupure : pas de minuteur de mon côté
    const e = r.etats()[u];
    if (!e || e.c !== false) return res;
    const now = room.heure(), t = +e.t || now;
    const debut = Math.max(t + RECO, monRetour);      // deux absents : le minuteur repart à mon retour
    if (now < t + RECO) { res.lui = 'att'; return res; }
    res.lui = 'off';
    res.reste = Math.max(0, debut + MINU - now);
    if (res.reste <= 0 && now - t > 66000 && !essai['ff' + g]) {
      essai['ff' + g] = 1;
      // Derniers coups de l'adversaire relus sur le serveur, puis défaite déclarée (une seule fois par graine).
      (r.journalFrais ? r.journalFrais(p.adv, g).then(j => b.litSien(j)).catch(() => {}) : Promise.resolve())
        .then(() => { if (b.partie !== p || (p.etat && p.etat.fin)) return; return r.declareForfait(u, g); })
        .catch(() => { setTimeout(() => { delete essai['ff' + g]; }, 3000); });
    }
    return res;
  }

  /* Salon retenu par le compte. */
  function compteSalon(o) {
    if (!room || !room.salonCompte || !P() || !P().compteCo()) return;
    const b = P();
    if (o && o.p.etat && !o.p.etat.fin && !lache) {
      const cle = b.code + '|' + o.p.graine;
      if (ecrit === cle) return;
      let x = null;
      try { const v = JSON.parse(b.lire(b.cleSalon(b.code))); if (v) { delete v.mien; delete v.sien; x = JSON.stringify(v); } } catch (e) {}
      if (!x || x.length > 4000) return;
      ecrit = cle;
      room.salonCompte.ecrit({ c: b.code, g: o.p.graine, dev: DEV, x }).catch(() => { ecrit = ''; });
      return;
    }
    // Fin de partie (victoire, défaite, abandon) ou départ : effacé. Jamais quand un autre appareil a pris la main.
    if (ecrit && !lache && (!o || o.p.etat && o.p.etat.fin)) {
      const g = +ecrit.split('|')[1]; ecrit = '';
      room.salonCompte.lit().then(v => { if (v && v.g === g && v.dev === DEV) room.salonCompte.ecrit(null).catch(() => {}); });
    }
  }
  function surSalonCompte(v) {
    const b = P();
    if (!v || !b) return;
    if (v.dev && v.dev !== DEV && v.c === b.code && b.partie && !b.partie.local && b.partie.graine === v.g && !(b.partie.etat && b.partie.etat.fin)) {
      lache = true; ecrit = '';
      b.lache('Salon impossible : partie reprise sur un autre appareil. Continue-la sur l\'autre appareil.');
      setTimeout(() => { lache = false; }, 1000);
    }
  }
  // Reprise : la sauvegarde locale est reconstruite depuis le compte (coups relus dans le salon), puis la page entre dans le salon.
  async function reprise() {
    const b = P();
    if (!room || !room.salonCompte || !b || !b.compteCo() || b.partie || b.r || b.occupe) return false;
    const v = await room.salonCompte.lit();
    if (!v || typeof v.x !== 'string' || !/^[a-z0-9]{3,8}$/.test(v.c)) return false;
    let sv; try { sv = JSON.parse(v.x); } catch (e) { return false; }
    if (!sv || sv.graine !== v.g) return false;
    let coups = {};
    try { coups = (await room.lit('salons/' + v.c + '/coups')) || {}; } catch (e) { return false; }
    const jr = sid => { const l = []; for (const k in coups) { const c = coups[k]; if (c && c.s === sid && c.g === v.g) l[c.n] = c.c; } const out = []; for (let i = 0; i < l.length && l[i] !== undefined; i++) out.push(l[i]); return out; };
    sv.mien = jr(sv.sid); sv.sien = jr(sv.adv); sv.t = Date.now();
    if (P().partie || P().r || P().occupe) return false;
    b.ecrire(b.cleSalon(v.c), JSON.stringify(sv));
    b.ecrire('golems.derniere', v.c);
    b.entre(v.c);
    return true;
  }

  /* Boucle : état, actions, affichage. */
  function tic() {
    if (!room) return;
    const co = room.connected();
    if (co && !coPrec) monRetour = room.heure();
    coPrec = co;
    const o = enLigne();
    if (o && o.r !== salonVu) { salonVu = o.r; o.r.onDeco(() => tic()); }
    let e;
    try { e = calcule(); } catch (x) { e = { moi: 'ok', lui: 'ok', actif: false }; }
    compteSalon(o);
    const cle = JSON.stringify([e.actif, e.moi, e.lui, e.reste == null ? null : Math.ceil(e.reste / 1000), !!e.fin]);
    etatCourant = e;
    if (cle !== tic.cle) { tic.cle = cle; ecoute.forEach(f => { try { f(e); } catch (x) {} }); if (DECO.peintureAuto) peint(); }
  }

  /* Affichage minimal dans l'écran actuel (styles des maquettes validées « 5 - Déconnexion »). */
  const CSS = `
#partie{--dk-ok:#5fd38d;--dk-att:var(--or);--dk-off:#7d8c98}
.p-camp{position:relative}
.dk-zone{margin-left:auto;display:inline-flex;align-items:center;gap:14px;flex:none}
.dk-pt{width:16px;height:16px;border-radius:50%;flex:none;display:block}
.dk-pt.ok{background:var(--dk-ok);box-shadow:0 0 0 3px rgba(95,211,141,.22)}
.dk-pt.att{background:var(--dk-att);box-shadow:0 0 0 3px rgba(241,195,90,.3)}
.dk-pt.off{background:var(--dk-off)}
.dk-lab{display:inline-flex;align-items:center;justify-content:center;box-sizing:border-box;min-width:150px;height:34px;padding:0 12px;border-radius:9px 7px 10px 6px;font:400 17px/1 var(--titre);letter-spacing:.04em;text-transform:uppercase;white-space:nowrap}
.dk-lab.att{background:rgba(241,195,90,.14);color:var(--dk-att);border:2px solid var(--dk-att)}
.dk-lab.off{background:rgba(125,140,152,.12);color:var(--doux);border:2px solid var(--dk-off)}
.dk-minu{position:relative;display:flex;align-items:center;gap:16px;margin:0 0 12px;padding:8px 20px 20px;box-sizing:border-box;min-height:72px;border:2px solid var(--or);border-radius:14px 9px 15px 8px/9px 14px 8px 15px;background:linear-gradient(180deg,#2a2512,#1a1a12);overflow:hidden}
.dk-minu .t{flex:1;min-width:0}
.dk-minu .t b{display:block;font:400 20px/1.1 var(--titre);color:var(--or)}
.dk-minu .t span{display:block;margin-top:2px;font:400 14px/1.15 var(--corps);color:var(--texte)}
.dk-minu .n{font:400 36px/1 Anton,var(--titre);color:var(--or);letter-spacing:.02em}
.dk-minu .barre{position:absolute;left:14px;right:14px;bottom:8px;height:6px;border-radius:999px;background:var(--panneau);overflow:hidden}
.dk-minu .barre i{display:block;height:100%;background:var(--or);border-radius:999px;transition:width .25s linear}
.dk-voile{position:fixed;inset:0;background:rgba(5,10,15,.62);z-index:900;display:flex;align-items:center;justify-content:center;padding:16px}
.dk-carte{box-sizing:border-box;width:min(700px,100%);padding:30px 40px;display:flex;flex-direction:column;align-items:center;gap:20px;text-align:center;color:var(--texte);background:linear-gradient(180deg,var(--panneau2),var(--panneau));border:2px solid var(--or);border-radius:18px 11px 20px 10px/11px 19px 10px 18px;box-shadow:0 18px 60px rgba(0,0,0,.6)}
.dk-carte.d{border-color:var(--trait)}
.dk-carte p{margin:0;font:400 19px/1.35 var(--corps)}
.dk-titre{font:400 72px/1 Anton,var(--titre);letter-spacing:.04em;text-transform:uppercase}
.dk-titre.v{color:var(--or)}.dk-titre.d{color:var(--doux)}
.dk-duo{display:flex;gap:28px;align-items:stretch;flex-wrap:wrap;justify-content:center}
.dk-joueur{width:250px;max-width:100%;padding:18px 14px;box-sizing:border-box;border:2px solid var(--trait);border-radius:14px 9px 15px 8px;background:rgba(10,18,26,.45);display:flex;flex-direction:column;align-items:center;gap:10px}
.dk-joueur.g{border-color:var(--or)}
.dk-joueur .nom{font:400 32px/1 var(--titre)}
.dk-joueur .sc{font:400 46px/1 Anton,var(--titre)}
.dk-joueur .dk-av{width:84px;height:84px;border-radius:50%;overflow:hidden;display:flex;align-items:center;justify-content:center}
.dk-joueur .dk-av>*{width:84px!important;height:84px!important}
.dk-gris{filter:grayscale(1) brightness(.6)}
.dk-tag{display:inline-block;padding:7px 14px;border-radius:9px 7px 10px 6px;font:400 20px/1 var(--titre);letter-spacing:.05em;text-transform:uppercase}
.dk-tag.v{background:var(--or);color:var(--encre)}.dk-tag.d{background:var(--trait);color:var(--texte)}
.dk-btns{display:flex;gap:12px;justify-content:center;flex-wrap:wrap}
.dk-btns .btn{width:auto;flex:none;padding:0 22px}
@media (max-width:600px){.dk-titre{font-size:48px}.dk-joueur{width:140px}.dk-joueur .nom{font-size:22px}.dk-lab{min-width:0;font-size:14px;height:28px}.dk-carte{padding:20px 16px}}`;
  function el(t, c, x) { const e = document.createElement(t); if (c) e.className = c; if (x != null) e.textContent = x; return e; }
  const mn = ms => { const s = Math.ceil(ms / 1000); return Math.floor(s / 60) + ':' + String(s % 60).padStart(2, '0'); };
  function peint() {
    const box = document.getElementById('partie');
    if (!box) return;
    if (!document.getElementById('dkcss')) { const st = el('style'); st.id = 'dkcss'; st.textContent = CSS; document.head.append(st); }
    box.querySelectorAll('.dk-zone,.dk-minu').forEach(x => x.remove());
    const e = etatCourant, b = P();
    const voile = document.getElementById('dkFin');
    if (!e.actif || !b || !b.partie) { if (voile) voile.remove(); return; }
    const zone = (camp, etat, texte) => {
      if (!camp) return;
      const z = el('span', 'dk-zone');
      if (texte) z.append(el('span', 'dk-lab ' + etat, texte));
      const pt = el('i', 'dk-pt ' + etat); pt.title = etat === 'ok' ? 'En ligne' : etat === 'att' ? 'Reconnexion' : 'Hors ligne';
      z.append(pt); camp.append(z);
    };
    zone(box.querySelector('.p-camp.toi'), e.moi, e.moi === 'att' ? 'Reconnexion' : '');
    zone(box.querySelector('.p-camp.lui'), e.lui, e.lui === 'att' ? 'Reconnexion' : e.lui === 'off' ? 'Hors ligne' : '');
    if (e.lui === 'off' && e.reste != null) {
      const m = el('div', 'dk-minu'); m.setAttribute('role', 'status');
      const t = el('div', 't'); t.append(el('b', '', 'Partie : ' + e.nomLui + " s'est déconnecté."), el('span', '', 'Sans retour à temps, tu gagnes par abandon.'));
      const br = el('div', 'barre'), i = el('i'); i.style.width = (100 * e.reste / MINU) + '%'; br.append(i);
      m.append(t, el('div', 'n', mn(e.reste)), br);
      const barre = box.querySelector('.p-barre');
      if (barre) barre.after(m); else box.prepend(m);
    }
    // Écran de fin par abandon (déconnexion), une fois par partie.
    const g = b.partie.graine;
    if (e.fin && finFermee !== g && !voile) finEcran(e.fin, b);
    if (!e.fin && voile) voile.remove();
  }
  function finEcran(f, b) {
    const p = b.partie, s = p.etat, me = p.moi, lui = 1 - me, vic = f.gagne;
    const v = el('div', 'dk-voile'); v.id = 'dkFin';
    const c = el('div', 'dk-carte' + (vic ? '' : ' d')); c.setAttribute('role', 'dialog'); c.setAttribute('aria-label', (vic ? 'Victoire' : 'Défaite') + ' par abandon');
    c.append(el('div', 'dk-titre ' + (vic ? 'v' : 'd'), vic ? 'Victoire' : 'Défaite'));
    const duo = el('div', 'dk-duo');
    [[me, vic], [lui, !vic]].forEach(([q, gagne]) => {
      const j = el('div', 'dk-joueur' + (gagne ? ' g' : ''));
      const av = el('div', 'dk-av' + (gagne ? '' : ' dk-gris'));
      const src = document.querySelector('#partie .p-camp.' + (q === me ? 'toi' : 'lui'));
      if (src && src.firstElementChild) av.append(src.firstElementChild.cloneNode(true));
      const n = el('div', 'nom', b.nomJ(q)); n.style.color = q === me ? 'var(--moi)' : 'var(--lui)';
      j.append(av, n, el('div', 'sc', String(s.j[q].score)), el('span', 'dk-tag ' + (gagne ? 'v' : 'd'), gagne ? 'Vainqueur' : 'Abandon'));
      duo.append(j);
    });
    c.append(duo, el('p', '', vic ? f.nomAbsent + " ne s'est pas reconnecté à temps." : "Tu n'es pas revenu dans les 60 secondes."));
    const bt = el('div', 'dk-btns');
    const ferme = () => { finFermee = p.graine; v.remove(); };
    const r1 = el('button', 'btn plein', 'Rejouer'); r1.type = 'button';
    r1.onclick = () => { ferme(); const x = document.getElementById('rejouer'); if (x && !x.disabled) x.click(); };
    const r2 = el('button', 'btn', "Retour à l'accueil"); r2.type = 'button';
    r2.onclick = () => { ferme(); b.quitter(); };
    bt.append(r1, r2); c.append(bt); v.append(c);
    v.addEventListener('click', ev => { if (ev.target === v) ferme(); });
    document.body.append(v);
  }

  const DECO = window.DECO = {
    peintureAuto: true,
    etat: () => etatCourant,
    onChange(f) { ecoute.push(f); },
    reprise,
    /* Appelé par index.html une fois le salon Firebase prêt (room). */
    init(r) {
      if (room || !r || !r.salonCompte) return;
      room = r;
      let stopCompte = null;
      const branche = () => {
        if (stopCompte) { stopCompte(); stopCompte = null; }
        ecrit = '';
        if (P() && P().compteCo()) { stopCompte = room.salonCompte.ecoute(surSalonCompte); setTimeout(() => reprise().catch(() => {}), 600); }
      };
      room.compte.onChange(branche); branche();
      room.onConnection(() => tic());
      setInterval(tic, 250);
      const box = document.getElementById('partie');
      if (box) new MutationObserver(() => { if (DECO.peintureAuto && !box.querySelector('.dk-zone') && etatCourant.actif) peint(); }).observe(box, { childList: true });
    }
  };
  if (window.__decoRoom) DECO.init(window.__decoRoom);
})();
