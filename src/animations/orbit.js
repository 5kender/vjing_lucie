// orbit.js — dérive circulaire et contre-rotation.

(function () {
  // Voir rotate.js : accumulateur pour que l'inversion de sens ne provoque pas
  // de saut.
  let angle = 0;

  registerAnimation({
    id: 'orbit',
    name: 'orbite',

    apply: function (ctx) {
      const g = ctx.g;

      angle += ctx.dt * 0.0004 * ctx.params.rotationDir;

      // Les médiums écartent l'orbite du centre.
      const radius = min(g.width, g.height) * 0.12 * (1 + ctx.audio.mid * 0.5);

      g.translate(cos(angle) * radius, sin(angle) * radius);

      // Contre-rotation plus rapide et de sens opposé : le motif se dévisse
      // pendant qu'il dérive, au lieu de simplement glisser.
      g.rotateZ(-angle * 1.5);
    },
  });
})();
