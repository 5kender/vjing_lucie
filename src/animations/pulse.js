// pulse.js — pulsation calée sur le BPM, renforcée par les basses.
//
// Consomme la phase fournie par le contexte plutôt que de recalculer du temps :
// c'est ce qui rend le tap tempo réellement utile plutôt que décoratif.

(function () {
  // Voir rotate.js : accumulateur pour que l'inversion de sens ne saute pas.
  let angle = 0;

  registerAnimation({
    id: 'pulse',
    name: 'pulsation',

    apply: function (ctx) {
      // Enveloppe percussive : coup sec sur le temps, puis retombée avant le
      // suivant. Une sinusoïde donnerait un balancement mou, pas une pulsation.
      const punch = pow(1 - ctx.tempo.phase, 3);

      ctx.g.scale(0.85 + 0.3 * punch + ctx.audio.bass * 0.2);

      // Dérive lente pour que l'image ne soit pas figée entre deux temps.
      angle += ctx.dt * 0.00008 * ctx.params.rotationDir;
      ctx.g.rotateZ(angle);
    },
  });
})();
