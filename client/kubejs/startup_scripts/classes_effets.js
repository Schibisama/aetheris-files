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

try {
  initEffets()
  NativeEvents.onEvent(
    Java.loadClass('net.neoforged.neoforge.event.ItemAttributeModifierEvent'),
    function (event) { traiterEffets(event) }
  )
  console.info('[classes_effets] ' + REGLES_EFFETS.length + ' règles de bonus d\'équipement actives.')
} catch (e) {
  console.error('[classes_effets] Impossible de modifier les bonus : ' + e)
}
