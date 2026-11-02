import Phaser from 'phaser';
import { C, hex } from '../art/palette';
import { Sfx, unlockAudio } from '../audio/sfx';
import { Save } from '../save';

export const W = 1080;
// Hauteur logique adaptée au ratio de l'écran (téléphones très allongés) : définie au démarrage.
export let H = 1920;
export function setViewHeight(h: number) {
  H = Math.round(h);
}
/** Les écrans de menu sont conçus en 1080×1920 : on les centre verticalement. */
export function centerCamera(scene: Phaser.Scene) {
  scene.cameras.main.setScroll(0, -Math.round((H - 1920) / 2));
}
export const FONT = 'Fredoka, "Trebuchet MS", "Segoe UI", sans-serif';

export const reduced = () => Save.settings().reducedMotion;

export function txt(
  scene: Phaser.Scene, x: number, y: number, s: string, size: number,
  opts: { color?: string; weight?: number; stroke?: string; strokeW?: number; align?: string; wrap?: number; shadow?: boolean } = {},
) {
  const t = scene.add.text(x, y, s, {
    fontFamily: FONT,
    fontSize: `${size}px`,
    fontStyle: String(opts.weight ?? 600),
    color: opts.color ?? C.ink,
    align: opts.align ?? 'center',
    wordWrap: opts.wrap ? { width: opts.wrap, useAdvancedWrap: true } : undefined,
  });
  t.setOrigin(0.5);
  if (opts.stroke) t.setStroke(opts.stroke, opts.strokeW ?? 8);
  if (opts.shadow) t.setShadow(0, 4, 'rgba(40,70,40,0.25)', 6, true, true);
  return t;
}

export interface Button extends Phaser.GameObjects.Container {
  setEnabled(v: boolean): Button;
  bg: Phaser.GameObjects.Image;
}

/**
 * Bouton tactile : se déclenche au relâchement uniquement si l'appui a commencé dessus
 * (évite les déclenchements accidentels).
 */
export function button(
  scene: Phaser.Scene, x: number, y: number, tex: string,
  content: { icon?: string; label?: string; size?: number; iconScale?: number; labelColor?: string; iconX?: number },
  onClick: () => void, name?: string,
): Button {
  const c = scene.add.container(x, y) as Button;
  const bg = scene.add.image(0, 0, tex);
  c.add(bg);
  c.bg = bg;
  const lift = -6;
  if (content.icon) {
    const ic = scene.add.image(content.label ? (content.iconX ?? -bg.width / 2 + 70) : 0, lift, content.icon).setScale(content.iconScale ?? 1);
    c.add(ic);
  }
  if (content.label) {
    const t = txt(scene, content.icon ? 24 : 0, lift, content.label, content.size ?? 46, { color: content.labelColor ?? C.ink, weight: 600 });
    c.add(t);
  }
  let enabled = true;
  let pressed = false;
  bg.setInteractive({ useHandCursor: true });
  if (name) bg.name = name;
  bg.on('pointerdown', () => {
    unlockAudio();
    if (!enabled) return;
    pressed = true;
    scene.tweens.add({ targets: c, scale: 0.93, duration: 70 });
  });
  const release = (fire: boolean) => {
    if (!pressed) return;
    pressed = false;
    scene.tweens.add({ targets: c, scale: 1, duration: 140, ease: 'Back.easeOut' });
    if (fire && enabled) {
      Sfx.click();
      onClick();
    }
  };
  bg.on('pointerup', () => release(true));
  bg.on('pointerout', () => release(false));
  c.setEnabled = (v: boolean) => {
    enabled = v;
    c.setAlpha(v ? 1 : 0.42);
    return c;
  };
  c.setSize(bg.width, bg.height);
  return c;
}

/** Petit message flottant léger (pas de panneau opaque). */
export function toast(scene: Phaser.Scene, s: string, y: number, ms = 2600, depth = 5000) {
  const prev = scene.children.getByName('toast');
  if (prev) prev.destroy();
  const t = txt(scene, 0, 0, s, 38, { color: C.ink, weight: 500, wrap: 820 });
  const g = scene.add.graphics();
  const w = Math.min(900, t.width + 70);
  const h = t.height + 40;
  g.fillStyle(0x2c4a30, 0.18);
  g.fillRoundedRect(-w / 2, -h / 2 + 6, w, h, 30);
  g.fillStyle(0xfffbf0, 0.95);
  g.fillRoundedRect(-w / 2, -h / 2, w, h, 30);
  g.lineStyle(3, 0xf29c4b, 0.9);
  g.strokeRoundedRect(-w / 2, -h / 2, w, h, 30);
  const c = scene.add.container(W / 2, y, [g, t]).setDepth(depth).setName('toast');
  c.setAlpha(0).setScale(0.9);
  scene.tweens.add({ targets: c, alpha: 1, scale: 1, duration: 220, ease: 'Back.easeOut' });
  if (ms > 0) {
    scene.time.delayedCall(ms, () => {
      if (!c.active) return;
      scene.tweens.add({ targets: c, alpha: 0, y: y + 20, duration: 300, onComplete: () => c.destroy() });
    });
  }
  return c;
}

/** Transition douce entre scènes. */
export function goTo(scene: Phaser.Scene, key: string, data?: object) {
  const cam = scene.cameras.main;
  if (reduced()) {
    scene.scene.start(key, data);
    return;
  }
  scene.input.enabled = false;
  cam.fadeOut(260, 246, 238, 217);
  cam.once(Phaser.Cameras.Scene2D.Events.FADE_OUT_COMPLETE, () => scene.scene.start(key, data));
}

export function fadeIn(scene: Phaser.Scene) {
  if (!reduced()) scene.cameras.main.fadeIn(320, 246, 238, 217);
}

/** Fond commun : dessiné une fois dans la page (CSS) pour éviter un grand calque WebGL à chaque image. */
let pageBgDone = false;
export function paintPageBackground() {
  if (pageBgDone) return;
  pageBgDone = true;
  const cw = 540, ch = 1200;
  const cv = document.createElement('canvas');
  cv.width = cw;
  cv.height = ch;
  const c = cv.getContext('2d')!;
  const g = c.createLinearGradient(0, 0, 0, ch);
  g.addColorStop(0, '#cdeee9');
  g.addColorStop(0.45, '#eaf5df');
  g.addColorStop(1, '#f1e8cf');
  c.fillStyle = g;
  c.fillRect(0, 0, cw, ch);
  const hill = (y: number, col: string, amp: number, ph: number) => {
    c.fillStyle = col;
    c.beginPath();
    c.moveTo(0, ch);
    for (let x = 0; x <= cw; x += 10) c.lineTo(x, y + Math.sin(x / 90 + ph) * amp + Math.sin(x / 35 + ph * 2) * amp * 0.25);
    c.lineTo(cw, ch);
    c.fill();
  };
  hill(ch * 0.6, 'rgba(157,184,154,0.32)', 20, 1);
  hill(ch * 0.72, 'rgba(125,191,91,0.22)', 17, 3);
  hill(ch * 0.85, 'rgba(157,184,154,0.28)', 13, 5);
  const rg = c.createRadialGradient(cw / 2, ch * 0.5, 50, cw / 2, ch * 0.5, ch * 0.7);
  rg.addColorStop(0, 'rgba(255,255,240,0.45)');
  rg.addColorStop(1, 'rgba(255,255,240,0)');
  c.fillStyle = rg;
  c.fillRect(0, 0, cw, ch);
  document.body.style.background = `url(${cv.toDataURL('image/jpeg', 0.9)}) center / cover no-repeat, #eaf5df`;
}

/** Nuages qui dérivent doucement. */
export function backdrop(scene: Phaser.Scene, opts: { clouds?: boolean } = {}) {
  paintPageBackground();
  if (opts.clouds !== false) {
    for (let i = 0; i < 3; i++) {
      const cl = scene.add.image(Math.random() * W, 120 + i * 160 + Math.random() * 40, 'cloud').setDepth(-900).setAlpha(0.85).setScale(0.7 + Math.random() * 0.5);
      if (!reduced()) {
        scene.tweens.add({ targets: cl, x: cl.x + 260 + Math.random() * 120, duration: 26000 + i * 7000, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
      }
    }
  }
}

/** Petales qui flottent doucement (ambiance). */
export function drift(scene: Phaser.Scene, n = 6, depth = -800) {
  if (reduced()) return;
  for (let i = 0; i < n; i++) {
    const p = scene.add.image(Math.random() * W, -40, i % 2 ? 'petal' : 'petal-y').setDepth(depth).setAlpha(0.8);
    const fall = () => {
      p.setPosition(Math.random() * W, -40 - Math.random() * 300);
      scene.tweens.add({
        targets: p, y: H + 40, x: p.x + (Math.random() - 0.5) * 300, angle: 360 * (Math.random() > 0.5 ? 1 : -1),
        duration: 14000 + Math.random() * 9000, delay: Math.random() * 8000, onComplete: fall,
      });
    };
    fall();
  }
}

/** Interrupteur on/off accessible (position du bouton + couleur). */
export function toggle(scene: Phaser.Scene, x: number, y: number, initial: boolean, onToggle: () => boolean, name?: string) {
  const c = scene.add.container(x, y);
  const bg = scene.add.graphics();
  const knob = scene.add.circle(0, 0, 26, 0xffffff).setStrokeStyle(3, 0xd6c39b);
  const mark = scene.add.image(0, 0, 'icon-check').setScale(0.42);
  const draw = (v: boolean) => {
    bg.clear();
    bg.fillStyle(v ? hex(C.meadow) : 0xd8d0bd, 1);
    bg.fillRoundedRect(-55, -32, 110, 64, 32);
    knob.setX(v ? 23 : -23);
    mark.setX(knob.x).setVisible(v);
  };
  draw(initial);
  const hit = scene.add.rectangle(0, 0, 140, 90, 0, 0).setInteractive({ useHandCursor: true });
  if (name) hit.name = name;
  hit.on('pointerup', () => {
    Sfx.click();
    draw(onToggle());
  });
  c.add([bg, knob, mark, hit]);
  return c;
}
