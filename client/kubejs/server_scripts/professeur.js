// Rôle « professeur » : tag « professeur » + Aura de professeur + commandes.
//   /professeur donner <joueur>   : donne le rôle (opérateurs uniquement)
//   /professeur retirer <joueur>  : retire le rôle
//   /professeur liste             : liste les professeurs connectés
//   /aura                         : (opérateurs) dit si tu es professeur et si l'effet est actif
// Un professeur peut utiliser /cours (+ ici, ordre) et /starter sans être opérateur.
// Kit de professeur : /starter professeur <joueur> (voir starter.js).
// Avertissements (professeurs et opérateurs) :
//   /warn <joueur> [raison]   : +1 avertissement ; au 3e, 10 min de retenue (téléporté en salle de retenue, porte bloquée pour lui)
//   /warn voir <joueur>       : nombre d'avertissements et retenue en cours
//   /warn retirer <joueur>    : retire un avertissement
//   /warn liberer <joueur>    : met fin à la retenue tout de suite
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

// ── Avertissements et retenue ──
var WARN_MAX = 3
var WARN_RETENUE_MS = 10 * 60 * 1000                 // 10 minutes (temps réel, continue même déconnecté)
var WARN_DIM = 'minecraft:overworld'
var WARN_SALLE = [1086.5, 510, 1353.5]               // point de téléportation de la retenue
var WARN_PORTE = { x1: 1085, x2: 1088, y1: 510, y2: 522, z: 1365 }   // porte invisible (bloque seulement l'élève en retenue)
var WARN_FUITE = 40                                  // au-delà de cette distance de la salle, l'élève est ramené
var WARN_K_N = 'warn_n'
var WARN_K_FIN = 'retenue_fin'

function warnNb(j) { return j.persistentData.getInt(WARN_K_N) }
function warnFin(j) { return j.persistentData.getDouble(WARN_K_FIN) }
function warnEnRetenue(j) { return warnFin(j) > Date.now() }
function warnVersSalle(j) {
  j.server.runCommandSilent('execute in ' + WARN_DIM + ' run tp ' + j.username + ' ' + WARN_SALLE[0] + ' ' + WARN_SALLE[1] + ' ' + WARN_SALLE[2])
}
function warnMinutes(j) { return Math.max(1, Math.ceil((warnFin(j) - Date.now()) / 60000)) }
function warnFinRetenue(j, parOp) {
  j.persistentData.remove(WARN_K_FIN)
  j.tell(Text.green(parOp ? 'Ta retenue a été levée par un professeur. Tu peux sortir.' : 'Ta retenue est terminée. Tu peux sortir.'))
}
function warnRetenue(j) {
  j.persistentData.putInt(WARN_K_N, 0)
  j.persistentData.putDouble(WARN_K_FIN, Date.now() + WARN_RETENUE_MS)
  warnVersSalle(j)
  j.tell(Text.red('Retenue : 10 minutes. La porte ne s\'ouvrira pour toi qu\'à la fin.'))
}

// Porte invisible et anti-fuite, vérifiées 4 fois par seconde pour les élèves en retenue
ServerEvents.tick(function (event) {
  var sv = event.server
  if (sv.tickCount % 5 !== 0) return
  sv.players.forEach(function (j) {
    try {
      var fin = warnFin(j)
      if (!fin) return
      if (fin <= Date.now()) { warnFinRetenue(j, false); return }
      var dim = String(j.level.dimension)
      var dx = j.x - WARN_SALLE[0], dz = j.z - WARN_SALLE[2]
      if (dim !== WARN_DIM || Math.sqrt(dx * dx + dz * dz) > WARN_FUITE || Math.abs(j.y - WARN_SALLE[1]) > WARN_FUITE) { warnVersSalle(j); return }
      var p = WARN_PORTE
      if (j.x > p.x1 - 0.5 && j.x < p.x2 + 1.5 && j.y > p.y1 - 2 && j.y < p.y2 + 1 && j.z > p.z - 0.35) {
        j.teleportTo(j.x, j.y, p.z - 0.4)
        j.setStatusMessage(Text.red('La porte est fermée pour toi. Encore ' + warnMinutes(j) + ' min.'))
      }
    } catch (e) { console.error('[warn] retenue : ' + e) }
  })
})
// Un élève qui se reconnecte pendant sa retenue y retourne
PlayerEvents.loggedIn(function (e) {
  try { if (warnEnRetenue(e.player)) { warnVersSalle(e.player); e.player.tell(Text.red('Ta retenue n\'est pas finie : encore ' + warnMinutes(e.player) + ' min.')) } } catch (err) { console.error('[warn] connexion : ' + err) }
})

ServerEvents.commandRegistry(function (event) {
  var Commands = event.commands
  var Arguments = event.arguments
  function dire(ctx, texte) {
    try { if (ctx.source.player) ctx.source.player.tell(Text.gray(texte)) } catch (e) {}
    console.info('[warn] ' + texte)
  }
  function cible(ctx) { return Arguments.PLAYER.getResult(ctx, 'joueur') }
  function avertir(ctx, raison) {
    try {
      var j = cible(ctx)
      var n = warnNb(j) + 1
      j.persistentData.putInt(WARN_K_N, n)
      var msg = 'Ton professeur t\'a mis un avertissement, tu en as ' + n + '/' + WARN_MAX + ', au bout du 3ème tu auras 10 min de retenue.'
      j.tell(Text.red(msg))
      if (raison) j.tell(Text.gray('Raison : ' + raison))
      j.server.runCommandSilent('playsound minecraft:block.note_block.bass master ' + j.username + ' ~ ~ ~ 1 0.6')
      dire(ctx, j.username + ' : avertissement ' + n + '/' + WARN_MAX + (raison ? ' (' + raison + ')' : '') + '.')
      if (n >= WARN_MAX) { warnRetenue(j); dire(ctx, j.username + ' part en retenue pour 10 minutes.') }
      return 1
    } catch (e) { console.error('[warn] ' + e); dire(ctx, 'Erreur (voir les logs).'); return 0 }
  }
  event.register(
    Commands.literal('warn')
      .requires(profOuOp)
      .then(Commands.literal('voir')
        .then(Commands.argument('joueur', Arguments.PLAYER.create(event))
          .executes(function (ctx) {
            var j = cible(ctx)
            dire(ctx, j.username + ' : ' + warnNb(j) + '/' + WARN_MAX + ' avertissement(s)' + (warnEnRetenue(j) ? ', en retenue (encore ' + warnMinutes(j) + ' min)' : '') + '.')
            return 1
          })))
      .then(Commands.literal('retirer')
        .then(Commands.argument('joueur', Arguments.PLAYER.create(event))
          .executes(function (ctx) {
            var j = cible(ctx)
            var n = Math.max(0, warnNb(j) - 1)
            j.persistentData.putInt(WARN_K_N, n)
            j.tell(Text.green('Un avertissement t\'a été retiré : tu en as ' + n + '/' + WARN_MAX + '.'))
            dire(ctx, j.username + ' : ' + n + '/' + WARN_MAX + ' avertissement(s).')
            return 1
          })))
      .then(Commands.literal('liberer')
        .then(Commands.argument('joueur', Arguments.PLAYER.create(event))
          .executes(function (ctx) {
            var j = cible(ctx)
            if (!warnEnRetenue(j)) { dire(ctx, j.username + ' n\'est pas en retenue.'); return 0 }
            warnFinRetenue(j, true)
            dire(ctx, j.username + ' est libéré de sa retenue.')
            return 1
          })))
      .then(Commands.argument('joueur', Arguments.PLAYER.create(event))
        .executes(function (ctx) { return avertir(ctx, '') })
        .then(Commands.argument('raison', Arguments.GREEDY_STRING.create(event))
          .executes(function (ctx) { return avertir(ctx, String(Arguments.GREEDY_STRING.getResult(ctx, 'raison'))) })))
  )
})

console.info('[professeur] chargé : /professeur donner|retirer|liste, /aura, /warn, effet ' + PF_EFFET + ' (opérateurs ' + (PF_OPS ? 'inclus' : 'exclus') + ').')
