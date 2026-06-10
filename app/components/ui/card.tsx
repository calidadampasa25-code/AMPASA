'use client';

import React from 'react';

interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  padding?: 'none' | 'sm' | 'md' | 'lg';
}

export function Card({ padding = 'md', className = '', children, ...props }: CardProps) {
  const paddings = {
    none: '',
    sm: 'p-3',
    md: 'p-4',
    lg: 'p-6',
  };

  return (
    <div
      className={`bg-[#1a1a1a] border border-[#2e2e2e] rounded-xl ${paddings[padding]} ${className}`}
      {...props}
    >
      {children}
    </div>
  );
}
