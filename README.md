# MAZEO — Les labyrinthes vivants

Jeu de puzzle mobile : chaque case quittée par Bourgeon se referme derrière lui (une haie pousse).
Il faut donc réfléchir à son trajet avant d'avancer.

Phaser 4.2.1 · TypeScript · Vite · WebGL · sauvegarde locale · sons synthétisés (Web Audio).

## Lancer le jeu

```bash
npm install
npm run dev          # http://localhost:5173
```

### Tester sur smartphone (même Wi-Fi que l'ordinateur)

1. `npm run dev` affiche une adresse « Network », par ex. `http://192.168.1.20:5173`.
2. Ouvrez cette adresse sur le téléphone (Safari iOS ou Chrome Android), en mode portrait.
3. Optionnel : « Ajouter à l'écran d'accueil » pour un affichage plein écran.
4. Le son démarre après le premier toucher (règle des navigateurs mobiles).

Si le téléphone n'accède pas à l'adresse, vérifiez le pare-feu de l'ordinateur (port 5173).

### Version de production

```bash
npm run build          # dossier dist/ (à héberger sur n'importe quel serveur statique)
npm run build:single   # dist-single/index.html : un seul fichier autonome
npm run preview        # sert dist/ sur le réseau local
```

## Comment jouer

- **Glisser** : touchez Bourgeon, glissez le doigt sur les cases voisines ; le trajet apparaît
  en orange, Bourgeon part quand vous relâchez. Revenir en arrière avec le doigt raccourcit le tracé.
- **Toucher une case voisine** : avance d'une case (méthode précise). Les flèches blanches/orange
  indiquent les cases accessibles.
- **Annuler** : revient exactement à l'état d'avant la dernière action (tracé ou pas).
- **Recommencer**, **Pause**, son activé/désactivé (en haut à droite).
- Ordinateur : souris, ou flèches du clavier, `Z` annuler, `R` recommencer, `Échap` pause.

Règles : les chemins se ferment après passage ; les ponts (déployés par l'interrupteur) et l'arche
florale (ouverte par la graine magique) restent ouverts ; la sortie n'accepte Bourgeon qu'avec
tous les objets / animaux.

Étoiles : ★ niveau terminé · ★ sans utiliser Annuler · ★ sans recommencer.

## Architecture

```
src/core/      moteur pur (sans Phaser) : grille, règles, solveur/validateur
src/levels/    les 6 niveaux (données uniquement)
src/art/       palette + toutes les textures dessinées en Canvas 2D (aucun asset externe)
src/audio/     effets sonores et ambiance synthétisés
src/scenes/    Boot, Menu, Levels (carnet), Game, Settings, Player (Bourgeon)
src/ui/        boutons, messages, interrupteurs, transitions
tests/unit/    tests du moteur et validation des niveaux (Vitest)
tests/e2e/     parcours complets dans le navigateur (Playwright)
tools/         validateur de niveaux, scripts de capture
```

Légende des cartes (`src/levels/levelN.ts`) : `.` sol · `S` départ · `E` sortie · `#` haie ·
`t` arbre · `f` massif · `r` rocher · `b` buisson · `~` eau · `1-9` objet/animal · `T` interrupteur ·
`B` pont · `D` arche florale.

## Tests

```bash
npm test               # moteur + validation des 6 niveaux (espace d'états complet)
npm run validate       # rapport du validateur (solutions, impasses, nombre d'états)
npm run e2e            # Playwright : 4 tailles d'écran, gestes tactiles et souris réels
```

Le validateur explore tous les états (position, haies, objets, interrupteur, porte), pas seulement
un chemin départ → sortie. Les tests e2e utilisent `?e2e` (désactive le lissage de démarrage de
Phaser, utile en rendu logiciel) et lisent l'état via `window.__MAZEO__` (lecture seule) ;
les déplacements sont faits avec de vrais événements tactiles/souris.
