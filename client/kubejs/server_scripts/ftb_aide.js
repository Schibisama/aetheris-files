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

function ftbCompleter(joueur, idHex) {
  try {
    var SQF = Java.loadClass('dev.ftb.mods.ftbquests.quest.ServerQuestFile')
    var PC = Java.loadClass('dev.ftb.mods.ftbquests.util.ProgressChange')
    var file = SQF.INSTANCE
    if (!file) { console.error('[ftb_aide] fichier de quêtes indisponible'); return false }
    var obj = ftbObjet(file, idHex)
    if (!obj) { console.error('[ftb_aide] objet de quête introuvable : ' + idHex); return false }
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
