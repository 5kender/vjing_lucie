// rotate.js — rotation continue, vitesse et sens pilotés par l'état et l'audio.

(function () {
  // Angle accumulé plutôt que recalculé depuis ctx.t. Multiplier le temps écoulé
  // par une vitesse variable ferait sauter l'image à chaque changement de vitesse
  // ou d'inversion de sens : l'accumulateur garantit la continuité.
  let angle = 0;

  registerAnimation({
    id: 'rotate',
    name: 'rotation',

    apply: function (ctx) {
      const speed = 0.00025 * (1 + ctx.audio.level * 1.5);
      angle += ctx.dt * speed * ctx.params.rotationDir;

      ctx.g.rotateZ(angle);
    },
  });
})();
