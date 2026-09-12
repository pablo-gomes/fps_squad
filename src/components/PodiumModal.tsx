import React, { useEffect } from 'react';
import confetti from 'canvas-confetti';
import { PlayerData, RoomState, Team } from '../types/game';
import { Trophy, Medal, Award, RotateCcw, Home, Crown, Flame } from 'lucide-react';
import { sound } from '../services/sound';

interface PodiumModalProps {
  room: RoomState;
  currentUserId: string;
  winner: string | Team;
  onRestart: () => void;
  onReturnToLobby: () => void;
}

export const PodiumModal: React.FC<PodiumModalProps> = ({
  room,
  currentUserId,
  winner,
  onRestart,
  onReturnToLobby,
}) => {
  const players = (Object.values(room.players) as PlayerData[]).sort((a, b) => {
    if (b.score !== a.score) return b.score - a.score;
    return b.kills - a.kills;
  });

  const me = room.players[currentUserId];
  const isHost = me?.isHost;

  const top1 = players[0];
  const top2 = players[1];
  const top3 = players[2];

  let didIWin = false;
  let victoryTitle = 'Fim da Partida';

  if (room.mode === 'TEAM') {
    if (winner === 'blue') {
      victoryTitle = 'Vitória da Equipe Azul!';
      didIWin = me?.team === 'blue';
    } else if (winner === 'red') {
      victoryTitle = 'Vitória da Equipe Vermelha!';
      didIWin = me?.team === 'red';
    } else {
      victoryTitle = 'Empate!';
    }
  } else {
    victoryTitle = `Vitória de ${winner}!`;
    didIWin = top1?.id === currentUserId;
  }

  useEffect(() => {
    sound.playVictory();
    confetti({
      particleCount: 80,
      spread: 70,
      origin: { y: 0.6 },
    });
  }, []);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-neutral-950/85 backdrop-blur-md p-4 animate-in fade-in duration-300">
      <div className="w-full max-w-2xl bg-neutral-900 border border-neutral-800 rounded-2xl shadow-2xl overflow-hidden flex flex-col">
        {/* Header Banner */}
        <div
          className={`px-6 py-6 text-center border-b ${
            didIWin
              ? 'bg-gradient-to-b from-amber-500/20 to-neutral-900 border-amber-500/30'
              : 'bg-gradient-to-b from-blue-900/20 to-neutral-900 border-neutral-800'
          }`}
        >
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-500/10 border border-amber-500/30 text-amber-400 text-xs uppercase font-bold tracking-widest mb-2">
            <Trophy className="w-4 h-4" /> Placar Final
          </div>
          <h1 className="text-3xl md:text-4xl font-black uppercase font-display tracking-wide text-neutral-100">
            {victoryTitle}
          </h1>
          <p className="text-sm text-neutral-400 mt-1">
            Modo <span className="text-neutral-200 font-semibold">{room.mode}</span> • Mapa{' '}
            <span className="text-neutral-200 font-semibold capitalize">{room.mapId}</span>
          </p>
        </div>

        {/* 3D-styled Podium */}
        <div className="px-6 py-8 flex items-end justify-center gap-3 md:gap-6 bg-neutral-950/50">
          {/* 2nd Place */}
          {top2 && (
            <div className="flex flex-col items-center flex-1 max-w-[150px]">
              <div className="mb-2 text-center">
                <span className="w-3 h-3 rounded-full inline-block mb-1" style={{ backgroundColor: top2.color }} />
                <p className="text-xs font-bold text-neutral-200 truncate max-w-[120px]">{top2.name}</p>
                <p className="text-[11px] text-neutral-400 font-mono">{top2.kills} Kills • {top2.score} pts</p>
              </div>
              <div className="w-full h-24 bg-gradient-to-t from-slate-800 to-slate-700 border-t-4 border-slate-300 rounded-t-lg flex flex-col items-center justify-center shadow-lg">
                <Medal className="w-6 h-6 text-slate-300 mb-1" />
                <span className="text-xl font-bold font-display text-slate-200">2º</span>
              </div>
            </div>
          )}

          {/* 1st Place (Winner / MVP) */}
          {top1 && (
            <div className="flex flex-col items-center flex-1 max-w-[160px] -mt-6">
              <div className="mb-2 text-center">
                <Crown className="w-6 h-6 text-amber-400 inline-block mb-1 animate-bounce" />
                <p className="text-sm font-bold text-amber-400 truncate max-w-[130px]">{top1.name}</p>
                <p className="text-xs text-amber-200/70 font-mono">{top1.kills} Kills • {top1.score} pts</p>
              </div>
              <div className="w-full h-32 bg-gradient-to-t from-amber-900/60 to-amber-700/60 border-t-4 border-amber-400 rounded-t-lg flex flex-col items-center justify-center shadow-2xl relative">
                <div className="absolute -top-3 bg-amber-500 text-neutral-950 text-[10px] uppercase font-black px-2 py-0.5 rounded-full shadow">
                  MVP
                </div>
                <Trophy className="w-8 h-8 text-amber-400 mb-1" />
                <span className="text-2xl font-black font-display text-amber-300">1º</span>
              </div>
            </div>
          )}

          {/* 3rd Place */}
          {top3 && (
            <div className="flex flex-col items-center flex-1 max-w-[150px]">
              <div className="mb-2 text-center">
                <span className="w-3 h-3 rounded-full inline-block mb-1" style={{ backgroundColor: top3.color }} />
                <p className="text-xs font-bold text-neutral-200 truncate max-w-[120px]">{top3.name}</p>
                <p className="text-[11px] text-neutral-400 font-mono">{top3.kills} Kills • {top3.score} pts</p>
              </div>
              <div className="w-full h-18 bg-gradient-to-t from-amber-950 to-amber-900/80 border-t-4 border-amber-700 rounded-t-lg flex flex-col items-center justify-center shadow-lg">
                <Award className="w-5 h-5 text-amber-600 mb-1" />
                <span className="text-lg font-bold font-display text-amber-500">3º</span>
              </div>
            </div>
          )}
        </div>

        {/* Your Performance Summary */}
        {me && (
          <div className="mx-6 my-4 p-4 rounded-xl bg-neutral-950 border border-neutral-800 flex items-center justify-between">
            <div>
              <p className="text-xs uppercase tracking-wider text-neutral-400 font-semibold">Seu Desempenho</p>
              <h3 className="text-lg font-bold text-neutral-100">{me.name}</h3>
            </div>
            <div className="flex items-center gap-6 font-mono text-center">
              <div>
                <p className="text-xs text-neutral-400">Abates</p>
                <p className="text-base font-bold text-emerald-400">{me.kills}</p>
              </div>
              <div>
                <p className="text-xs text-neutral-400">Mortes</p>
                <p className="text-base font-bold text-neutral-300">{me.deaths}</p>
              </div>
              <div>
                <p className="text-xs text-neutral-400">Pontuação</p>
                <p className="text-base font-bold text-amber-400">{me.score}</p>
              </div>
              <div className="hidden sm:block">
                <p className="text-xs text-neutral-400">+XP</p>
                <p className="text-base font-bold text-cyan-400">+{me.score + 150} XP</p>
              </div>
            </div>
          </div>
        )}

        {/* Action Buttons */}
        <div className="p-6 bg-neutral-950 border-t border-neutral-800 flex flex-col sm:flex-row items-center gap-3">
          <button
            onClick={onReturnToLobby}
            className="w-full sm:w-auto flex-1 py-3 px-4 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-neutral-200 font-semibold uppercase text-xs tracking-wider flex items-center justify-center gap-2 transition-colors"
          >
            <Home className="w-4 h-4" /> Voltar ao Lobby
          </button>
          {isHost ? (
            <button
              onClick={onRestart}
              className="w-full sm:w-auto flex-1 py-3 px-4 rounded-xl bg-amber-500 hover:bg-amber-400 text-neutral-950 font-bold uppercase text-xs tracking-wider flex items-center justify-center gap-2 shadow-lg shadow-amber-500/20 transition-all"
            >
              <RotateCcw className="w-4 h-4" /> Jogar Novamente (Host)
            </button>
          ) : (
            <div className="text-xs text-neutral-500 text-center flex-1">
              Aguardando o Host reiniciar a partida...
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
