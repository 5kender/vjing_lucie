// star.js — étoiles concentriques.
//
// Le seul générateur franchement anguleux du lot : il apporte des pointes là où
// spirale, cercles et rosace sont continus.

registerGenerator({
  id: 'star',
  name: 'étoile',

  draw: function (ctx) {
    const g = ctx.g;
    const p = ctx.params;

    // La symétrie donne le nombre de branches. En dessous de 3 une étoile
    // n'existe pas, d'où le plancher.
    const branches = max(3, p.symmetry);
    const layers = round(lerp(1, 6, p.complexity));

    const maxR =
      min(g.width, g.height) *
      p.size *
      (1 + ctx.audio.bass * 0.25 + ctx.audio.punch * 0.14);

    const vibration = vibrationAmount(ctx, maxR);

    // Profondeur des creux : c'est elle qui respire, plutôt que la taille.
    const inner = 0.38 + 0.12 * sin(ctx.t * 0.0009);
    const sample = ctx.audio.sample;

    g.noFill();
    g.strokeWeight(1.6);

    for (let l = 0; l < layers; l++) {
      const ratio = layers > 1 ? l / (layers - 1) : 0;
      const shrink = 1 - ratio * 0.72;

      strokePalette(g, p.palette, ratio, 100 - ratio * 20);

      g.push();
      // Chaque couche est tournée d'une demi-branche : les pointes d'une couche
      // visent les creux de la suivante.
      g.rotateZ((ratio * PI) / branches);

      g.beginShape();
      const total = branches * 2;
      for (let i = 0; i < total; i++) {
        const a = i / total;
        const angle = a * TWO_PI - HALF_PI;

        // Pas de zig() ici : l'alternance pointe/creux est déjà un zigzag, en
        // rajouter un ne ferait que moduler la profondeur des branches.
        const base = (i % 2 === 0 ? 1 : inner) * maxR * shrink;
        const r = base + sample(a * 3 + l * 0.21) * vibration;

        g.vertex(cos(angle) * r, sin(angle) * r);
      }
      g.endShape(CLOSE);

      g.pop();
    }
  },
});
