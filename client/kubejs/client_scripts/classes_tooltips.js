// Étiquette de classe sous chaque objet réservé (visible en jeu ET dans JEI).
// À placer dans : <instance>/kubejs/client_scripts/classes_tooltips.js
// Recharger avec F3+T (ou relancer le jeu). Si une erreur apparaît, envoie-moi logs/kubejs/client.log
// "regle" = expression régulière testée sur l'identifiant de l'objet (ex. "modid:nom_objet").
var RESTRICTIONS = [
  { regle: /^minecraft:elytra$/, classes: [] },
  // ═══════════ RÈGLES PERSONNALISÉES (prioritaires : la première règle qui correspond l'emporte) ═══════════
  // ── Désactivés (aucune classe) ──
  { regle: /^apprenticecodex:(.*_spellcaster_gun|focus_staffbow|multipurpose_staffrifle|fullauto_rapidcast_spellrifle|.*_swingcast_staff|revolvercast_staff|scrollcaster_gauntlet|circuit_heat_staff|charged_twin_blade_staff|magi_agent_suit_.*)$/, classes: [] },
  { regle: /^cataclysm_spellbooks:(excelsius_.*|cursium_mage_.*|ignis_.*|hellfire_forge)$/, classes: [] },
  { regle: /^somakespells:forbidden_hammer$/, classes: [] },
  { regle: /^iss_magicfromtheeast:repeating_crossbow$/, classes: [] },
  // ── Legendary Monsters : seuls le Marteau moussu et le Plastron moussu sont gardés (Druide, Géomancien) ; le reste des armes et armures est désactivé ──
  { regle: /^legendary_monsters:(mossy_hammer|mossy_chestplate)$/, classes: ['Druide', 'Géomancien'] },
  { regle: /^legendary_monsters:(sharp_battle_axe|spiky_shield|spiky_spear|chorus_blade|chorus_mask|chorus_cannon|shulker_shield|shulker_helmet|the_great_frost|dinosaur_bone_shield|dinosaur_bone_club|dinosaur_bone_helmet|frostbitten_shield|fiery_jaw|fiery_boots|void_sword|ender_hammer|withered_scythe|withered_ribcage|wand_of_clouds|sharp_sai|axe_of_lightning|atmospheric_boots|soul_great_sword|golden_halbert|knights_sword|blastproof_helmet|sand_cannon|sickle_of_harvest|monstrous_anchor|reinforced_monstrous_anchor|atom_splitter|the_tesseract|buckler_of_annihilation|resurrected_javelin|shattered_greatsword|hand_cannon|swinging_axe|sapphire_helmet|bronzite_sword|bronzite_axe|enderitium_(sword|axe|sickle)|annihilator_(helmet|chestplate|leggings|boots))$/, classes: [] },
  // ── Bosses'Rise (block_factorys_bosses) : armes et armures désactivées ──
  { regle: /^block_factorys_bosses:(dragon_bones_(boots|chestplate|leggings)|dragon_guard_shield|enhanced_shield|ice_gauntlet|knight_(helmet|chestplate|leggings|boots|sword)|kraken_trident|kraken_cannon_item|large_sword|pirate_saber|sandworm_gauntlet|warrior_sword|dagger)$/, classes: [] },
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

var REGEX_GRIMOIRE = /(spell_?book|grimoire|_book$|^book_|tome|codex|palette|journal|necronomicon|bible)/

function estGrimoire(idObjet) {
  var chemin = String(idObjet).split(':').pop()
  return REGEX_GRIMOIRE.test(chemin)
}

var LIBRES = [
  'chronomancy:book_of_time_managment',
  'colormagic:rainbow_palette',
  'colormagic:amalgam_palette'
]

function ligneClasse(r) {
  var en = langueAnglaise()
  if (r.classes.length === 0) return Text.red(en ? 'Class: item disabled' : 'Classe : objet désactivé')
  var ligne = 'Classe : ' + r.classes.join(' / ')
  return Text.gold(en ? traduireEN(ligne) : ligne)
}

function tousLesIds() {
  var ids = []
  try {
    var l = Item.getTypeList()
    for (var i = 0; i < l.size(); i++) ids.push(String(l.get(i)))
  } catch (e) {
    console.error('[classes_tooltips] Item.getTypeList indisponible : ' + e)
  }
  return ids
}

function ajouter(event, id, r) {
  event.add(id, ligneClasse(r))
}

ItemEvents.modifyTooltips(function (event) {
  var ids = tousLesIds()
  var n = 0
  for (var i = 0; i < ids.length; i++) {
    var id = ids[i]
    if (LIBRES.indexOf(id) !== -1) continue
    if (estGrimoire(id)) continue
    for (var j = 0; j < RESTRICTIONS.length; j++) {
      if (RESTRICTIONS[j].regle.test(id)) {
        ajouter(event, id, RESTRICTIONS[j])
        n++
        break
      }
    }
  }
  console.info('[classes_tooltips] ' + n + ' objets étiquetés.')
})

// ───────────── Sorts : classe affichée sur les parchemins, grimoires et objets à sorts ─────────────
// Utilise l'événement d'infobulle de NeoForge et l'API d'Iron's Spells pour lire les sorts de l'objet.
var CLASSE_DES_SORTS = {
  'hazennstuff:prismatic_shift': 'Astromancien',
  'hazennstuff:nights_edge_strike': 'Réprouvé',
  'hazennstuff:thorn_chakram': 'Druide',
  'hazennstuff:golden_shower': 'Hydromancien',
  'hazennstuff:shooting_star': 'Astromancien',
  'hazennstuff:violent_regurgitation': 'Hémomancien',
  'hazennstuff:counterspell_spider_lily': 'Géomancien / Druide',
  'hazennstuff:syringe_barrage': 'Hémomancien',
  'hazennstuff:bone_bolt': 'Évocateur',
  'hazennstuff:spectral_axe': 'Spiritualiste',
  'hazennstuff:umbrashift_barrage': 'Réprouvé',
  'hazennstuff:shadow_reaver': 'Envoûteur',
  'hazennstuff:soul_seekers': 'Nécromancien / Envoûteur',
  'hazennstuff:arcane_cards': 'Évocateur',
  'hazennstuff:cosmic_bolt': 'Astromancien',
  'hazennstuff:evercomet_barrage': 'Astromancien',
  'hazennstuff:moonkissed': 'Astromancien',
  'hazennstuff:parry': 'toutes',
  'farmers_spell:goodberry': 'Druide',
  'farmers_spell:phantom_loot': 'Druide',
  'farmers_spell:seal_coat': 'Druide',
  'farmers_spell:bad_apple': 'Druide',
  'farmers_spell:chaos_slash': 'Druide',
  'farmers_spell:preserve_circle': 'Druide',
  'farmers_spell:pan': 'Druide',
  'aces_spell_utils:example_advanced_spells': 'Évocateur',
  'aces_spell_utils:example_advanced_tp': 'Évocateur',
  'apprenticecodex:anchor_blink': 'Voyageur du Vide',
  'apprenticecodex:arcane_beam': 'Voyageur du Vide',
  'apprenticecodex:arcane_blast': 'Voyageur du Vide',
  'apprenticecodex:archer_multiple': 'Technomancien',
  'apprenticecodex:artisan_smash': 'Technomancien',
  'apprenticecodex:assist_wings': 'Voyageur du Vide',
  'apprenticecodex:auto_magnet': 'Technomancien / Électro-Sorcier',
  'apprenticecodex:auto_turret': 'Technomancien',
  'apprenticecodex:blood_brand': 'Hémomancien',
  'apprenticecodex:bloody_arrow': 'Hémomancien',
  'apprenticecodex:bound_bow': 'Technomancien',
  'apprenticecodex:bound_sword': 'Technomancien',
  'apprenticecodex:breaching_enemy': 'Technomancien',
  'apprenticecodex:bullet_stream': 'Technomancien',
  'apprenticecodex:call_broom': 'toutes',
  'apprenticecodex:catch_flame': 'Pyromancien',
  'apprenticecodex:combustion_jet': 'Pyromancien',
  'apprenticecodex:commence_fire': 'Technomancien',
  'apprenticecodex:companion_trunk': 'toutes',
  'apprenticecodex:compound_phial': 'Druide',
  'apprenticecodex:deep_sensor': 'toutes',
  'apprenticecodex:demicreator_wings': 'Voyageur du Vide',
  'apprenticecodex:divine_possession': 'Paladin',
  'apprenticecodex:dual_acrobat': 'Technomancien',
  'apprenticecodex:earth_forge': 'Géomancien',
  'apprenticecodex:echo_arrow': 'toutes',
  'apprenticecodex:echo_cast': 'toutes',
  'apprenticecodex:edge_dancer': 'Évocateur',
  'apprenticecodex:extract': 'Druide',
  'apprenticecodex:feather_rush': 'Évocateur',
  'apprenticecodex:field_overseer': 'Technomancien',
  'apprenticecodex:fly_swatter': 'Technomancien',
  'apprenticecodex:force_field': 'Paladin',
  'apprenticecodex:frost_rune': 'Cryomancien',
  'apprenticecodex:fujin': 'Aéromancien',
  'apprenticecodex:graced_rain': 'Hydromancien',
  'apprenticecodex:grind_runner': 'Druide',
  'apprenticecodex:harvest_moon': 'Druide',
  'apprenticecodex:healing_bloom': 'Druide',
  'apprenticecodex:heavenly_fist': 'Druide',
  'apprenticecodex:higanbana': 'Hémomancien',
  'apprenticecodex:idol_reconstruction': 'Paladin',
  'apprenticecodex:illuminate_stellar': 'Paladin',
  'apprenticecodex:inscribe_ice': 'Cryomancien',
  'apprenticecodex:lethal_assault': 'Technomancien',
  'apprenticecodex:lightning_arrow': 'Électro-Sorcier',
  'apprenticecodex:linear_build': 'Désactivé',
  'apprenticecodex:lock_on_ray': 'Paladin',
  'apprenticecodex:long_stride': 'Électro-Sorcier / Voyageur du Vide',
  'apprenticecodex:lunar_aim': 'Cryomancien',
  'apprenticecodex:mage_light': 'toutes',
  'apprenticecodex:magic_spear': 'Technomancien',
  'apprenticecodex:mana_charge': 'Paladin',
  'apprenticecodex:mana_mending': 'toutes',
  'apprenticecodex:mana_slash': 'Voyageur du Vide',
  'apprenticecodex:mana_transcription': 'toutes',
  'apprenticecodex:manifestation_grimoire': 'Désactivé',
  'apprenticecodex:mantis_leap': 'Technomancien',
  'apprenticecodex:mirage_avoidance': 'Électro-Sorcier / Voyageur du Vide',
  'apprenticecodex:mist_form': 'Hémomancien',
  'apprenticecodex:moon_light': 'toutes',
  'apprenticecodex:mystic_shield': 'Paladin',
  'apprenticecodex:otherworld_lens': 'toutes',
  'apprenticecodex:palette_shift': 'toutes',
  'apprenticecodex:personal_shelf': 'toutes',
  'apprenticecodex:phalanx_charge': 'Paladin',
  'apprenticecodex:precision_jack': 'Technomancien',
  'apprenticecodex:quick_arms': 'Technomancien',
  'apprenticecodex:quick_blink': 'Voyageur du Vide',
  'apprenticecodex:remote_eye': 'Spiritualiste',
  'apprenticecodex:rift_hole': 'Voyageur du Vide',
  'apprenticecodex:sacred_arrow': 'Paladin',
  'apprenticecodex:search_beacon': 'Évocateur',
  'apprenticecodex:sense_evil': 'Paladin',
  'apprenticecodex:servant_gaze': 'Technomancien / Voyageur du Vide',
  'apprenticecodex:shiden': 'Technomancien',
  'apprenticecodex:shock': 'Électro-Sorcier',
  'apprenticecodex:silent_assassin': 'Technomancien',
  'apprenticecodex:sky_edge': 'Technomancien',
  'apprenticecodex:slash_blade': 'Technomancien',
  'apprenticecodex:soul_conversion': 'toutes',
  'apprenticecodex:spectral_wing': 'toutes',
  'apprenticecodex:tamers_pocket': 'toutes',
  'apprenticecodex:terra_resonance': 'Géomancien / Druide',
  'apprenticecodex:thermal_process': 'Technomancien',
  'apprenticecodex:thermal_slice': 'Pyromancien / Technomancien',
  'apprenticecodex:tiny_lumberjack': 'Druide',
  'apprenticecodex:tiro_volley': 'Technomancien',
  'apprenticecodex:totem_of_permafrost': 'Cryomancien',
  'apprenticecodex:treasure_divination': 'Druide',
  'apprenticecodex:unite_luna': 'Paladin',
  'apprenticecodex:wavering_star': 'Voyageur du Vide',
  'apprenticecodex:wizardlamp': 'Paladin',
  'apprenticecodex:world_flatter': 'Druide',
  'asterismarcanum:astral_echo': 'Astromancien',
  'asterismarcanum:astral_gateway': 'Astromancien',
  'asterismarcanum:brightburst': 'Astromancien',
  'asterismarcanum:celestial_tether': 'Astromancien',
  'asterismarcanum:luminous_beam': 'Astromancien',
  'asterismarcanum:piercing_light': 'Astromancien',
  'asterismarcanum:silvery_barbs': 'Astromancien',
  'asterismarcanum:star_swarm': 'Astromancien',
  'asterismarcanum:starcutter': 'Astromancien',
  'asterismarcanum:starfire': 'Astromancien',
  'asterismarcanum:summon_lunar_moths': 'Astromancien',
  'cataclysm_spellbooks:abyss_fireball': 'Pyromancien',
  'cataclysm_spellbooks:abyssal_blast': 'Désactivé',
  'cataclysm_spellbooks:abyssal_predator': 'Hydromancien',
  'cataclysm_spellbooks:abyssal_slash': 'Hydromancien',
  'cataclysm_spellbooks:amethyst_puncture': 'Druide',
  'cataclysm_spellbooks:ashen_breath': 'Pyromancien',
  'cataclysm_spellbooks:bone_storm': 'Nécromancien',
  'cataclysm_spellbooks:conjure_amethyst_crab': 'Druide',
  'cataclysm_spellbooks:conjure_ignited_reinforcement': 'Évocateur',
  'cataclysm_spellbooks:conjure_koboldiator': 'Géomancien',
  'cataclysm_spellbooks:conjure_thralls': 'Nécromancien',
  'cataclysm_spellbooks:cursed_rush': 'Spiritualiste',
  'cataclysm_spellbooks:depth_charge': 'Désactivé',
  'cataclysm_spellbooks:desert_winds': 'Aéromancien / Géomancien',
  'cataclysm_spellbooks:dimensional_rift': 'Désactivé',
  'cataclysm_spellbooks:forgone_rage': 'Spiritualiste',
  'cataclysm_spellbooks:gravitation_pull': 'Voyageur du Vide',
  'cataclysm_spellbooks:gravity_storm': 'Voyageur du Vide',
  'cataclysm_spellbooks:hellish_blade': 'Pyromancien',
  'cataclysm_spellbooks:incineration': 'Pyromancien',
  'cataclysm_spellbooks:infernal_strike': 'Pyromancien',
  'cataclysm_spellbooks:malevolent_battlefield': 'Spiritualiste',
  'cataclysm_spellbooks:monolith_crash': 'Géomancien',
  'cataclysm_spellbooks:pharaohs_wrath': 'Géomancien',
  'cataclysm_spellbooks:piercing_bone': 'Nécromancien',
  'cataclysm_spellbooks:pilfer': 'Évocateur',
  'cataclysm_spellbooks:sandstorm': 'Aéromancien / Géomancien',
  'cataclysm_spellbooks:summon_koboleton': 'Géomancien',
  'cataclysm_spellbooks:tectonic_tremble': 'Pyromancien',
  'cataclysm_spellbooks:thoths_witness': 'Géomancien',
  'cataclysm_spellbooks:tidal_grab': 'Hydromancien',
  'cataclysm_spellbooks:void_beam': 'Désactivé',
  'cataclysm_spellbooks:void_bulwark': 'Voyageur du Vide',
  'cataclysm_spellbooks:void_rune': 'Voyageur du Vide',
  'chronomancy:accelerated_zone': 'Chronomancien',
  'chronomancy:backtrack': 'Chronomancien',
  'chronomancy:borrowed_future': 'Chronomancien',
  'chronomancy:chrono_double': 'Chronomancien',
  'chronomancy:rewind': 'Chronomancien',
  'chronomancy:rift': 'Chronomancien',
  'chronomancy:sands_of_time': 'Chronomancien',
  'chronomancy:temporal_stasis_beam': 'Chronomancien',
  'chronomancy:the_world_stop': 'Chronomancien',
  'chronomancy:time_dilation_field': 'Chronomancien',
  'chronomancy:time_piercing_needle': 'Chronomancien',
  'chronomancy:time_walk': 'Chronomancien',
  'colormagic:black_droplets': 'Chromancien',
  'colormagic:blue': 'Chromancien',
  'colormagic:broad_stroke': 'Chromancien',
  'colormagic:color_carapace': 'Chromancien',
  'colormagic:color_dash': 'Chromancien',
  'colormagic:crushing_maw': 'Chromancien',
  'colormagic:desaturation': 'Chromancien',
  'colormagic:green': 'Chromancien',
  'colormagic:masterpiece_portrait': 'Chromancien',
  'colormagic:paint_spray': 'Chromancien',
  'colormagic:red': 'Chromancien',
  'colormagic:spiraling_despair': 'Chromancien',
  'colormagic:true_color_strike': 'Chromancien',
  'colormagic:white_ink_strike': 'Chromancien',
  'cursed_school:apostate_crown': 'Réprouvé',
  'cursed_school:ash_guard': 'Réprouvé',
  'cursed_school:ash_needle': 'Réprouvé',
  'cursed_school:ash_pack': 'Réprouvé',
  'cursed_school:black_root': 'Réprouvé',
  'cursed_school:black_verse': 'Réprouvé',
  'cursed_school:blight_step': 'Réprouvé',
  'cursed_school:bone_toll': 'Réprouvé',
  'cursed_school:call_clerk': 'Réprouvé',
  'cursed_school:chain_of_remorse': 'Réprouvé',
  'cursed_school:choir_of_flies': 'Réprouvé',
  'cursed_school:crow_feast': 'Réprouvé',
  'cursed_school:debt_spike': 'Réprouvé',
  'cursed_school:decay_field': 'Réprouvé',
  'cursed_school:eclipse_maw': 'Réprouvé',
  'cursed_school:finished_margin': 'Réprouvé',
  'cursed_school:grave_dust': 'Réprouvé',
  'cursed_school:greedy_margin': 'Réprouvé',
  'cursed_school:hatch_cysts': 'Réprouvé',
  'cursed_school:hex_barrage': 'Réprouvé',
  'cursed_school:hollow_bite': 'Réprouvé',
  'cursed_school:invoice': 'Réprouvé',
  'cursed_school:issue_invoice': 'Réprouvé',
  'cursed_school:leech_thread': 'Réprouvé',
  'cursed_school:margin_pact': 'Réprouvé',
  'cursed_school:marrow_drain': 'Réprouvé',
  'cursed_school:night_ledger': 'Réprouvé',
  'cursed_school:pale_lantern': 'Réprouvé',
  'cursed_school:rot_bolt': 'Réprouvé',
  'cursed_school:rotting_rain': 'Réprouvé',
  'cursed_school:ruin_slash': 'Réprouvé',
  'cursed_school:severed_tithe': 'Réprouvé',
  'cursed_school:soot_shroud': 'Réprouvé',
  'cursed_school:stain_brand': 'Réprouvé',
  'cursed_school:testament_of_ash': 'Réprouvé',
  'cursed_school:thrice_signed_name': 'Réprouvé',
  'cursed_school:umbral_coffin': 'Réprouvé',
  'cursed_school:unsigned_judgment': 'Réprouvé',
  'cursed_school:wailing_dirge': 'Réprouvé',
  'cursed_school:withering_touch': 'Réprouvé',
  'cursespells:a_call_beyond': 'Envoûteur',
  'cursespells:abhorrent_star': 'Envoûteur',
  'cursespells:all_vanity': 'Envoûteur',
  'cursespells:blade_of_judgment': 'Envoûteur',
  'cursespells:catastrophe': 'Envoûteur',
  'cursespells:chain_curse': 'Envoûteur',
  'cursespells:cursed_arrow': 'Envoûteur',
  'cursespells:cursed_breath': 'Envoûteur',
  'cursespells:cursed_charge': 'Envoûteur',
  'cursespells:cursed_claw': 'Envoûteur',
  'cursespells:cursed_crush': 'Envoûteur',
  'cursespells:cursed_eye': 'Envoûteur',
  'cursespells:cursed_hand': 'Envoûteur',
  'cursespells:cursed_heart': 'Envoûteur',
  'cursespells:cursed_lung': 'Envoûteur',
  'cursespells:cursed_orb': 'Envoûteur',
  'cursespells:cursed_rage': 'Envoûteur',
  'cursespells:cursed_sabbath': 'Envoûteur',
  'cursespells:cursed_scar': 'Envoûteur',
  'cursespells:cursed_scatter': 'Envoûteur',
  'cursespells:cursed_slash': 'Envoûteur',
  'cursespells:cursed_strike': 'Envoûteur',
  'cursespells:dagger_of_obsession': 'Envoûteur',
  'cursespells:droplet_of_stagnation': 'Envoûteur',
  'cursespells:flame_of_stagnation': 'Envoûteur',
  'cursespells:flames_of_fury': 'Envoûteur',
  'cursespells:frenzy_plant': 'Druide',
  'cursespells:hell_fire': 'Envoûteur',
  'cursespells:homing_soulmass': 'Envoûteur',
  'cursespells:inferno': 'Envoûteur',
  'cursespells:leaf_storm': 'Druide',
  'cursespells:pillar_of_sin': 'Envoûteur',
  'cursespells:primal_seed': 'Druide',
  'cursespells:rage_awakened': 'Envoûteur',
  'cursespells:ray_of_punishment': 'Envoûteur',
  'cursespells:shadow_dive': 'Envoûteur',
  'cursespells:silent_waltz': 'Envoûteur',
  'cursespells:skyfall': 'Envoûteur',
  'cursespells:soul_stream': 'Envoûteur',
  'cursespells:stagnant_spiral': 'Envoûteur',
  'cursespells:the_command': 'Envoûteur',
  'cursespells:the_sky_and_cosmos_are_one': 'Envoûteur',
  'cursespells:wandering_grudge': 'Envoûteur',
  'cursespells:wood_hammer': 'Druide',
  'esoteric_spell:aegis_barrier': 'Ésotériste',
  'esoteric_spell:array_device': 'Ésotériste',
  'esoteric_spell:aspis_soul_barrier': 'Ésotériste',
  'esoteric_spell:auto_arrow_magic': 'Ésotériste',
  'esoteric_spell:auto_device': 'Ésotériste',
  'esoteric_spell:auto_javelin_magic': 'Ésotériste',
  'esoteric_spell:auto_lances_magic': 'Ésotériste',
  'esoteric_spell:barrier_aura': 'Ésotériste',
  'esoteric_spell:blast_magic': 'Ésotériste',
  'esoteric_spell:bless_barrier': 'Ésotériste',
  'esoteric_spell:brave_aura': 'Ésotériste',
  'esoteric_spell:cannon_magic': 'Ésotériste',
  'esoteric_spell:cast_barrier': 'Ésotériste',
  'esoteric_spell:chase_device': 'Ésotériste',
  'esoteric_spell:chronos_shift_magic': 'Ésotériste',
  'esoteric_spell:counter_device': 'Ésotériste',
  'esoteric_spell:crash_magic': 'Ésotériste',
  'esoteric_spell:cycle_aura': 'Ésotériste',
  'esoteric_spell:dual_bringer': 'Ésotériste',
  'esoteric_spell:echanted_burst': 'Ésotériste',
  'esoteric_spell:echanted_spell': 'Ésotériste',
  'esoteric_spell:element_slash': 'Ésotériste',
  'esoteric_spell:esoteric_missile': 'Ésotériste',
  'esoteric_spell:esoteric_shackle': 'Ésotériste',
  'esoteric_spell:esoteric_step': 'Ésotériste',
  'esoteric_spell:ether_barrier': 'Ésotériste',
  'esoteric_spell:familia_blizzard': 'Ésotériste',
  'esoteric_spell:familia_cat_summon': 'Ésotériste',
  'esoteric_spell:familia_imperial_ray': 'Ésotériste',
  'esoteric_spell:familia_lightning': 'Ésotériste',
  'esoteric_spell:familia_meteor': 'Ésotériste',
  'esoteric_spell:familia_research': 'Ésotériste',
  'esoteric_spell:familia_symphony': 'Ésotériste',
  'esoteric_spell:fast_reaction_aura': 'Ésotériste',
  'esoteric_spell:finale_guide': 'Ésotériste',
  'esoteric_spell:finale_magic': 'Ésotériste',
  'esoteric_spell:finale_mana_regan': 'Ésotériste',
  'esoteric_spell:finale_stone_barrier': 'Ésotériste',
  'esoteric_spell:flowing_barrier': 'Ésotériste',
  'esoteric_spell:gloria_barrier': 'Ésotériste',
  'esoteric_spell:guandian_beam_magic': 'Ésotériste',
  'esoteric_spell:guard_barrier': 'Ésotériste',
  'esoteric_spell:guardian_barrier': 'Ésotériste',
  'esoteric_spell:health_aura': 'Ésotériste',
  'esoteric_spell:immunity_aura': 'Ésotériste',
  'esoteric_spell:impact_magic': 'Ésotériste',
  'esoteric_spell:laser_magic': 'Ésotériste',
  'esoteric_spell:limit_break': 'Ésotériste',
  'esoteric_spell:magic_blade_absorb': 'Ésotériste',
  'esoteric_spell:magic_blade_conversion': 'Ésotériste',
  'esoteric_spell:magic_blade_enchant_slash': 'Ésotériste',
  'esoteric_spell:magic_blade_enchanting': 'Ésotériste',
  'esoteric_spell:magic_skin': 'Ésotériste',
  'esoteric_spell:mana_aura': 'Ésotériste',
  'esoteric_spell:mana_change_barrier': 'Ésotériste',
  'esoteric_spell:mana_resonance': 'Ésotériste',
  'esoteric_spell:maximizer_change_barrier': 'Ésotériste',
  'esoteric_spell:missile_device': 'Ésotériste',
  'esoteric_spell:namesis_magic': 'Ésotériste',
  'esoteric_spell:prayer_barrier': 'Ésotériste',
  'esoteric_spell:protection_barrier': 'Ésotériste',
  'esoteric_spell:qadal_magic': 'Ésotériste',
  'esoteric_spell:quick_motion_aura': 'Ésotériste',
  'esoteric_spell:rapid_change_barrier': 'Ésotériste',
  'esoteric_spell:resurrection': 'Ésotériste',
  'esoteric_spell:sanctuary_barrier': 'Ésotériste',
  'esoteric_spell:spell_calibration': 'Ésotériste',
  'esoteric_spell:storm_magic': 'Ésotériste',
  'esoteric_spell:suppress_device': 'Ésotériste',
  'esoteric_spell:union_sword': 'Ésotériste',
  'esoteric_spell:vulcan_device': 'Ésotériste',
  'esoteric_spell:wall_barrier': 'Ésotériste',
  'firesenderexpansion:arcane_slice': 'Voyageur du Vide',
  'firesenderexpansion:aspect_of_the_shulker': 'Voyageur du Vide',
  'firesenderexpansion:binary_stars': 'Voyageur du Vide',
  'firesenderexpansion:dimensional_adaptation': 'Voyageur du Vide',
  'firesenderexpansion:displacement_cage': 'Voyageur du Vide',
  'firesenderexpansion:dragons_fury': 'Voyageur du Vide',
  'firesenderexpansion:ends_rejuvenation': 'Voyageur du Vide',
  'firesenderexpansion:gate_of_ender': 'Voyageur du Vide',
  'firesenderexpansion:hollow_crystal': 'Voyageur du Vide',
  'firesenderexpansion:infinite_void': 'Voyageur du Vide',
  'firesenderexpansion:obsidian_rod': 'Voyageur du Vide',
  'firesenderexpansion:scintillating_stride': 'Voyageur du Vide',
  'gametechbcs_spellbooks:acid_rain': 'Druide',
  'gametechbcs_spellbooks:aerial_collapse': 'Druide',
  'gametechbcs_spellbooks:ashen_breath': 'Évocateur',
  'gametechbcs_spellbooks:astral_sense': 'Voyageur du Vide',
  'gametechbcs_spellbooks:blackout': 'toutes',
  'gametechbcs_spellbooks:call_forth_the_dead_king': 'Hémomancien',
  'gametechbcs_spellbooks:crimson_downpour': 'Hémomancien',
  'gametechbcs_spellbooks:displacement': 'Voyageur du Vide',
  'gametechbcs_spellbooks:ensnare': 'Druide',
  'gametechbcs_spellbooks:flames_reborn': 'Pyromancien',
  'gametechbcs_spellbooks:lingering_strain': 'Évocateur',
  'gametechbcs_spellbooks:meteor_storm': 'Pyromancien',
  'gametechbcs_spellbooks:nullflare': 'Paladin',
  'gametechbcs_spellbooks:psychic_bolt': 'toutes',
  'gametechbcs_spellbooks:reversal': 'toutes',
  'gametechbcs_spellbooks:shatterpoint': 'Cryomancien',
  'gametechbcs_spellbooks:spectral_blink': 'toutes',
  'gtbcs_geomancy_plus:chunker': 'Géomancien',
  'gtbcs_geomancy_plus:dripstone_bolt': 'Géomancien',
  'gtbcs_geomancy_plus:eroding_boulder': 'Géomancien',
  'gtbcs_geomancy_plus:fissure': 'Géomancien',
  'gtbcs_geomancy_plus:geo_conductor': 'Géomancien',
  'gtbcs_geomancy_plus:petrivise': 'Géomancien',
  'gtbcs_geomancy_plus:pillar_of_the_resounding_earth': 'Géomancien',
  'gtbcs_geomancy_plus:seismic_surf': 'Géomancien',
  'gtbcs_geomancy_plus:solar_beam': 'Paladin',
  'gtbcs_geomancy_plus:solar_storm': 'Paladin',
  'gtbcs_geomancy_plus:tremor_spike': 'Géomancien',
  'gtbcs_geomancy_plus:tremor_step': 'Géomancien',
  'irons_spellbooks:abyssal_shroud': 'toutes',
  'irons_spellbooks:acid_orb': 'Druide',
  'irons_spellbooks:acupuncture': 'Hémomancien',
  'irons_spellbooks:angel_wing': 'Paladin',
  'irons_spellbooks:arcane_shackle': 'Voyageur du Vide',
  'irons_spellbooks:arrow_volley': 'Évocateur',
  'irons_spellbooks:ascension': 'Électro-Sorcier',
  'irons_spellbooks:ball_lightning': 'Électro-Sorcier',
  'irons_spellbooks:black_hole': 'Voyageur du Vide / Astromancien',
  'irons_spellbooks:blaze_storm': 'Pyromancien',
  'irons_spellbooks:blessing_of_life': 'Paladin',
  'irons_spellbooks:blight': 'Druide',
  'irons_spellbooks:blizzard': 'Cryomancien',
  'irons_spellbooks:blood_needles': 'Hémomancien',
  'irons_spellbooks:blood_slash': 'Hémomancien',
  'irons_spellbooks:blood_step': 'Hémomancien',
  'irons_spellbooks:burning_dash': 'Pyromancien',
  'irons_spellbooks:chain_creeper': 'Évocateur',
  'irons_spellbooks:chain_lightning': 'Électro-Sorcier',
  'irons_spellbooks:charge': 'Électro-Sorcier',
  'irons_spellbooks:cleanse': 'Paladin',
  'irons_spellbooks:cloud_of_regeneration': 'Paladin',
  'irons_spellbooks:cone_of_cold': 'Cryomancien',
  'irons_spellbooks:counterspell': 'Voyageur du Vide',
  'irons_spellbooks:devour': 'Hémomancien',
  'irons_spellbooks:divine_smite': 'Paladin',
  'irons_spellbooks:dragon_breath': 'Voyageur du Vide',
  'irons_spellbooks:earthquake': 'Druide',
  'irons_spellbooks:echoing_strikes': 'Voyageur du Vide',
  'irons_spellbooks:eldritch_blast': 'toutes',
  'irons_spellbooks:electrocute': 'Électro-Sorcier',
  'irons_spellbooks:evasion': 'Voyageur du Vide',
  'irons_spellbooks:fang_strike': 'Évocateur',
  'irons_spellbooks:fang_swirl': 'Évocateur',
  'irons_spellbooks:fang_ward': 'Évocateur',
  'irons_spellbooks:fire_arrow': 'Pyromancien',
  'irons_spellbooks:fire_breath': 'Pyromancien',
  'irons_spellbooks:fireball': 'Pyromancien',
  'irons_spellbooks:firebolt': 'Pyromancien',
  'irons_spellbooks:firecracker': 'Évocateur',
  'irons_spellbooks:firefly_swarm': 'Druide',
  'irons_spellbooks:flaming_barrage': 'Pyromancien',
  'irons_spellbooks:flaming_strike': 'Pyromancien',
  'irons_spellbooks:fortify': 'Paladin',
  'irons_spellbooks:frost_step': 'Cryomancien',
  'irons_spellbooks:frostbite': 'Cryomancien',
  'irons_spellbooks:frostwave': 'Cryomancien',
  'irons_spellbooks:gluttony': 'Druide',
  'irons_spellbooks:gravity_fissure': 'Voyageur du Vide',
  'irons_spellbooks:greater_heal': 'Paladin',
  'irons_spellbooks:guiding_bolt': 'Paladin',
  'irons_spellbooks:gust': 'Aéromancien',
  'irons_spellbooks:haste': 'Paladin',
  'irons_spellbooks:heal': 'Paladin',
  'irons_spellbooks:healing_circle': 'Paladin',
  'irons_spellbooks:heartstop': 'Hémomancien',
  'irons_spellbooks:heat_surge': 'Pyromancien',
  'irons_spellbooks:ice_block': 'Cryomancien',
  'irons_spellbooks:ice_spikes': 'Cryomancien',
  'irons_spellbooks:ice_tomb': 'Cryomancien',
  'irons_spellbooks:icicle': 'Cryomancien',
  'irons_spellbooks:invisibility': 'Aéromancien',
  'irons_spellbooks:lightning_bolt': 'Électro-Sorcier',
  'irons_spellbooks:lightning_lance': 'Électro-Sorcier',
  'irons_spellbooks:lob_creeper': 'Évocateur',
  'irons_spellbooks:magic_arrow': 'Voyageur du Vide',
  'irons_spellbooks:magic_missile': 'Voyageur du Vide',
  'irons_spellbooks:magma_bomb': 'Pyromancien',
  'irons_spellbooks:oakskin': 'Druide',
  'irons_spellbooks:planar_sight': 'toutes',
  'irons_spellbooks:pocket_dimension': 'toutes',
  'irons_spellbooks:poison_arrow': 'Druide',
  'irons_spellbooks:poison_breath': 'Druide',
  'irons_spellbooks:poison_splash': 'Druide',
  'irons_spellbooks:portal': 'Voyageur du Vide',
  'irons_spellbooks:raise_dead': 'Hémomancien',
  'irons_spellbooks:raise_hell': 'Pyromancien',
  'irons_spellbooks:ray_of_frost': 'Cryomancien',
  'irons_spellbooks:ray_of_siphoning': 'Hémomancien',
  'irons_spellbooks:recall': 'toutes',
  'irons_spellbooks:root': 'Druide',
  'irons_spellbooks:sacrifice': 'Hémomancien',
  'irons_spellbooks:scapegoat': 'Évocateur',
  'irons_spellbooks:scorch': 'Pyromancien',
  'irons_spellbooks:sculk_tentacles': 'toutes',
  'irons_spellbooks:shadow_slash': 'Voyageur du Vide',
  'irons_spellbooks:shield': 'Évocateur',
  'irons_spellbooks:shockwave': 'Électro-Sorcier',
  'irons_spellbooks:slow': 'Évocateur',
  'irons_spellbooks:snowball': 'Cryomancien',
  'irons_spellbooks:sonic_boom': 'toutes',
  'irons_spellbooks:spectral_hammer': 'Évocateur',
  'irons_spellbooks:spider_aspect': 'Druide',
  'irons_spellbooks:starfall': 'Voyageur du Vide / Astromancien',
  'irons_spellbooks:stomp': 'Druide',
  'irons_spellbooks:summon_ender_chest': 'Voyageur du Vide',
  'irons_spellbooks:summon_horse': 'Évocateur',
  'irons_spellbooks:summon_polar_bear': 'Cryomancien',
  'irons_spellbooks:summon_swords': 'Voyageur du Vide',
  'irons_spellbooks:summon_vex': 'Évocateur',
  'irons_spellbooks:sunbeam': 'Paladin',
  'irons_spellbooks:telekinesis': 'toutes',
  'irons_spellbooks:teleport': 'Voyageur du Vide',
  'irons_spellbooks:throw': 'Aéromancien',
  'irons_spellbooks:thunderstorm': 'Électro-Sorcier',
  'irons_spellbooks:touch_dig': 'Druide',
  'irons_spellbooks:volt_strike': 'Électro-Sorcier',
  'irons_spellbooks:wall_of_fire': 'Pyromancien',
  'irons_spellbooks:wisp': 'Paladin',
  'irons_spellbooks:wither_skull': 'Hémomancien',
  'irons_spellbooks:wololo': 'Évocateur',
  'iss_magicfromtheeast:anchoring_kunai': 'Spiritualiste',
  'iss_magicfromtheeast:ashigaru_squad': 'Spiritualiste',
  'iss_magicfromtheeast:bagua_array_circle': 'Symétriste',
  'iss_magicfromtheeast:bone_hands': 'Spiritualiste',
  'iss_magicfromtheeast:calamity_cut': 'Spiritualiste',
  'iss_magicfromtheeast:cloud_ride': 'Symétriste / Aéromancien',
  'iss_magicfromtheeast:dragon_glide': 'Symétriste',
  'iss_magicfromtheeast:drapes_of_reflection': 'Symétriste',
  'iss_magicfromtheeast:jade_bullet': 'Symétriste',
  'iss_magicfromtheeast:jade_judgement': 'Symétriste',
  'iss_magicfromtheeast:jiangshi_invoke': 'Symétriste',
  'iss_magicfromtheeast:kitsune_pack': 'Spiritualiste',
  'iss_magicfromtheeast:nephrite_slash': 'Symétriste',
  'iss_magicfromtheeast:phantom_charge': 'Spiritualiste',
  'iss_magicfromtheeast:punishing_heaven': 'Symétriste',
  'iss_magicfromtheeast:revenant_of_honor': 'Spiritualiste',
  'iss_magicfromtheeast:soul_burst': 'Spiritualiste',
  'iss_magicfromtheeast:soul_catalyst': 'Spiritualiste',
  'iss_magicfromtheeast:spirit_challenging': 'Spiritualiste',
  'iss_magicfromtheeast:splitting_shuriken': 'Spiritualiste',
  'iss_magicfromtheeast:sword_dance': 'Symétriste',
  'iss_magicfromtheeast:underworld_aid': 'Symétriste',
  'monsterspellbooks:ancient_flash': 'Électro-Sorcier',
  'monsterspellbooks:anticoagulation': 'Hémomancien',
  'monsterspellbooks:banshee_scream': 'Nécromancien',
  'monsterspellbooks:blast_fungus': 'Druide',
  'monsterspellbooks:blizzard_aspect': 'Cryomancien',
  'monsterspellbooks:blood_pierce': 'Hémomancien',
  'monsterspellbooks:blood_thorn': 'Hémomancien',
  'monsterspellbooks:bone_dagger': 'Nécromancien',
  'monsterspellbooks:brimstone_buzzsaw': 'Pyromancien',
  'monsterspellbooks:brimstone_rain': 'Pyromancien',
  'monsterspellbooks:brimstone_wrath': 'Pyromancien',
  'monsterspellbooks:bubble_spray': 'Hydromancien',
  'monsterspellbooks:cauterizing_touch': 'Pyromancien',
  'monsterspellbooks:corrupted_beacon_ray': 'Voyageur du Vide',
  'monsterspellbooks:crush': 'Voyageur du Vide',
  'monsterspellbooks:crushing_presence': 'Voyageur du Vide',
  'monsterspellbooks:discharge': 'Électro-Sorcier',
  'monsterspellbooks:divine_intervention': 'Paladin',
  'monsterspellbooks:dragon_charge': 'Voyageur du Vide',
  'monsterspellbooks:effervescence_bubble': 'Hydromancien',
  'monsterspellbooks:enchanters_boost': 'Évocateur',
  'monsterspellbooks:enchanters_protection': 'Évocateur',
  'monsterspellbooks:endersent_form': 'Voyageur du Vide',
  'monsterspellbooks:endersent_smash': 'Voyageur du Vide',
  'monsterspellbooks:fall_curse': 'Nécromancien',
  'monsterspellbooks:firmament_splitter': 'Voyageur du Vide',
  'monsterspellbooks:frenzied_burst': 'Pyromancien',
  'monsterspellbooks:frenzied_storm': 'Pyromancien',
  'monsterspellbooks:frenzy_surge': 'Pyromancien',
  'monsterspellbooks:frost_breath': 'Cryomancien',
  'monsterspellbooks:frost_coating': 'Cryomancien',
  'monsterspellbooks:frosted_snowbolt': 'Cryomancien',
  'monsterspellbooks:glow_ink_release': 'Hydromancien',
  'monsterspellbooks:graveyard_fissure': 'Nécromancien',
  'monsterspellbooks:gravity_well': 'Voyageur du Vide',
  'monsterspellbooks:guardians_neutralizer': 'Électro-Sorcier',
  'monsterspellbooks:hallow_slash': 'Paladin',
  'monsterspellbooks:hysteria': 'Hémomancien',
  'monsterspellbooks:ice_arsenal': 'Cryomancien',
  'monsterspellbooks:infection_slash': 'Druide',
  'monsterspellbooks:ink_bomb': 'Hydromancien',
  'monsterspellbooks:leaf_crystal': 'Druide',
  'monsterspellbooks:lichdom': 'Nécromancien',
  'monsterspellbooks:life_drain': 'Nécromancien',
  'monsterspellbooks:napalm_orb': 'Pyromancien',
  'monsterspellbooks:orbital_snowball': 'Cryomancien',
  'monsterspellbooks:overheat': 'Pyromancien',
  'monsterspellbooks:paladin_throw': 'Paladin',
  'monsterspellbooks:poison_quill': 'Druide',
  'monsterspellbooks:putrescence_mass': 'Nécromancien',
  'monsterspellbooks:raigo': 'Électro-Sorcier',
  'monsterspellbooks:raijin_judgement': 'Électro-Sorcier',
  'monsterspellbooks:rancorcall': 'Nécromancien',
  'monsterspellbooks:razor_typhoon': 'Hydromancien',
  'monsterspellbooks:reaper_aspect': 'Nécromancien',
  'monsterspellbooks:redstone_bolt': 'Électro-Sorcier',
  'monsterspellbooks:redstone_chain': 'Électro-Sorcier',
  'monsterspellbooks:redstone_lasers': 'Électro-Sorcier',
  'monsterspellbooks:redstone_mines': 'Électro-Sorcier',
  'monsterspellbooks:riptide_dash': 'Hydromancien',
  'monsterspellbooks:sanguinite_evisceration': 'Hémomancien',
  'monsterspellbooks:soul_casting_field': 'Nécromancien',
  'monsterspellbooks:soul_chain': 'Nécromancien',
  'monsterspellbooks:soul_fire_teleport': 'Nécromancien',
  'monsterspellbooks:soul_firebolt': 'Nécromancien',
  'monsterspellbooks:soul_form': 'Nécromancien',
  'monsterspellbooks:soul_scorch': 'Nécromancien',
  'monsterspellbooks:space_breaker': 'Voyageur du Vide',
  'monsterspellbooks:space_rupture': 'Voyageur du Vide',
  'monsterspellbooks:spectral_blast': 'Nécromancien',
  'monsterspellbooks:spell_of_undying': 'Évocateur',
  'monsterspellbooks:spider_fangs': 'Druide',
  'monsterspellbooks:spinblade': 'Technomancien',
  'monsterspellbooks:spirit_strike': 'Nécromancien',
  'monsterspellbooks:static_cleave': 'Électro-Sorcier',
  'monsterspellbooks:stray_grasp': 'Nécromancien',
  'monsterspellbooks:summon_aegis_patrol': 'Paladin',
  'monsterspellbooks:summon_death_knight': 'Nécromancien',
  'monsterspellbooks:summon_dwarven_drones': 'Technomancien',
  'monsterspellbooks:summon_ice_hydra': 'Cryomancien',
  'monsterspellbooks:summon_poison_vines': 'Druide',
  'monsterspellbooks:summon_prismarine_squad': 'Hydromancien',
  'monsterspellbooks:summon_soul_wizard': 'Nécromancien',
  'monsterspellbooks:summon_wither_warrior': 'Nécromancien',
  'monsterspellbooks:thunder_step': 'Électro-Sorcier',
  'monsterspellbooks:thunderstorm_wave': 'Électro-Sorcier',
  'monsterspellbooks:torment_arrow': 'Nécromancien',
  'monsterspellbooks:tundra_terrain': 'Cryomancien',
  'monsterspellbooks:unstable_teleport': 'Voyageur du Vide',
  'monsterspellbooks:vile_slash': 'Nécromancien',
  'monsterspellbooks:vital_blast': 'Druide',
  'monsterspellbooks:void_arrows': 'Voyageur du Vide',
  'monsterspellbooks:voltaic_multishot': 'Électro-Sorcier',
  'monsterspellbooks:water_trident': 'Hydromancien',
  'monsterspellbooks:wither_bomb': 'Nécromancien',
  'monsterspellbooks:wither_nova': 'Nécromancien',
  'monsterspellbooks:wrath': 'Pyromancien',
  'monsterspellbooks:zap': 'Électro-Sorcier',
  'somakespells:abyssal_burn': 'Pyromancien',
  'somakespells:abyssal_orbs': 'Voyageur du Vide',
  'somakespells:apocalyptic_burst': 'Pyromancien',
  'somakespells:axe_cleave': 'Symétriste',
  'somakespells:blessed_connection': 'Paladin',
  'somakespells:blessing': 'Paladin',
  'somakespells:blood_cut': 'Hémomancien',
  'somakespells:blood_rush': 'Hémomancien',
  'somakespells:bloodbound_blade': 'Hémomancien',
  'somakespells:bloodmark': 'Hémomancien',
  'somakespells:bloody_legacy': 'Hémomancien',
  'somakespells:chain_connection': 'Envoûteur',
  'somakespells:combustion': 'Pyromancien',
  'somakespells:crimson_reflection': 'Spiritualiste',
  'somakespells:cursed_connection': 'Hémomancien',
  'somakespells:custodia_caeli': 'Paladin',
  'somakespells:damned_demomans': 'Pyromancien',
  'somakespells:desert_wrath': 'Symétriste',
  'somakespells:earthbound': 'Géomancien',
  'somakespells:eldritch_gambit': 'toutes',
  'somakespells:ender_corruption': 'Voyageur du Vide',
  'somakespells:eruption': 'Pyromancien',
  'somakespells:evocation_fortitude': 'Évocateur',
  'somakespells:fire_blast': 'Pyromancien',
  'somakespells:fire_orbs': 'Pyromancien',
  'somakespells:firestorm_vortex': 'Pyromancien',
  'somakespells:fragmented_requiem': 'Hémomancien',
  'somakespells:funeral_bloom': 'Hémomancien',
  'somakespells:grave_sigil': 'Spiritualiste',
  'somakespells:guardian_connection': 'Paladin',
  'somakespells:halberd_strike': 'Symétriste',
  'somakespells:hydro_slash': 'Hydromancien',
  'somakespells:ignis_shield': 'Pyromancien',
  'somakespells:incinerator_slash': 'Pyromancien',
  'somakespells:lightning_ball': 'Électro-Sorcier',
  'somakespells:lightning_cut': 'Électro-Sorcier',
  'somakespells:lightning_dance': 'Électro-Sorcier',
  'somakespells:lightning_field': 'Électro-Sorcier',
  'somakespells:lightning_lash': 'Électro-Sorcier',
  'somakespells:lightning_spark': 'Électro-Sorcier',
  'somakespells:lightning_spear': 'Électro-Sorcier',
  'somakespells:lightning_strike': 'Électro-Sorcier',
  'somakespells:lightning_swarm': 'Électro-Sorcier',
  'somakespells:mirror_strike': 'Symétriste',
  'somakespells:overgrowth': 'Druide',
  'somakespells:permafrost': 'Cryomancien',
  'somakespells:phantom_barrage': 'Symétriste',
  'somakespells:procession_of_souls': 'Spiritualiste',
  'somakespells:pumpkin_bomb': 'Pyromancien',
  'somakespells:render_rush': 'Symétriste',
  'somakespells:ritual_flame': 'Pyromancien',
  'somakespells:rose_secret': 'Hémomancien',
  'somakespells:sacred_phoenix_blessing': 'Paladin',
  'somakespells:sea_serpent': 'Hydromancien',
  'somakespells:sea_serpent_jet': 'Hydromancien',
  'somakespells:soul_bastion': 'Spiritualiste',
  'somakespells:soul_grab': 'Symétriste',
  'somakespells:soul_latch': 'Spiritualiste',
  'somakespells:soul_reprisal': 'Spiritualiste',
  'somakespells:soulfall_judgment': 'Spiritualiste',
  'somakespells:sovereign_armory': 'Paladin',
  'somakespells:spectral_rondo': 'Spiritualiste',
  'somakespells:spiral_of_ruin': 'Spiritualiste',
  'somakespells:spirit_empowerment': 'Spiritualiste',
  'somakespells:storm_aura': 'Hydromancien',
  'somakespells:submerge': 'Hydromancien',
  'somakespells:summon_drowned': 'Hydromancien',
  'somakespells:symmetry_empowerment': 'Symétriste',
  'somakespells:thunder_cloud': 'Hydromancien / Aéromancien',
  'somakespells:tidal_dash': 'Hydromancien',
  'somakespells:tidal_grasp': 'Hydromancien',
  'somakespells:tsunami': 'Hydromancien',
  'somakespells:water_ball': 'Hydromancien',
  'somakespells:water_control': 'Hydromancien',
  'somakespells:water_spear': 'Hydromancien',
  'somakespells:winged_ruin': 'Spiritualiste',
  'somakespells:withered_rose_vortex': 'Hémomancien',
  'wind_spellbooks:aeropic': 'Aéromancien',
  'wind_spellbooks:almighty_push': 'Aéromancien',
  'wind_spellbooks:iron_slash': 'Aéromancien',
  'wind_spellbooks:tailwind': 'Aéromancien',
  'wind_spellbooks:tornado': 'Aéromancien',
  'wind_spellbooks:wind_blade': 'Aéromancien',
  'wind_spellbooks:wind_jump': 'Aéromancien',
  'woodwalkers_spellbooks:shapeshifting': 'toutes',
  'crystal_chronicles:prismatic_portal': 'toutes'
}


// ── Classe réelle d'un sort, calculée d'après son école dans le jeu ──
// (la table ci-dessus ne sert que de secours et pour les sorts à règle spéciale)
var SORTS_SPECIAUX = ["irons_spellbooks:recall", "irons_spellbooks:black_hole", "irons_spellbooks:starfall", "irons_spellbooks:wither_skull", "apprenticecodex:archer_multiple", "apprenticecodex:artisan_smash", "apprenticecodex:auto_magnet", "apprenticecodex:auto_turret", "apprenticecodex:bound_bow", "apprenticecodex:bound_sword", "apprenticecodex:breaching_enemy", "apprenticecodex:bullet_stream", "apprenticecodex:call_broom", "apprenticecodex:commence_fire", "apprenticecodex:companion_trunk", "apprenticecodex:dual_acrobat", "apprenticecodex:earth_forge", "apprenticecodex:field_overseer", "apprenticecodex:fly_swatter", "apprenticecodex:fujin", "apprenticecodex:graced_rain", "apprenticecodex:lethal_assault", "apprenticecodex:linear_build", "apprenticecodex:long_stride", "apprenticecodex:mage_light", "apprenticecodex:magic_spear", "apprenticecodex:mana_mending", "apprenticecodex:manifestation_grimoire", "apprenticecodex:mantis_leap", "apprenticecodex:mirage_avoidance", "apprenticecodex:personal_shelf", "apprenticecodex:precision_jack", "apprenticecodex:quick_arms", "apprenticecodex:remote_eye", "apprenticecodex:servant_gaze", "apprenticecodex:shiden", "apprenticecodex:silent_assassin", "apprenticecodex:sky_edge", "apprenticecodex:slash_blade", "apprenticecodex:tamers_pocket", "apprenticecodex:terra_resonance", "apprenticecodex:thermal_process", "apprenticecodex:thermal_slice", "apprenticecodex:tiro_volley", "cataclysm_spellbooks:abyssal_blast", "cataclysm_spellbooks:abyssal_predator", "cataclysm_spellbooks:abyssal_slash", "cataclysm_spellbooks:bone_storm", "cataclysm_spellbooks:conjure_ignited_reinforcement", "cataclysm_spellbooks:conjure_koboldiator", "cataclysm_spellbooks:conjure_thralls", "cataclysm_spellbooks:cursed_rush", "cataclysm_spellbooks:depth_charge", "cataclysm_spellbooks:dimensional_rift", "cataclysm_spellbooks:forgone_rage", "cataclysm_spellbooks:malevolent_battlefield", "cataclysm_spellbooks:monolith_crash", "cataclysm_spellbooks:pharaohs_wrath", "cataclysm_spellbooks:piercing_bone", "cataclysm_spellbooks:summon_koboleton", "cataclysm_spellbooks:thoths_witness", "cataclysm_spellbooks:tidal_grab", "cataclysm_spellbooks:void_beam", "chronomancy:the_world_stop", "crystal_chronicles:prismatic_portal", "farmers_spell:bad_apple", "farmers_spell:chaos_slash", "farmers_spell:goodberry", "farmers_spell:pan", "farmers_spell:phantom_loot", "farmers_spell:preserve_circle", "farmers_spell:seal_coat", "hazennstuff:arcane_cards", "hazennstuff:bone_bolt", "hazennstuff:cosmic_bolt", "hazennstuff:counterspell_spider_lily", "hazennstuff:evercomet_barrage", "hazennstuff:golden_shower", "hazennstuff:moonkissed", "hazennstuff:nights_edge_strike", "hazennstuff:parry", "hazennstuff:prismatic_shift", "hazennstuff:shadow_reaver", "hazennstuff:shooting_star", "hazennstuff:soul_seekers", "hazennstuff:spectral_axe", "hazennstuff:syringe_barrage", "hazennstuff:thorn_chakram", "hazennstuff:umbrashift_barrage", "hazennstuff:violent_regurgitation", "somakespells:chain_connection", "woodwalkers_spellbooks:shapeshifting"]
var ECOLE_VERS_CLASSE = {
 "irons_spellbooks:fire": "Pyromancien",
 "irons_spellbooks:ice": "Cryomancien",
 "irons_spellbooks:lightning": "Électro-Sorcier",
 "irons_spellbooks:holy": "Paladin",
 "irons_spellbooks:blood": "Hémomancien",
 "irons_spellbooks:ender": "Voyageur du Vide",
 "irons_spellbooks:nature": "Druide",
 "irons_spellbooks:evocation": "Évocateur",
 "chronomancy:chronomancy": "Chronomancien",
 "gtbcs_geomancy_plus:geo": "Géomancien",
 "cataclysm_spellbooks:sand": "Aéromancien / Géomancien",
 "wind_spellbooks:wind": "Aéromancien",
 "colormagic:color_magic": "Chromancien",
 "aces_spell_utils:hydro": "Hydromancien",
 "somakespells:aqua": "Hydromancien",
 "cataclysm_spellbooks:abyssal": "Hydromancien",
 "monsterspellbooks:necro": "Nécromancien",
 "cursed_school:cursed": "Réprouvé",
 "cursespells:curse": "Envoûteur",
 "esoteric_spell:esoteric": "Ésotériste",
 "asterismarcanum:astral": "Astromancien",
 "tempest_almanac:astral": "Astromancien",
 "iss_magicfromtheeast:spirit": "Spiritualiste",
 "iss_magicfromtheeast:symmetry": "Symétriste",
 "aces_spell_utils:technomancy": "Technomancien",
 "cataclysm_spellbooks:technomancy": "Technomancien",
 "irons_spellbooks:eldritch": "toutes",
 "farmers_spell:gluttony": "Druide"
}
var SpellRegistryC = null
var ResLocC = null
var cacheClasse = {}
// ── Sorts partagés par le rééquilibrage : classes autorisées (prioritaire sur l'école) ──
var CLASSES_PARTAGEES = {
 'apprenticecodex:feather_rush': 'Évocateur / Aéromancien',
 'apprenticecodex:lunar_aim': 'Cryomancien / Astromancien',
 'apprenticecodex:quick_blink': 'Voyageur du Vide / Chronomancien',
 'apprenticecodex:sense_evil': 'Paladin / Spiritualiste',
 'apprenticecodex:wizardlamp': 'Paladin / Chromancien',
 'cataclysm_spellbooks:amethyst_puncture': 'Druide / Géomancien',
 'cataclysm_spellbooks:conjure_amethyst_crab': 'Druide / Géomancien',
 'firesenderexpansion:arcane_slice': 'Voyageur du Vide / Symétriste',
 'firesenderexpansion:binary_stars': 'Voyageur du Vide / Astromancien',
 'firesenderexpansion:dimensional_adaptation': 'Voyageur du Vide / Chronomancien',
 'gametechbcs_spellbooks:astral_sense': 'Voyageur du Vide / Astromancien',
 'gametechbcs_spellbooks:displacement': 'Voyageur du Vide / Chronomancien',
 'gametechbcs_spellbooks:ensnare': 'Druide / Géomancien',
 'gametechbcs_spellbooks:meteor_storm': 'Pyromancien / Astromancien',
 'gtbcs_geomancy_plus:solar_beam': 'Paladin / Astromancien',
 'gtbcs_geomancy_plus:solar_storm': 'Paladin / Astromancien',
 'irons_spellbooks:charge': 'Électro-Sorcier / Aéromancien',
 'irons_spellbooks:cleanse': 'Paladin / Chromancien',
 'irons_spellbooks:counterspell': 'Voyageur du Vide / Chronomancien / Symétriste',
 'irons_spellbooks:earthquake': 'Druide / Géomancien',
 'irons_spellbooks:echoing_strikes': 'Voyageur du Vide / Symétriste',
 'irons_spellbooks:evasion': 'Voyageur du Vide / Chronomancien / Aéromancien',
 'irons_spellbooks:firecracker': 'Évocateur / Chromancien',
 'irons_spellbooks:firefly_swarm': 'Druide / Chromancien',
 'irons_spellbooks:haste': 'Paladin / Chronomancien',
 'irons_spellbooks:lightning_bolt': 'Électro-Sorcier / Aéromancien',
 'irons_spellbooks:oakskin': 'Druide / Géomancien',
 'irons_spellbooks:root': 'Druide / Géomancien',
 'irons_spellbooks:shadow_slash': 'Voyageur du Vide / Symétriste',
 'irons_spellbooks:shield': 'Évocateur / Chromancien',
 'irons_spellbooks:slow': 'Évocateur / Chronomancien',
 'irons_spellbooks:stomp': 'Druide / Géomancien',
 'irons_spellbooks:sunbeam': 'Paladin / Astromancien',
 'irons_spellbooks:teleport': 'Voyageur du Vide / Chronomancien',
 'irons_spellbooks:thunderstorm': 'Électro-Sorcier / Aéromancien',
 'irons_spellbooks:wololo': 'Évocateur / Chromancien',
 'monsterspellbooks:banshee_scream': 'Nécromancien / Spiritualiste',
 'monsterspellbooks:enchanters_boost': 'Évocateur / Chromancien',
 'monsterspellbooks:firmament_splitter': 'Voyageur du Vide / Astromancien',
 'monsterspellbooks:soul_casting_field': 'Nécromancien / Spiritualiste',
 'monsterspellbooks:soul_chain': 'Nécromancien / Spiritualiste',
 'monsterspellbooks:soul_form': 'Nécromancien / Spiritualiste',
 'monsterspellbooks:soul_scorch': 'Nécromancien / Spiritualiste',
 'monsterspellbooks:spectral_blast': 'Nécromancien / Spiritualiste',
 'monsterspellbooks:spirit_strike': 'Nécromancien / Spiritualiste',
 'somakespells:comforting_lullaby': 'Évocateur / Chromancien',
 'somakespells:jingle_bell': 'Évocateur / Chromancien',
 'somakespells:resonant_pulse': 'Évocateur / Chromancien',
 'somakespells:slumber_melody': 'Évocateur / Chromancien'
}
function classeDuSort(id) {
  if (CLASSES_PARTAGEES[id]) return CLASSES_PARTAGEES[id]
  if (SORTS_SPECIAUX.indexOf(id) !== -1) return CLASSE_DES_SORTS[id]
  if (cacheClasse[id] !== undefined) return cacheClasse[id]
  var res = CLASSE_DES_SORTS[id]
  try {
    if (!SpellRegistryC) {
      SpellRegistryC = Java.loadClass('io.redspace.ironsspellbooks.api.registry.SpellRegistry')
      ResLocC = Java.loadClass('net.minecraft.resources.ResourceLocation')
    }
    var sort = SpellRegistryC.getSpell(ResLocC.tryParse(id))
    if (sort) {
      var ecole = String(sort.getSchoolType().getId())
      var c = (ecole === 'irons_spellbooks:evocation') ? null : ECOLE_VERS_CLASSE[ecole]
      if (c) res = c
    }
  } catch (e) {}
  cacheClasse[id] = res
  return res
}

var SORTS_ACTIF = true
var SORTS_ERREUR_LOGUEE = false

function classesDeLObjet(stack) {
  var res = []
  var conteneur = ISpellContainer.get(stack)
  if (conteneur === null || conteneur === undefined) return res
  var liste = conteneur.getActiveSpells()
  for (var i = 0; i < liste.size(); i++) {
    var id = String(liste.get(i).getSpell().getSpellId())
    var c = classeDuSort(id)
    if (c && res.indexOf(c) === -1) res.push(c)
  }
  return res
}

function retirerDoublons(liste) {
  var vu = false
  for (var i = 0; i < liste.size(); i++) {
    var s = ''
    try { s = String(liste.get(i).getString()) } catch (e) { s = '' }
    if (s.indexOf('Classe : ') === 0 || s.indexOf('Class: ') === 0) {
      if (vu) { liste.remove(i); i-- } else { vu = true }
    }
  }
}

// Le parchemin affiche l'école d'origine du sort (ex. « Pyromancien » pour Tempête d'Os, un sort de Cataclysm
// rattaché à la Nécromancie par nos règles) : on remplace ce nom par celui de la classe réelle du sort.
function corrigerEcoleAffichee(liste, stack) {
  try {
    var conteneur = ISpellContainer.get(stack)
    if (conteneur === null || conteneur === undefined) return
    var sorts = conteneur.getActiveSpells()
    if (!SpellRegistryC) {
      SpellRegistryC = Java.loadClass('io.redspace.ironsspellbooks.api.registry.SpellRegistry')
      ResLocC = Java.loadClass('net.minecraft.resources.ResourceLocation')
    }
    var Composant = Java.loadClass('net.minecraft.network.chat.Component')
    for (var k = 0; k < sorts.size(); k++) {
      var id = String(sorts.get(k).getSpell().getSpellId())
      var vraie = classeDuSort(id)
      if (!vraie || vraie === 'toutes') continue
      var sort = SpellRegistryC.getSpell(ResLocC.tryParse(id))
      if (!sort) continue
      var natif = ECOLE_VERS_CLASSE[String(sort.getSchoolType().getId())]
      if (!natif || natif === vraie) continue
      for (var i = 0; i < liste.size(); i++) {
        var ligne = liste.get(i)
        var txt = ''
        try { txt = String(ligne.getString()).trim() } catch (e0) { continue }
        if (txt === natif) {
          liste.set(i, Composant.literal(vraie).setStyle(ligne.getStyle()))
          break
        }
      }
    }
  } catch (e) {}
}

// Grimoires non encore vidés (dans un coffre, JEI, le sol...) : leurs sorts d'origine seront retirés dès qu'un joueur
// les prend ; l'infobulle ne les affiche donc pas. Un grimoire déjà traité (marque « mcrp_grimoire_vide ») montre
// normalement les sorts que le joueur y a inscrits.
// Iron's écrit : « N Emplacements », une ligne vide, « Appuyer sur [touche] », une ligne vide, un titre, puis un sort par ligne.
var GrimoireC = null, CustomDataC = null, ComposantsC = null
try {
  GrimoireC = Java.loadClass('io.redspace.ironsspellbooks.item.SpellBook')
  CustomDataC = Java.loadClass('net.minecraft.world.item.component.CustomData')
  ComposantsC = Java.loadClass('net.minecraft.core.component.DataComponents')
} catch (e) {}

function grimoireMarque(stack) {
  try {
    var cd = stack.get(ComposantsC.CUSTOM_DATA)
    return !!cd && cd.copyTag().getBoolean('mcrp_grimoire_vide')
  } catch (e) { return false }
}

function masquerSortsDuGrimoire(liste, stack) {
  try {
    if (!GrimoireC || !GrimoireC.class.isInstance(stack.getItem())) return
    if (grimoireMarque(stack)) return
    var c = ISpellContainer.get(stack)
    if (c === null || c === undefined) return
    var actifs = c.getActiveSpells()
    if (actifs.size() === 0) return
    var I18n = Java.loadClass('net.minecraft.client.resources.language.I18n')
    var modele = String(I18n.get('tooltip.irons_spellbooks.spellbook_spell_count'))
    var fin = modele.indexOf('%s') >= 0 ? modele.substring(modele.indexOf('%s') + 2) : modele
    var debut = -1
    for (var i = 0; i < liste.size(); i++) {
      var t = ''
      try { t = String(liste.get(i).getString()) } catch (e0) { continue }
      if (t.length > 0 && t.slice(-fin.length) === fin) { debut = i; break }
    }
    if (debut < 0) return
    // Fin du bloc : la ligne vide qui précède « Équipé comme Grimoire » (ou la fin de la liste d'infobulle).
    var noms = []
    for (var k = 0; k < actifs.size(); k++) {
      var id = String(actifs.get(k).getSpell().getSpellId())
      var p = id.indexOf(':')
      noms.push(String(I18n.get('spell.' + id.substring(0, p) + '.' + id.substring(p + 1))))
    }
    var dernier = -1
    for (var j = debut + 1; j < liste.size(); j++) {
      var tj = ''
      try { tj = String(liste.get(j).getString()) } catch (e1) { continue }
      for (var n = 0; n < noms.length; n++) if (tj.indexOf(noms[n]) >= 0) { dernier = j; break }
    }
    if (dernier < 0) return
    for (var r = dernier; r > debut; r--) liste.remove(r)
  } catch (e) {}
}

function infobulleSorts(event) {
  if (!SORTS_ACTIF) return
  try {
    retirerDoublons(event.getToolTip())
    var st = event.getItemStack()
    var idObjet = ''
    try {
      idObjet = String(st.getItemHolder().getRegisteredName())
    } catch (e1) {
      idObjet = String(st.getItem().builtInRegistryHolder().key().location())
    }
    masquerSortsDuGrimoire(event.getToolTip(), st)
    if (!/scroll/.test(idObjet)) return
    for (var r = 0; r < RESTRICTIONS.length; r++) {
      if (RESTRICTIONS[r].regle.test(idObjet)) return
    }
    corrigerEcoleAffichee(event.getToolTip(), st)
    var cl = classesDeLObjet(st)
    if (cl.length > 0) event.getToolTip().add(Text.gold(langueAnglaise() ? traduireEN('Classe : ' + cl.join(' / ')) : 'Classe : ' + cl.join(' / ')))
    retirerDoublons(event.getToolTip())
  } catch (e) {
    if (!SORTS_ERREUR_LOGUEE) {
      SORTS_ERREUR_LOGUEE = true
      console.error('[classes_tooltips] Lecture des sorts impossible, désactivée : ' + e)
    }
    SORTS_ACTIF = false
  }
}

var ISpellContainer = null
try {
  ISpellContainer = Java.loadClass('io.redspace.ironsspellbooks.api.spells.ISpellContainer')
  NativeEvents.onEvent(Java.loadClass('net.neoforged.neoforge.event.entity.player.ItemTooltipEvent'), infobulleSorts)
  console.info('[classes_tooltips] Infobulles des sorts actives.')
} catch (e) {
  console.error('[classes_tooltips] Infobulles des sorts indisponibles : ' + e)
}
