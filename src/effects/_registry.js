// effects/_registry.js — registre des effets et socle commun des shaders.
//
// Deux formes d'effet (cf. IMPLEMENTATION.MD §5), selon qu'il a besoin ou non
// de relire l'image dessinée :
//
//   { id, name, display(scene, ctx) }
//       Reçoit le buffer de scène et l'affiche sur le canvas principal. Requis
//       dès qu'il faut échantillonner l'image — donc pour tous les shaders.
//
//   { id, name, direct: true, prepare(ctx) }
//       N'a rien à relire. Prépare seulement la destination, et le générateur
//       dessine ensuite droit sur le canvas principal. Évite un buffer
//       hors-écran et le transfert de texture qui va avec, à chaque frame.
//
// Dans les deux cas c'est l'effet qui décide d'effacer ou non la destination :
// c'est ce qui permet à Trail d'exister sans que les générateurs en sachent
// quoi que ce soit.
//
// Ajouter un effet = un fichier + une ligne dans index.html.

const effects = [];

function registerEffect(effect) {
  effects.push(effect);
}

// --- Socle shader -----------------------------------------------------------
// Les shaders sont écrits en chaînes dans les fichiers d'effets plutôt que dans
// des .frag séparés : un effet reste un seul fichier autonome, GLSL compris, et
// on évite preload() et son chargement asynchrone.

// Vertex shader partagé. Il passe par les matrices de p5 plutôt que par une
// astuce de normalisation : la géométrie est un plane() aux dimensions réelles
// du canvas, donc les coordonnées sont celles que p5 utilise partout ailleurs.
const SHADER_VERT = [
  'precision highp float;',
  '',
  'attribute vec3 aPosition;',
  'attribute vec2 aTexCoord;',
  '',
  'uniform mat4 uModelViewMatrix;',
  'uniform mat4 uProjectionMatrix;',
  '',
  'varying vec2 vTexCoord;',
  '',
  'void main() {',
  '  vTexCoord = aTexCoord;',
  '  gl_Position = uProjectionMatrix * uModelViewMatrix * vec4(aPosition, 1.0);',
  '}',
].join('\n');

// Préambule commun à tous les fragment shaders : uniformes standards et accès
// à la scène. Un nouvel effet s'écrit donc en concaténant SHADER_HEAD et son
// corps, sans avoir à redéclarer quoi que ce soit.
const SHADER_HEAD = [
  'precision highp float;',
  '',
  'varying vec2 vTexCoord;',
  '',
  'uniform sampler2D uTex;',
  'uniform vec3 uBg;',
  'uniform vec2 uResolution;',
  'uniform float uTime;',
  'uniform float uLevel;',
  'uniform float uBass;',
  'uniform float uMid;',
  'uniform float uTreble;',
  '',
  'const float PI = 3.14159265359;',
  '',
  // Le buffer de scène est transparent là où rien n'est dessiné — c'est ce qui
  // permet à Trail d'exister. Les shaders doivent donc composer eux-mêmes sur le
  // fond de la palette : lire .rgb directement ferait sortir tout le vide en
  // noir, ce qui ruine une palette claire.
  'vec3 sceneAt(vec2 uv) {',
  '  vec4 c = texture2D(uTex, uv);',
  '  return mix(uBg, c.rgb, c.a);',
  '}',
  '',
].join('\n');

// Uniformes standards fournis à tout shader (§6) : temps, résolution, texture
// de scène, fond de palette, niveau audio global et les trois bandes. Écrire un
// nouveau shader ne demande donc jamais de s'occuper du câblage de ses entrées.
// Conversion du fond mise en cache : une palette ne change qu'à l'appui sur 2,
// pas soixante fois par seconde.
let bgCacheSource = null;
let bgCacheRgb = [0, 0, 0];

function backgroundRgb(palette) {
  if (palette !== bgCacheSource) {
    const bg = paletteBg(palette);
    bgCacheRgb = hsbToRgb(bg[0], bg[1], bg[2]);
    bgCacheSource = palette;
  }
  return bgCacheRgb;
}

function runShader(sh, scene, ctx) {
  shader(sh);

  sh.setUniform('uBg', backgroundRgb(ctx.params.palette));
  sh.setUniform('uTex', scene);
  sh.setUniform('uResolution', [width, height]);
  // Temps réel et non horloge de scène : c'est ce qui fait qu'une image gelée
  // continue de glitcher au lieu de se figer complètement.
  sh.setUniform('uTime', ctx.now / 1000);
  sh.setUniform('uLevel', ctx.audio.level);
  sh.setUniform('uBass', ctx.audio.bass);
  sh.setUniform('uMid', ctx.audio.mid);
  sh.setUniform('uTreble', ctx.audio.treble);

  noStroke();
  plane(width, height);

  // Sans ça, le shader resterait actif pour les dessins suivants.
  resetShader();
}
