import Phaser from 'phaser';
import { BootScene } from '../scene/BootScene';
import { PreloadScene } from '../scene/PreloadScene';
import { StudioScene } from '../scene/StudioScene';
import { TitleScene } from '../scene/TitleScene';

/** Logical canvas size used by gameplay and UI positioning. */
export const GAME_WIDTH = 1280;
export const GAME_HEIGHT = 720;

/** Central Phaser configuration shared by every environment. */
export const gameConfig: Phaser.Types.Core.GameConfig = {
  type: Phaser.AUTO,
  parent: 'game',
  width: GAME_WIDTH,
  height: GAME_HEIGHT,
  backgroundColor: '#10132f',
  pixelArt: false,
  antialias: true,
  physics: {
    default: 'arcade',
    arcade: {
      gravity: { x: 0, y: 0 },
      debug: import.meta.env.DEV && new URLSearchParams(window.location.search).has('debug'),
    },
  },
  scale: {
    mode: Phaser.Scale.FIT,
    autoCenter: Phaser.Scale.CENTER_BOTH,
  },
  scene: [BootScene, PreloadScene, TitleScene, StudioScene],
};
