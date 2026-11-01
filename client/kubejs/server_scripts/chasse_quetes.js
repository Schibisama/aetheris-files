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

// ── Quêtes des PNJ de chasse et des élèves (créatures de mods) ──

CHASSES.push({
  commande: 'foliaath', nom: "Sire Gauvain", cible: 15, libelle: "Foliaaths",
  types: ["mowziesmobs:foliaath", "mowziesmobs:baby_foliaath"],
  recompenses: [["minecraft:emerald", 16], ["irons_spellbooks:uncommon_ink", 4]],
  cleEtat: 'chasse_foliaath_etat', cleKills: 'chasse_foliaath_kills',
  texteDejaFait: "Les jungles respirent mieux grâce à toi. Ma dette est payée.",
  texteEnCours: "Ta chasse continue : {n}/{cible} Foliaaths tranchées.",
  texteAccepte: "Dans les jungles, des plantes à mâchoires se cachent sous les feuilles et dévorent les imprudents. On les nomme Foliaaths. Tranches-en {cible} et reviens : un chevalier tient toujours parole.",
  texteNonCommence: "Tu ne m'as encore rien promis.",
  textePasFini: "Pas encore : {n}/{cible} Foliaaths. Il en reste qui guettent sous les fougères.",
  texteTermine: "Bien combattu. Voici des émeraudes et de l'encre : de quoi te payer une armure ou un sort.",
  texteAccomplie: "Les Foliaaths sont tombées. Reviens voir Sire Gauvain.",
  texteDette: "Tu as déjà ta récompense, ami. Le chevalier n'a plus rien à donner."
})

CHASSES.push({
  commande: 'lanternes', nom: "Rhéa", cible: 12, libelle: "Lanternes",
  types: ["mowziesmobs:lantern"],
  recompenses: [["minecraft:emerald", 12], ["irons_spellbooks:arcane_essence", 12]],
  cleEtat: 'chasse_lanternes_etat', cleKills: 'chasse_lanternes_kills',
  texteDejaFait: "Les forêts sombres sont redevenues sombres. Merci, chasseur.",
  texteEnCours: "Ta traque avance : {n}/{cible} Lanternes éteintes.",
  texteAccepte: "La nuit, dans les forêts sombres, des Lanternes flottent et attirent les voyageurs loin des chemins. Éteins-en {cible}. Je paie bien les bons traqueurs.",
  texteNonCommence: "Tu ne m'as encore rien promis.",
  textePasFini: "{n}/{cible}. Encore des lueurs qui dansent entre les arbres.",
  texteTermine: "Tu as l'œil. Prends ceci : des émeraudes, et de l'essence arcanique récoltée sur leurs restes.",
  texteAccomplie: "Les Lanternes sont éteintes. Reviens voir Rhéa.",
  texteDette: "On est quittes, toi et moi."
})

CHASSES.push({
  commande: 'creepers', nom: "Bertin", cible: 20, libelle: "Creepers",
  types: ["creeperoverhaul:badlands_creeper", "creeperoverhaul:bamboo_creeper", "creeperoverhaul:beach_creeper", "creeperoverhaul:birch_creeper", "creeperoverhaul:cave_creeper", "creeperoverhaul:dark_oak_creeper", "creeperoverhaul:desert_creeper", "creeperoverhaul:dripstone_creeper", "creeperoverhaul:hills_creeper", "creeperoverhaul:jungle_creeper", "creeperoverhaul:mushroom_creeper", "creeperoverhaul:ocean_creeper", "creeperoverhaul:savannah_creeper", "creeperoverhaul:snowy_creeper", "creeperoverhaul:spruce_creeper", "creeperoverhaul:swamp_creeper"],
  recompenses: [["minecraft:emerald", 10], ["minecraft:bread", 16], ["minecraft:experience_bottle", 6]],
  cleEtat: 'chasse_creepers_etat', cleKills: 'chasse_creepers_kills',
  texteDejaFait: "Mes champs sont tranquilles grâce à toi. Repasse quand tu veux, la soupe est chaude.",
  texteEnCours: "Alors ? {n}/{cible} Creepers. Mes choux comptent sur toi.",
  texteAccepte: "Des Creepers de toutes les couleurs sortent des bois et me font sauter les clôtures ! Débarrasse-moi de {cible} de ces bestioles, et je te paierai en émeraudes et en pain frais.",
  texteNonCommence: "Tu ne m'as encore rien promis.",
  textePasFini: "{n}/{cible}... J'en ai encore vu un dans le champ de navets ce matin.",
  texteTermine: "Ah, enfin la paix ! Tiens : des émeraudes, du pain chaud et un peu de savoir en bouteille.",
  texteAccomplie: "C'est fait ! Va dire ça à Bertin.",
  texteDette: "Je t'ai déjà payé, l'ami. Je ne suis qu'un pauvre fermier."
})

CHASSES.push({
  commande: 'fantomes', nom: "Le Masque Pâle", cible: 15, libelle: "Fantômes",
  types: ["ghosts:ghost", "ghosts:small_ghost"],
  recompenses: [["minecraft:emerald", 12], ["irons_spellbooks:common_ink", 12]],
  cleEtat: 'chasse_fantomes_etat', cleKills: 'chasse_fantomes_kills',
  texteDejaFait: "Les morts se taisent à nouveau. Va, et ne te retourne pas.",
  texteEnCours: "{n}/{cible} âmes apaisées. Les autres murmurent encore.",
  texteAccepte: "Les morts errent la nuit, pâles et silencieux. Ce sont des fantômes, et ils me regardent derrière mon masque. Renvoie-en {cible} dans le silence. Je saurai te récompenser.",
  texteNonCommence: "Tu ne m'as encore rien promis.",
  textePasFini: "{n}/{cible}. J'en entends encore pleurer.",
  texteTermine: "Le silence. Enfin. Prends cette encre : elle a bu la lumière des âmes que tu as libérées.",
  texteAccomplie: "Les fantômes se sont tus. Retourne voir le Masque Pâle.",
  texteDette: "Tu n'as plus rien à attendre de moi."
})

CHASSES.push({
  commande: 'spriggans', nom: "Isolde", cible: 10, libelle: "Spriggans",
  types: ["monsterspellbooks:spriggan"],
  recompenses: [["minecraft:emerald", 14], ["irons_spellbooks:uncommon_ink", 3]],
  cleEtat: 'chasse_spriggans_etat', cleKills: 'chasse_spriggans_kills',
  texteDejaFait: "La forêt ne chuchote plus contre nous. Merci.",
  texteEnCours: "{n}/{cible} Spriggans abattus. Les arbres grincent encore.",
  texteAccepte: "Dans les forêts, certains arbres ne sont pas des arbres. Les Spriggans se lèvent quand on leur tourne le dos. Abats-en {cible}. Je ne te dirai pas pourquoi je les hais.",
  texteNonCommence: "Tu ne m'as encore rien promis.",
  textePasFini: "{n}/{cible}. Pas assez.",
  texteTermine: "C'est fait. Prends ceci, et ne me pose pas de questions sur mon voile.",
  texteAccomplie: "Les Spriggans sont tombés. Retourne voir Isolde.",
  texteDette: "Je n'ai plus rien pour toi."
})

CHASSES.push({
  commande: 'demons', nom: "Frère Anselme", cible: 15, libelle: "Démons",
  types: ["acolyte:demon_warrior", "acolyte:demon_mage", "acolyte:demon_archer"],
  recompenses: [["minecraft:emerald", 16], ["minecraft:golden_apple", 2], ["irons_spellbooks:common_ink", 8]],
  cleEtat: 'chasse_demons_etat', cleKills: 'chasse_demons_kills',
  texteDejaFait: "Que la lumière te garde. Tu as fait plus que ta part.",
  texteEnCours: "{n}/{cible} démons renvoyés. Prie, et continue.",
  texteAccepte: "Des démons marchent sur nos terres : guerriers, archers et mages aux yeux de braise. Renvoie {cible} de ces créatures d'où elles viennent, et l'Église te bénira.",
  texteNonCommence: "Tu ne m'as encore rien promis.",
  textePasFini: "{n}/{cible}. Le mal rôde encore, mon enfant.",
  texteTermine: "Béni sois-tu. Prends ces pommes d'or et cette encre, offertes par notre ordre.",
  texteAccomplie: "Les démons ont reculé. Reviens voir Frère Anselme.",
  texteDette: "Notre ordre t'a déjà récompensé. Va en paix."
})

CHASSES.push({
  commande: 'spheres', nom: "Sire Évrard", cible: 15, libelle: "Sphères naines",
  types: ["monsterspellbooks:dwarven_sphere"],
  recompenses: [["minecraft:emerald", 14], ["minecraft:iron_ingot", 16]],
  cleEtat: 'chasse_spheres_etat', cleKills: 'chasse_spheres_kills',
  texteDejaFait: "Les montagnes sont sûres, grâce à toi.",
  texteEnCours: "{n}/{cible} sphères brisées. Il en roule encore dans les cols.",
  texteAccepte: "Dans les montagnes, d'étranges sphères de métal nain roulent et attaquent les voyageurs. Brise-en {cible} et rapporte-moi la nouvelle. Je te paierai en fer et en émeraudes.",
  texteNonCommence: "Tu ne m'as encore rien promis.",
  textePasFini: "{n}/{cible}. Les cols ne sont pas encore sûrs.",
  texteTermine: "Beau travail. Voici du fer et des émeraudes : un chevalier ne laisse jamais de dette.",
  texteAccomplie: "Les sphères sont brisées. Reviens voir Sire Évrard.",
  texteDette: "Ma parole est tenue, ami."
})

CHASSES.push({
  commande: 'jungle', nom: "Mira", cible: 12, libelle: "Bêtes de la jungle",
  types: ["monsterspellbooks:jungle_leapleaf", "monsterspellbooks:jungle_whisperer"],
  recompenses: [["minecraft:emerald", 14], ["irons_spellbooks:arcane_essence", 16]],
  cleEtat: 'chasse_jungle_etat', cleKills: 'chasse_jungle_kills',
  texteDejaFait: "La jungle me laisse passer, maintenant. Merci.",
  texteEnCours: "{n}/{cible} créatures de la jungle. Continue.",
  texteAccepte: "Les jungles cachent des bondisseurs de feuilles et des murmureurs qui t'appellent par ton nom. Tues-en {cible}, n'importe lesquels. Je n'aime pas qu'on m'appelle.",
  texteNonCommence: "Tu ne m'as encore rien promis.",
  textePasFini: "{n}/{cible}. J'entends encore les murmures.",
  texteTermine: "Silence dans les feuillages. Tiens, de l'essence arcanique et des émeraudes.",
  texteAccomplie: "Les créatures de la jungle sont tombées. Retourne voir Mira.",
  texteDette: "On ne me doit plus rien, et je ne te dois plus rien."
})

CHASSES.push({
  commande: 'endermen', nom: "Mathurin", cible: 15, libelle: "Endermen",
  types: ["endermanoverhaul:badlands_enderman", "endermanoverhaul:cave_enderman", "endermanoverhaul:coral_enderman", "endermanoverhaul:crimson_forest_enderman", "endermanoverhaul:dark_oak_enderman", "endermanoverhaul:desert_enderman", "endermanoverhaul:flower_fields_enderman", "endermanoverhaul:ice_spikes_enderman", "endermanoverhaul:mushroom_fields_enderman", "endermanoverhaul:savanna_enderman", "endermanoverhaul:snowy_enderman", "endermanoverhaul:swamp_enderman", "endermanoverhaul:warped_forest_enderman", "endermanoverhaul:windswept_hills_enderman"],
  recompenses: [["minecraft:emerald", 14], ["minecraft:ender_pearl", 8]],
  cleEtat: 'chasse_endermen_etat', cleKills: 'chasse_endermen_kills',
  texteDejaFait: "Plus un seul de ces grands échalas dans ma forêt. Merci bien.",
  texteEnCours: "{n}/{cible}. Il en reste qui me volent mes bûches.",
  texteAccepte: "Ces Endermen d'un genre nouveau, couverts de mousse, de sable ou de corail, me volent mes bûches et me fixent dans le noir. Abats-en {cible}. Mais ne les regarde pas dans les yeux, hein !",
  texteNonCommence: "Tu ne m'as encore rien promis.",
  textePasFini: "{n}/{cible}. Ma pile de bois diminue encore.",
  texteTermine: "Merci, l'ami. Prends ces perles qu'ils ont laissées, et quelques émeraudes.",
  texteAccomplie: "Les Endermen sont partis. Va voir Mathurin.",
  texteDette: "Je t'ai payé, mon gars. Mon bois, je le garde."
})

CHASSES.push({
  commande: 'elementaires', nom: "Frère Bastien", cible: 15, libelle: "Élémentaires",
  types: ["monsterspellbooks:redstone_elemental"],
  recompenses: [["minecraft:emerald", 12], ["minecraft:redstone", 32], ["irons_spellbooks:common_ink", 6]],
  cleEtat: 'chasse_elementaires_etat', cleKills: 'chasse_elementaires_kills',
  texteDejaFait: "La terre est apaisée. Merci, mon enfant.",
  texteEnCours: "{n}/{cible} élémentaires. La terre gronde encore.",
  texteAccepte: "Sous nos pieds, la redstone s'éveille et prend forme : des élémentaires qui crépitent et brûlent tout. Éteins-en {cible} et reviens prier avec moi.",
  texteNonCommence: "Tu ne m'as encore rien promis.",
  textePasFini: "{n}/{cible}. Continue, mon enfant.",
  texteTermine: "La terre te remercie. Voici de la redstone purifiée, des émeraudes et de l'encre.",
  texteAccomplie: "Les élémentaires sont éteints. Reviens voir Frère Bastien.",
  texteDette: "Tu as reçu ta part. Va en paix."
})

CHASSES.push({
  commande: 'dripplers', nom: "Clémence", cible: 10, libelle: "Dripplers",
  types: ["monsterspellbooks:drippler"],
  recompenses: [["irons_spellbooks:common_ink", 6], ["minecraft:cookie", 8]],
  cleEtat: 'chasse_dripplers_etat', cleKills: 'chasse_dripplers_kills',
  texteDejaFait: "Merci encore ! J'ai eu mon devoir grâce à toi.",
  texteEnCours: "{n}/{cible} Dripplers. Le professeur ramasse les copies bientôt !",
  texteAccepte: "Notre professeur veut un rapport sur les Dripplers, ces petites gouttes qui t'attaquent dehors... mais j'ai trop peur d'y aller seule. Tu peux en battre {cible} pour moi ? Je te donnerai mes encres.",
  texteNonCommence: "Tu ne m'as encore rien promis.",
  textePasFini: "{n}/{cible}... Il m'en faut encore pour mon rapport !",
  texteTermine: "Merci, merci ! Tiens, mes encres... et des cookies de la cantine.",
  texteAccomplie: "Assez de Dripplers pour le rapport ! Retourne voir Clémence.",
  texteDette: "Mon devoir est rendu. Merci encore !"
})

CHASSES.push({
  commande: 'grottols', nom: "Aurore", cible: 5, libelle: "Grottols",
  types: ["mowziesmobs:grottol"],
  recompenses: [["irons_spellbooks:common_ink", 8], ["minecraft:diamond", 2]],
  cleEtat: 'chasse_grottols_etat', cleKills: 'chasse_grottols_kills',
  texteDejaFait: "Grâce à toi j'ai eu la meilleure note de la classe !",
  texteEnCours: "{n}/{cible} Grottols. Ils se cachent bien, hein ?",
  texteAccepte: "Tu as déjà vu un Grottol ? C'est une petite bête de cristal qui vit au fond des grottes et s'enfuit dès qu'on l'approche. Pour mon exposé, il m'en faudrait {cible}. Je partage ce que je trouve !",
  texteNonCommence: "Tu ne m'as encore rien promis.",
  textePasFini: "{n}/{cible}. Ils sont rapides, ces petits !",
  texteTermine: "Incroyable ! Tiens, prends deux diamants qu'ils avaient sur le dos, et de l'encre.",
  texteAccomplie: "Assez de Grottols ! Va voir Aurore.",
  texteDette: "On est quittes ! Bonne chance pour tes cours."
})

CHASSES.push({
  commande: 'adorateurs', nom: "Lyra", cible: 8, libelle: "Adorateurs",
  types: ["cursespells:worshipper"],
  recompenses: [["irons_spellbooks:common_ink", 6], ["minecraft:emerald", 6]],
  cleEtat: 'chasse_adorateurs_etat', cleKills: 'chasse_adorateurs_kills',
  texteDejaFait: "Personne ne me suit plus le soir. Merci.",
  texteEnCours: "{n}/{cible} adorateurs. J'en ai encore vu un derrière l'Académie.",
  texteAccepte: "Des adorateurs encapuchonnés me suivent quand je rentre le soir. Ils prient quelque chose de maudit... Chasse-en {cible}, s'il te plaît. Je n'ose plus sortir.",
  texteNonCommence: "Tu ne m'as encore rien promis.",
  textePasFini: "{n}/{cible}. Ils sont encore là, je le sens.",
  texteTermine: "Merci... Voilà mon argent de poche et de l'encre. Je peux enfin dormir.",
  texteAccomplie: "Les adorateurs sont partis. Va voir Lyra.",
  texteDette: "Merci encore, vraiment."
})

CHASSES.push({
  commande: 'umvuthanas', nom: "Lise", cible: 10, libelle: "Umvuthanas",
  types: ["mowziesmobs:umvuthana", "mowziesmobs:umvuthana_raptor", "mowziesmobs:umvuthana_crane"],
  recompenses: [["irons_spellbooks:uncommon_ink", 2], ["minecraft:emerald", 8]],
  cleEtat: 'chasse_umvuthanas_etat', cleKills: 'chasse_umvuthanas_kills',
  texteDejaFait: "Mon carnet de terrain est complet, merci !",
  texteEnCours: "{n}/{cible} Umvuthanas. Il m'en faut plus !",
  texteAccepte: "En cours d'histoire, on étudie les Umvuthanas, ces guerriers masqués des savanes. Le professeur dit qu'ils sont dangereux... alors si tu en bats {cible}, je recopierai tes notes dans mon carnet. Et je te paierai !",
  texteNonCommence: "Tu ne m'as encore rien promis.",
  textePasFini: "{n}/{cible}. Mon carnet est encore à moitié vide.",
  texteTermine: "Génial ! Voilà de l'encre rare et des émeraudes. Le professeur va être bluffé.",
  texteAccomplie: "Assez d'Umvuthanas ! Retourne voir Lise.",
  texteDette: "Merci pour mon carnet !"
})

CHASSES.push({
  commande: 'nagas', nom: "Noémie", cible: 5, libelle: "Nagas",
  types: ["mowziesmobs:naga"],
  recompenses: [["irons_spellbooks:uncommon_ink", 3], ["minecraft:prismarine_shard", 16]],
  cleEtat: 'chasse_nagas_etat', cleKills: 'chasse_nagas_kills',
  texteDejaFait: "Ma collection d'écailles est complète !",
  texteEnCours: "{n}/{cible} Nagas. Elles volent haut, hein ?",
  texteAccepte: "Je collectionne les écailles de Naga, ces serpents ailés qui crachent de l'acide près des falaises de la mer. Tu peux en abattre {cible} pour moi ? Je te donnerai de l'encre.",
  texteNonCommence: "Tu ne m'as encore rien promis.",
  textePasFini: "{n}/{cible}. Il me manque encore des écailles !",
  texteTermine: "Waouh, merci ! Voilà de l'encre et des éclats de prismarine.",
  texteAccomplie: "Assez de Nagas ! Va voir Noémie.",
  texteDette: "Ma collection est complète, merci !"
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
