// v1.1.0
import React from 'react';
import { AlertTriangle } from 'lucide-react';

interface AlertBannerProps {
  messages: string[];
}

export const AlertBanner: React.FC<AlertBannerProps> = ({ messages }) => {
  if (messages.length === 0) return null;

  return (
    <div className="border border-line mb-6 overflow-hidden">
      {/* Warning tape header */}
      <div
        className="px-4 py-2 flex items-center gap-2"
        style={{
          background: 'repeating-linear-gradient(45deg, #F97316, #F97316 15px, #1E293B 15px, #1E293B 30px)',
        }}
      >
        <AlertTriangle size={18} className="text-white flex-shrink-0" />
        <span className="text-white font-black uppercase tracking-widest text-sm">Alertas Activas</span>
      </div>
      {/* Messages */}
      <div className="bg-warn/10 divide-y divide-slate-200">
        {messages.map((msg, i) => (
          <div key={i} className="px-4 py-2 flex items-center gap-2">
            <AlertTriangle size={14} className="text-brand-600 flex-shrink-0" />
            <span className="text-sm font-semibold text-content">{msg}</span>
          </div>
        ))}
      </div>
    </div>
  );
};
