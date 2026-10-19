// Son personnalisé : « The World » (Chronomancien) joue « Za Warudo » quand on lance le sort.
// À placer dans : <instance>/kubejs/server_scripts/classes_sons.js  (puis /reload)
// Le fichier audio est dans kubejs/assets/mcrp/sounds/the_world.ogg (+ kubejs/assets/mcrp/sounds.json) :
// il doit être présent chez chaque joueur pour être entendu.

var SON_MONDE_SORT = 'chronomancy:the_world_stop'
var SON_MONDE_ID = 'mcrp:the_world'
var SON_MONDE_VOLUME = 3.0

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
