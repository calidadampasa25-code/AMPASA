import Link from 'next/link'

export default function HomePage() {
  return (
    <div className="min-h-screen bg-[#0a0a0a] text-[#f1f1f1] flex items-center justify-center">
      <div className="text-center px-6">
        <div className="inline-flex items-center justify-center w-20 h-20 bg-[#3ecf8e]/10 rounded-full mb-8 border border-[#3ecf8e]/20">
          <span className="text-5xl">🏭</span>
        </div>
        
        <h1 className="text-6xl font-semibold tracking-tight mb-3">AMPASA CALIDAD</h1>
        <p className="text-xl text-[#a1a1aa] mb-10 max-w-md mx-auto">
          Sistema de Gestión de Documentos
        </p>
        
        <Link 
          href="/login" 
          className="inline-flex items-center px-10 py-4 bg-[#3ecf8e] hover:brightness-105 text-black text-lg font-semibold rounded-xl transition-all"
        >
          Iniciar Sesión
        </Link>
        
        <p className="mt-8 text-sm text-[#666]">
          Acceso exclusivo para usuarios autorizados
        </p>
      </div>
    </div>
  )
}