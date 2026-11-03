// Couche d'accessibilité (v0.5) : chaque bouton du canevas reçoit un vrai <button> HTML
// invisible, superposé à sa zone tactile. Il porte le nom accessible (lecteurs d'écran),
// reçoit le focus au clavier (Tab) avec un contour visible, et s'active avec Entrée / Espace.
// Les boutons HTML laissent passer les touches et clics vers le canevas (pointer-events: none).
import type Phaser from 'phaser';

let layer: HTMLDivElement | null = null;

function ensureLayer(game: Phaser.Game) {
  if (layer && document.body.contains(layer)) return layer;
  layer = document.createElement('div');
  layer.id = 'a11y-layer';
  layer.setAttribute('aria-label', 'Commandes du jeu');
  Object.assign(layer.style, { position: 'fixed', left: '0', top: '0', width: '0', height: '0', zIndex: '10', pointerEvents: 'none' });
  document.body.appendChild(layer);
  const style = document.createElement('style');
  style.textContent = `
    #a11y-layer button { position: fixed; margin: 0; padding: 0; border: 0; background: transparent; color: transparent;
      pointer-events: none; border-radius: 16px; font-size: 1px; overflow: hidden; }
    #a11y-layer button:focus { outline: none; }
    #a11y-layer button:focus-visible { outline: 3px solid #1f5d34; box-shadow: 0 0 0 6px rgba(255,255,255,0.95); }
    #a11y-layer button[hidden] { display: none; }`;
  document.head.appendChild(style);
  void game;
  return layer;
}

interface Entry { el: HTMLButtonElement; obj: Phaser.GameObjects.Components.Transform & Phaser.GameObjects.GameObject; isEnabled: () => boolean }

/** Associe un bouton HTML accessible à un objet interactif du canevas. */
export function a11yButton(
  scene: Phaser.Scene,
  obj: Phaser.GameObjects.Components.Transform & Phaser.GameObjects.GameObject,
  name: string,
  onActivate: () => void,
  isEnabled: () => boolean = () => true,
) {
  const root = ensureLayer(scene.game);
  const el = document.createElement('button');
  el.type = 'button';
  el.setAttribute('aria-label', name);
  el.textContent = name;
  el.addEventListener('click', (e) => {
    e.preventDefault();
    if (!isEnabled()) return;
    onActivate();
  });
  root.appendChild(el);
  const entry: Entry = { el, obj, isEnabled };
  let list = (scene as unknown as { __a11y?: Entry[] }).__a11y;
  if (!list) {
    list = [];
    (scene as unknown as { __a11y?: Entry[] }).__a11y = list;
    const update = () => syncScene(scene);
    scene.events.on('postupdate', update);
    const cleanup = () => {
      scene.events.off('postupdate', update);
      for (const e of (scene as unknown as { __a11y?: Entry[] }).__a11y ?? []) e.el.remove();
      (scene as unknown as { __a11y?: Entry[] }).__a11y = undefined;
    };
    scene.events.once('shutdown', cleanup);
    scene.events.once('destroy', cleanup);
  }
  list.push(entry);
  obj.once('destroy', () => {
    el.remove();
    const l = (scene as unknown as { __a11y?: Entry[] }).__a11y;
    if (l) l.splice(l.indexOf(entry), 1);
  });
  return el;
}

function visibleDeep(o: Phaser.GameObjects.GameObject): boolean {
  let cur = o as Phaser.GameObjects.GameObject & { visible?: boolean; parentContainer?: Phaser.GameObjects.Container };
  while (cur) {
    if (cur.visible === false) return false;
    cur = cur.parentContainer as typeof cur;
  }
  return true;
}

function scrollFixed(o: Phaser.GameObjects.GameObject): boolean {
  let cur = o as Phaser.GameObjects.GameObject & { scrollFactorY?: number; parentContainer?: Phaser.GameObjects.Container };
  while (cur) {
    if (cur.scrollFactorY === 0) return true;
    cur = cur.parentContainer as typeof cur;
  }
  return false;
}

function syncScene(scene: Phaser.Scene) {
  const list = (scene as unknown as { __a11y?: Entry[] }).__a11y;
  if (!list) return;
  const canvas = scene.game.canvas;
  const r = canvas.getBoundingClientRect();
  const sx = r.width / scene.scale.width, sy = r.height / scene.scale.height;
  const cam = scene.cameras.main;
  const sceneOn = scene.scene.isActive() && !scene.scene.isPaused();
  for (const e of list) {
    const o = e.obj as unknown as Phaser.GameObjects.Rectangle;
    const show = sceneOn && visibleDeep(o) && o.active;
    e.el.hidden = !show;
    if (!show) continue;
    const m = o.getWorldTransformMatrix();
    const fixed = scrollFixed(o);
    const cx = m.tx - (fixed ? 0 : cam.scrollX), cy = m.ty - (fixed ? 0 : cam.scrollY);
    const w = (o.width || 120) * Math.abs(m.a || 1), h = (o.height || 120) * Math.abs(m.d || 1);
    Object.assign(e.el.style, {
      left: `${r.left + (cx - w / 2) * sx}px`, top: `${r.top + (cy - h / 2) * sy}px`,
      width: `${w * sx}px`, height: `${h * sy}px`,
    });
    const en = e.isEnabled();
    e.el.setAttribute('aria-disabled', en ? 'false' : 'true');
  }
}
