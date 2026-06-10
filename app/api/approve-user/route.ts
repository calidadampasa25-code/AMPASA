import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const userId = searchParams.get('id');
  const userEmail = searchParams.get('email'); // optional for logging

  if (!userId) {
    return NextResponse.json({ error: 'Missing user id' }, { status: 400 });
  }

  const cookieStore = await cookies();
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() { return cookieStore.getAll(); },
        setAll(cookiesToSet) { cookiesToSet.forEach(({ name, value, options }) => cookieStore.set(name, value, options)); },
      },
    }
  );

  // Approve the user (for dev/testing; in prod you might want auth check here)
  const { error } = await supabase
    .from('profiles')
    .update({ approved: true })
    .eq('id', userId);

  if (error) {
    console.error('Approve error:', error);
    return NextResponse.json({ error: 'Failed to approve' }, { status: 500 });
  }

  // Redirect to the users list with success message
  const APP_URL = process.env.APP_URL || 'http://localhost:3000';
  return NextResponse.redirect(`${APP_URL}/admin/users?approved=${userId}`);
}
