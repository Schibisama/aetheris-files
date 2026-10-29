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

LIVRAISONS.mistral_membranes = lvSimple({
  cle: 'mistral_membranes_quete', pnj: 'Mistral', objet: 'minecraft:phantom_membrane', nombre: 12, nom: 'membranes de fantôme', rarete: 'peu_commun',
  accepter: "Avant de m'attaquer au Cumulonimbus, il me faut de quoi tisser des voiles de vol. Rapporte-moi douze membranes de fantôme, arrachées aux rôdeurs de la nuit, et je te remettrai un petit savoir de ta voie.",
  encours: "Mes douze membranes de fantôme ? Les fantômes ne tombent pas tout seuls du ciel, voyageur.",
  fini: "Mes voiles sont tissées, grâce à toi. Le vent te le revaudra.",
  recompense: "De la belle membrane, souple et résistante. Prends ceci : un savoir de ta voie, porté par le vent."
})
function lvDire(joueur, q, texte) {
  joueur.tell(Text.gold('[' + q.pnj + '] ').append(Text.of(texte).gray()))
}

function lvExec(server, joueur, commande) {
  server.runCommandSilent(commande.replace('%joueur%', joueur.username))
}

// Quête FTB « parler aux PNJ des classes » : tout contact avec les boutons de quête d'un de ces PNJ valide sa tâche (chapitre boss_pnj).
var LV_FTB = {
  'cls_pyromancien_quete': '5C03B6E1433D6DF9',
  'cls_cryomancien_quete': 'FD27126F413803DA',
  'cls_voyageur_vide_quete': '71B5C99E28972A0A',
  'cls_evocateur_quete': '5E90E501CFFD9750',
  'cls_chronomancien_quete': '61E6FB3291852426',
  'cls_aeromancien_quete': '91C8A74358D5564C',
  'cls_chromancien_quete': 'D40E139425E07199',
  'cls_necromancien_quete': '293DA20D8859D0E5',
  'cls_reprouve_quete': 'E7DC54EE643E13C9',
  'cls_envouteur_quete': '10C5964DB2BE5D23',
  'cls_esoteriste_quete': 'A5600FC47C14FC63',
  'cls_astromancien_quete': '87A2811C8C4899F4',
  'cls_spiritualiste_quete': '26E322751931E65D',
  'cls_symetriste_quete': 'E409283CFDD2BA08',
  'tobin_paratonnerre_quete': '277BF5304724C1FE',
  'edrik_chair_quete': '775CF9C47617FB0C',
  'gorm_morue_quete': 'DB2C1258F9D27B05',
  'brokk_fer_quete': '39988E77D4C24C54',
  'sylvaine_roses_quete': '419F8AD44204FD67'
}
function lvFtb(joueur, q) {
  try {
    var id = LV_FTB[q.cle]
    if (id) joueur.server.runCommandSilent('ftbquests change_progress ' + joueur.username + ' complete ' + id)
  } catch (e) {}
}

function lvAccepter(joueur, q) {
  lvFtb(joueur, q)
  var d = joueur.persistentData
  var etat = d.getInt(q.cle)
  if (etat === 0) { d.putInt(q.cle, 1); lvDire(joueur, q, q.accepter) }
  else if (etat === 1) lvDire(joueur, q, q.encours)
  else if (etat === 2) lvDire(joueur, q, q.choisir)
  else lvDire(joueur, q, q.fini)
  return 1
}

function lvRendre(server, joueur, q) {
  lvFtb(joueur, q)
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

// ───── Quêtes des PNJ de classe (livraison) ─────
LIVRAISONS.cls_pyromancien = lvSimple({
  cle: 'cls_pyromancien_quete', pnj: "Cendric", objet: "minecraft:coal", nombre: 64, nom: "charbons", rarete: "peu_commun",
  accepter: "Mon brasier s'éteint, et un pyromancien sans feu n'est qu'un homme en colère. Apporte-moi soixante-quatre charbons, et je te transmettrai un petit savoir de ta voie.",
  encours: "Mes soixante-quatre charbons ? Le feu a faim, voyageur.",
  fini: "Le brasier est vivant, grâce à toi. Reviens quand tu auras froid.",
  recompense: "Voilà de quoi nourrir mon feu. Prends ce savoir de ta voie, mais ne brûle rien d'important."
})
LIVRAISONS.cls_cryomancien = lvSimple({
  cle: 'cls_cryomancien_quete', pnj: "Névée", objet: "minecraft:packed_ice", nombre: 32, nom: "blocs de glace compactée", rarete: "rare",
  accepter: "Mes réserves de glace fondent, et mes sortilèges avec elles. Trente-deux blocs de glace compactée, et je te confie un savoir de ta voie.",
  encours: "Ma glace ? Elle fond, et moi avec.",
  fini: "Mes cristaux tiennent bon. Merci, voyageur.",
  recompense: "Le givre te reconnaît désormais. Prends ce savoir de ta voie."
})
LIVRAISONS.cls_voyageur_vide = lvSimple({
  cle: 'cls_voyageur_vide_quete', pnj: "Zéphar le Passeur", objet: "minecraft:ender_pearl", nombre: 8, nom: "perles du Néant", rarete: "rare",
  accepter: "J'ai besoin de huit perles du Néant pour ouvrir un passage stable. Apporte-les-moi, et je te laisserai un savoir de ta voie, ramené d'un endroit qui n'existe pas.",
  encours: "Mes huit perles ? Sans elles, je ne vais nulle part.",
  fini: "Le passage est ouvert. Je te dois une faveur, quelque part, quelque quand.",
  recompense: "Du Vide pour le Vide. Prends ce savoir de ta voie, et ne demande pas d'où il vient."
})
LIVRAISONS.cls_evocateur = lvSimple({
  cle: 'cls_evocateur_quete', pnj: "Oswin l'Évocateur", objet: "minecraft:emerald", nombre: 24, nom: "émeraudes", rarete: "rare",
  accepter: "Mes focus sont épuisés. Apporte-moi vingt-quatre émeraudes, et je te transmets un savoir de ta voie, avec un petit sort de remerciement.",
  encours: "Mes vingt-quatre émeraudes ? Mon cercle est prêt, il n'attend que ça.",
  fini: "Mon cercle est complet. Merci, voyageur.",
  recompense: "Parfait ! Voici ton dû : un savoir de ta voie. N'invoque rien chez l'aubergiste."
})
LIVRAISONS.cls_chronomancien = lvSimple({
  cle: 'cls_chronomancien_quete', pnj: "Horace le Sablier", objet: "minecraft:clock", nombre: 4, nom: "horloges", rarete: "rare",
  accepter: "Mes horloges se sont arrêtées, et le temps ici devient... flou. Apporte-moi quatre horloges, et je te donnerai un savoir de ta voie. Si tu es en retard, ce sera comme si tu étais à l'heure.",
  encours: "Mes quatre horloges ? Elles auraient dû arriver hier. Ou demain.",
  fini: "Mes horloges battent à nouveau. Le temps te remercie.",
  recompense: "Voici ton dû, avant même que tu ne le demandes : un savoir de ta voie."
})
LIVRAISONS.cls_aeromancien = lvSimple({
  cle: 'cls_aeromancien_quete', pnj: "Aelwen", objet: "minecraft:feather", nombre: 64, nom: "plumes", rarete: "peu_commun",
  accepter: "Mes messagers sont à court de plumes pour les sceaux de vent. Apporte-m'en soixante-quatre, et je te glisserai un petit savoir de ta voie.",
  encours: "Mes soixante-quatre plumes ? Le vent s'impatiente.",
  fini: "Mes messagers volent à nouveau. Merci !",
  recompense: "Un souffle de savoir pour toi. Garde-le à l'abri des courants d'air."
})
LIVRAISONS.cls_chromancien = lvSimple({
  cle: 'cls_chromancien_quete', pnj: "Iris la Peintre d'Aura", objet: "minecraft:glow_ink_sac", nombre: 16, nom: "sacs d'encre luisante", rarete: "rare",
  accepter: "Ma palette est vide, et il me manque la plus lumineuse des encres. Apporte-moi seize sacs d'encre luisante, et je te peindrai un savoir de ta voie.",
  encours: "Mes seize sacs d'encre luisante ? Mon pinceau s'ennuie.",
  fini: "Ma palette brille à nouveau. Merci, voyageur.",
  recompense: "Regarde comme ça brille ! Voici ton savoir de ta voie, de toutes les couleurs."
})
LIVRAISONS.cls_necromancien = lvSimple({
  cle: 'cls_necromancien_quete', pnj: "Mortimer le Fossoyeur", objet: "minecraft:bone", nombre: 64, nom: "os", rarete: "rare",
  accepter: "Mes serviteurs manquent d'os, et un squelette incomplet est une insulte. Apporte-moi soixante-quatre os, et je te donnerai un savoir de ta voie.",
  encours: "Mes soixante-quatre os ? Mes amis commencent à s'effondrer.",
  fini: "Mes serviteurs te remercient. Ils ne parlent pas, mais je traduis.",
  recompense: "Voici le fruit de notre marché : un savoir de ta voie. Que les morts te soient favorables."
})
LIVRAISONS.cls_reprouve = lvSimple({
  cle: 'cls_reprouve_quete', pnj: "Ezra le Réprouvé", objet: "minecraft:ink_sac", nombre: 32, nom: "poches d'encre", rarete: "peu_commun",
  accepter: "Mes registres sont presque vides d'encre. Trente-deux poches d'encre, et je te rédigerai un petit savoir de ta voie, sans clause cachée. Presque.",
  encours: "Mes trente-deux poches d'encre ? Les registres attendent.",
  fini: "Le contrat est honoré. Aucune clause cachée, juré.",
  recompense: "Voici ton exemplaire : un savoir de ta voie. Signature facultative."
})
LIVRAISONS.cls_envouteur = lvSimple({
  cle: 'cls_envouteur_quete', pnj: "Morgause l'Envoûteuse", objet: "minecraft:spider_eye", nombre: 16, nom: "yeux d'araignée", rarete: "peu_commun",
  accepter: "Mes sortilèges ont besoin d'ingrédients frais. Apporte-moi seize yeux d'araignée, et je te laisserai un petit savoir de ta voie. Sans malédiction. Cette fois.",
  encours: "Mes seize yeux d'araignée ? Mes charmes s'étiolent.",
  fini: "Mon chaudron frémit de plaisir. Merci.",
  recompense: "Voilà ton dû : un savoir de ta voie. Tu es libre de partir, c'est promis."
})
LIVRAISONS.cls_esoteriste = lvSimple({
  cle: 'cls_esoteriste_quete', pnj: "Lysandre le Reclus", objet: "minecraft:amethyst_shard", nombre: 32, nom: "éclats d'améthyste", rarete: "rare",
  accepter: "Mes cristaux de méditation se sont brisés. Trente-deux éclats d'améthyste, et je te transmettrai un savoir de ta voie. Ne le répète pas.",
  encours: "Mes trente-deux éclats d'améthyste ? Ma méditation n'a plus de focus.",
  fini: "Mes cristaux chantent à nouveau. Merci, voyageur.",
  recompense: "Voici ce qui était caché : un savoir de ta voie. Garde-le près du cœur."
})
LIVRAISONS.cls_astromancien = lvSimple({
  cle: 'cls_astromancien_quete', pnj: "Stellaria l'Astronome", objet: "asterismarcanum:lumine_dust", nombre: 16, nom: "poussières de lumine", rarete: "peu_commun",
  accepter: "Mes cartes du ciel perdent leur éclat. Apporte-moi seize poussières de lumine, et je te dévoilerai un petit savoir de ta voie, écrit dans les étoiles.",
  encours: "Mes seize poussières de lumine ? Mes cartes pâlissent.",
  fini: "Mes constellations brillent à nouveau. Merci.",
  recompense: "Voici ce que disent les étoiles : un savoir de ta voie. Elles te souhaitent bonne route."
})
LIVRAISONS.cls_spiritualiste = lvSimple({
  cle: 'cls_spiritualiste_quete', pnj: "Yuna la Moniale", objet: "minecraft:soul_sand", nombre: 16, nom: "blocs de sable des âmes", rarete: "peu_commun",
  accepter: "Mon sanctuaire manque de sable des âmes pour l'encens. Apporte-moi seize blocs de ce sable, et je te transmettrai un petit savoir de ta voie.",
  encours: "Mes seize blocs de sable des âmes ? Mon encens s'éteint.",
  fini: "Mon sanctuaire est apaisé. Merci.",
  recompense: "Que cette connaissance t'accompagne : un savoir de ta voie."
})
LIVRAISONS.cls_symetriste = lvSimple({
  cle: 'cls_symetriste_quete', pnj: "Symon le Géomètre", objet: "iss_magicfromtheeast:jade", nombre: 32, nom: "éclats de jadestone", rarete: "peu_commun",
  accepter: "Mes instruments de mesure sont tordus. Apporte-moi trente-deux éclats de jadestone, et je te remettrai un petit savoir de ta voie, parfaitement équilibré.",
  encours: "Mes trente-deux éclats de jadestone ? Il m'en manque pour que ce soit symétrique.",
  fini: "Parfait équilibre. Merci, voyageur.",
  recompense: "Voici ton dû, parfaitement calibré : un savoir de ta voie."
})

LIVRAISONS.pip_algues = lvSimple({
  cle: 'pip_algues_quete', pnj: 'Pip', objet: 'minecraft:kelp', nombre: 20, nom: 'algues', rarete: 'peu_commun',
  accepter: "Léna ne mange presque plus. L'herboriste dit qu'un bouillon d'algues lui ferait du bien. Tu peux m'en rapporter vingt ? Je te donnerai ce que j'ai.",
  encours: "Mes vingt algues ? Léna attend son bouillon...",
  fini: "Léna a mangé son bouillon ! Merci beaucoup.",
  recompense: "Des algues ! Léna va adorer. Tiens, prends ce savoir de ta voie : c'est tout ce que j'ai."
})

// ───── Quêtes des PNJ de lore (10) : objet simple, récompense peu commune ─────
LIVRAISONS.odalric_papier = lvSimple({
  cle: 'odalric_papier_quete', pnj: "Odalric", objet: 'minecraft:paper', nombre: 16, nom: "feuilles de papier", rarete: 'peu_commun',
  accepter: "Mes plumes sont usées à force de recopier. Apporte-moi seize feuilles de papier vierge, et je te transmettrai un petit savoir de ta voie, tiré des rayons les moins rongés.",
  encours: "Mes feuilles ont fini en copies, et je n'en ai presque plus. Seize feuilles, voyageur, et je te mets de côté un petit savoir.",
  fini: "Notre marché est conclu, voyageur. Merci encore.",
  recompense: "Seize feuilles de papier, impeccables. Voici ton dû : un petit savoir de ta voie, tiré d'une page encore lisible."
})
LIVRAISONS.bertille_pain = lvSimple({
  cle: 'bertille_pain_quete', pnj: "Bertille", objet: 'minecraft:bread', nombre: 16, nom: "pains", rarete: 'peu_commun',
  accepter: "Mon four ne désemplit pas, et la farine me manque. Apporte-moi seize pains, que je puisse remplir les écuelles du soir, et je te remettrai un petit savoir de ta voie.",
  encours: "Mes seize pains ? Les écuelles sont vides et les ventres gargouillent.",
  fini: "Notre marché est conclu, voyageur. Merci encore.",
  recompense: "Voilà qui comblera quelques estomacs ! Tiens, prends ce savoir de ta voie : c'est la maison qui offre."
})
LIVRAISONS.gaspard_fleches = lvSimple({
  cle: 'gaspard_fleches_quete', pnj: "Gaspard", objet: 'minecraft:arrow', nombre: 24, nom: "flèches", rarete: 'peu_commun',
  accepter: "Mes carquois sont presque vides et la nuit vient. Apporte-moi vingt-quatre flèches, et je te transmettrai un petit savoir de ta voie. Pas de temps à perdre.",
  encours: "Mes vingt-quatre flèches ? La nuit n'attend pas, voyageur.",
  fini: "Notre marché est conclu, voyageur. Merci encore.",
  recompense: "À la bonne heure, les remparts tiendront cette nuit. Voici ton dû : un petit savoir de ta voie."
})
LIVRAISONS.rodolphe_charbon = lvSimple({
  cle: 'rodolphe_charbon_quete', pnj: "Rodolphe", objet: 'minecraft:coal', nombre: 24, nom: "morceaux de charbon", rarete: 'peu_commun',
  accepter: "Mes lanternes manquent de combustible, et les rues s'assombrissent. Apporte-moi vingt-quatre morceaux de charbon, et je te remettrai un petit savoir de ta voie.",
  encours: "Mes vingt-quatre charbons ? Les rues vont rester dans le noir sans eux.",
  fini: "Notre marché est conclu, voyageur. Merci encore.",
  recompense: "Les lanternes brilleront ce soir ! Voici ton dû : un petit savoir de ta voie, comme une flamme qu'on te confie."
})
LIVRAISONS.gwenaelle_ficelle = lvSimple({
  cle: 'gwenaelle_ficelle_quete', pnj: "Gwenaëlle", objet: 'minecraft:string', nombre: 16, nom: "ficelles", rarete: 'peu_commun',
  accepter: "Mon fil est épuisé, et j'ai trois manteaux en attente. Apporte-moi seize fils (de la ficelle fera l'affaire), et je te remettrai un petit savoir de ta voie.",
  encours: "Mes seize ficelles ? Les manteaux attendent, et il fait froid.",
  fini: "Notre marché est conclu, voyageur. Merci encore.",
  recompense: "Voilà qui fera de beaux ourlets ! Prends ceci : un petit savoir de ta voie, cousu main."
})
LIVRAISONS.marcelin_bougies = lvSimple({
  cle: 'marcelin_bougies_quete', pnj: "Marcelin", objet: 'minecraft:candle', nombre: 8, nom: "bougies", rarete: 'peu_commun',
  accepter: "Mes veillées se font à la lueur des bougies, et mes réserves s'épuisent. Apporte-moi huit bougies, et je te transmettrai un petit savoir de ta voie, comme on glisse un secret au creux de l'oreille.",
  encours: "Mes huit bougies ? Une histoire sans lueur ne fait peur à personne.",
  fini: "Notre marché est conclu, voyageur. Merci encore.",
  recompense: "Voilà de quoi éclairer une belle veillée ! Voici ton dû : un petit savoir de ta voie, à raconter ou à garder."
})
LIVRAISONS.perrine_morue = lvSimple({
  cle: 'perrine_morue_quete', pnj: "Perrine", objet: 'minecraft:cod', nombre: 12, nom: "morues crues", rarete: 'peu_commun',
  accepter: "Mes filets sont déchirés et ma cambuse est vide. Apporte-moi douze morues crues, et je te transmettrai un petit savoir de ta voie, qu'on se transmet sur les quais.",
  encours: "Mes douze morues ? La marmite attend, et le bateau n'est pas prêt.",
  fini: "Notre marché est conclu, voyageur. Merci encore.",
  recompense: "Quelle belle prise ! Voici ton dû : un petit savoir de ta voie, tiré des filets."
})
LIVRAISONS.tancrede_pommes = lvSimple({
  cle: 'tancrede_pommes_quete', pnj: "Tancrède", objet: 'minecraft:apple', nombre: 10, nom: "pommes", rarete: 'peu_commun',
  accepter: "Je n'ai rien avalé depuis hier, et mon maître ne me laisse pas quitter l'atelier. Apporte-moi dix pommes, et je te transmettrai un petit savoir de ta voie, trouvé dans ses notes.",
  encours: "Mes dix pommes ? J'ai si faim, tu sais.",
  fini: "Notre marché est conclu, voyageur. Merci encore.",
  recompense: "Merci, merci ! Voici ce que j'ai trouvé dans ses carnets : un petit savoir de ta voie."
})
LIVRAISONS.mirabelle_laine = lvSimple({
  cle: 'mirabelle_laine_quete', pnj: "Mirabelle", objet: 'minecraft:white_wool', nombre: 8, nom: "laines blanches", rarete: 'peu_commun',
  accepter: "Mes bandages sont épuisés, et les blessés ne manquent pas. Apporte-moi huit laines blanches, que j'en tisse de nouveaux, et je te transmettrai un petit savoir de ta voie.",
  encours: "Mes huit laines blanches ? Les blessés attendent leurs bandages.",
  fini: "Notre marché est conclu, voyageur. Merci encore.",
  recompense: "Voilà qui sauvera quelques peaux ! Prends ceci : un petit savoir de ta voie, avec ma gratitude."
})
LIVRAISONS.bartholome_os = lvSimple({
  cle: 'bartholome_os_quete', pnj: "Bartholomé", objet: 'minecraft:bone', nombre: 16, nom: "os", rarete: 'peu_commun',
  accepter: "Ma colle est faite d'os broyés, et je n'en ai plus. Apporte-moi seize os, et je te transmettrai un petit savoir de ta voie, relié à la main.",
  encours: "Mes seize os ? Ma colle est à sec, et mes livres tombent en morceaux.",
  fini: "Notre marché est conclu, voyageur. Merci encore.",
  recompense: "Voilà qui fera une colle solide ! Voici ton dû : un petit savoir de ta voie, relié à la main."
})

LIVRAISONS.ulrich_poudre = lvSimple({
  cle: 'ulrich_poudre_quete', pnj: 'Ulrich', objet: 'minecraft:blaze_powder', nombre: 20, nom: 'poudres de blaze', rarete: 'rare',
  accepter: "*toux rauque* Mes brûlures... ne se referment jamais tout à fait. Il me faut de la poudre de blaze, pour mon onguent... Vingt. Apporte-m'en vingt... et je te céderai un savoir de ta voie.",
  encours: "*souffle court* Mes vingt poudres de blaze... La douleur n'attend pas, voyageur...",
  fini: "*un long soupir* Mon onguent est prêt... Le feu me laisse un peu de répit. Merci...",
  recompense: "*sa main tremble en saisissant la poudre* Vingt... Tu n'as pas peur du feu, toi. Prends ce savoir de ta voie... c'est tout ce que j'ai."
})

LIVRAISONS.capitaine_longuevue = lvSimple({
  cle: 'capitaine_longuevue_quete', pnj: "Capitaine Morrow", objet: 'minecraft:spyglass', nombre: 1, nom: "longue-vue", rarete: 'peu_commun',
  accepter: "Mon nécromancien a filé vers le nord, et je n'ai plus de longue-vue pour guetter l'horizon. Rapporte-m'en une, et je te laisserai un petit savoir de ta voie.",
  encours: "Ma longue-vue ? L'horizon ne se surveille pas tout seul.",
  fini: "Ma longue-vue est à son poste. Merci, voyageur.",
  recompense: "Voilà de quoi voir venir la tempête ! Prends ce savoir de ta voie, en remerciement."
})


// /pnjparle <pnj> <joueur> : PNJ sans quête de livraison qui compte pour la quête FTB « parler aux PNJ des classes » (Dame Carmine).
var PNJ_PARLE = { carmine: '88116880635C5238' }
ServerEvents.commandRegistry(function (event) {
  var Commands = event.commands
  var Arguments = event.arguments
  var parPnj = function (source) {
    try { if (source.hasPermission(2)) return true } catch (e) {}
    try { var ent = source.entity; return !!ent && String(ent.type).indexOf('easy_npc:') === 0 } catch (e) { return false }
  }
  var racine = Commands.literal('pnjparle').requires(parPnj)
  for (var nom in PNJ_PARLE) {
    ;(function (n) {
      racine = racine.then(Commands.literal(n).then(Commands.argument('joueur', Arguments.PLAYER.create(event))
        .executes(function (ctx) {
          var j = Arguments.PLAYER.getResult(ctx, 'joueur')
          ctx.source.server.runCommandSilent('ftbquests change_progress ' + j.username + ' complete ' + PNJ_PARLE[n])
          return 1
        })))
    })(nom)
  }
  event.register(racine)
})
