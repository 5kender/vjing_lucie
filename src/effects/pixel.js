// pixel.js — mosaïque / pixel art (§5).
//
// La taille des blocs suit les basses : l'image se « déspixellise » dans les
// passages calmes et se casse en gros carrés sur les frappes. C'est ce
// mouvement qui rend l'effet intéressant en live — une pixellisation fixe se
// regarde dix secondes.

(function () {
  const FRAG =
    SHADER_HEAD +
    [
      'void main() {',
      // clamp avant mix : au-delà de 1, les basses inverseraient le sens.
      '  float drive = clamp(uBass * 1.4, 0.0, 1.0);',
      '  float blocks = mix(140.0, 26.0, drive);',
      '',
      // Grille corrigée du ratio, sinon les pixels sont rectangulaires.
      '  vec2 grid = vec2(blocks, blocks * uResolution.y / uResolution.x);',
      '',
      // +0.5 : on échantillonne le centre du bloc, pas son coin.
      '  vec2 uv = (floor(vTexCoord * grid) + 0.5) / grid;',
      '',
      '  gl_FragColor = vec4(sceneAt(uv), 1.0);',
      '}',
    ].join('\n');

  let sh = null;

  registerEffect({
    id: 'pixel',
    name: 'mosaïque',

    display: function (scene, ctx) {
      if (!sh) sh = createShader(SHADER_VERT, FRAG);

      runShader(sh, scene, ctx);
    },
  });
})();
