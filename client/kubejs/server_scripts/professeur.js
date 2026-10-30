// Rôle « professeur » : tag « professeur » + Aura de professeur + commandes.
//   /professeur donner <joueur>   : donne le rôle (opérateurs uniquement)
//   /professeur retirer <joueur>  : retire le rôle
//   /professeur liste             : liste les professeurs connectés
//   /aura                         : (opérateurs) dit si tu es professeur et si l'effet est actif
// Un professeur peut utiliser /cours (+ ici, ordre) et /starter sans être opérateur.
// Pour ouvrir une autre commande aux professeurs : remplacer son « requires » par  profOuOp  (voir /cours dans classes_rp.js).
// Aura : effet kubejs:aura_professeur (défini dans startup_scripts/aura_professeur_effet.js), infini, sans particules,
//   icône visible dans l'inventaire, reposé toutes les 5 secondes. Sont professeurs : les joueurs ayant le tag « professeur »
//   et, si PF_OPS = true, tous les opérateurs. Retiré en moins de 5 s quand on cesse de l'être.
// Remplace aura_professeurs.js (à supprimer du serveur). Rechargement : /reload

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

var PROF_TAG = 'professeur'

// Vrai si la source de la commande est un opérateur ou un joueur ayant le tag professeur.
function profOuOp(source) {
  try { if (source.hasPermission(2)) return true } catch (e0) {}
  try {
    var j = source.player
    if (j && j.getTags().contains(PROF_TAG)) return true
  } catch (e1) {}
  return false
}

ServerEvents.commandRegistry(function (event) {
  var Commands = event.commands
  var Arguments = event.arguments
  var estOp = function (s) { return s.hasPermission(2) }

  function dire(ctx, texte) {
    try { if (ctx.source.player) ctx.source.player.tell(Text.gray(texte)) } catch (e) {}
    console.info('[professeur] ' + texte)
  }

  function basculer(ctx, ajouter) {
    try {
      var cible = Arguments.PLAYER.getResult(ctx, 'joueur')
      var nom = String(cible.username)
      var deja = cible.getTags().contains(PROF_TAG)
      if (ajouter) {
        if (deja) { dire(ctx, nom + ' est déjà professeur.'); return 0 }
        cible.server.runCommandSilent('tag ' + nom + ' add ' + PROF_TAG)
        cible.tell(Text.gold('Tu es désormais professeur à l\'Académie : /cours et /starter te sont ouverts.'))
        dire(ctx, nom + ' est maintenant professeur.')
      } else {
        if (!deja) { dire(ctx, nom + ' n\'est pas professeur.'); return 0 }
        cible.server.runCommandSilent('tag ' + nom + ' remove ' + PROF_TAG)
        cible.tell(Text.gray('Tu n\'es plus professeur.'))
        dire(ctx, nom + ' n\'est plus professeur.')
      }
      // renvoie l'arbre des commandes au joueur, pour que /cours et /starter apparaissent (ou disparaissent) tout de suite
      try { cible.server.getCommands().sendCommands(cible) } catch (e2) {}
      return 1
    } catch (e) {
      console.error('[professeur] ' + e)
      dire(ctx, 'Erreur (voir les logs).')
      return 0
    }
  }

  event.register(
    Commands.literal('professeur')
      .requires(estOp)
      .then(Commands.literal('donner')
        .then(Commands.argument('joueur', Arguments.PLAYER.create(event))
          .executes(function (ctx) { return basculer(ctx, true) })))
      .then(Commands.literal('retirer')
        .then(Commands.argument('joueur', Arguments.PLAYER.create(event))
          .executes(function (ctx) { return basculer(ctx, false) })))
      .then(Commands.literal('liste')
        .executes(function (ctx) {
          var noms = []
          ctx.source.server.players.forEach(function (p) {
            if (p.getTags().contains(PROF_TAG)) noms.push(String(p.username))
          })
          dire(ctx, noms.length ? 'Professeurs connectés : ' + noms.join(', ') : 'Aucun professeur connecté.')
          return 1
        }))
  )
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

console.info('[professeur] chargé : /professeur donner|retirer|liste, /aura, effet ' + PF_EFFET + ' (opérateurs ' + (PF_OPS ? 'inclus' : 'exclus') + ').')
