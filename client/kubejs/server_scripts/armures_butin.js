// Armures (et objets trop forts : voir AR_AUTRES) plus rares dans le butin : chaque pièce trouvée a une chance d'être retirée.
//   - coffres et conteneurs (vanilla, structures, LootR) : filtrés UNE seule fois par coffre (et par joueur pour LootR),
//     à la première ouverture ; les coffres déjà filtrés (ou posés et ouverts par un joueur) ne perdent plus rien ;
//   - butin des mobs : même chance de retrait (les joueurs ne sont jamais touchés).
// Armure vanilla (namespace minecraft) : AR_TAUX_VANILLA ; armure d'un mod : AR_TAUX_MOD. 0.7 = 70 % des pièces retirées.
// Ne touche pas : coffre de l'Ender, inventaire du joueur, joueurs en mode testeur, objets d'une autre nature que l'armure.
// Rechargement : /reload
var AR_TAUX_VANILLA = 0.5
var AR_TAUX_MOD = 0.7
var AR_MOBS = true
// Autres objets rendus plus rares dans les COFFRES (même principe : filtrés une fois, à la première ouverture ; LootR : par joueur).
// [motif (expression sur l'identifiant), part retirée]. 0.75 = 75 % retirés. Modifier ici pour régler.
var AR_AUTRES = [
  [/^minecraft:enchanted_golden_apple$/, 0.8],                            // pommes dorées enchantées
  [/^minecraft:totem_of_undying$/, 0.6],                                  // totems d'immortalité
  [/^minecraft:(netherite_ingot|netherite_scrap|netherite_upgrade_smithing_template)$/, 0.6],   // netherite
  [/^irons_spellbooks:(?!copper_|iron_)[a-z_]*spell_book$/, 0.6],         // grimoires supérieurs (sauf cuivre et fer)
  [/^irons_spellbooks:[a-z_]*upgrade_orb$/, 0.5]                          // orbes d'amélioration
]
// Pages de Codex : AR_CODEX_TAUX des pages sont retirées ; chaque page conservée est recréée au niveau le plus bas, pour un sort tiré
// au hasard (sort actif, trouvable en butin, non désactivé), pondéré par la rareté : voir AR_CODEX_POIDS.
// Parchemins de sorts de la classe Réprouvé : AR_REPROUVE_TAUX des parchemins sont retirés des coffres (ils étaient sur-représentés).
var AR_CODEX_TAUX = 0.74   // 74 % des pages retirées : environ 1 page de Codex tous les 15 coffres (brut mesuré : 0,255 page par coffre)
var AR_REPROUVE_TAUX = 0.6
// Parchemin supplémentaire : chance par coffre d'en ajouter un (en plus de ceux déjà présents, environ 0,017 par coffre),
// pour viser environ 1 parchemin tous les 25 coffres (0,04 par coffre).
var AR_PARCHEMIN_AJOUT = 0.023
var AR_DEBUG = true   // journal de chaque ouverture de conteneur (mettre false une fois le filtre vérifié)
var AR_PAGE = null, AR_SR = null, AR_CATALOGUE = null
function arRareteSort(sp) { try { return String(sp.getMinRarity()).toUpperCase() } catch (e) { return 'COMMON' } }
function arSortListable(sp) {
  try { if (!sp.allowLooting()) return false } catch (e) {}
  try { if (typeof desactSortInterdit === 'function' && desactSortInterdit(sp.getSpellId())) return false } catch (e2) {}   // désactivés et sorts de cours
  try { if (AR_CATALOGUE && !AR_CATALOGUE.isListed(sp)) return false } catch (e3) {}
  return true
}
// Retourne : null = garder la page, 'retirer', ou une nouvelle pile (page remplacée)
// Poids de tirage d'une page selon la rareté minimale du sort (la page est toujours à son niveau le plus bas) :
// plus le sort est rare, moins il a de chances de tomber.
var AR_CODEX_POIDS = { COMMON: 1, UNCOMMON: 0.6, RARE: 0.15, EPIC: 0.06, LEGENDARY: 0.02 }
var AR_CODEX_LISTE = null

function arListePages() {
  if (AR_CODEX_LISTE) return AR_CODEX_LISTE
  var tous = AR_SR.getEnabledSpells(), liste = [], total = 0
  for (var i = 0; i < tous.size(); i++) {
    var s2 = tous.get(i)
    if (!arSortListable(s2)) continue
    var w = AR_CODEX_POIDS[arRareteSort(s2)]
    if (w === undefined) w = 1
    total += w
    liste.push({ sort: s2, cumul: total })
  }
  AR_CODEX_LISTE = { liste: liste, total: total }
  return AR_CODEX_LISTE
}

function arPageCodex(pile) {
  if (Math.random() < AR_CODEX_TAUX) return 'retirer'
  try {
    if (!AR_PAGE) AR_PAGE = Java.loadClass('com.specs.irons_spellbooks.item.CodexPageItem')
    if (!AR_SR) AR_SR = Java.loadClass('io.redspace.ironsspellbooks.api.registry.SpellRegistry')
    if (!AR_CATALOGUE) { try { AR_CATALOGUE = Java.loadClass('com.specs.irons_spellbooks.catalog.SpellCatalog') } catch (eC) {} }
    var L = arListePages()
    if (L.liste.length === 0) return null
    var t = Math.random() * L.total
    for (var i = 0; i < L.liste.length; i++) {
      if (t <= L.liste[i].cumul) return AR_PAGE['createFor(io.redspace.ironsspellbooks.api.spells.AbstractSpell)'](L.liste[i].sort)
    }
    return null
  } catch (e) { console.error('[armures_butin] page de codex : ' + e); return null }
}

// Parchemin d'un sort de la classe Réprouvé (hors sorts « pour tous ») ?
function arEstParcheminReprouve(pile) {
  try {
    if (String(pile.id) !== 'irons_spellbooks:scroll') return false
    if (typeof desactSortDuParchemin !== 'function' || typeof classeParNom !== 'function' || typeof sortInterditPourJoueur !== 'function') return false
    var s = desactSortDuParchemin(pile)
    if (!s) return false
    var cl = classeParNom('Réprouvé')
    if (!cl) return false
    if (typeof SORTS_PAR_CLASSE !== 'undefined' && SORTS_PAR_CLASSE[s.id] && SORTS_PAR_CLASSE[s.id].indexOf('*') !== -1) return false
    return !sortInterditPourJoueur(cl, s.id)
  } catch (e) { return false }
}

// Remplace un parchemin Réprouvé retiré par un parchemin d'un sort d'une autre classe (même niveau si possible) :
// le nombre de parchemins dans les coffres ne baisse plus, seule la part de Réprouvé diminue.
function arRemplacerParcheminReprouve(pile) {
  try {
    var s = desactSortDuParchemin(pile)
    if (!s) return 'retirer'
    if (!AR_SR) AR_SR = Java.loadClass('io.redspace.ironsspellbooks.api.registry.SpellRegistry')
    var cl = classeParNom('Réprouvé')
    var tous = AR_SR.getEnabledSpells(), liste = []
    for (var i = 0; i < tous.size(); i++) {
      var sp = tous.get(i), id = String(sp.getSpellId())
      if (id === s.id || desactSortInterdit(id)) continue
      try { if (!sp.allowLooting()) continue } catch (e1) {}
      var pourTous = (typeof SORTS_PAR_CLASSE !== 'undefined' && SORTS_PAR_CLASSE[id] && SORTS_PAR_CLASSE[id].indexOf('*') !== -1)
      if (!pourTous && !sortInterditPourJoueur(cl, id)) continue   // sort Réprouvé : exclu
      liste.push(sp)
    }
    if (!liste.length) return 'retirer'
    var choix = liste[Math.floor(Math.random() * liste.length)]
    var niveau = Math.max(choix.getMinLevel(), Math.min(s.niveau, choix.getMaxLevel()))
    var neuf = Item.of('irons_spellbooks:scroll')
    DESACT_ISC.set(neuf, DESACT_ISC.createScrollContainer(choix, niveau, neuf))
    return neuf
  } catch (e) { return 'retirer' }
}

// Parchemin ajouté : sort au hasard (actif, trouvable en butin, ni désactivé ni Réprouvé), niveau le plus souvent bas
// (3 fois sur 4 dans le premier 70 % de la plage de niveaux, sinon toute la plage).
function arCreerParchemin() {
  try {
    if (!AR_SR) AR_SR = Java.loadClass('io.redspace.ironsspellbooks.api.registry.SpellRegistry')
    var vide = Item.of('minecraft:air')
    var modele = Item.of('irons_spellbooks:scroll')
    desactSortDuParchemin(modele)   // initialise DESACT_ISC
    var cl = classeParNom('Réprouvé')
    var tous = AR_SR.getEnabledSpells(), liste = []
    for (var i = 0; i < tous.size(); i++) {
      var sp = tous.get(i), id = String(sp.getSpellId())
      if (desactSortInterdit(id)) continue
      try { if (!sp.allowLooting()) continue } catch (e1) {}
      var pourTous = (typeof SORTS_PAR_CLASSE !== 'undefined' && SORTS_PAR_CLASSE[id] && SORTS_PAR_CLASSE[id].indexOf('*') !== -1)
      if (!pourTous && !sortInterditPourJoueur(cl, id)) continue
      liste.push(sp)
    }
    if (!liste.length) return null
    var choix = liste[Math.floor(Math.random() * liste.length)]
    var mn = choix.getMinLevel(), mx = choix.getMaxLevel()
    var q = Math.random() < 0.75 ? Math.random() * 0.7 : Math.random()
    var niveau = Math.min(mx, mn + Math.floor(q * (mx - mn + 1)))
    var neuf = Item.of('irons_spellbooks:scroll')
    DESACT_ISC.set(neuf, DESACT_ISC.createScrollContainer(choix, niveau, neuf))
    return neuf
  } catch (e) { return null }
}

function arTauxAutre(pile) {
  var id = String(pile.id)
  for (var i = 0; i < AR_AUTRES.length; i++) if (AR_AUTRES[i][0].test(id)) return AR_AUTRES[i][1]
  return 0
}
// Décision pour UNE pile de coffre. Retourne : undefined = objet non concerné par le filtre ; null = gardé ;
// 'retirer' = supprimé ; ou une nouvelle pile (page de Codex recréée). Utilisée aussi par le test de butin (test_butin.js).
function arFiltrerPile(pile) {
  if (String(pile.id) === 'specs_irons_spellbooks:codex_page') {
    var res = arPageCodex(pile)
    return res === null ? null : res
  }
  if (arEstParcheminReprouve(pile)) return Math.random() < AR_REPROUVE_TAUX ? arRemplacerParcheminReprouve(pile) : null
  var taux = arEstArmure(pile) ? arTaux(pile) : arTauxAutre(pile)
  if (taux <= 0) return undefined
  return Math.random() < taux ? 'retirer' : null
}

var AR_CLE = 'armures_coffres_filtres'

var AR_CLASSE_ARMURE = null
var AR_CLASSE_ENDER = null
var AR_CLASSE_BLOCENTITE = null

function arEstArmure(pile) {
  try {
    if (!AR_CLASSE_ARMURE) AR_CLASSE_ARMURE = Java.loadClass('net.minecraft.world.item.ArmorItem')
    return pile.item instanceof AR_CLASSE_ARMURE
  } catch (e) { return false }
}

function arTaux(pile) {
  return String(pile.id).indexOf('minecraft:') === 0 ? AR_TAUX_VANILLA : AR_TAUX_MOD
}

// Position du conteneur (bloc) : coffre simple, double coffre ou bloc-conteneur ; null si inconnue (alors on ne filtre pas)
function arPositions(c) {
  var res = []
  try {
    if (!AR_CLASSE_BLOCENTITE) AR_CLASSE_BLOCENTITE = Java.loadClass('net.minecraft.world.level.block.entity.BlockEntity')
    if (c instanceof AR_CLASSE_BLOCENTITE) { res.push(c.blockPos); return res }
  } catch (e) {}
  try { if (c.container1 && c.container2) { var a = arPositions(c.container1); var b = arPositions(c.container2); return a.concat(b) } } catch (e2) {}
  return res
}

function arCle(joueur, menu) {
  try {
    var pos = arPositions(menu.getContainer())
    if (pos.length === 0) {   // coffres Lootr : l'inventaire du joueur est une copie (ILootrInventory), la position est dans son « info »
      try { var inf = menu.getContainer().getInfo(); pos = [inf.getInfoPos()] } catch (eL) { if (AR_DEBUG) console.error('[armures_butin] getInfo : ' + eL) }
    }
    if (pos.length === 0) return null
    var dim = String(joueur.level.dimension.location())
    // NB : getClass() n'existe pas dans le moteur de script : un coffre Lootr se reconnaît à son « info » (ILootrInventory.getInfo()).
    var lootr = false
    try { lootr = !!menu.getContainer().getInfo() } catch (eN) {}
    var s = dim + '@'
    for (var i = 0; i < pos.length; i++) s += pos[i].x + ',' + pos[i].y + ',' + pos[i].z + ';'
    if (lootr) s += 'j:' + String(joueur.uuid)
    return s
  } catch (e) { if (AR_DEBUG) console.error('[armures_butin] arCle : ' + e); return null }
}

function arFiltrerConteneur(event) {
  try {
    var joueur = event.getEntity()
    if (!joueur || !joueur.isPlayer()) return
    var menu = event.getContainer()
    var total = menu.slots.size()
    if (total <= 36) return
    var modeTest = false
    try { modeTest = estTest(joueur) } catch (e0) {}
    if (AR_DEBUG) console.info('[armures_butin] ouverture : ' + joueur.username + ' | ' + String(menu) + ' | ' + String(menu.getContainer()) + ' | ' + total + ' emplacements | mode testeur ' + modeTest)
    if (modeTest) return
    if (!AR_CLASSE_ENDER) AR_CLASSE_ENDER = Java.loadClass('net.minecraft.world.inventory.PlayerEnderChestContainer')
    try { if (menu.getContainer() instanceof AR_CLASSE_ENDER) return } catch (e1) {}
    var cle = arCle(joueur, menu)
    if (AR_DEBUG) console.info('[armures_butin] clé : ' + cle)
    if (!cle) return
    var deja = joueur.server.persistentData
    var liste = deja.getCompound(AR_CLE)   // renvoie un compound vide s'il n'existe pas encore
    if (liste.contains(cle)) return
    liste.putByte(cle, 1)
    deja.put(AR_CLE, liste)
    var repere = menu.getSlot(total - 1)
    var vide = Item.of('minecraft:air')
    var retires = 0
    var vus = 0
    for (var i = 0; i < total; i++) {
      var slot = menu.getSlot(i)
      if (slot.isSameInventory(repere)) continue
      var pile = slot.getItem()
      if (!pile || pile.isEmpty()) continue
      var dec = arFiltrerPile(pile)
      if (dec === undefined) continue            // objet non concerné
      vus++
      if (dec === 'retirer') { slot.set(vide); retires++ }
      else if (dec) slot.set(dec)
    }
    if (Math.random() < AR_PARCHEMIN_AJOUT) {   // parchemin supplémentaire dans un emplacement libre
      var neuf = arCreerParchemin()
      if (neuf) {
        var libres = []
        for (var j = 0; j < total; j++) {
          var sl = menu.getSlot(j)
          if (sl.isSameInventory(repere)) continue
          if (sl.getItem().isEmpty()) libres.push(sl)
        }
        if (libres.length) libres[Math.floor(Math.random() * libres.length)].set(neuf)
      }
    }
    if (vus > 0) console.info('[armures_butin] ' + retires + '/' + vus + ' objet(s) filtré(s) retiré(s) (' + cle + ')')
  } catch (e) {
    console.error('[armures_butin] Conteneur : ' + e)
  }
}

try {
  NativeEvents.onEvent(
    Java.loadClass('net.neoforged.neoforge.event.entity.player.PlayerContainerEvent$Open'),
    function (event) { arFiltrerConteneur(event) }
  )
  console.info('[armures_butin] Filtre des coffres actif (vanilla ' + AR_TAUX_VANILLA + ', mods ' + AR_TAUX_MOD + ').')
} catch (e) {
  console.error('[armures_butin] Filtre des coffres indisponible : ' + e)
}

// Auteur d'un coup mortel : DamageSource n'expose pas toujours getEntity() sous KubeJS (« actual » en secours).
function arTueur(event) {
  var s = event.getSource()
  try { if (typeof s.getEntity === 'function') return s.getEntity() } catch (e) {}
  try { if (s.actual) return s.actual } catch (e2) {}
  try { if (typeof s.getDirectEntity === 'function') return s.getDirectEntity() } catch (e3) {}
  return null
}

// ───────────── Butin des mobs ─────────────
if (AR_MOBS) {
  try {
    NativeEvents.onEvent(
      Java.loadClass('net.neoforged.neoforge.event.entity.living.LivingDropsEvent'),
      function (event) {
        try {
          if (event.getEntity().isPlayer()) return
          var it = event.getDrops().iterator()
          while (it.hasNext()) {
            var pile = it.next().getItem()
            if (!pile || pile.isEmpty() || !arEstArmure(pile)) continue
            if (Math.random() < arTaux(pile)) it.remove()
          }
        } catch (e) { console.error('[armures_butin] Butin des mobs : ' + e) }
      }
    )
    console.info('[armures_butin] Filtre du butin des mobs actif.')
  } catch (e) {
    console.error('[armures_butin] Filtre du butin des mobs indisponible : ' + e)
  }
}

// ───────────── Butin supplémentaire ─────────────
var BUTIN_SUPPL = [
  // Rod of Discord : aussi sur les variantes d'Enderman Overhaul (1 %, tué par un joueur)
  { mob: 'endermanoverhaul:windswept_hills_enderman', objet: 'hazennstuff:rod_of_discord', chance: 0.01, min: 1, max: 1, joueur: true },
  { mob: 'endermanoverhaul:flower_fields_enderman', objet: 'hazennstuff:rod_of_discord', chance: 0.01, min: 1, max: 1, joueur: true },
  { mob: 'endermanoverhaul:soulsand_valley_enderman', objet: 'hazennstuff:rod_of_discord', chance: 0.01, min: 1, max: 1, joueur: true },
  { mob: 'endermanoverhaul:savanna_enderman', objet: 'hazennstuff:rod_of_discord', chance: 0.01, min: 1, max: 1, joueur: true },
  { mob: 'endermanoverhaul:end_enderman', objet: 'hazennstuff:rod_of_discord', chance: 0.01, min: 1, max: 1, joueur: true },
  { mob: 'endermanoverhaul:end_islands_enderman', objet: 'hazennstuff:rod_of_discord', chance: 0.01, min: 1, max: 1, joueur: true },
  { mob: 'endermanoverhaul:badlands_enderman', objet: 'hazennstuff:rod_of_discord', chance: 0.01, min: 1, max: 1, joueur: true },
  { mob: 'endermanoverhaul:mushroom_fields_enderman', objet: 'hazennstuff:rod_of_discord', chance: 0.01, min: 1, max: 1, joueur: true },
  { mob: 'endermanoverhaul:warped_forest_enderman', objet: 'hazennstuff:rod_of_discord', chance: 0.01, min: 1, max: 1, joueur: true },
  { mob: 'endermanoverhaul:ice_spikes_enderman', objet: 'hazennstuff:rod_of_discord', chance: 0.01, min: 1, max: 1, joueur: true },
  { mob: 'endermanoverhaul:crimson_forest_enderman', objet: 'hazennstuff:rod_of_discord', chance: 0.01, min: 1, max: 1, joueur: true },
  { mob: 'endermanoverhaul:snowy_enderman', objet: 'hazennstuff:rod_of_discord', chance: 0.01, min: 1, max: 1, joueur: true },
  { mob: 'endermanoverhaul:dark_oak_enderman', objet: 'hazennstuff:rod_of_discord', chance: 0.01, min: 1, max: 1, joueur: true },
  { mob: 'endermanoverhaul:desert_enderman', objet: 'hazennstuff:rod_of_discord', chance: 0.01, min: 1, max: 1, joueur: true },
  { mob: 'endermanoverhaul:nether_wastes_enderman', objet: 'hazennstuff:rod_of_discord', chance: 0.01, min: 1, max: 1, joueur: true },
  { mob: 'endermanoverhaul:swamp_enderman', objet: 'hazennstuff:rod_of_discord', chance: 0.01, min: 1, max: 1, joueur: true },
  { mob: 'endermanoverhaul:coral_enderman', objet: 'hazennstuff:rod_of_discord', chance: 0.01, min: 1, max: 1, joueur: true },
  { mob: 'endermanoverhaul:cave_enderman', objet: 'hazennstuff:rod_of_discord', chance: 0.01, min: 1, max: 1, joueur: true }
]
try {
  var ItemEntiteJ = Java.loadClass('net.minecraft.world.entity.item.ItemEntity')
  NativeEvents.onEvent(
    Java.loadClass('net.neoforged.neoforge.event.entity.living.LivingDropsEvent'),
    function (event) {
      try {
        var ent = event.getEntity()
        if (ent.isPlayer() || ent.level.isClientSide()) return
        var type = String(ent.type)
        for (var i = 0; i < BUTIN_SUPPL.length; i++) {
          var b = BUTIN_SUPPL[i]
          if (b.mob !== type || Math.random() >= b.chance) continue
          if (b.joueur) { var tu = arTueur(event); if (!tu || !tu.isPlayer()) continue }
          var n = b.min + Math.floor(Math.random() * (b.max - b.min + 1))
          event.getDrops().add(new ItemEntiteJ(ent.level, ent.x, ent.y, ent.z, Item.of(b.objet, n)))
        }
      } catch (e) { console.error('[armures_butin] Butin supplémentaire : ' + e) }
    }
  )
  console.info('[armures_butin] Butin supplémentaire actif.')
} catch (e) { console.error('[armures_butin] Butin supplémentaire indisponible : ' + e) }


// ───────────── Butin sur joueur : Meowmere (0,2 %) quand un joueur en tue un autre ─────────────
var BUTIN_JOUEUR = { objet: 'hazennstuff:meowmere', chance: 0.002 }
try {
  var ItemEntiteJ2 = Java.loadClass('net.minecraft.world.entity.item.ItemEntity')
  NativeEvents.onEvent(
    Java.loadClass('net.neoforged.neoforge.event.entity.living.LivingDropsEvent'),
    function (event) {
      try {
        var victime = event.getEntity()
        if (!victime.isPlayer() || victime.level.isClientSide()) return
        var tueur = arTueur(event)
        if (!tueur || !tueur.isPlayer() || String(tueur.uuid) === String(victime.uuid)) return
        if (Math.random() >= BUTIN_JOUEUR.chance) return
        event.getDrops().add(new ItemEntiteJ2(victime.level, victime.x, victime.y, victime.z, Item.of(BUTIN_JOUEUR.objet, 1)))
        console.info('[armures_butin] Meowmere lâché par ' + victime.username + ' (tué par ' + tueur.username + ')')
      } catch (e) { console.error('[armures_butin] Butin sur joueur : ' + e) }
    }
  )
  console.info('[armures_butin] Butin sur joueur actif.')
} catch (e) { console.error('[armures_butin] Butin sur joueur indisponible : ' + e) }
