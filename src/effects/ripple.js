// ripple.js — ondulation concentrique (§6 : distorsion / ondulations).
//
// Des anneaux partent du centre et déforment l'image radialement. Contrairement
// au kaléidoscope qui recompose la géométrie et au glitch qui la casse, celui-ci
// la laisse lisible : c'est le seul effet du lot qu'on peut garder longtemps
// sans épuiser l'œil.

(function () {
  const FRAG =
    SHADER_HEAD +
    [
      'void main() {',
      '  vec2 uv = vTexCoord - 0.5;',
      '  float aspect = uResolution.x / uResolution.y;',
      '  uv.x *= aspect;',
      '',
      '  float radius = length(uv);',
      '',
      // Les anneaux se propagent vers l'extérieur ; les médiums resserrent leur
      // espacement, le niveau global creuse leur amplitude.
      '  float frequency = 34.0 + uMid * 40.0;',
      '  float amplitude = 0.004 + uLevel * 0.022;',
      '  float offset = sin(radius * frequency - uTime * 3.0) * amplitude;',
      '',
      // Direction radiale. Le garde évite une division par zéro au centre
      // exact, qui produirait un pixel noir permanent.
      '  vec2 dir = radius > 0.0001 ? uv / radius : vec2(0.0);',
      '',
      '  vec2 p = uv + dir * offset;',
      '  p.x /= aspect;',
      '  p += 0.5;',
      '',
      '  gl_FragColor = vec4(sceneAt(p), 1.0);',
      '}',
    ].join('\n');

  let sh = null;

  registerEffect({
    id: 'ripple',
    name: 'ondulation',

    display: function (scene, ctx) {
      if (!sh) sh = createShader(SHADER_VERT, FRAG);

      runShader(sh, scene, ctx);
    },
  });
})();
