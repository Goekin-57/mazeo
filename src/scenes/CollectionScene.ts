import Phaser from 'phaser';
import { Sfx } from '../audio/sfx';
import { REWARDS, type RewardDef, type RewardSlot } from '../content/rewards';
import { Save } from '../save';
import { cardBg, chip, label, pop } from '../ui/components';
import { finishScreen, setupScreen } from '../ui/screen';
import { color, font, space } from '../ui/theme';
import { reduced, W } from '../ui/ui';
import { Player } from './Player';

const SECTIONS: [string, RewardSlot[]][] = [
  ['Tenues', ['hat', 'scarf']],
  ['Compagnons', ['companion']],
  ['Décorations', ['decor']],
  ['Badges', ['badge']],
];

/** Collection : Bourgeon équipé en évidence, cartes directement interactives (ÉQUIPÉ / ÉQUIPER / VERROUILLÉ). */
export class CollectionScene extends Phaser.Scene {
  private changed: string | null = null;
  private fresh: string[] = [];
  constructor() {
    super('Collection');
  }

  init(data: { changed?: string; fresh?: string[] }) {
    this.changed = data.changed ?? null;
    // les badges « Nouveau » ne s'affichent qu'à la première consultation
    this.fresh = data.fresh ?? Save.get().collection.fresh.slice();
    Save.clearFresh();
  }

  create() {
    const owned = REWARDS.filter((r) => Save.owns(r.id)).length;
    let y = setupScreen(this, { title: 'Collection', back: 'Home', nav: 'Collection', subtitle: `${owned}/${REWARDS.length} objets · uniquement décoratifs` });
    y = this.preview(y);
    for (const [title, slots] of SECTIONS) {
      const items = REWARDS.filter((r) => slots.includes(r.slot));
      if (!items.length) continue;
      y += space.section;
      label(this, space.margin + 8, y + 24, title, font.body + 2, { weight: 700, align: 'left' });
      y += 70;
      items.forEach((r) => { this.card(r, y); y += 196 + space.gap; });
    }
    finishScreen(this, y);
  }

  private equippedOf(r: RewardDef) {
    const e = Save.get().collection.equipped;
    if (r.slot === 'decor') return e.decor.includes(r.id);
    if (r.slot === 'badge') return false;
    return e[r.slot] === r.id;
  }

  private preview(top: number) {
    const x = space.margin, w = W - space.margin * 2, h = 560;
    cardBg(this, x, top, w, h, { fill: '#fffaf0' });
    const eq = Save.get().collection.equipped;
    const pip = new Player(this, W / 2, top + 400, 1.6, { hat: eq.hat === 'hat-gardener', golden: eq.scarf === 'scarf-golden' });
    pip.setName('collection-pip');
    if (this.changed && !reduced()) this.time.delayedCall(120, () => pip.joy());
    if (eq.companion === 'companion-duckling') this.add.image(W / 2 + 200, top + 420, 'duckling').setOrigin(0.5, 0.9).setScale(1.4).setFlipX(true);
    if (eq.decor.includes('deco-magic-flower')) this.add.image(W / 2 - 280, top + 430, 'magic-flower').setOrigin(0.5, 0.95).setScale(1.5);
    if (eq.decor.includes('deco-lanterns')) this.add.image(W / 2 + 330, top + 430, 'lantern').setOrigin(0.5, 0.95).setScale(1.5);
    const names = REWARDS.filter((r) => r.slot !== 'badge' && this.equippedOf(r)).map((r) => r.name);
    label(this, W / 2, top + h - 60, names.length ? `Équipé : ${names.join(' · ')}` : 'Rien d’équipé pour l’instant', font.caption + 2, { color: color.inkSoft, weight: 600, wrap: w - 60 });
    return top + h;
  }

  private card(r: RewardDef, top: number) {
    const own = Save.owns(r.id);
    const on = this.equippedOf(r);
    const x = space.margin, w = W - space.margin * 2, h = 196;
    const c = this.add.container(0, 0);
    c.add(cardBg(this, x, top, w, h, { fill: own ? '#ffffff' : '#f3ecdc', border: on ? color.success : color.border, borderW: on ? 5 : 3 }));
    const icon = this.add.image(x + 100, top + h / 2, own ? r.icon : r.slot === 'badge' ? 'badge-locked' : r.icon).setScale(r.slot === 'badge' ? 0.8 : r.icon === 'magic-flower' || r.icon === 'lantern' ? 1.05 : 0.95);
    if (!own) icon.setTint(0x8f8b80).setAlpha(0.45);
    c.add(icon);
    c.add(label(this, x + 200, top + h / 2 - 34, r.name, font.body + 1, { weight: 700, align: 'left', color: own ? color.ink : color.inkSoft }));
    c.add(label(this, x + 200, top + h / 2 + 30, own ? (r.slot === 'badge' ? 'Badge obtenu' : r.how) : r.how, font.caption, { color: color.inkSoft, weight: 500, align: 'left', wrap: w - 520 }));
    const state = !own ? 'VERROUILLÉ' : r.slot === 'badge' ? 'OBTENU' : on ? 'ÉQUIPÉ' : 'ÉQUIPER';
    const tone = !own ? 'locked' : on || r.slot === 'badge' ? 'success' : 'primary';
    const pill = chip(this, x + w - 36, top + h / 2, state, tone, { align: 'right', outline: state === 'ÉQUIPER' });
    pill.setName(`state-${r.id}`);
    c.add(pill);
    if (this.fresh.includes(r.id)) {
      c.add(chip(this, x + 36, top + 6, 'Nouveau', 'accent', { align: 'left' }));
    }
    if (this.changed === r.id) pop(this, pill, 1.15);
    const hit = this.add.rectangle(x + w / 2, top + h / 2, w, h, 0, 0).setInteractive({ useHandCursor: true });
    hit.name = `item-${r.id}`;
    hit.on('pointerup', (p: Phaser.Input.Pointer) => {
      if (Math.abs(p.getDistanceY()) > 30) return;
      Sfx.click();
      if (!own || r.slot === 'badge') return pop(this, c, 1.02);
      if (r.slot === 'decor') Save.toggleDecor(r.id, !on);
      else Save.equip(r.slot, on ? null : r.id);
      const scroll = this.cameras.main.scrollY;
      this.scene.restart({ changed: r.id, fresh: [] });
      this.events.once('create', () => this.cameras.main.setScroll(0, scroll));
    });
    c.add(hit);
  }
}
