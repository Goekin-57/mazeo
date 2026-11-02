// Génère l'icône de l'application (dessin 100 % local).
import { fillEllipse, flower, leaf, rGrad, rr, vGrad } from '../../src/art/draw';
import { C } from '../../src/art/palette';

const q = new URLSearchParams(location.search);
const S = Number(q.get('size') ?? 512);
const maskable = q.has('maskable');
const cv = document.getElementById('c') as HTMLCanvasElement;
cv.width = cv.height = S;
const c = cv.getContext('2d')!;
c.scale(S / 512, S / 512);

// fond : jardin
if (maskable) { c.fillStyle = '#8fcd63'; c.fillRect(0, 0, 512, 512); }
else { rr(c, 0, 0, 512, 512, 112); c.fillStyle = '#8fcd63'; c.fill(); }
c.save();
if (!maskable) { rr(c, 0, 0, 512, 512, 112); c.clip(); }
c.fillStyle = vGrad(c, 0, 512, [[0, '#b7e08a'], [1, '#6fb352']]);
c.fillRect(0, 0, 512, 512);
// haies du labyrinthe en arrière-plan
const hedge = (x: number, y: number, w: number, h: number) => {
  rr(c, x, y + 10, w, h, 26); c.fillStyle = '#2c6a36'; c.fill();
  rr(c, x, y, w, h, 26); c.fillStyle = vGrad(c, y, y + h, [[0, '#6cbb5e'], [1, '#3f8a45']]); c.fill();
  for (let i = 0; i < 18; i++) leaf(c, x + 10 + ((i * 37) % (w - 20)), y + 8 + ((i * 23) % (h - 16)), 16, 6, i, 'rgba(210,245,170,0.45)');
};
hedge(-20, 40, 200, 80); hedge(330, 40, 210, 80); hedge(-20, 400, 170, 130); hedge(380, 330, 150, 200);
// chemin
rr(c, 150, 120, 220, 330, 40); c.fillStyle = 'rgba(251,243,223,0.9)'; c.fill();
for (const [x, y] of [[60, 180], [440, 270], [90, 330], [430, 160]]) flower(c, x, y, 16, ['#f4a7b9', '#f7e08a', '#ffffff', '#b9a3e3'][(x + y) % 4]);
c.restore();

// Bourgeon
const cx = 256, cy = 300;
fillEllipse(c, cx, 448, 120, 26, 'rgba(30,60,30,0.3)');
rr(c, cx - 150, 260, 70, 90, 24); c.fillStyle = '#a8703c'; c.fill(); // sac
fillEllipse(c, cx, cy + 8, 150, 142, '#c98f50');
fillEllipse(c, cx, cy, 150, 142, rGrad(c, cx - 50, cy - 70, 10, 200, [[0, '#fff3d9'], [0.45, '#ffdca8'], [1, '#eaa865']]));
c.save(); c.beginPath(); c.ellipse(cx, cy, 150, 142, 0, 0, 7); c.clip();
c.fillStyle = vGrad(c, cy + 60, cy + 110, [[0, '#8fe0d4'], [1, C.turquoiseDeep]]);
c.beginPath(); c.moveTo(0, cy + 50); c.quadraticCurveTo(cx, cy + 100, 512, cy + 50); c.lineTo(512, cy + 96); c.quadraticCurveTo(cx, cy + 146, 0, cy + 96); c.fill();
c.restore();
for (const ex of [-52, 52]) {
  fillEllipse(c, cx + ex, cy - 36, 42, 50, '#3b4a3a');
  fillEllipse(c, cx + ex, cy - 36, 37, 45, '#ffffff');
  fillEllipse(c, cx + ex + 6, cy - 30, 22, 25, '#2a1d15');
  fillEllipse(c, cx + ex - 2, cy - 42, 8, 8, '#fff');
}
fillEllipse(c, cx - 92, cy + 22, 22, 13, 'rgba(244,140,150,0.6)');
fillEllipse(c, cx + 92, cy + 22, 22, 13, 'rgba(244,140,150,0.6)');
c.strokeStyle = '#5a3424'; c.lineWidth = 9; c.lineCap = 'round';
c.beginPath(); c.moveTo(cx - 26, cy + 30); c.quadraticCurveTo(cx, cy + 56, cx + 26, cy + 30); c.stroke();
// pousse
c.strokeStyle = '#4f9a3c'; c.lineWidth = 12;
c.beginPath(); c.moveTo(cx, cy - 136); c.quadraticCurveTo(cx - 6, cy - 170, cx + 4, cy - 196); c.stroke();
leaf(c, cx + 4, cy - 192, 80, 30, -2.6, '#7dbf5b', '#4f9a3c');
leaf(c, cx + 4, cy - 196, 86, 32, -0.45, '#9ccf5a', '#5fae55');
(window as unknown as { done: boolean }).done = true;
