// Échafaudage commun des écrans de menu : fond, en-tête, navigation basse, défilement.
import type Phaser from 'phaser';
import { dailyFor, today } from '../content/challenges/calendar';
import { Save } from '../save';
import { enableScroll, label, navBar, uiButton, type NavKey } from './components';
import { color, font, space, touch } from './theme';
import { backdrop, fadeIn, goTo, H, W } from './ui';

export const NAV_H = 78 * 3;
/** Centre vertical de la barre de navigation (au-dessus de la zone système). */
export const navY = () => H - space.margin - NAV_H / 2 - 12;

export function navDots(): Partial<Record<NavKey, boolean>> {
  const d = dailyFor(today());
  return {
    Challenges: !Save.record(d.puzzle.key, d.puzzle.version)?.bestMoves,
    Collection: Save.get().collection.fresh.length > 0,
  };
}

/**
 * Prépare un écran : fond, en-tête (retour + titre + action optionnelle), navigation basse.
 * Retourne l'ordonnée où commence le contenu.
 */
export function setupScreen(scene: Phaser.Scene, opts: { title: string; back?: string | (() => void); nav?: NavKey | null; right?: { icon: string; name: string; onClick: () => void }; subtitle?: string }) {
  scene.input.enabled = true;
  scene.cameras.main.setScroll(0, 0);
  fadeIn(scene);
  backdrop(scene, { clouds: false });
  const y = space.margin + touch.icon / 2 + 10;
  if (opts.back) {
    const back = opts.back;
    uiButton(scene, space.margin + touch.icon / 2, y, 'icon', { icon: 'icon-back', name: 'btn-back' }, () => (typeof back === 'string' ? goTo(scene, back) : back()));
  }
  label(scene, W / 2, y, opts.title, font.title, { weight: 700 });
  if (opts.right) uiButton(scene, W - space.margin - touch.icon / 2, y, 'icon', { icon: opts.right.icon, name: opts.right.name }, opts.right.onClick);
  let top = y + touch.icon / 2 + space.gap;
  if (opts.subtitle) {
    label(scene, W / 2, top + 24, opts.subtitle, font.caption + 3, { color: color.inkSoft, weight: 500, wrap: W - space.margin * 2 });
    top += 70;
  }
  if (opts.nav !== undefined) navBar(scene, navY(), opts.nav, (k) => goTo(scene, k), navDots());
  return top + space.sm;
}

/** Active le défilement si le contenu dépasse la zone visible au-dessus de la navigation. */
export function finishScreen(scene: Phaser.Scene, contentBottom: number, hasNav = true) {
  const visibleBottom = hasNav ? navY() - NAV_H / 2 - space.gap : H - space.margin;
  enableScroll(scene, contentBottom + space.section, visibleBottom);
}
