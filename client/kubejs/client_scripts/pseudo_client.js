// pseudo_client.js : affiche le pseudo choisi avec /pseudo sur la plaque de nom d'origine (au-dessus de la tête).
// Le serveur place le joueur dans une équipe « ps_... » dont le nom d'affichage est le pseudo ; on le lit ici.

function pcNom(p) {
  try {
    var t = p.getTeam()
    if (!t) return null
    if (String(t.getName()).indexOf('ps_') !== 0) return null
    return t.getDisplayName()
  } catch (e) { return null }
}

try {
  NativeEvents.onEvent(Java.loadClass('net.neoforged.neoforge.event.entity.player.PlayerEvent$NameFormat'), function (e) {
    try {
      var p = e.getEntity()
      if (!p.level().isClientSide()) return
      var nom = pcNom(p)
      if (nom) e.setDisplayname(nom)
    } catch (err) {}
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
    } catch (e2) {}
  })
} catch (e3) { console.error('[pseudo_client] tick indisponible : ' + e3) }

console.info('[pseudo_client] chargé')
