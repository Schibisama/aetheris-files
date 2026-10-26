// Objets de quête (preuves données par les boss). Nécessite un redémarrage du client ET du serveur.
StartupEvents.registry('item', function (event) {
  event.create('ecu_brise_helvar')
    .displayName('Écu brisé de Helvar')
    .texture('kubejs:item/ecu_brise_helvar')
    .maxStackSize(1)
    .tooltip(Text.gray("Le blason d'un chevalier des Enfers, fendu en deux."))
    .tooltip(Text.darkGray('À rapporter à Ser Aldric.'))

  event.create('sceau_maledictus')
    .displayName('Sceau de Maledictus')
    .texture('kubejs:item/sceau_maledictus')
    .maxStackSize(1)
    .tooltip(Text.gray("Un sceau fendu, encore tiède de la malédiction qu'il contenait."))
    .tooltip(Text.darkGray('À rapporter au Vieux Hiro.'))

  event.create('corne_de_skor')
    .displayName('Corne de Skor')
    .texture('kubejs:item/corne_de_skor')
    .maxStackSize(1)
    .tooltip(Text.gray("Une corne givrée arrachée au yéti Skor."))
    .tooltip(Text.darkGray('À rapporter à Pip.'))
})
