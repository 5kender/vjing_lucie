// main.js — boucle de rendu et câblage de l'ensemble.
// p5 est utilisé en mode global : setup / draw / windowResized sont appelés par p5.

// Horloge de scène. Distincte de millis() parce qu'elle s'arrête sur freeze :
// les générateurs ne connaissent que ce temps-là, jamais le temps réel. C'est
// ce qui rendra triviaux, plus tard, les presets et la relecture temporelle.
let clock = 0;

// §13 : le strobe reste une bascule volontaire et sa fréquence est bornée en dur.
const STROBE_HZ = 9;

function setup() {
  createCanvas(windowWidth, windowHeight, WEBGL);

  // §13 : sur un écran haute densité, le coût de rendu quadruple pour un gain
  // invisible en projection.
  pixelDensity(1);

  // HSB sur toute la v1 : les variations de teinte sur les récursions et les
  // réactions audio sur la luminosité deviennent triviales.
  colorMode(HSB, 360, 100, 100, 100);

  renderer.setup();
  hud.init();
}

// Contexte de frame, passé à tout le monde. Aucun module ne lit de variable
// globale ni n'appelle millis() de son côté.
//
// L'objet est **réutilisé** d'une frame à l'autre plutôt que reconstruit :
// allouer une grappe d'objets soixante fois par seconde donne au ramasse-miettes
// du travail qui finit par se voir sous forme de saccades. `g` est renseigné par
// le renderer, qui seul sait sur quelle surface on dessine cette frame.
const frame = {
  g: null,
  t: 0,
  now: 0,
  dt: 0,
  lit: true,
  audio: null,
  tempo: null,
  params: {
    palette: null,
    size: 0,
    complexity: 0,
    symmetry: 0,
    rotationDir: 1,
  },
};

function buildContext(now, lit) {
  frame.t = clock; // horloge de scène, gelée par freeze
  frame.now = now; // temps réel, jamais gelé — effets, tempo et audio s'en servent
  frame.dt = deltaTime;
  frame.lit = lit;

  // Trois bandes et un niveau, normalisés 0..1. Tout à zéro sans source
  // active : aucune valeur n'est inventée.
  frame.audio = audio.read();
  frame.tempo = tempo.read(now);

  const p = frame.params;
  p.palette = PALETTES[state.palette];
  p.size = SIZE_STEPS[state.size];
  // Complexité normalisée 0..1 : chaque générateur la projette sur sa propre
  // échelle (tours de spirale, nombre d'anneaux, subdivisions…).
  p.complexity = state.complexity / (COMPLEXITY_STEPS.length - 1);
  p.symmetry = SYMMETRY_STEPS[state.symmetry];
  p.rotationDir = state.rotationDir;

  return frame;
}

function draw() {
  const now = millis();
  if (!state.freeze) clock += deltaTime;

  // Avant la construction du contexte : l'analyse de la frame doit être prête
  // quand les générateurs la lisent.
  audio.update();

  // Le strobe est cadencé sur le temps réel et non sur l'horloge de scène :
  // il continue donc de clignoter pendant un freeze.
  const lit = !state.strobe || floor(now / (1000 / STROBE_HZ)) % 2 === 0;

  renderer.render(buildContext(now, lit));

  hud.update(now);
}

function windowResized() {
  // §13 : sans ça, le passage en plein écran affiche une scène étirée.
  resizeCanvas(windowWidth, windowHeight);
  renderer.resize();
}

function keyPressed(event) {
  // Ignorer la répétition automatique d'une touche maintenue (§8).
  if (event && event.repeat) return;

  // neutralise le comportement par défaut du navigateur si la touche est mappée
  if (controls.handleKey(key.toLowerCase())) return false;
}

function mousePressed() {
  toggleFullscreen();
}

function toggleFullscreen() {
  // Doit être déclenché par un geste utilisateur : keyPressed et mousePressed
  // en sont, l'appel est donc légitime ici.
  fullscreen(!fullscreen());
}
