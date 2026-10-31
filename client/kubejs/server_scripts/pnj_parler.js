// « Parler à un PNJ » : un clic droit sur le PNJ coche aussitôt sa tâche FTB (chapitres boss_pnj et classes_pnj),
// sans attendre qu'on accepte sa quête. Le nom du PNJ doit commencer par le nom court de la quête
// (ex. « Hiro, le Vieux Sage » pour « Hiro »). Sources : BOSSES (boss_zones.js), ZP (zone_pirates.js),
// LIVRAISONS + LV_FTB (livraison_quetes.js). Le Curieux a sa tâche propre (quête secrète).
// Rechargement : /reload

var PP_CURIEUX = '247EE190C1B45715'
var PP_TABLE = null

function ppConstruire() {
  var t = []
  var ajouter = function (pnj, id) { if (pnj && id) t.push({ pnj: String(pnj), id: String(id) }) }
  try { for (var n in BOSSES) { var q = BOSSES[n].quete; if (q) ajouter(q.pnj, q.ftb) } } catch (e) {}
  try { if (ZP.quete) ajouter(ZP.quete.pnj, ZP.quete.ftb) } catch (e) {}
  try { for (var c in LIVRAISONS) { var l = LIVRAISONS[c]; if (l && l.cle && LV_FTB[l.cle]) ajouter(l.pnj, LV_FTB[l.cle]) } } catch (e) {}
  ajouter('Le Curieux', PP_CURIEUX)
  return t
}

function ppCommence(nom, court) {
  if (nom === court) return true
  if (nom.indexOf(court) !== 0) return false
  var c = nom.charAt(court.length)
  return c === ',' || c === ' ' || c === ':'
}

ItemEvents.entityInteracted(function (event) {
  try {
    var cible = event.target
    if (!cible || String(cible.type).indexOf('easy_npc:') !== 0) return
    var nom = ''
    try { nom = String(cible.name.getString()) } catch (e) { nom = String(cible.name) }
    if (!PP_TABLE) PP_TABLE = ppConstruire()
    var joueur = event.player
    for (var i = 0; i < PP_TABLE.length; i++) {
      var e = PP_TABLE[i]
      if (!ppCommence(nom, e.pnj)) continue
      var ok = ftbCompleter(joueur, e.id)
      console.info('[pnj_parler] ' + nom + ' -> quête ' + e.id + ' : ' + (ok ? 'cochée' : 'ÉCHEC'))
      try { if (typeof autelPnj === 'function') autelPnj(joueur.server, e.pnj) } catch (eA) {}   // étape Mémoire de l'Autel du Sceau
    }
  } catch (err) {
    console.error('[pnj_parler] ' + err)
  }
})
