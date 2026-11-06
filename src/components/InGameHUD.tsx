import React, { useState } from 'react';
import {
  Volume2,
  VolumeX,
  Copy,
  Check,
  Bot,
  LogOut,
  Shield,
  Zap,
  Activity,
  UserPlus,
  UserMinus,
  Link,
} from 'lucide-react';
import { GameSnapshot, RoomConfig, TankPlayer } from '../types/game.ts';
import { sound } from '../game/audio.ts';

interface InGameHUDProps {
  roomConfig: RoomConfig;
  snapshot: GameSnapshot;
  localPlayer: TankPlayer | null;
  isHost: boolean;
  ping: number;
  onLeaveRoom: () => void;
  onAddBot: () => void;
  onRemoveBot: () => void;
  onStartMatch: () => void;
}

export const InGameHUD: React.FC<InGameHUDProps> = ({
  roomConfig,
  snapshot,
  localPlayer,
  isHost,
  ping,
  onLeaveRoom,
  onAddBot,
  onRemoveBot,
  onStartMatch,
}) => {
  const [copiedCode, setCopiedCode] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);
  const [isMuted, setIsMuted] = useState(sound.getMuted());

  const toggleSound = () => {
    const nextMuted = !isMuted;
    setIsMuted(nextMuted);
    sound.setMuted(nextMuted);
  };

  const copyRoomCode = () => {
    navigator.clipboard.writeText(roomConfig.id);
    setCopiedCode(true);
    setTimeout(() => setCopiedCode(false), 2000);
  };

  const copyInviteLink = () => {
    const url = new URL(window.location.href);
    url.searchParams.set('room', roomConfig.id);
    navigator.clipboard.writeText(url.toString());
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2000);
  };

  const alivePlayers = snapshot.players.filter((p) => p.isAlive);
  const isSpectating = localPlayer ? !localPlayer.isAlive : true;
  const isWaiting = snapshot.status === 'waiting';

  const botCount = snapshot.players.filter((p) => p.isBot).length;

  return (
    <div className="absolute inset-0 pointer-events-none select-none z-20 flex flex-col justify-between p-4 overflow-hidden">
      {/* Top Bar Header Contract */}
      <div className="flex items-center justify-between w-full gap-4">
        {/* Left Zone: Room Code & Quick Share */}
        <div className="pointer-events-auto flex items-center gap-2 bg-slate-900/90 border border-slate-800 rounded-xl px-3 py-1.5 shadow-lg backdrop-blur-md">
          <div className="flex items-center gap-1.5">
            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest font-mono">ODA</span>
            <span className="font-mono font-extrabold text-sm text-cyan-400 tracking-wider">
              {roomConfig.id}
            </span>
          </div>

          <div className="h-4 w-px bg-slate-800 mx-1" />

          <button
            onClick={copyRoomCode}
            className="flex items-center gap-1 text-[11px] font-semibold text-slate-300 hover:text-white px-2 py-0.5 rounded hover:bg-slate-800 transition-colors"
            title="Oda Kodunu Kopyala"
          >
            {copiedCode ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
            <span>{copiedCode ? 'Kopyalandı' : 'Kodu Al'}</span>
          </button>

          <button
            onClick={copyInviteLink}
            className="flex items-center gap-1 text-[11px] font-semibold text-cyan-400 hover:text-cyan-300 px-2 py-0.5 rounded hover:bg-cyan-950/40 transition-colors"
            title="Paylaşılabilir Davet Linkini Kopyala"
          >
            {copiedLink ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Link className="w-3.5 h-3.5" />}
            <span>{copiedLink ? 'Link Alındı' : 'Davet Et'}</span>
          </button>
        </div>

        {/* Center Zone: Round Match Status & Alive Ticker */}
        <div className="pointer-events-auto flex items-center gap-3 bg-slate-900/90 border border-slate-800 rounded-xl px-4 py-1.5 shadow-lg backdrop-blur-md">
          <div className="flex items-center gap-2 text-xs font-bold text-slate-200">
            <span>Raund {snapshot.currentRound}</span>
            <span className="text-slate-600">·</span>
            <span className="text-amber-400 font-mono">İlk {roomConfig.roundsToWin} Kazanan</span>
          </div>

          <div className="h-4 w-px bg-slate-800" />

          <div className="flex items-center gap-1.5 text-xs">
            <span className="w-2 h-2 rounded-full bg-emerald-500" />
            <span className="font-mono tabular-nums text-slate-300">
              {alivePlayers.length} / {snapshot.players.length} Canlı
            </span>
          </div>
        </div>

        {/* Right Zone: Host Controls, Ping, Audio & Exit */}
        <div className="pointer-events-auto flex items-center gap-2">
          {/* Host Bot Management */}
          {isHost && (
            <div className="flex items-center gap-1 bg-slate-900/90 border border-slate-800 rounded-xl p-1 shadow-lg backdrop-blur-md">
              <button
                onClick={onAddBot}
                disabled={snapshot.players.length >= roomConfig.maxPlayers}
                className="flex items-center gap-1 text-[11px] font-bold text-cyan-400 hover:bg-cyan-950/40 px-2 py-1 rounded transition-colors disabled:opacity-40"
                title="Yapay Zeka Bot Tank Ekle"
              >
                <UserPlus className="w-3.5 h-3.5" />
                <span>+ Bot</span>
              </button>

              {botCount > 0 && (
                <button
                  onClick={onRemoveBot}
                  className="flex items-center gap-1 text-[11px] font-bold text-rose-400 hover:bg-rose-950/40 px-2 py-1 rounded transition-colors"
                  title="Yapay Zeka Botunu Çıkar"
                >
                  <UserMinus className="w-3.5 h-3.5" />
                  <span>- Bot</span>
                </button>
              )}
            </div>
          )}

          {/* Ping */}
          <div className="flex items-center gap-1 px-2.5 py-1.5 bg-slate-900/90 border border-slate-800 rounded-xl text-[11px] font-mono text-slate-400 shadow-lg">
            <Activity className="w-3 h-3 text-emerald-400" />
            <span className="tabular-nums">{ping}ms</span>
          </div>

          {/* Sound Mute */}
          <button
            onClick={toggleSound}
            className="p-2 rounded-xl bg-slate-900/90 border border-slate-800 hover:bg-slate-800 text-slate-300 hover:text-white transition-colors shadow-lg"
            title={isMuted ? 'Sesi Aç' : 'Sesi Kapat'}
          >
            {isMuted ? <VolumeX className="w-4 h-4 text-rose-400" /> : <Volume2 className="w-4 h-4 text-cyan-400" />}
          </button>

          {/* Leave */}
          <button
            onClick={onLeaveRoom}
            className="flex items-center gap-1 px-3 py-1.5 rounded-xl bg-slate-900/90 border border-slate-800 hover:bg-rose-950/40 hover:border-rose-900 text-slate-300 hover:text-rose-400 text-xs font-semibold transition-colors shadow-lg"
            title="Lobiye Dön"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Ayrıl</span>
          </button>
        </div>
      </div>

      {/* Top Right: Live Kill Feed */}
      <div className="pointer-events-none absolute top-16 right-4 flex flex-col items-end gap-1.5 max-w-xs">
        {snapshot.killFeed.map((item) => (
          <div
            key={item.id}
            className="flex items-center gap-1.5 px-3 py-1 rounded-lg bg-slate-950/80 border border-slate-800/80 text-[11px] font-mono shadow-md animate-in slide-in-from-right duration-200"
          >
            <span style={{ color: item.killerColor }} className="font-bold">
              {item.killerName}
            </span>
            <span className="text-slate-500">➔</span>
            <span style={{ color: item.victimColor }} className="font-semibold">
              {item.victimName}
            </span>
          </div>
        ))}
      </div>

      {/* Center Prompt when Waiting for Players */}
      {isWaiting && (
        <div className="pointer-events-auto self-center bg-slate-900/95 border border-cyan-500/40 rounded-2xl p-6 shadow-2xl backdrop-blur-md text-center max-w-md mx-auto my-auto animate-in zoom-in-95 duration-200">
          <Bot className="w-10 h-10 text-cyan-400 mx-auto mb-2 animate-bounce" />
          <h3 className="text-lg font-bold text-white mb-1">Oyuncular Bekleniyor</h3>
          <p className="text-xs text-slate-400 mb-4">
            Arkadaşlarınızı davet edin (Oda Kodu: <span className="font-mono font-bold text-cyan-400">{roomConfig.id}</span>) veya hemen pratik yapmak için bot ekleyin.
          </p>

          <div className="flex gap-2 justify-center">
            {isHost && (
              <>
                <button
                  onClick={onAddBot}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-cyan-300 font-bold text-xs rounded-xl border border-slate-700 transition-colors"
                >
                  + Bot Ekle
                </button>
                <button
                  onClick={onStartMatch}
                  className="px-5 py-2 bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-extrabold text-xs rounded-xl shadow-lg shadow-cyan-950/50 transition-all"
                >
                  Savaşı Başlat
                </button>
              </>
            )}
          </div>
        </div>
      )}

      {/* Spectating Notice */}
      {!isWaiting && isSpectating && (
        <div className="pointer-events-none self-center mb-4 px-4 py-1.5 rounded-full bg-slate-950/90 border border-rose-500/30 text-rose-300 text-xs font-semibold shadow-lg backdrop-blur-md flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-rose-500 animate-pulse" />
          <span>Tankınız imha edildi · Canlı çatışmayı izliyorsunuz</span>
        </div>
      )}

      {/* Bottom Status Cluster: Health, Shield, PowerUp & Match Score */}
      <div className="flex items-end justify-between w-full">
        {/* Local Player Vitals */}
        {localPlayer && localPlayer.isAlive && (
          <div className="pointer-events-auto flex items-center gap-4 bg-slate-900/90 border border-slate-800 rounded-2xl p-3.5 shadow-2xl backdrop-blur-md">
            {/* Health Bar */}
            <div className="w-36">
              <div className="flex justify-between text-[11px] font-bold mb-1">
                <span className="text-slate-400">GÖVDE</span>
                <span className="font-mono text-emerald-400 tabular-nums">
                  {Math.round(localPlayer.health)} / 100
                </span>
              </div>
              <div className="w-full h-2.5 bg-slate-950 rounded-full overflow-hidden p-0.5 border border-slate-800">
                <div
                  className="h-full rounded-full transition-all duration-200"
                  style={{
                    width: `${Math.max(0, localPlayer.health)}%`,
                    backgroundColor:
                      localPlayer.health > 50 ? '#10b981' : localPlayer.health > 25 ? '#f59e0b' : '#f43f5e',
                  }}
                />
              </div>

              {/* Shield Bar if active */}
              {localPlayer.shield > 0 && (
                <div className="mt-2">
                  <div className="flex justify-between text-[10px] font-bold text-cyan-400 mb-0.5">
                    <span className="flex items-center gap-1">
                      <Shield className="w-3 h-3" />
                      <span>ENERJİ KALKANI</span>
                    </span>
                    <span className="font-mono tabular-nums">{Math.round(localPlayer.shield)}</span>
                  </div>
                  <div className="w-full h-1.5 bg-slate-950 rounded-full overflow-hidden border border-cyan-900/50">
                    <div
                      className="h-full bg-cyan-400 rounded-full transition-all"
                      style={{ width: `${Math.min(100, localPlayer.shield)}%` }}
                    />
                  </div>
                </div>
              )}
            </div>

            {/* Active Power-up Badge */}
            {localPlayer.powerUp && (
              <div className="flex items-center gap-2 pl-3 border-l border-slate-800">
                <div className="w-8 h-8 rounded-lg bg-amber-500/20 border border-amber-500/50 flex items-center justify-center text-amber-400">
                  <Zap className="w-4 h-4 fill-current" />
                </div>
                <div>
                  <div className="text-[10px] font-bold text-amber-400 uppercase">GÜÇLENDİRİCİ</div>
                  <div className="text-xs font-bold text-white capitalize">
                    {localPlayer.powerUp.replace('_', ' ').toLowerCase()}
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Live Scoreboard Summary (All Players) */}
        <div className="pointer-events-auto flex items-center gap-2 bg-slate-900/90 border border-slate-800 rounded-2xl px-4 py-2.5 shadow-2xl backdrop-blur-md">
          <div className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mr-1 font-mono">
            SKORLAR
          </div>
          <div className="flex items-center gap-2.5">
            {snapshot.players.map((p) => (
              <div
                key={p.id}
                className={`flex items-center gap-1.5 px-2 py-1 rounded-lg border text-xs font-mono ${
                  p.id === localPlayer?.id
                    ? 'border-cyan-500/50 bg-cyan-950/30 text-white font-bold'
                    : 'border-slate-800 bg-slate-950/60 text-slate-300'
                } ${!p.isAlive ? 'opacity-40' : ''}`}
              >
                <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: p.color }} />
                <span className="truncate max-w-[80px]">{p.name}</span>
                <span className="text-amber-400 font-extrabold ml-1 tabular-nums">{p.score}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
