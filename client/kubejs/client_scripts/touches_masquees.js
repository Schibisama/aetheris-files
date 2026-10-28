// Côté client : masque dans « Contrôles » les catégories de touches inutiles aux joueurs.
// Les touches restent actives ; elles ne sont simplement plus listées.
// Pour masquer/afficher une catégorie, modifier TM_MASQUER (fragments du nom affiché, en minuscules, sans accents).
var TM_MASQUER = [
  'mode creatif', 'creative mode',
  'ftb quest', 'ftb teams', 'ftn quest',
  'spelllib', 'gtbc',
  'golem overhaul',
  'hazen',
  'jei cheat', 'jei dev', 'jei edit',
  'kubejs',
  'simply tooltips',
  'supplementaries'
]
// Mots entiers (évite d'attraper un autre nom contenant ces lettres)
var TM_MOTS = [/\bjei\b/]

function tmNorm(s) {
  return String(s).toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '')
}

function tmMasquee(nom) {
  var n = tmNorm(nom)
  for (var i = 0; i < TM_MASQUER.length; i++) if (n.indexOf(TM_MASQUER[i]) >= 0) return true
  for (var j = 0; j < TM_MOTS.length; j++) if (TM_MOTS[j].test(n)) return true
  return false
}

var tmTout = false // true = tout afficher (bouton en haut à gauche de l'écran Contrôles)

// Sur cet écran, Screen#resize ne relance PAS l'initialisation : le bouton remplace donc directement le contenu de la liste.
function tmTexte(etat) { return etat || (tmTout ? 'Touches cachées : visibles' : 'Touches cachées : masquées') }

function tmAppliquer(e) {
  var ecran = null, bouton = null
  try {
    ecran = e.getScreen()
    if (String(ecran).indexOf('KeyBindsScreen') < 0) return
    tmTout = false
    var Button = Java.loadClass('net.minecraft.client.gui.components.Button')
    var Component = Java.loadClass('net.minecraft.network.chat.Component')
    var ListeJava = Java.loadClass('java.util.ArrayList')

    // Le bouton est créé en premier : il apparaît même si le filtrage échoue (son texte le dit alors).
    var appliquer = function () {}
    bouton = Button.builder(Component.literal(tmTexte()), function (btn) {
      try {
        tmTout = !tmTout
        appliquer()
        bouton.setMessage(Component.literal(tmTexte()))
      } catch (err2) { console.log('[touches_masquees] erreur bouton : ' + err2) }
    }).bounds(6, 6, 150, 20).build()
    e.addListener(bouton)

    var liste = null
    var enfants = ecran.children()
    for (var i = 0; i < enfants.size(); i++) {
      if (String(enfants.get(i)).indexOf('KeyBindsList') >= 0) { liste = enfants.get(i); break }
    }
    if (liste == null) { console.log('[touches_masquees] liste de touches introuvable'); bouton.setMessage(Component.literal(tmTexte('Touches cachées : liste introuvable'))); return }

    var Minecraft = Java.loadClass('net.minecraft.client.Minecraft')
    var I18n = Java.loadClass('net.minecraft.client.resources.language.I18n')

    // Catégories dans l'ordre d'affichage (touches triées comme le fait la liste vanilla).
    var brutes = Minecraft.getInstance().options.keyMappings
    var touches = new ListeJava()
    for (var z = 0; z < brutes.length; z++) touches.add(brutes[z])
    Java.loadClass('java.util.Collections').sort(touches)
    var cats = [], derniere = null
    for (var k = 0; k < touches.size(); k++) {
      var c = String(touches.get(k).getCategory())
      if (c !== derniere) { cats.push(c); derniere = c }
    }

    // On parcourt les entrées : chaque « CategoryEntry » ouvre la catégorie suivante, les autres entrées lui appartiennent.
    var entrees = liste.children()
    var toutes = new ListeJava(entrees)
    var gardees = new ListeJava()
    var ci = -1, masquer = false, vues = {}, nbCat = 0, nbMasquees = 0
    for (var q = 0; q < toutes.size(); q++) {
      var en = toutes.get(q)
      if (String(en).indexOf('CategoryEntry') >= 0) {
        ci++; nbCat++
        var nom = ci < cats.length ? I18n.get(cats[ci]) : ''
        masquer = nom !== '' && tmMasquee(nom)
        vues[nom] = masquer
      }
      if (masquer) nbMasquees++
      else gardees.add(en)
    }
    if (nbCat !== cats.length) console.log('[touches_masquees] attention : ' + nbCat + ' catégories affichées, ' + cats.length + ' attendues')
    if (!tmApercu.fait) {
      tmApercu.fait = true
      console.log('[touches_masquees] entrées ' + toutes.size() + ', masquées ' + nbMasquees + ', catégories (true = masquée) : ' + JSON.stringify(vues))
    }

    appliquer = function () {
      entrees.clear()
      entrees.addAll(tmTout ? toutes : gardees)
      try { liste.setScrollAmount(0) } catch (x1) {}
    }
    appliquer()
  } catch (err) {
    console.log('[touches_masquees] erreur : ' + err)
    try { if (bouton) bouton.setMessage(Java.loadClass('net.minecraft.network.chat.Component').literal(tmTexte('Touches cachées : erreur (voir log)'))) } catch (x) {}
  }
}
var tmApercu = { fait: false }

// Événement d'ouverture d'un écran (confirmé par le journal : il se déclenche pour chaque écran).
// NB : getClass() n'existe pas dans Rhino ; on identifie les écrans et les listes avec String(objet).
try {
  NativeEvents.onEvent(Java.loadClass('net.neoforged.neoforge.client.event.ScreenEvent$Init$Post'), function (e) {
    try {
      if (!tmApercu.ecrans) tmApercu.ecrans = 0
      if (tmApercu.ecrans < 3) { tmApercu.ecrans++; console.log('[touches_masquees] écran ouvert : ' + String(e.getScreen())) }
    } catch (err0) {}
    tmAppliquer(e)
  })
  console.log('[touches_masquees] chargé')
} catch (err) {
  console.log('[touches_masquees] événement indisponible : ' + err)
}
