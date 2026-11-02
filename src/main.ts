import '@fontsource/fredoka/400.css';
import '@fontsource/fredoka/500.css';
import '@fontsource/fredoka/600.css';
import '@fontsource/fredoka/700.css';
import Phaser from 'phaser';
import { BootScene } from './scenes/BootScene';
import { ChallengesScene } from './scenes/ChallengesScene';
import { ChapterEndScene } from './scenes/ChapterEndScene';
import { ChapterScene } from './scenes/ChapterScene';
import { CollectionScene } from './scenes/CollectionScene';
import { CommunityScene } from './scenes/CommunityScene';
import { GameScene } from './scenes/GameScene';
import { HomeScene } from './scenes/HomeScene';
import { JourneyScene } from './scenes/JourneyScene';
import { PauseScene } from './scenes/PauseScene';
import { SettingsScene } from './scenes/SettingsScene';
import { H, paintPageBackground, setViewHeight, W } from './ui/ui';
import { installDebugApi } from './debug';

async function start() {
  try {
    await Promise.race([
      Promise.all(['400', '500', '600', '700'].map((w) => document.fonts.load(`${w} 40px Fredoka`))),
      new Promise((r) => setTimeout(r, 2500)),
    ]);
  } catch {
    /* police de secours */
  }
  // Ratio réel de la zone sûre (#game a un padding env(safe-area-inset-*)).
  const host = document.getElementById('game')!;
  const r = host.clientHeight / Math.max(1, host.clientWidth);
  setViewHeight(Math.min(2400, Math.max(1920, W * r)));
  paintPageBackground();
  const qs = new URLSearchParams(location.search);
  const e2e = qs.has('e2e');
  const game = new Phaser.Game({
    type: Phaser.WEBGL,
    parent: 'game',
    width: W,
    height: H,
    transparent: true,
    // en test automatisé (rendu logiciel lent), on désactive le lissage de démarrage
    fps: e2e ? { panicMax: 0, smoothStep: false } : undefined,
    scale: { mode: Phaser.Scale.FIT, autoCenter: Phaser.Scale.CENTER_BOTH },
    audio: { noAudio: true }, // sons synthétisés via Web Audio (src/audio/sfx.ts)
    input: { activePointers: 2 },
    render: {
      antialias: true,
      antialiasGL: false,
      powerPreference: 'high-performance',
      // 8 unités de texture : minimum garanti par WebGL, évite des quads corrompus
      // observés avec 16 unités sur certains pilotes.
      maxTextures: 8,
    },
    scene: [BootScene, HomeScene, JourneyScene, ChapterScene, GameScene, ChapterEndScene, ChallengesScene, CollectionScene, CommunityScene, SettingsScene, PauseScene],
  });
  installDebugApi(game);
  document.getElementById('loading')?.remove();
}

start();
