import React from 'react';
import { X, RefreshCw, Users, Trophy, Play, Plus, MapPin } from 'lucide-react';
import { RoomSummary } from '../types/game.ts';

interface LobbyBrowserModalProps {
  isOpen: boolean;
  onClose: () => void;
  rooms: RoomSummary[];
  onRefresh: () => void;
  onJoinRoom: (roomId: string) => void;
  onCreateNew: () => void;
}

export const LobbyBrowserModal: React.FC<LobbyBrowserModalProps> = ({
  isOpen,
  onClose,
  rooms,
  onRefresh,
  onJoinRoom,
  onCreateNew,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="relative w-full max-w-2xl bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-2xl text-slate-100 flex flex-col max-h-[85vh]">
        <div className="flex items-center justify-between pb-4 border-b border-slate-800 shrink-0">
          <div>
            <h2 className="text-lg font-bold tracking-tight">Canlı Açık Odalar</h2>
            <p className="text-xs text-slate-400">Aktif bir odaya hemen katılın veya kendiniz kurun</p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={onRefresh}
              className="p-2 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
              title="Yenile"
            >
              <RefreshCw className="w-4 h-4" />
            </button>
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Room List Container */}
        <div className="my-4 overflow-y-auto space-y-2.5 flex-1 pr-1">
          {rooms.length === 0 ? (
            <div className="py-12 text-center text-slate-500">
              <Users className="w-10 h-10 mx-auto mb-2 opacity-40 text-cyan-400" />
              <p className="text-sm font-medium text-slate-400">Şu anda açık oda bulunmuyor</p>
              <p className="text-xs text-slate-500 mt-1">Hemen ilk odayı kurup arkadaşlarınızı davet edin!</p>
              <button
                onClick={onCreateNew}
                className="mt-4 px-4 py-2 bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold text-xs rounded-xl transition-colors inline-flex items-center gap-1.5"
              >
                <Plus className="w-4 h-4" />
                <span>İlk Odayı Kur</span>
              </button>
            </div>
          ) : (
            rooms.map((room) => {
              const isFull = room.playerCount >= room.maxPlayers;
              const statusMap = {
                waiting: { label: 'Bekliyor', color: 'text-amber-400' },
                in_game: { label: 'Savaşta', color: 'text-emerald-400' },
                round_end: { label: 'Raund Sonu', color: 'text-cyan-400' },
                match_over: { label: 'Bitti', color: 'text-rose-400' },
              };
              const statusInfo = statusMap[room.status] || { label: 'Aktif', color: 'text-cyan-400' };

              return (
                <div
                  key={room.id}
                  className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 rounded-xl bg-slate-950/80 border border-slate-800/90 hover:border-slate-700 transition-all"
                >
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-bold text-sm text-white">{room.name}</span>
                      <span className="font-mono text-xs text-cyan-400/80 bg-cyan-950/40 px-2 py-0.5 rounded border border-cyan-800/40">
                        #{room.id}
                      </span>
                    </div>

                    <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-400">
                      <span className="flex items-center gap-1">
                        <Users className="w-3.5 h-3.5 text-slate-500" />
                        <span className="font-mono tabular-nums">
                          {room.playerCount} / {room.maxPlayers}
                        </span>
                      </span>

                      <span className="flex items-center gap-1 capitalize">
                        <MapPin className="w-3.5 h-3.5 text-slate-500" />
                        <span>{room.mapType}</span>
                      </span>

                      <span className="flex items-center gap-1">
                        <Trophy className="w-3.5 h-3.5 text-amber-500/80" />
                        <span>İlk {room.roundsToWin} Kazanan</span>
                      </span>

                      <span className={`font-semibold ${statusInfo.color}`}>
                        · {statusInfo.label}
                      </span>
                    </div>
                  </div>

                  <button
                    disabled={isFull}
                    onClick={() => onJoinRoom(room.id)}
                    className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 shrink-0 ${
                      isFull
                        ? 'bg-slate-800 text-slate-500 cursor-not-allowed'
                        : 'bg-cyan-500 hover:bg-cyan-400 text-slate-950 shadow-md shadow-cyan-950/40 active:scale-95'
                    }`}
                  >
                    <Play className="w-3.5 h-3.5 fill-current" />
                    <span>{isFull ? 'Dolu' : 'Katıl'}</span>
                  </button>
                </div>
              );
            })
          )}
        </div>

        {/* Modal Footer */}
        <div className="pt-3 border-t border-slate-800 flex justify-between items-center shrink-0">
          <span className="text-xs text-slate-500">
            Toplam {rooms.length} açık oda
          </span>
          <button
            onClick={onCreateNew}
            className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-cyan-300 font-semibold text-xs rounded-xl border border-slate-700 transition-colors inline-flex items-center gap-1.5"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Özel Oda Aç</span>
          </button>
        </div>
      </div>
    </div>
  );
};
