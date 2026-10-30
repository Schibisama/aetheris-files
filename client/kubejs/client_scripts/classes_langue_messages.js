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
  'mcrp.sous_titre.devenu': '%s est devenu %s',
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
  'mcrp.msg.recompense': 'Les arcanes te font un don : un parchemin de %s, sort %s de ta classe.',
  'mcrp.subtitle.npc_parole': 'Un PNJ parle',
  'mcrp.rarete.uncommon': 'peu commun',
  'mcrp.rarete.rare': 'rare',
  'mcrp.rarete.epic': 'épique',
  'mcrp.rarete.legendary': 'légendaire',
  'mcrp.autel.sceau_force': "Le sceau de la force s'est brisé",
  'mcrp.autel.sceau_memoire': "Le sceau de la mémoire s'est brisé",
  'mcrp.autel.sceau_courage': "Le sceau du courage s'est brisé",
  'mcrp.autel.sceaux_brises': 'Les trois sceaux sont brisés',
  'mcrp.autel.sceaux_compte': '%s / 3',
  'mcrp.autel.combat_titre': "Épreuve du courage",
  'mcrp.autel.combat_sous': 'Professeurs contre élèves',
  'mcrp.autel.combat_ko': 'Tu es hors combat',
  'mcrp.autel.combat_fin': "L'affrontement est terminé",
  'mcrp.autel.victoire_eleves': "Les élèves l'emportent",
  'mcrp.autel.victoire_profs': "Les professeurs l'emportent",
  'mcrp.autel.sceau_resiste': 'Le sceau du courage résiste...',
  'mcrp.autel.debut_force': "L'épreuve de la force commence",
  'mcrp.autel.debut_memoire': "L'épreuve de la mémoire commence",
  'mcrp.autel.debut_courage': "L'épreuve du courage commence",
  'mcrp.autel.debut_sous_force': 'Tape /force pour en savoir plus',
  'mcrp.autel.debut_sous_memoire': 'Tape /memoire pour en savoir plus',
  'mcrp.autel.debut_sous_courage': 'Tape /courage pour en savoir plus',
  'mcrp.autel.aide_pas_commencee': "Cette épreuve n'a pas encore commencé.",
  'mcrp.autel.aide_brise': 'Ce sceau est brisé.',
  'mcrp.autel.titre_force': 'Épreuve de la Force',
  'mcrp.autel.titre_memoire': 'Épreuve de la Mémoire',
  'mcrp.autel.titre_courage': 'Épreuve du Courage',
  'mcrp.autel.aide_force_1': "Six gardiens veillent sur le premier sceau : Helvar, Maledictus, Skor, le Cumulonimbus, le Dragon d'Ulrich et les gardiens du château de Morrow. Terrassez-les tous.",
  'mcrp.autel.aide_force_2': "Chaque gardien vaincu, par n'importe quel joueur, fait frémir le sceau. Il se brisera quand les six seront tombés.",
  'mcrp.autel.aide_force_etat': 'Gardiens vaincus : %s / %s',
  'mcrp.autel.aide_memoire_1': "Le nom du monde n'est pas la seule chose qui s'est perdue. Des runes, vestiges d'une langue ancienne, sont dissimulées à travers le monde. Allez les toucher, chacun pour soi.",
  'mcrp.autel.aide_memoire_2': "Un érudit sait lire ces signes : rapportez-lui ce que vous avez trouvé, il vous dira les lettres qu'il parvient à déchiffrer. Quand vous aurez tout retrouvé, il vous donnera de quoi les comprendre.",
  'mcrp.autel.aide_memoire_3': "Un livre ancien, écrit dans cette langue, garde le mot qui éveille le sceau. Inscrivez-le sur l'autel.",
  'mcrp.autel.aide_memoire_etat': 'Runes ressenties : %s / %s, rendues à l\'érudit : %s',
  'mcrp.autel.aide_courage_1': "Les élèves ne sont pas encore prêts. Les professeurs vont les mettre à l'épreuve.",
  'mcrp.autel.aide_courage_2': "Tous les professeurs affrontent tous les élèves. Celui qui tombe à un cœur est hors combat jusqu'à la fin. L'affrontement s'achève quand un camp entier est à terre.",
  'mcrp.autel.aide_courage_3': "Personne ne meurt : seul compte le courage d'avoir tenu face à ses maîtres.",
  'mcrp.autel.aide_courage_attente': "L'affrontement n'a pas encore été lancé.",
  'mcrp.autel.aide_courage_encours': "L'affrontement est en cours !",
  'mcrp.msg.recompense_repli': 'Les arcanes te font un don : un parchemin de %s, un des sorts les plus puissants de ta classe.',
  'mcrp.msg.recompense_aucun': "Aucun sort n'a pu t'être remis (as-tu reçu une classe ?). Préviens un modérateur.",
  'mcrp.msg.cours_sort': "Le professeur t'enseigne un nouveau sort : %s."
}
var MSG_EN = {
  'mcrp.msg.eveil': '%s awakens as %s.',
  'mcrp.sous_titre.choisi': 'The arcane has chosen you.',
  'mcrp.sous_titre.tranche': 'The arcane has decided.',
  'mcrp.sous_titre.change': 'Your fate has changed.',
  'mcrp.sous_titre.devenu': '%s has become %s',
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
  'mcrp.msg.recompense': 'The arcane grants you a gift: a scroll of %s, a spell of %s rarity from your class.',
  'mcrp.subtitle.npc_parole': 'An NPC speaks',
  'mcrp.rarete.uncommon': 'uncommon',
  'mcrp.rarete.rare': 'rare',
  'mcrp.rarete.epic': 'epic',
  'mcrp.rarete.legendary': 'legendary',
  'mcrp.autel.sceau_force': 'The seal of strength has broken',
  'mcrp.autel.sceau_memoire': 'The seal of memory has broken',
  'mcrp.autel.sceau_courage': 'The seal of courage has broken',
  'mcrp.autel.sceaux_brises': 'All three seals are broken',
  'mcrp.autel.sceaux_compte': '%s / 3',
  'mcrp.autel.combat_titre': 'Trial of Courage',
  'mcrp.autel.combat_sous': 'Professors versus students',
  'mcrp.autel.combat_ko': 'You are out of the fight',
  'mcrp.autel.combat_fin': 'The confrontation is over',
  'mcrp.autel.victoire_eleves': 'The students win',
  'mcrp.autel.victoire_profs': 'The professors win',
  'mcrp.autel.sceau_resiste': 'The seal of courage holds...',
  'mcrp.autel.debut_force': 'The Trial of Strength begins',
  'mcrp.autel.debut_memoire': 'The Trial of Memory begins',
  'mcrp.autel.debut_courage': 'The Trial of Courage begins',
  'mcrp.autel.debut_sous_force': 'Type /force to learn more',
  'mcrp.autel.debut_sous_memoire': 'Type /memoire to learn more',
  'mcrp.autel.debut_sous_courage': 'Type /courage to learn more',
  'mcrp.autel.aide_pas_commencee': 'This trial has not begun yet.',
  'mcrp.autel.aide_brise': 'This seal is broken.',
  'mcrp.autel.titre_force': 'Trial of Strength',
  'mcrp.autel.titre_memoire': 'Trial of Memory',
  'mcrp.autel.titre_courage': 'Trial of Courage',
  'mcrp.autel.aide_force_1': "Six guardians watch over the first seal: Helvar, Maledictus, Skor, the Cumulonimbus, Ulrich's Dragon and the guardians of Morrow's castle. Defeat them all.",
  'mcrp.autel.aide_force_2': 'Each guardian defeated, by any player, makes the seal tremble. It will break once all six have fallen.',
  'mcrp.autel.aide_force_etat': 'Guardians defeated: %s / %s',
  'mcrp.autel.aide_memoire_1': "The world's name is not the only thing that was lost. Runes, remnants of an ancient language, are hidden throughout the world. Go and touch them, each for yourself.",
  'mcrp.autel.aide_memoire_2': 'A scholar can read these signs: bring him what you have found and he will tell you the letters he manages to decipher. Once you have found them all, he will give you the means to understand them.',
  'mcrp.autel.aide_memoire_3': 'An ancient book, written in that language, holds the word that awakens the seal. Inscribe it on the altar.',
  'mcrp.autel.aide_memoire_etat': 'Runes felt: %s / %s, handed to the scholar: %s',
  'mcrp.autel.aide_courage_1': 'The students are not ready yet. The professors will put them to the test.',
  'mcrp.autel.aide_courage_2': 'All professors face all students. Whoever falls to one heart is out of the fight until the end. The confrontation ends when an entire side is down.',
  'mcrp.autel.aide_courage_3': 'Nobody dies: only the courage to stand before your masters matters.',
  'mcrp.autel.aide_courage_attente': 'The confrontation has not been launched yet.',
  'mcrp.autel.aide_courage_encours': 'The confrontation is underway!',
  'mcrp.msg.recompense_repli': 'The arcane grants you a gift: a scroll of %s, one of the most powerful spells of your class.',
  'mcrp.msg.recompense_aucun': "No spell could be given to you (do you have a class?). Tell a moderator.",
  'mcrp.msg.cours_sort': "Your professor teaches you a new spell: %s."
}

function msgAjouter(langue) {
  ClientEvents.lang(langue, function (event) {
    var table = langue === 'en_us' ? MSG_EN : MSG_FR
    for (var k in table) event.add('mcrp', k, table[k])
    event.add('farmersdelight', 'item.farmersdelight.mutton_wrap', 'Durum') // le wrap de mouton de Farmer's Delight s'appelle Durum
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
