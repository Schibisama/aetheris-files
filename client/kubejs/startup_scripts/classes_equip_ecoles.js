// Bonus d'école des équipements alignés sur la classe de l'objet.
// À placer dans : kubejs/startup_scripts/classes_equip_ecoles.js (redémarrage COMPLET du jeu / du serveur).
//
// Pour chaque objet rangé dans UNE classe (règles RESTRICTIONS de classes_rp.js, copiées ci-dessous —
// si tu modifies les classes de classes_rp.js, recopie ces listes ici) :
//   - tout bonus de puissance / résistance d'une école qui n'est PAS celle de la classe est converti
//     en bonus de l'école de la classe (même montant, même emplacement), sauf si l'objet a déjà un
//     bonus de l'école de la classe de ce type (alors le bonus étranger est simplement retiré) ;
//   - les écoles « équivalentes » restent intactes (Aqua/Abyssal pour l'Hydromancien, Âme/Infernal pour le
//     Pyromancien, Nature pour Géomancien/Aéromancien, Technomancie d'Aces/Cataclysm...), ainsi que les
//     écoles libres (Indicible/Occulte/Prismatique) ;
//   - objets réservés à PLUSIEURS classes : seuls les bonus étrangers à toutes ces classes sont retirés ;
//   - objets libres ou grimoires : rien n'est touché.
// Le journal (logs/kubejs/startup.log) liste chaque objet modifié.

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
  { regle: /^hazennstuff:(hazel_helmet|how_did_you_find_the_hazel_chestplate|legionnaire_commander_boots|legionnaire_commander_chestplate|legionnaire_commander_helmet|legionnaire_commander_leggings|legionnaire_ruler_boots|legionnaire_ruler_chestplate|legionnaire_ruler_helmet|legionnaire_ruler_leggings|pyromancer_brute_chestplate|pyromancer_brute_helmet|soul_legionnaire_ruler_boots|soul_legionnaire_ruler_chestplate|soul_legionnaire_ruler_helmet|soul_legionnaire_ruler_leggings)$/, classes: [] },
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

var LIBRES = [
  'chronomancy:book_of_time_managment',
  'colormagic:rainbow_palette',
  'colormagic:amalgam_palette'
]

var EQ_EQUIV = {
  'Pyromancien': ['irons_spellbooks:fire', 'somakespells:soul_fire', 'somakespells:infernal_fire'],
  'Hydromancien': ['aces_spell_utils:hydro', 'somakespells:aqua', 'cataclysm_spellbooks:abyssal'],
  'Technomancien': ['aces_spell_utils:technomancy', 'cataclysm_spellbooks:technomancy'],
  'Géomancien': ['irons_spellbooks:nature'],
  'Aéromancien': ['irons_spellbooks:nature']
}
var EQ_LIBRES = ['irons_spellbooks:eldritch', 'aces_spell_utils:ritual', 'crystal_chronicles:prismatic']
var EQ_REGEX_GRIMOIRE = /(spell_?book|grimoire|_book$|^book_|tome|codex|palette|journal|necronomicon|bible)/
var EQ_SUFFIXES = ['_spell_power', '_magic_resist']

var EQ = {}
function eqInit() {
  var reg = Java.loadClass('net.minecraft.core.registries.BuiltInRegistries')
  EQ.itemReg = reg.ITEM
  EQ.attrReg = reg.ATTRIBUTE
  EQ.RL = Java.loadClass('net.minecraft.resources.ResourceLocation')
  EQ.Modif = Java.loadClass('net.minecraft.world.entity.ai.attributes.AttributeModifier')
  EQ.cacheObjets = {}
  EQ.cacheAttr = {}
  EQ.cacheEcole = {}
  EQ.nonResolus = {}
  EQ.journal = {}
  // Toutes les écoles : id d'attribut (sans suffixe) -> true
  EQ.attributsEcole = {}
  var it = EQ.attrReg.keySet().iterator()
  while (it.hasNext()) {
    var id = String(it.next())
    for (var s = 0; s < EQ_SUFFIXES.length; s++) {
      if (id.length > EQ_SUFFIXES[s].length && id.slice(-EQ_SUFFIXES[s].length) === EQ_SUFFIXES[s]) {
        var base = id.slice(0, id.length - EQ_SUFFIXES[s].length)
        if (base === 'irons_spellbooks:' || base.split(':')[1] === '') continue
        EQ.attributsEcole[base] = true
      }
    }
  }
  delete EQ.attributsEcole['irons_spellbooks:']
}

// "ns:ecole" (id d'école) -> base d'attribut ("ns:ecole" en général). null si introuvable.
function eqBaseEcole(ecole) {
  if (EQ.cacheEcole[ecole] !== undefined) return EQ.cacheEcole[ecole]
  var res = null
  if (EQ.attributsEcole[ecole]) res = ecole
  else {
    var ns = ecole.split(':')[0], chemin = ecole.split(':')[1]
    var essais = [ns + ':' + chemin.replace(/_/g, ''), ns + ':' + chemin.replace(/^color_magic$/, 'color')]
    for (var i = 0; i < essais.length && !res; i++) if (EQ.attributsEcole[essais[i]]) res = essais[i]
    if (!res) { // même mod, nom contenant celui de l'école (ou l'inverse)
      for (var base in EQ.attributsEcole) {
        if (base.split(':')[0] !== ns) continue
        var p = base.split(':')[1]
        if (p.indexOf(chemin) !== -1 || chemin.indexOf(p) !== -1) { res = base; break }
      }
    }
  }
  EQ.cacheEcole[ecole] = res
  if (!res) console.warn('[classes_equip_ecoles] attribut introuvable pour l\'école ' + ecole)
  return res
}

function eqClassesDe(id) {
  if (EQ.cacheObjets[id] !== undefined) return EQ.cacheObjets[id]
  var res = null
  if (LIBRES.indexOf(id) === -1 && !EQ_REGEX_GRIMOIRE.test(id.split(':').pop())) {
    for (var i = 0; i < RESTRICTIONS.length; i++) {
      if (RESTRICTIONS[i].regle.test(id)) { res = RESTRICTIONS[i].classes; break }
    }
  }
  if (res && res.length === 0) res = null // objets désactivés : rien à faire
  EQ.cacheObjets[id] = res
  return res
}

function eqClasseObj(nom) {
  if (nom === 'Prêtre') nom = 'Paladin'
  for (var i = 0; i < CLASSES.length; i++) if (CLASSES[i].nom === nom) return CLASSES[i]
  return null
}

// Bases d'attributs autorisées pour une classe + base cible (celle de son école principale).
function eqAutorisees(nomClasse) {
  var c = eqClasseObj(nomClasse)
  if (!c) return null
  var ecoles = [c.ecole].concat(c.sup || []).concat(EQ_EQUIV[nomClasse] || [])
  var bases = {}
  for (var i = 0; i < ecoles.length; i++) {
    var b = eqBaseEcole(ecoles[i])
    if (b) bases[b] = true
  }
  var cible = eqBaseEcole(c.ecole)
  if (!cible) return null
  return { bases: bases, cible: cible }
}

function eqSuffixe(nomAttr) {
  for (var s = 0; s < EQ_SUFFIXES.length; s++) {
    var suf = EQ_SUFFIXES[s]
    if (nomAttr.length > suf.length && nomAttr.slice(-suf.length) === suf) {
      return { base: nomAttr.slice(0, nomAttr.length - suf.length), suffixe: suf }
    }
  }
  return null
}

function eqHolder(id) {
  if (EQ.cacheAttr[id] !== undefined) return EQ.cacheAttr[id]
  var opt = EQ.attrReg.getHolder(EQ.RL.parse(id))
  EQ.cacheAttr[id] = opt.isPresent() ? opt.get() : null
  return EQ.cacheAttr[id]
}

function eqEstLibre(base) {
  for (var i = 0; i < EQ_LIBRES.length; i++) if (eqBaseEcole(EQ_LIBRES[i]) === base) return true
  return false
}

function eqTraiter(event) {
  var pile = event.getItemStack()
  var id = String(EQ.itemReg.getKey(pile.getItem()))
  var classes = eqClassesDe(id)
  if (!classes) return

  // Écoles autorisées = union de celles des classes de l'objet ; conversion seulement si UNE classe.
  var autorisees = {}
  var cible = null
  var parClasse = []
  for (var i = 0; i < classes.length; i++) {
    var a = eqAutorisees(classes[i])
    if (!a) return
    parClasse.push(a)
    for (var b in a.bases) autorisees[b] = true
    if (classes.length === 1) cible = a.cible
  }
  for (var e = 0; e < EQ_LIBRES.length; e++) {
    var bl = eqBaseEcole(EQ_LIBRES[e])
    if (bl) autorisees[bl] = true
  }

  // Passe 1 : lire l'existant
  var entrees = event.getModifiers()
  var possede = {}   // suffixe -> true si un bonus de l'école cible existe déjà
  var etrangers = [] // { suffixe, modif, slot }
  var sources = {}   // suffixe -> premier bonus d'école d'une classe de l'objet (modèle à recopier)
  var presents = {}  // base d'école -> { suffixe -> true }
  for (var k = 0; k < entrees.size(); k++) {
    var entree = entrees.get(k)
    var nom = String(entree.attribute().getRegisteredName())
    var s = eqSuffixe(nom)
    if (!s || !EQ.attributsEcole[s.base]) continue
    if (autorisees[s.base]) {
      if (s.base === cible) possede[s.suffixe] = true
      if (!presents[s.base]) presents[s.base] = {}
      presents[s.base][s.suffixe] = true
      if (!sources[s.suffixe] && !eqEstLibre(s.base)) sources[s.suffixe] = { modif: entree.modifier(), slot: entree.slot() }
      continue
    }
    etrangers.push({ suffixe: s.suffixe, modif: entree.modifier(), slot: entree.slot(), nom: nom })
    if (!sources[s.suffixe]) sources[s.suffixe] = { modif: entree.modifier(), slot: entree.slot() }
  }

  // Objets de PLUSIEURS classes : chaque classe doit avoir un bonus de son école (même montant que l'existant).
  var ajouts = []   // { cibleBase, suffixe, src }
  if (classes.length > 1) {
    for (var suf in sources) {
      for (var c = 0; c < classes.length; c++) {
        var ac = parClasse[c]
        var deja = false
        for (var bb in ac.bases) if (presents[bb] && presents[bb][suf]) deja = true
        if (deja) continue
        var dup = false
        for (var q = 0; q < ajouts.length; q++) if (ajouts[q].cibleBase === ac.cible && ajouts[q].suffixe === suf) dup = true
        if (dup) continue
        ajouts.push({ cibleBase: ac.cible, suffixe: suf, src: sources[suf], classe: classes[c] })
      }
    }
  }
  if (etrangers.length === 0 && ajouts.length === 0) return

  // Passe 2 : retirer les étrangers, convertir le premier de chaque type si possible
  if (etrangers.length > 0) {
    event.removeIf(function (entree) {
      var nom2 = String(entree.attribute().getRegisteredName())
      var s2 = eqSuffixe(nom2)
      return !!(s2 && EQ.attributsEcole[s2.base] && !autorisees[s2.base])
    })
  }
  var convertis = {}
  for (var j = 0; j < etrangers.length; j++) {
    var x = etrangers[j]
    var resume = x.nom
    if (cible && !possede[x.suffixe] && !convertis[x.suffixe]) {
      var h = eqHolder(cible + x.suffixe)
      if (h) {
        convertis[x.suffixe] = true
        var m = x.modif
        event.addModifier(h, new EQ.Modif(EQ.RL.parse('classes_rp:equip_' + id.replace(':', '_') + '_' + cible.split(':')[1] + x.suffixe), m.amount(), m.operation()), x.slot)
        resume += ' -> ' + cible + x.suffixe
      } else resume += ' (retiré)'
    } else resume += ' (retiré)'
    if (!EQ.journal[id + resume]) {
      EQ.journal[id + resume] = true
      console.info('[classes_equip_ecoles] ' + id + ' [' + classes.join('/') + '] : ' + resume)
    }
  }
  // Ajouts pour les classes sans bonus d'école
  for (var z = 0; z < ajouts.length; z++) {
    var ad = ajouts[z]
    var hz = eqHolder(ad.cibleBase + ad.suffixe)
    if (!hz) continue
    var ms = ad.src.modif
    event.addModifier(hz, new EQ.Modif(EQ.RL.parse('classes_rp:equip_' + id.replace(':', '_') + '_' + ad.cibleBase.split(':')[1] + ad.suffixe), ms.amount(), ms.operation()), ad.src.slot)
    var cle = id + '+' + ad.cibleBase + ad.suffixe
    if (!EQ.journal[cle]) {
      EQ.journal[cle] = true
      console.info('[classes_equip_ecoles] ' + id + ' [' + classes.join('/') + '] : + ' + ad.cibleBase + ad.suffixe + ' (' + ad.classe + ')')
    }
  }
}

try {
  eqInit()
  NativeEvents.onEvent(
    Java.loadClass('net.neoforged.neoforge.event.ItemAttributeModifierEvent'),
    // Priorité basse : après classes_effets.js
    function (event) {
      try { eqTraiter(event) } catch (err) {
        if (!EQ.erreurs) EQ.erreurs = 0
        if (EQ.erreurs++ < 5) console.error('[classes_equip_ecoles] ' + err)
      }
    }
  )
  console.info('[classes_equip_ecoles] Alignement des bonus d\'école sur les classes actif (' + Object.keys(EQ.attributsEcole).length + ' écoles détectées).')
} catch (e) {
  console.error('[classes_equip_ecoles] Impossible d\'activer : ' + e)
}
