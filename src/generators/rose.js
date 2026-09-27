// rose.js — rosace polaire (courbe rhodonée), r = cos(k·θ).
//
// Propriété utile en live : à k entier, un k impair donne k pétales et un k pair
// en donne 2k. Monter la complexité d'un cran change donc le nombre de pétales
// de façon non linéaire, ce qui rend la touche 8 plus intéressante ici
// qu'ailleurs.

registerGenerator({
  id: 'rose',
  name: 'rosace',

  draw: function (ctx) {
    const g = ctx.g;
    const p = ctx.params;

    const copies = p.symmetry;
    const k = round(lerp(2, 9, p.complexity));

    const maxR =
      min(g.width, g.height) *
      p.size *
      (1 + ctx.audio.bass * 0.24 + ctx.audio.punch * 0.13);

    const vibration = vibrationAmount(ctx, maxR);

    // Assez de points pour que les pointes de pétales restent nettes quand k
    // monte, sans pour autant noyer le zigzag.
    const steps = constrain(k * 44, 220, 420);

    // Respiration : les pétales s'allongent et se rétractent.
    const stretch = 1 + 0.12 * sin(ctx.t * 0.0011);
    const sample = ctx.audio.sample;

    g.noFill();
    g.strokeWeight(1.6);

    for (let c = 0; c < copies; c++) {
      const ratio = copies > 1 ? c / copies : 0;

      strokePalette(g, p.palette, ratio, 100 - ratio * 15);

      g.push();
      g.rotateZ((ratio * PI) / k);

      g.beginShape();
      for (let i = 0; i <= steps; i++) {
        const a = i / steps;
        const theta = a * TWO_PI;

        // Valeur absolue : sans elle, les rayons négatifs replient la courbe et
        // la moitié des pétales se superpose à l'autre.
        const base = Math.abs(cos(k * theta)) * maxR * stretch;
        const r = base + sample(a * 5 + ratio) * vibration * zig(i);

        g.vertex(cos(theta) * r, sin(theta) * r);
      }
      g.endShape();

      g.pop();
    }
  },
});
