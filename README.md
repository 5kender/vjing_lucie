# VJ génératif

Instrument visuel génératif et audio-réactif, en p5.js.
Voir [CONCEPT.MD](CONCEPT.MD) pour le cahier des charges et
[IMPLEMENTATION.MD](IMPLEMENTATION.MD) pour le plan technique de la v1.

## Lancement

Le projet se lance **toujours via un serveur local**, jamais par double-clic sur
`index.html` : `getUserMedia` (le micro) est bloqué ou peu fiable en `file://`.

Depuis le dossier du projet :

```
python serve.py
```

puis ouvrir <http://localhost:8000> dans Chrome.

`serve.py` est un `http.server` ordinaire, avec `Cache-Control: no-store` en plus. Sans cet
en-tête, Chrome peut resservir un `.js` depuis son cache sans revalider : une modification
du code semble alors ne pas prendre effet, ce qui est très coûteux à diagnostiquer. Ne pas
utiliser `python -m http.server` pour développer.

Le serveur ne sert que des fichiers locaux — aucune dépendance réseau, p5 est vendorisé
dans `lib/`.

## État d'avancement

**v1 complète.** 8 générateurs × 8 animations × 8 effets, combinables librement au clavier,
avec analyse audio et tap tempo — soit 512 combinaisons, déclinables sur 8 palettes.

- **Générateurs** : spirale, cercles, Sierpiński, étoile, rosace, lissajous, nappes, grille
- **Animations** : rotation, pulsation, orbite, souffle, balancier, culbute 3D, explosion,
  tremblement
- **Effets** : normal, trail, kaléidoscope, glitch, ondulation, mosaïque, négatif, dither
- **Palettes** : cyan-violet, braise, acide, magenta, blanc, gruvbox light, nord, néon

### Performance

Deux coûts dominent, tous deux mesurés sur la machine de développement.

**Le nombre d'appels de dessin.** En WEBGL, p5 reconstruit et téléverse la géométrie de
chaque forme à chaque image : environ 0,23 ms par forme. C'est de très loin le poste
principal. La parade est le **groupement** : plusieurs sous-formes partageant une couleur
sont émises dans un seul `beginShape(LINES)`. Les cercles groupent par anneau, les nappes
par ligne, la grille par diagonale, le Sierpiński par tranche de couleur. Seuls les cercles
et le Sierpiński y perdent quelque chose, et seulement en finesse de dégradé.

**Le nombre de segments.** Une fois les formes groupées, c'est lui qui borne la densité : la
géométrie de trait est construite segment par segment quel que soit le nombre d'appels.

Les deux plafonds sont dans `src/generators/_registry.js` et sont **les** réglages de
performance du projet :

| Constante         | Rôle                                         |
| ----------------- | -------------------------------------------- |
| `SHAPE_BUDGET`    | formes par frame, pour les non groupés        |
| `SEGMENT_BUDGET`  | segments par frame, pour les groupés          |

Le troisième levier est le pipeline : un effet `direct` dessine sur le canvas principal, un
effet à `display()` impose un buffer hors-écran dont p5 transfère le contenu vers le GPU à
chaque image. **Les effets à shader sont donc structurellement plus chers que normal et
trail**, indépendamment du shader lui-même.

### Palettes

Deux familles. Les rampes (`baseHue` / `hueSpread` / `sat`) parcourent un dégradé continu
selon la position dans la forme. Les listes (`stops`) donnent des couleurs explicites, pour
les palettes dont le caractère tient à un accord précis et non à un dégradé — gruvbox et
nord en sont.

Une palette peut définir `bg`, sa couleur de fond en HSB (noir par défaut). C'est ce qui
permet à **gruvbox light** d'être réellement claire : le fond, la traîne de Trail et la
composition dans les shaders suivent tous cette couleur. Le noir total (`B`) reste noir
quelle que soit la palette — c'est une coupure, pas un choix esthétique.

L'audio s'active à la demande avec `A`, et `4` fait défiler les sources. Sans source active
— coupée ou permission refusée — **toutes les valeurs audio sont à zéro** : rien n'est
synthétisé. Les visuels restent animés par le temps et le tap tempo, mais ce qui dépend du
son se tait. Les animations **explosion** et **tremblement** sont donc immobiles tant
qu'aucune source n'est ouverte, de même que le zigzag des tracés.

### Capter le son du PC

`4` fait défiler les entrées détectées puis **audio système**. Cette dernière passe par le
partage d'écran de Chrome : c'est le seul moyen pour un navigateur de capter tout ce qui
sort de la machine.

1. Appuyer sur `4` jusqu'à voir `audio système` dans le HUD.
2. Dans la fenêtre de Chrome, choisir **l'écran entier** (pas un onglet, sinon seul cet
   onglet est capté).
3. Cocher **« Partager aussi l'audio système »** en bas de la fenêtre.

Le choix de source est mémorisé d'une session à l'autre. Si la machine expose un
périphérique de bouclage (Mixage stéréo, VB-Cable), il apparaît directement dans la liste et
évite la fenêtre de partage — c'est préférable en conditions de live.

### Ajouter un module

- **Générateur** : `src/generators/<nom>.js` + `registerGenerator({ id, name, draw(ctx) })`
- **Animation** : `src/animations/<nom>.js` + `registerAnimation({ id, name, apply(ctx) })`
- **Effet** : `src/effects/<nom>.js` + `registerEffect(...)`, sous l'une des deux formes :
  - `{ id, name, display(scene, ctx) }` — relit l'image dessinée. Requis pour les shaders.
  - `{ id, name, direct: true, prepare(ctx) }` — n'a rien à relire, prépare seulement la
    destination. Évite un buffer hors-écran et son transfert de texture à chaque frame,
    donc nettement plus rapide : à privilégier quand c'est possible.

Dans les trois cas : un fichier, plus une balise `<script>` dans `index.html`. Rien d'autre.
Un effet à base de shader écrit son GLSL dans son propre fichier et réutilise
`SHADER_VERT` et `runShader()`, qui fournissent temps, résolution, texture de scène et
données audio.

## Contrôles

| Touche | Fonction                                  |
| ------ | ----------------------------------------- |
| `1`    | Tap tempo                                 |
| `2`    | Palette suivante                          |
| `3`    | Strobe ON/OFF                             |
| `4`    | Source audio suivante                     |
| `5`    | Taille                                    |
| `6`    | Animation suivante                        |
| `7`    | Générateur suivant                        |
| `8`    | Complexité                                |
| `9`    | Symétrie (nombre de bras)                 |
| `0`    | Freeze ON/OFF                             |
| `B`    | Noir total ON/OFF                         |
| `A`    | Audio ON/OFF                              |
| `S`    | Sensibilité audio                         |
| `E`    | Effet suivant                             |
| `R`    | Inverser le sens de rotation              |
| `F`    | Plein écran                               |
| Clic   | Plein écran                               |
| `H`    | Afficher / masquer le HUD                 |

Le mapping se modifie en une ligne dans `src/controls.js`.
