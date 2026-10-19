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

var NIVEAUX_PARAM_MAX = null
var NIVEAUX_ENTIER = null

function niveauxAppliquer(event) {
  try {
    var sort = event.getSpell()
    var id = String(sort.getSpellId())
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
