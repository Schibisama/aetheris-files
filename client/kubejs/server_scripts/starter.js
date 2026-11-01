// /starter <joueur> (op uniquement, une seule fois par joueur) : kit de départ.
//   - une classe aléatoire (si le joueur n'en a pas déjà une) ;
//   - le set Wizard complet (capuche OU chapeau de sorcier au hasard, robe, jambières, bottes), teint d'une couleur aléatoire
//     (mêmes 12 teintes pour la capuche et le chapeau), équipé directement ;
//   - un grimoire de base à 5 emplacements (Flimsy Journal, vide) ;
//   - un balai volant (Broom of Floatmount) ;
//   - les livres « Règlement de l'Académie » et « Guide des contrôles », et 32 durums (farmersdelight:mutton_wrap).
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

// Livres « Règlement de l'Académie » et « Guide des contrôles » + 32 durums (wraps de mouton), donnés dans les deux kits (élève et professeur).
var STARTER_GUIDE_PAGES = [
  "Bienvenue à l'Académie !\n\nCe livre liste les contrôles les plus utiles. Choisis la touche de chacun comme tu veux dans Options > Commandes.",
  "Iron's Spells, Spellbook :\nlancer un sort.\n\nTab gauche + molette :\nchanger de sort une fois le grimoire équipé.",
  "Spell Actionbar, Open Scroll Actionbar :\nouvrir le codex de sorts et le grimoire.\n\nSimply Swords, Use Mainhand Ability :\nutiliser le pouvoir de l'arme tenue en main.",
  "Dodge Roll :\nfaire une roulade d'esquive.\n\nCarry On :\nporter un bloc, un coffre ou un joueur (main vide, accroupi + clic droit).",
  "Emotecraft, Menu Emote :\nouvrir la roue des emotes.\n\nBorrow Emote :\nfaire une emote à deux.",
  "Plasmo Voice :\nouvrir les paramètres du chat vocal de proximité. Règle ton micro avant de parler !\n\nBonne rentrée, et bonne chance."
]
var STARTER_REGLEMENT_PAGES = [
  "Règlement de l'Académie\n\nCher élève, bienvenue entre nos murs. Lis ce livre avec attention. Ou au moins, fais semblant devant la surveillante.",
  "Article 1\n\nTu es un élève de l'Académie. Tiens ton rôle, porte ta robe avec fierté et n'oublie jamais d'où tu viens. Même si tu ne t'en souviens plus.",
  "Article 2\n\nLe Directeur Véhuit voit tout. S'il ne le voit pas, la surveillante Poutou le voit. Et elle le note dans son carnet.",
  "Article 3\n\nEn cours, on écoute les professeurs Yaga et Trogneux. Un élève attentif apprend des sorts. Un élève dissipé apprend à éteindre ses sourcils.",
  "Article 4\n\nTrois avertissements, et c'est la retenue. Là-bas t'attend le Surveillant de retenue. Personne n'en revient tout à fait le même.",
  "Article 5\n\nOn ne lance pas de sort sur un camarade dans les couloirs. Les querelles se règlent en duel, au Colisée, devant tout le monde. C'est plus classe.",
  "Article 6\n\nCe qui n'est pas à toi n'est pas à toi. Le coffre du voisin, la maison du voisin, le goûter du voisin : on n'y touche pas.",
  "Article 7\n\nLes murs de l'Académie et du village sont sous protection ancienne. Inutile de les casser : ils ne se laisseront pas faire.",
  "Article 8\n\nTricher, c'est renoncer à la magie. Un élève qui trouve une faille dans le monde la signale aux professeurs, au lieu d'en abuser.",
  "Article 9\n\nL'île a ses secrets. Ne gâche pas les mystères de tes camarades : laisse-les se perdre, chercher et trouver par eux-mêmes.",
  "Article 10\n\nAmuse-toi, fais-toi des amis, et prends soin des nouveaux. L'Académie est une famille. Une famille bizarre, mais une famille.",
  "Fait à l'Académie, par ordre du Directeur.\n\nP.-S. : le règlement complet est affiché sur le Discord. Il est plus long. Et moins drôle."
]
function starterLivre(server, n, titre, auteur, textes) {
  var pages = []
  for (var i = 0; i < textes.length; i++) {
    pages.push("'" + JSON.stringify({ text: textes[i] }).replace(/\\/g, '\\\\').replace(/'/g, "\\'") + "'")
  }
  server.runCommandSilent('give ' + n + ' minecraft:written_book[written_book_content={title:' + JSON.stringify(titre) + ',author:' + JSON.stringify(auteur) + ',pages:[' + pages.join(',') + ']}]')
}
function starterGuide(server, n) {
  starterLivre(server, n, 'Règlement de l\'Académie', 'La Direction', STARTER_REGLEMENT_PAGES)
  starterLivre(server, n, 'Guide des contrôles', 'L\'Académie', STARTER_GUIDE_PAGES)
  server.runCommandSilent('give ' + n + ' farmersdelight:mutton_wrap 32')
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
  // Équipé directement sur le joueur ; si l'emplacement d'armure est déjà occupé, la pièce est donnée dans l'inventaire.
  var emplacements = { helmet: 'armor.head', chestplate: 'armor.chest', leggings: 'armor.legs', boots: 'armor.feet' }
  var indexArmure = { boots: 0, leggings: 1, chestplate: 2, helmet: 3 }
  for (var i = 0; i < pieces.length; i++) {
    var piece = pieces[i]
    var idObjet = 'irons_spellbooks:wizard_' + piece
    if (piece === 'helmet' && Math.random() < 0.5) idObjet = 'irons_spellbooks:wizard_hat'   // chapeau de sorcier au lieu de la capuche (1 chance sur 2)
    var objet = idObjet + '[minecraft:dyed_color={rgb:' + rgb + '}]'
    var libre = false
    try { libre = joueur.inventory.armor.get(indexArmure[piece]).isEmpty() } catch (eA) {}
    if (libre) server.runCommandSilent('item replace entity ' + n + ' ' + emplacements[piece] + ' with ' + objet)
    else server.runCommandSilent('give ' + n + ' ' + objet)
  }

  // 3. Grimoire de base (5 emplacements) et 4. balai volant
  server.runCommandSilent('give ' + n + ' irons_spellbooks:copper_spell_book')
  server.runCommandSilent('give ' + n + ' apprenticecodex:floatmount_broom')
  starterGuide(server, n)

  if (op) op.tell(Text.gray('Kit de départ donné à ' + n + '.'))
  joueur.tell(Text.gold('Kit de départ reçu : set de Wizard, grimoire, balai volant, règlement, guide des contrôles et 32 durums. Bonne rentrée à l\'Académie !'))
  return 1
}

// /starter professeur <joueur> : kit de professeur, équipé directement : couronne Pyrium Battlemage + veste, pantalon et bottes de Hazel,
// plus le même grimoire et le même balai volant que les élèves ; le tout (armure) teint d'une même couleur aléatoire (mêmes 12 teintes que les élèves). Le set est teignable comme une armure de cuir
// (tag minecraft:dyeable ci-dessous ; rendu teint côté client : pseudo_client.js). Les ornements dorés gardent leur couleur.
// Si un emplacement d'armure est déjà occupé, la pièce est donnée dans l'inventaire. Une seule fois par joueur (clé effacée par /reinit).
var STARTER_PROF_CLE = 'starter_prof_pris'
var STARTER_PROF_KIT = [
  { id: 'hazennstuff:pyrium_battlemage_helmet', slot: 'armor.head', index: 3 },
  { id: 'hazennstuff:hazel_chestplate', slot: 'armor.chest', index: 2 },
  { id: 'hazennstuff:hazel_leggings', slot: 'armor.legs', index: 1 },
  { id: 'hazennstuff:hazel_boots', slot: 'armor.feet', index: 0 }
]
function starterDonnerProf(ctx, joueur) {
  var server = ctx.source.server
  var n = joueur.username
  var op = ctx.source.player
  if (joueur.persistentData.getBoolean(STARTER_PROF_CLE)) {
    if (op) op.tell(Text.red(n + ' a déjà reçu le kit de professeur (/reinit pour le lui redonner).'))
    return 0
  }
  joueur.persistentData.putBoolean(STARTER_PROF_CLE, true)
  var rgbProf = STARTER_COULEURS[Math.floor(Math.random() * STARTER_COULEURS.length)]
  for (var i = 0; i < STARTER_PROF_KIT.length; i++) {
    var p = STARTER_PROF_KIT[i]
    var objet = p.id + '[minecraft:dyed_color={rgb:' + rgbProf + '}]'   // tout le set (couronne comprise) dans la même teinte
    var libre = false
    try { libre = joueur.inventory.armor.get(p.index).isEmpty() } catch (e) {}
    if (libre) server.runCommandSilent('item replace entity ' + n + ' ' + p.slot + ' with ' + objet)
    else server.runCommandSilent('give ' + n + ' ' + objet)
  }
  // Même grimoire et même balai que les élèves
  server.runCommandSilent('give ' + n + ' irons_spellbooks:copper_spell_book')
  server.runCommandSilent('give ' + n + ' apprenticecodex:floatmount_broom')
  starterGuide(server, n)
  if (op) op.tell(Text.gray('Kit de professeur donné à ' + n + '.'))
  joueur.tell(Text.gold('Kit de professeur reçu : couronne de Pyrium et armure de Hazel (teignables à l\'établi), grimoire, balai volant, règlement, guide des contrôles et 32 durums.'))
  return 1
}

// Tenue de professeur teignable (Hazel + couronne Pyrium Battlemage) : on l'ajoute au tag des objets teignables (teinture à l'établi, comme le cuir ; lavable au chaudron).
ServerEvents.tags('item', function (event) {
  event.add('minecraft:dyeable', ['hazennstuff:hazel_helmet', 'hazennstuff:hazel_chestplate', 'hazennstuff:hazel_leggings', 'hazennstuff:hazel_boots', 'hazennstuff:pyrium_battlemage_helmet'])
})

// Carry On : les balais ne peuvent pas être attrapés et transportés
ServerEvents.tags('entity_type', function (event) {
  event.add('carryon:entity_blacklist', ['apprenticecodex:floatmount_broom', 'apprenticecodex:hoverride_broom'])
})

ServerEvents.commandRegistry(function (event) {
  var Commands = event.commands
  var Arguments = event.arguments
  event.register(Commands.literal('starter')
    .requires(profOuOp)
    .then(Commands.literal('professeur')
      .then(Commands.argument('joueur', Arguments.PLAYER.create(event))
        .executes(function (ctx) {
          try { return starterDonnerProf(ctx, Arguments.PLAYER.getResult(ctx, 'joueur')) } catch (e) { console.error('[starter] prof : ' + e); return 0 }
        })))
    .then(Commands.argument('joueur', Arguments.PLAYER.create(event))
      .executes(function (ctx) {
        try { return starterDonner(ctx, Arguments.PLAYER.getResult(ctx, 'joueur')) } catch (e) { console.error('[starter] ' + e); return 0 }
      })))
})

// Joueurs qui ont déjà une classe : la quête FTB « L'éveil » est cochée à la connexion (rattrapage)
PlayerEvents.loggedIn(function (e) {
  try {
    var j = e.player
    j.server.scheduleInTicks(60, function () {
      try { if (classeDe(j) && typeof ftbCompleter === 'function') ftbCompleter(j, '7C4CFD68DA0E88CA') } catch (e2) {}
    })
  } catch (err) { console.error('[starter] rattrapage éveil : ' + err) }
})
