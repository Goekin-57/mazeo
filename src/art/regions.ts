// Illustrations des régions du Grand Sentier (médaillons) et aperçu du Port des Marées.
import type Phaser from 'phaser';
import { C } from './palette';
import { canvas, type Ctx, fillEllipse, flower, leaf, rGrad, rr, vGrad } from './draw';

const REGION: Record<string, (c: Ctx) => void> = {
  garden: (c) => {
    fillEllipse(c, 80, 112, 40, 10, 'rgba(30,60,30,0.25)');
    c.fillStyle = '#7a5235'; rr(c, 74, 72, 12, 42, 4); c.fill();
    for (const [x, y, r] of [[62, 66, 26], [98, 64, 26], [80, 46, 30]] as const) fillEllipse(c, x, y, r, r, rGrad(c, x - 8, y - 10, 2, r * 1.3, [[0, '#9ad77a'], [1, '#3f8a45']]));
    flower(c, 40, 110, 8, '#f4a7b9'); flower(c, 122, 108, 8, '#f7e08a');
  },
  harbor: (c) => {
    c.fillStyle = vGrad(c, 80, 140, [[0, '#7ecfc4'], [1, '#3e9fb0']]); c.fillRect(10, 86, 140, 50);
    c.fillStyle = '#c38d5a'; c.beginPath(); c.moveTo(42, 84); c.lineTo(118, 84); c.lineTo(106, 100); c.lineTo(54, 100); c.closePath(); c.fill();
    c.fillStyle = '#fffaf0'; c.beginPath(); c.moveTo(80, 30); c.lineTo(80, 80); c.lineTo(112, 80); c.closePath(); c.fill();
    c.strokeStyle = '#8e5f37'; c.lineWidth = 4; c.beginPath(); c.moveTo(78, 26); c.lineTo(78, 86); c.stroke();
    c.strokeStyle = 'rgba(255,255,255,0.7)'; c.lineWidth = 3; c.beginPath(); c.moveTo(20, 116); c.quadraticCurveTo(40, 108, 60, 116); c.moveTo(96, 124); c.quadraticCurveTo(116, 116, 136, 124); c.stroke();
  },
  city: (c) => {
    for (const [x, w, h, col] of [[24, 34, 60, '#f3e3cf'], [60, 40, 80, '#efd5b6'], [104, 32, 56, '#f6e9d6']] as const) {
      c.fillStyle = col; rr(c, x, 120 - h, w, h, 4); c.fill();
      c.fillStyle = C.orangeDeep; c.beginPath(); c.moveTo(x - 4, 122 - h); c.lineTo(x + w / 2, 100 - h); c.lineTo(x + w + 4, 122 - h); c.fill();
      c.fillStyle = '#7fb7c4'; rr(c, x + w / 2 - 6, 130 - h, 12, 14, 3); c.fill();
    }
  },
  peaks: (c) => {
    c.fillStyle = '#9fb7d6'; c.beginPath(); c.moveTo(14, 118); c.lineTo(62, 40); c.lineTo(104, 118); c.fill();
    c.fillStyle = '#b8cbe4'; c.beginPath(); c.moveTo(60, 118); c.lineTo(106, 30); c.lineTo(148, 118); c.fill();
    c.fillStyle = '#ffffff'; c.beginPath(); c.moveTo(94, 52); c.lineTo(106, 30); c.lineTo(118, 52); c.lineTo(110, 48); c.lineTo(102, 54); c.fill();
    c.beginPath(); c.moveTo(52, 56); c.lineTo(62, 40); c.lineTo(72, 56); c.lineTo(62, 52); c.fill();
  },
  workshop: (c) => {
    c.fillStyle = '#b9a3e3';
    for (let i = 0; i < 8; i++) { c.save(); c.translate(80, 76); c.rotate((i / 8) * Math.PI * 2); rr(c, -8, -48, 16, 18, 4); c.fill(); c.restore(); }
    fillEllipse(c, 80, 76, 36, 36, '#b9a3e3'); fillEllipse(c, 80, 76, 14, 14, '#f3eefb');
  },
  lanterns: (c) => {
    c.fillStyle = '#2f3d5c'; rr(c, 10, 14, 140, 120, 20); c.fill();
    for (const [x, y] of [[44, 60], [80, 44], [116, 66]] as const) {
      c.fillStyle = rGrad(c, x, y, 2, 30, [[0, 'rgba(255,230,150,0.9)'], [1, 'rgba(255,230,150,0)']]); c.fillRect(x - 30, y - 30, 60, 60);
      c.fillStyle = '#f2c94c'; rr(c, x - 10, y - 12, 20, 24, 6); c.fill();
    }
  },
};

export function generateRegionTextures(scene: Phaser.Scene) {
  for (const [k, draw] of Object.entries(REGION)) {
    const key = `region-${k}`;
    if (scene.textures.exists(key)) continue;
    const [cv, c] = canvas(160, 140);
    draw(c);
    scene.textures.addCanvas(key, cv);
  }
  if (!scene.textures.exists('preview-harbor')) {
    // aperçu (silhouettes) du Port des Marées : chapitre 2, non disponible
    const [cv, c] = canvas(800, 340);
    rr(c, 0, 0, 800, 340, 40);
    c.fillStyle = vGrad(c, 0, 340, [[0, '#f7d9b8'], [0.5, '#cfe8f3'], [1, '#7ecfc4']]);
    c.fill();
    c.save();
    rr(c, 0, 0, 800, 340, 40);
    c.clip();
    fillEllipse(c, 600, 120, 60, 60, 'rgba(255,240,200,0.9)');
    c.fillStyle = vGrad(c, 210, 340, [[0, '#5fb3c0'], [1, '#2f7f95']]);
    c.fillRect(0, 210, 800, 130);
    c.strokeStyle = 'rgba(255,255,255,0.5)';
    c.lineWidth = 4;
    for (let i = 0; i < 6; i++) { c.beginPath(); c.moveTo(40 + i * 130, 250 + (i % 2) * 30); c.quadraticCurveTo(80 + i * 130, 238 + (i % 2) * 30, 120 + i * 130, 250 + (i % 2) * 30); c.stroke(); }
    // phare
    c.fillStyle = '#4a5a6a';
    c.beginPath(); c.moveTo(100, 220); c.lineTo(118, 90); c.lineTo(150, 90); c.lineTo(168, 220); c.fill();
    c.fillStyle = '#f2c94c'; rr(c, 116, 70, 36, 22, 6); c.fill();
    // navire en silhouette
    c.fillStyle = '#3d4a5a';
    c.beginPath(); c.moveTo(380, 214); c.lineTo(600, 214); c.lineTo(570, 246); c.lineTo(410, 246); c.closePath(); c.fill();
    c.fillRect(486, 90, 8, 124);
    c.beginPath(); c.moveTo(496, 96); c.lineTo(496, 200); c.lineTo(570, 200); c.closePath(); c.fill();
    c.beginPath(); c.moveTo(484, 110); c.lineTo(484, 200); c.lineTo(424, 200); c.closePath(); c.fill();
    // quai
    c.fillStyle = '#8e5f37'; c.fillRect(640, 200, 160, 18);
    for (let i = 0; i < 4; i++) c.fillRect(650 + i * 40, 200, 8, 50);
    c.restore();
    c.fillStyle = 'rgba(255,255,255,0.18)';
    rr(c, 0, 0, 800, 340, 40);
    c.fill();
    scene.textures.addCanvas('preview-harbor', cv);
  }
  void leaf;
}
