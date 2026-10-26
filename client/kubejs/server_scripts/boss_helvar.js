// Helvar, le Chevalier des Profondeurs (Block Factory's Bosses) : un seul exemplaire, retenu dans une zone, respawn 30 min.
// + quête de vengeance de Ser Aldric (une seule fois par joueur) : tuer Helvar, récompense = sort ÉPIQUE de la classe.
var HV_TYPE = 'block_factorys_bosses:underworld_knight'
var HV_CX = -399
var HV_CY = 68
var HV_CZ = 859
var HV_RAYON = 20                    // rayon de la zone (blocs, en horizontal)
var HV_RESPAWN_MS = 30 * 60 * 1000   // respawn : 30 minutes après sa mort
var HV_DISTANCE_ACTIVE = 80          // le spawn n'est tenté que si un joueur est à moins de ... blocs (chunks chargés)
var HV_TAG = 'helvar_boss'
var HV_CLE_RESPAWN = 'helvar_respawn_at'

// ───────────── Helvar : spawn unique, zone, respawn ─────────────
var hvCompteur = 0
var hvAbsentDeSuite = 0
var AABB_HV = null
try { AABB_HV = Java.loadClass('net.minecraft.world.phys.AABB') } catch (e) { console.error('[boss_helvar] AABB indisponible : ' + e) }

function hvNiveau(server) {
  try { return server.getLevel('minecraft:overworld') } catch (e) {}
  try { return server.overworld() } catch (e2) {}
  return null
}

function hvChevaliers(niveau, marge) {
  var res = []
  if (!AABB_HV) return res
  var liste = niveau.getEntitiesWithin(new AABB_HV(HV_CX - marge, HV_CY - 60, HV_CZ - marge, HV_CX + marge, HV_CY + 60, HV_CZ + marge))
  for (var i = 0; i < liste.size(); i++) {
    var e = liste.get(i)
    if (String(e.type) === HV_TYPE) res.push(e)
  }
  return res
}

function hvJoueurProche(server, niveau) {
  var joueurs = server.getPlayers()
  for (var i = 0; i < joueurs.size(); i++) {
    var j = joueurs.get(i)
    var dx = j.x - HV_CX
    var dz = j.z - HV_CZ
    if (Math.sqrt(dx * dx + dz * dz) <= HV_DISTANCE_ACTIVE) return true
  }
  return false
}

function hvRamener(server, e) {
  try { e.setTarget(null) } catch (x) { try { e.target = null } catch (y) {} }
  server.runCommandSilent('tp ' + e.uuid + ' ' + HV_CX + ' ' + HV_CY + ' ' + HV_CZ)
}

function hvSpawn(server) {
  server.runCommandSilent('execute in minecraft:overworld run summon ' + HV_TYPE + ' ' + HV_CX + ' ' + HV_CY + ' ' + HV_CZ +
    ' {Tags:["' + HV_TAG + '"],PersistenceRequired:1b}')
  console.info('[boss_helvar] Helvar apparaît en ' + HV_CX + ' ' + HV_CY + ' ' + HV_CZ)
}

ServerEvents.tick(function (event) {
  hvCompteur++
  if (hvCompteur % 5 !== 0) return
  try {
    var server = event.server
    var niveau = hvNiveau(server)
    if (!niveau || !AABB_HV) return

    // Zone : hors du rayon -> il perd sa cible et revient au centre
    var proches = hvChevaliers(niveau, HV_RAYON + 40)
    for (var i = 0; i < proches.length; i++) {
      var e = proches[i]
      var dx = e.x - HV_CX
      var dz = e.z - HV_CZ
      if (Math.sqrt(dx * dx + dz * dz) > HV_RAYON) hvRamener(server, e)
      else {
        // sa cible a quitté la zone : il l'oublie
        try {
          var cible = e.getTarget()
          if (cible) {
            var tx = cible.x - HV_CX
            var tz = cible.z - HV_CZ
            if (Math.sqrt(tx * tx + tz * tz) > HV_RAYON) e.setTarget(null)
          }
        } catch (x) {}
      }
    }

    // Spawn : toutes les 5 s, seulement si les chunks sont chargés (un joueur est proche), qu'il n'y a pas de Helvar et que le délai est passé
    if (hvCompteur % 100 !== 0) return
    if (!hvJoueurProche(server, niveau)) { hvAbsentDeSuite = 0; return }
    if (hvChevaliers(niveau, 70).length > 0) { hvAbsentDeSuite = 0; return }
    var d = server.persistentData
    var quand = d.contains(HV_CLE_RESPAWN) ? d.getLong(HV_CLE_RESPAWN) : 0
    if (Date.now() < quand) return
    hvAbsentDeSuite++
    if (hvAbsentDeSuite < 2) return // laisse aux entités le temps de se charger
    hvAbsentDeSuite = 0
    hvSpawn(server)
  } catch (err) {
    console.error('[boss_helvar] ' + err)
  }
})

// Mort de Helvar : timer de respawn + crédit de la quête de vengeance
var HV_CLE_QUETE = 'helvar_quete'   // 0 = non commencée, 1 = acceptée, 2 = Helvar tué (rapport à faire), 3 = terminée

function hvDire(joueur, texte) {
  joueur.tell(Text.gold('[Ser Aldric] ').append(Text.of(texte).gray()))
}

EntityEvents.death(function (event) {
  try {
    if (String(event.entity.type) !== HV_TYPE) return
    var server = event.server
    server.persistentData.putLong(HV_CLE_RESPAWN, Date.now() + HV_RESPAWN_MS)
    var joueurs = server.getPlayers()
    for (var i = 0; i < joueurs.size(); i++) {
      var j = joueurs.get(i)
      var dx = j.x - event.entity.x
      var dz = j.z - event.entity.z
      if (Math.sqrt(dx * dx + dz * dz) > 60) continue
      if (j.persistentData.getInt(HV_CLE_QUETE) === 1) {
        j.persistentData.putInt(HV_CLE_QUETE, 2)
        j.tell(Text.gold('Helvar est tombé. Retourne voir Ser Aldric.'))
      }
    }
  } catch (err) {
    console.error('[boss_helvar] mort : ' + err)
  }
})

// ───────────── Quête de vengeance de Ser Aldric ─────────────
function hvAccepter(joueur) {
  var d = joueur.persistentData
  var etat = d.getInt(HV_CLE_QUETE)
  if (etat === 0) {
    d.putInt(HV_CLE_QUETE, 1)
    hvDire(joueur, "Tu es plus brave que je ne l'étais. Helvar se terre dans sa tanière de pierre, au cœur des bois. Venge-moi, voyageur... et que ma honte meure avec lui.")
  } else if (etat === 1) {
    hvDire(joueur, "Helvar vit encore. Va, et ne reviens que lorsqu'il ne sera plus.")
  } else if (etat === 2) {
    hvDire(joueur, "Tu as déjà abattu Helvar. Reviens me voir pour ta récompense.")
  } else {
    hvDire(joueur, "Ma vengeance est accomplie. Je n'ai plus rien à te demander.")
  }
  return 1
}

function hvRendre(server, joueur) {
  var d = joueur.persistentData
  var etat = d.getInt(HV_CLE_QUETE)
  if (etat === 0) {
    hvDire(joueur, "Tu ne m'as encore rien promis, voyageur.")
  } else if (etat === 1) {
    hvDire(joueur, "Helvar respire toujours. Je le sens. Va.")
  } else if (etat === 3) {
    hvDire(joueur, "Tu as déjà reçu mon legs. Que la paix t'accompagne.")
  } else {
    d.putInt(HV_CLE_QUETE, 3)
    server.runCommandSilent('classe recompense_epique ' + joueur.username)
    hvDire(joueur, "Il est donc tombé... Merci. Prends ce savoir : c'est tout ce que ce vieux serment avait encore de précieux. Maintenant, je peux enfin me reposer.")
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
  event.register(
    Commands.literal('vengeance')
      .then(Commands.literal('accepter').requires(parPnj)
        .then(Commands.argument('joueur', Arguments.PLAYER.create(event))
          .executes(function (ctx) { return hvAccepter(Arguments.PLAYER.getResult(ctx, 'joueur')) })))
      .then(Commands.literal('rendre').requires(parPnj)
        .then(Commands.argument('joueur', Arguments.PLAYER.create(event))
          .executes(function (ctx) { return hvRendre(ctx.source.server, Arguments.PLAYER.getResult(ctx, 'joueur')) })))
      .then(Commands.literal('reset').requires(estModo)
        .then(Commands.argument('joueur', Arguments.PLAYER.create(event))
          .executes(function (ctx) { Arguments.PLAYER.getResult(ctx, 'joueur').persistentData.putInt(HV_CLE_QUETE, 0); return 1 })))
  )
  // /helvar respawn : fait réapparaître Helvar tout de suite (op). Supprime l'actuel s'il existe.
  event.register(
    Commands.literal('helvar')
      .then(Commands.literal('respawn').requires(estModo)
        .executes(function (ctx) {
          var server = ctx.source.server
          var niveau = hvNiveau(server)
          var liste = niveau ? hvChevaliers(niveau, 70) : []
          for (var i = 0; i < liste.length; i++) liste[i].discard()
          server.persistentData.putLong(HV_CLE_RESPAWN, 0)
          hvSpawn(server)
          return 1
        }))
  )
})
