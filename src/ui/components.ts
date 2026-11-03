// Composants réutilisables (V4.1) : boutons principal / secondaire / icône, cartes, puces d'état,
// barre de navigation, feuille de résultat, défilement vertical.
import Phaser from 'phaser';
import { Sfx, unlockAudio } from '../audio/sfx';
import { Save } from '../save';
import { a11yButton } from './a11y';
import { color, font, hexOf, motion, radius, shadow, space, touch } from './theme';

const reduced = () => Save.settings().reducedMotion;

export function label(scene: Phaser.Scene, x: number, y: number, s: string, size: number, opts: { color?: string; weight?: number; align?: 'left' | 'center' | 'right'; wrap?: number; display?: boolean } = {}) {
  // petits textes en Nunito (plus lisible), titres et chiffres en Fredoka
  const small = size <= font.body + 3 && !opts.display;
  const t = scene.add.text(x, y, s, {
    fontFamily: small ? font.text : font.family,
    fontSize: `${size}px`,
    fontStyle: String(small ? Math.max(600, opts.weight ?? 600) : opts.weight ?? 600),
    color: opts.color ?? color.ink,
    align: opts.align ?? 'center',
    wordWrap: opts.wrap ? { width: opts.wrap, useAdvancedWrap: true } : undefined,
    lineSpacing: small ? 4 : 2,
  });
  t.setOrigin(opts.align === 'left' ? 0 : opts.align === 'right' ? 1 : 0.5, 0.5);
  return t;
}

export interface UIButton extends Phaser.GameObjects.Container {
  setEnabled(v: boolean): UIButton;
  setLabel(s: string): UIButton;
  enabled: boolean;
}

type Variant = 'primary' | 'secondary' | 'icon' | 'bar';

/**
 * Bouton unique du jeu. Se déclenche au relâchement uniquement si l'appui a commencé dessus.
 * primary : action principale (orange) · secondary : crème bordé · icon : rond discret, zone ≥ 48 px CSS.
 */
export function uiButton(
  scene: Phaser.Scene, x: number, y: number, variant: Variant,
  opts: { label?: string; icon?: string; width?: number; name?: string; small?: boolean; aria?: string; tooltip?: string },
  onClick: () => void,
): UIButton {
  const c = scene.add.container(x, y) as UIButton;
  const isBar = variant === 'bar';
  const isIcon = variant === 'icon' || isBar;
  const h = isBar ? touch.barBtn : isIcon ? touch.iconVisual : variant === 'primary' ? touch.primaryH : touch.secondaryH;
  const w = isBar ? touch.barBtn : isIcon ? touch.iconVisual : opts.width ?? (variant === 'primary' ? 820 : 420);
  const r = isIcon ? h / 2 : Math.min(radius.button, h / 2);
  const g = scene.add.graphics();
  const draw = (pressed: boolean) => {
    g.clear();
    if (isBar) {
      // bouton de barre : pas de fond au repos, disque doux à l'appui (état pressé)
      if (pressed) {
        g.fillStyle(hexOf(color.accentSoft), 1);
        g.fillCircle(0, 0, h / 2);
      }
      return;
    }
    const dy = pressed ? shadow.y * 0.4 : 0;
    g.fillStyle(color.scrim, pressed ? shadow.alpha * 0.6 : shadow.alpha);
    g.fillRoundedRect(-w / 2, -h / 2 + shadow.y, w, h, r);
    if (variant === 'primary') {
      g.fillStyle(hexOf(color.primaryDeep), 1);
      g.fillRoundedRect(-w / 2, -h / 2 + dy + 6, w, h - 6, r);
      g.fillStyle(hexOf(color.primary), 1);
      g.fillRoundedRect(-w / 2, -h / 2 + dy, w, h - 8, r);
      g.fillStyle(0xffffff, 0.18);
      g.fillRoundedRect(-w / 2 + 18, -h / 2 + dy + 8, w - 36, (h - 8) * 0.38, r * 0.7);
    } else {
      g.fillStyle(hexOf(color.surface), 1);
      g.fillRoundedRect(-w / 2, -h / 2 + dy, w, h, r);
      g.lineStyle(isIcon ? 3 : 4, hexOf(color.border), 1);
      g.strokeRoundedRect(-w / 2, -h / 2 + dy, w, h, r);
    }
  };
  draw(false);
  c.add(g);
  const textColor = variant === 'primary' ? color.primaryText : color.ink;
  const fs = isIcon ? 0 : variant === 'primary' ? font.button : opts.small ? font.buttonSm : font.label + 3;
  let iconImg: Phaser.GameObjects.Image | null = null;
  let txt: Phaser.GameObjects.Text | null = null;
  if (opts.icon) {
    const isV5 = opts.icon.startsWith('ic-');
    const iconScale = isBar ? touch.barGlyph / 96 : isV5 ? (isIcon ? 0.8 : 0.56) : isIcon ? 1.15 : 0.8;
    iconImg = scene.add.image(0, variant === 'primary' ? -4 : 0, opts.icon).setScale(iconScale);
    if (variant === 'primary') iconImg.setTint(0xffffff).setTintMode(Phaser.TintModes.FILL);
    c.add(iconImg);
  }
  if (opts.label && !isIcon) {
    txt = label(scene, 0, variant === 'primary' ? -4 : 0, opts.label, fs, { color: textColor, weight: variant === 'primary' ? 700 : 600 });
    c.add(txt);
  }
  const layout = () => {
    if (iconImg && txt) {
      const total = iconImg.displayWidth + 18 + txt.width;
      iconImg.setX(-total / 2 + iconImg.displayWidth / 2);
      txt.setX(-total / 2 + iconImg.displayWidth + 18 + txt.width / 2);
    }
  };
  layout();
  // zone tactile ≥ 48 px CSS, même pour les petits boutons
  const hitW = Math.max(w, touch.icon), hitH = Math.max(h, touch.icon);
  const hit = scene.add.rectangle(0, 0, hitW, hitH, 0, 0).setInteractive({ useHandCursor: true });
  if (opts.name) hit.name = opts.name;
  c.add(hit);
  c.enabled = true;
  let pressed = false;
  // aide : appui long (tactile) ou survol (souris) affiche le nom de la commande
  let tipTimer: Phaser.Time.TimerEvent | null = null;
  let tip: Phaser.GameObjects.Container | null = null;
  let tipShownByPress = false;
  const hideTip = () => { tipTimer?.remove(); tipTimer = null; tip?.destroy(); tip = null; };
  const showTip = () => {
    if (!opts.tooltip || tip || !c.visible || (c.parentContainer && !c.parentContainer.visible)) return;
    const m = c.getWorldTransformMatrix();
    tip = tooltipBubble(scene, m.tx, m.ty - hitH / 2 - 46, opts.tooltip);
    // la bulle disparaît d'elle-même (et avec le bouton, ou quand l'écran est mis en pause)
    scene.time.delayedCall(1800, hideTip);
    scene.events.once('pause', hideTip);
  };
  c.once('destroy', () => hideTip());
  hit.on('pointerdown', () => {
    unlockAudio();
    tipShownByPress = false;
    if (opts.tooltip) tipTimer = scene.time.delayedCall(450, () => { showTip(); tipShownByPress = true; });
    if (!c.enabled) return;
    pressed = true;
    draw(true);
    scene.tweens.add({ targets: c, scale: 0.97, duration: motion.press });
  });
  const release = (fire: boolean) => {
    const longPress = tipShownByPress;
    if (opts.tooltip && longPress) scene.time.delayedCall(900, hideTip);
    else hideTip();
    if (!pressed) return;
    pressed = false;
    draw(false);
    scene.tweens.add({ targets: c, scale: 1, duration: motion.release, ease: 'Quad.easeOut' });
    // un appui long sert à lire l'aide : il ne déclenche pas la commande
    if (fire && c.enabled && !longPress) {
      Sfx.click();
      onClick();
    }
  };
  hit.on('pointerup', () => release(true));
  hit.on('pointerout', () => { release(false); hideTip(); });
  if (opts.tooltip) hit.on('pointerover', (p: Phaser.Input.Pointer) => { if (!p.isDown && !p.wasTouch) tipTimer = scene.time.delayedCall(500, showTip); });
  const access = opts.aria ?? opts.label ?? opts.tooltip;
  if (access) a11yButton(scene, hit, access, () => { if (c.enabled) { Sfx.click(); onClick(); } }, () => c.enabled && c.visible);
  c.setEnabled = (v: boolean) => {
    c.enabled = v;
    // désactivé : nettement atténué mais lisible
    c.setAlpha(v ? 1 : isBar ? 0.32 : 0.42);
    return c;
  };
  c.setLabel = (s: string) => {
    txt?.setText(s);
    layout();
    return c;
  };
  c.setSize(hitW, hitH);
  return c;
}

/** Fond de carte (surface crème, ombre douce). */
export function cardBg(scene: Phaser.Scene, x: number, y: number, w: number, h: number, opts: { fill?: string; border?: string; borderW?: number; alpha?: number } = {}) {
  const g = scene.add.graphics();
  g.fillStyle(color.scrim, shadow.alpha * 0.8);
  g.fillRoundedRect(x, y + shadow.y, w, h, radius.card);
  g.fillStyle(hexOf(opts.fill ?? color.surface), opts.alpha ?? 0.97);
  g.fillRoundedRect(x, y, w, h, radius.card);
  g.lineStyle(opts.borderW ?? 3, hexOf(opts.border ?? color.border), 1);
  g.strokeRoundedRect(x, y, w, h, radius.card);
  return g;
}

/** Puce d'état (difficulté, ÉQUIPÉ, VERROUILLÉ, Réussi…). */
export function chip(scene: Phaser.Scene, x: number, y: number, text: string, tone: 'success' | 'primary' | 'accent' | 'locked' | 'neutral' | string, opts: { outline?: boolean; align?: 'left' | 'center' | 'right' } = {}) {
  const bg: Record<string, string> = { success: color.success, primary: color.primary, accent: color.accent, locked: color.locked, neutral: color.surfaceAlt };
  const fill = bg[tone] ?? tone;
  const t = label(scene, 0, 0, text, font.caption, { color: opts.outline || tone === 'neutral' ? color.ink : '#ffffff', weight: 700 });
  const w = t.width + 44, h = font.caption + 26;
  const g = scene.add.graphics();
  if (opts.outline) {
    g.lineStyle(4, hexOf(fill), 1);
    g.strokeRoundedRect(-w / 2, -h / 2, w, h, h / 2);
  } else {
    g.fillStyle(hexOf(fill), 1);
    g.fillRoundedRect(-w / 2, -h / 2, w, h, h / 2);
  }
  const dx = opts.align === 'left' ? w / 2 : opts.align === 'right' ? -w / 2 : 0;
  const c = scene.add.container(x + dx, y, [g, t]);
  c.setSize(w, h);
  return c;
}

/** Bulle d'aide (nom d'une commande icône). */
export function tooltipBubble(scene: Phaser.Scene, x: number, y: number, text: string) {
  const t = label(scene, 0, 0, text, font.caption + 1, { color: '#ffffff', weight: 700 });
  const w = t.width + 44, h = t.height + 26;
  const g = scene.add.graphics();
  g.fillStyle(hexOf(color.ink), 0.94);
  g.fillRoundedRect(-w / 2, -h / 2, w, h, h / 2);
  g.fillTriangle(-12, h / 2 - 1, 12, h / 2 - 1, 0, h / 2 + 14);
  const cx = Phaser.Math.Clamp(x, w / 2 + 12, scene.scale.width - w / 2 - 12);
  const c = scene.add.container(cx, y, [g, t]).setDepth(60000).setScrollFactor(0);
  return c;
}

export type NavKey = 'Home' | 'Journey' | 'Challenges' | 'Collection';
const NAV: [NavKey, string, string][] = [
  ['Home', 'Accueil', 'ic-home'],
  ['Journey', 'Aventure', 'ic-map'],
  ['Challenges', 'Défis', 'ic-flag'],
  ['Collection', 'Collection', 'ic-chest'],
];

/**
 * Navigation basse commune (fixe à l'écran). L'élément actif a une capsule de fond,
 * une icône accentuée et un libellé contrasté. Des pastilles signalent les nouveautés.
 */
export function navBar(scene: Phaser.Scene, y: number, active: NavKey | null, go: (k: NavKey) => void, dots: Partial<Record<NavKey, boolean>> = {}) {
  const W = 1080;
  const c = scene.add.container(0, 0).setScrollFactor(0).setDepth(40000);
  const barH = px78();
  // voile sous la barre : le contenu qui défile ne doit pas réapparaître entre la barre et le bas de l'écran
  const veil = scene.add.graphics();
  const top = y - barH / 2, fadeH = 72, vx = space.margin - 16, vw = W - space.margin * 2 + 32;
  for (let i = 0; i < 12; i++) {
    veil.fillStyle(0xe7ecd9, (0.96 * (i + 1)) / 12);
    veil.fillRect(vx, top - fadeH + (fadeH / 12) * i, vw, fadeH / 12 + 1);
  }
  veil.fillStyle(0xe7ecd9, 1);
  veil.fillRect(vx, top, vw, scene.scale.height - top + 400);
  c.add(veil);
  const g = scene.add.graphics();
  g.fillStyle(color.scrim, 0.12);
  g.fillRoundedRect(space.margin, y - barH / 2 + shadow.y, W - space.margin * 2, barH, radius.card);
  g.fillStyle(hexOf(color.surface), 0.97);
  g.fillRoundedRect(space.margin, y - barH / 2, W - space.margin * 2, barH, radius.card);
  g.lineStyle(3, hexOf(color.border), 1);
  g.strokeRoundedRect(space.margin, y - barH / 2, W - space.margin * 2, barH, radius.card);
  c.add(g);
  const slot = (W - space.margin * 2) / NAV.length;
  NAV.forEach(([key, text, icon], i) => {
    const x = space.margin + slot * (i + 0.5);
    const on = key === active;
    if (on) {
      // état actif reconnaissable par la forme : capsule + trait supérieur + libellé gras
      const cap = scene.add.graphics();
      cap.fillStyle(hexOf(color.accentSoft), 1);
      cap.fillRoundedRect(x - slot / 2 + 12, y - barH / 2 + 12, slot - 24, barH - 24, radius.card - 8);
      cap.fillStyle(hexOf(color.accent), 1);
      cap.fillRoundedRect(x - 42, y - barH / 2 + 4, 84, 10, 5);
      c.add(cap);
    }
    const ic = scene.add.image(x, y - 26, icon).setScale(on ? 0.74 : 0.66);
    if (!on) ic.setAlpha(0.78);
    const t = label(scene, x, y + 46, text, font.caption, { color: on ? color.ink : color.inkSoft, weight: on ? 800 : 600 });
    c.add([ic, t]);
    if (dots[key]) {
      const d = scene.add.circle(x + 38, y - 56, 13, hexOf(color.primary)).setStrokeStyle(4, 0xffffff);
      c.add(d);
    }
    const hit = scene.add.rectangle(x, y, slot, barH, 0, 0).setInteractive({ useHandCursor: true });
    hit.name = `nav-${key}`;
    hit.on('pointerdown', () => scene.tweens.add({ targets: ic, scale: (on ? 0.74 : 0.66) * 0.92, duration: motion.press, yoyo: true }));
    hit.on('pointerup', () => {
      Sfx.click();
      if (!on) go(key);
    });
    c.add(hit);
    a11yButton(scene, hit, on ? `${text} (page actuelle)` : text, () => { if (!on) go(key); });
  });
  return fixToScreen(c);
}
/**
 * Fixe un conteneur à l'écran, enfants compris : sans cela, les zones tactiles des enfants
 * suivent le défilement de la caméra et ne correspondent plus à ce qui est affiché.
 */
export function fixToScreen(c: Phaser.GameObjects.Container) {
  c.setScrollFactor(0);
  c.list.forEach((ch) => {
    (ch as unknown as Phaser.GameObjects.Components.ScrollFactor).setScrollFactor?.(0);
    if (ch instanceof Phaser.GameObjects.Container) fixToScreen(ch);
  });
  return c;
}

function px78() {
  return 78 * 3;
}

/** En-tête d'écran : bouton retour (icône), titre centré, action icône optionnelle à droite. Fixe. */
export function screenHeader(scene: Phaser.Scene, title: string, onBack: (() => void) | null, right?: { icon: string; name: string; onClick: () => void }) {
  const y = space.margin + touch.icon / 2 + 10;
  const items: Phaser.GameObjects.GameObject[] = [];
  if (onBack) items.push(uiButton(scene, space.margin + touch.icon / 2, y, 'icon', { icon: 'ic-back', name: 'btn-back', aria: 'Retour' }, onBack));
  items.push(label(scene, 540, y, title, font.title, { weight: 700 }));
  if (right) items.push(uiButton(scene, 1080 - space.margin - touch.icon / 2, y, 'icon', { icon: right.icon, name: right.name }, right.onClick));
  items.forEach((o) => (o as unknown as Phaser.GameObjects.Components.ScrollFactor).setScrollFactor?.(0));
  return y + touch.icon / 2;
}

/**
 * Défilement vertical par glissement (pour les écrans dont le contenu dépasse la hauteur visible).
 * Les éléments fixes utilisent setScrollFactor(0).
 */
export function enableScroll(scene: Phaser.Scene, contentBottom: number, viewH: number, topOffset = 0) {
  const cam = scene.cameras.main;
  const minY = cam.scrollY;
  const maxY = Math.max(minY, contentBottom - viewH + topOffset);
  if (maxY <= minY + 4) return;
  // bornes exposées (utilisées aussi par l'API de test pour amener un élément à l'écran)
  (scene as unknown as { __scroll?: { min: number; max: number } }).__scroll = { min: minY, max: maxY };
  let startY = 0, startScroll = 0, dragging = false;
  scene.input.on('pointerdown', (p: Phaser.Input.Pointer) => { startY = p.y; startScroll = cam.scrollY; dragging = false; });
  scene.input.on('pointermove', (p: Phaser.Input.Pointer) => {
    if (!p.isDown) return;
    const dy = p.y - startY;
    if (Math.abs(dy) > 24) dragging = true;
    if (dragging) cam.scrollY = Phaser.Math.Clamp(startScroll - dy, minY, maxY);
  });
  scene.input.on('wheel', (_p: unknown, _o: unknown, _dx: number, dy: number) => {
    cam.scrollY = Phaser.Math.Clamp(cam.scrollY + dy, minY, maxY);
  });
}

/** Petite statistique mise en valeur (Communauté). */
export function statTile(scene: Phaser.Scene, x: number, y: number, w: number, h: number, value: string, caption: string, icon?: string) {
  cardBg(scene, x, y, w, h);
  if (icon) scene.add.image(x + w / 2, y + 58, icon).setScale(icon.startsWith('ic-') ? 0.5 : 0.8).setTint(icon.startsWith('ic-') ? hexOf(color.accent) : 0xffffff);
  label(scene, x + w / 2, y + (icon ? 136 : h / 2 - 20), value, font.title, { weight: 700, color: color.primaryDeep });
  label(scene, x + w / 2, y + h - 46, caption, font.caption + 1, { color: color.inkSoft, weight: 700, wrap: w - 24 });
}

/** Petite animation de mise en valeur (sans rebond excessif). */
export function pop(scene: Phaser.Scene, target: Phaser.GameObjects.GameObject, scale = 1.06) {
  if (reduced()) return;
  scene.tweens.add({ targets: target, scale, duration: motion.quick, yoyo: true, ease: 'Quad.easeOut' });
}
