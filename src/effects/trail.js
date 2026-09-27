// trail.js — rémanence.
//
// L'effet n'efface pas le canvas principal : il y superpose un voile
// semi-transparent avant que la nouvelle image ne soit dessinée par-dessus. La
// traîne vit donc entièrement dans le canvas principal, ce qui permet de se
// passer de buffer intermédiaire.

registerEffect({
  id: 'trail',
  name: 'trail',

  direct: true,

  prepare: function (ctx) {
    // Le voile prend la couleur de fond de la palette, pas du noir : sur une
    // palette claire, une traîne qui s'assombrit serait un dégradé vers une
    // couleur absente de l'image.
    const bg = paletteBg(ctx.params.palette);

    // Opacité du voile = longueur de la traîne. Plus la valeur est basse, plus
    // les images précédentes persistent.
    noStroke();
    fill(bg[0], bg[1], bg[2], 14);
    rect(-width / 2, -height / 2, width, height);
  },
});
