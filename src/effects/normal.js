// normal.js — affichage direct, sans buffer intermédiaire.

registerEffect({
  id: 'normal',
  name: 'normal',

  // Rien à relire : le générateur peut dessiner droit sur le canvas principal.
  direct: true,

  prepare: function (ctx) {
    const bg = paletteBg(ctx.params.palette);
    background(bg[0], bg[1], bg[2]);
  },
});
