import { NextRequest, NextResponse } from 'next/server';
import { GoogleAuth } from 'google-auth-library';
import { createSupabaseServerClient } from '@/app/lib/supabase-server';
import path from 'path';

const KEY_FILE_PATH = path.resolve(process.cwd(), 'service-account-key.json');

export async function DELETE(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const fileId = searchParams.get('fileId');
  const restore = searchParams.get('restore') === 'true';

  if (!fileId) {
    return NextResponse.json({ error: 'fileId es requerido' }, { status: 400 });
  }

  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const auth = new GoogleAuth({
      keyFile: KEY_FILE_PATH,
      scopes: ['https://www.googleapis.com/auth/drive'],
    });

    const client = await auth.getClient();
    const accessToken = (await client.getAccessToken()).token;

    if (!accessToken) {
      throw new Error('No token');
    }

    if (restore) {
      // Untrash
      const res = await fetch(`https://www.googleapis.com/drive/v3/files/${fileId}`, {
        method: 'PATCH',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ trashed: false }),
      });
      if (!res.ok) {
        const err = await res.text();
        throw new Error(`Restore error: ${res.status} ${err}`);
      }
    } else {
      // Trash (not permanent delete)
      const res = await fetch(`https://www.googleapis.com/drive/v3/files/${fileId}`, {
        method: 'PATCH',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ trashed: true }),
      });
      if (!res.ok) {
        const err = await res.text();
        throw new Error(`Trash error: ${res.status} ${err}`);
      }
    }

    return NextResponse.json({ success: true });
  } catch (err: any) {
    console.error('Drive delete/restore error:', err);
    return NextResponse.json({ error: err.message || 'Error al eliminar/restaurar' }, { status: 500 });
  }
}
