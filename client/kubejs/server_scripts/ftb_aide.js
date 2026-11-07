// Aide FTB Quests : coche (ou remet à zéro) une quête / tâche pour un joueur, sans passer par la commande /ftbquests
// (cette commande est refusée quand elle vient du serveur : elle exige un joueur éditeur).
// Utilisée par pnj_parler.js, boss_zones.js, zone_pirates.js, livraison_quetes.js, decouverte_lieux.js, reinit_joueur.js.
// ftbCompleter(joueur, idHex) -> true si fait ; ftbReinitialiser(joueur) -> true si fait. Rechargement : /reload

function ftbObjet(file, idHex) {
  var QOB = Java.loadClass('dev.ftb.mods.ftbquests.quest.QuestObjectBase')
  var id = QOB.parseHexId(String(idHex))
  if (!id.isPresent()) return null
  return file.getBase(id.get())
}

// ───────── Chapitre « Les Épreuves d'Aetheris » (epreuves.snbt) : quêtes cochées par les scripts ─────────
var FTB_EPREUVES = {
  vroom_defi: '71073031615B7D58',
  vroom_fini: '08C3BAB2CEC79213',
  course_groupe: 'BB516E65265EDE5B',
  equipe: '4FF51C699BA759FC',
  duel_gagne: 'FCA34FC83E6CAABC',
  equipe_points: 'B022777F37B1584A',
  parchemin: 'FCA07F5D1244E52A',
  etoile: '4FB9581E8EA1269F',
  destin: '2682F634108B9A50',
  nether: '668F3EAF369511C4',
  purge: '4867D999133483CC',
  course_rapide: 'CC88675BDC65A959',
  boss: 'C98C76C2FC4CD776'
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
    return true
  } catch (e) {
    console.error('[ftb_aide] ' + idHex + ' : ' + e)
    return false
  }
}

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
