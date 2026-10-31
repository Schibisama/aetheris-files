// Objets désactivés (règles « classes: [] » de classes_rp.js) :
//   - plus de recette de fabrication ;
//   - retirés des butins de mobs (les mobs/boss gardent et utilisent leur équipement d'origine) ;
//   - retirés des coffres et conteneurs à leur ouverture (butin des structures) ;
//   - jamais produits par la pêche, le troc, l'archéologie, les chambres d'épreuve (objets au sol) ni vendus par les PNJ ;
//   - masqués dans JEI (tag c:hidden_from_recipe_viewers, géré nativement par JEI/EMI/REI).
// Parchemins des sorts désactivés (SORTS_DESACTIVES de classes_rp.js) : dans les coffres, butins de mobs et objets au sol,
// ils sont remplacés par un parchemin d'un autre sort de la même école (même niveau si possible).
// À placer dans : <instance>/kubejs/server_scripts/classes_desactives.js  (puis /reload)
// Dépend de restriction() et estTest() de classes_rp.js (même portée globale).

var DESACT_CACHE = {}

function desactEstDesactive(id) {
  id = String(id)
  if (DESACT_CACHE[id] !== undefined) return DESACT_CACHE[id]
  var r = null
  try { r = restriction(id) } catch (e) { r = null }
  var res = !!(r && r.classes.length === 0)
  DESACT_CACHE[id] = res
  return res
}


// ───────────── Parchemins de sorts désactivés ─────────────
var DESACT_ISC = null
var DESACT_SR = null

function desactSortDuParchemin(pile) {
  if (String(pile.id) !== 'irons_spellbooks:scroll') return null
  try {
    if (!DESACT_ISC) DESACT_ISC = Java.loadClass('io.redspace.ironsspellbooks.api.spells.ISpellContainer')
    var d = DESACT_ISC.get(pile).getSpellAtIndex(0)
    var sp = d.getSpell()
    return { id: String(sp.getSpellId()), niveau: d.getLevel(), ecole: String(sp.getSchoolType().getId()) }
  } catch (e) { return null }
}

function desactParcheminInterdit(pile) {
  var s = desactSortDuParchemin(pile)
  if (!s) return false
  try { return SORTS_DESACTIVES.indexOf(s.id) !== -1 } catch (e) { return false }
}

// Parchemin de remplacement : un sort actif, trouvable en butin, non désactivé, de la même école si possible.
function desactRemplacant(pile) {
  try {
    var s = desactSortDuParchemin(pile)
    if (!s) return null
    if (!DESACT_SR) DESACT_SR = Java.loadClass('io.redspace.ironsspellbooks.api.registry.SpellRegistry')
    var tous = DESACT_SR.getEnabledSpells()
    var memeEcole = [], autres = []
    for (var i = 0; i < tous.size(); i++) {
      var sp = tous.get(i)
      var id = String(sp.getSpellId())
      if (id === s.id || SORTS_DESACTIVES.indexOf(id) !== -1) continue
      try { if (!sp.allowLooting()) continue } catch (e1) {}
      if (String(sp.getSchoolType().getId()) === s.ecole) memeEcole.push(sp)
      else autres.push(sp)
    }
    var liste = memeEcole.length ? memeEcole : autres
    if (!liste.length) return null
    var choix = liste[Math.floor(Math.random() * liste.length)]
    var niveau = Math.max(choix.getMinLevel(), Math.min(s.niveau, choix.getMaxLevel()))
    var neuf = Item.of('irons_spellbooks:scroll')
    DESACT_ISC.set(neuf, DESACT_ISC.createScrollContainer(choix, niveau, neuf))
    return neuf
  } catch (e) {
    console.error('[classes_desactives] Parchemin de remplacement : ' + e)
    return null
  }
}

// ───────────── Recettes ─────────────
ServerEvents.recipes(function (event) {
  var n = 0
  try {
    var liste = Item.getTypeList()
    for (var i = 0; i < liste.size(); i++) {
      var id = String(liste.get(i))
      if (!desactEstDesactive(id)) continue
      event.remove({ output: id })
      n++
    }
  } catch (e) {
    console.error('[classes_desactives] Suppression des recettes impossible : ' + e)
  }
  console.info('[classes_desactives] Recettes retirées pour ' + n + ' objets désactivés.')
})

// ───────────── Affichage JEI ─────────────
// JEI (comme EMI et REI) masque tout objet portant le tag c:hidden_from_recipe_viewers.
ServerEvents.tags('item', function (event) {
  var n = 0
  try {
    var liste = Item.getTypeList()
    for (var i = 0; i < liste.size(); i++) {
      var id = String(liste.get(i))
      if (!desactEstDesactive(id)) continue
      event.add('c:hidden_from_recipe_viewers', id)
      n++
    }
  } catch (e) {
    console.error('[classes_desactives] Masquage JEI impossible : ' + e)
  }
  console.info('[classes_desactives] ' + n + ' objets désactivés masqués dans JEI (tag).')
})

// ───────────── Butin des mobs ─────────────
function desactButinMobs(event) {
  try {
    var drops = event.getDrops()
    var it = drops.iterator()
    while (it.hasNext()) {
      var entite = it.next()
      var pile = entite.getItem()
      if (!pile || pile.isEmpty()) continue
      if (desactEstDesactive(pile.id)) { it.remove(); continue }
      if (desactParcheminInterdit(pile)) {
        var neufMob = desactRemplacant(pile)
        if (neufMob) entite.setItem(neufMob)
        else it.remove()
      }
    }
  } catch (e) {
    console.error('[classes_desactives] Butin des mobs : ' + e)
  }
}

try {
  NativeEvents.onEvent(
    Java.loadClass('net.neoforged.neoforge.event.entity.living.LivingDropsEvent'),
    function (event) { desactButinMobs(event) }
  )
  console.info('[classes_desactives] Filtre du butin des mobs actif.')
} catch (e) {
  console.error('[classes_desactives] Filtre du butin des mobs indisponible : ' + e)
}

// ───────────── Coffres et conteneurs ─────────────
// Le butin d'un coffre est généré juste avant l'ouverture : on le nettoie à l'ouverture.
// Sont ignorés : l'inventaire du joueur, le coffre de l'Ender, et les joueurs en mode testeur.
var DESACT_CLASSE_ENDER = null
var DESACT_CLASSE_COFFRE = null
var DESACT_CLASSE_MARCHAND = null

// Villageois, marchand ambulant et autres PNJ : les échanges dont le résultat est désactivé sont retirés à l'ouverture.
function desactNettoyerOffres(menu) {
  var offres = menu.getOffers()
  if (!offres) return
  var it = offres.iterator()
  var retires = 0
  while (it.hasNext()) {
    var offre = it.next()
    var pile = offre.getResult()
    if (pile && !pile.isEmpty() && desactEstDesactive(pile.id)) {
      it.remove()
      retires++
    }
  }
  if (retires > 0) console.info('[classes_desactives] ' + retires + ' échange(s) retiré(s) chez un PNJ.')
}

function desactNettoyerConteneur(event) {
  try {
    var joueur = event.getEntity()
    if (!joueur || !joueur.isPlayer()) return
    if (estTest(joueur)) return
    var menu = event.getContainer()
    if (!DESACT_CLASSE_MARCHAND) DESACT_CLASSE_MARCHAND = Java.loadClass('net.minecraft.world.inventory.MerchantMenu')
    if (menu instanceof DESACT_CLASSE_MARCHAND) {
      desactNettoyerOffres(menu)
      return
    }
    var total = menu.slots.size()
    if (total <= 36) return
    if (!DESACT_CLASSE_ENDER) {
      DESACT_CLASSE_ENDER = Java.loadClass('net.minecraft.world.inventory.PlayerEnderChestContainer')
      DESACT_CLASSE_COFFRE = Java.loadClass('net.minecraft.world.inventory.ChestMenu')
    }
    if (menu instanceof DESACT_CLASSE_COFFRE && menu.getContainer() instanceof DESACT_CLASSE_ENDER) return
    // Le dernier emplacement appartient toujours à l'inventaire du joueur : sert de repère.
    var repere = menu.getSlot(total - 1)
    var vide = Item.of('minecraft:air')
    var retires = 0
    for (var i = 0; i < total; i++) {
      var slot = menu.getSlot(i)
      if (slot.isSameInventory(repere)) continue
      var pile = slot.getItem()
      if (!pile || pile.isEmpty()) continue
      if (desactParcheminInterdit(pile)) {
        var neuf = desactRemplacant(pile)
        slot.set(neuf ? neuf : vide)
        retires++
        continue
      }
      if (!desactEstDesactive(pile.id)) continue
      slot.set(vide)
      retires++
    }
    if (retires > 0) console.info('[classes_desactives] ' + retires + ' objet(s) désactivé(s) retiré(s) d\'un conteneur.')
  } catch (e) {
    console.error('[classes_desactives] Conteneur : ' + e)
  }
}

try {
  NativeEvents.onEvent(
    Java.loadClass('net.neoforged.neoforge.event.entity.player.PlayerContainerEvent$Open'),
    function (event) { desactNettoyerConteneur(event) }
  )
  console.info('[classes_desactives] Filtre des coffres actif.')
} catch (e) {
  console.error('[classes_desactives] Filtre des coffres indisponible : ' + e)
}

// ───────────── Objets au sol : pêche, troc des piglins, archéologie, chambres d'épreuve, coffres cassés ─────────────
// Tout objet désactivé qui apparaît au sol sans avoir été lancé par un joueur est supprimé.
// (Les objets lâchés par un joueur, eux, ne sont pas touchés.)
var DESACT_CLASSE_OBJET_SOL = null

function desactObjetAuSol(event) {
  try {
    var niveau = event.getLevel()
    if (niveau.isClientSide()) return
    var entite = event.getEntity()
    if (!DESACT_CLASSE_OBJET_SOL) DESACT_CLASSE_OBJET_SOL = Java.loadClass('net.minecraft.world.entity.item.ItemEntity')
    if (!(entite instanceof DESACT_CLASSE_OBJET_SOL)) return
    if (entite.getOwner() != null) return
    var pile = entite.getItem()
    if (!pile || pile.isEmpty()) return
    if (desactEstDesactive(pile.id)) { event.setCanceled(true); return }
    if (desactParcheminInterdit(pile)) {
      var neufSol = desactRemplacant(pile)
      if (neufSol) entite.setItem(neufSol)
      else event.setCanceled(true)
    }
  } catch (e) {
    console.error('[classes_desactives] Objet au sol : ' + e)
  }
}

try {
  NativeEvents.onEvent(
    Java.loadClass('net.neoforged.neoforge.event.entity.EntityJoinLevelEvent'),
    function (event) { desactObjetAuSol(event) }
  )
  console.info('[classes_desactives] Filtre des objets au sol actif (pêche, troc, archéologie, chambres d\'épreuve).')
} catch (e) {
  console.error('[classes_desactives] Filtre des objets au sol indisponible : ' + e)
}
