// pseudo_client.js : affiche le pseudo choisi avec /pseudo sur la plaque de nom d'origine (au-dessus de la tête).
// Le serveur place le joueur dans une équipe « ps_... » dont le nom d'affichage est le pseudo ; on le lit ici.
// Gère aussi l'affichage de la couche chapeau du skin sous le casque Pyrium Battlemage (voir en bas).

var PC_ERR = false

function pcNom(p) {
  try {
    var t = p.getTeam()
    if (!t) return null
    if (String(t.getName()).indexOf('ps_') !== 0) return null
    return t.getDisplayName()
  } catch (e) { if (!PC_ERR) { PC_ERR = true; console.error('[pseudo_client] ' + e) } return null }
}

try {
  NativeEvents.onEvent(Java.loadClass('net.neoforged.neoforge.event.entity.player.PlayerEvent$NameFormat'), function (e) {
    try {
      var p = e.getEntity()
      var nom = pcNom(p)
      if (nom) e.setDisplayname(nom)
    } catch (err) { if (!PC_ERR) { PC_ERR = true; console.error('[pseudo_client] ' + err) } }
  })
} catch (e0) { console.error('[pseudo_client] indisponible : ' + e0) }

// Le nom est mis en cache par le jeu : on le recalcule dès que l'équipe ou son nom change.
var PC_VU = {}
try {
  ClientEvents.tick(function (event) {
    try {
      var mc = Java.loadClass('net.minecraft.client.Minecraft').getInstance()
      var niveau = mc.level
      if (!niveau) return
      if (!PC_VU.n) PC_VU.n = 0
      PC_VU.n++
      if (PC_VU.n % 10 !== 0) return
      var joueurs = niveau.players()
      for (var i = 0; i < joueurs.size(); i++) {
        var p = joueurs.get(i)
        var nom = pcNom(p)
        var cle = nom ? String(nom.getString()) : ''
        var id = String(p.getUUID())
        if (PC_VU[id] !== cle) {
          PC_VU[id] = cle
          p.refreshDisplayName()
        }
      }
    } catch (e2) { if (!PC_ERR) { PC_ERR = true; console.error('[pseudo_client] tick : ' + e2) } }
  })
} catch (e3) { console.error('[pseudo_client] tick indisponible : ' + e3) }

// Chapeau Pyrium Battlemage (Hazen n Stuff) : Iron's Spells masque la couche « chapeau » du skin pour ce casque
// (interface IDisableHat), ce qui fait disparaître les détails du visage. On la réaffiche juste avant le rendu du joueur.
var PC_CASQUES_CALQUE = ['hazennstuff:pyrium_battlemage_helmet']
var PC_TETE = null, PC_REG = null
try {
  NativeEvents.onEvent(Java.loadClass('net.neoforged.neoforge.client.event.RenderPlayerEvent$Pre'), function (e) {
    try {
      if (!PC_TETE) {
        PC_TETE = Java.loadClass('net.minecraft.world.entity.EquipmentSlot').HEAD
        PC_REG = Java.loadClass('net.minecraft.core.registries.BuiltInRegistries').ITEM
      }
      var pile = e.getEntity().getItemBySlot(PC_TETE)
      if (!pile || pile.isEmpty()) return
      if (PC_CASQUES_CALQUE.indexOf(String(PC_REG.getKey(pile.getItem()))) === -1) return
      e.getRenderer().getModel().hat.visible = true
    } catch (err) { if (!PC_ERR) { PC_ERR = true; console.error('[pseudo_client] chapeau : ' + err) } }
  })
} catch (e4) { console.error('[pseudo_client] chapeau indisponible : ' + e4) }

console.info('[pseudo_client] chargé')
