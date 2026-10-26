// Objets de quête (preuves données par les boss). Nécessite un redémarrage du client ET du serveur.
StartupEvents.registry('item', function (event) {
  event.create('ecu_brise_helvar')
    .displayName('Écu brisé de Helvar')
    .texture('kubejs:item/ecu_brise_helvar')
    .maxStackSize(1)
    .tooltip(Text.gray("Le blason d'un chevalier des Enfers, fendu en deux."))
    .tooltip(Text.darkGray('À rapporter à Ser Aldric.'))
})
