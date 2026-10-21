// Traduction française -> anglaise des noms de classes et des libellés, pour les joueurs dont le jeu n'est pas en français.
// À placer dans : <instance>/kubejs/client_scripts/aaa_traduction.js  (se charge en premier : ordre alphabétique)
// Les autres scripts client appellent langueAnglaise() et traduireEN().

var CLASSES_EN = {
  'Électro-Sorcier': 'Electro-Sorcerer',
  'Voyageur du Vide': 'Void Traveler',
  'Pyromancien': 'Pyromancer',
  'Cryomancien': 'Cryomancer',
  'Paladin': 'Paladin',
  'Prêtre': 'Paladin',
  'Hémomancien': 'Hemomancer',
  'Druide': 'Druid',
  'Évocateur': 'Evoker',
  'Chronomancien': 'Chronomancer',
  'Géomancien': 'Geomancer',
  'Aéromancien': 'Aeromancer',
  'Chromancien': 'Chromancer',
  'Hydromancien': 'Hydromancer',
  'Nécromancien': 'Necromancer',
  'Réprouvé': 'Reprobate',
  'Envoûteur': 'Hexer',
  'Ésotériste': 'Esotericist',
  'Astromancien': 'Astromancer',
  'Spiritualiste': 'Spiritualist',
  'Symétriste': 'Symmetrist',
  'Technomancien': 'Technomancer'
}
var LIBELLES_EN = [
  ['Classe : objet désactivé', 'Class: item disabled'],
  ['Classe : ', 'Class: '],
  ['Classe :', 'Class:'],
  ['Désactivée', 'Disabled'],
  ['Désactivé', 'Disabled']
]

// true si le jeu n'est PAS en français (les autres langues retombent sur l'anglais).
function langueAnglaise() {
  try {
    var code = String(Java.loadClass('net.minecraft.client.Minecraft').getInstance().options.languageCode)
    return code.toLowerCase().indexOf('fr') !== 0
  } catch (e) {
    return false
  }
}

function traduireEN(texte) {
  var t = String(texte)
  for (var i = 0; i < LIBELLES_EN.length; i++) t = t.split(LIBELLES_EN[i][0]).join(LIBELLES_EN[i][1])
  var noms = Object.keys(CLASSES_EN).sort(function (a, b) { return b.length - a.length })
  for (var j = 0; j < noms.length; j++) t = t.split(noms[j]).join(CLASSES_EN[noms[j]])
  return t
}
