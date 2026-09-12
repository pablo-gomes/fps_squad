import React, { useState, useEffect } from 'react';
import { Settings, Volume2, VolumeX, Eye, MousePointer, X } from 'lucide-react';
import { sound } from '../services/sound';

export interface GameSettings {
  mouseSensitivity: number;
  invertY: boolean;
  fov: number;
  volume: number;
  muted: boolean;
}

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  settings: GameSettings;
  onUpdateSettings: (newSettings: Partial<GameSettings>) => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({
  isOpen,
  onClose,
  settings,
  onUpdateSettings,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-neutral-950/80 backdrop-blur-md p-4">
      <div className="w-full max-w-md bg-neutral-900 border border-neutral-800 rounded-2xl shadow-2xl overflow-hidden flex flex-col">
        {/* Header */}
        <div className="bg-neutral-950 px-6 py-4 border-b border-neutral-800 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Settings className="w-5 h-5 text-amber-400" />
            <h3 className="font-display font-bold uppercase tracking-wider text-neutral-100 text-base">
              Configurações do Jogo
            </h3>
          </div>
          <button
            onClick={onClose}
            className="text-neutral-400 hover:text-neutral-200 p-1 rounded-lg bg-neutral-800/60"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Form Body */}
        <div className="p-6 space-y-5 overflow-y-auto max-h-[70vh]">
          {/* Mouse Sensitivity */}
          <div>
            <div className="flex items-center justify-between mb-1 text-xs font-bold uppercase text-neutral-300">
              <span className="flex items-center gap-1.5">
                <MousePointer className="w-3.5 h-3.5 text-amber-400" />
                Sensibilidade do Mouse
              </span>
              <span className="font-mono text-amber-400">{settings.mouseSensitivity.toFixed(2)}x</span>
            </div>
            <input
              type="range"
              min="0.2"
              max="3.0"
              step="0.05"
              value={settings.mouseSensitivity}
              onChange={e => onUpdateSettings({ mouseSensitivity: parseFloat(e.target.value) })}
              className="w-full accent-amber-500 bg-neutral-800 rounded-lg cursor-pointer h-2"
            />
          </div>

          {/* Invert Y-axis */}
          <div className="flex items-center justify-between py-1">
            <span className="text-xs font-bold uppercase text-neutral-300">Inverter Eixo Y (Câmera)</span>
            <input
              type="checkbox"
              checked={settings.invertY}
              onChange={e => onUpdateSettings({ invertY: e.target.checked })}
              className="w-4 h-4 accent-amber-500 rounded cursor-pointer"
            />
          </div>

          {/* FOV (Field of View) */}
          <div>
            <div className="flex items-center justify-between mb-1 text-xs font-bold uppercase text-neutral-300">
              <span className="flex items-center gap-1.5">
                <Eye className="w-3.5 h-3.5 text-amber-400" />
                Campo de Visão (FOV)
              </span>
              <span className="font-mono text-amber-400">{settings.fov}°</span>
            </div>
            <input
              type="range"
              min="65"
              max="105"
              step="1"
              value={settings.fov}
              onChange={e => onUpdateSettings({ fov: parseInt(e.target.value) })}
              className="w-full accent-amber-500 bg-neutral-800 rounded-lg cursor-pointer h-2"
            />
          </div>

          {/* Volume */}
          <div>
            <div className="flex items-center justify-between mb-1 text-xs font-bold uppercase text-neutral-300">
              <span className="flex items-center gap-1.5">
                <Volume2 className="w-3.5 h-3.5 text-amber-400" />
                Volume Geral
              </span>
              <span className="font-mono text-amber-400">{Math.round(settings.volume * 100)}%</span>
            </div>
            <div className="flex items-center gap-3">
              <input
                type="range"
                min="0"
                max="1"
                step="0.05"
                value={settings.volume}
                onChange={e => {
                  const v = parseFloat(e.target.value);
                  sound.setVolume(v);
                  onUpdateSettings({ volume: v });
                }}
                className="flex-1 accent-amber-500 bg-neutral-800 rounded-lg cursor-pointer h-2"
              />
              <button
                onClick={() => {
                  const m = sound.toggleMute();
                  onUpdateSettings({ muted: m });
                }}
                className="p-1.5 rounded-lg bg-neutral-800 text-neutral-300 hover:text-neutral-100"
              >
                {settings.muted ? <VolumeX className="w-4 h-4 text-red-400" /> : <Volume2 className="w-4 h-4 text-emerald-400" />}
              </button>
            </div>
          </div>

          {/* Keybinds Reference */}
          <div className="pt-3 border-t border-neutral-800">
            <h4 className="text-[11px] font-bold uppercase tracking-wider text-neutral-400 mb-2">
              Comandos do Teclado
            </h4>
            <div className="grid grid-cols-2 gap-2 text-xs font-mono">
              <div className="bg-neutral-950 p-2 rounded border border-neutral-800 flex justify-between">
                <span className="text-neutral-400">Mover</span>
                <span className="text-neutral-200 font-bold">[W, A, S, D]</span>
              </div>
              <div className="bg-neutral-950 p-2 rounded border border-neutral-800 flex justify-between">
                <span className="text-neutral-400">Pular</span>
                <span className="text-neutral-200 font-bold">[Espaço]</span>
              </div>
              <div className="bg-neutral-950 p-2 rounded border border-neutral-800 flex justify-between">
                <span className="text-neutral-400">Dash</span>
                <span className="text-neutral-200 font-bold">[E]</span>
              </div>
              <div className="bg-neutral-950 p-2 rounded border border-neutral-800 flex justify-between">
                <span className="text-neutral-400">Agachar</span>
                <span className="text-neutral-200 font-bold">[Shift]</span>
              </div>
              <div className="bg-neutral-950 p-2 rounded border border-neutral-800 flex justify-between">
                <span className="text-neutral-400">Atirar</span>
                <span className="text-neutral-200 font-bold">[Botão Esq.]</span>
              </div>
              <div className="bg-neutral-950 p-2 rounded border border-neutral-800 flex justify-between">
                <span className="text-neutral-400">Mirar (ADS)</span>
                <span className="text-neutral-200 font-bold">[Botão Dir.]</span>
              </div>
              <div className="bg-neutral-950 p-2 rounded border border-neutral-800 flex justify-between">
                <span className="text-neutral-400">Recarregar</span>
                <span className="text-neutral-200 font-bold">[R]</span>
              </div>
              <div className="bg-neutral-950 p-2 rounded border border-neutral-800 flex justify-between">
                <span className="text-neutral-400">Placar</span>
                <span className="text-neutral-200 font-bold">[TAB]</span>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="bg-neutral-950 p-4 border-t border-neutral-800 flex justify-end">
          <button
            onClick={onClose}
            className="px-5 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-neutral-950 font-bold text-xs uppercase shadow transition-colors"
          >
            Salvar & Fechar
          </button>
        </div>
      </div>
    </div>
  );
};
