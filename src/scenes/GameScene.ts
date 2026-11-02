import Phaser from 'phaser';
import { boardLayout, drawBoard, type BoardLayout } from '../art/board';
import { C, hex } from '../art/palette';
import { BD, BT, HEDGE_BASE, HEDGE_H } from '../art/textures';
import { Sfx, unlockAudio, syncAmbience } from '../audio/sfx';
import { parseLevel, xy } from '../core/grid';
import { allMask, blockReason, countCollected, initialState, step, validMoves } from '../core/rules';
import { solve } from '../core/solver';
import { Cell, type BlockReason, type CollectibleDef, type GameState, type Grid, type LevelDef, type StepEvents } from '../core/types';
import { LEVELS } from '../levels';
import { Save } from '../save';
import { button, fadeIn, goTo, H, paintPageBackground, reduced, toast, toggle, txt, W, type Button } from '../ui/ui';
import { Player } from './Player';

type Mode = 'idle' | 'drag' | 'moving' | 'won' | 'paused';

const TOP_UI = 300;
const BOTTOM_UI = 300;
const STEP_MS = 210;

const REASON_TEXT: Partial<Record<BlockReason, string>> = {
  closed: 'Une haie a poussé ici : impossible de repasser',
  'bridge-closed': 'Le pont est replié… Trouve l’interrupteur !',
  'door-closed': 'L’arche est fermée par des ronces',
  wall: '',
  water: 'Bourgeon ne sait pas nager !',
};

export class GameScene extends Phaser.Scene {
  def!: LevelDef;
  grid!: Grid;
  state!: GameState;
  private history: GameState[] = [];
  private usedUndo = false;
  private usedRestart = false;
  private mode: Mode = 'idle';
  /** Lecture seule (tests). */
  get currentMode() {
    return this.mode;
  }
  get historySize() {
    return this.history.length;
  }
  private L!: BoardLayout;
  private ox = 0;
  private oy = 0;
  private s = 1;
  private player!: Player;
  private walls: Phaser.GameObjects.Image[] = [];
  private hedges = new Map<number, Phaser.GameObjects.Image>();
  private items = new Map<number, Phaser.GameObjects.Image>();
  private itemTweens = new Map<number, Phaser.Tweens.Tween>();
  private followers: { id: number; img: Phaser.GameObjects.Image }[] = [];
  private switchImg?: Phaser.GameObjects.Image;
  private planks: Phaser.GameObjects.Image[] = [];
  private ropes: Phaser.GameObjects.Image[] = [];
  private vines?: Phaser.GameObjects.Image;
  private exitImg!: Phaser.GameObjects.Image;
  private exitBadge?: Phaser.GameObjects.Container;
  private bloom: Phaser.GameObjects.Image[] = [];
  private preview!: Phaser.GameObjects.Graphics;
  private previewDots: Phaser.GameObjects.Image[] = [];
  private previewTarget!: Phaser.GameObjects.Image;
  private chevrons: Phaser.GameObjects.Image[] = [];
  private path: number[] = [];
  private pathStates: GameState[] = [];
  private queue: number[] = [];
  private down: { x: number; y: number; cell: number; t: number } | null = null;
  private counterText?: Phaser.GameObjects.Text;
  private counterIcons: Phaser.GameObjects.Image[] = [];
  private btnUndo!: Button;
  private btnRestart!: Button;
  private soundBtnIcon!: Phaser.GameObjects.Image;
  private hand?: Phaser.GameObjects.Image;
  private grewOnce = false;
  private overlay?: Phaser.GameObjects.Container;
  private solution: number[] = [];

  constructor() {
    super('Game');
  }

  init(data: { level?: number }) {
    const n = Phaser.Math.Clamp(data.level ?? 1, 1, LEVELS.length);
    this.def = LEVELS[n - 1];
    this.grid = parseLevel(this.def);
    this.state = initialState(this.grid);
    this.history = [];
    this.usedUndo = false;
    this.usedRestart = false;
    this.mode = 'idle';
    this.hedges = new Map();
    this.items = new Map();
    this.itemTweens = new Map();
    this.followers = [];
    this.walls = [];
    this.planks = [];
    this.ropes = [];
    this.bloom = [];
    this.previewDots = [];
    this.chevrons = [];
    this.path = [];
    this.pathStates = [];
    this.queue = [];
    this.down = null;
    this.grewOnce = false;
    this.overlay = undefined;
    this.vines = undefined;
    this.switchImg = undefined;
    this.counterIcons = [];
    this.solution = solve(this.grid).shortest ?? [];
  }

  create() {
    this.input.enabled = true;
    fadeIn(this);
    this.buildBackground();
    this.buildBoard();
    this.buildHud();
    this.refreshHud();
    this.refreshChevrons();
    this.setupInput();
    this.showStartHint();
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
  // Construction de la scène
  // =====================================================================

  private buildBackground() {
    paintPageBackground();
    for (let i = 0; i < 2; i++) {
      const cl = this.add.image(150 + i * 650, 330 + i * (H - 700), 'cloud').setAlpha(0.5).setDepth(-900).setScale(0.8);
      if (!reduced()) this.tweens.add({ targets: cl, x: cl.x + 160, duration: 30000, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
    }
  }

  private buildBoard() {
    const g = this.grid;
    const overflowTop = 0.75; // arbres / maison dépassant au-dessus de la 1re rangée
    const availW = W - 64;
    const availH = H - TOP_UI - BOTTOM_UI;
    const tw = Math.floor(Math.min(availW / (g.width + 0.76), availH / (g.height * 0.825 + 0.76 + 0.42 + overflowTop), 176));
    this.L = boardLayout(g, tw);
    this.s = tw / BT;
    const boardH = this.L.height + overflowTop * tw;
    const bx = Math.round((W - this.L.width) / 2);
    const by = Math.round(TOP_UI + (availH - boardH) / 2 + overflowTop * tw);
    this.ox = bx + this.L.pad;
    this.oy = by + this.L.pad;

    const key = `board-${this.def.id}`;
    if (this.textures.exists(key)) this.textures.remove(key);
    this.textures.addCanvas(key, drawBoard(g, this.def.theme, this.L, this.def.id * 97));
    const board = this.add.image(bx, by, key).setOrigin(0).setDepth(0);
    if (!reduced()) {
      board.setAlpha(0);
      this.tweens.add({ targets: board, alpha: 1, duration: 300 });
    }

    const s = this.s;
    let wallVariant = 0;
    g.cells.forEach((cell, i) => {
      const c = this.center(i);
      const bottom = this.cellBottom(i);
      if (cell === Cell.Wall) {
        const d = g.decor[i]!;
        let img: Phaser.GameObjects.Image;
        if (d === 'tree') img = this.add.image(c.x, c.y, 'tree').setOrigin(0.5, (300 - BD / 2 - 6) / 300);
        else if (d === 'hedge') img = this.add.image(c.x, bottom, `hedge${wallVariant++ % 3}`).setOrigin(0.5, HEDGE_BASE / HEDGE_H);
        else img = this.add.image(c.x, bottom, d).setOrigin(0.5, HEDGE_BASE / HEDGE_H);
        img.setScale(s).setDepth(bottom);
        if (d === 'tree' || d === 'flowers' || d === 'bush') this.sway(img, d === 'tree' ? 1.2 : 1.6);
        this.walls.push(img);
      } else if (cell === Cell.Water) {
        if (!reduced() && (i * 7) % 3 !== 0) {
          const sh = this.add.image(c.x + ((i * 13) % 30) - 15, c.y + ((i * 7) % 20) - 10, 'shine').setScale(s).setDepth(1).setAlpha(0);
          this.tweens.add({ targets: sh, alpha: 0.9, x: sh.x + 14 * s, duration: 1400 + (i % 5) * 300, yoyo: true, repeat: -1, delay: (i % 7) * 260, ease: 'Sine.easeInOut' });
        }
        if (this.def.theme === 'pond' && i % 2 === 0) {
          const lily = this.add.image(c.x + (i % 3 - 1) * 18 * s, c.y, 'lily').setScale(s).setDepth(1);
          if (!reduced()) this.tweens.add({ targets: lily, angle: { from: -6, to: 6 }, y: lily.y + 3, duration: 2600, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
        }
      } else if (cell === Cell.Switch) {
        this.switchImg = this.add.image(c.x, c.y + 4 * s, 'switch-off').setScale(s * 0.95).setDepth(2);
      } else if (cell === Cell.Collectible) {
        const def = g.collectibles.find((k) => k.y * g.width + k.x === i)!;
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
        this.vines = this.add.image(c.x, bottom - 6 * s, 'vines').setOrigin(0.5, 1).setScale(s * 0.8).setDepth(bottom + 2);
      } else if (cell === Cell.Exit) {
        const tex = { house: 'house', 'mother-duck': 'mother-duck', gate: 'gate', burrow: 'burrow' }[this.def.exitStyle];
        const sc = this.def.exitStyle === 'house' ? 0.86 : this.def.exitStyle === 'mother-duck' ? 0.82 : 0.84;
        this.exitImg = this.add.image(c.x, bottom - 4 * s, tex).setOrigin(0.5, 1).setScale(s * sc).setDepth(bottom);
        if (this.def.exitStyle === 'mother-duck' && !reduced()) this.tweens.add({ targets: this.exitImg, scaleY: this.exitImg.scaleY * 1.03, duration: 1600, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
      }
    });

    // Plantes qui fleurissent avec la graine (niveau 5)
    if (g.collectibles.some((k) => k.kind === 'seed')) {
      g.cells.forEach((cell, i) => {
        if (cell !== Cell.Wall || g.decor[i] === 'rock') return;
        const c = this.center(i);
        const keys = ['bloom-a', 'bloom-b', 'bloom-c'];
        for (let k = 0; k < 2; k++) {
          const f = this.add.image(c.x + (k ? 26 : -24) * s + ((i * 7) % 12) - 6, c.y - (k ? 52 : 34) * s, keys[(i + k) % 3])
            .setScale(0).setDepth(this.cellBottom(i) + 1);
          this.bloom.push(f);
        }
      });
    }

    // Personnage
    const pc = this.center(g.start);
    this.player = new Player(this, pc.x, pc.y + 6 * s, s * 0.88);
    this.player.setDepth(pc.y + 7 * s);

    // Prévisualisation du trajet
    this.preview = this.add.graphics().setDepth(9000);
    this.previewTarget = this.add.image(0, 0, 'target').setScale(s).setDepth(9001).setVisible(false);

    this.addButterflies();
    this.updateExitBadge();
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
    for (let k = 0; k < n; k++) {
      const y = c.y - this.L.td / 2 + (k + 0.5) * (this.L.td / n);
      const p = this.add.image(c.x, y, 'plank').setScale(s * 0.86, s * 0.95).setDepth(2).setVisible(false);
      p.setData('row', xy(this.grid, i)[1] * n + k);
      p.setData('baseY', y);
      this.planks.push(p);
    }
    // poteaux aux extrémités du pont (côté berge)
    const [x, y] = xy(this.grid, i);
    const above = y > 0 ? this.grid.cells[(y - 1) * this.grid.width + x] : null;
    const below = y < this.grid.height - 1 ? this.grid.cells[(y + 1) * this.grid.width + x] : null;
    const ends: number[] = [];
    if (above !== Cell.Bridge) ends.push(c.y - this.L.td / 2);
    if (below !== Cell.Bridge) ends.push(c.y + this.L.td / 2);
    for (const ey of ends) {
      for (const side of [-1, 1]) {
        this.add.image(c.x + side * this.L.tw * 0.42, ey + 6 * s, 'post').setOrigin(0.5, 1).setScale(s).setDepth(ey + 6 * s);
      }
      if (below !== Cell.Bridge && ey > c.y) {
        const rope = this.add.image(c.x, ey + 14 * s, 'rope-coil').setScale(s).setDepth(ey + 2);
        this.ropes.push(rope);
      }
    }
    this.planks.sort((a, b) => b.getData('row') - a.getData('row'));
  }

  private addButterflies() {
    if (reduced()) return;
    for (let i = 0; i < 2; i++) {
      const bf = this.add.container(this.ox + Math.random() * this.L.width * 0.7, this.oy + Math.random() * 400).setDepth(8000).setScale(this.s * 0.9);
      const w1 = this.add.image(-2, 0, 'wing').setOrigin(1, 0.9);
      const w2 = this.add.image(2, 0, 'wing').setOrigin(1, 0.9).setFlipX(true).setOrigin(0, 0.9);
      const body = this.add.ellipse(0, 4, 6, 20, 0x5a4636);
      bf.add([w1, w2, body]);
      this.tweens.add({ targets: [w1, w2], scaleX: 0.25, duration: 140, yoyo: true, repeat: -1 });
      const wander = () => {
        const tx = this.ox - 40 + Math.random() * (this.L.width + 20);
        const ty = this.oy - 80 + Math.random() * (this.grid.height * this.L.td + 60);
        this.tweens.add({ targets: bf, x: tx, y: ty, duration: 3500 + Math.random() * 2500, ease: 'Sine.easeInOut', onComplete: wander });
      };
      wander();
    }
  }

  // =====================================================================
  // Interface (HUD)
  // =====================================================================

  private buildHud() {
    const d = 20000;
    // bandeau supérieur discret
    const top = this.add.graphics().setDepth(d - 1);
    top.fillStyle(0xfffbf0, 0.82);
    top.fillRoundedRect(90, 36, W - 180, 190, 48);
    top.lineStyle(3, hex(C.creamDark), 1);
    top.strokeRoundedRect(90, 36, W - 180, 190, 48);
    txt(this, W / 2, 88, `Niveau ${this.def.id} · ${this.def.name}`, 46, { weight: 700 }).setDepth(d);
    txt(this, W / 2, 146, this.def.objective, 33, { color: C.inkSoft, weight: 500, wrap: 760 }).setDepth(d);

    if (this.grid.collectibles.length) {
      const chip = this.add.image(W / 2, 214, 'chip').setDepth(d).setScale(1.05, 1);
      void chip;
      const n = this.grid.collectibles.length;
      const kinds = this.grid.collectibles.map((c) => c.kind);
      const startX = W / 2 - 60 - (n - 1) * 28;
      kinds.forEach((k, j) => {
        const ic = this.add.image(startX + j * 56, 210, k).setScale(k === 'seed' ? 0.62 : 0.6).setDepth(d + 1);
        this.counterIcons.push(ic);
      });
      this.counterText = txt(this, W / 2 + 58, 210, `0/${n}`, 40, { weight: 700 }).setDepth(d + 1);
    }

    // bouton son (haut droite)
    const snd = button(this, W - 74, 92, 'btn-small', { icon: Save.settings().sound ? 'icon-sound-on' : 'icon-sound-off', iconScale: 0.8 }, () => {
      Save.setSetting('sound', !Save.settings().sound);
      syncAmbience();
      this.soundBtnIcon.setTexture(Save.settings().sound ? 'icon-sound-on' : 'icon-sound-off');
    }, 'btn-sound');
    snd.setDepth(d).setScale(0.82);
    this.soundBtnIcon = snd.list[1] as Phaser.GameObjects.Image;

    // boutons du bas : Annuler · Recommencer · Pause
    const by = H - 170;
    const mk = (x: number, icon: string, label: string, fn: () => void, name: string) => {
      const b = button(this, x, by, 'btn-round', { icon, iconScale: 1.05 }, fn, name).setDepth(d);
      txt(this, x, by + 100, label, 30, { color: C.ink, weight: 600 }).setDepth(d);
      return b;
    };
    this.btnUndo = mk(W / 2 - 280, 'icon-undo', 'Annuler', () => this.undo(), 'btn-undo');
    this.btnRestart = mk(W / 2, 'icon-restart', 'Recommencer', () => this.restart(), 'btn-restart');
    mk(W / 2 + 280, 'icon-pause', 'Pause', () => this.openPause(), 'btn-pause');
  }

  private refreshHud() {
    const n = countCollected(this.state);
    if (this.counterText) {
      this.counterText.setText(`${n}/${this.grid.collectibles.length}`);
      this.counterIcons.forEach((ic, j) => {
        const got = (this.state.collected >> this.grid.collectibles[j].id) & 1;
        ic.setAlpha(got ? 1 : 0.35).setTint(got ? 0xffffff : 0x9aa59a);
      });
    }
    this.btnUndo.setEnabled(this.history.length > 0 && this.mode !== 'won');
    this.btnRestart.setEnabled(this.mode !== 'won');
    this.updateExitBadge();
  }

  private updateExitBadge() {
    this.exitBadge?.destroy();
    this.exitBadge = undefined;
    const n = this.grid.collectibles.length;
    if (!n || this.state.collected === allMask(this.grid) || this.state.won) return;
    const ex = this.center(this.grid.exit);
    const y = this.cellBottom(this.grid.exit) - (this.exitImg.displayHeight + 10 * this.s);
    const g = this.add.graphics();
    g.fillStyle(0xfffbf0, 0.95);
    g.fillRoundedRect(-62, -30, 124, 60, 30);
    g.lineStyle(3, hex(C.orange));
    g.strokeRoundedRect(-62, -30, 124, 60, 30);
    g.fillTriangle(-10, 28, 10, 28, 0, 42);
    const lock = this.add.image(-30, 0, 'icon-lock').setScale(0.5);
    const t = txt(this, 18, 0, `${countCollected(this.state)}/${n}`, 32, { weight: 700 });
    this.exitBadge = this.add.container(ex.x, Math.max(y, this.oy - 40), [g, lock, t]).setDepth(9500).setScale(Math.min(1, this.s * 1.1));
  }

  // =====================================================================
  // Entrées : glisser depuis le personnage, ou toucher une case voisine
  // =====================================================================

  private setupInput() {
    this.input.on('pointerdown', (p: Phaser.Input.Pointer, over: Phaser.GameObjects.GameObject[]) => {
      unlockAudio();
      if (over.length || this.mode !== 'idle') return;
      const cell = this.cellAt(p.worldX, p.worldY);
      this.down = { x: p.worldX, y: p.worldY, cell, t: this.time.now };
      this.hideHand();
      // On commence un tracé seulement si on touche Bourgeon (ou sa case).
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
      this.extendPath(this.cellAt(p.worldX, p.worldY));
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
      if (this.mode !== 'idle' || !d) return;
      // Toucher simple : uniquement si le doigt n'a presque pas bougé (évite les déplacements accidentels).
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
        if (this.mode !== 'idle') return;
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
      kb.on('keydown-R', () => this.restart());
      kb.on('keydown-ESC', () => (this.mode === 'paused' ? this.closePause() : this.openPause()));
    }
  }

  private extendPath(cell: number) {
    if (cell < 0) return;
    const end = this.path.length ? this.path[this.path.length - 1] : this.state.pos;
    if (cell === end) return;
    // retour en arrière dans le tracé : on raccourcit
    const prev = this.path.length >= 2 ? this.path[this.path.length - 2] : this.state.pos;
    if (this.path.length && cell === prev) {
      this.path.pop();
      this.pathStates.pop();
      this.drawPreview();
      return;
    }
    // si le doigt a sauté plusieurs cases en ligne droite, on les parcourt une à une
    const [ex, ey] = xy(this.grid, end);
    const [cx, cy] = xy(this.grid, cell);
    if (ex !== cx && ey !== cy) return;
    const n = Math.abs(cx - ex) + Math.abs(cy - ey);
    const sx = Math.sign(cx - ex), sy = Math.sign(cy - ey);
    for (let k = 1; k <= n; k++) {
      const target = (ey + sy * k) * this.grid.width + (ex + sx * k);
      const s = this.pathStates[this.pathStates.length - 1];
      const r = step(this.grid, s, target);
      if ('blocked' in r) break;
      this.path.push(target);
      this.pathStates.push(r.state);
      if (r.state.won) break;
    }
    this.drawPreview();
  }

  private drawPreview() {
    const g = this.preview;
    g.clear();
    this.previewDots.forEach((d) => d.destroy());
    this.previewDots = [];
    const pts = [this.state.pos, ...this.path].map((i) => this.center(i));
    if (pts.length >= 2) {
      g.lineStyle(20 * this.s, 0xffffff, 0.9);
      g.beginPath();
      g.moveTo(pts[0].x, pts[0].y);
      pts.slice(1).forEach((p) => g.lineTo(p.x, p.y));
      g.strokePath();
      g.lineStyle(10 * this.s, hex(C.orange), 1);
      g.beginPath();
      g.moveTo(pts[0].x, pts[0].y);
      pts.slice(1).forEach((p) => g.lineTo(p.x, p.y));
      g.strokePath();
      pts.slice(1, -1).forEach((p) => this.previewDots.push(this.add.image(p.x, p.y, 'step-dot').setScale(this.s * 0.9).setDepth(9001)));
      const last = pts[pts.length - 1];
      this.previewTarget.setPosition(last.x, last.y).setVisible(true);
    } else {
      // halo autour du personnage pour montrer que le tracé est actif
      const p = pts[0];
      g.lineStyle(6 * this.s, hex(C.orange), 0.9);
      g.strokeEllipse(p.x, p.y, this.L.tw * 0.8, this.L.td * 0.62);
      this.previewTarget.setVisible(false);
    }
  }

  private clearPreview() {
    this.preview.clear();
    this.previewDots.forEach((d) => d.destroy());
    this.previewDots = [];
    this.previewTarget.setVisible(false);
  }

  private tapCell(cell: number) {
    if (cell === this.state.pos) {
      this.player.bump(0, -1);
      return;
    }
    const reason = blockReason(this.grid, this.state, cell);
    if (reason === 'not-adjacent') {
      toast(this, 'Touche une case voisine, ou glisse depuis Bourgeon', H - 330, 2000);
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
    if (reason === 'exit-locked') msg = this.def.hints?.blockedExit ?? 'Il manque encore quelque chose…';
    if (msg) toast(this, msg, H - 330, 2200);
    if (reason === 'closed') {
      const h = this.hedges.get(cell);
      if (h && !reduced()) this.tweens.add({ targets: h, angle: { from: -4, to: 4 }, duration: 60, yoyo: true, repeat: 2, onComplete: () => h.setAngle(0) });
    }
    if (reason === 'exit-locked' && this.exitBadge && !reduced()) this.tweens.add({ targets: this.exitBadge, scale: this.exitBadge.scale * 1.25, duration: 120, yoyo: true });
  }

  // =====================================================================
  // Déplacements
  // =====================================================================

  private runPath(path: number[]) {
    this.history.push(this.state);
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
      return;
    }
    const r = step(this.grid, this.state, to);
    if ('blocked' in r) {
      // ne devrait pas arriver (le tracé est simulé), sécurité
      this.queue = [];
      this.mode = 'idle';
      this.refreshHud();
      this.refreshChevrons();
      return;
    }
    const ev = r.events;
    this.state = r.state;
    const dest = this.center(to);
    const dur = reduced() ? 120 : STEP_MS;
    Sfx.step();
    this.player.walkTo(
      dest.x, dest.y + 6 * this.s, dur,
      () => {
        if (ev.closedCell !== null) this.growHedge(ev.closedCell, true);
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
    if (ev.stuck) {
      this.queue = [];
      this.mode = 'idle';
      this.time.delayedCall(250, () => this.onStuck());
      this.refreshHud();
      return;
    }
    if (delay && this.queue.length) this.time.delayedCall(reduced() ? 0 : delay, () => this.nextStep());
    else this.nextStep();
  }

  private growHedge(cell: number, animate: boolean) {
    if (this.hedges.has(cell)) return;
    const c = this.center(cell);
    const bottom = this.cellBottom(cell);
    const img = this.add.image(c.x, bottom, `young${cell % 2}`).setOrigin(0.5, HEDGE_BASE / HEDGE_H).setDepth(bottom).setScale(this.s);
    this.hedges.set(cell, img);
    if (!animate || reduced()) {
      if (animate) Sfx.grow();
      return;
    }
    img.setScale(this.s * 0.4, 0);
    this.tweens.add({ targets: img, scaleY: this.s, scaleX: this.s, duration: 420, ease: 'Back.easeOut' });
    Sfx.grow();
    // feuilles et poussière
    for (let k = 0; k < 7; k++) {
      const lf = this.add.image(c.x, c.y, k % 3 ? 'leafy' : 'leafp').setDepth(bottom + 1).setScale(this.s).setAngle(Math.random() * 360);
      const a = (k / 7) * Math.PI * 2;
      this.tweens.add({
        targets: lf, x: c.x + Math.cos(a) * 60 * this.s, y: c.y - 50 * this.s + Math.sin(a) * 30 * this.s, angle: lf.angle + 200,
        alpha: 0, duration: 600 + k * 30, ease: 'Quad.easeOut', onComplete: () => lf.destroy(),
      });
    }
    const dust = this.add.image(c.x, c.y + 10 * this.s, 'dust').setDepth(bottom - 1).setScale(this.s * 2);
    this.tweens.add({ targets: dust, scale: this.s * 4, alpha: 0, duration: 500, onComplete: () => dust.destroy() });
    this.player.startle(!this.grewOnce);
    if (!this.grewOnce) {
      this.grewOnce = true;
      if (this.def.hints?.firstMove) this.time.delayedCall(350, () => toast(this, this.def.hints!.firstMove!, H - 330, 3200));
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
      if (!reduced()) this.tweens.add({ targets: f.img, scaleY: f.img.scaleX * 0.85, duration: dur / 2, yoyo: true, delay: 60 + k * 70 });
    });
  }

  private collect(c: CollectibleDef) {
    const img = this.items.get(c.id)!;
    this.itemTweens.get(c.id)?.stop();
    Sfx.pickup();
    if (c.kind === 'duckling') this.time.delayedCall(120, () => Sfx.quack());
    this.sparkleBurst(img.x, img.y - 30 * this.s, 6);
    const glow = this.children.getByName(`seed-glow-${c.id}`) as Phaser.GameObjects.Image | null;
    if (c.kind === 'seed') {
      glow?.setVisible(false);
      // la graine s'envole vers l'arche (traînée magique)
      const door = this.grid.cells.indexOf(Cell.Door);
      const dc = door >= 0 ? this.center(door) : this.center(this.grid.exit);
      img.setDepth(9600);
      this.tweens.add({ targets: img, x: dc.x, y: dc.y - 60 * this.s, scale: this.s * 0.6, duration: reduced() ? 10 : 650, ease: 'Cubic.easeInOut', onComplete: () => img.setVisible(false) });
      if (!reduced()) {
        for (let k = 0; k < 8; k++) {
          const sp = this.add.image(img.x, img.y, 'sparkle').setDepth(9599).setScale(this.s * 0.6);
          this.tweens.add({ targets: sp, x: dc.x + (Math.random() - 0.5) * 40, y: dc.y - 60 * this.s, alpha: 0, duration: 700, delay: k * 50, onComplete: () => sp.destroy() });
        }
      }
      return;
    }
    // animal : petit saut de joie puis suit Bourgeon
    this.followers.push({ id: c.id, img });
    if (!reduced()) this.tweens.add({ targets: img, y: img.y - 30 * this.s, duration: 160, yoyo: true, ease: 'Quad.easeOut' });
    this.pulse(this.counterText);
  }

  private activateSwitch(): number {
    const sw = this.switchImg!;
    sw.setTexture('switch-on');
    Sfx.switch();
    const ring = this.add.image(sw.x, sw.y, 'ring').setDepth(3).setScale(this.s * 0.3, this.s * 0.15);
    this.tweens.add({ targets: ring, scaleX: this.s * 1.6, scaleY: this.s * 0.8, alpha: 0, duration: 600, onComplete: () => ring.destroy() });
    const glow = this.add.image(sw.x, sw.y, 'glow-teal').setDepth(3).setScale(this.s);
    this.tweens.add({ targets: glow, alpha: 0, duration: 900, onComplete: () => glow.destroy() });
    // déploiement du pont planche par planche
    const per = reduced() ? 0 : 110;
    this.ropes.forEach((r) => this.tweens.add({ targets: r, scale: 0, alpha: 0, duration: 200 }));
    this.planks.forEach((p, k) => {
      const ty = p.getData('baseY') as number;
      p.setVisible(true);
      if (reduced()) return;
      p.setAlpha(0).setY(ty + 30 * this.s).setScale(this.s * 0.3, this.s * 0.95);
      this.tweens.add({
        targets: p, alpha: 1, y: ty, scaleX: this.s * 0.86, duration: 260, delay: 250 + k * per, ease: 'Back.easeOut',
        onStart: () => Sfx.plank(k),
      });
    });
    return reduced() ? 0 : 250 + this.planks.length * per + 200;
  }

  private openDoors(): number {
    Sfx.magic();
    const v = this.vines;
    if (v) {
      if (reduced()) v.setVisible(false);
      else {
        this.tweens.add({ targets: v, scaleY: 0, alpha: 0, duration: 700, delay: 500, ease: 'Back.easeIn' });
        for (let k = 0; k < 10; k++) {
          const lf = this.add.image(v.x + (Math.random() - 0.5) * 80 * this.s, v.y - Math.random() * 100 * this.s, 'leafp').setDepth(v.depth + 1).setScale(this.s);
          this.tweens.add({ targets: lf, y: lf.y + 60 * this.s, x: lf.x + (Math.random() - 0.5) * 120 * this.s, angle: 300, alpha: 0, duration: 900, delay: 500 + k * 30, onComplete: () => lf.destroy() });
        }
      }
    }
    // le jardin se transforme : fleurs et étincelles sur tous les massifs
    this.bloom.forEach((f, k) => {
      if (reduced()) f.setScale(this.s);
      else {
        this.tweens.add({ targets: f, scale: this.s, duration: 500, delay: 300 + k * 22, ease: 'Back.easeOut' });
        if (k % 3 === 0) this.time.delayedCall(300 + k * 22, () => this.sparkleBurst(f.x, f.y, 3));
      }
    });
    if (!reduced()) {
      this.walls.forEach((w, k) => this.tweens.add({ targets: w, scaleY: w.scaleY * 1.06, duration: 220, yoyo: true, delay: 200 + k * 15 }));
      this.cameras.main.flash(500, 255, 250, 225);
    }
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

  private pulse(t?: Phaser.GameObjects.Text) {
    if (!t || reduced()) return;
    this.tweens.add({ targets: t, scale: 1.35, duration: 140, yoyo: true, ease: 'Quad.easeOut' });
  }

  private onStuck() {
    this.player.sad();
    Sfx.stuck();
    toast(this, this.def.hints?.stuck ?? 'Plus de chemin ! Touche Annuler ou Recommencer', H - 330, 3600);
    if (!reduced()) this.tweens.add({ targets: this.btnUndo, scale: 1.12, duration: 260, yoyo: true, repeat: 3 });
    this.time.delayedCall(1600, () => this.player.recover());
    this.refreshChevrons();
  }

  // =====================================================================
  // Annuler / Recommencer : restauration exacte de l'état
  // =====================================================================

  undo() {
    if (this.mode !== 'idle' || !this.history.length) return;
    this.usedUndo = true;
    const prev = this.history.pop()!;
    Sfx.undo();
    this.applyState(prev);
  }

  restart() {
    if (this.mode !== 'idle' && this.mode !== 'paused') return;
    if (this.history.length === 0 && this.state.steps === 0) return;
    this.usedRestart = true;
    this.history = [];
    Sfx.undo();
    this.applyState(initialState(this.grid));
  }

  /** Reconstruit tous les visuels pour correspondre exactement à l'état donné. */
  private applyState(s: GameState) {
    this.tweens.killTweensOf(this.player);
    this.state = s;
    // haies
    for (const [cell, img] of this.hedges) {
      if (!s.closed[cell]) {
        this.hedges.delete(cell);
        if (reduced()) img.destroy();
        else this.tweens.add({ targets: img, scaleY: 0, alpha: 0, duration: 220, onComplete: () => img.destroy() });
      }
    }
    s.closed.forEach((v, cell) => { if (v) this.growHedge(cell, false); });
    // objets
    this.followers = [];
    for (const c of this.grid.collectibles) {
      const img = this.items.get(c.id)!;
      const got = (s.collected >> c.id) & 1;
      this.tweens.killTweensOf(img);
      const glow = this.children.getByName(`seed-glow-${c.id}`) as Phaser.GameObjects.Image | null;
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
    // interrupteur & pont
    this.switchImg?.setTexture(s.bridgesOpen ? 'switch-on' : 'switch-off');
    this.planks.forEach((p) => { this.tweens.killTweensOf(p); p.setVisible(s.bridgesOpen).setAlpha(1).setScale(this.s * 0.86, this.s * 0.95); });
    this.planks.forEach((p) => p.setY(p.getData('baseY') ?? p.y));
    this.ropes.forEach((r) => { this.tweens.killTweensOf(r); r.setScale(s.bridgesOpen ? 0 : this.s).setAlpha(s.bridgesOpen ? 0 : 1); });
    // porte & floraison
    if (this.vines) {
      this.tweens.killTweensOf(this.vines);
      this.vines.setVisible(!s.doorsOpen).setAlpha(1).setScale(this.s * 0.8);
    }
    this.bloom.forEach((f) => { this.tweens.killTweensOf(f); f.setScale(s.doorsOpen ? this.s : 0); });
    // personnage
    const pc = this.center(s.pos);
    this.player.setPosition(pc.x, pc.y + 6 * this.s);
    this.player.recover();
    if (!reduced()) {
      this.player.setAlpha(0.3);
      this.tweens.add({ targets: this.player, alpha: 1, duration: 200 });
    }
    this.followers.forEach((f, k) => {
      f.img.setPosition(pc.x + (k % 2 ? 26 : -26) * this.s, pc.y + (16 + k * 10) * this.s);
    });
    this.mode = 'idle';
    this.refreshHud();
    this.refreshChevrons();
  }

  // =====================================================================
  // Aides visuelles : cases accessibles (forme, pas seulement couleur)
  // =====================================================================

  private refreshChevrons() {
    this.hideChevrons();
    if (this.mode !== 'idle' || this.state.won) return;
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

  // =====================================================================
  // Tutoriel naturel
  // =====================================================================

  private showStartHint() {
    const h = this.def.hints?.start;
    if (h) this.time.delayedCall(450, () => toast(this, h, H - 330, 4200));
    if (this.def.id === 1 && this.solution.length >= 3) {
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
    this.refreshHud();
    const ex = this.center(this.grid.exit);
    this.player.setDepth(this.cellBottom(this.grid.exit) + 5);
    this.tweens.add({ targets: this.player, y: ex.y + this.L.td * 0.32, duration: 200 });
    this.player.joy();
    Sfx.win();
    const stars = 1 + (this.usedUndo ? 0 : 1) + (this.usedRestart ? 0 : 1);
    Save.recordWin(this.def.id, stars, LEVELS.length);

    // célébration propre à chaque sortie
    if (this.def.exitStyle === 'house') {
      this.exitImg.setTexture('house-lit');
      const glow = this.add.image(ex.x, ex.y - this.exitImg.displayHeight * 0.4, 'glow').setDepth(this.exitImg.depth + 1).setScale(this.s * 3).setAlpha(0);
      this.tweens.add({ targets: glow, alpha: 0.8, duration: 500, yoyo: true, hold: 600 });
    }
    this.followers.forEach((f, k) => {
      const tx = ex.x + (k ? 1 : -1) * 46 * this.s;
      const ty = ex.y + this.L.td * 0.36;
      f.img.setDepth(this.player.depth + 1);
      this.tweens.add({ targets: f.img, x: tx, y: ty, duration: 400, delay: 150 * k });
      if (!reduced()) this.tweens.add({ targets: f.img, y: ty - 26 * this.s, duration: 220, yoyo: true, repeat: 4, delay: 600 + 120 * k, ease: 'Quad.easeOut' });
    });
    this.sparkleBurst(ex.x, ex.y - 60 * this.s, 10);
    if (!reduced()) {
      for (let k = 0; k < 26; k++) {
        const p = this.add.image(ex.x, ex.y - 60 * this.s, k % 2 ? 'petal' : 'petal-y').setDepth(9900).setScale(1.3);
        this.tweens.add({
          targets: p, x: ex.x + (Math.random() - 0.5) * 700, y: ex.y - 300 - Math.random() * 300, angle: 400,
          duration: 700, ease: 'Quad.easeOut',
          onComplete: () => this.tweens.add({ targets: p, y: p.y + 600, alpha: 0, duration: 1600, ease: 'Sine.easeIn', onComplete: () => p.destroy() }),
        });
      }
    }
    this.time.delayedCall(reduced() ? 300 : 1500, () => this.showWinPanel(stars));
  }

  private showWinPanel(stars: number) {
    const last = this.def.id === LEVELS.length;
    const d = 30000;
    const ph = 620;
    // le panneau se place du côté opposé à la sortie pour laisser voir la célébration
    const exitLow = this.center(this.grid.exit).y > H * 0.5;
    const py = exitLow ? 30 + ph / 2 : H - ph / 2 - 30;
    const c = this.add.container(W / 2, py).setDepth(d);
    const g = this.add.graphics();
    g.fillStyle(0x2c4a30, 0.2);
    g.fillRoundedRect(-470, -ph / 2 + 10, 940, ph, 56);
    g.fillStyle(0xfffbf0, 0.985);
    g.fillRoundedRect(-470, -ph / 2, 940, ph, 56);
    g.lineStyle(5, hex(C.orange), 1);
    g.strokeRoundedRect(-470, -ph / 2, 940, ph, 56);
    c.add(g);
    c.add(txt(this, 0, -ph / 2 + 64, last ? 'Le jardin est sauvé !' : 'Bravo !', last ? 56 : 64, { weight: 700, color: C.ink }));
    c.add(txt(this, 0, -ph / 2 + 116, last ? 'Le hérisson et le lapin sont rentrés à la maison' : this.def.name, 32, { color: C.inkSoft, weight: 500 }));
    const crit = ['Niveau terminé', 'Sans utiliser Annuler', 'Sans recommencer'];
    const got = [true, !this.usedUndo, !this.usedRestart];
    for (let k = 0; k < 3; k++) {
      const sx = (k - 1) * 150;
      const sc = k === 1 ? 1.1 : 0.9;
      const st = this.add.image(sx, -ph / 2 + 205, k < stars ? 'star-full' : 'star-empty').setScale(sc);
      c.add(st);
      if (k < stars && !reduced()) {
        st.setScale(0);
        this.tweens.add({ targets: st, scale: sc, duration: 380, delay: 250 + k * 260, ease: 'Back.easeOut', onStart: () => Sfx.star(k) });
      }
    }
    crit.forEach((t, k) => {
      const y = -ph / 2 + 300 + k * 50;
      c.add(this.add.image(-230, y, got[k] ? 'icon-check' : 'icon-restart').setScale(got[k] ? 0.56 : 0.46).setAlpha(got[k] ? 1 : 0.5));
      c.add(txt(this, -192, y, t, 34, { color: got[k] ? C.ink : C.inkSoft, weight: got[k] ? 600 : 400, align: 'left' }).setOrigin(0, 0.5));
    });
    const by = ph / 2 - 82;
    const replay = button(this, -225, by, 'pill-sm-cream', { label: 'Rejouer', icon: 'icon-restart', iconScale: 0.7, size: 42, iconX: -100 }, () => goTo(this, 'Game', { level: this.def.id }), 'btn-replay');
    const next = last
      ? button(this, 225, by, 'pill-sm-orange', { label: 'Carnet', icon: 'icon-book', iconScale: 0.7, size: 42, iconX: -100 }, () => goTo(this, 'Levels'), 'btn-next')
      : button(this, 225, by, 'pill-sm-orange', { label: 'Continuer', icon: 'icon-next', iconScale: 0.7, size: 42, iconX: -110 }, () => goTo(this, 'Game', { level: this.def.id + 1 }), 'btn-next');
    c.add([replay, next]);
    if (!reduced()) {
      c.setY(exitLow ? -ph / 2 : H + ph / 2);
      this.tweens.add({ targets: c, y: py, duration: 520, ease: 'Back.easeOut' });
    }
  }

  // =====================================================================
  // Pause
  // =====================================================================

  openPause() {
    if (this.mode === 'moving' || this.mode === 'won' || this.mode === 'drag' || this.overlay) return;
    this.mode = 'paused';
    this.hideChevrons();
    const d = 40000;
    const c = this.add.container(0, 0).setDepth(d);
    const dim = this.add.rectangle(W / 2, H / 2, W, H, 0x2c4a30, 0.35).setInteractive();
    c.add(dim);
    const g = this.add.graphics();
    g.fillStyle(0xfffbf0, 0.97);
    g.fillRoundedRect(W / 2 - 400, 470, 800, 980, 56);
    g.lineStyle(5, hex(C.sage), 1);
    g.strokeRoundedRect(W / 2 - 400, 470, 800, 980, 56);
    c.add(g);
    c.add(txt(this, W / 2, 560, 'Pause', 64, { weight: 700 }));
    const items: [string, string, string, () => void][] = [
      ['pill-orange', 'icon-play', 'Reprendre', () => this.closePause()],
      ['pill-cream', 'icon-restart', 'Recommencer', () => { this.closePause(); this.restart(); }],
      ['pill-cream', 'icon-book', 'Carnet des niveaux', () => goTo(this, 'Levels')],
      ['pill-cream', 'icon-home', 'Accueil', () => goTo(this, 'Menu')],
    ];
    items.forEach(([tex, icon, label, fn], k) => c.add(button(this, W / 2, 700 + k * 150, tex, { icon, label, size: 44, iconScale: 0.85, iconX: -200 }, fn, `pause-${k}`)));
    // réglages rapides
    const toggles: [string, () => boolean, () => void][] = [
      ['Son', () => Save.settings().sound, () => { Save.setSetting('sound', !Save.settings().sound); syncAmbience(); this.soundBtnIcon.setTexture(Save.settings().sound ? 'icon-sound-on' : 'icon-sound-off'); }],
      ['Animations réduites', () => Save.settings().reducedMotion, () => Save.setSetting('reducedMotion', !Save.settings().reducedMotion)],
    ];
    toggles.forEach(([label, get, set], k) => {
      const y = 1300 + k * 90;
      const lab = txt(this, W / 2 - 300, y, label, 38, { align: 'left', weight: 500 }).setOrigin(0, 0.5);
      const sw = toggle(this, W / 2 + 260, y, get(), () => { set(); return get(); });
      c.add([lab, sw]);
    });
    this.overlay = c;
    if (!reduced()) {
      c.setAlpha(0);
      this.tweens.add({ targets: c, alpha: 1, duration: 180 });
    }
  }

  closePause() {
    if (!this.overlay) return;
    this.overlay.destroy();
    this.overlay = undefined;
    this.mode = 'idle';
    this.refreshChevrons();
  }

  update() {
    if (this.player && this.mode !== 'won') this.player.setDepth(this.player.y + 2);
    this.followers.forEach((f) => { if (this.mode !== 'won') f.img.setDepth(f.img.y + 1); });
  }
}
