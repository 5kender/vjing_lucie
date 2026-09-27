// generators/_registry.js — registre des générateurs.
//
// Contrat d'un générateur (cf. IMPLEMENTATION.MD §5) :
//   { id, name, draw(ctx) }
//
// - il dessine dans `ctx.g`, jamais sur le canvas principal ;
// - il est sans état persistant : tout vient du contexte de frame ;
// - il ne sait rien de l'animation, de l'effet, ni de la provenance de l'audio ;
// - il ne gère ni le fond, ni le push/pop global : c'est le rôle du renderer.
//
// Ajouter un générateur = un fichier + un appel ici + une ligne dans index.html.

const generators = [];

function registerGenerator(generator) {
  generators.push(generator);
}

// Amplitude de la vibration du tracé, en pixels, relative à une dimension de
// référence du générateur (son rayon en général).
//
// Pilotée par les **aigus** et non par le niveau global : la respiration et le
// kick vivent sur les basses, le zigzag sur les hautes fréquences. Les deux se
// superposent au lieu de se masquer. Le plancher évite que la déformation
// disparaisse dans les passages calmes ; la touche S agit dessus indirectement.
//
// Mutualisée ici pour que tous les générateurs vibrent de la même façon et que
// les prochains en héritent sans rien recalculer.
function vibrationAmount(ctx, reference) {
  return reference * 0.22 * (0.15 + ctx.audio.treble * 1.6);
}

// Alternance de signe d'un sommet à l'autre. C'est *ça* qui fait le zigzag :
// sans elle, échantillonner une forme d'onde le long d'un tracé ne donne qu'une
// ondulation douce, quelle que soit l'amplitude.
function zig(i) {
  return i % 2 === 0 ? 1 : -1;
}

// Budget d'appels de dessin par frame.
//
// En WEBGL, p5 reconstruit et téléverse la géométrie de *chaque* forme à chaque
// image. Mesuré sur la machine de développement : environ 0,23 ms par forme,
// pour ~10 ms de coût fixe. Le framerate est donc gouverné par le nombre de
// formes, très loin devant le nombre de sommets.
//
// C'est LE réglage de performance du projet : le monter densifie les visuels au
// maximum des réglages, le baisser protège le framerate.
const SHAPE_BUDGET = 56;

// Réduit `count` pour que count × repeats tienne dans le budget.
function fitShapes(count, repeats, lowest) {
  const floorValue = lowest === undefined ? 1 : lowest;
  return max(floorValue, min(count, floor(SHAPE_BUDGET / max(1, repeats))));
}

// Une fois les formes regroupées, c'est le nombre de segments qui borne la
// densité : p5 construit la géométrie de trait segment par segment, et ce coût
// subsiste quel que soit le nombre d'appels de dessin.
// Calibré sur les mesures de la machine de développement : autour de 3500
// segments, on tient le 60 fps ; à 4000 on retombe vers 45.
const SEGMENT_BUDGET = 3600;

function fitSegments(count, segmentsEach, lowest) {
  const floorValue = lowest === undefined ? 1 : lowest;
  return max(
    floorValue,
    min(count, floor(SEGMENT_BUDGET / max(1, segmentsEach)))
  );
}
