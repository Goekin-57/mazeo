import Phaser from 'phaser';
import { C } from './palette';
import {
  canvas, type Ctx, ellipse, fillEllipse, flower, leaf, rGrad, rng, rr, shade, starPath, vGrad, withAlpha,
} from './draw';

/** Taille de référence d'une case pour les textures (mise à l'échelle ensuite). */
export const BT = 160; // largeur
export const BD = 132; // profondeur visible (perspective 2,5D)
export const HH = 36; // hauteur des haies
export const HEDGE_H = 12 + BD + HH + 6; // hauteur texture haie
export const HEDGE_BASE = 12 + BD + HH; // ligne du sol (origine)

type Draw = (ctx: Ctx, w: number, h: number) => void;

export function generateTextures(scene: Phaser.Scene) {
  const add = (key: string, w: number, h: number, draw: Draw) => {
    if (scene.textures.exists(key)) return;
    const [cv, ctx] = canvas(w, h);
    draw(ctx, w, h);
    scene.textures.addCanvas(key, cv);
  };

  // ---------- Végétation & murs ----------
  for (let v = 0; v < 3; v++) add(`hedge${v}`, BT, HEDGE_H, (c) => drawHedge(c, 101 + v * 17));
  for (let v = 0; v < 2; v++) add(`young${v}`, BT, HEDGE_H, (c) => drawYoungHedge(c, 7 + v * 31));
  add('tree', BT, 300, (c) => drawTree(c, 300));
  add('flowers', BT, HEDGE_H, (c) => drawFlowerBed(c));
  add('rock', BT, HEDGE_H, (c) => drawRock(c));
  add('bush', BT, HEDGE_H, (c) => drawBush(c));

  // ---------- Personnage « Bourgeon » ----------
  add('shadow', 120, 44, (c) => fillEllipse(c, 60, 22, 58, 20, rGrad(c, 60, 22, 2, 58, [[0, 'rgba(40,60,30,0.38)'], [1, 'rgba(40,60,30,0)']])));
  add('pip-body', 124, 120, drawPipBody);
  add('pip-eye', 30, 36, (c) => {
    fillEllipse(c, 15, 18, 13.5, 16.5, '#3b4a3a');
    fillEllipse(c, 15, 18, 12, 15, rGrad(c, 15, 15, 2, 16, [[0, '#ffffff'], [1, '#e9eef0']]));
  });
  add('pip-pupil', 20, 22, (c) => {
    fillEllipse(c, 10, 11, 8.5, 9.5, rGrad(c, 10, 12, 1, 10, [[0, '#4a3426'], [1, '#1f1712']]));
    fillEllipse(c, 7, 7.5, 3.2, 3.2, '#fff');
    fillEllipse(c, 12.5, 14, 1.4, 1.4, 'rgba(255,255,255,0.8)');
  });
  add('pip-mouth-smile', 32, 20, (c) => mouth(c, 'smile'));
  add('pip-mouth-open', 32, 22, (c) => mouth(c, 'open'));
  add('pip-mouth-sad', 32, 20, (c) => mouth(c, 'sad'));
  add('pip-mouth-o', 32, 22, (c) => mouth(c, 'o'));
  add('pip-sprout', 70, 60, drawSprout);
  add('pip-bag', 52, 60, drawBag);
  add('pip-leg', 24, 26, (c) => {
    rr(c, 2, 2, 20, 22, 10);
    c.fillStyle = vGrad(c, 2, 24, [[0, '#d9772b'], [1, '#a5541c']]);
    c.fill();
    fillEllipse(c, 9, 8, 4, 3, 'rgba(255,255,255,0.35)');
  });
  add('pip-cheek', 20, 12, (c) => fillEllipse(c, 10, 6, 9, 5, 'rgba(244,140,150,0.55)'));
  add('pip-mark', 30, 60, (c) => {
    // « ! » de surprise
    c.fillStyle = C.orangeDeep;
    rr(c, 9, 2, 12, 36, 6);
    c.fill();
    fillEllipse(c, 15, 50, 7, 7, C.orangeDeep);
  });

  // ---------- Animaux & objets ----------
  add('duckling', 70, 64, drawDuckling);
  add('mother-duck', 170, 150, drawMotherDuck);
  add('seed', 60, 72, drawSeed);
  add('hedgehog', 90, 70, drawHedgehog);
  add('bunny', 80, 96, drawBunny);
  add('switch-off', 130, 90, (c) => drawSwitch(c, false));
  add('switch-on', 130, 90, (c) => drawSwitch(c, true));
  add('plank', 132, 30, drawPlank);
  add('post', 20, 52, drawPost);
  add('rope-coil', 70, 40, (c) => {
    fillEllipse(c, 35, 24, 30, 13, C.woodDark);
    fillEllipse(c, 35, 21, 28, 12, '#d7b07a');
    c.strokeStyle = '#a77d4b';
    c.lineWidth = 2;
    for (let i = 0; i < 3; i++) { ellipse(c, 35, 21, 22 - i * 7, 9 - i * 3); c.stroke(); }
  });
  add('arch', 180, 250, drawArch);
  add('vines', 150, 160, drawVines);
  add('house', 190, 230, (c) => drawHouse(c, false));
  add('house-lit', 190, 230, (c) => drawHouse(c, true));
  add('gate', 180, 220, drawGate);
  add('burrow', 180, 170, drawBurrow);
  add('lily', 60, 40, (c) => {
    c.beginPath();
    c.ellipse(30, 22, 26, 14, 0, 0.35, Math.PI * 2 - 0.1);
    c.lineTo(30, 22);
    c.closePath();
    c.fillStyle = '#5aa64a';
    c.fill();
    c.strokeStyle = '#3f8a45';
    c.lineWidth = 2;
    c.stroke();
    flower(c, 34, 18, 8, '#f8c5d2', '#f7d35c');
  });

  // ---------- Effets ----------
  add('leafp', 26, 16, (c) => leaf(c, 2, 8, 22, 7, 0, C.hedgeLight, C.hedge));
  add('leafy', 26, 16, (c) => leaf(c, 2, 8, 22, 7, 0, C.youngLight, C.youngDark));
  for (const [k, col] of [['bloom-a', '#f4a7b9'], ['bloom-b', '#b9a3e3'], ['bloom-c', '#fff3c4']] as const) {
    add(k, 56, 52, (c) => {
      leaf(c, 26, 34, 24, 9, 2.6, C.meadow, C.meadowDark);
      leaf(c, 30, 34, 24, 9, 0.5, C.hedgeLight, C.meadowDark);
      flower(c, 28, 24, 15, col, C.yellowDeep);
    });
  }
  add('petal', 18, 14, (c) => fillEllipse(c, 9, 7, 8, 5, '#f9c6d3'));
  add('petal-y', 18, 14, (c) => fillEllipse(c, 9, 7, 8, 5, C.yellow));
  add('sparkle', 40, 40, (c) => {
    c.fillStyle = rGrad(c, 20, 20, 0, 18, [[0, '#fffbe6'], [1, 'rgba(255,240,180,0)']]);
    c.fillRect(0, 0, 40, 40);
    c.fillStyle = '#fff';
    c.beginPath();
    c.moveTo(20, 2); c.quadraticCurveTo(22, 18, 38, 20); c.quadraticCurveTo(22, 22, 20, 38);
    c.quadraticCurveTo(18, 22, 2, 20); c.quadraticCurveTo(18, 18, 20, 2); c.fill();
  });
  add('glow', 128, 128, (c) => {
    c.fillStyle = rGrad(c, 64, 64, 0, 64, [[0, 'rgba(255,250,220,0.9)'], [0.4, 'rgba(255,240,180,0.45)'], [1, 'rgba(255,230,150,0)']]);
    c.fillRect(0, 0, 128, 128);
  });
  add('glow-teal', 128, 128, (c) => {
    c.fillStyle = rGrad(c, 64, 64, 0, 64, [[0, 'rgba(210,255,248,0.95)'], [0.45, 'rgba(126,207,196,0.5)'], [1, 'rgba(126,207,196,0)']]);
    c.fillRect(0, 0, 128, 128);
  });
  add('ring', 128, 128, (c) => {
    c.strokeStyle = 'rgba(255,255,255,0.95)';
    c.lineWidth = 6;
    ellipse(c, 64, 64, 58, 58);
    c.stroke();
  });
  add('dot', 16, 16, (c) => fillEllipse(c, 8, 8, 7, 7, '#fff'));
  add('dust', 24, 24, (c) => fillEllipse(c, 12, 12, 11, 11, rGrad(c, 12, 12, 0, 11, [[0, 'rgba(240,230,200,0.9)'], [1, 'rgba(240,230,200,0)']])));
  add('shine', 44, 12, (c) => {
    c.strokeStyle = 'rgba(255,255,255,0.85)';
    c.lineWidth = 3;
    c.lineCap = 'round';
    c.beginPath(); c.moveTo(4, 8); c.quadraticCurveTo(22, 1, 40, 8); c.stroke();
  });
  add('chevron', 52, 38, (c) => {
    c.lineCap = 'round';
    c.lineJoin = 'round';
    c.strokeStyle = 'rgba(255,255,255,0.95)';
    c.lineWidth = 13;
    c.beginPath(); c.moveTo(9, 29); c.lineTo(26, 11); c.lineTo(43, 29); c.stroke();
    c.strokeStyle = C.orange;
    c.lineWidth = 6;
    c.beginPath(); c.moveTo(9, 29); c.lineTo(26, 11); c.lineTo(43, 29); c.stroke();
  });
  add('step-dot', 40, 40, (c) => {
    fillEllipse(c, 20, 22, 14, 11, 'rgba(120,70,20,0.25)');
    fillEllipse(c, 20, 19, 13, 10, C.orange);
    c.strokeStyle = '#fff';
    c.lineWidth = 3.5;
    ellipse(c, 20, 19, 13, 10);
    c.stroke();
  });
  add('target', 110, 80, (c) => {
    c.strokeStyle = '#fff';
    c.lineWidth = 6;
    c.setLineDash([12, 9]);
    ellipse(c, 55, 40, 48, 32);
    c.stroke();
    c.setLineDash([]);
    c.strokeStyle = C.orange;
    c.lineWidth = 4;
    ellipse(c, 55, 40, 40, 26);
    c.stroke();
  });
  add('cross', 60, 60, (c) => {
    c.strokeStyle = C.red;
    c.lineWidth = 10;
    c.lineCap = 'round';
    c.beginPath(); c.moveTo(14, 14); c.lineTo(46, 46); c.moveTo(46, 14); c.lineTo(14, 46); c.stroke();
  });
  add('cloud', 240, 120, drawCloud);
  add('wing', 34, 30, (c) => {
    c.fillStyle = vGrad(c, 0, 30, [[0, '#ffd27a'], [1, C.orange]]);
    c.beginPath(); c.moveTo(2, 28); c.bezierCurveTo(0, 0, 34, -4, 32, 14); c.bezierCurveTo(30, 26, 12, 30, 2, 28); c.fill();
    fillEllipse(c, 20, 12, 4, 4, 'rgba(255,255,255,0.7)');
  });
  add('hand', 100, 120, drawHand);

  // ---------- Interface ----------
  add('star-full', 100, 100, (c) => drawStar(c, true));
  add('star-empty', 100, 100, (c) => drawStar(c, false));
  add('btn-round', 150, 156, (c) => drawRoundButton(c, C.cream, '#d9c8a2'));
  add('btn-round-orange', 150, 156, (c) => drawRoundButton(c, C.orange, C.orangeDeep));
  add('btn-small', 104, 108, (c) => {
    fillEllipse(c, 52, 58, 48, 48, 'rgba(60,80,50,0.25)');
    fillEllipse(c, 52, 52, 48, 48, '#e2d3b0');
    fillEllipse(c, 52, 48, 46, 46, vGrad(c, 4, 94, [[0, '#fffaf0'], [1, C.cream]]));
  });
  ([
    ['pill-orange', 560, 150, C.orange, C.orangeDeep],
    ['pill-cream', 560, 130, C.cream, '#d6c39b'],
    ['pill-turq', 560, 130, C.turquoise, C.turquoiseDeep],
    ['pill-sm-orange', 330, 120, C.orange, C.orangeDeep],
    ['pill-sm-cream', 330, 120, C.cream, '#d6c39b'],
  ] as const).forEach(([k, w, h, a, b]) => add(k, w, h, (c) => drawPill(c, w, h, a, b)));
  add('chip', 220, 84, (c) => {
    rr(c, 2, 6, 216, 76, 38);
    c.fillStyle = 'rgba(60,80,50,0.18)';
    c.fill();
    rr(c, 2, 2, 216, 74, 37);
    c.fillStyle = 'rgba(255,251,240,0.92)';
    c.fill();
  });
  const icons: Record<string, Draw> = {
    undo: (c) => iconUndo(c), restart: (c) => iconRestart(c), pause: (c) => iconPause(c),
    'sound-on': (c) => iconSound(c, true), 'sound-off': (c) => iconSound(c, false), home: iconHome,
    lock: iconLock, back: iconBack, play: iconPlay, book: iconBook, gear: iconGear, check: iconCheck, next: iconNext,
    motion: iconMotion,
  };
  Object.entries(icons).forEach(([k, d]) => add(`icon-${k}`, 72, 72, d));
}

// =====================================================================
// Végétation
// =====================================================================

function hedgeLeaves(c: Ctx, r: () => number, x0: number, y0: number, w: number, h: number, n: number, cols: string[], size: [number, number]) {
  for (let i = 0; i < n; i++) {
    const x = x0 + r() * w;
    const y = y0 + r() * h;
    const s = size[0] + r() * (size[1] - size[0]);
    const col = cols[Math.floor(r() * cols.length)];
    leaf(c, x, y, s * 1.5, s * 0.55, r() * Math.PI * 2, col);
  }
}

function drawHedge(c: Ctx, seed: number) {
  const r = rng(seed);
  const top = 12;
  const faceY = top + BD; // début de la face avant
  const bottom = faceY + HH;
  // ombre au sol
  fillEllipse(c, BT / 2, bottom - 2, BT / 2, 8, 'rgba(30,60,30,0.28)');
  // face avant (volume)
  rr(c, 3, faceY - 26, BT - 6, HH + 26, 24);
  c.fillStyle = vGrad(c, faceY - 26, bottom, [[0, C.hedge], [1, '#245a2e']]);
  c.fill();
  c.save();
  rr(c, 3, faceY - 26, BT - 6, HH + 26, 24);
  c.clip();
  hedgeLeaves(c, r, 0, faceY - 10, BT, HH + 8, 70, ['#2f7639', '#367f3f', '#2a6a33', '#3f8a45'], [5, 9]);
  c.restore();
  // dessus (surface éclairée)
  rr(c, 3, top + 4, BT - 6, BD - 2, 30);
  c.fillStyle = vGrad(c, top, faceY, [[0, '#6cbb5e'], [0.6, C.hedgeLight], [1, C.hedge]]);
  c.fill();
  c.save();
  rr(c, 3, top + 4, BT - 6, BD - 2, 30);
  c.clip();
  hedgeLeaves(c, r, -6, top, BT + 12, BD, 150, ['#4f9e4b', '#5fae55', '#6fbd60', '#448f44', '#7cc96a'], [6, 11]);
  // reflets
  for (let i = 0; i < 16; i++) leaf(c, 10 + r() * (BT - 20), top + 6 + r() * BD * 0.6, 10, 4, r() * 6, 'rgba(210,245,170,0.55)');
  c.restore();
  // bosses sur le contour supérieur
  for (let x = 14; x < BT - 10; x += 24 + r() * 6) {
    fillEllipse(c, x, top + 8 + r() * 4, 13, 10, '#6cbb5e');
    leaf(c, x - 6, top + 7, 12, 4, -0.4, '#86cf74');
  }
  // fine bordure sombre
  rr(c, 3, top + 4, BT - 6, bottom - top - 4, 26);
  c.strokeStyle = 'rgba(30,70,35,0.35)';
  c.lineWidth = 2;
  c.stroke();
}

function drawYoungHedge(c: Ctx, seed: number) {
  // Haie qui vient de pousser : silhouette en grappes rondes, plus claire, fleurie.
  const r = rng(seed);
  const bottom = HEDGE_BASE;
  fillEllipse(c, BT / 2, bottom - 4, BT / 2 - 4, 10, 'rgba(30,60,30,0.25)');
  // petit monticule de terre
  fillEllipse(c, BT / 2, bottom - 10, BT / 2 - 10, 16, '#9a6d45');
  fillEllipse(c, BT / 2, bottom - 14, BT / 2 - 16, 12, '#b5875a');
  const blobs: [number, number, number][] = [
    [40, bottom - 52, 40], [118, bottom - 50, 40], [80, bottom - 78, 48], [56, bottom - 98, 30], [106, bottom - 100, 28],
  ];
  for (const [x, y, rad] of blobs) {
    fillEllipse(c, x, y + 4, rad, rad * 0.92, C.youngDark);
    fillEllipse(c, x, y, rad, rad * 0.9, rGrad(c, x - rad * 0.3, y - rad * 0.4, 2, rad * 1.2, [[0, '#d9f28f'], [0.5, C.young], [1, '#79b043']]));
    c.save();
    ellipse(c, x, y, rad, rad * 0.9);
    c.clip();
    hedgeLeaves(c, r, x - rad, y - rad, rad * 2, rad * 2, 22, ['#a9d867', '#8cc24e', '#c4e67f', '#7fb544'], [5, 9]);
    c.restore();
  }
  // vrilles
  c.strokeStyle = '#6fa63b';
  c.lineWidth = 3;
  c.lineCap = 'round';
  c.beginPath();
  c.moveTo(80, bottom - 120);
  c.bezierCurveTo(76, bottom - 140, 96, bottom - 146, 94, bottom - 132);
  c.stroke();
  leaf(c, 80, bottom - 122, 20, 8, -2.2, '#9ccf5a', '#6fa63b');
  // fleurs blanches
  const fl: [number, number][] = [[40, bottom - 70], [116, bottom - 64], [86, bottom - 100], [60, bottom - 40], [100, bottom - 40]];
  fl.forEach(([x, y], i) => flower(c, x + (r() - 0.5) * 6, y, 7 + (i % 2) * 2, i % 2 ? '#fff6f0' : '#fde8a8', C.orange));
}

function drawTree(c: Ctx, h: number) {
  const r = rng(77);
  const ground = h - (BD / 2) - 6;
  fillEllipse(c, BT / 2 + 8, ground + 4, 58, 18, 'rgba(30,60,30,0.3)');
  // tronc
  c.fillStyle = vGrad(c, ground - 90, ground, [[0, '#9a6a42'], [1, '#6e4a2c']]);
  c.beginPath();
  c.moveTo(BT / 2 - 14, ground);
  c.quadraticCurveTo(BT / 2 - 8, ground - 50, BT / 2 - 10, ground - 100);
  c.lineTo(BT / 2 + 10, ground - 100);
  c.quadraticCurveTo(BT / 2 + 8, ground - 50, BT / 2 + 16, ground);
  c.closePath();
  c.fill();
  // feuillage en boules
  const blobs: [number, number, number][] = [
    [BT / 2 - 34, ground - 112, 40], [BT / 2 + 34, ground - 116, 42], [BT / 2, ground - 150, 52], [BT / 2 - 10, ground - 104, 38],
  ];
  for (const [x, y, rad] of blobs) fillEllipse(c, x, y + 6, rad, rad, '#2f7639');
  for (const [x, y, rad] of blobs) {
    fillEllipse(c, x, y, rad, rad, rGrad(c, x - rad * 0.4, y - rad * 0.5, 4, rad * 1.3, [[0, '#9ad77a'], [0.45, '#5fae55'], [1, '#367f3f']]));
    c.save();
    ellipse(c, x, y, rad, rad);
    c.clip();
    hedgeLeaves(c, r, x - rad, y - rad, rad * 2, rad * 2, 26, ['#6fbd60', '#4f9e4b', '#86cf74'], [6, 10]);
    c.restore();
  }
  // fruits/fleurs
  for (let i = 0; i < 6; i++) fillEllipse(c, BT / 2 - 50 + r() * 100, ground - 170 + r() * 90, 5, 5, i % 2 ? '#f7a35c' : '#fbd56b');
}

function drawFlowerBed(c: Ctx) {
  const r = rng(5);
  const top = 12 + BD * 0.25;
  const bottom = HEDGE_BASE;
  fillEllipse(c, BT / 2, bottom - 2, BT / 2 - 2, 8, 'rgba(30,60,30,0.25)');
  // bordure en bois (jardinière)
  rr(c, 8, top + 30, BT - 16, bottom - top - 30, 20);
  c.fillStyle = vGrad(c, top, bottom, [[0, C.wood], [1, C.woodDark]]);
  c.fill();
  for (let x = 20; x < BT - 10; x += 26) {
    c.strokeStyle = 'rgba(90,55,25,0.35)';
    c.lineWidth = 2;
    c.beginPath(); c.moveTo(x, bottom - 30); c.lineTo(x, bottom - 4); c.stroke();
  }
  rr(c, 12, top + 14, BT - 24, bottom - top - 50, 22);
  c.fillStyle = '#7a5235';
  c.fill();
  // feuillage + fleurs
  hedgeLeaves(c, r, 18, top + 4, BT - 36, bottom - top - 60, 70, ['#4f9e4b', '#5fae55', '#6fbd60'], [6, 10]);
  const cols = ['#f4a7b9', '#f7e08a', '#b9a3e3', '#ffffff', '#f29c4b'];
  for (let i = 0; i < 14; i++) flower(c, 24 + r() * (BT - 48), top + 4 + r() * (bottom - top - 66), 7 + r() * 4, cols[i % cols.length]);
}

function drawRock(c: Ctx) {
  const bottom = HEDGE_BASE;
  fillEllipse(c, BT / 2, bottom - 6, BT / 2 - 6, 12, 'rgba(30,60,30,0.28)');
  const stones: [number, number, number, number][] = [[56, bottom - 46, 46, 40], [108, bottom - 34, 36, 30], [86, bottom - 82, 34, 30]];
  for (const [x, y, rx, ry] of stones) {
    fillEllipse(c, x, y + 6, rx, ry, '#8d8a7c');
    fillEllipse(c, x, y, rx, ry, rGrad(c, x - rx * 0.4, y - ry * 0.5, 2, rx * 1.2, [[0, '#f1ece0'], [0.5, '#cfc8b6'], [1, '#a29c8a']]));
    fillEllipse(c, x - rx * 0.35, y - ry * 0.45, rx * 0.25, ry * 0.15, 'rgba(255,255,255,0.6)');
  }
  // mousse
  for (let i = 0; i < 10; i++) fillEllipse(c, 40 + i * 9, bottom - 18 - (i % 3) * 4, 7, 5, i % 2 ? '#6fbd60' : '#86cf74');
}

function drawBush(c: Ctx) {
  const r = rng(13);
  const bottom = HEDGE_BASE;
  fillEllipse(c, BT / 2, bottom - 4, BT / 2 - 8, 11, 'rgba(30,60,30,0.28)');
  const x = BT / 2, y = bottom - 62, rad = 62;
  fillEllipse(c, x, y + 8, rad, rad * 0.86, '#2f7639');
  fillEllipse(c, x, y, rad, rad * 0.86, rGrad(c, x - 20, y - 30, 4, rad * 1.3, [[0, '#8fd06f'], [0.5, '#4f9e4b'], [1, '#2f7639']]));
  c.save();
  ellipse(c, x, y, rad, rad * 0.86);
  c.clip();
  hedgeLeaves(c, r, x - rad, y - rad, rad * 2, rad * 2, 80, ['#5fae55', '#6fbd60', '#448f44', '#86cf74'], [6, 10]);
  c.restore();
  for (let i = 0; i < 9; i++) {
    const bx = x - 40 + r() * 80, by = y - 30 + r() * 60;
    fillEllipse(c, bx, by, 6, 6, '#e0565b');
    fillEllipse(c, bx - 2, by - 2, 2, 2, 'rgba(255,255,255,0.8)');
  }
}

// =====================================================================
// Personnage
// =====================================================================

function drawPipBody(c: Ctx) {
  const cx = 62, cy = 64;
  // corps rond
  fillEllipse(c, cx, cy + 3, 52, 50, '#c98f50');
  fillEllipse(c, cx, cy, 52, 50, rGrad(c, cx - 18, cy - 24, 6, 70, [[0, '#fff3d9'], [0.45, '#ffdca8'], [1, '#eaa865']]));
  // lumière de contour
  c.strokeStyle = 'rgba(255,255,255,0.45)';
  c.lineWidth = 3;
  c.beginPath();
  c.ellipse(cx, cy, 47, 45, 0, Math.PI * 1.1, Math.PI * 1.55);
  c.stroke();
  // écharpe turquoise
  c.save();
  ellipse(c, cx, cy, 52, 50);
  c.clip();
  c.fillStyle = vGrad(c, cy + 18, cy + 36, [[0, '#8fe0d4'], [1, C.turquoiseDeep]]);
  c.beginPath();
  c.moveTo(0, cy + 16);
  c.quadraticCurveTo(cx, cy + 34, 124, cy + 16);
  c.lineTo(124, cy + 32);
  c.quadraticCurveTo(cx, cy + 50, 0, cy + 32);
  c.closePath();
  c.fill();
  c.strokeStyle = 'rgba(255,255,255,0.5)';
  c.lineWidth = 2;
  c.beginPath();
  c.moveTo(10, cy + 22);
  c.quadraticCurveTo(cx, cy + 38, 114, cy + 22);
  c.stroke();
  c.restore();
  // nœud de l'écharpe
  rr(c, cx + 22, cy + 28, 14, 22, 6);
  c.fillStyle = C.turquoiseDeep;
  c.fill();
  rr(c, cx + 30, cy + 30, 12, 20, 6);
  c.fillStyle = '#6fd0c4';
  c.fill();
}

function mouth(c: Ctx, kind: 'smile' | 'open' | 'sad' | 'o') {
  c.lineCap = 'round';
  c.strokeStyle = '#5a3424';
  c.lineWidth = 3.5;
  if (kind === 'smile') {
    c.beginPath(); c.moveTo(8, 6); c.quadraticCurveTo(16, 16, 24, 6); c.stroke();
  } else if (kind === 'sad') {
    c.beginPath(); c.moveTo(9, 15); c.quadraticCurveTo(16, 7, 23, 15); c.stroke();
  } else if (kind === 'open') {
    c.beginPath(); c.moveTo(5, 4); c.quadraticCurveTo(16, 4, 27, 4); c.quadraticCurveTo(16, 26, 5, 4); c.closePath();
    c.fillStyle = '#7a3a2c'; c.fill();
    fillEllipse(c, 16, 14, 6, 4, '#f08a8a');
  } else {
    fillEllipse(c, 16, 11, 6, 8, '#7a3a2c');
  }
}

function drawSprout(c: Ctx) {
  c.strokeStyle = '#4f9a3c';
  c.lineWidth = 5;
  c.lineCap = 'round';
  c.beginPath();
  c.moveTo(35, 58);
  c.quadraticCurveTo(33, 40, 36, 28);
  c.stroke();
  leaf(c, 36, 30, 32, 13, -2.6, '#7dbf5b', '#4f9a3c');
  leaf(c, 36, 28, 34, 14, -0.45, '#9ccf5a', '#5fae55');
  fillEllipse(c, 52, 16, 5, 3, 'rgba(255,255,255,0.5)');
}

function drawBag(c: Ctx) {
  rr(c, 4, 6, 44, 50, 14);
  c.fillStyle = vGrad(c, 6, 56, [[0, '#c98a4e'], [1, '#8e5a2e']]);
  c.fill();
  rr(c, 4, 6, 44, 22, 12);
  c.fillStyle = '#d99b5a';
  c.fill();
  rr(c, 20, 20, 12, 12, 3);
  c.fillStyle = C.yellowDeep;
  c.fill();
  c.strokeStyle = 'rgba(80,45,20,0.4)';
  c.lineWidth = 2;
  rr(c, 4, 6, 44, 50, 14);
  c.stroke();
}

// =====================================================================
// Animaux & objets
// =====================================================================

function drawDuckling(c: Ctx) {
  fillEllipse(c, 35, 56, 24, 6, 'rgba(30,60,30,0.25)');
  // corps
  fillEllipse(c, 32, 40, 24, 18, rGrad(c, 26, 32, 2, 28, [[0, '#fff3b0'], [1, '#f2c94c']]));
  // aile
  fillEllipse(c, 26, 42, 11, 8, '#efc24a');
  // tête
  fillEllipse(c, 44, 22, 15, 15, rGrad(c, 40, 16, 2, 18, [[0, '#fff6c4'], [1, '#f4cf55']]));
  // houppe
  leaf(c, 44, 9, 10, 4, -1.9, '#f2c94c');
  // bec
  c.fillStyle = C.orange;
  c.beginPath(); c.moveTo(55, 22); c.quadraticCurveTo(68, 22, 58, 29); c.quadraticCurveTo(54, 27, 55, 22); c.fill();
  // œil
  fillEllipse(c, 48, 18, 3.4, 3.8, '#2b2018');
  fillEllipse(c, 47, 16.5, 1.2, 1.2, '#fff');
  // pattes
  fillEllipse(c, 28, 57, 5, 3, C.orange);
  fillEllipse(c, 38, 57, 5, 3, C.orange);
}

function drawMotherDuck(c: Ctx) {
  fillEllipse(c, 85, 136, 66, 12, 'rgba(30,60,30,0.25)');
  // nid de paille
  fillEllipse(c, 85, 128, 66, 18, '#c8a060');
  for (let i = 0; i < 16; i++) {
    c.strokeStyle = i % 2 ? '#e3c27f' : '#a8803e';
    c.lineWidth = 3;
    c.beginPath(); c.moveTo(24 + i * 8, 128 + (i % 3) * 3); c.lineTo(34 + i * 7, 118 + (i % 2) * 6); c.stroke();
  }
  // corps
  fillEllipse(c, 80, 96, 54, 36, rGrad(c, 66, 80, 4, 60, [[0, '#ffffff'], [1, '#e7e2d6']]));
  // aile
  c.fillStyle = '#ddd6c6';
  c.beginPath(); c.moveTo(48, 92); c.quadraticCurveTo(80, 70, 116, 96); c.quadraticCurveTo(80, 118, 48, 92); c.fill();
  // queue
  c.fillStyle = '#efeae0';
  c.beginPath(); c.moveTo(30, 90); c.lineTo(14, 70); c.lineTo(40, 80); c.fill();
  // cou + tête
  fillEllipse(c, 118, 64, 18, 28, '#f8f6f0');
  fillEllipse(c, 124, 40, 24, 22, rGrad(c, 118, 32, 2, 26, [[0, '#ffffff'], [1, '#ece7dc']]));
  // bec
  c.fillStyle = C.orange;
  c.beginPath(); c.moveTo(142, 38); c.quadraticCurveTo(166, 42, 146, 52); c.quadraticCurveTo(138, 48, 142, 38); c.fill();
  // œil + foulard
  fillEllipse(c, 130, 34, 4.2, 4.8, '#2b2018');
  fillEllipse(c, 129, 32, 1.5, 1.5, '#fff');
  c.fillStyle = C.turquoise;
  c.beginPath(); c.moveTo(102, 62); c.quadraticCurveTo(118, 74, 134, 62); c.lineTo(134, 70); c.quadraticCurveTo(118, 82, 102, 70); c.fill();
  // fleur sur la tête
  flower(c, 112, 22, 9, '#f4a7b9');
}

function drawSeed(c: Ctx) {
  fillEllipse(c, 30, 66, 18, 5, 'rgba(30,60,30,0.25)');
  c.fillStyle = rGrad(c, 30, 34, 0, 30, [[0, 'rgba(255,248,200,0.8)'], [1, 'rgba(255,248,200,0)']]);
  c.fillRect(0, 0, 60, 72);
  // graine en goutte
  c.beginPath();
  c.moveTo(30, 10);
  c.bezierCurveTo(48, 28, 48, 52, 30, 56);
  c.bezierCurveTo(12, 52, 12, 28, 30, 10);
  c.fillStyle = rGrad(c, 24, 30, 2, 30, [[0, '#fff1b8'], [0.5, '#f2c94c'], [1, '#d58a2a']]);
  c.fill();
  c.strokeStyle = 'rgba(150,90,20,0.6)';
  c.lineWidth = 2;
  c.stroke();
  // motif turquoise magique
  c.strokeStyle = C.turquoiseDeep;
  c.lineWidth = 2.5;
  c.beginPath(); c.moveTo(30, 18); c.quadraticCurveTo(24, 34, 30, 50); c.stroke();
  fillEllipse(c, 24, 26, 3, 5, 'rgba(255,255,255,0.75)');
  leaf(c, 30, 12, 14, 6, -1.2, C.meadow, C.meadowDark);
}

function drawHedgehog(c: Ctx) {
  fillEllipse(c, 45, 62, 32, 7, 'rgba(30,60,30,0.25)');
  // piquants
  c.fillStyle = '#7a5a43';
  for (let i = 0; i < 11; i++) {
    const a = Math.PI + (i / 10) * Math.PI;
    const x = 40 + Math.cos(a) * 30, y = 44 + Math.sin(a) * 26;
    c.beginPath(); c.moveTo(x - 7, y + 4); c.lineTo(40 + Math.cos(a) * 42, 44 + Math.sin(a) * 36); c.lineTo(x + 7, y + 4); c.fill();
  }
  fillEllipse(c, 40, 44, 32, 22, rGrad(c, 34, 34, 2, 34, [[0, '#a58065'], [1, '#6b4c36']]));
  // visage
  c.fillStyle = rGrad(c, 66, 44, 2, 22, [[0, '#f6e1c3'], [1, '#d9b38a']]);
  c.beginPath(); c.moveTo(56, 30); c.quadraticCurveTo(88, 40, 84, 50); c.quadraticCurveTo(70, 60, 56, 56); c.closePath(); c.fill();
  fillEllipse(c, 85, 48, 4.5, 4, '#2b2018');
  fillEllipse(c, 68, 42, 3.2, 3.6, '#2b2018');
  fillEllipse(c, 67, 41, 1.1, 1.1, '#fff');
  fillEllipse(c, 62, 50, 5, 3, 'rgba(244,140,150,0.6)');
  fillEllipse(c, 40, 62, 6, 3.5, '#d9b38a');
  fillEllipse(c, 60, 62, 6, 3.5, '#d9b38a');
}

function drawBunny(c: Ctx) {
  fillEllipse(c, 40, 90, 28, 6, 'rgba(30,60,30,0.25)');
  // oreilles
  for (const [x, a] of [[30, -0.2], [48, 0.2]] as const) {
    c.save(); c.translate(x, 34); c.rotate(a);
    fillEllipse(c, 0, -18, 8, 20, '#f4efe6');
    fillEllipse(c, 0, -16, 4, 14, '#f6bcc6');
    c.restore();
  }
  fillEllipse(c, 40, 68, 26, 22, rGrad(c, 34, 60, 2, 30, [[0, '#ffffff'], [1, '#e2dbcd']]));
  fillEllipse(c, 40, 42, 20, 18, rGrad(c, 36, 36, 2, 22, [[0, '#ffffff'], [1, '#e8e2d6']]));
  fillEllipse(c, 33, 40, 3.2, 3.8, '#2b2018');
  fillEllipse(c, 47, 40, 3.2, 3.8, '#2b2018');
  fillEllipse(c, 32, 38.5, 1.2, 1.2, '#fff');
  fillEllipse(c, 46, 38.5, 1.2, 1.2, '#fff');
  fillEllipse(c, 40, 47, 3, 2.2, '#e88b9a');
  fillEllipse(c, 28, 48, 5, 3, 'rgba(244,140,150,0.45)');
  fillEllipse(c, 52, 48, 5, 3, 'rgba(244,140,150,0.45)');
  fillEllipse(c, 64, 74, 7, 7, '#fff');
  fillEllipse(c, 30, 88, 7, 4, '#ece6da');
  fillEllipse(c, 50, 88, 7, 4, '#ece6da');
}

function drawSwitch(c: Ctx, on: boolean) {
  const cx = 65, cy = 46;
  fillEllipse(c, cx, cy + 14, 56, 22, 'rgba(30,60,30,0.25)');
  // dalle de pierre
  fillEllipse(c, cx, cy + 8, 54, 28, '#a8a090');
  fillEllipse(c, cx, cy, 54, 28, rGrad(c, cx - 14, cy - 10, 2, 60, [[0, '#f3eee2'], [1, '#c9c0aa']]));
  // bouton fleur
  const press = on ? 6 : 0;
  if (on) fillEllipse(c, cx, cy, 44, 22, 'rgba(126,207,196,0.55)');
  fillEllipse(c, cx, cy + 6, 30, 14, '#7c7462');
  fillEllipse(c, cx, cy - 4 + press, 30, 15, on ? rGrad(c, cx, cy, 2, 32, [[0, '#d8fff7'], [1, C.turquoiseDeep]]) : rGrad(c, cx - 6, cy - 10, 2, 32, [[0, '#ffd9a8'], [1, C.orangeDeep]]));
  c.save();
  c.translate(cx, cy - 4 + press);
  c.scale(1, 0.5);
  for (let i = 0; i < 6; i++) {
    const a = (i / 6) * Math.PI * 2;
    fillEllipse(c, Math.cos(a) * 14, Math.sin(a) * 14, 7, 7, on ? 'rgba(255,255,255,0.85)' : 'rgba(255,240,215,0.75)');
  }
  fillEllipse(c, 0, 0, 7, 7, on ? '#fff' : C.yellow);
  c.restore();
}

function drawPlank(c: Ctx) {
  rr(c, 2, 4, 128, 24, 6);
  c.fillStyle = '#7a5130';
  c.fill();
  rr(c, 2, 1, 128, 22, 6);
  c.fillStyle = vGrad(c, 1, 23, [[0, '#e0aa70'], [1, '#b67a45']]);
  c.fill();
  c.strokeStyle = 'rgba(110,70,35,0.45)';
  c.lineWidth = 1.5;
  c.beginPath(); c.moveTo(12, 9); c.quadraticCurveTo(50, 6, 90, 11); c.moveTo(30, 16); c.quadraticCurveTo(70, 14, 118, 17); c.stroke();
  fillEllipse(c, 10, 12, 2.5, 2.5, '#6b4526');
  fillEllipse(c, 122, 12, 2.5, 2.5, '#6b4526');
}

function drawPost(c: Ctx) {
  rr(c, 3, 6, 14, 44, 5);
  c.fillStyle = vGrad(c, 0, 50, [[0, '#b67a45'], [1, '#7a5130']]);
  c.fill();
  fillEllipse(c, 10, 7, 7, 4, '#d9a46b');
}

function drawArch(c: Ctx) {
  // Arche florale (devant de la porte). Le sol est en bas de la texture.
  const g = 240;
  const r = rng(9);
  for (const x of [22, 158]) {
    rr(c, x - 9, 60, 18, g - 60, 6);
    c.fillStyle = vGrad(c, 60, g, [[0, '#c38d5a'], [1, '#8e5f37']]);
    c.fill();
  }
  c.strokeStyle = '#a7744a';
  c.lineWidth = 16;
  c.beginPath();
  c.moveTo(22, 70);
  c.bezierCurveTo(22, 0, 158, 0, 158, 70);
  c.stroke();
  c.strokeStyle = '#c99462';
  c.lineWidth = 6;
  c.beginPath();
  c.moveTo(22, 66);
  c.bezierCurveTo(24, 6, 156, 6, 158, 66);
  c.stroke();
  // lierre + fleurs le long de l'arche
  for (let t = 0; t <= 1.0001; t += 0.06) {
    const x = (1 - t) ** 3 * 22 + 3 * (1 - t) ** 2 * t * 22 + 3 * (1 - t) * t * t * 158 + t ** 3 * 158;
    const y = (1 - t) ** 3 * 70 + 3 * (1 - t) ** 2 * t * 0 + 3 * (1 - t) * t * t * 0 + t ** 3 * 70;
    leaf(c, x, y, 18, 7, r() * 6.28, '#5fae55', '#3f8a45');
  }
  for (let i = 0; i < 9; i++) {
    const t = i / 8;
    const x = (1 - t) ** 3 * 22 + 3 * (1 - t) ** 2 * t * 22 + 3 * (1 - t) * t * t * 158 + t ** 3 * 158;
    const y = (1 - t) ** 3 * 70 + t ** 3 * 70 + 0;
    flower(c, x, y + 2, 9, ['#f4a7b9', '#ffffff', '#f7e08a', '#b9a3e3'][i % 4]);
  }
  for (const x of [22, 158]) for (let y = 90; y < g - 20; y += 26) leaf(c, x + (r() - 0.5) * 8, y, 16, 6, r() * 6.28, '#4f9e4b');
}

function drawVines(c: Ctx) {
  // Ronces fermant l'arche.
  const r = rng(21);
  c.lineCap = 'round';
  for (let i = 0; i < 9; i++) {
    c.strokeStyle = i % 2 ? '#3f6a33' : '#4f7d3e';
    c.lineWidth = 7;
    c.beginPath();
    const x0 = 10 + r() * 130;
    c.moveTo(x0, 158);
    c.bezierCurveTo(r() * 150, 110, r() * 150, 60, 10 + r() * 130, 6 + r() * 30);
    c.stroke();
  }
  for (let i = 0; i < 36; i++) {
    const x = 10 + r() * 130, y = 10 + r() * 140;
    leaf(c, x, y, 16, 6, r() * 6.28, i % 2 ? '#4f9e4b' : '#3f8a45');
    if (i % 4 === 0) {
      c.fillStyle = '#e6d9b8';
      c.beginPath(); c.moveTo(x, y); c.lineTo(x + 5, y - 9); c.lineTo(x + 8, y + 1); c.fill();
    }
  }
}

function drawHouse(c: Ctx, lit: boolean) {
  const W = 190, g = 222;
  fillEllipse(c, W / 2, g, 86, 14, 'rgba(30,60,30,0.3)');
  // murs
  rr(c, 30, 104, 130, g - 104, 10);
  c.fillStyle = vGrad(c, 104, g, [[0, '#fff6e4'], [1, '#ead7b2']]);
  c.fill();
  // poutres
  c.strokeStyle = '#b98a5a';
  c.lineWidth = 6;
  c.beginPath(); c.moveTo(30, 160); c.lineTo(160, 160); c.stroke();
  // toit
  c.fillStyle = vGrad(c, 20, 120, [[0, '#f6a56a'], [1, '#d9692e']]);
  c.beginPath(); c.moveTo(14, 118); c.quadraticCurveTo(W / 2, 4, 176, 118); c.quadraticCurveTo(W / 2, 104, 14, 118); c.fill();
  c.strokeStyle = 'rgba(150,60,20,0.35)';
  c.lineWidth = 2;
  for (let i = 0; i < 5; i++) { c.beginPath(); c.moveTo(30 + i * 8, 112 - i * 18); c.quadraticCurveTo(W / 2, 100 - i * 18, 160 - i * 8, 112 - i * 18); c.stroke(); }
  // cheminée
  rr(c, 128, 30, 20, 40, 4);
  c.fillStyle = '#c98f6a';
  c.fill();
  // porte ronde
  c.fillStyle = vGrad(c, 160, g, [[0, '#a8683a'], [1, '#7a4a28']]);
  c.beginPath(); c.moveTo(78, g); c.lineTo(78, 178); c.arc(95, 178, 17, Math.PI, 0); c.lineTo(112, g); c.closePath(); c.fill();
  fillEllipse(c, 106, 198, 3, 3, C.yellowDeep);
  // fenêtres
  for (const x of [52, 138]) {
    rr(c, x - 16, 172, 32, 30, 8);
    c.fillStyle = lit ? rGrad(c, x, 186, 2, 26, [[0, '#fff8c8'], [1, '#f7c04a']]) : '#7fb7c4';
    c.fill();
    c.strokeStyle = '#b98a5a';
    c.lineWidth = 4;
    c.stroke();
    c.beginPath(); c.moveTo(x, 172); c.lineTo(x, 202); c.moveTo(x - 16, 187); c.lineTo(x + 16, 187); c.stroke();
  }
  // fenêtre du toit
  fillEllipse(c, W / 2, 76, 15, 15, lit ? '#ffe98a' : '#7fb7c4');
  c.strokeStyle = '#fff4dc';
  c.lineWidth = 4;
  ellipse(c, W / 2, 76, 15, 15);
  c.stroke();
  // fleurs au pied
  for (let i = 0; i < 6; i++) flower(c, 36 + i * 24, g - 4, 7, ['#f4a7b9', '#f7e08a', '#b9a3e3'][i % 3]);
}

function drawGate(c: Ctx) {
  const g = 212;
  fillEllipse(c, 90, g + 2, 80, 10, 'rgba(30,60,30,0.28)');
  for (const x of [26, 154]) {
    rr(c, x - 11, 50, 22, g - 50, 6);
    c.fillStyle = vGrad(c, 50, g, [[0, '#f3e6c8'], [1, '#cbb48a']]);
    c.fill();
    fillEllipse(c, x, 50, 14, 8, '#fff4dc');
  }
  c.strokeStyle = '#efe0bd';
  c.lineWidth = 12;
  c.beginPath(); c.moveTo(26, 60); c.quadraticCurveTo(90, -8, 154, 60); c.stroke();
  // portillon ouvert (lattes)
  c.fillStyle = '#f6eed9';
  for (let i = 0; i < 4; i++) {
    rr(c, 44 + i * 12, 130, 8, g - 136, 3);
    c.fill();
  }
  c.strokeStyle = '#d9c8a2';
  c.lineWidth = 4;
  c.beginPath(); c.moveTo(42, 150); c.lineTo(94, 150); c.moveTo(42, 190); c.lineTo(94, 190); c.stroke();
  // fleurs grimpantes
  const r = rng(3);
  for (let i = 0; i < 12; i++) {
    const t = i / 11;
    const x = 26 + t * 128, y = 60 - Math.sin(t * Math.PI) * 52;
    leaf(c, x, y, 16, 6, r() * 6.28, '#5fae55');
    if (i % 2 === 0) flower(c, x, y, 8, ['#f4a7b9', '#f7e08a', '#ffffff'][i % 3]);
  }
  // panneau
  rr(c, 110, 140, 44, 30, 6);
  c.fillStyle = C.wood;
  c.fill();
  c.fillStyle = '#fff4dc';
  c.beginPath(); c.moveTo(118, 155); c.lineTo(140, 155); c.lineTo(140, 149); c.lineTo(148, 156); c.lineTo(140, 163); c.lineTo(140, 158); c.lineTo(118, 158); c.fill();
}

function drawBurrow(c: Ctx) {
  const g = 162;
  fillEllipse(c, 90, g, 86, 12, 'rgba(30,60,30,0.3)');
  // colline
  c.fillStyle = rGrad(c, 70, 60, 10, 110, [[0, '#a6d97a'], [0.6, '#6fbd60'], [1, '#448f44']]);
  c.beginPath(); c.moveTo(4, g); c.bezierCurveTo(10, 30, 170, 30, 176, g); c.closePath(); c.fill();
  const r = rng(8);
  for (let i = 0; i < 30; i++) leaf(c, 20 + r() * 140, 60 + r() * 90, 14, 5, r() * 6.28, i % 2 ? '#5fae55' : '#86cf74');
  // porte ronde
  fillEllipse(c, 90, g - 32, 38, 38, '#7a4a28');
  fillEllipse(c, 90, g - 32, 32, 32, rGrad(c, 84, g - 44, 2, 36, [[0, '#d39b62'], [1, '#9a6038']]));
  c.strokeStyle = 'rgba(90,50,20,0.4)';
  c.lineWidth = 2;
  for (let i = -2; i <= 2; i++) { c.beginPath(); c.moveTo(90 + i * 12, g - 62); c.lineTo(90 + i * 12, g - 2); c.stroke(); }
  fillEllipse(c, 104, g - 30, 4, 4, C.yellowDeep);
  c.fillRect(0, g, 180, 10);
  c.clearRect(0, g + 1, 180, 10);
  for (let i = 0; i < 5; i++) flower(c, 30 + i * 30, g - 6 - (i % 2) * 6, 7, ['#f4a7b9', '#f7e08a', '#ffffff'][i % 3]);
}

function drawCloud(c: Ctx) {
  const blobs: [number, number, number][] = [[60, 70, 40], [110, 52, 50], [165, 66, 40], [120, 80, 36]];
  for (const [x, y, r] of blobs) fillEllipse(c, x, y + 6, r, r * 0.8, 'rgba(160,200,200,0.25)');
  for (const [x, y, r] of blobs) fillEllipse(c, x, y, r, r * 0.8, rGrad(c, x - 10, y - 14, 4, r, [[0, '#ffffff'], [1, '#eef7f6']]));
}

function drawHand(c: Ctx) {
  // main-pointeur du tutoriel
  c.fillStyle = 'rgba(0,0,0,0.15)';
  rr(c, 30, 20, 34, 90, 17);
  c.fill();
  c.fillStyle = '#fff7ee';
  c.strokeStyle = '#5a4636';
  c.lineWidth = 4;
  c.beginPath();
  c.moveTo(34, 60); c.lineTo(34, 18); c.arc(44, 18, 10, Math.PI, 0); c.lineTo(54, 56);
  c.arc(62, 56, 8, Math.PI, 0); c.arc(76, 62, 8, Math.PI, 0); c.lineTo(84, 92);
  c.quadraticCurveTo(82, 114, 58, 114); c.quadraticCurveTo(34, 114, 22, 90); c.lineTo(14, 72);
  c.quadraticCurveTo(12, 62, 22, 62); c.closePath();
  c.fill(); c.stroke();
}

// =====================================================================
// Interface
// =====================================================================

function drawStar(c: Ctx, full: boolean) {
  starPath(c, 50, 54, 44, 20);
  c.fillStyle = full ? '#d99a1f' : 'rgba(80,90,70,0.25)';
  c.fill();
  starPath(c, 50, 50, 44, 20);
  c.lineJoin = 'round';
  if (full) {
    c.fillStyle = vGrad(c, 6, 94, [[0, '#fff1a8'], [0.5, '#f7d35c'], [1, '#f2a93b']]);
    c.fill();
    c.strokeStyle = '#fff6d0';
    c.lineWidth = 4;
    c.stroke();
    fillEllipse(c, 38, 34, 8, 5, 'rgba(255,255,255,0.75)');
  } else {
    c.fillStyle = 'rgba(240,232,210,0.95)';
    c.fill();
    c.strokeStyle = 'rgba(160,150,120,0.8)';
    c.lineWidth = 4;
    c.stroke();
  }
}

function drawRoundButton(c: Ctx, face: string, side: string) {
  fillEllipse(c, 75, 84, 68, 66, 'rgba(50,70,40,0.22)');
  fillEllipse(c, 75, 78, 68, 68, side);
  fillEllipse(c, 75, 70, 68, 68, vGrad(c, 2, 138, [[0, shade(face, 0.35)], [1, face]]));
  c.strokeStyle = 'rgba(255,255,255,0.7)';
  c.lineWidth = 3;
  c.beginPath(); c.ellipse(75, 70, 60, 60, 0, Math.PI * 1.1, Math.PI * 1.6); c.stroke();
}

function drawPill(c: Ctx, w: number, h: number, face: string, side: string) {
  const r = (h - 16) / 2;
  rr(c, 4, 14, w - 8, h - 16, r);
  c.fillStyle = 'rgba(50,70,40,0.22)';
  c.fill();
  rr(c, 4, 8, w - 8, h - 14, r);
  c.fillStyle = side;
  c.fill();
  rr(c, 4, 2, w - 8, h - 16, r);
  c.fillStyle = vGrad(c, 2, h - 14, [[0, shade(face, 0.3)], [1, face]]);
  c.fill();
  c.strokeStyle = 'rgba(255,255,255,0.55)';
  c.lineWidth = 3;
  rr(c, 14, 8, w - 28, (h - 16) * 0.45, r * 0.8);
  c.stroke();
}

function ink(c: Ctx, w = 7) {
  c.strokeStyle = C.ink;
  c.fillStyle = C.ink;
  c.lineWidth = w;
  c.lineCap = 'round';
  c.lineJoin = 'round';
}
function iconUndo(c: Ctx) {
  ink(c);
  c.beginPath(); c.moveTo(22, 30); c.lineTo(46, 30); c.quadraticCurveTo(60, 30, 60, 44); c.quadraticCurveTo(60, 58, 46, 58); c.lineTo(28, 58); c.stroke();
  c.beginPath(); c.moveTo(30, 18); c.lineTo(16, 30); c.lineTo(30, 42); c.stroke();
}
function iconRestart(c: Ctx) {
  ink(c);
  c.beginPath(); c.arc(36, 38, 20, -Math.PI * 0.35, Math.PI * 1.45); c.stroke();
  c.beginPath(); c.moveTo(46, 12); c.lineTo(52, 22); c.lineTo(40, 26); c.stroke();
}
function iconPause(c: Ctx) {
  c.fillStyle = C.ink;
  rr(c, 22, 18, 10, 36, 5); c.fill();
  rr(c, 40, 18, 10, 36, 5); c.fill();
}
function iconSound(c: Ctx, on: boolean) {
  ink(c, 5);
  c.beginPath(); c.moveTo(14, 28); c.lineTo(24, 28); c.lineTo(36, 16); c.lineTo(36, 56); c.lineTo(24, 44); c.lineTo(14, 44); c.closePath(); c.fill();
  if (on) {
    c.beginPath(); c.arc(38, 36, 10, -0.9, 0.9); c.stroke();
    c.beginPath(); c.arc(38, 36, 20, -0.9, 0.9); c.stroke();
  } else {
    c.beginPath(); c.moveTo(46, 26); c.lineTo(62, 46); c.moveTo(62, 26); c.lineTo(46, 46); c.stroke();
  }
}
function iconHome(c: Ctx) {
  ink(c, 6);
  c.beginPath(); c.moveTo(12, 36); c.lineTo(36, 14); c.lineTo(60, 36); c.stroke();
  c.beginPath(); c.moveTo(20, 32); c.lineTo(20, 58); c.lineTo(52, 58); c.lineTo(52, 32); c.stroke();
  rr(c, 31, 42, 10, 16, 3); c.fill();
}
function iconLock(c: Ctx) {
  c.strokeStyle = '#8a7a5c';
  c.lineWidth = 7;
  c.beginPath(); c.arc(36, 30, 13, Math.PI, 0); c.lineTo(49, 36); c.moveTo(23, 30); c.lineTo(23, 36); c.stroke();
  rr(c, 14, 34, 44, 30, 8);
  c.fillStyle = vGrad(c, 34, 64, [[0, '#f2c94c'], [1, '#d99a1f']]);
  c.fill();
  fillEllipse(c, 36, 47, 4, 4, '#7a5a1c');
  c.fillStyle = '#7a5a1c';
  c.fillRect(34, 47, 4, 9);
}
function iconBack(c: Ctx) {
  ink(c);
  c.beginPath(); c.moveTo(44, 16); c.lineTo(24, 36); c.lineTo(44, 56); c.stroke();
}
function iconNext(c: Ctx) {
  ink(c);
  c.beginPath(); c.moveTo(28, 16); c.lineTo(48, 36); c.lineTo(28, 56); c.stroke();
}
function iconPlay(c: Ctx) {
  c.fillStyle = C.ink;
  c.beginPath(); c.moveTo(24, 16); c.lineTo(56, 36); c.lineTo(24, 56); c.closePath(); c.fill();
}
function iconBook(c: Ctx) {
  ink(c, 5);
  c.beginPath(); c.moveTo(36, 22); c.quadraticCurveTo(24, 14, 10, 18); c.lineTo(10, 54); c.quadraticCurveTo(24, 50, 36, 58);
  c.quadraticCurveTo(48, 50, 62, 54); c.lineTo(62, 18); c.quadraticCurveTo(48, 14, 36, 22); c.lineTo(36, 58); c.stroke();
}
function iconGear(c: Ctx) {
  c.fillStyle = C.ink;
  for (let i = 0; i < 8; i++) {
    c.save(); c.translate(36, 36); c.rotate((i / 8) * Math.PI * 2);
    rr(c, -6, -28, 12, 14, 3); c.fill();
    c.restore();
  }
  fillEllipse(c, 36, 36, 19, 19, C.ink);
  fillEllipse(c, 36, 36, 8, 8, C.cream);
}
function iconCheck(c: Ctx) {
  c.strokeStyle = C.meadowDark;
  c.lineWidth = 9;
  c.lineCap = 'round';
  c.lineJoin = 'round';
  c.beginPath(); c.moveTo(16, 38); c.lineTo(30, 52); c.lineTo(56, 22); c.stroke();
}
function iconMotion(c: Ctx) {
  ink(c, 5);
  c.beginPath(); c.moveTo(12, 26); c.quadraticCurveTo(24, 16, 36, 26); c.quadraticCurveTo(48, 36, 60, 26); c.stroke();
  c.beginPath(); c.moveTo(12, 46); c.quadraticCurveTo(24, 36, 36, 46); c.quadraticCurveTo(48, 56, 60, 46); c.stroke();
}

export { withAlpha };
