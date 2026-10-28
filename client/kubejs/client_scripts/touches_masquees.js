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

function tmBouton(e, ecran) {
  var Button = Java.loadClass('net.minecraft.client.gui.components.Button')
  var Component = Java.loadClass('net.minecraft.network.chat.Component')
  var Minecraft = Java.loadClass('net.minecraft.client.Minecraft')
  var texte = tmTout ? 'Touches cachées : visibles' : 'Touches cachées : masquées'
  var b = Button.builder(Component.literal(texte), function (btn) {
    tmTout = !tmTout
    ecran.resize(Minecraft.getInstance(), ecran.width, ecran.height)
  }).bounds(6, 6, 150, 20).build()
  e.addListener(b)
}

function tmAppliquer(e) {
  try {
    var ecran = e.getScreen()
    if (String(ecran.getClass().getName()).indexOf('KeyBindsScreen') < 0) return
    tmBouton(e, ecran)
    if (tmTout) return
    var liste = null
    var enfants = ecran.children()
    for (var i = 0; i < enfants.size(); i++) {
      if (String(enfants.get(i).getClass().getName()).indexOf('KeyBindsList') >= 0) { liste = enfants.get(i); break }
    }
    if (liste == null) { console.log('[touches_masquees] liste de touches introuvable'); return }

    var Minecraft = Java.loadClass('net.minecraft.client.Minecraft')
    var I18n = Java.loadClass('net.minecraft.client.resources.language.I18n')
    var Arrays = Java.loadClass('java.util.Arrays')
    var touches = Arrays.copyOf(Minecraft.getInstance().options.keyMappings, Minecraft.getInstance().options.keyMappings.length)
    Arrays.sort(touches)

    // Même ordre que la liste affichée : une entrée de catégorie, puis ses touches.
    var entrees = liste.children()
    var idx = 0, cat = null, masquer = false, aRetirer = [], vues = {}
    for (var k = 0; k < touches.length; k++) {
      var c = String(touches[k].getCategory())
      if (c !== cat) {
        cat = c
        masquer = tmMasquee(I18n.get(c))
        vues[I18n.get(c)] = masquer
        if (masquer) aRetirer.push(idx)
        idx++
      }
      if (masquer) aRetirer.push(idx)
      idx++
    }
    if (idx !== entrees.size()) { console.log('[touches_masquees] ordre inattendu (' + idx + ' / ' + entrees.size() + '), rien masqué'); return }
    for (var r = aRetirer.length - 1; r >= 0; r--) entrees.remove(aRetirer[r])
    if (!tmApercu.fait) {
      tmApercu.fait = true
      console.log('[touches_masquees] catégories (true = masquée) : ' + JSON.stringify(vues))
    }
  } catch (err) {
    console.log('[touches_masquees] erreur : ' + err)
  }
}
var tmApercu = { fait: false }

try {
  NativeEvents.onEvent(Java.loadClass('net.neoforged.neoforge.client.event.ScreenEvent$Init$Post'), tmAppliquer)
  console.log('[touches_masquees] chargé')
} catch (err) {
  console.log('[touches_masquees] événement indisponible : ' + err)
}
