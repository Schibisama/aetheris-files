// [perf] mesure du temps des handlers : écrit « [perf] nom : X ms en 60 s » dans la console quand un handler dépasse 80 ms cumulées par minute
var perfWrap = (typeof perfWrap === 'function') ? perfWrap : (function () {
  var SYS = { nanoTime: function () { return Date.now() * 1e6 } }   // java.lang.System est interdit par le filtre de classes de KubeJS ; l'erreur de quantification s'annule en moyenne
  return function (nom, fn) {
    var cumul = 0, n = 0, debut = SYS.nanoTime()
    return function (ev) {
      var t0 = SYS.nanoTime()
      try { return fn(ev) } finally {
        var t1 = SYS.nanoTime()
        cumul += t1 - t0; n++
        if (t1 - debut >= 6e10) {
          var ms = cumul / 1e6
          if (ms > 80) console.info('[perf] ' + nom + ' : ' + ms.toFixed(0) + ' ms en 60 s (' + n + ' appels, ' + (ms / n).toFixed(3) + ' ms par appel)')
          cumul = 0; n = 0; debut = t1
        }
      }
    }
  }
})()
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
  { nom: 'Chronomancien',    ecole: 'chronomancy:chronomancy' },
  { nom: 'Géomancien',       ecole: 'gtbcs_geomancy_plus:geo', sup: ['cataclysm_spellbooks:sand'] },
  { nom: 'Aéromancien',      ecole: 'wind_spellbooks:wind', sup: ['cataclysm_spellbooks:sand'] },
  { nom: 'Chromancien',      ecole: 'colormagic:color_magic' },
  { nom: 'Hydromancien',     ecole: 'aces_spell_utils:hydro', sup: ['somakespells:aqua', 'cataclysm_spellbooks:abyssal'] },
  { nom: 'Nécromancien',     ecole: 'monsterspellbooks:necro' },
  { nom: 'Réprouvé',         ecole: 'cursed_school:cursed' },
  { nom: 'Envoûteur',        ecole: 'cursespells:curse' },
  { nom: 'Astromancien',     ecole: 'asterismarcanum:astral', sup: ['tempest_almanac:astral'] },
  { nom: 'Spiritualiste',    ecole: 'iss_magicfromtheeast:spirit' },
  { nom: 'Symétriste',       ecole: 'iss_magicfromtheeast:symmetry' },
  { nom: 'Technomancien',    ecole: 'aces_spell_utils:technomancy', sup: ['cataclysm_spellbooks:technomancy'] },
  { nom: 'Barde',            ecole: 'tunes_n_tomes:melody' }
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
  // ── Anciennes classes Évocateur et Ésotériste (supprimées) : leurs sorts sont répartis entre les classes restantes ──
  // Familia : tous les sorts qui exigent un familier sont donnés avec « Familia : Chat Noir » (et Recherche) aux mêmes classes.
  'esoteric_spell:protection_barrier': ['*'],
  'esoteric_spell:guard_barrier': ['*'],
  'esoteric_spell:aegis_barrier': ['Paladin'],
  'esoteric_spell:bless_barrier': ['Paladin', 'Spiritualiste'],
  'esoteric_spell:prayer_barrier': ['Paladin', 'Spiritualiste'],
  'esoteric_spell:sanctuary_barrier': ['Paladin'],
  'esoteric_spell:guardian_barrier': ['Paladin', 'Géomancien'],
  'esoteric_spell:gloria_barrier': ['Paladin', 'Astromancien'],
  'esoteric_spell:cast_barrier': ['Paladin', 'Technomancien'],
  'esoteric_spell:wall_barrier': ['Géomancien', 'Druide'],
  'esoteric_spell:flowing_barrier': ['Hydromancien'],
  'esoteric_spell:ether_barrier': ['Voyageur du Vide', 'Astromancien'],
  'esoteric_spell:aspis_soul_barrier': ['Nécromancien', 'Spiritualiste'],
  'esoteric_spell:namesis_barrier': ['Envoûteur', 'Réprouvé'],
  'esoteric_spell:mana_change_barrier': ['Technomancien', 'Chromancien'],
  'esoteric_spell:maximizer_change_barrier': ['Technomancien'],
  'esoteric_spell:rapid_change_barrier': ['Technomancien', 'Chronomancien'],
  'esoteric_spell:barrier_aura': ['Paladin'],
  'esoteric_spell:brave_aura': ['Paladin', 'Pyromancien'],
  'esoteric_spell:health_aura': ['Paladin', 'Druide'],
  'esoteric_spell:immunity_aura': ['Paladin', 'Druide', 'Hémomancien'],
  'esoteric_spell:mana_aura': ['Astromancien', 'Technomancien'],
  'esoteric_spell:cycle_aura': ['Chronomancien', 'Chromancien'],
  'esoteric_spell:fast_reaction_aura': ['Chronomancien', 'Aéromancien'],
  'esoteric_spell:quick_motion_aura': ['Aéromancien', 'Chronomancien'],
  'esoteric_spell:auto_device': ['Technomancien'],
  'esoteric_spell:array_device': ['Technomancien', 'Symétriste'],
  'esoteric_spell:chase_device': ['Technomancien', 'Voyageur du Vide'],
  'esoteric_spell:counter_device': ['Technomancien', 'Symétriste'],
  'esoteric_spell:missile_device': ['Technomancien', 'Pyromancien'],
  'esoteric_spell:suppress_device': ['Technomancien', 'Envoûteur'],
  'esoteric_spell:vulcan_device': ['Technomancien', 'Électro-Sorcier'],
  'esoteric_spell:dual_bringer': ['Symétriste'],
  'esoteric_spell:union_sword': ['Symétriste', 'Paladin'],
  'esoteric_spell:magic_blade_absorb': ['Symétriste', 'Nécromancien'],
  'esoteric_spell:magic_blade_conversion': ['Symétriste', 'Chromancien'],
  'esoteric_spell:magic_blade_enchanting': ['Symétriste', 'Spiritualiste'],
  'esoteric_spell:magic_blade_enchant_slash': ['Symétriste', 'Voyageur du Vide'],
  'esoteric_spell:echanted_burst': ['Symétriste', 'Pyromancien'],
  'esoteric_spell:echanted_spell': ['Symétriste', 'Astromancien'],
  'esoteric_spell:element_slash': ['Symétriste', 'Cryomancien', 'Électro-Sorcier'],
  'esoteric_spell:auto_arrow_magic': ['Druide', 'Voyageur du Vide'],
  'esoteric_spell:auto_javelin_magic': ['Électro-Sorcier', 'Aéromancien'],
  'esoteric_spell:auto_lances_magic': ['Paladin', 'Géomancien'],
  'esoteric_spell:magic_skin': ['Druide', 'Géomancien'],
  'esoteric_spell:blast_magic': ['Pyromancien', 'Technomancien'],
  'esoteric_spell:cannon_magic': ['Technomancien'],
  'esoteric_spell:crash_magic': ['Aéromancien', 'Géomancien'],
  'esoteric_spell:esoteric_missile': ['*'],
  'esoteric_spell:esoteric_shackle': ['Envoûteur', 'Réprouvé'],
  'esoteric_spell:guandian_beam_magic': ['Astromancien'],
  'esoteric_spell:impact_magic': ['Géomancien', 'Paladin'],
  'esoteric_spell:laser_magic': ['Technomancien', 'Astromancien'],
  'esoteric_spell:finale_magic': ['Astromancien', 'Spiritualiste'],
  'esoteric_spell:namesis_magic': ['Envoûteur', 'Réprouvé'],
  'esoteric_spell:qadal_magic': ['Spiritualiste', 'Chromancien'],
  'esoteric_spell:storm_magic': ['Électro-Sorcier', 'Aéromancien', 'Hydromancien'],
  'esoteric_spell:limit_break': ['Paladin', 'Hémomancien'],
  'esoteric_spell:resurrection': ['Paladin', 'Nécromancien'],
  'esoteric_spell:spell_calibration': ['*'],
  'esoteric_spell:mana_resonance': ['Astromancien', 'Chromancien'],
  'esoteric_spell:esoteric_step': ['Voyageur du Vide', 'Chronomancien'],
  'esoteric_spell:familia_blizzard': ['Cryomancien', 'Astromancien'],
  'esoteric_spell:familia_lightning': ['Électro-Sorcier', 'Astromancien'],
  'esoteric_spell:familia_meteor': ['Pyromancien', 'Astromancien'],
  'esoteric_spell:familia_imperial_ray': ['Paladin', 'Astromancien'],
  'esoteric_spell:familia_symphony': ['Spiritualiste', 'Chromancien', 'Barde'],
  'esoteric_spell:finale_guide': ['Spiritualiste', 'Astromancien'],
  'esoteric_spell:finale_mana_regan': ['Spiritualiste', 'Astromancien'],
  'esoteric_spell:finale_stone_barrier': ['Géomancien', 'Paladin'],
  'esoteric_spell:chronos_shift_magic': ['Chronomancien'],
  'irons_spellbooks:fang_strike': ['Géomancien', 'Druide'],
  'irons_spellbooks:fang_swirl': ['Géomancien', 'Druide'],
  'irons_spellbooks:fang_ward': ['Géomancien', 'Paladin'],
  'irons_spellbooks:chain_creeper': ['Pyromancien', 'Technomancien'],
  'irons_spellbooks:creeper_revenge': ['Pyromancien', 'Technomancien'],
  'irons_spellbooks:lob_creeper': ['Pyromancien', 'Technomancien'],
  'irons_spellbooks:arrow_volley': ['Druide', 'Voyageur du Vide'],
  'irons_spellbooks:summon_horse': ['*'],
  'irons_spellbooks:summon_vex': ['Nécromancien', 'Voyageur du Vide'],
  // Ressusciter les Morts : Monsters & Spellbooks le range dans l'école Nécromancie ; il reste ouvert à l'Hémomancien (école d'origine : sang)
  'irons_spellbooks:raise_dead': ['Hémomancien', 'Nécromancien'],
  'irons_spellbooks:shield': ['Paladin', 'Chromancien'],
  'irons_spellbooks:slow': ['Chronomancien', 'Cryomancien'],
  'irons_spellbooks:firecracker': ['Pyromancien', 'Chromancien'],
  'irons_spellbooks:wololo': ['*'],
  'irons_spellbooks:scapegoat': ['Envoûteur', 'Voyageur du Vide'],
  'irons_spellbooks:spectral_hammer': ['Paladin', 'Spiritualiste'],
  'cataclysm_spellbooks:conjure_ignited_reinforcement': ['Pyromancien', 'Nécromancien'],
  'cataclysm_spellbooks:pilfer': ['Voyageur du Vide', 'Technomancien'],
  'apprenticecodex:edge_dancer': ['Symétriste', 'Voyageur du Vide'],
  'apprenticecodex:feather_rush': ['Aéromancien', 'Voyageur du Vide'],
  'apprenticecodex:search_beacon': ['*'],
  'aces_spell_utils:example_advanced_spells': ['Technomancien'],
  'aces_spell_utils:example_advanced_tp': ['Technomancien'],
  'gametechbcs_spellbooks:ashen_breath': ['Pyromancien', 'Géomancien'],
  'gametechbcs_spellbooks:lingering_strain': ['Envoûteur', 'Nécromancien'],
  'hazennstuff:arcane_cards': ['Chromancien', 'Astromancien'],
  'hazennstuff:bone_bolt': ['Nécromancien'],
  'monsterspellbooks:enchanters_boost': ['Chromancien', 'Spiritualiste'],
  'monsterspellbooks:enchanters_protection': ['Paladin', 'Chromancien'],
  'monsterspellbooks:spell_of_undying': ['Nécromancien', 'Paladin'],
  'somakespells:comforting_lullaby': ['Chromancien', 'Spiritualiste', 'Barde'],
  'somakespells:slumber_melody': ['Chromancien', 'Spiritualiste', 'Barde'],
  'somakespells:jingle_bell': ['Chromancien', 'Spiritualiste', 'Barde'],
  'somakespells:resonant_pulse': ['Chromancien', 'Spiritualiste', 'Barde'],
  // Sorts musicaux d'autres classes, partagés avec le Barde
  'somakespells:fragmented_requiem': ['Hémomancien', 'Barde'],
  'somakespells:spectral_rondo': ['Spiritualiste', 'Barde'],
  'cursed_school:wailing_dirge': ['Réprouvé', 'Barde'],
  'cursespells:silent_waltz': ['Envoûteur', 'Barde'],
  'somakespells:evocation_fortitude': ['Paladin'],
  'somakespells:ram_tchum': ['Paladin', 'Géomancien'],
  'somakespells:reverberation': ['Spiritualiste', 'Électro-Sorcier'],
  'esoteric_spell:familia_cat_summon': ['Cryomancien', 'Astromancien', 'Électro-Sorcier', 'Pyromancien', 'Paladin', 'Spiritualiste', 'Chromancien', 'Géomancien', 'Chronomancien'],
  'esoteric_spell:familia_research': ['Cryomancien', 'Astromancien', 'Électro-Sorcier', 'Pyromancien', 'Paladin', 'Spiritualiste', 'Chromancien', 'Géomancien', 'Chronomancien'],
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
  'hazennstuff:spectral_axe': ['Spiritualiste'],
  'hazennstuff:umbrashift_barrage': ['Réprouvé'],
  'hazennstuff:shadow_reaver': ['Envoûteur'],
  'hazennstuff:soul_seekers': ['Nécromancien', 'Envoûteur'],
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
  'irons_spellbooks:haste': ['Paladin', 'Chronomancien'],
  'irons_spellbooks:evasion': ['Voyageur du Vide', 'Chronomancien', 'Aéromancien'],
  'irons_spellbooks:recall': ['*'], // Rappel : pour tout le monde (onglet Occultiste)
  'irons_spellbooks:teleport': ['Voyageur du Vide', 'Chronomancien'],
  'apprenticecodex:quick_blink': ['Voyageur du Vide', 'Chronomancien'],
  'irons_spellbooks:counterspell': ['Voyageur du Vide', 'Chronomancien', 'Symétriste'],
  'gametechbcs_spellbooks:displacement': ['Voyageur du Vide', 'Chronomancien'],
  'firesenderexpansion:dimensional_adaptation': ['Voyageur du Vide', 'Chronomancien'],
  'apprenticecodex:wizardlamp': ['Paladin', 'Chromancien'],
  'irons_spellbooks:firefly_swarm': ['Druide', 'Chromancien'],
  'irons_spellbooks:cleanse': ['Paladin', 'Chromancien'],
  'irons_spellbooks:lightning_bolt': ['Électro-Sorcier', 'Aéromancien'],
  'irons_spellbooks:thunderstorm': ['Électro-Sorcier', 'Aéromancien'],
  'iss_magicfromtheeast:cloud_ride': ['Symétriste', 'Aéromancien'],
  'somakespells:thunder_cloud': ['Hydromancien', 'Aéromancien'],
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
  'apprenticecodex:manifestation_grimoire',
  'hazennstuff:call_forth_terraprisma',
  'hazennstuff:terraprismic_barrage',
  'hazennstuff:fiery_dagger'
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
var ecoleAvertie = false
function ecoleDuSort(idSort) {
  var rl = null
  try { rl = ResourceLocationJ.tryParse(String(idSort)) } catch (e0) {}
  // 1. API directe d'Iron's Spells ; 2. registre en secours ; 3. chargement tardif de la classe si elle manquait au démarrage.
  var essais = [
    function () { return SpellRegistryJ.getSpell(rl) },
    function () { return SpellRegistryJ.REGISTRY.get(rl) },
    function () { return Java.loadClass('io.redspace.ironsspellbooks.api.registry.SpellRegistry').getSpell(rl) }
  ]
  var derniere = null
  for (var i = 0; i < essais.length; i++) {
    try {
      var sort = essais[i]()
      if (sort) {
        var id = String(sort.getSchoolType().getId())
        if (id && id !== 'null' && id !== 'undefined') return id
      }
    } catch (e) { derniere = e }
  }
  if (!ecoleAvertie) { ecoleAvertie = true; console.error('[classes_rp] école introuvable pour ' + idSort + ' (' + derniere + ') : les écoles des sorts autorisés ne seront PAS ouvertes') }
  return null
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
  // Chronomancien : tenue de base Élève du Temps (Magi-Agent) et son amélioration, le Maître du Temps (mod aetheris_armures)
  { regle: /^(apprenticecodex:magi_agent_suit_(hood|coat|leggings|boots)|aetheris_armures:chronomancien_(helmet|chestplate|leggings|boots))$/, classes: ['Chronomancien'] },
  { regle: /^apprenticecodex:(.*_spellcaster_gun|focus_staffbow|multipurpose_staffrifle|fullauto_rapidcast_spellrifle|.*_swingcast_staff|revolvercast_staff|scrollcaster_gauntlet|circuit_heat_staff|charged_twin_blade_staff)$/, classes: [] },
  { regle: /^cataclysm_spellbooks:(excelsius_.*|cursium_mage_.*|ignis_.*|hellfire_forge)$/, classes: [] },
  { regle: /^somakespells:forbidden_hammer$/, classes: [] },
  { regle: /^born_in_chaos_v1:(wood_splitter_axe|nightmare_claw|sweet_sword|sweet_axe|staff_of_magic_arrows|skullbreaker_hammer|shell_mace|frostbitten_blade|nut_hammer|nightmare_scythe|stop_hammer|staffof_blindness|dark_rod|dark_ritual_dagger|bonescaller_staff|trident_hayfork|great_reaper_axe|carrot_sword|darkwarblade|pumpkinstaffa|sharpened_dark_metal_sword|spider_bite_sword|spiritual_sword|soul_cutlass|soulbane|intoxicating_dagger|pumpkinhandgun|(dark_metal_armor|nightmare_mantleofthe_night|spiny_shell_armor)_(helmet|chestplate|leggings|boots)|damned_demomans_hat_helmet|killer_rabbit_ears_helmet|lord_pumpkinheads_hat_helmet|missionary_hat_helmet|spiritual_guide_sombrero_helmet)$/, classes: [] },   // Born in Chaos : armes et armures désactivées
  { regle: /^mowziesmobs:ice_crystal$/, classes: [] },   // Cristal de glace de Mowzie's Mobs : désactivé
  { regle: /^iss_magicfromtheeast:repeating_crossbow$/, classes: [] },
  // ── Legendary Monsters : seuls le Marteau moussu et le Plastron moussu sont gardés (Druide, Géomancien) ; le reste des armes et armures est désactivé ──
  { regle: /^legendary_monsters:(mossy_hammer|mossy_chestplate)$/, classes: ['Druide', 'Géomancien'] },
  { regle: /^(legendary_monsters:sickle_of_harvest)$/, classes: ['Géomancien'] },
  { regle: /^(tunes_n_tomes:(bard_(harp|helmet|chestplate|leggings|boots)|melodic_mastery_(helmet|chestplate|leggings|boots)|affinity_ring_melody)|aetheris_armures:(virtuose_(helmet|chestplate|leggings|boots)|rapiere_cle_de_sol|anneau_(diapason|echo|cadence)|metronome|sourdine|boite_a_musique|derniere_note|bandouliere|medaillon_harmonie))$/, classes: ['Barde'] },   // + Virtuose (aetheris_armures) ; instruments d'Immersive Melodies libres (effet réservé au Barde)
  // Artefacts de classe (mod aetheris_armures, emplacements Curios)
  { regle: /^aetheris_armures:(anneau_(marees|corail|courant)|perle_pression|coquille_nautile|conque_profondeurs|larme_leviathan|ceinture_algues|collier_perles_noires)$/, classes: ['Hydromancien'] },
  { regle: /^aetheris_armures:(anneau_(ronces|seve|saisons)|gland_ancien|totem_meute|pollen_dore|coeur_arbre_monde|ceinture_lierre|collier_crocs)$/, classes: ['Druide'] },
  { regle: /^aetheris_armures:(anneau_(granit|fracture|tellurique)|pierre_ancrage|geode_vivante|sablier_desert|coeur_montagne|ceinture_filon|collier_fossiles)$/, classes: ['Géomancien'] },
  { regle: /^aetheris_armures:(anneau_(saignee|pacte|frenesie)|calice_carmin|caillot_sang|dague_rituelle|coeur_battant|ceinture_osselets|collier_vampire)$/, classes: ['Hémomancien'] },
  { regle: /^aetheris_armures:(anneau_(jugement|serment|aube)|reliquaire|etendard|sceau_lumiere|aureole_sacree|ceinture_croise|pendentif_martyr)$/, classes: ['Paladin'] },
  { regle: /^aetheris_armures:(anneau_(braise|cendres|fournaise)|peau_salamandre|lanterne_ardente|charbon_eternel|plume_phenix|ceinture_magma|collier_flamme)$/, classes: ['Pyromancien'] },
  { regle: /^aetheris_armures:(anneau_(givre|eclats|morsure)|flocon_eternel|carapace_glace|cristal_permafrost|larme_boreale|ceinture_frimas|amulette_blizzard)$/, classes: ['Cryomancien'] },
  { regle: /^aetheris_armures:(anneau_(arc|surtension|ion)|batterie_statique|paratonnerre|bobine_tesla|coeur_orage|ceinture_conductrice|collier_eclair)$/, classes: ['Électro-Sorcier'] },
  { regle: /^aetheris_armures:(anneau_(horizon|distorsion|seuil)|ancre_vide|oeil_vide|perle_instable|coeur_neant|ceinture_abime|collier_exil)$/, classes: ['Voyageur du Vide'] },
  { regle: /^aetheris_armures:(anneau_(bourrasque|cyclone|zephyr)|plume_zephyr|souffle_ascendant|sifflet_vent|coeur_tornade|ceinture_alizes|pendentif_rafale)$/, classes: ['Aéromancien'] },
  { regle: /^aetheris_armures:(anneau_(ossements|putrefaction|tombe)|phylactere|lanterne_morts|crane_explosif|coeur_liche|ceinture_ossuaire|amulette_ectoplasme)$/, classes: ['Nécromancien'] },
  { regle: /^aetheris_armures:(anneau_(contagion|fletrissure|malediction)|poupee_vaudou|oeil_verite|sceau_maudit|coeur_damne|ceinture_chaines|collier_supplice)$/, classes: ['Envoûteur'] },
  { regle: /^aetheris_armures:(anneau_(ames_errantes|lien_spirituel|exorcisme)|gardien_esprit|lanterne_spectrale|encens_ancestral|urne_ames|ceinture_talismans|collier_ancetres)$/, classes: ['Spiritualiste'] },
  { regle: /^aetheris_armures:(anneau_(yin|yang|miroir)|balance_jade|miroir_eau|taijitu|coeur_equilibre|ceinture_dualite|pendentif_contrepoids)$/, classes: ['Symétriste'] },
  { regle: /^aetheris_armures:(anneau_(circuit|court_circuit|rendement)|batterie_arcanique|scanner_arcanique|bouclier_energie|noyau_reacteur|ceinture_outils|collier_drone)$/, classes: ['Technomancien'] },
  { regle: /^legendary_monsters:(sharp_battle_axe|spiky_shield|spiky_spear|chorus_blade|chorus_mask|chorus_cannon|shulker_shield|shulker_helmet|the_great_frost|dinosaur_bone_shield|dinosaur_bone_club|dinosaur_bone_helmet|frostbitten_shield|fiery_jaw|fiery_boots|void_sword|ender_hammer|withered_scythe|withered_ribcage|wand_of_clouds|sharp_sai|axe_of_lightning|atmospheric_boots|soul_great_sword|golden_halbert|knights_sword|blastproof_helmet|sand_cannon|monstrous_anchor|reinforced_monstrous_anchor|atom_splitter|the_tesseract|buckler_of_annihilation|resurrected_javelin|shattered_greatsword|hand_cannon|swinging_axe|sapphire_helmet|bronzite_sword|bronzite_axe|enderitium_(sword|axe|sickle)|annihilator_(helmet|chestplate|leggings|boots))$/, classes: [] },
  // ── Bosses'Rise (block_factorys_bosses) : armes et armures désactivées ──
  { regle: /^block_factorys_bosses:(dragon_bones_(boots|chestplate|leggings)|dragon_guard_shield|enhanced_shield|ice_gauntlet|knight_(helmet|chestplate|leggings|boots|sword)|kraken_trident|kraken_cannon_item|large_sword|pirate_saber|sandworm_gauntlet|warrior_sword|dagger)$/, classes: [] },
  // Cataclysm (mod principal)
  { regle: /^cataclysm:(meat_shredder|laser_gatling|wither_assault_shoulder_weapon|void_assault_shoulder_weapon|void_forge|tidal_claws|infernal_forge|bulwark_of_the_flame|gauntlet_of_guard|gauntlet_of_bulwark|gauntlet_of_maelstrom|the_incinerator|monstrous_helm)$/, classes: [] },
  { regle: /^cataclysm:(ignitium_(helmet|chestplate|elytra_chestplate|leggings|boots)|cursium_(helmet|chestplate|leggings|boots))$/, classes: [] },

  // ── Iron's Spells 'n Spellbooks ──
  { regle: /^irons_spellbooks:decrepit_scythe$/, classes: ['Nécromancien'] },
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
  { regle: /^monsterspellbooks:(great_axeblade|village_butcherer)$/, classes: ['Hémomancien'] },
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
  { regle: /^somakespells:totem_dagger$/, classes: ['Spiritualiste'] },
  // ── Mowzie's Mobs ──
  { regle: /^mowziesmobs:sculptor_staff$/, classes: ['Géomancien'] },
  { regle: /^mowziesmobs:naga_fang_dagger$/, classes: ['Druide'] },
  { regle: /^mowziesmobs:geomancer_(beads|belt|robe|sandals)$/, classes: ['Géomancien', 'Druide'] },
  // ── Farmer's Spell ──
  { regle: /^farmers_spell:gluttony_chef_(hat|apron|leggings|boots)$/, classes: ['Druide'] },
  { regle: /^farmers_spell:hell_knife$/, classes: ['Druide'] },
  { regle: /^farmers_spell:gospel$/, classes: ['Paladin'] },
  { regle: /^farmers_spell:grow_knife$/, classes: ['Druide', 'Géomancien'] },
  // ── Objets réactivés (liste « craft uniquement ») : classes attribuées, recette conservée, plus aucun butin ──
  { regle: /^(hazennstuff:ancient_warriors_axe)$/, classes: ['Spiritualiste'] },
  { regle: /^(hazennstuff:astralite_cleaver|hazennstuff:nexus|hazennstuff:starfury|hazennstuff:terraprisma)$/, classes: ['Astromancien'] },
  { regle: /^(hazennstuff:beongae)$/, classes: ['Électro-Sorcier'] },
  { regle: /^(hazennstuff:blade_of_grass|hazennstuff:blossom_of_the_enchantress|hazennstuff:bountiful_harvest|hazennstuff:thorn_chakram)$/, classes: ['Druide'] },
  { regle: /^(hazennstuff:ceaseless_void|hazennstuff:hammush|hazennstuff:lights_bane|hazennstuff:nights_edge|hazennstuff:rod_of_discord|hazennstuff:true_nights_edge)$/, classes: ['Réprouvé'] },
  { regle: /^(hazennstuff:coralite_cane)$/, classes: ['Hydromancien'] },
  { regle: /^(hazennstuff:divine_greatsword|hazennstuff:divine_scepter|hazennstuff:excalibur|hazennstuff:hammer_of_justice)$/, classes: ['Paladin'] },
  { regle: /^(hazennstuff:draconic_splitter|hazennstuff:fireblossom_rapier|hazennstuff:firebrand|hazennstuff:soulcalling_scepter|hazennstuff:volcano|hazennstuff:war_flaming_lance)$/, classes: ['Pyromancien'] },
  { regle: /^(hazennstuff:enderconic_scepter)$/, classes: ['Voyageur du Vide'] },
  { regle: /^(hazennstuff:frieren_staff|hazennstuff:ravens_bane)$/, classes: ['Chronomancien'] },
  { regle: /^(hazennstuff:glassweaver_scepter)$/, classes: ['Symétriste'] },
  { regle: /^(hazennstuff:grimoire_staff|hazennstuff:spectrum)$/, classes: ['Technomancien'] },
  { regle: /^(hazennstuff:ice_pike)$/, classes: ['Cryomancien'] },
  { regle: /^(hazennstuff:malice)$/, classes: ['Aéromancien'] },
  { regle: /^(hazennstuff:meowmere)$/, classes: ['Chromancien'] },
  { regle: /^(hazennstuff:muramasa)$/, classes: ['Nécromancien'] },
  { regle: /^(hazennstuff:skyscorcher)$/, classes: ['Électro-Sorcier', 'Aéromancien'] },
  { regle: /^(hazennstuff:soul_reaper|hazennstuff:wisewood_cane)$/, classes: ['Nécromancien', 'Réprouvé'] },
  { regle: /^(hazennstuff:spectral_pickaxe)$/, classes: ['Nécromancien', 'Spiritualiste'] },
  { regle: /^(hazennstuff:vampire_knives)$/, classes: ['Hémomancien'] },
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
  { regle: /^hazennstuff:(alchemist_supreme_boots|alchemist_supreme_chestplate|alchemist_supreme_helmet|alchemist_supreme_leggings|geckolib_supreme_witch_boots|geckolib_supreme_witch_chestplate|geckolib_supreme_witch_helmet|geckolib_supreme_witch_leggings|spectral_spelunker_boots|spectral_spelunker_chestplate|spectral_spelunker_helmet|spectral_spelunker_leggings|supreme_witch_boots|supreme_witch_chestplate|supreme_witch_helmet|supreme_witch_leggings)$/, classes: ['Chromancien'] },
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
  { regle: /^simplyswords:(riftmane)$/, classes: ['Chronomancien'] },
  { regle: /^simplyswords:(decaying_relic|magiscythe|magiblade|magispear)$/, classes: ['Symétriste'] },
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
  { regle: /^crystal_chronicles:evocation_twinblade$/, classes: ['Paladin'] },
  { regle: /^crystal_chronicles:nature_(knight_(helmet|chestplate|leggings|boots)|spear)$/,                classes: ['Druide', 'Géomancien'] },
  { regle: /^crystal_chronicles:lightning_(knight_(helmet|chestplate|leggings|boots)|bident|staff)$/,      classes: ['Électro-Sorcier', 'Aéromancien'] },
  { regle: /^crystal_chronicles:evocation_(knight_(helmet|chestplate|leggings|boots)|twinblade)$/,         classes: ['Paladin'] },
  // Set Prismatic + Anneau de Diffraction -> Géomancien
  // Géomancien : tenue de base (mod aetheris_armures), améliorable en Terrien Originel (Prismatic Knight)
  { regle: /^aetheris_armures:geomancien_(helmet|chestplate|leggings|boots)$/, classes: ['Géomancien'] },
  { regle: /^crystal_chronicles:(prismatic_knight_(helmet|chestplate|leggings|boots)|diffraction_ring)$/,  classes: ['Géomancien'] },
  { regle: /^crystal_chronicles:diffraction_ring$/,  classes: ['Géomancien'] },
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
  { regle: /^monsterspellbooks:illager_enchanter_(helmet|chestplate|leggings|boots)$/, classes: ['Chromancien'] },
  { regle: /^monsterspellbooks:(void_touched_blade|endersent_crusher|disruption_naginata)$/, classes: ['Voyageur du Vide'] },
  { regle: /^monsterspellbooks:(necromancer_(helmet|chestplate|leggings|boots)|death_knight_(helmet|chestplate|leggings|boots)|draugr_elite_(helmet|chestplate|leggings|boots)|deathsilver_(dagger|sword|axe|greataxe)|necromancer_trident|reaper_sickle|orb_soul)$/, classes: ['Nécromancien'] },
  { regle: /^monsterspellbooks:(prismarine_claymore|prismarine_axe)$/, classes: ['Hydromancien'] },

  // ── Cursed School -> Réprouvé ──
  { regle: /^cursed_school:((cursed|inkbound)_(helmet|chestplate|leggings|boots)|ledger_scythe|the_cursed_ring|margin_amulet|ash_charm|closing_clause|triplicate_stylus|swarm_indenture|warrant_of_apostasy)$/, classes: ['Réprouvé'] },

  // ── Curse Spells -> Envoûteur ──
  { regle: /^cursespells:((heretic|worshipper|preacher|remnant)_(hood|robe|pants|shoes)|transcendent_(helmet|chestplate|leggings|boots)|heretic_staff|heretic_necklace|heretic_cross|executioner_greatsword|stagnation_blade|blade_of_the_first_sin|clairvoyance_ring|curse_bane_ring)$/, classes: ['Envoûteur'] },

  // ── Esoteric Spells (équipement) ──
  { regle: /^esoteric_spell:(esoteric_mage_(helmet|chestplate|chestplate_base|leggings|boots)|prismatic_arc_staff|rising_(inolia|arcane|zeroing)_ring)$/, classes: ['Astromancien'] },
  // ── Iron's Spells 'n Spellbooks : équipements au thème clair ──
  { regle: /^irons_spellbooks:(pyromancer_(helmet|chestplate|leggings|boots)|infernal_sorcerer_chestplate|pyrium_staff)$/, classes: ['Pyromancien'] },
  { regle: /^irons_spellbooks:(cryomancer_(helmet|chestplate|leggings|boots)|ice_staff|boreal_blade)$/, classes: ['Cryomancien'] },
  { regle: /^irons_spellbooks:(electromancer_(helmet|chestplate|leggings|boots)|lightning_rod)$/, classes: ['Électro-Sorcier', 'Technomancien', 'Aéromancien'] },
  { regle: /^irons_spellbooks:(priest_(helmet|chestplate|leggings|boots)|paladin_chestplate)$/, classes: ['Paladin'] },
  { regle: /^irons_spellbooks:(cultist_(helmet|chestplate|leggings|boots)|blood_staff|improved_blood_staff)$/, classes: ['Hémomancien'] },
  { regle: /^irons_spellbooks:shadowwalker_(helmet|chestplate|leggings|boots)$/, classes: ['Voyageur du Vide'] },
  { regle: /^irons_spellbooks:plagued_(helmet|chestplate|leggings|boots)$/, classes: ['Druide'] },
  { regle: /^irons_spellbooks:archevoker_(helmet|chestplate|leggings|boots)$/, classes: ['Spiritualiste'] },
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
  { regle: /^somakespells:last_mourning$/, classes: ['Nécromancien'] },
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
  // Seuls les sorts réellement découverts sont verrouillés : avant, une commande par sort interdit (des centaines)
  // partait pour chaque joueur toutes les 30 s et gelait le serveur plusieurs secondes.
  var connus = null
  try {
    if (!UnlockAttachJ) UnlockAttachJ = Java.loadClass('com.specs.irons_spellbooks.unlock.SpellUnlockAttachments')
    connus = {}
    var it = joueur.getData(UnlockAttachJ.UNLOCKS).getDiscoveredSpells().iterator()
    while (it.hasNext()) connus[String(it.next())] = true
  } catch (e0) { connus = null }
  for (var i = 0; i < liste.length; i++) {
    if (connus && !connus[liste[i]]) continue
    cmd(server, 'specs_codex spell lock ' + joueur.username + ' ' + liste[i])
  }
  // Sorts « pour tous » découverts ailleurs qu'en cours : reverrouillés
  if (connus) {
    for (var id in connus) if (coursVerrouille(joueur, id)) cmd(server, 'specs_codex spell lock ' + joueur.username + ' ' + id)
  }
}

// Écoles qui doivent rester ouvertes pour cette classe (école, écoles supplémentaires, écoles libres, écoles des sorts permis).
function ecolesOuvertesDeLaClasse(classe) {
  var set = {}
  set[classe.ecole] = true
  if (classe.sup) for (var s = 0; s < classe.sup.length; s++) set[classe.sup[s]] = true
  for (var i = 0; i < ECOLES_LIBRES.length; i++) set[ECOLES_LIBRES[i]] = true
  for (var sort in SORTS_PAR_CLASSE) {
    if (classeAutorisee(SORTS_PAR_CLASSE[sort], classe.nom)) {
      var e = ecoleDuSort(sort)
      if (e) set[e] = true
    }
  }
  return set
}
function verrouillerEcolesHorsClasse(server, nom, classe) {
  var garder = ecolesOuvertesDeLaClasse(classe)
  var connues = {}
  for (var i = 0; i < CLASSES.length; i++) {
    connues[CLASSES[i].ecole] = true
    if (CLASSES[i].sup) for (var j = 0; j < CLASSES[i].sup.length; j++) connues[CLASSES[i].sup[j]] = true
  }
  for (var sort in SORTS_PAR_CLASSE) { var e = ecoleDuSort(sort); if (e) connues[e] = true }
  for (var ecole in connues) {
    if (!garder[ecole]) cmd(server, 'specs_codex school lock ' + nom + ' ' + ecole)
  }
}

// Changement de classe : on oublie les sorts découverts, SAUF ceux obtenus par /cours et les sorts « pour tous » (ils restent acquis).
function oublierSortsDeClasse(server, joueur) {
  var nom = joueur.username
  var gardes = null
  try { if (typeof desactSortsCours === 'function') gardes = desactSortsCours() } catch (e0) {}
  var donnees = null
  try {
    if (!UnlockAttachJ) UnlockAttachJ = Java.loadClass('com.specs.irons_spellbooks.unlock.SpellUnlockAttachments')
    donnees = joueur.getData(UnlockAttachJ.UNLOCKS)
  } catch (e1) {}
  if (!gardes || !donnees) {
    // Lecture impossible : ancien comportement, mais on remet d'abord ce que /cours avait donné.
    cmd(server, 'specs_codex spell lock_all ' + nom)
    try {
      var suivi = String(joueur.persistentData.getString(COURS_CLE)).split('|')
      for (var k = 0; k < suivi.length; k++) if (suivi[k]) cmd(server, 'specs_codex spell unlock ' + nom + ' ' + suivi[k])
    } catch (e2) {}
    return
  }
  var aOublier = []
  var it = donnees.getDiscoveredSpells().iterator()
  while (it.hasNext()) {
    var id = String(it.next())
    if (gardes[id] !== true) aOublier.push(id)
  }
  for (var i = 0; i < aOublier.length; i++) cmd(server, 'specs_codex spell lock ' + nom + ' ' + aOublier[i])
}

// ───────── Sort de départ de chaque classe ─────────
// Appris d'office quand une classe est attribuée (/starter ou reroll chez le Maître du Destin) ; on ne peut pas l'oublier
// (le respec du codex est annulé plus bas, et un contrôle le remet s'il disparaît) tant que le joueur garde sa classe.
// Au changement de classe il est oublié comme les autres sorts de classe, puis le sort de départ de la nouvelle classe est donné.
var SORT_DEBUT = {
  'Hydromancien': 'hazennstuff:water_bolt',
  'Technomancien': 'apprenticecodex:lethal_assault',
  'Astromancien': 'asterismarcanum:starfire',
  'Chronomancien': 'chronomancy:sands_of_time',
  'Chromancien': 'colormagic:paint_spray',
  'Réprouvé': 'cursed_school:crow_feast',
  'Envoûteur': 'cursespells:chain_curse',
  'Géomancien': 'gtbcs_geomancy_plus:dripstone_bolt',
  'Hémomancien': 'monsterspellbooks:blood_thorn',
  'Voyageur du Vide': 'apprenticecodex:arcane_blast',
  'Pyromancien': 'irons_spellbooks:firebolt',
  'Paladin': 'irons_spellbooks:guiding_bolt',
  'Cryomancien': 'irons_spellbooks:icicle',
  'Électro-Sorcier': 'apprenticecodex:shock',
  'Druide': 'apprenticecodex:compound_phial',
  'Spiritualiste': 'iss_magicfromtheeast:splitting_shuriken',
  'Symétriste': 'iss_magicfromtheeast:jade_bullet',
  'Nécromancien': 'monsterspellbooks:bone_dagger',
  'Aéromancien': 'cataclysm_spellbooks:desert_winds',
  'Barde': 'tunes_n_tomes:chord_blast'
}
var SORT_DEBUT_CLE = 'classe_sort_debut'
function donnerSortDeBase(server, joueur, classe) {
  try {
    var id = SORT_DEBUT[classe.nom]
    if (!id) { joueur.persistentData.remove(SORT_DEBUT_CLE); return }
    joueur.persistentData.putString(SORT_DEBUT_CLE, id)
    cmd(server, 'specs_codex spell unlock ' + joueur.username + ' ' + id)
    var rl = id.split(':')
    joueur.tell(Text.gold('Sort de départ appris : ').append(Text.translate('spell.' + rl[0] + '.' + rl[1]).yellow()))
    console.info('[classes_rp] ' + joueur.username + ' (' + classe.nom + ') apprend son sort de départ ' + id)
  } catch (e) { console.error('[classes_rp] sort de départ : ' + e) }
}

// reinit = true : on repart de zéro (nouvelle classe) -> tous les sorts découverts sont oubliés.
// À la simple reconnexion (reinit = false) on garde la progression du joueur.
function appliquerClasse(server, joueur, classe, reinit) {
  var nom = joueur.username
  registreClasse(server, joueur, classe)
  // Quête FTB « L'éveil » (chapitre Bienvenue) : cochée dès qu'une classe est attribuée
  try { if (typeof ftbCompleter === 'function') ftbCompleter(joueur, '7C4CFD68DA0E88CA') } catch (eQ) { console.error('[classes_rp] quête éveil : ' + eQ) }
  if (estTest(joueur)) { // mode testeur : tout est ouvert
    cmd(server, 'specs_codex school unlock_all ' + nom)
    cmd(server, 'specs_codex spell unlock_all ' + nom)
    return
  }
  if (reinit) { oublierSortsDeClasse(server, joueur) }
  if (reinit) {
    cmd(server, 'specs_codex school lock_all ' + nom)
  } else {
    // Simple reconnexion : on NE verrouille PAS tout puis rouvre (cela retirait les sorts rangés dans la barre du codex).
    // On verrouille seulement les écoles connues qui ne sont pas à la classe ; les écoles de la classe ne sont jamais touchées.
    verrouillerEcolesHorsClasse(server, nom, classe)
  }
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
      // École d'origine du sort ouverte : sans elle le Codex ne l'affiche pas (vérifié en jeu le 30/10).
      if (ecole) cmd(server, 'specs_codex school unlock ' + nom + ' ' + ecole)
      else console.error('[classes_rp] ' + nom + ' : école inconnue pour ' + sort)
      // Les sorts ouverts à TOUS (liste « * », dont Rappel) ne sont plus offerts au départ : les professeurs
      // les donnent en classe avec /cours (voir plus bas).
    }
  }
  verrouillerSortsInterdits(server, joueur, classe)
  if (reinit) donnerSortDeBase(server, joueur, classe)
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

// ── Registre des effectifs : « uuid -> nom de classe », tenu dans les données du serveur.
// Mis à jour à chaque connexion et à chaque changement de classe (appliquerClasse), donc il se remplit tout seul.
// Les testeurs (mode toutes classes) n'y figurent pas.
var CLE_REGISTRE = 'registre_classes'
function registreClasse(server, joueur, classe) {
  try {
    var pd = server.persistentData
    if (!pd.contains(CLE_REGISTRE)) pd.put(CLE_REGISTRE, new (Java.loadClass('net.minecraft.nbt.CompoundTag'))())
    var reg = pd.getCompound(CLE_REGISTRE)
    var id = String(joueur.uuid)
    if (estTest(joueur) || !classe) reg.remove(id)
    else reg.putString(id, classe.nom)
  } catch (e) { console.error('[classes_rp] registre : ' + e) }
}
function effectifsClasses(server) {
  var eff = {}
  for (var i = 0; i < CLASSES.length; i++) eff[CLASSES[i].nom] = 0
  try {
    var reg = server.persistentData.getCompound(CLE_REGISTRE)
    var cles = reg.getAllKeys().iterator()
    while (cles.hasNext()) {
      var n = String(reg.getString(cles.next()))
      if (eff[n] !== undefined) eff[n]++
    }
  } catch (e) {}
  return eff
}

// Tirage du Maître du Destin : tant qu'il reste PLUS de DESTIN_SEUIL_VIDES classes sans aucun aspirant (effectif 0), la classe est
// tirée à 100 % parmi elles. Dès qu'il n'en reste que DESTIN_SEUIL_VIDES ou moins : 75 % de chances d'une classe sans aspirant,
// 25 % d'une classe qui a déjà des joueurs. Ne tombe jamais sur la classe actuelle.
var DESTIN_CHANCE_RARE = 0.75
var DESTIN_SEUIL_VIDES = 3
function tirerRare(server, exclureNom) {
  var eff = effectifsClasses(server)
  var vides = [], autres = []
  for (var i = 0; i < CLASSES.length; i++) {
    if (CLASSES[i].nom === exclureNom) continue
    ;((eff[CLASSES[i].nom] || 0) === 0 ? vides : autres).push(CLASSES[i])
  }
  var groupe
  if (vides.length === 0) groupe = autres
  else if (autres.length === 0 || vides.length > DESTIN_SEUIL_VIDES) groupe = vides
  else groupe = (Math.random() < DESTIN_CHANCE_RARE) ? vides : autres
  var choix = groupe[Math.floor(Math.random() * groupe.length)]
  console.info('[classes_rp] Maître du Destin : ' + vides.length + ' classe(s) sans aspirant, effectifs ' + JSON.stringify(eff) + ' -> ' + choix.nom + (groupe === vides ? ' (classe sans aspirant)' : ' (classe déjà choisie)'))
  return choix
}

// Les grimoires / livres de sorts ne sont jamais réservés.
var REGEX_GRIMOIRE = /(spell_?book|grimoire|_book$|^book_|tome|codex|palette|journal|necronomicon|bible)/

function estGrimoire(idObjet) {
  var chemin = String(idObjet).split(':').pop()
  return REGEX_GRIMOIRE.test(chemin)
}

// Résultat mis en cache par identifiant d'objet (la table est statique) : sans cela chaque contrôle d'un objet parcourait toutes les règles
// (des centaines d'expressions régulières) à chaque tick et pour chaque joueur.
var CACHE_RESTRICTION = {}
function restriction(idObjet) {
  var cle = '_' + idObjet
  var c = CACHE_RESTRICTION[cle]
  if (c !== undefined) return c === false ? null : c
  var res = restrictionCalc(idObjet)
  CACHE_RESTRICTION[cle] = res === null ? false : res
  return res
}
function restrictionCalc(idObjet) {
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
// Classes supprimées : le joueur qui en avait une reçoit automatiquement une nouvelle classe (tirage du Maître du Destin).
var CLASSES_SUPPRIMEES = ['Évocateur', 'Ésotériste']
function migrerClasseSupprimee(server, joueur) {
  try {
    var data = joueur.persistentData
    if (!data.contains(CLE)) return false
    var ancien = String(data.getString(CLE))
    if (CLASSES_SUPPRIMEES.indexOf(ancien) === -1) return false
    var nouvelle = tirerRare(server, null)
    console.info('[classes_rp] Classe supprimée : ' + joueur.username + ' ' + ancien + ' -> ' + nouvelle.nom)
    appliquerClasse(server, joueur, nouvelle, true)
    joueur.tell(Text.gold('La classe ' + ancien + ' n\'existe plus : tu deviens ').append(Text.yellow(nouvelle.nom).bold()).append(Text.gold('.')))
    return true
  } catch (e) { console.error('[classes_rp] migration de classe : ' + e); return false }
}

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

  if (migrerClasseSupprimee(server, joueur)) return
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

  // Pas de choix : l'étoile est prise, la nouvelle classe s'applique tout de suite et compte pour 1 changement.
  var nouvelle = tirerRare(server, classe.nom)
  cmd(server, 'clear ' + joueur.username + ' ' + ENCRE + ' ' + COUT_ENCRE)
  data.putInt(CLE_REROLLS, utilises + 1)
  data.putString(CLE, nouvelle.nom)
  data.putBoolean(CLE_TEST, false)
  appliquerClasse(server, joueur, nouvelle, true)
  annoncer(server, joueur, nouvelle, 'Ton destin a changé.')
  try { ftbFait(joueur, 'destin') } catch (eF) {}
  // Message à l'écran de tous les autres joueurs : « X a réécrit son destin. » (seulement auprès du Maître du Destin)
  try {
    var nomJ = String(joueur.username)
    cmd(server, 'title @a[name=!' + nomJ + '] times 20 80 20')
    cmd(server, 'title @a[name=!' + nomJ + '] title {"translate":"mcrp.msg.destin_reecrit","with":["' + nomJ + '"],"fallback":"%s a réécrit son destin.","color":"gold"}')
  } catch (eT) { console.error('[classes_rp] message de destin : ' + eT) }
}

function destinParPnj(source) {
  try { if (source.hasPermission(2)) return true } catch (e) {}
  try { var ent = source.entity; return !!ent && String(ent.type).indexOf('easy_npc:') === 0 } catch (e2) { return false }
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
      // jamais un sort désactivé, ni un sort réservé aux cours (/cours) ou « pour tous »
      try { if (typeof desactSortInterdit === 'function' && desactSortInterdit(id)) continue } catch (eD) {}
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
    var texteRarete = rareteNom === 'COMMON' ? Text.of('commun') : Text.translate(rareteNom === 'LEGENDARY' ? 'mcrp.rarete.legendary' : (rareteNom === 'EPIC' ? 'mcrp.rarete.epic' : (rareteNom === 'UNCOMMON' ? 'mcrp.rarete.uncommon' : 'mcrp.rarete.rare')))
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

// Argument « classe » de /classe edit (texte libre avec propositions des noms de classes).
function editerClasseArg(Commands, Arguments, event) {
  var arg = Commands.argument('classe', Arguments.GREEDY_STRING.create(event))
  try {
    arg = arg.suggests(function (ctx, builder) {
      for (var i = 0; i < CLASSES.length; i++) builder.suggest(CLASSES[i].nom)
      return builder.buildFuture()
    })
  } catch (e) { console.error('[classes_rp] suggestions /classe edit : ' + e) }
  return arg.executes(function (ctx) {
    return cmdClasseEdit(ctx, Arguments.PLAYER.getResult(ctx, 'joueur'), String(Arguments.GREEDY_STRING.getResult(ctx, 'classe')).trim())
  })
}

// /classe edit <joueur> <classe> : change la classe actuelle d'un joueur, sans annonce (ni titre, ni chat). Ne compte pas comme un changement.
function classeParTexte(texte) {
  var norm = function (t) {
    return String(t).toLowerCase().replace(/[àâä]/g, 'a').replace(/[éèêë]/g, 'e').replace(/[îï]/g, 'i').replace(/[ôö]/g, 'o').replace(/[ûùü]/g, 'u').replace(/ç/g, 'c').replace(/[^a-z0-9]+/g, ' ').trim()
  }
  var voulu = norm(texte)
  if (voulu === 'pretre') voulu = 'paladin'
  for (var i = 0; i < CLASSES.length; i++) {
    if (norm(CLASSES[i].nom) === voulu) return CLASSES[i]
  }
  return null
}
function cmdClasseEdit(ctx, cible, texte) {
  try {
    var classe = classeParTexte(texte)
    if (!classe) {
      var noms = []
      for (var i = 0; i < CLASSES.length; i++) noms.push(CLASSES[i].nom)
      retour(ctx, 'Classe inconnue : « ' + texte + ' ». Classes : ' + noms.join(', ') + '.')
      return 0
    }
    cible.persistentData.putString(CLE, classe.nom)
    cible.persistentData.putBoolean(CLE_TEST, false)
    appliquerClasse(ctx.source.server, cible, classe, true)
    retour(ctx, cible.username + ' est maintenant ' + classe.nom + ' (sans annonce).')
    console.info('[classes_rp] /classe edit : ' + cible.username + ' -> ' + classe.nom)
    return 1
  } catch (e) {
    console.error('[classes_rp] Erreur dans /classe edit : ' + e)
    retour(ctx, 'Erreur (voir logs/kubejs/server.log).')
    return 0
  }
}

// /classe reroll <joueur> <classe> : change la classe comme un reroll du Maître du Destin (titre « Ton destin a changé. » au milieu de l'écran
// du joueur + « X a réécrit son destin. » aux autres), mais en choisissant la classe ; sans encre et sans compter comme un changement.
function rerollArg(Commands, Arguments, event) {
  var arg = Commands.argument('classe', Arguments.GREEDY_STRING.create(event))
  try {
    arg = arg.suggests(function (ctx, builder) {
      for (var i = 0; i < CLASSES.length; i++) builder.suggest(CLASSES[i].nom)
      return builder.buildFuture()
    })
  } catch (e) { console.error('[classes_rp] suggestions /classe reroll : ' + e) }
  return arg.executes(function (ctx) {
    return cmdClasseReroll(ctx, Arguments.PLAYER.getResult(ctx, 'joueur'), String(Arguments.GREEDY_STRING.getResult(ctx, 'classe')).trim())
  })
}
function cmdClasseReroll(ctx, cible, texte) {
  try {
    var classe = classeParTexte(texte)
    if (!classe) {
      var noms = []
      for (var i = 0; i < CLASSES.length; i++) noms.push(CLASSES[i].nom)
      retour(ctx, 'Classe inconnue : « ' + texte + ' ». Classes : ' + noms.join(', ') + '.')
      return 0
    }
    var server = ctx.source.server
    cible.persistentData.putString(CLE, classe.nom)
    cible.persistentData.putBoolean(CLE_TEST, false)
    appliquerClasse(server, cible, classe, true)
    annoncer(server, cible, classe, 'Ton destin a changé.')
    try {
      var nomJ = String(cible.username)
      cmd(server, 'title @a[name=!' + nomJ + '] times 20 80 20')
      cmd(server, 'title @a[name=!' + nomJ + '] title {"translate":"mcrp.msg.destin_reecrit","with":["' + nomJ + '"],"fallback":"%s a réécrit son destin.","color":"gold"}')
    } catch (eT) { console.error('[classes_rp] message de destin : ' + eT) }
    retour(ctx, cible.username + ' est maintenant ' + classe.nom + ' (reroll annoncé, sans encre ni compteur).')
    console.info('[classes_rp] /classe reroll : ' + cible.username + ' -> ' + classe.nom)
    return 1
  } catch (e) {
    console.error('[classes_rp] Erreur dans /classe reroll : ' + e)
    retour(ctx, 'Erreur (voir logs/kubejs/server.log).')
    return 0
  }
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


// ───────────── /cours : les professeurs donnent les sorts « pour tous », un par un, dans un ordre de priorité ─────────────
// Les sorts ouverts à tous (liste « * » de SORTS_PAR_CLASSE) ne sont plus offerts au départ : un professeur (opérateur) lance
// /cours. Chaque élève présent dans le dôme (sphère) reçoit LE PREMIER sort de COURS_ORDRE qu'il n'a pas encore : celui qui a
// déjà le n°1 reçoit le n°2, etc. Un sort par commande et par élève. Les sorts de l'école Indicible (Occulte / Prismatique,
// dont le Portail Prismatique) ne sont jamais donnés. Pour changer l'ordre : modifier COURS_ORDRE (les sorts « pour tous »
// qui n'y figurent pas sont ajoutés à la fin, par ordre de rareté : du plus commun au plus rare).
var COURS = { X: 1088, Y: 543, Z: 1350, RAYON: 16, DIMENSION: 'minecraft:overworld' }
var COURS_ORDRE = [
  'irons_spellbooks:recall',                    // 1. Rappel
  'apprenticecodex:mana_mending',               // 2. Réparation de Mana
  'apprenticecodex:search_beacon'               // 3. Balise de Recherche
  // puis TOUS les autres sorts « pour tous » (hors Indicible), par ordre de rareté (commun -> légendaire), voir coursOrdre()
]
var COURS_ECOLES_EXCLUES = /eldritch|occult|ritual|prismatic/
var COURS_CACHE = null
var COURS_CLE = 'cours_sorts'
var UnlockAttachJ = null
var coursAvertiCodex = false

// Ordre de priorité (identique pour tous) : COURS_ORDRE, puis les autres sorts « pour tous », hors Indicible.
function coursOrdre() {
  if (COURS_CACHE) return COURS_CACHE
  var existe = {}
  var liste = SpellRegistryJ.getEnabledSpells()
  for (var i = 0; i < liste.size(); i++) {
    try {
      var sort = liste.get(i)
      var id = String(sort.getSpellId())
      var perm = SORTS_PAR_CLASSE[id]
      if (!perm || perm.indexOf('*') === -1) continue
      var ecole = String(sort.getSchoolType().getId())
      var rar = 0
      try { rar = Number(sort.getRarity(1).getValue()) } catch (e0) {}
      existe[id] = { id: id, rar: rar, indicible: COURS_ECOLES_EXCLUES.test(ecole) }
    } catch (e) { /* sort ignoré */ }
  }
  var ordre = [], vu = {}
  var ajouter = function (id) {
    if (!existe[id] || vu[id]) return
    if (existe[id].indicible && COURS_ORDRE.indexOf(id) < 0) return // Indicible exclu, sauf s'il est dans COURS_ORDRE (Rappel)
    vu[id] = true; ordre.push(id)
  }
  for (var a = 0; a < COURS_ORDRE.length; a++) ajouter(COURS_ORDRE[a])
  var reste = []
  for (var id2 in existe) reste.push(existe[id2])
  reste.sort(function (x, y) { return (x.rar - y.rar) || (x.id < y.id ? -1 : (x.id > y.id ? 1 : 0)) })
  for (var f = 0; f < reste.length; f++) ajouter(reste[f].id)
  COURS_CACHE = ordre
  return ordre
}

// Le joueur a-t-il déjà découvert ce sort (Spell Codex) ? En cas d'échec de la lecture : suivi tenu par /cours.
function coursADejaLeSort(joueur, id) {
  try {
    if (!UnlockAttachJ) UnlockAttachJ = Java.loadClass('com.specs.irons_spellbooks.unlock.SpellUnlockAttachments')
    var donnees = joueur.getData(UnlockAttachJ.UNLOCKS)
    return !!donnees.isSpellUnlocked(ResourceLocationJ.tryParse(id))
  } catch (e) {
    if (!coursAvertiCodex) { coursAvertiCodex = true; console.error('[cours] lecture du Spell Codex impossible, suivi interne utilisé : ' + e) }
  }
  try { return String(joueur.persistentData.getString(COURS_CLE)).indexOf('|' + id + '|') >= 0 } catch (e2) {}
  return false
}

// Donne au joueur le premier sort de son ordre qu'il n'a pas. Retourne { etat: 'ok'|'tout'|'aucune_classe', id }.
function coursDonner(server, joueur) {
  var classe = classeDe(joueur)
  if (!classe) return { etat: 'aucune_classe' }
  var ordre = coursOrdre()
  // Source de vérité : le suivi interne de /cours (un sort n'est noté qu'une fois donné par /cours).
  // On ne se fie plus à la lecture du Codex, qui peut renvoyer « déjà découvert » pour des sorts jamais donnés.
  var suivi = ''
  try { suivi = String(joueur.persistentData.getString(COURS_CLE)) } catch (e0) {}
  for (var i = 0; i < ordre.length; i++) {
    var id = ordre[i]
    if (suivi.indexOf('|' + id + '|') >= 0) continue
    // UN SEUL sort par appel : on le note d'abord, on le débloque, on s'arrête.
    try { joueur.persistentData.putString(COURS_CLE, suivi + '|' + id + '|') } catch (e2) {}
    var okC = codexDebloquer(server, joueur, id)
    console.info('[cours] ' + joueur.username + ' reçoit ' + id + ' (n°' + (i + 1) + '/' + ordre.length + ')' + (okC === false ? ' — ÉCHEC du déblocage' : ''))
    return { etat: 'ok', id: id }
  }
  return { etat: 'tout' }
}

function coursDimensionOk(joueur) {
  var d = null
  try { d = String(joueur.level.dimension) } catch (e) {}
  if (!d || d === 'undefined' || d === 'null') { try { d = String(joueur.level.getDimension()) } catch (e2) {} }
  if (!d || d === 'undefined' || d === 'null') return true
  return d.indexOf('overworld') >= 0
}

// Élèves (non opérateurs) dans la sphère de centre (cx, cy, cz).
function coursEleves(server, cx, cy, cz, rayon) {
  var res = []
  var joueurs = server.players
  for (var i = 0; i < joueurs.length; i++) {
    var p = joueurs[i]
    try {
      var dx = p.x - cx, dy = p.y - cy, dz = p.z - cz
      var dist = Math.sqrt(dx * dx + dy * dy + dz * dz)
      // Journal des joueurs proches mais écartés (pour comprendre qui n'a rien reçu)
      if (p.hasPermissions(2)) { if (dist <= rayon * 3) console.info('[cours] ' + p.username + ' ignoré : opérateur'); continue }
      if (!coursDimensionOk(p)) continue
      if (dist <= rayon) res.push(p)
      else if (dist <= rayon * 3) console.info('[cours] ' + p.username + ' ignoré : hors de la zone (' + Math.round(dist) + ' blocs du centre, rayon ' + rayon + ')')
    } catch (e) { console.error('[cours] ' + e) }
  }
  return res
}

function cmdCours(ctx, cx, cy, cz, rayon) {
  try {
    var server = ctx.source.server
    var eleves = coursEleves(server, cx, cy, cz, rayon)
    if (eleves.length === 0) {
      retour(ctx, 'Aucun élève dans la zone (' + Math.round(cx) + ' ' + Math.round(cy) + ' ' + Math.round(cz) + ', rayon ' + rayon + '). Les opérateurs sont ignorés.')
      return 0
    }
    var donnes = 0
    for (var i = 0; i < eleves.length; i++) {
      var el = eleves[i]
      var r = coursDonner(server, el)
      if (r.etat === 'ok') {
        donnes++
        var parts = r.id.split(':')
        el.tell(Text.translate('mcrp.msg.cours_sort', Text.translate('spell.' + parts[0] + '.' + parts[1]).gold()).green())
        retour(ctx, el.username + ' (' + classeDe(el).nom + ') : ' + r.id)
      } else if (r.etat === 'tout') {
        retour(ctx, el.username + ' : a déjà tous les sorts de la liste.')
        console.info('[cours] ' + el.username + ' : a déjà tous les sorts de la liste')
      } else {
        retour(ctx, el.username + ' : pas de classe, ignoré.')
        console.info('[cours] ' + el.username + ' ignoré : pas de classe')
      }
    }
    retour(ctx, donnes + '/' + eleves.length + ' élève(s) ont reçu un sort.')
    return donnes
  } catch (e) {
    console.error('[cours] Erreur : ' + e)
    retour(ctx, 'Erreur dans /cours (voir le journal du serveur).')
    return 0
  }
}

// /cours ordre <joueur> : affiche l'ordre de priorité (✔ = sort déjà reçu par ce joueur).
function cmdCoursOrdre(ctx, cible) {
  var classe = classeDe(cible)
  if (!classe) { retour(ctx, cible.username + ' n\'a pas de classe.'); return 0 }
  var ordre = coursOrdre()
  retour(ctx, 'Ordre de priorité (' + ordre.length + ' sorts pour tous) :')
  var ligne = ''
  for (var i = 0; i < ordre.length; i++) {
    ligne += (i + 1) + '. ' + (coursADejaLeSort(cible, ordre[i]) ? '✔ ' : '') + ordre[i] + '   '
    if ((i + 1) % 6 === 0 || i === ordre.length - 1) { retour(ctx, ligne); ligne = '' }
  }
  return 1
}


// ───────────── /inventaire <joueur> [enderchest] et /codex <joueur> [ajouter|retirer <sort>] (modérateurs) ─────────────
// /inventaire : ouvre l'inventaire du joueur (en ligne) en direct : clic gauche = prendre l'objet, clic droit = en copier un exemplaire.
//   Rangée 1 = barre d'action, rangées 2 à 4 = sac, rangée 5 = bottes, jambières, plastron, casque, main secondaire.
// /codex : liste les sorts découverts (Spell Codex) du joueur, par école ; ajouter / retirer un sort (identifiant complet, ex. irons_spellbooks:fireball).
// Interfaces KubeJS (openChestGUI) : les emplacements sont reliés EN DIRECT à l'inventaire du joueur ciblé.
// Clic gauche : prend l'objet pour le modérateur (retiré du joueur) ; clic droit : en reçoit une copie sans rien retirer.
function invPrise(admin, sl) {
  sl.setLeftClicked(function () {
    var st = sl.getItem()
    if (st.isEmpty()) return
    admin.give(st.copy())
    sl.setItem(Item.of('minecraft:air'))
  })
  sl.setRightClicked(function () {
    var st = sl.getItem()
    if (!st.isEmpty()) admin.give(st.copy())
  })
}

function cmdInventaire(ctx, cible, ender) {
  try {
    var admin = ctx.source.player
    if (!admin) { retour(ctx, 'À lancer en jeu.'); return 0 }
    console.info('[inventaire] ' + admin.username + ' demande ' + (ender ? 'le coffre de l\'Ender' : 'l\'inventaire') + ' de ' + cible.username)
    var titre = Text.of((ender ? 'Coffre de l\'Ender de ' : 'Inventaire de ') + cible.username)
    if (ender) {
      var ec = cible.getEnderChestInventory()
      admin.openChestGUI(titre, 3, function (gui) {
        for (var n = 0; n < 27; n++) {
          (function (n) { gui.slot(n % 9, Math.floor(n / 9), function (sl) { sl.inventory = ec; sl.inventorySlot = n; invPrise(admin, sl) }) })(n)
        }
      })
    } else {
      var inv = cible.getInventory()
      // rangée 0 : casque, plastron, jambières, bottes, (vide), main secondaire ; rangées 1-3 : sac ; rangée 4 : barre d'action
      var plan = [[0, 0, 39], [1, 0, 38], [2, 0, 37], [3, 0, 36], [5, 0, 40]]
      for (var k = 0; k < 27; k++) plan.push([k % 9, 1 + Math.floor(k / 9), 9 + k])
      for (var h = 0; h < 9; h++) plan.push([h, 4, h])
      admin.openChestGUI(titre, 5, function (gui) {
        for (var q = 0; q < plan.length; q++) {
          (function (p) { gui.slot(p[0], p[1], function (sl) { sl.inventory = inv; sl.inventorySlot = p[2]; invPrise(admin, sl) }) })(plan[q])
        }
      })
    }
    console.info('[inventaire] ouvert pour ' + admin.username)
    return 1
  } catch (e) {
    console.error('[inventaire] ' + e)
    retour(ctx, 'Impossible d\'ouvrir l\'inventaire : ' + e)
    return 0
  }
}

// /codex <joueur> : ouvre une fenêtre (lecture seule) avec les sorts découverts du joueur, par école ; pages si > 45 sorts.
function codexIds(cible) {
  if (!UnlockAttachJ) UnlockAttachJ = Java.loadClass('com.specs.irons_spellbooks.unlock.SpellUnlockAttachments')
  var donnees = cible.getData(UnlockAttachJ.UNLOCKS)
  var ids = []
  var it = donnees.getDiscoveredSpells().iterator()
  while (it.hasNext()) ids.push(String(it.next()))
  var out = []
  for (var i = 0; i < ids.length; i++) {
    var ecole = '?'
    try { ecole = String(SpellRegistryJ.getSpell(ResourceLocationJ.tryParse(ids[i])).getSchoolType().getId()).split(':').pop() } catch (e0) {}
    out.push({ id: ids[i], ecole: ecole })
  }
  out.sort(function (a, b) { return a.ecole < b.ecole ? -1 : a.ecole > b.ecole ? 1 : (a.id < b.id ? -1 : a.id > b.id ? 1 : 0) })
  return out
}

var CODEX_ICONES = { fire: 'minecraft:blaze_powder', ice: 'minecraft:snowball', lightning: 'minecraft:lightning_rod', holy: 'minecraft:glowstone_dust', ender: 'minecraft:ender_pearl', blood: 'minecraft:redstone', evocation: 'minecraft:totem_of_undying', nature: 'minecraft:oak_sapling', eldritch: 'minecraft:sculk' }

function codexOuvrir(admin, cible, liste, page) {
  var parPage = 45
  var pages = Math.max(1, Math.ceil(liste.length / parPage))
  if (page < 0) page = 0
  if (page >= pages) page = pages - 1
  var titre = Text.of('Codex de ' + cible.username + ' (' + liste.length + ') — page ' + (page + 1) + '/' + pages)
  admin.openChestGUI(titre, 6, function (gui) {
    for (var n = 0; n < parPage; n++) {
      var idx = page * parPage + n
      if (idx >= liste.length) break
      var sp = liste[idx]
      var icone = CODEX_ICONES[sp.ecole] || 'minecraft:book'
      var stack = Item.of(icone)
      try { stack = stack.withName(Text.yellow(sp.ecole + ' · ').append(Text.translate('spell.' + sp.id.replace(':', '.')).white())) } catch (eN) {}
      ;(function (n, stack) { gui.slot(n % 9, Math.floor(n / 9), function (sl) { sl.setItem(stack) }) })(n, stack)
    }
    var info = Item.of('minecraft:paper')
    try { info = info.withName(Text.gold('/codex ' + cible.username + ' ajouter|retirer <sort>')) } catch (eI) {}
    gui.slot(4, 5, function (sl) { sl.setItem(info) })
    if (page > 0) {
      var pr = Item.of('minecraft:arrow')
      try { pr = pr.withName(Text.white('Page précédente')) } catch (eP) {}
      gui.slot(3, 5, function (sl) { sl.setItem(pr); sl.setLeftClicked(function () { codexOuvrir(admin, cible, liste, page - 1) }) })
    }
    if (page < pages - 1) {
      var su = Item.of('minecraft:arrow')
      try { su = su.withName(Text.white('Page suivante')) } catch (eS) {}
      gui.slot(5, 5, function (sl) { sl.setItem(su); sl.setLeftClicked(function () { codexOuvrir(admin, cible, liste, page + 1) }) })
    }
  })
}

function cmdCodexVoir(ctx, cible) {
  try {
    var admin = ctx.source.player
    var liste = codexIds(cible)
    if (!admin) { retour(ctx, 'Codex de ' + cible.username + ' : ' + liste.length + ' sort(s)'); return 1 }
    console.info('[codex] ' + admin.username + ' ouvre le codex de ' + cible.username + ' (' + liste.length + ' sorts)')
    codexOuvrir(admin, cible, liste, 0)
    return 1
  } catch (e) {
    console.error('[codex] ' + e)
    retour(ctx, 'Lecture du codex impossible : ' + e)
    return 0
  }
}

var CODEX_ADMIN = {}   // uuid -> tick du dernier changement de palier fait par un op (à ne pas annuler)

// /codex <joueur> niveau <n> <sort> : fixe le palier (niveau lançable / montable) d'un sort découvert, sans coût d'XP.
function cmdCodexNiveau(ctx, cible, sort, n) {
  try {
    if (!UnlockAttachJ) UnlockAttachJ = Java.loadClass('com.specs.irons_spellbooks.unlock.SpellUnlockAttachments')
    var rl = ResourceLocationJ.tryParse(sort)
    var d = cible.getData(UnlockAttachJ.UNLOCKS)
    if (!rl || !d.isSpellUnlocked(rl)) { retour(ctx, 'Sort inconnu ou non découvert : ' + sort); return 0 }
    var max = Number(SpellRegistryJ.getSpell(rl).getMaxLevel())
    n = Math.max(1, Math.min(n, max))
    CODEX_ADMIN[String(cible.uuid)] = cible.server.tickCount
    d.setUnlockedTier(rl, n)
    Java.loadClass('com.specs.irons_spellbooks.unlock.UnlockNetworking').applyAccessAndSync(cible)
    retour(ctx, cible.username + ' : ' + sort + ' au niveau ' + n + ' (max ' + max + ')')
    return 1
  } catch (e) {
    console.error('[codex] niveau : ' + e)
    retour(ctx, 'Échec : ' + e)
    return 0
  }
}

// Débloque un sort dans le Codex d'un joueur : ouvre aussi l'école du sort (sans elle le Codex ne l'affiche pas),
// lance les commandes en mode visible (leur réponse ou leur erreur arrive dans le journal), puis vérifie le résultat.
// Retourne true si le sort est bien débloqué, false sinon, null si la vérification est impossible.
function codexDebloquer(server, joueur, id) {
  var nom = String(joueur.username)
  var ecole = null
  try { ecole = ecoleDuSort(id) } catch (e0) {}
  // Directement par l'API du Codex (et non par commande) : lancée depuis une commande comme /codex, une commande
  // imbriquée n'est exécutée qu'APRÈS elle (file d'exécution de Minecraft 1.21) et la vérification lisait l'ancien état.
  var fait = false
  try {
    if (!UnlockAttachJ) UnlockAttachJ = Java.loadClass('com.specs.irons_spellbooks.unlock.SpellUnlockAttachments')
    var dd = joueur.getData(UnlockAttachJ.UNLOCKS)
    if (ecole) dd.setSchoolUnlocked(ResourceLocationJ.tryParse(ecole), true)
    dd.setSpellUnlocked(ResourceLocationJ.tryParse(id), true)
    Java.loadClass('com.specs.irons_spellbooks.unlock.UnlockNetworking').applyAccessAndSync(joueur)
    fait = true
  } catch (eA) { console.error('[codex] déblocage direct ' + nom + ' ' + id + ' -> ' + eA) }
  if (!fait) {
    coursNoter(joueur, id)
    try { if (ecole) server.runCommand('specs_codex school unlock ' + nom + ' ' + ecole) } catch (e1) { console.error('[codex] school unlock ' + nom + ' ' + ecole + ' -> ' + e1) }
    try { server.runCommand('specs_codex spell unlock ' + nom + ' ' + id) } catch (e2) { console.error('[codex] spell unlock ' + nom + ' ' + id + ' -> ' + e2) }
  }
  if (fait) coursNoter(joueur, id)   // sort « pour tous » (cours) donné par /codex ajouter : n'est plus reverrouillé
  var ok = null
  try {
    if (!UnlockAttachJ) UnlockAttachJ = Java.loadClass('com.specs.irons_spellbooks.unlock.SpellUnlockAttachments')
    ok = !!joueur.getData(UnlockAttachJ.UNLOCKS).isSpellUnlocked(ResourceLocationJ.tryParse(id))
  } catch (e3) { console.error('[codex] vérification ' + nom + ' ' + id + ' -> ' + e3) }
  console.info('[codex] ' + nom + ' : ' + id + ' (école ' + ecole + ') -> ' + (ok === true ? 'débloqué' : ok === false ? 'ÉCHEC : toujours verrouillé' : 'vérification impossible'))
  return ok
}
function cmdCodexModifier(ctx, cible, sort, ajouter) {
  sort = String(sort).trim()
  if (!/^[a-z0-9_.-]+:[a-z0-9_.\/-]+$/.test(sort)) { retour(ctx, 'Identifiant invalide : ' + sort + ' (format namespace:sort)'); return 0 }
  if (ajouter) {
    var ok = codexDebloquer(ctx.source.server, cible, sort)
    retour(ctx, (ok === false ? 'ÉCHEC : le sort reste verrouillé pour ' : 'Sort ajouté au codex de ') + cible.username + ' : ' + sort + (ok === false ? ' (voir le journal du serveur)' : ''))
    return ok === false ? 0 : 1
  }
  cmd(ctx.source.server, 'specs_codex spell lock ' + cible.username + ' ' + sort)
  coursOublier(cible, sort)   // un sort de cours retiré pourra être redonné par /cours
  retour(ctx, 'Sort retiré du codex de ' + cible.username + ' : ' + sort)
  return 1
}

// ---- /tpa : demandes de téléportation entre joueurs ----
var TPA_DELAI_MS = 60000
var TPA_DEMANDES = {} // clé = nom du destinataire (minuscule) -> { de, vers: 'moi'|'lui', t }

function tpaEnvoyer(ctx, cible, versLui) {
  var src = ctx.source.player
  if (!src) { retour(ctx, 'Commande à lancer par un joueur.'); return 0 }
  if (String(cible.username) === String(src.username)) { retour(ctx, 'Tu ne peux pas te cibler toi-même.'); return 0 }
  TPA_DEMANDES[String(cible.username).toLowerCase()] = { de: String(src.username), versLui: versLui, t: Date.now() }
  src.tell(Text.gold('Demande envoyée à ' + cible.username + ' (valable 60 s).'))
  cible.tell(Text.gold(src.username + (versLui ? ' veut se téléporter sur toi.' : ' te demande de le rejoindre.') + ' Tape ').append(Text.yellow('/tpaccept')).append(Text.gold(' ou ')).append(Text.yellow('/tpdeny')).append(Text.gold('.')))
  return 1
}

function tpaRepondre(ctx, accepter) {
  var moi = ctx.source.player
  if (!moi) { retour(ctx, 'Commande à lancer par un joueur.'); return 0 }
  var cle = String(moi.username).toLowerCase()
  var d = TPA_DEMANDES[cle]
  if (!d || Date.now() - d.t > TPA_DELAI_MS) { delete TPA_DEMANDES[cle]; retour(ctx, 'Aucune demande de téléportation en attente.'); return 0 }
  delete TPA_DEMANDES[cle]
  var serveur = ctx.source.server
  var demandeur = serveur.getPlayerList().getPlayerByName(d.de)
  if (!demandeur) { retour(ctx, d.de + ' n\'est plus connecté.'); return 0 }
  if (!accepter) {
    demandeur.tell(Text.red(moi.username + ' a refusé ta demande.'))
    moi.tell(Text.gray('Demande refusée.'))
    return 1
  }
  // Animation Grand Teleport : réservée à /tpa, /warp, Waystones et au sort Rappel (tag lu par le mod pendant la commande)
  var voyageur = d.versLui ? demandeur : moi
  cmd(serveur, 'tag ' + voyageur.username + ' add gta_anim')
  try {
    if (d.versLui) cmd(serveur, 'tp ' + demandeur.username + ' ' + moi.username)
    else cmd(serveur, 'tp ' + moi.username + ' ' + demandeur.username)
  } finally {
    cmd(serveur, 'tag ' + voyageur.username + ' remove gta_anim')
  }
  demandeur.tell(Text.green(moi.username + ' a accepté.'))
  moi.tell(Text.green('Téléportation effectuée.'))
  return 1
}

function cmdRespawnReset(ctx, cible) {
  try {
    cible.setRespawnPosition(null, null, 0, false, false)
  } catch (e) {
    retour(ctx, 'Impossible de réinitialiser le point de réapparition : ' + e)
    return 0
  }
  retour(ctx, 'Point de réapparition (lit) supprimé pour ' + cible.username + ' : il réapparaîtra au spawn du monde.')
  return 1
}

ServerEvents.commandRegistry(function (event) {
  var Commands = event.commands
  var Arguments = event.arguments
  var estModo = function (source) { return source.hasPermission(2) }

  event.register(
    Commands.literal('tpa')
      .then(Commands.argument('joueur', Arguments.PLAYER.create(event))
        .executes(function (ctx) { return tpaEnvoyer(ctx, Arguments.PLAYER.getResult(ctx, 'joueur'), true) }))
  )
  event.register(
    Commands.literal('tpahere')
      .then(Commands.argument('joueur', Arguments.PLAYER.create(event))
        .executes(function (ctx) { return tpaEnvoyer(ctx, Arguments.PLAYER.getResult(ctx, 'joueur'), false) }))
  )
  event.register(Commands.literal('tpaccept').executes(function (ctx) { return tpaRepondre(ctx, true) }))
  event.register(Commands.literal('tpdeny').executes(function (ctx) { return tpaRepondre(ctx, false) }))
  event.register(
    Commands.literal('respawnreset').requires(estModo)
      .then(Commands.argument('joueur', Arguments.PLAYER.create(event))
        .executes(function (ctx) { return cmdRespawnReset(ctx, Arguments.PLAYER.getResult(ctx, 'joueur')) }))
  )

  event.register(
    Commands.literal('inventaire').requires(estModo)
      .then(Commands.argument('joueur', Arguments.PLAYER.create(event))
        .executes(function (ctx) { return cmdInventaire(ctx, Arguments.PLAYER.getResult(ctx, 'joueur'), false) })
        .then(Commands.literal('enderchest')
          .executes(function (ctx) { return cmdInventaire(ctx, Arguments.PLAYER.getResult(ctx, 'joueur'), true) })))
  )
  event.register(
    Commands.literal('codex').requires(estModo)
      .then(Commands.argument('joueur', Arguments.PLAYER.create(event))
        .executes(function (ctx) { return cmdCodexVoir(ctx, Arguments.PLAYER.getResult(ctx, 'joueur')) })
        .then(Commands.literal('ajouter')
          .then(Commands.argument('sort', Arguments.GREEDY_STRING.create(event))
            .executes(function (ctx) { return cmdCodexModifier(ctx, Arguments.PLAYER.getResult(ctx, 'joueur'), String(Arguments.GREEDY_STRING.getResult(ctx, 'sort')), true) })))
        .then(Commands.literal('niveau')
          .then(Commands.argument('niveau', Arguments.INTEGER.create(event))
            .then(Commands.argument('sort', Arguments.GREEDY_STRING.create(event))
              .executes(function (ctx) { return cmdCodexNiveau(ctx, Arguments.PLAYER.getResult(ctx, 'joueur'), String(Arguments.GREEDY_STRING.getResult(ctx, 'sort')).trim(), Number(Arguments.INTEGER.getResult(ctx, 'niveau'))) }))))
        .then(Commands.literal('retirer')
          .then(Commands.argument('sort', Arguments.GREEDY_STRING.create(event))
            .executes(function (ctx) { return cmdCodexModifier(ctx, Arguments.PLAYER.getResult(ctx, 'joueur'), String(Arguments.GREEDY_STRING.getResult(ctx, 'sort')), false) }))))
  )

  // /recompense sort <commun|peu_commun|rare|epique|legendaire> [joueur] : parchemin d'un sort aléatoire de la classe
  // du joueur, au premier niveau de cette rareté (sans joueur : soi-même). Perm. 2.
  var RECOMPENSE_RARETES = { commun: 'COMMON', peu_commun: 'UNCOMMON', rare: 'RARE', epique: 'EPIC', legendaire: 'LEGENDARY' }
  var recompenseSort = Commands.literal('sort')
  Object.keys(RECOMPENSE_RARETES).forEach(function (nomR) {
    var rar = RECOMPENSE_RARETES[nomR]
    recompenseSort = recompenseSort.then(Commands.literal(nomR)
      .executes(function (ctx) {
        var soi = ctx.source.player
        if (!soi) { retour(ctx, 'Précise un joueur : /recompense sort ' + nomR + ' <joueur>'); return 0 }
        return cmdRecompense(ctx, soi, rar)
      })
      .then(Commands.argument('joueur', Arguments.PLAYER.create(event))
        .executes(function (ctx) { return cmdRecompense(ctx, Arguments.PLAYER.getResult(ctx, 'joueur'), rar) })))
  })
  event.register(Commands.literal('recompense').requires(estModo).then(recompenseSort))

  // /cours : un sort pour chaque élève de la zone de cours ; /cours ici : autour du professeur ; /cours ordre <joueur>
  event.register(
    Commands.literal('cours')
      .requires(profOuOp)
      .executes(function (ctx) { return cmdCours(ctx, COURS.X, COURS.Y, COURS.Z, COURS.RAYON) })
      .then(Commands.literal('ici')
        .executes(function (ctx) {
          var pr = ctx.source.player
          if (!pr) { retour(ctx, 'Commande à lancer par un joueur.'); return 0 }
          return cmdCours(ctx, pr.x, pr.y, pr.z, COURS.RAYON)
        }))
      .then(Commands.literal('ordre')
        .then(Commands.argument('joueur', Arguments.PLAYER.create(event))
          .executes(function (ctx) { return cmdCoursOrdre(ctx, Arguments.PLAYER.getResult(ctx, 'joueur')) })))
  )

  event.register(
    Commands.literal('classe')
      .executes(function (ctx) { return cmdInfos(ctx) })
      .then(Commands.literal('info').executes(function (ctx) { return cmdInfos(ctx) }))
      // Bouton de la fenêtre du Maître du Destin (PNJ Easy NPC) : /classe destin pnj tirer <joueur>
      .then(Commands.literal('destin')
        .then(Commands.literal('pnj').requires(destinParPnj)
          .then(Commands.literal('tirer').then(Commands.argument('joueur', Arguments.PLAYER.create(event))
            .executes(function (ctx) { echangerClasse(ctx.source.server, Arguments.PLAYER.getResult(ctx, 'joueur'), true); return 1 })))))
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
      .then(Commands.literal('recompense_legendaire')
        .requires(estModo)
        .then(Commands.argument('joueur', Arguments.PLAYER.create(event))
          .executes(function (ctx) { return cmdRecompense(ctx, Arguments.PLAYER.getResult(ctx, 'joueur'), 'LEGENDARY') })))
      .then(Commands.literal('edit')
        .requires(estModo)
        .then(Commands.argument('joueur', Arguments.PLAYER.create(event))
          .then(editerClasseArg(Commands, Arguments, event))))
      .then(Commands.literal('reroll')
        .requires(estModo)
        .then(Commands.argument('joueur', Arguments.PLAYER.create(event))
          .then(rerollArg(Commands, Arguments, event))))
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
var DERNIER_RETRAIT = {}
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
  // Anti-boucle : si la même pièce est remise aussitôt (équipement automatique d'un mod), on ne spamme ni message, ni journal, ni resynchronisation.
  var cleR = String(joueur.uuid) + id, tR = joueur.tickCount, dR = DERNIER_RETRAIT[cleR]
  DERNIER_RETRAIT[cleR] = tR
  if (dR !== undefined && tR - dR < 40) return
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

// Vol plané : interdit à tout le monde (les élytres vanilla et l'armure Ignitium sont de toute façon désactivées). Les armures-ailes (Prismatique, Ignitium, Cursium, Ignis,
// armure de vol mécanique, Gabriel, robes d'Arbitrium...) et les ailes en curios sont gardées, mais sans le vol.
// Les armures-ailes passent par Caelus (attribut caelus:fall_flying, valeur 1 = vol autorisé) : on ajoute à chaque joueur un
// modificateur "x0" (la valeur tombe à 0 = vol refusé, serveur et client). stopFallFlying() reste en secours.
var CAELUS_ATTR = null, CAELUS_MOD_ID = null, CAELUS_OP = null, CAELUS_MOD_CLASSE = null, CAELUS_ERREUR = false
function modificateurPasDeVol(joueur) {
  if (CAELUS_ERREUR) return
  try {
    if (!CAELUS_ATTR) {
      var RL = Java.loadClass('net.minecraft.resources.ResourceLocation')
      var reg = Java.loadClass('net.minecraft.core.registries.BuiltInRegistries').ATTRIBUTE
      var opt = reg.getHolder(RL.parse('caelus:fall_flying'))
      if (!opt.isPresent()) { CAELUS_ERREUR = true; console.warn('[classes_rp] attribut caelus:fall_flying introuvable : seul stopFallFlying est utilisé'); return }
      CAELUS_ATTR = opt.get()
      CAELUS_MOD_ID = RL.parse('mcrp:pas_de_vol_plane')
      CAELUS_MOD_CLASSE = Java.loadClass('net.minecraft.world.entity.ai.attributes.AttributeModifier')
      CAELUS_OP = Java.loadClass('net.minecraft.world.entity.ai.attributes.AttributeModifier$Operation').ADD_MULTIPLIED_TOTAL
    }
    var inst = joueur.getAttribute(CAELUS_ATTR)
    if (!inst || inst.hasModifier(CAELUS_MOD_ID)) return
    inst.addTransientModifier(new CAELUS_MOD_CLASSE(CAELUS_MOD_ID, -1.0, CAELUS_OP))
  } catch (e) { CAELUS_ERREUR = true; console.error('[classes_rp] vol plané (Caelus) : ' + e) }
}

function interdireVolPlane(joueur) {
  if (joueur.tickCount % 20 === 0) modificateurPasDeVol(joueur)
  try {
    if (!joueur.isFallFlying()) return
    joueur.stopFallFlying()
  } catch (e) {}
}

try { var rPrism = restriction('crystal_chronicles:prismatic_knight_helmet'); console.info('[classes_rp] Armure prismatique : classes autorisées = ' + (rPrism ? rPrism.classes.join(', ') : 'toutes')) } catch (ePr) {}
var TICKS_RP = 0
PlayerEvents.tick(perfWrap('classes_rp:1725', function (event) {
  var joueur = event.player
  interdireVolPlane(joueur)
  // Compteur propre à chaque joueur (tickCount) : évite qu'un joueur soit toujours sauté quand leur nombre divise le pas.
  var t = joueur.tickCount
  if (t % 5 === 0) verifierMains(joueur, event.server)
  // Armure : vérifiée 1 tick sur 2 (seuls les emplacements non vides sont examinés).
  if (t % 2 === 0) {
    for (var i = 0; i < EMPLACEMENTS_ARMURE.length; i++) {
      traiterArmure(joueur, EMPLACEMENTS_ARMURE[i])
    }
  }
  if (t % 5 === 1) verifierCurios(joueur)
}))

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

ServerEvents.tick(perfWrap('classes_rp:1824', function (event) {
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
}))

// ───────────── Parchemins et pages de Codex : ramassables, mais inutilisables hors classe ─────────────
// Un joueur peut posséder n'importe quel parchemin ou page. Les sorts d'une autre classe ne peuvent ni être lancés
// (règle de lancer plus haut), ni être inscrits dans un grimoire (grimoire nettoyé ci-dessus), ni être appris
// par une page de Codex (clic droit annulé ci-dessous).
var ParcheminJ = null, PageCodexJ = null
try { PageCodexJ = Java.loadClass('com.specs.irons_spellbooks.item.CodexPageItem') } catch (e) {}
try { ParcheminJ = Java.loadClass('io.redspace.ironsspellbooks.item.Scroll') } catch (e) {}

// Sorts « pour tous » (liste « * ») : ils ne s'obtiennent QUE par /cours. Verrouillé tant que /cours ne l'a pas donné à ce joueur
// (sort de départ de la classe excepté), quelle que soit la façon de le découvrir (Codex, parchemin, page, encre...).
function coursVerrouille(joueur, id) {
  try {
    var perm = SORTS_PAR_CLASSE[id]
    if (!perm || perm.indexOf('*') === -1) return false
    if (String(joueur.persistentData.getString(SORT_DEBUT_CLE)) === id) return false
    return String(joueur.persistentData.getString(COURS_CLE)).indexOf('|' + id + '|') < 0
  } catch (e) { return false }
}

// Note un sort « pour tous » comme acquis (même suivi que /cours) : appris par une page de Codex ou donné par /codex ajouter,
// il reste dans le Codex au lieu d'être reverrouillé ; /cours passe alors au sort suivant.
function coursNoter(joueur, id) {
  try {
    var perm = SORTS_PAR_CLASSE[id]
    if (!perm || perm.indexOf('*') === -1) return
    var suivi = String(joueur.persistentData.getString(COURS_CLE))
    if (suivi.indexOf('|' + id + '|') < 0) joueur.persistentData.putString(COURS_CLE, suivi + '|' + id + '|')
  } catch (e) { console.error('[cours] note ' + id + ' : ' + e) }
}
function coursOublier(joueur, id) {
  try {
    var suivi = String(joueur.persistentData.getString(COURS_CLE))
    if (suivi.indexOf('|' + id + '|') >= 0) joueur.persistentData.putString(COURS_CLE, suivi.split('|' + id + '|').join(''))
  } catch (e) {}
}

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
      if (page && coursVerrouille(joueur, ids[k])) { coursNoter(joueur, ids[k]); continue }   // page de Codex (donnée par un op) : apprise
      if (coursVerrouille(joueur, ids[k])) {
        event.cancel()
        joueur.tell(Text.red('Ce sort ne s\'apprend qu\'en cours.'))
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

var CACHE_DECOUVERTS = {}
function reverrouillerDecouverts(serveur, joueur, classe) {
  if (!UnlocksJ) return
  var donnees = joueur.getData(UnlocksJ.get())
  if (!donnees) return
  var ens = donnees.getDiscoveredSpells()
  // Rien n'a changé depuis le dernier contrôle propre (même classe, même nombre de sorts) : on ne reparcourt qu'une fois par seconde.
  var cle = String(joueur.uuid), sig = classe.nom + '|' + ens.size()
  var c = CACHE_DECOUVERTS[cle]
  if (c && c.sig === sig && joueur.tickCount - c.t < 20) return
  CACHE_DECOUVERTS[cle] = { sig: sig, t: joueur.tickCount }
  var it = ens.iterator()
  var aVerrouiller = []
  while (it.hasNext()) {
    var id = String(it.next())
    if (sortInterditPourJoueur(classe, id) || coursVerrouille(joueur, id)) aVerrouiller.push(id)
  }
  for (var i = 0; i < aVerrouiller.length; i++) cmd(serveur, 'specs_codex spell lock ' + joueur.username + ' ' + aVerrouiller[i])
}

ServerEvents.tick(perfWrap('classes_rp:1905', function (event) {
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
}))

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

ServerEvents.tick(perfWrap('classes_rp:1935', function (event) {
  var serveur = event.server
  if (serveur.tickCount % 600 !== 0) return
  var joueurs = serveur.players
  for (var i = 0; i < joueurs.length; i++) {
    try { verrouillerSortsInterdits(serveur, joueurs[i], classeDe(joueurs[i])) } catch (e) {}
  }
}))

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
      var cleE = String(ent.uuid) + 'E' + String(vers.id), tE = ent.tickCount, dE = DERNIER_RETRAIT[cleE]
      DERNIER_RETRAIT[cleE] = tE
      if (dE !== undefined && tE - dE < 40) return
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
    var srcDB = event.getSource(), attaquant = null
    try { attaquant = srcDB.actual } catch (eA0) {}
    if (!attaquant) { try { attaquant = srcDB.getEntity() } catch (eA1) {} }
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

var ArmeContJ = null
function sortDeLArmeTenue(joueur, id) {
  try {
    if (!ArmeContJ) ArmeContJ = Java.loadClass('io.redspace.ironsspellbooks.api.spells.ISpellContainer')
    var mains = [joueur.mainHandItem, joueur.offHandItem]
    for (var i = 0; i < mains.length; i++) {
      var pile = mains[i]
      if (!pile || pile.isEmpty() || !ArmeContJ.isSpellContainer(pile)) continue
      if (!autorise(joueur, String(pile.id))) continue
      var c = ArmeContJ.get(pile)
      for (var k = 0; k < c.getMaxSpellCount(); k++) {
        var sd = c.getSpellAtIndex(k)
        if (sd && String(sd.getSpell().getSpellId()) === id) return true
      }
    }
  } catch (e) {}
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
  // Sort imprégné d'une arme tenue en main (et autorisée pour ce joueur) : il appartient à l'arme, pas à la classe
  // (ex. Vue planaire de la harpe du Barde). Les sorts désactivés restent bloqués (test ci-dessus).
  if (String(event.getCastSource()).toUpperCase().indexOf('SWORD') !== -1 && sortDeLArmeTenue(lanceur, id)) return
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

// NB : getClass() n'existe pas dans le moteur de script (Rhino) : on teste l'interface avec isInstance.
var IMAGIC_SUMMON = null
try { IMAGIC_SUMMON = Java.loadClass('io.redspace.ironsspellbooks.entity.mobs.IMagicSummon') } catch (e) {
  console.error('[classes_rp] interface IMagicSummon introuvable : ' + e)
}
function estInvocation(entite) {
  try { return !!(IMAGIC_SUMMON && (entite instanceof IMAGIC_SUMMON)) } catch (e) {}
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


// ───────────── Parchemin lu = sort appris AU NIVEAU du parchemin ─────────────
// Le Spell Codex transforme un parchemin en sort découvert mais ne retient que le niveau 1 : un parchemin de niveau 10 ou 14
// ne serait alors lançable qu'au niveau 1. On relève donc le palier du sort au niveau du parchemin consommé (jamais à la baisse) :
// le sort est lançable à ce niveau et le codex propose de le monter à partir de là.
function parchLire(pile) {
  var ISpellContainerJ = Java.loadClass('io.redspace.ironsspellbooks.api.spells.ISpellContainer')
  if (!ISpellContainerJ.isSpellContainer(pile)) return null
  var donnee = ISpellContainerJ.get(pile).getSpellAtIndex(0)
  if (!donnee) return null
  var sort = donnee.getSpell()
  if (!sort) return null
  return { id: String(sort.getSpellResource()), niveau: Number(donnee.getLevel()) }
}

// Jeté ou lâché au sol, un parchemin devient une page de codex (sans niveau) : on y inscrit le niveau d'origine,
// pour qu'une fois la page lue le sort soit appris à ce niveau.
var PAGE_ID = 'specs_irons_spellbooks:codex_page'
var PAGE_CLE_NIVEAU = 'mcrp_niveau'
var parchEnAttente = null
function parchEcrirePage(page, niveau) {
  var DC = Java.loadClass('net.minecraft.core.component.DataComponents')
  var CD = Java.loadClass('net.minecraft.world.item.component.CustomData')
  var CT = Java.loadClass('net.minecraft.nbt.CompoundTag')
  var cur = page.get(DC.CUSTOM_DATA)
  var tag = cur ? cur.copyTag() : new CT()
  tag.putInt(PAGE_CLE_NIVEAU, niveau)
  page.set(DC.CUSTOM_DATA, CD.of(tag))
}
function parchLirePage(page) {
  var DC = Java.loadClass('net.minecraft.core.component.DataComponents')
  var cur = page.get(DC.CUSTOM_DATA)
  if (!cur) return null
  var tag = cur.copyTag()
  if (!tag.contains(PAGE_CLE_NIVEAU)) return null
  var rl = Java.loadClass('com.specs.irons_spellbooks.item.CodexPageItem').getSpellId(page)
  if (!rl) return null
  return { id: String(rl), niveau: Number(tag.getInt(PAGE_CLE_NIVEAU)) }
}

function parchAppliquer(joueur, id, niveau) {
  if (!UnlockAttachJ) UnlockAttachJ = Java.loadClass('com.specs.irons_spellbooks.unlock.SpellUnlockAttachments')
  var rl = ResourceLocationJ.tryParse(id)
  var donnees = joueur.getData(UnlockAttachJ.UNLOCKS)
  if (!donnees.isSpellUnlocked(rl)) { console.info('[parchemin] ' + id + ' non découvert, palier inchangé'); return false }
  try { ftbFait(joueur, 'parchemin') } catch (eF) {}
  var cible = niveau
  try { cible = Math.min(niveau, Number(SpellRegistryJ.getSpell(rl).getMaxLevel())) } catch (e0) {}
  console.info('[parchemin] ' + id + ' : palier actuel ' + donnees.getUnlockedTier(rl) + ', parchemin ' + cible)
  if (cible <= donnees.getUnlockedTier(rl)) return true
  donnees.setUnlockedTier(rl, cible)
  Java.loadClass('com.specs.irons_spellbooks.unlock.UnlockNetworking').applyAccessAndSync(joueur)
  console.info('[parchemin] ' + joueur.username + ' apprend ' + id + ' au niveau ' + cible)
  return true
}

try {
  var EVT_PARCH = Java.loadClass('net.neoforged.neoforge.event.entity.player.PlayerInteractEvent$RightClickItem')
  var PRIO_PARCH = Java.loadClass('net.neoforged.bus.api.EventPriority').HIGHEST
  Java.loadClass('net.neoforged.neoforge.common.NeoForge').EVENT_BUS.addListener(PRIO_PARCH, false, EVT_PARCH, function (e) {
    try {
      var joueur = e.getEntity()
      if (!joueur || !joueur.isPlayer()) return
      var niveau = e.getLevel()
      var client = niveau.clientSide
      if (client === undefined || typeof client === 'function') client = niveau.isClientSide
      if (client === true) return
      var pile = e.getItemStack()
      if (!pile || pile.isEmpty()) return
      var idObjet = String(pile.id)
      if (idObjet !== 'irons_spellbooks:scroll' && idObjet !== PAGE_ID) return
      var lu = idObjet === PAGE_ID ? parchLirePage(pile) : parchLire(pile)
      console.info('[parchemin] ' + joueur.username + ' utilise un parchemin : ' + (lu ? lu.id + ' niveau ' + lu.niveau : 'illisible (' + idObjet + ', ' + (idObjet === PAGE_ID ? 'page sans niveau enregistré' : 'conteneur de sort absent') + ')'))
      if (!lu) return
      var main = e.getHand()
      var avant = pile.count
      var objet = pile.item
      joueur.server.scheduleInTicks(3, function () {
        try {
          var apres = joueur.getItemInHand(main)
          var consomme = apres.isEmpty() || apres.item !== objet || apres.count < avant
          console.info('[parchemin] ' + joueur.username + ' : parchemin ' + (consomme ? 'consommé' : 'non consommé'))
          if (!consomme) {
            // Page d'un sort déjà connu : Spell Codex la refuse (« déjà découvert ») et la garde. Si elle porte un niveau
            // supérieur au palier, on relève le palier et on la consomme nous-mêmes.
            if (idObjet !== PAGE_ID || apres.isEmpty() || apres.item !== objet) return
            if (!parchAppliquer(joueur, lu.id, lu.niveau)) return
            apres.shrink(1)
            return
          }
          parchAppliquer(joueur, lu.id, lu.niveau)
        } catch (e2) { console.error('[parchemin] ' + e2) }
      })
    } catch (err) {
      console.error('[parchemin] ' + err)
    }
  })
  console.info('[parchemin] Niveau des parchemins conservé dans le codex.')
} catch (e) {
  console.error('[parchemin] indisponible : ' + e)
}


// Avant Spell Codex (HIGHEST) : on retient le niveau du parchemin ; après lui (LOWEST) : on l'inscrit sur la page qui le remplace.
try {
  var EVT_TOSS = Java.loadClass('net.neoforged.neoforge.event.entity.item.ItemTossEvent')
  var EVT_JOIN = Java.loadClass('net.neoforged.neoforge.event.entity.EntityJoinLevelEvent')
  var BUS_PARCH = Java.loadClass('net.neoforged.neoforge.common.NeoForge').EVENT_BUS
  var PRIO_P = Java.loadClass('net.neoforged.bus.api.EventPriority')
  var avant = function (pile) {
    parchEnAttente = null
    try {
      if (pile && !pile.isEmpty() && String(pile.id) === 'irons_spellbooks:scroll') parchEnAttente = parchLire(pile)
    } catch (e1) {}
  }
  var apres = function (entiteObjet) {
    var lu = parchEnAttente
    parchEnAttente = null
    if (!lu) return
    try {
      var page = entiteObjet.getItem()
      if (page && !page.isEmpty() && String(page.id) === PAGE_ID) {
        // Un parchemin changé en page garde TOUJOURS son niveau (jeté par un joueur, butin de mob, coffre cassé...) :
        // un parchemin légendaire donne le sort au niveau légendaire. (Seules les pages déjà pages dans les coffres restent au plus bas.)
        var niveau = lu.niveau
        parchEcrirePage(page, niveau)
        console.info('[parchemin] page de ' + lu.id + ' marquée niveau ' + niveau)
      }
    } catch (e2) { console.error('[parchemin] marquage de la page : ' + e2) }
  }
  var cote = function (niveau) {
    var client = niveau.clientSide
    if (client === undefined || typeof client === 'function') client = niveau.isClientSide
    return client === true
  }
  BUS_PARCH.addListener(PRIO_P.HIGHEST, false, EVT_TOSS, function (e) {
    try { PARCH_JETE[String(e.getPlayer().uuid)] = e.getPlayer().server.tickCount } catch (x0) {}
    try { avant(e.getEntity().getItem()) } catch (x) {}
  })
  BUS_PARCH.addListener(PRIO_P.LOWEST, true, EVT_TOSS, function (e) { try { apres(e.getEntity()) } catch (x) {} })
  // Butin de mob : Spell Codex change les parchemins en pages pendant LivingDropsEvent (avant l'arrivée au sol) :
  // on lit les niveaux avant lui (HIGHEST) et on les inscrit sur les pages après lui (LOWEST).
  try {
    var EVT_DROPS = Java.loadClass('net.neoforged.neoforge.event.entity.living.LivingDropsEvent')
    var DROPS_LUS = null
    BUS_PARCH.addListener(PRIO_P.HIGHEST, false, EVT_DROPS, function (e) {
      DROPS_LUS = null
      try {
        if (cote(e.getEntity().level())) return
        var it = e.getDrops().iterator(), l = []
        while (it.hasNext()) {
          var ie = it.next(), pl = ie.getItem()
          if (pl && !pl.isEmpty() && String(pl.id) === 'irons_spellbooks:scroll') { var lu0 = parchLire(pl); if (lu0) l.push({ e: ie, lu: lu0 }) }
        }
        if (l.length) DROPS_LUS = l
      } catch (x) {}
    })
    BUS_PARCH.addListener(PRIO_P.LOWEST, true, EVT_DROPS, function (e) {
      var l = DROPS_LUS
      DROPS_LUS = null
      if (!l) return
      for (var i = 0; i < l.length; i++) {
        try {
          var pg = l[i].e.getItem()
          if (pg && !pg.isEmpty() && String(pg.id) === PAGE_ID) {
            parchEcrirePage(pg, l[i].lu.niveau)
            console.info('[parchemin] page de ' + l[i].lu.id + ' (butin de mob) marquée niveau ' + l[i].lu.niveau)
          }
        } catch (x2) { console.error('[parchemin] butin de mob : ' + x2) }
      }
    })
  } catch (eD) { console.error('[parchemin] butin de mob indisponible : ' + eD) }
  BUS_PARCH.addListener(PRIO_P.HIGHEST, false, EVT_JOIN, function (e) {
    try {
      var ent = e.getEntity()
      if (cote(e.getLevel()) || String(ent.type) !== 'minecraft:item') return
      avant(ent.getItem())
    } catch (x) {}
  })
  BUS_PARCH.addListener(PRIO_P.LOWEST, true, EVT_JOIN, function (e) {
    try {
      var ent = e.getEntity()
      if (cote(e.getLevel()) || String(ent.type) !== 'minecraft:item') return
      apres(ent)
    } catch (x) {}
  })
  console.info('[parchemin] Niveau conservé quand un parchemin est jeté ou lâché.')
} catch (e) {
  console.error('[parchemin] conservation du niveau indisponible : ' + e)
}


// ───────────── Apprentissage par le menu du codex (parchemin déposé dans le codex) ─────────────
// Spell Codex traite le clic droit sur un parchemin en priorité HIGHEST et annule l'évènement : aucun script ne le voit.
// Même chose pour le menu du codex. On surveille donc, toutes les 5 ticks, les parchemins/pages (avec niveau)
// portés par chaque joueur et les sorts découverts. Un sort qui vient d'être découvert alors que le joueur portait
// un parchemin de ce sort -> palier = niveau du parchemin. Sort déjà connu dont le parchemin disparaît pendant que
// le menu du codex est ouvert -> idem.
var PARCH_SUIVI = {}
var PARCH_JETE = {}   // uuid -> tick du dernier objet jeté   // uuid -> { vus: {id: niveau}, nb: {id: nombre}, connus: {id: true} }

function parchScanObjets(joueur) {
  var vus = {}, nb = {}
  var noter = function (pile) {
    try {
      if (!pile || pile.isEmpty()) return
      var idO = String(pile.id)
      var lu = null
      if (idO === 'irons_spellbooks:scroll') lu = parchLire(pile)
      else if (idO === PAGE_ID) lu = parchLirePage(pile)
      if (!lu) return
      if (!vus[lu.id] || vus[lu.id] < lu.niveau) vus[lu.id] = lu.niveau
      nb[lu.id] = (nb[lu.id] || 0) + pile.count
    } catch (e) {}
  }
  var inv = joueur.getInventory()
  for (var i = 0; i < inv.getContainerSize(); i++) noter(inv.getItem(i))
  try { noter(joueur.containerMenu.getCarried()) } catch (e1) {}
  return { vus: vus, nb: nb }
}

var CACHE_CONNUS = {}   // uuid -> { n, connus } : la liste n'est reparcourue que si le nombre de sorts découverts change (ou une fois par seconde)
function parchScanConnus(joueur) {
  if (!UnlockAttachJ) UnlockAttachJ = Java.loadClass('com.specs.irons_spellbooks.unlock.SpellUnlockAttachments')
  var ens = joueur.getData(UnlockAttachJ.UNLOCKS).getDiscoveredSpells()
  var cle = String(joueur.uuid), n = Number(ens.size()), t = joueur.tickCount
  var c = CACHE_CONNUS[cle]
  if (c && c.n === n && t - c.t < 20) return c.connus
  var connus = {}
  var it = ens.iterator()
  while (it.hasNext()) connus[String(it.next())] = true
  CACHE_CONNUS[cle] = { n: n, t: t, connus: connus }
  return connus
}

ServerEvents.tick(perfWrap('classes_rp:2371', function (event) {
  var serveur = event.server
  if (serveur.tickCount % 10 !== 0) return
  var joueurs = serveur.players
  for (var i = 0; i < joueurs.size(); i++) {
    var j = joueurs.get(i)
    try {
      var cle = String(j.uuid)
      var obj = parchScanObjets(j)
      var connus = parchScanConnus(j)
      var avant = PARCH_SUIVI[cle]
      if (avant) {
        // Parchemin disparu d'un sort déjà connu : compté comme lu seulement s'il n'a été ni jeté ni rangé dans un coffre.
        // (aucun menu ouvert = menu d'inventaire du joueur ; en cas de doute on considère le parchemin comme lu)
        var menuOk = true
        try {
          var menu = j.containerMenu
          if (menu != j.inventoryMenu) {
            var nomMenu = String(menu.getClass().getSimpleName())
            menuOk = nomMenu === 'InventoryMenu' || nomMenu.indexOf('SpellHud') >= 0 || nomMenu.indexOf('Creative') >= 0
          }
        } catch (eM) { menuOk = true }
        var jeteRecemment = PARCH_JETE[cle] && serveur.tickCount - PARCH_JETE[cle] < 20
        for (var id in avant.vus) {
          var nouveau = connus[id] && !avant.connus[id]
          var disparu = (obj.nb[id] || 0) < avant.nb[id]
          if (nouveau || (disparu && connus[id] && menuOk && !jeteRecemment)) {
            console.info('[parchemin] ' + j.username + ' : ' + id + (nouveau ? ' découvert' : ' parchemin consommé') + ' (parchemin niveau ' + avant.vus[id] + ')')
            parchAppliquer(j, id, avant.vus[id])
          }
        }
      }
      PARCH_SUIVI[cle] = { vus: obj.vus, nb: obj.nb, connus: connus }
    } catch (e) {
      if (!PARCH_SUIVI._err) { PARCH_SUIVI._err = true; console.error('[parchemin] suivi : ' + e) }
    }
  }
}))


// ───────── Page imprimée à la forge à parchemins : niveau selon la rareté de la page vierge ─────────
// Spell Codex fabrique la page sans niveau (donc palier 1, même avec une page vierge légendaire).
// On inscrit sur la page neuve le premier niveau du sort qui atteint la rareté de la page vierge
// (à défaut, le plus haut niveau de rareté inférieure). Les pages de butin restent au niveau minimum.
var FORGE_VIERGE_ID = 'specs_irons_spellbooks:blank_codex_page'
function forgePagesSansNiveau(joueur) {
  var res = {}
  var inv = joueur.getInventory()
  for (var i = 0; i < inv.getContainerSize(); i++) {
    var p = inv.getItem(i)
    if (!p || p.isEmpty() || String(p.id) !== PAGE_ID || parchLirePage(p)) continue
    var rl = Java.loadClass('com.specs.irons_spellbooks.item.CodexPageItem').getSpellId(p)
    if (rl) res[String(rl)] = (res[String(rl)] || 0) + p.count
  }
  return res
}
function forgeNiveauPourRarete(sortId, rarete) {
  var IUH = Java.loadClass('com.specs.irons_spellbooks.unlock.InkUnlockHelper')
  var sort = SpellRegistryJ.getSpell(ResourceLocationJ.tryParse(sortId))
  var max = Number(sort.getMaxLevel())
  var exact = 0, meilleur = 1
  for (var t = 1; t <= max; t++) {
    var r = IUH.rarityForTier(sort, t)
    if (!r) continue
    if (r.ordinal() === rarete.ordinal()) { exact = t; break }
    if (r.ordinal() < rarete.ordinal()) meilleur = t
  }
  return exact || meilleur
}
// Premier niveau du sort dont la rareté (au sens du Codex) est EXACTEMENT celle demandée ; 0 si le sort ne l'atteint jamais.
function forgeNiveauExact(sortId, rarete) {
  try {
    var IUH = Java.loadClass('com.specs.irons_spellbooks.unlock.InkUnlockHelper')
    var sort = SpellRegistryJ.getSpell(ResourceLocationJ.tryParse(sortId))
    var max = Number(sort.getMaxLevel())
    for (var t = 1; t <= max; t++) {
      var r = IUH.rarityForTier(sort, t)
      if (r && r.ordinal() === rarete.ordinal()) return t
    }
  } catch (e) { console.error('[parchemin] forgeNiveauExact ' + sortId + ' : ' + e) }
  return 0
}
// Autre sort de la même école, permis à la classe du joueur, pas encore découvert, qui atteint la rareté demandée.
// touteEcole : cherche dans toutes les écoles ouvertes à la classe (sort de cours tiré par la forge) ; à défaut de rareté exacte,
// le niveau le plus proche de la rareté demandée.
function forgeSortDeRemplacement(joueur, sortId, rarete, touteEcole) {
  try {
    var ecole = String(SpellRegistryJ.getSpell(ResourceLocationJ.tryParse(sortId)).getSchoolType().getId())
    var classe = classeDe(joueur)
    var ouvertes = touteEcole && classe ? ecolesOuvertesDeLaClasse(classe) : null
    var approx = []
    var interdits = {}
    if (classe) { sortsInterditsDeLaClasse(classe); interdits = CACHE_SET_INTERDITS[classe.nom] || {} }
    if (!UnlockAttachJ) UnlockAttachJ = Java.loadClass('com.specs.irons_spellbooks.unlock.SpellUnlockAttachments')
    var donnees = joueur.getData(UnlockAttachJ.UNLOCKS)
    var Catalogue = Java.loadClass('com.specs.irons_spellbooks.catalog.SpellCatalog')
    var liste = SpellRegistryJ.getEnabledSpells()
    var choix = []
    for (var i = 0; i < liste.size(); i++) {
      try {
        var sort = liste.get(i)
        var id = String(sort.getSpellId())
        if (id === sortId || interdits[id]) continue
        if (ouvertes ? !ouvertes[String(sort.getSchoolType().getId())] : String(sort.getSchoolType().getId()) !== ecole) continue
        if (!Catalogue.isListed(sort)) continue
        try { if (typeof desactSortInterdit === 'function' && desactSortInterdit(id)) continue } catch (eD) {}
        if (donnees.isSpellUnlocked(ResourceLocationJ.tryParse(id))) continue
        var n = forgeNiveauExact(id, rarete)
        if (n) choix.push({ id: id, niveau: n })
        else if (ouvertes) approx.push({ id: id, niveau: forgeNiveauPourRarete(id, rarete) })
      } catch (e1) {}
    }
    if (!choix.length) choix = approx
    if (!choix.length) return null
    return choix[Math.floor(Math.random() * choix.length)]
  } catch (e) { console.error('[parchemin] forgeSortDeRemplacement : ' + e); return null }
}
var FORGE_ETAT = {}
try {
  var FORGE_DEJA = null
  // Priorité HIGHEST : on lit la page vierge AVANT Spell Codex. Après lui, la pile peut être vide (dernière page vierge
  // consommée) et on ne savait plus quelle rareté appliquer : la page forgée restait au niveau 1 (sort commun).
  // Spell Codex traite la forge AVANT nous (priorité HIGHEST, enregistré au démarrage du jeu) et annule l'évènement :
  // on écoute donc aussi les évènements annulés, et on lit la page vierge et l'inventaire tels qu'ils étaient au tick
  // précédent (relevé fait à chaque tick tant que le joueur tient une page vierge).
  PlayerEvents.tick(function (ev) {
    try {
      var j = ev.player
      if (!j || j.level.clientSide) return
      var pv = null
      var m1 = j.getMainHandItem(), m2 = j.getOffhandItem()
      if (m1 && !m1.isEmpty() && String(m1.id) === FORGE_VIERGE_ID) pv = m1
      else if (m2 && !m2.isEmpty() && String(m2.id) === FORGE_VIERGE_ID) pv = m2
      var cle = String(j.uuid)
      if (!pv) { if (FORGE_ETAT[cle]) delete FORGE_ETAT[cle]; return }
      FORGE_ETAT[cle] = { rarete: Java.loadClass('com.specs.irons_spellbooks.item.BlankCodexPageItem').getInkRarity(pv), avant: forgePagesSansNiveau(j), t: j.server.tickCount }
    } catch (eT) {}
  })
  Java.loadClass('net.neoforged.neoforge.common.NeoForge').EVENT_BUS.addListener(
    Java.loadClass('net.neoforged.bus.api.EventPriority').HIGHEST, true,
    Java.loadClass('net.neoforged.neoforge.event.entity.player.PlayerInteractEvent$RightClickBlock'),
    function (e) {
      try {
        var joueur = e.getEntity()
        if (!joueur || !joueur.isPlayer() || e.getLevel().isClientSide()) return
        if (String(e.getLevel().getBlockState(e.getPos()).block.id) !== 'irons_spellbooks:scroll_forge') return
        var cleF = String(joueur.uuid) + '@' + joueur.server.tickCount   // l'événement arrive une fois par main : on ne traite qu'une fois
        if (FORGE_DEJA === cleF) return
        // Page vierge en main maintenant (nous passons avant Spell Codex) ou relevé du tick précédent (Spell Codex est passé avant).
        var main = null
        var mains = [joueur.getMainHandItem(), joueur.getOffhandItem(), e.getItemStack()]
        for (var mi = 0; mi < mains.length; mi++) { var pm = mains[mi]; if (pm && !pm.isEmpty() && String(pm.id) === FORGE_VIERGE_ID) { main = pm; break } }
        var etat = FORGE_ETAT[String(joueur.uuid)]
        var rarete = null, avant = null
        if (!e.isCanceled() && main) {
          rarete = Java.loadClass('com.specs.irons_spellbooks.item.BlankCodexPageItem').getInkRarity(main)
          avant = forgePagesSansNiveau(joueur)
        } else if (etat && joueur.server.tickCount - etat.t <= 2) {
          rarete = etat.rarete
          avant = etat.avant
        }
        if (!main && !etat) return
        FORGE_DEJA = cleF
        console.info('[parchemin] ' + joueur.username + ' utilise la forge avec une page vierge ' + (rarete ? rarete.name() : 'sans rareté'))
        if (!rarete || !avant) return
        joueur.server.scheduleInTicks(2, function () {
          try {
            var apres = forgePagesSansNiveau(joueur)
            for (var id in apres) {
              if ((apres[id] || 0) <= (avant[id] || 0)) continue
              // Le sort doit ATTEINDRE la rareté de la page vierge : sinon (Spell Codex tire aussi des sorts de rareté inférieure)
              // on le remplace par un autre sort de la même école qui l'atteint, au premier niveau de cette rareté.
              var remplacant = null
              // Sort de cours / « pour tous » : jamais tiré par la forge, toujours remplacé
              var interditF = false
              try { interditF = typeof desactSortInterdit === 'function' && desactSortInterdit(id) } catch (eI) {}
              var niveau = interditF ? 0 : forgeNiveauExact(id, rarete)
              if (!niveau) {
                remplacant = forgeSortDeRemplacement(joueur, id, rarete)
                if (!remplacant && interditF) remplacant = forgeSortDeRemplacement(joueur, id, rarete, true)
                if (remplacant) niveau = remplacant.niveau
                else { niveau = forgeNiveauPourRarete(id, rarete); console.info('[parchemin] forge : aucun sort de l\'école de ' + id + ' n\'atteint ' + rarete.name() + ', page gardée au niveau ' + niveau) }
              }
              var inv = joueur.getInventory()
              for (var i = 0; i < inv.getContainerSize(); i++) {
                var p = inv.getItem(i)
                if (!p || p.isEmpty() || String(p.id) !== PAGE_ID || parchLirePage(p)) continue
                if (String(Java.loadClass('com.specs.irons_spellbooks.item.CodexPageItem').getSpellId(p)) !== id) continue
                var cible = p
                if (remplacant) {
                  cible = Java.loadClass('com.specs.irons_spellbooks.item.CodexPageItem').createFor(ResourceLocationJ.tryParse(remplacant.id))
                  parchEcrirePage(cible, niveau)
                  if (p.count > 1) { p.shrink(1); joueur.give(cible) } else inv.setItem(i, cible)
                  console.info('[parchemin] page forgée ' + id + ' remplacée par ' + remplacant.id + ' (page vierge ' + rarete.name() + ', ' + id + ' n\'atteint pas cette rareté) : niveau ' + niveau)
                  break
                }
                if (p.count > 1) { cible = p.copyWithCount(1); p.shrink(1); parchEcrirePage(cible, niveau); joueur.give(cible) }
                else parchEcrirePage(cible, niveau)
                console.info('[parchemin] page forgée ' + id + ' (page vierge ' + rarete.name() + ') : niveau ' + niveau)
                break
              }
            }
            var nouv = 0
            for (var id2 in apres) if ((apres[id2] || 0) > (avant[id2] || 0)) nouv++
            if (!nouv) console.info('[parchemin] forge : aucune nouvelle page sans niveau trouvée dans l\'inventaire de ' + joueur.username)
          } catch (e2) { console.error('[parchemin] forge : ' + e2) }
        })
      } catch (e1) { console.error('[parchemin] forge : ' + e1) }
    })
  console.info('[parchemin] Pages de la forge à parchemins : niveau selon la rareté.')
} catch (e) { console.error('[parchemin] forge indisponible : ' + e) }

// ───────── Respec du codex désactivé ─────────
// Le bouton « Respec » du codex efface tous les paliers (même ceux gagnés par parchemins) et rembourse l'XP.
// Il se reconnaît à : paliers en baisse alors que la liste des sorts découverts n'a pas bougé (un verrouillage de sort,
// lui, retire le sort de la liste). On remet alors les paliers, l'XP investie et l'XP du joueur comme avant.
var RESPEC_SUIVI = {}
function respecPhoto(j) {
  var d = j.getData(UnlockAttachJ.UNLOCKS)
  var tiers = {}, somme = 0, nb = 0
  var it = d.getTiers().entrySet().iterator()
  while (it.hasNext()) { var en = it.next(); var v = Number(en.getValue()); tiers[String(en.getKey())] = v; somme += v; nb++ }
  return { tiers: tiers, somme: somme, nb: nb, decouverts: Number(d.getDiscoveredSpells().size()), xpInv: Number(d.getXpInvested()),
           niv: Number(j.experienceLevel), prog: Number(j.experienceProgress), total: Number(j.totalExperience), tick: j.server.tickCount }
}
ServerEvents.tick(perfWrap('classes_rp:2424', function (event) {
  var serveur = event.server
  if (serveur.tickCount % 10 !== 0) return
  var joueurs = serveur.players
  for (var i = 0; i < joueurs.size(); i++) {
    var j = joueurs.get(i)
    try {
      if (!UnlockAttachJ) UnlockAttachJ = Java.loadClass('com.specs.irons_spellbooks.unlock.SpellUnlockAttachments')
      var cle = String(j.uuid)
      var cur = respecPhoto(j)
      var av = RESPEC_SUIVI[cle]
      var admin = CODEX_ADMIN[cle] && serveur.tickCount - CODEX_ADMIN[cle] < 40
      if (av && !admin && av.nb > 0 && cur.decouverts === av.decouverts && cur.somme < av.somme && serveur.tickCount - av.tick < 20) {
        var d = j.getData(UnlockAttachJ.UNLOCKS)
        for (var id in av.tiers) {
          var rl = ResourceLocationJ.tryParse(id)
          if (rl && d.getUnlockedTier(rl) < av.tiers[id]) d.setUnlockedTier(rl, av.tiers[id])
        }
        if (av.xpInv > cur.xpInv) d.addXpInvested(av.xpInv - cur.xpInv)
        Java.loadClass('com.specs.irons_spellbooks.unlock.UnlockNetworking').applyAccessAndSync(j)
        if (cur.total > av.total) {   // XP remboursée : reprise exacte (retrait direct, sans passer par les niveaux)
          var gain = cur.total - av.total
          j.giveExperiencePoints(-Math.min(gain, 2147483647))
        }
        j.tell('Le codex refuse d\'oublier ce que vous avez appris.')
        console.info('[codex] respec annulé pour ' + j.username + ' (' + av.somme + ' → ' + cur.somme + ' niveaux restaurés)')
        RESPEC_SUIVI[cle] = respecPhoto(j)
        continue
      }
      RESPEC_SUIVI[cle] = cur
      // Sort de départ : jamais oublié tant que la classe est gardée (remis s'il a disparu)
      if (serveur.tickCount % 20 === 0) {
        var sd = String(j.persistentData.getString(SORT_DEBUT_CLE))
        if (sd && !admin && !estTest(j) && classeDe(j) && SORT_DEBUT[classeDe(j).nom] === sd && !j.getData(UnlockAttachJ.UNLOCKS).isSpellUnlocked(ResourceLocationJ.tryParse(sd))) {
          cmd(serveur, 'specs_codex spell unlock ' + j.username + ' ' + sd)
          console.info('[codex] sort de départ remis pour ' + j.username + ' : ' + sd)
        }
      }
    } catch (e) {
      if (!RESPEC_SUIVI._err) { RESPEC_SUIVI._err = true; console.error('[codex] suivi respec : ' + e) }
    }
  }
}))

// ===== Balise de Recherche (Apprentice's Codex) : offrandes réservées à une classe =====
// Liste des structures et objets : kubejs/data/apprenticecodex/search_beacon_targets/default.json (remplace celle du mod).
// Un objet de cette table n'est accepté par le brasero que si son propriétaire (le lanceur du sort) est de la bonne classe ou en mode testeur.
// Les autres offrandes (Village, Fort de l'Évocateur, Hutte de la mangrove, Cité antique) restent ouvertes à tous.
var BALISE_OBJETS_CLASSE = {
  'minecraft:blaze_rod': 'Pyromancien',
  'irons_spellbooks:fire_rune': 'Pyromancien',
  'minecraft:magma_cream': 'Pyromancien',
  'irons_spellbooks:frozen_bone': 'Cryomancien',
  'irons_spellbooks:ice_rune': 'Cryomancien',
  'minecraft:fermented_spider_eye': 'Cryomancien',
  'minecraft:blue_ice': 'Cryomancien',
  'minecraft:packed_ice': 'Cryomancien',
  'irons_spellbooks:lightning_rune': 'Électro-Sorcier',
  'minecraft:lightning_rod': 'Électro-Sorcier',
  'irons_spellbooks:holy_rune': 'Paladin',
  'minecraft:bell': 'Paladin',
  'minecraft:golden_carrot': 'Paladin',
  'minecraft:chiseled_stone_bricks': 'Paladin',
  'irons_spellbooks:blood_rune': 'Hémomancien',
  'minecraft:bone_block': 'Hémomancien',
  'irons_spellbooks:ender_rune': 'Voyageur du Vide',
  'minecraft:phantom_membrane': 'Voyageur du Vide',
  'minecraft:ender_eye': 'Voyageur du Vide',
  'minecraft:shulker_shell': 'Voyageur du Vide',
  'irons_spellbooks:nature_rune': 'Druide',
  'minecraft:acacia_sapling': 'Druide',
  'minecraft:chorus_flower': 'Druide',
  'minecraft:moss_block': 'Druide',
  'minecraft:clock': 'Chronomancien',
  'minecraft:echo_shard': 'Chronomancien',
  'minecraft:amethyst_shard': 'Géomancien',
  'minecraft:sandstone': 'Géomancien',
  'minecraft:raw_iron_block': 'Géomancien',
  'minecraft:feather': 'Aéromancien',
  'minecraft:breeze_rod': 'Aéromancien',
  'minecraft:wind_charge': 'Aéromancien',
  'minecraft:painting': 'Chromancien',
  'minecraft:nautilus_shell': 'Hydromancien',
  'minecraft:ink_sac': 'Hydromancien',
  'minecraft:oak_boat': 'Hydromancien',
  'minecraft:skeleton_skull': 'Nécromancien',
  'minecraft:rotten_flesh': 'Nécromancien',
  'minecraft:bone': 'Nécromancien',
  'minecraft:soul_soil': 'Nécromancien',
  'minecraft:ominous_bottle': 'Réprouvé',
  'minecraft:crying_obsidian': 'Réprouvé',
  'minecraft:candle': 'Envoûteur',
  'minecraft:soul_lantern': 'Envoûteur',
  'minecraft:wither_skeleton_skull': 'Envoûteur',
  'minecraft:spyglass': 'Astromancien',
  'minecraft:glowstone_dust': 'Astromancien',
  'minecraft:fire_charge': 'Astromancien',
  'minecraft:firework_rocket': 'Astromancien',
  'minecraft:paper': 'Spiritualiste',
  'minecraft:soul_torch': 'Spiritualiste',
  'minecraft:bamboo': 'Symétriste',
  'minecraft:quartz': 'Symétriste',
  'minecraft:piston': 'Technomancien',
  'minecraft:observer': 'Technomancien',
  'minecraft:note_block': 'Barde',
  'minecraft:jukebox': 'Barde'
}
// Objet -> structure (clé de nom « mcrp.structure.<clé> »), et identifiant de structure -> clé (pour afficher un joli nom)
var BALISE_OBJET_STRUCT = {
 "irons_spellbooks:divine_pearl": "village",
 "minecraft:blaze_rod": "tour_du_pyromancien",
 "irons_spellbooks:fire_rune": "arene_ardente",
 "minecraft:magma_cream": "puits_de_feu",
 "irons_spellbooks:frozen_bone": "tour_de_montagne",
 "irons_spellbooks:ice_rune": "prison_gelee",
 "minecraft:fermented_spider_eye": "antre_araignee_de_glace",
 "minecraft:blue_ice": "brise_glace_empale",
 "minecraft:packed_ice": "temple_givre",
 "irons_spellbooks:lightning_rune": "acropole",
 "minecraft:lightning_rod": "ruines_tour_ancienne",
 "irons_spellbooks:holy_rune": "cathedrale",
 "minecraft:bell": "chapelle_abandonnee",
 "minecraft:golden_carrot": "chateau_acolyte",
 "minecraft:chiseled_stone_bricks": "forteresse_ancienne",
 "irons_spellbooks:blood_rune": "ancien_champ_de_bataille",
 "minecraft:bone_block": "tertre_des_chiens",
 "irons_spellbooks:ender_rune": "bibliotheque_de_l_end",
 "minecraft:phantom_membrane": "citadelle_fantome",
 "minecraft:ender_eye": "cour_d_enderkeep",
 "minecraft:shulker_shell": "tour_de_shulkers",
 "irons_spellbooks:nature_rune": "temple_moussu",
 "minecraft:acacia_sapling": "bosquet_umvuthana",
 "minecraft:chorus_flower": "jardin_mythique",
 "minecraft:moss_block": "ruine_de_foret_dense",
 "minecraft:clock": "tour_de_l_horloge",
 "minecraft:echo_shard": "donjon_ancien",
 "minecraft:amethyst_shard": "nid_d_amethyste",
 "minecraft:sandstone": "nid_du_ver_des_sables",
 "minecraft:raw_iron_block": "chambre_forgee",
 "minecraft:feather": "moulin_a_vent",
 "minecraft:breeze_rod": "temple_nuageux",
 "minecraft:wind_charge": "iles_flottantes",
 "minecraft:painting": "atelier_chromatique",
 "minecraft:nautilus_shell": "cite_engloutie",
 "minecraft:ink_sac": "navire_du_kraken",
 "minecraft:oak_boat": "galion",
 "minecraft:skeleton_skull": "catacombes",
 "minecraft:rotten_flesh": "camp_draugr",
 "minecraft:bone": "cimetiere",
 "minecraft:soul_soil": "forteresse_des_ames",
 "minecraft:ominous_bottle": "pyramide_maudite",
 "minecraft:crying_obsidian": "tour_sombre",
 "minecraft:candle": "autel_des_vestiges",
 "minecraft:soul_lantern": "temple_heretique",
 "minecraft:wither_skeleton_skull": "trone_du_transcendant",
 "minecraft:spyglass": "observatoire_astral",
 "minecraft:glowstone_dust": "repaire_astral",
 "minecraft:fire_charge": "meteorite_astrale",
 "minecraft:firework_rocket": "station_spatiale",
 "minecraft:paper": "sanctuaire_onmyoji",
 "minecraft:soul_torch": "forgeron_des_ames",
 "minecraft:bamboo": "maison_taoiste",
 "minecraft:quartz": "porte_de_sunzi",
 "minecraft:piston": "usine_ancienne",
 "minecraft:observer": "vaisseau_stellaire",
 "minecraft:note_block": "caravane_de_clowns",
 "minecraft:jukebox": "feu_de_camp",
 "minecraft:emerald": "fort_de_l_evocateur",
 "minecraft:poisonous_potato": "hutte_de_la_mangrove",
 "minecraft:sculk_sensor": "cite_antique"
}
var BALISE_STRUCT_PAR_ID = {
 "#minecraft:village": "village",
 "irons_spellbooks:pyromancer_tower": "tour_du_pyromancien",
 "cataclysm:burning_arena": "arene_ardente",
 "born_in_chaos_v1:firewell": "puits_de_feu",
 "irons_spellbooks:mountain_tower": "tour_de_montagne",
 "cataclysm:frosted_prison": "prison_gelee",
 "irons_spellbooks:ice_spider_den": "antre_araignee_de_glace",
 "irons_spellbooks:impaled_icebreaker": "brise_glace_empale",
 "legendary_monsters:frostbitten_temple": "temple_givre",
 "cataclysm:acropolis": "acropole",
 "legendary_monsters:ancient_tower_remains": "ruines_tour_ancienne",
 "mvs:cathedral": "cathedrale",
 "structory:abandoned_chapel": "chapelle_abandonnee",
 "acolyte:castle/castle_0": "chateau_acolyte",
 "acolyte:castle/castle_1": "chateau_acolyte",
 "acolyte:castle/castle_2": "chateau_acolyte",
 "legendary_monsters:ancient_stronghold": "forteresse_ancienne",
 "irons_spellbooks:ancient_battleground": "ancien_champ_de_bataille",
 "born_in_chaos_v1:mound_of_hounds": "tertre_des_chiens",
 "firesenderexpansion:end_library": "bibliotheque_de_l_end",
 "mes:phantom_citadel": "citadelle_fantome",
 "mes:enderkeep_courtyard": "cour_d_enderkeep",
 "legendary_monsters:shulker_tower": "tour_de_shulkers",
 "legendary_monsters:mossy_temple": "temple_moussu",
 "mowziesmobs:umvuthana_grove": "bosquet_umvuthana",
 "mes:mythic_garden": "jardin_mythique",
 "structory:dense_forest_ruin": "ruine_de_foret_dense",
 "chronomancy:clock_tower": "tour_de_l_horloge",
 "archaion:ancient_keep": "donjon_ancien",
 "cataclysm:amethyst_nest": "nid_d_amethyste",
 "block_factorys_bosses:sandworm_nest": "nid_du_ver_des_sables",
 "mowziesmobs:wrought_chamber": "chambre_forgee",
 "wind_spellbooks:windmill": "moulin_a_vent",
 "legendary_monsters:cloudy_temple": "temple_nuageux",
 "mvs:floating_islands": "iles_flottantes",
 "mvs:large_floating_island": "iles_flottantes",
 "colormagic:workshop": "atelier_chromatique",
 "colormagic:abandoned_workshop": "atelier_chromatique",
 "cataclysm:sunken_city": "cite_engloutie",
 "block_factorys_bosses:kraken_ship": "navire_du_kraken",
 "supplementaries:galleon": "galion",
 "irons_spellbooks:catacombs": "catacombes",
 "monsterspellbooks:draugr_camp": "camp_draugr",
 "structory:graveyard": "cimetiere",
 "legendary_monsters:soul_fortress_remains": "forteresse_des_ames",
 "cataclysm:cursed_pyramid": "pyramide_maudite",
 "born_in_chaos_v1:dark_tower_forest": "tour_sombre",
 "born_in_chaos_v1:dark_tower_plain": "tour_sombre",
 "born_in_chaos_v1:dark_tower_taiga": "tour_sombre",
 "cursespells:altar_of_remnants": "autel_des_vestiges",
 "cursespells:heretic_temple": "temple_heretique",
 "cursespells:throne_of_the_transcendent": "trone_du_transcendant",
 "asterismarcanum:astral_observatory": "observatoire_astral",
 "mes:astral_hideaway": "repaire_astral",
 "mes:astral_meteorite": "meteorite_astrale",
 "legendary_monsters:space_station": "station_spatiale",
 "iss_magicfromtheeast:onmyoji_shrine": "sanctuaire_onmyoji",
 "cataclysm:soul_black_smith": "forgeron_des_ames",
 "iss_magicfromtheeast:taoist_house": "maison_taoiste",
 "mvs:sunzi_gate": "porte_de_sunzi",
 "cataclysm:ancient_factory": "usine_ancienne",
 "mes:starlight_voyager": "vaisseau_stellaire",
 "born_in_chaos_v1:clown_caravan_plains": "caravane_de_clowns",
 "born_in_chaos_v1:clown_caravan_savanna": "caravane_de_clowns",
 "born_in_chaos_v1:clown_caravan_taiga": "caravane_de_clowns",
 "mvs:fire_camp": "feu_de_camp",
 "irons_spellbooks:evoker_fort": "fort_de_l_evocateur",
 "irons_spellbooks:mangrove_hut": "hutte_de_la_mangrove",
 "minecraft:ancient_city": "cite_antique"
}
var BALISES = []          // braseros actifs
var BALISE_LABEL = {}     // uuid du brasero -> dernière cible annoncée
var BALISE_AVERTI = {}    // propriétaire + objet -> tick du dernier message (évite le spam)
var ItemEntityJ = null
try { ItemEntityJ = Java.loadClass('net.minecraft.world.entity.item.ItemEntity') } catch (e) { console.error('[classes_rp] balise : ItemEntity introuvable : ' + e) }

function baliseProprietaire(b) {
  try {
    var nom = b.getOwnerName()
    if (!nom) return null
    return b.getServer().getPlayerList().getPlayerByName(String(nom))
  } catch (e) { return null }
}
// true si l'offrande doit être refusée
function baliseRefuse(proprio, idObjet) {
  var cl = BALISE_OBJETS_CLASSE[idObjet]
  if (!cl) return false
  if (!proprio) return true
  if (estTest(proprio)) return false
  var c = classeDe(proprio)
  return !c || c.nom !== cl
}
function baliseAvertir(proprio, idObjet, tick) {
  if (!proprio) return
  var k = String(proprio.uuid) + '|' + idObjet
  if (BALISE_AVERTI[k] && tick - BALISE_AVERTI[k] < 60) return
  BALISE_AVERTI[k] = tick
  try { proprio.setStatusMessage(Text.translate('mcrp.msg.brasero_refus').gold()) } catch (e) {}
}

// Repousse un objet refusé hors de portée du brasero b
function baliseVerifierObjet(b, it, proprio, tick) {
  var id = String(it.getItem().id)
  if (!baliseRefuse(proprio, id)) return
  var dx = it.getX() - b.getX(), dz = it.getZ() - b.getZ()
  var d = Math.sqrt(dx * dx + dz * dz)
  if (d < 0.05) { dx = Math.random() - 0.5; dz = Math.random() - 0.5; d = Math.sqrt(dx * dx + dz * dz) }
  it.setPos(b.getX() + dx / d * 2.2, it.getY() + 0.2, b.getZ() + dz / d * 2.2)
  it.setDeltaMovement(dx / d * 0.25, 0.2, dz / d * 0.25)
  it.hurtMarked = true
  baliseAvertir(proprio, id, tick)
}

EntityEvents.spawned(function (event) {
  try {
    var e = event.entity
    var type = String(e.type)
    if (type === 'apprenticecodex:search_beacon') {
      BALISES.push(e)
      // indice : une offrande au hasard parmi celles de la classe du propriétaire (et celles ouvertes à tous)
      e.server.scheduleInTicks(30, function () {
        try {
          if (!e.isAlive()) return
          var proprio = baliseProprietaire(e)
          if (!proprio) return
          var choix = []
          for (var id in BALISE_OBJET_STRUCT) if (!baliseRefuse(proprio, id)) choix.push(id)
          if (!choix.length) return
          var o = choix[Math.floor(Math.random() * choix.length)]
          proprio.tell(Text.translate('mcrp.msg.brasero_indice', Item.of(o).getHoverName(), Text.translate('mcrp.structure.' + BALISE_OBJET_STRUCT[o])).gold().italic())
        } catch (err) {}
      })
      return
    }
    if (type !== 'minecraft:item' || !BALISES.length) return
    // objet qui apparaît déjà tout près d'un brasero : vérifié tout de suite, avant la première absorption
    for (var i = 0; i < BALISES.length; i++) {
      var b = BALISES[i]
      if (!b.isAlive() || b.level() !== e.level()) continue
      if (b.distanceToSqr(e) < 9) { baliseVerifierObjet(b, e, baliseProprietaire(b), e.server.tickCount); return }
    }
  } catch (err) {}
})

// Objet jeté près du brasero : repoussé avant qu'il ne l'absorbe
ServerEvents.tick(perfWrap('classes_rp:balise', function (event) {
  if (!BALISES.length || !ItemEntityJ) return
  var tick = event.server.tickCount
  for (var i = BALISES.length - 1; i >= 0; i--) {
    var b = BALISES[i]
    try {
      if (!b.isAlive()) { delete BALISE_LABEL[String(b.uuid)]; BALISES.splice(i, 1); continue }
      // offrande acceptée : annonce le joli nom de la structure recherchée (le mod n'affiche que son identifiant)
      var lab = String(b.getTargetLabel() || ''), cle = String(b.uuid)
      if (lab && BALISE_LABEL[cle] !== lab) {
        BALISE_LABEL[cle] = lab
        var p0 = baliseProprietaire(b), nomStruct = BALISE_STRUCT_PAR_ID[lab.split(', ')[0]]
        if (p0 && nomStruct) p0.tell(Text.translate('mcrp.msg.brasero_cherche', Text.translate('mcrp.structure.' + nomStruct)).gold())
      }
      var objets = b.level().getEntitiesOfClass(ItemEntityJ, b.getBoundingBox().inflate(1.6))
      if (!objets.size()) continue
      var proprio = baliseProprietaire(b)
      for (var j = 0; j < objets.size(); j++) baliseVerifierObjet(b, objets.get(j), proprio, tick)
    } catch (e) {
      if (!BALISES._err) { BALISES._err = true; console.error('[classes_rp] balise : ' + e) }
    }
  }
}))

// Offrande par clic droit sur le brasero
ItemEvents.entityInteracted(function (event) {
  try {
    if (String(event.target.type) !== 'apprenticecodex:search_beacon') return
    var id = String(event.item.id)
    if (!BALISE_OBJETS_CLASSE[id]) return
    var proprio = baliseProprietaire(event.target) || event.player
    if (!baliseRefuse(proprio, id)) return
    baliseAvertir(event.player, id, event.server.tickCount)
    event.cancel()
  } catch (e) {}
})

// ───────────── Grimoire de chronomancien : 15 emplacements (le mod aetheris_armures règle les nouveaux grimoires) ─────────────
// Les grimoires déjà fabriqués gardent leurs 12 emplacements enregistrés : on les passe à 15 (inventaire et emplacement de grimoire),
// sans toucher aux sorts déjà inscrits. Vérification toutes les 2 s.
var GRIMOIRE_CHRONO = 'chronomancy:book_of_time_managment', GRIMOIRE_CHRONO_SLOTS = 15
var GrimContJ = null, GrimCuriosJ = null
function grimoireChronoMaj(pile) {
  if (!pile || pile.isEmpty() || String(pile.id) !== GRIMOIRE_CHRONO) return
  var c = GrimContJ.get(pile)
  if (!c || c.getMaxSpellCount() >= GRIMOIRE_CHRONO_SLOTS) return
  var m = c.mutableCopy()
  m.setMaxSpellCount(GRIMOIRE_CHRONO_SLOTS)
  GrimContJ.set(pile, m.toImmutable())
}
PlayerEvents.tick(function (event) {
  var joueur = event.player
  if (joueur.tickCount % 40 !== 7) return
  try {
    if (!GrimContJ) GrimContJ = Java.loadClass('io.redspace.ironsspellbooks.api.spells.ISpellContainer')
    var inv = joueur.inventory
    for (var i = 0; i < inv.getContainerSize(); i++) grimoireChronoMaj(inv.getItem(i))
    if (!GrimCuriosJ) GrimCuriosJ = Java.loadClass('top.theillusivec4.curios.api.CuriosApi')
    var cur = GrimCuriosJ.getCuriosInventory(joueur)
    if (cur.isPresent()) {
      var eq = cur.get().getEquippedCurios()
      for (var k = 0; k < eq.getSlots(); k++) grimoireChronoMaj(eq.getStackInSlot(k))
    }
  } catch (e) {
    if (!GRIMOIRE_CHRONO_ERR) { GRIMOIRE_CHRONO_ERR = true; console.error('[grimoire chrono] ' + e) }
  }
})
var GRIMOIRE_CHRONO_ERR = false

// ───────────── Barde : passif « Public » et Représentation ─────────────
// Public : +5 % de puissance mélodique par autre joueur à 12 blocs ou moins (au plus +15 %).
// Représentation : un Barde qui joue un morceau (instrument d'Immersive Melodies) devant un public reçoit, toutes les 20 s,
// un pourboire en émeraudes et de l'XP. Les villageois (12 blocs) paient ; chaque joueur qui écoute (16 blocs, 4 au plus)
// augmente le pourboire de 50 % et reçoit Régénération I. Sans villageois, le public de joueurs donne seulement de l'XP.
// Au plus BARDE_SEANCES_JOUR séances payées par jour de jeu.
var BARDE_PUBLIC_RAYON = 12, BARDE_PUBLIC_PAR_JOUEUR = 0.05, BARDE_PUBLIC_MAX = 3
var BARDE_SEANCE_S = 20, BARDE_SEANCES_JOUR = 10
var BARDE = null
function bardeInit() {
  if (BARDE) return BARDE
  var RL = Java.loadClass('net.minecraft.resources.ResourceLocation')
  var opt = Java.loadClass('net.minecraft.core.registries.BuiltInRegistries').ATTRIBUTE.getHolder(RL.parse('tunes_n_tomes:melody_spell_power'))
  BARDE = {
    attr: opt.isPresent() ? opt.get() : null,
    modId: RL.parse('classes_rp:barde_public'),
    Modif: Java.loadClass('net.minecraft.world.entity.ai.attributes.AttributeModifier'),
    Op: Java.loadClass('net.minecraft.world.entity.ai.attributes.AttributeModifier$Operation'),
    Instr: Java.loadClass('immersive_melodies.item.InstrumentItem'),
    Villageois: Java.loadClass('net.minecraft.world.entity.npc.Villager'),
    jeu: {}   // uuid -> secondes de jeu accumulées
  }
  return BARDE
}
function bardeJoue(joueur) {
  var mains = [joueur.mainHandItem, joueur.offHandItem]
  for (var i = 0; i < mains.length; i++) {
    var s = mains[i]
    if (s && !s.isEmpty() && (s.item instanceof BARDE.Instr) && s.item.isPlaying(s)) return true
  }
  return false
}
// Villageois (et marchands ambulants) dans le rayon, compté par type d'entité (méthode éprouvée de boss_zones.js).
function bardeVillageois(joueur) {
  var n = 0, dern = null
  var liste = joueur.level.getEntitiesWithin(joueur.boundingBox.inflate(BARDE_PUBLIC_RAYON))
  for (var i = 0; i < liste.size(); i++) {
    var t = String(liste.get(i).type)
    if (t === 'minecraft:villager' || t === 'minecraft:wandering_trader') n++
  }
  return n
}
// Danse : tout joueur (quelle que soit sa classe) qui joue d'un instrument fait danser une gigue aux villageois
// et marchands ambulants à 12 blocs : effet aetheris_armures:danse (immobiles, animation dans le mod aetheris_armures),
// renouvelé chaque seconde tant que la musique continue ; ils se tournent vers le musicien. Les villageois endormis ne dansent pas.
function bardeFaireDanser(joueur) {
  var n = 0, dern = null
  var liste = joueur.level.getEntitiesWithin(joueur.boundingBox.inflate(BARDE_PUBLIC_RAYON))
  for (var i = 0; i < liste.size(); i++) {
    var v = liste.get(i), t = String(v.type)
    if (t !== 'minecraft:villager' && t !== 'minecraft:wandering_trader') continue
    try { if (v.isSleeping()) continue } catch (eS) {}
    ajouterEffet(v, 'aetheris_armures:danse', 50, 0, true, true)
    var cleV = String(v.uuid)
    if (!DANSE.v[cleV]) DANSE.v[cleV] = { ent: v, phase: Math.floor(Math.random() * 12), cote: 1 }
    DANSE.v[cleV].fin = Number(joueur.server.getTickCount()) + 45
    DANSE.v[cleV].musicien = joueur
    n++; dern = v
  }
  var u = String(joueur.uuid), maintenant = Date.now()
  if (!BARDE_JOURNAL_DANSE[u] || maintenant - BARDE_JOURNAL_DANSE[u] > 60000) {
    BARDE_JOURNAL_DANSE[u] = maintenant
    console.info('[barde] ' + joueur.username + ' fait danser ' + n + ' villageois' + (dern ? ' ; effets du dernier : ' + dern.getActiveEffects() : ''))
  }
}
var BARDE_JOURNAL_DANSE = {}
// Gigue jouée côté serveur (visible par tous, sans dépendre du rendu) : le villageois reste face au musicien et
// sautille sur place en alternant un petit pas à gauche puis à droite toutes les 12 ticks ; ses jambes battent la mesure
// avec ces pas. Des notes s'échappent au-dessus de lui. Il s'arrête ~2 s après la fin de la musique.
var DANSE = { v: {}, J: null }
ServerEvents.tick(perfWrap('classes_rp:danse', function (event) {
  var t = Number(event.server.getTickCount())
  for (var cle in DANSE.v) {
    var d = DANSE.v[cle], v = d.ent
    try {
      if (!v || !v.isAlive() || v.isRemoved() || t >= d.fin) { delete DANSE.v[cle]; continue }
      if (!DANSE.J) DANSE.J = { Note: Java.loadClass('net.minecraft.core.particles.ParticleTypes').NOTE }
      var m = d.musicien
      if (m && m.isAlive()) v.getLookControl().setLookAt(Number(m.getX()), Number(m.getEyeY()), Number(m.getZ()))
      var k = (t + d.phase) % 12
      if (k === 0 && v.onGround()) {
        // pas chassé perpendiculaire à la direction du musicien
        var dx = 0, dz = 0
        if (m) { dx = Number(m.getX()) - Number(v.getX()); dz = Number(m.getZ()) - Number(v.getZ()) }
        var n = Math.sqrt(dx * dx + dz * dz) || 1
        d.cote = -d.cote
        v.setMotionX(-dz / n * 0.09 * d.cote); v.setMotionY(0.33); v.setMotionZ(dx / n * 0.09 * d.cote)
        try { v.hasImpulse = true } catch (eI) {}
      }
      if (k === 6) { try { v.level.sendParticles(DANSE.J.Note, v.getX(), v.getY() + Number(v.getBbHeight()) + 0.4, v.getZ(), 1, 0.3, 0.1, 0.3, Math.random()) } catch (eP) { if (!DANSE.errP) { DANSE.errP = true; console.error('[barde] notes de la gigue : ' + eP) } } }
    } catch (e) { delete DANSE.v[cle]; if (!DANSE.err) { DANSE.err = true; console.error('[barde] gigue des villageois : ' + e) } }
  }
}))
// Journal de diagnostic : au plus une ligne par joueur et par minute.
var BARDE_JOURNAL = {}
function bardeJournal(joueur, texte) {
  var u = String(joueur.uuid), t = Date.now()
  if (BARDE_JOURNAL[u] && t - BARDE_JOURNAL[u] < 60000) return
  BARDE_JOURNAL[u] = t
  console.info('[barde] ' + joueur.username + ' : ' + texte)
}
function bardeAuditeurs(joueur, rayon) {
  var res = []
  var moi = String(joueur.uuid), dim = String(joueur.level.dimension)
  var ps = joueur.server.players
  for (var i = 0; i < ps.length; i++) {
    var p = ps[i]
    if (String(p.uuid) === moi || p.isSpectator() || !p.isAlive() || String(p.level.dimension) !== dim) continue
    if (p.distanceToSqr(joueur) <= rayon * rayon) res.push(p)
  }
  return res
}
PlayerEvents.tick(function (event) {
  var joueur = event.player
  if (joueur.tickCount % 20 !== 11) return
  try {
    bardeInit()
    var cl = classeDe(joueur), barde = !!(cl && cl.nom === 'Barde')
    // Passif « Public » (vérifié toutes les 2 s)
    if (BARDE.attr && joueur.tickCount % 40 === 31) {
      var inst = joueur.getAttribute(BARDE.attr)
      if (inst) {
        var n = barde ? Math.min(BARDE_PUBLIC_MAX, bardeAuditeurs(joueur, BARDE_PUBLIC_RAYON).length) : 0
        var actuel = inst.getModifier(BARDE.modId)
        var voulu = n * BARDE_PUBLIC_PAR_JOUEUR
        if (!actuel || Math.abs(Number(actuel.amount()) - voulu) > 0.0001) {
          if (actuel) retirerModif(inst, BARDE.modId)
          if (voulu > 0) inst.addTransientModifier(new BARDE.Modif(BARDE.modId, voulu, BARDE.Op.ADD_MULTIPLIED_BASE))
        }
      }
    }
    // Danse des villageois (tout musicien)
    var joue = bardeJoue(joueur)
    if (joue) { try { bardeFaireDanser(joueur) } catch (eDanse) { bardeJournal(joueur, 'danse des villageois impossible : ' + eDanse) } }
    // Représentation
    var uuid = String(joueur.uuid)
    if (!barde || !joue) {
      if (barde && BARDE.jeu[uuid] > 0) bardeJournal(joueur, 'arrête de jouer après ' + BARDE.jeu[uuid] + ' s (il en faut ' + BARDE_SEANCE_S + ')')
      else if (barde) {
        var mh = joueur.mainHandItem, oh = joueur.offHandItem
        if ((mh && (mh.item instanceof BARDE.Instr)) || (oh && (oh.item instanceof BARDE.Instr))) bardeJournal(joueur, 'tient un instrument, mais le serveur ne le voit pas en train de jouer')
      }
      BARDE.jeu[uuid] = 0
      return
    }
    BARDE.jeu[uuid] = (BARDE.jeu[uuid] || 0) + 1
    joueur.server.runCommandSilent('execute in ' + joueur.level.dimension + ' run particle minecraft:note ' + Number(joueur.x).toFixed(2) + ' ' + (Number(joueur.y) + 2.2).toFixed(2) + ' ' + Number(joueur.z).toFixed(2) + ' 0.5 0.3 0.5 1 2')
    if (BARDE.jeu[uuid] < BARDE_SEANCE_S) return
    BARDE.jeu[uuid] = 0
    var auditeurs = bardeAuditeurs(joueur, 16)
    var villageois = bardeVillageois(joueur)
    console.info('[barde] ' + joueur.username + ' : séance terminée, ' + villageois + ' villageois, ' + auditeurs.length + ' auditeur(s)')
    if (!villageois && !auditeurs.length) {
      joueur.setStatusMessage(Text.gray('Représentation : personne ne t\'écoute…'))
      return
    }
    for (var a = 0; a < auditeurs.length; a++) {
      ajouterEffet(auditeurs[a], 'minecraft:regeneration', 25 * 20, 0, false, true)
      auditeurs[a].setStatusMessage(Text.lightPurple('♪ ' + joueur.username + ' joue pour toi : Régénération'))
    }
    var pd = joueur.persistentData
    var jour = Math.floor(Number(joueur.level.getDayTime()) / 24000)
    if (Number(pd.getLong('barde_jour')) !== jour) { pd.putLong('barde_jour', jour); pd.putInt('barde_seances', 0) }
    if (Number(pd.getInt('barde_seances')) >= BARDE_SEANCES_JOUR) {
      joueur.setStatusMessage(Text.gray('Représentation : ton public t\'a déjà assez payé aujourd\'hui.'))
      return
    }
    pd.putInt('barde_seances', Number(pd.getInt('barde_seances')) + 1)
    var mult = 1 + 0.5 * Math.min(4, auditeurs.length)
    var emeraudes = villageois ? Math.round((villageois >= 3 ? 2 : 1) * mult) : 0
    var xp = Math.round(5 * mult)
    if (emeraudes > 0) joueur.give(Item.of('minecraft:emerald', emeraudes))
    joueur.giveExperiencePoints(xp)
    joueur.server.runCommandSilent('execute in ' + joueur.level.dimension + ' run particle minecraft:happy_villager ' + Number(joueur.x).toFixed(2) + ' ' + (Number(joueur.y) + 1).toFixed(2) + ' ' + Number(joueur.z).toFixed(2) + ' 1.5 0.5 1.5 0 12')
    joueur.setStatusMessage(Text.gold('♪ Représentation : ' + (emeraudes ? '+' + emeraudes + ' émeraude' + (emeraudes > 1 ? 's' : '') + ', ' : '') + '+' + xp + ' XP' +
      (auditeurs.length ? ' (' + auditeurs.length + ' auditeur' + (auditeurs.length > 1 ? 's' : '') + ')' : '')))
  } catch (e) {
    if (!BARDE_ERR) { BARDE_ERR = true; console.error('[barde] ' + e) }
  }
})
var BARDE_ERR = false

// ───────────── Rapière à clé de sol : note-repère de Dal Segno ─────────────
// Un coup direct porté avec la rapière (dégâts > 0) a RAPIERE_CHANCE de chance de poser une note Segno (repère de
// Tunes & Tomes) à l'emplacement de la cible ; Dal Segno ramène le Barde à la note la plus proche. Le nombre de notes
// par joueur suit la limite du mod (la plus ancienne disparaît). Au plus une note toutes les RAPIERE_DELAI_MS.
var RAPIERE_ID = 'aetheris_armures:rapiere_cle_de_sol', RAPIERE_CHANCE = 0.20, RAPIERE_DELAI_MS = 3000
var RAPIERE = null, RAPIERE_DERNIERE = {}
function rapiereNote(joueur, cible) {
  if (!RAPIERE) RAPIERE = {
    Note: Java.loadClass('net.alshanex.tunes_n_tomes.entity.segno_marker.SegnoMarkerEntity'),
    Attache: Java.loadClass('net.alshanex.tunes_n_tomes.registry.TAttachmentRegistry'),
    Gestion: Java.loadClass('net.alshanex.tunes_n_tomes.util.SoundMarkerManager'),
    Config: Java.loadClass('net.alshanex.tunes_n_tomes.TunesNTomesConfig'),
    Sons: Java.loadClass('net.alshanex.tunes_n_tomes.registry.TSoundRegistry'),
    Source: Java.loadClass('net.minecraft.sounds.SoundSource')
  }
  var niveau = joueur.level
  var note = new RAPIERE.Note(niveau, joueur)
  note.setPos(cible.getX(), cible.getY(), cible.getZ())
  niveau.addFreshEntity(note)
  var donnees = joueur.getData(RAPIERE.Attache.SOUND_MARKER_DATA.get())
  var retiree = donnees.addMarker(note.uuid, RAPIERE.Config.MAX_SOUND_MARKERS.get())
  if (retiree) RAPIERE.Gestion.removeMarkerEntity(niveau, retiree)
  RAPIERE.Gestion.syncMarkerData(joueur)
  niveau.playSound(null, cible.getX(), cible.getY(), cible.getZ(), RAPIERE.Sons.CLEF.get(), RAPIERE.Source.PLAYERS, 1.0, 1.0)
}
try {
  NativeEvents.onEvent(
    Java.loadClass('net.neoforged.neoforge.event.entity.living.LivingDamageEvent$Post'),
    function (ev) {
      try {
        if (ev.getNewDamage() <= 0) return
        var src = ev.getSource()
        var joueur = src.actual          // (getEntity()/getDirectEntity() ne sont pas accessibles ici : accesseurs KubeJS)
        var direct = src.immediate
        if (!joueur || !joueur.isPlayer() || (direct && String(direct.uuid) !== String(joueur.uuid))) return
        if (String(joueur.mainHandItem.id) !== RAPIERE_ID) return
        var cible = ev.getEntity()
        if (String(cible.uuid) === String(joueur.uuid)) return
        var cle = String(joueur.uuid), maintenant = Date.now()
        if (RAPIERE_DERNIERE[cle] && maintenant - RAPIERE_DERNIERE[cle] < RAPIERE_DELAI_MS) return
        if (Math.random() >= RAPIERE_CHANCE) return
        RAPIERE_DERNIERE[cle] = maintenant
        rapiereNote(joueur, cible)
      } catch (e) {
        if (!RAPIERE_ERR) { RAPIERE_ERR = true; console.error('[rapière] ' + e) }
      }
    }
  )
} catch (e) { console.error('[rapière] note Segno indisponible : ' + e) }
var RAPIERE_ERR = false

// ───────────── Harpe du barde : effets des enchantements d'arc à l'impact des notes ─────────────
// La harpe (mixin d'aetheris_armures) note sur chaque note tirée : Flamme, Frappe, Perforation.
// Flamme : la cible brûle 5 s. Frappe : recul. Perforation : la note traverse et repart derrière la cible (une fois par niveau).
var HARPE = null, HARPE_ERR = false
try {
  NativeEvents.onEvent(
    Java.loadClass('net.neoforged.neoforge.event.entity.living.LivingDamageEvent$Post'),
    function (ev) {
      try {
        var note = ev.getSource().immediate
        if (!note || String(note.type) !== 'tunes_n_tomes:default_note') return
        var pd = note.persistentData
        var cible = ev.getEntity()
        var flamme = pd.getInt('aetheris_flamme'), frappe = pd.getInt('aetheris_frappe'), perfo = pd.getInt('aetheris_perforation')
        if (flamme > 0) cible.igniteForSeconds(5)
        var dir = note.getDeltaMovement().normalize()
        if (frappe > 0) cible.knockback(0.6 * frappe, -dir.x(), -dir.z())
        if (perfo > 0 && !pd.getBoolean('aetheris_perce')) {
          pd.putBoolean('aetheris_perce', true)
          if (!HARPE) HARPE = Java.loadClass('net.alshanex.tunes_n_tomes.entity.chord_blast.DefaultNoteEntity')
          var tireur = ev.getSource().actual
          if (!tireur || !tireur.isLiving()) return
          var suite = new HARPE(cible.level, tireur)
          var largeur = cible.getBbWidth() * 0.5 + 0.6
          suite.setPos(cible.getX() + dir.x() * largeur, note.getY(), cible.getZ() + dir.z() * largeur)
          suite.setRotation(note.getXRot(), note.getYRot())
          suite.setDamage(note.getDamage())
          suite.shoot(dir)
          var spd = suite.persistentData
          if (perfo > 1) spd.putInt('aetheris_perforation', perfo - 1)
          if (flamme > 0) { spd.putInt('aetheris_flamme', flamme); suite.igniteForSeconds(100) }
          if (frappe > 0) spd.putInt('aetheris_frappe', frappe)
          cible.level.addFreshEntity(suite)
        }
      } catch (e) {
        if (!HARPE_ERR) { HARPE_ERR = true; console.error('[harpe] ' + e) }
      }
    }
  )
} catch (e) { console.error('[harpe] effets des enchantements indisponibles : ' + e) }

// ───────────── Artefacts de classe (aetheris_armures, emplacements Curios du Chronomancien) ─────────────
// Barde, Hydromancien, Druide, Géomancien, Hémomancien, Paladin : 3 anneaux, 4 charmes, 1 ceinture, 1 collier chacun.
// Effets actifs seulement si l'artefact est porté en Curios par un joueur de la bonne classe.
// Le détail de chaque effet est dans les infobulles (client_scripts/classes_tooltips.js, ARTB_INFOS).
var ARTB_SETS = {
  'Barde': ['anneau_diapason', 'anneau_echo', 'anneau_cadence', 'metronome', 'sourdine', 'boite_a_musique', 'derniere_note', 'bandouliere', 'medaillon_harmonie'],
  'Hydromancien': ['anneau_marees', 'anneau_corail', 'anneau_courant', 'perle_pression', 'coquille_nautile', 'conque_profondeurs', 'larme_leviathan', 'ceinture_algues', 'collier_perles_noires'],
  'Druide': ['anneau_ronces', 'anneau_seve', 'anneau_saisons', 'gland_ancien', 'totem_meute', 'pollen_dore', 'coeur_arbre_monde', 'ceinture_lierre', 'collier_crocs'],
  'Géomancien': ['anneau_granit', 'anneau_fracture', 'anneau_tellurique', 'pierre_ancrage', 'geode_vivante', 'sablier_desert', 'coeur_montagne', 'ceinture_filon', 'collier_fossiles'],
  'Hémomancien': ['anneau_saignee', 'anneau_pacte', 'anneau_frenesie', 'calice_carmin', 'caillot_sang', 'dague_rituelle', 'coeur_battant', 'ceinture_osselets', 'collier_vampire'],
  'Paladin': ['anneau_jugement', 'anneau_serment', 'anneau_aube', 'reliquaire', 'etendard', 'sceau_lumiere', 'aureole_sacree', 'ceinture_croise', 'pendentif_martyr']
}
var ARTB_ECOLES = {
  'Barde': ['tunes_n_tomes:melody'],
  'Hydromancien': ['aces_spell_utils:hydro', 'somakespells:aqua', 'cataclysm_spellbooks:abyssal'],
  'Druide': ['irons_spellbooks:nature'],
  'Géomancien': ['gtbcs_geomancy_plus:geo', 'cataclysm_spellbooks:sand'],
  'Hémomancien': ['irons_spellbooks:blood'],
  'Paladin': ['irons_spellbooks:holy']
}
// Sorts hydro « à eau » : la cible touchée reçoit l'effet Trempé (aetheris_armures:trempe), quel que soit le lanceur.
var ARTB_SORTS_EAU = ['monsterspellbooks:bubble_spray', 'monsterspellbooks:effervescence_bubble', 'monsterspellbooks:razor_typhoon', 'monsterspellbooks:riptide_dash',
  'monsterspellbooks:water_trident', 'somakespells:submerge', 'somakespells:tidal_grasp', 'somakespells:tsunami', 'somakespells:tidal_dash', 'somakespells:thunder_cloud',
  'somakespells:water_control', 'somakespells:water_spear', 'somakespells:water_ball', 'somakespells:hydro_slash', 'somakespells:sea_serpent', 'somakespells:sea_serpent_jet',
  'somakespells:storm_aura', 'cataclysm_spellbooks:depth_charge', 'cataclysm_spellbooks:tidal_grab']
var ARTB_JOURNAL_EAU = {}
var ARTB_ECOLES_EAU = ['aces_spell_utils:hydro', 'somakespells:aqua', 'cataclysm_spellbooks:abyssal']
function artbSortEau(sort) {
  if (ARTB_SORTS_EAU.indexOf(String(sort.getSpellId())) >= 0) return true
  try { return ARTB_ECOLES_EAU.indexOf(String(sort.getSchoolType().getId())) >= 0 } catch (e) { return false }
}
var ARTB_CLASSE = {}
for (var artbC in ARTB_SETS) for (var artbI = 0; artbI < ARTB_SETS[artbC].length; artbI++) ARTB_CLASSE[ARTB_SETS[artbC][artbI]] = artbC
var ARTB = null, ARTB_ERR = {}
function artbInit() {
  if (ARTB) return ARTB
  ARTB = {
    Curios: Java.loadClass('top.theillusivec4.curios.api.CuriosApi'),
    Magie: Java.loadClass('io.redspace.ironsspellbooks.api.magic.MagicData'),
    ManaMax: Java.loadClass('io.redspace.ironsspellbooks.api.registry.AttributeRegistry').MAX_MANA,
    PuissMelo: Java.loadClass('net.alshanex.tunes_n_tomes.registry.TAttributeRegistry').MELODY_SPELL_POWER,
    Vivant: Java.loadClass('net.minecraft.world.entity.LivingEntity'),
    Effets: Java.loadClass('net.minecraft.core.registries.BuiltInRegistries').MOB_EFFECT,
    Sons: Java.loadClass('net.minecraft.sounds.SoundEvents'),
    SrcSon: Java.loadClass('net.minecraft.sounds.SoundSource'),
    Part: Java.loadClass('net.minecraft.core.particles.ParticleTypes'),
    RL: Java.loadClass('net.minecraft.resources.ResourceLocation'),
    SrcSort: Java.loadClass('io.redspace.ironsspellbooks.damage.SpellDamageSource'),
    TagsEntites: Java.loadClass('net.minecraft.tags.EntityTypeTags'),
    reliques: {}, consecration: {},
    cache: {}, blessure: false, partage: false,
    resonance: {}, cadence: {}, tempo: {}, ritournelle: {}, accords: {}, gratuitRecharge: {},
    marees: {}, historique: {}, saison: {}, racines: {}, meute: {}, lierre: {}, granit: {}, tellurique: {},
    fossiles: {}, frenesie: {}, calice: {}, caillot: {}, battement: {}
  }
  return ARTB
}
function artbErreur(cle, e) { if (!ARTB_ERR[cle]) { ARTB_ERR[cle] = true; console.error('[artefacts] ' + cle + ' : ' + e) } }
// Artefacts portés (cache 0,5 s) : { id: pile }
function artbPortes(joueur) {
  var cle = String(joueur.uuid), t = Date.now(), c = ARTB.cache[cle]
  if (c && t - c.t < 500) return c.p
  var p = {}
  var inv = ARTB.Curios.getCuriosInventory(joueur)
  if (inv.isPresent()) {
    var eq = inv.get().getEquippedCurios()
    for (var k = 0; k < eq.getSlots(); k++) {
      var s = eq.getStackInSlot(k)
      if (s.isEmpty()) continue
      var id = String(s.id)
      if (id.indexOf('aetheris_armures:') === 0) p[id.substring(17)] = s
    }
  }
  ARTB.cache[cle] = { t: t, p: p }
  return p
}
// Renvoie la pile portée (ou null) si le joueur est de la classe de l'artefact et le porte.
function artbPorte(joueur, nom) {
  if (!joueur || !joueur.isPlayer()) return null
  artbInit()
  var s = artbPortes(joueur)[nom]
  if (!s) return null
  var cl = classeDe(joueur)
  if (!cl || cl.nom !== ARTB_CLASSE[nom]) return null
  return s
}
function artbEcole(ecole, classe) {
  if (!ecole) return false
  return ARTB_ECOLES[classe].indexOf(String(ecole.getId())) >= 0
}
function artbMelodie(ecole) { return artbEcole(ecole, 'Barde') }
function artbBoss(ent) { return Number(ent.getMaxHealth()) >= 150 }
function artbMortVivant(ent) { try { return ent.getType().is(ARTB.TagsEntites.UNDEAD) } catch (e) { return false } }
function artbPleinJour(joueur) { return joueur.level.isDay() && joueur.level.canSeeSky(joueur.blockPosition()) }
// Hydromancien : « sous l'eau » = immergé, ou en train de lancer le Nuage d'orage (pluie sur une petite zone)
function artbSousLEau(joueur) {
  if (joueur.isUnderWater()) return true
  try {
    var md = ARTB.Magie.getPlayerMagicData(joueur)
    return md.isCasting() && String(md.getCastingSpellId()) === 'somakespells:thunder_cloud'
  } catch (e) { return false }
}
// « Mouillé » : dans l'eau, sous la pluie, effet Mouillé, ou sous son Nuage d'orage
function artbMouille(ent) {
  if (ent.isInWaterRainOrBubble() || artbAEffet(ent, 'somakespells:wet') || artbAEffet(ent, 'aetheris_armures:trempe')) return true
  return ent.isPlayer() && artbSousLEau(ent)
}
function artbJoueursProches(joueur, rayon, avecSoi) {
  var res = [], liste = joueur.level.players
  for (var i = 0; i < liste.size(); i++) {
    var p = liste.get(i)
    if (!avecSoi && String(p.uuid) === String(joueur.uuid)) continue
    if (p.isSpectator() || !p.isAlive()) continue
    if (p.distanceToSqr(joueur) <= rayon * rayon) res.push(p)
  }
  return res
}
function artbEnnemisProches(centre, rayon, exclu) {
  var res = [], liste = centre.level.getEntitiesOfClass(ARTB.Vivant, centre.boundingBox.inflate(rayon))
  for (var i = 0; i < liste.size(); i++) {
    var ent = liste.get(i)
    if (ent.isPlayer() || !ent.isAlive()) continue
    if (exclu && String(ent.uuid) === String(exclu.uuid)) continue
    if (ent.persistentData.getBoolean('artb_allie')) continue
    res.push(ent)
  }
  return res
}
function artbRetirerEffet(entite, id) {
  var h = ARTB.Effets.getHolder(ARTB.RL.parse(id))
  if (h.isPresent() && entite.hasEffect(h.get())) entite.removeEffect(h.get())
}
// Ajoute un effet à une entité. Passe par le Holder du registre (méthode éprouvée dans professeur.js) :
// potionEffects.add('id', ...) de KubeJS ne convertit pas toujours l'identifiant et échoue alors sans rien dire.
var EFFET_J = null
function ajouterEffet(ent, id, duree, ampli, ambiant, visible) {
  if (!EFFET_J) EFFET_J = { MEI: Java.loadClass('net.minecraft.world.effect.MobEffectInstance'), REG: Java.loadClass('net.minecraft.core.registries.BuiltInRegistries').MOB_EFFECT, RL: Java.loadClass('net.minecraft.resources.ResourceLocation'), cache: {}, avertis: {} }
  var cle = String(id), h = EFFET_J.cache[cle]
  if (h === undefined) {
    var o = EFFET_J.REG.getHolder(EFFET_J.RL.parse(cle))
    h = o.isPresent() ? o.get() : null
    EFFET_J.cache[cle] = h
  }
  if (h === null) { if (!EFFET_J.avertis[cle]) { EFFET_J.avertis[cle] = true; console.error('[classes_rp] effet introuvable : ' + cle) } return false }
  return ent.addEffect(new EFFET_J.MEI(h, Math.floor(Number(duree)), Math.floor(Number(ampli || 0)), !!ambiant, visible !== false))
}

function artbAEffet(entite, id) {
  var h = ARTB.Effets.getHolder(ARTB.RL.parse(id))
  return h.isPresent() && entite.hasEffect(h.get())
}
function artbSon(ent, son, vol, ton) {
  var se = son
  try { se = son.value() } catch (x) { se = son }   // certains sons sont des Holder, d'autres des SoundEvent
  ent.level.playSound(null, ent.getX(), ent.getY(), ent.getZ(), se, ARTB.SrcSon.PLAYERS, vol, ton)
}
function artbPart(ent, type, n, etendue) {
  ent.level.sendParticles(type, ent.getX(), ent.getY() + ent.getBbHeight() * 0.6, ent.getZ(), n, etendue, 0.4, etendue, 0.05)
}
function artbNotes(ent, n, etendue) {
  ent.level.sendParticles(ARTB.Part.NOTE, ent.getX(), ent.getY() + ent.getBbHeight() * 0.7, ent.getZ(), n, etendue, 0.4, etendue, 1.0)
}
// Dégâts magiques de l'artefact (source non « sort » : ne relance pas les effets des artefacts)
// ── Animations des artefacts : particules des sorts d'Iron's Spells (arcs électriques, ondes de choc, sang, neige, âmes...) ──
var ARTB_FX = null, ARTB_FX_KO = false
var ARTB_FX_COULEURS = {
  'Barde': [0.75, 0.45, 1], 'Hydromancien': [0.25, 0.6, 1], 'Druide': [0.4, 0.85, 0.3], 'Géomancien': [0.7, 0.55, 0.35],
  'Hémomancien': [0.85, 0.1, 0.15], 'Paladin': [1, 0.85, 0.4], 'Pyromancien': [1, 0.5, 0.1], 'Cryomancien': [0.6, 0.9, 1],
  'Électro-Sorcier': [1, 0.95, 0.4], 'Voyageur du Vide': [0.6, 0.2, 0.9], 'Aéromancien': [0.9, 1, 0.95], 'Nécromancien': [0.3, 0.8, 0.35],
  'Envoûteur': [0.45, 0.1, 0.5], 'Spiritualiste': [0.45, 0.9, 1], 'Symétriste': [0.95, 0.95, 0.95], 'Technomancien': [0.3, 1, 0.8]
}
function artbFxInit() {
  if (ARTB_FX || ARTB_FX_KO) return ARTB_FX
  try {
    var R = Java.loadClass('io.redspace.ironsspellbooks.registries.ParticleRegistry')
    ARTB_FX = {
      MM: Java.loadClass('io.redspace.ironsspellbooks.capabilities.magic.MagicManager'),
      Zap: Java.loadClass('io.redspace.ironsspellbooks.particle.ZapParticleOption'),
      Onde: Java.loadClass('io.redspace.ironsspellbooks.particle.BlastwaveParticleOptions'),
      Brume: Java.loadClass('io.redspace.ironsspellbooks.particle.FogParticleOptions'),
      Vec3: Java.loadClass('net.minecraft.world.phys.Vec3'),
      elec: R.ELECTRICITY_PARTICLE.get(), sang: R.BLOOD_PARTICLE.get(), wisp: R.WISP_PARTICLE.get(), neige: R.SNOWFLAKE_PARTICLE.get(),
      ender: R.UNSTABLE_ENDER_PARTICLE.get(), feu: R.FIRE_PARTICLE.get(), braise: R.EMBER_PARTICLE.get(), siphon: R.SIPHON_PARTICLE.get(),
      acide: R.ACID_PARTICLE.get(), luciole: R.FIREFLY_PARTICLE.get(), purif: R.CLEANSE_PARTICLE.get(), ame: R.SOUL_FIRE_PARTICLE.get(),
      etoile: R.FALLING_SPARKLE_PARTICLE.get()
    }
  } catch (e) { ARTB_FX_KO = true; console.error('[artefacts] animations indisponibles : ' + e) }
  return ARTB_FX
}
function artbFx(ent, nom, n, etendue) {
  var F = artbFxInit()
  if (!F || !F[nom]) return
  F.MM.spawnParticles(ent.level, F[nom], ent.getX(), ent.getY() + ent.getBbHeight() * 0.55, ent.getZ(), n, etendue, ent.getBbHeight() * 0.3, etendue, 0.05, false)
}
// Arc électrique d'une entité à l'autre (particule « zap » de la Chaîne d'éclairs)
function artbFxArc(a, b) {
  var F = artbFxInit()
  if (!F) return
  F.MM.spawnParticles(a.level, new F.Zap(new F.Vec3(b.getX(), b.getY() + b.getBbHeight() * 0.5, b.getZ())), a.getX(), a.getY() + a.getBbHeight() * 0.6, a.getZ(), 1, 0, 0, 0, 0, true)
}
// Onde de choc au sol, colorée selon la classe du joueur
function artbFxOnde(joueur, centre, rayon) {
  var F = artbFxInit()
  if (!F) return
  var cl = joueur && joueur.isPlayer() ? classeDe(joueur) : null
  var c = (cl && ARTB_FX_COULEURS[cl.nom]) || [1, 1, 1]
  F.MM.spawnParticles(centre.level, new F.Onde(c[0], c[1], c[2], rayon), centre.getX(), centre.getY() + 0.15, centre.getZ(), 1, 0, 0, 0, 0, true)
}
function artbFxBrume(centre, r, g, b, taille, n, etendue) {
  var F = artbFxInit()
  if (!F) return
  F.MM.spawnParticles(centre.level, new F.Brume(r, g, b, taille), centre.getX(), centre.getY() + 0.5, centre.getZ(), n, etendue, 0.3, etendue, 0.01, false)
}
// Impact d'un artefact sur une cible, selon la classe (arc électrique pour l'Électro-Sorcier et le Technomancien)
var ARTB_FX_IMPACT = { 'Pyromancien': 'braise', 'Cryomancien': 'neige', 'Hémomancien': 'sang', 'Nécromancien': 'siphon', 'Spiritualiste': 'wisp',
  'Voyageur du Vide': 'ender', 'Paladin': 'purif', 'Envoûteur': 'siphon', 'Druide': 'luciole', 'Électro-Sorcier': 'elec', 'Technomancien': 'elec', 'Symétriste': 'etoile' }
function artbFxImpact(joueur, cible) {
  if (!joueur || !joueur.isPlayer()) return
  var cl = classeDe(joueur)
  if (!cl) return
  var nom = ARTB_FX_IMPACT[cl.nom]
  if (nom) artbFx(cible, nom, 8, 0.3)
  if ((cl.nom === 'Électro-Sorcier' || cl.nom === 'Technomancien') && joueur.distanceToSqr(cible) < 16 * 16) artbFxArc(joueur, cible)
}
function artbBlesser(joueur, cible, montant) {
  if (montant <= 0 || !cible.isAlive()) return
  ARTB.blessure = true
  try { cible.hurt(joueur.damageSources().indirectMagic(joueur, joueur), montant) } finally { ARTB.blessure = false }
  try { artbFxImpact(joueur, cible) } catch (e) {}
}
function artbMana(joueur, quantite) {
  var md = ARTB.Magie.getPlayerMagicData(joueur)
  var max = Number(joueur.getAttributeValue(ARTB.ManaMax)), mana = Number(md.getMana())
  if (mana < max) md.setMana(Math.min(max, mana + quantite))
}
function artbPousser(ent, vx, vy, vz) {
  ent.setDeltaMovement(vx, vy, vz)
  ent.hurtMarked = true
}
// Onde de choc : recul + effet éventuel + dégâts éventuels
function artbOnde(joueur, centre, rayon, degats, force, effet, duree, ampli) {
  var ennemis = artbEnnemisProches(centre, rayon, null)
  for (var i = 0; i < ennemis.length; i++) {
    var ent = ennemis[i]
    if (degats > 0) artbBlesser(joueur, ent, degats)
    if (force > 0) ent.knockback(force, centre.getX() - ent.getX(), centre.getZ() - ent.getZ())
    if (effet) ajouterEffet(ent, effet, duree, ampli || 0, false, true)
  }
  try { artbFxOnde(joueur, centre, rayon) } catch (e) {}
  return ennemis
}
// Dégâts sur la durée : n coups toutes les secondes
function artbSurLaDuree(joueur, cible, n, degats, soinLanceur) {
  for (var k = 1; k <= n; k++) {
    joueur.server.scheduleInTicks(20 * k, function () {
      try {
        if (!cible.isAlive()) return
        artbBlesser(joueur, cible, degats)
        if (soinLanceur > 0 && joueur.isAlive()) joueur.heal(soinLanceur)
      } catch (e) { artbErreur('dégâts sur la durée', e) }
    })
  }
}
function artbStatut(joueur, texte, couleur) {
  joueur.setStatusMessage(couleur === 'aqua' ? Text.aqua(texte) : couleur === 'green' ? Text.green(texte) : couleur === 'gold' ? Text.gold(texte) : couleur === 'red' ? Text.red(texte) : Text.lightPurple(texte))
}
// Anneau de Cadence : un temps (« arme » ou « sort ») ; renvoie true si la mesure est complète.
function artbCadence(joueur, temps) {
  var cle = String(joueur.uuid), c = ARTB.cadence[cle], t = Date.now()
  if (!c || t - c.quand > 3000) c = { n: 0, dernier: '', pret: false, quand: 0 }
  if (c.pret) { ARTB.cadence[cle] = null; return true }
  if (c.dernier !== temps) c.n++
  c.dernier = temps; c.quand = t
  if (c.n >= 4) c.pret = true
  ARTB.cadence[cle] = c
  var barre = ''
  for (var i = 1; i <= 4; i++) barre += i <= c.n ? '♪' : '·'
  artbStatut(joueur, c.pret ? 'Mesure complète : prochain coup ou sort !' : 'Mesure ' + barre)
  return false
}
function artbFinMesure(joueur, cible) {
  artbOnde(joueur, cible, 4, 0, 1.2, 'tunes_n_tomes:deafened', 80, 0)
  artbNotes(cible, 24, 2)
  artbSon(joueur, ARTB.Sons.NOTE_BLOCK_BASS, 1.2, 0.8)
}
// Druide : saison courante (change toutes les minutes)
var ARTB_SAISONS = ['Printemps', 'Été', 'Automne', 'Hiver']
var ARTB_EFFETS_SAISONS = ['aetheris_armures:printemps', 'aetheris_armures:ete', 'aetheris_armures:automne', 'aetheris_armures:hiver']
function artbSaisonsRetirer(joueur) { for (var i = 0; i < 4; i++) artbRetirerEffet(joueur, ARTB_EFFETS_SAISONS[i]) }
// Messages en bas de l'écran quand un joueur reçoit un effet de classe
var ARTB_MESSAGES_EFFETS = {
  'aetheris_armures:marque_melodique': ['Vous êtes marqué par un sort mélodique', 'lightPurple'],
  'aetheris_armures:trempe': ['Vous êtes trempés', 'aqua'],
  'aetheris_armures:petrifie': ['Vous êtes pétrifiés', 'gold']
}
function artbSaison() { return Math.floor(Date.now() / 60000) % 4 }
function artbPierre(bloc) {
  var id = String(bloc.getBlock().builtInRegistryHolder().key().location())
  return /stone|deepslate|granite|andesite|diorite|tuff|basalt|calcite|blackstone|cobble|ore/.test(id)
}
function artbSolVivant(bloc) {
  var id = String(bloc.getBlock().builtInRegistryHolder().key().location())
  return /grass|dirt|moss|podzol|mycelium|rooted|mud|leaves|farmland/.test(id)
}

// ═══ Lancement d'un sort ═══
try {
  NativeEvents.onEvent(Java.loadClass('io.redspace.ironsspellbooks.api.events.SpellOnCastEvent'), function (ev) {
    try {
      var joueur = ev.getEntity()
      var ecole = ev.getSchoolType()
      artbInit()
      var cle = String(joueur.uuid), gratuit = false, reduction = 0, t = Date.now()
      if (artbMelodie(ecole)) {
        if (artbPorte(joueur, 'metronome')) {
          var tp = ARTB.tempo[cle]
          var ecart = tp ? t - tp.quand : -1
          if (tp && ecart >= 1500 && ecart <= 4000) tp.n++
          else tp = { n: 0 }
          tp.quand = t
          ARTB.tempo[cle] = tp
          if (tp.n >= 3) {
            gratuit = true; tp.n = 0
            ARTB.gratuitRecharge[cle] = t
            artbStatut(joueur, '♪ Tempo parfait : sort gratuit et sans recharge', 'gold')
            artbSon(joueur, ARTB.Sons.NOTE_BLOCK_CHIME, 1, 1.5)
          } else if (tp.n > 0) {
            reduction += 0.25
            artbStatut(joueur, '♪ Dans le tempo (' + tp.n + '/3)')
          }
        }
        if (artbPorte(joueur, 'bandouliere')) {
          var public_ = artbJoueursProches(joueur, 12, false)
          reduction += 0.10 * Math.min(3, public_.length)
          for (var i = 0; i < public_.length; i++) ajouterEffet(public_[i], 'tunes_n_tomes:cheered', 100, 0, false, true)
        }
        if (artbPorte(joueur, 'anneau_cadence') && artbCadence(joueur, 'sort')) artbFinMesure(joueur, joueur)
      }
      if (artbEcole(ecole, 'Hydromancien')) {
        if (artbPorte(joueur, 'perle_pression') && artbSousLEau(joueur)) reduction += 0.25
        if (artbPorte(joueur, 'anneau_courant') && joueur.isSprinting()) {
          var regard = joueur.getLookAngle(), force = artbMouille(joueur) ? 2.4 : 1.4
          artbPousser(joueur, regard.x() * force, Math.max(0.15, regard.y() * force * 0.6), regard.z() * force)
          artbPart(joueur, ARTB.Part.SPLASH, 30, 0.6)
          artbSon(joueur, ARTB.Sons.TRIDENT_RIPTIDE_1, 1, 1)
        }
      }
      if (artbEcole(ecole, 'Druide') && artbPorte(joueur, 'totem_meute') && Math.random() < 0.10 && !(ARTB.meute[cle] && t - ARTB.meute[cle] < 30000)) {
        ARTB.meute[cle] = t
        for (var l = 0; l < 2; l++) {
          var loup = joueur.level.createEntity('minecraft:wolf')
          loup.setPos(joueur.getX() + (l ? 1.5 : -1.5), joueur.getY(), joueur.getZ() + 1)
          loup.tame(joueur)
          loup.persistentData.putBoolean('artb_allie', true)
          joueur.level.addFreshEntity(loup)
          artbPart(loup, ARTB.Part.HAPPY_VILLAGER, 12, 0.5)
          joueur.server.scheduleInTicks(400, function () { try { if (loup.isAlive()) loup.discard() } catch (e2) {} })
        }
        artbSon(joueur, ARTB.Sons.WOLF_HOWL, 1, 1)
        artbStatut(joueur, '🐺 La meute répond à ton appel', 'green')
      }
      if (artbEcole(ecole, 'Géomancien') && artbPorte(joueur, 'anneau_tellurique')) {
        ARTB.tellurique[cle] = (ARTB.tellurique[cle] || 0) + 1
        if (ARTB.tellurique[cle] >= 5) {
          ARTB.tellurique[cle] = 0
          var touches = artbOnde(joueur, joueur, 6, 4, 0, 'minecraft:slowness', 60, 1)
          for (var q = 0; q < touches.length; q++) if (!artbBoss(touches[q])) artbPousser(touches[q], 0, 0.55, 0)
          artbPart(joueur, ARTB.Part.EXPLOSION, 8, 3)
          artbSon(joueur, ARTB.Sons.GENERIC_EXPLODE, 1, 0.6)
          artbStatut(joueur, '⛰ Secousse tellurique !', 'gold')
        } else artbStatut(joueur, '⛰ Secousse ' + ARTB.tellurique[cle] + '/5', 'gold')
      }
      if (artbEcole(ecole, 'Hémomancien') && artbPorte(joueur, 'anneau_pacte')) {
        var cout = Number(ev.getManaCost())
        var pv = cout * 0.04
        if (Number(joueur.getHealth()) - pv >= 1) {
          reduction += 0.5
          joueur.setHealth(Number(joueur.getHealth()) - pv)
          artbFx(joueur, 'sang', 10, 0.3)
        }
      }
      if (artbEcole(ecole, 'Paladin') && artbPorte(joueur, 'anneau_aube') && artbPleinJour(joueur)) reduction += 0.25
      if (gratuit) ev.setManaCost(0)
      else if (reduction > 0) ev.setManaCost(Math.floor(Number(ev.getManaCost()) * (1 - Math.min(0.4, reduction))))
    } catch (e) { artbErreur('lancement', e) }
  })
} catch (e) { console.error('[artefacts] lancement indisponible : ' + e) }

// Recharge : sort « tempo parfait » du Métronome
try {
  NativeEvents.onEvent(Java.loadClass('io.redspace.ironsspellbooks.api.events.SpellCooldownAddedEvent$Pre'), function (ev) {
    try {
      if (!ARTB || !artbMelodie(ev.getSpell().getSchoolType())) return
      var cle = String(ev.getEntity().uuid), t = ARTB.gratuitRecharge[cle]
      if (!t || Date.now() - t > 20000) return
      ARTB.gratuitRecharge[cle] = 0
      ev.setEffectiveCooldown(0)
    } catch (e) { artbErreur('recharge', e) }
  })
} catch (e) { console.error('[artefacts] recharge indisponible : ' + e) }

// ═══ Dégâts de sort ═══
try {
  NativeEvents.onEvent(Java.loadClass('io.redspace.ironsspellbooks.api.events.SpellDamageEvent'), function (ev) {
    try {
      var cible = ev.getEntity()
      var src = ev.getSpellDamageSource()
      var lanceur = src.actual
      artbInit()
      // Sourdine (Barde) : la cible porte l'étouffoir
      if (cible && cible.isPlayer() && artbPorte(cible, 'sourdine') && (!lanceur || String(lanceur.uuid) !== String(cible.uuid))) {
        var etouffe = Number(ev.getAmount()) * 0.15
        ev.setAmount(Number(ev.getAmount()) - etouffe)
        artbMana(cible, etouffe * 2)
      }
      // Sorts à eau : la cible est mouillée (5 s)
      // (tous les sorts des écoles de l'Hydromancien — hydro, aqua, abyssal — plus les sorts d'eau des autres écoles listés)
      if (cible && (!lanceur || String(cible.uuid) !== String(lanceur.uuid)) && artbSortEau(src.spell())) {
        ajouterEffet(cible, 'aetheris_armures:trempe', 100, 0, false, true)
        if (!ARTB_JOURNAL_EAU.t || Date.now() - ARTB_JOURNAL_EAU.t > 60000) { ARTB_JOURNAL_EAU.t = Date.now(); console.info('[artefacts] trempé : ' + cible.type + ' touché par ' + src.spell().getSpellId()) }
      }
      if (!lanceur || !cible || !lanceur.isPlayer() || String(cible.uuid) === String(lanceur.uuid)) return
      var ecole = src.spell().getSchoolType()
      var t = Date.now(), cleC = String(cible.uuid), cleL = String(lanceur.uuid)
      // ── Barde ──
      if (artbMelodie(ecole)) {
        var degatsB = Number(ev.getAmount())
        if (artbPorte(lanceur, 'anneau_diapason')) {
          var marque = ARTB.resonance[cleC]
          if (marque && t - marque < 4000) {
            ARTB.resonance[cleC] = 0
            var autour = artbEnnemisProches(cible, 4, cible)
            for (var i = 0; i < autour.length; i++) artbBlesser(lanceur, autour[i], degatsB * 0.4)
            artbFxOnde(lanceur, cible, 4)
            artbNotes(cible, 16, 2)
            artbSon(cible, ARTB.Sons.NOTE_BLOCK_BELL, 1, 1.2)
          } else {
            ARTB.resonance[cleC] = t
            ajouterEffet(cible, 'aetheris_armures:marque_melodique', 80, 0, false, true)
          }
        }
        if (artbPorte(lanceur, 'anneau_echo')) {
          var echo = degatsB * 0.35
          lanceur.server.scheduleInTicks(30, function () {
            try {
              if (!cible.isAlive() || !lanceur.isAlive()) return
              artbBlesser(lanceur, cible, echo)
              artbNotes(cible, 6, 0.4)
              artbSon(cible, ARTB.Sons.NOTE_BLOCK_HARP, 0.8, 0.7)
            } catch (e2) { artbErreur('écho', e2) }
          })
        }
      }
      // ── Hydromancien ──
      if (artbEcole(ecole, 'Hydromancien')) {
        if (artbPorte(lanceur, 'anneau_marees')) {
          var maree = (ARTB.marees[cleL] || 0)
          if (maree >= 5) {
            ARTB.marees[cleL] = 0
            ev.setAmount(Number(ev.getAmount()) * 1.5)
            var happes = artbEnnemisProches(cible, 5, cible)
            for (var h = 0; h < happes.length; h++) if (!artbBoss(happes[h])) happes[h].knockback(1.0, happes[h].getX() - cible.getX(), happes[h].getZ() - cible.getZ())
            artbPart(cible, ARTB.Part.SPLASH, 40, 2)
            artbSon(cible, ARTB.Sons.GENERIC_SPLASH, 1.2, 0.7)
            artbFxOnde(lanceur, cible, 5)
            artbStatut(lanceur, '🌊 Marée haute !', 'aqua')
          } else {
            ARTB.marees[cleL] = maree + 1
            var vagues = ''
            for (var v = 1; v <= 5; v++) vagues += v <= maree + 1 ? '≈' : '·'
            artbStatut(lanceur, '🌊 Marée ' + vagues, 'aqua')
          }
        }
        if (artbPorte(lanceur, 'anneau_corail')) {
          if (artbMouille(cible)) ev.setAmount(Number(ev.getAmount()) * 1.2)
          else ajouterEffet(cible, 'minecraft:slowness', 60, 1, false, true)
        }
        if (artbPorte(lanceur, 'conque_profondeurs') && Math.random() < 0.15) {
          artbBlesser(lanceur, cible, 4)
          if (!artbBoss(cible)) artbPousser(cible, 0, 1.0, 0)
          artbPart(cible, ARTB.Part.SPLASH, 50, 0.4)
          artbPart(cible, ARTB.Part.BUBBLE_COLUMN_UP, 30, 0.3)
          artbSon(cible, ARTB.Sons.BUBBLE_COLUMN_UPWARDS_INSIDE, 1.5, 1)
        }
        if (artbPorte(lanceur, 'collier_perles_noires') && !cible.persistentData.getBoolean('artb_noyade')) {
          cible.persistentData.putBoolean('artb_noyade', true)
          artbSurLaDuree(lanceur, cible, 4, 2, 0)
          lanceur.server.scheduleInTicks(81, function () { try { cible.persistentData.putBoolean('artb_noyade', false) } catch (e3) {} })
          artbPart(cible, ARTB.Part.BUBBLE, 20, 0.4)
        }
      }
      // ── Druide ──
      if (artbEcole(ecole, 'Druide')) {
        if (artbPorte(lanceur, 'anneau_ronces') && Math.random() < 0.25 && !artbBoss(cible) && !(ARTB.racines['r' + cleC] && t - ARTB.racines['r' + cleC] < 6000)) {
          ARTB.racines['r' + cleC] = t
          ajouterEffet(cible, 'minecraft:slowness', 20, 9, false, true)
          artbSurLaDuree(lanceur, cible, 3, 1, 0)
          artbPart(cible, ARTB.Part.HAPPY_VILLAGER, 10, 0.5); artbFx(cible, 'luciole', 10, 0.5)
        }
        if (artbPorte(lanceur, 'anneau_seve')) {
          var seve = Number(ev.getAmount()) * 0.15
          var manque = Number(lanceur.getMaxHealth()) - Number(lanceur.getHealth())
          lanceur.heal(seve)
          if (seve > manque) {
            var allies = artbJoueursProches(lanceur, 10, false)
            if (allies.length) allies[0].heal(seve - manque)
          }
        }
        if (artbPorte(lanceur, 'anneau_saisons')) {
          var s = artbSaison()
          if (s === 0) lanceur.heal(1)
          else if (s === 1) cible.igniteForSeconds(3)
          else if (s === 2) ajouterEffet(cible, 'minecraft:weakness', 80, 0, false, true)
          else ajouterEffet(cible, 'minecraft:slowness', 60, 1, false, true)
        }
      }
      // ── Géomancien ──
      if (artbEcole(ecole, 'Géomancien')) {
        if (artbPorte(lanceur, 'anneau_granit')) {
          var pierres = (ARTB.granit[cleC] && t - ARTB.granit[cleC].t < 6000) ? ARTB.granit[cleC].n + 1 : 1
          if (pierres >= 4) {
            ARTB.granit[cleC] = null
            if (!artbBoss(cible)) ajouterEffet(cible, 'aetheris_armures:petrifie', 30, 0, false, true)
            ajouterEffet(cible, 'minecraft:mining_fatigue', 30, 2, false, true)
            artbPart(cible, ARTB.Part.CLOUD, 20, 0.4)
            artbSon(cible, ARTB.Sons.STONE_PLACE, 1.5, 0.6)
            artbStatut(lanceur, '⛰ Pétrifié !', 'gold')
          } else ARTB.granit[cleC] = { n: pierres, t: t }
        }
        if (artbPorte(lanceur, 'anneau_fracture') && artbPierre(cible.level.getBlockState(cible.blockPosition().below()))) {
          ev.setAmount(Number(ev.getAmount()) * 1.2)
          if (!artbBoss(cible)) artbPousser(cible, 0, 0.45, 0)
          artbPart(cible, ARTB.Part.CRIT, 15, 0.4)
        }
        if (artbPorte(lanceur, 'sablier_desert') && Math.random() < 0.20) ajouterEffet(cible, 'minecraft:blindness', 40, 0, false, true)
      }
      // ── Hémomancien ──
      if (artbEcole(ecole, 'Hémomancien')) {
        if (artbPorte(lanceur, 'ceinture_osselets') && Number(cible.getHealth()) < Number(cible.getMaxHealth()) * 0.3) {
          ev.setAmount(Number(ev.getAmount()) * 1.3)
          artbPart(cible, ARTB.Part.DAMAGE_INDICATOR, 6, 0.3)
        }
        if (artbPorte(lanceur, 'anneau_saignee') && !cible.persistentData.getBoolean('artb_saigne')) {
          cible.persistentData.putBoolean('artb_saigne', true)
          artbSurLaDuree(lanceur, cible, 4, 1, 1)
          lanceur.server.scheduleInTicks(81, function () { try { cible.persistentData.putBoolean('artb_saigne', false) } catch (e4) {} })
        }
        if (artbPorte(lanceur, 'anneau_frenesie')) {
          var fr = (ARTB.frenesie[cleL] && t - ARTB.frenesie[cleL].t < 8000) ? ARTB.frenesie[cleL].n + 1 : 1
          if (fr >= 5) {
            ARTB.frenesie[cleL] = null
            ajouterEffet(lanceur, 'minecraft:strength', 120, 0, false, true)
            ajouterEffet(lanceur, 'minecraft:speed', 120, 0, false, true)
            artbStatut(lanceur, '🩸 Frénésie !', 'red')
          } else {
            ARTB.frenesie[cleL] = { n: fr, t: t }
            artbStatut(lanceur, '🩸 Frénésie ' + fr + '/5', 'red')
          }
        }
        if (artbPorte(lanceur, 'collier_vampire')) {
          var part = Number(ev.getAmount()) * 0.15
          var proches = artbJoueursProches(lanceur, 8, false)
          for (var a = 0; a < proches.length; a++) proches[a].heal(part)
        }
      }
      // ── Paladin ──
      if (artbEcole(ecole, 'Paladin')) {
        if (artbPorte(lanceur, 'anneau_jugement') && artbMortVivant(cible)) {
          ev.setAmount(Number(ev.getAmount()) * 1.3)
          cible.igniteForSeconds(3)
          artbPart(cible, ARTB.Part.END_ROD, 8, 0.4)
        }
        if (artbPorte(lanceur, 'anneau_aube') && !lanceur.level.isDay()) {
          ajouterEffet(cible, 'minecraft:glowing', 120, 0, false, false)
          ajouterEffet(cible, 'minecraft:weakness', 80, 0, false, true)
        }
      }
    } catch (e) { artbErreur('dégâts de sort', e) }
  })
} catch (e) { console.error('[artefacts] dégâts de sort indisponibles : ' + e) }

// ═══ Dégâts infligés et subis (après calcul) ═══
try {
  NativeEvents.onEvent(Java.loadClass('net.neoforged.neoforge.event.entity.living.LivingDamageEvent$Post'), function (ev) {
    try {
      if (!ARTB) return
      var degats = Number(ev.getNewDamage())
      if (degats <= 0) return
      var src = ev.getSource(), cible = ev.getEntity(), t = Date.now()
      var auteur = src.actual, direct = src.immediate
      // Cœur battant : vol de vie total
      if (auteur && auteur.isPlayer() && ARTB.battement[String(auteur.uuid)] > t && String(auteur.uuid) !== String(cible.uuid)) auteur.heal(degats)
      // Cadence (Barde) : coup d'arme
      if (!ARTB.blessure && !(src instanceof ARTB.SrcSort) && auteur && auteur.isPlayer() && direct && String(direct.uuid) === String(auteur.uuid)
          && String(cible.uuid) !== String(auteur.uuid) && artbPorte(auteur, 'anneau_cadence') && artbCadence(auteur, 'arme')) artbFinMesure(auteur, cible)
      if (!cible.isPlayer()) return
      var cleC = String(cible.uuid)
      // Coquille de nautile
      var coq = artbPorte(cible, 'coquille_nautile')
      if (coq && Number(cible.getHealth()) < Number(cible.getMaxHealth()) * 0.4 && !cible.getCooldowns().isOnCooldown(coq.getItem())) {
        cible.getCooldowns().addCooldown(coq.getItem(), 1200)
        ajouterEffet(cible, 'minecraft:absorption', 100, 1, false, true)
        artbMana(cible, 20)
        artbPart(cible, ARTB.Part.BUBBLE_POP, 30, 0.6)
        artbSon(cible, ARTB.Sons.BUBBLE_COLUMN_WHIRLPOOL_INSIDE, 1.5, 1)
        artbStatut(cible, '🐚 Bulle protectrice', 'aqua')
      }
      // Ceinture de lierre : l'attaquant au corps à corps est entravé
      if (auteur && direct && String(direct.uuid) === String(auteur.uuid) && String(auteur.uuid) !== cleC && auteur.isLiving() && artbPorte(cible, 'ceinture_lierre')) {
        var cleA = String(auteur.uuid)
        if (!(ARTB.lierre[cleA] && t - ARTB.lierre[cleA] < 2000)) {
          ARTB.lierre[cleA] = t
          ajouterEffet(auteur, 'minecraft:slowness', 40, 2, false, true)
          artbBlesser(cible, auteur, 1)
          artbPart(auteur, ARTB.Part.HAPPY_VILLAGER, 8, 0.4)
        }
      }
      // Géode vivante : éclats contre l'attaquant tant que le bouclier tient
      if (auteur && auteur.isLiving() && String(auteur.uuid) !== cleC && Number(cible.getAbsorptionAmount()) > 0 && artbPorte(cible, 'geode_vivante')) artbBlesser(cible, auteur, 2)
      // Caillot de sang : la moitié des gros coups est régénérée en 3 s
      if (degats > 4 && artbPorte(cible, 'caillot_sang') && !(ARTB.caillot[cleC] && t - ARTB.caillot[cleC] < 15000)) {
        ARTB.caillot[cleC] = t
        var parTick = degats * 0.3 / 6
        for (var k = 1; k <= 6; k++) cible.server.scheduleInTicks(10 * k, function () { try { if (cible.isAlive()) cible.heal(parTick) } catch (e2) {} })
        artbStatut(cible, '🩸 Coagulation', 'red')
      }
    } catch (e) { artbErreur('dégâts', e) }
  })
} catch (e) { console.error('[artefacts] dégâts indisponibles : ' + e) }

// ═══ Dégâts entrants (avant calcul) : Accord, Ancrage, Mémoire des âges ═══
try {
  NativeEvents.onEvent(Java.loadClass('net.neoforged.neoforge.event.entity.living.LivingIncomingDamageEvent'), function (ev) {
    try {
      if (!ARTB || ARTB.partage) return
      var joueur = ev.getEntity()
      if (!joueur || !joueur.isPlayer()) return
      var cle = String(joueur.uuid), t = Date.now()
      if (joueur.isCrouching() && artbPorte(joueur, 'pierre_ancrage')) ev.setAmount(Number(ev.getAmount()) * 0.85)
      if (Number(ev.getAmount()) > 6 && artbPorte(joueur, 'collier_fossiles') && !(ARTB.fossiles[cle] && t - ARTB.fossiles[cle] < 30000)) {
        ARTB.fossiles[cle] = t
        ev.setAmount(Math.max(6, Number(ev.getAmount()) * 0.5))
        artbStatut(joueur, '⛰ Mémoire des âges : coup amorti', 'gold')
        artbPart(joueur, ARTB.Part.CLOUD, 12, 0.4)
      }
      // Pendentif du martyr : un Paladin proche encaisse 30 % des dégâts de l'allié
      var allies = artbJoueursProches(joueur, 8, false)
      for (var m = 0; m < allies.length; m++) {
        if (!artbPorte(allies[m], 'pendentif_martyr')) continue
        var part = Number(ev.getAmount()) * 0.3
        ev.setAmount(Number(ev.getAmount()) - part)
        ARTB.partage = true
        try { allies[m].hurt(allies[m].damageSources().magic(), part) } finally { ARTB.partage = false }
        artbMana(allies[m], part * 2)
        artbPart(joueur, ARTB.Part.END_ROD, 4, 0.3)
        break
      }
      var lien = ARTB.accords[cle]
      if (!lien || t > lien.fin) return
      var autre = joueur.server.getPlayerList().getPlayer(lien.avec)
      if (!autre || !autre.isAlive() || String(autre.level.dimension().location()) !== String(joueur.level.dimension().location()) || autre.distanceToSqr(joueur) > 24 * 24) return
      var moitie = Number(ev.getAmount()) / 2
      ev.setAmount(moitie)
      ARTB.partage = true
      try { autre.hurt(autre.damageSources().magic(), moitie) } finally { ARTB.partage = false }
    } catch (e) { ARTB.partage = false; artbErreur('dégâts entrants', e) }
  })
} catch (e) { console.error('[artefacts] dégâts entrants indisponibles : ' + e) }

// Ceinture du croisé : un coup paré au bouclier renvoie la moitié des dégâts et soigne d'un demi-cœur
try {
  NativeEvents.onEvent(Java.loadClass('net.neoforged.neoforge.event.entity.living.LivingShieldBlockEvent'), function (ev) {
    try {
      var joueur = ev.getEntity()
      if (!joueur || !joueur.isPlayer() || !ev.getBlocked() || !artbPorte(joueur, 'ceinture_croise')) return
      var auteur = ev.getDamageSource().actual
      if (auteur && auteur.isLiving() && String(auteur.uuid) !== String(joueur.uuid)) artbBlesser(joueur, auteur, Number(ev.getBlockedDamage()) * 0.5)
      joueur.heal(1)
      artbPart(joueur, ARTB.Part.END_ROD, 6, 0.4)
    } catch (e) { artbErreur('croisé', e) }
  })
} catch (e) { console.error('[artefacts] croisé indisponible : ' + e) }

// Pierre d'ancrage : pas de recul accroupi
try {
  NativeEvents.onEvent(Java.loadClass('net.neoforged.neoforge.event.entity.living.LivingKnockBackEvent'), function (ev) {
    try {
      var joueur = ev.getEntity()
      if (joueur && joueur.isPlayer() && joueur.isCrouching() && artbPorte(joueur, 'pierre_ancrage')) ev.setCanceled(true)
    } catch (e) { artbErreur('ancrage', e) }
  })
} catch (e) { console.error('[artefacts] ancrage indisponible : ' + e) }

// ═══ Soins ═══
try {
  NativeEvents.onEvent(Java.loadClass('io.redspace.ironsspellbooks.api.events.SpellHealEvent'), function (ev) {
    try {
      var soigneur = ev.getEntity(), cible = ev.getTargetEntity()
      if (!cible) return
      // Médaillon d'Harmonie (Barde)
      if (cible.isPlayer() && String(cible.uuid) !== String(soigneur.uuid) && artbPorte(soigneur, 'medaillon_harmonie')) {
        var fin = Date.now() + 10000
        ARTB.accords[String(soigneur.uuid)] = { avec: cible.uuid, fin: fin }
        ARTB.accords[String(cible.uuid)] = { avec: soigneur.uuid, fin: fin }
        cible.setStatusMessage(Text.lightPurple('♪ Accord avec ' + soigneur.username + ' : dégâts partagés 10 s'))
        artbNotes(cible, 8, 0.5)
      }
      // Anneau du Serment (Paladin) : bouclier de foi
      if (String(cible.uuid) !== String(soigneur.uuid) && artbPorte(soigneur, 'anneau_serment')) {
        var bouclier = Number(ev.getHealAmount()) * 0.25
        cible.setAbsorptionAmount(Math.min(10, Number(cible.getAbsorptionAmount()) + bouclier))
        artbPart(cible, ARTB.Part.END_ROD, 6, 0.4)
      }
      // Pollen doré (Druide)
      if (artbPorte(soigneur, 'pollen_dore')) {
        ajouterEffet(cible, 'minecraft:regeneration', 80, 1, false, true)
        var mauvais = ['minecraft:poison', 'minecraft:wither', 'minecraft:weakness', 'minecraft:slowness', 'minecraft:blindness', 'minecraft:hunger']
        for (var i = 0; i < mauvais.length; i++) if (artbAEffet(cible, mauvais[i])) { artbRetirerEffet(cible, mauvais[i]); break }
        artbPart(cible, ARTB.Part.HAPPY_VILLAGER, 10, 0.5)
      }
    } catch (e) { artbErreur('soins de sort', e) }
  })
} catch (e) { console.error('[artefacts] soins de sort indisponibles : ' + e) }
// Calice carmin : les soins en excès remplissent le calice
try {
  NativeEvents.onEvent(Java.loadClass('net.neoforged.neoforge.event.entity.living.LivingHealEvent'), function (ev) {
    try {
      var joueur = ev.getEntity()
      if (!ARTB || !joueur || !joueur.isPlayer()) return
      var exces = Number(joueur.getHealth()) + Number(ev.getAmount()) - Number(joueur.getMaxHealth())
      if (exces <= 0 || !artbPorte(joueur, 'calice_carmin')) return
      var cle = String(joueur.uuid)
      ARTB.calice[cle] = Math.min(10, (ARTB.calice[cle] || 0) + exces)
    } catch (e) { artbErreur('calice', e) }
  })
} catch (e) { console.error('[artefacts] calice indisponible : ' + e) }

// ═══ Morts : sauvetages (charmes ultimes) et récompenses de mise à mort ═══
function artbSauvetage(joueur, nom, src) {
  var pile = artbPorte(joueur, nom)
  if (!pile) return false
  var msg = ''
  try { msg = String(src.getMsgId()) } catch (x) {}
  if (msg === 'outOfWorld' || msg === 'genericKill') return false
  if (joueur.getCooldowns().isOnCooldown(pile.getItem())) return false
  joueur.getCooldowns().addCooldown(pile.getItem(), 6000)
  return true
}
try {
  NativeEvents.onEvent(Java.loadClass('net.neoforged.neoforge.event.entity.living.LivingDeathEvent'), function (ev) {
    try {
      var mort = ev.getEntity(), src = ev.getSource()
      artbInit()
      if (!mort.isPlayer()) {
        // Récompenses de mise à mort par un sort
        var tueur = src.actual
        if (!tueur || !tueur.isPlayer() || !(src instanceof ARTB.SrcSort)) return
        var ecole = src.spell().getSchoolType()
        if (artbEcole(ecole, 'Druide') && artbPorte(tueur, 'collier_crocs')) {
          tueur.setAbsorptionAmount(Math.min(8, Number(tueur.getAbsorptionAmount()) + 2))
          ajouterEffet(tueur, 'minecraft:speed', 100, 0, false, true)
          artbStatut(tueur, '🐺 Instinct sauvage', 'green')
        }
        if (artbEcole(ecole, 'Hémomancien') && artbPorte(tueur, 'dague_rituelle')) {
          artbMana(tueur, 15)
          tueur.heal(2)
          artbPart(mort, ARTB.Part.DAMAGE_INDICATOR, 10, 0.5)
          artbStatut(tueur, '🩸 Sacrifice accepté', 'red')
        }
        return
      }
      var joueur = mort, cle = String(joueur.uuid)
      if (artbSauvetage(joueur, 'derniere_note', src)) {
        ev.setCanceled(true)
        joueur.setHealth(1)
        ajouterEffet(joueur, 'minecraft:resistance', 60, 4, false, true)
        artbStatut(joueur, '♪ Chant du cygne...', 'gold')
        artbSon(joueur, ARTB.Sons.NOTE_BLOCK_BELL, 1.5, 0.5)
        joueur.server.scheduleInTicks(20, function () {
          try {
            if (!joueur.isAlive()) return
            var puiss = Number(joueur.getAttributeValue(ARTB.PuissMelo))
            artbOnde(joueur, joueur, 6, 8 * puiss, 1.8, 'tunes_n_tomes:deafened', 100, 0)
            artbNotes(joueur, 40, 3)
            artbSon(joueur, ARTB.Sons.NOTE_BLOCK_BELL, 2, 1.0)
            ajouterEffet(joueur, 'minecraft:regeneration', 80, 2, false, true)
            artbStatut(joueur, '♪ Dernière Note !', 'gold')
          } catch (e2) { artbErreur('dernière note', e2) }
        })
        return
      }
      if (artbSauvetage(joueur, 'larme_leviathan', src)) {
        var hist = ARTB.historique[cle], dim = String(joueur.level.dimension().location())
        ev.setCanceled(true)
        artbOnde(joueur, joueur, 5, 6, 1.5, 'minecraft:slowness', 60, 1)
        artbPart(joueur, ARTB.Part.SPLASH, 60, 1.5)
        if (hist && hist.length && hist[0].dim === dim) joueur.teleportTo(hist[0].x, hist[0].y, hist[0].z)
        joueur.setHealth(Number(joueur.getMaxHealth()) * 0.3)
        joueur.clearFire()
        artbSon(joueur, ARTB.Sons.GENERIC_SPLASH, 1.5, 0.6)
        artbStatut(joueur, '🌊 Reflux : la marée te ramène en arrière', 'aqua')
        return
      }
      if (artbSauvetage(joueur, 'coeur_arbre_monde', src)) {
        ev.setCanceled(true)
        joueur.setHealth(Number(joueur.getMaxHealth()) * 0.3)
        ajouterEffet(joueur, 'minecraft:resistance', 60, 3, false, true)
        ajouterEffet(joueur, 'minecraft:slowness', 60, 9, false, true)
        var allies = artbJoueursProches(joueur, 8, false)
        for (var i = 0; i < allies.length; i++) allies[i].heal(6)
        artbPart(joueur, ARTB.Part.HAPPY_VILLAGER, 50, 2); artbFxOnde(joueur, joueur, 8)
        artbSon(joueur, ARTB.Sons.GRASS_PLACE, 1.5, 0.6)
        artbStatut(joueur, '🌳 Renaissance : tu prends racine', 'green')
        return
      }
      if (artbSauvetage(joueur, 'coeur_montagne', src)) {
        ev.setCanceled(true)
        joueur.setHealth(1)
        ajouterEffet(joueur, 'minecraft:resistance', 60, 4, false, true)
        ajouterEffet(joueur, 'minecraft:slowness', 60, 9, false, true)
        artbPart(joueur, ARTB.Part.CLOUD, 20, 0.5)
        artbStatut(joueur, '⛰ Inébranlable : tu te changes en pierre', 'gold')
        joueur.server.scheduleInTicks(60, function () {
          try {
            if (!joueur.isAlive()) return
            artbOnde(joueur, joueur, 5, 12, 2.0, 'minecraft:slowness', 60, 1)
            artbPart(joueur, ARTB.Part.EXPLOSION, 10, 2)
            artbSon(joueur, ARTB.Sons.GENERIC_EXPLODE, 1.2, 0.7)
            ajouterEffet(joueur, 'minecraft:regeneration', 100, 1, false, true)
          } catch (e3) { artbErreur('cœur de la montagne', e3) }
        })
        return
      }
      if (artbSauvetage(joueur, 'aureole_sacree', src)) {
        ev.setCanceled(true)
        joueur.setHealth(Number(joueur.getMaxHealth()) * 0.3)
        ajouterEffet(joueur, 'minecraft:resistance', 60, 4, false, true)
        var ennemis = artbEnnemisProches(joueur, 6, null)
        for (var en = 0; en < ennemis.length; en++) {
          artbBlesser(joueur, ennemis[en], artbMortVivant(ennemis[en]) ? 20 : 10)
          ennemis[en].knockback(1.6, joueur.getX() - ennemis[en].getX(), joueur.getZ() - ennemis[en].getZ())
        }
        var proches = artbJoueursProches(joueur, 6, false)
        for (var pa = 0; pa < proches.length; pa++) proches[pa].heal(6)
        artbPart(joueur, ARTB.Part.END_ROD, 60, 2.5); artbFxOnde(joueur, joueur, 6); artbFx(joueur, 'purif', 40, 2)
        artbSon(joueur, ARTB.Sons.BEACON_ACTIVATE, 1.5, 1.2)
        artbStatut(joueur, '✝ Intervention divine', 'gold')
        return
      }
      if (artbSauvetage(joueur, 'coeur_battant', src)) {
        ev.setCanceled(true)
        joueur.setHealth(1)
        ajouterEffet(joueur, 'minecraft:resistance', 30, 2, false, true)
        ARTB.battement[cle] = Date.now() + 5000
        artbFx(joueur, 'sang', 40, 0.6); artbFxOnde(joueur, joueur, 4)
        artbSon(joueur, ARTB.Sons.WARDEN_HEARTBEAT, 2, 1)
        artbStatut(joueur, '🩸 Dernier battement : vol de vie total 5 s', 'red')
      }
    } catch (e) { artbErreur('morts', e) }
  })
} catch (e) { console.error('[artefacts] morts indisponibles : ' + e) }

// ───────── Note soporifique : vrai sommeil ─────────
// Un joueur qui reçoit l'effet Somnolent (tunes_n_tomes:sleepy, Note soporifique du Barde) est couché de force dans un lit
// qui apparaît sous lui le temps de l'effet, et ronfle (son mcrp:ronflement dans kubejs/assets/mcrp, comme « The World ») : envoyé seulement aux joueurs à 3 blocs
// ou moins, et joué presque à plein volume pour eux (atténuation réglée sur 8 blocs dans sounds.json). À la fin de
// l'effet (ou à la mort / déconnexion), il se réveille, le lit disparaît sans rien lâcher et le ronflement s'arrête net.
// Il ne peut pas quitter le lit avant la fin (ni être réveillé par un coup). Le sommeil forcé dure au plus 95 ticks
// (l'effet en dure 100) : il ne compte donc jamais comme un vrai sommeil et ne fait jamais passer la nuit.
// Pas de lit s'il n'y a pas 2 blocs libres (ou s'il est sur une monture) : il ronfle quand même.
var SOMMEIL = { joueurs: {}, lits: {}, J: null }
var SOMMEIL_DIRS = [['north', 0, -1], ['south', 0, 1], ['west', -1, 0], ['east', 1, 0]]
function sommeilInit() {
  if (!SOMMEIL.J) SOMMEIL.J = { BlockPos: Java.loadClass('net.minecraft.core.BlockPos'), UUID: Java.loadClass('java.util.UUID'),
    Son: Java.loadClass('net.minecraft.sounds.SoundEvent').createFixedRangeEvent(Java.loadClass('net.minecraft.resources.ResourceLocation').parse('mcrp:ronflement'), 3.0),
    Source: Java.loadClass('net.minecraft.sounds.SoundSource'),
    Effet: Java.loadClass('net.minecraft.core.registries.BuiltInRegistries').MOB_EFFECT.getHolder(Java.loadClass('net.minecraft.resources.ResourceLocation').parse('tunes_n_tomes:sleepy')) }
  return SOMMEIL.J
}
function sommeilLibre(niveau, x, y, z) {
  try { return niveau.getBlock(x, y, z).blockState.canBeReplaced() } catch (e) { return false }
}
function sommeilCmd(serveur, dim, cmd) { serveur.runCommandSilent('execute in ' + dim + ' run ' + cmd) }
function sommeilDebut(joueur, duree) {
  var J = sommeilInit(), u = String(joueur.uuid), t = Number(joueur.server.getTickCount())
  var deja = SOMMEIL.joueurs[u]
  if (deja) return
  duree = Math.min(95, Math.max(20, duree))
  var dim = String(joueur.level.dimension)
  var x = Math.floor(Number(joueur.x)), y = Math.floor(Number(joueur.y)), z = Math.floor(Number(joueur.z))
  var info = { dim: dim, debut: t, fin: t + duree, pieds: null, tete: null }
  if (!joueur.isPassenger() && sommeilLibre(joueur.level, x, y, z)) {
    // on essaie d'abord la direction du regard
    var yaw = ((Number(joueur.yRot) % 360) + 360) % 360
    var ordre = yaw >= 45 && yaw < 135 ? [2, 0, 1, 3] : yaw >= 135 && yaw < 225 ? [0, 2, 3, 1] : yaw >= 225 && yaw < 315 ? [3, 0, 1, 2] : [1, 2, 3, 0]
    for (var k = 0; k < ordre.length; k++) {
      var d = SOMMEIL_DIRS[ordre[k]], hx = x + d[1], hz = z + d[2]
      if (!sommeilLibre(joueur.level, hx, y, hz)) continue
      sommeilCmd(joueur.server, dim, 'setblock ' + hx + ' ' + y + ' ' + hz + ' minecraft:white_bed[facing=' + d[0] + ',part=head]')
      sommeilCmd(joueur.server, dim, 'setblock ' + x + ' ' + y + ' ' + z + ' minecraft:white_bed[facing=' + d[0] + ',part=foot]')
      info.pieds = [x, y, z]; info.tete = [hx, y, hz]
      SOMMEIL.lits[dim + ' ' + x + ' ' + y + ' ' + z] = true; SOMMEIL.lits[dim + ' ' + hx + ' ' + y + ' ' + hz] = true
      break
    }
  }
  SOMMEIL.joueurs[u] = info
  if (info.tete) { try { joueur.startSleeping(new J.BlockPos(info.tete[0], info.tete[1], info.tete[2])) } catch (eS) { console.error('[sommeil] coucher impossible : ' + eS) } }
  sommeilRonfler(joueur)
  console.info('[sommeil] ' + joueur.username + ' s\'endort ' + (info.tete ? 'dans un lit en ' + info.pieds.join(' ') : 'sans lit (pas de place)') + ' pour ' + duree + ' ticks')
}
function sommeilRonfler(joueur) {
  var J = sommeilInit()
  joueur.level.playSound(null, joueur.getX(), joueur.getY(), joueur.getZ(), J.Son, J.Source.PLAYERS, 1.0, 1.0)
}
function sommeilFin(serveur, u, joueur, raison) {
  var info = SOMMEIL.joueurs[u]; if (!info) return
  console.info('[sommeil] réveil (' + raison + ')')
  delete SOMMEIL.joueurs[u]
  try { if (joueur && joueur.isSleeping()) joueur.stopSleepInBed(true, true) } catch (e) {}
  var p = info.tete || info.pieds || null
  if (info.tete) {
    var lits = [info.tete, info.pieds]
    for (var i = 0; i < 2; i++) {
      var b = lits[i]
      delete SOMMEIL.lits[info.dim + ' ' + b[0] + ' ' + b[1] + ' ' + b[2]]
      sommeilCmd(serveur, info.dim, 'execute if block ' + b[0] + ' ' + b[1] + ' ' + b[2] + ' minecraft:white_bed run setblock ' + b[0] + ' ' + b[1] + ' ' + b[2] + ' minecraft:air')
    }
  }
  var cible = joueur ? Number(joueur.x).toFixed(1) + ' ' + Number(joueur.y).toFixed(1) + ' ' + Number(joueur.z).toFixed(1) : (p ? p[0] + ' ' + p[1] + ' ' + p[2] : null)
  if (cible) sommeilCmd(serveur, info.dim, 'execute positioned ' + cible + ' run stopsound @a[distance=..8] player mcrp:ronflement')
}
ServerEvents.tick(perfWrap('classes_rp:sommeil', function (event) {
  var serveur = event.server, t = Number(serveur.getTickCount())
  for (var u in SOMMEIL.joueurs) {
    var info = SOMMEIL.joueurs[u], J = sommeilInit()
    var joueur = serveur.getPlayerList().getPlayer(J.UUID.fromString(u))
    try {
      if (!joueur) { sommeilFin(serveur, u, null, 'déconnecté'); continue }
      if (!joueur.isAlive()) { sommeilFin(serveur, u, joueur, 'mort'); continue }
      if (t >= info.fin) { sommeilFin(serveur, u, joueur, 'fin de l\'effet'); continue }
      if (t > info.debut + 2 && (!J.Effet.isPresent() || !joueur.hasEffect(J.Effet.get()))) { sommeilFin(serveur, u, joueur, 'effet retiré'); continue }
      // réveillé (coup, bouton « Quitter le lit ») : recouché aussitôt
      if (info.tete && !joueur.isSleeping()) joueur.startSleeping(new J.BlockPos(info.tete[0], info.tete[1], info.tete[2]))
    } catch (e) { console.error('[sommeil] ' + e); sommeilFin(serveur, u, joueur, 'erreur') }
  }
}))
// Le lit temporaire ne se casse pas (et ne lâche donc jamais de lit)
BlockEvents.broken(function (event) {
  try {
    var b = event.block
    if (SOMMEIL.lits[String(event.level.dimension) + ' ' + b.x + ' ' + b.y + ' ' + b.z]) event.cancel()
  } catch (e) {}
})
// Il fait jour : le sommeil forcé continue quand même
try {
  NativeEvents.onEvent(Java.loadClass('net.neoforged.neoforge.event.entity.player.CanContinueSleepingEvent'), function (ev) {
    try { if (SOMMEIL.joueurs[String(ev.getEntity().uuid)]) ev.setContinueSleeping(true) } catch (e) {}
  })
} catch (e) { console.error('[sommeil] CanContinueSleepingEvent indisponible (le joueur pourra être réveillé le jour) : ' + e) }

// Effet ajouté : secours si Mouillé (So Make Spells) passe malgré le blocage ci-dessus : il donne aussi Trempé ; messages des effets de classe
try {
  NativeEvents.onEvent(Java.loadClass('net.neoforged.neoforge.event.entity.living.MobEffectEvent$Added'), function (ev) {
    try {
      var ent = ev.getEntity(), inst = ev.getEffectInstance()
      var id = String(inst.getEffect().getRegisteredName())
      if (id === 'somakespells:wet') { ajouterEffet(ent, 'aetheris_armures:trempe', inst.getDuration(), 0, false, true); return }
      if (id === 'tunes_n_tomes:sleepy' && ent.isPlayer()) { try { sommeilDebut(ent, Number(inst.getDuration())) } catch (eZ) { console.error('[sommeil] ' + eZ) } }
      var msg = ARTB_MESSAGES_EFFETS[id]
      if (!msg || !ent.isPlayer()) return
      ent.setStatusMessage(msg[1] === 'aqua' ? Text.aqua(msg[0]) : msg[1] === 'gold' ? Text.gold(msg[0]) : Text.lightPurple(msg[0]))
    } catch (e) { artbErreur('effet ajouté', e) }
  })
} catch (e) { console.error('[artefacts] effet ajouté indisponible : ' + e) }

// Sourdine : les effets Assourdi et Somnolent ne s'appliquent pas
try {
  var ARTB_RESULTAT = Java.loadClass('net.neoforged.neoforge.event.entity.living.MobEffectEvent$Applicable$Result')
  NativeEvents.onEvent(Java.loadClass('net.neoforged.neoforge.event.entity.living.MobEffectEvent$Applicable'), function (ev) {
    try {
      var id = String(ev.getEffectInstance().getEffect().getRegisteredName())
      // Un seul effet d'eau sur le serveur : le Mouillé de So Make Spells est remplacé par Trempé (même durée)
      if (id === 'somakespells:wet') {
        ev.setResult(ARTB_RESULTAT.DO_NOT_APPLY)
        ajouterEffet(ev.getEntity(), 'aetheris_armures:trempe', ev.getEffectInstance().getDuration(), 0, false, true)
        return
      }
      if (id !== 'tunes_n_tomes:deafened' && id !== 'tunes_n_tomes:sleepy') return
      if (!artbPorte(ev.getEntity(), 'sourdine')) return
      ev.setResult(ARTB_RESULTAT.DO_NOT_APPLY)
    } catch (e) { artbErreur('sourdine', e) }
  })
} catch (e) { console.error('[artefacts] sourdine indisponible : ' + e) }

// Ceinture du filon : minerais
BlockEvents.broken(function (event) {
  try {
    var joueur = event.player
    if (!joueur || !event.block.hasTag('c:ores') || Math.random() >= 0.15 || !artbPorte(joueur, 'ceinture_filon')) return
    artbMana(joueur, 10)
    ajouterEffet(joueur, 'minecraft:haste', 200, 0, false, true)
    artbStatut(joueur, '⛏ Filon : la terre te nourrit', 'gold')
  } catch (e) { artbErreur('filon', e) }
})

// ═══ Toutes les secondes ═══
PlayerEvents.tick(function (event) {
  var joueur = event.player
  if (joueur.tickCount % 20 !== 13) return
  try {
    artbInit()
    var cle = String(joueur.uuid), t = Date.now()
    var portes = artbPortes(joueur)
    var aucun = true
    for (var n in portes) { aucun = false; break }
    if (aucun) {
      ARTB.ritournelle[cle] = null; ARTB.racines[cle] = null
      if (ARTB.saison[cle] !== undefined) { ARTB.saison[cle] = undefined; artbSaisonsRetirer(joueur) }
      return
    }
    // Historique de position (Larme de Léviathan) : 4 dernières secondes
    if (artbPorte(joueur, 'larme_leviathan')) {
      var h = ARTB.historique[cle] || []
      h.push({ x: joueur.getX(), y: joueur.getY(), z: joueur.getZ(), dim: String(joueur.level.dimension().location()) })
      if (h.length > 4) h.shift()
      ARTB.historique[cle] = h
    }
    // ── Barde ──
    if (artbPorte(joueur, 'sourdine')) { artbRetirerEffet(joueur, 'tunes_n_tomes:deafened'); artbRetirerEffet(joueur, 'tunes_n_tomes:sleepy') }
    var tp = ARTB.tempo[cle]
    if (tp && t - tp.quand < 4000 && artbPorte(joueur, 'metronome')) joueur.playNotifySound(ARTB.Sons.NOTE_BLOCK_HAT.value(), ARTB.SrcSon.PLAYERS, 0.6, 1.6)
    var x = joueur.getX(), y = joueur.getY(), z = joueur.getZ()
    if (artbPorte(joueur, 'boite_a_musique')) {
      var r = ARTB.ritournelle[cle]
      if (!r || Math.abs(r.x - x) > 0.15 || Math.abs(r.y - y) > 0.15 || Math.abs(r.z - z) > 0.15) ARTB.ritournelle[cle] = { x: x, y: y, z: z, s: 0 }
      else {
        r.s++
        if (r.s >= 3) {
          if (r.s === 3) artbStatut(joueur, '♪ La boîte à musique joue une ritournelle')
          var cibles = artbJoueursProches(joueur, 6, true)
          for (var i = 0; i < cibles.length; i++) {
            artbMana(cibles[i], 4)
            ajouterEffet(cibles[i], 'minecraft:regeneration', 40, 0, false, true)
          }
          artbNotes(joueur, 3, 1.5)
        }
      }
    }
    // ── Hydromancien ──
    if (artbPorte(joueur, 'perle_pression') && joueur.isUnderWater()) joueur.setAirSupply(joueur.getMaxAirSupply())
    if (artbPorte(joueur, 'ceinture_algues') && artbMouille(joueur)) {
      ajouterEffet(joueur, 'minecraft:dolphins_grace', 40, 0, false, false)
      artbMana(joueur, 2)
    }
    // ── Druide ──
    if (artbPorte(joueur, 'anneau_saisons')) {
      var s = artbSaison()
      if (ARTB.saison[cle] !== s || !artbAEffet(joueur, ARTB_EFFETS_SAISONS[s])) {
        ARTB.saison[cle] = s
        artbSaisonsRetirer(joueur)
        // durée = temps restant avant la saison suivante
        ajouterEffet(joueur, ARTB_EFFETS_SAISONS[s], Math.max(20, Math.ceil((60000 - Date.now() % 60000) / 50)), 0, false, true)
        artbStatut(joueur, '🍃 Saison : ' + ARTB_SAISONS[s], 'green')
      }
    } else if (ARTB.saison[cle] !== undefined) { ARTB.saison[cle] = undefined; artbSaisonsRetirer(joueur) }
    if (artbPorte(joueur, 'gland_ancien')) {
      var rc = ARTB.racines[cle]
      var surSol = joueur.onGround() && artbSolVivant(joueur.level.getBlockState(joueur.blockPosition().below()))
      if (!surSol || !rc || Math.abs(rc.x - x) > 0.15 || Math.abs(rc.z - z) > 0.15) ARTB.racines[cle] = surSol ? { x: x, z: z, s: 0 } : null
      else {
        rc.s++
        if (rc.s >= 2) {
          if (rc.s === 2) artbStatut(joueur, '🌱 Tu prends racine', 'green')
          ajouterEffet(joueur, 'minecraft:resistance', 40, 0, false, false)
          joueur.heal(0.5)
          artbMana(joueur, 2)
          artbPart(joueur, ARTB.Part.HAPPY_VILLAGER, 4, 1.2)
        }
      }
    }
    // ── Géomancien ──
    if (artbPorte(joueur, 'geode_vivante') && joueur.tickCount % 600 === 13 && Number(joueur.getAbsorptionAmount()) <= 0) {
      joueur.setAbsorptionAmount(4)
      artbPart(joueur, ARTB.Part.END_ROD, 12, 0.6)
      artbSon(joueur, ARTB.Sons.AMETHYST_BLOCK_CHIME, 1.2, 1)
      artbStatut(joueur, '💎 Une géode se forme sur toi', 'gold')
    }
    // ── Paladin ──
    if (artbPorte(joueur, 'etendard')) {
      var troupe = artbJoueursProches(joueur, 8, true)
      for (var e1 = 0; e1 < troupe.length; e1++) if (String(troupe[e1].uuid) !== cle) ajouterEffet(troupe[e1], 'minecraft:resistance', 40, 0, false, false)
    }
    if (artbPorte(joueur, 'reliquaire')) {
      var veille = artbJoueursProches(joueur, 10, true)
      for (var e2 = 0; e2 < veille.length; e2++) {
        var al = veille[e2], ka = String(al.uuid)
        if (Number(al.getHealth()) >= Number(al.getMaxHealth()) * 0.3 || (ARTB.reliques[ka] && t - ARTB.reliques[ka] < 120000)) continue
        ARTB.reliques[ka] = t
        ajouterEffet(al, 'minecraft:regeneration', 80, 1, false, true)
        artbPart(al, ARTB.Part.END_ROD, 10, 0.5)
        artbStatut(al, '✝ Le reliquaire veille sur toi', 'gold')
        if (ka !== cle) artbStatut(joueur, '✝ Le reliquaire protège ' + al.username, 'gold')
      }
    }
    if (artbPorte(joueur, 'sceau_lumiere')) {
      var sc = ARTB.consecration[cle]
      if (!sc || Math.abs(sc.x - x) > 0.15 || Math.abs(sc.y - y) > 0.15 || Math.abs(sc.z - z) > 0.15) ARTB.consecration[cle] = { x: x, y: y, z: z, s: 0 }
      else {
        sc.s++
        if (sc.s >= 2) {
          if (sc.s === 2) artbStatut(joueur, '✝ Le sol est consacré', 'gold')
          var mv = artbEnnemisProches(joueur, 5, null)
          for (var e3 = 0; e3 < mv.length; e3++) if (artbMortVivant(mv[e3])) { artbBlesser(joueur, mv[e3], 2); mv[e3].igniteForSeconds(2) }
          var fideles = artbJoueursProches(joueur, 5, true)
          for (var e4 = 0; e4 < fideles.length; e4++) ajouterEffet(fideles[e4], 'minecraft:regeneration', 40, 0, false, true)
          joueur.level.sendParticles(ARTB.Part.END_ROD, x, y + 0.2, z, 6, 2.5, 0.1, 2.5, 0.01); artbFx(joueur, 'purif', 10, 2.5)
        }
      }
    } else ARTB.consecration[cle] = null
    // ── Hémomancien ──
    var cal = ARTB.calice[cle]
    if (cal > 0 && Number(joueur.getHealth()) < Number(joueur.getMaxHealth()) * 0.3 && artbPorte(joueur, 'calice_carmin')) {
      ARTB.calice[cle] = 0
      joueur.heal(cal)
      artbPart(joueur, ARTB.Part.DAMAGE_INDICATOR, 12, 0.5)
      artbStatut(joueur, '🩸 Le calice se vide en toi (+' + Math.round(cal) + ' PV)', 'red')
    }
  } catch (e) { artbErreur('tick', e) }
})

// ───────────── Artefacts de classe (suite) : Pyromancien, Cryomancien, Électro-Sorcier, Voyageur du Vide, Aéromancien,
// Nécromancien, Envoûteur, Spiritualiste, Symétriste, Technomancien. Mêmes règles que plus haut (porté en Curios + bonne classe).
var ARTB2_SETS = {
  'Pyromancien': ['anneau_braise', 'anneau_cendres', 'anneau_fournaise', 'peau_salamandre', 'lanterne_ardente', 'charbon_eternel', 'plume_phenix', 'ceinture_magma', 'collier_flamme'],
  'Cryomancien': ['anneau_givre', 'anneau_eclats', 'anneau_morsure', 'flocon_eternel', 'carapace_glace', 'cristal_permafrost', 'larme_boreale', 'ceinture_frimas', 'amulette_blizzard'],
  'Électro-Sorcier': ['anneau_arc', 'anneau_surtension', 'anneau_ion', 'batterie_statique', 'paratonnerre', 'bobine_tesla', 'coeur_orage', 'ceinture_conductrice', 'collier_eclair'],
  'Voyageur du Vide': ['anneau_horizon', 'anneau_distorsion', 'anneau_seuil', 'ancre_vide', 'oeil_vide', 'perle_instable', 'coeur_neant', 'ceinture_abime', 'collier_exil'],
  'Aéromancien': ['anneau_bourrasque', 'anneau_cyclone', 'anneau_zephyr', 'plume_zephyr', 'souffle_ascendant', 'sifflet_vent', 'coeur_tornade', 'ceinture_alizes', 'pendentif_rafale'],
  'Nécromancien': ['anneau_ossements', 'anneau_putrefaction', 'anneau_tombe', 'phylactere', 'lanterne_morts', 'crane_explosif', 'coeur_liche', 'ceinture_ossuaire', 'amulette_ectoplasme'],
  'Envoûteur': ['anneau_contagion', 'anneau_fletrissure', 'anneau_malediction', 'poupee_vaudou', 'oeil_verite', 'sceau_maudit', 'coeur_damne', 'ceinture_chaines', 'collier_supplice'],
  'Spiritualiste': ['anneau_ames_errantes', 'anneau_lien_spirituel', 'anneau_exorcisme', 'gardien_esprit', 'lanterne_spectrale', 'encens_ancestral', 'urne_ames', 'ceinture_talismans', 'collier_ancetres'],
  'Symétriste': ['anneau_yin', 'anneau_yang', 'anneau_miroir', 'balance_jade', 'miroir_eau', 'taijitu', 'coeur_equilibre', 'ceinture_dualite', 'pendentif_contrepoids'],
  'Technomancien': ['anneau_circuit', 'anneau_court_circuit', 'anneau_rendement', 'batterie_arcanique', 'scanner_arcanique', 'bouclier_energie', 'noyau_reacteur', 'ceinture_outils', 'collier_drone']
}
ARTB_ECOLES['Pyromancien'] = ['irons_spellbooks:fire']
ARTB_ECOLES['Cryomancien'] = ['irons_spellbooks:ice']
ARTB_ECOLES['Électro-Sorcier'] = ['irons_spellbooks:lightning']
ARTB_ECOLES['Voyageur du Vide'] = ['irons_spellbooks:ender']
ARTB_ECOLES['Aéromancien'] = ['wind_spellbooks:wind']
ARTB_ECOLES['Nécromancien'] = ['monsterspellbooks:necro']
ARTB_ECOLES['Envoûteur'] = ['cursespells:curse']
ARTB_ECOLES['Spiritualiste'] = ['iss_magicfromtheeast:spirit']
ARTB_ECOLES['Symétriste'] = ['iss_magicfromtheeast:symmetry']
ARTB_ECOLES['Technomancien'] = ['aces_spell_utils:technomancy', 'cataclysm_spellbooks:technomancy']
for (var artb2C in ARTB2_SETS) for (var artb2I = 0; artb2I < ARTB2_SETS[artb2C].length; artb2I++) ARTB_CLASSE[ARTB2_SETS[artb2C][artb2I]] = artb2C
ARTB_MESSAGES_EFFETS['aetheris_armures:gele'] = ['Vous êtes gelés', 'aqua']

var ARTB2 = null
function artb2Init() {
  artbInit()
  if (ARTB2) return ARTB2
  ARTB2 = {
    Hostile: Java.loadClass('net.minecraft.world.entity.monster.Enemy'),
    ObjetSol: Java.loadClass('net.minecraft.world.entity.item.ItemEntity'),
    Squelette: Java.loadClass('io.redspace.ironsspellbooks.entity.mobs.SummonedSkeleton'),
    Ramassage: Java.loadClass('net.minecraft.world.entity.projectile.AbstractArrow$Pickup'),
    chaleur: {}, givre: {}, surtension: {}, statique: {}, ancre: {}, sol: {}, ames: {}, maudits: {}, dernierMaudit: {},
    miroir: {}, dualite: {}, contrepoids: {}, circuit: {}, batterie: {}, singularite: {}, rafale: {}, blizzard: {},
    immobile: {}, envol: {}, alizes: {}, gardien: {}, spectral: {}, talismans: {}, frappes: {},
    course: {}, seuil: {}, dernierePos: {}, accroupi: {}, exil: {}, choc: {},
    EnderMan: Java.loadClass('net.minecraft.world.entity.monster.EnderMan')
  }
  return ARTB2
}
function artb2Hostiles(centre, rayon) {
  var res = [], liste = centre.level.getEntitiesOfClass(ARTB.Vivant, centre.boundingBox.inflate(rayon))
  for (var i = 0; i < liste.size(); i++) {
    var ent = liste.get(i)
    if (ent.isAlive() && ent instanceof ARTB2.Hostile && !ent.persistentData.getBoolean('artb_allie')) res.push(ent)
  }
  return res
}
function artb2PlusProche(joueur, liste) {
  var best = null, d = 1e9
  for (var i = 0; i < liste.length; i++) { var dd = liste[i].distanceToSqr(joueur); if (dd < d) { d = dd; best = liste[i] } }
  return best
}
function artb2Pourcent(joueur) {
  var md = ARTB.Magie.getPlayerMagicData(joueur)
  return { pv: Number(joueur.getHealth()) / Number(joueur.getMaxHealth()), mana: Number(md.getMana()) / Math.max(1, Number(joueur.getAttributeValue(ARTB.ManaMax))), md: md }
}
function artb2Invoquer(joueur, n, duree) {
  for (var l = 0; l < n; l++) {
    var sq = new ARTB2.Squelette(joueur.level, joueur, true)
    sq.setPos(joueur.getX() + (l ? 1.5 : -1.5), joueur.getY(), joueur.getZ() + 1)
    sq.persistentData.putBoolean('artb_allie', true)
    joueur.level.addFreshEntity(sq)
    joueur.server.scheduleInTicks(duree, function () { try { if (sq.isAlive()) sq.discard() } catch (e2) {} })
  }
}
// Sauvetage générique des charmes ultimes (même règle que plus haut)
function artb2Sauver(ev, joueur, nom, src) {
  if (!artbSauvetage(joueur, nom, src)) return false
  ev.setCanceled(true)
  return true
}

// ═══ Lancement d'un sort ═══
try {
  NativeEvents.onEvent(Java.loadClass('io.redspace.ironsspellbooks.api.events.SpellOnCastEvent'), function (ev) {
    try {
      var joueur = ev.getEntity(), ecole = ev.getSchoolType()
      artb2Init()
      var cle = String(joueur.uuid), reduction = 0, t = Date.now()
      if (artbEcole(ecole, 'Pyromancien')) {
        if (artbPorte(joueur, 'collier_flamme') && Number(joueur.getHealth()) < Number(joueur.getMaxHealth()) * 0.5) reduction += 0.3
        if (artbPorte(joueur, 'anneau_fournaise')) {
          var ch = ARTB2.chaleur[cle] || { n: 0, fin: 0 }
          if (t > ch.fin) {
            ch.n++
            if (ch.n >= 8) { ch.n = 0; ch.fin = t + 6000; artbStatut(joueur, '🔥 Surchauffe ! Sorts de feu +25 %, mais tu brûles', 'gold'); artbSon(joueur, ARTB.Sons.BLAZE_SHOOT, 1, 0.8) }
            else artbStatut(joueur, '🔥 Chaleur ' + ch.n + '/8', 'gold')
          }
          ARTB2.chaleur[cle] = ch
        }
      }
      if (artbEcole(ecole, 'Aéromancien') && artbPorte(joueur, 'anneau_zephyr') && !joueur.onGround()) reduction += 0.25
      if (artbEcole(ecole, 'Nécromancien') && artbPorte(joueur, 'phylactere') && (ARTB2.ames[cle] || 0) >= 3) {
        ARTB2.ames[cle] -= 3
        ev.setManaCost(0)
        artbStatut(joueur, '💀 Le phylactère paie le sort (' + ARTB2.ames[cle] + ' âmes)', 'green')
        return
      }
      if (artbEcole(ecole, 'Symétriste')) {
        var pc = artb2Pourcent(joueur)
        if (artbPorte(joueur, 'anneau_yang') && pc.mana < pc.pv) reduction += 0.2
      }
      if (artbEcole(ecole, 'Technomancien') && artbPorte(joueur, 'anneau_rendement')) reduction += 0.15
      if (reduction > 0) ev.setManaCost(Math.floor(Number(ev.getManaCost()) * (1 - Math.min(0.4, reduction))))
    } catch (e) { artbErreur('lancement (suite)', e) }
  })
} catch (e) { console.error('[artefacts] lancement (suite) indisponible : ' + e) }

// ═══ Dégâts de sort ═══
try {
  NativeEvents.onEvent(Java.loadClass('io.redspace.ironsspellbooks.api.events.SpellDamageEvent'), function (ev) {
    try {
      var cible = ev.getEntity(), src = ev.getSpellDamageSource(), lanceur = src.actual
      if (!lanceur || !cible || !lanceur.isPlayer() || String(cible.uuid) === String(lanceur.uuid)) return
      artb2Init()
      var ecole = src.spell().getSchoolType(), cleL = String(lanceur.uuid), cleC = String(cible.uuid), t = Date.now()
      var degats = Number(ev.getAmount())
      // ── Pyromancien ──
      if (artbEcole(ecole, 'Pyromancien')) {
        if (artbPorte(lanceur, 'anneau_braise') && cible.isOnFire()) ev.setAmount(Number(ev.getAmount()) * 1.2)
        var ch = ARTB2.chaleur[cleL]
        if (ch && t < ch.fin && artbPorte(lanceur, 'anneau_fournaise')) ev.setAmount(Number(ev.getAmount()) * 1.25)
        if (artbPorte(lanceur, 'anneau_cendres')) cible.persistentData.putLong('artb_cendres', t)
      }
      // ── Cryomancien ──
      if (artbEcole(ecole, 'Cryomancien')) {
        if (artbPorte(lanceur, 'anneau_eclats') && artbAEffet(cible, 'aetheris_armures:gele')) {
          ev.setAmount(Number(ev.getAmount()) * 1.4)
          artbRetirerEffet(cible, 'aetheris_armures:gele')
          var autour = artbEnnemisProches(cible, 3, cible)
          for (var i = 0; i < autour.length; i++) artbBlesser(lanceur, autour[i], 3)
          artbPart(cible, ARTB.Part.ITEM_SNOWBALL, 30, 0.6); artbFx(cible, 'neige', 25, 0.6); artbFxOnde(lanceur, cible, 3)
          artbSon(cible, ARTB.Sons.GLASS_BREAK, 1.2, 1)
        } else if (artbPorte(lanceur, 'anneau_givre')) {
          var g = (ARTB2.givre[cleC] && t - ARTB2.givre[cleC].t < 6000) ? ARTB2.givre[cleC].n + 1 : 1
          if (g >= 5) {
            ARTB2.givre[cleC] = null
            if (artbBoss(cible)) ajouterEffet(cible, 'minecraft:slowness', 60, 2, false, true)
            else ajouterEffet(cible, 'aetheris_armures:gele', 30, 0, false, true)
            artbPart(cible, ARTB.Part.SNOWFLAKE, 20, 0.5); artbFx(cible, 'neige', 20, 0.4)
          } else ARTB2.givre[cleC] = { n: g, t: t }
        }
        if (artbPorte(lanceur, 'anneau_morsure')) ajouterEffet(cible, 'minecraft:slowness', 60, 0, false, true)
        if (artbPorte(lanceur, 'amulette_blizzard')) {
          ARTB2.blizzard[cleL] = (ARTB2.blizzard[cleL] || 0) + 1
          if (ARTB2.blizzard[cleL] >= 6) {
            ARTB2.blizzard[cleL] = 0
            for (var k = 1; k <= 3; k++) lanceur.server.scheduleInTicks(20 * k, function () {
              try { var vic = artbEnnemisProches(cible, 5, null); for (var b = 0; b < vic.length; b++) { artbBlesser(lanceur, vic[b], 3); ajouterEffet(vic[b], 'minecraft:slowness', 30, 1, false, true) }
                    artbPart(cible, ARTB.Part.SNOWFLAKE, 30, 2.5); artbFx(cible, 'neige', 30, 2.5); artbFxBrume(cible, 0.9, 0.95, 1, 2.5, 4, 2) } catch (e2) {}
            })
            artbStatut(lanceur, '❄ Blizzard !', 'aqua')
          }
        }
      }
      // ── Électro-Sorcier ──
      if (artbEcole(ecole, 'Électro-Sorcier')) {
        if (artbPorte(lanceur, 'anneau_surtension')) {
          ARTB2.surtension[cleL] = (ARTB2.surtension[cleL] || 0) + 1
          if (ARTB2.surtension[cleL] >= 4) { ARTB2.surtension[cleL] = 0; ev.setAmount(Number(ev.getAmount()) * 1.6); artbFxArc(lanceur, cible); artbFxArc(lanceur, cible); artbFx(cible, 'elec', 20, 0.5); artbFxOnde(lanceur, cible, 2) }
        }
        if (artbPorte(lanceur, 'anneau_ion') && artbMouille(cible)) ev.setAmount(Number(ev.getAmount()) * 1.4)
        var st = ARTB2.statique[cleL]
        if (st && st > 0 && artbPorte(lanceur, 'batterie_statique')) { ev.setAmount(Number(ev.getAmount()) * (1 + 0.05 * st)); ARTB2.statique[cleL] = 0; artbStatut(lanceur, '⚡ Charge statique libérée', 'aqua') }
        if (artbPorte(lanceur, 'anneau_arc')) {
          var co = (ARTB2.course[cleL] && t - ARTB2.course[cleL].t < 6000) ? ARTB2.course[cleL].n + 1 : 1
          ARTB2.course[cleL] = { n: co, t: t }
          ajouterEffet(lanceur, 'minecraft:speed', 80, co >= 5 ? 2 : co >= 3 ? 1 : 0, false, true)
          artbFx(lanceur, 'elec', 10, 0.3)
        }
      }
      // ── Voyageur du Vide ──
      if (artbEcole(ecole, 'Voyageur du Vide')) {
        if (artbPorte(lanceur, 'anneau_horizon')) ev.setAmount(Number(ev.getAmount()) * (1 + Math.min(0.3, Number(lanceur.distanceTo(cible)) * 0.02)))
        if (ARTB2.seuil[cleL] > t && artbPorte(lanceur, 'anneau_seuil')) {
          ARTB2.seuil[cleL] = 0
          ev.setAmount(Number(ev.getAmount()) * 1.4)
          artbPart(cible, ARTB.Part.REVERSE_PORTAL, 20, 0.5)
        }
        var dis = artbPorte(lanceur, 'anneau_distorsion')
        if (dis && !artbBoss(cible) && !lanceur.getCooldowns().isOnCooldown(dis.getItem())) {
          lanceur.getCooldowns().addCooldown(dis.getItem(), 300)
          var lx = lanceur.getX(), ly = lanceur.getY(), lz = lanceur.getZ()
          artbFx(lanceur, 'ender', 25, 0.5); artbFx(cible, 'ender', 25, 0.5)
          lanceur.teleportTo(cible.getX(), cible.getY(), cible.getZ())
          cible.teleportTo(lx, ly, lz)
          lanceur.fallDistance = 0
          artbSon(lanceur, ARTB.Sons.ENDERMAN_TELEPORT, 1, 1.3)
          artbStatut(lanceur, '🌀 Distorsion : positions échangées', 'lightPurple')
        }
      }
      // ── Aéromancien ──
      if (artbEcole(ecole, 'Aéromancien')) {
        if (artbPorte(lanceur, 'anneau_bourrasque') && !artbBoss(cible)) cible.knockback(1.5, lanceur.getX() - cible.getX(), lanceur.getZ() - cible.getZ())
        if (artbPorte(lanceur, 'anneau_cyclone')) {
          var v = lanceur.getDeltaMovement(), vitesse = Math.sqrt(v.x() * v.x() + v.z() * v.z()) * 20
          ev.setAmount(Number(ev.getAmount()) * (1 + Math.min(0.3, vitesse * 0.03)))
        }
        if (artbPorte(lanceur, 'pendentif_rafale')) {
          ARTB2.rafale[cleL] = (ARTB2.rafale[cleL] || 0) + 1
          if (ARTB2.rafale[cleL] >= 5) {
            ARTB2.rafale[cleL] = 0
            var souffles = artbEnnemisProches(lanceur, 5, null)
            for (var r = 0; r < souffles.length; r++) { if (!artbBoss(souffles[r])) souffles[r].knockback(1.5, lanceur.getX() - souffles[r].getX(), lanceur.getZ() - souffles[r].getZ()); artbBlesser(lanceur, souffles[r], 3) }
            artbPart(lanceur, ARTB.Part.CLOUD, 40, 2.5); artbFxOnde(lanceur, lanceur, 5)
            artbSon(lanceur, ARTB.Sons.BREEZE_WIND_CHARGE_BURST, 1, 1)
          }
        }
      }
      // ── Nécromancien ──
      if (artbEcole(ecole, 'Nécromancien')) {
        if (artbPorte(lanceur, 'anneau_putrefaction')) ajouterEffet(cible, 'minecraft:wither', 60, 0, false, true)
        if (artbPorte(lanceur, 'anneau_tombe') && artbAEffet(cible, 'minecraft:wither')) ev.setAmount(Number(ev.getAmount()) * 1.2)
      }
      // ── Envoûteur ──
      if (artbEcole(ecole, 'Envoûteur')) {
        ARTB2.maudits[cleC] = { par: lanceur, fin: t + 8000 }
        ARTB2.dernierMaudit[cleL] = cible
        if (artbPorte(lanceur, 'anneau_fletrissure')) ajouterEffet(cible, 'minecraft:weakness', 60, 1, false, true)
        if (artbPorte(lanceur, 'anneau_malediction')) cible.persistentData.putLong('artb_maudit', t + 5000)
        if (artbPorte(lanceur, 'collier_supplice') && Number(cible.getHealth()) < Number(cible.getMaxHealth()) * 0.25 && !cible.persistentData.getBoolean('artb_supplice')) {
          cible.persistentData.putBoolean('artb_supplice', true)
          artbSurLaDuree(lanceur, cible, 6, 2, 0)
          lanceur.server.scheduleInTicks(121, function () { try { cible.persistentData.putBoolean('artb_supplice', false) } catch (e3) {} })
        }
      }
      // ── Spiritualiste ──
      if (artbEcole(ecole, 'Spiritualiste')) {
        if (artbPorte(lanceur, 'anneau_ames_errantes') && Math.random() < 0.3) {
          var autre = artb2PlusProche(cible, artbEnnemisProches(cible, 6, cible))
          if (autre) { artbBlesser(lanceur, autre, degats * 0.4); artbFx(cible, 'wisp', 8, 0.3); artbPart(autre, ARTB.Part.SOUL, 8, 0.4) }
        }
        if (artbPorte(lanceur, 'anneau_lien_spirituel')) {
          var allies = artbJoueursProches(lanceur, 10, true), faible = null
          for (var a2 = 0; a2 < allies.length; a2++) if (!faible || Number(allies[a2].getHealth()) / Number(allies[a2].getMaxHealth()) < Number(faible.getHealth()) / Number(faible.getMaxHealth())) faible = allies[a2]
          if (faible) faible.heal(degats * 0.15)
        }
        if (artbPorte(lanceur, 'anneau_exorcisme')) {
          var bons = ['minecraft:strength', 'minecraft:resistance', 'minecraft:regeneration', 'minecraft:speed', 'minecraft:absorption', 'minecraft:fire_resistance']
          for (var bb = 0; bb < bons.length; bb++) if (artbAEffet(cible, bons[bb])) { artbRetirerEffet(cible, bons[bb]); artbPart(cible, ARTB.Part.SOUL, 8, 0.4); break }
        }
      }
      // ── Symétriste ──
      if (artbEcole(ecole, 'Symétriste')) {
        var pc = artb2Pourcent(lanceur)
        if (artbPorte(lanceur, 'anneau_yin') && pc.pv < pc.mana) ev.setAmount(Number(ev.getAmount()) * 1.2)
        if (artbPorte(lanceur, 'pendentif_contrepoids') && ARTB2.contrepoids[cleL] > t) { ARTB2.contrepoids[cleL] = 0; ev.setAmount(Number(ev.getAmount()) * 1.3) }
        if (artbPorte(lanceur, 'anneau_miroir')) {
          ARTB2.miroir[cleL] = !ARTB2.miroir[cleL]
          if (!ARTB2.miroir[cleL]) {
            var reflet = artb2PlusProche(cible, artbEnnemisProches(cible, 6, cible))
            if (reflet) { artbBlesser(lanceur, reflet, degats * 0.3); artbPart(reflet, ARTB.Part.END_ROD, 8, 0.4) }
          }
        }
        if (artbPorte(lanceur, 'ceinture_dualite') && artb2Dualite(lanceur, 'sort')) { artbMana(lanceur, 4); lanceur.heal(1) }
      }
      // ── Technomancien ──
      if (artbEcole(ecole, 'Technomancien')) {
        if (artbPorte(lanceur, 'anneau_circuit')) {
          ARTB2.circuit[cleL] = (ARTB2.circuit[cleL] || 0) + 1
          if (ARTB2.circuit[cleL] >= 3) { ARTB2.circuit[cleL] = 0; ev.setAmount(Number(ev.getAmount()) * 1.4); artbPart(cible, ARTB.Part.ELECTRIC_SPARK, 15, 0.4) }
        }
        if (artbPorte(lanceur, 'anneau_court_circuit') && !artbBoss(cible) && Math.random() < 0.2) ajouterEffet(cible, 'minecraft:slowness', 20, 3, false, true)
      }
    } catch (e) { artbErreur('dégâts de sort (suite)', e) }
  })
} catch (e) { console.error('[artefacts] dégâts de sort (suite) indisponibles : ' + e) }

// Ceinture de la dualité : alterner coup d'arme et sort de symétrie
function artb2Dualite(joueur, temps) {
  var cle = String(joueur.uuid), d = ARTB2.dualite[cle], t = Date.now()
  ARTB2.dualite[cle] = { dernier: temps, t: t }
  return !!d && d.dernier !== temps && t - d.t < 3000
}

// ═══ Dégâts entrants (avant calcul) ═══
try {
  NativeEvents.onEvent(Java.loadClass('net.neoforged.neoforge.event.entity.living.LivingIncomingDamageEvent'), function (ev) {
    try {
      if (!ARTB || ARTB.partage || ARTB.blessure) return
      artb2Init()
      var cible = ev.getEntity(), src = ev.getSource(), t = Date.now()
      // Malédiction : +15 % de dégâts de toutes sources
      if (cible.persistentData.getLong('artb_maudit') > t) ev.setAmount(Number(ev.getAmount()) * 1.15)
      if (!cible.isPlayer()) return
      var joueur = cible, cle = String(joueur.uuid), auteur = src.actual
      var msg = ''
      try { msg = String(src.getMsgId()) } catch (x) {}
      // Paratonnerre : immunité à la foudre, mana au maximum
      if (msg === 'lightningBolt' && artbPorte(joueur, 'paratonnerre')) {
        ev.setCanceled(true)
        artbMana(joueur, 10000)
        artbStatut(joueur, '⚡ Le paratonnerre absorbe la foudre', 'aqua')
        return
      }
      // Peau de salamandre : pas de dégâts quand on brûle
      if ((msg === 'onFire' || msg === 'inFire') && artbPorte(joueur, 'peau_salamandre')) { ev.setCanceled(true); return }
      // Ceinture à talismans : 10 % d'annuler un coup (5 s minimum entre deux)
      if (artbPorte(joueur, 'ceinture_talismans') && Math.random() < 0.10 && !(ARTB2.talismans[cle] && t - ARTB2.talismans[cle] < 5000)) {
        ARTB2.talismans[cle] = t
        ev.setCanceled(true)
        artbPart(joueur, ARTB.Part.SOUL, 10, 0.4)
        artbStatut(joueur, '👻 Les talismans détournent le coup', 'aqua')
        return
      }
      // Carapace de glace : le premier coup toutes les 30 s est réduit de moitié et ralentit l'attaquant
      var cara = artbPorte(joueur, 'carapace_glace')
      if (cara && !joueur.getCooldowns().isOnCooldown(cara.getItem())) {
        joueur.getCooldowns().addCooldown(cara.getItem(), 600)
        ev.setAmount(Number(ev.getAmount()) * 0.5)
        if (auteur && auteur.isLiving() && String(auteur.uuid) !== cle) ajouterEffet(auteur, 'minecraft:slowness', 60, 1, false, true)
        artbPart(joueur, ARTB.Part.SNOWFLAKE, 20, 0.5)
        artbSon(joueur, ARTB.Sons.GLASS_BREAK, 1, 1.4)
      }
      // Lanterne spectrale : sous 40 % de PV, forme spectrale 3 s (recharge 60 s)
      var lant = artbPorte(joueur, 'lanterne_spectrale')
      if (lant && Number(joueur.getHealth()) - Number(ev.getAmount()) < Number(joueur.getMaxHealth()) * 0.4 && !joueur.getCooldowns().isOnCooldown(lant.getItem())) {
        joueur.getCooldowns().addCooldown(lant.getItem(), 1200)
        ARTB2.spectral[cle] = t + 3000
        ajouterEffet(joueur, 'minecraft:invisibility', 60, 0, false, false)
        artbPart(joueur, ARTB.Part.SOUL, 20, 0.5)
        artbStatut(joueur, '👻 Forme spectrale', 'aqua')
      }
      if (ARTB2.spectral[cle] > t) ev.setAmount(Number(ev.getAmount()) * 0.5)
      // Poupée vaudou : 25 % des dégâts subis sont renvoyés à ta dernière cible maudite
      var poupee = ARTB2.dernierMaudit[cle]
      if (poupee && poupee.isAlive() && poupee.distanceToSqr(joueur) < 16 * 16 && artbPorte(joueur, 'poupee_vaudou')) {
        artbBlesser(joueur, poupee, Number(ev.getAmount()) * 0.25)
        artbPart(poupee, ARTB.Part.SMOKE, 6, 0.3)
      }
      // Miroir d'eau : 20 % des dégâts renvoyés à l'attaquant
      if (auteur && auteur.isLiving() && String(auteur.uuid) !== cle && artbPorte(joueur, 'miroir_eau')) artbBlesser(joueur, auteur, Number(ev.getAmount()) * 0.2)
      // Contrepoids : un coup de plus de 2 cœurs renforce le prochain sort de symétrie
      if (Number(ev.getAmount()) > 4 && artbPorte(joueur, 'pendentif_contrepoids')) ARTB2.contrepoids[cle] = t + 8000
      // Ceinture conductrice : 2 mana par point de dégât subi
      if (artbPorte(joueur, 'ceinture_conductrice')) artbMana(joueur, Number(ev.getAmount()) * 2)
    } catch (e) { artbErreur('dégâts entrants (suite)', e) }
  })
} catch (e) { console.error('[artefacts] dégâts entrants (suite) indisponibles : ' + e) }

// Coups d'arme et attaques subies (après calcul)
try {
  NativeEvents.onEvent(Java.loadClass('net.neoforged.neoforge.event.entity.living.LivingDamageEvent$Post'), function (ev) {
    try {
      if (!ARTB || ARTB.blessure || Number(ev.getNewDamage()) <= 0) return
      artb2Init()
      var src = ev.getSource(), cible = ev.getEntity(), auteur = src.actual, direct = src.immediate, t = Date.now()
      // coup d'arme d'un joueur
      if (auteur && auteur.isPlayer() && direct && String(direct.uuid) === String(auteur.uuid) && !(src instanceof ARTB.SrcSort) && String(cible.uuid) !== String(auteur.uuid)) {
        if (artbPorte(auteur, 'ceinture_dualite') && artb2Dualite(auteur, 'arme')) { artbMana(auteur, 4); auteur.heal(1) }
        if (artbPorte(auteur, 'ceinture_chaines') && cible.persistentData.getLong('artb_maudit') > t) ajouterEffet(cible, 'minecraft:slowness', 40, 1, false, true)
      }
      // Collier de l'exil : 20 % de chance de bannir l'attaquant au corps à corps 8 blocs plus loin ; Collier de l'éclair : électrocute l'attaquant
      if (cible.isPlayer() && auteur && direct && String(direct.uuid) === String(auteur.uuid) && auteur.isLiving() && String(auteur.uuid) !== String(cible.uuid)) {
        var cA = String(auteur.uuid)
        if (artbPorte(cible, 'collier_exil') && !artbBoss(auteur) && Math.random() < 0.2 && !(ARTB2.exil[cA] && t - ARTB2.exil[cA] < 5000)) {
          ARTB2.exil[cA] = t
          artbPart(auteur, ARTB.Part.PORTAL, 30, 0.5)
          auteur.randomTeleport(auteur.getX() + (Math.random() < 0.5 ? -8 : 8), auteur.getY(), auteur.getZ() + (Math.random() < 0.5 ? -8 : 8), true)
          artbSon(auteur, ARTB.Sons.ENDERMAN_TELEPORT, 0.8, 0.8)
        }
        if (artbPorte(cible, 'collier_eclair') && !(ARTB2.choc[cA] && t - ARTB2.choc[cA] < 2000)) {
          ARTB2.choc[cA] = t
          artbBlesser(cible, auteur, 2)
          ajouterEffet(auteur, 'minecraft:slowness', 40, 0, false, true)
          artbPart(auteur, ARTB.Part.ELECTRIC_SPARK, 12, 0.4)
        }
      }
      // Ceinture de magma : l'attaquant au corps à corps prend feu
      if (cible.isPlayer() && auteur && direct && String(direct.uuid) === String(auteur.uuid) && auteur.isLiving() && String(auteur.uuid) !== String(cible.uuid) && artbPorte(cible, 'ceinture_magma')) {
        var ca = String(auteur.uuid)
        if (!(ARTB2.frappes[ca] && t - ARTB2.frappes[ca] < 3000)) { ARTB2.frappes[ca] = t; auteur.igniteForSeconds(3) }
      }
    } catch (e) { artbErreur('coups (suite)', e) }
  })
} catch (e) { console.error('[artefacts] coups (suite) indisponibles : ' + e) }

// ═══ Morts : sauvetages ultimes, mises à mort, gardien des esprits ═══
try {
  NativeEvents.onEvent(Java.loadClass('net.neoforged.neoforge.event.entity.living.LivingDeathEvent'), function (ev) {
    try {
      if (ev.isCanceled()) return
      artb2Init()
      var mort = ev.getEntity(), src = ev.getSource(), t = Date.now()
      if (!mort.isPlayer()) {
        var tueur = src.actual
        // Contagion (Envoûteur) : la malédiction passe aux ennemis proches
        var m = ARTB2.maudits[String(mort.uuid)]
        if (m && m.fin > t) {
          var envouteur = m.par
          if (envouteur && envouteur.isAlive() && artbPorte(envouteur, 'anneau_contagion')) {
            var voisins = artbEnnemisProches(mort, 5, mort)
            for (var i = 0; i < voisins.length; i++) {
              ajouterEffet(voisins[i], 'minecraft:weakness', 80, 0, false, true)
              ajouterEffet(voisins[i], 'minecraft:slowness', 80, 0, false, true)
              ARTB2.maudits[String(voisins[i].uuid)] = { par: m.par, fin: t + 8000 }
            }
            artbPart(mort, ARTB.Part.SMOKE, 20, 1.5); artbFx(mort, 'siphon', 20, 1.5); artbFxOnde(envouteur, mort, 5)
          }
        }
        if (!tueur || !tueur.isPlayer()) return
        var ecole = (src instanceof ARTB.SrcSort) ? src.spell().getSchoolType() : null
        // Anneau des cendres : une victime brûlée par tes sorts de feu explose
        if (mort.persistentData.getLong('artb_cendres') > t - 3000 && artbPorte(tueur, 'anneau_cendres')) {
          var vic = artbEnnemisProches(mort, 3, mort)
          for (var c = 0; c < vic.length; c++) { artbBlesser(tueur, vic[c], 4); vic[c].igniteForSeconds(3) }
          artbPart(mort, ARTB.Part.FLAME, 30, 1); artbFxOnde(tueur, mort, 3); artbFx(mort, 'braise', 30, 1)
          artbSon(mort, ARTB.Sons.GENERIC_EXPLODE, 0.8, 1.3)
        }
        // Charbon éternel : tuer une cible en feu rend 10 mana
        if (mort.isOnFire() && artbPorte(tueur, 'charbon_eternel')) artbMana(tueur, 10)
        if (!ecole) return
        var cleT = String(tueur.uuid)
        if (artbEcole(ecole, 'Nécromancien')) {
          if (artbPorte(tueur, 'phylactere')) { ARTB2.ames[cleT] = Math.min(10, (ARTB2.ames[cleT] || 0) + 1); artbStatut(tueur, '💀 Âmes : ' + ARTB2.ames[cleT] + '/10', 'green') }
          var sq = artbPorte(tueur, 'anneau_ossements')
          if (sq && Math.random() < 0.25 && !tueur.getCooldowns().isOnCooldown(sq.getItem())) { tueur.getCooldowns().addCooldown(sq.getItem(), 400); artb2Invoquer(tueur, 1, 400); artbStatut(tueur, '💀 Un mort se relève pour toi', 'green') }
          if (artbPorte(tueur, 'crane_explosif')) {
            var pos = mort
            tueur.server.scheduleInTicks(20, function () { try { var v2 = artbEnnemisProches(pos, 3, null); for (var k = 0; k < v2.length; k++) artbBlesser(tueur, v2[k], 5); artbPart(pos, ARTB.Part.SOUL_FIRE_FLAME, 30, 1); artbFxOnde(tueur, pos, 3) } catch (e2) {} })
          }
        }
        if (artbEcole(ecole, 'Spiritualiste') && artbPorte(tueur, 'collier_ancetres')) { artbMana(tueur, 8); artbPart(mort, ARTB.Part.SOUL, 10, 0.5) }
        return
      }
      var joueur = mort, cle = String(joueur.uuid)
      // Gardien des esprits : un Spiritualiste proche empêche la mort d'un allié (une fois toutes les 3 min)
      var proches = artbJoueursProches(joueur, 10, false)
      for (var g = 0; g < proches.length; g++) {
        var gar = artbPorte(proches[g], 'gardien_esprit')
        if (!gar || proches[g].getCooldowns().isOnCooldown(gar.getItem())) continue
        var msgG = ''
        try { msgG = String(src.getMsgId()) } catch (x) {}
        if (msgG === 'outOfWorld' || msgG === 'genericKill') break
        proches[g].getCooldowns().addCooldown(gar.getItem(), 3600)
        ev.setCanceled(true); joueur.setHealth(1); ajouterEffet(joueur, 'minecraft:resistance', 40, 4, false, true)
        artbPart(joueur, ARTB.Part.SOUL, 20, 0.6); artbFx(joueur, 'wisp', 30, 0.8)
        artbStatut(joueur, '👻 L\'esprit gardien de ' + proches[g].username + ' te protège', 'aqua')
        return
      }
      if (artb2Sauver(ev, joueur, 'plume_phenix', src)) {
        joueur.setHealth(Number(joueur.getMaxHealth()) * 0.4)
        ajouterEffet(joueur, 'minecraft:fire_resistance', 200, 0, false, true)
        ajouterEffet(joueur, 'minecraft:regeneration', 100, 1, false, true)
        var brules = artbEnnemisProches(joueur, 6, null)
        for (var b = 0; b < brules.length; b++) { artbBlesser(joueur, brules[b], 10); brules[b].igniteForSeconds(5) }
        artbPart(joueur, ARTB.Part.FLAME, 40, 2.5); artbFx(joueur, 'feu', 60, 2); artbFxOnde(joueur, joueur, 6); artbSon(joueur, ARTB.Sons.BLAZE_DEATH, 1.5, 0.6)
        artbStatut(joueur, '🔥 Tu renais de tes cendres', 'gold')
        return
      }
      if (artb2Sauver(ev, joueur, 'larme_boreale', src)) {
        joueur.setHealth(Number(joueur.getMaxHealth()) * 0.3)
        ajouterEffet(joueur, 'minecraft:resistance', 60, 4, false, true)
        ajouterEffet(joueur, 'aetheris_armures:gele', 60, 0, false, true)
        artbStatut(joueur, '❄ Cryostase', 'aqua')
        joueur.server.scheduleInTicks(60, function () {
          try { if (!joueur.isAlive()) return; artbOnde(joueur, joueur, 6, 6, 1.2, 'minecraft:slowness', 80, 2); artbPart(joueur, ARTB.Part.SNOWFLAKE, 60, 3); artbSon(joueur, ARTB.Sons.GLASS_BREAK, 1.5, 0.7) } catch (e2) {}
        })
        return
      }
      if (artb2Sauver(ev, joueur, 'coeur_orage', src)) {
        joueur.setHealth(Number(joueur.getMaxHealth()) * 0.3)
        ajouterEffet(joueur, 'minecraft:resistance', 60, 4, false, true)
        var cibles = artb2Hostiles(joueur, 10)
        cibles.sort(function (a, b2) { return a.distanceToSqr(joueur) - b2.distanceToSqr(joueur) })
        for (var f = 0; f < Math.min(3, cibles.length); f++) {
          var eclair = joueur.level.createEntity('minecraft:lightning_bolt')
          eclair.setPos(cibles[f].getX(), cibles[f].getY(), cibles[f].getZ()); eclair.setVisualOnly(true); artbFxArc(joueur, cibles[f])
          joueur.level.addFreshEntity(eclair)
          artbBlesser(joueur, cibles[f], 10)
        }
        artbStatut(joueur, '⚡ Foudre vengeresse', 'aqua')
        return
      }
      if (artb2Sauver(ev, joueur, 'coeur_neant', src)) {
        var an = ARTB2.ancre[cle]
        artbOnde(joueur, joueur, 5, 0, 0, 'minecraft:levitation', 40, 0)
        artbPart(joueur, ARTB.Part.PORTAL, 60, 1)
        if (an && an.dim === String(joueur.level.dimension().location())) { joueur.teleportTo(an.x, an.y, an.z); ARTB2.ancre[cle] = null }
        else joueur.randomTeleport(joueur.getX() + (Math.random() - 0.5) * 16, joueur.getY(), joueur.getZ() + (Math.random() - 0.5) * 16, true)
        joueur.fallDistance = 0
        joueur.setHealth(Number(joueur.getMaxHealth()) * 0.3)
        ajouterEffet(joueur, 'minecraft:resistance', 40, 3, false, true)
        artbSon(joueur, ARTB.Sons.ENDERMAN_TELEPORT, 1.5, 0.6)
        artbStatut(joueur, an ? '🌀 Retour au néant : tu reviens à ton ancre' : '🌀 Retour au néant', 'lightPurple')
        return
      }
      if (artb2Sauver(ev, joueur, 'coeur_tornade', src)) {
        joueur.setHealth(Number(joueur.getMaxHealth()) * 0.3)
        ajouterEffet(joueur, 'minecraft:slow_falling', 120, 0, false, true)
        ajouterEffet(joueur, 'minecraft:resistance', 40, 3, false, true)
        var balayes = artbEnnemisProches(joueur, 6, null)
        for (var w = 0; w < balayes.length; w++) { artbBlesser(joueur, balayes[w], 6); if (!artbBoss(balayes[w])) balayes[w].knockback(2.0, joueur.getX() - balayes[w].getX(), joueur.getZ() - balayes[w].getZ()) }
        artbPousser(joueur, 0, 1.4, 0)
        artbPart(joueur, ARTB.Part.CLOUD, 60, 2.5); artbFxOnde(joueur, joueur, 6)
        artbStatut(joueur, '🌪 Envol', 'aqua')
        return
      }
      if (artb2Sauver(ev, joueur, 'coeur_liche', src)) {
        joueur.setHealth(Number(joueur.getMaxHealth()) * 0.3)
        ajouterEffet(joueur, 'minecraft:resistance', 60, 3, false, true)
        artb2Invoquer(joueur, 2, 400)
        artbPart(joueur, ARTB.Part.SOUL_FIRE_FLAME, 50, 1.5); artbFxOnde(joueur, joueur, 5)
        artbStatut(joueur, '💀 Ton phylactère te relève', 'green')
        return
      }
      if (artb2Sauver(ev, joueur, 'coeur_damne', src)) {
        joueur.setHealth(Number(joueur.getMaxHealth()) * 0.3)
        ajouterEffet(joueur, 'minecraft:resistance', 60, 3, false, true)
        var damnes = artbEnnemisProches(joueur, 8, null)
        for (var d = 0; d < damnes.length; d++) { ajouterEffet(damnes[d], 'minecraft:wither', 100, 1, false, true); ajouterEffet(damnes[d], 'minecraft:weakness', 100, 0, false, true); ajouterEffet(damnes[d], 'minecraft:slowness', 100, 0, false, true) }
        artbPart(joueur, ARTB.Part.SMOKE, 40, 3); artbFx(joueur, 'siphon', 40, 3); artbFxOnde(joueur, joueur, 8)
        artbStatut(joueur, '🕯 Damnation', 'lightPurple')
        return
      }
      if (artb2Sauver(ev, joueur, 'urne_ames', src)) {
        joueur.setHealth(Number(joueur.getMaxHealth()) * 0.3)
        ajouterEffet(joueur, 'minecraft:resistance', 100, 4, false, true)
        ajouterEffet(joueur, 'minecraft:invisibility', 100, 0, false, false)
        ajouterEffet(joueur, 'minecraft:speed', 100, 1, false, true)
        artbPart(joueur, ARTB.Part.SOUL, 30, 1); artbFx(joueur, 'wisp', 40, 1.2); artbFxOnde(joueur, joueur, 5)
        artbStatut(joueur, '👻 Ascension : tu deviens esprit 5 s', 'aqua')
        return
      }
      if (artb2Sauver(ev, joueur, 'coeur_equilibre', src)) {
        joueur.setHealth(Number(joueur.getMaxHealth()) * 0.5)
        var md = ARTB.Magie.getPlayerMagicData(joueur)
        md.setMana(Number(joueur.getAttributeValue(ARTB.ManaMax)) * 0.5)
        ajouterEffet(joueur, 'minecraft:resistance', 60, 4, false, true)
        artbOnde(joueur, joueur, 6, 8, 1.0, null, 0, 0)
        artbPart(joueur, ARTB.Part.END_ROD, 50, 2)
        artbStatut(joueur, '☯ Équilibre parfait', 'gold')
        return
      }
      if (artb2Sauver(ev, joueur, 'noyau_reacteur', src)) {
        joueur.setHealth(Number(joueur.getMaxHealth()) * 0.3)
        artbMana(joueur, 10000)
        artbOnde(joueur, joueur, 5, 10, 1.8, null, 0, 0)
        artbPart(joueur, ARTB.Part.EXPLOSION, 6, 2)
        artbSon(joueur, ARTB.Sons.GENERIC_EXPLODE, 1.5, 0.8)
        artbStatut(joueur, '⚙ Réacteur d\'urgence', 'gold')
      }
    } catch (e) { artbErreur('morts (suite)', e) }
  })
} catch (e) { console.error('[artefacts] morts (suite) indisponibles : ' + e) }

// Lanterne des morts (Nécromancien) : les morts-vivants ne te prennent pas pour cible, sauf si tu les as frappés
// Œil du Vide : idem pour les Endermen
try {
  NativeEvents.onEvent(Java.loadClass('net.neoforged.neoforge.event.entity.living.LivingChangeTargetEvent'), function (ev) {
    try {
      var cible = ev.getNewAboutToBeSetTarget(), mob = ev.getEntity()
      if (!cible || !cible.isPlayer() || !ARTB) return
      artb2Init()
      var nom = (mob instanceof ARTB2.EnderMan) ? 'oeil_vide' : artbMortVivant(mob) ? 'lanterne_morts' : null
      if (!nom || !artbPorte(cible, nom)) return
      var dernier = mob.getLastHurtByMob()
      if (dernier && String(dernier.uuid) === String(cible.uuid)) return
      ev.setCanceled(true)
    } catch (e) { artbErreur('lanterne des morts', e) }
  })
} catch (e) { console.error('[artefacts] lanterne des morts indisponible : ' + e) }

// Ceinture de l'ossuaire : immunité au Wither ; Flocon éternel : immunité à la Lenteur
try {
  NativeEvents.onEvent(Java.loadClass('net.neoforged.neoforge.event.entity.living.MobEffectEvent$Applicable'), function (ev) {
    try {
      var id = String(ev.getEffectInstance().getEffect().getRegisteredName())
      if ((id === 'minecraft:wither' && artbPorte(ev.getEntity(), 'ceinture_ossuaire')) || (id === 'minecraft:slowness' && artbPorte(ev.getEntity(), 'flocon_eternel')))
        ev.setResult(ARTB_RESULTAT.DO_NOT_APPLY)
    } catch (e) { artbErreur('immunités (suite)', e) }
  })
} catch (e) { console.error('[artefacts] immunités (suite) indisponibles : ' + e) }

// Perle instable : les perles de l'Ender ne blessent pas, 20 % de chance d'être rendues
try {
  NativeEvents.onEvent(Java.loadClass('net.neoforged.neoforge.event.entity.EntityTeleportEvent$EnderPearl'), function (ev) {
    try {
      var joueur = ev.getPlayer()
      if (!joueur || !artbPorte(joueur, 'perle_instable')) return
      ev.setAttackDamage(0)
      if (Math.random() < 0.2) joueur.give('minecraft:ender_pearl')
    } catch (e) { artbErreur('perle instable', e) }
  })
} catch (e) { console.error('[artefacts] perle instable indisponible : ' + e) }

// ═══ Tous les ticks (saut d'air) et toutes les secondes ═══
PlayerEvents.tick(function (event) {
  var joueur = event.player
  try {
    if (!ARTB) return
    // Souffle ascendant : s'accroupir en l'air donne une impulsion (une fois par saut)
    if (joueur.tickCount % 2 === 0 && ARTB.cache[String(joueur.uuid)] && ARTB.cache[String(joueur.uuid)].p['souffle_ascendant']) {
      artb2Init()
      var cle0 = String(joueur.uuid)
      if (joueur.onGround()) ARTB2.envol[cle0] = false
      else if (joueur.isCrouching() && !ARTB2.envol[cle0] && artbPorte(joueur, 'souffle_ascendant')) {
        ARTB2.envol[cle0] = true
        var dm = joueur.getDeltaMovement()
        artbPousser(joueur, dm.x(), 0.75, dm.z())
        joueur.fallDistance = 0
        artbPart(joueur, ARTB.Part.CLOUD, 12, 0.4)
      }
    }
    if (joueur.tickCount % 20 !== 7) return
    artb2Init()
    var cle = String(joueur.uuid), t = Date.now(), p = artbPortes(joueur)
    var aucun = true
    for (var n in p) { if (ARTB_CLASSE[n] && ARTB2_SETS[ARTB_CLASSE[n]]) { aucun = false; break } }
    if (aucun) return
    var x = joueur.getX(), y = joueur.getY(), z = joueur.getZ()
    var immobile = ARTB2.immobile[cle]
    if (!immobile || Math.abs(immobile.x - x) > 0.15 || Math.abs(immobile.y - y) > 0.15 || Math.abs(immobile.z - z) > 0.15) ARTB2.immobile[cle] = immobile = { x: x, y: y, z: z, s: 0 }
    else immobile.s++
    // ── Pyromancien ──
    var ch = ARTB2.chaleur[cle]
    if (ch && t < ch.fin && artbPorte(joueur, 'anneau_fournaise')) { joueur.igniteForSeconds(1); artbPart(joueur, ARTB.Part.FLAME, 6, 0.4) }
    else if (ch && ch.n > 0 && joueur.tickCount % 60 === 7) ch.n--
    if (joueur.isOnFire() && artbPorte(joueur, 'peau_salamandre')) artbMana(joueur, 2)
    if (joueur.tickCount % 100 === 7 && artbPorte(joueur, 'lanterne_ardente')) {
      var proies = artb2Hostiles(joueur, 4)
      for (var i = 0; i < proies.length; i++) { proies[i].igniteForSeconds(2); artbFx(proies[i], 'feu', 10, 0.3) }
      if (proies.length) artbFxOnde(joueur, joueur, 4)
    }
    // ── Cryomancien ──
    if (artbPorte(joueur, 'flocon_eternel')) joueur.setTicksFrozen(0)
    if (artbPorte(joueur, 'ceinture_frimas')) {
      var sous = String(joueur.level.getBlockState(joueur.blockPosition().below()).getBlock().builtInRegistryHolder().key().location())
      if (/ice|snow/.test(sous)) ajouterEffet(joueur, 'minecraft:speed', 40, 1, false, false)
    }
    if (immobile.s >= 2 && artbPorte(joueur, 'cristal_permafrost')) {
      var geles = artbEnnemisProches(joueur, 4, null)
      for (var gg = 0; gg < geles.length; gg++) ajouterEffet(geles[gg], 'minecraft:slowness', 40, 1, false, true)
      joueur.level.sendParticles(ARTB.Part.SNOWFLAKE, x, y + 0.2, z, 6, 2, 0.1, 2, 0.01); artbFx(joueur, 'neige', 8, 2)
    }
    // ── Électro-Sorcier ──
    if (artbPorte(joueur, 'batterie_statique') && joueur.isSprinting()) {
      ARTB2.statique[cle] = Math.min(10, (ARTB2.statique[cle] || 0) + 1)
      artbStatut(joueur, '⚡ Charge statique ' + ARTB2.statique[cle] + '/10', 'aqua')
    }
    if (joueur.tickCount % 80 === 7 && artbPorte(joueur, 'bobine_tesla')) {
      var zap = artb2PlusProche(joueur, artb2Hostiles(joueur, 6))
      if (zap) { artbBlesser(joueur, zap, 3); artbSon(zap, ARTB.Sons.BEE_STING, 0.3, 2) }
    }
    // ── Voyageur du Vide ──
    var an = ARTB2.ancre[cle], dimJ = String(joueur.level.dimension().location())
    // Seuil : un saut de plus de 8 blocs en 1 s (perle, sort de téléportation...) charge l'anneau
    var dp = ARTB2.dernierePos[cle]
    if (dp && dp.dim === dimJ && (dp.x - x) * (dp.x - x) + (dp.y - y) * (dp.y - y) + (dp.z - z) * (dp.z - z) > 64 && artbPorte(joueur, 'anneau_seuil')) {
      ARTB2.seuil[cle] = t + 5000
      artbStatut(joueur, '🌀 Seuil franchi : prochain sort d\'Ender +40 %', 'lightPurple')
    }
    ARTB2.dernierePos[cle] = { x: x, y: y, z: z, dim: dimJ }
    if (artbPorte(joueur, 'ancre_vide')) {
      ARTB2.accroupi[cle] = joueur.isCrouching() ? (ARTB2.accroupi[cle] || 0) + 1 : 0
      if (ARTB2.accroupi[cle] === 2) {
        ARTB2.ancre[cle] = { x: x, y: y, z: z, dim: dimJ }
        artbStatut(joueur, '🌀 Ancre du Vide posée', 'lightPurple')
        artbSon(joueur, ARTB.Sons.RESPAWN_ANCHOR_CHARGE, 0.8, 1.2)
      }
      if (an && an.dim === String(joueur.level.dimension().location())) joueur.level.sendParticles(ARTB.Part.REVERSE_PORTAL, an.x, an.y + 1, an.z, 8, 0.3, 0.5, 0.3, 0.01)
    }
    if (joueur.tickCount % 40 === 7 && artbPorte(joueur, 'oeil_vide')) {
      var caches = joueur.level.getEntitiesOfClass(ARTB.Vivant, joueur.boundingBox.inflate(16))
      for (var ci = 0; ci < caches.size(); ci++) if (caches.get(ci).isInvisible()) ajouterEffet(caches.get(ci), 'minecraft:glowing', 50, 0, false, false)
    }
    var ent = artbPorte(joueur, 'ceinture_abime')
    if (ent) {
      if (joueur.onGround()) ARTB2.sol[cle] = { x: x, y: y, z: z }
      else if (y < joueur.level.getMinBuildHeight() && ARTB2.sol[cle] && !joueur.getCooldowns().isOnCooldown(ent.getItem())) {
        joueur.getCooldowns().addCooldown(ent.getItem(), 6000)
        joueur.teleportTo(ARTB2.sol[cle].x, ARTB2.sol[cle].y, ARTB2.sol[cle].z)
        joueur.fallDistance = 0
        artbSon(joueur, ARTB.Sons.ENDERMAN_TELEPORT, 1, 0.8)
        artbStatut(joueur, '🌀 L\'abîme te recrache sur la terre ferme', 'lightPurple')
      }
    }
    // ── Aéromancien ──
    if (joueur.fallDistance > 4 && artbPorte(joueur, 'plume_zephyr')) ajouterEffet(joueur, 'minecraft:slow_falling', 40, 0, false, false)
    if (immobile.s >= 2 && artbPorte(joueur, 'sifflet_vent')) {
      var vol = artbJoueursProches(joueur, 4, true)
      for (var vv = 0; vv < vol.length; vv++) { ajouterEffet(vol[vv], 'minecraft:slow_falling', 60, 0, false, false); ajouterEffet(vol[vv], 'minecraft:jump_boost', 60, 1, false, false) }
      joueur.level.sendParticles(ARTB.Part.CLOUD, x, y + 0.2, z, 8, 1.5, 0.1, 1.5, 0.05)
    }
    if (artbPorte(joueur, 'ceinture_alizes')) {
      ARTB2.alizes[cle] = joueur.isSprinting() ? (ARTB2.alizes[cle] || 0) + 1 : 0
      if (ARTB2.alizes[cle] >= 3) ajouterEffet(joueur, 'minecraft:speed', 40, 1, false, false)
    }
    // ── Nécromancien ──
    var ecto = artbPorte(joueur, 'amulette_ectoplasme')
    if (ecto && Number(joueur.getHealth()) < Number(joueur.getMaxHealth()) * 0.3 && !joueur.getCooldowns().isOnCooldown(ecto.getItem())) {
      joueur.getCooldowns().addCooldown(ecto.getItem(), 1200)
      ajouterEffet(joueur, 'minecraft:invisibility', 60, 0, false, false)
      ajouterEffet(joueur, 'minecraft:speed', 60, 1, false, false)
      artbPart(joueur, ARTB.Part.SOUL, 15, 0.5)
      artbStatut(joueur, '💀 Tu te fonds dans l\'ectoplasme', 'green')
    }
    // ── Envoûteur ──
    if (joueur.tickCount % 40 === 7 && artbPorte(joueur, 'oeil_verite')) {
      var vus = joueur.level.getEntitiesOfClass(ARTB.Vivant, joueur.boundingBox.inflate(12))
      for (var ov = 0; ov < vus.size(); ov++) { var e1 = vus.get(ov); if (e1.isInvisible() || e1.persistentData.getLong('artb_maudit') > t) ajouterEffet(e1, 'minecraft:glowing', 50, 0, false, false) }
    }
    if (joueur.tickCount % 40 === 7 && artbPorte(joueur, 'sceau_maudit') && Math.random() < 0.25) {
      var mauvais = ['minecraft:poison', 'minecraft:wither', 'minecraft:weakness', 'minecraft:slowness', 'minecraft:blindness', 'minecraft:hunger', 'minecraft:mining_fatigue']
      var victime = artb2PlusProche(joueur, artbEnnemisProches(joueur, 8, null))
      for (var mv = 0; victime && mv < mauvais.length; mv++) if (artbAEffet(joueur, mauvais[mv])) {
        artbRetirerEffet(joueur, mauvais[mv]); ajouterEffet(victime, mauvais[mv], 100, 0, false, true)
        artbPart(victime, ARTB.Part.SMOKE, 10, 0.4); artbStatut(joueur, '🕯 Le sceau renvoie ta malédiction', 'lightPurple'); break
      }
    }
    // ── Spiritualiste ──
    if (immobile.s >= 3 && artbPorte(joueur, 'encens_ancestral')) {
      if (immobile.s === 3) artbStatut(joueur, '👻 Méditation', 'aqua')
      var med = artbJoueursProches(joueur, 5, true)
      for (var me = 0; me < med.length; me++) { artbMana(med[me], 3); ajouterEffet(med[me], 'minecraft:resistance', 40, 0, false, false) }
      joueur.level.sendParticles(ARTB.Part.SOUL, x, y + 0.5, z, 2, 1.5, 0.3, 1.5, 0.01); artbFx(joueur, 'wisp', 6, 1.5)
    }
    // ── Symétriste ──
    if (artbPorte(joueur, 'balance_jade') && joueur.tickCount % 60 === 7) {
      var pc = artb2Pourcent(joueur), maxM = Number(joueur.getAttributeValue(ARTB.ManaMax))
      if (pc.pv - pc.mana > 0.1 && Number(joueur.getHealth()) > Number(joueur.getMaxHealth()) * 0.5) { joueur.setHealth(Number(joueur.getHealth()) - Number(joueur.getMaxHealth()) * 0.02); artbMana(joueur, maxM * 0.02) }
      else if (pc.mana - pc.pv > 0.1) { pc.md.setMana(Number(pc.md.getMana()) - maxM * 0.02); joueur.heal(Number(joueur.getMaxHealth()) * 0.02) }
    }
    if (artbPorte(joueur, 'taijitu')) {
      var eq = artb2Pourcent(joueur)
      if (Math.abs(eq.pv - eq.mana) <= 0.1) { ajouterEffet(joueur, 'minecraft:resistance', 40, 0, false, false); ajouterEffet(joueur, 'minecraft:strength', 40, 0, false, false) }
    }
    // ── Technomancien ──
    var bat = artbPorte(joueur, 'batterie_arcanique')
    if (bat) {
      var pb = artb2Pourcent(joueur)
      if (pb.mana >= 0.999) ARTB2.batterie[cle] = Math.min(100, (ARTB2.batterie[cle] || 0) + 3)
      else if (pb.mana < 0.25 && ARTB2.batterie[cle] > 0) { artbMana(joueur, ARTB2.batterie[cle]); artbStatut(joueur, '⚙ Batterie déchargée (+' + Math.round(ARTB2.batterie[cle]) + ' mana)', 'gold'); ARTB2.batterie[cle] = 0 }
    }
    if (joueur.tickCount % 100 === 7 && artbPorte(joueur, 'scanner_arcanique')) {
      var reperes = artb2Hostiles(joueur, 24)
      for (var sc = 0; sc < reperes.length; sc++) ajouterEffet(reperes[sc], 'minecraft:glowing', 80, 0, false, false)
      artbFxOnde(joueur, joueur, 12)
      if (reperes.length) joueur.playNotifySound(ARTB.Sons.NOTE_BLOCK_BIT.value(), ARTB.SrcSon.PLAYERS, 0.4, 1.8)
    }
    var bou = artbPorte(joueur, 'bouclier_energie')
    if (bou && joueur.tickCount % 400 === 7 && Number(joueur.getAbsorptionAmount()) <= 0) {
      var pe = artb2Pourcent(joueur)
      if (Number(pe.md.getMana()) >= 20) { pe.md.setMana(Number(pe.md.getMana()) - 20); joueur.setAbsorptionAmount(4); artbFx(joueur, 'elec', 20, 0.6); artbStatut(joueur, '⚙ Bouclier énergétique rechargé', 'gold') }
    }
    if (artbPorte(joueur, 'ceinture_outils')) ajouterEffet(joueur, 'minecraft:haste', 40, 0, false, false)
    if (artbPorte(joueur, 'collier_drone')) {
      var objets = joueur.level.getEntitiesOfClass(ARTB2.ObjetSol, joueur.boundingBox.inflate(8))
      for (var ob = 0; ob < objets.size(); ob++) {
        var it = objets.get(ob)
        if (it.hasPickUpDelay()) continue
        it.setDeltaMovement((x - it.getX()) * 0.25, (y + 0.5 - it.getY()) * 0.25, (z - it.getZ()) * 0.25)
      }
    }
  } catch (e) { artbErreur('tick (suite)', e) }
})
