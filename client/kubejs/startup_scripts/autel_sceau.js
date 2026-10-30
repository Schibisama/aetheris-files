// AUTEL DU SCEAU : tous les blocs enregistrés au démarrage (un seul fichier).
//   1. kubejs:autel_sceau : l'autel (25 pièces dans une grille 5 x 5, centre = pièce 12). Pose : un op tient « Autel du Sceau »
//      (/give @s kubejs:autel_sceau) et fait clic droit au sol : l'autel entier se construit autour (voir server_scripts/autel_sceau_faisceaux.js).
//   2. kubejs:rune_01 ... kubejs:rune_26 : les runes plates (alphabet inventé, rune n = lettre n) ; posées par le script ou à la main par un op.
// Les modèles, textures, blockstates et la police des runes sont dans kubejs/assets (distribués par le launcher).
// À placer dans : kubejs/startup_scripts/  (serveur ET launcher des joueurs, mêmes fichiers des deux côtés ; redémarrage complet nécessaire).
// Remplace autel_runes.js et l'ancien autel_sceau.js (à supprimer du serveur).

// ── 1. L'autel ──
StartupEvents.registry('block', function (event) {
  var BooleanProperty = Java.loadClass('net.minecraft.world.level.block.state.properties.BooleanProperty')
  var IntegerProperty = Java.loadClass('net.minecraft.world.level.block.state.properties.IntegerProperty')
  var pPiece = IntegerProperty.create('piece', 0, 24)
  var pActif = BooleanProperty.create('actif')
  event.create('autel_sceau')
    .displayName('Autel du Sceau')
    .property(pPiece)
    .property(pActif)
    .defaultState(function (etat) {
      etat.set(pPiece, 12)
      etat.set(pActif, false)
    })
    .notSolid()
    .renderType('cutout')
    .lightLevel(0.3)
    .unbreakable()
    .resistance(3600000)
})

// ── 2. Les 26 runes ──
StartupEvents.registry('block', function (event) {
  for (var i = 1; i <= 26; i++) {
    var n = (i < 10 ? '0' : '') + i
    event.create('rune_' + n)
      .displayName('Rune ' + n)
      .noCollision()
      .notSolid()
      .renderType('cutout')
      .unbreakable()
      .noDrops()
      .lightLevel(0.5)
      .box(0, 0, 0, 16, 1, 16, true)
  }
  console.info('[autel_runes] 26 runes-blocs enregistrées.')
})
