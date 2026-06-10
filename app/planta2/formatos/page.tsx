import Link from 'next/link'
import { requireApprovedUser } from '@/app/lib/supabase-server'

export default async function FormatosPlanta2() {
  await requireApprovedUser()
  return (
    <div className="min-h-screen bg-[#0a0a0a] text-[#f1f1f1] p-6">
      <div className="max-w-4xl mx-auto">
        <Link href="/planta2" className="text-[#a1a1aa] hover:text-[#f1f1f1] text-sm">← Volver a Planta 2</Link>
        <h1 className="text-3xl font-semibold mt-4 mb-8">Formatos - Planta 2</h1>
        
        <div className="card p-8">
          <p className="text-[#a1a1aa] mb-6">Aquí puedes subir y ver los formatos oficiales de Planta 2.</p>
          
          <div className="border-2 border-dashed border-[#2e2e2e] rounded-xl p-10 text-center">
            <div className="text-5xl mb-3">📤</div>
            <p className="text-lg">Arrastra archivos aquí o haz clic para subir</p>
            <p className="text-sm text-[#666] mt-1">PDF, Excel, Word (máx 10MB)</p>
          </div>
        </div>
      </div>
    </div>
  )
}