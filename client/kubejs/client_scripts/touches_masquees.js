// Côté client : masque dans « Contrôles » les catégories de touches inutiles aux joueurs.
// Les touches restent actives ; elles ne sont simplement plus listées.
// Ajoute aussi une barre de recherche de sorts dans le Codex (Spell Codex de Specs) : voir en bas du fichier.
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

// ── Barre de recherche de sorts dans le Codex (Spell Codex de Specs) ──
// Tape un mot : le Codex n'affiche plus que les sorts dont le nom (ou l'identifiant) le contient. Sans accents, majuscules ignorées.
// Fonctionnement : on ajoute temporairement les sorts qui ne correspondent pas à la liste noire du Codex côté client
// (ClientModConfigCache), puis on remet la liste d'origine à la fermeture du Codex. Rien n'est envoyé au serveur.
var CR = { cadre: null, boite: null, texte: '', origine: null, actif: false, err: false }
var CR_CACHE = null, CR_SR = null, CR_SET = null, CR_MAP = null

// Couleurs du Codex (fond violet très sombre, liseré doré)
var CR_FOND = (0xF0140E1C | 0), CR_OR = (0xFFB8914E | 0), CR_OR_SOMBRE = (0xFF5E4A2A | 0), CR_OR_CLAIR = 0xE8CC8A
function crTrouverRespec(ecran) {
  try {
    var enfants = ecran.children()
    for (var i = 0; i < enfants.size(); i++) {
      var w = enfants.get(i)
      try { if (String(w.getMessage().getString()).toLowerCase().indexOf('respec') !== -1) return w } catch (e) {}
    }
  } catch (e2) { crLog('respec : ' + e2) }
  return null
}
function crEstCodex(ecran) { return ecran && String(ecran).indexOf('SpecsSpellHudScreen') !== -1 }
function crLog(m) { if (!CR.err) { CR.err = true; console.error('[recherche_codex] ' + m) } }
function crClasses() {
  if (CR_CACHE) return
  CR_CACHE = Java.loadClass('com.specs.irons_spellbooks.config.ClientModConfigCache')
  CR_SR = Java.loadClass('io.redspace.ironsspellbooks.api.registry.SpellRegistry')
  CR_SET = Java.loadClass('java.util.HashSet')
  CR_MAP = Java.loadClass('java.util.HashMap')
}
function crSauver() {
  if (CR.origine) return
  CR.origine = {
    bl: new CR_SET(CR_CACHE.blacklistView()), sbl: new CR_SET(CR_CACHE.schoolBlacklistView()),
    sc: new CR_MAP(CR_CACHE.schoolCostsView()), spc: new CR_MAP(CR_CACHE.spellCostsView()),
    r: CR_CACHE.respecRefundPercent(), ic: CR_CACHE.includeCreativeSpells(), ai: CR_CACHE.allowImbuedWeaponCasting(), s: CR_CACHE.defaultActionbarSlots()
  }
}
function crAppliquer(bl) {
  var o = CR.origine
  CR_CACHE.apply(bl, new CR_SET(o.sbl), new CR_MAP(o.sc), new CR_MAP(o.spc), o.r, o.ic, o.ai, o.s)
}
function crRestaurer() {
  try {
    if (!CR.origine) return
    if (CR.actif) crAppliquer(new CR_SET(CR.origine.bl))
  } catch (e) { crLog('restauration : ' + e) }
  CR.origine = null
  CR.actif = false
}
function crNomSort(sp) {
  var n = ''
  try { n = String(Text.translate(sp.getComponentId()).getString()) } catch (e) {}
  return tmNorm(n.replace(/§./g, '') + ' ' + String(sp.getSpellResource()))
}
function crFiltrer(texte) {
  try {
    crClasses()
    CR.texte = String(texte || '')
    var mot = tmNorm(CR.texte).trim()
    if (!mot) { if (CR.actif) { crAppliquer(new CR_SET(CR.origine.bl)); CR.actif = false } return }
    crSauver()
    var bl = new CR_SET(CR.origine.bl)
    var tous = CR_SR.getEnabledSpells()
    for (var i = 0; i < tous.size(); i++) {
      var sp = tous.get(i)
      if (crNomSort(sp).indexOf(mot) === -1) bl.add(sp.getSpellResource())
    }
    crAppliquer(bl)
    CR.actif = true
  } catch (e) { crLog('filtre : ' + e) }
}

try {
  NativeEvents.onEvent(Java.loadClass('net.neoforged.neoforge.client.event.ScreenEvent$Init$Post'), function (e) {
    try {
      var ecran = e.getScreen()
      if (!crEstCodex(ecran)) return
      var mc = Java.loadClass('net.minecraft.client.Minecraft').getInstance()
      var EditBox = Java.loadClass('net.minecraft.client.gui.components.EditBox')
      // Placement : juste au-dessus du bouton « Respec », dans le cadre du Codex (repli : au-dessus du Codex)
      var respec = crTrouverRespec(ecran)
      var larg = 140, haut = 12, x, y
      if (respec) {
        larg = respec.getWidth(); x = respec.getX(); y = respec.getY() - haut - 3
      } else {
        x = ecran.getGuiLeft(); y = ecran.getGuiTop() - 16
        if (y < 2) y = ecran.height - 18
      }
      CR.cadre = { x: x, y: y, l: larg, h: haut }
      var boite = new EditBox(mc.font, x + 4, y + 2, larg - 8, haut - 2, Text.of('Recherche'))
      boite.setBordered(false)                 // le cadre est dessiné à la main, aux couleurs du Codex
      boite.setTextColor(CR_OR_CLAIR)
      boite.setMaxLength(40)
      boite.setHint(Java.loadClass('net.minecraft.network.chat.Component').literal('Rechercher un sort...').withColor(0x8C7A55))
      boite.setValue(CR.texte)
      boite.setResponder(function (t) { crFiltrer(t) })
      e.addListener(boite)
      CR.boite = boite
      if (CR.texte) crFiltrer(CR.texte)
    } catch (err) { crLog('barre : ' + err) }
  })
  // Cadre de la barre, dessiné par-dessus le Codex, puis la barre elle-même au premier plan
  NativeEvents.onEvent(Java.loadClass('net.neoforged.neoforge.client.event.ScreenEvent$Render$Post'), function (e) {
    try {
      if (!CR.boite || !CR.cadre || !crEstCodex(e.getScreen())) return
      var g = e.getGuiGraphics(), c = CR.cadre
      var or = CR.boite.isFocused() ? CR_OR : CR_OR_SOMBRE
      g.pose().pushPose()
      g.pose().translate(0, 0, 300)
      g.fill(c.x, c.y, c.x + c.l, c.y + c.h, or)
      g.fill(c.x + 1, c.y + 1, c.x + c.l - 1, c.y + c.h - 1, CR_FOND)
      CR.boite.render(g, e.getMouseX(), e.getMouseY(), e.getPartialTick())
      g.pose().popPose()
    } catch (err) { crLog('rendu : ' + err) }
  })
  // Tant que la barre a le focus, les touches vont au texte (sinon « E » fermerait le Codex). Échap fonctionne toujours.
  NativeEvents.onEvent(Java.loadClass('net.neoforged.neoforge.client.event.ScreenEvent$KeyPressed$Pre'), function (e) {
    try {
      if (!CR.boite || !crEstCodex(e.getScreen()) || !CR.boite.isFocused()) return
      if (e.getKeyCode() === 256) return
      CR.boite.keyPressed(e.getKeyCode(), e.getScanCode(), e.getModifiers())
      e.setCanceled(true)
    } catch (err) { crLog('touches : ' + err) }
  })
  NativeEvents.onEvent(Java.loadClass('net.neoforged.neoforge.client.event.ScreenEvent$Closing'), function (e) {
    try {
      if (!crEstCodex(e.getScreen())) return
      crRestaurer()
      CR.boite = null
      CR.cadre = null
      CR.texte = ''
    } catch (err) { crLog('fermeture : ' + err) }
  })
  console.log('[recherche_codex] barre de recherche du Codex prête')
} catch (err) {
  console.log('[recherche_codex] indisponible : ' + err)
}
