import React, { forwardRef, useContext, useRef, useImperativeHandle } from 'react';
import { AppContext } from '../../context/AppContext';
import { useAccessKey } from '../../hooks/useAccessKey';
import { AccessKeyLabel } from './AccessKeyLabel';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'ghost';
  size?: 'sm' | 'md' | 'lg' | 'icon';
  accessKeyChar?: string;
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(({
  children,
  className = '',
  variant = 'primary',
  size = 'md',
  accessKeyChar,
  ...props
}, ref) => {
  const context = useContext(AppContext);
  const buttonRef = useRef<HTMLButtonElement>(null);
  
  useImperativeHandle(ref, () => buttonRef.current!);

  useAccessKey(accessKeyChar, () => {
    buttonRef.current?.click();
  }, { disabled: props.disabled });

  const baseClasses = 'relative inline-flex items-center justify-center rounded-md font-semibold transition-all focus:outline-none focus:ring-2 focus:ring-offset-2 dark:focus:ring-offset-slate-900 disabled:opacity-50 disabled:cursor-not-allowed';

  const variantClasses = {
    primary: 'bg-primary-600 text-white hover:bg-primary-700 focus:ring-primary-500',
    secondary: 'bg-slate-200 text-slate-800 hover:bg-slate-300 dark:bg-slate-700 dark:text-slate-200 dark:hover:bg-slate-600 focus:ring-slate-500',
    ghost: 'hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 focus:ring-slate-500',
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
      {context?.isAccessKeyMenuVisible && accessKeyChar && !props.disabled && (
        <AccessKeyLabel label={accessKeyChar} />
      )}
      {children}
    </button>
  );
});

Button.displayName = 'Button';
