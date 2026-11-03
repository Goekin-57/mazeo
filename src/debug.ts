import type Phaser from 'phaser';
import { xy } from './core/grid';
import { shortestFrom } from './core/analysis';
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
        level: s.def.id, key: s.def.key, kind: s.req.kind, ranked: s.ranked, moves: s.moves, pos: st.pos, won: st.won, collected: st.collected, bridgesOpen: st.bridgesOpen,
        doorsOpen: st.doorsOpen, closed: [...st.closed].map((v, i) => (v ? i : -1)).filter((i) => i >= 0), steps: st.steps,
        width: s.grid.width, mode: s.currentMode, history: s.historySize,
        fading: s.cameras.main.fadeEffect.isRunning, blocked: s.blockedInfo, exitCondition: s.exitCondition(),
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
    /** Plus court parcours gagnant depuis l'état courant (null si plus aucun). */
    solutionFromHere() {
      const s = gs();
      return shortestFrom(s.grid, s.state).path;
    },
    /** Noms accessibles des boutons HTML superposés (couche d'accessibilité). */
    a11y() {
      return [...document.querySelectorAll('#a11y-layer button')].filter((b) => !(b as HTMLButtonElement).hidden).map((b) => b.getAttribute('aria-label'));
    },
    save() {
      try { return JSON.parse(localStorage.getItem('mazeo.save.v2') ?? 'null'); } catch { return null; }
    },
    xy(cell: number) {
      return xy(gs().grid, cell);
    },
    objectPage(name: string) {
      const hit = locate(game, name);
      if (!hit) return null;
      const { sc, obj } = hit;
      const cam = sc.cameras.main;
      const fixed = isFixed(obj);
      let m = obj.getWorldTransformMatrix();
      const bounds = (sc as unknown as { __scroll?: { min: number; max: number } }).__scroll;
      if (!fixed && bounds) {
        // écran défilant : amène l'élément dans la zone visible (comme le ferait un défilement du doigt)
        const viewTop = cam.scrollY + 120, viewBottom = cam.scrollY + game.scale.height * 0.72;
        if (m.ty < viewTop || m.ty > viewBottom) {
          cam.scrollY = Math.min(bounds.max, Math.max(bounds.min, m.ty - game.scale.height * 0.4));
          m = obj.getWorldTransformMatrix();
        }
      }
      return worldToPage(game, m.tx - (fixed ? 0 : cam.scrollX), m.ty - (fixed ? 0 : cam.scrollY));
    },
    info(name: string) {
      const hit = locate(game, name, true);
      if (!hit) return null;
      const o = hit.obj as Phaser.GameObjects.GameObject & { parentContainer?: Phaser.GameObjects.Container & { enabled?: boolean } };
      const own = (o as unknown as { list?: Phaser.GameObjects.GameObject[] }).list;
      const textObj = (own?.find((x) => x.type === 'Text') ?? o.parentContainer?.list?.find((x) => x.type === 'Text')) as Phaser.GameObjects.Text | undefined;
      return { visible: deepVisible(o), enabled: o.parentContainer?.enabled ?? true, text: (o as Phaser.GameObjects.Text).text ?? textObj?.text ?? null, scene: hit.sc.scene.key };
    },
  };
}

function deepVisible(o: Phaser.GameObjects.GameObject): boolean {
  let cur: (Phaser.GameObjects.GameObject & { visible?: boolean; parentContainer?: Phaser.GameObjects.Container }) | undefined = o;
  while (cur) {
    if (cur.visible === false) return false;
    cur = cur.parentContainer;
  }
  return true;
}

function isFixed(o: Phaser.GameObjects.GameObject): boolean {
  let cur: (Phaser.GameObjects.GameObject & { scrollFactorY?: number; parentContainer?: Phaser.GameObjects.Container }) | undefined = o;
  while (cur) {
    if (cur.scrollFactorY === 0) return true;
    cur = cur.parentContainer;
  }
  return false;
}

/** Cherche un objet nommé dans les scènes actives (la scène au premier plan d'abord). */
function locate(game: Phaser.Game, name: string, includeHidden = false) {
  const scenes = game.scene.getScenes(true).slice().reverse();
  for (const sc of scenes) {
    const obj = findDeep(sc.children.list, name, includeHidden);
    if (obj) return { sc, obj };
  }
  return null;
}

function findDeep(list: Phaser.GameObjects.GameObject[], name: string, includeHidden = false): Phaser.GameObjects.Image | null {
  for (const o of list) {
    if (o.name === name && (includeHidden || deepVisible(o))) return o as Phaser.GameObjects.Image;
    const kids = (o as Phaser.GameObjects.Container).list;
    if (Array.isArray(kids)) {
      const f = findDeep(kids, name, includeHidden);
      if (f) return f;
    }
  }
  return null;
}

function worldToPage(game: Phaser.Game, x: number, y: number) {
  const r = game.canvas.getBoundingClientRect();
  return { x: r.left + (x / game.scale.width) * r.width, y: r.top + (y / game.scale.height) * r.height };
}
