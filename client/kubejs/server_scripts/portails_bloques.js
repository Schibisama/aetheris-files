// Interdit la création de nouveaux portails (les portails déjà construits continuent de fonctionner).
//  - Portail du Nether : l'allumage est annulé pour tout le monde.
//  - Portail de l'End : un œil d'Ender ne peut plus être posé dans un cadre (sauf op).
//  - Portails des mods : pose des cadres bloquée (sauf op).
// Les ops (permission 2) ne sont pas bloqués, sauf pour le portail du Nether.
// Rechargement : /reload
var PB_BLOCS_INTERDITS = [
  'crystal_chronicles:portal_frame_block',
  'irons_spellbooks:pocket_dimension_portal_frame'
]

function pbOp(joueur) {
  try { return joueur.hasPermissions(2) } catch (e) { return false }
}

function pbMsg(joueur, texte) {
  try { joueur.displayClientMessage(Text.red(texte), true) } catch (e) {}
}

// 1) Portail du Nether
try {
  Java.loadClass('net.neoforged.neoforge.common.NeoForge').EVENT_BUS.addListener(
    Java.loadClass('net.neoforged.bus.api.EventPriority').HIGHEST, false,
    Java.loadClass('net.neoforged.neoforge.event.level.BlockEvent$PortalSpawnEvent'),
    function (e) { try { e.setCanceled(true) } catch (x) {} }
  )
  console.info('[portails_bloques] Portail du Nether : création bloquée.')
} catch (e) {
  console.error('[portails_bloques] Portail du Nether indisponible : ' + e)
}

// 2) Portail de l'End : œil d'Ender dans un cadre
try {
  Java.loadClass('net.neoforged.neoforge.common.NeoForge').EVENT_BUS.addListener(
    Java.loadClass('net.neoforged.bus.api.EventPriority').HIGHEST, false,
    Java.loadClass('net.neoforged.neoforge.event.entity.player.PlayerInteractEvent$RightClickBlock'),
    function (e) {
      try {
        var joueur = e.getEntity()
        if (!joueur || !joueur.isPlayer() || pbOp(joueur)) return
        var niveau = e.getLevel()
        if (niveau.isClientSide) return
        var pile = e.getItemStack()
        if (!pile || pile.isEmpty() || String(pile.id) !== 'minecraft:ender_eye') return
        var bloc = String(niveau.getBlockState(e.getPos()).getBlock())
        if (bloc.indexOf('minecraft:end_portal_frame') === -1) return
        e.setCanceled(true)
        pbMsg(joueur, 'On ne peut plus créer de nouveau portail.')
      } catch (err) { console.error('[portails_bloques] ' + err) }
    }
  )
  console.info('[portails_bloques] Portail de l\'End : activation bloquée.')
} catch (e) {
  console.error('[portails_bloques] Portail de l\'End indisponible : ' + e)
}

// 3) Cadres de portail des mods
try {
  Java.loadClass('net.neoforged.neoforge.common.NeoForge').EVENT_BUS.addListener(
    Java.loadClass('net.neoforged.bus.api.EventPriority').HIGHEST, false,
    Java.loadClass('net.neoforged.neoforge.event.level.BlockEvent$EntityPlaceEvent'),
    function (e) {
      try {
        var ent = e.getEntity()
        if (ent && ent.isPlayer() && pbOp(ent)) return
        var bloc = String(e.getPlacedBlock().getBlock())
        for (var i = 0; i < PB_BLOCS_INTERDITS.length; i++) {
          if (bloc.indexOf(PB_BLOCS_INTERDITS[i]) !== -1) {
            e.setCanceled(true)
            if (ent && ent.isPlayer()) pbMsg(ent, 'On ne peut plus créer de nouveau portail.')
            return
          }
        }
      } catch (err) { console.error('[portails_bloques] ' + err) }
    }
  )
  console.info('[portails_bloques] Cadres de portail des mods : pose bloquée.')
} catch (e) {
  console.error('[portails_bloques] Cadres de portail indisponibles : ' + e)
}
