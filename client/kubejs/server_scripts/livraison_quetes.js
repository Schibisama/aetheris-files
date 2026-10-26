// Quêtes de livraison : un PNJ demande N objets, le joueur les rapporte, le PNJ les reprend et donne une récompense.
// Une seule fois par joueur. Pour en ajouter : copie une entrée de LIVRAISONS (nom unique) et le dialogue du PNJ.
//
// Deux types de récompense :
//  - simple : champ "commandeRecompense" (une commande, %joueur% = pseudo) ;
//  - à choix : champ "choix" { option: { texte, commandes: [...] } } ; le PNJ pose une question après la remise des objets.
//
// Commandes (lancées par les boutons du PNJ) :
//   /livraison accepter <quête> <joueur>        /livraison rendre <quête> <joueur>
//   /livraison choix <quête> <option> <joueur>  /livraison reset <quête> <joueur>  (op)
var LIVRAISONS = {
  maelys_porc: {
    cle: 'maelys_porc_quete',   // finit par _quete : effacée par /reinit. 0 = rien, 1 = acceptée, 2 = objets remis (choix en attente), 3 = terminée
    pnj: 'Maelys',
    objet: 'minecraft:porkchop',   // côtelette de porc CRUE
    nombre: 30,
    accepter: "Trente côtelettes de porc crues, voilà ce qu'il me faut pour la grande marmite. Rapporte-les-moi et je te revaudrai ça : j'ai appris deux ou trois choses de mes clients magiciens.",
    encours: "Alors, ces trente côtelettes ? Crues, hein. Je ne fais pas de miracles avec du cuit.",
    manque: "Il m'en faut trente, voyageur, pas une de moins. Reviens quand ton sac sera plein.",
    sansClasse: "Tu n'as pas encore de voie arcanique, voyageur... Va voir qui de droit, puis reviens me trouver.",
    rien: "Tu ne m'as encore rien promis, voyageur.",
    remis: "Parfait, trente côtelettes bien fraîches ! Maintenant, dis-moi : comment dois-je te payer ?",
    choisir: "Nous avons déjà conclu l'affaire des côtelettes. Il ne reste qu'à savoir si tu es végan ou non.",
    fini: "Ma marmite est pleine, merci encore. Sers-toi à boire, c'est la maison qui offre.",
    choix: {
      vegan: {
        texte: "Végan ? Ah, un adepte des champs ! Voici un savoir arcanique pour ta voie, et un sac de graines : plante-les, ça te changera des côtelettes.",
        commandes: ['classe recompense %joueur%', 'give %joueur% minecraft:wheat_seeds 64']
      },
      normal: {
        texte: "À la bonne heure ! Voici un savoir arcanique pour ta voie, et trente-deux durums tout chauds, sortis de ma cuisine. Bon appétit, voyageur.",
        commandes: ['classe recompense %joueur%', 'give %joueur% farmersdelight:mutton_wrap 32']
      }
    }
  },
  sylvaine_roses: {
    cle: 'sylvaine_roses_quete',
    pnj: 'Sylvaine',
    objet: 'minecraft:rose_bush',   // rosier (« rose » dans le jeu de base)
    nombre: 16,
    accepter: "Un client m'a commandé un bouquet, et mes rosiers ont tous gelé. Rapporte-m'en seize, bien rouges, et je te remercierai d'un petit savoir que les herbes m'ont soufflé.",
    encours: "Mes seize roses ? Le client s'impatiente, et les épines ne se cueillent pas toutes seules.",
    manque: "Il m'en faut seize, voyageur. Un bouquet ne se fait pas avec trois brins.",
    sansClasse: "Tu n'as pas encore de voie arcanique, voyageur... Les herbes ne parlent pas à ceux qui n'ont pas de voix. Reviens après.",
    rien: "Tu ne m'as encore rien promis, voyageur.",
    fini: "Le bouquet est parti, et le client est ravi. Merci encore, tu as le cœur sur la main... et les mains pleines d'épines.",
    recompense: "Voilà de quoi faire un magnifique bouquet ! Prends ceci : un savoir de ta voie, cueilli à bonne heure. Il te servira.",
    commandeRecompense: 'classe recompense_peu_commun %joueur%'
  }
}

function lvDire(joueur, q, texte) {
  joueur.tell(Text.gold('[' + q.pnj + '] ').append(Text.of(texte).gray()))
}

function lvExec(server, joueur, commande) {
  server.runCommandSilent(commande.replace('%joueur%', joueur.username))
}

function lvAccepter(joueur, q) {
  var d = joueur.persistentData
  var etat = d.getInt(q.cle)
  if (etat === 0) { d.putInt(q.cle, 1); lvDire(joueur, q, q.accepter) }
  else if (etat === 1) lvDire(joueur, q, q.encours)
  else if (etat === 2) lvDire(joueur, q, q.choisir)
  else lvDire(joueur, q, q.fini)
  return 1
}

function lvRendre(server, joueur, q) {
  var d = joueur.persistentData
  var etat = d.getInt(q.cle)
  if (etat === 3) lvDire(joueur, q, q.fini)
  else if (etat === 2) lvDire(joueur, q, q.choisir)
  else if (etat === 0) lvDire(joueur, q, q.rien)
  else if (joueur.inventory.count(q.objet) < q.nombre) lvDire(joueur, q, q.manque)
  else if (!d.contains('classe_rp_nom')) lvDire(joueur, q, q.sansClasse)   // pas de classe = pas de sort possible : on ne reprend rien
  else {
    lvExec(server, joueur, 'clear %joueur% ' + q.objet + ' ' + q.nombre)
    if (q.choix) {
      d.putInt(q.cle, 2)
      lvDire(joueur, q, q.remis)
    } else {
      d.putInt(q.cle, 3)
      lvExec(server, joueur, q.commandeRecompense)
      lvDire(joueur, q, q.recompense)
    }
  }
  return 1
}

function lvChoisir(server, joueur, q, option) {
  var d = joueur.persistentData
  var etat = d.getInt(q.cle)
  var c = q.choix ? q.choix[option] : null
  if (!c) return 0
  if (etat === 3) lvDire(joueur, q, q.fini)
  else if (etat === 0) lvDire(joueur, q, q.rien)
  else if (etat === 1) lvDire(joueur, q, q.manque)   // les objets n'ont pas encore été remis
  else {
    d.putInt(q.cle, 3)
    for (var i = 0; i < c.commandes.length; i++) lvExec(server, joueur, c.commandes[i])
    lvDire(joueur, q, c.texte)
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
  var choix = Commands.literal('choix').requires(parPnj)
  var reset = Commands.literal('reset').requires(estModo)
  for (var nom in LIVRAISONS) {
    ;(function (n) {
      var q = LIVRAISONS[n]
      accepter = accepter.then(Commands.literal(n).then(Commands.argument('joueur', Arguments.PLAYER.create(event))
        .executes(function (ctx) { return lvAccepter(Arguments.PLAYER.getResult(ctx, 'joueur'), q) })))
      rendre = rendre.then(Commands.literal(n).then(Commands.argument('joueur', Arguments.PLAYER.create(event))
        .executes(function (ctx) { return lvRendre(ctx.source.server, Arguments.PLAYER.getResult(ctx, 'joueur'), q) })))
      reset = reset.then(Commands.literal(n).then(Commands.argument('joueur', Arguments.PLAYER.create(event))
        .executes(function (ctx) { Arguments.PLAYER.getResult(ctx, 'joueur').persistentData.putInt(q.cle, 0); return 1 })))
      if (q.choix) {
        var noeud = Commands.literal(n)
        for (var opt in q.choix) {
          ;(function (o) {
            noeud = noeud.then(Commands.literal(o).then(Commands.argument('joueur', Arguments.PLAYER.create(event))
              .executes(function (ctx) { return lvChoisir(ctx.source.server, Arguments.PLAYER.getResult(ctx, 'joueur'), q, o) })))
          })(opt)
        }
        choix = choix.then(noeud)
      }
    })(nom)
  }
  event.register(Commands.literal('livraison').then(accepter).then(rendre).then(choix).then(reset))
})
