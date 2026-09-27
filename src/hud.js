// hud.js — overlay DOM de debug.
//
// §9 : overlay HTML et non dessin dans le canvas, pour qu'en mode VJ l'output
// projeté soit strictement propre — masquer le HUD, c'est masquer un élément DOM.
//
// Les lignes sont déclarées ici et construites au démarrage : ajouter un
// indicateur = une ligne dans LIGNES. Elles suivent **l'ordre du mapping
// clavier**, et chacune rappelle la touche qui la modifie — en live, on lit la
// valeur et la commande d'un seul coup d'œil, sans traduire mentalement.

const hud = (function () {
  // §9 : rafraîchi 4 fois par seconde, pas à chaque frame. Écrire dans le DOM
  // 60 fois par seconde pour afficher des chiffres est un gaspillage pur.
  // Les lignes marquées `live` échappent à cette règle.
  const REFRESH_MS = 250;
  const HINT_DELAY_MS = 8000;

  const LIGNES = [
    // --- Paramètres pilotables, dans l'ordre des touches ---
    { cmd: '1', k: 'bpm', get: function () { return state.bpm; } },
    { cmd: '2', k: 'palette', get: function () { return PALETTES[state.palette].name; } },
    { cmd: '3', k: 'strobe', get: function () { return state.strobe ? 'ON' : 'off'; } },
    { cmd: '4', k: 'source', get: function () { return audio.sourceLabel(); } },
    { cmd: '5', k: 'taille', get: function () { return SIZE_STEPS[state.size].toFixed(2); } },
    { cmd: '6', k: 'anim', get: function () { return animations[state.animation].name; } },
    { cmd: '7', k: 'visuel', get: function () { return generators[state.generator].name; } },
    { cmd: '8', k: 'complex', get: function () { return COMPLEXITY_STEPS[state.complexity]; } },
    { cmd: '9', k: 'symétrie', get: function () { return SYMMETRY_STEPS[state.symmetry]; } },
    { cmd: '0', k: 'freeze', get: function () { return state.freeze ? 'ON' : 'off'; } },
    { cmd: 'B', k: 'noir', get: function () { return state.blackout ? 'ON' : 'off'; } },
    { cmd: 'A', k: 'audio', get: function () { return audio.status(); } },
    { cmd: 'S', k: 'sensib', get: function () { return SENSITIVITY_STEPS[state.sensitivity] + '×'; } },
    { cmd: 'E', k: 'effet', get: function () { return effects[state.effect].name; } },
    { cmd: 'R', k: 'rotation', get: function () { return state.rotationDir > 0 ? 'horaire' : 'anti-horaire'; } },

    // --- Lectures seules, sans commande associée ---
    // `live` : rafraîchi à chaque frame. Une barre de niveau à 4 images par
    // seconde donne l'impression que l'analyse traîne, alors que c'est
    // l'affichage qui est en retard.
    { cmd: '', k: 'basses', live: true, get: function () { return bar(audio.read().bass); } },
    { cmd: '', k: 'médiums', live: true, get: function () { return bar(audio.read().mid); } },
    { cmd: '', k: 'aigus', live: true, get: function () { return bar(audio.read().treble); } },
    { cmd: '', k: 'fps', get: function () { return frameRate().toFixed(0); } },
    { cmd: '', k: 'res', get: function () { return width + '×' + height; } },
  ];

  // Barre de niveau en caractères : lisible en monospace, et sans coût de mise
  // en page à chaque rafraîchissement.
  function bar(v) {
    const size = 12;
    const filled = constrain(round(v * size), 0, size);
    return '█'.repeat(filled) + '·'.repeat(size - filled);
  }

  let root = null;
  let hintEl = null;
  const valueEls = {};

  let lastRefresh = -Infinity;
  let dirty = true;

  function init() {
    root = document.getElementById('hud');
    hintEl = document.getElementById('hud-hint');

    const rows = document.getElementById('hud-rows');

    LIGNES.forEach(function (ligne) {
      const row = document.createElement('div');
      row.className = 'row';

      const cmd = document.createElement('span');
      cmd.className = 'cmd';
      cmd.textContent = ligne.cmd;

      const label = document.createElement('span');
      label.className = 'k';
      label.textContent = ligne.k;

      const value = document.createElement('span');
      value.textContent = '—';

      row.appendChild(cmd);
      row.appendChild(label);
      row.appendChild(value);
      rows.appendChild(row);

      valueEls[ligne.k] = value;
    });

    // Le rappel du mapping s'efface tout seul : la démo reste utilisable par
    // quelqu'un qui n'a pas lu le README, sans polluer l'écran ensuite.
    if (hintEl) {
      window.setTimeout(function () {
        hintEl.classList.add('faded');
      }, HINT_DELAY_MS);
    }

    setVisible(state.hudVisible);
  }

  // `t` est le temps réel de la frame, fourni par main.js.
  function update(t) {
    if (!state.hudVisible || !root) return;

    const full = dirty || t - lastRefresh >= REFRESH_MS;
    if (full) {
      lastRefresh = t;
      dirty = false;
    }

    LIGNES.forEach(function (ligne) {
      if (!full && !ligne.live) return;
      valueEls[ligne.k].textContent = ligne.get();
    });
  }

  // Force le prochain update à écrire, sans attendre le tick de 250 ms.
  function markDirty() {
    dirty = true;
  }

  function setVisible(v) {
    if (!root) return;
    root.classList.toggle('hidden', !v);
  }

  return {
    init: init,
    update: update,
    markDirty: markDirty,
    setVisible: setVisible,
  };
})();
