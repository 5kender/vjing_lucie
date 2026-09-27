// grid.js — grille de polygones.
//
// Le seul générateur orthogonal du lot. Ici la symétrie ne sert pas à répéter
// la forme autour du centre — une grille répétée radialement n'a aucun sens
// visuel et coûterait cher — mais donne **le nombre de côtés** de la cellule :
// 3 côtés pour une symétrie de 1, jusqu'à 10 pour une symétrie de 8.
//
// **Tracé groupé par diagonale.** L'onde qui traverse la grille se propage le
// long des diagonales : les cellules d'une même diagonale partagent donc déjà
// leur luminosité et leur taille. Les grouper est exact pour l'animation, et ne
// déplace que le dégradé de teinte, qui suit maintenant la diagonale au lieu de
// l'ordre de balayage. Le nombre d'appels de dessin passe de side² à 2·side−1,
// soit 100 tracés ramenés à 19.

registerGenerator({
  id: 'grid',
  name: 'grille',

  draw: function (ctx) {
    const g = ctx.g;
    const p = ctx.params;

    const side = round(lerp(3, 10, p.complexity));
    const sides = constrain(p.symmetry + 2, 3, 10);
    const sample = ctx.audio.sample;

    const span = min(g.width, g.height) * p.size * 1.8;
    const cell = span / side;
    const vibration = vibrationAmount(ctx, cell) * 0.6;

    const spin = ctx.t * 0.0004 * ctx.params.rotationDir;
    const diagonals = 2 * side - 1;

    g.noFill();
    g.strokeWeight(1.5);

    for (let d = 0; d < diagonals; d++) {
      const ratio = diagonals > 1 ? d / (diagonals - 1) : 0;

      // Vague qui traverse la grille en diagonale, plus le kick qui la soulève
      // d'un bloc.
      const swell = 0.5 + 0.5 * sin(ctx.t * 0.0016 - d * 0.55);
      const radius = cell * 0.42 * (0.35 + swell * 0.65 + ctx.audio.punch * 0.3);

      strokePalette(g, p.palette, ratio, 60 + swell * 40);

      g.beginShape(LINES);

      // Cellules de cette diagonale : row + col === d.
      const firstRow = max(0, d - side + 1);
      const lastRow = min(side - 1, d);

      for (let row = firstRow; row <= lastRow; row++) {
        const col = d - row;

        const cx = (col - (side - 1) / 2) * cell;
        const cy = (row - (side - 1) / 2) * cell;

        // Position dans la grille, conservée par cellule pour que la rotation
        // et l'ondulation ne soient pas identiques sur toute la diagonale.
        const index = (row * side + col) / (side * side);
        const turn = spin + index * PI;

        let prevX = 0;
        let prevY = 0;

        for (let s = 0; s <= sides; s++) {
          const a = (s % sides) / sides;
          const r = radius + sample(a * 2 + index) * vibration;
          const angle = turn + a * TWO_PI;

          const x = cx + cos(angle) * r;
          const y = cy + sin(angle) * r;

          if (s > 0) {
            g.vertex(prevX, prevY);
            g.vertex(x, y);
          }

          prevX = x;
          prevY = y;
        }
      }

      g.endShape();
    }
  },
});
