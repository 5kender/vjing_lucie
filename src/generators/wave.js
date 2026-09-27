// wave.js — nappes de lignes horizontales.
//
// Le seul générateur non radial du lot : tout le reste rayonne depuis le centre.
// Il apporte une lecture en bandes, très différente à l'œil, et c'est celui qui
// ressemble le plus à un analyseur de spectre quand le son entre.
//
// **Tracé groupé par ligne.** Toutes les copies d'une même ligne partagent sa
// couleur : elles sont donc émises dans une seule forme. Le nombre d'appels de
// dessin passe de lignes × copies à lignes, sans aucune perte visuelle.

registerGenerator({
  id: 'wave',
  name: 'nappes',

  draw: function (ctx) {
    const g = ctx.g;
    const p = ctx.params;

    const copies = p.symmetry;
    const cols = 52;

    // Le nombre de formes ne dépend plus des copies, mais le nombre de segments
    // si : c'est lui qui borne maintenant la densité.
    const lines = fitSegments(round(lerp(5, 20, p.complexity)), copies * cols, 3);

    const sample = ctx.audio.sample;

    const span = min(g.width, g.height) * p.size * 2;
    const amplitude = span * 0.09 * (1 + ctx.audio.bass * 0.6);
    const vibration = vibrationAmount(ctx, span * 0.5);

    g.noFill();
    g.strokeWeight(1.5);

    for (let l = 0; l < lines; l++) {
      const ratio = lines > 1 ? l / (lines - 1) : 0;
      const y = (ratio - 0.5) * span;

      strokePalette(g, p.palette, ratio, 100 - ratio * 25);

      // Un seul appel de dessin pour toutes les copies de cette ligne.
      g.beginShape(LINES);

      for (let c = 0; c < copies; c++) {
        // La rotation des copies est appliquée au calcul des points : une forme
        // ouverte ne peut pas être tournée en cours de route par la matrice.
        const turn = copies > 1 ? (c / copies) * TWO_PI : 0;
        const ct = cos(turn);
        const st = sin(turn);

        let prevX = 0;
        let prevY = 0;

        for (let i = 0; i <= cols; i++) {
          const a = i / cols;
          const x = (a - 0.5) * span;

          // Onde de fond décalée d'une ligne à l'autre : la nappe ondule en
          // diagonale au lieu de bouger d'un bloc.
          const swell =
            sin(a * PI * 3 + ctx.t * 0.0014 - l * 0.45) *
            amplitude *
            (1 - ratio * 0.5);

          const wobble = sample(a * 3 + l * 0.17) * vibration * zig(i);
          const ly = y + swell + wobble;

          const wx = x * ct - ly * st;
          const wy = x * st + ly * ct;

          // En mode LINES, chaque segment demande ses deux extrémités.
          if (i > 0) {
            g.vertex(prevX, prevY);
            g.vertex(wx, wy);
          }

          prevX = wx;
          prevY = wy;
        }
      }

      g.endShape();
    }
  },
});
