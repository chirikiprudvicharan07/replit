import React from 'react';

interface BadgeProps {
  variant?: 'high' | 'medium' | 'low' | 'neutral' | 'present' | 'absent' | 'late' | 'excused';
  children: React.ReactNode;
  className?: string;
}

export const Badge: React.FC<BadgeProps> = ({ variant = 'neutral', children, className = '' }) => {
  let styleClasses = 'text-slate-700 bg-slate-100 border border-slate-200';

  switch (variant) {
    case 'high':
    case 'absent':
      styleClasses = 'text-rose-700 bg-rose-50 border border-rose-200 font-medium';
      break;
    case 'medium':
    case 'late':
      styleClasses = 'text-amber-800 bg-amber-50 border border-amber-200 font-medium';
      break;
    case 'low':
    case 'present':
      styleClasses = 'text-emerald-800 bg-emerald-50 border border-emerald-200 font-medium';
      break;
    case 'excused':
      styleClasses = 'text-sky-800 bg-sky-50 border border-sky-200 font-medium';
      break;
    default:
      styleClasses = 'text-slate-700 bg-slate-100 border border-slate-200';
      break;
  }

  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded text-xs tracking-tight ${styleClasses} ${className}`}
    >
      <span className="w-1.5 h-1.5 rounded-full bg-current opacity-70" aria-hidden="true" />
      {children}
    </span>
  );
};
