# Plan d'implémentation — VJ génératif, v1 (MVP)

Document de travail décrivant l'organisation technique d'une **première version jouable**.
Objectif : une démo qui tourne, qui réagit au son, qui se pilote au clavier — et dont
l'architecture permet d'absorber la suite du [CONCEPT.MD](CONCEPT.MD) sans réécriture.

Ce document est volontairement **descriptif** : il fixe les décisions, les contrats entre
modules et le périmètre. Aucun code ici.

---

## 1. Principe directeur de la v1

Une seule idée structurante, tirée du §9 du concept :

> **VISUEL × ANIMATION × AUDIO × EFFET**

Ces quatre axes sont indépendants et combinables. Tout le reste de la v1 découle de ça :
chaque axe est un **registre** (une liste de modules interchangeables partageant un même
contrat), et le clavier ne fait que déplacer un curseur dans ces listes.

Tout ce qui n'est pas nécessaire à faire fonctionner ces quatre axes est reporté.

---

## 2. Choix techniques (le plus évident possible)

**Pas de build, pas de npm, pas de bundler.** Un `index.html` qui charge une série de
fichiers `.js` via des balises `<script>` classiques, dans un ordre défini. p5.js en **mode
global** (les fonctions `setup`/`draw` au niveau racine, comme dans tous les exemples p5).
C'est le mode le plus documenté et le plus simple à débugger.

Le service en local (voir plus bas) rendrait les modules ES utilisables, mais on **reste
volontairement sur des `<script>` classiques** : le mode global de p5 suppose `setup` et
`draw` sur l'objet `window`, et le mélanger à des modules crée plus de friction qu'il n'en
retire. L'ordre de chargement déclaré dans `index.html` fait office de liste de dépendances,
ce qui suffit largement à l'échelle du projet.

**Bibliothèques vendorisées.** `p5.min.js` et `p5.sound.min.js` sont copiés dans `lib/`,
pas chargés depuis un CDN — le concept impose un fonctionnement local sans dépendance
réseau (§2).

**Lancement : toujours via un serveur local.** Décision actée — le projet se lance avec
`python -m http.server` (ou équivalent) et s'ouvre sur `localhost`, jamais par double-clic
sur `index.html`. C'est la contrainte de `getUserMedia`, peu fiable voire bloqué en
`file://` selon les navigateurs, et il n'y a aucun intérêt à maintenir deux modes de
lancement dont l'un ne sait pas faire de son. Le README de la v1 donne cette commande comme
unique procédure ; l'ouverture en `file://` n'est pas un cas supporté. Cela ne remet pas en
cause le §2 du concept : le serveur ne sert que des fichiers locaux, aucune dépendance
réseau.

**Shaders écrits en chaînes de caractères dans des fichiers `.js`**, pas dans des fichiers
`.frag` séparés. Le service en local lève l'obstacle technique (`loadShader()` sur fichier
externe fonctionne dès qu'on quitte `file://`), mais on garde les shaders inline pour deux
raisons qui tiennent d'elles-mêmes : un effet reste **un seul fichier autonome**, GLSL
compris — ce qui sert directement le critère « ajouter un effet = un fichier » — et on évite
`preload()` et son chargement asynchrone, qui cadrerait mal avec la compilation paresseuse
des effets. À externaliser le jour où les shaders se multiplient et où la coloration
syntaxique commencera à manquer.

**Un seul canvas WEBGL** (§2 du concept). Les générateurs dessinent avec les primitives
p5 habituelles — en WEBGL l'origine est au centre du canvas, ce qui est un avantage direct
pour des fractales et des spirales radiales : pas de `translate` de recentrage à écrire.

---

## 3. Pipeline de rendu

Le point le plus structurant de la v1, car c'est ce qui coûte cher à changer après coup.

Rendu en **deux étages** :

1. **Étage scène** — un buffer hors-écran (`p5.Graphics` en WEBGL, aux dimensions de la
   fenêtre). C'est là que le générateur courant dessine, sous la transformation imposée par
   l'animation courante. Ce buffer est la « matière première ».
2. **Étage effet** — le canvas principal, qui affiche ce buffer en lui appliquant l'effet
   courant. Un effet est soit un simple dessin de la texture (Normal), soit un dessin avec
   un shader appliqué, soit une manipulation de l'historique du canvas (Trail).

Pourquoi deux étages dès la v1, alors que ce n'est pas le plus court chemin ? Parce que
c'est exactement ce qui permet d'ajouter un effet **sans toucher aux générateurs** (§5 du
concept), et parce que c'est le prérequis du système de shaders (§6). Un pipeline mono-étage
obligerait à tout reprendre à la première tentative de post-traitement.

Deux cas particuliers à traiter explicitement :

- **Trail / rémanence** : l'effet n'efface pas le canvas principal et y superpose un voile
  noir semi-transparent avant de dessiner la nouvelle frame. L'opacité du voile est le
  paramètre « longueur de traîne ». Le buffer de scène, lui, est effacé à chaque frame.
- **Freeze** : on cesse d'appeler le générateur, mais l'étage effet continue de tourner.
  Le résultat est plus intéressant qu'un vrai gel (l'image figée continue de glitcher) et
  ça évite d'avoir à couper la boucle `draw`.

---

## 4. Arborescence

```text
vjing/
├── CONCEPT.MD
├── IMPLEMENTATION.MD
├── README.md              ← lancement + mapping clavier
├── index.html             ← ordre de chargement des scripts
├── style.css              ← canvas plein écran, fond noir, styles du HUD
├── lib/
│   ├── p5.min.js
│   └── p5.sound.min.js
└── src/
    ├── state.js           ← l'état de la performance (source unique de vérité)
    ├── audio.js           ← micro, FFT, bandes, lissage, sensibilité
    ├── tempo.js           ← tap tempo, BPM, phase, divisions
    ├── controls.js        ← table de mapping clavier → actions
    ├── hud.js             ← overlay DOM de debug
    ├── renderer.js        ← le pipeline des deux étages
    ├── main.js            ← setup / draw, câblage de l'ensemble
    ├── generators/
    │   ├── _registry.js
    │   ├── tree.js
    │   ├── spiral.js
    │   └── sierpinski.js
    ├── animations/
    │   ├── _registry.js
    │   ├── rotate.js
    │   ├── pulse.js
    │   └── orbit.js
    └── effects/
        ├── _registry.js
        ├── normal.js
        ├── trail.js
        ├── kaleido.js     ← shader
        └── glitch.js      ← shader
```

Chaque registre est un simple tableau ordonné auquel les modules s'ajoutent au chargement.
**Ajouter un générateur = créer un fichier, l'ajouter au registre, ajouter une ligne dans
`index.html`.** Rien d'autre. C'est le critère d'extensibilité du §11 du concept, et il doit
rester vrai à la fin de la v1.

---

## 5. Les contrats entre modules

Le cœur de l'architecture. Ils doivent être petits et stables.

### Le contexte de frame

Un objet unique, reconstruit à chaque frame par `main.js` et passé à tout le monde. Il
contient : le temps écoulé, la surface de dessin cible, les données audio normalisées, les
données de tempo (BPM, phase dans la mesure, pulsation), et les paramètres live issus de
l'état (couleur, taille, complexité, vitesse, sens de rotation, symétrie).

Aucun module ne lit de variable globale directement ni n'appelle `millis()` de son côté :
tout passe par ce contexte. C'est ce qui rendra triviaux, plus tard, le rendu multi-couches,
l'enregistrement de presets et la relecture temporelle.

### Générateur

Un identifiant, un nom affichable, et une fonction de dessin qui reçoit le contexte de frame
et dessine dans la surface indiquée. Il est **sans état persistant** : tout ce dont il a
besoin vient du contexte. S'il lui faut un état interne (un système de particules),
il le stocke sur lui-même et expose une fonction de réinitialisation.

Un générateur ne sait rien de l'effet appliqué, ni de l'animation, ni de la provenance des
valeurs audio. Il ne gère ni le `background`, ni le `push`/`pop` global — c'est le rôle du
renderer.

### Animation

Même forme, mais au lieu de dessiner, elle **pose une transformation** (rotation,
translation, échelle) et éventuellement module certaines valeurs du contexte avant que le
générateur ne dessine. Le renderer encadre l'appel par une sauvegarde/restauration de la
matrice.

Conséquence voulue : n'importe quelle animation fonctionne avec n'importe quel générateur,
sans qu'ils se connaissent.

### Effet

Un identifiant, un nom, et une fonction qui reçoit le buffer de scène et le canvas de
destination, et se charge de l'afficher. Les effets à base de shader compilent leur
programme une seule fois, au premier appel (jamais dans `draw`).

Les uniformes standards fournis à tout shader : temps, résolution, texture de scène,
niveau audio global, et les trois bandes. C'est le socle du §6 ; on peut ensuite écrire
un shader sans se demander comment câbler ses entrées.

### État

Un objet plat listant tous les paramètres pilotables : index du générateur, de l'animation,
de l'effet, index de palette, taille, complexité, vitesse, sens de rotation, symétrie,
sensibilité audio, audio actif, strobe, freeze, HUD visible.

C'est délibérément un objet plat et sérialisable : le jour où on ajoute les presets (§12),
il suffira de le copier tel quel. Aucune logique dedans, uniquement des valeurs.

---

## 6. Audio

`p5.AudioIn` pour le micro, `p5.FFT` pour le spectre, et une `p5.Amplitude` pour le volume
global. Trois bandes via l'analyse d'énergie du FFT : basses, médiums, aigus.

Trois traitements indispensables pour que ce soit exploitable en live :

- **Lissage** — moyenne glissante sur chaque bande, sinon les visuels tremblent au lieu de
  respirer. Deux valeurs par bande : une lissée (pour les tailles, les échelles) et une
  brute (pour les déclenchements).
- **Normalisation** — sortie systématiquement ramenée dans `0..1`, pour que les générateurs
  n'aient jamais à connaître les échelles de décibels.
- **Sensibilité** — un multiplicateur global réglable par la touche `S`, appliqué en fin de
  chaîne, avant l'écrêtage.

**Détection de battement (v1, version simple)** : un pic d'énergie dans les basses au-dessus
d'une moyenne glissante déclenche un flag « kick » disponible pendant une frame. Suffisant
pour des accents visuels, pas prétentieux.

**Sans audio** : quand la source est coupée (touche `A`) ou refusée, toutes les valeurs sont
à **zéro**. Le module ne synthétise rien. Le contrat de sortie reste identique, et un
booléen `active` permet à un module de distinguer un silence réel d'une absence de source.

> Révision après l'étape 6 : une version antérieure synthétisait des bandes à partir du BPM
> pour que les visuels bougent toujours. Abandonné à la demande de l'utilisateur, et à
> raison : une valeur inventée est indiscernable d'une vraie une fois dans le contexte de
> frame, ce qui rend impossible de juger si l'analyse fonctionne — on ne sait plus si on
> regarde le son ou la simulation. Les visuels restent animés sans source, mais par le temps
> et le tap tempo, qui sont de vrais paramètres.

L'activation du micro est faite **à la demande**, sur appui de `A`, jamais au chargement —
d'une part pour la politique d'autoplay des navigateurs, d'autre part pour respecter le §10
(pas de blocage à l'activation/désactivation).

---

## 7. Tempo

Tap tempo sur la touche `1` : on enregistre les horodatages des appuis, on moyenne les
intervalles sur les 4 derniers taps, on en déduit le BPM. Réinitialisation de la série
après 2 secondes sans appui. BPM borné à une plage plausible (60–200), valeur par défaut 120.

Le module expose en continu : le BPM, la **phase** (position entre 0 et 1 dans le beat
courant), la position dans une mesure de 4 temps, et des phases pour les divisions usuelles
(demi, double, quatre temps). Les animations consomment ces phases plutôt que de recalculer
du temps — c'est ce qui rend le §8 réellement utile plutôt que décoratif.

---

## 8. Contrôles

Une **table de correspondance** explicite : une touche → une fonction courte qui modifie
l'état. Rien d'autre, pas de `switch` géant dans le gestionnaire d'événement. Le mapping se
lit comme un tableau et se modifie en une ligne, conformément au §7.

Mapping de la v1 (sous-ensemble assumé du concept) :

| Touche  | Fonction                                     |
| ------- | -------------------------------------------- |
| `1`     | Tap tempo                                    |
| `2`     | Palette de couleurs suivante                 |
| `3`     | Strobe ON/OFF                                |
| `5`     | Taille (cycle entre paliers)                 |
| `6`     | Animation suivante                           |
| `7`     | Générateur suivant                           |
| `8`     | Complexité +1 (boucle sur une plage bornée)  |
| `9`     | Symétrie (1, 2, 4, 6, 8)                     |
| `0`     | Freeze ON/OFF                                |
| `A`     | Audio ON/OFF                                 |
| `S`     | Sensibilité audio (cycle entre paliers)      |
| `E`     | Effet suivant                                |
| `R`     | Inverser le sens de rotation                 |
| `F`     | Fullscreen                                   |
| `H`     | Afficher/masquer le HUD                      |
| Clic    | Fullscreen                                   |

Les paramètres continus (taille, sensibilité) **cyclent entre 3 ou 4 paliers** au lieu
d'être incrémentés finement : en live, au clavier, c'est plus jouable, et ça évite de se
perdre dans des valeurs intermédiaires. Le réglage fin viendra avec le MIDI (§12).

Détail à ne pas oublier : ignorer les répétitions automatiques de touche maintenue, et
neutraliser le comportement par défaut du navigateur sur les touches concernées.

---

## 9. Interface / debug

Le HUD est un **overlay HTML en DOM**, pas un dessin dans le canvas. Deux raisons : c'est
plus simple à styler, et surtout ça garantit qu'en mode VJ le canvas est strictement propre
— exigence du §10. Le masquer, c'est masquer un élément DOM ; aucun risque qu'un reste de
texte se retrouve dans l'output projeté.

Contenu : FPS, générateur / animation / effet courants, BPM, état de l'audio, sensibilité,
et les trois bandes sous forme de barres. Mise à jour à cadence réduite (2 à 4 fois par
seconde), pas à chaque frame — manipuler le DOM 60 fois par seconde pour afficher des
chiffres est un gaspillage inutile.

**Par défaut, le HUD est visible au chargement** avec un rappel du mapping qui s'efface
après quelques secondes, puis `H` le rappelle. C'est ce qui rend la démo utilisable par
quelqu'un qui n'a pas lu le README.

---

## 10. Périmètre de la v1

### Inclus

**3 générateurs** — spirale paramétrique, cercles concentriques, triangle de Sierpiński.
Choisis parce qu'ils sont visuellement très différents les uns des autres, qu'ils exploitent
tous naturellement le paramètre « complexité » (nombre de tours, nombre d'anneaux,
subdivisions), et qu'ils sont simples à écrire correctement.

> Révision à l'étape 4 : l'arbre fractal initialement prévu a été retiré au profit des
> cercles. Son coût doublait à chaque niveau de récursion et se multipliait par la symétrie,
> ce qui imposait un budget adaptatif réduisant la profondeur dans le dos de l'utilisateur.
> Les cercles ont un coût linéaire et ne demandent aucun garde-fou. L'arbre reste un bon
> candidat pour plus tard, à condition de le tracer en un seul appel de dessin.

**3 animations** — rotation continue (vitesse et sens pilotés), pulsation calée sur le BPM,
oscillation/dérive lente.

**4 effets** — Normal, Trail, Kaleidoscope (shader), Glitch avec RGB split (shader). Deux
effets sans shader et deux avec : ça valide le pipeline complet sans écrire une bibliothèque
de shaders.

**1 palette système** — 4 ou 5 palettes codées en dur, en HSB. Le HSB simplifie énormément
les variations de teinte sur les récursions et les réactions audio sur la luminosité.

**Audio** micro + 3 bandes + volume + sensibilité + repli synthétique. **Tap tempo**
complet. **Clavier** selon le tableau ci-dessus. **Fullscreen** et **HUD masquable**.

### Explicitement hors v1

MIDI et contrôleurs physiques · presets et scènes · superposition de plusieurs générateurs
· chaînage de plusieurs effets · effets Pixel Art, Invert, 3D, Shader générique ·
particules · capture/output vidéo · Art-Net/DMX · sélection de la source audio autre que le
micro · fenêtre de sortie séparée.

Aucun de ces points n'est bloqué par l'architecture décrite : chacun est soit un module
supplémentaire dans un registre existant, soit une extension du renderer (qui devient une
liste de passes au lieu d'une passe unique), soit une nouvelle source d'événements qui
écrit dans le même objet d'état que le clavier.

---

## 11. Ordre de développement

Chaque étape doit laisser le projet dans un état exécutable.

1. **Socle** — `index.html`, CSS plein écran, canvas WEBGL, boucle `draw`, redimensionnement
   à la fenêtre, un fond noir. Vérifier le fullscreen et le comptage de FPS.
2. **Un générateur en dur** — la spirale, animée par le temps, sans aucun système autour.
   Objectif : valider que dessiner en WEBGL avec l'origine au centre ne réserve pas de
   surprise.
3. **État + contrôles + HUD** — l'objet d'état, la table clavier, l'overlay. À ce stade on
   pilote les paramètres de la spirale au clavier.
4. **Les registres** — extraction du générateur vers son module, ajout des deux autres,
   ajout des animations, câblage sur les touches `6` et `7`. C'est le moment où
   l'architecture prend forme ; la faire à ce stade évite de la concevoir dans le vide.
5. **Le renderer à deux étages + effets** — buffer de scène, Normal, Trail, puis les deux
   shaders. Touche `E`.
6. **Audio et tempo** — tap tempo d'abord (il n'a pas de dépendance et alimente le repli
   synthétique), puis le micro, les bandes, la sensibilité, le branchement sur les
   générateurs et les animations.

L'audio arrive en dernier volontairement : c'est la partie la plus susceptible de poser des
problèmes d'environnement (permissions, périphériques, contexte sécurisé), et il ne faut pas
qu'elle bloque le développement du reste. Le repli synthétique de l'étape 6 rend d'ailleurs
la totalité du système démontrable même sans micro.

---

## 12. Critères de réussite de la v1

La v1 est terminée quand, sans toucher au code :

- l'application s'ouvre en plein écran, en noir, à 60 fps sur une machine ordinaire ;
- on peut traverser 3 générateurs × 3 animations × 4 effets au clavier, sans interruption
  du rendu ni saccade au changement ;
- le son du micro déforme visiblement l'image, et la sensibilité se règle en live ;
- un tap tempo cale la pulsation d'une animation sur la musique ;
- le HUD disparaît complètement et l'output projeté ne contient que du visuel ;
- **ajouter un quatrième générateur demande un fichier et deux lignes.** Ce dernier point
  est le vrai test de l'architecture : s'il n'est pas vrai, la v1 n'est pas finie, même si
  tout le reste fonctionne.

---

## 13. Points de vigilance

- Borner la profondeur de récursion des fractales. La complexité est pilotée par une touche,
  et une profondeur trop élevée fait chuter le framerate instantanément, en pleine
  performance. Plafond dur par générateur.
- Ne jamais créer de `p5.Graphics` ni compiler de shader dans `draw`. Uniquement au `setup`
  ou à la première utilisation, avec mise en cache.
- Fixer la densité de pixels à 1. Sur un écran haute densité, le coût de rendu quadruple
  pour un gain invisible en projection.
- Recréer les buffers au redimensionnement de la fenêtre — sinon le passage en fullscreen
  affiche une scène étirée.
- Le strobe doit être borné en fréquence et rester une bascule volontaire. Sécurité de base
  pour un usage en public.
- Ne pas laisser un générateur dessiner hors de son `push`/`pop` : une matrice ou un style
  qui fuit contamine les frames suivantes, et le bug est pénible à isoler.
