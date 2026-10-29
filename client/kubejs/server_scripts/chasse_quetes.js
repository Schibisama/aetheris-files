// Quêtes de chasse (tuer N créatures puis revenir voir le PNJ). Remplace chasse_quete.js (Ser Aldric) et chasse_squelettes.js (Hiro).
// Pour ajouter une quête : copie une entrée de CHASSES (commande unique) et crée le dialogue du PNJ Easy NPC.
// Le dialogue du PNJ lance :  /<commande> accepter <joueur>   puis   /<commande> rendre <joueur>
// Op : /<commande> reset <joueur> pour la refaire.   Joueur : /chasse info (état de toutes les chasses).
// Champs : commande, nom (PNJ), cible (nombre de kills), types (liste d'entités ; null = tout monstre hostile),
//          recompenses ([[objet, quantité], ...]), cleEtat / cleKills (clés de sauvegarde, à ne pas changer une fois en service),
//          libelle (affiché dans le compteur), texte* (phrases du PNJ).
// Rechargement : /reload

var CHASSES = []

CHASSES.push({
  commande: 'chasse', nom: 'Ser Aldric', cible: 20, types: null, libelle: 'Chasse',
  recompenses: [['minecraft:emerald', 16], ['minecraft:experience_bottle', 8]],
  cleEtat: 'chasse_etat', cleKills: 'chasse_kills',
  texteDejaFait: "Tu as déjà rempli ta part, voyageur. Que la lumière, si elle existe encore, veille sur toi.",
  texteEnCours: "Ta chasse est déjà en cours : {n}/{cible} créatures abattues. Ne t'arrête pas.",
  texteAccepte: "Alors c'est dit. Abats {cible} créatures de l'ombre et reviens me le dire. Je ne puis marcher à tes côtés... mais mon serment, lui, te suivra.",
  texteNonCommence: "Tu n'as encore rien promis, voyageur. Parle-moi d'abord de la chasse.",
  textePasFini: "Pas encore. {n}/{cible} créatures abattues. L'ombre est encore là.",
  texteTermine: "Tu l'as fait. Prends ceci : c'est peu, mais c'est tout ce que l'oubli m'a laissé. Va, Marqué-de-grâce... non, voyageur. Va.",
  texteAccomplie: "La chasse est accomplie. Reviens me voir.",
  texteDette: "Ma dette envers toi est payée. Il ne me reste plus rien à offrir."
})

CHASSES.push({
  commande: 'squelettes', nom: 'Hiro', cible: 20, libelle: 'Squelettes',
  types: ['minecraft:skeleton', 'minecraft:stray', 'minecraft:bogged', 'minecraft:wither_skeleton'],
  recompenses: [['irons_spellbooks:common_ink', 16]],
  cleEtat: 'chasse_hiro_etat', cleKills: 'chasse_hiro_kills',
  texteDejaFait: "Tu m'as déjà aidé, voyageur. Les os se tiennent tranquilles pour l'instant.",
  texteEnCours: "Ta tâche est en cours : {n}/{cible} squelettes apaisés. Continue.",
  texteAccepte: "Des os sans repos errent la nuit, et leurs âmes pleurent. Apaise-en {cible}, et je te donnerai de l'encre pour tes sorts. Reviens me le dire.",
  texteNonCommence: "Tu ne m'as encore rien promis, voyageur.",
  textePasFini: "Pas encore : {n}/{cible} squelettes apaisés. Il en reste.",
  texteTermine: "Les âmes te remercient. Prends cette encre : elle servira à tes sorts.",
  texteAccomplie: "Ta tâche est accomplie. Reviens me voir.",
  texteDette: "Ma dette est payée. Ces os dorment, pour l'instant."
})

function chTexte(q, modele, n) {
  return String(modele).replace('{cible}', q.cible).replace('{n}', n)
}

function chDire(q, joueur, texte) {
  joueur.tell(Text.gold('[' + q.nom + '] ').append(Text.of(texte).gray()))
}

function chAccepter(q, joueur) {
  var d = joueur.persistentData
  var etat = d.getInt(q.cleEtat)
  var n = d.getInt(q.cleKills)
  if (etat === 2) chDire(q, joueur, chTexte(q, q.texteDejaFait, n))
  else if (etat === 1) chDire(q, joueur, chTexte(q, q.texteEnCours, n))
  else {
    d.putInt(q.cleEtat, 1)
    d.putInt(q.cleKills, 0)
    chDire(q, joueur, chTexte(q, q.texteAccepte, 0))
  }
  return 1
}

function chRendre(q, joueur) {
  var d = joueur.persistentData
  var etat = d.getInt(q.cleEtat)
  var n = d.getInt(q.cleKills)
  if (etat === 0) chDire(q, joueur, chTexte(q, q.texteNonCommence, n))
  else if (etat === 2) chDire(q, joueur, chTexte(q, q.texteDette, n))
  else if (n < q.cible) chDire(q, joueur, chTexte(q, q.textePasFini, n))
  else {
    d.putInt(q.cleEtat, 2)
    for (var i = 0; i < q.recompenses.length; i++) joueur.give(Item.of(q.recompenses[i][0], q.recompenses[i][1]))
    chDire(q, joueur, chTexte(q, q.texteTermine, n))
  }
  return 1
}

function chInfo(joueur) {
  var d = joueur.persistentData
  var vu = false
  for (var i = 0; i < CHASSES.length; i++) {
    var q = CHASSES[i]
    var etat = d.getInt(q.cleEtat)
    if (etat === 1) { joueur.tell(Text.gold(q.libelle + ' (' + q.nom + ') : ' + d.getInt(q.cleKills) + '/' + q.cible)); vu = true }
    else if (etat === 2) { joueur.tell(Text.gold(q.libelle + ' (' + q.nom + ') : terminée.')); vu = true }
  }
  if (!vu) joueur.tell(Text.gray('Aucune chasse en cours. Parle à un PNJ pour en commencer une.'))
  return 1
}

function chReset(q, joueur) {
  joueur.persistentData.putInt(q.cleEtat, 0)
  joueur.persistentData.putInt(q.cleKills, 0)
}

function chEstMonstre(e) {
  try { if (e.isMonster()) return true } catch (x) {}
  try { return String(e.getType().getCategory()).toLowerCase() === 'monster' } catch (x) {}
  return false
}

function chCompte(q, tueur, victime) {
  if (q.types) { if (q.types.indexOf(String(victime.type)) === -1) return }
  else if (!chEstMonstre(victime)) return
  var d = tueur.persistentData
  if (d.getInt(q.cleEtat) !== 1) return
  var n = d.getInt(q.cleKills) + 1
  d.putInt(q.cleKills, n)
  if (n <= q.cible) tueur.setStatusMessage(Text.gold(q.libelle + ' : ' + n + '/' + q.cible))
  if (n === q.cible) chDire(q, tueur, q.texteAccomplie)
}

EntityEvents.death(function (event) {
  try {
    var src = event.source
    var tueur = src ? src.actual : null
    if (!tueur || !tueur.isPlayer()) return
    if (event.entity.isPlayer()) return
    for (var i = 0; i < CHASSES.length; i++) chCompte(CHASSES[i], tueur, event.entity)
  } catch (e) {
    console.error('[chasse_quetes] ' + e)
  }
})

function chEnregistrer(event, q) {
  var Commands = event.commands
  var Arguments = event.arguments
  // op, ou commande lancée par un PNJ Easy NPC (dialogue)
  var parPnj = function (source) {
    try { if (source.hasPermission(2)) return true } catch (e) {}
    try { var ent = source.entity; return !!ent && String(ent.type).indexOf('easy_npc:') === 0 } catch (e) { return false }
  }
  var racine = Commands.literal(q.commande)
    .then(Commands.literal('accepter').requires(parPnj)
      .then(Commands.argument('joueur', Arguments.PLAYER.create(event))
        .executes(function (ctx) { return chAccepter(q, Arguments.PLAYER.getResult(ctx, 'joueur')) })))
    .then(Commands.literal('rendre').requires(parPnj)
      .then(Commands.argument('joueur', Arguments.PLAYER.create(event))
        .executes(function (ctx) { return chRendre(q, Arguments.PLAYER.getResult(ctx, 'joueur')) })))
    .then(Commands.literal('reset').requires(function (s) { return s.hasPermission(2) })
      .then(Commands.argument('joueur', Arguments.PLAYER.create(event))
        .executes(function (ctx) { chReset(q, Arguments.PLAYER.getResult(ctx, 'joueur')); return 1 })))
  if (q.commande === 'chasse') {
    racine = racine.then(Commands.literal('info').executes(function (ctx) { return chInfo(ctx.source.player) }))
  }
  event.register(racine)
}

ServerEvents.commandRegistry(function (event) {
  for (var i = 0; i < CHASSES.length; i++) chEnregistrer(event, CHASSES[i])
})
