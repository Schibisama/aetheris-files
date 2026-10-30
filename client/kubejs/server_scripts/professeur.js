// /professeur : gère le rôle « professeur » (tag « professeur », déjà utilisé par aura_professeurs.js pour l'Aura de professeur).
//   /professeur donner <joueur>   : donne le rôle (opérateurs uniquement)
//   /professeur retirer <joueur>  : retire le rôle
//   /professeur liste             : liste les professeurs connectés
// Un professeur peut utiliser /cours (+ ici, ordre) et /starter sans être opérateur.
// Pour ouvrir une autre commande aux professeurs : remplacer son « requires » par  profOuOp  (voir /cours dans classes_rp.js).
// Rechargement : /reload

var PROF_TAG = 'professeur'

// Vrai si la source de la commande est un opérateur ou un joueur ayant le tag professeur.
function profOuOp(source) {
  try { if (source.hasPermission(2)) return true } catch (e0) {}
  try {
    var j = source.player
    if (j && j.getTags().contains(PROF_TAG)) return true
  } catch (e1) {}
  return false
}

ServerEvents.commandRegistry(function (event) {
  var Commands = event.commands
  var Arguments = event.arguments
  var estOp = function (s) { return s.hasPermission(2) }

  function dire(ctx, texte) {
    try { if (ctx.source.player) ctx.source.player.tell(Text.gray(texte)) } catch (e) {}
    console.info('[professeur] ' + texte)
  }

  function basculer(ctx, ajouter) {
    try {
      var cible = Arguments.PLAYER.getResult(ctx, 'joueur')
      var nom = String(cible.username)
      var deja = cible.getTags().contains(PROF_TAG)
      if (ajouter) {
        if (deja) { dire(ctx, nom + ' est déjà professeur.'); return 0 }
        cible.server.runCommandSilent('tag ' + nom + ' add ' + PROF_TAG)
        cible.tell(Text.gold('Tu es désormais professeur à l\'Académie : /cours et /starter te sont ouverts.'))
        dire(ctx, nom + ' est maintenant professeur.')
      } else {
        if (!deja) { dire(ctx, nom + ' n\'est pas professeur.'); return 0 }
        cible.server.runCommandSilent('tag ' + nom + ' remove ' + PROF_TAG)
        cible.tell(Text.gray('Tu n\'es plus professeur.'))
        dire(ctx, nom + ' n\'est plus professeur.')
      }
      // renvoie l'arbre des commandes au joueur, pour que /cours et /starter apparaissent (ou disparaissent) tout de suite
      try { cible.server.getCommands().sendCommands(cible) } catch (e2) {}
      return 1
    } catch (e) {
      console.error('[professeur] ' + e)
      dire(ctx, 'Erreur (voir les logs).')
      return 0
    }
  }

  event.register(
    Commands.literal('professeur')
      .requires(estOp)
      .then(Commands.literal('donner')
        .then(Commands.argument('joueur', Arguments.PLAYER.create(event))
          .executes(function (ctx) { return basculer(ctx, true) })))
      .then(Commands.literal('retirer')
        .then(Commands.argument('joueur', Arguments.PLAYER.create(event))
          .executes(function (ctx) { return basculer(ctx, false) })))
      .then(Commands.literal('liste')
        .executes(function (ctx) {
          var noms = []
          ctx.source.server.players.forEach(function (p) {
            if (p.getTags().contains(PROF_TAG)) noms.push(String(p.username))
          })
          dire(ctx, noms.length ? 'Professeurs connectés : ' + noms.join(', ') : 'Aucun professeur connecté.')
          return 1
        }))
  )
})

console.info('[professeur] /professeur donner|retirer|liste chargé (op).')
