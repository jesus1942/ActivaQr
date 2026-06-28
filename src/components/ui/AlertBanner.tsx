// v1.1.0
import React from 'react';
import { AlertTriangle } from 'lucide-react';

interface AlertBannerProps {
  messages: string[];
}

export const AlertBanner: React.FC<AlertBannerProps> = ({ messages }) => {
  if (messages.length === 0) return null;

  return (
    <div className="bg-surface border border-line rounded-lg shadow-soft overflow-hidden animate-fade-up">
      <div className="px-5 py-3.5 flex items-center gap-2.5 border-b border-line">
        <span className="grid place-items-center w-7 h-7 text-danger shrink-0">
          <AlertTriangle size={15} />
        </span>
        <span className="font-display font-bold text-content text-sm">
          Alertas activas
        </span>
        <span className="ml-auto text-xs font-semibold text-danger">
          {messages.length} activas
        </span>
      </div>
      <div className="divide-y divide-line">
        {messages.map((msg, i) => (
          <div key={i} className="px-5 py-3 flex items-center gap-2.5">
            <span className="w-1 h-4 rounded-sm bg-danger shrink-0" />
            <span className="text-sm font-medium text-muted">{msg}</span>
          </div>
        ))}
      </div>
    </div>
  );
};
