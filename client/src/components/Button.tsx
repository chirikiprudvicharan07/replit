import React from 'react';
import { Loader2 } from 'lucide-react';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'danger' | 'ghost' | 'outline';
  size?: 'sm' | 'md' | 'lg';
  isLoading?: boolean;
  icon?: React.ReactNode;
}

export const Button: React.FC<ButtonProps> = ({
  children,
  variant = 'primary',
  size = 'md',
  isLoading = false,
  disabled,
  icon,
  className = '',
  ...props
}) => {
  let variantStyles = 'bg-blue-600 text-white hover:bg-blue-700 shadow-sm focus-visible:ring-blue-500';

  if (variant === 'secondary') {
    variantStyles = 'bg-slate-100 text-slate-900 hover:bg-slate-200 focus-visible:ring-slate-400';
  } else if (variant === 'danger') {
    variantStyles = 'bg-rose-600 text-white hover:bg-rose-700 shadow-sm focus-visible:ring-rose-500';
  } else if (variant === 'outline') {
    variantStyles = 'border border-slate-300 bg-white text-slate-700 hover:bg-slate-50 focus-visible:ring-blue-500';
  } else if (variant === 'ghost') {
    variantStyles = 'text-slate-600 hover:text-slate-900 hover:bg-slate-100 focus-visible:ring-slate-400';
  }

  let sizeStyles = 'py-2 px-4 text-sm';
  if (size === 'sm') sizeStyles = 'py-1.5 px-3 text-xs';
  if (size === 'lg') sizeStyles = 'py-2.5 px-5 text-base';

  return (
    <button
      disabled={disabled || isLoading}
      className={`inline-flex items-center justify-center gap-2 font-medium rounded-lg transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-1 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer ${variantStyles} ${sizeStyles} ${className}`}
      {...props}
    >
      {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : icon ? icon : null}
      {children}
    </button>
  );
};
