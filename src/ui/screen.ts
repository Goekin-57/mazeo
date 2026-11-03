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

/** Pastilles de nouveauté réelle : retirées dès que la rubrique est consultée. */
export function navDots(): Partial<Record<NavKey, boolean>> {
  const d = dailyFor(today());
  const day = d.contextId;
  return {
    // nouveau défi du jour pas encore consulté (et pas encore réussi)
    Challenges: Save.get().challengesSeenDay !== day && !Save.record(d.puzzle.key, d.puzzle.version)?.bestMoves,
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
    uiButton(scene, space.margin + touch.icon / 2, y, 'icon', { icon: 'ic-back', name: 'btn-back', aria: 'Retour' }, () => (typeof back === 'string' ? goTo(scene, back) : back()));
  }
  label(scene, W / 2, y, opts.title, font.title, { weight: 700 }).setName('screen-title');
  if (opts.right) uiButton(scene, W - space.margin - touch.icon / 2, y, 'icon', { icon: opts.right.icon, name: opts.right.name, aria: opts.right.name }, opts.right.onClick);
  let top = y + touch.icon / 2 + space.gap;
  if (opts.subtitle) {
    const t = label(scene, W / 2, top + 6, opts.subtitle, font.caption + 3, { color: color.inkSoft, weight: 700, wrap: W - space.margin * 2 }).setOrigin(0.5, 0);
    top += t.height + 24;
  }
  if (opts.nav !== undefined) navBar(scene, navY(), opts.nav, (k) => goTo(scene, k), navDots());
  return top + space.sm;
}

/**
 * Active le défilement si le contenu dépasse la zone visible au-dessus de la navigation.
 * Marge basse généreuse : la navigation ne recouvre jamais la dernière carte.
 */
export function finishScreen(scene: Phaser.Scene, contentBottom: number, hasNav = true) {
  const visibleBottom = hasNav ? navY() - NAV_H / 2 - space.gap : H - space.margin;
  enableScroll(scene, contentBottom + space.section * 2, visibleBottom);
}
