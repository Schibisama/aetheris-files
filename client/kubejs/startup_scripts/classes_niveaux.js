// +5 niveaux max pour chaque sort (sauf les sorts qui n'ont qu'un seul niveau à la base).
// À placer dans : kubejs/startup_scripts/  (redémarrage COMPLET du jeu / du serveur nécessaire).
//
// - Le niveau max d'origine de chaque sort est lu dans sa config par défaut d'Iron's Spells,
//   puis augmenté de NIVEAUX_BONUS_SORTS. Les sorts de tous les addons sont concernés.
// - Les stats (puissance, coût en mana…) suivent la même progression par niveau que les niveaux d'origine :
//   Iron's les calcule par niveau, sans plafond.
// - La rareté d'un niveau est calculée par Iron's d'après le rapport niveau / niveau max
//   (répartition rarityConfig du serveur) : les nouveaux niveaux tombent surtout en Rare / Épique / Légendaire.
// - Les parchemins (forge à parchemins, fusion à l'enclume arcanique, butins, onglet créatif)
//   utilisent ce même calcul : ceux des nouveaux niveaux existent donc automatiquement.
var NIVEAUX_BONUS_SORTS = 5
var NIVEAUX_SORTS_EXCLUS = []          // ids de sorts à laisser tels quels, ex. 'irons_spellbooks:fireball'
var NIVEAUX_DEJA_VUS = {}
var NIVEAUX_COMPTE = 0
var NIVEAUX_ERREURS = 0


// ───────── Équilibrage des sorts (02/11) ─────────
// id du sort -> { p: multiplicateur de puissance (dégâts / soins / durée selon le sort), m: multiplicateur de mana, cd: recharge en secondes }
// Première passe : on relève les classes à peu de sorts offensifs (Chronomancien, Chromancien, Aéromancien) sans rien retirer aux autres.
var EQUILIBRAGE_SORTS = {
  // Chronomancien : gros coûts et recharges très longues, presque aucun sort offensif
  'chronomancy:the_world_stop':        { m: 0.6, cd: 120 },
  'chronomancy:borrowed_future':       { m: 0.6, cd: 90 },
  'chronomancy:chrono_double':         { m: 0.6, cd: 90 },
  'chronomancy:rift':                  { m: 0.75 },
  'chronomancy:time_walk':             { m: 0.7, cd: 8 },
  'chronomancy:backtrack':             { p: 1.25 },
  'chronomancy:sands_of_time':         { p: 1.25 },
  'chronomancy:time_piercing_needle':  { p: 1.5 },
  'apprenticecodex:quick_blink':       { m: 0.7 },
  'irons_spellbooks:evasion':          { m: 0.8, cd: 120 },
  'irons_spellbooks:slow':             { cd: 60 },
  'irons_spellbooks:haste':            { cd: 60 },
  // Aéromancien : sorts de base trop faibles ou trop chers
  'wind_spellbooks:tornado':           { p: 1.5, m: 0.75 },
  'wind_spellbooks:aeropic':           { p: 1.5, m: 0.8 },
  'wind_spellbooks:iron_slash':        { m: 0.75 },
  'wind_spellbooks:tailwind':          { m: 0.7 },
  'wind_spellbooks:wind_blade':        { p: 1.1 },
  'irons_spellbooks:throw':            { p: 1.5 },
  'irons_spellbooks:gust':             { p: 1.15 },
  'irons_spellbooks:invisibility':     { cd: 30 },
  'cataclysm_spellbooks:sandstorm':    { p: 1.3, m: 0.8 },
  'iss_magicfromtheeast:cloud_ride':   { cd: 60 },
  // Chromancien : sorts d'Évocation partagés un peu en retrait
  'irons_spellbooks:firecracker':      { p: 1.2 },
  'irons_spellbooks:cleanse':          { cd: 40 },
  'somakespells:jingle_bell':          { p: 1.2 },
  'somakespells:slumber_melody':       { m: 0.8 },
  'irons_spellbooks:firefly_swarm':    { p: 1.15 },
  // Technomancien : petits sorts d'Apprentice's Codex trop faibles pour leur coût (+) ; sorts trop forts à recharge courte (-)
  'apprenticecodex:quick_arms':        { p: 1.8, m: 0.7 },
  'apprenticecodex:fly_swatter':       { p: 1.6, m: 0.7 },
  'apprenticecodex:commence_fire':     { p: 1.8, m: 0.6 },
  'apprenticecodex:auto_turret':       { p: 1.5, m: 0.8 },
  'apprenticecodex:archer_multiple':   { p: 1.4, m: 0.7 },
  'apprenticecodex:sky_edge':          { p: 1.5, m: 0.8 },
  'apprenticecodex:silent_assassin':   { p: 1.5, m: 0.6 },
  'apprenticecodex:precision_jack':    { p: 1.6, m: 0.7 },
  'apprenticecodex:dual_acrobat':      { p: 1.3 },
  'apprenticecodex:bullet_stream':     { p: 1.3 },
  'apprenticecodex:tiro_volley':       { p: 1.3 },
  'apprenticecodex:slash_blade':       { p: 1.15 },
  'monsterspellbooks:spinblade':       { p: 1.2 },
  'apprenticecodex:shiden':            { p: 0.8 },
  'apprenticecodex:mantis_leap':       { p: 0.8 },
  'apprenticecodex:artisan_smash':     { p: 0.8 },
  'apprenticecodex:magic_spear':       { p: 0.75 },
  // Nécromancien : Drain de Vie (puissance de base 0 : dégâts quasi nuls)
  'monsterspellbooks:life_drain':      { p: 2.0 },
  // ── 02/11 soir : Symétriste, Spiritualiste, Astromancien, Hydromancien ramenés au niveau du Pyromancien ──
  // Repères Pyromancien (niveau max) : trait ~26, sorts moyens 30-45, gros sorts 55-90 ; les sorts épiques/légendaires frappent fort.
  // Symétriste (Magic From The East : symétrie, SoMake)
  'iss_magicfromtheeast:jade_bullet':        { p: 1.5 },
  'iss_magicfromtheeast:nephrite_slash':     { p: 1.6, m: 0.7 },
  'iss_magicfromtheeast:jade_judgement':     { p: 1.4 },
  'iss_magicfromtheeast:punishing_heaven':   { p: 2.0, m: 0.5, cd: 180 },
  'iss_magicfromtheeast:underworld_aid':     { p: 1.5, m: 0.5, cd: 120 },
  'iss_magicfromtheeast:sword_dance':        { p: 1.5, m: 0.7, cd: 60 },
  'iss_magicfromtheeast:jiangshi_invoke':    { p: 1.3, cd: 100 },
  'iss_magicfromtheeast:bagua_array_circle': { p: 1.4 },
  'somakespells:mirror_strike':              { p: 1.4 },
  'somakespells:halberd_strike':             { p: 1.4 },
  'somakespells:phantom_barrage':            { p: 1.4 },
  'somakespells:render_rush':                { p: 1.3 },
  'somakespells:desert_wrath':               { p: 2.5, m: 0.7 },
  // Spiritualiste (Magic From The East : esprit, SoMake, Cataclysm)
  'iss_magicfromtheeast:kitsune_pack':       { cd: 120 },
  'iss_magicfromtheeast:soul_catalyst':      { p: 1.5 },
  'iss_magicfromtheeast:anchoring_kunai':    { p: 1.5, cd: 45 },
  'iss_magicfromtheeast:bone_hands':         { p: 1.6, cd: 40 },
  'iss_magicfromtheeast:ashigaru_squad':     { cd: 120 },
  'iss_magicfromtheeast:phantom_charge':     { p: 1.4, cd: 40 },
  'iss_magicfromtheeast:splitting_shuriken': { p: 1.3 },
  'iss_magicfromtheeast:revenant_of_honor':  { p: 1.3, m: 0.7, cd: 150 },
  'iss_magicfromtheeast:soul_burst':         { p: 1.8 },
  'cataclysm_spellbooks:cursed_rush':        { p: 1.5 },
  'somakespells:grave_sigil':                { p: 1.4 },
  'somakespells:soul_latch':                 { p: 1.4 },
  'somakespells:procession_of_souls':        { p: 1.4 },
  'somakespells:soul_bastion':               { p: 1.3 },
  'somakespells:soulfall_judgment':          { p: 1.3 },
  'somakespells:winged_ruin':                { p: 1.8 },
  // Astromancien (Asterism Arcanum, Hazen)
  'asterismarcanum:starcutter':              { p: 1.6 },
  'asterismarcanum:astral_echo':             { p: 1.4 },
  'asterismarcanum:brightburst':             { p: 1.8 },
  'asterismarcanum:celestial_tether':        { p: 1.3, m: 0.7 },
  'asterismarcanum:silvery_barbs':           { p: 1.6 },
  'asterismarcanum:summon_lunar_moths':      { cd: 90 },
  'hazennstuff:cosmic_bolt':                 { p: 1.6 },
  // Hydromancien (SoMake, Monster Spellbooks)
  'somakespells:sea_serpent':                { p: 1.5 },
  'somakespells:tidal_grasp':                { p: 1.4 },
  'somakespells:water_ball':                 { p: 1.3 },
  'monsterspellbooks:summon_prismarine_squad': { cd: 120 }
}

// ───────── Retour d'équilibrage (05/11) ─────────
// Rapports mesurés en jeu : p = dégâts × (rapport), m = mana × (rapport), cd = recharge exacte en secondes. Se COMPOSE avec EQUILIBRAGE_SORTS ci-dessus.
// Temps d'incantation, durées, portée et dégâts de mêlée ne passent pas par la config d'Iron's : ils sont réglés dans les mods eux-mêmes (jars modifiés :
// irons_spellbooks, cursespells, somakespells, cataclysm_spellbooks, gametechbcs_spellbooks, apprentice_codex, chronomancy).
var EQUILIBRAGE_RETOUR = {
  'apprenticecodex:arcane_beam': { p: 1.6077 },
  'apprenticecodex:arcane_blast': { p: 1.5008 },
  'apprenticecodex:blood_brand': { p: 2.9532 },
  'apprenticecodex:combustion_jet': { p: 1.5289 },
  'apprenticecodex:field_overseer': { p: 0.5 },
  'apprenticecodex:fujin': { p: 2.8 },
  'apprenticecodex:higanbana': { p: 6.9644 },
  'apprenticecodex:inscribe_ice': { p: 2.286 },
  'apprenticecodex:lock_on_ray': { cd: 25 },
  'apprenticecodex:sacred_arrow': { cd: 10 },
  'apprenticecodex:shiden': { p: 0.67 },
  'apprenticecodex:silent_assassin': { p: 0.5 },
  'apprenticecodex:sky_edge': { p: 0.5 },
  'apprenticecodex:slash_blade': { p: 1.33 },
  'apprenticecodex:thermal_process': { p: 1.33 },
  'apprenticecodex:thermal_slice': { p: 1.33 },
  'apprenticecodex:tiro_volley': { p: 0.75 },
  'apprenticecodex:totem_of_permafrost': { p: 2.3333 },
  'asterismarcanum:brightburst': { p: 2 },
  'asterismarcanum:luminous_beam': { p: 1.33 },
  'asterismarcanum:piercing_light': { p: 2 },
  'asterismarcanum:star_swarm': { p: 2 },
  'asterismarcanum:starcutter': { p: 2 },
  'asterismarcanum:summon_lunar_moths': { p: 3 },
  'cataclysm_spellbooks:amethyst_puncture': { p: 46.6667 },
  'cataclysm_spellbooks:desert_winds': { p: 1.5202 },
  'cataclysm_spellbooks:hellish_blade': { p: 0.8893 },
  'cataclysm_spellbooks:infernal_strike': { p: 2.8903 },
  'cataclysm_spellbooks:monolith_crash': { p: 4.0118 },
  'cataclysm_spellbooks:phantasmal_blade': { p: 1.5 },
  'cataclysm_spellbooks:piercing_bone': { p: 11.3333 },
  'chronomancy:time_piercing_needle': { p: 0.75 },
  'colormagic:black_droplets': { p: 0.6667 },
  'colormagic:desaturation': { m: 0.4444 },
  'colormagic:paint_spray': { p: 2.6658 },
  'colormagic:spiraling_despair': { m: 0.375, cd: 20 },
  'cursed_school:apostate_crown': { p: 1.5 },
  'cursed_school:ash_guard': { p: 1.5 },
  'cursed_school:ash_needle': { p: 1.5 },
  'cursed_school:ash_pack': { p: 1.5 },
  'cursed_school:black_root': { p: 1.5 },
  'cursed_school:black_verse': { p: 1.5 },
  'cursed_school:blight_step': { p: 1.5 },
  'cursed_school:bone_toll': { p: 1.5 },
  'cursed_school:call_clerk': { p: 1.5 },
  'cursed_school:chain_of_remorse': { p: 1.5 },
  'cursed_school:choir_of_flies': { p: 1.5 },
  'cursed_school:crow_feast': { p: 1.5 },
  'cursed_school:debt_spike': { p: 1.5 },
  'cursed_school:decay_field': { p: 1.5 },
  'cursed_school:eclipse_maw': { p: 1.5 },
  'cursed_school:finished_margin': { p: 1.5 },
  'cursed_school:grave_dust': { p: 1.5 },
  'cursed_school:greedy_margin': { p: 1.5 },
  'cursed_school:hatch_cysts': { p: 1.5 },
  'cursed_school:hex_barrage': { p: 1.5 },
  'cursed_school:hollow_bite': { p: 1.5 },
  'cursed_school:invoice': { p: 1.5 },
  'cursed_school:issue_invoice': { p: 1.5 },
  'cursed_school:leech_thread': { p: 1.5 },
  'cursed_school:margin_pact': { p: 1.5 },
  'cursed_school:marrow_drain': { p: 1.5 },
  'cursed_school:night_ledger': { p: 1.5 },
  'cursed_school:pale_lantern': { p: 1.5 },
  'cursed_school:rot_bolt': { p: 1.5 },
  'cursed_school:rotting_rain': { p: 1.5 },
  'cursed_school:ruin_slash': { p: 1.5 },
  'cursed_school:severed_tithe': { p: 1.5 },
  'cursed_school:soot_shroud': { p: 1.5 },
  'cursed_school:stain_brand': { p: 1.5 },
  'cursed_school:testament_of_ash': { p: 1.5 },
  'cursed_school:thrice_signed_name': { p: 1.5 },
  'cursed_school:umbral_coffin': { p: 1.5 },
  'cursed_school:unsigned_judgment': { p: 1.5 },
  'cursed_school:wailing_dirge': { p: 1.5 },
  'cursed_school:withering_touch': { p: 1.5 },
  'cursespells:a_call_beyond': { p: 1.6677 },
  'cursespells:all_vanity': { p: 0.4444 },
  'cursespells:blade_of_judgment': { p: 0.6682, cd: 40 },
  'cursespells:cursed_arrow': { p: 1.6706, cd: 10 },
  'cursespells:cursed_breath': { p: 1.5352 },
  'cursespells:cursed_charge': { p: 0.8068 },
  'cursespells:cursed_crush': { p: 0.6788 },
  'cursespells:cursed_scar': { p: 1.3447 },
  'cursespells:dagger_of_obsession': { p: 0.6682 },
  'cursespells:droplet_of_stagnation': { p: 0.8353 },
  'cursespells:flame_of_stagnation': { p: 1.5619, cd: 5 },
  'cursespells:flames_of_fury': { p: 0.8353, m: 0.5556 },
  'cursespells:frenzy_plant': { p: 0.5035 },
  'cursespells:hell_fire': { p: 0.6682 },
  'cursespells:homing_soulmass': { p: 0.7412 },
  'cursespells:leaf_storm': { p: 2.6775 },
  'cursespells:pillar_of_sin': { p: 1.8678 },
  'cursespells:primal_seed': { p: 0.5538, cd: 25 },
  'cursespells:rage_awakened': { p: 0.1856 },
  'cursespells:ray_of_punishment': { p: 1.8884, cd: 10 },
  'cursespells:silent_waltz': { p: 1.5008 },
  'cursespells:soul_stream': { p: 1.5686 },
  'cursespells:stagnant_spiral': { p: 0.6788 },
  'cursespells:wandering_grudge': { cd: 35 },
  'farmers_spell:chaos_slash': { p: 1.8667 },
  'firesenderexpansion:binary_stars': { p: 1.7873 },
  'firesenderexpansion:dragons_fury': { p: 3.7633 },
  'firesenderexpansion:hollow_crystal': { p: 2.2257 },
  'gametechbcs_spellbooks:ashen_breath': { p: 4 },
  'gtbcs_geomancy_plus:chunker': { p: 1.6658 },
  'gtbcs_geomancy_plus:dripstone_bolt': { cd: 2 },
  'gtbcs_geomancy_plus:eroding_boulder': { p: 1.807 },
  'gtbcs_geomancy_plus:fissure': { p: 1.8076 },
  'gtbcs_geomancy_plus:petrivise': { p: 0.4712 },
  'gtbcs_geomancy_plus:tremor_spike': { p: 2.2895 },
  'hazennstuff:arcane_cards': { p: 1.4444 },
  'hazennstuff:cosmic_bolt': { p: 0.5 },
  'hazennstuff:counterspell_spider_lily': { p: 0.5348 },
  'hazennstuff:dazzling_obliteration': { p: 0.5435 },
  'hazennstuff:death_sentence': { p: 1.407 },
  'hazennstuff:endraconic_meteor': { p: 2.4519 },
  'hazennstuff:evercomet_barrage': { p: 0.5 },
  'hazennstuff:golden_shower': { p: 0.75 },
  'hazennstuff:hailstorm': { p: 2.3333 },
  'hazennstuff:horn_shell': { p: 4 },
  'hazennstuff:hydrobullet': { p: 0.5 },
  'hazennstuff:ionic_slash': { p: 2.4 },
  'hazennstuff:nights_edge_strike': { p: 1.5 },
  'hazennstuff:razorblade_typhoon': { p: 3 },
  'hazennstuff:scorching_slash': { p: 1.1395 },
  'hazennstuff:shard_sword': { p: 2.1333 },
  'hazennstuff:soul_flame_bolt': { p: 0.5874 },
  'hazennstuff:spectral_axe': { p: 1.6667 },
  'hazennstuff:syringe_barrage': { p: 0.9265 },
  'hazennstuff:umbrashift_barrage': { p: 1.5 },
  'hazennstuff:violent_regurgitation': { p: 2.4519 },
  'irons_spellbooks:acupuncture': { p: 1.5426 },
  'irons_spellbooks:arrow_volley': { p: 2 },
  'irons_spellbooks:blood_needles': { p: 1.6677 },
  'irons_spellbooks:devour': { p: 1.6677 },
  'irons_spellbooks:divine_smite': { cd: 22 },
  'irons_spellbooks:earthquake': { p: 2.0006 },
  'irons_spellbooks:electrocute': { p: 2.8252 },
  'irons_spellbooks:fire_arrow': { p: 0.744 },
  'irons_spellbooks:firebolt': { p: 2.7803 },
  'irons_spellbooks:firefly_swarm': { p: 2.3373 },
  'irons_spellbooks:flaming_barrage': { p: 3.335 },
  'irons_spellbooks:guiding_bolt': { p: 1.7804 },
  'irons_spellbooks:ice_block': { p: 0.7143 },
  'irons_spellbooks:icicle': { cd: 2 },
  'irons_spellbooks:magic_missile': { p: 0.779 },
  'irons_spellbooks:ray_of_siphoning': { p: 2.6729 },
  'irons_spellbooks:scorch': { p: 1.0005 },
  'irons_spellbooks:shadow_slash': { p: 2.0047 },
  'irons_spellbooks:throw': { p: 6.3636 },
  'irons_spellbooks:thunderstorm': { p: 0.7008 },
  'irons_spellbooks:wither_skull': { p: 2.6682 },
  'iss_magicfromtheeast:anchoring_kunai': { p: 3.1343 },
  'iss_magicfromtheeast:bone_hands': { p: 1.9444 },
  'iss_magicfromtheeast:calamity_cut': { p: 2.5 },
  'iss_magicfromtheeast:dragon_glide': { p: 3 },
  'iss_magicfromtheeast:jade_judgement': { p: 0.75 },
  'iss_magicfromtheeast:soul_burst': { p: 2.0755 },
  'iss_magicfromtheeast:splitting_shuriken': { p: 1.4286 },
  'monsterspellbooks:banshee_scream': { p: 2 },
  'monsterspellbooks:blood_thorn': { p: 2.0012 },
  'monsterspellbooks:brimstone_buzzsaw': { p: 1.334 },
  'monsterspellbooks:brimstone_wrath': { p: 1.1117 },
  'monsterspellbooks:bubble_spray': { p: 2 },
  'monsterspellbooks:discharge': { p: 0.8196 },
  'monsterspellbooks:divine_intervention': { p: 3.2247 },
  'monsterspellbooks:dragon_charge': { p: 3.5646 },
  'monsterspellbooks:firmament_splitter': { p: 1.6137 },
  'monsterspellbooks:frenzied_burst': { p: 0.8206 },
  'monsterspellbooks:frenzied_storm': { p: 0.4199 },
  'monsterspellbooks:graveyard_fissure': { p: 1.7778 },
  'monsterspellbooks:ice_arsenal': { p: 5 },
  'monsterspellbooks:poison_quill': { p: 0.6668 },
  'monsterspellbooks:putrescence_mass': { p: 2.1667 },
  'monsterspellbooks:rancorcall': { p: 8 },
  'monsterspellbooks:razor_typhoon': { p: 0.5 },
  'monsterspellbooks:redstone_lasers': { p: 2.4 },
  'monsterspellbooks:sanguinite_evisceration': { p: 2.3504 },
  'monsterspellbooks:soul_chain': { p: 3 },
  'monsterspellbooks:spectral_blast': { p: 0.6667 },
  'monsterspellbooks:spirit_strike': { p: 4.3243 },
  'monsterspellbooks:stray_grasp': { p: 7.3308 },
  'monsterspellbooks:torment_arrow': { p: 1.6667 },
  'monsterspellbooks:water_trident': { p: 0.5 },
  'monsterspellbooks:wither_bomb': { p: 2 },
  'monsterspellbooks:wither_nova': { p: 0.8296 },
  'monsterspellbooks:zap': { p: 4 },
  'somakespells:abyssal_orbs': { p: 2.0797 },
  'somakespells:bloodmark': { p: 4.3112 },
  'somakespells:eruption': { p: 1.3424 },
  'somakespells:fire_blast': { p: 1.6072 },
  'somakespells:firestorm_vortex': { p: 1.1118 },
  'somakespells:funeral_bloom': { p: 1.2789 },
  'somakespells:halberd_strike': { p: 0.5 },
  'somakespells:incinerator_slash': { p: 1.2029 },
  'somakespells:jingle_bell': { p: 0.4603 },
  'somakespells:lightning_ball': { p: 1.7617 },
  'somakespells:lightning_cut': { p: 2.4 },
  'somakespells:lightning_dance': { p: 1.2222 },
  'somakespells:lightning_field': { cd: 7 },
  'somakespells:lightning_swarm': { p: 2.0 },
  'somakespells:phantom_barrage': { p: 3 },
  'somakespells:resonant_pulse': { p: 0.5 },
  'somakespells:sea_serpent': { p: 0.67 },
  'somakespells:sea_serpent_jet': { p: 0.5 },
  'somakespells:soul_reprisal': { p: 1.6734 },
  'somakespells:soulfall_judgment': { p: 1.99 },
  'somakespells:spectral_rondo': { p: 1.8439 },
  'somakespells:spiral_of_ruin': { p: 2.3378 },
  'somakespells:tsunami': { p: 0.67 },
  'somakespells:withered_rose_vortex': { p: 1.7426 },
  'irons_spellbooks:starfall': { p: 1.33 },
  'tempest_almanac:starfall': { p: 1.33 },
  'tunes_n_tomes:grand_finale': { p: 1.71 },
  'tunes_n_tomes:sonata': { p: 1.3333 },
  'wind_spellbooks:aeropic': { p: 1.6071 },
  'wind_spellbooks:iron_slash': { p: 1.7778 }
}

var EQ_PARAMS = null
function equilibrageAppliquer(event, id) {
  var cfg = EQUILIBRAGE_SORTS[id]
  var ret = EQUILIBRAGE_RETOUR[id]
  if (!cfg && !ret) return
  var D = Java.loadClass('java.lang.Double')
  if (!EQ_PARAMS) {
    var P = Java.loadClass('io.redspace.ironsspellbooks.api.config.IronConfigParameters')
    EQ_PARAMS = { p: P.POWER_MULTIPLIER, m: P.MANA_MULTIPLIER, cd: P.COOLDOWN_IN_SECONDS }
  }
  // Valeurs finales : première passe (EQUILIBRAGE_SORTS), puis le retour d'équilibrage se compose dessus (p et m multipliés, cd remplacée).
  var fin = {}
  var k
  if (cfg) for (k in cfg) fin[k] = cfg[k]
  if (ret) {
    if (ret.p !== undefined) fin.p = (fin.p !== undefined ? fin.p : 1) * ret.p
    if (ret.m !== undefined) fin.m = (fin.m !== undefined ? fin.m : 1) * ret.m
    if (ret.cd !== undefined) fin.cd = ret.cd
  }
  for (k in fin) event.setDefaultValue(EQ_PARAMS[k], D.valueOf(fin[k]))
}

var NIVEAUX_PARAM_MAX = null
var NIVEAUX_ENTIER = null

function niveauxAppliquer(event) {
  try {
    var sort = event.getSpell()
    var id = String(sort.getSpellId())
    try { equilibrageAppliquer(event, id) } catch (eq) { if (NIVEAUX_ERREURS < 5) { NIVEAUX_ERREURS++; console.error('[equilibrage] ' + id + ' : ' + eq) } }
    if (NIVEAUX_SORTS_EXCLUS.indexOf(id) !== -1) return
    var base = sort.getDefaultConfig().maxLevel
    if (base <= 1) return
    var nouveau = base + NIVEAUX_BONUS_SORTS
    event.setDefaultValue(NIVEAUX_PARAM_MAX, NIVEAUX_ENTIER.valueOf(nouveau))
    if (!NIVEAUX_DEJA_VUS[id]) {
      NIVEAUX_DEJA_VUS[id] = true
      NIVEAUX_COMPTE++
      console.info('[classes_niveaux] ' + id + ' : niveau max ' + base + ' -> ' + nouveau)
    }
  } catch (e) {
    if (NIVEAUX_ERREURS < 5) {
      NIVEAUX_ERREURS++
      console.error('[classes_niveaux] ' + e)
    }
  }
}

try {
  NIVEAUX_PARAM_MAX = Java.loadClass('io.redspace.ironsspellbooks.api.config.IronConfigParameters').MAX_LEVEL
  NIVEAUX_ENTIER = Java.loadClass('java.lang.Integer')
  NativeEvents.onEvent(
    Java.loadClass('io.redspace.ironsspellbooks.api.config.ModifyDefaultConfigValuesEvent'),
    function (event) { niveauxAppliquer(event) }
  )
  console.info('[classes_niveaux] +' + NIVEAUX_BONUS_SORTS + ' niveaux max actifs (sorts à 1 niveau ignorés).')
} catch (e) {
  console.error('[classes_niveaux] Impossible d\'activer les niveaux bonus : ' + e)
}
