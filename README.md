# MAZEO — Le Grand Sentier

Jeu de labyrinthes mobile : chaque case quittée par Bourgeon disparaît derrière lui.
Il faut donc réfléchir à son itinéraire avant d'avancer. Chaque pas compte.

**Jouer en ligne : https://goekin-57.github.io/mazeo/**

v0.5 : six niveaux reconstruits en vrais puzzles (validés par solveur), interface mobile recomposée
(plateau ~94 % de la largeur, barre d'icônes, sortie unique et lisible), partie d'aventure reprise à
l'identique, indices progressifs, blocage prouvé, navigation Accueil · Aventure · Défis · Collection.
Conception, niveaux et vérifications : [docs/v0.5.md](docs/v0.5.md) · historique : [docs/V4.md](docs/V4.md), [docs/V4.1.md](docs/V4.1.md).

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

- **Glisser** depuis Bourgeon sur les cases voisines : les cases prévues s'affichent, Bourgeon part
  au relâchement. **Toucher une case voisine** avance d'une case.
- Barre du bas (icônes) : **Annuler le coup** (revient d'un déplacement), **Recommencer** (avec
  confirmation), **Pause** (aide des commandes, indice, son, animations réduites, quitter).
  Appui long ou survol : nom de la commande. L'ampoule en haut à droite donne un **indice**.
- Ordinateur : flèches, `Z` annuler le coup, `R` recommencer, `H` indice, `Échap` pause ; `Tab`
  parcourt les boutons (focus visible), `Entrée` les active.

Règles : les cases disparaissent après le passage, sauf les ponts (déployés par le levier) et l'arche
florale (ouverte par la graine), qui restent. La sortie n'accepte Bourgeon qu'avec tous les objets.

Score : le nombre de **déplacements** (une case = un déplacement). Étoiles calculées par le solveur :
★★★ parcours optimal · ★★ deuxième itinéraire possible · ★ réussite. Annuler, Recommencer et les
indices ne pénalisent jamais.

## Architecture

```
src/core/      moteur pur (sans Phaser) : grille, règles, solveur/validateur
src/content/   chapitres et niveaux (données), défis (bibliothèque figée + calendrier), récompenses
src/social/    interface du futur backend (hors ligne pour l'instant), partage par lien
src/core/analysis.ts  analyse exacte (décisions, étoiles, blocage prouvé, indices)
src/save.ts    sauvegarde versionnée (v3) avec migration, partie en cours
src/score.ts   format des résultats, validation par rejeu, étoiles
src/art/       palette + toutes les textures dessinées en Canvas 2D (aucun asset externe)
src/audio/     effets sonores et ambiance synthétisés
src/scenes/    Accueil, Aventure, Jeu, Pause, Fin de chapitre, Défis, Collection, Réglages
src/ui/        design system, composants, couche d'accessibilité (a11y.ts)
tests/unit/    tests du moteur et validation des niveaux (Vitest)
tests/e2e/     parcours complets dans le navigateur (Playwright)
tools/         validateur, atelier de conception (design.ts), générateur de défis, captures
```

Légende des cartes (`src/content/chapter01/levelNN.ts`) : `#` obstacle · `.` chemin · `S` départ ·
`E` sortie · `D` caneton · `L` levier · `B` pont · `K` graine magique · `P` porte florale · `~` eau ·
`t f r b` variantes décoratives d'obstacle. Une bordure de `#` est retirée automatiquement.

## Tests

```bash
npm test               # moteur, niveaux v0.5, étoiles, blocage, indices, défis, migrations
npm run validate       # rapport du validateur (aventure + 16 défis)
npx vite-node tools/design.ts   # décisions, coups forcés, hasard, longueurs gagnantes par niveau
npm run e2e            # Playwright : 5 tailles d'écran, gestes tactiles et souris réels
```

Le validateur explore tous les états (position, cases disparues, objets, levier, arche), pas seulement
un chemin départ → sortie. Les tests e2e utilisent `?e2e` (désactive le lissage de démarrage de
Phaser, utile en rendu logiciel) et lisent l'état via `window.__MAZEO__` (lecture seule) ;
les déplacements sont faits avec de vrais événements tactiles/souris.
