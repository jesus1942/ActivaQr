// v1.1.0
import React from 'react';

interface ValueGaugeProps {
  label: string;
  value: number;
  min: number;
  max: number;
  alertThreshold: number;
  criticalThreshold: number;
  unit?: string;
}

export const ValueGauge: React.FC<ValueGaugeProps> = ({
  label,
  value,
  min,
  max,
  alertThreshold,
  criticalThreshold,
  unit = '',
}) => {
  // Normalize positions as percentages
  const range = criticalThreshold - min;
  const alertPos = range > 0 ? ((alertThreshold - min) / range) * 100 : 70;
  const critPos = 100;
  const valuePos = range > 0 ? Math.max(0, Math.min(100, ((value - min) / range) * 100)) : 50;

  const isAlert = value >= alertThreshold;
  const isCritical = value >= criticalThreshold;

  // For cold chambers: direction might be inverted (higher temp = worse)
  // We handle this by checking if alertThreshold > criticalThreshold (cold chambers use negative values and alert is "warmer")
  const isColdAsset = alertThreshold > criticalThreshold;

  let statusColor = 'text-ok-strong dark:text-ok';
  if (isColdAsset) {
    if (value >= alertThreshold) statusColor = 'text-brand-600';
    if (value >= criticalThreshold) statusColor = 'text-danger';
  } else {
    if (isAlert) statusColor = 'text-brand-600';
    if (isCritical) statusColor = 'text-danger';
  }

  return (
    <div className="mb-4">
      <div className="flex justify-between items-baseline mb-1">
        <span className="text-xs font-bold uppercase tracking-wider text-muted">{label}</span>
        <span className={`text-2xl font-black font-mono ${statusColor}`}>
          {value}
          <span className="text-sm ml-1">{unit}</span>
        </span>
      </div>
      <div className="relative h-4 border border-line bg-subtle overflow-hidden">
        {/* Green segment */}
        <div
          className="absolute left-0 top-0 h-full bg-ok"
          style={{ width: `${alertPos}%` }}
        />
        {/* Yellow/orange segment */}
        <div
          className="absolute top-0 h-full bg-orange-400"
          style={{ left: `${alertPos}%`, width: `${critPos - alertPos}%` }}
        />
        {/* Value marker */}
        <div
          className="absolute top-0 h-full w-1 bg-content z-10"
          style={{ left: `${valuePos}%` }}
        />
      </div>
      <div className="flex justify-between mt-0.5">
        <span className="text-xs font-mono text-faint">{min}{unit}</span>
        <span className="text-xs font-mono text-brand-600">{alertThreshold}{unit}</span>
        <span className="text-xs font-mono text-danger">{criticalThreshold}{unit}</span>
      </div>
    </div>
  );
};
