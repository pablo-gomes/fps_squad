import React, { useState, useEffect } from 'react';
import { GameMode, BotDifficulty } from '../types/game';
import { Users, Plus, KeyRound, Wifi, RefreshCw, Sparkles, Shield, Trophy, Bot, Play, Flame, Zap } from 'lucide-react';

interface ActiveRoomSummary {
  code: string;
  name: string;
  mode: GameMode;
  mapId: string;
  status: string;
  playerCount: number;
  maxPlayers: number;
}

interface RoomSelectModalProps {
  initialCode?: string;
  onCreateRoom: (params: {
    playerName: string;
    skinColor: string;
    mode: GameMode;
    mapId: 'castle' | 'desert' | 'neon' | 'parkour';
    botsEnabled?: boolean;
    botCount?: number;
    botDifficulty?: BotDifficulty;
    startImmediately?: boolean;
  }) => void;
  onJoinRoom: (code: string, playerName: string, skinColor: string) => void;
  error?: string;
}

export const RoomSelectModal: React.FC<RoomSelectModalProps> = ({
  initialCode = '',
  onCreateRoom,
  onJoinRoom,
  error,
}) => {
  const [activeTab, setActiveTab] = useState<'bots' | 'join' | 'create' | 'browse'>(
    initialCode ? 'join' : 'bots'
  );
  const [playerName, setPlayerName] = useState(
    () => localStorage.getItem('voxel_strike_nick') || `Player_${Math.floor(Math.random() * 899 + 100)}`
  );
  const [skinColor, setSkinColor] = useState(() => localStorage.getItem('voxel_strike_color') || '#3b82f6');
  const [roomCodeInput, setRoomCodeInput] = useState(initialCode);
  const [selectedMode, setSelectedMode] = useState<GameMode>('SOLO');
  const [selectedMap, setSelectedMap] = useState<'castle' | 'desert' | 'neon' | 'parkour'>('castle');
  const [botCount, setBotCount] = useState<number>(4);
  const [botDifficulty, setBotDifficulty] = useState<BotDifficulty>('medium');
  const [createWithBots, setCreateWithBots] = useState(true);
  const [activeRooms, setActiveRooms] = useState<ActiveRoomSummary[]>([]);
  const [loadingRooms, setLoadingRooms] = useState(false);

  // Save nickname & color
  useEffect(() => {
    localStorage.setItem('voxel_strike_nick', playerName);
    localStorage.setItem('voxel_strike_color', skinColor);
  }, [playerName, skinColor]);

  // Fetch active rooms on local server / wifi
  const fetchRooms = async () => {
    setLoadingRooms(true);
    try {
      const res = await fetch('/api/rooms');
      if (res.ok) {
        const data = await res.json();
        setActiveRooms(data.rooms || []);
      }
    } catch {
      // ignore
    } finally {
      setLoadingRooms(false);
    }
  };

  useEffect(() => {
    fetchRooms();
    const timer = setInterval(fetchRooms, 4000);
    return () => clearInterval(timer);
  }, []);

  const handleJoinSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!roomCodeInput.trim()) return;
    onJoinRoom(roomCodeInput.trim().toUpperCase(), playerName.trim() || 'Jogador', skinColor);
  };

  const handleCreateSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onCreateRoom({
      playerName: playerName.trim() || 'Jogador',
      skinColor,
      mode: selectedMode,
      mapId: selectedMap,
      botsEnabled: createWithBots,
      botCount,
      botDifficulty,
      startImmediately: false,
    });
  };

  const handlePlayWithBotsInstant = (e: React.FormEvent) => {
    e.preventDefault();
    onCreateRoom({
      playerName: playerName.trim() || 'Jogador',
      skinColor,
      mode: selectedMode,
      mapId: selectedMap,
      botsEnabled: true,
      botCount,
      botDifficulty,
      startImmediately: true,
    });
  };

  const colors = [
    { label: 'Azul', hex: '#3b82f6' },
    { label: 'Vermelho', hex: '#ef4444' },
    { label: 'Esmeralda', hex: '#10b981' },
    { label: 'Âmbar', hex: '#f59e0b' },
    { label: 'Roxo', hex: '#8b5cf6' },
    { label: 'Ciano', hex: '#06b6d4' },
    { label: 'Rosa', hex: '#ec4899' },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-neutral-950/90 backdrop-blur-md p-4 overflow-y-auto">
      <div className="w-full max-w-xl bg-neutral-900 border border-neutral-800 rounded-2xl shadow-2xl overflow-hidden flex flex-col my-auto">
        {/* Header */}
        <div className="bg-neutral-950 px-6 py-5 border-b border-neutral-800 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-amber-500 text-neutral-950 font-black font-display flex items-center justify-center text-sm shadow">
              VS
            </div>
            <div>
              <h2 className="text-lg font-black font-display uppercase tracking-wide text-neutral-100">
                Voxel Strike 3D
              </h2>
              <p className="text-xs text-neutral-400">FPS Multiplayer Online, Mesma Rede Wi-Fi & Modo Bots</p>
            </div>
          </div>
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded bg-emerald-950/60 border border-emerald-500/30 text-emerald-400 text-[11px] font-semibold">
            <Wifi className="w-3.5 h-3.5" />
            <span>Online</span>
          </div>
        </div>

        {/* Error notice if any */}
        {error && (
          <div className="mx-6 mt-4 p-3 rounded-xl bg-red-950/80 border border-red-500/60 text-red-200 text-xs font-semibold">
            {error}
          </div>
        )}

        {/* Player Profile Setup (Nickname & Color) */}
        <div className="p-5 border-b border-neutral-800/80 bg-neutral-950/40">
          <div className="flex flex-col sm:flex-row items-center gap-4">
            <div className="w-full sm:flex-1">
              <label className="text-[11px] font-bold uppercase tracking-wider text-neutral-400 block mb-1">
                Seu Nickname
              </label>
              <input
                type="text"
                value={playerName}
                onChange={e => setPlayerName(e.target.value.substring(0, 16))}
                placeholder="Nome no jogo..."
                className="w-full bg-neutral-950 border border-neutral-700 focus:border-amber-500 rounded-xl px-3.5 py-2 text-sm text-neutral-100 font-bold focus:outline-none"
              />
            </div>

            {/* Skin Color Picker */}
            <div className="w-full sm:w-auto">
              <label className="text-[11px] font-bold uppercase tracking-wider text-neutral-400 block mb-1">
                Cor do Voxel
              </label>
              <div className="flex items-center gap-1.5">
                {colors.map(c => (
                  <button
                    key={c.hex}
                    type="button"
                    onClick={() => setSkinColor(c.hex)}
                    style={{ backgroundColor: c.hex }}
                    title={c.label}
                    className={`w-6 h-6 rounded-full transition-transform ${
                      skinColor === c.hex ? 'ring-2 ring-white scale-110' : 'opacity-70 hover:opacity-100'
                    }`}
                  />
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="flex border-b border-neutral-800 bg-neutral-950/70 overflow-x-auto">
          <button
            onClick={() => setActiveTab('bots')}
            className={`flex-1 min-w-[120px] py-3 text-xs font-bold uppercase tracking-wider flex items-center justify-center gap-1.5 border-b-2 transition-colors ${
              activeTab === 'bots'
                ? 'border-cyan-500 text-cyan-400 bg-cyan-950/20'
                : 'border-transparent text-neutral-400 hover:text-neutral-200'
            }`}
          >
            <Bot className="w-4 h-4 text-cyan-400" />
            <span>Jogar com Bots</span>
          </button>

          <button
            onClick={() => setActiveTab('join')}
            className={`flex-1 min-w-[120px] py-3 text-xs font-bold uppercase tracking-wider flex items-center justify-center gap-1.5 border-b-2 transition-colors ${
              activeTab === 'join'
                ? 'border-amber-500 text-amber-400 bg-neutral-900/50'
                : 'border-transparent text-neutral-400 hover:text-neutral-200'
            }`}
          >
            <KeyRound className="w-4 h-4" />
            <span>Código da Sala</span>
          </button>

          <button
            onClick={() => setActiveTab('create')}
            className={`flex-1 min-w-[100px] py-3 text-xs font-bold uppercase tracking-wider flex items-center justify-center gap-1.5 border-b-2 transition-colors ${
              activeTab === 'create'
                ? 'border-amber-500 text-amber-400 bg-neutral-900/50'
                : 'border-transparent text-neutral-400 hover:text-neutral-200'
            }`}
          >
            <Plus className="w-4 h-4" />
            <span>Criar Sala</span>
          </button>

          <button
            onClick={() => {
              setActiveTab('browse');
              fetchRooms();
            }}
            className={`flex-1 min-w-[120px] py-3 text-xs font-bold uppercase tracking-wider flex items-center justify-center gap-1.5 border-b-2 transition-colors ${
              activeTab === 'browse'
                ? 'border-amber-500 text-amber-400 bg-neutral-900/50'
                : 'border-transparent text-neutral-400 hover:text-neutral-200'
            }`}
          >
            <Wifi className="w-4 h-4" />
            <span>Salas ({activeRooms.length})</span>
          </button>
        </div>

        {/* Content Tabs */}
        <div className="p-6">
          {/* TAB 0: Jogar com Bots (SOLO / TREINO RÁPIDO) */}
          {activeTab === 'bots' && (
            <form onSubmit={handlePlayWithBotsInstant} className="space-y-4">
              <div className="p-3 bg-cyan-950/30 border border-cyan-500/30 rounded-xl flex items-center gap-3">
                <div className="p-2 bg-cyan-500/20 rounded-lg text-cyan-400">
                  <Bot className="w-5 h-5" />
                </div>
                <div>
                  <div className="text-xs font-bold uppercase text-cyan-300">Modo Solo contra Bots</div>
                  <p className="text-[11px] text-neutral-400">
                    Jogue instantaneamente com bots inteligentes com movimentação, combate e mira adaptativa.
                  </p>
                </div>
              </div>

              {/* Modo de Jogo */}
              <div>
                <label className="text-xs font-bold uppercase tracking-wider text-neutral-400 block mb-1.5">
                  Modo de Jogo
                </label>
                <div className="grid grid-cols-2 gap-2">
                  {[
                    { id: 'SOLO', label: 'Solo (Todos vs Todos)' },
                    { id: 'TEAM', label: 'Equipes (Você + Bots)' },
                    { id: 'POINT', label: 'Ponto de Captura' },
                    { id: 'PARKOUR', label: 'Sky Parkour' },
                  ].map(m => (
                    <button
                      key={m.id}
                      type="button"
                      onClick={() => setSelectedMode(m.id as GameMode)}
                      className={`p-2.5 rounded-xl border text-xs font-bold uppercase text-left transition-all ${
                        selectedMode === m.id
                          ? 'bg-cyan-500/15 border-cyan-500 text-cyan-300 shadow'
                          : 'bg-neutral-950 border-neutral-800 text-neutral-400 hover:border-neutral-700'
                      }`}
                    >
                      {m.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Dificuldade dos Bots & Quantidade */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold uppercase tracking-wider text-neutral-400 block mb-1.5">
                    Dificuldade dos Bots
                  </label>
                  <div className="grid grid-cols-3 gap-1.5">
                    {(
                      [
                        { id: 'easy', label: 'Fácil', color: 'emerald' },
                        { id: 'medium', label: 'Médio', color: 'amber' },
                        { id: 'hard', label: 'Difícil', color: 'red' },
                      ] as const
                    ).map(d => (
                      <button
                        key={d.id}
                        type="button"
                        onClick={() => setBotDifficulty(d.id)}
                        className={`py-2 px-1 rounded-xl border text-center text-xs font-bold uppercase transition-all ${
                          botDifficulty === d.id
                            ? 'bg-cyan-500/20 border-cyan-400 text-cyan-300'
                            : 'bg-neutral-950 border-neutral-800 text-neutral-400 hover:border-neutral-700'
                        }`}
                      >
                        {d.label}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="text-xs font-bold uppercase tracking-wider text-neutral-400 block mb-1.5">
                    Quantidade de Bots: <span className="text-cyan-400 font-mono">{botCount} Bots</span>
                  </label>
                  <div className="flex gap-1.5">
                    {[2, 4, 6, 8].map(count => (
                      <button
                        key={count}
                        type="button"
                        onClick={() => setBotCount(count)}
                        className={`flex-1 py-2 rounded-xl border text-xs font-bold font-mono transition-all ${
                          botCount === count
                            ? 'bg-cyan-500/20 border-cyan-400 text-cyan-300'
                            : 'bg-neutral-950 border-neutral-800 text-neutral-400 hover:border-neutral-700'
                        }`}
                      >
                        {count}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Mapa Inicial */}
              <div>
                <label className="text-xs font-bold uppercase tracking-wider text-neutral-400 block mb-1.5">
                  Mapa da Arena
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {[
                    { id: 'castle', label: 'Castle' },
                    { id: 'desert', label: 'Desert' },
                    { id: 'neon', label: 'Neon' },
                    { id: 'parkour', label: 'Parkour' },
                  ].map(mp => (
                    <button
                      key={mp.id}
                      type="button"
                      onClick={() => setSelectedMap(mp.id as 'castle' | 'desert' | 'neon' | 'parkour')}
                      className={`p-2 rounded-xl border text-xs font-bold uppercase text-center transition-all ${
                        selectedMap === mp.id
                          ? 'bg-cyan-500/15 border-cyan-500 text-cyan-300'
                          : 'bg-neutral-950 border-neutral-800 text-neutral-400 hover:border-neutral-700'
                      }`}
                    >
                      {mp.label}
                    </button>
                  ))}
                </div>
              </div>

              <button
                type="submit"
                className="w-full py-3.5 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-neutral-950 font-black font-display uppercase tracking-wider text-sm flex items-center justify-center gap-2 shadow-xl shadow-cyan-500/20 transition-all mt-3"
              >
                <Play className="w-4 h-4 fill-neutral-950" />
                Iniciar Partida com Bots
              </button>
            </form>
          )}

          {/* TAB 1: Join with Room Code */}
          {activeTab === 'join' && (
            <form onSubmit={handleJoinSubmit} className="space-y-4">
              <div>
                <label className="text-xs font-bold uppercase tracking-wider text-neutral-400 block mb-1.5">
                  Código da Sala de Amigos
                </label>
                <div className="relative">
                  <input
                    type="text"
                    value={roomCodeInput}
                    onChange={e => setRoomCodeInput(e.target.value.toUpperCase())}
                    placeholder="Ex: XK89R2"
                    maxLength={10}
                    autoFocus
                    className="w-full bg-neutral-950 border border-neutral-700 focus:border-amber-500 rounded-xl px-4 py-3 text-lg font-mono font-bold text-amber-400 tracking-widest uppercase focus:outline-none shadow-inner"
                  />
                  {navigator.clipboard && (
                    <button
                      type="button"
                      onClick={async () => {
                        try {
                          const text = await navigator.clipboard.readText();
                          if (text) setRoomCodeInput(text.trim().toUpperCase());
                        } catch {
                          // ignore
                        }
                      }}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 px-2.5 py-1 bg-neutral-800 hover:bg-neutral-700 text-neutral-300 text-xs rounded-lg uppercase font-semibold"
                    >
                      Colar
                    </button>
                  )}
                </div>
                <p className="text-xs text-neutral-500 mt-2">
                  Peça o código para o seu amigo que criou a partida na mesma rede Wi-Fi ou pela internet.
                </p>
              </div>

              <button
                type="submit"
                disabled={!roomCodeInput.trim()}
                className="w-full py-3.5 rounded-xl bg-amber-500 hover:bg-amber-400 disabled:opacity-50 text-neutral-950 font-black font-display uppercase tracking-wider text-sm shadow-xl shadow-amber-500/20 transition-all"
              >
                Entrar na Sala
              </button>
            </form>
          )}

          {/* TAB 2: Create Room */}
          {activeTab === 'create' && (
            <form onSubmit={handleCreateSubmit} className="space-y-4">
              <div>
                <label className="text-xs font-bold uppercase tracking-wider text-neutral-400 block mb-1.5">
                  Modo de Jogo
                </label>
                <div className="grid grid-cols-2 gap-2">
                  {[
                    { id: 'SOLO', label: 'Solo (FFA)' },
                    { id: 'TEAM', label: 'Equipes (Azul vs Vermelho)' },
                    { id: 'POINT', label: 'Ponto de Captura' },
                    { id: 'PARKOUR', label: 'Sky Parkour' },
                  ].map(m => (
                    <button
                      key={m.id}
                      type="button"
                      onClick={() => setSelectedMode(m.id as GameMode)}
                      className={`p-2.5 rounded-xl border text-xs font-bold uppercase text-left transition-all ${
                        selectedMode === m.id
                          ? 'bg-amber-500/15 border-amber-500 text-amber-400'
                          : 'bg-neutral-950 border-neutral-800 text-neutral-400 hover:border-neutral-700'
                      }`}
                    >
                      {m.label}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="text-xs font-bold uppercase tracking-wider text-neutral-400 block mb-1.5">
                  Mapa Inicial
                </label>
                <div className="grid grid-cols-2 gap-2">
                  {[
                    { id: 'castle', label: 'Castle Blocks' },
                    { id: 'desert', label: 'Desert Dust' },
                    { id: 'neon', label: 'Neon Cyber' },
                    { id: 'parkour', label: 'Sky Parkour' },
                  ].map(mp => (
                    <button
                      key={mp.id}
                      type="button"
                      onClick={() => setSelectedMap(mp.id as 'castle' | 'desert' | 'neon' | 'parkour')}
                      className={`p-2.5 rounded-xl border text-xs font-bold uppercase text-left transition-all ${
                        selectedMap === mp.id
                          ? 'bg-amber-500/15 border-amber-500 text-amber-400'
                          : 'bg-neutral-950 border-neutral-800 text-neutral-400 hover:border-neutral-700'
                      }`}
                    >
                      {mp.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Bot fill option for created room */}
              <div className="p-3 bg-neutral-950 rounded-xl border border-neutral-800 space-y-2.5">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-neutral-300 flex items-center gap-1.5">
                    <Bot className="w-3.5 h-3.5 text-cyan-400" /> Preencher com Bots
                  </span>
                  <input
                    type="checkbox"
                    checked={createWithBots}
                    onChange={e => setCreateWithBots(e.target.checked)}
                    className="w-4 h-4 accent-amber-500 rounded cursor-pointer"
                  />
                </div>

                {createWithBots && (
                  <div className="flex items-center gap-3 pt-2 border-t border-neutral-800/80 text-xs">
                    <span className="text-neutral-400">Qtd Bots:</span>
                    <div className="flex gap-1">
                      {[2, 4, 6].map(c => (
                        <button
                          key={c}
                          type="button"
                          onClick={() => setBotCount(c)}
                          className={`px-2 py-0.5 rounded text-xs font-mono ${
                            botCount === c
                              ? 'bg-amber-500 text-neutral-950 font-bold'
                              : 'bg-neutral-800 text-neutral-400'
                          }`}
                        >
                          {c}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              <button
                type="submit"
                className="w-full py-3.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-neutral-950 font-black font-display uppercase tracking-wider text-sm shadow-xl shadow-amber-500/20 transition-all mt-2"
              >
                Criar Sala & Gerar Código
              </button>
            </form>
          )}

          {/* TAB 3: Browse Active Rooms */}
          {activeTab === 'browse' && (
            <div className="space-y-3">
              <div className="flex items-center justify-between text-xs text-neutral-400 mb-1">
                <span>Salas abertas na sua rede ou servidor:</span>
                <button
                  onClick={fetchRooms}
                  disabled={loadingRooms}
                  className="flex items-center gap-1 text-amber-400 hover:underline"
                >
                  <RefreshCw className={`w-3 h-3 ${loadingRooms ? 'animate-spin' : ''}`} /> Atualizar
                </button>
              </div>

              <div className="max-h-60 overflow-y-auto space-y-2 pr-1">
                {activeRooms.length === 0 ? (
                  <div className="text-center py-8 bg-neutral-950/60 rounded-xl border border-neutral-800/80">
                    <Wifi className="w-8 h-8 text-neutral-600 mx-auto mb-2" />
                    <p className="text-xs text-neutral-400 font-semibold">Nenhuma sala pública encontrada no momento.</p>
                    <p className="text-[11px] text-neutral-500 mt-1">Crie a primeira sala ou jogue com bots!</p>
                  </div>
                ) : (
                  activeRooms.map(r => (
                    <div
                      key={r.code}
                      className="p-3 bg-neutral-950 rounded-xl border border-neutral-800 hover:border-amber-500/60 flex items-center justify-between transition-all"
                    >
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-mono font-bold text-amber-400 text-sm">{r.code}</span>
                          <span className="text-xs font-bold text-neutral-200 uppercase">{r.mode}</span>
                        </div>
                        <p className="text-[11px] text-neutral-500 capitalize">
                          Mapa: {r.mapId} • {r.status === 'PLAYING' ? 'Em Partida' : 'No Lobby'}
                        </p>
                      </div>

                      <div className="flex items-center gap-3">
                        <span className="text-xs font-mono text-neutral-400">
                          {r.playerCount} / {r.maxPlayers}
                        </span>
                        <button
                          onClick={() => onJoinRoom(r.code, playerName, skinColor)}
                          className="px-3 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-400 text-neutral-950 font-bold text-xs uppercase transition-colors"
                        >
                          Entrar
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

