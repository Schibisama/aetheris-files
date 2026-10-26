// Quêtes de livraison : un PNJ demande N objets, le joueur les rapporte, le PNJ les reprend et donne une récompense.
// Une seule fois par joueur. Pour en ajouter : copie une entrée de LIVRAISONS (nom unique) et le dialogue du PNJ.
// Commandes (lancées par le dialogue du PNJ) : /livraison accepter|rendre <quête> <joueur> ; /livraison reset <quête> <joueur> (op)
var LIVRAISONS = {
  maelys_porc: {
    cle: 'maelys_porc_quete',   // finit par _quete : effacée par /reinit. 0 = rien, 1 = acceptée, 3 = terminée
    pnj: 'Maelys',
    objet: 'minecraft:porkchop',   // côtelette de porc CRUE
    nombre: 30,
    accepter: "Trente côtelettes de porc crues, voilà ce qu'il me faut pour la grande marmite. Rapporte-les-moi et je te revaudrai ça : j'ai appris deux ou trois choses de mes clients magiciens.",
    encours: "Alors, ces trente côtelettes ? Crues, hein. Je ne fais pas de miracles avec du cuit.",
    manque: "Il m'en faut trente, voyageur, pas une de moins. Reviens quand ton sac sera plein.",
    sansClasse: "Tu n'as pas encore de voie arcanique, voyageur... Va voir qui de droit, puis reviens me trouver.",
    rien: "Tu ne m'as encore rien promis, voyageur.",
    recompense: "Voilà de quoi remplir ma marmite jusqu'à la fin du mois ! Tiens, un petit savoir qu'un client m'a laissé en paiement. Il te servira plus qu'à moi.",
    fini: "Ma marmite est pleine, merci encore. Sers-toi à boire, c'est la maison qui offre.",
    commandeRecompense: 'classe recompense_peu_commun %joueur%'
  }
}

function lvDire(joueur, q, texte) {
  joueur.tell(Text.gold('[' + q.pnj + '] ').append(Text.of(texte).gray()))
}

function lvAccepter(joueur, q) {
  var d = joueur.persistentData
  var etat = d.getInt(q.cle)
  if (etat === 0) { d.putInt(q.cle, 1); lvDire(joueur, q, q.accepter) }
  else if (etat === 1) lvDire(joueur, q, q.encours)
  else lvDire(joueur, q, q.fini)
  return 1
}

function lvRendre(server, joueur, q) {
  var d = joueur.persistentData
  var etat = d.getInt(q.cle)
  if (etat === 0) lvDire(joueur, q, q.rien)
  else if (etat === 3) lvDire(joueur, q, q.fini)
  else if (joueur.inventory.count(q.objet) < q.nombre) lvDire(joueur, q, q.manque)
  else if (!d.contains('classe_rp_nom')) lvDire(joueur, q, q.sansClasse)   // pas de classe = pas de sort possible : on ne reprend rien
  else {
    server.runCommandSilent('clear ' + joueur.username + ' ' + q.objet + ' ' + q.nombre)
    d.putInt(q.cle, 3)
    server.runCommandSilent(q.commandeRecompense.replace('%joueur%', joueur.username))
    lvDire(joueur, q, q.recompense)
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
  var accepter = Commands.literal('accepter').requires(parPnj)
  var rendre = Commands.literal('rendre').requires(parPnj)
  var reset = Commands.literal('reset').requires(estModo)
  for (var nom in LIVRAISONS) {
    ;(function (n) {
      accepter = accepter.then(Commands.literal(n).then(Commands.argument('joueur', Arguments.PLAYER.create(event))
        .executes(function (ctx) { return lvAccepter(Arguments.PLAYER.getResult(ctx, 'joueur'), LIVRAISONS[n]) })))
      rendre = rendre.then(Commands.literal(n).then(Commands.argument('joueur', Arguments.PLAYER.create(event))
        .executes(function (ctx) { return lvRendre(ctx.source.server, Arguments.PLAYER.getResult(ctx, 'joueur'), LIVRAISONS[n]) })))
      reset = reset.then(Commands.literal(n).then(Commands.argument('joueur', Arguments.PLAYER.create(event))
        .executes(function (ctx) { Arguments.PLAYER.getResult(ctx, 'joueur').persistentData.putInt(LIVRAISONS[n].cle, 0); return 1 })))
    })(nom)
  }
  event.register(Commands.literal('livraison').then(accepter).then(rendre).then(reset))
})
