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
var EQ_PARAMS = null
function equilibrageAppliquer(event, id) {
  var cfg = EQUILIBRAGE_SORTS[id]
  if (!cfg) return
  var D = Java.loadClass('java.lang.Double')
  if (!EQ_PARAMS) {
    var P = Java.loadClass('io.redspace.ironsspellbooks.api.config.IronConfigParameters')
    EQ_PARAMS = { p: P.POWER_MULTIPLIER, m: P.MANA_MULTIPLIER, cd: P.COOLDOWN_IN_SECONDS }
  }
  for (var k in cfg) event.setDefaultValue(EQ_PARAMS[k], D.valueOf(cfg[k]))
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
