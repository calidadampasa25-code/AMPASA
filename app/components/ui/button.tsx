'use client';

import React from 'react';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger';
  size?: 'sm' | 'md' | 'lg';
}

export function Button({
  variant = 'primary',
  size = 'md',
  className = '',
  children,
  ...props
}: ButtonProps) {
  const base = 'inline-flex items-center justify-center gap-2 rounded-md font-medium transition-all focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-[#0a0a0a] disabled:opacity-60 disabled:cursor-not-allowed';

  const sizes = {
    sm: 'px-3 py-1.5 text-sm',
    md: 'px-4 py-2 text-sm',
    lg: 'px-5 py-2.5 text-base',
  };

  const variants = {
    primary: 'bg-[#3ecf8e] text-black hover:brightness-105 active:brightness-95 shadow-sm',
    secondary: 'bg-[#1f1f1f] text-[#f1f1f1] border border-[#2e2e2e] hover:bg-[#27272a] hover:border-[#3a3a3a]',
    ghost: 'text-[#a1a1aa] hover:text-[#f1f1f1] hover:bg-[#1f1f1f]',
    danger: 'bg-red-600/90 text-white hover:bg-red-600 active:bg-red-700',
  };

  return (
    <button
      className={`${base} ${sizes[size]} ${variants[variant]} ${className}`}
      {...props}
    >
      {children}
    </button>
  );
}
