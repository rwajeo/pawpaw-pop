import Phaser from 'phaser';
import { BoardModel, SeededRandom, type Board, type Position } from '../board';
import { DISPLAY_FONT, UI_FONT } from '../constants';
import { CHARACTERS } from '../data/characters';
import { createDifficultyChallenge } from '../data/difficulties';
import { getStarsForScore } from '../data/stages';
import { FloatingTextPool } from '../entities/FloatingTextPool';
import { ParticlePool } from '../entities/ParticlePool';
import { Tile as TileView, type TileSpecial } from '../entities/Tile';
import { achievementSystem } from '../systems/AchievementSystem';
import { audioSystem } from '../systems/AudioSystem';
import { GoalSystem } from '../systems/GoalSystem';
import { hapticSystem } from '../systems/HapticSystem';
import { saveSystem } from '../systems/SaveSystem';
import type { Difficulty, ObstacleType, SpecialTileType, StageDefinition } from '../types';
import { TutorialOverlay } from '../ui/TutorialOverlay';
import { BaseScene } from './BaseScene';

interface GameData { difficulty?: Difficulty; }
interface RuntimeObstacle { type: ObstacleType; row: number; col: number; hp: number; view?: Phaser.GameObjects.Container; }

const BOARD_X = 24;
const BOARD_Y = 205;
const CELL = 129;
const BOARD_PIXELS = CELL * 8;
const TILE_SIZE = 122;
const STATUS_Y = 200;
const keyOf = ({ row, col }: Position): string => `${row}:${col}`;

export class GameScene extends BaseScene {
  private stage!: StageDefinition;
  private stageId = 1;
  private difficulty: Difficulty = 'easy';
  private model!: BoardModel;
  private goals!: GoalSystem;
  private boardLayer!: Phaser.GameObjects.Container;
  private obstacleLayer!: Phaser.GameObjects.Container;
  private views = new Map<string, TileView>();
  private obstacles: RuntimeObstacle[] = [];
  private selected?: Position;
  private keyboardFocus: Position = { row: 0, col: 0 };
  private keyboardFocusVisible = false;
  private boardInputZone?: Phaser.GameObjects.Zone;
  private activeBoardPointer?: { id: number; startX: number; startY: number; position: Position };
  private locked = false;
  private paused = false;
  private tutorialActive = false;
  private ending = false;
  private score = 0;
  private secondsLeft = 0;
  private timeAwardedThisMove = false;
  private bestCombo = 0;
  private shufflesLeft = 2;
  private shuffleButton?: Phaser.GameObjects.Container;
  private scoreText!: Phaser.GameObjects.Text;
  private timeText!: Phaser.GameObjects.Text;
  private timeBar!: Phaser.GameObjects.Graphics;
  private statusText!: Phaser.GameObjects.Text;
  private statusPlate!: Phaser.GameObjects.Graphics;
  private particlePool!: ParticlePool;
  private floatingPool!: FloatingTextPool;
  private countdownEvent?: Phaser.Time.TimerEvent;

  public constructor() { super('GameScene'); }

  public init(data: GameData): void {
    this.difficulty = data.difficulty ?? 'easy';
  }

  public create(): void {
    this.addPremiumBackdrop(0x6555c9);
    this.cameras.main.fadeIn(180, 255, 248, 232);
    this.stage = createDifficultyChallenge(this.difficulty);
    this.stageId = this.stage.id;
    const allowedKinds = (this.stage.characterPool ?? CHARACTERS.map((character) => character.id))
      .map((id) => CHARACTERS.findIndex((character) => character.id === id))
      .filter((index) => index >= 0);
    this.model = new BoardModel({ seed: this.stage.seed, kinds: allowedKinds });
    this.goals = new GoalSystem(this.stage);
    this.secondsLeft = this.stage.timeLimit ?? 0;
    this.timeAwardedThisMove = false;
    this.score = 0;
    this.bestCombo = 0;
    this.shufflesLeft = 2;
    this.shuffleButton = undefined;
    this.locked = false;
    this.paused = false;
    this.ending = false;
    this.selected = undefined;
    this.keyboardFocus = { row: 0, col: 0 };
    this.keyboardFocusVisible = false;
    this.activeBoardPointer = undefined;
    const settings = saveSystem.getData().settings;
    audioSystem.applySettings(settings);
    hapticSystem.setEnabled(settings.hapticsEnabled);
    this.particlePool = new ParticlePool(this, settings.reducedParticles ? 20 : 76);
    this.floatingPool = new FloatingTextPool(this, 16);

    this.createHud();
    this.createBoardFrame();
    this.createObstacles();
    this.displayBoard(this.model.board, true);
    this.createBoardInput();
    this.createShuffleButton();
    this.bindKeyboard();
    this.startTimerIfNeeded();
    this.showTutorialIfNeeded();
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      this.countdownEvent?.destroy();
      this.input.off(Phaser.Input.Events.POINTER_UP, this.finishBoardPointer, this);
      this.input.off(Phaser.Input.Events.POINTER_UP_OUTSIDE, this.finishBoardPointer, this);
      this.particlePool.destroy();
      this.floatingPool.destroy();
    });
    void audioSystem.resume().then(() => audioSystem.startMusic('stage'));
  }

  private createHud(): void {
    const shell = this.add.graphics();
    shell.fillStyle(0x070611, 0.42).fillRoundedRect(20, 25, 1040, 142, 36);
    shell.fillGradientStyle(0x30294f, 0x262744, 0x1e3449, 0x24243e, 0.98).lineStyle(3, 0xffffff, 0.14)
      .fillRoundedRect(20, 14, 1040, 142, 36).strokeRoundedRect(20, 14, 1040, 142, 36);
    shell.fillStyle(0xff6d91, 0.11).fillRoundedRect(134, 29, 270, 106, 26);
    shell.fillStyle(0x7468ff, 0.1).fillRoundedRect(422, 29, 614, 106, 26);
    this.add.text(154, 37, this.difficulty.replace(/([A-Z])/g, ' $1').toUpperCase(), {
      fontFamily: DISPLAY_FONT, fontSize: '18px', fontStyle: 'bold', color: '#ff9bb5',
    });
    this.timeText = this.add.text(154, 65, '', {
      fontFamily: DISPLAY_FONT, fontSize: '42px', fontStyle: 'bold', color: '#ffffff',
    });
    this.timeBar = this.add.graphics();
    this.scoreText = this.add.text(755, 92, '0', {
      fontFamily: DISPLAY_FONT, fontSize: '76px', fontStyle: 'bold', color: '#ffffff',
    }).setOrigin(0.5).setShadow(0, 7, '#131027', 10, true, true).setLetterSpacing(-2);
    this.add.text(755, 42, 'SCORE', { fontFamily: DISPLAY_FONT, fontSize: '18px', fontStyle: 'bold', color: '#b9b4d4' }).setOrigin(0.5).setLetterSpacing(3);
    this.statusPlate = this.add.graphics().setDepth(99).setVisible(false);
    this.statusText = this.add.text(540, STATUS_Y, '', {
      fontFamily: UI_FONT, fontSize: '42px', fontStyle: 'bold', color: '#ffffff',
      stroke: '#5e3d69', strokeThickness: 9,
    }).setOrigin(0.5).setDepth(100).setShadow(0, 7, '#4a304f', 8, true, true);
    this.createHomeButton();
    this.refreshHud();
  }

  private createHomeButton(): void {
    const root = this.add.container(74, 84);
    const shadow = this.add.graphics().fillStyle(0x06050f, 0.5).fillCircle(0, 7, 49);
    const halo = this.add.graphics().fillStyle(0x8175ff, 0.16).fillCircle(0, 0, 53);
    const plate = this.add.graphics()
      .fillGradientStyle(0x7668ec, 0x5c72d8, 0x3f7fae, 0x514db0, 1)
      .lineStyle(3, 0xffffff, 0.34).fillCircle(0, 0, 47).strokeCircle(0, 0, 47);
    const icon = this.add.graphics()
      .fillStyle(0xffffff, 1).fillTriangle(-23, -4, 0, -27, 23, -4)
      .fillRoundedRect(-18, -5, 36, 30, 6)
      .fillStyle(0x4c4e9d, 0.65).fillRoundedRect(-5, 10, 10, 15, 3);
    root.add([shadow, halo, plate, icon]);
    root.setSize(124, 124).setInteractive({ useHandCursor: true });
    root.on('pointerover', () => this.tweens.add({ targets: root, scale: 1.06, duration: 90 }));
    root.on('pointerout', () => this.tweens.add({ targets: root, scale: 1, duration: 100 }));
    root.on('pointerdown', () => root.setScale(0.94));
    root.on('pointerup', () => {
      root.setScale(1);
      void audioSystem.resume().then(() => audioSystem.playSfx('button'));
      if (!this.tutorialActive) this.togglePause();
    });
  }

  private createBoardFrame(): void {
    const frame = this.add.graphics();
    frame.fillStyle(0x05040d, 0.46).fillRoundedRect(BOARD_X - 22, BOARD_Y - 1, BOARD_PIXELS + 44, BOARD_PIXELS + 44, 42);
    frame.fillGradientStyle(0x4d416e, 0x403c63, 0x333b58, 0x3c3659, 0.98)
      .lineStyle(5, 0xffffff, 0.24)
      .fillRoundedRect(BOARD_X - 16, BOARD_Y - 16, BOARD_PIXELS + 32, BOARD_PIXELS + 32, 38)
      .strokeRoundedRect(BOARD_X - 16, BOARD_Y - 16, BOARD_PIXELS + 32, BOARD_PIXELS + 32, 38);
    this.boardLayer = this.add.container(BOARD_X, BOARD_Y);
    this.obstacleLayer = this.add.container(BOARD_X, BOARD_Y).setDepth(30);
  }

  private cellPosition(position: Position): { x: number; y: number } {
    return { x: position.col * CELL + CELL / 2, y: position.row * CELL + CELL / 2 };
  }

  private displayBoard(board: Board, landing = false): void {
    this.views.forEach((view) => view.destroy());
    this.views.clear();
    board.forEach((row, rowIndex) => row.forEach((cell, colIndex) => {
      if (!cell) return;
      const position = { row: rowIndex, col: colIndex };
      const point = this.cellPosition(position);
      const view = new TileView(this, point.x, point.y, {
        character: cell.kind ?? 0,
        size: TILE_SIZE,
        special: (cell.special ?? 'none') as TileSpecial,
        reducedMotion: saveSystem.getData().settings.reducedMotion,
      });
      this.boardLayer.add(view);
      view.disableInteractive();
      this.views.set(keyOf(position), view);
      if (landing) {
        view.setScale(0.5).setAlpha(0);
        this.time.delayedCall((rowIndex + colIndex) * 15, () => {
          if (!view.active) return;
          view.setAlpha(1).playLanding();
        });
      }
    }));
    this.syncObstacleTileVisibility();
    this.refreshSelection();
  }

  private displayBoardColumns(board: Board, columns: ReadonlySet<number>, landing = true): void {
    if (columns.size === 0) return;
    [...this.views.entries()].forEach(([key, view]) => {
      const col = Number(key.split(':')[1]);
      if (!columns.has(col)) return;
      view.destroy();
      this.views.delete(key);
    });
    board.forEach((row, rowIndex) => row.forEach((cell, colIndex) => {
      if (!cell || !columns.has(colIndex)) return;
      const position = { row: rowIndex, col: colIndex };
      const point = this.cellPosition(position);
      const view = new TileView(this, point.x, point.y, {
        character: cell.kind ?? 0,
        size: TILE_SIZE,
        special: (cell.special ?? 'none') as TileSpecial,
        reducedMotion: saveSystem.getData().settings.reducedMotion,
      });
      this.boardLayer.add(view);
      view.disableInteractive();
      this.views.set(keyOf(position), view);
      if (landing) {
        view.setScale(0.7).setAlpha(0);
        this.time.delayedCall(rowIndex * 18, () => {
          if (!view.active) return;
          view.setAlpha(1).playLanding();
        });
      }
    }));
    this.syncObstacleTileVisibility();
    this.refreshSelection();
  }

  private createBoardInput(): void {
    this.boardInputZone?.destroy();
    this.boardInputZone = this.add.zone(
      BOARD_X + BOARD_PIXELS / 2,
      BOARD_Y + BOARD_PIXELS / 2,
      BOARD_PIXELS,
      BOARD_PIXELS,
    ).setDepth(80).setInteractive({ useHandCursor: true });
    this.boardInputZone.on(Phaser.Input.Events.GAMEOBJECT_POINTER_DOWN, this.beginBoardPointer, this);
    this.input.off(Phaser.Input.Events.POINTER_UP, this.finishBoardPointer, this);
    this.input.off(Phaser.Input.Events.POINTER_UP_OUTSIDE, this.finishBoardPointer, this);
    this.input.on(Phaser.Input.Events.POINTER_UP, this.finishBoardPointer, this);
    this.input.on(Phaser.Input.Events.POINTER_UP_OUTSIDE, this.finishBoardPointer, this);
  }

  private positionFromPointer(pointer: Phaser.Input.Pointer): Position | undefined {
    const localX = pointer.worldX - BOARD_X;
    const localY = pointer.worldY - BOARD_Y;
    if (localX < 0 || localY < 0 || localX >= BOARD_PIXELS || localY >= BOARD_PIXELS) return undefined;
    return { row: Math.floor(localY / CELL), col: Math.floor(localX / CELL) };
  }

  private beginBoardPointer(pointer: Phaser.Input.Pointer): void {
    if (this.locked || this.paused || this.ending || this.tutorialActive || this.activeBoardPointer) return;
    const position = this.positionFromPointer(pointer);
    if (!position) return;
    this.keyboardFocusVisible = false;
    this.refreshSelection();
    this.activeBoardPointer = {
      id: pointer.id,
      startX: pointer.worldX,
      startY: pointer.worldY,
      position,
    };
    this.createTouchRipple(pointer.worldX, pointer.worldY);
    void audioSystem.resumeAndStartMusic('stage');
  }

  private createTouchRipple(x: number, y: number): void {
    if (saveSystem.getData().settings.reducedMotion) return;
    const ripple = this.add.graphics().setPosition(x, y).setDepth(96).setBlendMode(Phaser.BlendModes.ADD);
    ripple.fillStyle(0xffffff, 0.7).fillCircle(0, 0, 8);
    ripple.lineStyle(5, 0xffd8eb, 0.9).strokeCircle(0, 0, 20);
    ripple.lineStyle(2, 0xffffff, 0.95).strokeCircle(0, 0, 31);
    for (let index = 0; index < 6; index += 1) {
      const angle = index * Math.PI / 3;
      ripple.fillStyle(index % 2 === 0 ? 0xfff1a8 : 0xc5f4ff, 0.95)
        .fillCircle(Math.cos(angle) * 27, Math.sin(angle) * 27, index % 2 === 0 ? 4 : 3);
    }
    ripple.setScale(0.35);
    this.tweens.add({ targets: ripple, scale: 1.65, alpha: 0, angle: 12, duration: 280, ease: 'Cubic.Out', onComplete: () => ripple.destroy() });
  }

  private finishBoardPointer(pointer: Phaser.Input.Pointer): void {
    const active = this.activeBoardPointer;
    if (!active || pointer.id !== active.id) return;
    this.activeBoardPointer = undefined;
    if (this.locked || this.paused || this.ending || this.tutorialActive) return;
    const dx = pointer.worldX - active.startX;
    const dy = pointer.worldY - active.startY;
    if (Math.max(Math.abs(dx), Math.abs(dy)) > 30) {
      this.selected = undefined;
      this.refreshSelection();
      const target = Math.abs(dx) > Math.abs(dy)
        ? { row: active.position.row, col: active.position.col + Math.sign(dx) }
        : { row: active.position.row + Math.sign(dy), col: active.position.col };
      if (this.inside(target)) void this.trySwap(active.position, target);
      else this.views.get(keyOf(active.position))?.flashInvalid();
      return;
    }
    this.handleTap(active.position);
  }

  private handleTap(position: Position): void {
    this.keyboardFocusVisible = false;
    audioSystem.playSfx('select');
    hapticSystem.play('tap');
    if (!this.selected) {
      this.selected = position;
      this.refreshSelection();
      return;
    }
    if (keyOf(this.selected) === keyOf(position)) {
      this.selected = undefined;
      this.refreshSelection();
      return;
    }
    if (Math.abs(this.selected.row - position.row) + Math.abs(this.selected.col - position.col) === 1) {
      const first = this.selected;
      this.selected = undefined;
      this.refreshSelection();
      void this.trySwap(first, position);
    } else {
      this.selected = position;
      this.refreshSelection();
    }
  }

  private async trySwap(from: Position, to: Position): Promise<void> {
    if (this.locked || this.paused || this.ending) return;
    this.locked = true;
    const fromView = this.views.get(keyOf(from));
    const toView = this.views.get(keyOf(to));
    const originalBoard = this.model.board;
    if (!fromView || !toView) {
      this.displayBoard(originalBoard, false);
      this.locked = false;
      return;
    }
    const fromOrigin = this.cellPosition(from);
    const toOrigin = this.cellPosition(to);
    this.tweens.killTweensOf(fromView);
    this.tweens.killTweensOf(toView);
    fromView.setDepth(42);
    toView.setDepth(41);
    audioSystem.playSfx('swap');
    await Promise.all([
      this.tweenPromise(fromView, { x: toOrigin.x, y: toOrigin.y, duration: 96, ease: 'Cubic.InOut' }),
      this.tweenPromise(toView, { x: fromOrigin.x, y: fromOrigin.y, duration: 96, ease: 'Cubic.InOut' }),
    ]);
    const result = this.model.swap(from, to);
    if (!result.accepted) {
      audioSystem.playSfx('invalid');
      fromView.setExpression('worried');
      toView.setExpression('worried');
      this.showInvalidSwapCue(fromOrigin, toOrigin);
      await Promise.all([
        this.tweenPromise(fromView, { x: fromOrigin.x, y: fromOrigin.y, duration: 118, ease: 'Back.Out' }),
        this.tweenPromise(toView, { x: toOrigin.x, y: toOrigin.y, duration: 118, ease: 'Back.Out' }),
      ]);
      fromView.setPosition(fromOrigin.x, fromOrigin.y).setDepth(0).flashInvalid();
      toView.setPosition(toOrigin.x, toOrigin.y).setDepth(0).flashInvalid();
      this.locked = false;
      return;
    }

    // The visual tiles have already traded places. Keep the position map in
    // sync so the character that completed the match receives the pop motion.
    this.views.set(keyOf(from), toView);
    this.views.set(keyOf(to), fromView);
    fromView.setDepth(0);
    toView.setDepth(0);

    const swappedSpecials = [originalBoard[from.row]?.[from.col]?.special, originalBoard[to.row]?.[to.col]?.special];
    const swapImpact = swappedSpecials.includes('rainbow') ? 'rainbow'
      : swappedSpecials.includes('bomb') ? 'bomb'
        : swappedSpecials.some((special) => special === 'row' || special === 'column') ? 'rocket' : undefined;
    this.timeAwardedThisMove = false;
    let cascade = 0;
    for (const step of result.cascades) {
      cascade += 1;
      this.bestCombo = Math.max(this.bestCombo, cascade);
      await this.playCascade(step.removed, step.score, cascade, originalBoard, cascade === 1 ? swapImpact : undefined);
      step.created.forEach((created) => {
        const special = this.toGoalSpecial(created.special);
        this.playSpecialCreated(created.position, created.special);
        this.goals.apply({ type: 'special', special });
        achievementSystem.record({ type: 'specialUsed', special });
      });
    }
    this.score += result.score;
    this.goals.apply({ type: 'score', value: this.score, absolute: true });
    achievementSystem.record({ type: 'combo', value: this.bestCombo });
    const affectedColumns = new Set<number>([from.col, to.col]);
    result.cascades.forEach((step) => step.removed.forEach((position) => affectedColumns.add(position.col)));
    this.displayBoardColumns(result.board, affectedColumns, true);
    this.refreshObstacles();
    this.refreshHud();
    if (result.reshuffled) this.flashStatus('움직임이 없어 자동으로 섞었어요!');
    this.locked = false;
    this.checkEnd();
  }

  private tweenPromise(target: Phaser.GameObjects.GameObject, config: { x: number; y: number; duration: number; ease?: string }): Promise<void> {
    return new Promise((resolve) => this.tweens.add({ ...config, targets: target, onComplete: () => resolve() }));
  }

  private showInvalidSwapCue(from: { x: number; y: number }, to: { x: number; y: number }): void {
    const cue = this.add.graphics().setDepth(88);
    cue.lineStyle(7, 0xff6f87, 0.9);
    cue.strokeCircle(BOARD_X + from.x, BOARD_Y + from.y, 42);
    cue.strokeCircle(BOARD_X + to.x, BOARD_Y + to.y, 42);
    cue.lineStyle(5, 0xffffff, 0.75);
    cue.lineBetween(BOARD_X + from.x - 12, BOARD_Y + from.y - 12, BOARD_X + from.x + 12, BOARD_Y + from.y + 12);
    cue.lineBetween(BOARD_X + from.x + 12, BOARD_Y + from.y - 12, BOARD_X + from.x - 12, BOARD_Y + from.y + 12);
    cue.setAlpha(0.95);
    this.tweens.add({ targets: cue, alpha: 0, scale: 1.08, duration: 220, ease: 'Sine.Out', onComplete: () => cue.destroy() });
  }

  private async playCascade(
    removed: readonly Position[],
    points: number,
    combo: number,
    source: Board,
    forcedImpact?: 'rocket' | 'bomb' | 'rainbow',
  ): Promise<void> {
    const settings = saveSystem.getData().settings;
    const rowCounts = new Map<number, number>();
    const colCounts = new Map<number, number>();
    removed.forEach(({ row, col }) => {
      rowCounts.set(row, (rowCounts.get(row) ?? 0) + 1);
      colCounts.set(col, (colCounts.get(col) ?? 0) + 1);
      const view = this.views.get(`${row}:${col}`);
      view?.setExpression('worried');
      if (!settings.reducedMotion && view) this.tweens.add({ targets: view, scaleX: 1.12, scaleY: 0.94, duration: 42, ease: 'Quad.Out' });
    });
    if (!settings.reducedMotion) await new Promise<void>((resolve) => this.time.delayedCall(46, () => resolve()));

    const fullRow = [...rowCounts.entries()].find(([, count]) => count >= 8)?.[0];
    const fullColumn = [...colCounts.entries()].find(([, count]) => count >= 8)?.[0];
    const impactKind = forcedImpact ?? (removed.length >= 40 ? 'rainbow' : removed.length >= 16 ? 'bomb' : fullRow !== undefined || fullColumn !== undefined ? 'rocket' : removed.length === 4 ? 'match4' : 'match3');
    removed.forEach((position) => {
      const point = this.cellPosition(position);
      const view = this.views.get(keyOf(position));
      view?.playRemove();
      const worldX = BOARD_X + point.x;
      const worldY = BOARD_Y + point.y;
      const character = source[position.row]?.[position.col]?.kind;
      const definition = character === null || character === undefined ? undefined : CHARACTERS[character];
      const colors = definition ? [definition.bodyColor, definition.accentColor, 0xffffff] : [0xff8fab, 0xffd166, 0xffffff];
      if (!settings.reducedParticles) this.particlePool.burst(worldX, worldY, {
        count: impactKind === 'rainbow' ? 28 : impactKind === 'bomb' ? 22 : impactKind === 'match4' || combo >= 4 ? 16 : 11,
        colors,
        speed: { min: 90, max: impactKind === 'bomb' ? 260 : 190 },
        lifespan: impactKind === 'bomb' ? 620 : 470,
        size: { min: 3, max: impactKind === 'bomb' ? 8 : 6 },
      });
      this.createPopFlash(worldX, worldY, definition?.bodyColor ?? 0xff9bb5, impactKind === 'match3' ? 0.72 : 1);
      if (character !== null && character !== undefined) this.goals.apply({ type: 'collect', characterId: CHARACTERS[character]?.id ?? 'momo' });
    });
    this.attackObstacles(removed);
    const anchor = removed[Math.floor(removed.length / 2)] ?? { row: 3, col: 3 };
    const p = this.cellPosition(anchor);
    if (!settings.reducedMotion) this.createMatchTrace(removed, impactKind);
    this.createImpactWave(BOARD_X + p.x, BOARD_Y + p.y, impactKind, combo, fullRow, fullColumn);
    this.floatingPool.show(BOARD_X + p.x, BOARD_Y + p.y, points, {
      color: combo >= 3 ? '#fff0a6' : '#ffffff', fontSize: 38 + Math.min(combo, 5) * 3, duration: 820, rise: 64,
    });
    const phrases = ['좋아!', '멋져!', '대단해!', '포포 콤보!', '환상적이야!', '믿을 수 없어!'];
    if (combo >= 2) this.flashStatus(phrases[Math.min(phrases.length - 1, combo - 2)] ?? '좋아!', true);
    audioSystem.playSfx(impactKind, combo);
    if (combo >= 2) audioSystem.playSfx('combo', combo);
    const hapticCue = impactKind === 'rainbow' ? 'rainbow' : impactKind === 'bomb' ? 'bomb' : impactKind === 'match4' || impactKind === 'rocket' ? 'match4' : 'match3';
    hapticSystem.playMatch(hapticCue, combo);
    this.addMatchTime(impactKind, BOARD_X + p.x, BOARD_Y + p.y);
    if (settings.screenShake && !settings.reducedMotion) {
      const strength = impactKind === 'bomb' ? 0.006 : impactKind === 'rainbow' ? 0.005 : Math.min(0.0038, 0.0012 + combo * 0.00035);
      this.cameras.main.shake(impactKind === 'bomb' ? 135 : 90, strength);
    }
    await new Promise<void>((resolve) => this.time.delayedCall(settings.reducedMotion ? 70 : impactKind === 'bomb' ? 230 : 175, () => resolve()));
  }

  private createPopFlash(x: number, y: number, color: number, intensity: number): void {
    const flash = this.add.graphics().setPosition(x, y).setDepth(90).setBlendMode(Phaser.BlendModes.ADD);
    flash.fillStyle(color, 0.34 * intensity).fillCircle(0, 0, 44);
    flash.fillStyle(0xffffff, 0.82 * intensity).fillCircle(0, 0, 17);
    flash.lineStyle(5, 0xffffff, 0.84 * intensity).strokeCircle(0, 0, 29);
    for (let index = 0; index < 8; index += 1) {
      const angle = index * Math.PI / 4 + 0.18;
      const inner = index % 2 === 0 ? 31 : 35;
      const outer = index % 2 === 0 ? 62 : 51;
      flash.lineStyle(index % 2 === 0 ? 5 : 3, color, 0.82).lineBetween(Math.cos(angle) * inner, Math.sin(angle) * inner, Math.cos(angle) * outer, Math.sin(angle) * outer);
    }
    flash.setScale(0.45);
    this.tweens.add({ targets: flash, scale: 1.58, alpha: 0, angle: 8, duration: 255, ease: 'Cubic.Out', onComplete: () => flash.destroy() });
  }

  private createMatchTrace(removed: readonly Position[], kind: 'match3' | 'match4' | 'rocket' | 'bomb' | 'rainbow'): void {
    const color = kind === 'rainbow' ? 0xdca8ff : kind === 'bomb' ? 0xffbd62 : kind === 'rocket' ? 0x8eeaff : 0xff9fbd;
    const keys = new Set(removed.map(keyOf));
    const trace = this.add.graphics().setDepth(89).setBlendMode(Phaser.BlendModes.ADD);
    const drawConnections = (width: number, alpha: number, lineColor: number): void => {
      trace.lineStyle(width, lineColor, alpha);
      removed.forEach((position) => {
        const start = this.cellPosition(position);
        [{ row: position.row, col: position.col + 1 }, { row: position.row + 1, col: position.col }].forEach((next) => {
          if (!keys.has(keyOf(next))) return;
          const end = this.cellPosition(next);
          trace.lineBetween(BOARD_X + start.x, BOARD_Y + start.y, BOARD_X + end.x, BOARD_Y + end.y);
        });
      });
    };
    drawConnections(28, 0.22, color);
    drawConnections(10, 0.52, color);
    drawConnections(3, 0.9, 0xffffff);
    this.tweens.add({ targets: trace, alpha: 0, duration: 310, ease: 'Sine.Out', onComplete: () => trace.destroy() });
  }

  private createImpactWave(
    x: number,
    y: number,
    kind: 'match3' | 'match4' | 'rocket' | 'bomb' | 'rainbow',
    combo: number,
    fullRow?: number,
    fullColumn?: number,
  ): void {
    const color = kind === 'rainbow' ? 0xdca8ff : kind === 'bomb' ? 0xffb34f : kind === 'rocket' ? 0x8eeaff : 0xffa6bd;
    const flare = this.add.graphics().setPosition(x, y).setDepth(93).setBlendMode(Phaser.BlendModes.ADD);
    flare.fillStyle(color, 0.25).fillCircle(0, 0, kind === 'bomb' ? 82 : 58);
    for (let index = 0; index < 12; index += 1) {
      const angle = index * Math.PI / 6;
      const length = (index % 2 === 0 ? 104 : 78) + Math.min(combo, 6) * 5;
      flare.lineStyle(index % 2 === 0 ? 7 : 4, index % 3 === 0 ? 0xffffff : color, index % 2 === 0 ? 0.7 : 0.5)
        .lineBetween(Math.cos(angle) * 24, Math.sin(angle) * 24, Math.cos(angle) * length, Math.sin(angle) * length);
    }
    flare.setScale(0.3).setAngle(-8);
    this.tweens.add({ targets: flare, scale: 1.25, angle: 7, alpha: 0, duration: 330, ease: 'Expo.Out', onComplete: () => flare.destroy() });
    const ring = this.add.graphics().setPosition(x, y).setDepth(92).setBlendMode(Phaser.BlendModes.ADD);
    ring.lineStyle(kind === 'bomb' ? 14 : 8, 0xffffff, 0.86).strokeCircle(0, 0, kind === 'bomb' ? 52 : 34);
    ring.lineStyle(kind === 'bomb' ? 24 : 14, color, 0.35).strokeCircle(0, 0, kind === 'bomb' ? 66 : 45);
    ring.setScale(0.35);
    this.tweens.add({ targets: ring, scale: kind === 'bomb' ? 4.4 : 2.25, alpha: 0, duration: kind === 'bomb' ? 360 : 235, ease: 'Quad.Out', onComplete: () => ring.destroy() });
    const echo = this.add.graphics().setPosition(x, y).setDepth(91).setBlendMode(Phaser.BlendModes.ADD);
    echo.lineStyle(5, color, 0.72).strokeCircle(0, 0, kind === 'bomb' ? 64 : 45);
    echo.setScale(0.5).setAlpha(0);
    this.tweens.add({ targets: echo, scale: kind === 'bomb' ? 3.7 : 2.65, alpha: { from: 0.8, to: 0 }, delay: 55, duration: 390, ease: 'Cubic.Out', onComplete: () => echo.destroy() });

    if (kind === 'bomb' || kind === 'rainbow' || combo >= 4) {
      const washColor = kind === 'rainbow' ? 0xdca8ff : kind === 'bomb' ? 0xffc36c : 0xffe38b;
      const wash = this.add.rectangle(540, 960, 1080, 1920, washColor, kind === 'rainbow' ? 0.2 : 0.12)
        .setDepth(88).setBlendMode(Phaser.BlendModes.ADD).setAlpha(0);
      this.tweens.add({ targets: wash, alpha: { from: 0.34, to: 0 }, duration: 260, ease: 'Expo.Out', onComplete: () => wash.destroy() });
      const prism = this.add.graphics().setPosition(x, y).setDepth(94).setBlendMode(Phaser.BlendModes.ADD);
      [0xff7f9f, 0xffdf73, 0x74e5d2, 0x8cc8ff, 0xd596ff].forEach((prismColor, index) => {
        prism.lineStyle(5, prismColor, 0.72).strokeCircle(0, 0, 34 + index * 9);
      });
      prism.setScale(0.4);
      this.tweens.add({ targets: prism, scale: kind === 'rainbow' ? 4.8 : 3.5, alpha: 0, angle: 24, duration: 440, ease: 'Quart.Out', onComplete: () => prism.destroy() });
    }

    if (kind === 'rocket') {
      const beam = this.add.graphics().setDepth(91).setBlendMode(Phaser.BlendModes.ADD);
      if (fullRow !== undefined) {
        const beamY = BOARD_Y + fullRow * CELL + CELL / 2;
        beam.fillStyle(0xffffff, 0.86).fillRoundedRect(BOARD_X - 24, beamY - 8, BOARD_PIXELS + 48, 16, 8);
        beam.fillStyle(0x78dcff, 0.35).fillRoundedRect(BOARD_X - 36, beamY - 25, BOARD_PIXELS + 72, 50, 25);
      }
      if (fullColumn !== undefined) {
        const beamX = BOARD_X + fullColumn * CELL + CELL / 2;
        beam.fillStyle(0xffffff, 0.86).fillRoundedRect(beamX - 8, BOARD_Y - 24, 16, BOARD_PIXELS + 48, 8);
        beam.fillStyle(0x78dcff, 0.35).fillRoundedRect(beamX - 25, BOARD_Y - 36, 50, BOARD_PIXELS + 72, 25);
      }
      this.tweens.add({ targets: beam, alpha: 0, duration: 230, ease: 'Expo.Out', onComplete: () => beam.destroy() });
    }

    if (kind === 'rainbow' || combo >= 5) {
      const edge = this.add.graphics().setDepth(80).setBlendMode(Phaser.BlendModes.ADD);
      edge.lineStyle(kind === 'rainbow' ? 34 : 22, kind === 'rainbow' ? 0xcda0ff : 0xffd978, 0.45)
        .strokeRoundedRect(22, 22, 1036, 1876, 54);
      this.tweens.add({ targets: edge, alpha: 0, duration: 520, ease: 'Sine.Out', onComplete: () => edge.destroy() });
    }
  }

  private playSpecialCreated(position: Position, special: 'row' | 'column' | 'bomb' | 'rainbow'): void {
    const point = this.cellPosition(position);
    const x = BOARD_X + point.x;
    const y = BOARD_Y + point.y;
    const color = special === 'rainbow' ? 0xd89cff : special === 'bomb' ? 0xffb14d : 0x79dfff;
    const badge = this.add.graphics().setPosition(x, y).setDepth(96).setBlendMode(Phaser.BlendModes.ADD);
    badge.fillStyle(color, 0.34).fillCircle(0, 0, 48);
    badge.lineStyle(7, 0xffffff, 0.95).strokeCircle(0, 0, 35);
    badge.lineStyle(4, color, 0.9).strokeCircle(0, 0, 52);
    badge.setScale(0.35);
    this.tweens.add({ targets: badge, scale: 1.9, alpha: 0, duration: 360, ease: 'Back.Out', onComplete: () => badge.destroy() });
    this.floatingPool.show(x, y - 42, special === 'rainbow' ? '무지개 별!' : special === 'bomb' ? '포포 폭탄!' : '로켓 완성!', {
      color: special === 'rainbow' ? '#f4d7ff' : '#fff4b8', fontSize: 25, duration: 700, rise: 58,
    });
    audioSystem.playSfx(special === 'rainbow' ? 'rainbow' : special === 'bomb' ? 'bomb' : 'rocket');
  }

  private createObstacles(): void {
    this.obstacles = [];
    const reserved = new Set<string>();
    let cursor = 0;
    const candidates: Position[] = [];
    for (let row = 1; row < 7; row += 1) for (let col = 0; col < 8; col += 1) candidates.push({ row, col });
    const positions = new SeededRandom(`${this.stage.seed}-obstacles`).shuffle(candidates);
    for (const definition of this.stage.obstacles) {
      for (let count = 0; count < definition.count; count += 1) {
        let position = positions[cursor % positions.length] ?? { row: 3, col: 3 };
        cursor += 1;
        while (reserved.has(keyOf(position))) { position = positions[cursor % positions.length] ?? position; cursor += 1; }
        reserved.add(keyOf(position));
        this.obstacles.push({ type: definition.type, row: position.row, col: position.col, hp: definition.strength ?? 1 });
      }
    }
    this.refreshObstacles();
  }

  private refreshObstacles(): void {
    this.obstacleLayer.removeAll(true);
    for (const obstacle of this.obstacles.filter((item) => item.hp > 0)) {
      const point = this.cellPosition(obstacle);
      const root = this.add.container(point.x, point.y);
      const art = this.add.graphics();
      if (obstacle.type === 'woodCrate') {
        art.fillStyle(0x714324, 1).fillRoundedRect(-47, -47, 94, 94, 17);
        art.fillStyle(0xb8753e, 1).lineStyle(6, 0x5b351e, 1).fillRoundedRect(-43, -43, 86, 86, 14).strokeRoundedRect(-43, -43, 86, 86, 14);
        art.lineStyle(10, 0xe1a267, 1).lineBetween(-28, -28, 28, 28).lineBetween(28, -28, -28, 28);
        art.lineStyle(3, 0xffd09a, 0.7).strokeRoundedRect(-35, -35, 70, 70, 10);
      } else if (obstacle.type === 'jelly') {
        art.fillStyle(0x79ddf0, 0.38).lineStyle(5, 0x43b7d2, 0.82).fillRoundedRect(-45, -45, 90, 90, 25).strokeRoundedRect(-45, -45, 90, 90, 25);
        art.fillStyle(0xffffff, 0.72).fillCircle(-24, -25, 8).fillCircle(23, 22, 5);
        art.lineStyle(3, 0xe7fbff, 0.76).beginPath().arc(0, 2, 32, 0.2, 1.25).strokePath();
      } else if (obstacle.type === 'stone') {
        const rock = [
          new Phaser.Geom.Point(-35, -28), new Phaser.Geom.Point(-12, -44), new Phaser.Geom.Point(24, -39),
          new Phaser.Geom.Point(43, -12), new Phaser.Geom.Point(36, 28), new Phaser.Geom.Point(13, 43),
          new Phaser.Geom.Point(-25, 38), new Phaser.Geom.Point(-43, 11),
        ];
        art.fillStyle(0x77717f, 1).lineStyle(6, 0x514b59, 1).fillPoints(rock, true).strokePoints(rock, true);
        art.fillStyle(0xa9a2af, 0.72).fillEllipse(-12, -19, 35, 19);
        art.lineStyle(4, 0xd3ccd8, 0.72).lineBetween(-20, -12, 5, -1).lineBetween(5, -1, 20, 18).lineBetween(5, -1, -7, 21);
      } else {
        art.fillStyle(0xffd85d, 1).lineStyle(5, 0xffffff, 0.9).fillPoints([
          new Phaser.Geom.Point(0, -39), new Phaser.Geom.Point(12, -12), new Phaser.Geom.Point(39, -8), new Phaser.Geom.Point(18, 10),
          new Phaser.Geom.Point(24, 38), new Phaser.Geom.Point(0, 22), new Phaser.Geom.Point(-24, 38), new Phaser.Geom.Point(-18, 10), new Phaser.Geom.Point(-39, -8), new Phaser.Geom.Point(-12, -12),
        ], true).strokePoints([
          new Phaser.Geom.Point(0, -39), new Phaser.Geom.Point(12, -12), new Phaser.Geom.Point(39, -8), new Phaser.Geom.Point(18, 10),
          new Phaser.Geom.Point(24, 38), new Phaser.Geom.Point(0, 22), new Phaser.Geom.Point(-24, 38), new Phaser.Geom.Point(-18, 10), new Phaser.Geom.Point(-39, -8), new Phaser.Geom.Point(-12, -12),
        ], true);
      }
      const hp = obstacle.hp > 1 ? this.add.text(30, 28, String(obstacle.hp), { fontFamily: DISPLAY_FONT, fontSize: '24px', fontStyle: 'bold', color: '#ffffff', stroke: '#58465f', strokeThickness: 4 }).setOrigin(0.5) : undefined;
      root.add(hp ? [art, hp] : [art]);
      this.obstacleLayer.add(root);
      obstacle.view = root;
    }
    this.syncObstacleTileVisibility();
  }

  private syncObstacleTileVisibility(): void {
    this.views.forEach((view) => view.characterArt.setVisible(true));
    this.obstacles.forEach((obstacle) => {
      if (obstacle.hp <= 0 || (obstacle.type !== 'woodCrate' && obstacle.type !== 'stone')) return;
      this.views.get(keyOf(obstacle))?.characterArt.setVisible(false);
    });
  }

  private attackObstacles(removed: readonly Position[]): void {
    for (const obstacle of this.obstacles) {
      if (obstacle.hp <= 0) continue;
      const hit = removed.some((position) => {
        if (obstacle.type === 'jelly') return position.row === obstacle.row && position.col === obstacle.col;
        if (obstacle.type === 'starShard') return position.col === obstacle.col && position.row >= obstacle.row;
        return Math.abs(position.row - obstacle.row) + Math.abs(position.col - obstacle.col) <= 1;
      });
      if (!hit) continue;
      obstacle.hp -= 1;
      if (obstacle.hp <= 0) {
        if (obstacle.type === 'starShard') this.goals.apply({ type: 'starDrop' });
        else this.goals.apply({ type: 'obstacle', obstacle: obstacle.type });
        const p = this.cellPosition(obstacle);
        this.particlePool.burst(BOARD_X + p.x, BOARD_Y + p.y, { count: 12, colors: [0xffd166, 0xffffff, 0x8bd3dd] });
        audioSystem.playSfx('obstacle');
      }
    }
    this.refreshObstacles();
  }

  private createShuffleButton(): void {
    const y = BOARD_Y + BOARD_PIXELS + 108;
    this.shuffleButton = this.addButton(540, y, '보드 섞기  ·  2회', () => this.useShuffle(), {
      width: 520, height: 104, color: 0x28bfa6, color2: 0x3b7be2, fontSize: 31,
    });
  }

  private useShuffle(): void {
    if (this.locked || this.paused || this.ending) return;
    if (this.shufflesLeft <= 0) { this.flashStatus('이번 게임의 셔플을 모두 사용했어요'); return; }
    this.shufflesLeft -= 1;
    this.updateShuffleButton();
    this.displayBoard(this.model.reshuffle(), true);
    audioSystem.playSfx('swap');
    this.flashStatus(this.shufflesLeft > 0 ? '새 보드! 셔플이 1회 남았어요' : '마지막 셔플을 사용했어요');
  }

  private updateShuffleButton(): void {
    const button = this.shuffleButton;
    const label = button?.getData('label') as Phaser.GameObjects.Text | undefined;
    if (!button || !label) return;
    label.setText(this.shufflesLeft > 0 ? `보드 섞기  ·  ${this.shufflesLeft}회` : '셔플 사용 완료');
    if (this.shufflesLeft <= 0) button.disableInteractive().setAlpha(0.48);
  }

  private bindKeyboard(): void {
    this.input.keyboard?.on('keydown', (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        if (this.selected) { this.selected = undefined; this.refreshSelection(); }
        else if (this.keyboardFocusVisible) { this.keyboardFocusVisible = false; this.refreshSelection(); }
        else this.togglePause();
        return;
      }
      if (this.locked || this.paused || this.ending) return;
      const directions: Record<string, Position> = {
        ArrowUp: { row: -1, col: 0 }, ArrowDown: { row: 1, col: 0 }, ArrowLeft: { row: 0, col: -1 }, ArrowRight: { row: 0, col: 1 },
      };
      const direction = directions[event.key];
      if (direction) {
        event.preventDefault();
        this.keyboardFocusVisible = true;
        this.keyboardFocus = { row: Phaser.Math.Clamp(this.keyboardFocus.row + direction.row, 0, 7), col: Phaser.Math.Clamp(this.keyboardFocus.col + direction.col, 0, 7) };
        this.refreshSelection();
      } else if (event.key === 'Enter' || event.key === ' ') {
        event.preventDefault();
        this.keyboardFocusVisible = true;
        this.handleTap(this.keyboardFocus);
      }
    });
  }

  private refreshSelection(): void {
    const focused = this.selected ?? (this.keyboardFocusVisible ? this.keyboardFocus : undefined);
    const focusedKey = focused ? keyOf(focused) : undefined;
    this.views.forEach((view, key) => view.setSelected(key === focusedKey, false));
  }

  private startTimerIfNeeded(): void {
    if (this.stage.timeLimit === undefined) return;
    this.countdownEvent = this.time.addEvent({ delay: 1000, loop: true, callback: () => {
      if (this.paused || this.ending || this.tutorialActive) return;
      this.secondsLeft -= 1;
      this.refreshHud();
      if (this.secondsLeft <= 0) this.checkEnd();
    } });
  }

  private refreshHud(): void {
    this.scoreText.setText(this.score.toLocaleString('ko-KR'));
    const safeSeconds = Math.max(0, this.secondsLeft);
    this.timeText.setText(this.formatTime(safeSeconds));
    const ratio = Phaser.Math.Clamp(safeSeconds / Math.max(1, this.stage.timeLimit ?? 1), 0, 1);
    const barColor = safeSeconds <= 10 ? 0xff5577 : safeSeconds <= 30 ? 0xffa349 : 0x5fcf9f;
    this.timeBar.clear()
      .fillStyle(0xffffff, 0.12).fillRoundedRect(154, 122, 222, 9, 5)
      .fillStyle(barColor, 1).fillRoundedRect(154, 122, Math.max(5, 222 * ratio), 9, 5);
    this.timeText.setColor(safeSeconds <= 10 ? '#ff6687' : safeSeconds <= 30 ? '#ffc65f' : '#ffffff');
  }

  private formatTime(seconds: number): string {
    const minutes = Math.floor(seconds / 60);
    return `${minutes}:${String(seconds % 60).padStart(2, '0')}`;
  }

  private addMatchTime(
    impact: 'match3' | 'match4' | 'rocket' | 'bomb' | 'rainbow',
    x: number,
    y: number,
  ): void {
    if (this.timeAwardedThisMove) return;
    this.timeAwardedThisMove = true;
    const bonus = impact === 'rainbow' || impact === 'bomb' ? 3 : impact === 'rocket' || impact === 'match4' ? 2 : 1;
    const cap = this.stage.timeLimit ?? 0;
    const before = this.secondsLeft;
    this.secondsLeft = Math.min(cap, this.secondsLeft + bonus);
    const gained = this.secondsLeft - before;
    if (gained <= 0) return;
    this.floatingPool.show(x, y - 42, `+${gained}초`, {
      color: '#baffdd', stroke: '#24584a', fontSize: impact === 'rainbow' ? 52 : 45, duration: 900, rise: 82,
    });
    this.tweens.add({ targets: this.timeText, scale: { from: 1.32, to: 1 }, duration: 260, ease: 'Back.Out' });
    this.refreshHud();
  }

  private checkEnd(): void {
    if (this.ending) return;
    if (this.secondsLeft <= 0) this.finish(true);
  }

  private finish(success: boolean): void {
    if (this.ending) return;
    this.ending = true;
    this.locked = true;
    if (this.countdownEvent) this.countdownEvent.paused = true;
    const stars = success ? getStarsForScore(this.stage, this.score) : 0;
    audioSystem.playSfx(success ? 'success' : 'failure');
    if (!success) hapticSystem.play('failure');
    if (success) {
      saveSystem.recordStageResult({ stageId: this.stageId, score: this.score, stars, bestCombo: this.bestCombo });
      achievementSystem.record({ type: 'stageComplete', combo: this.bestCombo });
      achievementSystem.record({ type: 'starsEarned', total: saveSystem.getData().progress.totalStars });
    }
    this.time.delayedCall(500, () => this.fadeTo('ResultScene', {
      stageId: this.stageId, difficulty: this.difficulty, score: this.score, stars, bestCombo: this.bestCombo, success,
      remaining: this.stage.timeLimit ?? 0, reward: success ? stars + 1 : 0,
    }));
  }

  private togglePause(): void {
    if (this.ending) return;
    if (this.paused) return;
    this.paused = true;
    this.locked = true;
    const shade = this.add.rectangle(540, 960, 1080, 1920, 0x31283c, 0.72).setInteractive().setDepth(1000);
    const panel = this.add.graphics().fillStyle(0xfffbf1).fillRoundedRect(140, 590, 800, 720, 56).setDepth(1001);
    const title = this.add.text(540, 740, '게임을 멈췄어요', { fontFamily: UI_FONT, fontSize: '62px', fontStyle: 'bold', color: '#513b59' }).setOrigin(0.5).setDepth(1002);
    const resume = this.addButton(540, 930, '계속하기', () => {
      [shade, panel, title, resume, quit].forEach((item) => item.destroy());
      this.resumeCountdown();
    }, { width: 560, color: 0x62b997 }).setDepth(1002);
    const quit = this.addButton(540, 1090, '홈 화면으로', () => this.fadeTo('MenuScene'), { width: 560, color: 0x7659a7 }).setDepth(1002);
  }

  private resumeCountdown(): void {
    const label = this.add.text(540, 960, '3', { fontFamily: DISPLAY_FONT, fontSize: '150px', fontStyle: 'bold', color: '#ffffff', stroke: '#604d6a', strokeThickness: 12 }).setOrigin(0.5).setDepth(2000);
    let count = 3;
    this.time.addEvent({ delay: 480, repeat: 2, callback: () => {
      count -= 1;
      if (count > 0) label.setText(String(count));
      else { label.destroy(); this.paused = false; this.locked = false; }
    } });
  }

  private showTutorialIfNeeded(): void {
    if (this.difficulty !== 'easy' || saveSystem.getData().progress.tutorialComplete) return;
    this.tutorialActive = true;
    this.locked = true;
    const finishTutorial = (): void => {
      this.tutorialActive = false;
      this.locked = false;
      saveSystem.setTutorialComplete();
    };
    const overlay = new TutorialOverlay(this, {
      reducedMotion: saveSystem.getData().settings.reducedMotion,
      onComplete: finishTutorial,
      onSkip: finishTutorial,
    });
    overlay.start([
      { message: '이웃한 두 친구를 드래그하거나 차례로 눌러 자리를 바꿔요.', target: { x: BOARD_X + CELL * 3.5, y: BOARD_Y + CELL * 3.5, width: CELL * 2, height: CELL }, arrowFrom: { x: BOARD_X + CELL * 3.1, y: BOARD_Y + CELL * 3.5 } },
      { message: '같은 친구 넷을 맞추면 한 줄을 시원하게 지우는 로켓이 생겨요!', target: { x: BOARD_X + CELL * 4, y: BOARD_Y + CELL * 4, width: CELL * 4, height: CELL } },
      { message: '로켓을 다른 친구와 바꾸면 발사! 특수 블록끼리 합치면 더 강해져요.', target: { x: BOARD_X + CELL * 4, y: BOARD_Y + CELL * 4.5, width: CELL * 2, height: CELL * 2 } },
    ]);
  }

  private flashStatus(message: string, impact = false): void {
    const width = impact ? 720 : 640;
    const height = impact ? 112 : 86;
    const top = STATUS_Y - height / 2;
    this.statusPlate.clear()
      .fillStyle(0x493451, 0.22).fillRoundedRect(540 - width / 2, top + 8, width, height, height / 2)
      .fillGradientStyle(impact ? 0xff7f98 : 0x7c66a5, impact ? 0xffb866 : 0x9984bc, impact ? 0xdb5b86 : 0x675287, impact ? 0xe78462 : 0x79639a, 0.96)
      .lineStyle(5, 0xffffff, 0.9).fillRoundedRect(540 - width / 2, top, width, height, height / 2)
      .strokeRoundedRect(540 - width / 2, top, width, height, height / 2)
      .setVisible(true).setAlpha(1);
    this.statusText.setText(message).setFontSize(impact ? 64 : 40).setAlpha(1).setScale(impact ? 0.55 : 0.78).setAngle(impact ? -2 : 0);
    this.tweens.killTweensOf(this.statusText);
    this.tweens.killTweensOf(this.statusPlate);
    this.tweens.add({ targets: this.statusText, scale: impact ? 1.08 : 1, angle: 0, duration: 150, ease: 'Back.Out' });
    this.tweens.add({
      targets: this.statusText,
      alpha: 0,
      duration: 220,
      delay: impact ? 850 : 620,
      onComplete: () => this.statusText.setText(''),
    });
    this.tweens.add({ targets: this.statusPlate, alpha: 0, duration: 220, delay: impact ? 870 : 640, onComplete: () => this.statusPlate.setVisible(false) });
  }

  private toGoalSpecial(value: 'row' | 'column' | 'bomb' | 'rainbow'): SpecialTileType {
    const map = { row: 'rowRocket', column: 'columnRocket', bomb: 'pawBomb', rainbow: 'rainbowStar' } as const;
    return map[value];
  }

  private inside(position: Position): boolean { return position.row >= 0 && position.row < 8 && position.col >= 0 && position.col < 8; }
}
