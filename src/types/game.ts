export type GameMode = 'SOLO' | 'TEAM' | 'POINT' | 'PARKOUR';

export type Team = 'blue' | 'red' | 'ffa';

export type WeaponType = 'rifle' | 'shotgun' | 'sniper' | 'knife';

export interface WeaponInfo {
  id: WeaponType;
  name: string;
  damage: number;
  fireRateMs: number;
  magSize: number;
  reloadTimeMs: number;
  range: number;
  spread: number;
  recoil: number;
  zoomFov?: number;
  pellets?: number;
  description: string;
}

export const WEAPONS: Record<WeaponType, WeaponInfo> = {
  rifle: {
    id: 'rifle',
    name: 'Voxel Rifle V-30',
    damage: 28,
    fireRateMs: 110,
    magSize: 30,
    reloadTimeMs: 1600,
    range: 120,
    spread: 0.02,
    recoil: 0.015,
    description: 'Rifle automático balanceado com alta cadência e precisão.'
  },
  shotgun: {
    id: 'shotgun',
    name: 'Heavy Pump 12G',
    damage: 16,
    pellets: 7,
    fireRateMs: 650,
    magSize: 8,
    reloadTimeMs: 2200,
    range: 45,
    spread: 0.08,
    recoil: 0.06,
    description: 'Espingarda devastadora a curta distância com dispersão de chumbo.'
  },
  sniper: {
    id: 'sniper',
    name: 'Apex Rail Sniper',
    damage: 95,
    fireRateMs: 900,
    magSize: 5,
    reloadTimeMs: 2400,
    range: 200,
    spread: 0.003,
    recoil: 0.08,
    zoomFov: 28,
    description: 'Rifle de precisão com mira telescópica e dano massivo.'
  },
  knife: {
    id: 'knife',
    name: 'Combat Blade',
    damage: 60,
    fireRateMs: 400,
    magSize: 1,
    reloadTimeMs: 0,
    range: 4,
    spread: 0,
    recoil: 0,
    description: 'Faca de combate tática rápida para eliminações furtivas.'
  }
};

export interface PlayerData {
  id: string;
  name: string;
  color: string;
  skinId: string;
  team: Team;
  isHost: boolean;
  isBot?: boolean;
  x: number;
  y: number;
  z: number;
  rotY: number;
  pitch: number;
  hp: number;
  maxHp: number;
  kills: number;
  deaths: number;
  score: number;
  ping: number;
  currentWeapon: WeaponType;
  ammo: number;
  isShooting?: boolean;
  isDashing?: boolean;
  isCrouching?: boolean;
  parkourTime?: number;
  parkourCheckpoint?: number;
  isAlive: boolean;
  respawnTime?: number;
}

export interface KillFeedItem {
  id: string;
  killerName: string;
  killerTeam: Team;
  victimName: string;
  victimTeam: Team;
  weapon: WeaponType;
  isHeadshot?: boolean;
  timestamp: number;
}

export interface ChatMessage {
  id: string;
  senderName: string;
  senderTeam: Team;
  text: string;
  timestamp: number;
  isSystem?: boolean;
}

export interface PointZoneState {
  x: number;
  y: number;
  z: number;
  radius: number;
  controllingTeam: Team | 'neutral';
  captureProgress: number; // -100 to 100
  blueScore: number;
  redScore: number;
}

export interface RoomState {
  code: string;
  name: string;
  hostId: string;
  mapId: 'castle' | 'desert' | 'neon' | 'parkour';
  mode: GameMode;
  status: 'WAITING' | 'PLAYING' | 'ENDED';
  maxPlayers: number;
  players: Record<string, PlayerData>;
  scoreLimit: number;
  timeLimitSec: number;
  remainingTimeSec: number;
  teamScores: {
    blue: number;
    red: number;
  };
  pointZone?: PointZoneState;
  killFeed: KillFeedItem[];
  botsEnabled: boolean;
  createdAt: number;
}

export interface ClientInputs {
  forward: boolean;
  backward: boolean;
  left: boolean;
  right: boolean;
  jump: boolean;
  crouch: boolean;
  dash: boolean;
  shooting: boolean;
  rotY: number;
  pitch: number;
}

export type ClientMessage =
  | { type: 'join_room'; code: string; playerName: string; skinId: string; color: string; preferredTeam?: Team }
  | { type: 'create_room'; playerName: string; skinId: string; color: string; mapId: 'castle' | 'desert' | 'neon' | 'parkour'; mode: GameMode; scoreLimit?: number; timeLimit?: number }
  | { type: 'start_game' }
  | { type: 'update_settings'; mapId?: 'castle' | 'desert' | 'neon' | 'parkour'; mode?: GameMode; botsEnabled?: boolean; scoreLimit?: number; timeLimit?: number }
  | { type: 'switch_team'; team: Team }
  | { type: 'player_move'; x: number; y: number; z: number; rotY: number; pitch: number; isDashing: boolean; isCrouching: boolean }
  | { type: 'player_shoot'; weapon: WeaponType; origin: [number, number, number]; direction: [number, number, number]; hitPlayerId?: string; isHeadshot?: boolean }
  | { type: 'player_switch_weapon'; weapon: WeaponType }
  | { type: 'player_reload' }
  | { type: 'send_chat'; text: string }
  | { type: 'ping'; time: number }
  | { type: 'parkour_checkpoint'; checkpoint: number; time: number }
  | { type: 'restart_game' };

export type ServerMessage =
  | { type: 'room_joined'; room: RoomState; yourId: string }
  | { type: 'room_update'; room: RoomState }
  | { type: 'player_joined'; player: PlayerData }
  | { type: 'player_left'; playerId: string }
  | { type: 'game_started'; room: RoomState }
  | { type: 'game_ended'; room: RoomState; winner: string | Team }
  | { type: 'player_damaged'; victimId: string; attackerId: string; damage: number; currentHp: number }
  | { type: 'player_killed'; killerId: string; victimId: string; weapon: WeaponType; isHeadshot?: boolean; respawnInSec: number }
  | { type: 'player_respawned'; player: PlayerData }
  | { type: 'bullet_fired'; shooterId: string; weapon: WeaponType; origin: [number, number, number]; target: [number, number, number] }
  | { type: 'chat_message'; message: ChatMessage }
  | { type: 'pong'; time: number }
  | { type: 'error'; message: string };
