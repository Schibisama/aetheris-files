// Aide FTB Quests : coche (ou remet à zéro) une quête / tâche pour un joueur, sans passer par la commande /ftbquests
// (cette commande est refusée quand elle vient du serveur : elle exige un joueur éditeur).
// Utilisée par pnj_parler.js, boss_zones.js, zone_pirates.js, livraison_quetes.js, decouverte_lieux.js, reinit_joueur.js.
// ftbCompleter(joueur, idHex) -> true si fait ; ftbReinitialiser(joueur) -> true si fait. Rechargement : /reload

// Les identifiants FTB sont des entiers 64 bits : passés par JavaScript (nombres à 53 bits), les grands identifiants sont arrondis
// et la quête devient « introuvable ». On cherche donc l'objet par son identifiant TEXTE (getCodeString), sans conversion.
var FTB_INDEX = null, FTB_INDEX_FICHIER = null, FTB_INDEX_T = 0
function ftbObjet(file, idHex) {
  var cle = String(idHex).toUpperCase()
  while (cle.length < 16) cle = '0' + cle
  if (!FTB_INDEX || FTB_INDEX_FICHIER !== file) {
    FTB_INDEX = {}; FTB_INDEX_FICHIER = file; FTB_INDEX_T = Date.now()
    try {
      var it = file.getAllObjects().iterator()
      while (it.hasNext()) { var o = it.next(); try { FTB_INDEX[String(o.getCodeString()).toUpperCase()] = o } catch (e1) {} }
    } catch (e) { console.error('[ftb_aide] index des quêtes : ' + e) }
    console.info('[ftb_aide] ' + Object.keys(FTB_INDEX).length + ' objets de quête indexés')
  }
  var obj = FTB_INDEX[cle]
  if (!obj && Date.now() - FTB_INDEX_T > 60000) FTB_INDEX = null   // quêtes modifiées depuis (éditeur) : index refait (au plus 1 fois par minute)
  return obj || null
}

// ───────── Chapitre « Les Épreuves d'Aetheris » (epreuves.snbt) : quêtes cochées par les scripts ─────────
var FTB_EPREUVES = {
  vroom_defi: '71073031615B7D58',
  vroom_fini: '08C3BAB2CEC79213',
  course_groupe: '3B516E65265EDE5B',
  equipe: '4FF51C699BA759FC',
  duel_gagne: '7CA34FC83E6CAABC',
  equipe_points: '3022777F37B1584A',
  parchemin: '7CA07F5D1244E52A',
  etoile: '4FB9581E8EA1269F',
  destin: '2682F634108B9A50',
  nether: '668F3EAF369511C4',
  purge: '4867D999133483CC',
  boss: '498C76C2FC4CD776',
  course_rapide: '4C88675BDC65A959'
}
// ftbFait(joueur, cle) : coche la quête correspondante (sans effet si le joueur ou la clé est inconnu, ou si la quête est déjà faite)
function ftbFait(joueur, cle) {
  try { if (joueur && FTB_EPREUVES[cle]) ftbCompleter(joueur, FTB_EPREUVES[cle]) } catch (e) {}
}

var FTB_SIGNALES = {}   // identifiants de quête introuvables déjà signalés (évite de remplir la console)

function ftbCompleter(joueur, idHex) {
  try {
    var SQF = Java.loadClass('dev.ftb.mods.ftbquests.quest.ServerQuestFile')
    var PC = Java.loadClass('dev.ftb.mods.ftbquests.util.ProgressChange')
    var file = SQF.INSTANCE
    if (!file) { console.error('[ftb_aide] fichier de quêtes indisponible'); return false }
    var obj = ftbObjet(file, idHex)
    if (!obj) { if (!FTB_SIGNALES[idHex]) { FTB_SIGNALES[idHex] = true; console.error('[ftb_aide] objet de quête introuvable (signalé une seule fois) : ' + idHex) } return false }
    var donnees = file.getTeamData(joueur)
    if (!donnees.isPresent()) { console.error('[ftb_aide] pas de données d\'équipe pour ' + joueur.username); return false }
    obj.forceProgress(donnees.get(), new PC(obj, joueur.uuid).setReset(false))
    console.info('[ftb_aide] ' + joueur.username + ' : quête ' + idHex + ' validée')
    ftbDonnerRecompenses(joueur, donnees.get(), obj)   // forceProgress ne distribue pas les récompenses : on les réclame pour le joueur
    return true
  } catch (e) {
    console.error('[ftb_aide] ' + idHex + ' : ' + e)
    return false
  }
}

// Réclame pour le joueur les récompenses non encore réclamées d'une quête terminée (obj = quête ou tâche).
// Les récompenses « au choix » (ChoiceReward) demandent l'interface : laissées au joueur.
var FTB_QUEST_CL = null, FTB_TASK_CL = null, FTB_CHOIX_CL = null
function ftbDonnerRecompenses(joueur, td, obj) {
  try {
    if (!FTB_QUEST_CL) {
      FTB_QUEST_CL = Java.loadClass('dev.ftb.mods.ftbquests.quest.Quest'); FTB_TASK_CL = Java.loadClass('dev.ftb.mods.ftbquests.quest.task.Task')
      try { FTB_CHOIX_CL = Java.loadClass('dev.ftb.mods.ftbquests.quest.reward.ChoiceReward') } catch (eC) {}
    }
    var quete = null
    if (obj instanceof FTB_QUEST_CL) quete = obj
    else if (obj instanceof FTB_TASK_CL) quete = obj.getQuest()
    if (!quete || !td.isCompleted(quete)) return 0
    var n = 0
    var it = quete.getRewards().iterator()
    while (it.hasNext()) {
      var r = it.next()
      try {
        if (FTB_CHOIX_CL && r instanceof FTB_CHOIX_CL) continue   // getClass() est bloqué par KubeJS : test par instanceof
        if (td.isRewardClaimed(joueur.uuid, r) || td.isRewardBlocked(r)) continue
        td.claimReward(joueur, r, true)
        n++
      } catch (eR) { console.error('[ftb_aide] récompense ' + quete.getCodeString() + ' : ' + eR) }
    }
    if (n > 0) console.info('[ftb_aide] ' + joueur.username + ' : ' + n + ' récompense(s) de la quête ' + quete.getCodeString() + ' données')
    return n
  } catch (e) { console.error('[ftb_aide] récompenses : ' + e); return 0 }
}

// Quêtes de bienvenue (bienvenue.snbt) : leurs récompenses sont données automatiquement dès que la quête est terminée,
// y compris pour les joueurs qui l'ont terminée avant ce correctif (vérification toutes les 5 s, joueurs en ligne).
var FTB_AUTO_RECOMPENSES = ['4A487E4B62868085', '7C4CFD68DA0E88CA', '7D707B3002C50AA5']
ServerEvents.tick(function (event) {
  var server = event.server
  if (server.tickCount % 100 !== 37) return
  try {
    var file = Java.loadClass('dev.ftb.mods.ftbquests.quest.ServerQuestFile').INSTANCE
    if (!file) return
    var ps = server.players
    for (var i = 0; i < ps.length; i++) {
      var td = file.getTeamData(ps[i])
      if (!td.isPresent()) continue
      for (var q = 0; q < FTB_AUTO_RECOMPENSES.length; q++) {
        var obj = ftbObjet(file, FTB_AUTO_RECOMPENSES[q])
        if (obj) ftbDonnerRecompenses(ps[i], td.get(), obj)
      }
    }
  } catch (e) {}
})

function ftbReinitialiser(joueur) {
  try {
    var SQF = Java.loadClass('dev.ftb.mods.ftbquests.quest.ServerQuestFile')
    var PC = Java.loadClass('dev.ftb.mods.ftbquests.util.ProgressChange')
    var file = SQF.INSTANCE
    var donnees = file.getTeamData(joueur)
    if (!donnees.isPresent()) return false
    file.forceProgress(donnees.get(), new PC(file, joueur.uuid).setReset(true))
    return true
  } catch (e) {
    console.error('[ftb_aide] reinit : ' + e)
    return false
  }
}
