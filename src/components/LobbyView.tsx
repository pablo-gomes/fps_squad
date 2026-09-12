import React, { useState } from 'react';
import { RoomState, GameMode, Team, PlayerData, BotDifficulty } from '../types/game';
import {
  Users,
  Copy,
  Check,
  Play,
  Settings,
  Share2,
  Crown,
  Bot,
  Shield,
  Zap,
  MapPin,
  Flame,
  Wifi,
  Sparkles,
  Award,
  UserPlus,
  Trash2,
  Plus,
  Minus,
} from 'lucide-react';

interface LobbyViewProps {
  room: RoomState;
  currentUserId: string;
  onStartGame: () => void;
  onUpdateSettings: (settings: {
    mapId?: 'castle' | 'desert' | 'neon' | 'parkour';
    mode?: GameMode;
    botsEnabled?: boolean;
    botCount?: number;
    botDifficulty?: BotDifficulty;
    scoreLimit?: number;
    timeLimit?: number;
  }) => void;
  onAddBot?: (team?: Team) => void;
  onRemoveBot?: (botId?: string) => void;
  onSwitchTeam: (team: Team) => void;
  onLeaveRoom: () => void;
  onOpenSettings: () => void;
}

export const LobbyView: React.FC<LobbyViewProps> = ({
  room,
  currentUserId,
  onStartGame,
  onUpdateSettings,
  onAddBot,
  onRemoveBot,
  onSwitchTeam,
  onLeaveRoom,
  onOpenSettings,
}) => {
  const [copiedCode, setCopiedCode] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);

  const me = room.players[currentUserId];
  const isHost = me?.isHost;
  const playersList = Object.values(room.players) as PlayerData[];

  const handleCopyCode = () => {
    navigator.clipboard.writeText(room.code);
    setCopiedCode(true);
    setTimeout(() => setCopiedCode(false), 2000);
  };

  const handleCopyLink = () => {
    const url = `${window.location.origin}${window.location.pathname}?room=${room.code}`;
    navigator.clipboard.writeText(url);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2000);
  };

  const maps = [
    { id: 'castle', name: 'Castle Blocks', desc: 'Castelo medieval com muralhas, torres de sniper e jump pads' },
    { id: 'desert', name: 'Desert Dust', desc: 'Cânion de arenito com pontes elevadas e combate dinâmico' },
    { id: 'neon', name: 'Neon Cyber', desc: 'Arena futurista com plataformas flutuantes e elevadores' },
    { id: 'parkour', name: 'Sky Parkour', desc: 'Corrida nas nuvens com plataformas desafiadoras e checkpoints' },
  ] as const;

  const modes: { id: GameMode; name: string; desc: string }[] = [
    { id: 'SOLO', name: 'Solo (Todos vs Todos)', desc: 'Partida livre onde cada abate conta. O maior pontuador vence.' },
    { id: 'TEAM', name: 'Mata-Mata em Equipes', desc: 'Equipe Azul vs Vermelha. Vença em cooperação com seus amigos!' },
    { id: 'POINT', name: 'Ponto de Captura', desc: 'Controle a zona central da arena para acumular pontos contínuos.' },
    { id: 'PARKOUR', name: 'Modo Parkour', desc: 'Desafie seus reflexos! Alcance a bandeira final no menor tempo.' },
  ];

  return (
    <div className="relative min-h-screen w-full bg-neutral-950 text-neutral-100 flex flex-col items-center justify-between p-4 md:p-8 overflow-y-auto">
      {/* Background ambient lighting */}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,_var(--tw-gradient-stops))] from-amber-500/10 via-neutral-950 to-neutral-950 pointer-events-none" />

      {/* Top Bar */}
      <header className="w-full max-w-5xl flex items-center justify-between z-10 py-2 border-b border-neutral-800/80">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-amber-500 text-neutral-950 flex items-center justify-center font-black font-display text-lg shadow-lg shadow-amber-500/20">
            VS
          </div>
          <div>
            <h1 className="text-xl font-black uppercase font-display tracking-wider text-neutral-100">
              Voxel Strike 3D
            </h1>
            <p className="text-xs text-neutral-400">FPS Multiplayer Online & Mesma Rede Wi-Fi</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={onOpenSettings}
            className="p-2.5 rounded-xl bg-neutral-900 hover:bg-neutral-800 border border-neutral-800 text-neutral-300 transition-colors"
            title="Configurações"
          >
            <Settings className="w-4 h-4" />
          </button>
          <button
            onClick={onLeaveRoom}
            className="py-2 px-3.5 rounded-xl bg-neutral-900 hover:bg-red-950/40 hover:border-red-500/50 border border-neutral-800 text-xs font-semibold text-neutral-300 hover:text-red-400 transition-colors"
          >
            Sair da Sala
          </button>
        </div>
      </header>

      {/* Room Code & Wi-Fi Share Banner */}
      <section className="w-full max-w-5xl my-6 z-10 bg-neutral-900/90 border border-neutral-800 rounded-2xl p-4 md:p-6 shadow-2xl backdrop-blur-md">
        <div className="flex flex-col md:flex-row items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-amber-400 mb-1">
              <Wifi className="w-4 h-4 text-emerald-400" />
              <span>Jogar com Amigos (Online & Mesma Rede Wi-Fi)</span>
            </div>
            <p className="text-sm text-neutral-300">
              Convide amigos para entrar digitando o <strong className="text-amber-400">código da sala</strong> ou enviando o link direto!
            </p>
          </div>

          {/* Room Code Box */}
          <div className="flex items-center gap-2 bg-neutral-950 border border-amber-500/40 p-2 rounded-xl shadow-inner">
            <span className="text-xs uppercase font-semibold text-neutral-400 ml-2">Código:</span>
            <span className="font-mono font-black text-2xl md:text-3xl text-amber-400 tracking-widest px-2">
              {room.code}
            </span>
            <button
              onClick={handleCopyCode}
              className="p-2 rounded-lg bg-neutral-800 hover:bg-neutral-700 text-neutral-200 transition-colors"
              title="Copiar Código"
            >
              {copiedCode ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
            </button>
            <button
              onClick={handleCopyLink}
              className="py-2 px-3 rounded-lg bg-amber-500 hover:bg-amber-400 text-neutral-950 font-bold text-xs uppercase flex items-center gap-1.5 transition-colors shadow"
              title="Copiar Link de Convite"
            >
              {copiedLink ? <Check className="w-4 h-4" /> : <Share2 className="w-4 h-4" />}
              <span>{copiedLink ? 'Copiado!' : 'Link'}</span>
            </button>
          </div>
        </div>
      </section>

      {/* Main Grid: Players & Settings */}
      <div className="w-full max-w-5xl grid grid-cols-1 lg:grid-cols-3 gap-6 z-10 flex-1">
        {/* Left Column: Players in Room */}
        <div className="lg:col-span-1 bg-neutral-900/80 border border-neutral-800 rounded-2xl p-5 flex flex-col shadow-xl">
          <div className="flex items-center justify-between pb-3 border-b border-neutral-800 mb-4">
            <div className="flex items-center gap-2 font-display font-bold uppercase text-neutral-200">
              <Users className="w-4 h-4 text-amber-400" />
              <span>Jogadores na Sala</span>
            </div>
            <span className="text-xs font-mono font-bold bg-neutral-800 px-2 py-0.5 rounded text-neutral-300">
              {playersList.length} / {room.maxPlayers}
            </span>
          </div>

          {/* Team Switcher if Team Mode */}
          {room.mode === 'TEAM' && me && (
            <div className="mb-4 p-2 bg-neutral-950 rounded-xl border border-neutral-800 flex gap-2">
              <button
                onClick={() => onSwitchTeam('blue')}
                className={`flex-1 py-1.5 rounded-lg text-xs font-bold uppercase transition-all ${
                  me.team === 'blue'
                    ? 'bg-blue-600 text-white shadow-md'
                    : 'bg-neutral-800 text-neutral-400 hover:text-neutral-200'
                }`}
              >
                Equipe Azul
              </button>
              <button
                onClick={() => onSwitchTeam('red')}
                className={`flex-1 py-1.5 rounded-lg text-xs font-bold uppercase transition-all ${
                  me.team === 'red'
                    ? 'bg-red-600 text-white shadow-md'
                    : 'bg-neutral-800 text-neutral-400 hover:text-neutral-200'
                }`}
              >
                Equipe Vermelha
              </button>
            </div>
          )}

          {/* Players list */}
          <div className="flex-1 overflow-y-auto space-y-2 pr-1 max-h-[340px]">
            {playersList.map(player => {
              const isMe = player.id === currentUserId;
              return (
                <div
                  key={player.id}
                  className={`p-3 rounded-xl border flex items-center justify-between transition-all ${
                    isMe
                      ? 'bg-amber-500/10 border-amber-500/40'
                      : 'bg-neutral-950/60 border-neutral-800/80 hover:border-neutral-700'
                  }`}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <span
                      className="w-4 h-4 rounded-full shrink-0 shadow-sm"
                      style={{ backgroundColor: player.color }}
                    />
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5">
                        <span className={`text-sm font-bold truncate ${isMe ? 'text-amber-400' : 'text-neutral-200'}`}>
                          {player.name}
                        </span>
                        {player.isHost && <Crown className="w-3.5 h-3.5 text-amber-400 shrink-0" />}
                      </div>
                      <div className="text-[11px] text-neutral-500 font-mono flex items-center gap-2">
                        {room.mode === 'TEAM' && (
                          <span
                            className={player.team === 'blue' ? 'text-blue-400 font-semibold' : 'text-red-400 font-semibold'}
                          >
                            {player.team === 'blue' ? 'Azul' : 'Vermelho'}
                          </span>
                        )}
                        <span>{player.ping}ms</span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-1.5">
                    {isMe && (
                      <span className="text-[10px] uppercase font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30 px-2 py-0.5 rounded">
                        Você
                      </span>
                    )}
                    {player.isBot && (
                      <span className="text-[10px] uppercase font-bold bg-cyan-950/60 text-cyan-400 px-2 py-0.5 rounded border border-cyan-500/30 flex items-center gap-1">
                        <Bot className="w-3 h-3" /> BOT
                      </span>
                    )}
                    {isHost && player.isBot && onRemoveBot && (
                      <button
                        onClick={() => onRemoveBot(player.id)}
                        className="p-1 rounded bg-neutral-800 hover:bg-red-950 hover:text-red-400 text-neutral-400 transition-colors"
                        title="Remover este bot"
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Bot Management Panel for Host */}
          {isHost && (
            <div className="mt-4 pt-3 border-t border-neutral-800 space-y-3">
              <div className="flex items-center justify-between text-xs">
                <span className="text-neutral-300 font-bold flex items-center gap-1.5">
                  <Bot className="w-4 h-4 text-cyan-400" />
                  Bots na Partida
                </span>
                <button
                  onClick={() => onUpdateSettings({ botsEnabled: !room.botsEnabled })}
                  className={`px-2.5 py-1 rounded-lg font-semibold uppercase text-[10px] transition-colors ${
                    room.botsEnabled
                      ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40'
                      : 'bg-neutral-800 text-neutral-500'
                  }`}
                >
                  {room.botsEnabled ? 'Ativado' : 'Desativado'}
                </button>
              </div>

              {room.botsEnabled && (
                <div className="p-3 bg-neutral-950 rounded-xl border border-neutral-800/80 space-y-2.5">
                  {/* Bot Difficulty */}
                  <div>
                    <label className="text-[10px] font-bold uppercase tracking-wider text-neutral-400 block mb-1">
                      Dificuldade da IA
                    </label>
                    <div className="grid grid-cols-3 gap-1">
                      {(
                        [
                          { id: 'easy', label: 'Fácil' },
                          { id: 'medium', label: 'Médio' },
                          { id: 'hard', label: 'Difícil' },
                        ] as const
                      ).map(d => (
                        <button
                          key={d.id}
                          onClick={() => onUpdateSettings({ botDifficulty: d.id })}
                          className={`py-1 rounded text-[10px] font-bold uppercase transition-all ${
                            (room.botDifficulty || 'medium') === d.id
                              ? 'bg-cyan-500/20 border border-cyan-400 text-cyan-300'
                              : 'bg-neutral-900 border border-neutral-800 text-neutral-400 hover:text-neutral-200'
                          }`}
                        >
                          {d.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Bot Count Selector */}
                  <div className="flex items-center justify-between pt-1">
                    <span className="text-[10px] font-bold uppercase text-neutral-400">Total de Bots:</span>
                    <div className="flex items-center gap-1.5">
                      <button
                        type="button"
                        onClick={() => {
                          const current = room.botCount ?? 4;
                          if (current > 1) {
                            onUpdateSettings({ botCount: current - 1 });
                          }
                        }}
                        className="p-1 rounded bg-neutral-900 hover:bg-neutral-800 text-neutral-300 border border-neutral-800"
                      >
                        <Minus className="w-3 h-3" />
                      </button>
                      <span className="font-mono text-xs font-bold text-cyan-400 min-w-[20px] text-center">
                        {room.botCount ?? 4}
                      </span>
                      <button
                        type="button"
                        onClick={() => {
                          const current = room.botCount ?? 4;
                          if (current < (room.maxPlayers || 10) - 1) {
                            onUpdateSettings({ botCount: current + 1 });
                          }
                        }}
                        className="p-1 rounded bg-neutral-900 hover:bg-neutral-800 text-neutral-300 border border-neutral-800"
                      >
                        <Plus className="w-3 h-3" />
                      </button>
                    </div>
                  </div>

                  {/* Quick Add / Remove Bot Buttons */}
                  {onAddBot && (
                    <div className="pt-2 border-t border-neutral-800/60 flex gap-2">
                      <button
                        onClick={() => onAddBot()}
                        className="flex-1 py-1.5 rounded-lg bg-neutral-900 hover:bg-cyan-950/40 border border-neutral-800 hover:border-cyan-500/40 text-cyan-400 text-[10px] font-bold uppercase flex items-center justify-center gap-1 transition-colors"
                      >
                        <Plus className="w-3 h-3" /> +1 Bot
                      </button>
                      {onRemoveBot && (
                        <button
                          onClick={() => onRemoveBot()}
                          className="flex-1 py-1.5 rounded-lg bg-neutral-900 hover:bg-red-950/40 border border-neutral-800 hover:border-red-500/40 text-red-400 text-[10px] font-bold uppercase flex items-center justify-center gap-1 transition-colors"
                        >
                          <Minus className="w-3 h-3" /> -1 Bot
                        </button>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Right Columns: Match Settings & Maps */}
        <div className="lg:col-span-2 bg-neutral-900/80 border border-neutral-800 rounded-2xl p-5 flex flex-col justify-between shadow-xl">
          <div>
            <div className="flex items-center justify-between pb-3 border-b border-neutral-800 mb-4">
              <h3 className="font-display font-bold uppercase text-neutral-200">
                Configurações da Partida
              </h3>
              {!isHost && (
                <span className="text-xs text-neutral-500">Apenas o Host pode alterar as regras</span>
              )}
            </div>

            {/* Mode Selection */}
            <div className="mb-5">
              <label className="text-xs font-bold uppercase tracking-wider text-neutral-400 mb-2 block">
                Modo de Jogo
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {modes.map(m => {
                  const isSelected = room.mode === m.id;
                  return (
                    <button
                      key={m.id}
                      disabled={!isHost}
                      onClick={() => onUpdateSettings({ mode: m.id })}
                      className={`p-3 rounded-xl border text-left transition-all ${
                        isSelected
                          ? 'bg-amber-500/15 border-amber-500 text-amber-300 shadow-md'
                          : 'bg-neutral-950/60 border-neutral-800 text-neutral-300 hover:border-neutral-700 disabled:opacity-80'
                      }`}
                    >
                      <div className="font-bold text-sm mb-0.5">{m.name}</div>
                      <p className="text-xs text-neutral-400 line-clamp-2">{m.desc}</p>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Map Selection */}
            <div className="mb-5">
              <label className="text-xs font-bold uppercase tracking-wider text-neutral-400 mb-2 block">
                Mapa Selecionado
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {maps.map(mp => {
                  const isSelected = room.mapId === mp.id;
                  return (
                    <button
                      key={mp.id}
                      disabled={!isHost}
                      onClick={() => onUpdateSettings({ mapId: mp.id })}
                      className={`p-3 rounded-xl border text-left flex flex-col justify-between transition-all ${
                        isSelected
                          ? 'bg-amber-500/20 border-amber-500 text-amber-300 shadow'
                          : 'bg-neutral-950/60 border-neutral-800 text-neutral-300 hover:border-neutral-700 disabled:opacity-80'
                      }`}
                    >
                      <div>
                        <div className="font-bold text-xs uppercase mb-1">{mp.name}</div>
                        <p className="text-[10px] text-neutral-500 line-clamp-2">{mp.desc}</p>
                      </div>
                      <span className="mt-2 text-[10px] font-mono text-neutral-400 uppercase">
                        {isSelected ? '✓ Ativo' : 'Escolher'}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Start Game Action Bar */}
          <div className="pt-4 border-t border-neutral-800 flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="text-xs text-neutral-400 text-center sm:text-left">
              {isHost ? (
                <span>Clique abaixo para iniciar a batalha quando seus amigos estiverem prontos!</span>
              ) : (
                <span>Aguardando o Host <strong className="text-amber-400">{room.players[room.hostId]?.name || 'Líder'}</strong> iniciar a partida...</span>
              )}
            </div>

            {isHost ? (
              <button
                onClick={onStartGame}
                className="w-full sm:w-auto py-3.5 px-8 rounded-xl bg-amber-500 hover:bg-amber-400 text-neutral-950 font-black font-display uppercase tracking-wider text-sm flex items-center justify-center gap-2 shadow-xl shadow-amber-500/25 transition-all"
              >
                <Play className="w-5 h-5 fill-neutral-950" />
                Iniciar Partida
              </button>
            ) : (
              <div className="w-full sm:w-auto py-3 px-6 rounded-xl bg-neutral-800 text-neutral-400 font-semibold text-xs uppercase text-center border border-neutral-700">
                Aguardando Início...
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Footer Info */}
      <footer className="w-full max-w-5xl mt-6 pt-4 border-t border-neutral-800/60 text-center text-xs text-neutral-500 z-10 flex flex-col sm:flex-row items-center justify-between gap-2">
        <span>Controles: [W, A, S, D] Movimentação • [Espaço] Pulo • [E] Dash • [R] Recarregar • [TAB] Placar</span>
        <span className="text-neutral-400 font-semibold">Kirka-style FPS • Voxel 3D Engine</span>
      </footer>
    </div>
  );
};
