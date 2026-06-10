import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'

export async function POST(request: Request) {
  const formData = await request.formData()
  const userId = formData.get('userId') as string

  const cookieStore = await cookies()
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() { return cookieStore.getAll() },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) =>
            cookieStore.set(name, value, options)
          )
        },
      },
    }
  )

  // Rechazar usuario: eliminamos el perfil para que pueda solicitar acceso de nuevo en el futuro.
  // Nota: El usuario de autenticación (auth.users) permanece. Para borrado completo se requiere Service Role key.
  await supabase
    .from('profiles')
    .delete()
    .eq('id', userId)

  return NextResponse.redirect(new URL('/admin', request.url))
}