'use client'

import { useState } from 'react'
import { createSupabaseBrowserClient } from '@/app/lib/supabase-browser'

const supabase = createSupabaseBrowserClient()

export default function LoginPage() {
  const [loading, setLoading] = useState(false)

  const handleGoogleLogin = async () => {
    setLoading(true)
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${window.location.origin}/auth/callback`,
        queryParams: {
          prompt: 'select_account', // Forces Google to show account picker every time
        },
      },
    })
    if (error) {
      alert('Error al iniciar sesión con Google: ' + error.message)
      setLoading(false)
    }
  }

  const handleMicrosoftLogin = async () => {
    setLoading(true)
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'azure',
      options: {
        redirectTo: `${window.location.origin}/auth/callback`,
        queryParams: {
          prompt: 'select_account', // Forces Microsoft to show account picker every time
        },
      },
    })
    if (error) {
      alert('Error al iniciar sesión con Microsoft: ' + error.message)
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#0a0a0a] text-[#f1f1f1]">
      <div className="max-w-md w-full mx-4">
        <div className="card p-10">
          {/* Header - Supabase dark style */}
          <div className="text-center mb-10">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-[#3ecf8e]/10 rounded-full mb-6 border border-[#3ecf8e]/20">
              <span className="text-4xl">🏭</span>
            </div>
            <h1 className="text-4xl font-semibold tracking-tight mb-2">AMPASA CALIDAD</h1>
            <p className="text-[#a1a1aa]">Sistema de Gestión de Documentos</p>
          </div>

          {/* Login buttons - clean dark */}
          <div className="space-y-3">
            <button
              onClick={handleGoogleLogin}
              disabled={loading}
              className="w-full flex items-center justify-center gap-3 px-6 py-3.5 bg-[#1a1a1a] border border-[#2e2e2e] hover:border-[#3a3a3a] hover:bg-[#1f1f1f] rounded-xl transition-all disabled:opacity-50 text-sm font-medium"
            >
              <svg className="w-5 h-5" viewBox="0 0 24 24">
                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.51h5.92c-.25 1.35-1.01 2.5-2.15 3.27v2.71h3.47c2.03-1.87 3.2-4.62 3.2-8.24z"/>
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.47-2.71c-.98.66-2.23 1.06-3.81 1.06-2.93 0-5.42-1.98-6.3-4.64H2.08v2.92C3.92 20.54 7.74 23 12 23z"/>
                <path fill="#FBBC05" d="M5.7 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.08C1.38 8.8 1 10.74 1 12.75s.38 3.95 1.08 5.68l3.62-2.34z"/>
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.74 1 3.92 3.46 2.08 7.07l3.62 2.92c.88-2.66 3.37-4.61 6.3-4.61z"/>
              </svg>
              <span>Continuar con Google</span>
            </button>

            <button
              onClick={handleMicrosoftLogin}
              disabled={loading}
              className="w-full flex items-center justify-center gap-3 px-6 py-3.5 bg-[#1a1a1a] border border-[#2e2e2e] hover:border-[#3a3a3a] hover:bg-[#1f1f1f] rounded-xl transition-all disabled:opacity-50 text-sm font-medium"
            >
              <svg className="w-5 h-5" viewBox="0 0 24 24">
                <path fill="#F25022" d="M1 1h10v10H1z"/>
                <path fill="#00A4EF" d="M13 1h10v10H13z"/>
                <path fill="#7FBA00" d="M1 13h10v10H1z"/>
                <path fill="#FFB900" d="M13 13h10v10H13z"/>
              </svg>
              <span>Continuar con Microsoft</span>
            </button>
          </div>

          <div className="mt-8 pt-6 border-t border-[#2e2e2e] text-center">
            <p className="text-sm text-[#a1a1aa]">
              Solo usuarios aprobados pueden acceder al sistema
            </p>
          </div>
        </div>

        <p className="text-center text-xs text-[#666] mt-8">
          AMPASA CALIDAD © 2026 • UI inspirada en Supabase
        </p>
      </div>
    </div>
  )
}