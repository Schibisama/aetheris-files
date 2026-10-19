// Toutes les créatures invoquées par un sort disparaissent après DUREE_INVOCATION_SECONDES secondes.
// Couvre les invocations d'Iron's (gestionnaire d'invocations) et celles des addons
// (toute entité « invocation magique » IMagicSummon, ex. le Naga de Geomancy Plus).
// Le chrono est écrit dans l'entité elle-même : il survit au /reload, aux redémarrages et aux déchargements de chunks.
// À placer dans : <instance>/kubejs/server_scripts/classes_invocations.js  (puis /reload)

var DUREE_INVOCATION_SECONDES = 30
var CLE_EXPIRATION_INV = 'mcrp_expiration_invocation'
var ERREURS_INV = 0
var SUSPECTES_INV = 0

function invErreur(contexte, e) {
  if (ERREURS_INV < 5) {
    ERREURS_INV++
    console.error('[classes_invocations] ' + contexte + ' : ' + e)
  }
}

var GestInvocations = null
var ClasseInvocationMagique = null

function invEstMagicSummon(entite) {
  return entite instanceof ClasseInvocationMagique
}

function invEstInvocation(entite) {
  if (invEstMagicSummon(entite)) return true
  var idType = String(entite.type).toLowerCase()
  if (idType.indexOf('summon') !== -1 || idType.indexOf('minion') !== -1 || idType.indexOf('familiar') !== -1) return true
  return GestInvocations.getOwner(entite) != null
}

function invTraiterNiveau(niveau) {
  var maintenant = niveau.time
  var candidates = []
  var total = 0
  var it = niveau.getAllEntities().iterator()
  while (it.hasNext()) {
    var entite = it.next()
    total++
    try {
      if (entite.isPlayer() || entite.isRemoved()) continue
      if (invEstInvocation(entite)) candidates.push(entite)
      else if (SUSPECTES_INV < 10 && /summon|minion|conjur|familiar/i.test(String(entite.type))) {
        SUSPECTES_INV++
        console.info('[classes_invocations] non reconnue (suspecte) : ' + entite.type)
      }
    } catch (e1) { invErreur('analyse', e1) }
  }
  for (var i = 0; i < candidates.length; i++) {
    var ent = candidates[i]
    try {
      var donnees = ent.persistentData
      if (!donnees.contains(CLE_EXPIRATION_INV)) {
        donnees.putLong(CLE_EXPIRATION_INV, maintenant + DUREE_INVOCATION_SECONDES * 20)
        console.info('[classes_invocations] chrono posé : ' + ent.type + ' (' + ent.uuid + ')')
      } else if (maintenant >= donnees.getLong(CLE_EXPIRATION_INV)) {
        console.info('[classes_invocations] expirée : ' + ent.type + ' (' + ent.uuid + ')')
        try { if (invEstMagicSummon(ent)) ent.onUnSummon() } catch (e3) { invErreur('onUnSummon', e3) }
        if (!ent.isRemoved()) ent.discard()
      }
    } catch (e2) { invErreur('traitement', e2) }
  }
  if (candidates.length > 0 || niveau.time % 1200 < 20) {
    console.info('[classes_invocations] ' + niveau.dimension + ' : ' + total + ' entités, ' + candidates.length + ' invocations')
  }
}

try {
  GestInvocations = Java.loadClass('io.redspace.ironsspellbooks.capabilities.magic.SummonManager')
  ClasseInvocationMagique = Java.loadClass('io.redspace.ironsspellbooks.entity.mobs.IMagicSummon')

  ServerEvents.tick(function (event) {
    if (event.server.tickCount % 20 !== 5) return
    try {
      var niveaux = event.server.getAllLevels().iterator()
      while (niveaux.hasNext()) invTraiterNiveau(niveaux.next())
    } catch (e) { invErreur('tick', e) }
  })
  console.info('[classes_invocations] v8 - Invocations limitées à ' + DUREE_INVOCATION_SECONDES + ' secondes.')
} catch (e) {
  console.error('[classes_invocations] Impossible de limiter les invocations : ' + e)
}
