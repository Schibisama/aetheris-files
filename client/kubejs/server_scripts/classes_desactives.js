// Objets désactivés (règles « classes: [] » de classes_rp.js) :
//   - plus de recette de fabrication ;
//   - retirés des butins de mobs (les mobs/boss gardent et utilisent leur équipement d'origine) ;
//   - retirés des coffres et conteneurs à leur ouverture (butin des structures) ;
//   - jamais produits par la pêche, le troc, l'archéologie, les chambres d'épreuve (objets au sol) ni vendus par les PNJ ;
//   - masqués dans JEI (tag c:hidden_from_recipe_viewers, géré nativement par JEI/EMI/REI).
// Parchemins ET pages de Codex des sorts désactivés (SORTS_DESACTIVES) et des sorts appris en cours (/cours) : dans les coffres,
// butins de mobs et objets au sol, ils sont remplacés par ceux d'un autre sort de la même école (même niveau si possible).
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

// Sorts interdits en butin : sorts désactivés (SORTS_DESACTIVES) ET sorts appris en cours (/cours, coursOrdre() de classes_rp.js).
// Leurs parchemins et leurs pages de Codex trouvés en butin sont remplacés par ceux d'un autre sort de la même école.
var DESACT_COURS = null
function desactSortsCours() {
  if (DESACT_COURS) return DESACT_COURS
  var set = {}
  try { var o = coursOrdre(); for (var i = 0; i < o.length; i++) set[String(o[i])] = true; DESACT_COURS = set } catch (e) { return set }
  // Tous les sorts « pour tous » (liste « * » de SORTS_PAR_CLASSE), même ceux que /cours ne donne jamais (école Indicible :
  // Portail Prismatique, etc.) : ils ne s'obtiennent pas en butin.
  try {
    var tous = SpellRegistryJ.getEnabledSpells()
    for (var k = 0; k < tous.size(); k++) {
      var sid = String(tous.get(k).getSpellId())
      var perm = SORTS_PAR_CLASSE[sid]
      if (perm && perm.indexOf('*') !== -1) set[sid] = true
    }
  } catch (e2) { console.error('[classes_desactives] sorts « pour tous » : ' + e2) }
  return DESACT_COURS
}
function desactSortInterdit(id) {
  id = String(id)
  try { if (SORTS_DESACTIVES.indexOf(id) !== -1) return true } catch (e) {}
  return desactSortsCours()[id] === true
}

var DESACT_PAGE = null, DESACT_CATALOGUE = null
// Sort d'un parchemin ou d'une page de Codex : { id, niveau, ecole, page } ou null
function desactSortDuParchemin(pile) {
  var objet = String(pile.id)
  try {
    if (!DESACT_SR) DESACT_SR = Java.loadClass('io.redspace.ironsspellbooks.api.registry.SpellRegistry')
    if (objet === 'irons_spellbooks:scroll') {
      if (!DESACT_ISC) DESACT_ISC = Java.loadClass('io.redspace.ironsspellbooks.api.spells.ISpellContainer')
      var d = DESACT_ISC.get(pile).getSpellAtIndex(0)
      var sp = d.getSpell()
      return { id: String(sp.getSpellId()), niveau: d.getLevel(), ecole: String(sp.getSchoolType().getId()), page: false }
    }
    if (objet === 'specs_irons_spellbooks:codex_page') {
      if (!DESACT_PAGE) DESACT_PAGE = Java.loadClass('com.specs.irons_spellbooks.item.CodexPageItem')
      var rl = DESACT_PAGE.getSpellId(pile)
      if (!rl) return null
      var sp2 = DESACT_SR.getSpell(rl)
      return { id: String(sp2.getSpellId()), niveau: 1, ecole: String(sp2.getSchoolType().getId()), page: true }
    }
  } catch (e) {}
  return null
}

function desactParcheminInterdit(pile) {
  var s = desactSortDuParchemin(pile)
  if (!s) return false
  return desactSortInterdit(s.id)
}

// Remplaçant : un sort actif, trouvable en butin, ni désactivé ni appris en cours, de la même école si possible.
// Parchemin -> parchemin (même niveau si possible) ; page de Codex -> page de Codex.
function desactRemplacant(pile) {
  try {
    var s = desactSortDuParchemin(pile)
    if (!s) return null
    if (!DESACT_SR) DESACT_SR = Java.loadClass('io.redspace.ironsspellbooks.api.registry.SpellRegistry')
    if (s.page && !DESACT_CATALOGUE) { try { DESACT_CATALOGUE = Java.loadClass('com.specs.irons_spellbooks.catalog.SpellCatalog') } catch (eC) {} }
    var tous = DESACT_SR.getEnabledSpells()
    var memeEcole = [], autres = []
    for (var i = 0; i < tous.size(); i++) {
      var sp = tous.get(i)
      var id = String(sp.getSpellId())
      if (id === s.id || desactSortInterdit(id)) continue
      try { if (!sp.allowLooting()) continue } catch (e1) {}
      if (s.page && DESACT_CATALOGUE) { try { if (!DESACT_CATALOGUE.isListed(sp)) continue } catch (e2) {} }
      if (String(sp.getSchoolType().getId()) === s.ecole) memeEcole.push(sp)
      else autres.push(sp)
    }
    var liste = memeEcole.length ? memeEcole : autres
    if (!liste.length) return null
    var choix = liste[Math.floor(Math.random() * liste.length)]
    if (s.page) return DESACT_PAGE['createFor(io.redspace.ironsspellbooks.api.spells.AbstractSpell)'](choix)
    var niveau = Math.max(choix.getMinLevel(), Math.min(s.niveau, choix.getMaxLevel()))
    var neuf = Item.of('irons_spellbooks:scroll')
    DESACT_ISC.set(neuf, DESACT_ISC.createScrollContainer(choix, niveau, neuf))
    return neuf
  } catch (e) {
    console.error('[classes_desactives] Remplacement : ' + e)
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

// ───────────── Malédictions du lien éternel et de disparition : supprimées ─────────────
// 1) Plus tirées au hasard (butin, échanges, équipement des mobs, table d'enchantement) : retirées des tags d'enchantements.
// 2) Celles qui existent déjà sur un objet (inventaire des joueurs, conteneurs ouverts, objets au sol) sont effacées.
var DESACT_MALEDICTIONS = ['minecraft:binding_curse', 'minecraft:vanishing_curse']
try {
  ServerEvents.tags('enchantment', function (event) {
    var tags = ['minecraft:on_random_loot', 'minecraft:on_mob_spawn_equipment', 'minecraft:on_traded_equipment',
      'minecraft:tradeable', 'minecraft:in_enchanting_table', 'minecraft:non_treasure']
    for (var i = 0; i < tags.length; i++) {
      try { event.remove(tags[i], DESACT_MALEDICTIONS) } catch (e) {}
    }
    console.info('[classes_desactives] Malédictions (lien éternel, disparition) retirées des tirages d\'enchantements.')
  })
} catch (e) {
  console.error('[classes_desactives] Tags d\'enchantements indisponibles : ' + e)
}

var DESACT_ENCH = null
var DESACT_ENCH_ERREUR = false
function desactSansMalediction(pile) {
  try {
    if (!pile || pile.isEmpty()) return false
    if (!DESACT_ENCH) DESACT_ENCH = Java.loadClass('net.minecraft.world.item.enchantment.EnchantmentHelper')
    var ench = DESACT_ENCH.getEnchantmentsForCrafting(pile)
    if (ench.isEmpty()) return false
    var trouve = false
    var it = ench.keySet().iterator()
    while (it.hasNext()) {
      if (DESACT_MALEDICTIONS.indexOf(String(it.next().getRegisteredName())) >= 0) { trouve = true; break }
    }
    if (!trouve) return false
    DESACT_ENCH.updateEnchantments(pile, function (m) {
      m.removeIf(function (h) { return DESACT_MALEDICTIONS.indexOf(String(h.getRegisteredName())) >= 0 })
    })
    return true
  } catch (e) {
    if (!DESACT_ENCH_ERREUR) { DESACT_ENCH_ERREUR = true; console.error('[classes_desactives] Retrait des malédictions : ' + e) }
    return false
  }
}
// Inventaire de chaque joueur : une fois toutes les 5 secondes
ServerEvents.tick(function (ev) {
  try {
    if (ev.server.tickCount % 100 !== 0) return
    var joueurs = ev.server.getPlayers()
    for (var i = 0; i < joueurs.size(); i++) {
      var inv = joueurs.get(i).getInventory()
      var n = inv.getContainerSize()
      for (var s = 0; s < n; s++) desactSansMalediction(inv.getItem(s))
    }
  } catch (e) {}
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
    var menu = event.getContainer()
    try {   // malédictions déjà présentes sur les objets du conteneur ouvert (et de l'inventaire)
      for (var m = 0; m < menu.slots.size(); m++) desactSansMalediction(menu.getSlot(m).getItem())
    } catch (eM) {}
    if (estTest(joueur)) return
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
    desactSansMalediction(pile)
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

// ───────────── Bijoux d'Iron's Jewelry désactivés : Amulette de Protection en Cristal de redstone ─────────────
// Trop puissante (explosion électrique à chaque coup reçu). Retirée de l'inventaire et des emplacements Curios, d'où qu'elle vienne
// (forge à bijoux, butin, échange entre joueurs).
var DESACT_BIJOUX = [{ motif: 'amulet_of_protection', materiau: 'monsterspellbooks:redstone_crystal' }]
var DESACT_VIDE = Java.loadClass('net.minecraft.world.item.ItemStack').EMPTY
var DESACT_JD = null, DESACT_CURIOS = null, DESACT_BIJOUX_ERREUR = false
function desactBijouInterdit(pile) {
  try {
    if (!pile || pile.isEmpty()) return false
    var id = String(pile.id)
    if (id.indexOf('irons_jewelry:') !== 0) return false
    if (!DESACT_JD) DESACT_JD = Java.loadClass('io.redspace.ironsjewelry.core.data.JewelryData')
    var d = DESACT_JD.getNullable(pile)
    if (!d) return false
    var motif = String(d.pattern().unwrapKey().get().location())
    var mats = []
    var it = d.parts().values().iterator()
    while (it.hasNext()) mats.push(String(it.next().unwrapKey().get().location()))
    for (var i = 0; i < DESACT_BIJOUX.length; i++) {
      var r = DESACT_BIJOUX[i]
      if (motif.indexOf(r.motif) >= 0 && mats.indexOf(r.materiau) >= 0) return true
    }
  } catch (e) {
    if (!DESACT_BIJOUX_ERREUR) { DESACT_BIJOUX_ERREUR = true; console.error('[classes_desactives] bijoux : ' + e) }
  }
  return false
}
ServerEvents.tick(function (ev) {
  try {
    if (ev.server.tickCount % 20 !== 0) return
    var joueurs = ev.server.getPlayers()
    for (var i = 0; i < joueurs.size(); i++) {
      var p = joueurs.get(i)
      var retire = false
      var inv = p.getInventory()
      var n = inv.getContainerSize()
      for (var s = 0; s < n; s++) {
        if (desactBijouInterdit(inv.getItem(s))) { inv.setItem(s, DESACT_VIDE); retire = true }
      }
      try {
        if (!DESACT_CURIOS) DESACT_CURIOS = Java.loadClass('top.theillusivec4.curios.api.CuriosApi')
        var opt = DESACT_CURIOS.getCuriosInventory(p)
        if (opt.isPresent()) {
          var h = opt.get().getEquippedCurios()
          for (var k = 0; k < h.getSlots(); k++) {
            if (desactBijouInterdit(h.getStackInSlot(k))) { h.setStackInSlot(k, DESACT_VIDE); retire = true }
          }
        }
      } catch (eC) {}
      if (retire) {
        p.tell(Text.red('Cette amulette a été désactivée sur le serveur et a disparu de ton équipement.'))
        console.info('[classes_desactives] Amulette de Protection (cristal de redstone) retirée à ' + p.username)
      }
    }
  } catch (e) {}
})
