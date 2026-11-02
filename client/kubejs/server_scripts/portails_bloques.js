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

// Filet de sécurité : le blocage ci-dessus ne voit que le briquet / la boule de feu cliqués sur l'obsidienne. Or un portail du Nether
// s'allume avec N'IMPORTE QUELLE source de feu (briquet cliqué sur un autre bloc du cadre, sort de feu, flèche enflammée, lave,
// foudre, distributeur, ghast...). On annule donc la création elle-même : PortalSpawnEvent, sauf si un opérateur est à moins de 12 blocs.
try {
  Java.loadClass('net.neoforged.neoforge.common.NeoForge').EVENT_BUS.addListener(
    Java.loadClass('net.neoforged.bus.api.EventPriority').HIGHEST, false,
    Java.loadClass('net.neoforged.neoforge.event.level.BlockEvent$PortalSpawnEvent'),
    function (e) {
      try {
        var niveau = e.getLevel()
        var pos = e.getPos()
        var joueurs = niveau.players()
        for (var i = 0; i < joueurs.size(); i++) {
          var j = joueurs.get(i)
          if (pbOp(j) && j.distanceToSqr(pos.getX() + 0.5, pos.getY() + 0.5, pos.getZ() + 0.5) < 144) return
        }
        e.setCanceled(true)
        console.info('[portails_bloques] Portail du Nether annulé en ' + pos.getX() + ' ' + pos.getY() + ' ' + pos.getZ())
      } catch (err) { console.error('[portails_bloques] PortalSpawnEvent : ' + err) }
    }
  )
  console.info('[portails_bloques] Création de portail du Nether annulée quelle que soit la source de feu.')
} catch (e) {
  console.error('[portails_bloques] PortalSpawnEvent indisponible : ' + e)
}

// ───────────── Mobs : ne traversent jamais les portails (Nether, End, retour de l'End) ─────────────
// Seuls les joueurs changent de dimension ; tout autre être vivant (mobs, boss, PNJ, animaux) voit son voyage annulé et reste sur place.
var PB_MOBS = true   // false = les mobs peuvent de nouveau traverser les portails (test : mettre false puis /reload)
try {
  NativeEvents.onEvent(
    Java.loadClass('net.neoforged.neoforge.event.entity.EntityTravelToDimensionEvent'),
    function (ev) {
      try {
        var e = ev.getEntity()
        if (!PB_MOBS) return
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
