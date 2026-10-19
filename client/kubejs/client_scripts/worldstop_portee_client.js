// Côté client : un joueur hors du rayon du lanceur ne voit aucun effet du World Stop.
var WSC_RAYON = 16
var WSC_R2 = WSC_RAYON * WSC_RAYON
var WSC = { CWS: null, supprime: false, casterId: -1, duree: 0, ecoule: 0, MC: null }

try {
  WSC.CWS = Java.loadClass('com.chronomancy.client.ClientWorldStopState')
  WSC.MC = Java.loadClass('net.minecraft.client.Minecraft')
} catch (e) {
  console.log('[worldstop_portee] classes client introuvables : ' + e)
}

function wscVal(o, prop, getter) {
  var v
  try { v = o[prop] } catch (e) {}
  if (v !== undefined && v !== null && typeof v !== 'function') return v
  try { return o[getter]() } catch (e2) {}
  return null
}

function wscLoin(mc, id) {
  var joueur = wscVal(mc, 'player', 'player')
  var niveau = wscVal(mc, 'level', 'level')
  var caster = niveau.getEntity(id)
  if (caster == null) return true
  if (String(wscVal(caster, 'uuid', 'getUUID')) === String(wscVal(joueur, 'uuid', 'getUUID'))) return false
  var dx = Number(wscVal(joueur, 'x', 'getX')) - Number(wscVal(caster, 'x', 'getX'))
  var dy = Number(wscVal(joueur, 'y', 'getY')) - Number(wscVal(caster, 'y', 'getY'))
  var dz = Number(wscVal(joueur, 'z', 'getZ')) - Number(wscVal(caster, 'z', 'getZ'))
  return (dx * dx + dy * dy + dz * dz) > WSC_R2
}

ClientEvents.tick(function (event) {
  if (!WSC.CWS || !WSC.MC) return
  var mc = WSC.MC.getInstance()
  if (mc.player == null || mc.level == null) { WSC.supprime = false; return }

  if (WSC.CWS.isActive()) {
    var id = WSC.CWS.getCasterEntityId()
    if (wscLoin(mc, id)) {
      // Hors du rayon : on mémorise le sort puis on l'efface côté client.
      WSC.casterId = id
      WSC.duree = WSC.CWS.getDurationTicks()
      if (!WSC.supprime) WSC.ecoule = 0
      WSC.supprime = true
      WSC.CWS.clear()
    }
    return
  }

  if (WSC.supprime) {
    WSC.ecoule++
    if (WSC.ecoule >= WSC.duree) { WSC.supprime = false; return }
    // Le joueur est entré dans le rayon pendant que le sort dure : on rétablit l'effet.
    if (!wscLoin(mc, WSC.casterId)) {
      WSC.CWS.begin(WSC.casterId, WSC.duree - WSC.ecoule)
      WSC.supprime = false
    }
  }
})

console.log('[worldstop_portee] client chargé (rayon ' + WSC_RAYON + ' blocs)')
