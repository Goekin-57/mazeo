import type Phaser from 'phaser';
import { xy } from './core/grid';
import { solve } from './core/solver';
import type { GameScene } from './scenes/GameScene';

/**
 * Petite API en lecture seule, utilisée par les tests de bout en bout (Playwright)
 * pour connaître l'état réel et convertir une case en coordonnées écran.
 * Les tests jouent ensuite avec de vrais gestes (doigt / souris).
 */
export function installDebugApi(game: Phaser.Game) {
  const active = () => game.scene.getScenes(true).map((s) => s.scene.key);
  const gs = () => game.scene.getScene('Game') as GameScene;
  (window as unknown as Record<string, unknown>).__MAZEO__ = {
    game,
    active,
    state() {
      const s = gs();
      if (!s?.sys.isActive() && !s?.sys.isPaused()) return null;
      const st = s.state;
      return {
        level: s.def.id, pos: st.pos, won: st.won, collected: st.collected, bridgesOpen: st.bridgesOpen,
        doorsOpen: st.doorsOpen, closed: [...st.closed].map((v, i) => (v ? i : -1)).filter((i) => i >= 0), steps: st.steps,
        width: s.grid.width, mode: s.currentMode, history: s.historySize,
        fading: s.cameras.main.fadeEffect.isRunning,
      };
    },
    /** Coordonnées CSS (page) du centre d'une case. */
    cellToPage(cell: number) {
      const s = gs();
      const p = s.center(cell);
      return worldToPage(game, p.x, p.y);
    },
    worldToPage: (x: number, y: number) => worldToPage(game, x, y),
    solution() {
      const s = gs();
      return solve(s.grid).shortest;
    },
    xy(cell: number) {
      return xy(gs().grid, cell);
    },
    objectPage(name: string) {
      for (const key of active()) {
        const sc = game.scene.getScene(key);
        const o = sc.children.getByName(name) as Phaser.GameObjects.Image | null;
        const found = o ?? findDeep(sc.children.list, name);
        if (found) {
          if (!found.visible) continue;
          const m = found.getWorldTransformMatrix();
          const cam = sc.cameras.main;
          return worldToPage(game, m.tx - cam.scrollX, m.ty - cam.scrollY);
        }
      }
      return null;
    },
  };
}

function findDeep(list: Phaser.GameObjects.GameObject[], name: string): Phaser.GameObjects.Image | null {
  for (const o of list) {
    if (o.name === name) return o as Phaser.GameObjects.Image;
    const kids = (o as Phaser.GameObjects.Container).list;
    if (Array.isArray(kids)) {
      const f = findDeep(kids, name);
      if (f) return f;
    }
  }
  return null;
}

function worldToPage(game: Phaser.Game, x: number, y: number) {
  const r = game.canvas.getBoundingClientRect();
  return { x: r.left + (x / game.scale.width) * r.width, y: r.top + (y / game.scale.height) * r.height };
}
