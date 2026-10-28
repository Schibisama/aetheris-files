// Classes RP : une école de sorts par joueur, tirée au sort à la première connexion.
// Dépend de : KubeJS + Spell Codex (commande /specs_codex school ...).
// À placer dans : <instance ou serveur>/kubejs/server_scripts/classes_rp.js  (puis /reload)
// NB : le moteur de script de KubeJS (Rhino) gère mal "const" dans les fonctions et les boucles ;
//      on utilise donc "var" et des fonctions auxiliaires dans tout ce qui est exécuté en boucle.

// ───────────────────────── RÉGLAGES ─────────────────────────
var CLASSES = [
  { nom: 'Pyromancien',      ecole: 'irons_spellbooks:fire' },
  { nom: 'Cryomancien',      ecole: 'irons_spellbooks:ice' },
  { nom: 'Électro-Sorcier',  ecole: 'irons_spellbooks:lightning' },
  { nom: 'Paladin',           ecole: 'irons_spellbooks:holy' },
  { nom: 'Hémomancien',      ecole: 'irons_spellbooks:blood' },
  { nom: 'Voyageur du Vide', ecole: 'irons_spellbooks:ender' },
  { nom: 'Druide',           ecole: 'irons_spellbooks:nature' },
  { nom: 'Évocateur',        ecole: 'irons_spellbooks:evocation' },
  { nom: 'Chronomancien',    ecole: 'chronomancy:chronomancy' },
  { nom: 'Géomancien',       ecole: 'gtbcs_geomancy_plus:geo', sup: ['cataclysm_spellbooks:sand'] },
  { nom: 'Aéromancien',      ecole: 'wind_spellbooks:wind', sup: ['cataclysm_spellbooks:sand'] },
  { nom: 'Chromancien',      ecole: 'colormagic:color_magic' },
  { nom: 'Hydromancien',     ecole: 'aces_spell_utils:hydro', sup: ['somakespells:aqua', 'cataclysm_spellbooks:abyssal'] },
  { nom: 'Nécromancien',     ecole: 'monsterspellbooks:necro' },
  { nom: 'Réprouvé',         ecole: 'cursed_school:cursed' },
  { nom: 'Envoûteur',        ecole: 'cursespells:curse' },
  { nom: 'Ésotériste',       ecole: 'esoteric_spell:esoteric' },
  { nom: 'Astromancien',     ecole: 'asterismarcanum:astral', sup: ['tempest_almanac:astral'] },
  { nom: 'Spiritualiste',    ecole: 'iss_magicfromtheeast:spirit' },
  { nom: 'Symétriste',       ecole: 'iss_magicfromtheeast:symmetry' },
  { nom: 'Technomancien',    ecole: 'aces_spell_utils:technomancy', sup: ['cataclysm_spellbooks:technomancy'] }
]

// Écoles accessibles à TOUS les joueurs, quelle que soit leur classe.
// Occultiste (plus une classe). Technomancie est désormais la classe Technomancien.
var ECOLES_LIBRES = [
  'irons_spellbooks:eldritch'
]

// Sorts dont l'accès ne suit PAS l'école : liste des classes autorisées ('*' = tout le monde).
// Les autres classes ne peuvent pas les lancer, même si leur école est débloquée ; les classes
// autorisées peuvent les lancer même si l'école est verrouillée.
var SORTS_PAR_CLASSE = {
  // Woodwalkers
  'woodwalkers_spellbooks:shapeshifting': ['*'],
  // Crystal Chronicles : Portail Prismatique, pour tout le monde (son onglet est fusionné dans Occultiste)
  'crystal_chronicles:prismatic_portal': ['*'],
  // Soma : Lien en Chaîne -> Envoûteur
  'somakespells:chain_connection': ['Envoûteur'],
  // Cataclysm: Spellbooks
  'cataclysm_spellbooks:abyssal_slash': ['Hydromancien'],
  'cataclysm_spellbooks:tidal_grab': ['Hydromancien'],
  'cataclysm_spellbooks:abyssal_predator': ['Hydromancien'],
  'cataclysm_spellbooks:piercing_bone': ['Nécromancien'],
  'cataclysm_spellbooks:bone_storm': ['Nécromancien'],
  'cataclysm_spellbooks:conjure_thralls': ['Nécromancien'],
  'cataclysm_spellbooks:conjure_ignited_reinforcement': ['Évocateur'],
  'cataclysm_spellbooks:malevolent_battlefield': ['Spiritualiste'],
  'cataclysm_spellbooks:forgone_rage': ['Spiritualiste'],
  'cataclysm_spellbooks:cursed_rush': ['Spiritualiste'],
  'cataclysm_spellbooks:monolith_crash': ['Géomancien'],
  'cataclysm_spellbooks:pharaohs_wrath': ['Géomancien'],
  'cataclysm_spellbooks:conjure_koboldiator': ['Géomancien'],
  'cataclysm_spellbooks:summon_koboleton': ['Géomancien'],
  'cataclysm_spellbooks:thoths_witness': ['Géomancien'],
  // Apprentice's Codex,
  'apprenticecodex:earth_forge': ['Géomancien'],
  'apprenticecodex:graced_rain': ['Hydromancien'],
  'apprenticecodex:terra_resonance': ['Géomancien', 'Druide'],
  'apprenticecodex:mage_light': ['*'],
  'apprenticecodex:mana_mending': ['*'],
  'apprenticecodex:artisan_smash': ['Technomancien'],
  'apprenticecodex:magic_spear': ['Technomancien'],
  'apprenticecodex:thermal_process': ['Technomancien'],
  'apprenticecodex:thermal_slice': ['Pyromancien', 'Technomancien'],
  'apprenticecodex:auto_magnet': ['Technomancien', 'Électro-Sorcier'],
  'apprenticecodex:long_stride': ['Électro-Sorcier', 'Voyageur du Vide'],
  'apprenticecodex:manifestation_grimoire': ['*'],
  'apprenticecodex:mantis_leap': ['Technomancien'],
  'apprenticecodex:mirage_avoidance': ['Électro-Sorcier', 'Voyageur du Vide'],
  'apprenticecodex:personal_shelf': ['*'],
  'apprenticecodex:remote_eye': ['Spiritualiste'],
  'apprenticecodex:servant_gaze': ['Technomancien', 'Voyageur du Vide'],
  'apprenticecodex:breaching_enemy': ['Technomancien'],
  'apprenticecodex:bullet_stream': ['Technomancien'],
  'apprenticecodex:commence_fire': ['Technomancien'],
  'apprenticecodex:dual_acrobat': ['Technomancien'],
  'apprenticecodex:field_overseer': ['Technomancien'],
  'apprenticecodex:fly_swatter': ['Technomancien'],
  'apprenticecodex:quick_arms': ['Technomancien'],
  'apprenticecodex:shiden': ['Technomancien'],
  'apprenticecodex:sky_edge': ['Technomancien'],
  'apprenticecodex:archer_multiple': ['Technomancien'],
  'apprenticecodex:auto_turret': ['Technomancien'],
  'apprenticecodex:bound_bow': ['Technomancien'],
  'apprenticecodex:bound_sword': ['Technomancien'],
  'apprenticecodex:call_broom': ['*'],
  'apprenticecodex:companion_trunk': ['*'],
  'apprenticecodex:fujin': ['Aéromancien'],
  'apprenticecodex:lethal_assault': ['Technomancien'],
  'apprenticecodex:precision_jack': ['Technomancien'],
  'apprenticecodex:silent_assassin': ['Technomancien'],
  'apprenticecodex:slash_blade': ['Technomancien'],
  'apprenticecodex:tamers_pocket': ['*'],
  'apprenticecodex:tiro_volley': ['Technomancien'],
  // Hazen N Stuff
  'hazennstuff:violent_regurgitation': ['Hémomancien'],
  'hazennstuff:counterspell_spider_lily': ['Géomancien', 'Druide'],
  'hazennstuff:syringe_barrage': ['Hémomancien'],
  'hazennstuff:bone_bolt': ['Évocateur'],
  'hazennstuff:spectral_axe': ['Spiritualiste'],
  'hazennstuff:umbrashift_barrage': ['Réprouvé'],
  'hazennstuff:shadow_reaver': ['Envoûteur'],
  'hazennstuff:soul_seekers': ['Nécromancien', 'Envoûteur'],
  'hazennstuff:arcane_cards': ['Évocateur'],
  'hazennstuff:cosmic_bolt': ['Astromancien'],
  'hazennstuff:evercomet_barrage': ['Astromancien'],
  'hazennstuff:moonkissed': ['Astromancien'],
  'hazennstuff:parry': ['*'],
  'hazennstuff:thorn_chakram': ['Druide'],
  'hazennstuff:golden_shower': ['Hydromancien'],
  'hazennstuff:shooting_star': ['Astromancien'],
  'hazennstuff:prismatic_shift': ['Astromancien'],
  'hazennstuff:nights_edge_strike': ['Réprouvé'],
  // Hazen N Stuff reclasse ces sorts d'Iron's dans ses écoles Cosmique / Ombre : on garde leur classe d'origine
  'irons_spellbooks:black_hole': ['Voyageur du Vide', 'Astromancien'],
  'irons_spellbooks:starfall': ['Voyageur du Vide', 'Astromancien'],
  'irons_spellbooks:wither_skull': ['Hémomancien'],
  // Farmer's Spell (école Gluttony -> Druide)
  'farmers_spell:goodberry': ['Druide'],
  'farmers_spell:phantom_loot': ['Druide'],
  'farmers_spell:seal_coat': ['Druide'],
  'farmers_spell:bad_apple': ['Druide'],
  'farmers_spell:chaos_slash': ['Druide'],
  'farmers_spell:preserve_circle': ['Druide'],
  'farmers_spell:pan': ['Druide'],
  // ── Rééquilibrage : sorts partagés avec les classes les moins dotées ──
  'irons_spellbooks:slow': ['Évocateur', 'Chronomancien'],
  'irons_spellbooks:haste': ['Paladin', 'Chronomancien'],
  'irons_spellbooks:evasion': ['Voyageur du Vide', 'Chronomancien', 'Aéromancien'],
  'irons_spellbooks:recall': ['*'], // Rappel : pour tout le monde (onglet Occultiste)
  'irons_spellbooks:teleport': ['Voyageur du Vide', 'Chronomancien'],
  'apprenticecodex:quick_blink': ['Voyageur du Vide', 'Chronomancien'],
  'irons_spellbooks:counterspell': ['Voyageur du Vide', 'Chronomancien', 'Symétriste'],
  'gametechbcs_spellbooks:displacement': ['Voyageur du Vide', 'Chronomancien'],
  'firesenderexpansion:dimensional_adaptation': ['Voyageur du Vide', 'Chronomancien'],
  'irons_spellbooks:wololo': ['Évocateur', 'Chromancien'],
  'irons_spellbooks:firecracker': ['Évocateur', 'Chromancien'],
  'apprenticecodex:wizardlamp': ['Paladin', 'Chromancien'],
  'irons_spellbooks:firefly_swarm': ['Druide', 'Chromancien'],
  'monsterspellbooks:enchanters_boost': ['Évocateur', 'Chromancien'],
  'somakespells:comforting_lullaby': ['Évocateur', 'Chromancien'],
  'somakespells:slumber_melody': ['Évocateur', 'Chromancien'],
  'somakespells:jingle_bell': ['Évocateur', 'Chromancien'],
  'irons_spellbooks:shield': ['Évocateur', 'Chromancien'],
  'somakespells:resonant_pulse': ['Évocateur', 'Chromancien'],
  'irons_spellbooks:cleanse': ['Paladin', 'Chromancien'],
  'irons_spellbooks:lightning_bolt': ['Électro-Sorcier', 'Aéromancien'],
  'irons_spellbooks:thunderstorm': ['Électro-Sorcier', 'Aéromancien'],
  'apprenticecodex:feather_rush': ['Évocateur', 'Aéromancien'],
  'irons_spellbooks:charge': ['Électro-Sorcier', 'Aéromancien'],
  'monsterspellbooks:soul_form': ['Nécromancien', 'Spiritualiste'],
  'monsterspellbooks:spirit_strike': ['Nécromancien', 'Spiritualiste'],
  'monsterspellbooks:soul_chain': ['Nécromancien', 'Spiritualiste'],
  'monsterspellbooks:soul_scorch': ['Nécromancien', 'Spiritualiste'],
  'monsterspellbooks:spectral_blast': ['Nécromancien', 'Spiritualiste'],
  'monsterspellbooks:banshee_scream': ['Nécromancien', 'Spiritualiste'],
  'monsterspellbooks:soul_casting_field': ['Nécromancien', 'Spiritualiste'],
  'apprenticecodex:sense_evil': ['Paladin', 'Spiritualiste'],
  'firesenderexpansion:binary_stars': ['Voyageur du Vide', 'Astromancien'],
  'gametechbcs_spellbooks:astral_sense': ['Voyageur du Vide', 'Astromancien'],
  'monsterspellbooks:firmament_splitter': ['Voyageur du Vide', 'Astromancien'],
  'gtbcs_geomancy_plus:solar_beam': ['Paladin', 'Astromancien'],
  'gtbcs_geomancy_plus:solar_storm': ['Paladin', 'Astromancien'],
  'irons_spellbooks:sunbeam': ['Paladin', 'Astromancien'],
  'apprenticecodex:lunar_aim': ['Cryomancien', 'Astromancien'],
  'gametechbcs_spellbooks:meteor_storm': ['Pyromancien', 'Astromancien'],
  'firesenderexpansion:arcane_slice': ['Voyageur du Vide', 'Symétriste'],
  'irons_spellbooks:shadow_slash': ['Voyageur du Vide', 'Symétriste'],
  'irons_spellbooks:echoing_strikes': ['Voyageur du Vide', 'Symétriste'],
  'irons_spellbooks:earthquake': ['Druide', 'Géomancien'],
  'irons_spellbooks:stomp': ['Druide', 'Géomancien'],
  'irons_spellbooks:root': ['Druide', 'Géomancien'],
  'gametechbcs_spellbooks:ensnare': ['Druide', 'Géomancien'],
  'cataclysm_spellbooks:amethyst_puncture': ['Druide', 'Géomancien'],
  'cataclysm_spellbooks:conjure_amethyst_crab': ['Druide', 'Géomancien'],
  'irons_spellbooks:oakskin': ['Druide', 'Géomancien']
}

// Sorts désactivés pour tout le monde.
var SORTS_DESACTIVES = [
  'cataclysm_spellbooks:depth_charge',
  'cataclysm_spellbooks:abyssal_blast',
  'cataclysm_spellbooks:dimensional_rift',
  'cataclysm_spellbooks:void_beam',
  'apprenticecodex:linear_build',
  'hazennstuff:call_forth_terraprisma',
  'hazennstuff:terraprismic_barrage'
]

function classeAutorisee(permis, nomClasse) {
  return permis.indexOf('*') !== -1 || permis.indexOf(nomClasse) !== -1
}

var ENCRE = 'minecraft:nether_star' // objet demandé au PNJ (le nom de la constante vient de l'ancienne encre)
var COUT_ENCRE = 1
var REROLLS_MAX = 3
var CLE_TEST = 'classe_testeur' // mode testeur (modérateurs) : toutes les classes à la fois

var SpellRegistryJ = null
var ResourceLocationJ = null
try {
  SpellRegistryJ = Java.loadClass('io.redspace.ironsspellbooks.api.registry.SpellRegistry')
  ResourceLocationJ = Java.loadClass('net.minecraft.resources.ResourceLocation')
} catch (e) {
  console.error('[classes_rp] API des écoles de sorts indisponible : ' + e)
}

// École d'un sort d'après le registre d'Iron's Spells (null si introuvable).
function ecoleDuSort(idSort) {
  try {
    var sort = SpellRegistryJ.getSpell(ResourceLocationJ.tryParse(String(idSort)))
    if (!sort) return null
    return String(sort.getSchoolType().getId())
  } catch (e) {
    return null
  }
}

function estTest(joueur) {
  try {
    return joueur.persistentData.getBoolean(CLE_TEST)
  } catch (e) {
    return false
  }
}

// Écoles déjà ouvertes par la classe elle-même (école, écoles en plus, écoles libres).
function ecolesDeLaClasse(classe) {
  var liste = [classe.ecole]
  if (classe.sup) {
    for (var i = 0; i < classe.sup.length; i++) liste.push(classe.sup[i])
  }
  for (var j = 0; j < ECOLES_LIBRES.length; j++) liste.push(ECOLES_LIBRES[j])
  return liste
}

// Objets réservés à certaines classes.
// "regle" = expression régulière testée sur l'identifiant de l'objet (ex. "modid:nom_objet").
var RESTRICTIONS = [
  { regle: /^minecraft:elytra$/, classes: [] },
  // ═══════════ RÈGLES PERSONNALISÉES (prioritaires : la première règle qui correspond l'emporte) ═══════════
  // ── Désactivés (aucune classe) ──
  { regle: /^apprenticecodex:(.*_spellcaster_gun|focus_staffbow|multipurpose_staffrifle|fullauto_rapidcast_spellrifle|.*_swingcast_staff|revolvercast_staff|scrollcaster_gauntlet|circuit_heat_staff|charged_twin_blade_staff|magi_agent_suit_.*)$/, classes: [] },
  { regle: /^cataclysm_spellbooks:(excelsius_.*|cursium_mage_.*|ignis_.*|hellfire_forge)$/, classes: [] },
  { regle: /^somakespells:forbidden_hammer$/, classes: [] },
  { regle: /^iss_magicfromtheeast:repeating_crossbow$/, classes: [] },
  // Cataclysm (mod principal)
  { regle: /^cataclysm:(meat_shredder|laser_gatling|wither_assault_shoulder_weapon|void_assault_shoulder_weapon|void_forge|tidal_claws|infernal_forge|bulwark_of_the_flame|gauntlet_of_guard|gauntlet_of_bulwark|gauntlet_of_maelstrom|the_incinerator|monstrous_helm)$/, classes: [] },
  { regle: /^cataclysm:(ignitium_(helmet|chestplate|elytra_chestplate|leggings|boots)|cursium_(helmet|chestplate|leggings|boots))$/, classes: [] },

  // ── Iron's Spells 'n Spellbooks ──
  { regle: /^irons_spellbooks:decrepit_scythe$/, classes: ['Évocateur'] },
  { regle: /^irons_spellbooks:hellrazor$/, classes: ['Pyromancien'] },
  { regle: /^irons_spellbooks:twilight_gale$/, classes: ['Électro-Sorcier', 'Aéromancien'] },
  // ── Wind Spellbooks ──
  { regle: /^wind_spellbooks:(aeromancer_(helmet|chestplate|leggings|boots)|wind_staff)$/, classes: ['Aéromancien'] },
  // ── Cursed School / Curse Spells ──
  { regle: /^cursed_school:margin_reaper$/, classes: ['Réprouvé'] },
  // ── Apprentice's Codex ──
  { regle: /^apprenticecodex:crystal_bladed_staff$/, classes: ['Voyageur du Vide'] },
  { regle: /^apprenticecodex:(illuminate_stellar_staff|unite_luna_staff)$/, classes: ['Paladin', 'Astromancien', 'Chromancien'] },
  { regle: /^apprenticecodex:(chromatic_magia_dress_(hat|coat|leggings|boots)|pastel_staff)$/, classes: ['Chromancien'] },
  { regle: /^apprenticecodex:element_maiden_robe_(ribbon|robe|leggings|boots)$/, classes: ['Paladin', 'Chromancien'] },
  { regle: /^apprenticecodex:elemental_bow$/, classes: ['Druide', 'Pyromancien', 'Hydromancien'] },
  { regle: /^apprenticecodex:explorers_cane$/, classes: ['Voyageur du Vide', 'Électro-Sorcier', 'Technomancien', 'Aéromancien'] },
  { regle: /^apprenticecodex:spell_reaper_scythe$/, classes: ['Nécromancien'] },
  // ── Cataclysm: Spellbooks ──
  { regle: /^cataclysm_spellbooks:monstrous_flamberge$/, classes: ['Pyromancien'] },
  { regle: /^cataclysm_spellbooks:coral_staff$/, classes: ['Hydromancien'] },
  { regle: /^cataclysm_spellbooks:fake_wudjets_staff$/, classes: ['Druide', 'Paladin'] },
  { regle: /^cataclysm_spellbooks:void_staff$/, classes: ['Voyageur du Vide'] },
  { regle: /^cataclysm_spellbooks:(engineer_(boots|hood|leggings|suit)|engineers_power_glove)$/, classes: ['Technomancien'] },
  { regle: /^cataclysm_spellbooks:pharaoh_(helmet|chestplate|leggings|greaves)$/, classes: ['Géomancien'] },
  { regle: /^cataclysm_spellbooks:spirit_sunderer$/, classes: ['Cryomancien'] },
  { regle: /^cataclysm_spellbooks:soul_brazier$/, classes: ['Spiritualiste'] },
  { regle: /^iss_magicfromtheeast:muramasa$/, classes: ['Hémomancien'] },
  // ── Cataclysm (mod principal) : armes et armures ──
  { regle: /^cataclysm:(coral_spear|coral_bardiche|ceraunus)$/, classes: ['Hydromancien'] },
  { regle: /^cataclysm:cursed_bow$/, classes: ['Spiritualiste'] },
  { regle: /^cataclysm:wrath_of_the_desert$/, classes: ['Aéromancien', 'Géomancien'] },
  { regle: /^cataclysm:ancient_spear$/, classes: ['Aéromancien', 'Géomancien'] },
  { regle: /^cataclysm:soul_render$/, classes: ['Symétriste'] },
  { regle: /^cataclysm:the_annihilator$/, classes: ['Spiritualiste'] },
  { regle: /^cataclysm:the_immolator$/, classes: ['Pyromancien'] },
  { regle: /^cataclysm:(astrape|brontes)$/, classes: ['Électro-Sorcier', 'Aéromancien'] },
  { regle: /^cataclysm:bloom_stone_pauldrons$/, classes: ['Druide', 'Géomancien'] },
  { regle: /^cataclysm:bone_reptile_(helmet|chestplate)$/, classes: ['Druide', 'Géomancien'] },
  // ── Monster Spellbooks ──
  { regle: /^monsterspellbooks:(dwarven_engineer_(visor|chestplate|leggings|boots))$/, classes: ['Électro-Sorcier', 'Technomancien'] },
  { regle: /^monsterspellbooks:dwarven_shield$/, classes: ['Technomancien', 'Électro-Sorcier', 'Aéromancien'] },
  { regle: /^monsterspellbooks:forge_masterpiece_(helmet|chestplate|leggings|boots)$/, classes: ['Pyromancien', 'Technomancien'] },
  { regle: /^monsterspellbooks:herobrine_cultist_(helmet|chestplate|leggings|boots)$/, classes: ['Pyromancien', 'Nécromancien', 'Hémomancien'] },
  { regle: /^monsterspellbooks:(starscourge_(helmet|chestplate|leggings|boots|sword))$/, classes: ['Voyageur du Vide', 'Astromancien'] },
  { regle: /^monsterspellbooks:unstable_robes_(helmet|chestplate|leggings|boots)$/, classes: ['Voyageur du Vide'] },
  { regle: /^monsterspellbooks:(claws_of_calamity)$/, classes: ['Électro-Sorcier', 'Aéromancien'] },
  { regle: /^monsterspellbooks:eternal_knife$/, classes: ['Nécromancien'] },
  { regle: /^monsterspellbooks:(great_axeblade|village_butcherer)$/, classes: ['Évocateur'] },
  { regle: /^monsterspellbooks:orichalcum_(axe|dagger|greataxe|greatsword|warhammer)$/, classes: ['Druide', 'Géomancien'] },
  { regle: /^monsterspellbooks:swift_striker$/, classes: ['Voyageur du Vide'] },
  { regle: /^monsterspellbooks:vilenova_staff$/, classes: ['Nécromancien', 'Spiritualiste'] },
  // ── Fire's Ender Expansion ──
  { regle: /^firesenderexpansion:(void_staff|void_staff_holder)$/, classes: ['Voyageur du Vide'] },
  // ── ISS: Magic From The East ──
  { regle: /^iss_magicfromtheeast:(jade_pagoda_(helmet|chestplate|leggings|boots)|jade_guandao)$/, classes: ['Symétriste'] },
  { regle: /^iss_magicfromtheeast:mist_boots$/, classes: ['Hydromancien'] },
  { regle: /^iss_magicfromtheeast:(soul_breaker|soul_katana|spirit_crusher)$/, classes: ['Spiritualiste'] },
  // ── SomakeSpells ──
  { regle: /^somakespells:abyssium_(helmet|chestplate|leggings|boots)$/, classes: ['Voyageur du Vide'] },
  { regle: /^somakespells:ceranium_(helmet|chestplate|leggings|boots)$/, classes: ['Hydromancien', 'Électro-Sorcier', 'Aéromancien'] },
  { regle: /^somakespells:(ignitium_staff|soul_fire_ignitium_staff|infernal_fire_ignitium_staff)$/, classes: ['Pyromancien'] },
  { regle: /^somakespells:archangels_staff$/, classes: ['Paladin'] },
  { regle: /^somakespells:copper_glove$/, classes: ['Technomancien', 'Pyromancien'] },
  { regle: /^somakespells:boltcutter_dagger$/, classes: ['Électro-Sorcier', 'Technomancien'] },
  { regle: /^somakespells:fragmented_sword_[123]$/, classes: ['Hémomancien'] },
  { regle: /^somakespells:glacium_greataxe$/, classes: ['Cryomancien'] },
  { regle: /^somakespells:mirrored_edge$/, classes: ['Symétriste'] },
  { regle: /^somakespells:(monolith_sword|rock_sword)$/, classes: ['Géomancien'] },
  { regle: /^somakespells:totem_dagger$/, classes: ['Évocateur', 'Ésotériste'] },
  // ── Mowzie's Mobs ──
  { regle: /^mowziesmobs:sculptor_staff$/, classes: ['Géomancien'] },
  { regle: /^mowziesmobs:naga_fang_dagger$/, classes: ['Druide'] },
  { regle: /^mowziesmobs:geomancer_(beads|belt|robe|sandals)$/, classes: ['Géomancien', 'Druide'] },
  // ── Farmer's Spell ──
  { regle: /^farmers_spell:gluttony_chef_(hat|apron|leggings|boots)$/, classes: ['Druide'] },
  { regle: /^farmers_spell:hell_knife$/, classes: ['Druide'] },
  { regle: /^farmers_spell:gospel$/, classes: ['Paladin'] },
  { regle: /^farmers_spell:grow_knife$/, classes: ['Druide', 'Géomancien'] },
  // ── Hazen N Stuff : onglet « Utility » (armes, bâtons, curios) désactivé pour tout le monde ──
  { regle: /^hazennstuff:(fireblossom_rapier|firebrand|draconic_splitter|ravens_bane|war_flaming_lance|volcano|ice_pike|frostburn_dagger|beongae|skyscorcher|ionic_splitter_dormant|ionic_splitter_t1|ionic_splitter_t2|ionic_splitter_t3|bountiful_harvest|thorn_chakram|blade_of_grass|o_fortuna_dormant|vampire_knives|devastator_dormant|obsidian_claymore|starfury|umbranova_dormant|hammer_of_justice|excalibur|excalibur_divine_gold|hazens_excalibur|divine_greatsword|hammush|meowmere|spectrum|terraprisma|ancient_warriors_axe|malice|provocation_dormant|soul_reaper|lights_bane|nights_edge|true_nights_edge|astralite_cleaver|tidal_wave|the_devourer|mage_bane|legionnaire_warlock_axe|dawnmaker|muramasa|wisewood_cane|frieren_staff|rod_of_discord|white_lily_staff|soulcalling_scepter|enderconic_scepter|blossom_of_the_enchantress|grimoire_staff|divine_scepter|ceaseless_void|glassweaver_scepter|nexus|coralite_cane|insania_aeternus|spectral_pickaxe|pickaxe_axe|pickaxe_axe_divine_gold|ruptured|refined|reinforced|radiance|shattered|sacred|strengthened|singularity|abstract|advanced|abomination|absolute|golden_shower_spellbook|energized_core_spellbook|galvanized_sheath|scroll_sheath|arbitrium_wings|angel_wings|fallen_angel_wings|blade_of_the_legate|the_prefects_ring|the_tribunes_medallion|ring_of_efficiency|pendant_of_harmony)$/, classes: [] },
  // ── Hazen N Stuff : armures classées selon leur bonus de puissance d'école ──
  { regle: /^hazennstuff:(astraconic_weaver_boots|astraconic_weaver_chestplate|astraconic_weaver_helmet|astraconic_weaver_leggings|cosmic_scholar_boots|cosmic_scholar_chestplate|cosmic_scholar_helmet|cosmic_scholar_leggings|geckolib_astraconic_weaver_boots|geckolib_astraconic_weaver_chestplate|geckolib_astraconic_weaver_helmet|geckolib_astraconic_weaver_leggings|geckolib_cosmic_scholar_boots|geckolib_cosmic_scholar_chestplate|geckolib_cosmic_scholar_helmet|geckolib_cosmic_scholar_leggings)$/, classes: ['Astromancien'] },
  { regle: /^hazennstuff:(cryogenic_ruler_boots|cryogenic_ruler_chestplate|cryogenic_ruler_helmet|cryogenic_ruler_leggings|crystal_arachnid_boots|crystal_arachnid_chestplate|crystal_arachnid_helmet|crystal_arachnid_leggings|frostbite_hunter_boots|frostbite_hunter_chestplate|frostbite_hunter_helmet|frostbite_hunter_leggings|frostbite_knight_boots|frostbite_knight_chestplate|frostbite_knight_helmet|frostbite_knight_leggings|herta_puppet_boots|herta_puppet_chestplate|herta_puppet_helmet|herta_puppet_leggings|permafrost_prince_boots|permafrost_prince_chestplate|permafrost_prince_helmet|permafrost_prince_leggings)$/, classes: ['Cryomancien'] },
  { regle: /^hazennstuff:(chlorophyte_boots|chlorophyte_chestplate|chlorophyte_headgear|chlorophyte_mask|chlorophyte_helmet|chlorophyte_leggings|creaking_boots|creaking_chestplate|creaking_helmet|creaking_leggings|geckolib_creaking_boots|geckolib_creaking_chestplate|geckolib_creaking_helmet|geckolib_creaking_leggings|maverick_boots|maverick_chestplate|maverick_helmet|maverick_leggings)$/, classes: ['Druide'] },
  { regle: /^hazennstuff:(geckolib_lemon_god_boots|geckolib_lemon_god_chestplate|geckolib_lemon_god_helmet|geckolib_lemon_god_leggings|lemon_god_boots|lemon_god_chestplate|lemon_god_helmet|lemon_god_leggings|mycelium_guardian_boots|mycelium_guardian_chestplate|mycelium_guardian_helmet|mycelium_guardian_leggings)$/, classes: [] },
  { regle: /^hazennstuff:(elder_guardian_boots|elder_guardian_chestplate|elder_guardian_helmet|elder_guardian_leggings|nautilus_knight_boots|nautilus_knight_chestplate|nautilus_knight_helmet|nautilus_knight_leggings)$/, classes: ['Hydromancien'] },
  { regle: /^hazennstuff:(atlas_boots|atlas_chestplate|atlas_helmet|atlas_leggings|dead_king_boots|dead_king_chestplate|dead_king_helmet|dead_king_leggings|flesh_mass_boots|flesh_mass_chestplate|flesh_mass_helmet|flesh_mass_leggings|geckolib_the_wither_boots|geckolib_the_wither_chestplate|geckolib_the_wither_helmet|geckolib_the_wither_leggings|nameless_one_chestplate|nameless_one_helmet|nameless_one_leggings|necromancer_chestplate|necromancer_helmet|necromancer_leggings|the_wither_boots|the_wither_chestplate|the_wither_helmet|the_wither_leggings)$/, classes: ['Hémomancien'] },
  { regle: /^hazennstuff:(bishop_of_deceit_chestplate|bishop_of_deceit_helmet|gabriel_ultrakill_boots|gabriel_ultrakill_chestplate|gabriel_ultrakill_helmet|gabriel_ultrakill_leggings|geckolib_gabriel_ultrakill_boots|geckolib_gabriel_ultrakill_chestplate|geckolib_gabriel_ultrakill_helmet|geckolib_gabriel_ultrakill_leggings|geckolib_seraph_boots|geckolib_seraph_chestplate|geckolib_seraph_helmet|geckolib_seraph_leggings|how_did_you_find_the_mothic_witch_chestplate|mothic_witch_boots|mothic_witch_chestplate|mothic_witch_helmet|mothic_witch_leggings|seraph_boots|seraph_chestplate|seraph_helmet|seraph_leggings|slc_cat_boots|slc_cat_chestplate|slc_cat_helmet|slc_cat_leggings)$/, classes: ['Paladin'] },
  { regle: /^hazennstuff:(blazeborne_boots|blazeborne_chestplate|blazeborne_helmet|blazeborne_leggings|garments_of_the_first_flamebearer_boots|garments_of_the_first_flamebearer_chestplate|garments_of_the_first_flamebearer_helmet|garments_of_the_first_flamebearer_leggings|geckolib_blazeborne_boots|geckolib_blazeborne_chestplate|geckolib_blazeborne_helmet|geckolib_blazeborne_leggings)$/, classes: ['Pyromancien'] },
  { regle: /^hazennstuff:(hazel_boots|hazel_chestplate|hazel_helmet|hazel_leggings|how_did_you_find_the_hazel_chestplate|legionnaire_commander_boots|legionnaire_commander_chestplate|legionnaire_commander_helmet|legionnaire_commander_leggings|legionnaire_ruler_boots|legionnaire_ruler_chestplate|legionnaire_ruler_helmet|legionnaire_ruler_leggings|pyromancer_brute_chestplate|pyromancer_brute_helmet|soul_legionnaire_ruler_boots|soul_legionnaire_ruler_chestplate|soul_legionnaire_ruler_helmet|soul_legionnaire_ruler_leggings)$/, classes: [] },
  { regle: /^hazennstuff:(fireblossom_gown_boots|fireblossom_gown_chestplate|fireblossom_gown_helmet|fireblossom_gown_leggings|geckolib_fireblossom_gown_boots|geckolib_fireblossom_gown_chestplate|geckolib_fireblossom_gown_helmet|geckolib_fireblossom_gown_leggings)$/, classes: ['Druide'] },
  { regle: /^hazennstuff:(fireblossom_knight_boots|fireblossom_knight_chestplate|fireblossom_knight_helmet|fireblossom_knight_leggings|geckolib_fireblossom_knight_boots|geckolib_fireblossom_knight_chestplate|geckolib_fireblossom_knight_helmet|geckolib_fireblossom_knight_leggings)$/, classes: ['Pyromancien'] },
  { regle: /^hazennstuff:(fireblossom_battlemage_boots|fireblossom_battlemage_chestplate|fireblossom_battlemage_helmet|fireblossom_battlemage_leggings|geckolib_fireblossom_battlemage_boots|geckolib_fireblossom_battlemage_chestplate|geckolib_fireblossom_battlemage_helmet|geckolib_fireblossom_battlemage_leggings|legacy_fireblossom_boots|legacy_fireblossom_chestplate|legacy_fireblossom_crown|legacy_fireblossom_helmet|legacy_fireblossom_leggings|legacy_geckolib_fireblossom_boots|legacy_geckolib_fireblossom_chestplate|legacy_geckolib_fireblossom_crown|legacy_geckolib_fireblossom_helmet|legacy_geckolib_fireblossom_leggings)$/, classes: [] },
  { regle: /^hazennstuff:(ender_dragon_boots|ender_dragon_chestplate|ender_dragon_helmet|ender_dragon_leggings|geckolib_ender_dragon_boots|geckolib_ender_dragon_chestplate|geckolib_ender_dragon_helmet|geckolib_ender_dragon_leggings|shadowwalker_enderman_blindfold|shadowwalker_enderman_boots|shadowwalker_enderman_chestplate|shadowwalker_enderman_hood|shadowwalker_enderman_leggings|shadowwalker_enderman_masked)$/, classes: ['Voyageur du Vide'] },
  { regle: /^hazennstuff:(charged_scourge_boots|charged_scourge_chestplate|charged_scourge_helmet|charged_scourge_leggings|thunder_prowler_boots|thunder_prowler_chestplate|thunder_prowler_helmet|thunder_prowler_leggings)$/, classes: ['Électro-Sorcier', 'Aéromancien'] },
  { regle: /^hazennstuff:(alchemist_supreme_boots|alchemist_supreme_chestplate|alchemist_supreme_helmet|alchemist_supreme_leggings|geckolib_supreme_witch_boots|geckolib_supreme_witch_chestplate|geckolib_supreme_witch_helmet|geckolib_supreme_witch_leggings|spectral_spelunker_boots|spectral_spelunker_chestplate|spectral_spelunker_helmet|spectral_spelunker_leggings|supreme_witch_boots|supreme_witch_chestplate|supreme_witch_helmet|supreme_witch_leggings)$/, classes: ['Évocateur'] },
  { regle: /^hazennstuff:(abberant_predator_boots|abberant_predator_chestplate|abberant_predator_helmet|abberant_predator_leggings|masked_fool_boots|masked_fool_chestplate|masked_fool_helmet|masked_fool_leggings|shadow_jester_boots|shadow_jester_chestplate|shadow_jester_helmet|shadow_jester_leggings|shadow_scale_boots|shadow_scale_chestplate|shadow_scale_helmet|shadow_scale_leggings)$/, classes: ['Réprouvé'] },
  { regle: /^hazennstuff:(geckolib_radiant_crystal_boots|geckolib_radiant_crystal_chestplate|geckolib_radiant_crystal_helmet|geckolib_radiant_crystal_leggings|glassweaver_boots|glassweaver_chestplate|glassweaver_helmet|glassweaver_leggings|radiant_crystal_boots|radiant_crystal_chestplate|radiant_crystal_helmet|radiant_crystal_leggings)$/, classes: [] },
  // ── Simply Swords : armes uniques attribuées à une classe ; les autres uniques sont désactivées ──
  { regle: /^simplyswords:(caelestis)$/, classes: ['Voyageur du Vide'] },
  { regle: /^simplyswords:(flamewind)$/, classes: ['Pyromancien'] },
  { regle: /^simplyswords:(chompolotl)$/, classes: ['Hydromancien'] },
  { regle: /^simplyswords:(dawnquiver)$/, classes: ['Paladin'] },
  { regle: /^simplyswords:(stars_edge)$/, classes: ['Astromancien'] },
  { regle: /^simplyswords:(whisperwind)$/, classes: ['Aéromancien'] },
  { regle: /^simplyswords:(soulpyre)$/, classes: ['Envoûteur'] },
  { regle: /^simplyswords:(bloodwake)$/, classes: ['Hémomancien'] },
  { regle: /^simplyswords:(tempest)$/, classes: ['Chromancien'] },
  { regle: /^simplyswords:(dormant_relic|righteous_relic|tainted_relic|harbinger|sunfire)$/, classes: ['Technomancien'] },
  { regle: /^simplyswords:(shadowsting)$/, classes: ['Chronomancien'] },
  { regle: /^simplyswords:(watching_warglaive|watcher_claymore)$/, classes: ['Réprouvé'] },
  { regle: /^simplyswords:(riftmane)$/, classes: ['Évocateur'] },
  { regle: /^simplyswords:(decaying_relic|magiscythe|magiblade|magispear)$/, classes: ['Ésotériste'] },
  { regle: /^simplyswords:(bramblethorn)$/, classes: ['Géomancien'] },
  { regle: /^simplyswords:(hiveheart)$/, classes: ['Druide'] },
  { regle: /^simplyswords:(icewhisper)$/, classes: ['Cryomancien'] },
  { regle: /^simplyswords:(storms_edge)$/, classes: ['Électro-Sorcier'] },
  { regle: /^simplyswords:(soulrender)$/, classes: ['Nécromancien'] },
  { regle: /^simplyswords:(soulstealer)$/, classes: ['Spiritualiste'] },
  { regle: /^simplyswords:(wraithfang)$/, classes: ['Symétriste'] },
  { regle: /^simplyswords:(brimstone_claymore|stormscale|ionbound_stormscale|stormbringer|the_devourer|toxic_longsword|emberblade|hearthflame|frostfall|molten_edge|livyatan|arcanethyst|thunderbrand|slumbering_lichblade|waking_lichblade|awakened_lichblade|dreadwhisper|emberlash|waxweaver|wickpiercer|gloampiercer|dreadtide|ribboncleaver|enigma|wraithmaw|soulkeeper|soulstalker|twilight|twisted_blade|magic_estoc|mjolnir)$/, classes: [] },
  // ═══════════ FIN DES RÈGLES PERSONNALISÉES ═══════════

  // Armures + armes CrystalChronicles
  { regle: /^crystal_chronicles:holy_(knight_(helmet|chestplate|leggings|boots)|sword|shield)$/,           classes: ['Paladin'] },
  { regle: /^crystal_chronicles:ice_(knight_(helmet|chestplate|leggings|boots)|hammer)$/,                  classes: ['Cryomancien'] },
  { regle: /^crystal_chronicles:blood_(knight_(helmet|chestplate|leggings|boots)|scythe)$/,                classes: ['Hémomancien'] },
  { regle: /^crystal_chronicles:ender_(mage_(helmet|chestplate|leggings|boots)|staff|sickle)$/,            classes: ['Voyageur du Vide'] },
  { regle: /^crystal_chronicles:fire_(knight_(helmet|chestplate|leggings|boots)|chakram)$/,                classes: ['Pyromancien'] },
  { regle: /^crystal_chronicles:nature_spear$/, classes: ['Druide'] },
  { regle: /^crystal_chronicles:evocation_twinblade$/, classes: ['Évocateur'] },
  { regle: /^crystal_chronicles:nature_(knight_(helmet|chestplate|leggings|boots)|spear)$/,                classes: ['Druide', 'Géomancien'] },
  { regle: /^crystal_chronicles:lightning_(knight_(helmet|chestplate|leggings|boots)|bident|staff)$/,      classes: ['Électro-Sorcier', 'Aéromancien'] },
  { regle: /^crystal_chronicles:evocation_(knight_(helmet|chestplate|leggings|boots)|twinblade)$/,         classes: ['Évocateur', 'Ésotériste'] },
  // Set Prismatic + Anneau de Diffraction -> Géomancien
  { regle: /^crystal_chronicles:(prismatic_knight_(helmet|chestplate|leggings|boots)|diffraction_ring)$/,  classes: ['Géomancien'] },
  // Chronomancy : set Clocksmith, 2 épées (Clock Hand, Rift Creator) et artefacts -> Chronomancien
  { regle: /^chronomancy:(clocksmith_(helmet|chestplate|leggings|boots)|clock_hand|rift_creator)$/,         classes: ['Chronomancien'] },
  { regle: /^chronomancy:(geminated_ring|cracked_dial|ring_of_rifts|second_chance_watch|hourglass_of_focus|timeless_seal|rift_heart|clockwork_key|deferred_pendulum)$/, classes: ['Chronomancien'] },
  // Objet désactivé pour tout le monde (aucune classe autorisée) : Temporal Anchor
  { regle: /^chronomancy:temporal_anchor$/, classes: [] },
  // ColorMagic : set Artist, armes et artefacts -> Chromancien
  { regle: /^colormagic:(artist_(helmet|chestplate|leggings|boots)|great_brush|blade_of_true_color|battle_brushes)$/, classes: ['Chromancien'] },
  { regle: /^colormagic:(rainbow_ring|flower_ring|travel_easel|abyssal_eye|dried_paint_belt|current_bracelet|tormented_canvas)$/, classes: ['Chromancien'] },
  // Geomancy Plus : arme Stonecaller -> Géomancien (identifiant supposé, tolérant sur le nom exact)
  { regle: /^gtbcs_geomancy_plus:.*stonecaller/, classes: ['Géomancien'] },

  // ── Monsters & Spellbooks : seulement les objets dont le thème est clair ──
  { regle: /^monsterspellbooks:(illager_ember_robe_(helmet|chestplate|leggings|boots)|wildfire_crown|brimstone_orochi|magmatic_macuahuitl|brimstone_sigil|ignition_gloves)$/, classes: ['Pyromancien'] },
  { regle: /^monsterspellbooks:(illager_iceologer_(helmet|chestplate|leggings|boots)|frost_fang|snow_bow|frozen_commander_staff|cold_conjurers_talisman|blizzard_caller)$/, classes: ['Cryomancien'] },
  { regle: /^monsterspellbooks:thundering_quiver$/, classes: ['Électro-Sorcier', 'Technomancien', 'Aéromancien'] },
  { regle: /^monsterspellbooks:(sanguinite_hero_(hood|chestplate|leggings|boots)|sanguinite_(dagger|scythe|axe)|crescent_blood_rose|dukes_heartstealer)$/, classes: ['Hémomancien'] },
  { regle: /^monsterspellbooks:(paladin_hammer|sword_of_courage)$/, classes: ['Paladin'] },
  { regle: /^monsterspellbooks:(fun_gal_cap_red|fun_gal_cap_blue|poison_biter|poison_glaive|eyebloosom_staff)$/, classes: ['Druide'] },
  { regle: /^monsterspellbooks:illager_enchanter_(helmet|chestplate|leggings|boots)$/, classes: ['Évocateur', 'Ésotériste'] },
  { regle: /^monsterspellbooks:(void_touched_blade|endersent_crusher|disruption_naginata)$/, classes: ['Voyageur du Vide'] },
  { regle: /^monsterspellbooks:(necromancer_(helmet|chestplate|leggings|boots)|death_knight_(helmet|chestplate|leggings|boots)|draugr_elite_(helmet|chestplate|leggings|boots)|deathsilver_(dagger|sword|axe|greataxe)|necromancer_trident|reaper_sickle|orb_soul)$/, classes: ['Nécromancien'] },
  { regle: /^monsterspellbooks:(prismarine_claymore|prismarine_axe)$/, classes: ['Hydromancien'] },

  // ── Cursed School -> Réprouvé ──
  { regle: /^cursed_school:((cursed|inkbound)_(helmet|chestplate|leggings|boots)|ledger_scythe|the_cursed_ring|margin_amulet|ash_charm|closing_clause|triplicate_stylus|swarm_indenture|warrant_of_apostasy)$/, classes: ['Réprouvé'] },

  // ── Curse Spells -> Envoûteur ──
  { regle: /^cursespells:((heretic|worshipper|preacher|remnant)_(hood|robe|pants|shoes)|transcendent_(helmet|chestplate|leggings|boots)|heretic_staff|heretic_necklace|heretic_cross|executioner_greatsword|stagnation_blade|blade_of_the_first_sin|clairvoyance_ring|curse_bane_ring)$/, classes: ['Envoûteur'] },

  // ── Esoteric Spells -> Ésotériste ──
  { regle: /^esoteric_spell:(esoteric_mage_(helmet|chestplate|chestplate_base|leggings|boots)|prismatic_arc_staff|rising_(inolia|arcane|zeroing)_ring)$/, classes: ['Ésotériste'] },
  // ── Iron's Spells 'n Spellbooks : équipements au thème clair ──
  { regle: /^irons_spellbooks:(pyromancer_(helmet|chestplate|leggings|boots)|infernal_sorcerer_chestplate|pyrium_staff)$/, classes: ['Pyromancien'] },
  { regle: /^irons_spellbooks:(cryomancer_(helmet|chestplate|leggings|boots)|ice_staff|boreal_blade)$/, classes: ['Cryomancien'] },
  { regle: /^irons_spellbooks:(electromancer_(helmet|chestplate|leggings|boots)|lightning_rod)$/, classes: ['Électro-Sorcier', 'Technomancien', 'Aéromancien'] },
  { regle: /^irons_spellbooks:(priest_(helmet|chestplate|leggings|boots)|paladin_chestplate)$/, classes: ['Paladin'] },
  { regle: /^irons_spellbooks:(cultist_(helmet|chestplate|leggings|boots)|blood_staff|improved_blood_staff)$/, classes: ['Hémomancien'] },
  { regle: /^irons_spellbooks:shadowwalker_(helmet|chestplate|leggings|boots)$/, classes: ['Voyageur du Vide'] },
  { regle: /^irons_spellbooks:plagued_(helmet|chestplate|leggings|boots)$/, classes: ['Druide'] },
  { regle: /^irons_spellbooks:archevoker_(helmet|chestplate|leggings|boots)$/, classes: ['Évocateur', 'Ésotériste'] },
  // ── Cataclysm: Spellbooks ──
  { regle: /^cataclysm_spellbooks:(ignis_(helmet|chestplate|chestplate_elytra|leggings|boots)|monstrous_wizard_hat)$/, classes: ['Pyromancien'] },
  { regle: /^cataclysm_spellbooks:cursium_mage_(circlet|chestplate|elytra|skirt|boots)$/, classes: ['Cryomancien'] },
  { regle: /^cataclysm_spellbooks:(bloom_stone_(hat|chestplate|skirt|greaves|staff))$/, classes: ['Druide', 'Géomancien'] },
  { regle: /^cataclysm_spellbooks:abyssal_warlock_(helmet|mask|chestplate|leggings|boots)$/, classes: ['Hydromancien'] },
  // ── Fire's Ender Expansion ──
  { regle: /^firesenderexpansion:end_lord_(helmet|chestplate|leggings|boots)$/, classes: ['Voyageur du Vide'] },
  // ── Asterism Arcanum ──
  // Tempest Almanac (école Astral) -> Astromancien : armures, armes et bijoux
  { regle: /^tempest_almanac:.*(helmet|chestplate|leggings|boots|sword|blade|staff|wand|scepter|spear|axe|hammer|bow|dagger|ring|amulet|necklace|charm|talisman|cape|cloak|robe|crown|hat|circlet|pendant)/, classes: ['Astromancien'] },
  { regle: /^asterismarcanum:(astral_(helmet|chestplate|leggings|boots)|celestial_staff|ethereal_talisman)$/, classes: ['Astromancien', 'Chromancien'] },
  // ── ISS: Magic From The East ──
  { regle: /^iss_magicfromtheeast:(onmyoji_(helmet|chestplate|leggings|boots)|soulpiercer)$/, classes: ['Spiritualiste'] },
  { regle: /^iss_magicfromtheeast:(taoist_(helmet|chestplate|leggings|boots)|elemental_commander_chestplate)$/, classes: ['Symétriste', 'Spiritualiste'] },
  // ── SomakeSpells ──
  { regle: /^somakespells:aquamancer_(helmet|chestplate|leggings|boots|staff)$/, classes: ['Hydromancien'] },
  { regle: /^somakespells:(centauri|scorn|fragmented_sword_1|fragmented_sword_2|withered_rose_staff)$/, classes: ['Hémomancien'] },
  { regle: /^somakespells:(witherite_glaive|core_splitter)$/, classes: ['Électro-Sorcier'] },
  { regle: /^somakespells:(radiant_judgment|hallow_sword)$/, classes: ['Paladin'] },
  { regle: /^somakespells:last_mourning$/, classes: ['Évocateur'] },
  { regle: /^somakespells:symmetry_staff$/, classes: ['Symétriste'] }
]

// Grimoires : toujours utilisables par tout le monde, même si une règle ci-dessus les visait.
var LIBRES = [
  'chronomancy:book_of_time_managment',
  'colormagic:rainbow_palette',
  'colormagic:amalgam_palette'
]

// ───────────────────────── OUTILS ─────────────────────────
var CLE = 'classe_rp_nom'           // NOM de la classe (plus fiable qu'un numéro si la liste change)
var CLE_REROLLS = 'classe_rerolls'  // nombre de changements déjà utilisés
var TAG_RESET = 'classe_reset'      // /tag <joueur> add classe_reset -> nouveau tirage + compteur remis à 0 (admin)

function classeParNom(nom) {
  if (nom === 'Prêtre') nom = 'Paladin' // ancien nom de la classe (migration des joueurs existants)
  for (var i = 0; i < CLASSES.length; i++) {
    if (CLASSES[i].nom === nom) return CLASSES[i]
  }
  return null
}

function classeDe(joueur) {
  var data = joueur.persistentData
  if (!data.contains(CLE)) return null
  return classeParNom(String(data.getString(CLE)))
}

function cmd(server, texte) {
  try {
    server.runCommandSilent(texte)
  } catch (e) {
    console.error('[classes_rp] Commande échouée : ' + texte + ' -> ' + e)
  }
}

// Sorts interdits à une classe dans les écoles ouvertes uniquement « par exception » (ex. les sorts partagés
// du Nécromancien ouvrent l'école Nécromancie : sans ceci, tous ses autres sorts seraient découvrables).
// Liste mise en cache par classe ; reconstruite au premier appel.
var CACHE_SORTS_INTERDITS = {}
var CACHE_SET_INTERDITS = {}
function sortsInterditsDeLaClasse(classe) {
  if (CACHE_SORTS_INTERDITS[classe.nom]) return CACHE_SORTS_INTERDITS[classe.nom]
  var propres = ecolesDeLaClasse(classe)
  var liste = []
  try {
    var tous = SpellRegistryJ.getEnabledSpells()
    for (var i = 0; i < tous.size(); i++) {
      try {
        var sort = tous.get(i)
        var id = String(sort.getSpellId())
        var ec = String(sort.getSchoolType().getId())
        if (SORTS_PAR_CLASSE[id]) {
          if (classeAutorisee(SORTS_PAR_CLASSE[id], classe.nom)) continue // sort offert à cette classe
        } else if (propres.indexOf(ec) !== -1) {
          continue // école de la classe, sans règle particulière : accès normal
        }
        liste.push(id)
      } catch (e1) {}
    }
  } catch (e) {
    console.error('[classes_rp] liste des sorts interdits indisponible : ' + e)
  }
  CACHE_SORTS_INTERDITS[classe.nom] = liste
  var set = {}
  for (var q = 0; q < liste.length; q++) set[liste[q]] = true
  CACHE_SET_INTERDITS[classe.nom] = set
  return liste
}

function verrouillerSortsInterdits(server, joueur, classe) {
  if (!classe || estTest(joueur)) return
  var liste = sortsInterditsDeLaClasse(classe)
  for (var i = 0; i < liste.length; i++) cmd(server, 'specs_codex spell lock ' + joueur.username + ' ' + liste[i])
}

// reinit = true : on repart de zéro (nouvelle classe) -> tous les sorts découverts sont oubliés.
// À la simple reconnexion (reinit = false) on garde la progression du joueur.
function appliquerClasse(server, joueur, classe, reinit) {
  var nom = joueur.username
  if (estTest(joueur)) { // mode testeur : tout est ouvert
    cmd(server, 'specs_codex school unlock_all ' + nom)
    cmd(server, 'specs_codex spell unlock_all ' + nom)
    return
  }
  if (reinit) cmd(server, 'specs_codex spell lock_all ' + nom)
  cmd(server, 'specs_codex school lock_all ' + nom)
  cmd(server, 'specs_codex school unlock ' + nom + ' ' + classe.ecole)
  if (classe.sup) {
    for (var s = 0; s < classe.sup.length; s++) {
      cmd(server, 'specs_codex school unlock ' + nom + ' ' + classe.sup[s])
    }
  }
  for (var i = 0; i < ECOLES_LIBRES.length; i++) {
    cmd(server, 'specs_codex school unlock ' + nom + ' ' + ECOLES_LIBRES[i])
  }
  for (var sort in SORTS_PAR_CLASSE) {
    var autorisee = classeAutorisee(SORTS_PAR_CLASSE[sort], classe.nom)
    if (!autorisee) {
      cmd(server, 'specs_codex spell lock ' + nom + ' ' + sort)
    } else {
      // On n'offre PAS le sort au départ : le joueur commence sans aucun sort et doit le découvrir.
      // On ouvre seulement son école pour qu'il puisse le lancer une fois découvert
      // (son onglet reste caché du Codex tant qu'aucun de ses sorts n'est découvert).
      var ecole = ecoleDuSort(sort)
      if (ecole) cmd(server, 'specs_codex school unlock ' + nom + ' ' + ecole)
      // Sorts ouverts à TOUS (liste « * ») : offerts dès le départ, même après le tirage de la classe.
      if (SORTS_PAR_CLASSE[sort].indexOf('*') !== -1) cmd(server, 'specs_codex spell unlock ' + nom + ' ' + sort)
    }
  }
  verrouillerSortsInterdits(server, joueur, classe)
}

// Messages traduisibles : le client les affiche en français ou en anglais selon la langue du jeu
// (textes dans client_scripts/classes_langue_messages.js, clés « mcrp.* »).
function cleClasse(nom) {
  var s = String(nom).toLowerCase()
  var de = 'éèêëàâäîïôöùûüç', vers = 'eeeeaaaiioouuuc'
  var r = ''
  for (var i = 0; i < s.length; i++) {
    var k = de.indexOf(s.charAt(i))
    r += k >= 0 ? vers.charAt(k) : s.charAt(i)
  }
  return 'mcrp.classe.' + r.replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, '')
}

function texteClasse(nom) {
  return Text.translate(cleClasse(nom))
}

var SOUS_TITRES = {
  "Les arcanes t'ont choisi.": 'mcrp.sous_titre.choisi',
  'Les arcanes ont tranché.': 'mcrp.sous_titre.tranche',
  'Ton destin a changé.': 'mcrp.sous_titre.change'
}

function annoncer(server, joueur, classe, sousTitre) {
  var nom = joueur.username
  var cleSous = SOUS_TITRES[sousTitre] || 'mcrp.sous_titre.choisi'
  cmd(server, 'title ' + nom + ' times 20 80 20')
  cmd(server, 'title ' + nom + ' subtitle {"translate":"' + cleSous + '","color":"gray","italic":true}')
  cmd(server, 'title ' + nom + ' title {"translate":"' + cleClasse(classe.nom) + '","color":"gold","bold":true}')
  server.tell(Text.translate('mcrp.msg.eveil', nom, texteClasse(classe.nom).yellow().bold()).gold())
}

// Tire une classe au hasard, différente de "exclureNom" si fourni.
function tirer(exclureNom) {
  var possibles = []
  for (var i = 0; i < CLASSES.length; i++) {
    if (CLASSES[i].nom !== exclureNom) possibles.push(CLASSES[i])
  }
  return possibles[Math.floor(Math.random() * possibles.length)]
}

// Les grimoires / livres de sorts ne sont jamais réservés.
var REGEX_GRIMOIRE = /(spell_?book|grimoire|_book$|^book_|tome|codex|palette|journal|necronomicon|bible)/

function estGrimoire(idObjet) {
  var chemin = String(idObjet).split(':').pop()
  return REGEX_GRIMOIRE.test(chemin)
}

function restriction(idObjet) {
  if (LIBRES.indexOf(idObjet) !== -1) return null
  if (estGrimoire(idObjet)) return null
  for (var i = 0; i < RESTRICTIONS.length; i++) {
    if (RESTRICTIONS[i].regle.test(idObjet)) return RESTRICTIONS[i]
  }
  return null
}

// sujet : clé de traduction (mcrp.sujet.equipement / mcrp.sujet.artefact)
function messageRestriction(r, sujet) {
  if (r.classes.length === 0) return Text.translate('mcrp.msg.desactive', Text.translate(sujet))
  var liste = Text.of('')
  for (var i = 0; i < r.classes.length; i++) {
    if (i > 0) liste.append(Text.of(', '))
    liste.append(texteClasse(r.classes[i]))
  }
  return Text.translate('mcrp.msg.reserve', Text.translate(sujet), liste)
}

function autorise(joueur, idObjet) {
  if (estTest(joueur)) return true
  var r = restriction(idObjet)
  if (!r) return true
  var classe = classeDe(joueur)
  return classe !== null && r.classes.indexOf(classe.nom) !== -1
}

// ───────────────────────── CONNEXION ─────────────────────────
PlayerEvents.loggedIn(function (event) {
  var joueur = event.player
  var server = event.server
  var data = joueur.persistentData

  if (joueur.tags.contains(TAG_RESET)) {
    data.remove(CLE)
    data.putInt(CLE_REROLLS, 0)
    joueur.removeTag(TAG_RESET)
  }

  // Pas de classe automatique : un modérateur l'attribue avec /classe donner <joueur>.
  if (!data.contains(CLE)) return

  var classe = classeDe(joueur)
  if (classe) appliquerClasse(server, joueur, classe, false)
})

// ───────────────────────── COMMANDE /classe ─────────────────────────
function cmdInfos(ctx) {
  var joueur = ctx.source.player
  var classe = classeDe(joueur)
  var utilises = joueur.persistentData.getInt(CLE_REROLLS)
  joueur.tell(Text.translate('mcrp.info.classe', classe ? texteClasse(classe.nom).yellow() : Text.translate('mcrp.info.aucune').yellow()).gold())
  if (estTest(joueur)) joueur.tell(Text.translate('mcrp.info.testeur').aqua())
  joueur.tell(Text.translate('mcrp.info.changements', utilises, REROLLS_MAX, COUT_ENCRE, Text.translate('mcrp.pnj.nom')).gray())
  return 1
}

// ───────────────────────── PNJ DU DESTIN ─────────────────────────
// Un villageois immobile et invulnérable (tag TAG_PNJ). Clic droit = échange :
// 1er clic : le PNJ annonce le prix ; 2e clic dans les 15 s : l'échange est fait.
var TAG_PNJ = 'pnj_classes'
var NOM_PNJ = 'Maître du Destin'
var DELAI_CONFIRMATION = 15000
var attenteConfirmation = {}

function echangerClasse(server, joueur, direct) {
  var data = joueur.persistentData
  var dire = function (t) { joueur.tell(Text.gold('[').append(Text.translate('mcrp.pnj.nom').gold()).append(Text.gold('] ')).append(t)) }
  var id = String(joueur.uuid)
  var classe = classeDe(joueur)

  if (!classe) {
    dire(Text.translate('mcrp.pnj.sans_classe').gray())
    return
  }
  var utilises = data.getInt(CLE_REROLLS)
  if (utilises >= REROLLS_MAX) {
    dire(Text.translate('mcrp.pnj.scelle', REROLLS_MAX).red())
    return
  }
  if (joueur.inventory.count(ENCRE) < COUT_ENCRE) {
    dire(Text.translate('mcrp.pnj.encre', COUT_ENCRE).red())
    return
  }
  var maintenant = Date.now()
  var attente = attenteConfirmation[id]
  if (!direct && (!attente || maintenant - attente > DELAI_CONFIRMATION)) {
    attenteConfirmation[id] = maintenant
    dire(Text.translate('mcrp.pnj.confirme', COUT_ENCRE, REROLLS_MAX - utilises).yellow())
    return
  }
  delete attenteConfirmation[id]

  var nouvelle = tirer(classe.nom)
  cmd(server, 'clear ' + joueur.username + ' ' + ENCRE + ' ' + COUT_ENCRE)
  data.putInt(CLE_REROLLS, utilises + 1)
  data.putString(CLE, nouvelle.nom)
  data.putBoolean(CLE_TEST, false)
  appliquerClasse(server, joueur, nouvelle, true)
  annoncer(server, joueur, nouvelle, 'Ton destin a changé.')
}

// Clic droit sur le PNJ : on écoute l'évènement NeoForge avec la priorité la plus haute (serveur uniquement),
// avant que le villageois ne réagisse (sinon il « secoue la tête » faute d'offres de commerce).
try {
  var EVT_PNJ = Java.loadClass('net.neoforged.neoforge.event.entity.player.PlayerInteractEvent$EntityInteract')
  var PRIO_PNJ = Java.loadClass('net.neoforged.bus.api.EventPriority').HIGHEST
  var RESULTAT_PNJ = Java.loadClass('net.minecraft.world.InteractionResult').SUCCESS
  Java.loadClass('net.neoforged.neoforge.common.NeoForge').EVENT_BUS.addListener(PRIO_PNJ, false, EVT_PNJ, function (e) {
    try {
      var cible = e.getTarget()
      if (!cible || !cible.getTags().contains(TAG_PNJ)) return
      var niveau = e.getLevel()
      var client = niveau.clientSide
      if (client === undefined || typeof client === 'function') client = niveau.isClientSide
      if (client === true) return
      e.setCanceled(true)
      e.setCancellationResult(RESULTAT_PNJ)
      if (String(e.getHand()).toUpperCase().indexOf('MAIN') === -1) return
      var joueur = e.getEntity()
      console.info('[classes_rp] PNJ : clic de ' + joueur.username)
      echangerClasse(joueur.server, joueur)
    } catch (err) {
      console.error('[classes_rp] Erreur PNJ : ' + err)
    }
  })
  console.info('[classes_rp] PNJ du destin actif (clic droit).')
} catch (e) {
  console.error('[classes_rp] PNJ du destin indisponible : ' + e)
}

// /classe pnj : fait apparaître le PNJ à la position du modérateur.
function cmdPnj(ctx) {
  var joueur = ctx.source.player
  if (!joueur) return 0
  var n = joueur.username
  cmd(ctx.source.server, 'execute as ' + n + ' at ' + n + ' rotated as ' + n + ' run summon minecraft:villager ~ ~ ~ ' +
    "{NoAI:1b,Invulnerable:1b,PersistenceRequired:1b,Silent:1b,Tags:[\"" + TAG_PNJ + "\"],CustomNameVisible:1b," +
    "CustomName:'{\"translate\":\"mcrp.pnj.nom\",\"color\":\"gold\"}'," +
    'VillagerData:{profession:"minecraft:cleric",level:6,type:"minecraft:plains"}}')
  retour(ctx, 'PNJ créé. Pour le retirer : /kill @e[type=minecraft:villager,tag=' + TAG_PNJ + ',limit=1,sort=nearest]')
  return 1
}

// Sort aléatoire de la classe du joueur (rareté RARE ou EPIC), remis sous forme de parchemin.
// /classe recompense_peu_commun <joueur> : sort UNCOMMON ; /classe recompense <joueur> : sort RARE (dernière quête du tutoriel) ; /classe recompense_epique <joueur> : sort EPIC (perm. 2).
function sortRecompenseAleatoire(joueur, rareteNom) {
  rareteNom = rareteNom || 'RARE'
  var classe = classeDe(joueur)
  if (!classe) return null
  var ecoles = [classe.ecole]
  if (classe.sup) ecoles = ecoles.concat(classe.sup)
  var Rarete = Java.loadClass('io.redspace.ironsspellbooks.api.spells.SpellRarity')
  var RARETE_CIBLE = Rarete[rareteNom] // rareté de la récompense
  var liste = SpellRegistryJ.getEnabledSpells()
  var candidats = []
  var repli = [] // sorts qui n'atteignent pas la rareté légendaire : meilleure rareté possible
  for (var i = 0; i < liste.size(); i++) {
    var sort = liste.get(i)
    try {
      var id = String(sort.getSpellId())
      if (ecoles.indexOf(String(sort.getSchoolType().getId())) === -1) continue
      if (SORTS_PAR_CLASSE[id] && !classeAutorisee(SORTS_PAR_CLASSE[id], classe.nom)) continue
      var niveau = sort.getMinLevelForRarity(RARETE_CIBLE)
      if (niveau < 1 || niveau > sort.getMaxLevel() || String(sort.getRarity(niveau).name()).toUpperCase() !== rareteNom) {
        var max = sort.getMaxLevel()
        if (max >= 1) repli.push({ sort: sort, id: id, niveau: max, valeur: Number(sort.getRarity(max).getValue()), legendaire: false })
        continue
      }
      candidats.push({ sort: sort, id: id, niveau: niveau, legendaire: true })
    } catch (e) { /* sort ignoré */ }
  }
  if (candidats.length === 0) {
    // Repli : aucun sort épique atteignable -> le sort de la classe de rareté la plus haute (niveau maximum).
    if (repli.length === 0) return null
    var meilleure = -1
    for (var r = 0; r < repli.length; r++) if (repli[r].valeur > meilleure) meilleure = repli[r].valeur
    for (var q = 0; q < repli.length; q++) if (repli[q].valeur === meilleure) candidats.push(repli[q])
  }
  return candidats[Math.floor(Math.random() * candidats.length)]
}

// /classe recompense <joueur> : parchemin légendaire de la classe (récompense de quête, perm. 2).
function cmdRecompense(ctx, cible, rareteNom) {
  try {
    rareteNom = rareteNom || 'RARE'
    var texteRarete = Text.translate(rareteNom === 'EPIC' ? 'mcrp.rarete.epic' : (rareteNom === 'UNCOMMON' ? 'mcrp.rarete.uncommon' : 'mcrp.rarete.rare'))
    var choix = sortRecompenseAleatoire(cible, rareteNom)
    if (!choix) {
      cible.tell(Text.translate('mcrp.msg.recompense_aucun').red())
      retour(ctx, 'Aucun sort disponible pour ' + cible.username + ' (classe : ' + (classeDe(cible) ? classeDe(cible).nom : 'aucune') + ').')
      return 0
    }
    var ISpellContainerJ = Java.loadClass('io.redspace.ironsspellbooks.api.spells.ISpellContainer')
    var pile = Item.of('irons_spellbooks:scroll')
    ISpellContainerJ.set(pile, ISpellContainerJ.createScrollContainer(choix.sort, choix.niveau, pile))
    cible.give(pile)
    var p = choix.id.split(':')
    cible.tell(Text.translate(choix.legendaire ? 'mcrp.msg.recompense' : 'mcrp.msg.recompense_repli', Text.translate('spell.' + p[0] + '.' + p[1]).gold(), texteRarete).green())
    retour(ctx, cible.username + ' reçoit un parchemin : ' + choix.id + ' (niveau ' + choix.niveau + (choix.legendaire ? ', ' + rareteNom : ', repli : meilleure rareté disponible') + ').')
    return 1
  } catch (e) {
    console.error('[classes_rp] Erreur dans /classe recompense : ' + e)
    cible.tell(Text.translate('mcrp.msg.recompense_aucun').red())
    return 0
  }
}

// /classe donner <joueur> : classe aléatoire à un joueur qui n'en a pas encore.
function cmdDonner(ctx, cible) {
  try {
    if (classeDe(cible)) {
      retour(ctx, cible.username + ' a déjà une classe (' + classeDe(cible).nom + '). Utilise /classe reset pour retirer au sort.')
      return 0
    }
    var nouvelle = tirer(null)
    cible.persistentData.putString(CLE, nouvelle.nom)
    cible.persistentData.putBoolean(CLE_TEST, false)
    appliquerClasse(ctx.source.server, cible, nouvelle, true)
    annoncer(ctx.source.server, cible, nouvelle, "Les arcanes t'ont choisi.")
    retour(ctx, cible.username + ' est maintenant ' + nouvelle.nom + '.')
    return 1
  } catch (e) {
    console.error('[classes_rp] Erreur dans /classe donner : ' + e)
    retour(ctx, 'Erreur (voir logs/kubejs/server.log).')
    return 0
  }
}

// Commandes réservées aux modérateurs (permission 2).
function retour(ctx, texte) {
  var emetteur = ctx.source.player
  if (emetteur) emetteur.tell(Text.gray(texte))
}

// /classe reset <joueur> : nouveau tirage immédiat et gratuit (ne consomme pas de changement).
function cmdAdminReset(ctx, cible) {
  try {
    var nouvelle = tirer(null)
    cible.persistentData.putString(CLE, nouvelle.nom)
    cible.persistentData.putBoolean(CLE_TEST, false)
    appliquerClasse(ctx.source.server, cible, nouvelle, true)
    annoncer(ctx.source.server, cible, nouvelle, 'Les arcanes ont tranché.')
    retour(ctx, cible.username + ' est maintenant ' + nouvelle.nom + '.')
    return 1
  } catch (e) {
    console.error('[classes_rp] Erreur dans /classe reset : ' + e)
    retour(ctx, 'Erreur (voir logs/kubejs/server.log).')
    return 0
  }
}

// /classe compteur <joueur> : remet à zéro le compteur de changements payants (3 max).
// /classe testeur donner <joueur> : toutes les classes, tous les sorts, tout l'équipement (tests).
function cmdTesteurDonner(ctx, cible) {
  try {
    cible.persistentData.putBoolean(CLE_TEST, true)
    appliquerClasse(ctx.source.server, cible, classeDe(cible) || CLASSES[0], false)
    retour(ctx, 'Mode testeur ACTIVÉ pour ' + cible.username + ' (toutes les classes).')
    cible.tell(Text.gold('Mode testeur activé : toutes les classes, tous les sorts et tout l\'équipement sont débloqués.'))
    return 1
  } catch (e) {
    console.error('[classes_rp] Erreur dans /classe testeur donner : ' + e)
    retour(ctx, 'Erreur (voir logs/kubejs/server.log).')
    return 0
  }
}

// /classe testeur retirer <joueur> : retour à la classe normale (les sorts découverts sont remis à zéro).
function cmdTesteurRetirer(ctx, cible) {
  try {
    cible.persistentData.putBoolean(CLE_TEST, false)
    var classe = classeDe(cible)
    if (classe) appliquerClasse(ctx.source.server, cible, classe, true)
    retour(ctx, 'Mode testeur RETIRÉ pour ' + cible.username + ' (classe : ' + (classe ? classe.nom : 'aucune') + ').')
    cible.tell(Text.gold('Mode testeur retiré : tu retrouves ta classe ' + (classe ? classe.nom : '') + '.'))
    return 1
  } catch (e) {
    console.error('[classes_rp] Erreur dans /classe testeur retirer : ' + e)
    retour(ctx, 'Erreur (voir logs/kubejs/server.log).')
    return 0
  }
}

// /classe maitre <joueur> : appelé par le dialogue du NPC Easy NPC (la confirmation est déjà faite dans le dialogue).
function cmdMaitre(ctx, cible) {
  echangerClasse(ctx.source.server, cible, true)
  return 1
}

function cmdAdminCompteur(ctx, cible) {
  cible.persistentData.putInt(CLE_REROLLS, 0)
  retour(ctx, 'Compteur de changements remis à 0 pour ' + cible.username + ' (0/' + REROLLS_MAX + ').')
  cible.tell(Text.translate('mcrp.msg.compteur', REROLLS_MAX).gold())
  return 1
}

ServerEvents.commandRegistry(function (event) {
  var Commands = event.commands
  var Arguments = event.arguments
  var estModo = function (source) { return source.hasPermission(2) }

  event.register(
    Commands.literal('classe')
      .executes(function (ctx) { return cmdInfos(ctx) })
      .then(Commands.literal('info').executes(function (ctx) { return cmdInfos(ctx) }))
      .then(Commands.literal('donner')
        .requires(estModo)
        .then(Commands.argument('joueur', Arguments.PLAYER.create(event))
          .executes(function (ctx) { return cmdDonner(ctx, Arguments.PLAYER.getResult(ctx, 'joueur')) })))
      .then(Commands.literal('recompense')
        .requires(estModo)
        .then(Commands.argument('joueur', Arguments.PLAYER.create(event))
          .executes(function (ctx) { return cmdRecompense(ctx, Arguments.PLAYER.getResult(ctx, 'joueur'), 'RARE') })))
      .then(Commands.literal('recompense_peu_commun')
        .requires(estModo)
        .then(Commands.argument('joueur', Arguments.PLAYER.create(event))
          .executes(function (ctx) { return cmdRecompense(ctx, Arguments.PLAYER.getResult(ctx, 'joueur'), 'UNCOMMON') })))
      .then(Commands.literal('recompense_epique')
        .requires(estModo)
        .then(Commands.argument('joueur', Arguments.PLAYER.create(event))
          .executes(function (ctx) { return cmdRecompense(ctx, Arguments.PLAYER.getResult(ctx, 'joueur'), 'EPIC') })))
      .then(Commands.literal('pnj')
        .requires(estModo)
        .executes(function (ctx) { return cmdPnj(ctx) }))
      .then(Commands.literal('reset')
        .requires(estModo)
        .then(Commands.argument('joueur', Arguments.PLAYER.create(event))
          .executes(function (ctx) { return cmdAdminReset(ctx, Arguments.PLAYER.getResult(ctx, 'joueur')) })))
      .then(Commands.literal('testeur')
        .requires(estModo)
        .then(Commands.literal('donner')
          .then(Commands.argument('joueur', Arguments.PLAYER.create(event))
            .executes(function (ctx) { return cmdTesteurDonner(ctx, Arguments.PLAYER.getResult(ctx, 'joueur')) })))
        .then(Commands.literal('retirer')
          .then(Commands.argument('joueur', Arguments.PLAYER.create(event))
            .executes(function (ctx) { return cmdTesteurRetirer(ctx, Arguments.PLAYER.getResult(ctx, 'joueur')) }))))
      .then(Commands.literal('maitre')
        .requires(function (source) {
          // op, ou commande lancée par un NPC Easy NPC (dialogue du Maître du Destin)
          try { if (source.hasPermission(2)) return true } catch (e) {}
          try { var ent = source.entity; return !!ent && String(ent.type).indexOf('easy_npc:') === 0 } catch (e) { return false }
        })
        .then(Commands.argument('joueur', Arguments.PLAYER.create(event))
          .executes(function (ctx) { return cmdMaitre(ctx, Arguments.PLAYER.getResult(ctx, 'joueur')) })))
      .then(Commands.literal('compteur')
        .requires(estModo)
        .then(Commands.argument('joueur', Arguments.PLAYER.create(event))
          .executes(function (ctx) { return cmdAdminCompteur(ctx, Arguments.PLAYER.getResult(ctx, 'joueur')) })))
  )
})

// ───────────────────────── OBJETS RÉSERVÉS ─────────────────────────
var MC_SLOT = Java.loadClass('net.minecraft.world.entity.EquipmentSlot')
var EMPLACEMENTS_ARMURE = [MC_SLOT.HEAD, MC_SLOT.CHEST, MC_SLOT.LEGS, MC_SLOT.FEET]

// Traite UN emplacement d'armure (fonction séparée : portée neuve à chaque appel).
// La pièce n'est rendue au joueur QUE si elle a bien été retirée de l'emplacement.
function traiterArmure(joueur, slot) {
  var pile = joueur.getItemBySlot(slot)
  if (!pile || pile.isEmpty()) return
  var id = String(pile.id)
  if (autorise(joueur, id)) return

  var copie = pile.copy()
  joueur.setItemSlot(slot, Item.of('minecraft:air'))
  if (!joueur.getItemBySlot(slot).isEmpty()) { // retrait échoué : on ne donne rien
    console.warn('[classes_rp] Retrait impossible : ' + id + ' (' + joueur.username + ')')
    return
  }

  joueur.give(copie)
  joueur.tell(messageRestriction(restriction(id), 'mcrp.sujet.equipement').red())
  console.info('[classes_rp] Pièce retirée : ' + id + ' (' + joueur.username + ')')
  // Resynchronise l'inventaire complet avec le client : évite qu'une pièce « fantôme » reste affichée sur la tête.
  try { joueur.inventoryMenu.sendAllDataToRemote() } catch (e1) {}
  try { joueur.containerMenu.sendAllDataToRemote() } catch (e2) {}
}

var curiosApi = null
var curiosErreurLoguee = false

function traiterCurio(joueur, equipes, i) {
  var pile = equipes.getStackInSlot(i)
  if (!pile || pile.isEmpty()) return
  var id = String(pile.id)
  if (autorise(joueur, id)) return

  var copie = pile.copy()
  equipes.setStackInSlot(i, Item.of('minecraft:air'))
  if (!equipes.getStackInSlot(i).isEmpty()) return // retrait échoué : on ne donne rien

  joueur.give(copie)
  joueur.tell(messageRestriction(restriction(id), 'mcrp.sujet.artefact').red())
}

function verifierCurios(joueur) {
  try {
    if (!curiosApi) curiosApi = Java.loadClass('top.theillusivec4.curios.api.CuriosApi')
    var inv = curiosApi.getCuriosInventory(joueur)
    if (!inv.isPresent()) return
    var equipes = inv.get().getEquippedCurios()
    for (var i = 0; i < equipes.getSlots(); i++) {
      traiterCurio(joueur, equipes, i)
    }
    // Emplacements cosmétiques (affichés sur le modèle du joueur) : même contrôle.
    var it = inv.get().getCurios().values().iterator()
    while (it.hasNext()) {
      var cosm = it.next().getCosmeticStacks()
      for (var j = 0; j < cosm.getSlots(); j++) {
        traiterCurio(joueur, cosm, j)
      }
    }
  } catch (e) {
    if (!curiosErreurLoguee) {
      curiosErreurLoguee = true
      console.error('[classes_rp] Vérification Curios impossible : ' + e)
    }
  }
}

// Arme réservée tenue en main : l'événement de dégâts n'existe pas dans cette version de KubeJS,
// on affaiblit donc fortement le joueur tant qu'il la tient (ses attaques ne font plus de dégâts).
function verifierMains(joueur, server) {
  var mains = [joueur.mainHandItem, joueur.offHandItem]
  for (var i = 0; i < mains.length; i++) {
    var objet = mains[i]
    if (!objet || objet.isEmpty()) continue
    if (autorise(joueur, String(objet.id))) continue
    cmd(server, 'effect give ' + joueur.username + ' minecraft:weakness 2 20 true')
    return
  }
}

var TICKS_RP = 0
PlayerEvents.tick(function (event) {
  var joueur = event.player
  // Compteur propre (ne dépend pas de l'heure du monde, qui peut être figée par un sort ou une règle de jeu).
  TICKS_RP++
  if (TICKS_RP % 5 === 0) verifierMains(joueur, event.server)
  // Armure : vérifiée à chaque tick (peu coûteux : seuls les emplacements non vides sont examinés).
  for (var i = 0; i < EMPLACEMENTS_ARMURE.length; i++) {
    traiterArmure(joueur, EMPLACEMENTS_ARMURE[i])
  }
  if (TICKS_RP % 5 === 0) verifierCurios(joueur)
})

// Temporal Anchor : recette supprimée (l'objet reste bloqué à l'équipement et à l'usage par les règles ci-dessus).
ServerEvents.recipes(function (event) {
  event.remove({ output: 'chronomancy:temporal_anchor' })
})

// Utilisation (clic droit) d'un objet réservé : bloquée silencieusement pour les autres classes.
ItemEvents.rightClicked(function (event) {
  var objet = event.item
  if (!objet || objet.empty) return
  if (autorise(event.player, String(objet.id))) return
  event.cancel()
})

// ───────────── Grimoires : seulement des sorts de sa classe ─────────────
// Un grimoire trouvé (coffre, mob...) ou garni sur la table d'inscription ne garde que les sorts de la classe
// de son porteur : les autres en sont retirés. Contrôle toutes les 20 ticks : inventaire, curseur, Curios.
// Les testeurs sont exemptés ; un joueur sans classe garde des grimoires vides.
var GrimoireJ = null, ISpellContainerJ = null, CuriosApiJ = null
try {
  GrimoireJ = Java.loadClass('io.redspace.ironsspellbooks.item.SpellBook')
  ISpellContainerJ = Java.loadClass('io.redspace.ironsspellbooks.api.spells.ISpellContainer')
} catch (e) {
  console.error('[classes_rp] Nettoyage des grimoires indisponible : ' + e)
}
try { CuriosApiJ = Java.loadClass('top.theillusivec4.curios.api.CuriosApi') } catch (e) { CuriosApiJ = null }

var CustomDataJ = null, ComposantsJ = null
try {
  CustomDataJ = Java.loadClass('net.minecraft.world.item.component.CustomData')
  ComposantsJ = Java.loadClass('net.minecraft.core.component.DataComponents')
} catch (e) {}

function grimoireDejaVide(pile) {
  try {
    var cd = pile.get(ComposantsJ.CUSTOM_DATA)
    return !!cd && cd.copyTag().getBoolean('mcrp_grimoire_vide')
  } catch (e) { return false }
}

function marquerGrimoireVide(pile) {
  try { CustomDataJ.update(ComposantsJ.CUSTOM_DATA, pile, function (tag) { tag.putBoolean('mcrp_grimoire_vide', true) }) } catch (e) {}
}

// Un grimoire rencontré pour la première fois est vidé de TOUS ses sorts (ceux d'origine : butin, mobs...), puis marqué.
// Ensuite le joueur peut y inscrire des sorts de sa classe : seuls les sorts étrangers sont retirés.
function nettoyerGrimoire(pile, classe) {
  try {
    if (!pile || pile.isEmpty()) return
    if (!GrimoireJ.class.isInstance(pile.getItem())) return
    var c = ISpellContainerJ.get(pile)
    if (c === null || c === undefined) return
    var premiere = !grimoireDejaVide(pile)
    if (c.getActiveSpellCount() > 0) {
      var actifs = c.getActiveSpells()
      var aRetirer = []
      for (var i = 0; i < actifs.size(); i++) {
        var id = String(actifs.get(i).getSpell().getSpellId())
        if (premiere || !classe || sortInterditPourJoueur(classe, id)) aRetirer.push(Number(actifs.get(i).index()))
      }
      if (aRetirer.length > 0) {
        var m = c.mutableCopy()
        for (var k = 0; k < aRetirer.length; k++) m.removeSpellAtIndex(aRetirer[k])
        ISpellContainerJ.set(pile, m.toImmutable())
      }
    }
    if (premiere) marquerGrimoireVide(pile)
  } catch (e) {}
}

function nettoyerGrimoiresDuJoueur(joueur, classe) {
  var inv = joueur.getInventory()
  for (var i = 0; i < inv.getContainerSize(); i++) nettoyerGrimoire(inv.getItem(i), classe)
  try { nettoyerGrimoire(joueur.containerMenu.getCarried(), classe) } catch (e1) {}
  if (CuriosApiJ) {
    try {
      var opt = CuriosApiJ.getCuriosInventory(joueur)
      if (opt.isPresent()) {
        var eq = opt.get().getEquippedCurios()
        for (var j = 0; j < eq.getSlots(); j++) nettoyerGrimoire(eq.getStackInSlot(j), classe)
      }
    } catch (e2) {}
  }
}

ServerEvents.tick(function (event) {
  var serveur = event.server
  if (serveur.tickCount % 20 !== 7) return
  if (!GrimoireJ || !ISpellContainerJ) return
  var joueurs = serveur.players
  for (var i = 0; i < joueurs.length; i++) {
    try {
      if (estTest(joueurs[i])) continue
      nettoyerGrimoiresDuJoueur(joueurs[i], classeDe(joueurs[i]))
    } catch (e) {}
  }
})

// ───────────── Parchemins et pages de Codex : ramassables, mais inutilisables hors classe ─────────────
// Un joueur peut posséder n'importe quel parchemin ou page. Les sorts d'une autre classe ne peuvent ni être lancés
// (règle de lancer plus haut), ni être inscrits dans un grimoire (grimoire nettoyé ci-dessus), ni être appris
// par une page de Codex (clic droit annulé ci-dessous).
var ParcheminJ = null, PageCodexJ = null
try { PageCodexJ = Java.loadClass('com.specs.irons_spellbooks.item.CodexPageItem') } catch (e) {}
try { ParcheminJ = Java.loadClass('io.redspace.ironsspellbooks.item.Scroll') } catch (e) {}

function sortInterditPourJoueur(classe, id) {
  sortsInterditsDeLaClasse(classe)
  return CACHE_SET_INTERDITS[classe.nom][id] === true
}

ItemEvents.rightClicked(function (event) {
  try {
    var joueur = event.player
    var pile = event.item
    if (!pile || pile.empty) return
    var objet = pile.getItem()
    var page = PageCodexJ && PageCodexJ.class.isInstance(objet)
    var parch = ParcheminJ && ParcheminJ.class.isInstance(objet)
    if (!page && !parch) return
    if (estTest(joueur)) return
    var classe = classeDe(joueur)
    if (!classe) return
    var ids = []
    if (page) { var r = PageCodexJ.getSpellId(pile); if (r) ids.push(String(r)) }
    else {
      var c = ISpellContainerJ.get(pile)
      if (c) { var l = c.getActiveSpells(); for (var i = 0; i < l.size(); i++) ids.push(String(l.get(i).getSpell().getSpellId())) }
    }
    for (var k = 0; k < ids.length; k++) {
      if (sortInterditPourJoueur(classe, ids[k])) {
        event.cancel()
        joueur.tell(Text.red('Ce sort n\'appartient pas à ta classe.'))
        return
      }
    }
  } catch (e) {}
})

// Sorts étrangers déjà découverts (Codex, encre, grimoire...) : repérés chaque seconde dans les données du Codex
// et reverrouillés aussitôt (aucune commande si rien à retirer).
var UnlocksJ = null
try { UnlocksJ = Java.loadClass('com.specs.irons_spellbooks.unlock.SpellUnlockAttachments').UNLOCKS } catch (e) {
  console.error('[classes_rp] Données du Codex indisponibles (reverrouillage rapide inactif) : ' + e)
}

function reverrouillerDecouverts(serveur, joueur, classe) {
  if (!UnlocksJ) return
  var donnees = joueur.getData(UnlocksJ.get())
  if (!donnees) return
  var it = donnees.getDiscoveredSpells().iterator()
  var aVerrouiller = []
  while (it.hasNext()) {
    var id = String(it.next())
    if (sortInterditPourJoueur(classe, id)) aVerrouiller.push(id)
  }
  for (var i = 0; i < aVerrouiller.length; i++) cmd(serveur, 'specs_codex spell lock ' + joueur.username + ' ' + aVerrouiller[i])
}

ServerEvents.tick(function (event) {
  var serveur = event.server
  if (serveur.tickCount % 3 !== 0) return // toutes les 3 ticks : le sort étranger n'a pas le temps d'être affiché
  var joueurs = serveur.players
  for (var i = 0; i < joueurs.length; i++) {
    try {
      var j = joueurs[i]
      if (estTest(j)) continue
      var classe = classeDe(j)
      if (!classe) continue
      reverrouillerDecouverts(serveur, j, classe)
    } catch (e) {}
  }
})

// Après l'usage d'un parchemin / d'une page de Codex / d'un grimoire, et régulièrement : on reverrouille les sorts
// qui ne sont pas à la classe du joueur (ceux d'une école ouverte seulement par exception).
ItemEvents.rightClicked(function (event) {
  try {
    var objet = event.item
    if (!objet || objet.empty) return
    if (!/scroll|codex_page|grimoire|spell_?book/.test(String(objet.id))) return
    var joueur = event.player
    var serveur = joueur.server
    var classe = classeDe(joueur)
    if (!classe || !serveur) return
    serveur.scheduleInTicks(10, function () { verrouillerSortsInterdits(serveur, joueur, classe) })
  } catch (e) {}
})

ServerEvents.tick(function (event) {
  var serveur = event.server
  if (serveur.tickCount % 600 !== 0) return
  var joueurs = serveur.players
  for (var i = 0; i < joueurs.length; i++) {
    try { verrouillerSortsInterdits(serveur, joueurs[i], classeDe(joueurs[i])) } catch (e) {}
  }
})

// Équiper une pièce par clic droit (armure, bijou Curios...) : certains mods traitent le clic AVANT KubeJS
// et l'annulent eux-mêmes après avoir équipé la pièce. On écoute donc l'évènement avec la priorité la plus haute
// pour interdire le clic en premier (serveur uniquement).
try {
  var EVT_RDROIT = Java.loadClass('net.neoforged.neoforge.event.entity.player.PlayerInteractEvent$RightClickItem')
  var PRIO_HAUTE = Java.loadClass('net.neoforged.bus.api.EventPriority').HIGHEST
  Java.loadClass('net.neoforged.neoforge.common.NeoForge').EVENT_BUS.addListener(PRIO_HAUTE, false, EVT_RDROIT, function (e) {
    try {
      var joueur = e.getEntity()
      if (!joueur || !joueur.isPlayer()) return
      var niveau = e.getLevel()
      var client = niveau.clientSide
      if (client === undefined || typeof client === 'function') client = niveau.isClientSide
      if (client === true) return
      var pile = e.getItemStack()
      if (!pile || pile.isEmpty()) return
      if (autorise(joueur, String(pile.id))) return
      e.setCanceled(true)
      // Le client a déjà « essayé » d'équiper la pièce (prédiction) : le serveur n'ayant rien changé, il
      // n'enverrait aucune correction. On renvoie donc tout l'inventaire pour effacer la pièce fantôme.
      try { joueur.inventoryMenu.sendAllDataToRemote() } catch (e1) {}
      try { joueur.containerMenu.sendAllDataToRemote() } catch (e2) {}
      // Deuxième envoi 2 ticks plus tard, au cas où la prédiction du client arriverait après le premier.
      try {
        var joueurRetard = joueur
        joueur.server.scheduleInTicks(2, function () {
          try { joueurRetard.inventoryMenu.sendAllDataToRemote() } catch (e3) {}
        })
      } catch (e4) {}
      console.info('[classes_rp] Clic droit bloqué : ' + String(pile.id) + ' (' + joueur.username + ')')
    } catch (err) {
      console.error('[classes_rp] Erreur du blocage du clic droit : ' + err)
    }
  })
  console.info('[classes_rp] Blocage du clic droit prioritaire actif.')
} catch (e) {
  console.error('[classes_rp] Blocage du clic droit prioritaire indisponible : ' + e)
}

// Diagnostic : trace toute pièce interdite qui arrive dans un emplacement d'équipement (quel qu'en soit le chemin).
try {
  var EVT_EQUIP = Java.loadClass('net.neoforged.neoforge.event.entity.living.LivingEquipmentChangeEvent')
  Java.loadClass('net.neoforged.neoforge.common.NeoForge').EVENT_BUS.addListener(Java.loadClass('net.neoforged.bus.api.EventPriority').NORMAL, false, EVT_EQUIP, function (e) {
    try {
      var ent = e.getEntity()
      if (!ent || !ent.isPlayer()) return
      var niveau = ent.level
      if (niveau.isClientSide === true) return
      var vers = e.getTo()
      if (!vers || vers.isEmpty()) return
      if (autorise(ent, String(vers.id))) return
      console.info('[classes_rp] Pièce interdite équipée : ' + String(vers.id) + ' emplacement ' + e.getSlot() + ' (' + ent.username + ')')
    } catch (err) {}
  })
} catch (e) {
  console.error('[classes_rp] Suivi des équipements indisponible : ' + e)
}

// Compétences des armes (touche R) : Spell Codex permet de lancer le sort d'une arme enchantée sans
// passer par le clic droit. On annule donc le lancement du sort (événement d'Iron's Spells)
// quand il vient d'une arme réservée à une autre classe. Silencieux, pas de message.

function bloquerSortsArmes(event) {
  var lanceur = event.getEntity()
  if (!lanceur || !lanceur.isPlayer()) return // les mobs gardent tous leurs sorts

  // Sorts désactivés pour les joueurs (World Stop...), quelle que soit la source du lancement.
  if (SORTS_DESACTIVES.indexOf(String(event.getSpellId())) !== -1) {
    event.setCanceled(true)
    return
  }
  var source = String(event.getCastSource())
  if (source.toUpperCase().indexOf('SWORD') === -1) return // seulement les sorts venant d'une arme

  var mains = [lanceur.mainHandItem, lanceur.offHandItem]
  for (var i = 0; i < mains.length; i++) {
    var objet = mains[i]
    if (!objet || objet.isEmpty()) continue
    if (autorise(lanceur, String(objet.id))) continue
    event.setCanceled(true)
    return
  }
}

try {
  NativeEvents.onEvent(
    Java.loadClass('io.redspace.ironsspellbooks.api.events.SpellPreCastEvent'),
    function (event) { bloquerSortsArmes(event) }
  )
  console.info('[classes_rp] Blocage des sorts d\'armes (touche R) actif.')
} catch (e) {
  console.error('[classes_rp] Blocage des sorts d\'armes indisponible : ' + e)
}

// Arme interdite (désactivée pour tous, ou réservée à une autre classe) : aucun dégât tant qu'elle est tenue.
// Complète l'affaiblissement ci-dessus, qui n'arrête pas les dégâts « magiques » ou spéciaux de certaines armes.
function degatsBloques(event) {
  try {
    var attaquant = event.getSource().getEntity()
    if (!attaquant || !attaquant.isPlayer()) return
    var mains = [attaquant.mainHandItem, attaquant.offHandItem]
    for (var i = 0; i < mains.length; i++) {
      var objet = mains[i]
      if (!objet || objet.isEmpty()) continue
      if (autorise(attaquant, String(objet.id))) continue
      event.setCanceled(true)
      return
    }
  } catch (e) {}
}

try {
  NativeEvents.onEvent(
    Java.loadClass('net.neoforged.neoforge.event.entity.living.LivingIncomingDamageEvent'),
    function (event) { degatsBloques(event) }
  )
  console.info('[classes_rp] Blocage des dégâts des armes interdites actif.')
} catch (e) {
  console.error('[classes_rp] Blocage des dégâts indisponible : ' + e)
}

// Passe en dernier : applique les règles « sort réservé à certaines classes ».
function armeInterdite(lanceur, source) {
  if (source.toUpperCase().indexOf('SWORD') === -1) return false
  var mains = [lanceur.mainHandItem, lanceur.offHandItem]
  for (var i = 0; i < mains.length; i++) {
    var objet = mains[i]
    if (!objet || objet.isEmpty()) continue
    if (!autorise(lanceur, String(objet.id))) return true
  }
  return false
}

function reglerSortsReserves(event) {
  var id = String(event.getSpellId())
  var lanceur = event.getEntity()
  if (!lanceur || !lanceur.isPlayer()) return // les mobs gardent tous leurs sorts
  if (SORTS_DESACTIVES.indexOf(id) !== -1) {
    event.setCanceled(true)
    return
  }
  var permis = SORTS_PAR_CLASSE[id]
  if (!permis) {
    // Sort sans règle particulière : réservé aux classes qui possèdent son école.
    // (Nécessaire car les écoles ouvertes pour les sorts « exception » donneraient sinon
    //  accès aux autres sorts de ces écoles.)
    if (estTest(lanceur)) return
    var cl = classeDe(lanceur)
    if (!cl) return
    var ec = ecoleDuSort(id)
    if (ec && ecolesDeLaClasse(cl).indexOf(ec) === -1) event.setCanceled(true)
    return
  }
  var classe = classeDe(lanceur)
  var ok = classe !== null && classeAutorisee(permis, classe.nom)
  if (estTest(lanceur)) ok = true
  if (ok && armeInterdite(lanceur, String(event.getCastSource()))) ok = false
  if (!ok) event.setCanceled(true)
}

try {
  // Enregistrement simple (la surcharge avec priorité n'existe pas dans cette version de KubeJS).
  // On ne fait qu'ANNULER les lancers interdits ; les lancers autorisés sont laissés au Codex,
  // qui les accepte puisque l'école et le sort ont été ouverts par appliquerClasse.
  NativeEvents.onEvent(
    Java.loadClass('io.redspace.ironsspellbooks.api.events.SpellPreCastEvent'),
    function (event) { reglerSortsReserves(event) }
  )
  console.info('[classes_rp] Sorts réservés par classe actifs.')
} catch (e) {
  console.error('[classes_rp] Sorts réservés indisponibles : ' + e)
}


// ───────────────────── Invocations : durée maximale ─────────────────────
// Toute entité invoquée par un sort (interface IMagicSummon d'Iron's et de ses addons)
// disparaît au bout de DUREE_INVOCATION_SEC secondes.
var DUREE_INVOCATION_SEC = 30

function estInvocation(entite) {
  try {
    var c = entite.getClass()
    while (c) {
      var itf = c.getInterfaces()
      for (var i = 0; i < itf.length; i++) {
        if (String(itf[i].getName()) === 'io.redspace.ironsspellbooks.entity.mobs.IMagicSummon') return true
      }
      c = c.getSuperclass()
    }
  } catch (e) {}
  return false
}

try {
  EntityEvents.spawned(function (event) {
    var entite = event.entity
    if (!estInvocation(entite)) return
    var serveur = entite.server
    if (!serveur) return
    serveur.scheduleInTicks(DUREE_INVOCATION_SEC * 20, function () {
      try {
        if (entite.isAlive()) entite.discard()
      } catch (e) {}
    })
  })
} catch (e) {
  console.error('[classes_rp] durée des invocations indisponible : ' + e)
}


// ───────────── Vérification des règles au démarrage du serveur ─────────────
// Écrit dans le journal les règles d'équipement qui ne correspondent à AUCUN objet installé
// (identifiant incorrect ou mod absent) : cherche « règle sans objet » dans logs/kubejs/server.log.
function verifierReglesEquipement() {
  try {
    var registre = Java.loadClass('net.minecraft.core.registries.BuiltInRegistries').ITEM
    var ids = []
    var it = registre.keySet().iterator()
    while (it.hasNext()) ids.push(String(it.next()))
    var sans = 0
    for (var i = 0; i < RESTRICTIONS.length; i++) {
      var trouve = false
      for (var j = 0; j < ids.length; j++) {
        if (RESTRICTIONS[i].regle.test(ids[j])) { trouve = true; break }
      }
      if (!trouve) { sans++; console.warn('[classes_rp] règle sans objet : ' + RESTRICTIONS[i].regle) }
    }
    console.info('[classes_rp] ' + RESTRICTIONS.length + ' règles d\'équipement, ' + sans + ' sans objet.')
  } catch (e) {
    console.error('[classes_rp] Vérification des règles impossible : ' + e)
  }
}

ServerEvents.loaded(function (event) { verifierReglesEquipement() })
