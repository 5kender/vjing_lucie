// controls.js — table de correspondance touche → action.
//
// §7 / §8 : une touche, une fonction courte qui modifie l'état. Pas de switch
// géant. Le mapping se lit comme un tableau et se modifie en une ligne.
// Le jour où le MIDI arrive, il écrira dans le même objet d'état que le clavier.

const controls = (function () {
  const MAP = {
    '1': function () { tempo.tap(millis()); },
    '2': function () { cycle('palette', PALETTES); },
    '3': function () { state.strobe = !state.strobe; },
    '4': function () { audio.cycleSource(); },
    '5': function () { cycle('size', SIZE_STEPS); },
    '6': function () { cycle('animation', animations); },
    '7': function () { cycle('generator', generators); },
    '8': function () { cycle('complexity', COMPLEXITY_STEPS); },
    '9': function () { cycle('symmetry', SYMMETRY_STEPS); },
    '0': function () { state.freeze = !state.freeze; },
    'b': function () { state.blackout = !state.blackout; },
    'e': function () { cycle('effect', effects); },
    'r': function () { state.rotationDir *= -1; },
    'a': function () { audio.toggle(); },
    's': function () { cycle('sensitivity', SENSITIVITY_STEPS); },
    'f': function () { toggleFullscreen(); },
    'h': function () {
      state.hudVisible = !state.hudVisible;
      hud.setVisible(state.hudVisible);
    },
  };

  // Renvoie true si la touche a été consommée, pour que main.js puisse
  // neutraliser le comportement par défaut du navigateur.
  function handleKey(k) {
    const action = MAP[k];
    if (!action) return false;

    action();
    // Le HUD se rafraîchit 4 fois par seconde : sans ça, un appui pourrait
    // mettre 250 ms à s'afficher et donner une impression de latence.
    hud.markDirty();
    return true;
  }

  return { handleKey: handleKey, MAP: MAP };
})();
