'use client';

import React, { useState, useRef, useEffect } from 'react';
import { createSupabaseBrowserClient } from '@/app/lib/supabase-browser';
import { useRouter, useSearchParams } from 'next/navigation';
import { Search, LogOut, User, Settings, HelpCircle, ChevronDown } from 'lucide-react';
import { signOutAction } from '@/app/actions/auth';

interface NavbarProps {
  // Optional: pass user from server if available, otherwise component fetches
  userEmail?: string | null;
  userName?: string | null;
}

export default function Navbar({ userEmail, userName }: NavbarProps) {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [user, setUser] = useState<{ email: string | null; fullName: string | null } | null>(null);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [searchValue, setSearchValue] = useState('');
  const [isMobileSearchOpen, setIsMobileSearchOpen] = useState(false);

  const dropdownRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const router = useRouter();
  const searchParams = useSearchParams();
  const supabase = createSupabaseBrowserClient();

  // Current scope from URL (for Drive search)
  const currentScope = (searchParams.get('scope') as 'current' | 'global') || 'current';
  const currentQuery = searchParams.get('q') || '';

  // Fetch current session on mount (or use passed props)
  useEffect(() => {
    const checkSession = async () => {
      if (userEmail) {
        // Server-provided user
        setIsLoggedIn(true);
        setUser({
          email: userEmail,
          fullName: userName || null,
        });
        return;
      }

      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user) {
        setIsLoggedIn(true);
        setUser({
          email: session.user.email || null,
          fullName: (session.user.user_metadata?.full_name as string) || null,
        });
      } else {
        setIsLoggedIn(false);
        setUser(null);
      }
    };

    checkSession();

    // Listen for auth changes (login/logout in other tabs or after OAuth)
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (session?.user) {
        setIsLoggedIn(true);
        setUser({
          email: session.user.email || null,
          fullName: (session.user.user_metadata?.full_name as string) || null,
        });
      } else {
        setIsLoggedIn(false);
        setUser(null);
        setDropdownOpen(false);
      }
    });

    return () => subscription.unsubscribe();
  }, [userEmail, userName, supabase]);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setDropdownOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Keyboard shortcut for search (Ctrl+K / Cmd+K)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        if (window.innerWidth < 768) {
          setIsMobileSearchOpen(true);
        } else {
          searchInputRef.current?.focus();
          searchInputRef.current?.select();
        }
      }
      if (e.key === 'Escape') {
        setIsMobileSearchOpen(false);
        setDropdownOpen(false);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Sync local input with URL q (when coming from URL or other changes)
  useEffect(() => {
    if (currentQuery !== searchValue) {
      setSearchValue(currentQuery);
    }
  }, [currentQuery]);

  // Update URL when search or scope changes (debounced for typing)
  const updateSearchParams = (newQuery: string, newScope: 'current' | 'global') => {
    const params = new URLSearchParams(searchParams.toString());

    if (newQuery.trim()) {
      params.set('q', newQuery.trim());
    } else {
      params.delete('q');
    }

    params.set('scope', newScope);

    // Use replace to avoid polluting history while typing
    router.replace(`?${params.toString()}`, { scroll: false });
  };

  const handleSearchInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setSearchValue(val);

    // Debounce the URL update
    const timeout = setTimeout(() => {
      updateSearchParams(val, currentScope);
    }, 250);

    // Clear previous timeout if typing fast
    return () => clearTimeout(timeout);
  };

  const setScope = (newScope: 'current' | 'global') => {
    updateSearchParams(searchValue, newScope);
  };

  const clearSearch = () => {
    setSearchValue('');
    const params = new URLSearchParams(searchParams.toString());
    params.delete('q');
    router.replace(`?${params.toString()}`, { scroll: false });
  };

  const getInitials = (name: string | null, email: string | null) => {
    if (name) {
      return name
        .split(' ')
        .map((n) => n[0])
        .join('')
        .toUpperCase()
        .slice(0, 2);
    }
    if (email) {
      return email[0].toUpperCase();
    }
    return 'U';
  };

  // Logout now uses Server Action (avoids 405 error)

  const avatarInitials = getInitials(user?.fullName || null, user?.email || null);

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 bg-[#0a0a0a] border-b border-[#2e2e2e]">
      <div className="h-14 px-4 flex items-center justify-between max-w-screen-2xl mx-auto">
        {/* IZQUIERDA: Logo + Nombre */}
        <div className="flex items-center gap-3 min-w-0">
          <div className="flex items-center gap-2.5">
            {/* Logo placeholder - simple factory icon */}
            <div className="w-8 h-8 bg-[#3ecf8e] rounded-lg flex items-center justify-center text-black font-bold text-lg flex-shrink-0">
              🏭
            </div>
            <div className="flex items-center gap-2 min-w-0">
              <span className="font-semibold text-[#f1f1f1] text-lg tracking-tight whitespace-nowrap">
                Calidad Ampasa
              </span>
              {/* Optional environment badge */}
              <span className="hidden sm:inline px-2 py-0.5 text-[10px] font-medium bg-[#1f1f1f] text-[#a1a1aa] rounded border border-[#2e2e2e]">
                PROD
              </span>
            </div>
          </div>
        </div>

        {/* CENTRO: Barra de búsqueda - SOLO si está logueado */}
        {isLoggedIn && (
          <div className="flex-1 max-w-md mx-4 hidden md:block">
            <div className="relative group">
              {/* Scope tabs: Carpeta actual / Todo el Drive */}
              <div className="flex items-center gap-1 mb-1">
                <button
                  onClick={() => setScope('current')}
                  className={`text-[11px] px-2.5 py-0.5 rounded-full transition-all ${currentScope === 'current' 
                    ? 'bg-[#3ecf8e] text-black font-medium' 
                    : 'bg-[#1f1f1f] text-[#a1a1aa] hover:text-[#f1f1f1] hover:bg-[#2a2a2a]'}`}
                >
                  Carpeta actual
                </button>
                <button
                  onClick={() => setScope('global')}
                  className={`text-[11px] px-2.5 py-0.5 rounded-full transition-all ${currentScope === 'global' 
                    ? 'bg-[#3ecf8e] text-black font-medium' 
                    : 'bg-[#1f1f1f] text-[#a1a1aa] hover:text-[#f1f1f1] hover:bg-[#2a2a2a]'}`}
                >
                  Todo el Drive
                </button>
              </div>

              <form className="relative" onSubmit={(e) => { e.preventDefault(); }}>
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#666]" />
                <input
                  ref={searchInputRef}
                  type="text"
                  value={searchValue}
                  onChange={handleSearchInputChange}
                  placeholder={currentScope === 'current' 
                    ? "Buscar en la carpeta actual..." 
                    : "Buscar en todo el Drive (full-text)..."
                  }
                  className="w-full bg-[#111] border border-[#2e2e2e] focus:border-[#3a3a3a] text-sm text-[#f1f1f1] placeholder-[#666] rounded-lg pl-9 pr-20 py-2 outline-none transition-colors"
                />
                {/* Keyboard shortcut hint */}
                <div className="absolute right-3 top-1/2 -translate-y-1/2 hidden lg:flex items-center gap-0.5 text-[10px] text-[#666] font-mono bg-[#1a1a1a] px-1.5 py-0.5 rounded border border-[#2e2e2e]">
                  <span>⌘</span>
                  <span>K</span>
                </div>
              </form>

              {(currentQuery || searchValue) && (
                <button 
                  onClick={clearSearch} 
                  className="absolute -bottom-4 right-0 text-[10px] text-[#3ecf8e] hover:underline"
                >
                  Limpiar
                </button>
              )}
            </div>
          </div>
        )}

        {/* Mobile search icon - only when logged in */}
        {isLoggedIn && (
          <button
            onClick={() => setIsMobileSearchOpen(!isMobileSearchOpen)}
            className="md:hidden p-2 text-[#a1a1aa] hover:text-[#f1f1f1] hover:bg-[#1f1f1f] rounded-lg transition-colors"
            aria-label="Buscar"
          >
            <Search className="w-5 h-5" />
          </button>
        )}

        {/* DERECHA: Auth controls */}
        <div className="flex items-center gap-2">
          {!isLoggedIn ? (
            <a
              href="/login"
              className="px-4 py-1.5 text-sm font-medium bg-[#3ecf8e] hover:brightness-105 text-black rounded-lg transition-all"
            >
              Iniciar sesión
            </a>
          ) : (
            <div className="relative" ref={dropdownRef}>
              <button
                onClick={() => setDropdownOpen(!dropdownOpen)}
                className="flex items-center gap-2 pl-1 pr-2 py-1 rounded-lg hover:bg-[#1f1f1f] transition-colors group"
                aria-haspopup="true"
                aria-expanded={dropdownOpen}
              >
                {/* Avatar */}
                <div className="w-8 h-8 rounded-full bg-[#3ecf8e] text-black flex items-center justify-center text-sm font-semibold ring-2 ring-[#0a0a0a] group-hover:ring-[#1f1f1f] transition-all">
                  {avatarInitials}
                </div>
                <div className="hidden sm:flex items-center gap-1 text-left min-w-0">
                  <span className="text-sm text-[#f1f1f1] truncate max-w-[120px]">
                    {user?.fullName || user?.email?.split('@')[0] || 'Usuario'}
                  </span>
                  <ChevronDown className="w-3.5 h-3.5 text-[#666]" />
                </div>
              </button>

              {/* Dropdown */}
              {dropdownOpen && (
                <div className="absolute right-0 mt-2 w-56 rounded-xl border border-[#2e2e2e] bg-[#0f0f0f] shadow-xl py-1 text-sm z-[60]">
                  <div className="px-4 py-2 border-b border-[#2e2e2e]">
                    <div className="font-medium text-[#f1f1f1] truncate">
                      {user?.fullName || 'Usuario'}
                    </div>
                    <div className="text-xs text-[#666] truncate">{user?.email}</div>
                  </div>

                  <a
                    href="/profile"
                    className="flex items-center gap-3 px-4 py-2.5 hover:bg-[#1a1a1a] text-[#f1f1f1] transition-colors"
                    onClick={() => setDropdownOpen(false)}
                  >
                    <User className="w-4 h-4 text-[#a1a1aa]" />
                    Perfil
                  </a>

                  <a
                    href="/profile" // TODO: create /settings or reuse profile for now
                    className="flex items-center gap-3 px-4 py-2.5 hover:bg-[#1a1a1a] text-[#f1f1f1] transition-colors"
                    onClick={() => setDropdownOpen(false)}
                  >
                    <Settings className="w-4 h-4 text-[#a1a1aa]" />
                    Configuración
                  </a>

                  <div className="h-px bg-[#2e2e2e] my-1" />

                  <form action={signOutAction} className="w-full">
                    <button
                      type="submit"
                      className="w-full flex items-center gap-3 px-4 py-2.5 text-left hover:bg-[#1a1a1a] text-red-400 hover:text-red-300 transition-colors"
                      onClick={() => setDropdownOpen(false)}
                    >
                      <LogOut className="w-4 h-4" />
                      Cerrar sesión
                    </button>
                  </form>

                  {/* Optional help */}
                  <div className="h-px bg-[#2e2e2e] my-1" />
                  <button
                    onClick={() => {
                      setDropdownOpen(false);
                      alert('Soporte: Contacta al administrador o revisa el manual interno.');
                    }}
                    className="w-full flex items-center gap-3 px-4 py-2.5 text-left hover:bg-[#1a1a1a] text-[#a1a1aa] hover:text-[#f1f1f1] transition-colors text-xs"
                  >
                    <HelpCircle className="w-4 h-4" />
                    Ayuda y soporte
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Mobile search overlay */}
      {isMobileSearchOpen && (
        <div className="md:hidden border-t border-[#2e2e2e] bg-[#0a0a0a] px-4 py-3">
          <form onSubmit={handleSearch} className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#666]" />
            <input
              type="text"
              autoFocus
              value={searchValue}
              onChange={(e) => setSearchValue(e.target.value)}
              placeholder="Buscar..."
              className="w-full bg-[#111] border border-[#2e2e2e] text-sm rounded-lg pl-9 pr-4 py-2.5 text-[#f1f1f1] placeholder-[#666] outline-none"
            />
          </form>
          <p className="text-[10px] text-[#666] mt-1.5 px-1">Presiona Esc para cerrar</p>
        </div>
      )}
    </nav>
  );
}
