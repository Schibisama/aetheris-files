// Armures plus rares dans le butin : chaque pièce d'armure trouvée a une chance d'être retirée.
//   - coffres et conteneurs (vanilla, structures, LootR) : filtrés UNE seule fois par coffre (et par joueur pour LootR),
//     à la première ouverture ; les coffres déjà filtrés (ou posés et ouverts par un joueur) ne perdent plus rien ;
//   - butin des mobs : même chance de retrait (les joueurs ne sont jamais touchés).
// Armure vanilla (namespace minecraft) : AR_TAUX_VANILLA ; armure d'un mod : AR_TAUX_MOD. 0.7 = 70 % des pièces retirées.
// Ne touche pas : coffre de l'Ender, inventaire du joueur, joueurs en mode testeur, objets d'une autre nature que l'armure.
// Rechargement : /reload
var AR_TAUX_VANILLA = 0.5
var AR_TAUX_MOD = 0.7
var AR_MOBS = true
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
    if (pos.length === 0) return null
    var dim = String(joueur.level.dimension.location())
    var nom = String(menu.getClass().getName()).toLowerCase()
    var lootr = nom.indexOf('lootr') !== -1
    var s = dim + '@'
    for (var i = 0; i < pos.length; i++) s += pos[i].x + ',' + pos[i].y + ',' + pos[i].z + ';'
    if (lootr) s += 'j:' + String(joueur.uuid)
    return s
  } catch (e) { return null }
}

function arFiltrerConteneur(event) {
  try {
    var joueur = event.getEntity()
    if (!joueur || !joueur.isPlayer()) return
    try { if (estTest(joueur)) return } catch (e0) {}
    var menu = event.getContainer()
    var total = menu.slots.size()
    if (total <= 36) return
    if (!AR_CLASSE_ENDER) AR_CLASSE_ENDER = Java.loadClass('net.minecraft.world.inventory.PlayerEnderChestContainer')
    try { if (menu.getContainer() instanceof AR_CLASSE_ENDER) return } catch (e1) {}
    var cle = arCle(joueur, menu)
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
      if (!pile || pile.isEmpty() || !arEstArmure(pile)) continue
      vus++
      if (Math.random() < arTaux(pile)) { slot.set(vide); retires++ }
    }
    if (vus > 0) console.info('[armures_butin] ' + retires + '/' + vus + ' pièce(s) d\'armure retirée(s) (' + cle + ')')
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
