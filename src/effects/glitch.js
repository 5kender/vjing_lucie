// glitch.js — décalage de bandes horizontales et séparation RGB.

(function () {
  const FRAG =
    SHADER_HEAD +
    [
      'float hash(float n) {',
      '  return fract(sin(n) * 43758.5453123);',
      '}',
      '',
      'void main() {',
      '  vec2 uv = vTexCoord;',
      '',
      // Le temps est quantifié : les bandes sautent par paliers au lieu de
      // glisser continûment, ce qui donne l'aspect « cassé » recherché.
      '  float band = floor(uv.y * 24.0);',
      '  float step_t = floor(uTime * 8.0);',
      '',
      // Seules quelques bandes sont déplacées à la fois.
      '  float pick = step(0.82, hash(band + step_t * 13.0));',
      '  float shift = pick * (hash(band * 7.0 + step_t) - 0.5) * 0.18;',
      '  uv.x += shift;',
      '',
      // Séparation RGB, amplifiée sur les bandes déplacées et par l'audio.
      '  float split = 0.004 + abs(shift) * 0.25 + uLevel * 0.02;',
      '',
      '  float r = sceneAt(uv + vec2(split, 0.0)).r;',
      '  float g = sceneAt(uv).g;',
      '  float b = sceneAt(uv - vec2(split, 0.0)).b;',
      '',
      '  gl_FragColor = vec4(r, g, b, 1.0);',
      '}',
    ].join('\n');

  let sh = null;

  registerEffect({
    id: 'glitch',
    name: 'glitch',

    display: function (scene, ctx) {
      // §13 : compilation à la première utilisation, puis mise en cache.
      if (!sh) sh = createShader(SHADER_VERT, FRAG);

      runShader(sh, scene, ctx);
    },
  });
})();
