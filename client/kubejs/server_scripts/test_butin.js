// /testbutin <nombre> <table | tout | préfixe> (op) : simule l'ouverture de N coffres et mesure ce qui sort.
//   /testbutin 500 minecraft:chests/simple_dungeon     -> une table précise, 500 coffres
//   /testbutin 100 irons_spellbooks                    -> toutes les tables de coffres dont l'identifiant commence par ce texte
//   /testbutin 50 tout                                 -> TOUTES les tables de coffres (peut prendre quelques secondes, fait par petits paquets)
// Chaque coffre est tiré comme en jeu (modificateurs de butin des mods compris : bijoux, pages de Codex, Simply Swords...),
// puis passe par les MÊMES filtres que l'ouverture réelle : classes_desactives.js (objets désactivés / craft seulement / parchemins
// interdits) puis armures_butin.js (armures, pages de Codex, parchemins Réprouvé, autres objets rares).
// Sortie : un résumé dans le chat + le rapport complet dans le log du serveur (latest.log et logs/kubejs/server.log).
// Limites : les coffres LootR « par joueur » et la pitié des armes uniques Simply Swords (compteur par joueur) ne sont pas simulés.
// /verifsorts : contrôle du niveau 1 des sorts équilibrés (voir plus bas).
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
    var ajouts = []
    if (Math.random() < AR_PAGE_PAR_COFFRE) ajouts.push(arPageNeuve())
    if (Math.random() < AR_PARCHEMIN_PAR_COFFRE) ajouts.push(arCreerParchemin())
    for (var a = 0; a < ajouts.length; a++) {
      var ps = ajouts[a]
      if (!ps) continue
      var c2 = tbClasser(ps)
      tbCompter(o, c2, 'fin', 1)
      vu[c2.c] = true
      if (c2.c === 'parchemin') o.rar.fin[c2.rar] = (o.rar.fin[c2.rar] || 0) + 1
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
  L.push('  - pages de Codex : attendu ' + AR_PAGE_PAR_COFFRE.toFixed(3) + ' par coffre (1 sur ' + Math.round(1 / AR_PAGE_PAR_COFFRE) + ') ; mesuré ' + (o.coffres ? o.fin.page_codex / o.coffres : 0).toFixed(3) + ' | parchemins : attendu ' + AR_PARCHEMIN_PAR_COFFRE.toFixed(3) + ' (1 sur ' + Math.round(1 / AR_PARCHEMIN_PAR_COFFRE) + ') ; mesuré ' + (o.coffres ? o.fin.parchemin / o.coffres : 0).toFixed(3))
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

// ───────── /verifsorts : contrôle du niveau 1 des sorts équilibrés (op) ─────────
// Pour chaque sort du « Retour équilibrage » : lit la ligne « Dégâts » de l'infobulle du sort au NIVEAU 1 pour le joueur qui lance la commande
// (donc avec sa puissance de sort : c'est exactement ce que tu lis en jeu) et la compare à la valeur demandée.
// Table : identifiant -> [nom, dégâts demandés, dégâts d'origine mesurés] ; -1 = pas de valeur absolue demandée (multiplicateur seulement) : valeur affichée seulement.
//   /verifsorts          -> tous les sorts   |   /verifsorts firebolt   -> ceux dont l'identifiant contient ce texte
// Écart toléré : 4 % (arrondi de l'infobulle). Rapport complet dans le log serveur (« === » dans logs/kubejs/server.log).
var VS_CIBLES = {
  'apprenticecodex:arcane_beam': ['Rayon Arcanique', 6, 4.4],
  'apprenticecodex:arcane_blast': ['Déflagration Arcanique', 9, 6.8],
  'apprenticecodex:blood_brand': ['Marque de Sang', 6.5, 4.6],
  'apprenticecodex:combustion_jet': ['Jet de Combustion', 11, 13.23],
  'apprenticecodex:fujin': ['Fujin', 3.5, 1.75],
  'apprenticecodex:higanbana': ['Higanbana', 12, 2.7],
  'apprenticecodex:inscribe_ice': ['Inscription de Glace', 8, 4],
  'apprenticecodex:totem_of_permafrost': ['Totem de Pergélisol', 7, 3],
  'cataclysm_spellbooks:amethyst_puncture': ['Perforation d\'Améthyste', 14, 0.3],
  'cataclysm_spellbooks:ashen_breath': ['Souffle Cendré', 6, 3],
  'cataclysm_spellbooks:bone_storm': ['Tempête d\'Os', 9, 1.5],
  'cataclysm_spellbooks:desert_winds': ['Vents du Désert', 9, 7.4],
  'cataclysm_spellbooks:hellish_blade': ['Lame Infernale', 40, 91.8],
  'cataclysm_spellbooks:infernal_strike': ['Frappe Infernale', 13, 9.18],
  'cataclysm_spellbooks:monolith_crash': ['Chute du Monolithe', 12, 3.7],
  'cataclysm_spellbooks:piercing_bone': ['Os Perforant', 17, 1.5],
  'colormagic:black_droplets': ['Gouttes Noires', 30, 45],
  'colormagic:paint_spray': ['Jet de Peinture', 4, 1.7],
  'cursespells:a_call_beyond': ['Un Appel d\'Au-Delà', 5, 3.4],
  'cursespells:abhorrent_star': ['Étoile Abhorrée', 0.5, 3],
  'cursespells:all_vanity': ['Toute Vanité', 2, 4.5],
  'cursespells:blade_of_judgment': ['Lame du Jugement', 4, 6.8],
  'cursespells:cursed_arrow': ['Flèche Maudite', 10, 6.8],
  'cursespells:cursed_breath': ['Souffle Maudit', 5, 3.7],
  'cursespells:cursed_charge': ['Charge Maudite', 12, 17],
  'cursespells:cursed_crush': ['Écrasement Maudit', 6, 10.2],
  'cursespells:cursed_scar': ['Cicatrice Maudite', 8, 6.8],
  'cursespells:dagger_of_obsession': ['Dague de l\'Obsession', 2, 3.4],
  'cursespells:droplet_of_stagnation': ['Goutte de Stagnation', 5, 6.8],
  'cursespells:flame_of_stagnation': ['Flamme de Stagnation', 14, 10.2],
  'cursespells:flames_of_fury': ['Flammes de Fureur', 25, 34],
  'cursespells:frenzy_plant': ['Plante Frénétique', 12, 26],
  'cursespells:hell_fire': ['Feu de l\'Enfer', 10, 17],
  'cursespells:homing_soulmass': ['Masse d\'Âmes Guidée', 10, 15.3],
  'cursespells:leaf_storm': ['Tempête de Feuilles', 6, 2.4],
  'cursespells:pillar_of_sin': ['Pilier du Péché', 14, 8.5],
  'cursespells:primal_seed': ['Graine Primitive', 6, 13],
  'cursespells:rage_awakened': ['Rage Éveillée', 5, 30.6],
  'cursespells:ray_of_punishment': ['Rayon du Châtiment', 17, 10.2],
  'cursespells:silent_waltz': ['Valse Silencieuse', 9, 6.8],
  'cursespells:soul_stream': ['Flot d\'Âmes', 8, 5.1],
  'cursespells:stagnant_spiral': ['Spirale Stagnante', 6, 10.2],
  'esoteric_spell:blast_magic': ['Déflagration', 8, 15],
  'esoteric_spell:crash_magic': ['Magie de Collision', 8, 12],
  'esoteric_spell:echanted_burst': ['Lame Magique : Éclat Enchanté', 11, 16.5],
  'esoteric_spell:laser_magic': ['Magie Laser', 7, 10.5],
  'farmers_spell:chaos_slash': ['Entaille pâtissière chaotique', 14, 7.5],
  'firesenderexpansion:binary_stars': ['Étoiles Binaires', 12, 7.6],
  'firesenderexpansion:dragons_fury': ['Fureur du Dragon', 14, 4.2],
  'firesenderexpansion:hollow_crystal': ['Cristal Creux', 20, 10.1],
  'gametechbcs_spellbooks:ashen_breath': ['Souffle Cendré', 6, 1.5],
  'gtbcs_geomancy_plus:chunker': ['Découpeur', 10, 7.54],
  'gtbcs_geomancy_plus:eroding_boulder': ['Rocher Érodant', 20, 14.41],
  'gtbcs_geomancy_plus:fissure': ['Fissure', 12, 8.67],
  'gtbcs_geomancy_plus:petrivise': ['Pétrification', 15, 24.35],
  'gtbcs_geomancy_plus:tremor_spike': ['Pointe de Tremblement', 12, 7.17],
  'hazennstuff:arcane_cards': ['Cartes arcaniques', 13, 9],
  'hazennstuff:counterspell_spider_lily': ['Contre-sort : lys araignée', 4, 9.35],
  'hazennstuff:dazzling_obliteration': ['Anéantissement éblouissant', 25, 42.5],
  'hazennstuff:endraconic_meteor': ['Météore endraconique', 25, 13.5],
  'hazennstuff:hailstorm': ['Tempête de grêle', 14, 6],
  'hazennstuff:ionic_slash': ['Entaille ionique', 18, 7.5],
  'hazennstuff:scorching_slash': ['Entaille brûlante', 13, 16.03],
  'hazennstuff:shard_sword': ['Épée d\'éclats', 16, 8.25],
  'hazennstuff:soul_flame_bolt': ['Trait de flamme d\'âme', 10, 19.68],
  'hazennstuff:spectral_axe': ['Hache spectrale', 15, 9],
  'hazennstuff:syringe_barrage': ['Salve de seringues', 5, 6.12],
  'hazennstuff:violent_regurgitation': ['Régurgitation violente', 25, 13.5],
  'irons_spellbooks:acupuncture': ['Acupuncture', 3.5, 2.7],
  'irons_spellbooks:arrow_volley': ['Volée de Flèches', 6, 3],
  'irons_spellbooks:blood_needles': ['Aiguilles de Sang', 5, 3.4],
  'irons_spellbooks:cone_of_cold': ['Cône de Froid', 5, 1],
  'irons_spellbooks:devour': ['Dévorer', 15, 10.2],
  'irons_spellbooks:dragon_breath': ['Souffle de Dragon', 5, 1],
  'irons_spellbooks:earthquake': ['Tremblement de Terre', 6, 3.74],
  'irons_spellbooks:electrocute': ['Électrocution', 4.5, 2.12],
  'irons_spellbooks:fire_breath': ['Souffle de Feu', 5, 1],
  'irons_spellbooks:firebolt': ['Flèche de Feu', 25, 33.6],
  'irons_spellbooks:firefly_swarm': ['Essaim de Lucioles', 8, 3.7],
  'irons_spellbooks:flaming_barrage': ['Barrage Enflammé', 15, 9.18],
  'irons_spellbooks:guiding_bolt': ['Éclair Guidé', 8, 5.1],
  'irons_spellbooks:ice_block': ['Bloc de Glace', 15, 21],
  'irons_spellbooks:magic_missile': ['Missile Magique', 7, 10.2],
  'irons_spellbooks:poison_breath': ['Vaporisation de Poison', 5, 1],
  'irons_spellbooks:ray_of_siphoning': ['Rayon de Siphon', 4, 1.7],
  'irons_spellbooks:scorch': ['Brûlure', 12, 24.48],
  'irons_spellbooks:shadow_slash': ['Taillade d\'Ombre', 15, 8.5],
  'irons_spellbooks:throw': ['Lancer', 14, 2.2],
  'irons_spellbooks:thunderstorm': ['Orage', 7, 8.5],
  'irons_spellbooks:wither_skull': ['Crâne de Wither', 24, 10.2],
  'iss_magicfromtheeast:anchoring_kunai': ['Kunaï d\'Ancrage', 21, 6.7],
  'iss_magicfromtheeast:ashigaru_squad': ['Escouade d\'Ashigaru', 8, 2],
  'iss_magicfromtheeast:bone_hands': ['Mains d\'Os', 14, 7.2],
  'iss_magicfromtheeast:calamity_cut': ['Coupe Dévastatrice', 15, 6],
  'iss_magicfromtheeast:soul_burst': ['Éclat d\'Âme', 11, 5.3],
  'iss_magicfromtheeast:splitting_shuriken': ['Shuriken Fendant', 11, 7.7],
  'monsterspellbooks:banshee_scream': ['Cri de Banshee', 18, 9],
  'monsterspellbooks:blood_thorn': ['Épine de Sang', 18, 10.2],
  'monsterspellbooks:brimstone_buzzsaw': ['Scie Circulaire de Soufre', 30, 45.9],
  'monsterspellbooks:brimstone_wrath': ['Courroux de Soufre', 25, 45.9],
  'monsterspellbooks:discharge': ['Décharge', 7, 13],
  'monsterspellbooks:divine_intervention': ['Intervention Divine', 18, 8.25],
  'monsterspellbooks:dragon_charge': ['Charge du Dragon', 12, 4.4],
  'monsterspellbooks:firmament_splitter': ['Fendeur du Firmament', 12, 8.5],
  'monsterspellbooks:frenzied_burst': ['Éclat Frénétique', 20, 43.55],
  'monsterspellbooks:frenzied_storm': ['Tempête Frénétique', 6, 13.56],
  'monsterspellbooks:graveyard_fissure': ['Fissure du Cimetière', 16, 9],
  'monsterspellbooks:ice_arsenal': ['Arsenal de Glace', 15, 3],
  'monsterspellbooks:poison_quill': ['Piquant Empoisonné', 6, 9.89],
  'monsterspellbooks:putrescence_mass': ['Masse de Putréfaction', 13, 6],
  'monsterspellbooks:rancorcall': ['Appel de la Rancœur', 6, 0.75],
  'monsterspellbooks:redstone_lasers': ['Barrage Laser de Redstone', 5, 2.4],
  'monsterspellbooks:sanguinite_evisceration': ['Éviscération Sanguinite', 25, 12.2],
  'monsterspellbooks:soul_chain': ['Chaîne d\'Âmes', 4.5, 1.5],
  'monsterspellbooks:spectral_blast': ['Déflagration Spectrale', 10, 15],
  'monsterspellbooks:spirit_strike': ['Frappe Spirituelle', 16, 3.7],
  'monsterspellbooks:stray_grasp': ['Étreinte Errante', 15, 2.57],
  'monsterspellbooks:torment_arrow': ['Flèche de Tourment', 25, 15],
  'monsterspellbooks:wither_bomb': ['Bombe Wither', 15, 7.5],
  'monsterspellbooks:wither_nova': ['Nova Wither', 28, 33.75],
  'monsterspellbooks:zap': ['Zap', 6, 1.5],
  'somakespells:abyssal_orbs': ['Orbes Abyssaux', 14, 7.6],
  'somakespells:bloodmark': ['Marque de Sang', 8, 2.7],
  'somakespells:eruption': ['Éruption', 30, 50.8],
  'somakespells:fire_blast': ['Déflagration de Feu', 12, 16],
  'somakespells:firestorm_vortex': ['Vortex de Tempête de Feu', 13, 19],
  'somakespells:funeral_bloom': ['Floraison Funéraire', 16, 14.2],
  'somakespells:incinerator_slash': ['Entaille de l\'Incinérateur', 18, 30.6],
  'somakespells:jingle_bell': ['Clochette', 10, 18.4],
  'somakespells:lightning_ball': ['Boule de Foudre', 19, 12.5],
  'somakespells:lightning_cut': ['Coupe de Foudre', 18, 7.5],
  'somakespells:lightning_dance': ['Danse de la Foudre', 5.5, 4.5],
  'somakespells:lightning_swarm': ['Essaim de Foudre', 15, 7.5],
  'somakespells:soul_reprisal': ['Dagues Fantômes', 7.5, 4.8],
  'somakespells:soulfall_judgment': ['Jugement de la Chute d\'Âmes', 45, 24.4],
  'somakespells:spectral_rondo': ['Rondo Spectral', 12, 7.1],
  'somakespells:spiral_of_ruin': ['Spirale de Ruine', 18, 8.5],
  'somakespells:withered_rose_vortex': ['Vortex de la Rose Fanée', 13, 8.9],
  'tunes_n_tomes:grand_finale': ['tunes_n_tomes:grand_finale', 13, 8.75],
  'tunes_n_tomes:sonata': ['tunes_n_tomes:sonata', 12, 9],
  'wind_spellbooks:aeropic': ['Aéropique', 18, 11.2],
  'wind_spellbooks:iron_slash': ['Taillade de Fer', 16, 9],
  'somakespells:halberd_strike': ['Frappe de Hallebarde', -1, -1],
  'iss_magicfromtheeast:dragon_glide': ['Vol du Dragon', -1, -1],
  'somakespells:phantom_barrage': ['Barrage Fantôme', -1, -1],
  'iss_magicfromtheeast:jade_judgement': ['Jugement de Jade', -1, -1],
  'hazennstuff:golden_shower': ['Pluie dorée', -1, -1],
  'hazennstuff:horn_shell': ['Coquille-corne', -1, -1],
  'hazennstuff:hydrobullet': ['Hydro-balle', -1, -1],
  'hazennstuff:razorblade_typhoon': ['Typhon de lames', -1, -1],
  'monsterspellbooks:bubble_spray': ['Jet de Bulles', -1, -1],
  'monsterspellbooks:razor_typhoon': ['Typhon Tranchant', -1, -1],
  'monsterspellbooks:water_trident': ['Trident d\'Eau', -1, -1],
  'somakespells:sea_serpent': ['Serpent de Mer', -1, -1],
  'somakespells:sea_serpent_jet': ['Jet du Serpent de Mer', -1, -1],
  'somakespells:tsunami': ['Tsunami', -1, -1],
  'apprenticecodex:field_overseer': ['Superviseur de Terrain', -1, -1],
  'apprenticecodex:shiden': ['Shiden', -1, -1],
  'apprenticecodex:silent_assassin': ['Assassin Silencieux', -1, -1],
  'apprenticecodex:sky_edge': ['Lame du Ciel', -1, -1],
  'apprenticecodex:slash_blade': ['Lame Tranchante', -1, -1],
  'apprenticecodex:thermal_process': ['Processus Thermique', -1, -1],
  'apprenticecodex:thermal_slice': ['Tranche Thermique', -1, -1],
  'apprenticecodex:tiro_volley': ['Volée de Tiro', -1, -1],
  'asterismarcanum:brightburst': ['Éclat Lumineux', -1, -1],
  'asterismarcanum:luminous_beam': ['Rayon Lumineux', -1, -1],
  'asterismarcanum:piercing_light': ['Lumière Perçante', -1, -1],
  'asterismarcanum:star_swarm': ['Essaim d\'Étoiles', -1, -1],
  'asterismarcanum:starcutter': ['Coupe-Étoile', -1, -1],
  'asterismarcanum:summon_lunar_moths': ['Invocation de Papillons Lunaires', -1, -1],
  'hazennstuff:cosmic_bolt': ['Trait cosmique', -1, -1],
  'hazennstuff:evercomet_barrage': ['Salve de comètes éternelles', -1, -1],
  'chronomancy:time_piercing_needle': ['Aiguille Perce-Temps', -1, -1],
  'hazennstuff:death_sentence': ['Sentence de mort', -1, -1],
  'somakespells:resonant_pulse': ['Pulsation Résonante', -1, -1]
}

function vsNombres(txt) {
  var r = String(txt).match(/-?\d+(?:[.,]\d+)?/g) || []
  var o = []
  for (var i = 0; i < r.length; i++) o.push(parseFloat(r[i].replace(',', '.')))
  return o
}
function vsLireDegats(sort, joueur) {
  var niveau = 1
  try { niveau = Math.max(1, sort.getMinLevel()) } catch (e0) {}
  var liste = sort.getUniqueInfo(niveau, joueur)
  var vals = [], cles = []
  for (var i = 0; i < liste.size(); i++) {
    var c = liste.get(i), cle = '', args = ''
    try {
      var ct = c.getContents()
      cle = String(ct.getKey())
      var a = ct.getArgs()
      for (var j = 0; j < a.length; j++) {
        var x = a[j]
        try { x = x.getString() } catch (e1) {}
        args += String(x) + ' '
      }
    } catch (e2) { cle = String(c.getString()); args = cle }
    cles.push(cle)
    if (/damage|degat|dégât/i.test(cle)) { var n = vsNombres(args); if (n.length) vals.push(n[0]) }
  }
  return { niveau: niveau, vals: vals, cles: cles }
}
function vsLancer(source, filtre) {
  var joueur = source.player
  if (!joueur) { return 0 }
  var RL = Java.loadClass('net.minecraft.resources.ResourceLocation')
  var SR = Java.loadClass('io.redspace.ironsspellbooks.api.registry.SpellRegistry')
  var ok = 0, ecart = [], sans = [], info = [], total = 0
  for (var id in VS_CIBLES) {
    if (filtre && id.indexOf(filtre) === -1) continue
    total++
    var nom = VS_CIBLES[id][0], cible = VS_CIBLES[id][1]
    try {
      var sort = SR.getSpell(RL.parse(id))
      var d = vsLireDegats(sort, joueur)
      if (d.vals.length === 0) { sans.push(id + ' (' + nom + ') : pas de ligne dégâts [' + d.cles.join(' | ') + ']'); continue }
      var txt = id + ' (' + nom + ') niv.' + d.niveau + ' : ' + d.vals.join(' / ')
      if (cible < 0) { info.push(txt + '  (pas de valeur absolue demandée)'); continue }
      var mn = d.vals[0], proche = false
      for (var k = 0; k < d.vals.length; k++) if (Math.abs(d.vals[k] - cible) <= 0.04 * cible + 0.05) proche = true
      if (proche) ok++
      else ecart.push(txt + '  <<< demandé ' + cible + '  (rapport à appliquer ×' + (cible / d.vals[0]).toFixed(3) + ' en plus)')
    } catch (e) { sans.push(id + ' : erreur ' + e) }
  }
  var L = ['=== /verifsorts : ' + total + ' sort(s), niveau 1, joueur ' + joueur.username + ' ===', 'conformes : ' + ok + ' | écarts : ' + ecart.length + ' | sans ligne dégâts : ' + sans.length + ' | valeur affichée seulement : ' + info.length]
  if (ecart.length) L.push('', 'ÉCARTS :', ecart.join('\n'))
  if (sans.length) L.push('', 'SANS LIGNE DÉGÂTS :', sans.join('\n'))
  if (info.length) L.push('', 'VALEURS AFFICHÉES (multiplicateur seulement) :', info.join('\n'))
  console.info('\n' + L.join('\n'))
  joueur.tell(Text.gold('/verifsorts : ' + ok + ' conformes, ' + ecart.length + ' écart(s), ' + sans.length + ' sans ligne dégâts, ' + info.length + ' affichés seulement.'))
  for (var e3 = 0; e3 < Math.min(ecart.length, 15); e3++) joueur.tell(Text.red(ecart[e3]))
  if (ecart.length > 15) joueur.tell(Text.gray('… la suite dans le log serveur (cherche « === »).'))
  return total
}
ServerEvents.commandRegistry(function (event) {
  var Commands = event.commands
  var Arguments = event.arguments
  event.register(Commands.literal('verifsorts')
    .requires(function (source) { return source.hasPermission(2) })
    .executes(function (ctx) {
      try { return vsLancer(ctx.source, '') } catch (e) { console.error('[verifsorts] ' + e); try { ctx.source.player.tell(Text.red('Erreur : ' + e)) } catch (e2) {} return 0 }
    })
    .then(Commands.argument('filtre', Arguments.GREEDY_STRING.create(event))
      .executes(function (ctx) {
        try { return vsLancer(ctx.source, String(Arguments.GREEDY_STRING.getResult(ctx, 'filtre')).trim()) } catch (e) { console.error('[verifsorts] ' + e); try { ctx.source.player.tell(Text.red('Erreur : ' + e)) } catch (e2) {} return 0 }
      })))
})
