// Boss de zone (Block Factory's Bosses, etc.) : un seul exemplaire, retenu dans une zone, regen hors combat, respawn différé.
// Pour ajouter un boss : copie une entrée de BOSSES (nom unique). Chaque boss peut avoir une quête (champ "quete") liée à un PNJ.
//
// Règles communes :
//  - un seul exemplaire à la fois ; il n'apparaît que si un joueur est proche (chunks chargés) ;
//  - s'il sort de la zone : il perd sa cible et retourne au centre ; il oublie une cible qui quitte la zone ;
//  - sans cible depuis REGEN_DELAI_S secondes : il récupère REGEN_POURCENT % de sa vie max par seconde ;
//  - après sa mort : respawn au bout de respawnMin minutes (temps réel) ;
//  - quête : SEUL le joueur qui porte le coup fatal reçoit le crédit (et seulement s'il a accepté la quête).
var REGEN_DELAI_S = 5
var REGEN_POURCENT = 2
var DISTANCE_ACTIVE = 80   // le spawn n'est tenté que si un joueur est à moins de ... blocs du centre

var BOSSES = {
  helvar: {
    type: 'block_factorys_bosses:underworld_knight',
    x: -399, y: 68, z: 859,
    rayon: 30,
    respawnMin: 30,
    quete: {
      cle: 'helvar_quete',
      ftb: 'EA4EE95B2BA8EFDD',   // tâche « parler à ce PNJ » du chapitre FTB boss_pnj   // 0 = non commencée, 1 = acceptée, 2 = boss tué (rapport à faire), 3 = terminée
      pnj: 'Ser Aldric',
      accepter: "Tu es plus brave que je ne l'étais. Helvar se terre dans sa tanière de pierre, au cœur des bois. Venge-moi, voyageur... et que ma honte meure avec lui.",
      encours: "Helvar vit encore. Va, et ne reviens que lorsqu'il ne sera plus.",
      tue: "Tu as déjà abattu Helvar. Reviens me voir pour ta récompense.",
      fini: "Ma vengeance est accomplie. Je n'ai plus rien à te demander.",
      rien: "Tu ne m'as encore rien promis, voyageur.",
      vivant: "Helvar respire toujours. Je le sens. Va.",
      recompense: "Il est donc tombé... Merci. Prends ce savoir : c'est tout ce que ce vieux serment avait encore de précieux. Maintenant, je peux enfin me reposer.",
      annonceMort: 'Helvar est tombé sous ta lame. Un écu brisé gît dans ton sac : rapporte-le à Ser Aldric.',
      objet: 'kubejs:ecu_brise_helvar',   // preuve donnée au seul tueur, reprise par le PNJ au rapport
      sansObjet: "Où est l'écu brisé ? Sans lui, je ne puis croire que Helvar est tombé. Retrouve-le.",
      commandeRecompense: 'classe recompense_epique %joueur%'   // %joueur% = pseudo
    }
  },
  maledictus: {
    type: 'cataclysm:maledictus',
    x: 2684, y: 68, z: 1727,
    rayon: 30,
    respawnMin: 30,
    quete: {
      cle: 'maledictus_quete',
      ftb: '8E950D7F8AA48F7D',   // tâche « parler à ce PNJ » du chapitre FTB boss_pnj
      pnj: 'Hiro',
      accepter: "Une île, loin à l'est, que les marins évitent. On dit qu'elle renferme la Malédiction elle-même, devenue chair. Quiconque ose l'affronter est maudit pour l'éternité... Mais quelqu'un doit mettre fin à ce murmure. Si tu l'oses, abats-le, et rapporte-moi le sceau qu'il laissera derrière lui.",
      encours: "La Malédiction respire encore, voyageur. Je la sens jusque dans mes os. Va, et reviens quand elle se taira.",
      tue: "Tu as déjà abattu la créature. Reviens me voir avec le sceau, que je puisse enfin respirer.",
      fini: "La légende est close. Que ce qui doit être oublié le soit.",
      rien: "Tu ne m'as encore rien promis, voyageur.",
      vivant: "Je sens toujours la Malédiction sur cette île. Elle vit. Va.",
      recompense: "Alors c'est vrai... Elle est tombée. Que les âmes de ceux qu'elle a pris trouvent le repos. Prends ce savoir : c'est le prix de ton courage.",
      annonceMort: "Maledictus s'effondre. Un sceau fendu gît dans ton sac : rapporte-le à Hiro.",
      objet: 'kubejs:sceau_maledictus',
      sansObjet: "Où est le sceau ? Sans lui, je ne puis croire que la Malédiction est tombée. Retrouve-le.",
      commandeRecompense: 'classe recompense_epique %joueur%'
    }
  },
  skor: {
    type: 'block_factorys_bosses:yeti',
    x: 919, y: 227, z: 706,
    rayon: 30,
    aggro: 30,   // attaque d'office tout joueur (survie/aventure) à moins de 30 blocs
    nbtSpawn: 'BossPhase:0,is_enraged:2,BossBarVisible:1b',   // départ « éveillé » (comme un yéti de structure) : sans ça Skor reste en statue de glace
    respawnMin: 30,
    quete: {
      cle: 'skor_quete',
      ftb: '47FA1CB25306622A',   // tâche « parler à ce PNJ » du chapitre FTB boss_pnj
      pnj: 'Pip',
      accepter: "Ma petite sœur Léna est malade, et le seul remède que connaisse l'herboriste demande une corne de Skor, le yéti des neiges. Je suis trop petit pour l'affronter... Toi, peut-être. Rapporte-moi sa corne, s'il te plaît !",
      encours: "Skor est toujours là-haut dans les neiges... Léna s'affaiblit chaque jour. Je t'en supplie, rapporte-moi sa corne.",
      tue: "Tu as vaincu Skor ? Alors reviens vite me donner sa corne !",
      fini: "Léna va mieux, grâce à toi. Je n'oublierai jamais ce que tu as fait.",
      rien: "Tu ne m'as encore rien promis. Tu veux bien m'aider ?",
      vivant: "Skor vit encore, je le sens à ton air. Va, s'il te plaît.",
      recompense: "La corne ! Tu l'as eue ! Avec ça, Léna sera guérie. Merci, merci ! Prends ce savoir : c'est tout ce que j'ai à t'offrir.",
      annonceMort: "Skor s'effondre. Une corne givrée gît dans ton sac : rapporte-la à Pip.",
      objet: 'kubejs:corne_de_skor',
      sansObjet: "Où est la corne ? Sans elle, je ne peux pas faire le remède. Retrouve-la !",
      commandeRecompense: 'classe recompense_epique %joueur%'
    }
  },
  cumulonimbus: {
    type: 'legendary_monsters:cloud_golem',
    x: -125, y: 92, z: 1012,
    rayon: 40,   // il vole : zone un peu plus large
    aggro: 35,
    soigneSiSort: true,
    respawnMin: 30,
    escorte: { type: 'legendary_monsters:hovering_hurricane', nombre: 3, rayon: 6 },   // 3 Ouragans flottants l'entourent à chaque apparition
    quete: {
      cle: 'cumulonimbus_quete',
      ftb: '12A9728E260E75E3',   // tâche « parler à ce PNJ » du chapitre FTB boss_pnj
      pnj: 'Mistral',
      accepter: "Un ultime sort d'aéromancie, voilà ce que je cherche à confectionner. Il me manque un morceau de nuage... pas n'importe lequel : le cœur du Cumulonimbus, le colosse qui trône dans les hauteurs. Trois ouragans veillent sur lui. Abats-le et rapporte-moi un fragment de sa nuée.",
      encours: "Le Cumulonimbus gronde encore là-haut, je le sens dans le vent. Reviens quand il se sera tu.",
      tue: "Tu as vaincu le Cumulonimbus ? Alors vite, donne-moi ce fragment de nuée !",
      fini: "Mon sort prend forme grâce à toi. Que les vents te soient toujours favorables.",
      rien: "Tu ne m'as encore rien promis, voyageur.",
      vivant: "Le ciel gronde toujours : le colosse vit. Va.",
      recompense: "Ce fragment est parfait, léger comme l'air et lourd d'orage ! Prends ce savoir : c'est le prix de ton courage.",
      annonceMort: "Le Cumulonimbus se dissipe. Un fragment de nuée gît dans ton sac : rapporte-le à Mistral.",
      objet: 'kubejs:fragment_cumulonimbus',
      sansObjet: "Où est le fragment de nuée ? Sans lui, je ne puis croire que le colosse est tombé. Retrouve-le.",
      commandeRecompense: 'classe recompense_epique %joueur%'
    }
  },
  dragon: {
    type: 'block_factorys_bosses:infernal_dragon',
    x: 1642, y: 207, z: 1795,
    rayon: 45,   // plus large que les autres : le dragon vole et plonge
    aggro: 40,
    soigneSiSort: true,   // sort de sa zone (aggro perdue) : retour au centre ET vie remise au maximum
    remonteSous: 12,   // s'il descend de plus de 12 blocs sous son point d'apparition : retour au point d'apparition, sans dégâts de chute
    nbtSpawn: 'BossPhase:0,BossBarVisible:1b',   // départ sans cinématique d'intro (comme Skor) ; à ajuster si le dragon reste figé
    respawnMin: 30,
    quete: {
      cle: 'dragon_quete',
      ftb: 'DE2964C993B00F77',   // tâche « parler à ce PNJ » du chapitre FTB boss_pnj
      pnj: 'Ulrich',
      accepter: "*toux rauque* Le dragon... rôde encore là où le feu ne s'éteint jamais. Abats-le... et rapporte-moi une de ses écailles. Alors je saurai... que le cauchemar a une fin.",
      encours: "*souffle court* La bête vit encore... Je sens sa chaleur jusque dans mes os. Va...",
      tue: "*ses yeux brillent* Tu as abattu le dragon ?... Alors reviens vite me donner son écaille...",
      fini: "*un long soupir* Le cauchemar est fini... Je n'ai plus rien à te demander. Merci...",
      rien: "*toux* Tu ne m'as encore rien promis, voyageur...",
      vivant: "*il secoue la tête* Le dragon respire toujours... Je le sens. Va...",
      recompense: "*sa main tremble en saisissant l'écaille* Il est tombé... Ultgard peut enfin reposer. Prends ce savoir... c'est tout ce que j'ai à offrir.",
      annonceMort: "Le dragon s'effondre. Une écaille brûlante gît dans ton sac : rapporte-la à Ulrich.",
      objet: 'kubejs:ecaille_infernale',
      sansObjet: "*souffle court* Où est l'écaille ?... Sans elle, je ne puis croire que la bête est morte. Retrouve-la...",
      commandeRecompense: 'classe recompense_epique %joueur%'
    }
  }
}

var bzCompteur = 0
var bzAbsent = {}
var AABB_BZ = null
try { AABB_BZ = Java.loadClass('net.minecraft.world.phys.AABB') } catch (e) { console.error('[boss_zones] AABB indisponible : ' + e) }

function bzNiveau(server) {
  try { return server.getLevel('minecraft:overworld') } catch (e) {}
  try { return server.overworld() } catch (e2) {}
  return null
}
// ───────────── Difficulté : vie x5 et dégâts x1,5 (les seuils de phase restent en % de la vie max) ─────────────
var BZ_VIE_MULT = 5   // vie TOTALE visée (réelle + fictive) pour un joueur seul
var BZ_VIE_ATTR_MAX = 1000   // part portée par la vraie vie max (attribut) : plafond Minecraft 1024. Le reste est fait par la vie fictive.
var BZ_DEGATS_MULT = 1.5
// Échelle selon le groupe : chaque joueur AU-DELÀ DU PREMIER, présent dans la zone du boss (rayon + BZ_MARGE_GROUPE blocs), ajoute
// BZ_VIE_PAR_JOUEUR à la vie fictive et BZ_DEGATS_PAR_JOUEUR aux dégâts. BZ_JOUEURS_MAX borne le décompte.
// Ex. à 4 joueurs : vie x5 * (1 + 0,4*3) = x11 ; dégâts x1,5 * (1 + 0,15*3) = x2,2.
var BZ_VIE_PAR_JOUEUR = 0.4
var BZ_DEGATS_PAR_JOUEUR = 0.15
var BZ_JOUEURS_MAX = 6
var BZ_MARGE_GROUPE = 15
// Échelle selon l'armure PORTÉE par le joueur touché : chaque point d'armure ajoute BZ_ARMURE_COEF aux dégâts que le boss lui inflige
// (plafonné à BZ_ARMURE_PLAFOND). Ex. 20 points d'armure : +60 % avant réduction par l'armure.
var BZ_ARMURE_COEF = 0.03
var BZ_ARMURE_PLAFOND = 0.6
var bzNbJoueurs = {}   // uuid du boss -> joueurs présents dans sa zone (mis à jour à chaque tick)
function bzCompterJoueurs(server, b) {
  var n = 0
  try {
    var js = server.getPlayers()
    for (var i = 0; i < js.size(); i++) {
      var j = js.get(i)
      if (j.isSpectator() || !j.isAlive()) continue
      var dx = j.x - b.x, dz = j.z - b.z
      if (Math.sqrt(dx * dx + dz * dz) <= b.rayon + BZ_MARGE_GROUPE) n++
    }
  } catch (x) {}
  return Math.max(1, Math.min(BZ_JOUEURS_MAX, n))
}
function bzVieMult(e) {
  var n = bzNbJoueurs[String(e.uuid)] || 1
  var reel = 1
  try { var base = e.persistentData.getDouble('bz_buff3_base'); if (base > 0) reel = Math.max(1, e.maxHealth / base) } catch (x) {}
  return Math.max(1, BZ_VIE_MULT * (1 + BZ_VIE_PAR_JOUEUR * (n - 1)) / reel)
}
function bzDegatsMult(e) {
  var n = bzNbJoueurs[String(e.uuid)] || 1
  return BZ_DEGATS_MULT * (1 + BZ_DEGATS_PAR_JOUEUR * (n - 1))
}
function bzArmureMult(victime) {
  var a = 0
  try { a = victime.armorValue } catch (x) {}
  if (!(a >= 0)) { try { a = victime.getArmorValue() } catch (y) { a = 0 } }
  if (!(a >= 0)) a = 0
  return 1 + Math.min(BZ_ARMURE_PLAFOND, a * BZ_ARMURE_COEF)
}
// Vie x3 par suivi des PV : à chaque tick, si les PV du boss ont baissé (quelle que soit la source : coup, sort, effet, pourcentage de vie...),
// on lui rend les 2/3 de la perte. Indépendant des évènements de dégâts ; ignoré sous 0,2 PV (le mod annule alors la mort lui-même).
var bzHpPrec = {}
var bzLogsVie = 0
function bzVieFictive(e) {
  try {
    var id = String(e.uuid)
    var h = e.health
    var prec = bzHpPrec[id]
    if (prec === undefined) prec = h
    if (h < prec - 0.001 && h > 0.2 && e.isAlive()) {
      var rendu = (prec - h) * (1 - 1 / bzVieMult(e))
      var nh = Math.min(e.maxHealth, h + rendu)
      e.setHealth(nh)
      if (bzLogsVie < 15) { bzLogsVie++; console.info('[boss_zones] vie x3 : perte ' + (prec - h).toFixed(1) + ' -> ' + (prec - nh).toFixed(1) + ' (' + String(e.type) + ', ' + nh.toFixed(0) + '/' + e.maxHealth.toFixed(0) + ')') }
      h = nh
    }
    bzHpPrec[id] = h
  } catch (err) {}
}

// (L'ancien bonus d'attribut de vie max est retiré une fois par exemplaire pour ne pas se cumuler.)
function bzBuff(server, e) {
  try {
    var pd = e.persistentData
    if (pd.getInt('bz_buff3') === 1) return
    pd.putInt('bz_buff3', 1)
    var base = e.maxHealth
    var ratio = base > 0 ? e.health / base : 1
    pd.putDouble('bz_buff3_base', base)
    server.runCommandSilent('attribute ' + e.uuid + ' minecraft:generic.max_health modifier remove aetheris:boss_vie')
    var cible = Math.min(BZ_VIE_ATTR_MAX, base * BZ_VIE_MULT)
    if (cible > base) {
      server.runCommandSilent('attribute ' + e.uuid + ' minecraft:generic.max_health modifier add aetheris:boss_vie ' + (cible / base - 1) + ' add_multiplied_total')
    }
    var nouv = e.maxHealth * ratio
    try { if (Math.abs(nouv - e.health) > 0.5) e.setHealth(nouv) } catch (x) {}
    bzHpPrec[String(e.uuid)] = e.health
    console.info('[boss_zones] vie max de ' + String(e.type) + ' : ' + base.toFixed(0) + ' -> ' + e.maxHealth.toFixed(0) + ' (visé ' + cible.toFixed(0) + ')')
  } catch (err) { console.error('[boss_zones] buff : ' + err) }
}

// Hors combat = aucun coup reçu depuis 20 s ET aucun joueur (hors spectateur) à moins de rayon + 30 blocs (le dragon perd souvent sa cible en vol).
function bzHorsCombat(server, e, b) {
  try {
    var pd = e.persistentData
    if (pd.contains('bz_coup') && Date.now() - pd.getLong('bz_coup') < 20000) return false
    var js = server.getPlayers()
    for (var i = 0; i < js.size(); i++) {
      var j = js.get(i)
      if (j.isSpectator() || !j.isAlive()) continue
      var dx = j.x - b.x, dz = j.z - b.z
      if (Math.sqrt(dx * dx + dz * dz) <= b.rayon + 30) return false
    }
  } catch (x) {}
  return true
}

function bzCle(nom) { return 'boss_respawn_' + nom }

function bzBoss(niveau, b, marge) {
  var res = []
  if (!AABB_BZ) return res
  var liste = niveau.getEntitiesWithin(new AABB_BZ(b.x - marge, b.y - 60, b.z - marge, b.x + marge, b.y + 60, b.z + marge))
  for (var i = 0; i < liste.size(); i++) {
    var e = liste.get(i)
    if (String(e.type) === b.type) res.push(e)
  }
  return res
}

function bzJoueurProche(server, b) {
  var joueurs = server.getPlayers()
  for (var i = 0; i < joueurs.size(); i++) {
    var j = joueurs.get(i)
    var dx = j.x - b.x
    var dz = j.z - b.z
    if (Math.sqrt(dx * dx + dz * dz) <= DISTANCE_ACTIVE) return true
  }
  return false
}

function bzRamener(server, e, b) {
  try { e.setTarget(null) } catch (x) { try { e.target = null } catch (y) {} }
  server.runCommandSilent('tp ' + e.uuid + ' ' + b.x + ' ' + b.y + ' ' + b.z)
}

function bzSpawn(server, nom, b) {
  server.runCommandSilent('execute in minecraft:overworld run summon ' + b.type + ' ' + b.x + ' ' + b.y + ' ' + b.z +
    ' {Tags:["boss_zone","boss_' + nom + '"],PersistenceRequired:1b' + (b.nbtSpawn ? ',' + b.nbtSpawn : '') + '}')
  console.info('[boss_zones] ' + nom + ' apparaît en ' + b.x + ' ' + b.y + ' ' + b.z)
  bzEscorte(server, nom, b)
}

// Escorte (champ "escorte") : N mobs autour du boss à chaque apparition ; les anciens survivants sont retirés d'abord. Sans butin.
function bzRetirerEscorte(server, nom, b) {
  try {
    var niveau = bzNiveau(server)
    if (!niveau || !AABB_BZ) return
    var liste = niveau.getEntitiesWithin(new AABB_BZ(b.x - b.rayon - 40, b.y - 60, b.z - b.rayon - 40, b.x + b.rayon + 40, b.y + 60, b.z + b.rayon + 40))
    for (var i = 0; i < liste.size(); i++) {
      var e = liste.get(i)
      try { if (e.tags && e.tags.contains('escorte_' + nom)) e.discard() } catch (x) {}
    }
  } catch (err) {}
}
function bzEscorte(server, nom, b) {
  if (!b.escorte) return
  bzRetirerEscorte(server, nom, b)
  var n = b.escorte.nombre
  for (var i = 0; i < n; i++) {
    var ang = (2 * Math.PI * i) / n
    var ex = Math.round(b.x + Math.cos(ang) * b.escorte.rayon)
    var ez = Math.round(b.z + Math.sin(ang) * b.escorte.rayon)
    server.runCommandSilent('execute in minecraft:overworld run summon ' + b.escorte.type + ' ' + ex + ' ' + b.y + ' ' + ez +
      ' {Tags:["boss_escorte","escorte_' + nom + '"],PersistenceRequired:1b}')
  }
  console.info('[boss_zones] escorte de ' + nom + ' : ' + n + ' x ' + b.escorte.type)
}

// ───────────── Barres de vie : masquées pour les joueurs à plus de (rayon + 20) blocs du centre de la zone ─────────────
var BARRE_MARGE = 10
var bzCaches = {}   // "boss|joueur" -> true quand on a retiré le joueur de la barre
var bzErrBarre = false
console.info('[boss_zones] Masquage des barres de vie actif (marge ' + BARRE_MARGE + ' blocs au-delà du rayon).')

// Méthodes publiques des entités : stopSeenByPlayer retire le joueur de la barre de vie du boss, startSeenByPlayer le remet.
// Vision : un joueur voit la barre de vie du boss seulement s'il est dans la zone (rayon + marge), si le boss est dans son champ de vision
// (cône d'environ 70° autour de son regard) et s'il n'y a aucun bloc entre eux. Courte tolérance (0,5 s) pour éviter le clignotement.
var VUE_SEUIL_MONTRER = 0.35, VUE_SEUIL_GARDER = 0.2, VUE_TOLERANCE_MS = 500
var bzVu = {}
function bzVoit(j, e, cacheeActuellement) {
  var dx = e.x - j.x, dy = (e.y + e.getBbHeight() / 2) - j.eyeY, dz = e.z - j.z
  var n = Math.sqrt(dx * dx + dy * dy + dz * dz)
  if (n < 0.01) return true
  var l = j.getLookAngle()
  var dot = (dx * l.x() + dy * l.y() + dz * l.z()) / n
  if (dot < (cacheeActuellement ? VUE_SEUIL_MONTRER : VUE_SEUIL_GARDER)) return false
  try { return !!j.hasLineOfSight(e) } catch (x) { return true }
}
function bzAfficher(j, e, dansZone, cle) {
  var cachee = !!bzCaches[cle]
  var voit = dansZone && bzVoit(j, e, cachee)
  var t = Date.now()
  if (voit) bzVu[cle] = t
  var montrer = voit || (dansZone && (t - (bzVu[cle] || 0) < VUE_TOLERANCE_MS))
  if (!montrer) { e.stopSeenByPlayer(j); bzCaches[cle] = true }
  else if (cachee) { e.startSeenByPlayer(j); delete bzCaches[cle] }
}

function bzGererBarres(server, e, b) {
  var joueurs = server.getPlayers()
  for (var i = 0; i < joueurs.size(); i++) {
    var j = joueurs.get(i)
    var dx = j.x - b.x
    var dz = j.z - b.z
    var dansZone = Math.sqrt(dx * dx + dz * dz) <= b.rayon + BARRE_MARGE
    var cle = String(e.uuid) + '|' + String(j.uuid)
    try { bzAfficher(j, e, dansZone, cle) } catch (x) {
      if (!bzErrBarre) { bzErrBarre = true; console.error('[boss_zones] barres : ' + x) }
    }
  }
}

// Masquage rapide des barres (toutes les 2 ticks) : un boss qui revient dans le champ d'un joueur le réajoute aussitôt, on le retire donc sans attendre.
var bzCompteurBarre = 0
var bzEntitesBarre = {}
ServerEvents.tick(function (event) {
  bzCompteurBarre++
  if (bzCompteurBarre % 2 !== 0) return
  try {
    var niveau = bzNiveau(event.server)
    if (!niveau || !AABB_BZ) return
    var rafraichir = bzCompteurBarre % 20 === 0
    for (var nom in BOSSES) {
      var b = BOSSES[nom]
      if (rafraichir || !bzEntitesBarre[nom]) bzEntitesBarre[nom] = bzBoss(niveau, b, b.rayon + 200)
      var liste = bzEntitesBarre[nom]
      for (var i = 0; i < liste.length; i++) {
        var e = liste[i]
        if (!e.isAlive()) continue
        try { bzGererBarres(event.server, e, b) } catch (x) {}
      }
    }
  } catch (err) {
    if (!bzErrBarre) { bzErrBarre = true; console.error('[boss_zones] barres rapides : ' + err) }
  }
})

// Fin de combat : timer de respawn + crédit de quête au dernier joueur ayant frappé (une seule fois par exemplaire)
function bzMort(server, nom, b, e, src) {
  var pd = e.persistentData
  if (pd.getInt('bz_mort') === 1) return
  pd.putInt('bz_mort', 1)
  bzNettoyages.push({ x: Math.round(e.x), y: Math.round(e.y), z: Math.round(e.z), t: 4 })
  server.persistentData.putLong(bzCle(nom), Date.now() + b.respawnMin * 60 * 1000)
  var cle = String(e.uuid)
  var tueur = src ? src.actual : null
  if (!tueur || !tueur.isPlayer()) {
    var nomT = bzDernierCoup[cle]
    tueur = nomT ? server.getPlayer(nomT) : null
  }
  delete bzDernierCoup[cle]
  console.info('[boss_zones] ' + nom + ' vaincu' + (tueur ? ' par ' + tueur.username : ' (aucun joueur identifié)'))
  try { if (typeof autelBossTue === 'function') autelBossTue(server, nom) } catch (eA) { console.error('[boss_zones] autel : ' + eA) }   // étape Force de l'Autel du Sceau
  if (!b.quete || !tueur || !tueur.isPlayer()) return
  if (tueur.persistentData.getInt(b.quete.cle) === 1) {
    tueur.persistentData.putInt(b.quete.cle, 2)
    if (b.quete.objet) tueur.give(Item.of(b.quete.objet, 1))
    tueur.tell(Text.gold(b.quete.annonceMort))
  }
}

// Boss qui meurt « en animation » (Yéti : état DEATH, jamais de vraie mort avant la fin de la cinématique)
function bzEnMort(e) {
  try {
    var n = e.nbt
    return String(n.getString('State')) === 'DEATH' || n.getInt('is_enraged') === 6
  } catch (x) { return false }
}

var bzDernierCoup = {}

ServerEvents.tick(function (event) {
  bzCompteur++
  if (bzCompteur % 5 !== 0) return
  if (bzNettoyages.length > 0) {
    var nv = bzNiveau(event.server)
    for (var kk = bzNettoyages.length - 1; kk >= 0; kk--) {
      var nn = bzNettoyages[kk]
      try { bzNettoyer(nv, nn.x, nn.y, nn.z) } catch (x) {}
      nn.t--
      if (nn.t <= 0) bzNettoyages.splice(kk, 1)
    }
  }
  try {
    var server = event.server
    var niveau = bzNiveau(server)
    if (!niveau || !AABB_BZ) return
    for (var nom in BOSSES) {
      var b = BOSSES[nom]
      // Zone, aggro et régénération
      var proches = bzBoss(niveau, b, b.rayon + 40)
      for (var i = 0; i < proches.length; i++) {
        var e = proches[i]
        if (bzEnMort(e)) { bzMort(server, nom, b, e, null); continue }
        if (b.remonteSous && e.y < b.y - b.remonteSous) {
          try { e.setTarget(null) } catch (x) {}
          server.runCommandSilent('tp ' + e.uuid + ' ' + b.x + ' ' + b.y + ' ' + b.z)
          try { e.fallDistance = 0 } catch (x) {}
          try { e.setDeltaMovement(0, 0, 0) } catch (x) {}
          console.info('[boss_zones] ' + nom + ' était tombé trop bas : retour au point d\'apparition, sans soin.')
          continue
        }
        bzBuff(server, e)
        var dx = e.x - b.x
        var dz = e.z - b.z
        var cible = null
        try { cible = e.getTarget() } catch (x) {}
        if (Math.sqrt(dx * dx + dz * dz) > b.rayon) {
          bzRamener(event.server, e, b)
          if (b.soigneSiSort) {
            try { e.setHealth(e.maxHealth) } catch (x) { try { e.health = e.maxHealth } catch (y) {} }
            console.info('[boss_zones] ' + nom + ' est sorti de sa zone : retour au centre, vie restaurée.')
          }
          cible = null
        } else if (cible) {
          var tx = cible.x - b.x
          var tz = cible.z - b.z
          if (Math.sqrt(tx * tx + tz * tz) > b.rayon) {
            try { e.setTarget(null) } catch (x) {}
            cible = null
          }
        }
        // aggro automatique : le boss prend pour cible le joueur le plus proche dans le rayon "aggro" (si défini)
        if (b.aggro && !cible && bzCompteur % 10 === 0) {
          try {
            var lesJoueurs = event.server.getPlayers()
            var proche = null, dmin = b.aggro * b.aggro
            for (var q = 0; q < lesJoueurs.size(); q++) {
              var jq = lesJoueurs.get(q)
              if (jq.isSpectator() || jq.isCreative() || !jq.isAlive()) continue
              var ax = jq.x - e.x, ay = jq.y - e.y, az = jq.z - e.z
              var d2 = ax * ax + ay * ay + az * az
              var zx = jq.x - b.x, zz = jq.z - b.z
              if (zx * zx + zz * zz > b.rayon * b.rayon) continue
              if (d2 <= dmin) { dmin = d2; proche = jq }
            }
            if (proche) { e.setTarget(proche); cible = proche }
          } catch (x) { console.error('[boss_zones] aggro : ' + x) }
        }
        if (bzCompteur % 10 === 0) { try { bzGererBarres(event.server, e, b) } catch (x) { console.error('[boss_zones] barres : ' + x) } }
        // sans cible depuis un moment : régénération progressive (toutes les secondes)
        var pd = e.persistentData
        if (cible) {
          pd.putInt('bz_sans_cible', 0)
        } else {
          var n = pd.getInt('bz_sans_cible') + 1
          pd.putInt('bz_sans_cible', n)
          if (n >= REGEN_DELAI_S * 4 && bzCompteur % 20 === 0 && bzHorsCombat(event.server, e, b)) {
            try { e.heal(e.maxHealth * REGEN_POURCENT / 100) } catch (x) {}
          }
        }
      }
      // Spawn (toutes les 5 s)
      if (bzCompteur % 100 !== 0) continue
      if (!bzJoueurProche(server, b)) { bzAbsent[nom] = 0; continue }
      if (bzBoss(niveau, b, b.rayon + 40).length > 0) { bzAbsent[nom] = 0; continue }
      var d = server.persistentData
      var quand = d.contains(bzCle(nom)) ? d.getLong(bzCle(nom)) : 0
      if (Date.now() < quand) continue
      bzAbsent[nom] = (bzAbsent[nom] || 0) + 1
      if (bzAbsent[nom] < 2) continue // laisse aux entités le temps de se charger
      bzAbsent[nom] = 0
      bzSpawn(server, nom, b)
    }
  } catch (err) {
    console.error('[boss_zones] ' + err)
  }
})

// Mémorise le dernier joueur ayant blessé un boss de zone (la mort du Yéti arrive après son animation, sans source)
try {
  NativeEvents.onEvent(
    Java.loadClass('net.neoforged.neoforge.event.entity.living.LivingIncomingDamageEvent'),
    function (ev) {
      try {
        var cible = ev.getEntity()
        var att = null
        try { att = ev.getSource().actual } catch (e0) {}
        if (!att || !att.isPlayer()) return
        if (!cible.tags || !cible.tags.contains('boss_zone')) return
        bzDernierCoup[String(cible.uuid)] = String(att.username)
      } catch (e) {}
    }
  )
} catch (e) { console.error('[boss_zones] suivi des coups indisponible : ' + e) }

// Dégâts x1,5 : tout coup dont l'auteur est un boss de zone (corps à corps, boules de feu, souffle... si l'auteur est renseigné)
try {
  NativeEvents.onEvent(
    Java.loadClass('net.neoforged.neoforge.event.entity.living.LivingIncomingDamageEvent'),
    function (ev) {
      try {
        try { var tg = ev.getEntity(); if (tg.tags && tg.tags.contains('boss_zone')) tg.persistentData.putLong('bz_coup', Date.now()) } catch (e1) {}
        try {
          var tg2 = ev.getEntity()
          if (tg2.tags && tg2.tags.contains('boss_zone')) {
            var id = ''
            try { id = String(ev.getSource().type().msgId()) } catch (e2) { try { id = String(ev.getSource().getMsgId()) } catch (e3) {} }
            if (id === 'fall' || id === 'outOfWorld' || id === 'inWall' || id === 'flyIntoWall') {
              for (var n in BOSSES) if (BOSSES[n].remonteSous && tg2.tags.contains('boss_' + n)) { ev.setCanceled(true); return }
            }
          }
        } catch (e4) {}
        var att = null
        try { att = ev.getSource().actual } catch (e0) {}
        if (!att || !att.tags || !att.tags.contains('boss_zone')) return
        var mult = bzDegatsMult(att)
        try { if (ev.getEntity().isPlayer()) mult = mult * bzArmureMult(ev.getEntity()) } catch (e5) {}
        ev.setAmount(ev.getAmount() * mult)
      } catch (e) {}
    }
  )
} catch (e) { console.error('[boss_zones] dégâts x1,5 indisponibles : ' + e) }

// Aucun butin pour les boss DE ZONE (seul l'objet de quête est donné). Les mêmes mobs hors de ces zones (structures d'origine) gardent leur butin normal.
function bzEstBossDeZone(e) {
  try {
    var t = String(e.type)
    for (var nom in BOSSES) {
      var b = BOSSES[nom]
      if (b.type !== t) continue
      var dx = e.x - b.x, dz = e.z - b.z
      if (Math.sqrt(dx * dx + dz * dz) <= b.rayon + 40) return true
    }
  } catch (x) {}
  return false
}
try {
  NativeEvents.onEvent(
    Java.loadClass('net.neoforged.neoforge.event.entity.living.LivingDropsEvent'),
    function (ev) {
      try { if (bzEstBossDeZone(ev.getEntity())) ev.setCanceled(true) } catch (e) {}
      try { var tg = ev.getEntity().tags; if (tg && tg.contains('boss_escorte')) ev.setCanceled(true) } catch (e) {}
    }
  )
} catch (e) { console.error('[boss_zones] suppression du loot indisponible : ' + e) }

// Efface les objets au sol lâchés par le boss (sans « Thrower » : les objets jetés par un joueur sont épargnés)
function bzNettoyer(niveau, x, y, z) {
  if (!niveau || !AABB_BZ) return
  var liste = niveau.getEntitiesWithin(new AABB_BZ(x - 14, y - 14, z - 14, x + 14, y + 14, z + 14))
  for (var i = 0; i < liste.size(); i++) {
    var it = liste.get(i)
    if (String(it.type) !== 'minecraft:item') continue
    try { if (it.nbt.contains('Thrower')) continue } catch (x1) {}
    it.discard()
  }
}

var bzNettoyages = []   // butin parasite (lâché hors événement) à effacer autour des boss de zone morts

// Mort d'un boss : timer de respawn + crédit de quête au SEUL joueur qui a porté le coup fatal
EntityEvents.death(function (event) {
  try {
    var type = String(event.entity.type)
    for (var nom in BOSSES) {
      var b = BOSSES[nom]
      if (b.type !== type) continue
      var dx = event.entity.x - b.x
      var dz = event.entity.z - b.z
      if (Math.sqrt(dx * dx + dz * dz) > b.rayon + 40) continue   // un autre exemplaire, hors zone : ignoré
      bzMort(event.server, nom, b, event.entity, event.source)
    }
  } catch (err) {
    console.error('[boss_zones] mort : ' + err)
  }
})

// ───────────── Quêtes de boss (dialogue du PNJ : /bossquete accepter|rendre <boss> <joueur>) ─────────────
function bqDire(joueur, q, texte) {
  joueur.tell(Text.gold('[' + q.pnj + '] ').append(Text.of(texte).gray()))
}

// Quête FTB « parler à tous les PNJ de quête de boss » : tout contact avec les boutons de quête du PNJ valide sa tâche.
function bqFtb(joueur, q) {
  try { if (q.ftb) joueur.server.runCommandSilent('ftbquests change_progress ' + joueur.username + ' complete ' + q.ftb) } catch (e) {}
}

function bqAccepter(joueur, q) {
  bqFtb(joueur, q)
  var d = joueur.persistentData
  var etat = d.getInt(q.cle)
  if (etat === 0) { d.putInt(q.cle, 1); bqDire(joueur, q, q.accepter) }
  else if (etat === 1) bqDire(joueur, q, q.encours)
  else if (etat === 2) bqDire(joueur, q, q.tue)
  else bqDire(joueur, q, q.fini)
  return 1
}

function bqRendre(server, joueur, q) {
  bqFtb(joueur, q)
  var d = joueur.persistentData
  var etat = d.getInt(q.cle)
  if (etat === 0) bqDire(joueur, q, q.rien)
  else if (etat === 1) bqDire(joueur, q, q.vivant)
  else if (etat === 3) bqDire(joueur, q, q.fini)
  else if (q.objet && joueur.inventory.count(q.objet) < 1) bqDire(joueur, q, q.sansObjet)
  else {
    if (q.objet) server.runCommandSilent('clear ' + joueur.username + ' ' + q.objet + ' 1')
    d.putInt(q.cle, 3)
    server.runCommandSilent(q.commandeRecompense.replace('%joueur%', joueur.username))
    bqDire(joueur, q, q.recompense)
  }
  return 1
}

// ───────── Aucun autre mob ne naît dans les zones de boss (naturel, spawner, structure, chunk...) ─────────
// Rayon du boss + 10 blocs, 60 blocs de haut/bas. Restent possibles : /summon (script) et œufs de spawn.
try {
  NativeEvents.onEvent(
    Java.loadClass('net.neoforged.neoforge.event.entity.living.FinalizeSpawnEvent'),
    function (ev) {
      try {
        var e = ev.getEntity()
        var type = String(ev.getSpawnType())
        if (type === 'COMMAND' || type === 'SPAWN_EGG') return
        if (String(e.type).indexOf('easy_npc:') === 0) return
        for (var nom in BOSSES) {
          var b = BOSSES[nom]
          var dx = e.x - b.x, dz = e.z - b.z
          if (Math.sqrt(dx * dx + dz * dz) <= b.rayon + 10 && Math.abs(e.y - b.y) <= 60) { ev.setSpawnCancelled(true); return }
        }
      } catch (x) {}
    }
  )
  console.info('[boss_zones] Aucun autre mob ne peut apparaître dans les zones de boss.')
} catch (e) { console.error('[boss_zones] blocage des apparitions indisponible : ' + e) }

ServerEvents.commandRegistry(function (event) {
  var Commands = event.commands
  var Arguments = event.arguments
  var parPnj = function (source) {
    try { if (source.hasPermission(2)) return true } catch (e) {}
    try { var ent = source.entity; return !!ent && String(ent.type).indexOf('easy_npc:') === 0 } catch (e) { return false }
  }
  var estModo = function (source) { return source.hasPermission(2) }
  var quete = function (nom) { var b = BOSSES[nom]; return b ? b.quete : null }

  var racine = Commands.literal('bossquete')
  var accepter = Commands.literal('accepter').requires(parPnj)
  var rendre = Commands.literal('rendre').requires(parPnj)
  var reset = Commands.literal('reset').requires(estModo)
  for (var nom in BOSSES) {
    if (!BOSSES[nom].quete) continue
    ;(function (n) {
      accepter = accepter.then(Commands.literal(n).then(Commands.argument('joueur', Arguments.PLAYER.create(event))
        .executes(function (ctx) { return bqAccepter(Arguments.PLAYER.getResult(ctx, 'joueur'), quete(n)) })))
      rendre = rendre.then(Commands.literal(n).then(Commands.argument('joueur', Arguments.PLAYER.create(event))
        .executes(function (ctx) { return bqRendre(ctx.source.server, Arguments.PLAYER.getResult(ctx, 'joueur'), quete(n)) })))
      reset = reset.then(Commands.literal(n).then(Commands.argument('joueur', Arguments.PLAYER.create(event))
        .executes(function (ctx) { Arguments.PLAYER.getResult(ctx, 'joueur').persistentData.putInt(quete(n).cle, 0); return 1 })))
    })(nom)
  }
  event.register(racine.then(accepter).then(rendre).then(reset))

  // /boss respawn <nom> : fait réapparaître le boss tout de suite (op) ; supprime l'exemplaire actuel.
  var respawn = Commands.literal('respawn').requires(estModo)
  for (var nom2 in BOSSES) {
    ;(function (n) {
      respawn = respawn.then(Commands.literal(n).executes(function (ctx) {
        var server = ctx.source.server
        var b = BOSSES[n]
        var niveau = bzNiveau(server)
        var liste = niveau ? bzBoss(niveau, b, b.rayon + 40) : []
        for (var i = 0; i < liste.length; i++) liste[i].discard()
        server.persistentData.putLong(bzCle(n), 0)
        bzSpawn(server, n, b)
        return 1
      }))
    })(nom2)
  }
  // /boss clear <nom> : supprime le boss sans mort, sans butin ni crédit de quête ; il réapparaît après respawnMin minutes (op).
  var clear = Commands.literal('clear').requires(estModo)
  for (var nom3 in BOSSES) {
    ;(function (n) {
      clear = clear.then(Commands.literal(n).executes(function (ctx) {
        var server = ctx.source.server
        var b = BOSSES[n]
        var niveau = bzNiveau(server)
        var liste = niveau ? bzBoss(niveau, b, b.rayon + 40) : []
        for (var i = 0; i < liste.length; i++) liste[i].discard()
        server.persistentData.putLong(bzCle(n), Date.now() + b.respawnMin * 60 * 1000)
        bzRetirerEscorte(server, n, b)
        return 1
      }))
    })(nom3)
  }
  event.register(Commands.literal('boss').then(respawn).then(clear))
})

// Suivi de la vie x3 : à chaque tick (pas toutes les 5 ticks) pour ne rater aucune perte de PV.
ServerEvents.tick(function (event) {
  try {
    var niveau = bzNiveau(event.server)
    if (!niveau || !AABB_BZ) return
    for (var nom in BOSSES) {
      var b = BOSSES[nom]
      var liste = bzBoss(niveau, b, b.rayon + 40)
      if (liste.length > 0) {
        var nb = bzCompterJoueurs(event.server, b)
        for (var k = 0; k < liste.length; k++) bzNbJoueurs[String(liste[k].uuid)] = nb
      }
      for (var i = 0; i < liste.length; i++) bzVieFictive(liste[i])
    }
  } catch (err) {}
})
