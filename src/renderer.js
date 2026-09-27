// renderer.js — le pipeline de rendu (cf. IMPLEMENTATION.MD §3).
//
// Deux chemins, selon ce que l'effet courant réclame :
//
//   - **direct** : le générateur dessine sur le canvas principal, et l'effet se
//     contente de préparer la destination avant. Aucun buffer intermédiaire.
//   - **bufferisé** : le générateur dessine dans un buffer hors-écran, que
//     l'effet relit comme une texture. Obligatoire pour les shaders.
//
// Le chemin direct existe pour la performance : un buffer hors-écran est un
// second canvas, et p5 doit en ré-uploader le contenu vers le GPU à chaque
// frame — plusieurs méga-octets par image en 1080p. Les effets qui n'ont pas
// besoin de relire l'image n'ont aucune raison de payer ça.

const renderer = (function () {
  let scene = null;

  function setup() {
    scene = createGraphics(windowWidth, windowHeight, WEBGL);
    configure();
  }

  // Le buffer a ses propres réglages : ceux du canvas principal ne s'y propagent pas.
  function configure() {
    scene.pixelDensity(1);
    scene.colorMode(HSB, 360, 100, 100, 100);
  }

  function resize() {
    scene.resizeCanvas(windowWidth, windowHeight);
    configure();
  }

  function render(ctx) {
    // Noir total. Testé avant tout le reste : c'est une coupure franche, elle
    // doit être immédiate et ne rien laisser passer, quel que soit l'effet.
    if (state.blackout) {
      background(0);
      return;
    }

    const effect = effects[state.effect];

    if (effect.direct) {
      renderDirect(effect, ctx);
    } else {
      renderBuffered(effect, ctx);
    }
  }

  function renderDirect(effect, ctx) {
    // Gelé : on ne touche à rien, le canvas conserve sa dernière image.
    // Le strobe est ignoré dans ce cas — sans buffer, une pulsation noire
    // détruirait l'image figée sans qu'on puisse la reconstruire.
    if (state.freeze) return;

    // En mode global, l'API de dessin de p5 est posée sur window : c'est donc
    // une surface valide, au même titre qu'un p5.Graphics. Les générateurs ne
    // voient aucune différence.
    ctx.g = window;

    effect.prepare(ctx);
    if (ctx.lit) paint(ctx);
  }

  function renderBuffered(effect, ctx) {
    ctx.g = scene;

    // Sur freeze, le buffer n'est ni effacé ni redessiné : il conserve sa
    // dernière image, et l'effet continue de tourner dessus.
    if (!state.freeze) {
      scene.clear();
      if (ctx.lit) paint(ctx);
    }

    // Strobe pendant un freeze : masquer sans détruire le buffer de scène, qu'on
    // serait incapable de reconstruire à la pulsation suivante.
    if (state.freeze && !ctx.lit) {
      background(0);
      return;
    }

    effect.display(scene, ctx);
  }

  // Le renderer encadre l'appel : ni l'animation ni le générateur n'ont à
  // nettoyer la matrice derrière eux.
  function paint(ctx) {
    const g = ctx.g;

    g.push();
    animations[state.animation].apply(ctx);
    generators[state.generator].draw(ctx);
    g.pop();
  }

  return {
    setup: setup,
    resize: resize,
    render: render,
  };
})();
