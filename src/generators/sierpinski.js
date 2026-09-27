// sierpinski.js — triangle de Sierpiński, répété radialement selon la symétrie.
//
// **Tracé groupé par tranche de couleur.** Contrairement aux cercles ou aux
// nappes, aucun sous-ensemble naturel ne partage ici sa couleur : elle varie en
// continu avec l'éloignement au centre. Les triangles sont donc collectés, puis
// répartis en huit tranches et émis en huit formes.
//
// Le dégradé devient discret au lieu d'être continu — c'est la seule perte, et
// elle est peu visible sur des triangles de quelques pixels. En échange, le
// nombre d'appels de dessin passe de plusieurs centaines à huit.

(function () {
  const BUCKETS = 8;

  // Tampons alloués une fois. Les remplir à chaque frame plutôt que de
  // construire des tableaux évite de donner du travail au ramasse-miettes
  // soixante fois par seconde.
  const MAX_TRIANGLES = 600;
  const coords = new Float32Array(MAX_TRIANGLES * 6);
  const slot = new Uint8Array(MAX_TRIANGLES);
  const slotCounts = new Int32Array(BUCKETS);
  let count = 0;

  function reset() {
    count = 0;
    for (let i = 0; i < BUCKETS; i++) slotCounts[i] = 0;
  }

  // Chaque triangle de dernier niveau coûte trois segments, et leur nombre
  // triple à chaque niveau de récursion.
  function fitDepth(depth, arms) {
    const BUDGET = 500;
    while (depth > 1 && arms * Math.pow(3, depth) > BUDGET) depth--;
    return depth;
  }

  function collect(o, ax, ay, bx, by, cx, cy, d) {
    if (d > 0) {
      const abx = (ax + bx) / 2;
      const aby = (ay + by) / 2;
      const bcx = (bx + cx) / 2;
      const bcy = (by + cy) / 2;
      const cax = (cx + ax) / 2;
      const cay = (cy + ay) / 2;

      collect(o, ax, ay, abx, aby, cax, cay, d - 1);
      collect(o, abx, aby, bx, by, bcx, bcy, d - 1);
      collect(o, cax, cay, bcx, bcy, cx, cy, d - 1);
      return;
    }

    if (count >= MAX_TRIANGLES) return;

    // La couleur suit l'éloignement au centre plutôt que la profondeur : seules
    // les feuilles sont dessinées, un dégradé par niveau ne se verrait pas.
    const mx = (ax + bx + cx) / 3;
    const my = (ay + by + cy) / 3;
    const ratio = o.maxR > 0 ? constrain(Math.sqrt(mx * mx + my * my) / o.maxR, 0, 1) : 0;

    const v = o.vibration;
    const s = o.sample;
    const i = count * 6;

    // Chaque sommet est décalé par un point différent de la forme d'onde, indexé
    // sur la position du triangle : les triangles voisins vibrent de façon
    // proche sans être synchrones, ce qui fait frémir l'ensemble.
    coords[i] = ax + s(ratio) * v;
    coords[i + 1] = ay + s(ratio + 0.31) * v;
    coords[i + 2] = bx + s(ratio + 0.57) * v;
    coords[i + 3] = by + s(ratio + 0.11) * v;
    coords[i + 4] = cx + s(ratio + 0.79) * v;
    coords[i + 5] = cy + s(ratio + 0.43) * v;

    const bucket = min(BUCKETS - 1, floor(ratio * BUCKETS));
    slot[count] = bucket;
    slotCounts[bucket]++;
    count++;
  }

  registerGenerator({
    id: 'sierpinski',
    name: 'sierpiński',

    draw: function (ctx) {
      const g = ctx.g;
      const p = ctx.params;

      const arms = p.symmetry;
      const depth = fitDepth(round(lerp(2, 5, p.complexity)), arms);

      // Respiration propre au générateur, dilatée par les basses et le kick.
      const breath =
        1 + 0.05 * sin(ctx.t * 0.001) + ctx.audio.bass * 0.18 + ctx.audio.punch * 0.12;
      const radius = min(g.width, g.height) * p.size * breath;

      const opts = {
        maxR: radius,
        sample: ctx.audio.sample,
        // Amplitude réduite : les triangles de dernier niveau sont petits, une
        // vibration pleine les ferait se croiser.
        vibration: vibrationAmount(ctx, radius) * 0.45,
      };

      reset();

      for (let arm = 0; arm < arms; arm++) {
        const turn = arms > 1 ? (arm / arms) * TWO_PI : 0;
        const ct = cos(turn);
        const st = sin(turn);

        // Triangle équilatéral inscrit dans un cercle de rayon `radius`, tourné
        // pour ce bras. Les milieux d'un triangle tourné étant les milieux
        // tournés, la récursion peut ensuite travailler normalement.
        const ax = 0;
        const ay = -radius;
        const bx = radius * cos(radians(30));
        const by = radius * sin(radians(30));

        collect(
          opts,
          ax * ct - ay * st,
          ax * st + ay * ct,
          bx * ct - by * st,
          bx * st + by * ct,
          -bx * ct - by * st,
          -bx * st + by * ct,
          depth
        );
      }

      g.noFill();
      g.strokeWeight(1.2);

      for (let bucket = 0; bucket < BUCKETS; bucket++) {
        if (slotCounts[bucket] === 0) continue;

        const ratio = (bucket + 0.5) / BUCKETS;
        strokePalette(g, p.palette, ratio, 55 + ratio * 45);

        g.beginShape(LINES);

        for (let t = 0; t < count; t++) {
          if (slot[t] !== bucket) continue;

          const i = t * 6;
          const x1 = coords[i];
          const y1 = coords[i + 1];
          const x2 = coords[i + 2];
          const y2 = coords[i + 3];
          const x3 = coords[i + 4];
          const y3 = coords[i + 5];

          g.vertex(x1, y1);
          g.vertex(x2, y2);
          g.vertex(x2, y2);
          g.vertex(x3, y3);
          g.vertex(x3, y3);
          g.vertex(x1, y1);
        }

        g.endShape();
      }
    },
  });
})();
