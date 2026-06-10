import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'

export async function createSupabaseServerClient() {
  const cookieStore = await cookies()

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) =>
            cookieStore.set(name, value, options)
          )
        },
      },
    }
  )
}

export type UserProfile = {
  id: string
  email?: string | null
  full_name?: string | null
  role?: string | null
  approved?: boolean | null
  created_at?: string | null
  last_seen_at?: string | null
}

/**
 * Gets the current authenticated user + their profile.
 * Redirects to /login if not authenticated.
 */
export async function requireUser() {
  const supabase = await createSupabaseServerClient()

  const { data: { user }, error } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('id, email, full_name, role, approved, created_at, last_seen_at')
    .eq('id', user.id)
    .single()

  return { user, profile: profile as UserProfile | null, profileError }
}

/**
 * Requires an approved user (or admin).
 * Redirects to /pending if the user is not approved and not an admin.
 */
export async function requireApprovedUser() {
  const { user, profile } = await requireUser()

  const isAdmin = profile?.role === 'admin'
  const isApproved = profile?.approved === true

  if (!isAdmin && !isApproved) {
    redirect('/pending')
  }

  return { user, profile }
}
