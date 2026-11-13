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
// Règles des épreuves : un seul membre de l'équipe suffit pour participer (au moins 1 connecté), sans condition de distance ni de dimension entre les joueurs.
// Chasse / boss : chaque mort = points pour l'équipe, jusqu'au maximum de l'épreuve. Bonus : les 3 premières équipes à finir gagnent
// +30 %, +20 % et +10 % des points maximum en plus.

var EQ = {
  CLE: 'mcrp_equipes',
  MIN_MEMBRES: 2,
  MAX_MEMBRES: 3,
  RAYON: 64,
  RAYON_RENDRE: 10,
  DELAI_QUITTER_H: 72,
  BONUS: [0.3, 0.2, 0.1]
}
// 29 logos (caractères de la police kubejs:equipes) et 15 couleurs (couleurs du chat de Minecraft)
var EQ_LOGOS = ['etoile', 'lune', 'soleil', 'flamme', 'goutte', 'feuille', 'eclair', 'crane', 'oeil', 'cle', 'serpent', 'bouclier', 'couronne', 'epee', 'grimoire', 'baguette', 'cristal', 'flocon', 'sablier', 'rune', 'chapeau', 'planete', 'note', 'vent', 'engrenage', 'fiole', 'hibou', 'sang', 'montagne']
var EQ_COULEURS = { rouge_fonce: 'DARK_RED', rouge: 'RED', or: 'GOLD', jaune: 'YELLOW', vert: 'GREEN', vert_fonce: 'DARK_GREEN', cyan: 'AQUA', bleu_canard: 'DARK_AQUA',
  bleu: 'BLUE', bleu_nuit: 'DARK_BLUE', rose: 'LIGHT_PURPLE', violet: 'DARK_PURPLE', blanc: 'WHITE', gris: 'GRAY', gris_fonce: 'DARK_GRAY' }
var EQ_J = null
var EQ_ERR_LOGO = false
function eqErrLogo(e) { if (!EQ_ERR_LOGO) { EQ_ERR_LOGO = true; console.error('[equipes] logo/nom d\'équipe (Tab, nameplate) : ' + e) } }
function eqJ() {
  if (!EQ_J) EQ_J = { C: Java.loadClass('net.minecraft.network.chat.Component'), Style: Java.loadClass('net.minecraft.network.chat.Style'),
    CF: Java.loadClass('net.minecraft.ChatFormatting'), RL: Java.loadClass('net.minecraft.resources.ResourceLocation') }
  return EQ_J
}
// Éléments de texte (objets JSON) à placer devant le pseudo : [logo coloré] (+ nom d'équipe coloré si avecNom), ou null sans équipe.
// Construits avec Text.of({...}) (API KubeJS) : plus fiable que l'assemblage Java à la main.
function eqPrefixeObj(joueur, avecNom) {
  try {
    var serveur = joueur.server, slug = eqEquipeDe(serveur, joueur)
    if (!slug) return null
    var eq = eqCharger(serveur).equipes[slug]
    var i = EQ_LOGOS.indexOf(eq.logo); if (i < 0) i = 0
    var coul = String(EQ_COULEURS[eq.couleur] || 'WHITE').toLowerCase()
    var parts = [{ text: String.fromCharCode(0xE100 + i), font: 'kubejs:equipes', color: coul }]
    if (avecNom) parts.push({ text: ' ' + eq.nom, color: coul })
    parts.push({ text: ' ' })
    return parts
  } catch (e) { eqErrLogo(e); return null }
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
// Membres de l'équipe connectés et en vie (au moins 1 suffit ; aucune condition de distance ni de dimension). null si personne.
function eqEquipeComplete(serveur, slug, centre, rayon) {
  var eq = eqCharger(serveur).equipes[slug]
  if (!eq) return null
  var presents = []
  for (var i = 0; i < eq.membres.length; i++) {
    var p = null
    try { p = serveur.getPlayerList().getPlayer(EQ_UUID.fromString(eq.membres[i])) } catch (e) {}
    if (p && p.isAlive()) presents.push(p)
  }
  return presents.length ? presents : null
}

// ───────── Points ─────────
function eqAjouterPoints(serveur, slug, n) {
  var eq = eqCharger(serveur).equipes[slug]
  if (!eq) return
  eq.total = (eq.total || 0) + n
  eq.trimestre = (eq.trimestre || 0) + n
  if (n > 0) {   // quête « L'esprit d'équipe » pour les membres connectés
    try {
      var js = serveur.players
      for (var iq = 0; iq < js.size(); iq++) { if (eq.membres.indexOf(eqUuid(js.get(iq))) !== -1) ftbFait(js.get(iq), 'equipe_points') }
    } catch (eF) {}
  }
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
  if (ep.pm && ep.type === 'chasse') return en ? 'Hunt: ' + ep.points + ' pt per monster' + mob + ', max ' + ep.quantite : 'Chasse : ' + ep.points + ' pt par monstre' + mob + ', max ' + ep.quantite
  if (ep.pm && ep.type === 'boss') return en ? 'Boss: ' + ep.points + ' pt per zone boss' + mob + ', max ' + ep.quantite : 'Boss : ' + ep.points + ' pt par boss de zone' + mob + ', max ' + ep.quantite
  if (ep.type === 'chasse') return en ? 'Hunt: kill ' + ep.quantite + ' monsters' + mob : 'Chasse : tuer ' + ep.quantite + ' monstres' + mob
  if (ep.type === 'boss') return en ? 'Boss: defeat a zone boss' + mob : 'Boss : vaincre un boss de zone' + mob
  return en ? 'Collection: bring ' + ep.quantite + ' × ' + ep.cible : 'Collecte : rapporter ' + ep.quantite + ' × ' + ep.cible
}
// Fait avancer l'épreuve ep pour l'équipe slug ; termine si l'objectif est atteint.
function eqProgres(serveur, ep, slug, n, presents) {
  if (!ep.actif) return
  for (var f = 0; f < ep.finis.length; f++) if (ep.finis[f].slug === slug) return
  if (ep.pm) {
    // Épreuve « points » (chasse / boss) : chaque mort rapporte ep.points point(s) à l'équipe (total + trimestre), jusqu'au maximum ep.quantite ;
    // le maximum atteint, l'épreuve s'arrête pour cette équipe. Le tableau se met à jour à chaque point (eqSauver).
    var gain = Math.min(n * ep.points, ep.quantite - (ep.prog[slug] || 0))
    if (gain <= 0) return
    ep.prog[slug] = (ep.prog[slug] || 0) + gain
    eqAjouterPoints(serveur, slug, gain)
    var eqp = eqCharger(serveur).equipes[slug]
    if (ep.prog[slug] < ep.quantite) {
      for (var ip = 0; ip < presents.length; ip++) {
        try { presents[ip].setStatusMessage(Text.of((eqEn(presents[ip]) ? 'Trial #' + ep.id + ': ' : 'Épreuve n°' + ep.id + ' : ') + ep.prog[slug] + ' / ' + ep.quantite + ' pts').gold()) } catch (ep1) {}
      }
      eqSauver(serveur)
      return
    }
    var rangP = ep.finis.length
    var bonusP = Math.round(ep.quantite * (EQ.BONUS[rangP] || 0))
    if (bonusP > 0) eqAjouterPoints(serveur, slug, bonusP)
    ep.finis.push({ slug: slug, t: Date.now(), pts: ep.quantite + bonusP })
    if (ep.recompense) {
      for (var kp = 0; kp < presents.length; kp++) eqDonnerRecompense(presents[kp], ep.recompense)
    }
    eqSauver(serveur)
    eqAnnoncer(serveur,
      "L'équipe " + eqp.nom + ' atteint le maximum de l\'épreuve n°' + ep.id + ' (' + (rangP + 1) + (rangP === 0 ? 're' : 'e') + ')' + (bonusP > 0 ? ' : bonus +' + bonusP + ' points' : '') + ' !',
      'Team ' + eqp.nom + ' reaches the maximum of trial #' + ep.id + ' (#' + (rangP + 1) + ')' + (bonusP > 0 ? ': bonus +' + bonusP + ' points' : '') + '!', 'gold')
    return
  }
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
    for (var k = 0; k < presents.length; k++) eqDonnerRecompense(presents[k], ep.recompense)
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

var EQ_CLASSE_ENEMY = null
var EQ_DEBUG = true   // journal des morts comptées / ignorées pendant une épreuve (retirer quand tout marche)
EntityEvents.death(function (event) {
  try {
    var mort = event.entity
    var src = event.source
    var tueur = null
    // L'auteur du coup : « actual » est ce qui marche sous KubeJS (utilisé par chasse_quetes.js), « player » et getEntity() en secours.
    try { var ac = src ? src.actual : null; if (ac && ac.isPlayer()) tueur = ac } catch (e0) {}
    if (!tueur) { try { tueur = src ? src.player : null } catch (e1) {} }
    if (!tueur) {
      try { var ent0 = src ? src.getEntity() : null; if (ent0 && ent0.isPlayer()) tueur = ent0 } catch (e00) {}
    }
    if (!tueur) return
    var serveur = tueur.server
    var actives = eqEpreuvesActives(serveur, 'chasse').length + eqEpreuvesActives(serveur, 'boss').length
    if (!actives) return
    var type = String(mort.type)
    var slug = eqEquipeDe(serveur, tueur)
    if (!slug) { if (EQ_DEBUG) console.info('[equipes] mort ignorée : ' + tueur.username + ' n\'a pas d\'équipe (' + type + ')'); return }
    var estBoss = false
    try { estBoss = mort.tags.contains('boss_zone') || mort.tags.contains('pirate_zone') } catch (e) {}
    var estMonstre = false
    // « getType() » renvoie l'identifiant (texte) sous KubeJS, pas l'EntityType : on teste isMonster() puis l'interface Enemy.
    try { if (mort.isMonster()) estMonstre = true } catch (e2) {}
    if (!estMonstre) {
      try {
        if (!EQ_CLASSE_ENEMY) EQ_CLASSE_ENEMY = Java.loadClass('net.minecraft.world.entity.monster.Enemy')
        if (mort instanceof EQ_CLASSE_ENEMY) estMonstre = true
      } catch (e3) {}
    }
    if (!estMonstre) { try { estMonstre = String(mort.getType().getCategory().getName()) === 'monster' } catch (e4) {} }
    var chasses = estMonstre ? eqEpreuvesActives(serveur, 'chasse') : []
    var boss = estBoss ? eqEpreuvesActives(serveur, 'boss') : []
    if (!chasses.length && !boss.length) {
      if (EQ_DEBUG) console.info('[equipes] mort ignorée : ' + type + (estBoss ? ' (boss de zone)' : estMonstre ? ' (monstre)' : ' (ni monstre ni boss de zone)') + ' — aucune épreuve en cours ne compte ce type de mob')
      return
    }
    var presents = eqEquipeComplete(serveur, slug, tueur, EQ.RAYON)
    if (!presents) { if (EQ_DEBUG) console.info('[equipes] mort ignorée : aucun membre connecté pour ' + slug); return }
    for (var i = 0; i < chasses.length; i++) {
      if (!chasses[i].cible || chasses[i].cible === type) eqProgres(serveur, chasses[i], slug, 1, presents)
      else if (EQ_DEBUG) console.info('[equipes] mort ignorée : ' + type + ' ≠ ' + chasses[i].cible)
    }
    for (var j = 0; j < boss.length; j++) if (!boss[j].cible || boss[j].cible === type) eqProgres(serveur, boss[j], slug, 1, presents)
    if (EQ_DEBUG) console.info('[equipes] mort comptée : ' + type + ' par ' + tueur.username + ' (' + slug + ')')
  } catch (e) { console.error('[equipes] mort : ' + e) }
})

// ───────── Groupes temporaires ─────────
// /groupe creer, /groupe inviter <joueur>, /groupe rejoindre, /groupe quitter, /groupe info.
// Le temps d'une sortie : un membre ne peut pas blesser les autres membres du groupe (sorts, invocations, armes, flèches).
// Le groupe n'est pas sauvegardé : il disparaît
// au redémarrage du serveur, et un joueur qui se déconnecte le quitte. Indépendant des équipes permanentes.
var GR = { MAX: 8, INVIT_MS: 120000 }
var GR_DE = {}      // uuid joueur -> id du groupe
var GR_LISTE = {}   // id -> { chef: uuid, membres: [uuid], noms: {uuid: nom} }
var GR_INVIT = {}   // uuid invité -> { id, fin }
var GR_SUIVANT = 1
function grGroupeDe(joueur) { var id = GR_DE[String(joueur.uuid)]; return (id && GR_LISTE[id]) ? id : null }
function grMemeGroupe(a, b) { var g = grGroupeDe(a); return g !== null && g === grGroupeDe(b) }
function grProtege(cible, att, src) {
  if (!cible || !att || !cible.isPlayer()) return false
  if (String(att.uuid) === String(cible.uuid) || !grMemeGroupe(att, cible)) return false
  try { if (typeof duEstDuelliste === 'function' && duEstDuelliste(att.username) && duAdversaire(att.username) === String(cible.username)) return false } catch (eD) {}
  return true
}
function grDireGroupe(serveur, id, fr, en, couleur) {
  var g = GR_LISTE[id]; if (!g) return
  for (var i = 0; i < g.membres.length; i++) {
    var j = serveur.getPlayerList().getPlayer(EQ_UUID.fromString(g.membres[i]))
    if (j) eqDire(j, fr, en, couleur)
  }
}
function grRetirer(serveur, uuid, raisonFr, raisonEn) {
  var id = GR_DE[uuid]; delete GR_DE[uuid]
  var g = id ? GR_LISTE[id] : null
  if (!g) return
  var nom = g.noms[uuid] || '?'
  g.membres = g.membres.filter(function (u) { return u !== uuid })
  if (g.membres.length === 0) { delete GR_LISTE[id]; return }
  if (g.chef === uuid) g.chef = g.membres[0]
  grDireGroupe(serveur, id, nom + ' ' + raisonFr + '.', nom + ' ' + raisonEn + '.', 'gray')
  if (g.membres.length === 1) {
    grDireGroupe(serveur, id, 'Le groupe est dissous (plus qu\'un membre).', 'The group is disbanded (only one member left).', 'gray')
    delete GR_DE[g.membres[0]]; delete GR_LISTE[id]
  }
}
function grCmdCreer(ctx) {
  var p = ctx.source.player; if (!p) return 0
  if (grGroupeDe(p)) return eqRepondre(ctx, 'Tu es déjà dans un groupe. Quitte-le avec /groupe quitter.', 'You are already in a group. Leave it with /groupe quitter.')
  var id = 'g' + (GR_SUIVANT++), u = eqUuid(p)
  GR_LISTE[id] = { chef: u, membres: [u], noms: {} }; GR_LISTE[id].noms[u] = String(p.username)
  GR_DE[u] = id
  return eqRepondre(ctx, 'Groupe créé. Invite tes alliés avec /groupe inviter <joueur> : vous ne pourrez plus vous blesser entre vous (sorts, armes, flèches).', 'Group created. Invite your allies with /groupe inviter <player>: you will no longer be able to hurt each other (spells, weapons, arrows).')
}
function grCmdInviter(ctx, cible) {
  var p = ctx.source.player; if (!p) return 0
  var serveur = ctx.source.server, id = grGroupeDe(p)
  if (!id) { grCmdCreer(ctx); id = grGroupeDe(p); if (!id) return 0 }
  var g = GR_LISTE[id]
  if (String(cible.uuid) === eqUuid(p)) return eqRepondre(ctx, 'Tu ne peux pas t\'inviter toi-même.', 'You cannot invite yourself.')
  if (g.membres.length >= GR.MAX) return eqRepondre(ctx, 'Le groupe est complet (' + GR.MAX + ' membres).', 'The group is full (' + GR.MAX + ' members).')
  if (grGroupeDe(cible)) return eqRepondre(ctx, String(cible.username) + ' est déjà dans un groupe.', String(cible.username) + ' is already in a group.')
  GR_INVIT[String(cible.uuid)] = { id: id, fin: Date.now() + GR.INVIT_MS }
  eqDire(cible, String(p.username) + ' t\'invite dans son groupe. Tape /groupe rejoindre dans les 2 minutes pour accepter.', String(p.username) + ' invites you to their group. Type /groupe rejoindre within 2 minutes to accept.', 'aqua')
  return eqRepondre(ctx, 'Invitation envoyée à ' + String(cible.username) + '.', 'Invitation sent to ' + String(cible.username) + '.')
}
function grCmdRejoindre(ctx) {
  var p = ctx.source.player; if (!p) return 0
  var serveur = ctx.source.server, u = eqUuid(p), inv = GR_INVIT[u]
  delete GR_INVIT[u]
  if (!inv || inv.fin < Date.now() || !GR_LISTE[inv.id]) return eqRepondre(ctx, 'Tu n\'as aucune invitation de groupe en attente.', 'You have no pending group invitation.')
  if (grGroupeDe(p)) return eqRepondre(ctx, 'Tu es déjà dans un groupe. Quitte-le avec /groupe quitter.', 'You are already in a group. Leave it with /groupe quitter.')
  var g = GR_LISTE[inv.id]
  if (g.membres.length >= GR.MAX) return eqRepondre(ctx, 'Ce groupe est complet.', 'This group is full.')
  g.membres.push(u); g.noms[u] = String(p.username); GR_DE[u] = inv.id
  grDireGroupe(serveur, inv.id, String(p.username) + ' rejoint le groupe.', String(p.username) + ' joins the group.', 'aqua')
  return 1
}
function grCmdQuitter(ctx) {
  var p = ctx.source.player; if (!p) return 0
  if (!grGroupeDe(p)) return eqRepondre(ctx, 'Tu n\'es dans aucun groupe.', 'You are not in a group.')
  grRetirer(ctx.source.server, eqUuid(p), 'quitte le groupe', 'leaves the group')
  return eqRepondre(ctx, 'Tu as quitté le groupe.', 'You left the group.')
}
function grCmdInfo(ctx) {
  var p = ctx.source.player; if (!p) return 0
  var id = grGroupeDe(p)
  if (!id) return eqRepondre(ctx, 'Tu n\'es dans aucun groupe. Crée-en un avec /groupe creer.', 'You are not in a group. Create one with /groupe creer.')
  var g = GR_LISTE[id], noms = g.membres.map(function (u) { return (g.noms[u] || '?') + (u === g.chef ? ' (chef)' : '') })
  return eqRepondre(ctx, 'Ton groupe : ' + noms.join(', ') + '.', 'Your group: ' + noms.join(', ') + '.')
}
PlayerEvents.loggedOut(function (event) {
  try { var u = String(event.player.uuid); delete GR_INVIT[u]; if (GR_DE[u]) grRetirer(event.server, u, 's\'est déconnecté et quitte le groupe', 'logged out and left the group') } catch (e) {}
})

// ───────── Pas de dégâts entre coéquipiers ─────────
// Un membre d'une équipe ne peut pas blesser un autre membre de la même équipe (coups, flèches, sorts, invocations, familiers),
// sauf pendant un duel du Colisée qui les oppose (colisee_duel.js).
function eqAuteurJoueur(src) {
  // KubeJS renomme DamageSource.getEntity() en .actual : getEntity() n'est pas accessible et renvoyait toujours null,
  // ce qui désactivait toute la protection entre coéquipiers.
  var a = null
  try { a = src.actual } catch (e) {}
  if (!a) { try { a = src.getEntity() } catch (e0) {} }
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
      if (grProtege(cible, att, event.getSource())) { event.setCanceled(true); return }
      var serveur = cible.server
      var slug = eqEquipeDe(serveur, cible)
      if (!slug || eqEquipeDe(serveur, att) !== slug) return
      // duel du Colisée entre ces deux joueurs : autorisé
      try { if (typeof duEstDuelliste === 'function' && duEstDuelliste(att.username) && duAdversaire(att.username) === String(cible.username)) return } catch (eD) {}
      event.setCanceled(true)
    } catch (err) {}
  })
} catch (e) { console.error('[equipes] protection entre coéquipiers indisponible : ' + e) }
// Filet de sécurité : certains mods imposent leurs dégâts plus tard (LivingDamageEvent$Pre, en dernier). On remet à 0 les dégâts
// entre coéquipiers à ce stade aussi, et on note dans le journal tout dégât entre coéquipiers qui passerait encore (pour l'identifier).
function eqCoequipiers(cible, src) {
  if (!cible || !cible.isPlayer()) return null
  var att = eqAuteurJoueur(src)
  if (!att || String(att.uuid) === String(cible.uuid)) return null
  if (grProtege(cible, att, src)) return att
  var serveur = cible.server
  var slug = eqEquipeDe(serveur, cible)
  if (!slug || eqEquipeDe(serveur, att) !== slug) return null
  try { if (typeof duEstDuelliste === 'function' && duEstDuelliste(att.username) && duAdversaire(att.username) === String(cible.username)) return null } catch (eD) {}
  return att
}
try {
  var EQ_BUS = Java.loadClass('net.neoforged.neoforge.common.NeoForge').EVENT_BUS
  var EQ_PRIO = Java.loadClass('net.neoforged.bus.api.EventPriority')
  EQ_BUS.addListener(EQ_PRIO.LOWEST, false, Java.loadClass('net.neoforged.neoforge.event.entity.living.LivingDamageEvent$Pre'), function (e) {
    try {
      var att = eqCoequipiers(e.getEntity(), e.getSource())
      if (!att) return
      console.info('[equipes] dégâts entre coéquipiers annulés au dernier moment : ' + att.username + ' -> ' + e.getEntity().username + ' (' + e.getSource().getMsgId() + ', ' + e.getNewDamage() + ')')
      e.setNewDamage(0)
    } catch (err) {}
  })
  EQ_BUS.addListener(EQ_PRIO.LOWEST, false, Java.loadClass('net.neoforged.neoforge.event.entity.living.LivingDamageEvent$Post'), function (e) {
    try {
      var cible = e.getEntity()
      if (!cible || !cible.isPlayer() || e.getNewDamage() <= 0) return
      var src = e.getSource(), att = eqCoequipiers(cible, src)
      var aucunAuteur = false
      try { aucunAuteur = !src.actual } catch (x) {}
      if (att) console.info('[equipes] DÉGÂTS ENTRE COÉQUIPIERS PASSÉS : ' + att.username + ' -> ' + cible.username + ' (' + src.getMsgId() + ', ' + e.getNewDamage() + ')')
    } catch (err) {}
  })
} catch (e) { console.error('[equipes] filet de sécurité coéquipiers indisponible : ' + e) }

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
  try { ftbFait(p, 'equipe') } catch (eF) {}
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
  try { ftbFait(p, 'equipe') } catch (eF) {}
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
  var ep = { id: 0, type: type, cible: null, quantite: 1, points: 0, recompense: null, actif: true, debut: Date.now(), prog: {}, finis: [], finA: null }
  // Durée optionnelle n'importe où après le type : « 15min » (minutes) ou « infini » (par défaut)
  for (var it = t.length - 1; it >= 1; it--) {
    var mt = String(t[it]).toLowerCase().match(/^(\d+)min$/)
    if (mt) { ep.finA = Date.now() + parseInt(mt[1], 10) * 60000; t.splice(it, 1) }
    else if (String(t[it]).toLowerCase() === 'infini') { ep.finA = null; t.splice(it, 1) }
  }
  if ((type === 'chasse' || type === 'boss') && t.length >= 2) {
    // /epreuve lancer chasse|boss <points max> [points par mort] [mob] : 1 point par mort par défaut, jusqu'au maximum
    ep.pm = true
    ep.quantite = parseInt(t[1], 10)
    var suite = t.slice(2)
    ep.points = 1
    if (suite.length && /^\d+$/.test(suite[0])) ep.points = parseInt(suite.shift(), 10)
    ep.cible = suite[0] || null
  }
  else if (type === 'collecte' && t.length >= 4) { ep.cible = t[1]; ep.quantite = parseInt(t[2], 10); ep.points = parseInt(t[3], 10) }
  else return eqRepondre(ctx, 'Usage : /epreuve lancer chasse <points max> [points par mort] [mob] [Nmin|infini] | boss <points max> [points par mort] [mob] [Nmin|infini] | collecte <objet> <quantité> <points> [Nmin|infini]',
    'Usage: /epreuve lancer chasse <max points> [points per kill] [mob] [Nmin|infini] | boss <max points> [points per kill] [mob] [Nmin|infini] | collecte <item> <amount> <points> [Nmin|infini]')
  if (!(ep.quantite > 0) || !(ep.points > 0)) return eqRepondre(ctx, 'Quantité ou points invalides.', 'Invalid amount or points.')
  if (ep.cible && ep.cible.indexOf(':') === -1) ep.cible = 'minecraft:' + ep.cible
  if (type === 'collecte') { try { if (Item.of(ep.cible).isEmpty()) throw 'vide' } catch (e) { return eqRepondre(ctx, 'Objet inconnu : ' + ep.cible, 'Unknown item: ' + ep.cible) } }
  var serveur = ctx.source.server, d = eqCharger(serveur)
  ep.id = d.prochain++
  d.epreuves.push(ep)
  eqSauver(serveur)
  var cmdFr = type === 'collecte' ? ' Rapportez les objets avec /epreuve rendre. Un seul membre connecté suffit.' : ' Un seul membre connecté suffit. Bonus pour les 3 premières équipes !'
  var cmdEn = type === 'collecte' ? ' Bring the items with /epreuve rendre. A single online member is enough.' : ' A single online member is enough. Bonus for the first 3 teams!'
  var ptsFr = ep.pm ? '' : ' — ' + ep.points + ' points.'
  var ptsEn = ep.pm ? '' : ' — ' + ep.points + ' points.'
  var dureeFr = ep.finA ? ' Durée : ' + Math.round((ep.finA - Date.now()) / 60000) + ' min.' : ''
  var dureeEn = ep.finA ? ' Duration: ' + Math.round((ep.finA - Date.now()) / 60000) + ' min.' : ''
  eqAnnoncer(serveur, 'Nouvelle épreuve d\'équipe n°' + ep.id + ' — ' + eqDescEpreuve(ep, false) + ptsFr + dureeFr + cmdFr,
    'New team trial #' + ep.id + ' — ' + eqDescEpreuve(ep, true) + ptsEn + dureeEn + cmdEn, 'light_purple')
  return 1
}
var EQ_RARETES = { commun: 'COMMON', peu_commun: 'UNCOMMON', rare: 'RARE', epique: 'EPIC', legendaire: 'LEGENDARY' }
// Récompense d'épreuve pour un joueur : objet, ou parchemin(s) d'un sort de sa classe (rareté choisie).
function eqDonnerRecompense(joueur, rec) {
  if (!rec) return
  if (!rec.sort) { try { joueur.give(Item.of(rec.id, rec.n)) } catch (e) {} return }
  for (var i = 0; i < rec.n; i++) {
    try {
      var choix = sortRecompenseAleatoire(joueur, rec.sort)   // classes_rp.js
      if (!choix) { joueur.tell(Text.translate('mcrp.msg.recompense_aucun').red()); return }
      var ISC = Java.loadClass('io.redspace.ironsspellbooks.api.spells.ISpellContainer')
      var pile = Item.of('irons_spellbooks:scroll')
      ISC.set(pile, ISC.createScrollContainer(choix.sort, choix.niveau, pile))
      joueur.give(pile)
      var pp = choix.id.split(':')
      joueur.tell(Text.of((eqEn(joueur) ? 'Trial reward: ' : 'Récompense d\'épreuve : ')).green().append(Text.translate('spell.' + pp[0] + '.' + pp[1]).gold()).append(Text.of(' (niv. ' + choix.niveau + ')').gray()))
      console.info('[equipes] récompense : ' + joueur.username + ' reçoit ' + choix.id + ' niveau ' + choix.niveau)
    } catch (e2) { console.error('[equipes] récompense sort : ' + e2) }
  }
}
// Récompense posée pendant l'épreuve : les équipes qui avaient DÉJÀ atteint le quota la reçoivent aussi (membres connectés).
function eqRecompenserDejaFinis(serveur, ep) {
  console.info('[equipes] récompense de l\'épreuve n°' + ep.id + ' : ' + JSON.stringify(ep.recompense) + ' — ' + ep.finis.length + ' équipe(s) déjà au maximum')
  for (var f = 0; f < ep.finis.length; f++) {
    var pres = eqEquipeComplete(serveur, ep.finis[f].slug, null, 0)
    if (!pres) continue
    for (var k = 0; k < pres.length; k++) eqDonnerRecompense(pres[k], ep.recompense)
  }
}
function eqCmdRecompense(ctx, texte) {
  if (!eqProf(ctx)) return eqRepondre(ctx, 'Réservé aux professeurs.', 'Teachers only.')
  console.info('[equipes] /epreuve recompense ' + texte + ' (par ' + (ctx.source.player ? ctx.source.player.username : 'console') + ')')
  var t = String(texte).trim().split(/\s+/), ep = eqEpreuve(ctx.source.server, parseInt(t[0], 10))
  if (!ep || !t[1]) return eqRepondre(ctx, 'Usage : /epreuve recompense <n°> <objet> [nombre] | /epreuve recompense <n°> sort <rareté> [nombre]', 'Usage: /epreuve recompense <#> <item> [count] | /epreuve recompense <#> sort <rarity> [count]')
  if (t[1].toLowerCase() === 'sort') {
    // Parchemin d'un sort de la CLASSE de chaque membre (même tirage que /classe recompense)
    var rar = EQ_RARETES[String(t[2] || '').toLowerCase()]
    if (!rar) return eqRepondre(ctx, 'Rareté inconnue. Choix : ' + Object.keys(EQ_RARETES).join(', ') + '.', 'Unknown rarity. Choices: ' + Object.keys(EQ_RARETES).join(', ') + '.')
    ep.recompense = { sort: rar, n: Math.max(1, parseInt(t[3] || '1', 10) || 1) }
    eqSauver(ctx.source.server)
    eqRecompenserDejaFinis(ctx.source.server, ep)
    return eqRepondre(ctx, 'Épreuve n°' + ep.id + ' : chaque membre recevra ' + ep.recompense.n + ' parchemin(s) ' + t[2].toLowerCase() + ' de sa classe.', 'Trial #' + ep.id + ': each member will receive ' + ep.recompense.n + ' ' + rar.toLowerCase() + ' scroll(s) of their class.')
  }
  var id = t[1].indexOf(':') === -1 ? 'minecraft:' + t[1] : t[1]
  try { if (Item.of(id).isEmpty()) throw 'vide' } catch (e) { return eqRepondre(ctx, 'Objet inconnu : ' + id, 'Unknown item: ' + id) }
  ep.recompense = { id: id, n: Math.max(1, parseInt(t[2] || '1', 10) || 1) }
  eqSauver(ctx.source.server)
  eqRecompenserDejaFinis(ctx.source.server, ep)
  return eqRepondre(ctx, 'Épreuve n°' + ep.id + ' : chaque membre recevra ' + ep.recompense.n + ' × ' + id + '.', 'Trial #' + ep.id + ': each member will receive ' + ep.recompense.n + ' × ' + id + '.')
}
function eqCmdTemps(ctx, texte) {
  if (!eqProf(ctx)) return eqRepondre(ctx, 'Réservé aux professeurs.', 'Teachers only.')
  var t = String(texte).trim().split(/\s+/), serveur = ctx.source.server, ep = eqEpreuve(serveur, parseInt(t[0], 10))
  if (!ep || !t[1]) return eqRepondre(ctx, 'Usage : /epreuve temps <n°> <minutes|infini>', 'Usage: /epreuve temps <#> <minutes|infini>')
  if (!ep.actif) return eqRepondre(ctx, 'Cette épreuve est déjà terminée.', 'This trial is already over.')
  var v = String(t[1]).toLowerCase().replace(/min$/, '')
  if (v === 'infini') ep.finA = null
  else { var m = parseInt(v, 10); if (!(m > 0)) return eqRepondre(ctx, 'Durée invalide.', 'Invalid duration.'); ep.finA = Date.now() + m * 60000 }
  eqSauver(serveur)
  eqAnnoncer(serveur, 'Épreuve n°' + ep.id + ' : ' + (ep.finA ? 'fin dans ' + Math.round((ep.finA - Date.now()) / 60000) + ' min.' : 'sans limite de temps.'),
    'Trial #' + ep.id + ': ' + (ep.finA ? 'ends in ' + Math.round((ep.finA - Date.now()) / 60000) + ' min.' : 'no time limit.'), 'light_purple')
  return 1
}
// Temps restant « m:ss » (ou null si pas de limite)
function eqResteTexte(ep) {
  if (!ep.finA) return null
  var r = Math.max(0, Math.ceil((ep.finA - Date.now()) / 1000))
  var hh = Math.floor(r / 3600), mm = Math.floor((r % 3600) / 60), ss = r % 60
  var deux = function (n) { return (n < 10 ? '0' : '') + n }
  if (hh >= 24) return Math.floor(hh / 24) + ' j ' + (hh % 24) + ' h ' + deux(mm)
  return hh > 0 ? hh + ':' + deux(mm) + ':' + deux(ss) : mm + ':' + deux(ss)
}
function eqTerminer(serveur, ep, raison) {
  ep.actif = false
  eqSauver(serveur)
  eqAnnoncer(serveur, "L'épreuve n°" + ep.id + (raison === 'temps' ? ' est terminée : temps écoulé !' : ' est terminée.') + ' Classement : /classement epreuve ' + ep.id,
    'Trial #' + ep.id + (raison === 'temps' ? ' is over: time is up!' : ' is over.') + ' Ranking: /classement epreuve ' + ep.id, 'light_purple')
}
function eqCmdFin(ctx, texte) {
  if (!eqProf(ctx)) return eqRepondre(ctx, 'Réservé aux professeurs.', 'Teachers only.')
  var serveur = ctx.source.server, ep = eqEpreuve(serveur, parseInt(String(texte).trim(), 10))
  if (!ep) return eqRepondre(ctx, 'Épreuve introuvable.', 'Trial not found.')
  eqTerminer(serveur, ep, 'fin')
  return 1
}
function eqCmdEpreuves(ctx) {
  var d = eqCharger(ctx.source.server), fr = [], en = []
  for (var i = 0; i < d.epreuves.length; i++) {
    var ep = d.epreuves[i]
    if (!ep.actif) continue
    var rec = ep.recompense ? ' + ' + ep.recompense.n + ' × ' + (ep.recompense.sort ? 'parchemin ' + ep.recompense.sort.toLowerCase() + ' de classe' : ep.recompense.id) : ''
    var rt = eqResteTexte(ep)
    fr.push('n°' + ep.id + ' — ' + eqDescEpreuve(ep, false) + (ep.pm ? '' : ' — ' + ep.points + ' pts') + rec + (rt ? ' — reste ' + rt : ' — sans limite'))
    en.push('#' + ep.id + ' — ' + eqDescEpreuve(ep, true) + (ep.pm ? '' : ' — ' + ep.points + ' pts') + rec + (rt ? ' — ' + rt + ' left' : ' — no limit'))
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
  if (!presents) return eqRepondre(ctx, 'Aucun membre de ton équipe n\'est connecté.', 'No member of your team is online.')
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

// Propositions au fil de la frappe pour /epreuve lancer : type, puis mobs (chasse / boss) ou objets (collecte).
var EQ_SUGG = null
function eqSuggererLancer(ctx, builder) {
  var reste = String(builder.getRemaining())
  var mots = reste.split(' ')
  var idx = mots.length - 1
  var cur = mots[idx].toLowerCase()
  var b = builder.createOffset(builder.getStart() + reste.length - mots[idx].length)
  var type = (mots[0] || '').toLowerCase()
  var liste = []
  if (idx === 0) liste = ['chasse', 'boss', 'collecte']
  else if (type === 'chasse' || type === 'boss' || type === 'collecte') {
    if (!EQ_SUGG) {
      EQ_SUGG = { monstres: [], vivants: [], objets: [] }
      var reg = Java.loadClass('net.minecraft.core.registries.BuiltInRegistries')
      var itE = reg.ENTITY_TYPE.keySet().iterator()
      while (itE.hasNext()) {
        var rl = itE.next(), id = String(rl)
        try {
          var cat = String(reg.ENTITY_TYPE.get(rl).getCategory().getName())
          if (cat === 'monster') EQ_SUGG.monstres.push(id)
          if (cat !== 'misc') EQ_SUGG.vivants.push(id)
        } catch (e) {}
      }
      var itI = reg.ITEM.keySet().iterator()
      while (itI.hasNext()) EQ_SUGG.objets.push(String(itI.next()))
    }
    if (type === 'chasse' && idx >= 2) liste = EQ_SUGG.monstres
    else if (type === 'boss' && idx >= 2) liste = EQ_SUGG.vivants
    else if (type === 'collecte' && idx === 1) liste = EQ_SUGG.objets
  }
  for (var i = 0; i < liste.length; i++) {
    var l = liste[i].toLowerCase()
    if (cur === '' || l.indexOf(cur) === 0 || l.split(':').pop().indexOf(cur) === 0) b.suggest(liste[i])
  }
  return b.buildFuture()
}
function eqSuggererRecompense(ctx, builder) {
  var reste = String(builder.getRemaining())
  var mots = reste.split(' ')
  var idx = mots.length - 1
  var cur = mots[idx].toLowerCase()
  var b = builder.createOffset(builder.getStart() + reste.length - mots[idx].length)
  var liste = []
  if (idx === 1) { liste = ['sort']; if (EQ_SUGG) liste = liste.concat(EQ_SUGG.objets) }
  else if (idx === 2 && String(mots[1]).toLowerCase() === 'sort') liste = Object.keys(EQ_RARETES)
  for (var i = 0; i < liste.length; i++) {
    var l = liste[i].toLowerCase()
    if (cur === '' || l.indexOf(cur) === 0 || l.split(':').pop().indexOf(cur) === 0) b.suggest(liste[i])
  }
  return b.buildFuture()
}
function eqArgRecompense(C, A, event) {
  var arg = C.argument('texte', A.GREEDY_STRING.create(event))
  try { arg = arg.suggests(function (ctx, builder) { return eqSuggererRecompense(ctx, builder) }) } catch (e) { console.error('[equipes] suggestions /epreuve recompense : ' + e) }
  return arg.executes(function (ctx) { return eqCmdRecompense(ctx, A.GREEDY_STRING.getResult(ctx, 'texte')) })
}
function eqArgLancer(C, A, event) {
  var arg = C.argument('texte', A.GREEDY_STRING.create(event))
  try { arg = arg.suggests(function (ctx, builder) { return eqSuggererLancer(ctx, builder) }) } catch (e) { console.error('[equipes] suggestions /epreuve lancer : ' + e) }
  return arg.executes(function (ctx) { return eqCmdLancer(ctx, A.GREEDY_STRING.getResult(ctx, 'texte')) })
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
  event.register(C.literal('groupe')
    .then(C.literal('creer').executes(function (ctx) { return grCmdCreer(ctx) }))
    .then(C.literal('inviter').then(C.argument('joueur', A.PLAYER.create(event)).executes(function (ctx) { return grCmdInviter(ctx, A.PLAYER.getResult(ctx, 'joueur')) })))
    .then(C.literal('rejoindre').executes(function (ctx) { return grCmdRejoindre(ctx) }))
    .then(C.literal('quitter').executes(function (ctx) { return grCmdQuitter(ctx) }))
    .then(C.literal('info').executes(function (ctx) { return grCmdInfo(ctx) })))
  event.register(C.literal('classement').executes(function (ctx) { return eqCmdClassement(ctx, 'total') })
    .then(C.literal('trimestre').executes(function (ctx) { return eqCmdClassement(ctx, 'trimestre') }))
    .then(C.literal('epreuve').executes(function (ctx) { return eqCmdClassement(ctx, 'epreuve', null) })
      .then(C.argument('numero', A.INTEGER.create(event)).executes(function (ctx) { return eqCmdClassement(ctx, 'epreuve', String(A.INTEGER.getResult(ctx, 'numero'))) }))))
  event.register(C.literal('points')
    .then(C.argument('texte', A.GREEDY_STRING.create(event)).executes(function (ctx) { return eqCmdPoints(ctx, A.GREEDY_STRING.getResult(ctx, 'texte')) })))
  event.register(C.literal('epreuve')
    .then(C.literal('liste').executes(function (ctx) { return eqCmdEpreuves(ctx) }))
    .then(C.literal('rendre').executes(function (ctx) { return eqCmdRendre(ctx) }))
    .then(C.literal('lancer').then(eqArgLancer(C, A, event)))
    .then(C.literal('recompense').then(eqArgRecompense(C, A, event)))
    .then(C.literal('temps').then(C.argument('texte', A.GREEDY_STRING.create(event)).executes(function (ctx) { return eqCmdTemps(ctx, A.GREEDY_STRING.getResult(ctx, 'texte')) })))
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
  if (ep.pm) {
    // Texte construit sur place (pas de clé de langue à installer chez les joueurs) ; le nom du mob vient de la traduction du jeu.
    var rm = ep.cible ? String(ep.cible).split(':') : null
    var cibleTxt = rm ? { translate: 'entity.' + rm[0] + '.' + rm[1] } : { text: ep.type === 'boss' ? 'boss de zone' : 'monstre' }
    return { text: '', color: 'light_purple', extra: [
      { text: (ep.type === 'boss' ? 'Boss : ' : 'Chasse : ') + ep.points + ' pt par ' }, cibleTxt, { text: ' (max ' + ep.quantite + ')' }] }
  }
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
  var parts = ['', eqTr('epreuve', [String(ep.id), eqDescJson(ep), String(ep.pm ? ep.quantite : ep.points)], 'light_purple')]
  var resteT = eqResteTexte(ep)
  if (resteT) parts.push({ text: '  ⌛ ' + resteT, color: 'yellow' })
  parts.push({ text: '\n' })
  if (ep.pm) {   // épreuve à points : classement en direct (équipes arrivées au maximum d'abord, puis par points)
    // Ordre : d'abord les équipes arrivées au maximum, dans l'ordre d'arrivée ; puis les autres par points.
    var rang = [], dejaR = {}
    for (var fr = 0; fr < ep.finis.length; fr++) { rang.push({ slug: ep.finis[fr].slug, n: ep.quantite }); dejaR[ep.finis[fr].slug] = true }
    var autres = []
    for (var sl in ep.prog) if (!dejaR[sl]) autres.push({ slug: sl, n: ep.prog[sl] })
    autres.sort(function (a, b) { return b.n - a.n })
    rang = rang.concat(autres)
    if (!rang.length) { parts.push(eqTr('personne', null, 'gray')); return parts }
    for (var r = 0; r < rang.length && r < 5; r++) {
      var er = d.equipes[rang[r].slug]
      if (!er) continue
      if (r > 0) parts.push({ text: '\n' })
      parts.push({ text: (r + 1) + '. ', color: 'gray' }, eqLogoJson(er), { text: ' ' + er.nom + ' ', color: 'white' }, { text: rang[r].n + ' / ' + ep.quantite + (rang[r].n >= ep.quantite ? ' ✔' : ''), color: rang[r].n >= ep.quantite ? 'green' : 'gold' })
    }
    return parts
  }
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
// Texte d'un text_display : en 1.21.1 le champ « text » est une CHAÎNE JSON (le format NBT en compound n'arrive qu'en 1.21.5 : il donnait un texte vide).
function eqSnbtTexte(parts) { return "'" + eqJson(parts).replace(/\\/g, '\\\\').replace(/'/g, "\\'") + "'" }
// Identifiant de la dimension du joueur (ex. minecraft:overworld) : sous KubeJS, level est une propriété, pas une méthode.
function eqDimId(j) {
  try { return String(j.level.dimension) } catch (e) {}
  try { return String(j.level.dimension.location()) } catch (e2) {}
  return 'minecraft:overworld'
}
// Inclinaison de la tête du joueur en degrés (positif = regarde vers le bas)
function eqPitch(j) {
  var v
  try { v = Number(j.xRot); if (!isNaN(v)) return v } catch (e1) {}
  try { v = Number(j.pitch); if (!isNaN(v)) return v } catch (e2) {}
  try { var l = j.lookAngle; return -Math.asin(Math.max(-1, Math.min(1, Number(l.y())))) * 180 / Math.PI } catch (e3) {}
  try { var l2 = j.getLookAngle(); return -Math.asin(Math.max(-1, Math.min(1, Number(l2.y)))) * 180 / Math.PI } catch (e4) {}
  return 0
}
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
  var t = { id: d.prochainTableau++, type: type, taille: taille, dim: eqDimId(joueur),
    x: Number(joueur.getX()) + fx * 3, y: Number(joueur.getY()) + 0.5, z: Number(joueur.getZ()) + fz * 3, yaw: yaw + 180 }
  d.tableaux.push(t)
  var rx = -fz, rz = fx   // vecteur « droite » du joueur qui regarde le tableau (décalage positif = à sa droite)
  var morceaux = eqMorceaux(d, t)
  for (var i = 0; i < morceaux.length; i++) {
    var m = morceaux[i], ox = t.x + rx * m[1] * taille, oz = t.z + rz * m[1] * taille, oy = t.y + m[2] * taille
    var nbt = '{Tags:["mcrp_tableau","mcrp_tab_' + t.id + '","mcrp_tab_' + t.id + '_' + m[0] + '"],Rotation:[' + t.yaw.toFixed(1) + 'f,0f],billboard:"fixed",alignment:"' + (m[0] === 'g' || m[0] === 'd' || m[0] === 't' ? 'left' : 'center') +
      '",line_width:400,background:' + EQ_FOND + ',shadow:1b,transformation:{left_rotation:[0f,0f,0f,1f],right_rotation:[0f,0f,0f,1f],translation:[0f,0f,0f],scale:[' + taille + 'f,' + taille + 'f,' + taille + 'f]},text:' + eqSnbtTexte(m[3]) + '}'
    var cmd = 'execute in ' + t.dim + ' run summon minecraft:text_display ' + ox.toFixed(2) + ' ' + oy.toFixed(2) + ' ' + oz.toFixed(2) + ' ' + nbt
    // runCommand (et non Silent) : le retour de la commande (« Summoned new Text Display » ou l'erreur) est écrit dans le journal du serveur
    try { serveur.runCommand(cmd) } catch (eC) { console.error('[equipes] tableau : ' + eC) }
    console.info('[equipes] tableau n°' + t.id + ' morceau ' + m[0] + ' posé en ' + ox.toFixed(1) + ' ' + oy.toFixed(1) + ' ' + oz.toFixed(1) + ' (échelle ' + taille + ')')
  }
  eqSauver(serveur)
  return t
}
var EQ_HAUTEUR_LIGNE = 0.25   // hauteur d'une ligne de text_display à l'échelle 1 (en blocs)
// Nombre de lignes d'un texte JSON (morceaux) : 1 + nombre de retours à la ligne.
function eqNbLignes(parts) {
  var n = 1
  for (var i = 0; i < parts.length; i++) {
    var p = parts[i]
    var txt = typeof p === 'string' ? p : (p && p.text ? String(p.text) : '')
    for (var c = 0; c < txt.length; c++) if (txt.charAt(c) === '\n') n++
  }
  return n
}
function eqRedessiner(serveur) {
  var d = eqCharger(serveur)
  if (!d.tableaux || !d.tableaux.length) return
  for (var i = 0; i < d.tableaux.length; i++) {
    var t = d.tableaux[i], morceaux = eqMorceaux(d, t)
    for (var k = 0; k < morceaux.length; k++) {
      var extra = ''
      if (morceaux[k][0] === 'b') {
        // Un text_display grandit vers le HAUT quand il a plus de lignes : on le descend d'autant (translation),
        // pour que le classement de l'épreuve s'allonge vers le bas sans recouvrir les colonnes.
        var lignes = eqNbLignes(morceaux[k][3])
        var dy = -Math.max(0, lignes - 2) * EQ_HAUTEUR_LIGNE * (t.taille || 0.7)
        extra = ',transformation:{translation:[0f,' + dy.toFixed(3) + 'f,0f]}'
      }
      try { serveur.runCommandSilent('execute in ' + t.dim + ' run data merge entity @e[type=minecraft:text_display,tag=mcrp_tab_' + t.id + '_' + morceaux[k][0] + ',limit=1] {text:' + eqSnbtTexte(morceaux[k][3]) + extra + '}') } catch (e) {}
    }
  }
}
function eqRetirerTableau(serveur, joueur) {
  var d = eqCharger(serveur), meilleur = -1, dist = 64
  if (!d.tableaux) return null
  var dim = eqDimId(joueur)
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
  try {   // épreuves à durée limitée : fin automatique, et tableau redessiné chaque seconde pour le compte à rebours
    var dT = eqCharger(sv), maintenant = Date.now()
    for (var iT = 0; iT < dT.epreuves.length; iT++) {
      var epT = dT.epreuves[iT]
      if (!epT.actif || !epT.finA) continue
      if (maintenant >= epT.finA) eqTerminer(sv, epT, 'temps')
      else EQ_SALE = true
    }
  } catch (eT) { console.error('[equipes] durée des épreuves : ' + eT) }
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
