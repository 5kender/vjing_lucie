// swing.js — oscillation pendulaire.
//
// La forme part d'un côté puis de l'autre au lieu de tourner : c'est le seul
// mouvement du lot qui ait un point de repos, ce qui casse la monotonie des
// rotations continues quand on enchaîne les animations.

(function () {
  let phase = 0;

  registerAnimation({
    id: 'swing',
    name: 'balancier',

    apply: function (ctx) {
      phase += ctx.dt * 0.0012 * ctx.params.rotationDir;

      // Amplitude d'environ ±70°, élargie par les basses.
      const amplitude = QUARTER_PI * (1.4 + ctx.audio.bass * 0.8);
      ctx.g.rotateZ(sin(phase) * amplitude);

      // Léger dandinement vertical à la fréquence double : sans lui, le
      // balancement paraît mécanique.
      ctx.g.translate(0, sin(phase * 2) * min(ctx.g.width, ctx.g.height) * 0.03);
    },
  });
})();
