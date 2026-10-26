// Textes des messages du serveur (clés « mcrp.* ») en français et en anglais.
// À placer dans : <instance>/kubejs/client_scripts/classes_langue_messages.js  (puis F3+T)
// Dépend de aaa_traduction.js (CLASSES_EN). Une langue autre que le français retombe sur l'anglais.

function msgSlug(nom) {
  var s = String(nom).toLowerCase()
  var de = 'éèêëàâäîïôöùûüç', vers = 'eeeeaaaiioouuuc'
  var r = ''
  for (var i = 0; i < s.length; i++) {
    var k = de.indexOf(s.charAt(i))
    r += k >= 0 ? vers.charAt(k) : s.charAt(i)
  }
  return r.replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, '')
}

var MSG_FR = {
  'mcrp.msg.eveil': "%s s'éveille en tant que %s.",
  'mcrp.sous_titre.choisi': "Les arcanes t'ont choisi.",
  'mcrp.sous_titre.tranche': 'Les arcanes ont tranché.',
  'mcrp.sous_titre.change': 'Ton destin a changé.',
  'mcrp.msg.desactive': '%s est désactivé sur ce serveur.',
  'mcrp.msg.armourers_ops': "Seuls les opérateurs peuvent utiliser Armourer's Workshop.",
  'mcrp.msg.reserve': '%s est réservé à : %s.',
  'mcrp.sujet.equipement': 'Cet équipement',
  'mcrp.sujet.artefact': 'Cet artefact',
  'mcrp.info.classe': 'Classe : %s',
  'mcrp.info.aucune': 'aucune',
  'mcrp.info.testeur': 'Mode testeur actif : toutes les classes sont débloquées.',
  'mcrp.info.changements': 'Changements utilisés : %s/%s (coût : %s étoile(s) du Nether, auprès du %s)',
  'mcrp.msg.compteur': 'Tes changements de classe ont été remis à zéro (0/%s).',
  'mcrp.pnj.nom': 'Maître du Destin',
  'mcrp.pnj.sans_classe': "Les arcanes dorment encore en toi, voyageur. Reviens quand un Maître t'aura montré ta voie.",
  'mcrp.pnj.scelle': "Le fil de ton destin a déjà été retissé %s fois. Les Tisseurs n'en accordent pas davantage.",
  'mcrp.pnj.encre': 'Je ne puis réécrire ton destin sans offrande : apporte-moi %s étoile(s) du Nether.',
  'mcrp.pnj.confirme': 'Tu veux que je défasse le fil de ton destin ? Il en coûtera %s étoile(s) du Nether, et il te restera %s changement(s). Fais-moi un nouveau clic droit pour sceller le pacte.',
  'mcrp.rtp.dimension': '/rtp est indisponible dans cette dimension.',
  'mcrp.rtp.recharge': '/rtp en recharge : encore %s s.',
  'mcrp.rtp.introuvable': 'Aucun endroit sûr trouvé, réessaie dans un instant.',
  'mcrp.rtp.ok': 'Téléporté en X %s, Y %s, Z %s.',
  'mcrp.msg.recompense': 'Les arcanes te font un don : un parchemin de %s, sort épique de ta classe.',
  'mcrp.msg.recompense_repli': 'Les arcanes te font un don : un parchemin de %s, un des sorts les plus puissants de ta classe.',
  'mcrp.msg.recompense_aucun': "Aucun sort n'a pu t'être remis (as-tu reçu une classe ?). Préviens un modérateur."
}
var MSG_EN = {
  'mcrp.msg.eveil': '%s awakens as %s.',
  'mcrp.sous_titre.choisi': 'The arcane has chosen you.',
  'mcrp.sous_titre.tranche': 'The arcane has decided.',
  'mcrp.sous_titre.change': 'Your fate has changed.',
  'mcrp.msg.desactive': '%s is disabled on this server.',
  'mcrp.msg.armourers_ops': "Only operators can use Armourer's Workshop.",
  'mcrp.msg.reserve': '%s is reserved for: %s.',
  'mcrp.sujet.equipement': 'This equipment',
  'mcrp.sujet.artefact': 'This artifact',
  'mcrp.info.classe': 'Class: %s',
  'mcrp.info.aucune': 'none',
  'mcrp.info.testeur': 'Tester mode active: all classes are unlocked.',
  'mcrp.info.changements': 'Changes used: %s/%s (cost: %s Nether star(s), from the %s)',
  'mcrp.msg.compteur': 'Your class changes have been reset (0/%s).',
  'mcrp.pnj.nom': 'Master of Fates',
  'mcrp.pnj.sans_classe': 'The arcane still sleeps within you, traveller. Come back once a Master has shown you your path.',
  'mcrp.pnj.scelle': 'The thread of your fate has already been rewoven %s times. The Weavers grant no more.',
  'mcrp.pnj.encre': 'I cannot rewrite your fate without an offering: bring me %s Nether star(s).',
  'mcrp.pnj.confirme': 'You wish me to unravel the thread of your fate? It will cost %s Nether star(s), and you will have %s change(s) left. Right-click me again to seal the pact.',
  'mcrp.rtp.dimension': '/rtp is unavailable in this dimension.',
  'mcrp.rtp.recharge': '/rtp is on cooldown: %s s left.',
  'mcrp.rtp.introuvable': 'No safe spot found, try again in a moment.',
  'mcrp.rtp.ok': 'Teleported to X %s, Y %s, Z %s.',
  'mcrp.msg.recompense': 'The arcane grants you a gift: a scroll of %s, an epic spell of your class.',
  'mcrp.msg.recompense_repli': 'The arcane grants you a gift: a scroll of %s, one of the most powerful spells of your class.',
  'mcrp.msg.recompense_aucun': "No spell could be given to you (do you have a class?). Tell a moderator."
}

function msgAjouter(langue) {
  ClientEvents.lang(langue, function (event) {
    var table = langue === 'en_us' ? MSG_EN : MSG_FR
    for (var k in table) event.add('mcrp', k, table[k])
    for (var fr in CLASSES_EN) {
      event.add('mcrp', 'mcrp.classe.' + msgSlug(fr), langue === 'en_us' ? CLASSES_EN[fr] : fr)
    }
  })
}

try {
  msgAjouter('en_us')
  msgAjouter('fr_fr')
} catch (e) {
  console.error('[classes_langue_messages] Erreur : ' + e)
}
