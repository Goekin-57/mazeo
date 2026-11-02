import Phaser from 'phaser';
import { drawThumb } from '../art/board';
import { dailyFor, today } from '../content/challenges/calendar';
import { CHAPTERS } from '../content/chapters';
import { parseLevel } from '../core/grid';
import { Save } from '../save';
import { community } from '../social/backend';
import { challengeCode, challengeLink } from '../social/share';
import { cardBg, chip, label, statTile, uiButton } from '../ui/components';
import { finishScreen, setupScreen } from '../ui/screen';
import { color, font, space } from '../ui/theme';
import { H, toast, W } from '../ui/ui';

/**
 * Communauté : vraies statistiques locales, partage d'un défi bien visible,
 * classements indiqués indisponibles (aucun faux joueur).
 */
export class CommunityScene extends Phaser.Scene {
  constructor() {
    super('Community');
  }

  create() {
    let y = setupScreen(this, { title: 'Communauté', back: 'Home', nav: 'Community' });
    y = this.stats(y);
    y = this.share(y + space.section);
    y = this.boards(y + space.section);
    finishScreen(this, y);
  }

  private stats(top: number) {
    label(this, space.margin + 8, top + 24, 'Mes records', font.body + 2, { weight: 700, align: 'left' });
    top += 70;
    const levels = CHAPTERS.flatMap((c) => c.levels);
    const done = levels.filter((l) => Save.level(l.key)?.completed).length;
    const d = dailyFor(today()).puzzle;
    const rec = Save.record(d.key, d.version);
    const tiles: [string, string, string][] = [
      [`${done}/${levels.length}`, 'niveaux terminés', 'icon-map'],
      [`${Save.totalStars()}/${levels.length * 3}`, 'étoiles', 'icon-star'],
      [`${Save.challengesCompleted()}`, 'défis réussis', 'icon-flag'],
      [rec?.bestMoves ? `${rec.bestMoves}` : '—', rec?.bestMoves ? 'cases · défi du jour' : 'défi du jour à faire', 'icon-steps'],
    ];
    const tw = (W - space.margin * 2 - space.gap) / 2, th = 280;
    tiles.forEach(([v, cap, ic], i) => statTile(this, space.margin + (i % 2) * (tw + space.gap), top + Math.floor(i / 2) * (th + space.gap), tw, th, v, cap, ic));
    return top + 2 * th + space.gap;
  }

  private share(top: number) {
    const p = dailyFor(today()).puzzle;
    const x = space.margin, w = W - space.margin * 2, pad = space.pad + 12, h = 700;
    cardBg(this, x, top, w, h, { border: color.primary, borderW: 5 });
    label(this, x + pad, top + 66, 'Défier un ami', font.heading, { weight: 700, align: 'left' });
    const k = `cthumb-${p.key}-160`;
    if (!this.textures.exists(k)) this.textures.addCanvas(k, drawThumb(parseLevel(p), p.theme, 160, 150));
    this.add.image(x + pad + 80, top + 220, k);
    label(this, x + pad + 190, top + 180, p.name, font.body + 1, { weight: 700, align: 'left' });
    chip(this, x + pad + 190, top + 250, `Défi du jour · ${p.difficulty}`, 'neutral', { align: 'left' });
    label(this, x + pad, top + 370, 'Ton ami ouvre le lien et joue le même labyrinthe, dans la même version.', font.caption + 2, { color: color.inkSoft, weight: 500, align: 'left', wrap: w - pad * 2 });
    uiButton(this, W / 2, top + 500, 'primary', { label: 'COPIER LE LIEN', icon: 'icon-share', width: w - pad * 2, name: 'share-link' }, () => {
      const link = challengeLink(p.key, p.version);
      const y = this.cameras.main.scrollY + H / 2;
      const ok = () => toast(this, 'Lien copié', y, 2000);
      const fail = () => toast(this, `Code : ${challengeCode(p.key, p.version)}`, y, 6000);
      try { navigator.clipboard.writeText(link).then(ok, fail); } catch { fail(); }
    });
    label(this, W / 2, top + h - 64, 'Les scores ne sont pas encore comparés automatiquement.', font.caption, { color: color.inkSoft, weight: 500, wrap: w - pad * 2 });
    return top + h;
  }

  private boards(top: number) {
    const x = space.margin, w = W - space.margin * 2, pad = space.pad + 12, h = 250;
    cardBg(this, x, top, w, h, { fill: '#f3ecdc', alpha: 0.9 });
    this.add.image(x + pad + 46, top + h / 2, 'icon-lock').setScale(0.95).setAlpha(0.75);
    label(this, x + pad + 110, top + 80, 'Classements : pas encore disponibles', font.body, { weight: 700, align: 'left' });
    label(this, x + pad + 110, top + 160, community.online ? '' : community.unavailableReason, font.caption, { color: color.inkSoft, weight: 500, align: 'left', wrap: w - pad * 2 - 120 });
    return top + h;
  }
}
