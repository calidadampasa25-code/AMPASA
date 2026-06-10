import { createSupabaseServerClient } from '@/app/lib/supabase-server'
import { redirect } from 'next/navigation'

export default async function AdminPage() {
  const supabase = await createSupabaseServerClient()

  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  if (profile?.role !== 'admin') {
    redirect('/dashboard')
  }

  // Obtener todos los usuarios pendientes de aprobación
  const { data: pendingUsers } = await supabase
    .from('profiles')
    .select('*')
    .eq('approved', false)
    .order('created_at', { ascending: false })

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-6xl mx-auto">
        <div className="flex justify-between items-center mb-10">
          <div>
            <h1 className="text-5xl font-bold text-gray-900">Panel de Administración</h1>
            <p className="text-xl text-gray-600 mt-2">Gestión de usuarios</p>
          </div>
          <div className="flex gap-3">
            <a href="/admin/users" className="px-6 py-3 bg-white border border-gray-200 rounded-2xl hover:bg-gray-50 transition-colors">
              Ver Usuarios
            </a>
            <a href="/dashboard" className="px-6 py-3 bg-white border border-gray-200 rounded-2xl hover:bg-gray-50 transition-colors">
              ← Volver al Dashboard
            </a>
          </div>
        </div>

        <div className="bg-white rounded-3xl shadow-lg p-8">
          <h2 className="text-3xl font-bold mb-6">Usuarios Pendientes de Aprobación</h2>
          
          {pendingUsers && pendingUsers.length > 0 ? (
            <div className="space-y-4">
              {pendingUsers.map((profile: any) => (
                <div key={profile.id} className="flex items-center justify-between p-6 border border-gray-100 rounded-2xl">
                  <div>
                    <p className="font-semibold text-lg">{profile.full_name || 'Sin nombre'}</p>
                    <p className="text-gray-600">{profile.email}</p>
                    <p className="text-sm text-gray-600 mt-1">
                      Registrado: {new Date(profile.created_at).toLocaleDateString('es-MX')}
                    </p>
                  </div>
                  <div className="flex gap-3">
                    <form action="/admin/approve" method="post">
                      <input type="hidden" name="userId" value={profile.id} />
                      <button 
                        type="submit"
                        className="px-6 py-2.5 bg-green-600 hover:bg-green-700 text-white rounded-xl font-medium transition-colors"
                      >
                        Aprobar
                      </button>
                    </form>
                    <form action="/admin/reject" method="post">
                      <input type="hidden" name="userId" value={profile.id} />
                      <button 
                        type="submit"
                        className="px-6 py-2.5 bg-red-600 hover:bg-red-700 text-white rounded-xl font-medium transition-colors"
                      >
                        Rechazar
                      </button>
                    </form>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-12">
              <div className="text-6xl mb-4">✅</div>
              <p className="text-xl text-gray-600">No hay usuarios pendientes de aprobación</p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}