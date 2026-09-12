import React from 'react';
import { PlayerData, RoomState, Team } from '../types/game';
import { Trophy, Flame, Crown, Wifi, Skull, Crosshair, Award } from 'lucide-react';

interface ScoreboardModalProps {
  room: RoomState;
  currentUserId: string;
  isOpen: boolean;
  onClose?: () => void;
  isGameOver?: boolean;
}

export const ScoreboardModal: React.FC<ScoreboardModalProps> = ({
  room,
  currentUserId,
  isOpen,
  onClose,
  isGameOver = false,
}) => {
  if (!isOpen) return null;

  const allPlayers = Object.values(room.players) as PlayerData[];

  // Sort players by score descending, then kills descending
  const sortedPlayers = [...allPlayers].sort((a, b) => {
    if (b.score !== a.score) return b.score - a.score;
    return b.kills - a.kills;
  });

  const bluePlayers = sortedPlayers.filter(p => p.team === 'blue');
  const redPlayers = sortedPlayers.filter(p => p.team === 'red');

  const renderPlayerRow = (player: PlayerData, rankIndex: number) => {
    const isMe = player.id === currentUserId;
    const kd = player.deaths === 0 ? player.kills.toFixed(1) : (player.kills / player.deaths).toFixed(1);

    const rankBadges = [
      'bg-amber-500 text-neutral-950 font-bold',
      'bg-slate-300 text-neutral-950 font-bold',
      'bg-amber-700 text-neutral-100 font-bold',
    ];
    const rankClass = rankIndex < 3 ? rankBadges[rankIndex] : 'bg-neutral-800 text-neutral-400';

    return (
      <tr
        key={player.id}
        className={`border-b border-neutral-800/80 transition-colors ${
          isMe ? 'bg-amber-500/10 border-amber-500/30 font-semibold' : 'hover:bg-neutral-800/40'
        }`}
      >
        <td className="py-2.5 px-3 text-center">
          <span className={`inline-flex items-center justify-center w-6 h-6 rounded text-xs ${rankClass}`}>
            {rankIndex + 1}
          </span>
        </td>
        <td className="py-2.5 px-3">
          <div className="flex items-center gap-2">
            <span
              className="w-3 h-3 rounded-full shrink-0"
              style={{ backgroundColor: player.color || '#3b82f6' }}
            />
            <span className={`truncate max-w-[140px] md:max-w-[180px] ${isMe ? 'text-amber-400' : 'text-neutral-200'}`}>
              {player.name}
            </span>
            {isMe && (
              <span className="text-[10px] px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-300 border border-amber-500/30 uppercase tracking-wider">
                Você
              </span>
            )}
            {player.isHost && <Crown className="w-3.5 h-3.5 text-amber-400 shrink-0" />}
            {player.isBot && (
              <span className="text-[10px] px-1.5 py-0.5 rounded bg-neutral-800 text-neutral-400 border border-neutral-700">
                BOT
              </span>
            )}
          </div>
        </td>
        {room.mode === 'TEAM' && (
          <td className="py-2.5 px-3 text-center">
            <span
              className={`text-xs px-2 py-0.5 rounded uppercase font-bold ${
                player.team === 'blue'
                  ? 'bg-blue-900/60 text-blue-300 border border-blue-500/40'
                  : 'bg-red-900/60 text-red-300 border border-red-500/40'
              }`}
            >
              {player.team === 'blue' ? 'Azul' : 'Vermelho'}
            </span>
          </td>
        )}
        <td className="py-2.5 px-3 text-center font-mono font-bold text-emerald-400">{player.kills}</td>
        <td className="py-2.5 px-3 text-center font-mono text-neutral-400">{player.deaths}</td>
        <td className="py-2.5 px-3 text-center font-mono text-neutral-300">{kd}</td>
        <td className="py-2.5 px-3 text-center font-mono font-bold text-amber-400">{player.score}</td>
        <td className="py-2.5 px-3 text-center font-mono text-xs text-neutral-500">
          <span className="inline-flex items-center gap-1">
            <Wifi className="w-3 h-3 text-emerald-500" />
            {player.ping}ms
          </span>
        </td>
      </tr>
    );
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-neutral-950/80 backdrop-blur-md p-4">
      <div className="w-full max-w-3xl bg-neutral-900 border border-neutral-800 rounded-xl shadow-2xl overflow-hidden flex flex-col max-h-[85vh]">
        {/* Header */}
        <div className="bg-neutral-950/80 px-6 py-4 border-b border-neutral-800 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Trophy className="w-6 h-6 text-amber-400" />
            <div>
              <h2 className="text-xl font-bold tracking-wide uppercase font-display text-neutral-100 flex items-center gap-2">
                Placar em Tempo Real
                {isGameOver && <span className="text-xs bg-red-600 text-white px-2 py-0.5 rounded">Fim de Jogo</span>}
              </h2>
              <p className="text-xs text-neutral-400">
                Sala <span className="text-amber-400 font-mono font-bold">{room.code}</span> • Modo{' '}
                <span className="text-neutral-200 font-semibold">{room.mode}</span> • Mapa{' '}
                <span className="text-neutral-200 font-semibold capitalize">{room.mapId}</span>
              </p>
            </div>
          </div>

          {/* Team scores banner if Team mode */}
          {room.mode === 'TEAM' && (
            <div className="flex items-center gap-3 bg-neutral-900 px-3 py-1.5 rounded-lg border border-neutral-800">
              <div className="text-right">
                <span className="text-xs text-blue-400 uppercase font-bold">Azul</span>
                <div className="text-lg font-mono font-bold text-blue-300">{room.teamScores.blue}</div>
              </div>
              <div className="text-neutral-600 font-bold text-sm">VS</div>
              <div className="text-left">
                <span className="text-xs text-red-400 uppercase font-bold">Vermelho</span>
                <div className="text-lg font-mono font-bold text-red-300">{room.teamScores.red}</div>
              </div>
            </div>
          )}

          {onClose && !isGameOver && (
            <button
              onClick={onClose}
              className="text-neutral-400 hover:text-neutral-200 px-3 py-1.5 rounded bg-neutral-800 hover:bg-neutral-700 text-xs font-semibold uppercase"
            >
              Fechar [TAB]
            </button>
          )}
        </div>

        {/* Top 3 Best of the Match Highlight */}
        {sortedPlayers.length > 0 && (
          <div className="grid grid-cols-3 gap-2 px-6 py-3 bg-neutral-950/40 border-b border-neutral-800/60">
            {sortedPlayers.slice(0, 3).map((p, idx) => (
              <div
                key={p.id}
                className="flex items-center gap-2.5 p-2 rounded-lg bg-neutral-800/40 border border-neutral-700/40"
              >
                <div
                  className={`w-7 h-7 rounded-md flex items-center justify-center font-bold text-xs shrink-0 ${
                    idx === 0
                      ? 'bg-amber-500 text-neutral-950'
                      : idx === 1
                      ? 'bg-slate-300 text-neutral-950'
                      : 'bg-amber-700 text-neutral-100'
                  }`}
                >
                  #{idx + 1}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-1">
                    <span className="text-xs font-bold text-neutral-200 truncate">{p.name}</span>
                    {idx === 0 && <Award className="w-3.5 h-3.5 text-amber-400 shrink-0" />}
                  </div>
                  <div className="text-[11px] text-neutral-400 font-mono">
                    <span className="text-emerald-400">{p.kills}K</span> / <span className="text-amber-400">{p.score}pts</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Scoreboard Table */}
        <div className="flex-1 overflow-y-auto p-4">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-neutral-800 text-neutral-400 text-xs uppercase tracking-wider">
                <th className="py-2 px-3 text-center w-12">#</th>
                <th className="py-2 px-3">Jogador</th>
                {room.mode === 'TEAM' && <th className="py-2 px-3 text-center">Equipe</th>}
                <th className="py-2 px-3 text-center">Abates</th>
                <th className="py-2 px-3 text-center">Mortes</th>
                <th className="py-2 px-3 text-center">K/D</th>
                <th className="py-2 px-3 text-center">Pontos</th>
                <th className="py-2 px-3 text-center">Ping</th>
              </tr>
            </thead>
            <tbody>
              {room.mode === 'TEAM' ? (
                <>
                  <tr className="bg-blue-950/30">
                    <td colSpan={8} className="py-1.5 px-3 text-xs font-bold uppercase text-blue-400">
                      Equipe Azul ({bluePlayers.length})
                    </td>
                  </tr>
                  {bluePlayers.map((p, idx) => renderPlayerRow(p, idx))}
                  <tr className="bg-red-950/30">
                    <td colSpan={8} className="py-1.5 px-3 text-xs font-bold uppercase text-red-400 mt-2">
                      Equipe Vermelha ({redPlayers.length})
                    </td>
                  </tr>
                  {redPlayers.map((p, idx) => renderPlayerRow(p, idx))}
                </>
              ) : (
                sortedPlayers.map((p, idx) => renderPlayerRow(p, idx))
              )}
            </tbody>
          </table>
        </div>

        {/* Footer info */}
        <div className="px-6 py-2.5 bg-neutral-950 border-t border-neutral-800 text-xs text-neutral-500 flex items-center justify-between">
          <span>Pressione [TAB] a qualquer momento durante a partida para ver o placar</span>
          <span>{allPlayers.length} / {room.maxPlayers} Jogadores conectados</span>
        </div>
      </div>
    </div>
  );
};
