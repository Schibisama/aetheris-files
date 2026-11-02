// Waystones en surbrillance : à moins de WH_RAYON blocs d'une waystone (n'importe laquelle : waystones, sharestones,
// portstones, plaques de téléportation), celle-ci s'entoure d'un halo bleu visible à travers les murs.
// Technique : un « block display » lumineux (Glowing) invisible hors halo, posé sur la waystone tant qu'un joueur est proche,
// puis retiré. Aucun mod côté joueur n'est nécessaire.
// À placer dans : <serveur>/kubejs/server_scripts/waystones_halo.js  (puis /reload)

var WH_RAYON = 10          // un joueur à moins de 10 blocs déclenche le halo
var WH_RAYON_SORTIE = 13   // le halo s'éteint au-delà de 13 blocs (évite le clignotement)
var WH_COULEUR = 5636095   // bleu clair (0x55FFFF)
var WH_TAG = 'aeth_wp'
var WH_ACTIFS = {}         // clé de waystone -> { dim, x, y, z }
var WH_LISTE = []
var WH_LISTE_TICK = -9999
var WH_API = null
try { WH_API = Java.loadClass('net.blay09.mods.waystones.api.WaystonesAPI') } catch (e) { console.error('[waystones_halo] API Waystones introuvable : ' + e) }

function whDim(obj) {
  var s = String(obj)
  var m = s.match(/([a-z0-9_.\-]+:[a-z0-9_.\-\/]+)\]?\s*$/)
  return m ? m[1] : s
}
function whDimJoueur(p) {
  var d = null
  try { d = p.level.dimension } catch (e) {}
  if (typeof d === 'function') { try { d = p.level.dimension() } catch (e2) { d = null } }
  if (d == null) { try { d = p.level.getLevel().dimension() } catch (e3) {} }
  return whDim(d)
}
function whCle(dim, x, y, z) { return dim.replace(/[^a-z0-9]+/g, '_') + '_' + x + '_' + y + '_' + z }

// Liste des waystones, rafraîchie toutes les 5 secondes.
function whRafraichir(server) {
  if (server.tickCount - WH_LISTE_TICK < 100) return
  WH_LISTE_TICK = server.tickCount
  var liste = []
  try {
    var it = WH_API.getAllWaystones(server).iterator()
    while (it.hasNext()) {
      var w = it.next()
      try {
        var pos = w.getPos()
        var type = String(w.getWaystoneType())
        liste.push({
          dim: whDim(w.getDimension()), x: pos.getX(), y: pos.getY(), z: pos.getZ(),
          haut: type.indexOf('warp_plate') >= 0 ? 0.2 : 2.0
        })
      } catch (e1) {}
    }
  } catch (e) { console.error('[waystones_halo] liste : ' + e) }
  WH_LISTE = liste
}

function whAllumer(server, w, cle) {
  server.runCommandSilent('execute in ' + w.dim + ' run kill @e[type=minecraft:block_display,tag=' + WH_TAG + '_' + cle + ']')
  var nbt = '{block_state:{Name:"minecraft:light_blue_stained_glass"},Glowing:1b,glow_color_override:' + WH_COULEUR +
    ',view_range:0.25f,Tags:["' + WH_TAG + '","' + WH_TAG + '_' + cle + '"],' +
    'transformation:{left_rotation:[0f,0f,0f,1f],right_rotation:[0f,0f,0f,1f],translation:[0f,0f,0f],scale:[0.9f,' + w.haut + 'f,0.9f]}}'
  server.runCommandSilent('execute in ' + w.dim + ' run summon minecraft:block_display ' + (w.x + 0.05) + ' ' + w.y + ' ' + (w.z + 0.05) + ' ' + nbt)
}
function whEteindre(server, info, cle) {
  server.runCommandSilent('execute in ' + info.dim + ' run kill @e[type=minecraft:block_display,tag=' + WH_TAG + '_' + cle + ']')
}

if (WH_API) {
  // Nettoyage au chargement : les halos laissés par un arrêt brutal ou un /reload sont retirés.
  ServerEvents.loaded(function (event) { event.server.runCommandSilent('kill @e[type=minecraft:block_display,tag=' + WH_TAG + ']') })
  try { var svc = Java.loadClass('net.neoforged.neoforge.server.ServerLifecycleHooks').getCurrentServer(); if (svc) svc.runCommandSilent('kill @e[type=minecraft:block_display,tag=' + WH_TAG + ']') } catch (e0) {}

  ServerEvents.tick(function (event) {
    var server = event.server
    if (server.tickCount % 20 !== 7) return
    try {
      whRafraichir(server)
      var joueurs = []
      var lp = server.players.iterator()
      while (lp.hasNext()) { var p = lp.next(); joueurs.push({ dim: whDimJoueur(p), x: p.x, y: p.y, z: p.z }) }
      var r2 = WH_RAYON * WH_RAYON, r2s = WH_RAYON_SORTIE * WH_RAYON_SORTIE
      var voulus = {}
      for (var i = 0; i < WH_LISTE.length; i++) {
        var w = WH_LISTE[i]
        var cle = whCle(w.dim, w.x, w.y, w.z)
        var limite = WH_ACTIFS[cle] ? r2s : r2
        for (var j = 0; j < joueurs.length; j++) {
          var q = joueurs[j]
          if (q.dim !== w.dim) continue
          var dx = q.x - w.x, dy = q.y - w.y, dz = q.z - w.z
          if (dx * dx + dy * dy + dz * dz <= limite) { voulus[cle] = w; break }
        }
      }
      for (var k in voulus) if (!WH_ACTIFS[k]) { whAllumer(server, voulus[k], k); WH_ACTIFS[k] = voulus[k] }
      for (var a in WH_ACTIFS) if (!voulus[a]) { whEteindre(server, WH_ACTIFS[a], a); delete WH_ACTIFS[a] }
    } catch (err) { console.error('[waystones_halo] ' + err) }
  })
  console.info('[waystones_halo] actif : halo à ' + WH_RAYON + ' blocs.')
}
