// Voix des PNJ Easy NPC : jouée UNE fois quand on engage la conversation (clic droit sur le PNJ),
// et non à chaque clic de bouton du dialogue (sinon les sons se superposent).
// La voix à jouer est lue dans les données du PNJ (SoundData -> son de type SPEECH, ex. mcrp:npc.parole_masculine_1).
//
// Si un PNJ a encore sa voix dans la case « Dialog open » d'Easy NPC (qui la rejoue à chaque clic, et en double avec ce script),
// elle est automatiquement basculée vers « Speech » à la première interaction. Rien à refaire à la main.
var VOIX_DELAI_MS = 12000   // pas de relance avant 12 s pour le même joueur et le même PNJ
var VOIX_VOLUME = 0.5      // volume de la voix (1.0 = plein volume ; moins = plus doux, et audible un peu moins loin). Le joueur peut aussi régler « Voix » dans Options > Sons.
var voixDernier = {}
var CompoundTagVX = Java.loadClass('net.minecraft.nbt.CompoundTag')
var ListTagVX = Java.loadClass('net.minecraft.nbt.ListTag')

ItemEvents.entityInteracted(function (event) {
  try {
    var cible = event.target
    if (!cible || String(cible.type).indexOf('easy_npc:') !== 0) return
    var joueur = event.player
    if (!joueur) return

    var sd = cible.nbt.getCompound('SoundData')
    var liste = sd.getList('SoundDataSet', 10)
    if (!liste || liste.size() === 0) return

    // 1. Migration : « Dialog open » -> « Speech » (le son natif d'Easy NPC se relance à chaque bouton)
    var aSpeech = false, aMigrer = false, i
    for (i = 0; i < liste.size(); i++) {
      var t0 = String(liste.getCompound(i).getString('Type'))
      if (t0 === 'SPEECH') aSpeech = true
      if (t0 === 'DIALOG_OPEN') aMigrer = true
    }
    if (aMigrer) {
      var nouvelle = new ListTagVX()
      for (i = 0; i < liste.size(); i++) {
        var e = liste.getCompound(i)
        var t1 = String(e.getString('Type'))
        if (t1 === 'DIALOG_OPEN') {
          if (aSpeech) continue            // une voix Speech existe déjà : on retire le doublon
          var c = e.copy()
          c.putString('Type', 'SPEECH')
          c.putFloat('Volume', VOIX_VOLUME)
          nouvelle.add(c)
          aSpeech = true
        } else {
          nouvelle.add(e.copy())
        }
      }
      sd.put('SoundDataSet', nouvelle)
      var racine = new CompoundTagVX()
      racine.put('SoundData', sd)
      cible.mergeNbt(racine)
      console.info('[pnj_voix] voix basculée vers Speech pour ' + String(cible.uuid))
      return   // cette fois, le son natif vient déjà de se jouer
    }

    // 2. Lecture unique de la voix
    var nom = ''
    for (i = 0; i < liste.size(); i++) {
      var e2 = liste.getCompound(i)
      if (String(e2.getString('Type')) === 'SPEECH') { nom = String(e2.getString('Name')); break }
    }
    if (!nom) return
    var cle = String(joueur.uuid) + '|' + String(cible.uuid)
    var maintenant = Date.now()
    if (voixDernier[cle] && maintenant - voixDernier[cle] < VOIX_DELAI_MS) return
    voixDernier[cle] = maintenant
    event.server.runCommandSilent('playsound ' + nom + ' voice ' + joueur.username + ' ' + cible.x + ' ' + cible.y + ' ' + cible.z + ' ' + VOIX_VOLUME + ' 1')
  } catch (err) {
    console.error('[pnj_voix] ' + err)
  }
})
