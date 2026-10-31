// AUTEL DU SCEAU : tous les blocs enregistrés au démarrage (un seul fichier).
//   1. kubejs:autel_sceau : l'autel (grille de 61 x 61 blocs, 7 de haut, plusieurs centaines de pièces). Pose : un op tient « Autel du Sceau »
//      (/give @s kubejs:autel_sceau) et fait clic droit au sol : l'autel entier se construit autour (voir server_scripts/autel_sceau_faisceaux.js).
//   2. kubejs:rune_01 ... kubejs:rune_26 : les runes plates (alphabet inventé, rune n = lettre n) ; posées par le script ou à la main par un op.
// Les modèles, textures, blockstates et la police des runes sont dans kubejs/assets (distribués par le launcher).
// À placer dans : kubejs/startup_scripts/  (serveur ET launcher des joueurs, mêmes fichiers des deux côtés ; redémarrage complet nécessaire).
// Remplace autel_runes.js et l'ancien autel_sceau.js (à supprimer du serveur).

// ── 1. L'autel ──
// Grille de 61 x 61 blocs sur 7 couches (sceau gravé au sol). Deux blocs partagent les memes modeles :
//   kubejs:autel_sceau      : decor sans collision (dalles, gravats, murets bas), on le traverse ;
//   kubejs:autel_sceau_dur  : massif (piliers, socles, emetteurs), collision pleine.
// Propriete « piece » = numero du modele (0..745 = modeles ; voir AU_CELLULES dans server_scripts/autel_sceau_faisceaux.js). 746 etats par bloc seulement.
StartupEvents.registry('block', function (event) {
  var IntegerProperty = Java.loadClass('net.minecraft.world.level.block.state.properties.IntegerProperty')
  var pPiece = IntegerProperty.create('piece', 0, 745)
  var etat = function (e) { e.set(pPiece, 0) }
  event.create('autel_sceau')
    .displayName('Autel du Sceau')
    .property(pPiece)
    .defaultState(etat)
    .noCollision()
    .notSolid()
    .renderType('cutout')
    .lightLevel(0.3)
    .unbreakable()
    .resistance(3600000)
  event.create('autel_sceau_dur')
    .displayName('Autel du Sceau (massif)')
    .property(pPiece)
    .defaultState(etat)
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
