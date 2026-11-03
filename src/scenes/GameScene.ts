import Phaser from 'phaser';
import { boardLayout, drawBoard, type BoardLayout } from '../art/board';
import { BD, BT, HEDGE_BASE, HEDGE_H } from '../art/textures';
import { Sfx, unlockAudio } from '../audio/sfx';
import { shortestFrom, stuckReason, verdict } from '../core/analysis';
import { autoDecor, parseLevel, xy } from '../core/grid';
import { allMask, blockReason, countCollected, initialState, step, validMoves } from '../core/rules';
import { Cell, type BlockReason, type CollectibleDef, type GameState, type Grid, type LevelDef, type StepEvents } from '../core/types';
import { findLevel } from '../content/chapters';
import { findPuzzle } from '../content/challenges/calendar';
import { rewardById } from '../content/rewards';
import { optimalMoves, recordAdventureWin, recordChallengeWin, starsFor, type AdventureOutcome } from '../progress';
import { makeResult } from '../score';
import { challengeLink, resultText } from '../social/share';
import { Save } from '../save';
import { fadeIn, goTo, H, paintPageBackground, reduced, toast, W } from '../ui/ui';
import { cardBg, chip, label, uiButton, type UIButton } from '../ui/components';
import { color, font, hexOf, space, touch } from '../ui/theme';
import { Player } from './Player';

/** Ce que la scène doit jouer. */
export type PlayRequest =
  | { kind: 'adventure'; key: string; resume?: boolean }
  | { kind: 'challenge'; key: string; contextId: string; ranked: boolean; label: string };

type Mode = 'idle' | 'drag' | 'moving' | 'won' | 'paused';

const STEP_MS = 210;

const REASON_TEXT: Partial<Record<BlockReason, string>> = {
  closed: 'Cette case a disparu : impossible de repasser',
  'bridge-closed': 'Le pont est replié : active le levier',
  'door-closed': 'L’arche florale est fermée : il faut la graine',
  wall: '',
  water: 'Bourgeon ne sait pas nager !',
};

/** Pluriels et singuliers des déplacements (unité de score). */
export const moves = (n: number) => `${n} déplacement${n > 1 ? 's' : ''}`;

export class GameScene extends Phaser.Scene {
  def!: LevelDef;
  grid!: Grid;
  state!: GameState;
  req!: PlayRequest;
  /** Un état par déplacement : « Annuler le coup » revient d'exactement un déplacement. */
  private history: GameState[] = [];
  /** Cases réellement parcourues (pour le score et la validation). */
  private trail: number[] = [];
  private undos = 0;
  private restarts = 0;
  private hintStage = 0;
  private stuckUi?: Phaser.GameObjects.Container;
  private overlay?: Phaser.GameObjects.Container;
  get ranked() {
    return this.req.kind === 'challenge' && this.req.ranked;
  }
  get undoAllowed() {
    return !this.ranked;
  }
  get hintsAllowed() {
    return this.req.kind === 'adventure';
  }
  get moves() {
    return this.trail.length;
  }
  private mode: Mode = 'idle';
  /** Lecture seule (tests). */
  get currentMode() {
    return this.mode;
  }
  get historySize() {
    return this.history.length;
  }
  get blockedInfo() {
    return this.stuckUi?.getData('kind') ?? null;
  }
  private L!: BoardLayout;
  private ox = 0;
  private oy = 0;
  private s = 1;
  /** Échelle verticale des éléments au sol (les cases peuvent être un peu plus profondes que la texture). */
  private sy = 1;
  private player!: Player;
  private cellRing!: Phaser.GameObjects.Image;
  private walls: Phaser.GameObjects.Image[] = [];
  private gone = new Map<number, Phaser.GameObjects.Image>();
  private items = new Map<number, Phaser.GameObjects.Image>();
  private itemTweens = new Map<number, Phaser.Tweens.Tween>();
  private followers: { id: number; img: Phaser.GameObjects.Image }[] = [];
  private switchImg?: Phaser.GameObjects.Image;
  private planks: Phaser.GameObjects.Image[] = [];
  private ropes: Phaser.GameObjects.Image[] = [];
  private bridgeGhosts: Phaser.GameObjects.Graphics[] = [];
  private vines?: Phaser.GameObjects.Image;
  private exitImg!: Phaser.GameObjects.Image;
  private exitFlag!: Phaser.GameObjects.Image;
  private exitLock?: Phaser.GameObjects.Image;
  private exitHalo?: Phaser.GameObjects.Image;
  private exitOpenShown = false;
  private bloom: Phaser.GameObjects.Image[] = [];
  private preview!: Phaser.GameObjects.Graphics;
  private previewTarget!: Phaser.GameObjects.Image;
  private chevrons: Phaser.GameObjects.Image[] = [];
  private hintMarks: Phaser.GameObjects.GameObject[] = [];
  private path: number[] = [];
  private pathStates: GameState[] = [];
  private queue: number[] = [];
  private down: { x: number; y: number; cell: number; t: number } | null = null;
  private itemsText?: Phaser.GameObjects.Text;
  private itemIcons: Phaser.GameObjects.Image[] = [];
  private conditionChip?: Phaser.GameObjects.Container;
  private movesText?: Phaser.GameObjects.Text;
  private chipsRow?: Phaser.GameObjects.Container;
  private chipsY = 0;
  private btnUndo?: UIButton;
  private btnRestart!: UIButton;
  btnPause!: UIButton;
  private bottomBar!: Phaser.GameObjects.Container;
  private topH = 260;
  private bottomH = 240;
  private itemRings: Phaser.GameObjects.Image[] = [];
  private lastRejectAt = 0;
  private planned: Phaser.GameObjects.GameObject[] = [];
  private hand?: Phaser.GameObjects.Image;
  private solution: number[] = [];
  private resumed = false;

  constructor() {
    super('Game');
  }

  init(data: Partial<PlayRequest> & { level?: number }) {
    let req: PlayRequest;
    if (data.kind === 'challenge' && data.key && findPuzzle(data.key)) req = data as PlayRequest;
    else if (data.kind === 'adventure' && data.key && findLevel(data.key)) req = data as PlayRequest;
    else req = { kind: 'adventure', key: `chapter01-level0${Phaser.Math.Clamp(data.level ?? 1, 1, 6)}` };
    this.req = req;
    this.def = req.kind === 'challenge' ? findPuzzle(req.key)! : findLevel(req.key)!.level;
    this.grid = parseLevel(this.def);
    this.state = initialState(this.grid);
    this.history = [];
    this.trail = [];
    this.undos = 0;
    this.restarts = 0;
    this.hintStage = 0;
    this.stuckUi = undefined;
    this.overlay = undefined;
    this.movesText = undefined;
    this.itemsText = undefined;
    this.conditionChip = undefined;
    this.chipsRow = undefined;
    this.hand = undefined;
    this.btnUndo = undefined;
    this.exitLock = undefined;
    this.exitHalo = undefined;
    this.exitOpenShown = false;
    this.itemRings = [];
    this.planned = [];
    this.hintMarks = [];
    this.mode = 'idle';
    this.gone = new Map();
    this.items = new Map();
    this.itemTweens = new Map();
    this.followers = [];
    this.walls = [];
    this.planks = [];
    this.ropes = [];
    this.bridgeGhosts = [];
    this.bloom = [];
    this.chevrons = [];
    this.path = [];
    this.pathStates = [];
    this.queue = [];
    this.down = null;
    this.vines = undefined;
    this.switchImg = undefined;
    this.itemIcons = [];
    this.resumed = false;
    this.solution = shortestFrom(this.grid, this.state).path ?? [];
    // « Reprendre le niveau » : on rejoue exactement le parcours sauvegardé
    if (req.kind === 'adventure' && req.resume) {
      const run = Save.run();
      if (run && run.key === this.def.key && run.version === this.def.version) {
        let s = this.state;
        for (const c of run.path) {
          const r = step(this.grid, s, c);
          if ('blocked' in r) break;
          this.history.push(s);
          this.trail.push(c);
          s = r.state;
        }
        this.state = s;
        this.undos = run.undos;
        this.restarts = run.restarts;
        this.resumed = this.trail.length > 0;
      }
    }
  }

  create() {
    this.input.enabled = true;
    fadeIn(this);
    this.buildBackground();
    this.computeChrome();
    this.buildBoard();
    this.buildHud();
    this.buildExit();
    if (this.resumed) this.applyState(this.state, false);
    else Save.setCurrent(this.req.kind === 'adventure' ? this.def.key : Save.get().currentLevel);
    this.refreshHud();
    this.refreshChevrons();
    this.setupInput();
    this.playIntro();
    this.registry.set('scene', this);
  }

  // =====================================================================
  // Géométrie
  // =====================================================================

  /** Centre (au sol) de la case i. */
  center(i: number) {
    const [x, y] = xy(this.grid, i);
    return { x: this.ox + (x + 0.5) * this.L.tw, y: this.oy + (y + 0.5) * this.L.td };
  }

  private cellBottom(i: number) {
    const [, y] = xy(this.grid, i);
    return this.oy + (y + 1) * this.L.td;
  }

  /** Case sous un point écran (projection sur le sol), ou -1. */
  cellAt(px: number, py: number) {
    const x = Math.floor((px - this.ox) / this.L.tw);
    const y = Math.floor((py - this.oy) / this.L.td);
    if (x < 0 || y < 0 || x >= this.grid.width || y >= this.grid.height) return -1;
    return y * this.grid.width + x;
  }

  // =====================================================================
  // Construction
  // =====================================================================

  private buildBackground() {
    paintPageBackground();
    if (reduced()) return;
    const cl = this.add.image(160, this.topH + 40, 'cloud').setAlpha(0.45).setDepth(-900).setScale(0.7);
    this.tweens.add({ targets: cl, x: cl.x + 160, duration: 30000, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
  }

  /** Hauteurs réservées : en-tête + indicateurs (haut), barre de commandes (bas). */
  private computeChrome() {
    const titleW = W - 2 * (space.margin + 18 + touch.icon + 12);
    const probe = label(this, -2000, -2000, this.def.objective, font.body, { wrap: titleW });
    const objH = probe.height;
    probe.destroy();
    const probeT = label(this, -2000, -2000, this.titleText(), font.heading, { weight: 700, wrap: titleW });
    const titleH = probeT.height;
    probeT.destroy();
    const headerH = Math.max(touch.icon + 24, 28 + titleH + 10 + objH + 26);
    this.topH = space.margin + headerH + space.gap;
    this.chipsY = this.topH + 34;
    this.topH += 68 + space.gap;
    this.bottomH = touch.barBtn + 24 + space.margin + 18 + space.gap;
  }

  private buildBoard() {
    const g = this.grid;
    // la sortie (arche + drapeau) dépasse au-dessus de sa case
    const [, exitRow] = xy(g, g.exit);
    const overflowTop = exitRow === 0 ? 0.8 : 0.2;
    const padF = 0.14, soilF = 0.3;
    // plateau : ~94 % de la largeur sur téléphone ; les cases s'allongent un peu si la hauteur le permet
    const availW = W * 0.94;
    const availH = H - this.topH - this.bottomH;
    const extra = 2 * padF + soilF + overflowTop + 0.1;
    const byW = availW / (g.width + 2 * padF);
    const byH = availH / (g.height * 0.825 + extra);
    const tw = Math.floor(Math.min(byW, byH, 300));
    const depth = Phaser.Math.Clamp((availH / tw - extra) / g.height, 0.825, 0.95);
    this.L = boardLayout(g, tw, { pad: padF, soil: soilF, depth });
    this.s = tw / BT;
    this.sy = this.L.td / BD;
    const boardH = this.L.height + overflowTop * tw;
    const bx = Math.round((W - this.L.width) / 2);
    const by = Math.round(this.topH + (availH - boardH) / 2 + overflowTop * tw);
    this.ox = bx + this.L.pad;
    this.oy = by + this.L.pad;

    const key = `board-${this.def.key}-${this.def.version}-${tw}`;
    if (!this.textures.exists(key)) this.textures.addCanvas(key, drawBoard(g, this.def.theme, this.L, this.def.id * 97 + this.def.key.length));
    const board = this.add.image(bx, by, key).setOrigin(0).setDepth(0).setName('board');
    if (!reduced()) {
      board.setAlpha(0);
      this.tweens.add({ targets: board, alpha: 1, duration: 260 });
    }

    const s = this.s;
    let wallVariant = 0;
    const decor = autoDecor(g, this.def.key.length * 7 + this.def.id);
    g.cells.forEach((cell, i) => {
      const c = this.center(i);
      const bottom = this.cellBottom(i);
      if (cell === Cell.Wall) {
        const d = decor[i]!;
        const tex = d === 'hedge' || d === 'tree' ? `hedge${wallVariant++ % 3}` : d;
        // hauteur réduite : les obstacles ne masquent plus la case située derrière eux
        const img = this.add.image(c.x, bottom, tex).setOrigin(0.5, HEDGE_BASE / HEDGE_H).setScale(s, s * this.sy * 0.86).setDepth(bottom);
        if (d === 'flowers' || d === 'bush') this.sway(img, 1.4);
        this.walls.push(img);
      } else if (cell === Cell.Water) {
        if (!reduced() && (i * 7) % 3 !== 0) {
          const sh = this.add.image(c.x + ((i * 13) % 30) - 15, c.y + ((i * 7) % 20) - 10, 'shine').setScale(s).setDepth(1).setAlpha(0);
          this.tweens.add({ targets: sh, alpha: 0.9, x: sh.x + 14 * s, duration: 1400 + (i % 5) * 300, yoyo: true, repeat: -1, delay: (i % 7) * 260, ease: 'Sine.easeInOut' });
        }
        if (this.def.theme === 'pond' && i % 2 === 0) this.add.image(c.x + (i % 3 - 1) * 18 * s, c.y, 'lily').setScale(s).setDepth(1);
      } else if (cell === Cell.Switch) {
        this.add.image(c.x, c.y + 8 * s, 'item-base').setScale(s * 0.95).setDepth(1.2).setTint(0x9fd8cf);
        this.switchImg = this.add.image(c.x, c.y + 22 * s, 'lever-off').setOrigin(0.5, 0.92).setScale(s * 0.9).setDepth(c.y + 22 * s).setName('lever');
      } else if (cell === Cell.Collectible) {
        const def = g.collectibles.find((k) => k.y * g.width + k.x === i)!;
        // socle doré pointillé : objectif à récupérer (distinct des fleurs décoratives)
        const ring = this.add.image(c.x, c.y, 'item-base').setScale(s).setDepth(1.2).setName(`ring-${def.id}`);
        this.itemRings.push(ring);
        if (!reduced()) this.tweens.add({ targets: ring, alpha: 0.55, duration: 1100, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
        const img = this.add.image(c.x, c.y + 10 * s, def.kind).setOrigin(0.5, 0.92).setScale(s * (def.kind === 'seed' ? 1.05 : 0.95)).setDepth(c.y + 10 * s);
        this.items.set(def.id, img);
        this.idleItem(def.id, img);
        if (def.kind === 'seed') {
          const glow = this.add.image(c.x, c.y - 10 * s, 'glow').setScale(s * 1.2).setDepth(3).setAlpha(0.6);
          glow.setName(`seed-glow-${def.id}`);
          if (!reduced()) this.tweens.add({ targets: glow, alpha: 0.25, scale: s * 0.9, duration: 900, yoyo: true, repeat: -1 });
        }
      } else if (cell === Cell.Bridge) {
        this.buildBridgeCell(i);
      } else if (cell === Cell.Door) {
        this.add.image(c.x, bottom - 2 * s, 'arch').setOrigin(0.5, 1).setScale(s * 0.86).setDepth(bottom + 1);
        this.vines = this.add.image(c.x, bottom - 6 * s, 'vines').setOrigin(0.5, 1).setScale(s * 0.8).setDepth(bottom + 2).setName('door-vines');
      }
    });

    // Floraison décorative quand l'arche s'ouvre (niveau de la graine) ou à la fin du chapitre
    if (g.collectibles.some((k) => k.kind === 'seed') || this.def.exitStyle === 'beacon') {
      g.cells.forEach((cell, i) => {
        if (cell !== Cell.Wall || g.decor[i] === 'rock') return;
        const c = this.center(i);
        const f = this.add.image(c.x + ((i * 7) % 24) - 12, c.y - 34 * s, ['bloom-a', 'bloom-b', 'bloom-c'][i % 3]).setScale(0).setDepth(this.cellBottom(i) + 1);
        this.bloom.push(f);
      });
    }

    // Repère de la case du personnage (visible sous le sprite)
    const pc = this.center(g.start);
    this.cellRing = this.add.image(pc.x, pc.y, 'cell-ring').setScale(s, s * this.sy).setDepth(1.6).setName('cell-ring');
    const eq = Save.get().collection.equipped;
    this.player = new Player(this, pc.x, pc.y + 6 * s, Math.min(s * 0.86, 1.12), { hat: eq.hat === 'hat-gardener', golden: eq.scarf === 'scarf-golden' });
    this.player.setDepth(pc.y + 7 * s);

    this.preview = this.add.graphics().setDepth(9000);
    this.previewTarget = this.add.image(0, 0, 'target').setScale(s).setDepth(9001).setVisible(false);
  }

  /** Balancement doux du décor (mise à l'échelle, sans rotation). */
  private sway(img: Phaser.GameObjects.Image, amp: number) {
    if (reduced()) return;
    const sx = img.scaleX, sy = img.scaleY;
    this.tweens.add({
      targets: img, scaleX: sx * (1 + amp * 0.015), scaleY: sy * (1 - amp * 0.01), duration: 1800 + Math.random() * 1200,
      yoyo: true, repeat: -1, ease: 'Sine.easeInOut', delay: Math.random() * 1000,
    });
  }

  private idleItem(id: number, img: Phaser.GameObjects.Image) {
    this.itemTweens.get(id)?.stop();
    if (reduced()) return;
    const t = this.tweens.add({ targets: img, scaleY: img.scaleX * 1.06, y: img.y - 4 * this.s, duration: 700 + id * 120, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
    this.itemTweens.set(id, t);
  }

  private buildBridgeCell(i: number) {
    const c = this.center(i);
    const s = this.s;
    const n = 4;
    // pont replié : contour pointillé de son emplacement (forme + couleur)
    const ghost = this.add.graphics().setDepth(1.8).setName('bridge-ghost');
    const gw = this.L.tw * 0.8, gh = this.L.td * 0.82;
    ghost.lineStyle(6 * s, 0x8e5f37, 0.9);
    for (let k = 0; k < 4; k++) {
      const yy = c.y - gh / 2 + (k + 0.5) * (gh / 4);
      for (let xx = -gw / 2; xx < gw / 2; xx += 28 * s) ghost.lineBetween(c.x + xx, yy, c.x + Math.min(gw / 2, xx + 16 * s), yy);
    }
    this.bridgeGhosts.push(ghost);
    for (let k = 0; k < n; k++) {
      const y = c.y - this.L.td / 2 + (k + 0.5) * (this.L.td / n);
      const p = this.add.image(c.x, y, 'plank').setScale(s * 0.86, s * 0.95).setDepth(2).setVisible(false);
      p.setData('row', xy(this.grid, i)[1] * n + k);
      p.setData('baseY', y);
      this.planks.push(p);
    }
    const [x, y] = xy(this.grid, i);
    const above = y > 0 ? this.grid.cells[(y - 1) * this.grid.width + x] : null;
    const below = y < this.grid.height - 1 ? this.grid.cells[(y + 1) * this.grid.width + x] : null;
    const ends: number[] = [];
    if (above !== Cell.Bridge && above !== Cell.Water) ends.push(c.y - this.L.td / 2);
    if (below !== Cell.Bridge && below !== Cell.Water) ends.push(c.y + this.L.td / 2);
    for (const ey of ends) {
      for (const side of [-1, 1]) this.add.image(c.x + side * this.L.tw * 0.42, ey + 6 * s, 'post').setOrigin(0.5, 1).setScale(s).setDepth(ey + 6 * s);
      if (ey > c.y) this.ropes.push(this.add.image(c.x, ey + 14 * s, 'rope-coil').setScale(s).setDepth(ey + 2));
    }
    this.planks.sort((a, b) => b.getData('row') - a.getData('row'));
  }

  // =====================================================================
  // Sortie : identité unique (socle, arche, drapeau) + cadenas tant qu'une condition manque
  // =====================================================================

  private buildExit() {
    const i = this.grid.exit;
    const c = this.center(i);
    const s = this.s;
    const bottom = this.cellBottom(i);
    this.exitHalo = this.add.image(c.x, c.y + 6 * s, 'glow-teal').setScale(s * 1.9, s * 1.0).setDepth(1.5).setAlpha(0.5);
    const es = s * 0.98;
    this.exitImg = this.add.image(c.x, bottom - 2 * s, 'exit-closed').setOrigin(0.5, 1).setScale(es).setDepth(bottom).setName('exit');
    const archTop = bottom - 2 * s - this.exitImg.displayHeight;
    this.exitFlag = this.add.image(c.x + 2 * s, archTop + 8 * es, 'exit-flag').setOrigin(0.05, 0.9).setScale(es).setDepth(bottom + 1);
    if (!reduced()) this.tweens.add({ targets: this.exitFlag, scaleX: this.exitFlag.scaleX * 0.86, duration: 900, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
    this.exitLock = this.add.image(c.x, bottom - this.exitImg.displayHeight * 0.42, 'exit-lock').setScale(s * 0.9).setDepth(bottom + 2).setName('exit-lock');
    this.exitOpenShown = false;
    if (this.exitConditionsMet()) this.setExitOpen(false);
  }

  /** Conditions visuelles de la sortie : objets requis, et pont / arche ouverts s'il y en a. */
  private exitConditionsMet(st = this.state) {
    const g = this.grid;
    if (st.collected !== allMask(g)) return false;
    if (g.cells.includes(Cell.Bridge) && !st.bridgesOpen) return false;
    if (g.cells.includes(Cell.Door) && !st.doorsOpen) return false;
    return true;
  }

  /** Condition exacte affichée tant que la sortie est fermée. */
  exitCondition(st = this.state): string | null {
    const g = this.grid;
    const missing = g.collectibles.filter((c) => !((st.collected >> c.id) & 1));
    const ducks = missing.filter((c) => c.kind === 'duckling').length;
    const totalDucks = g.collectibles.filter((c) => c.kind === 'duckling').length;
    if (missing.some((c) => c.kind === 'seed')) return 'Récupère la graine';
    if (ducks) return totalDucks === 1 ? 'Récupère le caneton' : ducks === totalDucks ? `Récupère les ${ducks} canetons` : `Récupère encore ${ducks} caneton${ducks > 1 ? 's' : ''}`;
    if (missing.length) return `Récupère encore ${missing.length} objet${missing.length > 1 ? 's' : ''}`;
    if (g.cells.includes(Cell.Bridge) && !st.bridgesOpen) return 'Active le levier';
    if (g.cells.includes(Cell.Door) && !st.doorsOpen) return 'Ouvre l’arche florale';
    return null;
  }

  private setExitOpen(animate: boolean) {
    if (this.exitOpenShown) return;
    this.exitOpenShown = true;
    this.exitImg.setTexture('exit-open');
    this.exitHalo?.setTint(0xffffff).setAlpha(0.9);
    const lock = this.exitLock;
    this.exitLock = undefined;
    if (!lock) return;
    if (!animate || reduced()) {
      lock.destroy();
      return;
    }
    // déverrouillage : le cadenas saute et disparaît, l'arche s'ouvre, le drapeau se lève
    Sfx.pickup();
    this.tweens.add({ targets: lock, y: lock.y - 60 * this.s, scale: lock.scale * 1.4, alpha: 0, duration: 420, ease: 'Quad.easeOut', onComplete: () => lock.destroy() });
    this.tweens.add({ targets: this.exitImg, scaleY: { from: this.exitImg.scaleY * 0.9, to: this.exitImg.scaleY }, duration: 260, ease: 'Back.easeOut' });
    this.sparkleBurst(this.exitImg.x, this.exitImg.y - this.exitImg.displayHeight * 0.6, 8);
    const c = this.center(this.grid.exit);
    const ring = this.add.image(c.x, c.y + 6 * this.s, 'ring').setDepth(3).setScale(this.s * 0.4, this.s * 0.22).setTint(0x8fe0d4);
    this.tweens.add({ targets: ring, scaleX: this.s * 2.2, scaleY: this.s * 1.2, alpha: 0, duration: 700, onComplete: () => ring.destroy() });
  }

  private setExitClosed() {
    if (!this.exitOpenShown) return;
    this.exitOpenShown = false;
    this.exitImg.setTexture('exit-closed');
    this.exitHalo?.setAlpha(0.5);
    const bottom = this.cellBottom(this.grid.exit);
    this.exitLock = this.add.image(this.exitImg.x, bottom - this.exitImg.displayHeight * 0.42, 'exit-lock').setScale(this.s * 0.9).setDepth(bottom + 2).setName('exit-lock');
  }

  // =====================================================================
  // Interface : en-tête compact, indicateurs, barre d'icônes
  // =====================================================================

  private buildHud() {
    const d = 20000;
    const x0 = space.margin, w = W - space.margin * 2;
    const headerH = this.chipsY - 34 - space.gap - space.margin;
    const bar = this.add.graphics().setDepth(d - 1);
    bar.fillStyle(hexOf(color.surface), 0.94);
    bar.fillRoundedRect(x0, space.margin, w, headerH, 44);
    bar.lineStyle(3, hexOf(color.border), 1);
    bar.strokeRoundedRect(x0, space.margin, w, headerH, 44);
    const btnX = x0 + 18 + touch.icon / 2;
    const midY = space.margin + headerH / 2;
    uiButton(this, btnX, midY, 'icon', { icon: 'ic-back', name: 'btn-quit', aria: 'Quitter le niveau', tooltip: 'Quitter le niveau' }, () => this.quit()).setDepth(d);
    if (this.hintsAllowed) uiButton(this, W - btnX, midY, 'icon', { icon: 'ic-hint', name: 'btn-hint', aria: 'Demander un indice', tooltip: 'Indice' }, () => this.hint()).setDepth(d);
    const textW = W - 2 * (btnX + touch.icon / 2 + 12);
    const t1 = label(this, W / 2, space.margin + 28, this.titleText(), font.heading, { weight: 700, wrap: textW }).setOrigin(0.5, 0).setDepth(d).setName('level-title');
    label(this, W / 2, t1.y + t1.height + 10, this.def.objective, font.body, { color: color.inkSoft, weight: 600, wrap: textW }).setOrigin(0.5, 0).setDepth(d).setName('objective');

    this.buildChips();

    // --- barre de commandes : icônes seules, centrée, au-dessus de la zone système ---
    const by = H - space.margin - 18 - touch.barBtn / 2;
    const btns: [string, string, string, () => void][] = [];
    if (this.undoAllowed) btns.push(['btn-undo', 'ic-undo', 'Annuler le coup', () => this.undo()]);
    btns.push(['btn-restart', 'ic-restart', 'Recommencer le niveau', () => this.requestRestart()]);
    btns.push(['btn-pause', 'ic-pause', 'Mettre en pause', () => this.openPause()]);
    const n = btns.length;
    const pillW = n * touch.barBtn + (n - 1) * touch.barGap + 2 * 18;
    const pillH = touch.barBtn + 24;
    this.bottomBar = this.add.container(W / 2, by).setDepth(d);
    const pill = this.add.graphics();
    pill.fillStyle(color.scrim, 0.14);
    pill.fillRoundedRect(-pillW / 2, -pillH / 2 + 8, pillW, pillH, pillH / 2);
    pill.fillStyle(hexOf(color.surface), 0.97);
    pill.fillRoundedRect(-pillW / 2, -pillH / 2, pillW, pillH, pillH / 2);
    pill.lineStyle(3, hexOf(color.border), 1);
    pill.strokeRoundedRect(-pillW / 2, -pillH / 2, pillW, pillH, pillH / 2);
    this.bottomBar.add(pill);
    btns.forEach(([name, icon, text, fn], k) => {
      const bx = -pillW / 2 + 18 + touch.barBtn / 2 + k * (touch.barBtn + touch.barGap);
      const b = uiButton(this, bx, 0, 'bar', { icon, name, aria: text, tooltip: text }, fn);
      this.bottomBar.add(b);
      if (name === 'btn-undo') this.btnUndo = b;
      if (name === 'btn-restart') this.btnRestart = b;
      if (name === 'btn-pause') this.btnPause = b;
    });
  }

  private titleText() {
    return this.req.kind === 'challenge' ? `${this.req.label} · ${this.def.difficulty}` : `${this.def.id} · ${this.def.name}`;
  }

  /** Puces sous l'en-tête : mode, objets, condition de la sortie, déplacements, objectif d'étoiles. */
  private buildChips() {
    this.chipsRow?.destroy();
    const row = this.add.container(0, this.chipsY).setDepth(20000);
    this.chipsRow = row;
    const items: Phaser.GameObjects.Container[] = [];
    const pill = (w: number, fill = color.surface, border = color.border) => {
      const g = this.add.graphics();
      g.fillStyle(hexOf(fill), 0.97);
      g.fillRoundedRect(-w / 2, -34, w, 68, 34);
      g.lineStyle(3, hexOf(border), 1);
      g.strokeRoundedRect(-w / 2, -34, w, 68, 34);
      return g;
    };
    if (this.req.kind === 'challenge') {
      items.push(chip(this, 0, 0, this.ranked ? 'Mode défi · annulation indisponible' : 'Entraînement · annulation permise', this.ranked ? 'primary' : 'accent'));
    }
    if (this.grid.collectibles.length) {
      const n = this.grid.collectibles.length;
      const c = this.add.container(0, 0);
      const w = 120 + n * 58;
      c.add(pill(w));
      this.itemIcons = [];
      this.grid.collectibles.forEach((k, j) => {
        const ic = this.add.image(-w / 2 + 46 + j * 58, -2, k.kind).setScale(k.kind === 'seed' ? 0.56 : 0.52);
        this.itemIcons.push(ic);
        c.add(ic);
      });
      this.itemsText = label(this, w / 2 - 48, 0, `0/${n}`, font.label, { weight: 700 });
      c.add(this.itemsText);
      c.setSize(w, 68);
      items.push(c);
    }
    // condition de sortie
    {
      const cond = this.exitCondition();
      const c = this.add.container(0, 0).setName('exit-condition');
      const t = label(this, 0, 0, cond ?? 'Sortie ouverte', font.label, { weight: 700, color: cond ? color.ink : '#2f6b2a' });
      const w = t.width + 110;
      c.add(pill(w, cond ? color.surface : color.successSoft, cond ? color.border : color.success));
      c.add(this.add.image(-w / 2 + 40, 0, cond ? 'ic-lock' : 'ic-check').setScale(0.4).setTint(cond ? 0x8a6a1c : 0x2f6b2a));
      t.setX(18);
      c.add(t);
      c.setSize(w, 68);
      this.conditionChip = c;
      items.push(c);
    }
    // déplacements
    {
      const c = this.add.container(0, 0);
      this.movesText = label(this, 18, 0, moves(this.moves), font.label, { weight: 700 });
      const w = Math.max(250, this.movesText.width + 100);
      c.add([pill(w), this.add.image(-w / 2 + 40, 0, 'ic-steps').setScale(0.38), this.movesText]);
      this.movesText.setX(18);
      c.setSize(w, 68);
      c.setName('moves-chip');
      items.push(c);
    }
    // objectif 3 étoiles : affiché seulement une fois le niveau réussi (l'optimal est alors révélé)
    if (this.req.kind === 'adventure' && Save.level(this.def.key)?.bestMoves) {
      const t = starsFor(this.def);
      items.push(chip(this, 0, 0, `★★★ ${moves(t.three)}`, 'neutral'));
    }
    // mise en ligne avec retour à la ligne si l'écran est étroit
    const maxW = W - space.margin * 2;
    const lines: Phaser.GameObjects.Container[][] = [[]];
    let lw = 0;
    for (const it of items) {
      const add = it.width + (lines[lines.length - 1].length ? space.sm * 2 : 0);
      if (lw + add > maxW && lines[lines.length - 1].length) { lines.push([]); lw = 0; }
      lines[lines.length - 1].push(it);
      lw += it.width + (lines[lines.length - 1].length > 1 ? space.sm * 2 : 0);
    }
    lines.forEach((ln, li) => {
      const total = ln.reduce((a, c) => a + c.width, 0) + (ln.length - 1) * space.sm * 2;
      let x = W / 2 - total / 2;
      ln.forEach((c) => { c.setPosition(x + c.width / 2, li * 80); row.add(c); x += c.width + space.sm * 2; });
    });
  }

  private refreshHud() {
    const n = countCollected(this.state);
    if (this.itemsText) {
      this.itemsText.setText(`${n}/${this.grid.collectibles.length}`);
      this.itemIcons.forEach((ic, j) => {
        const got = (this.state.collected >> this.grid.collectibles[j].id) & 1;
        ic.setAlpha(got ? 1 : 0.35).setTint(got ? 0xffffff : 0x9aa59a);
      });
    }
    this.btnUndo?.setEnabled(this.history.length > 0 && this.mode !== 'won');
    this.btnRestart.setEnabled(this.mode !== 'won' && this.history.length > 0);
    this.movesText?.setText(moves(this.moves));
    // condition de sortie : on reconstruit la puce si elle change
    const cond = this.exitCondition();
    const shown = (this.conditionChip?.list.find((o) => o.type === 'Text') as Phaser.GameObjects.Text | undefined)?.text;
    if ((cond ?? 'Sortie ouverte') !== shown) {
      this.buildChips();
      if (!cond && this.conditionChip && !reduced()) this.tweens.add({ targets: this.conditionChip, scale: { from: 1.18, to: 1 }, duration: 320, ease: 'Back.easeOut' });
    }
    if (this.exitConditionsMet()) this.setExitOpen(true);
    else this.setExitClosed();
  }

  /** Mise en évidence au début du niveau : « Départ » sur Bourgeon, « Sortie » sur l'arche. */
  private playIntro() {
    const pc = this.center(this.state.pos);
    const ec = this.center(this.grid.exit);
    const tag = (x: number, y: number, text: string, fill: string, name: string) => {
      const t = label(this, 0, 0, text, font.label, { color: '#ffffff', weight: 800 });
      const w = t.width + 44, h = 64;
      const g = this.add.graphics();
      g.fillStyle(hexOf(fill), 1);
      g.fillRoundedRect(-w / 2, -h / 2, w, h, h / 2);
      g.lineStyle(4, 0xffffff, 1);
      g.strokeRoundedRect(-w / 2, -h / 2, w, h, h / 2);
      g.fillTriangle(-12, h / 2 - 2, 12, h / 2 - 2, 0, h / 2 + 14);
      const c = this.add.container(x, Math.max(this.topH - 10, y), [g, t]).setDepth(19000).setName(name);
      return c;
    };
    const first = !Save.introSeen(this.def.key);
    if (first) Save.markIntroSeen(this.def.key);
    if (this.resumed) {
      toast(this, `Partie reprise : ${moves(this.moves)}`, this.toastY, 2200);
      this.maybeControlsTip();
      return;
    }
    const tags = [
      tag(pc.x, pc.y - 150 * this.s, 'Départ', color.primaryDeep, 'tag-start'),
      tag(ec.x, this.cellBottom(this.grid.exit) - this.exitImg.displayHeight - 50 * this.s, 'Sortie', color.accent, 'tag-exit'),
    ];
    const hold = first ? 2600 : 1600;
    if (!reduced()) {
      tags.forEach((t, k) => { t.setAlpha(0).setY(t.y + 16); this.tweens.add({ targets: t, alpha: 1, y: t.y - 16, duration: 260, delay: 120 + k * 160 }); });
      const halo = this.add.image(ec.x, ec.y, 'ring').setDepth(9400).setScale(this.s * 3, this.s * 1.7).setAlpha(0);
      this.tweens.add({ targets: halo, alpha: { from: 0.95, to: 0 }, scaleX: this.s * 1.2, scaleY: this.s * 0.7, duration: 700, delay: 400, onComplete: () => halo.destroy() });
    }
    this.time.delayedCall(hold, () => tags.forEach((t) => (reduced() ? t.destroy() : this.tweens.add({ targets: t, alpha: 0, duration: 300, onComplete: () => t.destroy() }))));
    const start = this.def.hints?.start;
    if (start && first) this.time.delayedCall(500, () => toast(this, start, this.toastY, 3600));
    this.time.delayedCall(first ? 900 : 300, () => this.maybeControlsTip());
    if (this.def.id === 1 && this.req.kind === 'adventure' && first) this.showHand();
  }

  private get toastY() {
    return H - this.bottomH - 60;
  }

  /** Quitter le niveau : le parcours d'aventure est sauvegardé, puis la sélection s'ouvre. */
  private quit() {
    if (this.mode === 'moving') return;
    if (this.req.kind === 'adventure') {
      this.saveRun();
      goTo(this, 'Journey');
    } else goTo(this, 'Challenges');
  }

  private saveRun() {
    if (this.req.kind !== 'adventure' || this.mode === 'won') return;
    Save.saveRun({ key: this.def.key, version: this.def.version, path: this.trail.slice(), undos: this.undos, restarts: this.restarts, updatedAt: new Date().toISOString() });
  }

  // =====================================================================
  // Saisie : glisser depuis Bourgeon, toucher une case voisine, flèches du clavier
  // =====================================================================

  private setupInput() {
    this.input.on('pointerdown', (p: Phaser.Input.Pointer, over: Phaser.GameObjects.GameObject[]) => {
      unlockAudio();
      if (over.length || this.mode !== 'idle' || this.overlay) return;
      const cell = this.cellAt(p.worldX, p.worldY);
      this.down = { x: p.worldX, y: p.worldY, cell, t: this.time.now };
      this.hideHand();
      const pc = this.center(this.state.pos);
      const nearPlayer = Phaser.Math.Distance.Between(p.worldX, p.worldY, pc.x, pc.y - 30 * this.s) < this.L.tw * 0.62;
      if (cell === this.state.pos || nearPlayer) {
        this.mode = 'drag';
        this.path = [];
        this.pathStates = [this.state];
        this.drawPreview();
      }
    });

    this.input.on('pointermove', (p: Phaser.Input.Pointer) => {
      if (this.mode !== 'drag' || !p.isDown) return;
      const cell = this.cellAt(p.worldX, p.worldY);
      if (cell < 0) return;
      const c = this.center(cell);
      // tolérance : on change de case quand le doigt est bien entré dedans
      if (Math.abs(p.worldX - c.x) > this.L.tw * 0.42 || Math.abs(p.worldY - c.y) > this.L.td * 0.42) return;
      this.extendPath(cell);
    });

    const release = (p: Phaser.Input.Pointer) => {
      const d = this.down;
      this.down = null;
      if (this.mode === 'drag') {
        const path = this.path.slice();
        this.clearPreview();
        this.mode = 'idle';
        if (path.length) this.runPath(path);
        return;
      }
      if (this.mode !== 'idle' || !d || this.overlay) return;
      const moved = Phaser.Math.Distance.Between(d.x, d.y, p.worldX, p.worldY);
      const cell = this.cellAt(p.worldX, p.worldY);
      if (moved > this.L.tw * 0.35 || cell !== d.cell || cell < 0) return;
      this.tapCell(cell);
    };
    this.input.on('pointerup', release);
    this.input.on('pointerupoutside', release);

    const kb = this.input.keyboard;
    if (kb) {
      const dirKey = (dx: number, dy: number) => () => {
        if (this.mode !== 'idle' || this.overlay) return;
        const [x, y] = xy(this.grid, this.state.pos);
        const nx = x + dx, ny = y + dy;
        if (nx < 0 || ny < 0 || nx >= this.grid.width || ny >= this.grid.height) return;
        this.hideHand();
        this.tapCell(ny * this.grid.width + nx);
      };
      kb.on('keydown-LEFT', dirKey(-1, 0));
      kb.on('keydown-RIGHT', dirKey(1, 0));
      kb.on('keydown-UP', dirKey(0, -1));
      kb.on('keydown-DOWN', dirKey(0, 1));
      kb.on('keydown-Z', () => this.undo());
      kb.on('keydown-BACKSPACE', () => this.undo());
      kb.on('keydown-R', () => this.requestRestart());
      kb.on('keydown-H', () => this.hint());
      kb.on('keydown-ESC', () => (this.overlay ? this.closeOverlay() : this.openPause()));
      kb.on('keydown-P', () => this.openPause());
    }
  }

  private extendPath(cell: number) {
    if (cell < 0) return;
    const end = this.path.length ? this.path[this.path.length - 1] : this.state.pos;
    if (cell === end) return;
    const prev = this.path.length >= 2 ? this.path[this.path.length - 2] : this.state.pos;
    if (this.path.length && cell === prev) {
      this.path.pop();
      this.pathStates.pop();
      this.drawPreview();
      return;
    }
    const [ex, ey] = xy(this.grid, end);
    const [cx, cy] = xy(this.grid, cell);
    if (ex !== cx && ey !== cy) {
      if (Math.abs(cx - ex) + Math.abs(cy - ey) !== 2) return;
      for (const mid of [ey * this.grid.width + cx, cy * this.grid.width + ex]) {
        const s0 = this.pathStates[this.pathStates.length - 1];
        const r1 = step(this.grid, s0, mid);
        if ('blocked' in r1) continue;
        const r2 = step(this.grid, r1.state, cell);
        if ('blocked' in r2) continue;
        this.path.push(mid, cell);
        this.pathStates.push(r1.state, r2.state);
        this.drawPreview();
        return;
      }
      return;
    }
    const n = Math.abs(cx - ex) + Math.abs(cy - ey);
    const sx = Math.sign(cx - ex), sy = Math.sign(cy - ey);
    for (let k = 1; k <= n; k++) {
      const target = (ey + sy * k) * this.grid.width + (ex + sx * k);
      const s = this.pathStates[this.pathStates.length - 1];
      const r = step(this.grid, s, target);
      if ('blocked' in r) {
        this.flashBlocked(target, r.blocked);
        break;
      }
      this.path.push(target);
      this.pathStates.push(r.state);
      if (r.state.won) break;
    }
    this.drawPreview();
  }

  private drawPreview() {
    const g = this.preview;
    g.clear();
    this.planned.forEach((o) => o.destroy());
    this.planned = [];
    const cells = [this.state.pos, ...this.path];
    const pts = cells.map((i) => this.center(i));
    if (pts.length >= 2) {
      for (let k = 1; k < cells.length; k++) {
        const p = pts[k];
        g.fillStyle(hexOf(color.primary), 0.26);
        g.fillRoundedRect(p.x - this.L.tw * 0.42, p.y - this.L.td * 0.4, this.L.tw * 0.84, this.L.td * 0.8, 22 * this.s);
        g.lineStyle(5 * this.s, 0xffffff, 0.9);
        g.strokeRoundedRect(p.x - this.L.tw * 0.42, p.y - this.L.td * 0.4, this.L.tw * 0.84, this.L.td * 0.8, 22 * this.s);
      }
      g.lineStyle(16 * this.s, 0xffffff, 0.9);
      g.beginPath();
      g.moveTo(pts[0].x, pts[0].y);
      pts.slice(1).forEach((p) => g.lineTo(p.x, p.y));
      g.strokePath();
      g.lineStyle(8 * this.s, hexOf(color.primary), 1);
      g.beginPath();
      g.moveTo(pts[0].x, pts[0].y);
      pts.slice(1).forEach((p) => g.lineTo(p.x, p.y));
      g.strokePath();
      for (let k = 1; k < pts.length; k++) {
        const a = pts[k - 1], b = pts[k];
        const ang = (Math.atan2(b.y - a.y, b.x - a.x) * 180) / Math.PI + 90;
        this.planned.push(this.add.image(b.x, b.y, 'chevron').setDepth(9002).setScale(this.s * (k === pts.length - 1 ? 1 : 0.8)).setAngle(ang));
      }
      const last = pts[pts.length - 1];
      this.previewTarget.setPosition(last.x, last.y).setVisible(true);
    } else {
      const p = pts[0];
      g.lineStyle(6 * this.s, hexOf(color.primary), 0.9);
      g.strokeEllipse(p.x, p.y, this.L.tw * 0.8, this.L.td * 0.62);
      this.previewTarget.setVisible(false);
    }
  }

  private clearPreview() {
    this.preview.clear();
    this.planned.forEach((o) => o.destroy());
    this.planned = [];
    this.previewTarget.setVisible(false);
  }

  /** Retour visuel quand le tracé bute sur une case bloquée (sans répétition). */
  private flashBlocked(cell: number, reason: BlockReason) {
    if (reason === 'not-adjacent' || reason === 'won' || reason === 'out') return;
    if (this.time.now - this.lastRejectAt < 450) return;
    this.lastRejectAt = this.time.now;
    const c = this.center(cell);
    const x = this.add.image(c.x, c.y - 10 * this.s, 'cross').setDepth(9003).setScale(this.s * 0.9);
    this.tweens.add({ targets: x, alpha: 0, scale: this.s * 1.1, duration: 420, delay: 120, onComplete: () => x.destroy() });
    if (reason === 'exit-locked' && this.exitLock && !reduced()) this.tweens.add({ targets: this.exitLock, angle: { from: -12, to: 12 }, duration: 70, yoyo: true, repeat: 2, onComplete: () => this.exitLock?.setAngle(0) });
  }

  private tapCell(cell: number) {
    if (cell === this.state.pos) {
      this.player.bump(0, -1);
      return;
    }
    const reason = blockReason(this.grid, this.state, cell);
    if (reason === 'not-adjacent') {
      toast(this, 'Touche une case voisine, ou glisse depuis Bourgeon', this.toastY, 2000);
      return;
    }
    if (reason) {
      this.rejectMove(cell, reason);
      return;
    }
    this.runPath([cell]);
  }

  private rejectMove(cell: number, reason: BlockReason) {
    const a = this.center(this.state.pos);
    const b = this.center(cell);
    this.player.bump(Math.sign(b.x - a.x), Math.sign(b.y - a.y));
    Sfx.bump();
    let msg = REASON_TEXT[reason];
    if (reason === 'exit-locked') msg = `Sortie fermée : ${(this.exitCondition() ?? '').toLowerCase()}`;
    if (msg) toast(this, msg, this.toastY, 2200);
    if (reason === 'closed') {
      const h = this.gone.get(cell);
      if (h && !reduced()) this.tweens.add({ targets: h, alpha: { from: 0.5, to: 1 }, duration: 90, yoyo: true, repeat: 1 });
    }
    this.flashBlocked(cell, reason);
  }

  // =====================================================================
  // Déplacements (un état d'historique par case)
  // =====================================================================

  private runPath(path: number[]) {
    this.hideStuck();
    this.clearHintMarks();
    this.queue = path.slice();
    this.mode = 'moving';
    this.hideChevrons();
    this.nextStep();
  }

  private nextStep() {
    if (this.mode !== 'moving') return;
    const to = this.queue.shift();
    if (to === undefined) {
      this.mode = 'idle';
      this.player.startIdle();
      this.refreshHud();
      this.refreshChevrons();
      this.saveRun();
      this.checkBlocked();
      return;
    }
    const r = step(this.grid, this.state, to);
    if ('blocked' in r) {
      this.queue = [];
      this.mode = 'idle';
      this.refreshHud();
      this.refreshChevrons();
      return;
    }
    const ev = r.events;
    this.history.push(this.state);
    this.state = r.state;
    this.trail.push(to);
    const dest = this.center(to);
    const dur = reduced() ? 120 : STEP_MS;
    Sfx.step();
    this.cellRing.setPosition(dest.x, dest.y);
    this.player.walkTo(
      dest.x, dest.y + 6 * this.s, dur,
      () => {
        if (ev.closedCell !== null) this.markGone(ev.closedCell, true);
        this.moveFollowers(ev.from, to, dur);
      },
      () => this.afterStep(ev),
    );
  }

  private afterStep(ev: StepEvents) {
    let delay = 0;
    if (ev.collected) {
      this.collect(ev.collected);
      delay = 220;
    }
    if (ev.switchActivated && ev.bridgesOpened) delay = Math.max(delay, this.activateSwitch());
    if (ev.doorsOpened) delay = Math.max(delay, this.openDoors());
    this.refreshHud();
    if (ev.won) {
      this.queue = [];
      this.win();
      return;
    }
    if (ev.stuck) this.queue = [];
    if (delay && this.queue.length) this.time.delayedCall(reduced() ? 0 : delay, () => this.nextStep());
    else this.nextStep();
  }

  /** La case quittée disparaît : dalle effondrée (plate, distincte des obstacles). */
  private markGone(cell: number, animate: boolean) {
    if (this.gone.has(cell)) return;
    const c = this.center(cell);
    const img = this.add.image(c.x, c.y, 'tile-gone').setScale(this.s, this.s * this.sy).setDepth(1.4).setName(`gone-${cell}`);
    this.gone.set(cell, img);
    if (!animate || reduced()) {
      if (animate) Sfx.grow();
      return;
    }
    img.setAlpha(0);
    this.tweens.add({ targets: img, alpha: 1, duration: 300, ease: 'Quad.easeOut' });
    Sfx.grow();
    for (let k = 0; k < 5; k++) {
      const pb = this.add.image(c.x + (k - 2) * 18 * this.s, c.y, 'dust').setDepth(1.5).setScale(this.s * 0.9).setAlpha(0.8);
      this.tweens.add({ targets: pb, y: c.y + 26 * this.s, alpha: 0, duration: 420 + k * 40, ease: 'Quad.easeIn', onComplete: () => pb.destroy() });
    }
  }

  private moveFollowers(from: number, to: number, dur: number) {
    const a = this.center(from), b = this.center(to);
    this.followers.forEach((f, k) => {
      const t = 0.62 - k * 0.2;
      const tx = a.x + (b.x - a.x) * t + (k % 2 ? 14 : -14) * this.s;
      const ty = a.y + (b.y - a.y) * t + 14 * this.s;
      if (b.x !== a.x) f.img.setFlipX(b.x < a.x);
      this.tweens.add({ targets: f.img, x: tx, y: ty, duration: dur * 1.15, delay: 60 + k * 70, ease: 'Sine.easeInOut' });
    });
  }

  private collect(c: CollectibleDef) {
    const img = this.items.get(c.id)!;
    this.itemTweens.get(c.id)?.stop();
    Sfx.pickup();
    if (c.kind === 'duckling') this.time.delayedCall(120, () => Sfx.quack());
    this.sparkleBurst(img.x, img.y - 30 * this.s, 6);
    this.itemRings.find((r) => r.name === `ring-${c.id}`)?.setVisible(false);
    const glow = this.children.getByName(`seed-glow-${c.id}`) as Phaser.GameObjects.Image | null;
    if (c.kind === 'seed') {
      glow?.setVisible(false);
      const door = this.grid.cells.indexOf(Cell.Door);
      const dc = door >= 0 ? this.center(door) : this.center(this.grid.exit);
      img.setDepth(9600);
      this.tweens.add({ targets: img, x: dc.x, y: dc.y - 60 * this.s, scale: this.s * 0.6, duration: reduced() ? 10 : 650, ease: 'Cubic.easeInOut', onComplete: () => img.setVisible(false) });
      return;
    }
    this.followers.push({ id: c.id, img });
    if (!reduced()) this.tweens.add({ targets: img, y: img.y - 30 * this.s, duration: 160, yoyo: true, ease: 'Quad.easeOut' });
  }

  private activateSwitch(): number {
    const sw = this.switchImg!;
    sw.setTexture('lever-on');
    if (!reduced()) this.tweens.add({ targets: sw, scaleY: sw.scaleY * 0.9, duration: 90, yoyo: true });
    Sfx.switch();
    if (!reduced() && this.planks.length) {
      const target = this.planks[this.planks.length - 1];
      for (let k = 0; k < 7; k++) {
        const sp = this.add.image(sw.x, sw.y - 40 * this.s, 'sparkle').setDepth(9600).setScale(this.s * 0.7);
        this.tweens.add({ targets: sp, x: target.x, y: target.y, alpha: { from: 1, to: 0.2 }, duration: 520, delay: 60 + k * 45, ease: 'Sine.easeInOut', onComplete: () => sp.destroy() });
      }
    }
    const per = reduced() ? 0 : 110;
    this.bridgeGhosts.forEach((g) => g.setVisible(false));
    this.ropes.forEach((r) => this.tweens.add({ targets: r, scale: 0, alpha: 0, duration: 200 }));
    this.planks.forEach((p, k) => {
      const ty = p.getData('baseY') as number;
      p.setVisible(true);
      if (reduced()) return;
      p.setAlpha(0).setY(ty + 30 * this.s).setScale(this.s * 0.3, this.s * 0.95);
      this.tweens.add({ targets: p, alpha: 1, y: ty, scaleX: this.s * 0.86, duration: 260, delay: 250 + k * per, ease: 'Back.easeOut', onStart: () => Sfx.plank(k) });
    });
    return reduced() ? 0 : 250 + this.planks.length * per + 200;
  }

  private openDoors(): number {
    Sfx.magic();
    const v = this.vines;
    if (v) {
      if (reduced()) v.setVisible(false);
      else this.tweens.add({ targets: v, scaleY: 0, alpha: 0, duration: 700, delay: 500, ease: 'Back.easeIn' });
    }
    this.bloom.forEach((f, k) => {
      if (reduced()) f.setScale(this.s);
      else this.tweens.add({ targets: f, scale: this.s, duration: 500, delay: 300 + k * 22, ease: 'Back.easeOut' });
    });
    toast(this, 'L’arche florale est ouverte. Elle ne disparaîtra pas.', this.toastY, 2800);
    return reduced() ? 0 : 900;
  }

  private sparkleBurst(x: number, y: number, n: number) {
    if (reduced()) return;
    for (let k = 0; k < n; k++) {
      const sp = this.add.image(x, y, 'sparkle').setDepth(9700).setScale(this.s * 0.7);
      const a = (k / n) * Math.PI * 2;
      this.tweens.add({ targets: sp, x: x + Math.cos(a) * 50 * this.s, y: y + Math.sin(a) * 40 * this.s, scale: 0, duration: 520, ease: 'Quad.easeOut', onComplete: () => sp.destroy() });
    }
  }

  // =====================================================================
  // Blocage : seulement s'il ne reste aucun coup, ou si l'échec est prouvé par le solveur
  // =====================================================================

  private checkBlocked() {
    if (this.mode !== 'idle' || this.state.won) return;
    const none = validMoves(this.grid, this.state).length === 0;
    if (none) return void this.onStuck('no-move');
    const v = verdict(this.grid, this.state, 150_000);
    if (v === 'lose') this.onStuck(stuckReason(this.grid, this.state));
    // « unknown » : recherche interrompue par la limite de calcul → on n'affiche rien
  }

  private onStuck(kind: ReturnType<typeof stuckReason>) {
    Sfx.stuck();
    this.player.lookAround();
    this.time.delayedCall(reduced() ? 0 : 900, () => {
      if (this.mode !== 'idle' || this.state.won) return;
      this.player.sad();
      this.showStuck(kind);
      this.time.delayedCall(1600, () => this.player.recover());
    });
  }

  private stuckText(kind: ReturnType<typeof stuckReason>): string {
    const missing = this.grid.collectibles.filter((c) => !((this.state.collected >> c.id) & 1));
    const what = missing.some((c) => c.kind === 'seed') ? 'La graine n’est plus accessible.' : missing.length > 1 ? 'Un caneton n’est plus accessible.' : 'Le caneton n’est plus accessible.';
    switch (kind) {
      case 'no-move': return 'Aucune case accessible autour de toi.';
      case 'item-unreachable': return what;
      case 'exit-unreachable': return 'La sortie n’est plus accessible.';
      default: return 'Tu peux encore bouger, mais plus aucun parcours ne mène à la sortie.';
    }
  }

  private showStuck(kind: ReturnType<typeof stuckReason>) {
    this.hideStuck();
    const d = 26000;
    const x = space.margin, w = W - space.margin * 2, pad = space.pad + 12;
    const c = this.add.container(0, 0).setDepth(d).setData('kind', kind).setName('stuck-panel');
    const bg = this.add.graphics();
    c.add(bg);
    const parts: Phaser.GameObjects.GameObject[] = [];
    let y = 0;
    const title = label(this, W / 2, y, 'Tu es bloqué.', font.heading + 4, { weight: 700 }).setOrigin(0.5, 0);
    y += title.height + 14;
    const reason = label(this, W / 2, y, this.stuckText(kind), font.body, { color: color.inkSoft, weight: 600, wrap: w - pad * 2 }).setOrigin(0.5, 0).setName('stuck-reason');
    y += reason.height + 30;
    parts.push(title, reason);
    if (!this.undoAllowed) {
      const t = label(this, W / 2, y, 'Annulation indisponible dans ce mode', font.caption + 2, { color: color.inkSoft, weight: 700 }).setOrigin(0.5, 0);
      parts.push(t);
      y += t.height + 24;
    }
    const bw = w - pad * 2;
    if (this.undoAllowed) {
      // priorité à « Annuler le coup » ; les commandes du bas sont masquées (pas de doublon)
      parts.push(uiButton(this, W / 2, y + touch.primaryH / 2, 'primary', { label: 'Annuler le coup', icon: 'ic-undo', width: bw, name: 'stuck-undo' }, () => this.undo()));
      y += touch.primaryH + space.gap;
      parts.push(uiButton(this, W / 2, y + touch.secondaryH / 2, 'secondary', { label: 'Recommencer', icon: 'ic-restart', width: bw, name: 'stuck-restart' }, () => this.restart()));
      y += touch.secondaryH;
    } else {
      parts.push(uiButton(this, W / 2, y + touch.primaryH / 2, 'primary', { label: 'Recommencer', icon: 'ic-restart', width: bw, name: 'stuck-restart' }, () => this.restart()));
      y += touch.primaryH;
    }
    const h = y + pad * 2 + 10;
    const top = H - space.margin - 18 - h;
    parts.forEach((o) => { (o as unknown as Phaser.GameObjects.Components.Transform).y += top + pad + 6; c.add(o); });
    bg.fillStyle(color.scrim, 0.14);
    bg.fillRoundedRect(x, top + 8, w, h, 54);
    bg.fillStyle(hexOf(color.surface), 0.99);
    bg.fillRoundedRect(x, top, w, h, 54);
    bg.lineStyle(5, hexOf(color.primary), 1);
    bg.strokeRoundedRect(x, top, w, h, 54);
    this.bottomBar.setVisible(false);
    this.stuckUi = c;
    if (!reduced()) {
      c.setY(60).setAlpha(0);
      this.tweens.add({ targets: c, y: 0, alpha: 1, duration: 260, ease: 'Quad.easeOut' });
    }
  }

  private hideStuck() {
    this.stuckUi?.destroy();
    this.stuckUi = undefined;
    this.bottomBar?.setVisible(this.mode !== 'won');
  }

  // =====================================================================
  // Annuler le coup / Recommencer
  // =====================================================================

  undo() {
    if (this.mode !== 'idle' || !this.history.length || !this.undoAllowed || this.overlay) return;
    this.undos++;
    this.hideStuck();
    this.clearHintMarks();
    const prev = this.history.pop()!;
    this.trail.pop();
    Sfx.undo();
    this.applyState(prev, true);
    this.saveRun();
  }

  /** Recommencer : confirmation compacte s'il y a déjà au moins un déplacement. */
  requestRestart() {
    if (this.mode !== 'idle' && this.mode !== 'paused') return;
    if (this.history.length === 0 || this.overlay) return;
    this.confirmRestart();
  }

  restart() {
    if (this.mode !== 'idle' && this.mode !== 'paused') return;
    if (this.history.length === 0) return;
    this.restarts++;
    this.hideStuck();
    this.closeOverlay();
    this.clearHintMarks();
    this.history = [];
    this.trail = [];
    this.hintStage = 0;
    Sfx.undo();
    this.applyState(initialState(this.grid), true);
    if (this.req.kind === 'adventure') Save.saveRun(null);
  }

  /** Reconstruit tous les visuels pour correspondre exactement à l'état donné. */
  private applyState(s: GameState, fade: boolean) {
    this.tweens.killTweensOf(this.player);
    this.state = s;
    for (const [cell, img] of this.gone) {
      if (!s.closed[cell]) {
        this.gone.delete(cell);
        if (reduced() || !fade) img.destroy();
        else this.tweens.add({ targets: img, alpha: 0, duration: 200, onComplete: () => img.destroy() });
      }
    }
    s.closed.forEach((v, cell) => { if (v) this.markGone(cell, false); });
    this.followers = [];
    for (const c of this.grid.collectibles) {
      const img = this.items.get(c.id)!;
      const got = (s.collected >> c.id) & 1;
      this.tweens.killTweensOf(img);
      const glow = this.children.getByName(`seed-glow-${c.id}`) as Phaser.GameObjects.Image | null;
      this.itemRings.find((r) => r.name === `ring-${c.id}`)?.setVisible(!got);
      if (got) {
        if (c.kind === 'seed') img.setVisible(false);
        else this.followers.push({ id: c.id, img });
      } else {
        const p = this.center(c.y * this.grid.width + c.x);
        img.setVisible(true).setPosition(p.x, p.y + 10 * this.s).setScale(this.s * (c.kind === 'seed' ? 1.05 : 0.95)).setDepth(p.y + 10 * this.s).setFlipX(false);
        glow?.setVisible(true);
        this.idleItem(c.id, img);
      }
    }
    this.switchImg?.setTexture(s.bridgesOpen ? 'lever-on' : 'lever-off');
    this.planks.forEach((p) => { this.tweens.killTweensOf(p); p.setVisible(s.bridgesOpen).setAlpha(1).setScale(this.s * 0.86, this.s * 0.95); p.setY(p.getData('baseY') ?? p.y); });
    this.ropes.forEach((r) => { this.tweens.killTweensOf(r); r.setScale(s.bridgesOpen ? 0 : this.s).setAlpha(s.bridgesOpen ? 0 : 1); });
    this.bridgeGhosts.forEach((g) => g.setVisible(!s.bridgesOpen));
    if (this.vines) {
      this.tweens.killTweensOf(this.vines);
      this.vines.setVisible(!s.doorsOpen).setAlpha(1).setScale(this.s * 0.8);
    }
    this.bloom.forEach((f) => { this.tweens.killTweensOf(f); f.setScale(s.doorsOpen ? this.s : 0); });
    const pc = this.center(s.pos);
    this.player.setPosition(pc.x, pc.y + 6 * this.s);
    this.cellRing.setPosition(pc.x, pc.y);
    this.player.recover();
    if (fade && !reduced()) {
      this.player.setAlpha(0.3);
      this.tweens.add({ targets: this.player, alpha: 1, duration: 200 });
    }
    this.followers.forEach((f, k) => f.img.setPosition(pc.x + (k % 2 ? 26 : -26) * this.s, pc.y + (16 + k * 10) * this.s));
    this.mode = 'idle';
    this.refreshHud();
    this.refreshChevrons();
    if (!fade && this.history.length) this.checkBlocked();
  }

  // =====================================================================
  // Fenêtres : confirmation, aide des commandes, indices
  // =====================================================================

  private openOverlay(h: number, build: (c: Phaser.GameObjects.Container, top: number) => void, name: string) {
    this.closeOverlay();
    const c = this.add.container(0, 0).setDepth(32000).setName(name);
    const scrim = this.add.rectangle(W / 2, H / 2, W, H, color.scrim, 0.38).setInteractive();
    c.add(scrim);
    const top = Math.round((H - h) / 2);
    c.add(cardBg(this, space.margin + 20, top, W - space.margin * 2 - 40, h, { border: color.border }));
    build(c, top);
    this.overlay = c;
    this.hideChevrons();
    if (!reduced()) {
      c.setAlpha(0);
      this.tweens.add({ targets: c, alpha: 1, duration: 160 });
    }
  }

  closeOverlay() {
    this.overlay?.destroy();
    this.overlay = undefined;
    if (this.mode === 'idle') this.refreshChevrons();
  }

  private confirmRestart() {
    const bw = (W - 2 * (space.margin + 20 + space.pad) - space.gap) / 2;
    this.openOverlay(470, (c, top) => {
      c.add(label(this, W / 2, top + 84, 'Recommencer ce niveau ?', font.heading + 4, { weight: 700 }));
      c.add(label(this, W / 2, top + 168, 'Ton parcours actuel sera effacé.', font.body, { color: color.inkSoft, weight: 600 }));
      const by = top + 470 - space.pad - touch.primaryH / 2 - 16;
      const lx = space.margin + 20 + space.pad + bw / 2;
      c.add(uiButton(this, lx, by, 'secondary', { label: 'Continuer à jouer', width: bw, name: 'confirm-cancel' }, () => this.closeOverlay()));
      c.add(uiButton(this, W - lx, by, 'primary', { label: 'Recommencer', width: bw, name: 'confirm-restart' }, () => this.restart()));
    }, 'confirm-restart-panel');
  }

  /** Présentation des commandes (première partie) — aussi consultable depuis Pause. */
  showControlsHelp() {
    const rows: [string, string, string][] = [];
    if (this.undoAllowed) rows.push(['ic-undo', 'Annuler le coup', 'Revient d’un déplacement, avec ses effets.']);
    else rows.push(['ic-undo', 'Annulation indisponible', 'Ce mode ne permet pas d’annuler.']);
    rows.push(['ic-restart', 'Recommencer', 'Repart du début de ce niveau.']);
    rows.push(['ic-pause', 'Pause', this.hintsAllowed ? 'Options, aide et indices.' : 'Options et aide.']);
    if (this.hintsAllowed) rows.push(['ic-hint', 'Indice', 'Une aide progressive, si tu la demandes.']);
    const rowH = 176;
    const h = 220 + rows.length * rowH + touch.primaryH;
    this.openOverlay(h, (c, top) => {
      c.add(label(this, W / 2, top + 76, 'Les commandes', font.heading + 4, { weight: 700 }));
      rows.forEach(([ic, name, text], k) => {
        const y = top + 200 + k * rowH;
        const x = space.margin + 20 + space.pad + 60;
        const g = this.add.graphics();
        g.fillStyle(hexOf(color.surfaceAlt), 1);
        g.fillCircle(x, y, 58);
        c.add(g);
        c.add(this.add.image(x, y, ic).setScale(touch.barGlyph / 96));
        c.add(label(this, x + 96, y - 34, name, font.body + 2, { weight: 700, align: 'left' }));
        c.add(label(this, x + 96, y - 6, text, font.caption + 1, { color: color.inkSoft, weight: 600, align: 'left', wrap: W - x - 230 }).setOrigin(0, 0));
      });
      c.add(uiButton(this, W / 2, top + h - space.pad - touch.primaryH / 2 - 10, 'primary', { label: 'Compris', width: 520, name: 'help-close' }, () => this.closeOverlay()));
    }, 'help-panel');
  }

  private maybeControlsTip() {
    if (Save.tipSeen('controls')) return;
    Save.markTipSeen('controls');
    this.showControlsHelp();
  }

  /** Indice progressif : 1) idée du niveau, 2) prochaine case, 3) trois prochains déplacements. */
  hint() {
    if (!this.hintsAllowed || this.mode !== 'idle' || this.overlay) return;
    this.clearHintMarks();
    const stage = Math.min(3, this.hintStage + 1);
    this.hintStage = stage;
    let text = '';
    let cells: number[] = [];
    if (stage === 1) {
      text = this.def.hints?.idea ?? 'Repère d’abord ce que tu dois récupérer, puis garde un passage vers la sortie.';
    } else {
      const v = verdict(this.grid, this.state, 200_000);
      if (v === 'lose') {
        let back = 0;
        for (let k = this.history.length - 1; k >= 0; k--) {
          back++;
          if (verdict(this.grid, this.history[k], 120_000) === 'win') break;
        }
        text = `Ce parcours ne peut plus aboutir. Annule ${back} coup${back > 1 ? 's' : ''} pour revenir à une position gagnante.`;
      } else if (v === 'unknown') {
        text = 'Difficile à dire d’ici. Garde un passage vers la sortie et vers ce qu’il reste à récupérer.';
      } else {
        const p = shortestFrom(this.grid, this.state).path ?? [];
        cells = p.slice(0, stage === 2 ? 1 : 3);
        text = stage === 2 ? 'Essaie la case indiquée.' : `Voici les ${cells.length} prochains déplacements d’un parcours gagnant.`;
      }
    }
    if (cells.length) this.showHintCells(cells);
    // carte d'indice posée sous l'en-tête, hauteur selon le texte (le plateau reste visible)
    const top = this.chipsY - 30;
    const c = this.add.container(0, 0).setDepth(25000).setName('hint-card');
    const body = label(this, space.margin + space.pad + 20, top + 110, text, font.body, { color: color.ink, weight: 600, align: 'left', wrap: W - space.margin * 2 - space.pad * 2 - 40 }).setOrigin(0, 0).setName('hint-text');
    const h = 110 + body.height + 30 + touch.secondaryH + space.pad;
    c.add(cardBg(this, space.margin, top, W - space.margin * 2, h, { border: color.accent, borderW: 4 }));
    c.add(this.add.image(space.margin + 70, top + 60, 'ic-hint').setScale(0.6).setTint(hexOf(color.accent)));
    c.add(label(this, space.margin + 120, top + 60, `Indice ${stage}/3`, font.body + 2, { weight: 700, align: 'left' }));
    c.add(body);
    const bw = 330;
    const by = top + h - space.pad - touch.secondaryH / 2;
    c.add(uiButton(this, W - space.margin - space.pad - bw / 2, by, 'secondary', { label: 'Compris', width: bw, name: 'hint-close' }, () => this.clearHintMarks()));
    if (stage < 3) c.add(uiButton(this, W - space.margin - space.pad - bw * 1.5 - space.gap, by, 'secondary', { label: 'Indice suivant', width: bw, name: 'hint-next' }, () => this.hint()));
    this.hintMarks.push(c);
  }

  private showHintCells(cells: number[]) {
    cells.forEach((cell, k) => {
      const p = this.center(cell);
      const ring = this.add.image(p.x, p.y, 'cell-ring').setScale(this.s, this.s * this.sy).setDepth(8600).setTint(hexOf(color.accent)).setName(`hint-cell-${k}`);
      const num = label(this, p.x, p.y, String(k + 1), font.heading, { weight: 800, color: '#ffffff', display: true }).setDepth(8601);
      num.setStroke(color.accent, 10);
      this.hintMarks.push(ring, num);
      if (!reduced()) this.tweens.add({ targets: ring, alpha: 0.45, duration: 600, yoyo: true, repeat: -1 });
    });
  }

  private clearHintMarks() {
    this.hintMarks.forEach((o) => o.destroy());
    this.hintMarks = [];
  }

  // =====================================================================
  // Aides visuelles : cases accessibles (forme, pas seulement couleur)
  // =====================================================================

  private refreshChevrons() {
    this.hideChevrons();
    if (this.mode !== 'idle' || this.state.won || this.overlay) return;
    const [px, py] = xy(this.grid, this.state.pos);
    for (const n of validMoves(this.grid, this.state)) {
      const [nx, ny] = xy(this.grid, n);
      const c = this.center(n);
      const ang = nx > px ? 90 : nx < px ? -90 : ny > py ? 180 : 0;
      const ch = this.add.image(c.x, c.y, 'chevron').setDepth(8500).setScale(this.s * 0.9).setAngle(ang).setAlpha(0.85);
      if (!reduced()) this.tweens.add({ targets: ch, alpha: 0.35, scale: this.s * 0.75, duration: 700, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
      this.chevrons.push(ch);
    }
  }

  private hideChevrons() {
    this.chevrons.forEach((c) => c.destroy());
    this.chevrons = [];
  }

  private showHand() {
    if (this.solution.length < 3) return;
    const pts = [this.state.pos, ...this.solution.slice(0, 3)].map((i) => this.center(i));
    this.hand = this.add.image(pts[0].x + 20, pts[0].y + 30, 'hand').setOrigin(0.3, 0.1).setDepth(9800).setScale(0.9);
    if (reduced()) return;
    const loop = () => {
      if (!this.hand) return;
      this.hand.setPosition(pts[0].x + 20, pts[0].y + 30).setAlpha(0);
      this.tweens.chain({
        targets: this.hand,
        tweens: [
          { alpha: 1, duration: 300 },
          { scale: 0.8, duration: 160 },
          ...pts.slice(1).map((p) => ({ x: p.x + 20, y: p.y + 30, duration: 380, ease: 'Sine.easeInOut' })),
          { scale: 0.9, alpha: 0, duration: 300 },
        ],
        onComplete: () => this.time.delayedCall(500, loop),
      });
    };
    loop();
  }

  private hideHand() {
    if (!this.hand) return;
    this.tweens.killTweensOf(this.hand);
    this.hand.destroy();
    this.hand = undefined;
  }

  // =====================================================================
  // Victoire
  // =====================================================================

  private win() {
    this.mode = 'won';
    this.hideChevrons();
    this.clearHintMarks();
    this.closeOverlay();
    this.refreshHud();
    const ex = this.center(this.grid.exit);
    this.player.setDepth(this.cellBottom(this.grid.exit) + 5);
    this.tweens.add({ targets: this.player, y: ex.y + this.L.td * 0.32, duration: 200 });
    this.player.joy();
    Sfx.win();
    let adv: AdventureOutcome | null = null;
    let chal: { result: ReturnType<typeof makeResult>; rewards: string[]; prevBest: number | null } | null = null;
    if (this.req.kind === 'adventure') adv = recordAdventureWin(this.def, this.trail);
    else {
      const prev = Save.record(this.def.key, this.def.version);
      const result = makeResult(this.def, { contextId: this.req.contextId, mode: this.req.ranked ? 'ranked' : 'practice', path: this.trail, undos: this.undos, restarts: this.restarts });
      const rewards = recordChallengeWin(result, this.def.difficulty);
      chal = { result, rewards, prevBest: prev?.bestMoves ?? null };
    }
    if (this.def.exitStyle === 'beacon' || this.def.exitStyle === 'house') {
      const glow = this.add.image(ex.x, ex.y - this.exitImg.displayHeight * 0.4, 'glow').setDepth(this.exitImg.depth + 1).setScale(this.s * 3).setAlpha(0);
      this.tweens.add({ targets: glow, alpha: 0.8, duration: 500, yoyo: true, hold: 600 });
    }
    if (this.def.exitStyle === 'beacon') this.bloom.forEach((f, k) => (reduced() ? f.setScale(this.s) : this.tweens.add({ targets: f, scale: this.s, duration: 500, delay: 600 + k * 30, ease: 'Back.easeOut' })));
    this.followers.forEach((f, k) => {
      const tx = ex.x + (k ? 1 : -1) * 46 * this.s;
      const ty = ex.y + this.L.td * 0.36;
      f.img.setDepth(this.player.depth + 1);
      this.tweens.add({ targets: f.img, x: tx, y: ty, duration: 400, delay: 150 * k });
    });
    this.sparkleBurst(ex.x, ex.y - 60 * this.s, 10);
    if (!reduced()) {
      for (let k = 0; k < 22; k++) {
        const p = this.add.image(ex.x, ex.y - 60 * this.s, k % 2 ? 'petal' : 'petal-y').setDepth(9900).setScale(1.3);
        this.tweens.add({
          targets: p, x: ex.x + (Math.random() - 0.5) * 700, y: ex.y - 300 - Math.random() * 300, angle: 400, duration: 700, ease: 'Quad.easeOut',
          onComplete: () => this.tweens.add({ targets: p, y: p.y + 600, alpha: 0, duration: 1600, ease: 'Sine.easeIn', onComplete: () => p.destroy() }),
        });
      }
    }
    if (adv?.chapterCompleted) {
      const chapterId = adv.chapterCompleted;
      const rewards = adv.rewards;
      this.time.delayedCall(reduced() ? 600 : 2600, () => goTo(this, 'ChapterEnd', { chapterId, rewards }));
      return;
    }
    this.time.delayedCall(reduced() ? 300 : 1300, () => (adv ? this.showAdventurePanel(adv) : this.showChallengePanel(chal!)));
  }

  /** Feuille de résultat compacte, du côté opposé à la sortie : le plateau reste visible. */
  private panelShell(ph: number) {
    this.bottomBar.setVisible(false);
    const exitLow = this.center(this.grid.exit).y > H * 0.55;
    const top = exitLow ? space.margin : H - ph - space.margin;
    const c = this.add.container(0, 0).setDepth(30000).setName('result-panel');
    c.add(cardBg(this, space.margin, top, W - space.margin * 2, ph, { border: color.primary, borderW: 5, alpha: 0.985 }));
    if (!reduced()) {
      c.setY(exitLow ? -ph : ph).setAlpha(0);
      this.tweens.add({ targets: c, y: 0, alpha: 1, duration: 320, ease: 'Cubic.easeOut' });
    }
    return { c, top };
  }

  private starsRow(c: Phaser.GameObjects.Container, cx: number, y: number, n: number) {
    for (let k = 0; k < 3; k++) {
      const sc = k === 1 ? 0.72 : 0.6;
      const st = this.add.image(cx + (k - 1) * 104, y + (k === 1 ? -6 : 0), k < n ? 'star-full' : 'star-empty').setScale(sc).setName(`star-${k}`);
      c.add(st);
      if (k < n && !reduced()) {
        st.setScale(0);
        this.tweens.add({ targets: st, scale: sc, duration: 300, delay: 200 + k * 220, ease: 'Back.easeOut', onStart: () => Sfx.star(k) });
      }
    }
  }

  private rewardChip(c: Phaser.GameObjects.Container, ids: string[], y: number) {
    if (!ids.length) return;
    const names = ids.map((id) => rewardById(id)?.name ?? id).join(' · ');
    const first = rewardById(ids[0]);
    const t = label(this, 0, y, `Nouveau : ${names}`, font.label, { weight: 700, color: color.primaryDeep });
    const iconW = first ? 80 : 0;
    const w = Math.min(W - space.margin * 2 - 60, t.width + iconW + 70);
    const g = this.add.graphics();
    g.fillStyle(hexOf('#fff1d6'), 1);
    g.fillRoundedRect(W / 2 - w / 2, y - 40, w, 80, 40);
    c.add(g);
    if (first) c.add(this.add.image(W / 2 - w / 2 + 60, y, first.icon).setScale(first.slot === 'badge' ? 0.36 : 0.48));
    t.setX(W / 2 + iconW / 2);
    c.add(t);
  }

  /** Lignes empilées d'une feuille de résultat (hauteurs réelles : pas de chevauchement). */
  private stackLines(lines: [string, number, string, number, string][], left: number, wrap: number) {
    let y = 0;
    const out: Phaser.GameObjects.Text[] = [];
    for (const [text, size, col, weight, name] of lines) {
      const t = label(this, left, y, text, size, { color: col, weight, align: 'left', wrap }).setOrigin(0, 0).setName(name);
      out.push(t);
      y += t.height + 12;
    }
    return { out, h: y };
  }

  private showAdventurePanel(o: AdventureOutcome) {
    const pad = space.pad + 12;
    const left = space.margin + pad;
    const wrap = W - 2 * left;
    const t = o.thresholds;
    const optimal = this.moves <= t.three;
    const lines: [string, number, string, number, string][] = [
      [`Ton parcours : ${moves(this.moves)}`, font.body + 3, color.ink, 700, 'result-moves'],
      [o.newBest && !o.firstWin ? `Ton record : ${moves(o.bestMoves)} · nouveau record !` : `Ton record : ${moves(o.bestMoves)}`, font.body, color.inkSoft, 600, 'result-record'],
      [optimal ? 'Parcours optimal !' : `Objectif 3 étoiles : ${moves(t.three)}`, font.body + 1, optimal ? '#2f6b2a' : color.primaryDeep, 800, 'result-goal'],
      [t.two > t.three ? `★★★ jusqu’à ${t.three} · ★★ jusqu’à ${t.two} · ★ niveau réussi` : `Tous les parcours gagnants font ${t.three} déplacements : ★★★ dès la réussite`, font.caption + 1, color.inkSoft, 700, 'result-criteria'],
    ];
    const st = this.stackLines(lines, left, wrap);
    const rewardH = o.rewards.length ? 100 : 0;
    const ph = 130 + st.h + rewardH + space.gap + touch.primaryH + pad;
    const { c, top } = this.panelShell(ph);
    c.add(label(this, left, top + 70, 'Niveau réussi !', font.title + 4, { weight: 700, align: 'left' }));
    this.starsRow(c, W - space.margin - pad - 150, top + 70, o.stars);
    st.out.forEach((tx) => { tx.y += top + 130; c.add(tx); });
    if (o.rewards.length) this.rewardChip(c, o.rewards, top + 130 + st.h + 44);
    const by = top + ph - pad - touch.primaryH / 2;
    const sw = 320;
    c.add(uiButton(this, left + sw / 2, by, 'secondary', { label: 'Rejouer', icon: 'ic-restart', width: sw, name: 'btn-replay' }, () => goTo(this, 'Game', { kind: 'adventure', key: this.def.key })));
    const primaryW = wrap - sw - space.gap;
    const px0 = W - left - primaryW / 2;
    if (o.nextKey) c.add(uiButton(this, px0, by, 'primary', { label: 'Niveau suivant', width: primaryW, name: 'btn-next' }, () => goTo(this, 'Game', { kind: 'adventure', key: o.nextKey! })));
    else c.add(uiButton(this, px0, by, 'primary', { label: 'Retour à l’aventure', width: primaryW, name: 'btn-next' }, () => goTo(this, 'Journey')));
  }

  private showChallengePanel(r: { result: ReturnType<typeof makeResult>; rewards: string[]; prevBest: number | null }) {
    const res = r.result;
    const pad = space.pad + 12;
    const left = space.margin + pad;
    const wrap = W - 2 * left;
    const record = r.prevBest !== null && res.moves < r.prevBest;
    const opt = optimalMoves(this.def);
    const best = Math.min(res.moves, r.prevBest ?? Infinity);
    const lines: [string, number, string, number, string][] = [
      [`Ton parcours : ${moves(res.moves)}`, font.body + 3, color.ink, 700, 'result-moves'],
      [`Ton meilleur résultat : ${moves(best)} (sur cet appareil)`, font.body, color.inkSoft, 600, 'result-record'],
      [res.moves <= opt ? 'Parcours optimal !' : `Meilleur parcours possible : ${moves(opt)}`, font.body + 1, res.moves <= opt ? '#2f6b2a' : color.primaryDeep, 800, 'result-goal'],
      [res.mode === 'ranked' ? (res.validated ? 'Mode défi : résultat vérifié et enregistré' : 'Résultat non retenu') : 'Entraînement : résultat non comptabilisé', font.caption + 1, color.inkSoft, 700, 'result-mode'],
    ];
    const st = this.stackLines(lines, left, wrap);
    const rewardH = r.rewards.length ? 100 : 0;
    const ph = 130 + st.h + rewardH + space.gap + touch.secondaryH + space.gap + touch.primaryH + pad;
    const { c, top } = this.panelShell(ph);
    c.add(label(this, left, top + 70, record ? 'Nouveau record !' : 'Défi réussi !', font.title + 4, { weight: 700, align: 'left' }));
    st.out.forEach((tx) => { tx.y += top + 130; c.add(tx); });
    if (r.rewards.length) this.rewardChip(c, r.rewards, top + 130 + st.h + 44);
    const by = top + ph - pad - touch.primaryH / 2;
    const by2 = by - touch.primaryH / 2 - space.gap - touch.secondaryH / 2;
    const half = (wrap - space.gap) / 2;
    c.add(uiButton(this, left + half / 2, by2, 'secondary', { label: 'Partager le défi', icon: 'ic-share', width: half, name: 'btn-share' }, () => this.shareResult(res.moves)));
    c.add(uiButton(this, W - left - half / 2, by2, 'secondary', { label: 'Rejouer', icon: 'ic-restart', width: half, name: 'btn-replay' }, () => goTo(this, 'Game', this.req)));
    c.add(uiButton(this, W / 2, by, 'primary', { label: 'Retour aux défis', width: wrap, name: 'btn-next' }, () => goTo(this, 'Challenges')));
  }

  /** Partager le défi : partage du système si disponible, sinon copie du lien (même puzzle, mêmes règles). */
  private shareResult(n: number) {
    const link = challengeLink(this.def.key, this.def.version);
    const text = resultText(this.def.name, n, optimalMoves(this.def), link);
    const done = () => toast(this, 'Lien copié : colle-le dans un message', H / 2, 2400, 31000);
    const fail = () => toast(this, link, H / 2, 6000, 31000);
    const copy = () => { try { navigator.clipboard.writeText(text).then(done, fail); } catch { fail(); } };
    const nav = navigator as Navigator & { share?: (d: ShareData) => Promise<void> };
    if (nav.share && !new URLSearchParams(location.search).has('e2e')) nav.share({ title: 'MAZEO', text, url: link }).catch(copy);
    else copy();
  }

  // =====================================================================
  // Pause
  // =====================================================================

  openPause() {
    if (this.mode === 'moving' || this.mode === 'won' || this.mode === 'drag') return;
    this.closeOverlay();
    this.hideChevrons();
    this.scene.launch('Pause', { from: 'Game', canRestart: this.history.length > 0, hints: this.hintsAllowed });
    this.scene.pause();
  }

  /** Appelé par la scène Pause. */
  resumeFromPause(action: 'resume' | 'restart' | 'quit' | 'hint' | 'help') {
    this.scene.resume();
    if (action === 'restart') this.requestRestart();
    else if (action === 'quit') this.quit();
    else if (action === 'hint') this.hint();
    else if (action === 'help') this.showControlsHelp();
    else this.refreshChevrons();
  }

  update() {
    if (this.player && this.mode !== 'won') this.player.setDepth(this.player.y + 2);
    this.followers.forEach((f) => { if (this.mode !== 'won') f.img.setDepth(f.img.y + 1); });
  }
}

// Constantes réexportées pour l'API de test
export { BD };
