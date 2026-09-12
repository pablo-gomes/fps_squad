import express from 'express';
import http from 'http';
import path from 'path';
import { WebSocketServer, WebSocket } from 'ws';
import { createServer as createViteServer } from 'vite';
import {
  GameMode,
  RoomState,
  PlayerData,
  ClientMessage,
  ServerMessage,
  Team,
  WeaponType,
  WEAPONS,
  KillFeedItem,
  ChatMessage,
  BotDifficulty,
} from './src/types/game.js';

const app = express();
const server = http.createServer(app);
const wss = new WebSocketServer({ server });

const PORT = 3000;

app.use(express.json());

// In-memory rooms
const rooms = new Map<string, RoomState>();
// Map ws connection to playerId and roomCode
const clientMeta = new Map<WebSocket, { playerId: string; roomCode: string }>();

function generateRoomCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = '';
  for (let i = 0; i < 6; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}

// REST Endpoints
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: Date.now() });
});

app.get('/api/rooms', (req, res) => {
  const activeRooms = Array.from(rooms.values()).map(r => ({
    code: r.code,
    name: r.name,
    mode: r.mode,
    mapId: r.mapId,
    status: r.status,
    playerCount: Object.keys(r.players).length,
    maxPlayers: r.maxPlayers,
    createdAt: r.createdAt,
  }));
  res.json({ rooms: activeRooms });
});

// Broadcast helper to all players in a room
function broadcastToRoom(code: string, message: ServerMessage, excludeWs?: WebSocket) {
  const payload = JSON.stringify(message);
  wss.clients.forEach(client => {
    if (client.readyState === WebSocket.OPEN && client !== excludeWs) {
      const meta = clientMeta.get(client);
      if (meta && meta.roomCode === code) {
        client.send(payload);
      }
    }
  });
}

// Bot Names for AI players
const BOT_NAMES = [
  'VoxelStriker',
  'BlockReaper',
  'CyberNinja',
  'NeonSniper',
  'PixelAce',
  'ShadowBlock',
  'GhostCube',
  'TitanPixel',
  'VortexBot',
  'NovaStriker',
];

function addBotToRoom(room: RoomState, team: Team) {
  const botId = 'bot_' + Math.random().toString(36).substring(2, 8);
  const existingNames = new Set(Object.values(room.players).map(p => p.name));
  const availableNames = BOT_NAMES.filter(n => !existingNames.has(n + ' [BOT]'));
  const baseName =
    availableNames.length > 0
      ? availableNames[Math.floor(Math.random() * availableNames.length)]
      : 'Bot_' + Math.floor(Math.random() * 899 + 100);
  const botName = baseName + ' [BOT]';

  const colors = ['#ef4444', '#3b82f6', '#10b981', '#f59e0b', '#8b5cf6', '#06b6d4', '#ec4899'];
  const botColor = team === 'blue' ? '#3b82f6' : team === 'red' ? '#ef4444' : colors[Math.floor(Math.random() * colors.length)];

  // Choose weapon appropriate for difficulty
  let weapon: WeaponType = 'rifle';
  const r = Math.random();
  if (room.botDifficulty === 'hard') {
    weapon = r < 0.35 ? 'sniper' : r < 0.75 ? 'rifle' : 'shotgun';
  } else if (room.botDifficulty === 'medium') {
    weapon = r < 0.65 ? 'rifle' : 'shotgun';
  } else {
    weapon = r < 0.8 ? 'rifle' : 'shotgun';
  }

  const bot: PlayerData = {
    id: botId,
    name: botName,
    color: botColor,
    skinId: 'default',
    team: team,
    isHost: false,
    isBot: true,
    x: (Math.random() - 0.5) * 22,
    y: 1.5,
    z: (Math.random() - 0.5) * 22,
    rotY: Math.random() * Math.PI * 2,
    pitch: 0,
    hp: 100,
    maxHp: 100,
    kills: 0,
    deaths: 0,
    score: 0,
    ping: 5,
    currentWeapon: weapon,
    ammo: WEAPONS[weapon].magSize,
    isAlive: true,
  };

  room.players[botId] = bot;
  return bot;
}

// WebSocket Connection handling
wss.on('connection', (ws: WebSocket) => {
  ws.on('message', (rawData: string) => {
    try {
      const msg: ClientMessage = JSON.parse(rawData.toString());

      // 1. Create Room
      if (msg.type === 'create_room') {
        const code = generateRoomCode();
        const playerId = 'p_' + Math.random().toString(36).substring(2, 9);

        const newPlayer: PlayerData = {
          id: playerId,
          name: msg.playerName || 'Jogador ' + code.slice(-3),
          color: msg.color || '#3b82f6',
          skinId: msg.skinId || 'default',
          team: msg.mode === 'TEAM' ? 'blue' : 'ffa',
          isHost: true,
          isBot: false,
          x: 0,
          y: 1.5,
          z: 0,
          rotY: 0,
          pitch: 0,
          hp: 100,
          maxHp: 100,
          kills: 0,
          deaths: 0,
          score: 0,
          ping: 15,
          currentWeapon: 'rifle',
          ammo: 30,
          isAlive: true,
        };

        const botsEnabled = msg.botsEnabled !== undefined ? msg.botsEnabled : true;
        const botCount = msg.botCount !== undefined ? Math.max(1, Math.min(10, msg.botCount)) : 4;
        const botDifficulty: BotDifficulty = msg.botDifficulty || 'medium';

        const room: RoomState = {
          code,
          name: `Sala ${code}`,
          hostId: playerId,
          mapId: msg.mapId || 'castle',
          mode: msg.mode || 'SOLO',
          status: msg.startImmediately ? 'PLAYING' : 'WAITING',
          maxPlayers: 12,
          players: { [playerId]: newPlayer },
          scoreLimit: msg.scoreLimit || 25,
          timeLimitSec: msg.timeLimit || 300,
          remainingTimeSec: msg.timeLimit || 300,
          teamScores: { blue: 0, red: 0 },
          pointZone: {
            x: 0,
            y: 3,
            z: 0,
            radius: 5,
            controllingTeam: 'neutral',
            captureProgress: 0,
            blueScore: 0,
            redScore: 0,
          },
          killFeed: [],
          botsEnabled,
          botCount,
          botDifficulty,
          createdAt: Date.now(),
        };

        // If startImmediately is requested (e.g. direct Solo with Bots), spawn bots now
        if (msg.startImmediately && botsEnabled) {
          for (let i = 0; i < botCount; i++) {
            const team = room.mode === 'TEAM' ? (i % 2 === 0 ? 'red' : 'blue') : 'ffa';
            addBotToRoom(room, team);
          }
        }

        rooms.set(code, room);
        clientMeta.set(ws, { playerId, roomCode: code });

        ws.send(JSON.stringify({ type: 'room_joined', room, yourId: playerId }));
        if (msg.startImmediately) {
          ws.send(JSON.stringify({ type: 'game_started', room }));
        }
        return;
      }

      // 2. Join Room
      if (msg.type === 'join_room') {
        const code = msg.code.trim().toUpperCase();
        const room = rooms.get(code);

        if (!room) {
          ws.send(JSON.stringify({ type: 'error', message: `Sala com código "${code}" não encontrada.` }));
          return;
        }

        if (Object.keys(room.players).length >= room.maxPlayers) {
          ws.send(JSON.stringify({ type: 'error', message: 'A sala está cheia!' }));
          return;
        }

        const playerId = 'p_' + Math.random().toString(36).substring(2, 9);
        let assignedTeam: Team = 'ffa';
        if (room.mode === 'TEAM') {
          // Balance teams
          const blueCount = Object.values(room.players).filter(p => p.team === 'blue').length;
          const redCount = Object.values(room.players).filter(p => p.team === 'red').length;
          assignedTeam = msg.preferredTeam || (blueCount <= redCount ? 'blue' : 'red');
        }

        const newPlayer: PlayerData = {
          id: playerId,
          name: msg.playerName || 'Jogador ' + code.slice(-3),
          color: msg.color || (assignedTeam === 'blue' ? '#3b82f6' : assignedTeam === 'red' ? '#ef4444' : '#10b981'),
          skinId: msg.skinId || 'default',
          team: assignedTeam,
          isHost: false,
          isBot: false,
          x: (Math.random() - 0.5) * 10,
          y: 1.5,
          z: (Math.random() - 0.5) * 10,
          rotY: 0,
          pitch: 0,
          hp: 100,
          maxHp: 100,
          kills: 0,
          deaths: 0,
          score: 0,
          ping: 20,
          currentWeapon: 'rifle',
          ammo: 30,
          isAlive: true,
        };

        room.players[playerId] = newPlayer;
        clientMeta.set(ws, { playerId, roomCode: code });

        ws.send(JSON.stringify({ type: 'room_joined', room, yourId: playerId }));
        broadcastToRoom(code, { type: 'player_joined', player: newPlayer }, ws);

        const chatNotice: ChatMessage = {
          id: Math.random().toString(36),
          senderName: 'SISTEMA',
          senderTeam: 'ffa',
          text: `${newPlayer.name} entrou na partida!`,
          timestamp: Date.now(),
          isSystem: true,
        };
        broadcastToRoom(code, { type: 'chat_message', message: chatNotice });
        return;
      }

      const meta = clientMeta.get(ws);
      if (!meta) return;

      const room = rooms.get(meta.roomCode);
      if (!room) return;

      const player = room.players[meta.playerId];

      // 3. Ping / Pong
      if (msg.type === 'ping') {
        ws.send(JSON.stringify({ type: 'pong', time: msg.time }));
        if (player) {
          player.ping = Math.max(5, Math.round(Date.now() - msg.time));
        }
        return;
      }

      // 4. Update Settings (Host only)
      if (msg.type === 'update_settings') {
        if (room.hostId === meta.playerId) {
          if (msg.mapId) room.mapId = msg.mapId;
          if (msg.mode) {
            room.mode = msg.mode;
            // Update player teams
            if (msg.mode === 'TEAM') {
              let idx = 0;
              Object.values(room.players).forEach(p => {
                p.team = idx % 2 === 0 ? 'blue' : 'red';
                idx++;
              });
            } else {
              Object.values(room.players).forEach(p => {
                p.team = 'ffa';
              });
            }
          }
          if (msg.botsEnabled !== undefined) room.botsEnabled = msg.botsEnabled;
          if (msg.botCount !== undefined) {
            room.botCount = Math.max(1, Math.min(10, msg.botCount));
          }
          if (msg.botDifficulty !== undefined) {
            room.botDifficulty = msg.botDifficulty;
          }
          if (msg.scoreLimit) room.scoreLimit = msg.scoreLimit;
          if (msg.timeLimit) {
            room.timeLimitSec = msg.timeLimit;
            room.remainingTimeSec = msg.timeLimit;
          }
          broadcastToRoom(room.code, { type: 'room_update', room });
        }
        return;
      }

      // 4b. Add Bot (Host only)
      if (msg.type === 'add_bot' && room.hostId === meta.playerId) {
        const currentCount = Object.keys(room.players).length;
        if (currentCount < room.maxPlayers) {
          let team: Team = 'ffa';
          if (room.mode === 'TEAM') {
            const blueCount = Object.values(room.players).filter(p => p.team === 'blue').length;
            const redCount = Object.values(room.players).filter(p => p.team === 'red').length;
            team = msg.team || (blueCount <= redCount ? 'blue' : 'red');
          }
          addBotToRoom(room, team);
          room.botsEnabled = true;
          room.botCount = Object.values(room.players).filter(p => p.isBot).length;
          broadcastToRoom(room.code, { type: 'room_update', room });
        }
        return;
      }

      // 4c. Remove Bot (Host only)
      if (msg.type === 'remove_bot' && room.hostId === meta.playerId) {
        const botList = Object.values(room.players).filter(p => p.isBot);
        if (botList.length > 0) {
          const target = msg.botId ? room.players[msg.botId] : botList[botList.length - 1];
          if (target && target.isBot) {
            delete room.players[target.id];
            room.botCount = Object.values(room.players).filter(p => p.isBot).length;
            if (room.botCount === 0) room.botsEnabled = false;
            broadcastToRoom(room.code, { type: 'room_update', room });
          }
        }
        return;
      }

      // 5. Switch Team
      if (msg.type === 'switch_team' && room.mode === 'TEAM' && player) {
        player.team = msg.team;
        player.color = msg.team === 'blue' ? '#3b82f6' : '#ef4444';
        broadcastToRoom(room.code, { type: 'room_update', room });
        return;
      }

      // 6. Start Game
      if (msg.type === 'start_game') {
        if (room.hostId === meta.playerId) {
          room.status = 'PLAYING';
          room.remainingTimeSec = room.timeLimitSec;
          room.killFeed = [];
          room.teamScores = { blue: 0, red: 0 };

          // Reset all players
          Object.values(room.players).forEach(p => {
            p.hp = 100;
            p.kills = 0;
            p.deaths = 0;
            p.score = 0;
            p.isAlive = true;
            p.ammo = WEAPONS[p.currentWeapon].magSize;
            p.parkourTime = 0;
            p.parkourCheckpoint = 0;
          });

          // If bots enabled, ensure room has requested bot count
          if (room.botsEnabled) {
            // Remove existing bots to re-spawn cleanly
            Object.keys(room.players).forEach(pid => {
              if (room.players[pid].isBot) delete room.players[pid];
            });

            const humanCount = Object.values(room.players).filter(p => !p.isBot).length;
            const slotsAvailable = Math.max(0, room.maxPlayers - humanCount);
            const targetBots = Math.min(slotsAvailable, room.botCount || 4);

            for (let i = 0; i < targetBots; i++) {
              let team: Team = 'ffa';
              if (room.mode === 'TEAM') {
                const blueCount = Object.values(room.players).filter(p => p.team === 'blue').length;
                const redCount = Object.values(room.players).filter(p => p.team === 'red').length;
                team = blueCount <= redCount ? 'blue' : 'red';
              }
              addBotToRoom(room, team);
            }
          }

          broadcastToRoom(room.code, { type: 'game_started', room });
        }
        return;
      }

      // 7. Restart Game
      if (msg.type === 'restart_game') {
        if (room.hostId === meta.playerId) {
          room.status = 'PLAYING';
          room.remainingTimeSec = room.timeLimitSec;
          room.teamScores = { blue: 0, red: 0 };
          room.killFeed = [];

          // If bots enabled, ensure bots are present
          if (room.botsEnabled) {
            Object.keys(room.players).forEach(pid => {
              if (room.players[pid].isBot) delete room.players[pid];
            });
            const humanCount = Object.values(room.players).filter(p => !p.isBot).length;
            const slotsAvailable = Math.max(0, room.maxPlayers - humanCount);
            const targetBots = Math.min(slotsAvailable, room.botCount || 4);

            for (let i = 0; i < targetBots; i++) {
              let team: Team = 'ffa';
              if (room.mode === 'TEAM') {
                const blueCount = Object.values(room.players).filter(p => p.team === 'blue').length;
                const redCount = Object.values(room.players).filter(p => p.team === 'red').length;
                team = blueCount <= redCount ? 'blue' : 'red';
              }
              addBotToRoom(room, team);
            }
          }

          Object.values(room.players).forEach(p => {
            p.hp = 100;
            p.kills = 0;
            p.deaths = 0;
            p.score = 0;
            p.isAlive = true;
            p.ammo = WEAPONS[p.currentWeapon].magSize;
            p.parkourTime = 0;
            p.parkourCheckpoint = 0;
            p.x = (Math.random() - 0.5) * 20;
            p.y = 1.5;
            p.z = (Math.random() - 0.5) * 20;
          });
          broadcastToRoom(room.code, { type: 'game_started', room });
        }
        return;
      }

      // 8. Player Movement
      if (msg.type === 'player_move' && player && player.isAlive) {
        player.x = msg.x;
        player.y = msg.y;
        player.z = msg.z;
        player.rotY = msg.rotY;
        player.pitch = msg.pitch;
        player.isDashing = msg.isDashing;
        player.isCrouching = msg.isCrouching;
        return;
      }

      // 9. Switch Weapon
      if (msg.type === 'player_switch_weapon' && player) {
        player.currentWeapon = msg.weapon;
        player.ammo = WEAPONS[msg.weapon].magSize;
        broadcastToRoom(room.code, { type: 'room_update', room }, ws);
        return;
      }

      // 10. Reload
      if (msg.type === 'player_reload' && player) {
        player.ammo = WEAPONS[player.currentWeapon].magSize;
        return;
      }

      // 11. Player Shoot & Damage Verification
      if (msg.type === 'player_shoot' && player && player.isAlive && room.status === 'PLAYING') {
        const weaponStats = WEAPONS[msg.weapon];
        if (player.ammo > 0) {
          player.ammo--;
        }

        // Broadcast bullet fired to show visual tracers and sound to other players
        broadcastToRoom(
          room.code,
          {
            type: 'bullet_fired',
            shooterId: player.id,
            weapon: msg.weapon,
            origin: msg.origin,
            target: [
              msg.origin[0] + msg.direction[0] * 50,
              msg.origin[1] + msg.direction[1] * 50,
              msg.origin[2] + msg.direction[2] * 50,
            ],
          },
          ws
        );

        // If target was hit
        if (msg.hitPlayerId) {
          const victim = room.players[msg.hitPlayerId];
          // Check friendly fire in team mode
          const friendlyFire = room.mode === 'TEAM' && victim && victim.team === player.team;

          if (victim && victim.isAlive && !friendlyFire) {
            let dmg = weaponStats.damage;
            if (msg.isHeadshot) {
              dmg = Math.round(dmg * 1.8);
            }
            victim.hp = Math.max(0, victim.hp - dmg);

            broadcastToRoom(room.code, {
              type: 'player_damaged',
              victimId: victim.id,
              attackerId: player.id,
              damage: dmg,
              currentHp: victim.hp,
            });

            // Victim eliminated!
            if (victim.hp <= 0) {
              victim.isAlive = false;
              victim.deaths++;
              player.kills++;
              const scoreBonus = msg.isHeadshot ? 150 : 100;
              player.score += scoreBonus;

              if (room.mode === 'TEAM') {
                if (player.team === 'blue') room.teamScores.blue++;
                if (player.team === 'red') room.teamScores.red++;
              }

              // Add to kill feed
              const feedItem: KillFeedItem = {
                id: Math.random().toString(36),
                killerName: player.name,
                killerTeam: player.team,
                victimName: victim.name,
                victimTeam: victim.team,
                weapon: msg.weapon,
                isHeadshot: !!msg.isHeadshot,
                timestamp: Date.now(),
              };
              room.killFeed.unshift(feedItem);
              if (room.killFeed.length > 8) room.killFeed.pop();

              broadcastToRoom(room.code, {
                type: 'player_killed',
                killerId: player.id,
                victimId: victim.id,
                weapon: msg.weapon,
                isHeadshot: !!msg.isHeadshot,
                respawnInSec: 3,
              });

              // Check victory condition
              checkGameEnd(room);

              // Auto-respawn after 3 seconds
              setTimeout(() => {
                if (room.status === 'PLAYING' && room.players[victim.id]) {
                  victim.isAlive = true;
                  victim.hp = 100;
                  victim.ammo = WEAPONS[victim.currentWeapon].magSize;
                  victim.x = (Math.random() - 0.5) * 20;
                  victim.y = 2;
                  victim.z = (Math.random() - 0.5) * 20;
                  broadcastToRoom(room.code, { type: 'player_respawned', player: victim });
                }
              }, 3000);
            }
          }
        }
        return;
      }

      // 12. Parkour Checkpoint & Finish
      if (msg.type === 'parkour_checkpoint' && player && room.mode === 'PARKOUR') {
        player.parkourCheckpoint = msg.checkpoint;
        player.parkourTime = msg.time;
        // Checkpoint 3 is Goal in Sky Parkour
        if (msg.checkpoint >= 3) {
          player.score += 500;
          room.status = 'ENDED';
          broadcastToRoom(room.code, {
            type: 'game_ended',
            room,
            winner: player.name,
          });
        }
        return;
      }

      // 13. Chat
      if (msg.type === 'send_chat' && player && msg.text.trim()) {
        const chatItem: ChatMessage = {
          id: Math.random().toString(36),
          senderName: player.name,
          senderTeam: player.team,
          text: msg.text.trim().substring(0, 100),
          timestamp: Date.now(),
        };
        broadcastToRoom(room.code, { type: 'chat_message', message: chatItem });
        return;
      }
    } catch (err) {
      console.error('WS Error:', err);
    }
  });

  ws.on('close', () => {
    const meta = clientMeta.get(ws);
    if (meta) {
      const room = rooms.get(meta.roomCode);
      if (room) {
        delete room.players[meta.playerId];
        broadcastToRoom(meta.roomCode, { type: 'player_left', playerId: meta.playerId });

        // If host left, assign new host or delete empty room
        const remainingPlayerIds = Object.keys(room.players).filter(id => !room.players[id].isBot);
        if (remainingPlayerIds.length === 0) {
          rooms.delete(meta.roomCode);
        } else if (room.hostId === meta.playerId) {
          room.hostId = remainingPlayerIds[0];
          room.players[room.hostId].isHost = true;
          broadcastToRoom(meta.roomCode, { type: 'room_update', room });
        }
      }
      clientMeta.delete(ws);
    }
  });
});

function checkGameEnd(room: RoomState) {
  if (room.status !== 'PLAYING') return;

  if (room.mode === 'SOLO') {
    const topPlayer = Object.values(room.players).sort((a, b) => b.kills - a.kills)[0];
    if (topPlayer && topPlayer.kills >= room.scoreLimit) {
      room.status = 'ENDED';
      broadcastToRoom(room.code, { type: 'game_ended', room, winner: topPlayer.name });
    }
  } else if (room.mode === 'TEAM') {
    if (room.teamScores.blue >= room.scoreLimit) {
      room.status = 'ENDED';
      broadcastToRoom(room.code, { type: 'game_ended', room, winner: 'blue' });
    } else if (room.teamScores.red >= room.scoreLimit) {
      room.status = 'ENDED';
      broadcastToRoom(room.code, { type: 'game_ended', room, winner: 'red' });
    }
  }
}

// Server Tick Loop (20 FPS state broadcast & game logic update)
setInterval(() => {
  rooms.forEach(room => {
    if (room.status !== 'PLAYING') return;

    // 1. Match Timer Countdown (every 1 second approx)
    room.remainingTimeSec -= 0.05;
    if (room.remainingTimeSec <= 0) {
      room.status = 'ENDED';
      let winner = 'Empate';
      if (room.mode === 'TEAM') {
        winner = room.teamScores.blue > room.teamScores.red ? 'blue' : room.teamScores.red > room.teamScores.blue ? 'red' : 'Empate';
      } else {
        const top = Object.values(room.players).sort((a, b) => b.score - a.score)[0];
        if (top) winner = top.name;
      }
      broadcastToRoom(room.code, { type: 'game_ended', room, winner });
      return;
    }

    // 2. King of the Hill / Point capture mode logic
    if (room.mode === 'POINT' && room.pointZone) {
      const pz = room.pointZone;
      let blueInZone = 0;
      let redInZone = 0;

      Object.values(room.players).forEach(p => {
        if (!p.isAlive) return;
        const dist = Math.sqrt((p.x - pz.x) ** 2 + (p.z - pz.z) ** 2);
        if (dist <= pz.radius && Math.abs(p.y - pz.y) < 4) {
          if (p.team === 'blue') blueInZone++;
          if (p.team === 'red') redInZone++;
        }
      });

      if (blueInZone > redInZone) {
        pz.captureProgress = Math.min(100, pz.captureProgress + 1.5);
        if (pz.captureProgress >= 100) {
          pz.controllingTeam = 'blue';
          pz.blueScore += 0.08;
          room.teamScores.blue = Math.floor(pz.blueScore);
        }
      } else if (redInZone > blueInZone) {
        pz.captureProgress = Math.max(-100, pz.captureProgress - 1.5);
        if (pz.captureProgress <= -100) {
          pz.controllingTeam = 'red';
          pz.redScore += 0.08;
          room.teamScores.red = Math.floor(pz.redScore);
        }
      }

      if (pz.blueScore >= room.scoreLimit) {
        room.status = 'ENDED';
        broadcastToRoom(room.code, { type: 'game_ended', room, winner: 'blue' });
      } else if (pz.redScore >= room.scoreLimit) {
        room.status = 'ENDED';
        broadcastToRoom(room.code, { type: 'game_ended', room, winner: 'red' });
      }
    }

    // 3. AI Bots update
    const playersList = Object.values(room.players);
    const difficulty = room.botDifficulty || 'medium';

    const diffParams = {
      easy: {
        detectRange: 24,
        moveSpeed: 0.16,
        shootChance: 0.06,
        hitChanceNear: 0.35,
        hitChanceFar: 0.18,
        headshotChance: 0.05,
      },
      medium: {
        detectRange: 35,
        moveSpeed: 0.23,
        shootChance: 0.13,
        hitChanceNear: 0.55,
        hitChanceFar: 0.35,
        headshotChance: 0.15,
      },
      hard: {
        detectRange: 50,
        moveSpeed: 0.30,
        shootChance: 0.22,
        hitChanceNear: 0.75,
        hitChanceFar: 0.55,
        headshotChance: 0.30,
      },
    }[difficulty];

    playersList.forEach(bot => {
      if (!bot.isBot || !bot.isAlive) return;

      // Find nearest living opponent
      let nearestOpponent: PlayerData | null = null;
      let minDist = diffParams.detectRange;

      playersList.forEach(other => {
        if (other.id === bot.id || !other.isAlive) return;
        if (room.mode === 'TEAM' && other.team === bot.team) return;
        const dist = Math.sqrt((other.x - bot.x) ** 2 + (other.z - bot.z) ** 2);
        if (dist < minDist) {
          minDist = dist;
          nearestOpponent = other;
        }
      });

      // Target position: either opponent or capture point (in POINT mode)
      let targetX = bot.x;
      let targetZ = bot.z;
      let hasTarget = false;

      if (nearestOpponent) {
        const opp = nearestOpponent as PlayerData;
        targetX = opp.x;
        targetZ = opp.z;
        hasTarget = true;
      } else if (room.mode === 'POINT' && room.pointZone) {
        // Move towards point zone if no nearby enemy
        const pz = room.pointZone;
        const distToPz = Math.sqrt((pz.x - bot.x) ** 2 + (pz.z - bot.z) ** 2);
        if (distToPz > 3) {
          targetX = pz.x + (Math.random() - 0.5) * 3;
          targetZ = pz.z + (Math.random() - 0.5) * 3;
          hasTarget = true;
        }
      }

      if (hasTarget) {
        const dx = targetX - bot.x;
        const dz = targetZ - bot.z;
        bot.rotY = Math.atan2(dx, dz);

        const distToTarget = Math.sqrt(dx * dx + dz * dz);
        const moveSpeed = diffParams.moveSpeed;

        if (distToTarget > (nearestOpponent ? 7 : 2)) {
          bot.x += Math.sin(bot.rotY) * moveSpeed;
          bot.z += Math.cos(bot.rotY) * moveSpeed;
        } else if (nearestOpponent) {
          // Dynamic strafing around opponent
          const strafeFactor = difficulty === 'hard' ? 0.22 : 0.14;
          const strafeDirection = Math.sin(Date.now() / 350);
          bot.x += Math.cos(bot.rotY) * (strafeDirection * strafeFactor);
          bot.z -= Math.sin(bot.rotY) * (strafeDirection * strafeFactor);
        }
      }

      // Shooting at living opponent
      if (nearestOpponent) {
        const opp = nearestOpponent as PlayerData;
        if (minDist < diffParams.detectRange && Math.random() < diffParams.shootChance) {
          const hitChance = minDist < 12 ? diffParams.hitChanceNear : diffParams.hitChanceFar;
          const isHit = Math.random() < hitChance;
          const isHeadshot = isHit && Math.random() < diffParams.headshotChance;
          const hitId = isHit ? opp.id : undefined;

          broadcastToRoom(room.code, {
            type: 'bullet_fired',
            shooterId: bot.id,
            weapon: bot.currentWeapon,
            origin: [bot.x, bot.y + 1.2, bot.z],
            target: [opp.x, opp.y + 1.2, opp.z],
          });

          if (hitId && opp.isAlive) {
            let dmg = WEAPONS[bot.currentWeapon].damage;
            if (isHeadshot) dmg = Math.round(dmg * 1.8);

            opp.hp = Math.max(0, opp.hp - dmg);
            broadcastToRoom(room.code, {
              type: 'player_damaged',
              victimId: opp.id,
              attackerId: bot.id,
              damage: dmg,
              currentHp: opp.hp,
            });

            if (opp.hp <= 0) {
              opp.isAlive = false;
              opp.deaths++;
              bot.kills++;
              bot.score += isHeadshot ? 150 : 100;

              if (room.mode === 'TEAM') {
                if (bot.team === 'blue') room.teamScores.blue++;
                if (bot.team === 'red') room.teamScores.red++;
              }

              room.killFeed.unshift({
                id: Math.random().toString(36),
                killerName: bot.name,
                killerTeam: bot.team,
                victimName: opp.name,
                victimTeam: opp.team,
                weapon: bot.currentWeapon,
                isHeadshot,
                timestamp: Date.now(),
              });
              if (room.killFeed.length > 8) room.killFeed.pop();

              broadcastToRoom(room.code, {
                type: 'player_killed',
                killerId: bot.id,
                victimId: opp.id,
                weapon: bot.currentWeapon,
                isHeadshot,
                respawnInSec: 3,
              });

              checkGameEnd(room);

              setTimeout(() => {
                if (room.status === 'PLAYING' && room.players[opp.id]) {
                  opp.isAlive = true;
                  opp.hp = 100;
                  opp.x = (Math.random() - 0.5) * 20;
                  opp.y = 2;
                  opp.z = (Math.random() - 0.5) * 20;
                  broadcastToRoom(room.code, { type: 'player_respawned', player: opp });
                }
              }, 3000);
            }
          }
        }
      }
    });

    // Broadcast room update to synchronize positions, scores and timer
    broadcastToRoom(room.code, { type: 'room_update', room });
  });
}, 50); // 20 updates per second

// Vite & Static middleware setup
async function start() {
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  server.listen(PORT, '0.0.0.0', () => {
    console.log(`Voxel Strike FPS Server running on port ${PORT}`);
  });
}

start();
