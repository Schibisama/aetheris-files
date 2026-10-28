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

EntityEvents.spawned(function (event) {
  try {
    mdTraiter(event.entity)
  } catch (e) {
    console.error('[mobs_distance] ' + e)
  }
})

console.info('[mobs_distance] actif : +' + (MD.VIE * 100) + ' % max. vie/dégâts par palier de ' + MD.PALIER + ' blocs (plafond +' + (MD.PLAFOND * 100) + ' %), boss x' + MD.FACTEUR_BOSS + ', Nether x0,125.')
