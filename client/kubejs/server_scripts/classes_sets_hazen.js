// Retire les bonus d'ensemble Hazen qui ne correspondent pas à la classe de l'armure.
// Les ensembles ci-dessous gardent leurs bonus de puissance d'école, mais perdent le bonus
// d'ensemble « épéiste » / « archer » / « grâce du tyran » appliqué automatiquement par Hazen.
// À placer dans : <instance>/kubejs/server_scripts/classes_sets_hazen.js  (puis /reload)

var PREFIXE_HAZEN_SETS = 'hazennstuff:'
var SETS_HAZEN = [
  { regle: /^hazennstuff:frostbite_knight_(helmet|chestplate|leggings|boots)$/,    retirer: ['swordmaster_set_bonus'] },
  { regle: /^hazennstuff:frostbite_hunter_(helmet|chestplate|leggings|boots)$/,    retirer: ['archer_set_bonus'] },
  { regle: /^hazennstuff:permafrost_prince_(helmet|chestplate|leggings|boots)$/,   retirer: ['archer_set_bonus'] },
  { regle: /^hazennstuff:chlorophyte_(mask|chestplate|leggings|boots)$/,           retirer: ['swordmaster_set_bonus'] },
  { regle: /^hazennstuff:(soul_)?legionnaire_ruler_(helmet|chestplate|leggings|boots)$/, retirer: ['tyrants_grace'] },
  { regle: /^hazennstuff:legionnaire_commander_(helmet|chestplate|leggings|boots)$/,     retirer: ['tyrants_grace'] },
  { regle: /^hazennstuff:garments_of_the_first_flamebearer_(helmet|chestplate|leggings|boots)$/, retirer: ['tyrants_grace'] }
]
var EMPLACEMENTS_SETS = ['head', 'chest', 'legs', 'feet']

try {
  PlayerEvents.tick(function (event) {
    try {
      var joueur = event.player
      var aRetirer = null
      for (var i = 0; i < EMPLACEMENTS_SETS.length; i++) {
        var piece = joueur.getItemBySlot(EMPLACEMENTS_SETS[i])
        if (!piece || piece.isEmpty()) continue
        var id = String(piece.id)
        if (id.indexOf(PREFIXE_HAZEN_SETS) !== 0) continue
        for (var j = 0; j < SETS_HAZEN.length; j++) {
          if (SETS_HAZEN[j].regle.test(id)) {
            if (!aRetirer) aRetirer = []
            aRetirer = aRetirer.concat(SETS_HAZEN[j].retirer)
          }
        }
      }
      if (!aRetirer) return
      for (var k = 0; k < aRetirer.length; k++) joueur.removeEffect(PREFIXE_HAZEN_SETS + aRetirer[k])
    } catch (e) {}
  })
  console.info('[classes_sets_hazen] ' + SETS_HAZEN.length + ' règles de bonus d\'ensemble actives.')
} catch (e) {
  console.error('[classes_sets_hazen] Impossible d\'installer le retrait des bonus : ' + e)
}
