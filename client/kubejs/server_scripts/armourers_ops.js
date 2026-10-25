// Armourer's Workshop réservé aux opérateurs.
//   - plus aucune recette de fabrication (les joueurs ne peuvent rien fabriquer) ;
//   - blocs et objets du mod inutilisables par les joueurs qui ne sont pas op (niveau 2 minimum) ;
//   - masqués dans JEI.
// Un opérateur s'en procure avec /give. Sans le mod installé, ce script ne fait rien.
// À placer dans : <serveur>/kubejs/server_scripts/armourers_ops.js  (puis /reload)

var AW_NAMESPACE = 'armourers_workshop'

function awEstOp(joueur) {
  try { return !!joueur && joueur.hasPermissions(2) } catch (e) { return false }
}

function awEstDuMod(id) {
  return String(id).indexOf(AW_NAMESPACE + ':') === 0
}

function awRefuser(event) {
  try { event.player.setStatusMessage(Text.translate('mcrp.msg.armourers_ops').red()) } catch (e) {}
  event.cancel()
}

// ───────────── Recettes ─────────────
ServerEvents.recipes(function (event) {
  try {
    event.remove({ mod: AW_NAMESPACE })
    event.remove({ output: /^armourers_workshop:/ })
    console.info('[armourers_ops] Recettes du mod retirées.')
  } catch (e) {
    console.error('[armourers_ops] Retrait des recettes impossible : ' + e)
  }
})

// ───────────── Masquage dans JEI ─────────────
ServerEvents.tags('item', function (event) {
  try {
    var liste = Item.getTypeList()
    var n = 0
    for (var i = 0; i < liste.size(); i++) {
      var id = String(liste.get(i))
      if (!awEstDuMod(id)) continue
      event.add('c:hidden_from_recipe_viewers', id)
      n++
    }
    console.info('[armourers_ops] ' + n + ' objets du mod masqués dans JEI.')
  } catch (e) {
    console.error('[armourers_ops] Masquage JEI impossible : ' + e)
  }
})

// ───────────── Blocs : clic droit, pose ─────────────
BlockEvents.rightClicked(function (event) {
  try {
    if (awEstDuMod(event.block.id) && !awEstOp(event.player)) awRefuser(event)
  } catch (e) { console.error('[armourers_ops] ' + e) }
})

BlockEvents.placed(function (event) {
  try {
    if (!event.entity || !event.entity.isPlayer()) return
    if (awEstDuMod(event.block.id) && !awEstOp(event.entity)) event.cancel()
  } catch (e) { console.error('[armourers_ops] ' + e) }
})

// ───────────── Objets : clic droit (outils, skins, etc.) ─────────────
ItemEvents.rightClicked(function (event) {
  try {
    if (awEstDuMod(event.item.id) && !awEstOp(event.player)) awRefuser(event)
  } catch (e) { console.error('[armourers_ops] ' + e) }
})
