import React, { useState, useEffect } from 'react';
import { Volume2, VolumeX, Shield, Play, Plus, Compass, Hash, Sparkles, Server } from 'lucide-react';
import { sound } from '../game/audio.ts';

interface TitleScreenProps {
  pilotName: string;
  setPilotName: (name: string) => void;
  selectedColor: string;
  setSelectedColor: (color: string) => void;
  onQuickPlay: () => void;
  onOpenBrowse: () => void;
  onOpenCreate: () => void;
  onOpenJoinCode: () => void;
  isConnected: boolean;
  onOpenServerSettings: () => void;
}

export const COLOR_OPTIONS = [
  { name: 'Neon Camgöbeği', hex: '#06b6d4' },
  { name: 'Alev Kırmızısı', hex: '#f43f5e' },
  { name: 'Zümrüt Yeşili', hex: '#10b981' },
  { name: 'Kehribar Altın', hex: '#f59e0b' },
  { name: 'Kozmik Menekşe', hex: '#8b5cf6' },
  { name: 'Siber Pembe', hex: '#ec4899' },
];

export const TitleScreen: React.FC<TitleScreenProps> = ({
  pilotName,
  setPilotName,
  selectedColor,
  setSelectedColor,
  onQuickPlay,
  onOpenBrowse,
  onOpenCreate,
  onOpenJoinCode,
  isConnected,
  onOpenServerSettings,
}) => {
  const [isMuted, setIsMuted] = useState(sound.getMuted());
  const [aimAngle, setAimAngle] = useState(0);

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      const centerX = window.innerWidth / 2;
      const centerY = window.innerHeight * 0.38;
      const angle = Math.atan2(e.clientY - centerY, e.clientX - centerX);
      setAimAngle(angle);
    };
    window.addEventListener('mousemove', handleMouseMove);
    return () => window.removeEventListener('mousemove', handleMouseMove);
  }, []);

  const toggleSound = () => {
    const nextMuted = !isMuted;
    setIsMuted(nextMuted);
    sound.setMuted(nextMuted);
  };

  return (
    <div className="relative w-full h-full min-h-screen bg-[#070a13] text-slate-100 flex flex-col justify-between p-6 overflow-y-auto select-none">
      {/* Background ambient blueprint grid effect */}
      <div
        className="absolute inset-0 pointer-events-none opacity-20"
        style={{
          backgroundImage:
            'radial-gradient(circle at 50% 50%, rgba(6, 182, 212, 0.15) 0%, transparent 70%), linear-gradient(#1e293b 1px, transparent 1px), linear-gradient(90deg, #1e293b 1px, transparent 1px)',
          backgroundSize: '100% 100%, 40px 40px, 40px 40px',
        }}
      />

      {/* Top Header Bar */}
      <header className="relative z-10 flex items-center justify-between max-w-6xl mx-auto w-full pt-2">
        <div className="flex items-center gap-3">
          <div
            className="w-8 h-8 rounded-lg flex items-center justify-center font-black text-sm tracking-widest"
            style={{ backgroundColor: selectedColor, color: '#070a13', boxShadow: `0 0 16px ${selectedColor}` }}
          >
            NT
          </div>
          <span className="font-bold text-xl tracking-tight text-white font-mono">NEON TANK ARENA</span>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={onOpenServerSettings}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-800 bg-slate-900/80 hover:bg-slate-800 text-slate-300 hover:text-white text-xs transition-colors"
            title="Sunucu Bağlantı Ayarları"
          >
            <span
              className={`w-2 h-2 rounded-full ${isConnected ? 'bg-emerald-400' : 'bg-rose-400 animate-pulse'}`}
            />
            <Server className="w-3.5 h-3.5 text-cyan-400" />
            <span className="hidden sm:inline">{isConnected ? 'Sunucu Bağlı' : 'Sunucu Ayarı'}</span>
          </button>

          <button
            onClick={toggleSound}
            className="flex items-center gap-2 px-3 py-1.5 rounded-lg border border-slate-800 bg-slate-900/80 hover:bg-slate-800 text-slate-300 hover:text-white text-xs transition-colors"
            title={isMuted ? 'Sesi Aç' : 'Sesi Kapat'}
          >
            {isMuted ? <VolumeX className="w-4 h-4 text-rose-400" /> : <Volume2 className="w-4 h-4 text-cyan-400" />}
            <span className="hidden sm:inline">{isMuted ? 'Ses Kapalı' : 'Ses Açık'}</span>
          </button>
        </div>
      </header>

      {/* Hero Centerpiece: Tank Visualizer & Title */}
      <main className="relative z-10 max-w-2xl mx-auto w-full flex flex-col items-center text-center my-auto py-6">
        {/* Interactive SVG Tank Hero Centrepiece */}
        <div className="relative w-36 h-36 mb-5 flex items-center justify-center">
          <div
            className="absolute inset-0 rounded-full blur-2xl opacity-25"
            style={{ backgroundColor: selectedColor }}
          />

          <svg width="130" height="130" viewBox="-65 -65 130 130" className="relative z-10 drop-shadow-xl">
            {/* Tank Treads */}
            <rect x="-38" y="-34" width="76" height="15" rx="3" fill="#0f172a" stroke="#334155" strokeWidth="2.5" />
            <rect x="-38" y="19" width="76" height="15" rx="3" fill="#0f172a" stroke="#334155" strokeWidth="2.5" />
            {/* Chassis Body */}
            <rect x="-28" y="-22" width="56" height="44" rx="4" fill="#1e293b" stroke="#334155" strokeWidth="2" />
            {/* Neon Armor Accents */}
            <rect x="-22" y="-17" width="44" height="7" rx="1.5" fill={selectedColor} />
            <rect x="-22" y="10" width="44" height="7" rx="1.5" fill={selectedColor} />

            {/* Rotating Turret */}
            <g transform={`rotate(${(aimAngle * 180) / Math.PI})`}>
              {/* Cannon Barrel */}
              <rect x="0" y="-5" width="42" height="10" rx="2" fill="#334155" stroke={selectedColor} strokeWidth="2" />
              {/* Turret Hatch */}
              <circle cx="0" cy="0" r="18" fill="#0f172a" stroke={selectedColor} strokeWidth="3" />
              <circle cx="0" cy="0" r="7" fill={selectedColor} />
            </g>
          </svg>
        </div>

        <h1 className="text-4xl sm:text-5xl font-extrabold tracking-tight text-white mb-2 font-mono uppercase">
          NEON TANK <span style={{ color: selectedColor }}>ARENA</span>
        </h1>
        <p className="text-slate-400 text-sm max-w-md mb-8">
          Gerçek zamanlı tarayıcı tabanlı arena savaşı. Seken mermiler, taktiksel barikatlar ve son tank ayakta kalana kadar arkadaşlarınla kapışma!
        </p>

        {/* Pilot Setup Box */}
        <div className="w-full bg-slate-900/90 border border-slate-800 rounded-2xl p-5 mb-6 backdrop-blur-sm shadow-2xl">
          <div className="flex flex-col sm:flex-row items-center gap-4 mb-5">
            <div className="w-full text-left">
              <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5">
                Pilot Çağrı Adı
              </label>
              <input
                type="text"
                maxLength={16}
                value={pilotName}
                onChange={(e) => setPilotName(e.target.value)}
                placeholder="Örn: Viper, Ghost, Titan..."
                className="w-full px-4 py-2.5 bg-slate-950 border border-slate-700 rounded-lg text-white font-medium focus:outline-none focus:border-cyan-500 transition-colors"
              />
            </div>
          </div>

          {/* Color Selector */}
          <div className="text-left">
            <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
              Tank Rengi Seçimi
            </label>
            <div className="flex items-center justify-between gap-2">
              {COLOR_OPTIONS.map((col) => (
                <button
                  key={col.hex}
                  type="button"
                  onClick={() => setSelectedColor(col.hex)}
                  className={`flex-1 h-9 rounded-lg transition-transform flex items-center justify-center ${
                    selectedColor === col.hex ? 'ring-2 ring-white scale-110 shadow-lg' : 'opacity-70 hover:opacity-100 hover:scale-105'
                  }`}
                  style={{ backgroundColor: col.hex }}
                  title={col.name}
                >
                  {selectedColor === col.hex && <div className="w-2.5 h-2.5 bg-white rounded-full shadow" />}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Primary Action Buttons */}
        <div className="w-full grid grid-cols-1 sm:grid-cols-2 gap-3 mb-6">
          <button
            onClick={onQuickPlay}
            className="flex items-center justify-center gap-2 py-3.5 px-6 rounded-xl font-bold text-slate-950 transition-all hover:brightness-110 active:scale-[0.98] shadow-lg shadow-cyan-950/40"
            style={{ backgroundColor: selectedColor }}
          >
            <Play className="w-5 h-5 fill-current" />
            <span>Hızlı Oyuna Başla</span>
          </button>

          <button
            onClick={onOpenJoinCode}
            className="flex items-center justify-center gap-2 py-3.5 px-6 rounded-xl font-bold text-white bg-slate-800 hover:bg-slate-700 border border-slate-700 transition-all active:scale-[0.98]"
          >
            <Hash className="w-5 h-5 text-amber-400" />
            <span>Oda Kodu ile Katıl</span>
          </button>

          <button
            onClick={onOpenBrowse}
            className="flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl text-sm font-semibold text-slate-300 hover:text-white bg-slate-900/80 hover:bg-slate-800 border border-slate-800 transition-colors"
          >
            <Compass className="w-4 h-4 text-cyan-400" />
            <span>Açık Odalara Göz At</span>
          </button>

          <button
            onClick={onOpenCreate}
            className="flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl text-sm font-semibold text-slate-300 hover:text-white bg-slate-900/80 hover:bg-slate-800 border border-slate-800 transition-colors"
          >
            <Plus className="w-4 h-4 text-emerald-400" />
            <span>Özel Oda Oluştur</span>
          </button>
        </div>
      </main>

      {/* Bottom Controls Bar */}
      <footer className="relative z-10 max-w-4xl mx-auto w-full text-center text-xs text-slate-500 pb-2">
        <div className="flex flex-wrap items-center justify-center gap-x-6 gap-y-2 font-mono">
          <span><strong className="text-slate-300">WASD / Ok Tuşları:</strong> Sürüş</span>
          <span>·</span>
          <span><strong className="text-slate-300">Fare:</strong> 360° Nişan Alma</span>
          <span>·</span>
          <span><strong className="text-slate-300">Sol Tık / Boşluk:</strong> Top Ateşi</span>
          <span>·</span>
          <span><strong className="text-slate-300">Shift:</strong> Hız Takviyesi</span>
        </div>
      </footer>
    </div>
  );
};
