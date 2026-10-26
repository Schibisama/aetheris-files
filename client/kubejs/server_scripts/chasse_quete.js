// Quête de chasse de Ser Aldric (NPC Easy NPC). Le dialogue du NPC lance /chasse accepter et /chasse rendre.
// Règle : tuer CH_CIBLE monstres hostiles APRÈS avoir accepté la quête, puis revenir voir Ser Aldric.
// La récompense n'est donnée qu'une fois par joueur. /chasse reset <joueur> (op) permet de la refaire.
var CH_CIBLE = 20
var CH_RECOMPENSES = [['minecraft:emerald', 16], ['minecraft:experience_bottle', 8]] // [objet, quantité]
var CH_ETAT = 'chasse_etat'     // 0 = pas commencée, 1 = en cours, 2 = terminée
var CH_KILLS = 'chasse_kills'
var CH_NOM = 'Ser Aldric'

function chDire(joueur, texte) {
  joueur.tell(Text.gold('[' + CH_NOM + '] ').append(Text.of(texte).gray()))
}

function chAccepter(joueur) {
  var d = joueur.persistentData
  var etat = d.getInt(CH_ETAT)
  if (etat === 2) {
    chDire(joueur, "Tu as déjà rempli ta part, voyageur. Que la lumière, si elle existe encore, veille sur toi.")
  } else if (etat === 1) {
    chDire(joueur, "Ta chasse est déjà en cours : " + d.getInt(CH_KILLS) + "/" + CH_CIBLE + " créatures abattues. Ne t'arrête pas.")
  } else {
    d.putInt(CH_ETAT, 1)
    d.putInt(CH_KILLS, 0)
    chDire(joueur, "Alors c'est dit. Abats " + CH_CIBLE + " créatures de l'ombre et reviens me le dire. Je ne puis marcher à tes côtés... mais mon serment, lui, te suivra.")
  }
  return 1
}

function chRendre(joueur) {
  var d = joueur.persistentData
  var etat = d.getInt(CH_ETAT)
  var kills = d.getInt(CH_KILLS)
  if (etat === 0) {
    chDire(joueur, "Tu n'as encore rien promis, voyageur. Parle-moi d'abord de la chasse.")
  } else if (etat === 2) {
    chDire(joueur, "Ma dette envers toi est payée. Il ne me reste plus rien à offrir.")
  } else if (kills < CH_CIBLE) {
    chDire(joueur, "Pas encore. " + kills + "/" + CH_CIBLE + " créatures abattues. L'ombre est encore là.")
  } else {
    d.putInt(CH_ETAT, 2)
    for (var i = 0; i < CH_RECOMPENSES.length; i++) {
      joueur.give(Item.of(CH_RECOMPENSES[i][0], CH_RECOMPENSES[i][1]))
    }
    chDire(joueur, "Tu l'as fait. Prends ceci : c'est peu, mais c'est tout ce que l'oubli m'a laissé. Va, Marqué-de-grâce... non, voyageur. Va.")
  }
  return 1
}

function chInfo(joueur) {
  var d = joueur.persistentData
  var etat = d.getInt(CH_ETAT)
  if (etat === 1) joueur.tell(Text.gold('Quête de chasse : ' + d.getInt(CH_KILLS) + '/' + CH_CIBLE + ' créatures abattues.'))
  else if (etat === 2) joueur.tell(Text.gold('Quête de chasse : terminée.'))
  else joueur.tell(Text.gray('Quête de chasse : non commencée (parle à ' + CH_NOM + ').'))
  return 1
}

function chEstMonstre(e) {
  try { if (e.isMonster()) return true } catch (x) {}
  try { return String(e.getType().getCategory()).toLowerCase() === 'monster' } catch (x) {}
  return false
}

EntityEvents.death(function (event) {
  try {
    var src = event.source
    var tueur = src ? src.actual : null
    if (!tueur || !tueur.isPlayer()) return
    if (event.entity.isPlayer() || !chEstMonstre(event.entity)) return
    var d = tueur.persistentData
    if (d.getInt(CH_ETAT) !== 1) return
    var n = d.getInt(CH_KILLS) + 1
    d.putInt(CH_KILLS, n)
    if (n <= CH_CIBLE) tueur.setStatusMessage(Text.gold('Chasse : ' + n + '/' + CH_CIBLE))
    if (n === CH_CIBLE) chDire(tueur, "La chasse est accomplie. Reviens me voir.")
  } catch (e) {
    console.error('[chasse_quete] ' + e)
  }
})

ServerEvents.commandRegistry(function (event) {
  var Commands = event.commands
  var Arguments = event.arguments
  // op, ou commande lancée par un NPC Easy NPC (dialogue de Ser Aldric)
  var parPnj = function (source) {
    try { if (source.hasPermission(2)) return true } catch (e) {}
    try { var ent = source.entity; return !!ent && String(ent.type).indexOf('easy_npc:') === 0 } catch (e) { return false }
  }
  event.register(
    Commands.literal('chasse')
      .then(Commands.literal('info').executes(function (ctx) { return chInfo(ctx.source.player) }))
      .then(Commands.literal('accepter').requires(parPnj)
        .then(Commands.argument('joueur', Arguments.PLAYER.create(event))
          .executes(function (ctx) { return chAccepter(Arguments.PLAYER.getResult(ctx, 'joueur')) })))
      .then(Commands.literal('rendre').requires(parPnj)
        .then(Commands.argument('joueur', Arguments.PLAYER.create(event))
          .executes(function (ctx) { return chRendre(Arguments.PLAYER.getResult(ctx, 'joueur')) })))
      .then(Commands.literal('reset').requires(function (s) { return s.hasPermission(2) })
        .then(Commands.argument('joueur', Arguments.PLAYER.create(event))
          .executes(function (ctx) {
            var j = Arguments.PLAYER.getResult(ctx, 'joueur')
            j.persistentData.putInt(CH_ETAT, 0)
            j.persistentData.putInt(CH_KILLS, 0)
            return 1
          })))
  )
})
