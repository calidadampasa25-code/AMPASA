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
      <div className="min-h-screen bg-gray-50 p-8">
        <div className="max-w-3xl mx-auto">
          <div className="flex items-center gap-4 mb-10">
            <Link href="/dashboard" className="text-gray-600 hover:text-gray-800">← Volver al Dashboard</Link>
            <h1 className="text-5xl font-bold text-gray-900">Mi Perfil</h1>
          </div>

          <div className="bg-white rounded-3xl shadow-lg p-10">
            <div className="flex items-center gap-6 mb-10">
              <div className="w-24 h-24 bg-orange-100 rounded-full flex items-center justify-center text-5xl">
                👤
              </div>
              <div>
                <h2 className="text-4xl font-bold">{profile?.full_name || 'Sin nombre'}</h2>
                <p className="text-xl text-gray-600">{profile?.email}</p>
                <div className="mt-2 flex gap-2">
                  <span className={`px-3 py-1 rounded-full text-sm font-medium ${profile?.role === 'admin' ? 'bg-orange-100 text-orange-700' : 'bg-gray-100 text-gray-600'}`}>
                    {profile?.role}
                  </span>
                  <span className={`px-3 py-1 rounded-full text-sm font-medium ${profile?.approved ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'}`}>
                    {profile?.approved ? 'Aprobado' : 'Pendiente'}
                  </span>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-sm">
              <div>
                <div className="text-gray-600 mb-1">ID de usuario</div>
                <div className="font-mono break-all">{user.id}</div>
              </div>
              <div>
                <div className="text-gray-600 mb-1">Registrado</div>
                <div>{formatDate(profile?.created_at || null)}</div>
              </div>
              <div>
                <div className="text-gray-600 mb-1">Última actividad</div>
                <div>{getLastActivityText(profile?.last_seen_at || null)}</div>
              </div>
              <div>
                <div className="text-gray-600 mb-1">Estado</div>
                <div>{profile?.approved ? 'Acceso activo' : 'Pendiente de aprobación'}</div>
              </div>
            </div>

            <div className="mt-10 pt-8 border-t text-sm text-gray-700">
              <p>Este es tu perfil en el sistema AMPASA CALIDAD. Tu actividad se actualiza automáticamente mientras usas las secciones de las plantas.</p>
              <p className="mt-2">Si necesitas actualizar tu nombre o información, contacta a un administrador.</p>
            </div>
          </div>
        </div>
      </div>
    </>
  )
}
