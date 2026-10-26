// Gèle une entité (ex. un balai volant) : plus personne (sauf op) ne peut l'utiliser, la monter, la ramasser ni la frapper.
// /geler : gèle l'entité (non-joueur) la plus proche de toi, dans un rayon de 5 blocs. /degeler : la dégèle. (op)
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

ServerEvents.commandRegistry(function (event) {
  var Commands = event.commands
  event.register(Commands.literal('geler').requires(function (s) { return s.hasPermission(2) }).executes(function (ctx) {
    var e = glCible(ctx)
    if (!e) { ctx.source.player.tell(Text.red('Aucune entité à moins de 5 blocs.')); return 0 }
    e.addTag(GELE_TAG)
    ctx.source.server.runCommandSilent('data merge entity ' + e.getStringUUID() + ' {Invulnerable:1b,NoGravity:1b}')
    ctx.source.player.tell(Text.gray('Gelé : ' + e.getType().toString()))
    return 1
  }))
  event.register(Commands.literal('degeler').requires(function (s) { return s.hasPermission(2) }).executes(function (ctx) {
    var e = glCible(ctx)
    if (!e) { ctx.source.player.tell(Text.red('Aucune entité à moins de 5 blocs.')); return 0 }
    e.removeTag(GELE_TAG)
    ctx.source.server.runCommandSilent('data merge entity ' + e.getStringUUID() + ' {Invulnerable:0b,NoGravity:0b}')
    ctx.source.player.tell(Text.gray('Dégelé : ' + e.getType().toString()))
    return 1
  }))
})
