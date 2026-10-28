// /pseudo <nom> : change le pseudo affiché au-dessus de la tête (et dans le chat et la liste des joueurs).
// /pseudo reset : retrouve son vrai pseudo.   /pseudo joueur <joueur> <nom|reset> : modérateurs (niveau 2).
// Principe : le vrai pseudo est masqué par une équipe dédiée au joueur (nametagVisibility never), et un texte
// flottant (text_display) monté sur sa tête affiche le pseudo choisi. Le nom est recréé toutes les secondes
// si besoin (changement de dimension, mort, reconnexion).

var PS = {
  CLE: 'pseudo',
  MIN: 3,
  MAX: 24,
  HAUTEUR: 0.3,        // hauteur du texte au-dessus de la tête (blocs) : à ajuster si besoin
  FOND: 1073741824,    // fond sombre semi-transparent, comme la plaque de nom d'origine (0 = aucun fond)
  DISTANCE: 0.6        // distance d'affichage (1.0 = ~64 blocs ; 0.6 ≈ 38 blocs, proche d'un pseudo normal)
}

function psId(joueur) {
  return 'ps_' + String(joueur.uuid).replace(/-/g, '').substring(0, 12)
}

function psCmd(serveur, texte) {
  try { serveur.runCommandSilent(texte) } catch (e) { console.error('[pseudo] commande échouée : ' + texte + ' -> ' + e) }
}

function psPseudo(joueur) {
  try { return String(joueur.persistentData.getString(PS.CLE)) } catch (e) { return '' }
}

// Vérifie le nom demandé. Retourne le nom nettoyé, ou null (avec message d'erreur dans erreur.msg).
function psValider(serveur, joueur, brut, erreur) {
  var nom = String(brut).replace(/§./g, '').replace(/\s+/g, ' ').replace(/^\s+|\s+$/g, '')
  if (nom.length < PS.MIN || nom.length > PS.MAX) { erreur.msg = 'Le pseudo doit faire entre ' + PS.MIN + ' et ' + PS.MAX + ' caractères.'; return null }
  if (!/^[A-Za-z0-9À-ſ][A-Za-z0-9À-ſ '\-_.,]*$/.test(nom)) { erreur.msg = 'Caractères autorisés : lettres, chiffres, espaces, apostrophe, tiret, point, virgule et underscore.'; return null }
  var joueurs = serveur.players
  for (var i = 0; i < joueurs.length; i++) {
    if (String(joueurs[i].uuid) === String(joueur.uuid)) continue
    if (String(joueurs[i].username).toLowerCase() === nom.toLowerCase() || psPseudo(joueurs[i]).toLowerCase() === nom.toLowerCase()) {
      erreur.msg = 'Ce pseudo est déjà porté par un autre joueur.'
      return null
    }
  }
  return nom
}

function psTexteNbt(nom) {
  // Texte JSON dans une chaîne NBT entre apostrophes.
  return "'" + JSON.stringify({ text: nom, color: 'white' }).replace(/\\/g, '\\\\').replace(/'/g, "\\'") + "'"
}

function psSupprimerAffichage(serveur, joueur) {
  psCmd(serveur, 'kill @e[type=minecraft:text_display,tag=' + psId(joueur) + ']')
}

function psCreerAffichage(serveur, joueur, nom) {
  var id = psId(joueur)
  var nbt = '{Tags:["mcrp_pseudo","' + id + '"],text:' + psTexteNbt(nom) + ',billboard:"center",background:' + PS.FOND +
    ',see_through:0b,shadow:0b,view_range:' + PS.DISTANCE + 'f,line_width:400,' +
    'transformation:{left_rotation:[0f,0f,0f,1f],right_rotation:[0f,0f,0f,1f],scale:[1f,1f,1f],translation:[0f,' + PS.HAUTEUR + 'f,0f]}}'
  psCmd(serveur, 'execute at ' + joueur.username + ' run summon minecraft:text_display ~ ~ ~ ' + nbt)
  psCmd(serveur, 'ride @e[type=minecraft:text_display,tag=' + id + ',limit=1,sort=nearest] mount ' + joueur.username)
}

function psEquipe(serveur, joueur, actif) {
  var id = psId(joueur)
  if (actif) {
    psCmd(serveur, 'team add ' + id)
    psCmd(serveur, 'team modify ' + id + ' nametagVisibility never')
    psCmd(serveur, 'team join ' + id + ' ' + joueur.username)
  } else {
    psCmd(serveur, 'team leave ' + joueur.username)
    psCmd(serveur, 'team remove ' + id)
  }
}

// Met à jour le nom dans le chat et la liste des joueurs.
function psRafraichirNoms(joueur) {
  try { joueur.refreshDisplayName() } catch (e) {}
  try { joueur.refreshTabListName() } catch (e2) {}
}

function psAppliquer(serveur, joueur, nom) {
  joueur.persistentData.putString(PS.CLE, nom)
  psEquipe(serveur, joueur, true)
  psSupprimerAffichage(serveur, joueur)
  psCreerAffichage(serveur, joueur, nom)
  psRafraichirNoms(joueur)
}

function psRetirer(serveur, joueur) {
  try { joueur.persistentData.remove(PS.CLE) } catch (e) {}
  psSupprimerAffichage(serveur, joueur)
  psEquipe(serveur, joueur, false)
  psRafraichirNoms(joueur)
}

function psADuAffichage(joueur) {
  try {
    var id = psId(joueur)
    var pass = joueur.getPassengers()
    for (var i = 0; i < pass.size(); i++) {
      if (pass.get(i).getTags().contains(id)) return true
    }
  } catch (e) {}
  return false
}

// Surveillance : recrée le texte s'il a disparu (changement de dimension, mort, reconnexion...).
ServerEvents.tick(function (event) {
  var serveur = event.server
  if (serveur.tickCount % 20 !== 11) return
  var joueurs = serveur.players
  for (var i = 0; i < joueurs.length; i++) {
    try {
      var j = joueurs[i]
      var nom = psPseudo(j)
      if (!nom) continue
      if (!psADuAffichage(j)) {
        psSupprimerAffichage(serveur, j)
        psEquipe(serveur, j, true)
        psCreerAffichage(serveur, j, nom)
      }
    } catch (e) {}
  }
})

PlayerEvents.loggedOut(function (event) {
  try { psSupprimerAffichage(event.server, event.player) } catch (e) {}
})

PlayerEvents.loggedIn(function (event) {
  try {
    var j = event.player
    if (psPseudo(j)) {
      event.server.scheduleInTicks(40, function () { psRafraichirNoms(j) })
    }
  } catch (e) {}
})

// Nom affiché dans le chat et dans la liste des joueurs.
try {
  NativeEvents.onEvent(Java.loadClass('net.neoforged.neoforge.event.entity.player.PlayerEvent$NameFormat'), function (e) {
    try {
      var nom = psPseudo(e.getEntity())
      if (nom) e.setDisplayname(Text.of(nom))
    } catch (err) {}
  })
} catch (e) { console.error('[pseudo] nom dans le chat indisponible : ' + e) }
try {
  NativeEvents.onEvent(Java.loadClass('net.neoforged.neoforge.event.entity.player.PlayerEvent$TabListNameFormat'), function (e) {
    try {
      var nom = psPseudo(e.getEntity())
      if (nom) e.setDisplayName(Text.of(nom))
    } catch (err) {}
  })
} catch (e3) { console.error('[pseudo] nom dans la liste des joueurs indisponible : ' + e3) }

function psCommandeDefinir(ctx, nomBrut) {
  var joueur = ctx.source.player
  if (!joueur) { ctx.source.sendFailure(Text.of('Commande réservée aux joueurs.')); return 0 }
  var erreur = {}
  var nom = psValider(ctx.source.server, joueur, nomBrut, erreur)
  if (nom === null) { ctx.source.sendFailure(Text.of(erreur.msg)); return 0 }
  psAppliquer(ctx.source.server, joueur, nom)
  ctx.source.sendSuccess(function () { return Text.of('Ton pseudo est maintenant : ' + nom + '  (/pseudo reset pour revenir à ' + joueur.username + ')').green() }, false)
  return 1
}

function psCommandeReset(ctx) {
  var joueur = ctx.source.player
  if (!joueur) { ctx.source.sendFailure(Text.of('Commande réservée aux joueurs.')); return 0 }
  if (!psPseudo(joueur)) { ctx.source.sendFailure(Text.of('Tu portes déjà ton vrai pseudo.')); return 0 }
  psRetirer(ctx.source.server, joueur)
  ctx.source.sendSuccess(function () { return Text.of('Tu as retrouvé ton pseudo : ' + joueur.username).green() }, false)
  return 1
}

ServerEvents.commandRegistry(function (event) {
  var Commands = event.commands
  var Arguments = event.arguments
  var Chaine = Java.loadClass('com.mojang.brigadier.arguments.StringArgumentType')

  var admin = Commands.literal('joueur').requires(function (src) { return src.hasPermission(2) })
    .then(Commands.argument('joueur', Arguments.PLAYER.create(event))
      .then(Commands.literal('reset').executes(function (ctx) {
        var cible = Arguments.PLAYER.getResult(ctx, 'joueur')
        psRetirer(ctx.source.server, cible)
        return 1
      }))
      .then(Commands.argument('nom', Chaine.greedyString()).executes(function (ctx) {
        var cible = Arguments.PLAYER.getResult(ctx, 'joueur')
        var erreur = {}
        var nom = psValider(ctx.source.server, cible, Chaine.getString(ctx, 'nom'), erreur)
        if (nom === null) { ctx.source.sendFailure(Text.of(erreur.msg)); return 0 }
        psAppliquer(ctx.source.server, cible, nom)
        return 1
      })))

  event.register(Commands.literal('pseudo')
    .then(Commands.literal('reset').executes(function (ctx) {
      try { return psCommandeReset(ctx) } catch (e) { console.error('[pseudo] ' + e); return 0 }
    }))
    .then(admin)
    .then(Commands.argument('nom', Chaine.greedyString()).executes(function (ctx) {
      try { return psCommandeDefinir(ctx, Chaine.getString(ctx, 'nom')) } catch (e) { console.error('[pseudo] ' + e); return 0 }
    })))
})

console.log('[pseudo] chargé')
