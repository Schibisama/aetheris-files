// Aura des professeurs : bonus magiques permanents pour garder un ascendant sur les élèves.
// Qui est professeur : tout joueur opérateur (niveau 2 ou plus) si PF_OPS = true, ou tout joueur portant le tag « professeur »
//   (/tag <joueur> add professeur  pour l'ajouter,  /tag <joueur> remove professeur  pour le retirer).
// Les bonus sont des modificateurs d'attributs (ils suivent le joueur, se retirent seuls s'il cesse d'être professeur).
// Valeurs : ratio de la valeur de base (0.5 = +50 %). Ajuste la table PF_BONUS puis /reload ;
//   les bonus déjà posés sont remplacés au prochain passage (vérification toutes les 5 secondes).
// Commande : /aura (opérateurs) : affiche si tu es professeur et les bonus actifs.
// Rechargement : /reload

var PF_OPS = true
var PF_TAG = 'professeur'
var PF_ID = 'aetheris:aura_prof'
var PF_CLE = 'aura_prof_version'
var PF_BONUS = [
  { attr: 'irons_spellbooks:spell_power', valeur: 0.5 },          // dégâts et effets de tous les sorts
  { attr: 'irons_spellbooks:max_mana', valeur: 1.0 },             // réserve de mana doublée
  { attr: 'irons_spellbooks:mana_regen', valeur: 1.0 },           // régénération de mana doublée
  { attr: 'irons_spellbooks:cooldown_reduction', valeur: 0.3 },   // recharges plus courtes
  { attr: 'irons_spellbooks:cast_time_reduction', valeur: 0.3 },  // incantations plus rapides
  { attr: 'irons_spellbooks:spell_resist', valeur: 0.3 }          // sorts reçus moins efficaces
]
// Change ce nombre dès que tu modifies PF_BONUS : les professeurs reçoivent alors les nouvelles valeurs
var PF_VERSION = 1

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

function pfRetirer(joueur) {
  var nom = String(joueur.username)
  for (var i = 0; i < PF_BONUS.length; i++) {
    pfCommande(joueur, 'attribute ' + nom + ' ' + PF_BONUS[i].attr + ' modifier remove ' + PF_ID)
  }
}

function pfPoser(joueur) {
  var nom = String(joueur.username)
  pfRetirer(joueur)
  for (var i = 0; i < PF_BONUS.length; i++) {
    pfCommande(joueur, 'attribute ' + nom + ' ' + PF_BONUS[i].attr + ' modifier add ' + PF_ID + ' ' + PF_BONUS[i].valeur + ' add_multiplied_base')
  }
}

PlayerEvents.tick(function (event) {
  try {
    var joueur = event.player
    if (!joueur || !joueur.isPlayer()) return
    if (joueur.age % 100 !== 7) return
    var donnees = joueur.persistentData
    var version = donnees.getInt(PF_CLE)
    var prof = pfEstProf(joueur)
    if (prof && version !== PF_VERSION) {
      pfPoser(joueur)
      donnees.putInt(PF_CLE, PF_VERSION)
      console.info('[aura_professeurs] aura posée sur ' + joueur.username + ' (version ' + PF_VERSION + ')')
    } else if (!prof && version !== 0) {
      pfRetirer(joueur)
      donnees.putInt(PF_CLE, 0)
      console.info('[aura_professeurs] aura retirée de ' + joueur.username)
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
          var prof = pfEstProf(joueur)
          var msg = prof ? 'Tu es professeur : aura active (version ' + joueur.persistentData.getInt(PF_CLE) + ').'
                         : 'Tu n\'es pas professeur (tag « ' + PF_TAG + ' » absent' + (PF_OPS ? ', et tu n\'es pas opérateur' : '') + ').'
          joueur.tell(msg)
        } catch (e) { console.error('[aura_professeurs] /aura : ' + e) }
        return 1
      })
  )
})

console.info('[aura_professeurs] chargé (' + PF_BONUS.length + ' bonus, opérateurs ' + (PF_OPS ? 'inclus' : 'exclus') + ', tag « ' + PF_TAG + ' »).')
