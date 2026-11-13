// Duels du Colisée (KubeJS 1.21.1 / NeoForge)
// /duel <joueur1> <joueur2> : les deux joueurs sont téléportés face à face dans l'arène du Colisée, un décompte de 5 secondes
//   s'affiche au milieu de leur écran (et de celui des spectateurs présents dans le Colisée), puis le combat commence :
//   armes, sorts, tout est permis. Le premier qui fait tomber l'autre à 1 cœur gagne.
//   Le perdant se fige (comme dans l'épreuve du Courage) quelques secondes, puis les deux duellistes sont soignés et libérés.
//   « <joueur> est le vainqueur » s'affiche sur l'écran de tout le monde.
// /duel arreter : annule le duel en cours (personne ne gagne).
// /duel <adversaire> : un élève défie un autre joueur (les deux dans le Colisée) ; /duel accepter | refuser pour répondre.
// /duel <joueur1> <joueur2> et /duel arreter : professeurs et opérateurs. Les armures ne s'usent pas pendant un duel.
// /duel equipe <équipe> : un membre d'une équipe défie une autre équipe ; un membre de l'équipe défiée répond /duel accepter | refuser.
//   Combattent les membres connectés des deux équipes présents dans le Colisée (au moins 1 de chaque côté). Un joueur à 1 cœur est
//   « hors combat » (figé, lumineux, intouchable) ; la première équipe dont tous les combattants sont hors combat perd.
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
var DU_DEFIS_EQ = {}   // défis d'équipe en attente : slug de l'équipe défiée -> { de: slug, par: nom, fin }

// ── Duel d'équipes (s'appuie sur equipes.js) ──
function duEquipe(sv, slug) { try { return eqCharger(sv).equipes[slug] || null } catch (e) { return null } }
// Membres connectés de l'équipe présents dans le Colisée
function duCombattantsEquipe(sv, slug) {
  var eq = duEquipe(sv, slug), l = []
  if (!eq) return l
  for (var i = 0; i < eq.membres.length; i++) {
    var j = null
    try { j = sv.getPlayerList().getPlayer(EQ_UUID.fromString(eq.membres[i])) } catch (e) {}
    if (j && j.isAlive() && duDansArene(j)) l.push(j)
  }
  return l
}
// Membres connectés de l'équipe (pour leur envoyer le défi)
function duConnectesEquipe(sv, slug) {
  var eq = duEquipe(sv, slug), l = []
  if (!eq) return l
  for (var i = 0; i < eq.membres.length; i++) {
    try { var j = sv.getPlayerList().getPlayer(EQ_UUID.fromString(eq.membres[i])); if (j) l.push(j) } catch (e) {}
  }
  return l
}

function duCmd(sv, txt) { try { sv.runCommandSilent('execute in ' + DU_DIM + ' run ' + txt) } catch (e) { console.error('[duel] ' + txt + ' -> ' + e) } }
function duJoueur(sv, nom) { try { return sv.getPlayerList().getPlayerByName(nom) } catch (e) { return null } }
// DUEL.camps : { 1: [noms], 2: [noms] } ; DUEL.ko : noms hors combat (duel d'équipes) ; DUEL.mode : 'solo' | 'equipe'
function duCampDe(nom) {
  if (!DUEL || !DUEL.camps) return 0
  nom = String(nom)
  if (DUEL.camps[1].indexOf(nom) !== -1) return 1
  if (DUEL.camps[2].indexOf(nom) !== -1) return 2
  return 0
}
function duParticipants() { return DUEL && DUEL.camps ? DUEL.camps[1].concat(DUEL.camps[2]) : [] }
function duEstDuelliste(nom) { return duCampDe(nom) > 0 }
function duEstKo(nom) { return !!(DUEL && DUEL.ko && DUEL.ko[String(nom)]) }
// Duel à deux : l'adversaire ; duel d'équipes : null (utilisé par equipes.js pour les coups entre coéquipiers)
function duAdversaire(nom) { return DUEL && DUEL.mode === 'solo' ? (DUEL.a === String(nom) ? DUEL.b : DUEL.a) : null }
function duSontAdversaires(x, y) {
  var cx = duCampDe(x), cy = duCampDe(y)
  return cx > 0 && cy > 0 && cx !== cy && !duEstKo(x) && !duEstKo(y)
}
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
  var n = duParticipants()
  for (var k = 0; k < n.length; k++) {
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
  duDemarrer(sv, [j1], [j2], { mode: 'solo', a: a, b: b, titre: a + ' contre ' + b })
  duCmd(sv, 'tellraw @a ' + JSON.stringify([{ text: '[Colisée] ', color: 'gold' }, { text: a, color: 'yellow' },
    { text: ' et ', color: 'gray' }, { text: b, color: 'yellow' }, { text: ' s\'affrontent en duel !', color: 'gray' }]))
  duAfficherDecompte(sv)
}
// Duel d'équipes : js1 / js2 = joueurs de chaque camp ; nom1 / nom2 = noms des équipes
function duLancerEquipes(sv, js1, js2, nom1, nom2, slug1, slug2) {
  duDemarrer(sv, js1, js2, { mode: 'equipe', nom1: nom1, nom2: nom2, slug1: slug1, slug2: slug2, titre: nom1 + ' contre ' + nom2 })
  duCmd(sv, 'tellraw @a ' + JSON.stringify([{ text: '[Colisée] ', color: 'gold' }, { text: 'L\'équipe ', color: 'gray' }, { text: nom1, color: 'yellow' },
    { text: ' (' + js1.length + ') et l\'équipe ', color: 'gray' }, { text: nom2, color: 'yellow' }, { text: ' (' + js2.length + ') s\'affrontent au Colisée !', color: 'gray' }]))
  duAfficherDecompte(sv)
}
function duDemarrer(sv, js1, js2, info) {
  DUEL = { mode: info.mode, a: info.a || null, b: info.b || null, titre: info.titre, nom1: info.nom1, nom2: info.nom2, slug1: info.slug1, slug2: info.slug2,
    camps: { 1: [], 2: [] }, ko: {}, phase: 'decompte', t: sv.tickCount, reste: DU_DECOMPTE, perdant: null, armures: {} }
  var camps = [[js1, DU_POS_1, 1], [js2, DU_POS_2, 2]]
  for (var c = 0; c < 2; c++) {
    var liste = camps[c][0], p = camps[c][1]
    for (var i = 0; i < liste.length; i++) {
      var j = liste[i], n = String(j.username)
      DUEL.camps[camps[c][2]].push(n)
      DUEL.armures[n] = duArmures(j)
      var dz = (i - (liste.length - 1) / 2) * 2.5   // côte à côte, espacés de 2,5 blocs
      duCmd(sv, 'tp ' + n + ' ' + (p[0] + 0.5) + ' ' + p[1] + ' ' + (p[2] + 0.5 + dz) + ' ' + p[3] + ' 0')
      duSoigner(j)
      duFiger(sv, n, false)
    }
  }
}
function duAfficherDecompte(sv) {
  var l = duPublic(sv)
  for (var i = 0; i < l.length; i++) {
    duTitre(sv, l[i], String(DUEL.reste), 'gold', DUEL.titre)
    duCmd(sv, 'execute as ' + l[i] + ' at @s run playsound minecraft:block.note_block.hat master @s ~ ~ ~ 1 1')
  }
}
function duDebutCombat(sv) {
  DUEL.phase = 'combat'
  var tous = duParticipants()
  for (var q = 0; q < tous.length; q++) duLiberer(sv, tous[q])
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
// Un combattant tombe à 1 cœur (ou sort / se déconnecte) : duel à deux = défaite ; duel d'équipes = hors combat, et son camp perd
// quand tous ses combattants sont hors combat.
function duKo(sv, nom, raison) {
  if (!DUEL || DUEL.phase === 'fin') return
  if (DUEL.mode !== 'equipe') { duVictoire(sv, nom, raison); return }
  nom = String(nom)
  if (DUEL.ko[nom]) return
  DUEL.ko[nom] = true
  var jp = duJoueur(sv, nom)
  if (jp) {
    try { if (Number(jp.health) < DU_KO_PV) jp.setHealth(DU_KO_PV) } catch (e) {}
    duFiger(sv, nom, true)
    duCmd(sv, 'title ' + nom + ' actionbar ' + JSON.stringify({ text: 'Tu es hors combat.', color: 'red' }))
  }
  var camp = duCampDe(nom)
  duCmd(sv, 'tellraw @a ' + JSON.stringify([{ text: '[Colisée] ', color: 'gold' }, { text: nom, color: 'yellow' },
    { text: ' (' + (camp === 1 ? DUEL.nom1 : DUEL.nom2) + ') est hors combat' + (raison ? ' : ' + raison : '') + '.', color: 'gray' }]))
  var membres = DUEL.camps[camp], restants = 0
  for (var i = 0; i < membres.length; i++) if (!DUEL.ko[membres[i]]) restants++
  if (restants === 0) duVictoireEquipe(sv, camp === 1 ? 2 : 1)
}
function duVictoireEquipe(sv, campGagnant) {
  if (!DUEL || DUEL.phase === 'fin') return
  var nomG = campGagnant === 1 ? DUEL.nom1 : DUEL.nom2, nomP = campGagnant === 1 ? DUEL.nom2 : DUEL.nom1
  DUEL.phase = 'fin'; DUEL.t = sv.tickCount
  var gagnants = DUEL.camps[campGagnant]
  for (var i = 0; i < gagnants.length; i++) { try { var jg = duJoueur(sv, gagnants[i]); if (jg) ftbFait(jg, 'duel_gagne') } catch (eF) {} }
  duCmd(sv, 'title @a times 10 80 20')
  duCmd(sv, 'title @a subtitle ' + JSON.stringify({ text: 'a vaincu l\'équipe ' + nomP + ' au Colisée', color: 'gray' }))
  duCmd(sv, 'title @a title ' + JSON.stringify({ text: 'L\'équipe ' + nomG + ' gagne', color: 'gold' }))
  duCmd(sv, 'execute as @a at @s run playsound minecraft:ui.toast.challenge_complete master @s ~ ~ ~ 1 1')
  console.info('[duel] équipe ' + nomG + ' bat équipe ' + nomP)
}
function duTerminer(sv) {
  if (!DUEL) return
  duReparer(sv)
  var n = duParticipants()
  for (var i = 0; i < n.length; i++) {
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
      // Un duelliste ne frappe que ses adversaires (pas les spectateurs, ni ses coéquipiers) ; personne d'autre ne touche les duellistes.
      if (attJoueur && duEstDuelliste(attJoueur) && cibleJoueur && cibleJoueur !== attJoueur && !duSontAdversaires(attJoueur, cibleJoueur)) { event.setCanceled(true); return }
      if (!cibleJoueur || !duEstDuelliste(cibleJoueur)) return
      if (attJoueur && attJoueur !== cibleJoueur && !duEstDuelliste(attJoueur)) { event.setCanceled(true); return }
      if (duEstKo(cibleJoueur) || (attJoueur && duEstKo(attJoueur))) { event.setCanceled(true); return }   // hors combat : intouchable et inoffensif
      if (DUEL.phase !== 'combat') { event.setCanceled(true); return }
      if (duApresDegats(cible, event) <= DU_KO_PV) {
        event.setCanceled(true)
        try { cible.setHealth(DU_KO_PV) } catch (e) {}
        duKo(cible.server, cibleJoueur)
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
      if (DUEL.phase === 'combat') duKo(c.server, String(c.username))
    } catch (err) { console.error('[duel] mort : ' + err) }
  })
} catch (e) { console.error('[duel] événement de mort indisponible : ' + e) }
// Pas de sort pendant le décompte, ni pour le perdant figé
try {
  NativeEvents.onEvent(Java.loadClass('io.redspace.ironsspellbooks.api.events.SpellPreCastEvent'), function (event) {
    try {
      if (!DUEL) return
      var j = event.getEntity()
      if (j && j.isPlayer() && duEstDuelliste(j.username) && (DUEL.phase !== 'combat' || duEstKo(j.username))) event.setCanceled(true)
    } catch (err) {}
  })
} catch (e) { console.error('[duel] blocage des sorts indisponible : ' + e) }
ItemEvents.rightClicked(function (e) {
  try { if (DUEL && duEstDuelliste(e.player.username) && (DUEL.phase !== 'combat' || duEstKo(e.player.username))) e.cancel() } catch (err) {}
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
    var n = duParticipants()
    for (var i = 0; i < n.length; i++) {
      if (!DUEL || DUEL.phase !== 'combat') return
      if (duEstKo(n[i])) continue
      var j = duJoueur(sv, n[i])
      if (!j) { duKo(sv, n[i], n[i] + ' a quitté le serveur'); continue }
      if (!duDansArene(j)) { duKo(sv, n[i], n[i] + ' est sorti de l\'arène'); continue }
      if (Number(j.health) <= DU_KO_PV) duKo(sv, n[i])
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

function duArgEquipe(Commands, Arguments, event, dire) {
  var arg = Commands.argument('equipe', Arguments.GREEDY_STRING.create(event))
  try {
    arg = arg.suggests(function (ctx, builder) {
      try {
        var eqs = eqCharger(ctx.source.server).equipes, cur = String(builder.getRemaining()).toLowerCase()
        for (var s in eqs) { var nm = String(eqs[s].nom); if (!cur || nm.toLowerCase().indexOf(cur) === 0 || s.indexOf(cur) === 0) builder.suggest(nm) }
      } catch (e) {}
      return builder.buildFuture()
    })
  } catch (e) { console.error('[duel] suggestions /duel equipe : ' + e) }
  return arg.executes(function (ctx) {
    try {
      var moi = ctx.source.player
      if (!moi) return 0
      var sv = ctx.source.server
      var slugMoi = null
      try { slugMoi = eqEquipeDe(sv, moi) } catch (e0) {}
      if (!slugMoi) { dire(ctx, 'Tu dois faire partie d\'une équipe (voir /equipe).', true); return 0 }
      var slugAdv = eqSlug(Arguments.GREEDY_STRING.getResult(ctx, 'equipe'))
      var eqAdv = duEquipe(sv, slugAdv)
      if (!eqAdv) { dire(ctx, 'Équipe introuvable (voir /equipe liste).', true); return 0 }
      if (slugAdv === slugMoi) { dire(ctx, 'Tu ne peux pas défier ta propre équipe.', true); return 0 }
      if (DUEL) { dire(ctx, 'Un duel est déjà en cours (' + DUEL.titre + ').', true); return 0 }
      if (!duDansArene(moi)) { dire(ctx, 'Tu dois être dans le Colisée pour lancer un défi.', true); return 0 }
      var cibles = duConnectesEquipe(sv, slugAdv)
      if (!cibles.length) { dire(ctx, 'Aucun membre de l\'équipe ' + eqAdv.nom + ' n\'est connecté.', true); return 0 }
      var eqMoi = duEquipe(sv, slugMoi)
      DU_DEFIS_EQ[slugAdv] = { de: slugMoi, par: String(moi.username), fin: sv.tickCount + DU_DEFI_S * 20 }
      for (var i = 0; i < cibles.length; i++) {
        sv.runCommandSilent('tellraw ' + cibles[i].username + ' ' + JSON.stringify([
          { text: '[Colisée] ', color: 'gold' }, { text: moi.username, color: 'yellow' }, { text: ' (équipe ' + eqMoi.nom + ') défie ton équipe en duel ! Rendez-vous au Colisée. ', color: 'gray' },
          { text: '[Accepter]', color: 'green', bold: true, clickEvent: { action: 'run_command', value: '/duel accepter' } }, { text: '  ' },
          { text: '[Refuser]', color: 'red', bold: true, clickEvent: { action: 'run_command', value: '/duel refuser' } }]))
      }
      var miens = duConnectesEquipe(sv, slugMoi)
      for (var k = 0; k < miens.length; k++) if (String(miens[k].username) !== String(moi.username)) miens[k].tell(Text.gold('[Colisée] ' + moi.username + ' a défié l\'équipe ' + eqAdv.nom + '. Rendez-vous au Colisée !'))
      dire(ctx, 'Défi envoyé à l\'équipe ' + eqAdv.nom + ' (' + DU_DEFI_S + ' s pour répondre).', false)
      return 1
    } catch (err) { console.error('[duel] défi d\'équipe : ' + err); return 0 }
  })
}

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
    if (DUEL) { dire(ctx, 'Un duel est déjà en cours (' + DUEL.titre + ').', true); return false }
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
      duCmd(sv, 'tellraw @a ' + JSON.stringify([{ text: '[Colisée] ', color: 'gold' }, { text: 'Le duel (' + DUEL.titre + ') a été annulé.', color: 'gray' }]))
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
      if (!d) {   // défi lancé à son équipe ?
        var slugMoi = null
        try { slugMoi = eqEquipeDe(sv, moi) } catch (eS) {}
        var de = slugMoi ? DU_DEFIS_EQ[slugMoi] : null
        if (de) {
          delete DU_DEFIS_EQ[slugMoi]
          if (sv.tickCount > de.fin) { dire(ctx, 'Le défi de l\'équipe a expiré.', true); return 0 }
          if (DUEL) { dire(ctx, 'Un duel est déjà en cours (' + DUEL.titre + ').', true); return 0 }
          try { if (typeof auCombatActif === 'function' && auCombatActif(sv)) { dire(ctx, 'Impossible pendant l\'épreuve du Courage.', true); return 0 } } catch (eC) {}
          try { if (!sv.isPvpAllowed()) { dire(ctx, 'Le PvP est désactivé sur le serveur.', true); return 0 } } catch (eP) {}
          var c1 = duCombattantsEquipe(sv, de.de), c2 = duCombattantsEquipe(sv, slugMoi)
          if (!c1.length || !c2.length) { dire(ctx, 'Il faut au moins un membre de chaque équipe dans le Colisée.', true); return 0 }
          var e1 = duEquipe(sv, de.de), e2 = duEquipe(sv, slugMoi)
          duLancerEquipes(sv, c1, c2, e1 ? e1.nom : de.de, e2 ? e2.nom : slugMoi, de.de, slugMoi)
          return 1
        }
      }
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
      if (!d) {   // refus d'un défi d'équipe
        var svR = ctx.source.server, slugR = null
        try { slugR = eqEquipeDe(svR, moi) } catch (eS) {}
        var dR = slugR ? DU_DEFIS_EQ[slugR] : null
        if (dR) {
          delete DU_DEFIS_EQ[slugR]
          var lr = duConnectesEquipe(svR, dR.de)
          for (var r = 0; r < lr.length; r++) lr[r].tell(Text.gray(moi.username + ' a refusé le duel d\'équipes.'))
          dire(ctx, 'Duel d\'équipes refusé.', false)
          return 1
        }
      }
      if (!d) { dire(ctx, 'Personne ne t\'a défié.', true); return 0 }
      var adv = duJoueur(ctx.source.server, d.de)
      if (adv) adv.tell(Text.gray(moi.username + ' a refusé ton duel.'))
      dire(ctx, 'Duel refusé.', false)
      return 1
    }))
    // /duel equipe <équipe> : défier une autre équipe (les membres présents dans le Colisée combattent)
    .then(Commands.literal('equipe').then(duArgEquipe(Commands, Arguments, event, dire)))
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
