// animations/_registry.js — registre des animations.
//
// Contrat d'une animation (cf. IMPLEMENTATION.MD §5) :
//   { id, name, apply(ctx) }
//
// Elle ne dessine pas : elle pose une transformation sur `ctx.g` (rotation,
// translation, échelle) avant que le générateur ne dessine. Le renderer encadre
// l'appel par un push/pop, l'animation n'a pas à nettoyer derrière elle.
//
// Conséquence voulue : n'importe quelle animation fonctionne avec n'importe quel
// générateur, sans qu'ils se connaissent.
//
// Contrairement aux générateurs, une animation **peut** garder un état interne,
// et c'est même souhaitable : un angle doit être accumulé image par image, pas
// recalculé depuis le temps écoulé. Sans ça, toute vitesse variable (audio,
// inversion de sens) ferait sauter l'image au lieu de la faire tourner.

const animations = [];

function registerAnimation(animation) {
  animations.push(animation);
}
