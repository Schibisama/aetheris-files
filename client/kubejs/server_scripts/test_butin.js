// /testbutin <nombre> <table | tout | préfixe> (op) : simule l'ouverture de N coffres et mesure ce qui sort.
//   /testbutin 500 minecraft:chests/simple_dungeon     -> une table précise, 500 coffres
//   /testbutin 100 irons_spellbooks                    -> toutes les tables de coffres dont l'identifiant commence par ce texte
//   /testbutin 50 tout                                 -> TOUTES les tables de coffres (peut prendre quelques secondes, fait par petits paquets)
// Chaque coffre est tiré comme en jeu (modificateurs de butin des mods compris : bijoux, pages de Codex, Simply Swords...),
// puis passe par les MÊMES filtres que l'ouverture réelle : classes_desactives.js (objets désactivés / craft seulement / parchemins
// interdits) puis armures_butin.js (armures, pages de Codex, parchemins Réprouvé, autres objets rares).
// Sortie : un résumé dans le chat + le rapport complet dans le log du serveur (latest.log et logs/kubejs/server.log).
// Limites : les coffres LootR « par joueur » et la pitié des armes uniques Simply Swords (compteur par joueur) ne sont pas simulés.
// Rechargement : /reload

var TB_REG = null
function tbInit() {
  if (TB_REG) return TB_REG
  TB_REG = {
    ResourceKey: Java.loadClass('net.minecraft.resources.ResourceKey'),
    Registries: Java.loadClass('net.minecraft.core.registries.Registries'),
    RL: Java.loadClass('net.minecraft.resources.ResourceLocation'),
    Builder: Java.loadClass('net.minecraft.world.level.storage.loot.LootParams$Builder'),
    LCP: Java.loadClass('net.minecraft.world.level.storage.loot.parameters.LootContextParams'),
    LCPS: Java.loadClass('net.minecraft.world.level.storage.loot.parameters.LootContextParamSets'),
    Vec3: Java.loadClass('net.minecraft.world.phys.Vec3'),
    Armor: Java.loadClass('net.minecraft.world.item.ArmorItem'),
    Sword: Java.loadClass('net.minecraft.world.item.SwordItem'),
    Axe: Java.loadClass('net.minecraft.world.item.AxeItem'),
    Proj: Java.loadClass('net.minecraft.world.item.ProjectileWeaponItem'),
    Trident: Java.loadClass('net.minecraft.world.item.TridentItem'),
    JD: null,
    SR: Java.loadClass('io.redspace.ironsspellbooks.api.registry.SpellRegistry')
  }
  try { TB_REG.JD = Java.loadClass('io.redspace.ironsjewelry.core.data.JewelryData') } catch (e) {}
  return TB_REG
}

var TB_ARME_NOM = /(sword|axe|bow|crossbow|dagger|spear|scythe|hammer|katana|halberd|claymore|rapier|mace|staff|trident|longsword|glaive|lance|cutlass|whip|club|wand)/
var TB_QUALITE_MAX = 1.5

function tbQualiteBijou(pile) {
  try {
    var R = tbInit()
    if (!R.JD || !R.JD.has(pile)) return null
    var d = R.JD.get(pile)
    var p = d.pattern().value()
    var q = 1.0
    var opt = p.partForQuality()
    if (opt.isPresent()) {
      var m = d.parts().get(opt.get())
      if (m) q = m.value().quality()
    }
    return p.qualityMultiplier() * q
  } catch (e) { return null }
}

// Catégorie d'une pile : { c: categorie, id: identifiant, extra: ... }
function tbClasser(pile) {
  var R = tbInit()
  var id = String(pile.id)
  var q = tbQualiteBijou(pile)
  if (q !== null) return { c: 'bijou', id: id, q: q }
  if (id === 'specs_irons_spellbooks:codex_page') return { c: 'page_codex', id: id }
  if (id === 'irons_spellbooks:scroll') {
    var rar = '?', repro = false
    try {
      var s = desactSortDuParchemin(pile)
      if (s) {
        var sp = R.SR.getSpell(R.RL.parse(s.id))
        rar = String(sp.getRarity(s.niveau))
      }
    } catch (e) {}
    try { repro = arEstParcheminReprouve(pile) } catch (e2) {}
    return { c: 'parchemin', id: id, rar: rar, repro: repro }
  }
  if (/spell_?book$/.test(id) || /_codex_spell_book/.test(id)) return { c: 'grimoire', id: id }
  try { if (pile.item instanceof R.Armor) return { c: id.indexOf('minecraft:') === 0 ? 'armure_vanilla' : 'armure_mod', id: id } } catch (e3) {}
  var path = id.substring(id.indexOf(':') + 1)
  var estArme = false
  try { estArme = (pile.item instanceof R.Sword) || (pile.item instanceof R.Axe) || (pile.item instanceof R.Proj) || (pile.item instanceof R.Trident) } catch (e4) {}
  if (!estArme && TB_ARME_NOM.test(path) && !/(arrow|spawn|bowl|staff_of_the_cloud)/.test(path)) estArme = true
  if (estArme) return { c: id.indexOf('minecraft:') === 0 ? 'arme_vanilla' : 'arme_mod', id: id }
  return { c: 'autre', id: id }
}

var TB_CATS = ['armure_vanilla', 'armure_mod', 'arme_vanilla', 'arme_mod', 'bijou', 'page_codex', 'parchemin', 'grimoire']

function tbNouveau() {
  var o = { coffres: 0, brut: {}, fin: {}, parCoffre: {}, items: {}, rar: { brut: {}, fin: {} }, repro: { brut: 0, fin: 0 },
            bijouxQual: {}, bijouxTrop: 0, interditsRestants: [], erreurs: 0 }
  for (var i = 0; i < TB_CATS.length; i++) { o.brut[TB_CATS[i]] = 0; o.fin[TB_CATS[i]] = 0; o.parCoffre[TB_CATS[i]] = 0 }
  return o
}

function tbTirer(server, cle) {
  var R = tbInit()
  var niveau = server.overworld()
  var table = server.reloadableRegistries().getLootTable(cle)
  var params = new R.Builder(niveau).withParameter(R.LCP.ORIGIN, new R.Vec3(0, 64, 0)).create(R.LCPS.CHEST)
  return table.getRandomItems(params)
}

function tbCompter(o, cat, bloc, n) {
  if (TB_CATS.indexOf(cat.c) === -1) return
  o[bloc][cat.c] += n
}

function tbSimuler(server, cle, nb, o) {
  var vide = null
  for (var k = 0; k < nb; k++) {
    var vu = {}
    var liste
    try { liste = tbTirer(server, cle) } catch (e) { o.erreurs++; continue }
    o.coffres++
    for (var i = 0; i < liste.size(); i++) {
      var pile = liste.get(i)
      if (!pile || pile.isEmpty()) continue
      var n = pile.count
      var c0 = tbClasser(pile)
      tbCompter(o, c0, 'brut', n)
      if (c0.c === 'parchemin') { o.rar.brut[c0.rar] = (o.rar.brut[c0.rar] || 0) + n; if (c0.repro) o.repro.brut += n }
      // 1) classes_desactives.js
      var cur = pile
      var d1 = desactFiltrerPile(cur)
      if (d1 !== undefined) { cur = d1 }               // null = retirée, sinon pile de remplacement
      if (cur === null) continue
      // 2) armures_butin.js
      var d2 = arFiltrerPile(cur)
      if (d2 === 'retirer') continue
      if (d2) cur = d2
      var c1 = tbClasser(cur)
      var n1 = cur.count
      tbCompter(o, c1, 'fin', n1)
      if (TB_CATS.indexOf(c1.c) !== -1) vu[c1.c] = true
      if (c1.c !== 'autre') o.items[c1.id] = (o.items[c1.id] || 0) + n1
      if (c1.c === 'parchemin') { o.rar.fin[c1.rar] = (o.rar.fin[c1.rar] || 0) + n1; if (c1.repro) o.repro.fin += n1 }
      if (c1.c === 'bijou') {
        var cle2 = (Math.round(c1.q * 100) / 100).toFixed(2)
        o.bijouxQual[cle2] = (o.bijouxQual[cle2] || 0) + n1
        if (c1.q > TB_QUALITE_MAX + 1e-9) o.bijouxTrop += n1
      }
      try { if (desactSansButin(c1.id)) o.interditsRestants.push(c1.id) } catch (e5) {}
    }
    if (Math.random() < AR_PARCHEMIN_AJOUT) {   // parchemin supplémentaire (armures_butin.js)
      var ps = arCreerParchemin()
      if (ps) {
        var c2 = tbClasser(ps)
        tbCompter(o, c2, 'fin', 1)
        tbCompter(o, c2, 'brut', 1)
        vu[c2.c] = true
        if (c2.c === 'parchemin') o.rar.fin[c2.rar] = (o.rar.fin[c2.rar] || 0) + 1
      }
    }
    for (var cc in vu) o.parCoffre[cc]++
  }
}

function tbPct(a, b) { return b > 0 ? (100 * a / b).toFixed(1) + ' %' : '-' }

function tbRapport(o, titre) {
  var L = []
  L.push('=== ' + titre + ' — ' + o.coffres + ' coffre(s) simulé(s)' + (o.erreurs ? ' (' + o.erreurs + ' tirage(s) en erreur)' : '') + ' ===')
  L.push('catégorie            | brut/coffre | final/coffre | conservé | coffres avec ≥1 (final)')
  for (var i = 0; i < TB_CATS.length; i++) {
    var c = TB_CATS[i]
    var b = o.coffres ? o.brut[c] / o.coffres : 0, f = o.coffres ? o.fin[c] / o.coffres : 0
    L.push((c + '                    ').substring(0, 20) + ' | ' + b.toFixed(3) + '       | ' + f.toFixed(3) + '        | ' + tbPct(o.fin[c], o.brut[c]) + '   | ' + tbPct(o.parCoffre[c], o.coffres))
  }
  L.push('')
  L.push('Contrôles :')
  L.push('  - bijoux de qualité > ' + TB_QUALITE_MAX + ' dans le butin final : ' + o.bijouxTrop + (o.bijouxTrop === 0 ? '  [OK]' : '  [À CORRIGER]'))
  var q = []
  for (var k in o.bijouxQual) q.push(k + ' x' + o.bijouxQual[k])
  q.sort()
  L.push('    répartition des qualités de bijoux : ' + (q.length ? q.join(', ') : 'aucun bijou'))
  L.push('  - objets désactivés / craft seulement restant dans le butin final : ' + o.interditsRestants.length + (o.interditsRestants.length === 0 ? '  [OK]' : '  [À CORRIGER] ' + o.interditsRestants.slice(0, 8).join(', ')))
  L.push('  - pages de Codex : attendu environ ' + ((1 - AR_CODEX_TAUX) * 100).toFixed(1) + ' % conservées ; mesuré ' + tbPct(o.fin.page_codex, o.brut.page_codex))
  L.push('  - parchemins Réprouvé : attendu environ ' + ((1 - AR_REPROUVE_TAUX) * 100).toFixed(0) + ' % conservés ; mesuré ' + tbPct(o.repro.fin, o.repro.brut) + ' (' + o.repro.brut + ' avant, ' + o.repro.fin + ' après)')
  L.push('  - armures : attendu ' + ((1 - AR_TAUX_VANILLA) * 100).toFixed(0) + ' % (vanilla) et ' + ((1 - AR_TAUX_MOD) * 100).toFixed(0) + ' % (mods) conservées ; mesuré '
    + tbPct(o.fin.armure_vanilla, o.brut.armure_vanilla) + ' / ' + tbPct(o.fin.armure_mod, o.brut.armure_mod) + ' (les désactivées retirées en plus)')
  var rb = [], rf = []
  for (var r in o.rar.brut) rb.push(r + ' ' + o.rar.brut[r])
  for (var r2 in o.rar.fin) rf.push(r2 + ' ' + o.rar.fin[r2])
  L.push('  - parchemins par rareté — brut : ' + (rb.join(', ') || '-') + ' | final : ' + (rf.join(', ') || '-'))
  L.push('')
  var ids = []
  for (var id in o.items) ids.push([id, o.items[id]])
  ids.sort(function (a, b) { return b[1] - a[1] })
  L.push('Objets les plus fréquents (final, pour ' + o.coffres + ' coffres) :')
  for (var j = 0; j < Math.min(25, ids.length); j++) L.push('  ' + ids[j][0] + ' : ' + ids[j][1] + ' (' + (o.coffres ? (ids[j][1] / o.coffres).toFixed(3) : '-') + ' par coffre)')
  return L.join('\n')
}

function tbLancer(source, nb, cible) {
  var server = source.server
  var R = tbInit()
  var qui = source.player
  function dire(t) { try { if (qui) qui.tell(Text.gold(t)); else console.info('[test_butin] ' + t) } catch (e) {} }
  var toutes = server.reloadableRegistries().getKeys(R.Registries.LOOT_TABLE)
  var noms = []
  var it = toutes.iterator()
  while (it.hasNext()) {
    var rl = it.next()
    var s = String(rl)
    if (s.indexOf(':chests/') === -1) continue
    noms.push(s)
  }
  noms.sort()
  var choisies = []
  cible = String(cible).trim()
  if (cible === 'tout') choisies = noms
  else if (noms.indexOf(cible) !== -1) choisies = [cible]
  else for (var i = 0; i < noms.length; i++) if (noms[i].indexOf(cible) === 0) choisies.push(noms[i])
  if (choisies.length === 0) {
    dire('Aucune table de coffre ne correspond à « ' + cible + ' ». Exemple : minecraft:chests/simple_dungeon')
    return 0
  }
  dire('Test de butin : ' + choisies.length + ' table(s) × ' + nb + ' coffre(s)... patience.')
  var tot = tbNouveau()
  var parTable = []
  var idx = 0
  function paquet() {
    var fin = Math.min(idx + 5, choisies.length)
    for (; idx < fin; idx++) {
      var nom = choisies[idx]
      var cle = R.ResourceKey.create(R.Registries.LOOT_TABLE, R.RL.parse(nom))
      var o = tbNouveau()
      tbSimuler(server, cle, nb, o)
      // cumul
      tot.coffres += o.coffres; tot.erreurs += o.erreurs; tot.bijouxTrop += o.bijouxTrop
      for (var c in o.brut) { tot.brut[c] += o.brut[c]; tot.fin[c] += o.fin[c]; tot.parCoffre[c] += o.parCoffre[c] }
      for (var k in o.items) tot.items[k] = (tot.items[k] || 0) + o.items[k]
      for (var q in o.bijouxQual) tot.bijouxQual[q] = (tot.bijouxQual[q] || 0) + o.bijouxQual[q]
      for (var r in o.rar.brut) tot.rar.brut[r] = (tot.rar.brut[r] || 0) + o.rar.brut[r]
      for (var r2 in o.rar.fin) tot.rar.fin[r2] = (tot.rar.fin[r2] || 0) + o.rar.fin[r2]
      tot.repro.brut += o.repro.brut; tot.repro.fin += o.repro.fin
      tot.interditsRestants = tot.interditsRestants.concat(o.interditsRestants)
      if (choisies.length > 1) parTable.push(nom + ' : ' + o.fin.armure_vanilla + '/' + o.fin.armure_mod + ' armures, ' + (o.fin.arme_vanilla + o.fin.arme_mod) + ' armes, ' + o.fin.bijou + ' bijoux, ' + o.fin.page_codex + ' pages, ' + o.fin.parchemin + ' parchemins, ' + o.fin.grimoire + ' grimoires (' + o.coffres + ' coffres)')
    }
    if (idx < choisies.length) { server.scheduleInTicks(1, paquet); return }
    var texte = tbRapport(tot, choisies.length === 1 ? choisies[0] : (cible === 'tout' ? 'TOUTES LES TABLES' : 'tables « ' + cible + '* »'))
    if (parTable.length) texte += '\n\nDétail par table (totaux finaux) :\n' + parTable.join('\n')
    console.info('\n' + texte)
    var lignes = texte.split('\n')
    for (var l = 0; l < Math.min(lignes.length, 22); l++) dire(lignes[l])
    dire('Rapport complet dans le log serveur : cherche « === » dans logs/kubejs/server.log (ou latest.log).')
  }
  paquet()
  return choisies.length
}

ServerEvents.commandRegistry(function (event) {
  var Commands = event.commands
  var Arguments = event.arguments
  // /testbutin <nombre> <cible>   ou   /testbutin <cible> <nombre>   (le nombre peut être placé avant ou après)
  event.register(Commands.literal('testbutin')
    .requires(function (source) { return source.hasPermission(2) })
    .then(Commands.argument('args', Arguments.GREEDY_STRING.create(event))
      .executes(function (ctx) {
        var mots = String(Arguments.GREEDY_STRING.getResult(ctx, 'args')).trim().split(/\s+/)
        var nb = 0, reste = []
        for (var i = 0; i < mots.length; i++) {
          if (nb === 0 && /^[0-9]+$/.test(mots[i])) nb = parseInt(mots[i], 10)
          else reste.push(mots[i])
        }
        if (nb < 1) nb = 100
        if (nb > 20000) nb = 20000
        var cible = reste.join(' ')
        if (!cible) {
          try { if (ctx.source.player) ctx.source.player.tell(Text.red('Usage : /testbutin 500 minecraft:chests/simple_dungeon   (ou « tout », ou un début d\'identifiant)')) } catch (e0) {}
          return 0
        }
        try { return tbLancer(ctx.source, nb, cible) } catch (e) {
          console.error('[test_butin] ' + e)
          try { if (ctx.source.player) ctx.source.player.tell(Text.red('Erreur du test : ' + e)) } catch (e2) {}
          return 0
        }
      })))
})
