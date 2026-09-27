// spiral.js — spirale paramétrique à plusieurs bras.
// La rotation d'ensemble n'est plus ici : elle appartient aux animations.

registerGenerator({
  id: 'spiral',
  name: 'spirale',

  draw: function (ctx) {
    const g = ctx.g;
    const p = ctx.params;

    const turns = lerp(1.5, 9, p.complexity);
    const arms = p.symmetry;

    // Basses et kick font respirer la forme ; les aigus s'occupent du zigzag.
    const maxR =
      min(g.width, g.height) *
      p.size *
      (1 + ctx.audio.bass * 0.25 + ctx.audio.punch * 0.14);
    const breathAmount = 0.08 + ctx.audio.bass * 0.18;

    // Définition volontairement modérée : à 70 points par tour, les dents du
    // zigzag sont espacées de quelques pixels et se lisent comme du bruit. Vers
    // 34 points par tour, la courbe reste lisse et chaque dent est visible.
    const steps = constrain(round(turns * 34), 90, 260);
    const vibration = vibrationAmount(ctx, maxR);
    const sample = ctx.audio.sample;

    g.noFill();
    g.strokeWeight(1.6);

    for (let arm = 0; arm < arms; arm++) {
      const ratio = arms > 1 ? arm / arms : 0;

      // Un bras = une seule forme stroke, donc un seul appel de dessin. La
      // couleur ne peut pas varier à l'intérieur d'un beginShape : le dégradé
      // se joue entre les bras, pas le long du tracé.
      strokePalette(g, p.palette, ratio, 100);

      g.push();
      g.rotateZ(ratio * TWO_PI);

      g.beginShape();
      for (let i = 0; i <= steps; i++) {
        const a = i / steps;
        const angle = a * turns * TWO_PI;

        // Respiration propre au générateur : ondulation lente qui parcourt le
        // bras de l'intérieur vers l'extérieur.
        const breath = 1 + breathAmount * sin(ctx.t * 0.0012 + a * PI * 3);

        // La forme d'onde se lit le long du bras, décalée d'un bras à l'autre
        // pour qu'ils ne vibrent pas à l'unisson. Atténuée par `a` : près du
        // centre le rayon est petit, une déformation pleine amplitude y
        // retournerait le tracé.
        const wobble = sample(a * 8 + ratio) * vibration * a * zig(i);
        const r = maxR * pow(a, 0.85) * breath + wobble;

        g.vertex(cos(angle) * r, sin(angle) * r);
      }
      g.endShape();

      g.pop();
    }
  },
});
