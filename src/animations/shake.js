// shake.js — tremblement, déplacement piloté par les aigus.
//
// Le déplacement est tiré de la forme d'onde et non d'un random() : le
// tremblement suit la texture du son au lieu d'être un bruit blanc plaqué
// dessus, et il retombe naturellement au silence.

(function () {
  let angle = 0;

  registerAnimation({
    id: 'shake',
    name: 'tremblement',

    apply: function (ctx) {
      const g = ctx.g;

      const amplitude =
        min(g.width, g.height) *
        0.045 *
        (ctx.audio.treble * 1.2 + ctx.audio.punch * 0.8);

      // Trois points distincts de l'onde : les deux axes et la rotation ne
      // bougent pas ensemble, sinon le tremblement paraît rigide.
      const phase = ctx.now * 0.0007;
      g.translate(
        ctx.audio.sample(phase) * amplitude,
        ctx.audio.sample(phase + 0.5) * amplitude
      );

      angle += ctx.dt * 0.0002 * ctx.params.rotationDir;
      g.rotateZ(angle + ctx.audio.sample(phase + 0.25) * 0.07);
    },
  });
})();
