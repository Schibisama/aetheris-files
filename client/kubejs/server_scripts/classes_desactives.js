// [perf] mesure du temps des handlers de tick : écrit « [perf] ... » dans la console si > 1,5 s cumulées par 1200 appels
var perfWrap = (typeof perfWrap === 'function') ? perfWrap : (function () {
  var SYS = { getNanos: function () { return Date.now() * 1e6 } }
  return function (nom, fn) {
    var cumul = 0, n = 0
    return function (ev) {
      var t0 = SYS.getNanos()
      try { return fn(ev) } finally {
        cumul += SYS.getNanos() - t0; n++
        if (n >= 1200) {
          var ms = cumul / 1e6
          if (ms > 1500) console.info('[perf] ' + nom + ' : ' + (ms / n).toFixed(3) + ' ms par appel, ' + ms.toFixed(0) + ' ms par ' + n + ' appels')
          cumul = 0; n = 0
        }
      }
    }
  }
})()
// Objets désactivés (règles « classes: [] » de classes_rp.js) :
//   - plus de recette de fabrication ;
//   - retirés des butins de mobs (les mobs/boss gardent et utilisent leur équipement d'origine) ;
//   - retirés des coffres et conteneurs à leur ouverture (butin des structures) ;
//   - jamais produits par la pêche, le troc, l'archéologie, les chambres d'épreuve (objets au sol) ni vendus par les PNJ ;
//   - (visibles dans JEI : plus de masquage).
// Parchemins ET pages de Codex des sorts désactivés (SORTS_DESACTIVES) et des sorts appris en cours (/cours) : dans les coffres,
// butins de mobs et objets au sol, ils sont remplacés par ceux d'un autre sort de la même école (même niveau si possible).
// À placer dans : <instance>/kubejs/server_scripts/classes_desactives.js  (puis /reload)
// Dépend de restriction() et estTest() de classes_rp.js (même portée globale).

var DESACT_CACHE = {}
// Objets réactivés mais OBTENABLES UNIQUEMENT PAR CRAFT : retirés de tous les butins (coffres, mobs, sol, PNJ), recette conservée.
var CRAFT_SEULEMENT = ["somakespells:axiomatic_codex_2_spell_book", "somakespells:axiomatic_codex_3_spell_book", "somakespells:burning_magma_2_spell_book", "somakespells:burning_magma_3_spell_book", "somakespells:dawnlit_gospel_2_spell_book", "somakespells:dawnlit_gospel_3_spell_book", "somakespells:frostvein_codex_2_spell_book", "somakespells:frostvein_codex_3_spell_book", "somakespells:invoker_canon_2_spell_book", "somakespells:invoker_canon_3_spell_book", "somakespells:sanguine_testament_2_spell_book", "somakespells:sanguine_testament_3_spell_book", "somakespells:soullit_testament_2_spell_book", "somakespells:soullit_testament_3_spell_book", "somakespells:starless_grimoire_2_spell_book", "somakespells:starless_grimoire_3_spell_book", "somakespells:stoneheart_codex_2_spell_book", "somakespells:stoneheart_codex_3_spell_book", "somakespells:stormcaller_lexicon_2_spell_book", "somakespells:stormcaller_lexicon_3_spell_book", "somakespells:verdant_testament_2_spell_book", "somakespells:verdant_testament_3_spell_book", "somakespells:voidbound_codex_2_spell_book", "somakespells:voidbound_codex_3_spell_book", "somakespells:tidebound_2_spell_book", "somakespells:tidebound_3_spell_book", "somakespells:resonance_canticle_2_spell_book", "somakespells:resonance_canticle_3_spell_book", "somakespells:profane_grimoire", "somakespells:sanctum_grimoire", "apprenticecodex:copper_spell_amplifier", "apprenticecodex:crystal_bladed_staff", "apprenticecodex:elemental_bow", "apprenticecodex:explorers_cane", "apprenticecodex:illuminate_stellar_staff", "apprenticecodex:pastel_staff", "apprenticecodex:photon_siphon", "apprenticecodex:spell_reaper_scythe", "apprenticecodex:unite_luna_staff", "apprenticecodex:zenith_staff", "asterism_arcanum:astral_leggings", "asterismarcanum:astral_boots", "asterismarcanum:astral_chestplate", "asterismarcanum:astral_helmet", "asterismarcanum:astral_leggings", "asterismarcanum:celestial_staff", "cataclysm:ancient_spear", "cataclysm:astrape", "cataclysm:bloom_stone_pauldrons", "cataclysm:bone_reptile_chestplate", "cataclysm:bone_reptile_helmet", "cataclysm:brontes", "cataclysm:ceraunus", "cataclysm:cursed_bow", "cataclysm:soul_render", "cataclysm:the_annihilator", "cataclysm:wrath_of_the_desert", "cataclysm_spellbooks:abyssal_warlock_boots", "cataclysm_spellbooks:abyssal_warlock_chestplate", "cataclysm_spellbooks:abyssal_warlock_helmet", "cataclysm_spellbooks:abyssal_warlock_leggings", "cataclysm_spellbooks:abyssal_warlock_mask", "cataclysm_spellbooks:bloom_stone_chestplate", "cataclysm_spellbooks:bloom_stone_hat", "cataclysm_spellbooks:bloom_stone_staff", "cataclysm_spellbooks:coral_staff", "cataclysm_spellbooks:engineer_boots", "cataclysm_spellbooks:engineer_leggings", "cataclysm_spellbooks:engineer_suit", "cataclysm_spellbooks:fake_wudjets_staff", "cataclysm_spellbooks:monstrous_flamberge", "cataclysm_spellbooks:monstrous_wizard_hat", "cataclysm_spellbooks:pharaoh_chestplate", "cataclysm_spellbooks:pharaoh_helmet", "cataclysm_spellbooks:pharaoh_leggings", "cataclysm_spellbooks:soul_brazier", "cataclysm_spellbooks:void_staff", "chronomancy:clock_hand", "chronomancy:clocksmith_boots", "chronomancy:clocksmith_chestplate", "chronomancy:clocksmith_helmet", "chronomancy:clocksmith_leggings", "colormagic:artist_boots", "colormagic:artist_chestplate", "colormagic:artist_helmet", "colormagic:artist_leggings", "colormagic:blade_of_true_color", "colormagic:great_brush", "colormagic:white_ink", "crystal_chronicles:blood_knight_boots", "crystal_chronicles:blood_knight_chestplate", "crystal_chronicles:blood_knight_helmet", "crystal_chronicles:blood_knight_leggings", "crystal_chronicles:blood_scythe", "crystal_chronicles:ender_mage_boots", "crystal_chronicles:ender_mage_chestplate", "crystal_chronicles:ender_mage_helmet", "crystal_chronicles:ender_mage_leggings", "crystal_chronicles:ender_sickle", "crystal_chronicles:ender_staff", "crystal_chronicles:evocation_twinblade", "crystal_chronicles:fire_chakram", "crystal_chronicles:fire_knight_boots", "crystal_chronicles:fire_knight_chestplate", "crystal_chronicles:fire_knight_helmet", "crystal_chronicles:fire_knight_leggings", "crystal_chronicles:holy_knight_boots", "crystal_chronicles:holy_knight_chestplate", "crystal_chronicles:holy_knight_helmet", "crystal_chronicles:holy_knight_leggings", "crystal_chronicles:holy_shield", "crystal_chronicles:holy_sword", "crystal_chronicles:ice_hammer", "crystal_chronicles:ice_knight_boots", "crystal_chronicles:ice_knight_chestplate", "crystal_chronicles:ice_knight_helmet", "crystal_chronicles:ice_knight_leggings", "crystal_chronicles:lightning_bident", "crystal_chronicles:lightning_knight_boots", "crystal_chronicles:lightning_knight_chestplate", "crystal_chronicles:lightning_knight_helmet", "crystal_chronicles:lightning_knight_leggings", "crystal_chronicles:lightning_staff", "crystal_chronicles:nature_knight_boots", "crystal_chronicles:nature_knight_chestplate", "crystal_chronicles:nature_knight_helmet", "crystal_chronicles:nature_knight_leggings", "crystal_chronicles:nature_spear", "crystal_chronicles:prismatic_knight_boots", "crystal_chronicles:prismatic_knight_chestplate", "crystal_chronicles:prismatic_knight_helmet", "crystal_chronicles:prismatic_knight_leggings", "cursed_school:cursed_boots", "cursed_school:cursed_chestplate", "cursed_school:cursed_helmet", "cursed_school:cursed_leggings", "cursed_school:inkbound_boots", "cursed_school:inkbound_chestplate", "cursed_school:inkbound_helmet", "cursed_school:inkbound_leggings", "cursed_school:ledger_scythe", "cursed_school:margin_reaper", "cursespells:blade_of_the_first_sin", "cursespells:executioner_greatsword", "cursespells:heretic_cross", "cursespells:heretic_hood", "cursespells:heretic_necklace", "cursespells:heretic_pants", "cursespells:heretic_robe", "cursespells:heretic_shoes", "cursespells:heretic_staff", "cursespells:preacher_hood", "cursespells:preacher_pants", "cursespells:preacher_robe", "cursespells:preacher_shoes", "cursespells:remnant_hood", "cursespells:remnant_pants", "cursespells:remnant_robe", "cursespells:remnant_shoes", "cursespells:stagnation_blade", "cursespells:transcendent_boots", "cursespells:transcendent_chestplate", "cursespells:transcendent_helmet", "cursespells:transcendent_leggings", "cursespells:untouchable_spiral", "cursespells:worshipper_hood", "cursespells:worshipper_pants", "cursespells:worshipper_robe", "cursespells:worshipper_shoes", "esoteric_spell:esoteric_mage_boots", "esoteric_spell:esoteric_mage_chestplate", "esoteric_spell:esoteric_mage_helmet", "esoteric_spell:esoteric_mage_leggings", "esoteric_spell:prismatic_arc_staff", "farmers_spell:gluttony_chef_apron", "farmers_spell:gluttony_chef_boots", "farmers_spell:gluttony_chef_hat", "farmers_spell:gluttony_chef_leggings", "farmers_spell:gospel", "firesenderexpansion:end_lord_boots", "firesenderexpansion:end_lord_chestplate", "firesenderexpansion:end_lord_helmet", "firesenderexpansion:end_lord_leggings", "gtbcs_geomancy_plus:the_stonecaller", "hazennstuff:alchemist_supreme_boots", "hazennstuff:alchemist_supreme_chestplate", "hazennstuff:alchemist_supreme_helmet", "hazennstuff:alchemist_supreme_leggings", "hazennstuff:ancient_warriors_axe", "hazennstuff:astraconic_weaver_boots", "hazennstuff:astraconic_weaver_chestplate", "hazennstuff:astraconic_weaver_helmet", "hazennstuff:astraconic_weaver_leggings", "hazennstuff:astralite_cleaver", "hazennstuff:beongae", "hazennstuff:blade_of_grass", "hazennstuff:blazeborne_boots", "hazennstuff:blazeborne_chestplate", "hazennstuff:blazeborne_helmet", "hazennstuff:blazeborne_leggings", "hazennstuff:blossom_of_the_enchantress", "hazennstuff:bountiful_harvest", "hazennstuff:ceaseless_void", "hazennstuff:chlorophyte_boots", "hazennstuff:chlorophyte_chestplate", "hazennstuff:chlorophyte_helmet", "hazennstuff:chlorophyte_leggings", "hazennstuff:chlorophyte_mask", "hazennstuff:coralite_cane", "hazennstuff:cosmic_scholar_boots", "hazennstuff:cosmic_scholar_chestplate", "hazennstuff:cosmic_scholar_helmet", "hazennstuff:cosmic_scholar_leggings", "hazennstuff:creaking_boots", "hazennstuff:creaking_chestplate", "hazennstuff:creaking_helmet", "hazennstuff:creaking_leggings", "hazennstuff:cryogenic_ruler_boots", "hazennstuff:cryogenic_ruler_chestplate", "hazennstuff:cryogenic_ruler_helmet", "hazennstuff:cryogenic_ruler_leggings", "hazennstuff:divine_greatsword", "hazennstuff:divine_scepter", "hazennstuff:draconic_splitter", "hazennstuff:elder_guardian_boots", "hazennstuff:elder_guardian_chestplate", "hazennstuff:elder_guardian_helmet", "hazennstuff:elder_guardian_leggings", "hazennstuff:ender_dragon_boots", "hazennstuff:ender_dragon_chestplate", "hazennstuff:ender_dragon_helmet", "hazennstuff:ender_dragon_leggings", "hazennstuff:enderconic_scepter", "hazennstuff:excalibur", "hazennstuff:fireblossom_rapier", "hazennstuff:firebrand", "hazennstuff:flesh_mass_boots", "hazennstuff:flesh_mass_chestplate", "hazennstuff:flesh_mass_helmet", "hazennstuff:flesh_mass_leggings", "hazennstuff:frieren_staff", "hazennstuff:frostbite_hunter_boots", "hazennstuff:frostbite_hunter_chestplate", "hazennstuff:frostbite_hunter_helmet", "hazennstuff:frostbite_hunter_leggings", "hazennstuff:frostbite_knight_boots", "hazennstuff:frostbite_knight_chestplate", "hazennstuff:frostbite_knight_helmet", "hazennstuff:frostbite_knight_leggings", "hazennstuff:frostbute_dagger", "hazennstuff:gabriel_ultrakill_boots", "hazennstuff:gabriel_ultrakill_chestplate", "hazennstuff:gabriel_ultrakill_helmet", "hazennstuff:gabriel_ultrakill_leggings", "hazennstuff:garments_of_the_first_flamebearer_boots", "hazennstuff:garments_of_the_first_flamebearer_chestplate", "hazennstuff:garments_of_the_first_flamebearer_helmet", "hazennstuff:garments_of_the_first_flamebearer_leggings", "hazennstuff:garments_of_the_first_flamebearer_soul_boots", "hazennstuff:garments_of_the_first_flamebearer_soul_chestplate", "hazennstuff:garments_of_the_first_flamebearer_soul_helmet", "hazennstuff:garments_of_the_first_flamebearer_soul_leggings", "hazennstuff:glassweaver_scepter", "hazennstuff:grimoire_staff", "hazennstuff:hammer_of_justice", "hazennstuff:hammush", "hazennstuff:ice_pike", "hazennstuff:lights_bane", "hazennstuff:muramasa", "hazennstuff:nexus", "hazennstuff:nights_edge", "hazennstuff:permafrost_prince_boots", "hazennstuff:permafrost_prince_chestplate", "hazennstuff:permafrost_prince_helmet", "hazennstuff:permafrost_prince_leggings", "hazennstuff:ravens_bane", "hazennstuff:seraph_boots", "hazennstuff:seraph_chestplate", "hazennstuff:seraph_helmet", "hazennstuff:seraph_leggings", "hazennstuff:shadow_jester_boots", "hazennstuff:shadow_jester_chestplate", "hazennstuff:shadow_jester_helmet", "hazennstuff:shadow_jester_leggings", "hazennstuff:shadow_scale_boots", "hazennstuff:shadow_scale_chestplate", "hazennstuff:shadow_scale_helmet", "hazennstuff:shadow_scale_leggings", "hazennstuff:skyscorcher", "hazennstuff:soul_reaper", "hazennstuff:soulcalling_scepter", "hazennstuff:spectral_pickaxe", "hazennstuff:spectrum", "hazennstuff:terraprisma", "hazennstuff:thorn_chakram", "hazennstuff:thunder_prowler_boots", "hazennstuff:thunder_prowler_chestplate", "hazennstuff:thunder_prowler_helmet", "hazennstuff:thunder_prowler_leggings", "hazennstuff:true_nights_edge", "hazennstuff:vampire_knives", "hazennstuff:volcano", "hazennstuff:war_flaming_lance", "hazennstuff:wisewood_cane", "irons_spellbooks:amethyst_rapier", "irons_spellbooks:archevoker_boots", "irons_spellbooks:archevoker_chestplate", "irons_spellbooks:archevoker_helmet", "irons_spellbooks:archevoker_leggings", "irons_spellbooks:boreal_blade", "irons_spellbooks:cryomancer_boots", "irons_spellbooks:cryomancer_chestplate", "irons_spellbooks:cryomancer_helmet", "irons_spellbooks:cryomancer_leggings", "irons_spellbooks:cultist_boots", "irons_spellbooks:cultist_chestplate", "irons_spellbooks:cultist_helmet", "irons_spellbooks:cultist_leggings", "irons_spellbooks:electromancer_boots", "irons_spellbooks:electromancer_chestplate", "irons_spellbooks:electromancer_helmet", "irons_spellbooks:electromancer_leggings", "irons_spellbooks:hellrazor", "irons_spellbooks:ice_staff", "irons_spellbooks:infernal_sorcerer_chestplate", "irons_spellbooks:legionnaire_flamberge", "irons_spellbooks:paladin_chestplate", "irons_spellbooks:plagued_boots", "irons_spellbooks:plagued_chestplate", "irons_spellbooks:plagued_helmet", "irons_spellbooks:plagued_leggings", "irons_spellbooks:priest_boots", "irons_spellbooks:priest_chestplate", "irons_spellbooks:priest_helmet", "irons_spellbooks:priest_leggings", "irons_spellbooks:pyrium_staff", "irons_spellbooks:pyromancer_boots", "irons_spellbooks:pyromancer_chestplate", "irons_spellbooks:pyromancer_helmet", "irons_spellbooks:pyromancer_leggings", "irons_spellbooks:shadowwalker_boots", "irons_spellbooks:shadowwalker_chestplate", "irons_spellbooks:shadowwalker_helmet", "irons_spellbooks:shadowwalker_leggings", "irons_spellbooks:spellbreaker", "irons_spellbooks:twilight_gale", "iss_magicfromtheeast:elemental_commander_chestplate", "iss_magicfromtheeast:jade_guandao", "iss_magicfromtheeast:jade_pagoda_boots", "iss_magicfromtheeast:jade_pagoda_chestplate", "iss_magicfromtheeast:jade_pagoda_helmet", "iss_magicfromtheeast:jade_pagoda_leggings", "iss_magicfromtheeast:mist_boots", "iss_magicfromtheeast:onmyoji_boots", "iss_magicfromtheeast:onmyoji_chestplate", "iss_magicfromtheeast:onmyoji_helmet", "iss_magicfromtheeast:onmyoji_leggings", "iss_magicfromtheeast:soul_breaker", "iss_magicfromtheeast:soul_katana", "iss_magicfromtheeast:soulpiercer", "iss_magicfromtheeast:spirit_crusher", "iss_magicfromtheeast:taoist_boots", "iss_magicfromtheeast:taoist_chestplate", "iss_magicfromtheeast:taoist_helmet", "iss_magicfromtheeast:taoist_leggings", "legendary_monsters:mossy_chestplate", "legendary_monsters:mossy_hammer", "legendary_monsters:sickle_of_harvest", "monsterspellbooks:death_knight_boots", "monsterspellbooks:death_knight_chestplate", "monsterspellbooks:death_knight_helmet", "monsterspellbooks:death_knight_leggings", "monsterspellbooks:deathsilver_axe", "monsterspellbooks:deathsilver_dagger", "monsterspellbooks:deathsilver_sword", "monsterspellbooks:disruption_naginata", "monsterspellbooks:dwarven_engineer_boots", "monsterspellbooks:dwarven_engineer_chestplate", "monsterspellbooks:dwarven_engineer_leggings", "monsterspellbooks:dwarven_shield", "monsterspellbooks:endersent_crusher", "monsterspellbooks:eternal_knife", "monsterspellbooks:forge_masterpiece_boots", "monsterspellbooks:forge_masterpiece_chestplate", "monsterspellbooks:forge_masterpiece_helmet", "monsterspellbooks:forge_masterpiece_leggings", "monsterspellbooks:fun_gal_cap_blue", "monsterspellbooks:fun_gal_cap_red", "monsterspellbooks:illager_ember_robe_boots", "monsterspellbooks:illager_ember_robe_chestplate", "monsterspellbooks:illager_ember_robe_helmet", "monsterspellbooks:illager_ember_robe_leggings", "monsterspellbooks:illager_enchanter_boots", "monsterspellbooks:illager_enchanter_chestplate", "monsterspellbooks:illager_enchanter_helmet", "monsterspellbooks:illager_enchanter_leggings", "monsterspellbooks:illager_iceologer_boots", "monsterspellbooks:illager_iceologer_chestplate", "monsterspellbooks:illager_iceologer_helmet", "monsterspellbooks:illager_iceologer_leggings", "monsterspellbooks:magmatic_macuahuitl", "monsterspellbooks:necromancer_boots", "monsterspellbooks:necromancer_chestplate", "monsterspellbooks:necromancer_helmet", "monsterspellbooks:necromancer_leggings", "monsterspellbooks:orichalcum_axe", "monsterspellbooks:orichalcum_dagger", "monsterspellbooks:orichalcum_greatsword", "monsterspellbooks:paladin_hammer", "monsterspellbooks:prismarine_axe", "monsterspellbooks:reaper_sickle", "monsterspellbooks:sanguinite_axe", "monsterspellbooks:sanguinite_dagger", "monsterspellbooks:sanguinite_hero_boots", "monsterspellbooks:sanguinite_hero_chestplate", "monsterspellbooks:sanguinite_hero_hood", "monsterspellbooks:sanguinite_hero_leggings", "monsterspellbooks:sanguinite_scythe", "monsterspellbooks:starscourge_boots", "monsterspellbooks:starscourge_chestplate", "monsterspellbooks:starscourge_helmet", "monsterspellbooks:starscourge_leggings", "monsterspellbooks:starscourge_sword", "monsterspellbooks:unstable_robes_boots", "monsterspellbooks:unstable_robes_chestplate", "monsterspellbooks:unstable_robes_helmet", "monsterspellbooks:unstable_robes_leggings", "monsterspellbooks:vilenova_staff", "monsterspellbooks:village_butcherer", "monsterspellbooks:wildfire_crown", "mowziesmobs:naga_fang_dagger", "somakespells:aquamancer_boots", "somakespells:aquamancer_chestplate", "somakespells:aquamancer_helmet", "somakespells:aquamancer_leggings", "somakespells:aquamancer_staff", "somakespells:archangels_staff", "somakespells:boltcutter_dagger", "somakespells:ceranium_boots", "somakespells:ceranium_chestplate", "somakespells:ceranium_helmet", "somakespells:ceranium_leggings", "somakespells:copper_glove", "somakespells:core_splitter", "somakespells:fragmented_sword_1", "somakespells:hallow_sword", "somakespells:ignitium_staff", "somakespells:mirrored_edge", "somakespells:monolith_sword", "somakespells:radiant_judgment", "somakespells:rock_sword", "somakespells:soul_fire_ignitium_staff", "somakespells:symmetry_staff", "somakespells:totem_dagger", "somakespells:withered_rose_staff", "tempest_almanac:astral_robe_boots", "tempest_almanac:astral_robe_chestplate", "tempest_almanac:astral_robe_helmet", "tempest_almanac:astral_robe_leggings", "tempest_almanac:astral_staff", "tempest_almanac:astralite_axe", "tempest_almanac:astralite_boots", "tempest_almanac:astralite_chestplate", "tempest_almanac:astralite_helmet", "tempest_almanac:astralite_hoe", "tempest_almanac:astralite_leggings", "tempest_almanac:astralite_pickaxe", "tempest_almanac:astralite_shovel", "tempest_almanac:astralite_sword", "wind_spellbooks:aeromancer_boots", "wind_spellbooks:aeromancer_chestplate", "wind_spellbooks:aeromancer_helmet", "wind_spellbooks:aeromancer_leggings", "wind_spellbooks:wind_staff"]
// Livres non craftables retirés des COFFRES uniquement (leur butin de mob reste). Gardés dans les coffres : ceux dont c'est
// la source d'origine (Rotten Spell Book, Wheat Tome, Endchiridion, Book of Souls, Tome of Updraft).
var LIVRES_SANS_COFFRE = ["aces_spell_utils:example_passive_ability_spellbook", "aces_spell_utils:example_unqiue_ability_spellbook", "apprenticecodex:ender_grimoire", "apprenticecodex:isekai_travel_guidebook", "cataclysm_spellbooks:desert_spell_book", "farmers_spell:tiramisu", "gtbcs_geomancy_plus:bluff_instruction_manual", "hazennstuff:grimoire_of_flight", "irons_spellbooks:blaze_spell_book", "irons_spellbooks:evoker_spell_book", "irons_spellbooks:legendary_spell_book", "irons_spellbooks:necronomicon_spell_book", "irons_spellbooks:spell_book", "irons_spellbooks:villager_spell_book", "irons_spellbooks:wimpy_spell_book", "monsterspellbooks:enchanter_spell_book", "monsterspellbooks:guardian_spell_book", "somakespells:frostvein_codex_spell_book", "somakespells:starless_grimoire_spell_book", "somakespells:stoneheart_codex_spell_book"]
function desactSansCoffre(id) { return LIVRES_SANS_COFFRE.indexOf(String(id)) >= 0 }
function desactSansButin(id) { return desactEstDesactive(id) || CRAFT_SEULEMENT.indexOf(String(id)) >= 0 }


function desactEstDesactive(id) {
  id = String(id)
  if (DESACT_CACHE[id] !== undefined) return DESACT_CACHE[id]
  var r = null
  try { r = restriction(id) } catch (e) { r = null }
  var res = !!(r && r.classes.length === 0)
  DESACT_CACHE[id] = res
  return res
}


// ───────────── Parchemins de sorts désactivés ─────────────
var DESACT_ISC = null
var DESACT_SR = null

// Sorts interdits en butin : sorts désactivés (SORTS_DESACTIVES) ET sorts appris en cours (/cours, coursOrdre() de classes_rp.js).
// Leurs parchemins et leurs pages de Codex trouvés en butin sont remplacés par ceux d'un autre sort de la même école.
var DESACT_COURS = null
function desactSortsCours() {
  if (DESACT_COURS) return DESACT_COURS
  var set = {}
  try { var o = coursOrdre(); for (var i = 0; i < o.length; i++) set[String(o[i])] = true; DESACT_COURS = set } catch (e) { return set }
  // Tous les sorts « pour tous » (liste « * » de SORTS_PAR_CLASSE), même ceux que /cours ne donne jamais (école Indicible :
  // Portail Prismatique, etc.) : ils ne s'obtiennent pas en butin.
  try {
    var tous = SpellRegistryJ.getEnabledSpells()
    for (var k = 0; k < tous.size(); k++) {
      var sid = String(tous.get(k).getSpellId())
      var perm = SORTS_PAR_CLASSE[sid]
      if (perm && perm.indexOf('*') !== -1) set[sid] = true
    }
  } catch (e2) { console.error('[classes_desactives] sorts « pour tous » : ' + e2) }
  return DESACT_COURS
}
function desactSortInterdit(id) {
  id = String(id)
  try { if (SORTS_DESACTIVES.indexOf(id) !== -1) return true } catch (e) {}
  return desactSortsCours()[id] === true
}

var DESACT_PAGE = null, DESACT_CATALOGUE = null
// Sort d'un parchemin ou d'une page de Codex : { id, niveau, ecole, page } ou null
function desactSortDuParchemin(pile) {
  var objet = String(pile.id)
  try {
    if (!DESACT_SR) DESACT_SR = Java.loadClass('io.redspace.ironsspellbooks.api.registry.SpellRegistry')
    if (objet === 'irons_spellbooks:scroll') {
      if (!DESACT_ISC) DESACT_ISC = Java.loadClass('io.redspace.ironsspellbooks.api.spells.ISpellContainer')
      var d = DESACT_ISC.get(pile).getSpellAtIndex(0)
      var sp = d.getSpell()
      return { id: String(sp.getSpellId()), niveau: d.getLevel(), ecole: String(sp.getSchoolType().getId()), page: false }
    }
    if (objet === 'specs_irons_spellbooks:codex_page') {
      if (!DESACT_PAGE) DESACT_PAGE = Java.loadClass('com.specs.irons_spellbooks.item.CodexPageItem')
      var rl = DESACT_PAGE.getSpellId(pile)
      if (!rl) return null
      var sp2 = DESACT_SR.getSpell(rl)
      return { id: String(sp2.getSpellId()), niveau: 1, ecole: String(sp2.getSchoolType().getId()), page: true }
    }
  } catch (e) {}
  return null
}

function desactParcheminInterdit(pile) {
  var s = desactSortDuParchemin(pile)
  if (!s) return false
  return desactSortInterdit(s.id)
}

// Remplaçant : un sort actif, trouvable en butin, ni désactivé ni appris en cours, de la même école si possible.
// Parchemin -> parchemin (même niveau si possible) ; page de Codex -> page de Codex.
function desactRemplacant(pile) {
  try {
    var s = desactSortDuParchemin(pile)
    if (!s) return null
    if (!DESACT_SR) DESACT_SR = Java.loadClass('io.redspace.ironsspellbooks.api.registry.SpellRegistry')
    if (s.page && !DESACT_CATALOGUE) { try { DESACT_CATALOGUE = Java.loadClass('com.specs.irons_spellbooks.catalog.SpellCatalog') } catch (eC) {} }
    var tous = DESACT_SR.getEnabledSpells()
    var memeEcole = [], autres = []
    for (var i = 0; i < tous.size(); i++) {
      var sp = tous.get(i)
      var id = String(sp.getSpellId())
      if (id === s.id || desactSortInterdit(id)) continue
      try { if (!sp.allowLooting()) continue } catch (e1) {}
      if (s.page && DESACT_CATALOGUE) { try { if (!DESACT_CATALOGUE.isListed(sp)) continue } catch (e2) {} }
      if (String(sp.getSchoolType().getId()) === s.ecole) memeEcole.push(sp)
      else autres.push(sp)
    }
    var liste = memeEcole.length ? memeEcole : autres
    if (!liste.length) return null
    var choix = liste[Math.floor(Math.random() * liste.length)]
    if (s.page) return DESACT_PAGE['createFor(io.redspace.ironsspellbooks.api.spells.AbstractSpell)'](choix)
    var niveau = Math.max(choix.getMinLevel(), Math.min(s.niveau, choix.getMaxLevel()))
    var neuf = Item.of('irons_spellbooks:scroll')
    DESACT_ISC.set(neuf, DESACT_ISC.createScrollContainer(choix, niveau, neuf))
    return neuf
  } catch (e) {
    console.error('[classes_desactives] Remplacement : ' + e)
    return null
  }
}

// ───────────── Recettes ─────────────
// Armes Hazennstuff désactivées dont la recette est TEMPORAIREMENT conservée (pour décider de leur classe) : vider ensuite.
var DESACT_RECETTES_GARDEES = ["hazennstuff:ancient_warriors_axe", "hazennstuff:astralite_cleaver", "hazennstuff:beongae", "hazennstuff:blade_of_grass", "hazennstuff:blossom_of_the_enchantress", "hazennstuff:bountiful_harvest", "hazennstuff:ceaseless_void", "hazennstuff:coralite_cane", "hazennstuff:dawnmaker", "hazennstuff:divine_greatsword", "hazennstuff:divine_scepter", "hazennstuff:draconic_splitter", "hazennstuff:enderconic_scepter", "hazennstuff:excalibur", "hazennstuff:excalibur_divine_gold", "hazennstuff:fireblossom_rapier", "hazennstuff:firebrand", "hazennstuff:frieren_staff", "hazennstuff:frostbute_dagger", "hazennstuff:glassweaver_scepter", "hazennstuff:grimoire_staff", "hazennstuff:hammer_of_justice", "hazennstuff:hammush", "hazennstuff:hazens_excalibur", "hazennstuff:ice_pike", "hazennstuff:insania_aeternus", "hazennstuff:legionnaire_warlock_axe", "hazennstuff:lights_bane", "hazennstuff:mage_bane", "hazennstuff:malice", "hazennstuff:meowmere", "hazennstuff:muramasa", "hazennstuff:nexus", "hazennstuff:nights_edge", "hazennstuff:obsidian_claymore", "hazennstuff:pickaxe_axe", "hazennstuff:pickaxe_axe_divine_gold", "hazennstuff:ravens_bane", "hazennstuff:rod_of_discord", "hazennstuff:skyscorcher", "hazennstuff:soul_reaper", "hazennstuff:soulcalling_scepter", "hazennstuff:spectral_pickaxe", "hazennstuff:spectrum", "hazennstuff:starfury", "hazennstuff:terraprisma", "hazennstuff:the_devourer", "hazennstuff:thorn_chakram", "hazennstuff:tidal_wave", "hazennstuff:true_nights_edge", "hazennstuff:vampire_knives", "hazennstuff:volcano", "hazennstuff:war_flaming_lance", "hazennstuff:wisewood_cane"]
ServerEvents.recipes(function (event) {
  var n = 0
  try {
    var liste = Item.getTypeList()
    for (var i = 0; i < liste.size(); i++) {
      var id = String(liste.get(i))
      if (!desactEstDesactive(id)) continue
      if (DESACT_RECETTES_GARDEES.indexOf(id) >= 0) continue
      event.remove({ output: id })
      n++
    }
  } catch (e) {
    console.error('[classes_desactives] Suppression des recettes impossible : ' + e)
  }
  console.info('[classes_desactives] Recettes retirées pour ' + n + ' objets désactivés.')
})

// ───────────── Recettes ajoutées (armes sans source) ─────────────
ServerEvents.recipes(function (event) {
  var n = 0
  function ajout(f) { try { f(); n++ } catch (e) { console.error('[classes_desactives] Recette ajoutée en échec : ' + e) } }
  var HZ = 'hazennstuff:', IS = 'irons_spellbooks:'
  ajout(function () { event.shaped(HZ + 'thorn_chakram', [' O ', 'ZWZ', ' R '], { O: HZ + 'overgrown_bone', Z: HZ + 'zenalite_ingot', W: IS + 'weapon_parts', R: IS + 'nature_rune' }).id('aetheris:thorn_chakram') })
  ajout(function () { event.shaped('legendary_monsters:sickle_of_harvest', ['II ', ' RI', 'W O'], { I: 'monsterspellbooks:orichalcum_ingot', R: IS + 'nature_rune', W: IS + 'weapon_parts', O: HZ + 'overgrown_bone' }).id('aetheris:sickle_of_harvest') })
  ajout(function () { event.shaped('somakespells:symmetry_staff', ['APA', ' E ', ' C '], { A: 'minecraft:amethyst_shard', P: HZ + 'prismatic_shard', E: IS + 'evocation_rune', C: IS + 'artificer_cane' }).id('aetheris:symmetry_staff') })
  ajout(function () { event.shaped(HZ + 'frostbute_dagger', ['  F', ' PR', 'I  '], { F: HZ + 'permafrost_fragment', P: IS + 'permafrost_shard', R: IS + 'ice_rune', I: HZ + 'steel_ingot' }).id('aetheris:frostbute_dagger') })
  ajout(function () { event.shaped(HZ + 'starfury', ['S S', ' G ', 'SWS'], { S: HZ + 'stardust', G: HZ + 'cosmic_gold_ingot', W: IS + 'weapon_parts' }).id('aetheris:starfury') })
  ajout(function () { event.shaped(HZ + 'rod_of_discord', ['ECZ', ' A '], { E: IS + 'ender_rune', C: 'minecraft:chorus_fruit', Z: HZ + 'zenalite_ingot', A: IS + 'artificer_cane' }).id('aetheris:rod_of_discord') })
  // Forge : base différente de la pièce obtenue
  ajout(function () { event.smithing(HZ + 'true_nights_edge', IS + 'divine_soulshard', HZ + 'nights_edge', HZ + 'cosmic_gold_ingot').id('aetheris:true_nights_edge') })
  ajout(function () { event.smithing('monsterspellbooks:magmatic_macuahuitl', IS + 'fire_rune', 'minecraft:netherite_sword', HZ + 'solar_core').id('aetheris:magmatic_macuahuitl') })
  ajout(function () { event.smithing(HZ + 'muramasa', IS + 'blood_rune', 'minecraft:netherite_sword', 'monsterspellbooks:deathsilver_ingot').id('aetheris:muramasa') })
  var pieces = ['helmet', 'chestplate', 'leggings', 'boots']
  pieces.forEach(function (pc) {
    ajout(function () { event.smithing(HZ + 'garments_of_the_first_flamebearer_soul_' + pc, 'minecraft:soul_sand', HZ + 'garments_of_the_first_flamebearer_' + pc, IS + 'divine_soulshard').id('aetheris:garments_soul_' + pc) })
  })
  // Livres de sorts : un livre craftable pour les écoles Aéromancien, Spiritualiste et Symétriste
  ajout(function () { event.shaped('wind_spellbooks:wind_spell_book', ['ABB', 'DCC', 'ABB'], { A: 'wind_spellbooks:wind_rune', B: IS + 'arcane_ingot', C: IS + 'hogskin', D: IS + 'diamond_spell_book' }).id('aetheris:wind_spell_book') })
  ajout(function () { event.shaped('somakespells:soullit_testament_spell_book', ['ABB', 'DCC', 'ABB'], { A: 'iss_magicfromtheeast:spirit_rune', B: IS + 'arcane_ingot', C: IS + 'hogskin', D: IS + 'gold_spell_book' }).id('aetheris:soullit_testament_spell_book') })
  ajout(function () { event.shaped('somakespells:axiomatic_codex_spell_book', ['ABB', 'DCC', 'ABB'], { A: 'iss_magicfromtheeast:symmetry_rune', B: IS + 'arcane_ingot', C: IS + 'hogskin', D: IS + 'gold_spell_book' }).id('aetheris:axiomatic_codex_spell_book') })
  ajout(function () { event.shaped('iss_magicfromtheeast:ritual_orihon', ['ABB', 'DCC', 'ABB'], { A: 'iss_magicfromtheeast:spirit_rune', B: 'iss_magicfromtheeast:refined_jade_ingot', C: IS + 'hogskin', D: IS + 'diamond_spell_book' }).id('aetheris:ritual_orihon') })
  // Améliorations à l'Upgrade Forge (niveaux II et III) pour Soullit Testament et Axiomatic Codex
  function amelioration(id, base, res, ecole, ings) {
    ajout(function () {
      event.custom({ type: 'somakespells:upgrade_forge', base_book: { item: base }, result_book: { id: res }, school: ecole, requires_max_progress: true,
        ingredients: ings.map(function (x) { return { ingredient: { item: x[0] }, count: x[1] } }) }).id('aetheris:' + id)
    })
  }
  ajout(function () { event.shaped('somakespells:frostvein_codex_spell_book', ['ABB', 'DCC', 'ABB'], { A: IS + 'ice_rune', B: IS + 'arcane_ingot', C: IS + 'hogskin', D: IS + 'gold_spell_book' }).id('aetheris:frostvein_codex_spell_book') })
  ajout(function () { event.shaped('somakespells:starless_grimoire_spell_book', ['ABB', 'DCC', 'ABB'], { A: 'somakespells:eldritch_rune', B: IS + 'arcane_ingot', C: IS + 'hogskin', D: IS + 'gold_spell_book' }).id('aetheris:starless_grimoire_spell_book') })
  ajout(function () { event.shaped('somakespells:stoneheart_codex_spell_book', ['ABB', 'DCC', 'ABB'], { A: 'gtbcs_geomancy_plus:geo_rune', B: IS + 'arcane_ingot', C: IS + 'hogskin', D: IS + 'gold_spell_book' }).id('aetheris:stoneheart_codex_spell_book') })
  var SPI = 'iss_magicfromtheeast:', SO = 'somakespells:'
  amelioration('soullit_testament_t1_to_t2', SO + 'soullit_testament_spell_book', SO + 'soullit_testament_2_spell_book', SPI + 'spirit', [[SPI + 'crystallized_soul', 16], [IS + 'arcane_ingot', 4], [SPI + 'spirit_upgrade_orb', 2]])
  amelioration('soullit_testament_t2_to_t3', SO + 'soullit_testament_2_spell_book', SO + 'soullit_testament_3_spell_book', SPI + 'spirit', [[SPI + 'crystallized_soul', 32], [IS + 'divine_soulshard', 1], [SPI + 'spirit_upgrade_orb', 3]])
  amelioration('axiomatic_codex_t1_to_t2', SO + 'axiomatic_codex_spell_book', SO + 'axiomatic_codex_2_spell_book', SPI + 'symmetry', [[SPI + 'jade', 16], [IS + 'arcane_ingot', 4], [SPI + 'symmetry_upgrade_orb', 2]])
  amelioration('axiomatic_codex_t2_to_t3', SO + 'axiomatic_codex_2_spell_book', SO + 'axiomatic_codex_3_spell_book', SPI + 'symmetry', [[SPI + 'refined_jade_ingot', 16], [IS + 'arcane_ingot', 8], [SPI + 'symmetry_upgrade_orb', 3]])
  amelioration('frostvein_codex_t1_to_t2', SO + 'frostvein_codex_spell_book', SO + 'frostvein_codex_2_spell_book', IS + 'ice', [[IS + 'permafrost_shard', 16], [IS + 'frozen_bone', 8], [IS + 'ice_upgrade_orb', 2]])
  amelioration('frostvein_codex_t2_to_t3', SO + 'frostvein_codex_2_spell_book', SO + 'frostvein_codex_3_spell_book', IS + 'ice', [[IS + 'permafrost_shard', 32], [IS + 'frozen_bone', 16], [IS + 'ice_upgrade_orb', 3]])
  amelioration('starless_grimoire_t1_to_t2', SO + 'starless_grimoire_spell_book', SO + 'starless_grimoire_2_spell_book', IS + 'eldritch', [[IS + 'eldritch_manuscript', 4], [IS + 'arcane_ingot', 4], [SO + 'eldritch_upgrade_orb', 2]])
  amelioration('starless_grimoire_t2_to_t3', SO + 'starless_grimoire_2_spell_book', SO + 'starless_grimoire_3_spell_book', IS + 'eldritch', [[IS + 'eldritch_manuscript', 8], [IS + 'arcane_ingot', 8], [SO + 'eldritch_upgrade_orb', 3]])
  amelioration('stoneheart_codex_t1_to_t2', SO + 'stoneheart_codex_spell_book', SO + 'stoneheart_codex_2_spell_book', 'gtbcs_geomancy_plus:geo', [['minecraft:obsidian', 16], [IS + 'arcane_ingot', 4], ['gtbcs_geomancy_plus:geo_upgrade_orb', 2]])
  amelioration('stoneheart_codex_t2_to_t3', SO + 'stoneheart_codex_2_spell_book', SO + 'stoneheart_codex_3_spell_book', 'gtbcs_geomancy_plus:geo', [['minecraft:obsidian', 32], [IS + 'arcane_ingot', 8], ['gtbcs_geomancy_plus:geo_upgrade_orb', 3]])
  console.info('[classes_desactives] ' + n + ' recettes ajoutées (armes sans source).')
})

// ───────────── Affichage JEI ─────────────
// Les objets désactivés ne sont plus masqués dans JEI (le tag c:hidden_from_recipe_viewers n'est plus posé).

// ───────────── Malédictions du lien éternel et de disparition : supprimées ─────────────
// 1) Plus tirées au hasard (butin, échanges, équipement des mobs, table d'enchantement) : retirées des tags d'enchantements.
// 2) Celles qui existent déjà sur un objet (inventaire des joueurs, conteneurs ouverts, objets au sol) sont effacées.
var DESACT_MALEDICTIONS = ['minecraft:binding_curse', 'minecraft:vanishing_curse']
try {
  ServerEvents.tags('enchantment', function (event) {
    var tags = ['minecraft:on_random_loot', 'minecraft:on_mob_spawn_equipment', 'minecraft:on_traded_equipment',
      'minecraft:tradeable', 'minecraft:in_enchanting_table', 'minecraft:non_treasure']
    for (var i = 0; i < tags.length; i++) {
      try { event.remove(tags[i], DESACT_MALEDICTIONS) } catch (e) {}
    }
    console.info('[classes_desactives] Malédictions (lien éternel, disparition) retirées des tirages d\'enchantements.')
  })
} catch (e) {
  console.error('[classes_desactives] Tags d\'enchantements indisponibles : ' + e)
}

var DESACT_ENCH = null
var DESACT_ENCH_ERREUR = false
function desactSansMalediction(pile) {
  try {
    if (!pile || pile.isEmpty()) return false
    if (!DESACT_ENCH) DESACT_ENCH = Java.loadClass('net.minecraft.world.item.enchantment.EnchantmentHelper')
    var ench = DESACT_ENCH.getEnchantmentsForCrafting(pile)
    if (ench.isEmpty()) return false
    var trouve = false
    var it = ench.keySet().iterator()
    while (it.hasNext()) {
      if (DESACT_MALEDICTIONS.indexOf(String(it.next().getRegisteredName())) >= 0) { trouve = true; break }
    }
    if (!trouve) return false
    DESACT_ENCH.updateEnchantments(pile, function (m) {
      m.removeIf(function (h) { return DESACT_MALEDICTIONS.indexOf(String(h.getRegisteredName())) >= 0 })
    })
    return true
  } catch (e) {
    if (!DESACT_ENCH_ERREUR) { DESACT_ENCH_ERREUR = true; console.error('[classes_desactives] Retrait des malédictions : ' + e) }
    return false
  }
}
// Inventaire de chaque joueur : une fois toutes les 5 secondes
ServerEvents.tick(perfWrap('classes_desactives:192', function (ev) {
  try {
    if (ev.server.tickCount % 100 !== 0) return
    var joueurs = ev.server.getPlayers()
    for (var i = 0; i < joueurs.size(); i++) {
      var inv = joueurs.get(i).getInventory()
      var n = inv.getContainerSize()
      for (var s = 0; s < n; s++) desactSansMalediction(inv.getItem(s))
    }
  } catch (e) {}
}))

// ───────────── Butin des mobs ─────────────
function desactButinMobs(event) {
  try {
    var drops = event.getDrops()
    var it = drops.iterator()
    while (it.hasNext()) {
      var entite = it.next()
      var pile = entite.getItem()
      if (!pile || pile.isEmpty()) continue
      if (desactSansButin(pile.id)) { it.remove(); continue }
      if (desactParcheminInterdit(pile)) {
        var neufMob = desactRemplacant(pile)
        if (neufMob) entite.setItem(neufMob)
        else it.remove()
      }
    }
  } catch (e) {
    console.error('[classes_desactives] Butin des mobs : ' + e)
  }
}

try {
  NativeEvents.onEvent(
    Java.loadClass('net.neoforged.neoforge.event.entity.living.LivingDropsEvent'),
    function (event) { desactButinMobs(event) }
  )
  console.info('[classes_desactives] Filtre du butin des mobs actif.')
} catch (e) {
  console.error('[classes_desactives] Filtre du butin des mobs indisponible : ' + e)
}

// ───────────── Coffres et conteneurs ─────────────
// Le butin d'un coffre est généré juste avant l'ouverture : on le nettoie à l'ouverture.
// Sont ignorés : l'inventaire du joueur, le coffre de l'Ender, et les joueurs en mode testeur.
var DESACT_CLASSE_ENDER = null
var DESACT_CLASSE_COFFRE = null
var DESACT_CLASSE_MARCHAND = null

// Villageois, marchand ambulant et autres PNJ : les échanges dont le résultat est désactivé sont retirés à l'ouverture.
function desactNettoyerOffres(menu) {
  var offres = menu.getOffers()
  if (!offres) return
  var it = offres.iterator()
  var retires = 0
  while (it.hasNext()) {
    var offre = it.next()
    var pile = offre.getResult()
    if (pile && !pile.isEmpty() && desactSansButin(pile.id)) {
      it.remove()
      retires++
    }
  }
  if (retires > 0) console.info('[classes_desactives] ' + retires + ' échange(s) retiré(s) chez un PNJ.')
}

function desactNettoyerConteneur(event) {
  try {
    var joueur = event.getEntity()
    if (!joueur || !joueur.isPlayer()) return
    var menu = event.getContainer()
    try {   // malédictions déjà présentes sur les objets du conteneur ouvert (et de l'inventaire)
      for (var m = 0; m < menu.slots.size(); m++) desactSansMalediction(menu.getSlot(m).getItem())
    } catch (eM) {}
    if (estTest(joueur)) return
    if (!DESACT_CLASSE_MARCHAND) DESACT_CLASSE_MARCHAND = Java.loadClass('net.minecraft.world.inventory.MerchantMenu')
    if (menu instanceof DESACT_CLASSE_MARCHAND) {
      desactNettoyerOffres(menu)
      return
    }
    var total = menu.slots.size()
    if (total <= 36) return
    if (!DESACT_CLASSE_ENDER) {
      DESACT_CLASSE_ENDER = Java.loadClass('net.minecraft.world.inventory.PlayerEnderChestContainer')
      DESACT_CLASSE_COFFRE = Java.loadClass('net.minecraft.world.inventory.ChestMenu')
    }
    if (menu instanceof DESACT_CLASSE_COFFRE && menu.getContainer() instanceof DESACT_CLASSE_ENDER) return
    // Le dernier emplacement appartient toujours à l'inventaire du joueur : sert de repère.
    var repere = menu.getSlot(total - 1)
    var vide = Item.of('minecraft:air')
    var retires = 0
    for (var i = 0; i < total; i++) {
      var slot = menu.getSlot(i)
      if (slot.isSameInventory(repere)) continue
      var pile = slot.getItem()
      if (!pile || pile.isEmpty()) continue
      if (desactParcheminInterdit(pile)) {
        var neuf = desactRemplacant(pile)
        slot.set(neuf ? neuf : vide)
        retires++
        continue
      }
      if (!desactSansButin(pile.id) && !desactSansCoffre(pile.id)) continue
      slot.set(vide)
      retires++
    }
    if (retires > 0) console.info('[classes_desactives] ' + retires + ' objet(s) désactivé(s) retiré(s) d\'un conteneur.')
  } catch (e) {
    console.error('[classes_desactives] Conteneur : ' + e)
  }
}

try {
  NativeEvents.onEvent(
    Java.loadClass('net.neoforged.neoforge.event.entity.player.PlayerContainerEvent$Open'),
    function (event) { desactNettoyerConteneur(event) }
  )
  console.info('[classes_desactives] Filtre des coffres actif.')
} catch (e) {
  console.error('[classes_desactives] Filtre des coffres indisponible : ' + e)
}

// ───────────── Objets au sol : pêche, troc des piglins, archéologie, chambres d'épreuve, coffres cassés ─────────────
// Tout objet désactivé qui apparaît au sol sans avoir été lancé par un joueur est supprimé.
// (Les objets lâchés par un joueur, eux, ne sont pas touchés.)
var DESACT_CLASSE_OBJET_SOL = null

function desactObjetAuSol(event) {
  try {
    var niveau = event.getLevel()
    if (niveau.isClientSide()) return
    var entite = event.getEntity()
    if (!DESACT_CLASSE_OBJET_SOL) DESACT_CLASSE_OBJET_SOL = Java.loadClass('net.minecraft.world.entity.item.ItemEntity')
    if (!(entite instanceof DESACT_CLASSE_OBJET_SOL)) return
    if (entite.getOwner() != null) return
    var pile = entite.getItem()
    if (!pile || pile.isEmpty()) return
    desactSansMalediction(pile)
    if (desactSansButin(pile.id)) { event.setCanceled(true); return }
    if (desactParcheminInterdit(pile)) {
      var neufSol = desactRemplacant(pile)
      if (neufSol) entite.setItem(neufSol)
      else event.setCanceled(true)
    }
  } catch (e) {
    console.error('[classes_desactives] Objet au sol : ' + e)
  }
}

try {
  NativeEvents.onEvent(
    Java.loadClass('net.neoforged.neoforge.event.entity.EntityJoinLevelEvent'),
    function (event) { desactObjetAuSol(event) }
  )
  console.info('[classes_desactives] Filtre des objets au sol actif (pêche, troc, archéologie, chambres d\'épreuve).')
} catch (e) {
  console.error('[classes_desactives] Filtre des objets au sol indisponible : ' + e)
}

// ───────────── Aegis sauvage (Monster & Spellbooks) : plus de spawn naturel dans les villages ─────────────
// Le mod en place un à la génération de chaque village (sans passer par les règles de spawn). Seuls les Aegis créés par
// œuf, commande, spawner ou invocation de joueur (SummonedAegis = autre entité, jamais touchée) sont marqués et gardés ;
// tout autre Aegis qui rejoint le monde est retiré.
var AEGIS_TYPE = 'monsterspellbooks:aegis'
var AEGIS_TAG = 'mcrp_aegis_autorise'
var AEGIS_SOURCES_OK = { COMMAND: 1, SPAWN_EGG: 1, SPAWNER: 1, TRIGGERED: 1, DISPENSER: 1, MOB_SUMMONED: 1, BUCKET: 1, MOB_SUMMON: 1 }
try {
  NativeEvents.onEvent(
    Java.loadClass('net.neoforged.neoforge.event.entity.living.FinalizeSpawnEvent'),
    function (event) {
      try {
        var m = event.getEntity()
        if (String(m.type) !== AEGIS_TYPE) return
        if (AEGIS_SOURCES_OK[String(event.getSpawnType().name())]) m.addTag(AEGIS_TAG)
      } catch (e1) {}
    }
  )
  NativeEvents.onEvent(
    Java.loadClass('net.neoforged.neoforge.event.entity.EntityJoinLevelEvent'),
    function (event) {
      try {
        var m = event.getEntity()
        if (String(m.type) !== AEGIS_TYPE) return
        if (event.getLevel().isClientSide()) return
        if (m.getTags().contains(AEGIS_TAG)) return
        event.setCanceled(true)
        console.info('[classes_desactives] Aegis sauvage (village) retiré : ' + Math.floor(m.getX()) + ' ' + Math.floor(m.getY()) + ' ' + Math.floor(m.getZ()))
      } catch (e2) {}
    }
  )
  console.info('[classes_desactives] Spawn naturel de l\'Aegis désactivé.')
} catch (e) {
  console.error('[classes_desactives] Filtre Aegis indisponible : ' + e)
}

// ───────────── Bijoux d'Iron's Jewelry désactivés : Amulette de Protection en Cristal de redstone ─────────────
// Trop puissante (explosion électrique à chaque coup reçu). Retirée de l'inventaire et des emplacements Curios, d'où qu'elle vienne
// (forge à bijoux, butin, échange entre joueurs).
var DESACT_BIJOUX = [{ motif: 'amulet_of_protection', materiau: 'monsterspellbooks:redstone_crystal' }]
var DESACT_VIDE = Java.loadClass('net.minecraft.world.item.ItemStack').EMPTY
var DESACT_JD = null, DESACT_CURIOS = null, DESACT_BIJOUX_ERREUR = false
function desactBijouInterdit(pile) {
  try {
    if (!pile || pile.isEmpty()) return false
    var id = String(pile.id)
    if (id.indexOf('irons_jewelry:') !== 0) return false
    if (!DESACT_JD) DESACT_JD = Java.loadClass('io.redspace.ironsjewelry.core.data.JewelryData')
    var d = DESACT_JD.getNullable(pile)
    if (!d) return false
    var motif = String(d.pattern().unwrapKey().get().location())
    var mats = []
    var it = d.parts().values().iterator()
    while (it.hasNext()) mats.push(String(it.next().unwrapKey().get().location()))
    for (var i = 0; i < DESACT_BIJOUX.length; i++) {
      var r = DESACT_BIJOUX[i]
      if (motif.indexOf(r.motif) >= 0 && mats.indexOf(r.materiau) >= 0) return true
    }
  } catch (e) {
    if (!DESACT_BIJOUX_ERREUR) { DESACT_BIJOUX_ERREUR = true; console.error('[classes_desactives] bijoux : ' + e) }
  }
  return false
}
ServerEvents.tick(perfWrap('classes_desactives:415', function (ev) {
  try {
    if (ev.server.tickCount % 20 !== 0) return
    var joueurs = ev.server.getPlayers()
    for (var i = 0; i < joueurs.size(); i++) {
      var p = joueurs.get(i)
      var retire = false
      var inv = p.getInventory()
      var n = inv.getContainerSize()
      for (var s = 0; s < n; s++) {
        if (desactBijouInterdit(inv.getItem(s))) { inv.setItem(s, DESACT_VIDE); retire = true }
      }
      try {
        if (!DESACT_CURIOS) DESACT_CURIOS = Java.loadClass('top.theillusivec4.curios.api.CuriosApi')
        var opt = DESACT_CURIOS.getCuriosInventory(p)
        if (opt.isPresent()) {
          var h = opt.get().getEquippedCurios()
          for (var k = 0; k < h.getSlots(); k++) {
            if (desactBijouInterdit(h.getStackInSlot(k))) { h.setStackInSlot(k, DESACT_VIDE); retire = true }
          }
        }
      } catch (eC) {}
      if (retire) {
        p.tell(Text.red('Cette amulette a été désactivée sur le serveur et a disparu de ton équipement.'))
        console.info('[classes_desactives] Amulette de Protection (cristal de redstone) retirée à ' + p.username)
      }
    }
  } catch (e) {}
}))
