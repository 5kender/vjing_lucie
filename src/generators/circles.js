// circles.js — cercles concentriques, répétés radialement selon la symétrie.
//
// **Tracé groupé par anneau.** Tous les bras d'un même anneau partagent déjà la
// même couleur : ils sont donc émis dans une seule forme, en mode LINES, au lieu
// d'un appel de dessin par bras. Le nombre d'appels passe de anneaux × bras
// (jusqu'à 112) à anneaux (14 au plus), sans aucune perte visuelle.
//
// La contrepartie est qu'on ne peut plus se servir de la matrice pour placer les
// bras — une forme ouverte ne peut pas être translatée en cours de route. Les
// positions sont donc calculées directement, ce qui économise au passage un
// push()/pop() par bras.

registerGenerator({
  id: 'circles',
  name: 'cercles',

  draw: function (ctx) {
    const g = ctx.g;
    const p = ctx.params;

    const arms = p.symmetry;
    const rings = round(lerp(3, 14, p.complexity));

    // Basses et kick écartent les anneaux, le niveau général épaissit le trait.
    const maxR =
      min(g.width, g.height) *
      p.size *
      (1 + ctx.audio.bass * 0.3 + ctx.audio.punch * 0.16);

    // À un seul bras, les anneaux occupent le centre. Au-delà, ils se répartissent
    // en satellites sur un cercle.
    const multi = arms > 1;
    const offset = multi ? maxR * 0.5 : 0;
    const shrink = multi ? 0.45 : 1;

    const vibration = vibrationAmount(ctx, maxR) * shrink;
    // Les formes sont groupées, donc ce sont les segments qui bornent le coût.
    // Arrondi au pair inférieur : l'anneau se referme, et une alternance de
    // zigzag impaire ferait sauter le tracé au point de jonction.
    const segments = floor(fitSegments(48, rings * arms, 20) / 2) * 2;
    const sample = ctx.audio.sample;

    g.noFill();
    g.strokeWeight(1.6 + ctx.audio.level * 2.5);

    for (let i = 0; i < rings; i++) {
      const ratio = rings > 1 ? i / (rings - 1) : 0;

      // Ondulation décalée d'un anneau à l'autre : l'ensemble respire en
      // ricochet du centre vers l'extérieur plutôt que d'un bloc.
      const breath = 1 + 0.07 * sin(ctx.t * 0.0015 - i * 0.5);
      const radius = maxR * shrink * (0.12 + ratio * 0.88) * breath;

      strokePalette(g, p.palette, ratio, 100 - ratio * 20);

      // Un seul appel de dessin pour tous les bras de cet anneau.
      g.beginShape(LINES);

      for (let arm = 0; arm < arms; arm++) {
        const armAngle = multi ? (arm / arms) * TWO_PI : 0;

        // Centre du satellite : (0, -offset) tourné de armAngle.
        const cx = offset * sin(armAngle);
        const cy = -offset * cos(armAngle);

        let prevX = 0;
        let prevY = 0;

        for (let s = 0; s <= segments; s++) {
          const a = (s % segments) / segments;
          const r = radius + sample(a * 4 + i * 0.13) * vibration * zig(s);

          // Tourner un point polaire revient à décaler son angle.
          const angle = armAngle + a * TWO_PI;
          const x = cx + cos(angle) * r;
          const y = cy + sin(angle) * r;

          // En mode LINES, chaque segment demande ses deux extrémités.
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
