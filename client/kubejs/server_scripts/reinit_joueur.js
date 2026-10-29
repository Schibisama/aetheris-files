// /reinit <joueur> (op) : remise à zéro COMPLÈTE d'un joueur, comme s'il venait d'arriver.
// Efface : inventaire, armure, main secondaire, curios, coffre de l'Ender, XP, effets, succès, recettes débloquées,
// progression des quêtes FTB, classe + compteur de changements, sorts découverts, quêtes de chasse, de boss et de livraison,
// lieux découverts, pseudo, waystones découvertes.
// Après le reset, le joueur n'a plus de classe : utilise /classe donner <joueur> pour en tirer une.
// Ne touche pas : position, point de réapparition, gamemode, statistiques, cadavres (mod Corpse).
//
// /reinit tous            : affiche un avertissement, ne fait RIEN.
// /reinit tous confirmer  : remet à zéro TOUS les joueurs connectés, et chaque joueur hors ligne au moment de sa
//                           prochaine connexion (compteur « reinit_generation » du serveur). IRRÉVERSIBLE.

function rzCmd(server, texte) {
  try { server.runCommandSilent(texte) } catch (e) { console.error('[reinit] ' + texte + ' -> ' + e) }
}

function rzCleAEffacer(cle) {
  return /^(classe_|chasse_|cours_|pseudo|lieu_|bz_)/.test(cle) || /_quete$/.test(cle)
}

function rzReinit(server, joueur) {
  var n = joueur.username
  rzCmd(server, 'clear ' + n)
  rzCmd(server, 'curios clear ' + n)
  try { joueur.enderChestInventory.clearContent() } catch (e) { console.error('[reinit] coffre ender : ' + e) }
  rzCmd(server, 'xp set ' + n + ' 0 levels')
  rzCmd(server, 'xp set ' + n + ' 0 points')
  rzCmd(server, 'effect clear ' + n)
  rzCmd(server, 'advancement revoke ' + n + ' everything')
  rzCmd(server, 'ftbquests change_progress ' + n + ' reset file')
  rzCmd(server, 'specs_codex spell lock_all ' + n)
  rzCmd(server, 'specs_codex school lock_all ' + n)
  rzCmd(server, 'recipe take ' + n + ' *')
  rzCmd(server, 'waystones forget ' + n + ' all')
  rzCmd(server, 'pseudo joueur ' + n + ' reset')

  // Données persistantes du joueur : classe, compteur, chasse, quêtes de boss (toute clé finissant par _quete)
  var d = joueur.persistentData
  var aEffacer = []
  try {
    var it = d.getAllKeys().iterator()
    while (it.hasNext()) {
      var k = String(it.next())
      if (rzCleAEffacer(k)) aEffacer.push(k)
    }
  } catch (e2) { console.error('[reinit] lecture des données : ' + e2) }
  for (var i = 0; i < aEffacer.length; i++) d.remove(aEffacer[i])
  try { joueur.removeTag('classe_reset') } catch (e3) {}

  rzCmd(server, 'effect give ' + n + ' minecraft:instant_health 1 10 true')
  rzCmd(server, 'effect give ' + n + ' minecraft:saturation 1 20 true')
  joueur.tell(Text.gold('Ton profil a été remis à zéro. Plus de classe, plus de quêtes, inventaire vide.'))
  return aEffacer.length
}

var RZ_GEN = 'reinit_generation'

function rzTous(server) {
  var g = server.persistentData.getInt(RZ_GEN) + 1
  server.persistentData.putInt(RZ_GEN, g)
  var liste = server.players
  var nb = 0
  for (var i = 0; i < liste.length; i++) {
    rzReinit(server, liste[i])
    liste[i].persistentData.putInt(RZ_GEN, g)
    nb++
  }
  return nb
}

// Joueurs hors ligne lors d'un « /reinit tous confirmer » : remis à zéro à leur prochaine connexion.
PlayerEvents.loggedIn(function (event) {
  try {
    var joueur = event.player
    var server = event.server
    var g = server.persistentData.getInt(RZ_GEN)
    if (joueur.persistentData.getInt(RZ_GEN) < g) {
      rzReinit(server, joueur)
      joueur.persistentData.putInt(RZ_GEN, g)
    }
  } catch (e) { console.error('[reinit] connexion : ' + e) }
})

ServerEvents.commandRegistry(function (event) {
  var Commands = event.commands
  var Arguments = event.arguments
  event.register(Commands.literal('reinit')
    .requires(function (source) { return source.hasPermission(2) })
    .then(Commands.argument('joueur', Arguments.PLAYER.create(event))
      .executes(function (ctx) {
        var cible = Arguments.PLAYER.getResult(ctx, 'joueur')
        var nb = rzReinit(ctx.source.server, cible)
        var emetteur = ctx.source.player
        if (emetteur) emetteur.tell(Text.gray(cible.username + ' remis à zéro (' + nb + ' données effacées). /classe donner ' + cible.username + ' pour un nouveau tirage.'))
        return 1
      }))
    .then(Commands.literal('tous')
      .executes(function (ctx) {
        var emetteur = ctx.source.player
        if (emetteur) {
          emetteur.tell(Text.red('ATTENTION : cette commande remet à zéro TOUS les joueurs (connectés maintenant, et chaque autre à sa prochaine connexion).'))
          emetteur.tell(Text.red('Inventaire, classe, quêtes, sorts, succès, waystones : tout est effacé, sans retour possible.'))
          emetteur.tell(Text.yellow('Pour confirmer : /reinit tous confirmer'))
        }
        return 1
      })
      .then(Commands.literal('confirmer')
        .executes(function (ctx) {
          var nb = rzTous(ctx.source.server)
          var emetteur = ctx.source.player
          if (emetteur) emetteur.tell(Text.gold('Remise à zéro générale : ' + nb + ' joueur(s) connecté(s) remis à zéro, les autres le seront à leur connexion.'))
          return 1
        }))))
})
