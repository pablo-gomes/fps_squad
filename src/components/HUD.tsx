import React, { useState, useEffect, useRef } from 'react';
import { PlayerData, RoomState, WeaponType, WEAPONS, KillFeedItem, ChatMessage } from '../types/game';
import { Shield, Zap, Crosshair as CrosshairIcon, MessageSquare, Send, Volume2, VolumeX, ListOrdered, Users, Share2, Check, Copy } from 'lucide-react';
import { sound } from '../services/sound';

interface HUDProps {
  player: PlayerData;
  room: RoomState;
  dashCooldownPct: number; // 0 (ready) to 1 (recharging)
  isReloading: boolean;
  hitmarkerActive: boolean;
  damageVignette: boolean;
  isAimingDownSights: boolean;
  onSwitchWeapon: (w: WeaponType) => void;
  onReload: () => void;
  onOpenScoreboard: () => void;
  onSendChat: (text: string) => void;
  chatMessages: ChatMessage[];
  // Mobile touch handlers
  isMobile: boolean;
  onTouchFireStart?: () => void;
  onTouchFireEnd?: () => void;
  onTouchJump?: () => void;
  onTouchDash?: () => void;
  onTouchADS?: () => void;
}

export const HUD: React.FC<HUDProps> = ({
  player,
  room,
  dashCooldownPct,
  isReloading,
  hitmarkerActive,
  damageVignette,
  isAimingDownSights,
  onSwitchWeapon,
  onReload,
  onOpenScoreboard,
  onSendChat,
  chatMessages,
  isMobile,
  onTouchFireStart,
  onTouchFireEnd,
  onTouchJump,
  onTouchDash,
  onTouchADS,
}) => {
  const [chatOpen, setChatOpen] = useState(false);
  const [chatText, setChatText] = useState('');
  const [isMuted, setIsMuted] = useState(sound.isMuted());
  const [copiedLink, setCopiedLink] = useState(false);
  const chatInputRef = useRef<HTMLInputElement>(null);

  const handleCopyLink = (e: React.MouseEvent) => {
    e.stopPropagation();
    const url = `${window.location.origin}${window.location.pathname}?room=${room.code}`;
    navigator.clipboard.writeText(url);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2000);
  };

  const weaponInfo = WEAPONS[player.currentWeapon];
  const hpPct = Math.max(0, Math.min(1, player.hp / player.maxHp));

  // Format remaining match time
  const minutes = Math.floor(Math.max(0, room.remainingTimeSec) / 60);
  const seconds = Math.floor(Math.max(0, room.remainingTimeSec) % 60);
  const timeStr = `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;

  // Find leader
  const allPlayers = Object.values(room.players) as PlayerData[];
  const sorted = [...allPlayers].sort((a, b) => b.score - a.score);
  const leader = sorted[0];
  const myRank = sorted.findIndex(p => p.id === player.id) + 1;

  // Key listener for chat
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 't' || e.key === 'T' || e.key === 'Enter') {
        if (!chatOpen && document.pointerLockElement) {
          document.exitPointerLock();
          setChatOpen(true);
          setTimeout(() => chatInputRef.current?.focus(), 50);
          e.preventDefault();
        }
      }
      if (e.key === 'Escape' && chatOpen) {
        setChatOpen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [chatOpen]);

  const handleChatSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (chatText.trim()) {
      onSendChat(chatText);
      setChatText('');
    }
    setChatOpen(false);
  };

  const handleToggleSound = () => {
    const muted = sound.toggleMute();
    setIsMuted(muted);
  };

  return (
    <div className="absolute inset-0 pointer-events-none select-none overflow-hidden font-sans">
      {/* Red Damage Vignette flash when hit */}
      {damageVignette && (
        <div className="absolute inset-0 bg-red-600/25 pointer-events-none transition-opacity duration-200" />
      )}

      {/* Sniper ADS Scope Overlay */}
      {isAimingDownSights && player.currentWeapon === 'sniper' && (
        <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
          {/* Black vignette mask */}
          <div className="w-[85vmin] h-[85vmin] rounded-full border-4 border-neutral-900 shadow-[0_0_0_9999px_rgba(0,0,0,0.92)] relative flex items-center justify-center">
            {/* Scope crosshairs */}
            <div className="absolute w-full h-[1.5px] bg-red-500/80" />
            <div className="absolute h-full w-[1.5px] bg-red-500/80" />
            <div className="w-2 h-2 rounded-full border border-red-400 bg-red-500" />
            {/* Distance markers */}
            <div className="absolute top-1/4 w-8 h-[1px] bg-red-400/60" />
            <div className="absolute bottom-1/4 w-8 h-[1px] bg-red-400/60" />
            <div className="absolute left-1/4 h-8 w-[1px] bg-red-400/60" />
            <div className="absolute right-1/4 h-8 w-[1px] bg-red-400/60" />
          </div>
        </div>
      )}

      {/* Dynamic Center Crosshair (if not scoped) */}
      {(!isAimingDownSights || player.currentWeapon !== 'sniper') && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <div className="relative flex items-center justify-center">
            {/* Center dot */}
            <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 shadow-sm" />

            {/* Crosshair lines */}
            {player.currentWeapon !== 'knife' && (
              <>
                <div className="absolute -top-3.5 w-0.5 h-2 bg-emerald-400/80" />
                <div className="absolute -bottom-3.5 w-0.5 h-2 bg-emerald-400/80" />
                <div className="absolute -left-3.5 h-0.5 w-2 bg-emerald-400/80" />
                <div className="absolute -right-3.5 h-0.5 w-2 bg-emerald-400/80" />
              </>
            )}

            {/* Hitmarker X mark */}
            {hitmarkerActive && (
              <div className="absolute animate-ping">
                <div className="w-4 h-4 relative">
                  <div className="absolute inset-0 border-2 border-red-500 rotate-45" />
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* TOP BAR: Room info, Match timer, Live Leaderboard Mini-Ticker */}
      <div className="absolute top-3 inset-x-4 flex items-start justify-between">
        {/* Room & WiFi Status */}
        <div className="flex flex-col gap-1.5">
          <div className="flex items-center gap-2 bg-neutral-950/80 backdrop-blur-md px-3 py-1.5 rounded-lg border border-neutral-800 text-xs shadow-lg">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <span className="text-neutral-400">Sala:</span>
            <span className="font-mono font-bold text-amber-400 text-sm tracking-wider">{room.code}</span>
            <span className="text-neutral-600">|</span>
            <span className="text-neutral-300 font-semibold">{room.mode}</span>
            <button
              onClick={handleCopyLink}
              title="Copiar link da sala para convidar amigos"
              className="pointer-events-auto ml-1 bg-amber-500/20 hover:bg-amber-500/30 text-amber-400 border border-amber-500/40 px-2 py-0.5 rounded text-[11px] font-bold flex items-center gap-1 cursor-pointer transition active:scale-95"
            >
              {copiedLink ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
              <span>{copiedLink ? 'Copiado!' : 'Convidar'}</span>
            </button>
          </div>

          {/* Quick Rank preview and participants breakdown */}
          <div className="bg-neutral-950/70 backdrop-blur-md px-2.5 py-1 rounded-md border border-neutral-800/80 text-[11px] text-neutral-300 flex items-center gap-2">
            <span>
              Você: <strong className="text-amber-400">#{myRank}</strong> ({player.kills} Kills)
            </span>
            <span className="text-neutral-600">•</span>
            <span className="text-slate-400">
              {allPlayers.filter(p => !p.isBot).length} amigos • {allPlayers.filter(p => p.isBot).length} bots
            </span>
          </div>
        </div>

        {/* Center: Match Timer & Team Score */}
        <div className="flex flex-col items-center">
          <div className="bg-neutral-950/85 backdrop-blur-md px-4 py-1.5 rounded-xl border border-neutral-800 shadow-xl flex items-center gap-3">
            {room.mode === 'TEAM' && (
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold uppercase text-blue-400">Azul</span>
                <span className="font-mono font-bold text-lg text-blue-400">{room.teamScores.blue}</span>
              </div>
            )}

            <div className="font-mono font-bold text-lg text-neutral-100 tracking-wider">
              {timeStr}
            </div>

            {room.mode === 'TEAM' && (
              <div className="flex items-center gap-2">
                <span className="font-mono font-bold text-lg text-red-400">{room.teamScores.red}</span>
                <span className="text-xs font-bold uppercase text-red-400">Vermelho</span>
              </div>
            )}
          </div>

          {/* King of the Hill / Point Zone status */}
          {room.mode === 'POINT' && room.pointZone && (
            <div className="mt-1 bg-neutral-950/80 px-3 py-0.5 rounded text-[11px] border border-neutral-800 text-neutral-300">
              Ponto Central:{' '}
              <span
                className={`font-bold uppercase ${
                  room.pointZone.controllingTeam === 'blue'
                    ? 'text-blue-400'
                    : room.pointZone.controllingTeam === 'red'
                    ? 'text-red-400'
                    : 'text-amber-400'
                }`}
              >
                {room.pointZone.controllingTeam === 'neutral'
                  ? 'Contestado'
                  : room.pointZone.controllingTeam === 'blue'
                  ? 'Equipe Azul'
                  : 'Equipe Vermelha'}
              </span>
            </div>
          )}

          {/* Sky Parkour Checkpoint Status */}
          {room.mode === 'PARKOUR' && (
            <div className="mt-1 bg-neutral-950/80 px-3 py-0.5 rounded text-[11px] border border-neutral-800 text-amber-400 font-semibold">
              Checkpoint: {player.parkourCheckpoint || 0} / 3 • Tempo: {Math.floor((player.parkourTime || 0) / 1000)}s
            </div>
          )}
        </div>

        {/* Top Right: Buttons & Killfeed */}
        <div className="flex flex-col items-end gap-2">
          <div className="flex items-center gap-1.5 pointer-events-auto">
            <button
              onClick={onOpenScoreboard}
              title="Abrir Placar [TAB]"
              className="bg-neutral-900/80 hover:bg-neutral-800 border border-neutral-700 text-neutral-200 px-2.5 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 shadow"
            >
              <ListOrdered className="w-3.5 h-3.5 text-amber-400" />
              <span className="hidden sm:inline">Placar [TAB]</span>
            </button>
            <button
              onClick={handleToggleSound}
              title="Alternar Som"
              className="bg-neutral-900/80 hover:bg-neutral-800 border border-neutral-700 text-neutral-300 p-1.5 rounded-lg shadow"
            >
              {isMuted ? <VolumeX className="w-4 h-4 text-red-400" /> : <Volume2 className="w-4 h-4 text-emerald-400" />}
            </button>
          </div>

          {/* Kill Feed */}
          <div className="flex flex-col gap-1 w-56">
            {room.killFeed.slice(0, 5).map(item => (
              <div
                key={item.id}
                className="bg-neutral-950/80 backdrop-blur-md px-2.5 py-1 rounded text-xs border border-neutral-800/80 flex items-center justify-between animate-in slide-in-from-right-4 duration-200"
              >
                <span
                  className={`font-semibold truncate max-w-[70px] ${
                    item.killerTeam === 'blue' ? 'text-blue-400' : item.killerTeam === 'red' ? 'text-red-400' : 'text-emerald-400'
                  }`}
                >
                  {item.killerName}
                </span>
                <span className="text-[10px] text-neutral-400 font-mono mx-1 uppercase">
                  [{item.weapon}]
                </span>
                <span
                  className={`font-semibold truncate max-w-[70px] ${
                    item.victimTeam === 'blue' ? 'text-blue-400' : item.victimTeam === 'red' ? 'text-red-400' : 'text-emerald-400'
                  }`}
                >
                  {item.victimName}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* BOTTOM LEFT: Health Bar & Dash Cooldown */}
      <div className="absolute bottom-5 left-5 flex flex-col gap-2">
        {/* Dash Meter */}
        <div className="flex items-center gap-2 bg-neutral-950/80 backdrop-blur-md px-3 py-1.5 rounded-lg border border-neutral-800 w-48">
          <Zap className={`w-4 h-4 ${dashCooldownPct === 0 ? 'text-cyan-400' : 'text-neutral-600'}`} />
          <div className="flex-1">
            <div className="flex items-center justify-between text-[10px] uppercase font-bold text-neutral-400 mb-0.5">
              <span>DASH [E]</span>
              <span className={dashCooldownPct === 0 ? 'text-cyan-400' : 'text-neutral-500'}>
                {dashCooldownPct === 0 ? 'PRONTO' : `${Math.round(dashCooldownPct * 100)}%`}
              </span>
            </div>
            <div className="h-1.5 w-full bg-neutral-800 rounded-full overflow-hidden">
              <div
                className="h-full bg-cyan-400 transition-all duration-100"
                style={{ width: `${(1 - dashCooldownPct) * 100}%` }}
              />
            </div>
          </div>
        </div>

        {/* Health Bar */}
        <div className="bg-neutral-950/85 backdrop-blur-md px-4 py-2.5 rounded-xl border border-neutral-800 shadow-2xl w-60">
          <div className="flex items-center justify-between mb-1">
            <div className="flex items-center gap-1.5">
              <Shield className={`w-4 h-4 ${player.hp < 30 ? 'text-red-500 animate-pulse' : 'text-emerald-400'}`} />
              <span className="text-xs uppercase font-bold tracking-wider text-neutral-400">Vida</span>
            </div>
            <span className={`font-mono font-bold text-lg ${player.hp < 30 ? 'text-red-400 animate-pulse' : 'text-emerald-400'}`}>
              {Math.max(0, Math.round(player.hp))}
            </span>
          </div>
          <div className="h-2.5 w-full bg-neutral-800 rounded-full overflow-hidden p-0.5 border border-neutral-700/50">
            <div
              className={`h-full rounded-full transition-all duration-150 ${
                hpPct > 0.5 ? 'bg-emerald-500' : hpPct > 0.25 ? 'bg-amber-500' : 'bg-red-500'
              }`}
              style={{ width: `${hpPct * 100}%` }}
            />
          </div>
        </div>
      </div>

      {/* BOTTOM RIGHT: Weapon Bar & Ammo Counter */}
      <div className="absolute bottom-5 right-5 flex flex-col items-end gap-2">
        {/* Ammo & Reload Notification */}
        <div className="bg-neutral-950/85 backdrop-blur-md px-4 py-2 rounded-xl border border-neutral-800 shadow-2xl text-right min-w-[140px]">
          <span className="text-[10px] uppercase font-bold text-neutral-400 tracking-wider">Munição</span>
          <div className="flex items-baseline justify-end gap-1.5 font-mono">
            {player.currentWeapon === 'knife' ? (
              <span className="text-2xl font-bold text-amber-400">∞</span>
            ) : (
              <>
                <span className={`text-3xl font-black ${player.ammo <= 5 ? 'text-red-400 animate-pulse' : 'text-neutral-100'}`}>
                  {player.ammo}
                </span>
                <span className="text-sm font-semibold text-neutral-500">/ {weaponInfo.magSize}</span>
              </>
            )}
          </div>
          {isReloading && (
            <div className="text-[11px] text-amber-400 font-bold uppercase animate-pulse">
              Recarregando...
            </div>
          )}
          {!isReloading && player.ammo === 0 && player.currentWeapon !== 'knife' && (
            <div className="text-[11px] text-red-400 font-bold uppercase animate-bounce cursor-pointer pointer-events-auto" onClick={onReload}>
              [R] Recarregar
            </div>
          )}
        </div>

        {/* Weapons Switch Bar */}
        <div className="flex items-center gap-1 bg-neutral-950/80 backdrop-blur-md p-1.5 rounded-xl border border-neutral-800 pointer-events-auto">
          {(['rifle', 'shotgun', 'sniper', 'knife'] as WeaponType[]).map((wId, idx) => {
            const isSelected = player.currentWeapon === wId;
            const w = WEAPONS[wId];
            return (
              <button
                key={wId}
                onClick={() => onSwitchWeapon(wId)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold uppercase flex flex-col items-center transition-all ${
                  isSelected
                    ? 'bg-amber-500 text-neutral-950 shadow-md font-bold'
                    : 'bg-neutral-800/60 text-neutral-400 hover:text-neutral-200 hover:bg-neutral-800'
                }`}
              >
                <span className="text-[9px] opacity-70">[{idx + 1}]</span>
                <span className="truncate max-w-[60px]">{w.name.split(' ')[0]}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* CHAT OVERLAY & INPUT */}
      <div className="absolute bottom-24 left-5 w-72 max-w-[85vw] flex flex-col gap-1">
        {/* Messages */}
        <div className="flex flex-col gap-1 max-h-36 overflow-y-auto pointer-events-auto p-1 text-xs">
          {chatMessages.slice(-5).map(msg => (
            <div key={msg.id} className="bg-neutral-950/70 backdrop-blur-md px-2 py-1 rounded text-neutral-300">
              <span className={`font-bold ${msg.isSystem ? 'text-amber-400' : 'text-blue-400'}`}>
                {msg.senderName}:
              </span>{' '}
              {msg.text}
            </div>
          ))}
        </div>

        {/* Chat input toggle or form */}
        {chatOpen ? (
          <form onSubmit={handleChatSubmit} className="flex gap-1 pointer-events-auto mt-1">
            <input
              ref={chatInputRef}
              type="text"
              value={chatText}
              onChange={e => setChatText(e.target.value)}
              placeholder="Digite sua mensagem [Enter]..."
              maxLength={100}
              className="flex-1 bg-neutral-900 border border-amber-500/60 text-neutral-100 text-xs px-2.5 py-1.5 rounded-lg focus:outline-none shadow-lg"
            />
            <button
              type="submit"
              className="bg-amber-500 hover:bg-amber-400 text-neutral-950 px-2.5 py-1.5 rounded-lg text-xs font-bold"
            >
              <Send className="w-3.5 h-3.5" />
            </button>
          </form>
        ) : (
          <button
            onClick={() => {
              if (document.pointerLockElement) document.exitPointerLock();
              setChatOpen(true);
            }}
            className="self-start text-[11px] text-neutral-400 hover:text-neutral-200 bg-neutral-950/60 px-2 py-0.5 rounded border border-neutral-800/80 pointer-events-auto flex items-center gap-1"
          >
            <MessageSquare className="w-3 h-3" /> Pressione [T] para conversar
          </button>
        )}
      </div>

      {/* MOBILE TOUCH CONTROLS (Rendered only on touch screens or small devices) */}
      {isMobile && (
        <div className="absolute inset-0 pointer-events-none">
          {/* Mobile Right Action Buttons */}
          <div className="absolute bottom-28 right-5 flex flex-col gap-3 pointer-events-auto">
            <button
              onTouchStart={onTouchFireStart}
              onTouchEnd={onTouchFireEnd}
              className="w-16 h-16 rounded-full bg-red-600/90 active:bg-red-500 border-2 border-red-400 text-white font-bold text-xs uppercase shadow-xl flex items-center justify-center select-none"
            >
              FOGO
            </button>
            <div className="flex gap-2">
              <button
                onClick={onTouchJump}
                className="w-12 h-12 rounded-full bg-neutral-800/90 active:bg-neutral-700 border border-neutral-600 text-white font-bold text-xs shadow-lg flex items-center justify-center select-none"
              >
                PULAR
              </button>
              <button
                onClick={onTouchDash}
                className="w-12 h-12 rounded-full bg-cyan-700/90 active:bg-cyan-600 border border-cyan-400 text-white font-bold text-xs shadow-lg flex items-center justify-center select-none"
              >
                DASH
              </button>
            </div>
            <div className="flex gap-2">
              <button
                onClick={onTouchADS}
                className="w-12 h-12 rounded-full bg-amber-600/80 active:bg-amber-500 border border-amber-400 text-white font-bold text-[10px] shadow flex items-center justify-center select-none"
              >
                MIRA
              </button>
              <button
                onClick={onReload}
                className="w-12 h-12 rounded-full bg-neutral-800/80 active:bg-neutral-700 border border-neutral-600 text-white font-bold text-[10px] shadow flex items-center justify-center select-none"
              >
                RELOAD
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
