// Balais : vitesse verticale x2 (montee et descente). Le mod plafonne a 0.15 ;
// on ajoute apres chaque tick un deplacement vertical identique, sans toucher a la vitesse interne.
var BALAI_VERT_MULT = 2.0

ClientEvents.tick(function (event) {
  try {
    var mc = Java.loadClass('net.minecraft.client.Minecraft').getInstance()
    var p = mc.player
    if (!p || !mc.level) return
    var v = p.getVehicle()
    if (!v) return
    var nom = String(v.getClass().getSimpleName())
    if (nom.indexOf('Broom') < 0) return
    if (v.getControllingPassenger() !== p) return
    var dy = v.getDeltaMovement().y()
    if (Math.abs(dy) < 0.01) return
    var Vec3 = Java.loadClass('net.minecraft.world.phys.Vec3')
    var MoverType = Java.loadClass('net.minecraft.world.entity.MoverType')
    v.move(MoverType.SELF, new Vec3(0, dy * (BALAI_VERT_MULT - 1), 0))
  } catch (e) {
    if (!global.balaiVertErr) { global.balaiVertErr = true; console.error('[balai_vertical] ' + e) }
  }
})
