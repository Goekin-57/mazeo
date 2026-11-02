import Phaser from 'phaser';
import { C, hex } from '../art/palette';
import { dailyFor, findPuzzle, today } from '../content/challenges/calendar';
import { CHAPTERS } from '../content/chapters';
import { optimalMoves } from '../progress';
import { Save } from '../save';
import { community } from '../social/backend';
import { challengeCode, challengeLink } from '../social/share';
import { backdrop, button, centerCamera, fadeIn, goTo, toast, txt, W } from '../ui/ui';

/**
 * Communauté : records locaux, classements (indisponibles sans serveur, dit clairement),
 * partage d'un défi par lien. Aucun faux joueur, aucun score présenté comme synchronisé.
 */
export class CommunityScene extends Phaser.Scene {
  constructor() {
    super('Community');
  }

  create() {
    this.input.enabled = true;
    centerCamera(this);
    fadeIn(this);
    backdrop(this, { clouds: false });
    button(this, 96, 96, 'btn-small', { icon: 'icon-back', iconScale: 0.9 }, () => goTo(this, 'Home'), 'btn-back').setScale(0.95);
    txt(this, W / 2 + 30, 104, 'Communauté', 66, { weight: 700 });

    this.records(220);
    this.boards(930);
    this.share(1360);
  }

  private panel(top: number, h: number, title: string) {
    const g = this.add.graphics();
    g.fillStyle(0x2c4a30, 0.12);
    g.fillRoundedRect(60, top + 8, W - 120, h, 44);
    g.fillStyle(0xfffbf0, 0.96);
    g.fillRoundedRect(60, top, W - 120, h, 44);
    g.lineStyle(3, hex(C.creamDark), 1);
    g.strokeRoundedRect(60, top, W - 120, h, 44);
    txt(this, 110, top + 56, title, 40, { weight: 700, align: 'left' }).setOrigin(0, 0.5);
  }

  private records(top: number) {
    this.panel(top, 680, 'Mes records');
    const ch = CHAPTERS[0];
    const done = ch.levels.filter((l) => Save.level(l.key)?.completed);
    const optimal = done.filter((l) => Save.level(l.key)!.bestMoves === optimalMoves(l)).length;
    txt(this, 110, top + 130, `${ch.name} : ${done.length}/${ch.levels.length} niveaux · ${optimal} parcours optimaux`, 30, { weight: 600, align: 'left', wrap: 860 }).setOrigin(0, 0.5);
    const recs = Object.values(Save.get().challenges.records).filter((r) => r.bestMoves !== null)
      .sort((a, b) => (b.completedAt ?? '').localeCompare(a.completedAt ?? '')).slice(0, 7);
    if (!recs.length) {
      txt(this, W / 2, top + 360, 'Réussis un défi pour voir tes records ici.', 32, { color: C.inkSoft, weight: 500 });
      return;
    }
    recs.forEach((r, i) => {
      const p = findPuzzle(r.puzzleId);
      const y = top + 210 + i * 64;
      txt(this, 110, y, `${p?.name ?? r.puzzleId} · ${p?.difficulty ?? ''} (v${r.version})`, 30, { weight: 600, align: 'left' }).setOrigin(0, 0.5);
      txt(this, W - 110, y, `${r.bestRankedMoves !== null ? `classé ${r.bestRankedMoves}` : 'non classé'} · meilleur ${r.bestMoves}`, 28, { color: C.inkSoft, weight: 500, align: 'right' }).setOrigin(1, 0.5);
    });
  }

  private boards(top: number) {
    this.panel(top, 400, 'Classements');
    const rows = ['Entre amis', 'Hebdomadaire', 'Mondial'];
    rows.forEach((r, i) => {
      const x = 230 + i * 310;
      this.add.image(x, top + 170, 'icon-lock').setScale(0.8).setAlpha(0.7);
      txt(this, x, top + 240, r, 32, { weight: 700 });
      txt(this, x, top + 282, 'Indisponible', 26, { color: C.inkSoft, weight: 500 });
    });
    txt(this, W / 2, top + 350, community.online ? '' : community.unavailableReason, 26, { color: C.inkSoft, weight: 400, wrap: 860 });
  }

  private share(top: number) {
    this.panel(top, 440, 'Défier un ami');
    const p = dailyFor(today()).puzzle;
    txt(this, 110, top + 140, 'Envoie le défi du jour : ton ami jouera exactement le même labyrinthe (même version).', 30, { weight: 500, align: 'left', wrap: 860 }).setOrigin(0, 0.5);
    txt(this, 110, top + 220, `Code : ${challengeCode(p.key, p.version)}`, 32, { weight: 700, align: 'left' }).setOrigin(0, 0.5).setName('share-code');
    button(this, W / 2, top + 310, 'pill-sm-orange', { label: 'Copier le lien', icon: 'icon-share', iconScale: 0.6, size: 34, iconX: -120 }, () => {
      const link = challengeLink(p.key, p.version);
      const ok = () => toast(this, 'Lien copié', 1820, 2000);
      const fail = () => toast(this, link, 1820, 6000);
      try { navigator.clipboard.writeText(link).then(ok, fail); } catch { fail(); }
    }, 'share-link');
    txt(this, W / 2, top + 400, 'Sans compte en ligne, les scores ne sont pas comparés automatiquement.', 26, { color: C.inkSoft, weight: 400, wrap: 860 });
  }
}
