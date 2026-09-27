// dither.js — tramage ordonné (Bayer 8×8), appliqué aux tracés seuls.
//
// Le tramage ne touche **que ce qui est dessiné**, jamais le fond. C'est ce qui
// le distingue d'un filtre plein écran : appliqué partout, il couvrirait l'image
// d'une grille uniforme, y compris sur les zones vides où il n'y a rien à
// trader. Ici le fond reste parfaitement propre et seuls les traits se
// désagrègent en points.
//
// Deux choses sont tramées : la *couleur* du trait, quantifiée sur peu de
// niveaux, et sa *couverture* — une partie des pixels du trait retombe sur le
// fond selon la trame, ce qui donne l'aspect pointillé. Les basses referment la
// couverture : le trait se solidifie sur les frappes et s'émiette entre deux.
//
// La grille, elle, ne bouge pas : c'est sa stabilité qui donne l'aspect « écran
// rétro ». La faire réagir la transformerait en bruit.

(function () {
  const FRAG =
    SHADER_HEAD +
    [
      // Matrice de Bayer par récurrence plutôt que par tableau : GLSL ES 1.0
      // n'autorise pas l'indexation d'un tableau par une valeur calculée.
      'float bayer2(vec2 a) {',
      '  a = floor(a);',
      '  return fract(a.x / 2.0 + a.y * a.y * 0.75);',
      '}',
      '',
      'float bayer4(vec2 a) { return bayer2(0.5 * a) * 0.25 + bayer2(a); }',
      'float bayer8(vec2 a) { return bayer4(0.5 * a) * 0.25 + bayer2(a); }',
      '',
      // Côté d'une case de trame, en pixels.
      'const float CELL = 2.0;',
      '',
      'void main() {',
      // Lecture brute et non sceneAt() : on a besoin de l'alpha pour savoir où
      // il y a un trait. sceneAt() a déjà composé sur le fond et perdu cette
      // information.
      '  vec4 c = texture2D(uTex, vTexCoord);',
      '',
      // gl_FragCoord et non vTexCoord : la trame doit être ancrée à l'écran,
      // pas à l'image, sinon elle glisse avec le contenu.
      '  float threshold = bayer8(gl_FragCoord.xy / CELL);',
      '',
      '  float drive = clamp(uBass * 1.3, 0.0, 1.0);',
      '',
      // Quantification ordonnée de la couleur du trait : on choisit le palier
      // inférieur ou supérieur selon que le reste dépasse le seuil de la case.
      '  float levels = floor(mix(5.0, 2.0, drive) + 0.5);',
      '  float span = levels - 1.0;',
      '  vec3 v = c.rgb * span;',
      '  vec3 lower = floor(v);',
      '  vec3 rest = v - lower;',
      '  vec3 q = (lower + step(threshold, rest)) / span;',
      '',
      // Y a-t-il un trait sur ce pixel ? Ce test doit être fait à part, et non
      // laissé au seuil de trame : bayer8 vaut exactement 0 pour une case sur
      // 64, et step(0.0, 0.0) vaut 1. Sans ce garde-fou, un pixel de fond sur
      // 64 serait déclaré couvert, ce qui pose une grille de points régulière
      // sur toute la surface — y compris là où rien n'est dessiné.
      '  float inside = step(0.004, c.a);',
      '',
      // Couverture : sous 1.0, une fraction des pixels du trait repasse au
      // fond, en suivant la trame. C'est ce qui pointille le tracé au lieu de
      // le laisser plein.
      '  float bite = mix(0.55, 0.95, drive);',
      '  float covered = inside * step(threshold, c.a * bite);',
      '',
      '  gl_FragColor = vec4(mix(uBg, q, covered), 1.0);',
      '}',
    ].join('\n');

  let sh = null;

  registerEffect({
    id: 'dither',
    name: 'dither',

    display: function (scene, ctx) {
      if (!sh) sh = createShader(SHADER_VERT, FRAG);

      runShader(sh, scene, ctx);
    },
  });
})();
