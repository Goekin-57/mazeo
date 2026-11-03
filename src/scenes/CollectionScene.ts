import Phaser from 'phaser';
import { Sfx } from '../audio/sfx';
import { REWARDS, type RewardDef, type RewardSlot } from '../content/rewards';
import { Save } from '../save';
import { cardBg, chip, label, pop, uiButton } from '../ui/components';
import { finishScreen, setupScreen } from '../ui/screen';
import { color, font, space, touch } from '../ui/theme';
import { reduced, W } from '../ui/ui';
import { Player } from './Player';

// Catégories correspondant au contenu réel : tenues, compagnon, souvenirs (décorations + badges).
const SECTIONS: [string, RewardSlot[]][] = [
  ['Tenues', ['hat', 'scarf']],
  ['Compagnons', ['companion']],
  ['Souvenirs', ['decor', 'badge']],
];

/** Collection : grand aperçu de Bourgeon équipé, actions « Équiper » / « Retirer » explicites. */
export class CollectionScene extends Phaser.Scene {
  private changed: string | null = null;
  private fresh: string[] = [];
  constructor() {
    super('Collection');
  }

  init(data: { changed?: string; fresh?: string[] }) {
    this.changed = data.changed ?? null;
    // « Nouveau » ne s'affiche qu'à la première consultation, puis disparaît
    this.fresh = data.fresh ?? Save.get().collection.fresh.slice();
    Save.clearFresh();
  }

  create() {
    const owned = REWARDS.filter((r) => Save.owns(r.id)).length;
    let y = setupScreen(this, { title: 'Collection', back: 'Home', nav: 'Collection', subtitle: `${owned}/${REWARDS.length} objets · uniquement décoratifs` });
    y = this.preview(y, owned);
    for (const [title, slots] of SECTIONS) {
      const items = REWARDS.filter((r) => slots.includes(r.slot));
      if (!items.length) continue;
      y += space.section;
      label(this, space.margin + 8, y + 24, title, font.body + 3, { weight: 700, align: 'left' }).setName(`section-${title}`);
      y += 74;
      items.forEach((r) => { this.card(r, y); y += 210 + space.gap; });
    }
    finishScreen(this, y);
  }

  private equippedOf(r: RewardDef) {
    const e = Save.get().collection.equipped;
    if (r.slot === 'decor') return e.decor.includes(r.id);
    if (r.slot === 'badge') return false;
    return e[r.slot] === r.id;
  }

  private preview(top: number, owned: number) {
    const x = space.margin, w = W - space.margin * 2, h = 700;
    cardBg(this, x, top, w, h, { fill: '#fffaf0' });
    const eq = Save.get().collection.equipped;
    const pip = new Player(this, W / 2, top + 500, 2.2, { hat: eq.hat === 'hat-gardener', golden: eq.scarf === 'scarf-golden' });
    pip.setName('collection-pip');
    if (this.changed && !reduced()) this.time.delayedCall(120, () => pip.joy());
    if (eq.companion === 'companion-duckling') this.add.image(W / 2 + 250, top + 520, 'duckling').setOrigin(0.5, 0.9).setScale(1.8).setFlipX(true);
    if (eq.decor.includes('deco-magic-flower')) this.add.image(W / 2 - 330, top + 530, 'magic-flower').setOrigin(0.5, 0.95).setScale(1.8);
    if (eq.decor.includes('deco-lanterns')) this.add.image(W / 2 + 380, top + 530, 'lantern').setOrigin(0.5, 0.95).setScale(1.8);
    const names = REWARDS.filter((r) => r.slot !== 'badge' && this.equippedOf(r)).map((r) => r.name);
    const text = owned === 0 ? 'Termine des niveaux pour personnaliser Bourgeon' : names.length ? `Équipé : ${names.join(' · ')}` : 'Rien d’équipé : choisis un objet ci-dessous';
    label(this, W / 2, top + h - 64, text, font.caption + 3, { color: color.inkSoft, weight: 700, wrap: w - 60 }).setName('collection-equipped');
    return top + h;
  }

  private card(r: RewardDef, top: number) {
    const own = Save.owns(r.id);
    const on = this.equippedOf(r);
    const x = space.margin, w = W - space.margin * 2, h = 210;
    const c = this.add.container(0, 0);
    c.add(cardBg(this, x, top, w, h, { fill: own ? '#ffffff' : '#f3ecdc', border: on ? color.success : color.border, borderW: on ? 5 : 3 }));
    const icon = this.add.image(x + 100, top + h / 2, own ? r.icon : r.slot === 'badge' ? 'badge-locked' : r.icon).setScale(r.slot === 'badge' ? 0.8 : r.icon === 'magic-flower' || r.icon === 'lantern' ? 1.05 : 0.95);
    if (!own) icon.setTint(0x8f8b80).setAlpha(0.5);
    c.add(icon);
    const textW = w - 200 - 330;
    c.add(label(this, x + 200, top + h / 2 - 4, r.name, font.body + 1, { weight: 700, align: 'left', color: own ? color.ink : color.inkSoft, wrap: textW }).setOrigin(0, 1));
    const sub = !own ? r.how : r.slot === 'badge' ? 'Badge obtenu' : on ? 'Équipé' : 'Disponible';
    c.add(label(this, x + 200, top + h / 2 + 8, sub, font.caption + 2, { color: color.inkSoft, weight: 700, align: 'left', wrap: textW }).setOrigin(0, 0).setName(`sub-${r.id}`));
    const rx = x + w - 30;
    if (!own) {
      const p = chip(this, rx, top + h / 2, 'Verrouillé', 'locked', { align: 'right' });
      p.setName(`state-${r.id}`);
      c.add(p);
    } else if (r.slot === 'badge') {
      const p = chip(this, rx, top + h / 2, 'Obtenu', 'success', { align: 'right' });
      p.setName(`state-${r.id}`);
      c.add(p);
    } else {
      const b = uiButton(this, rx - 140, top + h / 2, on ? 'secondary' : 'primary', { label: on ? 'Retirer' : 'Équiper', width: 280, name: `state-${r.id}`, small: true, aria: `${on ? 'Retirer' : 'Équiper'} : ${r.name}` }, () => {
        Sfx.click();
        if (r.slot === 'decor') Save.toggleDecor(r.id, !on);
        else Save.equip(r.slot as 'hat' | 'scarf' | 'companion', on ? null : r.id);
        const scroll = this.cameras.main.scrollY;
        this.scene.restart({ changed: r.id, fresh: [] });
        this.events.once('create', () => this.cameras.main.setScroll(0, scroll));
      });
      if (this.changed === r.id) pop(this, b, 1.08);
      c.add(b);
    }
    if (this.fresh.includes(r.id)) c.add(chip(this, x + 36, top + 6, 'Nouveau', 'accent', { align: 'left' }).setName(`fresh-${r.id}`));
    void touch;
  }
}
