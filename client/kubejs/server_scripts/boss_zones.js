// Boss de zone (Block Factory's Bosses, etc.) : un seul exemplaire, retenu dans une zone, regen hors combat, respawn différé.
// Pour ajouter un boss : copie une entrée de BOSSES (nom unique). Chaque boss peut avoir une quête (champ "quete") liée à un PNJ.
//
// Règles communes :
//  - un seul exemplaire à la fois ; il n'apparaît que si un joueur est proche (chunks chargés) ;
//  - s'il sort de la zone : il perd sa cible et retourne au centre ; il oublie une cible qui quitte la zone ;
//  - sans cible depuis REGEN_DELAI_S secondes : il récupère REGEN_POURCENT % de sa vie max par seconde ;
//  - après sa mort : respawn au bout de respawnMin minutes (temps réel) ;
//  - quête : SEUL le joueur qui porte le coup fatal reçoit le crédit (et seulement s'il a accepté la quête).
var REGEN_DELAI_S = 5
var REGEN_POURCENT = 2
var DISTANCE_ACTIVE = 80   // le spawn n'est tenté que si un joueur est à moins de ... blocs du centre

var BOSSES = {
  helvar: {
    type: 'block_factorys_bosses:underworld_knight',
    x: -399, y: 68, z: 859,
    rayon: 30,
    respawnMin: 30,
    quete: {
      cle: 'helvar_quete',   // 0 = non commencée, 1 = acceptée, 2 = boss tué (rapport à faire), 3 = terminée
      pnj: 'Ser Aldric',
      accepter: "Tu es plus brave que je ne l'étais. Helvar se terre dans sa tanière de pierre, au cœur des bois. Venge-moi, voyageur... et que ma honte meure avec lui.",
      encours: "Helvar vit encore. Va, et ne reviens que lorsqu'il ne sera plus.",
      tue: "Tu as déjà abattu Helvar. Reviens me voir pour ta récompense.",
      fini: "Ma vengeance est accomplie. Je n'ai plus rien à te demander.",
      rien: "Tu ne m'as encore rien promis, voyageur.",
      vivant: "Helvar respire toujours. Je le sens. Va.",
      recompense: "Il est donc tombé... Merci. Prends ce savoir : c'est tout ce que ce vieux serment avait encore de précieux. Maintenant, je peux enfin me reposer.",
      annonceMort: 'Helvar est tombé sous ta lame. Un écu brisé gît dans ton sac : rapporte-le à Ser Aldric.',
      objet: 'kubejs:ecu_brise_helvar',   // preuve donnée au seul tueur, reprise par le PNJ au rapport
      sansObjet: "Où est l'écu brisé ? Sans lui, je ne puis croire que Helvar est tombé. Retrouve-le.",
      commandeRecompense: 'classe recompense_epique %joueur%'   // %joueur% = pseudo
    }
  },
  maledictus: {
    type: 'cataclysm:maledictus',
    x: 2684, y: 68, z: 1727,
    rayon: 30,
    respawnMin: 30,
    quete: {
      cle: 'maledictus_quete',
      pnj: 'Hiro',
      accepter: "Une île, loin à l'est, que les marins évitent. On dit qu'elle renferme la Malédiction elle-même, devenue chair. Quiconque ose l'affronter est maudit pour l'éternité... Mais quelqu'un doit mettre fin à ce murmure. Si tu l'oses, abats-le, et rapporte-moi le sceau qu'il laissera derrière lui.",
      encours: "La Malédiction respire encore, voyageur. Je la sens jusque dans mes os. Va, et reviens quand elle se taira.",
      tue: "Tu as déjà abattu la créature. Reviens me voir avec le sceau, que je puisse enfin respirer.",
      fini: "La légende est close. Que ce qui doit être oublié le soit.",
      rien: "Tu ne m'as encore rien promis, voyageur.",
      vivant: "Je sens toujours la Malédiction sur cette île. Elle vit. Va.",
      recompense: "Alors c'est vrai... Elle est tombée. Que les âmes de ceux qu'elle a pris trouvent le repos. Prends ce savoir : c'est le prix de ton courage.",
      annonceMort: "Maledictus s'effondre. Un sceau fendu gît dans ton sac : rapporte-le à Hiro.",
      objet: 'kubejs:sceau_maledictus',
      sansObjet: "Où est le sceau ? Sans lui, je ne puis croire que la Malédiction est tombée. Retrouve-le.",
      commandeRecompense: 'classe recompense_epique %joueur%'
    }
  },
  skor: {
    type: 'block_factorys_bosses:yeti',
    x: 919, y: 227, z: 706,
    rayon: 30,
    respawnMin: 30,
    quete: {
      cle: 'skor_quete',
      pnj: 'Pip',
      accepter: "Ma petite sœur Léna est malade, et le seul remède que connaisse l'herboriste demande une corne de Skor, le yéti des neiges. Je suis trop petit pour l'affronter... Toi, peut-être. Rapporte-moi sa corne, s'il te plaît !",
      encours: "Skor est toujours là-haut dans les neiges... Léna s'affaiblit chaque jour. Je t'en supplie, rapporte-moi sa corne.",
      tue: "Tu as vaincu Skor ? Alors reviens vite me donner sa corne !",
      fini: "Léna va mieux, grâce à toi. Je n'oublierai jamais ce que tu as fait.",
      rien: "Tu ne m'as encore rien promis. Tu veux bien m'aider ?",
      vivant: "Skor vit encore, je le sens à ton air. Va, s'il te plaît.",
      recompense: "La corne ! Tu l'as eue ! Avec ça, Léna sera guérie. Merci, merci ! Prends ce savoir : c'est tout ce que j'ai à t'offrir.",
      annonceMort: "Skor s'effondre. Une corne givrée gît dans ton sac : rapporte-la à Pip.",
      objet: 'kubejs:corne_de_skor',
      sansObjet: "Où est la corne ? Sans elle, je ne peux pas faire le remède. Retrouve-la !",
      commandeRecompense: 'classe recompense_epique %joueur%'
    }
  }
}

var bzCompteur = 0
var bzAbsent = {}
var AABB_BZ = null
try { AABB_BZ = Java.loadClass('net.minecraft.world.phys.AABB') } catch (e) { console.error('[boss_zones] AABB indisponible : ' + e) }

function bzNiveau(server) {
  try { return server.getLevel('minecraft:overworld') } catch (e) {}
  try { return server.overworld() } catch (e2) {}
  return null
}
function bzCle(nom) { return 'boss_respawn_' + nom }

function bzBoss(niveau, b, marge) {
  var res = []
  if (!AABB_BZ) return res
  var liste = niveau.getEntitiesWithin(new AABB_BZ(b.x - marge, b.y - 60, b.z - marge, b.x + marge, b.y + 60, b.z + marge))
  for (var i = 0; i < liste.size(); i++) {
    var e = liste.get(i)
    if (String(e.type) === b.type) res.push(e)
  }
  return res
}

function bzJoueurProche(server, b) {
  var joueurs = server.getPlayers()
  for (var i = 0; i < joueurs.size(); i++) {
    var j = joueurs.get(i)
    var dx = j.x - b.x
    var dz = j.z - b.z
    if (Math.sqrt(dx * dx + dz * dz) <= DISTANCE_ACTIVE) return true
  }
  return false
}

function bzRamener(server, e, b) {
  try { e.setTarget(null) } catch (x) { try { e.target = null } catch (y) {} }
  server.runCommandSilent('tp ' + e.uuid + ' ' + b.x + ' ' + b.y + ' ' + b.z)
}

function bzSpawn(server, nom, b) {
  server.runCommandSilent('execute in minecraft:overworld run summon ' + b.type + ' ' + b.x + ' ' + b.y + ' ' + b.z +
    ' {Tags:["boss_zone","boss_' + nom + '"],PersistenceRequired:1b}')
  console.info('[boss_zones] ' + nom + ' apparaît en ' + b.x + ' ' + b.y + ' ' + b.z)
}

// ───────────── Barres de vie : masquées pour les joueurs à plus de (rayon + 20) blocs du centre de la zone ─────────────
var BARRE_MARGE = 10
var bzCaches = {}   // "boss|joueur" -> true quand on a retiré le joueur de la barre
var bzErrBarre = false
console.info('[boss_zones] Masquage des barres de vie actif (marge ' + BARRE_MARGE + ' blocs au-delà du rayon).')

// Méthodes publiques des entités : stopSeenByPlayer retire le joueur de la barre de vie du boss, startSeenByPlayer le remet.
function bzGererBarres(server, e, b) {
  var joueurs = server.getPlayers()
  for (var i = 0; i < joueurs.size(); i++) {
    var j = joueurs.get(i)
    var dx = j.x - b.x
    var dz = j.z - b.z
    var loin = Math.sqrt(dx * dx + dz * dz) > b.rayon + BARRE_MARGE
    var cle = String(e.getStringUUID()) + '|' + String(j.getStringUUID())
    try {
      if (loin) {
        e.stopSeenByPlayer(j)
        if (!bzCaches[cle]) console.info('[boss_zones] barre retirée : ' + j.username + ' (' + Math.round(Math.sqrt(dx * dx + dz * dz)) + ' blocs) pour ' + String(e.getType()))
        bzCaches[cle] = true
      } else if (bzCaches[cle]) {
        e.startSeenByPlayer(j)
        delete bzCaches[cle]
      }
    } catch (x) {
      if (!bzErrBarre) { bzErrBarre = true; console.error('[boss_zones] barres : ' + x) }
    }
  }
}

ServerEvents.tick(function (event) {
  bzCompteur++
  if (bzCompteur % 5 !== 0) return
  try {
    var server = event.server
    var niveau = bzNiveau(server)
    if (!niveau || !AABB_BZ) return
    for (var nom in BOSSES) {
      var b = BOSSES[nom]
      // Zone, aggro et régénération
      var proches = bzBoss(niveau, b, b.rayon + 40)
      for (var i = 0; i < proches.length; i++) {
        var e = proches[i]
        var dx = e.x - b.x
        var dz = e.z - b.z
        var cible = null
        try { cible = e.getTarget() } catch (x) {}
        if (Math.sqrt(dx * dx + dz * dz) > b.rayon) {
          bzRamener(event.server, e, b)
          cible = null
        } else if (cible) {
          var tx = cible.x - b.x
          var tz = cible.z - b.z
          if (Math.sqrt(tx * tx + tz * tz) > b.rayon) {
            try { e.setTarget(null) } catch (x) {}
            cible = null
          }
        }
        if (bzCompteur % 10 === 0) { try { bzGererBarres(event.server, e, b) } catch (x) { console.error('[boss_zones] barres : ' + x) } }
        // sans cible depuis un moment : régénération progressive (toutes les secondes)
        var pd = e.persistentData
        if (cible) {
          pd.putInt('bz_sans_cible', 0)
        } else {
          var n = pd.getInt('bz_sans_cible') + 1
          pd.putInt('bz_sans_cible', n)
          if (n >= REGEN_DELAI_S * 4 && bzCompteur % 20 === 0) {
            try { e.heal(e.maxHealth * REGEN_POURCENT / 100) } catch (x) {}
          }
        }
      }
      // Spawn (toutes les 5 s)
      if (bzCompteur % 100 !== 0) continue
      if (!bzJoueurProche(server, b)) { bzAbsent[nom] = 0; continue }
      if (bzBoss(niveau, b, b.rayon + 40).length > 0) { bzAbsent[nom] = 0; continue }
      var d = server.persistentData
      var quand = d.contains(bzCle(nom)) ? d.getLong(bzCle(nom)) : 0
      if (Date.now() < quand) continue
      bzAbsent[nom] = (bzAbsent[nom] || 0) + 1
      if (bzAbsent[nom] < 2) continue // laisse aux entités le temps de se charger
      bzAbsent[nom] = 0
      bzSpawn(server, nom, b)
    }
  } catch (err) {
    console.error('[boss_zones] ' + err)
  }
})

// Mort d'un boss : timer de respawn + crédit de quête au SEUL joueur qui a porté le coup fatal
EntityEvents.death(function (event) {
  try {
    var type = String(event.entity.type)
    for (var nom in BOSSES) {
      var b = BOSSES[nom]
      if (b.type !== type) continue
      var dx = event.entity.x - b.x
      var dz = event.entity.z - b.z
      if (Math.sqrt(dx * dx + dz * dz) > b.rayon + 40) continue   // un autre exemplaire, hors zone : ignoré
      event.server.persistentData.putLong(bzCle(nom), Date.now() + b.respawnMin * 60 * 1000)
      if (!b.quete) continue
      var src = event.source
      var tueur = src ? src.actual : null
      if (!tueur || !tueur.isPlayer()) continue
      if (tueur.persistentData.getInt(b.quete.cle) === 1) {
        tueur.persistentData.putInt(b.quete.cle, 2)
        if (b.quete.objet) tueur.give(Item.of(b.quete.objet, 1))
        tueur.tell(Text.gold(b.quete.annonceMort))
      }
    }
  } catch (err) {
    console.error('[boss_zones] mort : ' + err)
  }
})

// ───────────── Quêtes de boss (dialogue du PNJ : /bossquete accepter|rendre <boss> <joueur>) ─────────────
function bqDire(joueur, q, texte) {
  joueur.tell(Text.gold('[' + q.pnj + '] ').append(Text.of(texte).gray()))
}

function bqAccepter(joueur, q) {
  var d = joueur.persistentData
  var etat = d.getInt(q.cle)
  if (etat === 0) { d.putInt(q.cle, 1); bqDire(joueur, q, q.accepter) }
  else if (etat === 1) bqDire(joueur, q, q.encours)
  else if (etat === 2) bqDire(joueur, q, q.tue)
  else bqDire(joueur, q, q.fini)
  return 1
}

function bqRendre(server, joueur, q) {
  var d = joueur.persistentData
  var etat = d.getInt(q.cle)
  if (etat === 0) bqDire(joueur, q, q.rien)
  else if (etat === 1) bqDire(joueur, q, q.vivant)
  else if (etat === 3) bqDire(joueur, q, q.fini)
  else if (q.objet && joueur.inventory.count(q.objet) < 1) bqDire(joueur, q, q.sansObjet)
  else {
    if (q.objet) server.runCommandSilent('clear ' + joueur.username + ' ' + q.objet + ' 1')
    d.putInt(q.cle, 3)
    server.runCommandSilent(q.commandeRecompense.replace('%joueur%', joueur.username))
    bqDire(joueur, q, q.recompense)
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
  var quete = function (nom) { var b = BOSSES[nom]; return b ? b.quete : null }

  var racine = Commands.literal('bossquete')
  var accepter = Commands.literal('accepter').requires(parPnj)
  var rendre = Commands.literal('rendre').requires(parPnj)
  var reset = Commands.literal('reset').requires(estModo)
  for (var nom in BOSSES) {
    if (!BOSSES[nom].quete) continue
    ;(function (n) {
      accepter = accepter.then(Commands.literal(n).then(Commands.argument('joueur', Arguments.PLAYER.create(event))
        .executes(function (ctx) { return bqAccepter(Arguments.PLAYER.getResult(ctx, 'joueur'), quete(n)) })))
      rendre = rendre.then(Commands.literal(n).then(Commands.argument('joueur', Arguments.PLAYER.create(event))
        .executes(function (ctx) { return bqRendre(ctx.source.server, Arguments.PLAYER.getResult(ctx, 'joueur'), quete(n)) })))
      reset = reset.then(Commands.literal(n).then(Commands.argument('joueur', Arguments.PLAYER.create(event))
        .executes(function (ctx) { Arguments.PLAYER.getResult(ctx, 'joueur').persistentData.putInt(quete(n).cle, 0); return 1 })))
    })(nom)
  }
  event.register(racine.then(accepter).then(rendre).then(reset))

  // /boss respawn <nom> : fait réapparaître le boss tout de suite (op) ; supprime l'exemplaire actuel.
  var respawn = Commands.literal('respawn').requires(estModo)
  for (var nom2 in BOSSES) {
    ;(function (n) {
      respawn = respawn.then(Commands.literal(n).executes(function (ctx) {
        var server = ctx.source.server
        var b = BOSSES[n]
        var niveau = bzNiveau(server)
        var liste = niveau ? bzBoss(niveau, b, b.rayon + 40) : []
        for (var i = 0; i < liste.length; i++) liste[i].discard()
        server.persistentData.putLong(bzCle(n), 0)
        bzSpawn(server, n, b)
        return 1
      }))
    })(nom2)
  }
  event.register(Commands.literal('boss').then(respawn))
})
