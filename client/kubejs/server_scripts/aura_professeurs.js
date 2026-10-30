// Aura des professeurs : pose l'effet « Aura de professeur » (kubejs:aura_professeur, visible dans l'inventaire) aux professeurs.
// L'effet lui-même (icône, nom, bonus magiques) est défini dans startup_scripts/aura_professeur_effet.js.
// Qui est professeur : tout joueur opérateur (niveau 2 ou plus) si PF_OPS = true, ou tout joueur portant le tag « professeur »
//   (/tag <joueur> add professeur  pour l'ajouter,  /tag <joueur> remove professeur  pour le retirer).
// L'effet est infini, sans particules, et se repose seul toutes les 5 secondes (il revient après la mort ou un seau de lait).
// Si un joueur cesse d'être professeur, l'effet lui est retiré en moins de 5 secondes.
// Commande : /aura (opérateurs) : dit si tu es professeur et si l'effet est actif.
// Rechargement : /reload

var PF_OPS = true
var PF_TAG = 'professeur'
var PF_EFFET = 'kubejs:aura_professeur'
var PF_CLE = 'aura_prof_posee'

function pfEstProf(joueur) {
  try { if (joueur.getTags().contains(PF_TAG)) return true } catch (e0) {}
  if (!PF_OPS) return false
  try { if (joueur.hasPermissions(2)) return true } catch (e1) {}
  try { if (joueur.op) return true } catch (e2) {}
  return false
}

function pfCommande(joueur, texte) {
  try { joueur.server.runCommandSilent(texte) } catch (e) { console.error('[aura_professeurs] ' + texte + ' -> ' + e) }
}

// Pose l'effet sans particules MAIS avec l'icône (la commande « effect give ... true » masque aussi l'icône).
function pfPoser(joueur) {
  var MEI = Java.loadClass('net.minecraft.world.effect.MobEffectInstance')
  var RL = Java.loadClass('net.minecraft.resources.ResourceLocation')
  var BI = Java.loadClass('net.minecraft.core.registries.BuiltInRegistries')
  var h = BI.MOB_EFFECT.getHolder(RL.parse(PF_EFFET))
  if (!h.isPresent()) { console.error('[aura_professeurs] effet introuvable : ' + PF_EFFET); return }
  var holder = h.get()
  var cur = joueur.getEffect(holder)
  if (cur != null && cur.showIcon() && !cur.isVisible() && cur.isInfiniteDuration()) return
  joueur.removeEffect(holder)
  joueur.addEffect(new MEI(holder, -1, 0, false, false, true))
}

PlayerEvents.tick(function (event) {
  try {
    var joueur = event.player
    if (!joueur || !joueur.isPlayer()) return
    if (joueur.age % 100 !== 7) return
    var nom = String(joueur.username)
    var donnees = joueur.persistentData
    if (pfEstProf(joueur)) {
      try { pfPoser(joueur) } catch (e3) { console.error('[aura_professeurs] pose : ' + e3) }
      if (!donnees.getBoolean(PF_CLE)) {
        donnees.putBoolean(PF_CLE, true)
        console.info('[aura_professeurs] aura posée sur ' + nom)
      }
    } else if (donnees.getBoolean(PF_CLE)) {
      pfCommande(joueur, 'effect clear ' + nom + ' ' + PF_EFFET)
      donnees.putBoolean(PF_CLE, false)
      console.info('[aura_professeurs] aura retirée de ' + nom)
    }
  } catch (e) {
    console.error('[aura_professeurs] ' + e)
  }
})

ServerEvents.commandRegistry(function (event) {
  var Commands = event.commands
  event.register(
    Commands.literal('aura')
      .requires(function (source) { return source.hasPermission(2) })
      .executes(function (ctx) {
        try {
          var joueur = ctx.source.player
          var msg = pfEstProf(joueur)
            ? 'Tu es professeur : l\'effet « Aura de professeur » est posé sur toi.'
            : 'Tu n\'es pas professeur (tag « ' + PF_TAG + ' » absent' + (PF_OPS ? ', et tu n\'es pas opérateur' : '') + ').'
          joueur.tell(msg)
        } catch (e) { console.error('[aura_professeurs] /aura : ' + e) }
        return 1
      })
  )
})

console.info('[aura_professeurs] chargé (effet ' + PF_EFFET + ', opérateurs ' + (PF_OPS ? 'inclus' : 'exclus') + ', tag « ' + PF_TAG + ' »).')
