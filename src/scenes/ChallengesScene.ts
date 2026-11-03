import Phaser from 'phaser';
import { drawThumb } from '../art/board';
import { dailyFor, findPuzzle, formatDuration, msUntilNextDaily, today, weeklyFor } from '../content/challenges/calendar';
import { CHAPTERS } from '../content/chapters';
import { parseLevel } from '../core/grid';
import type { LevelDef } from '../core/types';
import { optimalMoves } from '../progress';
import { Save } from '../save';
import { challengeCode, challengeLink, parseChallengeCode } from '../social/share';
import { cardBg, chip, fixToScreen, label, statTile, uiButton } from '../ui/components';
import { finishScreen, setupScreen } from '../ui/screen';
import { color, font, space, touch } from '../ui/theme';
import { goTo, H, toast, W } from '../ui/ui';

const DIFF_TONE: Record<string, string> = { Facile: color.success, Intermédiaire: color.primary, Expert: '#b4637a' };
const d = (n: number) => `${n} déplacement${n > 1 ? 's' : ''}`;

/**
 * Défis (v0.5) : le défi du jour d'abord (nom, difficulté, statut, action principale « Mode défi »),
 * la semaine, mes records locaux, « Défier un ami », puis l'historique repliable.
 */
export class ChallengesScene extends Phaser.Scene {
  private linked: string | null = null;
  private historyOpen = false;
  private focus: string | null = null;
  constructor() {
    super('Challenges');
  }

  init(data: { linked?: string; historyOpen?: boolean; focus?: string }) {
    this.linked = data.linked ?? null;
    this.historyOpen = !!data.historyOpen;
    this.focus = data.focus ?? null;
  }

  create() {
    const now = today();
    const daily = dailyFor(now);
    Save.noteDaily(daily.contextId, daily.puzzle.key, daily.puzzle.version);
    Save.markChallengesSeen(daily.contextId);
    let y = setupScreen(this, { title: 'Défis', back: 'Home', nav: 'Challenges' });
    y = this.dailyCard(daily.puzzle, daily.contextId, now, y);
    y = this.weeklyCard(now, y + space.section);
    const recordsTop = y + space.section;
    y = this.records(recordsTop);
    y = this.share(daily.puzzle, y + space.section);
    y = this.historySection(daily.contextId, y + space.section);
    finishScreen(this, y);
    if (this.focus === 'records') {
      const b = (this as unknown as { __scroll?: { max: number } }).__scroll;
      if (b) this.cameras.main.setScroll(0, Math.min(b.max, recordsTop - 200));
    }
    if (this.linked) this.linkedPanel(this.linked);
  }

  private thumb(def: LevelDef, w: number, h: number) {
    const k = `cthumb-${def.key}-${w}`;
    if (!this.textures.exists(k)) this.textures.addCanvas(k, drawThumb(parseLevel(def), def.theme, w, h));
    return k;
  }

  private dailyCard(p: LevelDef, contextId: string, now: Date, top: number) {
    const x = space.margin, w = W - space.margin * 2, pad = space.pad + 12;
    const rec = Save.record(p.key, p.version);
    const done = !!rec?.bestMoves;
    let h = 1080;
    const bg = cardBg(this, x, top, w, h, { border: color.primary, borderW: 5 });
    const date = now.toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', timeZone: 'UTC' });
    label(this, x + pad, top + 60, 'Défi du jour', font.caption + 2, { color: color.inkSoft, weight: 700, align: 'left' });
    label(this, x + w - pad, top + 60, date.charAt(0).toUpperCase() + date.slice(1), font.caption + 1, { color: color.inkSoft, weight: 700, align: 'right' });
    // nom, difficulté, statut — en premier
    label(this, x + pad, top + 130, p.name, font.title, { weight: 700, align: 'left', wrap: w - pad * 2 }).setName('daily-name');
    const c1 = chip(this, x + pad, top + 210, p.difficulty, DIFF_TONE[p.difficulty] ?? color.accent, { align: 'left' });
    const status = done ? `Réussi · ${d(rec!.bestMoves!)}` : rec?.attempts ? 'Tenté' : 'À faire';
    chip(this, x + pad + c1.width + 16, top + 210, status, done ? 'success' : 'neutral', { align: 'left' }).setName('daily-status');
    // aperçu + meilleur résultat local (lignes empilées selon leur hauteur réelle)
    this.add.image(x + pad + 140, top + 410, this.thumb(p, 280, 260));
    const tx = x + pad + 320;
    const lw = x + w - pad - tx;
    let ly = top + 300;
    const line = (t: string, name: string, c: string = color.inkSoft) => {
      const o = label(this, tx, ly, t, font.caption + 2, { color: c, weight: 700, align: 'left', wrap: lw }).setOrigin(0, 0).setName(name);
      ly += o.height + 22;
    };
    line(rec?.bestRankedMoves ? `Ton meilleur en mode défi : ${d(rec.bestRankedMoves)}` : 'Pas encore réussi en mode défi', 'daily-line-1', color.ink);
    line(done ? `Meilleur parcours possible : ${d(optimalMoves(p))}` : 'Réussis ce défi pour découvrir le meilleur parcours', 'daily-line-2');
    line('Résultats enregistrés sur cet appareil', 'daily-line-3');
    // actions : mode défi (principal), entraînement (secondaire), avec les restrictions avant de jouer
    const bw = w - pad * 2;
    const lab = 'Défi du jour';
    let by = Math.max(top + 600, ly + 40) + touch.primaryH / 2;
    uiButton(this, W / 2, by, 'primary', { label: 'Mode défi', icon: 'ic-flag', width: bw, name: 'daily-ranked' }, () => goTo(this, 'Game', { kind: 'challenge', key: p.key, contextId, ranked: true, label: lab }));
    const cap1 = label(this, W / 2, by + touch.primaryH / 2 + 18, 'Sans annulation ni indice · ton meilleur résultat est conservé', font.caption + 1, { color: color.inkSoft, weight: 700, wrap: bw }).setOrigin(0.5, 0);
    by = cap1.y + cap1.height + 36 + touch.secondaryH / 2;
    uiButton(this, W / 2, by, 'secondary', { label: 'Entraînement', width: bw, name: 'daily-practice' }, () => goTo(this, 'Game', { kind: 'challenge', key: p.key, contextId, ranked: false, label: lab }));
    const c2 = label(this, W / 2, by + touch.secondaryH / 2 + 18, 'Annulation permise · résultat non comptabilisé', font.caption + 1, { color: color.inkSoft, weight: 700, wrap: bw }).setOrigin(0.5, 0);
    const cd = label(this, W / 2, c2.y + c2.height + 50, '', font.caption + 1, { color: color.inkSoft, weight: 700 });
    const tick = () => cd.setText(`Prochain défi dans ${formatDuration(msUntilNextDaily(today()))}`);
    tick();
    this.time.addEvent({ delay: 30_000, loop: true, callback: tick });
    h = cd.y + 60 - top;
    bg.clear();
    bg.destroy();
    cardBg(this, x, top, w, h, { border: color.primary, borderW: 5 }).setDepth(-1);
    return top + h;
  }

  private weeklyCard(now: Date, top: number) {
    const wk = weeklyFor(now);
    const x = space.margin, w = W - space.margin * 2, pad = space.pad + 12;
    const rowH = 200;
    const h = 170 + rowH * 3 + 110;
    cardBg(this, x, top, w, h);
    const n = wk.contextId.split('-W')[1];
    label(this, x + pad, top + 64, `Défi de la semaine · S${n}`, font.heading, { weight: 700, align: 'left' });
    label(this, x + pad, top + 120, `3 labyrinthes en mode défi · fin dans ${formatDuration(wk.endsAt.getTime() - today().getTime())}`, font.caption + 1, { color: color.inkSoft, weight: 700, align: 'left', wrap: w - pad * 2 });
    let total = 0, doneCount = 0;
    wk.puzzles.forEach((p, i) => {
      const y = top + 170 + i * rowH + rowH / 2;
      const rec = Save.record(p.key, p.version);
      const best = rec?.bestRankedMoves ?? null;
      if (best !== null) { total += best; doneCount++; }
      this.add.image(x + pad + 66, y, this.thumb(p, 132, 132));
      label(this, x + pad + 160, y - 30, p.name, font.body, { weight: 700, align: 'left', wrap: w - pad * 2 - 160 - 290 });
      chip(this, x + pad + 160, y + 32, best !== null ? `Réussi · ${d(best)}` : p.difficulty, best !== null ? 'success' : 'neutral', { align: 'left' });
      uiButton(this, x + w - pad - 130, y, 'secondary', { label: best !== null ? 'Améliorer' : 'Jouer', width: 260, name: `weekly-${i}` },
        () => goTo(this, 'Game', { kind: 'challenge', key: p.key, contextId: wk.contextId, ranked: true, label: `Semaine ${i + 1}/3` }));
    });
    const msg = doneCount === 3 ? `Score de la semaine : ${d(total)}` : `Termine les 3 labyrinthes pour obtenir ton score (${doneCount}/3)`;
    label(this, W / 2, top + h - 56, msg, font.label, { weight: 700, color: doneCount === 3 ? color.primaryDeep : color.ink, wrap: w - pad * 2 }).setName('weekly-total');
    return top + h;
  }

  /** Mes records : vraies statistiques locales (aucun faux joueur). */
  private records(top: number) {
    label(this, space.margin + 8, top + 24, 'Mes records', font.body + 3, { weight: 700, align: 'left' }).setName('records-title');
    label(this, W - space.margin - 8, top + 24, 'sur cet appareil', font.caption + 1, { color: color.inkSoft, weight: 700, align: 'right' });
    top += 74;
    const levels = CHAPTERS.flatMap((c) => c.levels);
    const done = levels.filter((l) => Save.level(l.key)?.completed).length;
    const daily = dailyFor(today()).puzzle;
    const rec = Save.record(daily.key, daily.version);
    const tiles: [string, string, string][] = [
      [`${done}/${levels.length}`, 'niveaux terminés', 'ic-map'],
      [`${Save.totalStars()}/${levels.length * 3}`, 'étoiles', 'ic-star'],
      [`${Save.challengesCompleted()}`, Save.challengesCompleted() > 1 ? 'défis réussis' : 'défi réussi', 'ic-flag'],
      [rec?.bestMoves ? `${rec.bestMoves}` : '—', rec?.bestMoves ? 'déplacements · défi du jour' : 'défi du jour à réussir', 'ic-steps'],
    ];
    const tw = (W - space.margin * 2 - space.gap) / 2, th = 260;
    tiles.forEach(([v, cap, ic], i) => statTile(this, space.margin + (i % 2) * (tw + space.gap), top + Math.floor(i / 2) * (th + space.gap), tw, th, v, cap, ic));
    return top + 2 * th + space.gap;
  }

  /** Défier un ami : le lien désigne le même puzzle, dans la même version, avec les mêmes règles. */
  private share(p: LevelDef, top: number) {
    const x = space.margin, w = W - space.margin * 2, pad = space.pad + 12;
    const t = label(this, x + pad, top + 116, `Il jouera « ${p.name} », la même carte avec les mêmes règles.`, font.caption + 2, { color: color.inkSoft, weight: 700, align: 'left', wrap: w - pad * 2 }).setOrigin(0, 0);
    const h = 116 + t.height + 40 + touch.primaryH + pad;
    cardBg(this, x, top, w, h, { border: color.accent, borderW: 4 }).setDepth(-1);
    label(this, x + pad, top + 64, 'Défier un ami', font.heading, { weight: 700, align: 'left' });
    uiButton(this, W / 2, top + h - pad - touch.primaryH / 2 - 6, 'secondary', { label: 'Partager le défi', icon: 'ic-share', width: w - pad * 2, name: 'share-link' }, () => this.shareLink(p));
    return top + h;
  }

  /** Historique compact, repliable ; absent tant qu'il est vide. */
  private historySection(todayId: string, top: number) {
    const past = Object.entries(Save.get().challenges.dailies).filter(([k]) => k !== todayId).sort((a, b) => (a[0] < b[0] ? 1 : -1)).slice(0, 7);
    if (!past.length) return top - space.section;
    const x = space.margin, w = W - space.margin * 2, pad = space.pad + 12;
    const rowH = 140;
    const h = 130 + (this.historyOpen ? past.length * rowH : 0);
    cardBg(this, x, top, w, h, { alpha: 0.85 });
    label(this, x + pad, top + 65, `Défis précédents (${past.length})`, font.body, { weight: 700, align: 'left' });
    label(this, x + w - pad, top + 65, this.historyOpen ? 'Masquer ▴' : 'Afficher ▾', font.label, { weight: 700, align: 'right', color: color.accent });
    const hit = this.add.rectangle(x + w / 2, top + 65, w, 130, 0, 0).setInteractive({ useHandCursor: true });
    hit.name = 'history-toggle';
    hit.on('pointerup', () => this.scene.restart({ historyOpen: !this.historyOpen }));
    if (this.historyOpen) {
      past.forEach(([ctx, info], i) => {
        const p = findPuzzle(info.puzzleId);
        if (!p || p.version !== info.version) return;
        const y = top + 130 + i * rowH + rowH / 2;
        const rec = Save.record(p.key, p.version);
        const day = ctx.replace('daily-', '');
        label(this, x + pad, y - 22, `${day.slice(8)}/${day.slice(5, 7)} · ${p.name}`, font.label, { weight: 700, align: 'left' });
        label(this, x + pad, y + 26, rec?.bestMoves ? `Meilleur : ${d(rec.bestMoves)}` : 'Non réussi', font.caption + 1, { color: color.inkSoft, weight: 700, align: 'left' });
        uiButton(this, x + w - pad - 140, y, 'secondary', { label: 'Rejouer', width: 280, name: `history-${i}` }, () => goTo(this, 'Game', { kind: 'challenge', key: p.key, contextId: ctx, ranked: false, label: 'Défi précédent' }));
      });
    }
    return top + h;
  }

  /** Partager le défi : partage du système si disponible, copie du lien en secours. */
  private shareLink(p: LevelDef) {
    const link = challengeLink(p.key, p.version);
    const y = this.cameras.main.scrollY + H / 2;
    const ok = () => toast(this, 'Lien copié : ton ami jouera exactement le même labyrinthe', y, 2600);
    const fail = () => toast(this, `Code du défi : ${challengeCode(p.key, p.version)}`, y, 5000);
    const copy = () => { try { navigator.clipboard.writeText(link).then(ok, fail); } catch { fail(); } };
    const nav = navigator as Navigator & { share?: (d: ShareData) => Promise<void> };
    if (nav.share && !new URLSearchParams(location.search).has('e2e')) nav.share({ title: `MAZEO — ${p.name}`, url: link }).catch(copy);
    else copy();
  }

  /** Défi reçu par lien (?defi=puzzle@version) : mêmes règles, restrictions affichées avant de jouer. */
  private linkedPanel(code: string) {
    const parsed = parseChallengeCode(code);
    if (!parsed || !parsed.ok) {
      toast(this, parsed && !parsed.ok ? parsed.reason : 'Lien de défi invalide', H / 2, 4000);
      return;
    }
    const p = findPuzzle(parsed.puzzleId)!;
    const c = this.add.container(0, 0).setDepth(50000).setScrollFactor(0).setName('linked-panel');
    c.add(this.add.rectangle(W / 2, H / 2, W, H, color.scrim, 0.42).setInteractive());
    const w = W - space.margin * 2, h = 1340, top = (H - h) / 2;
    c.add(cardBg(this, space.margin, top, w, h, { border: color.primary, borderW: 5 }));
    c.add(label(this, W / 2, top + 80, 'Défi reçu', font.title + 4, { weight: 700 }));
    c.add(label(this, W / 2, top + 150, `${p.name} · ${p.difficulty}`, font.body + 1, { color: color.inkSoft, weight: 700 }));
    c.add(this.add.image(W / 2, top + 380, this.thumb(p, 320, 300)));
    const ctx = `link-${p.key}@${p.version}`;
    const bw = w - 2 * (space.pad + 12);
    let by = top + 640;
    c.add(uiButton(this, W / 2, by, 'primary', { label: 'Mode défi', icon: 'ic-flag', width: bw, name: 'linked-ranked' }, () => goTo(this, 'Game', { kind: 'challenge', key: p.key, contextId: ctx, ranked: true, label: 'Défi reçu' })));
    c.add(label(this, W / 2, by + touch.primaryH / 2 + 34, 'Sans annulation ni indice', font.caption + 1, { color: color.inkSoft, weight: 700 }));
    by += touch.primaryH + 110;
    c.add(uiButton(this, W / 2, by, 'secondary', { label: 'Entraînement', width: bw, name: 'linked-practice' }, () => goTo(this, 'Game', { kind: 'challenge', key: p.key, contextId: ctx, ranked: false, label: 'Défi reçu' })));
    c.add(label(this, W / 2, by + touch.secondaryH / 2 + 34, 'Annulation permise · non comptabilisé', font.caption + 1, { color: color.inkSoft, weight: 700 }));
    c.add(uiButton(this, W / 2, top + h - space.pad - touch.secondaryH / 2 - 20, 'secondary', { label: 'Plus tard', width: 360, name: 'linked-close', small: true }, () => c.destroy()));
    fixToScreen(c);
  }
}
