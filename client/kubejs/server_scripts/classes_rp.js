// [perf] mesure du temps des handlers : écrit « [perf] nom : X ms en 60 s » dans la console quand un handler dépasse 80 ms cumulées par minute
var perfWrap = (typeof perfWrap === 'function') ? perfWrap : (function () {
  var SYS = Java.loadClass('java.lang.System')
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
  { regle: /^apprenticecodex:(.*_spellcaster_gun|focus_staffbow|multipurpose_staffrifle|fullauto_rapidcast_spellrifle|.*_swingcast_staff|revolvercast_staff|scrollcaster_gauntlet|circuit_heat_staff|charged_twin_blade_staff|magi_agent_suit_.*)$/, classes: [] },
  { regle: /^cataclysm_spellbooks:(excelsius_.*|cursium_mage_.*|ignis_.*|hellfire_forge)$/, classes: [] },
  { regle: /^somakespells:forbidden_hammer$/, classes: [] },
  { regle: /^born_in_chaos_v1:(wood_splitter_axe|nightmare_claw|sweet_sword|sweet_axe|staff_of_magic_arrows|skullbreaker_hammer|shell_mace|frostbitten_blade|nut_hammer|nightmare_scythe|stop_hammer|staffof_blindness|dark_rod|dark_ritual_dagger|bonescaller_staff|trident_hayfork|great_reaper_axe|carrot_sword|darkwarblade|pumpkinstaffa|sharpened_dark_metal_sword|spider_bite_sword|spiritual_sword|soul_cutlass|soulbane|intoxicating_dagger|pumpkinhandgun|(dark_metal_armor|nightmare_mantleofthe_night|spiny_shell_armor)_(helmet|chestplate|leggings|boots)|damned_demomans_hat_helmet|killer_rabbit_ears_helmet|lord_pumpkinheads_hat_helmet|missionary_hat_helmet|spiritual_guide_sombrero_helmet)$/, classes: [] },   // Born in Chaos : armes et armures désactivées
  { regle: /^mowziesmobs:ice_crystal$/, classes: [] },   // Cristal de glace de Mowzie's Mobs : désactivé
  { regle: /^iss_magicfromtheeast:repeating_crossbow$/, classes: [] },
  // ── Legendary Monsters : seuls le Marteau moussu et le Plastron moussu sont gardés (Druide, Géomancien) ; le reste des armes et armures est désactivé ──
  { regle: /^legendary_monsters:(mossy_hammer|mossy_chestplate)$/, classes: ['Druide', 'Géomancien'] },
  { regle: /^(legendary_monsters:sickle_of_harvest)$/, classes: ['Géomancien'] },
  { regle: /^tunes_n_tomes:(bard_(harp|helmet|chestplate|leggings|boots)|melodic_mastery_(helmet|chestplate|leggings|boots)|affinity_ring_melody)$/, classes: ['Barde'] },
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
    var texteRarete = Text.translate(rareteNom === 'LEGENDARY' ? 'mcrp.rarete.legendary' : (rareteNom === 'EPIC' ? 'mcrp.rarete.epic' : (rareteNom === 'UNCOMMON' ? 'mcrp.rarete.uncommon' : 'mcrp.rarete.rare')))
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
    cmd(server, 'specs_codex spell unlock ' + joueur.username + ' ' + id)
    console.info('[cours] ' + joueur.username + ' reçoit ' + id + ' (n°' + (i + 1) + '/' + ordre.length + ')')
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
      if (p.hasPermissions(2)) continue
      if (!coursDimensionOk(p)) continue
      var dx = p.x - cx, dy = p.y - cy, dz = p.z - cz
      if (dx * dx + dy * dy + dz * dz <= rayon * rayon) res.push(p)
    } catch (e) {}
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
      } else {
        retour(ctx, el.username + ' : pas de classe, ignoré.')
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

function cmdCodexModifier(ctx, cible, sort, ajouter) {
  sort = String(sort).trim()
  if (!/^[a-z0-9_.-]+:[a-z0-9_.\/-]+$/.test(sort)) { retour(ctx, 'Identifiant invalide : ' + sort + ' (format namespace:sort)'); return 0 }
  cmd(ctx.source.server, 'specs_codex spell ' + (ajouter ? 'unlock ' : 'lock ') + cible.username + ' ' + sort)
  retour(ctx, (ajouter ? 'Sort ajouté au codex de ' : 'Sort retiré du codex de ') + cible.username + ' : ' + sort)
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

// NB : getClass() n'existe pas dans le moteur de script (Rhino) : on teste l'interface avec isInstance.
var IMAGIC_SUMMON = null
try { IMAGIC_SUMMON = Java.loadClass('io.redspace.ironsspellbooks.entity.mobs.IMagicSummon') } catch (e) {
  console.error('[classes_rp] interface IMagicSummon introuvable : ' + e)
}
function estInvocation(entite) {
  try { return !!(IMAGIC_SUMMON && IMAGIC_SUMMON.isInstance(entite)) } catch (e) {}
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
        var niveau = lu.niveau
        // Parchemin apparu au sol sans joueur (butin de mob, coffre cassé...) : la page est au niveau le plus bas du sort.
        // Un parchemin jeté par un joueur garde son niveau.
        var jeteParJoueur = false
        try { jeteParJoueur = entiteObjet.getOwner() != null } catch (eO) { jeteParJoueur = true }
        if (!jeteParJoueur) {
          try {
            var sp = Java.loadClass('io.redspace.ironsspellbooks.api.registry.SpellRegistry').getSpell(Java.loadClass('net.minecraft.resources.ResourceLocation').parse(lu.id))
            niveau = Math.max(1, Number(sp.getMinLevel()))
          } catch (eN) { niveau = 1 }
        }
        parchEcrirePage(page, niveau)
        console.info('[parchemin] page de ' + lu.id + ' marquée niveau ' + niveau + (jeteParJoueur ? '' : ' (butin : niveau le plus bas)'))
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
try {
  Java.loadClass('net.neoforged.neoforge.common.NeoForge').EVENT_BUS.addListener(
    Java.loadClass('net.neoforged.bus.api.EventPriority').LOWEST, true,
    Java.loadClass('net.neoforged.neoforge.event.entity.player.PlayerInteractEvent$RightClickBlock'),
    function (e) {
      try {
        var joueur = e.getEntity()
        if (!joueur || !joueur.isPlayer() || e.getLevel().isClientSide()) return
        if (String(e.getLevel().getBlockState(e.getPos()).block.id) !== 'irons_spellbooks:scroll_forge') return
        var main = e.getItemStack()
        if (!main || main.isEmpty() || String(main.id) !== FORGE_VIERGE_ID) return
        var rarete = Java.loadClass('com.specs.irons_spellbooks.item.BlankCodexPageItem').getInkRarity(main)
        if (!rarete) return
        var avant = forgePagesSansNiveau(joueur)
        joueur.server.scheduleInTicks(2, function () {
          try {
            var apres = forgePagesSansNiveau(joueur)
            for (var id in apres) {
              if ((apres[id] || 0) <= (avant[id] || 0)) continue
              var niveau = forgeNiveauPourRarete(id, rarete)
              var inv = joueur.getInventory()
              for (var i = 0; i < inv.getContainerSize(); i++) {
                var p = inv.getItem(i)
                if (!p || p.isEmpty() || String(p.id) !== PAGE_ID || parchLirePage(p)) continue
                if (String(Java.loadClass('com.specs.irons_spellbooks.item.CodexPageItem').getSpellId(p)) !== id) continue
                var cible = p
                if (p.count > 1) { cible = p.copyWithCount(1); p.shrink(1); parchEcrirePage(cible, niveau); joueur.give(cible) }
                else parchEcrirePage(cible, niveau)
                console.info('[parchemin] page forgée ' + id + ' (page vierge ' + rarete.name() + ') : niveau ' + niveau)
                break
              }
            }
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
  var k = String(proprio.getUUID()) + '|' + idObjet
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
      if (!b.isAlive()) { delete BALISE_LABEL[String(b.getUUID())]; BALISES.splice(i, 1); continue }
      // offrande acceptée : annonce le joli nom de la structure recherchée (le mod n'affiche que son identifiant)
      var lab = String(b.getTargetLabel() || ''), cle = String(b.getUUID())
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
