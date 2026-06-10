import { requireApprovedUser } from '@/app/lib/supabase-server'
import { PresenceTracker } from '@/app/components/PresenceTracker'
import Link from 'next/link'

export default async function DashboardPage() {
  const { user, profile } = await requireApprovedUser()

  return (
    <>
      <PresenceTracker />
      <div className="min-h-screen bg-[#0a0a0a] text-[#f1f1f1]">
        <div className="max-w-6xl mx-auto px-8 py-12">
          <div className="flex justify-between items-start mb-10">
            <div>
              <h1 className="text-5xl font-semibold text-white tracking-tight">AMPASA CALIDAD</h1>
              <p className="mt-2 text-[#a1a1aa]">Bienvenido, {user?.email}</p>
            </div>
            <form action="/auth/signout" method="post">
              <button type="submit" className="px-5 py-2 bg-[#1a1a1a] hover:bg-[#27272a] border border-[#2e2e2e] rounded-lg text-sm">
                Cerrar sesión
              </button>
            </form>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <a href="/planta1" className="group block card p-8 hover:border-[#3ecf8e]/60 transition-all">
              <div className="text-6xl mb-6 group-hover:scale-105 transition">📊</div>
              <h2 className="text-3xl font-semibold mb-2">PLANTA 1</h2>
              <p className="text-[#a1a1aa]">Documentos y formatos de Planta 1</p>
              <div className="mt-6 text-xs accent-green">ABRIR →</div>
            </a>

            <a href="/planta2" className="group block card p-8 hover:border-[#3ecf8e]/60 transition-all">
              <div className="text-6xl mb-6 group-hover:scale-105 transition">📋</div>
              <h2 className="text-3xl font-semibold mb-2">PLANTA 2</h2>
              <p className="text-[#a1a1aa]">Documentos y formatos de Planta 2</p>
              <div className="mt-6 text-xs accent-green">ABRIR →</div>
            </a>
          </div>

          <div className="mt-8 text-xs text-[#666]">Sistema de Gestión de Documentos • UI inspirada en Supabase</div>
        </div>
      </div>
    </>
  )
}