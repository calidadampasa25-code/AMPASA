import { requireApprovedUser } from '@/app/lib/supabase-server'
import Link from 'next/link'
import { PresenceTracker } from '@/app/components/PresenceTracker'

export default async function ProfilePage() {
  const { user, profile } = await requireApprovedUser()

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return 'N/A'
    return new Date(dateStr).toLocaleString('es-MX', {
      year: 'numeric', month: 'long', day: 'numeric',
      hour: '2-digit', minute: '2-digit'
    })
  }

  const getLastActivityText = (dateStr: string | null) => {
    if (!dateStr) return 'N/A'
    const date = new Date(dateStr)
    const now = new Date()
    const diffMinutes = Math.floor((now.getTime() - date.getTime()) / (1000 * 60))

    if (diffMinutes < 2) return 'En línea ahora'
    if (diffMinutes < 60) return `Hace ${diffMinutes} minutos`
    const diffHours = Math.floor(diffMinutes / 60)
    if (diffHours < 24) return `Hace ${diffHours} horas`
    return formatDate(dateStr)
  }

  return (
    <>
      <PresenceTracker />
      <div className="min-h-screen bg-[#0a0a0a] text-[#f1f1f1] p-6">
        <div className="max-w-3xl mx-auto">
          <div className="flex items-center gap-3 mb-6 text-sm">
            <Link href="/dashboard" className="text-[#a1a1aa] hover:text-[#f1f1f1]">← Volver</Link>
            <span className="text-[#2e2e2e]">/</span>
            <h1 className="text-3xl font-semibold text-white">Mi Perfil</h1>
          </div>

          <div className="card p-8">
            <div className="flex items-center gap-6 mb-8">
              <div className="w-20 h-20 bg-[#3ecf8e]/10 rounded-full flex items-center justify-center text-4xl border border-[#3ecf8e]/20">
                👤
              </div>
              <div>
                <h2 className="text-3xl font-semibold">{profile?.full_name || 'Sin nombre'}</h2>
                <p className="text-[#a1a1aa]">{profile?.email}</p>
                <div className="mt-2 flex gap-2">
                  <span className={`px-3 py-0.5 rounded-full text-xs font-medium ${profile?.role === 'admin' ? 'bg-[#3ecf8e] text-black' : 'bg-[#1f1f1f] text-[#a1a1aa] border border-[#2e2e2e]'}`}>
                    {profile?.role}
                  </span>
                  <span className={`px-3 py-0.5 rounded-full text-xs font-medium ${profile?.approved ? 'bg-[#3ecf8e] text-black' : 'bg-[#1f1f1f] text-[#a1a1aa] border border-[#2e2e2e]'}`}>
                    {profile?.approved ? 'Aprobado' : 'Pendiente'}
                  </span>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-sm">
              <div>
                <div className="text-[#a1a1aa] mb-1 text-xs uppercase tracking-widest">ID de usuario</div>
                <div className="font-mono break-all text-[#f1f1f1]">{user.id}</div>
              </div>
              <div>
                <div className="text-[#a1a1aa] mb-1 text-xs uppercase tracking-widest">Registrado</div>
                <div>{formatDate(profile?.created_at || null)}</div>
              </div>
              <div>
                <div className="text-[#a1a1aa] mb-1 text-xs uppercase tracking-widest">Última actividad</div>
                <div>{getLastActivityText(profile?.last_seen_at || null)}</div>
              </div>
              <div>
                <div className="text-[#a1a1aa] mb-1 text-xs uppercase tracking-widest">Estado</div>
                <div>{profile?.approved ? 'Acceso activo' : 'Pendiente de aprobación'}</div>
              </div>
            </div>

            <div className="mt-8 pt-6 border-t border-[#2e2e2e] text-sm text-[#a1a1aa]">
              Este es tu perfil en el sistema AMPASA CALIDAD. Tu actividad se actualiza automáticamente.
              Si necesitas actualizar tu nombre o información, contacta a un administrador.
            </div>
          </div>
        </div>
      </div>
    </>
  )
}
