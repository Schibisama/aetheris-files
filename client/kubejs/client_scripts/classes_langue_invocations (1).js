// Noms des sorts d'invocation (choisis par Schibi, pensés pour le mod vocal).
// À placer dans : <instance>/kubejs/client_scripts/classes_langue_invocations.js  (puis F3+T)
// Se charge après classes_langue.js (ordre alphabétique) et remplace seulement les noms ci-dessous.
// Format : 'mod:sort': ['Classe', 'Nom français', 'Nom anglais']

var INV_NOMS = {
  'irons_spellbooks:raise_dead': ['Hémomancien', 'Ressusciter les Morts', 'Raise Dead'],
  'irons_spellbooks:summon_horse': ['Évocateur', 'Invocation : Cheval', 'Summon: Horse'],
  'irons_spellbooks:summon_vex': ['Évocateur', 'Invocation : Vex', 'Summon: Vex'],
  'cataclysm_spellbooks:conjure_ignited_reinforcement': ['Évocateur', 'Renforts Enflammés', 'Ignited Reinforcements'],
  'irons_spellbooks:summon_polar_bear': ['Cryomancien', 'Invocation : Ours Polaire', 'Summon: Polar Bear'],
  'monsterspellbooks:summon_ice_hydra': ['Cryomancien', 'Invocation de l’Hydre de Glace', 'Summon Ice Hydra'],
  'cataclysm_spellbooks:conjure_koboldiator': ['Géomancien', 'Invocation : Koboldiateur', 'Summon: Koboldiator'],
  'cataclysm_spellbooks:summon_koboleton': ['Géomancien', 'Invocation : Koboleton', 'Summon: Koboleton'],
  'cataclysm_spellbooks:conjure_thralls': ['Nécromancien', 'Serviteurs Morts-Vivants', 'Undead Thralls'],
  'monsterspellbooks:summon_death_knight': ['Nécromancien', 'Chevalier de la Mort', 'Death Knight'],
  'monsterspellbooks:summon_soul_wizard': ['Nécromancien', 'Sorcier des Âmes', 'Soul Wizard'],
  'monsterspellbooks:summon_wither_warrior': ['Nécromancien', 'Armée du Wither', 'Wither Army'],
  'cataclysm_spellbooks:conjure_amethyst_crab': ['Druide', 'Crabe d’Améthyste', 'Amethyst Crab'],
  'monsterspellbooks:summon_poison_vines': ['Druide', 'Lianes Empoisonnées', 'Poison Vines'],
  'somakespells:summon_drowned': ['Hydromancien', 'Invocation de Noyés', 'Summon Drowned'],
  'monsterspellbooks:summon_prismarine_squad': ['Hydromancien', 'Escouade de Prismarine', 'Prismarine Squad'],
  'asterismarcanum:summon_lunar_moths': ['Astromancien', 'Papillons Lunaires', 'Lunar Moths'],
  'monsterspellbooks:summon_aegis_patrol': ['Paladin', 'Patrouille Égide', 'Aegis Patrol'],
  'monsterspellbooks:summon_dwarven_drones': ['Technomancien', 'Drones Nains', 'Dwarven Drones'],
  'iss_magicfromtheeast:ashigaru_squad': ['Spiritualiste', 'Escouade d’Ashigaru', 'Ashigaru Squad'],
  'iss_magicfromtheeast:kitsune_pack': ['Spiritualiste', 'Meute de Kitsunes', 'Kitsune Pack'],
  'iss_magicfromtheeast:revenant_of_honor': ['Spiritualiste', 'Revenant d’Honneur', 'Revenant of Honor'],
  'chronomancy:the_world_stop': ['Chronomancien', 'The World', 'The World'],
  'iss_magicfromtheeast:jiangshi_invoke': ['Symétriste', 'Invocation de Jiangshi', 'Summon Jiangshi']
}

function invNomsAjouter(langue, indice) {
  ClientEvents.lang(langue, function (event) {
    var n = 0
    for (var id in INV_NOMS) {
      try {
        var p = id.split(':')
        var v = INV_NOMS[id]
        event.add(p[0], 'spell.' + p[0] + '.' + p[1], '[' + v[0] + '] ' + v[indice])
        n++
      } catch (e) {
        console.error('[classes_langue_invocations] ' + id + ' : ' + e)
      }
    }
    console.info('[classes_langue_invocations] ' + langue + ' : ' + n + ' noms de sorts d\'invocation raccourcis.')
  })
}

try {
  invNomsAjouter('en_us', 2)
  invNomsAjouter('fr_fr', 1)
} catch (e) {
  console.error('[classes_langue_invocations] Erreur : ' + e)
}
