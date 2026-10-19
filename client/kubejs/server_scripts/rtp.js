// /rtp : téléportation aléatoire entre 500 et 1000 blocs de la position actuelle (en surface, hors eau/lave/vide).

var RTP = {
  DIST_MAX: 1000,         // distance maximale depuis la position actuelle
  DIST_MIN: 500,          // distance minimale
  ESSAIS: 30,             // nombre de points tirés avant d'abandonner
  RECHARGE_S: 600,        // délai entre deux /rtp pour un joueur (0 = aucun ; les modérateurs en sont dispensés)
  DIMENSIONS: ['minecraft:overworld', 'minecraft:the_end'],
  DANGEREUX: [
    'minecraft:water', 'minecraft:lava', 'minecraft:cactus', 'minecraft:magma_block', 'minecraft:fire',
    'minecraft:soul_fire', 'minecraft:campfire', 'minecraft:soul_campfire', 'minecraft:sweet_berry_bush',
    'minecraft:powder_snow', 'minecraft:bubble_column', 'minecraft:wither_rose', 'minecraft:pointed_dripstone'
  ]
}

var RTP_CLE = 'rtp_dernier'

function rtpVal(o, prop, getter) {
  var v
  try { v = o[prop] } catch (e) {}
  if (v !== undefined && v !== null && typeof v !== 'function') return v
  try { return o[getter]() } catch (e2) {}
  return null
}

function rtpDimension(niveau) {
  var s = String(rtpVal(niveau, 'dimension', 'dimension'))
  var m = s.match(/\/ ([^\]]+)\]/)
  return m ? m[1] : s
}

// Tire un point aléatoire entre DIST_MIN et DIST_MAX du centre (uniforme sur la distance).
function rtpPoint(cx, cz) {
  var angle = Math.random() * 2 * Math.PI
  var dist = RTP.DIST_MIN + Math.random() * (RTP.DIST_MAX - RTP.DIST_MIN)
  return { x: Math.floor(cx + Math.cos(angle) * dist), z: Math.floor(cz + Math.sin(angle) * dist) }
}

function rtpSur(niveau, x, y, z) {
  var bas = Number(rtpVal(niveau, 'minBuildHeight', 'getMinBuildHeight'))
  if (!isNaN(bas) && y <= bas + 1) return false // au-dessus du vide
  var sol = String(niveau.getBlock(x, y - 1, z).id)
  if (sol === 'minecraft:air' || sol === 'minecraft:void_air' || sol === 'minecraft:cave_air' || RTP.DANGEREUX.indexOf(sol) !== -1) return false
  var pieds = String(niveau.getBlock(x, y, z).id)
  var tete = String(niveau.getBlock(x, y + 1, z).id)
  return pieds === 'minecraft:air' && tete === 'minecraft:air'
}

function rtpTrouver(niveau, cx, cz) {
  var Types = Java.loadClass('net.minecraft.world.level.levelgen.Heightmap$Types')
  var derniers = []
  for (var i = 0; i < RTP.ESSAIS; i++) {
    var p = rtpPoint(cx, cz)
    try {
      if (!niveau.worldBorder.isWithinBounds(p.x, p.z)) continue
    } catch (e) {}
    // Le jeu ne connaît la hauteur d'un point que si son chunk est chargé (sinon il répond « tout en bas »,
    // ce qui faisait croire que l'endroit n'était pas sûr). On charge donc le chunk avant de mesurer.
    try { niveau.getChunk(p.x >> 4, p.z >> 4) } catch (e2) { console.error('[rtp] chargement du chunk impossible : ' + e2) }
    var y = niveau.getHeight(Types.MOTION_BLOCKING_NO_LEAVES, p.x, p.z)
    if (rtpSur(niveau, p.x, y, p.z)) return { x: p.x + 0.5, y: y, z: p.z + 0.5 }
    derniers.push(p.x + ',' + y + ',' + p.z)
  }
  console.info('[rtp] aucun point sûr après ' + RTP.ESSAIS + ' essais (x,y,z testés) : ' + derniers.slice(0, 5).join(' | '))
  return null
}

function cmdRtp(ctx) {
  var joueur = ctx.source.player
  if (!joueur) return 0
  var niveau = rtpVal(joueur, 'level', 'level')
  if (RTP.DIMENSIONS.indexOf(rtpDimension(niveau)) === -1) {
    joueur.tell(Text.red('/rtp est indisponible dans cette dimension.'))
    return 0
  }

  var modo = ctx.source.hasPermission(2)
  var data = joueur.persistentData
  if (RTP.RECHARGE_S > 0 && !modo) {
    var reste = Math.ceil((Number(data.getLong(RTP_CLE)) + RTP.RECHARGE_S * 1000 - Date.now()) / 1000)
    if (reste > 0) {
      joueur.tell(Text.red('/rtp en recharge : encore ' + reste + ' s.'))
      return 0
    }
  }

  var cible = rtpTrouver(niveau, Number(rtpVal(joueur, 'x', 'getX')), Number(rtpVal(joueur, 'z', 'getZ')))
  if (!cible) {
    joueur.tell(Text.red('Aucun endroit sûr trouvé, réessaie dans un instant.'))
    return 0
  }

  ctx.source.server.runCommandSilent('tp ' + joueur.username + ' ' + cible.x.toFixed(2) + ' ' + cible.y + ' ' + cible.z.toFixed(2))
  data.putLong(RTP_CLE, Date.now())
  joueur.tell(Text.green('Téléporté en X ' + Math.floor(cible.x) + ', Y ' + cible.y + ', Z ' + Math.floor(cible.z) + '.'))
  return 1
}

ServerEvents.commandRegistry(function (event) {
  var Commands = event.commands
  event.register(Commands.literal('rtp').executes(function (ctx) {
    try {
      return cmdRtp(ctx)
    } catch (e) {
      console.error('[rtp] ' + e)
      return 0
    }
  }))
})
