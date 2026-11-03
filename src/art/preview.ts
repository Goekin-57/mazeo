// Aperçu d'un niveau (accueil, aventure) : même dessin que le plateau de jeu, à petite échelle,
// avec Bourgeon, ses objets équipés, la sortie et — pour une partie reprise — les cases disparues.
import Phaser from 'phaser';
import { autoDecor, parseLevel, xy } from '../core/grid';
import { initialState, step } from '../core/rules';
import { Cell, type GameState, type LevelDef } from '../core/types';
import { Save } from '../save';
import { Player } from '../scenes/Player';
import { boardLayout, drawBoard } from './board';
import { BD, BT, HEDGE_BASE, HEDGE_H } from './textures';

export interface PreviewOpts {
  /** Parcours déjà effectué (partie reprise). */
  path?: number[];
  /** Bourgeon posé sur la sortie (contenu terminé). */
  atExit?: boolean;
}

/** Dessine l'aperçu centré dans la boîte (x, y, w, h) ; retourne le conteneur et sa taille réelle. */
export function levelPreview(scene: Phaser.Scene, def: LevelDef, box: { x: number; y: number; w: number; h: number }, opts: PreviewOpts = {}) {
  const g = parseLevel(def);
  let st: GameState = initialState(g);
  for (const c of opts.path ?? []) {
    const r = step(g, st, c);
    if ('blocked' in r) break;
    st = r.state;
  }
  const [, exitRow] = xy(g, g.exit);
  const over = exitRow === 0 ? 0.8 : 0.25;
  const tw = Math.floor(Math.min(box.w / (g.width + 0.28), box.h / (g.height * 0.825 + 0.28 + 0.3 + over), 200));
  const L = boardLayout(g, tw, { pad: 0.14, soil: 0.3 });
  const key = `preview-${def.key}-${def.version}-${tw}`;
  if (!scene.textures.exists(key)) scene.textures.addCanvas(key, drawBoard(g, def.theme, L, def.id * 97 + def.key.length));
  const s = tw / BT, sy = L.td / BD;
  const totalH = L.height + over * tw;
  const bx = Math.round(box.x + (box.w - L.width) / 2);
  const by = Math.round(box.y + (box.h - totalH) / 2 + over * tw);
  const root = scene.add.container(0, 0);
  root.add(scene.add.image(bx, by, key).setOrigin(0));
  const ox = bx + L.pad, oy = by + L.pad;
  const center = (i: number) => { const [x, y] = xy(g, i); return { x: ox + (x + 0.5) * tw, y: oy + (y + 0.5) * L.td, b: oy + (y + 1) * L.td }; };
  const objs: { d: number; o: Phaser.GameObjects.GameObject }[] = [];
  const decor = autoDecor(g, def.key.length * 7 + def.id);
  let variant = 0;
  g.cells.forEach((cell, i) => {
    const c = center(i);
    if (cell === Cell.Wall) {
      const d = decor[i]!;
      const tex = d === 'hedge' || d === 'tree' ? `hedge${variant++ % 3}` : d;
      objs.push({ d: c.b, o: scene.add.image(c.x, c.b, tex).setOrigin(0.5, HEDGE_BASE / HEDGE_H).setScale(s, s * sy * 0.86) });
    } else if (cell === Cell.Collectible) {
      const k = g.collectibles.find((q) => q.y * g.width + q.x === i)!;
      if ((st.collected >> k.id) & 1) return;
      objs.push({ d: 1, o: scene.add.image(c.x, c.y, 'item-base').setScale(s, s * sy) });
      objs.push({ d: c.y + 10 * s, o: scene.add.image(c.x, c.y + 10 * s, k.kind).setOrigin(0.5, 0.92).setScale(s * 0.95) });
    } else if (cell === Cell.Switch) {
      objs.push({ d: c.y + 22 * s, o: scene.add.image(c.x, c.y + 22 * s, st.bridgesOpen ? 'lever-on' : 'lever-off').setOrigin(0.5, 0.92).setScale(s * 0.9) });
    } else if (cell === Cell.Bridge && st.bridgesOpen) {
      for (let k = 0; k < 4; k++) objs.push({ d: 2, o: scene.add.image(c.x, c.y - L.td / 2 + (k + 0.5) * (L.td / 4), 'plank').setScale(s * 0.86, s * 0.95) });
    } else if (cell === Cell.Door) {
      objs.push({ d: c.b + 1, o: scene.add.image(c.x, c.b - 2 * s, 'arch').setOrigin(0.5, 1).setScale(s * 0.86) });
      if (!st.doorsOpen) objs.push({ d: c.b + 2, o: scene.add.image(c.x, c.b - 6 * s, 'vines').setOrigin(0.5, 1).setScale(s * 0.8) });
    } else if (cell === Cell.Exit) {
      objs.push({ d: c.b, o: scene.add.image(c.x, c.b - 2 * s, opts.atExit ? 'exit-open' : 'exit-closed').setOrigin(0.5, 1).setScale(s * 0.98) });
    }
    if (st.closed[i]) objs.push({ d: 1.4, o: scene.add.image(c.x, c.y, 'tile-gone').setScale(s, s * sy) });
  });
  const pos = opts.atExit ? g.exit : st.pos;
  const pc = center(pos);
  const eq = Save.get().collection.equipped;
  const pip = new Player(scene, pc.x, pc.y + 6 * s, Math.min(s * 0.86, 1.1), { hat: eq.hat === 'hat-gardener', golden: eq.scarf === 'scarf-golden' });
  pip.setName('preview-pip');
  objs.push({ d: opts.atExit ? pc.b + 5 : pc.y + 7 * s, o: pip });
  if (eq.companion === 'companion-duckling') objs.push({ d: pc.y + 8 * s, o: scene.add.image(pc.x + 30 * s, pc.y + 22 * s, 'duckling').setOrigin(0.5, 0.9).setScale(s * 0.7).setFlipX(true) });
  objs.sort((a, b) => a.d - b.d).forEach((q) => root.add(q.o));
  // décorations équipées, posées sur l'herbe à côté du plateau
  const side: [string, number][] = [];
  if (eq.decor.includes('deco-magic-flower')) side.push(['magic-flower', -1]);
  if (eq.decor.includes('deco-lanterns')) side.push(['lantern', 1]);
  side.forEach(([tex, dir]) => root.add(scene.add.image(dir < 0 ? bx + 26 : bx + L.width - 26, by + L.height - L.soil - 20, tex).setOrigin(0.5, 0.95).setScale(Math.min(1, s * 1.1))));
  return { root, x: bx, y: by - over * tw, w: L.width, h: totalH, pip };
}
