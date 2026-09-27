// explode.js — explosion sur le kick.
//
// La seule animation pilotée par une détection plutôt que par le temps : elle ne
// bouge que quand la musique frappe. Sans source audio, le repli synthétique
// produit des kicks au BPM, donc elle reste démontrable.

(function () {
  // Détente propre, plus longue que celle de l'enveloppe d'audio.js : on veut
  // voir la forme revenir, pas la voir claquer.
  let envelope = 0;
  let angle = 0;

  registerAnimation({
    id: 'explode',
    name: 'explosion',

    apply: function (ctx) {
      envelope = max(envelope * 0.88, ctx.audio.punch);

      ctx.g.scale(1 + envelope * 0.55);

      // Le coup imprime aussi une saccade de rotation, qui ne revient pas en
      // arrière : la forme se retrouve décalée après chaque frappe.
      angle += ctx.dt * 0.00008 * ctx.params.rotationDir + envelope * 0.012;
      ctx.g.rotateZ(angle);
    },
  });
})();
