// end_spawn.js : à l'arrivée dans l'End par le portail, le joueur est placé sur l'île construite
// au lieu de la plateforme d'obsidienne vanilla (100, 49, 0), qui flotte dans le vide.

var END_SPAWN = { X: -29.5, Y: 156, Z: -17.5 }   // sur l'île (centre de l'End = 0, 0)

function endSpawnSurPlateforme(p) {
  var x = p.getX(), y = p.getY(), z = p.getZ()
  return Math.abs(x - 100) < 8 && Math.abs(z) < 8 && y > 40 && y < 60
}

function endSpawnTeleporter(p) {
  try {
    if (!endSpawnSurPlateforme(p)) return
    p.teleportTo(END_SPAWN.X, END_SPAWN.Y, END_SPAWN.Z)
  } catch (e) {
    try { p.runCommandSilent('tp @s ' + END_SPAWN.X + ' ' + END_SPAWN.Y + ' ' + END_SPAWN.Z) } catch (e2) {
      console.error('[end_spawn] Téléportation impossible : ' + e2)
    }
  }
}

try {
  NativeEvents.onEvent(
    Java.loadClass('net.neoforged.neoforge.event.entity.player.PlayerEvent$PlayerChangedDimensionEvent'),
    function (event) {
      try {
        var p = event.getEntity()
        if (String(event.getTo().location()) !== 'minecraft:the_end') return
        try {
          p.getServer().scheduleInTicks(3, function () { endSpawnTeleporter(p) })
        } catch (e) {
          endSpawnTeleporter(p)
        }
      } catch (e) {
        console.error('[end_spawn] ' + e)
      }
    }
  )
  console.info('[end_spawn] Arrivée sur l\'île de l\'End active.')
} catch (e) {
  console.error('[end_spawn] Indisponible : ' + e)
}
