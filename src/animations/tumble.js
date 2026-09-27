// tumble.js — culbute 3D.
//
// La seule animation qui sorte du plan. Les générateurs dessinent à plat, mais
// le buffer est en WEBGL : les faire basculer sur X et Y les fait passer par la
// tranche, où la forme se réduit à une ligne avant de se rouvrir. C'est ce
// passage qui fait l'effet, et il justifie à lui seul le choix du WEBGL (§2).

(function () {
  let tiltX = 0;
  let spinY = 0;

  registerAnimation({
    id: 'tumble',
    name: 'culbute 3D',

    apply: function (ctx) {
      tiltX += ctx.dt * 0.0003 * ctx.params.rotationDir;
      spinY += ctx.dt * 0.00021;

      // Bascule oscillante sur X, rotation continue sur Y : les deux périodes
      // ne coïncident pas, donc la culbute ne se répète pas à l'œil.
      ctx.g.rotateX(sin(tiltX) * 1.1);
      ctx.g.rotateY(spinY);
    },
  });
})();
