// Set Wizard d'Iron's Spells : craft teinté. On ajoute UNE teinture dans une case vide de la recette d'origine
// (tissu magique + 1 teinture = pièce déjà colorée). Les recettes d'origine (couleur de base) restent disponibles,
// et les pièces restent teignables normalement (table de craft, chaudron).
var WIZ_COULEURS = {
  white: 0xF9FFFE, orange: 0xF9801D, magenta: 0xC74EBD, light_blue: 0x3AB3DA,
  yellow: 0xFED83D, lime: 0x80C71F, pink: 0xF38BAA, gray: 0x474F52,
  light_gray: 0x9D9D97, cyan: 0x169C9C, purple: 0x8932B8, blue: 0x3C44AA,
  brown: 0x835432, green: 0x5E7C16, red: 0xB02E26, black: 0x1D1D21
}
// D = teinture, C = tissu magique (la teinture occupe une case vide de la recette d'origine)
var WIZ_PIECES = {
  'irons_spellbooks:wizard_boots':      ['CDC', 'C C'],
  'irons_spellbooks:wizard_helmet':     ['CCC', 'CDC'],
  'irons_spellbooks:wizard_chestplate': ['CDC', 'CCC', 'CCC'],
  'irons_spellbooks:wizard_leggings':   ['CCC', 'CDC', 'C C'],
  'irons_spellbooks:wizard_hat':        ['D C', ' C ', 'CCC']
}

ServerEvents.recipes(function (event) {
  var n = 0
  for (var piece in WIZ_PIECES) {
    for (var couleur in WIZ_COULEURS) {
      try {
        var sortie = Item.of(piece + '[minecraft:dyed_color={rgb:' + WIZ_COULEURS[couleur] + '}]')
        event.shaped(sortie, WIZ_PIECES[piece], {
          C: 'irons_spellbooks:magic_cloth',
          D: 'minecraft:' + couleur + '_dye'
        })
        n++
      } catch (e) {
        console.error('[wizard_teintures] ' + piece + ' / ' + couleur + ' : ' + e)
      }
    }
  }
  console.info('[wizard_teintures] ' + n + ' recettes teintées ajoutées.')
})
