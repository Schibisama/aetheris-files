// Zone des anciens matelots du Capitaine Morrow (Sculk Castle) : 6 mobs de Cataclysm, aucun butin, la jambe de bois tombe quand le DERNIER meurt.
//  - zone d'aggro (boîte) : les mobs attaquent d'office tout joueur (survie/aventure) dedans, et lâchent l'aggro si le joueur sort ou si eux sortent de la zone ;
//  - régénération après 5 s sans cible ; respawn 30 min après la mort du dernier ; barres de vie masquées au-delà de la zone + 10 blocs.
// Scylla : « Act:1b » obligatoire dans le NBT du summon, sinon elle reste endormie (forme d'ancre).
//  - /pirate accepter|rendre <joueur> (quête de la jambe de bois, PNJ ou op) ; /pirate reset <joueur> ; /pirate respawn (op) ; /boss respawn|clear pirate (op).
// Nécessite : startup_scripts/objets_quetes.js (kubejs:jambe_de_bois) + redémarrage. Rechargement du script : /reload

var ZP = {
  x1: 1297, x2: 1359, z1: -13123, z2: -13066, y1: 62, y2: 69,
  respawnMin: 30,
  marge: 5,        // tolérance autour de la boîte avant de ramener un mob (Scylla apparaît 1 bloc dehors)
  barreMarge: 10,  // les joueurs au-delà de la boîte + cette marge ne voient plus les barres de vie
  mobs: [
    { type: 'cataclysm:scylla',      x: 1344, y: 62, z: -13124, nbt: 'Act:1b' },
    { type: 'cataclysm:scylla',      x: 1321, y: 62, z: -13124, nbt: 'Act:1b' },
    { type: 'cataclysm:clawdian',    x: 1312, y: 62, z: -13111 },
    { type: 'cataclysm:clawdian',    x: 1355, y: 62, z: -13111 },
    { type: 'cataclysm:hippocamtus', x: 1350, y: 62, z: -13091 },
    { type: 'cataclysm:hippocamtus', x: 1316, y: 62, z: -13091 }
  ],
  quete: {
    cle: 'capitaine_jambe_quete',   // 0 rien, 1 acceptée, 3 terminée ; finit par _quete (effacée par /reinit)
    pnj: 'Capitaine Morrow',
    accepter: "Six de mes anciens matelots gardent mon trésor, changés en monstres par la mer et la malédiction. Abats-les tous : le dernier à tomber lâchera ma jambe de bois. Rapporte-la-moi, et je te léguerai un savoir de ta voie.",
    encours: "Alors, mes six matelots ? La jambe de bois ne tombera qu'avec le dernier d'entre eux.",
    rien: "Tu ne m'as encore rien promis, voyageur.",
    sansObjet: "Je ne vois pas ma jambe de bois... Elle ne tombe que quand le sixième s'effondre. Reviens quand ce sera fait.",
    sansClasse: "Tu n'as pas encore de voie arcanique, voyageur... Va voir qui de droit, puis reviens me trouver.",
    fini: "Ma jambe est revenue, et mon trésor est à moi. Merci, voyageur.",
    recompense: "Ma jambe ! Enfin ! Prends ceci : un savoir de ta voie, arraché aux profondeurs.",
    objet: 'kubejs:jambe_de_bois',
    commandeRecompense: 'classe recompense_epique %joueur%'
  }
}

var AABB_ZP = null
try { AABB_ZP = Java.loadClass('net.minecraft.world.phys.AABB') } catch (e) { console.error('[zone_pirates] AABB : ' + e) }
var zpTypes = {}
for (var _i = 0; _i < ZP.mobs.length; _i++) zpTypes[ZP.mobs[_i].type] = true
var zpCompteur = 0
var zpAbsent = 0
var zpNettoyages = []   // butin parasite à effacer autour des morts
var zpCaches = {}
var zpErr = false

function zpNiveau(server) {
  try { return server.getLevel('minecraft:overworld') } catch (e) {}
  try { return server.overworld() } catch (e2) {}
  return null
}

function zpDans(x, z, m) { return x >= ZP.x1 - m && x <= ZP.x2 + m && z >= ZP.z1 - m && z <= ZP.z2 + m }

function zpEst(e) { return !!e && zpTypes[String(e.type)] === true && zpDans(e.x, e.z, ZP.marge) }

function zpMobs(niveau) {
  var res = []
  if (!AABB_ZP) return res
  var m = ZP.marge + 20
  var liste = niveau.getEntitiesWithin(new AABB_ZP(ZP.x1 - m, ZP.y1 - 40, ZP.z1 - m, ZP.x2 + m, ZP.y2 + 60, ZP.z2 + m))
  for (var i = 0; i < liste.size(); i++) {
    var e = liste.get(i)
    if (zpEst(e) && e.isAlive()) res.push(e)
  }
  return res
}

// ───────────── Difficulté : vie x3 et dégâts x1,5 (les seuils de phase restent en % de la vie max) ─────────────
var ZP_VIE_MULT = 3
var ZP_DEGATS_MULT = 1.5
// Appliqué une seule fois par exemplaire (marqueur zp_buff). Garde le même % de vie courant.
function zpBuff(server, e) {
  try {
    var pd = e.persistentData
    if (pd.getInt('zp_buff') === 1) return
    pd.putInt('zp_buff', 1)
    var avant = e.maxHealth
    var ratio = avant > 0 ? e.health / avant : 1
    server.runCommandSilent('attribute ' + e.uuid + ' minecraft:generic.max_health modifier add aetheris:boss_vie ' + (ZP_VIE_MULT - 1) + ' add_multiplied_total')
    var nouv = e.maxHealth * ratio
    try { e.setHealth(nouv) } catch (x) { e.health = nouv }
    console.info('[zone_pirates] vie x' + ZP_VIE_MULT + ' : ' + String(e.type) + ' ' + Math.round(avant) + ' -> ' + Math.round(e.maxHealth))
  } catch (err) { console.error('[zone_pirates] buff : ' + err) }
}

function zpIndex(e) {
  try {
    for (var i = 0; i < ZP.mobs.length; i++) if (e.tags.contains('zp' + i)) return i
  } catch (x) {}
  // repli : point d'apparition du même type le plus proche
  var best = -1, dmin = 1e12
  for (var j = 0; j < ZP.mobs.length; j++) {
    if (ZP.mobs[j].type !== String(e.type)) continue
    var dx = e.x - ZP.mobs[j].x, dz = e.z - ZP.mobs[j].z
    if (dx * dx + dz * dz < dmin) { dmin = dx * dx + dz * dz; best = j }
  }
  return best
}

function zpJoueurDedans(j, m) {
  return zpDans(j.x, j.z, m) && j.y >= ZP.y1 - 10 && j.y <= ZP.y2 + 25
}

function zpSpawn(server) {
  for (var i = 0; i < ZP.mobs.length; i++) {
    var m = ZP.mobs[i]
    server.runCommandSilent('execute in minecraft:overworld run summon ' + m.type + ' ' + m.x + ' ' + m.y + ' ' + m.z +
      ' {Tags:["pirate_zone","zp' + i + '"],PersistenceRequired:1b' + (m.nbt ? ',' + m.nbt : '') + '}')
  }
  server.persistentData.putInt('pirates_vivants', ZP.mobs.length)
  console.info('[zone_pirates] ' + ZP.mobs.length + ' anciens matelots apparaissent.')
}

// ───────── Boucle : aggro, laisse, régénération, apparition ─────────
ServerEvents.tick(function (event) {
  zpCompteur++
  var server = event.server
  // nettoyage du butin parasite (1 s après chaque mort) : objets au sol sans « Thrower » (les objets jetés par un joueur sont épargnés), sauf la jambe de bois
  if (zpNettoyages.length > 0 && zpCompteur % 5 === 0) {
    var nv = zpNiveau(server)
    for (var k = zpNettoyages.length - 1; k >= 0; k--) {
      var n = zpNettoyages[k]
      try {
        if (nv && AABB_ZP) {
          var li = nv.getEntitiesWithin(new AABB_ZP(n.x - 20, n.y - 20, n.z - 20, n.x + 20, n.y + 20, n.z + 20))
          for (var q0 = 0; q0 < li.size(); q0++) {
            var it = li.get(q0)
            if (String(it.type) !== 'minecraft:item') continue
            try { if (it.nbt.contains('Thrower')) continue } catch (x1) {}
            try { if (String(it.item.id) === 'kubejs:jambe_de_bois') continue } catch (x2) {}
            it.discard()
          }
        }
      } catch (x) {}
      n.t--
      if (n.t <= 0) zpNettoyages.splice(k, 1)
    }
  }
  if (zpCompteur % 5 !== 0) return
  try {
    var niveau = zpNiveau(server)
    if (!niveau || !AABB_ZP) return
    var vivants = zpMobs(niveau)
    for (var i = 0; i < vivants.length; i++) {
      var e = vivants[i]
      zpBuff(server, e)
      var idx = zpIndex(e)
      var cible = null
      try { cible = e.getTarget() } catch (x) {}
      // laisse : un mob sorti de la zone retourne à son point d'apparition
      if (!zpDans(e.x, e.z, ZP.marge) && idx >= 0) {
        var p = ZP.mobs[idx]
        try { e.setTarget(null) } catch (x) {}
        server.runCommandSilent('tp ' + e.uuid + ' ' + p.x + ' ' + p.y + ' ' + p.z)
        cible = null
      } else if (cible && !zpJoueurDedans(cible, 2)) {
        try { e.setTarget(null) } catch (x) {}
        cible = null
      }
      // aggro automatique sur le joueur le plus proche dans la zone
      if (!cible && zpCompteur % 10 === 0) {
        try {
          var js = server.getPlayers()
          var proche = null, dmin = 1e12
          for (var q = 0; q < js.size(); q++) {
            var jq = js.get(q)
            if (jq.isSpectator() || jq.isCreative() || !jq.isAlive()) continue
            if (!zpJoueurDedans(jq, 0)) continue
            var ax = jq.x - e.x, ay = jq.y - e.y, az = jq.z - e.z
            var d2 = ax * ax + ay * ay + az * az
            if (d2 < dmin) { dmin = d2; proche = jq }
          }
          if (proche) { e.setTarget(proche); cible = proche }
        } catch (x) { console.error('[zone_pirates] aggro : ' + x) }
      }
      // régénération après 5 s sans cible
      var pd = e.persistentData
      if (cible) pd.putInt('zp_sans_cible', 0)
      else {
        var c = pd.getInt('zp_sans_cible') + 1
        pd.putInt('zp_sans_cible', c)
        if (c >= 20 && zpCompteur % 20 === 0) { try { e.heal(e.maxHealth * 0.02) } catch (x) {} }
      }
    }
    // apparition (toutes les 5 s)
    if (zpCompteur % 100 !== 0) return
    var cx = (ZP.x1 + ZP.x2) / 2, cz = (ZP.z1 + ZP.z2) / 2
    var proximite = false
    var lj = server.getPlayers()
    for (var a = 0; a < lj.size(); a++) {
      var jj = lj.get(a)
      var ddx = jj.x - cx, ddz = jj.z - cz
      if (Math.sqrt(ddx * ddx + ddz * ddz) <= 80) { proximite = true; break }
    }
    if (!proximite) { zpAbsent = 0; return }
    if (vivants.length > 0) { zpAbsent = 0; return }
    var d = server.persistentData
    var quand = d.contains('pirates_respawn') ? d.getLong('pirates_respawn') : 0
    if (Date.now() < quand) return
    zpAbsent++
    if (zpAbsent < 2) return   // laisse aux entités le temps de se charger
    zpAbsent = 0
    zpSpawn(server)
  } catch (err) {
    console.error('[zone_pirates] ' + err)
  }
})

// ───────── Barres de vie : masquées pour les joueurs loin de la zone (toutes les 2 ticks) ─────────
var zpEntitesBarre = []
// Liste dédiée aux barres : tous les mobs de type pirate dans un très large rayon (même hors de la boîte ou en train de mourir)
function zpMobsBarre(niveau) {
  var res = []
  var m = ZP.marge + 200
  var liste = niveau.getEntitiesWithin(new AABB_ZP(ZP.x1 - m, ZP.y1 - 80, ZP.z1 - m, ZP.x2 + m, ZP.y2 + 120, ZP.z2 + m))
  for (var i = 0; i < liste.size(); i++) {
    var e = liste.get(i)
    if (zpTypes[String(e.type)] !== true) continue
    var ok = false
    try { ok = e.tags.contains('pirate_zone') } catch (x) {}
    if (ok || zpDans(e.x, e.z, ZP.marge + 20)) res.push(e)
  }
  return res
}
ServerEvents.tick(function (event) {
  if (zpCompteur % 2 !== 0) return
  try {
    var niveau = zpNiveau(event.server)
    if (!niveau || !AABB_ZP) return
    if (zpCompteur % 10 === 0 || zpEntitesBarre.length === 0) zpEntitesBarre = zpMobsBarre(niveau)
    var js = event.server.getPlayers()
    for (var i = 0; i < zpEntitesBarre.length; i++) {
      var e = zpEntitesBarre[i]
      if (e.removed) continue
      for (var q = 0; q < js.size(); q++) {
        var j = js.get(q)
        var loin = !zpDans(j.x, j.z, ZP.barreMarge)
        var cle = String(e.uuid) + '|' + String(j.uuid)
        try {
          if (loin) { e.stopSeenByPlayer(j); zpCaches[cle] = true }
          else if (zpCaches[cle]) { e.startSeenByPlayer(j); delete zpCaches[cle] }
        } catch (x) { if (!zpErr) { zpErr = true; console.error('[zone_pirates] barres : ' + x) } }
      }
    }
  } catch (err) { if (!zpErr) { zpErr = true; console.error('[zone_pirates] barres : ' + err) } }
})

// Dégâts x1,5 : tout coup dont l'auteur est un mob de la zone pirate (corps à corps, boules de feu, souffle... si l'auteur est renseigné)
try {
  NativeEvents.onEvent(
    Java.loadClass('net.neoforged.neoforge.event.entity.living.LivingIncomingDamageEvent'),
    function (ev) {
      try {
        var att = null
        try { att = ev.getSource().actual } catch (e0) {}
        if (!att || !att.tags || !att.tags.contains('pirate_zone')) return
        ev.setAmount(ev.getAmount() * ZP_DEGATS_MULT)
      } catch (e) {}
    }
  )
} catch (e) { console.error('[pirate_zones] dégâts x1,5 indisponibles : ' + e) }

// ───────── Aucun butin sur les 6 mobs ─────────
try {
  NativeEvents.onEvent(
    Java.loadClass('net.neoforged.neoforge.event.entity.living.LivingDropsEvent'),
    function (ev) { try { if (zpEst(ev.getEntity())) ev.setCanceled(true) } catch (e) {} }
  )
} catch (e) { console.error('[zone_pirates] suppression du butin indisponible : ' + e) }

// ───────── Aucun autre mob ne naît dans la zone (naturel, spawner, structure, chunk...) ─────────
// Seules les apparitions par commande (/summon du script) et par œuf restent possibles.
try {
  NativeEvents.onEvent(
    Java.loadClass('net.neoforged.neoforge.event.entity.living.FinalizeSpawnEvent'),
    function (ev) {
      try {
        var e = ev.getEntity()
        if (!zpDans(e.x, e.z, ZP.marge + 10) || e.y < ZP.y1 - 10 || e.y > ZP.y2 + 25) return
        var type = String(ev.getSpawnType())
        if (type === 'COMMAND' || type === 'SPAWN_EGG') return
        if (String(e.type).indexOf('easy_npc:') === 0) return
        ev.setSpawnCancelled(true)
      } catch (x) {}
    }
  )
  console.info('[zone_pirates] Aucun autre mob ne peut apparaître dans la zone.')
} catch (e) { console.error('[zone_pirates] blocage des apparitions indisponible : ' + e) }

// (nettoyage prolongé à 30 s : Scylla lâche son butin à la fin de son animation de mort)
// ───────── Mort d'un mob : le dernier lâche la jambe de bois ─────────
EntityEvents.death(function (event) {
  try {
    var e = event.entity
    if (!zpEst(e)) return
    var server = event.server
    var d = server.persistentData
    var reste = d.contains('pirates_vivants') ? d.getInt('pirates_vivants') - 1 : 0
    if (reste < 0) reste = 0
    d.putInt('pirates_vivants', reste)
    zpNettoyages.push({ x: Math.round(e.x), y: Math.round(e.y), z: Math.round(e.z), t: 120 })
    console.info('[zone_pirates] mort de ' + String(e.type) + ' : ' + reste + ' restant(s).')
    if (reste === 0) {
      d.putLong('pirates_respawn', Date.now() + ZP.respawnMin * 60 * 1000)
      server.runCommandSilent('execute in minecraft:overworld run summon item ' + e.x + ' ' + (e.y + 0.5) + ' ' + e.z +
        ' {Item:{id:"kubejs:jambe_de_bois",count:1},PickupDelay:20,Glowing:1b,Invulnerable:1b,Age:-32768s}')
      try { server.tell(Text.gold('[Sculk Castle] ').append(Text.gray('Le dernier gardien s\'effondre... quelque chose de bois roule sur le sol.'))) } catch (x) {}
      console.info('[zone_pirates] dernier mort : la jambe de bois est tombée.')
    }
  } catch (err) {
    console.error('[zone_pirates] mort : ' + err)
  }
})

// ───────── Quête : /pirate accepter|rendre <joueur> ─────────
function zpDire(joueur, texte) {
  joueur.tell(Text.gold('[' + ZP.quete.pnj + '] ').append(Text.of(texte).gray()))
}

function zpAccepter(joueur) {
  var q = ZP.quete, d = joueur.persistentData
  var etat = d.getInt(q.cle)
  if (etat === 0) { d.putInt(q.cle, 1); zpDire(joueur, q.accepter) }
  else if (etat === 1) zpDire(joueur, q.encours)
  else zpDire(joueur, q.fini)
  return 1
}

function zpRendre(server, joueur) {
  var q = ZP.quete, d = joueur.persistentData
  var etat = d.getInt(q.cle)
  if (etat === 0) zpDire(joueur, q.rien)
  else if (etat === 3) zpDire(joueur, q.fini)
  else if (joueur.inventory.count(q.objet) < 1) zpDire(joueur, q.sansObjet)
  else if (!d.contains('classe_rp_nom')) zpDire(joueur, q.sansClasse)
  else {
    server.runCommandSilent('clear ' + joueur.username + ' ' + q.objet + ' 1')
    d.putInt(q.cle, 3)
    server.runCommandSilent(q.commandeRecompense.replace('%joueur%', joueur.username))
    zpDire(joueur, q.recompense)
  }
  return 1
}

ServerEvents.commandRegistry(function (event) {
  var Commands = event.commands
  var Arguments = event.arguments
  var parPnj = function (source) {
    try { if (source.hasPermission(2)) return true } catch (e) {}
    try { var ent = source.entity; return !!ent && String(ent.type).indexOf('easy_npc:') === 0 } catch (e) { return false }
  }
  var estModo = function (source) { return source.hasPermission(2) }
  event.register(Commands.literal('pirate')
    .then(Commands.literal('accepter').requires(parPnj).then(Commands.argument('joueur', Arguments.PLAYER.create(event))
      .executes(function (ctx) { return zpAccepter(Arguments.PLAYER.getResult(ctx, 'joueur')) })))
    .then(Commands.literal('rendre').requires(parPnj).then(Commands.argument('joueur', Arguments.PLAYER.create(event))
      .executes(function (ctx) { return zpRendre(ctx.source.server, Arguments.PLAYER.getResult(ctx, 'joueur')) })))
    .then(Commands.literal('reset').requires(estModo).then(Commands.argument('joueur', Arguments.PLAYER.create(event))
      .executes(function (ctx) { Arguments.PLAYER.getResult(ctx, 'joueur').persistentData.putInt(ZP.quete.cle, 0); return 1 })))
    .then(Commands.literal('respawn').requires(estModo)
      .executes(function (ctx) {
        var server = ctx.source.server
        var niveau = zpNiveau(server)
        var liste = niveau ? zpMobs(niveau) : []
        for (var i = 0; i < liste.length; i++) liste[i].discard()
        server.persistentData.putLong('pirates_respawn', 0)
        zpSpawn(server)
        return 1
      })))
})

// /boss respawn pirate | /boss clear pirate (op) : même racine que les autres boss (Brigadier fusionne les deux enregistrements)
ServerEvents.commandRegistry(function (event) {
  var Commands = event.commands
  var estModo = function (source) { return source.hasPermission(2) }
  event.register(Commands.literal('boss')
    .then(Commands.literal('respawn').requires(estModo).then(Commands.literal('pirate')
      .executes(function (ctx) {
        var server = ctx.source.server
        var niveau = zpNiveau(server)
        var liste = niveau ? zpMobs(niveau) : []
        for (var i = 0; i < liste.length; i++) liste[i].discard()
        server.persistentData.putLong('pirates_respawn', 0)
        zpSpawn(server)
        return 1
      })))
    .then(Commands.literal('clear').requires(estModo).then(Commands.literal('pirate')
      .executes(function (ctx) {
        var server = ctx.source.server
        var niveau = zpNiveau(server)
        var liste = niveau ? zpMobs(niveau) : []
        for (var i = 0; i < liste.length; i++) liste[i].discard()
        server.persistentData.putInt('pirates_vivants', 0)
        server.persistentData.putLong('pirates_respawn', Date.now() + ZP.respawnMin * 60 * 1000)
        return 1
      }))))
})

console.info('[zone_pirates] Zone des anciens matelots chargée.')
