// [perf] mesure du temps des handlers : écrit « [perf] nom : X ms en 60 s » dans la console quand un handler dépasse 80 ms cumulées par minute
var perfWrap = (typeof perfWrap === 'function') ? perfWrap : (function () {
  var SYS = { nanoTime: function () { return Date.now() * 1e6 } }   // java.lang.System est interdit par le filtre de classes de KubeJS ; l'erreur de quantification s'annule en moyenne
  return function (nom, fn) {
    var cumul = 0, n = 0, debut = SYS.nanoTime()
    return function (ev) {
      var t0 = SYS.nanoTime()
      try { return fn(ev) } finally {
        var t1 = SYS.nanoTime()
        cumul += t1 - t0; n++
        if (t1 - debut >= 6e10) {
          var ms = cumul / 1e6
          if (ms > 80) console.info('[perf] ' + nom + ' : ' + ms.toFixed(0) + ' ms en 60 s (' + n + ' appels, ' + (ms / n).toFixed(3) + ' ms par appel)')
          cumul = 0; n = 0; debut = t1
        }
      }
    }
  }
})()
// Mobs hostiles de plus en plus puissants à mesure qu'on s'éloigne du spawn du monde
// (le centre est celui défini par /setworldspawn). Les bonus sont posés une fois, à l'apparition du mob.
// Tout se règle dans l'objet MD ci-dessous.

var MD = {
  PALIER: 500,              // distance (blocs) pour gagner un palier
  COULEUR_LVL: '#E04848',   // couleur du niveau [Lvl N] (rouge)
  COULEUR_NOM: '#FFFFFF',   // couleur du nom du mob (blanc) ; les titres restent en bordeaux
  ZONE_NIVEAU: 1000,        // distance (blocs) d'une zone de niveaux (esthétique, sans lien avec les bonus)
  NIVEAUX_PAR_ZONE: 10,     // zone 0 : niveau 1 à 10, zone 1 : 11 à 20, zone 2 : 21 à 30...
  TIRAGES: 5,               // nombre de valeurs possibles du bonus dans un palier (du minimum au maximum)
  VIE: 0.015,               // bonus de vie max d'un palier (1,5 %) ; dans le palier N le mob reçoit entre N et N+1 fois cette valeur
  DEGATS: 0.015,            // idem pour les dégâts
  ARMURE: 0.1,              // idem pour l'armure (points)
  PLAFOND: 3.0,             // plafond du bonus vie / dégâts : +300 %
  PLAFOND_ARMURE: 10,       // plafond du bonus d'armure (points)
  FACTEUR_BOSS: 0.5,        // part du bonus reçue par les boss (1 = identique aux autres mobs ; 0.5 = moitié). Les boss de ZONE (tags boss_zone / pirate_zone) sont exclus.
  SEUIL_BOSS_VIE: 150,      // un mob avec au moins autant de vie de base est traité comme un boss
  // Dimensions concernées. mult = multiplicateur du bonus ; centre = point de départ (null = spawn de l'Overworld).
  // Nether : distance mesurée en blocs du Nether depuis les coordonnées du spawn de l'Overworld, bonus divisé par 8.
  DIMS: {
    'minecraft:overworld': { mult: 1, centre: null },
    'minecraft:the_nether': { mult: 0.125, centre: null },
    'minecraft:the_end': { mult: 1, centre: { x: 0, z: 0 } }   // End : depuis l'île centrale
  },
  LUEUR_BONUS: 3.0,         // le mob brille quand son bonus de vie atteint cette valeur (0 = jamais)
  EXCLUS: ['aetheris_cthulhu:cthulhu'],  // mobs jamais modifiés par la distance (boss d'événement)
  BOSS_IDS: [
    'minecraft:ender_dragon', 'minecraft:wither', 'minecraft:warden', 'minecraft:elder_guardian',
    'cataclysm:ender_guardian', 'cataclysm:netherite_monstrosity', 'cataclysm:ignis', 'cataclysm:the_harbinger',
    'cataclysm:the_leviathan', 'cataclysm:ancient_remnant', 'cataclysm:scylla', 'cataclysm:maledictus'
  ],
  // Titres affichés au-dessus des mobs selon leur bonus de vie (0,05 = +5 %) ; avant = true : titre placé avant le nom
  TITRES: [
    { bonus: 0.05, titre: 'Aguerri', couleur: 'yellow', avant: false },
    { bonus: 0.25, titre: 'Vétéran', couleur: 'gold', avant: true },
    { bonus: 1.0, titre: 'Redoutable', couleur: 'red', avant: false },
    { bonus: 3.0, titre: 'Ancestral', couleur: 'dark_red', avant: false }
  ]
}

var MD_TAG = 'mcrp_distance'
var MD_J = null // classes Java, chargées au premier usage

function mdInit() {
  if (MD_J) return
  MD_J = {}
  MD_J.Attr = Java.loadClass('net.minecraft.world.entity.ai.attributes.Attributes')
  MD_J.RL = Java.loadClass('net.minecraft.resources.ResourceLocation')
  MD_J.Modif = Java.loadClass('net.minecraft.world.entity.ai.attributes.AttributeModifier')
  MD_J.Op = Java.loadClass('net.minecraft.world.entity.ai.attributes.AttributeModifier$Operation')
  try { MD_J.Enemy = Java.loadClass('net.minecraft.world.entity.monster.Enemy') } catch (e) { MD_J.Enemy = null }
  try {
    var Registries = Java.loadClass('net.minecraft.core.registries.Registries')
    var TagKey = Java.loadClass('net.minecraft.tags.TagKey')
    MD_J.TagBoss = TagKey.create(Registries.ENTITY_TYPE, MD_J.RL.parse('c:bosses'))
  } catch (e2) { MD_J.TagBoss = null }
}

// Accès défensif : propriété (KubeJS) puis méthode.
function mdVal(o, prop, getter) {
  var v
  try { v = o[prop] } catch (e) {}
  if (v !== undefined && v !== null && typeof v !== 'function') return v
  try { return o[getter]() } catch (e2) {}
  return null
}

function mdIdDimension(niveau) {
  var s = String(mdVal(niveau, 'dimension', 'dimension'))
  var m = s.match(/\/ ([^\]]+)\]/)
  return m ? m[1] : s
}

// Identifiant du mob ("minecraft:zombie"). Dans KubeJS, ent.type est déjà cet identifiant (texte).
// Surtout ne pas passer par registre.getKey(...) : il renvoie « cochon » pour tout ce qu'il ne reconnaît pas.
function mdIdMob(ent) {
  var id = ''
  try { id = String(ent.type) } catch (e) {}
  if (/^[a-z0-9_.-]+:[a-z0-9_./-]+$/.test(id)) return id
  try { id = String(ent.getType()) } catch (e2) {}
  if (/^[a-z0-9_.-]+:[a-z0-9_./-]+$/.test(id)) return id
  return ''
}

function mdHostile(ent) {
  try { if (MD_J.Enemy && ent instanceof MD_J.Enemy) return true } catch (e) {}
  try { return String(ent.getType().getCategory()).toLowerCase() === 'monster' } catch (e2) {}
  try { return String(ent.type.category).toLowerCase() === 'monster' } catch (e3) {}
  return false
}

function mdBoss(ent, idType) {
  if (MD.BOSS_IDS.indexOf(idType) !== -1) return true
  try {
    if (MD_J.TagBoss && idType) {
      var reg = Java.loadClass('net.minecraft.core.registries.BuiltInRegistries').ENTITY_TYPE
      var typeObj = reg.get(MD_J.RL.parse(idType))
      if (typeObj && typeObj.is(MD_J.TagBoss)) return true
    }
  } catch (e) {}
  try { if (Number(ent.maxHealth) >= MD.SEUIL_BOSS_VIE) return true } catch (e2) {}
  return false
}

// Nombre de paliers atteints à une distance donnée.
function mdPalier(distance) {
  return Math.floor(distance / MD.PALIER)
}

// Bonus pour le palier z (0 = de 0 à 500 blocs) et le tirage k (0 à TIRAGES-1).
// Dans le palier z, le bonus va de z x taux (k = 0) à (z + 1) x taux (k = max), en TIRAGES valeurs régulières.
// mult = multiplicateur de la dimension (Nether : 1/8).
function mdBonus(z, k, boss, mult) {
  var f = boss ? MD.FACTEUR_BOSS : 1
  var m = mult === undefined ? 1 : mult
  var part = z + k / (MD.TIRAGES - 1)
  return {
    vie: Math.min(part * MD.VIE * m * f, MD.PLAFOND * f),
    degats: Math.min(part * MD.DEGATS * m * f, MD.PLAFOND * f),
    armure: Math.min(part * MD.ARMURE * m * f, MD.PLAFOND_ARMURE * f)
  }
}

function mdPoser(ent, holder, id, valeur, operation) {
  if (valeur <= 0) return false
  var inst = ent.getAttribute(holder)
  if (!inst) return false
  var rl = MD_J.RL.parse('classes_rp:distance_' + id)
  try { if (inst.hasModifier(rl)) return false } catch (e) {}
  inst.addPermanentModifier(new MD_J.Modif(rl, valeur, operation))
  return true
}

// Niveau affiché : tiré au hasard dans la zone de 1000 blocs du mob (0-1000 : 1 à 10, 1000-2000 : 11 à 20...).
function mdNiveau(distance) {
  var zone = Math.floor(distance / MD.ZONE_NIVEAU)
  var min = zone * MD.NIVEAUX_PAR_ZONE + 1
  var max = (zone + 1) * MD.NIVEAUX_PAR_ZONE
  return min + Math.floor(Math.random() * (max - min + 1))
}

function mdTitre(bonusVie) {
  var choix = null
  for (var i = 0; i < MD.TITRES.length; i++) {
    if (bonusVie >= MD.TITRES[i].bonus) choix = MD.TITRES[i]
  }
  return choix
}

// Texte en rouge bordeaux (#800020) ; à défaut, rouge foncé.
function mdBordeaux(composant) {
  try { return composant.color('#800020') } catch (e) {}
  try { return composant.color('dark_red') } catch (e2) {}
  return composant
}

// Nom du mob en gras (couleur COULEUR_NOM) : clé de traduction standard déduite de l'identifiant
// ("minecraft:zombie" -> entity.minecraft.zombie).
function mdNomMob(ent) {
  var id = mdIdMob(ent)
  var morceaux = id.split(':')
  var chemin = (morceaux[1] || morceaux[0] || 'inconnu').split('/').pop()
  var nom
  try {
    nom = Text.translate('entity.' + (morceaux.length > 1 ? morceaux[0] : 'minecraft') + '.' + chemin.replace(/\//g, '.'))
  } catch (e) {
    var mots = chemin.split('_')
    for (var i = 0; i < mots.length; i++) mots[i] = mots[i].charAt(0).toUpperCase() + mots[i].slice(1)
    nom = Text.of(mots.join(' '))
  }
  try { nom = nom.color(MD.COULEUR_NOM) } catch (e2) { try { nom = nom.color('red') } catch (e3) {} }
  try { nom = nom.bold() } catch (e4) {}
  return nom
}

function mdEffets(ent, bonusVie, boss, idDim, niveau) {
  var titre = mdTitre(bonusVie)
  if (titre) {
    try {
      var x = Number(mdVal(ent, 'x', 'getX')), y = Number(mdVal(ent, 'y', 'getY')) + 1, z = Number(mdVal(ent, 'z', 'getZ'))
      var particule = bonusVie >= 1.0 ? 'minecraft:soul_fire_flame' : 'minecraft:flame'
      ent.server.runCommandSilent('execute in ' + idDim + ' run particle ' + particule + ' ' + x.toFixed(2) + ' ' + y.toFixed(2) + ' ' + z.toFixed(2) + ' 0.4 0.7 0.4 0.03 25 force')
    } catch (e) {}
  }
  {
    try {
      if (!ent.customName) {
        var nom = Text.of('[Lvl ' + niveau + '] ')
        try { nom = nom.color(MD.COULEUR_LVL) } catch (ec) { nom = mdBordeaux(nom) }
        try { nom = nom.bold() } catch (eg) {}
        if (titre && titre.avant) nom.append(mdBordeaux(Text.of(titre.titre + ' ')))
        nom.append(mdNomMob(ent))
        if (titre && !titre.avant) nom.append(mdBordeaux(Text.of(' ' + titre.titre)))
        ent.setCustomName(nom)
        // Nom visible seulement quand on regarde le mob : un nom « toujours visible » traverse les blocs.
        ent.setCustomNameVisible(false)
      }
    } catch (e2) {}
  }
  if (MD.LUEUR_BONUS > 0 && bonusVie >= MD.LUEUR_BONUS) {
    try { ent.potionEffects.add('minecraft:glowing', 99999999, 0, false, false) } catch (e3) {}
  }
}

function mdTraiter(ent) {
  mdInit()
  var niveau = mdVal(ent, 'level', 'level')
  if (!niveau) return
  var idDim = mdIdDimension(niveau)
  var dim = MD.DIMS[idDim]
  if (!dim) return
  if (!mdHostile(ent)) return

  var centre = dim.centre
  if (!centre) {
    var spawn = mdVal(niveau, 'sharedSpawnPos', 'getSharedSpawnPos')
    if (!spawn) return
    centre = { x: Number(mdVal(spawn, 'x', 'getX')), z: Number(mdVal(spawn, 'z', 'getZ')) }
  }
  var dx = Number(mdVal(ent, 'x', 'getX')) - centre.x
  var dz = Number(mdVal(ent, 'z', 'getZ')) - centre.z
  var distance = Math.sqrt(dx * dx + dz * dz)
  var palier = mdPalier(distance)
  var niveauMob = mdNiveau(distance)

  var idType = mdIdMob(ent)
  if (MD.EXCLUS && MD.EXCLUS.indexOf(idType) !== -1) return
  // Boss de zone (boss_zones.js, zone_pirates.js) : jamais modifiés par la distance.
  try { if (ent.tags.contains('boss_zone') || ent.tags.contains('pirate_zone')) return } catch (ez) {}
  var boss = mdBoss(ent, idType)
  // Déjà traité (mob rechargé depuis la sauvegarde) ?
  try {
    if (ent.tags.contains(MD_TAG)) {
      // Mobs déjà traités (anciens mobs rechargés) : on retire l'affichage permanent du nom.
      try { if (ent.customName && String(ent.customName.getString()).indexOf('[Lvl ') === 0) ent.setCustomNameVisible(false) } catch (e00) {}
      return
    }
  } catch (e0) {}
  try { ent.addTag(MD_TAG) } catch (e1) {}

  var tirage = Math.floor(Math.random() * MD.TIRAGES)
  var b = mdBonus(palier, tirage, boss, dim.mult)

  mdPoser(ent, MD_J.Attr.MAX_HEALTH, 'vie', b.vie, MD_J.Op.ADD_MULTIPLIED_BASE)
  mdPoser(ent, MD_J.Attr.ATTACK_DAMAGE, 'degats', b.degats, MD_J.Op.ADD_MULTIPLIED_BASE)
  mdPoser(ent, MD_J.Attr.ARMOR, 'armure', b.armure, MD_J.Op.ADD_VALUE)
  try { ent.setHealth(ent.getMaxHealth()) } catch (e2) {}
  mdEffets(ent, b.vie, boss, idDim, niveauMob)
}

EntityEvents.spawned(perfWrap('mobs_distance:spawned', function (event) {
  var annuler = false
  try {
    // Aegis naturel des villages (Monster & Spellbooks) : supprimé. Les « Summoned Aegis » du sort Aegis Patrol ne sont pas touchés.
    if (String(event.entity.type) === 'monsterspellbooks:aegis') annuler = true
    else mdTraiter(event.entity)
  } catch (e) {
    console.error('[mobs_distance] ' + e)
  }
  if (annuler) event.cancel()   // hors du try : cancel() lève une exception interne qui ne doit pas être attrapée (elle remplissait le journal d'erreurs)
}))

console.info('[mobs_distance] actif : +' + (MD.VIE * 100) + ' % max. vie/dégâts par palier de ' + MD.PALIER + ' blocs (plafond +' + (MD.PLAFOND * 100) + ' %), boss x' + MD.FACTEUR_BOSS + ', Nether x0,125.')


// ───────── Densité de mobs ─────────
// Autour de chaque joueur, si plus de DENS.max mobs hostiles (monstres et chauves-souris) se trouvent dans le rayon DENS.rayon,
// l'excédent est retiré en commençant par les plus éloignés (jamais ceux qui sont à moins de DENS.proche blocs du joueur).
// Épargnés : boss et escortes de zone, pirates, invocations de sorts, mobs persistants (nommés à l'étiquette, apprivoisés...),
// mobs montés ou qui portent des passagers, mobs au tag mcrp_autorise.
// Réglage en jeu (op) : /densite  /densite max <n>  /densite rayon <n>  /densite on|off
var DENS = { actif: true, rayon: 64, hauteur: 48, max: 12, proche: 20, periode: 40 }
var DENS_J = null
var DENS_TAGS = ['boss_zone', 'boss_escorte', 'pirate_zone', 'mcrp_autorise']
function densInit() {
  if (DENS_J) return
  DENS_J = {}
  DENS_J.AABB = Java.loadClass('net.minecraft.world.phys.AABB')
  DENS_J.Mob = Java.loadClass('net.minecraft.world.entity.Mob')
  try { DENS_J.Summon = Java.loadClass('io.redspace.ironsspellbooks.entity.mobs.IMagicSummon') } catch (e) { DENS_J.Summon = null }
}
function densEstCible(m) {
  var cat = ''
  try { cat = String(m.getType().getCategory().getName()) } catch (e) { return false }
  if (cat !== 'monster' && cat !== 'ambient') return false
  try {
    if (m.isPersistenceRequired() || m.isPassenger() || m.isVehicle()) return false
    if (DENS_J.Summon && (m instanceof DENS_J.Summon)) return false
    var tags = m.getTags()
    for (var i = 0; i < DENS_TAGS.length; i++) if (tags.contains(DENS_TAGS[i])) return false
    if (m.getMaxHealth() >= MD.SEUIL_BOSS_VIE) return false
    if (MD.BOSS_IDS.indexOf(String(m.getType().builtInRegistryHolder().key().location())) >= 0) return false
  } catch (e2) { return false }
  return true
}
function densCompter(joueur) {
  densInit()
  var niveau = joueur.level
  var x = joueur.getX(), y = joueur.getY(), z = joueur.getZ()
  var r = DENS.rayon, h = DENS.hauteur
  var boite = new DENS_J.AABB(x - r, y - h, z - r, x + r, y + h, z + r)
  var it = niveau.getEntitiesOfClass(DENS_J.Mob, boite).iterator()
  var liste = []
  while (it.hasNext()) {
    var m = it.next()
    if (!densEstCible(m)) continue
    liste.push({ m: m, d: m.distanceToSqr(joueur) })
  }
  return liste
}
ServerEvents.tick(perfWrap('mobs_distance:310', function (event) {
  if (!DENS.actif || event.server.tickCount % DENS.periode !== 3) return
  var joueurs = event.server.players
  for (var i = 0; i < joueurs.size(); i++) {
    try {
      var liste = densCompter(joueurs.get(i))
      var exces = liste.length - DENS.max
      if (exces <= 0) continue
      liste.sort(function (a, b) { return b.d - a.d })
      var retires = 0
      var proche2 = DENS.proche * DENS.proche
      for (var k = 0; k < liste.length && retires < exces; k++) {
        if (liste[k].d < proche2) break
        liste[k].m.discard()
        retires++
      }
      if (retires > 0) console.info('[densite] ' + joueurs.get(i).username + ' : ' + retires + ' mob(s) retiré(s) (' + liste.length + ' dans ' + DENS.rayon + ' blocs, max ' + DENS.max + ')')
    } catch (e) {
      console.error('[densite] ' + e)
    }
  }
}))
ServerEvents.commandRegistry(function (event) {
  var C = event.commands, A = event.arguments
  var op = function (s) { return s.hasPermission(2) }
  var dire = function (ctx, t) { var p = ctx.source.player; if (p) p.tell(Text.gray(t)); else console.info('[densite] ' + t) }
  event.register(C.literal('densite').requires(op)
    .executes(function (ctx) {
      var joueurs = ctx.source.server.players
      var t = 'Densité : ' + (DENS.actif ? 'active' : 'coupée') + ', max ' + DENS.max + ' mobs dans ' + DENS.rayon + ' blocs.'
      for (var i = 0; i < joueurs.size(); i++) { var j = joueurs.get(i); t += '\n- ' + j.username + ' : ' + densCompter(j).length }
      dire(ctx, t)
      return 1
    })
    .then(C.literal('max').then(C.argument('n', A.INTEGER.create(event)).executes(function (ctx) { DENS.max = Math.max(5, A.INTEGER.getResult(ctx, 'n')); dire(ctx, 'Maximum : ' + DENS.max); return 1 })))
    .then(C.literal('rayon').then(C.argument('n', A.INTEGER.create(event)).executes(function (ctx) { DENS.rayon = Math.max(24, Math.min(128, A.INTEGER.getResult(ctx, 'n'))); dire(ctx, 'Rayon : ' + DENS.rayon); return 1 })))
    .then(C.literal('on').executes(function (ctx) { DENS.actif = true; dire(ctx, 'Densité active'); return 1 }))
    .then(C.literal('off').executes(function (ctx) { DENS.actif = false; dire(ctx, 'Densité coupée'); return 1 })))
})


// ───────── Nettoyage automatique des zones de sorts ─────────
// Les zones d'Iron's Spells (nuages de poison, séismes, blizzards...) s'accumulent et coûtent cher à chaque tick :
// toute zone de plus de NETTOY.age ticks est retirée, et au-delà de NETTOY.max zones par dimension les plus anciennes partent.
// Réglage en jeu (op) : /nettoyage  /nettoyage age <ticks>  /nettoyage max <n>  /nettoyage on|off
// Mobs dont le nombre est limité autour de chaque joueur : « motif » = morceau de l'identifiant du mob
var NETTOY_LIMITES = [
  { nom: 'Draugr', motif: 'draugr', max: 10 },
  { nom: 'Remnant', motif: 'cursespells:remnant', max: 6 }   // invoqués en masse (pas le Remnant invoqué par un joueur : cursespells:summoned_remnant)
]
var NETTOY = { actif: true, age: 300, max: 40, periode: 40, flecheAge: 200, flecheMax: 2400, draugrMax: 10, draugrRayon: 64 }
var NETTOY_FLECHE = null
try { NETTOY_FLECHE = Java.loadClass('net.minecraft.world.entity.projectile.AbstractArrow') } catch (eF) {}
var NETTOY_AOE = null
function nettoyInit() {
  if (NETTOY_AOE !== null) return
  try { NETTOY_AOE = Java.loadClass('io.redspace.ironsspellbooks.entity.spells.AoeEntity') } catch (e) { NETTOY_AOE = false }
}
ServerEvents.tick(perfWrap('mobs_distance:361', function (event) {
  if (!NETTOY.actif || event.server.tickCount % NETTOY.periode !== 11) return
  nettoyInit()
  var niveaux = event.server.getAllLevels().iterator()
  while (niveaux.hasNext()) {
    try {
      var niveau = niveaux.next()
      var it = niveau.getAllEntities().iterator()
      var zones = []
      var retires = 0
      var fleches = 0
      var groupes = []
      for (var g0 = 0; g0 < NETTOY_LIMITES.length; g0++) groupes.push([])
      while (it.hasNext()) {
        var ent = it.next()
        if (NETTOY_FLECHE && ent instanceof NETTOY_FLECHE) {
          if (String(ent.type).indexOf('trident') !== -1) continue
          // Flèches : celles sans objet à ramasser font échouer la sauvegarde du chunk (erreur répétée dans les logs).
          // Flèche sans objet : retirée tout de suite (elle fait planter la sauvegarde du chunk quand il se décharge, quel que soit son âge).
          try { if (ent.getPickupItem().isEmpty()) { ent.discard(); fleches++; continue } } catch (e7) {}
          if (ent.tickCount > NETTOY.flecheAge) {
            var vide = false
            try { vide = String(ent.pickup) !== 'ALLOWED' } catch (e5) {}
            try { if (ent.getPickupItem().isEmpty()) vide = true } catch (e6) {}
            if (vide || ent.tickCount > NETTOY.flecheMax) { ent.discard(); fleches++ }
          }
          continue
        }
        try {
          var tyG = String(ent.type), dansG = false
          for (var g1 = 0; g1 < NETTOY_LIMITES.length; g1++) if (tyG.indexOf(NETTOY_LIMITES[g1].motif) !== -1) { groupes[g1].push(ent); dansG = true; break }
          if (dansG) continue
        } catch (e8) {}
        if (!NETTOY_AOE || !(ent instanceof NETTOY_AOE)) continue
        if (ent.tickCount > NETTOY.age) { ent.discard(); retires++ } else zones.push(ent)
      }
      if (zones.length > NETTOY.max) {
        zones.sort(function (a, b) { return b.tickCount - a.tickCount })
        for (var i = 0; i < zones.length - NETTOY.max; i++) { zones[i].discard(); retires++ }
      }
      // Mobs limités (NETTOY_LIMITES) : au plus « max » de chaque groupe autour de chaque joueur (rayon NETTOY.draugrRayon) ;
      // le surplus (les plus éloignés du joueur) est retiré.
      for (var gi = 0; gi < NETTOY_LIMITES.length; gi++) {
        var gr = NETTOY_LIMITES[gi], liste = groupes[gi]
        if (liste.length <= gr.max) continue
        var joueursD = event.server.getPlayers()
        var retiresD = 0
        var r2 = NETTOY.draugrRayon * NETTOY.draugrRayon
        for (var pj = 0; pj < joueursD.size(); pj++) {
          var jd = joueursD.get(pj)
          if (String(jd.level.dimension) !== String(niveau.dimension)) continue
          var proches = []
          for (var di = 0; di < liste.length; di++) {
            var dr = liste[di]
            if (dr.isRemoved()) continue
            var dd = dr.distanceToSqr(jd)
            if (dd <= r2) proches.push({ e: dr, d: dd })
          }
          if (proches.length <= gr.max) continue
          proches.sort(function (x, y) { return x.d - y.d })
          for (var k = gr.max; k < proches.length; k++) { proches[k].e.discard(); retiresD++ }
        }
        if (retiresD > 0) console.info('[nettoyage] ' + niveau.dimension + ' : ' + retiresD + ' ' + gr.nom + ' en trop retiré(s)')
      }
      if (fleches > 0) console.info('[nettoyage] ' + niveau.dimension + ' : ' + fleches + ' flèche(s) retirée(s)')
      if (retires > 0) console.info('[nettoyage] ' + niveau.dimension + ' : ' + retires + ' zone(s) de sort retirée(s)')
    } catch (e) {
      console.error('[nettoyage] ' + e)
    }
  }
}))
ServerEvents.commandRegistry(function (event) {
  var C = event.commands, A = event.arguments
  var op = function (s) { return s.hasPermission(2) }
  var dire = function (ctx, t) { var p = ctx.source.player; if (p) p.tell(Text.gray(t)); else console.info('[nettoyage] ' + t) }
  event.register(C.literal('nettoyage').requires(op)
    .executes(function (ctx) { dire(ctx, 'Nettoyage des zones de sorts : ' + (NETTOY.actif ? 'actif' : 'coupé') + ', âge max ' + NETTOY.age + ' ticks, max ' + NETTOY.max + ' par dimension.'); return 1 })
    .then(C.literal('age').then(C.argument('n', A.INTEGER.create(event)).executes(function (ctx) { NETTOY.age = Math.max(40, A.INTEGER.getResult(ctx, 'n')); dire(ctx, 'Âge max : ' + NETTOY.age + ' ticks'); return 1 })))
    .then(C.literal('max').then(C.argument('n', A.INTEGER.create(event)).executes(function (ctx) { NETTOY.max = Math.max(5, A.INTEGER.getResult(ctx, 'n')); dire(ctx, 'Maximum : ' + NETTOY.max); return 1 })))
    .then(C.literal('on').executes(function (ctx) { NETTOY.actif = true; dire(ctx, 'Nettoyage actif'); return 1 }))
    .then(C.literal('off').executes(function (ctx) { NETTOY.actif = false; dire(ctx, 'Nettoyage coupé'); return 1 })))
})


// ───────── Spawn naturel allégé ─────────
// Une part des apparitions NATURELLES de monstres est annulée (réglage : SPAWN_LEGER.part, 0 à 1). Ni les boss, ni les invocations,
// ni les œufs/commandes/spawners/zones de boss ne sont concernés.
// Réglage en jeu (op) : /spawnleger  /spawnleger <0-100>
// Born in Chaos : en plus, une apparition naturelle sur deux de ses monstres est annulée (SPAWN_LEGER.bic),
// pour réduire de moitié sa part parmi les monstres (les places libérées reviennent aux autres mobs).
// Plafond : plus aucune apparition naturelle de monstre dans une dimension au-delà de (max par joueur × joueurs présents) monstres déjà vivants.
// /spawnleger max <n> pour le régler (0 = pas de plafond).
var SPAWN_LEGER = { part: 0.6, bic: 0.5, parJoueur: 25, passifs: 0.6, passifsParJoueur: 40, compte: {} }
var SPAWN_PASSIFS = ['creature', 'ambient', 'water_creature', 'water_ambient', 'underground_water_creature', 'axolotls']   // catégories « passives »
ServerEvents.tick(perfWrap('mobs_distance:cap', function (event) {
  if (event.server.tickCount % 100 !== 7) return
  var niveaux = event.server.getAllLevels().iterator()
  while (niveaux.hasNext()) {
    try {
      var niveau = niveaux.next(), n = 0, np = 0, it = niveau.getAllEntities().iterator()
      while (it.hasNext()) { var en = it.next(); try { var cat = String(en.getType().getCategory().getName()); if (cat === 'monster') n++; else if (SPAWN_PASSIFS.indexOf(cat) >= 0) np++ } catch (e0) {} }
      SPAWN_LEGER.compte[String(niveau.dimension)] = { n: n, np: np, j: niveau.players().size() }
    } catch (e) {}
  }
}))
try {
  NativeEvents.onEvent(
    Java.loadClass('net.neoforged.neoforge.event.entity.living.FinalizeSpawnEvent'),
    function (event) {
      try {
        if (String(event.getSpawnType().name()) !== 'NATURAL') return
        var m = event.getEntity()
        var cat = String(m.getType().getCategory().getName())
        if (SPAWN_PASSIFS.indexOf(cat) >= 0) {   // animaux, ambiants, aquatiques : même principe, plafond et part propres
          if (SPAWN_LEGER.passifs <= 0 && SPAWN_LEGER.passifsParJoueur <= 0) return
          var cq = SPAWN_LEGER.compte[String(m.level.dimension)]
          if (SPAWN_LEGER.passifsParJoueur > 0 && cq && cq.j > 0) {
            if (cq.np >= SPAWN_LEGER.passifsParJoueur * cq.j) { event.setSpawnCancelled(true); return }
            cq.np++
          }
          if (Math.random() < SPAWN_LEGER.passifs) event.setSpawnCancelled(true)
          return
        }
        if (cat !== 'monster') return
        if (SPAWN_LEGER.part <= 0 && SPAWN_LEGER.parJoueur <= 0) return
        if (SPAWN_LEGER.parJoueur > 0) {
          var cp = SPAWN_LEGER.compte[String(m.level.dimension)]
          if (cp && cp.j > 0 && cp.n >= SPAWN_LEGER.parJoueur * cp.j) { event.setSpawnCancelled(true); return }
          if (cp) cp.n++
        }
        if (Math.random() < SPAWN_LEGER.part) { event.setSpawnCancelled(true); return }
        if (SPAWN_LEGER.bic > 0 && String(m.getType().builtInRegistryHolder().key().location().getNamespace()) === 'born_in_chaos_v1' && Math.random() < SPAWN_LEGER.bic) event.setSpawnCancelled(true)
      } catch (e1) {}
    }
  )
} catch (e) {
  console.error('[spawn_leger] indisponible : ' + e)
}
ServerEvents.commandRegistry(function (event) {
  var C = event.commands, A = event.arguments
  event.register(C.literal('spawnleger').requires(function (s) { return s.hasPermission(2) })
    .executes(function (ctx) { var p = ctx.source.player; var t = 'Spawn naturel de monstres annulé à ' + Math.round(SPAWN_LEGER.part * 100) + ' %'; if (p) p.tell(Text.gray(t)); else console.info('[spawn_leger] ' + t); return 1 })
    .then(C.literal('max').then(C.argument('n', A.INTEGER.create(event)).executes(function (ctx) {
      SPAWN_LEGER.parJoueur = Math.max(0, A.INTEGER.getResult(ctx, 'n'))
      var p = ctx.source.player; var t = 'Plafond de monstres : ' + SPAWN_LEGER.parJoueur + ' par joueur présent (0 = aucun)'
      if (p) p.tell(Text.gray(t)); else console.info('[spawn_leger] ' + t)
      return 1
    })))
    .then(C.literal('passifs').then(C.argument('pourcent', A.INTEGER.create(event)).executes(function (ctx) {
      SPAWN_LEGER.passifs = Math.max(0, Math.min(95, A.INTEGER.getResult(ctx, 'pourcent'))) / 100
      var p = ctx.source.player; var t = 'Spawn naturel des mobs passifs annulé à ' + Math.round(SPAWN_LEGER.passifs * 100) + ' %'
      if (p) p.tell(Text.gray(t)); else console.info('[spawn_leger] ' + t)
      return 1
    })))
    .then(C.argument('pourcent', A.INTEGER.create(event)).executes(function (ctx) {
      SPAWN_LEGER.part = Math.max(0, Math.min(90, A.INTEGER.getResult(ctx, 'pourcent'))) / 100
      var p = ctx.source.player; var t = 'Spawn naturel de monstres annulé à ' + Math.round(SPAWN_LEGER.part * 100) + ' %'
      if (p) p.tell(Text.gray(t)); else console.info('[spawn_leger] ' + t)
      return 1
    })))
})
