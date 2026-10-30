// /starter <joueur> (op uniquement, une seule fois par joueur) : kit de départ.
//   - une classe aléatoire (si le joueur n'en a pas déjà une) ;
//   - le set Wizard complet (casque, robe, jambières, bottes), teint d'une couleur aléatoire ;
//   - un grimoire de base à 5 emplacements (Flimsy Journal, vide) ;
//   - un balai volant (Broom of Floatmount) ;
//   et rien d'autre.
// Clé « starter_pris_quete » : effacée par /reinit (le joueur peut alors redemander son kit).
// Dépend de classes_rp.js (classeDe, tirer, appliquerClasse, annoncer, CLE, CLE_TEST).
// Rechargement : /reload

var STARTER_CLE = 'starter_pris_quete'
var STARTER_COULEURS = [
  0xB22222, 0xE67E22, 0xF1C40F, 0x2ECC71, 0x1ABC9C, 0x3498DB,
  0x2C3E9E, 0x8E44AD, 0xE91E8C, 0x5D4037, 0x9AA5AB, 0x1C1C24
]

// Affiche aux AUTRES joueurs : CLASSE en grand, « X est devenu Classe » en petit (starter uniquement, pas les reroll).
function starterAnnonceAutres(server, joueur, classe) {
  var n = joueur.username
  var cible = '@a[name=!' + n + ']'
  var cle = cleClasse(classe.nom)
  cmd(server, 'title ' + cible + ' times 20 80 20')
  cmd(server, 'title ' + cible + ' subtitle {"translate":"mcrp.sous_titre.devenu","color":"gray","with":[{"selector":"' + n + '"},{"translate":"' + cle + '","color":"yellow"}]}')
  cmd(server, 'title ' + cible + ' title {"translate":"' + cle + '","color":"gold","bold":true}')
}

function starterDonner(ctx, joueur) {
  var server = ctx.source.server
  var n = joueur.username
  var op = ctx.source.player
  if (joueur.persistentData.getBoolean(STARTER_CLE)) {
    if (op) op.tell(Text.red(n + ' a déjà reçu son kit de départ (/reinit pour le lui redonner).'))
    return 0
  }
  joueur.persistentData.putBoolean(STARTER_CLE, true)

  // 1. Classe aléatoire (sauf si le joueur en a déjà une)
  try {
    if (!classeDe(joueur)) {
      var nouvelle = tirer(null)
      joueur.persistentData.putString(CLE, nouvelle.nom)
      joueur.persistentData.putBoolean(CLE_TEST, false)
      appliquerClasse(server, joueur, nouvelle, true)
      annoncer(server, joueur, nouvelle, "Les arcanes t'ont choisi.")
      starterAnnonceAutres(server, joueur, nouvelle)
    }
  } catch (e) { console.error('[starter] classe : ' + e) }

  // 2. Set Wizard teint
  var rgb = STARTER_COULEURS[Math.floor(Math.random() * STARTER_COULEURS.length)]
  var pieces = ['helmet', 'chestplate', 'leggings', 'boots']
  for (var i = 0; i < pieces.length; i++) {
    server.runCommandSilent('give ' + n + ' irons_spellbooks:wizard_' + pieces[i] + '[minecraft:dyed_color={rgb:' + rgb + '}]')
  }

  // 3. Grimoire de base (5 emplacements) et 4. balai volant
  server.runCommandSilent('give ' + n + ' irons_spellbooks:copper_spell_book')
  server.runCommandSilent('give ' + n + ' apprenticecodex:floatmount_broom')

  if (op) op.tell(Text.gray('Kit de départ donné à ' + n + '.'))
  joueur.tell(Text.gold('Kit de départ reçu : set de Wizard, grimoire et balai volant. Bonne rentrée à l\'Académie !'))
  return 1
}

ServerEvents.commandRegistry(function (event) {
  var Commands = event.commands
  var Arguments = event.arguments
  event.register(Commands.literal('starter')
    .requires(function (source) { return source.hasPermission(2) })
    .then(Commands.argument('joueur', Arguments.PLAYER.create(event))
      .executes(function (ctx) {
        try { return starterDonner(ctx, Arguments.PLAYER.getResult(ctx, 'joueur')) } catch (e) { console.error('[starter] ' + e); return 0 }
      })))
})
