// audio.js — analyse d'une source audio, avec repli synthétique.
//
// Contrat de sortie (cf. IMPLEMENTATION.MD §6) : level, bass, mid, treble,
// toujours normalisés 0..1, plus un flag kick disponible pendant une frame.
// Le contrat est identique quelle que soit la source.
//
// **Sans source active, tout est à zéro.** Le module ne synthétise rien : une
// valeur inventée est indiscernable d'une vraie une fois dans le contexte, et
// rend impossible de juger si l'analyse fonctionne. Les visuels restent animés
// par le temps et le tap tempo, qui sont de vrais paramètres ; l'audio, lui, se
// tait quand il n'y a pas de son. `active` permet à un module de savoir dans
// quel cas il se trouve.
//
// Sources possibles :
//   - un périphérique d'entrée (micro, ou bouclage type Mixage stéréo / VB-Cable
//     quand la machine en expose un) ;
//   - l'audio du système, via le partage d'écran de Chrome. C'est le seul moyen
//     pour un navigateur de capter « tout ce qui sort du PC » : il faut partager
//     l'écran entier en cochant le partage de l'audio système.

const audio = (function () {
  // Lissage asymétrique : montée quasi immédiate, retombée douce. C'est ce qui
  // donne une réaction percutante — un lissage symétrique arrondit l'attaque et
  // donne l'impression que les visuels traînent derrière la musique.
  const ATTACK = 0.6;
  const RELEASE = 0.12;

  // Lissage interne de la FFT. Volontairement bas : il s'ajoute au nôtre, et
  // deux lissages en série rendent l'ensemble mou.
  const FFT_SMOOTHING = 0.25;

  // Le signal sort en RMS, donc à des niveaux faibles ; on remonte avant de
  // plafonner.
  const LEVEL_GAIN = 3;

  // Seuil de détection du kick, relatif à la moyenne glissante des basses.
  const KICK_RATIO = 1.4;
  const KICK_FLOOR = 0.06;

  const STORAGE_KEY = 'vj.audioSource';

  let fft = null;
  let stream = null;
  let node = null;

  let sources = [];
  let index = 0;

  let ready = false;
  let starting = false;
  let status = 'off';

  // Valeurs brutes de la frame (déclenchements) et valeurs lissées (tailles,
  // échelles). Les deux sont exposées.
  const raw = { level: 0, bass: 0, mid: 0, treble: 0 };
  const smooth = { level: 0, bass: 0, mid: 0, treble: 0 };

  const BANDS = ['level', 'bass', 'mid', 'treble'];

  // Forme d'onde rééchantillonnée, exposée aux générateurs pour déformer leurs
  // tracés. Tableau alloué une fois : il est relu à chaque sommet de chaque
  // forme, donc il ne doit rien allouer en cours de frame.
  const WAVE_SIZE = 256;
  const wave = new Float32Array(WAVE_SIZE);
  let waveCleared = true;

  let bassAverage = 0;
  let kick = false;

  // Enveloppe du kick : saute à 1 sur détection puis retombe. Le flag brut ne
  // dure qu'une frame, ce qui est inexploitable pour faire respirer une forme.
  let punch = 0;
  const PUNCH_DECAY = 0.9;

  // --- Sources ---------------------------------------------------------------

  const SYSTEM = { kind: 'system', label: 'audio système' };

  function sourceKey(source) {
    return source.kind === 'system' ? 'system' : 'device:' + source.deviceId;
  }

  function remember(source) {
    try {
      window.localStorage.setItem(STORAGE_KEY, sourceKey(source));
    } catch (e) {
      // Navigation privée ou stockage refusé : le choix ne survivra pas à la
      // session, ce n'est pas une raison pour interrompre la performance.
    }
  }

  function recalled() {
    try {
      return window.localStorage.getItem(STORAGE_KEY);
    } catch (e) {
      return null;
    }
  }

  // Les libellés des périphériques ne sont lisibles qu'une fois une permission
  // audio accordée : avant ça, l'énumération ne renvoie que des entrées vides.
  function listDevices() {
    return navigator.mediaDevices
      .getUserMedia({ audio: true })
      .then(function (probe) {
        probe.getTracks().forEach(function (t) {
          t.stop();
        });
        return navigator.mediaDevices.enumerateDevices();
      })
      .then(function (all) {
        const inputs = all.filter(function (d) {
          return d.kind === 'audioinput';
        });

        sources = inputs.map(function (d, i) {
          return {
            kind: 'device',
            deviceId: d.deviceId,
            label: d.label || 'entrée ' + (i + 1),
          };
        });
        sources.push(SYSTEM);

        const key = recalled();
        if (key) {
          const found = sources.findIndex(function (s) {
            return sourceKey(s) === key;
          });
          if (found >= 0) index = found;
        }
      });
  }

  // --- Ouverture / fermeture -------------------------------------------------

  function open(source) {
    close();

    const request =
      source.kind === 'system'
        ? // video obligatoire : Chrome ne donne l'audio système qu'avec un
          // partage d'écran. La piste vidéo doit rester vivante, sinon le
          // partage s'arrête — on ne l'affiche simplement jamais.
          navigator.mediaDevices.getDisplayMedia({ video: true, audio: true })
        : navigator.mediaDevices.getUserMedia({
            audio: {
              deviceId: { exact: source.deviceId },
              // Désactivés : ces traitements sont conçus pour la voix et
              // écrasent la dynamique d'une source musicale.
              echoCancellation: false,
              noiseSuppression: false,
              autoGainControl: false,
            },
          });

    return request.then(function (s) {
      if (!s.getAudioTracks().length) {
        s.getTracks().forEach(function (t) {
          t.stop();
        });
        throw new Error('no-audio');
      }

      stream = s;

      const context = getAudioContext();
      node = context.createMediaStreamSource(s);

      fft = new p5.FFT(FFT_SMOOTHING, 1024);
      // setInput câble la source sur l'analyseur seulement : rien n'est renvoyé
      // vers la sortie, donc aucun larsen ni écho.
      fft.setInput(node);

      // L'utilisateur peut arrêter le partage depuis la barre de Chrome.
      s.getAudioTracks()[0].addEventListener('ended', function () {
        stop();
      });

      ready = true;
      starting = false;
      // Le statut décrit l'état de la connexion, pas la source : le HUD affiche
      // les deux sur des lignes distinctes, pilotées par deux touches distinctes.
      status = 'actif';
      state.audioOn = true;
      remember(source);
      hud.markDirty();
    });
  }

  function close() {
    if (node) {
      node.disconnect();
      node = null;
    }
    if (stream) {
      stream.getTracks().forEach(function (t) {
        t.stop();
      });
      stream = null;
    }
    fft = null;
  }

  function fail(error) {
    ready = false;
    starting = false;
    status = error && error.message === 'no-audio' ? 'sans audio' : 'refusé';
    state.audioOn = false;
    hud.markDirty();
  }

  // --- API -------------------------------------------------------------------

  function available() {
    return (
      typeof p5 !== 'undefined' &&
      typeof p5.FFT !== 'undefined' &&
      navigator.mediaDevices
    );
  }

  function toggle() {
    if (ready || starting) {
      stop();
    } else {
      start();
    }
  }

  function start() {
    if (!available()) {
      status = 'indisponible';
      return;
    }
    if (starting || ready) return;

    starting = true;
    status = 'demande…';
    hud.markDirty();

    userStartAudio();

    // Cas particulier : si la source mémorisée est l'audio système et qu'on n'a
    // pas encore énuméré les périphériques, on ouvre directement. Passer par
    // l'énumération consommerait le geste utilisateur, et Chrome refuse
    // getDisplayMedia sans geste récent.
    if (!sources.length && recalled() === 'system') {
      sources = [SYSTEM];
      index = 0;
      open(SYSTEM).catch(fail);
      return;
    }

    if (sources.length) {
      open(sources[index]).catch(fail);
      return;
    }

    listDevices()
      .then(function () {
        return open(sources[index]);
      })
      .catch(fail);
  }

  function stop() {
    close();
    ready = false;
    starting = false;
    status = 'off';
    state.audioOn = false;
    hud.markDirty();
  }

  // Passe à la source suivante. Allume l'audio s'il était éteint.
  function cycleSource() {
    if (!available()) return;

    if (!sources.length) {
      start();
      return;
    }

    index = (index + 1) % sources.length;
    starting = true;
    status = 'ouverture…';
    hud.markDirty();

    // Appel direct, sans promesse intermédiaire : le geste utilisateur est
    // encore valide, ce qui est indispensable pour l'audio système.
    open(sources[index]).catch(fail);
  }

  function update() {
    if (ready && fft) {
      readInput();
    } else {
      silence();
    }

    // Sensibilité appliquée en fin de chaîne, avant l'écrêtage (§6).
    const sensitivity = SENSITIVITY_STEPS[state.sensitivity];

    for (let i = 0; i < BANDS.length; i++) {
      const b = BANDS[i];
      raw[b] = constrain(raw[b] * sensitivity, 0, 1);

      const coefficient = raw[b] > smooth[b] ? ATTACK : RELEASE;
      smooth[b] += (raw[b] - smooth[b]) * coefficient;
    }

    detectKick();
  }

  function readInput() {
    waveCleared = false;
    fft.analyze();

    raw.bass = fft.getEnergy('bass') / 255;
    raw.mid = fft.getEnergy('mid') / 255;
    raw.treble = fft.getEnergy('treble') / 255;

    // Niveau global calculé en RMS sur la forme d'onde plutôt que via
    // p5.Amplitude : une dépendance de moins, et un comportement identique
    // quelle que soit la source.
    const w = fft.waveform();

    let sum = 0;
    for (let i = 0; i < w.length; i++) {
      sum += w[i] * w[i];
    }
    raw.level = constrain(Math.sqrt(sum / w.length) * LEVEL_GAIN, 0, 1);

    // Rééchantillonnage vers une taille fixe : les générateurs indexent par
    // position sur le tracé, sans avoir à connaître la taille de la FFT.
    const stride = w.length / WAVE_SIZE;
    for (let i = 0; i < WAVE_SIZE; i++) {
      wave[i] = w[(i * stride) | 0];
    }
  }

  // Silence : aucune valeur inventée. Le lissage fait retomber les valeurs
  // exposées progressivement, donc couper la source ne provoque pas de rupture
  // visuelle.
  function silence() {
    raw.level = 0;
    raw.bass = 0;
    raw.mid = 0;
    raw.treble = 0;

    // La forme d'onde n'est remise à plat qu'une fois : la réécrire à chaque
    // frame alors qu'elle est déjà nulle ne servirait à rien.
    if (!waveCleared) {
      wave.fill(0);
      waveCleared = true;
    }
  }

  // Échantillon de forme d'onde à une position 0..1 le long d'un tracé, replié
  // en boucle. Renvoie -1..1. Appelé par sommet : volontairement sans garde ni
  // allocation.
  function sample(a) {
    const i = ((a % 1) + 1) % 1;
    return wave[(i * WAVE_SIZE) | 0];
  }

  // Pic d'énergie dans les basses au-dessus d'une moyenne glissante. Simple,
  // suffisant pour des accents visuels.
  function detectKick() {
    bassAverage += (raw.bass - bassAverage) * 0.05;
    kick = raw.bass > bassAverage * KICK_RATIO + KICK_FLOOR;

    if (kick) {
      punch = 1;
    } else {
      punch *= PUNCH_DECAY;
    }
  }

  // Objet consommé par le contexte de frame. Réutilisé d'une frame à l'autre :
  // il est relu plusieurs fois par image, il n'y a aucune raison de le
  // réallouer à chaque appel.
  const out = {
    // Permet à un module de distinguer « silence réel » de « pas de source ».
    active: false,

    level: 0,
    bass: 0,
    mid: 0,
    treble: 0,
    rawLevel: 0,
    rawBass: 0,
    kick: false,
    punch: 0,

    // Référence de fonction, pas une fermeture : rien n'est alloué par frame.
    sample: sample,
  };

  function read() {
    out.active = ready;

    out.level = smooth.level;
    out.bass = smooth.bass;
    out.mid = smooth.mid;
    out.treble = smooth.treble;

    out.rawLevel = raw.level;
    out.rawBass = raw.bass;
    out.kick = kick;
    out.punch = punch;

    return out;
  }

  function getStatus() {
    return status;
  }

  function sourceLabel() {
    return sources.length ? sources[index].label : '—';
  }

  return {
    toggle: toggle,
    cycleSource: cycleSource,
    update: update,
    read: read,
    status: getStatus,
    sourceLabel: sourceLabel,
  };
})();
