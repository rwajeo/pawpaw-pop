import Phaser from 'phaser';
import { createGameConfig } from './game/config';
import './styles/main.css';

const skip = document.createElement('button');
skip.className = 'a11y-skip';
skip.textContent = '게임 화면으로 이동';
skip.addEventListener('click', () => document.querySelector('canvas')?.focus());
document.body.prepend(skip);

const game = new Phaser.Game(createGameConfig());

document.addEventListener('visibilitychange', () => {
  if (document.hidden) game.loop.sleep();
  else game.loop.wake();
});

window.addEventListener('beforeunload', () => game.destroy(true));
