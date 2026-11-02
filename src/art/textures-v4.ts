// Textures ajoutées en V4 : levier, balise, cosmétiques, badges, icônes de navigation.
import type Phaser from 'phaser';
import { C } from './palette';
import { canvas, type Ctx, ellipse, fillEllipse, flower, leaf, rGrad, rr, starPath, vGrad } from './draw';

export function generateTexturesV4(scene: Phaser.Scene) {
  const add = (key: string, w: number, h: number, draw: (c: Ctx) => void) => {
    if (scene.textures.exists(key)) return;
    const [cv, ctx] = canvas(w, h);
    draw(ctx);
    scene.textures.addCanvas(key, cv);
  };

  // ---------- Levier (remplace la dalle) ----------
  for (const on of [false, true]) {
    add(on ? 'lever-on' : 'lever-off', 130, 120, (c) => {
      const cx = 65, by = 96;
      fillEllipse(c, cx, by + 10, 52, 16, 'rgba(30,60,30,0.28)');
      // socle de pierre
      rr(c, cx - 40, by - 26, 80, 34, 14);
      c.fillStyle = vGrad(c, by - 26, by + 8, [[0, '#e9e2d0'], [1, '#a9a18e']]);
      c.fill();
      rr(c, cx - 30, by - 30, 60, 12, 6);
      c.fillStyle = '#7c7462';
      c.fill();
      // manche
      const ang = on ? 0.75 : -0.75;
      c.save();
      c.translate(cx, by - 24);
      c.rotate(ang);
      rr(c, -6, -70, 12, 72, 6);
      c.fillStyle = vGrad(c, -70, 0, [[0, '#d39b62'], [1, '#8e5f37']]);
      c.fill();
      fillEllipse(c, 0, -72, 15, 15, on ? rGrad(c, -4, -76, 2, 16, [[0, '#d8fff7'], [1, C.turquoiseDeep]]) : rGrad(c, -4, -76, 2, 16, [[0, '#ffd9a8'], [1, C.orangeDeep]]));
      fillEllipse(c, -4, -76, 4, 4, 'rgba(255,255,255,0.8)');
      c.restore();
      fillEllipse(c, cx, by - 24, 9, 9, '#5f5848');
      if (on) fillEllipse(c, cx, by - 8, 30, 8, 'rgba(126,207,196,0.6)');
    });
  }

  // ---------- Balise du Grand Sentier ----------
  for (const lit of [false, true]) {
    add(lit ? 'beacon-lit' : 'beacon', 170, 250, (c) => {
      const cx = 85, g = 238;
      fillEllipse(c, cx, g, 70, 12, 'rgba(30,60,30,0.3)');
      // marches
      rr(c, cx - 58, g - 30, 116, 30, 10);
      c.fillStyle = vGrad(c, g - 30, g, [[0, '#ece5d3'], [1, '#b9b09a']]);
      c.fill();
      rr(c, cx - 42, g - 52, 84, 26, 8);
      c.fillStyle = vGrad(c, g - 52, g - 26, [[0, '#f3eee2'], [1, '#c9c0aa']]);
      c.fill();
      // pilier
      c.fillStyle = vGrad(c, 70, g - 50, [[0, '#f3eee2'], [1, '#bdb39b']]);
      c.beginPath(); c.moveTo(cx - 26, g - 50); c.lineTo(cx - 20, 92); c.lineTo(cx + 20, 92); c.lineTo(cx + 26, g - 50); c.closePath(); c.fill();
      c.strokeStyle = 'rgba(120,110,90,0.35)';
      c.lineWidth = 2;
      for (let y = 110; y < g - 60; y += 22) { c.beginPath(); c.moveTo(cx - 22, y); c.lineTo(cx + 22, y); c.stroke(); }
      // lierre
      for (let i = 0; i < 9; i++) leaf(c, cx - 22 + (i % 3) * 18, g - 60 - i * 12, 14, 5, i * 1.3, i % 2 ? '#5fae55' : '#7cc96a');
      // vasque + cristal
      rr(c, cx - 34, 76, 68, 20, 8);
      c.fillStyle = '#a99f86';
      c.fill();
      if (lit) {
        c.fillStyle = rGrad(c, cx, 50, 4, 80, [[0, 'rgba(255,250,210,0.95)'], [0.4, 'rgba(255,225,140,0.5)'], [1, 'rgba(255,220,120,0)']]);
        c.fillRect(0, 0, 170, 140);
      }
      c.fillStyle = lit ? vGrad(c, 20, 80, [[0, '#fffbe0'], [1, '#f2c94c']]) : vGrad(c, 20, 80, [[0, '#d6efe9'], [1, '#7fa9a4']]);
      c.beginPath(); c.moveTo(cx, 18); c.lineTo(cx + 20, 50); c.lineTo(cx, 82); c.lineTo(cx - 20, 50); c.closePath(); c.fill();
      c.strokeStyle = 'rgba(255,255,255,0.8)';
      c.lineWidth = 3;
      c.beginPath(); c.moveTo(cx - 6, 34); c.lineTo(cx, 24); c.stroke();
    });
  }

  // ---------- Cosmétiques ----------
  add('hat-gardener', 150, 80, (c) => {
    // chapeau de paille vu de face (posé sur la tête de Bourgeon)
    fillEllipse(c, 75, 58, 72, 18, '#b88a3e');
    fillEllipse(c, 75, 54, 72, 18, vGrad(c, 36, 72, [[0, '#f6dc94'], [1, '#d9ae5a']]));
    c.beginPath();
    c.moveTo(34, 56); c.bezierCurveTo(36, 8, 114, 8, 116, 56); c.closePath();
    c.fillStyle = vGrad(c, 10, 56, [[0, '#fbe7a6'], [1, '#e2b862']]);
    c.fill();
    c.strokeStyle = 'rgba(150,105,40,0.35)';
    c.lineWidth = 2;
    for (let i = 0; i < 4; i++) { c.beginPath(); c.moveTo(40 + i * 3, 50 - i * 9); c.quadraticCurveTo(75, 44 - i * 10, 110 - i * 3, 50 - i * 9); c.stroke(); }
    // ruban vert + fleur
    c.fillStyle = C.meadowDark;
    c.beginPath(); c.moveTo(36, 50); c.quadraticCurveTo(75, 60, 114, 50); c.lineTo(113, 40); c.quadraticCurveTo(75, 50, 37, 40); c.closePath(); c.fill();
    flower(c, 104, 42, 9, '#f4a7b9');
  });
  add('scarf-golden', 90, 60, (c) => {
    c.fillStyle = vGrad(c, 10, 40, [[0, '#ffe9a0'], [1, '#e0a92a']]);
    c.beginPath(); c.moveTo(6, 16); c.quadraticCurveTo(45, 34, 84, 16); c.lineTo(84, 30); c.quadraticCurveTo(45, 48, 6, 30); c.closePath(); c.fill();
    rr(c, 56, 30, 14, 26, 6); c.fill();
    c.strokeStyle = 'rgba(255,255,255,0.6)'; c.lineWidth = 2;
    c.beginPath(); c.moveTo(12, 22); c.quadraticCurveTo(45, 38, 78, 22); c.stroke();
  });
  add('magic-flower', 90, 120, (c) => {
    fillEllipse(c, 45, 112, 26, 7, 'rgba(30,60,30,0.25)');
    c.strokeStyle = C.meadowDark; c.lineWidth = 5; c.lineCap = 'round';
    c.beginPath(); c.moveTo(45, 110); c.quadraticCurveTo(40, 80, 45, 50); c.stroke();
    leaf(c, 44, 88, 30, 11, -2.7, C.meadow, C.meadowDark);
    leaf(c, 46, 78, 30, 11, -0.4, C.hedgeLight, C.meadowDark);
    c.fillStyle = rGrad(c, 45, 40, 2, 44, [[0, 'rgba(255,250,220,0.9)'], [1, 'rgba(255,240,200,0)']]);
    c.fillRect(0, 0, 90, 90);
    for (let i = 0; i < 6; i++) {
      const a = (i / 6) * Math.PI * 2;
      c.save(); c.translate(45, 40); c.rotate(a);
      c.fillStyle = vGrad(c, -30, 0, [[0, '#d6c6ff'], [1, '#f4a7b9']]);
      c.beginPath(); c.ellipse(0, -16, 9, 17, 0, 0, Math.PI * 2); c.fill();
      c.restore();
    }
    fillEllipse(c, 45, 40, 10, 10, rGrad(c, 43, 37, 1, 11, [[0, '#ffffff'], [1, C.yellowDeep]]));
  });
  add('lantern', 60, 110, (c) => {
    fillEllipse(c, 30, 104, 16, 5, 'rgba(30,60,30,0.25)');
    rr(c, 27, 40, 6, 64, 3); c.fillStyle = '#6b5a45'; c.fill();
    c.fillStyle = rGrad(c, 30, 30, 2, 30, [[0, 'rgba(255,240,180,0.9)'], [1, 'rgba(255,230,150,0)']]);
    c.fillRect(0, 0, 60, 60);
    rr(c, 16, 14, 28, 32, 8); c.fillStyle = vGrad(c, 14, 46, [[0, '#fff3c4'], [1, '#f2b84b']]); c.fill();
    c.strokeStyle = '#6b5a45'; c.lineWidth = 3; rr(c, 16, 14, 28, 32, 8); c.stroke();
    c.fillStyle = '#6b5a45'; c.beginPath(); c.moveTo(12, 16); c.lineTo(30, 4); c.lineTo(48, 16); c.closePath(); c.fill();
  });
  const badge = (key: string, col: string, inner: (c: Ctx) => void) => add(key, 120, 130, (c) => {
    // ruban
    c.fillStyle = C.turquoiseDeep;
    c.beginPath(); c.moveTo(38, 80); c.lineTo(28, 126); c.lineTo(46, 114); c.lineTo(58, 126); c.lineTo(60, 84); c.fill();
    c.fillStyle = C.orange;
    c.beginPath(); c.moveTo(82, 80); c.lineTo(92, 126); c.lineTo(74, 114); c.lineTo(62, 126); c.lineTo(60, 84); c.fill();
    fillEllipse(c, 60, 58, 50, 50, '#c48a1e');
    fillEllipse(c, 60, 54, 50, 50, vGrad(c, 4, 104, [[0, '#fff1a8'], [1, col]]));
    fillEllipse(c, 60, 54, 38, 38, 'rgba(255,255,255,0.35)');
    inner(c);
  });
  badge('badge-garden', '#e8b23a', (c) => {
    leaf(c, 60, 72, 34, 13, -2.0, C.meadow, C.meadowDark);
    leaf(c, 60, 72, 34, 13, -1.1, C.hedgeLight, C.meadowDark);
  });
  badge('badge-daily', '#e8b23a', (c) => {
    rr(c, 38, 32, 44, 44, 8); c.fillStyle = '#fffaf0'; c.fill();
    c.fillStyle = C.red; rr(c, 38, 32, 44, 12, 6); c.fill();
    c.fillStyle = C.ink; c.font = '700 26px Fredoka, sans-serif'; c.textAlign = 'center'; c.fillText('1', 60, 70);
  });
  add('badge-locked', 120, 130, (c) => {
    fillEllipse(c, 60, 58, 50, 50, 'rgba(120,120,100,0.25)');
    fillEllipse(c, 60, 54, 50, 50, '#e8e1cf');
    c.strokeStyle = 'rgba(140,130,105,0.6)'; c.lineWidth = 4; c.setLineDash([8, 7]); ellipse(c, 60, 54, 40, 40); c.stroke();
  });

  // ---------- Icônes de navigation ----------
  const ink = (c: Ctx, w = 6) => { c.strokeStyle = C.ink; c.fillStyle = C.ink; c.lineWidth = w; c.lineCap = 'round'; c.lineJoin = 'round'; };
  const icons: Record<string, (c: Ctx) => void> = {
    map: (c) => {
      ink(c, 5);
      c.beginPath(); c.moveTo(10, 18); c.lineTo(26, 12); c.lineTo(46, 20); c.lineTo(62, 14); c.lineTo(62, 56); c.lineTo(46, 62); c.lineTo(26, 54); c.lineTo(10, 60); c.closePath(); c.stroke();
      c.beginPath(); c.moveTo(26, 12); c.lineTo(26, 54); c.moveTo(46, 20); c.lineTo(46, 62); c.stroke();
    },
    flag: (c) => {
      ink(c, 6);
      c.beginPath(); c.moveTo(18, 62); c.lineTo(18, 10); c.stroke();
      c.beginPath(); c.moveTo(20, 12); c.quadraticCurveTo(36, 4, 44, 14); c.quadraticCurveTo(52, 22, 62, 14); c.lineTo(62, 38); c.quadraticCurveTo(52, 46, 44, 38); c.quadraticCurveTo(36, 28, 20, 36); c.closePath(); c.fill();
    },
    chest: (c) => {
      ink(c, 5);
      rr(c, 10, 28, 52, 32, 6); c.stroke();
      c.beginPath(); c.moveTo(10, 32); c.quadraticCurveTo(10, 12, 36, 12); c.quadraticCurveTo(62, 12, 62, 32); c.stroke();
      c.beginPath(); c.moveTo(10, 36); c.lineTo(62, 36); c.stroke();
      rr(c, 31, 32, 10, 12, 3); c.fill();
    },
    people: (c) => {
      ink(c, 5);
      fillEllipse(c, 26, 24, 9, 9, C.ink); fillEllipse(c, 48, 26, 8, 8, C.ink);
      c.beginPath(); c.arc(26, 56, 16, Math.PI, 0); c.stroke();
      c.beginPath(); c.arc(48, 58, 13, Math.PI * 1.05, -0.05); c.stroke();
    },
    share: (c) => {
      ink(c, 5);
      c.beginPath(); c.moveTo(36, 44); c.lineTo(36, 12); c.moveTo(24, 24); c.lineTo(36, 12); c.lineTo(48, 24); c.stroke();
      c.beginPath(); c.moveTo(22, 34); c.lineTo(14, 34); c.lineTo(14, 62); c.lineTo(58, 62); c.lineTo(58, 34); c.lineTo(50, 34); c.stroke();
    },
    trophy: (c) => {
      ink(c, 5);
      c.beginPath(); c.moveTo(20, 12); c.lineTo(52, 12); c.lineTo(50, 34); c.quadraticCurveTo(36, 48, 22, 34); c.closePath(); c.stroke();
      c.beginPath(); c.moveTo(20, 18); c.quadraticCurveTo(6, 18, 12, 30); c.quadraticCurveTo(16, 36, 24, 36); c.moveTo(52, 18); c.quadraticCurveTo(66, 18, 60, 30); c.quadraticCurveTo(56, 36, 48, 36); c.stroke();
      c.beginPath(); c.moveTo(36, 44); c.lineTo(36, 54); c.moveTo(24, 60); c.lineTo(48, 60); c.stroke();
    },
    star: (c) => { starPath(c, 36, 38, 26, 12); c.fillStyle = C.yellowDeep; c.fill(); c.strokeStyle = C.ink; c.lineWidth = 4; c.lineJoin = 'round'; c.stroke(); },
    steps: (c) => {
      for (const [x, y, a] of [[24, 48, -0.3], [44, 24, 0.3]] as const) {
        c.save(); c.translate(x, y); c.rotate(a);
        fillEllipse(c, 0, 0, 9, 13, C.ink); fillEllipse(c, 0, -18, 6, 5, C.ink);
        c.restore();
      }
    },
  };
  Object.entries(icons).forEach(([k, d]) => add(`icon-${k}`, 72, 72, d));
}
