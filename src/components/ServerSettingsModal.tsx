import React, { useState } from 'react';
import { X, Server, Check, RotateCcw, ExternalLink } from 'lucide-react';

interface ServerSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentServerUrl: string;
  onSaveServerUrl: (url: string) => void;
  isConnected: boolean;
}

export const ServerSettingsModal: React.FC<ServerSettingsModalProps> = ({
  isOpen,
  onClose,
  currentServerUrl,
  onSaveServerUrl,
  isConnected,
}) => {
  const [inputUrl, setInputUrl] = useState(() => {
    return localStorage.getItem('neon_custom_server_url') || '';
  });

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSaveServerUrl(inputUrl.trim());
    onClose();
  };

  const handleReset = () => {
    setInputUrl('');
    onSaveServerUrl('');
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200 select-none">
      <div className="relative w-full max-w-md bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-2xl text-slate-100">
        <div className="flex items-center justify-between pb-4 border-b border-slate-800">
          <div className="flex items-center gap-2">
            <Server className="w-5 h-5 text-cyan-400" />
            <h2 className="text-lg font-bold tracking-tight">Oyun Sunucusu Ayarları</h2>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="mt-5 space-y-4">
          <div className="p-3 rounded-xl bg-slate-950 border border-slate-800/80 text-xs text-slate-400 space-y-1.5">
            <div className="flex items-center justify-between">
              <span className="font-semibold text-slate-300">Mevcut Bağlantı:</span>
              <span className={`font-mono font-bold ${isConnected ? 'text-emerald-400' : 'text-rose-400'}`}>
                {isConnected ? '● Bağlı' : '○ Bağlantı Yok'}
              </span>
            </div>
            <div className="font-mono text-[11px] text-cyan-400/90 truncate">
              {currentServerUrl}
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5">
              Özel Sunucu Adresi (İsteğe Bağlı)
            </label>
            <input
              type="text"
              value={inputUrl}
              onChange={(e) => setInputUrl(e.target.value)}
              placeholder="Örn: https://neon-tank.onrender.com"
              className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-700 rounded-lg text-white font-mono text-xs focus:outline-none focus:border-cyan-500 transition-colors"
            />
            <p className="text-[11px] text-slate-500 mt-1.5 leading-relaxed">
              Hostinger paylaşımlı hosting gibi statik alanlarda arayüzü barındırırken, Render veya Railway'e kurduğunuz ücretsiz backend adresini buraya yazabilirsiniz. Boş bırakırsanız mevcut site adresine bağlanır.
            </p>
          </div>

          <div className="flex gap-2 pt-2">
            <button
              type="button"
              onClick={handleReset}
              className="px-3 py-2.5 rounded-xl border border-slate-700 text-slate-300 hover:bg-slate-800 text-xs font-semibold transition-colors flex items-center gap-1.5"
              title="Varsayılan adrese sıfırla"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Sıfırla</span>
            </button>
            <button
              type="submit"
              className="flex-1 py-2.5 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 text-xs font-bold shadow-lg shadow-cyan-950/40 transition-all flex items-center justify-center gap-1.5"
            >
              <Check className="w-4 h-4" />
              <span>Kaydet ve Yeniden Bağlan</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
