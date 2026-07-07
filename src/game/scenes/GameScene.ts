import Phaser from 'phaser';
import { BoardModel, SeededRandom, type Board, type Position } from '../board';
import { CHARACTERS } from '../data/characters';
import { createDifficultyChallenge } from '../data/difficulties';
import { getDailyChallenge, getStarsForScore } from '../data/stages';
import { FloatingTextPool } from '../entities/FloatingTextPool';
import { ParticlePool } from '../entities/ParticlePool';
import { Tile as TileView, type TileSpecial } from '../entities/Tile';
import { achievementSystem } from '../systems/AchievementSystem';
import { audioSystem } from '../systems/AudioSystem';
import { GoalSystem, type GoalProgress } from '../systems/GoalSystem';
import { hapticSystem } from '../systems/HapticSystem';
import { getLocalDateKey, saveSystem } from '../systems/SaveSystem';
import type { Difficulty, ObstacleType, SpecialTileType, StageDefinition } from '../types';
import { TutorialOverlay } from '../ui/TutorialOverlay';
import { BaseScene } from './BaseScene';

interface GameData { difficulty?: Difficulty; daily?: boolean; }
interface RuntimeObstacle { type: ObstacleType; row: number; col: number; hp: number; view?: Phaser.GameObjects.Container; }
type BoosterMode = 'hammer' | 'paw' | null;

const BOARD_X = 132;
const BOARD_Y = 455;
const CELL = 102;
const BOARD_PIXELS = CELL * 8;
const keyOf = ({ row, col }: Position): string => `${row}:${col}`;

export class GameScene extends BaseScene {
  private stage!: StageDefinition;
  private stageId = 1;
  private difficulty: Difficulty = 'easy';
  private daily = false;
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
  private movesLeft = 0;
  private secondsLeft = 0;
  private bestCombo = 0;
  private boosterMode: BoosterMode = null;
  private scoreText!: Phaser.GameObjects.Text;
  private moveText!: Phaser.GameObjects.Text;
  private goalText!: Phaser.GameObjects.Text;
  private comboText!: Phaser.GameObjects.Text;
  private comboBar!: Phaser.GameObjects.Graphics;
  private statusText!: Phaser.GameObjects.Text;
  private statusPlate!: Phaser.GameObjects.Graphics;
  private particlePool!: ParticlePool;
  private floatingPool!: FloatingTextPool;
  private countdownEvent?: Phaser.Time.TimerEvent;

  public constructor() { super('GameScene'); }

  public init(data: GameData): void {
    this.daily = data.daily === true;
    this.difficulty = data.difficulty ?? 'easy';
  }

  public create(): void {
    this.addBackdrop(0xc9e9ff);
    this.cameras.main.fadeIn(180, 255, 248, 232);
    this.stage = this.daily ? getDailyChallenge(getLocalDateKey()) : createDifficultyChallenge(this.difficulty);
    this.stageId = this.stage.id;
    const allowedKinds = (this.stage.characterPool ?? CHARACTERS.map((character) => character.id))
      .map((id) => CHARACTERS.findIndex((character) => character.id === id))
      .filter((index) => index >= 0);
    this.model = new BoardModel({ seed: this.stage.seed, kinds: allowedKinds });
    this.goals = new GoalSystem(this.stage);
    this.movesLeft = this.stage.moves ?? 0;
    this.secondsLeft = this.stage.timeLimit ?? 0;
    this.score = 0;
    this.bestCombo = 0;
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
    this.particlePool = new ParticlePool(this, settings.reducedParticles ? 16 : 52);
    this.floatingPool = new FloatingTextPool(this, 16);

    this.createHud();
    this.createBoardFrame();
    this.createObstacles();
    this.displayBoard(this.model.board, true);
    this.createBoardInput();
    this.createBoosters();
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
    void audioSystem.resume().then(() => audioSystem.startMusic(this.daily ? 'daily' : 'stage'));
  }

  private createHud(): void {
    const shell = this.add.graphics();
    shell.fillStyle(0x4d3d61, 0.14).fillRoundedRect(24, 31, 1032, 310, 48);
    shell.fillStyle(0xffffff, 0.91).lineStyle(4, 0xffffff, 0.9)
      .fillRoundedRect(24, 20, 1032, 310, 48).strokeRoundedRect(24, 20, 1032, 310, 48);
    shell.fillStyle(0xff7890, 0.12).fillRoundedRect(40, 38, 280, 120, 34);
    shell.fillStyle(0x7659a7, 0.08).fillRoundedRect(352, 40, 360, 118, 34);
    shell.fillStyle(0x67bda0, 0.1).fillRoundedRect(352, 174, 520, 80, 30);
    this.add.text(60, 49, this.daily ? 'DAILY CHALLENGE' : this.difficulty.replace(/([A-Z])/g, ' $1').toUpperCase(), {
      fontFamily: 'Arial, Malgun Gothic, sans-serif', fontSize: '24px', fontStyle: 'bold', color: '#af6476',
    }).setShadow(0, 2, '#ffffff', 2);
    this.add.text(60, 88, this.stage.title, {
      fontFamily: 'Arial, Malgun Gothic, sans-serif', fontSize: '45px', fontStyle: 'bold', color: '#4e3b58',
    }).setShadow(0, 3, '#ffffff', 3);
    this.moveText = this.add.text(60, 193, '', {
      fontFamily: 'Arial, Malgun Gothic, sans-serif', fontSize: '30px', fontStyle: 'bold', color: '#6f5795',
    });
    this.scoreText = this.add.text(532, 105, '0', {
      fontFamily: 'Arial, sans-serif', fontSize: '59px', fontStyle: 'bold', color: '#4e3b58',
    }).setOrigin(0.5).setShadow(0, 4, '#ffffff', 4);
    this.add.text(532, 62, 'SCORE', { fontFamily: 'Arial, sans-serif', fontSize: '19px', fontStyle: 'bold', color: '#9a849e' }).setOrigin(0.5);
    this.goalText = this.add.text(612, 214, '', {
      fontFamily: 'Arial, Malgun Gothic, sans-serif', fontSize: '25px', fontStyle: 'bold', color: '#5b4963', align: 'center', wordWrap: { width: 480 },
    }).setOrigin(0.5).setShadow(0, 2, '#ffffff', 2);
    this.comboBar = this.add.graphics();
    this.comboText = this.add.text(540, 285, 'COMBO ENERGY', {
      fontFamily: 'Arial, Malgun Gothic, sans-serif', fontSize: '19px', fontStyle: 'bold', color: '#806c83',
    }).setOrigin(0.5);
    this.statusPlate = this.add.graphics().setDepth(99).setVisible(false);
    this.statusText = this.add.text(540, 388, '', {
      fontFamily: 'Arial, Malgun Gothic, sans-serif', fontSize: '42px', fontStyle: 'bold', color: '#ffffff',
      stroke: '#5e3d69', strokeThickness: 9,
    }).setOrigin(0.5).setDepth(100).setShadow(0, 7, '#4a304f', 8, true, true);
    this.addButton(970, 118, 'Ⅱ', () => { if (!this.tutorialActive) this.togglePause(); }, { width: 92, height: 92, color: 0xffffff, textColor: '#5d4b65', fontSize: 34 });
    this.refreshHud();
  }

  private createBoardFrame(): void {
    const frame = this.add.graphics();
    frame.fillStyle(0x41344f, 0.2).fillRoundedRect(BOARD_X - 22, BOARD_Y - 1, BOARD_PIXELS + 44, BOARD_PIXELS + 44, 48);
    frame.fillGradientStyle(0x8c78a5, 0x8c78a5, 0x6d668a, 0x6d668a, 0.96)
      .lineStyle(6, 0xffffff, 0.82)
      .fillRoundedRect(BOARD_X - 16, BOARD_Y - 16, BOARD_PIXELS + 32, BOARD_PIXELS + 32, 44)
      .strokeRoundedRect(BOARD_X - 16, BOARD_Y - 16, BOARD_PIXELS + 32, BOARD_PIXELS + 32, 44);
    for (let row = 0; row < 8; row += 1) {
      for (let col = 0; col < 8; col += 1) {
        frame.fillStyle((row + col) % 2 === 0 ? 0xffffff : 0xece6f3, (row + col) % 2 === 0 ? 0.14 : 0.09)
          .fillCircle(BOARD_X + col * CELL + CELL / 2, BOARD_Y + row * CELL + CELL / 2, CELL * 0.43);
      }
    }
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
        size: 96,
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
        size: 96,
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
    void audioSystem.resumeAndStartMusic(this.daily ? 'daily' : 'stage');
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
    if (this.boosterMode) { this.useTargetedBooster(position); return; }
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

    if (this.stage.moves !== undefined) this.movesLeft -= 1;
    const swappedSpecials = [originalBoard[from.row]?.[from.col]?.special, originalBoard[to.row]?.[to.col]?.special];
    const swapImpact = swappedSpecials.includes('rainbow') ? 'rainbow'
      : swappedSpecials.includes('bomb') ? 'bomb'
        : swappedSpecials.some((special) => special === 'row' || special === 'column') ? 'rocket' : undefined;
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
    this.refreshHud(cascade);
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
        count: impactKind === 'bomb' || impactKind === 'rainbow' ? 16 : combo >= 4 ? 12 : 8,
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
    this.createImpactWave(BOARD_X + p.x, BOARD_Y + p.y, impactKind, combo, fullRow, fullColumn);
    this.floatingPool.show(BOARD_X + p.x, BOARD_Y + p.y, points, { fontSize: 31 + Math.min(combo, 5) * 2 });
    const phrases = ['좋아!', '멋져!', '대단해!', '포포 콤보!', '환상적이야!', '믿을 수 없어!'];
    if (combo >= 2) this.flashStatus(phrases[Math.min(phrases.length - 1, combo - 2)] ?? '좋아!', true);
    audioSystem.playSfx(impactKind, combo);
    if (combo >= 2) audioSystem.playSfx('combo', combo);
    hapticSystem.play(impactKind === 'rainbow' ? 'rainbow' : impactKind === 'bomb' ? 'bomb' : impactKind === 'match4' || impactKind === 'rocket' ? 'match4' : 'match3');
    if (settings.screenShake && !settings.reducedMotion) {
      const strength = impactKind === 'bomb' ? 0.006 : impactKind === 'rainbow' ? 0.005 : Math.min(0.0038, 0.0012 + combo * 0.00035);
      this.cameras.main.shake(impactKind === 'bomb' ? 135 : 90, strength);
    }
    await new Promise<void>((resolve) => this.time.delayedCall(settings.reducedMotion ? 70 : impactKind === 'bomb' ? 230 : 175, () => resolve()));
  }

  private createPopFlash(x: number, y: number, color: number, intensity: number): void {
    const flash = this.add.graphics().setPosition(x, y).setDepth(90).setBlendMode(Phaser.BlendModes.ADD);
    flash.fillStyle(color, 0.32 * intensity).fillCircle(0, 0, 38);
    flash.lineStyle(5, 0xffffff, 0.8 * intensity).strokeCircle(0, 0, 24);
    for (let index = 0; index < 6; index += 1) {
      const angle = index * Math.PI / 3 + 0.22;
      flash.lineStyle(4, color, 0.75).lineBetween(Math.cos(angle) * 28, Math.sin(angle) * 28, Math.cos(angle) * 50, Math.sin(angle) * 50);
    }
    flash.setScale(0.45);
    this.tweens.add({ targets: flash, scale: 1.45, alpha: 0, duration: 210, ease: 'Cubic.Out', onComplete: () => flash.destroy() });
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
    const ring = this.add.graphics().setPosition(x, y).setDepth(92).setBlendMode(Phaser.BlendModes.ADD);
    ring.lineStyle(kind === 'bomb' ? 14 : 8, 0xffffff, 0.86).strokeCircle(0, 0, kind === 'bomb' ? 52 : 34);
    ring.lineStyle(kind === 'bomb' ? 24 : 14, color, 0.35).strokeCircle(0, 0, kind === 'bomb' ? 66 : 45);
    ring.setScale(0.35);
    this.tweens.add({ targets: ring, scale: kind === 'bomb' ? 4.4 : 2.25, alpha: 0, duration: kind === 'bomb' ? 360 : 235, ease: 'Quad.Out', onComplete: () => ring.destroy() });

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
        art.fillStyle(0xa96f42, 0.86).lineStyle(5, 0x704526, 0.9).fillRoundedRect(-42, -42, 84, 84, 15).strokeRoundedRect(-42, -42, 84, 84, 15);
        art.lineStyle(8, 0xe0a46d, 0.9).lineBetween(-28, -28, 28, 28).lineBetween(28, -28, -28, 28);
      } else if (obstacle.type === 'jelly') {
        art.fillStyle(0x82dff2, 0.27).lineStyle(4, 0x5cbdd4, 0.62).fillRoundedRect(-45, -45, 90, 90, 22).strokeRoundedRect(-45, -45, 90, 90, 22);
        art.fillStyle(0xffffff, 0.6).fillCircle(-23, -25, 8);
      } else if (obstacle.type === 'stone') {
        art.fillStyle(0x8e8794, 0.94).lineStyle(5, 0x635d69, 0.9).fillRoundedRect(-43, -43, 86, 86, 24).strokeRoundedRect(-43, -43, 86, 86, 24);
        art.lineStyle(4, 0xc6beca, 0.7).lineBetween(-20, -18, 9, -5).lineBetween(9, -5, 24, 18);
      } else {
        art.fillStyle(0xffd85d, 1).lineStyle(5, 0xffffff, 0.9).fillPoints([
          new Phaser.Geom.Point(0, -39), new Phaser.Geom.Point(12, -12), new Phaser.Geom.Point(39, -8), new Phaser.Geom.Point(18, 10),
          new Phaser.Geom.Point(24, 38), new Phaser.Geom.Point(0, 22), new Phaser.Geom.Point(-24, 38), new Phaser.Geom.Point(-18, 10), new Phaser.Geom.Point(-39, -8), new Phaser.Geom.Point(-12, -12),
        ], true).strokePoints([
          new Phaser.Geom.Point(0, -39), new Phaser.Geom.Point(12, -12), new Phaser.Geom.Point(39, -8), new Phaser.Geom.Point(18, 10),
          new Phaser.Geom.Point(24, 38), new Phaser.Geom.Point(0, 22), new Phaser.Geom.Point(-24, 38), new Phaser.Geom.Point(-18, 10), new Phaser.Geom.Point(-39, -8), new Phaser.Geom.Point(-12, -12),
        ], true);
      }
      const hp = obstacle.hp > 1 ? this.add.text(30, 28, String(obstacle.hp), { fontFamily: 'Arial, sans-serif', fontSize: '24px', fontStyle: 'bold', color: '#ffffff', stroke: '#58465f', strokeThickness: 4 }).setOrigin(0.5) : undefined;
      root.add(hp ? [art, hp] : [art]);
      this.obstacleLayer.add(root);
      obstacle.view = root;
    }
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

  private createBoosters(): void {
    const y = 1435;
    const data = saveSystem.getData();
    this.addButton(230, y, `셔플  ${data.items.shuffle}`, () => this.useShuffle(), { width: 275, height: 100, color: 0x68bba0, fontSize: 28, icon: '⟳' });
    this.addButton(540, y, `망치  ${data.items.hammer}`, () => this.setBooster('hammer'), { width: 275, height: 100, color: 0xef9c63, fontSize: 28, icon: '◆' });
    this.addButton(850, y, `포포  ${data.items.paw}`, () => this.setBooster('paw'), { width: 275, height: 100, color: 0x8c72bd, fontSize: 28, icon: '✦' });
    this.add.text(540, 1535, '아이템을 누른 뒤 보드의 대상을 선택하세요', { fontFamily: 'Arial, Malgun Gothic, sans-serif', fontSize: '23px', color: '#78647b' }).setOrigin(0.5);
  }

  private useShuffle(): void {
    const inventory = saveSystem.getData().items;
    if (this.locked || inventory.shuffle <= 0) { this.flashStatus('셔플 아이템이 없어요'); return; }
    saveSystem.changeItem('shuffle', -1);
    this.displayBoard(this.model.reshuffle(), true);
    audioSystem.playSfx('swap');
    this.flashStatus('보드를 새롭게 섞었어요!');
  }

  private setBooster(mode: Exclude<BoosterMode, null>): void {
    if (this.locked || this.paused || this.ending) return;
    const inventory = saveSystem.getData().items;
    if (inventory[mode] <= 0) { this.flashStatus('아이템이 없어요'); return; }
    this.boosterMode = this.boosterMode === mode ? null : mode;
    this.flashStatus(this.boosterMode ? (mode === 'hammer' ? '부술 장애물을 골라 주세요' : '지울 친구를 골라 주세요') : '아이템 선택 취소');
  }

  private useTargetedBooster(position: Position): void {
    const mode = this.boosterMode;
    this.boosterMode = null;
    if (!mode) return;
    if (mode === 'hammer') {
      const obstacle = this.obstacles.find((item) => item.hp > 0 && item.row === position.row && item.col === position.col);
      if (!obstacle) { this.flashStatus('이 칸에는 장애물이 없어요'); return; }
      obstacle.hp = 0;
      if (obstacle.type === 'starShard') this.goals.apply({ type: 'starDrop' });
      else this.goals.apply({ type: 'obstacle', obstacle: obstacle.type });
      saveSystem.changeItem('hammer', -1);
      this.refreshObstacles();
      audioSystem.playSfx('obstacle');
    } else {
      this.displayBoardColumns(this.model.removePositions([position]), new Set([position.col]), true);
      saveSystem.changeItem('paw', -1);
      audioSystem.playSfx('rainbow');
    }
    this.refreshHud();
    this.checkEnd();
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
      if (this.paused || this.ending) return;
      this.secondsLeft -= 1;
      this.refreshHud();
      if (this.secondsLeft <= 0) this.checkEnd();
    } });
  }

  private refreshHud(combo = 0): void {
    this.scoreText.setText(this.score.toLocaleString('ko-KR'));
    this.moveText.setText(this.stage.timeLimit !== undefined ? `남은 시간  ${Math.max(0, this.secondsLeft)}초` : `남은 이동  ${Math.max(0, this.movesLeft)}회`);
    this.goalText.setText(this.goals.progress.map((progress) => this.describeGoal(progress)).join('  ·  '));
    this.comboText.setText(combo > 1 ? `${combo} COMBO · ENERGY UP` : 'COMBO ENERGY');
    this.comboBar.clear()
      .fillStyle(0x5a4867, 0.16).fillRoundedRect(298, 309, 484, 28, 14)
      .fillStyle(0xffffff, 0.72).fillRoundedRect(302, 313, 476, 20, 10);
    const width = 476 * Math.min(1, combo / 10);
    if (width > 0) this.comboBar.fillGradientStyle(combo >= 5 ? 0xffcf4f : 0xff8da2, combo >= 5 ? 0xffef9b : 0xffb3ca, 0xff6f91, 0xff91c6, 1).fillRoundedRect(302, 313, width, 20, 10);
  }

  private describeGoal(progress: GoalProgress): string {
    const goal = progress.goal;
    const ratio = `${progress.current}/${progress.target}`;
    if (goal.type === 'score') return `점수 ${ratio}`;
    if (goal.type === 'collect') return `${CHARACTERS.find((character) => character.id === goal.characterId)?.name ?? '친구'} ${ratio}`;
    if (goal.type === 'obstacle') return `${goal.obstacle === 'woodCrate' ? '상자' : goal.obstacle === 'jelly' ? '젤리' : '돌'} ${ratio}`;
    if (goal.type === 'starDrop') return `별 조각 ${ratio}`;
    return `특수 블록 ${ratio}`;
  }

  private checkEnd(): void {
    if (this.ending) return;
    if (this.goals.isComplete) { this.finish(true); return; }
    if ((this.stage.moves !== undefined && this.movesLeft <= 0) || (this.stage.timeLimit !== undefined && this.secondsLeft <= 0)) this.finish(false);
  }

  private finish(success: boolean): void {
    if (this.ending) return;
    this.ending = true;
    this.locked = true;
    if (this.countdownEvent) this.countdownEvent.paused = true;
    const stars = success ? getStarsForScore(this.stage, this.score) : 0;
    const bonus = success && this.stage.moves !== undefined ? this.movesLeft * 100 : 0;
    this.score += bonus;
    audioSystem.playSfx(success ? 'success' : 'failure');
    if (!success) hapticSystem.play('failure');
    if (this.daily) saveSystem.updateDaily(this.score, success);
    else if (success) {
      saveSystem.recordStageResult({ stageId: this.stageId, score: this.score, stars, bestCombo: this.bestCombo });
      achievementSystem.record({ type: 'stageComplete', combo: this.bestCombo });
      achievementSystem.record({ type: 'starsEarned', total: saveSystem.getData().progress.totalStars });
    }
    this.time.delayedCall(500, () => this.fadeTo('ResultScene', {
      stageId: this.stageId, difficulty: this.difficulty, score: this.score, stars, bestCombo: this.bestCombo, success,
      remaining: this.stage.moves !== undefined ? Math.max(0, this.movesLeft) : Math.max(0, this.secondsLeft), reward: success ? stars + 1 : 0, daily: this.daily,
    }));
  }

  private togglePause(): void {
    if (this.ending) return;
    if (this.paused) return;
    this.paused = true;
    this.locked = true;
    const shade = this.add.rectangle(540, 960, 1080, 1920, 0x31283c, 0.72).setInteractive().setDepth(1000);
    const panel = this.add.graphics().fillStyle(0xfffbf1).fillRoundedRect(140, 590, 800, 720, 56).setDepth(1001);
    const title = this.add.text(540, 740, '잠시 쉬는 중', { fontFamily: 'Arial, Malgun Gothic, sans-serif', fontSize: '62px', fontStyle: 'bold', color: '#513b59' }).setOrigin(0.5).setDepth(1002);
    const resume = this.addButton(540, 930, '계속하기', () => {
      [shade, panel, title, resume, quit].forEach((item) => item.destroy());
      this.resumeCountdown();
    }, { width: 560, color: 0x62b997 }).setDepth(1002);
    const quit = this.addButton(540, 1090, '난이도 선택', () => this.fadeTo(this.daily ? 'MenuScene' : 'StageSelectScene'), { width: 560, color: 0x7659a7 }).setDepth(1002);
  }

  private resumeCountdown(): void {
    const label = this.add.text(540, 960, '3', { fontFamily: 'Arial, sans-serif', fontSize: '150px', fontStyle: 'bold', color: '#ffffff', stroke: '#604d6a', strokeThickness: 12 }).setOrigin(0.5).setDepth(2000);
    let count = 3;
    this.time.addEvent({ delay: 480, repeat: 2, callback: () => {
      count -= 1;
      if (count > 0) label.setText(String(count));
      else { label.destroy(); this.paused = false; this.locked = false; }
    } });
  }

  private showTutorialIfNeeded(): void {
    if (this.daily || this.difficulty !== 'easy' || saveSystem.getData().progress.tutorialComplete) return;
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
    const top = 388 - height / 2;
    this.statusPlate.clear()
      .fillStyle(0x493451, 0.22).fillRoundedRect(540 - width / 2, top + 8, width, height, height / 2)
      .fillGradientStyle(impact ? 0xff7f98 : 0x7c66a5, impact ? 0xffb866 : 0x9984bc, impact ? 0xdb5b86 : 0x675287, impact ? 0xe78462 : 0x79639a, 0.96)
      .lineStyle(5, 0xffffff, 0.9).fillRoundedRect(540 - width / 2, top, width, height, height / 2)
      .strokeRoundedRect(540 - width / 2, top, width, height, height / 2)
      .setVisible(true).setAlpha(1);
    this.statusText.setText(message).setFontSize(impact ? 64 : 40).setAlpha(1).setScale(impact ? 0.55 : 0.78).setAngle(impact ? -2 : 0);
    this.tweens.killTweensOf(this.statusText);
    this.tweens.killTweensOf(this.statusPlate);
    this.tweens.add({ targets: this.statusText, scale: impact ? 1.08 : 1, angle: 0, duration: 150, ease: 'Back.Out', hold: impact ? 650 : 520, alpha: 0, onComplete: () => this.statusText.setText('') });
    this.tweens.add({ targets: this.statusPlate, alpha: 0, duration: 220, delay: impact ? 670 : 540, onComplete: () => this.statusPlate.setVisible(false) });
  }

  private toGoalSpecial(value: 'row' | 'column' | 'bomb' | 'rainbow'): SpecialTileType {
    const map = { row: 'rowRocket', column: 'columnRocket', bomb: 'pawBomb', rainbow: 'rainbowStar' } as const;
    return map[value];
  }

  private inside(position: Position): boolean { return position.row >= 0 && position.row < 8 && position.col >= 0 && position.col < 8; }
}
