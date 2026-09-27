// lissajous.js — courbes de Lissajous.
//
// Deux oscillations perpendiculaires de fréquences différentes. Le déphasage
// dérive avec le temps, ce qui fait que la figure se referme, s'ouvre et se
// retourne en continu sans jamais se répéter à l'identique.

registerGenerator({
  id: 'lissajous',
  name: 'lissajous',

  draw: function (ctx) {
    const g = ctx.g;
    const p = ctx.params;

    const copies = p.symmetry;

    // Rapport de fréquences entier : plus il monte, plus la figure a de lobes.
    const fx = round(lerp(2, 7, p.complexity));
    const fy = fx + 1;

    const maxR =
      min(g.width, g.height) *
      p.size *
      (1 + ctx.audio.bass * 0.22 + ctx.audio.punch * 0.12);

    const vibration = vibrationAmount(ctx, maxR);

    // Définition suffisante pour que la courbe reste lisse tout en laissant les
    // dents du zigzag lisibles.
    const steps = 300;
    const drift = ctx.t * 0.00018;
    const sample = ctx.audio.sample;

    g.noFill();
    g.strokeWeight(1.6);

    for (let c = 0; c < copies; c++) {
      const ratio = copies > 1 ? c / copies : 0;

      strokePalette(g, p.palette, ratio, 100);

      g.push();
      g.rotateZ(ratio * TWO_PI);

      g.beginShape();
      for (let i = 0; i <= steps; i++) {
        const a = i / steps;
        const angle = a * TWO_PI;

        let x = sin(angle * fx + drift + ratio * PI);
        let y = sin(angle * fy);

        // Déformation portée vers l'extérieur, le long du rayon : appliquée sur
        // x et y séparément, elle écraserait la figure au lieu de la hérisser.
        const length = Math.sqrt(x * x + y * y) || 1;
        const wobble = sample(a * 6 + ratio) * vibration * zig(i);

        x = x * maxR + (x / length) * wobble;
        y = y * maxR + (y / length) * wobble;

        g.vertex(x, y);
      }
      g.endShape();

      g.pop();
    }
  },
});
