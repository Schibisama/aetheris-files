// Équipes d'élèves (2 ou 3 joueurs), points d'équipe, classements (permanent, trimestre, épreuve) et épreuves d'équipe.
//
// Joueurs :
//   /equipe creer <nom> <logo> <couleur>   crée une équipe (on en devient le premier membre)
//   /equipe logo <logo> <couleur>          change le logo et la couleur de son équipe
//   Logos et couleurs : voir EQ_LOGOS et EQ_COULEURS ci-dessous (police kubejs:equipes, une image blanche teintée par la couleur).
//   Dans la liste des joueurs (Tab), chaque joueur affiche le logo et le nom de son équipe, et les joueurs sont rangés par équipe (voir pseudo.js).
//   /equipe inviter <joueur>   invite un joueur (3 membres maximum)
//   /equipe rejoindre          accepte la dernière invitation reçue
//   /equipe quitter            quitte son équipe (délai avant d'en rejoindre une autre : EQ.DELAI_QUITTER_H heures)
//   /equipe info [nom]         membres et points        /equipe liste    toutes les équipes
//   /classement                classement permanent     /classement trimestre     /classement epreuve [n°]
//   /epreuve liste             épreuves en cours        /epreuve rendre           rend les objets d'une épreuve de collecte
// Professeurs et ops :
//   /points <équipe> <nombre> [raison]           donne ou retire des points (permanent + trimestre)
//   /epreuve lancer chasse <quantité> <points> [mob]       ex. /epreuve lancer chasse 50 30   ou   chasse 20 40 minecraft:zombie
//   /epreuve lancer boss <points> [mob]                    un boss de zone ou de la zone pirate (ou un boss précis)
//   /epreuve lancer collecte <objet> <quantité> <points>   ex. /epreuve lancer collecte minecraft:diamond 10 50
//   /epreuve recompense <n°> <objet> [nombre]              objet donné à chaque membre de l'équipe qui réussit
//   /epreuve fin <n°>          clôt l'épreuve (le classement de l'épreuve reste consultable)
//   /trimestre nouveau         annonce l'équipe championne du trimestre et remet les points du trimestre à zéro
//   /equipe dissoudre <équipe>     /equipe retirer <joueur>
//
// Coéquipiers : ils ne peuvent pas se blesser entre eux, sauf pendant un duel du Colisée qui les oppose.
// Règles des épreuves : seule une équipe d'au moins 2 membres peut y participer, et TOUS ses membres doivent être connectés
// et proches (EQ.RAYON blocs, même dimension ; EQ.RAYON_RENDRE pour rendre une collecte) au moment où l'action compte.
// Bonus : les 3 premières équipes à finir gagnent +30 %, +20 % et +10 % des points.

var EQ = {
  CLE: 'mcrp_equipes',
  MIN_MEMBRES: 2,
  MAX_MEMBRES: 3,
  RAYON: 64,
  RAYON_RENDRE: 10,
  DELAI_QUITTER_H: 72,
  BONUS: [0.3, 0.2, 0.1]
}
// 15 logos (caractères de la police kubejs:equipes) et 15 couleurs (couleurs du chat de Minecraft)
var EQ_LOGOS = ['bouclier', 'couronne', 'epee', 'etoile', 'lune', 'soleil', 'flamme', 'goutte', 'feuille', 'crane', 'oeil', 'aile', 'eclair', 'cle', 'serpent']
var EQ_COULEURS = { rouge_fonce: 'DARK_RED', rouge: 'RED', or: 'GOLD', jaune: 'YELLOW', vert: 'GREEN', vert_fonce: 'DARK_GREEN', cyan: 'AQUA', bleu_canard: 'DARK_AQUA',
  bleu: 'BLUE', bleu_nuit: 'DARK_BLUE', rose: 'LIGHT_PURPLE', violet: 'DARK_PURPLE', blanc: 'WHITE', gris: 'GRAY', gris_fonce: 'DARK_GRAY' }
var EQ_J = null
function eqJ() {
  if (!EQ_J) EQ_J = { C: Java.loadClass('net.minecraft.network.chat.Component'), Style: Java.loadClass('net.minecraft.network.chat.Style'),
    CF: Java.loadClass('net.minecraft.ChatFormatting'), RL: Java.loadClass('net.minecraft.resources.ResourceLocation') }
  return EQ_J
}
// Préfixe de la liste des joueurs : [logo coloré] Nom de l'équipe (coloré), ou null sans équipe
function eqPrefixeTab(joueur) {
  try {
    var serveur = joueur.server, slug = eqEquipeDe(serveur, joueur)
    if (!slug) return null
    var eq = eqCharger(serveur).equipes[slug], J = eqJ()
    var i = EQ_LOGOS.indexOf(eq.logo); if (i < 0) i = 0
    var cf = J.CF.valueOf(EQ_COULEURS[eq.couleur] || 'WHITE')
    var logo = J.C.literal(String.fromCharCode(0xE100 + i)).setStyle(J.Style.EMPTY.withFont(J.RL.parse('kubejs:equipes')).withColor(cf))
    return J.C.empty().append(logo).append(J.C.literal(' '))
  } catch (e) { return null }
}
// Logo seul (couleur de l'équipe) + espace, pour le nom au-dessus de la tête, ou null sans équipe
function eqLogoSeul(joueur) {
  try {
    var serveur = joueur.server, slug = eqEquipeDe(serveur, joueur)
    if (!slug) return null
    var eq = eqCharger(serveur).equipes[slug], J = eqJ()
    var i = EQ_LOGOS.indexOf(eq.logo); if (i < 0) i = 0
    var cf = J.CF.valueOf(EQ_COULEURS[eq.couleur] || 'WHITE')
    var logo = J.C.literal(String.fromCharCode(0xE100 + i)).setStyle(J.Style.EMPTY.withFont(J.RL.parse('kubejs:equipes')).withColor(cf))
    return J.C.empty().append(logo).append(J.C.literal(' ' + eq.nom + ' ').withStyle(cf))
  } catch (e) { return null }
}
// Clé de tri de la liste des joueurs (ordre de création de l'équipe), ou null sans équipe
function eqOrdreTab(joueur) {
  try {
    var serveur = joueur.server, slug = eqEquipeDe(serveur, joueur)
    if (!slug) return null
    var o = eqCharger(serveur).equipes[slug].ordre || 0
    return ('00' + o.toString(36)).slice(-2)
  } catch (e) { return null }
}
// Met à jour le nom (Tab) et le rangement des membres connectés d'une équipe
function eqRafraichir(serveur, uuids) {
  for (var i = 0; i < uuids.length; i++) {
    try {
      var p = serveur.getPlayerList().getPlayer(EQ_UUID.fromString(uuids[i]))
      if (p && typeof psSync === 'function') psSync(serveur, p)
    } catch (e) {}
  }
}
function eqLireLogoCouleur(logo, couleur) {
  logo = eqSlug(logo || ''); couleur = eqSlug(couleur || '')
  if (EQ_LOGOS.indexOf(logo) < 0 || !EQ_COULEURS[couleur]) return null
  return { logo: logo, couleur: couleur }
}
var EQ_AIDE_LOGO_FR = 'Logos : ' + EQ_LOGOS.join(', ') + '. Couleurs : ' + Object.keys(EQ_COULEURS).join(', ') + '.'
var EQ_AIDE_LOGO_EN = 'Logos: ' + EQ_LOGOS.join(', ') + '. Colors: ' + Object.keys(EQ_COULEURS).join(', ') + '.'

var EQ_DATA = null
var EQ_UUID = Java.loadClass('java.util.UUID')
var EQ_INVIT = {}   // uuid invité -> slug de l'équipe

// ───────── Données ─────────
function eqCharger(serveur) {
  if (EQ_DATA) return EQ_DATA
  try {
    var brut = String(serveur.persistentData.getString(EQ.CLE) || '')
    EQ_DATA = brut ? JSON.parse(brut) : null
  } catch (e) { console.error('[equipes] lecture : ' + e); EQ_DATA = null }
  if (!EQ_DATA) EQ_DATA = {}
  if (!EQ_DATA.equipes) EQ_DATA.equipes = {}
  if (!EQ_DATA.epreuves) EQ_DATA.epreuves = []
  if (!EQ_DATA.prochain) EQ_DATA.prochain = 1
  if (!EQ_DATA.ordre) EQ_DATA.ordre = 1
  if (!EQ_DATA.trimestre) EQ_DATA.trimestre = { num: 1, debut: Date.now(), historique: [] }
  return EQ_DATA
}
var EQ_SALE = true   // tableaux à redessiner
function eqSauver(serveur) {
  EQ_SALE = true
  try { serveur.persistentData.putString(EQ.CLE, JSON.stringify(EQ_DATA)) } catch (e) { console.error('[equipes] sauvegarde : ' + e) }
}
function eqSlug(nom) {
  var s = String(nom).toLowerCase(), de = 'éèêëàâäîïôöùûüçœ', vers = 'eeeeaaaiioouuuco', r = ''
  for (var i = 0; i < s.length; i++) { var k = de.indexOf(s.charAt(i)); r += k >= 0 ? vers.charAt(k) : s.charAt(i) }
  return r.replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, '')
}
function eqUuid(j) { return String(j.uuid) }
function eqEquipeDe(serveur, joueur) {
  var d = eqCharger(serveur), u = eqUuid(joueur)
  for (var s in d.equipes) if (d.equipes[s].membres.indexOf(u) !== -1) return s
  return null
}

// ───────── Langue et messages ─────────
function eqEn(joueur) {
  try { return String(joueur.clientInformation().language()).toLowerCase().indexOf('fr') !== 0 } catch (e) { return false }
}
function eqDire(joueur, fr, en, couleur) {
  try { var t = Text.of(eqEn(joueur) ? en : fr), m = { gold: 'gold', aqua: 'aqua', green: 'green', red: 'red', gray: 'gray', light_purple: 'lightPurple' }[couleur || 'gold'] || 'gold'; joueur.tell(t[m]()) } catch (e) {}
}
function eqAnnoncer(serveur, fr, en, couleur) {
  var js = serveur.players
  for (var i = 0; i < js.length; i++) eqDire(js[i], fr, en, couleur)
  console.info('[equipes] ' + fr)
}
function eqRepondre(ctx, fr, en) {
  var p = ctx.source.player
  if (p) eqDire(p, fr, en); else console.info('[equipes] ' + fr)
  return 1
}
function eqProf(ctx) {
  try { if (typeof profOuOp === 'function') return profOuOp(ctx.source) } catch (e) {}
  try { return ctx.source.hasPermission(2) } catch (e2) { return false }
}

// ───────── Équipe complète et proche ─────────
// Retourne les membres connectés si TOUS les membres sont connectés et à moins de rayon blocs de « centre » (même dimension), sinon null.
function eqEquipeComplete(serveur, slug, centre, rayon) {
  var eq = eqCharger(serveur).equipes[slug]
  if (!eq || eq.membres.length < EQ.MIN_MEMBRES) return null
  var presents = []
  for (var i = 0; i < eq.membres.length; i++) {
    var p = null
    try { p = serveur.getPlayerList().getPlayer(EQ_UUID.fromString(eq.membres[i])) } catch (e) {}
    if (!p || !p.isAlive()) return null
    try {
      if (String(p.level().dimension().location()) !== String(centre.level().dimension().location())) return null
      if (p.distanceToSqr(centre) > rayon * rayon) return null
    } catch (e2) { return null }
    presents.push(p)
  }
  return presents
}

// ───────── Points ─────────
function eqAjouterPoints(serveur, slug, n) {
  var eq = eqCharger(serveur).equipes[slug]
  if (!eq) return
  eq.total = (eq.total || 0) + n
  eq.trimestre = (eq.trimestre || 0) + n
}
function eqClassement(liste, champ) {
  return liste.slice().sort(function (a, b) { return (b[champ] || 0) - (a[champ] || 0) })
}

// ───────── Épreuves ─────────
function eqEpreuve(serveur, id) {
  var d = eqCharger(serveur)
  for (var i = 0; i < d.epreuves.length; i++) if (d.epreuves[i].id === id) return d.epreuves[i]
  return null
}
function eqDescEpreuve(ep, en) {
  var mob = ep.cible ? ' (' + ep.cible + ')' : ''
  if (ep.type === 'chasse') return en ? 'Hunt: kill ' + ep.quantite + ' monsters' + mob : 'Chasse : tuer ' + ep.quantite + ' monstres' + mob
  if (ep.type === 'boss') return en ? 'Boss: defeat a zone boss' + mob : 'Boss : vaincre un boss de zone' + mob
  return en ? 'Collection: bring ' + ep.quantite + ' × ' + ep.cible : 'Collecte : rapporter ' + ep.quantite + ' × ' + ep.cible
}
// Fait avancer l'épreuve ep pour l'équipe slug ; termine si l'objectif est atteint.
function eqProgres(serveur, ep, slug, n, presents) {
  if (!ep.actif) return
  for (var f = 0; f < ep.finis.length; f++) if (ep.finis[f].slug === slug) return
  ep.prog[slug] = Math.min(ep.quantite, (ep.prog[slug] || 0) + n)
  var eq = eqCharger(serveur).equipes[slug]
  if (ep.prog[slug] < ep.quantite) {
    for (var i = 0; i < presents.length; i++) {
      try { presents[i].setStatusMessage(Text.of((eqEn(presents[i]) ? 'Trial #' + ep.id + ': ' : 'Épreuve n°' + ep.id + ' : ') + ep.prog[slug] + ' / ' + ep.quantite).gold()) } catch (e) {}
    }
    eqSauver(serveur)
    return
  }
  var rang = ep.finis.length
  var pts = Math.round(ep.points * (1 + (EQ.BONUS[rang] || 0)))
  ep.finis.push({ slug: slug, t: Date.now(), pts: pts })
  eqAjouterPoints(serveur, slug, pts)
  if (ep.recompense) {
    for (var k = 0; k < presents.length; k++) { try { presents[k].give(Item.of(ep.recompense.id, ep.recompense.n)) } catch (e3) {} }
  }
  eqSauver(serveur)
  eqAnnoncer(serveur,
    "L'équipe " + eq.nom + ' réussit l\'épreuve n°' + ep.id + ' (' + (rang + 1) + (rang === 0 ? 're' : 'e') + ') : +' + pts + ' points !',
    'Team ' + eq.nom + ' completes trial #' + ep.id + ' (#' + (rang + 1) + '): +' + pts + ' points!', 'gold')
}
function eqEpreuvesActives(serveur, type) {
  var d = eqCharger(serveur), r = []
  for (var i = 0; i < d.epreuves.length; i++) if (d.epreuves[i].actif && d.epreuves[i].type === type) r.push(d.epreuves[i])
  return r
}

EntityEvents.death(function (event) {
  try {
    var mort = event.entity
    var src = event.source
    var tueur = src ? src.player : null
    if (!tueur) return
    var serveur = tueur.server
    var slug = eqEquipeDe(serveur, tueur)
    if (!slug) return
    var type = String(mort.type)
    var estBoss = false
    try { estBoss = mort.tags.contains('boss_zone') || mort.tags.contains('pirate_zone') } catch (e) {}
    var estMonstre = false
    try { estMonstre = String(mort.getType().getCategory().getName()) === 'monster' } catch (e2) {}
    var chasses = estMonstre ? eqEpreuvesActives(serveur, 'chasse') : []
    var boss = estBoss ? eqEpreuvesActives(serveur, 'boss') : []
    if (!chasses.length && !boss.length) return
    var presents = eqEquipeComplete(serveur, slug, tueur, EQ.RAYON)
    if (!presents) return
    for (var i = 0; i < chasses.length; i++) if (!chasses[i].cible || chasses[i].cible === type) eqProgres(serveur, chasses[i], slug, 1, presents)
    for (var j = 0; j < boss.length; j++) if (!boss[j].cible || boss[j].cible === type) eqProgres(serveur, boss[j], slug, 1, presents)
  } catch (e) { console.error('[equipes] mort : ' + e) }
})

// ───────── Pas de dégâts entre coéquipiers ─────────
// Un membre d'une équipe ne peut pas blesser un autre membre de la même équipe (coups, flèches, sorts, invocations, familiers),
// sauf pendant un duel du Colisée qui les oppose (colisee_duel.js).
function eqAuteurJoueur(src) {
  var a = null
  try { a = src.getEntity() } catch (e) {}
  if (!a) return null
  try { if (a.isPlayer()) return a } catch (e1) {}
  try { if (typeof a.getSummoner === 'function') { var s1 = a.getSummoner(); if (s1 && s1.isPlayer()) return s1 } } catch (e2) {}
  try { if (typeof a.getOwner === 'function') { var o = a.getOwner(); if (o && o.isPlayer && o.isPlayer()) return o } } catch (e3) {}
  return null
}
try {
  NativeEvents.onEvent(Java.loadClass('net.neoforged.neoforge.event.entity.living.LivingIncomingDamageEvent'), function (event) {
    try {
      var cible = event.getEntity()
      if (!cible || !cible.isPlayer()) return
      var att = eqAuteurJoueur(event.getSource())
      if (!att || String(att.uuid) === String(cible.uuid)) return
      var serveur = cible.server
      var slug = eqEquipeDe(serveur, cible)
      if (!slug || eqEquipeDe(serveur, att) !== slug) return
      // duel du Colisée entre ces deux joueurs : autorisé
      try { if (typeof duEstDuelliste === 'function' && duEstDuelliste(att.username) && duAdversaire(att.username) === String(cible.username)) return } catch (eD) {}
      event.setCanceled(true)
    } catch (err) {}
  })
} catch (e) { console.error('[equipes] protection entre coéquipiers indisponible : ' + e) }

// ───────── Commandes ─────────
function eqCmdCreer(ctx, texte) {
  var p = ctx.source.player
  if (!p) return 0
  var serveur = ctx.source.server, d = eqCharger(serveur)
  var mots = String(texte).replace(/§./g, '').replace(/\s+/g, ' ').trim().split(' ')
  if (mots.length < 3) return eqRepondre(ctx, 'Usage : /equipe creer <nom> <logo> <couleur>. ' + EQ_AIDE_LOGO_FR, 'Usage: /equipe creer <name> <logo> <color>. ' + EQ_AIDE_LOGO_EN)
  var lc = eqLireLogoCouleur(mots[mots.length - 2], mots[mots.length - 1])
  if (!lc) return eqRepondre(ctx, 'Logo ou couleur inconnu. ' + EQ_AIDE_LOGO_FR, 'Unknown logo or color. ' + EQ_AIDE_LOGO_EN)
  var nom = mots.slice(0, mots.length - 2).join(' ')
  var slug = eqSlug(nom)
  if (nom.length < 3 || nom.length > 20 || !slug) return eqRepondre(ctx, "Le nom de l'équipe doit faire entre 3 et 20 caractères.", 'The team name must be 3 to 20 characters long.')
  if (eqEquipeDe(serveur, p)) return eqRepondre(ctx, 'Tu fais déjà partie d\'une équipe.', 'You are already in a team.')
  if (d.equipes[slug]) return eqRepondre(ctx, 'Ce nom d\'équipe est déjà pris.', 'This team name is already taken.')
  var quit = 0
  try { quit = Number(p.persistentData.getLong('eq_quit')) } catch (e) {}
  var reste = quit + EQ.DELAI_QUITTER_H * 3600000 - Date.now()
  if (reste > 0) { var h = Math.ceil(reste / 3600000); return eqRepondre(ctx, 'Tu as quitté une équipe récemment : attends encore ' + h + ' h.', 'You left a team recently: wait ' + h + ' more hours.') }
  var noms = {}; noms[eqUuid(p)] = String(p.username)
  d.equipes[slug] = { nom: nom, membres: [eqUuid(p)], noms: noms, total: 0, trimestre: 0, cree: Date.now(), logo: lc.logo, couleur: lc.couleur, ordre: d.ordre++ }
  eqSauver(serveur)
  eqRafraichir(serveur, [eqUuid(p)])
  eqAnnoncer(serveur, String(p.username) + " fonde l'équipe " + nom + ' !', String(p.username) + ' founds team ' + nom + '!', 'aqua')
  return 1
}
function eqCmdLogo(ctx, texte) {
  var p = ctx.source.player
  if (!p) return 0
  var serveur = ctx.source.server, slug = eqEquipeDe(serveur, p)
  if (!slug) return eqRepondre(ctx, "Tu n'as pas d'équipe.", 'You have no team.')
  var mots = String(texte).trim().split(/\s+/), lc = eqLireLogoCouleur(mots[0], mots[1])
  if (!lc) return eqRepondre(ctx, 'Usage : /equipe logo <logo> <couleur>. ' + EQ_AIDE_LOGO_FR, 'Usage: /equipe logo <logo> <color>. ' + EQ_AIDE_LOGO_EN)
  var eq = eqCharger(serveur).equipes[slug]
  eq.logo = lc.logo; eq.couleur = lc.couleur
  eqSauver(serveur)
  eqRafraichir(serveur, eq.membres)
  return eqRepondre(ctx, "Nouveau logo de l'équipe : " + lc.logo + ' ' + lc.couleur + '.', 'New team logo: ' + lc.logo + ' ' + lc.couleur + '.')
}
function eqCmdInviter(ctx, cible) {
  var p = ctx.source.player
  if (!p) return 0
  var serveur = ctx.source.server, slug = eqEquipeDe(serveur, p)
  if (!slug) return eqRepondre(ctx, "Tu n'as pas d'équipe. Crée-la avec /equipe creer <nom>.", "You have no team. Create one with /equipe creer <name>.")
  var eq = eqCharger(serveur).equipes[slug]
  if (eq.membres.length >= EQ.MAX_MEMBRES) return eqRepondre(ctx, 'Ton équipe est déjà complète (' + EQ.MAX_MEMBRES + ' membres).', 'Your team is already full (' + EQ.MAX_MEMBRES + ' members).')
  if (eqEquipeDe(serveur, cible)) return eqRepondre(ctx, String(cible.username) + ' fait déjà partie d\'une équipe.', String(cible.username) + ' is already in a team.')
  EQ_INVIT[eqUuid(cible)] = slug
  eqDire(cible, String(p.username) + " t'invite dans l'équipe " + eq.nom + '. Tape /equipe rejoindre pour accepter.', String(p.username) + ' invites you to team ' + eq.nom + '. Type /equipe rejoindre to accept.', 'aqua')
  return eqRepondre(ctx, 'Invitation envoyée à ' + String(cible.username) + '.', 'Invitation sent to ' + String(cible.username) + '.')
}
function eqCmdRejoindre(ctx) {
  var p = ctx.source.player
  if (!p) return 0
  var serveur = ctx.source.server, d = eqCharger(serveur), slug = EQ_INVIT[eqUuid(p)]
  if (!slug || !d.equipes[slug]) return eqRepondre(ctx, "Tu n'as aucune invitation en attente.", 'You have no pending invitation.')
  if (eqEquipeDe(serveur, p)) return eqRepondre(ctx, 'Tu fais déjà partie d\'une équipe.', 'You are already in a team.')
  var quit = 0
  try { quit = Number(p.persistentData.getLong('eq_quit')) } catch (e) {}
  var reste = quit + EQ.DELAI_QUITTER_H * 3600000 - Date.now()
  if (reste > 0) { var h = Math.ceil(reste / 3600000); return eqRepondre(ctx, 'Tu as quitté une équipe récemment : attends encore ' + h + ' h.', 'You left a team recently: wait ' + h + ' more hours.') }
  var eq = d.equipes[slug]
  if (eq.membres.length >= EQ.MAX_MEMBRES) return eqRepondre(ctx, 'Cette équipe est déjà complète.', 'This team is already full.')
  eq.membres.push(eqUuid(p)); eq.noms[eqUuid(p)] = String(p.username)
  delete EQ_INVIT[eqUuid(p)]
  eqSauver(serveur)
  eqRafraichir(serveur, [eqUuid(p)])
  eqAnnoncer(serveur, String(p.username) + " rejoint l'équipe " + eq.nom + '.', String(p.username) + ' joins team ' + eq.nom + '.', 'aqua')
  return 1
}
function eqRetirerMembre(serveur, slug, uuid, nom) {
  var d = eqCharger(serveur), eq = d.equipes[slug]
  eq.membres.splice(eq.membres.indexOf(uuid), 1)
  delete eq.noms[uuid]
  eqSauver(serveur)
  eqRafraichir(serveur, [uuid])
  if (!eq.membres.length) {
    delete d.equipes[slug]
    eqAnnoncer(serveur, "L'équipe " + eq.nom + ' est dissoute.', 'Team ' + eq.nom + ' has been disbanded.', 'gray')
  } else {
    eqAnnoncer(serveur, nom + " quitte l'équipe " + eq.nom + '.', nom + ' leaves team ' + eq.nom + '.', 'gray')
  }
  eqSauver(serveur)
}
function eqCmdQuitter(ctx) {
  var p = ctx.source.player
  if (!p) return 0
  var serveur = ctx.source.server, slug = eqEquipeDe(serveur, p)
  if (!slug) return eqRepondre(ctx, "Tu n'as pas d'équipe.", 'You have no team.')
  try { p.persistentData.putLong('eq_quit', Date.now()) } catch (e) {}
  eqRetirerMembre(serveur, slug, eqUuid(p), String(p.username))
  return 1
}
function eqCmdInfo(ctx, nom) {
  var serveur = ctx.source.server, d = eqCharger(serveur), p = ctx.source.player
  var slug = nom ? eqSlug(nom) : (p ? eqEquipeDe(serveur, p) : null)
  var eq = slug ? d.equipes[slug] : null
  if (!eq) return eqRepondre(ctx, 'Équipe introuvable.', 'Team not found.')
  var noms = []
  for (var i = 0; i < eq.membres.length; i++) noms.push(eq.noms[eq.membres[i]] || '?')
  return eqRepondre(ctx,
    eq.nom + ' [' + slug + '] : ' + noms.join(', ') + ' — ' + (eq.total || 0) + ' points (trimestre : ' + (eq.trimestre || 0) + ')',
    eq.nom + ' [' + slug + ']: ' + noms.join(', ') + ' — ' + (eq.total || 0) + ' points (term: ' + (eq.trimestre || 0) + ')')
}
function eqListe(serveur) {
  var d = eqCharger(serveur), l = []
  for (var s in d.equipes) { var e = d.equipes[s]; l.push({ slug: s, nom: e.nom, total: e.total || 0, trimestre: e.trimestre || 0, n: e.membres.length }) }
  return l
}
function eqCmdListe(ctx) {
  var l = eqListe(ctx.source.server)
  if (!l.length) return eqRepondre(ctx, "Aucune équipe pour l'instant.", 'No teams yet.')
  var t = []
  for (var i = 0; i < l.length; i++) t.push(l[i].nom + ' [' + l[i].slug + '] (' + l[i].n + '/' + EQ.MAX_MEMBRES + ')')
  return eqRepondre(ctx, 'Équipes : ' + t.join(' · '), 'Teams: ' + t.join(' · '))
}
function eqCmdClassement(ctx, quoi, arg) {
  var serveur = ctx.source.server, d = eqCharger(serveur)
  var lignesFr = [], lignesEn = []
  if (quoi === 'epreuve') {
    var ep = null
    if (arg) ep = eqEpreuve(serveur, parseInt(arg, 10))
    else for (var k = d.epreuves.length - 1; k >= 0 && !ep; k--) ep = d.epreuves[k]
    if (!ep) return eqRepondre(ctx, 'Épreuve introuvable.', 'Trial not found.')
    lignesFr.push('— Épreuve n°' + ep.id + ' (' + eqDescEpreuve(ep, false) + ')' + (ep.actif ? '' : ' [terminée]') + ' —')
    lignesEn.push('— Trial #' + ep.id + ' (' + eqDescEpreuve(ep, true) + ')' + (ep.actif ? '' : ' [ended]') + ' —')
    var vus = {}
    for (var f = 0; f < ep.finis.length; f++) {
      var e1 = d.equipes[ep.finis[f].slug], n1 = e1 ? e1.nom : ep.finis[f].slug
      vus[ep.finis[f].slug] = true
      lignesFr.push((f + 1) + '. ' + n1 + ' — réussie (+' + ep.finis[f].pts + ' pts)')
      lignesEn.push((f + 1) + '. ' + n1 + ' — completed (+' + ep.finis[f].pts + ' pts)')
    }
    var enCours = []
    for (var s in ep.prog) if (!vus[s]) enCours.push({ slug: s, n: ep.prog[s] })
    enCours.sort(function (a, b) { return b.n - a.n })
    for (var c = 0; c < enCours.length; c++) {
      var e2 = d.equipes[enCours[c].slug], n2 = e2 ? e2.nom : enCours[c].slug
      lignesFr.push('· ' + n2 + ' — ' + enCours[c].n + ' / ' + ep.quantite)
      lignesEn.push('· ' + n2 + ' — ' + enCours[c].n + ' / ' + ep.quantite)
    }
  } else {
    var champ = quoi === 'trimestre' ? 'trimestre' : 'total'
    var l = eqClassement(eqListe(serveur), champ)
    lignesFr.push(champ === 'total' ? '— Classement général —' : '— Classement du trimestre ' + d.trimestre.num + ' —')
    lignesEn.push(champ === 'total' ? '— Overall ranking —' : '— Term ' + d.trimestre.num + ' ranking —')
    for (var i = 0; i < l.length && i < 15; i++) {
      lignesFr.push((i + 1) + '. ' + l[i].nom + ' — ' + l[i][champ] + ' pts')
      lignesEn.push((i + 1) + '. ' + l[i].nom + ' — ' + l[i][champ] + ' pts')
    }
  }
  if (lignesFr.length === 1) { lignesFr.push('(vide)'); lignesEn.push('(empty)') }
  return eqRepondre(ctx, lignesFr.join('\n'), lignesEn.join('\n'))
}
function eqCmdPoints(ctx, texte) {
  if (!eqProf(ctx)) return eqRepondre(ctx, 'Réservé aux professeurs.', 'Teachers only.')
  var m = String(texte).trim().match(/^(\S+)\s+(-?\d+)\s*(.*)$/)
  if (!m) return eqRepondre(ctx, 'Usage : /points <équipe> <nombre> [raison]', 'Usage: /points <team> <amount> [reason]')
  var serveur = ctx.source.server, slug = eqSlug(m[1]), eq = eqCharger(serveur).equipes[slug]
  if (!eq) return eqRepondre(ctx, 'Équipe introuvable (voir /equipe liste).', 'Team not found (see /equipe liste).')
  var n = parseInt(m[2], 10), raison = m[3] ? ' (' + m[3] + ')' : ''
  eqAjouterPoints(serveur, slug, n)
  eqSauver(serveur)
  var signe = n >= 0 ? '+' : ''
  eqAnnoncer(serveur, "L'équipe " + eq.nom + ' : ' + signe + n + ' points' + raison + '.', 'Team ' + eq.nom + ': ' + signe + n + ' points' + raison + '.', n >= 0 ? 'green' : 'red')
  return 1
}
function eqCmdLancer(ctx, texte) {
  if (!eqProf(ctx)) return eqRepondre(ctx, 'Réservé aux professeurs.', 'Teachers only.')
  var t = String(texte).trim().split(/\s+/), type = (t[0] || '').toLowerCase()
  var ep = { id: 0, type: type, cible: null, quantite: 1, points: 0, recompense: null, actif: true, debut: Date.now(), prog: {}, finis: [] }
  if (type === 'chasse' && t.length >= 3) { ep.quantite = parseInt(t[1], 10); ep.points = parseInt(t[2], 10); ep.cible = t[3] || null }
  else if (type === 'boss' && t.length >= 2) { ep.points = parseInt(t[1], 10); ep.cible = t[2] || null }
  else if (type === 'collecte' && t.length >= 4) { ep.cible = t[1]; ep.quantite = parseInt(t[2], 10); ep.points = parseInt(t[3], 10) }
  else return eqRepondre(ctx, 'Usage : /epreuve lancer chasse <quantité> <points> [mob] | boss <points> [mob] | collecte <objet> <quantité> <points>',
    'Usage: /epreuve lancer chasse <amount> <points> [mob] | boss <points> [mob] | collecte <item> <amount> <points>')
  if (!(ep.quantite > 0) || isNaN(ep.points)) return eqRepondre(ctx, 'Quantité ou points invalides.', 'Invalid amount or points.')
  if (ep.cible && ep.cible.indexOf(':') === -1) ep.cible = 'minecraft:' + ep.cible
  if (type === 'collecte') { try { if (Item.of(ep.cible).isEmpty()) throw 'vide' } catch (e) { return eqRepondre(ctx, 'Objet inconnu : ' + ep.cible, 'Unknown item: ' + ep.cible) } }
  var serveur = ctx.source.server, d = eqCharger(serveur)
  ep.id = d.prochain++
  d.epreuves.push(ep)
  eqSauver(serveur)
  var cmdFr = type === 'collecte' ? ' Rapportez les objets avec /epreuve rendre, toute l\'équipe réunie.' : ' Toute l\'équipe doit être réunie.'
  var cmdEn = type === 'collecte' ? ' Bring the items with /epreuve rendre, with the whole team together.' : ' The whole team must be together.'
  eqAnnoncer(serveur, 'Nouvelle épreuve d\'équipe n°' + ep.id + ' — ' + eqDescEpreuve(ep, false) + ' — ' + ep.points + ' points.' + cmdFr,
    'New team trial #' + ep.id + ' — ' + eqDescEpreuve(ep, true) + ' — ' + ep.points + ' points.' + cmdEn, 'light_purple')
  return 1
}
function eqCmdRecompense(ctx, texte) {
  if (!eqProf(ctx)) return eqRepondre(ctx, 'Réservé aux professeurs.', 'Teachers only.')
  var t = String(texte).trim().split(/\s+/), ep = eqEpreuve(ctx.source.server, parseInt(t[0], 10))
  if (!ep || !t[1]) return eqRepondre(ctx, 'Usage : /epreuve recompense <n°> <objet> [nombre]', 'Usage: /epreuve recompense <#> <item> [count]')
  var id = t[1].indexOf(':') === -1 ? 'minecraft:' + t[1] : t[1]
  try { if (Item.of(id).isEmpty()) throw 'vide' } catch (e) { return eqRepondre(ctx, 'Objet inconnu : ' + id, 'Unknown item: ' + id) }
  ep.recompense = { id: id, n: Math.max(1, parseInt(t[2] || '1', 10) || 1) }
  eqSauver(ctx.source.server)
  return eqRepondre(ctx, 'Épreuve n°' + ep.id + ' : chaque membre recevra ' + ep.recompense.n + ' × ' + id + '.', 'Trial #' + ep.id + ': each member will receive ' + ep.recompense.n + ' × ' + id + '.')
}
function eqCmdFin(ctx, texte) {
  if (!eqProf(ctx)) return eqRepondre(ctx, 'Réservé aux professeurs.', 'Teachers only.')
  var serveur = ctx.source.server, ep = eqEpreuve(serveur, parseInt(String(texte).trim(), 10))
  if (!ep) return eqRepondre(ctx, 'Épreuve introuvable.', 'Trial not found.')
  ep.actif = false
  eqSauver(serveur)
  eqAnnoncer(serveur, "L'épreuve n°" + ep.id + ' est terminée. Classement : /classement epreuve ' + ep.id, 'Trial #' + ep.id + ' is over. Ranking: /classement epreuve ' + ep.id, 'light_purple')
  return 1
}
function eqCmdEpreuves(ctx) {
  var d = eqCharger(ctx.source.server), fr = [], en = []
  for (var i = 0; i < d.epreuves.length; i++) {
    var ep = d.epreuves[i]
    if (!ep.actif) continue
    var rec = ep.recompense ? ' + ' + ep.recompense.n + ' × ' + ep.recompense.id : ''
    fr.push('n°' + ep.id + ' — ' + eqDescEpreuve(ep, false) + ' — ' + ep.points + ' pts' + rec)
    en.push('#' + ep.id + ' — ' + eqDescEpreuve(ep, true) + ' — ' + ep.points + ' pts' + rec)
  }
  if (!fr.length) return eqRepondre(ctx, "Aucune épreuve en cours.", 'No trial in progress.')
  return eqRepondre(ctx, fr.join('\n'), en.join('\n'))
}
function eqCmdRendre(ctx) {
  var p = ctx.source.player
  if (!p) return 0
  var serveur = ctx.source.server, slug = eqEquipeDe(serveur, p)
  if (!slug) return eqRepondre(ctx, "Tu n'as pas d'équipe.", 'You have no team.')
  var eps = eqEpreuvesActives(serveur, 'collecte')
  if (!eps.length) return eqRepondre(ctx, "Aucune épreuve de collecte en cours.", 'No collection trial in progress.')
  var presents = eqEquipeComplete(serveur, slug, p, EQ.RAYON_RENDRE)
  if (!presents) return eqRepondre(ctx, 'Toute ton équipe doit être réunie autour de toi (moins de ' + EQ.RAYON_RENDRE + ' blocs).', 'Your whole team must be gathered around you (within ' + EQ.RAYON_RENDRE + ' blocks).')
  var rendu = false
  for (var i = 0; i < eps.length; i++) {
    var ep = eps[i], deja = ep.prog[slug] || 0, besoin = ep.quantite - deja
    var fini = false
    for (var f = 0; f < ep.finis.length; f++) if (ep.finis[f].slug === slug) fini = true
    if (fini || besoin <= 0) continue
    var inv = p.inventory, pris = 0
    for (var s = 0; s < inv.getContainerSize() && pris < besoin; s++) {
      var pile = inv.getItem(s)
      if (pile.isEmpty() || String(pile.id) !== ep.cible) continue
      var n = Math.min(pile.getCount(), besoin - pris)
      pile.shrink(n); pris += n
    }
    if (pris > 0) { rendu = true; eqProgres(serveur, ep, slug, pris, presents) }
  }
  if (!rendu) return eqRepondre(ctx, "Tu n'as aucun objet demandé par les épreuves en cours.", 'You have none of the items the current trials ask for.')
  return 1
}
function eqCmdTrimestre(ctx) {
  if (!eqProf(ctx)) return eqRepondre(ctx, 'Réservé aux professeurs.', 'Teachers only.')
  var serveur = ctx.source.server, d = eqCharger(serveur)
  var l = eqClassement(eqListe(serveur), 'trimestre')
  var champ = l.length && l[0].trimestre > 0 ? l[0] : null
  d.trimestre.historique.push({ num: d.trimestre.num, champion: champ ? champ.nom : null, points: champ ? champ.trimestre : 0, fin: Date.now() })
  if (champ) eqAnnoncer(serveur, "Fin du trimestre " + d.trimestre.num + " ! L'équipe championne est " + champ.nom + ' avec ' + champ.trimestre + ' points !',
    'End of term ' + d.trimestre.num + '! The champion team is ' + champ.nom + ' with ' + champ.trimestre + ' points!', 'gold')
  else eqAnnoncer(serveur, 'Fin du trimestre ' + d.trimestre.num + '.', 'End of term ' + d.trimestre.num + '.', 'gold')
  for (var s in d.equipes) d.equipes[s].trimestre = 0
  d.trimestre.num++
  d.trimestre.debut = Date.now()
  eqSauver(serveur)
  return 1
}
function eqCmdDissoudre(ctx, nom) {
  if (!eqProf(ctx)) return eqRepondre(ctx, 'Réservé aux professeurs.', 'Teachers only.')
  var serveur = ctx.source.server, d = eqCharger(serveur), slug = eqSlug(nom), eq = d.equipes[slug]
  if (!eq) return eqRepondre(ctx, 'Équipe introuvable.', 'Team not found.')
  delete d.equipes[slug]
  eqSauver(serveur)
  eqRafraichir(serveur, eq.membres)
  eqAnnoncer(serveur, "L'équipe " + eq.nom + ' a été dissoute par un professeur.', 'Team ' + eq.nom + ' was disbanded by a teacher.', 'gray')
  return 1
}
function eqCmdRetirer(ctx, cible) {
  if (!eqProf(ctx)) return eqRepondre(ctx, 'Réservé aux professeurs.', 'Teachers only.')
  var serveur = ctx.source.server, slug = eqEquipeDe(serveur, cible)
  if (!slug) return eqRepondre(ctx, String(cible.username) + " n'a pas d'équipe.", String(cible.username) + ' has no team.')
  eqRetirerMembre(serveur, slug, eqUuid(cible), String(cible.username))
  return 1
}

ServerEvents.commandRegistry(function (event) {
  var C = event.commands, A = event.arguments
  event.register(C.literal('equipe')
    .then(C.literal('creer').then(C.argument('nom', A.GREEDY_STRING.create(event)).executes(function (ctx) { return eqCmdCreer(ctx, A.GREEDY_STRING.getResult(ctx, 'nom')) })))
    .then(C.literal('logo').then(C.argument('texte', A.GREEDY_STRING.create(event)).executes(function (ctx) { return eqCmdLogo(ctx, A.GREEDY_STRING.getResult(ctx, 'texte')) })))
    .then(C.literal('inviter').then(C.argument('joueur', A.PLAYER.create(event)).executes(function (ctx) { return eqCmdInviter(ctx, A.PLAYER.getResult(ctx, 'joueur')) })))
    .then(C.literal('rejoindre').executes(function (ctx) { return eqCmdRejoindre(ctx) }))
    .then(C.literal('quitter').executes(function (ctx) { return eqCmdQuitter(ctx) }))
    .then(C.literal('info').executes(function (ctx) { return eqCmdInfo(ctx, null) })
      .then(C.argument('nom', A.GREEDY_STRING.create(event)).executes(function (ctx) { return eqCmdInfo(ctx, A.GREEDY_STRING.getResult(ctx, 'nom')) })))
    .then(C.literal('liste').executes(function (ctx) { return eqCmdListe(ctx) }))
    .then(C.literal('dissoudre').then(C.argument('nom', A.GREEDY_STRING.create(event)).executes(function (ctx) { return eqCmdDissoudre(ctx, A.GREEDY_STRING.getResult(ctx, 'nom')) })))
    .then(C.literal('retirer').then(C.argument('joueur', A.PLAYER.create(event)).executes(function (ctx) { return eqCmdRetirer(ctx, A.PLAYER.getResult(ctx, 'joueur')) }))))
  event.register(C.literal('classement').executes(function (ctx) { return eqCmdClassement(ctx, 'total') })
    .then(C.literal('trimestre').executes(function (ctx) { return eqCmdClassement(ctx, 'trimestre') }))
    .then(C.literal('epreuve').executes(function (ctx) { return eqCmdClassement(ctx, 'epreuve', null) })
      .then(C.argument('numero', A.INTEGER.create(event)).executes(function (ctx) { return eqCmdClassement(ctx, 'epreuve', String(A.INTEGER.getResult(ctx, 'numero'))) }))))
  event.register(C.literal('points')
    .then(C.argument('texte', A.GREEDY_STRING.create(event)).executes(function (ctx) { return eqCmdPoints(ctx, A.GREEDY_STRING.getResult(ctx, 'texte')) })))
  event.register(C.literal('epreuve')
    .then(C.literal('liste').executes(function (ctx) { return eqCmdEpreuves(ctx) }))
    .then(C.literal('rendre').executes(function (ctx) { return eqCmdRendre(ctx) }))
    .then(C.literal('lancer').then(C.argument('texte', A.GREEDY_STRING.create(event)).executes(function (ctx) { return eqCmdLancer(ctx, A.GREEDY_STRING.getResult(ctx, 'texte')) })))
    .then(C.literal('recompense').then(C.argument('texte', A.GREEDY_STRING.create(event)).executes(function (ctx) { return eqCmdRecompense(ctx, A.GREEDY_STRING.getResult(ctx, 'texte')) })))
    .then(C.literal('fin').then(C.argument('texte', A.GREEDY_STRING.create(event)).executes(function (ctx) { return eqCmdFin(ctx, A.GREEDY_STRING.getResult(ctx, 'texte')) }))))
  event.register(C.literal('trimestre')
    .then(C.literal('nouveau').executes(function (ctx) { return eqCmdTrimestre(ctx) })))
})

ServerEvents.loaded(function (event) {
  EQ_DATA = null
  var d = eqCharger(event.server)
  var n = 0
  for (var s in d.equipes) n++
  console.info('[equipes] ' + n + ' équipe(s), trimestre ' + d.trimestre.num + ', ' + d.epreuves.length + ' épreuve(s).')
})

// ───────── Duels du Colisée : victoires et défaites (appelé par colisee_duel.js) ─────────
function eqDuelResultat(serveur, gagnant, perdant) {
  try {
    var d = eqCharger(serveur)
    if (!d.duels) d.duels = {}
    var noms = [String(gagnant), String(perdant)]
    for (var i = 0; i < 2; i++) {
      var j = serveur.getPlayerList().getPlayerByName(noms[i])
      var cle = j ? String(j.uuid) : 'nom:' + noms[i].toLowerCase()
      if (!d.duels[cle]) d.duels[cle] = { nom: noms[i], v: 0, d: 0 }
      d.duels[cle].nom = noms[i]
      if (i === 0) d.duels[cle].v++; else d.duels[cle].d++
    }
    eqSauver(serveur)
  } catch (e) { console.error('[equipes] duel : ' + e) }
}

// ───────── Tableaux flottants (afficheurs de texte) ─────────
// /classement tableau poser equipes [taille]   classement général + trimestre + épreuve en cours (à l'école)
// /classement tableau poser duels [taille]     top 10 des duellistes (au Colisée)
// /classement tableau poser course [taille]    top 10 des records de la course de balai (course_balai.js)
// /classement tableau retirer                  retire le tableau le plus proche (moins de 8 blocs)
// Le tableau est posé 3 blocs devant le joueur, face à lui. Textes traduits côté client (clés mcrp.tableau.*).
var EQ_FOND = -1778384896   // 0x96000000 : fond noir semi-transparent

function eqJson(o) { return JSON.stringify(o) }
function eqTr(cle, args, couleur) { var o = { translate: 'mcrp.tableau.' + cle, color: couleur || 'white' }; if (args) o['with'] = args; return o }
function eqCouleurJson(eq) { return String(EQ_COULEURS[eq.couleur] || 'WHITE').toLowerCase() }
function eqLogoJson(eq) {
  var i = EQ_LOGOS.indexOf(eq.logo); if (i < 0) i = 0
  return { text: String.fromCharCode(0xE100 + i), font: 'kubejs:equipes', color: eqCouleurJson(eq) }
}
function eqColonne(d, champ, titreObj) {
  var l = [], parts = ['', titreObj, { text: '\n' }]
  for (var s in d.equipes) l.push(d.equipes[s])
  l.sort(function (a, b) { return (b[champ] || 0) - (a[champ] || 0) })
  if (!l.length) parts.push(eqTr('vide', null, 'gray'))
  var rangs = ['gold', 'gray', '#CD7F32']
  for (var i = 0; i < l.length && i < 10; i++) {
    var eq = l[i]
    parts.push({ text: '\n' + (i + 1) + '. ', color: rangs[i] || 'white' }, eqLogoJson(eq), { text: ' ' + eq.nom + '  ', color: eqCouleurJson(eq) },
      eqTr('pts', [String(eq[champ] || 0)], 'white'))
  }
  return parts
}
function eqDescJson(ep) {
  if (ep.type === 'chasse') {
    if (!ep.cible) return eqTr('chasse', [String(ep.quantite)], 'light_purple')
    var r = String(ep.cible).split(':')
    return eqTr('chasse_mob', [String(ep.quantite), { translate: 'entity.' + r[0] + '.' + r[1] }], 'light_purple')
  }
  if (ep.type === 'boss') return eqTr('boss', null, 'light_purple')
  var cleObjet = ep.cible
  try { cleObjet = String(Item.of(ep.cible).getDescriptionId()) } catch (e) {}
  return eqTr('collecte', [String(ep.quantite), { translate: cleObjet }], 'light_purple')
}
function eqBas(d) {
  var ep = null
  for (var i = d.epreuves.length - 1; i >= 0 && !ep; i--) if (d.epreuves[i].actif) ep = d.epreuves[i]
  if (!ep) return ['', eqTr('aucune', null, 'gray')]
  var parts = ['', eqTr('epreuve', [String(ep.id), eqDescJson(ep), String(ep.points)], 'light_purple'), { text: '\n' }]
  var noms = []
  for (var f = 0; f < ep.finis.length; f++) { var e = d.equipes[ep.finis[f].slug]; if (e) noms.push(e.nom) }
  parts.push(noms.length ? eqTr('reussie', [noms.join(', ')], 'gray') : eqTr('personne', null, 'gray'))
  return parts
}
function eqTexteDuels(d) {
  var l = [], parts = ['', eqTr('duels', null, 'gold'), { text: '\n' }]
  if (d.duels) for (var k in d.duels) l.push(d.duels[k])
  l.sort(function (a, b) { return (b.v - a.v) || (a.d - b.d) })
  if (!l.length) parts.push({ text: '\n' }, eqTr('aucun_duel', null, 'gray'))
  var rangs = ['gold', 'gray', '#CD7F32']
  for (var i = 0; i < l.length && i < 10; i++) {
    parts.push({ text: '\n' + (i + 1) + '. ', color: rangs[i] || 'white' })
    // emblème de l'équipe du duelliste, s'il en a une
    try {
      for (var s in d.equipes) {
        var eq = d.equipes[s], trouve = false
        for (var m in eq.noms) if (String(eq.noms[m]).toLowerCase() === String(l[i].nom).toLowerCase()) trouve = true
        if (trouve) { parts.push(eqLogoJson(eq), { text: ' ' }); break }
      }
    } catch (e) {}
    parts.push({ text: l[i].nom + '  ', color: 'white' }, eqTr('duel_ligne', [String(l[i].v), String(l[i].d)], 'gray'))
  }
  return parts
}
// Morceaux d'un tableau : [suffixe du tag, décalage à droite, décalage en hauteur, texte]
function eqMorceaux(d, t) {
  if (t.type === 'duels') return [['t', 0, 0, eqTexteDuels(d)]]
  if (t.type === 'course') return [['t', 0, 0, typeof crTexteRecords === 'function' ? crTexteRecords() : ['', { text: '?' }]]]   // records de la course de balai (course_balai.js)
  return [
    ['h', 0, 3.2, ['', eqTr('titre', null, 'gold'), { text: '\n' }, eqTr('academie', null, 'gray')]],
    ['g', -2.6, 0, eqColonne(d, 'total', eqTr('general', null, 'yellow'))],
    ['d', 2.6, 0, eqColonne(d, 'trimestre', eqTr('trimestre', [String(d.trimestre.num)], 'yellow'))],
    ['b', 0, -0.7, eqBas(d)]
  ]
}
// Texte au format SNBT (1.21 : un composant de texte en NBT est un compound, plus une chaîne JSON). Une liste est toujours une liste de compounds.
function eqSnbtStr(t) { return '"' + String(t).replace(/\\/g, '\\\\').replace(/"/g, '\\"').replace(/\n/g, '\\n') + '"' }
function eqSnbtComp(v) {
  if (v === null || v === undefined) return '{text:""}'
  if (typeof v === 'string' || typeof v === 'number') return '{text:' + eqSnbtStr(v) + '}'
  if (Array.isArray(v)) {
    var ex = [], deb = (v.length && v[0] === '') ? 1 : 0
    for (var i = deb; i < v.length; i++) ex.push(eqSnbtComp(v[i]))
    return '{text:"",extra:[' + ex.join(',') + ']}'
  }
  var champs = []
  for (var k in v) {
    var x = v[k], val
    if (k === 'with') { var w = []; for (var j = 0; j < x.length; j++) w.push(eqSnbtComp(x[j])); val = '[' + w.join(',') + ']' }
    else if (typeof x === 'string') val = eqSnbtStr(x)
    else if (typeof x === 'boolean') val = x ? '1b' : '0b'
    else val = String(x)
    champs.push(k + ':' + val)
  }
  return '{' + champs.join(',') + '}'
}
function eqSnbtTexte(parts) { return eqSnbtComp(parts) }
// Lacet (yaw) du joueur en degrés : getYRot() n'existe pas sous KubeJS, on essaie plusieurs accès puis le vecteur de regard.
function eqYaw(j) {
  var v
  try { v = Number(j.yRot); if (!isNaN(v)) return v } catch (e1) {}
  try { v = Number(j.yaw); if (!isNaN(v)) return v } catch (e2) {}
  try { v = Number(j.getYaw()); if (!isNaN(v)) return v } catch (e3) {}
  try { var l = j.lookAngle; return Math.atan2(-Number(l.x()), Number(l.z())) * 180 / Math.PI } catch (e4) {}
  try { var l2 = j.getLookAngle(); return Math.atan2(-Number(l2.x), Number(l2.z)) * 180 / Math.PI } catch (e5) {}
  return 0
}
function eqPoserTableau(serveur, joueur, type, taille) {
  var d = eqCharger(serveur)
  if (!d.tableaux) d.tableaux = []
  if (!d.prochainTableau) d.prochainTableau = 1
  var yaw = eqYaw(joueur), rad = yaw * Math.PI / 180
  var fx = -Math.sin(rad), fz = Math.cos(rad)   // devant le joueur
  var t = { id: d.prochainTableau++, type: type, taille: taille, dim: String(joueur.level().dimension().location()),
    x: Number(joueur.getX()) + fx * 3, y: Number(joueur.getY()) + 0.5, z: Number(joueur.getZ()) + fz * 3, yaw: yaw + 180 }
  d.tableaux.push(t)
  var rx = -fz, rz = fx   // vecteur « droite » du joueur qui regarde le tableau (décalage positif = à sa droite)
  var morceaux = eqMorceaux(d, t)
  for (var i = 0; i < morceaux.length; i++) {
    var m = morceaux[i], ox = t.x + rx * m[1] * taille, oz = t.z + rz * m[1] * taille, oy = t.y + m[2] * taille
    var nbt = '{Tags:["mcrp_tableau","mcrp_tab_' + t.id + '","mcrp_tab_' + t.id + '_' + m[0] + '"],Rotation:[' + t.yaw.toFixed(1) + 'f,0f],billboard:"fixed",alignment:"' + (m[0] === 'g' || m[0] === 'd' || m[0] === 't' ? 'left' : 'center') +
      '",line_width:400,background:' + EQ_FOND + ',shadow:1b,transformation:{left_rotation:[0f,0f,0f,1f],right_rotation:[0f,0f,0f,1f],translation:[0f,0f,0f],scale:[' + taille + 'f,' + taille + 'f,' + taille + 'f]},text:' + eqSnbtTexte(m[3]) + '}'
    var cmd = 'execute in ' + t.dim + ' run summon minecraft:text_display ' + ox.toFixed(2) + ' ' + oy.toFixed(2) + ' ' + oz.toFixed(2) + ' ' + nbt
    var res = 0
    try { res = serveur.runCommandSilent(cmd) } catch (eC) { console.error('[equipes] tableau : ' + eC) }
    if (!res) console.error('[equipes] tableau : la commande summon a échoué : ' + cmd)
  }
  eqSauver(serveur)
  return t
}
function eqRedessiner(serveur) {
  var d = eqCharger(serveur)
  if (!d.tableaux || !d.tableaux.length) return
  for (var i = 0; i < d.tableaux.length; i++) {
    var t = d.tableaux[i], morceaux = eqMorceaux(d, t)
    for (var k = 0; k < morceaux.length; k++) {
      try { serveur.runCommandSilent('execute in ' + t.dim + ' run data merge entity @e[type=minecraft:text_display,tag=mcrp_tab_' + t.id + '_' + morceaux[k][0] + ',limit=1] {text:' + eqSnbtTexte(morceaux[k][3]) + '}') } catch (e) {}
    }
  }
}
function eqRetirerTableau(serveur, joueur) {
  var d = eqCharger(serveur), meilleur = -1, dist = 64
  if (!d.tableaux) return null
  var dim = String(joueur.level().dimension().location())
  for (var i = 0; i < d.tableaux.length; i++) {
    var t = d.tableaux[i]
    if (t.dim !== dim) continue
    var dd = Math.pow(t.x - joueur.getX(), 2) + Math.pow(t.y - joueur.getY(), 2) + Math.pow(t.z - joueur.getZ(), 2)
    if (dd < dist) { dist = dd; meilleur = i }
  }
  if (meilleur < 0) return null
  var t2 = d.tableaux.splice(meilleur, 1)[0]
  serveur.runCommandSilent('execute in ' + t2.dim + ' run kill @e[type=minecraft:text_display,tag=mcrp_tab_' + t2.id + ']')
  eqSauver(serveur)
  return t2
}
ServerEvents.tick(function (event) {
  var sv = event.server
  if (sv.tickCount % 20 !== 7) return
  if (!EQ_SALE && sv.tickCount % 1200 !== 7) return   // dès qu'un classement change, sinon toutes les minutes (chunks rechargés)
  EQ_SALE = false
  try { eqRedessiner(sv) } catch (e) { console.error('[equipes] tableaux : ' + e) }
})
ServerEvents.commandRegistry(function (event) {
  var C = event.commands, A = event.arguments
  function poser(ctx, type, taille) {
    if (!eqProf(ctx)) return eqRepondre(ctx, 'Réservé aux professeurs.', 'Teachers only.')
    var p = ctx.source.player
    if (!p) return 0
    var t
    try { t = eqPoserTableau(ctx.source.server, p, type, Math.max(0.5, Math.min(4, taille))) } catch (eT) {
      console.error('[equipes] tableau : ' + eT + (eT && eT.stack ? ' | ' + eT.stack : ''))
      return eqRepondre(ctx, 'Erreur en posant le tableau : ' + eT, 'Error placing the board: ' + eT)
    }
    return eqRepondre(ctx, 'Tableau n°' + t.id + ' posé (' + type + ').', 'Board #' + t.id + ' placed (' + type + ').')
  }
  console.info('[equipes] commandes /classement tableau enregistrées')
  event.register(C.literal('classement').then(C.literal('tableau')
    .then(C.literal('poser')
      .then(C.literal('equipes').executes(function (ctx) { return poser(ctx, 'equipes', 0.7) })
        .then(C.argument('taille', A.FLOAT.create(event)).executes(function (ctx) { return poser(ctx, 'equipes', A.FLOAT.getResult(ctx, 'taille')) })))
      .then(C.literal('duels').executes(function (ctx) { return poser(ctx, 'duels', 0.7) })
        .then(C.argument('taille', A.FLOAT.create(event)).executes(function (ctx) { return poser(ctx, 'duels', A.FLOAT.getResult(ctx, 'taille')) })))
      .then(C.literal('course').executes(function (ctx) { return poser(ctx, 'course', 0.7) })
        .then(C.argument('taille', A.FLOAT.create(event)).executes(function (ctx) { return poser(ctx, 'course', A.FLOAT.getResult(ctx, 'taille')) }))))
    .then(C.literal('retirer').executes(function (ctx) {
      if (!eqProf(ctx)) return eqRepondre(ctx, 'Réservé aux professeurs.', 'Teachers only.')
      var p = ctx.source.player
      if (!p) return 0
      var t = eqRetirerTableau(ctx.source.server, p)
      return t ? eqRepondre(ctx, 'Tableau n°' + t.id + ' retiré.', 'Board #' + t.id + ' removed.') : eqRepondre(ctx, 'Aucun tableau à moins de 8 blocs.', 'No board within 8 blocks.')
    }))))
})
