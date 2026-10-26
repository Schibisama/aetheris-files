// Voix des PNJ Easy NPC : jouée UNE fois quand on engage la conversation (clic droit sur le PNJ),
// et non à chaque clic de bouton du dialogue (sinon les sons se superposent).
// La voix à jouer est lue dans les données du PNJ (SoundData -> premier son, ex. mcrp:npc.parole_masculine_1),
// donc rien à configurer ici. Elle est stockée dans le preset sous le type « Speech », que Easy NPC ne joue jamais tout seul.
var VOIX_DELAI_MS = 12000   // pas de relance avant 12 s pour le même joueur et le même PNJ
var voixDernier = {}

ItemEvents.entityInteracted(function (event) {
  try {
    var cible = event.target
    if (!cible || String(cible.type).indexOf('easy_npc:') !== 0) return
    var joueur = event.player
    if (!joueur) return
    var cle = String(joueur.uuid) + '|' + String(cible.uuid)
    var maintenant = Date.now()
    if (voixDernier[cle] && maintenant - voixDernier[cle] < VOIX_DELAI_MS) return
    var liste = cible.nbt.getCompound('SoundData').getList('SoundDataSet', 10)
    if (!liste || liste.size() === 0) return
    var nom = String(liste.getCompound(0).getString('Name'))
    if (!nom) return
    voixDernier[cle] = maintenant
    event.server.runCommandSilent('playsound ' + nom + ' voice ' + joueur.username + ' ' + cible.x + ' ' + cible.y + ' ' + cible.z + ' 1 1')
  } catch (e) {
    console.error('[pnj_voix] ' + e)
  }
})
