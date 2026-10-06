import React from 'react';
import { Loader2 } from 'lucide-react';

interface LoadingSpinnerProps {
  message?: string;
  className?: string;
}

export const LoadingSpinner: React.FC<LoadingSpinnerProps> = ({
  message = 'Loading data...',
  className = 'py-12',
}) => {
  return (
    <div className={`flex flex-col items-center justify-center gap-3 text-slate-500 ${className}`}>
      <Loader2 className="w-7 h-7 animate-spin text-blue-600" />
      <span className="text-xs font-medium">{message}</span>
    </div>
  );
};
