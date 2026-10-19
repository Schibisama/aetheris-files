// Diagnostic : classe les armes par points d'attaque (écrit dans logs/latest.log au chargement du monde et à chaque /reload).
// À placer dans : <instance>/kubejs/server_scripts/classes_dump_armes.js  (puis /reload) ; à supprimer ensuite.
// Cherche dans le log les lignes « [armes] ».

var ARM_NB_LIGNES = 80
var ARM_FAIT = false

function armChaine(x) { return String(x) }

function armLireArme(item, id) {
  var degats = 0
  var vitesse = 0
  var aDegats = false
  var pile = item.getDefaultInstance()
  var mods = pile.getAttributeModifiers().modifiers()
  var it = mods.iterator()
  while (it.hasNext()) {
    var entree = it.next()
    var attribut = armChaine(entree.attribute().unwrapKey().get().location())
    var mod = entree.modifier()
    var op = armChaine(mod.operation())
    if (op.indexOf('ADD_VALUE') === -1) continue
    if (attribut.indexOf('attack_damage') !== -1 && attribut.indexOf('spell') === -1) { degats += mod.amount(); aDegats = true }
    else if (attribut.indexOf('attack_speed') !== -1) { vitesse += mod.amount() }
  }
  if (!aDegats) return null
  return { id: id, degats: degats + 1, vitesse: 4 + vitesse }
}

function armClasseDe(id) {
  try {
    var r = restriction(id)
    if (!r) return 'libre'
    if (r.classes.length === 0) return 'DÉSACTIVÉ'
    return r.classes.join(' / ')
  } catch (e) { return '?' }
}

function armDumpArmes(server) {
  if (ARM_FAIT) return
  ARM_FAIT = true
  var BI = Java.loadClass('net.minecraft.core.registries.BuiltInRegistries')
  var reg = BI.ITEM
  var cles = reg.keySet().iterator()
  var armes = []
  while (cles.hasNext()) {
    var rl = cles.next()
    var id = armChaine(rl)
    try {
      var arme = armLireArme(reg.get(rl), id)
      if (arme && arme.degats > 2) armes.push(arme)
    } catch (e) {}
  }
  armes.sort(function (a, b) { return b.degats - a.degats })
  console.info('[armes] ' + armes.length + ' objets avec des dégâts d\'attaque (>2 pts, main nue = 1). Top ' + ARM_NB_LIGNES + ' :')
  for (var i = 0; i < armes.length && i < ARM_NB_LIGNES; i++) {
    var a = armes[i]
    var dps = Math.round(a.degats * a.vitesse * 100) / 100
    console.info('[armes] #' + (i + 1) + ' ' + a.id + ' | attaque ' + (Math.round(a.degats * 100) / 100) + ' | vitesse ' + (Math.round(a.vitesse * 100) / 100) + ' | dégâts/s ' + dps + ' | ' + armClasseDe(a.id))
  }
}

// Lancé au premier tick qui suit le chargement (le /reload ne déclenche pas « loaded »).
ServerEvents.tick(function (event) {
  if (ARM_FAIT) return
  try { armDumpArmes(event.server) } catch (e) { ARM_FAIT = true; console.error('[armes] ' + e) }
})
