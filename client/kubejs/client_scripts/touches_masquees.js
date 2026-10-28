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

    // Touches triées comme le fait la liste vanilla. Le tri est fait ici, en JavaScript (tri fusion stable) :
    // Collections.sort ne triait pas la liste dans le jeu (le journal montrait l'ordre d'enregistrement).
    var brutes = Minecraft.getInstance().options.keyMappings
    var tab = []
    for (var z = 0; z < brutes.length; z++) tab.push(brutes[z])
    var fusion = function (xs) {
      if (xs.length < 2) return xs
      var m = Math.floor(xs.length / 2), g = fusion(xs.slice(0, m)), d = fusion(xs.slice(m)), r = [], i1 = 0, j1 = 0
      while (i1 < g.length && j1 < d.length) { if (d[j1].compareTo(g[i1]) < 0) r.push(d[j1++]); else r.push(g[i1++]) }
      while (i1 < g.length) r.push(g[i1++])
      while (j1 < d.length) r.push(d[j1++])
      return r
    }
    tab = fusion(tab)
    // Catégories dans l'ordre d'affichage, avec le nombre de touches de chacune.
    var cats = [], tailles = [], derniere = null
    for (var k = 0; k < tab.length; k++) {
      var c = String(tab[k].getCategory())
      if (c !== derniere) { cats.push(c); tailles.push(0); derniere = c }
      tailles[tailles.length - 1]++
    }

    // Blocs réellement affichés : une « CategoryEntry » suivie de ses touches.
    var entrees = liste.children()
    var toutes = new ListeJava(entrees)
    var blocs = []
    for (var q = 0; q < toutes.size(); q++) {
      if (String(toutes.get(q)).indexOf('CategoryEntry') >= 0) blocs.push(0)
      else if (blocs.length > 0) blocs[blocs.length - 1]++
    }
    // Contrôle d'alignement : mêmes catégories, mêmes effectifs, même ordre. Sinon on ne masque rien (jamais de mauvaise cible).
    var aligne = blocs.length === cats.length
    for (var u = 0; aligne && u < blocs.length; u++) if (blocs[u] !== tailles[u]) aligne = false
    if (!aligne) {
      console.log('[touches_masquees] alignement impossible : affichées ' + JSON.stringify(blocs) + ' / attendues ' + JSON.stringify(tailles))
      bouton.setMessage(Component.literal(tmTexte('Touches cachées : alignement impossible')))
      return
    }

    var gardees = new ListeJava()
    var ci = -1, masquer = false, vues = {}, nbMasquees = 0
    for (var q2 = 0; q2 < toutes.size(); q2++) {
      var en = toutes.get(q2)
      if (String(en).indexOf('CategoryEntry') >= 0) {
        ci++
        var nom = I18n.get(cats[ci])
        masquer = tmMasquee(nom)
        vues[nom] = masquer
      }
      if (masquer) nbMasquees++
      else gardees.add(en)
    }
    if (!tmApercu.fait) {
      tmApercu.fait = true
      console.log('[touches_masquees] ' + cats.length + ' catégories alignées, entrées ' + toutes.size() + ', masquées ' + nbMasquees + ' : ' + JSON.stringify(vues))
    }

    appliquer = function () {
      var cible = tmTout ? toutes : gardees
      entrees.clear()
      entrees.addAll(cible)
      var reel = liste.children().size()
      if (reel !== cible.size()) {
        console.log('[touches_masquees] la liste n\'a pas pris la modification (' + reel + ' / ' + cible.size() + ')')
        bouton.setMessage(Component.literal(tmTexte('Touches cachées : modification refusée')))
        return
      }
      try { liste.setScrollAmount(0) } catch (x1) {}
    }
    appliquer()
    console.log('[touches_masquees] liste après filtrage : ' + liste.children().size() + ' entrées')
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
