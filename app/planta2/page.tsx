import Link from 'next/link'
import { requireApprovedUser } from '@/app/lib/supabase-server'
import { PresenceTracker } from '@/app/components/PresenceTracker'

export default async function Planta2Page() {
  await requireApprovedUser()
  return (
    <>
      <PresenceTracker />
      <div className="min-h-screen bg-[#0a0a0a] text-[#f1f1f1] p-6">
        <div className="max-w-6xl mx-auto">
          <div className="flex items-center gap-3 mb-8 text-sm">
            <Link href="/dashboard" className="text-[#a1a1aa] hover:text-[#f1f1f1]">← Volver</Link>
            <span className="text-[#2e2e2e]">/</span>
            <h1 className="text-3xl font-semibold text-white">PLANTA 2</h1>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <Link href="/planta2/hojas-calculo" className="group block card p-8 hover:border-[#3ecf8e]/60 transition-all">
              <div className="text-6xl mb-6">📊</div>
              <h2 className="text-3xl font-semibold mb-2">Hojas de Cálculo</h2>
              <p className="text-[#a1a1aa]">Formatos y documentos de cálculo</p>
              <div className="mt-6 text-xs accent-green">ABRIR →</div>
            </Link>

            <Link href="/planta2/formatos" className="group block card p-8 hover:border-[#3ecf8e]/60 transition-all">
              <div className="text-6xl mb-6">📄</div>
              <h2 className="text-3xl font-semibold mb-2">Formatos</h2>
              <p className="text-[#a1a1aa]">Documentos y formatos oficiales</p>
              <div className="mt-6 text-xs accent-green">ABRIR →</div>
            </Link>
          </div>
        </div>
      </div>
    </>
  )
}