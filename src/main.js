import Phaser from 'phaser';
import { VIEW } from './data/config.js';
import BootScene from './scenes/BootScene.js';
import MenuScene from './scenes/MenuScene.js';
import GameScene from './scenes/GameScene.js';
import HudScene from './scenes/HudScene.js';
import UpgradeScene from './scenes/UpgradeScene.js';
import GameOverScene from './scenes/GameOverScene.js';

const el = document.getElementById('loading');

const config = {
  type: Phaser.AUTO,
  parent: 'game',
  backgroundColor: '#0a0a0f',
  pixelArt: true,
  roundPixels: true,
  width: VIEW.w,
  height: VIEW.h,
  scale: {
    mode: Phaser.Scale.FIT,
    autoCenter: Phaser.Scale.CENTER_BOTH,
  },
  physics: {
    default: 'arcade',
    arcade: { gravity: { x: 0, y: 0 }, debug: false },
  },
  render: { fps: 60, antialias: false },
  scene: [BootScene, MenuScene, GameScene, HudScene, UpgradeScene, GameOverScene],
};

const game = new Phaser.Game(config);
game.events.once('ready', () => el?.remove());
if (el) setTimeout(() => el.remove(), 600);

window.__game = game;
