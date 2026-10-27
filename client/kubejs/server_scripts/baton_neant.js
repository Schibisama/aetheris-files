// Bâton du Néant (blaze rod, pour éviter WorldEdit) (outil d'admin) : tue instantanément le mob sur lequel on clique (clic droit ou clic gauche).
// /baton_neant (op) -> te donne le bâton. Ne touche ni les joueurs ni les PNJ Easy NPC.
// Dépend de : KubeJS. Rechargement : /reload

var BN_NOM = 'Bâton du Néant'

function bnTient(joueur) {
  try {
    var it = joueur.getMainHandItem()
    if (!it || it.isEmpty() || String(it.id) !== 'minecraft:blaze_rod') return false
    return String(it.getHoverName().getString()).indexOf(BN_NOM) !== -1
  } catch (e) { return false }
}

// Auteur d'une source de dégâts (KubeJS 7 : .actual ; getEntity n'existe pas sur DamageSource ici)
function bnAuteur(src) {
  try { if (src.actual) return src.actual } catch (e) {}
  try { if (src.getActual) return src.getActual() } catch (e) {}
  return null
}

var bnEnCours = false   // garde anti-récursion : la commande /damage redéclenche l'événement de dégâts, ce qui bouclait et faisait freezer

function bnTuer(joueur, cible) {
  if (bnEnCours) return false
  bnEnCours = true
  try {
    if (!cible || cible.isPlayer()) return false
    if (!cible.isAlive()) return false
    if (String(cible.type).indexOf('easy_npc') !== -1) return false
    if (String(cible.type).indexOf('corpse') !== -1) return false   // jamais les cadavres (mod Corpse) : ils contiennent l'inventaire des joueurs
    var s = joueur.server
    var u = String(cible.uuid)
    s.runCommandSilent('damage ' + u + ' 1000000 minecraft:generic_kill by ' + String(joueur.uuid))
    if (cible.isAlive()) s.runCommandSilent('kill ' + u)
    return true
  } catch (e) { console.error('[baton_neant] ' + e); return false } finally { bnEnCours = false }
}

ItemEvents.entityInteracted(function (event) {
  if (event.hand != 'main_hand' && String(event.hand) !== 'MAIN_HAND') return
  var j = event.player
  if (!j || !bnTient(j)) return
  if (bnTuer(j, event.target)) event.cancel()
})

// Clic gauche : on annule les dégâts normaux et on tue.
try {
  NativeEvents.onEvent(
    Java.loadClass('net.neoforged.neoforge.event.entity.living.LivingIncomingDamageEvent'),
    function (event) {
      try {
        var att = bnAuteur(event.getSource())
        if (!att || !att.isPlayer() || !bnTient(att)) return
        if (bnTuer(att, event.getEntity())) event.setCanceled(true)
      } catch (e) { console.error('[baton_neant] ' + e) }
    }
  )
  console.info('[baton_neant] Clic gauche actif.')
} catch (e) {
  console.error('[baton_neant] Clic gauche indisponible : ' + e)
}

ServerEvents.commandRegistry(function (event) {
  var Commands = event.commands
  event.register(Commands.literal('baton_neant')
    .requires(function (source) { return source.hasPermission(2) })
    .executes(function (ctx) {
      var j = ctx.source.player
      if (!j) return 0
      ctx.source.server.runCommandSilent('give ' + j.username + ' minecraft:blaze_rod[custom_name=\'{"text":"' + BN_NOM + '","color":"dark_purple","italic":false}\',enchantment_glint_override=true,lore=[\'{"text":"Clic : tue instantanément n\\\'importe quel mob.","color":"gray","italic":false}\']]')
      j.tell(Text.gray('Bâton du Néant donné.'))
      return 1
    }))
})
