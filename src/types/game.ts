/**
 * Core type definitions for Neon Tank Arena
 */

export type PowerUpType = 'SHIELD' | 'TRIPLE_SHOT' | 'MEGA_CANNON' | 'TURBO_SPEED';

export interface TankPlayer {
  id: string;
  name: string;
  color: string; // Neon hex code
  isBot: boolean;
  isHost: boolean;
  x: number;
  y: number;
  vx: number;
  vy: number;
  bodyAngle: number; // Tank chassis rotation in radians
  turretAngle: number; // Turret rotation in radians
  health: number;
  maxHealth: number;
  shield: number;
  isAlive: boolean;
  score: number; // Rounds won in match
  kills: number;
  powerUp: PowerUpType | null;
  powerUpExpiresAt: number; // Timestamp
  lastFiredAt: number;
  boostCooldown: number;
}

export interface Projectile {
  id: string;
  ownerId: string;
  ownerColor: string;
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number;
  damage: number;
  bouncesRemaining: number;
  isMega: boolean;
  createdAt: number;
}

export interface PowerUpItem {
  id: string;
  type: PowerUpType;
  x: number;
  y: number;
  radius: number;
  spawnedAt: number;
}

export interface WallObstacle {
  id: string;
  x: number;
  y: number;
  width: number;
  height: number;
  isDestructible: boolean;
  health?: number;
  maxHealth?: number;
}

export interface KillFeedItem {
  id: string;
  killerName: string;
  killerColor: string;
  victimName: string;
  victimColor: string;
  timestamp: number;
}

export type MapType = 'classic' | 'courtyard' | 'maze';

export interface RoomConfig {
  id: string;
  name: string;
  mapType: MapType;
  maxPlayers: number;
  roundsToWin: number;
  isPublic: boolean;
}

export interface RoomSummary {
  id: string;
  name: string;
  mapType: MapType;
  playerCount: number;
  maxPlayers: number;
  roundsToWin: number;
  status: 'waiting' | 'in_game' | 'round_end' | 'match_over';
  hasBots: boolean;
}

export type GameStatus = 'waiting' | 'in_game' | 'round_end' | 'match_over';

export interface GameSnapshot {
  status: GameStatus;
  currentRound: number;
  roundsToWin: number;
  players: TankPlayer[];
  projectiles: Projectile[];
  powerUps: PowerUpItem[];
  walls: WallObstacle[];
  roundWinnerId?: string;
  matchWinnerId?: string;
  roundCountdown?: number; // Seconds until next round
  killFeed: KillFeedItem[];
}

// Client to Server Messages
export type ClientMessage =
  | { type: 'join_room'; roomId?: string; name: string; color: string; isPublic?: boolean }
  | { type: 'create_room'; config: Partial<RoomConfig>; name: string; color: string }
  | { type: 'leave_room' }
  | { type: 'player_input'; seq: number; moveX: number; moveY: number; turretAngle: number; firing: boolean; boost: boolean }
  | { type: 'start_match' }
  | { type: 'add_bot' }
  | { type: 'remove_bot'; botId?: string }
  | { type: 'ping'; clientTime: number };

// Server to Client Messages
export type ServerMessage =
  | { type: 'joined_room'; roomId: string; playerId: string; isHost: boolean; roomConfig: RoomConfig }
  | { type: 'room_list'; rooms: RoomSummary[] }
  | { type: 'state_snapshot'; snapshot: GameSnapshot; serverTime: number }
  | { type: 'game_event'; event: 'fire' | 'ricochet' | 'hit' | 'explosion' | 'powerup_collected' | 'round_win' | 'match_win'; data: any }
  | { type: 'pong'; clientTime: number; serverTime: number }
  | { type: 'error'; message: string };

// Game arena constants
export const ARENA_WIDTH = 1400;
export const ARENA_HEIGHT = 900;
export const TANK_RADIUS = 22;
export const BASE_SPEED = 240; // Pixels per second
export const BULLET_SPEED = 620;
export const BULLET_RADIUS = 5;
export const DEFAULT_RELOAD_TIME = 380; // ms between standard shots
export const TRIPLE_RELOAD_TIME = 450;
export const MEGA_RELOAD_TIME = 550;
export const POWERUP_DURATION = 12000; // ms
export const POWERUP_SPAWN_INTERVAL = 10000; // ms
