// pseudo_client.js : affiche le pseudo choisi avec /pseudo sur la plaque de nom d'origine (au-dessus de la tête).
// Le serveur place le joueur dans une équipe « ps_... » dont le nom d'affichage est le pseudo ; on le lit ici.
// Gère aussi l'affichage de la couche chapeau du skin sous le casque Pyrium Battlemage et la teinture de la tenue de Hazel (voir en bas).

var PC_ERR = false

function pcNom(p) {
  try {
    var t = p.getTeam()
    if (!t) return null
    if (String(t.getName()).indexOf('ps_') !== 0) return null
    return t.getDisplayName()
  } catch (e) { if (!PC_ERR) { PC_ERR = true; console.error('[pseudo_client] ' + e) } return null }
}

try {
  NativeEvents.onEvent(Java.loadClass('net.neoforged.neoforge.event.entity.player.PlayerEvent$NameFormat'), function (e) {
    try {
      var p = e.getEntity()
      var nom = pcNom(p)
      if (nom) e.setDisplayname(nom)
    } catch (err) { if (!PC_ERR) { PC_ERR = true; console.error('[pseudo_client] ' + err) } }
  })
} catch (e0) { console.error('[pseudo_client] indisponible : ' + e0) }

// Le nom est mis en cache par le jeu : on le recalcule dès que l'équipe ou son nom change.
var PC_VU = {}
try {
  ClientEvents.tick(function (event) {
    try {
      var mc = Java.loadClass('net.minecraft.client.Minecraft').getInstance()
      var niveau = mc.level
      if (!niveau) return
      if (!PC_VU.n) PC_VU.n = 0
      PC_VU.n++
      if (PC_VU.n % 10 !== 0) return
      var joueurs = niveau.players()
      for (var i = 0; i < joueurs.size(); i++) {
        var p = joueurs.get(i)
        var nom = pcNom(p)
        var cle = nom ? String(nom.getString()) : ''
        var id = String(p.getUUID())
        if (PC_VU[id] !== cle) {
          PC_VU[id] = cle
          p.refreshDisplayName()
        }
      }
    } catch (e2) { if (!PC_ERR) { PC_ERR = true; console.error('[pseudo_client] tick : ' + e2) } }
  })
} catch (e3) { console.error('[pseudo_client] tick indisponible : ' + e3) }

// Chapeau Pyrium Battlemage (Hazen n Stuff) : Iron's Spells masque la couche « chapeau » du skin pour ce casque
// (interface IDisableHat), ce qui fait disparaître les détails du visage. On la réaffiche juste avant le rendu du joueur.
var PC_CASQUES_CALQUE = ['hazennstuff:pyrium_battlemage_helmet']
var PC_TETE = null, PC_REG = null
try {
  NativeEvents.onEvent(Java.loadClass('net.neoforged.neoforge.client.event.RenderPlayerEvent$Pre'), function (e) {
    try {
      if (!PC_TETE) {
        PC_TETE = Java.loadClass('net.minecraft.world.entity.EquipmentSlot').HEAD
        PC_REG = Java.loadClass('net.minecraft.core.registries.BuiltInRegistries').ITEM
      }
      var pile = e.getEntity().getItemBySlot(PC_TETE)
      if (!pile || pile.isEmpty()) return
      if (PC_CASQUES_CALQUE.indexOf(String(PC_REG.getKey(pile.getItem()))) === -1) return
      e.getRenderer().getModel().hat.visible = true
    } catch (err) { if (!PC_ERR) { PC_ERR = true; console.error('[pseudo_client] chapeau : ' + err) } }
  })
} catch (e4) { console.error('[pseudo_client] chapeau indisponible : ' + e4) }

// Tenue de Hazel teignable (kit de professeur) : quand une pièce porte une teinte (dyed_color), on dessine le tissu
// (texture grise mcrp:textures/armor/hazel_tissu.png) dans la couleur choisie, puis les ornements dorés par-dessus
// (hazel_ornements.png), à la place du rendu normal. Sans teinte, la pièce garde son apparence d'origine.
var PC_HAZEL = { 'hazennstuff:hazel_helmet': 1, 'hazennstuff:hazel_chestplate': 1, 'hazennstuff:hazel_leggings': 1, 'hazennstuff:hazel_boots': 1 }
var PC_T = null
var PC_SIG = 'actuallyRender(com.mojang.blaze3d.vertex.PoseStack,software.bernie.geckolib.animatable.GeoAnimatable,software.bernie.geckolib.cache.object.BakedGeoModel,net.minecraft.client.renderer.RenderType,net.minecraft.client.renderer.MultiBufferSource,com.mojang.blaze3d.vertex.VertexConsumer,boolean,float,int,int,int)'
function pcRendu(r, ps, anim, m, rt, bs, rerendu, pt, pl, couleur) {
  var buf = bs.getBuffer(rt)
  try { r[PC_SIG](ps, anim, m, rt, bs, buf, rerendu, pt, pl, PC_T.OV.NO_OVERLAY, couleur) }
  catch (e1) { r.actuallyRender(ps, anim, m, rt, bs, buf, rerendu, pt, pl, PC_T.OV.NO_OVERLAY, couleur) }
}
try {
  NativeEvents.onEvent(Java.loadClass('software.bernie.geckolib.event.GeoRenderEvent$Armor$Pre'), function (e) {
    try {
      var pile = e.getItemStack()
      if (!pile || pile.isEmpty()) return
      if (!PC_REG) PC_REG = Java.loadClass('net.minecraft.core.registries.BuiltInRegistries').ITEM
      if (!PC_HAZEL[String(PC_REG.getKey(pile.getItem()))]) return
      if (!PC_T) {
        var RL = Java.loadClass('net.minecraft.resources.ResourceLocation'), RT = Java.loadClass('net.minecraft.client.renderer.RenderType')
        PC_T = {
          DC: Java.loadClass('net.minecraft.core.component.DataComponents'),
          OV: Java.loadClass('net.minecraft.client.renderer.texture.OverlayTexture'),
          tissu: RT.armorCutoutNoCull(RL.parse('mcrp:textures/armor/hazel_tissu.png')),
          ornements: RT.armorCutoutNoCull(RL.parse('mcrp:textures/armor/hazel_ornements.png'))
        }
      }
      var teinte = pile.get(PC_T.DC.DYED_COLOR)
      if (!teinte) return
      var r = e.getRenderer(), ps = e.getPoseStack(), m = e.getModel(), bs = e.getBufferSource()
      var pt = e.getPartialTick(), pl = e.getPackedLight(), anim = pile.getItem()
      pcRendu(r, ps, anim, m, PC_T.tissu, bs, false, pt, pl, (0xFF000000 | teinte.rgb()))
      pcRendu(r, ps, anim, m, PC_T.ornements, bs, true, pt, pl, -1)
      e.setCanceled(true)
    } catch (err) { if (!PC_ERR) { PC_ERR = true; console.error('[pseudo_client] tenue teinte : ' + err) } }
  })
} catch (e5) { console.error('[pseudo_client] tenue teinte indisponible : ' + e5) }

console.info('[pseudo_client] chargé')
