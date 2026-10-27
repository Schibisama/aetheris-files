// Interdit aux joueurs (pas aux ops) de créer de nouveaux portails du Nether et de l'End.
// Les portails déjà construits continuent de fonctionner.
//  - Nether : le briquet / la boule de feu sur de l'obsidienne est bloqué.
//  - End : un œil d'Ender ne peut plus être posé dans un cadre.
// Rechargement : /reload
function pbOp(joueur) {
  try { return joueur.hasPermissions(2) } catch (e) { return false }
}

function pbMsg(joueur) {
  try { joueur.displayClientMessage(Text.red('On ne peut plus créer de nouveau portail.'), true) } catch (e) {}
}

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
        if (!pile || pile.isEmpty()) return
        var objet = String(pile.id)
        var bloc = String(niveau.getBlockState(e.getPos()).getBlock())
        var interdit = false
        if (objet === 'minecraft:ender_eye' && bloc.indexOf('minecraft:end_portal_frame') !== -1) interdit = true
        if ((objet === 'minecraft:flint_and_steel' || objet === 'minecraft:fire_charge') &&
            (bloc.indexOf('minecraft:obsidian') !== -1 || bloc.indexOf('minecraft:crying_obsidian') !== -1)) interdit = true
        if (!interdit) return
        e.setCanceled(true)
        pbMsg(joueur)
      } catch (err) { console.error('[portails_bloques] ' + err) }
    }
  )
  console.info('[portails_bloques] Portails Nether et End : création bloquée pour les joueurs (ops exemptés).')
} catch (e) {
  console.error('[portails_bloques] indisponible : ' + e)
}

// ───────────── Mobs : ne traversent jamais les portails (Nether, End, retour de l'End) ─────────────
// Seuls les joueurs changent de dimension ; tout autre être vivant (mobs, boss, PNJ, animaux) voit son voyage annulé et reste sur place.
try {
  NativeEvents.onEvent(
    Java.loadClass('net.neoforged.neoforge.event.entity.EntityTravelToDimensionEvent'),
    function (ev) {
      try {
        var e = ev.getEntity()
        if (!e || e.isPlayer()) return
        if (typeof e.isLiving === 'function' && !e.isLiving()) return   // objets au sol, projectiles... : inchangés
        ev.setCanceled(true)
      } catch (x) {}
    }
  )
  console.info('[portails_bloques] Les mobs ne peuvent plus traverser les portails.')
} catch (e) {
  console.error('[portails_bloques] Blocage des mobs indisponible : ' + e)
}
