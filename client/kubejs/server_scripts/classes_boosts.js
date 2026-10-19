// Fusion des bonus de puissance et de résistance entre les mods.
// Chaque règle : l'attribut "cible" reçoit en plus les bonus des attributs "sources".
// Ainsi un objet qui boostait l'école d'un autre mod (Soma, Cataclysm, Aces...) boost aussi
// l'école principale de la classe, et inversement pour les groupes marqués « mutuel ».
// Fonctionne pour toutes les sources (armures, armes, curios, effets) : il suffit de /reload.
//
// Rappel : l'école « Sable » de Cataclysm Spellbooks utilise la puissance de NATURE d'Iron's ;
// la Géomancie et le Vent la renforcent donc aussi, pour que les sorts de sable en profitent.

var P = 'irons_spellbooks:'
var GROUPES_FUSION = [
  // ── Feu : les modes « feu d'âme » et « feu infernal » de Soma renforcent le Feu classique
  { cible: P + 'fire_spell_power', sources: ['somakespells:soul_fire_spell_power', 'somakespells:infernal_fire_spell_power'] },

  // ── Hydromancien : Hydro (Aces) = Aqua (Soma) = Abyssal (Cataclysm) — mutuel
  { mutuel: ['aces_spell_utils:hydro_spell_power', 'somakespells:aqua_spell_power', 'cataclysm_spellbooks:abyssal_spell_power'] },
  { mutuel: ['aces_spell_utils:hydro_magic_resist', 'somakespells:aqua_magic_resist', 'cataclysm_spellbooks:abyssal_magic_resist'] },

  // ── Technomancien : Aces = Cataclysm — mutuel
  { mutuel: ['aces_spell_utils:technomancy_spell_power', 'cataclysm_spellbooks:technomancy_spell_power'] },
  { mutuel: ['aces_spell_utils:technomancy_magic_resist', 'cataclysm_spellbooks:technomancy_magic_resist'] },

  // ── Sable (Cataclysm) : ses sorts utilisent la Nature ; Géomancie et Vent la renforcent
  { cible: P + 'nature_spell_power', sources: ['gtbcs_geomancy_plus:geo_spell_power', 'wind_spellbooks:wind_spell_power'] },
  { cible: P + 'nature_magic_resist', sources: ['gtbcs_geomancy_plus:geo_magic_resist', 'wind_spellbooks:wind_magic_resist'] },

  // ── Écoles libres : Indicible (Iron's) = Occulte (Aces) = Prismatique (Crystal Chronicles) — mutuel
  { mutuel: [P + 'eldritch_spell_power', 'aces_spell_utils:ritual_spell_power', 'crystal_chronicles:prismatic_spell_power'] },
  { mutuel: [P + 'eldritch_magic_resist', 'aces_spell_utils:ritual_magic_resist', 'crystal_chronicles:prismatic_magic_resist'] }
]

var FU = null
function initFusion() {
  FU = {}
  FU.attrReg = Java.loadClass('net.minecraft.core.registries.BuiltInRegistries').ATTRIBUTE
  FU.RL = Java.loadClass('net.minecraft.resources.ResourceLocation')
  FU.Modif = Java.loadClass('net.minecraft.world.entity.ai.attributes.AttributeModifier')
  FU.Op = Java.loadClass('net.minecraft.world.entity.ai.attributes.AttributeModifier$Operation')
  FU.holders = {}
  FU.regles = []          // { cible, sources } après dépliage des groupes mutuels
  for (var i = 0; i < GROUPES_FUSION.length; i++) {
    var g = GROUPES_FUSION[i]
    if (g.mutuel) {
      for (var j = 0; j < g.mutuel.length; j++) {
        var autres = []
        for (var k = 0; k < g.mutuel.length; k++) if (k !== j) autres.push(g.mutuel[k])
        FU.regles.push({ cible: g.mutuel[j], sources: autres })
      }
    } else {
      FU.regles.push({ cible: g.cible, sources: g.sources })
    }
  }
  var absents = []
  for (var r = 0; r < FU.regles.length; r++) {
    if (!holderFusion(FU.regles[r].cible) && absents.indexOf(FU.regles[r].cible) === -1) absents.push(FU.regles[r].cible)
  }
  if (absents.length) console.warn('[classes_boosts] attributs introuvables (mod absent ou nom différent) : ' + absents.join(', '))
}

function holderFusion(id) {
  if (FU.holders[id] !== undefined) return FU.holders[id]
  var opt = FU.attrReg.getHolder(FU.RL.parse(id))
  FU.holders[id] = opt.isPresent() ? opt.get() : null
  return FU.holders[id]
}

function idModif(cible) {
  return FU.RL.parse('classes_rp:fusion_' + cible.replace(':', '_'))
}

// Valeur du bonus brut d'un attribut (1.0 = aucun) une fois nos propres ajouts retirés.
function bonusBrut(joueur, id) {
  var h = holderFusion(id)
  if (!h) return 0
  var inst = joueur.getAttribute(h)
  if (!inst) return 0
  var base = inst.getBaseValue()
  if (!base) return 0
  return inst.getValue() / base - 1
}

// removeModifier existe en deux versions (identifiant / modificateur) : on précise laquelle appeler.
function retirerModif(inst, id) {
  try {
    inst['removeModifier(net.minecraft.resources.ResourceLocation)'](id)
  } catch (e) {
    var m = inst.getModifier(id)
    if (m) inst['removeModifier(net.minecraft.world.entity.ai.attributes.AttributeModifier)'](m)
  }
}

function appliquerFusion(joueur) {
  if (!FU) return
  var i, h, inst
  // 1) on retire d'abord nos anciens ajouts pour lire les valeurs « vraies »
  for (i = 0; i < FU.regles.length; i++) {
    h = holderFusion(FU.regles[i].cible)
    if (!h) continue
    inst = joueur.getAttribute(h)
    if (inst) retirerModif(inst, idModif(FU.regles[i].cible))
  }
  // 2) on calcule tous les ajouts à partir de ces valeurs, puis on les pose
  var ajouts = []
  for (i = 0; i < FU.regles.length; i++) {
    var total = 0
    for (var s = 0; s < FU.regles[i].sources.length; s++) {
      total += bonusBrut(joueur, FU.regles[i].sources[s])
    }
    ajouts.push(total)
  }
  for (i = 0; i < FU.regles.length; i++) {
    if (Math.abs(ajouts[i]) < 0.0001) continue
    h = holderFusion(FU.regles[i].cible)
    if (!h) continue
    inst = joueur.getAttribute(h)
    if (!inst) continue
    inst.addTransientModifier(new FU.Modif(idModif(FU.regles[i].cible), ajouts[i], FU.Op.ADD_MULTIPLIED_BASE))
  }
}

try {
  initFusion()
  PlayerEvents.tick(function (event) {
    var joueur = event.player
    if (joueur.level.time % 20 !== 7) return
    try { appliquerFusion(joueur) } catch (e) { console.error('[classes_boosts] ' + e) }
  })
  console.info('[classes_boosts] Fusion des bonus entre mods active (' + FU.regles.length + ' règles).')
} catch (e) {
  console.error('[classes_boosts] Indisponible : ' + e)
}
