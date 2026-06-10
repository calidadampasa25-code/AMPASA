'use client';

import React from 'react';

export interface SidebarItem {
  id: string;
  label: string;
  icon?: React.ReactNode;
  count?: number;
}

interface SupabaseSidebarProps {
  title?: string;
  items: SidebarItem[];
  activeId: string;
  onChange: (id: string) => void;
  footer?: React.ReactNode;
  className?: string;
}

export function SupabaseSidebar({
  title,
  items,
  activeId,
  onChange,
  footer,
  className = '',
}: SupabaseSidebarProps) {
  return (
    <div className={`w-56 shrink-0 border-r border-[#2e2e2e] bg-[#0f0f0f] flex flex-col ${className}`}>
      {title && (
        <div className="px-4 py-3 text-xs font-medium uppercase tracking-widest text-[#3ecf8e] border-b border-[#2e2e2e]">
          {title}
        </div>
      )}

      <div className="flex-1 py-2">
        {items.map((item) => {
          const isActive = item.id === activeId;
          return (
            <button
              key={item.id}
              onClick={() => onChange(item.id)}
              className={`
                w-full flex items-center gap-3 px-4 py-2 text-left text-sm transition-colors
                ${isActive
                  ? 'bg-[#1a1a1a] text-[#3ecf8e] border-l-2 border-[#3ecf8e]'
                  : 'text-[#a1a1aa] hover:text-[#f1f1f1] hover:bg-[#161616] border-l-2 border-transparent'
                }
              `}
            >
              {item.icon && <span className="w-4 text-center opacity-80">{item.icon}</span>}
              <span className="flex-1 truncate">{item.label}</span>
              {typeof item.count === 'number' && (
                <span className="text-[10px] px-1.5 py-0.5 rounded bg-[#2e2e2e] text-[#a1a1aa]">
                  {item.count}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {footer && (
        <div className="border-t border-[#2e2e2e] p-3 text-xs text-[#666]">
          {footer}
        </div>
      )}
    </div>
  );
}
