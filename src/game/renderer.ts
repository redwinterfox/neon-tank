import {
  ARENA_HEIGHT,
  ARENA_WIDTH,
  GameSnapshot,
  PowerUpItem,
  Projectile,
  TANK_RADIUS,
  TankPlayer,
  WallObstacle,
} from '../types/game.ts';

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  color: string;
  radius: number;
  alpha: number;
  decay: number;
}

interface TreadMark {
  x: number;
  y: number;
  angle: number;
  alpha: number;
}

export class GameRenderer {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private particles: Particle[] = [];
  private treadMarks: TreadMark[] = [];
  private screenShake: number = 0;
  private localPlayerId: string | null = null;

  // Interpolated player positions for 60fps smoothness
  private smoothedPlayers: Map<string, { x: number; y: number; bodyAngle: number; turretAngle: number }> = new Map();

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    const context = canvas.getContext('2d');
    if (!context) throw new Error('Could not get 2D canvas context');
    this.ctx = context;
  }

  public setLocalPlayerId(id: string | null) {
    this.localPlayerId = id;
  }

  public triggerScreenShake(amount: number = 8) {
    this.screenShake = Math.max(this.screenShake, amount);
  }

  public spawnExplosionParticles(x: number, y: number, color: string = '#f59e0b', count: number = 28) {
    for (let i = 0; i < count; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = 40 + Math.random() * 220;
      this.particles.push({
        x,
        y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        color: Math.random() > 0.4 ? color : '#f43f5e',
        radius: 2 + Math.random() * 4.5,
        alpha: 1,
        decay: 0.02 + Math.random() * 0.035,
      });
    }
  }

  public spawnRicochetSparks(x: number, y: number) {
    for (let i = 0; i < 9; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = 60 + Math.random() * 140;
      this.particles.push({
        x,
        y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        color: '#38bdf8',
        radius: 1.5 + Math.random() * 2,
        alpha: 1,
        decay: 0.04 + Math.random() * 0.05,
      });
    }
  }

  public render(snapshot: GameSnapshot, dt: number) {
    const { ctx, canvas } = this;
    const width = canvas.width;
    const height = canvas.height;

    // Decay screen shake
    if (this.screenShake > 0) {
      this.screenShake = Math.max(0, this.screenShake - dt * 25);
    }
    const shakeX = (Math.random() - 0.5) * this.screenShake;
    const shakeY = (Math.random() - 0.5) * this.screenShake;

    // Camera follow: center on local player, or spectator target
    let targetX = ARENA_WIDTH / 2;
    let targetY = ARENA_HEIGHT / 2;

    const localPlayer = snapshot.players.find((p) => p.id === this.localPlayerId);
    if (localPlayer && localPlayer.isAlive) {
      targetX = localPlayer.x;
      targetY = localPlayer.y;
    } else {
      // Spectating first alive player
      const firstAlive = snapshot.players.find((p) => p.isAlive);
      if (firstAlive) {
        targetX = firstAlive.x;
        targetY = firstAlive.y;
      }
    }

    // Viewport scale & translation
    const scaleX = width / ARENA_WIDTH;
    const scaleY = height / ARENA_HEIGHT;
    // Balanced zoom fitting arena or close framing
    const zoom = Math.max(scaleX, scaleY);

    ctx.save();
    ctx.clearRect(0, 0, width, height);

    // Apply Camera transform with smooth centering & shake
    const camX = width / 2 - targetX * zoom + shakeX;
    const camY = height / 2 - targetY * zoom + shakeY;

    ctx.translate(camX, camY);
    ctx.scale(zoom, zoom);

    // 1. Draw Arena Floor & Blueprint Grid
    this.drawArenaFloor(ctx);

    // 2. Draw Tread Marks
    this.drawTreadMarks(ctx, dt);

    // 3. Draw Obstacles (Walls & Crates)
    for (const wall of snapshot.walls) {
      this.drawWall(ctx, wall);
    }

    // 4. Draw Power-Up items
    for (const pu of snapshot.powerUps) {
      this.drawPowerUp(ctx, pu);
    }

    // 5. Draw Projectiles
    for (const proj of snapshot.projectiles) {
      this.drawProjectile(ctx, proj);
    }

    // 6. Draw Particles
    this.drawParticles(ctx, dt);

    // 7. Draw Tanks
    for (const player of snapshot.players) {
      if (player.isAlive) {
        this.drawTank(ctx, player, dt);
      }
    }

    ctx.restore();
  }

  private drawArenaFloor(ctx: CanvasRenderingContext2D) {
    // Deep obsidian void base
    ctx.fillStyle = '#0a0f1d';
    ctx.fillRect(0, 0, ARENA_WIDTH, ARENA_HEIGHT);

    // Subtle neon blueprint grid
    ctx.strokeStyle = 'rgba(30, 41, 59, 0.45)';
    ctx.lineWidth = 1;
    const gridSize = 50;

    ctx.beginPath();
    for (let x = 0; x <= ARENA_WIDTH; x += gridSize) {
      ctx.moveTo(x, 0);
      ctx.lineTo(x, ARENA_HEIGHT);
    }
    for (let y = 0; y <= ARENA_HEIGHT; y += gridSize) {
      ctx.moveTo(0, y);
      ctx.lineTo(ARENA_WIDTH, y);
    }
    ctx.stroke();

    // Center arena tactical ring
    ctx.strokeStyle = 'rgba(14, 165, 233, 0.12)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(ARENA_WIDTH / 2, ARENA_HEIGHT / 2, 140, 0, Math.PI * 2);
    ctx.stroke();

    ctx.beginPath();
    ctx.arc(ARENA_WIDTH / 2, ARENA_HEIGHT / 2, 8, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(14, 165, 233, 0.2)';
    ctx.fill();
  }

  private drawTreadMarks(ctx: CanvasRenderingContext2D, dt: number) {
    ctx.save();
    for (let i = this.treadMarks.length - 1; i >= 0; i--) {
      const tm = this.treadMarks[i];
      tm.alpha -= dt * 0.08;
      if (tm.alpha <= 0) {
        this.treadMarks.splice(i, 1);
        continue;
      }
      ctx.save();
      ctx.translate(tm.x, tm.y);
      ctx.rotate(tm.angle);
      ctx.fillStyle = `rgba(15, 23, 42, ${tm.alpha * 0.7})`;
      ctx.fillRect(-12, -15, 4, 30);
      ctx.fillRect(8, -15, 4, 30);
      ctx.restore();
    }
    ctx.restore();
  }

  private drawWall(ctx: CanvasRenderingContext2D, wall: WallObstacle) {
    ctx.save();
    if (wall.isDestructible) {
      // Destructible brick crate
      const hpRatio = (wall.health || 1) / (wall.maxHealth || 60);
      ctx.fillStyle = '#292524';
      ctx.fillRect(wall.x, wall.y, wall.width, wall.height);

      ctx.strokeStyle = hpRatio < 0.5 ? '#f97316' : '#78716c';
      ctx.lineWidth = 2;
      ctx.strokeRect(wall.x + 1, wall.y + 1, wall.width - 2, wall.height - 2);

      // Crate inner cross brace
      ctx.strokeStyle = 'rgba(120, 113, 108, 0.4)';
      ctx.beginPath();
      ctx.moveTo(wall.x, wall.y);
      ctx.lineTo(wall.x + wall.width, wall.y + wall.height);
      ctx.moveTo(wall.x + wall.width, wall.y);
      ctx.lineTo(wall.x, wall.y + wall.height);
      ctx.stroke();

      // Health bar for damaged crate
      if (hpRatio < 1) {
        ctx.fillStyle = '#ef4444';
        ctx.fillRect(wall.x + 4, wall.y + 4, (wall.width - 8) * hpRatio, 4);
      }
    } else {
      // Reinforced steel boundary wall
      ctx.fillStyle = '#1e293b';
      ctx.fillRect(wall.x, wall.y, wall.width, wall.height);

      ctx.strokeStyle = '#38bdf8';
      ctx.lineWidth = 1.5;
      ctx.strokeRect(wall.x, wall.y, wall.width, wall.height);

      // Metallic corner bevels
      ctx.fillStyle = '#334155';
      ctx.fillRect(wall.x + 3, wall.y + 3, Math.max(2, wall.width - 6), Math.max(2, wall.height - 6));
    }
    ctx.restore();
  }

  private drawPowerUp(ctx: CanvasRenderingContext2D, pu: PowerUpItem) {
    ctx.save();
    ctx.translate(pu.x, pu.y);

    const pulse = Math.sin(Date.now() / 200) * 0.2 + 1;
    const r = pu.radius * pulse;

    let color = '#38bdf8';
    let label = '⚡';
    if (pu.type === 'SHIELD') {
      color = '#06b6d4';
      label = '🛡️';
    } else if (pu.type === 'TRIPLE_SHOT') {
      color = '#f59e0b';
      label = '▲3';
    } else if (pu.type === 'MEGA_CANNON') {
      color = '#f43f5e';
      label = '💥';
    } else if (pu.type === 'TURBO_SPEED') {
      color = '#10b981';
      label = '⏩';
    }

    // Outer glow aura
    ctx.shadowColor = color;
    ctx.shadowBlur = 14;

    ctx.beginPath();
    ctx.arc(0, 0, r, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(15, 23, 42, 0.9)';
    ctx.fill();

    ctx.lineWidth = 2.5;
    ctx.strokeStyle = color;
    ctx.stroke();

    // Center icon/text
    ctx.shadowBlur = 0;
    ctx.font = 'bold 12px "JetBrains Mono", monospace';
    ctx.fillStyle = color;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(label, 0, 1);

    ctx.restore();
  }

  private drawProjectile(ctx: CanvasRenderingContext2D, proj: Projectile) {
    ctx.save();
    ctx.translate(proj.x, proj.y);

    const angle = Math.atan2(proj.vy, proj.vx);
    ctx.rotate(angle);

    const color = proj.isMega ? '#f43f5e' : proj.ownerColor || '#38bdf8';

    // Glowing tail
    const gradient = ctx.createLinearGradient(-18, 0, 4, 0);
    gradient.addColorStop(0, 'rgba(0,0,0,0)');
    gradient.addColorStop(1, color);

    ctx.fillStyle = gradient;
    ctx.fillRect(-18, -proj.radius, 18, proj.radius * 2);

    // Glowing shell head
    ctx.shadowColor = color;
    ctx.shadowBlur = proj.isMega ? 16 : 8;
    ctx.beginPath();
    ctx.arc(0, 0, proj.radius, 0, Math.PI * 2);
    ctx.fillStyle = '#ffffff';
    ctx.fill();

    ctx.lineWidth = 2;
    ctx.strokeStyle = color;
    ctx.stroke();

    ctx.restore();
  }

  private drawParticles(ctx: CanvasRenderingContext2D, dt: number) {
    ctx.save();
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.alpha -= p.decay;

      if (p.alpha <= 0) {
        this.particles.splice(i, 1);
        continue;
      }

      ctx.save();
      ctx.globalAlpha = p.alpha;
      ctx.fillStyle = p.color;
      ctx.shadowColor = p.color;
      ctx.shadowBlur = 6;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }
    ctx.restore();
  }

  private drawTank(ctx: CanvasRenderingContext2D, player: TankPlayer, dt: number) {
    // 60fps smoothing interpolation
    let smoothed = this.smoothedPlayers.get(player.id);
    if (!smoothed) {
      smoothed = { x: player.x, y: player.y, bodyAngle: player.bodyAngle, turretAngle: player.turretAngle };
      this.smoothedPlayers.set(player.id, smoothed);
    } else {
      smoothed.x += (player.x - smoothed.x) * 0.35;
      smoothed.y += (player.y - smoothed.y) * 0.35;
      smoothed.bodyAngle = player.bodyAngle;
      smoothed.turretAngle = player.turretAngle;
    }

    // Add tread marks if moving
    if (Math.hypot(player.vx, player.vy) > 20 && Math.random() > 0.65) {
      this.treadMarks.push({
        x: smoothed.x,
        y: smoothed.y,
        angle: smoothed.bodyAngle,
        alpha: 0.8,
      });
      if (this.treadMarks.length > 120) {
        this.treadMarks.shift();
      }
    }

    ctx.save();
    ctx.translate(smoothed.x, smoothed.y);

    // 1. Draw Energy Shield Bubble
    if (player.shield > 0) {
      ctx.save();
      const pulse = Math.sin(Date.now() / 150) * 2;
      ctx.beginPath();
      ctx.arc(0, 0, TANK_RADIUS + 9 + pulse, 0, Math.PI * 2);
      ctx.strokeStyle = '#06b6d4';
      ctx.lineWidth = 2.5;
      ctx.shadowColor = '#06b6d4';
      ctx.shadowBlur = 12;
      ctx.stroke();

      ctx.fillStyle = 'rgba(6, 182, 212, 0.12)';
      ctx.fill();
      ctx.restore();
    }

    // 2. Draw Tank Chassis & Treads
    ctx.save();
    ctx.rotate(smoothed.bodyAngle);

    // Left & Right Treads
    ctx.fillStyle = '#0f172a';
    ctx.strokeStyle = '#334155';
    ctx.lineWidth = 2;
    // Top Tread
    ctx.fillRect(-24, -22, 48, 9);
    ctx.strokeRect(-24, -22, 48, 9);
    // Bottom Tread
    ctx.fillRect(-24, 13, 48, 9);
    ctx.strokeRect(-24, 13, 48, 9);

    // Main Chassis Body
    ctx.fillStyle = '#1e293b';
    ctx.fillRect(-18, -14, 36, 28);

    // Neon Accent Armor Plates
    ctx.fillStyle = player.color;
    ctx.shadowColor = player.color;
    ctx.shadowBlur = 8;
    ctx.fillRect(-14, -11, 28, 5);
    ctx.fillRect(-14, 6, 28, 5);
    ctx.shadowBlur = 0;

    ctx.restore();

    // 3. Draw Rotating Turret
    ctx.save();
    ctx.rotate(smoothed.turretAngle);

    // Cannon Barrel
    const isMega = player.powerUp === 'MEGA_CANNON';
    const barrelLength = isMega ? 28 : 22;
    const barrelWidth = isMega ? 8 : 6;

    ctx.fillStyle = '#334155';
    ctx.fillRect(0, -barrelWidth / 2, barrelLength, barrelWidth);

    ctx.strokeStyle = player.color;
    ctx.lineWidth = 1.5;
    ctx.strokeRect(0, -barrelWidth / 2, barrelLength, barrelWidth);

    // Turret Dome
    ctx.beginPath();
    ctx.arc(0, 0, 11, 0, Math.PI * 2);
    ctx.fillStyle = '#0f172a';
    ctx.fill();

    ctx.lineWidth = 2;
    ctx.strokeStyle = player.color;
    ctx.shadowColor = player.color;
    ctx.shadowBlur = 6;
    ctx.stroke();
    ctx.shadowBlur = 0;

    // Center hatch
    ctx.beginPath();
    ctx.arc(0, 0, 5, 0, Math.PI * 2);
    ctx.fillStyle = player.color;
    ctx.fill();

    ctx.restore();

    // 4. Draw Player Callsign & Health Bar
    ctx.save();
    const hpRatio = Math.max(0, player.health / player.maxHealth);
    const barWidth = 44;
    const barHeight = 4;
    const barY = -TANK_RADIUS - 16;

    // Background bar
    ctx.fillStyle = 'rgba(15, 23, 42, 0.8)';
    ctx.fillRect(-barWidth / 2, barY, barWidth, barHeight);

    // Health Fill
    ctx.fillStyle = hpRatio > 0.5 ? '#10b981' : hpRatio > 0.25 ? '#f59e0b' : '#f43f5e';
    ctx.fillRect(-barWidth / 2, barY, barWidth * hpRatio, barHeight);

    // Shield overlay
    if (player.shield > 0) {
      ctx.fillStyle = '#06b6d4';
      ctx.fillRect(-barWidth / 2, barY - 3, (barWidth * player.shield) / 100, 2);
    }

    // Name text
    ctx.font = '600 11px "Outfit", sans-serif';
    ctx.fillStyle = player.id === this.localPlayerId ? '#ffffff' : '#cbd5e1';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'bottom';
    ctx.fillText(player.name, 0, barY - 3);

    ctx.restore();

    ctx.restore();
  }
}
