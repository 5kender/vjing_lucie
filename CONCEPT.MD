# Cahier des charges — VJing génératif

## 1. Objectif

Développer une application de **VJing génératif et audio-réactif** permettant de produire en temps réel des visuels destinés à être projetés ou envoyés vers un écran/vidéoprojecteur.

L'application doit être pensée comme un **instrument visuel live** : les visuels doivent pouvoir être modifiés rapidement pendant une performance à l'aide du clavier et, à terme, de contrôleurs MIDI.

Le projet doit utiliser **p5.js** comme moteur graphique principal et **p5.sound** pour l'analyse audio.

---

## 2. Plateforme et technologies

* **JavaScript / HTML5**
* **p5.js** pour le rendu graphique et les animations
* **p5.sound** pour l'analyse audio
* Fonctionnement **local**, sans dépendance à un serveur distant
* Compatible avec les navigateurs modernes, principalement Chrome
* Rendu graphique compatible avec **WEBGL** afin de permettre des effets et transformations 3D
* Architecture suffisamment modulaire pour permettre l'ajout ultérieur de nouveaux visuels et effets

---

## 3. Génération visuelle

L'application doit proposer plusieurs familles de visuels génératifs, notamment :

* Fractales récursives
* Arbres fractals
* Spirales
* Carrés récursifs
* Cercles récursifs
* Triangles / structures de type Sierpiński
* Particules et motifs génératifs
* Autres formes géométriques génératives

Les visuels doivent être **animés en permanence** et pouvoir réagir aux paramètres audio.

### Paramètres visuels

Les éléments suivants doivent pouvoir être modifiés en direct :

* Couleur
* Taille
* Complexité
* Nombre d'éléments
* Vitesse d'animation
* Direction de rotation
* Symétrie
* Type de fractale
* Type d'animation

---

## 4. Audio-réactivité

L'application doit pouvoir analyser une source audio live, notamment :

* Microphone
* Entrée audio disponible dans le navigateur

L'analyse doit permettre d'obtenir au minimum :

* Volume général
* Basses
* Médiums
* Aigus

Ces données doivent pouvoir influencer les visuels, par exemple :

* Taille
* Rotation
* Vitesse
* Déformation
* Nombre d'éléments
* Intensité lumineuse
* Couleur
* Mouvement

Une **sensibilité audio globale** doit être réglable en direct.

Le système audio doit être activable/désactivable pendant la performance.

---

## 5. Système d'effets

L'application doit proposer plusieurs effets visuels applicables aux générateurs.

Effets minimum :

* **Normal**
* **Trail / Train** : rémanence et traces des images précédentes
* **Pixel Art**
* **3D**
* **Kaleidoscope**
* **Glitch**
* **Invert**
* **Shader**

Les effets doivent pouvoir être changés rapidement pendant une performance.

Le système doit être conçu pour permettre l'ajout de nouveaux effets sans modifier les générateurs existants.

---

## 6. Shaders

L'application doit intégrer un système permettant d'utiliser des **shaders GLSL** pour créer des effets visuels avancés.

Les shaders doivent notamment pouvoir exploiter :

* Temps
* Résolution
* Couleurs
* Paramètres d'animation
* Données audio

Des effets tels que :

* Distorsion
* RGB split
* Ondulations
* Déformation
* Noise
* Feedback
* Colorisation

doivent pouvoir être développés sous forme de shaders.

---

## 7. Contrôle live

Le clavier doit permettre de contrôler rapidement les principaux paramètres.

### Mapping initial

| Touche | Fonction                        |
| ------ | ------------------------------- |
| `1`    | Tap tempo                       |
| `2`    | Changement de couleur           |
| `3`    | Strobe ON/OFF                   |
| `5`    | Changement de taille            |
| `6`    | Changement d'animation          |
| `7`    | Changement de fractale          |
| `8`    | Complexité                      |
| `9`    | Symétrie / paramètre secondaire |
| `0`    | Freeze                          |
| `A`    | Audio ON/OFF                    |
| `S`    | Sensibilité audio               |
| `E`    | Changement d'effet              |
| `R`    | Direction de rotation           |
| `F`    | Fullscreen                      |
| `Clic  | Fullscreen                      |

Le mapping doit être facilement modifiable et extensible.

---

## 8. Tap tempo

Un système de **tap tempo** doit permettre de définir un BPM en appuyant plusieurs fois sur `1`.

Le BPM peut ensuite être utilisé par les animations pour synchroniser certains mouvements avec la musique.

Le système doit pouvoir gérer notamment :

* BPM
* Temps de mesure
* Pulsations
* Divisions du BPM

---

## 9. Animations

Plusieurs modes d'animation doivent être disponibles.

Les animations peuvent être basées sur :

* Rotation
* Pulsation
* Oscillation
* Expansion/contraction
* Déplacement
* Explosion
* Spirale
* Déformation
* Mouvement synchronisé au BPM
* Réaction au volume audio

Le système doit séparer autant que possible :

**VISUEL × ANIMATION × AUDIO × EFFET**

afin de pouvoir combiner librement ces différents éléments.

---

## 10. Performance live

L'application doit être utilisable en condition de performance.

Elle doit notamment :

* Fonctionner en fullscreen
* Éviter d'afficher des éléments d'interface sur l'output final
* Maintenir une fréquence d'image fluide
* Réagir immédiatement aux commandes clavier
* Permettre des changements de paramètres sans interruption du rendu
* Éviter les blocages lors de l'activation/désactivation de l'audio
* Être utilisable avec un vidéoprojecteur ou un deuxième écran

Un **mode interface/debug** peut afficher les informations techniques, tandis que le **mode VJ** doit pouvoir afficher uniquement le rendu visuel.

---

## 11. Architecture du projet

Le projet doit être organisé de manière modulaire.

Les principales catégories doivent être séparées :

```text
VJ
├── Audio
├── Fractals / Generators
├── Animations
├── Effects
├── Shaders
├── Controls
├── Tempo
└── Interface / Debug
```

L'ajout d'un nouveau générateur, d'une animation ou d'un effet doit être possible sans devoir réécrire l'ensemble du projet.

---

## 12. Évolutions prévues

Le projet pourra évoluer vers :

* Contrôle **MIDI**
* Mapping de contrôleurs physiques
* Launchpad
* Contrôleur avec faders / boutons
* Plusieurs paramètres assignables
* Presets
* Scènes
* Combinaison de plusieurs générateurs
* Superposition de plusieurs effets
* Capture/output vidéo
* Synchronisation MIDI / BPM
* Contrôle **Art-Net / DMX**
* Utilisation dans un setup de spectacle live

L'objectif final est d'obtenir un véritable **instrument VJ génératif**, plutôt qu'une simple collection d'animations.
