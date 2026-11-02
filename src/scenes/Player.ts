import Phaser from 'phaser';
import { reduced } from '../ui/ui';

/** Bourgeon : petit explorateur rond, deux grands yeux, une pousse sur la tête et un sac à dos. */
export class Player extends Phaser.GameObjects.Container {
  inner: Phaser.GameObjects.Container;
  private legL: Phaser.GameObjects.Image;
  private legR: Phaser.GameObjects.Image;
  private eyes: Phaser.GameObjects.Container;
  private pupils: Phaser.GameObjects.Image[];
  private mouth: Phaser.GameObjects.Image;
  private sprout: Phaser.GameObjects.Image;
  private shadow: Phaser.GameObjects.Image;
  private idleTween?: Phaser.Tweens.Tween;
  private sproutTween?: Phaser.Tweens.Tween;
  private blinkEvt?: Phaser.Time.TimerEvent;
  facing = 1;
  busy = false;

  constructor(scene: Phaser.Scene, x: number, y: number, scale: number, look: { hat?: boolean; golden?: boolean } = {}) {
    super(scene, x, y);
    this.shadow = scene.add.image(0, 0, 'shadow').setScale(0.75, 0.7);
    this.inner = scene.add.container(0, 0);
    this.legL = scene.add.image(-17, -9, 'pip-leg');
    this.legR = scene.add.image(19, -9, 'pip-leg');
    const bag = scene.add.image(-44, -64, 'pip-bag').setAngle(-8);
    const bodyImg = scene.add.image(0, -8, look.golden ? 'pip-body-gold' : 'pip-body').setOrigin(0.5, 1);
    const cheekL = scene.add.image(-24, -58, 'pip-cheek');
    const cheekR = scene.add.image(38, -58, 'pip-cheek');
    this.eyes = scene.add.container(6, -82);
    const eyeL = scene.add.image(-16, 0, 'pip-eye');
    const eyeR = scene.add.image(18, 0, 'pip-eye');
    this.pupils = [scene.add.image(-14, 2, 'pip-pupil'), scene.add.image(20, 2, 'pip-pupil')];
    this.eyes.add([eyeL, eyeR, ...this.pupils]);
    this.mouth = scene.add.image(8, -56, 'pip-mouth-smile');
    this.sprout = scene.add.image(2, -112, 'pip-sprout').setOrigin(0.5, 0.95);
    this.inner.add([this.legL, this.legR, bag, bodyImg, cheekL, cheekR, this.eyes, this.mouth]);
    if (look.hat) {
      // la pousse dépasse du chapeau de jardinier
      this.sprout.setY(-150);
      this.inner.add([this.sprout, scene.add.image(4, -104, 'hat-gardener').setScale(0.86)]);
    } else this.inner.add(this.sprout);
    this.add([this.shadow, this.inner]);
    this.setScale(scale);
    scene.add.existing(this);
    this.startIdle();
  }

  startIdle() {
    this.idleTween?.stop();
    this.inner.setScale(this.facing, 1);
    if (!reduced()) {
      this.idleTween = this.scene.tweens.add({
        targets: this.inner, scaleY: 1.035, scaleX: this.facing * 0.985, duration: 900, yoyo: true, repeat: -1, ease: 'Sine.easeInOut',
      });
      this.sproutTween?.stop();
      this.sproutTween = this.scene.tweens.add({ targets: this.sprout, angle: { from: -6, to: 6 }, duration: 1400, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
    }
    this.scheduleBlink();
  }

  private scheduleBlink() {
    this.blinkEvt?.remove();
    this.blinkEvt = this.scene.time.delayedCall(1800 + Math.random() * 2600, () => {
      this.scene.tweens.add({ targets: this.eyes, scaleY: 0.1, duration: 70, yoyo: true, onComplete: () => this.scheduleBlink() });
    });
  }

  setMouth(kind: 'smile' | 'open' | 'sad' | 'o') {
    this.mouth.setTexture(`pip-mouth-${kind}`);
  }

  look(dx: number, dy: number) {
    const ox = dx * 4 * this.facing;
    this.pupils[0].setPosition(-14 + ox, 2 + dy * 4);
    this.pupils[1].setPosition(20 + ox, 2 + dy * 4);
  }

  face(dx: number) {
    if (dx === 0) return;
    this.facing = dx > 0 ? 1 : -1;
    this.inner.scaleX = this.facing * Math.abs(this.inner.scaleX || 1);
  }

  /** Marche d'une case vers (x, y). `onLeave` est appelé quand il quitte la case. */
  walkTo(x: number, y: number, dur: number, onLeave: () => void, onArrive: () => void) {
    const dx = Math.sign(x - this.x);
    const dy = Math.sign(y - this.y);
    this.face(dx);
    this.look(dx, dy);
    this.idleTween?.stop();
    this.inner.setScale(this.facing, 1);
    const hop = reduced() ? 0 : 12;
    this.scene.tweens.add({ targets: this, x, y, duration: dur, ease: 'Sine.easeInOut', onComplete: onArrive });
    if (hop) {
      this.scene.tweens.add({ targets: this.inner, y: -hop, duration: dur / 2, yoyo: true, ease: 'Sine.easeOut' });
      this.scene.tweens.add({ targets: this.inner, angle: dx * 5 || 3, duration: dur / 2, yoyo: true, ease: 'Sine.easeInOut' });
      this.scene.tweens.add({ targets: this.legL, y: -16, duration: dur / 4, yoyo: true, repeat: 1 });
      this.scene.tweens.add({ targets: this.legR, y: -16, duration: dur / 4, yoyo: true, repeat: 1, delay: dur / 4 });
    }
    this.scene.time.delayedCall(dur * 0.35, onLeave);
  }

  /** Petite réaction quand une haie pousse derrière lui. */
  startle(strong: boolean) {
    if (reduced()) return;
    this.scene.tweens.add({ targets: this.inner, scaleY: 0.9, scaleX: this.facing * 1.08, duration: 80, yoyo: true, ease: 'Quad.easeOut' });
    this.look(-this.facing, 0);
    this.scene.time.delayedCall(260, () => this.look(0, 0));
    if (strong) {
      const m = this.scene.add.image(this.x + 34 * this.scaleX, this.y - 150 * this.scaleY, 'pip-mark').setScale(this.scaleX).setDepth(this.depth + 1);
      this.setMouth('o');
      this.scene.tweens.add({ targets: m, y: m.y - 20, alpha: { from: 1, to: 0 }, duration: 800, delay: 300, onComplete: () => m.destroy() });
      this.scene.time.delayedCall(700, () => this.setMouth('smile'));
    }
  }

  bump(dx: number, dy: number) {
    const ox = this.x, oy = this.y;
    this.setMouth('o');
    this.scene.tweens.add({
      targets: this, x: ox + dx * 14 * this.scaleX * 2, y: oy + dy * 10 * this.scaleY * 2, duration: 90, yoyo: true, ease: 'Quad.easeOut',
      onComplete: () => { this.setPosition(ox, oy); this.setMouth('smile'); },
    });
  }

  joy() {
    this.idleTween?.stop();
    this.sproutTween?.stop();
    this.setMouth('open');
    this.look(0, -1);
    if (reduced()) return;
    this.scene.tweens.add({ targets: this.inner, y: -40, duration: 260, yoyo: true, repeat: 2, ease: 'Quad.easeOut' });
    this.scene.tweens.add({ targets: this.inner, scaleY: 0.9, duration: 120, yoyo: true, repeat: 2, delay: 240 });
    this.scene.tweens.add({ targets: this.sprout, angle: 360, duration: 900, ease: 'Cubic.easeOut' });
  }

  sad() {
    this.idleTween?.stop();
    this.sproutTween?.stop();
    this.setMouth('sad');
    this.look(0, 1);
    if (reduced()) return;
    this.scene.tweens.add({ targets: this.inner, scaleY: 0.92, duration: 300, yoyo: true, hold: 500, ease: 'Sine.easeInOut' });
    this.scene.tweens.add({ targets: this.sprout, angle: this.facing * -30, duration: 300, yoyo: true, hold: 700 });
    this.scene.tweens.add({ targets: this.inner, angle: { from: -4, to: 4 }, duration: 120, yoyo: true, repeat: 2 });
  }

  /** Regarde à gauche puis à droite, étonné (impasse). */
  lookAround() {
    this.setMouth('o');
    const seq: [number, number][] = [[-1, 0], [1, 0], [-1, -1], [0, 0]];
    seq.forEach(([dx, dy], i) => this.scene.time.delayedCall(i * 320, () => this.look(dx, dy)));
    if (!reduced()) this.scene.tweens.add({ targets: this.inner, scaleY: 1.08, duration: 140, yoyo: true });
  }

  recover() {
    this.setMouth('smile');
    this.look(0, 0);
    this.inner.setAngle(0).setY(0);
    this.sprout.setAngle(0);
    this.startIdle();
  }
}
