// Envoûteur : rééquilibrage des sorts de l'école Curse (mod Curse Spells, préfixe cursespells:).
//  1) dégâts à 56,25 % (deux nerfs de -25 % cumulés) SEULEMENT pour les gros sorts (NERF_DEGATS_GROS), y compris ceux qui percent les
//     défenses (Abhorrent Star...) ; les petits sorts Curse retrouvent leurs dégâts de base
//  2) recharge x1,5 sur les gros sorts de zone
//  3) coût en mana x1,3 sur ces mêmes gros sorts
// À placer dans : kubejs/server_scripts/envouteur_nerf.js  (puis /reload). Les trois valeurs se règlent ci-dessous.
var NERF_PUISSANCE = 0.5625   // 0,75 x 0,75 : deuxième baisse de 25 %
var NERF_RECHARGE = 1.5
var NERF_MANA = 1.3
// Gros sorts Curse dont les dégâts restent réduits (NERF_PUISSANCE) : les sorts de zone, ultimes et sorts légendaires. Les autres sorts
// de l'école Curse ne sont plus réduits.
var NERF_DEGATS_GROS = [
  'cursespells:catastrophe', 'cursespells:skyfall', 'cursespells:blade_of_judgment', 'cursespells:pillar_of_sin',
  'cursespells:the_sky_and_cosmos_are_one', 'cursespells:abhorrent_star',
  'cursespells:flames_of_fury', 'cursespells:rage_awakened', 'cursespells:cursed_sabbath', 'cursespells:the_command',
  'cursespells:cursed_eye', 'cursespells:cursed_rage', 'cursespells:cursed_strike', 'cursespells:hell_fire'
]
// Autres sorts dont les dégâts sont multipliés (sorts hors école Curse) : identifiant -> coefficient
var NERF_DEGATS_SORTS = {
  'hazennstuff:counterspell_spider_lily': 0.5   // Contre-sort : lys araignée, dégâts divisés par deux
}
var NERF_GROS_SORTS = [
  'cursespells:catastrophe', 'cursespells:skyfall', 'cursespells:blade_of_judgment',
  'cursespells:pillar_of_sin', 'cursespells:the_sky_and_cosmos_are_one', 'cursespells:abhorrent_star'
]

// Les écouteurs ajoutés à la main survivent à /reload : un numéro de chargement évite qu'ils s'empilent.
var NERF_GEN = String(Date.now()) + '_' + Math.floor(Math.random() * 1e6)
var NERF_SV = null
function nerfActuel() {
  try {
    if (!NERF_SV) NERF_SV = Java.loadClass('net.neoforged.neoforge.server.ServerLifecycleHooks')
    var sv = NERF_SV.getCurrentServer()
    if (!sv) return true
    var g = String(sv.persistentData.getString('envouteur_nerf_gen'))
    return g === '' || g === NERF_GEN
  } catch (e) { return true }
}
function nerfNoter(sv) { try { sv.persistentData.putString('envouteur_nerf_gen', NERF_GEN) } catch (e) {} }
try { nerfNoter(Java.loadClass('net.neoforged.neoforge.server.ServerLifecycleHooks').getCurrentServer()) } catch (e) {}
ServerEvents.loaded(function (event) { nerfNoter(event.server) })

function nerfGros(id) { return NERF_GROS_SORTS.indexOf(String(id)) !== -1 }
function nerfEcouter(nom, classe, fn) {
  try {
    var BUS = Java.loadClass('net.neoforged.neoforge.common.NeoForge').EVENT_BUS
    var PRIO = Java.loadClass('net.neoforged.bus.api.EventPriority').NORMAL
    BUS.addListener(PRIO, false, Java.loadClass(classe), function (e) {
      if (!nerfActuel()) return
      try { fn(e) } catch (err) { console.error('[envouteur_nerf] ' + nom + ' : ' + err) }
    })
  } catch (e) { console.error('[envouteur_nerf] ' + nom + ' impossible : ' + e) }
}

// 1) dégâts. Le mod Curse Spells impose le montant final des sorts « perce-défenses » (Abhorrent Star...) dans
// LivingDamageEvent$Pre : un nerf posé sur SpellDamageEvent serait écrasé. On agit donc en dernier (priorité LOWEST).
// Dégâts minimum par touche (sorts dont la puissance de base est nulle : au niveau 1 ils n'infligeaient rien)
var DEGATS_PLANCHER = { 'monsterspellbooks:life_drain': 3 }
var NERF_SDS = null
try { NERF_SDS = Java.loadClass('io.redspace.ironsspellbooks.damage.SpellDamageSource') } catch (e) {}
try {
  var BUS_N = Java.loadClass('net.neoforged.neoforge.common.NeoForge').EVENT_BUS
  var PRIO_N = Java.loadClass('net.neoforged.bus.api.EventPriority').LOWEST
  BUS_N.addListener(PRIO_N, false, Java.loadClass('net.neoforged.neoforge.event.entity.living.LivingDamageEvent$Pre'), function (e) {
    if (!nerfActuel()) return
    try {
      var src = e.getSource()
      if (!NERF_SDS || !(src instanceof NERF_SDS)) return
      var id = String(src.spell().getSpellId())
      var plancher = DEGATS_PLANCHER[id]
      if (plancher !== undefined && e.getNewDamage() < plancher) e.setNewDamage(plancher)
      var mult = NERF_DEGATS_SORTS[id]
      if (mult === undefined && NERF_DEGATS_GROS.indexOf(id) !== -1) mult = NERF_PUISSANCE
      if (mult === undefined) return
      e.setNewDamage(e.getNewDamage() * mult)
    } catch (err) { console.error('[envouteur_nerf] degats : ' + err) }
  })
} catch (e) { console.error('[envouteur_nerf] degats impossible : ' + e) }
// 2) recharge
nerfEcouter('recharge', 'io.redspace.ironsspellbooks.api.events.SpellCooldownAddedEvent$Pre', function (e) {
  if (!nerfGros(e.getSpell().getSpellId())) return
  e.setEffectiveCooldown(Math.round(e.getEffectiveCooldown() * NERF_RECHARGE))
})
// 3) mana (depuis la valeur d'origine)
nerfEcouter('mana', 'io.redspace.ironsspellbooks.api.events.SpellOnCastEvent', function (e) {
  if (!nerfGros(e.getSpellId())) return
  e.setManaCost(Math.round(e.getOriginalManaCost() * NERF_MANA))
})
console.info('[envouteur_nerf] actif : dégâts x' + NERF_PUISSANCE + ', recharge x' + NERF_RECHARGE + ', mana x' + NERF_MANA)
