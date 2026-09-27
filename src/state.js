// state.js — l'état de la performance, source unique de vérité.
//
// Objet volontairement plat et sérialisable : le jour où on ajoute les presets,
// il suffira de le copier tel quel. Aucune logique ici, uniquement des valeurs.
// Les paramètres sont stockés sous forme d'index dans les tables ci-dessous,
// jamais sous forme de valeurs brutes — un preset reste lisible, et le clavier
// n'a qu'à incrémenter.

// §8 : en live au clavier, cycler entre quelques paliers est plus jouable
// qu'incrémenter finement. Le réglage continu viendra avec le MIDI.

// Deux familles de palettes :
//
//   - **rampe** : baseHue + hueSpread + sat. Un dégradé continu, parcouru selon
//     la position dans la forme. C'est le comportement d'origine.
//   - **stops** : une liste de couleurs [teinte, saturation, luminosité]
//     explicites. Nécessaire pour les palettes dont le caractère tient à des
//     couleurs précises et non à un dégradé — gruvbox et nord ne sont pas des
//     rampes, ce sont des accords de couleurs choisies.
//
// `bg` est la couleur de fond en HSB, noir par défaut. Elle existe parce qu'une
// palette « light » n'a aucun sens sur fond noir.
const PALETTES = [
  { name: 'cyan-violet', baseHue: 190, hueSpread: 140, sat: 70 },
  { name: 'braise', baseHue: 5, hueSpread: 55, sat: 85 },
  { name: 'acide', baseHue: 65, hueSpread: 95, sat: 80 },
  { name: 'magenta', baseHue: 290, hueSpread: 110, sat: 75 },
  { name: 'blanc', baseHue: 0, hueSpread: 0, sat: 0 },

  {
    name: 'gruvbox light',
    bg: [0, 0, 0], // 
    stops: [
      [2, 86, 80], // rouge    #cc241d
      [24, 93, 84], // orange  #d65d0e
      [40, 85, 84], // jaune   #d79921
      [60, 83, 60], // vert    #98971a
      [122, 34, 62], // aqua   #689d6a
      [183, 49, 53], // bleu   #458588
      [332, 45, 69], // violet #b16286
    ],
  },
  {
    name: 'nord',
    bg: [0, 0, 0], // 
    stops: [
      [354, 49, 75], // #bf616a
      [14, 46, 82], // #d08770
      [40, 41, 92], // #ebcb8b
      [92, 26, 75], // #a3be8c
      [193, 35, 82], // #88c0d0
      [210, 33, 76], // #81a1c1
      [311, 21, 71], // #b48ead
    ],
  },
  {
    name: 'néon',
    bg: [0, 0, 0],
    stops: [
      [320, 90, 100],
      [180, 95, 100],
      [55, 90, 100],
      [270, 80, 100],
    ],
  },
];

const BLACK = [0, 0, 0];

// Fraction de la plus petite dimension de la fenêtre.
const SIZE_STEPS = [0.22, 0.42, 0.65, 0.88];

// Nombre de tours de spirale. Plafonné : §13, une complexité trop élevée fait
// chuter le framerate en pleine performance.
const COMPLEXITY_STEPS = [1.5, 2.5, 3.5, 5, 7, 9];

// Nombre de bras.
const SYMMETRY_STEPS = [1, 2, 4, 5, 6, 8];

// Sensibilité audio — inerte jusqu'à l'étape 6, la table est déjà là.
const SENSITIVITY_STEPS = [0.5, 1, 1.75, 3];

const state = {
  // Index dans les registres. Inertes jusqu'aux étapes 4 et 5, mais présents
  // dès maintenant pour que l'objet d'état n'ait pas à changer de forme.
  generator: 0,
  animation: 0,
  effect: 0,

  // Paramètres visuels, pilotés au clavier.
  palette: 0,
  size: 1,
  complexity: 2,
  symmetry: 3,
  rotationDir: 1,

  // Audio et tempo — étape 6.
  audioOn: false,
  sensitivity: 1,
  bpm: 120,

  // Bascules de performance.
  strobe: false,
  freeze: false,
  blackout: false,
  hudVisible: true,
};

// Avance d'un cran dans une table, en bouclant.
function cycle(field, table) {
  state[field] = (state[field] + 1) % table.length;
}

// Couleur HSB d'une palette à une position 0..1, pour une luminosité demandée
// par le générateur (0..100).
//
// Les générateurs passent par là plutôt que de lire les champs de la palette :
// c'est ce qui permet de faire coexister rampes et listes de couleurs sans que
// les huit générateurs aient à connaître la différence.
function paletteColor(palette, ratio, brightness) {
  const bright = brightness === undefined ? 100 : brightness;

  if (palette.stops) {
    const count = palette.stops.length;
    const wrapped = ((ratio % 1) + 1) % 1;
    const stop = palette.stops[constrain(floor(wrapped * count), 0, count - 1)];

    // La luminosité du générateur devient un facteur : sur une palette à
    // couleurs choisies, l'imposer en valeur absolue détruirait l'accord.
    return [stop[0], stop[1], (stop[2] * bright) / 100];
  }

  return [
    (palette.baseHue + ratio * palette.hueSpread + 360) % 360,
    palette.sat,
    bright,
  ];
}

// Raccourci utilisé par les générateurs.
function strokePalette(g, palette, ratio, brightness) {
  const c = paletteColor(palette, ratio, brightness);
  g.stroke(c[0], c[1], c[2]);
}

function paletteBg(palette) {
  return palette.bg || BLACK;
}

// HSB (360/100/100) vers RGB 0..1, pour les uniformes de shader qui ne
// connaissent pas le colorMode de p5.
function hsbToRgb(h, s, b) {
  const chroma = (b / 100) * (s / 100);
  const sector = ((((h % 360) + 360) % 360) / 60);
  const x = chroma * (1 - Math.abs((sector % 2) - 1));
  const m = b / 100 - chroma;

  let r = 0;
  let g = 0;
  let bl = 0;

  if (sector < 1) { r = chroma; g = x; }
  else if (sector < 2) { r = x; g = chroma; }
  else if (sector < 3) { g = chroma; bl = x; }
  else if (sector < 4) { g = x; bl = chroma; }
  else if (sector < 5) { r = x; bl = chroma; }
  else { r = chroma; bl = x; }

  return [r + m, g + m, bl + m];
}
