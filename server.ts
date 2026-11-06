import http from 'http';
import path from 'path';
import express from 'express';
import { WebSocketServer, WebSocket } from 'ws';
import {
  ARENA_HEIGHT,
  ARENA_WIDTH,
  BULLET_RADIUS,
  BULLET_SPEED,
  ClientMessage,
  DEFAULT_RELOAD_TIME,
  GameSnapshot,
  KillFeedItem,
  MapType,
  MEGA_RELOAD_TIME,
  PowerUpItem,
  PowerUpType,
  POWERUP_DURATION,
  POWERUP_SPAWN_INTERVAL,
  Projectile,
  RoomConfig,
  RoomSummary,
  ServerMessage,
  TANK_RADIUS,
  TankPlayer,
  TRIPLE_RELOAD_TIME,
  WallObstacle,
} from './src/types/game.ts';

const app = express();
const server = http.createServer(app);
const wss = new WebSocketServer({ server });

app.use(express.json());

const PORT = parseInt(process.env.PORT || '3000', 10);

// Helper for generating room codes
function generateRoomCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = '';
  for (let i = 0; i < 4; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}

// Bot names and neon color choices
const BOT_NAMES = ['CyberTron', 'GhostRider', 'Viper', 'NeonPulse', 'Titanium', 'Blaze', 'ZeroCool', 'Phantom'];
const NEON_COLORS = ['#06b6d4', '#f43f5e', '#10b981', '#f59e0b', '#8b5cf6', '#ec4899', '#3b82f6', '#14b8a6'];

interface PlayerClient {
  ws: WebSocket;
  playerId: string;
  roomId: string;
  name: string;
  color: string;
  input: {
    moveX: number;
    moveY: number;
    turretAngle: number;
    firing: boolean;
    boost: boolean;
  };
}

interface RoomInstance {
  config: RoomConfig;
  status: 'waiting' | 'in_game' | 'round_end' | 'match_over';
  currentRound: number;
  players: Map<string, TankPlayer>;
  clients: Map<string, PlayerClient>;
  projectiles: Projectile[];
  powerUps: PowerUpItem[];
  walls: WallObstacle[];
  killFeed: KillFeedItem[];
  roundWinnerId?: string;
  matchWinnerId?: string;
  roundCountdown: number;
  nextPowerupSpawn: number;
  lastTickTime: number;
  loopInterval?: NodeJS.Timeout;
}

const activeRooms = new Map<string, RoomInstance>();

function buildMap(mapType: MapType): WallObstacle[] {
  const walls: WallObstacle[] = [
    // Outer perimeter boundaries
    { id: 'w_top', x: 0, y: 0, width: ARENA_WIDTH, height: 28, isDestructible: false },
    { id: 'w_bottom', x: 0, y: ARENA_HEIGHT - 28, width: ARENA_WIDTH, height: 28, isDestructible: false },
    { id: 'w_left', x: 0, y: 0, width: 28, height: ARENA_HEIGHT, isDestructible: false },
    { id: 'w_right', x: ARENA_WIDTH - 28, y: 0, width: 28, height: ARENA_HEIGHT, isDestructible: false },
  ];

  if (mapType === 'classic') {
    // Symmetrical tactical pillars and destructible barrier cubes
    walls.push(
      // Steel center monument
      { id: 'c_mid', x: ARENA_WIDTH / 2 - 40, y: ARENA_HEIGHT / 2 - 40, width: 80, height: 80, isDestructible: false },
      // Corner bunkers
      { id: 'c_tl', x: 280, y: 180, width: 40, height: 160, isDestructible: false },
      { id: 'c_tl2', x: 280, y: 180, width: 160, height: 40, isDestructible: false },
      { id: 'c_tr', x: ARENA_WIDTH - 320, y: 180, width: 40, height: 160, isDestructible: false },
      { id: 'c_tr2', x: ARENA_WIDTH - 440, y: 180, width: 160, height: 40, isDestructible: false },
      { id: 'c_bl', x: 280, y: ARENA_HEIGHT - 340, width: 40, height: 160, isDestructible: false },
      { id: 'c_bl2', x: 280, y: ARENA_HEIGHT - 220, width: 160, height: 40, isDestructible: false },
      { id: 'c_br', x: ARENA_WIDTH - 320, y: ARENA_HEIGHT - 340, width: 40, height: 160, isDestructible: false },
      { id: 'c_br2', x: ARENA_WIDTH - 440, y: ARENA_HEIGHT - 220, width: 160, height: 40, isDestructible: false },
      // Destructible brick crates
      { id: 'd1', x: 480, y: ARENA_HEIGHT / 2 - 40, width: 60, height: 80, isDestructible: true, health: 60, maxHealth: 60 },
      { id: 'd2', x: ARENA_WIDTH - 540, y: ARENA_HEIGHT / 2 - 40, width: 60, height: 80, isDestructible: true, health: 60, maxHealth: 60 },
      { id: 'd3', x: ARENA_WIDTH / 2 - 30, y: 180, width: 60, height: 60, isDestructible: true, health: 60, maxHealth: 60 },
      { id: 'd4', x: ARENA_WIDTH / 2 - 30, y: ARENA_HEIGHT - 240, width: 60, height: 60, isDestructible: true, health: 60, maxHealth: 60 }
    );
  } else if (mapType === 'courtyard') {
    // Open arena with 4 mega corner columns and center ring
    walls.push(
      { id: 'col_1', x: 380, y: 240, width: 90, height: 90, isDestructible: false },
      { id: 'col_2', x: ARENA_WIDTH - 470, y: 240, width: 90, height: 90, isDestructible: false },
      { id: 'col_3', x: 380, y: ARENA_HEIGHT - 330, width: 90, height: 90, isDestructible: false },
      { id: 'col_4', x: ARENA_WIDTH - 470, y: ARENA_HEIGHT - 330, width: 90, height: 90, isDestructible: false },
      // Center destructible block cluster
      { id: 'd_m1', x: ARENA_WIDTH / 2 - 70, y: ARENA_HEIGHT / 2 - 30, width: 60, height: 60, isDestructible: true, health: 60, maxHealth: 60 },
      { id: 'd_m2', x: ARENA_WIDTH / 2 + 10, y: ARENA_HEIGHT / 2 - 30, width: 60, height: 60, isDestructible: true, health: 60, maxHealth: 60 }
    );
  } else {
    // Urban Maze: Corridors optimized for ricocheting trick shots
    walls.push(
      { id: 'm1', x: 260, y: 100, width: 36, height: 320, isDestructible: false },
      { id: 'm2', x: 260, y: ARENA_HEIGHT - 420, width: 36, height: 320, isDestructible: false },
      { id: 'm3', x: ARENA_WIDTH - 296, y: 100, width: 36, height: 320, isDestructible: false },
      { id: 'm4', x: ARENA_WIDTH - 296, y: ARENA_HEIGHT - 420, width: 36, height: 320, isDestructible: false },
      { id: 'm5', x: ARENA_WIDTH / 2 - 18, y: 120, width: 36, height: 260, isDestructible: false },
      { id: 'm6', x: ARENA_WIDTH / 2 - 18, y: ARENA_HEIGHT - 380, width: 36, height: 260, isDestructible: false },
      { id: 'm7', x: 460, y: ARENA_HEIGHT / 2 - 18, width: 200, height: 36, isDestructible: false },
      { id: 'm8', x: ARENA_WIDTH - 660, y: ARENA_HEIGHT / 2 - 18, width: 200, height: 36, isDestructible: false },
      // Destructible corridors
      { id: 'md1', x: 420, y: 220, width: 60, height: 60, isDestructible: true, health: 50, maxHealth: 50 },
      { id: 'md2', x: ARENA_WIDTH - 480, y: ARENA_HEIGHT - 280, width: 60, height: 60, isDestructible: true, health: 50, maxHealth: 50 }
    );
  }

  return walls;
}

function findSafeSpawn(walls: WallObstacle[], existingPlayers: TankPlayer[]): { x: number; y: number } {
  for (let attempt = 0; attempt < 80; attempt++) {
    const x = 100 + Math.random() * (ARENA_WIDTH - 200);
    const y = 100 + Math.random() * (ARENA_HEIGHT - 200);

    let collides = false;
    for (const w of walls) {
      if (
        x + TANK_RADIUS + 15 > w.x &&
        x - TANK_RADIUS - 15 < w.x + w.width &&
        y + TANK_RADIUS + 15 > w.y &&
        y - TANK_RADIUS - 15 < w.y + w.height
      ) {
        collides = true;
        break;
      }
    }
    if (collides) continue;

    for (const p of existingPlayers) {
      const dist = Math.hypot(x - p.x, y - p.y);
      if (dist < 140) {
        collides = true;
        break;
      }
    }
    if (!collides) {
      return { x, y };
    }
  }
  return { x: 200 + Math.random() * 200, y: 200 + Math.random() * 200 };
}

function createRoom(config: Partial<RoomConfig>): RoomInstance {
  const roomId = config.id || generateRoomCode();
  const roomConfig: RoomConfig = {
    id: roomId,
    name: config.name || `Arena ${roomId}`,
    mapType: config.mapType || 'classic',
    maxPlayers: config.maxPlayers || 6,
    roundsToWin: config.roundsToWin || 3,
    isPublic: config.isPublic ?? true,
  };

  const room: RoomInstance = {
    config: roomConfig,
    status: 'waiting',
    currentRound: 1,
    players: new Map(),
    clients: new Map(),
    projectiles: [],
    powerUps: [],
    walls: buildMap(roomConfig.mapType),
    killFeed: [],
    roundCountdown: 0,
    nextPowerupSpawn: Date.now() + 5000,
    lastTickTime: Date.now(),
  };

  // Start 30Hz simulation loop
  room.loopInterval = setInterval(() => {
    updateRoom(room);
  }, 1000 / 30);

  activeRooms.set(roomId, room);
  broadcastPublicRooms();
  return room;
}

function broadcastToRoom(room: RoomInstance, msg: ServerMessage) {
  const payload = JSON.stringify(msg);
  for (const client of room.clients.values()) {
    if (client.ws.readyState === WebSocket.OPEN) {
      client.ws.send(payload);
    }
  }
}

function getPublicRoomsSummary(): RoomSummary[] {
  const list: RoomSummary[] = [];
  for (const room of activeRooms.values()) {
    if (room.config.isPublic) {
      let hasBots = false;
      for (const p of room.players.values()) {
        if (p.isBot) hasBots = true;
      }
      list.push({
        id: room.config.id,
        name: room.config.name,
        mapType: room.config.mapType,
        playerCount: room.players.size,
        maxPlayers: room.config.maxPlayers,
        roundsToWin: room.config.roundsToWin,
        status: room.status,
        hasBots,
      });
    }
  }
  return list;
}

function broadcastPublicRooms() {
  const summary = getPublicRoomsSummary();
  const msg: ServerMessage = { type: 'room_list', rooms: summary };
  const payload = JSON.stringify(msg);
  for (const client of wss.clients) {
    if (client.readyState === WebSocket.OPEN) {
      client.send(payload);
    }
  }
}

function startNewRound(room: RoomInstance) {
  room.status = 'in_game';
  room.roundWinnerId = undefined;
  room.projectiles = [];
  room.powerUps = [];
  room.walls = buildMap(room.config.mapType);
  room.nextPowerupSpawn = Date.now() + 6000;

  const playerList = Array.from(room.players.values());
  for (const p of playerList) {
    const spawn = findSafeSpawn(room.walls, playerList.filter((other) => other.id !== p.id));
    p.x = spawn.x;
    p.y = spawn.y;
    p.vx = 0;
    p.vy = 0;
    p.health = p.maxHealth;
    p.shield = 0;
    p.isAlive = true;
    p.powerUp = null;
    p.powerUpExpiresAt = 0;
    p.lastFiredAt = 0;
  }
}

function spawnRandomPowerup(room: RoomInstance) {
  if (room.powerUps.length >= 4) return;
  const types: PowerUpType[] = ['SHIELD', 'TRIPLE_SHOT', 'MEGA_CANNON', 'TURBO_SPEED'];
  const type = types[Math.floor(Math.random() * types.length)];
  const spawn = findSafeSpawn(room.walls, Array.from(room.players.values()));

  const item: PowerUpItem = {
    id: `p_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`,
    type,
    x: spawn.x,
    y: spawn.y,
    radius: 18,
    spawnedAt: Date.now(),
  };
  room.powerUps.push(item);
  room.nextPowerupSpawn = Date.now() + POWERUP_SPAWN_INTERVAL + Math.random() * 4000;
}

// Check circle vs AABB collision
function circleAABBCollision(
  cx: number,
  cy: number,
  r: number,
  box: { x: number; y: number; width: number; height: number }
): { collides: boolean; normalX: number; normalY: number; overlap: number } {
  const closestX = Math.max(box.x, Math.min(cx, box.x + box.width));
  const closestY = Math.max(box.y, Math.min(cy, box.y + box.height));
  const distX = cx - closestX;
  const distY = cy - closestY;
  const distSq = distX * distX + distY * distY;

  if (distSq < r * r) {
    const dist = Math.sqrt(distSq) || 0.0001;
    return {
      collides: true,
      normalX: distX / dist,
      normalY: distY / dist,
      overlap: r - dist,
    };
  }
  return { collides: false, normalX: 0, normalY: 0, overlap: 0 };
}

// 30Hz Room Simulation Loop
function updateRoom(room: RoomInstance) {
  const now = Date.now();
  const dt = Math.min((now - room.lastTickTime) / 1000, 0.05);
  room.lastTickTime = now;

  if (room.status === 'in_game') {
    // 1. Spawn powerups
    if (now >= room.nextPowerupSpawn) {
      spawnRandomPowerup(room);
    }

    // 2. AI Bot logic
    for (const bot of room.players.values()) {
      if (!bot.isBot || !bot.isAlive) continue;

      // Find closest living enemy
      let closestEnemy: TankPlayer | null = null;
      let closestDist = Infinity;
      for (const enemy of room.players.values()) {
        if (enemy.id !== bot.id && enemy.isAlive) {
          const d = Math.hypot(enemy.x - bot.x, enemy.y - bot.y);
          if (d < closestDist) {
            closestDist = d;
            closestEnemy = enemy;
          }
        }
      }

      // Check nearby powerups
      let targetX = bot.x;
      let targetY = bot.y;
      if (room.powerUps.length > 0 && closestDist > 300) {
        const p = room.powerUps[0];
        targetX = p.x;
        targetY = p.y;
      } else if (closestEnemy) {
        targetX = closestEnemy.x;
        targetY = closestEnemy.y;
      }

      const dx = targetX - bot.x;
      const dy = targetY - bot.y;
      const targetAngle = Math.atan2(dy, dx);

      // Aim turret towards target
      bot.turretAngle = targetAngle;

      // Move toward target with slight wandering/evasion
      const dist = Math.hypot(dx, dy);
      if (dist > 180) {
        bot.vx = Math.cos(targetAngle) * 160;
        bot.vy = Math.sin(targetAngle) * 160;
        bot.bodyAngle = targetAngle;
      } else if (dist < 100) {
        // Back off slightly
        bot.vx = -Math.cos(targetAngle) * 120;
        bot.vy = -Math.sin(targetAngle) * 120;
      } else {
        // Circle around
        bot.vx = -Math.sin(targetAngle) * 140;
        bot.vy = Math.cos(targetAngle) * 140;
        bot.bodyAngle = targetAngle;
      }

      // Fire cannon if facing enemy and reload ready
      if (closestEnemy && now - bot.lastFiredAt > 700 + Math.random() * 400) {
        fireCannon(room, bot, targetAngle);
      }
    }

    // 3. Process human inputs & player movement
    for (const [playerId, client] of room.clients.entries()) {
      const p = room.players.get(playerId);
      if (!p || !p.isAlive) continue;

      const inp = client.input;
      const speedMult = p.powerUp === 'TURBO_SPEED' ? 1.5 : inp.boost ? 1.3 : 1.0;
      const maxSpeed = 230 * speedMult;

      let targetVx = inp.moveX * maxSpeed;
      let targetVy = inp.moveY * maxSpeed;

      // Smooth inertia
      p.vx += (targetVx - p.vx) * 0.28;
      p.vy += (targetVy - p.vy) * 0.28;

      if (Math.hypot(inp.moveX, inp.moveY) > 0.1) {
        p.bodyAngle = Math.atan2(p.vy, p.vx);
      }
      p.turretAngle = inp.turretAngle;

      // Handle firing
      if (inp.firing) {
        const reloadTime =
          p.powerUp === 'MEGA_CANNON'
            ? MEGA_RELOAD_TIME
            : p.powerUp === 'TRIPLE_SHOT'
            ? TRIPLE_RELOAD_TIME
            : DEFAULT_RELOAD_TIME;

        if (now - p.lastFiredAt >= reloadTime) {
          fireCannon(room, p, p.turretAngle);
        }
      }

      // Check powerup expiration
      if (p.powerUp && now >= p.powerUpExpiresAt) {
        p.powerUp = null;
      }
    }

    // 4. Update player positions & obstacle collisions
    for (const p of room.players.values()) {
      if (!p.isAlive) continue;

      p.x += p.vx * dt;
      p.y += p.vy * dt;

      // Wall collisions
      for (const w of room.walls) {
        const col = circleAABBCollision(p.x, p.y, TANK_RADIUS, w);
        if (col.collides) {
          p.x += col.normalX * col.overlap;
          p.y += col.normalY * col.overlap;
          p.vx *= 0.5;
          p.vy *= 0.5;
        }
      }

      // Tank vs Tank collisions
      for (const other of room.players.values()) {
        if (other.id !== p.id && other.isAlive) {
          const d = Math.hypot(p.x - other.x, p.y - other.y);
          const minD = TANK_RADIUS * 2;
          if (d < minD && d > 0) {
            const push = (minD - d) * 0.5;
            const nx = (p.x - other.x) / d;
            const ny = (p.y - other.y) / d;
            p.x += nx * push;
            p.y += ny * push;
            other.x -= nx * push;
            other.y -= ny * push;
          }
        }
      }

      // Power-up pickup check
      for (let i = room.powerUps.length - 1; i >= 0; i--) {
        const pu = room.powerUps[i];
        const dist = Math.hypot(p.x - pu.x, p.y - pu.y);
        if (dist < TANK_RADIUS + pu.radius) {
          // Apply powerup
          if (pu.type === 'SHIELD') {
            p.shield = 100;
          } else {
            p.powerUp = pu.type;
            p.powerUpExpiresAt = now + POWERUP_DURATION;
          }
          room.powerUps.splice(i, 1);
          broadcastToRoom(room, {
            type: 'game_event',
            event: 'powerup_collected',
            data: { playerId: p.id, type: pu.type, x: pu.x, y: pu.y },
          });
        }
      }
    }

    // 5. Update Projectiles
    for (let i = room.projectiles.length - 1; i >= 0; i--) {
      const proj = room.projectiles[i];
      proj.x += proj.vx * dt;
      proj.y += proj.vy * dt;

      let destroyed = false;

      // Obstacle collision & ricochet
      for (let wIdx = room.walls.length - 1; wIdx >= 0; wIdx--) {
        const w = room.walls[wIdx];
        const col = circleAABBCollision(proj.x, proj.y, proj.radius, w);
        if (col.collides) {
          if (w.isDestructible) {
            // Destructible block damaged
            if (w.health !== undefined) {
              w.health -= proj.damage;
              if (w.health <= 0) {
                room.walls.splice(wIdx, 1);
                broadcastToRoom(room, {
                  type: 'game_event',
                  event: 'explosion',
                  data: { x: w.x + w.width / 2, y: w.y + w.height / 2, isBig: true },
                });
              }
            }
            destroyed = true;
            break;
          } else {
            // Steel wall: Ricochet bounce or explode if no bounces left
            if (proj.bouncesRemaining > 0) {
              proj.bouncesRemaining--;
              // Bounce reflection
              if (Math.abs(col.normalX) > Math.abs(col.normalY)) {
                proj.vx = -proj.vx;
              } else {
                proj.vy = -proj.vy;
              }
              proj.x += col.normalX * (col.overlap + 2);
              proj.y += col.normalY * (col.overlap + 2);

              broadcastToRoom(room, {
                type: 'game_event',
                event: 'ricochet',
                data: { x: proj.x, y: proj.y },
              });
            } else {
              destroyed = true;
              broadcastToRoom(room, {
                type: 'game_event',
                event: 'explosion',
                data: { x: proj.x, y: proj.y, isBig: false },
              });
              break;
            }
          }
        }
      }

      if (destroyed) {
        room.projectiles.splice(i, 1);
        continue;
      }

      // Check hit on players
      for (const p of room.players.values()) {
        if (!p.isAlive) continue;
        // Don't hit owner during first 80ms of launch to prevent self-collision
        if (p.id === proj.ownerId && now - proj.createdAt < 90) continue;

        const dist = Math.hypot(p.x - proj.x, p.y - proj.y);
        if (dist < TANK_RADIUS + proj.radius) {
          // Hit player!
          let dmg = proj.damage;
          if (p.shield > 0) {
            const absorbed = Math.min(p.shield, dmg);
            p.shield -= absorbed;
            dmg -= absorbed;
          }
          if (dmg > 0) {
            p.health = Math.max(0, p.health - dmg);
          }

          broadcastToRoom(room, {
            type: 'game_event',
            event: 'hit',
            data: { victimId: p.id, x: proj.x, y: proj.y, damage: proj.damage },
          });

          if (p.health <= 0) {
            p.isAlive = false;
            const killer = room.players.get(proj.ownerId);
            if (killer && killer.id !== p.id) {
              killer.kills++;
            }
            const feedItem: KillFeedItem = {
              id: `${now}_${Math.random()}`,
              killerName: killer ? killer.name : 'Arena Hazard',
              killerColor: killer ? killer.color : '#94a3b8',
              victimName: p.name,
              victimColor: p.color,
              timestamp: now,
            };
            room.killFeed.unshift(feedItem);
            if (room.killFeed.length > 6) room.killFeed.pop();

            broadcastToRoom(room, {
              type: 'game_event',
              event: 'explosion',
              data: { x: p.x, y: p.y, isBig: true },
            });
          }

          destroyed = true;
          break;
        }
      }

      if (destroyed) {
        room.projectiles.splice(i, 1);
      }
    }

    // 6. Check Round Elimination / Win Condition
    const alivePlayers = Array.from(room.players.values()).filter((p) => p.isAlive);
    const totalPlayers = room.players.size;

    if (totalPlayers >= 2 && alivePlayers.length <= 1) {
      // Round Finished!
      room.status = 'round_end';
      const roundWinner = alivePlayers.length === 1 ? alivePlayers[0] : null;

      if (roundWinner) {
        roundWinner.score++;
        room.roundWinnerId = roundWinner.id;
      }

      broadcastToRoom(room, {
        type: 'game_event',
        event: 'round_win',
        data: { winnerId: roundWinner?.id, winnerName: roundWinner?.name },
      });

      // Check if match won
      if (roundWinner && roundWinner.score >= room.config.roundsToWin) {
        room.status = 'match_over';
        room.matchWinnerId = roundWinner.id;
        broadcastToRoom(room, {
          type: 'game_event',
          event: 'match_win',
          data: { winnerId: roundWinner.id, winnerName: roundWinner.name },
        });
      } else {
        // Schedule next round in 3.5 seconds
        room.roundCountdown = 4;
        const countdownInterval = setInterval(() => {
          room.roundCountdown--;
          if (room.roundCountdown <= 0) {
            clearInterval(countdownInterval);
            room.currentRound++;
            startNewRound(room);
          }
        }, 1000);
      }
    }
  }

  // Broadcast Snapshot to clients in the room
  const snapshot: GameSnapshot = {
    status: room.status,
    currentRound: room.currentRound,
    roundsToWin: room.config.roundsToWin,
    players: Array.from(room.players.values()),
    projectiles: room.projectiles,
    powerUps: room.powerUps,
    walls: room.walls,
    roundWinnerId: room.roundWinnerId,
    matchWinnerId: room.matchWinnerId,
    roundCountdown: room.roundCountdown,
    killFeed: room.killFeed,
  };

  broadcastToRoom(room, {
    type: 'state_snapshot',
    snapshot,
    serverTime: now,
  });
}

function fireCannon(room: RoomInstance, player: TankPlayer, angle: number) {
  const now = Date.now();
  player.lastFiredAt = now;

  const barrelOffset = TANK_RADIUS + 12;
  const spawnX = player.x + Math.cos(angle) * barrelOffset;
  const spawnY = player.y + Math.sin(angle) * barrelOffset;

  if (player.powerUp === 'TRIPLE_SHOT') {
    // 3 projectiles in cone
    [-0.22, 0, 0.22].forEach((spreadAngle) => {
      const a = angle + spreadAngle;
      room.projectiles.push({
        id: `b_${now}_${Math.random().toString(36).substr(2, 5)}`,
        ownerId: player.id,
        ownerColor: player.color,
        x: spawnX,
        y: spawnY,
        vx: Math.cos(a) * BULLET_SPEED,
        vy: Math.sin(a) * BULLET_SPEED,
        radius: BULLET_RADIUS,
        damage: 35,
        bouncesRemaining: 1,
        isMega: false,
        createdAt: now,
      });
    });
  } else if (player.powerUp === 'MEGA_CANNON') {
    // High damage piercing plasma shell
    room.projectiles.push({
      id: `b_${now}_${Math.random().toString(36).substr(2, 5)}`,
      ownerId: player.id,
      ownerColor: player.color,
      x: spawnX,
      y: spawnY,
      vx: Math.cos(angle) * (BULLET_SPEED * 1.35),
      vy: Math.sin(angle) * (BULLET_SPEED * 1.35),
      radius: BULLET_RADIUS * 1.8,
      damage: 85,
      bouncesRemaining: 2,
      isMega: true,
      createdAt: now,
    });
  } else {
    // Standard bouncing shell
    room.projectiles.push({
      id: `b_${now}_${Math.random().toString(36).substr(2, 5)}`,
      ownerId: player.id,
      ownerColor: player.color,
      x: spawnX,
      y: spawnY,
      vx: Math.cos(angle) * BULLET_SPEED,
      vy: Math.sin(angle) * BULLET_SPEED,
      radius: BULLET_RADIUS,
      damage: 40,
      bouncesRemaining: 1,
      isMega: false,
      createdAt: now,
    });
  }

  broadcastToRoom(room, {
    type: 'game_event',
    event: 'fire',
    data: { playerId: player.id, isMega: player.powerUp === 'MEGA_CANNON' },
  });
}

// WebSocket connection lifecycle
wss.on('connection', (ws: WebSocket) => {
  let clientSession: PlayerClient | null = null;

  ws.on('message', (data: string) => {
    try {
      const msg: ClientMessage = JSON.parse(data.toString());

      if (msg.type === 'ping') {
        ws.send(JSON.stringify({ type: 'pong', clientTime: msg.clientTime, serverTime: Date.now() }));
        return;
      }

      if (msg.type === 'join_room' || msg.type === 'create_room') {
        const playerName = (msg.name || 'Pilot').trim().slice(0, 16) || 'Pilot';
        const playerColor = msg.color || NEON_COLORS[0];
        let targetRoom: RoomInstance | undefined;

        if (msg.type === 'create_room') {
          targetRoom = createRoom(msg.config || {});
        } else if (msg.roomId) {
          targetRoom = activeRooms.get(msg.roomId.toUpperCase().trim());
          if (!targetRoom) {
            ws.send(JSON.stringify({ type: 'error', message: `Oda bulunamadı: ${msg.roomId}` }));
            return;
          }
        } else {
          // Quick Join: find first available room with free slots
          for (const r of activeRooms.values()) {
            if (r.config.isPublic && r.players.size < r.config.maxPlayers) {
              targetRoom = r;
              break;
            }
          }
          if (!targetRoom) {
            targetRoom = createRoom({ isPublic: true });
          }
        }

        if (targetRoom.players.size >= targetRoom.config.maxPlayers) {
          ws.send(JSON.stringify({ type: 'error', message: 'Oda şu anda tamamen dolu!' }));
          return;
        }

        const playerId = `p_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`;
        const isHost = targetRoom.players.size === 0;

        const spawn = findSafeSpawn(targetRoom.walls, Array.from(targetRoom.players.values()));
        const newPlayer: TankPlayer = {
          id: playerId,
          name: playerName,
          color: playerColor,
          isBot: false,
          isHost,
          x: spawn.x,
          y: spawn.y,
          vx: 0,
          vy: 0,
          bodyAngle: 0,
          turretAngle: 0,
          health: 100,
          maxHealth: 100,
          shield: 0,
          isAlive: true,
          score: 0,
          kills: 0,
          powerUp: null,
          powerUpExpiresAt: 0,
          lastFiredAt: 0,
          boostCooldown: 0,
        };

        targetRoom.players.set(playerId, newPlayer);

        clientSession = {
          ws,
          playerId,
          roomId: targetRoom.config.id,
          name: playerName,
          color: playerColor,
          input: { moveX: 0, moveY: 0, turretAngle: 0, firing: false, boost: false },
        };

        targetRoom.clients.set(playerId, clientSession);

        // Notify client
        ws.send(
          JSON.stringify({
            type: 'joined_room',
            roomId: targetRoom.config.id,
            playerId,
            isHost,
            roomConfig: targetRoom.config,
          })
        );

        // Auto-start match if 2 or more players join and still waiting
        if (targetRoom.status === 'waiting' && targetRoom.players.size >= 2) {
          startNewRound(targetRoom);
        }

        broadcastPublicRooms();
        return;
      }

      if (!clientSession) return;
      const room = activeRooms.get(clientSession.roomId);
      if (!room) return;

      if (msg.type === 'player_input') {
        clientSession.input.moveX = Math.max(-1, Math.min(1, msg.moveX));
        clientSession.input.moveY = Math.max(-1, Math.min(1, msg.moveY));
        clientSession.input.turretAngle = msg.turretAngle;
        clientSession.input.firing = !!msg.firing;
        clientSession.input.boost = !!msg.boost;
      } else if (msg.type === 'start_match') {
        const p = room.players.get(clientSession.playerId);
        if (p?.isHost) {
          startNewRound(room);
        }
      } else if (msg.type === 'add_bot') {
        const p = room.players.get(clientSession.playerId);
        if (p?.isHost && room.players.size < room.config.maxPlayers) {
          const botId = `bot_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`;
          const botName = BOT_NAMES[Math.floor(Math.random() * BOT_NAMES.length)];
          const availableColors = NEON_COLORS.filter(
            (c) => !Array.from(room.players.values()).some((pl) => pl.color === c)
          );
          const botColor = availableColors[0] || NEON_COLORS[Math.floor(Math.random() * NEON_COLORS.length)];

          const spawn = findSafeSpawn(room.walls, Array.from(room.players.values()));
          const botPlayer: TankPlayer = {
            id: botId,
            name: `[BOT] ${botName}`,
            color: botColor,
            isBot: true,
            isHost: false,
            x: spawn.x,
            y: spawn.y,
            vx: 0,
            vy: 0,
            bodyAngle: 0,
            turretAngle: 0,
            health: 100,
            maxHealth: 100,
            shield: 0,
            isAlive: true,
            score: 0,
            kills: 0,
            powerUp: null,
            powerUpExpiresAt: 0,
            lastFiredAt: 0,
            boostCooldown: 0,
          };
          room.players.set(botId, botPlayer);

          if (room.status === 'waiting' && room.players.size >= 2) {
            startNewRound(room);
          }
          broadcastPublicRooms();
        }
      } else if (msg.type === 'remove_bot') {
        const p = room.players.get(clientSession.playerId);
        if (p?.isHost) {
          for (const bot of room.players.values()) {
            if (bot.isBot && (!msg.botId || bot.id === msg.botId)) {
              room.players.delete(bot.id);
              break;
            }
          }
          broadcastPublicRooms();
        }
      } else if (msg.type === 'leave_room') {
        removePlayerFromRoom(clientSession.roomId, clientSession.playerId);
        clientSession = null;
      }
    } catch (err) {
      console.error('WS Error processing message:', err);
    }
  });

  ws.on('close', () => {
    if (clientSession) {
      removePlayerFromRoom(clientSession.roomId, clientSession.playerId);
    }
  });
});

function removePlayerFromRoom(roomId: string, playerId: string) {
  const room = activeRooms.get(roomId);
  if (!room) return;

  room.players.delete(playerId);
  room.clients.delete(playerId);

  if (room.clients.size === 0 && Array.from(room.players.values()).filter((p) => !p.isBot).length === 0) {
    // No human players left: destroy room
    if (room.loopInterval) clearInterval(room.loopInterval);
    activeRooms.delete(roomId);
  } else {
    // If host left, assign new host
    const remainingHumans = Array.from(room.players.values()).filter((p) => !p.isBot);
    if (remainingHumans.length > 0 && !remainingHumans.some((p) => p.isHost)) {
      remainingHumans[0].isHost = true;
    }
  }

  broadcastPublicRooms();
}

// REST Endpoints
app.get('/api/rooms', (_req, res) => {
  res.json(getPublicRoomsSummary());
});

app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', activeRooms: activeRooms.size });
});

// Setup Vite dev middleware or static serving
async function startServer() {
  const isDev = process.env.NODE_ENV !== 'production';

  if (isDev) {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.resolve('dist');
    app.use(express.static(distPath));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  server.listen(PORT, '0.0.0.0', () => {
    console.log(`Neon Tank Arena server running on port ${PORT}`);
  });
}

startServer();
