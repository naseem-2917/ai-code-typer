import React, { forwardRef, useContext, useRef, useImperativeHandle } from 'react';
import { AppContext } from '../../context/AppContext';
import { useAccessKey } from '../../hooks/useAccessKey';
import { AccessKeyLabel } from './AccessKeyLabel';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'ghost' | 'outline';
  size?: 'sm' | 'md' | 'lg' | 'icon';
  accessKeyChar?: string;
  accessKeyLabel?: string;
  accessKey?: string;
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(({
  children,
  className = '',
  variant = 'primary',
  size = 'md',
  accessKeyChar,
  accessKeyLabel,
  accessKey, // Destructure accessKey to prevent passing it to DOM element
  ...props
}, ref) => {
  const context = useContext(AppContext);
  const buttonRef = useRef<HTMLButtonElement>(null);

  useImperativeHandle(ref, () => buttonRef.current!);

  // Use accessKey prop as fallback for accessKeyChar
  const effectiveAccessKey = accessKeyChar || accessKey;

  useAccessKey(effectiveAccessKey, () => {
    buttonRef.current?.click();
  }, { disabled: props.disabled });

  const baseClasses = 'relative inline-flex items-center justify-center rounded-lg font-semibold transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 dark:focus:ring-offset-slate-900 disabled:opacity-50 disabled:cursor-not-allowed active:scale-[0.97]';

  const variantClasses = {
    primary: 'bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 text-white hover:from-indigo-600 hover:via-purple-600 hover:to-pink-600 focus:ring-purple-500 shadow-md hover:shadow-lg hover:shadow-purple-500/25',
    secondary: 'bg-slate-200 text-slate-800 hover:bg-slate-300 dark:bg-slate-700 dark:text-slate-200 dark:hover:bg-slate-600 focus:ring-slate-500',
    ghost: 'hover:bg-slate-200/80 dark:hover:bg-slate-700/80 text-slate-700 dark:text-slate-300 focus:ring-slate-500',
    outline: 'border border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-300 hover:bg-slate-100/80 dark:hover:bg-slate-800/80 hover:border-purple-400 dark:hover:border-purple-500 focus:ring-purple-500',
  };

  const sizeClasses = {
    sm: 'px-3 py-1.5 text-sm',
    md: 'px-4 py-2 text-base',
    lg: 'px-6 py-3 text-lg',
    icon: 'h-10 w-10',
  };

  return (
    <button
      ref={buttonRef}
      className={`${baseClasses} ${variantClasses[variant]} ${sizeClasses[size]} ${className}`}
      {...props}
    >
      {context?.isAccessKeyMenuVisible && effectiveAccessKey && !props.disabled && (
        <AccessKeyLabel label={accessKeyLabel || effectiveAccessKey} />
      )}
      {children}
    </button>
  );
});

Button.displayName = 'Button';