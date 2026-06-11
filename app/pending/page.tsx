import { requireUser } from '@/app/lib/supabase-server'
import { redirect } from 'next/navigation'

export default async function PendingPage() {
  const { user, profile, profileError } = await requireUser()

  // Si ya está aprobado o es admin, redirigir al dashboard
  if (profile?.approved || profile?.role === 'admin') {
    redirect('/dashboard')
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#0a0a0a] text-[#f1f1f1]">
      <div className="max-w-md w-full text-center p-8">
        <div className="mx-auto w-24 h-24 bg-yellow-100 rounded-full flex items-center justify-center mb-8">
          <span className="text-6xl">⏳</span>
        </div>
        
        <h1 className="text-4xl font-bold text-gray-900 mb-4">Solicitud en Revisión</h1>
        
        <div className="bg-white rounded-2xl p-8 shadow-lg mb-8">
          <p className="text-xl text-gray-600 mb-6">
            Tu solicitud de acceso ha sido enviada correctamente.
          </p>
          <p className="text-gray-600">
            Un administrador revisará tu solicitud en las próximas <strong>24-48 horas</strong>.
          </p>
        </div>

        <div className="text-sm text-gray-500">
          Recibirás un correo electrónico cuando tu cuenta sea aprobada.
        </div>

        {/* DEBUG temporal para diagnosticar por qué admin va a pendiente.
            Copia el "auth user id" y compáralo con:
            - Supabase Dashboard → Authentication → Users → busca tu gmail → copia el "id" (UUID)
            - Table Editor → profiles → asegúrate que exista fila con ESE MISMO id, role='admin', approved=true (check)
            Si los ids no coinciden o valores no están, corrígelo en Table Editor y vuelve a probar en incógnito nuevo.
            Una vez que funcione el admin, quitamos este debug.
         */}
        <div className="mt-6 p-4 bg-gray-900 text-green-300 rounded-xl text-left text-xs font-mono overflow-auto border border-gray-700">
          <div className="text-gray-300 mb-1 font-sans text-[10px] uppercase tracking-widest">DEBUG - Perfil actual (compara IDs en Supabase)</div>
          auth user id: {user?.id || 'NO USER'}<br />
          auth email: {user?.email || 'N/A'}<br />
          profile id: {profile?.id || 'NO PROFILE ROW (trigger no creó o id mismatch)'}<br />
          profile role: "{profile?.role || 'null'}"<br />
          profile approved: {String(!!profile?.approved)}<br />
          → isAdmin: {String(profile?.role === 'admin')} | isApproved: {String(!!profile?.approved)}<br />
          profileError: {profileError ? profileError.message + ' (code: ' + (profileError.code || 'n/a') + ')' : 'none (RLS self_read OK o fila no existe)'}
        </div>

        <form action="/auth/signout" method="post" className="mt-8">
          <button 
            type="submit"
            className="text-gray-500 hover:text-gray-700 underline"
          >
            Cerrar Sesión
          </button>
        </form>

      </div>
    </div>
  )
}