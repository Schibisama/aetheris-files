// Son personnalisé : « The World » (Chronomancien) joue « Za Warudo » quand on lance le sort.
// À placer dans : <instance>/kubejs/server_scripts/classes_sons.js  (puis /reload)
// Le fichier audio est dans kubejs/assets/mcrp/sounds/the_world.ogg (+ kubejs/assets/mcrp/sounds.json) :
// il doit être présent chez chaque joueur pour être entendu.

var SON_MONDE_SORT = 'chronomancy:the_world_stop'
var SON_MONDE_ID = 'mcrp:the_world'
var SON_MONDE_VOLUME = 1.0

var sonEvenement = null
var sonSource = null

function sonJouerMonde(event) {
  try {
    if (String(event.getSpellId()) !== SON_MONDE_SORT) return
    var joueur = event.getEntity()
    var niveau = joueur.level
    if (niveau.isClientSide()) return
    if (!sonEvenement) {
      var ClasseSon = Java.loadClass('net.minecraft.sounds.SoundEvent')
      var ClasseRes = Java.loadClass('net.minecraft.resources.ResourceLocation')
      sonEvenement = ClasseSon.createVariableRangeEvent(ClasseRes.parse(SON_MONDE_ID))
      sonSource = Java.loadClass('net.minecraft.sounds.SoundSource').PLAYERS
    }
    niveau.playSound(null, joueur.x, joueur.y, joueur.z, sonEvenement, sonSource, SON_MONDE_VOLUME, 1.0)
  } catch (e) {
    console.error('[classes_sons] ' + e)
  }
}

try {
  NativeEvents.onEvent(
    Java.loadClass('io.redspace.ironsspellbooks.api.events.SpellPreCastEvent'),
    function (event) { sonJouerMonde(event) }
  )
  console.info('[classes_sons] Son « The World » actif.')
} catch (e) {
  console.error('[classes_sons] Son « The World » indisponible : ' + e)
}

// ───────── The World : filet de sécurité pour les joueurs à plus de 16 blocs du lanceur ─────────
// Ils ne sont pas figés, mais leur vie et leur mana ne remontaient plus pendant le sort. Chaque seconde, pour chacun
// d'eux : si son mana n'a pas remonté alors qu'il n'est pas plein, on applique la régénération normale d'Iron's Spells
// (2 cycles de 10 ticks) ; si sa vie n'a pas remonté alors qu'il est rassasié (nourriture >= 18), on rend 0,25 PV
// (rythme de la régénération naturelle). Sans effet si le mod régénère déjà lui-même. Un /reload suffit.
var MONDE_SUIVI = {}
var MONDE_J = null
function mondeClasses() {
  if (MONDE_J) return MONDE_J
  MONDE_J = {
    GTS: Java.loadClass('com.chronomancy.temporal.worldstop.GlobalTimeStopManager'),
    IR: Java.loadClass('com.chronomancy.temporal.worldstop.InstantRestoration'),
    MD: Java.loadClass('io.redspace.ironsspellbooks.api.magic.MagicData'),
    AR: Java.loadClass('io.redspace.ironsspellbooks.api.registry.AttributeRegistry'),
    CFG: Java.loadClass('io.redspace.ironsspellbooks.config.ServerConfigs'),
    PKT: Java.loadClass('io.redspace.ironsspellbooks.network.SyncManaPacket'),
    PD: Java.loadClass('net.neoforged.neoforge.network.PacketDistributor')
  }
  return MONDE_J
}
ServerEvents.tick(function (ev) {
  try {
    var srv = ev.server
    if (srv.tickCount % 20 !== 0) return
    var J = mondeClasses()
    if (!J.GTS.isActive()) { MONDE_SUIVI = {}; return }
    var idLanceur = J.GTS.getCasterUUID()
    var lanceur = idLanceur ? srv.getPlayerList().getPlayer(idLanceur) : null
    var joueurs = srv.players
    for (var i = 0; i < joueurs.length; i++) {
      var p = joueurs[i]
      try {
        if (lanceur && String(p.uuid) === String(lanceur.uuid)) continue
        var loin = !lanceur || String(p.level.dimension) !== String(lanceur.level.dimension) || p.distanceToSqr(lanceur) > 256
        if (!loin || !p.isAlive()) continue
        var cle = String(p.uuid)
        var md = J.MD.getPlayerMagicData(p)
        var avant = MONDE_SUIVI[cle]
        if (avant) {
          var max = Number(p.getAttributeValue(J.AR.MAX_MANA))
          var mana = Number(md.getMana())
          if (mana < max && mana <= avant.mana + 0.001) {
            var gain = max * Number(p.getAttributeValue(J.AR.MANA_REGEN)) * 0.01 * Number(J.CFG.MANA_REGEN_MULTIPLIER.get()) * 2
            J.IR.begin(p)
            try { md.setMana(Math.min(max, mana + gain)) } finally { J.IR.end(p) }
            try { J.PD.sendToPlayer(p, new J.PKT(md)) } catch (eP) { J.PD.sendToPlayer(p, new J.PKT(md), []) }
          }
          if (p.health < p.maxHealth && p.health <= avant.vie + 0.001 && p.foodData.foodLevel >= 18) {
            J.IR.begin(p)
            try { p.heal(0.25) } finally { J.IR.end(p) }
          }
        }
        MONDE_SUIVI[cle] = { mana: Number(md.getMana()), vie: Number(p.health) }
      } catch (eJ) { if (!MONDE_SUIVI._err) { MONDE_SUIVI._err = true; console.error('[the_world] ' + eJ) } }
    }
  } catch (e) {
    if (!MONDE_J || !MONDE_J._err) { if (MONDE_J) MONDE_J._err = true; console.error('[the_world] filet de sécurité : ' + e) }
  }
})
