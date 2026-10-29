// Gèle une entité (ex. un balai volant) : plus personne (sauf op) ne peut l'utiliser, la monter, la ramasser ni la frapper.
// Rechargement : /reload
var GELE_TAG = 'entite_gelee'

function glOp(joueur) {
  try { return joueur.hasPermissions(2) } catch (e) { return false }
}

function glGele(entite) {
  try { return entite.getTags().contains(GELE_TAG) } catch (e) { return false }
}

function glBloquer(e) {
  try {
    var joueur = e.getEntity()
    if (!joueur || !joueur.isPlayer() || glOp(joueur)) return
    if (!glGele(e.getTarget())) return
    e.setCanceled(true)
    try { e.setCancellationResult(Java.loadClass('net.minecraft.world.InteractionResult').FAIL) } catch (x) {}
  } catch (err) { console.error('[balai_gele] ' + err) }
}

;['PlayerInteractEvent$EntityInteract', 'PlayerInteractEvent$EntityInteractSpecific'].forEach(function (nom) {
  try {
    Java.loadClass('net.neoforged.neoforge.common.NeoForge').EVENT_BUS.addListener(
      Java.loadClass('net.neoforged.bus.api.EventPriority').HIGHEST, false,
      Java.loadClass('net.neoforged.neoforge.event.entity.player.' + nom), glBloquer)
  } catch (e) { console.error('[balai_gele] ' + nom + ' indisponible : ' + e) }
})

// Frapper l'entité (et la détruire) : annulé aussi
try {
  Java.loadClass('net.neoforged.neoforge.common.NeoForge').EVENT_BUS.addListener(
    Java.loadClass('net.neoforged.bus.api.EventPriority').HIGHEST, false,
    Java.loadClass('net.neoforged.neoforge.event.entity.player.AttackEntityEvent'),
    function (e) {
      try {
        var joueur = e.getEntity()
        if (!joueur || glOp(joueur)) return
        if (glGele(e.getTarget())) e.setCanceled(true)
      } catch (err) { console.error('[balai_gele] ' + err) }
    })
} catch (e) { console.error('[balai_gele] attaque indisponible : ' + e) }


// Position mémorisée : si l'entité est poussée, elle est remise en place (toutes les 4 ticks).
var GL_CLE = 'entites_gelees'
var GL_COMPTEUR = 0
var GL_UUID = Java.loadClass('java.util.UUID')
var GL_CT = Java.loadClass('net.minecraft.nbt.CompoundTag')

function glMemoriser(server, e) {
  var d = server.persistentData
  var liste = d.contains(GL_CLE) ? d.getCompound(GL_CLE) : new GL_CT()
  var dim = 'minecraft:overworld'
  try { dim = String(e.getLevel().dimension().location()) } catch (x) {}
  var f = new GL_CT()
  f.putDouble('x', e.getX()); f.putDouble('y', e.getY()); f.putDouble('z', e.getZ()); f.putString('dim', dim)
  liste.put(String(e.uuid), f)
  d.put(GL_CLE, liste)
}

function glOublier(server, e) {
  var d = server.persistentData
  if (!d.contains(GL_CLE)) return
  var liste = d.getCompound(GL_CLE)
  liste.remove(String(e.uuid))
  d.put(GL_CLE, liste)
}

ServerEvents.tick(function (event) {
  GL_COMPTEUR++
  if (GL_COMPTEUR % 4 !== 0) return
  try {
    var server = event.server
    var d = server.persistentData
    if (!d.contains(GL_CLE)) { d.put(GL_CLE, new GL_CT()); return }
    var liste = d.getCompound(GL_CLE)
    var cles = liste.getAllKeys().toArray()
    for (var i = 0; i < cles.length; i++) {
      var f = liste.getCompound(cles[i])
      var niveau = server.getLevel(String(f.getString('dim')))
      if (!niveau) continue
      var e = niveau.getEntity(GL_UUID.fromString(String(cles[i])))
      if (!e) continue
      var dx = e.getX() - f.getDouble('x'), dy = e.getY() - f.getDouble('y'), dz = e.getZ() - f.getDouble('z')
      if (dx * dx + dy * dy + dz * dz > 0.0004) {
        server.runCommandSilent('execute in ' + String(f.getString('dim')) + ' run tp ' + cles[i] + ' ' + f.getDouble('x') + ' ' + f.getDouble('y') + ' ' + f.getDouble('z'))
      }
      try { e.setDeltaMovement(0, 0, 0) } catch (x) {}
    }
  } catch (err) { console.error('[balai_gele] tick : ' + err) }
})


// Monter (quel que soit le chemin utilisé par le mod : clic, touche, paquet) : annulé pour les non-ops
try {
  Java.loadClass('net.neoforged.neoforge.common.NeoForge').EVENT_BUS.addListener(
    Java.loadClass('net.neoforged.bus.api.EventPriority').HIGHEST, false,
    Java.loadClass('net.neoforged.neoforge.event.entity.EntityMountEvent'),
    function (e) {
      try {
        if (!e.isMounting()) return
        var monteur = e.getEntityMounting()
        if (!monteur || !monteur.isPlayer() || glOp(monteur)) return
        if (!glGele(e.getEntityBeingMounted())) return
        e.setCanceled(true)
        try { monteur.displayClientMessage(Text.red('Ce balai est gelé.'), true) } catch (x) {}
      } catch (err) { console.error('[balai_gele] ' + err) }
    })
  console.info('[balai_gele] Blocage de la monture actif.')
} catch (e) { console.error('[balai_gele] monture indisponible : ' + e) }

function glCible(ctx) {
  var j = ctx.source.player
  if (!j) return null
  var liste = j.level.getEntitiesWithin(j.boundingBox.inflate(5))
  var meilleure = null, dmin = 1e9
  for (var i = 0; i < liste.size(); i++) {
    var e = liste.get(i)
    if (e.isPlayer()) continue
    var d = e.distanceToSqr(j)
    if (d < dmin) { dmin = d; meilleure = e }
  }
  return meilleure
}

// Les commandes /geler et /degeler ont été retirées ; les entités déjà gelées (tag entite_gelee) le restent.
