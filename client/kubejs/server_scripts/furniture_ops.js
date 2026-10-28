// MrCrayfish's Furniture Refurbished réservé aux opérateurs en créatif.
//   - plus aucune recette de fabrication ;
//   - objets du mod masqués dans JEI (tag c:hidden_from_recipe_viewers) ;
//   - pose et utilisation des objets du mod impossibles, sauf pour un opérateur (niveau 2) en créatif.
// Les meubles déjà posés par un op restent utilisables par tout le monde.
// À placer dans : <serveur>/kubejs/server_scripts/furniture_ops.js  (puis /reload)
// Sans le mod installé, ce script ne fait rien.

var FUR_NAMESPACE = 'refurbished_furniture'

function furAutorise(joueur) {
  try { return !!joueur && joueur.hasPermissions(2) && joueur.isCreative() } catch (e) { return false }
}

function furEstDuMod(id) {
  return String(id).indexOf(FUR_NAMESPACE + ':') === 0
}

function furRefuser(event) {
  try { event.player.setStatusMessage(Text.of('Ce mobilier est réservé aux opérateurs en mode créatif.').red()) } catch (e) {}
  event.cancel()
}

// ───────────── Recettes ─────────────
ServerEvents.recipes(function (event) {
  try {
    event.remove({ mod: FUR_NAMESPACE })
    event.remove({ output: /^refurbished_furniture:/ })
    console.info('[furniture_ops] Recettes du mod retirées.')
  } catch (e) {
    console.error('[furniture_ops] Retrait des recettes impossible : ' + e)
  }
})

// ───────────── Masquage dans JEI ─────────────
ServerEvents.tags('item', function (event) {
  try {
    var liste = Item.getTypeList()
    var n = 0
    for (var i = 0; i < liste.size(); i++) {
      var id = String(liste.get(i))
      if (!furEstDuMod(id)) continue
      event.add('c:hidden_from_recipe_viewers', id)
      n++
    }
    console.info('[furniture_ops] ' + n + ' objets du mod masqués dans JEI.')
  } catch (e) {
    console.error('[furniture_ops] Masquage JEI impossible : ' + e)
  }
})

// ───────────── Pose des blocs ─────────────
BlockEvents.placed(function (event) {
  try {
    if (!event.entity || !event.entity.isPlayer()) return
    if (furEstDuMod(event.block.id) && !furAutorise(event.entity)) event.cancel()
  } catch (e) { console.error('[furniture_ops] ' + e) }
})

// ───────────── Objets en main : pose, utilisation, nourriture ─────────────
ItemEvents.rightClicked(function (event) {
  try {
    if (furEstDuMod(event.item.id) && !furAutorise(event.player)) furRefuser(event)
  } catch (e) { console.error('[furniture_ops] ' + e) }
})
