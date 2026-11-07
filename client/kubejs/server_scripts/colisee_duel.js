// Duels du Colisée (KubeJS 1.21.1 / NeoForge)
// /duel <joueur1> <joueur2> : les deux joueurs sont téléportés face à face dans l'arène du Colisée, un décompte de 5 secondes
//   s'affiche au milieu de leur écran (et de celui des spectateurs présents dans le Colisée), puis le combat commence :
//   armes, sorts, tout est permis. Le premier qui fait tomber l'autre à 1 cœur gagne.
//   Le perdant se fige (comme dans l'épreuve du Courage) quelques secondes, puis les deux duellistes sont soignés et libérés.
//   « <joueur> est le vainqueur » s'affiche sur l'écran de tout le monde.
// /duel arreter : annule le duel en cours (personne ne gagne).
// /duel <adversaire> : un élève défie un autre joueur (les deux dans le Colisée) ; /duel accepter | refuser pour répondre.
// /duel <joueur1> <joueur2> et /duel arreter : professeurs et opérateurs. Les armures ne s'usent pas pendant un duel.
// Règles : un seul duel à la fois ; personne d'autre ne peut toucher les duellistes, et les duellistes ne peuvent toucher qu'entre eux ;
//   sortir de l'arène ou se déconnecter pendant le combat = défaite.

var DU_DIM = 'minecraft:overworld'
var DU_ZONE = { x1: -209, z1: 811, x2: -109, z2: 883, yMin: 60 }      // le Colisée (x et z ; en hauteur : au-dessus de y 60)
var DU_POS_1 = [-142, 71, 850, 90]      // joueur 1 : x, y, z, orientation (90 = regarde vers l'ouest, vers le joueur 2)
var DU_POS_2 = [-178, 71, 850, -90]     // joueur 2 : regarde vers l'est
var DU_DECOMPTE = 5                     // secondes
var DU_FIGE_FIN = 5                     // secondes pendant lesquelles le perdant reste figé après sa défaite
var DU_KO_PV = 2                        // 2 points de vie = 1 cœur

// État du duel en cours (null = aucun)
//   phase : 'decompte' (figés, pas de coups) | 'combat' | 'fin' (perdant figé, puis libération)
var DUEL = null

var DU_DEFIS = {}      // défis en attente : nom du défié -> { de, fin }
var DU_DEFI_S = 60    // secondes pour accepter un défi

function duCmd(sv, txt) { try { sv.runCommandSilent('execute in ' + DU_DIM + ' run ' + txt) } catch (e) { console.error('[duel] ' + txt + ' -> ' + e) } }
function duJoueur(sv, nom) { try { return sv.getPlayerList().getPlayerByName(nom) } catch (e) { return null } }
function duEstDuelliste(nom) { return !!DUEL && (DUEL.a === String(nom) || DUEL.b === String(nom)) }
function duAdversaire(nom) { return DUEL ? (DUEL.a === String(nom) ? DUEL.b : DUEL.a) : null }
function duDansArene(j) {
  try {
    if (String(j.level.dimension).indexOf(DU_DIM) < 0) return false
    var x = j.x, z = j.z
    return x >= Math.min(DU_ZONE.x1, DU_ZONE.x2) && x <= Math.max(DU_ZONE.x1, DU_ZONE.x2) + 1 &&
           z >= Math.min(DU_ZONE.z1, DU_ZONE.z2) && z <= Math.max(DU_ZONE.z1, DU_ZONE.z2) + 1 && j.y >= DU_ZONE.yMin
  } catch (e) { return false }
}
// Les duellistes + les joueurs présents dans le Colisée (pour le décompte)
function duPublic(sv) {
  var l = [], js = sv.players
  for (var i = 0; i < js.length; i++) if (duEstDuelliste(js[i].username) || duDansArene(js[i])) l.push(String(js[i].username))
  return l
}

function duFiger(sv, nom, lueur) {
  var c = ['effect give ' + nom + ' minecraft:slowness infinite 255 true', 'effect give ' + nom + ' minecraft:weakness infinite 255 true',
    'effect give ' + nom + ' minecraft:mining_fatigue infinite 255 true',
    'attribute ' + nom + ' minecraft:generic.jump_strength modifier add aetheris:duel_fige -1 add_value']
  if (lueur) c.push('effect give ' + nom + ' minecraft:glowing infinite 0 true')
  for (var i = 0; i < c.length; i++) { try { sv.runCommandSilent(c[i]) } catch (e) {} }
  var j = duJoueur(sv, nom)
  if (j) j.persistentData.putBoolean('duel_fige', true)
}
function duLiberer(sv, nom) {
  var c = ['effect clear ' + nom + ' minecraft:slowness', 'effect clear ' + nom + ' minecraft:weakness', 'effect clear ' + nom + ' minecraft:mining_fatigue',
    'effect clear ' + nom + ' minecraft:glowing', 'attribute ' + nom + ' minecraft:generic.jump_strength modifier remove aetheris:duel_fige']
  for (var i = 0; i < c.length; i++) { try { sv.runCommandSilent(c[i]) } catch (e) {} }
  var j = duJoueur(sv, nom)
  if (j) j.persistentData.putBoolean('duel_fige', false)
}
function duSoigner(j) {
  try { j.setHealth(j.maxHealth) } catch (e) {}
  try { j.foodData.setFoodLevel(20); j.foodData.setSaturation(10) } catch (e2) {}
  try { j.clearFire() } catch (e3) { try { j.setRemainingFireTicks(0) } catch (e4) {} }
}

function duTitre(sv, cible, titre, couleur, sousTitre) {
  duCmd(sv, 'title ' + cible + ' times 0 25 5')
  duCmd(sv, 'title ' + cible + ' subtitle ' + JSON.stringify({ text: sousTitre || '', color: 'gray' }))
  duCmd(sv, 'title ' + cible + ' title ' + JSON.stringify({ text: titre, color: couleur }))
}

// Les armures ne s'usent pas pendant un duel : leur usure est notée au lancement et remise à chaque tick.
var DU_SLOTS = null
function duSlots() {
  if (!DU_SLOTS) { var S = Java.loadClass('net.minecraft.world.entity.EquipmentSlot'); DU_SLOTS = [S.HEAD, S.CHEST, S.LEGS, S.FEET] }
  return DU_SLOTS
}
function duArmures(j) {
  var r = []
  var sl = duSlots()
  for (var i = 0; i < sl.length; i++) {
    try { var p = j.getItemBySlot(sl[i]); r.push(p && !p.isEmpty() ? { id: String(p.id), usure: p.getDamageValue() } : null) } catch (e) { r.push(null) }
  }
  return r
}
function duReparer(sv) {
  if (!DUEL || !DUEL.armures) return
  var n = [DUEL.a, DUEL.b]
  for (var k = 0; k < 2; k++) {
    var j = duJoueur(sv, n[k]), m = DUEL.armures[n[k]]
    if (!j || !m) continue
    var sl = duSlots()
    for (var i = 0; i < sl.length; i++) {
      try {
        if (!m[i]) continue
        var p = j.getItemBySlot(sl[i])
        if (p && !p.isEmpty() && String(p.id) === m[i].id && p.getDamageValue() > m[i].usure) p.setDamageValue(m[i].usure)
      } catch (e) {}
    }
  }
}

function duLancer(sv, j1, j2) {
  var a = String(j1.username), b = String(j2.username)
  DUEL = { a: a, b: b, phase: 'decompte', t: sv.tickCount, reste: DU_DECOMPTE, perdant: null }
  DUEL.armures = {}
  DUEL.armures[a] = duArmures(j1); DUEL.armures[b] = duArmures(j2)
  var pos = [[j1, DU_POS_1], [j2, DU_POS_2]]
  for (var i = 0; i < 2; i++) {
    var p = pos[i][1], n = String(pos[i][0].username)
    duCmd(sv, 'tp ' + n + ' ' + (p[0] + 0.5) + ' ' + p[1] + ' ' + (p[2] + 0.5) + ' ' + p[3] + ' 0')
    duSoigner(pos[i][0])
    duFiger(sv, n, false)
  }
  duCmd(sv, 'tellraw @a ' + JSON.stringify([{ text: '[Colisée] ', color: 'gold' }, { text: a, color: 'yellow' },
    { text: ' et ', color: 'gray' }, { text: b, color: 'yellow' }, { text: ' s\'affrontent en duel !', color: 'gray' }]))
  duAfficherDecompte(sv)
}
function duAfficherDecompte(sv) {
  var l = duPublic(sv)
  for (var i = 0; i < l.length; i++) {
    duTitre(sv, l[i], String(DUEL.reste), 'gold', DUEL.a + ' contre ' + DUEL.b)
    duCmd(sv, 'execute as ' + l[i] + ' at @s run playsound minecraft:block.note_block.hat master @s ~ ~ ~ 1 1')
  }
}
function duDebutCombat(sv) {
  DUEL.phase = 'combat'
  duLiberer(sv, DUEL.a); duLiberer(sv, DUEL.b)
  var l = duPublic(sv)
  for (var i = 0; i < l.length; i++) {
    duTitre(sv, l[i], 'Combattez !', 'red', '')
    duCmd(sv, 'execute as ' + l[i] + ' at @s run playsound minecraft:entity.ender_dragon.growl master @s ~ ~ ~ 0.6 1.2')
  }
}
function duVictoire(sv, perdant, raison) {
  if (!DUEL || DUEL.phase === 'fin') return
  var gagnant = duAdversaire(perdant)
  try { var jg = duJoueur(sv, gagnant); if (jg) ftbFait(jg, 'duel_gagne') } catch (eF) {}
  DUEL.phase = 'fin'; DUEL.perdant = String(perdant); DUEL.t = sv.tickCount
  var jp = duJoueur(sv, perdant)
  if (jp) {
    try { if (Number(jp.health) < DU_KO_PV) jp.setHealth(DU_KO_PV) } catch (e) {}
    duFiger(sv, String(perdant), true)
    duCmd(sv, 'title ' + perdant + ' actionbar ' + JSON.stringify({ text: 'Tu as perdu le duel.', color: 'red' }))
  }
  duCmd(sv, 'title @a times 10 80 20')
  duCmd(sv, 'title @a subtitle ' + JSON.stringify({ text: raison || ('a vaincu ' + perdant + ' au Colisée'), color: 'gray' }))
  duCmd(sv, 'title @a title ' + JSON.stringify({ text: gagnant + ' est le vainqueur', color: 'gold' }))
  duCmd(sv, 'execute as @a at @s run playsound minecraft:ui.toast.challenge_complete master @s ~ ~ ~ 1 1')
  console.info('[duel] ' + gagnant + ' bat ' + perdant + (raison ? ' (' + raison + ')' : ''))
  try { if (typeof eqDuelResultat === 'function') eqDuelResultat(sv, gagnant, perdant) } catch (eS) {}   // tableau des duellistes (equipes.js)
}
function duTerminer(sv) {
  if (!DUEL) return
  duReparer(sv)
  var n = [DUEL.a, DUEL.b]
  for (var i = 0; i < 2; i++) {
    duLiberer(sv, n[i])
    var j = duJoueur(sv, n[i]); if (j) duSoigner(j)
  }
  DUEL = null
}

// ── Dégâts : seuls les duellistes se touchent entre eux ; tomber à 1 cœur = défaite ──
function duAttaquant(src) {
  try { var a = src.actual; if (a !== undefined && a !== null) return a } catch (e) {}
  try { return src.getEntity() } catch (e2) {}
  return null
}
function duApresDegats(cible, event) {
  var m = Number(event.getAmount())
  try {
    var CR = Java.loadClass('net.minecraft.world.damagesource.CombatRules')
    var At = Java.loadClass('net.minecraft.world.entity.ai.attributes.Attributes')
    m = Number(CR.getDamageAfterAbsorb(cible, m, event.getSource(), Number(cible.getArmorValue()), Number(cible.getAttributeValue(At.ARMOR_TOUGHNESS))))
  } catch (e) {}
  return Number(cible.getHealth()) + Number(cible.getAbsorptionAmount()) - m
}
try {
  NativeEvents.onEvent(Java.loadClass('net.neoforged.neoforge.event.entity.living.LivingIncomingDamageEvent'), function (event) {
    try {
      if (!DUEL) return
      var cible = event.getEntity()
      var att = duAttaquant(event.getSource())
      var attJoueur = att && att.isPlayer && att.isPlayer() ? String(att.username) : null
      var cibleJoueur = cible && cible.isPlayer() ? String(cible.username) : null
      // Un duelliste ne frappe que son adversaire (pas les spectateurs) ; personne d'autre ne touche les duellistes.
      if (attJoueur && duEstDuelliste(attJoueur) && cibleJoueur && cibleJoueur !== duAdversaire(attJoueur) && cibleJoueur !== attJoueur) { event.setCanceled(true); return }
      if (!cibleJoueur || !duEstDuelliste(cibleJoueur)) return
      if (attJoueur && attJoueur !== cibleJoueur && !duEstDuelliste(attJoueur)) { event.setCanceled(true); return }
      if (DUEL.phase !== 'combat') { event.setCanceled(true); return }
      if (duApresDegats(cible, event) <= DU_KO_PV) {
        event.setCanceled(true)
        try { cible.setHealth(DU_KO_PV) } catch (e) {}
        duVictoire(cible.server, cibleJoueur)
      }
    } catch (err) { console.error('[duel] dégâts : ' + err) }
  })
} catch (e) { console.error('[duel] événement de dégâts indisponible : ' + e) }
// Filet de sécurité : un duelliste ne meurt jamais pendant le duel
try {
  NativeEvents.onEvent(Java.loadClass('net.neoforged.neoforge.event.entity.living.LivingDeathEvent'), function (event) {
    try {
      if (!DUEL) return
      var c = event.getEntity()
      if (!c || !c.isPlayer() || !duEstDuelliste(c.username)) return
      event.setCanceled(true)
      try { c.setHealth(DU_KO_PV) } catch (e) {}
      if (DUEL.phase === 'combat') duVictoire(c.server, String(c.username))
    } catch (err) { console.error('[duel] mort : ' + err) }
  })
} catch (e) { console.error('[duel] événement de mort indisponible : ' + e) }
// Pas de sort pendant le décompte, ni pour le perdant figé
try {
  NativeEvents.onEvent(Java.loadClass('io.redspace.ironsspellbooks.api.events.SpellPreCastEvent'), function (event) {
    try {
      if (!DUEL || DUEL.phase === 'combat') return
      var j = event.getEntity()
      if (j && j.isPlayer() && duEstDuelliste(j.username)) event.setCanceled(true)
    } catch (err) {}
  })
} catch (e) { console.error('[duel] blocage des sorts indisponible : ' + e) }
ItemEvents.rightClicked(function (e) {
  try { if (DUEL && DUEL.phase !== 'combat' && duEstDuelliste(e.player.username)) e.cancel() } catch (err) {}
})

// ── Déroulement (vérifié chaque tick) ──
ServerEvents.tick(function (event) {
  var sv = event.server
  // Sans duel en cours (par exemple après un /reload pendant un duel), personne ne doit rester figé : on libère, toutes les 5 s.
  if (!DUEL) {
    if (sv.tickCount % 100 !== 7) return
    var js = sv.players
    for (var q = 0; q < js.length; q++) {
      try { if (js[q].persistentData.getBoolean('duel_fige')) { duLiberer(sv, String(js[q].username)); console.info('[duel] ' + js[q].username + ' libéré (plus de duel en cours)') } } catch (eL) {}
    }
    return
  }
  try {
    duReparer(sv)
    var ecoule = sv.tickCount - DUEL.t
    if (DUEL.phase === 'decompte') {
      if (ecoule >= 20) {
        DUEL.t = sv.tickCount
        DUEL.reste--
        if (DUEL.reste <= 0) duDebutCombat(sv); else duAfficherDecompte(sv)
      }
      return
    }
    if (DUEL.phase === 'fin') {
      if (ecoule >= DU_FIGE_FIN * 20) duTerminer(sv)
      return
    }
    // combat : chaque seconde, déconnexion / sortie de l'arène / 1 cœur
    if (sv.tickCount % 20 !== 0) return
    var n = [DUEL.a, DUEL.b]
    for (var i = 0; i < 2; i++) {
      var j = duJoueur(sv, n[i])
      if (!j) { duVictoire(sv, n[i], n[i] + ' a quitté le serveur'); return }
      if (!duDansArene(j)) { duVictoire(sv, n[i], n[i] + ' est sorti de l\'arène'); return }
      if (Number(j.health) <= DU_KO_PV) { duVictoire(sv, n[i]); return }
    }
  } catch (err) { console.error('[duel] ' + err); }
})

// Un joueur resté figé (déconnexion, /reload pendant un duel) est libéré à sa reconnexion
PlayerEvents.loggedIn(function (e) {
  try {
    var j = e.player
    if (j.persistentData.getBoolean('duel_fige') && !duEstDuelliste(j.username)) duLiberer(e.server, String(j.username))
  } catch (err) { console.error('[duel] connexion : ' + err) }
})

// ── Commande ──
ServerEvents.commandRegistry(function (event) {
  var Commands = event.commands
  var Arguments = event.arguments
  var autorise = function (s) {
    if (s.hasPermission(2)) return true
    try { var p = s.getPlayer(); return !!(p && typeof pfEstProf === 'function' && pfEstProf(p)) } catch (e) { return false }
  }
  var dire = function (ctx, txt, rouge) {
    try { var p = ctx.source.player; if (p) { p.tell(rouge ? Text.red(txt) : Text.gold(txt)); return } } catch (e) {}
    console.info('[duel] ' + txt)
  }
  var verifs = function (ctx, sv, j1, j2) {
    if (DUEL) { dire(ctx, 'Un duel est déjà en cours (' + DUEL.a + ' contre ' + DUEL.b + ').', true); return false }
    if (String(j1.username) === String(j2.username)) { dire(ctx, 'Il faut deux joueurs différents.', true); return false }
    try { if (typeof auCombatActif === 'function' && auCombatActif(sv)) { dire(ctx, 'Impossible pendant l\'épreuve du Courage.', true); return false } } catch (e) {}
    try { if (!sv.isPvpAllowed()) { dire(ctx, 'Le PvP est désactivé sur le serveur (pvp=false dans server.properties).', true); return false } } catch (e2) {}
    return true
  }
  event.register(Commands.literal('duel')
    // /duel arreter : professeurs et op
    .then(Commands.literal('arreter').requires(autorise).executes(function (ctx) {
      if (!DUEL) { dire(ctx, 'Aucun duel en cours.', true); return 0 }
      var sv = ctx.source.server
      duCmd(sv, 'tellraw @a ' + JSON.stringify([{ text: '[Colisée] ', color: 'gold' }, { text: 'Le duel entre ' + DUEL.a + ' et ' + DUEL.b + ' a été annulé.', color: 'gray' }]))
      duTerminer(sv)
      return 1
    }))
    // /duel accepter | refuser : réponse à un défi
    .then(Commands.literal('accepter').executes(function (ctx) {
      var moi = ctx.source.player
      if (!moi) return 0
      var sv = ctx.source.server
      var d = DU_DEFIS[String(moi.username)]
      delete DU_DEFIS[String(moi.username)]
      if (!d || sv.tickCount > d.fin) { dire(ctx, 'Personne ne t\'a défié (ou le défi a expiré).', true); return 0 }
      var adv = duJoueur(sv, d.de)
      if (!adv) { dire(ctx, d.de + ' n\'est plus connecté.', true); return 0 }
      if (!duDansArene(moi) || !duDansArene(adv)) { dire(ctx, 'Vous devez être tous les deux dans le Colisée.', true); return 0 }
      if (!verifs(ctx, sv, adv, moi)) return 0
      duLancer(sv, adv, moi)
      return 1
    }))
    .then(Commands.literal('refuser').executes(function (ctx) {
      var moi = ctx.source.player
      if (!moi) return 0
      var d = DU_DEFIS[String(moi.username)]
      delete DU_DEFIS[String(moi.username)]
      if (!d) { dire(ctx, 'Personne ne t\'a défié.', true); return 0 }
      var adv = duJoueur(ctx.source.server, d.de)
      if (adv) adv.tell(Text.gray(moi.username + ' a refusé ton duel.'))
      dire(ctx, 'Duel refusé.', false)
      return 1
    }))
    .then(Commands.argument('joueur1', Arguments.PLAYER.create(event))
      // /duel <adversaire> : un élève défie un autre joueur ; les deux doivent être dans le Colisée
      .executes(function (ctx) {
        try {
          var moi = ctx.source.player
          if (!moi) return 0
          var sv = ctx.source.server
          var adv = Arguments.PLAYER.getResult(ctx, 'joueur1')
          if (!verifs(ctx, sv, moi, adv)) return 0
          if (!duDansArene(moi) || !duDansArene(adv)) { dire(ctx, 'Vous devez être tous les deux dans le Colisée pour un duel.', true); return 0 }
          DU_DEFIS[String(adv.username)] = { de: String(moi.username), fin: sv.tickCount + DU_DEFI_S * 20 }
          sv.runCommandSilent('tellraw ' + adv.username + ' ' + JSON.stringify([
            { text: '[Colisée] ', color: 'gold' }, { text: moi.username, color: 'yellow' }, { text: ' te défie en duel ! ', color: 'gray' },
            { text: '[Accepter]', color: 'green', bold: true, clickEvent: { action: 'run_command', value: '/duel accepter' } }, { text: '  ' },
            { text: '[Refuser]', color: 'red', bold: true, clickEvent: { action: 'run_command', value: '/duel refuser' } }]))
          dire(ctx, 'Défi envoyé à ' + adv.username + ' (' + DU_DEFI_S + ' s pour répondre).', false)
          return 1
        } catch (err) { console.error('[duel] défi : ' + err); return 0 }
      })
      // /duel <joueur1> <joueur2> : professeurs et op lancent un duel entre deux joueurs, où qu'ils soient
      .then(Commands.argument('joueur2', Arguments.PLAYER.create(event)).requires(autorise).executes(function (ctx) {
        try {
          var sv = ctx.source.server
          var j1 = Arguments.PLAYER.getResult(ctx, 'joueur1')
          var j2 = Arguments.PLAYER.getResult(ctx, 'joueur2')
          if (!verifs(ctx, sv, j1, j2)) return 0
          duLancer(sv, j1, j2)
          return 1
        } catch (err) { console.error('[duel] /duel : ' + err); return 0 }
      })))
  )
})
