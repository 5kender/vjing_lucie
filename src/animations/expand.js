// expand.js — expansion / contraction lente, calée sur la mesure.
//
// Complémentaire de « pulsation » : celle-ci frappe sur le temps, celle-là
// respire sur quatre temps. Les deux utilisent le tap tempo différemment.

(function () {
  let angle = 0;

  registerAnimation({
    id: 'expand',
    name: 'souffle',

    apply: function (ctx) {
      // Sinusoïde sur la mesure entière : un gonflement continu, sans attaque.
      const swell = 0.5 + 0.5 * sin(ctx.tempo.bar * TWO_PI);

      ctx.g.scale(0.78 + 0.3 * swell + ctx.audio.bass * 0.15);

      angle += ctx.dt * 0.00006 * ctx.params.rotationDir;
      ctx.g.rotateZ(angle);
    },
  });
})();
