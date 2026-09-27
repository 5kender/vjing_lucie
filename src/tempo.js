// tempo.js — tap tempo et phases dérivées.
//
// Les animations consomment les phases fournies ici plutôt que de recalculer du
// temps de leur côté : c'est ce qui rend le tap tempo réellement utile plutôt
// que décoratif.

const tempo = (function () {
  const MIN_BPM = 60;
  const MAX_BPM = 200;

  // Au-delà, la série de taps est considérée comme abandonnée et repart de zéro.
  const RESET_MS = 2000;

  // Moyenne sur les 4 derniers intervalles, soit 5 taps mémorisés.
  const MAX_INTERVALS = 4;

  let taps = [];
  let bpm = 120;
  let beatMs = 60000 / bpm;

  // Instant du dernier tap : il redéfinit le temps fort, sinon on serait à
  // tempo juste mais à contretemps.
  let origin = 0;

  function tap(now) {
    if (taps.length && now - taps[taps.length - 1] > RESET_MS) {
      taps = [];
    }

    taps.push(now);
    if (taps.length > MAX_INTERVALS + 1) taps.shift();

    origin = now;

    if (taps.length >= 2) {
      let total = 0;
      for (let i = 1; i < taps.length; i++) {
        total += taps[i] - taps[i - 1];
      }
      const average = total / (taps.length - 1);

      bpm = constrain(60000 / average, MIN_BPM, MAX_BPM);
      beatMs = 60000 / bpm;
      state.bpm = round(bpm);
    }
  }

  // Toutes les phases sont dans 0..1 et calées sur le temps réel : la musique ne
  // s'arrête pas quand le rendu est gelé.
  //
  // Objet réutilisé d'une frame à l'autre, comme pour l'audio.
  const out = { bpm: 120, phase: 0, double: 0, half: 0, bar: 0 };

  function read(now) {
    const elapsed = now - origin;

    out.bpm = bpm;
    out.phase = cyclePhase(elapsed, beatMs); // le temps
    out.double = cyclePhase(elapsed, beatMs / 2); // la croche
    out.half = cyclePhase(elapsed, beatMs * 2); // les deux temps
    out.bar = cyclePhase(elapsed, beatMs * 4); // la mesure

    return out;
  }

  function cyclePhase(elapsed, period) {
    // Le modulo d'un négatif reste négatif en JS : sans le rattrapage, la phase
    // partirait à l'envers juste après un tap.
    return ((elapsed % period) + period) % period / period;
  }

  return { tap: tap, read: read };
})();
