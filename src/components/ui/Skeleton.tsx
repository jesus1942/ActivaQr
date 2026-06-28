// v1.1.0
// Skeletons de carga con shimmer. Bloques reutilizables.
import React from 'react';

interface SkeletonProps {
  className?: string;
}

export const Skeleton: React.FC<SkeletonProps> = ({ className = '' }) => (
  <div className={`skeleton animate-shimmer rounded-md ${className}`} />
);

// Skeleton de tarjeta de activo (grid)
export const SkeletonCard: React.FC = () => (
  <div className="bg-surface border border-line rounded-lg shadow-soft p-6 space-y-4">
    <div className="flex justify-between">
      <Skeleton className="h-6 w-20" />
      <Skeleton className="h-6 w-16" />
    </div>
    <Skeleton className="h-8 w-3/4" />
    <Skeleton className="h-4 w-1/2" />
    <div className="space-y-2 pt-2">
      <Skeleton className="h-3 w-full" />
      <Skeleton className="h-3 w-2/3" />
    </div>
  </div>
);

// Skeleton de tarjeta de métrica
export const SkeletonStat: React.FC = () => (
  <div className="bg-surface border border-line rounded-lg shadow-soft p-6 space-y-3">
    <Skeleton className="h-10 w-10 rounded-md" />
    <Skeleton className="h-8 w-16" />
    <Skeleton className="h-3 w-24" />
  </div>
);
