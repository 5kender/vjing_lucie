// kaleido.js — kaléidoscope, repliement polaire de l'image.

(function () {
  const FRAG =
    SHADER_HEAD +
    [
      'const float SEGMENTS = 6.0;',
      '',
      'void main() {',
      // Centrer et corriger le ratio, sinon le repliement est ovale.
      '  vec2 uv = vTexCoord - 0.5;',
      '  float aspect = uResolution.x / uResolution.y;',
      '  uv.x *= aspect;',
      '',
      '  float radius = length(uv);',
      '  float angle = atan(uv.y, uv.x);',
      '',
      // Repliement : on ramène l'angle dans un secteur, puis on le replie sur
      // lui-même pour obtenir le miroir caractéristique du kaléidoscope.
      '  float segment = 2.0 * PI / SEGMENTS;',
      '  angle = mod(angle, segment);',
      '  angle = abs(angle - segment * 0.5);',
      '',
      // Lente rotation du motif, accélérée par le niveau audio.
      '  angle += uTime * 0.1 + uLevel * 0.5;',
      '',
      '  vec2 p = vec2(cos(angle), sin(angle)) * radius;',
      '  p.x /= aspect;',
      '  p += 0.5;',
      '',
      '  gl_FragColor = vec4(sceneAt(p), 1.0);',
      '}',
    ].join('\n');

  let sh = null;

  registerEffect({
    id: 'kaleido',
    name: 'kaléidoscope',

    display: function (scene, ctx) {
      // §13 : compilation à la première utilisation, puis mise en cache.
      if (!sh) sh = createShader(SHADER_VERT, FRAG);

      runShader(sh, scene, ctx);
    },
  });
})();
