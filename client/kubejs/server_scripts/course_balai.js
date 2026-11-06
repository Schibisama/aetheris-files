// Course de balai : traverser des anneaux, dans l'ordre, le plus vite possible.
//
// Parcours (professeurs et ops) :
//   /course anneau ajouter [rayon] [vertical|horizontal|incline <angle>|regard]   pose un anneau à hauteur des yeux (rayon 3 par défaut).
//        horizontal <angle> : à plat puis penché de <angle> degrés (ex. horizontal 30) ;
//        incline <angle> : plan penché (0 = debout, 90 = à plat, 30 = diagonal, -30 = penché dans l'autre sens) ; regard : perpendiculaire à ta direction de regard (haut/bas compris).
//        vertical (par défaut) : debout, face à la direction du regard, on le traverse à l'horizontale ;
//        horizontal : à plat comme un cerceau au sol, on le traverse en montant ou en descendant.
//   /course anneau tourner <angle>    tourne le DERNIER anneau posé de <angle>° vers la droite/gauche (négatif = autre sens) ; /course anneau incliner <angle> : change son inclinaison haut/bas
//   /course anneau retirer           retire l'anneau le plus proche       /course anneau liste
//   /course effacer                  supprime tout le parcours
//   /course boucle oui|non           oui : circuit (chaque tour repasse par l'anneau 1) ; non : du 1er au dernier anneau
//   /course tours <n>                nombre de tours d'un circuit (1 à 10)
// Contre-la-montre (élèves) :
//   /course solo       sur un balai, près de l'anneau 1 : le chrono part au passage de l'anneau 1
//   /course abandon    abandonne la course en cours
// Course groupée (professeurs et ops) :
//   /course inscriptions   ouvre les inscriptions (les élèves tapent /course rejoindre)
//   /course lancer         décompte de 5 s puis départ ; le chrono de chacun part au GO, l'anneau 1 doit être franchi en premier
//   /course arreter        arrête la course groupée en cours
// Règles : il faut rester sur son balai du début à la fin ; pendant la course, sorts et téléportations sont interdits
// (une téléportation = abandon). Course groupée (equipes.js) : chaque participant rapporte des points à son équipe (CR.POINTS_PARTICIPATION :
// 7,5 par membre d'une équipe de 2, 5 par membre d'une équipe de 3), et les 3 premiers arrivés en rapportent en plus (CR.POINTS_PODIUM).
// Records : meilleur temps de chaque joueur ; tableau flottant avec /classement tableau poser course (equipes.js).

var CR = {
  CLE: 'mcrp_course',
  RAYON_DEFAUT: 3,
  DEPART_MAX: 40,            // distance max de l'anneau 1 pour lancer un contre-la-montre
  POINTS_PODIUM: [20, 15, 10],
  POINTS_PARTICIPATION: { 2: 7.5, 3: 5 },   // par participant, selon la taille de son équipe
  FIN_APRES_VAINQUEUR: 120,  // secondes laissées aux autres après l'arrivée du vainqueur
  VUE: 72                    // distance d'affichage des anneaux
}
var CR_DATA = null
var CR_COUREURS = {}   // uuid -> { mode, idx (anneau suivant), tour, debut (tick), px, py, pz, nom }
var CR_GROUPE = null   // { etat: 'inscriptions'|'decompte'|'course', inscrits: [uuid], arrivees: [{nom, t}], go, finVainqueur }
var CR_J = null
function crJ() {
  if (!CR_J) CR_J = { Dust: Java.loadClass('net.minecraft.core.particles.DustParticleOptions'), V3: Java.loadClass('org.joml.Vector3f'), UUID: Java.loadClass('java.util.UUID') }
  return CR_J
}

function crCharger(sv) {
  if (CR_DATA) return CR_DATA
  try { var b = String(sv.persistentData.getString(CR.CLE) || ''); CR_DATA = b ? JSON.parse(b) : null } catch (e) { CR_DATA = null }
  if (!CR_DATA) CR_DATA = {}
  if (!CR_DATA.anneaux) CR_DATA.anneaux = []
  if (CR_DATA.boucle === undefined) CR_DATA.boucle = true
  if (!CR_DATA.tours) CR_DATA.tours = 1
  if (!CR_DATA.records) CR_DATA.records = {}
  return CR_DATA
}
function crSauver(sv) {
  try { sv.persistentData.putString(CR.CLE, JSON.stringify(CR_DATA)) } catch (e) { console.error('[course] sauvegarde : ' + e) }
  try { EQ_SALE = true } catch (e2) {}
}
function crEn(j) { try { return String(j.clientInformation().language()).toLowerCase().indexOf('fr') !== 0 } catch (e) { return false } }
function crDire(j, fr, en, coul) { try { var t = Text.of(crEn(j) ? en : fr); j.tell(coul === 'red' ? t.red() : coul === 'green' ? t.green() : t.gold()) } catch (e) {} }
function crBarre(j, fr, en) { try { j.setStatusMessage(Text.of(crEn(j) ? en : fr).gold()) } catch (e) {} }
function crAnnoncer(sv, fr, en, coul) { var js = sv.players; for (var i = 0; i < js.length; i++) crDire(js[i], fr, en, coul); console.info('[course] ' + fr) }
function crRep(ctx, fr, en) { var p = ctx.source.player; if (p) crDire(p, fr, en); else console.info('[course] ' + fr); return 1 }
function crProf(ctx) {
  try { if (typeof profOuOp === 'function') return profOuOp(ctx.source) } catch (e) {}
  try { return ctx.source.hasPermission(2) } catch (e2) { return false }
}
// Le balai du mod est une entité apprenticecodex:floatmount_broom / hoverride_broom (getClass() n'existe pas sous KubeJS : on lit le type et le nom).
function crVehicule(p) {
  try { return p.getVehicle() } catch (e) {}
  try { return p.vehicle } catch (e2) {}
  return null
}
function crEstBalai(v) {
  if (!v) return false
  try { if (String(v.type).toLowerCase().indexOf('broom') !== -1) return true } catch (e) {}
  try { if (String(v).toLowerCase().indexOf('broom') !== -1) return true } catch (e2) {}
  return false
}
function crJoueur(sv, uuid) { try { return sv.getPlayerList().getPlayer(crJ().UUID.fromString(uuid)) } catch (e) { return null } }
function crTemps(ticks) {
  var cs = Math.round(ticks * 5), m = Math.floor(cs / 6000), s = Math.floor((cs % 6000) / 100), c = cs % 100
  return m + ':' + (s < 10 ? '0' : '') + s + '.' + (c < 10 ? '0' : '') + c
}
// Nombre total de passages d'anneaux pour finir, et index de l'anneau visé au passage n° k (0 = anneau 1 de départ)
function crTotal(d) {
  var n = d.anneaux.length
  return d.boucle ? 1 + n * d.tours : n
}
function crAnneauDuPassage(d, k) { return k % d.anneaux.length }

// ───────── Passage d'un anneau : le segment parcouru pendant le tick traverse le disque de l'anneau ─────────
// Orientation d'un anneau : incl = inclinaison du plan en degrés (0 = debout, 90 = à plat ; 30 = penché de 30° ; négatif = penché dans l'autre sens).
// Retourne la normale n (sens de traversée) et deux axes u (horizontal) et w (dans le plan de l'anneau).
function crIncl(a) { return a.incl !== undefined && a.incl !== null ? Number(a.incl) : (a.plat ? 90 : 0) }
function crBase(a) {
  var r = a.yaw * Math.PI / 180, i = crIncl(a) * Math.PI / 180, ci = Math.cos(i), si = Math.sin(i)
  var n = [-Math.sin(r) * ci, si, Math.cos(r) * ci], u = [Math.cos(r), 0, Math.sin(r)]
  var w = [n[1] * u[2] - n[2] * u[1], n[2] * u[0] - n[0] * u[2], n[0] * u[1] - n[1] * u[0]]
  return { n: n, u: u, w: w }
}
function crTraverse(a, x0, y0, z0, x1, y1, z1) {
  var B = crBase(a), nx = B.n[0], ny = B.n[1], nz = B.n[2]
  var d0 = (x0 - a.x) * nx + (y0 - a.y) * ny + (z0 - a.z) * nz, d1 = (x1 - a.x) * nx + (y1 - a.y) * ny + (z1 - a.z) * nz
  if ((d0 > 0 && d1 > 0) || (d0 < 0 && d1 < 0)) {
    // pas de changement de côté : accepté quand même si on passe très près du centre (balai très lent ou à l'arrêt dans l'anneau)
    var dc = Math.sqrt(Math.pow(x1 - a.x, 2) + Math.pow(y1 - a.y, 2) + Math.pow(z1 - a.z, 2))
    return Math.abs(d1) < 0.6 && dc <= a.r
  }
  var t = d0 === d1 ? 0 : d0 / (d0 - d1)
  var ix = x0 + (x1 - x0) * t, iy = y0 + (y1 - y0) * t, iz = z0 + (z1 - z0) * t
  return Math.sqrt(Math.pow(ix - a.x, 2) + Math.pow(iy - a.y, 2) + Math.pow(iz - a.z, 2)) <= a.r
}

function crArrivee(sv, p, c) {
  var d = crCharger(sv), t = sv.tickCount - c.debut, u = String(p.uuid), nom = String(p.username)
  delete CR_COUREURS[u]
  var rec = d.records[u], nouveau = !rec || t < rec.t
  if (nouveau) { d.records[u] = { nom: nom, t: t }; crSauver(sv) }
  try { sv.runCommandSilent('execute as ' + nom + ' at @s run playsound minecraft:ui.toast.challenge_complete master @s ~ ~ ~ 1 1') } catch (e) {}
  if (c.mode === 'groupe' && CR_GROUPE) {
    CR_GROUPE.arrivees.push({ nom: nom, t: t })
    var rang = CR_GROUPE.arrivees.length
    crAnnoncer(sv, nom + ' franchit la ligne en ' + rang + (rang === 1 ? 'er' : 'e') + ' position (' + crTemps(t) + ')' + (nouveau ? ' — record personnel !' : ''),
      nom + ' crosses the line in position ' + rang + ' (' + crTemps(t) + ')' + (nouveau ? ' — personal best!' : ''), 'gold')
    if (rang === 1) CR_GROUPE.finVainqueur = sv.tickCount + CR.FIN_APRES_VAINQUEUR * 20
    var bonus = CR.POINTS_PODIUM[rang - 1]
    if (bonus) {
      try {
        if (typeof eqEquipeDe === 'function') {
          var slug = eqEquipeDe(sv, p)
          if (slug) {
            eqAjouterPoints(sv, slug, bonus); eqSauver(sv)
            var eq = eqCharger(sv).equipes[slug]
            crAnnoncer(sv, "L'équipe " + eq.nom + ' gagne ' + bonus + ' points grâce à ' + nom + ' !', 'Team ' + eq.nom + ' earns ' + bonus + ' points thanks to ' + nom + '!', 'green')
          }
        }
      } catch (eP) {}
    }
    crFinGroupeSiFini(sv)
  } else {
    crDire(p, 'Arrivée ! Temps : ' + crTemps(t) + (nouveau ? ' — nouveau record personnel !' : ' (record : ' + crTemps(rec.t) + ')'),
      'Finish! Time: ' + crTemps(t) + (nouveau ? ' — new personal best!' : ' (best: ' + crTemps(rec.t) + ')'), 'green')
  }
}
function crAbandon(sv, uuid, fr, en) {
  if (typeof CR_ATTENTE !== 'undefined' && CR_ATTENTE[uuid]) { delete CR_ATTENTE[uuid]; crRetirerBalaiEpreuve(sv, uuid) }
  var c = CR_COUREURS[uuid]
  if (!c) return
  delete CR_COUREURS[uuid]
  var p = crJoueur(sv, uuid)
  if (p) crDire(p, fr || 'Course abandonnée.', en || 'Race abandoned.', 'red')
  if (c.mode === 'groupe') crFinGroupeSiFini(sv)
}
function crFinGroupeSiFini(sv) {
  if (!CR_GROUPE || CR_GROUPE.etat !== 'course') return
  for (var u in CR_COUREURS) if (CR_COUREURS[u].mode === 'groupe') return
  crTerminerGroupe(sv)
}
function crTerminerGroupe(sv) {
  if (!CR_GROUPE) return
  for (var u in CR_COUREURS) if (CR_COUREURS[u].mode === 'groupe') delete CR_COUREURS[u]
  // points de participation : chaque partant rapporte des points à son équipe selon la taille de l'équipe
  try {
    if (typeof eqCharger === 'function' && CR_GROUPE.partants && CR_GROUPE.partants.length) {
      var d0 = eqCharger(sv), parEquipe = {}
      for (var s0 in d0.equipes) {
        var eq0 = d0.equipes[s0], n0 = 0
        for (var m0 = 0; m0 < CR_GROUPE.partants.length; m0++) if (eq0.membres.indexOf(CR_GROUPE.partants[m0]) !== -1) n0++
        var parTete = CR.POINTS_PARTICIPATION[eq0.membres.length] || 0
        if (n0 && parTete) { eqAjouterPoints(sv, s0, n0 * parTete); parEquipe[eq0.nom] = n0 * parTete }
      }
      eqSauver(sv)
      var lp = []
      for (var nomEq in parEquipe) lp.push(nomEq + ' +' + parEquipe[nomEq])
      if (lp.length) crAnnoncer(sv, 'Points de participation : ' + lp.join(', ') + '.', 'Participation points: ' + lp.join(', ') + '.', 'green')
    }
  } catch (eP) { console.error('[course] participation : ' + eP) }
  var a = CR_GROUPE.arrivees, fr = [], en = []
  for (var i = 0; i < a.length && i < 5; i++) { fr.push((i + 1) + '. ' + a[i].nom + ' (' + crTemps(a[i].t) + ')'); en.push((i + 1) + '. ' + a[i].nom + ' (' + crTemps(a[i].t) + ')') }
  crAnnoncer(sv, 'Course terminée ! ' + (fr.length ? fr.join('  ') : 'Personne n\'a franchi la ligne.'), 'Race over! ' + (en.length ? en.join('  ') : 'Nobody crossed the line.'), 'gold')
  CR_GROUPE = null
}

// ───────── Boucle : passages, chrono, anneaux en particules ─────────
ServerEvents.tick(function (event) {
  var sv = event.server, d = crCharger(sv), tick = sv.tickCount
  try {
    // décompte et fin de course groupée
    if (CR_GROUPE && CR_GROUPE.etat === 'decompte') {
      var reste = Math.ceil((CR_GROUPE.go - tick) / 20)
      if (tick < CR_GROUPE.go) {   // pas de déplacement pendant le décompte : chacun reste où il était au lancement
        if (!CR_GROUPE.fige) CR_GROUPE.fige = {}
        for (var kf = 0; kf < CR_GROUPE.inscrits.length; kf++) {
          var uf = CR_GROUPE.inscrits[kf], pf = crJoueur(sv, uf)
          if (!pf || !crEstBalai(crVehicule(pf))) continue
          if (!CR_GROUPE.fige[uf]) CR_GROUPE.fige[uf] = { x: pf.getX(), y: pf.getY(), z: pf.getZ() }
          var fp = CR_GROUPE.fige[uf]
          crFiger(sv, pf, fp.x, fp.y, fp.z)
        }
      }
      if ((CR_GROUPE.go - tick) % 20 === 0 && reste > 0) {
        for (var k = 0; k < CR_GROUPE.inscrits.length; k++) { var pk = crJoueur(sv, CR_GROUPE.inscrits[k]); if (pk) { try { sv.runCommandSilent('title ' + pk.username + ' title {"text":"' + reste + '","color":"yellow"}') } catch (e) {} } }
      }
      if (tick >= CR_GROUPE.go) {
        CR_GROUPE.etat = 'course'
        for (var k2 = 0; k2 < CR_GROUPE.inscrits.length; k2++) {
          var u2 = CR_GROUPE.inscrits[k2], p2 = crJoueur(sv, u2)
          if (!p2 || !crEstBalai(crVehicule(p2))) { if (p2) crDire(p2, "Tu n'étais pas sur ton balai au départ : course perdue.", 'You were not on your broom at the start: race lost.', 'red'); continue }
          CR_COUREURS[u2] = { mode: 'groupe', idx: 0, debut: tick, px: p2.getX(), py: p2.getY() + 0.8, pz: p2.getZ(), nom: String(p2.username) }
          CR_GROUPE.partants.push(u2)
          try { sv.runCommandSilent('title ' + p2.username + ' title {"text":"GO !","color":"green"}') } catch (e) {}
        }
        crFinGroupeSiFini(sv)
      }
    }
    if (CR_GROUPE && CR_GROUPE.etat === 'course' && CR_GROUPE.finVainqueur && tick >= CR_GROUPE.finVainqueur) crTerminerGroupe(sv)

    // coureurs
    var total = crTotal(d)
    for (var u in CR_COUREURS) {
      var c = CR_COUREURS[u], p = crJoueur(sv, u)
      if (!p) { crAbandon(sv, u); continue }
      if (!d.anneaux.length) { crAbandon(sv, u, 'Le parcours a été retiré.', 'The course was removed.'); continue }
      if (!crEstBalai(crVehicule(p))) { crAbandon(sv, u, 'Tu es descendu de ton balai : course perdue.', 'You got off your broom: race lost.'); continue }
      var x = p.getX(), y = p.getY() + 0.8, z = p.getZ()
      var a = d.anneaux[crAnneauDuPassage(d, c.idx)]
      if (crTraverse(a, c.px, c.py, c.pz, x, y, z)) {
        if (c.idx === 0 && c.mode === 'solo' && c.debut < 0) c.debut = tick   // contre-la-montre : le chrono part à l'anneau 1
        c.idx++
        try { sv.runCommandSilent('execute as ' + p.username + ' at @s run playsound minecraft:block.note_block.chime master @s ~ ~ ~ 1 ' + (c.idx >= total ? 2 : 1.4)) } catch (e) {}
        if (c.idx >= total) { crArrivee(sv, p, c); continue }
      }
      c.px = x; c.py = y; c.pz = z
      if (tick % 2 === 0) {
        var n = d.anneaux.length
        var tour = d.boucle && c.idx > 0 ? Math.min(d.tours, Math.floor((c.idx - 1) / n) + 1) : 1
        var t = c.debut >= 0 ? tick - c.debut : 0
        var suivant = crAnneauDuPassage(d, c.idx) + 1
        crBarre(p, (c.debut >= 0 ? crTemps(t) : 'Franchis l\'anneau 1 pour lancer le chrono') + '  ·  anneau ' + suivant + '/' + n + (d.boucle && d.tours > 1 ? '  ·  tour ' + tour + '/' + d.tours : ''),
          (c.debut >= 0 ? crTemps(t) : 'Cross ring 1 to start the clock') + '  ·  ring ' + suivant + '/' + n + (d.boucle && d.tours > 1 ? '  ·  lap ' + tour + '/' + d.tours : ''))
      }
    }

    // anneaux en particules (toutes les 10 ticks) : blanc pour tous ; pour un coureur, vert = suivant, jaune = celui d'après
    if (tick % 5 === 0 && d.anneaux.length) crDessiner(sv, d)
  } catch (e) { if (!CR._err) { CR._err = true; console.error('[course] ' + e) } }
})
// Qui voit les anneaux : ops et professeurs (pour les poser et les régler), et les joueurs en course (épreuve de Vroom, contre-la-montre,
// décompte, course groupée inscrite). Les autres ne les voient jamais.
function crVoitAnneaux(p) {
  var u = String(p.uuid)
  try { if (CR_COUREURS[u] || (typeof CR_ATTENTE !== 'undefined' && CR_ATTENTE[u])) return true } catch (e0) {}
  try { if (CR_GROUPE && CR_GROUPE.inscrits && CR_GROUPE.inscrits.indexOf(u) !== -1) return true } catch (e1) {}
  try { if (p.hasPermissions(2)) return true } catch (e2) {}
  try { if (typeof profOuOp === 'function' && profOuOp(p.createCommandSourceStack())) return true } catch (e3) {}
  try { if (p.getTags().contains('professeur')) return true } catch (e4) {}
  return false
}
function crDessiner(sv, d) {
  var J = crJ()
  var blanc = new J.Dust(new J.V3(0.4, 0.9, 1), 3), vert = new J.Dust(new J.V3(0.2, 1, 0.2), 4), jaune = new J.Dust(new J.V3(1, 0.85, 0.1), 3.5)
  var js = sv.players
  for (var i = 0; i < js.length; i++) {
    var p = js[i], lvl = p.level, dim = eqDimId(p)
    if (!crVoitAnneaux(p)) continue   // anneaux masqués : seulement pour les ops/professeurs et les participants
    var c = CR_COUREURS[String(p.uuid)], vise = -1, apres = -1
    if (c) { vise = crAnneauDuPassage(d, c.idx); if (c.idx + 1 < crTotal(d)) apres = crAnneauDuPassage(d, c.idx + 1) }
    for (var k = 0; k < d.anneaux.length; k++) {
      var a = d.anneaux[k]
      if (a.dim !== dim) continue
      var dist2 = Math.pow(a.x - p.getX(), 2) + Math.pow(a.y - p.getY(), 2) + Math.pow(a.z - p.getZ(), 2)
      if (dist2 > CR.VUE * CR.VUE && k !== vise) continue
      var opt = k === vise ? vert : (k === apres ? jaune : blanc)
      var B = crBase(a)
      var pts = Math.max(32, Math.round(a.r * 16))
      // deux cercles concentriques (épaisseur) + particules denses = anneau bien visible
      for (var e2 = 0; e2 < 2; e2++) {
        var rr = a.r - e2 * 0.18
        for (var q = 0; q < pts; q++) {
          var ang = q * 2 * Math.PI / pts, h = Math.cos(ang) * rr, v = Math.sin(ang) * rr
          // cercle dans le plan de l'anneau : axe horizontal u et axe w (debout, penché ou à plat selon l'inclinaison)
          var px = a.x + B.u[0] * h + B.w[0] * v, py = a.y + B.u[1] * h + B.w[1] * v, pz = a.z + B.u[2] * h + B.w[2] * v
          try { lvl.sendParticles(p, opt, true, px, py, pz, 1, 0, 0, 0, 0) } catch (e) {}
        }
      }
    }
  }
}

// ───────── Pendant la course : pas de sorts, une téléportation = abandon ─────────
try {
  NativeEvents.onEvent(Java.loadClass('io.redspace.ironsspellbooks.api.events.SpellPreCastEvent'), function (ev) {
    try { var p = ev.getEntity(); if (p && CR_COUREURS[String(p.uuid)]) { ev.setCanceled(true); crBarre(p, 'Pas de sorts pendant la course !', 'No spells during the race!') } } catch (e) {}
  })
} catch (e) { console.error('[course] blocage des sorts indisponible : ' + e) }
try {
  NativeEvents.onEvent(Java.loadClass('net.neoforged.neoforge.event.entity.EntityTeleportEvent'), function (ev) {
    try {
      var e = ev.getEntity()
      if (!e || !e.isPlayer() || !CR_COUREURS[String(e.uuid)]) return
      crAbandon(e.server, String(e.uuid), 'Téléportation pendant la course : course perdue.', 'Teleported during the race: race lost.')
    } catch (x) {}
  })
} catch (e) { console.error('[course] surveillance des téléportations indisponible : ' + e) }
PlayerEvents.loggedOut(function (event) {
  try { crAbandon(event.server, String(event.player.uuid)) } catch (e) {}
})

// ───────── Records (pour le tableau flottant de equipes.js) ─────────
function crTexteRecords() {
  var d = CR_DATA || { records: {} }, l = []
  for (var u in d.records) l.push(d.records[u])
  l.sort(function (a, b) { return a.t - b.t })
  var parts = ['', { translate: 'mcrp.tableau.course', color: 'gold' }, { text: '\n' }]
  if (!l.length) parts.push({ text: '\n' }, { translate: 'mcrp.tableau.aucun_temps', color: 'gray' })
  var rangs = ['gold', 'gray', '#CD7F32']
  for (var i = 0; i < l.length && i < 10; i++) parts.push({ text: '\n' + (i + 1) + '. ', color: rangs[i] || 'white' }, { text: l[i].nom + '  ', color: 'white' }, { text: crTemps(l[i].t), color: 'aqua' })
  return parts
}

// ───────── Épreuve du Professeur Vroom : contre-la-montre proposé par un PNJ ─────────
// Le joueur est téléporté sur un balai neuf au départ, décompte de 5 s, puis chrono jusqu'au dernier anneau (records + tableau).
var CR_TENTER = { x: 1056, y: 441, z: 994, dim: 'minecraft:overworld', decompte: 5, balai: 'apprenticecodex:floatmount_broom' }
var CR_ATTENTE = {}   // uuid -> { go (tick), tag }
var CR_BALAIS = {}    // uuid -> { tag, t0 } : balais de l'épreuve à retirer une fois le joueur descendu
// Immobilise le balai d'un joueur à (x,y,z) pendant le décompte : on ramène le balai (et son cavalier) au point de départ à chaque tick
function crFiger(sv, p, x, y, z) {
  try { sv.runCommandSilent('execute as ' + p.username + ' on vehicle run tp @s ' + x + ' ' + y + ' ' + z) } catch (e) {}
  try { var v = crVehicule(p); if (v) v.setDeltaMovement(0, 0, 0) } catch (e2) {}
}
function crTenter(sv, p) {
  var d = crCharger(sv), u = String(p.uuid), nom = String(p.username)
  if (d.anneaux.length < 2) return { ok: false, fr: "Le parcours n'est pas encore prêt.", en: 'The course is not ready yet.' }
  if (CR_COUREURS[u] || CR_ATTENTE[u]) return { ok: false, fr: 'Tu es déjà en course (/course abandon pour arrêter).', en: 'You are already racing (/course abandon to stop).' }
  var tag = 'cr_ep_' + u.substring(0, 8), T = CR_TENTER, pos = T.x + ' ' + T.y + ' ' + T.z
  try { sv.runCommandSilent('ride ' + nom + ' dismount') } catch (e0) {}
  sv.runCommandSilent('execute in ' + T.dim + ' run tp ' + nom + ' ' + pos)
  sv.runCommandSilent('execute in ' + T.dim + ' run summon ' + T.balai + ' ' + pos + ' {Tags:["' + tag + '"]}')
  sv.runCommandSilent('execute in ' + T.dim + ' run ride ' + nom + ' mount @e[type=' + T.balai + ',tag=' + tag + ',limit=1,sort=nearest]')
  sv.runCommandSilent('effect give ' + nom + ' minecraft:slow_falling 25 0 true')
  CR_ATTENTE[u] = { go: sv.tickCount + T.decompte * 20, tag: tag }
  console.info('[course] épreuve Vroom : ' + nom + ' téléporté sur un balai (' + pos + '), départ dans ' + T.decompte + ' s')
  CR_BALAIS[u] = { tag: tag, t0: sv.tickCount }
  return { ok: true }
}
function crRetirerBalaiEpreuve(sv, u) {
  var b = CR_BALAIS[u]; if (!b) return
  try { sv.runCommandSilent('kill @e[type=' + CR_TENTER.balai + ',tag=' + b.tag + ']') } catch (e) {}
  delete CR_BALAIS[u]
}
ServerEvents.tick(function (event) {
  var sv = event.server, tick = sv.tickCount
  try {
    for (var u in CR_ATTENTE) {
      var a = CR_ATTENTE[u], p = crJoueur(sv, u)
      if (!p || !crEstBalai(crVehicule(p))) { delete CR_ATTENTE[u]; if (p) crDire(p, 'Tu as quitté le balai : épreuve annulée.', 'You left the broom: trial cancelled.', 'red'); crRetirerBalaiEpreuve(sv, u); continue }
      var reste = a.go - tick
      if (reste > 0) crFiger(sv, p, CR_TENTER.x, CR_TENTER.y, CR_TENTER.z)   // pas de déplacement pendant le décompte
      if (reste > 0 && reste % 20 === 0) { try { sv.runCommandSilent('title ' + p.username + ' title {"text":"' + (reste / 20) + '","color":"yellow"}') } catch (e1) {} }
      if (reste <= 0) {
        delete CR_ATTENTE[u]
        CR_COUREURS[u] = { mode: 'solo', idx: 0, debut: tick, px: p.getX(), py: p.getY() + 0.8, pz: p.getZ(), nom: String(p.username) }
        try { sv.runCommandSilent('title ' + p.username + ' title {"text":"GO !","color":"green"}') } catch (e2) {}
        crDire(p, 'Traverse tous les anneaux, dans l\'ordre. Le chrono tourne !', 'Fly through every ring, in order. The clock is ticking!', 'green')
      }
    }
    if (tick % 20 === 0) {
      for (var u2 in CR_BALAIS) {
        var b = CR_BALAIS[u2], p2 = crJoueur(sv, u2)
        if (CR_ATTENTE[u2] || CR_COUREURS[u2] || tick - b.t0 < 100) continue
        if (!p2 || !crEstBalai(crVehicule(p2))) crRetirerBalaiEpreuve(sv, u2)   // course finie et joueur descendu : le balai de l'épreuve disparaît
      }
    }
  } catch (e) { if (!CR._err2) { CR._err2 = true; console.error('[course] épreuve : ' + e) } }
})

// PNJ « Professeur Vroom » : preset Easy NPC (professeur_vroom.npc.nbt), son bouton « Relever le défi » lance /course tenter_pour @initiator.

// ───────── Commandes ─────────
ServerEvents.commandRegistry(function (event) {
  var C = event.commands, A = event.arguments
  function prof(ctx, f) { if (!crProf(ctx)) return crRep(ctx, 'Réservé aux professeurs.', 'Teachers only.'); return f() }
  // incl : null = vertical ; nombre = inclinaison en degrés (0 debout, 90 à plat, 30 diagonal) ; 'regard' = perpendiculaire à la direction du regard
  function ajouter(ctx, rayon, incl) {
    return prof(ctx, function () {
      var p = ctx.source.player
      if (!p) return 0
      var sv = ctx.source.server, d = crCharger(sv)
      var ang = incl === 'regard' ? -(typeof eqPitch === 'function' ? eqPitch(p) : 0) : (incl === null || incl === undefined ? 0 : Number(incl))
      ang = Math.max(-90, Math.min(90, Math.round(ang)))
      d.anneaux.push({ x: Number(p.getX()), y: Number(p.getEyeY()), z: Number(p.getZ()), yaw: (typeof eqYaw === 'function' ? eqYaw(p) : 0), r: Math.max(1, Math.min(10, rayon)), incl: ang, plat: ang === 90, dim: eqDimId(p) })
      crSauver(sv)
      return crRep(ctx, 'Anneau ' + d.anneaux.length + ' posé (rayon ' + rayon + ', inclinaison ' + ang + '°).', 'Ring ' + d.anneaux.length + ' placed (radius ' + rayon + ', tilt ' + ang + '°).')
    })
  }
  // Options d'orientation ajoutées à un nœud : vertical | horizontal | incline <angle> | regard
  function opts(noeud, rayonDe) {
    return noeud
      .then(C.literal('vertical').executes(function (ctx) { return ajouter(ctx, rayonDe(ctx), 0) }))
      .then(C.literal('horizontal').executes(function (ctx) { return ajouter(ctx, rayonDe(ctx), 90) })
        .then(C.argument('penche', A.INTEGER.create(event)).executes(function (ctx) { return ajouter(ctx, rayonDe(ctx), 90 - A.INTEGER.getResult(ctx, 'penche')) })))
      .then(C.literal('regard').executes(function (ctx) { return ajouter(ctx, rayonDe(ctx), 'regard') }))
      .then(C.literal('incline').then(C.argument('angle', A.INTEGER.create(event)).executes(function (ctx) { return ajouter(ctx, rayonDe(ctx), A.INTEGER.getResult(ctx, 'angle')) })))
  }
  event.register(C.literal('course')
    .then(C.literal('anneau')
      .then(opts(C.literal('ajouter').executes(function (ctx) { return ajouter(ctx, CR.RAYON_DEFAUT, 0) }), function () { return CR.RAYON_DEFAUT })
        .then(opts(C.argument('rayon', A.FLOAT.create(event)).executes(function (ctx) { return ajouter(ctx, A.FLOAT.getResult(ctx, 'rayon'), 0) }), function (ctx) { return A.FLOAT.getResult(ctx, 'rayon') })))
      .then(C.literal('tourner').then(C.argument('angle', A.INTEGER.create(event)).executes(function (ctx) {
        return prof(ctx, function () {
          var sv = ctx.source.server, d = crCharger(sv)
          if (!d.anneaux.length) return crRep(ctx, 'Aucun anneau.', 'No ring.')
          var a = d.anneaux[d.anneaux.length - 1]
          a.yaw = Number(a.yaw) + A.INTEGER.getResult(ctx, 'angle'); crSauver(sv)
          return crRep(ctx, 'Anneau ' + d.anneaux.length + ' tourné de ' + A.INTEGER.getResult(ctx, 'angle') + '° (gauche/droite).', 'Ring ' + d.anneaux.length + ' turned by ' + A.INTEGER.getResult(ctx, 'angle') + '°.')
        })
      })))
      .then(C.literal('incliner').then(C.argument('angle', A.INTEGER.create(event)).executes(function (ctx) {
        return prof(ctx, function () {
          var sv = ctx.source.server, d = crCharger(sv)
          if (!d.anneaux.length) return crRep(ctx, 'Aucun anneau.', 'No ring.')
          var a = d.anneaux[d.anneaux.length - 1], ang = Math.max(-90, Math.min(90, A.INTEGER.getResult(ctx, 'angle')))
          a.incl = ang; a.plat = ang === 90; crSauver(sv)
          return crRep(ctx, 'Anneau ' + d.anneaux.length + ' : inclinaison ' + ang + '°.', 'Ring ' + d.anneaux.length + ': tilt ' + ang + '°.')
        })
      })))
      .then(C.literal('retirer').executes(function (ctx) {
        return prof(ctx, function () {
          var p = ctx.source.player, sv = ctx.source.server, d = crCharger(sv), best = -1, bd = 1e9
          if (!p) return 0
          for (var i = 0; i < d.anneaux.length; i++) { var a = d.anneaux[i], dd = Math.pow(a.x - p.getX(), 2) + Math.pow(a.y - p.getY(), 2) + Math.pow(a.z - p.getZ(), 2); if (dd < bd) { bd = dd; best = i } }
          if (best < 0 || bd > 400) return crRep(ctx, 'Aucun anneau à moins de 20 blocs.', 'No ring within 20 blocks.')
          d.anneaux.splice(best, 1); crSauver(sv)
          return crRep(ctx, 'Anneau ' + (best + 1) + ' retiré (les suivants sont renumérotés).', 'Ring ' + (best + 1) + ' removed (the next ones are renumbered).')
        })
      }))
      .then(C.literal('liste').executes(function (ctx) {
        var d = crCharger(ctx.source.server), l = []
        for (var i = 0; i < d.anneaux.length; i++) l.push((i + 1) + ': ' + Math.round(d.anneaux[i].x) + ' ' + Math.round(d.anneaux[i].y) + ' ' + Math.round(d.anneaux[i].z) + ' (r ' + d.anneaux[i].r + (crIncl(d.anneaux[i]) ? ', inclinaison ' + crIncl(d.anneaux[i]) + '°' : '') + ')')
        return crRep(ctx, (l.length ? l.join('\n') : 'Aucun anneau.') + '\nCircuit : ' + (d.boucle ? 'oui, ' + d.tours + ' tour(s)' : 'non'), (l.length ? l.join('\n') : 'No rings.') + '\nLoop: ' + (d.boucle ? 'yes, ' + d.tours + ' lap(s)' : 'no'))
      })))
    .then(C.literal('effacer').executes(function (ctx) {
      return prof(ctx, function () { var sv = ctx.source.server; crCharger(sv).anneaux = []; crSauver(sv); return crRep(ctx, 'Parcours effacé.', 'Course cleared.') })
    }))
    .then(C.literal('boucle')
      .then(C.literal('oui').executes(function (ctx) { return prof(ctx, function () { var sv = ctx.source.server; crCharger(sv).boucle = true; crSauver(sv); return crRep(ctx, 'Circuit : chaque tour repasse par l\'anneau 1.', 'Loop: each lap goes back through ring 1.') }) }))
      .then(C.literal('non').executes(function (ctx) { return prof(ctx, function () { var sv = ctx.source.server; crCharger(sv).boucle = false; crSauver(sv); return crRep(ctx, 'Parcours simple : du premier au dernier anneau.', 'Point-to-point: from the first to the last ring.') }) })))
    .then(C.literal('tours').then(C.argument('n', A.INTEGER.create(event)).executes(function (ctx) {
      return prof(ctx, function () { var sv = ctx.source.server, n = Math.max(1, Math.min(10, A.INTEGER.getResult(ctx, 'n'))); crCharger(sv).tours = n; crSauver(sv); return crRep(ctx, 'Tours : ' + n + '.', 'Laps: ' + n + '.') })
    })))
    .then(C.literal('solo').executes(function (ctx) {
      var p = ctx.source.player, sv = ctx.source.server, d = crCharger(sv)
      if (!p) return 0
      if (d.anneaux.length < 2) return crRep(ctx, "Le parcours n'est pas encore prêt.", 'The course is not ready yet.')
      if (CR_COUREURS[String(p.uuid)]) return crRep(ctx, 'Tu es déjà en course (/course abandon pour arrêter).', 'You are already racing (/course abandon to stop).')
      if (!crEstBalai(crVehicule(p))) return crRep(ctx, 'Monte sur ton balai d\'abord.', 'Get on your broom first.')
      var a = d.anneaux[0]
      if (a.dim !== eqDimId(p) || Math.pow(a.x - p.getX(), 2) + Math.pow(a.z - p.getZ(), 2) > CR.DEPART_MAX * CR.DEPART_MAX) return crRep(ctx, "Approche-toi de l'anneau de départ (moins de " + CR.DEPART_MAX + ' blocs).', 'Get closer to the start ring (within ' + CR.DEPART_MAX + ' blocks).')
      CR_COUREURS[String(p.uuid)] = { mode: 'solo', idx: 0, debut: -1, px: p.getX(), py: p.getY() + 0.8, pz: p.getZ(), nom: String(p.username) }
      return crRep(ctx, "Contre-la-montre ! Le chrono part quand tu franchis l'anneau 1 (en vert).", 'Time trial! The clock starts when you cross ring 1 (in green).')
    }))
    .then(C.literal('tenter').executes(function (ctx) {
      var p = ctx.source.player, sv = ctx.source.server
      if (!p) return 0
      var r = crTenter(sv, p)
      if (!r.ok) return crRep(ctx, r.fr, r.en)
      return crRep(ctx, 'Bonne chance ! Départ dans ' + CR_TENTER.decompte + ' secondes. Reste sur ton balai !', 'Good luck! Start in ' + CR_TENTER.decompte + ' seconds. Stay on your broom!')
    }))
    .then(C.literal('tenter_pour').requires(function (src) {
      try { if (src.hasPermission(2)) return true } catch (e) {}
      try { var ent = src.entity; return !!ent && String(ent.type).indexOf('easy_npc:') === 0 } catch (e2) { return false }
    })
      .then(C.argument('joueur', A.PLAYER.create(event)).executes(function (ctx) {
        var p = A.PLAYER.getResult(ctx, 'joueur'), sv = ctx.source.server
        console.info('[course] tenter_pour : ' + String(p.username))
        var r = crTenter(sv, p)
        if (!r.ok) { crDire(p, r.fr, r.en, 'red'); return 0 }
        crDire(p, 'Bonne chance ! Départ dans ' + CR_TENTER.decompte + ' secondes. Reste sur ton balai !', 'Good luck! Start in ' + CR_TENTER.decompte + ' seconds. Stay on your broom!', 'green')
        return 1
      })))
    .then(C.literal('abandon').executes(function (ctx) { var p = ctx.source.player; if (p) crAbandon(ctx.source.server, String(p.uuid)); return 1 }))
    .then(C.literal('inscriptions').executes(function (ctx) {
      return prof(ctx, function () {
        var sv = ctx.source.server
        if (crCharger(sv).anneaux.length < 2) return crRep(ctx, "Le parcours n'est pas encore prêt (2 anneaux minimum).", 'The course is not ready yet (at least 2 rings).')
        if (CR_GROUPE) return crRep(ctx, 'Une course groupée est déjà en cours.', 'A group race is already running.')
        CR_GROUPE = { etat: 'inscriptions', inscrits: [], arrivees: [], partants: [] }
        crAnnoncer(sv, 'Course de balai ! Les inscriptions sont ouvertes : tape /course rejoindre et rejoins la ligne de départ.', 'Broom race! Sign-ups are open: type /course rejoindre and head to the starting line.', 'gold')
        return 1
      })
    }))
    .then(C.literal('rejoindre').executes(function (ctx) {
      var p = ctx.source.player
      if (!p) return 0
      if (!CR_GROUPE || CR_GROUPE.etat !== 'inscriptions') return crRep(ctx, "Aucune inscription ouverte pour l'instant.", 'No sign-ups open right now.')
      if (CR_GROUPE.inscrits.indexOf(String(p.uuid)) === -1) CR_GROUPE.inscrits.push(String(p.uuid))
      delete CR_COUREURS[String(p.uuid)]
      return crRep(ctx, 'Inscrit ! Rejoins la ligne de départ sur ton balai.', 'Signed up! Go to the starting line on your broom.')
    }))
    .then(C.literal('lancer').executes(function (ctx) {
      return prof(ctx, function () {
        var sv = ctx.source.server
        if (!CR_GROUPE || CR_GROUPE.etat !== 'inscriptions') return crRep(ctx, "Ouvre d'abord les inscriptions (/course inscriptions).", 'Open sign-ups first (/course inscriptions).')
        if (!CR_GROUPE.inscrits.length) return crRep(ctx, 'Personne ne s\'est inscrit.', 'Nobody signed up.')
        CR_GROUPE.etat = 'decompte'; CR_GROUPE.go = sv.tickCount + 100
        crAnnoncer(sv, 'La course de balai commence ! (' + CR_GROUPE.inscrits.length + ' coureurs)', 'The broom race begins! (' + CR_GROUPE.inscrits.length + ' racers)', 'gold')
        return 1
      })
    }))
    .then(C.literal('arreter').executes(function (ctx) {
      return prof(ctx, function () { if (!CR_GROUPE) return crRep(ctx, 'Aucune course groupée en cours.', 'No group race running.'); crTerminerGroupe(ctx.source.server); return 1 })
    })))
})
