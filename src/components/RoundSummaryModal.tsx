import React, { useEffect } from 'react';
import confetti from 'canvas-confetti';
import { Trophy, Swords, RotateCcw, LogOut } from 'lucide-react';
import { GameSnapshot, TankPlayer } from '../types/game.ts';

interface RoundSummaryModalProps {
  snapshot: GameSnapshot;
  localPlayer: TankPlayer | null;
  isHost: boolean;
  onRematch: () => void;
  onLeave: () => void;
}

export const RoundSummaryModal: React.FC<RoundSummaryModalProps> = ({
  snapshot,
  localPlayer,
  isHost,
  onRematch,
  onLeave,
}) => {
  const isRoundEnd = snapshot.status === 'round_end';
  const isMatchOver = snapshot.status === 'match_over';

  useEffect(() => {
    if (isMatchOver) {
      confetti({
        particleCount: 80,
        spread: 70,
        origin: { y: 0.6 },
      });
    }
  }, [isMatchOver]);

  if (!isRoundEnd && !isMatchOver) return null;

  const winner = snapshot.players.find(
    (p) => p.id === (isMatchOver ? snapshot.matchWinnerId : snapshot.roundWinnerId)
  );

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-in fade-in duration-200 pointer-events-auto">
      <div className="relative w-full max-w-md bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-2xl text-center text-slate-100 animate-in zoom-in-95 duration-200">
        {/* Glow backdrop */}
        <div
          className="absolute -top-12 left-1/2 -translate-x-1/2 w-48 h-48 rounded-full blur-3xl opacity-20 pointer-events-none"
          style={{ backgroundColor: winner?.color || '#06b6d4' }}
        />

        {/* Icon & Title */}
        <div className="relative z-10">
          <div
            className="w-16 h-16 rounded-2xl mx-auto mb-4 flex items-center justify-center shadow-lg"
            style={{ backgroundColor: `${winner?.color || '#06b6d4'}22`, border: `2px solid ${winner?.color || '#06b6d4'}` }}
          >
            {isMatchOver ? (
              <Trophy className="w-8 h-8 text-amber-400" />
            ) : (
              <Swords className="w-8 h-8" style={{ color: winner?.color || '#06b6d4' }} />
            )}
          </div>

          <h2 className="text-2xl font-black uppercase tracking-tight font-mono text-white mb-1">
            {isMatchOver ? 'MAÇ ŞAMPİYONU!' : 'RAUND KAZANANI!'}
          </h2>

          <div className="text-lg font-bold mb-4" style={{ color: winner?.color || '#38bdf8' }}>
            {winner ? winner.name : 'Beraberlik (Herkes İmha Edildi)'}
          </div>

          {/* Countdown or Final Results */}
          {isRoundEnd && (
            <div className="my-5 p-3 rounded-2xl bg-slate-950/80 border border-slate-800">
              <div className="text-xs text-slate-400 mb-1">Sonraki Raund Başlıyor</div>
              <div className="font-mono text-2xl font-black text-amber-400 tabular-nums">
                {snapshot.roundCountdown || 3}
              </div>
            </div>
          )}

          {/* Leaderboard Table */}
          <div className="my-5 rounded-2xl bg-slate-950 border border-slate-800 overflow-hidden text-left">
            <div className="px-4 py-2 border-b border-slate-800 text-[10px] font-bold text-slate-500 uppercase tracking-widest font-mono flex justify-between">
              <span>PİLOT</span>
              <div className="flex gap-4">
                <span>LEŞ</span>
                <span>GALİBİYET</span>
              </div>
            </div>
            <div className="divide-y divide-slate-800/60 max-h-44 overflow-y-auto">
              {[...snapshot.players]
                .sort((a, b) => b.score - a.score || b.kills - a.kills)
                .map((p, idx) => (
                  <div
                    key={p.id}
                    className={`px-4 py-2.5 flex items-center justify-between text-xs font-mono ${
                      p.id === localPlayer?.id ? 'bg-cyan-950/20 font-bold' : ''
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <span className="text-slate-500 text-[11px] w-3">{idx + 1}</span>
                      <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: p.color }} />
                      <span className="text-slate-200 truncate max-w-[120px]">{p.name}</span>
                    </div>

                    <div className="flex items-center gap-6">
                      <span className="text-slate-400 tabular-nums">{p.kills}</span>
                      <span className="text-amber-400 font-bold tabular-nums text-sm">{p.score}</span>
                    </div>
                  </div>
                ))}
            </div>
          </div>

          {/* Match Over Actions */}
          {isMatchOver && (
            <div className="flex gap-3 pt-2">
              <button
                onClick={onLeave}
                className="flex-1 py-3 rounded-xl border border-slate-700 hover:bg-slate-800 text-slate-300 font-semibold text-xs transition-colors flex items-center justify-center gap-2"
              >
                <LogOut className="w-4 h-4" />
                <span>Lobiye Dön</span>
              </button>

              {isHost && (
                <button
                  onClick={onRematch}
                  className="flex-1 py-3 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold text-xs shadow-lg shadow-cyan-950/50 transition-all flex items-center justify-center gap-2"
                >
                  <RotateCcw className="w-4 h-4" />
                  <span>Rövanş Başlat</span>
                </button>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
