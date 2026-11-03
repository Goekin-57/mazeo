// Textures v0.5 : sortie unifiée (arche + drapeau + socle), case disparue, repère de la case
// du personnage, icônes vectorielles de l'interface (tracés au canevas, sans emoji).
import type Phaser from 'phaser';
import { C } from './palette';
import { canvas, type Ctx, fillEllipse, flower, leaf, rr, vGrad } from './draw';
import { BD, BT } from './textures';

export const ICON = 96; // taille de dessin des icônes (affichées à 22–24 px CSS)

export function generateTexturesV5(scene: Phaser.Scene) {
  const add = (key: string, w: number, h: number, draw: (c: Ctx) => void) => {
    if (scene.textures.exists(key)) return;
    const [cv, ctx] = canvas(w, h);
    draw(ctx);
    scene.textures.addCanvas(key, cv);
  };

  // ---------- Sortie : socle clair + arche à toit + porte (fermée / ouverte) ----------
  for (const open of [false, true]) add(open ? 'exit-open' : 'exit-closed', 180, 230, (c) => drawExit(c, open));
  add('exit-flag', 70, 80, drawFlag);
  add('exit-lock', 64, 70, drawLockBadge);

  // ---------- Case disparue : dalle effondrée, terre et cailloux (plate, ≠ obstacle) ----------
  add('tile-gone', BT, BD, drawGone);
  // ---------- Repère de la case du personnage ----------
  add('cell-ring', BT, BD, (c) => {
    c.strokeStyle = '#ffffff';
    c.lineWidth = 12;
    rr(c, 12, 12, BT - 24, BD - 24, 22);
    c.stroke();
    c.strokeStyle = C.orange;
    c.lineWidth = 7;
    c.setLineDash([18, 10]);
    rr(c, 12, 12, BT - 24, BD - 24, 22);
    c.stroke();
    c.setLineDash([]);
  });
  // ---------- Graine : socle doré pour la distinguer des fleurs décoratives ----------
  add('item-base', BT, BD, (c) => {
    fillEllipse(c, BT / 2, BD / 2 + 14, 50, 22, 'rgba(242,201,76,0.35)');
    c.strokeStyle = '#d99a1f';
    c.lineWidth = 5;
    c.setLineDash([10, 8]);
    c.beginPath();
    c.ellipse(BT / 2, BD / 2 + 14, 50, 22, 0, 0, Math.PI * 2);
    c.stroke();
    c.setLineDash([]);
  });

  // ---------- Icônes (traits arrondis, couleur encre ; teintées si besoin) ----------
  const icons: Record<string, (c: Ctx) => void> = {
    'ic-undo': icUndo, 'ic-restart': icRestart, 'ic-pause': icPause, 'ic-back': icBack, 'ic-home': icHome,
    'ic-map': icMap, 'ic-flag': icFlag, 'ic-chest': icChest, 'ic-hint': icHint, 'ic-help': icHelp, 'ic-share': icShare,
    'ic-lock': icLock, 'ic-check': icCheck, 'ic-play': icPlay, 'ic-gear': icGear, 'ic-steps': icSteps, 'ic-star': icStar,
    'ic-close': icClose, 'ic-trophy': icTrophy, 'ic-copy': icCopy,
  };
  for (const [k, f] of Object.entries(icons)) add(k, ICON, ICON, (c) => { stroke(c); f(c); });
}

function stroke(c: Ctx, w = 8) {
  c.strokeStyle = C.ink;
  c.fillStyle = C.ink;
  c.lineWidth = w;
  c.lineCap = 'round';
  c.lineJoin = 'round';
}

function drawExit(c: Ctx, open: boolean) {
  const cx = 90, base = 214;
  // ombre + socle clair à bord sombre (lisible en niveaux de gris)
  fillEllipse(c, cx, base + 6, 80, 14, 'rgba(30,50,30,0.30)');
  rr(c, 14, base - 30, 152, 36, 14);
  c.fillStyle = '#5b5446';
  c.fill();
  rr(c, 16, base - 34, 148, 32, 12);
  c.fillStyle = vGrad(c, base - 34, base - 2, [[0, '#fffaf0'], [1, '#d9ceb6']]);
  c.fill();
  c.strokeStyle = '#4a4438';
  c.lineWidth = 4;
  c.stroke();
  // piliers + arche
  const top = 70, w = 112, x0 = cx - w / 2;
  c.beginPath();
  c.moveTo(x0, base - 32);
  c.lineTo(x0, top + 40);
  c.arc(cx, top + 40, w / 2, Math.PI, 0);
  c.lineTo(x0 + w, base - 32);
  c.closePath();
  c.fillStyle = vGrad(c, top, base, [[0, '#f4e7c8'], [1, '#c9b28a']]);
  c.fill();
  c.strokeStyle = '#3d4a3a';
  c.lineWidth = 6;
  c.stroke();
  // ouverture
  const iw = 68, ix = cx - iw / 2;
  c.beginPath();
  c.moveTo(ix, base - 32);
  c.lineTo(ix, top + 60);
  c.arc(cx, top + 60, iw / 2, Math.PI, 0);
  c.lineTo(ix + iw, base - 32);
  c.closePath();
  if (open) {
    c.fillStyle = vGrad(c, top + 26, base - 32, [[0, '#fff6c8'], [1, '#ffd36b']]);
    c.fill();
    // rayons lumineux
    c.strokeStyle = 'rgba(255,255,255,0.8)';
    c.lineWidth = 4;
    for (let k = -1; k <= 1; k++) { c.beginPath(); c.moveTo(cx + k * 16, base - 40); c.lineTo(cx + k * 22, top + 50); c.stroke(); }
  } else {
    c.fillStyle = vGrad(c, top + 26, base - 32, [[0, '#a8743f'], [1, '#7a4f2a']]);
    c.fill();
    // planches de la porte
    c.strokeStyle = 'rgba(50,30,15,0.55)';
    c.lineWidth = 3;
    for (let k = 1; k < 4; k++) { c.beginPath(); c.moveTo(ix + (iw * k) / 4, top + 34); c.lineTo(ix + (iw * k) / 4, base - 34); c.stroke(); }
  }
  c.strokeStyle = '#3d4a3a';
  c.lineWidth = 5;
  c.stroke();
  // petit toit
  c.beginPath();
  c.moveTo(cx - 74, top + 22);
  c.lineTo(cx, top - 26);
  c.lineTo(cx + 74, top + 22);
  c.closePath();
  c.fillStyle = vGrad(c, top - 26, top + 22, [[0, '#f08a5d'], [1, '#c45d3a']]);
  c.fill();
  c.strokeStyle = '#3d4a3a';
  c.lineWidth = 5;
  c.stroke();
  // mâts du drapeau (le drapeau est une image séparée, animable)
  c.fillStyle = '#3d4a3a';
  c.fillRect(cx - 3, top - 66, 6, 44);
  // feuillage au pied
  leaf(c, x0 - 4, base - 36, 26, 9, -2.4, C.hedgeLight, C.hedge);
  leaf(c, x0 + w + 4, base - 36, 26, 9, -0.7, C.hedgeLight, C.hedge);
  flower(c, x0 + 2, base - 44, 8, '#ffffff');
}

function drawFlag(c: Ctx) {
  c.beginPath();
  c.moveTo(6, 8);
  c.quadraticCurveTo(36, 0, 62, 14);
  c.quadraticCurveTo(40, 22, 62, 40);
  c.quadraticCurveTo(34, 30, 6, 40);
  c.closePath();
  c.fillStyle = vGrad(c, 0, 40, [[0, '#5fd0c3'], [1, '#2f9d93']]);
  c.fill();
  c.strokeStyle = '#3d4a3a';
  c.lineWidth = 4;
  c.stroke();
  c.fillStyle = '#ffffff';
  c.beginPath();
  c.arc(26, 22, 6, 0, Math.PI * 2);
  c.fill();
}

function drawLockBadge(c: Ctx) {
  fillEllipse(c, 32, 36, 30, 30, '#3d4a3a');
  fillEllipse(c, 32, 34, 27, 27, '#fffbf0');
  c.strokeStyle = '#3d4a3a';
  c.lineWidth = 6;
  c.lineCap = 'round';
  c.beginPath();
  c.arc(32, 28, 9, Math.PI, 0);
  c.lineTo(41, 33);
  c.moveTo(23, 28);
  c.lineTo(23, 33);
  c.stroke();
  rr(c, 18, 31, 28, 20, 5);
  c.fillStyle = '#d99a1f';
  c.fill();
  c.lineWidth = 3;
  c.stroke();
}

function drawGone(c: Ctx) {
  const ins = 10;
  // creux de terre (plus sombre que l'herbe et que les dalles), bord en pointillés
  rr(c, ins, ins + 6, BT - ins * 2, BD - ins * 2 - 6, 22);
  c.fillStyle = vGrad(c, ins, BD - ins, [[0, '#6b4a30'], [1, '#8c6644']]);
  c.fill();
  c.strokeStyle = 'rgba(255,240,210,0.75)';
  c.lineWidth = 4;
  c.setLineDash([12, 9]);
  rr(c, ins + 4, ins + 10, BT - ins * 2 - 8, BD - ins * 2 - 14, 18);
  c.stroke();
  c.setLineDash([]);
  // fissures
  c.strokeStyle = 'rgba(40,25,12,0.7)';
  c.lineWidth = 3;
  c.beginPath();
  c.moveTo(40, 40); c.lineTo(62, 58); c.lineTo(56, 80);
  c.moveTo(110, 36); c.lineTo(96, 62); c.lineTo(118, 86);
  c.stroke();
  // cailloux
  for (const [x, y, r] of [[48, 92, 7], [112, 54, 6], [80, 70, 5], [124, 96, 6]] as const) {
    fillEllipse(c, x, y + 2, r, r * 0.7, 'rgba(30,20,10,0.4)');
    fillEllipse(c, x, y, r, r * 0.7, '#cdb89a');
  }
  // petite pousse (la case est « retournée au jardin »)
  leaf(c, 74, 52, 16, 6, -2.2, C.youngLight, C.youngDark);
  leaf(c, 78, 52, 16, 6, -0.9, C.youngLight, C.youngDark);
}

// ----- icônes (96 × 96) -----
function icUndo(c: Ctx) {
  // flèche de retour coudée vers la gauche
  c.beginPath(); c.moveTo(30, 40); c.lineTo(60, 40); c.quadraticCurveTo(78, 40, 78, 58); c.quadraticCurveTo(78, 76, 60, 76); c.lineTo(44, 76); c.stroke();
  c.beginPath(); c.moveTo(42, 24); c.lineTo(24, 40); c.lineTo(42, 56); c.stroke();
}
function icRestart(c: Ctx) {
  // flèche circulaire complète
  c.beginPath(); c.arc(48, 50, 26, -Math.PI * 0.42, Math.PI * 1.5); c.stroke();
  c.beginPath(); c.moveTo(50, 12); c.lineTo(62, 24); c.lineTo(48, 34); c.stroke();
}
function icPause(c: Ctx) {
  rr(c, 28, 22, 14, 52, 6); c.fill();
  rr(c, 54, 22, 14, 52, 6); c.fill();
}
function icBack(c: Ctx) {
  c.beginPath(); c.moveTo(58, 22); c.lineTo(32, 48); c.lineTo(58, 74); c.stroke();
}
function icHome(c: Ctx) {
  c.beginPath(); c.moveTo(16, 46); c.lineTo(48, 18); c.lineTo(80, 46); c.stroke();
  c.beginPath(); c.moveTo(26, 40); c.lineTo(26, 78); c.lineTo(70, 78); c.lineTo(70, 40); c.stroke();
  rr(c, 41, 56, 14, 22, 4); c.fill();
}
function icMap(c: Ctx) {
  c.beginPath(); c.moveTo(14, 26); c.lineTo(36, 18); c.lineTo(60, 26); c.lineTo(82, 18); c.lineTo(82, 70); c.lineTo(60, 78); c.lineTo(36, 70); c.lineTo(14, 78); c.closePath(); c.stroke();
  c.beginPath(); c.moveTo(36, 18); c.lineTo(36, 70); c.moveTo(60, 26); c.lineTo(60, 78); c.stroke();
}
function icFlag(c: Ctx) {
  c.beginPath(); c.moveTo(26, 82); c.lineTo(26, 14); c.stroke();
  c.beginPath(); c.moveTo(28, 18); c.lineTo(74, 26); c.lineTo(56, 40); c.lineTo(74, 54); c.lineTo(28, 50); c.closePath(); c.fill();
}
function icChest(c: Ctx) {
  rr(c, 14, 36, 68, 42, 8); c.stroke();
  c.beginPath(); c.moveTo(14, 46); c.quadraticCurveTo(14, 20, 48, 20); c.quadraticCurveTo(82, 20, 82, 46); c.stroke();
  rr(c, 42, 44, 12, 14, 3); c.fill();
}
function icHint(c: Ctx) {
  // ampoule
  c.beginPath(); c.arc(48, 40, 22, Math.PI * 0.8, Math.PI * 2.2); c.stroke();
  c.beginPath(); c.moveTo(36, 58); c.lineTo(36, 66); c.lineTo(60, 66); c.lineTo(60, 58); c.stroke();
  c.beginPath(); c.moveTo(40, 78); c.lineTo(56, 78); c.stroke();
}
function icHelp(c: Ctx) {
  c.beginPath(); c.arc(48, 48, 34, 0, Math.PI * 2); c.stroke();
  c.beginPath(); c.moveTo(38, 38); c.quadraticCurveTo(38, 26, 48, 26); c.quadraticCurveTo(60, 26, 60, 38); c.quadraticCurveTo(60, 46, 48, 50); c.lineTo(48, 56); c.stroke();
  fillEllipse(c, 48, 68, 5, 5, C.ink);
}
function icShare(c: Ctx) {
  c.beginPath(); c.moveTo(48, 58); c.lineTo(48, 14); c.moveTo(32, 30); c.lineTo(48, 14); c.lineTo(64, 30); c.stroke();
  c.beginPath(); c.moveTo(30, 44); c.lineTo(20, 44); c.lineTo(20, 80); c.lineTo(76, 80); c.lineTo(76, 44); c.lineTo(66, 44); c.stroke();
}
function icLock(c: Ctx) {
  c.beginPath(); c.arc(48, 40, 14, Math.PI, 0); c.lineTo(62, 46); c.moveTo(34, 40); c.lineTo(34, 46); c.stroke();
  rr(c, 24, 46, 48, 34, 8); c.fill();
}
function icCheck(c: Ctx) {
  c.lineWidth = 10;
  c.beginPath(); c.moveTo(22, 50); c.lineTo(40, 68); c.lineTo(74, 30); c.stroke();
}
function icPlay(c: Ctx) {
  c.beginPath(); c.moveTo(32, 20); c.lineTo(76, 48); c.lineTo(32, 76); c.closePath(); c.fill();
}
function icGear(c: Ctx) {
  for (let i = 0; i < 8; i++) {
    c.save(); c.translate(48, 48); c.rotate((i / 8) * Math.PI * 2);
    rr(c, -7, -38, 14, 18, 4); c.fill();
    c.restore();
  }
  c.beginPath(); c.arc(48, 48, 24, 0, Math.PI * 2); c.fill();
  fillEllipse(c, 48, 48, 10, 10, '#fffbf0');
}
function icSteps(c: Ctx) {
  fillEllipse(c, 34, 62, 11, 16, C.ink);
  fillEllipse(c, 62, 36, 11, 16, C.ink);
  fillEllipse(c, 30, 40, 4, 4, C.ink);
  fillEllipse(c, 58, 14, 4, 4, C.ink);
}
function icStar(c: Ctx) {
  c.beginPath();
  for (let i = 0; i < 10; i++) {
    const r = i % 2 ? 16 : 36, a = -Math.PI / 2 + (i * Math.PI) / 5;
    c.lineTo(48 + Math.cos(a) * r, 50 + Math.sin(a) * r);
  }
  c.closePath(); c.fill();
}
function icClose(c: Ctx) {
  c.beginPath(); c.moveTo(28, 28); c.lineTo(68, 68); c.moveTo(68, 28); c.lineTo(28, 68); c.stroke();
}
function icTrophy(c: Ctx) {
  c.beginPath(); c.moveTo(30, 18); c.lineTo(66, 18); c.lineTo(66, 40); c.quadraticCurveTo(66, 60, 48, 60); c.quadraticCurveTo(30, 60, 30, 40); c.closePath(); c.fill();
  c.beginPath(); c.moveTo(30, 26); c.quadraticCurveTo(14, 26, 18, 40); c.quadraticCurveTo(22, 48, 32, 48); c.moveTo(66, 26); c.quadraticCurveTo(82, 26, 78, 40); c.quadraticCurveTo(74, 48, 64, 48); c.stroke();
  c.beginPath(); c.moveTo(48, 60); c.lineTo(48, 72); c.moveTo(32, 78); c.lineTo(64, 78); c.stroke();
}
function icCopy(c: Ctx) {
  rr(c, 32, 30, 40, 48, 8); c.stroke();
  c.beginPath(); c.moveTo(24, 64); c.lineTo(24, 22); c.quadraticCurveTo(24, 16, 30, 16); c.lineTo(58, 16); c.stroke();
}
