import Phaser from 'phaser';

export interface ParticleBurstOptions {
  count?: number;
  colors?: readonly number[];
  speed?: { min: number; max: number };
  lifespan?: number;
  gravityY?: number;
  size?: { min: number; max: number };
}

interface PooledParticle {
  view: Phaser.GameObjects.Arc;
  tween?: Phaser.Tweens.Tween;
}

/** Tiny pooled confetti particles; avoids texture files and per-match allocations. */
export class ParticlePool {
  private readonly particles: PooledParticle[] = [];
  private readonly available: PooledParticle[] = [];

  public constructor(private readonly scene: Phaser.Scene, initialSize = 36) {
    this.grow(initialSize);
  }

  public burst(x: number, y: number, options: ParticleBurstOptions = {}): void {
    const count = options.count ?? 12;
    const colors = options.colors ?? [0xff8fab, 0xffd166, 0x70d6ff, 0x95e1a3, 0xc7a0ff];
    const speed = options.speed ?? { min: 55, max: 145 };
    const lifespan = options.lifespan ?? 480;
    const gravityY = options.gravityY ?? 130;
    const size = options.size ?? { min: 2, max: 5 };

    if (this.available.length < count) this.grow(count - this.available.length);
    for (let index = 0; index < count; index += 1) {
      const particle = this.available.pop();
      if (!particle) break;
      const angle = Phaser.Math.FloatBetween(-Math.PI * 0.92, -Math.PI * 0.08);
      const velocity = Phaser.Math.Between(speed.min, speed.max);
      const radius = Phaser.Math.FloatBetween(size.min, size.max);
      particle.view
        .setPosition(x, y)
        .setRadius(radius)
        .setFillStyle(Phaser.Utils.Array.GetRandom([...colors]))
        .setAlpha(1)
        .setScale(1)
        .setVisible(true)
        .setActive(true);
      particle.tween = this.scene.tweens.addCounter({
        from: 0,
        to: 1,
        duration: lifespan,
        ease: 'Quad.Out',
        onUpdate: (tween) => {
          const t = tween.getValue() ?? 0;
          particle.view.x = x + Math.cos(angle) * velocity * (t * lifespan / 1000);
          particle.view.y = y + Math.sin(angle) * velocity * (t * lifespan / 1000) + gravityY * t * t * 0.5;
          particle.view.setAlpha(1 - t).setScale(1 - t * 0.35);
        },
        onComplete: () => this.release(particle),
      });
    }
  }

  public clear(): void {
    for (const particle of this.particles) {
      particle.tween?.stop();
      particle.tween = undefined;
      if (particle.view.active) this.release(particle);
    }
  }

  public destroy(): void {
    for (const particle of this.particles) particle.view.destroy();
    this.particles.length = 0;
    this.available.length = 0;
  }

  private grow(count: number): void {
    for (let index = 0; index < count; index += 1) {
      const view = this.scene.add.circle(0, 0, 3, 0xffffff).setVisible(false).setActive(false).setDepth(100);
      const particle: PooledParticle = { view };
      this.particles.push(particle);
      this.available.push(particle);
    }
  }

  private release(particle: PooledParticle): void {
    particle.tween = undefined;
    particle.view.setVisible(false).setActive(false);
    if (!this.available.includes(particle)) this.available.push(particle);
  }
}

