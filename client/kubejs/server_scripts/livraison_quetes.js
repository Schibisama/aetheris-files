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
    objet: 'biomesoplenty:rose',   // rose de Biomes O' Plenty
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

// Quête simple « apporte N objets contre un sort de ta classe » : textes par défaut, remplaçables champ par champ.
//   o = { cle, pnj, objet, nombre, nom (ex. "lingots d'or"), accepter, recompense, rarete: 'peu_commun' | 'rare' | 'epique', ... }
function lvSimple(o) {
  var cmdRecompense = { peu_commun: 'classe recompense_peu_commun %joueur%', rare: 'classe recompense %joueur%', epique: 'classe recompense_epique %joueur%' }
  var q = {
    cle: o.cle, pnj: o.pnj, objet: o.objet, nombre: o.nombre,
    accepter: o.accepter,
    encours: o.encours || "Alors, ces " + o.nombre + " " + o.nom + " ? Je t'attends.",
    manque: o.manque || "Il m'en faut " + o.nombre + " (" + o.nom + "), pas un de moins. Reviens quand ton sac sera plein.",
    sansClasse: o.sansClasse || "Tu n'as pas encore de voie arcanique, voyageur... Va voir qui de droit, puis reviens me trouver.",
    rien: o.rien || "Tu ne m'as encore rien promis, voyageur.",
    fini: o.fini || "Notre marché est conclu, voyageur. Merci encore.",
    recompense: o.recompense,
    commandeRecompense: cmdRecompense[o.rarete]
  }
  return q
}

LIVRAISONS.kael_or = lvSimple({
  cle: 'kael_or_quete', pnj: 'Kael', objet: 'minecraft:gold_ingot', nombre: 32, nom: "lingots d'or", rarete: 'rare',
  accepter: "J'ai un client qui paie en or et n'aime pas qu'on lui pose de questions. Trente-deux lingots d'or, apportés sans bruit, et je te laisse un savoir de ta voie. Pas de reçu.",
  encours: "Mon client s'impatient. Ces trente-deux lingots, tu les as, ou tu as seulement parlé ?",
  fini: "Notre affaire est faite. Tu ne m'as jamais vu, et moi, je ne t'ai jamais rien donné.",
  recompense: "Pas mal. Voilà le butin : un savoir de ta voie. Si on te demande, tu l'as trouvé dans la rue."
})
LIVRAISONS.gorm_morue = lvSimple({
  cle: 'gorm_morue_quete', pnj: 'Gorm', objet: 'minecraft:cod', nombre: 32, nom: 'morues crues', rarete: 'rare',
  accepter: "Mon équipage n'a plus rien à mettre sous la dent, et le port est à sec. Trente-deux morues crues pour la cambuse, et je te remets un savoir de ta voie. Vite, la marée n'attend pas.",
  encours: "Mon équipage a faim, terrien. Ces morues, elles arrivent ?",
  fini: "La cambuse est pleine, et tu as la reconnaissance de mon équipage. Une place à bord t'attendra toujours.",
  recompense: "De quoi tenir jusqu'au prochain port ! Prends ceci : un savoir de ta voie. Que le vent te soit favorable."
})
LIVRAISONS.brokk_fer = lvSimple({
  cle: 'brokk_fer_quete', pnj: 'Brokk', objet: 'minecraft:iron_ingot', nombre: 64, nom: 'lingots de fer', rarete: 'rare',
  accepter: "Ma forge crève de faim : soixante-quatre lingots de fer, pas un de moins, et je t'apprends un tour de ta voie. Le fer ne se discute pas.",
  encours: "Hmpf. Mes soixante-quatre lingots ? La forge refroidit.",
  fini: "Ma forge tourne grâce à toi. On en reparlera, camarade.",
  recompense: "Hmpf ! Du bon fer. Tiens, voilà ton dû : un savoir de ta voie, forgé à la main. Ne le laisse pas rouiller."
})
LIVRAISONS.tobin_paratonnerre = lvSimple({
  cle: 'tobin_paratonnerre_quete', pnj: 'Tobin', objet: 'minecraft:lightning_rod', nombre: 10, nom: 'paratonnerres', rarete: 'peu_commun',
  accepter: "Je voudrais dresser des paratonnerres sur la crête, pour attirer l'orage loin du camp. Dix de ceux-là et je te donne un petit savoir de ta voie.",
  encours: "Mes paratonnerres ? Sans eux, le prochain orage frappe le camp !",
  fini: "Le camp dort tranquille grâce à toi. Si tu vois un éclair de loin, c'est moi qui te remercie !",
  recompense: "Parfait, avec ça l'orage sera content ! Tiens, un petit savoir de ta voie. Pas de quoi en faire un drame."
})
LIVRAISONS.garde_fleches = lvSimple({
  cle: 'garde_fleches_quete', pnj: 'Roderic', objet: 'minecraft:arrow', nombre: 64, nom: 'flèches', rarete: 'peu_commun',
  accepter: "Mes archers n'ont plus de flèches, et la nuit tombe vite. Apporte-moi soixante-quatre flèches, et je te remettrai un savoir de ta voie, tiré de nos archives de garde. Ne traîne pas.",
  encours: "Mes archers attendent leurs soixante-quatre flèches. La nuit n'attendra pas.",
  fini: "Les remparts sont de nouveau armés, grâce à toi. La garde n'oublie jamais ceux qui l'ont aidée.",
  recompense: "Voilà de quoi tenir la muraille jusqu'à l'aube. Prends ceci : un savoir de ta voie. La garde te salue, voyageur."
})
LIVRAISONS.edrik_chair = lvSimple({
  cle: 'edrik_chair_quete', pnj: 'Edrik', objet: 'minecraft:rotten_flesh', nombre: 64, nom: 'chairs putréfiées', rarete: 'rare',
  accepter: "Les morts rôdent, et leur chair souille la terre. Apporte-moi soixante-quatre chairs putréfiées : je les purifierai par la prière, et je te donnerai en échange un savoir de ta voie.",
  encours: "Ces chairs putréfiées, voyageur ? La terre attend d'être lavée.",
  fini: "La terre est plus propre grâce à toi. Que la lumière te garde.",
  recompense: "Que la lumière soit rendue à cette chair. Merci, voyageur. Reçois ce savoir de ta voie : qu'il te serve avec justice."
})

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
  // état 0 (quête pas encore acceptée) : on accepte de rendre directement si le joueur a tout ce qu'il faut
  else if (joueur.inventory.count(q.objet) < q.nombre) {
    var possede = joueur.inventory.count(q.objet)
    console.info('[livraison] ' + joueur.username + ' : ' + q.objet + ' x' + possede + ' / ' + q.nombre)
    lvDire(joueur, q, q.manque + ' (Tu en as ' + possede + '.)')
  }
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
  var etat = Commands.literal('etat').requires(estModo)
  for (var nom3 in LIVRAISONS) {
    ;(function (n) {
      var q = LIVRAISONS[n]
      etat = etat.then(Commands.literal(n).then(Commands.argument('joueur', Arguments.PLAYER.create(event))
        .executes(function (ctx) {
          var j = Arguments.PLAYER.getResult(ctx, 'joueur')
          var emetteur = ctx.source.player
          if (emetteur) emetteur.tell(Text.gray(n + ' / ' + j.username + ' : état ' + j.persistentData.getInt(q.cle) + ', ' + q.objet + ' x' + j.inventory.count(q.objet) + ' (il en faut ' + q.nombre + '), classe : ' + (j.persistentData.contains('classe_rp_nom') ? 'oui' : 'non')))
          return 1
        })))
    })(nom3)
  }
  event.register(Commands.literal('livraison').then(accepter).then(rendre).then(choix).then(reset).then(etat))
})
