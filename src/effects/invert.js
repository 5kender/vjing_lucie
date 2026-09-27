// invert.js — négatif (§5).
//
// Le plus simple du lot, et c'est voulu : c'est un effet d'accent, qu'on prend
// pour marquer une rupture et qu'on quitte aussitôt. Il inverse aussi le fond,
// donc une palette claire passe sur fond sombre et inversement — ce qui en fait
// le contraste le plus violent disponible sans rien casser.

(function () {
  const FRAG =
    SHADER_HEAD +
    [
      'void main() {',
      '  vec3 c = sceneAt(vTexCoord);',
      '  gl_FragColor = vec4(1.0 - c, 1.0);',
      '}',
    ].join('\n');

  let sh = null;

  registerEffect({
    id: 'invert',
    name: 'négatif',

    display: function (scene, ctx) {
      if (!sh) sh = createShader(SHADER_VERT, FRAG);

      runShader(sh, scene, ctx);
    },
  });
})();
