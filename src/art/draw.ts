// Petits utilitaires de dessin Canvas 2D (textures générées localement, aucun asset externe).

export type Ctx = CanvasRenderingContext2D;

export function rng(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function canvas(w: number, h: number): [HTMLCanvasElement, Ctx] {
  const c = document.createElement('canvas');
  c.width = Math.ceil(w);
  c.height = Math.ceil(h);
  return [c, c.getContext('2d')!];
}

export function rr(ctx: Ctx, x: number, y: number, w: number, h: number, r: number) {
  const rad = Math.min(r, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + rad, y);
  ctx.arcTo(x + w, y, x + w, y + h, rad);
  ctx.arcTo(x + w, y + h, x, y + h, rad);
  ctx.arcTo(x, y + h, x, y, rad);
  ctx.arcTo(x, y, x + w, y, rad);
  ctx.closePath();
}

export function ellipse(ctx: Ctx, x: number, y: number, rx: number, ry: number) {
  ctx.beginPath();
  ctx.ellipse(x, y, Math.max(0.1, rx), Math.max(0.1, ry), 0, 0, Math.PI * 2);
}

export function fillEllipse(ctx: Ctx, x: number, y: number, rx: number, ry: number, fill: string | CanvasGradient) {
  ellipse(ctx, x, y, rx, ry);
  ctx.fillStyle = fill;
  ctx.fill();
}

export function vGrad(ctx: Ctx, y0: number, y1: number, stops: [number, string][]) {
  const g = ctx.createLinearGradient(0, y0, 0, y1);
  stops.forEach(([o, c]) => g.addColorStop(o, c));
  return g;
}

export function rGrad(ctx: Ctx, x: number, y: number, r0: number, r1: number, stops: [number, string][], fx = x, fy = y) {
  const g = ctx.createRadialGradient(fx, fy, r0, x, y, r1);
  stops.forEach(([o, c]) => g.addColorStop(o, c));
  return g;
}

/** Ajuste une couleur hex : amt > 0 éclaircit, < 0 assombrit. */
export function shade(hex: string, amt: number): string {
  const n = parseInt(hex.slice(1), 16);
  let r = (n >> 16) & 255;
  let g = (n >> 8) & 255;
  let b = n & 255;
  const f = (v: number) => Math.round(amt >= 0 ? v + (255 - v) * amt : v * (1 + amt));
  r = f(r);
  g = f(g);
  b = f(b);
  return `rgb(${r},${g},${b})`;
}

export function withAlpha(hex: string, a: number) {
  const n = parseInt(hex.slice(1), 16);
  return `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},${a})`;
}

/** Petite fleur à 5 pétales. */
export function flower(ctx: Ctx, x: number, y: number, r: number, petal: string, center = '#f7d35c') {
  ctx.fillStyle = petal;
  for (let i = 0; i < 5; i++) {
    const a = (i / 5) * Math.PI * 2 - Math.PI / 2;
    ellipse(ctx, x + Math.cos(a) * r * 0.62, y + Math.sin(a) * r * 0.62, r * 0.48, r * 0.48);
    ctx.fill();
  }
  fillEllipse(ctx, x, y, r * 0.36, r * 0.36, center);
  fillEllipse(ctx, x - r * 0.1, y - r * 0.12, r * 0.12, r * 0.12, 'rgba(255,255,255,0.7)');
}

/** Feuille en amande orientée selon un angle. */
export function leaf(ctx: Ctx, x: number, y: number, len: number, wid: number, ang: number, fill: string, vein?: string) {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(ang);
  ctx.beginPath();
  ctx.moveTo(0, 0);
  ctx.quadraticCurveTo(len * 0.5, -wid, len, 0);
  ctx.quadraticCurveTo(len * 0.5, wid, 0, 0);
  ctx.fillStyle = fill;
  ctx.fill();
  if (vein) {
    ctx.strokeStyle = vein;
    ctx.lineWidth = Math.max(1, wid * 0.15);
    ctx.beginPath();
    ctx.moveTo(len * 0.08, 0);
    ctx.lineTo(len * 0.85, 0);
    ctx.stroke();
  }
  ctx.restore();
}

/** Étoile à 5 branches arrondie. */
export function starPath(ctx: Ctx, cx: number, cy: number, R: number, r: number) {
  ctx.beginPath();
  for (let i = 0; i < 10; i++) {
    const a = (i / 10) * Math.PI * 2 - Math.PI / 2;
    const rad = i % 2 === 0 ? R : r;
    const px = cx + Math.cos(a) * rad;
    const py = cy + Math.sin(a) * rad;
    if (i === 0) ctx.moveTo(px, py);
    else ctx.lineTo(px, py);
  }
  ctx.closePath();
}
