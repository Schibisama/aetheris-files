// The World Stop (Chronomancy) limité à un rayon autour du lanceur — version KubeJS (sans mixin).
// Dans le rayon : comportement normal du sort. Au-delà : joueurs, mobs et projectiles ne sont pas figés.
// Limites : heure/météo/chunks/blocs restent figés partout (géré en interne par Chronomancy).

var WS_RAYON = 16
var WS_R2 = WS_RAYON * WS_RAYON
var WS = { GM: null, actif: false, caster: null, pos: {}, vus: {} }

try {
  WS.GM = Java.loadClass('com.chronomancy.temporal.worldstop.GlobalTimeStopManager')
} catch (e) {
  console.log('[worldstop_portee] GlobalTimeStopManager introuvable : ' + e)
}

// ── Accès défensifs : KubeJS expose certains getters comme propriétés (x, uuid, level...) et pas comme méthodes.
//    Chaque aide essaie la propriété puis la méthode, pour ne jamais lever d'exception.
function wsVal(o, prop, getter) {
  var v
  try { v = o[prop] } catch (e) {}
  if (v !== undefined && v !== null && typeof v !== 'function') return v
  try { return o[getter]() } catch (e2) {}
  return null
}
function wsUuid(o) { return String(wsVal(o, 'uuid', 'getUUID')) }
function wsX(o) { return Number(wsVal(o, 'x', 'getX')) }
function wsY(o) { return Number(wsVal(o, 'y', 'getY')) }
function wsZ(o) { return Number(wsVal(o, 'z', 'getZ')) }
function wsDim(o) {
  var lv = wsVal(o, 'level', 'level')
  if (!lv) return ''
  return String(wsVal(lv, 'dimension', 'dimension'))
}
function wsEnt(e) {
  var v = wsVal(e, 'entity', 'getEntity')
  return v
}
function wsAnnule(e) {
  try { return !!e.isCanceled() } catch (x) {}
  try { return !!e.canceled } catch (y) {}
  return false
}
function wsAnnuler(e, etat) {
  try { e.setCanceled(etat); return } catch (x) {}
  try { e.canceled = etat } catch (y) {}
}

function wsLoin(ent) {
  if (!WS.actif || !WS.caster || !ent) return false
  if (wsUuid(ent) === wsUuid(WS.caster)) return false
  if (wsDim(ent) !== wsDim(WS.caster)) return true
  var dx = wsX(ent) - wsX(WS.caster)
  var dy = wsY(ent) - wsY(WS.caster)
  var dz = wsZ(ent) - wsZ(WS.caster)
  return (dx * dx + dy * dy + dz * dz) > WS_R2
}

// Écoute un évènement APRÈS tous les autres (priorité la plus basse), même s'il est déjà annulé.
// (NativeEvents n'a pas de surcharge avec priorité : on passe directement par le bus d'évènements.)
function wsEcouter(nomClasse, fonction) {
  try {
    var cl = Java.loadClass(nomClasse)
    var prio = Java.loadClass('net.neoforged.bus.api.EventPriority').LOWEST
    Java.loadClass('net.neoforged.neoforge.common.NeoForge').EVENT_BUS.addListener(prio, true, cl, fonction)
    console.log('[worldstop_portee] écoute OK : ' + nomClasse)
  } catch (e) {
    console.log('[worldstop_portee] ÉCHEC écoute ' + nomClasse + ' : ' + e)
  }
}

// Mobs, projectiles, joueurs : le tick n'est plus annulé s'ils sont loin du lanceur.
wsEcouter('net.neoforged.neoforge.event.tick.EntityTickEvent$Pre', function (e) {
  if (!WS.actif) return
  if (wsAnnule(e) && wsLoin(wsEnt(e))) wsAnnuler(e, false)
})

// Mana et usure d'armure : simple levée du blocage pour les joueurs lointains.
function wsDegeler(e) {
  if (!WS.actif) return
  try {
    if (wsAnnule(e) && wsLoin(wsEnt(e))) wsAnnuler(e, false)
  } catch (err) {}
}
wsEcouter('io.redspace.ironsspellbooks.api.events.ChangeManaEvent', wsDegeler)
wsEcouter('net.neoforged.neoforge.event.entity.living.ArmorHurtEvent', wsDegeler)

// Sorts : on lève le blocage du World Stop, puis on RÉAPPLIQUE les règles de classe (classes_rp.js).
// En cas de doute ou d'erreur, le sort reste bloqué.
wsEcouter('io.redspace.ironsspellbooks.api.events.SpellPreCastEvent', function (e) {
  if (!WS.actif) return
  try {
    if (!wsAnnule(e) || !wsLoin(wsEnt(e))) return
    wsAnnuler(e, false)
    bloquerSortsArmes(e)
    if (!wsAnnule(e)) reglerSortsReserves(e)
  } catch (err) {
    wsAnnuler(e, true)
  }
})

// Clics et interactions : on lève le blocage, sauf si l'objet en main est interdit à la classe du joueur.
function wsDegelerAction(e) {
  if (!WS.actif) return
  try {
    var joueur = wsEnt(e)
    if (!wsAnnule(e) || !wsLoin(joueur)) return
    var pile = wsVal(e, 'itemStack', 'getItemStack')
    if (pile && !pile.isEmpty() && !autorise(joueur, String(pile.id))) return
    wsAnnuler(e, false)
  } catch (err) {}
}
wsEcouter('net.neoforged.neoforge.event.entity.player.PlayerInteractEvent$RightClickItem', wsDegelerAction)
wsEcouter('net.neoforged.neoforge.event.entity.player.PlayerInteractEvent$RightClickBlock', wsDegelerAction)
wsEcouter('net.neoforged.neoforge.event.entity.player.PlayerInteractEvent$LeftClickBlock', wsDegelerAction)
wsEcouter('net.neoforged.neoforge.event.entity.player.PlayerInteractEvent$EntityInteract', wsDegelerAction)
wsEcouter('net.neoforged.neoforge.event.entity.player.PlayerInteractEvent$EntityInteractSpecific', wsDegelerAction)

// Position des joueurs lointains, relevée à la fin de leur tick (avant que Chronomancy ne les ramène en arrière).
PlayerEvents.tick(function (event) {
  if (!WS.actif) return
  var p = event.player
  if (wsLoin(p)) WS.pos[wsUuid(p)] = [wsX(p), wsY(p), wsZ(p)]
})

// Liste des joueurs connectés (propriété `players` ou méthode getPlayers).
function wsJoueurs(server) {
  var pl = wsVal(server, 'playerList', 'getPlayerList')
  var liste = pl ? wsVal(pl, 'players', 'getPlayers') : null
  var res = []
  if (liste) for (var i = 0; i < liste.size(); i++) res.push(liste.get(i))
  return res
}

// Chronomancy ralentit le déplacement, le saut et la vitesse d'attaque des joueurs « figés » via des modificateurs
// d'attributs posés au début de chaque tick. Juste après lui (priorité la plus basse), on les retire pour les joueurs lointains.
var WS_ATTR = null
function wsAttributs() {
  if (WS_ATTR) return WS_ATTR
  var A = Java.loadClass('net.minecraft.world.entity.ai.attributes.Attributes')
  var RL = Java.loadClass('net.minecraft.resources.ResourceLocation')
  WS_ATTR = [
    { h: A.MOVEMENT_SPEED, id: RL.parse('chronomancy:time_dilation_player_movement') },
    { h: A.JUMP_STRENGTH, id: RL.parse('chronomancy:time_dilation_player_jump') },
    { h: A.ATTACK_SPEED, id: RL.parse('chronomancy:personal_time_attack_speed') }
  ]
  return WS_ATTR
}
function wsRetirerModif(inst, id) {
  try {
    inst['removeModifier(net.minecraft.resources.ResourceLocation)'](id)
  } catch (e) {
    var m = inst.getModifier(id)
    if (m) inst['removeModifier(net.minecraft.world.entity.ai.attributes.AttributeModifier)'](m)
  }
}
wsEcouter('net.neoforged.neoforge.event.tick.ServerTickEvent$Pre', function (e) {
  if (!WS.actif) return
  try {
    var attrs = wsAttributs()
    var joueurs = wsJoueurs(wsVal(e, 'server', 'getServer'))
    for (var i = 0; i < joueurs.length; i++) {
      var p = joueurs[i]
      if (!wsLoin(p)) continue
      for (var k = 0; k < attrs.length; k++) {
        var inst = p.getAttribute(attrs[k].h)
        if (inst) wsRetirerModif(inst, attrs[k].id)
      }
    }
  } catch (err) {
    if (!WS.avertiAttr) { WS.avertiAttr = true; console.log('[worldstop_portee] attributs : ' + err) }
  }
})

// Chaque tick : état du sort + remise des joueurs lointains là où ils étaient (Chronomancy les « ancre »).
ServerEvents.tick(function (event) {
  if (!WS.GM) return
  var actif = WS.GM.isActive()
  WS.actif = actif
  if (!actif) { WS.caster = null; WS.pos = {}; WS.vus = {}; return }
  var id = String(WS.GM.getCasterUUID())
  var joueurs = wsJoueurs(event.server)
  WS.caster = null
  for (var i = 0; i < joueurs.length; i++) {
    if (wsUuid(joueurs[i]) === id) { WS.caster = joueurs[i]; break }
  }
  if (!WS.caster) return
  for (var j = 0; j < joueurs.length; j++) {
    var p = joueurs[j]
    var cle = wsUuid(p)
    if (!wsLoin(p)) { delete WS.pos[cle]; continue }
    if (!WS.vus[cle]) { WS.vus[cle] = true; console.log('[worldstop_portee] joueur LOINTAIN libéré : ' + cle + ' (hors des ' + WS_RAYON + ' blocs du lanceur)') }
    var r = WS.pos[cle]
    if (!r) continue
    if (Math.abs(wsX(p) - r[0]) > 0.001 || Math.abs(wsY(p) - r[1]) > 0.001 || Math.abs(wsZ(p) - r[2]) > 0.001) {
      try { p.setPos(r[0], r[1], r[2]) } catch (err) { if (!WS.avertiPos) { WS.avertiPos = true; console.log('[worldstop_portee] setPos impossible : ' + err) } }
    }
  }
})

console.log('[worldstop_portee] chargé (rayon ' + WS_RAYON + ' blocs)')
