import React from 'react';
import { Button } from './Button.tsx';

interface EmptyStateProps {
  icon?: React.ReactNode;
  title: string;
  description: string;
  actionText?: string;
  onAction?: () => void;
  className?: string;
}

export const EmptyState: React.FC<EmptyStateProps> = ({
  icon,
  title,
  description,
  actionText,
  onAction,
  className = 'py-12',
}) => {
  return (
    <div className={`flex flex-col items-center justify-center text-center p-6 bg-slate-50 border border-dashed border-slate-200 rounded-xl ${className}`}>
      {icon && <div className="text-slate-400 mb-3">{icon}</div>}
      <h3 className="text-sm font-semibold text-slate-800">{title}</h3>
      <p className="text-xs text-slate-500 max-w-sm mt-1 mb-4 leading-relaxed">{description}</p>
      {actionText && onAction && (
        <Button size="sm" onClick={onAction}>
          {actionText}
        </Button>
      )}
    </div>
  );
};
