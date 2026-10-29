// Quête FTB « Découverte des lieux » : visiter chaque lieu coche sa tâche FTB (chapitre decouverte_lieux).
// Zone = sphère de diamètre `d` (+ tolérance) autour du point. Idempotent : si le joueur est dans la zone, la tâche est (re)cochée, aucune donnée à réinitialiser.
// Rechargement : /reload

var DL_TOLERANCE = 2
var DL_LIEUX = [
  { cle: 'retenue', nom: "Salle de retenue", ftb: '7EEB8A1EC9332A30', d: 10, points: [[1087, 510, 1349]] },
  { cle: 'bibliotheque', nom: "Bibliothèque", ftb: 'A983694D1B428F3E', d: 10, points: [[1056, 500, 1371]] },
  { cle: 'classe', nom: "Salle de classe", ftb: '50E86C2C5F2CA963', d: 13, points: [[1086, 543, 1350]] },
  { cle: 'dortoirs', nom: "Dortoirs", ftb: '5310F88053FC3FCD', d: 10, points: [[1088, 502, 1280]] },
  { cle: 'cour', nom: "Cour de récréation", ftb: 'CEAB11B9D49FC08F', d: 15, points: [[1044, 482, 1279]] },
  { cle: 'colisee', nom: "Le Colisée", ftb: 'BF54A2989D5E52E2', d: 20, points: [[-162, 70, 851]] },
  { cle: 'village', nom: "Le village", ftb: 'A3C6439EDC106B45', d: 30, points: [[1169, 74, 463]] },
  { cle: 'auberge', nom: "L'auberge", ftb: 'DFB81DF82A180422', d: 20, points: [[1228, 140, 871]] },
  { cle: 'utgard', nom: "Utgard", ftb: '5F969F1A6E7C618C', d: 20, points: [[1634, 121, 1778]] },
  { cle: 'halloween', nom: "Spooky Island", ftb: '8FC9D640075FCC2E', d: 20, points: [[2934, 95, 1492]] },
  { cle: 'morrow', nom: "Le Sculk Castle (Capitaine Morrow)", ftb: 'FB086DFEDE1589CA', d: 30, points: [[1330, 66, -12843], [1328, 66, -13094]] }
]

ServerEvents.tick(function (event) {
  var serveur = event.server
  if (serveur.tickCount % 40 !== 0) return
  var joueurs = serveur.players
  for (var i = 0; i < joueurs.length; i++) {
    var j = joueurs[i]
    if (j.spectator) continue
    var px = j.x, py = j.y, pz = j.z
    for (var k = 0; k < DL_LIEUX.length; k++) {
      var l = DL_LIEUX[k]
      var r = l.d / 2 + DL_TOLERANCE
      for (var m = 0; m < l.points.length; m++) {
        var p = l.points[m]
        var dx = px - p[0], dy = py - p[1], dz = pz - p[2]
        if (dx * dx + dy * dy + dz * dz > r * r) continue
        try { serveur.runCommandSilent('ftbquests change_progress ' + j.username + ' complete ' + l.ftb) } catch (e) {}
        var cle = 'lieu_' + l.cle
        if (!j.persistentData.getBoolean(cle)) {
          j.persistentData.putBoolean(cle, true)
          j.tell(Text.of('§6Lieu découvert : §e' + l.nom))
        }
        break
      }
    }
  }
})
