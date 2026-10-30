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
//   Doublée (niveau II) dès que l'étape Courage de l'autel est débloquée (autel_sceau_faisceaux.js).
// Remplace aura_professeurs.js (à supprimer du serveur). Rechargement : /reload

var PF_OPS = true
var PF_TAG = 'professeur'
var PF_EFFET = 'kubejs:aura_professeur'
var PF_CLE = 'aura_prof_posee'

// Tag « non_professeur » : un opérateur qui l'a n'est PAS professeur (posé par /professeur retirer, enlevé par /professeur donner).
var PF_TAG_NON = 'non_professeur'
function pfEstProf(joueur) {
  try { if (joueur.getTags().contains(PF_TAG_NON)) return false } catch (eN) {}
  try { if (joueur.getTags().contains(PF_TAG)) return true } catch (e0) {}
  if (!PF_OPS) return false
  try { if (joueur.hasPermissions(2)) return true } catch (e1) {}
  try { if (joueur.op) return true } catch (e2) {}
  return false
}

// Bonus de l'aura (doit rester identique à AURA_BONUS de startup_scripts/aura_professeur_effet.js) : [libellé, valeur]
var PF_BONUS = [
  ['Puissance des sorts', 0.5], ['Mana maximum', 1.0], ['Régénération de mana', 1.0],
  ['Réduction des recharges', 0.3], ['Rapidité d\'incantation', 0.3], ['Résistance aux sorts', 0.3]
]
// Affiche les stats de l'aura dans le chat (niveau II = bonus doublés pendant l'étape Courage).
function pfAfficherStats(joueur) {
  var niveau = 0
  try { if (typeof auDebloquee === 'function' && auDebloquee(joueur.server, 'courage')) niveau = 1 } catch (e) {}
  joueur.tell(Text.gold('✦ Aura de professeur').bold().append(Text.of(niveau ? '  (niveau II : bonus doublés)' : '  (niveau I)').gray()))
  for (var i = 0; i < PF_BONUS.length; i++) {
    joueur.tell(Text.of('  + ' + Math.round(PF_BONUS[i][1] * (niveau + 1) * 100) + ' % ').green().append(Text.of(PF_BONUS[i][0]).gray()))
  }
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
  // Aura doublée (niveau II) tant que l'étape Courage de l'autel est débloquée (chapitre 3)
  var niveau = 0
  try { if (typeof auDebloquee === 'function' && auDebloquee(joueur.server, 'courage')) niveau = 1 } catch (eN) {}
  var cur = joueur.getEffect(holder)
  if (cur != null && cur.showIcon() && !cur.isVisible() && cur.isInfiniteDuration() && cur.getAmplifier() === niveau) return
  joueur.removeEffect(holder)
  joueur.addEffect(new MEI(holder, -1, niveau, false, false, true))
}

function pfTraiter(joueur) {
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
}
// Toutes les 5 secondes (compteur du serveur, plus fiable que l'âge du joueur)
ServerEvents.tick(function (event) {
  try {
    var sv = event.server
    if (sv.tickCount % 100 !== 7) return
    var js = sv.players
    for (var i = 0; i < js.length; i++) {
      try { pfTraiter(js[i]) } catch (e) { console.error('[aura_professeurs] ' + e) }
    }
  } catch (e2) { console.error('[aura_professeurs] tick : ' + e2) }
})
// Pose immédiate à la connexion
PlayerEvents.loggedIn(function (e) {
  try { pfTraiter(e.player) } catch (err) { console.error('[aura_professeurs] connexion pose : ' + err) }
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
      var deja = pfEstProf(cible)
      if (ajouter) {
        if (deja) { dire(ctx, nom + ' est déjà professeur.'); return 0 }
        cible.server.runCommandSilent('tag ' + nom + ' remove ' + PF_TAG_NON)
        cible.server.runCommandSilent('tag ' + nom + ' add ' + PROF_TAG)
        cible.tell(Text.gold('Tu es désormais professeur à l\'Académie : /cours et /starter te sont ouverts.'))
        dire(ctx, nom + ' est maintenant professeur.')
      } else {
        if (!deja) { dire(ctx, nom + ' n\'est pas professeur.'); return 0 }
        cible.server.runCommandSilent('tag ' + nom + ' remove ' + PROF_TAG)
        cible.server.runCommandSilent('tag ' + nom + ' add ' + PF_TAG_NON)   // pour un opérateur : le retire vraiment du rôle
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
      .requires(function (source) { try { return source.hasPermission(2) || (source.player && source.player.getTags().contains(PF_TAG)) } catch (e) { return false } })
      .executes(function (ctx) {
        try {
          var joueur = ctx.source.player
          if (pfEstProf(joueur)) { pfAfficherStats(joueur); return 1 }
          var msg = 'Tu n\'es pas professeur (tag « ' + PF_TAG + ' » absent' + (PF_OPS ? ', et tu n\'es pas opérateur' : '') + ').'
          joueur.tell(msg)
        } catch (e) { console.error('[aura_professeurs] /aura : ' + e) }
        return 1
      })
  )
})

console.info('[professeur] chargé : /professeur donner|retirer|liste, /aura, effet ' + PF_EFFET + ' (opérateurs ' + (PF_OPS ? 'inclus' : 'exclus') + ').')
