# MAZEO — Le Grand Sentier

Jeu de labyrinthes mobile : chaque case quittée par Bourgeon se referme derrière lui (une haie pousse).
Il faut donc réfléchir à son trajet avant d'avancer.

**Jouer en ligne : https://goekin-57.github.io/mazeo/**

V4 : chapitre 1 « Le Jardin des Origines » (6 niveaux), mode Défis (jour, semaine, tentative classée),
Collection équipable, accueil qui évolue avec la progression, écran Communauté prêt pour un futur serveur.
Détails de conception, audit et règles de score : [docs/V4.md](docs/V4.md).

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

Règles : les chemins se ferment après passage ; les ponts (déployés par le levier) et la porte
florale (ouverte par la graine magique) restent ouverts ; la sortie n'accepte Bourgeon qu'avec
tous les objets / animaux.

Étoiles (facultatives) : ★ niveau terminé · ★★ parcours ≤ optimal + 25 % · ★★★ parcours optimal.
Annuler et Recommencer ne pénalisent jamais.

## Architecture

```
src/core/      moteur pur (sans Phaser) : grille, règles, solveur/validateur
src/content/   chapitres et niveaux (données), défis (bibliothèque figée + calendrier), récompenses
src/social/    interface du futur backend (hors ligne pour l'instant), partage par lien
src/save.ts    sauvegarde versionnée (v2) avec migration
src/score.ts   format des résultats, validation par rejeu, étoiles
src/art/       palette + toutes les textures dessinées en Canvas 2D (aucun asset externe)
src/audio/     effets sonores et ambiance synthétisés
src/scenes/    Accueil, Carnet de voyage, Chapitre, Jeu, Fin de chapitre, Défis, Collection, Communauté, Paramètres
src/ui/        boutons, messages, interrupteurs, transitions
tests/unit/    tests du moteur et validation des niveaux (Vitest)
tests/e2e/     parcours complets dans le navigateur (Playwright)
tools/         validateur de niveaux, scripts de capture
```

Légende des cartes (`src/content/chapter01/levelNN.ts`) : `#` obstacle · `.` chemin · `S` départ ·
`E` sortie · `D` caneton · `L` levier · `B` pont · `K` graine magique · `P` porte florale · `~` eau ·
`t f r b` variantes décoratives d'obstacle. Une bordure de `#` est retirée automatiquement.

## Tests

```bash
npm test               # moteur, 6 niveaux, 16 défis, calendrier, scores, migration
npm run validate       # rapport du validateur (aventure + 16 défis)
npm run e2e            # Playwright : 4 tailles d'écran, gestes tactiles et souris réels
```

Le validateur explore tous les états (position, haies, objets, interrupteur, porte), pas seulement
un chemin départ → sortie. Les tests e2e utilisent `?e2e` (désactive le lissage de démarrage de
Phaser, utile en rendu logiciel) et lisent l'état via `window.__MAZEO__` (lecture seule) ;
les déplacements sont faits avec de vrais événements tactiles/souris.
