import React, { useState } from 'react';
import { X, Shield, Swords, Layers, Users, Trophy } from 'lucide-react';
import { MapType, RoomConfig } from '../types/game.ts';

interface CreateRoomModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreate: (config: Partial<RoomConfig>) => void;
}

export const CreateRoomModal: React.FC<CreateRoomModalProps> = ({ isOpen, onClose, onCreate }) => {
  const [roomName, setRoomName] = useState('Neon Arena');
  const [mapType, setMapType] = useState<MapType>('classic');
  const [maxPlayers, setMaxPlayers] = useState<number>(4);
  const [roundsToWin, setRoundsToWin] = useState<number>(3);
  const [isPublic, setIsPublic] = useState<boolean>(true);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onCreate({
      name: roomName.trim() || 'Neon Arena',
      mapType,
      maxPlayers,
      roundsToWin,
      isPublic,
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="relative w-full max-w-lg bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-2xl text-slate-100">
        <div className="flex items-center justify-between pb-4 border-b border-slate-800">
          <div className="flex items-center gap-2">
            <Swords className="w-5 h-5 text-cyan-400" />
            <h2 className="text-lg font-bold tracking-tight">Yeni Özel Oda Oluştur</h2>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="mt-5 space-y-5">
          {/* Room Name */}
          <div>
            <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5">
              Oda İsmi
            </label>
            <input
              type="text"
              maxLength={20}
              value={roomName}
              onChange={(e) => setRoomName(e.target.value)}
              className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-700 rounded-lg text-white font-medium focus:outline-none focus:border-cyan-500 transition-colors"
            />
          </div>

          {/* Map Selector */}
          <div>
            <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
              Harita Düzeni
            </label>
            <div className="grid grid-cols-3 gap-2.5">
              {[
                { id: 'classic' as MapType, name: 'Klasik', desc: 'Dengeli sığınaklar' },
                { id: 'courtyard' as MapType, name: 'Açık Alan', desc: '4 büyük sütun' },
                { id: 'maze' as MapType, name: 'Labirent', desc: 'Sekme koridorları' },
              ].map((map) => (
                <button
                  key={map.id}
                  type="button"
                  onClick={() => setMapType(map.id)}
                  className={`p-3 rounded-xl border text-left transition-all ${
                    mapType === map.id
                      ? 'border-cyan-500 bg-cyan-950/30 text-white shadow-md shadow-cyan-950/20'
                      : 'border-slate-800 bg-slate-950/60 text-slate-400 hover:border-slate-700'
                  }`}
                >
                  <div className="font-bold text-xs mb-0.5">{map.name}</div>
                  <div className="text-[10px] text-slate-500">{map.desc}</div>
                </button>
              ))}
            </div>
          </div>

          {/* Rounds & Players */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
                <Trophy className="w-3.5 h-3.5 text-amber-400" />
                <span>Kazanma Hedefi</span>
              </label>
              <div className="flex gap-2">
                {[3, 5, 7].map((rounds) => (
                  <button
                    key={rounds}
                    type="button"
                    onClick={() => setRoundsToWin(rounds)}
                    className={`flex-1 py-2 text-xs font-bold rounded-lg border transition-all ${
                      roundsToWin === rounds
                        ? 'border-amber-500 bg-amber-950/30 text-amber-300'
                        : 'border-slate-800 bg-slate-950 text-slate-400 hover:border-slate-700'
                    }`}
                  >
                    {rounds} Galibiyet
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
                <Users className="w-3.5 h-3.5 text-cyan-400" />
                <span>Maksimum Oyuncu</span>
              </label>
              <select
                value={maxPlayers}
                onChange={(e) => setMaxPlayers(parseInt(e.target.value, 10))}
                className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-lg text-white font-medium focus:outline-none focus:border-cyan-500"
              >
                <option value={2}>2 Oyuncu (Düello)</option>
                <option value={4}>4 Oyuncu</option>
                <option value={6}>6 Oyuncu</option>
                <option value={8}>8 Oyuncu (Tam Kaos)</option>
              </select>
            </div>
          </div>

          {/* Public / Private visibility */}
          <div className="flex items-center justify-between p-3 rounded-xl bg-slate-950 border border-slate-800">
            <div>
              <div className="text-xs font-semibold text-white">Herkese Açık Oda</div>
              <div className="text-[11px] text-slate-400">
                {isPublic ? 'Oda genel lobi listesinde görünür' : 'Yalnızca oda kodu/linki olanlar katılabilir'}
              </div>
            </div>
            <button
              type="button"
              onClick={() => setIsPublic(!isPublic)}
              className={`w-11 h-6 rounded-full transition-colors relative p-0.5 ${
                isPublic ? 'bg-cyan-500' : 'bg-slate-700'
              }`}
            >
              <div
                className={`w-5 h-5 rounded-full bg-white transition-transform ${
                  isPublic ? 'translate-x-5' : 'translate-x-0'
                }`}
              />
            </button>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-2.5 rounded-xl border border-slate-700 text-slate-300 hover:bg-slate-800 text-sm font-semibold transition-colors"
            >
              Vazgeç
            </button>
            <button
              type="submit"
              className="flex-1 py-2.5 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 text-sm font-bold shadow-lg shadow-cyan-950/50 transition-all active:scale-[0.98]"
            >
              Odayı Kur ve Başla
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
