import { Cell, type Grid, type Theme } from '../core/types';
import { C } from './palette';
import { canvas, ellipse, fillEllipse, flower, leaf, rGrad, rng, rr, vGrad } from './draw';

export interface BoardLayout {
  tw: number; // largeur d'une case
  td: number; // profondeur visible d'une case
  pad: number; // bordure d'herbe autour de la grille
  soil: number; // épaisseur de la tranche de terre
  width: number;
  height: number;
}

export function boardLayout(g: Grid, tw: number): BoardLayout {
  const td = Math.round(tw * 0.825);
  const pad = Math.round(tw * 0.38);
  const soil = Math.round(tw * 0.42);
  return { tw, td, pad, soil, width: g.width * tw + pad * 2, height: g.height * td + pad * 2 + soil + 30 };
}

const GRASS: Record<Theme, [string, string, string]> = {
  sunny: ['#b7e08a', '#8fcd63', '#79b955'],
  flowers: ['#b3dd8c', '#8bc967', '#73b156'],
  pond: ['#acd98e', '#86c46a', '#6eae5a'],
  river: ['#acd78a', '#84c262', '#6aa952'],
  botanic: ['#b4d79a', '#92c27a', '#78a865'],
  grand: ['#b5de8c', '#8ccb64', '#74b354'],
  challenge: ['#b9dc9a', '#93c873', '#7aae5f'],
};

const isPath = (c: Cell) => c !== Cell.Wall && c !== Cell.Water && c !== Cell.Bridge;
const isWet = (c: Cell) => c === Cell.Water || c === Cell.Bridge;

/** Dessine le plateau statique (île de jardin, herbe, dalles, eau). */
export function drawBoard(g: Grid, theme: Theme, L: BoardLayout, seed: number): HTMLCanvasElement {
  const { tw, td, pad, soil, width } = L;
  const gh = g.height * td + pad * 2; // hauteur du dessus d'herbe
  const [cv, c] = canvas(width, L.height);
  const r = rng(seed);
  const s = tw / 160;
  const cellX = (x: number) => pad + x * tw;
  const cellY = (y: number) => pad + y * td;
  const at = (x: number, y: number) => (x < 0 || y < 0 || x >= g.width || y >= g.height ? null : g.cells[y * g.width + x]);

  // Ombre portée de l'île
  fillEllipse(c, width / 2, gh + soil + 4, width * 0.48, 22, 'rgba(60,90,60,0.22)');

  // Tranche de terre (volume 2,5D)
  rr(c, 4, gh * 0.5, width - 8, gh * 0.5 + soil, 46 * s);
  c.fillStyle = vGrad(c, gh - 20, gh + soil, [[0, '#b98b5c'], [0.5, C.soil], [1, C.soilDark]]);
  c.fill();
  // strates & cailloux
  c.strokeStyle = 'rgba(90,60,35,0.35)';
  c.lineWidth = 3 * s;
  for (let k = 1; k <= 2; k++) {
    c.beginPath();
    const yy = gh + (soil * k) / 3;
    c.moveTo(20, yy);
    for (let x = 20; x < width - 20; x += 30) c.lineTo(x, yy + Math.sin(x / 40 + k) * 4 * s);
    c.stroke();
  }
  for (let i = 0; i < 26; i++) fillEllipse(c, 20 + r() * (width - 40), gh + 10 + r() * (soil - 20), 4 * s + r() * 5 * s, 3 * s + r() * 3 * s, i % 3 ? 'rgba(220,190,150,0.45)' : 'rgba(90,60,35,0.4)');
  // racines qui dépassent
  c.strokeStyle = '#6d4a2c';
  c.lineWidth = 3 * s;
  for (let i = 0; i < 5; i++) {
    const x = 60 + r() * (width - 120);
    c.beginPath();
    c.moveTo(x, gh + 4);
    c.quadraticCurveTo(x + 8, gh + soil * 0.4, x - 4, gh + soil * 0.7);
    c.stroke();
  }

  // Dessus d'herbe
  const [g1, g2, g3] = GRASS[theme];
  rr(c, 0, 0, width, gh, 46 * s);
  c.fillStyle = vGrad(c, 0, gh, [[0, g1], [0.55, g2], [1, g3]]);
  c.fill();
  // lisière plus claire
  c.save();
  rr(c, 0, 0, width, gh, 46 * s);
  c.clip();
  c.strokeStyle = 'rgba(255,255,255,0.35)';
  c.lineWidth = 6 * s;
  rr(c, 4, 4, width - 8, gh - 8, 42 * s);
  c.stroke();
  // taches de lumière douce
  for (let i = 0; i < 22; i++) fillEllipse(c, r() * width, r() * gh, 30 * s + r() * 60 * s, 18 * s + r() * 30 * s, `rgba(255,255,220,${0.05 + r() * 0.07})`);
  for (let i = 0; i < 14; i++) fillEllipse(c, r() * width, r() * gh, 30 * s + r() * 50 * s, 16 * s + r() * 24 * s, `rgba(60,110,50,${0.04 + r() * 0.05})`);
  // brins d'herbe
  for (let i = 0; i < 260; i++) {
    const x = r() * width, y = r() * gh;
    c.strokeStyle = r() > 0.5 ? 'rgba(80,140,60,0.5)' : 'rgba(200,240,160,0.55)';
    c.lineWidth = 2 * s;
    c.beginPath();
    c.moveTo(x, y);
    c.quadraticCurveTo(x + 2 * s, y - 6 * s, x + (r() - 0.5) * 8 * s, y - 10 * s);
    c.stroke();
  }
  c.restore();

  // Eau (rivière / mare) : on fusionne les cases voisines
  for (let y = 0; y < g.height; y++) {
    for (let x = 0; x < g.width; x++) {
      const cell = at(x, y)!;
      if (!isWet(cell)) continue;
      let x0 = cellX(x), x1 = x0 + tw, y0 = cellY(y), y1 = y0 + td;
      // la rivière déborde jusqu'au bord de l'île si elle touche le bord de la grille
      if (x === 0) x0 = 0;
      if (x === g.width - 1) x1 = width;
      const bankL = !(at(x - 1, y) && isWet(at(x - 1, y)!)) && x > 0;
      const bankR = !(at(x + 1, y) && isWet(at(x + 1, y)!)) && x < g.width - 1;
      const bankT = !(at(x, y - 1) && isWet(at(x, y - 1)!));
      const bankB = !(at(x, y + 1) && isWet(at(x, y + 1)!));
      const ins = 6 * s;
      const ax0 = x0 + (bankL ? ins : 0), ax1 = x1 - (bankR ? ins : 0);
      const ay0 = y0 + (bankT ? ins : 0), ay1 = y1 - (bankB ? ins : 0);
      // berge
      c.fillStyle = '#8a6a45';
      rr(c, ax0, ay0, ax1 - ax0, ay1 - ay0, bankL || bankT || bankR || bankB ? 18 * s : 0);
      c.fill();
      // eau
      const wy0 = ay0 + (bankT ? 8 * s : 0);
      c.fillStyle = vGrad(c, wy0, ay1, [[0, '#4aa9b4'], [0.4, C.water], [1, '#8fd9d3']]);
      rr(c, ax0 + (bankL ? 3 * s : 0), wy0, ax1 - ax0 - (bankL ? 3 * s : 0) - (bankR ? 3 * s : 0), ay1 - wy0 - (bankB ? 3 * s : 0), bankL || bankT || bankR || bankB ? 14 * s : 0);
      c.fill();
    }
  }
  // reflets fixes
  for (let y = 0; y < g.height; y++) for (let x = 0; x < g.width; x++) {
    if (!isWet(at(x, y)!)) continue;
    c.strokeStyle = 'rgba(255,255,255,0.35)';
    c.lineWidth = 3 * s;
    for (let k = 0; k < 2; k++) {
      const wx = cellX(x) + 20 * s + r() * (tw - 60 * s), wy = cellY(y) + 26 * s + r() * (td - 50 * s);
      c.beginPath();
      c.moveTo(wx, wy);
      c.quadraticCurveTo(wx + 12 * s, wy - 5 * s, wx + 26 * s, wy);
      c.stroke();
    }
  }

  // Dalles de pierre légèrement surélevées sur les cases de chemin
  const ins = 7 * s;
  const lift = 9 * s;
  for (let y = 0; y < g.height; y++) {
    for (let x = 0; x < g.width; x++) {
      const cell = at(x, y)!;
      if (!isPath(cell)) continue;
      const x0 = cellX(x) + ins, y0 = cellY(y) + ins, w = tw - ins * 2, h = td - ins * 2 - lift * 0.4;
      // ombre + flanc
      rr(c, x0 + 2 * s, y0 + lift + 4 * s, w, h, 20 * s);
      c.fillStyle = 'rgba(40,70,35,0.22)';
      c.fill();
      rr(c, x0, y0 + lift, w, h, 20 * s);
      c.fillStyle = vGrad(c, y0 + h * 0.5, y0 + h + lift, [[0, C.stoneSide], [1, '#94795a']]);
      c.fill();
      // dessus
      const top = cell === Cell.Exit ? ['#fff4d2', '#f2dca6'] : cell === Cell.Start ? ['#fff8e6', '#eadbb8'] : ['#fbf3df', C.creamDark];
      rr(c, x0, y0, w, h, 20 * s);
      c.fillStyle = vGrad(c, y0, y0 + h, [[0, top[0]], [1, top[1]]]);
      c.fill();
      // reflet supérieur
      c.save();
      rr(c, x0, y0, w, h, 20 * s);
      c.clip();
      c.strokeStyle = 'rgba(255,255,255,0.7)';
      c.lineWidth = 4 * s;
      rr(c, x0 + 4 * s, y0 + 3 * s, w - 8 * s, h, 18 * s);
      c.stroke();
      // galets incrustés
      for (let k = 0; k < 5; k++) {
        const px = x0 + 14 * s + r() * (w - 28 * s), py = y0 + 12 * s + r() * (h - 24 * s);
        fillEllipse(c, px, py + 1.5 * s, 7 * s + r() * 5 * s, 4 * s + r() * 3 * s, 'rgba(160,135,95,0.22)');
        fillEllipse(c, px, py, 6 * s + r() * 4 * s, 3.5 * s + r() * 2 * s, 'rgba(255,255,255,0.35)');
      }
      // mousse dans les coins
      if (r() > 0.55) fillEllipse(c, x0 + (r() > 0.5 ? 10 * s : w - 10 * s), y0 + h - 8 * s, 10 * s, 5 * s, 'rgba(110,170,80,0.55)');
      c.restore();
      if (cell === Cell.Start) {
        // petit tapis de départ avec une feuille
        c.strokeStyle = 'rgba(242,156,75,0.55)';
        c.lineWidth = 4 * s;
        c.setLineDash([10 * s, 8 * s]);
        ellipse(c, x0 + w / 2, y0 + h / 2, w * 0.34, h * 0.3);
        c.stroke();
        c.setLineDash([]);
      }
    }
  }

  // petites touffes & fleurs sur l'herbe (hors chemins)
  const petals = theme === 'botanic' ? ['#b9a3e3', '#ffffff', '#f4a7b9'] : theme === 'flowers' ? ['#f4a7b9', '#f7e08a', '#ffffff', '#f29c4b'] : ['#ffffff', '#f7e08a', '#f4a7b9'];
  const nFlowers = theme === 'flowers' || theme === 'grand' ? 34 : 20;
  for (let i = 0; i < nFlowers; i++) {
    // sur la bordure d'herbe seulement (la grille est couverte par haies/dalles)
    let x: number, y: number;
    const side = Math.floor(r() * 4);
    if (side === 0) { x = r() * width; y = 8 * s + r() * (pad - 16 * s); }
    else if (side === 1) { x = r() * width; y = gh - pad + 8 * s + r() * (pad - 20 * s); }
    else if (side === 2) { x = 8 * s + r() * (pad - 16 * s); y = r() * gh; }
    else { x = width - pad + 8 * s + r() * (pad - 16 * s); y = r() * gh; }
    const cx = Math.floor((x - pad) / tw), cy = Math.floor((y - pad) / td);
    if (at(cx, cy) !== null) continue;
    if (y > gh - 14 * s || y < 10 * s) continue;
    leaf(c, x - 4 * s, y + 4 * s, 12 * s, 4 * s, -2.5, '#4f9a3c');
    flower(c, x, y, 6 * s + r() * 3 * s, petals[i % petals.length]);
  }
  for (let i = 0; i < 18; i++) {
    const x = r() * width, y = r() * gh;
    const cx = Math.floor((x - pad) / tw), cy = Math.floor((y - pad) / td);
    if (at(cx, cy) !== null && isPath(at(cx, cy)!)) continue;
    if (at(cx, cy) !== null && isWet(at(cx, cy)!)) continue;
    for (let k = 0; k < 4; k++) leaf(c, x, y, 14 * s, 4 * s, -1.2 - k * 0.25, k % 2 ? '#5fae55' : '#7cc96a');
  }
  void rGrad;
  return cv;
}

/** Miniature simplifiée d'un niveau pour le carnet. */
export function drawThumb(g: Grid, theme: Theme, w: number, h: number): HTMLCanvasElement {
  const [cv, c] = canvas(w, h);
  const cs = Math.min((w - 16) / g.width, (h - 16) / g.height);
  const ox = (w - cs * g.width) / 2, oy = (h - cs * g.height) / 2;
  const [g1, g2] = GRASS[theme];
  rr(c, ox - 6, oy - 6, cs * g.width + 12, cs * g.height + 12, 14);
  c.fillStyle = vGrad(c, oy, oy + cs * g.height, [[0, g1], [1, g2]]);
  c.fill();
  for (let y = 0; y < g.height; y++) for (let x = 0; x < g.width; x++) {
    const cell = g.cells[y * g.width + x];
    const px = ox + x * cs, py = oy + y * cs;
    if (cell === Cell.Wall) {
      fillEllipse(c, px + cs / 2, py + cs / 2 + 1.5, cs * 0.46, cs * 0.42, '#2f7639');
      fillEllipse(c, px + cs / 2, py + cs / 2, cs * 0.45, cs * 0.4, g.decor[y * g.width + x] === 'flowers' ? '#e8a3b5' : g.decor[y * g.width + x] === 'rock' ? '#cfc8b6' : '#4f9e4b');
    } else if (isWet(cell)) {
      c.fillStyle = cell === Cell.Bridge ? C.wood : C.water;
      c.fillRect(px, py, cs, cs);
    } else {
      rr(c, px + 2, py + 2, cs - 4, cs - 4, cs * 0.25);
      c.fillStyle = '#fbf3df';
      c.fill();
      const dot = (col: string) => fillEllipse(c, px + cs / 2, py + cs / 2, cs * 0.22, cs * 0.22, col);
      if (cell === Cell.Start) dot(C.orange);
      if (cell === Cell.Exit) dot(C.turquoiseDeep);
      if (cell === Cell.Collectible) dot(C.yellowDeep);
      if (cell === Cell.Switch) dot('#b9a3e3');
      if (cell === Cell.Door) dot('#f4a7b9');
    }
  }
  return cv;
}
