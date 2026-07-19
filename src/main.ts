import Phaser from 'phaser';
import { gameConfig } from './config/gameConfig';
import { MusicDirector } from './audio/MusicDirector';
import './style.css';

/** The application owns one Phaser instance for the lifetime of the page. */
const game = new Phaser.Game(gameConfig);

/** Allow the canvas to receive explicit keyboard focus after pointer interaction. */
game.canvas.setAttribute('tabindex', '0');
game.canvas.setAttribute('role', 'application');
game.canvas.setAttribute('aria-label', '泡泡家族遊戲控制');

/** Destroy WebGL and event resources during hot-module replacement. */
if (import.meta.hot) {
  import.meta.hot.dispose(() => {
    MusicDirector.stopAll();
    game.destroy(true);
  });
}
