// Carte du Grand Sentier : six étapes reliées par un chemin (utilisée par le carnet de voyage et la fin de chapitre).
import Phaser from 'phaser';
import { C, hex } from '../art/palette';
import { CHAPTERS } from '../content/chapters';
import { Save } from '../save';
import { reduced, txt } from './ui';

export interface TrailStop {
  x: number;
  y: number;
  hit: Phaser.GameObjects.Arc;
}

/** Dessine la carte dans une zone ; `lit` = nombre de balises allumées. */
export function drawTrail(scene: Phaser.Scene, top: number, height: number, lit: number, opts: { names?: boolean } = {}): TrailStop[] {
  const W = 1080;
  const pts = CHAPTERS.map((_, i) => ({
    x: i % 2 === 0 ? 300 + (i % 4 === 0 ? 0 : 60) : 780 - (i % 4 === 1 ? 0 : 60),
    y: top + 90 + (i * (height - 180)) / (CHAPTERS.length - 1),
  }));
  const g = scene.add.graphics().setDepth(-2);
  // fond de carte (papier)
  g.fillStyle(0xfbf3df, 0.96);
  g.fillRoundedRect(60, top, W - 120, height, 48);
  g.lineStyle(4, hex(C.creamDark), 1);
  g.strokeRoundedRect(60, top, W - 120, height, 48);
  // chemin en pointillés
  const curve = new Phaser.Curves.Spline(pts.map((p) => new Phaser.Math.Vector2(p.x, p.y)));
  const samples = curve.getSpacedPoints(80);
  samples.forEach((p, i) => {
    if (i % 2) return;
    const passed = i / samples.length < lit / CHAPTERS.length - 0.05;
    g.fillStyle(passed ? hex(C.orange) : 0xc9b28a, passed ? 1 : 0.7);
    g.fillCircle(p.x, p.y, 7);
  });
  const stops: TrailStop[] = [];
  CHAPTERS.forEach((ch, i) => {
    const p = pts[i];
    const available = ch.available;
    const isLit = i < lit;
    const ring = scene.add.circle(p.x, p.y, 70, isLit ? hex(C.yellow) : available ? 0xffffff : 0xe8e1cf).setStrokeStyle(6, isLit ? hex(C.orange) : available ? hex(C.meadow) : 0xc9bfa8);
    const img = scene.add.image(p.x, p.y + 4, `region-${ch.visual.icon}`).setScale(0.72);
    if (!available) img.setTint(0x9a968a).setAlpha(0.55);
    if (isLit) {
      const glow = scene.add.image(p.x, p.y, 'glow').setScale(1.9).setAlpha(0.55).setDepth(-1);
      if (!reduced()) scene.tweens.add({ targets: glow, alpha: 0.25, duration: 1200, yoyo: true, repeat: -1 });
    }
    if (!available) scene.add.image(p.x + 48, p.y - 46, 'icon-lock').setScale(0.55);
    if (opts.names !== false) {
      const left = p.x < W / 2;
      txt(scene, left ? p.x + 92 : p.x - 92, p.y - 14, `${ch.number}. ${ch.name}`, 34, { weight: 700, color: available ? C.ink : C.inkSoft, align: left ? 'left' : 'right' }).setOrigin(left ? 0 : 1, 0.5);
      const done = ch.levels.filter((l) => Save.level(l.key)?.completed).length;
      const sub = available ? `${done}/${ch.levels.length} niveaux` : 'Pas encore disponible';
      txt(scene, left ? p.x + 92 : p.x - 92, p.y + 26, sub, 28, { weight: 500, color: C.inkSoft, align: left ? 'left' : 'right' }).setOrigin(left ? 0 : 1, 0.5);
    }
    ring.setInteractive({ useHandCursor: true });
    ring.name = `trail-${ch.id}`;
    stops.push({ x: p.x, y: p.y, hit: ring });
    void img;
  });
  return stops;
}
