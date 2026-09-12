import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  RoomState,
  GameMode,
  Team,
  WeaponType,
  ClientMessage,
  ServerMessage,
  ChatMessage,
} from './types/game';
import { GameCanvas } from './game/GameCanvas';
import { HUD } from './components/HUD';
import { ScoreboardModal } from './components/ScoreboardModal';
import { PodiumModal } from './components/PodiumModal';
import { LobbyView } from './components/LobbyView';
import { RoomSelectModal } from './components/RoomSelectModal';
import { SettingsModal, GameSettings } from './components/SettingsModal';
import { sound } from './services/sound';

export default function App() {
  // WebSocket connection
  const wsRef = useRef<WebSocket | null>(null);
  const [connected, setConnected] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string>('');

  // Game & Room state
  const [room, setRoom] = useState<RoomState | null>(null);
  const [currentUserId, setCurrentUserId] = useState<string>('');
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);

  // Modals & UI states
  const [scoreboardOpen, setScoreboardOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [isAimingDownSights, setIsAimingDownSights] = useState(false);
  const [hitmarkerActive, setHitmarkerActive] = useState(false);
  const [damageFlash, setDamageFlash] = useState(false);
  const [dashCooldownPct, setDashCooldownPct] = useState(0);
  const [isReloading, setIsReloading] = useState(false);
  const [gameWinner, setGameWinner] = useState<string | Team>('');

  // Settings
  const [settings, setSettings] = useState<GameSettings>(() => ({
    mouseSensitivity: parseFloat(localStorage.getItem('vs_sens') || '1.0'),
    invertY: localStorage.getItem('vs_invert_y') === 'true',
    fov: parseInt(localStorage.getItem('vs_fov') || '85'),
    volume: parseFloat(localStorage.getItem('vs_vol') || '0.7'),
    muted: false,
  }));

  // Touch triggers for mobile
  const [isMobile, setIsMobile] = useState(false);
  const touchFireRef = useRef(false);
  const touchJumpRef = useRef(false);
  const touchDashRef = useRef(false);

  // Check initial URL room param
  const [initialRoomCode, setInitialRoomCode] = useState<string>('');

  useEffect(() => {
    // Detect mobile touch
    const checkMobile = () => {
      setIsMobile(
        window.matchMedia('(pointer: coarse)').matches ||
        /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent)
      );
    };
    checkMobile();
    window.addEventListener('resize', checkMobile);

    // Check URL search params for ?room=XXXXXX
    const params = new URLSearchParams(window.location.search);
    const roomFromUrl = params.get('room');
    if (roomFromUrl) {
      setInitialRoomCode(roomFromUrl.toUpperCase());
    }

    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // Connect WebSocket
  const connectWs = useCallback(() => {
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const host = window.location.host;
    const ws = new WebSocket(`${protocol}//${host}`);
    wsRef.current = ws;

    ws.onopen = () => {
      setConnected(true);
      setErrorMsg('');
    };

    ws.onmessage = (evt) => {
      try {
        const msg: ServerMessage = JSON.parse(evt.data);

        if (msg.type === 'room_joined') {
          setRoom(msg.room);
          setCurrentUserId(msg.yourId);
          setChatMessages([]);
          // Update URL without reloading
          const newUrl = `${window.location.pathname}?room=${msg.room.code}`;
          window.history.replaceState(null, '', newUrl);
        } else if (msg.type === 'room_update') {
          setRoom(msg.room);
        } else if (msg.type === 'game_started') {
          setRoom(msg.room);
          setScoreboardOpen(false);
          setGameWinner('');
        } else if (msg.type === 'game_ended') {
          setRoom(msg.room);
          setGameWinner(msg.winner);
        } else if (msg.type === 'player_damaged') {
          if (msg.victimId === currentUserId) {
            setDamageFlash(true);
            sound.playHurt();
            setTimeout(() => setDamageFlash(false), 250);
          }
        } else if (msg.type === 'player_killed') {
          if (msg.killerId === currentUserId) {
            sound.playKill(msg.isHeadshot);
          }
        } else if (msg.type === 'chat_message') {
          setChatMessages((prev) => [...prev.slice(-30), msg.message]);
        } else if (msg.type === 'error') {
          setErrorMsg(msg.message);
        }
      } catch (err) {
        console.error('Error parsing WS message:', err);
      }
    };

    ws.onclose = () => {
      setConnected(false);
      // Auto-reconnect after 2 seconds
      setTimeout(connectWs, 2000);
    };

    ws.onerror = () => {
      setConnected(false);
    };
  }, [currentUserId]);

  useEffect(() => {
    connectWs();
    return () => {
      wsRef.current?.close();
    };
  }, [connectWs]);

  // Ping timer every 2 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN && room) {
        wsRef.current.send(JSON.stringify({ type: 'ping', time: Date.now() }));
      }
    }, 2000);
    return () => clearInterval(interval);
  }, [room]);

  // Send message helper
  const sendMessage = useCallback((msg: ClientMessage) => {
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify(msg));
    }
  }, []);

  // Update game settings
  const handleUpdateSettings = (newSettings: Partial<GameSettings>) => {
    setSettings((prev) => {
      const updated = { ...prev, ...newSettings };
      if (newSettings.mouseSensitivity !== undefined) {
        localStorage.setItem('vs_sens', newSettings.mouseSensitivity.toString());
      }
      if (newSettings.invertY !== undefined) {
        localStorage.setItem('vs_invert_y', newSettings.invertY.toString());
      }
      if (newSettings.fov !== undefined) {
        localStorage.setItem('vs_fov', newSettings.fov.toString());
      }
      if (newSettings.volume !== undefined) {
        localStorage.setItem('vs_vol', newSettings.volume.toString());
      }
      return updated;
    });
  };

  // Hitmarker trigger
  const handleTriggerHitmarker = useCallback(() => {
    setHitmarkerActive(true);
    setTimeout(() => setHitmarkerActive(false), 120);
  }, []);

  // Room Actions
  const handleCreateRoom = ({
    playerName,
    skinColor,
    mode,
    mapId,
  }: {
    playerName: string;
    skinColor: string;
    mode: GameMode;
    mapId: 'castle' | 'desert' | 'neon' | 'parkour';
  }) => {
    sendMessage({
      type: 'create_room',
      playerName,
      skinId: 'default',
      color: skinColor,
      mapId,
      mode,
    });
  };

  const handleJoinRoom = (code: string, playerName: string, skinColor: string) => {
    sendMessage({
      type: 'join_room',
      code,
      playerName,
      skinId: 'default',
      color: skinColor,
    });
  };

  const handleStartGame = () => {
    sendMessage({ type: 'start_game' });
  };

  const handleRestartGame = () => {
    sendMessage({ type: 'restart_game' });
  };

  const handleSwitchTeam = (team: Team) => {
    sendMessage({ type: 'switch_team', team });
  };

  const handleUpdateRoomSettings = (settingsData: {
    mapId?: 'castle' | 'desert' | 'neon' | 'parkour';
    mode?: GameMode;
    botsEnabled?: boolean;
    scoreLimit?: number;
    timeLimit?: number;
  }) => {
    sendMessage({
      type: 'update_settings',
      ...settingsData,
    });
  };

  const handleLeaveRoom = () => {
    setRoom(null);
    setCurrentUserId('');
    window.history.replaceState(null, '', window.location.pathname);
  };

  const handleSendChat = (text: string) => {
    sendMessage({ type: 'send_chat', text });
  };

  const myPlayer = room?.players[currentUserId];

  return (
    <div className="relative w-screen h-screen bg-neutral-950 text-neutral-100 overflow-hidden font-sans select-none">
      {/* 1. If not in a room, show Room Selection Modal */}
      {!room && (
        <RoomSelectModal
          initialCode={initialRoomCode}
          onCreateRoom={handleCreateRoom}
          onJoinRoom={handleJoinRoom}
          error={errorMsg}
        />
      )}

      {/* 2. If in room and in WAITING status, show Lobby */}
      {room && room.status === 'WAITING' && (
        <LobbyView
          room={room}
          currentUserId={currentUserId}
          onStartGame={handleStartGame}
          onUpdateSettings={handleUpdateRoomSettings}
          onSwitchTeam={handleSwitchTeam}
          onLeaveRoom={handleLeaveRoom}
          onOpenSettings={() => setSettingsOpen(true)}
        />
      )}

      {/* 3. If in room and PLAYING, render 3D Game Canvas & HUD */}
      {room && (room.status === 'PLAYING' || room.status === 'ENDED') && (
        <>
          <GameCanvas
            room={room}
            currentUserId={currentUserId}
            settings={settings}
            onSendMessage={sendMessage}
            onOpenScoreboard={() => setScoreboardOpen((prev) => !prev)}
            onTriggerHitmarker={handleTriggerHitmarker}
            onTriggerDamageFlash={() => setDamageFlash(true)}
            onDashCooldownChange={setDashCooldownPct}
            onReloadStatusChange={setIsReloading}
            isAimingDownSights={isAimingDownSights}
            setIsAimingDownSights={setIsAimingDownSights}
            isMobile={isMobile}
            touchFireRef={touchFireRef}
            touchJumpRef={touchJumpRef}
            touchDashRef={touchDashRef}
          />

          {myPlayer && (
            <HUD
              player={myPlayer}
              room={room}
              dashCooldownPct={dashCooldownPct}
              isReloading={isReloading}
              hitmarkerActive={hitmarkerActive}
              damageVignette={damageFlash}
              isAimingDownSights={isAimingDownSights}
              onSwitchWeapon={(w) => sendMessage({ type: 'player_switch_weapon', weapon: w })}
              onReload={() => sendMessage({ type: 'player_reload' })}
              onOpenScoreboard={() => setScoreboardOpen(true)}
              onSendChat={handleSendChat}
              chatMessages={chatMessages}
              isMobile={isMobile}
              onTouchFireStart={() => {
                touchFireRef.current = true;
              }}
              onTouchFireEnd={() => {
                touchFireRef.current = false;
              }}
              onTouchJump={() => {
                touchJumpRef.current = true;
              }}
              onTouchDash={() => {
                touchDashRef.current = true;
              }}
              onTouchADS={() => setIsAimingDownSights((prev) => !prev)}
            />
          )}

          {/* Real-time Interactive Scoreboard (TAB) */}
          <ScoreboardModal
            room={room}
            currentUserId={currentUserId}
            isOpen={scoreboardOpen}
            onClose={() => setScoreboardOpen(false)}
            isGameOver={room.status === 'ENDED'}
          />

          {/* Match End Podium Screen */}
          {room.status === 'ENDED' && (
            <PodiumModal
              room={room}
              currentUserId={currentUserId}
              winner={gameWinner}
              onRestart={handleRestartGame}
              onReturnToLobby={() => {
                sendMessage({
                  type: 'update_settings',
                });
                setRoom((prev) => (prev ? { ...prev, status: 'WAITING' } : null));
              }}
            />
          )}
        </>
      )}

      {/* Settings Modal */}
      <SettingsModal
        isOpen={settingsOpen}
        onClose={() => setSettingsOpen(false)}
        settings={settings}
        onUpdateSettings={handleUpdateSettings}
      />
    </div>
  );
}
