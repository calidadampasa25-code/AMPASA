import { createSupabaseServerClient } from '@/app/lib/supabase-server'
import { redirect } from 'next/navigation'

function getOnlineStatus(lastSeenAt: string | null) {
  if (!lastSeenAt) return { status: 'offline', text: 'Nunca' }

  const lastSeen = new Date(lastSeenAt)
  const now = new Date()
  const diffMinutes = Math.floor((now.getTime() - lastSeen.getTime()) / (1000 * 60))

  if (diffMinutes < 3) {
    return { status: 'online', text: 'En línea ahora' }
  } else if (diffMinutes < 60) {
    return { status: 'recent', text: `Hace ${diffMinutes} min` }
  } else {
    const diffHours = Math.floor(diffMinutes / 60)
    return { status: 'offline', text: `Hace ${diffHours}h` }
  }
}

export default async function AdminUsersPage() {
  const supabase = await createSupabaseServerClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  // Check if admin
  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  if (profile?.role !== 'admin') {
    redirect('/dashboard')
  }

  const { data: users } = await supabase
    .from('profiles')
    .select('id, email, full_name, role, approved, created_at, last_seen_at')
    .order('created_at', { ascending: false })

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-6xl mx-auto">
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-4xl font-bold">Gestión de Usuarios</h1>
            <p className="text-gray-600 mt-1">Estado en tiempo real y actividad</p>
          </div>
          <a href="/admin" className="px-4 py-2 bg-white border rounded-xl hover:bg-gray-50">
            ← Volver al Panel
          </a>
        </div>

        <div className="bg-white rounded-3xl shadow-lg overflow-hidden">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="text-left p-6 font-medium text-gray-700">Usuario</th>
                <th className="text-left p-6 font-medium text-gray-700">Estado</th>
                <th className="text-left p-6 font-medium text-gray-700">Rol</th>
                <th className="text-left p-6 font-medium text-gray-700">Aprobado</th>
                <th className="text-left p-6 font-medium text-gray-700">Registrado</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {users?.map((u) => {
                const online = getOnlineStatus(u.last_seen_at)
                return (
                  <tr key={u.id} className="hover:bg-gray-50">
                    <td className="p-6">
                      <div>
                        <div className="font-medium">{u.full_name || 'Sin nombre'}</div>
                        <div className="text-sm text-gray-600">{u.email}</div>
                      </div>
                    </td>
                    <td className="p-6">
                      <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${
                        online.status === 'online' 
                          ? 'bg-green-100 text-green-700' 
                          : 'bg-gray-100 text-gray-600'
                      }`}>
                        {online.status === 'online' && '🟢 '}
                        {online.text}
                      </span>
                    </td>
                    <td className="p-6">
                      <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                        u.role === 'admin' 
                          ? 'bg-orange-100 text-orange-700' 
                          : 'bg-gray-100 text-gray-600'
                      }`}>
                        {u.role}
                      </span>
                    </td>
                    <td className="p-6">
                      {u.approved ? (
                        <span className="text-green-600 font-medium">Sí</span>
                      ) : (
                        <span className="text-yellow-600 font-medium">Pendiente</span>
                      )}
                    </td>
                    <td className="p-6 text-sm text-gray-500">
                      {new Date(u.created_at).toLocaleDateString('es-MX')}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>

        <p className="text-xs text-gray-500 mt-4 text-center">
          Un usuario se considera "en línea" si estuvo activo en los últimos 3 minutos.
        </p>
      </div>
    </div>
  )
}
