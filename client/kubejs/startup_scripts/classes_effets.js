// Ajustement des bonus d'équipement pour qu'ils collent aux classes.
// À placer dans : kubejs/startup_scripts/ (redémarrage du jeu nécessaire).
// Remplace classes_pharaon.js (à supprimer s'il est présent).
//
// Pour chaque règle : "retirer" = attributs supprimés de l'objet, "ajouter" = attributs ajoutés
// (montant en proportion : 0.2 = +20 %).
var NATURE = 'irons_spellbooks:nature_spell_power'
var SACRE = 'irons_spellbooks:holy_spell_power'
var GLACE = 'irons_spellbooks:ice_spell_power'
var EVOCATION = 'irons_spellbooks:evocation_spell_power'
var GEO = 'gtbcs_geomancy_plus:geo_spell_power'
var ESPRIT = 'iss_magicfromtheeast:spirit_spell_power'
var FEU = 'irons_spellbooks:fire_spell_power'
var FEU_AME = 'somakespells:soul_fire_spell_power'
var FEU_INFERNAL = 'somakespells:infernal_fire_spell_power'

var REGLES_EFFETS = [
  // Set Pharaon sacré -> Géomancien : plus de Sacré/Nature, +20 % Géomancie
  { objet: /^cataclysm_spellbooks:pharaoh_(helmet|chestplate|leggings|greaves)$/,
    retirer: [NATURE, SACRE], ajouter: [{ attribut: GEO, montant: 0.2 }] },
  // Soul Brazier -> Spiritualiste : même boost (+15 %) mais en Esprit au lieu de Glace
  { objet: /^cataclysm_spellbooks:soul_brazier$/,
    retirer: [GLACE], ajouter: [{ attribut: ESPRIT, montant: 0.15 }] },
  // Bâtons Ignitium de Soma -> Pyromancien : boost Feu d'Iron's (même montant) au lieu des écoles Soma sans classe
  { objet: /^somakespells:soul_fire_ignitium_staff$/, retirer: [FEU_AME], ajouter: [{ attribut: FEU, montant: 0.2 }] },
  { objet: /^somakespells:infernal_fire_ignitium_staff$/, retirer: [FEU_INFERNAL], ajouter: [{ attribut: FEU, montant: 0.25 }] },
  // Armes de Curse Spells : points d'attaque ramenés à 16 (« degats » = total affiché, main nue = 1)
  { objet: /^cursespells:(stagnation_blade|blade_of_the_first_sin|executioner_greatsword)$/, degats: 16 },
  // Sets avec un boost en trop : on ne garde que celui de la classe
  { objet: /^monsterspellbooks:death_knight_(helmet|chestplate|leggings|boots)$/, retirer: [GLACE] },        // Nécromancien
  { objet: /^monsterspellbooks:illager_ember_robe_(helmet|chestplate|leggings|boots)$/, retirer: [EVOCATION] }, // Pyromancien
  { objet: /^monsterspellbooks:illager_enchanter_(helmet|chestplate|leggings|boots)$/, retirer: [SACRE] },     // Évocateur
  { objet: /^monsterspellbooks:illager_iceologer_(helmet|chestplate|leggings|boots)$/, retirer: [EVOCATION] } // Cryomancien
]

var EF = {}
function initEffets() {
  var reg = Java.loadClass('net.minecraft.core.registries.BuiltInRegistries')
  EF.itemReg = reg.ITEM
  EF.attrReg = reg.ATTRIBUTE
  EF.RL = Java.loadClass('net.minecraft.resources.ResourceLocation')
  EF.Modif = Java.loadClass('net.minecraft.world.entity.ai.attributes.AttributeModifier')
  EF.Op = Java.loadClass('net.minecraft.world.entity.ai.attributes.AttributeModifier$Operation')
  EF.Groupe = Java.loadClass('net.minecraft.world.entity.EquipmentSlotGroup')
  EF.holders = {}
}

function holderAttribut(id) {
  if (EF.holders[id] !== undefined) return EF.holders[id]
  var opt = EF.attrReg.getHolder(EF.RL.parse(id))
  EF.holders[id] = opt.isPresent() ? opt.get() : null
  return EF.holders[id]
}

function regleDe(id) {
  for (var i = 0; i < REGLES_EFFETS.length; i++) {
    if (REGLES_EFFETS[i].objet.test(id)) return REGLES_EFFETS[i]
  }
  return null
}

function groupeDe(id) {
  return /_(staff|sword|axe|blade)$/.test(id) || id.indexOf('soul_brazier') !== -1 ? EF.Groupe.MAINHAND : EF.Groupe.ARMOR
}

function traiterEffets(event) {
  var pile = event.getItemStack()
  var id = String(EF.itemReg.getKey(pile.getItem()))
  if (id.indexOf(':') < 0) return
  var regle = regleDe(id)
  if (!regle) return
  if (regle.degats !== undefined) {
    event.removeIf(function (entree) {
      var nom = String(entree.attribute().getRegisteredName())
      return nom.indexOf('attack_damage') !== -1 && nom.indexOf('spell') === -1
    })
    var hDegats = holderAttribut('minecraft:generic.attack_damage')
    if (hDegats) {
      event.addModifier(hDegats, new EF.Modif(EF.RL.withDefaultNamespace('base_attack_damage'), regle.degats - 1, EF.Op.ADD_VALUE), EF.Groupe.MAINHAND)
    }
  }
  if (regle.retirer) {
    var liste = regle.retirer
    event.removeIf(function (entree) {
      return liste.indexOf(String(entree.attribute().getRegisteredName())) !== -1
    })
  }
  if (regle.ajouter) {
    for (var i = 0; i < regle.ajouter.length; i++) {
      var a = regle.ajouter[i]
      var h = holderAttribut(a.attribut)
      if (!h) continue
      var modif = new EF.Modif(
        EF.RL.parse('classes_rp:' + id.replace(':', '_') + '_' + a.attribut.split(':')[1]),
        a.montant,
        EF.Op.ADD_MULTIPLIED_BASE
      )
      event.addModifier(h, modif, groupeDe(id))
    }
  }
}

// ───────────── Set Wizard d'Iron's Spells (kit de départ) ─────────────
// Ordre voulu : casque 1, bottes 1, plastron 3, jambières 2 points d'armure, et +25 de mana max chacun.
var WIZARD = {
  helmet:     { armure: 1, groupe: 'HEAD' },
  boots:      { armure: 1, groupe: 'FEET' },
  chestplate: { armure: 3, groupe: 'CHEST' },
  leggings:   { armure: 2, groupe: 'LEGS' }
}
var WIZARD_MANA = 25

function traiterWizard(event, id) {
  var m = /^irons_spellbooks:wizard_(helmet|boots|chestplate|leggings)$/.exec(id)
  if (!m) return false
  var def = WIZARD[m[1]]
  var hArmure = holderAttribut('minecraft:generic.armor')
  var hMana = holderAttribut('irons_spellbooks:max_mana')
  event.removeIf(function (entree) {
    var nom = String(entree.attribute().getRegisteredName())
    return nom === 'minecraft:generic.armor' || nom === 'irons_spellbooks:max_mana'
  })
  var groupe = EF.Groupe[def.groupe]
  if (hArmure) event.addModifier(hArmure, new EF.Modif(EF.RL.parse('classes_rp:wizard_armure_' + m[1]), def.armure, EF.Op.ADD_VALUE), groupe)
  if (hMana) event.addModifier(hMana, new EF.Modif(EF.RL.parse('classes_rp:wizard_mana_' + m[1]), WIZARD_MANA, EF.Op.ADD_VALUE), groupe)
  return true
}

// ───────────── Armure de professeur (couronne Pyrium Battlemage + veste / pantalon / bottes de Hazel) ─────────────
// Mêmes stats que le set Wizard des élèves (armure 1/3/2/1, +25 mana, +5 % puissance des sorts), avec par pièce
// +1 point d'armure et +25 de mana max en plus (donc +50 de mana au total par pièce). Tous les autres bonus d'origine sont retirés.
var PROF_ARMURE = {
  'hazennstuff:pyrium_battlemage_helmet': { armure: 2, groupe: 'HEAD' },
  'hazennstuff:hazel_chestplate':         { armure: 4, groupe: 'CHEST' },
  'hazennstuff:hazel_leggings':           { armure: 3, groupe: 'LEGS' },
  'hazennstuff:hazel_boots':              { armure: 2, groupe: 'FEET' }
}
var PROF_MANA = 50
var PROF_PUISSANCE = 0.05

function traiterProf(event, id) {
  var def = PROF_ARMURE[id]
  if (!def) return false
  var hArmure = holderAttribut('minecraft:generic.armor')
  var hMana = holderAttribut('irons_spellbooks:max_mana')
  var hPuissance = holderAttribut('irons_spellbooks:spell_power')
  event.removeIf(function (entree) { return true })
  var groupe = EF.Groupe[def.groupe]
  var cle = id.split(':')[1]
  if (hArmure) event.addModifier(hArmure, new EF.Modif(EF.RL.parse('classes_rp:prof_armure_' + cle), def.armure, EF.Op.ADD_VALUE), groupe)
  if (hMana) event.addModifier(hMana, new EF.Modif(EF.RL.parse('classes_rp:prof_mana_' + cle), PROF_MANA, EF.Op.ADD_VALUE), groupe)
  if (hPuissance) event.addModifier(hPuissance, new EF.Modif(EF.RL.parse('classes_rp:prof_puissance_' + cle), PROF_PUISSANCE, EF.Op.ADD_MULTIPLIED_BASE), groupe)
  return true
}

// ───────────── Plafond de protection ─────────────
// Toute pièce d'armure (ou bouclier) d'un mod est ramenée au plus à la protection du diamant, afin que
// l'équipement des classes soit à peu près équivalent. L'équipement vanilla n'est pas touché.
var PLAFOND_ARMURE = { head: 3, chest: 8, legs: 6, feet: 3 }
var PLAFOND_ARMURE_MAIN = 3          // boucliers / objets tenus en main
var PLAFOND_ROBUSTESSE = 2           // « armor toughness » par pièce
var PLAFOND_RESISTANCE_RECUL = 0.1   // résistance au recul par pièce

function emplacementDe(id, groupe) {
  if (/(helmet|hat$|_hat|hood|mask|crown|headgear|visor|headpiece|circlet|tiara|ribbon|cowl)/.test(id)) return 'head'
  if (/(chestplate|robe|coat|tunic|suit|dress|cuirass)/.test(id)) return 'chest'
  if (/(leggings|pants|greaves|skirt)/.test(id)) return 'legs'
  if (/(boots|shoes|geta)/.test(id)) return 'feet'
  if (groupe === 'head' || groupe === 'chest' || groupe === 'legs' || groupe === 'feet') return groupe
  return null
}

EF.journalPlafond = {}
function plafonner(event, id) {
  if (id.indexOf('minecraft:') === 0) return
  var entrees = event.getModifiers()
  var aChanger = []
  for (var i = 0; i < entrees.size(); i++) {
    var en = entrees.get(i)
    var nom = String(en.attribute().getRegisteredName())
    var mod = en.modifier()
    if (String(mod.operation()) !== 'ADD_VALUE') continue
    var groupe = String(en.slot().getSerializedName())
    var enMain = (groupe === 'mainhand' || groupe === 'offhand' || groupe === 'hand')
    var plafond = null
    if (nom === 'minecraft:generic.armor') {
      plafond = enMain ? PLAFOND_ARMURE_MAIN : PLAFOND_ARMURE[emplacementDe(id, groupe)]
    } else if (nom === 'minecraft:generic.armor_toughness') {
      plafond = PLAFOND_ROBUSTESSE
    } else if (nom === 'minecraft:generic.knockback_resistance') {
      plafond = PLAFOND_RESISTANCE_RECUL
    }
    if (plafond === null || plafond === undefined) continue
    if (mod.amount() > plafond) aChanger.push({ en: en, plafond: plafond, ancien: mod.amount(), nom: nom })
  }
  for (var j = 0; j < aChanger.length; j++) {
    var c = aChanger[j]
    event.replaceModifier(c.en.attribute(), new EF.Modif(c.en.modifier().id(), c.plafond, EF.Op.ADD_VALUE), c.en.slot())
    var cle = id + c.nom
    if (!EF.journalPlafond[cle]) {
      EF.journalPlafond[cle] = true
      console.info('[classes_effets] plafond ' + id + ' : ' + c.nom.split('.').pop() + ' ' + c.ancien + ' -> ' + c.plafond)
    }
  }
}

try {
  initEffets()
  NativeEvents.onEvent(
    Java.loadClass('net.neoforged.neoforge.event.ItemAttributeModifierEvent'),
    function (event) {
      try {
        var pile = event.getItemStack()
        var id = String(EF.itemReg.getKey(pile.getItem()))
        if (!traiterWizard(event, id) && !traiterProf(event, id)) plafonner(event, id)
      } catch (err) {
        if (!EF.erreurs) EF.erreurs = 0
        if (EF.erreurs++ < 5) console.error('[classes_effets] ' + err)
      }
    }
  )
  NativeEvents.onEvent(
    Java.loadClass('net.neoforged.neoforge.event.ItemAttributeModifierEvent'),
    function (event) { traiterEffets(event) }
  )
  console.info('[classes_effets] ' + REGLES_EFFETS.length + ' règles de bonus d\'équipement actives.')
} catch (e) {
  console.error('[classes_effets] Impossible de modifier les bonus : ' + e)
}
