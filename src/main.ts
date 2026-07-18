import Phaser from 'phaser';
import { gameConfig } from './config/gameConfig';
import './style.css';

/** The application owns one Phaser instance for the lifetime of the page. */
const game = new Phaser.Game(gameConfig);

/** Destroy WebGL and event resources during hot-module replacement. */
if (import.meta.hot) {
  import.meta.hot.dispose(() => game.destroy(true));
}
