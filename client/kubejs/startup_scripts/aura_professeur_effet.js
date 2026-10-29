// Effet « Aura de professeur » : un effet de potion visible dans l'inventaire (infini, sans particules)
// qui donne les bonus magiques des professeurs. Il est posé par server_scripts/aura_professeurs.js.
// À placer dans : kubejs/startup_scripts/ (serveur ET launcher des joueurs ; redémarrage complet nécessaire).
// Pour changer les bonus : modifie AURA_BONUS (valeurs = ratio de la valeur de base, 0.5 = +50 %), puis redémarre.
// L'icône est kubejs/assets/kubejs/textures/mob_effect/aura_professeur.png, le nom est dans kubejs/assets/kubejs/lang/.

var AURA_BONUS = [
  { attr: 'irons_spellbooks:spell_power', valeur: 0.5 },          // dégâts et effets de tous les sorts
  { attr: 'irons_spellbooks:max_mana', valeur: 1.0 },             // réserve de mana doublée
  { attr: 'irons_spellbooks:mana_regen', valeur: 1.0 },           // régénération de mana doublée
  { attr: 'irons_spellbooks:cooldown_reduction', valeur: 0.3 },   // recharges plus courtes
  { attr: 'irons_spellbooks:cast_time_reduction', valeur: 0.3 },  // incantations plus rapides
  { attr: 'irons_spellbooks:spell_resist', valeur: 0.3 }          // sorts reçus moins efficaces
]

StartupEvents.registry('mob_effect', function (event) {
  try {
    var Operation = Java.loadClass('net.minecraft.world.entity.ai.attributes.AttributeModifier$Operation')
    var effet = event.create('aura_professeur').color(0xD4AF37).beneficial()
    for (var i = 0; i < AURA_BONUS.length; i++) {
      effet.modifyAttribute(AURA_BONUS[i].attr, 'aetheris:aura_prof_' + i, AURA_BONUS[i].valeur, Operation.ADD_MULTIPLIED_BASE)
    }
    console.info('[aura_professeur_effet] effet kubejs:aura_professeur enregistré (' + AURA_BONUS.length + ' bonus).')
  } catch (e) {
    console.error('[aura_professeur_effet] ' + e)
  }
})
