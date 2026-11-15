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

// Recherche SANS bloquer le serveur : l'ancien chargement direct des chunks (jusqu'à 30 chunks neufs à générer
// d'un coup) gelait le serveur plus de 60 s et le faisait crasher (watchdog). Désormais chaque point demande le
// chargement de son chunk en arrière-plan (ticket « portal », 15 s), et on vérifie à chaque tick s'il est prêt.
var RTP_RECH = {}         // username -> recherche en cours
var RTP_TICK = 0
var RTP_ATTENTE_MAX = 300 // ticks d'attente maximum par point (15 s) avant d'en essayer un autre
var RTP_CLASSES = null

function rtpClasses() {
  if (!RTP_CLASSES) RTP_CLASSES = {
    Types: Java.loadClass('net.minecraft.world.level.levelgen.Heightmap$Types'),
    Ticket: Java.loadClass('net.minecraft.server.level.TicketType'),
    ChunkPos: Java.loadClass('net.minecraft.world.level.ChunkPos'),
    BlockPos: Java.loadClass('net.minecraft.core.BlockPos')
  }
  return RTP_CLASSES
}

// Tire le point suivant (dans la bordure du monde) et demande le chargement de son chunk. false = plus d'essais.
function rtpPointSuivant(r) {
  var C = rtpClasses()
  while (r.essai < RTP.ESSAIS) {
    r.essai++
    var p = rtpPoint(r.cx, r.cz)
    try { if (!r.niveau.worldBorder.isWithinBounds(p.x, p.z)) continue } catch (e) {}
    try {
      r.niveau.getChunkSource().addRegionTicket(C.Ticket.PORTAL, new C.ChunkPos(p.x >> 4, p.z >> 4), 1, new C.BlockPos(p.x, 64, p.z))
    } catch (e2) { console.error('[rtp] demande de chargement impossible : ' + e2) }
    r.point = p
    r.depuis = RTP_TICK
    return true
  }
  return false
}

function rtpFin(nom) { delete RTP_RECH[nom] }

ServerEvents.tick(function (event) {
  RTP_TICK++
  for (var nom in RTP_RECH) {
    var r = RTP_RECH[nom]
    try {
      var joueur = event.server.playerList.getPlayerByName(nom)
      if (!joueur || joueur.isRemoved() || rtpDimension(rtpVal(joueur, 'level', 'level')) !== r.dim) { rtpFin(nom); continue }
      var p = r.point
      if (!r.niveau.getChunkSource().hasChunk(p.x >> 4, p.z >> 4)) {
        if (RTP_TICK - r.depuis > RTP_ATTENTE_MAX) {
          r.derniers.push(p.x + ',?,' + p.z)
          if (!rtpPointSuivant(r)) { rtpEchec(joueur, r); rtpFin(nom) }
        }
        continue
      }
      var y = r.niveau.getHeight(rtpClasses().Types.MOTION_BLOCKING_NO_LEAVES, p.x, p.z)
      if (rtpSur(r.niveau, p.x, y, p.z)) {
        event.server.runCommandSilent('tp ' + nom + ' ' + (p.x + 0.5).toFixed(2) + ' ' + y + ' ' + (p.z + 0.5).toFixed(2))
        joueur.persistentData.putLong(RTP_CLE, Date.now())
        joueur.tell(Text.translate('mcrp.rtp.ok', p.x, y, p.z).green())
        rtpFin(nom)
        continue
      }
      r.derniers.push(p.x + ',' + y + ',' + p.z)
      if (!rtpPointSuivant(r)) { rtpEchec(joueur, r); rtpFin(nom) }
    } catch (e) {
      console.error('[rtp] ' + e)
      rtpFin(nom)
    }
  }
})

function rtpEchec(joueur, r) {
  console.info('[rtp] aucun point sûr après ' + RTP.ESSAIS + ' essais (x,y,z testés) : ' + r.derniers.slice(0, 5).join(' | '))
  joueur.tell(Text.translate('mcrp.rtp.introuvable').red())
}

function cmdRtp(ctx) {
  var joueur = ctx.source.player
  if (!joueur) return 0
  var niveau = rtpVal(joueur, 'level', 'level')
  if (RTP.DIMENSIONS.indexOf(rtpDimension(niveau)) === -1) {
    joueur.tell(Text.translate('mcrp.rtp.dimension').red())
    return 0
  }

  var modo = ctx.source.hasPermission(2)
  var data = joueur.persistentData
  if (RTP.RECHARGE_S > 0 && !modo) {
    var reste = Math.ceil((Number(data.getLong(RTP_CLE)) + RTP.RECHARGE_S * 1000 - Date.now()) / 1000)
    if (reste > 0) {
      joueur.tell(Text.translate('mcrp.rtp.recharge', reste).red())
      return 0
    }
  }

  var nom = String(joueur.username)
  if (RTP_RECH[nom]) {
    joueur.tell(Text.gray('Recherche d\'un endroit déjà en cours…'))
    return 0
  }
  var r = {
    niveau: niveau, dim: rtpDimension(niveau), essai: 0, point: null, depuis: 0, derniers: [],
    cx: Number(rtpVal(joueur, 'x', 'getX')), cz: Number(rtpVal(joueur, 'z', 'getZ'))
  }
  if (!rtpPointSuivant(r)) {
    joueur.tell(Text.translate('mcrp.rtp.introuvable').red())
    return 0
  }
  RTP_RECH[nom] = r
  joueur.tell(Text.gray('Recherche d\'un endroit sûr…'))
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

// ── /warp : depuis le spawn du monde, téléporte à l'école (cour de récréation de l'Académie) ──
// Utilisable de partout (RAYON_SPAWN: 0). Mettre un rayon en blocs autour du spawn du monde pour le limiter.
var WARP = { X: 1044.5, Y: 482, Z: 1279.5, DIMENSION: 'minecraft:overworld', RAYON_SPAWN: 0 }
function cmdWarp(ctx) {
  var j = ctx.source.player
  if (!j) return 0
  var sv = ctx.source.server
  var op = false
  try { op = j.hasPermissions(2) } catch (e) {}
  if (!op && WARP.RAYON_SPAWN > 0) {
    var loin = true
    try {
      var ow = null, lv = sv.getAllLevels().iterator()
      while (lv.hasNext()) { var l = lv.next(); if (String(l.dimension).indexOf('minecraft:overworld') >= 0) ow = l }
      var sp = ow.getSharedSpawnPos()
      var dimJ = String(j.level.dimension)
      var dx = j.x - sp.getX(), dz = j.z - sp.getZ()
      loin = dimJ.indexOf('minecraft:overworld') < 0 || dx * dx + dz * dz > WARP.RAYON_SPAWN * WARP.RAYON_SPAWN
    } catch (e2) { console.error('[warp] spawn : ' + e2) }
    if (loin) { j.tell(Text.red('Le /warp ne fonctionne qu\'au spawn du monde.')); return 0 }
  }
  // Animation Grand Teleport : tag lu par le mod pendant la commande tp
  sv.runCommandSilent('tag ' + j.username + ' add gta_anim')
  try {
    sv.runCommandSilent('execute in ' + WARP.DIMENSION + ' run tp ' + j.username + ' ' + WARP.X + ' ' + WARP.Y + ' ' + WARP.Z)
  } finally {
    sv.runCommandSilent('tag ' + j.username + ' remove gta_anim')
  }
  j.tell(Text.gold('Bienvenue à l\'Académie !'))
  return 1
}
ServerEvents.commandRegistry(function (event) {
  event.register(event.commands.literal('warp').executes(function (ctx) {
    try { return cmdWarp(ctx) } catch (e) { console.error('[warp] ' + e); return 0 }
  }))
})
