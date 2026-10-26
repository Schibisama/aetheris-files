// Petite quête de Hiro (PNJ Easy NPC) : tuer 20 squelettes pour 16 encres à sort communes.
// Le dialogue du PNJ lance /squelettes accepter | rendre. /squelettes reset <joueur> (op) permet de la refaire.
// Rechargement : /reload
var SQ_CIBLE = 20
var SQ_RECOMPENSE = ['irons_spellbooks:common_ink', 16]
var SQ_ETAT = 'chasse_hiro_etat'     // 0 = pas commencée, 1 = en cours, 2 = terminée
var SQ_KILLS = 'chasse_hiro_kills'
var SQ_NOM = 'Hiro'
var SQ_TYPES = ['minecraft:skeleton', 'minecraft:stray', 'minecraft:bogged', 'minecraft:wither_skeleton']

function sqDire(joueur, texte) {
  joueur.tell(Text.gold('[' + SQ_NOM + '] ').append(Text.of(texte).gray()))
}

function sqAccepter(joueur) {
  var d = joueur.persistentData
  var etat = d.getInt(SQ_ETAT)
  if (etat === 2) sqDire(joueur, "Tu m'as déjà aidé, voyageur. Les os se tiennent tranquilles pour l'instant.")
  else if (etat === 1) sqDire(joueur, 'Ta tâche est en cours : ' + d.getInt(SQ_KILLS) + '/' + SQ_CIBLE + " squelettes apaisés. Continue.")
  else {
    d.putInt(SQ_ETAT, 1)
    d.putInt(SQ_KILLS, 0)
    sqDire(joueur, "Des os sans repos errent la nuit, et leurs âmes pleurent. Apaise-en " + SQ_CIBLE + ", et je te donnerai de l'encre pour tes sorts. Reviens me le dire.")
  }
  return 1
}

function sqRendre(joueur) {
  var d = joueur.persistentData
  var etat = d.getInt(SQ_ETAT)
  var kills = d.getInt(SQ_KILLS)
  if (etat === 0) sqDire(joueur, "Tu ne m'as encore rien promis, voyageur.")
  else if (etat === 2) sqDire(joueur, "Ma dette est payée. Ces os dorment, pour l'instant.")
  else if (kills < SQ_CIBLE) sqDire(joueur, 'Pas encore : ' + kills + '/' + SQ_CIBLE + ' squelettes apaisés. Il en reste.')
  else {
    d.putInt(SQ_ETAT, 2)
    joueur.give(Item.of(SQ_RECOMPENSE[0], SQ_RECOMPENSE[1]))
    sqDire(joueur, "Les âmes te remercient. Prends cette encre : elle servira à tes sorts.")
  }
  return 1
}

EntityEvents.death(function (event) {
  try {
    var src = event.source
    var tueur = src ? src.actual : null
    if (!tueur || !tueur.isPlayer()) return
    if (SQ_TYPES.indexOf(String(event.entity.type)) === -1) return
    var d = tueur.persistentData
    if (d.getInt(SQ_ETAT) !== 1) return
    var n = d.getInt(SQ_KILLS) + 1
    d.putInt(SQ_KILLS, n)
    if (n <= SQ_CIBLE) tueur.setStatusMessage(Text.gold('Squelettes : ' + n + '/' + SQ_CIBLE))
    if (n === SQ_CIBLE) sqDire(tueur, 'Ta tâche est accomplie. Reviens me voir.')
  } catch (e) {
    console.error('[chasse_squelettes] ' + e)
  }
})

ServerEvents.commandRegistry(function (event) {
  var Commands = event.commands
  var Arguments = event.arguments
  var parPnj = function (source) {
    try { if (source.hasPermission(2)) return true } catch (e) {}
    try { var ent = source.entity; return !!ent && String(ent.type).indexOf('easy_npc:') === 0 } catch (e) { return false }
  }
  event.register(
    Commands.literal('squelettes')
      .then(Commands.literal('accepter').requires(parPnj)
        .then(Commands.argument('joueur', Arguments.PLAYER.create(event))
          .executes(function (ctx) { return sqAccepter(Arguments.PLAYER.getResult(ctx, 'joueur')) })))
      .then(Commands.literal('rendre').requires(parPnj)
        .then(Commands.argument('joueur', Arguments.PLAYER.create(event))
          .executes(function (ctx) { return sqRendre(Arguments.PLAYER.getResult(ctx, 'joueur')) })))
      .then(Commands.literal('reset').requires(function (s) { return s.hasPermission(2) })
        .then(Commands.argument('joueur', Arguments.PLAYER.create(event))
          .executes(function (ctx) {
            var j = Arguments.PLAYER.getResult(ctx, 'joueur')
            j.persistentData.putInt(SQ_ETAT, 0)
            j.persistentData.putInt(SQ_KILLS, 0)
            return 1
          })))
  )
})
